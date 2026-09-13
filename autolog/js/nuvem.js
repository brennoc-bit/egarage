/* ==========================================================================
   nuvem.js — a garagem na conta da pessoa.

   O QUE ESTA CAMADA RESOLVE
   O `Store` guarda tudo como um objeto aninhado: veículos, e dentro de cada
   um os documentos, os itens de manutenção e os lançamentos. O banco guarda
   isso em cinco tabelas separadas, com chave estrangeira entre elas. Este
   arquivo é o tradutor, nas duas direções — e mais nada. Nenhuma tela fala
   com o Supabase; nem esta camada decide regra de negócio.

   O DESENHO EM UMA FRASE
   O estado na memória continua sendo a verdade enquanto o app está aberto; o
   `localStorage` continua sendo a cópia imediata; o Supabase recebe, logo
   depois, só o que mudou.

   POR QUE "SÓ O QUE MUDOU"
   O `Store.salvar()` reescreve o estado inteiro a cada toque. Mandar a
   garagem completa junto seria algumas centenas de linhas por parcela paga.
   O espelho (`KEY_ESPELHO`) guarda como cada linha foi enviada da última vez;
   o que não mudou não sobe.

   O QUE AINDA NÃO ESTÁ AQUI
   - **Foto.** Continua só no aparelho. Ao trocar de celular ela não vai
     junto (a tabela tem `foto_path` esperando, e o bucket existe).
   - **Offline.** Sem rede, a gravação local acontece e o envio falha; o app
     avisa e tenta de novo na próxima gravação. Fila de verdade é o passo 4.
   - **Serviços.** A tabela `servicos` existe no banco, mas o app ainda não
     registra serviço sem custo. Ficar de fora é melhor que sincronizar uma
     lista sempre vazia — que apagaria o que outro aparelho tivesse gravado.
   ========================================================================== */
'use strict';

