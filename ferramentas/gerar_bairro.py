#!/usr/bin/env python3
"""
ferramentas/gerar_bairro.py

Gera data/bairro_curitiba.js: o bairro em volta da casa (R. Mercedes Seiler Rocha, Bacacheri, Curitiba) até o
começo e o fim da R. Fagundes Varela, pro Momento Resenha 3D.

  - Ruas, canteiros, rios, parques e os prédios que existem no mapa vêm do OpenStreetMap
    (© colaboradores do OpenStreetMap, licença ODbL — https://www.openstreetmap.org/copyright).
  - O OSM quase não tem as casas desenhadas, então os lotes são preenchidos ao longo das ruas (casas térreas,
    sobrados, comércio na Fagundes Varela, muros e portões, árvores nas calçadas), com sorteio fixo (semente).
  - Tudo sai no sistema de coordenadas do cenário da rua (RuaSafepoint3D: mundo curvo, em metros), georreferenciado
    pelo cruzamento da Mercedes Seiler Rocha com a Prof. Raul Pinheiro Machado.

Uso:
  1) Baixe o mapa da região em blocos (a API aceita até 50 mil nós por pedido), por exemplo:
       https://api.openstreetmap.org/api/0.6/map?bbox=-49.2425,-25.4190,-49.2310,-25.4125   (e os outros 3 blocos)
  2) python ferramentas/gerar_bairro.py <pasta-com-os-.osm> [antigo_ocupado.json]
     antigo_ocupado.json (opcional) = caixas dos objetos do cenário antigo, pra não construir em cima deles.
"""
import sys, os, math, json, glob, random, base64, io
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Traçado da rua (cópia fiel de RuaSafepoint3D.js)
# ---------------------------------------------------------------------------
MEIO_FIO_N, MEIO_FIO_S = 1.6, 9.6
EIXO = (MEIO_FIO_N + MEIO_FIO_S) / 2
RUMO_REF = 83.5
PIVO = 4
RUMOS = [[-120, 64], [-47, 66.8], [-24, 70.6], [-9.5, 75.4], [6, 84.7], [21.7, 94.2], [55, 99], [120, 100]]
TR_PASSO, TR_MIN, TR_MAX = 0.25, -260, 260
TR_N = round((TR_MAX - TR_MIN) / TR_PASSO) + 1
XC = 52.8
TAN_TR = math.tan(0.17)


def _rumo(x):
    if x <= RUMOS[0][0]:
        return RUMOS[0][1]
    for i in range(1, len(RUMOS)):
        if x <= RUMOS[i][0]:
            x0, b0 = RUMOS[i - 1]
            x1, b1 = RUMOS[i]
            return b0 + (b1 - b0) * (x - x0) / (x1 - x0)
    return RUMOS[-1][1]


TH = [math.radians(_rumo(TR_MIN + i * TR_PASSO) - RUMO_REF) for i in range(TR_N)]
_ip = round((PIVO - TR_MIN) / TR_PASSO)
_t0 = TH[_ip]
TH = [t - _t0 for t in TH]
CX = [0.0] * TR_N
CZ = [0.0] * TR_N
CX[_ip], CZ[_ip] = PIVO, EIXO
for i in range(_ip + 1, TR_N):
    t = (TH[i] + TH[i - 1]) / 2
    CX[i] = CX[i - 1] + math.cos(t) * TR_PASSO
    CZ[i] = CZ[i - 1] + math.sin(t) * TR_PASSO
for i in range(_ip - 1, -1, -1):
    t = (TH[i] + TH[i + 1]) / 2
    CX[i] = CX[i + 1] - math.cos(t) * TR_PASSO
    CZ[i] = CZ[i + 1] - math.sin(t) * TR_PASSO


def amostra(x):
    f = (max(TR_MIN, min(TR_MAX, x)) - TR_MIN) / TR_PASSO
    i = min(TR_N - 2, int(math.floor(f)))
    k = f - i
    t = TH[i] + (TH[i + 1] - TH[i]) * k
    px = CX[i] + (CX[i + 1] - CX[i]) * k
    pz = CZ[i] + (CZ[i + 1] - CZ[i]) * k
    fora = x - TR_MIN if x < TR_MIN else x - TR_MAX if x > TR_MAX else 0
    return t, px + math.cos(t) * fora, pz + math.sin(t) * fora


def curvar(x, z):
    t, px, pz = amostra(x)
    d = z - EIXO
    return px - math.sin(t) * d, pz + math.cos(t) * d


def retificar(X, Z):
    x = X
    for _ in range(6):
        t, px, pz = amostra(x)
        x += (X - px) * math.cos(t) + (Z - pz) * math.sin(t)
    t, px, pz = amostra(x)
    return x, EIXO - (X - px) * math.sin(t) + (Z - pz) * math.cos(t)


def eixo_transversal(zs):
    return XC + (zs - EIXO) * TAN_TR


# ---------------------------------------------------------------------------
# Georreferência: (lat, lon) -> mundo curvo do cenário
# ---------------------------------------------------------------------------
ANCORA_LL = (-25.4088179, -49.2242285)  # OSM nó 1843407294: Mercedes Seiler Rocha x Prof. Raul Pinheiro Machado
RUMO, AJ_X, AJ_Z = 84.0, 2.0, 1.0  # ajuste fino (erro médio ~0,6 m na rua da casa)
ANCORA_M = curvar(XC, EIXO)
KX = 111320.0 * math.cos(math.radians(ANCORA_LL[0]))
KY = 110574.0
_A, _B = math.sin(math.radians(RUMO)), math.cos(math.radians(RUMO))


def para_cena(lat, lon):
    e = (lon - ANCORA_LL[1]) * KX
    n = (lat - ANCORA_LL[0]) * KY
    return (ANCORA_M[0] + e * _A + n * _B + AJ_X, ANCORA_M[1] + e * _B - n * _A + AJ_Z)


# ---------------------------------------------------------------------------
# OSM
# ---------------------------------------------------------------------------
def carregar_osm(pasta):
    nos, vias = {}, {}
    for f in sorted(glob.glob(os.path.join(pasta, '*.osm'))):
        r = ET.parse(f).getroot()
        for n in r.findall('node'):
            nos[n.get('id')] = (float(n.get('lat')), float(n.get('lon')), {t.get('k'): t.get('v') for t in n.findall('tag')})
        for w in r.findall('way'):
            vias[w.get('id')] = ([nd.get('ref') for nd in w.findall('nd')], {t.get('k'): t.get('v') for t in w.findall('tag')})
    return nos, vias


