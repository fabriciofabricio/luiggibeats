/**
 * src/engine/BairroCuritiba3D.js
 * O bairro em volta da casa (Bacacheri / Jardim Social, Curitiba) até o começo e o fim da R. Fagundes Varela,
 * montado a partir de data/bairro_curitiba.js (gerado por ferramentas/gerar_bairro.py com dados do OpenStreetMap).
 *
 * Desempenho: tudo é juntado em poucas malhas. As casas, muros, árvores, postes, fios e carros ficam em blocos de
 * 160 m que somem quando estão longe da câmera (e a neblina esconde a borda). Ruas, calçadas e faixas são uma
 * malha só cada. Colisão: uma máscara de 1 m (rua + calçada) vira um campo de distância, e o carro/boneco
 * escorrega suave nos muros; árvores, postes e carros parados ficam num índice espacial.
 *
 * Uso (o RuaSafepoint3D chama sozinho com { bairro: true }):
 *   const b = LuiggiBairro.construir();  raiz.add(b.group);
 *   b.atualizar(xCena, zCena);  b.limitar(x, z, raio);  b.obstaculosPerto(x, z, r);  b.nomeDaRua(x, z)
 */
(function (root) {
  'use strict';

  const T = () => root.THREE;
  const L = () => root.Luiggi3D;
  const BLOCO = 160;
  // Até onde os blocos aparecem: vem do nível de gráfico (a neblina acompanha)
  const longe = () => root.Luiggi3D?.perfilQualidade?.().distancia || 290;

  function prng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pares = (f) => {
    const o = [];
    for (let i = 0; i + 1 < f.length; i += 2) o.push([f[i], f[i + 1]]);
    return o;
  };

  // ------------------------------------------------------------------
  // Texturas (canvas)
  // ------------------------------------------------------------------
  function tex(w, h, desenhar, rep = true) {
    const THREE = T();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    desenhar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function pontilhar(ctx, w, h, n, cores, r, rnd) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cores[i % cores.length];
      const k = r[0] + rnd() * (r[1] - r[0]);
      ctx.fillRect(rnd() * w, rnd() * h, k, k);
    }
  }
  const TEX = {};
  function texturas() {
    if (TEX.pronto) return TEX;
    const rnd = prng(77);
    TEX.asfalto = tex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#65686d';
      ctx.fillRect(0, 0, w, h);
      pontilhar(ctx, w, h, 9000, ['#6f7277', '#5b5e63', '#7a7d82', '#53565b', '#84878b'], [1, 2.5], rnd);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = 'rgba(35,35,40,0.3)';
        ctx.beginPath();
        let x = rnd() * w;
        let y = rnd() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) ctx.lineTo((x += (rnd() - 0.5) * 40), (y += (rnd() - 0.5) * 40));
        ctx.stroke();
      }
    });
    TEX.calcada = tex(256, 256, (ctx, w, h) => {
      // Paver (bloquete) cinza, como nas calçadas da Fagundes Varela
      ctx.fillStyle = '#7d7a74';
      ctx.fillRect(0, 0, w, h);
      const bw = 32;
      const bh = 16;
      for (let y = 0, row = 0; y < h; y += bh, row++) {
        for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
          const v = 150 + Math.floor(rnd() * 30);
          ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
          ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        }
      }
      pontilhar(ctx, w, h, 1500, ['rgba(0,0,0,0.1)', 'rgba(255,255,255,0.08)'], [1, 2], rnd);
    });
    TEX.grama = tex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#6a8e3c';
      ctx.fillRect(0, 0, w, h);
      pontilhar(ctx, w, h, 6500, ['#5c8233', '#7ba248', '#54782e', '#88ad55', '#4b6c29', '#93b45e'], [1, 3], rnd);
    });
    TEX.telha = tex(128, 128, (ctx, w, h) => {
      // Telha clara (tingida pela cor de cada telhado)
      for (let y = 0; y < h; y += 16) {
        for (let x = 0; x < w; x += 16) {
          const g = ctx.createLinearGradient(x, 0, x + 16, 0);
          const v = 200 + Math.floor(rnd() * 40);
          g.addColorStop(0, `rgb(${v - 70},${v - 70},${v - 70})`);
          g.addColorStop(0.5, `rgb(${v},${v},${v})`);
          g.addColorStop(1, `rgb(${v - 70},${v - 70},${v - 70})`);
          ctx.fillStyle = g;
          ctx.fillRect(x, y, 16, 16);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, y + 13, w, 3);
      }
    });
    TEX.grade = tex(128, 128, (ctx, w, h) => {
      // Grade de ferro (barras verticais), com transparência
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (let x = 2; x < w; x += 16) ctx.fillRect(x, 0, 5, h);
      ctx.fillRect(0, 4, w, 7);
      ctx.fillRect(0, h - 14, w, 7);
    });
    // Fachadas (atlas 4x2 de 256 px): cada célula é um "vão" de parede de ~3,6 m x 2,9 m
    TEX.fachada = tex(1024, 512, (ctx) => {
      const C = 256;
      const celula = (i, j, f) => {
        ctx.save();
        ctx.translate(i * C, j * C);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, C, C);
        pontilhar(ctx, C, C, 600, ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.03)'], [1, 3], rnd);
        f(ctx);
        ctx.restore();
      };
      const janela = (x, y, w, h, grade = true) => {
        ctx.fillStyle = '#e8e4dc';
        ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, '#3c4f63');
        g.addColorStop(0.55, '#7d93a8');
        g.addColorStop(1, '#2e3c4c');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#d9d6cf';
        ctx.fillRect(x + w / 2 - 2, y, 4, h);
        ctx.fillRect(x - 8, y + h + 4, w + 16, 6);
        if (grade) {
          ctx.fillStyle = 'rgba(30,30,32,0.85)';
          for (let k = x + 8; k < x + w; k += 14) ctx.fillRect(k, y, 3, h);
        }
      };
      // 0: janela residencial com grade
      celula(0, 0, () => janela(70, 70, 116, 96));
      // 1: porta de madeira + janelinha
      celula(1, 0, () => {
        ctx.fillStyle = '#e8e4dc';
        ctx.fillRect(84, 74, 88, 182);
        ctx.fillStyle = '#7a4b2a';
        ctx.fillRect(92, 82, 72, 174);
        ctx.fillStyle = '#5d3920';
        for (let y = 96; y < 250; y += 26) ctx.fillRect(98, y, 60, 3);
        ctx.fillStyle = '#d4b04a';
        ctx.fillRect(148, 168, 8, 8);
      });
      // 2: janela do andar de cima com sacadinha
      celula(2, 0, () => {
        janela(60, 50, 136, 130, false);
        ctx.fillStyle = 'rgba(40,40,42,0.9)';
        ctx.fillRect(46, 160, 164, 6);
        for (let k = 50; k < 210; k += 12) ctx.fillRect(k, 160, 3, 52);
        ctx.fillRect(46, 210, 164, 5);
      });
      // 3: vitrine de loja com toldo
      celula(3, 0, () => {
        ctx.fillStyle = '#2b3138';
        ctx.fillRect(14, 70, 228, 186);
        const g = ctx.createLinearGradient(0, 70, 0, 256);
        g.addColorStop(0, '#8fb3cc');
        g.addColorStop(1, '#3e566b');
        ctx.fillStyle = g;
        ctx.fillRect(22, 78, 212, 178);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(40, 90, 30, 150);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(0, 34, 256, 28);
        ctx.fillStyle = '#fdba74';
        for (let k = 0; k < 256; k += 32) ctx.fillRect(k, 34, 16, 28);
      });
      // 4: porta de enrolar (comércio fechado)
      celula(0, 1, () => {
        ctx.fillStyle = '#9aa0a6';
        ctx.fillRect(18, 60, 220, 196);
        ctx.fillStyle = '#7c8288';
        for (let y = 64; y < 256; y += 10) ctx.fillRect(18, y, 220, 3);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(18, 52, 220, 10);
      });
      // 5: janela de prédio com sacada de vidro
      celula(1, 1, () => {
        janela(40, 40, 176, 150, false);
        ctx.fillStyle = 'rgba(160,200,220,0.55)';
        ctx.fillRect(26, 170, 204, 60);
        ctx.fillStyle = '#d4d4d4';
        ctx.fillRect(20, 228, 216, 10);
      });
      // 6: parede lisa
      celula(2, 1, () => { });
      // 7: janelinha alta (banheiro/lateral)
      celula(3, 1, () => janela(96, 62, 64, 40, false));
    });
    TEX.pronto = true;
    return TEX;
  }

  // ------------------------------------------------------------------
  // Acumulador de geometria (posição, normal, uv, cor)
  // ------------------------------------------------------------------
  function Buf() {
    return { p: [], n: [], u: [], c: [], i: [] };
  }
  function geoDe(b) {
    const THREE = T();
    if (!b.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    if (b.u.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
    if (b.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    if (b.i.length) g.setIndex(b.i);
    g.computeBoundingSphere();
    return g;
  }
  /** Quadrilátero a,b,c,d (anti-horário visto de fora). */
  function quad(b, a, bb, c, d, uv, cor) {
    const base = b.p.length / 3;
    const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    [a, bb, c, d].forEach((p, k) => {
      b.p.push(p[0], p[1], p[2]);
      b.n.push(nx, ny, nz);
      b.u.push(uv[k * 2], uv[k * 2 + 1]);
      b.c.push(cor[0], cor[1], cor[2]);
    });
    b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function tri(b, a, bb, c, uv, cor) {
    const base = b.p.length / 3;
    const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    [a, bb, c].forEach((p, k) => {
      b.p.push(p[0], p[1], p[2]);
      b.n.push(nx / l, ny / l, nz / l);
      b.u.push(uv[k * 2], uv[k * 2 + 1]);
      b.c.push(cor[0], cor[1], cor[2]);
    });
    b.i.push(base, base + 1, base + 2);
  }
  /** Caixa alinhada a um referencial (origem o, eixos T e N no chão); k = ao longo de T, d = ao longo de N. */
  function caixa(b, o, Tv, Nv, k0, k1, d0, d1, y0, y1, uvCel, cor, rep) {
    const P = (k, d, y) => [o[0] + Tv[0] * k + Nv[0] * d, y, o[1] + Tv[1] * k + Nv[1] * d];
    // Normais pra fora: frente (d0) olha pra -N, fundos pra +N, lado k1 pra +T, lado k0 pra -T
    const faces = [
      [P(k1, d0, y0), P(k0, d0, y0), P(k0, d0, y1), P(k1, d0, y1), k1 - k0],
      [P(k0, d1, y0), P(k1, d1, y0), P(k1, d1, y1), P(k0, d1, y1), k1 - k0],
      [P(k1, d1, y0), P(k1, d0, y0), P(k1, d0, y1), P(k1, d1, y1), d1 - d0],
      [P(k0, d0, y0), P(k0, d1, y0), P(k0, d1, y1), P(k0, d0, y1), d1 - d0]
    ];
    faces.forEach(([a, bb, c, d, larg]) => {
      const u1 = rep ? larg / rep : 1;
      quad(b, a, bb, c, d, celulaUV(uvCel, u1, rep ? (y1 - y0) / rep : 1), cor);
    });
    quad(b, P(k0, d0, y1), P(k0, d1, y1), P(k1, d1, y1), P(k1, d0, y1), celulaUV(uvCel, 1, 1), cor);
  }
  // UV de uma célula do atlas de fachadas (4x2); u/v até 1 (sem repetir: o atlas não repete dentro da célula)
  function celulaUV(cel, fu = 1, fv = 1) {
    if (cel < 0) return [0, 0, fu, 0, fu, fv, 0, fv];
    const i = cel % 4;
    const j = Math.floor(cel / 4);
    const u0 = i / 4 + 0.002;
    const u1 = (i + Math.min(1, fu)) / 4 - 0.002;
    const v1 = 1 - j / 2 - 0.002;
    const v0 = 1 - (j + Math.min(1, fv)) / 2 + 0.002;
    return [u0, v0, u1, v0, u1, v1, u0, v1];
  }
  const cor3 = (hex) => {
    const c = new (T().Color)(hex);
    return [c.r, c.g, c.b];
  };

  // Paletas
  const PAREDES = ['#f4f1ea', '#ece4d4', '#e8dcc4', '#f2e6c9', '#d9d4cc', '#efe0c8', '#e3d1b5', '#cfd8dc', '#f0d9c0', '#e9c9a8', '#d8c3a5', '#f7f7f2'];
  const TELHADOS = ['#a5442b', '#6e3b2a', '#8a8f94', '#b8b2a6'];
  const GRADES = ['#f5f5f4', '#f5f5f4', '#1f2023', '#1f2023', '#2f5d3a'];
  const CARROS = ['#e5e7eb', '#9ca3af', '#111827', '#7f1d1d', '#1e3a8a', '#d1d5db', '#374151', '#b91c1c', '#f8fafc', '#475569'];

  // ------------------------------------------------------------------
  // Casas (lote: [fx, fz, ang, w, recuo, larguraCasa, profCasa, andares, estilo, cor, telhado, muro, desloc, semente])
  // ------------------------------------------------------------------
  function casa(bloco, L0) {
    const [fx, fz, ang, w, recuo, lc, pc, andares, estilo, corI, telI, muroT, desl, seed] = L0;
    const rnd = prng(seed + 1);
    const Nv = [Math.sin(ang), Math.cos(ang)]; // pra dentro do lote
    const Tv = [Nv[1], -Nv[0]];
    const o = [fx, fz];
    const P = (k, d, y) => [o[0] + Tv[0] * k + Nv[0] * d, y, o[1] + Tv[1] * k + Nv[1] * d];
    const corParede = cor3(estilo === 3 && rnd() < 0.4 ? ['#fde68a', '#bfdbfe', '#fecaca', '#d9f99d'][Math.floor(rnd() * 4)] : PAREDES[corI % PAREDES.length]);
    const pe = estilo === 2 ? 2.9 : 2.85;
    const altura = andares * pe + (estilo === 2 ? 0.4 : 0.25);
    const k0 = desl - lc / 2;
    const k1 = desl + lc / 2;
    const d0 = recuo;
    const d1 = recuo + pc;
    const B = bloco.paredes;
    // Fachada dividida em vãos (cada vão = uma célula do atlas)
    const parede = (ka, kb, dA, dB, celPorAndar, frente) => {
      const larg = Math.hypot(kb - ka, dB - dA);
      const nv = Math.max(1, Math.round(larg / 3.6));
      for (let a = 0; a < andares; a++) {
        const y0 = a * pe;
        const y1 = a === andares - 1 ? altura : (a + 1) * pe;
        for (let v = 0; v < nv; v++) {
          const t0 = v / nv;
          const t1 = (v + 1) / nv;
          const pa = P(ka + (kb - ka) * t0, dA + (dB - dA) * t0, y0);
          const pb = P(ka + (kb - ka) * t1, dA + (dB - dA) * t1, y0);
          const pc_ = P(ka + (kb - ka) * t1, dA + (dB - dA) * t1, y1);
          const pd = P(ka + (kb - ka) * t0, dA + (dB - dA) * t0, y1);
          const cel = celPorAndar(a, v, nv);
          quad(B, pa, pb, pc_, pd, celulaUV(cel, 1, Math.min(1, (y1 - y0) / pe)), corParede);
        }
      }
      return frente;
    };
    const porta = Math.floor(rnd() * 3);
    // Frente (olha pra rua, -N): vista de fora vai de k1 para k0
    parede(k1, k0, d0, d0, (a, v, nv) => {
      if (estilo === 3) return a === 0 ? (rnd() < 0.75 ? 3 : 4) : 2;
      if (estilo === 2) return 5;
      if (a === 0) return v === porta % nv ? 1 : 0;
      return 2;
    });
    // Fundos
    parede(k0, k1, d1, d1, (a) => (estilo === 2 ? 5 : a === 0 ? 0 : 7));
    // Laterais
    parede(k0, k0, d0, d1, (a, v) => (estilo === 2 ? (v % 2 ? 5 : 6) : v % 2 ? 7 : 6));
    parede(k1, k1, d1, d0, (a, v) => (estilo === 2 ? (v % 2 ? 6 : 5) : v % 2 ? 6 : 7));

    // Telhado
    const corTel = cor3(TELHADOS[telI % TELHADOS.length]);
    const beiral = 0.55;
    const ka = k0 - beiral, kb = k1 + beiral, da = d0 - beiral, db = d1 + beiral;
    if (telI === 3 || estilo === 2) {
      // Laje com platibanda
      caixa(B, o, Tv, Nv, k0 - 0.05, k1 + 0.05, d0 - 0.05, d0 + 0.15, altura, altura + 0.7, 6, corParede);
      caixa(B, o, Tv, Nv, k0 - 0.05, k1 + 0.05, d1 - 0.15, d1 + 0.05, altura, altura + 0.7, 6, corParede);
      caixa(B, o, Tv, Nv, k0 - 0.05, k0 + 0.15, d0, d1, altura, altura + 0.7, 6, corParede);
      caixa(B, o, Tv, Nv, k1 - 0.15, k1 + 0.05, d0, d1, altura, altura + 0.7, 6, corParede);
      quad(bloco.telhados, P(k0, d0, altura + 0.05), P(k0, d1, altura + 0.05), P(k1, d1, altura + 0.05), P(k1, d0, altura + 0.05), [0, 0, pc / 2, 0, pc / 2, lc / 2, 0, lc / 2], cor3('#a8a39a'));
      if (estilo === 2) {
        // Caixa d'água / casa de máquinas
        const km = desl + (rnd() - 0.5) * lc * 0.4;
        const dm = (d0 + d1) / 2;
        caixa(B, o, Tv, Nv, km - 1.6, km + 1.6, dm - 1.4, dm + 1.4, altura, altura + 2.4, 6, corParede);
      }
    } else {
      const inclin = telI === 2 ? 0.28 : 0.5;
      const larguraK = kb - ka;
      const profD = db - da;
      const yb = altura;
      const curto = Math.min(larguraK, profD);
      const h = (curto / 2) * inclin;
      const r = (k, d) => P(k, d, yb);
      const tu = 0.4; // repetições da textura por metro
      if (larguraK >= profD) {
        // Cumeeira ao longo de k
        const kc0 = ka + profD / 2;
        const kc1 = kb - profD / 2;
        const dm = (da + db) / 2;
        const c0 = P(kc0, dm, yb + h);
        const c1 = P(kc1, dm, yb + h);
        quad(bloco.telhados, r(kb, da), r(ka, da), c0, c1, [larguraK * tu, 0, 0, 0, profD * 0.25 * tu, h * 2 * tu, (larguraK - profD * 0.25) * tu, h * 2 * tu], corTel);
        quad(bloco.telhados, r(ka, db), r(kb, db), c1, c0, [0, 0, larguraK * tu, 0, (larguraK - profD * 0.25) * tu, h * 2 * tu, profD * 0.25 * tu, h * 2 * tu], corTel);
        tri(bloco.telhados, r(ka, da), r(ka, db), c0, [0, 0, profD * tu, 0, profD * 0.5 * tu, h * 2 * tu], corTel);
        tri(bloco.telhados, r(kb, db), r(kb, da), c1, [0, 0, profD * tu, 0, profD * 0.5 * tu, h * 2 * tu], corTel);
      } else {
        const dc0 = da + larguraK / 2;
        const dc1 = db - larguraK / 2;
        const km = (ka + kb) / 2;
        const c0 = P(km, dc0, yb + h);
        const c1 = P(km, dc1, yb + h);
        quad(bloco.telhados, r(ka, da), r(ka, db), c1, c0, [0, 0, profD * tu, 0, (profD - larguraK * 0.25) * tu, h * 2 * tu, larguraK * 0.25 * tu, h * 2 * tu], corTel);
        quad(bloco.telhados, r(kb, db), r(kb, da), c0, c1, [0, 0, profD * tu, 0, (profD - larguraK * 0.25) * tu, h * 2 * tu, larguraK * 0.25 * tu, h * 2 * tu], corTel);
        tri(bloco.telhados, r(kb, da), r(ka, da), c0, [0, 0, larguraK * tu, 0, larguraK * 0.5 * tu, h * 2 * tu], corTel);
        tri(bloco.telhados, r(ka, db), r(kb, db), c1, [0, 0, larguraK * tu, 0, larguraK * 0.5 * tu, h * 2 * tu], corTel);
      }
      // Forro do beiral (pra não ver o vazio por baixo)
      quad(bloco.telhados, r(ka, da), r(kb, da), r(kb, db), r(ka, db), [0, 0, 1, 0, 1, 1, 0, 1], corTel.map((v) => v * 0.6));
    }

    // Muro / grade da frente
    if (muroT) {
      const corMuro = cor3(rnd() < 0.6 ? '#f2f0ea' : PAREDES[Math.floor(rnd() * PAREDES.length)]);
      const corGrade = cor3(GRADES[Math.floor(rnd() * GRADES.length)]);
      const portao = 3.0;
      const ladoPortao = rnd() < 0.5 ? -1 : 1;
      const kp0 = ladoPortao < 0 ? -w / 2 + 0.6 : w / 2 - 0.6 - portao;
      const kp1 = kp0 + portao;
      const espessura = 0.18;
      const trechos = [[-w / 2, kp0], [kp1, w / 2]].filter(([a, b]) => b - a > 0.2);
      const hMuro = muroT === 1 ? 2.0 : muroT === 3 ? 0.8 : 0.35;
      const temGrade = muroT !== 1;
      trechos.forEach(([a, b]) => {
        caixa(B, o, Tv, Nv, a, b, 0, espessura, 0, hMuro, 6, corMuro);
        if (temGrade) gradeEntre(bloco, P, a, b, hMuro, 1.9, corGrade);
        // Pilares
        for (let k = a; k <= b + 0.01; k += Math.max(2.2, (b - a) / Math.max(1, Math.round((b - a) / 3)))) caixa(B, o, Tv, Nv, k - 0.17, k + 0.17, -0.05, espessura + 0.05, 0, temGrade ? 2.0 : 2.15, 6, corMuro);
      });
      // Portão de grade (garagem) e o batente
      gradeEntre(bloco, P, kp0, kp1, 0.05, 2.0, corGrade);
      if (muroT === 4) {
        // cerca viva (não usado ainda)
      }
      // Muros laterais até a casa
      if (rnd() < 0.75) {
        [-w / 2, w / 2].forEach((k) => caixa(B, o, Tv, Nv, k - 0.08, k + 0.08, espessura, d0 + pc * 0.7, 0, 1.9, 6, corMuro));
      }
    }
  }
  /**
   * Muro/grade na divisa do lote com a calçada, de A até B (gerado na frente de cada casa de verdade),
   * com portão de garagem de grade num dos lados.
   */
  function muroEntre(bloco, m) {
    const [x0, z0, x1, z1, muroT, seed] = m;
    const w = Math.hypot(x1 - x0, z1 - z0);
    if (w < 2) return;
    const rnd = prng(seed + 7);
    const Tv = [(x1 - x0) / w, (z1 - z0) / w];
    const Nv = [-Tv[1], Tv[0]];
    const o = [(x0 + x1) / 2, (z0 + z1) / 2];
    const P = (k, d, y) => [o[0] + Tv[0] * k + Nv[0] * d, y, o[1] + Tv[1] * k + Nv[1] * d];
    const B = bloco.paredes;
    const corMuro = cor3(rnd() < 0.6 ? '#f2f0ea' : PAREDES[Math.floor(rnd() * PAREDES.length)]);
    const corGrade = cor3(GRADES[Math.floor(rnd() * GRADES.length)]);
    const portao = Math.min(3.0, w * 0.4);
    const kp0 = rnd() < 0.5 ? -w / 2 + 0.6 : w / 2 - 0.6 - portao;
    const kp1 = kp0 + portao;
    const espessura = 0.18;
    const hMuro = muroT === 1 ? 2.0 : muroT === 3 ? 0.8 : 0.35;
    const temGrade = muroT !== 1;
    [[-w / 2, kp0], [kp1, w / 2]].filter(([a, b]) => b - a > 0.2).forEach(([a, b]) => {
      caixa(B, o, Tv, Nv, a, b, 0, espessura, 0, hMuro, 6, corMuro);
      if (temGrade) gradeEntre(bloco, P, a, b, hMuro, 1.9, corGrade);
      for (let k = a; k <= b + 0.01; k += Math.max(2.2, (b - a) / Math.max(1, Math.round((b - a) / 3)))) caixa(B, o, Tv, Nv, k - 0.17, k + 0.17, -0.05, espessura + 0.05, 0, temGrade ? 2.0 : 2.15, 6, corMuro);
    });
    gradeEntre(bloco, P, kp0, kp1, 0.05, 2.0, corGrade);
  }

  /** Grade vazada (textura com transparência) num trecho do lote, dos dois lados. */
  function gradeEntre(bloco, P, ka, kb, y0, y1, cor) {
    const larg = kb - ka;
    const uv = [0, 0, larg / 1.0, 0, larg / 1.0, 1, 0, 1];
    quad(bloco.grades, P(kb, 0.09, y0), P(ka, 0.09, y0), P(ka, 0.09, y1), P(kb, 0.09, y1), uv, cor);
    quad(bloco.grades, P(ka, 0.11, y0), P(kb, 0.11, y0), P(kb, 0.11, y1), P(ka, 0.11, y1), uv, cor);
  }

  /** Prédio do OSM: polígono extrudado com janelas de prédio e laje. */
  function predio(bloco, item, rnd) {
    const [niv, tipo, pl] = item;
    const pts = pares(pl);
    if (pts.length < 3) return;
    if (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    // Orientação anti-horária (vista de cima, com z pra baixo = horária na tela)
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (area < 0) pts.reverse();
    const pe = tipo === 2 ? 3.6 : 3.0;
    const andares = Math.max(1, Math.round(niv));
    const h = andares * pe;
    const corP = cor3(tipo === 2 ? '#c9ccd1' : tipo === 4 ? '#f1ede4' : PAREDES[Math.floor(rnd() * PAREDES.length)]);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const larg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nv = Math.max(1, Math.round(larg / 3.6));
      for (let f = 0; f < andares; f++) {
        for (let v = 0; v < nv; v++) {
          const t0 = v / nv;
          const t1 = (v + 1) / nv;
          const x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0;
          const x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1;
          const cel = tipo === 1 ? 5 : tipo === 2 ? (f === andares - 1 && v % 2 ? 7 : 6) : tipo === 3 && f === 0 ? (v % 3 === 0 ? 4 : 3) : tipo === 0 ? (f === 0 ? 0 : 2) : v % 2 ? 7 : 5;
          quad(bloco.paredes, [x1, f * pe, z1], [x0, f * pe, z0], [x0, (f + 1) * pe, z0], [x1, (f + 1) * pe, z1], celulaUV(cel), corP);
        }
      }
    }
    // Laje (triangulada)
    const THREE = T();
    const contorno = pts.map(([x, z]) => new THREE.Vector2(x, z));
    let tris = [];
    try {
      tris = THREE.ShapeUtils.triangulateShape(contorno, []);
    } catch (_) {
      tris = [];
    }
    const corL = cor3(tipo === 2 ? '#9aa0a6' : '#b3aea5');
    tris.forEach(([i0, i1, i2]) => {
      const a = pts[i0];
      let b = pts[i1];
      let c = pts[i2];
      // Normal pra cima
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0) [b, c] = [c, b];
      tri(bloco.telhados, [a[0], h + 0.02, a[1]], [b[0], h + 0.02, b[1]], [c[0], h + 0.02, c[1]], [a[0] / 3, a[1] / 3, b[0] / 3, b[1] / 3, c[0] / 3, c[1] / 3], corL);
    });
  }

  // ------------------------------------------------------------------
  // Ruas (fitas) — uma malha só pra cada material
  // ------------------------------------------------------------------
  function fita(b, pts, off0, off1, y, uvMundo, cor, escalaUV = 4) {
    if (pts.length < 2) return;
    const n = pts.length;
    const nor = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const c = pts[Math.min(n - 1, i + 1)];
      let tx = c[0] - a[0];
      let tz = c[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
      // Miter: corrige o deslocamento nas curvas
      let k = 1;
      if (i > 0 && i < n - 1) {
        const ax = pts[i][0] - pts[i - 1][0], az = pts[i][1] - pts[i - 1][1];
        const la = Math.hypot(ax, az) || 1;
        const cs = (ax / la) * tx + (az / la) * tz;
        k = 1 / Math.max(0.5, cs);
      }
      nor.push([-tz * k, tx * k]);
    }
    let s = 0;
    const base = b.p.length / 3;
    for (let i = 0; i < n; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const [nx, nz] = nor[i];
      const pA = [pts[i][0] + nx * off0, y, pts[i][1] + nz * off0];
      const pB = [pts[i][0] + nx * off1, y, pts[i][1] + nz * off1];
      b.p.push(...pA, ...pB);
      b.n.push(0, 1, 0, 0, 1, 0);
      if (uvMundo) b.u.push(pA[0] / escalaUV, pA[2] / escalaUV, pB[0] / escalaUV, pB[2] / escalaUV);
      else b.u.push(s / escalaUV, 0, s / escalaUV, 1);
      if (cor) b.c.push(...cor, ...cor);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      // fita com normal pra cima: (a, a+2, a+1) e (a+1, a+2, a+3), conforme o lado
      if (off1 > off0) b.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else b.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  function construir(o = {}) {
    const THREE = T();
    const D = o.dados || root.__LUIGGI_BAIRRO;
    if (!D || !THREE) return null;
    const M = L().M;
    const TX = texturas();
    const group = new THREE.Group();
    group.name = 'bairro';
    const rnd = prng(2025);
    const [X0, Z0, GW, GH] = D.caixa;

    // ---------------- Materiais ----------------
    const rep = (t, n) => {
      const c = t.clone();
      c.needsUpdate = true;
      c.repeat.set(n, n);
      return c;
    };
    // Materiais Lambert (bem mais leves que os PBR, e o bairro é grande)
    const lam = (o2) => new THREE.MeshLambertMaterial(o2);
    const matChao = lam({ color: '#ffffff', map: rep(TX.grama, 1) });
    const matAsfalto = lam({ color: '#ffffff', map: TX.asfalto });
    const matCalcada = lam({ color: '#ffffff', map: TX.calcada });
    const matMeioFio = lam({ color: '#c9c6bf' });
    const matFaixa = lam({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const matParede = lam({ map: TX.fachada, vertexColors: true });
    const matTelhado = lam({ map: TX.telha, vertexColors: true });
    const matGrade = lam({ map: TX.grade, vertexColors: true, alphaTest: 0.4, side: THREE.DoubleSide });
    const matVerde = lam({ color: '#7aa354', map: rep(TX.grama, 1) });
    const matMata = lam({ color: '#4f7a35', map: rep(TX.grama, 1) });
    const matCampo = lam({ color: '#5e9a44', map: rep(TX.grama, 1) });
    const matAgua = M.std('#4f7fa8', 0.25, 0.1);
    [matParede, matTelhado, matGrade, matFaixa].forEach((m) => {
      if ('colorSpace' in (m.map || {})) m.map.colorSpace = THREE.SRGBColorSpace;
    });

    // ---------------- Chão (grama) ----------------
    const chaoGeo = new THREE.PlaneGeometry(GW, GH, 1, 1);
    chaoGeo.rotateX(-Math.PI / 2);
    const uvc = chaoGeo.attributes.uv;
    for (let i = 0; i < uvc.count; i++) uvc.setXY(i, uvc.getX(i) * (GW / 6), uvc.getY(i) * (GH / 6));
    const chao = new THREE.Mesh(chaoGeo, matChao);
    chao.position.set(X0 + GW / 2, -0.07, Z0 + GH / 2);
    chao.receiveShadow = true;
    chao.userData.noOutline = true;
    group.add(chao);

    // ---------------- Ruas, calçadas, meio-fio, faixas ----------------
    const bAsf = Buf();
    const bCalc = Buf();
    const bFio = Buf();
    const bFaixa = Buf();
    const cruz = D.cruz || [];
    const pertoCruz = (x, z, r) => cruz.some((c) => (c[0] - x) * (c[0] - x) + (c[1] - z) * (c[1] - z) < r * r);
    const amarelo = cor3('#f2b632');
    const branco = cor3('#f1f1ee');
    const ruas = D.ruas.map(([tipo, larg, calc, nome, mao, pl]) => ({ tipo, larg, calc, nome, mao, pts: pares(pl) }));
    ruas.forEach((r) => {
      const h = r.larg / 2;
      fita(bAsf, r.pts, -h, h, 0.012, true, null, 4);
      if (r.calc > 0.5) {
        // Faixa de grama junto ao meio-fio (o chão aparece) e calçada de paver até o lote
        const g = Math.min(1.0, r.calc * 0.3);
        fita(bCalc, r.pts, h + g, h + r.calc + 0.6, 0.005, true, null, 3);
        fita(bCalc, r.pts, -h - g, -h - r.calc - 0.6, 0.005, true, null, 3);
        fita(bFio, r.pts, h, h + 0.16, 0.009, true, null, 2);
        fita(bFio, r.pts, -h, -h - 0.16, 0.009, true, null, 2);
      }
      // Pintura: faixa dupla amarela nas avenidas, tracejada nas outras de mão dupla
      if (r.tipo <= 3 && !r.mao && r.larg >= 7) {
        const L_ = r.pts.length;
        let trecho = [];
        const fechar = () => {
          if (trecho.length >= 2) {
            if (r.tipo === 2 || r.tipo <= 1) {
              fita(bFaixa, trecho, -0.2, -0.08, 0.02, false, amarelo, 1);
              fita(bFaixa, trecho, 0.08, 0.2, 0.02, false, amarelo, 1);
            } else fita(bFaixa, trecho, -0.06, 0.06, 0.02, false, amarelo, 1);
          }
          trecho = [];
        };
        for (let i = 0; i < L_; i++) {
          const p = r.pts[i];
          if (pertoCruz(p[0], p[1], r.larg / 2 + 5)) fechar();
          else trecho.push(p);
        }
        fechar();
      } else if (r.mao && r.larg >= 7) {
        // Mão única larga: tracejado branco no meio
        let s = 0;
        for (let i = 1; i < r.pts.length; i++) {
          const a = r.pts[i - 1];
          const b = r.pts[i];
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let t = (4 - (s % 8) + 8) % 8; t < l; t += 8) {
            const x = a[0] + ((b[0] - a[0]) * t) / l;
            const z = a[1] + ((b[1] - a[1]) * t) / l;
            if (pertoCruz(x, z, r.larg / 2 + 4)) continue;
            const e = Math.min(3, l - t);
            const x2 = a[0] + ((b[0] - a[0]) * (t + e)) / l;
            const z2 = a[1] + ((b[1] - a[1]) * (t + e)) / l;
            fita(bFaixa, [[x, z], [x2, z2]], -0.07, 0.07, 0.02, false, branco, 1);
          }
          s += l;
        }
      }
    });
    const addMalha = (b, mat, nome, sombra = false) => {
      const g = geoDe(b);
      if (!g) return null;
      const m = new THREE.Mesh(g, mat);
      m.name = nome;
      m.receiveShadow = true;
      m.castShadow = sombra;
      m.userData.noOutline = true;
      group.add(m);
      return m;
    };
    addMalha(bCalc, matCalcada, 'calcadas');
    addMalha(bFio, matMeioFio, 'meio-fio');
    addMalha(bAsf, matAsfalto, 'asfalto');
    addMalha(bFaixa, matFaixa, 'faixas');

    // ---------------- Parques, matas, campos, água, rios ----------------
    const bVerde = Buf(), bMata = Buf(), bCampo = Buf(), bAgua = Buf();
    (D.areas || []).forEach(([t, pl]) => {
      const pts = pares(pl);
      if (pts.length < 3) return;
      if (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      let tris = [];
      try {
        tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
      } catch (_) {
        return;
      }
      const b = t === 3 ? bAgua : t === 1 ? bMata : t === 2 ? bCampo : bVerde;
      const y = t === 3 ? 0.015 : 0.002 + t * 0.0005;
      tris.forEach(([i0, i1, i2]) => {
        const a = pts[i0], bb = pts[i1], c = pts[i2];
        // Garante normal pra cima
        const cr = (bb[0] - a[0]) * (c[1] - a[1]) - (bb[1] - a[1]) * (c[0] - a[0]);
        const [p1, p2] = cr > 0 ? [c, bb] : [bb, c];
        tri(b, [a[0], y, a[1]], [p1[0], y, p1[1]], [p2[0], y, p2[1]], [a[0] / 6, a[1] / 6, p1[0] / 6, p1[1] / 6, p2[0] / 6, p2[1] / 6], [1, 1, 1]);
      });
    });
    (D.rios || []).forEach(([l, pl]) => {
      const pts = pares(pl);
      fita(bMata, pts, -l / 2 - 3, l / 2 + 3, 0.003, true, [1, 1, 1], 6);
      fita(bAgua, pts, -l / 2, l / 2, 0.016, true, [1, 1, 1], 4);
    });
    addMalha(bVerde, matVerde, 'parques');
    addMalha(bMata, matMata, 'matas');
    addMalha(bCampo, matCampo, 'campos');
    addMalha(bAgua, matAgua, 'agua');

    // ---------------- Blocos (casas, muros, árvores, postes, carros...) ----------------
    const blocos = new Map();
    const blocoDe = (x, z) => {
      const i = Math.floor((x - X0) / BLOCO);
      const j = Math.floor((z - Z0) / BLOCO);
      const k = i + ':' + j;
      let b = blocos.get(k);
      if (!b) {
        b = { k, cx: X0 + (i + 0.5) * BLOCO, cz: Z0 + (j + 0.5) * BLOCO, paredes: Buf(), telhados: Buf(), grades: Buf(), arv: [], arauc: [], postes: [], carros: [], placas: [], fios: [] };
        blocos.set(k, b);
      }
      return b;
    };
    D.lotes.forEach((l) => casa(blocoDe(l[0], l[1]), l));
    // Casas de verdade (contorno do Google Open Buildings): [cx, cz, ang, largura, profundidade, andares, estilo, cor, telhado, semente]
    (D.casas || []).forEach(([cx, cz, ang, larg, prof, andares, estilo, cor, tel, seed]) => {
      const Fx = cx - Math.sin(ang) * prof / 2;
      const Fz = cz - Math.cos(ang) * prof / 2;
      casa(blocoDe(cx, cz), [Fx, Fz, ang, larg, 0, larg, prof, andares, estilo, cor, tel, 0, 0, seed]);
    });
    (D.muros || []).forEach((m) => muroEntre(blocoDe((m[0] + m[2]) / 2, (m[1] + m[3]) / 2), m));
    (D.predios || []).forEach((p) => {
      const pts = p[2];
      predio(blocoDe(pts[0], pts[1]), p, rnd);
    });
    (D.arvores || []).forEach((a) => blocoDe(a[0], a[1])[a[2] === 1 ? 'arauc' : 'arv'].push(a));
    (D.postes || []).forEach((p) => blocoDe(p[0], p[1]).postes.push(p));
    (D.carros || []).forEach((c) => blocoDe(c[0], c[1]).carros.push(c));
    (D.placas || []).forEach((p) => blocoDe(p[0], p[1]).placas.push(p));
    // Fios entre postes vizinhos da mesma rua
    const postes = D.postes || [];
    for (let i = 1; i < postes.length; i++) {
      const a = postes[i - 1];
      const b = postes[i];
      if (a[3] !== b[3]) continue;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 46) continue;
      blocoDe(a[0], a[1]).fios.push([a, b]);
    }

    // ---------------- Objetos dos blocos: tudo junto numa malha com cor por vértice (1 chamada por bloco) ----------------
    const ico = (r, x = 0, y = 0, z = 0) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z);
    const geoTronco = new THREE.CylinderGeometry(0.11, 0.19, 1, 5).translate(0, 0.5, 0);
    const geoCopa = juntar([ico(1), ico(0.75, 0.55, -0.15, 0.25), ico(0.68, -0.5, -0.2, -0.3)], true);
    const geoAraucTronco = new THREE.CylinderGeometry(0.14, 0.28, 13, 6).translate(0, 6.5, 0);
    const geoAraucCopa = juntar([[11.6, 3.4], [12.4, 2.7], [13.1, 1.9]].map(([y, r]) => new THREE.CylinderGeometry(r, r * 0.55, 0.7, 9, 1).translate(0, y, 0)).concat([new THREE.CylinderGeometry(1.0, 1.6, 0.6, 8).translate(0, 13.6, 0)]), true);
    const geoPoste = juntar([
      new THREE.CylinderGeometry(0.11, 0.19, 9.6, 6).translate(0, 4.8, 0),
      new THREE.BoxGeometry(1.8, 0.12, 0.12).translate(0, 8.9, 0),
      new THREE.BoxGeometry(0.12, 0.12, 0.9).translate(0, 7.3, 0),
      new THREE.BoxGeometry(0.07, 0.07, 1.8).translate(0, 7.9, 0.9),
      new THREE.BoxGeometry(0.3, 0.13, 0.55).translate(0, 7.95, 1.8)
    ]);
    const geoCarro = juntar([new THREE.BoxGeometry(1.75, 0.62, 4.2).translate(0, 0.55, 0), new THREE.BoxGeometry(1.6, 0.06, 1.15).translate(0, 0.88, 1.5), new THREE.BoxGeometry(1.6, 0.06, 1.0).translate(0, 0.88, -1.6)]);
    const geoCabine = juntar([new THREE.BoxGeometry(1.55, 0.55, 2.0).translate(0, 1.12, -0.1)].concat([[-0.78, 1.32], [0.78, 1.32], [-0.78, -1.32], [0.78, -1.32]].map(([x, z]) => new THREE.CylinderGeometry(0.33, 0.33, 0.24, 8).rotateZ(Math.PI / 2).translate(x, 0.33, z))));
    const geoHaste = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 5).translate(0, 1.6, 0);
    const matProps = new THREE.MeshLambertMaterial({ vertexColors: true });
    const matFio = new THREE.LineBasicMaterial({ color: '#25272b' });
    const texPlacas = placasAtlas(D.nomes || []);
    const matPlaca = new THREE.MeshLambertMaterial({ map: texPlacas.tex });
    const tmpM = new THREE.Matrix4();
    const tmpQ = new THREE.Quaternion();
    const tmpS = new THREE.Vector3();
    const tmpP = new THREE.Vector3();
    const eixoY = new THREE.Vector3(0, 1, 0);
    const tmpV = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const nMat = new THREE.Matrix3();
    /** Copia a geometria (sem índice) transformada pra dentro do acumulador, com uma cor. */
    const semIndice = new Map();
    function anexar(b, geo0, x, y, z, rotY, sx, sy, sz, cor) {
      // A cópia é vértice a vértice: geometria com índice (cilindros) precisa virar "sem índice" antes,
      // senão os triângulos ligam vértices errados (as barras compridas que apareciam na rua)
      let geo = geo0;
      if (geo0.index) {
        geo = semIndice.get(geo0);
        if (!geo) semIndice.set(geo0, (geo = geo0.toNonIndexed()));
      }
      tmpP.set(x, y, z);
      tmpQ.setFromAxisAngle(eixoY, rotY);
      tmpS.set(sx, sy, sz);
      tmpM.compose(tmpP, tmpQ, tmpS);
      nMat.getNormalMatrix(tmpM);
      const P = geo.attributes.position;
      const N = geo.attributes.normal;
      const base = b.p.length / 3;
      for (let i = 0; i < P.count; i++) {
        tmpV.fromBufferAttribute(P, i).applyMatrix4(tmpM);
        tmpN.fromBufferAttribute(N, i).applyMatrix3(nMat).normalize();
        b.p.push(tmpV.x, tmpV.y, tmpV.z);
        b.n.push(tmpN.x, tmpN.y, tmpN.z);
        b.c.push(cor[0], cor[1], cor[2]);
        b.i.push(base + i);
      }
    }

    const obstaculos = []; // [x, z, r]
    const VERDES = ['#4e7a34', '#5b8a3a', '#43692c', '#6a9440', '#3f6a33', '#557f31'].map(cor3);
    const IPES = ['#e879a8', '#f3c13a', '#e879a8', '#c084fc'].map(cor3);
    const MARROM = cor3('#5c4a3a');
    const VERDE_ARAUC = cor3('#3c5532');
    const CONCRETO = cor3('#b0aea6');
    const VIDRO = cor3('#1c2229');
    const METAL = cor3('#3f4650');
    const CARRO_CORES = CARROS.map(cor3);
    const malha = (geo, mat, sombra) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = sombra;
      m.receiveShadow = true;
      m.userData.noOutline = true;
      return m;
    };
    blocos.forEach((b) => {
      const g = new THREE.Group();
      g.name = 'bloco ' + b.k;
      const sombreados = [];
      const pendurar = (m) => {
        g.add(m);
        return m;
      };
      const mp = geoDe(b.paredes);
      if (mp) sombreados.push(pendurar(malha(mp, matParede, true)));
      const mt = geoDe(b.telhados);
      if (mt) sombreados.push(pendurar(malha(mt, matTelhado, true)));
      const mg = geoDe(b.grades);
      if (mg) pendurar(malha(mg, matGrade, false));
      // Árvores, araucárias, postes, carros e hastes das placas: uma malha só
      const pr = Buf();
      const r1 = prng(Math.floor(b.cx * 31 + b.cz));
      b.arv.forEach((a) => {
        const s = a[3];
        anexar(pr, geoTronco, a[0], 0, a[1], 0, s * 1.2, s * 3.0, s * 1.2, MARROM);
        const c = s * 2.3;
        anexar(pr, geoCopa, a[0], s * 3.0 + c * 0.6, a[1], r1() * 6.28, c, c * 0.82, c, a[2] === 2 ? IPES[Math.floor(r1() * IPES.length)] : VERDES[Math.floor(r1() * VERDES.length)]);
        obstaculos.push([a[0], a[1], 0.3 * s]);
      });
      b.arauc.forEach((a) => {
        anexar(pr, geoAraucTronco, a[0], 0, a[1], 0, a[3], a[3], a[3], MARROM);
        anexar(pr, geoAraucCopa, a[0], 0, a[1], r1() * 6.28, a[3], a[3], a[3], VERDE_ARAUC);
        obstaculos.push([a[0], a[1], 0.35 * a[3]]);
      });
      b.postes.forEach((p) => {
        anexar(pr, geoPoste, p[0], 0, p[1], p[2], 1, 1, 1, CONCRETO);
        obstaculos.push([p[0], p[1], 0.25]);
      });
      b.carros.forEach((c) => {
        anexar(pr, geoCarro, c[0], 0, c[1], c[2], 1, 1, 1, CARRO_CORES[c[3] % CARRO_CORES.length]);
        anexar(pr, geoCabine, c[0], 0, c[1], c[2], 1, 1, 1, VIDRO);
        const fx = Math.sin(c[2]) * 1.2, fz = Math.cos(c[2]) * 1.2;
        obstaculos.push([c[0] + fx, c[1] + fz, 1.0], [c[0] - fx, c[1] - fz, 1.0]);
      });
      b.placas.forEach((p) => anexar(pr, geoHaste, p[0], 0, p[1], 0, 1, 1, 1, METAL));
      const gpr = geoDe(pr);
      if (gpr) sombreados.push(pendurar(malha(gpr, matProps, true)));
      // Fios entre os postes
      if (b.fios.length) {
        const pts = [];
        b.fios.forEach(([a, c]) => {
          [[-0.75, 8.95, 0.45], [0, 8.95, 0.55], [0.75, 8.95, 0.5], [0, 7.3, 0.35]].forEach(([dx, y, sag]) => {
            const ca = Math.cos(a[2]), sa = Math.sin(a[2]);
            const cc = Math.cos(c[2]), sc = Math.sin(c[2]);
            const A = [a[0] + ca * dx, y, a[1] - sa * dx];
            const C = [c[0] + cc * dx, y, c[1] - sc * dx];
            let ant = A;
            for (let i = 1; i <= 6; i++) {
              const t = i / 6;
              const p = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t - Math.sin(t * Math.PI) * sag, A[2] + (C[2] - A[2]) * t];
              pts.push(...ant, ...p);
              ant = p;
            }
          });
        });
        const gl = new THREE.BufferGeometry();
        gl.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        gl.computeBoundingSphere();
        const lin = new THREE.LineSegments(gl, matFio);
        lin.userData.noOutline = true;
        lin.userData.detalhe = true;
        g.add(lin);
      }
      // Placas de rua (azuis, nas esquinas)
      if (b.placas.length) {
        const bp = Buf();
        b.placas.forEach(([x, z, a, ia, ib]) => {
          [[ia, a], [ib, a + Math.PI / 2]].forEach(([ni, ang], k) => {
            const uv = texPlacas.uv(ni);
            const ca = Math.cos(ang), sa = Math.sin(ang);
            const y0 = 2.55 + k * 0.32;
            const y1 = y0 + 0.28;
            const hw = 0.55;
            const P0 = [x - ca * hw, y0, z + sa * hw];
            const P1 = [x + ca * hw, y0, z - sa * hw];
            const Q1 = [x + ca * hw, y1, z - sa * hw];
            const Q0 = [x - ca * hw, y1, z + sa * hw];
            quad(bp, P0, P1, Q1, Q0, uv, [1, 1, 1]);
            quad(bp, P1, P0, Q0, Q1, uv, [1, 1, 1]);
          });
        });
        const mpl = malha(geoDe(bp), matPlaca, false);
        mpl.userData.detalhe = true;
        g.add(mpl);
      }
      group.add(g);
      b.grupo = g;
      b.sombreados = sombreados;
      b.detalhes = g.children.filter((c) => c.userData.detalhe);
    });

    // Cavaletes onde a área do jogo acaba
    if ((D.barreiras || []).length) {
      const bb = Buf();
      const listra = [cor3('#f97316'), cor3('#f8fafc')];
      D.barreiras.forEach(([x, z, a, w]) => {
        // a = direção da rua; o cavalete atravessa a rua
        const ca = Math.cos(a), sa = Math.sin(a);
        const n = Math.max(1, Math.round(w / 2.2));
        for (let i = 0; i < n; i++) {
          const k = -w / 2 + (i + 0.5) * (w / n);
          const cx = x + ca * k, cz = z - sa * k;
          for (let s = 0; s < 4; s++) {
            const k0 = -0.9 + s * 0.45;
            const P = (kk, y) => [cx + ca * kk, y, cz - sa * kk];
            const c = listra[s % 2];
            quad(bb, P(k0, 0.75), P(k0 + 0.45, 0.75), P(k0 + 0.45, 1.05), P(k0, 1.05), [0, 0, 1, 0, 1, 1, 0, 1], c);
            quad(bb, P(k0 + 0.45, 0.75), P(k0, 0.75), P(k0, 1.05), P(k0 + 0.45, 1.05), [0, 0, 1, 0, 1, 1, 0, 1], c);
          }
          [-0.8, 0.8].forEach((kk) => {
            const P = (k2, y) => [cx + ca * k2, y, cz - sa * k2];
            quad(bb, P(kk - 0.04, 0), P(kk + 0.04, 0), P(kk + 0.04, 1.05), P(kk - 0.04, 1.05), [0, 0, 1, 0, 1, 1, 0, 1], cor3('#e5e7eb'));
            quad(bb, P(kk + 0.04, 0), P(kk - 0.04, 0), P(kk - 0.04, 1.05), P(kk + 0.04, 1.05), [0, 0, 1, 0, 1, 1, 0, 1], cor3('#e5e7eb'));
          });
        }
      });
      const mb = new THREE.Mesh(geoDe(bb), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
      mb.userData.noOutline = true;
      group.add(mb);
    }

    // ---------------- Índice espacial de obstáculos ----------------
    const CEL = 16;
    const idxObs = new Map();
    obstaculos.forEach((ob) => {
      const k = Math.floor(ob[0] / CEL) + ':' + Math.floor(ob[1] / CEL);
      let l = idxObs.get(k);
      if (!l) idxObs.set(k, (l = []));
      l.push({ x: ob[0], z: ob[1], r: ob[2] });
    });
    const perto = [];
    function obstaculosPerto(x, z, raio = 6) {
      perto.length = 0;
      const i0 = Math.floor((x - raio) / CEL), i1 = Math.floor((x + raio) / CEL);
      const j0 = Math.floor((z - raio) / CEL), j1 = Math.floor((z + raio) / CEL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const l = idxObs.get(i + ':' + j);
        if (l) for (const o2 of l) perto.push(o2);
      }
      return perto;
    }

    // ---------------- Índice das ruas (pra saber o nome da rua onde está) ----------------
    const idxRua = new Map();
    ruas.forEach((r, ri) => {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const k = Math.floor((a[0] + b[0]) / 2 / 40) + ':' + Math.floor((a[1] + b[1]) / 2 / 40);
        let l = idxRua.get(k);
        if (!l) idxRua.set(k, (l = []));
        l.push([ri, a, b]);
      }
    });
    function nomeDaRua(x, z) {
      let melhor = null;
      let dm = 1e9;
      const i = Math.floor(x / 40), j = Math.floor(z / 40);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const l = idxRua.get(i + di + ':' + (j + dj));
        if (!l) continue;
        for (const [ri, a, b] of l) {
          const vx = b[0] - a[0], vz = b[1] - a[1];
          const L2 = vx * vx + vz * vz || 1;
          const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2));
          const d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
          if (d < dm && ruas[ri].nome >= 0) {
            dm = d;
            melhor = ruas[ri];
          }
        }
      }
      return melhor && dm < melhor.larg / 2 + 8 ? D.nomes[melhor.nome] : null;
    }

    // ---------------- Máscara de onde dá pra andar/dirigir + campo de distância ----------------
    let classe = null; // Uint8: 0 bloqueado, 1 aberto, 2 cenário antigo
    let campo = null; // Int16 em centímetros: >0 dentro do aberto, <0 dentro do bloqueado
    const pronto = new Promise((res) => {
      if (!D.mascara) return res(false);
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = GW;
          c.height = GH;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, GW, GH).data;
          classe = new Uint8Array(GW * GH);
          for (let i = 0; i < GW * GH; i++) {
            const v = px[i * 4];
            classe[i] = v > 190 ? 2 : v > 60 ? 1 : 0;
          }
          campo = campoDistancia(classe, GW, GH);
          res(true);
        } catch (e) {
          console.warn('[Bairro] máscara indisponível', e);
          res(false);
        }
      };
      img.onerror = () => res(false);
      img.src = D.mascara;
    });
    const amostraCampo = (x, z) => {
      const fx = x - X0 - 0.5;
      const fz = z - Z0 - 0.5;
      const i = Math.floor(fx);
      const j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= GW - 1 || j >= GH - 1) return -1000;
      const u = fx - i;
      const v = fz - j;
      const k = j * GW + i;
      const a = campo[k], b = campo[k + 1], c = campo[k + GW], d = campo[k + GW + 1];
      return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 100;
    };
    function classeEm(x, z) {
      if (!classe) return -1;
      const i = Math.floor(x - X0);
      const j = Math.floor(z - Z0);
      if (i < 0 || j < 0 || i >= GW || j >= GH) return 0;
      return classe[j * GW + i];
    }
    /** Corrige o ponto (x, z) pra ficar a pelo menos `raio` dos muros/lotes (escorrega pelo campo de distância). */
    function limitar(x, z, raio = 0.3) {
      if (!campo) return { x, z };
      let px = x, pz = z;
      for (let k = 0; k < 4; k++) {
        const d = amostraCampo(px, pz);
        if (d >= raio) break;
        if (d <= -900) {
          // Fora da caixa do bairro: volta pra dentro na direção do centro
          px = Math.max(X0 + 2, Math.min(X0 + GW - 2, px));
          pz = Math.max(Z0 + 2, Math.min(Z0 + GH - 2, pz));
          continue;
        }
        const gx = amostraCampo(px + 0.5, pz) - amostraCampo(px - 0.5, pz);
        const gz = amostraCampo(px, pz + 0.5) - amostraCampo(px, pz - 0.5);
        const l = Math.hypot(gx, gz);
        if (l < 1e-4) break;
        const passo = raio - d + 0.02;
        px += (gx / l) * passo;
        pz += (gz / l) * passo;
      }
      return { x: px, z: pz };
    }

    // ---------------- Visibilidade por distância ----------------
    const listaBlocos = [...blocos.values()];
    function atualizar(x, z) {
      const LONGE = longe();
      for (const b of listaBlocos) {
        const d = Math.hypot(b.cx - x, b.cz - z) - BLOCO * 0.7;
        b.grupo.visible = d < LONGE;
        const perto = d < Math.min(150, LONGE * 0.5);
        for (const m of b.detalhes) m.visible = perto;
        // Sombra só de quem está perto (a sombra do sol cobre poucas dezenas de metros mesmo)
        const sombra = d < 40;
        for (const m of b.sombreados) m.castShadow = sombra;
      }
    }

    return {
      group,
      pronto,
      atualizar,
      limitar,
      classeEm,
      obstaculosPerto,
      nomeDaRua,
      caixa: [X0, Z0, GW, GH],
      blocos: listaBlocos.length,
      estatisticas: { casas: (D.casas || []).length, lotes: D.lotes.length, arvores: (D.arvores || []).length, ruas: ruas.length, predios: (D.predios || []).length }
    };
  }

  /** Atlas das placas azuis de nome de rua (como as de Curitiba). */
  function placasAtlas(nomes) {
    const COLS = 2;
    const W = 512;
    const H = 64;
    const linhas = Math.max(1, Math.ceil(nomes.length / COLS));
    const altura = Math.min(4096, 1 << Math.ceil(Math.log2(linhas * H)));
    const porColuna = Math.floor(altura / H);
    const t = tex(W * COLS, altura, (ctx) => {
      nomes.forEach((n, i) => {
        const c = Math.floor(i / porColuna);
        const r = i % porColuna;
        const x = c * W;
        const y = r * H;
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(x, y, W, H);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 5, y + 5, W - 10, H - 10);
        ctx.fillStyle = '#f8fafc';
        let s = 30;
        const curto = n.replace(/^Rua /, 'R. ').replace(/^Avenida /, 'Av. ').replace(/Professor(a)? /, 'Prof$1 ').replace(/Doutor /, 'Dr. ').replace(/Coronel /, 'Cel. ').replace(/Desembargador /, 'Des. ').replace(/Engenheiro /, 'Eng. ').replace(/Deputado /, 'Dep. ');
        ctx.font = `bold ${s}px Arial, sans-serif`;
        while (ctx.measureText(curto).width > W - 30 && s > 14) ctx.font = `bold ${--s}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(curto, x + W / 2, y + H / 2 + 1);
      });
    }, false);
    return {
      tex: t,
      uv(i) {
        if (i < 0) return [0, 0, 0, 0, 0, 0, 0, 0];
        const c = Math.floor(i / porColuna);
        const r = i % porColuna;
        const u0 = c / COLS, u1 = (c + 1) / COLS;
        const v1 = 1 - (r * H) / altura, v0 = 1 - ((r + 1) * H) / altura;
        return [u0, v0, u1, v0, u1, v1, u0, v1];
      }
    };
  }

  /** Junta geometrias (com normal e uv) numa só. */
  function juntar(lista, facetado = false) {
    const THREE = T();
    const p = [], n = [], u = [];
    lista.forEach((g0) => {
      const g = g0.index ? g0.toNonIndexed() : g0;
      if (facetado) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        p.push(P.getX(i), P.getY(i), P.getZ(i));
        n.push(N.getX(i), N.getY(i), N.getZ(i));
        u.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.computeBoundingSphere();
    return g;
  }

  /**
   * Campo de distância com sinal (centímetros) a partir da máscara: positivo no aberto (distância até o
   * bloqueado mais perto), negativo no bloqueado. Duas passadas de chanfro (3-4), limitado a ±40 m.
   */
  function campoDistancia(classe, W, H) {
    const INF = 4000;
    const dentro = new Int16Array(W * H);
    const fora = new Int16Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const aberto = classe[i] !== 0;
      dentro[i] = aberto ? INF : 0;
      fora[i] = aberto ? 0 : INF;
    }
    const passar = (d) => {
      // 1 m = 100 cm; diagonal ≈ 141
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = j * W + i;
          let v = d[k];
          if (!v) continue;
          if (i > 0 && d[k - 1] + 100 < v) v = d[k - 1] + 100;
          if (j > 0) {
            if (d[k - W] + 100 < v) v = d[k - W] + 100;
            if (i > 0 && d[k - W - 1] + 141 < v) v = d[k - W - 1] + 141;
            if (i < W - 1 && d[k - W + 1] + 141 < v) v = d[k - W + 1] + 141;
          }
          d[k] = v;
        }
      }
      for (let j = H - 1; j >= 0; j--) {
        for (let i = W - 1; i >= 0; i--) {
          const k = j * W + i;
          let v = d[k];
          if (!v) continue;
          if (i < W - 1 && d[k + 1] + 100 < v) v = d[k + 1] + 100;
          if (j < H - 1) {
            if (d[k + W] + 100 < v) v = d[k + W] + 100;
            if (i < W - 1 && d[k + W + 1] + 141 < v) v = d[k + W + 1] + 141;
            if (i > 0 && d[k + W - 1] + 141 < v) v = d[k + W - 1] + 141;
          }
          d[k] = v;
        }
      }
    };
    passar(dentro);
    passar(fora);
    const campo = new Int16Array(W * H);
    for (let i = 0; i < W * H; i++) {
      // Meio-célula: a borda fica entre as células
      campo[i] = classe[i] !== 0 ? Math.min(32000, dentro[i] - 50) : -Math.min(32000, fora[i] - 50);
    }
    return campo;
  }

  /** Carrega data/bairro_curitiba.js sob demanda (uma vez). */
  let carregando = null;
  function carregarDados() {
    if (root.__LUIGGI_BAIRRO) return Promise.resolve(true);
    if (carregando) return carregando;
    carregando = new Promise((res) => {
      const sc = document.createElement('script');
      sc.src = 'data/bairro_curitiba.js';
      sc.onload = () => res(!!root.__LUIGGI_BAIRRO);
      sc.onerror = () => {
        carregando = null;
        res(false);
      };
      document.head.appendChild(sc);
    });
    return carregando;
  }

  root.LuiggiBairro = { construir, campoDistancia, carregarDados };
})(window);