const Nuvem = (() => {
  const KEY_ESPELHO = 'autolog-espelho-v1';
  const KEY_BACKUP = 'autolog-antes-da-nuvem';

  /* A ordem é a da chave estrangeira: documento aponta para veículo, parcela
     aponta para documento. Inverter isso faz o banco recusar a gravação. */
  const ORDEM = ['veiculos', 'documentos', 'parcelas', 'manutencao', 'lancamentos'];

  let situacao = { fase: 'parado', quando: null, recado: '' };
  const ouvintes = [];
  let timer = null;
  let enviando = false;
  let repetir = false;

  /* ── Ids derivados ──────────────────────────────────────────────────────

     Documento, item de manutenção e parcela não têm id próprio no aparelho: o
     documento é `ipva`, o item é `oleo`, a parcela é o número 1. Esses nomes
     **se repetem entre veículos** — o `ipva` da moto e o do carro são o mesmo
     texto —, e a tabela exige id único por usuário.

     Derivar do pai em vez de sortear é o que torna o envio repetível: subir
     duas vezes a mesma garagem escreve nas mesmas linhas em vez de duplicar
     tudo, e não exige guardar tabela de-para nenhuma. */
  const idDoc = (vid, docId) => `${vid}:${docId}`;
  const idItem = (vid, itemId) => `${vid}:${itemId}`;
  const idParcela = (docRow, n) => `${docRow}#${n}`;

  /* `undefined` num upsert quer dizer "não mexa nesta coluna", e não "apague".
     Um campo que a pessoa esvaziou precisa virar `null` explícito, senão o
     valor antigo fica lá para sempre. */
  const ou = (x) => (x === undefined || x === '' ? null : x);
  const inteiro = (x) => (x === undefined || x === null || x === '' ? null : Math.round(Number(x)));
  const numero = (x) => (x === undefined || x === null || x === '' ? null : Number(x));

  /* ── Estado → linhas ───────────────────────────────────────────────── */

  function linhasDoEstado(state, userId) {
    const saida = { perfis: [], veiculos: [], documentos: [], parcelas: [], manutencao: [], lancamentos: [] };
    const perfil = state.perfil || {};

    saida.perfis.push({
      user_id: userId,
      nome: ou(perfil.nome),
      uf: ou(perfil.uf),
      municipio: ou(perfil.municipio),
      veiculo_selecionado: ou(state.selecionado),
    });

    (state.veiculos || []).forEach((v) => {
      saida.veiculos.push({
        user_id: userId, id: v.id,
        tipo: v.tipo || 'carro',
        marca: ou(v.marca), modelo: ou(v.modelo), apelido: ou(v.apelido),
        cor: ou(v.cor), combustivel: ou(v.combustivel), motor: ou(v.motor),
        ano: inteiro(v.ano),
        placa: ou(v.placa), renavam: ou(v.renavam), chassi: ou(v.chassi),
        odometro: inteiro(v.odometro) || 0,
        consumo: numero(v.consumo), preco_comb: numero(v.precoComb),
        preco_comb_manual: !!v.precoCombManual,
        fipe: numero(v.fipe), fipe_ref: v.fipeRef || null,
        compra: ou(v.compra),
        // A imagem ainda não sobe; a coluna fica esperando o próximo passo.
        foto_path: null,
        financiamento: v.financiamento || { quitado: true },
        removido_em: null,
      });

      (v.docs || []).forEach((d) => {
        const id = idDoc(v.id, d.id);
        saida.documentos.push({
          user_id: userId, id, veiculo_id: v.id, doc_id: d.id,
          tipo: d.tipo || 'unico',
          tag: ou(d.tag), titulo: ou(d.titulo), sub: ou(d.sub),
          valor: numero(d.valor), venc: ou(d.venc), inicio: ou(d.inicio),
          pago: !!d.pago, estimado: !!d.estimado,
          alvo_km: inteiro(d.alvoKm),
          coberturas: d.coberturas || null,
          pagamento: d.pagamento || null,
          apolice: d.apolice || null,
          agendada: d.agendada || null,
          removido_em: null,
        });

        (d.parcelas || []).forEach((p) => saida.parcelas.push({
          user_id: userId, id: idParcela(id, p.n), documento_id: id,
          n: inteiro(p.n), valor: numero(p.valor) || 0,
          venc: ou(p.venc), pago: !!p.pago,
          removido_em: null,
        }));
      });

      (v.manutencao || []).forEach((m) => saida.manutencao.push({
        user_id: userId, id: idItem(v.id, m.id), veiculo_id: v.id, item_id: m.id,
        nome: m.nome || m.id,
        oficina: ou(m.oficina),
        intervalo_km: inteiro(m.intervaloKm), intervalo_meses: inteiro(m.intervaloMeses),
        alerta_km: inteiro(m.alertaKm), alerta_meses: inteiro(m.alertaMeses),
        ultimo_km: inteiro(m.ultimoKm), ultima_data: ou(m.ultimaData),
        personalizado: !!m.personalizado,
        origem_intervalo: m.origemIntervalo || 'padrao',
        removido_em: null,
      }));

      (v.lancamentos || []).forEach((l) => saida.lancamentos.push({
        user_id: userId, id: l.id, veiculo_id: v.id,
        data: l.data, tipo: l.tipo || 'outros',
        titulo: ou(l.titulo), local: ou(l.local),
        valor: numero(l.valor) || 0, litros: numero(l.litros),
        odometro: inteiro(l.odometro), item_id: ou(l.itemId),
        removido_em: null,
      }));
    });

    return saida;
  }

  /* ── Linhas → estado ───────────────────────────────────────────────── */

  /* Campo nulo volta a não existir, em vez de virar `null`. O app inteiro
     testa `if (d.venc)` e `d.apolice ? … : …`; um `null` passaria nesses
     testes do mesmo jeito, mas apareceria na exportação `.json` como lixo. */
  function limpar(obj) {
    const r = {};
    Object.keys(obj).forEach((k) => { if (obj[k] !== null && obj[k] !== undefined) r[k] = obj[k]; });
    return r;
  }

  /* ── Ordem ──────────────────────────────────────────────────────────────

     TABELA NÃO TEM ORDEM, E ARRAY TEM.
     O `select` devolve as linhas na ordem que o Postgres quiser, e isso muda
     entre consultas. Para quase tudo dá na mesma — o app filtra e soma —, mas
     a aba Documentos **desenha os cartões na ordem do array**: sem regra, a
     mesma garagem apareceria com IPVA em cima numa abertura e Seguro na
     outra.

     Então a ordem é reposta aqui, e de propósito é a mesma que o app usa ao
     criar: imposto, licenciamento, seguro, revisão. Os itens de manutenção
     seguem a ordem do plano do tipo de veículo, que é como a lista foi
     pensada. O que o catálogo não conhecer cai no fim, em ordem alfabética,
     em vez de sumir.

     Lançamento é ordenado por data e, no empate, por id. O empate importa:
     duas notas do mesmo dia precisam aparecer na mesma sequência nos dois
     aparelhos, e o id é o único critério que os dois compartilham. */
  const ORDEM_DOCS = ['ipva', 'licenciamento', 'seguro', 'revisao'];

  function porCatalogo(catalogo, chave) {
    return (a, b) => {
      const ia = catalogo.indexOf(a[chave]);
      const ib = catalogo.indexOf(b[chave]);
      if (ia === -1 && ib === -1) return String(a[chave]).localeCompare(String(b[chave]));
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    };
  }

  function planoDoTipo(tipo) {
    try { return (PLANO_MANUTENCAO[tipo] || []).map((i) => i.id); }
    catch (e) { return []; }
  }

  function estadoDasLinhas(dados) {
    const perfilRow = (dados.perfis || [])[0] || {};
    const porVeiculo = (lista, campo) => {
      const mapa = {};
      (lista || []).forEach((r) => { (mapa[r[campo]] = mapa[r[campo]] || []).push(r); });
      return mapa;
    };

    const docsPorV = porVeiculo(dados.documentos, 'veiculo_id');
    const manutPorV = porVeiculo(dados.manutencao, 'veiculo_id');
    const lancPorV = porVeiculo(dados.lancamentos, 'veiculo_id');
    const parcPorDoc = porVeiculo(dados.parcelas, 'documento_id');

    const veiculos = (dados.veiculos || [])
      .slice()
      .sort((a, b) => String(a.criado_em || '').localeCompare(String(b.criado_em || '')))
      .map((r) => limpar({
      id: r.id, tipo: r.tipo,
      marca: r.marca, modelo: r.modelo, apelido: r.apelido,
      cor: r.cor, combustivel: r.combustivel, motor: r.motor,
      ano: r.ano, placa: r.placa, renavam: r.renavam, chassi: r.chassi,
      odometro: r.odometro,
      consumo: r.consumo == null ? null : Number(r.consumo),
      precoComb: r.preco_comb == null ? null : Number(r.preco_comb),
      precoCombManual: r.preco_comb_manual || undefined,
      fipe: r.fipe == null ? null : Number(r.fipe),
      fipeRef: r.fipe_ref, compra: r.compra,
      foto: null,
      financiamento: r.financiamento || { quitado: true },

      docs: (docsPorV[r.id] || [])
        .slice().sort(porCatalogo(ORDEM_DOCS, 'doc_id'))
        .map((d) => limpar({
        id: d.doc_id, tag: d.tag, titulo: d.titulo, sub: d.sub, tipo: d.tipo,
        valor: d.valor == null ? null : Number(d.valor),
        venc: d.venc, inicio: d.inicio,
        pago: d.pago || undefined,
        estimado: d.estimado || undefined,
        alvoKm: d.alvo_km,
        coberturas: d.coberturas, pagamento: d.pagamento, apolice: d.apolice,
        agendada: d.agendada,
        parcelas: d.tipo === 'parcelas'
          ? (parcPorDoc[d.id] || [])
              .slice().sort((a, b) => a.n - b.n)
              .map((p) => limpar({ n: p.n, valor: Number(p.valor), venc: p.venc, pago: !!p.pago }))
          : null,
      })),

      manutencao: (manutPorV[r.id] || [])
        .slice().sort(porCatalogo(planoDoTipo(r.tipo), 'item_id'))
        .map((m) => limpar({
        id: m.item_id, nome: m.nome, oficina: m.oficina,
        intervaloKm: m.intervalo_km, intervaloMeses: m.intervalo_meses,
        alertaKm: m.alerta_km, alertaMeses: m.alerta_meses,
        ultimoKm: m.ultimo_km, ultimaData: m.ultima_data,
        personalizado: m.personalizado || undefined,
        origemIntervalo: m.origem_intervalo === 'padrao' ? undefined : m.origem_intervalo,
      })),

      lancamentos: (lancPorV[r.id] || [])
        .slice().sort((a, b) => String(a.data).localeCompare(String(b.data))
          || String(a.id).localeCompare(String(b.id)))
        .map((l) => limpar({
          id: l.id, data: l.data, tipo: l.tipo, titulo: l.titulo, local: l.local,
          valor: Number(l.valor),
          litros: l.litros == null ? null : Number(l.litros),
          odometro: l.odometro, itemId: l.item_id,
        })),
    }));

    // `foto` volta explicitamente como null: `limpar` a tiraria, e o resto do
    // app espera a chave existindo para saber que não há imagem.
    veiculos.forEach((v) => { if (!('foto' in v)) v.foto = null; });

    return {
      versao: 2,
      perfil: limpar({ nome: perfilRow.nome, uf: perfilRow.uf, municipio: perfilRow.municipio }),
      selecionado: perfilRow.veiculo_selecionado || (veiculos[0] ? veiculos[0].id : null),
      veiculos,
    };
  }

  /* ── Espelho do que já foi enviado ─────────────────────────────────── */

  const lerEspelho = () => {
    try { return JSON.parse(localStorage.getItem(KEY_ESPELHO)) || {}; }
    catch (e) { return {}; }
  };
  const gravarEspelho = (e) => {
    try { localStorage.setItem(KEY_ESPELHO, JSON.stringify(e)); }
    catch (err) { console.warn('[nuvem] espelho não coube no armazenamento', err); }
  };
  const esquecerEspelho = () => {
    try { localStorage.removeItem(KEY_ESPELHO); } catch (e) { /* ignora */ }
  };

  /* ── Situação, para a tela poder contar ────────────────────────────── */

  function anunciar(fase, recado) {
    situacao = { fase, quando: new Date().toISOString(), recado: recado || '' };
    ouvintes.forEach((fn) => { try { fn(situacao); } catch (e) { /* ignora */ } });
  }
  const estado = () => situacao;
  const aoMudar = (fn) => { ouvintes.push(fn); };

  /* ── Rede ──────────────────────────────────────────────────────────── */

  const cliente = () => (typeof Conta !== 'undefined' ? Conta.cliente() : null);
  const usuarioId = () => {
    const u = typeof Conta !== 'undefined' ? Conta.usuario() : null;
    return u ? u.id : null;
  };
  const ligado = () => !!(cliente() && usuarioId());

  /** Traz tudo do servidor. Devolve `null` quando a conta ainda não tem nada. */
  async function baixar() {
    const sb = cliente();
    const uid = usuarioId();
    if (!sb || !uid) throw new Error('Sem sessão para sincronizar.');

    const dados = {};
    const perfil = await sb.from('perfis').select('*').eq('user_id', uid);
    if (perfil.error) throw new Error(perfil.error.message);
    dados.perfis = perfil.data || [];

    for (const t of ORDEM) {
      dados[t] = await paginado(sb, t, uid);
    }
    return dados;
  }

  /* O PostgREST tem teto de linhas por resposta (o padrão do painel é 1.000).
     Quem abastece toda semana passa de 1.000 lançamentos em pouco mais de
     quinze anos — mas o teto também pode ser baixado a qualquer momento no
     painel, e aí a garagem voltaria cortada **sem erro nenhum**: o app
     simplesmente não veria os lançamentos mais antigos. Pedir em faixas tira
     essa bomba-relógio do caminho.

     `user_id` explícito não é redundância inútil: o RLS já filtra, mas deixar
     a intenção escrita evita que uma policy mal editada no futuro transforme
     uma leitura em vazamento silencioso. */
  const TAMANHO_FAIXA = 1000;

  async function paginado(sb, tabela, uid) {
    const tudo = [];
    for (let de = 0; ; de += TAMANHO_FAIXA) {
      // `removido_em is null` é o que faz a lápide funcionar: a linha continua
      // no banco para o outro aparelho saber que morreu, e some da leitura.
      const r = await sb.from(tabela).select('*')
        .eq('user_id', uid)
        .is('removido_em', null)
        .order('id', { ascending: true })
        .range(de, de + TAMANHO_FAIXA - 1);
      if (r.error) throw new Error(`${tabela}: ${r.error.message}`);
      const lote = r.data || [];
      tudo.push(...lote);
      if (lote.length < TAMANHO_FAIXA) return tudo;
    }
  }

  /** O servidor já tem garagem nesta conta? */
  async function temGaragem() {
    const sb = cliente();
    if (!sb) return false;
    const uid = usuarioId();
    const r = await sb.from('veiculos').select('id')
      .eq('user_id', uid).is('removido_em', null).limit(1);
    if (r.error) throw new Error(r.error.message);
    return (r.data || []).length > 0;
  }

  /* Compara o que o estado produz agora com o que foi enviado da última vez.
     Devolve o que precisa subir e o que precisa ser marcado como removido. */
  function diferenca(linhas, espelho) {
    const novo = {};
    const subir = {};
    const apagar = {};

    ORDEM.concat('perfis').forEach((t) => { subir[t] = []; apagar[t] = []; });

    Object.keys(linhas).forEach((t) => {
      linhas[t].forEach((row) => {
        const chave = `${t}/${row.id || row.user_id}`;
        const texto = JSON.stringify(row);
        novo[chave] = texto;
        if (espelho[chave] !== texto) subir[t].push(row);
      });
    });

    Object.keys(espelho).forEach((chave) => {
      if (novo[chave] !== undefined) return;
      const [t, id] = [chave.slice(0, chave.indexOf('/')), chave.slice(chave.indexOf('/') + 1)];
      if (t === 'perfis') return; // perfil não se apaga: a conta é a linha
      if (apagar[t]) apagar[t].push(id);
    });

    return { subir, apagar, novo };
  }

  /** Manda para o servidor o que mudou desde o último envio. */
  async function enviar(state) {
    const sb = cliente();
    const uid = usuarioId();
    if (!sb || !uid) return { pulou: true };

    const linhas = linhasDoEstado(state, uid);
    const espelho = lerEspelho();
    const { subir, apagar, novo } = diferenca(linhas, espelho);

    const total = ORDEM.concat('perfis').reduce((s, t) => s + subir[t].length + apagar[t].length, 0);
    if (!total) return { nada: true };

    anunciar('enviando');

    // Perfil primeiro (é a linha dona), depois a ordem da chave estrangeira.
    for (const t of ['perfis'].concat(ORDEM)) {
      if (!subir[t].length) continue;
      const chaveConflito = t === 'perfis' ? 'user_id' : 'user_id,id';
      const r = await sb.from(t).upsert(subir[t], { onConflict: chaveConflito });
      if (r.error) throw new Error(`${t}: ${r.error.message}`);
    }

    /* Remoção é ao contrário: a parcela morre antes do documento, o documento
       antes do veículo. Com `on delete cascade` o banco não reclamaria, mas
       aqui não se apaga nada — marca-se —, então a ordem é nossa. */
    for (const t of ORDEM.slice().reverse()) {
      if (!apagar[t].length) continue;
      const r = await sb.from(t)
        .update({ removido_em: new Date().toISOString() })
        .eq('user_id', uid)
        .in('id', apagar[t]);
      if (r.error) throw new Error(`${t} (remoção): ${r.error.message}`);
    }

    gravarEspelho(novo);
    return { enviadas: total };
  }

  /* ── O gatilho que o Store puxa ────────────────────────────────────── */

  /* `Store.salvar()` roda a cada toque, e vários seguidos são comuns (pagar
     parcela grava o documento e lança a despesa). Esperar meio segundo junta
     essas gravações num envio só. */
  function aoSalvar(state) {
    if (!ligado()) return;
    clearTimeout(timer);
    timer = setTimeout(() => { despachar(state); }, 500);
  }

  async function despachar(state) {
    if (enviando) { repetir = true; return; }
    enviando = true;
    try {
      const r = await enviar(state);
      if (!r.pulou && !r.nada) anunciar('salvo');
    } catch (e) {
      // Sem rede ou servidor recusando: o dado local está salvo, então isto
      // não é perda — é atraso. A próxima gravação tenta de novo, porque o
      // espelho só é atualizado quando o envio dá certo.
      console.warn('[nuvem] envio falhou', e);
      anunciar('erro', traduzir(e));
    } finally {
      enviando = false;
      if (repetir) { repetir = false; despachar(state); }
    }
  }

  function traduzir(e) {
    const m = String((e && e.message) || '').toLowerCase();
    if (m.includes('failed to fetch') || m.includes('networkerror')) {
      return 'Sem conexão — salvo neste aparelho';
    }
    if (m.includes('jwt') || m.includes('expired')) return 'Sessão expirada — entre de novo';
    return 'Não consegui salvar na conta agora';
  }

  return {
    linhasDoEstado, estadoDasLinhas,
    baixar, enviar, temGaragem, ligado,
    aoSalvar, estado, aoMudar, anunciar,
    lerEspelho, gravarEspelho, esquecerEspelho,
    KEY_BACKUP,
  };
})();

