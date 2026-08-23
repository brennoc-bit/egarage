# Autolog · Sua garagem, em ordem

App web para acompanhar custos, revisões, documentos e manutenção de **carro ou
moto**. HTML/CSS/JS puro — sem build, sem dependências.

Nasceu do canvas **`Garagem.dc.html`** (projeto Claude Design *Assistente
pessoal veicular*), na época em que se chamava Motoreiro e só cuidava de motos.

```bash
python -m http.server 5174
```

Depois abra <http://127.0.0.1:5174/> (ou use `.claude/launch.json`, alvo `autolog`).

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
| `js/screens.js` | As telas, incluindo o cadastro de veículo |
| `js/app.js` | Roteador + ações |
| `sw.js` | Service worker: rede primeiro, cache como reserva |
| `ferramentas/gerar-icones.py` | Gera os ícones PWA em Python puro |

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

Cinco abas — Início · Garagem (Resumo/Ficha/Histórico) · Custos (Custo/km +
Financiamento) · Docs · Perfil — mais duas rotas próprias: o Diagnóstico de
manutenção e o **Cadastro de veículo**, com foto, tipo e campos agrupados em
Identificação, Documentos, Uso, Financiamento e despesas anuais. A mesma tela
serve para editar a ficha depois.

Um **botão flutuante** no canto inferior direito registra abastecimento de
qualquer tela — é a ação mais repetida do app.

## O que o app não inventa

IPVA, seguro e licenciamento **são perguntados no cadastro**, nunca estimados:
os valores mudam por estado, por veículo e por seguradora, e um número chutado
seria pior que nenhum. Campo em branco simplesmente não é acompanhado.

O mesmo vale para o financiamento. O cadastro pergunta se o veículo está
quitado; se não estiver, pede o valor da parcela, quantas faltam e o dia do
vencimento. Com isso a tela inicial mostra o **custo por mês**: parcela +
despesas anuais diluídas em doze + a média real de combustível dos três meses
fechados anteriores.

A única coisa derivada é a próxima revisão, calculada pelo odômetro e pelo
intervalo do tipo de veículo — e sem preço associado.

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
