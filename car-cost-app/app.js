// ---------- Utilidades ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// IPVA SP por final da placa (mês de vencimento aproximado — cota única)
const IPVA_SP_POR_FINAL = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:5, 7:6, 8:6, 9:7, 0:7 };
// Licenciamento SP
const LIC_SP_POR_FINAL  = { 1:4, 2:5, 3:6, 4:7, 5:8, 6:9, 7:10, 8:11, 9:11, 0:11 };

const brl = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

const STORAGE_KEY = 'simulador-veiculo-v1';

// ---------- Persistência ----------
function salvarDados(dados) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dados)); } catch {}
}
function carregarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function limparDados() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function preencherForm(dados) {
  if (!dados) return;
  const form = $('#cost-form');
  for (const [key, value] of Object.entries(dados)) {
    const el = form.elements.namedItem(key);
    if (!el) continue;
    if (el instanceof RadioNodeList) {
      const radio = Array.from(el).find(r => r.value === String(value));
      if (radio) radio.checked = true;
    } else {
      el.value = value;
    }
  }
  atualizarVisibilidadeIpva();
}

function coletarForm() {
  const form = $('#cost-form');
  const data = new FormData(form);
  const obj = {};
  for (const [k, v] of data.entries()) obj[k] = v;
  return obj;
}

// ---------- Cálculo ----------
function normalizar(raw) {
  const num = k => Number(raw[k] || 0);

  const kmMedia = num('kmMedia');
  const freq = raw.frequenciaKm || 'dia';
  // Aproximações: 30 dias / 4.345 semanas por mês
  const kmMes =
    freq === 'dia'    ? kmMedia * 30 :
    freq === 'semana' ? kmMedia * 4.345 :
                        kmMedia;

  let ipva = num('ipvaValor');
  if (raw.modoIpva === 'calcular') {
    const valorVeic = num('veiculoValor');
    const aliquota = raw.tipo === 'carro' ? 0.04 : 0.02;
    ipva = valorVeic * aliquota;
  }

  const final = raw.finalPlaca === '' ? null : Number(raw.finalPlaca);

  return {
    nome: raw.nome || 'Veículo',
    tipo: raw.tipo || 'moto',
    finalPlaca: final,

    parcelaVeiculo: num('parcelaVeiculo'),
    parcelasVeiculoRestantes: num('parcelasVeiculoRestantes'),

    parcelaSeguro: num('parcelaSeguro'),
    parcelasSeguroRestantes: num('parcelasSeguroRestantes'),

    kmMes,
    precoGasolina: num('precoGasolina'),
    consumo: num('consumo'),

    kmAtual: num('kmAtual'),
    kmProxRevisao: num('kmProxRevisao'),
    mesRevisao: raw.mesRevisao ? Number(raw.mesRevisao) : null,
    custoRevisao: num('custoRevisao'),

    ipva,
    mesIpva: final != null ? IPVA_SP_POR_FINAL[final] : null,
    licenciamento: num('licenciamento'),
    mesLicenciamento: final != null ? LIC_SP_POR_FINAL[final] : null,
  };
}

// Retorna array com 12 posições [jan..dez]; cada uma com {total, itens:[{label,valor}]}
function projecaoAnual(d) {
  const combustivelMensal = d.consumo > 0
    ? (d.kmMes / d.consumo) * d.precoGasolina
    : 0;

  const meses = Array.from({length:12}, () => ({ total: 0, itens: [] }));

  const push = (mesIdx, label, valor) => {
    if (valor <= 0) return;
    meses[mesIdx].itens.push({ label, valor });
    meses[mesIdx].total += valor;
  };

  for (let i = 0; i < 12; i++) {
    // Combustível — todo mês
    push(i, 'Combustível', combustivelMensal);

    // Parcela do veículo — enquanto houver parcelas restantes
    if (i < d.parcelasVeiculoRestantes) {
      push(i, 'Parcela do veículo', d.parcelaVeiculo);
    }

    // Parcela do seguro — enquanto houver parcelas restantes
    if (i < d.parcelasSeguroRestantes) {
      push(i, 'Parcela do seguro', d.parcelaSeguro);
    }
  }

  // Eventos anuais únicos (mês específico)
  if (d.mesIpva && d.ipva > 0) {
    push(d.mesIpva - 1, 'IPVA', d.ipva);
  }
  if (d.mesLicenciamento && d.licenciamento > 0) {
    push(d.mesLicenciamento - 1, 'Licenciamento', d.licenciamento);
  }
  if (d.mesRevisao && d.custoRevisao > 0) {
    push(d.mesRevisao - 1, 'Revisão', d.custoRevisao);
  }

  return { meses, combustivelMensal };
}

