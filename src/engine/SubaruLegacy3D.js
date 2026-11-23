/**
 * src/engine/SubaruLegacy3D.js
 * O Subaru Legacy azul do Luis, peça por peça (frente = −z, motorista à esquerda = −x, medidas em metros).
 *
 * Interior: painel moldado com binóculo do quadro de instrumentos, saídas de ar com aletas, central
 * multimídia com tela e botões físicos (⏮ ⏯ ⏭ + botões giratórios), ar-condicionado, pisca-alerta,
 * volante de 3 raios com o logo das plêiades, alavancas de seta/limpador, chave com chaveiro de cookie,
 * câmbio com coifa, freio de mão, porta-copos, compartimento dos Tic Tacs, bancos com abas laterais e
 * faixa azul, cintos, forro de porta (descansa-braço, maçaneta, vidro elétrico, alto-falante),
 * quebra-sóis, puxadores, luz de teto, retrovisor com imagem real e a arvorezinha de baunilha.
 * Exterior (o.exterior): lataria fina que encaixa no interior (dá pra ver quem está dentro pelos vidros),
 * capô com tomada de ar, grade com o emblema, faróis, lanternas, aerofólio, escapamento duplo e rodas douradas.
 *
 * construir(o) devolve a mesma API que o interior antigo (volante, gauges, radioTex, portaLuvas…)
 * e mais: botoesRadio, aromatizante, teto, exterior, laterais, assentos.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;

  // Onde cada pessoa senta (quadril) e de onde ela olha. Mesmo layout do interior antigo.
  const ASSENTOS = {
    motorista: { x: -0.42, y: 0.5, z: 0.2, olho: [-0.38, 1.2, 0.18], lado: -1, nome: 'Motorista', icone: '🛞', tras: false },
    passageiro: { x: 0.42, y: 0.5, z: 0.2, olho: [0.42, 1.2, 0.18], lado: 1, nome: 'Passageiro', icone: '🎧', tras: false },
    tras_esq: { x: -0.44, y: 0.5, z: 1.2, olho: [-0.4, 1.24, 1.18], lado: -1, nome: 'Trás esq.', icone: '◀', tras: true },
    tras_meio: { x: 0, y: 0.52, z: 1.22, olho: [0, 1.26, 1.2], lado: -1, nome: 'Trás meio', icone: '⏺', tras: true },
    tras_dir: { x: 0.44, y: 0.5, z: 1.2, olho: [0.4, 1.24, 1.18], lado: 1, nome: 'Trás dir.', icone: '▶', tras: true }
  };
  // Caixa da carroceria (pra ninguém atravessar o carro andando na rua)
  const CAIXA = { x0: -1.06, x1: 1.06, z0: -2.7, z1: 2.42 };

  function construir(o = {}) {
    const THREE = root.THREE;
    const { box, cyl, plane, M, textures, halo, makeCanvasTex } = L();
    const g = new THREE.Group();
    const corCarro = o.cor || root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8';

    // ---------- Materiais ----------
    const couro = M.std('#16181d', 0.75, 0.05);
    const plastico = M.std('#0e1014', 0.6, 0.1);
    const grafite = M.std('#23262d', 0.5, 0.2);
    const tecido = M.std('#22252c', 0.95);
    const tecidoEscuro = M.std('#17191e', 0.95);
    const faixaAzul = M.std('#1e3a8a', 0.85);
    const cromado = M.std('#d7dde6', 0.16, 1);
    const aluminio = M.std('#9aa3ad', 0.32, 0.85);
    const borracha = M.std('#0d0e11', 0.9);
    const forro = M.std('#2c2f36', 0.95);
    const pintura = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(corCarro), metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    const vidroMat = (op = 0.1, cor = 0x9fb4d8) => {
      const m = new THREE.MeshPhysicalMaterial({ color: cor, transparent: true, opacity: op, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
      return m;
    };

    /** Peça pequena (sem sombra, pra não pesar). */
    const peca = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = box(w, h, d, mat, x, y, z, { cast: false });
      m.rotation.set(rx, ry, rz);
      return m;
    };
    /** Barra entre dois pontos (colunas, alavancas). */
    const barra = (a, b, esp, mat, prof = esp) => {
      const va = new THREE.Vector3(...a);
      const vb = new THREE.Vector3(...b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(esp, va.distanceTo(vb), prof), mat);
      m.position.copy(va).add(vb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      m.castShadow = true;
      return m;
    };
    /** Perfil (z, y) extrudado na largura (eixo x). pts: [z, y] ou ['q', cz, cy, z, y]. */
    const perfil = (pts, largura, mat, x = 0) => {
      const s = new THREE.Shape();
      s.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach((p) => (p[0] === 'q' ? s.quadraticCurveTo(p[1], p[2], p[3], p[4]) : s.lineTo(p[0], p[1])));
      const geo = new THREE.ExtrudeGeometry(s, { depth: largura, bevelEnabled: false, curveSegments: 10 });
      geo.rotateY(-Math.PI / 2);
      geo.translate(x + largura / 2, 0, 0);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    /** Vidro plano na lateral (x fixo), contorno em (z, y). */
    const vidroLateral = (pts, x, mat) => {
      const s = new THREE.Shape();
      s.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach((p) => s.lineTo(p[0], p[1]));
      const geo = new THREE.ShapeGeometry(s);
      geo.rotateY(-Math.PI / 2);
      geo.translate(x, 0, 0);
      const m = new THREE.Mesh(geo, mat);
      m.userData.noOutline = true;
      m.renderOrder = 2;
      return m;
    };
    const tex = (w, h, draw) => {
      const t = makeCanvasTex(w, h, draw);
      t.anisotropy = 4;
      return t;
    };

    // ==================================================================
    // PAINEL
    // ==================================================================
    const painelGrupo = new THREE.Group();
    g.add(painelGrupo);
    // Corpo do painel moldado (perfil lateral): lábio arredondado, face vertical pros joelhos
    painelGrupo.add(
      perfil(
        [
          [-1.08, 0.6],
          [-1.08, 0.99],
          ['q', -1.06, 1.03, -0.98, 1.03],
          [-0.72, 1.0],
          ['q', -0.5, 0.98, -0.48, 0.93],
          [-0.49, 0.88],
          [-0.5, 0.66],
          ['q', -0.56, 0.6, -0.7, 0.6]
        ],
        1.86,
        couro
      )
    );
    // Costura mais clara acompanhando o lábio do painel
    painelGrupo.add(peca(1.84, 0.006, 0.006, M.std('#4b5563', 0.8), 0, 0.955, -0.488));
    // Friso azul iluminado (marca registrada do interior)
    painelGrupo.add(peca(1.84, 0.012, 0.008, M.glow('#3b82f6', 1.6), 0, 0.88, -0.492));
    // Grade do desembaçador e tweeters nos cantos
    for (let i = 0; i < 9; i++) painelGrupo.add(peca(0.9, 0.004, 0.012, plastico, 0, 1.032, -0.96 + i * 0.016));
    [-1, 1].forEach((s) => {
      const tw = cyl(0.035, 0.035, 0.01, M.std('#0a0b0e', 0.9), s * 0.82, 1.03, -0.93, 16, { cast: false });
      painelGrupo.add(tw);
    });
    // Linha do airbag do passageiro
    painelGrupo.add(peca(0.42, 0.004, 0.2, M.std('#1d2026', 0.8), 0.5, 1.005, -0.62, -0.08));

    // ---------- Quadro de instrumentos (canvas animado) + binóculo ----------
    const gauges = makeCanvasTex(512, 200, () => { });
    const cluster = plane(0.42, 0.16, M.basic('#ffffff', { map: gauges }), -0.38, 1.0, -0.6);
    cluster.rotation.x = -0.25;
    cluster.material.color.multiplyScalar(1.3);
    cluster.userData.noOutline = true;
    painelGrupo.add(cluster);
    // Binóculo: aba fina por cima do quadro
    painelGrupo.add(peca(0.47, 0.018, 0.13, couro, -0.38, 1.085, -0.6, 0.18));
    [-1, 1].forEach((s) => painelGrupo.add(peca(0.016, 0.09, 0.12, couro, -0.38 + s * 0.228, 1.04, -0.61)));

    // ---------- Saídas de ar com aletas ----------
    const moldura = M.std('#2a2d35', 0.4, 0.6);
    const aleta = M.std('#15171c', 0.6, 0.2);
    const saidaDeAr = (x, y, z, w = 0.13, h = 0.065, ry = 0) => {
      const sa = new THREE.Group();
      sa.position.set(x, y, z);
      sa.rotation.y = ry;
      sa.add(peca(w + 0.016, h + 0.016, 0.012, moldura, 0, 0, 0));
      sa.add(peca(w, h, 0.014, M.std('#050608', 0.9), 0, 0, 0.002));
      for (let i = 0; i < 4; i++) sa.add(peca(w - 0.006, 0.004, 0.02, aleta, 0, -h / 2 + (h / 5) * (i + 1), 0.006, 0.25));
      sa.add(peca(0.012, h - 0.01, 0.012, aluminio, 0, 0, 0.013));
      painelGrupo.add(sa);
    };
    saidaDeAr(-0.76, 0.95, -0.494, 0.13, 0.065, 0.1);
    saidaDeAr(0.76, 0.95, -0.494, 0.13, 0.065, -0.1);
    saidaDeAr(-0.08, 0.94, -0.488, 0.1, 0.055);
    saidaDeAr(0.08, 0.94, -0.488, 0.1, 0.055);
    // Pisca-alerta entre as saídas centrais
    const alerta = new THREE.Group();
    alerta.position.set(0, 0.94, -0.48);
    alerta.add(peca(0.03, 0.03, 0.012, M.std('#7f1d1d', 0.5), 0, 0, 0));
    const tri = new THREE.Mesh(new THREE.CircleGeometry(0.009, 3), M.glow('#f87171', 1.4));
    tri.rotation.z = Math.PI / 2;
    tri.position.z = 0.007;
    alerta.add(tri);
    painelGrupo.add(alerta);

    // ---------- Central multimídia (rádio com botões físicos) ----------
    const consoleFrente = new THREE.Group();
    consoleFrente.position.set(0, 0, -0.482);
    painelGrupo.add(consoleFrente);
    consoleFrente.add(peca(0.34, 0.33, 0.03, grafite, 0, 0.76, -0.012));
    consoleFrente.add(peca(0.31, 0.18, 0.012, M.std('#0a0b0f', 0.35, 0.3), 0, 0.81, 0.006));
    const radioTex = makeCanvasTex(256, 128, () => { });
    const radio = plane(0.19, 0.095, M.basic('#ffffff', { map: radioTex }), 0, 0.84, 0.0135);
    radio.material.color.multiplyScalar(1.4);
    radio.userData.acao = 'radio';
    radio.userData.noOutline = true;
    consoleFrente.add(radio);
    // Botões ⏮ ⏯ ⏭ (ícones desenhados no canvas, iluminados de azul)
    const iconeBotao = (tipo) =>
      tex(96, 56, (ctx, w, h) => {
        ctx.fillStyle = '#14161b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#93c5fd';
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 8;
        const cx = w / 2;
        const cy = h / 2;
        const triangulo = (x, dir) => {
          ctx.beginPath();
          ctx.moveTo(x, cy - 12);
          ctx.lineTo(x + dir * 18, cy);
          ctx.lineTo(x, cy + 12);
          ctx.closePath();
          ctx.fill();
        };
        if (tipo === 'prev') {
          ctx.fillRect(cx - 22, cy - 12, 5, 24);
          triangulo(cx, -1);
          triangulo(cx + 17, -1);
        } else if (tipo === 'next') {
          ctx.fillRect(cx + 17, cy - 12, 5, 24);
          triangulo(cx, 1);
          triangulo(cx - 17, 1);
        } else {
          triangulo(cx - 20, 1);
          ctx.fillRect(cx + 6, cy - 12, 6, 24);
          ctx.fillRect(cx + 16, cy - 12, 6, 24);
        }
      });
    const botoesRadio = {};
    const corpoBotao = M.std('#1a1c22', 0.45, 0.3);
    [['prev', -0.065, 'radio_prev'], ['toggle', 0, 'radio_toggle'], ['next', 0.065, 'radio_next']].forEach(([nome, x, acao]) => {
      const face = M.basic('#ffffff', { map: iconeBotao(nome) });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.03, 0.016), [corpoBotao, corpoBotao, corpoBotao, corpoBotao, face, corpoBotao]);
      b.position.set(x, 0.755, 0.014);
      b.userData.acao = acao;
      b.userData.zBase = 0.014;
      b.userData.noOutline = true;
      consoleFrente.add(b);
      botoesRadio[nome] = b;
    });
    // Botões giratórios: volume (liga/pausa) e sintonia (próxima)
    const knob = (x, acao) => {
      const k = new THREE.Group();
      k.position.set(x, 0.84, 0.016);
      const c = cyl(0.021, 0.023, 0.022, aluminio, 0, 0, 0, 24, { cast: false });
      c.rotation.x = Math.PI / 2;
      k.add(c);
      k.add(peca(0.004, 0.014, 0.004, M.glow('#93c5fd', 1.2), 0, 0.01, 0.012));
      k.userData.acao = acao;
      c.userData.acao = acao;
      consoleFrente.add(k);
      return k;
    };
    knob(-0.128, 'radio_toggle');
    knob(0.128, 'radio_next');
    // Ar-condicionado: três botões giratórios + display
    consoleFrente.add(peca(0.3, 0.09, 0.012, M.std('#121419', 0.5, 0.2), 0, 0.655, 0.006));
    [-0.1, 0, 0.1].forEach((x, i) => {
      const c = cyl(0.024, 0.026, 0.02, i === 1 ? grafite : aluminio, x, 0.655, 0.018, 20, { cast: false });
      c.rotation.x = Math.PI / 2;
      consoleFrente.add(c);
      consoleFrente.add(peca(0.004, 0.016, 0.004, M.glow(i === 0 ? '#60a5fa' : i === 2 ? '#f87171' : '#e5e7eb', 1.2), x, 0.665, 0.03));
    });
    consoleFrente.add(peca(0.07, 0.016, 0.004, M.glow('#38bdf8', 0.9), 0, 0.69, 0.014));

    // ---------- Console até o assoalho, câmbio, freio de mão ----------
    g.add(perfil([[-0.86, 0.3], [-0.86, 0.62], [-0.52, 0.62], [-0.46, 0.5], [-0.3, 0.46], [-0.3, 0.3]], 0.34, grafite));
    // Tomada 12V e porta-trecos
    g.add(peca(0.2, 0.06, 0.004, M.std('#050608', 0.9), 0, 0.55, -0.465, -0.35));
    const tomada = cyl(0.012, 0.012, 0.01, cromado, 0.11, 0.56, -0.47, 12, { cast: false });
    tomada.rotation.x = Math.PI / 2 - 0.35;
    g.add(tomada);
    // Coifa e alavanca do câmbio (5 marchas, com o padrão na bola)
    const coifa = cyl(0.025, 0.06, 0.09, couro, 0, 0.51, -0.2, 14, { cast: false });
    g.add(coifa);
    g.add(peca(0.15, 0.012, 0.15, cromado, 0, 0.47, -0.2));
    g.add(cyl(0.012, 0.012, 0.12, M.std('#9ca3af', 0.3, 0.9), 0, 0.6, -0.2, 8, { cast: false }));
    const bolaTex = tex(128, 64, (ctx, w, h) => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 3;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#e5e7eb';
      [[34, '1', '2'], [64, '3', '4'], [94, '5', 'R']].forEach(([x, a, b]) => {
        ctx.beginPath();
        ctx.moveTo(x, 18);
        ctx.lineTo(x, 46);
        ctx.stroke();
        ctx.fillText(a, x - 4, 14);
        ctx.fillText(b, x - 4, 60);
      });
      ctx.beginPath();
      ctx.moveTo(34, 32);
      ctx.lineTo(94, 32);
      ctx.stroke();
    });
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.std('#ffffff', 0.35, 0.2, { map: bolaTex }));
    bola.position.set(0, 0.675, -0.2);
    bola.rotation.y = -Math.PI / 2;
    g.add(bola);
    // Freio de mão (do lado do motorista no console)
    const freio = barra([-0.1, 0.5, -0.02], [-0.1, 0.6, 0.22], 0.03, couro);
    g.add(freio);
    g.add(peca(0.032, 0.02, 0.06, cromado, -0.1, 0.6, 0.235, -0.4));
    // Porta-copos
    [-0.055, 0.055].forEach((x) => {
      g.add(cyl(0.04, 0.04, 0.01, M.std('#050608', 0.9), x + 0.03, 0.583, -0.04, 18, { cast: false }));
      g.add(cyl(0.043, 0.043, 0.004, aluminio, x + 0.03, 0.59, -0.04, 18, { cast: false }));
    });
    g.add(box(0.36, 0.12, 0.42, couro, 0, 0.52, -0.29));

    // ---------- Compartimento entre os bancos: abre e só tem Tic Tac branco ----------
    const comp = new THREE.Group();
    comp.position.set(0, 0, 0.17);
    comp.userData.acao = 'tictac';
    const fundoComp = M.std('#07080b', 0.9);
    comp.add(box(0.36, 0.1, 0.5, couro, 0, 0.41, 0));
    comp.add(box(0.33, 0.02, 0.47, fundoComp, 0, 0.47, 0, { cast: false }));
    [-1, 1].forEach((s) => {
      comp.add(box(0.02, 0.12, 0.5, couro, s * 0.17, 0.53, 0));
      comp.add(box(0.36, 0.12, 0.02, couro, 0, 0.53, s * 0.24));
    });
    const rotulo = textures.text('tic tac', { w: 256, h: 150, size: 74, color: '#15803d', bg: '#ffffff', radius: 26 });
    const plasticoTT = M.std('#f8fafc', 0.3, 0, { transparent: true, opacity: 0.93 });
    const tampaTT = M.std('#ffffff', 0.5);
    const geoTT = new THREE.BoxGeometry(0.068, 0.017, 0.04);
    const matsTT = [plasticoTT, plasticoTT, M.basic('#ffffff', { map: rotulo }), plasticoTT, plasticoTT, plasticoTT];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) {
        const tt = new THREE.Mesh(geoTT, matsTT);
        tt.position.set(-0.12 + c * 0.08 + (Math.random() - 0.5) * 0.008, 0.489, -0.2 + r * 0.056 + (Math.random() - 0.5) * 0.008);
        tt.rotation.y = (Math.random() - 0.5) * 0.25;
        comp.add(tt);
        tt.add(box(0.012, 0.018, 0.038, tampaTT, 0.034, 0, 0, { cast: false }));
        if (Math.random() < 0.35) {
          const cima = tt.clone();
          cima.position.y += 0.018;
          cima.rotation.y += (Math.random() - 0.5) * 0.6;
          comp.add(cima);
        }
      }
    }
    g.add(comp);
    // Tampa acolchoada (dobradiça atrás, abre pra cima) = apoio de braço
    const consoleTampa = new THREE.Group();
    consoleTampa.position.set(0, 0.61, 0.42);
    consoleTampa.userData.acao = 'tictac';
    const tampaComp = box(0.37, 0.05, 0.5, couro, 0, 0, -0.25);
    tampaComp.userData.acao = 'tictac';
    consoleTampa.add(tampaComp);
    consoleTampa.add(peca(0.36, 0.004, 0.48, M.std('#3f4652', 0.8), 0, 0.026, -0.25));
    g.add(consoleTampa);

    // ---------- Porta-luvas (lado do passageiro, abre) ----------
    const portaLuvas = new THREE.Group();
    portaLuvas.position.set(0.48, 0.76, -0.5);
    const tampa = box(0.42, 0.16, 0.03, plastico, 0, -0.08, 0);
    portaLuvas.add(tampa);
    const puxador = peca(0.1, 0.018, 0.012, aluminio, 0, -0.03, 0.02);
    portaLuvas.add(puxador);
    portaLuvas.userData.acao = 'portaluvas';
    tampa.userData.acao = 'portaluvas';
    puxador.userData.acao = 'portaluvas';
    g.add(portaLuvas);
    g.add(box(0.4, 0.14, 0.2, M.std('#07080b', 0.9), 0.48, 0.69, -0.6, { cast: false }));
    // Caixinha de camisinhas guardada no porta-luvas (aparece quando abre)
    const camisinhas = L().createCamisinhasMesh();
    camisinhas.scale.setScalar(0.07);
    camisinhas.position.set(0.46, 0.715, -0.57);
    camisinhas.rotation.y = 0.25;
    camisinhas.visible = false;
    g.add(camisinhas);

    // ==================================================================
    // VOLANTE, COLUNA, ALAVANCAS E CHAVE
    // ==================================================================
    const volante = new THREE.Group();
    volante.position.set(-0.38, 0.85, -0.37);
    volante.rotation.x = 0.5;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 14, 48), couro);
    aro.castShadow = true;
    volante.add(aro);
    // Costura azul do aro (marcas nas posições 10h e 2h)
    [-0.7, 0.7].forEach((a) => {
      const marca = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.0255, 6, 8, 0.25), M.std('#1e40af', 0.6));
      marca.rotation.z = Math.PI / 2 + a - 0.125;
      volante.add(marca);
    });
    [Math.PI, 0, -Math.PI / 2].forEach((a) => {
      const raio = peca(0.13, 0.04, 0.025, M.std('#2b2e36', 0.4, 0.6), Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.005, 0, 0, a);
      volante.add(raio);
    });
    // Botões de áudio nos raios
    [-1, 1].forEach((s) => volante.add(peca(0.03, 0.022, 0.008, aluminio, s * 0.105, 0.0, 0.012)));
    const logoTex = tex(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 110, 66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 8;
      ctx.stroke();
      const estrela = (x, y, r) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 ? r * 0.38 : r;
          ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = '#f8fafc';
      estrela(96, 66, 30);
      [[150, 52, 14], [168, 80, 14], [138, 96, 14], [186, 108, 12], [118, 116, 12]].forEach(([x, y, r]) => estrela(x, y, r));
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.045, 28), [M.std('#0b1220', 0.4), M.basic('#ffffff', { map: logoTex }), M.std('#0b1220', 0.4)]);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.012;
    hub.userData.acao = 'buzina';
    volante.add(hub);
    const coluna = cyl(0.035, 0.05, 0.34, plastico, 0, 0, -0.18, 12);
    coluna.rotation.x = Math.PI / 2;
    volante.add(coluna);
    // Capa da coluna, alavanca de seta (esq.) e de limpador (dir.)
    volante.add(peca(0.13, 0.09, 0.16, plastico, 0, -0.02, -0.18));
    [-1, 1].forEach((s) => {
      const alav = barra([s * 0.06, 0.01, -0.13], [s * 0.2, 0.03, -0.1], 0.016, M.std('#1f2228', 0.5, 0.3));
      volante.add(alav);
      volante.add(peca(0.03, 0.022, 0.022, M.std('#2b2e35', 0.5, 0.3), s * 0.205, 0.032, -0.1));
    });
    volante.userData.acao = 'volante';
    g.add(volante);
    // Chave no contato com chaveiro de cookie balançando
    const chave = new THREE.Group();
    chave.position.set(-0.17, 0.74, -0.488);
    chave.add(cyl(0.016, 0.016, 0.01, aluminio, 0, 0, 0, 14, { cast: false }).rotateX(Math.PI / 2));
    chave.add(peca(0.03, 0.018, 0.008, M.std('#111', 0.5), 0, 0, 0.012));
    const chaveiro = new THREE.Group();
    chaveiro.position.set(0, -0.01, 0.016);
    chaveiro.add(cyl(0.002, 0.002, 0.05, cromado, 0, -0.025, 0, 6, { cast: false }));
    const cookieChaveiro = L().createCookieMesh('#d69249', '#3b1f10', { gotas: 4 });
    cookieChaveiro.scale.setScalar(0.022);
    cookieChaveiro.rotation.x = Math.PI / 2;
    cookieChaveiro.position.y = -0.06;
    chaveiro.add(cookieChaveiro);
    chave.add(chaveiro);
    g.add(chave);

    // ==================================================================
    // BANCOS
    // ==================================================================
    const bancosFrente = [];
    const bancoDianteiro = (x) => {
      const b = new THREE.Group();
      b.position.x = x;
      // Assento com abas laterais e faixa azul
      b.add(box(0.48, 0.11, 0.5, tecido, 0, 0.425, 0.15));
      b.add(peca(0.18, 0.006, 0.44, faixaAzul, 0, 0.483, 0.15));
      [-1, 1].forEach((s) => {
        const aba = box(0.08, 0.07, 0.48, tecidoEscuro, s * 0.22, 0.49, 0.15, { cast: false });
        aba.rotation.z = s * -0.25;
        b.add(aba);
      });
      // Encosto (inclinado) com abas
      const enc = new THREE.Group();
      enc.position.set(0, 0.47, 0.42);
      enc.rotation.x = -0.15;
      enc.add(box(0.48, 0.64, 0.12, tecido, 0, 0.32, 0));
      enc.add(peca(0.17, 0.5, 0.006, faixaAzul, 0, 0.3, -0.062));
      [-1, 1].forEach((s) => {
        const aba = box(0.07, 0.5, 0.1, tecidoEscuro, s * 0.225, 0.28, -0.05, { cast: false });
        aba.rotation.y = s * 0.35;
        enc.add(aba);
      });
      // Bolso atrás do encosto (pra quem está no banco de trás)
      enc.add(peca(0.36, 0.3, 0.012, M.std('#1a1c21', 0.95), 0, 0.22, 0.066));
      if (!o.estatico) {
        enc.add(box(0.27, 0.17, 0.1, tecido, 0, 0.75, 0.02));
        [-0.08, 0.08].forEach((dx) => enc.add(cyl(0.007, 0.007, 0.08, cromado, dx, 0.64, 0.02, 8, { cast: false })));
      }
      b.add(enc);
      // Trilhos e alavanca do banco
      b.add(box(0.42, 0.08, 0.44, plastico, 0, 0.33, 0.15));
      [-0.15, 0.15].forEach((dx) => b.add(peca(0.03, 0.02, 0.6, M.std('#3a3d44', 0.4, 0.8), dx, 0.31, 0.15)));
      b.add(peca(0.03, 0.02, 0.16, plastico, x < 0 ? -0.26 : 0.26, 0.37, -0.02));
      bancosFrente.push(b);
      return b;
    };
    g.add(bancoDianteiro(-0.42));
    g.add(bancoDianteiro(0.42));
    // Banco de trás inteiriço: três lugares, apoio de braço central dobrado
    g.add(box(1.4, 0.15, 0.5, tecido, 0, 0.42, 1.2));
    [-0.46, 0, 0.46].forEach((x) => g.add(peca(x === 0 ? 0.3 : 0.36, 0.006, 0.42, faixaAzul, x, 0.498, 1.2)));
    g.add(box(1.4, 0.6, 0.12, tecido, 0, 0.75, 1.45));
    [-0.46, 0.46].forEach((x) => g.add(peca(0.34, 0.46, 0.006, faixaAzul, x, 0.76, 1.388)));
    g.add(box(1.4, 0.07, 0.5, tecido, 0, 0.33, 1.2));
    if (!o.estatico) [-0.46, 0, 0.46].forEach((x) => g.add(box(0.24, 0.13, 0.09, tecido, x, 1.13, 1.47)));
    // Caixas de roda traseiras (cobrem os pneus por dentro)
    [-1, 1].forEach((s) => g.add(box(0.2, 0.4, 0.7, forro, s * 0.82, 0.48, 1.25)));
    // Cintos: tira descendo da coluna B e da coluna C, fivelas nos bancos
    const cinto = M.std('#0b0c0f', 0.9);
    [-1, 1].forEach((s) => {
      g.add(barra([s * 0.9, 1.36, 0.6], [s * 0.88, 0.62, 0.58], 0.05, cinto, 0.006));
      g.add(barra([s * 0.86, 1.3, 1.5], [s * 0.72, 0.85, 1.46], 0.045, cinto, 0.006));
      g.add(peca(0.03, 0.06, 0.02, aluminio, s * 0.2, 0.52, 0.36));
    });

    // ==================================================================
    // ASSOALHO
    // ==================================================================
    const carpete = M.std('#ffffff', 1, 0, {
      map: makeCanvasTex(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#1b1d22';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = ['#23262c', '#15171b', '#202329', '#2a2d34'][i % 4];
          ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
      }, 6, 8)
    });
    g.add(box(1.86, 0.04, 2.72, carpete, 0, 0.28, 0.24));
    g.add(box(1.86, 0.5, 0.05, carpete, 0, 0.53, -1.07));
    const rampa = box(1.86, 0.04, 0.42, carpete, 0, 0.36, -0.9);
    rampa.rotation.x = 0.42;
    g.add(rampa);
    g.add(box(0.3, 0.1, 1.5, carpete, 0, 0.34, 0.2));
    // Tapetes de borracha com o nome
    const tapeteTex = tex(128, 160, (ctx, w, h) => {
      ctx.fillStyle = '#0d0e11';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1c1f25';
      ctx.lineWidth = 3;
      for (let y = 18; y < h - 30; y += 12) {
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.lineTo(w - 12, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#3b4250';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUBARU', w / 2, h - 10);
    });
    [-0.42, 0.42].forEach((x) => g.add(box(0.5, 0.012, 0.55, M.std('#ffffff', 0.9, 0, { map: tapeteTex }), x, 0.306, -0.5, { cast: false })));
    [-0.42, 0.42].forEach((x) => g.add(box(0.48, 0.012, 0.36, borracha, x, 0.306, 0.78, { cast: false })));
    // Pedais (embreagem, freio, acelerador) + descanso de pé
    [[-0.54, 0.07, 0.07], [-0.4, 0.08, 0.07], [-0.24, 0.05, 0.12]].forEach(([x, w, h]) => {
      const p = box(w, h, 0.018, M.std('#2b2e35', 0.4, 0.7), x, 0.42, -0.86);
      p.rotation.x = -0.45;
      g.add(p);
      g.add(peca(0.015, 0.2, 0.015, M.std('#1f2228', 0.5, 0.6), x, 0.55, -0.9));
    });
    const descanso = peca(0.08, 0.18, 0.02, M.std('#2b2e35', 0.5, 0.6), -0.72, 0.4, -0.84, -0.5);
    g.add(descanso);

    // ==================================================================
    // PORTAS (forro interno) E LATERAIS
    // ==================================================================
    const laterais = new THREE.Group();
    g.add(laterais);
    const altoFalante = M.std('#0a0b0e', 0.95);
    const formaPorta = (s, z0, z1, frente) => {
      const p = new THREE.Group();
      const zc = (z0 + z1) / 2;
      const len = z1 - z0;
      // Forro: parte de baixo, painel do meio e friso azul
      p.add(box(0.06, 0.22, len, M.std('#14161b', 0.8), s * 0.95, 0.39, zc));
      p.add(box(0.06, 0.45, len, M.std('#191b21', 0.85), s * 0.95, 0.72, zc));
      p.add(peca(0.05, 0.03, len - 0.06, pintura, s * 0.925, 0.955, zc));
      // Descansa-braço com maçaneta e botões do vidro
      p.add(box(0.09, 0.05, len * 0.55, couro, s * 0.9, 0.66, zc + 0.04, { cast: false }));
      p.add(peca(0.05, 0.012, 0.08, M.std('#1f2228', 0.5, 0.3), s * 0.9, 0.69, zc - 0.08));
      p.add(peca(0.018, 0.006, 0.02, M.std('#4b5563', 0.5), s * 0.9, 0.698, zc - 0.1));
      p.add(peca(0.018, 0.006, 0.02, M.std('#4b5563', 0.5), s * 0.9, 0.698, zc - 0.06));
      const macaneta = peca(0.02, 0.03, 0.12, cromado, s * 0.915, 0.82, z0 + 0.16);
      macaneta.userData.acao = 'porta';
      p.add(macaneta);
      p.add(peca(0.01, 0.06, 0.16, M.std('#0a0b0e', 0.9), s * 0.921, 0.82, z0 + 0.16));
      // Alto-falante redondo e bolso
      const af = cyl(0.07, 0.07, 0.012, altoFalante, s * 0.918, 0.47, frente ? z0 + 0.2 : zc, 20, { cast: false });
      af.rotation.z = Math.PI / 2;
      p.add(af);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 6, 24), aluminio);
      anel.rotation.y = Math.PI / 2;
      anel.position.set(s * 0.912, 0.47, frente ? z0 + 0.2 : zc);
      p.add(anel);
      p.add(peca(0.03, 0.08, len * 0.45, M.std('#121419', 0.9), s * 0.91, 0.41, frente ? zc + 0.12 : zc + 0.15));
      // Fresta da porta (linha escura)
      p.add(peca(0.062, 0.62, 0.008, M.std('#050608', 0.9), s * 0.95, 0.62, z1));
      p.traverse((m) => m.isMesh && !m.userData.acao && (m.userData.acao = 'porta'));
      p.userData.lado = s;
      laterais.add(p);
      return p;
    };
    [-1, 1].forEach((s) => {
      formaPorta(s, -0.5, 0.68, true);
      formaPorta(s, 0.7, 1.5, false);
      // Painéis fixos: colunas dos pés e lateral traseira
      laterais.add(box(0.06, 0.7, 0.36, plastico, s * 0.93, 0.62, -0.88));
      laterais.add(box(0.06, 0.62, 0.14, plastico, s * 0.93, 0.6, 1.56));
      laterais.add(box(0.1, 0.03, 1.7, plastico, s * 0.89, 0.31, 0.2, { cast: false }));
      // Soleira com o nome
      laterais.add(peca(0.06, 0.004, 0.5, aluminio, s * 0.89, 0.328, -0.2));
    });

    // ==================================================================
    // TETO, COLUNAS, VIDROS
    // ==================================================================
    const teto = new THREE.Group();
    g.add(teto);
    // Forro do teto inteiriço (o carro não tem teto solar)
    teto.add(box(1.9, 0.04, 2.03, forro, 0, 1.5, 0.555));
    teto.add(box(1.86, 0.07, 0.12, plastico, 0, 1.47, -0.47));
    // Luz de teto, console de teto e quebra-sóis
    teto.add(peca(0.2, 0.025, 0.1, grafite, 0, 1.47, -0.37));
    teto.add(peca(0.07, 0.012, 0.05, M.glow('#ffe7b0', 1.3), -0.05, 1.458, -0.37));
    teto.add(peca(0.07, 0.012, 0.05, M.glow('#ffe7b0', 1.3), 0.05, 1.458, -0.37));
    teto.add(peca(0.3, 0.02, 0.16, grafite, 0, 1.47, 0.62));
    teto.add(peca(0.12, 0.01, 0.07, M.glow('#ffe7b0', 1.1), 0, 1.457, 0.62));
    [-1, 1].forEach((s) => {
      const qs = new THREE.Group();
      qs.position.set(s * 0.42, 1.47, -0.42);
      qs.rotation.x = 0.12;
      qs.add(peca(0.4, 0.022, 0.17, forro, 0, -0.01, 0.07));
      qs.add(peca(0.12, 0.004, 0.06, M.std('#9fb1c9', 0.05, 0.9), s * 0.05, -0.022, 0.08));
      teto.add(qs);
      // Puxadores sobre as portas
      [0.2, 1.1].forEach((z) => teto.add(peca(0.03, 0.03, 0.18, grafite, s * 0.86, 1.43, z)));
    });

    // Colunas A, B, C e travessas
    [-1, 1].forEach((s) => {
      g.add(barra([s * 0.9, 1.0, -1.04], [s * 0.84, 1.49, -0.46], 0.08, plastico));
      g.add(barra([s * 0.93, 0.98, 0.72], [s * 0.88, 1.48, 0.62], 0.07, plastico));
      g.add(barra([s * 0.86, 0.9, 1.62], [s * 0.8, 1.48, 1.5], 0.16, plastico));
      teto.add(box(0.06, 0.05, 1.8, plastico, s * 0.95, 1.48, 0.2));
    });
    teto.add(box(1.9, 0.08, 0.1, plastico, 0, 1.47, 1.56));
    // Prateleira atrás do banco traseiro com alto-falantes e a luz de freio
    g.add(box(1.7, 0.03, 0.22, M.std('#16181d', 0.9), 0, 0.89, 1.62));
    [-0.55, 0.55].forEach((x) => g.add(peca(0.2, 0.006, 0.12, altoFalante, x, 0.907, 1.62)));
    g.add(peca(0.3, 0.03, 0.03, M.glow('#ff2d2d', 1.2), 0, 0.925, 1.7));

    // Vidros: para-brisa, traseiro e laterais (dá pra ver quem está dentro)
    const vidro = plane(1.8, 0.8, vidroMat(0.08), 0, 1.24, -0.76);
    vidro.rotation.x = 0.89;
    vidro.userData.noOutline = true;
    vidro.renderOrder = 2;
    g.add(vidro);
    const vidroTras = plane(1.6, 0.6, vidroMat(0.12, 0x8fa4c8), 0, 1.18, 1.57);
    vidroTras.rotation.x = 0.35;
    vidroTras.userData.noOutline = true;
    vidroTras.renderOrder = 2;
    g.add(vidroTras);
    const vidroLat = vidroMat(0.16, 0x5a6b85);
    [-1, 1].forEach((s) => {
      g.add(vidroLateral([[-0.98, 0.97], [0.66, 0.97], [0.62, 1.47], [-0.47, 1.47]], s * 0.965, vidroLat));
      g.add(vidroLateral([[0.74, 0.97], [1.58, 0.97], [1.47, 1.45], [0.7, 1.47]], s * 0.965, vidroLat));
    });

    // ==================================================================
    // CAPÔ, RETROVISORES EXTERNOS
    // ==================================================================
    const capo = box(1.98, 0.05, 1.55, pintura, 0, 0.96, -1.85);
    capo.rotation.x = -0.07;
    g.add(capo);
    const tomadaAr = box(0.5, 0.07, 0.4, pintura, 0, 1.0, -1.5);
    tomadaAr.rotation.x = -0.12;
    g.add(tomadaAr);
    g.add(peca(0.42, 0.04, 0.02, M.std('#050608', 0.9), 0, 1.01, -1.3));
    g.add(box(1.8, 0.05, 0.14, plastico, 0, 0.99, -1.06));
    // Limpadores parados na base do para-brisa
    [-0.45, 0.15].forEach((x) => g.add(peca(0.6, 0.012, 0.02, M.std('#0b0c0f', 0.7), x, 1.025, -1.1, 0, 0, 0.06)));
    [-1, 1].forEach((s) => {
      g.add(box(0.12, 0.05, 0.08, pintura, s * 0.98, 0.98, -0.66));
      g.add(box(0.2, 0.12, 0.09, pintura, s * 1.09, 1.03, -0.68));
      const espelhoExt = plane(0.17, 0.09, M.std('#9fb1c9', 0.05, 0.9), s * 1.09, 1.03, -0.633);
      espelhoExt.userData.noOutline = true;
      g.add(espelhoExt);
      // Pisca lateral no retrovisor
      g.add(peca(0.1, 0.015, 0.012, M.glow('#f59e0b', 1.1), s * 1.12, 1.0, -0.728));
    });

    // ==================================================================
    // RETROVISOR INTERNO (imagem real) + ÁRVORE DE BAUNILHA
    // ==================================================================
    const rt = new THREE.WebGLRenderTarget(320, 120);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.repeat.x = -1;
    rt.texture.offset.x = 1;
    const retro = new THREE.Group();
    retro.position.set(0.02, 1.37, -0.5);
    retro.rotation.y = 0.18;
    retro.add(box(0.27, 0.085, 0.03, plastico, 0, 0, 0));
    const espelho = plane(0.25, 0.07, o.estatico ? M.std('#1e293b', 0.05, 0.9) : new THREE.MeshBasicMaterial({ map: rt.texture }), 0, 0, 0.017);
    espelho.userData.acao = 'retrovisor';
    espelho.userData.noOutline = true;
    retro.add(espelho);
    retro.add(box(0.02, 0.07, 0.02, plastico, 0, 0.07, -0.02));
    retro.userData.acao = 'retrovisor';
    retro.visible = !o.estatico; // nas cenas de história a câmera fica onde está o retrovisor
    g.add(retro);
    const camRetro = new THREE.PerspectiveCamera(48, 320 / 120, 0.05, 60);
    camRetro.position.set(0, 1.25, -0.55);
    camRetro.lookAt(0, 1.0, 2.5);

    // Aromatizante de árvore (baunilha: o cheiro forte que todo mundo comenta)
    const aromatizante = new THREE.Group();
    aromatizante.position.set(0.02, 1.32, -0.49);
    aromatizante.add(cyl(0.0015, 0.0015, 0.12, M.std('#e5e7eb', 0.8), 0, -0.06, 0, 4, { cast: false }));
    const arvoreTex = tex(96, 140, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fde7b0';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 6);
      [[78, 46, 62, 46], [88, 86, 70, 86], [92, 118, 56, 118]].forEach(([x1, y1, x2, y2]) => {
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.lineTo(56, 134);
      ctx.lineTo(40, 134);
      [[40, 118, 4, 118], [26, 86, 8, 86], [34, 46, 18, 46]].forEach(([x1, y1, x2, y2]) => {
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VANILLA', w / 2, 104);
    });
    const arvore = plane(0.05, 0.073, M.basic('#ffffff', { map: arvoreTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }), 0, -0.155, 0);
    arvore.userData.noOutline = true;
    aromatizante.add(arvore);
    aromatizante.visible = !o.estatico; // nas cenas de história a câmera fica no lugar do retrovisor
    g.add(aromatizante);

    // Gato no banco de trás (se já foi visto na história)
    if ((root.LuiggiSave?.state?.gatosVistos || []).length > 0 && !o.semGato) {
      const gato = L().createCatMesh();
      gato.scale.setScalar(0.7);
      gato.position.set(-0.35, 0.5, 1.15);
      gato.rotation.y = Math.PI;
      g.add(gato);
    }

    // Luz azul dos instrumentos + luz de teto fraca
    // Luzes fracas e longe dos rostos (os bonecos 3D estouravam de brilho perto delas)
    const luzPainel = new THREE.PointLight('#5b8cff', 0.9, 2.2, 1.6);
    luzPainel.position.set(-0.1, 0.78, -0.45);
    g.add(luzPainel);
    const luzTeto = new THREE.PointLight('#ffd9a8', 0.7, 3, 1.4);
    luzTeto.position.set(0, 1.44, 0.62);
    g.add(luzTeto);
    const luzTras = new THREE.PointLight('#ffd9a8', 0.5, 2.4, 1.4);
    luzTras.position.set(0.2, 1.42, 1.0);
    g.add(luzTras);
    const h = halo('#3b82f6', 0.25, 0.5);
    h.position.set(-0.38, 0.99, -0.6);
    g.add(h);

    // ==================================================================
    // EXTERIOR (lataria fina que encaixa no interior)
    // ==================================================================
    let exterior = null;
    const rodas = [];
    if (o.exterior) {
      exterior = new THREE.Group();
      g.add(exterior);
      const preto = M.std('#0b0c10', 0.7, 0.2);
      const EIXO_D = -1.45;
      const EIXO_T = 1.25;
      // Laterais com recorte das caixas de roda
      [-1, 1].forEach((s) => {
        const lado = perfil(
          [
            [-2.5, 0.27],
            [-1.9, 0.27],
            [-1.87, 0.3],
            ['q', -1.86, 0.74, EIXO_D, 0.75],
            ['q', -1.04, 0.74, -1.03, 0.3],
            [-1.0, 0.25],
            [0.82, 0.25],
            [0.85, 0.3],
            ['q', 0.86, 0.74, EIXO_T, 0.75],
            ['q', 1.64, 0.74, 1.65, 0.3],
            [1.68, 0.27],
            [2.3, 0.27],
            ['q', 2.38, 0.55, 2.36, 0.85],
            ['q', 2.33, 0.98, 2.2, 0.985],
            [1.66, 0.985],
            [-1.05, 0.985],
            [-1.25, 0.975],
            [-2.48, 0.92],
            ['q', -2.64, 0.9, -2.64, 0.7],
            [-2.6, 0.4]
          ],
          0.045,
          pintura,
          s * 0.995
        );
        lado.userData.acao = 'entrar_carro';
        exterior.add(lado);
        // Frisos: saia preta, filete cromado na linha da cintura, frestas das portas, maçanetas
        exterior.add(peca(0.05, 0.06, 1.75, preto, s * 1.0, 0.28, -0.08));
        exterior.add(peca(0.012, 0.012, 2.6, cromado, s * 1.02, 0.985, 0.3));
        [-1.0, 0.69, 1.55].forEach((z) => exterior.add(peca(0.05, 0.68, 0.006, M.std('#050608', 0.9), s * 1.02, 0.63, z)));
        [-0.25, 1.0].forEach((z) => {
          const mac = peca(0.03, 0.03, 0.14, cromado, s * 1.03, 0.84, z);
          mac.userData.acao = 'entrar_carro';
          exterior.add(mac);
        });
        // Colunas pintadas por fora, coluna B preta
        exterior.add(barra([s * 0.95, 0.99, -1.07], [s * 0.88, 1.53, -0.47], 0.075, pintura));
        exterior.add(barra([s * 0.98, 0.99, 0.69], [s * 0.92, 1.52, 0.63], 0.09, preto, 0.1));
        exterior.add(barra([s * 0.95, 0.99, 1.7], [s * 0.88, 1.52, 1.47], 0.07, pintura, 0.24));
        exterior.add(box(0.07, 0.05, 1.98, pintura, s * 0.925, 1.515, 0.5, { cast: false }));
        exterior.add(peca(0.012, 0.012, 1.9, cromado, s * 0.96, 1.48, 0.5));
        // Caixa de roda por dentro (escura) pra não ver o interior pela fresta
        [EIXO_D, EIXO_T].forEach((z) => {
          const cx = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18, 1, true, 0, Math.PI), M.std('#08090b', 0.95, 0, { side: THREE.DoubleSide }));
          cx.rotation.set(0, 0, Math.PI / 2); // eixo em x, metade de cima
          cx.position.set(s * 0.84, 0.32, z);
          exterior.add(cx);
        });
      });
      // Teto por fora, inteiriço
      exterior.add(box(1.86, 0.035, 1.96, pintura, 0, 1.535, 0.51));
      // Frente: para-choque, grade com emblema, faróis, neblina
      exterior.add(box(2.0, 0.42, 0.12, pintura, 0, 0.5, -2.58));
      exterior.add(box(1.96, 0.24, 0.04, pintura, 0, 0.8, -2.6));
      exterior.add(box(2.02, 0.1, 0.22, preto, 0, 0.26, -2.5));
      exterior.add(peca(1.0, 0.1, 0.03, preto, 0, 0.42, -2.645));
      exterior.add(peca(0.92, 0.17, 0.03, preto, 0, 0.74, -2.62));
      for (let i = 0; i < 3; i++) exterior.add(peca(0.9, 0.012, 0.02, cromado, 0, 0.68 + i * 0.05, -2.64));
      const emblema = plane(0.16, 0.1, M.basic('#ffffff', { map: logoTex }), 0, 0.74, -2.645);
      emblema.rotation.y = Math.PI;
      emblema.userData.noOutline = true;
      exterior.add(emblema);
      const farol = M.glow('#fff7d6', 2.6);
      [-1, 1].forEach((s) => {
        const f = peca(0.46, 0.13, 0.05, farol, s * 0.68, 0.76, -2.6, 0, s * 0.12);
        exterior.add(f);
        exterior.add(peca(0.48, 0.15, 0.04, cromado, s * 0.68, 0.76, -2.585, 0, s * 0.12));
        exterior.add(peca(0.14, 0.04, 0.03, M.glow('#f59e0b', 1.6), s * 0.82, 0.68, -2.62));
        const neb = cyl(0.045, 0.045, 0.03, M.glow('#fff7d6', 1.6), s * 0.7, 0.4, -2.645, 14, { cast: false });
        neb.rotation.x = Math.PI / 2;
        exterior.add(neb);
        const hf = halo('#fff4c2', 0.5, 0.7);
        hf.position.set(s * 0.68, 0.76, -2.68);
        exterior.add(hf);
      });
      // Traseira: tampa do porta-malas, aerofólio, lanternas, placa, escapamento duplo
      const portaMalas = box(1.96, 0.05, 0.66, pintura, 0, 0.98, 1.97);
      portaMalas.rotation.x = 0.04;
      exterior.add(portaMalas);
      exterior.add(box(2.0, 0.6, 0.1, pintura, 0, 0.66, 2.31));
      exterior.add(box(2.02, 0.12, 0.2, preto, 0, 0.29, 2.28));
      [-0.62, 0.62].forEach((x) => exterior.add(box(0.06, 0.12, 0.1, preto, x, 1.06, 2.15)));
      const asa = box(1.62, 0.04, 0.26, pintura, 0, 1.13, 2.17);
      asa.rotation.x = -0.08;
      exterior.add(asa);
      exterior.add(peca(0.4, 0.015, 0.02, M.glow('#ff2d2d', 1.6), 0, 1.15, 2.3));
      const lanterna = M.glow('#ff2d2d', 2.0);
      [-1, 1].forEach((s) => {
        exterior.add(peca(0.5, 0.15, 0.04, lanterna, s * 0.7, 0.82, 2.36));
        exterior.add(peca(0.14, 0.15, 0.042, M.glow('#f8fafc', 0.9), s * 0.38, 0.82, 2.36));
        const ht = halo('#ff3030', 0.32, 0.7);
        ht.position.set(s * 0.7, 0.82, 2.4);
        exterior.add(ht);
        const esc = cyl(0.045, 0.045, 0.12, cromado, s * 0.55, 0.26, 2.36, 14, { cast: false });
        esc.rotation.x = Math.PI / 2;
        exterior.add(esc);
        exterior.add(cyl(0.035, 0.035, 0.125, M.std('#050505', 0.9), s * 0.55, 0.26, 2.36, 12, { cast: false }).rotateX(Math.PI / 2));
      });
      const placaTex = textures.text('LUI-6G1B', { w: 256, h: 80, size: 46, color: '#111827', bg: '#f1f5f9', radius: 8 });
      const placa = plane(0.42, 0.13, M.basic('#ffffff', { map: placaTex }), 0, 0.56, 2.365);
      placa.userData.noOutline = true;
      exterior.add(placa);
      const placaF = plane(0.42, 0.13, M.basic('#ffffff', { map: placaTex }), 0, 0.42, -2.665);
      placaF.rotation.y = Math.PI;
      placaF.userData.noOutline = true;
      exterior.add(placaF);
      // Assoalho por baixo
      exterior.add(box(1.4, 0.05, 4.6, M.std('#0a0b0d', 0.9), 0, 0.24, -0.15, { cast: false }));
      // Rodas douradas (clássico Subaru)
      const pneu = M.std('#111111', 0.9);
      const aroMat = M.std('#C5A059', 0.25, 0.9);
      const disco = M.std('#6b7280', 0.4, 0.8);
      const geoPneu = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 28).rotateZ(Math.PI / 2);
      const geoAro = new THREE.CylinderGeometry(0.22, 0.22, 0.225, 24).rotateZ(Math.PI / 2);
      const geoRaio = new THREE.BoxGeometry(0.03, 0.035, 0.4);
      [[-1, EIXO_D], [1, EIXO_D], [-1, EIXO_T], [1, EIXO_T]].forEach(([s, z]) => {
        const r = new THREE.Group();
        r.position.set(s * 0.85, 0.33, z);
        const p = new THREE.Mesh(geoPneu, pneu);
        p.castShadow = true;
        r.add(p);
        r.add(new THREE.Mesh(geoAro, aroMat));
        for (let i = 0; i < 10; i++) {
          const rr = new THREE.Mesh(geoRaio, aroMat);
          rr.rotation.x = (i / 10) * Math.PI;
          rr.position.x = s * 0.1;
          r.add(rr);
        }
        r.add(cyl(0.05, 0.05, 0.23, cromado, s * 0.01, 0, 0, 12, { cast: false }).rotateZ(Math.PI / 2));
        r.add(cyl(0.17, 0.17, 0.02, disco, -s * 0.04, 0, 0, 20, { cast: false }).rotateZ(Math.PI / 2));
        exterior.add(r);
        rodas.push(r);
      });
      exterior.traverse((m) => {
        if (m.isMesh && !m.userData.acao) m.userData.acao = 'entrar_carro';
      });
    }

    return { group: g, volante, gauges, radioTex, portaLuvas, camisinhas, consoleTampa, retro, rt, camRetro, botoesRadio, aromatizante, chaveiro, teto, exterior, laterais, rodas, bancosFrente };
  }

  root.LuiggiSubaruLegacy = { construir, ASSENTOS, CAIXA };
})(window);
