# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-08-24 — descoberta de modelos pela API

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

**Pendente de verificação:** o registro do service worker não pôde ser testado
aqui — o navegador embutido do Claude Code bloqueia service workers (o `fetch`
do arquivo responde 200 com MIME correto, mas `register()` falha com erro
genérico). Sintaxe conferida com `node --check`. A validação real é no celular.

**Importante:** instalar como app exige **HTTPS**. Pelo IP da rede local o
Chrome degrada para atalho com barra de navegador.

### `car-cost-app/` — simulador de custos do veículo ✅ existente, estável

Formulário de seis blocos e tela de resultado, com persistência em
`localStorage` (`simulador-veiculo-v1`) e sugestão dos meses de IPVA e
licenciamento de SP pelo final da placa. Não foi tocado desde o commit inicial.

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

- **Redirecionar o endereço antigo.** Um `motoreiro/index.html` de duas linhas
  apontando para `autolog/` mataria o 404 para sempre, inclusive em links já
  compartilhados. Foi oferecido e ficou sem resposta — decisão pendente.
- **Avisar quando o armazenamento encher.** Hoje o `Store.salvar()` captura o
  erro de cota e só escreve no console: a gravação falha em silêncio. Com o uso
  atual não acontece, mas passaria a ser plausível com anexos.
- **Mostrar o consumo no Perfil** ("garagem: 19 KB de ~5 MB").
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

- Decidir se `car-cost-app/` continua separado ou vira uma tela do `autolog/` —
  os dois calculam custo de veículo e hoje se sobrepõem.

---

## Convenções deste repositório

- Ao terminar uma sessão de trabalho, atualizar este arquivo antes do commit.
- Ao abrir o projeto em outra máquina, ler este arquivo antes de retomar.
- Os apps são HTML/CSS/JS puro, sem build step: basta servir a pasta com
  `python -m http.server <porta>`. Atenção: esse servidor não manda
  `Cache-Control`, então o navegador serve JS/CSS antigos depois de editar —
  recarregue forçado se o comportamento não mudar.
