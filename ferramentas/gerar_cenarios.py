#!/usr/bin/env python3
"""
Gera cenários cinematográficos 1280x720 em PNG para todos os capítulos
que não possuem fotografia dedicada em assets/Cenarios/.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join("assets", "cenarios_gerados")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 720


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def vertical_gradient(top, bottom, w=W, h=H):
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r, g, b = lerp_color(top, bottom, t)
        for x in range(w):
            px[x, y] = (r, g, b, 255)
    return img


def radial_glow(base, cx, cy, radius, color, alpha=160, blur=42):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for step in range(5, 0, -1):
        rr = int(radius * (step / 5.0))
        a = int(alpha * (1.0 - step / 6.0))
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(color[0], color[1], color[2], a))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(base, layer)


def add_bokeh(base, count, palette, seed=42, y_max=H):
    rng = random.Random(seed)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x = rng.randint(0, W)
        y = rng.randint(0, y_max)
        r = rng.randint(4, 24)
        c = rng.choice(palette)
        a = rng.randint(25, 110)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(c[0], c[1], c[2], a))
    layer = layer.filter(ImageFilter.GaussianBlur(4))
    return Image.alpha_composite(base, layer)


def add_wet_reflections(base, horizon_y, light_xs, colors, seed=7):
    rng = random.Random(seed)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle((0, horizon_y, W, H), fill=(8, 11, 20, 175))
    for i, lx in enumerate(light_xs):
        col = colors[i % len(colors)]
        for dy in range(horizon_y + 8, H, 7):
            prog = (dy - horizon_y) / max(1, H - horizon_y)
            spread = int(12 + prog * 46)
            w_seg = rng.randint(max(6, spread // 2), spread + 14)
            dx = rng.randint(-6, 6)
            a = int((1 - prog * 0.65) * 95)
            d.rounded_rectangle((lx + dx - w_seg, dy, lx + dx + w_seg, dy + 4), radius=2, fill=(col[0], col[1], col[2], a))
    layer = layer.filter(ImageFilter.GaussianBlur(3))
    return Image.alpha_composite(base, layer)


def gen_cap0_kitchen():
    # Cozinha quente de madrugada fazendo cookies
    img = vertical_gradient((14, 10, 18), (44, 24, 16))
    img = radial_glow(img, 360, 420, 320, (251, 146, 60), alpha=150, blur=60)
    img = radial_glow(img, 900, 140, 260, (253, 224, 71), alpha=120, blur=55)

    d = ImageDraw.Draw(img, "RGBA")
    # Janela noturna de Curitiba ao fundo
    d.rectangle((720, 70, 1160, 380), fill=(10, 18, 36, 255), outline=(66, 44, 34, 255), width=12)
    d.line((940, 70, 940, 380), fill=(66, 44, 34, 255), width=8)
    d.line((720, 225, 1160, 225), fill=(66, 44, 34, 255), width=8)
    rng = random.Random(10)
    for _ in range(38):
        sx, sy = rng.randint(735, 1145), rng.randint(85, 365)
        d.ellipse((sx - 2, sy - 2, sx + 2, sy + 2), fill=(253, 230, 138, rng.randint(90, 220)))

    # Prateleira & luminárias pendentes
    for lx in (280, 560):
        d.line((lx, 0, lx, 150), fill=(28, 22, 20, 255), width=4)
        d.polygon([(lx - 38, 150), (lx + 38, 150), (lx + 54, 185), (lx - 54, 185)], fill=(52, 37, 28, 255))
        d.ellipse((lx - 20, 175, lx + 20, 198), fill=(254, 240, 138, 235))

    # Bancada e forno quente
    d.rectangle((0, 445, W, H), fill=(36, 23, 18, 255))
    d.rectangle((0, 440, W, 462), fill=(120, 82, 56, 255))
    # Forno iluminado com cookies dourando
    d.rounded_rectangle((170, 470, 520, 700), radius=14, fill=(24, 26, 32, 255), outline=(82, 82, 91, 255), width=5)
    d.rounded_rectangle((205, 515, 485, 675), radius=10, fill=(194, 65, 12, 225), outline=(251, 146, 60, 240), width=4)
    # Assadeira sobre a bancada com cookies
    d.rounded_rectangle((620, 398, 980, 448), radius=6, fill=(148, 163, 184, 255), outline=(203, 213, 225, 255), width=2)
    for cx in (675, 755, 835, 915):
        d.ellipse((cx - 24, 384, cx + 24, 412), fill=(180, 108, 48, 255), outline=(120, 63, 24, 255), width=2)
        for ox, oy in ((-8, -3), (6, 2), (0, -7)):
            d.ellipse((cx + ox - 3, 396 + oy - 3, cx + ox + 3, 396 + oy + 3), fill=(54, 28, 14, 255))

    img = radial_glow(img, 345, 595, 230, (251, 146, 60), alpha=125, blur=45)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_0.png"))


def gen_cap2_studio():
    # Quarto / FL Studio na quarentena com LEDs roxo & ciano
    img = vertical_gradient((10, 12, 28), (24, 16, 48))
    img = radial_glow(img, 420, 310, 340, (139, 92, 246), alpha=150, blur=65)
    img = radial_glow(img, 860, 300, 300, (56, 189, 248), alpha=130, blur=60)

    d = ImageDraw.Draw(img, "RGBA")
    # Painéis acústicos na parede
    for px in range(120, 1140, 110):
        for py in range(70, 320, 110):
            d.rectangle((px, py, px + 92, py + 92), fill=(22, 20, 44, 210), outline=(76, 29, 149, 120), width=2)

    # Mesa do setup + luz LED traseira
    d.rectangle((140, 465, 1140, 482), fill=(168, 85, 247, 220))
    d.rectangle((120, 476, 1160, H), fill=(17, 20, 34, 255))

    # Monitor Ultrawide (FL Studio) + Monitor Secundário (Discord)
    d.rounded_rectangle((280, 210, 760, 455), radius=12, fill=(15, 23, 42, 255), outline=(51, 65, 85, 255), width=6)
    # Timeline FL Studio colorida
    bar_cols = [(245, 158, 11), (56, 189, 248), (168, 85, 247), (52, 211, 153)]
    for row in range(6):
        y = 245 + row * 30
        c = bar_cols[row % len(bar_cols)]
        for seg in range(4):
            d.rounded_rectangle((310 + seg * 105, y, 395 + seg * 105, y + 18), radius=4, fill=(*c, 210))

    d.rounded_rectangle((795, 245, 1020, 455), radius=10, fill=(30, 31, 46, 255), outline=(88, 101, 242, 230), width=4)
    for row in range(4):
        y = 278 + row * 40
        d.ellipse((816, y, 838, y + 22), fill=(88, 101, 242, 240))
        d.rounded_rectangle((848, y + 4, 995, y + 18), radius=4, fill=(71, 85, 105, 220))

    # Microfone condensador
    d.line((180, 476, 240, 310), fill=(71, 85, 105, 255), width=8)
    d.line((240, 310, 305, 345), fill=(71, 85, 105, 255), width=6)
    d.rounded_rectangle((290, 325, 325, 390), radius=10, fill=(203, 213, 225, 255))

    img = add_bokeh(img, 24, [(168, 85, 247), (56, 189, 248)], seed=2, y_max=450)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_2.png"))


def gen_cap4_gym_parking():
    # Estacionamento noturno na academia + chuva + Subaru azul
    img = vertical_gradient((8, 14, 30), (19, 30, 56))
    img = radial_glow(img, 930, 250, 310, (56, 189, 248), alpha=130, blur=55)
    img = radial_glow(img, 260, 170, 220, (251, 191, 36), alpha=125, blur=50)

    d = ImageDraw.Draw(img, "RGBA")
    # Fachada iluminada da academia ao fundo
    d.rectangle((660, 160, 1220, 445), fill=(15, 23, 42, 255), outline=(51, 65, 85, 255), width=4)
    for gx in range(690, 1180, 120):
        d.rectangle((gx, 195, gx + 96, 435), fill=(30, 58, 138, 145), outline=(147, 197, 253, 180), width=3)
    # Poste de luz
    d.rectangle((252, 130, 268, 445), fill=(30, 41, 59, 255))
    d.ellipse((236, 118, 284, 146), fill=(254, 240, 138, 240))

    img = add_wet_reflections(img, 445, [260, 760, 1020], [(251, 191, 36), (56, 189, 248), (96, 165, 250)], seed=4)
    d = ImageDraw.Draw(img, "RGBA")

    # Silhueta do Subaru Legacy azul estacionado em destaque
    d.polygon([(210, 535), (275, 455), (465, 445), (565, 495), (620, 505), (620, 555), (195, 555)], fill=(29, 78, 216, 255), outline=(96, 165, 250, 255), width=3)
    d.polygon([(300, 462), (455, 456), (515, 495), (270, 495)], fill=(15, 23, 42, 235))
    d.ellipse((250, 528, 315, 593), fill=(15, 23, 42, 255), outline=(148, 163, 184, 255), width=5)
    d.ellipse((505, 528, 570, 593), fill=(15, 23, 42, 255), outline=(148, 163, 184, 255), width=5)
    d.ellipse((595, 508, 622, 528), fill=(254, 249, 195, 245))

    # Gotas de chuva
    rng = random.Random(44)
    for _ in range(95):
        rx, ry = rng.randint(0, W), rng.randint(0, H)
        d.line((rx, ry, rx - 5, ry + 18), fill=(191, 219, 254, 70), width=1)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_4.png"))


def gen_cap6_centro_3am():
    # Centro 3h da manhã + balada K-pop ao fundo + clima vela acesa
    img = vertical_gradient((8, 6, 22), (26, 14, 46))
    img = radial_glow(img, 640, 230, 320, (236, 72, 153), alpha=150, blur=60)
    img = radial_glow(img, 250, 320, 240, (245, 158, 11), alpha=135, blur=55)

    d = ImageDraw.Draw(img, "RGBA")
    # Prédios do Centro
    buildings = [(40, 120, 240), (255, 80, 460), (475, 140, 810), (825, 70, 1040), (1055, 110, 1250)]
    for x1, y1, x2 in buildings:
        d.rectangle((x1, y1, x2, 460), fill=(14, 16, 30, 255), outline=(45, 40, 75, 255), width=2)
    # Fachada K-Pop Club
    d.rectangle((500, 240, 780, 460), fill=(28, 16, 48, 255), outline=(244, 114, 182, 255), width=4)
    d.rounded_rectangle((535, 200, 745, 246), radius=8, fill=(219, 39, 119, 240), outline=(251, 207, 232, 255), width=3)

    img = add_wet_reflections(img, 460, [250, 640, 960], [(245, 158, 11), (236, 72, 153), (56, 189, 248)], seed=6)
    img = add_bokeh(img, 28, [(236, 72, 153), (245, 158, 11), (56, 189, 248)], seed=66, y_max=430)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_6.png"))


def gen_cap7_foodcourt():
    # Shopping / Praça de alimentação + olhos do gato ao fundo
    img = vertical_gradient((22, 18, 32), (48, 36, 52))
    img = radial_glow(img, 640, 160, 380, (251, 191, 36), alpha=120, blur=65)
    img = radial_glow(img, 260, 340, 220, (56, 189, 248), alpha=90, blur=55)

    d = ImageDraw.Draw(img, "RGBA")
    # Teto envidraçado em arco
    for x in range(0, W + 160, 160):
        d.line((W // 2, -60, x, 240), fill=(100, 116, 139, 110), width=3)
    # Quiosques luminosos
    for idx, kx in enumerate((110, 430, 760)):
        col = [(245, 158, 11), (239, 68, 68), (56, 189, 248)][idx]
        d.rectangle((kx, 220, kx + 270, 440), fill=(24, 24, 38, 255), outline=(*col, 210), width=3)
        d.rectangle((kx + 20, 240, kx + 250, 280), fill=(*col, 190))

    # Piso brilhante & mesas em silhueta
    d.rectangle((0, 440, W, H), fill=(20, 18, 28, 255))
    for tx in (200, 560, 920):
        d.rounded_rectangle((tx, 505, tx + 160, 528), radius=8, fill=(71, 85, 105, 255))
        d.rectangle((tx + 72, 528, tx + 88, 650), fill=(51, 65, 85, 255))

    # Silhueta discreta do Gato da Luiza num canto da sombra
    d.ellipse((1100, 392, 1152, 442), fill=(8, 8, 14, 255))
    d.polygon([(1106, 400), (1114, 376), (1126, 396)], fill=(8, 8, 14, 255))
    d.polygon([(1128, 396), (1142, 376), (1148, 402)], fill=(8, 8, 14, 255))
    d.ellipse((1114, 408, 1122, 415), fill=(250, 204, 21, 255))
    d.ellipse((1132, 408, 1140, 415), fill=(250, 204, 21, 255))

    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_7.png"))


def gen_cap11_dream():
    # Sonho lúcido nas nuvens sobre Curitiba
    img = vertical_gradient((24, 14, 58), (120, 53, 128))
    img = radial_glow(img, 640, 330, 360, (251, 191, 36), alpha=130, blur=70)
    img = radial_glow(img, 300, 200, 260, (56, 189, 248), alpha=125, blur=65)

    d = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(11)
    for _ in range(90):
        sx, sy = rng.randint(0, W), rng.randint(0, 420)
        r = rng.choice((1, 2, 2, 3))
        d.ellipse((sx - r, sy - r, sx + r, sy + r), fill=(255, 255, 255, rng.randint(100, 240)))

    # Estrada flutuante em perspectiva
    d.polygon([(600, 355), (680, 355), (1080, H), (200, H)], fill=(17, 24, 39, 230), outline=(192, 132, 252, 220), width=4)
    for step in range(8):
        y = 385 + step * 44
        w_dash = 4 + step * 2
        h_dash = 14 + step * 3
        d.rectangle((640 - w_dash, y, 640 + w_dash, y + h_dash), fill=(250, 204, 21, 220))

    # Nuvens fofas em camadas
    img = add_bokeh(img, 36, [(244, 114, 182), (167, 139, 250), (253, 224, 71)], seed=111, y_max=520)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_11.png"))


def gen_cap12_dark_gym():
    # Academia escura + Red Flag neon glow
    img = vertical_gradient((8, 6, 12), (24, 10, 22))
    img = radial_glow(img, 640, 290, 340, (220, 38, 38), alpha=145, blur=65)
    img = radial_glow(img, 240, 240, 210, (168, 85, 247), alpha=95, blur=55)

    d = ImageDraw.Draw(img, "RGBA")
    # Parede de espelhos
    for mx in range(80, 1200, 220):
        d.rectangle((mx, 80, mx + 200, 480), fill=(18, 22, 36, 200), outline=(239, 68, 68, 120), width=2)
    # Silhuetas de aparelhos / rack de agachamento
    for rx in (250, 410, 860, 1020):
        d.rectangle((rx, 180, rx + 16, 520), fill=(10, 12, 18, 255))
    d.rectangle((220, 285, 446, 297), fill=(148, 163, 184, 220))
    d.rectangle((830, 285, 1056, 297), fill=(148, 163, 184, 220))
    # Chão emborrachado escuro
    d.rectangle((0, 500, W, H), fill=(12, 12, 18, 255))
    img = add_bokeh(img, 18, [(239, 68, 68), (244, 63, 94)], seed=12, y_max=500)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_12.png"))


def gen_cap13_tnt_night():
    # Rua em frente ao TNT Café à noite (climão no estacionamento)
    img = vertical_gradient((10, 14, 26), (22, 24, 40))
    img = radial_glow(img, 640, 270, 300, (245, 158, 11), alpha=150, blur=60)
    img = radial_glow(img, 1020, 220, 220, (239, 68, 68), alpha=95, blur=55)

    d = ImageDraw.Draw(img, "RGBA")
    # Fachada TNT Café
    d.rectangle((380, 160, 900, 450), fill=(26, 20, 22, 255), outline=(217, 119, 6, 220), width=4)
    d.rectangle((420, 225, 860, 420), fill=(180, 83, 9, 175), outline=(253, 224, 71, 200), width=3)
    d.rounded_rectangle((515, 172, 765, 212), radius=8, fill=(245, 158, 11, 235))

    img = add_wet_reflections(img, 450, [210, 640, 1020], [(253, 224, 71), (245, 158, 11), (239, 68, 68)], seed=13)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_13.png"))


def gen_cap15_dawn():
    # Mirante de Curitiba ao amanhecer — Escolha que ainda não foi escrita
    img = vertical_gradient((15, 23, 54), (245, 158, 11))
    img = radial_glow(img, 640, 420, 440, (253, 224, 71), alpha=165, blur=75)
    img = radial_glow(img, 240, 180, 260, (129, 140, 248), alpha=95, blur=65)

    d = ImageDraw.Draw(img, "RGBA")
    # Skyline de Curitiba
    rng = random.Random(15)
    for x in range(0, W, 52):
        bh = rng.randint(430, 520)
        d.rectangle((x, bh, x + 46, 590), fill=(17, 24, 39, 235))
        for wy in range(bh + 14, 575, 18):
            if rng.random() > 0.55:
                d.rectangle((x + 12, wy, x + 22, wy + 8), fill=(253, 230, 138, 180))

    # Parapeito do mirante + folhas iluminadas
    d.rectangle((0, 575, W, H), fill=(15, 23, 42, 255))
    d.line((0, 575, W, 575), fill=(251, 191, 36, 200), width=4)
    img = add_bokeh(img, 32, [(253, 224, 71), (251, 146, 60), (244, 114, 182)], seed=1515, y_max=560)
    img.convert("RGB").save(os.path.join(OUT_DIR, "cap_15.png"))


if __name__ == "__main__":
    gen_cap0_kitchen()
    gen_cap2_studio()
    gen_cap4_gym_parking()
    gen_cap6_centro_3am()
    gen_cap7_foodcourt()
    gen_cap11_dream()
    gen_cap12_dark_gym()
    gen_cap13_tnt_night()
    gen_cap15_dawn()
    print("9 cenarios gerados com sucesso em", OUT_DIR)