function calcular(dRaw) {
  const d = normalizar(dRaw);
  const { meses, combustivelMensal } = projecaoAnual(d);

  const totalAnual = meses.reduce((s, m) => s + m.total, 0);
  const mediaMensal = totalAnual / 12;

  // Mês mais caro / mais barato
  let idxMax = 0, idxMin = 0;
  meses.forEach((m, i) => {
    if (m.total > meses[idxMax].total) idxMax = i;
    if (m.total < meses[idxMin].total) idxMin = i;
  });

  // Breakdown do custo médio mensal (soma dos itens no ano / 12)
  const acumulado = {};
  meses.forEach(m => m.itens.forEach(it => {
    acumulado[it.label] = (acumulado[it.label] || 0) + it.valor;
  }));
  const breakdown = Object.entries(acumulado)
    .map(([label, total]) => ({ label, medio: total / 12 }))
    .sort((a, b) => b.medio - a.medio);

  const custoPorKm = d.kmMes > 0 ? mediaMensal / d.kmMes : 0;

  return {
    d,
    meses,
    totalAnual,
    mediaMensal,
    idxMax,
    idxMin,
    breakdown,
    custoPorKm,
    combustivelMensal,
    insights: gerarInsights(d, meses, mediaMensal),
  };
}

// ---------- Insights ----------
function mesesAte(mesEventoZeroIdx, mesAtualZeroIdx) {
  let diff = mesEventoZeroIdx - mesAtualZeroIdx;
  if (diff < 0) diff += 12;
  return diff;
}
function rotuloPrazo(n) {
  if (n === 0) return 'este mês';
  if (n === 1) return 'no próximo mês';
  return `em ${n} meses`;
}

