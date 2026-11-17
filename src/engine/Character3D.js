/**
 * src/engine/Character3D.js
 * Bonecos 3D estilizados (cel-shaded) gerados a partir da fichaVisual de cada personagem
 * (data/personagens.json): tom de pele, cabelo (cor, estilo, mecha), olhos, óculos, barba, roupa e corpo.
 *
 * Uso:
 *   const boneco = Luiggi3DChar.create(personagem, { escala: 1 });
 *   scene.add(boneco.group);
 *   boneco.setPose('walk'); boneco.play('punch', 0.35); boneco.setExpression('feliz');
 *   no laço: boneco.update(dt);
 */
(function (root) {
  'use strict';

  const T = () => root.THREE;
  const L = () => root.Luiggi3D;

  const LARGURA_CORPO = {
    robusto_forte: 1.25,
    cheinho_fofo: 1.2,
    atletico: 1.12,
    atletico_medio: 1.06,
    medio: 1,
    medio_magro: 0.94,
    baixo_suave: 0.92,
    esguio: 0.86,
    magro: 0.86
  };

  // ------------------------------------------------------------------
  // ROSTO (textura de canvas por expressão / boca / piscada)
  // ------------------------------------------------------------------
  function desenharRosto(ctx, w, h, f, expr, bocaAberta, piscando) {
    ctx.clearRect(0, 0, w, h);
    const olhos = f.rosto?.olhos || {};
    const eyeCol = olhos.cor || '#33241D';
    const sb = f.rosto?.sobrancelhas || {};
    const browCol = sb.cor || f.cabelo?.cor || '#222';
    const browW = sb.espessura === 'grossa' ? 9 : sb.espessura === 'fina' ? 4.5 : 6.5;
    const delineado = !!olhos.delineado;
    const maq = f.detalhes?.maquiagem || '';
    const lip = (maq.match(/#[0-9A-Fa-f]{6}/) || [])[0];
    const cx = w / 2;
    const ey = h * 0.52;
    const ex = w * 0.17;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Bochechas
    ctx.fillStyle = `rgba(244, 63, 94, ${expr === 'envergonhado' ? 0.5 : 0.18})`;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(cx + s * w * 0.25, ey + h * 0.12, w * 0.07, h * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    if (expr === 'envergonhado') {
      ctx.strokeStyle = 'rgba(190,30,60,0.6)';
      ctx.lineWidth = 2.5;
      [-1, 1].forEach((s) => {
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(cx + s * w * 0.21 + k * 8, ey + h * 0.1);
          ctx.lineTo(cx + s * w * 0.21 + k * 8 - 5, ey + h * 0.14);
          ctx.stroke();
        }
      });
    }

    // Olhos
    [-1, 1].forEach((s) => {
      const x = cx + s * ex;
      if (piscando || expr === 'feliz') {
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (expr === 'feliz' && !piscando) {
          ctx.moveTo(x - 17, ey + 4);
          ctx.quadraticCurveTo(x, ey - 16, x + 17, ey + 4);
        } else {
          ctx.moveTo(x - 17, ey);
          ctx.quadraticCurveTo(x, ey + 7, x + 17, ey);
        }
        ctx.stroke();
        return;
      }
      const rx = expr === 'chocado' ? 19 : 17;
      const ry = expr === 'chocado' ? 24 : expr === 'bravo' ? 15 : 21;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, ey, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      const ir = expr === 'chocado' ? 9 : 13;
      const g = ctx.createRadialGradient(x, ey + 3, 1, x, ey + 2, ir);
      g.addColorStop(0, L().shade(eyeCol, 50));
      g.addColorStop(1, eyeCol);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, ey + 2, ir, ir * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b0809';
      ctx.beginPath();
      ctx.arc(x, ey + 3, ir * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - ir * 0.4, ey - ir * 0.35, ir * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ir * 0.35, ey + ir * 0.4, ir * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Pálpebra superior
      ctx.strokeStyle = '#1a1414';
      ctx.lineWidth = delineado ? 7 : 5;
      ctx.beginPath();
      ctx.ellipse(x, ey, rx + 1, ry + 1, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      if (delineado) {
        ctx.beginPath();
        ctx.moveTo(x + s * (rx - 2), ey - 6);
        ctx.lineTo(x + s * (rx + 10), ey - 14);
        ctx.stroke();
      }
      if (expr === 'bravo') {
        ctx.fillStyle = 'rgba(0,0,0,0)';
      }
    });

    // Sobrancelhas
    ctx.strokeStyle = browCol;
    ctx.lineWidth = browW;
    [-1, 1].forEach((s) => {
      const x = cx + s * ex;
      const y = ey - 38;
      ctx.beginPath();
      if (expr === 'bravo') {
        ctx.moveTo(x - s * 20, y - 8);
        ctx.lineTo(x + s * 16, y + 8);
      } else if (expr === 'chocado' || expr === 'envergonhado') {
        ctx.moveTo(x - 18, y + (s > 0 ? 2 : 2));
        ctx.quadraticCurveTo(x, y - 14, x + 18, y + 2);
      } else {
        ctx.moveTo(x - 18, y + 3);
        ctx.quadraticCurveTo(x, y - 6, x + 18, y + 3);
      }
      ctx.stroke();
    });

    // Barba / bigode
    const barba = (f.detalhes?.barbaBigode || '').toLowerCase();
    const barbaCor = f.cabelo?.cor && f.cabelo.estilo !== 'careca' ? f.cabelo.cor : '#2a211c';
    const my = h * 0.79;
    if (barba.includes('barba cheia')) {
      ctx.fillStyle = barbaCor;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.6);
      ctx.quadraticCurveTo(w * 0.18, h * 1.0, cx, h * 0.99);
      ctx.quadraticCurveTo(w * 0.82, h * 1.0, w * 0.88, h * 0.6);
      ctx.quadraticCurveTo(w * 0.78, h * 0.86, cx, h * 0.86);
      ctx.quadraticCurveTo(w * 0.22, h * 0.86, w * 0.12, h * 0.6);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (barba.includes('por fazer')) {
      ctx.fillStyle = 'rgba(40,30,25,0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.86, w * 0.28, h * 0.12, 0, 0, Math.PI);
      ctx.fill();
    }
    if (barba.includes('bigode') || barba.includes('barba cheia')) {
      ctx.strokeStyle = barbaCor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 24, my - 9);
      ctx.quadraticCurveTo(cx, my - 18, cx + 24, my - 9);
      ctx.stroke();
    }
    if (barba.includes('cavanhaque')) {
      ctx.fillStyle = barbaCor;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.92, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boca
    ctx.strokeStyle = '#3a1818';
    ctx.lineWidth = 5;
    if (bocaAberta) {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(cx, my + 2, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.ellipse(cx, my + 7, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'feliz') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 22, my - 4);
      ctx.quadraticCurveTo(cx, my + 22, cx + 22, my - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'chocado') {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(cx, my + 4, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (expr === 'bravo') {
      ctx.beginPath();
      ctx.moveTo(cx - 18, my + 6);
      ctx.quadraticCurveTo(cx, my - 8, cx + 18, my + 6);
      ctx.stroke();
    } else if (expr === 'envergonhado') {
      ctx.beginPath();
      ctx.moveTo(cx - 16, my);
      ctx.quadraticCurveTo(cx - 8, my - 6, cx, my);
      ctx.quadraticCurveTo(cx + 8, my + 6, cx + 16, my);
      ctx.stroke();
    } else {
      if (lip) {
        ctx.fillStyle = lip;
        ctx.beginPath();
        ctx.moveTo(cx - 16, my);
        ctx.quadraticCurveTo(cx, my - 7, cx + 16, my);
        ctx.quadraticCurveTo(cx, my + 9, cx - 16, my);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - 15, my);
        ctx.quadraticCurveTo(cx, my + 8, cx + 15, my);
        ctx.stroke();
      }
    }
  }

  // ------------------------------------------------------------------
  // CABELO
  // ------------------------------------------------------------------
  function construirCabelo(THREE, f, r, M) {
    const g = new THREE.Group();
    const c = f.cabelo || {};
    if (!c.cor || c.estilo === 'careca') return g;
    const estilo = c.estilo || 'curto_classico';
    const mat = M.toon(c.cor);
    const mecha = c.corMecha ? M.toon(c.corMecha) : null;

    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    };

    // Calota base
    const capGeo = new THREE.SphereGeometry(r * 1.07, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const cap = add(capGeo, mat, 0, r * 0.04, -r * 0.02, -0.32);
    cap.userData.noOutline = false;

    const longo = /^longo|gotico_hime|repicado_cortina/.test(estilo);
    const medio = /^medio|wolf_cut|shaggy|casual_baguncado/.test(estilo);
    const cacheado = /cacheado/.test(estilo);

    if (longo) {
      const comp = r * 2.4;
      add(new THREE.CapsuleGeometry(r * 0.95, comp, 6, 16), mat, 0, -comp * 0.38, -r * 0.42, 0.06, 0, 0, 1.05, 1, 0.5);
      // Mechas laterais emoldurando o rosto
      [-1, 1].forEach((s) => {
        add(new THREE.CapsuleGeometry(r * 0.22, r * 1.5, 4, 10), s < 0 && mecha ? mecha : mecha && s > 0 ? mecha : mat, s * r * 0.86, -r * 0.55, r * 0.22, 0, 0, s * 0.05);
      });
    } else if (medio) {
      add(new THREE.CapsuleGeometry(r * 0.98, r * 0.6, 6, 16), mat, 0, -r * 0.45, -r * 0.35, 0.1, 0, 0, 1.04, 1, 0.62);
      [-1, 1].forEach((s) => add(new THREE.CapsuleGeometry(r * 0.2, r * 0.7, 4, 10), mecha || mat, s * r * 0.9, -r * 0.25, r * 0.15));
    } else if (estilo === 'chanel_gotico') {
      add(new THREE.CapsuleGeometry(r * 1.0, r * 0.45, 6, 16), mat, 0, -r * 0.4, -r * 0.2, 0, 0, 0, 1.08, 1, 0.9);
    } else if (estilo === 'preso_tras') {
      add(new THREE.SphereGeometry(r * 0.42, 16, 12), mat, 0, r * 0.35, -r * 1.0);
      add(new THREE.CapsuleGeometry(r * 0.25, r * 0.8, 4, 10), mat, 0, -r * 0.2, -r * 1.1, 0.4);
    }

    if (cacheado) {
      const n = estilo === 'cacheado_ruivo' ? 26 : 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const el = 0.2 + (i % 3) * 0.32;
        const rr = r * (estilo === 'cacheado_ruivo' ? 1.12 : 1.02);
        add(
          new THREE.SphereGeometry(r * (estilo === 'cacheado_ruivo' ? 0.36 : 0.3), 10, 8),
          mat,
          Math.cos(a) * Math.cos(el) * rr,
          Math.sin(el) * rr * 0.9 + r * 0.05 - (estilo === 'cacheado_ruivo' && Math.sin(a) < 0 ? r * 0.5 : 0),
          Math.sin(a) * Math.cos(el) * rr - r * 0.1
        );
      }
      if (estilo === 'cacheado_ruivo') add(new THREE.CapsuleGeometry(r * 0.9, r * 0.9, 6, 14), mat, 0, -r * 0.5, -r * 0.45, 0.1, 0, 0, 1.15, 1, 0.6);
    }

    // Franjas
    if (/franja|hime|microfranja|shaggy/.test(estilo)) {
      const reta = /hime|liso_franja|microfranja/.test(estilo);
      const altura = estilo === 'medio_microfranja' ? r * 0.25 : r * 0.42;
      // Faixa esférica cobrindo a testa (frente da cabeça = phi π/2)
      const tl = estilo === 'medio_microfranja' ? 0.13 : 0.2;
      add(new THREE.SphereGeometry(r * 1.09, 24, 6, Math.PI / 2 - 1.0, 2.0, Math.PI * 0.2, Math.PI * tl), mat, 0, 0, 0);
      if (/hime/.test(estilo)) {
        [-1, 1].forEach((s) => add(new THREE.BoxGeometry(r * 0.3, r * 1.1, r * 0.25), mat, s * r * 0.82, -r * 0.35, r * 0.45));
      }
      if (!reta) {
        for (let i = -2; i <= 2; i++) {
          add(new THREE.ConeGeometry(r * 0.16, altura, 5), mat, i * r * 0.28, r * 0.42 - altura * 0.25, r * 0.88, -0.35 + Math.PI, 0, i * 0.08);
        }
      }
    } else if (/cortina|dividido_meio|ondulado$|liso_meio|lateral|liso$/.test(estilo)) {
      [-1, 1].forEach((s) => add(new THREE.CapsuleGeometry(r * 0.3, r * 0.5, 4, 10), mat, s * r * 0.45, r * 0.55, r * 0.66, 0.9, 0, s * -1.0));
    } else if (estilo === 'curto_espetado') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add(new THREE.ConeGeometry(r * 0.2, r * 0.55, 5), mat, Math.cos(a) * r * 0.55, r * 0.95, Math.sin(a) * r * 0.55, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      }
    } else if (estilo === 'casual_baguncado' || estilo === 'curto_classico') {
      for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(r * 0.3, 8, 6), mat, (i - 2) * r * 0.3, r * 0.75, r * 0.55 - Math.abs(i - 2) * r * 0.08);
    }

    if (mecha && estilo === 'wolf_cut_mecha') {
      add(new THREE.CapsuleGeometry(r * 0.16, r * 0.8, 4, 8), mecha, r * 0.55, r * 0.15, r * 0.75, 0.2, 0, -0.3);
    }
    return g;
  }

  // ------------------------------------------------------------------
  // CRIAÇÃO DO BONECO
  // ------------------------------------------------------------------
  function create(char, o = {}) {
    const THREE = T();
    const M = L().M;
    const f = (char && char.fichaVisual) || {};
    const pele = f.tomPele || '#ECC3AB';
    const pal = f.roupa?.paletaCores || ['#334155', '#1E293B'];
    const topCol = o.corTop || pal[0] || '#27272A';
    const botCol = o.corBaixo || pal[1] || '#18181B';
    const sup = (f.roupa?.pecaSuperior || '').toLowerCase();
    const inf = (f.roupa?.pecaInferior || '').toLowerCase();
    const regata = /regata|tomara|alcinha|top |top$|cropped|vestido/.test(sup);
    const saia = /saia|vestido|shortinho/.test(inf) && !/calça\/saia|saia ou calça/.test(inf);
    const bermuda = /bermuda|short/.test(inf) && !saia;
    const jaqueta = /jaqueta|cardigã|moletom|colete|camisa .* sobre|sobre/.test(sup);
    const largura = LARGURA_CORPO[f.corpo?.tipoCorpo] || 1;
    const alt = f.corpo?.alturaRelativa || 3;
    const escala = (o.escala || 1) * (0.92 + (alt - 2) * 0.05);

    const matPele = M.toon(pele);
    const matTop = M.toon(topCol);
    const matBaixo = M.toon(botCol);
    const matSapato = M.toon(o.corSapato || '#16161a');
    const matSola = M.toon('#e5e7eb');

    const group = new THREE.Group();
    const corpo = new THREE.Group();
    corpo.scale.setScalar(escala);
    group.add(corpo);

    const cap = (r, len, mat, seg = 12) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, seg), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

    // Quadril (raiz da animação)
    const hips = new THREE.Group();
    hips.position.y = 0.8;
    corpo.add(hips);

    // Pernas
    const pernas = {};
    [-1, 1].forEach((s) => {
      const lado = s < 0 ? 'L' : 'R';
      const hip = new THREE.Group();
      hip.position.set(s * 0.1 * largura, 0, 0);
      hips.add(hip);
      const coxaMat = saia || bermuda ? matPele : matBaixo;
      const coxa = cap(0.085 * Math.min(1.15, largura), 0.24, bermuda ? matBaixo : coxaMat);
      coxa.position.y = -0.19;
      hip.add(coxa);
      const knee = new THREE.Group();
      knee.position.y = -0.4;
      hip.add(knee);
      const canela = cap(0.075, 0.24, saia || bermuda ? matPele : matBaixo);
      canela.position.y = -0.17;
      knee.add(canela);
      const sapato = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.26), matSapato);
      sapato.position.set(0, -0.36, 0.04);
      sapato.castShadow = true;
      knee.add(sapato);
      const sola = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.03, 0.265), matSola);
      sola.position.set(0, -0.405, 0.04);
      knee.add(sola);
      pernas[lado] = { hip, knee };
    });

    if (saia) {
      const saiaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * largura, 0.32 * largura, 0.32, 20, 1, true), M.toon(botCol, { side: THREE.DoubleSide }));
      saiaMesh.position.y = -0.1;
      saiaMesh.castShadow = true;
      hips.add(saiaMesh);
    } else {
      const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.19 * largura, 16, 10), bermuda ? matBaixo : matBaixo);
      pelvis.scale.set(1, 0.65, 0.75);
      pelvis.position.y = -0.02;
      pelvis.castShadow = true;
      hips.add(pelvis);
    }

    // Tronco
    const spine = new THREE.Group();
    spine.position.y = 0.02;
    hips.add(spine);
    const tronco = cap(0.19, 0.28, matTop, 16);
    tronco.scale.set(1.05 * largura, 1, 0.72);
    tronco.position.y = 0.24;
    spine.add(tronco);
    if (regata) {
      const colo = new THREE.Mesh(new THREE.SphereGeometry(0.17 * largura, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), matPele);
      colo.scale.set(1.08, 1, 0.75);
      colo.position.y = 0.37;
      spine.add(colo);
    }
    if (jaqueta) {
      const ziper = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 0.01), M.toon(L().shade(topCol, -35)));
      ziper.position.set(0, 0.24, 0.145);
      spine.add(ziper);
    }
    if (f.roupa?.estampa === 'emilydoces' || /emilyd/.test(sup)) {
      const est = L().plane(0.24, 0.07, M.basic(0xffffff, { map: L().textures.text('emilydoces', { w: 256, h: 80, size: 40, font: 'Georgia, serif', color: '#fbcfe8' }), transparent: true }), 0, 0.28, 0.146);
      spine.add(est);
    } else if (char?.id === 'fabricio') {
      const est = L().plane(0.18, 0.16, M.basic(0xffffff, { map: L().textures.text('🐈', { w: 128, h: 128, size: 100, color: '#e5e7eb' }), transparent: true }), 0, 0.22, 0.146);
      spine.add(est);
    }
    // Colar / corrente
    const accText = (f.roupa?.acessorios || []).join(' ').toLowerCase();
    if (/corrente|colar|terço|choker|pingente/.test(accText)) {
      const colar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 24, Math.PI), M.std('#d1d5db', 0.2, 1));
      colar.rotation.set(Math.PI * 0.62, 0, Math.PI);
      colar.position.set(0, 0.4, 0.06);
      spine.add(colar);
    }

    // Pescoço e cabeça
    const neck = new THREE.Group();
    neck.position.y = 0.5;
    spine.add(neck);
    const pescoco = cap(0.055, 0.06, matPele);
    pescoco.position.y = 0.02;
    neck.add(pescoco);

    const head = new THREE.Group();
    head.position.y = 0.26;
    neck.add(head);
    const R = 0.25;
    const cranio = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), matPele);
    cranio.scale.set(1, 1.04, 0.98);
    cranio.castShadow = true;
    head.add(cranio);
    // Orelhas
    [-1, 1].forEach((s) => {
      const orelha = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 10, 8), matPele);
      orelha.scale.set(0.5, 1, 0.8);
      orelha.position.set(s * R * 0.98, -R * 0.05, 0);
      head.add(orelha);
    });

    // Rosto (patch esférico com textura)
    const faceCanvasCache = new Map();
    function faceTex(expr, aberta, pisca) {
      const key = `${expr}|${aberta ? 1 : 0}|${pisca ? 1 : 0}`;
      if (faceCanvasCache.has(key)) return faceCanvasCache.get(key);
      const tex = L().makeCanvasTex(256, 256, (ctx, w, h) => desenharRosto(ctx, w, h, f, expr, aberta, pisca));
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      faceCanvasCache.set(key, tex);
      return tex;
    }
    const faceGeo = new THREE.SphereGeometry(R * 1.006, 24, 16, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.85, 1.55);
    const faceMat = M.toon('#ffffff', { map: faceTex('neutro', false, false), transparent: true, alphaTest: 0.35 });
    faceMat.polygonOffset = true;
    faceMat.polygonOffsetFactor = -2;
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.scale.copy(cranio.scale);
    face.userData.noOutline = true;
    head.add(face);
    // Nariz discreto
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 8, 6), M.toon(L().shade(pele, -18)));
    nariz.position.set(0, -R * 0.12, R * 0.98);
    nariz.userData.noOutline = true;
    head.add(nariz);

    const cabelo = construirCabelo(THREE, f, R, M);
    head.add(cabelo);

    // Óculos
    const oc = f.detalhes?.oculos;
    if (oc) {
      const armMat = M.std(oc.corArmacao || '#222222', 0.3, 0.6);
      const lenteMat = new THREE.MeshPhysicalMaterial({ color: oc.lenteTinta || 0xffffff, transparent: true, opacity: oc.lenteTinta ? 0.35 : 0.12, roughness: 0.05 });
      const og = new THREE.Group();
      const redondo = /redondo/.test(oc.tipo);
      [-1, 1].forEach((s) => {
        const aro = redondo ? new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, 0.008, 6, 24), armMat) : new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, 0.008, 4, 4), armMat);
        if (!redondo) aro.rotation.z = Math.PI / 4;
        if (!redondo) aro.scale.set(1.2, 0.75, 1);
        aro.position.set(s * R * 0.34, 0, 0);
        og.add(aro);
        const lente = new THREE.Mesh(new THREE.CircleGeometry(R * 0.21, 20), lenteMat);
        lente.position.set(s * R * 0.34, 0, 0);
        lente.userData.noOutline = true;
        og.add(lente);
        const haste = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, R * 0.9), armMat);
        haste.position.set(s * R * 0.6, 0.01, -R * 0.45);
        og.add(haste);
      });
      const ponte = new THREE.Mesh(new THREE.BoxGeometry(R * 0.2, 0.01, 0.01), armMat);
      og.add(ponte);
      if (oc.tipo === 'na_cabeca_fino') og.position.set(0, R * 0.62, R * 0.72);
      else og.position.set(0, R * 0.04, R * 1.0);
      og.rotation.x = oc.tipo === 'na_cabeca_fino' ? -0.6 : 0;
      og.children.forEach((c) => (c.userData.noOutline = true));
      head.add(og);
    }

    // Braços
    const bracos = {};
    const mangaCurta = !regata && !/manga longa|moletom|jaqueta|cardigã|camisa/.test(sup);
    [-1, 1].forEach((s) => {
      const lado = s < 0 ? 'L' : 'R';
      const shoulder = new THREE.Group();
      shoulder.position.set(s * (0.25 * largura + 0.03), 0.43, 0);
      spine.add(shoulder);
      const braco = cap(0.06 * Math.min(1.2, largura), 0.16, regata ? matPele : matTop);
      braco.position.y = -0.13;
      shoulder.add(braco);
      if (mangaCurta) {
        const manga = cap(0.072 * Math.min(1.2, largura), 0.06, matTop);
        manga.position.y = -0.06;
        shoulder.add(manga);
        braco.material = matPele;
      }
      const elbow = new THREE.Group();
      elbow.position.y = -0.27;
      shoulder.add(elbow);
      const antebraco = cap(0.052, 0.15, regata || mangaCurta ? matPele : matTop);
      antebraco.position.y = -0.11;
      elbow.add(antebraco);
      const mao = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), matPele);
      mao.position.y = -0.25;
      mao.castShadow = true;
      elbow.add(mao);
      const hand = new THREE.Group();
      hand.position.y = -0.27;
      elbow.add(hand);
      bracos[lado] = { shoulder, elbow, hand };
    });
    if (/tatuagem|tatuado/i.test((f.detalhes?.tatuagens || []).join(' ')) && char?.id === 'erion') {
      ['L', 'R'].forEach((lado) => {
        const tat = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.12, 12, 1, true), M.toon('#2d4f48'));
        tat.position.y = -0.12;
        bracos[lado].shoulder.add(tat);
      });
    }

    // Contorno cartoon
    if (o.contorno !== false) L().addOutline(corpo, 0.012, 0x15111a);

    // Sombra de contato
    const sombra = L().blobShadow(0.42 * escala, 0.5);
    group.add(sombra);

    // ------------------------------------------------------------------
    // ANIMAÇÃO
    // ------------------------------------------------------------------
    const J = {
      hips,
      spine,
      neck,
      head,
      sL: bracos.L.shoulder,
      sR: bracos.R.shoulder,
      eL: bracos.L.elbow,
      eR: bracos.R.elbow,
      hL: pernas.L.hip,
      hR: pernas.R.hip,
      kL: pernas.L.knee,
      kR: pernas.R.knee
    };
    const estado = {
      pose: o.pose || 'idle',
      acao: null,
      acaoT: 0,
      acaoDur: 0.4,
      t: Math.random() * 10,
      expr: 'neutro',
      falando: false,
      pisca: false,
      proxPisca: 2 + Math.random() * 3,
      bocaT: 0,
      velocidade: 1,
      olharY: 0,
      olharX: 0,
      inclinar: 0
    };
    const alvo = {};
    const zera = () => {
      for (const k of Object.keys(J)) alvo[k] = { x: 0, y: 0, z: 0 };
      alvo.hipsY = 0;
      alvo.rootX = 0;
    };

    function calcPose(dt) {
      zera();
      const t = estado.t;
      const p = estado.pose;
      const br = Math.sin(t * 2.2);
      // Braços relaxados ao lado do corpo
      alvo.sL.z = -0.12 - br * 0.02;
      alvo.sR.z = 0.12 + br * 0.02;
      alvo.eL.x = -0.15;
      alvo.eR.x = -0.15;
      alvo.spine.x = br * 0.015;
      alvo.head.x = -br * 0.02;

      if (p === 'walk' || p === 'run' || p === 'sneak') {
        const run = p === 'run';
        const f2 = (run ? 11 : 7) * estado.velocidade;
        const a = Math.sin(t * f2);
        const amp = run ? 0.9 : p === 'sneak' ? 0.4 : 0.55;
        alvo.hL.x = a * amp;
        alvo.hR.x = -a * amp;
        alvo.kL.x = Math.max(0, -Math.cos(t * f2)) * amp * 1.4;
        alvo.kR.x = Math.max(0, Math.cos(t * f2)) * amp * 1.4;
        alvo.sL.x = -a * amp * 0.9;
        alvo.sR.x = a * amp * 0.9;
        alvo.eL.x = run ? -1.3 : -0.35;
        alvo.eR.x = run ? -1.3 : -0.35;
        alvo.hipsY = Math.abs(Math.sin(t * f2)) * (run ? 0.06 : 0.03);
        alvo.spine.x = run ? 0.22 : 0.04;
        if (p === 'sneak') {
          alvo.hipsY -= 0.14;
          alvo.spine.x = 0.38;
          alvo.hL.x -= 0.5;
          alvo.hR.x -= 0.5;
          alvo.kL.x += 0.8;
          alvo.kR.x += 0.8;
          alvo.sL.x = -0.6;
          alvo.sR.x = -0.6;
          alvo.eL.x = -1.4;
          alvo.eR.x = -1.4;
        }
      } else if (p === 'dance') {
        const b = t * 6.5 * estado.velocidade;
        alvo.hipsY = -Math.abs(Math.sin(b)) * 0.06;
        alvo.hips.y = Math.sin(b * 0.5) * 0.3;
        alvo.spine.z = Math.sin(b * 0.5) * 0.12;
        alvo.sL.z = -1.2 - Math.sin(b) * 0.9;
        alvo.sR.z = 1.2 - Math.sin(b + Math.PI) * 0.9;
        alvo.eL.x = -0.8;
        alvo.eR.x = -0.8;
        alvo.hL.x = Math.max(0, Math.sin(b)) * 0.5;
        alvo.hR.x = Math.max(0, -Math.sin(b)) * 0.5;
        alvo.kL.x = Math.max(0, Math.sin(b)) * 0.7;
        alvo.kR.x = Math.max(0, -Math.sin(b)) * 0.7;
        alvo.head.z = Math.sin(b) * 0.12;
      } else if (p === 'dance_sad') {
        const b = t * 3.2 * estado.velocidade;
        alvo.rootX = Math.sin(b * 0.5) * 0.18;
        alvo.hipsY = -Math.abs(Math.sin(b)) * 0.05;
        alvo.head.x = 0.35;
        alvo.spine.x = 0.12;
        alvo.sL.x = -0.4;
        alvo.sR.x = -0.4;
        alvo.eL.x = -1.5;
        alvo.eR.x = -1.5;
        alvo.sL.z = -0.3;
        alvo.sR.z = 0.3;
        alvo.hL.x = Math.max(0, Math.sin(b)) * 0.35;
        alvo.hR.x = Math.max(0, -Math.sin(b)) * 0.35;
        alvo.kL.x = alvo.hL.x * 1.3;
        alvo.kR.x = alvo.hR.x * 1.3;
      } else if (p === 'cheer') {
        const b = t * 9;
        alvo.hipsY = Math.max(0, Math.sin(b)) * 0.12;
        alvo.sL.z = -2.6 + Math.sin(b) * 0.25;
        alvo.sR.z = 2.6 - Math.sin(b) * 0.25;
        alvo.eL.x = -0.2;
        alvo.eR.x = -0.2;
        alvo.head.x = -0.15;
      } else if (p === 'fight') {
        const b = t * 6;
        alvo.hipsY = -0.08 + Math.sin(b) * 0.015;
        alvo.hL.x = -0.35;
        alvo.hR.x = 0.25;
        alvo.kL.x = 0.5;
        alvo.kR.x = 0.35;
        alvo.sL.x = -1.1;
        alvo.sR.x = -1.2;
        alvo.eL.x = -1.7;
        alvo.eR.x = -1.8;
        alvo.sL.z = -0.25;
        alvo.sR.z = 0.25;
        alvo.spine.y = 0.25;
        alvo.head.y = -0.2;
      } else if (p === 'block') {
        alvo.hipsY = -0.1;
        alvo.kL.x = 0.5;
        alvo.kR.x = 0.5;
        alvo.hL.x = -0.3;
        alvo.hR.x = -0.2;
        alvo.sL.x = -1.6;
        alvo.sR.x = -1.6;
        alvo.eL.x = -2.2;
        alvo.eR.x = -2.2;
        alvo.sL.z = 0.35;
        alvo.sR.z = -0.35;
        alvo.spine.x = 0.25;
        alvo.head.x = 0.25;
      } else if (p === 'crossed') {
        alvo.sL.x = -0.55;
        alvo.sR.x = -0.55;
        alvo.sL.z = 0.25;
        alvo.sR.z = -0.25;
        alvo.eL.x = -1.65;
        alvo.eR.x = -1.75;
        alvo.eL.y = 0.6;
        alvo.eR.y = -0.6;
        alvo.head.z = 0.08;
        alvo.hips.y = 0.15;
      } else if (p === 'carry') {
        alvo.sL.x = -0.9;
        alvo.sR.x = -0.9;
        alvo.eL.x = -0.6;
        alvo.eR.x = -0.6;
        alvo.sL.z = 0.12;
        alvo.sR.z = -0.12;
      } else if (p === 'candle') {
        alvo.sR.x = -1.1;
        alvo.eR.x = -1.0;
        alvo.sR.z = -0.15;
        alvo.head.x = 0.1;
      } else if (p === 'sit') {
        alvo.hipsY = -0.36;
        alvo.hL.x = -1.5;
        alvo.hR.x = -1.5;
        alvo.kL.x = 1.5;
        alvo.kR.x = 1.5;
        alvo.sL.x = -0.4;
        alvo.sR.x = -0.4;
        alvo.eL.x = -0.6;
        alvo.eR.x = -0.6;
      } else if (p === 'bench') {
        // Deitado no banco (o grupo é rotacionado pelo minigame); braços seguram a barra
        alvo.sL.x = -Math.PI / 2;
        alvo.sR.x = -Math.PI / 2;
        alvo.sL.z = -0.55;
        alvo.sR.z = 0.55;
        alvo.eL.x = -1.2;
        alvo.eR.x = -1.2;
        alvo.hL.x = -1.4;
        alvo.hR.x = -1.4;
        alvo.kL.x = 1.5;
        alvo.kR.x = 1.5;
      } else if (p === 'phone') {
        alvo.sR.x = -0.75;
        alvo.eR.x = -1.6;
        alvo.sR.z = -0.25;
        alvo.head.x = 0.35;
      } else if (p === 'talk') {
        const b = t * 3;
        alvo.sR.x = -0.5 + Math.sin(b) * 0.25;
        alvo.eR.x = -1.1 + Math.sin(b * 1.3) * 0.3;
        alvo.sL.x = -0.2 + Math.sin(b + 1) * 0.15;
        alvo.eL.x = -0.6;
        alvo.head.y = Math.sin(b * 0.7) * 0.12;
      } else if (p === 'sad') {
        alvo.head.x = 0.45;
        alvo.spine.x = 0.15;
        alvo.sL.z = -0.05;
        alvo.sR.z = 0.05;
      } else if (p === 'ko') {
        alvo.spine.x = -0.2;
        alvo.sL.z = -1.4;
        alvo.sR.z = 1.4;
      } else if (p === 'balance') {
        const w = Math.sin(t * 3.1) * 0.25;
        alvo.sL.z = -1.45 + w;
        alvo.sR.z = 1.45 + w;
        alvo.eL.x = -0.1;
        alvo.eR.x = -0.1;
        alvo.spine.z = -w * 0.4 + estado.inclinar;
        alvo.hipsY = -0.05;
        alvo.kL.x = 0.25;
        alvo.kR.x = 0.25;
        alvo.hL.x = -0.12;
        alvo.hR.x = -0.12;
      } else if (p === 'point') {
        alvo.sR.x = -1.5;
        alvo.eR.x = -0.1;
        alvo.sR.z = 0.2;
        alvo.head.y = -0.2;
      } else if (p === 'look_back') {
        alvo.spine.y = Math.PI * 0.32;
        alvo.neck.y = Math.PI * 0.32;
        alvo.head.y = Math.PI * 0.22;
        alvo.sR.x = -0.3;
      }

      // Ações por cima da pose
      if (estado.acao) {
        const k = Math.min(1, estado.acaoT / estado.acaoDur);
        const golpe = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
        const a = estado.acao;
        if (a === 'punch' || a === 'punchL') {
          const s = a === 'punch' ? 'R' : 'L';
          alvo['s' + s].x = -1.55 * golpe - (1 - golpe) * 1.1;
          alvo['e' + s].x = -0.1 * golpe - (1 - golpe) * 1.7;
          alvo.spine.y = (s === 'R' ? -0.5 : 0.5) * golpe;
          alvo.rootX = 0;
        } else if (a === 'kick') {
          alvo.hR.x = -1.5 * golpe;
          alvo.kR.x = 0.2 * (1 - golpe);
          alvo.spine.x = -0.3 * golpe;
          alvo.sL.z = -0.8 * golpe;
          alvo.sR.z = 0.8 * golpe;
        } else if (a === 'special') {
          alvo.sL.x = -1.5 * golpe;
          alvo.sR.x = -1.5 * golpe;
          alvo.eL.x = 0;
          alvo.eR.x = 0;
          alvo.spine.x = 0.2 * golpe;
          alvo.hipsY += 0.15 * Math.sin(k * Math.PI);
        } else if (a === 'hit') {
          alvo.spine.x = -0.45 * golpe;
          alvo.head.x = -0.5 * golpe;
          alvo.sL.z = -0.8 * golpe;
          alvo.sR.z = 0.8 * golpe;
        } else if (a === 'throw') {
          const up = k < 0.5 ? k / 0.5 : 1;
          const rel = k < 0.5 ? 0 : (k - 0.5) / 0.5;
          alvo.sL.x = -2.6 * up + rel * 0.6;
          alvo.sR.x = -2.6 * up + rel * 0.6;
          alvo.eL.x = -1.2 * (1 - rel);
          alvo.eR.x = -1.2 * (1 - rel);
          alvo.hipsY = up * 0.1 * (1 - rel) + Math.sin(k * Math.PI) * 0.12;
          alvo.kL.x = (1 - up) * 0.6;
          alvo.kR.x = (1 - up) * 0.6;
        } else if (a === 'press') {
          // Empurrar a barra do supino (sobre a pose 'bench')
          alvo.eL.x = -1.2 + 1.15 * golpe;
          alvo.eR.x = -1.2 + 1.15 * golpe;
        } else if (a === 'jump') {
          alvo.hipsY += Math.sin(k * Math.PI) * 0.35;
          alvo.sL.z = -2.4 * golpe;
          alvo.sR.z = 2.4 * golpe;
        } else if (a === 'shout') {
          alvo.head.x = -0.25 * golpe;
          alvo.spine.x = -0.15 * golpe;
          alvo.sL.x = -1.0 * golpe;
          alvo.eL.x = -1.8 * golpe;
          alvo.sR.x = -1.0 * golpe;
          alvo.eR.x = -1.8 * golpe;
        } else if (a === 'wave') {
          alvo.sR.z = 2.5;
          alvo.eR.z = Math.sin(estado.acaoT * 14) * 0.5;
          alvo.eR.x = -0.3;
        } else if (a === 'thumbs') {
          alvo.sR.x = -1.2 * golpe;
          alvo.eR.x = -1.0 * golpe;
          alvo.sL.x = -1.2 * golpe;
          alvo.eL.x = -1.0 * golpe;
        } else if (a === 'stumble') {
          alvo.spine.z = Math.sin(estado.acaoT * 20) * 0.25 * (1 - k);
          alvo.sL.z = -1.3 * (1 - k);
          alvo.sR.z = 1.3 * (1 - k);
        }
        // Olhar acompanha
      }
      alvo.head.y += estado.olharY;
      alvo.head.x += estado.olharX;
    }

    function aplicar(dt) {
      const lam = estado.acao ? 22 : 10;
      for (const k of Object.keys(J)) {
        const j = J[k];
        const a = alvo[k];
        j.rotation.x = L().U.damp(j.rotation.x, a.x, lam, dt);
        j.rotation.y = L().U.damp(j.rotation.y, a.y, lam, dt);
        j.rotation.z = L().U.damp(j.rotation.z, a.z, lam, dt);
      }
      hips.position.y = L().U.damp(hips.position.y, 0.8 + alvo.hipsY, lam, dt);
      hips.position.x = L().U.damp(hips.position.x, alvo.rootX, 6, dt);
      if (estado.pose === 'ko') {
        corpo.rotation.x = L().U.damp(corpo.rotation.x, -Math.PI / 2, 6, dt);
        corpo.position.y = L().U.damp(corpo.position.y, 0.22 * escala, 6, dt);
      } else {
        corpo.rotation.x = L().U.damp(corpo.rotation.x, 0, 8, dt);
        corpo.position.y = L().U.damp(corpo.position.y, 0, 8, dt);
      }
    }

    function atualizarRosto(dt) {
      estado.proxPisca -= dt;
      let mudou = false;
      if (estado.proxPisca <= 0) {
        if (!estado.pisca) {
          estado.pisca = true;
          estado.proxPisca = 0.12;
        } else {
          estado.pisca = false;
          estado.proxPisca = 2.2 + Math.random() * 3;
        }
        mudou = true;
      }
      let aberta = false;
      if (estado.falando) {
        estado.bocaT += dt;
        aberta = Math.floor(estado.bocaT * 9) % 2 === 0;
      }
      if (aberta !== estado._aberta) mudou = true;
      estado._aberta = aberta;
      if (mudou || estado._exprAplicada !== estado.expr) {
        estado._exprAplicada = estado.expr;
        faceMat.map = faceTex(estado.expr, aberta, estado.pisca && estado.expr !== 'feliz');
        faceMat.needsUpdate = true;
      }
    }

    function update(dt) {
      estado.t += dt;
      if (estado.acao) {
        estado.acaoT += dt;
        if (estado.acaoT >= estado.acaoDur) {
          estado.acao = null;
          estado.acaoT = 0;
        }
      }
      calcPose(dt);
      aplicar(dt);
      atualizarRosto(dt);
    }

    // Pose inicial aplicada instantaneamente
    calcPose(0);
    aplicar(1);

    const api = {
      group,
      corpo,
      joints: J,
      char,
      altura: 1.85 * escala,
      maoDireita: bracos.R.hand,
      maoEsquerda: bracos.L.hand,
      cabeca: head,
      update,
      setPose(p, velocidade = 1) {
        estado.pose = p;
        estado.velocidade = velocidade;
        return api;
      },
      get pose() {
        return estado.pose;
      },
      play(acao, dur = 0.4) {
        estado.acao = acao;
        estado.acaoT = 0;
        estado.acaoDur = dur;
        return api;
      },
      get acao() {
        return estado.acao;
      },
      setExpression(e) {
        estado.expr = e || 'neutro';
        return api;
      },
      setTalking(v) {
        estado.falando = !!v;
        return api;
      },
      inclinar(v = 0) {
        estado.inclinar = v;
        return api;
      },
      lookAt(yaw = 0, pitch = 0) {
        estado.olharY = yaw;
        estado.olharX = pitch;
        return api;
      },
      dispose() {
        faceCanvasCache.forEach((t) => t.dispose());
      }
    };
    return api;
  }

  /** Boneco genérico para multidões (sem personagem dos dados). */
  function createExtra(o = {}) {
    const U = L().U;
    const peles = ['#F2D0BD', '#E6B89C', '#C68E6A', '#8D5A3B', '#F7E3DA', '#D9A57E'];
    const cabelos = ['#1A1412', '#3B2417', '#6B4226', '#121215', '#A0522D', '#C9A27A', '#2B2B2B'];
    const estilos = ['curto_classico', 'longo_liso', 'medio_dividido_meio', 'cacheado_curto', 'preso_tras', 'longo_ondulado', 'casual_baguncado'];
    const roupas = ['#1f2937', '#7c3aed', '#be185d', '#0f766e', '#334155', '#b91c1c', '#111827', '#f5f5f4', '#1d4ed8'];
    const ficha = {
      tomPele: o.pele || U.pick(peles),
      cabelo: { cor: o.cabelo || U.pick(cabelos), estilo: o.estilo || U.pick(estilos), corMecha: null },
      rosto: { olhos: { cor: '#3b2a20' } },
      detalhes: {},
      corpo: { tipoCorpo: U.pick(['medio', 'esguio', 'atletico', 'cheinho_fofo']), alturaRelativa: U.pick([2, 3, 3, 4]) },
      roupa: { paletaCores: [o.top || U.pick(roupas), o.baixo || U.pick(['#111827', '#1e3a8a', '#27272a', '#3f3f46'])], pecaSuperior: o.sup || 'camiseta', pecaInferior: o.inf || 'calça' }
    };
    return create({ id: 'extra', nome: o.nome || 'Figurante', fichaVisual: ficha }, { contorno: o.contorno ?? false, escala: o.escala || 1 });
  }

  root.Luiggi3DChar = { create, createExtra, desenharRosto };
})(window);
