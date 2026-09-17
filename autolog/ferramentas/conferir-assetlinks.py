#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Confere, do lado de fora, se a verificação da TWA vai passar.

O app instalado não reclama quando o `assetlinks.json` está errado: ele
simplesmente abre com uma barra de endereço em cima e vira um atalho de
navegador com ícone bonito. Este script faz, na mão, as mesmas perguntas que o
Chrome faz — para a resposta chegar antes do envio para a loja, e não depois.

Confere quatro coisas, na ordem em que elas costumam falhar:

  1. o arquivo responde 200 na RAIZ do domínio (não numa subpasta);
  2. sem redirecionamento — a especificação manda não seguir, e o
     redirecionamento de "www" é a armadilha clássica de domínio próprio;
  3. `Content-Type: application/json` — servir como text/plain reprova;
  4. contém o par pacote + dedo digital, com a relação certa.

USO
    python conferir-assetlinks.py --origem https://exemplo.com.br \
        --pacote br.com.exemplo.autolog --digital AA:BB:...:FF

    # só ver o que está publicado, sem comparar:
    python conferir-assetlinks.py --origem https://exemplo.com.br
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request

for fluxo in (sys.stdout, sys.stderr):
    try:
        fluxo.reconfigure(encoding='utf-8')
    except Exception:
        pass

RELACAO = 'delegate_permission/common.handle_all_urls'

OK, FALHA, AVISO = '  OK  ', 'FALHA ', 'AVISO '
problemas = []


def diz(marca, texto):
    print('[%s] %s' % (marca, texto))
    if marca == FALHA:
        problemas.append(texto)


class SemRedirecionar(urllib.request.HTTPRedirectHandler):
    """O Chrome não segue redirecionamento para buscar este arquivo. Seguir
       aqui esconderia justamente o defeito que queremos achar."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code,
                                     'redirecionou para %s' % newurl, headers, fp)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--origem', required=True, help='https://dominio (sem barra no fim)')
    p.add_argument('--pacote')
    p.add_argument('--digital')
    a = p.parse_args()

    origem = a.origem.rstrip('/')
    if not origem.startswith('https://'):
        sys.exit('A origem precisa ser https:// — o Chrome não verifica http.')
    url = origem + '/.well-known/assetlinks.json'
    print('Conferindo %s\n' % url)

    abridor = urllib.request.build_opener(SemRedirecionar)
    try:
        resp = abridor.open(urllib.request.Request(
            url, headers={'User-Agent': 'autolog-conferencia'}), timeout=20)
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308):
            diz(FALHA, 'redirecionamento (%s). O Chrome não segue: o arquivo '
                       'precisa responder 200 nesta URL exata.' % e.reason)
        else:
            diz(FALHA, 'resposta %s. O arquivo precisa ficar na RAIZ do '
                       'domínio, não dentro de uma subpasta do projeto.' % e.code)
        return encerrar()
    except Exception as e:
        diz(FALHA, 'não consegui buscar: %s' % e)
        return encerrar()

    diz(OK, 'responde 200, sem redirecionamento')

    tipo = (resp.headers.get('Content-Type') or '').split(';')[0].strip().lower()
    if tipo == 'application/json':
        diz(OK, 'Content-Type: application/json')
    else:
        diz(FALHA, 'Content-Type é %r; o Chrome exige application/json' % tipo)

    bruto = resp.read().decode('utf-8', 'replace')
    try:
        dados = json.loads(bruto)
    except ValueError as e:
        diz(FALHA, 'não é JSON válido: %s' % e)
        return encerrar()

    if not isinstance(dados, list) or not dados:
        diz(FALHA, 'a lista de declarações está vazia — nenhum app associado')
        return encerrar()
    diz(OK, '%d declaração(ões) publicada(s)' % len(dados))

    for d in dados:
        alvo = (d or {}).get('target', {})
        print('       · %s  %s' % (alvo.get('package_name', '?'),
                                   ', '.join(alvo.get('sha256_cert_fingerprints', []) or ['—'])))

    if not a.pacote or not a.digital:
        print('\n(sem --pacote e --digital, só listei o que está no ar)')
        return encerrar()

    alvo_digital = a.digital.strip().upper().replace(' ', '')
    if ':' not in alvo_digital and re.match(r'^[0-9A-F]{64}$', alvo_digital):
        alvo_digital = ':'.join(alvo_digital[i:i + 2] for i in range(0, 64, 2))

    achou_pacote = False
    for d in dados:
        alvo = (d or {}).get('target', {})
        if alvo.get('namespace') != 'android_app':
            continue
        if alvo.get('package_name') != a.pacote:
            continue
        achou_pacote = True
        if RELACAO not in (d.get('relation') or []):
            diz(FALHA, 'o pacote está lá, mas sem a relação %s' % RELACAO)
            break
        digitais = [x.strip().upper() for x in alvo.get('sha256_cert_fingerprints', [])]
        if alvo_digital in digitais:
            diz(OK, 'pacote e dedo digital conferem — a verificação deve passar')
        else:
            diz(FALHA, 'o dedo digital publicado não é o informado.\n'
                       '       Publicado: %s\n'
                       '       Esperado:  %s\n'
                       '       Lembre: vale o certificado de ASSINATURA do app '
                       '(o que o Google gera), não o de upload.'
                       % (', '.join(digitais) or '—', alvo_digital))
        break

    if not achou_pacote:
        diz(FALHA, 'nenhuma declaração para o pacote %s' % a.pacote)

    return encerrar()


def encerrar():
    print('')
    if problemas:
        print('%d problema(s). O app abriria com barra de endereço.' % len(problemas))
        sys.exit(1)
    print('Tudo certo.')


if __name__ == '__main__':
    main()
