#!/usr/bin/env python3
"""Gera dados/veiculos.json — marcas e modelos de carro e moto.

A fonte é a API pública da tabela FIPE (parallelum.com.br). Os dados são
baixados AQUI, uma vez, e viram um arquivo estático embarcado no app. Assim o
autocompletar é instantâneo, funciona offline e não depende de terceiro no ar.

Por que não consultar a API em tempo real: sugestão a cada tecla digitada com
ida e volta de rede é lenta, quebra o uso offline do PWA e depende de um
serviço comunitário que pode sair do ar.

A FIPE devolve versões ("Civic Sedan LXR 2.0 Flexone 16V Aut. 4p"), não modelos.
Este script corta a versão e guarda só o nome do modelo ("Civic").

Rodar de dentro de autolog/:  python ferramentas/gerar-veiculos.py
Leva alguns minutos: são ~200 marcas, com pausa entre as chamadas para não
maltratar uma API gratuita.
"""

import json
import os
import re
import sys
import time
import unicodedata
from urllib.request import urlopen, Request

BASE = "https://parallelum.com.br/fipe/api/v1"
PAUSA = 0.35  # segundos entre chamadas
DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dados")

# Palavras que já são versão/carroceria/câmbio, não fazem parte do nome do modelo.
CORTE = {
    # carroceria
    "sedan", "hatch", "coupe", "cupe", "conversivel", "conversível", "perua", "sw",
    "picape", "pick-up", "pickup", "cabine", "furgao", "furgão", "van", "minivan",
    "wagon", "touring", "sportback", "fastback", "cross", "coupé",
    # câmbio e motor
    "aut", "aut.", "mec", "mec.", "manual", "automatico", "automático", "cvt",
    "flex", "flexone", "turbo", "tb", "tdi", "tsi", "gdi", "vvt", "diesel",
    "gasolina", "alcool", "álcool", "hibrido", "híbrido", "eletrico", "elétrico",
    "bluemotion", "ecoboost", "firefly", "multiair",
    # acabamento
    "ex", "exl", "exs", "lx", "lxl", "lxr", "lxs", "dx", "se", "sel", "sl", "sv",
    "xei", "xls", "xlt", "xl", "gls", "glx", "gl", "gt", "gts", "gti", "lt", "ltz",
    "ls", "sport", "premium", "premier", "highline", "comfortline", "trendline",
    "advance", "style", "attractive", "dynamic", "precision", "titanium", "ghia",
    "platinum", "limited", "elite", "touring", "adventure", "trekking", "rallye",
    "night", "black", "plus", "pro", "max", "life", "drive", "connect", "attitude",
    "abs", "cbs", "cb", "std", "custom", "special", "edition",
}

RE_ESPEC = re.compile(r"\d|^[ivx]+$", re.I)   # tem dígito, ou é algarismo romano
RE_CILINDRADA = re.compile(r"^\d{2,4}[A-Za-z]?$")  # 125, 300, 500F — nome de moto
RE_MOTOR = re.compile(r"^\d\.\d")             # 1.0, 2.0 — aí é versão

# Primeiras palavras que pedem a seguinte para o nome fazer sentido.
PREFIXOS = {"grand", "gran", "new", "novo", "nova", "land", "range", "alfa",
            "aston", "mini", "great", "little"}


def sem_acento(txt):
    return "".join(c for c in unicodedata.normalize("NFD", txt) if unicodedata.category(c) != "Mn")


def nome_do_modelo(versao):
    """Corta a versão e devolve só o modelo.

    'Civic Sedan LXR 2.0'  -> 'Civic'
    'CG 160 Titan'         -> 'CG 160'   (em moto a cilindrada é parte do nome)
    'Grand Siena ESSENCE'  -> 'Grand Siena'
    'Compass Longitude'    -> 'Compass'  (Longitude é acabamento)
    """
    palavras = []
    for bruta in versao.replace("/", " ").split():
        limpa = bruta.strip(".,-").strip()
        if not limpa:
            continue
        chave = sem_acento(limpa).lower()

        if not palavras:                      # a primeira palavra sempre entra
            palavras.append(limpa)
            continue

        # Segunda palavra: só entra em dois casos claros.
        if RE_CILINDRADA.match(limpa) and not RE_MOTOR.match(limpa):
            palavras.append(limpa)            # CG 160, XRE 300, Ninja 400
        elif sem_acento(palavras[0]).lower() in PREFIXOS and not RE_ESPEC.search(limpa) \
                and chave not in CORTE:
            palavras.append(limpa)            # Grand Siena, Land Rover
        break                                 # o resto é versão

    return " ".join(palavras).strip(" .-")


