/* ==========================================================================
   ui.js — peças visuais reutilizáveis (as mesmas do canvas de design) +
   folha de formulário, toast e seletor de foto.
   ========================================================================== */
'use strict';

const UI = (() => {
  /* ── Peças ──────────────────────────────────────────────────────────── */

  const dot = (cor, tam) => h('span', { class: 'dot', style: tam ? { background: cor, width: tam, height: tam } : { background: cor } });

  const mono = (txt, style) => h('div', { class: 'mono', style: Object.assign({ fontSize: 11 }, style || {}) }, txt);

  function kv({ k, v, sub, cor, onClick }) {
    const conteudo = [
      h('div', { class: 'k' }, k),
      h('div', { class: 'v', style: cor ? { color: cor } : null }, v),
      sub ? h('div', { class: 'sub' }, sub) : null,
    ];
    return onClick
      ? h('button', { class: 'kv', onClick }, conteudo)
      : h('div', { class: 'kv' }, conteudo);
  }

  const row = (...filhos) => h('div', { class: 'row' }, filhos);

  function sectHd(titulo, acao, onAcao) {
    return h('div', { class: 'sect-hd' },
      h('span', null, titulo),
      acao ? h('button', { class: 'act', onClick: onAcao }, acao) : null);
  }

  function seg(opcoes, ativo, onPick) {
    return h('div', { class: 'segrow' },
      opcoes.map((o) => h('button', {
        class: o.id === ativo ? 'on' : '',
        onClick: () => onPick(o.id),
      }, o.label)));
  }

  function meter(percentual, cor) {
    return h('div', { class: 'meter' }, h('i', { style: { width: pct(percentual) + '%', background: cor } }));
  }

  function cta(botoes) {
    return h('div', { class: 'cta-strip' },
      botoes.map((b) => h('button', { class: b.pri ? 'pri' : '', onClick: b.onClick },
        h('span', null, b.label), h('span', null, b.icone || '→'))));
  }

  const vazio = (msg) => h('div', { class: 'empty' }, msg);

  // Gráfico de barras simples (uma série).
  function barras(dados, formatar) {
    const max = Math.max(1, ...dados.map((d) => d.valor));
    return h('div', { class: 'barchart' },
      dados.map((d) => h('div', {
        class: 'bar' + (d.on ? ' on' : ''),
        style: { height: Math.max(3, (d.valor / max) * 100) + '%' },
        title: formatar ? formatar(d) : String(d.valor),
      }, h('div', { class: 'lbl' }, d.label))));
  }

  /* ── Botão flutuante ────────────────────────────────────────────────── */

  // Bomba de combustível desenhada em SVG: sem dependência de fonte de ícones.
  const SVG_BOMBA = `
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
         stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/>
      <path d="M3 21h12"/>
      <path d="M4 10h10"/>
      <path d="M14 7h2.5L19 9.5V17a1.75 1.75 0 0 0 3 0v-6"/>
    </svg>`;

  const fab = (onClick, rotulo) => h('button', {
    class: 'fab', onClick, 'aria-label': rotulo, title: rotulo,
  }, h('span', { class: 'fab-ic', html: SVG_BOMBA }));

  /* ── Toast ──────────────────────────────────────────────────────────── */

  let toastTimer = null;
  function toast(msg) {
    const host = $('#toast-host');
    clear(host);
    host.append(h('div', { class: 'toast' }, msg));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => clear(host), 2600);
  }

  /* ── Campos de formulário ───────────────────────────────────────────── */

  /**
   * Monta um campo rotulado. Serve à folha e à tela de cadastro — mesma
   * aparência, mesma leitura de valor.
   * def: { name, label, tipo, valor, placeholder, opcoes, obrigatorio, hint }
   * tipo: text | number | dinheiro | date | select | textarea
   */
  function campo(def) {
    const id = 'f-' + def.name;
    const caixa = h('div', { class: 'campo' }, h('label', { for: id }, def.label));

    let input;
    if (def.tipo === 'select') {
      input = h('select', { id },
        (def.opcoes || []).map((o) => h('option', {
          value: o.value, selected: String(o.value) === String(def.valor),
        }, o.label)));
    } else if (def.tipo === 'textarea') {
      input = h('textarea', { id, rows: 3, placeholder: def.placeholder || '' }, def.valor || '');
    } else {
      // Números ficam em campo de texto: "9,5" é o que o teclado pt-BR
      // entrega, e input[type=number] descarta a vírgula. parseNum resolve.
      input = h('input', {
        id,
        type: def.tipo === 'date' ? 'date' : 'text',
        inputmode: def.tipo === 'dinheiro' || def.tipo === 'number' ? 'decimal' : null,
        autocapitalize: def.maiusculas ? 'characters' : null,
        placeholder: def.placeholder || '',
        value: def.valor != null ? def.valor : '',
      });
      if (def.maiusculas) {
        input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
      }
    }

    caixa.append(input);
    if (def.hint) caixa.append(h('div', { class: 'hint' }, def.hint));
    return { caixa, input, def };
  }

  const valorDoCampo = (ref) => {
    const bruto = ref.input.value.trim();
    return (ref.def.tipo === 'dinheiro' || ref.def.tipo === 'number') ? parseNum(bruto) : bruto;
  };

  /* ── Folha de formulário ────────────────────────────────────────────── */

  function fecharSheet() {
    const s = $('.sheet-backdrop');
    if (s) s.remove();
  }

  /**
   * campos: [{ name, label, tipo, valor, placeholder, opcoes, obrigatorio, hint, meio }]
   * tipo: text | number | dinheiro | date | select | textarea
   * meio: true → ocupa metade da linha (pareado com o campo seguinte marcado igual)
   */
  function sheet({ titulo, sub, campos = [], acao = 'Salvar', destrutivo, texto, onSubmit }) {
    fecharSheet();
    const corpo = h('div', { class: 'sheet' });
    corpo.append(h('h3', null, titulo));
    if (sub) corpo.append(h('div', { class: 'sheet-sub' }, sub));
    if (texto) corpo.append(h('p', { style: { fontSize: 14, marginTop: -8 } }, texto));

    const refs = {};
    let par = null;
    for (const c of campos) {
      const ref = campo(c);
      refs[c.name] = ref;

      if (c.meio) {
        if (!par) { par = h('div', { class: 'grid2' }); corpo.append(par); }
        par.append(ref.caixa);
        if (par.children.length === 2) par = null;
      } else { par = null; corpo.append(ref.caixa); }
    }

    const erro = h('div', { class: 'hint', style: { color: 'var(--color-accent)', display: 'none' } }, 'Preencha os campos destacados.');
    corpo.append(erro);

    const confirmar = h('button', { class: destrutivo ? '' : 'pri', style: destrutivo ? { background: 'var(--color-accent)', color: 'var(--color-bg)', borderColor: 'var(--color-accent)' } : null }, acao);
    corpo.append(h('div', { class: 'sheet-actions' },
      h('button', { onClick: fecharSheet }, 'Cancelar'), confirmar));

    confirmar.addEventListener('click', () => {
      const vals = {};
      let invalido = false;
      for (const [nome, r] of Object.entries(refs)) {
        if (r.def.obrigatorio && !r.input.value.trim()) { r.caixa.classList.add('err'); invalido = true; }
        else r.caixa.classList.remove('err');
        vals[nome] = valorDoCampo(r);
      }
      if (invalido) { erro.style.display = 'block'; return; }
      fecharSheet();
      if (onSubmit) onSubmit(vals);
    });

    const backdrop = h('div', {
      class: 'sheet-backdrop',
      onClick: (ev) => { if (ev.target === backdrop) fecharSheet(); },
    }, corpo);
    $('#app').append(backdrop);

    const primeiro = corpo.querySelector('input, select, textarea');
    if (primeiro && primeiro.type !== 'date') setTimeout(() => primeiro.focus(), 60);
    return backdrop;
  }

  const confirmar = ({ titulo, texto, acao = 'Confirmar', onOk }) =>
    sheet({ titulo, texto, acao, destrutivo: true, onSubmit: onOk });

  /* ── Foto do veículo ────────────────────────────────────────────────── */

  // Redimensiona no cliente: localStorage não aguenta a foto original.
  function pedirFoto(onPronto) {
    const input = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const larguraMax = 900;
          const escala = Math.min(1, larguraMax / img.width);
          const cv = h('canvas');
          cv.width = Math.round(img.width * escala);
          cv.height = Math.round(img.height * escala);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          onPronto(cv.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => toast('Não foi possível ler a imagem');
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  }

  function foto(v, { grande = true, onTrocar } = {}) {
    // Foto sai colorida: o veículo é do dono, não peça de catálogo.
    const conteudo = v.foto
      ? h('img', { src: v.foto, alt: `${v.marca} ${v.modelo}` })
      : h('div', { class: 'placeholder-img' }, `foto · ${v.apelido || v.modelo} · ${v.ano}`);
    return h('div', { class: 'hero' + (grande ? '' : ' sm') },
      conteudo,
      onTrocar ? h('button', { class: 'photo-btn', onClick: onTrocar }, v.foto ? 'trocar foto' : '+ foto') : null);
  }

  return {
    dot, mono, kv, row, sectHd, seg, meter, cta, vazio, barras, fab,
    campo, valorDoCampo, toast, sheet, fecharSheet, confirmar, pedirFoto, foto,
  };
})();
