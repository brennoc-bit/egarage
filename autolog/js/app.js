/* ==========================================================================
   app.js — roteador, cabeçalho, navegação e ações (formulários).
   ========================================================================== */
'use strict';

const NAV = [
  { id: 'inicio', label: 'Início', ic: '⌂' },
  { id: 'garagem', label: 'Garagem', ic: '⏣' },
  { id: 'custos', label: 'Custos', ic: '$' },
  { id: 'docs', label: 'Docs', ic: '◫' },
  { id: 'perfil', label: 'Perfil', ic: '◉' },
];
// Telas sem aba própria herdam o destaque de outra.
const NAV_PAI = {
  manutencao: 'garagem', veiculo: 'garagem',
  seguro: 'docs', 'seguro-editar': 'docs', gemini: 'perfil',
};

const App = {
  rota: 'inicio',
  sub: { garagem: 'resumo', docs: 'todos', custos: 'km', periodo: 30, historico: 6, veiculoId: null },
  _sim: {},
  _rascunho: null,

  ir(rota, sub) {
    const mudou = rota !== this.rota;
    // Sair do cadastro descarta o que estava sendo digitado.
    if (this.rota === 'veiculo' && rota !== 'veiculo') this.limparRascunho();
    if (this.rota === 'seguro-editar' && rota !== 'seguro-editar') this.limparRascunhoSeguro();
    this.rota = rota;
    if (sub) Object.assign(this.sub, sub);
    this.render({ topo: mudou });
  },

  /* Rascunho do cadastro: sobrevive aos redesenhos que a escolha de foto e
     de tipo provocam, sem gravar nada no Store antes de o usuário salvar. */
  rascunho(base) {
    if (!this._rascunho) {
      const texto = (valor) => (valor != null && valor !== '' ? String(valor) : '');
      // Ao editar, os documentos e o financiamento voltam para o formulário.
      const extras = base.id ? Store.dadosDoFormulario(base) : { quitado: true };
      this._rascunho = {
        tipo: base.tipo || 'carro',
        marca: texto(base.marca), modelo: texto(base.modelo), apelido: texto(base.apelido),
        ano: texto(base.ano), cor: texto(base.cor),
        combustivel: texto(base.combustivel), placa: texto(base.placa),
        renavam: texto(base.renavam), chassi: texto(base.chassi),
        odometro: texto(base.odometro), consumo: texto(base.consumo),
        precoComb: texto(base.precoComb), compra: texto(base.compra),
        fipe: texto(base.fipe), fipeRef: base.fipeRef || null,
        foto: base.foto || null,
        quitado: extras.quitado !== false,
        parcela: texto(extras.parcela), parcelasRestantes: texto(extras.parcelasRestantes),
        diaVencimento: texto(extras.diaVencimento),
        ipvaValor: texto(extras.ipvaValor), ipvaParcelas: texto(extras.ipvaParcelas),
        ipvaVenc: texto(extras.ipvaVenc),
        temSeguro: !!extras.temSeguro,
        seguroValor: texto(extras.seguroValor), seguroVenc: texto(extras.seguroVenc),
        seguroNome: texto(extras.seguroNome),
        seguroQuitado: extras.seguroQuitado !== false,
        seguroParcela: texto(extras.seguroParcela), seguroRestantes: texto(extras.seguroRestantes),
        licValor: texto(extras.licValor), licVenc: texto(extras.licVenc),
      };
    }
    return this._rascunho;
  },
  limparRascunho() { this._rascunho = null; },

  // Rascunho da apólice, mesma ideia: sobrevive aos redesenhos das chips.
  rascunhoSeguro(base) {
    if (!this._rascunhoSeguro) {
      const texto = (valor) => (valor != null && valor !== '' ? String(valor) : '');
      this._rascunhoSeguro = {
        seguradora: texto(base.seguradora), numero: texto(base.numero),
        telEmergencia: texto(base.telEmergencia), telSeguradora: texto(base.telSeguradora),
        whatsapp: texto(base.whatsapp), site: texto(base.site),
        corretorNome: texto(base.corretorNome), corretorTel: texto(base.corretorTel),
        corretorEmail: texto(base.corretorEmail),
        franquia: texto(base.franquia), rcfMateriais: texto(base.rcfMateriais),
        rcfCorporais: texto(base.rcfCorporais),
        coberturas: (base.coberturas || []).slice(),
        assistencias: (base.assistencias || []).slice(),
        guinchoKm: texto(base.guinchoKm), carroReservaDias: texto(base.carroReservaDias),
        observacoes: texto(base.observacoes),
      };
    }
    return this._rascunhoSeguro;
  },
  limparRascunhoSeguro() { this._rascunhoSeguro = null; },
  sairDoCadastro() {
    const editando = this.sub.veiculoId;
    this.limparRascunho();
    this.ir(editando ? 'garagem' : 'inicio');
  },

  // Parâmetros da simulação, por veículo, só na sessão.
  sim(v) {
    if (!this._sim[v.id]) {
      this._sim[v.id] = { valor: v.fipe || 20000, entrada: Math.round((v.fipe || 20000) * 0.27), meses: 36, taxa: 1.49, sistema: 'price' };
    }
    return this._sim[v.id];
  },
  setSim(patch) {
    const v = Store.atual();
    if (!v) return;
    Object.assign(this.sim(v), patch);
  },

  render({ topo = false } = {}) {
    const hd = $('#app-hd');
    const tela = $('#screen');
    const nav = $('#nav');
    const scroll = tela.scrollTop;

    clear(hd); clear(tela); clear(nav);

    // Porteira do protótipo: sem sessão, só existe a tela de login.
    const semSessao = !Auth.logado();
    $('#app').classList.toggle('login-ativo', semSessao);
    if (semSessao) { tela.append(Auth.tela()); return; }

    const v = Store.atual();
    if (!v) { renderSemVeiculo(hd, tela, nav); return; }

    const conteudo = (Screens[this.rota] || Screens.inicio)(v);

    hd.append(h('div', { class: 'hd-text' },
      conteudo.kicker ? h('div', { class: 'kick' }, conteudo.kicker) : null,
      h('h2', null, conteudo.titulo)));
    if (conteudo.voltar) {
      hd.append(h('button', { class: 'hd-btn', onClick: () => App.ir(conteudo.voltar) }, '‹ voltar'));
    }

    tela.append(conteudo.corpo);

    // Abastecer é a ação mais repetida do app: fica flutuando, sempre à mão.
    // Fora do cadastro, onde ela atrapalharia o formulário.
    if (!['veiculo', 'seguro-editar', 'gemini'].includes(this.rota)) {
      tela.append(UI.fab(() => Acoes.registrarAbastecimento(Store.atual()), 'Registrar abastecimento'));
    }

    const ativo = NAV_PAI[this.rota] || this.rota;
    NAV.forEach((n) => nav.append(h('button', {
      class: n.id === ativo ? 'active' : '',
      onClick: () => App.ir(n.id),
    }, h('span', { class: 'ic' }, n.ic), h('span', null, n.label))));

    tela.scrollTop = topo ? 0 : scroll;
  },
};

