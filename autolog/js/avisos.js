/* ==========================================================================
   avisos.js — lembrar o usuário antes do vencimento.

   O LIMITE, DITO DE FRENTE
   Um site estático não consegue acordar o celular sozinho. Notificação
   agendada de verdade, com o app fechado, exige um servidor mandando push —
   que este app não tem. Então há dois caminhos, e os dois são oferecidos:

   1. Aviso ao abrir o app: confiável, mas só aparece quando você abre.
   2. Exportar para o calendário (.ics): o alarme fica no celular, dispara com
      o app fechado. É o único jeito de ser avisado sem depender de abrir.

   O segundo é o que resolve de verdade; o primeiro é o complemento.
   ========================================================================== */
'use strict';

const Avisos = (() => {
  const KEY_CFG = 'autolog-avisos';
  const KEY_VISTOS = 'autolog-avisos-vistos';

  const ler = (k, padrao) => {
    try { return JSON.parse(localStorage.getItem(k)) || padrao; }
    catch (e) { return padrao; }
  };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ } };

  const config = () => Object.assign({ ativo: false, dias: 7 }, ler(KEY_CFG, {}));
  const definirConfig = (patch) => gravar(KEY_CFG, Object.assign(config(), patch));

  const suportado = () => typeof Notification !== 'undefined';
  const permissao = () => (suportado() ? Notification.permission : 'unsupported');

  async function pedirPermissao() {
    if (!suportado()) throw new Error('Este navegador não faz notificação.');
    const r = await Notification.requestPermission();
    if (r !== 'granted') throw new Error('Permissão negada nas configurações do navegador.');
    return true;
  }

  /* ── O que está por vencer ──────────────────────────────────────────── */

  // Próxima ocorrência de um dia fixo do mês (parcela de financiamento).
  function proximoDiaDoMes(dia) {
    const hoje = new Date();
    let d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    if (d < hoje) d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
    return toISO(d);
  }

  /** Compromissos com data, de todos os veículos, dentro da janela. */
  function proximos(dias) {
    const janela = dias != null ? dias : config().dias;
    const itens = [];

    for (const v of Store.veiculos()) {
      const nome = v.apelido || v.modelo;

      for (const doc of v.docs) {
        if (doc.tipo === 'parcelas') {
          const p = doc.parcelas.find((x) => !x.pago);
          if (p) itens.push({ id: `${v.id}:ipva:${p.n}`, data: p.venc, titulo: `${doc.tag} · ${p.n}ª parcela`, sub: nome, valor: p.valor });
        } else if (doc.tipo === 'unico' && !doc.pago && doc.venc) {
          itens.push({ id: `${v.id}:${doc.id}`, data: doc.venc, titulo: doc.titulo, sub: nome, valor: doc.valor });
        } else if (doc.tipo === 'seguro' && doc.venc) {
          itens.push({ id: `${v.id}:seguro:${doc.venc}`, data: doc.venc, titulo: 'Seguro · fim da cobertura', sub: `${nome} · ${doc.titulo}`, valor: 0 });
        }
      }

      // Parcela do seguro: mesma lógica da do financiamento — dia fixo do mês.
      const seg = v.docs.find((doc) => doc.id === 'seguro');
      const pagSeg = seg && seg.pagamento;
      if (pagSeg && pagSeg.quitado === false && pagSeg.restantes > 0) {
        const data = proximoDiaDoMes(pagSeg.dia || 10);
        itens.push({
          id: `${v.id}:seguro-parcela:${data}`, data,
          titulo: 'Parcela do seguro',
          sub: `${nome}${pagSeg.restantes ? ` · ${pagSeg.restantes} restantes` : ''}`,
          valor: pagSeg.parcela,
        });
      }

      const fin = v.financiamento;
      if (fin && !fin.quitado && fin.parcela > 0) {
        const data = proximoDiaDoMes(fin.dia || 10);
        itens.push({ id: `${v.id}:financiamento:${data}`, data, titulo: 'Parcela do financiamento', sub: nome, valor: fin.parcela });
      }
    }

    return itens
      .map((i) => Object.assign(i, { faltam: daysUntil(i.data) }))
      .filter((i) => i.faltam >= 0 && i.faltam <= janela)
      .sort((a, b) => a.faltam - b.faltam);
  }

  /* ── Aviso ao abrir o app ───────────────────────────────────────────── */

  /** Notifica o que ainda não foi avisado. Cada item avisa uma vez só. */
  function notificarPendentes() {
    const cfg = config();
    if (!cfg.ativo || permissao() !== 'granted') return 0;

    const vistos = ler(KEY_VISTOS, {});
    const hoje = today();
    // Limpa marcações de datas que já passaram, para não crescer sem fim.
    for (const k of Object.keys(vistos)) if (vistos[k] < hoje) delete vistos[k];

    const pendentes = proximos(cfg.dias).filter((i) => !vistos[i.id]);
    for (const i of pendentes) {
      const quando = i.faltam === 0 ? 'vence hoje'
        : i.faltam === 1 ? 'vence amanhã'
          : `vence em ${i.faltam} dias`;
      try {
        new Notification(`${i.titulo} ${quando}`, {
          body: `${i.sub}${i.valor ? ' · ' + brl(i.valor) : ''}`,
          icon: 'icones/icone-192.png',
          badge: 'icones/icone-192.png',
          tag: i.id,
        });
        vistos[i.id] = i.data;
      } catch (e) { /* navegador pode recusar fora de gesto do usuário */ }
    }
    gravar(KEY_VISTOS, vistos);
    return pendentes.length;
  }

  /* ── Calendário (.ics) — funciona com o app fechado ─────────────────── */

  const escapar = (t) => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const semTraco = (iso) => String(iso).replace(/-/g, '');

  /**
   * Evento de dia inteiro com alarme N dias antes. O alarme fica no
   * calendário do celular, então dispara mesmo com o app fechado.
   */
  function gerarICS(itens, diasAntes) {
    const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const linhas = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Autolog//PT-BR//', 'CALSCALE:GREGORIAN',
    ];
    itens.forEach((i, n) => {
      const fim = semTraco(toISO(addDays(fromISO(i.data), 1)));
      linhas.push(
        'BEGIN:VEVENT',
        `UID:${semTraco(i.data)}-${n}-autolog@brennoc-bit.github.io`,
        `DTSTAMP:${agora}`,
        `DTSTART;VALUE=DATE:${semTraco(i.data)}`,
        `DTEND;VALUE=DATE:${fim}`,
        `SUMMARY:${escapar(`${i.titulo} — ${i.sub}`)}`,
        `DESCRIPTION:${escapar(i.valor ? `Valor previsto: ${brl(i.valor)}` : 'Registrado no Autolog')}`,
        'BEGIN:VALARM',
        `TRIGGER:-P${Math.max(0, Math.round(diasAntes))}D`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapar(i.titulo)}`,
        'END:VALARM',
        'END:VEVENT');
    });
    linhas.push('END:VCALENDAR');
    return linhas.join('\r\n');
  }

  /** Todos os compromissos dos próximos 12 meses, não só os da janela. */
  function paraCalendario() {
    const cfg = config();
    const itens = proximos(365);
    if (!itens.length) return 0;
    const blob = new Blob([gerarICS(itens, cfg.dias)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `autolog-vencimentos-${today()}.ics` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return itens.length;
  }

  return {
    config, definirConfig, suportado, permissao, pedirPermissao,
    proximos, notificarPendentes, paraCalendario, gerarICS,
  };
})();
