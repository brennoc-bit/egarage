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