function renderSemVeiculo(hd, tela, nav) {
  hd.append(h('div', { class: 'hd-text' },
    h('div', { class: 'kick' }, 'Garagem vazia'),
    h('h2', null, 'Autolog')));
  tela.append(
    h('div', { class: 'empty', style: { paddingTop: 80 } },
      'Nenhum veículo cadastrado ainda.', h('br'), 'Carro ou moto — comece pelo modelo e pelo km atual.'),
    UI.cta([{ label: 'Cadastrar primeiro veículo', icone: '+', pri: true, onClick: () => Acoes.novoVeiculo() }]));
  nav.append(h('div', { style: { padding: 8 } }));
}

/* ══════════════════════════════════════════════════════════════════════
   Ações — cada uma abre uma folha, grava pelo Store e redesenha.
   ══════════════════════════════════════════════════════════════════════ */

/* Consulta à FIPE em três passos, perguntando só o que não dá para deduzir.

   O catálogo do app guarda o modelo curto ("CB 300F"); a FIPE guarda a versão
   inteira ("CB 300F Twister Flex", "CB 300F Twister S"), e cada versão tem
   preço diferente. Adivinhar qual é seria errar o IPVA de alguém, então
   quando há mais de uma o app pergunta — uma vez só, e guarda os códigos. */