# Larguras (asfalto inteiro, metros) e calçadas por tipo de via
TIPOS = {
    'trunk': (0, 10.5, 4.0), 'trunk_link': (0, 7.0, 0.0), 'primary': (1, 12.0, 4.0), 'primary_link': (1, 7.0, 0.0),
    'secondary': (2, 10.0, 3.5), 'secondary_link': (2, 7.0, 0.0), 'tertiary': (3, 9.0, 3.2), 'tertiary_link': (3, 6.5, 0.0),
    'residential': (4, 7.2, 3.0), 'unclassified': (4, 7.0, 3.0), 'living_street': (5, 5.5, 2.0), 'service': (6, 4.5, 0.0),
    'busway': (7, 7.0, 0.0), 'pedestrian': (8, 5.0, 0.0),
}
LOTEAVEIS = {'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'primary'}


def largura_via(tags):
    hw = tags['highway']
    _, larg, calc = TIPOS[hw]
    if tags.get('lanes'):
        try:
            larg = max(larg * 0.7, min(larg * 1.6, int(tags['lanes'].split(';')[0]) * 3.3))
        except ValueError:
            pass
    if tags.get('oneway') == 'yes' and hw in ('trunk', 'secondary', 'primary'):
        larg = min(larg, 8.0)
    return larg, calc


# ---------------------------------------------------------------------------
# Geometria
# ---------------------------------------------------------------------------
def dist_segs(px, pz, segs):
    """Distância de cada ponto (arrays) ao conjunto de segmentos [[ax,az,bx,bz],...]."""
    px = np.asarray(px, dtype=np.float64)[..., None]
    pz = np.asarray(pz, dtype=np.float64)[..., None]
    s = np.asarray(segs, dtype=np.float64)
    ax, az, bx, bz = s[:, 0], s[:, 1], s[:, 2], s[:, 3]
    vx, vz = bx - ax, bz - az
    L = np.maximum(vx * vx + vz * vz, 1e-9)
    t = np.clip(((px - ax) * vx + (pz - az) * vz) / L, 0, 1)
    dx = px - (ax + t * vx)
    dz = pz - (az + t * vz)
    return np.sqrt(dx * dx + dz * dz).min(axis=-1)


def comprimento(pts):
    return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))


