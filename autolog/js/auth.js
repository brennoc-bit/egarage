/* ==========================================================================
   auth.js — as telas de entrada.

   Era a porteira `2047`, que conferia senha no próprio navegador com as
   credenciais escritas em código-fonte público. Morreu em 2026-09-13.

   Quem decide se a pessoa entrou é o `Conta` (Supabase). Quem decide se o app
   destranca neste aparelho é a `Trava` (digital). Aqui só moram as telas.
   ========================================================================== */
'use strict';

const Auth = (() => {
  /* Quatro estados possíveis, e o `App.render` escolhe a tela por eles.
     `carregando` existe porque restaurar a sessão é assíncrono: sem ele, o
     app piscaria a tela de login antes de descobrir que já havia sessão. */
  function estado() {
    if (!Conta.disponivel()) return 'indisponivel';
    if (!Conta.carregado()) return 'carregando';
    if (!Conta.logado()) return 'deslogado';
    if (Trava.ativa() && !Trava.liberada()) return 'trancado';
    return 'dentro';
  }

  const logado = () => estado() === 'dentro';

  async function sair() {
    Trava.esquecerLiberacao();
    await Conta.sair();
  }

  /* ── Peças ──────────────────────────────────────────────────────────── */

  const marca = (legenda) => h('div', { class: 'login-marca' },
    h('div', { class: 'mono login-kick' }, legenda || 'Sua garagem, em ordem'),
    h('h1', null, 'Autolog'),
    h('div', { class: 'login-risco' }));

  const SVG_GOOGLE = `
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>`;

  const aviso = (texto, tipo) => h('div', {
    class: 'login-erro' + (tipo === 'ok' ? ' ok' : ''), role: 'alert',
  }, texto || '');

  /* ── Tela de entrada ────────────────────────────────────────────────── */

  function telaLogin() {
    let modo = 'entrar'; // entrar | criar
    const raiz = h('div', { class: 'login' });

    const desenhar = () => {
      clear(raiz);
      const recado = aviso('');
      const ocupado = (v) => raiz.querySelectorAll('button, input')
        .forEach((b) => { b.disabled = v; });

      const falhou = (e) => {
        recado.className = 'login-erro';
        recado.textContent = e.message || 'Não consegui completar.';
      };
      const deuCerto = (t) => {
        recado.className = 'login-erro ok';
        recado.textContent = t;
      };

      /* — Google — */
      const btnGoogle = h('button', { type: 'button', class: 'btn-google' },
        h('span', { class: 'g-ic', html: SVG_GOOGLE }),
        h('span', null, 'Continuar com Google'));
      btnGoogle.addEventListener('click', async () => {
        ocupado(true);
        try { await Conta.entrarComGoogle(); }
        catch (e) { falhou(e); ocupado(false); }
      });

      /* — e-mail e senha — */
      const campoEmail = h('input', {
        id: 'login-email', type: 'email', autocomplete: 'email',
        autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
        placeholder: 'voce@exemplo.com',
      });
      const campoSenha = h('input', {
        id: 'login-senha', type: 'password',
        autocomplete: modo === 'criar' ? 'new-password' : 'current-password',
        placeholder: '••••••••',
      });
      [campoEmail, campoSenha].forEach((c) => c.addEventListener('input', () => {
        recado.textContent = '';
      }));

      const form = h('form', { class: 'login-form', novalidate: true },
        h('div', { class: 'f' }, h('label', { for: 'login-email' }, 'E-mail'), campoEmail),
        h('div', { class: 'f' },
          h('label', { for: 'login-senha' },
            modo === 'criar' ? 'Criar uma senha · mínimo 6' : 'Senha'),
          campoSenha),
        recado,
        h('button', { type: 'submit', class: 'login-btn' },
          h('span', null, modo === 'criar' ? 'Criar conta' : 'Entrar'),
          h('span', null, '→')));

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const mail = campoEmail.value.trim();
        const senha = campoSenha.value;
        if (!mail || !senha) { falhou(new Error('Preencha e-mail e senha.')); return; }
        ocupado(true);
        try {
          if (modo === 'criar') {
            const r = await Conta.cadastrar(mail, senha);
            if (r.precisaConfirmar) {
              clear(raiz).append(telaConfirmar(mail));
              return;
            }
          } else {
            await Conta.entrar(mail, senha);
          }
          App.render({ topo: true });
        } catch (e) {
          falhou(e);
          ocupado(false);
          campoSenha.value = '';
        }
      });

      /* — trocar de modo — */
      const alternar = h('button', { type: 'button', class: 'login-link' },
        modo === 'criar' ? 'Já tenho conta · entrar' : 'Não tenho conta · criar');
      alternar.addEventListener('click', () => {
        modo = modo === 'criar' ? 'entrar' : 'criar';
        desenhar();
      });

      const esqueci = h('button', { type: 'button', class: 'login-link discreto' },
        'Esqueci minha senha');
      esqueci.addEventListener('click', async () => {
        const mail = campoEmail.value.trim();
        if (!mail) {
          falhou(new Error('Escreva seu e-mail acima e toque aqui de novo.'));
          campoEmail.focus();
          return;
        }
        ocupado(true);
        try {
          await Conta.recuperarSenha(mail);
          deuCerto('Se existir conta com esse e-mail, o link de troca acabou de sair.');
        } catch (e) { falhou(e); }
        ocupado(false);
      });

      raiz.append(
        marca(),
        btnGoogle,
        h('div', { class: 'login-ou' }, h('span', null, 'ou')),
        form,
        h('div', { class: 'login-acoes' },
          alternar,
          modo === 'entrar' ? esqueci : null),
        h('div', { class: 'login-nota' },
          'Sua garagem fica na sua conta. Entrando em outro aparelho, ela vai junto.'));

      setTimeout(() => campoEmail.focus(), 80);
    };

    desenhar();
    return raiz;
  }

  /* ── Depois do cadastro ─────────────────────────────────────────────── */

  function telaConfirmar(mail) {
    const voltar = h('button', { type: 'button', class: 'login-link' }, '‹ voltar');
    voltar.addEventListener('click', () => App.render({ topo: true }));

    return h('div', { class: 'login' },
      marca('Falta um passo'),
      h('div', { class: 'login-msg' },
        h('p', null, 'Mandamos um e-mail para ', h('strong', null, mail), '.'),
        h('p', null, 'Abra a mensagem e toque no link para confirmar a conta. ',
          'Depois é só voltar aqui e entrar.'),
        h('p', { class: 'discreto' },
          'Não chegou em alguns minutos? Procure no spam. ',
          'O remetente ainda não é o nosso domínio próprio, então é comum cair lá.')),
      voltar);
  }

  /* ── Tela trancada ──────────────────────────────────────────────────── */

  function telaTrancada() {
    const recado = aviso('');

    const btn = h('button', { type: 'button', class: 'login-btn' },
      h('span', null, 'Desbloquear'), h('span', null, '☝'));
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      recado.textContent = '';
      const ok = await Trava.pedir();
      if (ok) { App.render({ topo: true }); return; }
      // A regra do fracasso: não abre sozinho e não tranca para sempre.
      recado.className = 'login-erro';
      recado.textContent = 'Não reconheci a digital. Tente de novo ou entre com sua conta.';
      btn.disabled = false;
    });

    const outra = h('button', { type: 'button', class: 'login-link' },
      'Entrar com outra conta');
    outra.addEventListener('click', async () => {
      await sair();
      App.render({ topo: true });
    });

    // Pede assim que a tela abre: quem ligou a trava não quer tocar num botão
    // antes de usar a digital.
    setTimeout(() => btn.click(), 250);

    return h('div', { class: 'login' },
      marca('Garagem trancada'),
      h('div', { class: 'login-msg' },
        h('p', null, 'Use sua digital para abrir o Autolog neste aparelho.')),
      recado, btn,
      h('div', { class: 'login-acoes' }, outra));
  }

  /* ── Enquanto carrega, e quando não dá ──────────────────────────────── */

  const telaCarregando = () => h('div', { class: 'login' },
    marca(), h('div', { class: 'login-msg discreto' }, 'Abrindo sua garagem…'));

  const telaIndisponivel = () => {
    const tentar = h('button', { type: 'button', class: 'login-btn' },
      h('span', null, 'Tentar de novo'), h('span', null, '↻'));
    tentar.addEventListener('click', () => location.reload());
    return h('div', { class: 'login' },
      marca('Sem conexão'),
      h('div', { class: 'login-msg' },
        h('p', null, 'Não consegui carregar o serviço de contas.'),
        h('p', { class: 'discreto' }, 'Confira sua internet e tente de novo.')),
      tentar);
  };

  function tela() {
    switch (estado()) {
      case 'carregando': return telaCarregando();
      case 'indisponivel': return telaIndisponivel();
      case 'trancado': return telaTrancada();
      default: return telaLogin();
    }
  }

  return { estado, logado, sair, tela };
})();
