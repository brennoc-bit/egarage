/* ==========================================================================
   calc.js — tudo que é número derivado: km, custos, diagnóstico, documentos
   e financiamento. Funções puras: recebem o veículo, devolvem o cálculo.
   ========================================================================== */
'use strict';

const COR = { ok: 'var(--c-ok)', warn: 'var(--c-warn)', bad: 'var(--c-bad)' };
const ROTULO = { ok: 'OK', warn: 'ATENÇÃO', bad: 'URGENTE' };

const Calc = (() => {
  const porData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

  const ordenados = (v) => [...v.lancamentos].sort(porData);
  const noPeriodo = (v, ini, fim) => v.lancamentos.filter((l) => l.data >= ini && l.data <= fim);

  /* ── Quilometragem ──────────────────────────────────────────────────── */

  // Odômetro na data pedida: última leitura registrada até ali.
  function odometroEm(v, iso) {
    if (iso >= today()) return v.odometro;
    const comKm = ordenados(v).filter((l) => l.odometro);
    let leitura = null;
    for (const l of comKm) { if (l.data <= iso) leitura = l.odometro; }
    if (leitura != null) return leitura;
    return comKm.length ? comKm[0].odometro : v.odometro;
  }

  const kmNoPeriodo = (v, ini, fim = today()) => Math.max(0, odometroEm(v, fim) - odometroEm(v, ini));
  const gastoNoPeriodo = (v, ini, fim = today()) => noPeriodo(v, ini, fim).reduce((s, l) => s + (l.valor || 0), 0);

  const inicioDoMes = () => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const diasAtras = (n) => toISO(addDays(new Date(), -n));

  /* ── Consumo real (km/L entre abastecimentos) ───────────────────────── */

  function consumoMedio(v) {
    const fuel = ordenados(v).filter((l) => l.tipo === 'combustivel' && l.litros && l.odometro);
    if (fuel.length < 2) return { valor: v.consumo, real: false };
    const km = fuel[fuel.length - 1].odometro - fuel[0].odometro;
    const litros = fuel.slice(1).reduce((s, l) => s + l.litros, 0);
    if (km <= 0 || litros <= 0) return { valor: v.consumo, real: false };
    return { valor: km / litros, real: true };
  }

  function precoMedioLitro(v) {
    const fuel = v.lancamentos.filter((l) => l.tipo === 'combustivel' && l.litros > 0);
    if (!fuel.length) return v.precoComb;
    const gasto = fuel.reduce((s, l) => s + l.valor, 0);
    const litros = fuel.reduce((s, l) => s + l.litros, 0);
    return litros > 0 ? gasto / litros : v.precoComb;
  }

  /* ── Custo por km ───────────────────────────────────────────────────── */

  function custoPorKm(v, dias) {
    const ini = diasAtras(dias);
    const km = kmNoPeriodo(v, ini);
    const gasto = gastoNoPeriodo(v, ini);
    return { km, gasto, valor: km > 0 ? gasto / km : 0, ini };
  }

  function composicao(v, dias) {
    const ini = diasAtras(dias);
    const km = kmNoPeriodo(v, ini);
    const itens = noPeriodo(v, ini, today());
    const gasto = itens.reduce((s, l) => s + l.valor, 0);
    const porCat = new Map();
    for (const l of itens) porCat.set(l.tipo, (porCat.get(l.tipo) || 0) + l.valor);

    const linhas = [...porCat.entries()]
      .map(([cat, valor]) => ({
        cat, label: labelCategoria(cat), valor,
        pct: gasto > 0 ? (valor / gasto) * 100 : 0,
        porKm: km > 0 ? valor / km : 0,
        qtd: itens.filter((l) => l.tipo === cat).length,
      }))
      .sort((a, b) => b.valor - a.valor);

    return { km, gasto, linhas, ini };
  }

  /* ── Histórico mensal ───────────────────────────────────────────────── */

  function resumoMensal(v, meses) {
    const hoje = new Date();
    const out = [];
    for (let i = meses - 1; i >= 0; i--) {
      const ref = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 1), -i);
      const ini = toISO(ref);
      const fim = toISO(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
      out.push({
        iso: ini,
        label: MES_CURTO[ref.getMonth()],
        km: kmNoPeriodo(v, ini, fim),
        gasto: gastoNoPeriodo(v, ini, fim),
      });
    }
    return out;
  }

  /* ── Diagnóstico de manutenção ──────────────────────────────────────── */

  function statusItem(v, item) {
    const odo = v.odometro;
    const alertaKm = item.alertaKm || Math.max(300, Math.round((item.intervaloKm || 0) * 0.12));
    const alertaMeses = item.alertaMeses || 3;

    let restanteKm = null, restanteMeses = null, progresso = 0;
    if (item.intervaloKm && item.ultimoKm != null) {
      restanteKm = item.ultimoKm + item.intervaloKm - odo;
      progresso = Math.max(progresso, ((odo - item.ultimoKm) / item.intervaloKm) * 100);
    }
    if (item.intervaloMeses && item.ultimaData) {
      const usados = monthsBetween(item.ultimaData, today());
      restanteMeses = item.intervaloMeses - usados;
      progresso = Math.max(progresso, (usados / item.intervaloMeses) * 100);
    }

    let status = 'ok';
    if ((restanteKm != null && restanteKm < 0) || (restanteMeses != null && restanteMeses < 0)) status = 'bad';
    else if ((restanteKm != null && restanteKm <= alertaKm) || (restanteMeses != null && restanteMeses <= alertaMeses)) status = 'warn';

    // Legenda: o que foi feito e quanto falta, na linguagem do item.
    const partes = [];
    if (item.ultimoKm != null && item.intervaloKm) {
      partes.push(item.ultimoKm > 0 ? `última · ${num(item.ultimoKm)} km` : 'nunca registrada');
    } else if (item.ultimaData) partes.push(`última · ${fmtMesAno(item.ultimaData)}`);
    if (restanteKm != null) {
      partes.push(restanteKm >= 0 ? `faltam ${num(restanteKm)} km` : `vencido há ${num(-restanteKm)} km`);
    }
    if (restanteMeses != null) {
      partes.push(restanteMeses >= 0 ? `faltam ${restanteMeses} ${restanteMeses === 1 ? 'mês' : 'meses'}` : `vencido há ${-restanteMeses} meses`);
    }

    return {
      id: item.id, nome: item.nome, item,
      status, cor: COR[status], rotulo: ROTULO[status],
      sub: partes.join(' · '),
      restanteKm, restanteMeses,
      progresso: clamp(progresso, 0, 100),
    };
  }

  function diagnostico(v) {
    const itens = v.manutencao.map((m) => statusItem(v, m))
      .sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.status] - { bad: 0, warn: 1, ok: 2 }[b.status]));
    const contagem = { ok: 0, warn: 0, bad: 0 };
    itens.forEach((i) => contagem[i.status]++);

    const total = itens.length || 1;
    let score = Math.round(100 * (contagem.ok + 0.65 * contagem.warn + 0.1 * contagem.bad) / total);
    if (contagem.bad) score = Math.min(score, 70); // com item vencido, nunca é "saúde plena"

    const geral = contagem.bad ? 'bad' : contagem.warn ? 'warn' : 'ok';
    return { itens, contagem, score, geral, cor: COR[geral], rotulo: contagem.bad ? 'CRÍTICO' : contagem.warn ? 'ATENÇÃO' : 'EM DIA' };
  }

  /* ── Documentos ─────────────────────────────────────────────────────── */

  function statusDoc(v, doc) {
    const r = { doc, tag: doc.tag, titulo: doc.titulo, sub: doc.sub || '', progresso: 0 };

    if (doc.tipo === 'parcelas') {
      const pagas = doc.parcelas.filter((p) => p.pago);
      const prox = doc.parcelas.find((p) => !p.pago);
      r.pago = pagas.reduce((s, p) => s + p.valor, 0);
      r.pendente = doc.parcelas.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0);
      r.progresso = (pagas.length / doc.parcelas.length) * 100;
      r.sub = `${pagas.length} de ${doc.parcelas.length} parcelas pagas`;
      r.valorTexto = prox ? brl(prox.valor) : 'quitado';
      r.venc = prox ? prox.venc : null;
      r.prazo = prox ? prazoTexto(prox.venc) : 'Quitado';
      r.status = prox ? statusPorPrazo(prox.venc) : 'ok';
      r.acao = prox ? `Pagar ${prox.n}ª parcela` : null;
    } else if (doc.tipo === 'km') {
      const falta = (doc.alvoKm || 0) - v.odometro;
      const item = v.manutencao.find((m) => m.id === 'revisao');
      const base = item && item.ultimoKm != null ? item.ultimoKm : (doc.alvoKm - 6000);
      r.pago = 0;
      r.pendente = doc.valor || 0;
      r.progresso = clamp(((v.odometro - base) / Math.max(1, doc.alvoKm - base)) * 100, 0, 100);
      r.valorTexto = doc.valor ? `~${brl0(doc.valor)}` : 'oficina';
      r.prazo = falta > 0 ? `Faltam ${num(falta)} km` : `Vencida há ${num(-falta)} km`;
      r.status = falta < 0 ? 'bad' : falta <= 2000 ? 'warn' : 'ok';
      r.sub = doc.agendada
        ? `Agendada ${fmtData(doc.agendada.data)}${doc.agendada.oficina ? ' · ' + doc.agendada.oficina : ''}`
        : (doc.sub || '');
      r.acao = 'Agendar oficina';
    } else if (doc.tipo === 'anual') {
      const ini = doc.inicio || toISO(addMonths(fromISO(doc.venc), -12));
      const total = Math.max(1, (fromISO(doc.venc) - fromISO(ini)) / DIA_MS);
      const decorrido = (fromISO(today()) - fromISO(ini)) / DIA_MS;
      r.pago = doc.pago ? doc.valor : 0;
      r.pendente = doc.pago ? 0 : doc.valor;
      r.progresso = clamp((decorrido / total) * 100, 0, 100);
      r.valorTexto = brl(doc.valor);
      r.venc = doc.venc;
      r.prazo = `Renova ${fmtDia(doc.venc)}`;
      r.status = statusPorPrazo(doc.venc, 30);
      // Já pago: só oferece renovar quando a data se aproxima.
      r.acao = doc.pago ? (r.status === 'ok' ? null : 'Renovar apólice') : 'Pagar apólice';
    } else {
      r.pago = doc.pago ? doc.valor : 0;
      r.pendente = doc.pago ? 0 : doc.valor;
      r.progresso = doc.pago ? 100 : 0;
      r.valorTexto = brl(doc.valor);
      r.venc = doc.venc;
      r.prazo = doc.pago ? 'Pago' : prazoTexto(doc.venc);
      r.status = doc.pago ? 'ok' : statusPorPrazo(doc.venc);
      r.acao = doc.pago ? null : `Pagar ${doc.tag.toLowerCase()}`;
    }

    r.cor = COR[r.status];
    return r;
  }

  function statusPorPrazo(venc, janela = 15) {
    const d = daysUntil(venc);
    if (d < 0) return 'bad';
    if (d <= janela) return 'warn';
    return 'ok';
  }

  function prazoTexto(venc) {
    const d = daysUntil(venc);
    if (d < 0) return `Vencido há ${-d} d`;
    if (d === 0) return 'Vence hoje';
    if (d === 1) return 'Vence amanhã';
    if (d <= 45) return `Vence em ${d} d`;
    return `Vence ${fmtDia(venc)}`;
  }

  const docsStatus = (v) => v.docs.map((d) => statusDoc(v, d));

  // Agenda unificada: documentos + manutenção vencendo, ordenada por urgência.
  function proximosVencimentos(v, limite = 4) {
    const itens = [];
    for (const s of docsStatus(v)) {
      if (s.venc && s.pendente > 0) {
        itens.push({ ordem: daysUntil(s.venc), venc: s.venc, titulo: `${s.tag} · ${s.acao ? s.acao.replace(/^Pagar /, '') : s.titulo}`, valor: s.valorTexto, cor: s.cor, tipo: 'doc', id: s.doc.id });
      } else if (s.doc.tipo === 'anual' && s.venc && daysUntil(s.venc) <= 60) {
        itens.push({ ordem: daysUntil(s.venc), venc: s.venc, titulo: `${s.tag} · renovação`, valor: s.valorTexto, cor: s.cor, tipo: 'doc', id: s.doc.id });
      } else if (s.doc.tipo === 'km' && s.status !== 'ok') {
        itens.push({ ordem: s.status === 'bad' ? -1 : 20, venc: null, titulo: `${s.tag} · ${s.prazo.toLowerCase()}`, valor: s.valorTexto, cor: s.cor, tipo: 'doc', id: s.doc.id });
      }
    }
    for (const m of diagnostico(v).itens) {
      if (m.status === 'bad') itens.push({ ordem: -2, venc: null, titulo: m.nome, valor: 'oficina', cor: m.cor, tipo: 'manut', id: m.id });
      else if (m.status === 'warn' && m.restanteKm != null && m.restanteKm <= 800) {
        itens.push({ ordem: 10, venc: null, titulo: m.nome, valor: `${num(m.restanteKm)} km`, cor: m.cor, tipo: 'manut', id: m.id });
      }
    }
    return itens.sort((a, b) => a.ordem - b.ordem).slice(0, limite);
  }

  function compromissosAnuais(v) {
    const st = docsStatus(v);
    return {
      total: st.reduce((s, d) => s + (d.pago || 0) + (d.pendente || 0), 0),
      pago: st.reduce((s, d) => s + (d.pago || 0), 0),
      pendente: st.reduce((s, d) => s + (d.pendente || 0), 0),
    };
  }

  /* ── Financiamento ──────────────────────────────────────────────────── */

  // Price: parcela fixa. SAC: amortização fixa, parcela decrescente.
  function financiamento({ valor, entrada, meses, taxa, sistema = 'price' }) {
    const pv = Math.max(0, parseNum(valor) - parseNum(entrada));
    const n = Math.max(1, Math.round(parseNum(meses)));
    const i = parseNum(taxa) / 100;

    if (pv === 0) return { pv, n, i, parcela: 0, primeira: 0, ultima: 0, total: 0, juros: 0, sistema };
    if (i === 0) {
      const p = pv / n;
      return { pv, n, i, parcela: p, primeira: p, ultima: p, total: pv, juros: 0, sistema };
    }
    if (sistema === 'sac') {
      const amort = pv / n;
      const primeira = amort + pv * i;
      const ultima = amort + amort * i;
      const juros = i * pv * (n + 1) / 2;
      return { pv, n, i, parcela: primeira, primeira, ultima, total: pv + juros, juros, sistema };
    }
    const parcela = pv * i / (1 - Math.pow(1 + i, -n));
    const total = parcela * n;
    return { pv, n, i, parcela, primeira: parcela, ultima: parcela, total, juros: total - pv, sistema };
  }

  /* ── Panorama para a home ───────────────────────────────────────────── */

  function panorama(v) {
    const mes = inicioDoMes();
    const cpk = custoPorKm(v, 30);
    return {
      odometro: v.odometro,
      kmMes: kmNoPeriodo(v, mes),
      gastoMes: gastoNoPeriodo(v, mes),
      custoKm: cpk,
      diag: diagnostico(v),
      consumo: consumoMedio(v),
    };
  }

  return {
    ordenados, noPeriodo, odometroEm, kmNoPeriodo, gastoNoPeriodo,
    inicioDoMes, diasAtras, consumoMedio, precoMedioLitro,
    custoPorKm, composicao, resumoMensal,
    statusItem, diagnostico, statusDoc, docsStatus, proximosVencimentos, compromissosAnuais,
    financiamento, panorama,
  };
})();
