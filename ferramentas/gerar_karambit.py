#!/usr/bin/env python3
"""
ferramentas/gerar_karambit.py

Gera data/karambit_modelo.js (malha + textura) a partir da karambit 3D de JoshAS
(OpenGameArt, https://opengameart.org/content/karambit-knife, licença CC-BY 3.0).

Alterações nossas: lâmina afinada, orientação/escala pro jogo e textura pintada aqui
(aço escovado acompanhando a curva da lâmina, fio polido com linha de afiação, cabo de G10 com parafusos).

Uso: python ferramentas/gerar_karambit.py <karambit.json>
  (karambit.json = malha extraída do karambit3.blend: [{"v": [[x,y,z]...], "f": [[i,j,k,l]...], "obmat": [...]}])
"""
import os, sys, json, io, base64, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(sys.argv[1]))[0]
V = np.array(d['v'], dtype=float)
V[:, 2] *= d['obmat'][10]  # escala do objeto no eixo da espessura
F = d['f']

# ---------------- Partes: lâmina x cabo (linha da guarda) ----------------
P0 = np.array([-2.67, 1.88])
NG = np.array([1.46, 2.09])
ANEL = np.array([4.3, 3.3])
GUARDA = np.array([-1.6, 1.1])
C_CURVA = np.array([1.2, -2.6])  # centro aproximado da curva da lâmina
eh_lamina_v = ((V[:, :2] - P0) @ NG) < 0
z_meio = -0.05
# Lâmina bem mais fina que o cabo
V[eh_lamina_v, 2] = z_meio + (V[eh_lamina_v, 2] - z_meio) * 0.45

# ---------------- Triângulos e grupos ----------------
tris_lam, tris_cabo = [], []
for f in F:
    c = V[f, :2].mean(0)
    lam = ((c - P0) @ NG) < 0
    for k in range(1, len(f) - 1):
        (tris_lam if lam else tris_cabo).append((f[0], f[k], f[k + 1]))

# ---------------- Textura (projeção plana XY) ----------------
TAM = 512
xmin, xmax = V[:, 0].min() - 0.15, V[:, 0].max() + 0.15
ymin, ymax = V[:, 1].min() - 0.15, V[:, 1].max() + 0.15
S = max(xmax - xmin, ymax - ymin)
def px(x, y):
    return ((x - xmin) / S * TAM, (ymax - y) / S * TAM)
def uv(x, y):
    return ((x - xmin) / S, (y - (ymax - S)) / S)

mask_lam = Image.new('L', (TAM, TAM), 0)
mask_cabo = Image.new('L', (TAM, TAM), 0)
for tris, m in ((tris_lam, mask_lam), (tris_cabo, mask_cabo)):
    dr = ImageDraw.Draw(m)
    for t in tris:
        dr.polygon([px(*V[i, :2]) for i in t], fill=255)
# folga pros lados (as faces laterais pegam a borda)
mask_lam = mask_lam.filter(ImageFilter.MaxFilter(5))
mask_cabo = mask_cabo.filter(ImageFilter.MaxFilter(5))
ML = np.array(mask_lam) > 0
MC = np.array(mask_cabo) > 0

rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:TAM, 0:TAM]
wx = xmin + (xx + 0.5) / TAM * S
wy = ymax - (yy + 0.5) / TAM * S

# Aço escovado: riscos seguindo arcos em volta do centro da curva
r = np.hypot(wx - C_CURVA[0], wy - C_CURVA[1])
ruido1 = rng.normal(0, 1, 4096)
ruido1 = np.convolve(ruido1, np.ones(3) / 3, mode='same')
riscos = ruido1[(r * 380).astype(int) % 4096]
ang = np.arctan2(wy - C_CURVA[1], wx - C_CURVA[0])
fino = rng.normal(0, 1, (TAM, TAM))
aco = 172 + riscos * 9 + fino * 3 + np.sin(ang * 3) * 4

