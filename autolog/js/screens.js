/* ==========================================================================
   screens.js — as sete telas do canvas Garagem.dc.html, agora com dados
   reais. Cada função devolve { kicker, titulo, acao, corpo }.
   ========================================================================== */
'use strict';

const Screens = {};

/* ── 01 · Início · Garagem ─────────────────────────────────────────────── */

Screens.inicio = (v) => {
  const p = Calc.panorama(v);
  const cpk = p.custoKm;

  const seletor = h('div', { class: 'segrow' },
    Store.veiculos().map((x) => h('button', {
      class: x.id === v.id ? 'on' : '',
      onClick: () => { Store.selecionar(x.id); App.render(); },
    }, x.apelido || x.modelo)),
    h('button', { onClick: () => Acoes.novoVeiculo() }, '+ Novo'));

  const vencimentos = Calc.proximosVencimentos(v, 4);

  const corpo = h('div', null,
    seletor,
    UI.foto(v, { onTrocar: () => Acoes.trocarFoto(v) }),

    h('div', { class: 'headline-lockup' },
      UI.mono(v.marca, { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }),
      h('h3', null, v.modelo),
      UI.mono(`${v.ano}  ·  ${v.placa || 'sem placa'}  ·  ${v.combustivel || labelTipo(v.tipo)}`, { marginTop: 6, letterSpacing: '.06em' })),

    UI.row(
      UI.kv({
        k: 'Odômetro', v: num(p.odometro), sub: `+ ${num(p.kmMes)} km este mês`,
        onClick: () => Acoes.atualizarOdometro(v),
      }),
      UI.kv({
        k: 'Custo/km', v: cpk.valor ? brl(cpk.valor) : '—', sub: 'média 30 dias',
        onClick: () => App.ir('custos', { custos: 'km' }),
      })),
    UI.row(
      UI.kv({ k: 'Gasto do mês', v: brl0(p.gastoMes), sub: 'todos os lançamentos' }),
      UI.kv({
        k: 'Saúde geral', v: p.diag.rotulo, cor: p.diag.cor,
        sub: resumoDiag(p.diag),
        onClick: () => App.ir('manutencao'),
      })),

    blocoCustoMensal(v),

    UI.sectHd('Próximos vencimentos', 'ver todos ›', () => App.ir('docs')),
    vencimentos.length ? vencimentos.map((it) => h('button', {
      class: 'list-item',
      onClick: () => (it.tipo === 'doc' ? App.ir('docs') : App.ir('manutencao')),
    },
      h('div', { style: { width: 52, textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface)', borderRadius: 12 } },
        h('div', { style: { fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 22, lineHeight: 1 } },
          it.venc ? String(fromISO(it.venc).getDate()).padStart(2, '0') : '!'),
        UI.mono(it.venc ? mesCurto(it.venc) : 'KM', { fontSize: 10, letterSpacing: '.1em', marginTop: 2 })),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, it.titulo),
        UI.mono(it.valor, { marginTop: 2, color: 'var(--muted)' })),
      UI.dot(it.cor),
    )) : UI.vazio('Nada vencendo por aqui. Bom sinal.'),

    UI.cta([
      { label: 'Novo lançamento', icone: '+', onClick: () => Acoes.registrarLancamento(v) },
    ]),
    h('div', { style: { height: 76 } })); // respiro para o botão flutuante

  return {
    kicker: `Sua garagem · ${Store.veiculos().length} ${Store.veiculos().length === 1 ? 'veículo' : 'veículos'}`,
    titulo: Store.get().perfil.nome ? `Olá, ${Store.get().perfil.nome}` : 'Sua garagem',
    corpo,
  };
};

/* Quanto sai do bolso por mês: parcela + documentos diluídos + combustível.
   Só aparece o que a pessoa informou — nada de valor estimado por conta. */
function blocoCustoMensal(v) {
  const c = Calc.custoMensal(v);
  const fin = Calc.financiamentoStatus(v);
  const nada = c.total <= 0;

  const linha = (rotulo, valor, detalhe) => h('div', {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 8 },
  },
    h('div', null,
      UI.mono(rotulo, { fontSize: 11, letterSpacing: '.08em', opacity: .75 }),
      detalhe ? UI.mono(detalhe, { fontSize: 10, opacity: .5, marginTop: 2 }) : null),
    UI.mono(valor, { fontSize: 13, fontWeight: 600 }));

  if (nada) {
    return h('div', null,
      UI.sectHd('Custo mensal'),
      h('div', { class: 'note', style: { paddingTop: 0 } },
        'Informe a parcela do financiamento, o IPVA e o seguro na ficha do veículo para o app somar o custo fixo de cada mês.'),
      h('div', { style: { padding: '0 16px 16px' } },
        h('button', {
          class: 'btn btn-secondary',
          style: { borderRadius: 100, padding: '10px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' },
          onClick: () => Acoes.editarVeiculo(v),
        }, 'Completar ficha')));
  }

  return h('div', { class: 'price-strip', style: { flexDirection: 'column', alignItems: 'stretch', gap: 4 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
      h('div', null,
        h('div', { class: 'pk' }, 'Custo por mês'),
        h('div', { class: 'pv', style: { fontSize: 30 } }, brl(c.total))),
      h('div', { style: { textAlign: 'right' } },
        h('div', { class: 'pk' }, 'fixo'),
        UI.mono(brl0(c.fixo), { fontSize: 14, marginTop: 4, fontWeight: 600 }))),
    h('div', { style: { height: 1, background: 'rgba(255,255,255,.18)', margin: '10px 0 2px' } }),
    fin.quitado ? null : linha('Parcela', brl(c.parcela), `${fin.restantes} restantes · dia ${fin.dia}`),
    c.itensDocs.map((i) => linha(i.label, brl(i.valor), i.detalhe)),
    linha('Combustível', brl(c.combustivel), c.combustivelReal ? 'média dos 3 meses fechados' : 'sem histórico ainda'));
}

const resumoDiag = (d) => {
  const partes = [];
  if (d.contagem.bad) partes.push(`${d.contagem.bad} urgente${d.contagem.bad > 1 ? 's' : ''}`);
  if (d.contagem.warn) partes.push(`${d.contagem.warn} em atenção`);
  return partes.length ? partes.join(' · ') : 'tudo em dia';
};

/* ── 02 · Detalhe do veículo (Resumo · Ficha · Histórico) ──────────────── */

Screens.garagem = (v) => {
  const aba = App.sub.garagem || 'resumo';
  const abas = UI.seg([
    { id: 'resumo', label: 'Resumo' },
    { id: 'ficha', label: 'Ficha' },
    { id: 'historico', label: 'Histórico' },
  ], aba, (id) => App.ir('garagem', { garagem: id }));

  const corpo = h('div', null, abas,
    aba === 'resumo' ? abaResumo(v) : aba === 'ficha' ? abaFicha(v) : abaHistorico(v));

  return { kicker: 'Veículo selecionado', titulo: v.apelido || v.modelo, corpo };
};

