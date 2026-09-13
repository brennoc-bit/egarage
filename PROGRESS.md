# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-09-13 — passo 5 de 7: garagem nasce vazia, com tela de boas-vindas

---

## Como o app roda (leia antes de estranhar)

São duas coisas diferentes, e confundi-las já custou um susto de 404:

| | Endereço | Depende de quê |
| --- | --- | --- |
| **Publicado** | <https://brennoc-bit.github.io/egarage/autolog/> | Só do GitHub Pages e da branch `main`. Fica no ar sozinho. |
| **Local, para desenvolver** | `python -m http.server 5174` dentro de `autolog/` | Do servidor estar rodando na máquina. |

Fechar a sessão de trabalho, desligar o PC ou parar o servidor local **não
derruba o app publicado**. Testado em 2026-08-23: com o servidor local
respondendo `000`, o endereço do Pages seguia respondendo `200`.

Para publicar uma mudança, basta `git push` na `main`.

---

## O que já foi feito

### `autolog/` — app principal ✅ v1 funcional

**Era `motoreiro/` e só servia motos. Agora se chama Autolog e serve carro e
moto.** A pasta foi renomeada; o app, o ícone, o manifest e as chaves de
armazenamento acompanharam.

App web em HTML/CSS/JS puro, sem build, em pt-BR. Nasceu do canvas
`Garagem.dc.html` do projeto Claude Design *Assistente pessoal veicular*
(`projectId 301e9cee-dc57-4cdb-8752-3e2578c1c667`), com o design system
Modernist copiado fiel em `ds/modernist.css`.

Cinco abas — Início · Garagem (Resumo/Ficha/Histórico) · Custos (Custo/km +
Financiamento) · Docs · Perfil — mais duas rotas próprias: Diagnóstico e
Cadastro de veículo.

Nada é estático: custo/km sai do gasto real dividido pelo km real do período;
consumo médio vem dos abastecimentos; o diagnóstico cruza intervalo em km e
meses com odômetro e data do último serviço; documentos calculam prazo,
progresso e status. Funciona registrar abastecimento, lançar peça, registrar
serviço feito, pagar parcela, renovar apólice, agendar oficina, simular
financiamento (Price e SAC), cadastrar veículos, trocar foto e exportar/importar
a garagem em `.json`. Persistência em `localStorage` (`autolog-v1`), com
migração automática da chave antiga `motoreiro-v1`.

Rodar: `python -m http.server 5174` dentro de `autolog/`. Detalhes de
arquitetura e desvios do design estão no `autolog/README.md`.

### Carro e moto ✅

- Cada veículo tem um **tipo** (`carro` | `moto`), e o tipo define o plano de
  manutenção: moto tem corrente e coroa, pneu dianteiro e traseiro; carro tem
  correia dentada, filtro de combustível, filtro de cabine, fluido de
  arrefecimento, alinhamento e pastilhas dianteiras e traseiras — 15 itens
  contra 10 da moto.
- Trocar o tipo de um veículo existente **replaneja** a manutenção preservando o
  histórico dos itens que existem nos dois. Testado: óleo mantém o último km.
- Linguagem do app deixou de ser de moto ("Sua garagem · 2 veículos", "+ Novo",
  "Cadastrar primeiro veículo").
- Dados de exemplo passaram a ser uma moto (CB 300F) e um carro (Onix).

### Custos reais, sem chute ✅

O app inventava IPVA, seguro, licenciamento e até um preço de revisão para todo
veículo novo — números que não vinham de lugar nenhum. **Agora ele pergunta.**

- O cadastro pergunta IPVA (valor do ano, em quantas parcelas, vencimento da
  1ª) e licenciamento (valor, vencimento); o seguro ganhou seção própria, logo
  abaixo. Campo em branco não vira documento.
- A única coisa derivada é a próxima revisão, calculada pelo odômetro e pelo
  intervalo do tipo de veículo — e sem preço associado.
- Editar a ficha preserva o que já foi pago: parcelas quitadas continuam
  quitadas mesmo se o valor do IPVA mudar.

### Financiamento e custo mensal ✅

O cadastro pergunta **"Carro quitado? / Moto quitada?"**. Se não estiver, pede
valor da parcela, parcelas restantes e dia do vencimento.

Com isso a tela inicial ganhou o bloco **Custo por mês**: parcela + despesas
anuais diluídas em doze + média real de combustível dos três meses fechados
anteriores. Quem não informou nada vê um convite para completar a ficha, não um
número inventado.

Na aba Docs há um cartão do financiamento com saldo, progresso e o botão
*Registrar parcela paga*, que baixa uma parcela e lança a despesa do mês.
Zerando as parcelas, o veículo vira quitado sozinho.

### Seguro: cobertura separada do pagamento ✅

A apólice vale 12 meses, mas pode estar sendo paga em 3 parcelas — e as duas
datas não têm relação. O app passou a tratar isso como duas linhas do tempo:

- O cadastro pergunta **"Tem seguro?"** e, se sim, **"Já está pago?"**. Não
  estando pago, pede valor da parcela e quantas faltam, além da seguradora, do
  valor total e da data **até quando a cobertura vale**.
- O cartão do seguro na aba Docs mostra as duas linhas rotuladas, uma embaixo
  da outra: `COBERTURA até 18/06/2027 · 9 meses` e `PAGAMENTO 2 parcelas de
  R$ 413,33 · faltam R$ 826,66`.
- Enquanto há parcelas, o valor entra no custo mensal como dinheiro saindo;
  quitado, vira provisão de 1/12 para a renovação — com rótulos diferentes.
- Quitar a última parcela **não encerra a cobertura**: o app avisa
  explicitamente ("Seguro quitado · cobertura mantida").
- Garagens antigas migram sozinhas: o seguro que era uma despesa anual genérica
  vira o novo formato com pagamento quitado.

### Tela da seguradora ✅

Do cartão do seguro na aba Docs, o botão *Apólice e contatos* abre uma rota
própria (`seguro`), desenhada para o momento de aperto:

- **Contatos como botões de ligar**, no topo: assistência 24h em destaque
  (vermelho, 76px de altura), central, corretor, WhatsApp e site. Os telefones
  viram `tel:` com os dígitos limpos, o WhatsApp vira `wa.me` com o 55 na
  frente.
- Apólice com número copiável, cobertura, pagamento e valores.
- Cobertura contratada: franquia, RCF materiais e corporais, e as coberturas
  marcadas em chips.
- Assistência: guincho até X km, carro reserva por X dias, serviços incluídos.
- **"Dados que vão te pedir"**: veículo, placa copiável, chassi, renavam e cor
  — o que a central pergunta no telefone.
- Edição em formulário próprio (`seguro-editar`), com rascunho que sobrevive ao
  toque nas chips e é descartado ao cancelar.

Campo vazio não aparece na tela. **Não há campo de CPF nem documento pessoal**,
de propósito: não é necessário para o app ser útil e sujaria o arquivo de
exportação com dado sensível.

### Região: combustível, IPVA e licenciamento ✅ a maior entrega até aqui

O usuário informa onde dirige — **GPS, CEP ou lista de estados**, os três
gravando o mesmo `{ uf, municipio }` — e isso destrava três contas.

**Preço do combustível.** `ferramentas/gerar-precos.py` baixa a planilha semanal
da ANP e gera `dados/combustiveis.json` (43 KB): 386 municípios, 27 estados,
5 regiões, média nacional. Embarcado porque o gov.br não manda CORS — o
navegador não consegue buscar direto. **Rodar o script é manual, por escolha do
usuário** (nada de GitHub Actions). A pesquisa cobre 386 dos 5.570 municípios,
então o app cai município → estado → região → Brasil e **diz na tela qual nível
está mostrando**.

**IPVA e licenciamento.** `dados/ipva.json`, mantido à mão, revisar em janeiro:
alíquota de carro e moto, taxa de licenciamento e link da Sefaz para as 27 UFs.
Não existe API — são 27 legislações em PDF. Os números foram cruzados entre duas
fontes secundárias e, onde divergiram, o estado leva `"conferir": true` e a tela
avisa em vez de fingir certeza (AL, AM, BA, CE, DF, MA, MT, MS, PB, PE, SE).

**Valor FIPE.** `js/fipe.js` consulta ao vivo do aparelho do usuário: 500/dia por
IP, ou seja, cota individual. Cache com o mês de referência e campo sempre
editável, porque serviço comunitário não tem contrato. Quando o modelo tem mais
de uma versão na FIPE (`CB 300F Twister Flex` × `Twister S`), o app **pergunta**
em vez de adivinhar — adivinhar seria errar o IPVA de alguém.

**O aviso que não sai da tela:** o IPVA de um ano usa a tabela FIPE do ano
anterior, e há desconto à vista, isenção por idade e alíquota menor para álcool
e GNV. É estimativa para planejar, com link para a Sefaz.

**Correção depois do teste no aparelho.** A primeira versão só *mostrava* a
estimativa ao lado dos documentos: a ficha do veículo continuava exigindo
digitação, o que anulava o sentido da coisa. Agora a estimativa **vira o dado**:

- No cadastro, **licenciamento e IPVA já vêm preenchidos** — o licenciamento
  assim que a região é conhecida, o IPVA assim que há valor FIPE (digitar ou
  consultar o FIPE recalcula o IPVA na hora). Campo digitado à mão nunca é
  sobrescrito: a estimativa só toca em campo vazio ou que ainda tem o valor que
  ela mesma pôs.
- Para veículo já cadastrado, o botão **"Preencher a ficha"** na tela de
  Documentos aplica IPVA, licenciamento e preço do litro de uma vez. Mantém o
  parcelamento, as datas e as parcelas já pagas — troca só os valores.
- Todo valor assim gravado fica marcado `estimado: true` e a ficha diz "valor
  estimado pela sua região — confirme na guia oficial". Isso não contradiz a
  regra de não inventar valor: chute era escrever um número sem base; aqui é
  conta (FIPE × alíquota, e a taxa publicada pelo Detran).
- Preço do litro editado à mão marca `precoCombManual` e passa a ser respeitado.

Verificado: cadastro novo nasce com IPVA R$ 4.000 (4% de R$ 100.000),
licenciamento R$ 167,74 e litro a R$ 6,31, sem digitar nada; o botão na tela de
Documentos reescreveu as 3 parcelas de IPVA preservando as 2 já pagas e as datas.

### Gerador de preços consertado ✅ a ANP mudou o nome do arquivo

O usuário disse que não entendeu como rodar o script — então rodei eu, e ele
quebrou. Não era ele: era bug.

A ANP parou de zerar os dígitos no nome do arquivo. Veio
`resumo_semanal_lpc_2026-08-30-2026-09-5.xlsx`, com `09-5` em vez de `09-05`.
A regex só aceitava dois dígitos, achou **uma** data em vez de duas, e o
script estourou em `semana[1]`.

Pior que estourar: o JSON já tinha sido gravado antes do print, com
`"semana": ["2026-08-30"]` — lista de um item só. As telas leem `semana[0]`,
então **nada quebraria na cara do usuário**; o app só mostraria a semana pela
metade, calado. Bug silencioso é o pior tipo.

Corrigido com `datas_do_nome()`, que aceita 1 ou 2 dígitos e normaliza para
`AAAA-MM-DD`. A ordenação dos links passou a usar a mesma função, senão a
escolha do arquivo mais recente erraria pelo mesmo motivo. E agora, se as duas
datas não aparecerem, o script **para com mensagem** em vez de gravar um
arquivo pela metade.

Dados atualizados para a semana de **30/08 a 05/09/2026** (eram de 23 a 29/08):
386 municípios, 27 estados, 5 regiões, 43,4 KB. Gasolina: Brasil R$ 6,51,
SP R$ 6,34, PR R$ 6,61, PB R$ 6,43.

### Quatro ajustes pedidos depois de usar o app ✅

Vieram do uso real, não de revisão de código.

