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

> **O menu antigo não existe mais.** O Google reorganizou o console: "Tela de
> permissão OAuth" virou **Google Auth Platform**, com abas separadas —
> Branding, Audience, Data Access e Clients. Os links diretos abaixo pulam a
> navegação.

Confirme que o projeto `Autolog` está selecionado no topo antes de seguir.
Configurar no projeto errado é o erro mais comum daqui em diante.

### 1.2 Branding

<https://console.cloud.google.com/auth/branding>

- **Nome do app:** `Autolog` — limpo, **sem "beta"**.
- **E-mail de suporte ao usuário:** um Grupo do Google (veja abaixo).
- **E-mail de contato do desenvolvedor:** o seu pessoal.
- **Logo:** em branco por enquanto — enviar logo dispara verificação de dias.

#### Por que sem "beta" no nome

É permitido, mas ruim por três motivos:

1. A tela de consentimento é onde a pessoa entrega a identidade Google dela.
   "Autolog Beta" ali se lê como "coisa inacabada querendo minha conta".
2. **Mudar o nome do app dispara reverificação** quando ele é Externo e está em
   produção. Tirar o "beta" depois viraria problema exatamente no momento de
   sair do beta.
3. A Play Store tem trilha formal de teste aberto, com a linguagem que o
   usuário reconhece. Sinalize lá, não aqui.

#### O e-mail de suporte é visível para o cliente

Ele aparece na tela de consentimento, então não use o pessoal.

**E o campo é um seletor, não campo livre.** Só aceita o e-mail da conta Google
logada ou um **Grupo do Google que essa conta administra** — endereço de
redirecionamento criado no registrador **não aparece na lista**.

O caminho, de graça e em dois minutos:

1. <https://groups.google.com> → **Criar grupo**
2. `Suporte Autolog` · `suporte-autolog@googlegroups.com`
3. Adicione seu e-mail pessoal como membro — a mensagem cai na caixa de sempre
4. Volte ao Branding e selecione o grupo

Com o domínio de pé, `suporte@autolog.com.br` pode encaminhar para esse grupo: o
cliente escreve para o endereço bonito e você recebe no mesmo lugar.

### 1.3 Audience — quem pode entrar

<https://console.cloud.google.com/auth/audience>

- Tipo: **Externo** (Interno só existe em conta Workspace de empresa).
- Em **Usuários de teste**, adicione o seu e-mail.

A tela nasce em **modo de teste**, e nele **só quem estiver nessa lista consegue
entrar**, no máximo 100 pessoas.

- **Agora:** deixe assim.
- **Antes de publicar na Play Store:** volte aqui e clique em **Publicar app**.
  Com escopo básico, publicar não abre revisão — é imediato.

Anote: é a causa número um de "funciona pra mim e não funciona pro meu amigo".

### 1.4 Data Access — os escopos

<https://console.cloud.google.com/auth/scopes>

Apenas estes três:

```
openid
.../auth/userinfo.email
.../auth/userinfo.profile
```

> **Por que só os básicos:** escopo básico **não passa por revisão do Google**.
> Qualquer escopo sensível dispara um processo de dias que pede vídeo
> demonstrativo e política de privacidade publicada. E o app não precisa de mais
> nada para saber quem você é.

### 1.5 Clients — criar o cliente OAuth

<https://console.cloud.google.com/auth/clients> → **Criar cliente**

- Tipo: **Aplicativo da Web**
- Nome: `Autolog Web`

> **"Mas o app não é Android?"** É — e mesmo assim o tipo certo é Web, porque
> **o Google nunca fala com o Android: ele fala com o Supabase.** A página roda
> no Chrome dentro do invólucro, o Google redireciona para o callback do
> Supabase (endereço web) e o Supabase devolve a pessoa para o app. Quem se
> apresenta como cliente é o servidor do Supabase.
>
> O tipo **Android** serve para app nativo que chama o SDK do Google direto —
> ele pede nome do pacote e SHA-1 do certificado de assinatura. Esse seria o
> caminho **Capacitor**. No TWA não existe camada nativa de onde chamar o SDK.
>
> Se um dia migrar para Capacitor, cria-se um cliente Android **ao lado** deste,
> no mesmo projeto. Os dois convivem, e nada aqui se perde.

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