# Fio: borda interna (côncava) da lâmina = pixels perto da borda com a normal apontando pro centro da curva
borda = ML & ~np.array(Image.fromarray((ML * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(bool)
by, bx = np.nonzero(borda)
bwx = xmin + (bx + 0.5) / TAM * S
bwy = ymax - (by + 0.5) / TAM * S
# normal pra fora ~ gradiente da máscara suavizada
suave = np.array(Image.fromarray((ML * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), dtype=float)
gy, gx = np.gradient(suave)
nx, ny = -gx[by, bx], gy[by, bx]  # em coordenadas do mundo (y pra cima)
para_c = np.stack([C_CURVA[0] - bwx, C_CURVA[1] - bwy], 1)
interna = (nx * para_c[:, 0] + ny * para_c[:, 1]) > 0
# a ponta conta como fio também
ponta = V[eh_lamina_v][np.argmin(V[eh_lamina_v, 1])][:2]
interna |= np.hypot(bwx - ponta[0], bwy - ponta[1]) < 0.5
ix, iy = bx[interna], by[interna]
ex, ey = bx[~interna], by[~interna]
ly, lx = np.nonzero(ML)
def dist_min(qx, qy):
    out = np.full(len(lx), 1e9)
    for i in range(0, len(qx), 400):
        dd = np.hypot(lx[:, None] - qx[None, i:i + 400], ly[:, None] - qy[None, i:i + 400]).min(1)
        out = np.minimum(out, dd)
    return out
d_fio = dist_min(ix, iy)
d_lomb = dist_min(ex, ey)
larg = d_fio + d_lomb + 1e-6
frac = d_fio / larg  # 0 no fio, 1 no lombo

img = np.zeros((TAM, TAM, 3), dtype=float)
base = aco[ly, lx]
cor = np.stack([base, base + 4, base + 9], 1)
# chanfro do fio (polido, mais claro e liso) com a linha da afiação
chanfro = frac < 0.34
pol = 214 + fino[ly, lx] * 1.5 + (frac * 30)
cor[chanfro] = np.stack([pol, pol + 3, pol + 7], 1)[chanfro]
linha = np.abs(frac - 0.34) < 0.025
cor[linha] = np.stack([120 + 0 * pol, 126 + 0 * pol, 134 + 0 * pol], 1)[linha]
# fio vivo
cor[frac < 0.05] = [240, 244, 248]
# lombo um pouco mais escuro
lombo = frac > 0.9
cor[lombo] *= 0.82
img[ly, lx] = cor

# Cabo: G10 preto com camadas onduladas e textura áspera
cy, cx = np.nonzero(MC & ~ML)
cwx = xmin + (cx + 0.5) / TAM * S
cwy = ymax - (cy + 0.5) / TAM * S
eixo = (ANEL - GUARDA) / np.linalg.norm(ANEL - GUARDA)
perp = np.array([-eixo[1], eixo[0]])
s_ax = (cwx - GUARDA[0]) * eixo[0] + (cwy - GUARDA[1]) * eixo[1]
s_pp = (cwx - GUARDA[0]) * perp[0] + (cwy - GUARDA[1]) * perp[1]
camadas = np.sin((s_pp * 9 + np.sin(s_ax * 2.3) * 0.8) * 3.0)
aspero = rng.normal(0, 1, (TAM, TAM))[cy, cx]
pont = (np.sin(cwx * 60) * np.sin(cwy * 60) > 0.55).astype(float)  # textura de grip
g = 34 + camadas * 7 + aspero * 6 - pont * 10
img[cy, cx] = np.stack([g, g + 3, g + 2], 1)

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
dr = ImageDraw.Draw(im)
# Parafusos torx no cabo
comp = np.linalg.norm(ANEL - GUARDA)
for t in (0.25, 0.62):
    p = GUARDA + eixo * comp * t + perp * 0.05
    cxp, cyp = px(*p)
    rr = 0.2 / S * TAM
    dr.ellipse([cxp - rr, cyp - rr, cxp + rr, cyp + rr], fill=(150, 156, 164), outline=(70, 74, 80), width=2)
    for k in range(6):
        a = k * math.pi / 3
        dr.line([cxp, cyp, cxp + math.cos(a) * rr * 0.55, cyp + math.sin(a) * rr * 0.55], fill=(55, 58, 63), width=2)
# Gravação pequena na lâmina, perto da guarda
try:
    fonte = ImageFont.truetype('arialbd.ttf', 13)
except Exception:
    fonte = ImageFont.load_default()
gp = px(-2.25, 0.35)
txt = Image.new('RGBA', (90, 20), (0, 0, 0, 0))
ImageDraw.Draw(txt).text((2, 2), 'LUIGGI', font=fonte, fill=(95, 100, 108, 230))
txt = txt.rotate(68, expand=True)
im.paste(txt, (int(gp[0] - txt.width / 2), int(gp[1] - txt.height / 2)), txt)
im = im.filter(ImageFilter.SMOOTH)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=86)
im.save(os.path.join(os.path.dirname(sys.argv[1]), 'karambit_tex.jpg'), 'JPEG', quality=86)
tex64 = base64.b64encode(buf.getvalue()).decode()

# ---------------- Orientação do jogo: cabo no eixo z (argola atrás), lâmina curvando pra +y ----------------
u = (GUARDA - ANEL) / np.linalg.norm(GUARDA - ANEL)        # -> +z do modelo
w = np.array([u[1], -u[0]])                                 # -> +y (lado pra onde a lâmina curva)
if (ponta - ANEL) @ w < 0:
    w = -w
ESC = 0.25 / 9.6   # ~25 cm de ponta a ponta
centro = (ANEL + GUARDA) / 2 + u * 0.4                      # empunhadura um pouco mais perto da guarda
def conv(p):
    q = p[:2] - centro
    zz = q @ u
    yy_ = q @ w
    xx_ = p[2] - z_meio
    return [xx_ * ESC, yy_ * ESC, zz * ESC]
# conferir orientação (mão direita): se inverter, troca o sinal de x
M = np.array([[0, 0, 1], [w[0], w[1], 0], [u[0], u[1], 0]])
sinal_x = 1 if np.linalg.det(np.array([[0, w[0], u[0]], [0, w[1], u[1]], [1, 0, 0]])) > 0 else -1

pos, uvs = [], []
grupos = []
for tris in (tris_lam, tris_cabo):
    ini = len(pos) // 3
    for t in tris:
        for i in t:
            q = conv(V[i])
            q[0] *= sinal_x
            pos += q
            uvs += list(uv(V[i, 0], V[i, 1]))
    grupos.append([ini, len(pos) // 3 - ini])
if sinal_x < 0:
    # troca a ordem dos vértices de cada triângulo pra manter as normais pra fora
    for a in range(0, len(pos) // 9):
        for arr, n in ((pos, 3), (uvs, 2)):
            b = a * 3 * n
            arr[b + n:b + 2 * n], arr[b + 2 * n:b + 3 * n] = arr[b + 2 * n:b + 3 * n], arr[b + n:b + 2 * n]

r4 = lambda a: [round(x, 4) for x in a]
saida = os.path.join(RAIZ, 'data', 'karambit_modelo.js')
with open(saida, 'w', encoding='utf-8', newline='\n') as fp:
    fp.write('/* Karambit 3D: modelo de JoshAS (OpenGameArt, CC-BY 3.0 https://creativecommons.org/licenses/by/3.0/),\n'
             '   https://opengameart.org/content/karambit-knife . Alterado: lâmina afinada, escala/orientação e textura pintada pelo LuiggiBeats.\n'
             '   Gerado por ferramentas/gerar_karambit.py */\n')
    fp.write('window.LuiggiKarambitModelo = ' + json.dumps({
        'pos': r4(pos), 'uv': r4(uvs), 'grupos': grupos, 'tex': 'data:image/jpeg;base64,' + tex64
    }, separators=(',', ':')) + ';\n')
print('ok', saida, os.path.getsize(saida), 'bytes;', len(pos) // 9, 'triângulos; sinal_x', sinal_x)
