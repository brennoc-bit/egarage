# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-08-23

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

### Tela de cadastro de veículo ✅

O "+ Nova" abria uma folha rápida com oito campos. Agora é **rota própria**
(`veiculo`), com:

- **Foto no topo**, do tamanho de um cartão, tocável — câmera ou galeria,
  redimensionada no cliente, com ações de trocar e remover.
- Escolha de **tipo** em dois cartões grandes.
- Campos agrupados em **Identificação** (marca, modelo, apelido, ano, cor,
  motor, combustível), **Documentos** (placa, renavam, chassi), **Uso** (km
  atual, consumo, preço do litro) e **Financeiro** (FIPE, data da compra).
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

### Instalável como app (PWA) ✅ código pronto, falta publicar

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

**Publicar o Autolog no GitHub Pages.** O código do PWA está pronto e na `main`;
falta a ativação, que só pode ser feita na interface do GitHub:
*Settings → Pages → Source: Deploy from a branch → Branch: `main` → `/(root)`*.

Depois disso o app fica em `https://brennoc-bit.github.io/egarage/autolog/`
(atenção: a pasta mudou de nome, então o endereço mudou também). No celular é só
abrir e usar *Instalar app* no menu do Chrome.

Falta então validar no aparelho: se o service worker registra, se instala em
tela cheia com o ícone certo e se os botões respondem bem ao toque.

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
