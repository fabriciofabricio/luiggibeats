#!/usr/bin/env python3
"""
ferramentas/gerar_poster_elenco.py
Gera uma imagem panorâmica de alta resolução com todos os 22 personagens oficiais
do jogo em estilo Visual Novel / Anime reunidos em um único pôster espetacular.
"""
import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
OUT_PATH = os.path.join(ROOT, "assets", "elenco_completo.png")

with open(os.path.join(ROOT, "data", "personagens.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

# Agrupamento temático dos 22 personagens oficiais com foto real
ROW_CONFIG = [
    ["luis", "fabricio", "mateus_buse", "vitor_witiuk", "maria_clara", "cecilia"],
    ["tiago_music", "tutuluiza", "caliandra", "luiza", "agatha", "marilis_docinho"],
    ["yohana", "yuri", "erion", "rayssa", "emily", "sol"],
    ["eloiza", "lara", "isabela_dominik", "matheus_neuman"]
]

char_map = {p["id"]: p for p in data["personagens"]}

CARD_W = 440
CARD_H = 650
GAP_X = 24
GAP_Y = 32
MARGIN_X = 60
TOP_BANNER = 210
BOTTOM_MARGIN = 80

TOTAL_COLS = 6
TOTAL_W = MARGIN_X * 2 + TOTAL_COLS * CARD_W + (TOTAL_COLS - 1) * GAP_X
TOTAL_H = TOP_BANNER + len(ROW_CONFIG) * CARD_H + (len(ROW_CONFIG) - 1) * GAP_Y + BOTTOM_MARGIN

print(f"Canvas size: {TOTAL_W} x {TOTAL_H}")

canvas = Image.new("RGBA", (TOTAL_W, TOTAL_H), (15, 17, 24, 255))
draw = ImageDraw.Draw(canvas)

# Fundo sutil quadriculado / grid tecnológico
for y in range(0, TOTAL_H, 60):
    draw.line([(0, y), (TOTAL_W, y)], fill=(24, 28, 42, 140), width=1)
for x in range(0, TOTAL_W, 60):
    draw.line([(x, 0), (x, TOTAL_H)], fill=(24, 28, 42, 140), width=1)

# Fontes
def get_font(size, bold=False):
    names = ["segoeui.ttf", "arial.ttf"]
    if bold:
        names = ["segoeuib.ttf", "arialbd.ttf"] + names
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

font_title = get_font(56, bold=True)
font_sub = get_font(24, bold=True)
font_name = get_font(26, bold=True)
font_role = get_font(18, bold=False)
font_tag = get_font(15, bold=True)

# Título do Banner
title_text = "LUIGGIBEATS: O DESTINO JÁ FOI ESCRITO"
sub_text = "ELENCO OFICIAL · 22 PERSONAGENS BASEADOS NAS FOTOS REAIS (ESTILO ANIME / VISUAL NOVEL)"
draw.text((TOTAL_W // 2, 68), title_text, fill=(245, 158, 11, 255), font=font_title, anchor="mm")
draw.text((TOTAL_W // 2, 130), sub_text, fill=(229, 231, 235, 255), font=font_sub, anchor="mm")
draw.line([(TOTAL_W // 2 - 580, 168), (TOTAL_W // 2 + 580, 168)], fill=(245, 158, 11, 190), width=3)

for row_idx, row_chars in enumerate(ROW_CONFIG):
    num_chars = len(row_chars)
    row_w = num_chars * CARD_W + (num_chars - 1) * GAP_X
    start_x = (TOTAL_W - row_w) // 2
    card_y = TOP_BANNER + row_idx * (CARD_H + GAP_Y)

    for col_idx, cid in enumerate(row_chars):
        card_x = start_x + col_idx * (CARD_W + GAP_X)
        p = char_map.get(cid, {})

        # Fundo do Card
        card_rect = [card_x, card_y, card_x + CARD_W, card_y + CARD_H]
        draw.rounded_rectangle(card_rect, radius=18, fill=(24, 26, 38, 255), outline=(55, 62, 85, 255), width=2)

        # Selo de capítulo
        cap_num = p.get("capituloPrimeiraAparicao", 0)
        cap_label = "Prólogo" if cap_num == 0 else f"Capítulo {cap_num}"
        draw.rounded_rectangle([card_x + 16, card_y + 14, card_x + 130, card_y + 40], radius=8, fill=(35, 41, 62, 255), outline=(75, 85, 115, 255), width=1)
        draw.text((card_x + 73, card_y + 27), cap_label, fill=(160, 175, 205, 255), font=font_tag, anchor="mm")

        # Sprite do Personagem
        sprite_path = os.path.join(SPRITES_DIR, cid, "cartoon.png")
        if os.path.exists(sprite_path):
            sp = Image.open(sprite_path).convert("RGBA")
            target_h = 530
            ratio = target_h / sp.height
            target_w = int(sp.width * ratio)
            sp_resized = sp.resize((target_w, target_h), Image.Resampling.LANCZOS)
            
            sp_x = card_x + (CARD_W - target_w) // 2
            sp_y = card_y + 35
            canvas.alpha_composite(sp_resized, (sp_x, sp_y))

        # Placa inferior de identificação
        plate_h = 105
        plate_y = card_y + CARD_H - plate_h - 2
        plate_overlay = Image.new("RGBA", (CARD_W - 4, plate_h), (14, 16, 24, 240))
        canvas.alpha_composite(plate_overlay, (card_x + 2, plate_y))

        # Friso dourado
        draw.line([(card_x + 2, plate_y), (card_x + CARD_W - 2, plate_y)], fill=(245, 158, 11, 200), width=2)

        # Nome e Papel
        name_str = p.get("nome", cid)
        role_str = p.get("papel", "")
        if len(role_str) > 38:
            role_str = role_str[:36] + "..."

        draw.text((card_x + CARD_W // 2, card_y + CARD_H - 70), name_str, fill=(255, 255, 255, 255), font=font_name, anchor="mm")
        draw.text((card_x + CARD_W // 2, card_y + CARD_H - 34), role_str, fill=(251, 191, 36, 255), font=font_role, anchor="mm")

canvas.save(OUT_PATH, "PNG")
print(f"Master poster salvo com sucesso em: {OUT_PATH}")
