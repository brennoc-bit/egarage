/* ==========================================================================
   trava.js — bloqueio do app por impressão digital.

   O QUE ELA É
   Uma cortina, não um cofre. Impede que alguém que pegou seu celular
   desbloqueado abra o app e veja seus gastos. **Não criptografa nada**: quem
   tiver o aparelho e conhecimento técnico lê os dados por baixo do mesmo
   jeito. É exatamente o que os aplicativos de banco chamam de "bloqueio do
   app", e é honesto chamar assim.

   POR QUE WEBAUTHN, E NÃO PASSKEY
   O passkey do Supabase está em beta, e depender de recurso beta como única
   porta de entrada é risco. Aqui o WebAuthn é usado de outro jeito: em vez de
   provar identidade para um servidor, ele só exige que o dono do aparelho se
   identifique antes de liberar. Sem servidor, sem beta.

   A REGRA DO FRACASSO, QUE É O QUE FAZ A TRAVA PRESTAR
   Quando a digital falha — aparelho sem biometria, pessoa cancela, credencial
   perdida ao limpar os dados do site —, **cai no login normal**. Abrir assim
   mesmo seria teatro; travar de vez trancaria a pessoa para fora da própria
   garagem.
   ========================================================================== */
'use strict';

const Trava = (() => {
  const KEY = 'autolog-trava-v1';

  // Vale só enquanto a página vive: fechar e reabrir o app pede a digital de
  // novo, que é o comportamento esperado de um bloqueio.
  let liberadaAgora = false;

  const ler = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  };
  const gravar = (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* cota */ }
  };
  const limpar = () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  };

  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = (txt) => Uint8Array.from(atob(txt), (c) => c.charCodeAt(0));
  const aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n));

  /* O aparelho tem leitor de digital (ou rosto, ou PIN) utilizável pelo
     navegador? Em desktop sem leitor isto devolve false, e a tela nem oferece
     a opção — melhor que oferecer e falhar. */
  async function suportada() {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) { return false; }
  }

  const ativa = () => !!(ler() && ler().id);
  const liberada = () => liberadaAgora;
  const liberar = () => { liberadaAgora = true; };

  /* Depois de sair da conta, a próxima entrada precisa pedir a digital de
     novo — senão a trava seria burlada só deslogando e logando. */
  const esquecerLiberacao = () => { liberadaAgora = false; };

  async function ativar(identificacao) {
    if (!await suportada()) {
      throw new Error('Este aparelho não tem desbloqueio por digital disponível no navegador.');
    }
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: aleatorio(32),
        // `rp.id` fica implícito como o domínio atual. Em domínio próprio a
        // credencial fica no escopo do app; em domínio compartilhado, não.
        rp: { name: 'Autolog' },
        user: {
          id: aleatorio(16),
          name: identificacao || 'autolog',
          displayName: identificacao || 'Autolog',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },    // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          // 'platform' = a digital DESTE aparelho, não chave física USB.
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });
    if (!cred) throw new Error('Não consegui registrar a digital.');
    gravar({ id: b64(cred.rawId), em: new Date().toISOString() });
    liberadaAgora = true;
    return true;
  }

  function desativar() {
    limpar();
    liberadaAgora = true;
  }

  /* Pede a digital. Devolve true se o dono do aparelho se identificou.
     Não conferimos assinatura contra chave pública: sem servidor, quem
     controlasse o cliente poderia forjar isso de qualquer forma. O valor está
     em o sistema operacional exigir a biometria antes de liberar. */
  async function pedir() {
    const guardado = ler();
    if (!guardado || !guardado.id) return false;
    try {
      const r = await navigator.credentials.get({
        publicKey: {
          challenge: aleatorio(32),
          allowCredentials: [{ type: 'public-key', id: deB64(guardado.id) }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (!r) return false;
      liberadaAgora = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    suportada, ativa, liberada, liberar, esquecerLiberacao,
    ativar, desativar, pedir,
  };
})();
