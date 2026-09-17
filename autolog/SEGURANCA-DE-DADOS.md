# Segurança de Dados — o que responder no Play Console

Checklist para preencher o formulário **Política do app › Segurança de dados**.
Cada resposta aqui foi conferida no código, não deduzida da intenção — a fonte é
o levantamento em `privacidade.html`, que por sua vez saiu de `grep` nas
chamadas externas de `js/`.

> **Isto não é aconselhamento jurídico.** Escrevi o que o app faz, com precisão.
> Se o Autolog virar empresa ou passar a receber pagamento, vale uma revisão por
> quem entenda de LGPD.

---

## Antes de tudo: dois endereços que o formulário pede

| Campo | Valor |
|---|---|
| **URL da política de privacidade** | `https://brennoc-bit.github.io/egarage/autolog/privacidade.html` |
| **URL para exclusão de conta** | a mesma, seção *Como apagar tudo* |

> Quando o domínio próprio estiver de pé, trocar os dois — e **não** apagar o
> endereço antigo do GitHub Pages, que pode estar em cache da revisão do Google.

> **Leia [`PUBLICAR-NA-PLAY.md`](PUBLICAR-NA-PLAY.md) antes de decidir o
> domínio.** A origem do app entra no pacote da TWA e **não pode mudar depois**
> sem apagar o que está guardado no aparelho de quem instalou. É a decisão de
> maior efeito do passo 7, e ela vem antes de qualquer envio.

O Google exige **dois caminhos** para excluir conta: dentro do app e por um
endereço web, para quem desinstalou. Os dois existem:

- **No app:** Perfil › Privacidade › *Apagar minha conta* (com confirmação
  digitada).
- **Fora:** e-mail documentado na política, respondido em até 15 dias.

---

## Respostas gerais

| Pergunta | Resposta | Por quê |
|---|---|---|
| O app coleta ou compartilha algum dos tipos de dados obrigatórios? | **Sim** | Conta, veículo e gastos |
| Todos os dados são criptografados em trânsito? | **Sim** | Tudo é HTTPS, sem exceção |
| Você oferece uma forma de excluir os dados? | **Sim** | Em dois caminhos, acima |
| Os dados são coletados de forma automática ou pelo usuário? | **Pelo usuário** | Nada é capturado sem a pessoa digitar ou tocar |

---

## Tipos de dados — o que marcar

### Informações pessoais

| Tipo | Coletado | Compartilhado | Obrigatório | Finalidade |
|---|---|---|---|---|
| **Nome** | Sim | Não | Sim | Funcionalidade · Gerenciamento de conta |
| **Endereço de e-mail** | Sim | Não | Sim | Funcionalidade · Gerenciamento de conta |
| **IDs de usuário** | Sim | Não | Sim | Funcionalidade · Gerenciamento de conta |
| **Outras informações** | Sim | Não | Não | Funcionalidade |

**"Outras informações"** é onde entram os dados do veículo que não têm categoria
própria no formulário: placa, Renavam, chassi, marca, modelo, ano, cor,
quilometragem e estado/município. Descrição sugerida:

> Dados do veículo (placa, Renavam, chassi, modelo, quilometragem) e a região
> onde o usuário dirige, usados para calcular custos, impostos e vencimentos.

### Informações financeiras

| Tipo | Coletado | Compartilhado | Obrigatório | Finalidade |
|---|---|---|---|---|
| **Outras informações financeiras** | Sim | Não | Não | Funcionalidade |

São os gastos que a pessoa registra — abastecimento, manutenção, seguro — e a
parcela do financiamento, que é dívida. **Não** há dado de pagamento: o app
nunca pede cartão, conta ou CPF.

### Fotos e vídeos

| Tipo | Coletado | Compartilhado | Obrigatório | Processamento efêmero |
|---|---|---|---|---|
| **Fotos** | Sim | **Sim** | Não | **Sim** |

Ponto de atenção, porque é contraintuitivo:

- A **foto do veículo** fica só no aparelho — essa não conta como coletada.
- A foto do **cupom, da bomba, do painel ou do documento**, quando a pessoa usa
  a leitura por foto, **é enviada ao Google Gemini**. Sai do aparelho, então
  conta como coletada *e* compartilhada, mesmo que não seja guardada por nós.
