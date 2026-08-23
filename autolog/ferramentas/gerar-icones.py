#!/usr/bin/env python3
"""Gera os ícones PWA do Autolog.

Só biblioteca padrão — nada de instalar dependência para isso.

O desenho é um mostrador com ponteiro: o instrumento que carro e moto têm em
comum, e que é o centro do app. Emblema geométrico de propósito, sem letra,
para não amarrar o ícone ao nome. Antisserrilhado por cobertura analítica.

Rodar de dentro de autolog/:  python ferramentas/gerar-icones.py
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


def cobertura(px, py, cx, cy, raio, traco, ponteiro, marcas):
    """Quanto do pixel é tinta: 0 = fundo, 1 = tinta cheia."""
    meia = traco / 2
    d = math.hypot(px - cx, py - cy)

    # Arco do mostrador: anel aberto embaixo (de 150° a 390°, sentido horário).
    ang = math.degrees(math.atan2(py - cy, px - cx)) % 360
    no_arco = ang >= 150 or ang <= 30
    cob = 0.0
    if no_arco:
        cob = max(cob, max(0.0, min(1.0, meia + 0.5 - abs(d - raio))))
    else:
        # Pontas arredondadas do arco, para não cortar em bisel.
        for a in (150, 30):
            ex = cx + raio * math.cos(math.radians(a))
            ey = cy + raio * math.sin(math.radians(a))
            cob = max(cob, max(0.0, min(1.0, meia + 0.5 - math.hypot(px - ex, py - ey))))

    # Ponteiro saindo do centro.
    cob = max(cob, max(0.0, min(1.0, meia + 0.5 - distancia_segmento(px, py, *ponteiro))))

    # Marcas do mostrador.
    for m in marcas:
        cob = max(cob, max(0.0, min(1.0, (traco * 0.42) + 0.5 - distancia_segmento(px, py, *m))))

    return cob


def desenhar(size, escala=1.0):
    cx = cy = size / 2
    raio = size * 0.29 * escala
    traco = size * 0.082 * escala

    # Ponteiro apontando para ~“três quartos”, na diagonal superior direita.
    ang = math.radians(-38)
    ponteiro = (cx, cy, cx + raio * 0.92 * math.cos(ang), cy + raio * 0.92 * math.sin(ang))

    # Três marcas curtas na borda: início, topo e fim da escala.
    marcas = []
    for a in (160, 270, 20):
        r1, r2 = raio * 1.20, raio * 1.42
        rad = math.radians(a)
        marcas.append((cx + r1 * math.cos(rad), cy + r1 * math.sin(rad),
                       cx + r2 * math.cos(rad), cy + r2 * math.sin(rad)))

    linhas = []
    for y in range(size):
        linha = bytearray()
        py = y + 0.5
        for x in range(size):
            cob = cobertura(x + 0.5, py, cx, cy, raio, traco, ponteiro, marcas)
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
    # precisa caber na zona segura central de 80%, então vai menor.
    tarefas = [
        ("icone-192.png", 192, 1.0),
        ("icone-512.png", 512, 1.0),
        ("icone-maskable-512.png", 512, 0.72),
        ("apple-touch-icon.png", 180, 1.0),
    ]
    for nome, size, escala in tarefas:
        caminho = os.path.join(DESTINO, nome)
        tamanho = salvar_png(caminho, size, desenhar(size, escala))
        print(f"{nome:28} {size}x{size}  {tamanho / 1024:.1f} KB")


if __name__ == "__main__":
    main()
