#!/usr/bin/env python3
"""Gera os ícones PWA do Motoreiro.

Só biblioteca padrão — nada de instalar dependência para isso. Desenha um "M"
geométrico em Archivo-ish (traços retos, sem serifa) sobre o vermelho do
Modernist, com antisserrilhado por cobertura analítica.

Rodar de dentro de motoreiro/:  python ferramentas/gerar-icones.py
"""

import math
import os
import struct
import zlib

FUNDO = (0xEC, 0x30, 0x13)   # --color-accent
TINTA = (0xF3, 0xF2, 0xF2)   # --color-bg
DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icones")


def distancia_segmento(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    comp = dx * dx + dy * dy
    if comp == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / comp))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def segmentos_do_m(size, altura, largura):
    """Vértices do M, centralizados, em fração do lado do ícone."""
    meio_x, meio_y = size / 2, size / 2
    h = size * altura
    w = size * largura
    x0, x1 = meio_x - w / 2, meio_x + w / 2
    y0, y1 = meio_y - h / 2, meio_y + h / 2
    xc = meio_x
    yc = y0 + h * 0.72  # até onde desce o "V" central
    return [
        (x0, y1, x0, y0),   # perna esquerda
        (x0, y0, xc, yc),   # diagonal descendo
        (xc, yc, x1, y0),   # diagonal subindo
        (x1, y0, x1, y1),   # perna direita
    ]


def desenhar(size, altura=0.42, largura=0.46, traco=0.085):
    segs = segmentos_do_m(size, altura, largura)
    meia = size * traco / 2
    linhas = []
    for y in range(size):
        linha = bytearray()
        py = y + 0.5
        for x in range(size):
            px = x + 0.5
            d = min(distancia_segmento(px, py, *s) for s in segs)
            # cobertura: 1 dentro do traço, 0 fora, degradê de 1px na borda
            cob = max(0.0, min(1.0, meia + 0.5 - d))
            for canal in range(3):
                linha.append(round(FUNDO[canal] + (TINTA[canal] - FUNDO[canal]) * cob))
        linhas.append(bytes(linha))
    return linhas


def salvar_png(caminho, size, linhas):
    bruto = b"".join(b"\x00" + linha for linha in linhas)

    def bloco(tipo, dados):
        return (struct.pack(">I", len(dados)) + tipo + dados
                + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"
    png += bloco(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += bloco(b"IDAT", zlib.compress(bruto, 9))
    png += bloco(b"IEND", b"")
    with open(caminho, "wb") as f:
        f.write(png)
    return os.path.getsize(caminho)


def main():
    os.makedirs(DESTINO, exist_ok=True)
    # O maskable é recortado pelo sistema (círculo, squircle...): o desenho
    # precisa caber na zona segura central de 80%, então o M vai menor.
    tarefas = [
        ("icone-192.png", 192, dict()),
        ("icone-512.png", 512, dict()),
        ("icone-maskable-512.png", 512, dict(altura=0.30, largura=0.33, traco=0.062)),
        ("apple-touch-icon.png", 180, dict()),
    ]
    for nome, size, kw in tarefas:
        caminho = os.path.join(DESTINO, nome)
        tamanho = salvar_png(caminho, size, desenhar(size, **kw))
        print(f"{nome:28} {size}x{size}  {tamanho / 1024:.1f} KB")


if __name__ == "__main__":
    main()