function abaResumo(v) {
  const total = v.lancamentos.reduce((s, l) => s + l.valor, 0);
  const primeiro = Calc.ordenados(v)[0];
  const consumo = Calc.consumoMedio(v);
  const meses = Calc.resumoMensal(v, 6);
  const mesAtual = chaveMes(today());

  return h('div', null,
    UI.foto(v, { grande: false, onTrocar: () => Acoes.trocarFoto(v) }),

    h('div', { style: { padding: '20px 16px', borderBottom: '1px solid var(--color-divider)' } },
      UI.mono(`Custo acumulado · desde ${primeiro ? fmtMesAno(primeiro.data) : fmtMesAno(v.compra)}`,
        { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }),
      h('div', { class: 'bignum' }, brl0(total), h('small', null, `/ ${num(v.odometro)} km`))),

    UI.row(
      UI.kv({ k: 'Consumo médio', v: `${num(consumo.valor, 1)} km/L`, sub: consumo.real ? 'medido nos abastecimentos' : 'estimado · sem histórico' }),
      UI.kv({ k: 'Preço médio', v: brl(Calc.precoMedioLitro(v)), sub: 'por litro' })),
    UI.row(
      UI.kv({ k: 'Lançamentos', v: String(v.lancamentos.length), sub: 'registrados' }),
      UI.kv({ k: 'Custo por mês', v: brl0(Calc.custoMensal(v).total), sub: 'fixo + combustível' })),

    UI.sectHd('Gasto por mês', 'R$'),
    UI.barras(meses.map((m) => ({ label: m.label, valor: m.gasto, on: chaveMes(m.iso) === mesAtual })),
      (d) => `${d.label}: ${brl(d.valor)}`),

    UI.cta([
      { label: 'Registrar abastecimento', pri: true, onClick: () => Acoes.registrarAbastecimento(v) },
    ]));
}

function abaFicha(v) {
  const linha = (a, b) => UI.row(UI.kv(a), UI.kv(b));
  const consumo = Calc.consumoMedio(v);
  return h('div', null,
    linha({ k: 'Tipo', v: labelTipo(v.tipo) }, { k: 'Marca', v: v.marca || '—' }),
    linha({ k: 'Ano', v: String(v.ano) }, { k: 'Cor', v: v.cor || '—' }),
    linha({ k: 'Combustível', v: v.combustivel || '—' },
      { k: 'Consumo ref.', v: `${num(v.consumo, 0)} km/L`, sub: consumo.real ? `real ${num(consumo.valor, 1)}` : 'sem medição' }),
    linha({ k: 'Placa', v: v.placa || '—' }, { k: 'Renavam', v: v.renavam || '—' }),
    linha({ k: 'Chassi', v: v.chassi || '—' }, { k: 'Compra', v: fmtMesAno(v.compra) }),
    (() => {
      const f = Calc.financiamentoStatus(v);
      return f.quitado
        ? UI.row(UI.kv({ k: 'Financiamento', v: 'Quitado', sub: 'sem parcela mensal' }))
        : UI.row(
            UI.kv({ k: 'Parcela', v: brl(f.parcela), sub: `dia ${f.dia}` }),
            UI.kv({ k: 'Restam', v: String(f.restantes), sub: `saldo ${brl0(f.saldo)}` }));
    })(),
    UI.row(UI.kv({ k: 'Odômetro', v: kmFmt(v.odometro), onClick: () => Acoes.atualizarOdometro(v) })),
    h('div', { class: 'note' }, 'Os dados da ficha alimentam o diagnóstico de manutenção e a simulação de financiamento.'),
    UI.cta([
      { label: 'Editar ficha', icone: '✎', onClick: () => Acoes.editarVeiculo(v) },
      { label: 'Trocar foto', icone: '◫', pri: true, onClick: () => Acoes.trocarFoto(v) },
    ]));
}

/* ── 07 · Histórico mensal ─────────────────────────────────────────────── */

function abaHistorico(v) {
  const janela = App.sub.historico || 6;
  const meses = Calc.resumoMensal(v, janela);
  const kmTotal = meses.reduce((s, m) => s + m.km, 0);
  const gastoTotal = meses.reduce((s, m) => s + m.gasto, 0);
  const maxKm = Math.max(1, ...meses.map((m) => m.km));
  const maxGasto = Math.max(1, ...meses.map((m) => m.gasto));
  const lancs = Calc.ordenados(v).slice(-12).reverse();

  return h('div', null,
    UI.seg([{ id: 6, label: '6 meses' }, { id: 12, label: '12 meses' }, { id: 24, label: '24 meses' }],
      janela, (id) => App.ir('garagem', { garagem: 'historico', historico: id })),

    UI.row(
      UI.kv({ k: `Rodado (${janela}m)`, v: kmFmt(kmTotal), sub: `média ${num(Math.round(kmTotal / janela))} km/mês` }),
      UI.kv({ k: `Gasto (${janela}m)`, v: brl0(gastoTotal), sub: `média ${brl0(gastoTotal / janela)}/mês` })),

    h('div', { style: { padding: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: janela > 12 ? 3 : 10, height: 140 } },
        meses.map((m) => h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }, title: `${m.label}: ${num(m.km)} km · ${brl(m.gasto)}` },
          h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' } },
            h('div', { style: { width: janela > 12 ? 5 : 12, height: Math.max(2, (m.km / maxKm) * 100) + '%', background: 'var(--color-text)', borderRadius: '6px 6px 2px 2px' } }),
            h('div', { style: { width: janela > 12 ? 5 : 12, height: Math.max(2, (m.gasto / maxGasto) * 100) + '%', background: 'var(--color-accent)', borderRadius: '6px 6px 2px 2px' } }))))),
      h('div', { style: { display: 'flex', gap: janela > 12 ? 3 : 10, marginTop: 8 } },
        meses.map((m, i) => UI.mono(janela > 12 && i % 2 ? '' : m.label, { flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.1em' }))),
      h('div', { style: { display: 'flex', gap: 18, marginTop: 12, fontSize: 11, fontFamily: 'var(--mono)' } },
        legenda('var(--color-text)', 'km rodado'),
        legenda('var(--color-accent)', 'R$ gasto'))),

    UI.sectHd('Últimos lançamentos', '+ novo', () => Acoes.registrarLancamento(v)),
    lancs.length ? lancs.map((l) => h('button', { class: 'list-item', onClick: () => Acoes.verLancamento(v, l) },
      UI.mono(fmtDia(l.data), { width: 44, letterSpacing: '.06em', color: 'var(--muted)' }),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, l.titulo),
        UI.mono(`${labelCategoria(l.tipo)}${l.local ? ' · ' + l.local : ''}${l.litros ? ' · ' + num(l.litros, 1) + ' L' : ''}`,
          { marginTop: 2, color: 'var(--muted)' })),
      UI.mono('- ' + brl(l.valor), { fontSize: 12, fontWeight: 600 })))
      : UI.vazio('Nenhum lançamento ainda.'));
}

const legenda = (cor, txt) => h('span', null,
  h('span', { style: { display: 'inline-block', width: 8, height: 8, background: cor, borderRadius: 2, marginRight: 6, verticalAlign: 'middle' } }), txt);

/* ── 03 · Manutenção inteligente ───────────────────────────────────────── */