function gerarInsights(d, meses, mediaMensal) {
  const insights = [];
  const mesAtual = new Date().getMonth(); // 0-11

  // 1) Por que o mês mais caro é caro?
  let idxMax = 0;
  meses.forEach((m, i) => { if (m.total > meses[idxMax].total) idxMax = i; });
  const mesCaro = meses[idxMax];
  const eventosCaros = mesCaro.itens
    .filter(i => !['Combustível','Parcela do veículo','Parcela do seguro'].includes(i.label));
  if (eventosCaros.length) {
    const nomes = eventosCaros.map(e => `<strong>${e.label}</strong> (${brl(e.valor)})`).join(', ');
    const acima = mesCaro.total - mediaMensal;
    insights.push({
      tipo: 'warn',
      icon: '⚠️',
      titulo: `${MESES[idxMax]} é o mês mais pesado`,
      html: `Concentra ${nomes}, ficando <strong>${brl(acima)}</strong> acima da sua média mensal. Se possível, chegue neste mês com uma reserva pronta.`,
    });
  }

  // 2) Prepare-se para cada evento anual futuro (IPVA, Licenciamento, Revisão)
  const eventosAnuais = [];
  if (d.ipva > 0 && d.mesIpva)                eventosAnuais.push({ nome: 'IPVA',          valor: d.ipva,          mes0: d.mesIpva - 1 });
  if (d.licenciamento > 0 && d.mesLicenciamento) eventosAnuais.push({ nome: 'Licenciamento', valor: d.licenciamento, mes0: d.mesLicenciamento - 1 });
  if (d.custoRevisao > 0 && d.mesRevisao)     eventosAnuais.push({ nome: 'Revisão',       valor: d.custoRevisao,  mes0: d.mesRevisao - 1 });

  eventosAnuais
    .map(e => ({ ...e, prazo: mesesAte(e.mes0, mesAtual) }))
    .sort((a, b) => a.prazo - b.prazo)
    .forEach(e => {
      if (e.prazo === 0) {
        insights.push({
          tipo: 'warn',
          icon: '📌',
          titulo: `${e.nome} vence este mês`,
          html: `Separe <strong>${brl(e.valor)}</strong> agora. Se ainda não guardou, planeje o pagamento no orçamento deste mês.`,
        });
      } else {
        const porMes = e.valor / e.prazo;
        insights.push({
          tipo: 'tip',
          icon: '💡',
          titulo: `${e.nome} chega ${rotuloPrazo(e.prazo)} — ${MESES[e.mes0]}`,
          html: `Total de <strong>${brl(e.valor)}</strong>. Guardando <strong>${brl(porMes)}/mês</strong> a partir de agora, você chega em ${MESES[e.mes0]} com o valor todo separado.`,
        });
      }
    });

  // 3) Reserva mensal recomendada (soma dos eventos anuais / 12)
  const totalAnualEventos = eventosAnuais.reduce((s, e) => s + e.valor, 0);
  if (totalAnualEventos > 0) {
    const reservaMes = totalAnualEventos / 12;
    insights.push({
      tipo: 'info',
      icon: '🏦',
      titulo: 'Sua reserva mensal ideal',
      html: `Se preferir guardar um valor fixo todo mês para cobrir IPVA, licenciamento e revisão do ano inteiro, aparte <strong>${brl(reservaMes)}/mês</strong>. Assim nenhum mês pesa mais que os outros.`,
    });
  }

  // 4) Parcelas terminando — alívio no orçamento
  const alivios = [];
  if (d.parcelaSeguro > 0 && d.parcelasSeguroRestantes > 0 && d.parcelasSeguroRestantes <= 12) {
    alivios.push({ nome: 'seguro', valor: d.parcelaSeguro, prazo: d.parcelasSeguroRestantes });
  }
  if (d.parcelaVeiculo > 0 && d.parcelasVeiculoRestantes > 0 && d.parcelasVeiculoRestantes <= 12) {
    alivios.push({ nome: 'financiamento do veículo', valor: d.parcelaVeiculo, prazo: d.parcelasVeiculoRestantes });
  }
  alivios.forEach(a => {
    insights.push({
      tipo: 'good',
      icon: '🎉',
      titulo: `Parcela do ${a.nome} acaba em ${a.prazo} ${a.prazo === 1 ? 'mês' : 'meses'}`,
      html: `Depois disso seu custo mensal cai <strong>${brl(a.valor)}</strong>. Uma ideia: continue "pagando" esse valor para você mesmo em uma conta separada e forme uma reserva.`,
    });
  });

  // 5) Alerta se seguro/veículo for parcela muito alta em relação ao total
  const totalParcelasMensais = d.parcelaVeiculo * (d.parcelasVeiculoRestantes > 0 ? 1 : 0)
                              + d.parcelaSeguro  * (d.parcelasSeguroRestantes > 0 ? 1 : 0);
  if (totalParcelasMensais > 0 && mediaMensal > 0 && totalParcelasMensais / mediaMensal > 0.6) {
    insights.push({
      tipo: 'warn',
      icon: '📊',
      titulo: 'Financiamento pesa muito no orçamento',
      html: `Parcelas fixas somam <strong>${brl(totalParcelasMensais)}</strong>, mais de 60% do seu custo mensal. Se sobrar dinheiro, adiantar parcelas do financiamento costuma render mais do que qualquer investimento.`,
    });
  }

  // 6) Alerta sobre a revisão baseada em KM
  if (d.kmProxRevisao > d.kmAtual && d.kmMes > 0) {
    const kmFaltando = d.kmProxRevisao - d.kmAtual;
    const mesesParaRevisao = kmFaltando / d.kmMes;
    if (mesesParaRevisao < 12) {
      const mesesArredondado = Math.max(1, Math.round(mesesParaRevisao));
      insights.push({
        tipo: 'info',
        icon: '🔧',
        titulo: 'Revisão por quilometragem',
        html: `No seu ritmo atual (<strong>${Math.round(d.kmMes)} km/mês</strong>), você bate os ${d.kmProxRevisao.toLocaleString('pt-BR')} km em aproximadamente <strong>${mesesArredondado} ${mesesArredondado === 1 ? 'mês' : 'meses'}</strong>. Fique de olho para não passar do prazo, o que vier primeiro — km ou data — é o que vale.`,
      });
    }
  }

  return insights;
}