**1. Dia do vencimento da parcela do seguro.** O financiamento já tinha esse
campo; o seguro não, então não dava para avisar antes. Agora existe
`seguroDia` no cadastro (só aparece quando parcelado), vai para
`pagamento.dia` e o `Avisos` monta a agenda como já fazia com a parcela do
financiamento. Sem dia informado, cai no dia 10.

**2. "R$ xxx acumulados desde mm/aaaa" saiu do Início.** Fui eu que pus lá na
sessão passada, ao absorver a antiga aba Resumo — e o usuário achou fora de
lugar. Está certo: é número de arquivo, não de decisão do dia. Foi para
**Custos › Histórico**, ao lado das outras somas, junto com a contagem de
lançamentos. O cabeçalho do veículo voltou a ser só identidade, com "ver ficha ›".

**3. Leitura do documento do veículo (CRLV).** Placa, renavam e chassi somam 31
caracteres para digitar errado. Novo tipo de leitura `documento` no
`gemini.js` e um botão no grupo Documentos do cadastro. Preenche placa,
renavam, chassi, marca, modelo, ano, cor e combustível — e como placa e FIPE
alimentam a estimativa, `estimarNoRascunho` roda logo depois, atualizando IPVA
e vencimentos sem redesenhar a tela (não rouba o foco de quem está digitando).

O prompt **proíbe explicitamente** devolver nome, CPF, CNPJ e endereço do
proprietário, mesmo legíveis. O app não guarda dado pessoal, e isso agora está
escrito no pedido, não só na intenção. A tela diz isso para o usuário.

**4. "Valor total da apólice" deixou de ser a pergunta principal.** No lugar
entrou **o que está coberto** (as mesmas `COBERTURAS` que a tela da seguradora
já usava), porque é o que a pessoa sabe de cabeça e o que precisa lembrar num
sinistro. O valor virou opcional e desceu.

Isso tinha uma armadilha: o documento de seguro só era criado com
`segValor > 0`, então tornar o valor opcional apagaria o seguro de quem não
soubesse o total. Corrigido em duas frentes — o doc passa a ser criado se
houver **qualquer** sinal de seguro (cobertura, parcela, data ou seguradora), e
o valor, quando não informado, sai de `parcela × restantes`. Verificado: 8
parcelas de R$ 250 gravam `valor: 2000`, então o custo mensal e a previsão de
renovação continuam funcionando.

Verificado a 375 px: nove rotas sem erro de console nem estouro; o ciclo
gravar→ler do seguro devolve cobertura, dia e parcela; o aviso novo aparece
como "Parcela do seguro · 22/09 · R$ 250"; e o preenchimento pelo documento foi
testado capturando a função real do formulário — os 8 campos entram no rascunho
e nos inputs visíveis. `sw.js` em `autolog-v19`. Dados de demonstração
restaurados ao fim.

**Não verificado:** a leitura do CRLV nunca rodou contra o Gemini de verdade —
o teste injetou um resultado. Depende de chave configurada e de uma foto de
documento real.

### Especificações por modelo ⏸️ PAUSADO por decisão do usuário — retomar depois

> Pausado em 2026-09-10: "vai ser bem grande, vamos segurar de lado no momento".
> A lista de PDFs para baixar está em `manuais/LISTA-DE-DOWNLOAD.md` (pasta
> fora do versionamento). Os 7 links da Honda foram verificados e o caminho da
> Yamaha está descrito. Retomar por aí.

#### Piloto interrompido no 1º de 10 — leia antes de retomar

Objetivo: dar ao app o que falta para ter valor no primeiro minuto (qual óleo,
qual vela, qual pressão de pneu), inspirado no concorrente MINHAMOTO. O usuário
autorizou as horas e pediu 10 modelos, começando pela moto dele, uma **Kawasaki
Ninja 400**.

**Parei no primeiro modelo, de propósito.** Motivo abaixo.

#### Levantamento de fontes (feito, vale para sempre)

| Fonte | Veredicto |
| --- | --- |
| NHTSA vPIC (EUA, grátis) | Responde 200, **sem CORS**, e sem o mercado brasileiro: tem Civic e Fit, não tem Biz, Pop, CB 300, Bros, Fan nem Titan |
| CarQuery | Não responde (timeout) |
| FIPE | Preço e nome. Nenhuma especificação |
| **Manuais oficiais Honda** (honda.com.br) | **Existem, em PDF, de graça** — mas o CDN devolve 403 para curl e para WebFetch, mesmo com cabeçalhos de navegador. Abrem para uma pessoa. `pdftotext` está disponível na máquina, então se o PDF chegar, dá para extrair |

Conclusão: não existe API. O dado é compilado à mão, como o do IPVA.

#### O achado que interrompeu tudo

As fichas técnicas brasileiras mais bem ranqueadas **são geradas por IA e erram
dados críticos, declarando procedência falsa**.

`motorcyclist.com.br` estampa "Especificações técnicas oficiais extraídas do
manual do proprietário" e "Fonte: Manual Kawasaki Ninja 400". Na mesma página:

- descreve a Ninja 400 como **"monocilíndrica, refrigerada a ar"**. Ela é
  bicilíndrica paralela refrigerada a líquido (confirmado na Wikipédia e em
  duas fichas de manutenção independentes);
- chama a CB 500F e a R3 de refrigeradas a ar — as duas são a líquido;
- lista a Suzuki GSX-R150, não vendida no Brasil, como rival direta;
- publica **2,3 L como "capacidade de cárter"** do óleo. Esse é o volume A
  SECO. Na troca com filtro vão 2,0 L. Quem seguir a ficha enche além da marca.

Sinais de conteúdo automatizado: data de atualização igual à do dia do acesso,
prosa genérica, links de afiliado do Mercado Livre em todo canto.

**Por que isso é grave para este projeto:** volume de óleo e pressão de pneu são
números que quebram motor e afetam segurança. Compilar 10 modelos dessas fontes
produziria um arquivo perigoso com aparência de autoridade — exatamente o que o
app inteiro foi construído para não fazer. E levanta a suspeita (não provada) de
que o concorrente que inspirou a ideia esteja assentado nas mesmas fontes.

#### O que ficou pronto

`dados/especificacoes.json`, com **a Ninja 400 completa e bem apurada** a partir
de maintenanceschedule.com, tospec.bike e Wikipédia — três fontes que concordam
entre si e contradizem a ficha brasileira. O arquivo carrega o contrato de
manutenção em `_leia`, `_leiaPerigo` e `_leiaOleo` (a armadilha dos três volumes
de óleo: a seco, com filtro, sem filtro), e um `_fontesRejeitadas` documentando
o caso acima para ninguém cair nele de novo.

Um campo já nasceu com `"conferir": true`: a pressão dos pneus, porque as fontes
boas dão 200/225 kPa e a ficha brasileira dá 33/36 psi.

**Achado secundário:** o `dados/veiculos.json` não tem **Factor** nem
**Crosser** (Yamaha), dois dos maiores volumes do país. O catálogo de nomes tem
buraco nos modelos mais vendidos.

#### O custo, revisado

A estimativa anterior era de 20 a 40 min por modelo. Ela valia para o método
"cruzar duas fontes secundárias" — que acabou de se mostrar inseguro. Com o
método correto (manual oficial, um por modelo, lido de verdade) o número real
não foi medido, mas é claramente maior, e a Honda bloqueia automação.

**Decisão pendente do usuário** antes de retomar: seguir mais devagar e mais
caro pelos manuais, restringir a base ao que der para verificar com folga, ou
deixar o usuário preencher a ficha do próprio veículo com os campos certos.

### Previsão dos próximos 6 meses ✅ fecha a ideia original do app

Auditei o app contra a ideia que o originou: controle do custo do veículo,
custo fixo mensal, média de gasolina e **saber quando o custo vai ser maior**.
Os dois primeiros já estavam de pé; o terceiro não existia, por três motivos
que valem registro:

1. `custoMensal` **achata de propósito** — IPVA ÷ 12, licenciamento ÷ 12,
   seguro ÷ 12. Responde "quanto custa em média", nunca "em qual mês vai doer".
2. **Não havia projeção para frente.** `resumoMensal` monta o gráfico de trás
   para frente e termina em hoje. Todo gráfico do app era passado.
3. **Manutenção não tinha data nem preço.** Os itens têm `intervaloKm` e
   `intervaloMeses`, e nenhum campo de custo. "Faltam 1.580 km" não virava mês
   nem virava reais.

`Calc.previsao(v, 6)` resolve os três. Para cada um dos 6 meses a partir do
corrente:

- **parcela do financiamento e do seguro** — e elas acabam: a parcela some do
  mês em que a última é paga, em vez de se repetir para sempre;
- **combustível** pela média dos 3 meses fechados;
- **IPVA, licenciamento e renovação da apólice** no mês em que realmente
  vencem, sem diluir. O que já venceu e não foi pago cai no mês corrente em vez
  de sumir da conta;
- **manutenção** posicionada pelo ritmo de uso (km dos últimos 90 dias ÷ 3).

