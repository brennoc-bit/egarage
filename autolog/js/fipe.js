/* ==========================================================================
   fipe.js — quanto vale o veículo, segundo a tabela FIPE.

   O valor FIPE é a base do cálculo de IPVA, então descobri-lo sozinho evita
   uma pergunta que quase ninguém sabe responder de cabeça.

   POR QUE AO VIVO, SE O CATÁLOGO DE NOMES É EMBARCADO
   Nomes de modelo mudam devagar e cabem num arquivo. Preço muda todo mês e
   são centenas de milhares de combinações — não cabe. Então nome vem do
   arquivo, preço vem da rede.

   A API (parallelum.com.br) é comunitária e gratuita: 500 consultas por dia
   sem cadastro. Como a chamada sai do aparelho de cada pessoa, essa cota é
   individual — não ter servidor, aqui, joga a favor.

   DUAS REDES DE PROTEÇÃO, porque serviço grátis não tem contrato:
   1. O resultado fica guardado com o mês de referência. A FIPE só muda uma vez
      por mês, então uma consulta por mês por veículo basta.
   2. O valor é sempre editável na tela. Se esta API sumir amanhã, a pessoa
      digita o número e o app continua calculando.
   ========================================================================== */
'use strict';

const Fipe = (() => {
  const BASE = 'https://parallelum.com.br/fipe/api/v1';
  const KEY = 'autolog-fipe';
  const CAMINHO = { carro: 'carros', moto: 'motos' };

  const cache = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  };
  const gravarCache = (c) => {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* cota */ }
  };

  async function pedir(rota) {
    let r;
    try {
      r = await fetch(BASE + rota);
    } catch (e) {
      throw new Error('Sem conexão com a tabela FIPE. Você pode digitar o valor à mão.');
    }
    if (r.status === 429) {
      throw new Error('Limite diário de consultas à FIPE atingido (são 500 por dia). '
        + 'Tente amanhã ou digite o valor à mão.');
    }
    if (!r.ok) throw new Error(`A tabela FIPE respondeu ${r.status}.`);
    return r.json();
  }

  /* ── Passo a passo da consulta ──────────────────────────────────────── */

  async function marcaCodigo(tipo, marca) {
    const lista = await pedir(`/${CAMINHO[tipo] || 'carros'}/marcas`);
    const alvo = normalizar(marca);
    const achada = lista.find((m) => normalizar(m.nome) === alvo)
      // "GM - Chevrolet" na FIPE, "Chevrolet" no nosso catálogo.
      || lista.find((m) => normalizar(m.nome).includes(alvo))
      || lista.find((m) => alvo.includes(normalizar(m.nome)));
    if (!achada) throw new Error(`A FIPE não tem a marca "${marca}".`);
    return achada.codigo;
  }

  /**
   * Versões que combinam com o modelo digitado.
   *
   * O catálogo do app guarda o modelo curto ("CB 300F"); a FIPE guarda a
   * versão inteira ("CB 300F Twister Flex", "CB 300F Twister S") e cada uma
   * tem preço diferente. Por isso devolvemos a lista: quem escolhe é o dono do
   * veículo, uma vez só — depois o código fica guardado.
   */
  async function versoes(tipo, marca, modelo) {
    const marcaCod = await marcaCodigo(tipo, marca);
    const resp = await pedir(`/${CAMINHO[tipo] || 'carros'}/marcas/${marcaCod}/modelos`);
    const alvo = normalizar(modelo);
    const todos = resp.modelos || [];

    const comeca = todos.filter((m) => normalizar(m.nome).startsWith(alvo));
    const contem = todos.filter((m) => !comeca.includes(m) && normalizar(m.nome).includes(alvo));
    const achados = comeca.concat(contem);
    if (!achados.length) throw new Error(`A FIPE não tem "${modelo}" na marca ${marca}.`);

    return achados.slice(0, 40).map((m) => ({ marcaCod, modeloCod: m.codigo, nome: m.nome }));
  }

  async function anos(tipo, marcaCod, modeloCod) {
    const lista = await pedir(`/${CAMINHO[tipo] || 'carros'}/marcas/${marcaCod}/modelos/${modeloCod}/anos`);
    // "32000" é como a FIPE marca zero-quilômetro; vira rótulo legível.
    return lista.map((a) => ({
      codigo: a.codigo,
      ano: a.nome === '32000' ? 0 : Number(a.nome) || 0,
      rotulo: a.nome === '32000' ? 'Zero km' : a.nome,
    }));
  }

  async function valor(tipo, marcaCod, modeloCod, anoCod) {
    const chave = `${tipo}|${marcaCod}|${modeloCod}|${anoCod}`;
    const guardado = cache()[chave];
    const mesAtual = today().slice(0, 7);
    if (guardado && guardado.em === mesAtual) return Object.assign({}, guardado, { doCache: true });

    const j = await pedir(`/${CAMINHO[tipo] || 'carros'}/marcas/${marcaCod}/modelos/${modeloCod}/anos/${anoCod}`);
    const resultado = {
      valor: parseNum(String(j.Valor || '').replace(/[^\d.,]/g, '')),
      nome: j.Modelo || '',
      marca: j.Marca || '',
      ano: j.AnoModelo === 32000 ? 0 : j.AnoModelo,
      combustivel: j.Combustivel || '',
      codigoFipe: j.CodigoFipe || '',
      referencia: j.MesReferencia || '',
      marcaCod, modeloCod, anoCod, tipo,
      em: mesAtual,
    };

    const c = cache();
    c[chave] = resultado;
    // A tabela muda todo mês; guardar o passado não serve para nada.
    for (const k of Object.keys(c)) if (c[k].em !== mesAtual) delete c[k];
    gravarCache(c);

    return resultado;
  }

  /**
   * Consulta em um passo, quando dá. Se houver mais de uma versão possível,
   * devolve `{ escolher: [...] }` em vez de adivinhar.
   */
  async function consultar(tipo, { marca, modelo, ano }) {
    if (!marca || !modelo) throw new Error('Informe marca e modelo antes de consultar a FIPE.');
    const lista = await versoes(tipo, marca, modelo);
    if (lista.length > 1) return { escolher: lista };

    const v = lista[0];
    const listaAnos = await anos(tipo, v.marcaCod, v.modeloCod);
    const doAno = ano ? listaAnos.find((a) => a.ano === Number(ano)) : null;
    if (!doAno) return { escolherAno: listaAnos, versao: v };
    return { resultado: await valor(tipo, v.marcaCod, v.modeloCod, doAno.codigo) };
  }

  return { versoes, anos, valor, consultar };
})();
