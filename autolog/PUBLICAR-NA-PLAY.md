# Publicar o Autolog na Play Store

O app que vai para a loja é **este mesmo site**, embrulhado numa TWA (*Trusted
Web Activity*): o Chrome do aparelho abrindo o Autolog sem cara de Chrome. Não
há código Android para manter, nem uma segunda versão do app para atualizar —
um `git push` na `main` continua sendo a forma de publicar uma mudança, e ela
chega em quem instalou pela loja.

> **Isto não é aconselhamento jurídico nem garantia de aprovação.** As regras
> da Play Store mudam com frequência, e algumas das que estão aqui mudaram
> recentemente. Onde eu digo "confirme no Console", é porque a tela de lá é a
> fonte, não este arquivo.

---

## Antes de qualquer clique: duas decisões que não têm volta

Estas duas você escolhe uma vez e carrega para sempre. Nenhuma delas dá para
corrigir depois sem publicar **outro** app e pedir para todo mundo reinstalar.

### 1. O endereço (a origem) onde o app vive

A TWA é amarrada a uma **origem** — esquema + domínio. Duas consequências:

- **Trocar de origem é trocar de app.** O `localStorage` é por origem. Mudar
  de `brennoc-bit.github.io` para `autolog.com.br` depois de publicar apaga,
  para cada pessoa instalada, a garagem local, a preferência de aviso, a chave
  do Gemini e a credencial da digital. O que está na conta volta pela
  sincronização; o resto não volta.
- **A verificação exige a raiz do domínio.** O arquivo `assetlinks.json`
  precisa responder em `https://SUA-ORIGEM/.well-known/assetlinks.json` — na
  raiz, não dentro de `/egarage/autolog/`. E o Chrome **não segue
  redirecionamento** para buscá-lo.

Hoje a origem é `https://brennoc-bit.github.io`, e a raiz dela **não é sua**:
ela pertenceria a um repositório chamado `brennoc-bit.github.io`, que não
existe. Dois caminhos:

| | Como | Custo | O que pesa contra |
|---|---|---|---|
| **A. Domínio próprio** (recomendado) | `.com.br` apontado para o repositório `egarage` no GitHub Pages | anuidade do domínio | esperar o DNS |
| **B. Repositório de usuário** | criar o repositório `brennoc-bit.github.io` só com o `.well-known/assetlinks.json` | zero | o endereço do app fica sendo `brennoc-bit.github.io` para sempre; e associa a origem inteira, inclusive projetos futuros seus ali |

**A recomendação é a A**, e não por estética: o endereço aparece na sua ficha
da loja, e trocá-lo depois cobra o preço descrito acima. O B serve bem para
**ensaiar** a publicação num teste interno antes de gastar — desde que você
aceite jogar fora esse primeiro app.

Com um domínio próprio apontado para o repositório `egarage`, tudo já está no
lugar: existe um `index.html` na raiz que manda para `./autolog/`, e existe um
`.well-known/assetlinks.json` esperando para ser preenchido.

### 2. O nome do pacote

É o identificador Android, e ele **nunca** muda — aparece até no endereço da
ficha: `play.google.com/store/apps/details?id=SEU.PACOTE`.

A convenção é o seu domínio ao contrário. Se o domínio for `autolog.com.br`,
o pacote natural é `br.com.autolog.app`. Sem domínio,
`io.github.brennoc_bit.autolog` funciona — hífen não é permitido em pacote
Java, daí o `_` — mas fica no endereço da loja para sempre.

**Decida o domínio primeiro. O pacote sai dele.**

---

## O caminho, na ordem

### Passo 1 · Conta de desenvolvedor

`play.google.com/console` · **US$ 25**, cobrados uma vez, para sempre.

Conta pessoal exige verificação de identidade (documento, endereço) e leva
alguns dias. Faça isso primeiro, porque é o que depende de terceiros.

> **A regra dos testadores.** Contas pessoais criadas nos últimos anos
> precisam rodar um **teste fechado com 12 pessoas inscritas por 14 dias
> seguidos** antes de poderem pedir acesso à produção. Doze pessoas de
> verdade, com conta Google, que aceitem o convite e mantenham o app
> instalado. Se isso valer para a sua conta, é o item de maior prazo do
> projeto inteiro — **comece a juntar as pessoas antes de terminar o resto**.
> Confirme no Console: a regra existe, mas os números já mudaram uma vez.

### Passo 2 · Gerar o app

Duas formas. Nenhuma exige manter código Android.

**PWABuilder** (`pwabuilder.com`) — cole o endereço do app, ele lê o
`manifest.json` e devolve o `.aab` pronto. Sem instalar nada. É o caminho
recomendado aqui, porque esta máquina não tem JDK nem Android SDK e não
precisa passar a ter.

