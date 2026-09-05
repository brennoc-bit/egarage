/* ==========================================================================
   foto.js — escolher e AJUSTAR a foto do veículo antes de salvar.

   Antes a imagem era redimensionada e aceita como veio: quem fotografa de
   perto ou na diagonal ficava com a moto cortada e sem recurso. Aqui a pessoa
   arrasta, aproxima e enquadra dentro da mesma moldura em que a foto vai
   aparecer no app — o que se vê é o que fica.

   O recorte é feito com transform de CSS enquanto se ajusta (resposta
   imediata) e só vira canvas no momento de confirmar.
   ========================================================================== */
'use strict';

const Foto = (() => {
  const PROPORCAO = 16 / 9;   // a mesma da moldura .hero e .foto-slot
  const LARGURA_SAIDA = 1100; // px; ~90 KB em JPEG 0.78
  const QUALIDADE = 0.78;
  const ZOOM_MAX = 4;

  /** Abre o seletor de arquivo e, com a imagem em mãos, chama o editor. */
  function escolherEAjustar(onPronto, { origem } = {}) {
    const input = h('input', {
      type: 'file', accept: 'image/*', style: { display: 'none' },
      capture: origem === 'camera' ? 'environment' : null,
    });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => editar(fr.result, onPronto);
      fr.onerror = () => UI.toast('Não foi possível ler o arquivo');
      fr.readAsDataURL(file);
    });
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  }

  /** Editor: arrastar para mover, pinçar ou usar a barra para aproximar. */
  function editar(dataUrl, onPronto) {
    const img = new Image();
    img.onerror = () => UI.toast('Imagem inválida');
    img.onload = () => montar(img, onPronto);
    img.src = dataUrl;
  }

  function montar(img, onPronto) {
    let zoom = 1, tx = 0, ty = 0;   // deslocamento a partir do centro
    let base = 1, quadroW = 0, quadroH = 0;

    const foto = h('img', { src: img.src, alt: '', class: 'ajuste-img', draggable: 'false' });
    const quadro = h('div', { class: 'ajuste-quadro' }, foto);

    const faixa = h('input', {
      type: 'range', min: 100, max: ZOOM_MAX * 100, value: 100, class: 'ajuste-zoom',
    });

    // Recalcula a escala que faz a imagem cobrir a moldura inteira.
    function medir() {
      const r = quadro.getBoundingClientRect();
      quadroW = r.width; quadroH = r.height;
      base = Math.max(quadroW / img.naturalWidth, quadroH / img.naturalHeight);
      aplicar();
    }

    function limites() {
      const s = base * zoom;
      return {
        x: Math.max(0, (img.naturalWidth * s - quadroW) / 2),
        y: Math.max(0, (img.naturalHeight * s - quadroH) / 2),
      };
    }

    function aplicar() {
      const lim = limites();
      tx = clamp(tx, -lim.x, lim.x);
      ty = clamp(ty, -lim.y, lim.y);
      const s = base * zoom;
      foto.style.width = img.naturalWidth * s + 'px';
      foto.style.height = img.naturalHeight * s + 'px';
      foto.style.transform = `translate(-50%,-50%) translate(${tx}px, ${ty}px)`;
    }

    /* — arrastar — */
    let arrastando = false, px = 0, py = 0;
    quadro.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch' && ev.isPrimary === false) return;
      arrastando = true; px = ev.clientX; py = ev.clientY;
      quadro.setPointerCapture(ev.pointerId);
    });
    quadro.addEventListener('pointermove', (ev) => {
      if (!arrastando || pincando) return;
      tx += ev.clientX - px; ty += ev.clientY - py;
      px = ev.clientX; py = ev.clientY;
      aplicar();
    });
    const soltar = () => { arrastando = false; };
    quadro.addEventListener('pointerup', soltar);
    quadro.addEventListener('pointercancel', soltar);

    /* — pinçar — */
    let pincando = false, distInicial = 0, zoomInicial = 1;
    const distancia = (t) => Math.hypot(
      t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    quadro.addEventListener('touchstart', (ev) => {
      if (ev.touches.length !== 2) return;
      pincando = true; arrastando = false;
      distInicial = distancia(ev.touches); zoomInicial = zoom;
    }, { passive: true });
    quadro.addEventListener('touchmove', (ev) => {
      if (!pincando || ev.touches.length !== 2) return;
      ev.preventDefault();
      zoom = clamp(zoomInicial * (distancia(ev.touches) / distInicial), 1, ZOOM_MAX);
      faixa.value = Math.round(zoom * 100);
      aplicar();
    }, { passive: false });
    quadro.addEventListener('touchend', () => { pincando = false; }, { passive: true });

    faixa.addEventListener('input', () => {
      zoom = clamp(Number(faixa.value) / 100, 1, ZOOM_MAX);
      aplicar();
    });

    /* — confirmar: converte o que está visível em imagem — */
    function recortar() {
      const s = base * zoom;
      const larguraFonte = quadroW / s;
      const alturaFonte = quadroH / s;
      const sx = (img.naturalWidth * s - quadroW) / 2 - tx;
      const sy = (img.naturalHeight * s - quadroH) / 2 - ty;

      const cv = h('canvas');
      cv.width = LARGURA_SAIDA;
      cv.height = Math.round(LARGURA_SAIDA / PROPORCAO);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, sx / s, sy / s, larguraFonte, alturaFonte, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', QUALIDADE);
    }

    const fechar = () => { window.removeEventListener('resize', medir); overlay.remove(); };

    const overlay = h('div', { class: 'ajuste-fundo' },
      h('div', { class: 'ajuste-painel' },
        h('div', { class: 'ajuste-titulo' }, 'Enquadre a foto'),
        h('div', { class: 'ajuste-dica' }, 'Arraste para mover · pince ou use a barra para aproximar'),
        quadro,
        h('div', { class: 'ajuste-zoom-linha' },
          h('span', { class: 'mono' }, '−'), faixa, h('span', { class: 'mono' }, '+')),
        h('div', { class: 'ajuste-acoes' },
          h('button', { onClick: fechar }, 'Cancelar'),
          h('button', {
            class: 'pri',
            onClick: () => { const url = recortar(); fechar(); onPronto(url); },
          }, 'Usar foto'))));

    $('#app').append(overlay);
    // A moldura só tem tamanho depois de entrar no documento.
    requestAnimationFrame(medir);
    window.addEventListener('resize', medir);
  }

  return { escolherEAjustar, editar, PROPORCAO };
})();
