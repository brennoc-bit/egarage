/* ==========================================================================
   conta.js — a conta da pessoa, no Supabase.

   Substitui a porteira `2047`, que conferia senha no próprio navegador e vivia
   em código-fonte público. Agora quem diz se você entrou é um servidor.

   O QUE ESTA CAMADA FAZ E O QUE NÃO FAZ
   Ela cuida de *quem* é a pessoa. Não cuida dos *dados* dela — a garagem
   continua em `localStorage` até o passo 3. Nesta etapa a sessão decide se o
   app abre, não o que ele mostra.

   SOBRE A CHAVE AQUI EMBAIXO
   Ela é pública por natureza: chega ao navegador de todo mundo e qualquer um
   lê com F12. Não há como escondê-la, e não é ela que protege nada — quem
   protege são as policies de RLS no banco, que filtram por `auth.uid()`.
   A chave `service_role`, essa sim, nunca pode aparecer aqui.
   ========================================================================== */
'use strict';

const Conta = (() => {
  const URL_PROJETO = 'https://zhknfipxjvkthkbzgguf.supabase.co';
  const CHAVE_PUBLICA = 'sb_publishable_Nha_9zh8kX8GmuKWE1ppAQ__Yx1pG-l';

  let cliente = null;
  let sessaoAtual = null;
  let pronto = false;
  let falhaAoCarregar = false;
  const ouvintes = [];

  /* A biblioteca vem de CDN, então pode não vir. Se faltar, o app precisa
     dizer isso em vez de mostrar tela branca. */
  function criarCliente() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      falhaAoCarregar = true;
      return null;
    }
    return supabase.createClient(URL_PROJETO, CHAVE_PUBLICA, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // O retorno do Google traz o token no fragmento da URL; sem isto a
        // sessão não é capturada ao voltar do provedor.
        detectSessionInUrl: true,
      },
    });
  }

  /* Chamado uma vez no arranque. Só depois disto o app sabe se há sessão —
     por isso o `App.render` espera esta promessa antes de decidir o que
     desenhar. */
  async function iniciar() {
    cliente = criarCliente();
    if (!cliente) { pronto = true; return; }

    try {
      const { data } = await cliente.auth.getSession();
      sessaoAtual = data ? data.session : null;
    } catch (e) {
      sessaoAtual = null;
    }

    cliente.auth.onAuthStateChange((evento, sessao) => {
      sessaoAtual = sessao || null;
      ouvintes.forEach((fn) => { try { fn(evento, sessao); } catch (e) { /* ignora */ } });
    });

    // O Google volta com `#access_token=...` na barra. Depois de a sessão ser
    // capturada, limpar isso evita que o token fique no histórico do
    // navegador e em qualquer link que a pessoa compartilhe.
    if (location.hash.includes('access_token') || location.search.includes('code=')) {
      history.replaceState(null, '', location.pathname);
    }

    pronto = true;
  }

  const disponivel = () => !falhaAoCarregar;
  const carregado = () => pronto;
  const sessao = () => sessaoAtual;
  const logado = () => !!sessaoAtual;
  const usuario = () => (sessaoAtual ? sessaoAtual.user : null);

  const email = () => {
    const u = usuario();
    return u ? u.email || '' : '';
  };

  const nome = () => {
    const u = usuario();
    if (!u) return '';
    const m = u.user_metadata || {};
    return m.full_name || m.name || (u.email || '').split('@')[0] || '';
  };

  const aoMudar = (fn) => { ouvintes.push(fn); };

  /* ── Entradas ───────────────────────────────────────────────────────── */

  // Para onde o provedor devolve a pessoa. Precisa bater com as Redirect URLs
  // cadastradas no Supabase, senão o retorno é recusado.
  const paraOndeVoltar = () => location.origin + location.pathname;

  async function entrarComGoogle() {
    if (!cliente) throw new Error(ERRO_BIBLIOTECA);
    const { error } = await cliente.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: paraOndeVoltar() },
    });
    if (error) throw new Error(traduzir(error));
  }

  async function entrar(mail, senha) {
    if (!cliente) throw new Error(ERRO_BIBLIOTECA);
    const { error } = await cliente.auth.signInWithPassword({
      email: String(mail || '').trim(),
      password: String(senha || ''),
    });
    if (error) throw new Error(traduzir(error));
  }

  /* Devolve `precisaConfirmar` para a tela saber se manda a pessoa ao e-mail
     ou direto para dentro. A confirmação está ligada no projeto, então hoje é
     sempre true — mas ler do retorno evita mentir se isso mudar. */
  async function cadastrar(mail, senha) {
    if (!cliente) throw new Error(ERRO_BIBLIOTECA);
    const { data, error } = await cliente.auth.signUp({
      email: String(mail || '').trim(),
      password: String(senha || ''),
      options: { emailRedirectTo: paraOndeVoltar() },
    });
    if (error) throw new Error(traduzir(error));
    return { precisaConfirmar: !(data && data.session) };
  }

  async function recuperarSenha(mail) {
    if (!cliente) throw new Error(ERRO_BIBLIOTECA);
    const { error } = await cliente.auth.resetPasswordForEmail(
      String(mail || '').trim(),
      { redirectTo: paraOndeVoltar() },
    );
    if (error) throw new Error(traduzir(error));
  }

  async function sair() {
    if (cliente) { try { await cliente.auth.signOut(); } catch (e) { /* ignora */ } }
    sessaoAtual = null;
  }

  /* ── Mensagens ──────────────────────────────────────────────────────── */

  const ERRO_BIBLIOTECA = 'Não consegui carregar o serviço de contas. '
    + 'Verifique sua conexão e abra o app de novo.';

  /* O Supabase responde em inglês. Traduzir aqui, num lugar só, evita que
     mensagem de servidor vaze crua para a tela. */
  function traduzir(error) {
    const m = String((error && error.message) || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (m.includes('email not confirmed')) {
      return 'Falta confirmar seu e-mail. Procure a mensagem que enviamos — veja também o spam.';
    }
    if (m.includes('user already registered') || m.includes('already been registered')) {
      return 'Já existe conta com esse e-mail. Tente entrar, ou recupere a senha.';
    }
    if (m.includes('password should be at least')) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }
    // A mensagem vem em formatos diferentes conforme o caso: "invalid email",
    // "unable to validate email address" e 'Email address "x" is invalid'.
    // Casar as duas palavras pega os três.
    if (m.includes('email') && m.includes('invalid')) {
      return 'Esse e-mail não parece válido. Confira se não faltou letra no domínio.';
    }
    if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
      // O remetente embutido do Supabase manda 2 por hora. Dizer isso é melhor
      // que a pessoa achar que o cadastro dela falhou.
      return 'Muitos e-mails enviados agora há pouco. Espere alguns minutos e tente de novo.';
    }
    if (m.includes('failed to fetch') || m.includes('networkerror')) {
      return 'Sem conexão com o servidor de contas.';
    }
    /* Nada casou. Devolver a mensagem crua põe inglês de servidor na cara do
       usuário — o que esta função existe para evitar. Ela vai para o console,
       onde serve para depurar, e a tela recebe português. */
    if (error && error.message) console.warn('[conta] sem tradução:', error.message);
    return 'Não consegui completar agora. Tente de novo em instantes.';
  }

  return {
    iniciar, disponivel, carregado, sessao, logado, usuario, email, nome, aoMudar,
    entrarComGoogle, entrar, cadastrar, recuperarSenha, sair,
  };
})();
