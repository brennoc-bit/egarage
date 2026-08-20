# Motoreiro · Assistente da garagem

Implementação do canvas **`Garagem.dc.html`** (projeto Claude Design *Assistente pessoal veicular*)
como app web real, em HTML/CSS/JS puro — sem build, sem dependências.

```bash
python -m http.server 5174
```

Depois abra <http://127.0.0.1:5174/> (ou use `.claude/launch.json`, alvo `motoreiro`).

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `index.html` | Casca: cabeçalho, área de tela, navegação inferior |
| `ds/modernist.css` | Design system Modernist, cópia fiel do projeto de design (fonte da verdade dos tokens) |
| `styles.css` | Classes do canvas portadas para o app + casca responsiva |
| `js/util.js` | Helpers de DOM, datas ISO locais e formatação pt-BR |
| `js/store.js` | Modelo de dados, seed de demonstração, persistência e mutações |
| `js/calc.js` | Cálculos derivados: km, custo/km, diagnóstico, documentos, financiamento |
| `js/ui.js` | Peças visuais reutilizáveis, folha de formulário, toast, foto |
| `js/screens.js` | As telas |
| `js/app.js` | Roteador + ações |

## Das 7 telas do canvas para as rotas do app

| Canvas | Rota |
| --- | --- |
| 01 Início · Garagem | `inicio` |
| 02 Detalhe do veículo | `garagem` › aba **Resumo** (+ aba **Ficha**) |
| 03 Manutenção inteligente | `manutencao` (entra pela “Saúde geral” ou pela barra) |
| 04 IPVA · Seguro · Revisão | `docs` |
| 05 Custo por km | `custos` › aba **Custo/km** |
| 06 Simulação de financiamento | `custos` › aba **Financiamento** |
| 07 Histórico mensal | `garagem` › aba **Histórico** |

A barra inferior tem as cinco abas do design (Início · Garagem · Custos · Docs · Perfil).
`Perfil` não existia no canvas e foi acrescentada porque o app precisa de um lugar para
trocar de moto, editar dados e exportar/importar.

## O que é calculado (nada é estático)

- **Odômetro / km rodado** — a partir das leituras registradas em cada lançamento.
- **Custo/km e composição** — gasto real do período dividido pelo km real do período, agrupado por categoria.
- **Consumo médio** — km entre abastecimentos ÷ litros abastecidos (cai no consumo de referência enquanto não há dois abastecimentos).
- **Diagnóstico** — cada item cruza intervalo em km e/ou meses com o odômetro e a data do último serviço.
  Verde/amarelo/vermelho saem daí; o score é `ok + 0,65·atenção + 0,1·urgente`, limitado a 70 quando há item vencido.
- **Documentos** — parcelas do IPVA, licenciamento, apólice anual e revisão por km, com prazo, progresso e status por proximidade.
- **Financiamento** — Tabela Price ou SAC, com comparação de prazos e cenários salvos.

## O que dá para fazer

Registrar abastecimento (com km/L do tanque no toast) e lançamentos avulsos; atualizar odômetro;
registrar serviço feito (zera o contador do item); pagar parcela de IPVA/licenciamento e renovar apólice
(vira despesa no histórico); agendar oficina; adicionar/editar/excluir motos; trocar a foto da moto;
simular financiamento; exportar e importar a garagem em `.json`.

Tudo fica em `localStorage` (`motoreiro-v1`), por navegador. “Restaurar dados de demonstração”, no Perfil,
recria o exemplo — que é gerado sempre relativo à data de hoje.

## Desvios conscientes do canvas

- **Números do mock não foram copiados.** O canvas tem valores inconsistentes entre telas
  (ex.: gasto do mês R$ 386 na tela 01 e R$ 173 na 07). Aqui tudo vem dos lançamentos, então
  os números batem entre si — e mudam conforme você usa o app.
- **Barra de status do celular (9:41 · 5G · 100%)** foi removida: é artefato de mockup; no
  aparelho real quem desenha isso é o sistema.
- **“Enviar para banco”** virou **“Salvar simulação”**, que de fato guarda o cenário. O botão
  original não teria para onde enviar.
- **Foto da moto** é real (câmera/galeria, redimensionada no cliente e salva como data URL,
  com o `.grayscale` do DS). O hachurado do canvas ficou como estado vazio.
- **Cores de sinal** (verde `#2d8a4a` / âmbar `#e0a91b` / vermelho do acento) seguem a nota do
  canvas: entram só como sinal, fora da paleta mono-vermelha do Modernist.
