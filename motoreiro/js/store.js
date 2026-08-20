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
  { id: 'outros', label: 'Outros' },
];
const labelCategoria = (id) => (CATEGORIAS.find((c) => c.id === id) || { label: 'Outros' }).label;

const Store = (() => {
  const KEY = 'motoreiro-v1';
  let state = null;

  /* ── Persistência ───────────────────────────────────────────────────── */

  function carregar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.veiculos)) return parsed;
      }
    } catch (e) { /* dados corrompidos — recomeça do seed */ }
    return seed();
  }

  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Não foi possível salvar (armazenamento cheio?)', e); }
  }

  /* ── Dados de demonstração ──────────────────────────────────────────── */
  // Gerados sempre relativos a hoje, para o app nunca parecer congelado.

  function seed() {
    const hoje = new Date();
    const ano = hoje.getFullYear();

    const cb = seedCB(hoje, ano);
    const fazer = seedFazer(hoje);

    return {
      versao: 1,
      perfil: { nome: 'Brenno' },
      selecionado: cb.id,
      veiculos: [cb, fazer],
    };
  }

  function seedCB(hoje, ano) {
    const id = 'cb300f';
    const lanc = [];
    const kmMes = [512, 690, 480, 812, 654, 412]; // do mais antigo ao mês corrente
    const totalKm = kmMes.reduce((a, b) => a + b, 0);
    let odo = 18420 - totalKm;
    const precoComb = 5.89, consumo = 31;
    let kmOleo = null, kmPneuT = null, kmPastilha = null;

    // Eventos extras: [índice do mês, dia, tipo, título, local, valor]
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
      const ehMesCorrente = i === 5;
      const ultimoDia = ehMesCorrente ? hoje.getDate() : new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
      const dias = [2, 14].filter((d) => d <= ultimoDia);
      const kmPorAbastecimento = kmMes[i] / (dias.length || 1);

      // Abastecimentos e eventos do mês entram na ordem cronológica correta.
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
            id: uid(), data, tipo: 'combustivel',
            titulo: 'Abastecimento',
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

    return {
      id,
      marca: 'Honda', modelo: 'CB 300F Twister ABS', apelido: 'CB 300F',
      ano: 2022, placa: 'ABC1D23', motor: '292cc', renavam: '012345678',
      fipe: 22140, foto: null,
      compra: `${ano - 4}-03-15`,
      odometro,
      consumo, precoComb,
      manutencao: [
        { id: 'oleo', nome: 'Óleo do motor', intervaloKm: 5000, intervaloMeses: 12, ultimoKm: kmOleo, ultimaData: mesesAtras(4) },
        { id: 'filtro-ar', nome: 'Filtro de ar', intervaloKm: 12000, intervaloMeses: 24, ultimoKm: 7000, ultimaData: mesesAtras(20) },
        { id: 'velas', nome: 'Velas de ignição', intervaloKm: 12000, ultimoKm: 10000, ultimaData: mesesAtras(14) },
        { id: 'fluido-freio', nome: 'Fluido de freio', intervaloMeses: 24, ultimaData: mesesAtras(21) },
        { id: 'pastilhas', nome: 'Pastilhas de freio', intervaloKm: 20000, ultimoKm: kmPastilha, ultimaData: mesesAtras(1) },
        { id: 'pneu-d', nome: 'Pneu dianteiro', intervaloKm: 22000, ultimoKm: 11400, ultimaData: mesesAtras(18) },
        { id: 'pneu-t', nome: 'Pneu traseiro', intervaloKm: 15000, ultimoKm: kmPneuT, ultimaData: mesesAtras(5) },
        { id: 'corrente', nome: 'Corrente e coroa', intervaloKm: 15000, ultimoKm: 0, ultimaData: `${ano - 4}-03-15` },
        { id: 'bateria', nome: 'Bateria', intervaloMeses: 36, ultimaData: mesesAtras(30) },
        { id: 'revisao', nome: 'Revisão programada', intervaloKm: 6000, ultimoKm: 14000, alertaKm: 2000, ultimaData: mesesAtras(7), oficina: 'Honda · concessionária vinculada' },
      ],
      docs: seedDocs(hoje, ano),
      lancamentos: lanc,
      simulacoes: [],
    };
  }

  function seedDocs(hoje, ano) {
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
        id: 'seguro', tag: 'SEGURO', titulo: 'Porto · Cobertura total', sub: 'Apólice #77-4021',
        tipo: 'anual', valor: 1240, inicio: toISO(seguroInicio), venc: toISO(addMonths(seguroInicio, 12)), pago: true,
      },
      {
        id: 'revisao', tag: 'REVISÃO', titulo: 'Revisão programada', sub: 'Honda · concessionária vinculada',
        tipo: 'km', alvoKm: 20000, valor: 480, pago: false, agendada: null,
      },
    ];
  }

  function seedFazer(hoje) {
    const lanc = [];
    let odo = 41230 - 3 * 480;
    for (let i = 0; i < 3; i++) {
      const mesRef = addMonths(hoje, i - 2);
      const ultimoDia = i === 2 ? hoje.getDate() : 28;
      [6, 20].filter((d) => d <= ultimoDia).forEach((dia) => {
        odo += 240;
        lanc.push({
          id: uid(), data: toISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), dia)),
          tipo: 'combustivel', titulo: 'Abastecimento', local: 'Posto BR',
          valor: Math.round((240 / 27) * 5.89 * 100) / 100,
          litros: Math.round((240 / 27) * 100) / 100,
          odometro: Math.round(odo),
        });
      });
    }
    const ano = hoje.getFullYear();
    return {
      id: 'fazer250',
      marca: 'Yamaha', modelo: 'Fazer FZ25 250', apelido: 'Fazer 250',
      ano: 2019, placa: 'XYZ2E45', motor: '249cc', renavam: '987654321',
      fipe: 18900, foto: null,
      compra: `${ano - 2}-08-02`,
      odometro: Math.round(odo),
      consumo: 27, precoComb: 5.89,
      manutencao: [
        { id: 'oleo', nome: 'Óleo do motor', intervaloKm: 5000, intervaloMeses: 12, ultimoKm: 39800, ultimaData: toISO(addMonths(hoje, -3)) },
        { id: 'corrente', nome: 'Corrente e coroa', intervaloKm: 15000, ultimoKm: 32000, ultimaData: toISO(addMonths(hoje, -20)) },
        { id: 'pneu-d', nome: 'Pneu dianteiro', intervaloKm: 22000, ultimoKm: 28000, ultimaData: toISO(addMonths(hoje, -26)) },
        { id: 'pneu-t', nome: 'Pneu traseiro', intervaloKm: 15000, ultimoKm: 33000, ultimaData: toISO(addMonths(hoje, -14)) },
        { id: 'revisao', nome: 'Revisão programada', intervaloKm: 6000, ultimoKm: 36000, alertaKm: 2000, ultimaData: toISO(addMonths(hoje, -12)) },
      ],
      docs: seedDocs(hoje, ano).map((d) => (d.id === 'revisao' ? { ...d, alvoKm: 42000 } : d)),
      lancamentos: lanc,
      simulacoes: [],
    };
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
    Object.assign(v, patch);
    salvar();
  }

  function addVeiculo(dados) {
    const hoje = new Date();
    const v = {
      id: uid(),
      marca: dados.marca || '', modelo: dados.modelo || 'Nova moto',
      apelido: dados.apelido || dados.modelo || 'Nova moto',
      ano: Number(dados.ano) || hoje.getFullYear(),
      placa: (dados.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      motor: dados.motor || '', renavam: dados.renavam || '',
      fipe: parseNum(dados.fipe), foto: null,
      compra: dados.compra || today(),
      odometro: parseNum(dados.odometro),
      consumo: parseNum(dados.consumo) || 30,
      precoComb: parseNum(dados.precoComb) || 5.89,
      manutencao: manutencaoPadrao(parseNum(dados.odometro), today()),
      docs: seedDocs(hoje, hoje.getFullYear()).map((d) => {
        if (d.id === 'revisao') return { ...d, alvoKm: Math.ceil((parseNum(dados.odometro) + 1) / 6000) * 6000 };
        if (d.tipo === 'parcelas') return { ...d, parcelas: d.parcelas.map((p) => ({ ...p, pago: false })) };
        if (d.id === 'seguro') return { ...d, pago: false };
        return d;
      }),
      lancamentos: [],
      simulacoes: [],
    };
    state.veiculos.push(v);
    state.selecionado = v.id;
    salvar();
    return v;
  }

  // Um veículo novo começa com tudo "zerado no km atual": o primeiro
  // diagnóstico usa a compra como referência até haver histórico real.
  function manutencaoPadrao(km, data) {
    return [
      { id: 'oleo', nome: 'Óleo do motor', intervaloKm: 5000, intervaloMeses: 12, ultimoKm: km, ultimaData: data },
      { id: 'filtro-ar', nome: 'Filtro de ar', intervaloKm: 12000, intervaloMeses: 24, ultimoKm: km, ultimaData: data },
      { id: 'velas', nome: 'Velas de ignição', intervaloKm: 12000, ultimoKm: km, ultimaData: data },
      { id: 'fluido-freio', nome: 'Fluido de freio', intervaloMeses: 24, ultimaData: data },
      { id: 'pastilhas', nome: 'Pastilhas de freio', intervaloKm: 20000, ultimoKm: km, ultimaData: data },
      { id: 'pneu-d', nome: 'Pneu dianteiro', intervaloKm: 22000, ultimoKm: km, ultimaData: data },
      { id: 'pneu-t', nome: 'Pneu traseiro', intervaloKm: 15000, ultimoKm: km, ultimaData: data },
      { id: 'corrente', nome: 'Corrente e coroa', intervaloKm: 15000, ultimoKm: km, ultimaData: data },
      { id: 'bateria', nome: 'Bateria', intervaloMeses: 36, ultimaData: data },
      { id: 'revisao', nome: 'Revisão programada', intervaloKm: 6000, ultimoKm: km, alertaKm: 2000, ultimaData: data },
    ];
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
      if (doc) { doc.alvoKm = km + (item.intervaloKm || 6000); doc.agendada = null; }
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
    if (itemId === 'pneu-d' || itemId === 'pneu-t') return 'pneus';
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
    v.simulacoes.unshift({ id: uid(), criada: today(), ...sim });
    v.simulacoes = v.simulacoes.slice(0, 8);
    salvar();
  }

  function resetar() { state = seed(); salvar(); }

  function importar(json) {
    const dados = JSON.parse(json);
    if (!dados || !Array.isArray(dados.veiculos)) throw new Error('Arquivo sem veículos');
    state = dados;
    salvar();
  }

  const exportar = () => JSON.stringify(state, null, 2);

  return {
    get, veiculos, veiculo, atual, salvar,
    selecionar, atualizarPerfil, atualizarVeiculo, addVeiculo, removerVeiculo,
    addLancamento, removerLancamento, registrarServico, categoriaDoItem,
    pagarDocumento, agendarRevisao, salvarSimulacao,
    resetar, importar, exportar,
  };
})();
