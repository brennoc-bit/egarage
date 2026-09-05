/* ==========================================================================
   dados.js — catálogo de marcas e modelos para o autocompletar.

   O arquivo `dados/veiculos.json` é estático, gerado por
   `ferramentas/gerar-veiculos.py` a partir da tabela FIPE. Fica embarcado no
   app de propósito: sugestão a cada tecla com ida e volta de rede seria lenta,
   quebraria o uso offline e dependeria de um serviço de terceiro estar no ar.

   Envelhece: modelo novo de 2027 não vai estar aqui. Por isso o campo NUNCA
   restringe — a sugestão ajuda, mas o que a pessoa digitar sempre vale.
   ========================================================================== */
'use strict';

const Dados = (() => {
  let catalogo = null;
  let tentou = false;

  async function carregar() {
    if (catalogo || tentou) return catalogo;
    tentou = true;
    try {
      const r = await fetch('dados/veiculos.json');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      catalogo = await r.json();
    } catch (e) {
      console.warn('Catálogo de veículos indisponível; os campos seguem livres.', e);
      catalogo = null;
    }
    return catalogo;
  }

  const pronto = () => !!catalogo;

  const doTipo = (tipo) => (catalogo && catalogo[tipo]) || {};

  const marcas = (tipo) => Object.keys(doTipo(tipo))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // A marca digitada pode diferir na caixa ou no acento do que está no catálogo.
  function chaveDaMarca(tipo, marca) {
    if (!marca) return null;
    const alvo = normalizar(marca);
    return Object.keys(doTipo(tipo)).find((m) => normalizar(m) === alvo) || null;
  }

  function modelos(tipo, marca) {
    const chave = chaveDaMarca(tipo, marca);
    return chave ? doTipo(tipo)[chave].slice() : [];
  }

  /** Procura o modelo em todas as marcas — para quem sabe o modelo, não a marca. */
  function buscarModelo(tipo, termo, limite = 30) {
    const alvo = normalizar(termo);
    if (alvo.length < 2) return [];
    const achados = [];
    const tabela = doTipo(tipo);
    for (const marca of Object.keys(tabela)) {
      for (const modelo of tabela[marca]) {
        const n = normalizar(modelo);
        if (n.startsWith(alvo)) achados.push({ modelo, marca, peso: 0 });
        else if (n.includes(alvo)) achados.push({ modelo, marca, peso: 1 });
        if (achados.length > 400) break;
      }
    }
    achados.sort((a, b) => a.peso - b.peso || a.modelo.localeCompare(b.modelo, 'pt-BR'));
    return achados.slice(0, limite);
  }

  return { carregar, pronto, marcas, modelos, buscarModelo, chaveDaMarca };
})();
