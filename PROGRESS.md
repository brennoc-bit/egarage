# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-09-10 — redirect do endereço velho, fim do `car-cost-app/` e da aba de simular financiamento

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

Nada aberto. O ciclo foi encerrado com tudo commitado e publicado.

**O app está no ar:** <https://brennoc-bit.github.io/egarage/autolog/>

Não depende de máquina ligada nem de sessão de trabalho. Cada `git push` na
`main` republica em um ou dois minutos, e o service worker (rede primeiro) faz
o celular pegar a versão nova ao reabrir.

> **Atenção ao endereço.** O antigo `/egarage/motoreiro/` dá 404 desde a troca
> de nome. Foi exatamente o que aconteceu no teste de celular em 2026-08-23.

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
- **Trocar a senha do protótipo** se `2047` for um PIN usado em outro lugar —
  ela fica visível no código de um repositório público.

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
