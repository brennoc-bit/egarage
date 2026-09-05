/* ==========================================================================
   gemini.js — leitura de foto (nota, painel, bomba) pela API do Gemini.

   ONDE MORA A CHAVE
   Este app é estático e o repositório é público: chave no código seria chave
   vazada. Por isso a chave é digitada pela pessoa, dentro do app, e fica só no
   localStorage do aparelho — nunca é commitada e nunca entra no arquivo de
   exportação da garagem (que só carrega o estado do Store).

   QUANDO OUTRAS PESSOAS USAREM O APP
   Chave por usuário deixa de servir. A saída é um proxy: uma função serverless
   guarda a chave e o app chama a função. Só `endpoint()` e `CABECALHOS`
   mudam; o resto deste arquivo continua igual.
   ========================================================================== */
'use strict';

const Gemini = (() => {
  const KEY_CHAVE = 'autolog-gemini-chave';
  const KEY_MODELO = 'autolog-gemini-modelo';
  const KEY_VERSAO = 'autolog-gemini-versao';
  const MODELO_PADRAO = 'gemini-2.5-flash';
  const VERSAO_PADRAO = 'v1beta';
  const VERSOES = ['v1beta', 'v1'];
  const HOST = 'https://generativelanguage.googleapis.com';

  const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const gravar = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* modo privado */ } };

  const chave = () => ler(KEY_CHAVE);
  const modelo = () => ler(KEY_MODELO) || MODELO_PADRAO;
  const versao = () => ler(KEY_VERSAO) || VERSAO_PADRAO;
  const configurado = () => !!chave();
  const definirChave = (v) => gravar(KEY_CHAVE, (v || '').trim());
  const definirModelo = (v, ver) => {
    gravar(KEY_MODELO, (v || '').trim().replace(/^models\//, ''));
    if (ver) gravar(KEY_VERSAO, ver);
  };
  const esquecer = () => { gravar(KEY_CHAVE, ''); gravar(KEY_MODELO, ''); gravar(KEY_VERSAO, ''); };

  const endpoint = () => `${HOST}/${versao()}/models/${modelo()}:generateContent`;

  /* Duas formas de autenticar. O Google está migrando as chaves do AI Studio
     do formato antigo (AIza…, "traffic key") para o novo (AQ.…, "auth key"), e
     há relatos de o novo ser recusado em `x-goog-api-key` com
     ACCESS_TOKEN_TYPE_UNSUPPORTED. Tentamos o cabeçalho documentado e, se a
     recusa for de tipo de credencial, repetimos como Bearer antes de desistir.
     Nada de adivinhar pelo prefixo: o formato mudou uma vez e pode mudar de
     novo — quem decide é a API. */
  const CABECALHOS = [
    (k) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': k }),
    (k) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }),
  ];

  const recusaDeCredencial = (status, corpo) => {
    const msg = (corpo && corpo.error && corpo.error.message) || '';
    const st = (corpo && corpo.error && corpo.error.status) || '';
    return (status === 400 || status === 401 || status === 403)
      && /API key not valid|ACCESS_TOKEN_TYPE_UNSUPPORTED|invalid authentication|UNAUTHENTICATED/i.test(msg + ' ' + st);
  };

  let ultimoErro = null;
  const detalheDoErro = () => ultimoErro;

  /** Envia o corpo, tentando as duas formas de autenticação. */
  async function chamar(payload) {
    let ultimo = null;
    for (let i = 0; i < CABECALHOS.length; i++) {
      let resp;
      try {
        resp = await fetch(endpoint(), {
          method: 'POST', headers: CABECALHOS[i](chave()), body: JSON.stringify(payload),
        });
      } catch (e) {
        ultimoErro = 'Falha de rede ao chamar ' + endpoint();
        throw new Error('Sem conexão com o Gemini.');
      }
      let corpo = null;
      try { corpo = await resp.json(); } catch (e) { /* resposta não-JSON */ }
      if (resp.ok) { ultimoErro = null; return corpo; }
      ultimo = { status: resp.status, corpo, modo: i === 0 ? 'x-goog-api-key' : 'Bearer' };
      if (!recusaDeCredencial(resp.status, corpo)) break; // erro de outra natureza
    }
    const msg = (ultimo.corpo && ultimo.corpo.error && ultimo.corpo.error.message) || '(sem mensagem)';
    ultimoErro = `HTTP ${ultimo.status} · ${ultimo.modo} · ${versao()}/${modelo()}
${msg}`;
    throw new Error(erroLegivel(ultimo.status, ultimo.corpo));
  }

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
    if (/ACCESS_TOKEN_TYPE_UNSUPPORTED/i.test(msg)) {
      return 'A API recusou o tipo desta credencial. Veja os detalhes no fim da tela.';
    }
    if (status === 400 && /API key not valid/i.test(msg)) {
      return 'A API não aceitou a chave. Veja os detalhes no fim da tela.';
    }
    if (status === 400) return `Recusado: ${msg.slice(0, 110)}`;
    if (status === 401) return 'Não autenticado. Veja os detalhes no fim da tela.';
    if (status === 403) return `Sem permissão: ${msg.slice(0, 110)}`;
    if (status === 404) {
      return `Modelo "${modelo()}" não existe nesta conta. Use "buscar modelos disponíveis".`;
    }
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
    if (!PEDIDOS[tipo]) throw new Error('Tipo de leitura desconhecido.');
    const instrucao = prompt(tipo);

    const virgula = dataUrl.indexOf(',');
    const mime = (dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg');
    const base64 = dataUrl.slice(virgula + 1);

    const corpo = await chamar({
      contents: [{
        parts: [
          { text: instrucao },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });

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
  /**
   * Pergunta à API quais modelos a chave pode usar. Nomes de modelo mudam com
   * o tempo — chutar um e errar foi o que travou a primeira configuração.
   * Varre as versões da API e devolve só o que aceita generateContent.
   */
  async function listarModelos() {
    if (!configurado()) throw new Error('Digite a chave primeiro.');
    const achados = [];
    const problemas = [];

    for (const v of VERSOES) {
      let ok = false;
      for (const montar of CABECALHOS) {
        let resp, corpo = null;
        try {
          resp = await fetch(`${HOST}/${v}/models?pageSize=200`, { headers: montar(chave()) });
          corpo = await resp.json();
        } catch (e) { problemas.push(`${v}: falha de rede`); break; }

        if (resp.ok) {
          (corpo.models || []).forEach((m) => {
            if ((m.supportedGenerationMethods || []).includes('generateContent')) {
              achados.push({
                id: String(m.name || '').replace(/^models\//, ''),
                versao: v,
                titulo: m.displayName || '',
              });
            }
          });
          ok = true;
          break;
        }
        const msg = (corpo && corpo.error && corpo.error.message) || '';
        problemas.push(`${v} · HTTP ${resp.status} — ${msg.slice(0, 90)}`);
        if (!recusaDeCredencial(resp.status, corpo)) break;
      }
      if (ok && achados.length) break; // a primeira versão que responder basta
    }

    if (!achados.length) {
      ultimoErro = problemas.join('\n') || 'Nenhum modelo retornado.';
      throw new Error('Não consegui listar os modelos. Veja os detalhes no fim da tela.');
    }
    ultimoErro = null;
    // Flash primeiro: é o mais barato e rápido para leitura de imagem.
    achados.sort((a, b) => {
      const peso = (x) => (/flash/i.test(x.id) ? 0 : 1);
      return peso(a) - peso(b) || a.id.localeCompare(b.id);
    });
    return achados;
  }

  // Chamada mínima só para validar credencial e modelo, sem imagem.
  async function testar() {
    if (!configurado()) throw new Error('Digite a chave primeiro.');
    await chamar({ contents: [{ parts: [{ text: 'Responda apenas: ok' }] }] });
    return true;
  }

  return {
    configurado, chave, modelo, versao, definirChave, definirModelo, esquecer, detalheDoErro,
    listarModelos,
    lerFoto, testar, MODELO_PADRAO,
    TIPOS_LEITURA, prompt, promptPadrao, promptEditado, definirPrompt, restaurarPrompt,
  };
})();
