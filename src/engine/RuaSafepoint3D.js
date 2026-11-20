/**
 * RUA DO SAFEPOINT · R. Mercedes Seiler Rocha, 185 (Curitiba)
 * Cenário 3D completo, montado a partir das fotos do Street View (abr/2025):
 *  - lado da casa (−z): tapume azul da obra com as placas → casa do telhado vinho (garagem coberta e portão)
 *    → Casa do Bicho (clínica veterinária azul, estacionamento de bloquete, cerca de vidro) → muro cinza e sobrado;
 *  - outro lado (+z): sobrados brancos geminados com cerca branca, palmeiras, casa da garagem cinza, árvores grandes;
 *  - postes de concreto com fiação cruzando a rua, araucárias, céu azul com nuvens.
 * A rua corre no eixo x. O Subaru fica na vaga em frente ao portão da casa (VAGA), de frente pra casa (−z).
 * Tudo é geometria; só a placa da obra usa um recorte da foto (com servidor local). Abrindo via file://, ela é desenhada.
 */
(function (root) {
  const T = () => root.THREE;
  const L = () => root.Luiggi3D;
  const H = () => root.Luiggi3DEnv.helpers;

  const FOTO_PLACA_OBRA = 'assets/Cenarios/safe point para chilling/placa_obra.jpg';
  const VAGA = [0, 0, -3.2]; // Subaru visto de fora (menu e capítulos)
  const VAGA_POV = [0, 0, -1.0]; // em primeira pessoa: um pouco mais pra trás, pra casa aparecer pelo para-brisa
  const FRENTE_NORTE = -6.2; // alinhamento dos muros do lado da casa
  const FRENTE_SUL = 14; // alinhamento das cercas do outro lado
  const MEIO_FIO_N = 1.6;
  const MEIO_FIO_S = 9.6;

  // ------------------------------------------------------------------
  // TEXTURAS
  // ------------------------------------------------------------------
  const tex = (w, h, draw, rx = 1, ry = 1) => L().makeCanvasTex(w, h, draw, rx, ry);
  const rnd = (a, b) => a + Math.random() * (b - a);
  function pontilhar(ctx, w, h, n, cores, s = [1, 3]) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cores[i % cores.length];
      const k = rnd(s[0], s[1]);
      ctx.fillRect(Math.random() * w, Math.random() * h, k, k);
    }
  }

  const TX = {
    grama(rx, ry) {
      return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#6b8f3d';
        ctx.fillRect(0, 0, w, h);
        pontilhar(ctx, w, h, 6000, ['#5c8233', '#7ba248', '#54782e', '#88ad55', '#4b6c29', '#93b45e'], [1, 3]);
        ctx.lineWidth = 1;
        for (let i = 0; i < 500; i++) {
          ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(40,70,20,0.35)' : 'rgba(170,200,110,0.3)';
          const x = Math.random() * w;
          const y = Math.random() * h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + rnd(-2, 2), y - rnd(3, 7));
          ctx.stroke();
        }
      }, rx, ry);
    },
    bloquete(rx, ry, base = '#a19d95') {
      return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#6e6a63';
        ctx.fillRect(0, 0, w, h);
        const bw = 64;
        const bh = 32;
        for (let y = 0, row = 0; y < h; y += bh, row++) {
          for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
            ctx.fillStyle = L().shade(base, rnd(-14, 10));
            ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          }
        }
        pontilhar(ctx, w, h, 2500, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.08)'], [1, 2]);
      }, rx, ry);
    },
    concreto(rx, ry, base = '#b3afa6') {
      return L().textures.concrete(base, rx, ry);
    },
    asfalto(rx, ry) {
      return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#6d7075';
        ctx.fillRect(0, 0, w, h);
        pontilhar(ctx, w, h, 9000, ['#767a80', '#62656a', '#808489', '#585b60', '#8b8e92'], [1, 2.5]);
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = 'rgba(40,40,45,0.35)';
          ctx.beginPath();
          let x = Math.random() * w;
          let y = Math.random() * h;
          ctx.moveTo(x, y);
          for (let k = 0; k < 6; k++) ctx.lineTo((x += rnd(-20, 20)), (y += rnd(-20, 20)));
          ctx.stroke();
        }
      }, rx, ry);
    },
    terra(rx, ry) {
      return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#b4673f';
        ctx.fillRect(0, 0, w, h);
        pontilhar(ctx, w, h, 6000, ['#a65a35', '#c27a4f', '#94502f', '#cf8d63', '#8a4a2c'], [1, 4]);
      }, rx, ry);
    },
    /** Telha colonial: fileiras de canais arredondados. Coordenadas em metros → repeat ~0.42 por metro. */
    telha(cor, rx = 0.42, ry = 0.42) {
      return tex(256, 256, (ctx, w, h) => {
        const cw = 32;
        const ch = 32;
        for (let y = 0; y < h; y += ch) {
          for (let x = 0; x < w; x += cw) {
            const c = L().shade(cor, rnd(-12, 12));
            const g = ctx.createLinearGradient(x, 0, x + cw, 0);
            g.addColorStop(0, L().shade(c, -40));
            g.addColorStop(0.5, L().shade(c, 22));
            g.addColorStop(1, L().shade(c, -40));
            ctx.fillStyle = g;
            ctx.fillRect(x, y, cw, ch);
          }
          const s = ctx.createLinearGradient(0, y + ch - 7, 0, y + ch);
          s.addColorStop(0, 'rgba(0,0,0,0)');
          s.addColorStop(1, 'rgba(0,0,0,0.45)');
          ctx.fillStyle = s;
          ctx.fillRect(0, y + ch - 7, w, 7);
        }
        pontilhar(ctx, w, h, 900, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.06)'], [1, 3]);
      }, rx, ry);
    },
    /** Telha shingle (sobrados brancos). */
    shingle(cor, rx = 0.5, ry = 0.5) {
      return tex(256, 256, (ctx, w, h) => {
        const ch = 24;
        for (let y = 0, row = 0; y < h; y += ch, row++) {
          for (let x = row % 2 ? -20 : 0; x < w; x += 40) {
            ctx.fillStyle = L().shade(cor, rnd(-16, 14));
            ctx.fillRect(x + 1, y, 38, ch - 2);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(0, y + ch - 3, w, 3);
        }
      }, rx, ry);
    },
    /** Lambri horizontal (fachadas dos sobrados brancos). */
    lambri(rx, ry, cor = '#f3f1eb') {
      return tex(128, 128, (ctx, w, h) => {
        ctx.fillStyle = cor;
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 16) {
          const g = ctx.createLinearGradient(0, y, 0, y + 16);
          g.addColorStop(0, 'rgba(255,255,255,0.35)');
          g.addColorStop(0.8, 'rgba(0,0,0,0.02)');
          g.addColorStop(1, 'rgba(0,0,0,0.22)');
          ctx.fillStyle = g;
          ctx.fillRect(0, y, w, 16);
        }
      }, rx, ry);
    },
    /** Tapume metálico azul ondulado. */
    tapume(rx) {
      return tex(256, 128, (ctx, w, h) => {
        for (let x = 0; x < w; x += 16) {
          const g = ctx.createLinearGradient(x, 0, x + 16, 0);
          g.addColorStop(0, '#24439f');
          g.addColorStop(0.5, '#3d64c8');
          g.addColorStop(1, '#24439f');
          ctx.fillStyle = g;
          ctx.fillRect(x, 0, 16, h);
        }
        ctx.fillStyle = 'rgba(10,20,60,0.5)';
        ctx.fillRect(0, 0, 3, h);
        ctx.fillRect(w / 2, 0, 3, h);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, 4, w, 3);
        pontilhar(ctx, w, h, 500, ['rgba(140,90,60,0.25)', 'rgba(0,0,0,0.15)'], [1, 3]);
      }, rx, 1);
    },
    portaoGaragem(rx = 1, ry = 1) {
      return tex(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#7d8287';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(0, y, w, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(0, y + 6, w, 2);
        }
      }, rx, ry);
    },
    folhaPalmeira() {
      const t = tex(64, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#5d7d2c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2, h);
        ctx.lineTo(w / 2, 0);
        ctx.stroke();
        for (let y = h - 8; y > 4; y -= 5) {
          const k = y / h;
          const len = (w / 2 - 2) * (0.35 + 0.65 * Math.sin(k * Math.PI));
          ctx.strokeStyle = ['#6f9a3a', '#7fae46', '#5f8a31', '#8ab84f'][(y / 5) % 4 | 0];
          ctx.lineWidth = 2;
          [-1, 1].forEach((s) => {
            ctx.beginPath();
            ctx.moveTo(w / 2, y);
            ctx.lineTo(w / 2 + s * len, y - 10);
            ctx.stroke();
          });
        }
      });
      t.wrapS = t.wrapT = T().ClampToEdgeWrapping;
      return t;
    },
    nuvem() {
      const t = tex(256, 128, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) {
          const x = rnd(40, w - 40);
          const y = rnd(h * 0.4, h * 0.72) - Math.sin(((x - 40) / (w - 80)) * Math.PI) * 26;
          const r = rnd(18, 42);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(255,255,255,0.95)');
          g.addColorStop(0.6, 'rgba(250,252,255,0.6)');
          g.addColorStop(1, 'rgba(240,245,252,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // base levemente acinzentada
        const b = ctx.createLinearGradient(0, h * 0.55, 0, h);
        b.addColorStop(0, 'rgba(200,210,225,0)');
        b.addColorStop(1, 'rgba(200,210,225,0)');
        ctx.fillStyle = b;
        ctx.fillRect(0, 0, w, h);
      });
      t.wrapS = t.wrapT = T().ClampToEdgeWrapping;
      return t;
    }
  };

  // Placa da Casa do Bicho (redesenhada: nas fotos ela fica atrás do marcador do Street View)
  function logoCasaDoBicho(ctx, x, y, s) {
    const L3 = L();
    ctx.fillStyle = '#52b847';
    L3.roundRect(ctx, x, y, s, s * 0.82, s * 0.08);
    ctx.fill();
    // casinha
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, y + s * 0.38);
    ctx.lineTo(x + s * 0.5, y + s * 0.08);
    ctx.lineTo(x + s * 0.88, y + s * 0.38);
    ctx.lineTo(x + s * 0.8, y + s * 0.38);
    ctx.lineTo(x + s * 0.8, y + s * 0.74);
    ctx.lineTo(x + s * 0.2, y + s * 0.74);
    ctx.lineTo(x + s * 0.2, y + s * 0.38);
    ctx.closePath();
    ctx.fill();
    // cachorro e gato (silhuetas)
    ctx.fillStyle = '#52b847';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.4, y + s * 0.6, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.4, y + s * 0.44, s * 0.07, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + s * 0.6, y + s * 0.62, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.6, y + s * 0.49, s * 0.055, s * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.555, y + s * 0.46);
    ctx.lineTo(x + s * 0.565, y + s * 0.4);
    ctx.lineTo(x + s * 0.59, y + s * 0.45);
    ctx.moveTo(x + s * 0.61, y + s * 0.45);
    ctx.lineTo(x + s * 0.635, y + s * 0.4);
    ctx.lineTo(x + s * 0.645, y + s * 0.46);
    ctx.fill();
  }

  function texPlacaBicho() {
    return tex(1024, 208, (ctx, w, h) => {
      ctx.fillStyle = '#2563c9';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      logoCasaDoBicho(ctx, 70, 14, 130);
      ctx.fillStyle = '#7ddc6a';
      ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CASA DO BICHO', 135, 178);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('• CLÍNICA VETERINÁRIA', 320, 70);
      ctx.fillText('• BANHO & TOSA', 320, 138);
    });
  }

  function texPlacaBichoAlta() {
    return tex(256, 220, (ctx, w, h) => {
      ctx.fillStyle = '#2b69cf';
      ctx.fillRect(0, 0, w, h);
      logoCasaDoBicho(ctx, 58, 20, 140);
      ctx.fillStyle = '#7ddc6a';
      ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CASA DO BICHO', w / 2, 168);
    });
  }

  function texPlacaObraDesenhada() {
    return tex(768, 352, (ctx, w, h) => {
      ctx.fillStyle = '#e9edf3';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f4ea8';
      ctx.fillRect(0, 0, w, 22);
      ctx.fillRect(0, 150, w, 170);
      ctx.strokeStyle = '#2f4ea8';
      ctx.lineWidth = 5;
      ctx.strokeRect(135, 36, 125, 100);
      ctx.fillStyle = '#2f4ea8';
      ctx.font = 'bold 54px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('rac', 197, 86);
      ctx.fillStyle = '#1f2a44';
      ctx.font = 'bold 42px "Segoe UI", sans-serif';
      ctx.fillText('TECTER', 420, 92);
      ctx.fillStyle = '#2f4ea8';
      ctx.fillText('BRAFER', 660, 92);
      ctx.fillStyle = '#c7d2ee';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('RESPONSÁVEIS TÉCNICOS', w / 2, 170);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 5; i++) for (let k = 0; k < 2; k++) ctx.fillRect(30 + i * 150, 200 + k * 60, 100, 8);
      ctx.fillStyle = '#e9edf3';
      ctx.fillRect(0, 320, w, 32);
    });
  }

  function texPlacaFornecedores() {
    return tex(384, 300, (ctx, w, h) => {
      ctx.fillStyle = '#eef0f2';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FORNECEDORES:', w / 2, 40);
      const cores = ['#4f9d3a', '#c0392b', '#f1c40f', '#2e86c1', '#8e44ad', '#e67e22'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = cores[i];
        ctx.fillRect(20 + (i % 3) * 120, 70 + Math.floor(i / 3) * 105, 100, 85);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(32 + (i % 3) * 120, 100 + Math.floor(i / 3) * 105, 76, 12);
      }
    });
  }

  // ------------------------------------------------------------------
  // GEOMETRIA
  // ------------------------------------------------------------------
  /**
   * Telhado de quatro águas com cumeeira ao longo de x (inset 0 = duas águas com oitões).
   * Base no y=0, centrado. UVs em metros. Grupo 0 = águas, grupo 1 = pontas/oitões.
   */
  function telhado(w, d, h, inset, matAguas, matOitao) {
    const THREE = T();
    const hw = w / 2;
    const hd = d / 2;
    const A = [-hw, 0, hd];
    const B = [hw, 0, hd];
    const C = [hw, 0, -hd];
    const D = [-hw, 0, -hd];
    const R1 = [-hw + inset, h, 0];
    const R2 = [hw - inset, h, 0];
    const pos = [];
    const uv = [];
    const face = (pts, eixoU, eixoV) => {
      const n = Math.hypot(...eixoV);
      const v = eixoV.map((c) => c / n);
      pts.forEach((p) => {
        pos.push(...p);
        uv.push(p[0] * eixoU[0] + p[2] * eixoU[2], p[0] * v[0] + p[1] * v[1] + p[2] * v[2]);
      });
    };
    face([A, B, R2, A, R2, R1], [1, 0, 0], [0, h, -hd]);
    face([C, D, R1, C, R1, R2], [-1, 0, 0], [0, h, hd]);
    face([D, A, R1], [0, 0, 1], [inset || 0.001, h, 0]);
    face([B, C, R2], [0, 0, -1], [-(inset || 0.001), h, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.addGroup(0, 12, 0);
    geo.addGroup(12, 6, 1);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, [matAguas, matOitao || matAguas]);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function matTelha(cor, o = {}) {
    const THREE = T();
    const m = L().M.std('#ffffff', 0.78, 0.02, { map: o.shingle ? TX.shingle(cor) : TX.telha(cor), side: THREE.DoubleSide });
    return m;
  }

  /** Chão retangular (x0..x1, z0..z1) com a textura repetindo a cada `k` metros. */
  function chao(g, x0, x1, z0, z1, mat, y = 0.01) {
    const p = L().plane(x1 - x0, z1 - z0, mat, (x0 + x1) / 2, y, (z0 + z1) / 2);
    p.rotation.x = -Math.PI / 2;
    g.add(p);
    return p;
  }
  const matChao = (fn, w, d, k, ...extra) => L().M.std('#ffffff', 0.95, 0, { map: fn(w / k, d / k, ...extra) });

  /** Grade de barras verticais entre dois pontos [x, z]. */
  function grade(g, a, b, alt, passo, mat, o = {}) {
    const THREE = T();
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const y0 = o.y0 || 0;
    const esp = o.esp || 0.035;
    const n = Math.max(1, Math.round(len / passo));
    const ts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ts.push([a[0] + dx * t, y0 + alt / 2, a[1] + dz * t, 0, -ang, 0]);
    }
    g.add(H().instanced(new THREE.BoxGeometry(esp, alt, esp), mat, ts, { receive: false }));
    (o.trilhos || [0.04, alt - 0.04]).forEach((yy) => {
      const r = L().box(len, 0.05, 0.05, mat, a[0] + dx / 2, y0 + yy, a[1] + dz / 2);
      r.rotation.y = -ang;
      g.add(r);
    });
  }

  /** Janela com moldura, vidro, divisões e (opcional) grade. Por padrão de frente pra +z. */
  function janela(g, x, y, z, w, h, o = {}) {
    const THREE = T();
    const { box, M } = L();
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = o.rotY || 0;
    const mold = M.std(o.moldura || '#f5f5f4', 0.6);
    grp.add(box(w + 0.12, h + 0.12, 0.08, mold, 0, 0, 0, { cast: false }));
    grp.add(box(w, h, 0.1, M.std(o.vidro || '#2c3845', 0.12, 0.55), 0, 0, 0.005, { cast: false }));
    const divs = o.divs ?? 1;
    for (let i = 1; i <= divs; i++) grp.add(box(0.05, h, 0.12, mold, -w / 2 + (w * i) / (divs + 1), 0, 0, { cast: false }));
    if (o.travessa) grp.add(box(w, 0.05, 0.12, mold, 0, o.travessa, 0, { cast: false }));
    if (o.grade) {
      const gm = M.std(o.grade, 0.5, 0.3);
      for (let i = 1; i < 6; i++) grp.add(box(0.025, h, 0.03, gm, -w / 2 + (w * i) / 6, 0, 0.08, { cast: false }));
      for (let i = 1; i < 4; i++) grp.add(box(w, 0.025, 0.03, gm, 0, -h / 2 + (h * i) / 4, 0.08, { cast: false }));
    }
    if (o.venezianas) {
      const vm = M.std(o.venezianas, 0.7);
      [-1, 1].forEach((s) => grp.add(box(w * 0.5, h + 0.08, 0.05, vm, s * (w * 0.75 + 0.06), 0, 0.03)));
    }
    grp.add(box(w + 0.24, 0.05, 0.16, M.std('#d6d3d1', 0.7), 0, -h / 2 - 0.08, 0.04, { cast: false }));
    g.add(grp);
    return grp;
  }

  // ------------------------------------------------------------------
  // VEGETAÇÃO
  // ------------------------------------------------------------------
  function transformEntre(THREE, a, b) {
    const va = new THREE.Vector3(...a);
    const dir = new THREE.Vector3(...b).sub(va);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return [va.x, va.y, va.z, e.x, e.y, e.z, 1, len, 1];
  }

  /** Araucárias (copa em "taça", típica de Curitiba). lista: [x, z, altura] */
  function araucarias(g, lista) {
    const THREE = T();
    const { M } = L();
    const casca = M.std('#5b4535', 0.95);
    const geoTronco = new THREE.CylinderGeometry(0.16, 0.32, 1, 8);
    geoTronco.translate(0, 0.5, 0);
    const geoGalho = new THREE.CylinderGeometry(0.05, 0.09, 1, 5);
    geoGalho.translate(0, 0.5, 0);
    const geoTufo = new THREE.IcosahedronGeometry(1, 1);
    const troncos = [];
    const galhos = [];
    const tufos = [];
    lista.forEach(([x, z, h]) => {
      const s = h / 15;
      troncos.push([x, 0, z, 0, 0, 0, s, h, s]);
      const off = Math.random() * Math.PI;
      [
        [0.66, 3.3, 0.9, 8],
        [0.74, 2.7, 0.93, 7],
        [0.82, 2.0, 0.96, 6],
        [0.9, 1.1, 0.99, 5]
      ].forEach(([fy, r, fe, n], k) => {
        for (let j = 0; j < n; j++) {
          const a = off + k * 0.4 + (j / n) * Math.PI * 2 + rnd(-0.15, 0.15);
          const rr = r * s * rnd(0.85, 1.1);
          const fim = [x + Math.cos(a) * rr, h * fe + rnd(-0.2, 0.2), z + Math.sin(a) * rr];
          galhos.push(transformEntre(THREE, [x, h * fy, z], fim));
          const t = 1.15 * s * rnd(0.85, 1.15);
          const c = L().shade('#3d5a33', rnd(-14, 10));
          tufos.push(Object.assign([fim[0], fim[1] + 0.12, fim[2], 0, a, 0, t, 0.42 * t, t], { cor: c }));
        }
      });
      tufos.push(Object.assign([x, h + 0.1, z, 0, 0, 0, 1.2 * s, 0.45 * s, 1.2 * s], { cor: '#3a5631' }));
    });
    g.add(H().instanced(geoTronco, casca, troncos));
    g.add(H().instanced(geoGalho, casca, galhos));
    const folha = M.std('#ffffff', 0.95);
    folha.flatShading = true;
    g.add(H().instanced(geoTufo, folha, tufos));
  }

  /** Árvores de copa arredondada. lista: [x, z, altura, raio, corBase?] */
  function arvores(g, lista) {
    const THREE = T();
    const { M } = L();
    const geoTronco = new THREE.CylinderGeometry(0.12, 0.2, 1, 7);
    geoTronco.translate(0, 0.5, 0);
    const geoCopa = new THREE.IcosahedronGeometry(1, 1);
    const troncos = [];
    const copas = [];
    lista.forEach(([x, z, h, r, cor]) => {
      const s = Math.max(0.5, r / 2.5);
      troncos.push([x, 0, z, 0, 0, 0, s, h * 0.62, s]);
      const n = r > 1.6 ? 7 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(0, 1);
        const d = i === 0 ? 0 : r * rnd(0.35, 0.6);
        const k = r * rnd(0.5, 0.72);
        copas.push(Object.assign([x + Math.cos(a) * d, h * rnd(0.68, 0.86), z + Math.sin(a) * d, rnd(0, 3), rnd(0, 3), 0, k, k * 0.85, k], { cor: L().shade(cor || '#4e7a34', rnd(-18, 14)) }));
      }
    });
    g.add(H().instanced(geoTronco, M.std('#5c4a3a', 0.95), troncos));
    const folha = M.std('#ffffff', 0.9);
    folha.flatShading = true;
    g.add(H().instanced(geoCopa, folha, copas));
  }

  /** Touceira de palmeiras-areca. */
  function palmeiras(g, x, z, n = 6) {
    const THREE = T();
    const { M } = L();
    const tFolha = TX.folhaPalmeira();
    const matFolha = new THREE.MeshStandardMaterial({ map: tFolha, color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.35, transparent: false });
    const matTronco = M.std('#8f8a6a', 0.8);
    const geoFolha = new THREE.PlaneGeometry(0.75, 2.6, 1, 6);
    geoFolha.translate(0, 1.3, 0);
    const p = geoFolha.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i) / 2.6;
      p.setZ(i, -yy * yy * 1.1);
    }
    geoFolha.computeVertexNormals();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(0, 0.6);
      const base = [x + Math.cos(a) * rnd(0.1, 0.5), 0, z + Math.sin(a) * rnd(0.1, 0.5)];
      const h = rnd(4.2, 6.6);
      const topo = [base[0] + Math.cos(a) * rnd(0.3, 0.9), h, base[2] + Math.sin(a) * rnd(0.3, 0.9)];
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 6).translate(0, 0.5, 0), matTronco);
      const t = transformEntre(THREE, base, topo);
      tr.position.set(t[0], t[1], t[2]);
      tr.rotation.set(t[3], t[4], t[5]);
      tr.scale.set(1, t[7], 1);
      tr.castShadow = true;
      g.add(tr);
      const nf = 8;
      for (let k = 0; k < nf; k++) {
        const f = new THREE.Mesh(geoFolha, matFolha);
        f.position.set(...topo);
        f.rotation.order = 'YXZ';
        f.rotation.y = (k / nf) * Math.PI * 2 + rnd(0, 0.4);
        f.rotation.x = rnd(0.5, 1.2);
        f.castShadow = true;
        g.add(f);
      }
    }
  }

  function arbustos(g, lista, cor = '#3f6b2e') {
    const THREE = T();
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const folha = L().M.std('#ffffff', 0.9);
    folha.flatShading = true;
    g.add(H().instanced(geo, folha, lista.map(([x, z, r]) => Object.assign([x, r * 0.6, z, rnd(0, 3), rnd(0, 3), 0, r, r * 0.75, r], { cor: L().shade(cor, rnd(-15, 15)) }))));
  }

  // ------------------------------------------------------------------
  // POSTES E FIAÇÃO
  // ------------------------------------------------------------------
  function posteConcreto(g, x, z, o = {}) {
    const { box, cyl, M } = L();
    const conc = M.std('#b0aea6', 0.85);
    g.add(cyl(0.12, 0.2, 10, conc, x, 5, z, 6));
    g.add(box(1.8, 0.12, 0.12, conc, x, 9.2, z));
    g.add(box(0.12, 0.12, 0.9, conc, x, 7.4, z, { cast: false }));
    if (o.trafo) g.add(cyl(0.35, 0.35, 0.9, M.std('#8d9196', 0.5, 0.5), x + 0.45, 6.6, z, 12));
    if (o.luminaria) {
      const s = o.luminaria;
      const braco = box(0.08, 0.08, 1.8, M.std('#9ca3af', 0.4, 0.7), x, 8.1, z + s * 0.9);
      braco.rotation.x = s * 0.15;
      g.add(braco);
      g.add(box(0.32, 0.14, 0.6, M.std('#d1d5db', 0.4, 0.5), x, 8.25, z + s * 1.85));
    }
    return {
      a: [x - 0.75, 9.3, z],
      b: [x, 9.3, z],
      c: [x + 0.75, 9.3, z],
      tel: [x, 7.4, z],
      cabo: [x, 6.9, z]
    };
  }

  /** Fios com barriga (parábola). pares: [[p0, p1, barriga], ...] */
  function fios(g, pares) {
    const THREE = T();
    const pts = [];
    pares.forEach(([a, b, sag = 0.5]) => {
      const seg = 14;
      let ant = a;
      for (let i = 1; i <= seg; i++) {
        const t = i / seg;
        const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
        pts.push(...ant, ...p);
        ant = p;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#25272b' }));
    l.userData.noOutline = true;
    g.add(l);
  }

  // ------------------------------------------------------------------
  // CARROS ESTACIONADOS (sem os halos de farol, que é dia)
  // ------------------------------------------------------------------
  function carro(g, x, z, rotY, cor, tipo = 'civic') {
    const c = L().createCarMesh({ tipo, cor, rodas: '#c7ccd1' });
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    c.traverse((m) => {
      if (m.isSprite) m.visible = false;
    });
    g.add(c);
    return c;
  }

  // ------------------------------------------------------------------
  // MONTAGEM
  // ------------------------------------------------------------------
  function construir(o = {}) {
    const THREE = T();
    const { box, cyl, plane, M } = L();
    const g = new THREE.Group();

    // ---------- CÉU, SOL E NUVENS ----------
    H().ceu(g, [[0, '#2f73cf'], [0.28, '#5b9ae2'], [0.46, '#a6cbf1'], [0.52, '#dce9f6'], [1, '#e4edf6']], 150);
    const solDir = new THREE.Vector3(10, 22, 14).normalize();
    const sol = L().halo('#fff7dc', 34, 1.5);
    sol.material.fog = false;
    sol.position.copy(solDir).multiplyScalar(130);
    g.add(sol);
    const nucleo = L().halo('#ffffff', 9, 2.2);
    nucleo.material.fog = false;
    nucleo.position.copy(sol.position);
    g.add(nucleo);
    const texNuvem = TX.nuvem();
    const nuvens = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd(-0.15, 0.15);
      const r = rnd(70, 120);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNuvem, transparent: true, depthWrite: false, fog: false, opacity: rnd(0.75, 0.95) }));
      s.position.set(Math.cos(a) * r, rnd(26, 52), Math.sin(a) * r);
      const k = rnd(28, 52);
      s.scale.set(k, k * 0.45, 1);
      s.userData.noOutline = true;
      g.add(s);
      nuvens.push({ s, a, r, v: rnd(0.002, 0.005) });
    }

    // ---------- CHÃO ----------
    chao(g, -110, 110, -110, 110, matChao(TX.grama, 220, 220, 3.5), -0.03);
    // Rua: asfalto claro, faixa central tracejada branca, linha amarela junto ao meio-fio do outro lado
    chao(g, -110, 110, MEIO_FIO_N, MEIO_FIO_S, matChao(TX.asfalto, 220, 8, 4), 0.0);
    const tinta = M.std('#f1f1ee', 0.7);
    const tracos = [];
    for (let x = -108; x < 108; x += 7) tracos.push([x, 0.012, (MEIO_FIO_N + MEIO_FIO_S) / 2, 0, 0, 0]);
    g.add(H().instanced(new THREE.BoxGeometry(3, 0.01, 0.13), tinta, tracos, { cast: false }));
    g.add(box(220, 0.01, 0.13, M.std('#f2a23a', 0.7), 0, 0.012, MEIO_FIO_S - 0.25, { cast: false }));
    // Meios-fios
    const matMeioFio = M.std('#c9c6bf', 0.85);
    g.add(box(220, 0.14, 0.16, matMeioFio, 0, 0.07, MEIO_FIO_N - 0.08));
    g.add(box(220, 0.14, 0.16, matMeioFio, 0, 0.07, MEIO_FIO_S + 0.08));

    // Calçada do lado da casa (−z)
    chao(g, -110, -2.8, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 107, 7.6, 3.5), 0.02);
    chao(g, -2.8, 2.8, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.concreto, 5.6, 7.6, 3, '#b8b4ab'), 0.025); // rampa da garagem (vaga do Subaru)
    chao(g, 2.8, 11, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 8.2, 7.6, 3.5), 0.02);
    chao(g, 11, 25, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.bloquete, 14, 7.6, 2.2), 0.025); // estacionamento da Casa do Bicho
    g.add(box(13, 0.01, 0.1, M.std('#f2c230', 0.7), 18, 0.035, 0.9, { cast: false }));
    chao(g, 25, 27.4, -2.6, MEIO_FIO_N - 0.16, M.std('#3fb7ae', 0.85), 0.03);
    chao(g, 25, 110, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 85, 7.6, 3.5), 0.02);
    chao(g, 27.4, 110, -1.2, 0.2, matChao(TX.concreto, 82.6, 1.4, 2, '#c4c0b7'), 0.028);

    // Calçada do outro lado (+z): faixa de grama junto ao meio-fio + bloquete junto às cercas
    chao(g, -110, 110, MEIO_FIO_S + 0.16, 11.4, matChao(TX.grama, 220, 1.6, 3.5), 0.02);
    chao(g, -110, 110, 11.4, FRENTE_SUL, matChao(TX.bloquete, 220, 2.6, 2.2, '#a7a39b'), 0.025);
    chao(g, -13.6, 6.4, FRENTE_SUL, 16.5, matChao(TX.bloquete, 20, 2.5, 2.2, '#b1ada4'), 0.025);

    // ---------- CASA DO SAFEPOINT (telhado vinho, garagem coberta) ----------
    const parede = M.std('#ddd0b6', 0.9);
    const ferro = M.std('#1d1b1a', 0.5, 0.4);
    chao(g, 2.8, 10.8, -11.6, FRENTE_NORTE, matChao(TX.grama, 8, 5.4, 3.5), 0.015);
    chao(g, -2.8, 2.8, -11.6, FRENTE_NORTE, matChao(TX.concreto, 5.6, 5.4, 3, '#a9a59c'), 0.02);
    // Mureta + grade preta na frente do jardim
    g.add(box(8.3, 0.4, 0.24, parede, 6.85, 0.2, FRENTE_NORTE));
    grade(g, [2.75, FRENTE_NORTE], [10.85, FRENTE_NORTE], 1.75, 0.13, ferro, { y0: 0.4 });
    // Portão da garagem (barras escuras)
    grade(g, [-2.3, FRENTE_NORTE - 0.05], [2.3, FRENTE_NORTE - 0.05], 2.15, 0.11, M.std('#2a201b', 0.55, 0.3), { y0: 0.03, trilhos: [0.06, 1.1, 2.1] });
    // Pilares
    [-2.55, 2.55].forEach((x) => g.add(box(0.45, 2.8, 0.45, parede, x, 1.4, FRENTE_NORTE - 0.25)));
    g.add(box(0.4, 2.3, 0.4, parede, 10.95, 1.15, FRENTE_NORTE));
    // Garagem coberta
    const telhaGaragem = matTelha('#7f3a2e');
    const cobertura = telhado(6.1, 5.8, 1.0, 1.5, telhaGaragem);
    cobertura.position.set(0, 2.8, -9.0);
    g.add(cobertura);
    g.add(box(5.9, 0.05, 5.5, M.std('#ece4d6', 0.9), 0, 2.78, -9.0, { cast: false }));
    g.add(box(6.1, 0.2, 0.08, M.std('#4f1824', 0.7), 0, 2.86, -6.1));
    carro(g, 0, -9.1, Math.PI, '#2a2e35');
    // Corpo da casa
    const corpo = box(13.4, 3.0, 9.6, parede, 4.0, 1.5, -16.4);
    g.add(corpo);
    const madeira = '#4a2c1d';
    janela(g, 5.2, 1.65, -11.56, 1.9, 1.3, { moldura: madeira, divs: 2, vidro: '#2a2f36' });
    janela(g, 8.9, 1.65, -11.56, 1.5, 1.3, { moldura: madeira, divs: 1, vidro: '#2a2f36' });
    g.add(box(0.95, 2.1, 0.1, M.std('#6b3f26', 0.6), 3.2, 1.05, -11.58));
    g.add(box(0.9, 2.05, 0.1, M.std('#6b3f26', 0.6), -1.2, 1.03, -11.58));
    // Beiral da varanda (telha vinho escura) na frente
    const vinho = '#481522';
    const telhaVinho = matTelha(vinho);
    const beiral = box(8.3, 0.12, 1.5, telhaVinho, 6.85, 3.15, -11.2);
    beiral.rotation.x = 0.32;
    g.add(beiral);
    // Telhadão íngreme de quatro águas
    const telhadao = telhado(14.2, 10.6, 6.2, 2.6, telhaVinho);
    telhadao.position.set(4.0, 3.0, -16.4);
    g.add(telhadao);
    // Água-furtada com as três janelas
    g.add(box(6.2, 2.0, 3.2, parede, 4.0, 4.9, -13.4));
    [2.05, 4.0, 5.95].forEach((x) => janela(g, x, 4.85, -11.76, 1.15, 1.05, { moldura: madeira, divs: 1, vidro: '#262a31', venezianas: undefined }));
    const telhaClara = matTelha('#7e3a30');
    const telhaDormer = telhado(7.3, 4.6, 1.25, 1.4, telhaClara);
    telhaDormer.position.set(4.0, 5.85, -13.6);
    g.add(telhaDormer);
    // Arvorezinha na calçada e arbustos atrás da grade
    arvores(g, [[7.2, -1.6, 3.2, 0.9, '#5e8f3a'], [25.8, -3.8, 3.0, 0.8, '#5e8f3a']]);
    arbustos(g, [[3.6, -7.2, 0.7], [5.0, -7.0, 0.6], [9.6, -7.3, 0.8], [10.2, -10.4, 0.9]]);

    // ---------- OBRA (tapume azul, placas, terra vermelha) ----------
    const tapume = box(57.2, 2.3, 0.06, M.std('#ffffff', 0.55, 0.35, { map: TX.tapume(57.2 / 2.6) }), -31.6, 1.15, FRENTE_NORTE);
    g.add(tapume);
    const tapumeLado = box(0.06, 2.3, 15.4, M.std('#ffffff', 0.55, 0.35, { map: TX.tapume(15.4 / 2.6) }), -3.0, 1.15, -13.9);
    g.add(tapumeLado);
    chao(g, -110, -3.05, -60, FRENTE_NORTE - 0.04, matChao(TX.terra, 107, 54, 4), 0.005);
    const terra = M.std('#b0603a', 0.95);
    terra.flatShading = true;
    [[-12, -14, 4.5, 1.6], [-20, -11, 3.5, 1.2], [-7.5, -18, 3.2, 1.4], [-28, -16, 5, 2.2], [-36, -12, 4, 1.4]].forEach(([x, z, r, h]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), terra);
      m.scale.set(r, h, r * 0.8);
      m.position.set(x, 0, z);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    });
    // Placas da obra (a RAC/Tecter/Brafer usa o recorte da foto quando dá)
    const usarFoto = L().canUseImageTextures();
    const texObra = usarFoto ? new THREE.TextureLoader().load(encodeURI(FOTO_PLACA_OBRA)) : texPlacaObraDesenhada();
    texObra.colorSpace = THREE.SRGBColorSpace;
    const versoPlaca = M.std('#d4d4d0', 0.8);
    const placa = (x, w, h, yc, texFrente) => {
      const frente = M.std('#ffffff', 0.7, 0, { map: texFrente });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), [versoPlaca, versoPlaca, versoPlaca, versoPlaca, frente, versoPlaca]).translateX(x).translateY(yc).translateZ(FRENTE_NORTE - 0.5));
      [-w / 2 + 0.25, w / 2 - 0.25].forEach((dx) => g.add(box(0.12, yc - h / 2 + 0.1, 0.12, M.std('#7c6a55', 0.9), x + dx, (yc - h / 2) / 2, FRENTE_NORTE - 0.58)));
    };
    placa(-8.6, 5.2, 2.4, 3.4, texObra);
    placa(-14.4, 2.8, 2.2, 3.3, texPlacaFornecedores());
    placa(-18.6, 2.2, 2.6, 3.4, L().textures.text('ALVARÁ\nDE OBRA', { w: 256, h: 300, size: 40, color: '#4b5563', bg: '#f1f2f4' }));
    // Prédio em construção ao fundo
    const conc = M.std('#a3a29d', 0.9);
    const ox = -26;
    const oz = -30;
    for (let k = 0; k < 4; k++) g.add(box(18, 0.3, 12, conc, ox, 0.15 + k * 3.1, oz));
    const pilares = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) pilares.push([ox - 8.5 + i * 4.25, 4.65, oz - 5.5 + j * 5.5]);
    g.add(H().instanced(new THREE.BoxGeometry(0.4, 9.3, 0.4), conc, pilares));
    g.add(box(10, 3, 9, M.std('#f4f4f2', 0.8), -13, 1.5, -38));
    g.add(box(10.4, 0.3, 9.4, M.std('#d9d9d6', 0.8), -13, 3.1, -38));

    // ---------- CASA DO BICHO (clínica veterinária azul) ----------
    const azulBicho = M.std('#2f63c8', 0.75);
    chao(g, 11, 23, -16.5, FRENTE_NORTE, matChao(TX.bloquete, 12, 10.3, 2.2), 0.02);
    g.add(box(11.6, 0.45, 0.26, azulBicho, 17, 0.225, FRENTE_NORTE));
    const vidroCerca = M.std('#d6e8f2', 0.05, 0.1, { transparent: true, opacity: 0.3 });
    const postes = [11.3, 13.6, 15.9, 18.2, 20.5, 22.75];
    postes.forEach((x) => g.add(box(0.28, 1.95, 0.28, azulBicho, x, 0.98, FRENTE_NORTE)));
    for (let i = 0; i < postes.length - 1; i++) {
      const v = box(postes[i + 1] - postes[i] - 0.3, 1.4, 0.03, vidroCerca, (postes[i] + postes[i + 1]) / 2, 1.15, FRENTE_NORTE, { cast: false });
      v.userData.noOutline = true;
      g.add(v);
    }
    g.add(box(1.2, 0.6, 0.6, M.std('#f1f1ef', 0.7), 11.8, 0.3, FRENTE_NORTE + 0.5));
    g.add(box(11.6, 3.1, 9.0, azulBicho, 17, 1.55, -11.9));
    g.add(box(1.0, 2.1, 0.1, M.std('#1f2a37', 0.15, 0.5), 14.0, 1.05, -7.36));
    janela(g, 16.8, 1.6, -7.36, 1.8, 1.2, { divs: 1 });
    janela(g, 20.4, 1.6, -7.36, 1.4, 1.2, { divs: 0 });
    g.add(box(0.75, 0.38, 0.3, M.std('#f4f4f2', 0.6), 18.0, 2.35, -7.25));
    g.add(box(0.35, 2.4, 0.1, M.std('#3fae4a', 0.7), 19.15, 1.25, -7.33));
    const roofBicho = telhado(7.2, 9.8, 1.7, 2.2, matTelha('#a85a3f'));
    roofBicho.position.set(14.2, 3.1, -11.9);
    g.add(roofBicho);
    const roofMetal = telhado(5.8, 9.8, 0.8, 1.6, M.std('#a3a7ab', 0.5, 0.5, { side: THREE.DoubleSide }));
    roofMetal.position.set(20.0, 3.1, -11.9);
    g.add(roofMetal);
    const ladoPlaca = M.std('#2558b8', 0.7);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(6.3, 1.28, 0.16), [ladoPlaca, ladoPlaca, ladoPlaca, ladoPlaca, M.std('#ffffff', 0.55, 0, { map: texPlacaBicho() }), ladoPlaca]).translateX(14.4).translateY(3.62).translateZ(-7.28));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.95, 0.5), [ladoPlaca, ladoPlaca, ladoPlaca, ladoPlaca, M.std('#ffffff', 0.55, 0, { map: texPlacaBichoAlta() }), ladoPlaca]).translateX(21.6).translateY(3.7).translateZ(-7.5));
    carro(g, 14.4, -2.9, Math.PI, '#e7e9ec');
    carro(g, 17.5, -3.0, Math.PI, '#1f2328');
    // Muro cinza e sobrado depois da clínica
    g.add(box(11.2, 2.3, 0.22, M.std('#ffffff', 0.9, 0, { map: TX.concreto(4, 1, '#a19f98') }), 28.6, 1.15, FRENTE_NORTE));
    g.add(box(8.6, 5.6, 8.0, M.std('#ebe2d2', 0.9), 29, 2.8, -14));
    janela(g, 27, 4.2, -9.96, 1.4, 1.2, { moldura: '#6b4a32' });
    janela(g, 31, 4.2, -9.96, 1.4, 1.2, { moldura: '#6b4a32' });
    const roofSobrado = telhado(9.6, 9.0, 2.6, 2.4, matTelha('#a8553f'));
    roofSobrado.position.set(29, 5.6, -14);
    g.add(roofSobrado);
    // Muro divisa casa x clínica
    g.add(box(0.22, 2.2, 10.4, parede, 11.0, 1.1, -11.4));

    // ---------- OUTRO LADO: SOBRADOS BRANCOS GEMINADOS ----------
    const branco = M.std('#f2f0ea', 0.85);
    const lambri = (w, h) => M.std('#ffffff', 0.8, 0, { map: TX.lambri(w / 1.4, h / 1.4) });
    const shingle = matTelha('#7b716a', { shingle: true });
    const PI = Math.PI;
    [2.9, -3.4, -9.7].forEach((cx, i) => {
      const zf = 16.5; // frente do térreo (virada pra rua, −z)
      g.add(box(6.2, 2.9, 10, branco, cx, 1.45, zf + 5));
      g.add(box(6.2, 0.95, 0.14, lambri(6.2, 0.95), cx, 3.37, zf + 0.07));
      g.add(box(6.2, 2.5, 9.0, lambri(6.2, 2.5), cx, 4.15, zf + 5.9));
      const roof = telhado(9.9, 6.9, 2.8, 0, shingle, lambri(6.9, 2.8));
      roof.rotation.y = PI / 2;
      roof.position.set(cx, 5.4, zf + 5.8);
      g.add(roof);
      // térreo: porta + janela com grade branca
      g.add(box(0.95, 2.1, 0.1, M.std('#f7f7f5', 0.6), cx + 1.8, 1.05, zf - 0.04));
      janela(g, cx - 1.4, 1.5, zf - 0.04, 1.5, 1.1, { rotY: PI, divs: 1, grade: '#f5f5f4' });
      // andar de cima
      janela(g, cx - 1.1, 4.25, zf + 0.86, 1.5, 1.6, { rotY: PI, divs: 1 });
      if (i === 0) {
        [cx + 0.9, cx + 1.6, cx + 2.3].forEach((x) => janela(g, x, 4.4, zf + 0.86, 0.5, 0.55, { rotY: PI, divs: 0, grade: '#e7e5e4' }));
        g.add(box(0.85, 0.55, 0.28, M.std('#f1f1ef', 0.6), cx - 2.4, 4.9, zf + 0.75)); // ar-condicionado
      } else janela(g, cx + 1.6, 4.35, zf + 0.86, 0.9, 0.9, { rotY: PI, divs: 0 });
      janela(g, cx, 6.35, zf + 0.82, 0.75, 0.75, { rotY: PI, divs: 0 });
      // muro lateral entre os sobrados
      g.add(box(0.15, 1.8, 2.5, branco, cx - 3.1, 0.9, 15.25));
    });
    // Toalha rosa estendida na sacada do sobrado do meio
    const toalha = plane(1.1, 0.65, M.std('#ffffff', 0.9, 0, { map: tex(128, 96, (ctx, w, h) => {
      ctx.fillStyle = '#f37cb4';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fbd0e4';
      for (let y = 8; y < h; y += 22) ctx.fillRect(0, y, w, 6);
      ctx.fillStyle = '#e25597';
      ctx.fillRect(0, h - 8, w, 8);
    }), side: THREE.DoubleSide }), -3.9, 3.45, 16.42);
    toalha.rotation.y = PI;
    g.add(toalha);
    carro(g, -3.4, 15.3, PI / 2, '#c81e1e');
    // Cerca branca (com cerca elétrica) na frente dos sobrados
    g.add(box(19.8, 0.3, 0.22, branco, -3.5, 0.15, FRENTE_SUL));
    grade(g, [-13.4, FRENTE_SUL], [6.4, FRENTE_SUL], 1.55, 0.14, M.std('#f5f5f4', 0.6), { y0: 0.3, esp: 0.045 });
    const hastes = [];
    for (let x = -13.4; x <= 6.4; x += 3.3) {
      g.add(box(0.3, 1.95, 0.3, branco, x, 0.98, FRENTE_SUL));
      hastes.push([x, 2.35, FRENTE_SUL]);
    }
    g.add(H().instanced(new THREE.BoxGeometry(0.03, 0.8, 0.03), M.std('#9ca3af', 0.4, 0.7), hastes, { cast: false }));
    fios(g, [0, 0.2, 0.4, 0.6].map((dy) => [[-13.4, 2.05 + dy, FRENTE_SUL], [6.4, 2.05 + dy, FRENTE_SUL], 0.02]));
    // Muro branco comprido depois dos sobrados
    g.add(box(17, 2.0, 0.22, branco, -22.1, 1.0, FRENTE_SUL));
    g.add(box(9, 5.4, 8, M.std('#efece4', 0.85), -22, 2.7, 20));
    const roofSul = telhado(10, 9, 2.4, 2.2, matTelha('#a65a42'));
    roofSul.position.set(-22, 5.4, 20);
    g.add(roofSul);
    // Palmeiras e casa da garagem cinza
    palmeiras(g, 7.6, 13.0, 6);
    g.add(box(6.4, 3.0, 8, M.std('#c2bcb0', 0.9), 12.3, 1.5, 18.6));
    const portaoCinza = plane(2.8, 2.35, M.std('#ffffff', 0.6, 0.3, { map: TX.portaoGaragem(1, 2) }), 12.8, 1.18, 14.57);
    portaoCinza.rotation.y = PI;
    g.add(portaoCinza);
    g.add(box(3.4, 0.5, 0.12, M.std('#5b7f62', 0.7), 12.8, 2.65, 14.55));
    [10.1, 10.6].forEach((x) => g.add(box(0.4, 0.6, 0.15, M.std('#e2dfd8', 0.6), x, 1.25, 14.52)));
    const roofCinza = telhado(7.0, 8.6, 1.4, 1.8, matTelha('#8b8984'));
    roofCinza.position.set(12.3, 3.0, 18.6);
    g.add(roofCinza);
    carro(g, 3.4, 12.7, PI / 2, '#b9bdc2');

    // ---------- CASAS MAIS LONGE (preenchem a rua até o horizonte) ----------
    const cores = ['#efe7d8', '#e7dccb', '#f2efe9', '#dfe5ea', '#eadfce', '#f3e6d3'];
    const telhas = ['#a8553f', '#8f4535', '#b0644a', '#6f6a64'];
    const casaLonge = (x, zFrente, lado, w, d, h) => {
      const zc = zFrente + lado * (d / 2);
      g.add(box(w, h, d, M.std(cores[(Math.abs(x) | 0) % cores.length], 0.9), x, h / 2, zc, { cast: false }));
      const r = telhado(w + 0.8, d + 0.8, 2.2, Math.min(w, d) * 0.3, matTelha(telhas[(Math.abs(x * 3) | 0) % telhas.length]));
      r.position.set(x, h, zc);
      r.castShadow = false;
      g.add(r);
      janela(g, x - w * 0.22, h * 0.62, zFrente - lado * 0.04, 1.3, 1.1, { rotY: lado > 0 ? PI : 0, moldura: '#7c5a3c' });
      janela(g, x + w * 0.22, h * 0.62, zFrente - lado * 0.04, 1.3, 1.1, { rotY: lado > 0 ? PI : 0, moldura: '#7c5a3c' });
    };
    [38, 50, 62, 76, 90].forEach((x, i) => casaLonge(x, -8 - (i % 2) * 2, -1, 9, 9, i % 2 ? 3 : 5.6));
    [-66, -80, -94].forEach((x, i) => casaLonge(x, -8, -1, 9, 9, i % 2 ? 3 : 5.6));
    [-36, -48, -60, -74, -88, 22, 36, 50, 64, 80].forEach((x, i) => casaLonge(x, 16 + (i % 2) * 2, 1, 9, 9, i % 3 ? 3.2 : 5.8));
    g.add(box(60, 1.9, 0.2, branco, 52, 0.95, FRENTE_SUL + 1, { cast: false }));

    // ---------- ÁRVORES ----------
    araucarias(g, [
      [-7.5, -12, 15],
      [14.5, -21, 17],
      [17.8, -24.5, 16],
      [-34, -40, 18],
      [42, -30, 17],
      [-44, 32, 18],
      [58, 34, 16],
      [-8, 42, 17],
      [26, 46, 19],
      [-70, -24, 18]
    ]);
    arvores(g, [
      [17.5, 10.8, 7.5, 3.0],
      [22.5, 10.6, 8.5, 3.4],
      [29, 11.2, 7.8, 3.2],
      [35, 10.8, 7, 2.8],
      [-17, 10.6, 5.2, 1.8, '#5a8a3a'],
      [-22.5, 10.7, 5.0, 1.7, '#5a8a3a'],
      [-28.5, 10.6, 5.4, 1.9, '#5a8a3a'],
      [-40, 10.6, 6, 2.2],
      [8.2, 24, 9, 3.6],
      [-15, 30, 9, 3.4],
      [33, -20, 9, 3.6],
      [46, -12, 7, 3],
      [-48, -14, 8, 3.2],
      [70, 12, 8, 3],
      [-80, 11, 8, 3]
    ]);

    // ---------- POSTES E FIOS ----------
    const pN1 = posteConcreto(g, -3.5, MEIO_FIO_N - 0.5, { luminaria: 1 });
    const pN2 = posteConcreto(g, 27.6, MEIO_FIO_N - 0.5, { trafo: true, luminaria: 1 });
    const pN0 = posteConcreto(g, -36, MEIO_FIO_N - 0.5, { luminaria: 1 });
    const pS1 = posteConcreto(g, -27, MEIO_FIO_S + 0.5, { luminaria: -1 });
    const pS2 = posteConcreto(g, 9.0, MEIO_FIO_S + 0.5, { luminaria: -1, trafo: true });
    const pS3 = posteConcreto(g, 44, MEIO_FIO_S + 0.5, { luminaria: -1 });
    const vao = (p, q) => [[p.a, q.a, 0.55], [p.b, q.b, 0.6], [p.c, q.c, 0.55], [p.tel, q.tel, 0.7], [p.cabo, q.cabo, 0.8]];
    fios(g, [
      ...vao(pN0, pN1),
      ...vao(pN1, pN2),
      ...vao(pS1, pS2),
      ...vao(pS2, pS3),
      [pN1.b, pS2.b, 0.4],
      [pN1.tel, pS2.tel, 0.5],
      [pN2.a, pS2.c, 0.45],
      [pN2.cabo, pS2.cabo, 0.6],
      [pN1.cabo, [2.4, 5.2, -11.2], 0.3],
      [pN2.tel, [15, 3.4, -7.4], 0.3],
      [pS2.tel, [3, 5.4, 16.6], 0.3],
      [pS2.cabo, [12.3, 3.0, 14.6], 0.2],
      [pN2.b, [60, 9.3, MEIO_FIO_N - 0.5], 0.7],
      [pS3.b, [80, 9.3, MEIO_FIO_S + 0.5], 0.7],
      [pN0.b, [-70, 9.3, MEIO_FIO_N - 0.5], 0.7],
      [pS1.b, [-62, 9.3, MEIO_FIO_S + 0.5], 0.7]
    ]);

    // ---------- CARROS NA RUA ----------
    carro(g, 36, 2.8, PI / 2, '#f4f4f2', 'subaru');
    carro(g, 44, 8.4, -PI / 2, '#d9dcdf');
    carro(g, -34, 2.8, PI / 2, '#8b929b');
    carro(g, -40, 2.8, PI / 2, '#a52a2a');
    carro(g, -47, 2.8, PI / 2, '#e5e7eb');

    // ---------- SUBARU (menu / capítulos; no POV ele não entra) ----------
    let sub = null;
    if (!o.semSubaru) {
      sub = L().createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', !!root.LuiggiSave?.state?.subaruMods?.neon);
      sub.position.set(...VAGA);
      sub.rotation.y = o.rotSubaru ?? Math.PI * 0.82;
      g.add(sub);
    }

    return {
      group: g,
      subaru: sub,
      dia: true,
      vaga: VAGA_POV.slice(),
      slots: { L: [-1.5, 0, 0.8], R: [1.5, 0, 0.8], C: [0, 0, 0.8] },
      cam: { pos: [5.5, 2.0, 5], look: [0, 0.9, -3] },
      bg: 0xa9cdf2,
      fog: [0xd2e3f4, 0.0075],
      luz: { sky: '#dcebff', ground: '#7d7566', hemi: 1.2, key: '#fff3dc', keyI: 2.6, keyPos: [10, 22, 14], fillI: 0.45, fill: '#dfe8ff' },
      grade: { tint: [1.01, 1.0, 0.99], saturation: 1.06, bloom: 0.35, threshold: 1.4, vignette: 0.45 },
      update(dt) {
        nuvens.forEach((n) => {
          n.a += n.v * dt;
          n.s.position.x = Math.cos(n.a) * n.r;
          n.s.position.z = Math.sin(n.a) * n.r;
        });
      }
    };
  }

  root.LuiggiRuaSafepoint = { construir, VAGA, VAGA_POV };
})(window);
