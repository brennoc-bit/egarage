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
  const KEY_MARCA = 'autolog-marca-leitura-v1';
  const KEY_CONFLITOS = 'autolog-conflitos-v1';

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

  /* ── Forma canônica ─────────────────────────────────────────────────────

     COMPARAR LINHA LOCAL COM LINHA DO SERVIDOR EXIGE UMA FORMA SÓ.
     A linha que volta do banco não é igual à que eu montei, mesmo com o mesmo
     conteúdo: vem com `atualizado_em` e `criado_em` a mais, e o `jsonb` volta
     com as chaves reordenadas pelo Postgres (que ordena por tamanho e depois
     por byte). O `financiamento` que eu mando como
     `{quitado, parcela, restantes, dia}` volta como `{dia, parcela, quitado,
     restantes}`.

     Sem normalizar, `JSON.stringify` diria que as duas são diferentes e o app
     reenviaria todo veículo financiado em toda gravação, para sempre, sem
     nada ter mudado.

     `canonico` projeta qualquer linha — minha ou do servidor — nas mesmas
     colunas, na mesma ordem, com os mesmos tipos. É o que o espelho guarda e
     é o que a fusão compara. */
  const COLUNAS = {
    perfis: ['user_id', 'nome', 'uf', 'municipio', 'veiculo_selecionado'],
    veiculos: ['id', 'tipo', 'marca', 'modelo', 'apelido', 'cor', 'combustivel', 'motor',
      'ano', 'placa', 'renavam', 'chassi', 'odometro', 'consumo', 'preco_comb',
      'preco_comb_manual', 'fipe', 'fipe_ref', 'compra', 'foto_path', 'financiamento'],
    documentos: ['id', 'veiculo_id', 'doc_id', 'tipo', 'tag', 'titulo', 'sub', 'valor',
      'venc', 'inicio', 'pago', 'estimado', 'alvo_km', 'coberturas', 'pagamento',
      'apolice', 'agendada'],
    parcelas: ['id', 'documento_id', 'n', 'valor', 'venc', 'pago'],
    manutencao: ['id', 'veiculo_id', 'item_id', 'nome', 'oficina', 'intervalo_km',
      'intervalo_meses', 'alerta_km', 'alerta_meses', 'ultimo_km', 'ultima_data',
      'personalizado', 'origem_intervalo'],
    lancamentos: ['id', 'veiculo_id', 'data', 'tipo', 'titulo', 'local', 'valor',
      'litros', 'odometro', 'item_id'],
  };

  // Colunas numéricas: o PostgREST pode devolver `numeric` como texto, e
  // "148.2" !== 148.2 criaria diferença onde não há.
  const NUMERICAS = new Set(['valor', 'litros', 'consumo', 'preco_comb', 'fipe',
    'odometro', 'ano', 'n', 'alvo_km', 'intervalo_km', 'intervalo_meses',
    'alerta_km', 'alerta_meses', 'ultimo_km']);

  /* Ordena as chaves de objeto recursivamente, para o `jsonb` reordenado pelo
     banco e o objeto montado aqui virarem o mesmo texto. */
  function estavel(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(estavel);
    const r = {};
    Object.keys(v).sort().forEach((k) => { r[k] = estavel(v[k]); });
    return r;
  }

  function canonico(tabela, row) {
    const cols = COLUNAS[tabela] || [];
    const out = {};
    cols.forEach((c) => {
      let x = row[c];
      if (x === undefined || x === '') x = null;
      if (x !== null && NUMERICAS.has(c)) x = Number(x);
      if (typeof x === 'boolean' || x === null || typeof x === 'number') out[c] = x;
      else out[c] = estavel(x);
    });
    // A lápide entra na comparação: uma linha removida no servidor tem de
    // parecer diferente da mesma linha viva.
    out.__removida = row.removido_em ? true : false;
    return JSON.stringify(out);
  }

  const chaveDe = (tabela, row) => `${tabela}/${row.id || row.user_id}`;

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

  function anunciar(fase, recado, extra) {
    situacao = Object.assign(
      { fase, quando: new Date().toISOString(), recado: recado || '', aceitas: 0 },
      extra || {});
    ouvintes.forEach((fn) => { try { fn(situacao); } catch (e) { /* ignora */ } });
  }
  const estado = () => situacao;
  const aoMudar = (fn) => { ouvintes.push(fn); };

  /* ── Rede ──────────────────────────────────────────────────────────── */

  /* PRAZO PRÓPRIO EM TODA CHAMADA — NÃO É PARANOIA, É BUG MEDIDO

     Com o `fetch` rejeitando (que é o que um celular sem sinal faz), o
     `select` do supabase-js **nunca se resolve**: a promessa fica pendurada
     para sempre. Medido aqui, na versão 2.116 — a leitura pendura, o `upsert`
     devolve erro normalmente.

     Isso passou despercebido no passo 3 porque lá só havia escrita. O passo 4
     lê antes de escrever, e sem prazo o efeito seria o pior possível: a tela
     presa em "Sincronizando…" para sempre, sem erro, sem nova tentativa, e com
     o envio travado bloqueando todas as gravações seguintes.

     Vinte segundos: rede de celular ruim é lenta, e desistir cedo demais
     criaria falha falsa. Desistir não custa nada — o espelho não avança e a
     próxima tentativa refaz tudo. */
  const PRAZO = 20000;

  function comPrazo(promessa, oQue) {
    let id;
    const estouro = new Promise((_, rejeita) => {
      id = setTimeout(() => rejeita(new Error(`Sem resposta em ${oQue}`)), PRAZO);
    });
    return Promise.race([promessa, estouro]).finally(() => clearTimeout(id));
  }

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
      const r = await comPrazo(sb.from(tabela).select('*')
        .eq('user_id', uid)
        .is('removido_em', null)
        .order('id', { ascending: true })
        .range(de, de + TAMANHO_FAIXA - 1), tabela);
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
    const r = await comPrazo(sb.from('veiculos').select('id')
      .eq('user_id', uid).is('removido_em', null).limit(1), 'veiculos');
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
        const chave = chaveDe(t, row);
        const texto = canonico(t, row);
        novo[chave] = texto;
        if (espelho[chave] !== texto) subir[t].push(row);
      });
    });

    Object.keys(espelho).forEach((chave) => {
      if (novo[chave] !== undefined) return;
      const t = chave.slice(0, chave.indexOf('/'));
      const id = chave.slice(chave.indexOf('/') + 1);
      if (t === 'perfis') return; // perfil não se apaga: a conta e a linha
      if (apagar[t]) apagar[t].push(id);
    });

    return { subir, apagar, novo };
  }

  /* ── Fusao de três vias ────────────────────────────────────

     O passo 3 resolvia o encontro de duas garagens no muque: a do servidor
     ganhava inteira. Funciona para entrar numa conta pela primeira vez, e e
     errado para todo o resto — quem registrou um abastecimento no
     estacionamento sem sinal perderia o registro ao voltar para a rede.

     Aqui existem três versões de cada linha, e e isso que permite decidir sem
     chutar:

       · BASE   — o espelho: como a linha estava no servidor na última vez que
                  sincronizamos com sucesso;
       · LOCAL  — como ela está neste aparelho agora;
       · REMOTA — como ela está no servidor agora.

     | local vs base | remota vs base | o que acontece      |
     |---------------|----------------|---------------------|
     | igual         | igual          | nada                |
     | igual         | mudou          | aceita a remota     |
     | mudou         | igual          | sobe a local        |
     | mudou         | mudou          | conflito de verdade |

     As três primeiras linhas da tabela não perdem nada de ninguem, e cobrem
     praticamente todo uso real: as linhas são miúdas (um lançamento, uma
     parcela), então dois aparelhos mexerem na MESMA linha entre duas
     sincronizações é raro.

     NO CONFLITO, O APARELHO NA MAO GANHA — E O DESCARTADO FICA GUARDADO.
     Qualquer decisão automática perde alguma coisa. Escolhi perder a versão
     que a pessoa não está vendo: sumir da tela o que ela acabou de digitar e a
     mais assustadora das duas falhas. Para isso não virar perda silenciosa, a
     versão remota descartada vai para `autolog-conflitos-v1`, e o Perfil avisa
     enquanto esse registro não estiver vazio.

     Comparar por relógio seria mais "justo" no papel, mas relógio de celular
     erra: um aparelho adiantado venceria disputas que não deveria, e o erro
     seria invisivel. Prefiro uma regra que se explica em uma frase. */
  function fundir(locais, espelho, remotas) {
    const linhas = {};
    const conflitos = [];
    /* A base precisa acompanhar o que foi aceito. Sem isto, a linha que acabou
       de chegar do servidor continuaria diferente do espelho — e o envio logo
       em seguida a devolveria ao servidor, que carimbaria data nova, que
       voltaria na próxima leitura como novidade, para sempre. Dois aparelhos
       abertos ficariam empurrando a mesma linha um para o outro. */
    const base = Object.assign({}, espelho);
    let aceitas = 0;

    ['perfis'].concat(ORDEM).forEach((t) => {
      const porChave = {};
      (locais[t] || []).forEach((r) => { porChave[r.id || r.user_id] = r; });

      (remotas[t] || []).forEach((rem) => {
        const id = rem.id || rem.user_id;
        const chave = chaveDe(t, rem);
        // `baseLinha` é como ESTA linha estava; `base` (acima) é o mapa
        // inteiro. Nomes distintos porque já me custou um erro tê-los iguais.
        const baseLinha = espelho[chave];
        const textoRemoto = canonico(t, rem);
        const local = porChave[id];
        const textoLocal = local ? canonico(t, local) : undefined;

        const mudouRemoto = baseLinha !== textoRemoto;
        const mudouLocal = textoLocal !== baseLinha;

        /* Lápide que este aparelho já digeriu não é novidade nenhuma.
           A leitura usa `>=` na data, então a linha removida volta em toda
           consulta; sem esta saída, cada uma delas seria contada como
           "aceita" para sempre, reconstruindo o estado e redesenhando a tela a
           cada ciclo — de graça, e piorando conforme as lápides se acumulam. */
        if (rem.removido_em && !local && baseLinha === undefined) return;

        if (!mudouRemoto) return;               // servidor não trouxe novidade
        if (!mudouLocal) {                      // só o servidor mudou: aceita
          if (rem.removido_em) {
            delete porChave[id];
            delete base[chave];  // morreu dos dois lados: não há o que enviar
          } else {
            porChave[id] = doServidor(t, rem);
            base[chave] = textoRemoto;
          }
          aceitas++;
          return;
        }
        if (textoLocal === textoRemoto) return; // chegaram ao mesmo resultado

        conflitos.push({
          tabela: t, id, em: new Date().toISOString(),
          remotaDescartada: doServidor(t, rem),
        });
      });

      linhas[t] = Object.keys(porChave).map((k) => porChave[k]);
    });

    return { linhas, aceitas, conflitos, base };
  }

  /* ── O primeiro encontro ───────────────────────────────────

     Na primeira vez que este aparelho vê esta conta não existe espelho, e sem
     base não há como dizer o que mudou: a fusão de três vias acusaria conflito
     em toda linha que existisse dos dois lados, o que seria um alarme falso
     gigante.

     Entao aqui a regra e outra, e mais simples: **uniao, com o servidor tendo
     preferencia no que existe nos dois lados**.

     Isso e melhor do que a substituicao completa que o passo 3 fazia. Quem
     cadastrou um veículo no aparelho ANTES de entrar na conta tem id próprio
     naquele veículo — ele não colide com nada do servidor, e por isso sobrevive
     e sobe logo depois. O que se perde e só o que existe dos dois lados com o
     mesmo id, e ai o servidor e a fonte mais confiavel: e o que os outros
     aparelhos já combinaram entre si.

     (Os dois veiculos de demonstracao tem id fixo, `cb300f` e `onix`, então
     colidem de propósito: quem já subiu a garagem num aparelho não ganha uma
     segunda copia deles ao entrar no outro.) */
  function unir(locais, remotas) {
    const linhas = {};
    ['perfis'].concat(ORDEM).forEach((t) => {
      const porChave = {};
      (locais[t] || []).forEach((r) => { porChave[r.id || r.user_id] = r; });
      (remotas[t] || []).forEach((rem) => {
        const id = rem.id || rem.user_id;
        if (rem.removido_em) delete porChave[id];
        else porChave[id] = doServidor(t, rem);
      });
      linhas[t] = Object.keys(porChave).map((k) => porChave[k]);
    });
    return linhas;
  }

  /* Espelho montado a partir do que o servidor entregou — e não do estado
     local. E a diferença que faz o envio seguinte mandar exatamente as linhas
     que só existem neste aparelho, e mais nenhuma. */
  function espelharRemotas(dados) {
    const mapa = {};
    ['perfis'].concat(ORDEM).forEach((t) => {
      (dados[t] || []).forEach((r) => {
        if (r.removido_em) return;
        mapa[chaveDe(t, r)] = canonico(t, r);
      });
    });
    gravarEspelho(mapa);
  }

  /* Linha do servidor projetada nas colunas que este app gerencia. Sem isto,
     `atualizado_em` e `criado_em` voltariam no `upsert` — e `atualizado_em` e
     do banco, não nossa. */
  function doServidor(tabela, row) {
    const out = {};
    (COLUNAS[tabela] || []).forEach((c) => { out[c] = row[c] === undefined ? null : row[c]; });
    if (tabela !== 'perfis') out.removido_em = null;
    out.user_id = row.user_id;
    return out;
  }

  /* ── Marca da última leitura, e os conflitos ─────────────────── */

  /* Guardamos o `atualizado_em` mais novo que já vimos — carimbado pelo banco,
     nunca pelo celular, então relógio torto de aparelho não atrapalha.
     A busca seguinte usa `>=` e não `>`: linha gravada no mesmo instante da
     leitura seria pulada por um `>`, e reprocessar linha repetida não custa
     nada (a fusão vê que não mudou e ignora). */
  const lerMarca = () => {
    try { return localStorage.getItem(KEY_MARCA) || null; } catch (e) { return null; }
  };
  const gravarMarca = (iso) => {
    try { if (iso) localStorage.setItem(KEY_MARCA, iso); } catch (e) { /* cota */ }
  };
  const esquecerMarca = () => {
    try { localStorage.removeItem(KEY_MARCA); } catch (e) { /* ignora */ }
  };

  const lerConflitos = () => {
    try { return JSON.parse(localStorage.getItem(KEY_CONFLITOS)) || []; }
    catch (e) { return []; }
  };
  function guardarConflitos(novos) {
    if (!novos.length) return;
    try {
      // Teto de 50: isto e registro de exceção, não histórico. Estourar a cota
      // por causa dele seria trocar um problema raro por um pior.
      const tudo = lerConflitos().concat(novos).slice(-50);
      localStorage.setItem(KEY_CONFLITOS, JSON.stringify(tudo));
    } catch (e) { console.warn('[nuvem] nao consegui guardar o conflito', e); }
  }
  const limparConflitos = () => {
    try { localStorage.removeItem(KEY_CONFLITOS); } catch (e) { /* ignora */ }
  };

  /** Busca no servidor tudo que mudou desde a marca — lápides inclusive. */
  async function baixarDesde(marca) {
    const sb = cliente();
    const uid = usuarioId();
    if (!sb || !uid) throw new Error('Sem sessao para sincronizar.');

    const dados = {};
    let maisNova = marca;

    for (const t of ['perfis'].concat(ORDEM)) {
      const tudo = [];
      for (let de = 0; ; de += TAMANHO_FAIXA) {
        let q = sb.from(t).select('*').eq('user_id', uid);
        // Sem filtro de `removido_em`: a lápide e exatamente a novidade que
        // ensina este aparelho que a linha morreu no outro.
        if (marca) q = q.gte('atualizado_em', marca);
        const r = await comPrazo(
          q.order('id', { ascending: true }).range(de, de + TAMANHO_FAIXA - 1), t);
        if (r.error) throw new Error(`${t}: ${r.error.message}`);
        const lote = r.data || [];
        tudo.push(...lote);
        if (lote.length < TAMANHO_FAIXA) break;
      }
      tudo.forEach((r) => {
        if (r.atualizado_em && (!maisNova || r.atualizado_em > maisNova)) maisNova = r.atualizado_em;
      });
      dados[t] = tudo;
    }
    return { dados, marca: maisNova };
  }

  /* ── Um ciclo completo: puxar, fundir, empurrar ──────────────── */

  /* A ordem importa. Empurrar antes de puxar sobrescreveria, com dado velho, a
     mudança que o outro aparelho fez e que este ainda não viu — o "lost
     update" clássico. Puxando primeiro, a fusão enxerga as duas versões. */
  async function sincronizar(state) {
    const sb = cliente();
    const uid = usuarioId();
    if (!sb || !uid) return { pulou: true };

    anunciar('sincronizando');

    const marca = lerMarca();
    const puxado = await baixarDesde(marca);
    const espelho = lerEspelho();
    const locais = linhasDoEstado(state, uid);
    const { linhas, aceitas, conflitos, base } = fundir(locais, espelho, puxado.dados);

    if (conflitos.length) guardarConflitos(conflitos);

    // So reconstroi o estado se o servidor trouxe novidade: refazer os objetos
    // a toa custaria a posicao de rolagem e um piscar de tela.
    let estadoFinal = state;
    if (aceitas) estadoFinal = aplicarNoStore(estadoDasLinhas(linhas));

    // `base`, e não `espelho`: o que foi aceito já está combinado com o
    // servidor e não deve voltar para lá.
    const depois = linhasDoEstado(estadoFinal, uid);
    const d = diferenca(depois, base);
    const total = ['perfis'].concat(ORDEM)
      .reduce((n, t) => n + d.subir[t].length + d.apagar[t].length, 0);

    if (total) await empurrar(sb, uid, d.subir, d.apagar);

    gravarEspelho(d.novo);
    gravarMarca(puxado.marca);
    return { aceitas, enviadas: total, conflitos: conflitos.length };
  }

  /* Quem sabe mexer no `Store` e a `Sincronia`; aqui só existe o encaixe, para
     o `Nuvem` seguir sem depender dele. */
  let aplicarNoStore = (estado) => estado;
  const aoAplicar = (fn) => { aplicarNoStore = fn; };

  async function empurrar(sb, uid, subir, apagar) {
    // Perfil primeiro (e a linha dona), depois a ordem da chave estrangeira.
    for (const t of ['perfis'].concat(ORDEM)) {
      if (!subir[t].length) continue;
      const chaveConflito = t === 'perfis' ? 'user_id' : 'user_id,id';
      const r = await comPrazo(sb.from(t).upsert(subir[t], { onConflict: chaveConflito }), t);
      if (r.error) throw new Error(`${t}: ${r.error.message}`);
    }

    /* Remocao e ao contrario: a parcela morre antes do documento, o documento
       antes do veículo. Com `on delete cascade` o banco não reclamaria, mas
       aqui nada e apagado — e marcado —, então a ordem e nossa. */
    for (const t of ORDEM.slice().reverse()) {
      if (!apagar[t].length) continue;
      const r = await comPrazo(sb.from(t)
        .update({ removido_em: new Date().toISOString() })
        .eq('user_id', uid)
        .in('id', apagar[t]), t);
      if (r.error) throw new Error(`${t} (remoção): ${r.error.message}`);
    }
  }

  /** So empurra, sem puxar. Usado no primeiro envio de uma conta vazia. */
  async function enviar(state) {
    const sb = cliente();
    const uid = usuarioId();
    if (!sb || !uid) return { pulou: true };

    const linhas = linhasDoEstado(state, uid);
    const espelho = lerEspelho();
    const d = diferenca(linhas, espelho);
    const total = ORDEM.concat('perfis')
      .reduce((n, t) => n + d.subir[t].length + d.apagar[t].length, 0);
    if (!total) return { nada: true };

    anunciar('enviando');
    await empurrar(sb, uid, d.subir, d.apagar);
    gravarEspelho(d.novo);
    return { enviadas: total };
  }

  /* ── Quando sincronizar ──────────────────────────────────

     No passo 3 havia um gatilho so: gravou, mandou. Se aquela tentativa
     falhasse, nada tentava de novo ate a gravacao seguinte — e quem registrou
     o abastecimento no estacionamento sem sinal e guardou o celular no bolso
     nunca mais gravava nada. O registro ficava só ali.

     Agora são quatro momentos, e juntos eles não deixam buraco:

       1. GRAVOU  — meio segundo depois, agrupando toques seguidos;
       2. VOLTOU A REDE (`online`) — o momento exato em que vale insistir;
       3. APP VEIO PARA A FRENTE — e tambem quando ele abre, pela `Sincronia`;
       4. TENTATIVA COM ESPERA CRESCENTE depois de uma falha: 8s, 30s, 2min.

     A espera cresce de propósito. Tentar de segundo em segundo dentro de um
     túnel gasta bateria e não resolve nada; depois da terceira, o app para de
     insistir sozinho e fica esperando um dos outros três sinais.

     O QUE TORNA ISSO SEGURO DE VERDADE não e nenhum desses temporizadores: e o
     espelho só avançar quando o envio da certo. Enquanto não deu, a mudança
     continua aparecendo como pendente — mesmo que o app feche, mesmo que o
     celular reinicie. Na próxima abertura com rede, ela sobe. */

  const ESPERAS = [8000, 30000, 120000];
  let tentativa = 0;
  let timerTentativa = null;
  let falhou = false;
  let ultimoEstado = null;

  const temPendencia = () => falhou;

  function aoSalvar(state) {
    ultimoEstado = state;
    if (!ligado()) return;
    clearTimeout(timer);
    timer = setTimeout(() => { despachar(state); }, 500);
  }

  /** Forca um ciclo agora — usada pelos gatilhos de rede e de foco. */
  function tentarAgora(state) {
    const alvo = state || ultimoEstado;
    if (!alvo || !ligado()) return Promise.resolve({ pulou: true });
    clearTimeout(timerTentativa);
    return despachar(alvo);
  }

  function agendarTentativa(state) {
    if (tentativa >= ESPERAS.length) return;
    const espera = ESPERAS[tentativa];
    tentativa += 1;
    clearTimeout(timerTentativa);
    timerTentativa = setTimeout(() => { despachar(state); }, espera);
  }

  async function despachar(state) {
    ultimoEstado = state;
    if (enviando) { repetir = true; return; }
    enviando = true;
    try {
      const r = await sincronizar(state);
      falhou = false;
      tentativa = 0;
      if (!r.pulou) {
        // `aceitas` conta o que veio do outro aparelho. Quem ouve usa esse
        // número para decidir se vale redesenhar a tela: sem novidade, um
        // render a cada gravação seria trabalho à toa.
        const extra = { aceitas: r.aceitas || 0 };
        if (r.conflitos) {
          const n = r.conflitos;
          anunciar('conflito', n === 1
            ? '1 mudança do outro aparelho foi descartada'
            : `${n} mudanças do outro aparelho foram descartadas`, extra);
        } else anunciar('salvo', '', extra);
      }
    } catch (e) {
      /* Sem rede, ou servidor recusando: o dado local está salvo, então isto
         não e perda — e atraso. O espelho não avançou, então a mudança segue
         pendente e sobe na próxima oportunidade. */
      console.warn('[nuvem] sincronizacao falhou', e);
      falhou = true;
      anunciar('erro', traduzir(e));
      agendarTentativa(state);
    } finally {
      enviando = false;
      if (repetir) { repetir = false; despachar(ultimoEstado); }
    }
  }

  /* Os gatilhos de ambiente. Ficam aqui, e não no `app.js`, porque quem sabe o
     que fazer com eles é esta camada — e porque assim nenhum deles pode ser
     esquecido ao mexer no arranque. */
  function escutarAmbiente() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      tentativa = 0; // a rede voltou: o motivo da última falha acabou
      tentarAgora();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      /* Voltar para a frente e o momento em que a pessoa vai OLHAR para os
         dados — e portanto o momento certo de buscar o que o outro aparelho
         fez. Tambem cobre o PWA, que costuma ficar semanas sem ser fechado. */
      tentativa = 0;
      tentarAgora();
    });
  }

  function traduzir(e) {
    const m = String((e && e.message) || '').toLowerCase();
    if (m.includes('failed to fetch') || m.includes('networkerror')
        || m.includes('sem resposta em')) {
      return 'Sem conexão — salvo neste aparelho';
    }
    if (m.includes('jwt') || m.includes('expired')) return 'Sessão expirada — entre de novo';
    return 'Não consegui salvar na conta agora';
  }

  return {
    linhasDoEstado, estadoDasLinhas, canonico, chaveDe,
    baixar, baixarDesde, enviar, sincronizar, temGaragem, ligado,
    unir, espelharRemotas, escutarAmbiente,
    aoSalvar, estado, aoMudar, anunciar, aoAplicar,
    lerEspelho, gravarEspelho, esquecerEspelho,
    lerMarca, gravarMarca, esquecerMarca,
    lerConflitos, limparConflitos,
    temPendencia, tentarAgora,
    KEY_BACKUP,
  };
})();