Na tela: bloco no Início com a manchete ("Outubro deve custar R$ 1.363 · R$ 987
acima da média · renovação da apólice") e barras empilhadas — a altura diz
quanto, a cor diz por quê, a linha tracejada é a média. Tocando em "mês a mês"
abre `Screens.previsao`, com o detalhamento de cada mês e a origem de cada
número. Rota sem aba, herdando o destaque do Início.

**Preço de manutenção só do histórico**, como combinado. `custoTipico` procura o
que já foi pago pelo mesmo serviço e a tela mostra de qual lançamento tirou o
valor ("pelo último 'Corrente e coroa', 03/2025"). Sem serviço registrado, o
item entra como data e **soma zero**, aparecendo numa lista de "sem preço no
histórico" — não vira chute.

O casamento passou a ser por `itemId`, que `registrarServico` agora grava no
lançamento. Os lançamentos antigos não têm esse campo, então caem num
casamento por palavra que exige que **todas** as palavras do item apareçam no
título. Testado nos dois sentidos: "Pastilhas de freio" acha "Pastilha de freio
dianteira" (R$ 220), e "Pneu dianteiro" **não** casa com "Pneu traseiro" — que
é o erro caro. "Óleo do motor" também não casa com "Revisão + troca de óleo",
e isso é intencional: aquele lançamento foi uma revisão inteira, o valor dele
superestimaria uma troca de óleo.

Dois acertos que só apareceram testando:

- a manchete citava como causa do pico um item que somava R$ 0 ("renovação da
  apólice **e filtro de ar**"). Agora só entram eventos com valor;
- a correia dentada do Onix caía em setembro exibindo "faltam 8.130 km" — o que
  a colocou ali foi a idade, não o km. A previsão agora guarda qual dos dois
  mandou e a tela diz "por tempo de uso, vencido há 4 meses".

Verificado a 375 px nos dois veículos de demonstração, com `Store.resetar()` no
fim para devolver os dados originais. Sete rotas sem erro de console e sem
estouro horizontal. `sw.js` em `autolog-v18`.

**Não verificado:** nenhum mês da previsão passou por um vencimento real ainda
— a checagem foi contra os dados de demonstração, não contra o tempo passando.

### Navegação reorganizada ✅ a aba Garagem deixou de existir

O app tinha Início **e** Garagem mostrando quase a mesma coisa — seis
sobreposições, contadas uma a uma: foto do veículo, marca/modelo/ano/placa,
odômetro, custo por mês, gráfico de gasto por mês (esse duplicado dentro da
própria Garagem, entre Resumo e Histórico) e custo/km. Pior: os nomes estavam
trocados. O Início se intitulava "Sua garagem" e tinha o seletor de veículos e
o "+ Novo" — ele *era* a garagem; a aba chamada Garagem era o detalhe de um
veículo só.

A causa está no comentário antigo de `js/screens.js`: "as sete telas do canvas
Garagem.dc.html". Sete telas desenhadas para serem vistas em sequência, cada
uma se bastando e por isso repetindo o contexto. Viraram cinco abas sem que a
repetição fosse desfeita — e o que ajudava no canvas virou ruído no app.

O que mudou:

| Antes | Agora |
| --- | --- |
| Aba **Garagem** (Resumo · Ficha · Histórico) | Não existe mais |
| Aba **Manutenção**: nenhuma, só pelo cartão "Saúde geral" | Aba própria, no lugar da Garagem |
| **Resumo** | Absorvido pelo Início |
| **Ficha** | Rota sem aba, aberta pelo cabeçalho do veículo no Início |
| **Histórico** | Terceira aba de Custos (Custo/km · Histórico · Financiamento) |

Barra final: **Início · Manutenção · Custos · Docs · Perfil**.

Do Resumo só três números não existiam em outro lugar, e foram para o Início:
custo acumulado (virou linha no rodapé do cabeçalho, com o mês do primeiro
lançamento), consumo médio e preço médio por litro (viraram uma terceira dupla
de cartões). O gráfico de barras do Resumo morreu — era o mesmo do Histórico,
com menos opções de janela — e o CTA "Registrar abastecimento" também, porque o
botão flutuante já faz isso de qualquer tela.

O cabeçalho do veículo virou `<button>` (CSS em `styles.css`, com os resets que
`<button>` exige) e mostra "ficha ›" no canto. A Manutenção perdeu o botão
"‹ voltar": virou aba, quem sai dela sai pela barra.

Nada foi apagado do armazenamento — é remanejamento de navegação. `sw.js` subiu
para `autolog-v17` para o app instalado se atualizar.

Verificado no navegador a 375 px: as 5 abas com os rótulos certos, as 3 abas de
Custos, a Ficha destacando "Início" na barra (herança por `NAV_PAI`), o
cabeçalho abrindo a Ficha, o "‹ voltar" da Ficha caindo no Início, "Editar
ficha" indo ao cadastro e o cadastro voltando para a Ficha ao sair. Zero erro
no console, sem estouro horizontal.

**Ressalva:** muda a memória muscular de quem já usava. Como o app ainda é de
uso pessoal, o custo é baixo — mas é o tipo de mudança que só se faz uma vez.

### Vencimento pelo final da placa ⚠️ só 8 estados

`dados/ipva.json` ganhou um bloco `calendario` com o vencimento por final de
placa. O app lê o último dígito da placa e preenche as datas de IPVA e
licenciamento sozinho.

**Cobertura parcial, e de propósito.** Cada estado publica o seu calendário todo
ano, e não achei fonte confiável para os 27. Entraram os que deu para confirmar:

| | IPVA | Licenciamento |
| --- | --- | --- |
| SP, RJ, MG, PR, SC | ✅ | ✅ |
| AL | ✅ (fonte única) | — |
| RS, BA | — | ✅ |
| Outros 19 | — | — |

Nos estados de fora, a tela diz que o calendário não está no app e devolve a
data para o usuário. Inventar data de imposto seria pior que admitir o buraco.

**Duas datas de validade, ditas na tela:**
- Quando a data de 2026 já passou, o app projeta o mesmo dia em 2027 e avisa
  que é previsão — o calendário real só sai quando o estado publicar.
- RJ (licenciamento) e AL (IPVA) vieram de fonte única e levam aviso extra.

Datas só são reescritas em documento sem nenhuma parcela paga: parcela paga tem
data real, e sobrescrever apagaria o histórico.

Verificado: SP final 5 → IPVA 16/01/2027 e licenciamento 30/09/2026; SP final 0
→ licenciamento 31/12/2026 (sem projeção, ainda no futuro); BA → só
licenciamento; GO → mensagem de calendário ausente; sem placa → pede a placa.
O aviso do formulário se redesenha sozinho ao digitar placa ou valor FIPE, sem
refazer o formulário e roubar o foco.

Verificado no navegador: queda de nível de preço (Curitiba → município;
município inexistente no PR → média do estado), CEP válido e inválido, GPS
negado com mensagem clara, IPVA SP 4%/2% e PR 1,9%, licenciamento diferenciado
de moto no CE, consulta FIPE completa (escolha de versão → ano → R$ 24.168,
referência setembro de 2026) e cache na segunda chamada. Nove rotas sem erro de
console, sem estouro horizontal a 375 px.

**Não verificado:** GPS real (aqui a permissão é sempre negada) e o
comportamento com a cota de 500 consultas estourada.

### Editor de foto ✅

O botão de foto adicionava a imagem como veio, sem recurso para quem
fotografou de perto ou torto. Agora abre um editor: arrastar move, pinçar ou
barra aproxima, e a moldura é a mesma proporção (16:9) em que a foto aparece no
app. `transform` de CSS enquanto ajusta, canvas só ao confirmar — saída
1100×619, JPEG 0.78. `.hero` e `.foto-slot` passaram a usar `aspect-ratio`
para bater com o recorte.

### Avisos de vencimento ✅ com limite conhecido

Perfil → Avisos de vencimento: ligar/desligar e escolher 3, 7, 15 ou 30 dias de
antecedência. Cobre parcela de IPVA, licenciamento, fim da cobertura do seguro
e parcela do financiamento.

**Limite real:** site estático não acorda o celular. Notificação agendada com o
app fechado exige servidor de push, que não existe aqui. Por isso são dois
caminhos: aviso ao abrir o app (funciona, mas depende de abrir) e **exportação
para o calendário em `.ics`**, com `VALARM` na antecedência escolhida — esse
dispara com o app fechado e é o que de fato resolve.

O service worker ganhou `notificationclick` para trazer o app à frente.

### Formulário: placeholders e cor ✅

- Placeholders que fingiam dado real ("Honda", "CG 160", "Prata", "5,89")
  saíram. Numa segunda passada os textos de instrução também caíram: **Marca,
  Modelo e Cor abrem vazios** e o slot de foto mostra só `+ foto do veículo`,
  sem o "câmera ou galeria · opcional". Tocar no campo já abre a lista, então a
  instrução era ruído.
- **Cor** virou campo com sugestão, como marca e modelo: 19 cores usuais de
  emplacamento, filtrando sem acento.

### Autocompletar de marca e modelo ✅

Os campos Marca e Modelo do cadastro sugerem enquanto se digita, no estilo do
Webmotors. Filtro sem acento e sem caixa; escolher a marca restringe os
modelos. Digitando só o modelo, procura em todas as marcas e mostra
`Civic · Honda` — ao tocar, preenche os dois campos.

**O campo nunca restringe**: catálogo envelhece, então texto livre sempre vale.

`dados/veiculos.json` (23 KB): 106 marcas e 1.214 modelos de carro, 103 marcas
e 1.111 de moto. Gerado por `ferramentas/gerar-veiculos.py` a partir da API
pública da FIPE — **não escrito de memória**, que foi a lição das rodadas do
Gemini. Estático de propósito: consultar API a cada tecla seria lento,
quebraria o offline e dependeria de terceiro no ar.

O trabalho fino foi extrair modelo de versão: a FIPE devolve `"Civic Sedan LXR
2.0 Flexone 16V Aut. 4p"`. O script corta carroceria, câmbio e acabamento, e
distingue número de cilindrada (`CG 160`, parte do nome) de motor (`Civic 2.0`,
versão).

### Leitura por foto com o Gemini ✅ código pronto, falta chave real

As telas de abastecimento, odômetro e lançamento ganharam um botão para
fotografar a nota, o display da bomba ou o painel: a imagem vai para o Gemini,
que devolve os campos separados, e o app **preenche o formulário para a pessoa
conferir**. Nada é salvo automaticamente — OCR erra, e aqui é dinheiro e
quilometragem. Campo preenchido pela IA fica destacado.

Arquivo novo: `js/gemini.js` (instruções por tipo, extração do JSON, tradução
dos erros da API). Configuração em rota própria (`gemini`), por Perfil.

**Câmera e galeria, separados.** São dois botões, não um. O momento de
fotografar e o de lançar raramente coincidem: dá para fotografar o cupom no
posto e registrar em casa pela galeria. `UI.pedirFoto` aceita `origem`, que
liga ou não o `capture` do input — sem isso o aparelho decide sozinho e o
comportamento varia.

**Instruções editáveis.** Cada um dos três tipos tem sua instrução ajustável em
Perfil → Leitura por foto, com os campos esperados documentados na tela e botão
de restaurar padrão. É o caminho para corrigir leitura ruim de nota específica.
Salvar um texto igual ao padrão não cria override, para não congelar melhorias
futuras. Instrução editada ganha selo, e o erro de JSON sugere restaurar.

**A chave da API fica só no aparelho** (`localStorage`, entrada
`autolog-gemini-chave`), digitada dentro do app. Motivo: o repositório é
público e todo o JS é baixado pelo navegador — chave no código seria chave
vazada, cobrada na conta do dono. Verificado que ela **não entra no arquivo de
exportação** da garagem.

**Custo e cota, documentados no app.** A chave é gratuita; o uso tem camada
grátis nos `flash` e `pro`, com limite diário, e sem cobrança cadastrada o
estouro bloqueia em vez de virar fatura. Modelos de **geração de imagem** têm
`Free Tier: Not available` — escolher um faz a primeira chamada voltar 429 sem
nunca ter funcionado, que foi o que aconteceu em 2026-08-24. A tela ganhou uma
seção "Custo" e o 429 passou a explicar a causa em vez de mandar tentar depois.

**O teste de conexão passou a usar imagem.** Ele mandava só texto — então
passaria com um modelo que não enxerga figura, e a falha apareceria só na
frente da bomba. Agora gera uma imagem com número aleatório, manda para o
modelo e confere se voltou o número certo. A lista de modelos também filtra o
que não serve: embeddings, geradores de imagem e vídeo (`-image`, `imagen`,
`nano-banana`, `veo`) e modelos de voz (`tts`, `live`, `transcribe`).

**O modelo passou a ser perguntado à API.** Com a chave aceita, a leitura ainda
falhava com 404: `gemini-2.5-flash` não existia naquela conta. Em vez de trocar
por outro palpite, a tela ganhou **buscar modelos disponíveis**, que chama o
`ListModels`, filtra os que aceitam `generateContent` e lista em botões — um
toque escolhe. Guarda também a versão da API (`v1beta` ou `v1`) em que o modelo
apareceu, e a busca tenta as duas.

**Dois formatos de chave — e uma lição.** O Google está trocando as chaves do
AI Studio: antigas `AIza` ("traffic keys"), novas `AQ.` ("auth keys"), com as
antigas sendo recusadas a partir de setembro de 2026. Eu supus que `AIza` era o
único formato válido e cheguei a **bloquear chaves `AQ.`** — que é justamente o
único formato que o AI Studio gera hoje. Bloqueio removido.

O app agora não julga a chave pelo prefixo. Envia no cabeçalho documentado
(`x-goog-api-key`) e, se a recusa for de tipo de credencial
(`ACCESS_TOKEN_TYPE_UNSUPPORTED`, `API key not valid`), repete como
`Authorization: Bearer` antes de desistir. Erro de outra natureza não gera
segunda tentativa.

Falhando as duas, a tela de configuração mostra o **erro cru da API** — status,
forma de autenticação usada, modelo e mensagem do Google — com botão de copiar.
Diagnóstico em vez de palpite.

**Limite honesto:** isso serve para uso pessoal, com a pessoa usando a própria
chave. Não serve para app com vários usuários — ninguém cola chave de API. A
saída, quando for a hora, é um proxy serverless guardando a chave; `gemini.js`
já está isolado para que só `endpoint()` e `cabecalhos()` mudem.

**O que foi verificado:** que a API aceita chamada direta do navegador (o CORS
passa — com chave falsa a resposta é 400 "chave inválida", não erro de rede);
que os três mapeamentos preenchem os campos certos; que os erros viram mensagem
legível; que a chave não vaza na exportação; que a instrução editada realmente
chega à API; que a chave viaja no cabeçalho `x-goog-api-key` e não na URL, onde
vazaria em log de servidor. **O que falta:** uma leitura real,
com chave de verdade e foto de verdade — só o dono da chave pode fazer.

### Ajustes de interface ✅

- **Fotos saem coloridas.** O canvas previa `.grayscale`; o veículo é do dono,
  não peça de catálogo.
- **Abastecer virou botão flutuante** redondo, no canto inferior direito, na cor
  do app e com ícone de bomba desenhado em SVG. Fica fixo enquanto a tela rola e
  some no cadastro, onde atrapalharia o formulário.
- **Cilindradas e valor FIPE saíram do cadastro** — não são informação que a
  pessoa deva digitar para o app funcionar. O simulador de financiamento agora
  parte de um valor editável na própria tela.

### Tela de cadastro de veículo ✅

O "+ Nova" abria uma folha rápida com oito campos. Agora é **rota própria**
(`veiculo`), com:

- **Foto no topo**, do tamanho de um cartão, tocável — câmera ou galeria,
  redimensionada no cliente, com ações de trocar e remover.
- Escolha de **tipo** em dois cartões grandes.
- Campos agrupados em **Identificação** (marca, modelo, apelido, ano, cor,
  combustível), **Documentos** (placa, renavam, chassi), **Uso** (km atual,
  consumo, preço do litro, data da compra), **Financiamento**, **Seguro** e
  **IPVA e licenciamento**.
- Validação com destaque nos campos e mensagem no rodapé; só modelo e km atual
  são obrigatórios.
- **A mesma tela edita a ficha** — substituiu também a folha de edição.
- O rascunho sobrevive à troca de tipo e à escolha de foto, e é descartado ao
  sair sem salvar.

### Tela de login ✅ protótipo

Porteira em `js/auth.js`: usuário `brenno`, senha de 4 dígitos. Sessão em
`localStorage` (`autolog-sessao-v1`, migrada da antiga), "Sair da conta" no
Perfil.

**Não é autenticação de verdade** — a conferência acontece no navegador e as
credenciais estão no código-fonte de um repositório público. Antes de qualquer
uso real, isso precisa ir para um servidor.

### Instalável como app (PWA) ✅ publicado

- `ferramentas/gerar-icones.py`: gera os ícones em Python puro (só biblioteca
  padrão). O desenho é um **mostrador com ponteiro** — emblema geométrico, sem
  letra, escolhido para não amarrar o ícone ao nome depois da troca Motoreiro →
  Autolog.
- `manifest.json`: ícones 192/512/maskable, `display: standalone`, `scope`.
- `sw.js`: service worker **rede primeiro, cache como reserva**, para nunca
  prender o app numa versão antiga depois de um push.

**Armadilha resolvida em 2026-09-05 — "dei push e o celular não atualizou".**
"Rede primeiro" não era suficiente. O GitHub Pages responde
`Cache-Control: max-age=600`, então o `fetch()` de dentro do service worker era
atendido pelo **cache HTTP do navegador**, sem sair para a rede: o app seguia
mostrando a versão de até dez minutos antes. Duas correções:

1. `sw.js` busca com `cache: 'no-store'` (e pré-carrega com `cache: 'reload'`),
   forçando a ida real ao servidor. O cache do app segue guardando a cópia para
   o modo offline.
2. `index.html` procura versão nova ao abrir e a cada vez que o app volta para
   a frente (`reg.update()` em `visibilitychange`), e **recarrega sozinho**
   quando o service worker novo assume (`controllerchange`). Instalado como
   app, o usuário não tem barra de endereço — não existe "recarregar forçado",
   então o app precisa se atualizar sem ajuda.

Diagnóstico feito comparando o arquivo publicado (que já estava novo) com o que
o aparelho mostrava — o servidor não era o problema.

**Pendente de verificação:** o registro do service worker não pôde ser testado
aqui — o navegador embutido do Claude Code bloqueia service workers (o `fetch`
do arquivo responde 200 com MIME correto, mas `register()` falha com erro
genérico). Sintaxe conferida com `node --check`. A validação real é no celular.

**Importante:** instalar como app exige **HTTPS**. Pelo IP da rede local o
Chrome degrada para atalho com barra de navegador.

### Filtro de Documentos consertado ✅ parecia botão morto

O usuário reportou: "na aba de docs, os botões IPVA, LICENC., SEGURO, REVISÃO —
quando clico, nada acontece."

Ele **funcionava**. Medido no navegador: tocar em IPVA reduzia a página de
1278 px para 673 px e a lista filtrava certo. O problema é que o filtro só
mexia na lista, e a lista começa a **416 px** do topo, numa área visível de
651 px. Ou seja: os primeiros dois terços da tela não mudavam nada. Da posição
em que a pessoa está, é indistinguível de botão quebrado.

E tinha coisa pior que invisibilidade — duas incoerências reais:

1. **"Compromissos do ciclo" ignorava o filtro.** Com IPVA selecionado, a tela
   mostrava **R$ 1.813 previstos** em cima de um documento de R$ 445. Mentira
   por vizinhança: o número e a lista falavam de coisas diferentes.
2. **O rodapé ignorava o filtro.** Filtrando por IPVA, o botão "Agendar
   oficina" continuava lá — ação de um cartão de revisão que não estava na
   tela.

Agora o filtro vale para a tela toda: o total é dos documentos visíveis
(`Calc.compromissosAnuais` passou a aceitar uma lista já filtrada), o rótulo
vira "IPVA · no ciclo", os botões do rodapé saem só do que está visível, e o
cartão de financiamento e a estimativa da região — que são panorama, não
documento — somem quando há um documento escolhido.

**De brinde, um número que mentia:** a revisão aparecia como "R$ 0 previstos",
que se lê como "custa zero". O app não sabe o preço da revisão. Agora diz
"Valor ainda não informado", e o bloco Pago/A pagar some junto.

Verificado a 375 px, os quatro filtros: IPVA R$ 445 (pago 296, a pagar 148) e
só "Pagar 3ª parcela"; LICENC. R$ 129; SEGURO R$ 1.240 com "Nada pendente
neste documento"; REVISÃO sem valor e só "Agendar oficina". Sete outras rotas
sem erro nem estouro. `sw.js` em `autolog-v21`.

### Simulador de financiamento 🗑️ removido em 2026-09-10

A aba **Custos › Financiamento** (Tabela Price e SAC, comparação de prazos,
cenários salvos) saiu a pedido do usuário. Custos ficou com duas abas:
Custo/km e Histórico.

A razão dá o critério para decisões parecidas: **simular financiamento é sobre
um veículo que a pessoa ainda não tem, e este app é sobre o que ela já tem.**

Removido junto, porque nada mais chamava: `abaSimulacao` em `screens.js`,
`App._sim/sim()/setSim()/editarSim()/trocarSistema()` em `app.js`,
`Calc.financiamento()` (a matemática Price/SAC) em `calc.js` e
`Store.salvarSimulacao()`. `Calc.financiamentoStatus()` **fica** — é outra
coisa, o estado real do financiamento do veículo, usado no custo mensal e na
previsão.

O campo `simulacoes` saiu do esquema do veículo, mas **nada foi apagado de quem
já usa o app**: o que estiver gravado em `localStorage` fica lá, inerte. Apagar
dado de usuário para limpar código seria troca ruim.

Rota antiga não quebra: `App.ir('custos', {custos:'sim'})` cai em Custo/km,
pelo guarda que já existia em `ABAS_CUSTOS`.

### `car-cost-app/` 🗑️ removido em 2026-09-10 — o Autolog passou por cima dele

Era um formulário de seis blocos com tela de resultado. Fui olhar o que ele
perguntava antes de sugerir o que fazer, e a lista foi decisiva: parcela do
veículo, parcela do seguro, IPVA, licenciamento, consumo, preço da gasolina,
**final da placa** e revisão. Devolvia custo anual, mensal, por km, **o mês
mais caro e o mais barato** e uma linha do tempo.

Ou seja: a previsão de 6 meses do Autolog, mais o custo/km — só que sem
histórico, sem região, sem FIPE e sem avisos. Tinha um commit na vida
("Commit inicial") e nunca foi tocado depois.

O usuário decidiu apagar. O código continua no histórico do git, em
`7f6bc13..d2d55ee`, se algum dia fizer falta.

**O que se perdeu de verdade:** o fluxo de *simular sem cadastrar nada* — quem
quer uma estimativa rápida antes de comprar um veículo. Sugeri trazer isso para
a aba Custos › Financiamento; o usuário não só descartou a sugestão como mandou
**remover a própria aba** (seção acima). O app decidiu o que é: ferramenta para
o veículo que você tem, não para o que você pensa em comprar.

### `motoreiro/` ✅ só uma placa de mudou-se

Uma página, sem app. O projeto se chamava Motoreiro e só servia motos; ao virar
Autolog a pasta foi renomeada e todo link antigo passou a dar 404 — o que
aconteceu de verdade num teste de celular em 2026-08-23, com um favorito salvo
antes da troca.

`<meta refresh>` para `../autolog/` (funciona sem JavaScript), `rel=canonical`
para os buscadores e um parágrafo com link manual para quem tiver os dois
desligados.

### Infraestrutura ✅

Git e GitHub configurados, `.gitignore` cobrindo dependências, build, `.expo`,
caches, logs, configuração local do Claude Code e padrões de credenciais.
`README.md` e `CLAUDE.md` na raiz orientam o trabalho nas duas máquinas.
Kickpush saiu do repositório e vive em pasta própria.

---

## Em andamento

### Passo 5 de 7 ✅ a garagem nasce vazia, e a primeira tela convida

O app nascia com uma moto e um carro de mentira, com seis meses de
abastecimentos inventados. Isso servia enquanto ele era protótipo de uma pessoa
só — dava o que olhar antes de existir dado real. Como produto, atrapalha: quem
baixa da loja abriria o app **na garagem de outra pessoa**, e a primeira tarefa
seria apagar coisa em vez de cadastrar a sua. Pior, agora esse dado de exemplo
subiria para a conta e desceria no outro aparelho.

Saíram 197 linhas: `seed`, `seedMoto`, `seedCarro` e `seedDocs`.

**Nada foi apagado de quem já usa o app.** Quem tem a CB 300F e o Onix continua
com eles — inclusive porque pode tê-los editado até virarem o veículo de verdade,
que sempre foi o caminho mais provável. Sair deles é decisão de quem usa.

#### A tela de boas-vindas

Antes existia um "Nenhum veículo cadastrado ainda" centralizado — texto de
estado vazio, do tipo que se escreve para um caso que quase nunca acontece.
Agora ele acontece com todo mundo, uma vez, e é a primeira impressão do produto.

Três linhas respondem *"por que eu daria trabalho de cadastrar meu carro aqui?"*
antes de pedir o trabalho — e são as três contas que o app sabe fazer, na ordem
em que ele as entrega: quanto custa por mês, em qual mês vai doer, o que vence e
quando. Um botão só.

**Esperar a sincronização antes de convidar.** Quem entra na conta num aparelho
novo passa alguns segundos com a garagem vazia enquanto ela é baixada. Convidar
a cadastrar nessa janela e trocar a tela por uma garagem cheia logo depois seria
a pior sequência possível — a pessoa pensa que perdeu tudo, ou começa a cadastrar
um veículo que já existe. Enquanto a nuvem trabalha, a tela diz *"Buscando sua
garagem…"*.

#### Três defeitos que só apareceram com a garagem vazia

**1. O botão "Adicionar meu veículo" não abria nada.** O `App.render` desviava
**toda** rota para a tela de garagem vazia — inclusive a do próprio cadastro. O
furo existia desde sempre e era inalcançável, porque a garagem nunca ficava
vazia. Sem o conserto, **ninguém que baixasse o app sairia do lugar**.

**2. A previsão desenhava um retângulo em branco.** Veículo recém-cadastrado não
tem abastecimento, parcela nem vencimento dentro da janela, então os seis meses
somam zero — e o gráfico virava 124px vazios com rótulos de mês embaixo. Num app
recém-instalado isso não se lê como "não há custo previsto", se lê como "faltou
carregar". Trocado por uma frase que diz o que fazer para a previsão existir.

**3. O cabeçalho perdeu o nome.** Ele vinha do dado de demonstração ("Brenno",
escrito no código) e passou a dizer "Sua garagem" para todo mundo, com o nome
parado na conta do Google ao lado. Agora o primeiro nome da conta preenche o
perfil — **só quando está vazio**, para quem editou o próprio nome não vê-lo
trocado de volta a cada abertura.

#### Saíram junto

- **"Restaurar dados de demonstração"**, do Perfil. Sem demonstração, ele só
  esvaziaria a garagem — e agora isso subiria para a conta e apagaria tudo no
  outro aparelho também. Quem quiser recomeçar apaga veículo por veículo, com
  confirmação, no próprio Perfil.

#### Um susto no caminho, que vale registrar

Removi o bloco de demonstração por intervalo de texto e levei junto `get`,
`veiculos`, `atual`, `selecionar`, `atualizarPerfil`, `atualizarVeiculo` e
`replanejar` — que moravam no meio dele. O app quebrou inteiro (`Store is not
defined`). Recuperadas do git.

**A lição prática:** depois de remoção grande, comparar a lista de funções antes
e depois (`grep -oP "^  (function|const) \K\w+"` dos dois lados) mostra em uma
linha o que sumiu sem querer. Foi assim que achei as quatro que ainda faltavam
depois do primeiro conserto.

#### Verificado

- Fluxo completo de quem baixa o app: boas-vindas → cadastro → Início com o
  veículo real, selecionado, com plano de manutenção e documentos criados.
- As **doze** rotas com um veículo sem histórico nenhum: sem erro de console,
  sem estouro horizontal, nenhuma tela vazia.
- Os três estados da tela inicial: buscando (sem convite), vazia (com convite),
  deslogado (sem falar em buscar garagem).
- Veículo cadastrado por usuário novo sobe para a conta — contra o servidor
  rigoroso, zero recusas.
- Diferença da API do `Store` conferida linha a linha: só saíram `seed*` e
  `resetar`.

**Não verificado:** o aparelho. Em especial, o instante entre entrar na conta e
a garagem chegar — aqui eu simulo a fase, lá ela depende da rede real.

`sw.js` em `autolog-v31`.

### Sincronização 100% quebrada desde a v28 ✅ `order=id` numa tabela sem `id`

O usuário reabriu o app, com internet, tocou em "Sincronizar agora" e recebeu
"não consegui sincronizar". **Nenhuma sincronização havia funcionado desde a
v28** — nem automática, nem manual, para ninguém.

#### A causa

O `baixarDesde` ordenava **todas** as tabelas por `id`:

```js
q.order('id', { ascending: true })
```

Só que `perfis` não tem coluna `id` — a chave dela é `user_id`. Confirmado
batendo direto no PostgREST de produção:

```
GET /rest/v1/perfis?order=id.asc
{"code":"42703","message":"column perfis.id does not exist"}
```

E `perfis` é a **primeira** tabela de cada ciclo. Todo ciclo morria na primeira
requisição, sempre. A mensagem não casava com "sem rede" nem com "sessão
expirada", então caía no genérico — e a tela ainda por cima dizia "Aguardando
conexão", mandando a pessoa conferir o Wi-Fi à toa.

#### Por que meus testes não pegaram

**O servidor falso que escrevi ignorava o `order`.** Ele aceitava qualquer
coluna, em qualquer tabela. Testar contra um servidor complacente é quase o
mesmo que não testar — ele confirma o que eu já acreditava em vez de me
contradizer.

O arnês foi refeito: agora conhece as colunas de cada tabela e **recusa** o que
não existe, com o mesmo `42703` do PostgREST, seja em `order`, em filtro ou no
corpo de um `upsert`. Verificado que ele pega o bug antigo.

#### Corrigido junto

**1. O espelho mudou de formato entre o passo 3 e o 4** e continuava na mesma
chave. Como nenhuma sincronização da v28 chegou a gravar, o aparelho do usuário
ainda tinha o espelho do passo 3 — em formato antigo. Na primeira sincronização
que voltasse a funcionar, **toda linha pareceria diferente** e a fusão acusaria
umas setenta "mudanças descartadas" de mentira.

Chave nova (`-v2`): o espelho velho é ignorado, o app cai no primeiro encontro
(união com preferência do servidor) e nada se perde. Testado exatamente nesse
cenário: **zero conflitos falsos**, garagem intacta. O espelho antigo é apagado
do armazenamento.

**2. O erro cru agora aparece na tela**, com botão de copiar, atrás do estado de
erro. Sem isso o motivo ficava no `console.warn`, que ninguém abre no celular —
o usuário não tinha como me contar o que houve e eu não tinha como saber sem
adivinhar. Mesmo caminho que a tela do Gemini já usava, pelo mesmo motivo.

**3. "Aguardando conexão" só aparece quando o problema é de conexão.** Erro de
servidor agora diz "Não consegui sincronizar".

**4. `baixar()` e `paginado()` foram removidos** — eram um segundo caminho de
leitura, do passo 3, que ninguém mais chamava. Caminho morto só diverge do vivo
com o tempo.

#### Verificado contra o arnês rigoroso

Ciclo completo sem nenhuma recusa do servidor; envio de 67 linhas; ciclo ocioso
inerte; só-local, lápide e **perfil** (a tabela que quebrava tudo) sincronizando;
espelho velho sem gerar conflito falso; e os dois tipos de erro com título
distinto. Dez rotas sem estouro horizontal.

**Confirmado no aparelho em 2026-09-13:** voltou a sincronizar. Isso fecha os
dois defeitos da sequência — a escada que desistia e a coluna inexistente.

`sw.js` em `autolog-v30`.

### "Aguardando conexão" para sempre ✅ corrigido — a escada desistia

Reportado no mesmo dia em que o passo 4 subiu: o usuário desligou o Wi-Fi, fez
alterações, ligou a rede de volta — e o app ficou **eternamente** em "Aguardando
conexão".

#### A causa, que era minha

A escada de novas tentativas era `[8s, 30s, 2min]` e tinha um último degrau:

```js
if (tentativa >= ESPERAS.length) return;   // desiste
```

Depois de 2min40 o app parava de tentar sozinho e passava a depender de dois
eventos. **Os dois falham exatamente neste cenário:**

- `visibilitychange` não dispara porque quem mexe no app com o Wi-Fi desligado
  **nunca manda o app para segundo plano**;
- `online` é reconhecidamente pouco confiável no Android — ele reflete "existe
  interface de rede", não "a internet responde".

Sem nenhum dos dois, nada mais tentava. E a mensagem virava mentira: o app não
estava aguardando coisa nenhuma, tinha desistido.

**Erro de projeto, não de implementação.** Eu escrevi a escada limitada de
propósito, para "não gastar bateria num túnel", e apoiei a recuperação em dois
eventos sem testar se eles disparam no caso real.

#### O conserto

O último degrau passou a se repetir para sempre, de minuto em minuto. Isso só
acontece **enquanto existe coisa pendente**, porque o temporizador só é armado
depois de uma falha. Antes de cada tentativa automática o app consulta
`navigator.onLine`: quando ele diz que NÃO há rede, não há mesmo, e dá para
poupar a tentativa — principalmente os 20s pendurados de cada chamada. (Ele
mente para cima, nunca para baixo.)

Medido, os degraus agora são: **8s, 30s, 2min, 60s, 60s, 60s…** sem fim.

#### E o botão "Sincronizar agora", pedido pelo usuário

Fica em Perfil › Sua garagem na conta, sempre visível — vermelho quando há erro,
discreto quando está tudo em dia. Ele responde o que aconteceu, em vez de só
"pronto": *"3 mudanças enviadas"*, *"1 recebida"*, *"Já estava tudo em dia"*,
*"Entre na conta para sincronizar"* ou o erro de verdade.

**O detalhe que quase passou.** Na primeira versão, tocar no botão enquanto um
ciclo travado estava em curso devolvia *"Já estou sincronizando…"* — que é
verdade e não serve para nada, justamente na hora em que a pessoa desconfia de
que a sincronização automática travou. Agora quem chega no meio **espera a
promessa em andamento** e recebe o resultado dela; passando de meio segundo, sai
um "Sincronizando…" para o toque não parecer ignorado.

O botão tenta mesmo com `navigator.onLine` falso: se a pessoa tocou, é porque
quer.

#### Verificado

- Escada: 8s, 30s, 2min, 60s, 60s, 60s — **não desiste** (medido espionando os
  agendamentos, sem esperar o tempo real).
- Botão nas cinco respostas: enviou / recebeu / já em dia / sem sessão / sem
  conexão.
- Toque no meio de um ciclo preso: sai "Sincronizando…" e depois "Sem conexão —
  salvo neste aparelho", em vez do antigo "já estou sincronizando".
- Dez rotas sem estouro horizontal; botão com 44px de altura.

**Não verificado:** o cenário exato do usuário, num celular de verdade,
desligando e religando o Wi-Fi. A causa foi identificada lendo o código e o
conserto foi medido aqui — mas quem reproduz é o aparelho.

`sw.js` em `autolog-v29`.

### Passo 4 de 7 ✅ sincronização offline, com fusão de três vias

O passo 3 resolvia o encontro de duas garagens no muque: a do servidor ganhava
inteira. Isso servia para entrar numa conta pela primeira vez e estragava todo o
resto — quem registrasse um abastecimento no estacionamento sem sinal perderia o
registro ao voltar para a rede.

#### A fusão

Agora existem três versões de cada linha, e é isso que permite decidir sem
chutar: **base** (o espelho: como a linha estava no servidor na última
sincronização), **local** e **remota**.

| local vs base | remota vs base | o que acontece |
|---|---|---|
| igual | igual | nada |
| igual | mudou | aceita a remota |
| mudou | igual | sobe a local |
| mudou | mudou | conflito de verdade |

As três primeiras linhas não perdem nada de ninguém, e cobrem praticamente todo
uso real: as linhas são miúdas (um lançamento, uma parcela), então dois
aparelhos mexerem na **mesma** linha entre duas sincronizações é raro.

**No conflito, o aparelho na mão ganha — e o descartado fica guardado.** Toda
decisão automática perde alguma coisa; escolhi perder a versão que a pessoa não
está vendo, porque sumir da tela o que ela acabou de digitar é a mais
assustadora das duas falhas. A versão remota vai para `autolog-conflitos-v1` e o
Perfil mostra **"Ver N mudanças descartadas"** enquanto a lista não for limpa.

Comparar por relógio seria mais justo no papel, mas relógio de celular erra: um
aparelho adiantado venceria disputas que não deveria, e o erro seria invisível.

#### O primeiro encontro tem regra própria

Na primeira vez que um aparelho vê uma conta não existe espelho — e sem base a
fusão acusaria conflito em toda linha que existisse dos dois lados. Ali a regra
é **união, com o servidor tendo preferência no que coincide**.

Isso é melhor que a substituição do passo 3: quem cadastrou um veículo **antes**
de entrar na conta tem id próprio nele, então ele sobrevive e sobe em seguida.
Testado: aparelho com a garagem de demonstração + uma Ninja 400 só dele entrou
numa conta que já tinha garagem — ficou com os três veículos, e a Ninja subiu.

#### Quatro momentos de sincronizar, em vez de um

Antes: gravou, mandou. Se falhasse, nada tentava de novo até a gravação
seguinte — e quem guardou o celular no bolso nunca mais gravava nada.

1. **Gravou** — meio segundo depois, agrupando toques seguidos.
2. **Voltou a rede** (`online`) — o momento exato de insistir.
3. **App veio para a frente** — e também quando abre.
4. **Espera crescente** após falha: 8s, 30s, 2min, e depois para de insistir
   sozinho.

**O que torna isso seguro não é nenhum desses temporizadores**, e sim o espelho
só avançar quando o envio dá certo. Enquanto não deu, a mudança segue pendente
— mesmo que o app feche, mesmo que o celular reinicie.

#### Três defeitos encontrados pelos testes, dois deles graves

**1. O `select` do supabase-js nunca resolve quando o `fetch` rejeita.** Medido
na versão 2.116: sem rede, a leitura **fica pendurada para sempre**; o `upsert`,
no mesmo cenário, devolve erro normalmente.

Isso passou despercebido no passo 3 porque lá só havia escrita. O passo 4 lê
antes de escrever, e o efeito seria o pior possível: tela presa em
"Sincronizando…" para sempre, sem erro, sem nova tentativa e com o envio travado
bloqueando todas as gravações seguintes. Corrigido com **prazo próprio de 20s em
toda chamada de rede**.

**2. Eco infinito entre os aparelhos.** Depois de aceitar uma linha do servidor,
o app a empurrava de volta — o servidor carimbava data nova, que voltava na
leitura seguinte como novidade, que era aceita de novo. Dois aparelhos abertos
ficariam empurrando a mesma linha um para o outro para sempre. Corrigido fazendo
a base acompanhar o que foi aceito.

**3. Lápide já digerida contava como novidade a cada ciclo.** Não corrompia
nada, mas reconstruía o estado e redesenhava a tela indefinidamente, piorando
conforme as lápides se acumulassem.

#### A forma canônica, que evitou um quarto defeito

Comparar linha local com linha do servidor exige uma forma só. Conferido no
banco: o `jsonb` volta com as chaves **reordenadas** pelo Postgres
(`{quitado, parcela, restantes, dia}` volta como `{dia, parcela, quitado,
restantes}`) e `numeric` volta como **texto** (`"148.2"`).

Sem normalizar, todo veículo financiado seria reenviado em toda gravação, para
sempre, sem nada ter mudado. `canonico()` projeta qualquer linha — minha ou do
servidor — nas mesmas colunas, na mesma ordem, com os mesmos tipos.

#### Verificado

| O quê | Resultado |
|---|---|
| Os quatro quadrantes da fusão | Cada um se comporta como projetado, contra um servidor falso que filtra por `atualizado_em`, aceita upsert e carimba data como o gatilho do banco |
| Conflito | Local vence nos dois lados, remota guardada e visível no Perfil |
| Lápide nos dois sentidos | Apagado lá some aqui; apagado aqui vira lápide lá |
| Ociosidade | **Três ciclos seguidos sem nenhuma escrita no servidor** |
| Primeiro encontro | União preserva o veículo que só existia no aparelho |
| Offline | Erro em tela, nova tentativa aos 8s, `online` recupera e o lançamento chega |
| Deslogado | Zero chamadas de rede |

**Não verificado:** nada disso passou por dois aparelhos de verdade ao mesmo
tempo. O servidor falso imita o comportamento que importa, mas latência real,
sessão expirando no meio de um ciclo e duas escritas no mesmo instante só
aparecem em uso. O conflito de verdade, em especial, eu nunca vi acontecer — só
provoquei.

**O que continua fora:** a **foto** segue só no aparelho (a coluna `foto_path` e
o bucket esperando), e a tabela `servicos` segue sem uso.

`sw.js` em `autolog-v28`.

### Passo 3 de 7 ✅ o `Store` lendo e escrevendo no Supabase

O app deixou de ser só-local. O estado na memória continua sendo a verdade
enquanto ele está aberto, o `localStorage` continua sendo a cópia imediata, e o
Supabase recebe logo depois **só o que mudou**.

Arquivo novo: `js/nuvem.js`, em duas camadas — `Nuvem` traduz e transporta,
`Sincronia` decide. Nenhuma tela fala com o Supabase.

#### O `Store` não conhece a nuvem

`salvar()` grava no `localStorage` e avisa um ouvinte registrado de fora
(`Store.aoGravar`). A dependência fica numa direção só: a sincronização sabe do
estado, o estado não sabe que existe sincronização. Isso é o que mantém o app
funcionando idêntico para quem não entrou em conta nenhuma — **medido: zero
chamadas de rede com a sessão fechada.**

#### Ids derivados, porque `ipva` se repete

Documento, item de manutenção e parcela não têm id próprio no aparelho — são
`ipva`, `oleo`, `1` —, e esses nomes se repetem entre veículos. O id no banco é
derivado do pai (`cb300f:ipva`, `cb300f:ipva#3`), o que torna o envio
**repetível**: subir duas vezes a mesma garagem escreve nas mesmas linhas em vez
de duplicar tudo.

#### Só o que mudou sobe

`salvar()` reescreve o estado inteiro a cada toque; mandar tudo junto seriam 67
linhas por parcela paga. Um espelho no `localStorage` guarda como cada linha foi
enviada da última vez. Medido: registrar um lançamento manda **uma linha**, e
quando nada muda não há requisição nenhuma.

**O espelho só avança quando o envio dá certo** — é isso que faz a próxima
gravação tentar de novo sozinha depois de uma falha de rede.

#### A conta manda, mas nada é descartado

| Situação | O que acontece |
|---|---|
| Conta vazia | Sobe o que existe no aparelho — **sem tentar adivinhar** o que é dado de demonstração. Quem editou a moto de exemplo até virar a moto dele não pode perdê-la. |
| Conta com garagem | A conta vence, e o estado local inteiro é copiado para `autolog-antes-da-nuvem` **antes** da substituição. |

Fusão de verdade é o passo 4; até lá alguém tem de ganhar, e escolher o
servidor é o que faz o segundo aparelho mostrar a mesma garagem do primeiro.

#### Dois defeitos encontrados e corrigidos pelo caminho

**1. `atualizado_em` nunca era atualizada.** A coluna tinha `default now()`, que
só vale no `insert` — depois de um `update` a data ficava parada na criação. É
justamente ela que o passo 4 vai usar para saber o que mudou. Entrou gatilho
`before update` nas sete tabelas, carimbando com a hora **do banco**: deixar o
cliente mandar a data resolveria pela metade, porque relógio de celular erra.

**2. Ordem de array é invisível no banco e visível na tela.** O `select` devolve
linhas na ordem que o Postgres quiser. Para quase tudo dá na mesma, mas a aba
Documentos **desenha os cartões na ordem do array**: sem regra, a mesma garagem
apareceria com IPVA em cima numa abertura e Seguro na outra. A ordem é reposta
na reconstrução — documentos na ordem em que o app os cria, manutenção na ordem
do plano do tipo de veículo, lançamentos por data e, no empate, por id.

#### Também entrou

- **Paginação na leitura.** O PostgREST tem teto por resposta (padrão do painel:
  1.000 linhas). O teto pode ser baixado a qualquer momento e a garagem voltaria
  cortada **sem erro nenhum**. Testado com 2.350 linhas: 3 faixas, sem duplicata
  e sem buraco.
- **Estado da sincronização no Perfil.** Gravação silenciosa é confortável
  enquanto funciona; no primeiro celular sem sinal, a pessoa precisa saber. E o
  texto diz que nada se perdeu, porque é verdade.

#### Verificado

| O quê | Como |
|---|---|
| Mapeamento é reversível | Ida e volta do estado completo: **zero perdas** em todos os campos de 2 veículos, 8 documentos, 6 parcelas, 25 itens e 25 lançamentos |
| As linhas servem ao banco real | `insert` nas 5 tabelas **com o papel `authenticated` e as claims do usuário** — passou pelos NOT NULL, tipos, chaves estrangeiras e pelo `with check` do RLS. Rodado dentro de transação com `rollback`: a conta ficou com 0 linhas |
| Requisições certas | Rede interceptada: 6 `POST` na ordem da chave estrangeira, `on_conflict=user_id,id` (e `user_id` no perfil) |
| Remoção vira lápide | `PATCH ... removido_em`, filtrado por `user_id` **e** `id`, nunca `DELETE` |
| Falha de rede não perde nada | Lançamento continua no aparelho, espelho não avança, recado honesto na tela |
| Deslogado não muda nada | Zero chamadas de rede |

**Confirmado no aparelho em 2026-09-13:** o usuário entrou com a conta, a
garagem subiu e **apareceu num segundo aparelho**. Isso fecha o que eu não tinha
como testar daqui — tentei criar um usuário descartável para o teste autenticado
e a permissão foi negada (mexe em recurso compartilhado), então o caminho REST
com sessão de verdade só podia ser provado por ele. Foi.

**O que este passo ainda não faz:** a **foto** continua só no aparelho (a coluna
`foto_path` e o bucket estão prontos, esperando); não há **fila offline**, só
nova tentativa na gravação seguinte; e a tabela `servicos` ficou de fora porque
o app ainda não registra serviço sem custo — sincronizar uma lista sempre vazia
apagaria o que outro aparelho tivesse gravado.

`sw.js` em `autolog-v27`.

### Autolog vira produto — passos 1 e 2 de 7 ✅ banco e login

Decidido em 2026-09-13: o app vai para a Play Store com conta de usuário real.
As decisões já fechadas, para não reabrir:

| Assunto | Decisão |
|---|---|
| Banco | Supabase, região São Paulo. Cliente por CDN — **segue sem build step** |
| Login | Google e Facebook, via Supabase Auth. A senha `2047` morre |
| Dados | **Local-primeiro com sincronização**, não só-online. É a parte mais difícil |
| Foto | **Storage, nunca no banco.** GB de arquivo custa 6× menos que GB de banco |
| FIPE | **Continua no celular, sempre.** No servidor, os 500/dia viram um só para todos |
| Gemini | Edge Function com a chave do dono, só logado, com teto por pessoa |
| Primeira tela | Boas-vindas + "adicionar seu veículo". Sem dado de demonstração |
| Invólucro | TWA na v1; Capacitor só se precisar de nativo de verdade |
| Custo | Começa no plano grátis, **com rotina de backup própria** |
| Preço | R$ 30/ano depois — mas **v1 sai de graça**, para descobrir quem volta |

**Os 7 passos até a loja:** 1) ✅ esquema e RLS · 2) ✅ login com Google · 3) ✅ `Store`
lendo e escrevendo no Supabase · 4) ✅ sincronização offline ·
5) ✅ boas-vindas sem dado de demonstração · 6) política de privacidade e
Segurança de Dados · 7) TWA, assetlinks e publicação.

