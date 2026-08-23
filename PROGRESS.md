# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-08-23 (3ª sessão do dia)

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

**GitHub Pages está no ar** desde 2026-08-23: o app vive em
`https://brennoc-bit.github.io/egarage/autolog/`. Como o service worker é
rede-primeiro, todo push aparece no celular ao reabrir o app.

Falta validar no aparelho: se o service worker registra de fato (não deu para
testar aqui — o navegador embutido do Claude Code bloqueia service workers), se
instala em tela cheia com o ícone certo e se os botões respondem bem ao toque,
em especial o flutuante de abastecimento.

---

## Próximos passos

**Internacionalização — a direção maior.** A intenção declarada é que o app seja
global, e hoje ele é pt-BR de ponta a ponta e brasileiro no conteúdo: interface
em português, valores em R$, e documentos que são IPVA, licenciamento e Detran.
Um app global pede tradução da interface, moeda e formato por localidade, e
documentos configuráveis por país. É o maior item da lista e ainda não começou —
só o nome já nasceu internacional.

**`autolog/`**
- Trocar a senha do protótipo se `2047` for um PIN usado em outro lugar — ela
  fica visível no código de um repositório público.
- Notificações de vencimento (revisão próxima, IPVA vencendo, seguro a renovar).
  Exige permissão do navegador e só funciona com o app instalado.
- Histórico por item de manutenção: hoje o registro de serviço zera o contador,
  mas não guarda a linha do tempo daquele item específico.
- Ajustar alvos de toque depois do teste no celular, se algum botão ficar
  apertado para o dedo.

**Workspace**
- Decidir se `car-cost-app/` continua separado ou se vira uma tela do `autolog/`
  — os dois calculam custo de veículo e hoje se sobrepõem.

---

## Convenções deste repositório

- Ao terminar uma sessão de trabalho, atualizar este arquivo antes do commit.
- Ao abrir o projeto em outra máquina, ler este arquivo antes de retomar.
- Os apps são HTML/CSS/JS puro, sem build step: basta servir a pasta com
  `python -m http.server <porta>`. Atenção: esse servidor não manda
  `Cache-Control`, então o navegador serve JS/CSS antigos depois de editar —
  recarregue forçado se o comportamento não mudar.
