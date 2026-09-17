/* ==========================================================================
   voltar.js — o botão Voltar do Android, e a tecla Esc.

   No navegador, o Voltar é do navegador: ele sai do site, e a barra de
   endereço segue ali para reabrir. Dentro do app da Play Store — uma TWA, que
   é o Chrome sem cara de Chrome — **não existe barra de endereço nem gesto
   alternativo**. O Voltar do sistema é a única saída, e sem ninguém tratá-lo
   ele fecha o app inteiro a partir de qualquer tela.

   Na prática, sem este arquivo: abrir a folha de abastecimento e tocar em
   Voltar por reflexo (em vez de "Cancelar") fecharia o Autolog. Ir em Docs e
   tocar em Voltar fecharia o Autolog. É o tipo de defeito que quem instala
   encontra nos primeiros dez segundos.

   ── A PILHA NÃO CRESCE ──────────────────────────────────────────────────
   A saída óbvia seria empilhar uma entrada de histórico por navegação. Só que
   aí quem passeou pelas abas precisa tocar Voltar oito vezes para sair, e a
   nona ainda o leva para uma tela que ele já esqueceu. É o que faz um site
   dentro de um app parecer um site dentro de um app.

   Aqui o app mantém no máximo **uma** entrada extra — uma sentinela — que
   existe só enquanto houver para onde voltar. O passo para trás é decidido
   pelo app, não pelo histórico do navegador:

     folha aberta            → fecha a folha
     tela filha (ficha, …)   → volta para a aba de origem
     outra aba               → volta para o Início
     Início                  → aí sim, sai do app

   É o que o Android espera, e é o mesmo caminho que a tecla Esc usa no
   computador.
   ========================================================================== */
'use strict';

const Voltar = (() => {
  const SENTINELA = 'autolog-sentinela';

  /* Quem tem pai volta para o pai. É o mesmo parentesco que o cabeçalho já
     usa no botão "‹ voltar": telas filhas não são abas, então recuar delas
     não pode significar sair do app. */
  const PAI = {
    ficha: 'inicio', veiculo: 'inicio', previsao: 'inicio',
    seguro: 'docs', 'seguro-editar': 'docs', gemini: 'perfil',
  };

  let ignorarProximoPop = false;
  let agendado = false;
  let arrancou = false;

  const folhaAberta = () => !!document.querySelector('.sheet-backdrop');
  const naSentinela = () => !!(history.state && history.state[SENTINELA]);

  /* Há para onde voltar? Sem sessão não há: a tela de login é o fundo do
     poço, e dela o Voltar sai do app. */
  function profundo() {
    if (typeof Auth !== 'undefined' && !Auth.logado()) return false;
    return folhaAberta() || App.rota !== 'inicio';
  }

  /* Um passo atrás segundo o app — não segundo o navegador.
     Devolve false quando já está no fundo, que é o sinal para deixar o
     sistema fechar o app. */
  function umPassoAtras() {
    if (folhaAberta()) { UI.fecharSheet(); return true; }
    const r = App.rota;
    if (PAI[r]) { App.ir(PAI[r]); return true; }
    if (r !== 'inicio') { App.ir('inicio'); return true; }
    return false;
  }

  /* Põe ou tira a sentinela, conforme o app esteja fundo ou não.

     Roda num microtask e se agrupa de propósito: `UI.sheet()` fecha a folha
     anterior antes de abrir a nova, e no meio desse instante o app parece
     raso por um piscar. Olhar só no fim evita tirar e pôr a sentinela à toa. */
  function sincronizar() {
    if (agendado) return;
    agendado = true;
    Promise.resolve().then(() => {
      agendado = false;
      const fundo = profundo();

      if (fundo && !naSentinela()) {
        // Mesma URL: a sentinela não pode aparecer na barra de endereço nem
        // mudar o escopo, senão o app "sai" do próprio start_url.
        history.pushState({ [SENTINELA]: true }, '', location.href);
      } else if (!fundo && naSentinela()) {
        if (!arrancou) {
          /* Recarregou parado na sentinela — o `history.state` sobrevive ao
             reload, e uma atualização do service worker basta para cair aqui.
             Voltar de verdade agora recarregaria a página na cara do usuário;
             desmarcar resolve, ao custo de sobrar uma entrada inofensiva. */
          history.replaceState({}, '', location.href);
        } else {
          // Sobrou sentinela porque a folha foi fechada pelo "Cancelar".
          // Desfazer com `back` dispara um popstate que não é do usuário.
          ignorarProximoPop = true;
          history.back();
        }
      }
      arrancou = true;
    });
  }

  window.addEventListener('popstate', () => {
    if (ignorarProximoPop) { ignorarProximoPop = false; return; }
    // Saiu da sentinela: foi o usuário pedindo para voltar.
    if (!umPassoAtras()) return;  // já estava no fundo; o próximo toque sai
    sincronizar();
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !profundo()) return;
    ev.preventDefault();
    // Passar pelo histórico mantém um caminho só. Sem sentinela ainda posta,
    // um `back` aqui sairia do site — então recua na mão.
    if (naSentinela()) history.back();
    else { umPassoAtras(); sincronizar(); }
  });

  return { sincronizar, profundo, umPassoAtras };
})();