**Depois da loja, já pedido:** manutenção mais sofisticada e **manual do veículo
com assistente** — a pessoa envia o manual e pergunta ("qual a calibragem do
pneu?"). Isso resolve por outro caminho o projeto de especificações por modelo,
que segue pausado: a fonte passa a ser o manual do modelo e ano exatos dela.
Detalhes e números medidos em `autolog/ESQUEMA.md`.

**Onde parou:** passo 1 concluído em 2026-09-13. Projeto `autolog`, ref
`zhknfipxjvkthkbzgguf`, região São Paulo, plano grátis (R$ 0). **7 tabelas**
(`perfis`, `veiculos`, `lancamentos`, `documentos`, `parcelas`, `manutencao`,
`servicos`), RLS ligado em todas com 4 policies cada, trigger de perfil no
cadastro, bucket privado de fotos com policy própria. Advisors de segurança
limpos. **Nenhuma linha de dado ainda** — o app segue em `localStorage`.

**Próximo: passo 2, login com Google.** Checklist completo em
`autolog/LOGIN-GOOGLE.md`. A parte do Google Cloud é do usuário; o código vem
depois que ele avisar.

Três coisas dessa etapa que custam tempo se esquecidas:

- A URI de redirecionamento é o **callback do Supabase**
  (`https://zhknfipxjvkthkbzgguf.supabase.co/auth/v1/callback`), **não** o
  endereço do app. Confirmado respondendo 303.
- A tela de consentimento nasce em **Testing**, onde só usuários de teste
  listados conseguem entrar (máx. 100). Publicar é obrigatório antes da loja —
  e com escopo básico não abre revisão do Google.
- **Só escopos básicos** (`openid`, `email`, `profile`). Qualquer escopo sensível
  dispara verificação que leva dias.

### Puxar para atualizar jogava a barra inferior para baixo dos botões ⚠️ correção não reproduzida

O usuário puxava a tela para baixo, o app recarregava, e a barra de navegação do
Autolog ia parar embaixo dos botões do sistema do celular.

**A regra estava no elemento errado.** O `body` já tinha
`overscroll-behavior-y: none` — mas **quem rola não é o `body`**, é o `.screen`
por dentro. O gesto nascia nele, **encadeava** para o documento, e o Chrome
disparava o puxar-para-atualizar. Por isso a regra existia e não servia para
nada.

A recarga acontecia com `viewport-fit=cover` ativo — o app desenha sob a barra
do sistema de propósito, para o cabeçalho vermelho ir até a borda — e no
instante do recarregamento a área segura nem sempre é reportada de cara. A
barra ficava sem o respiro de baixo.

**Correção:** `overscroll-behavior-y: contain` no `.screen`, que prende o gesto
ali dentro.

**O que isso tira, e o que devolve:** o puxar-para-atualizar deixa de existir. O
app já se atualiza sozinho ao ser reaberto (service worker, desde a v16), e
entrou um botão **Buscar atualização do app** em Perfil → Dados para quem quiser
conferir na hora.

**Não reproduzido.** Não tenho celular aqui, e a correção vem do mecanismo, não
de ter visto o bug. Verificado só que `overscroll-behavior-y` passou a valer
`contain` no elemento que de fato rola, e que o botão novo aparece.

**Se a barra continuar sob os botões do sistema mesmo sem puxar a tela**, a
causa é outra — área segura não reportada pelo Android — e aí precisa de uma
captura de tela para resolver.

### CEP começando com zero era recusado ✅ e o mesmo erro estava no Renavam

O usuário digitava `07176640`, um CEP de Guarulhos, e o app respondia que
faltava dígito.

**A causa:** o campo era `tipo: 'number'`, e `valorDoCampo` roda `parseNum` em
tudo que é número. `parseNum('07176640')` devolve **7176640** — sete dígitos.
A validação estava certa; o dado é que chegava mutilado.

**A lição, que vale além deste caso:** CEP não é número, é sequência de
algarismos. **Se você nunca somaria nem multiplicaria aquilo, não é `number`.**

Entrou o tipo **`digitos`** no `UI.campo`: teclado numérico, aceita só
algarismos, respeita `maxlength` e **devolve texto**. Como ele limpa a
pontuação, `07176-640` também passa a funcionar.

**E o mesmo erro estava no Renavam**, que ninguém tinha reportado: 11 dígitos,
também pode começar com zero, também era `number`. Corrigido junto.

> **Dado já gravado não se recupera.** Renavam digitado antes desta correção
> perdeu o zero da frente na hora de gravar — o dígito nunca chegou ao `Store`.
> Quem tiver Renavam iniciado em zero precisa redigitar.

Os demais campos `number` continuam certos: km, ano, parcelas e dia são
quantidade, e aí zero à esquerda não significa nada.

Verificado: `' 07176-640 '` como `digitos` dá `'07176640'` (8); como `number`
dava `7176640` (7). E `Regiao.porCEP('07176640')` devolve **Guarulhos, SP**.

### Gemini: 5xx passou a repetir, e a mensagem parou de mentir ✅

O usuário tentou ler um comprovante no celular e recebeu **"O Gemini está fora
do ar agora"**.

Investiguei antes de mexer, e **as duas primeiras hipóteses estavam erradas**:

- `gemini-2.5-flash`, o modelo padrão, **não foi aposentado** — a página de
  deprecações diz "no shutdown date announced". (Os que morreram em 01/06/2026
  foram os da série 2.0.)
- **Não havia incidente** aberto no Gemini, Vertex ou AI Studio.

Ou seja: o app afirmava uma queda que não existia. A mensagem vinha de
`status >= 500`, e 500 significa que **aquela requisição** falhou do lado do
Google, não que o serviço caiu. Afirmar queda manda a pessoa esperar quando
muitas vezes o caminho era outro, e esconde o detalhe que resolveria.

Dois consertos:

1. **Repetição em 5xx**, com esperas de 0, 800 e 2400 ms. Falha passageira do
   lado do Google costuma passar na segunda. **4xx não repete** — é
   determinístico, e insistir só gastaria a cota da pessoa.
2. **Mensagem honesta**, dizendo o código, quantas tentativas houve e para onde
   ir. O detalhe guardado em `detalheDoErro` agora inclui a contagem.

Verificado com respostas simuladas, sem usar chave real: 500 dá 3 tentativas e a
mensagem nova; 400 dá 1 tentativa e preserva a mensagem original.

**A causa raiz segue desconhecida.** Não era modelo nem queda; pode ter sido
falha pontual do Google. Se repetir, o detalhe em **Perfil → Leitura por foto**
agora mostra status, modo de autenticação, modelo, tentativas e a mensagem do
Google — é por aí que se descobre.

### Passo 2 ✅ a senha `2047` morreu

Três arquivos novos e um reescrito:

- **`js/conta.js`** — o Supabase. Sessão, Google, e-mail/senha, recuperação, e a
  tradução das mensagens de erro num lugar só.
- **`js/trava.js`** — o bloqueio por digital, em WebAuthn.
- **`js/auth.js`** — reescrito: só telas agora, sem lógica de credencial.
- **`index.html`** — o cliente do Supabase entra por CDN, versão UMD: **sem npm
  e sem build step**, para a regra do projeto continuar valendo.

**Quatro estados, e o `App.render` escolhe a tela por eles:** `carregando`
(restaurar sessão é assíncrono — sem esse estado o app piscaria o login antes de
descobrir que já havia sessão), `indisponivel` (a biblioteca vem de CDN e pode
não vir; melhor dizer isso que mostrar tela branca), `deslogado`, `trancado`.

**Ainda é só autenticação.** A garagem continua em `localStorage`: a sessão
decide se o app abre, não o que ele mostra. Ligar o `Store` ao banco é o passo 3,
e é lá que a garagem local do usuário sobe para a conta dele.

#### Testado

- **Trigger do perfil dispara** — usuário criado, linha em `perfis` nasce junto,
  com o nome vindo de `raw_user_meta_data.full_name` (o caminho do Google).
- **Login ponta a ponta**, app abre, `Conta.email()` e `Conta.nome()` preenchidos.
- **Sessão sobrevive ao recarregar**, sem piscar a tela de login.
- **Sair** volta para a entrada.
- **Cascade limpa junto:** apagar o usuário zerou `perfis`.
- Tradução de erro: senha errada dá "E-mail ou senha incorretos.", não
  *Invalid login credentials*.

#### Dois tropeços que valem registro

**A tradução deixou inglês vazar.** O Supabase diz `Email address "x" is invalid`,
e meu padrão procurava `invalid email` — não casou, e a mensagem crua foi para a
tela. Corrigido com `email` + `invalid` juntos, e o fallback deixou de devolver a
mensagem original: agora ela vai para o console e a tela recebe português.

**Usuário inserido direto no banco quebra o login** com *Database error querying
schema*. As colunas de token (`confirmation_token`, `recovery_token`, etc.)
nascem NULL e o servidor de auth as lê como texto não-nulo. Cadastro pela API
não tem esse problema — era limitação do atalho de teste, não do app. Fica
anotado porque vai acontecer de novo em qualquer semente de dados.

#### Não verificado

- **Entrar com Google de verdade.** O fluxo redireciona para fora, e este
  navegador não completa. Só no aparelho.
- **A digital.** `isUserVerifyingPlatformAuthenticatorAvailable()` responde
  `true` aqui, mas registrar a credencial abre diálogo do sistema operacional.
  Só no celular.
- **E-mail de confirmação chegando.** Não gastei o limite de 2/hora com endereço
  falso — e o Supabase recusa domínios como `example.com`.

**Duas portas de entrada, não uma.** Decidido em 2026-09-13: além do Google,
**e-mail e senha com confirmação**. A confirmação fica **ligada** — sem ela,
qualquer um cria conta com o e-mail de outra pessoa.

> **Armadilha do remetente:** o serviço de e-mail embutido do Supabase manda
> **2 mensagens por hora** e a documentação diz que **não é para produção**. A
> terceira pessoa que se cadastrar na mesma hora não recebe nada, sem erro
> nenhum. Em produção, SMTP próprio (Resend), que sobe para 30/hora.

### Domínio próprio — decidido: sim, `.com.br`

Decidido em 2026-09-13. O que ele resolve, **de graça**:

1. **Endereço do app** — GitHub Pages aceita domínio próprio com HTTPS
   automático (Let's Encrypt), sem custo.
2. **E-mail de verdade** — o Resend exige domínio verificado.
3. **Resolve o TWA.** O `assetlinks.json` precisa ficar na raiz do domínio; com
   domínio próprio ele vai em `/.well-known/assetlinks.json` e **a gambiarra do
   repositório `brennoc-bit.github.io` deixa de ser necessária**.
4. **`rpId` limpo para o WebAuthn**, em vez de domínio compartilhado.

> **Correção registrada:** eu havia dito que o domínio próprio consertaria a tela
> de consentimento do Google. **Não conserta.** O que o Google exibe vem do
> destino do redirecionamento — o callback do Supabase — e não do endereço do
> app. Isso exige o **domínio customizado do Supabase**, adicional pago e
> separado. Fica para antes do lançamento.

### Trava local por digital — decidido: sim, em vez de passkey

Decidido em 2026-09-13. O passkey do Supabase está em **beta**, e depender de
recurso beta como única porta de entrada é risco para app de loja.

A trava usa **WebAuthn**, o mesmo mecanismo, de outro jeito: em vez de provar
identidade para um servidor, só exige que o dono do aparelho se identifique
antes de liberar. Sem servidor, sem beta, funciona no Chrome do Android e
portanto dentro do TWA.

**O alcance honesto:** protege contra alguém pegar o celular desbloqueado e abrir
o app. **Não criptografa nada** — quem tiver o aparelho e conhecimento técnico lê
os dados por baixo. É cortina, não cofre, e é o que a maioria dos apps de banco
chama de "bloqueio do app". Cofre de verdade exigiria usar a digital para
destravar uma chave de criptografia — bem mais complexo, fora da v1.

**A regra do fracasso, que é o que decide se a trava presta:** quando a digital
falha (aparelho sem biometria, pessoa cancela, credencial some ao limpar dados
do site), **cai no login normal**. Abrir assim mesmo seria teatro; travar de vez
trancaria a pessoa para fora da própria garagem.

**Duas coisas decididas na hora de aplicar, que mudaram a proposta:**

- **Chave primária virou composta `(user_id, id)`.** O `uid()` do app tem 8
  caracteres base36; colisão de aniversário aparece por volta de 2 milhões de
  ids, e com 1 milhão já são 16% de chance. Somando todos os usuários isso é
  alcançável, e com chave global alguém veria o insert falhar por causa do id de
  um estranho. Composta, a colisão só importa dentro da garagem de uma pessoa.
- **O advisor pegou a função do trigger exposta pela API REST.** Ela nasceu em
  `public`, que o Supabase publica, e era `security definer` — escalada de
  privilégio. `execute` revogado de `public`, `anon` e `authenticated`.

**RLS testado de fora, com a chave pública, não só conferido no painel:** ler
deslogado devolve `[]`; gravar com `user_id` de outro dá **401 · violates
row-level security policy**; chamar a função do trigger dá **404**.

**Dois achados do levantamento:**

- O projeto Supabase que existe (`dfkpjwrqbmuvbxcsvity`) **é de outro produto** —
  tem `caixas`, `portas`, `notificacoes` com dados reais. O Autolog precisa do
  próprio. Cabem 2 projetos grátis por organização, então sobra exatamente um.
- **Armadilha no esquema:** o app usa `ipva`, `seguro` etc. como id de documento,
  e esses valores se repetem entre veículos. Como chave primária, o IPVA da moto
  sobrescreveria o do carro. Virou coluna `doc_id`, com chave própria separada.

**A favor do projeto:** nenhuma tela lê armazenamento direto — conferido, zero
acessos a `localStorage` fora do `store.js`. A migração mexe em um arquivo.

**O app está no ar:** <https://brennoc-bit.github.io/egarage/autolog/>

Não depende de máquina ligada nem de sessão de trabalho. Cada `git push` na
`main` republica em um ou dois minutos, e o service worker (rede primeiro) faz
o celular pegar a versão nova ao reabrir.

> **Atenção ao endereço.** O antigo `/egarage/motoreiro/` dá 404 desde a troca
> de nome. Foi exatamente o que aconteceu no teste de celular em 2026-08-23.

### Passada de design ✅ movimento, traço e alvo de toque

O usuário pediu para o app ficar "mais fluido visualmente". Auditei as dez
rotas a 375px, medindo em vez de olhar — e o que apareceu não foi questão de
gosto: era um defeito funcional, um risco de compatibilidade e três problemas
de leitura.

#### O defeito: o botão flutuante tapava a ação principal de cinco telas

Rolando até o fim, o botão de abastecer ficava **em cima** do último elemento.
Medido, rota a rota: "Agendar oficina" na Manutenção e nos Documentos,
"Registrar peça" nos Custos, o lápis de editar na Ficha, o rodapé no Perfil.
Sempre a ação principal, e permanentemente — não era questão de rolar mais.

Duas telas resolviam isso com `h('div', { style: { height: 76 } })` escrito à
mão; as outras cinco não tinham nada. Virou regra única:
`.screen:has(> .fab) { padding-bottom: 96px }`. Vale em toda tela que tem o
botão e **some sozinha** nas que não têm — o cadastro, que já tem ações no pé,
continua com padding zero (conferido).

Medida depois: folga de 11 a 52px em todas as oito rotas com botão.

#### O risco: quatro dos cinco ícones da barra não existiam em fonte nenhuma

Eram caracteres Unicode — `⌂ ⏣ ◫ ◉`. Medi a largura de cada um em Archivo e em
monospace: **idênticas**, o que só acontece quando nenhuma das duas tem o glifo
e quem desenha é a fonte de símbolos do sistema. Ou seja, a barra mais visível
do app mudava de forma conforme o aparelho, e num Android sem o glifo sairia o
quadradinho vazio.

Agora são cinco SVGs embutidos (casa, chave de boca, cédula, documento,
pessoa), no mesmo traço da bomba do botão flutuante. Sem fonte de ícone e sem
dependência nova.

#### Movimento, que era o pedido literal

Não havia transição nenhuma: trocar de aba era substituição seca de DOM. Entrou
uma entrada curta (opacidade + 10px de baixo para cima, 260ms) no corpo da tela
e no título do cabeçalho.

**O cuidado que faz a diferença:** `App.render()` roda a cada parcela paga,
cada chip tocado, cada foto trocada. Animar tudo isso faria o app *piscar* a
cada toque. O gatilho é o `topo` do `render({ topo })`, que já existia e só é
verdadeiro quando a rota muda de fato.

Junto: realce de toque padronizado, que **acende na hora e apaga devagar** —
com a transição valendo nos dois sentidos, um toque de 100ms mal chegaria a
pintar a linha. E `prefers-reduced-motion` desliga tudo.

#### Traço: dois tokens no lugar de um

O `--color-divider` do design system é 40% de preto. Num canvas, visto em
poucos blocos, desenha bem; numa tela de celular com dezenas de linhas, vira
grade de planilha e a linha compete com o dado que deveria separar.

Split em `--linha` (12%, para separar) e `--borda` (22%, para delimitar campo e
chip, que precisa ser visto porque mostra onde se toca). As 30 ocorrências do
CSS foram classificadas uma a uma, mais 5 escritas inline no `screens.js`. **O
token do design system ficou intacto.**

#### Leitura

- **Subtítulos da Manutenção saíram da caixa alta.** O conteúdo ali é frase —
  "última · 7.000 km · faltam 580 km · faltam 4 meses" —, e caixa alta apaga o
  desenho das palavras. O mono fica, porque são números que alinham.
- **Dois níveis de filtro nos Custos deixaram de ter o mesmo peso.** "Custo/km
  | Histórico" diz em que tela você está; "30 | 90 dias | 12 meses" diz que
  janela está vendo. Desenhados iguais, viravam cinco botões equivalentes. O de
  baixo virou contorno (`.segrow.sub`).
- **Valor longo agora quebra em vez de ser cortado.** O e-mail da conta no
  Perfil aparecia como "capobiancobrenno@gm" e acabava. Acima de 14 caracteres
  o corpo diminui e o valor cabe inteiro.
- **Faixa do gráfico da previsão tem piso de 3px.** Num mês tranquilo a barra
  tem ~15px, e uma faixa de 8% virava 1px: sumia, e a legenda prometia uma
  leitura que a barra não entregava.
- **Moldura da foto vazia ficou calma.** É o maior elemento do Início para quem
  não pôs foto (343×193px), e as listras gritavam mais que o nome do veículo.

#### Alvo de toque

Piso de 44px nos botões de ação (`.btn` do design system nascia com 35px, os
fantasma com 31px) e área clicável de 40px nos links de seção, que tinham
**16px** de altura. Todas as dez rotas foram medidas: nenhum alvo abaixo de
36px, com uma exceção deliberada — o link "R$ 6,29/L — usar este" dentro da
frase de dica do cadastro, que não cresce sem distorcer o parágrafo.

**Uma regressão minha, encontrada e corrigida na verificação:** o piso de toque
alargou "editar"/"excluir" no Perfil e empurrou o nome do veículo para duas
linhas. Causa de especificidade — a regra do `:not()` pesa mais que a do botão
fantasma, que por isso não valia. Cresce a altura, que é o que o dedo precisa;
a largura fica.

#### Verificado

Dez rotas a 375px: nenhum estouro horizontal, nenhum erro de console (só o
aviso conhecido de service worker, que este navegador bloqueia), botão
flutuante livre em todas, `:has()` aplicando o respiro só onde há botão. O
enquadramento de celular em tela larga continua de pé. `sw.js` em
`autolog-v26`.

**Conferido no aparelho em 2026-09-13**, depois da publicação: o usuário abriu
a v26 no celular e aprovou o resultado visual. Isso fecha a dúvida que importa
— animação, ícones desenhados e traço novo se comportam na tela de verdade,
não só na medição.

**O que esse teste não cobre**, e segue em aberto: o toque real nos alvos de
44px (aprovar a aparência não é o mesmo que errar ou acertar o dedo) e o
desempenho da animação num Android mais fraco que o dele. A regra `:has()` pede
Chrome 105+ (agosto de 2022); em navegador mais antigo ela é ignorada e o botão
volta a tapar o rodapé, sem quebrar nada.

### O que ainda não foi validado no aparelho

Tudo abaixo foi conferido por medição no navegador, mas **não por uso real no
celular** — o navegador embutido do Claude Code bloqueia service worker, então
a palavra final é do aparelho:

- Se o service worker registra de fato e o app instala em tela cheia.
- Se o botão flutuante de abastecimento cai bem no polegar.
- Se algum alvo de toque ficou apertado (todos medidos acima de 40px; os
  contatos do seguro, entre 77 e 82px).

---

## Próximos passos

Nada começado. Ordem sugerida por relação entre esforço e retorno.

### Rápidos

- **Avisar quando o armazenamento encher.** Hoje o `Store.salvar()` captura o
  erro de cota e só escreve no console: a gravação falha em silêncio. Com o uso
  atual não acontece, mas passaria a ser plausível com anexos.
- **Mostrar o consumo no Perfil** ("garagem: 19 KB de ~5 MB").
- **Atualizar o preço do combustível** rodando `ferramentas/gerar-precos.py`
  quando o número ficar velho. A ANP publica toda sexta; o app mostra a semana
  de referência na tela, então dá para saber quando vale a pena.
- **Revisar `dados/ipva.json` em janeiro**, quando as leis estaduais de 2027
  saírem — e, de preferência, confirmar na Sefaz os 11 estados marcados com
  `"conferir": true`.
- **Acrescentar Factor e Crosser** (Yamaha) ao `dados/veiculos.json` — faltam
  no catálogo e estão entre as motos mais vendidas do país.
- ~~**Trocar a senha do protótipo.**~~ Decidido em 2026-09-10: `2047` é número
  inventado só para o protótipo, não usado em lugar nenhum. Fica como está.

### Médios

- **Atalho de emergência para o seguro.** Hoje são três toques até a assistência
  24h (Docs → cartão → tela). Dá para pôr acesso direto na Início, ou toque
  longo no botão flutuante.
- **Histórico por item de manutenção**: o registro de serviço zera o contador,
  mas não guarda a linha do tempo daquele item.
- **Notificações de vencimento** (revisão, IPVA, seguro). Exige permissão do
  navegador e só funciona com o app instalado.

### Grandes

- **Proxy para a leitura por foto**, quando o app tiver outros usuários: função
  serverless com a chave do Gemini, para ninguém precisar colar chave própria.
- **Anexar apólice e CRLV.** Medido em 2026-08-23: `localStorage` tem teto de
  ~5 MB por origem, a garagem inteira ocupa 19 KB e cada foto do app custa de
  80 a 176 KB — folgado para fotos de veículo, mas um PDF de apólice (1 a 5 MB,
  mais 33% ao virar base64) estoura. Anexo de documento precisa de
  **IndexedDB**, cuja cota é da origem (2,7 GB na medição).
- **Internacionalização.** A intenção declarada é que o app seja global, e hoje
  ele é pt-BR de ponta a ponta e brasileiro no conteúdo: interface em
  português, valores em R$, documentos que são IPVA, licenciamento e Detran.
  Pede tradução, moeda e formato por localidade, e documentos configuráveis por
  país. É o maior item da lista; só o nome já nasceu internacional.
- **Autenticação de verdade**, se o app deixar de ser protótipo: a conferência
  precisa sair do navegador e ir para um servidor.

### Visibilidade do repositório — decidido: público

Decidido em 2026-09-10, depois de pesquisar: **fica público, sem GitHub Pro.**
Não reabrir sem motivo novo.

O que pesou:

- **Plano Free publica Pages só de repositório público.** Tornar privado hoje
  tiraria o app do ar e o celular pararia de atualizar. Privado + Pages exige
  GitHub Pro (~US$ 4/mês).
- **Privar não esconderia o app.** É HTML/CSS/JS puro: quem abre a URL já tem
  o código no navegador. E o site do Pages continua público mesmo com o
  repositório privado — site que exige login só no Enterprise Cloud.
- **O que privar esconderia** é este `PROGRESS.md` e o histórico de commits:
  o raciocínio e as decisões, não o produto.
- Hoje não há nada sensível versionado — sem chaves, sem dado pessoal.

Se um dia o app for cobrado, o que vai proteger não é repositório privado, é o
servidor que ainda não existe.

### Workspace

- Nada aberto. As duas decisões que estavam paradas foram tomadas em
  2026-09-10: o redirect do endereço antigo foi feito e o `car-cost-app/` foi
  removido.

---

## Convenções deste repositório

- Ao terminar uma sessão de trabalho, atualizar este arquivo antes do commit.
- Ao abrir o projeto em outra máquina, ler este arquivo antes de retomar.
- Os apps são HTML/CSS/JS puro, sem build step: basta servir a pasta com
  `python -m http.server <porta>`. Atenção: esse servidor não manda
  `Cache-Control`, então o navegador serve JS/CSS antigos depois de editar —
  recarregue forçado se o comportamento não mudar.
