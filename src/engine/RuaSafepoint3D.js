/**
 * RUA DO SAFEPOINT · R. Mercedes Seiler Rocha, 185 (Curitiba)
 * Cenário 3D completo, montado a partir das fotos do Street View (abr/2025):
 *  - lado da casa (−z): tapume azul da obra com as placas → casa do telhado vinho (garagem coberta e portão)
 *    → Casa do Bicho (clínica veterinária azul, estacionamento de bloquete, cerca de vidro) → muro cinza e sobrado;
 *  - outro lado (+z): sobrados brancos geminados com cerca branca, palmeiras, casa da garagem cinza, árvores grandes;
 *  - postes de concreto com fiação cruzando a rua, araucárias, céu azul com nuvens.
 * A rua é montada no eixo x e depois curvada pelo traçado real (arco medido nos panoramas do Street View):
 * o ponto mais ao norte fica bem em frente à casa e o cruzamento com a R. Prof. Raul Pinheiro Machado,
 * ~53 m a leste do portão. Medidas dos lotes conferidas na imagem de satélite (zoom 21).
 * O Subaru fica na vaga em frente ao portão da casa (VAGA), de frente pra casa (−z).
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
  // TRAÇADO DA RUA: ela não é reta. Rumo (bússola) medido entre os panoramas do Street View (abr/2025):
  // ~67° a 50 m a oeste da casa, ~75° na obra, ~85° no portão, ~94° na Casa do Bicho e ~99° no cruzamento
  // com a R. Prof. Raul Pinheiro Machado. O cenário é montado "reto" (rua no eixo x, centro em z = EIXO)
  // e no fim é curvado por esse traçado (curvarMundo).
  // ------------------------------------------------------------------
  const EIXO = (MEIO_FIO_N + MEIO_FIO_S) / 2;
  const RUMO_REF = 83.5; // rumo do eixo +x do modelo (no portão da casa)
  const PIVO = 4; // ponto da rua que fica parado na curvatura
  const RUMOS = [[-120, 64], [-47, 66.8], [-24, 70.6], [-9.5, 75.4], [6, 84.7], [21.7, 94.2], [55, 99], [120, 100]];
  const TR_PASSO = 0.25;
  const TR_MIN = -260;
  const TR_MAX = 260;
  const TR_N = Math.round((TR_MAX - TR_MIN) / TR_PASSO) + 1;
  const TRACADO = (() => {
    const rumo = (x) => {
      if (x <= RUMOS[0][0]) return RUMOS[0][1];
      for (let i = 1; i < RUMOS.length; i++) {
        if (x <= RUMOS[i][0]) {
          const [x0, b0] = RUMOS[i - 1];
          const [x1, b1] = RUMOS[i];
          return b0 + ((b1 - b0) * (x - x0)) / (x1 - x0);
        }
      }
      return RUMOS[RUMOS.length - 1][1];
    };
    const th = new Float64Array(TR_N);
    const cx = new Float64Array(TR_N);
    const cz = new Float64Array(TR_N);
    for (let i = 0; i < TR_N; i++) th[i] = ((rumo(TR_MIN + i * TR_PASSO) - RUMO_REF) * Math.PI) / 180;
    const ip = Math.round((PIVO - TR_MIN) / TR_PASSO);
    const t0 = th[ip];
    for (let i = 0; i < TR_N; i++) th[i] -= t0;
    cx[ip] = PIVO;
    cz[ip] = EIXO;
    for (let i = ip + 1; i < TR_N; i++) {
      const t = (th[i] + th[i - 1]) / 2;
      cx[i] = cx[i - 1] + Math.cos(t) * TR_PASSO;
      cz[i] = cz[i - 1] + Math.sin(t) * TR_PASSO;
    }
    for (let i = ip - 1; i >= 0; i--) {
      const t = (th[i] + th[i + 1]) / 2;
      cx[i] = cx[i + 1] - Math.cos(t) * TR_PASSO;
      cz[i] = cz[i + 1] - Math.sin(t) * TR_PASSO;
    }
    return { th, cx, cz };
  })();
  /** Centro da rua e ângulo da tangente na posição x (reta) do modelo. */
  function amostraTracado(x) {
    const f = (Math.max(TR_MIN, Math.min(TR_MAX, x)) - TR_MIN) / TR_PASSO;
    const i = Math.min(TR_N - 2, Math.floor(f));
    const k = f - i;
    const { th, cx, cz } = TRACADO;
    const t = th[i] + (th[i + 1] - th[i]) * k;
    let px = cx[i] + (cx[i + 1] - cx[i]) * k;
    let pz = cz[i] + (cz[i + 1] - cz[i]) * k;
    const fora = x < TR_MIN ? x - TR_MIN : x > TR_MAX ? x - TR_MAX : 0;
    px += Math.cos(t) * fora;
    pz += Math.sin(t) * fora;
    return [t, px, pz];
  }
  /** Ponto (x, z) do modelo reto → ponto na rua curva; a = quanto o objeto ali gira (rotation.y −= a). */
  function curvar(x, z) {
    const [t, px, pz] = amostraTracado(x);
    const d = z - EIXO;
    return { x: px - Math.sin(t) * d, z: pz + Math.cos(t) * d, a: t };
  }
  /** Inverso aproximado de curvar (ponto da rua curva → coordenadas retas). */
  function retificar(X, Z) {
    let x = X;
    for (let k = 0; k < 5; k++) {
      const [t, px, pz] = amostraTracado(x);
      x += (X - px) * Math.cos(t) + (Z - pz) * Math.sin(t);
    }
    const [t, px, pz] = amostraTracado(x);
    return { x, z: EIXO - (X - px) * Math.sin(t) + (Z - pz) * Math.cos(t) };
  }

  /** Divide triângulos até nenhum ter mais que maxLen de comprimento em x (pra poderem curvar). */
  function subdividirX(geo, maxLen) {
    const THREE = T();
    const P = geo.attributes.position.array;
    const Nn = geo.attributes.normal ? geo.attributes.normal.array : null;
    const UV = geo.attributes.uv ? geo.attributes.uv.array : null;
    const grupos = geo.groups.length ? geo.groups : [{ start: 0, count: P.length / 3, materialIndex: 0 }];
    const oP = [];
    const oN = [];
    const oU = [];
    const vert = (i) => ({ p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: Nn ? [Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]] : null, u: UV ? [UV[i * 2], UV[i * 2 + 1]] : null });
    const meio = (a, b) => ({ p: a.p.map((v, k) => (v + b.p[k]) / 2), n: a.n && a.n.map((v, k) => (v + b.n[k]) / 2), u: a.u && a.u.map((v, k) => (v + b.u[k]) / 2) });
    const emitir = (...vs) =>
      vs.forEach((v) => {
        oP.push(...v.p);
        if (Nn) oN.push(...v.n);
        if (UV) oU.push(...v.u);
      });
    const dividir = (a, b, c, prof) => {
      const xs = [a.p[0], b.p[0], c.p[0]];
      if (Math.max(...xs) - Math.min(...xs) <= maxLen || prof > 16) return emitir(a, b, c);
      const arestas = [[a, b, c], [b, c, a], [c, a, b]].map(([u, v, w]) => [Math.abs(u.p[0] - v.p[0]), u, v, w]);
      arestas.sort((p, q) => q[0] - p[0]);
      const [, u, v, w] = arestas[0];
      const m = meio(u, v);
      dividir(u, m, w, prof + 1);
      dividir(m, v, w, prof + 1);
    };
    const novos = [];
    grupos.forEach((gr) => {
      const ini = oP.length / 3;
      const fim = Math.min(gr.start + gr.count, P.length / 3);
      for (let t = gr.start; t + 2 < fim; t += 3) dividir(vert(t), vert(t + 1), vert(t + 2), 0);
      novos.push([ini, oP.length / 3 - ini, gr.materialIndex]);
    });
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(oP, 3));
    if (Nn) ng.setAttribute('normal', new THREE.Float32BufferAttribute(oN, 3));
    if (UV) ng.setAttribute('uv', new THREE.Float32BufferAttribute(oU, 2));
    if (geo.groups.length) novos.forEach(([s, c, m]) => ng.addGroup(s, c, m));
    return ng;
  }

  /**
   * Curva o cenário montado reto. Peças compridas (chão, meio-fio, tapume, muros, fios) são deformadas
   * vértice a vértice; o resto (casas, árvores, postes, placas) é só deslocado e girado com a rua.
   */
  function curvarMundo(g) {
    const THREE = T();
    g.updateMatrixWorld(true);
    const caixa = new THREE.Box3();
    const centro = new THREE.Vector3();
    const tam = new THREE.Vector3();
    const rigido = (M, px, pz) => {
      const p = curvar(px, pz);
      return new THREE.Matrix4().makeTranslation(p.x, 0, p.z).multiply(new THREE.Matrix4().makeRotationY(-p.a)).multiply(new THREE.Matrix4().makeTranslation(-px, 0, -pz)).multiply(M);
    };
    const zerar = (o) => {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
    };
    const deformar = (o) => {
      [...o.children].forEach((ch) => g.attach(ch));
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      if (o.isMesh) geo = subdividirX(geo, 2);
      const pos = geo.attributes.position;
      const nor = geo.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const p = curvar(pos.getX(i), pos.getZ(i));
        pos.setXYZ(i, p.x, pos.getY(i), p.z);
        if (nor) {
          const nx = nor.getX(i);
          const nz = nor.getZ(i);
          const c = Math.cos(p.a);
          const s = Math.sin(p.a);
          nor.setXYZ(i, nx * c - nz * s, nor.getY(i), nx * s + nz * c);
        }
      }
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      o.geometry = geo;
      zerar(o);
      if (o.parent !== g) g.add(o);
    };
    const processar = (o) => {
      if (o.isSprite) return;
      if (o.isInstancedMesh) {
        const im = new THREE.Matrix4();
        const p = new THREE.Vector3();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im);
          im.premultiply(o.matrixWorld);
          p.setFromMatrixPosition(im);
          o.setMatrixAt(i, rigido(im, p.x, p.z));
        }
        zerar(o);
        o.instanceMatrix.needsUpdate = true;
        if (o.computeBoundingSphere) {
          o.boundingSphere = null;
          o.computeBoundingSphere();
        } else o.frustumCulled = false;
        return;
      }
      if (o.isLine || o.isLineSegments) return deformar(o);
      caixa.setFromObject(o);
      if (caixa.isEmpty()) return;
      caixa.getSize(tam);
      caixa.getCenter(centro);
      if (o.isMesh && tam.x > 12) return deformar(o);
      if (!o.isMesh && o.children.length && tam.x > 12) {
        [...o.children].forEach((ch) => {
          g.attach(ch);
          ch.updateMatrixWorld(true);
          processar(ch);
        });
        return;
      }
      rigido(o.matrixWorld, centro.x, centro.z).decompose(o.position, o.quaternion, o.scale);
    };
    [...g.children].forEach(processar);
  }

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
    /** Tapume metálico azul com a ondulação na horizontal (como nas fotos), ~16 ondas na altura. */
    tapume(rx) {
      return tex(128, 256, (ctx, w, h) => {
        for (let y = 0; y < h; y += 16) {
          const g = ctx.createLinearGradient(0, y, 0, y + 16);
          g.addColorStop(0, '#1f3c94');
          g.addColorStop(0.4, '#4d74d6');
          g.addColorStop(0.7, '#3157b8');
          g.addColorStop(1, '#1b3484');
          ctx.fillStyle = g;
          ctx.fillRect(0, y, w, 16);
        }
        ctx.fillStyle = 'rgba(10,20,60,0.35)';
        ctx.fillRect(0, 0, 2, h);
        // Respingos de terra perto do chão
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = `rgba(${130 + rnd(0, 40)},${80 + rnd(0, 30)},50,${rnd(0.15, 0.4)})`;
          ctx.fillRect(Math.random() * w, h - Math.pow(Math.random(), 2.5) * h * 0.35, rnd(1, 3), rnd(1, 3));
        }
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

  /** Painel com as imagens do projeto (primeira placa da obra, à esquerda). */
  function texPlacaProjeto() {
    return tex(512, 280, (ctx, w, h) => {
      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e4f9c';
      ctx.fillRect(0, 0, w, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillText('NOVO EMPREENDIMENTO · EM CONSTRUÇÃO', 14, 19);
      ctx.fillStyle = '#334155';
      for (let i = 0; i < 9; i++) ctx.fillRect(14, 42 + i * 22, 190 - (i % 3) * 30, 7);
      // Renders do prédio
      [[226, 36, 130, 110], [370, 36, 128, 110], [226, 152, 272, 112]].forEach(([x, y, ww, hh], k) => {
        const gr = ctx.createLinearGradient(0, y, 0, y + hh);
        gr.addColorStop(0, '#9cc3e8');
        gr.addColorStop(1, '#e8eef4');
        ctx.fillStyle = gr;
        ctx.fillRect(x, y, ww, hh);
        ctx.fillStyle = k === 2 ? '#6b7d62' : '#8a8f96';
        ctx.fillRect(x + ww * 0.2, y + hh * 0.25, ww * 0.6, hh * 0.75);
        ctx.fillStyle = '#dbe7f2';
        for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x + ww * 0.25 + c * ww * 0.14, y + hh * 0.32 + r * hh * 0.13, ww * 0.08, hh * 0.07);
        ctx.fillStyle = '#4d7c3a';
        ctx.fillRect(x, y + hh - 10, ww, 10);
      });
    });
  }
  /** Plaquinha branca de responsabilidade técnica (CAU/CREA). */
  function texPlacaCAU() {
    return tex(256, 224, (ctx, w, h) => {
      ctx.fillStyle = '#f7f7f5';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('CAU/PR · RRT', 16, 32);
      ctx.font = '13px "Segoe UI", sans-serif';
      ['Responsável técnico', 'Arq. e Urb.', 'Projeto arquitetônico', 'Execução da obra'].forEach((t, i) => {
        ctx.fillStyle = '#6b7280';
        ctx.fillText(t, 16, 66 + i * 42);
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(16, 74 + i * 42, 150 + (i % 2) * 40, 5);
      });
    });
  }
  /** Placa amarela de curva (losango com a seta), virada pra quem desce a rua no sentido oeste. */
  function texPlacaCurva() {
    return tex(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#111111';
      ctx.fillRect(-88, -88, 176, 176);
      ctx.fillStyle = '#f5c518';
      ctx.fillRect(-80, -80, 160, 160);
      ctx.restore();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(150, 200);
      ctx.bezierCurveTo(150, 140, 100, 130, 100, 80);
      ctx.stroke();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(72, 92);
      ctx.lineTo(100, 50);
      ctx.lineTo(128, 92);
      ctx.closePath();
      ctx.fill();
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

  /**
   * Junta as malhas paradas que usam o mesmo material numa só (com as transformações já aplicadas).
   * O cenário tem centenas de peças pequenas (muros, pilares, janelas, grades...): isso corta as chamadas de
   * desenho de ~1000 pra algumas dezenas. Malhas transparentes, instanciadas, linhas e sprites ficam como estão.
   */
  /** Assinatura do material: materiais iguais criados separadamente (mesma cor, textura...) contam como um só. */
  function assinaturaMaterial(m) {
    const cor = (c) => (c && c.getHexString ? c.getHexString() : '');
    return [m.type, cor(m.color), cor(m.emissive), m.emissiveIntensity, m.map ? m.map.uuid : '', m.roughness, m.metalness, m.side, m.flatShading ? 1 : 0, m.vertexColors ? 1 : 0, m.alphaTest, m.opacity, m.gradientMap ? m.gradientMap.uuid : '', m.fog === false ? 0 : 1, m.depthWrite ? 1 : 0, m.polygonOffset ? m.polygonOffsetFactor : 0].join('|');
  }

  function juntarEstaticos(g, opcoes = {}) {
    const THREE = T();
    const pular = opcoes.pular || (() => false);
    const celula = opcoes.celula || 0; // > 0: junta só dentro de quadrados desse tamanho (melhor pra recortar o que não aparece)
    const centro = new THREE.Vector3();
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const grupos = new Map();
    const remover = [];
    const criadas = [];
    g.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible) return;
      const m = o.material;
      if (m.transparent || o.userData.dinamico || o.morphTargetInfluences || pular(o)) return;
      const geo = o.geometry;
      if (!geo.attributes.position || !geo.attributes.normal) return;
      const attrs = Object.keys(geo.attributes).filter((k) => k === 'position' || k === 'normal' || k === 'uv' || k === 'color').sort();
      // Ação de clique (do próprio objeto ou de um pai dentro de g): só junta peças com a mesma ação
      let acao = '';
      for (let p = o; p && p !== g; p = p.parent) if (p.userData && p.userData.acao) {
        acao = p.userData.acao;
        break;
      }
      let cel = '';
      if (celula) {
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        centro.copy(geo.boundingSphere.center).applyMatrix4(o.matrixWorld);
        cel = Math.floor(centro.x / celula) + ':' + Math.floor(centro.z / celula);
      }
      const chave = acao + '|' + cel + '|' + assinaturaMaterial(m) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + attrs.map((k) => k + geo.attributes[k].itemSize).join(',') + '|' + (o.renderOrder || 0);
      let gr = grupos.get(chave);
      if (!gr) grupos.set(chave, (gr = { mat: m, cast: o.castShadow, rec: o.receiveShadow, attrs, itens: [], ordem: o.renderOrder || 0, acao }));
      gr.itens.push(o);
    });
    const mw = new THREE.Matrix4();
    const nm = new THREE.Matrix3();
    const v = new THREE.Vector3();
    grupos.forEach((gr) => {
      if (gr.itens.length < 2) return;
      let total = 0;
      let totalIdx = 0;
      gr.itens.forEach((o) => {
        total += o.geometry.attributes.position.count;
        totalIdx += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      });
      if (total > 3e6) return;
      const saida = {};
      gr.attrs.forEach((k) => (saida[k] = new Float32Array(total * gr.itens[0].geometry.attributes[k].itemSize)));
      const idx = total > 65535 ? new Uint32Array(totalIdx) : new Uint16Array(totalIdx);
      let base = 0;
      let bi = 0;
      gr.itens.forEach((o) => {
        const geo = o.geometry;
        mw.multiplyMatrices(inv, o.matrixWorld);
        nm.getNormalMatrix(mw);
        const n = geo.attributes.position.count;
        const espelhado = mw.determinant() < 0;
        gr.attrs.forEach((k) => {
          const a = geo.attributes[k];
          const out = saida[k];
          const is = a.itemSize;
          for (let i = 0; i < n; i++) {
            if (k === 'position') {
              v.fromBufferAttribute(a, i).applyMatrix4(mw);
              out[(base + i) * 3] = v.x;
              out[(base + i) * 3 + 1] = v.y;
              out[(base + i) * 3 + 2] = v.z;
            } else if (k === 'normal') {
              v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize();
              out[(base + i) * 3] = v.x;
              out[(base + i) * 3 + 1] = v.y;
              out[(base + i) * 3 + 2] = v.z;
            } else for (let c = 0; c < is; c++) out[(base + i) * is + c] = a.array[i * is + c];
          }
        });
        if (geo.index) {
          const ia = geo.index.array;
          for (let i = 0; i < ia.length; i += 3) {
            idx[bi++] = ia[i] + base;
            idx[bi++] = (espelhado ? ia[i + 2] : ia[i + 1]) + base;
            idx[bi++] = (espelhado ? ia[i + 1] : ia[i + 2]) + base;
          }
        } else {
          for (let i = 0; i < n; i += 3) {
            idx[bi++] = base + i;
            idx[bi++] = base + (espelhado ? i + 2 : i + 1);
            idx[bi++] = base + (espelhado ? i + 1 : i + 2);
          }
        }
        base += n;
        remover.push(o);
      });
      const ng = new THREE.BufferGeometry();
      gr.attrs.forEach((k) => ng.setAttribute(k, new THREE.BufferAttribute(saida[k], gr.itens[0].geometry.attributes[k].itemSize)));
      ng.setIndex(new THREE.BufferAttribute(idx.subarray(0, bi), 1));
      ng.computeBoundingSphere();
      ng.computeBoundingBox();
      const mesh = new THREE.Mesh(ng, gr.mat);
      mesh.castShadow = gr.cast;
      mesh.receiveShadow = gr.rec;
      mesh.renderOrder = gr.ordem;
      mesh.userData.noOutline = true;
      mesh.userData.juntado = gr.itens.length;
      if (gr.acao) mesh.userData.acao = gr.acao;
      g.add(mesh);
      criadas.push(mesh);
    });
    // Tira as originais (os grupos vazios ficam, não custam nada)
    remover.forEach((o) => o.parent && o.parent.remove(o));
    return criadas;
  }

  // ------------------------------------------------------------------
  // MONTAGEM
  // ------------------------------------------------------------------
  function construir(o = {}) {
    const THREE = T();
    const { box, cyl, plane, M } = L();
    // raiz: céu, sol e nuvens (não curvam); g: o mundo da rua, montado reto e curvado no fim
    const raiz = new THREE.Group();
    const g = new THREE.Group();
    raiz.add(g);

    // ---------- CÉU, SOL E NUVENS (num grupo que acompanha a câmera quando o bairro está ligado) ----------
    const ceuG = new THREE.Group();
    raiz.add(ceuG);
    const ceuMesh = H().ceu(ceuG, [[0, '#2f73cf'], [0.28, '#5b9ae2'], [0.46, '#a6cbf1'], [0.52, '#dce9f6'], [1, '#e4edf6']], 150);
    if (ceuMesh) ceuMesh.renderOrder = -10;
    const solDir = new THREE.Vector3(10, 22, 14).normalize();
    const sol = L().halo('#fff7dc', 34, 1.5);
    sol.material.fog = false;
    sol.position.copy(solDir).multiplyScalar(130);
    ceuG.add(sol);
    const nucleo = L().halo('#ffffff', 9, 2.2);
    nucleo.material.fog = false;
    nucleo.position.copy(sol.position);
    ceuG.add(nucleo);
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
      ceuG.add(s);
      nuvens.push({ s, a, r, v: rnd(0.002, 0.005) });
    }

    // ---------- CHÃO ----------
    chao(g, -110, 110, -110, 110, matChao(TX.grama, 220, 220, 3.5), -0.03);
    // Rua: asfalto claro, faixa central tracejada branca, linha amarela junto ao meio-fio do outro lado
    chao(g, -110, 110, MEIO_FIO_N, MEIO_FIO_S, matChao(TX.asfalto, 220, 8, 4), 0.0);
    const tinta = M.std('#f1f1ee', 0.7);
    const tracos = [];
    for (let x = -108; x < 108; x += 7) if (Math.abs(x - 52.8) > 6) tracos.push([x, 0.012, (MEIO_FIO_N + MEIO_FIO_S) / 2, 0, 0, 0]);
    g.add(H().instanced(new THREE.BoxGeometry(3, 0.01, 0.13), tinta, tracos, { cast: false }));
    g.add(box(220, 0.01, 0.13, M.std('#f2a23a', 0.7), 0, 0.012, MEIO_FIO_S - 0.25, { cast: false }));
    // Meios-fios
    const matMeioFio = M.std('#c9c6bf', 0.85);
    // Cruzamento com a R. Prof. Raul Pinheiro Machado (meio-fio interrompido ali)
    const XC = 52.8;
    const MEIA_CRUZ = 3.8;
    [[-110, XC - MEIA_CRUZ - 0.6], [XC + MEIA_CRUZ + 0.6, 110]].forEach(([a, b]) => {
      [MEIO_FIO_N - 0.08, MEIO_FIO_S + 0.08].forEach((z) => g.add(box(b - a, 0.14, 0.16, matMeioFio, (a + b) / 2, 0.07, z)));
    });
    // Tracinhos vermelhos junto ao meio-fio laranja do lado de lá
    const vermelhos = [];
    for (let x = -60; x < XC - 6; x += 5.2) vermelhos.push([x, 0.013, MEIO_FIO_S - 1.25, 0, 0, 0]);
    g.add(H().instanced(new THREE.BoxGeometry(1.1, 0.01, 0.16), M.std('#e7826b', 0.7), vermelhos, { cast: false }));

    // Calçada do lado da casa (−z)
    chao(g, -110, -2.8, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 107, 7.6, 3.5), 0.02);
    chao(g, -2.8, 2.8, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.concreto, 5.6, 7.6, 3, '#b8b4ab'), 0.025); // rampa da garagem (vaga do Subaru)
    chao(g, 2.8, 9.5, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 6.7, 7.6, 3.5), 0.02);
    chao(g, 9.5, 18.1, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.bloquete, 8.6, 7.6, 2.2), 0.025); // estacionamento da Casa do Bicho
    [11.7, 14.4].forEach((x) => {
      const faixa = box(0.1, 0.01, 4.6, M.std('#f2c230', 0.7), x, 0.035, -2.2, { cast: false });
      faixa.rotation.y = 0.12;
      g.add(faixa);
    });
    chao(g, 18.1, 21.3, FRENTE_NORTE, MEIO_FIO_N - 0.16, M.std('#5cc8bc', 0.85), 0.03); // rampa pintada de verde-água
    chao(g, 21.3, 110, FRENTE_NORTE, MEIO_FIO_N - 0.16, matChao(TX.grama, 88.7, 7.6, 3.5), 0.02);

    // Calçada do outro lado (+z): faixa de grama junto ao meio-fio + bloquete junto às cercas
    chao(g, -110, 110, MEIO_FIO_S + 0.16, 11.4, matChao(TX.grama, 220, 1.6, 3.5), 0.02);
    chao(g, -110, 110, 11.4, FRENTE_SUL, matChao(TX.bloquete, 220, 2.6, 2.2, '#a7a39b'), 0.025);
    chao(g, -13.6, 6.4, FRENTE_SUL, 16.5, matChao(TX.bloquete, 20, 2.5, 2.2, '#b1ada4'), 0.025);

    // ---------- CASA DO SAFEPOINT (telhado vinho, garagem coberta) ----------
    const parede = M.std('#ddd0b6', 0.9);
    const ferro = M.std('#3a281e', 0.55, 0.3); // grade marrom-escura, como nas fotos
    chao(g, 2.8, 9.6, -11.6, FRENTE_NORTE, matChao(TX.grama, 6.8, 5.4, 3.5), 0.015);
    chao(g, -2.8, 2.8, -11.6, FRENTE_NORTE, matChao(TX.concreto, 5.6, 5.4, 3, '#a9a59c'), 0.02);
    // Mureta + grade preta na frente do jardim
    g.add(box(6.9, 0.4, 0.24, parede, 6.2, 0.2, FRENTE_NORTE));
    grade(g, [2.75, FRENTE_NORTE], [9.55, FRENTE_NORTE], 1.75, 0.13, ferro, { y0: 0.4 });
    // Portão da garagem (barras escuras)
    grade(g, [-2.3, FRENTE_NORTE - 0.05], [2.3, FRENTE_NORTE - 0.05], 2.15, 0.11, M.std('#2a201b', 0.55, 0.3), { y0: 0.03, trilhos: [0.06, 1.1, 2.1] });
    // Pilares
    [-2.55, 2.55].forEach((x) => g.add(box(0.45, 2.8, 0.45, parede, x, 1.4, FRENTE_NORTE - 0.25)));
    g.add(box(0.4, 2.3, 0.4, parede, 9.7, 1.15, FRENTE_NORTE));
    // Garagem coberta
    const telhaGaragem = matTelha('#9c4632');
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
    const vinho = '#55202c';
    const telhaVinho = matTelha(vinho);
    const beiral = box(6.9, 0.12, 1.5, telhaVinho, 6.2, 3.15, -11.2);
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
    arvores(g, [[7.2, -1.6, 3.2, 0.9, '#5e8f3a'], [24.1, -0.25, 3.4, 0.9, '#5e8f3a']]);
    arbustos(g, [[3.6, -7.2, 0.7], [5.0, -7.0, 0.6], [9.6, -7.3, 0.8], [10.2, -10.4, 0.9]]);

    // ---------- OBRA (tapume azul, placas, terra vermelha) ----------
    const tapume = box(57.3, 1.85, 0.06, M.std('#ffffff', 0.5, 0.35, { map: TX.tapume(57.3 / 1.1) }), -31.6, 0.925, FRENTE_NORTE + 1.65);
    tapume.rotation.y = Math.atan2(3.3, 57.2);
    g.add(tapume);
    const tapumeLado = box(0.06, 1.85, 15.4, M.std('#ffffff', 0.5, 0.35, { map: TX.tapume(15.4 / 1.1) }), -3.0, 0.925, -13.9);
    g.add(tapumeLado);
    // Mato alto na frente do tapume (não tem calçada ali)
    const texCapim = tex(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x0 = rnd(w * 0.2, w * 0.8);
        const topo = rnd(h * 0.02, h * 0.45);
        const curva = rnd(-30, 30);
        ctx.strokeStyle = ['#9ab85a', '#7d9c45', '#b4c873', '#6c8a38', '#c9c27a'][i % 5];
        ctx.lineWidth = rnd(1.5, 3.2);
        ctx.beginPath();
        ctx.moveTo(x0, h);
        ctx.quadraticCurveTo(x0 + curva * 0.4, (h + topo) / 2, x0 + curva, topo);
        ctx.stroke();
      }
    });
    texCapim.wrapS = texCapim.wrapT = THREE.ClampToEdgeWrapping;
    const geoTouceira = (() => {
      const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
      const b = a.clone().rotateY(Math.PI / 2);
      const pos = [...a.attributes.position.array, ...b.attributes.position.array];
      const uv = [...a.attributes.uv.array, ...b.attributes.uv.array];
      const nor = [...a.attributes.normal.array, ...b.attributes.normal.array];
      const idx = [...a.index.array, ...Array.from(b.index.array, (i) => i + 4)];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setIndex(idx);
      return geo;
    })();
    const matCapim = new THREE.MeshStandardMaterial({ map: texCapim, color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide, alphaTest: 0.35 });
    const mato = [];
    for (let i = 0; i < 900; i++) {
      const x = rnd(-60, -3.4);
      // o tapume chega mais perto do meio-fio indo pra oeste
      const zTapume = FRENTE_NORTE + ((-3 - x) / 57.2) * 3.3;
      const z = rnd(zTapume + 0.1, MEIO_FIO_N - 0.25);
      const junto = z < zTapume + 1.8;
      const h = rnd(0.25, junto ? 1.05 : 0.55);
      const w = rnd(0.45, 0.9);
      mato.push(Object.assign([x, 0, z, 0, rnd(0, 3), 0, w, h, w], { cor: L().shade(junto ? '#8fae5a' : '#a6b86e', rnd(-18, 12)) }));
    }
    g.add(H().instanced(geoTouceira, matCapim, mato, { cast: false }));
    // Moita grande no canto do tapume com a casa
    arbustos(g, [[-4.2, FRENTE_NORTE + 0.7, 0.9], [-4.9, FRENTE_NORTE + 1.1, 0.7]], '#4f7a2e');
    // Boca de lobo no meio-fio, perto da casa
    g.add(box(1.0, 0.05, 0.5, M.std('#8d8a84', 0.8), -5.4, 0.03, MEIO_FIO_N - 0.42, { cast: false }));
    for (let i = 0; i < 7; i++) g.add(box(0.06, 0.055, 0.42, M.std('#2b2b2b', 0.7), -5.82 + i * 0.14, 0.035, MEIO_FIO_N - 0.42, { cast: false }));
    chao(g, -110, -3.05, -60, FRENTE_NORTE - 0.04, matChao(TX.terra, 107, 54, 4), 0.005);
    const terra = M.std('#b0603a', 0.95);
    terra.flatShading = true;
    [[-12, -14, 4.5, 1.6], [-20, -11, 3.5, 1.2], [-7.5, -18, 3.2, 1.4], [-28, -16, 5, 2.2], [-36, -12, 4, 1.4], [-46, -15, 7, 3.4], [-58, -12, 5.5, 2.6], [-34, -26, 6, 2.8]].forEach(([x, z, r, h]) => {
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
    // Quatro placas, nas posições e tamanhos das fotos (da casa pra oeste)
    placa(-5.7, 3.1, 1.9, 2.75, texObra);
    placa(-10.9, 4.0, 2.1, 2.8, texPlacaFornecedores());
    placa(-15.2, 2.0, 1.8, 2.7, texPlacaCAU());
    placa(-20.0, 4.3, 2.4, 2.9, texPlacaProjeto());
    // Prédio em construção (com andaimes) bem no fundo da obra, a oeste
    const conc = M.std('#a3a29d', 0.9);
    const ox = -66;
    const oz = -26;
    for (let k = 0; k < 3; k++) g.add(box(18, 0.3, 12, conc, ox, 0.15 + k * 3.1, oz));
    const pilares = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) pilares.push([ox - 8.5 + i * 4.25, 3.1, oz - 5.5 + j * 5.5]);
    g.add(H().instanced(new THREE.BoxGeometry(0.4, 6.2, 0.4), conc, pilares));
    const andaime = [];
    for (let i = 0; i <= 12; i++) for (let k = 0; k < 4; k++) andaime.push([ox - 9.4 + i * 1.57, k * 2.2 + 1.1, oz + 6.6, 0, 0, 0]);
    g.add(H().instanced(new THREE.BoxGeometry(0.05, 2.2, 0.05), M.std('#6b7280', 0.5, 0.6), andaime, { cast: false }));
    [1, 3.2, 5.4, 7.6].forEach((y) => g.add(box(19, 0.05, 0.05, M.std('#6b7280', 0.5, 0.6), ox, y, oz + 6.6, { cast: false })));
    // Casa branca térrea com varanda no meio do terreno
    g.add(box(12, 3.0, 7, M.std('#f3f2ee', 0.85), -42, 1.5, -27));
    g.add(box(13, 0.18, 3.2, M.std('#4b5563', 0.6, 0.3), -42, 3.0, -22.6));
    [-47.5, -44, -40, -36.5].forEach((x) => g.add(box(0.2, 3.0, 0.2, M.std('#f3f2ee', 0.85), x, 1.5, -21.2)));
    const roofBranca = telhado(12.6, 7.6, 1.2, 1.2, M.std('#6b7280', 0.6, 0.35, { side: THREE.DoubleSide }));
    roofBranca.position.set(-42, 3.0, -27);
    g.add(roofBranca);
    // Pilha de tubos de concreto
    const tubos = [];
    for (let i = 0; i < 6; i++) tubos.push([-30 + (i % 3) * 1.05 + (i >= 3 ? 0.52 : 0), 0.5 + (i >= 3 ? 0.9 : 0), -14.5, 0, 0, Math.PI / 2]);
    g.add(H().instanced(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14, 1, true), M.std('#c9c7c1', 0.85, 0, { side: THREE.DoubleSide }), tubos));
    g.add(box(10, 3, 9, M.std('#f4f4f2', 0.8), -13, 1.5, -38));
    g.add(box(10.4, 0.3, 9.4, M.std('#d9d9d6', 0.8), -13, 3.1, -38));

    // ---------- CASA DO BICHO (clínica veterinária azul) ----------
    // Montada no grupo "bicho", 1,5 m pra oeste: nas fotos ela encosta na grade da casa
    const bicho = new THREE.Group();
    bicho.position.x = -1.5;
    g.add(bicho);
    const azulBicho = M.std('#2f63c8', 0.75);
    chao(bicho, 11, 23, -16.5, FRENTE_NORTE, matChao(TX.bloquete, 12, 10.3, 2.2), 0.02);
    bicho.add(box(11.6, 0.45, 0.26, azulBicho, 17, 0.225, FRENTE_NORTE));
    const vidroCerca = M.std('#d6e8f2', 0.05, 0.1, { transparent: true, opacity: 0.3 });
    const postes = [11.3, 13.6, 15.9, 18.2, 20.5, 22.75];
    postes.forEach((x) => bicho.add(box(0.28, 1.95, 0.28, azulBicho, x, 0.98, FRENTE_NORTE)));
    for (let i = 0; i < postes.length - 1; i++) {
      const v = box(postes[i + 1] - postes[i] - 0.3, 1.4, 0.03, vidroCerca, (postes[i] + postes[i + 1]) / 2, 1.15, FRENTE_NORTE, { cast: false });
      v.userData.noOutline = true;
      bicho.add(v);
    }
    bicho.add(box(1.2, 0.6, 0.6, M.std('#f1f1ef', 0.7), 11.8, 0.3, FRENTE_NORTE + 0.5));
    bicho.add(box(11.6, 3.1, 9.0, azulBicho, 17, 1.55, -11.9));
    bicho.add(box(1.0, 2.1, 0.1, M.std('#1f2a37', 0.15, 0.5), 14.0, 1.05, -7.36));
    janela(bicho, 16.8, 1.6, -7.36, 1.8, 1.2, { divs: 1 });
    janela(bicho, 20.4, 1.6, -7.36, 1.4, 1.2, { divs: 0 });
    bicho.add(box(0.75, 0.38, 0.3, M.std('#f4f4f2', 0.6), 18.0, 2.35, -7.25));
    const roofBicho = telhado(7.2, 9.8, 1.7, 2.2, matTelha('#a85a3f'));
    roofBicho.position.set(14.2, 3.1, -11.9);
    bicho.add(roofBicho);
    const roofMetal = telhado(5.8, 9.8, 0.8, 1.6, M.std('#a3a7ab', 0.5, 0.5, { side: THREE.DoubleSide }));
    roofMetal.position.set(20.0, 3.1, -11.9);
    bicho.add(roofMetal);
    const ladoPlaca = M.std('#2558b8', 0.7);
    bicho.add(new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.0, 0.14), [ladoPlaca, ladoPlaca, ladoPlaca, ladoPlaca, M.std('#ffffff', 0.55, 0, { map: texPlacaBicho() }), ladoPlaca]).translateX(14.0).translateY(3.45).translateZ(-7.28));
    // Totem: caixa azul no alto de um poste verde, na grade, de lado pra rua (dá pra ler indo e vindo)
    bicho.add(cyl(0.11, 0.12, 3.7, M.std('#34a853', 0.6), 20.3, 1.85, FRENTE_NORTE + 0.35, 10));
    const faceTotem = M.std('#ffffff', 0.55, 0, { map: texPlacaBichoAlta() });
    bicho.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.25, 1.4), [faceTotem, faceTotem, ladoPlaca, ladoPlaca, ladoPlaca, ladoPlaca]).translateX(20.3).translateY(4.25).translateZ(FRENTE_NORTE + 0.35));
    carro(bicho, 14.4, -2.9, Math.PI, '#e7e9ec');
    carro(bicho, 17.5, -3.0, Math.PI, '#1f2328');
    // Muro cinza comprido depois da clínica, com cerca-viva na frente
    g.add(box(10.3, 2.3, 0.22, M.std('#ffffff', 0.9, 0, { map: TX.concreto(4, 1, '#b5b3ad') }), 26.45, 1.15, FRENTE_NORTE));
    g.add(box(10.3, 0.06, 0.26, M.std('#9a9892', 0.8), 26.45, 2.3, FRENTE_NORTE, { cast: false }));
    const cercaViva = [];
    for (let x = 21.8; x < 31.4; x += 0.55) cercaViva.push([x + rnd(-0.1, 0.1), FRENTE_NORTE + 0.5 + rnd(-0.06, 0.06), 0.55 + rnd(-0.05, 0.08)]);
    arbustos(g, cercaViva, '#2f5a26');
    // Placa amarela de curva e a lixeira suspensa na faixa de grama
    g.add(cyl(0.035, 0.035, 2.7, M.std('#9ca3af', 0.4, 0.7), 24.6, 1.35, MEIO_FIO_N - 0.7, 8));
    const placaCurva = plane(0.75, 0.75, M.std('#ffffff', 0.6, 0, { map: texPlacaCurva(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), 24.64, 2.55, MEIO_FIO_N - 0.7);
    placaCurva.rotation.y = Math.PI / 2;
    placaCurva.userData.noOutline = true;
    g.add(placaCurva);
    g.add(cyl(0.03, 0.03, 1.05, M.std('#3f3f46', 0.6, 0.4), 27.8, 0.52, MEIO_FIO_N - 0.85, 6));
    g.add(box(0.62, 0.32, 0.36, M.std('#5b4636', 0.8, 0.3), 27.8, 1.18, MEIO_FIO_N - 0.85));
    // Portão de chapa cinza-clara com o número 205
    g.add(box(4.2, 2.4, 0.08, M.std('#ffffff', 0.6, 0.3, { map: TX.portaoGaragem(1, 3) }), 33.7, 1.2, FRENTE_NORTE));
    g.add(box(0.4, 2.5, 0.3, M.std('#d8d6d0', 0.85), 31.6, 1.25, FRENTE_NORTE));
    g.add(box(0.4, 2.5, 0.3, M.std('#d8d6d0', 0.85), 35.8, 1.25, FRENTE_NORTE));
    const num205 = plane(0.42, 0.18, M.basic('#ffffff', { map: L().textures.text('205', { w: 128, h: 56, size: 38, color: '#ffffff', bg: '#1e40af', radius: 6 }) }), 35.8, 1.7, FRENTE_NORTE + 0.16);
    num205.userData.noOutline = true;
    g.add(num205);
    // Esquina noroeste: gramado, muro branco baixo e o barracão comprido de telha lá atrás
    g.add(box(12.8, 1.2, 0.2, M.std('#efece6', 0.85), 42.2, 0.6, FRENTE_NORTE));
    g.add(box(0.2, 1.2, 14, M.std('#efece6', 0.85), XC - MEIA_CRUZ - 1.4, 0.6, FRENTE_NORTE - 7));
    g.add(box(9.8, 3.2, 24, M.std('#e9e2d4', 0.9), 38.0, 1.6, -25));
    const roofBarracao = telhado(25.0, 10.6, 2.0, 0, matTelha('#b8693f'), M.std('#e9e2d4', 0.9));
    roofBarracao.rotation.y = Math.PI / 2;
    roofBarracao.position.set(38.0, 3.2, -25);
    g.add(roofBarracao);
    arbustos(g, [[41, -7.6, 1.1], [44.5, -8, 0.9], [47.6, -7.4, 1.0]], '#3d6a2d');
    // PARE na esquina (pra quem desce a Raul Pinheiro Machado)
    g.add(cyl(0.035, 0.035, 2.6, M.std('#9ca3af', 0.4, 0.7), XC - MEIA_CRUZ - 0.6, 1.3, MEIO_FIO_N - 0.9, 8));
    const pare = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), M.std('#ffffff', 0.6, 0, { map: L().textures.text('PARE', { w: 256, h: 256, size: 86, color: '#ffffff', bg: '#c81e1e', radius: 0 }), side: THREE.DoubleSide }));
    pare.rotation.z = Math.PI / 8;
    pare.position.set(XC - MEIA_CRUZ - 0.6, 2.45, MEIO_FIO_N - 0.85);
    pare.rotation.y = Math.PI; // de frente pra quem desce a transversal
    pare.userData.noOutline = true;
    g.add(pare);
    // Muro divisa casa x clínica
    g.add(box(0.22, 2.2, 10.4, parede, 9.6, 1.1, -11.4));

    // ---------- OUTRO LADO: SOBRADOS BRANCOS GEMINADOS ----------
    const branco = M.std('#f2f0ea', 0.85);
    const lambri = (w, h) => M.std('#ffffff', 0.8, 0, { map: TX.lambri(w / 1.4, h / 1.4) });
    const shingle = matTelha('#7b716a', { shingle: true });
    const PI = Math.PI;
    [9.2, 2.9, -3.4, -9.7].forEach((cx, i) => {
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
    g.add(box(26, 0.3, 0.22, branco, -0.4, 0.15, FRENTE_SUL));
    grade(g, [-13.4, FRENTE_SUL], [12.6, FRENTE_SUL], 1.55, 0.14, M.std('#f5f5f4', 0.6), { y0: 0.3, esp: 0.045 });
    const hastes = [];
    for (let x = -13.4; x <= 12.6; x += 3.25) {
      g.add(box(0.3, 1.95, 0.3, branco, x, 0.98, FRENTE_SUL));
      hastes.push([x, 2.35, FRENTE_SUL]);
    }
    g.add(H().instanced(new THREE.BoxGeometry(0.03, 0.8, 0.03), M.std('#9ca3af', 0.4, 0.7), hastes, { cast: false }));
    fios(g, [0, 0.2, 0.4, 0.6].map((dy) => [[-13.4, 2.05 + dy, FRENTE_SUL], [12.6, 2.05 + dy, FRENTE_SUL], 0.02]));
    // Muro branco comprido depois dos sobrados
    g.add(box(17, 2.0, 0.22, branco, -22.1, 1.0, FRENTE_SUL));
    g.add(box(9, 5.4, 8, M.std('#efece4', 0.85), -22, 2.7, 20));
    const roofSul = telhado(10, 9, 2.4, 2.2, matTelha('#a65a42'));
    roofSul.position.set(-22, 5.4, 20);
    g.add(roofSul);
    // Palmeiras-areca na frente do 190 e a casa verde-sálvia com dois portões de garagem cinza
    palmeiras(g, 13.6, 13.0, 6);
    const salvia = M.std('#8fa591', 0.9);
    g.add(box(8.6, 3.0, 8, salvia, 19.2, 1.5, 18.6));
    [17.0, 20.6].forEach((x) => {
      const portaoCinza = plane(2.8, 2.35, M.std('#ffffff', 0.6, 0.3, { map: TX.portaoGaragem(1, 2) }), x, 1.18, 14.57);
      portaoCinza.rotation.y = PI;
      g.add(portaoCinza);
    });
    g.add(box(8.6, 0.5, 0.12, M.std('#6f8a72', 0.7), 19.2, 2.65, 14.55));
    [22.9, 23.3].forEach((x) => g.add(box(0.4, 0.6, 0.15, M.std('#e2dfd8', 0.6), x, 1.25, 14.52)));
    const roofCinza = telhado(9.4, 8.8, 1.4, 2.0, matTelha('#8b8984'));
    roofCinza.position.set(19.2, 3.0, 18.6);
    g.add(roofCinza);
    // Dracena vermelha (planta espetada) junto ao poste
    const dracena = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      dracena.push(Object.assign([16.8 + Math.cos(a) * 0.25, 1.6, 11.2 + Math.sin(a) * 0.25, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0.05, 1.2, 0.05], { cor: i % 2 ? '#c2410c' : '#a16207' }));
    }
    g.add(H().instanced(new THREE.ConeGeometry(1, 1, 4), M.std('#ffffff', 0.8), dracena, { cast: false }));
    carro(g, 3.4, 12.7, PI / 2, '#b9bdc2');
    // Casa verde-menta (térrea, telhado cinza) com cerca-viva, pilares verdes e o canteiro redondo
    const menta = M.std('#bfe0c6', 0.9);
    g.add(box(10.5, 3.1, 9, menta, 30.5, 1.55, 21.5));
    const roofMenta = telhado(11.6, 10.0, 1.6, 2.4, M.std('#9ca3a8', 0.55, 0.4, { side: THREE.DoubleSide }));
    roofMenta.position.set(30.5, 3.1, 21.5);
    g.add(roofMenta);
    [27, 30.5, 34].forEach((x) => janela(g, x, 1.6, 16.98, 1.1, 1.2, { rotY: PI, divs: 1, moldura: '#ffffff', grade: '#f5f5f4' }));
    const sebe = [];
    for (let x = 24.6; x < 37.6; x += 0.55) if (Math.abs(x - 29.4) > 0.7) sebe.push([x, FRENTE_SUL + 0.2, 0.65 + rnd(-0.05, 0.1)]);
    arbustos(g, sebe, '#35602a');
    [28.6, 30.2].forEach((x) => g.add(box(0.45, 1.6, 0.45, M.std('#9fcfab', 0.8), x, 0.8, FRENTE_SUL + 0.2)));
    grade(g, [28.85, FRENTE_SUL + 0.2], [29.95, FRENTE_SUL + 0.2], 1.4, 0.12, M.std('#e5e7eb', 0.5, 0.3));
    const canteiro = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 6, 16), M.std('#e7e5e4', 0.9));
    canteiro.rotation.x = Math.PI / 2;
    canteiro.position.set(27.4, 0.06, 12.6);
    g.add(canteiro);
    arbustos(g, [[27.4, 12.6, 0.4]], '#6b8f3a');

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
    [76, 90].forEach((x, i) => casaLonge(x, -8 - (i % 2) * 2, -1, 9, 9, i % 2 ? 3 : 5.6));
    [-66, -80, -94].forEach((x, i) => casaLonge(x, -8, -1, 9, 9, i % 2 ? 3 : 5.6));
    [-36, -48, -60, -74, -88, 64, 80].forEach((x, i) => casaLonge(x, 16 + (i % 2) * 2, 1, 9, 9, i % 3 ? 3.2 : 5.8));
    g.add(box(10, 1.9, 0.2, branco, 43, 0.95, FRENTE_SUL + 1, { cast: false }));
    g.add(box(25, 1.9, 0.2, branco, 70, 0.95, FRENTE_SUL + 1, { cast: false }));

    // ---------- CRUZAMENTO: R. PROF. RAUL PINHEIRO MACHADO ----------
    // Montada perpendicular e girada ~10° pra, depois da curva da rua, ficar no rumo norte–sul real.
    const cruz = new THREE.Group();
    cruz.position.set(XC, 0, EIXO);
    cruz.rotation.y = 0.17;
    const asfaltoCruz = matChao(TX.asfalto, 7.6, 80, 4);
    [[-4.0, -84], [4.0, 84]].forEach(([z0, z1]) => {
      const zc = (z0 + z1) / 2;
      const len = Math.abs(z1 - z0);
      const pista = plane(7.6, len, asfaltoCruz, 0, 0.045, zc);
      pista.rotation.x = -Math.PI / 2;
      cruz.add(pista);
      [-1, 1].forEach((sx) => {
        cruz.add(box(0.16, 0.14, len, matMeioFio, sx * (MEIA_CRUZ + 0.08), 0.07, zc));
        const calcada = plane(3.2, len, M.std('#ffffff', 0.95, 0, { map: TX.concreto(1.6, len / 3, '#bdb9b0') }), sx * (MEIA_CRUZ + 1.76), 0.05, zc);
        calcada.rotation.x = -Math.PI / 2;
        cruz.add(calcada);
      });
      // Faixa central laranja
      const central = box(0.12, 0.01, len - 12, M.std('#f2a23a', 0.7), 0, 0.056, zc + Math.sign(zc) * 6, { cast: false });
      cruz.add(central);
    });
    // Braço norte: faixa de pedestres, "PARE" pintado e linha de retenção (pra quem desce rumo à Mercedes)
    for (let x = -3.3; x <= 3.3; x += 1.0) cruz.add(box(0.5, 0.01, 3.0, M.std('#f1f1ee', 0.7), x, 0.056, -12.5, { cast: false }));
    cruz.add(box(3.6, 0.01, 0.4, M.std('#f1f1ee', 0.7), -1.9, 0.056, -6.2, { cast: false }));
    const pareChao = plane(3.2, 2.0, M.std('#ffffff', 0.7, 0, { map: L().textures.text('PARE', { w: 512, h: 320, size: 230, color: '#f1f1ee', bg: 'rgba(0,0,0,0)', radius: 0 }), transparent: true, alphaTest: 0.3 }), -1.9, 0.058, -8.0);
    pareChao.rotation.set(-Math.PI / 2, 0, Math.PI);
    pareChao.userData.noOutline = true;
    cruz.add(pareChao);
    g.add(cruz);
    // Esquina nordeste: sobrado claro de telhado escuro, grade preta com pilares brancos e palmeiras
    const sobradoNE = M.std('#efe9dd', 0.85);
    g.add(box(9.5, 5.8, 9, sobradoNE, 64.2, 2.9, -13.5));
    const roofNE = telhado(10.6, 10.0, 2.6, 2.6, matTelha('#5b3a33'));
    roofNE.position.set(64.2, 5.8, -13.5);
    g.add(roofNE);
    [61.6, 66.8].forEach((x) => {
      janela(g, x, 1.6, -8.96, 1.6, 1.3, { moldura: '#3f2a1d', divs: 1 });
      janela(g, x, 4.4, -8.96, 1.4, 1.2, { moldura: '#3f2a1d', divs: 1 });
    });
    g.add(box(9.5, 0.25, 1.6, sobradoNE, 64.2, 3.0, -8.2));
    grade(g, [XC + MEIA_CRUZ + 1.6, FRENTE_NORTE], [72, FRENTE_NORTE], 1.45, 0.13, M.std('#1d1b1a', 0.5, 0.4), { y0: 0.35 });
    g.add(box(72 - XC - MEIA_CRUZ - 1.6, 0.35, 0.22, sobradoNE, (72 + XC + MEIA_CRUZ + 1.6) / 2, 0.17, FRENTE_NORTE));
    for (let x = XC + MEIA_CRUZ + 1.6; x <= 72; x += 3.2) g.add(box(0.36, 1.9, 0.36, M.std('#f5f5f4', 0.7), x, 0.95, FRENTE_NORTE));
    palmeiras(g, 59.5, -7.2, 5);

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
    // Do lado da casa os postes ficam na divisa (junto do tapume e entre a Casa do Bicho e o muro cinza)
    const pN1 = posteConcreto(g, -3.3, FRENTE_NORTE - 0.35, { luminaria: 1 });
    const pN2 = posteConcreto(g, 21.2, FRENTE_NORTE - 0.35, { trafo: true, luminaria: 1 });
    const pN0 = posteConcreto(g, -36, MEIO_FIO_N - 0.5, { luminaria: 1 });
    const pS1 = posteConcreto(g, -27, MEIO_FIO_S + 0.5, { luminaria: -1 });
    const pS2 = posteConcreto(g, 17.6, MEIO_FIO_S + 0.5, { luminaria: -1, trafo: true });
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
      [pS2.cabo, [19.2, 3.0, 14.6], 0.2],
      [pN2.b, [60, 9.3, MEIO_FIO_N - 0.5], 0.7],
      [pS3.b, [80, 9.3, MEIO_FIO_S + 0.5], 0.7],
      [pN0.b, [-70, 9.3, MEIO_FIO_N - 0.5], 0.7],
      [pS1.b, [-62, 9.3, MEIO_FIO_S + 0.5], 0.7]
    ]);

    // ---------- CARROS NA RUA ----------
    carro(g, 36, 2.8, PI / 2, '#f4f4f2', 'subaru');
    carro(g, 41, 8.4, -PI / 2, '#d9dcdf');
    carro(g, -34, 2.8, PI / 2, '#8b929b');
    carro(g, -40, 2.8, PI / 2, '#a52a2a');
    carro(g, -47, 2.8, PI / 2, '#e5e7eb');

    // ---------- CURVA DA RUA (traçado real) ----------
    curvarMundo(g);
    // ---------- DESEMPENHO: peças paradas juntadas por material ----------
    // Cada pedaço juntado (quadrados de 50 m) só projeta sombra quando a câmera está perto
    const sombraPorPerto = (o.juntar !== false ? juntarEstaticos(g, { celula: 50 }) : [])
      .filter((m) => m.castShadow)
      .map((m) => ({ m, c: m.geometry.boundingSphere.center.clone(), r: m.geometry.boundingSphere.radius }));
    let sombraT = 0;
    const curvo = (p) => {
      const c = curvar(p[0], p[2]);
      return [c.x, p[1], c.z];
    };

    // ---------- SUBARU (menu / capítulos; no POV ele não entra) ----------
    let sub = null;
    if (!o.semSubaru) {
      sub = L().createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', !!root.LuiggiSave?.state?.subaruMods?.neon);
      const v = curvar(VAGA[0], VAGA[2]);
      sub.position.set(v.x, VAGA[1], v.z);
      sub.rotation.y = (o.rotSubaru ?? Math.PI * 0.82) - v.a;
      g.add(sub);
    }
    const vagaC = curvar(VAGA_POV[0], VAGA_POV[2]);
    // Eixo da transversal (ela foi montada girada 0,17 rad pra ficar norte–sul depois da curva)
    const eixoTransversal = (z) => XC + (z - EIXO) * Math.tan(0.17);
    // Obstáculos pra quem dirige (posições do modelo reto; curvados aqui)
    const carroParado = (x, z, eixo) => (eixo === 'x' ? [[x - 1.45, z, 1.0], [x + 1.45, z, 1.0]] : [[x, z - 1.45, 1.0], [x, z + 1.45, 1.0]]);
    const obstaculos = [
      ...carroParado(36, 2.8, 'x'),
      ...carroParado(41, 8.4, 'x'),
      ...carroParado(-34, 2.8, 'x'),
      ...carroParado(-40, 2.8, 'x'),
      ...carroParado(-47, 2.8, 'x'),
      ...carroParado(3.4, 12.7, 'x'),
      ...carroParado(12.9, -2.9, 'z'),
      ...carroParado(16.0, -3.0, 'z'),
      [-36, MEIO_FIO_N - 0.5, 0.3],
      [-27, MEIO_FIO_S + 0.5, 0.3],
      [17.6, MEIO_FIO_S + 0.5, 0.3],
      [44, MEIO_FIO_S + 0.5, 0.3],
      [22.5, 10.6, 0.45],
      [29, 11.2, 0.45],
      [35, 10.8, 0.45],
      [-17, 10.6, 0.4],
      [-22.5, 10.7, 0.4],
      [-28.5, 10.6, 0.4],
      [-40, 10.6, 0.45],
      [70, 12, 0.45],
      [-80, 11, 0.45],
      [7.2, -1.6, 0.3],
      [24.1, -0.25, 0.3],
      [24.6, MEIO_FIO_N - 0.7, 0.2],
      [27.8, MEIO_FIO_N - 0.85, 0.35],
      [XC - MEIA_CRUZ - 0.6, MEIO_FIO_N - 0.9, 0.2],
      [16.8, 11.2, 0.5],
      [13.6, 13.0, 0.9],
      [27.4, 12.6, 0.9]
    ].map(([x, z, r]) => {
      const c = curvar(x, z);
      return { x: c.x, z: c.z, r };
    });

    // ---------- BAIRRO (até a R. Fagundes Varela), só quando pedido ----------
    const bairro = o.bairro && root.LuiggiBairro ? root.LuiggiBairro.construir() : null;
    if (bairro) raiz.add(bairro.group);
    const camLocal = new THREE.Vector3();
    let bairroT = 0;

    return {
      group: raiz,
      bairro,
      subaru: sub,
      dia: true,
      vaga: [vagaC.x, VAGA_POV[1], vagaC.z],
      vagaRot: vagaC.a,
      /** POV dentro do Subaru: põe a vaga na origem com o carro alinhado à rua (que ali é curva). */
      alinharNaVaga() {
        const a = vagaC.a;
        raiz.rotation.y = a;
        raiz.position.set(-(vagaC.x * Math.cos(a) + vagaC.z * Math.sin(a)), 0, -(-vagaC.x * Math.sin(a) + vagaC.z * Math.cos(a)));
      },
      /**
       * Onde dá pra andar (coordenadas do cenário): calçadas e rua entre os muros, e a transversal no cruzamento.
       * Devolve o ponto corrigido.
       */
      limitarAndar(x, z) {
        // Com o bairro: fora das ruas do cenário antigo vale a máscara das ruas e calçadas
        const cb = bairro ? bairro.classeEm(x, z) : -1;
        if (cb === 0 || cb === 1) return bairro.limitar(x, z, 0.3);
        const r = retificar(x, z);
        const x0 = r.x;
        const z0 = r.z;
        if (cb < 0) r.x = Math.max(-62, Math.min(78, r.x));
        const naTransversal = Math.abs(r.x - eixoTransversal(r.z)) < MEIA_CRUZ + 2.6;
        // Na frente da obra o tapume chega mais perto do meio-fio indo pra oeste
        const norte = FRENTE_NORTE + (r.x < -3 ? Math.min(3.3, ((-3 - r.x) / 57.2) * 3.3) : 0) + 0.35;
        const tz0 = cb === 2 ? -96 : -42;
        const tz1 = cb === 2 ? 96 : 46;
        r.z = Math.max(naTransversal ? tz0 : norte, Math.min(naTransversal ? tz1 : FRENTE_SUL - 0.35, r.z));
        // Nada mudou: devolve o ponto como veio (ida e volta pela rua curva tem erro de arredondamento longe do eixo)
        if (r.x === x0 && r.z === z0) return { x, z };
        const c = curvar(r.x, r.z);
        return { x: c.x, z: c.z };
      },
      /**
       * Onde um veículo pode estar (ponto do carro com raio m): rua, calçadas até os muros e a transversal.
       * Devolve o ponto corrigido (coordenadas do cenário).
       */
      limitarVeiculo(x, z, m = 1.05) {
        const cb = bairro ? bairro.classeEm(x, z) : -1;
        if (cb === 0 || cb === 1) return bairro.limitar(x, z, m);
        const r = retificar(x, z);
        const x0 = r.x;
        const z0 = r.z;
        r.x = Math.max(-100, Math.min(100, r.x));
        const meia = MEIA_CRUZ + 1.4 - m; // asfalto + um pouco da calçada da transversal (o muro da esquina fica logo depois)
        const xc = eixoTransversal(r.z);
        const norte = FRENTE_NORTE + (r.x < -3 ? Math.min(3.3, ((-3 - r.x) / 57.2) * 3.3) : 0) + m;
        if (Math.abs(r.x - xc) < meia) {
          // Dentro da faixa da transversal: pode seguir pra norte e sul
          r.z = cb === 2 ? Math.max(-97, Math.min(97, r.z)) : Math.max(-80, Math.min(85, r.z));
        } else {
          const fora = r.z < norte || r.z > FRENTE_SUL - m;
          // Saindo da transversal pro lado: só volta pra rua principal pela esquina
          if (fora && (r.z < FRENTE_NORTE - 1 || r.z > FRENTE_SUL + 1)) r.x = Math.max(xc - meia, Math.min(xc + meia, r.x));
          else r.z = Math.max(norte, Math.min(FRENTE_SUL - m, r.z));
        }
        if (r.x === x0 && r.z === z0) return { x, z };
        const c = curvar(r.x, r.z);
        return { x: c.x, z: c.z };
      },
      /** Coisas em que o carro bate (círculos, coordenadas do cenário): carros parados, postes, árvores, placas. */
      obstaculos,
      /** Obstáculos do bairro perto de (x, z) (coordenadas do cenário). */
      obstaculosPerto(x, z, r = 6) {
        return bairro ? bairro.obstaculosPerto(x, z, r) : [];
      },
      /** Nome da rua em (x, z), quando dá pra saber. */
      nomeDaRua(x, z) {
        if (bairro) {
          const n = bairro.nomeDaRua(x, z);
          if (n) return n;
        }
        const r = retificar(x, z);
        if (Math.abs(r.x - eixoTransversal(r.z)) < MEIA_CRUZ + 3 && (r.z < FRENTE_NORTE || r.z > FRENTE_SUL)) return 'Rua Professor Raul Pinheiro Machado';
        if (Math.abs(r.x) <= 112) return 'Rua Mercedes Seiler Rocha';
        return null;
      },
      curvar,
      retificar,
      slots: { L: curvo([-1.5, 0, 0.8]), R: curvo([1.5, 0, 0.8]), C: curvo([0, 0, 0.8]) },
      cam: { pos: curvo([5.5, 2.0, 5]), look: curvo([0, 0.9, -3]) },
      bg: 0xa9cdf2,
      fog: [0xd2e3f4, bairro ? 0.0053 : 0.0075],
      luz: { sky: '#dcebff', ground: '#7d7566', hemi: 1.2, key: '#fff3dc', keyI: 2.6, keyPos: [10, 22, 14], fillI: 0.45, fill: '#dfe8ff' },
      grade: { tint: [1.01, 1.0, 0.99], saturation: 1.06, bloom: 0.35, threshold: 1.4, vignette: 0.45 },
      update(dt, t, camera) {
        if (camera && sombraPorPerto.length && (sombraT -= dt) <= 0) {
          sombraT = 0.4;
          camLocal.copy(camera.position);
          raiz.worldToLocal(camLocal);
          for (const s2 of sombraPorPerto) s2.m.castShadow = Math.hypot(s2.c.x - camLocal.x, s2.c.z - camLocal.z) - s2.r < 45;
        }
        if (bairro && camera) {
          // Céu acompanha a câmera; blocos longe somem
          camLocal.copy(camera.position);
          raiz.worldToLocal(camLocal);
          ceuG.position.set(camLocal.x, 0, camLocal.z);
          bairroT -= dt;
          if (bairroT <= 0) {
            bairroT = 0.3;
            bairro.atualizar(camLocal.x, camLocal.z);
          }
        }
        nuvens.forEach((n) => {
          n.a += n.v * dt;
          n.s.position.x = Math.cos(n.a) * n.r;
          n.s.position.z = Math.sin(n.a) * n.r;
        });
      }
    };
  }

  root.LuiggiRuaSafepoint = { construir, VAGA, VAGA_POV, curvar, retificar, juntarEstaticos };
})(window);
