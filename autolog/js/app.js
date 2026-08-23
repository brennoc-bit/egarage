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
const NAV_PAI = { manutencao: 'garagem', veiculo: 'garagem' };

const App = {
  rota: 'inicio',
  sub: { garagem: 'resumo', docs: 'todos', custos: 'km', periodo: 30, historico: 6, veiculoId: null },
  _sim: {},
  _rascunho: null,

  ir(rota, sub) {
    const mudou = rota !== this.rota;
    // Sair do cadastro descarta o que estava sendo digitado.
    if (this.rota === 'veiculo' && rota !== 'veiculo') this.limparRascunho();
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
        foto: base.foto || null,
        quitado: extras.quitado !== false,
        parcela: texto(extras.parcela), parcelasRestantes: texto(extras.parcelasRestantes),
        diaVencimento: texto(extras.diaVencimento),
        ipvaValor: texto(extras.ipvaValor), ipvaParcelas: texto(extras.ipvaParcelas),
        ipvaVenc: texto(extras.ipvaVenc),
        seguroValor: texto(extras.seguroValor), seguroVenc: texto(extras.seguroVenc),
        seguroNome: texto(extras.seguroNome),
        licValor: texto(extras.licValor), licVenc: texto(extras.licVenc),
      };
    }
    return this._rascunho;
  },
  limparRascunho() { this._rascunho = null; },
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
    if (this.rota !== 'veiculo') {
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
    UI.pedirFoto((dataUrl) => {
      Store.atualizarVeiculo(v.id, { foto: dataUrl });
      App.render();
      UI.toast('Foto atualizada');
    });
  },

  atualizarOdometro(v) {
    UI.sheet({
      titulo: 'Odômetro', sub: 'Quilometragem atual',
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
