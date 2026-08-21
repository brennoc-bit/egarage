# PROGRESS

Estado do workspace `Claude codando da silva` — repositório
[brennoc-bit/egarage](https://github.com/brennoc-bit/egarage).

> **Leia este arquivo primeiro** ao abrir o projeto em outra máquina, antes de
> retomar qualquer trabalho. Ele é atualizado ao fim de cada sessão, antes do
> commit e do push.

**Última atualização:** 2026-08-21

---

## O que já foi feito

### `motoreiro/` — assistente de garagem de moto ✅ v1 funcional

App web em HTML/CSS/JS puro, sem build, em pt-BR. Implementado a partir do
canvas `Garagem.dc.html` do projeto Claude Design *Assistente pessoal veicular*
(`projectId 301e9cee-dc57-4cdb-8752-3e2578c1c667`), com o design system
Modernist copiado fiel em `ds/modernist.css`.

As sete telas do canvas viraram cinco abas — Início · Garagem (Resumo/Ficha/
Histórico) · Custos (Custo/km + Financiamento) · Docs · Perfil — mais o
Diagnóstico como rota própria.

Nada é estático: custo/km sai do gasto real dividido pelo km real do período;
consumo médio vem dos abastecimentos; o diagnóstico cruza intervalo em km e
meses com odômetro e data do último serviço; documentos calculam prazo,
progresso e status. Funciona registrar abastecimento, lançar peça, registrar
serviço feito, pagar parcela, renovar apólice, agendar oficina, simular
financiamento (Price e SAC), cadastrar motos, trocar foto e exportar/importar
a garagem em `.json`. Persistência em `localStorage` (`motoreiro-v1`).

Rodar: `python -m http.server 5174` dentro de `motoreiro/`, abrir
`http://127.0.0.1:5174`. Detalhes de arquitetura e desvios do design estão no
`motoreiro/README.md`.

Verificado percorrendo todas as rotas (sem erros de console), medindo layout em
375×812 e no modo moldura, e executando os fluxos de gravação ponta a ponta.
Três bugs corrigidos no processo: `input[type=number]` engolia a vírgula
decimal do teclado pt-BR, `"4.200"` era lido como 4,2, e a casca do app crescia
além da viewport levando a barra de navegação junto.

### `car-cost-app/` — simulador de custos do veículo ✅ existente, estável

Formulário de seis blocos (veículo, financiamento, seguro, uso e combustível,
revisão, IPVA e licenciamento) e tela de resultado, com persistência em
`localStorage` (`simulador-veiculo-v1`) e sugestão dos meses de IPVA e
licenciamento de SP pelo final da placa.

Não foi tocado nesta sessão — entrou no repositório como estava.

### Kickpush movido para fora do repo ✅

O protótipo web, o plano técnico, o QR do Expo Go e a pasta do app foram
movidos para `D:\pasta teste claude\` — o Kickpush continua como projeto
separado, agora também em pasta própria fora do workspace `egarage`. Este
commit remove os três arquivos que ainda estavam versionados aqui
(`kickpush.html`, `kickpush-plano-tecnico.html`, `kickpush-qr.png`), alinhando
o repositório à convenção do `CLAUDE.md`: kickpush não é versionado neste
repo. Instruções de retomada do app ficam em `RETOMAR.md` dentro da própria
pasta do projeto, na nova localização.

### Infraestrutura ✅

Git e GitHub configurados nesta sessão: repositório na raiz com branch `main`,
`.gitignore` cobrindo dependências, saídas de build, `.expo`, caches, logs,
configuração local do Claude Code e padrões de credenciais como rede de
proteção. Varredura de arquivos sensíveis feita antes do primeiro commit —
nenhum encontrado.

Documentação de entrada para trabalhar nas duas máquinas: `README.md`
(estrutura, como rodar cada app, rotina de `pull`/`push`) e `CLAUDE.md`
(instruções que o Claude Code carrega sozinho ao abrir a pasta — ler este
`PROGRESS.md` primeiro, atualizá-lo ao fim da sessão, convenções do repo).

---

## Em andamento

Nada aberto no momento. O commit inicial fechou o ciclo desta sessão.

---

## Próximos passos

Candidatos, em ordem de esforço — nenhum foi iniciado:

**`motoreiro/`**
- Ícones do PWA: `manifest.json` está com `"icons": []`, então a instalação na
  tela inicial ainda não mostra ícone próprio.
- Service worker para uso offline de verdade (hoje depende do servidor local).
- Notificações de vencimento (revisão próxima, IPVA vencendo, seguro a
  renovar) — item que ficou pendente já no canvas de design.
- Histórico por item de manutenção: hoje o registro de serviço zera o contador,
  mas não guarda a linha do tempo daquele item específico.
- Publicar no GitHub Pages para abrir do celular sem servidor local.

**Workspace**
- Decidir se `car-cost-app/` continua separado ou se vira uma tela do
  `motoreiro/` — os dois calculam custo de veículo e hoje se sobrepõem.

---

## Convenções deste repositório

- `kickpush/` é ignorado aqui de propósito: tem repositório próprio.
- Ao terminar uma sessão de trabalho, atualizar este arquivo antes do commit.
- Ao abrir o projeto em outra máquina, ler este arquivo antes de retomar.
- Os apps são HTML/CSS/JS puro, sem build step: basta servir a pasta com
  `python -m http.server <porta>`. Atenção: esse servidor não manda
  `Cache-Control`, então o navegador serve JS/CSS antigos depois de editar —
  recarregue forçado se o comportamento não mudar.
