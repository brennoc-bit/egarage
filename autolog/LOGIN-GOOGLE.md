# Passo 2 — login com Google

Checklist para seguir com o navegador aberto. A parte do Google Cloud é sua; a
do código é minha, depois que você me avisar que terminou.

> **O Client Secret nunca passa por esta conversa.** Ele vai direto da tela do
> Google Cloud para a tela do Supabase. Se colar no chat, ele fica no histórico.

---

## O endereço que importa

Este é o erro que mais custa tempo: a URI de redirecionamento **não é o endereço
do seu app**. É o callback do Supabase, que valida com o Google e só então
devolve a pessoa para o Autolog.

```
https://zhknfipxjvkthkbzgguf.supabase.co/auth/v1/callback
```

Confirmado funcionando (responde 303).

---

## Parte 1 — Google Cloud

### 1.1 Projeto

<https://console.cloud.google.com/> → seletor de projeto no topo → **Novo
projeto**. Nome: `Autolog`.

### 1.2 Tela de consentimento

**APIs e serviços → Tela de permissão OAuth**.

- Tipo: **Externo** (Interno só existe em conta Workspace de empresa).
- Nome do app: `Autolog`
- E-mail de suporte e e-mail do desenvolvedor: o seu.

**Escopos:** deixe apenas os básicos — `openid`, `userinfo.email`,
`userinfo.profile`. Se precisar adicionar `openid` à mão, adicione.

> **Por que só os básicos:** escopo básico **não passa por revisão do Google**.
> Qualquer escopo sensível dispara um processo de verificação que leva dias e
> pede vídeo demonstrativo e política de privacidade publicada. Não vale a pena
> agora — e o app não precisa de mais nada para saber quem você é.

### 1.3 Modo de teste vs. publicado

A tela nasce em **Testing**. Nesse modo **só quem estiver na lista de usuários de
teste consegue entrar**, no máximo 100 pessoas.

- **Agora:** deixe em Testing e adicione seu e-mail em *Usuários de teste*.
- **Antes de publicar na Play Store:** volte aqui e clique em **Publicar app**.
  Com escopo básico, publicar não abre revisão — é imediato.

Anote isso: é a causa número um de "funciona pra mim e não funciona pro meu
amigo".

### 1.4 Client OAuth

**APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.

- Tipo: **Aplicativo da Web**
- Nome: `Autolog Web`

**Origens JavaScript autorizadas:**

```
https://brennoc-bit.github.io
http://localhost:5174
```

> **Domínio próprio a caminho.** Pode fazer com estas agora: quando
> `autolog.com.br` (ou o nome escolhido) estiver de pé, basta **acrescentar** a
> origem nova ao lado destas. O Google aceita várias e nada precisa ser refeito.

**URIs de redirecionamento autorizados** — só este, exatamente:

```
https://zhknfipxjvkthkbzgguf.supabase.co/auth/v1/callback
```

Salve. O Google mostra **Client ID** e **Client Secret**. Deixe a janela aberta.

---

## Parte 2 — Supabase

### 2.1 Ligar o provedor

<https://supabase.com/dashboard/project/zhknfipxjvkthkbzgguf/auth/providers>

Google → ativar → cole **Client ID** e **Client Secret** → salvar.

### 2.2 URLs de redirecionamento

<https://supabase.com/dashboard/project/zhknfipxjvkthkbzgguf/auth/url-configuration>

**Site URL:**

```
https://brennoc-bit.github.io/egarage/autolog/
```

**Redirect URLs** — adicione as duas:

```
https://brennoc-bit.github.io/egarage/autolog/**
http://localhost:5174/**
```

> Mantenha a de `localhost` mesmo em produção, senão para de dar para testar na
> máquina.

---

## Me avise quando terminar

Aí eu troco a porteira `2047` pelo login de verdade. O que muda no código:

- `js/auth.js` deixa de conferir senha no navegador e passa a falar com o
  Supabase.
- A sessão passa a sobreviver a fechar o app, e a valer nos dois aparelhos.
- A tela de login ganha o botão do Google.

---

## Duas coisas para decidir antes da loja (não agora)

**A tela do Google vai mostrar `zhknfipxjvkthkbzgguf.supabase.co`.** Quando a
pessoa clicar em "Entrar com Google", o aviso diz "continuar para
zhknfipxjvkthkbzgguf.supabase.co" — que parece golpe.

**Atenção, porque eu já errei isso aqui:** comprar domínio próprio para o app
**não conserta essa tela**. O que o Google exibe vem do destino do
redirecionamento, que é o callback do Supabase, e não o endereço do app.
Consertar exige o **domínio customizado do Supabase**, que é adicional pago,
separado da compra do domínio. Decisão para antes do lançamento.

**Facebook é bem mais chato que Google.** Exige app no Meta for Developers,
revisão e, dependendo do caso, verificação de negócio. Sugiro subir só com
Google e acrescentar o Facebook depois, se alguém pedir.