def ponto_em(pts, s):
    """Ponto e tangente a uma distância s ao longo da polilinha."""
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-6:
            continue
        if acc + L >= s or i == len(pts) - 2:
            k = max(0.0, min(1.0, (s - acc) / L))
            return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k), ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        acc += L
    return pts[-1], (1.0, 0.0)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opc = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    pasta = args[0] if args else '.'
    antigo_json = args[1] if len(args) > 1 else None
    predios_json = opc.get('predios')  # construções (Google Open Buildings etc.), JSON [[fonte, conf, área, WKT], ...]
    copa_npy = opc.get('copa')  # recorte da altura de copa (Meta/WRI) + .json com a georreferência
    rnd = random.Random(185)
    nos, vias = carregar_osm(pasta)
    P = {nid: para_cena(la, lo) for nid, (la, lo, _) in nos.items()}
    print('OSM:', len(nos), 'nós,', len(vias), 'vias')

    # ---------------- Região: em volta da Fagundes Varela e da Mercedes Seiler Rocha ----------------
    def segs_de(nome, filtro=lambda pts: True):
        out = []
        for nds, tags in vias.values():
            if tags.get('name') == nome and 'highway' in tags:
                pts = [P[n] for n in nds if n in P]
                if filtro(pts):
                    out += [[pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]] for i in range(len(pts) - 1)]
        return out

    seg_fv = segs_de('Rua Fagundes Varela')
    seg_msr = segs_de('Rua Mercedes Seiler Rocha')
    R_VER = (330.0, 290.0)  # até onde aparece (FV, MSR)
    R_DIR = (265.0, 225.0)  # até onde dá pra andar/dirigir

    def regiao(px, pz, raios):
        return (dist_segs(px, pz, seg_fv) <= raios[0]) | (dist_segs(px, pz, seg_msr) <= raios[1])

    todos = np.array(seg_fv + seg_msr)
    X0 = math.floor(min(todos[:, [0, 2]].min() - R_VER[0], -200))
    X1 = math.ceil(max(todos[:, [0, 2]].max() + R_VER[0], 200))
    Z0 = math.floor(min(todos[:, [1, 3]].min() - R_VER[0], -200))
    Z1 = math.ceil(max(todos[:, [1, 3]].max() + R_VER[0], 200))
    GW, GH = X1 - X0, Z1 - Z0
    print('caixa', X0, X1, Z0, Z1, 'grade', GW, 'x', GH)
    gx = lambda x: x - X0
    gz = lambda z: z - Z0

    # Máscara da região visível e da dirigível (grade de 1 m, calculada em 4 m e ampliada)
    cxs = np.arange(X0, X1, 4) + 2
    czs = np.arange(Z0, Z1, 4) + 2
    MX, MZ = np.meshgrid(cxs, czs)
    vis4 = np.zeros(MX.shape, bool)
    dir4 = np.zeros(MX.shape, bool)
    for r0 in range(0, MX.shape[0], 40):
        sl = slice(r0, r0 + 40)
        dfv = dist_segs(MX[sl], MZ[sl], seg_fv)
        dms = dist_segs(MX[sl], MZ[sl], seg_msr)
        vis4[sl] = (dfv <= R_VER[0]) | (dms <= R_VER[1])
        dir4[sl] = (dfv <= R_DIR[0]) | (dms <= R_DIR[1])
    VIS = np.kron(vis4, np.ones((4, 4), bool))[:GH, :GW]
    DIR = np.kron(dir4, np.ones((4, 4), bool))[:GH, :GW]

    # ---------------- Cenário antigo (não mexe) ----------------
    # Área protegida: faixa da rua da casa e da transversal (coordenadas retas) + caixas dos objetos antigos
    ANT = np.zeros((GH, GW), bool)
    zz, xx = np.mgrid[Z0:Z1, X0:X1]
    # Só perto da casa: recorta a janela que interessa pra não chamar retificar em tudo
    jan = (xx > -260) & (xx < 260) & (zz > -260) & (zz < 260)
    idx = np.argwhere(jan)
    xs_s = np.zeros(idx.shape[0])
    zs_s = np.zeros(idx.shape[0])
    for k, (r, c) in enumerate(idx):
        xs_s[k], zs_s[k] = retificar(X0 + c + 0.5, Z0 + r + 0.5)
    dentro_caixa = (np.abs(xs_s) <= 110) & (zs_s >= -110) & (zs_s <= 115)
    corredor = (np.abs(xs_s) <= 112) & (zs_s >= -63) & (zs_s <= 42)
    transv = (np.abs(xs_s - (XC + (zs_s - EIXO) * TAN_TR)) <= 22) & (zs_s >= -112) & (zs_s <= 116)
    # Onde o cenário antigo deixa andar/dirigir (mesmas regras do RuaSafepoint3D.limitarVeiculo, sem o carro)
    norte = -6.2 + np.where(xs_s < -3, np.minimum(3.3, (-3 - xs_s) / 57.2 * 3.3), 0)
    aberto_antigo = ((np.abs(xs_s) <= 97) & (zs_s >= norte) & (zs_s <= 14)) | ((np.abs(xs_s - (XC + (zs_s - EIXO) * TAN_TR)) < 5.2) & (zs_s >= -95) & (zs_s <= 95))
    prot = dentro_caixa & (corredor | transv)
    # (a máscara usa as regras antigas só nessas faixas; o resto da caixa antiga recebe ruas novas normalmente)
    ANT[idx[prot, 0], idx[prot, 1]] = True
    CAIXA_ANT = np.zeros((GH, GW), bool)
    CAIXA_ANT[idx[dentro_caixa, 0], idx[dentro_caixa, 1]] = True
    if antigo_json and os.path.exists(antigo_json):
        for x0, z0, x1, z1, y1 in json.load(open(antigo_json)):
            c0, c1 = int(max(0, gx(x0) - 2)), int(min(GW, gx(x1) + 3))
            r0, r1 = int(max(0, gz(z0) - 2)), int(min(GH, gz(z1) + 3))
            if c1 > c0 and r1 > r0:
                ANT[r0:r1, c0:c1] = True

    # ---------------- Ruas ----------------
    ruas = []  # dicts
    nomes = []
    nome_idx = {}

    def idx_nome(n):
        if not n:
            return -1
        if n not in nome_idx:
            nome_idx[n] = len(nomes)
            nomes.append(n)
        return nome_idx[n]

    uso_no = {}
    for wid, (nds, tags) in vias.items():
        hw = tags.get('highway')
        if hw not in TIPOS or tags.get('area') == 'yes':
            continue
        if hw == 'service' and tags.get('service') in ('parking_aisle', 'driveway') and not tags.get('name'):
            continue
        pts = [P[n] for n in nds if n in P]
        ids = [n for n in nds if n in P]
        if len(pts) < 2:
            continue
        larg, calc = largura_via(tags)
        for n in ids:
            uso_no[n] = uso_no.get(n, 0) + 1
        ruas.append({'id': wid, 'ids': ids, 'pts': pts, 'hw': hw, 'tipo': TIPOS[hw][0], 'larg': larg, 'calc': calc, 'nome': tags.get('name', ''), 'mao': tags.get('oneway') == 'yes'})

    # Corta as ruas: fica só o que está na região visível e fora da faixa antiga; liga as que saem do cenário antigo
    def dentro_vis(x, z):
        c, r = int(gx(x)), int(gz(z))
        return 0 <= c < GW and 0 <= r < GH and VIS[r, c]

    def na_faixa_antiga(x, z):
        c, r = int(gx(x)), int(gz(z))
        if not (0 <= c < GW and 0 <= r < GH):
            return False
        if not CAIXA_ANT[r, c]:
            return False
        xs, zs = retificar(x, z)
        return (abs(xs) <= 110 and -12 <= zs <= 20) or (abs(xs - eixo_transversal(zs)) <= 9 and -110 <= zs <= 115)

    # Pontas do cenário antigo (onde as ruas continuam): rua da casa nos dois sentidos e a transversal pros dois lados
    PONTAS = [curvar(-110, EIXO), curvar(110, EIXO), curvar(eixo_transversal(-110), -110), curvar(eixo_transversal(115), 115)]
    PONTAS_DENTRO = [curvar(-98, EIXO), curvar(98, EIXO), curvar(eixo_transversal(-98), -98), curvar(eixo_transversal(103), 103)]

    def densificar(pts, passo=6.0):
        out = [pts[0]]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(1, int(L // passo))
            for k in range(1, n + 1):
                out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
        return out

    novas = []
    for r in ruas:
        pts = densificar(r['pts'])
        pedaco = []
        for p in pts:
            ok = dentro_vis(*p) and not na_faixa_antiga(*p)
            if ok:
                pedaco.append(p)
            else:
                if len(pedaco) >= 2:
                    novas.append(dict(r, pts=pedaco))
                pedaco = []
        if len(pedaco) >= 2:
            novas.append(dict(r, pts=pedaco))
    ruas = novas

    # Emenda com o cenário antigo: a ponta que encosta numa saída do cenário antigo é puxada até ela
    for r in ruas:
        if r['nome'] not in ('Rua Mercedes Seiler Rocha', 'Rua Professor Raul Pinheiro Machado'):
            continue
        for lado in (0, -1):
            p = r['pts'][lado]
            for k, q in enumerate(PONTAS):
                d = math.hypot(p[0] - q[0], p[1] - q[1])
                if d < 25:
                    dx, dz = q[0] - p[0], q[1] - p[1]
                    seq = r['pts'] if lado == 0 else r['pts'][::-1]
                    acc = 0
                    novos = []
                    for i, s in enumerate(seq):
                        if i:
                            acc += math.hypot(s[0] - seq[i - 1][0], s[1] - seq[i - 1][1])
                        f = max(0.0, 1 - acc / 70.0)
                        novos.append((s[0] + dx * f, s[1] + dz * f))
                    novos.insert(0, PONTAS_DENTRO[k])
                    r['pts'] = novos if lado == 0 else novos[::-1]
                    r['emenda'] = True
                    break

    print('ruas:', len(ruas))

    # ---------------- Rasterização (grade de 1 m) ----------------
    def img():
        return Image.new('L', (GW, GH), 0)

    def linha(d, pts, larg, val=255):
        xy = [(gx(x), gz(z)) for x, z in pts]
        d.line(xy, fill=val, width=max(1, int(round(larg))), joint='curve')
        r = larg / 2
        for x, z in (xy[0], xy[-1]):
            d.ellipse((x - r, z - r, x + r, z + r), fill=val)

    im_asf, im_rua = img(), img()
    da, dr = ImageDraw.Draw(im_asf), ImageDraw.Draw(im_rua)
    for r in ruas:
        linha(da, r['pts'], r['larg'])
        linha(dr, r['pts'], r['larg'] + 2 * max(r['calc'], 1.0))
    ASF = np.array(im_asf) > 0
    RUA = np.array(im_rua) > 0

    # Parques, água, prédios do OSM
    im_verde, im_agua, im_pred = img(), img(), img()
    dv, dag, dp = ImageDraw.Draw(im_verde), ImageDraw.Draw(im_agua), ImageDraw.Draw(im_pred)
    areas, rios, predios = [], [], []
    for wid, (nds, tags) in vias.items():
        pts = [P[n] for n in nds if n in P]
        if len(pts) < 3:
            continue
        xy = [(gx(x), gz(z)) for x, z in pts]
        fechado = nds[0] == nds[-1]
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        if not dentro_vis(cx, cz) and not any(dentro_vis(*p) for p in pts[::3]):
            continue
        verde = tags.get('leisure') in ('park', 'garden', 'playground', 'pitch') or tags.get('landuse') in ('grass', 'forest', 'meadow', 'recreation_ground') or tags.get('natural') in ('wood', 'scrub', 'grassland')
        if fechado and verde:
            tipo = 1 if (tags.get('landuse') == 'forest' or tags.get('natural') in ('wood', 'scrub')) else 2 if tags.get('leisure') == 'pitch' else 0
            dv.polygon(xy, fill=255)
            areas.append({'t': tipo, 'p': pts})
        elif fechado and (tags.get('natural') == 'water' or tags.get('leisure') == 'swimming_pool'):
            dag.polygon(xy, fill=255)
            areas.append({'t': 3, 'p': pts})
        elif tags.get('waterway') in ('stream', 'river', 'canal', 'ditch'):
            largura = 6.0 if tags['waterway'] == 'river' else 3.0
            linha(dag, pts, largura + 6)
            rios.append({'l': largura, 'p': pts})
        elif fechado and 'building' in tags:
            try:
                niv = float(tags.get('building:levels', '0') or 0)
            except ValueError:
                niv = 0
            b = tags['building']
            if not niv:
                niv = {'house': 1, 'apartments': 5, 'industrial': 2, 'commercial': 2, 'church': 3, 'hospital': 3}.get(b, 2)
            t = {'house': 0, 'apartments': 1, 'industrial': 2, 'commercial': 3, 'retail': 3, 'church': 4, 'hospital': 5}.get(b, 3)
            dp.polygon(xy, fill=255)
            predios.append({'p': pts, 'n': niv, 't': t})
    VERDE = np.array(im_verde) > 0
    AGUA = np.array(im_agua) > 0
    PRED = np.array(im_pred) > 0
    # Prédios do OSM em cima do cenário antigo ou da rua não entram
    def sobre_antigo(pts):
        for x, z in pts:
            c, r_ = int(gx(x)), int(gz(z))
            if 0 <= c < GW and 0 <= r_ < GH and ANT[r_, c]:
                return True
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        c, r_ = int(gx(cx)), int(gz(cz))
        return 0 <= c < GW and 0 <= r_ < GH and ANT[r_, c]
    predios = [b for b in predios if not any(na_faixa_antiga(*p) for p in b['p']) and not sobre_antigo(b['p'])]
    areas = [a for a in areas if not all(not dentro_vis(*p) for p in a['p'])]

    OCUP = RUA | VERDE | AGUA | PRED | ANT | ~VIS
    print('ocupado %.1f%%' % (100 * OCUP.mean()))

    # ---------------- Cruzamentos ----------------
    cruzamentos = [P[n] for n, k in uso_no.items() if k >= 2]
    seg_cruz = np.array(cruzamentos) if cruzamentos else np.zeros((0, 2))

    def perto_cruzamento(x, z, r):
        if not len(seg_cruz):
            return False
        return bool(((seg_cruz[:, 0] - x) ** 2 + (seg_cruz[:, 1] - z) ** 2 < r * r).any())

    lotes = []
    arvores = []  # x, z, tipo (0 copa, 1 araucária, 2 ipê, 3 palmeira), escala
    postes = []
    carros = []
    placas = []

    # ---------------- Construções e árvores de verdade (quando os dados foram baixados) ----------------
    # Construções: Google Open Buildings / Microsoft / OSM (conjunto da VIDA no Source Cooperative, CC BY 4.0 / ODbL).
    # Árvores: mapa de altura de copa de 1 m da Meta/WRI (CC BY 4.0): cada pico de copa vira uma árvore.
    casas = []
    muros = []
    REAL = bool(predios_json and os.path.exists(predios_json))
    if REAL:
        import re
        lista = json.load(open(predios_json))
        # Prédios do OSM com andares (pra herdar a altura)
        osm_niv = [(b['p'], b['n']) for b in predios]
        predios = []  # os polígonos do OSM saem; entram os do conjunto (que já inclui o OSM)

        def anel(wkt):
            m = re.search(r'\(\(([^()]+)\)', wkt)
            if not m:
                return None
            out = []
            for par in m.group(1).split(','):
                lo, la = map(float, par.split()[:2])
                out.append(para_cena(la, lo))
            return out

        def caixa_minima(pts):
            """Retângulo de área mínima (calibres girando sobre o fecho convexo): centro, ângulo do lado 1, larguras."""
            P_ = np.array(pts[:-1] if pts[0] == pts[-1] else pts)
            # Fecho convexo (cadeia monótona)
            Q = sorted(map(tuple, P_))
            if len(Q) < 3:
                return None

            def cr(o, a, b):
                return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
            lo_, hi_ = [], []
            for p in Q:
                while len(lo_) >= 2 and cr(lo_[-2], lo_[-1], p) <= 0:
                    lo_.pop()
                lo_.append(p)
            for p in reversed(Q):
                while len(hi_) >= 2 and cr(hi_[-2], hi_[-1], p) <= 0:
                    hi_.pop()
                hi_.append(p)
            H = np.array(lo_[:-1] + hi_[:-1])
            melhor = None
            for i in range(len(H)):
                e = H[(i + 1) % len(H)] - H[i]
                L_ = math.hypot(*e)
                if L_ < 1e-6:
                    continue
                u = e / L_
                v = np.array([-u[1], u[0]])
                pu = H @ u
                pv = H @ v
                area = (pu.max() - pu.min()) * (pv.max() - pv.min())
                if melhor is None or area < melhor[0]:
                    c = u * (pu.max() + pu.min()) / 2 + v * (pv.max() + pv.min()) / 2
                    melhor = (area, c, u, pu.max() - pu.min(), pv.max() - pv.min())
            return melhor

        def area_pol(pts):
            a = 0
            for i in range(len(pts) - 1):
                a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
            return abs(a) / 2

        # Segmentos de rua pra achar a rua mais perta de cada casa
        segs_r = []
        for ri, r in enumerate(ruas):
            if r['hw'] in ('service', 'busway', 'pedestrian', 'trunk_link'):
                continue
            for i in range(len(r['pts']) - 1):
                segs_r.append((r['pts'][i], r['pts'][i + 1], ri))
        S_ = np.array([[a[0], a[1], b[0], b[1]] for a, b, _ in segs_r])

        def rua_perto(x, z):
            ax, az, bx, bz = S_[:, 0], S_[:, 1], S_[:, 2], S_[:, 3]
            vx, vz = bx - ax, bz - az
            L2 = np.maximum(vx * vx + vz * vz, 1e-9)
            t = np.clip(((x - ax) * vx + (z - az) * vz) / L2, 0, 1)
            qx, qz = ax + t * vx, az + t * vz
            d = np.hypot(x - qx, z - qz)
            k = int(d.argmin())
            return d[k], (qx[k], qz[k]), segs_r[k]

        n_ok = 0
        for src, conf, area_m, wkt in lista:
            pts = anel(wkt)
            if not pts or len(pts) < 4:
                continue
            cx = sum(p[0] for p in pts) / len(pts)
            cz = sum(p[1] for p in pts) / len(pts)
            if not dentro_vis(cx, cz):
                continue
            # Não constrói em cima do cenário antigo nem no meio da rua
            em_ant = sum(1 for x, z in pts if 0 <= int(gx(x)) < GW and 0 <= int(gz(z)) < GH and ANT[int(gz(z)), int(gx(x))])
            if em_ant or (0 <= int(gx(cx)) < GW and 0 <= int(gz(cz)) < GH and (ANT[int(gz(cz)), int(gx(cx))] or ASF[int(gz(cz)), int(gx(cx))])):
                continue
            area = area_pol(pts)
            if area < 12:
                continue
            seed = int(abs(cx * 73.1 + cz * 31.7) * 10) % 65536
            rr = random.Random(seed)
            # Andares: do OSM quando tem; senão pela área (bairro de casas: térreas e sobrados)
            niv = None
            for op, on in osm_niv:
                ox = sum(p[0] for p in op) / len(op)
                oz = sum(p[1] for p in op) / len(op)
                if abs(ox - cx) < 6 and abs(oz - cz) < 6:
                    niv = on
                    break
            if niv is None:
                if area < 45:
                    niv = 1
                elif area < 260:
                    niv = 2 if rr.random() < 0.36 else 1
                elif area < 700:
                    niv = 2 if rr.random() < 0.7 else 3
                else:
                    niv = rr.choice([2, 2, 3, 4])
            d_rua, q, (sa, sb, ri) = rua_perto(cx, cz)
            r_ = ruas[ri]
            perto_avenida = r_['tipo'] <= 3 and d_rua < r_['larg'] / 2 + r_['calc'] + 18
            cm = caixa_minima(pts)
            retangular = cm is not None and area / max(cm[0], 1e-6) > 0.82 and area < 650
            if retangular and area >= 18:
                _, c, u, Lu, Lv = cm
                # Frente: o lado do retângulo virado pra rua mais perto
                tx, tz = q[0] - c[0], q[1] - c[1]
                v = (-u[1], u[0])
                du = tx * u[0] + tz * u[1]
                dv = tx * v[0] + tz * v[1]
                if abs(du) > abs(dv):
                    N = (-u[0] * math.copysign(1, du), -u[1] * math.copysign(1, du))  # aponta pra longe da rua
                    larg, prof = Lv, Lu
                else:
                    N = (-v[0] * math.copysign(1, dv), -v[1] * math.copysign(1, dv))
                    larg, prof = Lu, Lv
                ang = math.atan2(N[0], N[1])
                loja = perto_avenida and area < 400 and rr.random() < 0.4
                estilo = 3 if loja else 2 if niv >= 3 else (1 if niv == 2 else 0)
                tel = 3 if (estilo == 2 or (loja and rr.random() < 0.6)) else rr.choice([0, 0, 0, 1, 1, 2])
                casas.append([round(c[0], 2), round(c[1], 2), round(ang, 4), round(larg, 2), round(prof, 2), int(niv), estilo, rr.randrange(12), tel, seed])
                # Muro/grade na divisa com a calçada, na frente da casa
                lin = r_['larg'] / 2 + max(r_['calc'], 1.0) + 0.6
                if not loja and d_rua < lin + 16:
                    ex, ez = sb[0] - sa[0], sb[1] - sa[1]
                    le = math.hypot(ex, ez) or 1
                    ex, ez = ex / le, ez / le
                    lado_ = math.copysign(1, (c[0] - q[0]) * -ez + (c[1] - q[1]) * ex)
                    nx_, nz_ = -ez * lado_, ex * lado_
                    # Projeção da casa na rua (+ um pouco dos lados)
                    sproj = [(p[0] - q[0]) * ex + (p[1] - q[1]) * ez for p in pts]
                    s0, s1 = min(sproj) - rr.uniform(1.0, 3.0), max(sproj) + rr.uniform(1.0, 3.0)
                    A_ = (q[0] + ex * s0 + nx_ * lin, q[1] + ez * s0 + nz_ * lin)
                    B_ = (q[0] + ex * s1 + nx_ * lin, q[1] + ez * s1 + nz_ * lin)
                    meio = ((A_[0] + B_[0]) / 2, (A_[1] + B_[1]) / 2)
                    gc_, gr_ = int(gx(meio[0])), int(gz(meio[1]))
                    if 0 <= gc_ < GW and 0 <= gr_ < GH and not ASF[gr_, gc_] and not ANT[gr_, gc_]:
                        muros.append([round(A_[0], 2), round(A_[1], 2), round(B_[0], 2), round(B_[1], 2), rr.choice([1, 1, 1, 2, 2, 3]), seed])
            else:
                t = 3 if perto_avenida else (1 if niv >= 3 else 0)
                predios.append({'p': pts, 'n': niv, 't': t if area < 1500 else 2})
            n_ok += 1
        print('construções de verdade:', n_ok, '(casas', len(casas), ', polígonos', len(predios), ', muros', len(muros), ')')

    if copa_npy and os.path.exists(copa_npy):
        chm = np.load(copa_npy).astype(np.float32)
        meta = json.load(open(copa_npy + '.json'))
        H_, W_ = chm.shape
        # Suaviza 3x3 e acha os picos (maior valor numa janela de ~7 m) acima de 4 m
        pad = np.pad(chm, 1, mode='edge')
        suave = sum(pad[i:i + H_, j:j + W_] for i in range(3) for j in range(3)) / 9.0
        janela = 3
        pm = np.pad(suave, janela, mode='constant', constant_values=0)
        maxr = np.max(np.lib.stride_tricks.sliding_window_view(pm, 2 * janela + 1, axis=1), axis=-1)
        maxc = np.max(np.lib.stride_tricks.sliding_window_view(maxr, 2 * janela + 1, axis=0), axis=-1)
        maxc = maxc[:, janela:janela + W_] if maxc.shape[1] != W_ else maxc
        picos = np.argwhere((suave >= maxc - 1e-6) & (suave >= 2.6) & (chm >= 3.0))
        R_ = 6378137.0
        n_arv = 0
        for r_i, c_i in picos:
            X = meta['X0'] + (c_i + 0.5) * meta['sx']
            Y = meta['Y0'] - (r_i + 0.5) * meta['sy']
            lon = math.degrees(X / R_)
            lat = math.degrees(2 * math.atan(math.exp(Y / R_)) - math.pi / 2)
            x, z = para_cena(lat, lon)
            gc_, gr_ = int(gx(x)), int(gz(z))
            if not (0 <= gc_ < GW and 0 <= gr_ < GH) or not VIS[gr_, gc_] or ANT[gr_, gc_]:
                continue
            h = float(suave[r_i, c_i])
            # Copa por cima do asfalto: o tronco fica na calçada (procura o ponto livre mais perto)
            if ASF[gr_, gc_]:
                achou = False
                for raio in (2, 3, 4, 5):
                    for ang_ in range(0, 360, 30):
                        xx = x + raio * math.cos(math.radians(ang_))
                        zz = z + raio * math.sin(math.radians(ang_))
                        a2, b2 = int(gx(xx)), int(gz(zz))
                        if 0 <= a2 < GW and 0 <= b2 < GH and not ASF[b2, a2]:
                            x, z, achou = xx, zz, True
                            break
                    if achou:
                        break
                if not achou:
                    continue
            rr = random.Random(int(x * 13 + z * 7))
            arauc = h >= 12.5 and rr.random() < 0.38
            if arauc:
                arvores.append([round(x, 2), round(z, 2), 1, round(max(0.6, min(1.9, h / 13.9)), 2)])
            else:
                arvores.append([round(x, 2), round(z, 2), 2 if rr.random() < 0.06 else 0, round(max(0.55, min(2.6, h / 6.3)), 2)])
            n_arv += 1
        print('árvores de verdade (picos de copa):', n_arv)
        REAL_ARV = True
    else:
        REAL_ARV = False


    # ---------------- Lotes (casas, sobrados, comércio) sorteados — só sem as construções de verdade ----------------

    def livre_ret(F, T, N, w, prof):
        """Quanto de fundo (m) está livre num lote de frente w a partir do ponto F (linha da calçada)."""
        fundo = 0
        for d in range(1, int(prof) + 1):
            ok = True
            for k in np.linspace(-w / 2 + 0.5, w / 2 - 0.5, max(2, int(w))):
                x = F[0] + T[0] * k + N[0] * (d - 0.5)
                z = F[1] + T[1] * k + N[1] * (d - 0.5)
                c, r = int(gx(x)), int(gz(z))
                if not (0 <= c < GW and 0 <= r < GH) or OCUP[r, c]:
                    ok = False
                    break
            if not ok:
                break
            fundo = d
        return fundo

    def marcar(F, T, N, w, prof, val=True):
        for d in np.arange(0, prof, 0.7):
            for k in np.arange(-w / 2, w / 2 + 0.01, 0.7):
                x = F[0] + T[0] * k + N[0] * d
                z = F[1] + T[1] * k + N[1] * d
                c, r = int(gx(x)), int(gz(z))
                if 0 <= c < GW and 0 <= r < GH:
                    OCUP[r, c] = val

    for r in ([] if REAL else sorted(ruas, key=lambda r: r['tipo'])):
        if r['hw'] not in LOTEAVEIS:
            continue
        pts = r['pts']
        L = comprimento(pts)
        comercial = r['tipo'] <= 3
        for lado in (-1, 1):
            s = rnd.uniform(4, 9)
            while s < L - 4:
                w = rnd.uniform(8, 12) if (comercial and rnd.random() < 0.45) else rnd.uniform(10, 15)
                c, T = ponto_em(pts, s + w / 2)
                N = (-T[1] * lado, T[0] * lado)
                off = r['larg'] / 2 + max(r['calc'], 1.0) + 0.7
                F = (c[0] + N[0] * off, c[1] + N[1] * off)
                fundo = livre_ret(F, T, N, w, 34)
                if fundo < 10:
                    s += 3
                    continue
                loja = comercial and rnd.random() < 0.38
                predio = (not loja) and fundo >= 24 and w >= 13 and rnd.random() < (0.1 if comercial else 0.04)
                recuo = rnd.uniform(0.0, 1.2) if loja else rnd.uniform(2.5, 6.0)
                prof_casa = min(rnd.uniform(9, 15) if not predio else rnd.uniform(14, 20), fundo - recuo - 1.5)
                if prof_casa < 6:
                    s += 3
                    continue
                larg_casa = w - (rnd.uniform(0.3, 1.0) if loja else rnd.uniform(1.2, 3.5))
                andares = (rnd.choice([1, 2, 2]) if loja else rnd.randint(4, 9) if predio else (2 if rnd.random() < 0.38 else 1))
                desloc = 0 if loja else rnd.uniform(-1, 1) * (w - larg_casa) / 2
                ang = math.atan2(N[0], N[1])  # a casa olha pra -N (pra rua)
                estilo = 3 if loja else 2 if predio else (1 if andares == 2 else 0)
                muro = 0 if loja else rnd.choice([1, 1, 1, 2, 2, 3])
                lotes.append([round(F[0], 2), round(F[1], 2), round(ang, 4), round(w, 2), round(recuo, 2), round(larg_casa, 2), round(prof_casa, 2), andares, estilo,
                              rnd.randrange(12), rnd.randrange(4) if not predio else 3, muro, round(desloc, 2), rnd.randrange(1 << 16)])
                usado = min(fundo, recuo + prof_casa + rnd.uniform(3, 9))
                marcar(F, T, N, w, usado)
                # Árvore no quintal (às vezes araucária, o pinheiro do Paraná)
                if usado + 4 < fundo and rnd.random() < 0.4:
                    k = rnd.uniform(-w / 3, w / 3)
                    d = usado + rnd.uniform(1.5, min(6, fundo - usado - 1))
                    arvores.append([round(F[0] + T[0] * k + N[0] * d, 2), round(F[1] + T[1] * k + N[1] * d, 2), 1 if rnd.random() < 0.22 else 0, round(rnd.uniform(0.85, 1.35), 2)])
                s += w + rnd.uniform(0, 1.5)

    print('lotes:', len(lotes))

    # ---------------- Calçadas: árvores, postes, carros estacionados ----------------
    for ri, r in enumerate(ruas):
        if r['calc'] < 1 or r['hw'] not in LOTEAVEIS | {'trunk'}:
            continue
        pts = r['pts']
        L = comprimento(pts)
        off_arv = r['larg'] / 2 + r['calc'] * 0.32
        for lado in (() if REAL_ARV else (-1, 1)):
            s = rnd.uniform(3, 12)
            while s < L - 3:
                c, T = ponto_em(pts, s)
                N = (-T[1] * lado, T[0] * lado)
                x, z = c[0] + N[0] * off_arv, c[1] + N[1] * off_arv
                gc, gr = int(gx(x)), int(gz(z))
                if 0 <= gc < GW and 0 <= gr < GH and not ASF[gr, gc] and not ANT[gr, gc] and not perto_cruzamento(x, z, r['larg'] / 2 + 6) and rnd.random() < 0.72:
                    tipo = 2 if rnd.random() < 0.12 else 0
                    arvores.append([round(x, 2), round(z, 2), tipo, round(rnd.uniform(0.75, 1.2), 2)])
                s += rnd.uniform(11, 22)
        # Postes de um lado só, alternando por rua
        lado = 1 if (int(r['id']) & 1) else -1  # determinístico (hash() de texto muda a cada execução)
        s = rnd.uniform(5, 20)
        off_p = r['larg'] / 2 + 0.45
        while s < L - 3:
            c, T = ponto_em(pts, s)
            N = (-T[1] * lado, T[0] * lado)
            x, z = c[0] + N[0] * off_p, c[1] + N[1] * off_p
            gc, gr = int(gx(x)), int(gz(z))
            if 0 <= gc < GW and 0 <= gr < GH and not ANT[gr, gc]:
                postes.append([round(x, 2), round(z, 2), round(math.atan2(-N[0], -N[1]), 3), ri])
            s += rnd.uniform(30, 38)
        # Carros estacionados junto ao meio-fio
        if r['hw'] in ('residential', 'tertiary', 'unclassified', 'secondary'):
            for lado in (-1, 1):
                if r['mao'] and lado < 0:
                    continue
                s = rnd.uniform(10, 30)
                while s < L - 10:
                    c, T = ponto_em(pts, s)
                    N = (-T[1] * lado, T[0] * lado)
                    off_c = r['larg'] / 2 - 1.15
                    x, z = c[0] + N[0] * off_c, c[1] + N[1] * off_c
                    gc, gr = int(gx(x)), int(gz(z))
                    if rnd.random() < 0.32 and 0 <= gc < GW and 0 <= gr < GH and not ANT[gr, gc] and DIR[gr, gc] and not perto_cruzamento(x, z, r['larg'] / 2 + 10):
                        carros.append([round(x, 2), round(z, 2), round(math.atan2(-T[0], -T[1]) + (math.pi if lado < 0 else 0), 3), rnd.randrange(10)])
                        s += rnd.uniform(18, 40)
                    s += rnd.uniform(8, 25)

    # Árvores nos parques e matas
    ys, xs_ = np.nonzero(VERDE & VIS & ~RUA & ~ANT)
    if len(xs_) and not REAL_ARV:
        n = int(len(xs_) / 140)
        escolha = np.random.default_rng(7).choice(len(xs_), size=min(n, 2600), replace=False)
        for k in escolha:
            arvores.append([round(X0 + xs_[k] + 0.5, 2), round(Z0 + ys[k] + 0.5, 2), 1 if rnd.random() < 0.15 else 0, round(rnd.uniform(0.9, 1.5), 2)])

    # Placas de nome de rua nas esquinas (duas ruas com nome que se cruzam)
    vistos = set()
    por_no = {}
    for r in ruas:
        for i, n in enumerate(r['ids']):
            por_no.setdefault(n, []).append(r)
    for nid, k in uso_no.items():
        if k < 2 or nid not in P:
            continue
        rs = [r for r in ruas if nid in r['ids'] and r['nome']]
        nomes_aqui = sorted({r['nome'] for r in rs})
        if len(nomes_aqui) < 2:
            continue
        chave = tuple(nomes_aqui[:2])
        x, z = P[nid]
        if not dentro_vis(x, z) or na_faixa_antiga(x, z) or (chave, round(x / 30), round(z / 30)) in vistos:
            continue
        vistos.add((chave, round(x / 30), round(z / 30)))
        ra = next(r for r in rs if r['nome'] == chave[0])
        larg = max(r['larg'] for r in rs)
        # Direção da primeira rua no cruzamento
        i = ra['ids'].index(nid) if nid in ra['ids'] else 0
        pa = P[ra['ids'][max(0, i - 1)]]
        pb = P[ra['ids'][min(len(ra['ids']) - 1, i + 1)]]
        ang = math.atan2(pb[0] - pa[0], pb[1] - pa[1])
        dd = larg / 2 + 2.2
        px, pz = x + math.cos(ang) * dd + math.sin(ang) * dd, z - math.sin(ang) * dd + math.cos(ang) * dd
        placas.append([round(px, 2), round(pz, 2), round(ang, 3), idx_nome(chave[0]), idx_nome(chave[1])])

    # Cavaletes onde a área dirigível acaba
    barreiras = []
    for r in ruas:
        pts = densificar(r['pts'], 2.0)
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            ca, ra_ = int(gx(a[0])), int(gz(a[1]))
            cb, rb = int(gx(b[0])), int(gz(b[1]))
            if not (0 <= ca < GW and 0 <= ra_ < GH and 0 <= cb < GW and 0 <= rb < GH):
                continue
            if DIR[ra_, ca] != DIR[rb, cb]:
                ang = math.atan2(b[0] - a[0], b[1] - a[1])
                barreiras.append([round((a[0] + b[0]) / 2, 2), round((a[1] + b[1]) / 2, 2), round(ang, 3), round(r['larg'] + 2 * r['calc'], 2)])

    # ---------------- Máscara de onde dá pra andar e dirigir ----------------
    # 0 = bloqueado, 1 = aberto (rua + calçada dentro da área dirigível), 2 = cenário antigo (usa as regras dele)
    masc = np.zeros((GH, GW), np.uint8)
    PROT = np.zeros((GH, GW), bool)
    PROT[idx[prot, 0], idx[prot, 1]] = True
    ABERTO_ANT = np.zeros((GH, GW), bool)
    ABERTO_ANT[idx[aberto_antigo, 0], idx[aberto_antigo, 1]] = True
    masc[RUA & DIR] = 1
    masc[PROT & ~RUA] = 0
    masc[ABERTO_ANT] = 2
    im = Image.fromarray(masc * 127)
    buf = io.BytesIO()
    im.save(buf, format='PNG', optimize=True)
    mascara_png = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    print('máscara png', len(buf.getvalue()) // 1024, 'KB')

    # ---------------- Saída ----------------
    def plano(pts):
        out = []
        for x, z in pts:
            out += [round(x, 1), round(z, 1)]
        return out

    dados = {
        'versao': 1,
        'fonte': ('Ruas: © colaboradores do OpenStreetMap (ODbL). Construções: Google Open Buildings v3 (CC BY 4.0) + Microsoft Building Footprints (ODbL), via VIDA/Source Cooperative. Árvores: Meta & WRI High Resolution Canopy Height Maps (CC BY 4.0).' if REAL else '© colaboradores do OpenStreetMap (ODbL). Lotes e casas preenchidos por sorteio.'),
        'ancora': {'lat': ANCORA_LL[0], 'lon': ANCORA_LL[1], 'rumo': RUMO, 'ajuste': [AJ_X, AJ_Z]},
        'caixa': [X0, Z0, GW, GH],
        'mascara': mascara_png,
        'nomes': nomes,
        'ruas': [[r['tipo'], round(r['larg'], 1), round(r['calc'], 1), idx_nome(r['nome']), 1 if r['mao'] else 0, plano(r['pts'])] for r in ruas],
        'areas': [[a['t'], plano(a['p'])] for a in areas],
        'rios': [[round(rr['l'], 1), plano(rr['p'])] for rr in rios],
        'predios': [[round(b['n'], 1), b['t'], plano(b['p'])] for b in predios],
        'lotes': lotes,
        'casas': casas,
        'muros': muros,
        'arvores': arvores,
        'postes': postes,
        'carros': carros,
        'placas': placas,
        'barreiras': barreiras,
        'cruz': [[round(x, 1), round(z, 1)] for x, z in cruzamentos if dentro_vis(x, z)],
        'dirigivel': {'fv': R_DIR[0], 'msr': R_DIR[1]},
    }
    saida = os.path.join(RAIZ, 'data', 'bairro_curitiba.js')
    with open(saida, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Gerado por ferramentas/gerar_bairro.py — bairro em volta da R. Mercedes Seiler Rocha até a R. Fagundes Varela (Curitiba).\n')
        f.write('// Ruas, rios, parques: © colaboradores do OpenStreetMap (ODbL, https://www.openstreetmap.org/copyright).\n')
        if REAL:
            f.write('// Construções: Google Open Buildings v3 (CC BY 4.0) e Microsoft Building Footprints (ODbL), via VIDA / Source Cooperative.\n')
            f.write('// Árvores: Meta & World Resources Institute, High Resolution Canopy Height Maps (CC BY 4.0).\n')
        f.write('window.__LUIGGI_BAIRRO = ')
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('gravado', saida, os.path.getsize(saida) // 1024, 'KB')
    print('casas reais %d, muros %d' % (len(casas), len(muros)))
    print('ruas %d, lotes %d, árvores %d, postes %d, carros %d, placas %d, barreiras %d, prédios OSM %d, áreas %d, rios %d' % (
        len(ruas), len(lotes), len(arvores), len(postes), len(carros), len(placas), len(barreiras), len(predios), len(areas), len(rios)))


if __name__ == '__main__':
    main()
