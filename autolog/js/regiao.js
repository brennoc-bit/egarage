/* ==========================================================================
   regiao.js — onde a pessoa mora, e o que isso muda no cálculo.

   Saber a UF e o município destrava três coisas que antes eram chute ou
   pergunta: preço médio do combustível, alíquota de IPVA e taxa de
   licenciamento.

   TRÊS JEITOS DE INFORMAR, UM SÓ JEITO DE GUARDAR
   GPS, CEP e lista de estados são atalhos diferentes que gravam a mesma
   coisa: { uf, municipio }. Se o GPS for negado ou o serviço de CEP cair, a
   lista continua ali — nenhum caminho é obrigatório.

   O QUE ESTES DADOS NÃO SÃO
   O preço do combustível é a MÉDIA da pesquisa semanal da ANP, não o preço do
   posto da esquina. E a pesquisa cobre menos de 400 municípios: para o resto
   do país cai para a média do estado, e a tela diz qual nível está mostrando.
   A alíquota de IPVA vem de tabela mantida à mão — ver dados/ipva.json.
   ========================================================================== */
'use strict';

const Regiao = (() => {
  const KEY = 'autolog-regiao';

  let combustiveis = null;
  let ipva = null;
  let carregou = false;

  async function carregar() {
    if (carregou) return;
    carregou = true;
    const pega = async (arq) => {
      try {
        const r = await fetch(arq);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        console.warn(`${arq} indisponível.`, e);
        return null;
      }
    };
    [combustiveis, ipva] = await Promise.all([
      pega('dados/combustiveis.json'),
      pega('dados/ipva.json'),
    ]);
  }

  /* ── Onde a pessoa mora ─────────────────────────────────────────────── */

  function local() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  }

  function definir(dados) {
    if (!dados || !dados.uf) return null;
    const novo = {
      uf: String(dados.uf).toUpperCase().slice(0, 2),
      municipio: dados.municipio || '',
      origem: dados.origem || 'lista',
      em: today(),
    };
    try { localStorage.setItem(KEY, JSON.stringify(novo)); } catch (e) { /* cota */ }
    return novo;
  }

  const limpar = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ } };

  /** As 27 UFs, para o seletor. Vem da tabela de IPVA, que já as tem todas. */
  const estados = () => Object.entries((ipva && ipva.estados) || {})
    .map(([uf, e]) => ({ uf, nome: e.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  /* ── GPS ────────────────────────────────────────────────────────────── */

  // Nominatim é serviço voluntário do OpenStreetMap. Uma chamada por toque do
  // usuário está dentro da política de uso; não use isto em laço.
  async function porGPS() {
    if (!navigator.geolocation) throw new Error('Este aparelho não informa localização.');

    const pos = await new Promise((ok, falha) => {
      navigator.geolocation.getCurrentPosition(ok, (e) => {
        const motivo = e.code === 1 ? 'Permissão de localização negada.'
          : e.code === 3 ? 'O GPS demorou demais para responder.'
            : 'Não foi possível obter a localização.';
        falha(new Error(motivo));
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });

    const { latitude, longitude } = pos.coords;
    const url = 'https://nominatim.openstreetmap.org/reverse'
      + `?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&accept-language=pt-BR`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('Serviço de endereço indisponível (HTTP ' + r.status + ').');
    const j = await r.json();
    const a = j.address || {};

    const municipio = a.city || a.town || a.village || a.municipality || a.county || '';
    const uf = siglaDoEstado(a.state, a['ISO3166-2-lvl4']);
    if (!uf) throw new Error('Localização fora do Brasil, ou estado não reconhecido.');
    return definir({ uf, municipio, origem: 'gps' });
  }

  // O Nominatim devolve o estado por extenso; o ISO ("BR-SP") é mais confiável.
  function siglaDoEstado(nome, iso) {
    if (iso && /^BR-[A-Z]{2}$/.test(iso)) return iso.slice(3);
    if (!nome) return null;
    const alvo = normalizar(nome);
    const achado = estados().find((e) => normalizar(e.nome) === alvo);
    return achado ? achado.uf : null;
  }

  /* ── CEP ────────────────────────────────────────────────────────────── */

  async function porCEP(bruto) {
    const cep = String(bruto || '').replace(/\D/g, '');
    if (cep.length !== 8) throw new Error('CEP precisa ter 8 dígitos.');

    // BrasilAPI primeiro; ViaCEP como reserva. Dois serviços independentes,
    // porque um CEP errado trava a tela inteira.
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (r.ok) {
        const j = await r.json();
        if (j.state) return definir({ uf: j.state, municipio: j.city || '', origem: 'cep' });
      }
    } catch (e) { /* cai para o ViaCEP */ }

    const r2 = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r2.ok) throw new Error('Serviço de CEP indisponível.');
    const j2 = await r2.json();
    if (j2.erro || !j2.uf) throw new Error('CEP não encontrado.');
    return definir({ uf: j2.uf, municipio: j2.localidade || '', origem: 'cep' });
  }

  /* ── Preço do combustível ───────────────────────────────────────────── */

  // Mesma normalização do gerar-precos.py: sem acento, maiúsculo, só letras,
  // números e espaço. Precisa bater dos dois lados.
  const chaveLocal = (t) => String(t || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();

  // Combustível do veículo -> produto da pesquisa da ANP.
  const PRODUTO = {
    Gasolina: 'gasolina',
    'Gasolina aditivada': 'gasolinaAditivada',
    Etanol: 'etanol',
    Álcool: 'etanol',
    Flex: 'gasolina',
    Diesel: 'diesel',
    'Diesel S10': 'dieselS10',
    GNV: 'gnv',
  };

  /**
   * Preço médio do combustível no lugar mais próximo que a pesquisa alcançar.
   * Devolve também DE ONDE veio o número — quem lê precisa saber se está vendo
   * a média da própria cidade ou a do estado inteiro.
   */
  function preco(combustivel, ondeForcado) {
    if (!combustiveis) return null;
    const onde = ondeForcado || local();
    const produto = PRODUTO[combustivel] || 'gasolina';
    const semana = combustiveis.semana;

    if (onde && onde.uf) {
      const mun = combustiveis.municipios[`${onde.uf}|${chaveLocal(onde.municipio)}`];
      if (mun && mun[produto] != null) {
        return { valor: mun[produto], nivel: 'municipio', onde: onde.municipio, produto, semana };
      }
      const est = combustiveis.estados[onde.uf];
      if (est && est[produto] != null) {
        return { valor: est[produto], nivel: 'estado', onde: onde.uf, produto, semana };
      }
      const reg = combustiveis.regiaoDaUf[onde.uf];
      const naRegiao = reg && combustiveis.regioes[reg];
      if (naRegiao && naRegiao[produto] != null) {
        return { valor: naRegiao[produto], nivel: 'regiao', onde: reg, produto, semana };
      }
    }

    const br = combustiveis.brasil;
    if (br && br[produto] != null) {
      return { valor: br[produto], nivel: 'brasil', onde: 'Brasil', produto, semana };
    }
    return null;
  }

  const descricaoDoNivel = (p) => {
    if (p.nivel === 'municipio') return `média de ${p.onde}`;
    if (p.nivel === 'estado') {
      const r = regra(p.onde);
      return `média de ${r ? r.nome : p.onde}`;
    }
    if (p.nivel === 'regiao') return `média do ${String(p.onde).toLowerCase()}`;
    return 'média do Brasil';
  };

  const fonteCombustivel = () => (combustiveis
    ? { fonte: combustiveis.fonte, url: combustiveis.url, semana: combustiveis.semana }
    : null);

  /* ── IPVA e licenciamento ───────────────────────────────────────────── */

  function regra(uf) {
    const sigla = uf || (local() && local().uf);
    if (!sigla || !ipva || !ipva.estados[sigla]) return null;
    return Object.assign({ uf: sigla, vigencia: ipva.vigencia }, ipva.estados[sigla]);
  }

  /**
   * Estimativa de IPVA. Note bem a palavra: o IPVA de um ano é calculado sobre
   * a tabela FIPE do ano ANTERIOR, e ainda há desconto à vista, isenção por
   * idade e alíquota diferente para álcool e GNV em vários estados. O número
   * daqui serve para planejar, não para pagar.
   */
  function estimarIPVA(tipo, valorVeiculo, uf) {
    const r = regra(uf);
    if (!r || !(valorVeiculo > 0)) return null;
    const aliquota = tipo === 'moto' ? r.moto : r.carro;
    if (aliquota == null) return null;
    return {
      aliquota,
      valor: valorVeiculo * (aliquota / 100),
      uf: r.uf,
      estado: r.nome,
      vigencia: r.vigencia,
      sefaz: r.sefaz,
      conferir: !!r.conferir,
      obs: r.obs || '',
    };
  }

  function licenciamento(tipo, uf) {
    const r = regra(uf);
    if (!r) return null;
    const valor = (tipo === 'moto' && r.licenciamentoMoto != null)
      ? r.licenciamentoMoto : r.licenciamento;
    if (valor == null) return null;
    return { valor, uf: r.uf, estado: r.nome, vigencia: r.vigencia, sefaz: r.sefaz, obs: r.obs || '' };
  }

  /* ── Vencimento pelo final da placa ─────────────────────────────────── */

  /** Último dígito da placa. "ABC1D23" → "3". Sem placa, não há calendário. */
  function finalDaPlaca(placa) {
    const digitos = String(placa || '').replace(/\D/g, '');
    return digitos ? digitos[digitos.length - 1] : null;
  }

  const temCalendario = (uf, tipo) => {
    const c = ipva && ipva.calendario && ipva.calendario[uf];
    return !!(c && c[tipo]);
  };

  /**
   * Próximo vencimento de IPVA ou licenciamento pelo final da placa.
   *
   * Duas ressalvas que a tela precisa repassar:
   *
   * 1. Só existem no arquivo os estados cujo calendário deu para confirmar.
   *    Para os demais isto devolve `null` — e não inventar data de imposto é
   *    melhor que acertar por sorte.
   * 2. O calendário é publicado ano a ano e as datas mudam. Quando a data do
   *    ano vigente já passou, projetamos o mesmo dia no ano seguinte e
   *    marcamos `projetado` — é previsão para planejar, não a data oficial,
   *    que só sai quando o estado publicar.
   */
  function vencimento(tipo, placa, uf) {
    const sigla = uf || (local() && local().uf);
    const cal = ipva && ipva.calendario;
    const doEstado = cal && sigla && cal[sigla];
    if (!doEstado || !doEstado[tipo]) return null;

    const digito = finalDaPlaca(placa);
    if (!digito) return null;

    const md = doEstado[tipo][digito];
    if (!md) return null;

    const anoAtual = new Date().getFullYear();
    let data = `${anoAtual}-${md}`;
    if (daysUntil(data) < 0) data = `${anoAtual + 1}-${md}`;

    return {
      data,
      digito,
      vigencia: cal.vigencia,
      projetado: Number(data.slice(0, 4)) !== cal.vigencia,
      conferir: !!doEstado[tipo === 'ipva' ? 'conferirIpva' : 'conferirLicenciamento'],
    };
  }

  const pronto = () => !!(combustiveis || ipva);

  return {
    carregar, pronto,
    local, definir, limpar, estados,
    porGPS, porCEP,
    preco, descricaoDoNivel, fonteCombustivel,
    regra, estimarIPVA, licenciamento,
    vencimento, finalDaPlaca, temCalendario,
  };
})();
