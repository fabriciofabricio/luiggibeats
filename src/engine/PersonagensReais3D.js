/**
 * src/engine/PersonagensReais3D.js
 * Modelos 3D "de verdade" do trio do Subaru (Luis, Fabricio e Mateus Buse), feitos a partir das fotos
 * em /assets: proporção de gente (cabeça menor, pescoço, mandíbula), cabelo montado mecha por mecha,
 * rosto pintado com olhos, sobrancelhas, nariz e boca de verdade, e as roupas e acessórios de cada um.
 *
 * O Character3D usa isto sozinho quando o personagem tem um modelo aqui (Luiggi3DReal.MODELOS[id]).
 * Os outros personagens continuam com o boneco estilizado de sempre.
 */
(function (root) {
  'use strict';

  const T = () => root.THREE;
  const L = () => root.Luiggi3D;

  // ------------------------------------------------------------------
  // FICHAS (medidas em múltiplos do raio da cabeça R, a não ser quando dito)
  // ------------------------------------------------------------------
  const MODELOS = {
    // Fabricio: cabelo preto bagunçado com franja cheia até as sobrancelhas, óculos redondos finos de metal
    // com lente levemente rosada, camiseta preta larga com o gato piscando, corrente com cruz e relógio prata.
    fabricio: {
      R: 0.158,
      forma: { sx: 0.83, sy: 1.1, sz: 0.97, queixo: 0.46, mandibula: 2.2 },
      cabelo: {
        cor: '#17130f', ponta: '#2b231d', raiz: '#0f0c0a', mecha: null, seed: 11,
        reparte: 'coroa', coroa: [0, 0.8, -0.6], fios: 190, franja: 0.3, lado: -0.42, tras: -0.82,
        volume: 1.22, onda: 0.05, ondaFreq: 2.2, largura: 0.21, desalinho: 0.5, pontaFora: 0.7,
        frente: 0.62, nuca: -0.55, rostoAng: 0.82
      },
      rosto: { olhos: '#3d2b20', sobrancelha: '#17130f', sobGrossa: 1.05, labio: '#c98c82', bigode: 0, pintas: 0, olhar: 'sorriso' },
      oculos: { aro: '#c7c1b6', raio: 0.3, lente: '#ffd9e0', opacidade: 0.28, fio: 0.0045, y: 0.02 },
      camiseta: { cor: '#222226', estampa: 'gato', larga: 1.08 },
      baixo: { cor: '#26262b', tipo: 'calca' },
      tenis: { cor: '#1c1c20', sola: '#e7e5e4', detalhe: '#f4f4f5' },
      acessorios: { corrente: 'cruz', relogio: true, anel: true }
    },
    // Luis: cabelo castanho escuro ondulado na altura do pescoço, repartido no meio com mechas soltas no rosto,
    // camiseta preta, correntinha prata fina.
    luis: {
      R: 0.16,
      forma: { sx: 0.85, sy: 1.1, sz: 0.98, queixo: 0.4, mandibula: 2.0 },
      cabelo: {
        cor: '#3e2c22', ponta: '#5a4233', raiz: '#2a1e17', mecha: null, seed: 5,
        reparte: 'meio', fios: 180, franja: 0.12, lado: -0.95, tras: -1.15,
        volume: 1.22, onda: 0.12, ondaFreq: 1.9, largura: 0.22, desalinho: 0.4, pontaFora: 0.45,
        frente: 0.58, nuca: -0.6, rostoAng: 0.9
      },
      rosto: { olhos: '#4d3a2d', sobrancelha: '#3a291f', sobGrossa: 1.1, labio: '#c88a80', bigode: 0.12, pintas: 0.5, olhar: 'tranquilo' },
      oculos: null,
      camiseta: { cor: '#222226', estampa: null, larga: 1.0 },
      baixo: { cor: '#2a3448', tipo: 'jeans' },
      tenis: { cor: '#232326', sola: '#f4f4f5', detalhe: '#f4f4f5' },
      acessorios: { corrente: 'fina' }
    },
    // Mateus Buse: alto, cabelo castanho-claro com reflexos loiros, ondulado/cacheado até os ombros, repartido no meio,
    // óculos de metal finos, brinco de cruz na orelha direita, camiseta preta com estampa vermelha/laranja e bermuda cinza.
    mateus_buse: {
      R: 0.158,
      forma: { sx: 0.84, sy: 1.12, sz: 0.98, queixo: 0.36, mandibula: 2.8 },
      cabelo: {
        cor: '#6f5640', ponta: '#a88964', raiz: '#4a3828', mecha: '#c9ab82', seed: 23,
        reparte: 'meio', fios: 200, franja: 0.1, lado: -1.55, tras: -1.75,
        volume: 1.3, onda: 0.15, ondaFreq: 2.3, largura: 0.2, desalinho: 0.45, pontaFora: 0.6,
        frente: 0.56, nuca: -0.62, rostoAng: 0.95
      },
      rosto: { olhos: '#5b6b7a', sobrancelha: '#5e4a38', sobGrossa: 0.95, labio: '#c48478', bigode: 0.3, pintas: 0.3, olhar: 'confiante' },
      oculos: { aro: '#2b2d33', raio: 0.27, oval: 0.86, lente: '#dbeafe', opacidade: 0.16, fio: 0.0042, y: 0.02 },
      camiseta: { cor: '#1f2026', estampa: 'chama', larga: 1.06 },
      baixo: { cor: '#a3a7ae', tipo: 'bermuda' },
      tenis: { cor: '#e7e5e4', sola: '#f8fafc', detalhe: '#94a3b8' },
      acessorios: { brinco: 'cruz' }
    }
  };

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
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
  const mix = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /**
   * Formato de cabeça de gente: oval, mandíbula afinando até o queixo e nuca um pouco mais funda.
   * Aplicado igual no crânio e no "adesivo" do rosto, pra textura colar certinho.
   */
  function deformarCabeca(geo, raio, fo) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) / raio;
      let y = p.getY(i) / raio;
      let z = p.getZ(i) / raio;
      if (y < 0) {
        const t = -y;
        y *= 1.06;
        x *= 1 - fo.queixo * Math.pow(t, fo.mandibula);
        z *= 1 - 0.12 * t * t;
        // Queixo um pouco pra frente
        if (z > 0) z += 0.06 * Math.pow(t, 3) * z;
      } else {
        // Têmporas um pouco mais retas
        x *= 1 - 0.05 * y * y;
      }
      if (z < 0 && y > -0.5) z *= 1 + 0.07 * (1 - Math.abs(y + 0.05));
      p.setXYZ(i, x * fo.sx * raio, y * fo.sy * raio, z * fo.sz * raio);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  // ------------------------------------------------------------------
  // ROSTO (textura opaca: pele + olhos, sobrancelhas, nariz e boca)
  // ------------------------------------------------------------------
  // O adesivo do rosto cobre φ = ±0,95 rad em volta da frente e θ de π/2−0,5 a π/2+1,0 (abaixo da linha do cabelo).
  const FACE = { phi: 1.9, t0: 0.5, tl: 1.5 };

  function desenharRostoReal(ctx, w, h, f, mo, expr, aberta, piscando) {
    const ro = mo.rosto;
    const pele = f.tomPele || '#EBC1A9';
    const sombra = f.sombreamentoPele || L().shade(pele, -16);
    const X = (phi) => w * (0.5 + phi / FACE.phi);
    const Y = (dt) => (h * (FACE.t0 + dt)) / FACE.tl;
    const ux = w / FACE.phi; // px por radiano
    const uy = h / FACE.tl;
    ctx.fillStyle = pele;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const blob = (x, y, rx, ry, cor, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, cor.replace('A', a));
      g.addColorStop(1, cor.replace('A', 0));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const rgbaDe = (hex) => {
      const c = new (T().Color)(hex);
      return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},A)`;
    };
    const sombraA = rgbaDe(sombra);

    // Volume: sombra nas laterais do nariz, olheiras, maçãs do rosto e embaixo do lábio
    blob(X(0), Y(0.2), 0.1 * ux, 0.22 * uy, sombraA, 0.35);
    [-1, 1].forEach((s) => {
      blob(X(s * 0.08), Y(0.22), 0.05 * ux, 0.16 * uy, sombraA, 0.45);
      blob(X(s * 0.4), Y(0.12), 0.14 * ux, 0.05 * uy, sombraA, 0.35);
      blob(X(s * 0.5), Y(0.36), 0.15 * ux, 0.11 * uy, 'rgba(225,120,110,A)', expr === 'envergonhado' ? 0.55 : 0.14);
    });
    blob(X(0), Y(0.72), 0.14 * ux, 0.05 * uy, sombraA, 0.4);
    // Pintinhas / espinhas discretas (as fotos mostram) e barba rala
    if (ro.pintas) {
      const r = prng(mo.cabelo.seed * 7);
      for (let i = 0; i < 6; i++) {
        const px = X((r() - 0.5) * 1.1);
        const py = Y(0.25 + r() * 0.45);
        if (Math.abs(px - w / 2) < 0.12 * ux) continue;
        blob(px, py, 4, 4, 'rgba(200,90,90,A)', 0.35 * ro.pintas);
      }
    }
    if (ro.bigode) {
      const cb = rgbaDe(mo.cabelo.raiz || mo.cabelo.cor);
      blob(X(0), Y(0.5), 0.2 * ux, 0.045 * uy, cb, ro.bigode * 0.55);
      blob(X(0), Y(0.86), 0.12 * ux, 0.07 * uy, cb, ro.bigode * 0.45);
    }

    // ---------- Olhos ----------
    const ey = Y(0.02);
    const hw = 0.165 * ux; // meia largura do olho
    let hh = 0.062 * uy; // meia altura
    if (expr === 'chocado') hh *= 1.45;
    if (expr === 'bravo') hh *= 0.72;
    if (expr === 'feliz') hh *= 0.68;
    if (ro.olhar === 'tranquilo' && expr === 'neutro') hh *= 0.86;
    const ir = 0.072 * uy * (expr === 'chocado' ? 0.85 : 1);
    [-1, 1].forEach((s) => {
      const cx = X(s * 0.39);
      const inn = cx - s * hw; // canto de dentro
      const out = cx + s * hw;
      if (piscando) {
        ctx.strokeStyle = '#2a1d18';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(inn, ey);
        ctx.quadraticCurveTo(cx, ey + hh * 0.9, out, ey - 2);
        ctx.stroke();
        ctx.strokeStyle = sombraA.replace('A', 0.7);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(inn + s * 6, ey - hh * 1.1);
        ctx.quadraticCurveTo(cx, ey - hh * 1.9, out - s * 4, ey - hh * 1.2);
        ctx.stroke();
        return;
      }
      const sobe = expr === 'feliz' ? hh * 0.5 : 0;
      // Forma amendoada
      const olho = new Path2D();
      olho.moveTo(inn, ey + 1);
      olho.bezierCurveTo(inn + s * hw * 0.45, ey - hh * 1.25 - sobe * 0.2, out - s * hw * 0.35, ey - hh * 1.15, out, ey - hh * 0.15);
      olho.bezierCurveTo(out - s * hw * 0.4, ey + hh * 0.95 - sobe, inn + s * hw * 0.4, ey + hh * 1.0 - sobe, inn, ey + 1);
      ctx.fillStyle = '#f2ebe6';
      ctx.fill(olho);
      ctx.save();
      ctx.clip(olho);
      // Íris e pupila (olhando um tiquinho pra baixo quando envergonhado)
      const iy = ey + (expr === 'envergonhado' ? hh * 0.5 : hh * 0.08);
      const ix = cx - s * hw * 0.04;
      const g = ctx.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir);
      g.addColorStop(0, L().shade(ro.olhos, 40));
      g.addColorStop(0.7, ro.olhos);
      g.addColorStop(1, L().shade(ro.olhos, -45));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d0907';
      ctx.beginPath();
      ctx.arc(ix, iy, ir * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ix - ir * 0.35, iy - ir * 0.35, ir * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Sombra da pálpebra em cima do olho
      ctx.fillStyle = 'rgba(60,30,20,0.22)';
      ctx.fillRect(inn - hw * 2, ey - hh * 2, hw * 4, hh * 0.9);
      ctx.restore();
      // Pálpebra de cima (linha forte, mais grossa pra fora) e de baixo (suave)
      ctx.strokeStyle = '#24170f';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(inn, ey + 1);
      ctx.bezierCurveTo(inn + s * hw * 0.45, ey - hh * 1.25 - sobe * 0.2, out - s * hw * 0.35, ey - hh * 1.15, out, ey - hh * 0.15);
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(out - s * 2, ey - hh * 0.2);
      ctx.lineTo(out + s * 6, ey - hh * 0.55);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,40,30,0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(out, ey - hh * 0.15);
      ctx.bezierCurveTo(out - s * hw * 0.4, ey + hh * 0.95 - sobe, inn + s * hw * 0.4, ey + hh * 1.0 - sobe, inn, ey + 1);
      ctx.stroke();
      // Dobra da pálpebra
      ctx.strokeStyle = sombraA.replace('A', 0.75);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(inn + s * hw * 0.25, ey - hh * 1.35);
      ctx.quadraticCurveTo(cx, ey - hh * 2.05, out - s * hw * 0.1, ey - hh * 1.2);
      ctx.stroke();
      // Lágrima (canto de dentro)
      ctx.fillStyle = 'rgba(210,120,120,0.55)';
      ctx.beginPath();
      ctx.ellipse(inn + s * 3, ey + 1, 3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // ---------- Sobrancelhas ----------
    const by = Y(-0.2);
    ctx.fillStyle = ro.sobrancelha;
    [-1, 1].forEach((s) => {
      const cx = X(s * 0.39);
      const gross = 0.03 * uy * ro.sobGrossa;
      let dyIn = 0;
      let dyOut = 0;
      let arco = 0.035 * uy;
      if (expr === 'bravo') {
        dyIn = 0.05 * uy;
        dyOut = -0.02 * uy;
        arco = 0;
      } else if (expr === 'chocado') {
        dyIn = -0.05 * uy;
        dyOut = -0.04 * uy;
        arco = 0.05 * uy;
      } else if (expr === 'envergonhado') {
        dyIn = -0.04 * uy;
        dyOut = 0.01 * uy;
      } else if (expr === 'feliz') {
        dyIn = -0.012 * uy;
        dyOut = -0.012 * uy;
      }
      const x0 = cx - s * 0.2 * ux;
      const x1 = cx + s * 0.2 * ux;
      ctx.beginPath();
      ctx.moveTo(x0, by + dyIn - gross);
      ctx.quadraticCurveTo(cx, by - arco - gross * 1.1 + (dyIn + dyOut) / 2, x1, by + dyOut + gross * 0.3);
      ctx.quadraticCurveTo(cx, by - arco + gross * 0.6 + (dyIn + dyOut) / 2, x0, by + dyIn + gross);
      ctx.closePath();
      ctx.fill();
      // Fiozinhos
      ctx.strokeStyle = ro.sobrancelha;
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) {
        const t = k / 7;
        const px = mix(x0, x1, t);
        const py = mix(by + dyIn, by + dyOut, t) - arco * Math.sin(t * Math.PI) + gross * 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s * 6, py - gross * 1.4);
        ctx.stroke();
      }
    });

    // ---------- Nariz (a forma é geometria; aqui só narinas e sombra embaixo) ----------
    const ny = Y(0.38);
    ctx.fillStyle = 'rgba(80,35,30,0.55)';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(X(s * 0.045), ny, 0.022 * ux, 0.012 * uy, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    blob(X(0), ny + 0.03 * uy, 0.08 * ux, 0.025 * uy, sombraA, 0.6);
    // Bigode chinês (linha suave do nariz até a boca)
    ctx.strokeStyle = sombraA.replace('A', 0.16);
    ctx.lineWidth = 3;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(X(s * 0.1), ny + 0.02 * uy);
      ctx.quadraticCurveTo(X(s * 0.2), Y(0.5), X(s * 0.2), Y(0.62));
      ctx.stroke();
    });

    // ---------- Boca ----------
    const my = Y(0.6);
    const mw = (expr === 'feliz' ? 0.2 : expr === 'chocado' ? 0.1 : 0.165) * ux;
    const labio = ro.labio;
    const labioEsc = L().shade(labio, -40);
    if (aberta || expr === 'chocado') {
      const ah = (expr === 'chocado' ? 0.09 : 0.055) * uy;
      ctx.fillStyle = '#4a1d1d';
      ctx.beginPath();
      ctx.ellipse(X(0), my + ah * 0.4, mw, ah, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(X(0) - mw * 0.7, my - ah * 0.55, mw * 1.4, ah * 0.45);
      ctx.strokeStyle = labio;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(X(0), my + ah * 0.4, mw, ah, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const sorriso = expr === 'feliz' ? 0.045 * uy : ro.olhar === 'sorriso' && expr === 'neutro' ? 0.014 * uy : expr === 'bravo' || expr === 'envergonhado' ? -0.012 * uy : 0.004 * uy;
      const espessura = 0.024 * uy;
      // Lábio de cima (arco do cupido)
      ctx.fillStyle = L().shade(labio, -12);
      ctx.beginPath();
      ctx.moveTo(X(0) - mw, my - sorriso);
      ctx.quadraticCurveTo(X(0) - mw * 0.45, my - espessura * 1.1, X(0) - mw * 0.12, my - espessura);
      ctx.lineTo(X(0), my - espessura * 0.75);
      ctx.lineTo(X(0) + mw * 0.12, my - espessura);
      ctx.quadraticCurveTo(X(0) + mw * 0.45, my - espessura * 1.1, X(0) + mw, my - sorriso);
      ctx.quadraticCurveTo(X(0), my + sorriso * 0.6, X(0) - mw, my - sorriso);
      ctx.fill();
      // Lábio de baixo
      ctx.fillStyle = labio;
      ctx.beginPath();
      ctx.moveTo(X(0) - mw * 0.92, my - sorriso * 0.9);
      ctx.quadraticCurveTo(X(0), my + sorriso * 0.6 + espessura * 1.6, X(0) + mw * 0.92, my - sorriso * 0.9);
      ctx.quadraticCurveTo(X(0), my + sorriso * 0.6, X(0) - mw * 0.92, my - sorriso * 0.9);
      ctx.fill();
      blob(X(0), my + espessura * 0.6, mw * 0.4, espessura * 0.5, 'rgba(255,255,255,A)', 0.25);
      // Linha entre os lábios
      ctx.strokeStyle = labioEsc;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(X(0) - mw, my - sorriso);
      ctx.quadraticCurveTo(X(0), my + sorriso * 0.6, X(0) + mw, my - sorriso);
      ctx.stroke();
      if (expr === 'feliz') {
        ctx.strokeStyle = sombraA.replace('A', 0.5);
        ctx.lineWidth = 2;
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.arc(X(0) + s * mw * 1.05, my - sorriso + 2, 6, s > 0 ? -0.6 : Math.PI - 0.9, s > 0 ? 0.9 : Math.PI + 0.6);
          ctx.stroke();
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // CABELO: mechas que nascem no couro cabeludo e caem com a gravidade, contornando a cabeça e o rosto
  // ------------------------------------------------------------------
  function construirCabeloReal(THREE, R, fo, c) {
    const rnd = prng(c.seed || 7);
    const V = THREE.Vector3;
    const ax = R * fo.sx;
    const ay = R * fo.sy;
    const az = R * fo.sz;
    const corA = new THREE.Color(c.cor);
    const corB = new THREE.Color(c.ponta || c.cor);
    const corR = new THREE.Color(c.raiz || c.cor);
    const corM = c.mecha ? new THREE.Color(c.mecha) : null;
    const pos = [];
    const nor = [];
    const col = [];
    const idx = [];
    // Couro cabeludo: acima desta altura (em unidades da cabeça) conforme vai da testa (t=0) pra nuca (t=1)
    const linha = (d) => {
      const t = (1 - d.z) / 2;
      return mix(c.frente, c.nuca, Math.pow(t, 1.25));
    };
    const noCouro = (d, folga = 0) => d.y > linha(d) - folga;
    const fimY = (d) => {
      const t = (1 - d.z) / 2;
      return (t < 0.5 ? c.lado : mix(c.lado, c.tras, (t - 0.5) / 0.5)) * ay;
    };
    const coroa = new V(...(c.coroa || [0, 1, 0])).normalize();
    const desce = new V(0, -1, 0);
    // Rosto livre: ângulo (em volta do eixo vertical, a partir da frente) até onde o cabelo não entra, por altura.
    // Na testa o ângulo é pequeno (a franja/risca mostra só um triângulo de testa); nos olhos e bochechas é largo.
    const browY = c.franja * ay;
    const angRosto = (y) => {
      const u = y / ay;
      // + margem de meia mecha (a fita tem largura e não pode encostar no olho)
      const olhos = (c.rostoAng || 0.95) + c.largura * 0.45;
      if (u > 0.95) return 0;
      if (u > 0.3) return mix(olhos * 0.85, 0.3, (u - 0.3) / 0.65);
      if (u > -0.9) return olhos;
      if (u > -1.5) return mix(olhos, 0.55, (-0.9 - u) / 0.6);
      return 0.55;
    };

    const tmp = new V();
    // Mantém a mecha numa casca em volta da cabeça: nem dentro (atravessando), nem solta longe demais
    function casca(p, camada, folgaFora) {
      if (p.y > 0) {
        tmp.set(p.x / ax, p.y / ay, p.z / az);
        const l = tmp.length();
        const k = l < camada ? camada / l : l > camada + folgaFora ? (camada + folgaFora) / l : 1;
        if (k !== 1) p.set(tmp.x * k * ax, tmp.y * k * ay, tmp.z * k * az);
      } else {
        const afina = 1 - 0.1 * Math.min(1, -p.y / ay);
        const rx = camada * afina;
        tmp.set(p.x / ax, 0, p.z / az);
        const l = Math.max(1e-4, tmp.length());
        const k = l < rx ? rx / l : l > rx + folgaFora * 1.6 ? (rx + folgaFora * 1.6) / l : 1;
        if (k !== 1) {
          p.x *= k;
          p.z *= k;
        }
      }
    }

    // Menos mechas (e mais largas) nos níveis de gráfico baixos
    const fracao = Math.max(0.3, Math.min(1, root.Luiggi3D?.perfilQualidade?.().cabelo || 1));
    const nRaiz = Math.round((c.fios * fracao) / 0.42);
    c = fracao < 1 ? { ...c, largura: c.largura * (1 + (1 - fracao) * 0.7) } : c;
    const dirs = [];
    for (let i = 0; i < nRaiz; i++) {
      const y = 1 - ((i + 0.5) / nRaiz) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.399963;
      const d = new V(Math.cos(a) * r, y, Math.sin(a) * r);
      if (noCouro(d)) dirs.push(d);
    }

    const PASSO = R * 0.13;
    const RAD = 4;
    dirs.forEach((d) => {
      const raiz = new V(d.x * ax, d.y * ay, d.z * az);
      // Direção inicial: pra longe do redemoinho (franja) ou pra longe da risca do meio
      let dir;
      if (c.reparte === 'coroa') {
        dir = coroa.clone().sub(d.clone().multiplyScalar(d.dot(coroa))).multiplyScalar(-1);
        if (dir.lengthSq() < 1e-4) dir.set(rnd() - 0.5, 0, rnd() - 0.5);
      } else {
        const lado = Math.abs(d.x) < 0.03 ? (rnd() < 0.5 ? -1 : 1) : Math.sign(d.x);
        // Na frente/em cima: pra longe da risca. Atrás: pra baixo e pra trás, fechando a nuca.
        const atras = clamp((-d.z - 0.05) / 0.5, 0, 1);
        dir = new V(lado * mix(1, 0.12, atras), mix(-0.15, -0.6, atras), mix(0.05, -0.9, atras));
        dir.sub(d.clone().multiplyScalar(dir.dot(d)));
      }
      dir.normalize();
      dir.add(new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.25 * c.desalinho)).normalize();
      // Levanta um pouco da raiz (volume)
      dir.addScaledVector(d, 0.45).normalize();
      const camada = 1.03 + Math.pow(rnd(), 0.8) * (c.volume - 1.03);
      const alvoY = fimY(d) + (rnd() - 0.45) * 0.42 * ay;
      const frente = d.z > 0.2 && Math.abs(d.x) < 0.6;
      const browMecha = browY + (rnd() - 0.3) * 0.16 * ay;
      // Franja deitada na testa (sem pontas pra frente, que viram uma "aba de boné")
      const franjaTesta = c.reparte === 'coroa' && frente;
      const camadaM = franjaTesta ? Math.min(camada, 1.06) : camada;
      const pts = [raiz.clone()];
      const p = raiz.clone();
      let viva = true;
      for (let i = 1; i < 26 && viva; i++) {
        // Gravidade cada vez mais forte (perto da raiz a mecha ainda segue o penteado)
        const g = Math.min(1.2, 0.1 + i * 0.12);
        dir.addScaledVector(desce, g * 0.3).normalize();
        dir.add(new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.1 * c.desalinho)).normalize();
        p.addScaledVector(dir, PASSO);
        casca(p, i < 2 ? mix(1.0, camadaM, i / 2) : camadaM, franjaTesta && p.y < ay * 0.6 ? 0.01 : 0.05 + 0.05 * c.desalinho);
        // Rosto livre
        if (p.z > 0 && p.y < ay * 0.98 && p.y > -ay * 2) {
          const lim = angRosto(p.y);
          const ang = Math.atan2(p.x, p.z);
          if (Math.abs(ang) < lim) {
            if (c.reparte === 'coroa' && frente && p.y > browMecha - PASSO) {
              // Franja: cai na testa e para na sobrancelha (cada mecha numa altura, pontas desfiadas)
              if (p.y < browMecha) {
                p.lerp(pts[pts.length - 1], clamp((browMecha - p.y) / PASSO, 0, 0.85));
                viva = false;
              }
            } else {
              const sg = Math.abs(ang) < 1e-3 ? (d.x < 0 ? -1 : 1) : Math.sign(ang);
              const r = Math.hypot(p.x, p.z);
              p.x = Math.sin(sg * lim) * r;
              p.z = Math.cos(lim) * r;
              dir.x += sg * 0.25;
              dir.z -= 0.15;
              dir.normalize();
            }
          }
        }
        pts.push(p.clone());
        if (p.y < alvoY) viva = false;
      }
      if (pts.length < 3) return;
      // Ondas e pontas pra fora
      const n = pts.length;
      const fase = rnd() * Math.PI * 2;
      const amp = c.onda * R * (0.7 + rnd() * 0.6);
      const fr = (c.ondaFreq * (0.8 + rnd() * 0.4)) / R;
      const tg = new V();
      const fora = new V();
      const lat = new V();
      let arco = 0;
      const desloc = pts.map((q, i) => {
        if (i > 0) arco += q.distanceTo(pts[i - 1]);
        tg.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
        fora.set(q.x, 0, q.z).normalize();
        lat.crossVectors(tg, fora).normalize();
        const k = clamp((arco - R * 0.35) / (R * 0.9), 0, 1);
        const o = new V().addScaledVector(lat, Math.sin(arco * fr + fase) * amp * k).addScaledVector(fora, (Math.cos(arco * fr + fase) * 0.5 + 0.5) * amp * 0.6 * k);
        const u = i / (n - 1);
        if (franjaTesta) o.multiplyScalar(0.35);
        else if (u > 0.7) o.addScaledVector(fora, (u - 0.7) * c.pontaFora * R * 0.5);
        const r = q.clone().add(o);
        // A onda não pode jogar a mecha de volta na cara
        if (r.z > 0 && r.y < browY && r.y > -ay * 2) {
          const lim = angRosto(r.y);
          const ang = Math.atan2(r.x, r.z);
          if (Math.abs(ang) < lim) {
            const sg = Math.sign(ang) || 1;
            const rr = Math.hypot(r.x, r.z);
            r.x = Math.sin(sg * lim) * rr;
            r.z = Math.cos(lim) * rr;
          }
        }
        return r;
      });
      if (root.__debugCabelo) (root.__fios = root.__fios || []).push({ d: [d.x, d.y, d.z], pts: desloc.map((q) => [q.x / R, q.y / R, q.z / R]) });
      // Tubo achatado (mecha) que afina até a ponta
      const largura = c.largura * R * (0.7 + rnd() * 0.6);
      const ehMecha = corM && rnd() < 0.22;
      const tom = 0.88 + rnd() * 0.24;
      const base = pos.length / 3;
      const S = new V();
      const O = new V();
      const N = new V();
      for (let i = 0; i < n; i++) {
        const q = desloc[i];
        const u = i / (n - 1);
        tg.copy(desloc[Math.min(n - 1, i + 1)]).sub(desloc[Math.max(0, i - 1)]).normalize();
        O.set(q.x / ax, q.y / ay * 0.4, q.z / az).normalize();
        S.crossVectors(tg, O).normalize();
        O.crossVectors(S, tg).normalize();
        const wv = largura * (1 - 0.86 * Math.pow(u, 1.4));
        const th = wv * 0.36;
        const cc = new THREE.Color().copy(u < 0.12 ? corR.clone().lerp(corA, u / 0.12) : corA.clone().lerp(corB, Math.pow((u - 0.12) / 0.88, 1.3)));
        if (ehMecha) cc.lerp(corM, 0.35 + 0.45 * u);
        cc.multiplyScalar(tom);
        for (let k = 0; k < RAD; k++) {
          const a = (k / RAD) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          pos.push(q.x + S.x * ca * wv + O.x * sa * th, q.y + S.y * ca * wv + O.y * sa * th, q.z + S.z * ca * wv + O.z * sa * th);
          N.copy(S).multiplyScalar(ca * th).addScaledVector(O, sa * wv).normalize();
          nor.push(N.x, N.y, N.z);
          col.push(cc.r, cc.g, cc.b);
        }
      }
      for (let i = 0; i < n - 1; i++) {
        for (let k = 0; k < RAD; k++) {
          const a = base + i * RAD + k;
          const b = base + i * RAD + ((k + 1) % RAD);
          const a2 = a + RAD;
          const b2 = b + RAD;
          idx.push(a, a2, b, b, a2, b2);
        }
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mat = L().M.std('#ffffff', 0.62, 0);
    mat.vertexColors = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.userData.noOutline = true;
    mesh.name = 'mechas';

    // Couro cabeludo pintado (pra não aparecer pele entre as mechas), recortado na linha do cabelo
    const cap = new THREE.SphereGeometry(1, 40, 28);
    const cp = cap.attributes.position;
    // Vértices abaixo da linha do cabelo sobem até ela (borda lisa, sem degrauzinhos)
    const dentro = [];
    for (let i = 0; i < cp.count; i++) {
      const d = new V(cp.getX(i), cp.getY(i), cp.getZ(i));
      const ok = noCouro(d, 0.03);
      dentro.push(noCouro(d, 0.25));
      if (!ok) {
        for (let k = 0; k < 4; k++) {
          const y = linha(d) - 0.03;
          const h = Math.sqrt(Math.max(0, 1 - y * y));
          const hh = Math.hypot(d.x, d.z) || 1;
          d.set((d.x / hh) * h, y, (d.z / hh) * h);
        }
      }
      cp.setXYZ(i, d.x * ax * 1.03, d.y * ay * 1.03, d.z * az * 1.035);
    }
    const ci = cap.index.array;
    const novo = [];
    for (let i = 0; i < ci.length; i += 3) if (dentro[ci[i]] || dentro[ci[i + 1]] || dentro[ci[i + 2]]) novo.push(ci[i], ci[i + 1], ci[i + 2]);
    cap.setIndex(novo);
    cap.computeVertexNormals();
    const capMesh = new THREE.Mesh(cap, L().M.std(corR.clone().lerp(corA, 0.4), 0.7, 0));
    capMesh.userData.noOutline = true;
    capMesh.name = 'couro';

    const g = new THREE.Group();
    g.add(capMesh);
    g.add(mesh);
    g.userData.dispose = () => {
      geo.dispose();
      cap.dispose();
      mat.dispose();
    };
    return g;
  }

  // ------------------------------------------------------------------
  // ESTAMPAS das camisetas
  // ------------------------------------------------------------------
  function desenharGato(ctx, w, h) {
    // Gato listrado em preto e branco piscando, com sorrisinho (a camiseta do Fabricio)
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.56;
    const W = w * 0.4;
    ctx.save();
    // Orelhas
    ctx.fillStyle = '#e7e5e4';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(cx + s * W * 0.3, cy - W * 0.62);
      ctx.lineTo(cx + s * W * 0.95, cy - W * 1.15);
      ctx.lineTo(cx + s * W * 0.92, cy - W * 0.35);
      ctx.fill();
    });
    ctx.fillStyle = '#57534e';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(cx + s * W * 0.45, cy - W * 0.6);
      ctx.lineTo(cx + s * W * 0.88, cy - W * 0.98);
      ctx.lineTo(cx + s * W * 0.86, cy - W * 0.48);
      ctx.fill();
    });
    // Cabeça e "corpo" saindo da gola
    ctx.fillStyle = '#e7e5e4';
    ctx.beginPath();
    ctx.ellipse(cx, cy, W, W * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + W * 1.05, W * 1.25, W * 0.6, 0, Math.PI, 0);
    ctx.fill();
    // Listras de tigrado
    ctx.strokeStyle = '#3f3a36';
    ctx.lineWidth = w * 0.016;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * W * 0.12, cy - W * 0.8);
      ctx.quadraticCurveTo(cx + i * W * 0.15, cy - W * 0.55, cx + i * W * 0.1, cy - W * 0.38);
      ctx.stroke();
    }
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + s * W * 0.98, cy - W * 0.1 + i * W * 0.2);
        ctx.quadraticCurveTo(cx + s * W * 0.8, cy + i * W * 0.2, cx + s * W * 0.62, cy - W * 0.05 + i * W * 0.22);
        ctx.stroke();
      }
    });
    // Olho aberto (esquerda) e piscando (direita)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(cx - W * 0.38, cy - W * 0.12, W * 0.17, W * 0.13, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e7e5e4';
    ctx.beginPath();
    ctx.ellipse(cx - W * 0.38, cy - W * 0.12, W * 0.04, W * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = w * 0.022;
    ctx.beginPath();
    ctx.moveTo(cx + W * 0.2, cy - W * 0.08);
    ctx.quadraticCurveTo(cx + W * 0.38, cy - W * 0.24, cx + W * 0.58, cy - W * 0.1);
    ctx.stroke();
    // Focinho, nariz e sorriso
    ctx.fillStyle = '#f5f5f4';
    ctx.beginPath();
    ctx.ellipse(cx, cy + W * 0.3, W * 0.42, W * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.1, cy + W * 0.12);
    ctx.lineTo(cx + W * 0.1, cy + W * 0.12);
    ctx.lineTo(cx, cy + W * 0.24);
    ctx.fill();
    ctx.lineWidth = w * 0.014;
    ctx.beginPath();
    ctx.moveTo(cx, cy + W * 0.24);
    ctx.quadraticCurveTo(cx - W * 0.1, cy + W * 0.4, cx - W * 0.24, cy + W * 0.3);
    ctx.moveTo(cx, cy + W * 0.24);
    ctx.quadraticCurveTo(cx + W * 0.1, cy + W * 0.4, cx + W * 0.24, cy + W * 0.3);
    ctx.stroke();
    // Bigodes
    ctx.lineWidth = w * 0.006;
    ctx.strokeStyle = '#d6d3d1';
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + s * W * 0.32, cy + W * 0.28 + i * W * 0.06);
        ctx.lineTo(cx + s * W * 1.15, cy + W * 0.18 + i * W * 0.16);
        ctx.stroke();
      }
    });
    ctx.restore();
    // Textura de silk gasto
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(24,24,27,${Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }

  function desenharChama(ctx, w, h) {
    // Estampa pequena vermelha/laranja com letras góticas (camiseta do Mateus)
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createLinearGradient(0, cy - h * 0.25, 0, cy + h * 0.25);
    g.addColorStop(0, '#fbbf24');
    g.addColorStop(0.35, '#f97316');
    g.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = (i % 2 ? 0.36 : 0.42) * w;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.55;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.font = `bold ${w * 0.17}px "Old English Text MT", "UnifrakturCook", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Luiggi', cx, cy - h * 0.01);
    ctx.fillStyle = '#fde68a';
    ctx.font = `bold ${w * 0.055}px Georgia, serif`;
    ctx.fillText('BEATS · CWB', cx, cy + h * 0.33);
  }

  // ------------------------------------------------------------------
  // MONTAGEM (chamado pelo Character3D.create)
  // ------------------------------------------------------------------
  /**
   * Monta cabeça (crânio, rosto, nariz, orelhas, cabelo, óculos, brinco) dentro do grupo `head`.
   * Devolve { faceMat, faceTex(expr, aberta, pisca), dispose }.
   */
  function montarCabeca(THREE, M, f, mo, head) {
    const R = mo.R;
    const fo = mo.forma;
    const pele = f.tomPele || '#EBC1A9';
    const matPele = M.std(pele, 0.72, 0);
    const cranioGeo = deformarCabeca(new THREE.SphereGeometry(R, 32, 24), R, fo);
    const cranio = new THREE.Mesh(cranioGeo, matPele);
    cranio.castShadow = true;
    head.add(cranio);

    // Rosto: adesivo opaco com a mesma deformação
    const cache = new Map();
    const faceTex = (expr, aberta, pisca) => {
      const k = `${expr}|${aberta ? 1 : 0}|${pisca ? 1 : 0}`;
      if (cache.has(k)) return cache.get(k);
      const tex = L().makeCanvasTex(512, 512, (ctx, w, h) => desenharRostoReal(ctx, w, h, f, mo, expr, aberta, pisca));
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      cache.set(k, tex);
      return tex;
    };
    const rf = R * 1.005;
    const faceGeo = deformarCabeca(new THREE.SphereGeometry(rf, 28, 22, Math.PI / 2 - FACE.phi / 2, FACE.phi, Math.PI / 2 - FACE.t0, FACE.tl), rf, fo);
    const faceMat = M.std('#ffffff', 0.72, 0, { map: faceTex('neutro', false, false) });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.userData.noOutline = true;
    head.add(face);

    // Ponto da superfície do rosto (pra encaixar nariz, óculos e orelhas)
    const sup = (phi, dTheta) => {
      const th = Math.PI / 2 + dTheta;
      const v = new THREE.Vector3(Math.sin(th) * Math.sin(phi), Math.cos(th), Math.sin(th) * Math.cos(phi));
      const p = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([v.x * R, v.y * R, v.z * R], 3));
      deformarCabeca(p, R, fo);
      const a = p.attributes.position;
      const out = new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0));
      p.dispose();
      return out;
    };

    // Nariz: uma peça só, fina em cima (ponte) e mais larga embaixo (asas), com a ponta pra frente
    const matNariz = M.std(pele, 0.7, 0);
    const nGeo = new THREE.SphereGeometry(1, 20, 16);
    const np = nGeo.attributes.position;
    for (let i = 0; i < np.count; i++) {
      let x = np.getX(i);
      let y = np.getY(i);
      let z = np.getZ(i);
      const u = (1 - y) / 2; // 0 em cima, 1 embaixo
      x *= mix(0.4, 1.05, Math.pow(u, 1.3));
      z *= mix(0.55, 1.0, u);
      if (y < -0.5) z *= 1 - (-0.5 - y) * 0.5;
      np.setXYZ(i, x * R * 0.12, y * R * 0.23, z * R * 0.09);
    }
    nGeo.computeVertexNormals();
    const nariz = new THREE.Mesh(nGeo, matNariz);
    const meio = sup(0, 0.22);
    nariz.position.set(0, meio.y - R * 0.01, meio.z - R * 0.025);
    nariz.rotation.x = -0.12;
    nariz.userData.noOutline = true;
    head.add(nariz);

    // Orelhas
    const orelhas = [];
    [-1, 1].forEach((s) => {
      const o = new THREE.Group();
      const ext = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 14, 10), matPele);
      ext.scale.set(0.32, 1, 0.62);
      o.add(ext);
      const dentro = new THREE.Mesh(new THREE.SphereGeometry(R * 0.13, 10, 8), M.std(L().shade(pele, -22), 0.8, 0));
      dentro.scale.set(0.2, 0.9, 0.55);
      dentro.position.set(s * R * 0.03, -R * 0.01, R * 0.02);
      o.add(dentro);
      const lado = sup(s * Math.PI / 2, 0.08);
      o.position.set(lado.x + s * R * 0.02, lado.y - R * 0.02, -R * 0.06);
      o.rotation.y = s * 0.35;
      o.rotation.z = -s * 0.08;
      head.add(o);
      orelhas.push(o);
    });

    // Cabelo
    const cabelo = construirCabeloReal(THREE, R, fo, mo.cabelo);
    head.add(cabelo);

    // Óculos (aro fino de metal)
    if (mo.oculos) {
      const oc = mo.oculos;
      const metal = M.std(oc.aro, 0.3, 0.85);
      const lenteMat = new THREE.MeshPhysicalMaterial({ color: oc.lente, transparent: true, opacity: oc.opacidade, roughness: 0.05, metalness: 0, depthWrite: false });
      const og = new THREE.Group();
      const olho = sup(0.39, 0.02);
      const zf = olho.z + R * 0.085;
      [-1, 1].forEach((s) => {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(R * oc.raio, oc.fio, 6, 36), metal);
        aro.position.set(s * olho.x, olho.y + R * oc.y, zf);
        aro.scale.set(1, oc.oval || 1, 1);
        aro.rotation.y = s * 0.12;
        og.add(aro);
        const lente = new THREE.Mesh(new THREE.CircleGeometry(R * oc.raio, 28), lenteMat);
        lente.position.copy(aro.position);
        lente.scale.copy(aro.scale);
        lente.rotation.y = aro.rotation.y;
        lente.renderOrder = 3;
        og.add(lente);
        // Haste até a orelha
        const fim = new THREE.Vector3(s * R * fo.sx * 1.03, olho.y + R * 0.02, -R * 0.12);
        const ini = new THREE.Vector3(s * (olho.x + R * oc.raio * 0.98), olho.y + R * oc.y + R * 0.02, zf - R * 0.02);
        const haste = new THREE.Mesh(new THREE.CylinderGeometry(oc.fio * 0.9, oc.fio * 0.9, ini.distanceTo(fim), 5), metal);
        haste.position.copy(ini).add(fim).multiplyScalar(0.5);
        haste.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fim.clone().sub(ini).normalize());
        og.add(haste);
      });
      const ponteOc = new THREE.Mesh(new THREE.TorusGeometry(R * 0.085, oc.fio, 5, 14, Math.PI), metal);
      ponteOc.position.set(0, olho.y + R * oc.y + R * 0.04, zf + R * 0.01);
      og.add(ponteOc);
      og.traverse((m) => (m.userData.noOutline = true));
      head.add(og);
    }

    // Brinco de cruz (orelha direita do Mateus = lado -x)
    if (mo.acessorios?.brinco) {
      const metal = M.std('#e2e8f0', 0.25, 1);
      const b = new THREE.Group();
      const argola = new THREE.Mesh(new THREE.TorusGeometry(R * 0.035, R * 0.008, 5, 10), metal);
      b.add(argola);
      const v = new THREE.Mesh(new THREE.BoxGeometry(R * 0.022, R * 0.15, R * 0.014), metal);
      v.position.y = -R * 0.11;
      b.add(v);
      const hz = new THREE.Mesh(new THREE.BoxGeometry(R * 0.08, R * 0.02, R * 0.014), metal);
      hz.position.y = -R * 0.08;
      b.add(hz);
      const o = orelhas[0];
      b.position.set(o.position.x - R * 0.01, o.position.y - R * 0.19, o.position.z + R * 0.03);
      b.traverse((m) => (m.userData.noOutline = true));
      head.add(b);
    }

    return {
      faceMat,
      faceTex,
      dispose() {
        cache.forEach((t) => t.dispose());
        cabelo.userData.dispose?.();
      }
    };
  }

  /** Camiseta larga (tronco + gola + estampa) dentro do grupo `spine`. Devolve o material da camiseta. */
  function montarTronco(THREE, M, mo, spine, largura) {
    const cam = mo.camiseta;
    const larga = cam.larga || 1;
    const matTop = M.std(cam.cor, 0.92, 0);
    // Perfil da camiseta (raio × altura), girado em volta do eixo y e achatado na frente/trás
    const perfil = [
      [0.0, -0.085],
      [0.2, -0.085],
      [0.212, -0.06],
      [0.204, 0.06],
      [0.2, 0.16],
      [0.21, 0.27],
      [0.218, 0.36],
      [0.206, 0.425],
      [0.16, 0.462],
      [0.085, 0.48],
      [0.0, 0.482]
    ].map(([r, y]) => new THREE.Vector2(r * (y < 0.3 ? larga : 1), y));
    const tronco = new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), matTop);
    tronco.scale.set(0.96 * largura, 1, 0.66);
    tronco.castShadow = true;
    tronco.receiveShadow = true;
    spine.add(tronco);
    // Gola canelada
    const gola = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.011, 6, 24), M.toon(L().shade(cam.cor, 8)));
    gola.rotation.x = Math.PI / 2;
    gola.scale.set(1, 0.8, 1);
    gola.position.set(0, 0.474, 0.004);
    gola.userData.noOutline = true;
    spine.add(gola);
    // Estampa
    if (cam.estampa) {
      const tex = L().makeCanvasTex(512, 512, cam.estampa === 'gato' ? desenharGato : desenharChama);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      const grande = cam.estampa === 'gato';
      const lw = grande ? 0.3 : 0.15;
      // Pedaço de cilindro acompanhando o peito (mesma elipse do tronco)
      const ang = grande ? 1.25 : 0.62;
      const geo = new THREE.CylinderGeometry(0.222, 0.222, lw, 20, 1, true, -ang / 2, ang);
      const est = new THREE.Mesh(geo, M.toon('#ffffff', { map: tex, transparent: true, alphaTest: 0.1 }));
      est.scale.set(0.96 * largura, 1, 0.66);
      est.position.y = grande ? 0.2 : 0.3;
      est.userData.noOutline = true;
      spine.add(est);
    }
    // Corrente
    const ac = mo.acessorios || {};
    if (ac.corrente) {
      const prata = M.std('#dfe3e8', 0.22, 1);
      const fina = ac.corrente === 'fina';
      const curva = new THREE.EllipseCurve(0, 0, 0.085, fina ? 0.11 : 0.15, Math.PI * 1.08, Math.PI * 1.92, false, 0);
      const pts = curva.getPoints(24).map((p) => new THREE.Vector3(p.x, 0.47 + p.y * 0.95, 0));
      // Encosta no peito
      pts.forEach((p) => {
        const r = Math.max(0, 0.47 - p.y);
        p.z = 0.085 + r * 0.6;
      });
      const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, fina ? 0.0028 : 0.0045, 5, false), prata);
      tubo.userData.noOutline = true;
      spine.add(tubo);
      if (ac.corrente === 'cruz') {
        const fim = pts[12];
        const cruz = new THREE.Group();
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.006), prata);
        v.position.y = -0.026;
        cruz.add(v);
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.011, 0.006), prata);
        h.position.y = -0.016;
        cruz.add(h);
        cruz.position.set(fim.x, fim.y - 0.004, fim.z + 0.006);
        cruz.rotation.x = -0.25;
        cruz.traverse((m) => (m.userData.noOutline = true));
        spine.add(cruz);
      }
    }
    return matTop;
  }

  /** Mangas largas da camiseta e braço (ombro, cotovelo e pulso já existem). */
  function montarBraco(THREE, M, mo, pele, lado, juntas, matTop) {
    const matPele = M.std(pele, 0.72, 0);
    const s = lado === 'L' ? -1 : 1;
    const cap = (r, len, mat) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 12), mat);
      m.castShadow = true;
      return m;
    };
    const ombro = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 10), matTop);
    ombro.scale.set(1.0, 0.85, 0.95);
    ombro.position.set(-s * 0.012, -0.02, 0);
    ombro.castShadow = true;
    juntas.shoulder.add(ombro);
    const manga = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.074, 0.23, 14, 1, true), M.std(mo.camiseta.cor, 0.92, 0, { side: THREE.DoubleSide }));
    manga.position.y = -0.13;
    manga.castShadow = true;
    juntas.shoulder.add(manga);
    const braco = cap(0.05, 0.17, matPele);
    braco.position.y = -0.14;
    juntas.shoulder.add(braco);
    const antebraco = cap(0.043, 0.16, matPele);
    antebraco.position.y = -0.11;
    juntas.elbow.add(antebraco);
    // Mão: palma achatada, dedos juntos e polegar
    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), matPele);
    palma.scale.set(0.78, 1.15, 0.5);
    palma.position.y = -0.035;
    juntas.wrist.add(palma);
    const dedos = cap(0.028, 0.035, matPele);
    dedos.scale.set(1.15, 1, 0.55);
    dedos.position.set(0, -0.082, 0.002);
    juntas.wrist.add(dedos);
    const polegar = cap(0.012, 0.03, matPele);
    polegar.position.set(-s * 0.03, -0.045, 0.018);
    polegar.rotation.set(0.5, 0, -s * 0.6);
    juntas.wrist.add(polegar);
    const ac = mo.acessorios || {};
    // Relógio prata no pulso (lado +x) e anel
    if (ac.relogio && lado === 'R') {
      const prata = M.std('#d4d8de', 0.25, 1);
      const pulseira = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.026, 16, 1, true), prata);
      pulseira.position.y = -0.19;
      pulseira.userData.noOutline = true;
      juntas.elbow.add(pulseira);
      const mostrador = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 16), M.std('#1f2937', 0.2, 0.6));
      mostrador.rotation.x = Math.PI / 2;
      mostrador.position.set(0, -0.19, 0.049);
      mostrador.userData.noOutline = true;
      juntas.elbow.add(mostrador);
    }
    if (ac.anel) {
      const anel = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 5, 12), M.std('#e5e7eb', 0.2, 1));
      anel.rotation.x = Math.PI / 2;
      anel.position.set(s * 0.012, -0.085, 0.004);
      anel.userData.noOutline = true;
      juntas.wrist.add(anel);
    }
  }

  /** Tênis no tornozelo. */
  function montarTenis(THREE, M, mo, ankle) {
    const tn = mo.tenis;
    const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.15, 4, 12), M.toon(tn.cor));
    corpo.rotation.x = Math.PI / 2;
    corpo.scale.set(1.08, 1, 0.72);
    corpo.position.set(0, -0.03, 0.045);
    corpo.castShadow = true;
    ankle.add(corpo);
    const sola = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.032, 0.28), M.toon(tn.sola));
    sola.position.set(0, -0.075, 0.045);
    sola.castShadow = true;
    ankle.add(sola);
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.012, 0.2), M.toon(tn.detalhe));
    faixa.position.set(0, -0.052, 0.03);
    faixa.userData.noOutline = true;
    ankle.add(faixa);
    const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.06, 12), M.toon(tn.cor));
    cano.position.set(0, 0.0, -0.005);
    ankle.add(cano);
  }

  root.Luiggi3DReal = { MODELOS, montarCabeca, montarTronco, montarBraco, montarTenis, desenharRostoReal, construirCabeloReal, deformarCabeca };
})(window);
