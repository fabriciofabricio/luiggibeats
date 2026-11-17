#!/usr/bin/env python3
"""
ferramentas/converter_sprites_png.py
Converte os sprites JPG gerados no diretório de artefatos para PNGs com fundo
transparente (flood-fill conectado às bordas, preservando brancos internos como
olhos, dentes e blusas brancas) em assets/sprites/<id>/cartoon.png.
"""
import os
from collections import deque
from PIL import Image

ARTIFACT_DIR = r"C:\Users\Fabricio\.gemini\antigravity\brain\a35f1a6f-ce28-46de-a95b-65744eac4ab2"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")

MAPA = {
    "luis": "luis_felipe_cartoon_v3_1794878166575.jpg",
    "fabricio": "fabricio_cartoon_1794878119119.jpg",
    "cecilia": "cecilia_sprite_v1_1794878196921.jpg",
    "eloiza": "eloiza_sprite_1794878197273.jpg",
    "caliandra": "caliandra_sprite_1794878193886.jpg",
    "luiza": "luiza_sprite_1794878204793.jpg",
    "agatha": "agatha_sprite_1794878196041.jpg",
    "yohana": "yohana_sprite_1794878190847.jpg",
    "tutuluiza": "tutuluiza_sprite_1794878238622.jpg",
    "yuri": "yuri_vn_sprite_1794878249270.jpg",
}

def remove_white_bg_floodfill(img_path, out_path, thresh=236):
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = bytearray(w * h)
    q = deque()

    def is_bg(r, g, b):
        return r >= thresh and g >= thresh and b >= thresh

    # Seed from all 4 borders
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    r, g, b, _ = px[nx, ny]
                    if is_bg(r, g, b):
                        visited[idx] = 1
                        q.append((nx, ny))

    # Soft edge feathering on 1px border adjacent to transparent pixels
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r + g + b) / 3.0
            if lum > 205:
                adj_trans = any(px[nx, ny][3] == 0 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
                if adj_trans:
                    new_a = max(0, min(255, int((242 - lum) * 5.5)))
                    px[x, y] = (r, g, b, new_a)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG")

def main():
    count = 0
    for char_id, fname in MAPA.items():
        src = os.path.join(ARTIFACT_DIR, fname)
        if not os.path.exists(src):
            print(f"AVISO: não encontrado {src}")
            continue
        out = os.path.join(SPRITES_DIR, char_id, "cartoon.png")
        remove_white_bg_floodfill(src, out)
        count += 1
        print(f"Convertido com transparência: {char_id} -> {out}")
    print(f"Total convertidos: {count}")

if __name__ == "__main__":
    main()
