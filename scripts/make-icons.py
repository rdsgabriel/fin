#!/usr/bin/env python3
"""Gera os ícones PNG do PWA sem depender de nenhuma lib externa.

O desenho é o mesmo do gráfico da tela inicial: uma linha subindo.
Roda com: python3 scripts/make-icons.py
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"

# Gradiente azul da Apple, do topo pra base.
TOP = (10, 132, 255)
BOTTOM = (0, 82, 212)

# Linha do gráfico em coordenadas normalizadas (0..1), y=0 embaixo.
PATH = [(0.10, 0.30), (0.32, 0.46), (0.50, 0.38), (0.68, 0.62), (0.90, 0.78)]


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def render(size, inset):
    """inset = fração da borda deixada livre (safe zone do ícone maskable)."""
    span = size * (1 - 2 * inset)
    origin = size * inset

    pts = [(origin + x * span, origin + (1 - y) * span) for x, y in PATH]
    half = size * 0.052 / 2

    rows = []
    for y in range(size):
        # Fundo: interpolação linear entre as duas pontas do gradiente.
        f = y / (size - 1)
        bg = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * f) for i in range(3))

        row = bytearray()
        row.append(0)  # filtro None
        for x in range(size):
            d = min(
                dist_to_segment(x + 0.5, y + 0.5, *pts[i], *pts[i + 1])
                for i in range(len(pts) - 1)
            )
            # Alpha suave na borda da linha: um pixel de antialias.
            alpha = max(0.0, min(1.0, half + 0.5 - d))
            if alpha <= 0:
                row.extend(bg)
            else:
                row.extend(round(bg[i] + (255 - bg[i]) * alpha) for i in range(3))
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
    write_png(OUT / "icon-192.png", 192, inset=0.0)
    write_png(OUT / "icon-512.png", 512, inset=0.0)
    # Maskable precisa de folga: o sistema recorta em círculo/squircle.
    write_png(OUT / "icon-maskable-512.png", 512, inset=0.18)
    write_png(OUT / "apple-touch-icon.png", 180, inset=0.06)