def arrumar_caixa(nome):
    """FIPE mistura 'CITY' e 'Civic'. Sigla continua sigla; palavra vira Palavra."""
    partes = []
    for p in nome.split():
        if p.isdigit():
            partes.append(p)
        elif "-" in p:
            partes.append("-".join(t if t.isdigit() else (t.upper() if len(t) <= 3 else t.capitalize())
                                   for t in p.split("-")))
        elif any(c.isdigit() for c in p):
            partes.append(p.upper())          # CB300, MT09
        elif p.isupper() and len(p) <= 3:
            partes.append(p)                  # CG, XRE, BIZ — sigla de verdade
        else:
            partes.append(p.capitalize())     # CITY -> City, Civic -> Civic
    return " ".join(partes)


# A FIPE escreve "GM - Chevrolet" e "VW - VolksWagen".
RE_PREFIXO_MARCA = re.compile(r"^[A-Z]{2,4}\s*-\s*")
MARCA_CORRIGIDA = {
    "volkswagen": "Volkswagen", "chevrolet": "Chevrolet", "kia motors": "Kia",
    "citroen": "Citroën", "mercedes-benz": "Mercedes-Benz",
}


def arrumar_marca(nome):
    limpo = RE_PREFIXO_MARCA.sub("", nome).strip()
    return MARCA_CORRIGIDA.get(sem_acento(limpo).lower(), limpo)


def buscar(caminho, tentativas=3):
    url = f"{BASE}/{caminho}"
    for n in range(tentativas):
        try:
            req = Request(url, headers={"User-Agent": "autolog-gerador/1.0"})
            with urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if n == tentativas - 1:
                print(f"  ! falhou {caminho}: {e}", file=sys.stderr)
                return None
            time.sleep(1.5 * (n + 1))
    return None


def coletar(tipo_api):
    marcas = buscar(f"{tipo_api}/marcas")
    if not marcas:
        return {}
    saida = {}
    for i, marca in enumerate(marcas, 1):
        nome_marca = arrumar_marca(arrumar_caixa(marca["nome"]) if marca["nome"].isupper() else marca["nome"])
        dados = buscar(f"{tipo_api}/marcas/{marca['codigo']}/modelos")
        time.sleep(PAUSA)
        if not dados or not dados.get("modelos"):
            continue
        modelos = set()
        for m in dados["modelos"]:
            nome = nome_do_modelo(m["nome"])
            if len(nome) >= 2:
                modelos.add(arrumar_caixa(nome))
        if modelos:
            saida[nome_marca] = sorted(modelos, key=lambda s: s.lower())
        print(f"  [{i}/{len(marcas)}] {nome_marca}: {len(modelos)} modelos")
    return saida


def main():
    # Console do Windows costuma vir em codepage que não encoda "Citroën".
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    os.makedirs(DESTINO, exist_ok=True)
    resultado = {}
    for tipo_app, tipo_api in (("carro", "carros"), ("moto", "motos")):
        print(f"\n== {tipo_app} ==")
        resultado[tipo_app] = coletar(tipo_api)

    caminho = os.path.join(DESTINO, "veiculos.json")
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

    kb = os.path.getsize(caminho) / 1024
    for tipo in resultado:
        marcas = len(resultado[tipo])
        modelos = sum(len(v) for v in resultado[tipo].values())
        print(f"{tipo}: {marcas} marcas, {modelos} modelos")
    print(f"gravado em dados/veiculos.json ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
