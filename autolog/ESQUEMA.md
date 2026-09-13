# Esquema do banco — proposta

> **Estado: proposta, nada criado.** Este arquivo é o passo 1 da migração do
> Autolog de `localStorage` para Supabase, com conta de usuário e sincronização.
> Nada vai para o banco antes de você aprovar o que está aqui.

Levantado a partir do que o `js/store.js` guarda hoje, não de imaginação. As 25
funções que o `Store` expõe continuam sendo a única porta de entrada dos dados —
nenhuma tela vai falar com o Supabase direto.

---

## As três decisões que amarram tudo

### 1. Id vem do aparelho, não do banco

Toda tabela usa `id text` gerado no celular, como o `uid()` que o app já usa.

**Por quê:** local-primeiro significa cadastrar veículo no estacionamento sem
sinal. Se o id viesse do banco (`serial`, `identity`), criar qualquer coisa
exigiria ida e volta à rede — e offline pararia de funcionar. O id nascer no
aparelho é o que permite gravar agora e sincronizar depois.

### 2. Nada é apagado de verdade

Toda tabela tem `removido_em timestamptz`. Apagar é preencher essa coluna.

**Por quê:** se a linha sumisse do banco, o outro aparelho nunca saberia que ela
foi removida — ele veria uma linha que existe só nele e a mandaria de volta. O
lançamento apagado no celular ressuscitaria pelo tablet. A marca de remoção é o
que ensina o outro aparelho que aquilo morreu.

Uma limpeza periódica remove de vez o que está marcado há mais de 90 dias.

### 3. Foto não entra no banco

`veiculos.foto_path` guarda só o caminho. A imagem vive no Storage, em
`fotos/{user_id}/{veiculo_id}.jpg`.

**Por quê:** foto pesa 80–176 KB, mais que cinco anos de texto. No plano pago, GB
de arquivo custa US$ 0,021 contra US$ 0,125 de banco — seis vezes menos — e não
incha backup nem consulta.

---

## Tabelas

Todas têm `user_id uuid not null`, `atualizado_em timestamptz not null default now()`
e `removido_em timestamptz null`. Abaixo só as colunas próprias.

### `perfis` — uma linha por pessoa

| Coluna | Tipo | Nota |
|---|---|---|
| `user_id` | `uuid` | chave primária, referencia `auth.users` |
| `nome` | `text` | |
| `uf`, `municipio` | `text` | a região, que hoje mora só no aparelho |
| `veiculo_selecionado` | `text` | qual veículo está aberto |

Nasce por **trigger** quando o usuário é criado — não por código do app, senão um
cadastro por outro caminho deixa a linha faltando.

### `veiculos`

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK, do aparelho) |
| `tipo` | `text` — `carro` ou `moto` |
| `marca`, `modelo`, `apelido`, `cor`, `combustivel`, `motor` | `text` |
| `ano` | `integer` |
| `placa`, `renavam`, `chassi` | `text` |
| `odometro` | `integer` |
| `consumo`, `preco_comb`, `fipe` | `numeric` |
| `preco_comb_manual` | `boolean` |
| `compra` | `date` |
| `fipe_ref` | `jsonb` — o que a FIPE devolveu, guardado inteiro |
| `foto_path` | `text` — caminho no Storage |
| `financiamento` | `jsonb` — `{quitado, parcela, restantes, dia}` |

`financiamento` é `jsonb` porque é lido sempre inteiro e nunca consultado por
campo. Se um dia precisar de consulta, vira tabela.

### `lancamentos`

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK) |
| `veiculo_id` | `text` |
| `data` | `date` |
| `tipo` | `text` — combustivel, manutencao, pneus, transmissao, documentacao, seguro, financiamento, outros |
| `titulo`, `local` | `text` |
| `valor`, `litros` | `numeric` |
| `odometro` | `integer` |
| `item_id` | `text` — amarra o gasto ao item de manutenção |

A tabela que mais cresce: 149 bytes por linha, ~52 linhas por ano para quem
abastece toda semana.

### `documentos`

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK) |
| `doc_id` | `text` — `ipva`, `licenciamento`, `seguro`, `revisao` |
| `veiculo_id` | `text` |
| `tipo` | `text` — `parcelas`, `unico`, `seguro`, `km` |
| `tag`, `titulo`, `sub` | `text` |
| `valor` | `numeric` |
| `venc`, `inicio` | `date` |
| `pago`, `estimado` | `boolean` |
| `alvo_km` | `integer` |
| `coberturas` | `text[]` |
| `pagamento`, `apolice`, `agendada` | `jsonb` |

**Atenção a uma armadilha:** hoje o app usa `ipva`, `seguro` etc. como id do
documento — e esses valores **se repetem entre veículos**. Se virassem chave
primária, o IPVA da moto sobrescreveria o do carro. Por isso a chave é um `id`
próprio e o nome antigo virou a coluna `doc_id`, única só dentro do veículo.

### `parcelas`

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK) |
| `documento_id` | `text` |
| `n` | `integer` |
| `valor` | `numeric` |
| `venc` | `date` |
| `pago` | `boolean` |

Tabela própria, e não `jsonb` dentro do documento, porque a previsão de 6 meses
percorre parcela por parcela procurando datas — isso quer linha, não JSON.

