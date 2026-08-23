/* ==========================================================================
   auth.js — porteira de acesso do protótipo.

   ATENÇÃO: isto NÃO é autenticação de verdade. A conferência acontece no
   navegador e as credenciais estão aqui no código-fonte, que é público. Serve
   só para demonstrar o fluxo de entrada enquanto o app é protótipo. Antes de
   qualquer uso real, a validação precisa ir para um servidor.
   ========================================================================== */
'use strict';

const Auth = (() => {
  const KEY = 'autolog-sessao-v1';
  const KEY_ANTIGA = 'motoreiro-sessao-v1'; // app se chamava Motoreiro
  const USUARIO = 'brenno';
  const SENHA = '2047';

  const logado = () => {
    try {
      if (localStorage.getItem(KEY) === 'ok') return true;
      // Quem já estava logado antes da troca de nome continua logado.
      if (localStorage.getItem(KEY_ANTIGA) === 'ok') {
        localStorage.setItem(KEY, 'ok');
        localStorage.removeItem(KEY_ANTIGA);
        return true;
      }
      return false;
    } catch (e) { return false; }
  };

  function entrar(usuario, senha) {
    const u = String(usuario || '').trim().toLowerCase();
    const s = String(senha || '').trim();
    if (u !== USUARIO || s !== SENHA) return false;
    try { localStorage.setItem(KEY, 'ok'); } catch (e) { /* modo privado */ }
    return true;
  }

  function sair() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  }

  /* ── Tela ───────────────────────────────────────────────────────────── */

  function tela() {
    const erro = h('div', { class: 'login-erro', role: 'alert' }, '');

    const campoUsuario = h('input', {
      id: 'login-usuario', type: 'text', autocomplete: 'username',
      autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
      placeholder: 'seu nome',
    });

    const campoSenha = h('input', {
      id: 'login-senha', type: 'password', autocomplete: 'current-password',
      inputmode: 'numeric', maxlength: '4', placeholder: '••••',
    });

    // No celular, teclado numérico e nada de letra na senha de 4 dígitos.
    campoSenha.addEventListener('input', () => {
      campoSenha.value = campoSenha.value.replace(/\D/g, '').slice(0, 4);
    });
    [campoUsuario, campoSenha].forEach((c) => c.addEventListener('input', () => {
      erro.textContent = '';
      form.classList.remove('erro');
    }));

    const form = h('form', { class: 'login-form', novalidate: true },
      h('div', { class: 'f' },
        h('label', { for: 'login-usuario' }, 'Usuário'), campoUsuario),
      h('div', { class: 'f' },
        h('label', { for: 'login-senha' }, 'Senha · 4 dígitos'), campoSenha),
      erro,
      h('button', { type: 'submit', class: 'login-btn' },
        h('span', null, 'Entrar'), h('span', null, '→')));

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (entrar(campoUsuario.value, campoSenha.value)) {
        App.render({ topo: true });
        UI.toast('Garagem destrancada');
        return;
      }
      form.classList.add('erro');
      erro.textContent = 'Usuário ou senha incorretos.';
      campoSenha.value = '';
      campoSenha.focus();
    });

    const raiz = h('div', { class: 'login' },
      h('div', { class: 'login-marca' },
        h('div', { class: 'mono login-kick' }, 'Sua garagem, em ordem'),
        h('h1', null, 'Autolog'),
        h('div', { class: 'login-risco' })),
      form,
      h('div', { class: 'login-nota' },
        'Protótipo de demonstração. O acesso é conferido no próprio aparelho e ',
        'os dados da garagem ficam salvos apenas neste navegador.'));

    setTimeout(() => campoUsuario.focus(), 80);
    return raiz;
  }

  return { logado, entrar, sair, tela };
})();
