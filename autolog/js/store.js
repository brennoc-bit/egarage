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

// Cores usuais de emplacamento no Brasil. Sugestão, não restrição.
const CORES = [
  'Branco', 'Preto', 'Prata', 'Cinza', 'Grafite', 'Vermelho', 'Azul',
  'Azul-escuro', 'Verde', 'Amarelo', 'Laranja', 'Marrom', 'Bege', 'Dourado',
  'Vinho', 'Champagne', 'Rosa', 'Roxo', 'Fantasia',
];

const COBERTURAS = [
  'Colisão', 'Roubo e furto', 'Incêndio', 'Danos a terceiros (RCF)',
  'Vidros', 'Fenômenos naturais', 'Danos morais', 'Uso em aplicativo',
];
const ASSISTENCIAS = [
  'Guincho', 'Carro reserva', 'Chaveiro', 'Pane seca',
  'Troca de pneu', 'Auxílio mecânico', 'Assistência residencial',
];

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
    } catch (e) { /* dados corrompidos — recomeça do zero */ }
    return vazia();
  }

  // Preenche o que versões anteriores do app não guardavam.
  function migrar(dados) {
    for (const v of dados.veiculos) {
      if (!v.tipo) v.tipo = 'moto'; // tudo que existia antes era moto
      if (!v.combustivel) v.combustivel = v.tipo === 'moto' ? 'Gasolina' : 'Flex';
      if (!v.cor) v.cor = '';
      if (!v.chassi) v.chassi = '';
      if (!v.financiamento) v.financiamento = { quitado: true };
      // Seguro deixou de ser uma despesa anual genérica: agora separa
      // cobertura (até quando vale) de pagamento (à vista ou parcelado).
      const seg = (v.docs || []).find((d) => d.id === 'seguro');
      if (seg && seg.tipo === 'anual') {
        seg.tipo = 'seguro';
        seg.pagamento = { quitado: !!seg.pago, parcela: 0, restantes: 0 };
        delete seg.pago;
      }
    }
    return dados;
  }

  /* Quem grava fora daqui se inscreve, em vez de o `Store` conhecer a nuvem.
     A dependência fica numa direção só: a sincronização sabe do estado, o
     estado não sabe que existe sincronização. */
  let ouvinteGravacao = null;
  function aoGravar(fn) { ouvinteGravacao = fn; }

  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Não foi possível salvar (armazenamento cheio?)', e); }
    // O aparelho já tem o dado salvo antes de a rede entrar na história —
    // se o envio falhar, nada se perde.
    if (ouvinteGravacao) {
      try { ouvinteGravacao(state); } catch (e) { console.warn('[store] ouvinte de gravação falhou', e); }
    }
  }

  /* Troca o estado inteiro pelo que veio da conta. Grava direto no
     `localStorage` **sem passar pelo `salvar()`**: o que acabou de chegar do
     servidor não precisa voltar para ele. */
  function substituirEstado(novo) {
    state = migrar(novo);
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Não foi possível salvar (armazenamento cheio?)', e); }
    return state;
  }

  /* ── Garagem vazia ───────────────────────────────────────

     Até aqui o app nascia com uma moto e um carro de mentira, com seis meses de
     abastecimentos inventados. Isso servia enquanto ele era protótipo de uma
     pessoa só: dava o que olhar antes de existir dado real.

     Como produto, atrapalha. Quem baixa da loja abre e vê a garagem de outra
     pessoa — e a primeira tarefa vira **apagar** coisa, em vez de cadastrar a
     sua. Pior: dado de exemplo misturado com dado real é o comeco de um número
     errado, e agora ele ainda subiria para a conta e desceria no outro
     aparelho.

     Garagem nova nasce vazia, e a tela de boas-vindas convida a cadastrar.

     **Nada foi apagado de quem já usa o app.** Quem tinha a CB 300F e o Onix de
     demonstração continua com eles — inclusive porque pode tê-los editado até
     virarem o veículo de verdade, que foi sempre o caminho mais provavel. Sair
     deles é decisão de quem usa, pelo Perfil. */
  const vazia = () => ({ versao: 2, perfil: {}, selecionado: null, veiculos: [] });

  /* ── Leitura ────────────────────────────────────────────────────────── */

  state = carregar();

  const get = () => state;
  const veiculos = () => state.veiculos;
  const veiculo = (id) => state.veiculos.find((v) => v.id === id) || null;
  /* Sem o `|| state.veiculos[0]`, apagar o veículo selecionado deixaria o app
     sem nada na tela mesmo com outros na garagem. Com a garagem podendo estar
     vazia de verdade agora, devolver `null` aqui é um caso normal — quem trata
     é o `renderSemVeiculo`. */
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
      fipeRef: dados.fipeRef || null,
      foto: dados.foto || null,
      compra: dados.compra || today(),
      odometro,
      consumo: parseNum(dados.consumo) || (tipo === 'moto' ? 30 : 11),
      precoComb: parseNum(dados.precoComb) || precoPadrao(dados.combustivel),
      manutencao: manutencaoPadrao(tipo, odometro, today()),
      // Nada de valor inventado: só entra o que o usuário informou.
      docs: docsInformados(dados, Math.ceil((odometro + 1) / intervaloRevisao) * intervaloRevisao),
      financiamento: financiamentoInformado(dados),
      lancamentos: [],
    };
    state.veiculos.push(v);
    state.selecionado = v.id;
    salvar();
    return v;
  }

  const normalizarPlaca = (p) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  /* Sem preço informado, a média da ANP para a região é um chute muito melhor
     que um número fixo no código. Se a tabela não carregou, cai no fixo. */
  function precoPadrao(combustivel) {
    try {
      const p = Regiao.preco(combustivel || 'Gasolina');
      if (p && p.valor > 0) return p.valor;
    } catch (e) { /* tabela ainda não carregada */ }
    return 5.89;
  }

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
        sub: d.ipvaEstimado ? 'estimado pela sua região' : 'informado no cadastro',
        estimado: !!d.ipvaEstimado, tipo: 'parcelas', parcelas,
      });
    }

    const licValor = parseNum(d.licValor);
    if (licValor > 0) {
      const antigo = antigos.get('licenciamento');
      docs.push({
        id: 'licenciamento', tag: 'LICENC.', titulo: 'Licenciamento anual',
        sub: d.licEstimado ? 'estimado pela sua região' : 'informado no cadastro',
        estimado: !!d.licEstimado, tipo: 'unico', valor: licValor,
        venc: d.licVenc || toISO(addMonths(new Date(), 6)),
        pago: antigo ? !!antigo.pago : false,
      });
    }

    // Seguro: cobertura e pagamento são coisas separadas. A apólice vale 12
    // meses, mas pode estar sendo paga em 3 parcelas — e quem tem o seguro
    // precisa enxergar as duas datas sem confundir uma com a outra.
    const parcelado = d.seguroQuitado === false;
    const segParcela = parcelado ? parseNum(d.seguroParcela) : 0;
    const segRestantes = parcelado ? Math.max(0, Math.round(parseNum(d.seguroRestantes))) : 0;
    const coberturas = (d.seguroCoberturas || []).slice();
    /* O valor da apólice deixou de ser obrigatório: quase ninguém sabe o total
       de cabeça, mas todo mundo sabe o que está coberto e quanto é a parcela.
       Quando o total não vem, ele sai de parcela × restantes — e se nem isso
       houver, o seguro é acompanhado sem valor, só pela cobertura. */
    const segValor = parseNum(d.seguroValor) || (segParcela * segRestantes);
    const temAlgo = segValor > 0 || segParcela > 0 || coberturas.length || d.seguroVenc || d.seguroNome;
    if (d.temSeguro && temAlgo) {
      const venc = d.seguroVenc || toISO(addMonths(new Date(), 12));
      docs.push({
        id: 'seguro', tag: 'SEGURO',
        titulo: d.seguroNome || 'Seguro do veículo',
        sub: coberturas.length ? coberturas.join(' · ') : 'informado no cadastro',
        tipo: 'seguro', valor: segValor, coberturas,
        inicio: toISO(addMonths(fromISO(venc), -12)), venc,
        pagamento: {
          quitado: !parcelado,
          parcela: segParcela,
          restantes: segRestantes,
          // Dia fixo do mês em que a parcela cai — é o que permite avisar antes.
          dia: parcelado ? clamp(Math.round(parseNum(d.seguroDia)) || 10, 1, 28) : null,
        },
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
    const pag = (seg && seg.pagamento) || { quitado: true };
    const fin = v.financiamento || { quitado: true };
    return {
      ipvaValor: ipva ? ipva.parcelas.reduce((s, p) => s + p.valor, 0) : '',
      ipvaParcelas: ipva ? ipva.parcelas.length : '',
      ipvaVenc: ipva && ipva.parcelas[0] ? ipva.parcelas[0].venc : '',
      licValor: lic ? lic.valor : '',
      licVenc: lic ? lic.venc : '',
      temSeguro: !!seg,
      seguroValor: seg ? seg.valor : '',
      seguroVenc: seg ? seg.venc : '',
      seguroNome: seg ? seg.titulo : '',
      seguroCoberturas: (seg && seg.coberturas) || [],
      seguroQuitado: pag.quitado !== false,
      seguroParcela: pag.quitado === false ? pag.parcela : '',
      seguroRestantes: pag.quitado === false ? pag.restantes : '',
      seguroDia: pag.quitado === false ? (pag.dia || '') : '',
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
        // `itemId` amarra o gasto ao item de manutenção: é assim que a
        // previsão sabe quanto custou a última corrente sem depender do
        // título, que a pessoa pode reescrever.
        data: item.ultimaData, tipo: dados.tipo || categoriaDoItem(itemId),
        titulo: item.nome, itemId, local: dados.local || '', valor, odometro: km,
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

    // Seguro: enquanto houver parcelas, pagar baixa uma. Quitado, pagar de
    // novo é renovar a apólice por mais 12 meses de cobertura.
    if (doc.tipo === 'seguro') {
      const pag = doc.pagamento || { quitado: true };
      if (!pag.quitado && pag.restantes > 0) {
        pag.restantes -= 1;
        if (pag.restantes === 0) pag.quitado = true;
        addLancamento(vid, {
          data: today(), tipo: 'seguro',
          titulo: `${doc.titulo} · parcela`, local: '', valor: pag.parcela,
        });
        return pag.restantes === 0
          ? 'Seguro quitado · cobertura mantida'
          : `Parcela paga · faltam ${pag.restantes}`;
      }
      doc.inicio = today();
      doc.venc = toISO(addMonths(new Date(), 12));
      doc.pagamento = { quitado: true, parcela: 0, restantes: 0 };
      addLancamento(vid, {
        data: today(), tipo: 'seguro',
        titulo: `${doc.titulo} · renovação`, local: '', valor: doc.valor,
      });
      return 'Apólice renovada por 12 meses';
    }

    if (doc.pago) return null;
    doc.pago = true;
    addLancamento(vid, {
      data: today(), tipo: 'documentacao',
      titulo: doc.titulo, local: doc.sub || '', valor: doc.valor,
    });
    return `${doc.tag} pago`;
  }

  /**
   * Dados da apólice: número, contatos, coberturas, franquia. Fica junto do
   * documento do seguro; sem seguro cadastrado, não há onde guardar.
   */
  function atualizarApolice(vid, dados) {
    const v = veiculo(vid);
    if (!v) return null;
    const doc = v.docs.find((d) => d.id === 'seguro');
    if (!doc) return null;
    if (dados.seguradora) doc.titulo = dados.seguradora;
    doc.apolice = Object.assign({}, doc.apolice, dados);
    salvar();
    return doc;
  }

  const apoliceDe = (v) => {
    const doc = v && v.docs.find((d) => d.id === 'seguro');
    return doc ? Object.assign({ seguradora: doc.titulo }, doc.apolice || {}) : null;
  };

  function agendarRevisao(vid, dados) {
    const v = veiculo(vid);
    if (!v) return;
    const doc = v.docs.find((d) => d.id === 'revisao');
    if (doc) { doc.agendada = { data: dados.data, oficina: dados.oficina || '', obs: dados.obs || '' }; }
    const item = v.manutencao.find((m) => m.id === 'revisao');
    if (item && dados.oficina) item.oficina = dados.oficina;
    salvar();
  }



  function importar(json) {
    const dados = JSON.parse(json);
    if (!dados || !Array.isArray(dados.veiculos)) throw new Error('Arquivo sem veículos');
    state = migrar(dados);
    salvar();
  }

  const exportar = () => JSON.stringify(state, null, 2);

  /* ── Estimativas da região viram dados do veículo ───────────────────── */

  /**
   * Preenche IPVA, licenciamento e preço do litro a partir da região e do
   * valor FIPE.
   *
   * Isto NÃO contradiz a regra de não inventar valor. Chute era escrever
   * "IPVA: R$ 1.200" sem base nenhuma. Aqui é conta: valor FIPE vezes a
   * alíquota do estado, e a taxa que o Detran publicou. O que entra fica
   * marcado como estimativa na própria ficha, e a pessoa pode sobrescrever
   * a qualquer momento — inclusive porque a guia real vem com desconto à
   * vista, isenção e outras regras que o app não tem como saber.
   *
   * `forcar` = true sobrescreve valores que a pessoa digitou; sem ele, só
   * preenche o que está vazio ou o que a estimativa anterior tinha posto.
   */
  function aplicarEstimativa(id, forcar) {
    const v = veiculo(id);
    if (!v) return null;

    const est = Regiao.estimarIPVA(v.tipo, v.fipe);
    const lic = Regiao.licenciamento(v.tipo);
    const preco = Regiao.preco(v.combustivel);
    const mudou = [];

    const podeEscrever = (doc) => forcar || !doc || doc.estimado;

    /* IPVA: mantém o parcelamento, as datas e o que já foi pago; troca só os
       valores. Quem já pagou duas parcelas não quer perder isso. */
    if (est) {
      const atual = v.docs.find((d) => d.id === 'ipva');
      const cal = Regiao.vencimento('ipva', v.placa);
      if (podeEscrever(atual)) {
        if (atual && atual.parcelas && atual.parcelas.length) {
          const n = atual.parcelas.length;
          // Datas só são mexidas se nenhuma parcela foi paga: parcela paga tem
          // data real, e reescrever isso apagaria o histórico da pessoa.
          const intocado = atual.parcelas.every((p) => !p.pago);
          atual.parcelas = atual.parcelas.map((p, i) => Object.assign({}, p, {
            valor: Math.round((est.valor / n) * 100) / 100,
            venc: (cal && intocado) ? toISO(addMonths(fromISO(cal.data), i)) : p.venc,
          }));
          atual.estimado = true;
          atual.sub = `estimado · ${est.aliquota}% em ${est.estado}`;
        } else {
          v.docs.unshift({
            id: 'ipva', tag: 'IPVA',
            titulo: `IPVA ${est.vigencia} · cota única`,
            sub: `estimado · ${est.aliquota}% em ${est.estado}`,
            tipo: 'parcelas', estimado: true,
            parcelas: [{
              n: 1, valor: Math.round(est.valor * 100) / 100,
              venc: cal ? cal.data : today(), pago: false,
            }],
          });
        }
        mudou.push(`IPVA ${brl(est.valor)}`);
      }
    }

    if (lic) {
      const atual = v.docs.find((d) => d.id === 'licenciamento');
      const cal = Regiao.vencimento('licenciamento', v.placa);
      if (podeEscrever(atual)) {
        if (atual) {
          atual.valor = lic.valor;
          atual.estimado = true;
          atual.sub = `estimado · taxa de ${lic.vigencia} em ${lic.estado}`;
          if (cal && !atual.pago) atual.venc = cal.data;
        } else {
          v.docs.push({
            id: 'licenciamento', tag: 'LICENC.', titulo: 'Licenciamento anual',
            sub: `estimado · taxa de ${lic.vigencia} em ${lic.estado}`,
            tipo: 'unico', valor: lic.valor, estimado: true,
            venc: cal ? cal.data : toISO(addMonths(new Date(), 6)), pago: false,
          });
        }
        mudou.push(`licenciamento ${brl(lic.valor)}`);
      }
    }

    if (preco && preco.valor > 0 && (forcar || !v.precoCombManual)) {
      v.precoComb = preco.valor;
      mudou.push(`litro a ${brl(preco.valor)}`);
    }

    if (mudou.length) salvar();
    return { mudou, est, lic, preco };
  }

  /** O que a estimativa preencheria, sem gravar nada — para a tela avisar. */
  function previaEstimativa(v) {
    if (!v) return null;
    return {
      ipva: Regiao.estimarIPVA(v.tipo, v.fipe),
      licenciamento: Regiao.licenciamento(v.tipo),
      preco: Regiao.preco(v.combustivel),
    };
  }

  return {
    get, veiculos, veiculo, atual, salvar,
    aplicarEstimativa, previaEstimativa,
    selecionar, atualizarPerfil, atualizarVeiculo, addVeiculo, removerVeiculo,
    addLancamento, removerLancamento, registrarServico, categoriaDoItem,
    pagarDocumento, agendarRevisao,
    dadosDoFormulario, atualizarDocsEFinanciamento, pagarParcelaFinanciamento,
    atualizarApolice, apoliceDe,
    importar, exportar, normalizarPlaca,
    aoGravar, substituirEstado,
  };
})();