### `manutencao`

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK) |
| `item_id` | `text` — `oleo`, `velas`, `corrente`… **não restrito ao catálogo** |
| `veiculo_id` | `text` |
| `nome`, `oficina` | `text` |
| `intervalo_km`, `intervalo_meses`, `alerta_km`, `alerta_meses`, `ultimo_km` | `integer` |
| `ultima_data` | `date` |
| `personalizado` | `boolean` — item criado pela pessoa, não vindo do plano padrão |
| `origem_intervalo` | `text` — `padrao` ou `manual`, quando o intervalo vier do manual do veículo |

### `servicos` — o que foi feito, com ou sem custo

| Coluna | Tipo |
|---|---|
| `id` | `text` (PK) |
| `veiculo_id`, `item_id` | `text` |
| `data` | `date` |
| `km` | `integer` |
| `oficina`, `observacao` | `text` |
| `lancamento_id` | `text` — nulo quando não houve custo |

**Por que separado de `lancamentos`:** hoje o `registrarServico` só deixa rastro
se o serviço teve valor — ele cria um lançamento. Quem troca o próprio óleo, ou
faz revisão de cortesia, zera o contador e **não fica histórico nenhum**. Serviço
feito e dinheiro gasto são coisas diferentes; só às vezes acontecem juntas.

---

## Segurança

A URL do projeto e a chave `anon` chegam ao navegador e qualquer um lê com F12.
**A segurança não está na chave, está no RLS.**

Em cada tabela, quatro policies separadas — `select`, `insert`, `update`,
`delete` — para `authenticated`, filtrando `user_id = auth.uid()`. Nunca `all`,
nunca acesso para `anon`.

`with check` obrigatório em `insert` e `update`. Sem ele, um usuário logado pode
gravar linha com o `user_id` de outro.

**Storage tem policy própria**, separada das tabelas: cada pessoa só lê e escreve
dentro da pasta `fotos/{seu user_id}/`. Liberar a tabela não libera o bucket — é
o erro clássico, a linha grava e a foto não sobe.

---

## O que NÃO vai para o banco

- **Consulta à FIPE.** Fica no celular, sempre. O limite de 500/dia é por IP: no
  aparelho cada pessoa tem a sua cota; no servidor todo mundo divide uma só.
- **`combustiveis.json` e `ipva.json`.** Arquivos estáticos servidos pelo CDN do
  GitHub Pages. Usuários infinitos, custo zero.
- **Cache da FIPE, configuração de avisos, tema.** Preferência de aparelho.

---

---

## Planejado, não agora: manual do veículo com assistente

Pedido em 2026-09-13. **Não entra na primeira versão**, mas está aqui porque
muda decisões de armazenamento que é melhor tomar antes.

A pessoa envia o manual do próprio veículo e passa a poder perguntar
("qual a calibragem do pneu?", "qual óleo o manual manda?"). Isso **resolve por
outro caminho** o projeto de especificações por modelo que ficou pausado: em vez
de compilar 2.325 modelos à mão de fontes brasileiras que se mostraram geradas
por IA e erradas, cada um traz a fonte certa do próprio modelo e ano.

### O tamanho, medido

Manuais oficiais da Honda, tamanho real: CG 160 **8,0 MB**, XRE 300 **10,2 MB**,
CB 300F **40,1 MB**, PCX 160 **42,9 MB**.

Um manual pesa ~170× uma foto de veículo e ~800× os dados de texto de um
usuário. **No 1 GB grátis cabem 40 manuais.**

### A decisão: guardar o texto, jogar fora o PDF

Para responder pergunta não é preciso o PDF, e sim o texto dele — uns 250 KB
contra 25 MB. **Cem vezes menor**, e o mesmo 1 GB passa a comportar ~4.000.

Fluxo: a pessoa envia → uma Edge Function extrai o texto → guarda texto e
trechos indexados → **descarta o arquivo**. Para reler o manual, link do site da
fabricante, que é de graça e sempre atual.

### Tabelas, quando chegar a hora

- `manuais`: `id`, `veiculo_id`, `user_id`, `origem`, `paginas`, `texto`,
  `processado_em`
- `manual_trechos`: `id`, `manual_id`, `trecho text`, `embedding vector(768)`

`pgvector` (extensão `vector` 0.8.2, com hnsw) está disponível no Supabase. Com
busca por trecho, só os pedaços relevantes vão para o Gemini — diferença entre
centavos e reais por pergunta.

### A linha que não se cruza

Vai bater a tentativa de **deduplicar**: "500 pessoas têm CG 160, guardo um
manual só". Economiza 99% do espaço e **não pode ser feito**.

Guardar a cópia de cada pessoa, acessível só por ela, é como backup em nuvem.
Guardar uma cópia e servir para todos é **redistribuir obra de fabricante** —
outra coisa juridicamente. A duplicação é o preço da tranquilidade, e 250 KB por
pessoa é barato o bastante para pagar.

---

## O que falta decidir depois (não agora)

- Regra de conflito quando dois aparelhos editam o mesmo veículo. A proposta é
  o mais recente vence por campo, mas isso se decide com a sincronização na mão.
- Rotina de backup (`supabase db dump` agendado), obrigatória antes do primeiro
  usuário de verdade, porque o plano grátis não tem backup automático.