async function consultaFipe(tipo, dados, aoAchar) {
  const marca = String(dados.marca || '').trim();
  const modelo = String(dados.modelo || '').trim();
  const ano = Number(dados.ano) || 0;

  if (!marca || !modelo) { UI.toast('Preencha marca e modelo antes de consultar'); return; }

  const pegarValor = async (v, a) => {
    UI.toast('Buscando o valor…');
    try { aoAchar(await Fipe.valor(tipo, v.marcaCod, v.modeloCod, a.codigo)); }
    catch (e) { UI.toast(e.message || 'A FIPE não respondeu'); }
  };

  const escolherAno = (v, lista) => UI.sheet({
    titulo: 'Qual ano?',
    sub: v.nome,
    campos: [{
      name: 'i', label: 'Ano do modelo', tipo: 'select',
      opcoes: lista.map((a, i) => ({ value: String(i), label: a.rotulo })),
    }],
    acao: 'Consultar',
    onSubmit: (d) => pegarValor(v, lista[Number(d.i) || 0]),
  });

  const seguir = async (v) => {
    UI.toast('Vendo os anos disponíveis…');
    let lista;
    try { lista = await Fipe.anos(tipo, v.marcaCod, v.modeloCod); }
    catch (e) { UI.toast(e.message || 'A FIPE não respondeu'); return; }
    if (!lista.length) { UI.toast('A FIPE não tem anos para essa versão'); return; }

    const doAno = ano ? lista.find((a) => a.ano === ano) : null;
    if (doAno) return pegarValor(v, doAno);
    escolherAno(v, lista);
  };

  UI.toast('Consultando a tabela FIPE…');
  let versoes;
  try { versoes = await Fipe.versoes(tipo, marca, modelo); }
  catch (e) { UI.toast(e.message || 'A FIPE não respondeu'); return; }

  if (versoes.length === 1) return seguir(versoes[0]);

  UI.sheet({
    titulo: 'Qual versão?',
    sub: `A FIPE tem ${versoes.length} versões de ${modelo}. Cada uma vale um valor diferente.`,
    campos: [{
      name: 'i', label: 'Versão', tipo: 'select',
      opcoes: versoes.map((v, i) => ({ value: String(i), label: v.nome })),
    }],
    acao: 'Continuar',
    onSubmit: (d) => seguir(versoes[Number(d.i) || 0]),
  });
}

