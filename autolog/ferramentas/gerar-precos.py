#!/usr/bin/env python3
"""Gera dados/combustiveis.json — preço médio de combustível por município e UF.

A fonte é o Levantamento de Preços de Combustíveis da ANP, publicado toda
semana em planilha .xlsx no portal gov.br. É dado oficial e gratuito.

POR QUE UM ARQUIVO ESTÁTICO, E NÃO CONSULTA AO VIVO
O gov.br não manda cabeçalho CORS: um navegador simplesmente não consegue
baixar a planilha a partir do app. Sem servidor próprio, embarcar o resultado
é o único caminho — e ainda sai de graça em uso offline.

O QUE A PLANILHA COBRE, DE FATO
A pesquisa alcança pouco menos de 400 municípios (as capitais e as cidades
maiores), não os 5.570 do país. Por isso o JSON guarda os três níveis —
município, estado e região — e o app cai de um para o outro, dizendo na tela
qual deles está mostrando. Fingir precisão municipal que não existe seria pior
que mostrar a média do estado.

Rodar de dentro de autolog/:  python ferramentas/gerar-precos.py
Leva poucos segundos. Requer só a biblioteca padrão do Python.
"""

import io
import json
import os
import re
import sys
import unicodedata
import zipfile
from urllib.request import urlopen, Request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PAGINA = ("https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/"
          "precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas")
DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dados")
UA = {"User-Agent": "Mozilla/5.0 (autolog/gerar-precos)"}

# Nome da ANP -> chave curta no app. O que não está aqui é descartado.
PRODUTOS = {
    "GASOLINA COMUM": "gasolina",
    "GASOLINA ADITIVADA": "gasolinaAditivada",
    "ETANOL HIDRATADO": "etanol",
    "OLEO DIESEL": "diesel",
    "ÓLEO DIESEL": "diesel",
    "OLEO DIESEL S10": "dieselS10",
    "ÓLEO DIESEL S10": "dieselS10",
    "GNV": "gnv",
}

UFS = {
    "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA",
    "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO",
    "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG", "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR",
    "PERNAMBUCO": "PE", "PIAUI": "PI", "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", "RONDONIA": "RO",
    "RORAIMA": "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP",
    "SERGIPE": "SE", "TOCANTINS": "TO",
}


def baixar(url):
    with urlopen(Request(url, headers=UA), timeout=90) as r:
        return r.read()


def sem_acento(t):
    t = unicodedata.normalize("NFD", str(t))
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def chave(t):
    """Município normalizado: sem acento, sem pontuação, maiúsculo."""
    return re.sub(r"[^A-Z0-9 ]", "", sem_acento(t).upper()).strip()


def ultima_planilha():
    """Descobre o link mais recente na página da ANP.

    Os nomes de arquivo não são consistentes (às vezes `_`, às vezes `-` entre
    as datas), então ordenamos pela data que está dentro do nome, e não pela
    ordem em que aparecem na página.
    """
    html = baixar(PAGINA).decode("utf-8", "replace")
    links = set(re.findall(r'href="([^"]*resumo_semanal_lpc[^"]*\.xlsx)"', html))
    if not links:
        raise SystemExit("Nenhum link de planilha encontrado — a página da ANP mudou de formato.")

    def data_do_nome(u):
        d = re.findall(r"(\d{4})-(\d{2})-(\d{2})", u)
        return d[-1] if d else ("0000", "00", "00")

    return sorted(links, key=data_do_nome)[-1]


# ── Leitura de .xlsx sem dependência externa ────────────────────────────────
# Um .xlsx é um zip de XML. Como só precisamos de células de texto e número,
# um parser mínimo evita trazer openpyxl para um projeto que não tem
# dependências.

