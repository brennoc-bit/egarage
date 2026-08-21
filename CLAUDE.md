# Instruções do projeto

Workspace `egarage` — projetos web em HTML/CSS/JS puro, sem build step.
Repositório: https://github.com/brennoc-bit/egarage (**público**).

O usuário trabalha em **dois computadores** e sincroniza tudo pelo GitHub.

## Antes de qualquer coisa

1. Ler o **`PROGRESS.md`** da raiz. Ele carrega o contexto que o histórico da
   conversa não carrega entre as máquinas: o que está pronto, o que está em
   andamento e os próximos passos.
2. Conferir se o repositório está atualizado (`git status`, `git pull`) antes de
   começar a editar — a outra máquina pode ter avançado.

## Ao terminar uma sessão de trabalho

Atualizar o `PROGRESS.md` **antes** de o usuário pedir commit — sem esperar que
ele lembre. Manter as três seções: o que já foi feito, o que está em andamento,
próximos passos; e atualizar a data no topo.

Ser honesto sobre o que não foi verificado: ele usa esse arquivo para decidir
por onde retomar, então "implementado mas não testado" precisa aparecer assim.

## Convenções

- **Idioma:** código, comentários, commits e documentação em **pt-BR**.
- **Sem dependências:** os apps são arquivos estáticos servidos com
  `python -m http.server <porta>`. Não introduzir build step, framework ou
  `package.json` sem o usuário pedir.
- **`kickpush/`** está no `.gitignore` de propósito — tem repositório próprio.
  Não versionar aqui, não sugerir absorver.
- **Repositório público:** nunca commitar credenciais, tokens ou dados pessoais,
  nem em comentário de código.
- **Commits:** mensagem descritiva em pt-BR explicando o *porquê*, não só o quê.
- **Cache do servidor local:** `python -m http.server` não manda
  `Cache-Control`; depois de editar JS/CSS o navegador serve a versão antiga.
  Ao verificar mudanças no navegador, forçar recarga — não concluir que o
  código está errado antes disso.

## Portas em uso

| App | Porta |
| --- | --- |
| `motoreiro/` | 5174 |
| `car-cost-app/` | 5173 |