Screens.manutencao = (v) => {
  const d = Calc.diagnostico(v);

  const parametro = (k, valor, onClick) => h('div', null,
    UI.mono(k, { fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4, color: 'var(--muted)' }),
    onClick
      ? h('button', { class: 'pillbox', style: { width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', fontWeight: 600 }, onClick }, valor)
      : h('div', { class: 'pillbox' }, valor));

  const corpo = h('div', null,
    h('div', { style: { padding: 16, borderBottom: '1px solid var(--color-divider)', background: 'var(--color-surface)' } },
      UI.mono('Parâmetros do diagnóstico', { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12, color: 'var(--muted)' }),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        parametro('Tipo', labelTipo(v.tipo)),
        parametro('Ano', String(v.ano)),
        h('div', { style: { gridColumn: '1 / -1' } },
          parametro('Quilometragem atual', kmFmt(v.odometro), () => Acoes.atualizarOdometro(v))))),

    h('div', { class: 'price-strip' },
      h('div', null,
        h('div', { class: 'pk' }, 'Saúde geral'),
        h('div', { class: 'pv', style: { color: d.cor } }, `${d.score} / 100`)),
      h('div', { style: { textAlign: 'right' } },
        h('div', { class: 'pk' }, 'Itens'),
        h('div', { class: 'mono', style: { fontSize: 12, marginTop: 6, lineHeight: 1.6 } },
          h('span', { style: { color: COR.ok } }, `● ${d.contagem.ok} OK`), '  ',
          h('span', { style: { color: COR.warn } }, `● ${d.contagem.warn} ATENÇÃO`), '  ',
          h('span', { style: { color: COR.bad } }, `● ${d.contagem.bad} URGENTE`)))),

    d.itens.map((it) => h('button', { class: 'maint-row', onClick: () => Acoes.registrarServico(v, it) },
      UI.dot(it.cor),
      h('div', null,
        h('div', { class: 'mt' }, it.nome),
        h('div', { class: 'ms' }, it.sub || 'sem histórico')),
      h('div', { class: 'mv', style: { color: it.cor } }, it.rotulo))),

    h('div', { class: 'note' },
      'Cada item cruza o intervalo recomendado com o odômetro atual e a data do último serviço. Toque em um item para registrar a troca — o contador zera na hora.'),

    UI.cta([
      { label: 'Refazer diagnóstico', icone: '↻', onClick: () => { App.render(); UI.toast(`Diagnóstico atualizado · ${d.score}/100`); } },
      { label: 'Agendar oficina', pri: true, onClick: () => Acoes.agendarOficina(v) },
    ]));

  return { kicker: 'Verde · Amarelo · Vermelho', titulo: 'Diagnóstico', corpo, voltar: 'inicio' };
};

/* ── 04 · Documentos (IPVA · Seguro · Revisão) ─────────────────────────── */

Screens.docs = (v) => {
  const filtro = App.sub.docs || 'todos';
  const status = Calc.docsStatus(v);
  const anuais = Calc.compromissosAnuais(v);
  const visiveis = filtro === 'todos' ? status : status.filter((s) => s.doc.id === filtro);
  // A revisão não se "paga" aqui — ela se agenda; entra como CTA alternativa.
  const pagaveis = status.filter((s) => s.pendente > 0 && s.acao && s.doc.tipo !== 'km');
  const revisao = status.find((s) => s.doc.tipo === 'km' && s.status !== 'ok');

  const corpo = h('div', null,
    UI.seg([{ id: 'todos', label: 'Todos' }, ...status.map((s) => ({ id: s.doc.id, label: s.tag }))],
      filtro, (id) => App.ir('docs', { docs: id })),

    h('div', { style: { padding: '18px 16px 6px' } },
      UI.mono('Compromissos do ciclo', { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }),
      h('div', { class: 'bignum' }, brl0(anuais.total), h('small', null, 'previstos'))),

    UI.row(
      UI.kv({ k: 'Pago', v: brl0(anuais.pago) }),
      UI.kv({ k: 'A pagar', v: brl0(anuais.pendente), cor: 'var(--color-accent)' })),

    cartaoFinanciamento(v),

    visiveis.map((s) => (s.doc.tipo === 'seguro' ? cartaoSeguro(v, s) : h('div', { style: { borderTop: '1px solid var(--color-divider)', padding: 16 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10 } },
        h('span', { class: 'status-tag' }, UI.dot(s.cor, 8), s.tag),
        UI.mono(s.prazo, { fontSize: 11, letterSpacing: '.08em', color: 'var(--muted)' })),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 } },
        h('div', { style: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', flex: 1 } }, s.titulo),
        UI.mono(s.valorTexto, { fontSize: 13, fontWeight: 600 })),
      h('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 6 } }, s.sub),
      h('div', { style: { marginTop: 12 } }, UI.meter(s.progresso, s.cor)),
      s.acao ? h('div', { style: { marginTop: 12 } },
        h('button', {
          class: 'btn btn-secondary',
          style: { borderRadius: 100, padding: '10px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' },
          onClick: () => (s.doc.tipo === 'km' ? Acoes.agendarOficina(v) : Acoes.pagar(v, s)),
        }, s.acao)) : null))),

    pagaveis.length || revisao ? UI.cta([
      pagaveis.length ? { label: pagaveis[0].acao, pri: true, onClick: () => Acoes.pagar(v, pagaveis[0]) } : null,
      revisao ? { label: 'Agendar oficina', pri: !pagaveis.length, onClick: () => Acoes.agendarOficina(v) } : null,
    ].filter(Boolean)) : h('div', { class: 'note' }, 'Nada pendente neste ciclo.'));

  return { kicker: 'Cronograma do ciclo', titulo: 'Documentos', corpo };
};

/* O seguro tem duas linhas do tempo que a pessoa confunde o tempo todo:
   até quando ele cobre, e até quando ela ainda está pagando. Ficam separadas
   e rotuladas, uma embaixo da outra. */
function cartaoSeguro(v, s) {
  const pag = s.doc.pagamento || { quitado: true };
  const detalhe = (rotulo, texto, cor) => h('div', {
    style: { display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 10 },
  },
    UI.mono(rotulo, { width: 92, flex: 'none', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }),
    h('div', { style: { fontSize: 12, flex: 1, color: cor || 'inherit' } }, texto));

  return h('div', { style: { borderTop: '1px solid var(--color-divider)', padding: 16 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10 } },
      h('span', { class: 'status-tag' }, UI.dot(s.cor, 8), 'SEGURO'),
      UI.mono(pag.quitado ? 'quitado' : `${pag.restantes}x a pagar`,
        { fontSize: 11, letterSpacing: '.08em', color: 'var(--muted)' })),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 } },
      h('div', { style: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', flex: 1 } }, s.titulo),
      UI.mono(brl(s.doc.valor), { fontSize: 13, fontWeight: 600 })),

    detalhe('Cobertura', s.cobertura.texto, s.status === 'bad' ? 'var(--color-accent)' : null),
    detalhe('Pagamento', s.pagamentoTexto),

    h('div', { style: { marginTop: 12 } }, UI.meter(s.progresso, s.cor)),
    UI.mono('vigência decorrida', { fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }),

    h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
      h('button', {
        class: 'btn btn-secondary',
        style: { borderRadius: 100, padding: '10px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' },
        onClick: () => App.ir('seguro'),
      }, 'Apólice e contatos'),
      s.acao ? h('button', {
        class: 'btn btn-secondary',
        style: { borderRadius: 100, padding: '10px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' },
        onClick: () => Acoes.pagar(v, s),
      }, s.acao) : null));
}

