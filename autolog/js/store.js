/* ==========================================================================
   store.js — modelo de dados, persistência (localStorage) e mutações.
   Toda escrita passa por aqui; nenhuma tela grava direto no estado.
   ========================================================================== */
'use strict';

const CATEGORIAS = [
  { id: 'combustivel', label: 'Combustível' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'pneus', label: 'Pneus' },
  { id: 'transmissao', label: 'Transmissão' },
  { id: 'documentacao', label: 'Documentação' },
  { id: 'seguro', label: 'Seguro' },
  { id: 'financiamento', label: 'Financiamento' },
  { id: 'outros', label: 'Outros' },
];
const labelCategoria = (id) => (CATEGORIAS.find((c) => c.id === id) || { label: 'Outros' }).label;

const TIPOS = [
  { id: 'carro', label: 'Carro', icone: '▭' },
  { id: 'moto', label: 'Moto', icone: '◠' },
];
const labelTipo = (id) => (TIPOS.find((t) => t.id === id) || TIPOS[0]).label;

const COMBUSTIVEIS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Híbrido', 'Elétrico'];

/* Planos de manutenção por tipo de veículo. Intervalos de referência: o
   usuário ajusta a realidade registrando os serviços que faz. */
const PLANO_MANUTENCAO = {
  moto: [
    { id: 'oleo', nome: 'Óleo do motor', intervaloKm: 5000, intervaloMeses: 12 },
    { id: 'filtro-ar', nome: 'Filtro de ar', intervaloKm: 12000, intervaloMeses: 24 },
    { id: 'velas', nome: 'Velas de ignição', intervaloKm: 12000 },
    { id: 'fluido-freio', nome: 'Fluido de freio', intervaloMeses: 24 },
    { id: 'pastilhas', nome: 'Pastilhas de freio', intervaloKm: 20000 },
    { id: 'pneu-d', nome: 'Pneu dianteiro', intervaloKm: 22000 },
    { id: 'pneu-t', nome: 'Pneu traseiro', intervaloKm: 15000 },
    { id: 'corrente', nome: 'Corrente e coroa', intervaloKm: 15000 },
    { id: 'bateria', nome: 'Bateria', intervaloMeses: 36 },
    { id: 'revisao', nome: 'Revisão programada', intervaloKm: 6000, alertaKm: 2000 },
  ],
  carro: [
    { id: 'oleo', nome: 'Óleo do motor', intervaloKm: 10000, intervaloMeses: 12 },
    { id: 'filtro-oleo', nome: 'Filtro de óleo', intervaloKm: 10000, intervaloMeses: 12 },
    { id: 'filtro-ar', nome: 'Filtro de ar', intervaloKm: 15000, intervaloMeses: 24 },
    { id: 'filtro-combustivel', nome: 'Filtro de combustível', intervaloKm: 20000 },
    { id: 'filtro-cabine', nome: 'Filtro de cabine', intervaloKm: 15000, intervaloMeses: 12 },
    { id: 'velas', nome: 'Velas de ignição', intervaloKm: 40000 },
    { id: 'fluido-freio', nome: 'Fluido de freio', intervaloMeses: 24 },
    { id: 'pastilhas-d', nome: 'Pastilhas dianteiras', intervaloKm: 40000 },
    { id: 'pastilhas-t', nome: 'Pastilhas traseiras', intervaloKm: 60000 },
    { id: 'pneus', nome: 'Pneus', intervaloKm: 50000 },
    { id: 'alinhamento', nome: 'Alinhamento e balanceamento', intervaloKm: 10000, intervaloMeses: 12 },
    { id: 'correia', nome: 'Correia dentada', intervaloKm: 60000, intervaloMeses: 60 },
    { id: 'arrefecimento', nome: 'Fluido de arrefecimento', intervaloKm: 50000, intervaloMeses: 48 },
    { id: 'bateria', nome: 'Bateria', intervaloMeses: 48 },
    { id: 'revisao', nome: 'Revisão programada', intervaloKm: 10000, alertaKm: 2000 },
  ],
};

