# egarage

Workspace de projetos web pessoais — apps de garagem e custos de veículo, em
HTML/CSS/JS puro, sem build step.

## No ar

**Autolog:** <https://brennoc-bit.github.io/egarage/autolog/>

Publicado pelo GitHub Pages a partir da branch `main`. Fica no ar sozinho — não
depende de computador ligado nem de sessão de trabalho aberta. Todo `git push`
na `main` republica em um ou dois minutos.

## Projetos

| Pasta | O que é | Como rodar na máquina |
| --- | --- | --- |
| [`autolog/`](autolog) | **Autolog** — custos, revisões, documentos, seguro e manutenção de carro ou moto. Instalável como app (PWA), tudo calculado a partir dos lançamentos, persistência em `localStorage`. | `python -m http.server 5174` dentro da pasta → <http://127.0.0.1:5174> |
| [`car-cost-app/`](car-cost-app) | Simulador de custos do veículo: formulário de seis blocos e tela de resultado. | `python -m http.server 5173` dentro da pasta → <http://127.0.0.1:5173> |

O `autolog/` tem documentação própria em [`autolog/README.md`](autolog/README.md):
arquitetura, o que o app deliberadamente não inventa, mapa das telas do design
para as rotas e os desvios assumidos.

Os servidores locais são só para desenvolver. O app publicado não tem relação
com eles — pode ligar e desligar à vontade.

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

- **Kickpush** saiu daqui de vez: o app Expo/React Native, o protótipo web e o
  plano técnico foram movidos para pasta própria, fora deste workspace, e
  `kickpush/` segue no `.gitignore`. Se não aparecer ao clonar, é isso — não é
  arquivo perdido.
- `node_modules/`, saídas de build, `.expo/`, caches, logs e configuração local
  do Claude Code.
- Padrões de credenciais (`.env`, `*.pem`, `*.key`, chaves, `*credentials*.json`)
  estão bloqueados no `.gitignore` como rede de proteção. **Este repositório é
  público** — nada de segredo aqui dentro, nem em comentário de código.

## Nota sobre o servidor local

`python -m http.server` não manda `Cache-Control`, então o navegador continua
servindo o JS e o CSS antigos depois de você editar um arquivo. Se o
comportamento não mudar, recarregue forçado (`Ctrl+Shift+R`).
