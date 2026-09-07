# Autolog · Sua garagem, em ordem

App web para acompanhar custos, revisões, documentos e manutenção de **carro ou
moto**. HTML/CSS/JS puro — sem build, sem dependências.

Nasceu do canvas **`Garagem.dc.html`** (projeto Claude Design *Assistente
pessoal veicular*), na época em que se chamava Motoreiro e só cuidava de motos.

## Onde o app roda

**No ar, para uso de verdade:**
<https://brennoc-bit.github.io/egarage/autolog/>

Servido pelo GitHub Pages, que publica o conteúdo da branch `main`. **Não
depende de nenhum computador seu estar ligado, nem de sessão de trabalho
aberta.** Está no ar 24 horas por dia enquanto o repositório existir e o Pages
estiver ativo. Cada `git push` na `main` republica sozinho em um ou dois
minutos, e como o service worker busca a rede primeiro, o celular pega a versão
nova ao reabrir o app.

> O endereço mudou quando o app deixou de se chamar Motoreiro: o antigo
> `/egarage/motoreiro/` responde **404**. Se algum atalho antigo sobrou no
> celular, apague e instale de novo pelo endereço acima.

**Na máquina, para desenvolver:**

```bash
python -m http.server 5174
```

Depois abra <http://127.0.0.1:5174/> (ou use `.claude/launch.json`, alvo
`autolog`). Esse servidor é só para editar e testar localmente — nada a ver com
o app publicado. Pode ligar e desligar à vontade.

Uma limitação do servidor local: **em `http://` o navegador não registra
service worker nem oferece instalar como app**, porque isso exige origem
segura. Para testar o comportamento de app instalado, use o endereço do Pages.

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `index.html` | Casca: cabeçalho, área de tela, navegação inferior |
| `ds/modernist.css` | Design system Modernist, cópia fiel do projeto de design (fonte da verdade dos tokens) |
| `styles.css` | Classes do canvas portadas para o app + casca responsiva |
| `js/util.js` | Helpers de DOM, datas ISO locais e formatação pt-BR |
| `js/store.js` | Modelo de dados, planos de manutenção por tipo, seed, persistência e mutações |
| `js/calc.js` | Cálculos derivados: km, custo/km, diagnóstico, documentos, financiamento |
| `js/ui.js` | Peças visuais reutilizáveis, campos, folha de formulário, toast, foto |
| `js/auth.js` | Porteira de acesso do protótipo (**não é autenticação real**) |
| `js/regiao.js` | Onde a pessoa dirige (GPS, CEP ou lista) e o que isso destrava |
| `js/fipe.js` | Consulta o valor do veículo na tabela FIPE, com cache mensal |
| `js/screens.js` | As telas, incluindo o cadastro de veículo |
| `js/app.js` | Roteador + ações |
| `sw.js` | Service worker: rede primeiro, cache como reserva |
| `ferramentas/gerar-icones.py` | Gera os ícones PWA em Python puro |
| `ferramentas/gerar-veiculos.py` | Gera o catálogo de marcas e modelos a partir da FIPE |
| `ferramentas/gerar-precos.py` | Gera o preço médio de combustível a partir da planilha da ANP |
| `dados/ipva.json` | Alíquotas de IPVA e taxa de licenciamento por estado — **mantido à mão** |

## Carro e moto

Cada veículo tem um **tipo**, e o tipo define o plano de manutenção:

- **Moto** — óleo, filtro de ar, velas, fluido de freio, pastilhas, pneu
  dianteiro, pneu traseiro, corrente e coroa, bateria, revisão.
- **Carro** — óleo, filtro de óleo, filtro de ar, filtro de combustível, filtro
  de cabine, velas, fluido de freio, pastilhas dianteiras e traseiras, pneus,
  alinhamento e balanceamento, correia dentada, fluido de arrefecimento,
  bateria, revisão.

Trocar o tipo de um veículo já cadastrado troca o plano, preservando o que já
foi registrado nos itens que existem nos dois.

## Telas

Cinco abas — Início · Manutenção · Custos (Custo/km · Histórico ·
Financiamento) · Docs · Perfil — mais duas rotas sem aba: a **Ficha** do
veículo, aberta ao tocar no nome dele no Início, e o **Cadastro de veículo**,
com foto, tipo e campos agrupados em Identificação, Documentos, Uso,
Financiamento e despesas anuais. A mesma tela serve para editar a ficha depois.