function cartaoFinanciamento(v) {
  const f = Calc.financiamentoStatus(v);
  if (f.quitado) return null;
  return h('div', { style: { borderTop: '1px solid var(--color-divider)', padding: 16 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10 } },
      h('span', { class: 'status-tag' }, UI.dot(COR.warn, 8), 'FINANC.'),
      UI.mono(`todo dia ${f.dia}`, { fontSize: 11, letterSpacing: '.08em', color: 'var(--muted)' })),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 } },
      h('div', { style: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', flex: 1 } },
        `Parcela do ${labelTipo(v.tipo).toLowerCase()}`),
      UI.mono(brl(f.parcela), { fontSize: 13, fontWeight: 600 })),
    h('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 6 } },
      `${f.restantes} ${f.restantes === 1 ? 'parcela restante' : 'parcelas restantes'} · saldo ${brl0(f.saldo)}`),
    h('div', { style: { marginTop: 12 } }, UI.meter(f.progresso, COR.warn)),
    h('div', { style: { marginTop: 12 } },
      h('button', {
        class: 'btn btn-secondary',
        style: { borderRadius: 100, padding: '10px 16px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' },
        onClick: () => Acoes.pagarParcela(v),
      }, 'Registrar parcela paga')));
}

/* ── 05 · Custo por km  +  06 · Simulação ──────────────────────────────── */

Screens.custos = (v) => {
  const aba = App.sub.custos || 'km';
  const corpo = h('div', null,
    UI.seg([{ id: 'km', label: 'Custo/km' }, { id: 'sim', label: 'Financiamento' }], aba,
      (id) => App.ir('custos', { custos: id })),
    aba === 'km' ? abaCustoKm(v) : abaSimulacao(v));
  return { kicker: aba === 'km' ? 'Quanto custa cada quilômetro' : 'Tabela Price ou SAC', titulo: aba === 'km' ? 'Custo/km' : 'Simular', corpo };
};

const CORES_FATIA = ['var(--color-accent)', 'var(--color-neutral-800)', 'var(--color-neutral-600)', 'var(--color-neutral-500)', 'var(--color-neutral-400)', 'var(--color-neutral-300)', 'var(--color-neutral-200)'];

function abaCustoKm(v) {
  const dias = App.sub.periodo || 30;
  const c = Calc.composicao(v, dias);
  const custoKm = c.km > 0 ? c.gasto / c.km : 0;

  return h('div', null,
    UI.seg([{ id: 30, label: '30 dias' }, { id: 90, label: '90 dias' }, { id: 365, label: '12 meses' }],
      dias, (id) => App.ir('custos', { custos: 'km', periodo: id })),

    h('div', { style: { padding: '24px 20px 8px' } },
      UI.mono('Custo médio por km', { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }),
      h('div', { class: 'bignum', style: { color: 'var(--color-accent)' } }, custoKm ? brl(custoKm) : '—', h('small', null, '/ km')),
      UI.mono(`${num(c.km)} km rodados · ${brl(c.gasto)} gastos`, { marginTop: 6, color: 'var(--muted)' })),

    c.linhas.length ? h('div', { style: { margin: '8px 20px 4px', display: 'flex', height: 12, borderRadius: 100, overflow: 'hidden', background: 'var(--color-neutral-200)' } },
      c.linhas.map((l, i) => h('div', { style: { width: l.pct + '%', background: CORES_FATIA[i % CORES_FATIA.length] }, title: `${l.label} · ${brl(l.valor)}` }))) : null,

    UI.sectHd('Composição', '% · R$/km'),
    c.linhas.length ? c.linhas.map((l) => h('div', { class: 'list-item' },
      h('div', { style: { width: 40, textAlign: 'right', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 15 } }, Math.round(l.pct) + '%'),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, l.label),
        UI.mono(`${brl(l.valor)} · ${l.qtd} ${l.qtd === 1 ? 'lançamento' : 'lançamentos'}`, { marginTop: 2, color: 'var(--muted)' })),
      UI.mono(l.porKm ? brl(l.porKm) : '—', { fontSize: 13, fontWeight: 600 })))
      : UI.vazio('Sem lançamentos no período escolhido.'),

    UI.cta([
      { label: 'Editar consumo', icone: '✎', onClick: () => Acoes.editarConsumo(v) },
      { label: 'Registrar peça', icone: '+', pri: true, onClick: () => Acoes.registrarLancamento(v, 'manutencao') },
    ]));
}