/* ==========================================================================
   Sincronia — a politica, separada do transporte.

   O `Nuvem` acima sabe converter, comparar e falar com o servidor. Ele não
   decide nada. Quem decide o que acontece quando o aparelho e a conta
   discordam e este bloco.

   COMO A REGRA MUDOU DO PASSO 3 PARA O 4
   Antes: a conta ganhava inteira, sempre, e o que era local virava backup.
   Isso resolvia entrar numa conta pela primeira vez e estragava todo o resto
   — quem registrasse um abastecimento offline perderia o registro ao voltar
   para a rede.

   Agora são dois caminhos, e a diferença entre eles e se existe espelho:

     SEM ESPELHO (primeira vez deste aparelho nesta conta)
       Uniao, com o servidor tendo preferencia no que existe dos dois lados.
       O que só existe aqui sobrevive e sobe em seguida.

     COM ESPELHO (todo o resto)
       Fusao de três vias linha a linha, e só há conflito quando os dois lados
       mexeram na MESMA linha desde a última sincronização.

   O BACKUP CONTINUA SENDO FEITO, e continua sendo de propósito. Ele só entra
   no primeiro encontro, que e o unico momento em que alguma coisa local pode
   ser trocada em massa. Custa alguns KB e e a rede de segurança para um erro
   meu — não para um erro do usuario.
   ========================================================================== */