### As duas contas de custo, e por que são duas

O app responde a **duas perguntas diferentes** sobre a mesma despesa, e é de
propósito que os números não batem mês a mês:

| | Onde | Como trata IPVA, licenciamento e seguro |
| --- | --- | --- |
| **Custo por mês** | Início, bloco do meio | Diluídos em doze — responde *"quanto custa em média"* |
| **Previsão dos 6 meses** | Início, logo abaixo · tela cheia em "mês a mês" | Cada um no mês em que vence — responde *"em qual mês vai doer"* |

No ano as duas fecham parecido. O que muda é onde o dinheiro aparece, e é essa
diferença que a média esconde: na moto de demonstração o custo médio é R$ 274
por mês, mas outubro custa R$ 1.363 porque a apólice vence inteira nele.

A previsão empilha três faixas por mês — parcela e seguro, combustível, e o que
vence naquele mês — então a altura diz *quanto* e a cor diz *por quê*. A linha
tracejada é a média dos seis meses.

**De onde sai cada número:**

- **Parcela do financiamento e do seguro**: acabam quando acabam. A parcela some
  do mês em que a última é paga, em vez de se repetir para sempre.
- **Combustível**: média dos 3 meses fechados; a tela avisa quando ainda é
  estimativa.
- **IPVA, licenciamento, renovação da apólice**: a data real de cada um, do
  final da placa ou da apólice.
- **Manutenção**: posicionada pelo ritmo de uso (km dos últimos 90 dias ÷ 3).
  Um item pode vencer por km ou por idade — vale o que chegar primeiro, e a
  tela diz qual dos dois mandou.
- **Preço da manutenção**: só do histórico. O app procura o que já foi pago pelo
  mesmo serviço e mostra de qual lançamento tirou o valor. **Sem serviço
  registrado, ele entra na previsão como data e soma zero** — aparece na lista
  de "sem preço no histórico" em vez de virar um chute.

O casamento com o histórico é por `itemId` nos lançamentos novos; nos antigos,
por palavra, exigindo que **todas** as do item apareçam no título. É o que
separa "Filtro de ar" de "Filtro de óleo" e "Pneu dianteiro" de "Pneu traseiro"
— um casamento frouxo poria dinheiro errado na previsão.

**A barra já foi outra.** Havia uma aba "Garagem" que repetia o Início — mesma
foto, mesmo custo mensal, mesmo odômetro — e um Histórico escondido dentro
dela, enquanto a Manutenção, que é o que se olha toda semana, só era alcançável
por dentro de um cartão. Isso vinha do canvas, onde cada tela era vista sozinha
e precisava repetir o contexto; em aba, quem navega já sabe onde está. O Início
virou a tela do veículo, o Histórico foi para junto das outras contas e a
Manutenção subiu para a barra.

Um **botão flutuante** no canto inferior direito registra abastecimento de
qualquer tela — é a ação mais repetida do app.

## O que o app não inventa

O **seguro** é perguntado no cadastro, nunca estimado: valor de apólice depende
de seguradora, perfil e histórico, e um número chutado seria pior que nenhum.
Campo em branco simplesmente não é acompanhado.

**IPVA e licenciamento mudaram de status.** Desde que o app conhece a região, os
dois passaram a ser *calculados*: valor FIPE vezes a alíquota do estado, e a taxa
que o Detran publicou. A regra continua a mesma — o que o app não faz é **chutar**
—, e conta com fonte declarada não é chute. O que entra assim fica marcado como
estimativa na própria ficha. Ver *Sua região*, mais abaixo.

O mesmo vale para o financiamento. O cadastro pergunta se o veículo está
quitado; se não estiver, pede o valor da parcela, quantas faltam e o dia do
vencimento. Com isso a tela inicial mostra o **custo por mês**: parcela +
despesas anuais diluídas em doze + a média real de combustível dos três meses
fechados anteriores.

### Seguro: cobertura e pagamento são coisas diferentes

A apólice costuma valer 12 meses, mas pode estar sendo paga em 3 parcelas —
e as duas datas não têm relação. O app trata isso como duas linhas do tempo
separadas, e o cartão do seguro mostra as duas, uma embaixo da outra:

```
COBERTURA    Cobertura até 18/06/2027 · 9 meses
PAGAMENTO    2 parcelas de R$ 413,33 · faltam R$ 826,66
```

O cadastro pergunta *Tem seguro?* e, se sim, *Já está pago?*. Enquanto houver
parcelas, o valor entra no custo mensal como dinheiro saindo; quitado, vira
uma provisão de 1/12 para a renovação. Quitar a última parcela **não encerra a
cobertura** — o app diz isso explicitamente.

### A tela da seguradora

Do cartão do seguro, o botão *Apólice e contatos* abre uma tela pensada para o
pior momento — batida, pane, roubo — quando ninguém tem paciência de procurar
menu:

- **Contatos no topo, como botões de ligar.** Assistência 24h em destaque, em
  vermelho e maior que os outros; depois central da seguradora, corretor,
  WhatsApp e site. Tocar disca.
- **Apólice**: número com botão de copiar, cobertura, pagamento e valores.
- **Cobertura contratada**: franquia, limites de RCF e as coberturas marcadas.
- **Assistência**: guincho até X km, carro reserva por X dias e os serviços
  incluídos.
- **"Dados que vão te pedir"**: veículo, placa (com copiar), chassi, renavam e
  cor — exatamente o que a central pergunta no telefone.

Campo vazio não aparece: a tela mostra só o que foi preenchido. Nada de CPF ou
documento pessoal, de propósito — o app não precisa disso para ser útil, e o
arquivo de exportação ficaria carregando dado sensível à toa.

A única coisa derivada é a próxima revisão, calculada pelo odômetro e pelo
intervalo do tipo de veículo — e sem preço associado.

## Foto do veículo: enquadrar antes de salvar

O botão de foto abre um **editor** em vez de aceitar a imagem como veio.
Arrastar move, pinçar ou usar a barra aproxima, e a moldura é **a mesma
proporção (16:9) em que a foto aparece no app** — o que se vê é o que fica.

Enquanto se ajusta, é `transform` de CSS (resposta imediata); só ao confirmar
vira canvas, recortado em 1100×619 e salvo em JPEG 0.78.

## Avisos de vencimento

Em **Perfil → Avisos de vencimento** dá para ligar o aviso e escolher a
antecedência: 3, 7, 15 ou 30 dias. Entram parcelas de IPVA, licenciamento, fim
da cobertura do seguro e a parcela do financiamento.

### O limite, dito de frente

**Um site estático não acorda o celular sozinho.** Notificação agendada com o
app fechado exige um servidor mandando push, que este app não tem. Então são
dois caminhos, e o app oferece os dois:

1. **Aviso ao abrir o app** — confiável, mas só aparece quando você abre.
2. **Exportar para o calendário (`.ics`)** — o alarme fica no celular e dispara
   com o app fechado. É o único jeito de ser avisado sem depender de abrir.

O segundo é o que resolve; o primeiro é complemento. O arquivo leva os
compromissos dos próximos 12 meses, cada um como evento de dia inteiro com
`VALARM` na antecedência escolhida.

## Sua região: combustível, IPVA e licenciamento

Informar onde você dirige destrava três contas que antes eram chute ou
pergunta. **Perfil → Onde você dirige**, por três caminhos que gravam a mesma
coisa (`{ uf, municipio }`):

| Caminho | Como funciona | Quando falha |
| --- | --- | --- |
| **GPS** | `navigator.geolocation` + Nominatim (OpenStreetMap) para virar cidade | Permissão negada, ou fora do Brasil |
| **CEP** | BrasilAPI, com ViaCEP como reserva | CEP inexistente |
| **Lista** | As 27 UFs num seletor | Nunca — é o caminho que não depende de nada |

Nenhum é obrigatório. Se o GPS for negado e os serviços de CEP caírem, a lista
continua ali.

### Preço do combustível — o que o número é, e o que não é

Vem do **Levantamento de Preços de Combustíveis da ANP**, a pesquisa semanal
oficial. `ferramentas/gerar-precos.py` baixa a planilha `.xlsx` do gov.br e gera
`dados/combustiveis.json` (43 KB): 386 municípios, 27 estados, 5 regiões e a
média nacional, com gasolina, aditivada, etanol, diesel, S10 e GNV.