function abaSimulacao(v) {
  const s = App.sim(v);
  const r = Calc.financiamento(s);
  const entradaPct = s.valor > 0 ? (s.entrada / s.valor) * 100 : 0;

  const caixa = (rotulo, valor, sub, onClick) => h('div', null,
    UI.mono(rotulo, { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }),
    h('button', {
      style: {
        width: '100%', textAlign: 'left', padding: '12px 16px', border: '1px solid var(--color-divider)',
        background: 'var(--color-bg)', borderRadius: 14, fontFamily: 'var(--font-heading)',
        fontWeight: 700, fontSize: 20, letterSpacing: '-.01em', color: 'var(--color-text)', cursor: 'pointer',
      },
      onClick,
    }, valor),
    sub ? h('div', { style: { fontSize: 11, color: 'var(--muted)', marginTop: 4 } }, sub) : null);

  const slider = h('input', {
    type: 'range', min: 0, max: 90, step: 1, value: Math.round(entradaPct),
    oninput: (ev) => {
      const novo = Math.round(s.valor * (Number(ev.target.value) / 100));
      App.setSim({ entrada: novo });
      App.render();
    },
  });

  const cenarios = [12, 24, 36, 48, 60].map((n) => ({ n, r: Calc.financiamento({ ...s, meses: n }) }));

  return h('div', null,
    h('div', { style: { padding: '18px 20px 8px', display: 'grid', gap: 14 } },
      caixa('Valor do veículo', brl0(s.valor), 'toque para ajustar',
        () => Acoes.editarSim('valor', 'Valor do veículo', s.valor)),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        caixa('Entrada', brl0(s.entrada), null, () => Acoes.editarSim('entrada', 'Entrada', s.entrada)),
        caixa('Prazo', `${s.meses}x`, null, () => Acoes.editarSim('meses', 'Prazo em meses', s.meses))),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        caixa('Taxa a.m.', num(s.taxa, 2) + '%', null, () => Acoes.editarSim('taxa', 'Taxa mensal (%)', s.taxa)),
        caixa('Sistema', s.sistema === 'sac' ? 'SAC' : 'Price', null, () => Acoes.trocarSistema(s)))),

    h('div', { style: { padding: '4px 20px 16px' } }, slider,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' } },
        h('span', null, `${Math.round(entradaPct)}% de entrada`),
        h('span', null, `${brl0(r.pv)} financiados`))),

    h('div', { class: 'price-strip', style: { flexDirection: 'column', alignItems: 'stretch', gap: 12 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
        h('div', null,
          h('div', { class: 'pk' }, s.sistema === 'sac' ? '1ª parcela' : 'Parcela mensal'),
          h('div', { class: 'pv', style: { fontSize: 32 } }, brl(r.parcela))),
        h('div', { style: { textAlign: 'right' } },
          h('div', { class: 'pk' }, 'em'),
          UI.mono(`${r.n}x`, { fontSize: 15, marginTop: 4, fontWeight: 600 }))),
      h('div', { style: { height: 1, background: 'rgba(255,255,255,.18)' } }),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'var(--mono)', fontSize: 11 } },
        h('div', null, h('div', { style: { opacity: .7 } }, 'Total pago'), h('div', { style: { fontSize: 14, marginTop: 4, fontWeight: 600 } }, brl0(r.total + Number(s.entrada)))),
        h('div', { style: { textAlign: 'right' } }, h('div', { style: { opacity: .7 } }, 'Juros totais'), h('div', { style: { fontSize: 14, marginTop: 4, fontWeight: 600 } }, brl0(r.juros)))),
      s.sistema === 'sac' ? UI.mono(`última parcela ${brl(r.ultima)}`, { opacity: .7, fontSize: 10 }) : null),

    UI.sectHd('Comparar prazos'),
    cenarios.map((c) => h('button', {
      class: 'list-item', style: c.n === s.meses ? { background: 'var(--color-accent-100)' } : null,
      onClick: () => { App.setSim({ meses: c.n }); App.render(); },
    },
      h('div', { style: { width: 46, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, color: c.n === s.meses ? 'var(--color-accent)' : 'var(--color-text)' } }, c.n + 'x'),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontSize: 15, fontWeight: 700 } }, brl(c.r.parcela)),
        UI.mono(`juros ${brl0(c.r.juros)}`, { marginTop: 2, color: 'var(--muted)' })),
      c.n === s.meses ? h('span', { class: 'status-tag', style: { color: 'var(--color-accent)', borderColor: 'var(--color-accent)' } }, 'ATUAL') : null)),

    v.simulacoes && v.simulacoes.length ? h('div', null,
      UI.sectHd('Simulações salvas'),
      v.simulacoes.map((sim) => h('div', { class: 'list-item' },
        UI.mono(fmtDia(sim.criada), { width: 44, color: 'var(--muted)' }),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 13, fontWeight: 600 } }, `${brl(sim.parcela)} · ${sim.meses}x`),
          UI.mono(`${brl0(sim.valor)} · entrada ${brl0(sim.entrada)} · ${num(sim.taxa, 2)}% a.m. · ${sim.sistema === 'sac' ? 'SAC' : 'Price'}`, { marginTop: 2, color: 'var(--muted)' }))))) : null,

    UI.cta([
      { label: 'Limpar', icone: '↻', onClick: () => { App.setSim({ entrada: 0, meses: 36, taxa: 1.49, sistema: 'price' }); App.render(); } },
      {
        label: 'Salvar simulação', icone: '✓', pri: true,
        onClick: () => { Store.salvarSimulacao(v.id, { ...s, parcela: r.parcela, juros: r.juros, total: r.total }); App.render(); UI.toast('Simulação salva'); },
      },
    ]));
}

/* ── Seguradora: apólice, coberturas e contatos ────────────────────────── */