def planilha(xlsx_bytes, nome_aba):
    z = zipfile.ZipFile(io.BytesIO(xlsx_bytes))
    wb = z.read("xl/workbook.xml").decode("utf-8", "replace")
    abas = re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="rId(\d+)"', wb)
    idx = next((i for n, i in abas if n.upper() == nome_aba.upper()), None)
    if idx is None:
        raise SystemExit(f"Aba {nome_aba} não existe na planilha da ANP.")

    textos = [
        "".join(re.findall(r"<t[^>]*>(.*?)</t>", s, re.S))
        for s in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8", "replace"), re.S)
    ]
    xml = z.read(f"xl/worksheets/sheet{idx}.xml").decode("utf-8", "replace")

    for linha in re.findall(r"<row[^>]*>(.*?)</row>", xml, re.S):
        celulas = []
        for m in re.finditer(r"<c\b([^>]*)>(.*?)</c>|<c\b([^>]*)/>", linha, re.S):
            attrs = m.group(1) or m.group(3) or ""
            dentro = m.group(2) or ""
            tipo = re.search(r't="([^"]+)"', attrs)
            v = re.search(r"<v>(.*?)</v>", dentro, re.S)
            valor = v.group(1) if v else ""
            if tipo and tipo.group(1) == "s" and valor:
                valor = textos[int(valor)]
            celulas.append(valor)
        yield celulas


def numero(t):
    try:
        return round(float(t), 3)
    except (TypeError, ValueError):
        return None


# As abas não usam as mesmas colunas: MUNICIPIOS e ESTADOS têm uma coluna a
# mais (região/estado) antes do produto. Daí os índices virem por parâmetro.
def coletar(linhas, col_local, col_produto, col_preco, col_uf=None):
    """{local: {produto: preço}} a partir das linhas de uma aba."""
    fora = {}
    for c in linhas:
        if len(c) <= col_preco or not c[col_local]:
            continue
        produto = PRODUTOS.get(c[col_produto].strip().upper())
        preco = numero(c[col_preco])
        if not produto or preco is None:
            continue
        local = chave(c[col_local])
        if col_uf is not None:
            local = f"{UFS.get(chave(c[col_uf]), chave(c[col_uf]))}|{local}"
        fora.setdefault(local, {})[produto] = preco
    return fora


def main():
    url = ultima_planilha()
    print("Planilha:", url.rsplit("/", 1)[-1])
    dados = baixar(url)
    print(f"{len(dados) / 1024:.0f} KB baixados")

    municipios = coletar(list(planilha(dados, "MUNICIPIOS")), 3, 4, 7, col_uf=2)
    estados_brutos = coletar(list(planilha(dados, "ESTADOS")), 3, 4, 7)
    regioes = coletar(list(planilha(dados, "REGIOES")), 2, 3, 6)
    brasil = coletar(list(planilha(dados, "BRASIL")), 2, 3, 6)

    # Estados vêm por extenso ("SAO PAULO"); o app trabalha com sigla.
    estados = {UFS.get(k, k): v for k, v in estados_brutos.items() if k in UFS}

    # Qual região cada UF pertence — para a última queda antes da média nacional.
    regiao_da_uf = {}
    for c in planilha(dados, "ESTADOS"):
        if len(c) > 3 and chave(c[3]) in UFS:
            regiao_da_uf[UFS[chave(c[3])]] = chave(c[2])

    semana = re.findall(r"(\d{4}-\d{2}-\d{2})", url)[-2:]

    saida = {
        "fonte": "ANP · Levantamento de Preços de Combustíveis",
        "url": url,
        "semana": semana,
        "regiaoDaUf": regiao_da_uf,
        "brasil": next(iter(brasil.values()), {}),
        "regioes": regioes,
        "estados": estados,
        "municipios": municipios,
    }

    os.makedirs(DESTINO, exist_ok=True)
    caminho = os.path.join(DESTINO, "combustiveis.json")
    with io.open(caminho, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{len(municipios)} municípios, {len(estados)} estados, {len(regioes)} regiões")
    print(f"semana {semana[0]} a {semana[1]}")
    print(f"{caminho} — {os.path.getsize(caminho) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