- Marcar **"processada de forma efêmera"**: a imagem vai, volta o texto lido, e
  nada é armazenado.
- É **opcional**: só acontece se a pessoa configurar a própria chave da API.

### Localização

| Tipo | Coletado | Compartilhado | Obrigatório | Processamento efêmero |
|---|---|---|---|---|
| **Localização aproximada** | Sim | **Sim** | Não | **Sim** |

- O app pede GPS com `enableHighAccuracy: false` — por isso **aproximada**, não
  precisa.
- As coordenadas vão ao **Nominatim (OpenStreetMap)** só para virar um nome de
  município; é isso que torna o campo *compartilhado*.
- **Guardamos apenas estado e município**, nunca as coordenadas.
- É opcional: dá para escolher o estado numa lista ou digitar o CEP.

### O que NÃO marcar

Nenhum destes existe no app, e é bom saber o porquê ao conferir:

- **Histórico de compras, informações de pagamento, pontuação de crédito** — o
  app não cobra nada e não pede cartão.
- **Mensagens, contatos, calendário, arquivos** — o app não lê nada disso. O
  arquivo `.ics` de vencimentos é *gerado* e baixado, nunca lido.
- **Atividade no app, histórico de navegação, anúncios** — não há analytics,
  não há rastreador, não há identificador de propaganda. Nenhum.
- **Registros de falhas e diagnóstico** — o app não envia nada. Erros ficam no
  console do aparelho.
- **Informações de saúde, condicionamento físico** — nada a ver.

---

## Se o revisor perguntar

**"Por que um app de veículo pede localização?"**
Para saber o preço médio do combustível da região (dados da ANP), a alíquota de
IPVA do estado e a taxa de licenciamento — que variam por unidade federativa. É
opcional e há duas alternativas sem GPS: lista de estados e busca por CEP.

**"Por que pede fotos?"**
Só quando o usuário quer poupar digitação: fotografar o cupom do posto para
preencher valor e litros, ou o documento do veículo para preencher placa e
Renavam. Sempre por toque explícito, e o app mostra o que leu para conferência
antes de salvar — nunca grava sozinho.

**"Vocês vendem ou usam os dados para publicidade?"**
Não. Não há terceiro recebendo dados para fins comerciais, não há SDK de
anúncio e não há rastreamento entre apps.

---

## Dois terceiros que sumiram (e por que isso não muda o formulário)

Em setembro de 2026, ao preparar a publicação, apareceu que **toda abertura do
app** buscava a fonte no Google Fonts e a biblioteca do Supabase no jsDelivr.
Os dois recebiam o IP e o navegador da pessoa, e **nenhum dos dois estava na
política de privacidade** — o levantamento do passo 6 varreu as chamadas de
`js/`, e estes moravam no `<head>` do `index.html` e num `@import` de CSS.

Os dois arquivos passaram a ser servidos pelo próprio app. Melhor que
acrescentar duas linhas à política: agora não há o que declarar.

**O formulário não muda por causa disso.** IP recebido por um CDN para entregar
um arquivo estático não é um dos tipos que o Google pede para declarar, e
"coletado" no vocabulário deles significa sair do aparelho e ser guardado. Se
fosse para marcar alguma coisa, seria antes desta mudança, não depois.

A lição fica registrada para a próxima revisão da política: **procurar também
no HTML e no CSS**, não só no JavaScript. Um `<link>` e um `@import` são
requisições de rede como qualquer outra.

---

## Pendências antes de enviar para revisão

- [ ] **Publicar a tela de consentimento do Google** (`Audience` › *Publicar
      app*). Em modo de teste, só os 100 e-mails da lista conseguem entrar — é a
      causa número um de "funciona pra mim e não pro meu amigo".
- [ ] **Ligar a proteção contra senha vazada** no Supabase
      (Authentication › Password settings). O advisor do projeto aponta isso
      como aberto; é um toggle, e vale conferir se o plano grátis cobre.
- [ ] **Rotina de backup** (`supabase db dump`) antes do primeiro usuário real —
      o plano grátis não tem backup automático.
- [ ] Trocar os dois endereços acima quando o domínio `.com.br` estiver de pé.