/* ==========================================================================
   Sincronia — a política, separada do transporte.

   O `Nuvem` acima sabe converter e sabe falar com o servidor. Ele não decide
   nada. Quem decide quem ganha quando o aparelho e a conta discordam é este
   bloco, e a regra de hoje cabe em duas linhas:

     · conta vazia  → sobe o que existe neste aparelho;
     · conta cheia  → a conta manda, e o que era local vira backup.

   POR QUE "A CONTA MANDA", E POR QUE ISSO NÃO É PERIGOSO AINDA
   Sem fusão de verdade — que é o passo 4 — alguém tem de ganhar, e escolher o
   servidor é o que faz o segundo aparelho mostrar a mesma garagem do
   primeiro, que é o ponto de ter conta. O risco seria descartar dado que só
   existia no aparelho; por isso o estado local é **copiado inteiro** para
   `autolog-antes-da-nuvem` antes de qualquer substituição. Nada fica
   irrecuperável, nem por engano meu.

   A CONTA VAZIA NUNCA DESCARTA NADA
   Tentar adivinhar "isto aqui é só dado de demonstração, pode jogar fora"
   seria apostar contra o caso real de quem editou a moto de exemplo até virar
   a moto dele. Sobe tudo; apagar o que não presta é decisão da pessoa.
   ========================================================================== */