**Por que embarcado, e não ao vivo:** o gov.br não manda cabeçalho CORS — o
navegador simplesmente não consegue baixar a planilha. Sem servidor próprio,
embarcar é o único caminho. Para atualizar, rode o script e dê push.

**A pesquisa cobre 386 municípios, não os 5.570 do país.** Por isso o app cai de
nível — município → estado → região → Brasil — e **diz na tela qual está
mostrando**: "média de Curitiba" é uma informação diferente de "média do
Paraná", e quem lê precisa saber qual das duas está vendo.

É a média de postos pesquisados, nunca o preço do posto da esquina. No cadastro
ela aparece como sugestão com um link "usar este" — o preço que você paga de
fato continua valendo mais.

### IPVA e licenciamento — tabela mantida à mão

**Não existe API de alíquota de IPVA.** São 27 legislações estaduais publicadas
em PDF. `dados/ipva.json` é escrito e revisado à mão, uma vez por ano em
janeiro, com alíquota de carro e moto, taxa de licenciamento e o link da Sefaz
de cada estado.

Os valores foram cruzados entre duas fontes secundárias. **Onde as duas
divergiram, o estado leva `"conferir": true`** e a tela mostra um aviso
nomeando o problema em vez de fingir certeza.

### Valor FIPE — ao vivo, com duas redes de proteção

O IPVA é o valor do veículo vezes a alíquota, então o app precisa saber quanto
o veículo vale. `js/fipe.js` consulta a API comunitária da FIPE a partir do
próprio aparelho: **500 consultas por dia sem cadastro**, e como a chamada sai
do celular de cada pessoa, essa cota é individual — não ter servidor, aqui,
joga a favor.

Serviço grátis não tem contrato, então:

1. O resultado fica guardado com o mês de referência. A FIPE muda uma vez por
   mês; uma consulta mensal por veículo basta.
2. **O valor é sempre editável.** Se a API sumir amanhã, você digita e o app
   continua calculando.

O catálogo do app guarda o modelo curto (`CB 300F`); a FIPE guarda a versão
inteira (`CB 300F Twister Flex`, `CB 300F Twister S`) e cada uma vale um valor
diferente. Adivinhar seria errar o IPVA de alguém — quando há mais de uma, o
app **pergunta**, uma vez só, e guarda os códigos.

### A estimativa preenche a ficha, não só informa

Mostrar o número ao lado dos documentos não adiantava nada se a ficha continuava
pedindo digitação. Então:

- **No cadastro**, licenciamento e IPVA já vêm preenchidos — o primeiro assim que
  a região é conhecida, o segundo assim que há valor FIPE. Consultar ou digitar
  o FIPE recalcula o IPVA na hora.
- **Em veículo já cadastrado**, o botão *Preencher a ficha* (tela de Documentos)
  aplica IPVA, licenciamento e preço do litro de uma vez, **preservando
  parcelamento, datas e parcelas já pagas** — troca só os valores.
- **Campo digitado à mão nunca é sobrescrito.** A estimativa só toca em campo
  vazio ou que ainda tem o valor que ela mesma pôs.
- Tudo que entra assim fica marcado `estimado: true`, e a ficha diz na cara:
  *valor estimado pela sua região — confirme na guia oficial*.

Isso não contradiz a regra de **não inventar valor**. Chute era escrever
"IPVA: R$ 1.200" sem base nenhuma. Aqui é conta: valor FIPE vezes a alíquota do
estado, e a taxa que o Detran publicou.

### Vencimento pelo final da placa — com um buraco declarado

O app lê o último dígito da placa e preenche as datas de IPVA e licenciamento.
O calendário mora em `dados/ipva.json`, no bloco `calendario`.

**Ele não cobre os 27 estados.** Cada um publica o seu todo ano, e não encontrei
fonte confiável para todos. Estão dentro: **SP, RJ, MG, PR, SC** (IPVA e
licenciamento), **AL** (IPVA) e **RS, BA** (licenciamento). Nos outros, a tela
diz que o calendário não está no app e deixa a data com o usuário — inventar
data de imposto seria pior que admitir o buraco.

Duas ressalvas que a tela repassa em vez de esconder:

- **Projeção.** Quando a data do ano vigente já passou, o app repete o mesmo dia
  no ano seguinte e avisa que é previsão. O calendário verdadeiro só sai quando
  o estado publicar, e costuma andar alguns dias.
- **Fonte única.** RJ (licenciamento) e AL (IPVA) vieram de uma fonte só e levam
  aviso extra para conferir na Sefaz.

Datas só são reescritas em documento sem nenhuma parcela paga. Parcela paga tem
data real; sobrescrever apagaria o histórico de quem já pagou.

### O aviso que a tela nunca esconde

O IPVA de um ano é calculado sobre a tabela FIPE do **ano anterior**, e ainda
existe desconto à vista, isenção por idade do veículo e alíquota menor para
álcool e GNV em vários estados. O número do app é **estimativa para planejar**,
e cada tela diz isso e leva à Sefaz do estado. Errar imposto para menos é pior
do que não calcular.

## Autocompletar de marca e modelo

Os campos **Marca**, **Modelo** e **Cor** do cadastro sugerem enquanto você digita, no
estilo do Webmotors. Tocar abre a lista; digitar filtra sem acento e sem caixa
(`citro` acha `Citroën`). Escolher a marca restringe os modelos àquela marca.

E se você digitar só o modelo, sem saber a marca, ele procura em todas e mostra
`Civic · Honda` — ao tocar, **preenche os dois campos de uma vez**.

**O campo nunca restringe.** Catálogo envelhece e não cobre importado nem
modelo do ano que vem: o que você digitar sempre vale, a sugestão só poupa
digitação.

### De onde vêm os dados

`dados/veiculos.json` (23 KB) traz 106 marcas e 1.214 modelos de carro, 103
marcas e 1.111 modelos de moto. É gerado por `ferramentas/gerar-veiculos.py`
a partir da **API pública da tabela FIPE** — não escrito à mão.

O arquivo é estático e embarcado de propósito. Consultar a API a cada tecla
seria lento, quebraria o uso offline do PWA e dependeria de um serviço
comunitário estar no ar. Para atualizar, rode o script de novo; leva alguns
minutos, porque são ~200 marcas com pausa entre as chamadas.

A FIPE devolve **versões**, não modelos — `"Civic Sedan LXR 2.0 Flexone 16V
Aut. 4p"` é uma das 117 entradas de Honda. O script corta a versão e guarda o
nome, com três regras calibradas:

| FIPE | vira |
| --- | --- |
| `Civic Sedan LXR 2.0 Flexone 16V Aut. 4p` | `Civic` |
| `Compass Longitude 2.0 4x2 Flex 16V Aut.` | `Compass` |
| `Grand Siena ESSENCE 1.6 Flex 16V` | `Grand Siena` |
| `CG 160 Titan` | `CG 160` |
| `CB 500F ABS` | `CB 500F` |

A regra do meio é a que exige cuidado: em moto o número é parte do nome
(`CG 160`), em carro é a versão (`Civic 2.0`). O script distingue pelo formato —
`160` é cilindrada, `2.0` é motor.

## Leitura por foto (Google Gemini)

Nas telas de **abastecimento**, **odômetro** e **lançamento** há dois botões:
**Câmera** e **Galeria**. A imagem vai para o Gemini, que devolve os campos já
separados, e o app **preenche o formulário para você conferir**. Nada é salvo
automaticamente: leitura de OCR erra, e aqui se trata de dinheiro e
quilometragem. Os campos preenchidos pela IA ficam destacados.

Os dois caminhos existem porque o momento de fotografar e o de lançar
raramente são o mesmo: dá para fotografar o cupom no posto, com o celular na
mão, e registrar em casa escolhendo a imagem da galeria.

