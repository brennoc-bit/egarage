# egarage

Workspace de projetos web pessoais — apps de garagem e custos de veículo, em
HTML/CSS/JS puro, sem build step.

| Pasta / arquivo | O que é | Como rodar |
| --- | --- | --- |
| [`motoreiro/`](motoreiro) | Assistente de garagem de moto: custos, revisões, IPVA, seguro e diagnóstico de manutenção. Sete telas, dados calculados de verdade, persistência em `localStorage`. | `python -m http.server 5174` dentro da pasta → <http://127.0.0.1:5174> |
| [`car-cost-app/`](car-cost-app) | Simulador de custos do veículo: formulário de seis blocos e tela de resultado. | `python -m http.server 5173` dentro da pasta → <http://127.0.0.1:5173> |
| `kickpush.html` | Protótipo web do Kickpush. | Abrir direto no navegador. |
| `kickpush-plano-tecnico.html` | Plano técnico do Kickpush. | Abrir direto no navegador. |

O `motoreiro/` tem documentação própria em [`motoreiro/README.md`](motoreiro/README.md):
arquitetura, mapa das telas do design para as rotas e os desvios assumidos.

## Começando em uma máquina nova

Só é preciso ter **Git** e **Python 3** instalados. Não há `npm install`, não há
dependências — os apps são arquivos estáticos.

```bash
git clone https://github.com/brennoc-bit/egarage.git
```

Depois, abra a pasta e leia o [`PROGRESS.md`](PROGRESS.md) antes de mexer em
qualquer coisa: ele diz o que está pronto, o que está em andamento e quais são
os próximos passos.

## Rotina de trabalho entre as duas máquinas

O `PROGRESS.md` é a ponte de contexto entre os computadores — o histórico das
conversas não viaja junto, ele sim.

**Ao começar:**

```bash
git pull
```

**Ao terminar:** atualizar o `PROGRESS.md` com o que mudou, e então:

```bash
git add . && git commit -m "descrição do que foi feito" && git push
```

Se as duas máquinas editarem a mesma coisa sem dar `pull` antes, o `push` vai
ser recusado — nesse caso, `git pull --rebase` resolve antes de tentar de novo.

## O que fica fora deste repositório

- **`kickpush/`** (o app Expo/React Native) está no `.gitignore` porque tem
  repositório próprio. Se ele não aparecer ao clonar em outra máquina, é isso —
  não é arquivo perdido. Sincronize aquele projeto separadamente.
- `node_modules/`, saídas de build, `.expo/`, caches, logs e configuração local
  do Claude Code.
- Padrões de credenciais (`.env`, `*.pem`, `*.key`, chaves, `*credentials*.json`)
  estão bloqueados no `.gitignore` como rede de proteção. **Este repositório é
  público** — nada de segredo aqui dentro, nem em comentário de código.

## Nota sobre o servidor local

`python -m http.server` não manda `Cache-Control`, então o navegador continua
servindo o JS e o CSS antigos depois de você editar um arquivo. Se o
comportamento não mudar, recarregue forçado (`Ctrl+Shift+R`).