const Sincronia = (() => {
  /* A imagem ainda não viaja para o Storage. Sem isto, entrar na conta num
     aparelho que já tinha foto apagaria a foto da tela — o servidor não tem o
     que devolver no lugar. */
  function preservarFotos(novo, antigo) {
    const porId = {};
    (antigo.veiculos || []).forEach((v) => { if (v.foto) porId[v.id] = v.foto; });
    (novo.veiculos || []).forEach((v) => { if (!v.foto && porId[v.id]) v.foto = porId[v.id]; });
  }

  function guardarBackup(estadoLocal) {
    try {
      localStorage.setItem(Nuvem.KEY_BACKUP, JSON.stringify({
        em: new Date().toISOString(), estado: estadoLocal,
      }));
    } catch (e) {
      console.warn('[sincronia] backup local não coube no armazenamento', e);
    }
  }

  /* O espelho precisa refletir o que o servidor tem, senão a próxima gravação
     reenviaria a garagem inteira. Ele é montado a partir do estado já
     reconstruído — as mesmas linhas que um envio produziria. */
  function espelharAtual() {
    const u = Conta.usuario();
    if (!u) return;
    const linhas = Nuvem.linhasDoEstado(Store.get(), u.id);
    const mapa = {};
    Object.keys(linhas).forEach((t) => linhas[t].forEach((r) => {
      mapa[`${t}/${r.id || r.user_id}`] = JSON.stringify(r);
    }));
    Nuvem.gravarEspelho(mapa);
  }

  async function aoEntrar() {
    if (!Nuvem.ligado()) return { pulou: true };
    try {
      Nuvem.anunciar('baixando');

      if (await Nuvem.temGaragem()) {
        const dados = await Nuvem.baixar();
        const novo = Nuvem.estadoDasLinhas(dados);
        const antigo = Store.get();
        guardarBackup(antigo);
        preservarFotos(novo, antigo);
        Store.substituirEstado(novo);
        espelharAtual();
        Nuvem.anunciar('salvo', 'garagem da conta carregada');
        return { baixou: (novo.veiculos || []).length };
      }

      // Conta nova: o espelho de uma sessão anterior mentiria sobre o que o
      // servidor tem. Zerar força o envio completo.
      Nuvem.esquecerEspelho();
      const r = await Nuvem.enviar(Store.get());
      Nuvem.anunciar('salvo', r.nada ? 'nada para enviar' : 'garagem enviada para a conta');
      return { subiu: r.enviadas || 0 };
    } catch (e) {
      console.warn('[sincronia] não consegui sincronizar ao entrar', e);
      Nuvem.anunciar('erro', 'Não consegui carregar a garagem da conta');
      return { erro: e };
    }
  }

  /* Sair não apaga a garagem do aparelho — ela continua servindo offline e é
     o que a pessoa vê se entrar de novo na mesma conta. O espelho, sim, some:
     ele fala de uma conta específica, e mantê-lo faria o próximo login achar
     que já enviou coisas que talvez sejam de outra pessoa. */
  function aoSair() {
    Nuvem.esquecerEspelho();
    Nuvem.anunciar('parado');
  }

  return { aoEntrar, aoSair, espelharAtual };
})();