const Store = (() => {
  const KEY = 'autolog-v1';
  const KEY_ANTIGA = 'motoreiro-v1'; // app se chamava Motoreiro e só cuidava de motos
  let state = null;

  /* ── Persistência ───────────────────────────────────────────────────── */

  function carregar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.veiculos)) return migrar(parsed);
      }
      // Garagem criada na época do nome antigo: aproveita em vez de descartar.
      const antigo = localStorage.getItem(KEY_ANTIGA);
      if (antigo) {
        const parsed = JSON.parse(antigo);
        if (parsed && Array.isArray(parsed.veiculos)) {
          const convertido = migrar(parsed);
          localStorage.setItem(KEY, JSON.stringify(convertido));
          return convertido;
        }
      }
    } catch (e) { /* dados corrompidos — recomeça do seed */ }
    return seed();
  }

  // Preenche o que versões anteriores do app não guardavam.
  function migrar(dados) {
    for (const v of dados.veiculos) {
      if (!v.tipo) v.tipo = 'moto'; // tudo que existia antes era moto
      if (!v.combustivel) v.combustivel = v.tipo === 'moto' ? 'Gasolina' : 'Flex';
      if (!v.cor) v.cor = '';
      if (!v.chassi) v.chassi = '';
      if (!Array.isArray(v.simulacoes)) v.simulacoes = [];
      if (!v.financiamento) v.financiamento = { quitado: true };
    }
    return dados;
  }

  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Não foi possível salvar (armazenamento cheio?)', e); }
  }

  /* ── Dados de demonstração ──────────────────────────────────────────── */
  // Gerados sempre relativos a hoje, para o app nunca parecer congelado.
  // Uma moto e um carro, para os dois fluxos ficarem visíveis de cara.

  function seed() {
    const hoje = new Date();
    const moto = seedMoto(hoje);
    const carro = seedCarro(hoje);
    return {
      versao: 2,
      perfil: { nome: 'Brenno' },
      selecionado: moto.id,
      veiculos: [moto, carro],
    };
  }

  function seedMoto(hoje) {
    const ano = hoje.getFullYear();
    const lanc = [];
    const kmMes = [512, 690, 480, 812, 654, 412]; // do mais antigo ao mês corrente
    let odo = 18420 - kmMes.reduce((a, b) => a + b, 0);
    const precoComb = 5.89, consumo = 31;
    let kmOleo = null, kmPneuT = null, kmPastilha = null;

    const extras = {
      0: [[12, 'pneus', 'Pneu traseiro', 'MotoCenter', 420]],
      1: [[8, 'manutencao', 'Revisão + troca de óleo', 'Honda Motos', 312]],
      3: [[21, 'documentacao', 'IPVA · 1ª parcela', 'Detran', 148.2]],
      4: [[18, 'documentacao', 'IPVA · 2ª parcela', 'Detran', 148.2],
          [28, 'manutencao', 'Pastilha de freio dianteira', 'MotoCenter', 220]],
      5: [[9, 'transmissao', 'Lubrificação e regulagem da corrente', 'MotoCenter', 60]],
    };

    for (let i = 0; i < 6; i++) {
      const mesRef = addMonths(hoje, i - 5);
      const ultimoDia = i === 5 ? hoje.getDate() : new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
      const dias = [2, 14].filter((d) => d <= ultimoDia);
      const kmPorAbastecimento = kmMes[i] / (dias.length || 1);

      const doMes = [];
      dias.forEach((dia) => doMes.push({ dia, tipo: 'combustivel' }));
      (extras[i] || []).forEach(([dia, tipo, titulo, local, valor]) => {
        if (dia <= ultimoDia) doMes.push({ dia, tipo, titulo, local, valor, extra: true });
      });
      doMes.sort((a, b) => a.dia - b.dia);

      for (const ev of doMes) {
        const data = toISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), ev.dia));
        if (ev.extra) {
          lanc.push({ id: uid(), data, tipo: ev.tipo, titulo: ev.titulo, local: ev.local, valor: ev.valor, odometro: Math.round(odo) });
          if (ev.titulo.includes('óleo')) kmOleo = Math.round(odo);
          if (ev.titulo.includes('Pneu traseiro')) kmPneuT = Math.round(odo);
          if (ev.titulo.includes('Pastilha')) kmPastilha = Math.round(odo);
        } else {
          odo += kmPorAbastecimento;
          const litros = kmPorAbastecimento / consumo;
          lanc.push({
            id: uid(), data, tipo: 'combustivel', titulo: 'Abastecimento',
            local: ev.dia < 10 ? 'Posto Ipiranga' : 'Posto Shell',
            valor: Math.round(litros * precoComb * 100) / 100,
            litros: Math.round(litros * 100) / 100,
            odometro: Math.round(odo),
          });
        }
      }
    }

    const odometro = Math.round(odo);
    const mesesAtras = (n) => toISO(addMonths(hoje, -n));
    const manutencao = manutencaoPadrao('moto', odometro, mesesAtras(0));
    const ajustes = {
      oleo: { ultimoKm: kmOleo, ultimaData: mesesAtras(4) },
      'filtro-ar': { ultimoKm: 7000, ultimaData: mesesAtras(20) },
      velas: { ultimoKm: 10000, ultimaData: mesesAtras(14) },
      'fluido-freio': { ultimaData: mesesAtras(21) },
      pastilhas: { ultimoKm: kmPastilha, ultimaData: mesesAtras(1) },
      'pneu-d': { ultimoKm: 11400, ultimaData: mesesAtras(18) },
      'pneu-t': { ultimoKm: kmPneuT, ultimaData: mesesAtras(5) },
      corrente: { ultimoKm: 0, ultimaData: `${ano - 4}-03-15` },
      bateria: { ultimaData: mesesAtras(30) },
      revisao: { ultimoKm: 14000, ultimaData: mesesAtras(7), oficina: 'Honda · concessionária vinculada' },
    };
    manutencao.forEach((m) => Object.assign(m, ajustes[m.id] || {}));

    return {
      id: 'cb300f', tipo: 'moto',
      marca: 'Honda', modelo: 'CB 300F Twister ABS', apelido: 'CB 300F',
      ano: 2022, cor: 'Vermelha', placa: 'ABC1D23', motor: '292cc',
      renavam: '012345678', chassi: '', combustivel: 'Gasolina',
      fipe: 22140, foto: null,
      compra: `${ano - 4}-03-15`,
      odometro, consumo, precoComb,
      manutencao,
      docs: seedDocs(hoje, ano, 20000),
      financiamento: { quitado: true },
      lancamentos: lanc,
      simulacoes: [],
    };
  }

  function seedCarro(hoje) {
    const ano = hoje.getFullYear();
    const lanc = [];
    let odo = 52180 - 4 * 620;
    const consumo = 11.8, precoComb = 6.19;

    for (let i = 0; i < 4; i++) {
      const mesRef = addMonths(hoje, i - 3);
      const ultimoDia = i === 3 ? hoje.getDate() : 28;
      [5, 19].filter((d) => d <= ultimoDia).forEach((dia) => {
        odo += 310;
        const litros = 310 / consumo;
        lanc.push({
          id: uid(), data: toISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), dia)),
          tipo: 'combustivel', titulo: 'Abastecimento',
          local: dia < 10 ? 'Posto BR' : 'Posto Shell',
          valor: Math.round(litros * precoComb * 100) / 100,
          litros: Math.round(litros * 100) / 100,
          odometro: Math.round(odo),
        });
      });
    }
    lanc.push({
      id: uid(), data: toISO(addMonths(hoje, -2)), tipo: 'manutencao',
      titulo: 'Revisão dos 50.000 km', local: 'Chevrolet · concessionária',
      valor: 890, odometro: 50120,
    });

    const odometro = Math.round(odo);
    const mesesAtras = (n) => toISO(addMonths(hoje, -n));
    const manutencao = manutencaoPadrao('carro', odometro, mesesAtras(0));
    const ajustes = {
      oleo: { ultimoKm: 50120, ultimaData: mesesAtras(2) },
      'filtro-oleo': { ultimoKm: 50120, ultimaData: mesesAtras(2) },
      'filtro-ar': { ultimoKm: 42000, ultimaData: mesesAtras(14) },
      'filtro-combustivel': { ultimoKm: 40000, ultimaData: mesesAtras(18) },
      'filtro-cabine': { ultimoKm: 50120, ultimaData: mesesAtras(2) },
      velas: { ultimoKm: 30000, ultimaData: mesesAtras(30) },
      'fluido-freio': { ultimaData: mesesAtras(23) },
      'pastilhas-d': { ultimoKm: 38000, ultimaData: mesesAtras(20) },
      'pastilhas-t': { ultimoKm: 20000, ultimaData: mesesAtras(38) },
      pneus: { ultimoKm: 28000, ultimaData: mesesAtras(30) },
      alinhamento: { ultimoKm: 50120, ultimaData: mesesAtras(2) },
      correia: { ultimoKm: 0, ultimaData: `${ano - 5}-04-10` },
      arrefecimento: { ultimoKm: 20000, ultimaData: mesesAtras(40) },
      bateria: { ultimaData: mesesAtras(26) },
      revisao: { ultimoKm: 50120, ultimaData: mesesAtras(2), oficina: 'Chevrolet · concessionária' },
    };
    manutencao.forEach((m) => Object.assign(m, ajustes[m.id] || {}));

    return {
      id: 'onix', tipo: 'carro',
      marca: 'Chevrolet', modelo: 'Onix 1.0 Turbo LT', apelido: 'Onix',
      ano: 2021, cor: 'Prata', placa: 'DEF4G56', motor: '1.0 turbo',
      renavam: '987654321', chassi: '', combustivel: 'Flex',
      fipe: 78400, foto: null,
      compra: `${ano - 5}-04-10`,
      odometro, consumo, precoComb,
      manutencao,
      docs: seedDocs(hoje, ano, 60000),
      // Exemplo com financiamento em aberto, para o custo fixo aparecer.
      financiamento: { quitado: false, parcela: 1180, restantes: 22, dia: 10 },
      lancamentos: lanc,
      simulacoes: [],
    };
  }

  function seedDocs(hoje, ano, alvoRevisao) {
    const parcela = (n, offMes) => {
      const d = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 22), offMes);
      return { n, valor: 148.2, venc: toISO(d), pago: offMes < 0 };
    };
    const licAno = hoje.getMonth() > 10 ? ano + 1 : ano;
    const seguroInicio = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 18), -11);

    return [
      {
        id: 'ipva', tag: 'IPVA', titulo: `IPVA ${ano} · 3 parcelas`, sub: 'Detran · cota parcelada',
        tipo: 'parcelas', parcelas: [parcela(1, -2), parcela(2, -1), parcela(3, 0)],
      },
      {
        id: 'licenciamento', tag: 'LICENC.', titulo: 'Licenciamento anual', sub: 'Aguardando emissão',
        tipo: 'unico', valor: 128.5, venc: `${licAno}-11-30`, pago: false,
      },
      {
        id: 'seguro', tag: 'SEGURO', titulo: 'Cobertura total', sub: 'Apólice #77-4021',
        tipo: 'anual', valor: 1240, inicio: toISO(seguroInicio), venc: toISO(addMonths(seguroInicio, 12)), pago: true,
      },
      {
        id: 'revisao', tag: 'REVISÃO', titulo: 'Revisão programada', sub: 'Concessionária vinculada',
        tipo: 'km', alvoKm: alvoRevisao, valor: 0, pago: false, agendada: null,
      },
    ];
  }

  /* ── Leitura ────────────────────────────────────────────────────────── */

  state = carregar();

  const get = () => state;
  const veiculos = () => state.veiculos;
  const veiculo = (id) => state.veiculos.find((v) => v.id === id) || null;
  const atual = () => veiculo(state.selecionado) || state.veiculos[0] || null;

  /* ── Mutações ───────────────────────────────────────────────────────── */

  function selecionar(id) { state.selecionado = id; salvar(); }

  function atualizarPerfil(patch) { Object.assign(state.perfil, patch); salvar(); }

  function atualizarVeiculo(id, patch) {
    const v = veiculo(id);
    if (!v) return;
    const tipoAntes = v.tipo;
    Object.assign(v, patch);
    // Trocar carro↔moto troca o plano de manutenção: os itens não são os
    // mesmos. Preserva o que existe nos dois (óleo, freio, bateria...).
    if (patch.tipo && patch.tipo !== tipoAntes) v.manutencao = replanejar(v);
    salvar();
  }

  function replanejar(v) {
    const anterior = new Map(v.manutencao.map((m) => [m.id, m]));
    return manutencaoPadrao(v.tipo, v.odometro, today()).map((m) => {
      const antigo = anterior.get(m.id);
      return antigo ? Object.assign(m, { ultimoKm: antigo.ultimoKm, ultimaData: antigo.ultimaData, oficina: antigo.oficina }) : m;
    });
  }

  // Veículo novo começa "zerado no km atual": o primeiro diagnóstico usa a
  // entrada na garagem como referência até haver histórico real.
  function manutencaoPadrao(tipo, km, data) {
    return (PLANO_MANUTENCAO[tipo] || PLANO_MANUTENCAO.carro).map((base) => Object.assign({}, base, {
      ultimoKm: base.intervaloKm ? km : undefined,
      ultimaData: data,
    }));
  }

  function addVeiculo(dados) {
    const hoje = new Date();
    const tipo = dados.tipo === 'moto' ? 'moto' : 'carro';
    const odometro = Math.round(parseNum(dados.odometro));
    const intervaloRevisao = tipo === 'moto' ? 6000 : 10000;
    const v = {
      id: uid(), tipo,
      marca: dados.marca || '',
      modelo: dados.modelo || labelTipo(tipo),
      apelido: dados.apelido || dados.modelo || labelTipo(tipo),
      ano: Number(dados.ano) || hoje.getFullYear(),
      cor: dados.cor || '',
      placa: normalizarPlaca(dados.placa),
      motor: dados.motor || '',
      renavam: dados.renavam || '',
      chassi: (dados.chassi || '').toUpperCase().trim(),
      combustivel: dados.combustivel || (tipo === 'moto' ? 'Gasolina' : 'Flex'),
      fipe: parseNum(dados.fipe),
      foto: dados.foto || null,
      compra: dados.compra || today(),
      odometro,
      consumo: parseNum(dados.consumo) || (tipo === 'moto' ? 30 : 11),
      precoComb: parseNum(dados.precoComb) || 5.89,
      manutencao: manutencaoPadrao(tipo, odometro, today()),
      // Nada de valor inventado: só entra o que o usuário informou.
      docs: docsInformados(dados, Math.ceil((odometro + 1) / intervaloRevisao) * intervaloRevisao),
      financiamento: financiamentoInformado(dados),
      lancamentos: [],
      simulacoes: [],
    };
    state.veiculos.push(v);
    state.selecionado = v.id;
    salvar();
    return v;
  }

  const normalizarPlaca = (p) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  /* ── Documentos e financiamento vindos do cadastro ──────────────────── */

  /**
   * Monta os documentos a partir do que a pessoa informou. Campo em branco
   * não vira documento — o app não adivinha valor de IPVA nem de seguro.
   * `anteriores` permite preservar o que já foi pago ao editar a ficha.
   */
  function docsInformados(d, alvoRevisao, anteriores) {
    const antigos = new Map((anteriores || []).map((x) => [x.id, x]));
    const docs = [];

    const ipvaValor = parseNum(d.ipvaValor);
    if (ipvaValor > 0) {
      const n = clamp(Math.round(parseNum(d.ipvaParcelas)) || 1, 1, 12);
      const base = d.ipvaVenc ? fromISO(d.ipvaVenc) : new Date();
      const antigo = antigos.get('ipva');
      const jaPagas = antigo && antigo.parcelas ? antigo.parcelas.filter((p) => p.pago).length : 0;
      const parcelas = [];
      for (let i = 0; i < n; i++) {
        parcelas.push({
          n: i + 1,
          valor: Math.round((ipvaValor / n) * 100) / 100,
          venc: toISO(addMonths(base, i)),
          pago: i < jaPagas,
        });
      }
      docs.push({
        id: 'ipva', tag: 'IPVA',
        titulo: `IPVA ${base.getFullYear()}${n > 1 ? ` · ${n} parcelas` : ' · cota única'}`,
        sub: 'informado no cadastro', tipo: 'parcelas', parcelas,
      });
    }

    const licValor = parseNum(d.licValor);
    if (licValor > 0) {
      const antigo = antigos.get('licenciamento');
      docs.push({
        id: 'licenciamento', tag: 'LICENC.', titulo: 'Licenciamento anual',
        sub: 'informado no cadastro', tipo: 'unico', valor: licValor,
        venc: d.licVenc || toISO(addMonths(new Date(), 6)),
        pago: antigo ? !!antigo.pago : false,
      });
    }

    const segValor = parseNum(d.seguroValor);
    if (segValor > 0) {
      const venc = d.seguroVenc || toISO(addMonths(new Date(), 12));
      const antigo = antigos.get('seguro');
      docs.push({
        id: 'seguro', tag: 'SEGURO',
        titulo: d.seguroNome || 'Seguro do veículo',
        sub: 'informado no cadastro', tipo: 'anual', valor: segValor,
        inicio: toISO(addMonths(fromISO(venc), -12)), venc,
        // Renovação no futuro = ciclo atual já pago; vencida = pendente.
        pago: antigo ? !!antigo.pago : daysUntil(venc) >= 0,
      });
    }

    // Revisão é derivada do odômetro, não de preço chutado.
    const antigaRev = antigos.get('revisao');
    docs.push({
      id: 'revisao', tag: 'REVISÃO', titulo: 'Revisão programada',
      sub: 'próxima pelo odômetro', tipo: 'km',
      alvoKm: antigaRev ? antigaRev.alvoKm : alvoRevisao,
      valor: 0, pago: false, agendada: antigaRev ? antigaRev.agendada : null,
    });

    return docs;
  }

  function financiamentoInformado(d) {
    if (d.quitado === false || d.quitado === 'nao') {
      return {
        quitado: false,
        parcela: parseNum(d.parcela),
        restantes: Math.max(0, Math.round(parseNum(d.parcelasRestantes))),
        dia: clamp(Math.round(parseNum(d.diaVencimento)) || 10, 1, 28),
      };
    }
    return { quitado: true };
  }

  // Devolve os dados de docs/financiamento no formato do formulário.
  function dadosDoFormulario(v) {
    const ipva = v.docs.find((d) => d.id === 'ipva');
    const lic = v.docs.find((d) => d.id === 'licenciamento');
    const seg = v.docs.find((d) => d.id === 'seguro');
    const fin = v.financiamento || { quitado: true };
    return {
      ipvaValor: ipva ? ipva.parcelas.reduce((s, p) => s + p.valor, 0) : '',
      ipvaParcelas: ipva ? ipva.parcelas.length : '',
      ipvaVenc: ipva && ipva.parcelas[0] ? ipva.parcelas[0].venc : '',
      licValor: lic ? lic.valor : '',
      licVenc: lic ? lic.venc : '',
      seguroValor: seg ? seg.valor : '',
      seguroVenc: seg ? seg.venc : '',
      seguroNome: seg ? seg.titulo : '',
      quitado: fin.quitado !== false,
      parcela: fin.quitado === false ? fin.parcela : '',
      parcelasRestantes: fin.quitado === false ? fin.restantes : '',
      diaVencimento: fin.quitado === false ? fin.dia : '',
    };
  }

  function atualizarDocsEFinanciamento(vid, dados) {
    const v = veiculo(vid);
    if (!v) return;
    const intervalo = v.tipo === 'moto' ? 6000 : 10000;
    v.docs = docsInformados(dados, Math.ceil((v.odometro + 1) / intervalo) * intervalo, v.docs);
    v.financiamento = financiamentoInformado(dados);
    salvar();
  }

  // Baixa uma parcela do financiamento e registra a despesa do mês.
  function pagarParcelaFinanciamento(vid) {
    const v = veiculo(vid);
    const fin = v && v.financiamento;
    if (!fin || fin.quitado || fin.restantes <= 0) return null;
    fin.restantes -= 1;
    addLancamento(vid, {
      data: today(), tipo: 'financiamento',
      titulo: 'Parcela do financiamento', local: '', valor: fin.parcela,
    });
    if (fin.restantes === 0) {
      v.financiamento = { quitado: true };
      salvar();
      return 'Financiamento quitado';
    }
    salvar();
    return `Parcela paga · faltam ${fin.restantes}`;
  }

  function removerVeiculo(id) {
    state.veiculos = state.veiculos.filter((v) => v.id !== id);
    if (state.selecionado === id) state.selecionado = state.veiculos[0] ? state.veiculos[0].id : null;
    salvar();
  }

  function addLancamento(vid, l) {
    const v = veiculo(vid);
    if (!v) return null;
    const item = {
      id: uid(),
      data: l.data || today(),
      tipo: l.tipo || 'outros',
      titulo: l.titulo || labelCategoria(l.tipo),
      local: l.local || '',
      valor: parseNum(l.valor),
      litros: l.litros ? parseNum(l.litros) : undefined,
      odometro: l.odometro != null && l.odometro !== '' ? Math.round(parseNum(l.odometro)) : undefined,
    };
    v.lancamentos.push(item);
    if (item.odometro && item.odometro > v.odometro) v.odometro = item.odometro;
    salvar();
    return item;
  }

  function removerLancamento(vid, lid) {
    const v = veiculo(vid);
    if (!v) return;
    v.lancamentos = v.lancamentos.filter((l) => l.id !== lid);
    salvar();
  }

  // Registra um serviço feito: zera o contador do item e (opcional) lança o custo.
  function registrarServico(vid, itemId, dados) {
    const v = veiculo(vid);
    if (!v) return;
    const item = v.manutencao.find((m) => m.id === itemId);
    if (!item) return;
    const km = dados.km != null && dados.km !== '' ? Math.round(parseNum(dados.km)) : v.odometro;
    item.ultimoKm = km;
    item.ultimaData = dados.data || today();
    if (km > v.odometro) v.odometro = km;

    if (itemId === 'revisao') {
      const doc = v.docs.find((d) => d.id === 'revisao');
      if (doc) { doc.alvoKm = km + (item.intervaloKm || 10000); doc.agendada = null; }
    }
    const valor = parseNum(dados.valor);
    if (valor > 0) {
      addLancamento(vid, {
        data: item.ultimaData, tipo: dados.tipo || categoriaDoItem(itemId),
        titulo: item.nome, local: dados.local || '', valor, odometro: km,
      });
    } else { salvar(); }
  }

  function categoriaDoItem(itemId) {
    if (itemId === 'corrente') return 'transmissao';
    if (itemId.startsWith('pneu')) return 'pneus';
    return 'manutencao';
  }

  // Paga a próxima pendência do documento e registra a despesa.
  function pagarDocumento(vid, docId) {
    const v = veiculo(vid);
    if (!v) return null;
    const doc = v.docs.find((d) => d.id === docId);
    if (!doc) return null;

    if (doc.tipo === 'parcelas') {
      const p = doc.parcelas.find((x) => !x.pago);
      if (!p) return null;
      p.pago = true;
      addLancamento(vid, { data: today(), tipo: 'documentacao', titulo: `${doc.tag} · ${p.n}ª parcela`, local: 'Detran', valor: p.valor });
      return `${doc.tag} · ${p.n}ª parcela paga`;
    }

    // Apólice anual: pagar de novo abre um novo ciclo de 12 meses.
    if (doc.tipo === 'anual') {
      const renovacao = doc.pago;
      doc.inicio = today();
      doc.venc = toISO(addMonths(new Date(), 12));
      doc.pago = true;
      addLancamento(vid, {
        data: today(), tipo: 'seguro',
        titulo: doc.titulo + (renovacao ? ' · renovação' : ''),
        local: doc.sub || '', valor: doc.valor,
      });
      return `${doc.tag} ${renovacao ? 'renovado' : 'pago'}`;
    }

    if (doc.pago) return null;
    doc.pago = true;
    addLancamento(vid, {
      data: today(), tipo: 'documentacao',
      titulo: doc.titulo, local: doc.sub || '', valor: doc.valor,
    });
    return `${doc.tag} pago`;
  }

  function agendarRevisao(vid, dados) {
    const v = veiculo(vid);
    if (!v) return;
    const doc = v.docs.find((d) => d.id === 'revisao');
    if (doc) { doc.agendada = { data: dados.data, oficina: dados.oficina || '', obs: dados.obs || '' }; }
    const item = v.manutencao.find((m) => m.id === 'revisao');
    if (item && dados.oficina) item.oficina = dados.oficina;
    salvar();
  }

  function salvarSimulacao(vid, sim) {
    const v = veiculo(vid);
    if (!v) return;
    v.simulacoes = v.simulacoes || [];
    v.simulacoes.unshift(Object.assign({ id: uid(), criada: today() }, sim));
    v.simulacoes = v.simulacoes.slice(0, 8);
    salvar();
  }

  function resetar() { state = seed(); salvar(); }

  function importar(json) {
    const dados = JSON.parse(json);
    if (!dados || !Array.isArray(dados.veiculos)) throw new Error('Arquivo sem veículos');
    state = migrar(dados);
    salvar();
  }

  const exportar = () => JSON.stringify(state, null, 2);

  return {
    get, veiculos, veiculo, atual, salvar,
    selecionar, atualizarPerfil, atualizarVeiculo, addVeiculo, removerVeiculo,
    addLancamento, removerLancamento, registrarServico, categoriaDoItem,
    pagarDocumento, agendarRevisao, salvarSimulacao,
    dadosDoFormulario, atualizarDocsEFinanciamento, pagarParcelaFinanciamento,
    resetar, importar, exportar, normalizarPlaca,
  };
})();