Ligar em **Perfil → Leitura por foto**, colando uma chave gerada em
[aistudio.google.com/apikey](https://aistudio.google.com/apikey). O app testa a
chave na hora de salvar.

### Onde a chave mora, e por quê

O Autolog é um site estático em um repositório **público**: todo o JavaScript é
baixado pelo navegador. Chave de API no código seria chave vazada — qualquer
pessoa leria no GitHub e gastaria na conta do dono.

Por isso a chave é **digitada dentro do app e guardada só no aparelho**, em
`localStorage` (`autolog-gemini-chave`). Ela nunca é commitada e **não entra no
arquivo de exportação da garagem** — a exportação só serializa o estado do
`Store`, e a chave vive fora dele.

A contrapartida honesta: isso serve para uso pessoal, em que cada pessoa usa a
própria chave e paga o próprio consumo. **Não serve para um app com vários
usuários** — ninguém instala um app e cola uma chave de API.

### O caminho para vários usuários

Quando for a hora, a chave sai do aparelho e vai para um servidor intermediário:
uma função serverless (Cloudflare Workers, Vercel, Netlify) recebe a imagem,
chama o Gemini com a chave que só ela conhece, e devolve o JSON. O app continua
estático.

`js/gemini.js` já está preparado: só `endpoint()` e `cabecalhos()` mudam. O
resto do arquivo — prompts, extração do JSON, tradução dos erros — continua
igual.

### Como cada tipo é lido

| Botão | O que a foto mostra | Campos que voltam |
| --- | --- | --- |
| Fotografar nota ou bomba | Cupom fiscal ou display da bomba | data, litros, valor, preço/litro, posto, combustível, km |
| Fotografar o painel | Painel do carro ou moto | km (o hodômetro **total**, não o parcial) |
| Fotografar a nota | Nota de serviço ou peça | data, valor, descrição, oficina, categoria, km |

O prompt manda devolver `null` no campo ilegível em vez de inventar, e pede os
números já convertidos do formato brasileiro (1.234,56 → 1234.56). Quando algo
fica duvidoso, a resposta traz uma observação curta que aparece no toast.

O modelo padrão é `gemini-2.5-flash` e pode ser trocado na mesma tela — se o
nome sair de linha, o app mostra "modelo não encontrado" em vez de falhar calado.

### Qual modelo serve

Praticamente todo Gemini **Flash** e **Pro** atual é multimodal: aceita imagem
e devolve texto. Para ler cupom, painel e bomba, um **flash** é a escolha certa
— é o mais rápido e barato, e a tarefa é simples.

Não servem, e por isso somem da lista: modelos de **embedding** (devolvem
vetor, não texto), de **geração** de imagem ou vídeo (`-image`, `imagen`,
`nano-banana`, `veo`), e os de **voz** (`tts`, `live`, `transcribe`).

Mas a lista é só um filtro por nome. Quem dá a palavra final é o botão
**salvar e testar com imagem**: ele gera uma figura com um número aleatório,
manda para o modelo escolhido e confere se voltou o número certo. Um teste só
de texto passaria com modelo que não enxerga figura, e a falha só apareceria na
frente da bomba.

### Custo

A chave é gratuita. O **uso** tem camada grátis nos modelos de texto e leitura
— os `flash` e `pro` — com limite diário. Sem forma de cobrança cadastrada,
estourar o limite bloqueia até a cota renovar; não vira fatura por conta.

Os modelos de **geração** de imagem são a exceção perigosa: a tabela oficial
marca `Free Tier: Not available` para eles. Escolher um por engano faz a
primeira chamada já voltar 429, sem nunca ter funcionado. Eles são filtrados da
lista, e se ainda assim um for usado, a mensagem de erro explica exatamente
isso em vez de dizer "tente daqui a pouco".

### O modelo é perguntado à API, não adivinhado

Nomes de modelo entram e saem de linha, e um nome errado derruba tudo com um
404. Em vez de fixar um palpite, a tela tem **buscar modelos disponíveis**: o
app chama o `ListModels` da API, filtra os que aceitam `generateContent` e
mostra em botões — um toque escolhe. Modelos *flash* aparecem primeiro, por
serem os mais baratos e rápidos para leitura de imagem.

A escolha guarda também **a versão da API** (`v1beta` ou `v1`) em que aquele
modelo apareceu, porque nem todo modelo existe nas duas. A busca tenta as duas
versões, em ordem.

### Dois formatos de chave, duas formas de autenticar

O Google está trocando o formato das chaves do AI Studio: as antigas ("traffic
keys") começam com `AIza`, as novas ("auth keys") começam com `AQ.`, e a partir
de setembro de 2026 as antigas passam a ser recusadas. Há relatos de chaves
`AQ.` sendo rejeitadas no endpoint REST com `ACCESS_TOKEN_TYPE_UNSUPPORTED`.

O app **não julga a chave pelo prefixo** — essa suposição já quebrou uma vez.
Ele envia no cabeçalho documentado (`x-goog-api-key`) e, se a recusa for
especificamente de tipo de credencial, repete a chamada como
`Authorization: Bearer` antes de desistir. Erro de outra natureza não gera
segunda tentativa.

Quando mesmo assim falha, a tela de configuração mostra o **erro cru da API**
— status, qual forma de autenticação foi usada, modelo e a mensagem do Google —
com botão de copiar. É o que permite diagnosticar em vez de adivinhar.

### Ajustando as instruções

Cada um dos três tipos tem uma instrução própria, **editável em Perfil →
Leitura por foto**. É o texto que viaja junto com a imagem, e é por ele que se
corrige leitura ruim: nota de posto brasileiro varia muito, e descrever onde
fica cada informação costuma resolver mais do que trocar de modelo.

Cada caixa mostra os campos que o app espera de volta e tem **restaurar
padrão**. A regra é uma só: manter o pedido de JSON e os nomes dos campos, que
são o contrato usado para preencher o formulário. Uma instrução editada ganha
o selo "editada"; se a resposta parar de vir em JSON, a mensagem de erro sugere
restaurar o padrão.

## O que é calculado (nada é estático)

- **Odômetro / km rodado** — a partir das leituras registradas em cada lançamento.
- **Custo/km e composição** — gasto real do período dividido pelo km real do período, agrupado por categoria.
- **Consumo médio** — km entre abastecimentos ÷ litros abastecidos (cai no consumo de referência enquanto não há dois abastecimentos).
- **Diagnóstico** — cada item cruza intervalo em km e/ou meses com o odômetro e a data do último serviço.
  Verde/amarelo/vermelho saem daí; o score é `ok + 0,65·atenção + 0,1·urgente`, limitado a 70 quando há item vencido.
- **Documentos** — parcelas do IPVA, licenciamento, apólice anual e revisão por km, com prazo, progresso e status por proximidade.
- **Financiamento** — Tabela Price ou SAC, com comparação de prazos e cenários salvos.

## Instalar como app no celular

O app é um PWA: com **HTTPS**, o Chrome oferece *Instalar app* e ele abre em
tela cheia, com ícone próprio e funcionando offline. Pelo IP da rede local
(`http://…:5174`) isso não acontece — em HTTP o navegador degrada para um
atalho comum. Por isso a publicação é no GitHub Pages.

Os ícones são gerados por `ferramentas/gerar-icones.py` (biblioteca padrão, sem
dependência): um mostrador com ponteiro, emblema geométrico escolhido para não
amarrar o ícone a nenhuma letra ou nome.

## Estado dos dados

Tudo fica em `localStorage` (`autolog-v1`), por navegador. Garagens criadas na
versão anterior (`motoreiro-v1`) são migradas na primeira abertura, e os
veículos que existiam entram como moto. “Restaurar dados de demonstração”, no
Perfil, recria o exemplo — uma moto e um carro, sempre relativos à data de hoje.

## Desvios conscientes do canvas

- **Números do mock não foram copiados.** O canvas tem valores inconsistentes entre telas
  (ex.: gasto do mês R$ 386 na tela 01 e R$ 173 na 07). Aqui tudo vem dos lançamentos.
- **Barra de status do celular (9:41 · 5G · 100%)** foi removida: é artefato de mockup.
- **“Enviar para banco”** virou **“Salvar simulação”**, que de fato guarda o cenário.
- **Foto do veículo** é real (câmera/galeria, redimensionada no cliente e salva como data URL).
  O canvas previa tratá-las em preto e branco com o `.grayscale` do DS; aqui elas saem
  **coloridas** — é a moto ou o carro do dono, não peça de catálogo. O hachurado
  do canvas ficou como estado vazio.
- **Cores de sinal** (verde `#2d8a4a` / âmbar `#e0a91b` / vermelho do acento) seguem a nota do
  canvas: entram só como sinal, fora da paleta mono-vermelha do Modernist.

## Limites conhecidos

O app é **pt-BR e brasileiro no conteúdo**: interface em português, valores em
R$, e os documentos são IPVA, licenciamento e Detran. Levá-lo para fora do
Brasil pede tradução, moeda por localidade e documentos configuráveis por país.
