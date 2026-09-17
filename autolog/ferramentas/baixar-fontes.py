#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebaixa a Archivo do Google Fonts para `ds/fontes/`.

A fonte é servida pelo próprio app (ver `ds/fontes.css` para o porquê). Este
script existe para a atualização ser um comando, e não uma arqueologia.

Ele NÃO reescreve o `ds/fontes.css`: os `unicode-range` mudam raramente, e
sobrescrever um arquivo comentado à mão com saída de máquina custa mais do que
conferir. O script imprime os `unicode-range` recebidos para você comparar.

O subconjunto `vietnamese` é descartado de propósito — o app é pt-BR, e são
30 KB que ninguém baixaria por engano, mas que ficariam no repositório.

USO
    python baixar-fontes.py            # baixa e grava
    python baixar-fontes.py --conferir # só compara com o que já está lá
"""

import argparse
import hashlib
import io
import os
import re
import sys
import urllib.request

for fluxo in (sys.stdout, sys.stderr):
    try:
        fluxo.reconfigure(encoding='utf-8')
    except Exception:
        pass

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DESTINO = os.path.join(RAIZ, 'ds', 'fontes')

# Sem um User-Agent moderno o Google devolve `truetype`, não `woff2` — e o
# arquivo fica quatro vezes maior sem ninguém notar.
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

CSS = ('https://fonts.googleapis.com/css2'
       '?family=Archivo:wght@400;500;600;700;800&display=swap')

PULAR = {'vietnamese'}


def buscar(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=30).read()


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--conferir', action='store_true',
                   help='não grava; só diz se o que está no disco é o que o Google serve')
    a = p.parse_args()

    css = buscar(CSS).decode('utf-8')
    blocos = re.findall(r'/\* ([a-z-]+) \*/\s*@font-face \{(.*?)\}', css, re.S)
    if not blocos:
        sys.exit('O Google não devolveu @font-face. Mudou a API, ou o nome da família.')

    os.makedirs(DESTINO, exist_ok=True)
    iguais, mudaram, vistos = 0, [], set()

    # A Archivo do Google é variável: os cinco pesos pedidos apontam todos para
    # o mesmo arquivo por subconjunto. Sem este filtro, baixaríamos cinco vezes
    # cada um e imprimiríamos cinco linhas iguais.
    for sub, corpo in blocos:
        if sub in PULAR or sub in vistos:
            continue
        vistos.add(sub)
        url = re.search(r'url\((https://[^)]+)\)', corpo).group(1)
        faixa = re.search(r'unicode-range:\s*([^;]+);', corpo)
        nome = 'archivo-%s.woff2' % sub
        caminho = os.path.join(DESTINO, nome)

        dado = buscar(url)
        novo = hashlib.sha256(dado).hexdigest()
        antigo = None
        if os.path.exists(caminho):
            antigo = hashlib.sha256(open(caminho, 'rb').read()).hexdigest()

        if antigo == novo:
            iguais += 1
            print('= %-24s %6d bytes (sem mudança)' % (nome, len(dado)))
            continue

        mudaram.append(nome)
        if a.conferir:
            print('! %-24s MUDOU no Google (disco %s → servidor %s)'
                  % (nome, (antigo or 'ausente')[:12], novo[:12]))
        else:
            open(caminho, 'wb').write(dado)
            print('+ %-24s %6d bytes  sha256=%s' % (nome, len(dado), novo[:16]))
        if faixa:
            print('    unicode-range: %s' % faixa.group(1).strip())

    print('')
    if a.conferir:
        print('Sem novidade.' if not mudaram
              else '%d arquivo(s) mudaram. Rode sem --conferir e confira o '
                   'unicode-range em ds/fontes.css.' % len(mudaram))
    elif mudaram:
        print('Gravados %d. Confira o unicode-range acima contra ds/fontes.css, '
              'e suba a versão em sw.js.' % len(mudaram))
    else:
        print('Nada a fazer: %d arquivo(s) já estavam iguais.' % iguais)


if __name__ == '__main__':
    main()
