#!/usr/bin/env python3
"""Gera os ícones PNG do PWA sem depender de nenhuma lib externa.

Desenha a mesma marca de src/components/logo.tsx: a curva de projeção
subindo até um ponto, em vidro iridescente sobre ameixa escuro.

Roda com: python3 scripts/make-icons.py
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"

# Fundo: ameixa escuro, do topo pra base.
BG_TOP = (36, 22, 64)
BG_BOTTOM = (18, 9, 31)

# Paradas do gradiente iridescente, na diagonal (igual ao --grad do CSS).
STOPS = [
    (0.00, (0x6F, 0xE0, 0xE6)),
    (0.38, (0x7F, 0xA8, 0xF7)),
    (0.72, (0x9E, 0x6B, 0xF2)),
    (1.00, (0xCE, 0x8B, 0xE4)),
]

# Marca no mesmo grid 32x32 do SVG.
CURVE = ((4.5, 24.5), (11.0, 24.5), (16.5, 21.0), (20.5, 11.0))  # cúbica
DOT = (24.5, 7.5, 3.6)
STROKE = 4.0


def bezier(t):
    """Ponto da cúbica de Bézier em t."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = CURVE
    u = 1 - t
    a, b, c, d = u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t
    return (a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3)


# Amostra a curva em segmentos: distância ponto-a-polilinha é barata e o
# olho não distingue de uma curva analítica nesse tamanho.
SAMPLES = [bezier(i / 96) for i in range(97)]


def dist_polyline(px, py):
    melhor = float("inf")
    for i in range(len(SAMPLES) - 1):
        ax, ay = SAMPLES[i]
        bx, by = SAMPLES[i + 1]
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
        else:
            t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
            cx, cy = ax + t * dx, ay + t * dy
            d = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
        melhor = min(melhor, d)
    return melhor


def cor_gradiente(t):
    """Cor do gradiente na posição t (0..1), interpolando entre as paradas."""
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]
        t1, c1 = STOPS[i + 1]
        if t <= t1:
            f = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(c0[j] + (c1[j] - c0[j]) * f) for j in range(3))
    return STOPS[-1][1]


def render(size, inset):
    """inset = fração de borda livre (safe zone do ícone maskable)."""
    span = size * (1 - 2 * inset)
    origin = size * inset
    escala = span / 32.0

    def para_tela(x, y):
        return origin + x * escala, origin + y * escala

    meio_traco = (STROKE / 2) * escala
    dot_x, dot_y = para_tela(DOT[0], DOT[1])
    dot_r = DOT[2] * escala

    rows = []
    for py in range(size):
        f = py / (size - 1)
        bg = tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * f) for i in range(3))

        row = bytearray()
        row.append(0)  # filtro None
        for px in range(size):
            cx, cy = px + 0.5, py + 0.5

            # Coordenadas de volta ao grid 32x32 pra medir a distância.
            gx, gy = (cx - origin) / escala, (cy - origin) / escala
            d_traco = dist_polyline(gx, gy) * escala
            d_dot = ((cx - dot_x) ** 2 + (cy - dot_y) ** 2) ** 0.5 - dot_r

            # Antialias de um pixel na borda de cada forma.
            alpha = max(
                min(1.0, meio_traco + 0.5 - d_traco),
                min(1.0, 0.5 - d_dot),
            )

            if alpha <= 0:
                row.extend(bg)
            else:
                alpha = min(1.0, alpha)
                # O gradiente corre ao longo da marca (x de 4 a 28 no grid),
                # não na diagonal da tela — assim o ciano aparece de verdade
                # no começo do traço em vez de ficar fora da forma.
                fg = cor_gradiente((gx - 4.0) / 24.0)
                row.extend(round(bg[i] + (fg[i] - bg[i]) * alpha) for i in range(3))
        rows.append(bytes(row))

    return b"".join(rows)


def write_png(path, size, inset=0.0):
    raw = render(size, inset)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    print(f"  ✓ {path.name} ({len(png) // 1024} KB)")


if __name__ == "__main__":
    write_png(OUT / "icon-192.png", 192, inset=0.16)
    write_png(OUT / "icon-512.png", 512, inset=0.16)
    # Maskable precisa de mais folga: o sistema recorta em círculo/squircle.
    write_png(OUT / "icon-maskable-512.png", 512, inset=0.26)
    write_png(OUT / "apple-touch-icon.png", 180, inset=0.16)