const soDigitos = (t) => String(t || '').replace(/\D/g, '');
const telHref = (t) => 'tel:' + soDigitos(t);
const zapHref = (t) => {
  const d = soDigitos(t);
  return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d);
};
const siteHref = (t) => (/^https?:\/\//i.test(t) ? t : 'https://' + t);

Screens.seguro = (v) => {
  const s = Calc.docsStatus(v).find((d) => d.doc.id === 'seguro');
  if (!s) {
    return {
      kicker: 'Seguro', titulo: 'Sem apólice', voltar: 'docs',
      corpo: h('div', null,
        UI.vazio('Este veículo não tem seguro cadastrado.'),
        UI.cta([{ label: 'Cadastrar seguro na ficha', icone: '→', pri: true, onClick: () => Acoes.editarVeiculo(v) }])),
    };
  }

  const a = Store.apoliceDe(v) || {};
  const pag = s.doc.pagamento || { quitado: true };

  // Linha de dado: só aparece quando existe. Campo vazio não vira "—".
  const dado = (rotulo, valor, extra) => (valor ? h('div', { class: 'dado' },
    UI.mono(rotulo, { class: 'dado-k' }),
    h('div', { class: 'dado-v' }, valor, extra || null)) : null);

  const temContato = a.telEmergencia || a.telSeguradora || a.whatsapp || a.corretorTel;

  const botaoTel = (href, rotulo, sub, principal) => h('a', {
    class: 'contato' + (principal ? ' principal' : ''), href,
  },
    h('div', null,
      h('div', { class: 'contato-lbl' }, rotulo),
      sub ? UI.mono(sub, { fontSize: 12, marginTop: 3, opacity: .85 }) : null),
    h('span', { class: 'contato-ic' }, principal ? '☎' : '›'));

  const corpo = h('div', { class: 'tela-seguro' },
    // — o que importa no pior momento —
    temContato
      ? h('div', { class: 'bloco-contatos' },
          a.telEmergencia ? botaoTel(telHref(a.telEmergencia), 'Assistência 24h', a.telEmergencia, true) : null,
          a.telSeguradora ? botaoTel(telHref(a.telSeguradora), 'Central da seguradora', a.telSeguradora) : null,
          a.corretorTel ? botaoTel(telHref(a.corretorTel), a.corretorNome || 'Corretor', a.corretorTel) : null,
          a.whatsapp ? botaoTel(zapHref(a.whatsapp), 'WhatsApp', a.whatsapp) : null,
          a.site ? botaoTel(siteHref(a.site), 'Site da seguradora', a.site) : null)
      : h('div', { class: 'note' },
          'Nenhum telefone cadastrado ainda. É justamente o que você vai precisar com pressa — vale preencher antes de precisar.'),

    // — identificação da apólice —
    UI.sectHd('Apólice'),
    h('div', { class: 'bloco' },
      dado('Seguradora', a.seguradora),
      a.numero ? h('div', { class: 'dado' },
        UI.mono('Número', { class: 'dado-k' }),
        h('div', { class: 'dado-v', style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('span', { class: 'mono', style: { fontWeight: 600 } }, a.numero),
          h('button', { class: 'mini', onClick: () => Acoes.copiar(a.numero, 'Número da apólice copiado') }, 'copiar'))) : null,
      dado('Cobertura', s.cobertura.texto),
      dado('Pagamento', s.pagamentoTexto),
      dado('Valor da apólice', brl(s.doc.valor)),
      !pag.quitado ? dado('Próxima parcela', brl(pag.parcela)) : null),

    // — o que está coberto —
    (a.franquia || a.rcfMateriais || a.rcfCorporais || (a.coberturas || []).length) ? h('div', null,
      UI.sectHd('Cobertura contratada'),
      h('div', { class: 'bloco' },
        dado('Franquia', a.franquia ? brl(parseNum(a.franquia)) : null),
        dado('RCF · materiais', a.rcfMateriais ? brl(parseNum(a.rcfMateriais)) : null),
        dado('RCF · corporais', a.rcfCorporais ? brl(parseNum(a.rcfCorporais)) : null),
        (a.coberturas || []).length ? h('div', { class: 'chips', style: { marginTop: 10 } },
          a.coberturas.map((c) => h('span', { class: 'chip on' }, c))) : null)) : null,

    // — assistência —
    ((a.assistencias || []).length || a.guinchoKm || a.carroReservaDias) ? h('div', null,
      UI.sectHd('Assistência'),
      h('div', { class: 'bloco' },
        dado('Guincho', a.guinchoKm ? `até ${num(parseNum(a.guinchoKm))} km` : null),
        dado('Carro reserva', a.carroReservaDias ? `${num(parseNum(a.carroReservaDias))} dias` : null),
        (a.assistencias || []).length ? h('div', { class: 'chips', style: { marginTop: 10 } },
          a.assistencias.map((c) => h('span', { class: 'chip on' }, c))) : null)) : null,

    // — o que a seguradora pergunta no telefone —
    UI.sectHd('Dados que vão te pedir'),
    h('div', { class: 'bloco' },
      dado('Veículo', `${v.marca} ${v.modelo} ${v.ano}`.trim()),
      v.placa ? h('div', { class: 'dado' },
        UI.mono('Placa', { class: 'dado-k' }),
        h('div', { class: 'dado-v', style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('span', { class: 'mono', style: { fontWeight: 600 } }, v.placa),
          h('button', { class: 'mini', onClick: () => Acoes.copiar(v.placa, 'Placa copiada') }, 'copiar'))) : null,
      dado('Chassi', v.chassi),
      dado('Renavam', v.renavam),
      dado('Cor', v.cor)),

    a.observacoes ? h('div', null,
      UI.sectHd('Observações'),
      h('div', { class: 'bloco' }, h('div', { style: { fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' } }, a.observacoes))) : null,

    UI.cta([
      { label: 'Editar dados do seguro', icone: '✎', pri: true, onClick: () => App.ir('seguro-editar') },
    ]),
    h('div', { class: 'note', style: { paddingBottom: 24 } },
      'Tudo isso fica salvo apenas neste aparelho. Nada é enviado para lugar nenhum.'));

  return { kicker: a.seguradora || 'Seguro', titulo: 'Seguradora', corpo, voltar: 'docs' };
};

/* Formulário da apólice — muitos campos, todos opcionais. */
Screens['seguro-editar'] = (v) => {
  const a = Store.apoliceDe(v) || {};
  const r = App.rascunhoSeguro(a);
  const refs = {};

  const campo = (def) => {
    const ref = UI.campo(Object.assign({}, def, { valor: r[def.name] != null ? r[def.name] : '' }));
    ref.input.addEventListener('input', () => { r[def.name] = ref.input.value; });
    ref.input.addEventListener('change', () => { r[def.name] = ref.input.value; });
    refs[def.name] = ref;
    return ref.caixa;
  };
  const dupla = (x, y) => h('div', { class: 'grid2' }, campo(x), campo(y));

  const chips = (lista, chave) => h('div', { class: 'chips' },
    lista.map((c) => h('button', {
      class: 'chip' + ((r[chave] || []).includes(c) ? ' on' : ''),
      onClick: () => {
        const atual = r[chave] || [];
        r[chave] = atual.includes(c) ? atual.filter((x) => x !== c) : atual.concat([c]);
        App.render();
      },
    }, c)));

  const corpo = h('div', { class: 'form-veiculo' },
    UI.sectHd('Seguradora e apólice'),
    h('div', { class: 'bloco' },
      dupla({ name: 'seguradora', label: 'Seguradora', placeholder: 'Porto, Azul, Allianz…' },
            { name: 'numero', label: 'Número da apólice', placeholder: '00-0000000' })),

    UI.sectHd('Contatos'),
    h('div', { class: 'bloco' },
      h('div', { class: 'hint', style: { marginBottom: 14 } },
        'Estes viram botões de ligar na tela do seguro. O de assistência 24h fica em destaque, no topo.'),
      campo({ name: 'telEmergencia', label: 'Assistência 24h', placeholder: '0800 000 0000', tipo: 'tel' }),
      dupla({ name: 'telSeguradora', label: 'Central de atendimento', placeholder: '0800 000 0000', tipo: 'tel' },
            { name: 'whatsapp', label: 'WhatsApp', placeholder: '(11) 90000-0000', tipo: 'tel' }),
      campo({ name: 'site', label: 'Site ou app', placeholder: 'portoseguro.com.br' }),
      dupla({ name: 'corretorNome', label: 'Corretor', placeholder: 'nome' },
            { name: 'corretorTel', label: 'Telefone do corretor', placeholder: '(11) 90000-0000', tipo: 'tel' }),
      campo({ name: 'corretorEmail', label: 'E-mail do corretor', placeholder: 'nome@corretora.com.br' })),

    UI.sectHd('Cobertura contratada'),
    h('div', { class: 'bloco' },
      campo({ name: 'franquia', label: 'Franquia', tipo: 'dinheiro', placeholder: '0,00', hint: 'O que você paga do próprio bolso em caso de sinistro.' }),
      dupla({ name: 'rcfMateriais', label: 'RCF · danos materiais', tipo: 'dinheiro', placeholder: '0,00' },
            { name: 'rcfCorporais', label: 'RCF · danos corporais', tipo: 'dinheiro', placeholder: '0,00' }),
      UI.mono('O que está coberto', { fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', margin: '4px 0 8px' }),
      chips(COBERTURAS, 'coberturas')),

    UI.sectHd('Assistência'),
    h('div', { class: 'bloco' },
      dupla({ name: 'guinchoKm', label: 'Guincho até (km)', tipo: 'number', placeholder: '200' },
            { name: 'carroReservaDias', label: 'Carro reserva (dias)', tipo: 'number', placeholder: '7' }),
      UI.mono('Serviços incluídos', { fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', margin: '4px 0 8px' }),
      chips(ASSISTENCIAS, 'assistencias')),

    UI.sectHd('Observações'),
    h('div', { class: 'bloco' },
      campo({ name: 'observacoes', label: 'Anotações', tipo: 'textarea', placeholder: 'Isenção de franquia para vidros, cobertura de app aos fins de semana…' })),

    UI.cta([
      { label: 'Cancelar', icone: '✕', onClick: () => { App.limparRascunhoSeguro(); App.ir('seguro'); } },
      {
        label: 'Salvar', icone: '✓', pri: true,
        onClick: () => {
          Store.atualizarApolice(v.id, r);
          App.limparRascunhoSeguro();
          App.ir('seguro');
          UI.toast('Dados do seguro salvos');
        },
      },
    ]));

  return { kicker: 'Editando', titulo: 'Dados do seguro', corpo, voltar: 'seguro' };
};

/* ── Cadastro / edição do veículo ──────────────────────────────────────── */

Screens.veiculo = (atual) => {
  const editando = App.sub.veiculoId ? Store.veiculo(App.sub.veiculoId) : null;
  const base = editando || {};

  // Rascunho vive no App para sobreviver ao redesenho da foto e do tipo.
  const r = App.rascunho(base);
  const refs = {};

  const grupo = (titulo, ...campos) => h('div', null,
    UI.sectHd(titulo),
    h('div', { class: 'bloco' }, campos));

  const campo = (def) => {
    const ref = UI.campo(Object.assign({}, def, { valor: r[def.name] != null ? r[def.name] : def.valor }));
    ref.input.addEventListener('input', () => { r[def.name] = ref.input.value; erroGeral.style.display = 'none'; });
    ref.input.addEventListener('change', () => { r[def.name] = ref.input.value; });
    refs[def.name] = ref;
    return ref.caixa;
  };

  const dupla = (a, b) => h('div', { class: 'grid2' }, campo(a), campo(b));

  const erroGeral = h('div', { class: 'erro-geral', style: { display: 'none' } },
    'Preencha os campos destacados: modelo e quilometragem são o mínimo para o app calcular alguma coisa.');

  // — foto —
  const slotFoto = h('button', {
    class: 'foto-slot' + (r.foto ? ' tem-foto' : ''),
    type: 'button',
    onClick: () => UI.pedirFoto((dataUrl) => { r.foto = dataUrl; App.render(); }),
  }, r.foto
    ? h('img', { src: r.foto, alt: 'Foto do veículo' })
    : h('div', { class: 'vazia' },
        h('span', { class: 'mais' }, '+'),
        h('span', null, 'foto do veículo'),
        h('span', { style: { textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: .8 } },
          'câmera ou galeria · opcional')));

  const corpo = h('div', { class: 'form-veiculo' },
    slotFoto,
    r.foto ? h('div', { class: 'foto-acoes' },
      h('button', { onClick: () => UI.pedirFoto((d) => { r.foto = d; App.render(); }) }, 'trocar'),
      h('button', { onClick: () => { r.foto = null; App.render(); } }, 'remover')) : null,

    UI.sectHd('Tipo de veículo'),
    h('div', { class: 'tipo-escolha' },
      TIPOS.map((t) => h('button', {
        class: r.tipo === t.id ? 'on' : '',
        onClick: () => { r.tipo = t.id; App.render(); },
      }, h('span', { class: 'ic' }, t.icone), h('span', { class: 'nm' }, t.label)))),

    grupo('Identificação',
      dupla({ name: 'marca', label: 'Marca', placeholder: r.tipo === 'moto' ? 'Honda' : 'Chevrolet' },
            { name: 'modelo', label: 'Modelo', placeholder: r.tipo === 'moto' ? 'CB 300F' : 'Onix 1.0', obrigatorio: true }),
      campo({ name: 'apelido', label: 'Apelido', placeholder: 'como você chama ele', hint: 'Aparece no seletor da garagem. Se ficar vazio, usamos o modelo.' }),
      dupla({ name: 'ano', label: 'Ano', tipo: 'number', placeholder: String(new Date().getFullYear()) },
            { name: 'cor', label: 'Cor', placeholder: 'Prata' }),
      campo({ name: 'combustivel', label: 'Combustível', tipo: 'select', opcoes: COMBUSTIVEIS.map((c) => ({ value: c, label: c })) })),

    grupo('Documentos',
      dupla({ name: 'placa', label: 'Placa', placeholder: 'ABC1D23', maiusculas: true },
            { name: 'renavam', label: 'Renavam', tipo: 'number', placeholder: '000000000' }),
      campo({ name: 'chassi', label: 'Chassi', placeholder: '9BW...', maiusculas: true, hint: 'Opcional — útil para consulta em seguradora e concessionária.' })),

    grupo('Uso',
      dupla({ name: 'odometro', label: 'Km atual', tipo: 'number', placeholder: '0', obrigatorio: true },
            { name: 'consumo', label: 'Consumo (km/L)', tipo: 'dinheiro', placeholder: r.tipo === 'moto' ? '30' : '11' }),
      dupla({ name: 'precoComb', label: 'Preço do litro', tipo: 'dinheiro', placeholder: '5,89' },
            { name: 'compra', label: 'Data da compra', tipo: 'date' })),

    // — financiamento —
    UI.sectHd('Financiamento'),
    h('div', { class: 'bloco' },
      h('div', { class: 'pergunta' }, r.tipo === 'moto' ? 'Moto quitada?' : 'Carro quitado?'),
      h('div', { class: 'sim-nao' },
        h('button', { class: r.quitado ? 'on' : '', onClick: () => { r.quitado = true; App.render(); } }, 'Sim'),
        h('button', { class: !r.quitado ? 'on' : '', onClick: () => { r.quitado = false; App.render(); } }, 'Não')),
      r.quitado
        ? h('div', { class: 'hint', style: { marginTop: 10 } }, 'Sem parcela entrando no custo mensal.')
        : h('div', { style: { marginTop: 14 } },
            dupla({ name: 'parcela', label: 'Valor da parcela', tipo: 'dinheiro', placeholder: '0,00' },
                  { name: 'parcelasRestantes', label: 'Parcelas restantes', tipo: 'number', placeholder: '0' }),
            campo({ name: 'diaVencimento', label: 'Dia do vencimento', tipo: 'number', placeholder: '10', hint: 'A parcela entra no custo fixo de todo mês, junto com os documentos.' }))),

    // — seguro: cobertura e pagamento são perguntas diferentes —
    UI.sectHd('Seguro'),
    h('div', { class: 'bloco' },
      h('div', { class: 'pergunta' }, 'Tem seguro?'),
      h('div', { class: 'sim-nao' },
        h('button', { class: r.temSeguro ? 'on' : '', onClick: () => { r.temSeguro = true; App.render(); } }, 'Sim'),
        h('button', { class: !r.temSeguro ? 'on' : '', onClick: () => { r.temSeguro = false; App.render(); } }, 'Não')),
      !r.temSeguro
        ? h('div', { class: 'hint', style: { marginTop: 10 } }, 'Sem seguro para acompanhar.')
        : h('div', { style: { marginTop: 14 } },
            campo({ name: 'seguroNome', label: 'Seguradora', placeholder: 'nome da seguradora ou do plano' }),
            dupla({ name: 'seguroValor', label: 'Valor total da apólice', tipo: 'dinheiro', placeholder: '0,00' },
                  { name: 'seguroVenc', label: 'Cobertura até', tipo: 'date' }),
            h('div', { class: 'hint', style: { marginTop: -6, marginBottom: 16 } },
              'A apólice costuma valer 12 meses. Essa data é até quando você está coberto — não tem relação com o parcelamento.'),
            h('div', { class: 'pergunta' }, 'Já está pago?'),
            h('div', { class: 'sim-nao' },
              h('button', { class: r.seguroQuitado ? 'on' : '', onClick: () => { r.seguroQuitado = true; App.render(); } }, 'Sim'),
              h('button', { class: !r.seguroQuitado ? 'on' : '', onClick: () => { r.seguroQuitado = false; App.render(); } }, 'Não')),
            r.seguroQuitado
              ? h('div', { class: 'hint', style: { marginTop: 10 } }, 'Nada a pagar até a renovação.')
              : h('div', { style: { marginTop: 14 } },
                  dupla({ name: 'seguroParcela', label: 'Valor da parcela', tipo: 'dinheiro', placeholder: '0,00' },
                        { name: 'seguroRestantes', label: 'Parcelas restantes', tipo: 'number', placeholder: '0' }),
                  h('div', { class: 'hint', style: { marginTop: -6 } },
                    'A parcela entra no custo mensal enquanto durar; a cobertura segue valendo até a data acima.')))),

    // — demais despesas: só o que a pessoa informar —
    UI.sectHd('IPVA e licenciamento'),
    h('div', { class: 'bloco' },
      h('div', { class: 'hint', style: { marginBottom: 14 } },
        'O app não estima esses valores: eles mudam por estado e por veículo. O que você deixar em branco simplesmente não é acompanhado.'),
      dupla({ name: 'ipvaValor', label: 'IPVA · valor do ano', tipo: 'dinheiro', placeholder: '0,00' },
            { name: 'ipvaParcelas', label: 'Em quantas parcelas', tipo: 'number', placeholder: '1' }),
      campo({ name: 'ipvaVenc', label: 'Vencimento da 1ª parcela', tipo: 'date' }),
      dupla({ name: 'licValor', label: 'Licenciamento', tipo: 'dinheiro', placeholder: '0,00' },
            { name: 'licVenc', label: 'Vencimento', tipo: 'date' })),

    erroGeral,

    UI.cta([
      { label: 'Cancelar', icone: '✕', onClick: () => App.sairDoCadastro() },
      {
        label: editando ? 'Salvar ficha' : 'Adicionar à garagem', icone: '✓', pri: true,
        onClick: () => salvarVeiculo(editando, r, refs, erroGeral),
      },
    ]),

    editando ? h('div', { class: 'note' },
      'Mudar o tipo do veículo troca o plano de manutenção; o que já foi registrado nos itens em comum é preservado.') : null);

  return {
    kicker: editando ? 'Editando ficha' : 'Novo veículo',
    titulo: editando ? (editando.apelido || editando.modelo) : 'Cadastro',
    corpo,
    voltar: editando ? 'garagem' : 'inicio',
  };
};

function salvarVeiculo(editando, r, refs, erroGeral) {
  const obrigatorios = ['modelo', 'odometro'];
  let faltando = false;
  for (const nome of obrigatorios) {
    const ref = refs[nome];
    if (!ref) continue;
    const vazio = !String(r[nome] || '').trim();
    ref.caixa.classList.toggle('err', vazio);
    if (vazio) faltando = true;
  }
  if (faltando) {
    erroGeral.style.display = 'block';
    erroGeral.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }

  const dados = Object.assign({}, r, { apelido: r.apelido || r.modelo });

  if (editando) {
    Store.atualizarVeiculo(editando.id, {
      tipo: dados.tipo, marca: dados.marca, modelo: dados.modelo, apelido: dados.apelido,
      ano: Number(dados.ano) || editando.ano, cor: dados.cor,
      combustivel: dados.combustivel, placa: Store.normalizarPlaca(dados.placa),
      renavam: dados.renavam, chassi: (dados.chassi || '').toUpperCase(),
      odometro: Math.max(editando.odometro, Math.round(parseNum(dados.odometro))),
      consumo: parseNum(dados.consumo) || editando.consumo,
      precoComb: parseNum(dados.precoComb) || editando.precoComb,
      compra: dados.compra || editando.compra, foto: dados.foto,
    });
    Store.atualizarDocsEFinanciamento(editando.id, dados);
    App.limparRascunho();
    App.ir('garagem', { garagem: 'ficha' });
    UI.toast('Ficha atualizada');
    return;
  }

  const novo = Store.addVeiculo(dados);
  App.limparRascunho();
  App.ir('inicio');
  UI.toast(`${novo.apelido} na garagem`);
}

/* ── Perfil (fora do canvas — necessário para o app funcionar) ─────────── */

Screens.perfil = () => {
  const st = Store.get();
  const corpo = h('div', null,
    UI.row(UI.kv({ k: 'Nome', v: st.perfil.nome || '—', sub: 'toque para editar', onClick: () => Acoes.editarPerfil() })),

    UI.sectHd('Garagem', '+ veículo', () => Acoes.novoVeiculo()),
    st.veiculos.map((x) => h('div', { class: 'list-item' },
      UI.dot(x.id === st.selecionado ? 'var(--color-accent)' : 'var(--color-neutral-400)'),
      h('button', {
        style: { flex: 1, textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0 },
        onClick: () => { Store.selecionar(x.id); App.ir('inicio'); },
      },
        h('div', { style: { fontSize: 14, fontWeight: 600 } }, `${x.marca} ${x.modelo}`),
        UI.mono(`${x.ano} · ${x.placa || 'sem placa'} · ${num(x.odometro)} km`, { marginTop: 2, color: 'var(--muted)' })),
      h('button', { class: 'btn btn-ghost', style: { fontSize: 11 }, onClick: () => Acoes.editarVeiculo(x) }, 'editar'),
      st.veiculos.length > 1
        ? h('button', { class: 'btn btn-ghost', style: { fontSize: 11 }, onClick: () => Acoes.removerVeiculo(x) }, 'excluir')
        : null)),

    UI.sectHd('Leitura por foto'),
    UI.row(UI.kv({
      k: 'Google Gemini',
      v: Gemini.configurado() ? 'Ativa' : 'Desligada',
      cor: Gemini.configurado() ? COR.ok : null,
      sub: Gemini.configurado() ? Gemini.modelo() : 'toque para configurar',
      onClick: () => Acoes.configurarGemini(),
    })),
    h('div', { class: 'note' },
      'Com a chave configurada, as telas de abastecimento, odômetro e lançamento ganham um botão para fotografar a nota, a bomba ou o painel — o Gemini lê e preenche os campos, e você confere antes de salvar. A chave fica só neste aparelho e não entra no arquivo de exportação.'),

    UI.sectHd('Dados'),
    h('div', { class: 'note' },
      'Tudo fica salvo apenas neste navegador (localStorage). Exporte um arquivo .json para levar a garagem para outro aparelho.'),
    UI.cta([
      { label: 'Exportar', icone: '↓', onClick: () => Acoes.exportar() },
      { label: 'Importar', icone: '↑', onClick: () => Acoes.importar() },
    ]),
    UI.cta([
      { label: 'Restaurar dados de demonstração', icone: '↻', onClick: () => Acoes.resetar() },
    ]),
    UI.cta([
      { label: 'Sair da conta', icone: '⏻', onClick: () => Acoes.sair() },
    ]),
    h('div', { class: 'note', style: { paddingBottom: 24 } },
      'Autolog · sua garagem, em ordem · v1 — nasceu do canvas Garagem.dc.html (Modernist DS).'));

  return { kicker: 'Conta e dados', titulo: 'Perfil', corpo };
};