**Bubblewrap** (`npx @bubblewrap/cli init`) — a ferramenta oficial do Chrome.
Dá mais controle e permite rebuildar a qualquer momento sem depender de um
site, mas baixa o JDK e o Android SDK (perto de 1 GB) e exige Node.

Nos dois, confira o que ele leu do `manifest.json`:

| Campo | Valor |
|---|---|
| Nome | `Autolog` — o `name` completo tem 31 caracteres e estoura o limite de 30 da loja |
| Cor do tema | `#ec3013`, que é a cor da barra de status e casa com o cabeçalho vermelho do app |
| Cor de fundo | `#f3f2f2` |
| Orientação | retrato |
| Ícone | `icones/icone-512.png`, com o maskable já declarado |

**Não acrescente um `id` ao manifest.** Ele hoje não existe, e o padrão é a
`start_url` — que é o certo. Um `id` relativo resolveria para a raiz da
origem, ou seja, uma identidade **diferente** da atual: quem já instalou o app
pelo navegador veria surgir um segundo Autolog.

### Passo 3 · Assinatura, e o dedo digital que engana todo mundo

Aceite a **Assinatura de apps do Google Play**. Com ela, perder sua chave tem
conserto; sem ela, perder a chave é perder o app.

Só que ela troca a assinatura: o Google **reassina** o pacote com a chave
dele. Quem chega no celular é a assinatura do Google, não a sua. Então o
SHA-256 que vai no `assetlinks.json` é este:

```
Play Console › Configuração › Integridade do app › Assinatura de apps
  Certificado da chave de assinatura do app  ← É ESTE
  Certificado da chave de upload             ← não é este
```

Usar o de upload é o erro mais comum do processo, e o mais cruel: o app
instala, abre e funciona — **com uma barra de endereço em cima**, parecendo um
atalho de navegador com ícone bonito. Nada avisa.

Esse SHA-256 só passa a existir depois do **primeiro envio** do `.aab`. A
ordem, portanto, é: envie primeiro, publique o `assetlinks.json` depois.

### Passo 4 · Publicar o `assetlinks.json` e conferir

Com o dedo digital em mãos:

```bash
python autolog/ferramentas/gerar-assetlinks.py --pacote SEU.PACOTE --digital AA:BB:CC:...:FF
```

Isso escreve o `.well-known/assetlinks.json` na raiz do repositório. Commit,
push, espere o Pages publicar, e **confira de fora**:

```bash
python autolog/ferramentas/conferir-assetlinks.py --origem https://SUA-ORIGEM --pacote SEU.PACOTE --digital AA:BB:CC:...:FF
```

O script faz as mesmas quatro perguntas que o Chrome faz: responde 200 na
raiz, sem redirecionamento, com `Content-Type: application/json`, e com o par
pacote + dedo digital certo. Só siga quando ele disser "Tudo certo".

> Num domínio próprio recém-configurado, 404 aqui quase sempre é o
> redirecionamento de `www`: `www.seu-dominio` e `seu-dominio` são origens
> diferentes, e a TWA aponta para uma só.

### Passo 5 · A ficha da loja

Os textos estão prontos mais abaixo. O que ainda precisa de você:

- **Ícone** 512×512 — `autolog/icones/icone-512.png` serve.
- **Gráfico de destaque** 1024×500 — é obrigatório e não existe ainda.
- **Capturas de tela**, no mínimo 2 (o Console pede mais para algumas
  vitrines). Tire do **próprio celular**, com o app instalado: sai na
  resolução real da tela e mostra o app como ele é de fato.
  - Antes de fotografar, lembre que a placa e o modelo do seu veículo ficam
    públicos na ficha para sempre. Vale cadastrar um veículo de mentira só
    para isso, ou trocar a placa antes.
  - Boas telas, nesta ordem: Início com o resumo · Custos com o custo/km ·
    Docs com um vencimento próximo · Manutenção · a folha de abastecimento
    aberta.
- **Segurança de dados**: já está respondido, campo a campo, em
  [`SEGURANCA-DE-DADOS.md`](SEGURANCA-DE-DADOS.md).
- **Política de privacidade**: `.../autolog/privacidade.html` — e troque o
  endereço lá dentro se o domínio mudar.
- **Classificação de conteúdo**: questionário. O Autolog é utilitário, sem
  violência, sem conteúdo sexual, sem apostas e sem compras; deve sair como
  livre para todos.
- **Anúncios**: **não**. O app não tem nenhum.
- **Público-alvo**: 18+ — é um app de dono de veículo, e isso evita o pacote
  de regras de apps voltados a crianças.

### Passo 6 · Testar antes de abrir para o mundo

Suba na trilha de **teste interno** primeiro: chega em minutos, aceita até 100
pessoas e não espera revisão demorada. No aparelho, confira:

- [ ] **Não há barra de endereço no topo.** Se houver, o `assetlinks` está
      errado — volte ao passo 4. É o primeiro item porque é o mais comum.
