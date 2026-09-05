/* ==========================================================================
   gemini.js — leitura de foto (nota, painel, bomba) pela API do Gemini.

   ONDE MORA A CHAVE
   Este app é estático e o repositório é público: chave no código seria chave
   vazada. Por isso a chave é digitada pela pessoa, dentro do app, e fica só no
   localStorage do aparelho — nunca é commitada e nunca entra no arquivo de
   exportação da garagem (que só carrega o estado do Store).

   QUANDO OUTRAS PESSOAS USAREM O APP
   Chave por usuário deixa de servir. A saída é um proxy: uma função serverless
   guarda a chave e o app chama a função. Só `endpoint()` e `cabecalhos()`
   mudam; o resto deste arquivo continua igual.
   ========================================================================== */
'use strict';

const Gemini = (() => {
  const KEY_CHAVE = 'autolog-gemini-chave';
  const KEY_MODELO = 'autolog-gemini-modelo';
  const MODELO_PADRAO = 'gemini-2.5-flash';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const gravar = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* modo privado */ } };

  const chave = () => ler(KEY_CHAVE);
  const modelo = () => ler(KEY_MODELO) || MODELO_PADRAO;
  const configurado = () => !!chave();
  const definirChave = (v) => gravar(KEY_CHAVE, (v || '').trim());
  const definirModelo = (v) => gravar(KEY_MODELO, (v || '').trim());
  const esquecer = () => { gravar(KEY_CHAVE, ''); gravar(KEY_MODELO, ''); };

  /**
   * Confere o formato antes de gastar uma chamada. Chave da API do Gemini
   * começa com "AIza" e tem ~39 caracteres. O AI Studio também oferece
   * "ephemeral tokens" (começam com "AQ."), que servem à Live API e não ao
   * generateContent — confundir os dois é fácil e o erro da API não explica.
   */
  function avisoDeFormato(valor) {
    const k = (valor == null ? chave() : String(valor)).trim();
    if (!k) return null;
    if (k.startsWith('AQ.')) {
      return 'Isso é um token temporário do AI Studio, não a chave da API. Em aistudio.google.com/apikey use "Criar chave de API" — ela começa com AIza.';
    }
    if (k.startsWith('ya29.') || k.startsWith('ey')) {
      return 'Isso parece um token OAuth, não uma chave de API. Gere a chave em aistudio.google.com/apikey.';
    }
    if (!/^AIza[\w-]{30,}$/.test(k)) {
      return 'Formato incomum: chaves do Gemini começam com AIza e têm cerca de 39 caracteres.';
    }
    return null;
  }

  const endpoint = () => `${BASE}/${modelo()}:generateContent`;
  const cabecalhos = () => ({ 'Content-Type': 'application/json', 'x-goog-api-key': chave() });

  /* ── Instruções por tipo de foto ────────────────────────────────────────
     Editáveis pela pessoa, em Perfil → Leitura por foto. O padrão fica aqui e
     pode ser restaurado a qualquer momento. Quem editar precisa manter o
     pedido de JSON e os nomes dos campos: é por eles que o app preenche o
     formulário. `campos` documenta esse contrato na tela de edição.
     ──────────────────────────────────────────────────────────────────────── */

  const REGRAS = `Você lê fotos de documentos de veículo no Brasil e devolve SOMENTE JSON válido.
Regras:
- Números em formato brasileiro na imagem (1.234,56) devem virar número JSON (1234.56).
- Datas no formato AAAA-MM-DD.
- Campo que você não conseguir ler com certeza: null. Nunca invente valor.
- Não escreva explicação fora do JSON.`;

  const PEDIDOS = {
    abastecimento: {
      titulo: 'Nota ou bomba de combustível',
      campos: 'data, litros, valor, precoLitro, local, combustivel, odometro, observacao',
      padrao: `${REGRAS}
A imagem é um cupom fiscal, nota ou display de bomba de combustível.
Devolva: {"data":..., "litros":..., "valor":..., "precoLitro":..., "local":..., "combustivel":..., "odometro":..., "observacao":...}
- valor = total pago em reais.
- litros = volume abastecido.
- precoLitro = preço por litro.
- local = nome do posto, se aparecer.
- combustivel = um de: Gasolina, Etanol, Diesel, GNV, ou null.
- odometro = quilometragem, só se estiver escrita na imagem.
- observacao = frase curta sobre o que ficou ilegível, ou null.`,
    },
    odometro: {
      titulo: 'Painel do veículo',
      campos: 'km, observacao',
      padrao: `${REGRAS}
A imagem é o painel de um carro ou moto.
Devolva: {"km":..., "observacao":...}
- km = leitura do hodômetro total (não o parcial/trip), só os dígitos.
- Se houver hodômetro total e parcial, use o TOTAL, que costuma ser o maior número.
- observacao = frase curta se houver dúvida entre total e parcial, ou null.`,
    },
    lancamento: {
      titulo: 'Nota de serviço ou peça',
      campos: 'data, valor, titulo, local, categoria, odometro, observacao',
      padrao: `${REGRAS}
A imagem é uma nota, cupom ou orçamento de serviço ou peça de veículo.
Devolva: {"data":..., "valor":..., "titulo":..., "local":..., "categoria":..., "odometro":..., "observacao":...}
- valor = total pago em reais.
- titulo = descrição curta do serviço ou peça (ex.: "Troca de óleo").
- local = nome da oficina ou loja.
- categoria = um de: manutencao, pneus, transmissao, documentacao, seguro, combustivel, outros.
- odometro = quilometragem, só se estiver escrita na imagem.
- observacao = frase curta sobre o que ficou ilegível, ou null.`,
    },
  };

  const TIPOS_LEITURA = Object.keys(PEDIDOS).map((id) => ({
    id, titulo: PEDIDOS[id].titulo, campos: PEDIDOS[id].campos,
  }));

  const chavePrompt = (tipo) => `autolog-gemini-prompt-${tipo}`;
  const promptPadrao = (tipo) => (PEDIDOS[tipo] ? PEDIDOS[tipo].padrao : '');
  const prompt = (tipo) => ler(chavePrompt(tipo)) || promptPadrao(tipo);
  const promptEditado = (tipo) => !!ler(chavePrompt(tipo));
  const definirPrompt = (tipo, texto) => {
    const limpo = (texto || '').trim();
    // Igual ao padrão não vira override: evita congelar melhorias futuras.
    gravar(chavePrompt(tipo), !limpo || limpo === promptPadrao(tipo).trim() ? '' : limpo);
  };
  const restaurarPrompt = (tipo) => gravar(chavePrompt(tipo), '');

  /* ── Chamada ────────────────────────────────────────────────────────── */

  function erroLegivel(status, corpo) {
    const msg = (corpo && corpo.error && corpo.error.message) || '';
    if (status === 400 && /API key not valid/i.test(msg)) {
      return avisoDeFormato() || 'Chave inválida. Confira em Perfil.';
    }
    if (status === 400) return `Requisição recusada: ${msg.slice(0, 120)}`;
    if (status === 403) return 'Chave sem permissão para este modelo.';
    if (status === 404) return `Modelo "${modelo()}" não encontrado. Troque em Perfil.`;
    if (status === 429) return 'Limite de uso atingido. Tente daqui a pouco.';
    if (status >= 500) return 'O Gemini está fora do ar agora.';
    return msg ? msg.slice(0, 140) : `Erro ${status}.`;
  }

  // O modelo às vezes embrulha o JSON em cerca de markdown.
  function extrairJSON(texto) {
    if (!texto) return null;
    const limpo = texto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(limpo); } catch (e) { /* tenta achar o objeto */ }
    const i = limpo.indexOf('{'), f = limpo.lastIndexOf('}');
    if (i === -1 || f <= i) return null;
    try { return JSON.parse(limpo.slice(i, f + 1)); } catch (e) { return null; }
  }

  /**
   * Envia a foto e devolve os campos lidos.
   * @param {string} dataUrl imagem em data URL (a mesma que UI.pedirFoto produz)
   * @param {'abastecimento'|'odometro'|'lancamento'} tipo
   * @returns {Promise<object>} objeto com os campos, ou lança Error com mensagem pronta
   */
  async function lerFoto(dataUrl, tipo) {
    if (!configurado()) throw new Error('Nenhuma chave do Gemini configurada. Veja em Perfil.');
    const aviso = avisoDeFormato();
    if (aviso) throw new Error(aviso);
    if (!PEDIDOS[tipo]) throw new Error('Tipo de leitura desconhecido.');
    const instrucao = prompt(tipo);

    const virgula = dataUrl.indexOf(',');
    const mime = (dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg');
    const base64 = dataUrl.slice(virgula + 1);

    let resp;
    try {
      resp = await fetch(endpoint(), {
        method: 'POST',
        headers: cabecalhos(),
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: instrucao },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      });
    } catch (e) {
      throw new Error('Sem conexão com o Gemini.');
    }

    let corpo = null;
    try { corpo = await resp.json(); } catch (e) { /* resposta não-JSON */ }
    if (!resp.ok) throw new Error(erroLegivel(resp.status, corpo));

    if (corpo && corpo.promptFeedback && corpo.promptFeedback.blockReason) {
      throw new Error('O Gemini recusou a imagem.');
    }

    const texto = corpo && corpo.candidates && corpo.candidates[0]
      && corpo.candidates[0].content && corpo.candidates[0].content.parts
      && corpo.candidates[0].content.parts[0] && corpo.candidates[0].content.parts[0].text;

    const dados = extrairJSON(texto);
    if (!dados) {
      throw new Error(promptEditado(tipo)
        ? 'A resposta não veio em JSON. Confira a instrução ou restaure o padrão.'
        : 'Não consegui entender a resposta do Gemini.');
    }
    return dados;
  }

  // Chamada mínima só para validar chave e modelo, sem imagem.
  async function testar() {
    if (!configurado()) throw new Error('Digite a chave primeiro.');
    const aviso = avisoDeFormato();
    if (aviso) throw new Error(aviso);
    let resp;
    try {
      resp = await fetch(endpoint(), {
        method: 'POST',
        headers: cabecalhos(),
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Responda apenas: ok' }] }] }),
      });
    } catch (e) { throw new Error('Sem conexão com o Gemini.'); }
    let corpo = null;
    try { corpo = await resp.json(); } catch (e) { /* ignora */ }
    if (!resp.ok) throw new Error(erroLegivel(resp.status, corpo));
    return true;
  }

  return {
    configurado, chave, modelo, definirChave, definirModelo, esquecer, avisoDeFormato,
    lerFoto, testar, MODELO_PADRAO,
    TIPOS_LEITURA, prompt, promptPadrao, promptEditado, definirPrompt, restaurarPrompt,
  };
})();