const Sincronia = (() => {
  /* A imagem ainda não viaja para o Storage. Sem isto, qualquer reconstrucao
     do estado — e agora elas acontecem a cada fusão, não só no login —
     apagaria a foto da tela: o servidor não tem o que devolver no lugar. */
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
      console.warn('[sincronia] backup local nao coube no armazenamento', e);
    }
  }

  /* O encaixe que deixa a fusão escrever no `Store` sem o `Nuvem` conhece-lo. */
  Nuvem.aoAplicar((novoEstado) => {
    const antigo = Store.get();
    preservarFotos(novoEstado, antigo);
    return Store.substituirEstado(novoEstado);
  });

  async function primeiroEncontro() {
    Nuvem.anunciar('baixando');
    const puxado = await Nuvem.baixarDesde(null);
    const antigo = Store.get();
    const contaTemGaragem = (puxado.dados.veiculos || []).some((r) => !r.removido_em);

    if (contaTemGaragem) {
      guardarBackup(antigo);
      const uid = Conta.usuario().id;
      const linhas = Nuvem.unir(Nuvem.linhasDoEstado(antigo, uid), puxado.dados);
      const novo = Nuvem.estadoDasLinhas(linhas);
      preservarFotos(novo, antigo);
      Store.substituirEstado(novo);
    }

    /* O espelho sai das linhas do SERVIDOR, não do estado resultante. E o que
       faz o envio logo abaixo mandar exatamente o que só existe aqui. */
    Nuvem.espelharRemotas(puxado.dados);
    Nuvem.gravarMarca(puxado.marca);
    return { uniu: contaTemGaragem };
  }

  async function aoEntrar() {
    if (!Nuvem.ligado()) return { pulou: true };
    try {
      const primeiraVez = !Object.keys(Nuvem.lerEspelho()).length;
      if (primeiraVez) await primeiroEncontro();
      const r = await Nuvem.tentarAgora(Store.get());
      return Object.assign({ primeiraVez }, r || {});
    } catch (e) {
      console.warn('[sincronia] nao consegui sincronizar ao entrar', e);
      Nuvem.anunciar('erro', 'Nao consegui falar com a conta agora');
      return { erro: e };
    }
  }

  /* Sair não apaga a garagem do aparelho — ela continua servindo offline e e o
     que a pessoa vê se entrar de novo na mesma conta. Some o que e especifico
     de uma conta: o espelho, a marca da última leitura e os conflitos. Manter
     qualquer um deles faria o proximo login achar que já sincronizou coisas
     que talvez sejam de outra pessoa. */
  function aoSair() {
    Nuvem.esquecerEspelho();
    Nuvem.esquecerMarca();
    Nuvem.limparConflitos();
    Nuvem.anunciar('parado');
  }

  return { aoEntrar, aoSair, primeiroEncontro };
})();