// ---------- Render ----------
function renderResultado(r) {
  $('#result-title').textContent = r.d.nome;
  $('#r-mensal').textContent = brl(r.mediaMensal);
  $('#r-anual').textContent  = brl(r.totalAnual);
  $('#r-por-km').textContent = brl(r.custoPorKm);

  // Mês mais caro
  const maxMes = r.meses[r.idxMax];
  const detalhesMax = maxMes.itens
    .filter(i => i.label !== 'Combustível' && i.label !== 'Parcela do veículo' && i.label !== 'Parcela do seguro')
    .map(i => `${i.label} (${brl(i.valor)})`)
    .join(', ') || 'Custo fixo mensal';
  $('#r-mais-caro').innerHTML = `
    <span class="month-name">${MESES[r.idxMax]}</span>
    <span class="month-value">${brl(maxMes.total)}</span>
    <span class="month-detail">Puxam o valor: ${detalhesMax}</span>
  `;
  $('#r-mais-caro').className = 'month-card expensive';

  // Mês mais barato
  const minMes = r.meses[r.idxMin];
  const ausentes = [];
  const labelsPresentes = new Set(minMes.itens.map(i => i.label));
  if (!labelsPresentes.has('Parcela do veículo') && r.d.parcelasVeiculoRestantes < 12) {
    ausentes.push('sem parcela do veículo');
  }
  if (!labelsPresentes.has('Parcela do seguro') && r.d.parcelasSeguroRestantes < 12) {
    ausentes.push('sem parcela do seguro');
  }
  const detalheMin = ausentes.length ? `Alívio: ${ausentes.join(' e ')}` : 'Sem eventos anuais neste mês';
  $('#r-mais-barato').innerHTML = `
    <span class="month-name">${MESES[r.idxMin]}</span>
    <span class="month-value">${brl(minMes.total)}</span>
    <span class="month-detail">${detalheMin}</span>
  `;
  $('#r-mais-barato').className = 'month-card cheap';

  // Timeline
  const timelineEl = $('#r-timeline');
  timelineEl.innerHTML = '';
  const maxVal = Math.max(...r.meses.map(m => m.total), 1);
  r.meses.forEach((m, i) => {
    const pct = (m.total / maxVal) * 100;
    let cls = '';
    if (i === r.idxMax) cls = 'peak';
    else if (i === r.idxMin && m.total < r.mediaMensal) cls = 'low';
    const row = document.createElement('div');
    row.className = `timeline-row ${cls}`;
    row.innerHTML = `
      <span class="m-name">${MESES[i].slice(0,3)}</span>
      <span class="m-bar"><span class="m-bar-fill" style="width:${pct}%"></span></span>
      <span class="m-value">${brl(m.total)}</span>
    `;
    timelineEl.appendChild(row);
  });

  // Breakdown
  const bdEl = $('#r-breakdown');
  bdEl.innerHTML = '';
  r.breakdown.forEach(b => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="b-label">${b.label}</span><span class="b-value">${brl(b.medio)}</span>`;
    bdEl.appendChild(li);
  });
  const liTotal = document.createElement('li');
  liTotal.innerHTML = `<span class="b-label">Total mensal médio</span><span class="b-value">${brl(r.mediaMensal)}</span>`;
  bdEl.appendChild(liTotal);

  // Insights
  const insEl = $('#r-insights');
  insEl.innerHTML = '';
  if (!r.insights.length) {
    insEl.innerHTML = `<div class="insight info"><span class="insight-icon">ℹ️</span><div><p class="insight-title">Sem insights disponíveis</p><p class="insight-body">Preencha mais campos (IPVA, licenciamento, revisão) para receber dicas personalizadas.</p></div></div>`;
    return;
  }
  r.insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = `insight ${ins.tipo}`;
    card.innerHTML = `
      <span class="insight-icon">${ins.icon}</span>
      <div>
        <p class="insight-title">${ins.titulo}</p>
        <p class="insight-body">${ins.html}</p>
      </div>
    `;
    insEl.appendChild(card);
  });
}

// ---------- Navegação ----------
function irPara(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#${id}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

// ---------- Visibilidade condicional ----------
function atualizarVisibilidadeIpva() {
  const modo = $('#cost-form').modoIpva.value;
  $('#campo-ipva-valor').classList.toggle('hidden', modo !== 'valor');
  $('#campo-veiculo-valor').classList.toggle('hidden', modo !== 'calcular');
}

// ---------- Init ----------
function init() {
  const salvos = carregarDados();
  if (salvos) preencherForm(salvos);
  atualizarVisibilidadeIpva();

  $$('input[name="modoIpva"]').forEach(r => r.addEventListener('change', atualizarVisibilidadeIpva));

  $('#cost-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = coletarForm();
    salvarDados(raw);
    const resultado = calcular(raw);
    renderResultado(resultado);
    irPara('result-screen');
  });

  $('#btn-voltar').addEventListener('click', () => irPara('form-screen'));
  $('#btn-editar').addEventListener('click', () => irPara('form-screen'));

  $('#btn-limpar').addEventListener('click', () => {
    if (!confirm('Apagar todos os dados salvos?')) return;
    limparDados();
    $('#cost-form').reset();
    atualizarVisibilidadeIpva();
  });
}

document.addEventListener('DOMContentLoaded', init);
