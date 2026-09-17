# `vendor/` — biblioteca de terceiro, servida por nós

Um arquivo só: `supabase.js`.

## Por que deixou de vir do CDN

Vinha de `cdn.jsdelivr.net`. O service worker **não guarda pedido de outra
origem** — por projeto, está escrito lá — então, sem rede, a biblioteca não
chegava. E sem ela `Conta.disponivel()` responde `false`, o que faz o app
parar na tela *"Sem conexão — não consegui carregar o serviço de contas"*.

Com a garagem inteira no `localStorage`, do outro lado do vidro.

Num app de carro isso acontece exatamente onde mais se precisa dele: o subsolo
do estacionamento. Era o defeito mais caro que a passagem para a Play Store
revelou — mais caro que o botão Voltar, porque não tem contorno.

Três ganhos de uma vez:

1. **abre sem rede**, que era o ponto;
2. **versão fixa**. Antes o endereço era `@2`, faixa aberta: qualquer `2.x`
   publicada no npm entrava no app de todo mundo sem ninguém apertar nada.
   Para um app de loja, isso é uma atualização não revisada em produção;
3. **um terceiro a menos** vendo o IP de quem abre o app — e um a menos para
   declarar na política de privacidade.

## O que está aqui

| | |
|---|---|
| Pacote | `@supabase/supabase-js` |
| Versão | **2.116.0** |
| Origem | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js` |
| Bytes | 218.318 |
| SHA-256 | `84ee9bf45695c1dd3ba1595b6bcfb0f09672434631351ffc8ebe9140545d5ff6` |
| Licença | MIT |

Conferido na adoção: byte a byte idêntico ao que o `@2` flutuante servia
naquele dia. Ou seja, a mudança foi de *endereço*, não de código — nada no
comportamento do app mudou junto.

## Para atualizar

```sh
curl -sS -o supabase.js \
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@NOVA.VERSAO/dist/umd/supabase.js"
sha256sum supabase.js     # anote aqui em cima
```

Depois: subir a versão em `sw.js` e **testar entrar, sair e sincronizar**.
Esta biblioteca é a porta da conta; quebrar aqui tranca todo mundo para fora.

## Isto não é um build step

A regra do `CLAUDE.md` é não introduzir build, framework nem `package.json`.
Continua valendo: o arquivo é UMD, entra por `<script src>` e o app segue
sendo estático, servido por `python -m http.server`. O que mudou foi de onde
o navegador o busca.