const Acoes = {

  /* — veículos — */

  novoVeiculo() {
    App.limparRascunho();
    App.ir('veiculo', { veiculoId: null });
  },

  editarVeiculo(v) {
    App.limparRascunho();
    App.ir('veiculo', { veiculoId: v.id });
  },

  removerVeiculo(v) {
    UI.confirmar({
      titulo: `Excluir ${labelTipo(v.tipo).toLowerCase()}`,
      texto: `${v.marca} ${v.modelo} e todos os seus lançamentos serão apagados deste aparelho.`,
      acao: 'Excluir',
      onOk: () => { Store.removerVeiculo(v.id); App.render(); UI.toast('Veículo removido'); },
    });
  },

  trocarFoto(v) {
    Foto.escolherEAjustar((dataUrl) => {
      Store.atualizarVeiculo(v.id, { foto: dataUrl });
      App.render();
      UI.toast('Foto atualizada');
    });
  },

  atualizarOdometro(v) {
    UI.sheet({
      titulo: 'Odômetro', sub: 'Quilometragem atual',
      topo: (api) => UI.botaoLeitura({
        tipo: 'odometro', api, rotulo: 'Fotografar o painel',
        mapear: (d) => ({ km: d.km != null ? String(Math.round(parseNum(d.km))) : null }),
      }),
      campos: [{ name: 'km', label: 'Km no painel', tipo: 'number', valor: v.odometro, obrigatorio: true }],
      onSubmit: (d) => {
        const km = Math.round(d.km);
        if (km < v.odometro) {
          UI.toast('Km menor que o registrado — não alterado');
          return;
        }
        Store.atualizarVeiculo(v.id, { odometro: km });
        App.render();
        UI.toast(`Odômetro em ${num(km)} km`);
      },
    });
  },

  /* — lançamentos — */

  registrarAbastecimento(v) {
    const ultimo = Calc.ordenados(v).filter((l) => l.tipo === 'combustivel' && l.odometro).pop();
    UI.sheet({
      titulo: 'Abastecimento', sub: v.apelido || v.modelo,
      topo: (api) => UI.botaoLeitura({
        tipo: 'abastecimento', api, rotulo: 'Fotografar nota ou bomba',
        mapear: (d) => ({
          data: d.data || null,
          litros: d.litros != null ? String(d.litros) : null,
          valor: d.valor != null ? String(d.valor) : null,
          local: d.local || null,
          odometro: d.odometro != null ? String(Math.round(parseNum(d.odometro))) : null,
        }),
      }),
      campos: [
        { name: 'data', label: 'Data', tipo: 'date', valor: today(), meio: true },
        { name: 'odometro', label: 'Km no painel', tipo: 'number', valor: v.odometro, obrigatorio: true, meio: true },
        { name: 'litros', label: 'Litros', tipo: 'dinheiro', obrigatorio: true, meio: true },
        { name: 'valor', label: 'Valor pago', tipo: 'dinheiro', obrigatorio: true, meio: true },
        { name: 'local', label: 'Posto', placeholder: 'Posto Ipiranga' },
      ],
      acao: 'Registrar',
      onSubmit: (d) => {
        Store.addLancamento(v.id, {
          data: d.data, tipo: 'combustivel', titulo: 'Abastecimento',
          local: d.local, valor: d.valor, litros: d.litros, odometro: d.odometro,
        });
        App.render();
        const km = ultimo ? Math.round(d.odometro) - ultimo.odometro : 0;
        UI.toast(km > 0 && d.litros > 0
          ? `${num(km / d.litros, 1)} km/L neste tanque`
          : 'Abastecimento registrado');
      },
    });
  },

  registrarLancamento(v, tipoPadrao) {
    UI.sheet({
      titulo: 'Novo lançamento', sub: 'Peça, serviço ou taxa',
      topo: (api) => UI.botaoLeitura({
        tipo: 'lancamento', api, rotulo: 'Fotografar a nota',
        mapear: (d) => ({
          data: d.data || null,
          titulo: d.titulo || null,
          local: d.local || null,
          valor: d.valor != null ? String(d.valor) : null,
          odometro: d.odometro != null ? String(Math.round(parseNum(d.odometro))) : null,
          tipo: CATEGORIAS.some((c) => c.id === d.categoria) ? d.categoria : null,
        }),
      }),
      campos: [
        { name: 'data', label: 'Data', tipo: 'date', valor: today(), meio: true },
        { name: 'tipo', label: 'Categoria', tipo: 'select', valor: tipoPadrao || 'manutencao', opcoes: CATEGORIAS.map((c) => ({ value: c.id, label: c.label })), meio: true },
        { name: 'titulo', label: 'Descrição', placeholder: 'Troca de óleo', obrigatorio: true },
        { name: 'local', label: 'Oficina / loja', placeholder: 'nome da oficina', meio: true },
        { name: 'valor', label: 'Valor', tipo: 'dinheiro', obrigatorio: true, meio: true },
        { name: 'odometro', label: 'Km (opcional)', tipo: 'number' },
      ],
      acao: 'Lançar',
      onSubmit: (d) => {
        Store.addLancamento(v.id, d);
        App.render();
        UI.toast(`${d.titulo} · ${brl(d.valor)}`);
      },
    });
  },

  verLancamento(v, l) {
    UI.sheet({
      titulo: l.titulo,
      sub: `${fmtData(l.data)} · ${labelCategoria(l.tipo)}`,
      texto: [
        brl(l.valor),
        l.local ? `em ${l.local}` : null,
        l.litros ? `${num(l.litros, 2)} L` : null,
        l.odometro ? `${num(l.odometro)} km` : null,
      ].filter(Boolean).join(' · '),
      acao: 'Excluir lançamento',
      destrutivo: true,
      onSubmit: () => { Store.removerLancamento(v.id, l.id); App.render(); UI.toast('Lançamento excluído'); },
    });
  },

  /* — manutenção — */

  registrarServico(v, it) {
    UI.sheet({
      titulo: it.nome, sub: it.sub || 'sem histórico',
      texto: `Situação atual: ${it.rotulo}.`,
      campos: [
        { name: 'data', label: 'Data do serviço', tipo: 'date', valor: today(), meio: true },
        { name: 'km', label: 'Km no painel', tipo: 'number', valor: v.odometro, meio: true },
        { name: 'valor', label: 'Valor pago (opcional)', tipo: 'dinheiro', meio: true },
        { name: 'local', label: 'Oficina', placeholder: 'nome da oficina', meio: true },
      ],
      acao: 'Registrar serviço',
      onSubmit: (d) => {
        Store.registrarServico(v.id, it.id, d);
        App.render();
        UI.toast(`${it.nome} · em dia`);
      },
    });
  },

  agendarOficina(v) {
    const doc = v.docs.find((d) => d.id === 'revisao');
    UI.sheet({
      titulo: 'Agendar oficina', sub: 'Revisão programada',
      campos: [
        { name: 'data', label: 'Data', tipo: 'date', valor: (doc && doc.agendada && doc.agendada.data) || today(), obrigatorio: true },
        { name: 'oficina', label: 'Oficina', valor: (doc && doc.agendada && doc.agendada.oficina) || 'Honda · concessionária vinculada' },
        { name: 'obs', label: 'Observações', tipo: 'textarea', placeholder: 'Itens a verificar…' },
      ],
      acao: 'Agendar',
      onSubmit: (d) => {
        Store.agendarRevisao(v.id, d);
        App.ir('docs');
        UI.toast(`Revisão agendada · ${fmtData(d.data)}`);
      },
    });
  },

  /* — documentos — */

  /* — avisos — */

  async alternarAvisos() {
    const cfg = Avisos.config();
    if (cfg.ativo) {
      Avisos.definirConfig({ ativo: false });
      App.render();
      UI.toast('Avisos desligados');
      return;
    }
    if (!Avisos.suportado()) { UI.toast('Este navegador não faz notificação'); return; }
    try {
      await Avisos.pedirPermissao();
      Avisos.definirConfig({ ativo: true });
      const n = Avisos.notificarPendentes();
      App.render();
      UI.toast(n ? `Avisos ligados · ${n} vencendo agora` : 'Avisos ligados');
    } catch (e) {
      App.render();
      UI.toast(e.message || 'Não foi possível ligar');
    }
  },

  exportarAgenda() {
    const n = Avisos.paraCalendario();
    UI.toast(n ? `${n} compromisso(s) no arquivo · abra para importar` : 'Nada para exportar');
  },

  /* — região: GPS, CEP ou lista — */

  async regiaoPorGPS() {
    UI.toast('Procurando sua localização…');
    try {
      const onde = await Regiao.porGPS();
      App.render();
      UI.toast(`${onde.municipio || onde.uf} · ${onde.uf}`);
    } catch (e) {
      UI.toast(e.message || 'Não foi possível usar o GPS');
    }
  },

  regiaoPorCEP() {
    UI.sheet({
      titulo: 'Informar CEP',
      sub: 'Só a cidade e o estado são usados — o endereço não é guardado.',
      campos: [{ name: 'cep', label: 'CEP', tipo: 'number', placeholder: '00000000', obrigatorio: true }],
      acao: 'Buscar',
      onSubmit: async (d) => {
        try {
          const onde = await Regiao.porCEP(d.cep);
          App.render();
          UI.toast(`${onde.municipio || onde.uf} · ${onde.uf}`);
        } catch (e) {
          UI.toast(e.message || 'CEP não encontrado');
        }
      },
    });
  },

  regiaoPorLista() {
    const atual = Regiao.local();
    UI.sheet({
      titulo: 'Escolher estado',
      sub: 'Basta a UF para o IPVA e o licenciamento. O município refina o preço do combustível.',
      campos: [
        {
          name: 'uf', label: 'Estado', tipo: 'select', valor: atual ? atual.uf : '',
          opcoes: Regiao.estados().map((e) => ({ value: e.uf, label: `${e.nome} (${e.uf})` })),
        },
        { name: 'municipio', label: 'Cidade', valor: atual ? atual.municipio : '' },
      ],
      onSubmit: (d) => {
        if (!d.uf) { UI.toast('Escolha o estado'); return; }
        Regiao.definir({ uf: d.uf, municipio: d.municipio, origem: 'lista' });
        App.render();
        UI.toast('Região atualizada');
      },
    });
  },

  /* — tabela FIPE — */

  /* Do formulário de cadastro: preenche o campo de valor. */
  consultarFipe(r, refs) {
    consultaFipe(r.tipo, r, (resultado) => {
      r.fipe = num(resultado.valor, 2);
      r.fipeRef = resultado;
      if (refs.fipe) refs.fipe.input.value = r.fipe;
      App.render();
      UI.toast(`FIPE ${resultado.referencia}: ${brl(resultado.valor)}`);
    });
  },

  /* Da tela de documentos: grava direto no veículo. */
  consultarFipeDoVeiculo(v) {
    consultaFipe(v.tipo, v, (resultado) => {
      Store.atualizarVeiculo(v.id, { fipe: resultado.valor, fipeRef: resultado });
      App.render();
      UI.toast(`FIPE ${resultado.referencia}: ${brl(resultado.valor)}`);
    });
  },

  /* — leitura por foto — */

  configurarGemini() { App.ir('gemini'); },

  copiar(texto, mensagem) {
    const avisar = () => UI.toast(mensagem || 'Copiado');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(avisar, () => UI.toast('Não foi possível copiar'));
      return;
    }
    // http puro (rede local) não tem clipboard: cai no método antigo.
    const campo = h('textarea', { style: { position: 'fixed', opacity: 0 } });
    campo.value = texto;
    document.body.append(campo);
    campo.select();
    try { document.execCommand('copy'); avisar(); }
    catch (e) { UI.toast('Não foi possível copiar'); }
    campo.remove();
  },

  pagarParcela(v) {
    const f = Calc.financiamentoStatus(v);
    UI.confirmar({
      titulo: 'Parcela do financiamento',
      texto: `${brl(f.parcela)} — o valor entra no histórico de custos de hoje e sobram ${f.restantes - 1}.`,
      acao: 'Registrar pagamento',
      onOk: () => {
        const msg = Store.pagarParcelaFinanciamento(v.id);
        App.render();
        UI.toast(msg || 'Nada a pagar');
      },
    });
  },

  pagar(v, s) {
    UI.confirmar({
      titulo: s.acao,
      texto: `${s.titulo} — ${s.valorTexto}. O valor entra no histórico de custos de hoje.`,
      acao: 'Confirmar pagamento',
      onOk: () => {
        const msg = Store.pagarDocumento(v.id, s.doc.id);
        App.render();
        UI.toast(msg || 'Nada pendente');
      },
    });
  },

  /* — custos — */

  editarConsumo(v) {
    UI.sheet({
      titulo: 'Consumo de referência', sub: 'Usado quando falta histórico',
      campos: [
        { name: 'consumo', label: 'Km por litro', tipo: 'dinheiro', valor: v.consumo, obrigatorio: true, meio: true },
        { name: 'precoComb', label: 'Preço do litro', tipo: 'dinheiro', valor: v.precoComb, obrigatorio: true, meio: true },
      ],
      onSubmit: (d) => {
        Store.atualizarVeiculo(v.id, { consumo: d.consumo, precoComb: d.precoComb });
        App.render();
        UI.toast('Consumo de referência atualizado');
      },
    });
  },

  editarSim(campo, label, valor) {
    UI.sheet({
      titulo: label, sub: 'Simulação de financiamento',
      campos: [{ name: 'v', label, tipo: campo === 'meses' ? 'number' : 'dinheiro', valor, obrigatorio: true }],
      onSubmit: (d) => {
        App.setSim({ [campo]: campo === 'meses' ? clamp(Math.round(d.v), 1, 120) : d.v });
        App.render();
      },
    });
  },

  trocarSistema(s) {
    App.setSim({ sistema: s.sistema === 'price' ? 'sac' : 'price' });
    App.render();
    UI.toast(s.sistema === 'price' ? 'Sistema SAC' : 'Tabela Price');
  },

  /* — perfil e dados — */

  editarPerfil() {
    UI.sheet({
      titulo: 'Seu nome', sub: 'Aparece na tela inicial',
      campos: [{ name: 'nome', label: 'Nome', valor: Store.get().perfil.nome, obrigatorio: true }],
      onSubmit: (d) => { Store.atualizarPerfil({ nome: d.nome }); App.render(); },
    });
  },

  exportar() {
    const blob = new Blob([Store.exportar()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `autolog-${today()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    UI.toast('Arquivo gerado');
  },

  importar() {
    const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          Store.importar(fr.result);
          App.ir('inicio');
          UI.toast('Garagem importada');
        } catch (e) {
          UI.toast('Arquivo inválido');
        }
      };
      fr.readAsText(file);
    });
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  },

  sair() {
    UI.confirmar({
      titulo: 'Sair da conta',
      texto: 'A garagem continua salva neste aparelho; é só entrar de novo para vê-la.',
      acao: 'Sair',
      onOk: () => { Auth.sair(); App.ir('inicio'); },
    });
  },

  resetar() {
    UI.confirmar({
      titulo: 'Restaurar demonstração',
      texto: 'Seus veículos e lançamentos deste aparelho serão substituídos pelos dados de exemplo.',
      acao: 'Restaurar',
      onOk: () => { Store.resetar(); App.ir('inicio'); UI.toast('Dados de demonstração restaurados'); },
    });
  },
};

/* ── Bootstrap ─────────────────────────────────────────────────────────── */

document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') UI.fecharSheet(); });
App.render({ topo: true });

// Catálogo de marcas e modelos: carrega em segundo plano e redesenha se a
// tela de cadastro já estiver aberta esperando por ele.
Dados.carregar().then(() => { if (App.rota === 'veiculo') App.render(); });

// Preço de combustível da ANP e alíquotas de IPVA: arquivos pequenos, mas o
// app precisa abrir sem esperar por eles. Redesenha quando chegarem.
Regiao.carregar().then(() => App.render());

// Avisos de vencimento: o app não acorda o celular, então o momento possível
// de avisar é este — quando ele é aberto.
setTimeout(() => { try { Avisos.notificarPendentes(); } catch (e) { /* ignora */ } }, 1500);
