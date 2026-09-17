#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Escreve o `.well-known/assetlinks.json` — o arquivo que tira a barra de
endereço de dentro do app da Play Store.

POR QUE ISTO EXISTE
Uma TWA é o Chrome sem cara de Chrome. Para ele aceitar esconder a barra de
endereço, o site precisa dizer publicamente "este app Android é meu", e o app
precisa dizer "este site é meu". O lado do site é este arquivo. Se ele estiver
faltando, com o dedo digital errado ou servido com o `Content-Type` errado, o
app **abre assim mesmo** — só que com uma barra de endereço em cima, parecendo
um atalho de navegador. É a falha número um de TWA, e ela é silenciosa.

O DEDO DIGITAL QUE VAI AQUI NÃO É O DA SUA CHAVE
Se você usar a Assinatura de apps do Google Play (o padrão, e recomendado), o
Google **reassina** o pacote com a chave dele. Quem chega no celular é a
assinatura do Google, não a sua. Então o SHA-256 daqui é o que aparece em:

    Play Console › Configuração › Integridade do app
      › Certificado da chave de assinatura do app  ← este
      › Certificado da chave de upload             ← NÃO é este

Pôr o de upload é o erro que faz tudo parecer certo e nada funcionar.

USO
    python gerar-assetlinks.py --pacote br.com.exemplo.autolog \
        --digital AA:BB:...:FF
    python gerar-assetlinks.py --limpar     # volta para a lista vazia
"""

import argparse
import io
import json
import os
import re
import sys

# Sem isto o console do Windows (cp1252) imprime "inválido" em vez de
# "inválido" — mensagem de erro ilegível é mensagem de erro perdida.
for fluxo in (sys.stdout, sys.stderr):
    try:
        fluxo.reconfigure(encoding='utf-8')
    except Exception:
        pass

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ALVO = os.path.join(RAIZ, '.well-known', 'assetlinks.json')

# 32 bytes em hexadecimal, separados por dois-pontos. O Play Console entrega
# exatamente nesse formato; aceito minúsculas e normalizo.
DIGITAL = re.compile(r'^([0-9A-F]{2}:){31}[0-9A-F]{2}$')


def normalizar(bruto):
    limpo = bruto.strip().upper().replace(' ', '')
    # Alguns lugares mostram sem os dois-pontos; reconstruo.
    if ':' not in limpo and re.match(r'^[0-9A-F]{64}$', limpo):
        limpo = ':'.join(limpo[i:i + 2] for i in range(0, 64, 2))
    if not DIGITAL.match(limpo):
        sys.exit('Dedo digital inválido: esperava 32 bytes em hexadecimal '
                 '(AA:BB:...), recebi %r' % bruto)
    return limpo


def escrever(conteudo):
    os.makedirs(os.path.dirname(ALVO), exist_ok=True)
    texto = json.dumps(conteudo, indent=2, ensure_ascii=False) + '\n'
    io.open(ALVO, 'w', encoding='utf-8', newline='\n').write(texto)
    print('escrito: %s' % ALVO)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--pacote', help='nome do pacote Android, ex.: br.com.exemplo.autolog')
    p.add_argument('--digital', help='SHA-256 do certificado de ASSINATURA do app')
    p.add_argument('--limpar', action='store_true', help='volta o arquivo para []')
    a = p.parse_args()

    if a.limpar:
        escrever([])
        return

    if not a.pacote or not a.digital:
        p.error('informe --pacote e --digital (ou --limpar)')

    if not re.match(r'^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$', a.pacote):
        sys.exit('Nome de pacote suspeito: %r. Use minúsculas, ao menos um '
                 'ponto, e nada de hífen — Java não aceita.' % a.pacote)

    escrever([{
        'relation': ['delegate_permission/common.handle_all_urls'],
        'target': {
            'namespace': 'android_app',
            'package_name': a.pacote,
            'sha256_cert_fingerprints': [normalizar(a.digital)],
        },
    }])
    print('Agora: commit, push, e confira no ar com conferir-assetlinks.py.')


if __name__ == '__main__':
    main()