- [ ] O **Voltar** do sistema recua dentro do app: fecha a folha aberta, volta
      da ficha para o Início, e só sai do app quando já está no Início.
- [ ] **Modo avião**: o app abre, mostra a garagem e deixa registrar
      abastecimento. Ao voltar a rede, sobe sozinho.
- [ ] Entrar com o Google funciona — ele abre fora do app e volta.
- [ ] A barra de status está vermelha, encostando no cabeçalho.
- [ ] Perfil › Privacidade › apagar conta aparece e explica o que faz.

---

## Textos da ficha

### Nome do app (máx. 30)

```
Autolog: custos do veículo
```

Alternativas, com o tamanho medido: `Autolog` (7) ·
`Autolog: seu carro em ordem` (27) · `Autolog: gastos do seu carro` (28).

### Descrição curta (máx. 80 — esta tem 73)

```
Quanto custa seu carro ou moto, mês a mês. Gastos, revisões e documentos.
```

### Descrição completa (máx. 4000)

```
Você sabe quanto custou seu carro no mês passado?

A maioria das pessoas sabe o valor da parcela e o do seguro. O resto —
combustível, revisão, pneu, IPVA, licenciamento — vai saindo aos poucos e
some. O Autolog junta tudo e responde três perguntas:

• Quanto custa por mês, de verdade
• Em qual mês vai doer
• O que está para vencer, e quando

COMO ELE CALCULA
Nada aqui é estimativa de folheto. O custo por quilômetro sai do que você
gastou dividido pelo que você rodou. O consumo médio sai dos seus
abastecimentos, não da tabela do fabricante. A previsão dos próximos seis
meses cruza suas parcelas, seus vencimentos e o seu ritmo de rodagem.

O QUE DÁ PARA FAZER
• Registrar abastecimento em poucos toques, com o consumo calculado sozinho
• Lançar manutenção, peça, pneu, lavagem, o que for
• Acompanhar IPVA, licenciamento e seguro, com parcelas e prazos
• Ver o plano de revisão por quilometragem e por tempo, e o que está atrasado
• Simular financiamento (Price e SAC) e acompanhar o que falta pagar
• Consultar o valor na tabela FIPE
• Cuidar de mais de um veículo: carro, moto, ou os dois

FEITO PARA O BRASIL
IPVA por estado, licenciamento, preço médio do combustível da sua região,
placa no padrão Mercosul, Renavam, tabela FIPE. Em português, em real, com as
regras daqui.

FUNCIONA SEM INTERNET
Registre no subsolo do estacionamento, no posto sem sinal, na estrada. O app
abre e trabalha offline; quando a rede volta, ele sincroniza sozinho. Sua
garagem fica na sua conta, então trocar de celular não perde nada.

SEM ANÚNCIO, SEM RASTREADOR
O Autolog não tem publicidade, não usa identificador de propaganda e não tem
nenhuma ferramenta de análise de uso. Ninguém aqui sabe quantas telas você
abriu. Não pedimos CPF, nem nome do proprietário, nem endereço.

Se quiser levar seus dados embora, exporte tudo num arquivo. Se quiser sumir,
apague a conta dentro do app: some de todos os aparelhos, sem cópia.
```

---

## O que mudou no app para ele virar app

Três defeitos que só existem fora do navegador, corrigidos agora. Ficam
registrados porque cada um esconde uma armadilha própria.

**O botão Voltar fechava o app.** No navegador, o Voltar é do navegador. Numa
TWA não há barra de endereço nem gesto alternativo: o Voltar do sistema era a
única saída, e fechava o Autolog a partir de qualquer tela — inclusive com uma
folha de lançamento aberta. Agora ele recua dentro do app, e a pilha de
histórico não cresce com o passeio pelas abas. Ver `js/voltar.js`.

**O app não abria sem rede.** A biblioteca do Supabase vinha de CDN, e o
service worker não guarda pedido de outra origem. Sem rede ela não chegava, e
o app parava em *"Sem conexão"* — com a garagem inteira no aparelho, do outro
lado do vidro. A biblioteca passou a ser servida por nós, em versão fixa. Ver
`js/vendor/LEIA-ME.md`.

**A sessão morria com o sinal.** Mesmo com a biblioteca no lugar: o token de
acesso vale uma hora e, sem rede, a renovação falha — a biblioteca responde
"sem sessão" e o app caía na tela de login. Agora ele distingue *sem rede* de
*sessão encerrada* pelo comportamento medido da própria biblioteca: quando o
servidor recusa, ela apaga o token guardado; quando falta rede, ela o mantém.
Ver o comentário em `js/conta.js`.

De quebra, a fonte também deixou de vir do Google: offline ela não vinha, e o
app abria com outra cara. Ver `ds/fontes.css`.
