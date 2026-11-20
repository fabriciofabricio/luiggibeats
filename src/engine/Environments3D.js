/**
 * src/engine/Environments3D.js
 * Biblioteca de cenários 3D procedurais do LuiggiBeats.
 *
 * Luiggi3DEnv.build(nome, opts) -> {
 *   nome, group, update(dt, t), slots: { L, R, C } (posições [x,y,z] dos personagens),
 *   cam: { pos, look } (enquadramento base), luz: {...}, bg, fog, grade,
 *   oculta: altura (y) do balcão/mesa que esconde a cintura dos sprites de meio corpo (opcional)
 * }
 * Luiggi3DEnv.aplicar(stage, env) configura fundo, neblina, luzes e correção de cor do palco.
 */
(function (root) {
  'use strict';

  const T = () => root.THREE;
  const L = () => root.Luiggi3D;

  // ------------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------------
  function luz(color, intensity, distance = 10, decay = 1.4) {
    const l = new (T().PointLight)(color, intensity, distance, decay);
    return l;
  }

  function instanced(geo, mat, transforms, o = {}) {
    const THREE = T();
    const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    transforms.forEach((t, i) => {
      p.set(t[0], t[1], t[2]);
      e.set(t[3] || 0, t[4] || 0, t[5] || 0);
      q.setFromEuler(e);
      s.set(t[6] ?? 1, t[7] ?? t[6] ?? 1, t[8] ?? t[6] ?? 1);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (t.cor) mesh.setColorAt(i, new THREE.Color(t.cor));
    });
    mesh.castShadow = o.cast ?? true;
    mesh.receiveShadow = o.receive ?? true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  /** Caixa de sala aberta para a câmera (+z). */
  function sala(g, o) {
    const { box, plane, M } = L();
    const THREE = T();
    const w = o.w || 14;
    const d = o.d || 10;
    const h = o.h || 4.2;
    const z0 = o.z0 ?? -4.5;
    const piso = plane(w, d + 8, o.piso || M.std('#555', 0.8), 0, 0, z0 + (d + 8) / 2);
    piso.rotation.x = -Math.PI / 2;
    g.add(piso);
    const fundo = plane(w, h, o.parede || M.std('#888', 0.9), 0, h / 2, z0);
    g.add(fundo);
    if (o.laterais !== false) {
      [-1, 1].forEach((s) => {
        const lat = plane(d + 4, h, o.paredeLateral || o.parede || M.std('#888', 0.9), (s * w) / 2, h / 2, z0 + (d + 4) / 2);
        lat.rotation.y = -s * Math.PI / 2;
        g.add(lat);
      });
    }
    if (o.teto !== false) {
      const teto = plane(w, d + 8, o.tetoMat || M.std('#d4d4d4', 0.95), 0, h, z0 + (d + 8) / 2);
      teto.rotation.x = Math.PI / 2;
      g.add(teto);
    }
    if (o.rodape) g.add(box(w, 0.14, 0.04, M.std(o.rodape, 0.6), 0, 0.07, z0 + 0.02, { cast: false }));
    return { w, d, h, z0 };
  }

  function ceu(g, stops, raio = 120) {
    const THREE = T();
    const tex = L().textures.gradient(stops, 4, 512);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.userData.noOutline = true;
    g.add(m);
    return m;
  }

  function estrelas(g, n = 500, raio = 100, cor = '#ffffff', ymin = 0.05) {
    const THREE = T();
    const pos = [];
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const y = ymin + Math.random() * (1 - ymin);
      const r = Math.sqrt(1 - y * y);
      pos.push(Math.cos(th) * r * raio, y * raio, Math.sin(th) * r * raio);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: new THREE.Color(cor).multiplyScalar(1.6), size: 0.6, sizeAttenuation: true, map: L().textures.sprite('soft'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    );
    g.add(pts);
    return pts;
  }

  /** Skyline com janelas acesas (prédios instanciados por textura). */
  function cidade(g, o = {}) {
    const THREE = T();
    const { M, textures } = L();
    const n = o.n || 40;
    const texs = [0, 1, 2].map(() => textures.windows({ lit: o.lit ?? 0.35, cols: 4, rows: 12 }));
    const grupos = texs.map(() => []);
    for (let i = 0; i < n; i++) {
      const w = 2 + Math.random() * 4;
      const h = (o.hMin || 6) + Math.random() * (o.hMax || 22);
      let x;
      let z;
      if (o.linha) {
        x = o.linha[0] + (i / n) * (o.linha[1] - o.linha[0]) + (Math.random() - 0.5) * 2;
        z = o.z + (Math.random() - 0.5) * (o.prof || 6);
      } else {
        const a = (o.a0 ?? -Math.PI * 0.95) + (i / n) * ((o.a1 ?? -Math.PI * 0.05) - (o.a0 ?? -Math.PI * 0.95));
        const r = (o.raio || 60) + Math.random() * 25;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      grupos[i % 3].push({ x, z, w, h, d: w * (0.7 + Math.random() * 0.5) });
    }
    grupos.forEach((lista, k) => {
      const tex = texs[k];
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.cor || '#ffffff').multiplyScalar(o.brilho ?? 1.3), fog: o.fog ?? true });
      lista.forEach((b) => {
        const t = tex.clone();
        t.needsUpdate = true;
        t.repeat.set(Math.max(1, Math.round(b.w / 2)), Math.max(1, Math.round(b.h / 6)));
        const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat.clone());
        m.material.map = t;
        m.position.set(b.x, b.h / 2 + (o.y || 0), b.z);
        m.userData.noOutline = true;
        g.add(m);
      });
    });
  }

  function poste(g, x, z, cor = '#ffb35c', o = {}) {
    const { cyl, box, M, halo, lightCone } = L();
    const alt = o.altura || 5;
    const metal = M.std('#2d3340', 0.6, 0.6);
    g.add(cyl(0.07, 0.1, alt, metal, x, alt / 2, z, 8));
    const braco = box(1.1, 0.08, 0.08, metal, x + (o.lado || 1) * 0.5, alt, z);
    g.add(braco);
    const lx = x + (o.lado || 1) * 1.0;
    g.add(box(0.4, 0.1, 0.22, M.glow(cor, 3), lx, alt - 0.06, z, { cast: false }));
    const h = halo(cor, 1.6, 1.1);
    h.position.set(lx, alt - 0.15, z);
    g.add(h);
    const cone = lightCone(cor, 1.8, alt - 0.1, o.cone ?? 0.045);
    cone.position.set(lx, alt - 0.1, z);
    g.add(cone);
    if (o.luz !== false) {
      const l = luz(cor, o.intensidade || 14, o.alcance || 11, 1.3);
      l.position.set(lx, alt - 0.4, z);
      g.add(l);
    }
    return { x: lx, y: alt };
  }

  function lampadaPendente(g, x, y, z, cor = '#ffcf8a', o = {}) {
    const { cyl, M, halo, sphere } = L();
    const THREE = T();
    g.add(cyl(0.008, 0.008, o.fio || 1.2, M.basic('#111'), x, y + (o.fio || 1.2) / 2, z, 4, { cast: false }));
    if (o.cupula !== false) {
      const shade = new THREE.Mesh(new THREE.ConeGeometry(o.raio || 0.32, 0.3, 20, 1, true), M.std(o.corCupula || '#1f2937', 0.5, 0.4, { side: THREE.DoubleSide }));
      shade.position.set(x, y + 0.05, z);
      g.add(shade);
    }
    g.add(sphere(0.07, M.glow(cor, 4), x, y - 0.06, z, 10));
    const h = halo(cor, o.halo || 1.1, 1.0);
    h.position.set(x, y - 0.08, z);
    g.add(h);
    if (o.luz !== false) {
      const l = luz(cor, o.intensidade || 7, o.alcance || 7, 1.4);
      l.position.set(x, y - 0.25, z);
      g.add(l);
      return l;
    }
    return null;
  }

  /** Multidão de silhuetas instanciadas com balanço (barata). */
  function multidao(g, n, area, cores, o = {}) {
    const THREE = T();
    const corpoGeo = new THREE.CapsuleGeometry(0.22, 0.75, 4, 8);
    const cabGeo = new THREE.SphereGeometry(0.2, 10, 8);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0xffffff });
    const corpos = new THREE.InstancedMesh(corpoGeo, mat, n);
    const cabecas = new THREE.InstancedMesh(cabGeo, mat, n);
    const dados = [];
    for (let i = 0; i < n; i++) {
      dados.push({
        x: area[0] + Math.random() * (area[1] - area[0]),
        z: area[2] + Math.random() * (area[3] - area[2]),
        f: 4 + Math.random() * 3,
        ph: Math.random() * 6,
        s: 0.9 + Math.random() * 0.25
      });
      const c = new THREE.Color(L().U.pick(cores));
      corpos.setColorAt(i, c);
      cabecas.setColorAt(i, new THREE.Color(o.corCabeca || '#1a1412').lerp(c, 0.2));
    }
    corpos.castShadow = o.sombra ?? false;
    g.add(corpos);
    g.add(cabecas);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    function update(t, energia = 1) {
      dados.forEach((d, i) => {
        const b = Math.abs(Math.sin(t * d.f * 0.5 * energia + d.ph)) * 0.12 * energia;
        s.setScalar(d.s);
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * d.f * 0.25 + d.ph) * 0.08 * energia);
        p.set(d.x, 0.6 * d.s + b, d.z);
        m.compose(p, q, s);
        corpos.setMatrixAt(i, m);
        p.set(d.x + Math.sin(t * d.f * 0.25 + d.ph) * 0.05, 1.32 * d.s + b, d.z);
        m.compose(p, q, s);
        cabecas.setMatrixAt(i, m);
      });
      corpos.instanceMatrix.needsUpdate = true;
      cabecas.instanceMatrix.needsUpdate = true;
    }
    update(0);
    return { update, dados };
  }

  /** Feixes de holofote giratórios (balada / baile). */
  function holofotes(g, n, cores, y = 4.2, area = 5) {
    const THREE = T();
    const lista = [];
    for (let i = 0; i < n; i++) {
      const piv = new THREE.Group();
      piv.position.set(-area + (i / Math.max(1, n - 1)) * area * 2, y, -2.5);
      const cone = L().lightCone(cores[i % cores.length], 0.9, 7, 0.22);
      piv.add(cone);
      g.add(piv);
      lista.push({ piv, ph: i * 1.3, vel: 0.6 + Math.random() * 0.6 });
    }
    return (t) => lista.forEach((h) => {
      h.piv.rotation.z = Math.sin(t * h.vel + h.ph) * 0.7;
      h.piv.rotation.x = Math.cos(t * h.vel * 0.8 + h.ph) * 0.45 + 0.2;
    });
  }

  function mesaComCadeiras(g, x, z, o = {}) {
    const { box, cyl, M } = L();
    const tampo = o.tampo || M.std('#7c4a24', 0.5);
    const perna = M.std('#1f2937', 0.5, 0.6);
    if (o.redonda) {
      g.add(cyl(0.55, 0.55, 0.05, tampo, x, 0.76, z, 24));
      g.add(cyl(0.05, 0.05, 0.74, perna, x, 0.37, z, 8));
      g.add(cyl(0.3, 0.3, 0.03, perna, x, 0.015, z, 16));
    } else {
      g.add(box(1.2, 0.05, 0.8, tampo, x, 0.76, z));
      [
        [-0.55, -0.35],
        [0.55, -0.35],
        [-0.55, 0.35],
        [0.55, 0.35]
      ].forEach(([dx, dz]) => g.add(box(0.05, 0.74, 0.05, perna, x + dx, 0.37, z + dz)));
    }
    const corC = o.cadeira || M.std('#334155', 0.6);
    [-1, 1].forEach((s) => {
      g.add(box(0.42, 0.05, 0.42, corC, x + s * 0.85, 0.46, z));
      g.add(box(0.05, 0.5, 0.42, corC, x + s * 1.05, 0.7, z));
      [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18]
      ].forEach(([dx, dz]) => g.add(box(0.035, 0.45, 0.035, perna, x + s * 0.85 + dx, 0.225, z + dz, { cast: false })));
    });
  }

  function janela(g, x, y, z, w, h, o = {}) {
    const { box, plane, M } = L();
    const THREE = T();
    const moldura = M.std(o.moldura || '#3b2a20', 0.6);
    const vista = o.vista || M.basic('#0b1430');
    const grp = new THREE.Group();
    const p = plane(w, h, vista, 0, 0, -0.02);
    p.userData.noOutline = true;
    grp.add(p);
    const t = 0.08;
    grp.add(box(w + t, t, 0.1, moldura, 0, h / 2, 0));
    grp.add(box(w + t, t, 0.1, moldura, 0, -h / 2, 0));
    grp.add(box(t, h, 0.1, moldura, -w / 2, 0, 0));
    grp.add(box(t, h, 0.1, moldura, w / 2, 0, 0));
    grp.add(box(t * 0.6, h, 0.06, moldura, 0, 0, 0));
    grp.add(box(w, t * 0.6, 0.06, moldura, 0, 0, 0));
    grp.position.set(x, y, z);
    grp.rotation.y = o.rotY || 0;
    g.add(grp);
    return grp;
  }

  function vistaNoturna(lit = 0.3, ceuTop = '#060a1c', ceuBase = '#1c2550') {
    // Textura de janela: céu noturno + prédios iluminados
    return L().makeCanvasTex(512, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, ceuTop);
      g.addColorStop(1, ceuBase);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`;
        ctx.fillRect(Math.random() * w, Math.random() * h * 0.5, 2, 2);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, 26, 0, Math.PI * 2);
      ctx.fill();
      let x = 0;
      while (x < w) {
        const bw = 30 + Math.random() * 60;
        const bh = h * (0.25 + Math.random() * 0.4);
        ctx.fillStyle = '#0a0d1a';
        ctx.fillRect(x, h - bh, bw, bh);
        for (let yy = h - bh + 8; yy < h - 6; yy += 14)
          for (let xx = x + 5; xx < x + bw - 6; xx += 11)
            if (Math.random() < lit) {
              ctx.fillStyle = L().U.pick(['#fde68a', '#fcd34d', '#fef3c7', '#93c5fd']);
              ctx.fillRect(xx, yy, 5, 7);
            }
        x += bw + 4;
      }
    });
  }

  function vistaAmanhecer() {
    return L().makeCanvasTex(512, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3b4b8a');
      g.addColorStop(0.45, '#f59e8b');
      g.addColorStop(0.75, '#fcd9a0');
      g.addColorStop(1, '#fde7c2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,240,200,0.9)';
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.78, 40, 0, Math.PI * 2);
      ctx.fill();
      let x = 0;
      while (x < w) {
        const bw = 30 + Math.random() * 60;
        const bh = h * (0.18 + Math.random() * 0.3);
        ctx.fillStyle = '#4b3a5c';
        ctx.fillRect(x, h - bh, bw, bh);
        x += bw + 4;
      }
    });
  }

  // ------------------------------------------------------------------
  // CENÁRIOS
  // ------------------------------------------------------------------
  const BUILDERS = {};

  // ---------- COZINHA DO LUIS (Prólogo / Cap. 15) ----------
  BUILDERS.cozinha = (o = {}) => {
    const THREE = T();
    const { box, cyl, plane, M, textures, createCookieMesh, createParticles, halo } = L();
    const g = new THREE.Group();
    const amanhecer = !!o.amanhecer;
    sala(g, {
      w: 12,
      d: 9,
      h: 3.6,
      piso: M.std('#ffffff', 0.55, 0, { map: textures.checker('#e7e2d8', '#2b2f3a', 8, 8, 2) }),
      parede: M.std('#ffffff', 0.85, 0, { map: textures.tiles('#e9e4da', '#b9b2a6', 6, 2, 4) }),
      paredeLateral: M.std('#c9a27a', 0.9),
      rodape: '#3b2a20'
    });
    // Bancada do fundo
    const madeira = M.std('#5b3a22', 0.55, 0, { map: textures.wood('#6b4426', 2, 1) });
    const tampo = M.std('#1f2329', 0.25, 0.1);
    g.add(box(9, 0.9, 0.65, madeira, 0.5, 0.45, -4.1));
    g.add(box(9.1, 0.05, 0.7, tampo, 0.5, 0.92, -4.1));
    g.add(box(3.6, 0.8, 0.4, madeira, -1.3, 2.6, -4.28));
    for (let i = 0; i < 4; i++) g.add(box(0.03, 0.75, 0.02, M.std('#2a1a10', 0.6), -2.85 + i * 1.0, 2.6, -4.07, { cast: false }));
    // Forno com brilho
    const forno = new THREE.Group();
    forno.position.set(-3.2, 0, -4.05);
    forno.add(box(1.0, 0.9, 0.7, M.std('#c0c4cc', 0.3, 0.8), 0, 0.45, 0));
    const vidro = box(0.7, 0.42, 0.02, M.glow('#ff7a1a', amanhecer ? 0.6 : 2.2), 0, 0.45, 0.36, { cast: false });
    forno.add(vidro);
    forno.add(box(0.8, 0.05, 0.05, M.std('#e5e7eb', 0.2, 1), 0, 0.76, 0.38));
    g.add(forno);
    const luzForno = luz('#ff8a2a', amanhecer ? 1.5 : 6, 6, 1.6);
    luzForno.position.set(-3.2, 0.6, -3.3);
    g.add(luzForno);
    // Geladeira
    g.add(box(1.0, 2.1, 0.8, M.std('#d1d5db', 0.3, 0.6), 5.2, 1.05, -3.9));
    g.add(box(0.04, 0.7, 0.05, M.std('#9ca3af', 0.2, 1), 4.8, 1.3, -3.48));
    // Janela
    const vista = amanhecer ? vistaAmanhecer() : vistaNoturna(0.35);
    janela(g, 2.3, 2.15, -4.42, 2.2, 1.3, { vista: M.basic('#ffffff', { map: vista }) });
    // Ilha central (esconde a cintura dos sprites)
    g.add(box(6.4, 0.95, 1.0, madeira, 0, 0.475, 1.25));
    g.add(box(6.6, 0.06, 1.15, M.std('#f3f4f6', 0.18, 0.05), 0, 0.98, 1.25));
    // Cookies, tigela, saco de farinha, rolo
    for (let i = 0; i < 5; i++) {
      const ck = createCookieMesh('#d69249', '#3b1f10', { gotas: 6 });
      ck.scale.setScalar(0.11);
      ck.position.set(-2.4 + i * 0.32, 1.04, 1.45 + (i % 2) * 0.12);
      g.add(ck);
    }
    g.add(box(1.3, 0.03, 0.55, M.std('#9aa3b2', 0.25, 0.8), -1.75, 1.02, 1.45));
    const tigela = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.std('#f8fafc', 0.2, 0, { side: THREE.DoubleSide }));
    tigela.position.set(1.6, 1.3, 1.3);
    g.add(tigela);
    g.add(cyl(0.25, 0.25, 0.02, M.std('#e9cc9a', 0.9), 1.6, 1.12, 1.3, 20));
    g.add(box(0.35, 0.5, 0.22, M.std('#f5f0e1', 0.95), 2.6, 1.25, 1.1));
    g.add(plane(0.3, 0.16, M.basic('#ffffff', { map: textures.text('FARINHA', { w: 256, h: 128, size: 52, color: '#7c2d12' }), transparent: true }), 2.6, 1.3, 1.215));
    const rolo = cyl(0.05, 0.05, 0.6, M.std('#c08a55', 0.6), 0.6, 1.06, 1.5, 12);
    rolo.rotation.z = Math.PI / 2;
    g.add(rolo);
    // Luminárias pendentes
    lampadaPendente(g, -1.6, 2.6, 1.0, '#ffd08a', { intensidade: amanhecer ? 3 : 9, fio: 1.0, halo: 0.6 });
    lampadaPendente(g, 1.6, 2.6, 1.0, '#ffd08a', { intensidade: amanhecer ? 3 : 9, fio: 1.0, halo: 0.6 });
    // Farinha no ar
    const farinha = createParticles({ count: 140, size: 0.035, color: '#fff7e6', intensity: 1.1, ambient: { center: [0, 1.8, 0.5], size: [7, 2.4, 3], vel: [[-0.05, -0.04, -0.05], [0.05, 0.05, 0.05]] }, life: [4, 8], additive: true });
    g.add(farinha.points);

    return {
      group: g,
      slots: { L: [-1.45, 0, 0.35], R: [1.45, 0, 0.35], C: [0, 0, 0.35] },
      cam: { pos: [0, 1.75, 6.1], look: [0, 1.55, 0] },
      oculta: 1.0,
      bg: amanhecer ? 0xf3c9a5 : 0x120e0c,
      fog: [amanhecer ? 0xd9a88a : 0x140f0c, 0.03],
      luz: amanhecer
        ? { sky: '#ffd9b0', ground: '#6b4a3a', hemi: 1.3, key: '#ffcf9a', keyI: 2.4, keyPos: [6, 8, -6] }
        : { sky: '#4a5a8a', ground: '#2a1a10', hemi: 0.45, key: '#9fb4ff', keyI: 0.5, keyPos: [4, 9, -8] },
      grade: amanhecer ? { tint: [1.04, 0.98, 0.92], saturation: 1.1, bloom: 0.6 } : { tint: [1.06, 0.97, 0.88], saturation: 1.12, bloom: 0.8 },
      update(dt, t) {
        farinha.update(dt);
        luzForno.intensity = (amanhecer ? 1.5 : 6) * (0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04);
      }
    };
  };

  // ---------- SALA DE AULA (Cap. 1) ----------
  BUILDERS.sala_aula = (o = {}) => {
    const THREE = T();
    const { box, plane, M, textures, createParticles, lightCone } = L();
    const g = new THREE.Group();
    sala(g, {
      w: 14,
      d: 10,
      h: 3.8,
      piso: M.std('#ffffff', 0.6, 0, { map: textures.parquet(6, 6) }),
      parede: M.std('#efe6d2', 0.9),
      paredeLateral: M.std('#e8dcc2', 0.9),
      rodape: '#4b5563'
    });
    // Quadro verde
    const quadro = plane(5.2, 1.9, M.std('#ffffff', 0.85, 0, { map: textures.chalkboard(o.quadro || ['CÁLCULO: f(x) = x²', 'Fundão = sede dos nerds', 'Prova sexta-feira!']) }), -0.8, 2.0, -4.48);
    g.add(quadro);
    g.add(box(5.4, 0.1, 0.12, M.std('#78350f', 0.6), -0.8, 1.0, -4.42));
    g.add(box(5.4, 2.1, 0.06, M.std('#5b3a1a', 0.6), -0.8, 2.0, -4.52));
    // Relógio
    const rel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), M.std('#f8fafc', 0.4));
    rel.rotation.x = Math.PI / 2;
    rel.position.set(3.6, 2.9, -4.45);
    g.add(rel);
    // Janelas na lateral esquerda com sol dourado
    for (let i = 0; i < 3; i++) {
      const jz = -3 + i * 2.6;
      janela(g, -6.95, 2.1, jz, 1.8, 1.5, { vista: M.glow('#ffd59a', 1.6), moldura: '#e5e7eb', rotY: Math.PI / 2 });
      const raio = lightCone('#ffcf87', 1.6, 7.5, 0.07);
      raio.position.set(-6.8, 2.6, jz);
      raio.rotation.z = -1.0;
      g.add(raio);
    }
    // Carteiras em fileiras (instanciadas)
    const tampoGeo = new THREE.BoxGeometry(0.9, 0.04, 0.6);
    const pernaGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
    const assentoGeo = new THREE.BoxGeometry(0.45, 0.04, 0.42);
    const tampos = [];
    const pernas = [];
    const assentos = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++) {
        const x = -4.6 + c * 2.2;
        const z = -2.3 + r * 1.6;
        if (Math.abs(x) < 2.6 && z > -1) continue;
        tampos.push([x, 0.74, z]);
        [
          [-0.4, -0.26],
          [0.4, -0.26],
          [-0.4, 0.26],
          [0.4, 0.26]
        ].forEach(([dx, dz]) => pernas.push([x + dx, 0.36, z + dz]));
        assentos.push([x, 0.45, z + 0.55]);
      }
    g.add(instanced(tampoGeo, M.std('#c8a27a', 0.6), tampos));
    g.add(instanced(pernaGeo, M.std('#374151', 0.5, 0.6), pernas));
    g.add(instanced(assentoGeo, M.std('#2563eb', 0.6), assentos));
    // Mesa do professor
    g.add(box(1.8, 0.8, 0.8, M.std('#6b4426', 0.6), 2.9, 0.4, -3.4));
    // Mochilas e violão do Tiago (easter egg)
    g.add(box(0.35, 0.45, 0.2, M.std('#1d4ed8', 0.8), -3.9, 0.22, -0.4));
    const violao = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), M.std('#b45309', 0.4));
    violao.scale.set(1, 1.3, 0.35);
    violao.position.set(4.9, 0.4, -1.2);
    g.add(violao);
    g.add(box(0.07, 0.9, 0.04, M.std('#3f2a1a', 0.5), 4.9, 1.0, -1.2));
    // Cartazes
    g.add(plane(0.8, 1.1, M.std('#ffffff', 0.9, 0, { map: textures.poster('FEIRA DE CIÊNCIAS', '2019', ['#16a34a', '#0ea5e9']) }), 4.6, 2.1, -4.47));
    // Poeira dourada no ar
    const poeira = createParticles({ count: 180, size: 0.04, color: '#ffe2a8', intensity: 1.6, ambient: { center: [-2, 2, -0.5], size: [9, 3, 7], vel: [[-0.04, -0.02, -0.04], [0.06, 0.04, 0.04]] }, life: [5, 9] });
    g.add(poeira.points);

    return {
      group: g,
      slots: { L: [-1.5, 0, 0.6], R: [1.5, 0, 0.6], C: [0, 0, 0.6] },
      cam: { pos: [0, 1.7, 6.2], look: [0, 1.55, 0] },
      bg: 0x2a1d10,
      fog: [0x3a2a18, 0.02],
      luz: { sky: '#ffe7c2', ground: '#6b4a2a', hemi: 1.05, key: '#ffc27a', keyI: 3.0, keyPos: [-14, 9, 2] },
      grade: { tint: [1.08, 0.98, 0.84], saturation: 1.12, lift: [0.03, 0.015, 0], bloom: 0.75 },
      update(dt) {
        poeira.update(dt);
      }
    };
  };

  // ---------- CORREDOR (Cap. 3 / Armário) ----------
  BUILDERS.corredor = () => {
    const THREE = T();
    const { box, plane, M, textures, halo } = L();
    const g = new THREE.Group();
    const piso = plane(6, 40, M.std('#ffffff', 0.25, 0.1, { map: textures.checker('#cbd5e1', '#94a3b8', 3, 20, 2) }), 0, 0, -12);
    piso.rotation.x = -Math.PI / 2;
    g.add(piso);
    const teto = plane(6, 40, M.std('#e5e7eb', 0.9), 0, 3.2, -12);
    teto.rotation.x = Math.PI / 2;
    g.add(teto);
    [-1, 1].forEach((s) => {
      const parede = plane(40, 3.2, M.std('#e8e1d4', 0.9), s * 3, 1.6, -12);
      parede.rotation.y = -s * Math.PI / 2;
      g.add(parede);
    });
    g.add(plane(6, 3.2, M.std('#cbd5e1', 0.9), 0, 1.6, -31));
    // Armários
    const ventTex = L().makeCanvasTex(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      for (let i = 0; i < 5; i++) ctx.fillRect(24, 20 + i * 12, 80, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(w - 26, h * 0.5, 8, 30);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    });
    const armGeo = new THREE.BoxGeometry(0.55, 1.9, 0.5);
    const cores = ['#1d4ed8', '#2563eb', '#1e40af', '#15803d', '#1d4ed8'];
    [-1, 1].forEach((s) => {
      const lista = [];
      for (let i = 0; i < 40; i++) {
        const z = 2 - i * 0.58;
        if (i % 9 === 4) continue;
        const t = [s * 2.72, 0.95, z, 0, -s * Math.PI / 2, 0];
        t.cor = cores[i % cores.length];
        lista.push(t);
      }
      g.add(instanced(armGeo, M.std('#ffffff', 0.45, 0.5, { map: ventTex }), lista));
    });
    // Portas das salas
    for (let i = 0; i < 4; i++) {
      [-1, 1].forEach((s) => {
        const z = 2 - (i * 9 + 4) * 0.58;
        g.add(box(0.08, 2.3, 1.1, M.std('#7c4a24', 0.6), s * 2.96, 1.15, z));
        g.add(box(0.09, 0.5, 0.35, M.basic('#1e293b'), s * 2.95, 1.7, z));
      });
    }
    // Luminárias fluorescentes
    for (let i = 0; i < 8; i++) {
      const z = 1 - i * 4;
      g.add(box(0.5, 0.05, 1.6, M.glow('#eef6ff', 2.4), 0, 3.17, z, { cast: false }));
      const h = halo('#e0f2fe', 1.8, 0.35);
      h.position.set(0, 3.0, z);
      g.add(h);
      if (i < 3) {
        const l = luz('#eef6ff', 10, 9, 1.4);
        l.position.set(0, 2.9, z);
        g.add(l);
      }
    }
    // Mural de avisos
    g.add(plane(1.6, 1.0, M.std('#ffffff', 0.9, 0, { map: textures.poster('AVISOS: Vestibular', 'Faculdade', ['#f59e0b', '#ef4444']) }), -2.94, 1.7, -3.2));
    g.children[g.children.length - 1].rotation.y = Math.PI / 2;

    return {
      group: g,
      slots: { L: [-1.0, 0, 0.6], R: [1.0, 0, 0.3], C: [0, 0, 0.4] },
      cam: { pos: [0, 1.65, 5.6], look: [0, 1.5, -2] },
      bg: 0x1a1d24,
      fog: [0x9aa6b8, 0.035],
      luz: { sky: '#e0ecff', ground: '#64748b', hemi: 0.9, key: '#ffffff', keyI: 0.8, keyPos: [2, 10, 6] },
      grade: { tint: [0.96, 1.0, 1.04], saturation: 0.98, bloom: 0.6 },
      update() { }
    };
  };

  // ---------- QUADRA (Basquete) ----------
  BUILDERS.quadra = () => {
    const THREE = T();
    const { box, cyl, plane, M, textures, halo } = L();
    const g = new THREE.Group();
    const linhas = L().makeCanvasTex(1024, 2048, (ctx, w, h) => {
      const img = textures.parquet(1, 1).userData.canvas;
      for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 256) ctx.drawImage(img, x, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 10;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      ctx.beginPath();
      ctx.moveTo(40, h / 2);
      ctx.lineTo(w - 40, h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 140, 0, Math.PI * 2);
      ctx.stroke();
      [40, h - 40].forEach((y) => {
        ctx.fillStyle = 'rgba(220,38,38,0.55)';
        const dir = y < h / 2 ? 1 : -1;
        ctx.fillRect(w / 2 - 190, y, 380, dir * 440);
        ctx.strokeRect(w / 2 - 190, y, 380, dir * 440);
        ctx.beginPath();
        ctx.arc(w / 2, y + dir * 440, 190, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w / 2, y + dir * 60, 610, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : Math.PI * 2);
        ctx.stroke();
      });
    });
    linhas.wrapS = THREE.ClampToEdgeWrapping;
    linhas.wrapT = THREE.ClampToEdgeWrapping;
    const piso = plane(16, 30, M.std('#ffffff', 0.32, 0.05, { map: linhas }), 0, 0, -6);
    piso.rotation.x = -Math.PI / 2;
    g.add(piso);
    sala(g, { w: 26, d: 24, h: 9, z0: -20, piso: M.std('#2a2a2a', 0.9), parede: M.std('#d6cfc2', 0.9), tetoMat: M.std('#3f3f46', 0.9) });
    // Arquibancadas laterais
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 5; i++) g.add(box(1.0, 0.45, 26, M.std(i % 2 ? '#1d4ed8' : '#1e40af', 0.6), s * (9 + i * 0.9), 0.22 + i * 0.45, -6));
    });
    // Tabela e aro (lado -z)
    const tabela = new THREE.Group();
    tabela.position.set(0, 0, -18);
    tabela.add(cyl(0.12, 0.15, 3.0, M.std('#334155', 0.5, 0.6), 0, 1.5, -1.4, 10));
    tabela.add(box(0.15, 0.15, 1.3, M.std('#334155', 0.5, 0.6), 0, 3.0, -0.75));
    const vidro = box(1.8, 1.05, 0.05, M.std('#e0f2fe', 0.05, 0.1, { transparent: true, opacity: 0.55 }), 0, 3.35, -0.1);
    tabela.add(vidro);
    tabela.add(box(0.6, 0.45, 0.055, M.basic('#ffffff', { transparent: true, opacity: 0.0 }), 0, 3.15, -0.08));
    const quad = new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.6, 0.45, 0.01)), new THREE.LineBasicMaterial({ color: 0xef4444 }));
    quad.position.set(0, 3.12, -0.06);
    tabela.add(quad);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 32), M.std('#ef4444', 0.4, 0.6));
    aro.rotation.x = Math.PI / 2;
    aro.position.set(0, 3.05, 0.2);
    tabela.add(aro);
    // Rede
    const rede = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.14, 0.4, 16, 3, true), new THREE.MeshBasicMaterial({ color: 0xf8fafc, wireframe: true, transparent: true, opacity: 0.8 }));
    rede.position.set(0, 2.84, 0.2);
    tabela.add(rede);
    g.add(tabela);
    // Refletores do ginásio
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const x = (j - 0.5) * 8;
        const z = -2 - i * 7;
        g.add(box(1.2, 0.2, 0.6, M.glow('#fff7e0', 2.6), x, 8.8, z, { cast: false }));
        const h = halo('#fff7e0', 3, 0.5);
        h.position.set(x, 8.6, z);
        g.add(h);
      }
    // Banners
    g.add(plane(4, 1.2, M.std('#ffffff', 0.9, 0, { map: textures.text('COLÉGIO · BASQUETE', { w: 1024, h: 300, size: 110, color: '#fbbf24', bg: '#1e3a8a' }) }), 0, 6.5, -19.9));

    return {
      group: g,
      aro: new THREE.Vector3(0, 3.05, -17.8),
      tabelaZ: -18.1,
      rede,
      slots: { L: [-1.2, 0, 0], R: [1.2, 0, 0], C: [0, 0, 0] },
      cam: { pos: [0, 2.2, 6], look: [0, 2.2, -12] },
      bg: 0x1c1a17,
      fog: [0x2b2620, 0.012],
      luz: { sky: '#fff3dc', ground: '#7a5a3a', hemi: 1.2, key: '#fff1d6', keyI: 2.4, keyPos: [4, 20, 4] },
      grade: { tint: [1.04, 1.0, 0.94], saturation: 1.1, bloom: 0.6 },
      update() { }
    };
  };

  // ---------- QUARTO-ESTÚDIO (Cap. 2 · Pandemia) ----------
  BUILDERS.quarto_estudio = (o = {}) => {
    const THREE = T();
    const { box, cyl, plane, M, textures, createParticles, halo, neonSign } = L();
    const g = new THREE.Group();
    sala(g, { w: 10, d: 8, h: 3.2, z0: -3.6, piso: M.std('#ffffff', 0.85, 0, { map: textures.wood('#3b2a20', 4, 4) }), parede: M.std('#1e1b2e', 0.95), paredeLateral: M.std('#211d33', 0.95) });
    // Mesa com dois monitores (tela de DAW)
    const daw = L().makeCanvasTex(512, 288, (ctx, w, h) => {
      ctx.fillStyle = '#1b1e28';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2b2f3c';
      ctx.fillRect(0, 0, w, 20);
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('LUIGGIBEATS STUDIO — shittrap_v99.flp', 8, 14);
      for (let r = 0; r < 6; r++) {
        ctx.fillStyle = '#2d3242';
        ctx.fillRect(8, 30 + r * 26, 90, 20);
        for (let c = 0; c < 16; c++) {
          ctx.fillStyle = Math.random() < 0.35 ? ['#f97316', '#22c55e', '#a855f7'][r % 3] : '#262a36';
          ctx.fillRect(104 + c * 25, 30 + r * 26, 21, 20);
        }
      }
      ctx.fillStyle = '#10b981';
      for (let i = 0; i < 10; i++) ctx.fillRect(10 + i * 49, 200 + Math.random() * 40, 42, 16);
    });
    g.add(box(3.2, 0.06, 0.9, M.std('#111827', 0.4), 0, 0.85, -3.0));
    [-1.5, 1.5].forEach((x) => g.add(box(0.06, 0.85, 0.8, M.std('#111827', 0.4), x, 0.42, -3.0)));
    [-0.62, 0.62].forEach((x, i) => {
      const mon = new THREE.Group();
      mon.position.set(x, 1.3, -3.25);
      mon.rotation.y = -x * 0.35;
      mon.add(box(1.2, 0.7, 0.05, M.std('#0a0a0a', 0.3, 0.4), 0, 0, 0));
      const tela = plane(1.12, 0.62, M.basic('#ffffff', { map: daw }), 0, 0, 0.03);
      tela.material.color.multiplyScalar(1.5);
      mon.add(tela);
      mon.add(box(0.06, 0.4, 0.06, M.std('#111', 0.4), 0, -0.5, -0.02));
      g.add(mon);
    });
    const glowTela = luz('#7dd3fc', 5, 5, 1.5);
    glowTela.position.set(0, 1.3, -2.5);
    g.add(glowTela);
    // Teclado MIDI e caixas de som
    g.add(box(1.0, 0.05, 0.25, M.std('#e5e7eb', 0.4), 0, 0.9, -2.75));
    const caixas = [];
    [-1.35, 1.35].forEach((x) => {
      const cx = new THREE.Group();
      cx.position.set(x, 1.2, -3.1);
      cx.add(box(0.36, 0.6, 0.35, M.std('#18181b', 0.6), 0, 0, 0));
      const cone = cyl(0.12, 0.12, 0.02, M.std('#3f3f46', 0.4, 0.3), 0, -0.08, 0.18, 20);
      cone.rotation.x = Math.PI / 2;
      cx.add(cone);
      g.add(cx);
      caixas.push(cx);
    });
    // Fita de LED roxa/azul
    const led = box(9.8, 0.04, 0.04, M.glow('#a855f7', 3), 0, 3.1, -3.55, { cast: false });
    g.add(led);
    const luzLed = luz('#a855f7', 6, 9, 1.2);
    luzLed.position.set(0, 2.9, -3);
    g.add(luzLed);
    // Janela com chuva e cama
    janela(g, 3.3, 1.9, -3.58, 1.6, 1.2, { vista: M.basic('#ffffff', { map: vistaNoturna(0.25, '#05070f', '#141a33') }), moldura: '#111827' });
    g.add(box(2.2, 0.45, 1.5, M.std('#334155', 0.9), -3.7, 0.25, -2.4));
    g.add(box(2.2, 0.15, 1.5, M.std('#64748b', 0.95), -3.7, 0.55, -2.4));
    g.add(neonSign('LuiggiBeats', '#22d3ee', 2.0, 0.5, { size: 120 }));
    g.children[g.children.length - 1].position.set(-2.3, 2.3, -3.55);
    // Pôsteres
    g.add(plane(0.8, 1.15, M.std('#ffffff', 0.9, 0, { map: textures.poster('SHITTRAP VOL. 1', '2020', ['#111827', '#7c3aed']) }), 2.2, 2.2, -3.57));
    // Cadeira gamer
    g.add(box(0.6, 0.1, 0.6, M.std('#111', 0.6), 0, 0.5, -1.9));
    g.add(box(0.6, 0.9, 0.1, M.std('#dc2626', 0.6), 0, 1.0, -1.6));
    // Chuva lá fora (vista pela janela)
    const chuva = createParticles({ count: 120, size: 0.12, shape: 'streak', color: '#9fb8ff', intensity: 0.9, ambient: { center: [3.3, 1.9, -3.9], size: [1.6, 1.4, 0.2], vel: [[0, -4, 0], [0, -3, 0]], fromTop: true }, life: [0.3, 0.45] });
    g.add(chuva.points);

    return {
      group: g,
      caixas,
      slots: { L: [-1.4, 0, 0.2], R: [1.4, 0, 0.2], C: [0, 0, 0.2] },
      cam: { pos: [0, 1.7, 5.4], look: [0, 1.5, -0.5] },
      bg: o.dia ? 0x6b7a99 : 0x07060d,
      fog: [o.dia ? 0x8a93ab : 0x0c0a18, o.dia ? 0.02 : 0.04],
      luz: o.dia
        ? { sky: '#e7eeff', ground: '#4b5563', hemi: 1.3, key: '#fff3dc', keyI: 1.8, keyPos: [6, 8, -3], fillI: 0.7 }
        : { sky: '#6d5bd0', ground: '#140f24', hemi: 0.5, key: '#8b9cff', keyI: 0.5, keyPos: [-3, 8, 6] },
      grade: o.dia ? { tint: [1.02, 1.0, 1.0], saturation: 1.05, bloom: 0.6 } : { tint: [0.98, 0.94, 1.08], saturation: 1.15, bloom: 1.0 },
      update(dt, t) {
        chuva.update(dt);
        const b = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (140 / 60 / 2))), 8);
        caixas.forEach((c) => c.scale.setScalar(1 + b * 0.05));
        luzLed.color.setHSL(0.75 + Math.sin(t * 0.4) * 0.08, 0.9, 0.6);
        led.material.color.copy(luzLed.color).multiplyScalar(3);
      }
    };
  };

  // ---------- ACADEMIA (Cap. 4 / Cap. 12 gótica) ----------
  BUILDERS.academia = (o = {}) => {
    const THREE = T();
    const { box, cyl, plane, M, textures, neonSign, halo } = L();
    const g = new THREE.Group();
    const gotica = !!o.gotica;
    sala(g, { w: 16, d: 10, h: 4.2, piso: M.std('#ffffff', 0.85, 0, { map: textures.concrete('#22252c', 6, 6) }), parede: M.std(gotica ? '#1a1418' : '#2b2f38', 0.9), rodape: '#111' });
    // Espelho no fundo
    g.add(box(10, 2.4, 0.05, M.std('#9fb2c8', 0.04, 1.0), 0, 1.7, -4.45, { cast: false }));
    // Racks de anilhas
    const metal = M.std('#4b5563', 0.4, 0.8);
    const anilha = M.std('#111111', 0.5, 0.3);
    for (let i = 0; i < 2; i++) {
      const x = -5.5 + i * 11;
      g.add(box(0.12, 2.4, 0.12, metal, x - 0.8, 1.2, -3.4));
      g.add(box(0.12, 2.4, 0.12, metal, x + 0.8, 1.2, -3.4));
      g.add(cyl(0.03, 0.03, 2.2, M.std('#d1d5db', 0.2, 1), x, 1.6, -3.4, 8).rotateZ(Math.PI / 2));
      [-0.95, 0.95].forEach((dx) => {
        const a = cyl(0.32, 0.32, 0.08, anilha, x + dx, 1.6, -3.4, 20);
        a.rotation.z = Math.PI / 2;
        g.add(a);
      });
    }
    // Rack de halteres
    g.add(box(3, 0.08, 0.6, metal, 0, 0.6, -3.9));
    for (let i = 0; i < 8; i++) {
      const h = cyl(0.07, 0.07, 0.36, anilha, -1.3 + i * 0.37, 0.72, -3.9, 10);
      h.rotation.z = Math.PI / 2;
      g.add(h);
    }
    // Bancos de supino
    [-3.4, 3.4].forEach((x) => {
      g.add(box(0.4, 0.12, 1.4, M.std(gotica ? '#3f0f1a' : '#111827', 0.6), x, 0.5, -1.6));
      g.add(box(0.1, 0.45, 0.1, metal, x, 0.22, -1.1));
      g.add(box(0.1, 0.45, 0.1, metal, x, 0.22, -2.1));
    });
    // Neon
    const cor = gotica ? '#dc2626' : '#22d3ee';
    const neon = neonSign(gotica ? 'no pain no gain' : 'ACADEMIA', cor, 3.4, 0.7, { size: 120, font: gotica ? 'Georgia, serif' : '"Arial Black", sans-serif' });
    neon.position.set(0, 3.45, -4.4);
    g.add(neon);
    const luzNeon = luz(cor, 7, 9, 1.3);
    luzNeon.position.set(0, 3.2, -3.6);
    g.add(luzNeon);
    // Luminárias do teto
    for (let i = 0; i < 3; i++) {
      g.add(box(2.4, 0.05, 0.3, M.glow(gotica ? '#ff9aa2' : '#f1f5ff', gotica ? 1.0 : 2.2), (i - 1) * 4.5, 4.15, -1, { cast: false }));
    }
    if (gotica) {
      // Velas e bandeirinha vermelha discreta
      for (let i = 0; i < 5; i++) {
        const x = -4 + i * 2;
        g.add(cyl(0.05, 0.05, 0.25, M.std('#f5f5f4', 0.8), x, 1.1, -4.2, 8));
        const ch = halo('#ff9a3c', 0.35, 1.6);
        ch.position.set(x, 1.27, -4.2);
        g.add(ch);
      }
    }
    // Vista do Subaru azul pela vitrine (Cap. 4)
    if (!gotica) {
      const vit = plane(3.4, 1.8, M.basic('#ffffff', { map: vistaNoturna(0.2) }), -7.95, 1.8, -1);
      vit.rotation.y = Math.PI / 2;
      g.add(vit);
    }

    return {
      group: g,
      slots: { L: [-1.4, 0, 0.6], R: [1.4, 0, 0.6], C: [0, 0, 0.6] },
      bancos: [-3.4, 3.4],
      cam: { pos: [0, 1.75, 6], look: [0, 1.5, 0] },
      bg: gotica ? 0x0d0709 : 0x0c0f15,
      fog: [gotica ? 0x1a0a0e : 0x111827, 0.03],
      luz: gotica
        ? { sky: '#c86b7a', ground: '#2a0d12', hemi: 1.0, key: '#ff8a8a', keyI: 1.4, keyPos: [-4, 9, 5], fillI: 0.6, fill: '#ffb3b3' }
        : { sky: '#cfe3ff', ground: '#334155', hemi: 1.25, key: '#ffffff', keyI: 2.0, keyPos: [4, 10, 6], fillI: 0.6 },
      grade: gotica ? { tint: [1.08, 0.9, 0.94], saturation: 0.85, contrast: 1.06, bloom: 0.7, exposure: 1.35, threshold: 1.3 } : { tint: [0.98, 1.0, 1.04], saturation: 1.08, exposure: 1.15 },
      update(dt, t) {
        luzNeon.intensity = 7 * (gotica ? 0.8 + Math.sin(t * 2) * 0.2 : 1 + (Math.random() < 0.01 ? -0.7 : 0));
      }
    };
  };

  // ---------- BEC BAR (Cap. 5) ----------
  BUILDERS.bec_bar = () => {
    const THREE = T();
    const { box, cyl, plane, M, textures, neonSign } = L();
    const g = new THREE.Group();
    sala(g, { w: 14, d: 10, h: 3.8, piso: M.std('#ffffff', 0.7, 0, { map: textures.wood('#4a2c18', 6, 6) }), parede: M.std('#ffffff', 0.95, 0, { map: textures.brick('#7a3420', 4, 2) }), paredeLateral: M.std('#2a1a12', 0.9) });
    // Balcão (esconde a cintura dos sprites)
    const madeira = M.std('#ffffff', 0.5, 0, { map: textures.wood('#5b3215', 3, 1) });
    g.add(box(8, 1.05, 0.8, madeira, 0, 0.52, 1.35));
    g.add(box(8.3, 0.08, 1.0, M.std('#2a1608', 0.3, 0.1), 0, 1.08, 1.35));
    // Prateleira de garrafas com contraluz âmbar
    g.add(box(7, 0.06, 0.4, M.std('#3b2414', 0.6), 0, 1.8, -4.25));
    g.add(box(7, 0.06, 0.4, M.std('#3b2414', 0.6), 0, 2.5, -4.25));
    g.add(box(7, 1.5, 0.02, M.glow('#ffb347', 0.45), 0, 2.2, -4.46, { cast: false }));
    const garrafas = [];
    const coresG = ['#14532d', '#78350f', '#7f1d1d', '#e5e7eb', '#1e3a8a', '#a16207'];
    for (let p = 0; p < 2; p++)
      for (let i = 0; i < 22; i++) {
        const t = [-3.3 + i * 0.31, 2.02 + p * 0.7, -4.25];
        t.cor = coresG[(i * 7 + p * 3) % coresG.length];
        garrafas.push(t);
      }
    g.add(instanced(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 10), M.std('#ffffff', 0.15, 0.1, { transparent: true, opacity: 0.85 }), garrafas));
    // Lâmpadas Edison
    const luzes = [];
    for (let i = 0; i < 4; i++) luzes.push(lampadaPendente(g, -3 + i * 2, 2.9, 0.4, '#ffb45c', { cupula: false, fio: 0.9, intensidade: 5, halo: 0.9 }));
    // Banquetas
    for (let i = 0; i < 5; i++) {
      g.add(cyl(0.22, 0.22, 0.08, M.std('#111', 0.5), -3.2 + i * 1.6, 0.78, 2.3, 16));
      g.add(cyl(0.04, 0.04, 0.78, M.std('#9ca3af', 0.3, 0.9), -3.2 + i * 1.6, 0.39, 2.3, 8));
    }
    // Mesas ao fundo
    mesaComCadeiras(g, -4.8, -2.2, { redonda: true });
    mesaComCadeiras(g, 4.8, -2.2, { redonda: true });
    // Neon e quadro de giz
    const neon = neonSign('Bec Bar', '#f472b6', 2.6, 0.75, { size: 150 });
    neon.position.set(-4.2, 2.9, -4.4);
    g.add(neon);
    g.add(plane(1.4, 1.0, M.std('#ffffff', 0.9, 0, { map: textures.chalkboard(['CHOPP 2x1', 'FRITAS', 'NOITE FRIA!'], { fonte: 80 }) }), 4.4, 2.5, -4.44));

    return {
      group: g,
      slots: { L: [-1.45, 0, 0.45], R: [1.45, 0, 0.45], C: [0, 0, 0.45] },
      cam: { pos: [0, 1.85, 6.3], look: [0, 1.6, 0] },
      oculta: 1.1,
      bg: 0x140b06,
      fog: [0x1c0f08, 0.035],
      luz: { sky: '#ffb36b', ground: '#2a160a', hemi: 0.55, key: '#ffd29a', keyI: 0.9, keyPos: [3, 9, 6] },
      grade: { tint: [1.1, 0.96, 0.84], saturation: 1.12, bloom: 1.0, vignette: 0.7 },
      update(dt, t) {
        luzes.forEach((l, i) => l && (l.intensity = 5 * (0.92 + Math.sin(t * 3 + i) * 0.04)));
      }
    };
  };

  // ---------- CENTRO DE CURITIBA ÀS 3H (Cap. 6) ----------
  BUILDERS.centro_noite = (o = {}) => {
    const THREE = T();
    const { box, plane, M, textures, createParticles, createSubaruMesh } = L();
    const g = new THREE.Group();
    const asfalto = plane(12, 80, M.std('#ffffff', 0.28, 0.35, { map: textures.asphalt(2, 16) }), 0, 0, -20);
    asfalto.rotation.x = -Math.PI / 2;
    g.add(asfalto);
    [-1, 1].forEach((s) => {
      const calcada = box(4, 0.15, 80, M.std('#ffffff', 0.8, 0, { map: textures.tiles('#6b7280', '#4b5563', 2, 30, 4) }), s * 8, 0.075, -20);
      g.add(calcada);
      // Prédios
      for (let i = 0; i < 9; i++) {
        const h = 8 + Math.random() * 14;
        const w = 6 + Math.random() * 3;
        const tex = textures.windows({ lit: 0.12, cols: 5, rows: 14, base: '#0d1018' });
        tex.repeat.set(1, Math.round(h / 8));
        const pr = box(6, h, w, M.std('#ffffff', 0.85, 0, { map: tex, emissive: '#ffffff', emissiveIntensity: 0.0 }), s * 13, h / 2, 6 - i * 8.5);
        pr.material.emissiveMap = tex;
        pr.material.emissiveIntensity = 0.9;
        g.add(pr);
        // Toldo / loja fechada
        g.add(box(0.2, 2.4, w * 0.6, M.std('#374151', 0.5, 0.6), s * 9.95, 1.3, 6 - i * 8.5));
      }
    });
    // Postes de luz de sódio
    for (let i = 0; i < 5; i++) poste(g, -6.2, 4 - i * 12, '#ff9d3c', { lado: 1, altura: 5.2, intensidade: 16 });
    for (let i = 0; i < 4; i++) poste(g, 6.2, -2 - i * 12, '#ff9d3c', { lado: -1, altura: 5.2, intensidade: 16 });
    if (o.yard) {
      const fachada = L().neonSign('YARD', '#a3e635', 3, 1.1, { size: 220, font: '"Arial Black", sans-serif' });
      fachada.position.set(-10.9, 3.6, -4);
      fachada.rotation.y = Math.PI / 2;
      g.add(fachada);
      const fila = multidao(g, 10, [-9.4, -8.2, -7, -1], ['#111827', '#7c3aed', '#be185d', '#0f766e']);
      g.userData.fila = fila;
    }
    // Subaru estacionado
    const sub = createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', false);
    sub.position.set(-4.3, 0, -9);
    g.add(sub);
    // Semáforo piscando amarelo
    const sem = new THREE.Group();
    sem.position.set(5.6, 0, -16);
    sem.add(box(0.12, 4, 0.12, M.std('#1f2937', 0.5), 0, 2, 0));
    sem.add(box(0.35, 0.9, 0.3, M.std('#111', 0.5), 0, 4.3, 0));
    const amarelo = box(0.2, 0.2, 0.05, M.glow('#fbbf24', 3), 0, 4.3, 0.16, { cast: false });
    sem.add(amarelo);
    g.add(sem);
    // Sacolas e lixo
    [[-6.5, 0.3, -2], [-6.9, 0.25, -2.4], [6.8, 0.3, -6]].forEach(([x, y, z]) => {
      const s = L().sphere(0.3, M.std('#0f0f12', 0.4, 0.1), x, y, z, 10);
      s.scale.set(1, 0.85, 1);
      g.add(s);
    });
    // Névoa / garoa
    const garoa = createParticles({ count: 220, size: 0.06, shape: 'streak', color: '#a3b5d6', intensity: 0.7, ambient: { center: [0, 4, -4], size: [16, 8, 20], vel: [[-0.2, -5, 0], [0.2, -4, 0]], fromTop: true }, life: [1.2, 1.8] });
    if (o.garoa !== false) g.add(garoa.points);

    return {
      group: g,
      subaru: sub,
      slots: { L: [-1.4, 0, 1.2], R: [1.4, 0, 1.2], C: [0, 0, 1.2] },
      cam: { pos: [0, 1.75, 7.2], look: [0, 1.5, 0] },
      bg: 0x070910,
      fog: [0x141826, 0.045],
      luz: { sky: '#3b4a7a', ground: '#1a120a', hemi: 0.35, key: '#8aa2ff', keyI: 0.35, keyPos: [-6, 12, 4] },
      grade: { tint: [1.06, 0.95, 0.9], saturation: 1.05, contrast: 1.08, bloom: 1.1, vignette: 0.75 },
      update(dt, t) {
        if (o.garoa !== false) garoa.update(dt);
        if (g.userData.fila) g.userData.fila.update(t, 0.4);
        amarelo.visible = Math.floor(t * 1.4) % 2 === 0;
      }
    };
  };

  // ---------- SHOPPING · PRAÇA DE ALIMENTAÇÃO (Cap. 7) ----------
  BUILDERS.shopping = () => {
    const THREE = T();
    const { box, cyl, plane, M, textures, neonSign, sphere } = L();
    const g = new THREE.Group();
    sala(g, { w: 22, d: 16, h: 6, z0: -8, piso: M.std('#ffffff', 0.18, 0.1, { map: textures.tiles('#e7e5e4', '#d6d3d1', 10, 10, 2) }), parede: M.std('#f5f5f4', 0.9), tetoMat: M.std('#e7e5e4', 0.9) });
    // Claraboia
    g.add(box(8, 0.05, 6, M.glow('#e0f2fe', 1.8), 0, 5.97, -2, { cast: false }));
    // Lojas de comida
    const lojas = [
      ['BURGER', '#ef4444'],
      ['PASTEL', '#f59e0b'],
      ['SUSHI', '#10b981'],
      ['AÇAÍ', '#7c3aed'],
      ['PIZZA', '#dc2626']
    ];
    lojas.forEach(([nome, cor], i) => {
      const x = -8 + i * 4;
      g.add(box(3.6, 3, 0.4, M.std('#fafaf9', 0.6), x, 1.5, -7.6));
      g.add(box(3.4, 1.0, 0.8, M.std(cor, 0.5), x, 0.5, -7.1));
      const placa = neonSign(nome, cor, 2.6, 0.6, { size: 110, font: '"Arial Black", sans-serif', intensity: 1.1, additive: false });
      placa.position.set(x, 3.4, -7.35);
      g.add(placa);
      g.add(box(3.2, 1.4, 0.05, M.std('#111827', 0.2, 0.3), x, 2.0, -7.38));
    });
    // Mesas e cadeiras
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (!(r === 2 && (c === 1 || c === 2))) mesaComCadeiras(g, -6 + c * 4, -4.5 + r * 2.6, { tampo: M.std('#e2e8f0', 0.4), cadeira: M.std('#f97316', 0.6) });
    // Plantas
    [[-10, -6], [10, -6], [-10, 2], [10, 2]].forEach(([x, z]) => {
      g.add(cyl(0.4, 0.3, 0.7, M.std('#78716c', 0.8), x, 0.35, z, 12));
      g.add(sphere(0.7, M.toon('#16a34a'), x, 1.3, z, 12));
    });
    return {
      group: g,
      slots: { L: [-1.4, 0, 1.4], R: [1.4, 0, 1.4], C: [0, 0, 1.4] },
      cam: { pos: [0, 1.75, 7.5], look: [0, 1.5, 0] },
      bg: 0xdbe4ee,
      fog: [0xe6ebf0, 0.018],
      luz: { sky: '#ffffff', ground: '#a8a29e', hemi: 1.4, key: '#fff8ea', keyI: 2.2, keyPos: [2, 16, 4] },
      grade: { tint: [1.0, 1.0, 1.0], saturation: 1.1, bloom: 0.45, vignette: 0.35 },
      update() { }
    };
  };

  // ---------- APARTAMENTO DA LUIZA (Cap. 7 · noite) ----------
  BUILDERS.apartamento = () => {
    const THREE = T();
    const { box, plane, M, textures, sphere } = L();
    const g = new THREE.Group();
    sala(g, { w: 12, d: 9, h: 3.2, piso: M.std('#ffffff', 0.8, 0, { map: textures.wood('#6b4a30', 5, 5) }), parede: M.std('#d9cbbd', 0.9) });
    // Sofá
    g.add(box(3.2, 0.5, 1.0, M.std('#7c3aed', 0.9), 0, 0.35, -3.6));
    g.add(box(3.2, 0.8, 0.3, M.std('#6d28d9', 0.9), 0, 0.8, -4.0));
    // Abajur
    lampadaPendente(g, 2.6, 1.6, -3.5, '#ffcf8a', { fio: 0.1, intensidade: 6, raio: 0.25, corCupula: '#fde68a' });
    // Mapa da Alemanha na parede (piada da Luiza)
    g.add(plane(1.2, 1.5, M.std('#ffffff', 0.9, 0, { map: textures.poster('DEUTSCHLAND', 'Geografia ♥', ['#111827', '#dc2626']) }), -2.6, 2.0, -4.47));
    janela(g, 0.4, 2.0, -4.47, 1.6, 1.0, { vista: M.basic('#ffffff', { map: vistaNoturna(0.3) }) });
    // O gato (olhos brilhando na estante)
    g.add(box(1.6, 2.2, 0.4, M.std('#3b2a20', 0.7), 4.8, 1.1, -4.2));
    const olhos = [];
    [-0.07, 0.07].forEach((dx) => {
      const o = sphere(0.035, M.glow('#facc15', 4), 4.8 + dx, 1.95, -3.98, 8);
      g.add(o);
      olhos.push(o);
    });
    return {
      group: g,
      slots: { L: [-1.4, 0, 0.5], R: [1.4, 0, 0.5], C: [0, 0, 0.5] },
      cam: { pos: [0, 1.7, 6], look: [0, 1.5, 0] },
      bg: 0x0d0a10,
      fog: [0x15101a, 0.04],
      luz: { sky: '#8b7ab8', ground: '#2a1a14', hemi: 0.5, key: '#ffcf9a', keyI: 0.7, keyPos: [5, 6, 5] },
      grade: { tint: [1.05, 0.96, 0.95], saturation: 1.05, bloom: 0.9 },
      update(dt, t) {
        const pisca = Math.floor(t * 0.5) % 7 === 0 && (t % 2) < 0.15;
        olhos.forEach((o) => (o.scale.y = pisca ? 0.1 : 1));
      }
    };
  };

  // ---------- SAD BAILE (Cap. 8) ----------
  BUILDERS.sad_baile = () => {
    const THREE = T();
    const { box, plane, M, textures, neonSign, createParticles } = L();
    const g = new THREE.Group();
    sala(g, { w: 20, d: 14, h: 6, z0: -7, piso: M.std('#ffffff', 0.3, 0.4, { map: textures.danceFloor(['#3b82f6', '#6366f1', '#8b5cf6', '#1e293b']) }), parede: M.std('#0b0b14', 0.95), tetoMat: M.std('#05050a', 1) });
    // Paredão de som
    const caixas = [];
    [-6.5, 6.5].forEach((x) => {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 2; c++) {
          const cx = new THREE.Group();
          cx.position.set(x + (c - 0.5) * 1.3, 0.65 + r * 1.3, -6.2);
          cx.add(box(1.25, 1.25, 0.9, M.std('#111114', 0.6), 0, 0, 0));
          const cone = L().cyl(0.42, 0.42, 0.04, M.std('#27272a', 0.4, 0.4), 0, 0, 0.46, 24);
          cone.rotation.x = Math.PI / 2;
          cx.add(cone);
          cx.add(L().cyl(0.12, 0.12, 0.05, M.glow('#38bdf8', 1.5), 0, 0, 0.48, 16).rotateX(Math.PI / 2));
          g.add(cx);
          caixas.push(cx);
        }
    });
    // Cabine do DJ
    g.add(box(3.4, 1.1, 1.2, M.std('#18181b', 0.5), 0, 0.55, -5.6));
    g.add(box(3.4, 0.06, 1.2, M.glow('#6366f1', 1.6), 0, 1.12, -5.6, { cast: false }));
    const neon = neonSign('SAD 💧 BAILE', '#60a5fa', 4.4, 1.0, { size: 150, font: '"Arial Black", sans-serif' });
    neon.position.set(0, 3.6, -6.9);
    g.add(neon);
    // Holofotes e multidão
    const holo = holofotes(g, 6, ['#3b82f6', '#a855f7', '#ec4899', '#22d3ee'], 5.6, 7);
    const povo = multidao(g, 46, [-8, 8, -4.5, -1.2], ['#1f2937', '#312e81', '#4c1d95', '#1e1b4b', '#3b0764', '#0f172a']);
    const luzA = luz('#6366f1', 14, 14, 1.2);
    luzA.position.set(-3, 4, -2);
    const luzB = luz('#ec4899', 12, 14, 1.2);
    luzB.position.set(3, 4, -2);
    g.add(luzA, luzB);
    const fumaca = createParticles({ count: 60, size: 2.6, shape: 'smoke', color: '#6d6dff', intensity: 0.12, ambient: { center: [0, 0.8, -3], size: [16, 1.2, 6], vel: [[-0.15, 0, -0.05], [0.15, 0.05, 0.05]] }, life: [6, 10] });
    g.add(fumaca.points);

    return {
      group: g,
      caixas,
      slots: { L: [-1.5, 0, 1.0], R: [1.5, 0, 1.0], C: [0, 0, 1.0] },
      cam: { pos: [0, 1.75, 6.8], look: [0, 1.6, 0] },
      bg: 0x05040b,
      fog: [0x0c0a1e, 0.04],
      luz: { sky: '#3b3b8a', ground: '#0a0612', hemi: 0.45, key: '#7c83ff', keyI: 0.5, keyPos: [0, 10, 6] },
      grade: { tint: [0.92, 0.95, 1.12], saturation: 1.15, contrast: 1.08, bloom: 1.2, vignette: 0.75 },
      energia: 1,
      update(dt, t) {
        holo(t);
        povo.update(t, this.energia ?? 1);
        fumaca.update(dt);
        const bpm = 88;
        const b = Math.pow(Math.max(0, Math.sin(t * Math.PI * (bpm / 60))), 10) * (this.energia ?? 1);
        caixas.forEach((c) => c.scale.setScalar(1 + b * 0.06));
        luzA.intensity = 10 + b * 14;
        luzB.intensity = 8 + Math.pow(Math.max(0, Math.sin(t * Math.PI * (bpm / 60) + 1.5)), 10) * 14;
      }
    };
  };

  // ---------- ASTERISCO CAFÉ (Cap. 9) ----------
  BUILDERS.cafe = () => {
    const THREE = T();
    const { box, cyl, plane, M, textures, neonSign, halo, sphere } = L();
    const g = new THREE.Group();
    sala(g, { w: 14, d: 10, h: 3.6, piso: M.std('#ffffff', 0.6, 0, { map: textures.tiles('#3a2d26', '#2a201b', 6, 6, 4) }), parede: M.std('#ffffff', 0.95, 0, { map: textures.brick('#8a4a32', 4, 2) }), paredeLateral: M.std('#3b2a22', 0.9) });
    // Balcão com máquina de espresso
    const madeira = M.std('#ffffff', 0.55, 0, { map: textures.wood('#6b4426', 3, 1) });
    g.add(box(7, 1.05, 0.8, madeira, 0, 0.52, 1.3));
    g.add(box(7.2, 0.06, 0.95, M.std('#1c1917', 0.35), 0, 1.07, 1.3));
    const maq = new THREE.Group();
    maq.position.set(2.4, 1.1, 1.2);
    maq.add(box(0.8, 0.55, 0.45, M.std('#d4d4d8', 0.15, 1), 0, 0.28, 0));
    maq.add(box(0.15, 0.08, 0.15, M.std('#18181b', 0.4), -0.2, 0.05, 0.2));
    maq.add(box(0.15, 0.08, 0.15, M.std('#18181b', 0.4), 0.2, 0.05, 0.2));
    g.add(maq);
    // Quadro do cardápio
    g.add(plane(2.2, 1.3, M.std('#ffffff', 0.9, 0, { map: textures.chalkboard(['ESPRESSO .... 7', 'CAPPUCCINO .. 12', 'LATTE ♥ ..... 14'], { fonte: 64, cor: '#1c1917' }) }), -2.4, 2.3, -4.45));
    // Cartaz do TNT
    g.add(plane(0.9, 1.3, M.std('#ffffff', 0.9, 0, { map: textures.poster('TNT', 'Asterisco Café · sexta', ['#dc2626', '#0f172a']) }), 1.2, 2.2, -4.45));
    const neon = neonSign('asterisco*', '#fbbf24', 2.4, 0.6, { size: 120 });
    neon.position.set(3.8, 2.6, -4.4);
    g.add(neon);
    // Varal de luzinhas
    const luzinhas = [];
    for (let i = 0; i < 18; i++) {
      const x = -6 + i * 0.7;
      const y = 3.2 - Math.sin((i / 17) * Math.PI) * 0.45;
      const b = sphere(0.04, M.glow('#ffd28a', 3.2), x, y, -1.5, 6);
      g.add(b);
      const h = halo('#ffc56b', 0.45, 0.8);
      h.position.set(x, y, -1.5);
      g.add(h);
      luzinhas.push(b);
    }
    lampadaPendente(g, -1.6, 2.7, 1.2, '#ffcf8a', { fio: 0.9, intensidade: 6 });
    lampadaPendente(g, 1.6, 2.7, 1.2, '#ffcf8a', { fio: 0.9, intensidade: 6 });
    mesaComCadeiras(g, -4.6, -2.4, { redonda: true });
    mesaComCadeiras(g, 4.6, -2.4, { redonda: true });
    // Plantas
    g.add(cyl(0.3, 0.22, 0.5, M.std('#a16207', 0.8), -6.2, 0.25, -3.8, 10));
    g.add(sphere(0.55, M.toon('#15803d'), -6.2, 0.95, -3.8, 10));

    return {
      group: g,
      // TL/TR: dois lugares a mais na mesa (Yuri e Erion na conversa com o Luis e a Yohana)
      slots: { L: [-1.45, 0, 0.45], R: [1.45, 0, 0.45], C: [0, 0, 0.45], TL: [-0.55, 0, -0.55], TR: [0.55, 0, -0.55] },
      cam: { pos: [0, 1.8, 6.2], look: [0, 1.6, 0] },
      oculta: 1.1,
      bg: 0x1a120d,
      fog: [0x24170f, 0.03],
      luz: { sky: '#ffcf9a', ground: '#3b2414', hemi: 0.7, key: '#ffe0b5', keyI: 1.0, keyPos: [4, 9, 6] },
      grade: { tint: [1.08, 0.98, 0.88], saturation: 1.1, bloom: 0.9 },
      update(dt, t) {
        luzinhas.forEach((b, i) => b.scale.setScalar(0.85 + Math.sin(t * 2 + i) * 0.15));
      }
    };
  };

  // ---------- CINEMA (Créditos Infinitos) ----------
  BUILDERS.cinema = () => {
    const THREE = T();
    const { box, plane, M } = L();
    const g = new THREE.Group();
    sala(g, { w: 18, d: 18, h: 7, z0: -12, piso: M.std('#1a0d10', 0.9), parede: M.std('#2a0d14', 0.95), tetoMat: M.std('#0a0507', 1) });
    const tela = plane(11, 4.8, M.basic('#ffffff'), 0, 3.6, -11.9);
    g.add(tela);
    const assentos = [];
    const encostos = [];
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 14; c++) {
        if (c === 6 || c === 7) continue;
        const x = -6.5 + c * 1.0;
        const z = -6 + r * 1.3;
        const y = r * 0.22;
        assentos.push([x, 0.45 + y, z]);
        encostos.push([x, 0.85 + y, z + 0.32]);
      }
    g.add(instanced(new THREE.BoxGeometry(0.85, 0.18, 0.7), M.std('#9f1239', 0.8), assentos));
    g.add(instanced(new THREE.BoxGeometry(0.85, 0.75, 0.15), M.std('#881337', 0.8), encostos));
    for (let r = 0; r < 7; r++) g.add(box(16, 0.22 * r + 0.01, 1.3, M.std('#12070a', 0.9), 0, (0.22 * r) / 2, -6 + r * 1.3, { cast: false }));
    // Luzes de corredor
    for (let i = 0; i < 7; i++) g.add(box(0.12, 0.05, 0.12, M.glow('#fbbf24', 2.5), -0.55, 0.05 + i * 0.22, -6 + i * 1.3, { cast: false }));
    const luzTela = luz('#cbd5ff', 10, 22, 1.1);
    luzTela.position.set(0, 3.6, -9);
    g.add(luzTela);
    return {
      group: g,
      tela,
      slots: { L: [-1.0, 0.66, 1.5], R: [1.0, 0.66, 1.5], C: [0, 0.66, 1.5] },
      cam: { pos: [0, 2.6, 4.8], look: [0, 2.8, -11] },
      bg: 0x050203,
      fog: [0x070304, 0.02],
      luz: { sky: '#3a2a4a', ground: '#0a0506', hemi: 0.25, key: '#a5b4fc', keyI: 0.2, keyPos: [0, 6, -10] },
      grade: { tint: [1.0, 0.95, 0.95], saturation: 1.0, bloom: 0.8, vignette: 0.8 },
      update(dt, t) {
        luzTela.intensity = 9 + Math.sin(t * 3) * 1.5;
      }
    };
  };

  // ---------- EMILY DOCES (Cap. 10) ----------
  BUILDERS.emily_doces = () => {
    const THREE = T();
    const { box, cyl, plane, M, textures, neonSign, sphere } = L();
    const g = new THREE.Group();
    sala(g, { w: 14, d: 10, h: 3.6, piso: M.std('#ffffff', 0.35, 0, { map: textures.checker('#fdf2f8', '#f9a8d4', 8, 8, 2) }), parede: M.std('#e9a9c6', 0.9), paredeLateral: M.std('#a7e8d8', 0.9) });
    // Vitrine de doces (esconde a cintura)
    g.add(box(7, 0.9, 0.9, M.std('#f9a8d4', 0.5), 0, 0.45, 1.3));
    g.add(box(7, 0.55, 0.9, M.std('#ffffff', 0.05, 0.1, { transparent: true, opacity: 0.25 }), 0, 1.2, 1.3, { cast: false }));
    g.add(box(7.1, 0.05, 0.95, M.std('#fdf2f8', 0.2), 0, 1.5, 1.3));
    const cores = ['#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#fb7185', '#7c2d12'];
    for (let i = 0; i < 12; i++) {
      const x = -3 + i * 0.55;
      const bolo = cyl(0.2, 0.2, 0.22, M.toon(cores[i % cores.length]), x, 1.05, 1.3, 16);
      g.add(bolo);
      g.add(sphere(0.06, M.toon('#dc2626'), x, 1.2, 1.3, 8));
    }
    // Neon "emilydoces"
    g.add(box(4.0, 1.1, 0.05, M.std('#2a0f1f', 0.6), 0, 2.7, -4.46, { cast: false }));
    const neon = neonSign('emilydoces', '#f472b6', 3.4, 0.8, { size: 150 });
    neon.position.set(0, 2.7, -4.4);
    g.add(neon);
    const luzNeon = luz('#f472b6', 8, 8, 1.3);
    luzNeon.position.set(0, 2.5, -3.5);
    g.add(luzNeon);
    // Prateleiras com potes
    for (let i = 0; i < 2; i++) {
      g.add(box(4, 0.05, 0.35, M.std('#ffffff', 0.5), -4, 1.5 + i * 0.6, -4.3));
      for (let k = 0; k < 6; k++) g.add(cyl(0.12, 0.12, 0.3, M.std('#ffffff', 0.1, 0, { transparent: true, opacity: 0.6 }), -5.5 + k * 0.6, 1.68 + i * 0.6, -4.3, 10));
    }
    lampadaPendente(g, -1.8, 2.8, 0.8, '#ffe4f1', { corCupula: '#f9a8d4', intensidade: 6 });
    lampadaPendente(g, 1.8, 2.8, 0.8, '#ffe4f1', { corCupula: '#99f6e4', intensidade: 6 });
    return {
      group: g,
      slots: { L: [-1.45, 0, 0.45], R: [1.45, 0, 0.45], C: [0, 0, 0.45] },
      cam: { pos: [0, 1.85, 6.2], look: [0, 1.6, 0] },
      oculta: 1.5,
      bg: 0xfbe4ef,
      fog: [0xf5d0e2, 0.02],
      luz: { sky: '#fff1f7', ground: '#a7f3d0', hemi: 1.3, key: '#ffffff', keyI: 1.8, keyPos: [3, 10, 6] },
      grade: { tint: [1.03, 0.98, 1.02], saturation: 1.15, bloom: 0.55, vignette: 0.35 },
      update() { }
    };
  };

  // ---------- GARAGEM (Mods do Subaru) ----------
  BUILDERS.garagem = () => {
    const THREE = T();
    const { box, plane, M, textures, neonSign } = L();
    const g = new THREE.Group();
    sala(g, { w: 16, d: 12, h: 5, z0: -6, piso: M.std('#ffffff', 0.4, 0.2, { map: textures.concrete('#3f434b', 5, 5) }), parede: M.std('#ffffff', 0.9, 0, { map: textures.concrete('#2b2e35', 3, 2) }), tetoMat: M.std('#1f2229', 1) });
    // Plataforma giratória
    const prato = L().cyl(3.2, 3.2, 0.08, M.std('#111318', 0.3, 0.6), 0, 0.04, 0, 48);
    g.add(prato);
    g.add(L().cyl(3.25, 3.25, 0.02, M.glow('#38bdf8', 1.8), 0, 0.01, 0, 48));
    // Painel de ferramentas
    g.add(box(4, 2, 0.05, M.std('#ef4444', 0.6), -4.5, 2.2, -5.95));
    for (let i = 0; i < 8; i++) g.add(box(0.06, 0.5, 0.04, M.std('#d1d5db', 0.3, 1), -6 + i * 0.4, 2.3, -5.9));
    const neon = neonSign('GARAGEM TICO & TECO', '#38bdf8', 4, 0.6, { size: 90, font: '"Arial Black", sans-serif' });
    neon.position.set(3.5, 3.6, -5.9);
    g.add(neon);
    for (let i = 0; i < 3; i++) g.add(box(3, 0.05, 0.4, M.glow('#f8fafc', 2.5), (i - 1) * 5, 4.95, -1, { cast: false }));
    return {
      group: g,
      prato,
      slots: { L: [-3.4, 0, 1.6], R: [3.4, 0, 1.6], C: [0, 0, 0] },
      cam: { pos: [0, 2.4, 8], look: [0, 0.9, 0] },
      bg: 0x0b0d12,
      fog: [0x111318, 0.02],
      luz: { sky: '#dbeafe', ground: '#1f2937', hemi: 0.8, key: '#ffffff', keyI: 2.4, keyPos: [5, 12, 7] },
      grade: { tint: [0.98, 1.0, 1.05], saturation: 1.1, bloom: 0.8 },
      update() { }
    };
  };

  // ---------- PLANO DOS SONHOS (Cap. 11) ----------
  BUILDERS.sonho = () => {
    const THREE = T();
    const { M, sphere, createParticles, cyl } = L();
    const g = new THREE.Group();
    ceu(g, [
      [0, '#1e1b4b'],
      [0.35, '#7e22ce'],
      [0.6, '#f472b6'],
      [0.8, '#fdba74'],
      [1, '#fde68a']
    ]);
    estrelas(g, 400, 100, '#ffffff', 0.25);
    // Lua gigante
    const lua = sphere(8, M.glow('#fff1f2', 1.4), -30, 30, -80, 32);
    g.add(lua);
    // Ilhas flutuantes
    const ilhas = [];
    const ilha = (x, y, z, r) => {
      const grp = new THREE.Group();
      const topo = cyl(r, r * 0.9, 0.5, M.toon('#a78bfa'), 0, 0, 0, 10);
      grp.add(topo);
      const rocha = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, r * 1.8, 8), M.toon('#4c1d95'));
      rocha.rotation.x = Math.PI;
      rocha.position.y = -r * 1.0;
      grp.add(rocha);
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        grp.add(sphere(r * 0.25, M.toon('#f9a8d4'), Math.cos(a) * r * 0.5, 0.4, Math.sin(a) * r * 0.5, 8));
      }
      grp.position.set(x, y, z);
      g.add(grp);
      ilhas.push({ grp, y, ph: Math.random() * 6 });
      return grp;
    };
    ilha(0, -0.25, 0, 5.2);
    ilha(-9, 2, -12, 2.4);
    ilha(10, 4, -16, 3);
    ilha(-14, 6, -26, 2);
    ilha(16, -2, -8, 1.6);
    // Nuvens
    const nuvens = [];
    for (let i = 0; i < 14; i++) {
      const n = new THREE.Group();
      for (let k = 0; k < 4; k++) n.add(sphere(1 + Math.random(), M.toon('#fdf4ff', { emissive: '#f5d0fe', emissiveIntensity: 0.35 }), k * 1.2, Math.random() * 0.5, Math.random() * 0.6, 10));
      n.position.set(-30 + Math.random() * 60, -4 + Math.random() * 14, -20 - Math.random() * 40);
      g.add(n);
      nuvens.push(n);
    }
    const brilhos = createParticles({ count: 200, size: 0.12, shape: 'spark', colors: ['#fde68a', '#f9a8d4', '#c4b5fd'], intensity: 2, ambient: { center: [0, 3, -4], size: [20, 8, 16], vel: [[-0.1, 0.05, -0.1], [0.1, 0.3, 0.1]] }, life: [3, 6] });
    g.add(brilhos.points);
    return {
      group: g,
      slots: { L: [-1.4, 0, 1.0], R: [1.4, 0, 1.0], C: [0, 0, 1.0] },
      cam: { pos: [0, 1.9, 6.6], look: [0, 1.5, 0] },
      bg: 0x7e22ce,
      fog: [0xd8b4fe, 0.012],
      luz: { sky: '#fbcfe8', ground: '#6d28d9', hemi: 1.3, key: '#fff1f2', keyI: 1.6, keyPos: [-8, 12, 6] },
      grade: { tint: [1.05, 0.95, 1.08], saturation: 1.25, bloom: 1.2, aberration: 0.35, lift: [0.04, 0.0, 0.06] },
      update(dt, t) {
        brilhos.update(dt);
        ilhas.forEach((i, k) => k > 0 && (i.grp.position.y = i.y + Math.sin(t * 0.6 + i.ph) * 0.4));
        nuvens.forEach((n, k) => (n.position.x += dt * (0.3 + (k % 3) * 0.15)) > 32 && (n.position.x = -32));
      }
    };
  };

  // ---------- GALPÃO UNDERGROUND DO TNT (Cap. 13) ----------
  BUILDERS.galpao = () => {
    const THREE = T();
    const { box, plane, M, textures, neonSign, createSubaruMesh, createParticles } = L();
    const g = new THREE.Group();
    const grafite = L().makeCanvasTex(1024, 512, (ctx, w, h) => {
      ctx.drawImage(textures.concrete('#3a3d44').userData.canvas, 0, 0, w, h);
      const tags = [['TNT', '#ef4444', 180], ['LUIGGI', '#22d3ee', 90], ['é... verdade', '#facc15', 60], ['UNDERGROUND', '#a855f7', 70]];
      tags.forEach(([t, c, s], i) => {
        ctx.save();
        ctx.translate(120 + i * 230, 200 + (i % 2) * 160);
        ctx.rotate((Math.random() - 0.5) * 0.3);
        ctx.font = `900 ${s}px "Arial Black", Impact, sans-serif`;
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0a0a0a';
        ctx.strokeText(t, 0, 0);
        ctx.fillStyle = c;
        ctx.fillText(t, 0, 0);
        ctx.restore();
      });
    });
    sala(g, { w: 22, d: 16, h: 8, z0: -8, piso: M.std('#ffffff', 0.5, 0.2, { map: textures.concrete('#2a2c31', 6, 6) }), parede: M.std('#ffffff', 0.9, 0, { map: grafite }), paredeLateral: M.std('#ffffff', 0.9, 0, { map: textures.concrete('#24262b', 4, 2) }), tetoMat: M.std('#0d0e10', 1) });
    // Vigas de metal
    for (let i = 0; i < 5; i++) g.add(box(22, 0.4, 0.3, M.std('#1f2937', 0.5, 0.7), 0, 7.4, -6 + i * 3.5));
    // Lâmpadas industriais vermelhas
    for (let i = 0; i < 4; i++) lampadaPendente(g, -6 + i * 4, 5.5, -2, '#ff3b3b', { fio: 2, intensidade: 10, alcance: 10, corCupula: '#111' });
    // Cabine do DJ
    g.add(box(3.6, 1.1, 1.2, M.std('#111', 0.6), 0, 0.55, -6.6));
    const neon = neonSign('TNT', '#ef4444', 3, 1.2, { size: 260, font: '"Arial Black", Impact, sans-serif' });
    neon.position.set(0, 4.2, -7.9);
    g.add(neon);
    // Subaru estacionado na lateral
    const sub = createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', !!root.LuiggiSave?.state?.subaruMods?.neon);
    sub.position.set(-7, 0, -3);
    sub.rotation.y = 0.5;
    g.add(sub);
    const povo = multidao(g, 30, [-5, 7, -6, -3], ['#111827', '#7f1d1d', '#1f2937', '#3f3f46', '#450a0a']);
    const fumaca = createParticles({ count: 40, size: 3, shape: 'smoke', color: '#ff6b6b', intensity: 0.1, ambient: { center: [0, 1, -4], size: [18, 2, 6], vel: [[-0.1, 0, 0], [0.1, 0.05, 0.05]] }, life: [6, 10] });
    g.add(fumaca.points);
    const holo = holofotes(g, 4, ['#ef4444', '#f97316'], 7, 6);
    return {
      group: g,
      subaru: sub,
      slots: { L: [-1.5, 0, 1.2], R: [1.5, 0, 1.2], C: [0, 0, 1.2] },
      cam: { pos: [0, 1.75, 7.4], look: [0, 1.6, 0] },
      bg: 0x050405,
      fog: [0x140808, 0.035],
      luz: { sky: '#ff6b6b', ground: '#140505', hemi: 0.35, key: '#ff9a9a', keyI: 0.6, keyPos: [-4, 12, 6] },
      grade: { tint: [1.1, 0.9, 0.9], saturation: 1.05, contrast: 1.12, bloom: 1.1, vignette: 0.8, grain: 0.06 },
      update(dt, t) {
        povo.update(t, 1);
        fumaca.update(dt);
        holo(t);
      }
    };
  };

  // ---------- BALADA YARD / JAMES (Cap. 14) ----------
  BUILDERS.balada = (o = {}) => {
    const THREE = T();
    const { box, plane, M, textures, neonSign, createParticles } = L();
    const g = new THREE.Group();
    sala(g, { w: 22, d: 16, h: 6.5, z0: -8, piso: M.std('#ffffff', 0.25, 0.5, { map: textures.danceFloor(['#ec4899', '#22d3ee', '#a3e635', '#1e293b']) }), parede: M.std('#0a0a12', 0.95), tetoMat: M.std('#030306', 1) });
    // Painel de LED animado
    const ledTex = L().makeCanvasTex(512, 256, () => { });
    ledTex.wrapS = THREE.ClampToEdgeWrapping;
    const painel = plane(12, 5, M.basic('#ffffff', { map: ledTex }), 0, 3.2, -7.9);
    painel.material.color.multiplyScalar(1.6);
    g.add(painel);
    // Lasers
    const lasers = [];
    for (let i = 0; i < 8; i++) {
      const piv = new THREE.Group();
      piv.position.set(-6 + i * 1.7, 6.2, -6);
      const raio = box(0.025, 0.025, 18, M.glow(i % 2 ? '#22d3ee' : '#a3e635', 6, { additive: true, transparent: true, opacity: 0.8 }), 0, 0, 9, { cast: false });
      piv.add(raio);
      g.add(piv);
      lasers.push({ piv, ph: i });
    }
    // Bar e camarote
    g.add(box(6, 1.1, 0.9, M.std('#111827', 0.3, 0.5), -7, 0.55, -2));
    g.add(box(6, 0.04, 0.9, M.glow('#ec4899', 2), -7, 1.12, -2, { cast: false }));
    g.add(box(4, 0.5, 1.4, M.std('#4c1d95', 0.9), 7, 0.4, -4));
    const neon = neonSign(o.kpop ? 'K-POP' : 'YARD', o.kpop ? '#f472b6' : '#a3e635', 2.6, 1, { size: 200, font: '"Arial Black", sans-serif' });
    neon.position.set(-7, 3.2, -7.85);
    g.add(neon);
    const neon2 = neonSign(o.kpop ? '♥ LIGHTSTICK ♥' : 'JAMES', o.kpop ? '#a78bfa' : '#ec4899', 2.6, 1, { size: o.kpop ? 120 : 200, font: '"Arial Black", sans-serif' });
    neon2.position.set(7, 3.2, -7.85);
    g.add(neon2);
    const povo = multidao(g, 50, [-8, 8, -6, -2.2], ['#0f172a', '#831843', '#164e63', '#3f6212', '#1e1b4b']);
    const holo = holofotes(g, 6, ['#ec4899', '#22d3ee', '#a3e635'], 6.2, 8);
    const confete = createParticles({ count: 120, size: 0.09, shape: 'square', colors: ['#ec4899', '#22d3ee', '#a3e635', '#fde047'], intensity: 1.6, ambient: { center: [0, 4, -3], size: [14, 6, 8], vel: [[-0.3, -1.2, -0.3], [0.3, -0.6, 0.3]], fromTop: true, sway: 1.2 }, life: [4, 6] });
    g.add(confete.points);
    const luzA = luz('#ec4899', 14, 16, 1.2);
    luzA.position.set(-4, 4, -2);
    const luzB = luz('#22d3ee', 14, 16, 1.2);
    luzB.position.set(4, 4, -2);
    g.add(luzA, luzB);
    let ledT = 0;
    return {
      group: g,
      slots: { L: [-1.5, 0, 1.2], R: [1.5, 0, 1.2], C: [0, 0, 1.2] },
      cam: { pos: [0, 1.75, 7.2], look: [0, 1.6, 0] },
      bg: 0x030308,
      fog: [0x0c0618, 0.03],
      luz: { sky: '#5b21b6', ground: '#0a0612', hemi: 0.45, key: '#c4b5fd', keyI: 0.5, keyPos: [0, 10, 6] },
      grade: { tint: [1.0, 0.95, 1.08], saturation: 1.25, contrast: 1.06, bloom: 1.3, vignette: 0.7 },
      update(dt, t) {
        povo.update(t, 1.3);
        holo(t);
        confete.update(dt);
        lasers.forEach((l) => {
          l.piv.rotation.x = 0.5 + Math.sin(t * 1.3 + l.ph) * 0.35;
          l.piv.rotation.y = Math.sin(t * 0.9 + l.ph * 0.7) * 0.6;
        });
        const b = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.1)), 6);
        luzA.intensity = 8 + b * 16;
        luzB.intensity = 8 + (1 - b) * 12;
        ledT += dt;
        if (ledT > 0.07) {
          ledT = 0;
          const ctx = ledTex.userData.ctx;
          const c = ledTex.userData.canvas;
          ctx.fillStyle = '#05050a';
          ctx.fillRect(0, 0, c.width, c.height);
          for (let x = 0; x < 32; x++) {
            const hgt = (0.3 + 0.7 * Math.abs(Math.sin(t * 3 + x * 0.4) * Math.cos(t * 1.7 + x * 0.13))) * c.height;
            const grd = ctx.createLinearGradient(0, c.height, 0, c.height - hgt);
            grd.addColorStop(0, '#ec4899');
            grd.addColorStop(1, '#22d3ee');
            ctx.fillStyle = grd;
            ctx.fillRect(x * 16 + 2, c.height - hgt, 12, hgt);
          }
          ledTex.needsUpdate = true;
        }
      }
    };
  };

  // ---------- SAFEPOINT · R. Mercedes Seiler Rocha (rua 3D completa, ver RuaSafepoint3D.js) ----------
  BUILDERS.safepoint = (o = {}) => {
    if (root.LuiggiRuaSafepoint) return root.LuiggiRuaSafepoint.construir(o);
    return BUILDERS.mirante(o);
  };

  // ---------- MIRANTE NOTURNO (Safepoint antigo; reserva caso a rua não esteja carregada) ----------
  BUILDERS.mirante = (o = {}) => {
    const THREE = T();
    const { box, plane, M, textures, createSubaruMesh, createParticles, addHeadlights } = L();
    const g = new THREE.Group();
    ceu(g, [
      [0, '#020410'],
      [0.5, '#0b1230'],
      [0.75, '#1e2a5a'],
      [1, '#3a2a5a']
    ]);
    estrelas(g, 700, 110);
    const chao = plane(60, 60, M.std('#ffffff', 0.55, 0.15, { map: textures.asphalt(10, 10, { lines: false, base: '#1a1d24' }) }), 0, 0, 0);
    chao.rotation.x = -Math.PI / 2;
    g.add(chao);
    // Vagas pintadas
    for (let i = -3; i <= 3; i++) g.add(box(0.08, 0.005, 4, M.std('#e5e7eb', 0.6), i * 3, 0.005, -2, { cast: false, receive: true }));
    // Guard-rail na beira do mirante
    for (let i = -10; i <= 10; i++) g.add(box(0.12, 0.7, 0.12, M.std('#9ca3af', 0.4, 0.6), i * 1.6, 0.35, -8));
    g.add(box(34, 0.25, 0.08, M.std('#d1d5db', 0.3, 0.8), 0, 0.6, -8));
    // Cidade lá embaixo
    cidade(g, { n: 70, raio: 55, a0: -Math.PI * 0.98, a1: -Math.PI * 0.02, y: -14, hMin: 4, hMax: 26, lit: 0.42 });
    // Luzes de rua da cidade (bokeh)
    const bokeh = createParticles({ count: 260, size: 0.9, colors: ['#fbbf24', '#f97316', '#fde68a', '#93c5fd'], intensity: 1.4, ambient: { center: [0, -10, -55], size: [110, 4, 40], vel: [[-0.02, 0, -0.02], [0.02, 0, 0.02]] }, life: [6, 12] });
    g.add(bokeh.points);
    let sub = null;
    if (!o.semSubaru) {
      sub = createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', !!root.LuiggiSave?.state?.subaruMods?.neon);
      sub.position.set(0, 0, -3.2);
      sub.rotation.y = o.rotSubaru ?? Math.PI * 0.82;
      g.add(sub);
      if (o.farois !== false) addHeadlights(sub, 18, 22);
    }
    poste(g, -7, -6, '#ffc074', { lado: 1, intensidade: 18, altura: 5.5 });
    poste(g, 8, -6, '#ffc074', { lado: -1, intensidade: 14, altura: 5.5 });
    return {
      group: g,
      subaru: sub,
      slots: { L: [-1.5, 0, 0.8], R: [1.5, 0, 0.8], C: [0, 0, 0.8] },
      cam: { pos: [5.5, 2.2, 5], look: [0, 0.9, -3] },
      bg: 0x020410,
      fog: [0x0b1028, 0.012],
      luz: { sky: '#3b4a8a', ground: '#0c0c14', hemi: 0.5, key: '#a5b8ff', keyI: 0.7, keyPos: [-10, 14, 8] },
      grade: { tint: [0.96, 0.98, 1.08], saturation: 1.1, bloom: 1.0, vignette: 0.7 },
      update(dt) {
        bokeh.update(dt);
      }
    };
  };

  // ---------- INTERIOR DO SUBARU (cenas de história dentro do carro) ----------
  function interiorSubaru(g) {
    const THREE = T();
    const carro = new THREE.Group();
    g.add(carro);
    const pov = root.LuiggiSubaruPOV?.construirInterior?.({ estatico: true });
    if (pov) carro.add(pov.group);
    return { carro, pov };
  }

  const ASSENTOS_SUBARU = {
    L: [-0.42, 0.3, 0.1],
    R: [0.42, 0.3, 0.1],
    TL: [-0.4, 0.32, 1.12],
    TR: [0.4, 0.32, 1.12],
    TC: [0.02, 0.32, 1.12],
    FORA: [1.75, -0.35, 0.2]
  };

  BUILDERS.subaru_noite = (o = {}) => {
    const THREE = T();
    const { M, plane, textures, box, halo } = L();
    const g = new THREE.Group();
    const dia = !!o.dia;
    const { carro, pov } = interiorSubaru(g);
    // Rua passando pelas janelas
    const rua = plane(16, 400, M.std('#ffffff', 0.6, 0.1, { map: textures.asphalt(2, 60) }), 0, -0.25, -150);
    rua.rotation.x = -Math.PI / 2;
    g.add(rua);
    const postes = [];
    for (let i = 0; i < 12; i++) {
      const pg = new THREE.Group();
      [-1, 1].forEach((s) => {
        pg.add(box(0.12, 5, 0.12, M.std('#2d3340', 0.6, 0.6), s * 5, 2.2, 0));
        pg.add(box(0.5, 0.12, 0.25, M.glow(dia ? '#e5e7eb' : '#ffb35c', dia ? 0.6 : 3), s * 4.5, 4.6, 0, { cast: false }));
        if (!dia) {
          const h = halo('#ffb35c', 2.2, 1.0);
          h.position.set(s * 4.5, 4.4, 0);
          pg.add(h);
        }
      });
      pg.position.z = -i * 14;
      g.add(pg);
      postes.push(pg);
    }
    const predios = new THREE.Group();
    g.add(predios);
    cidade(predios, { n: 50, linha: [-200, 200], z: -60, prof: 20, hMin: 8, hMax: 30, lit: dia ? 0.05 : 0.35 });
    if (dia) ceu(g, [[0, '#7cb7ff'], [0.6, '#cfe6ff'], [1, '#f1f5f9']]);
    const luzInterna = new THREE.PointLight(dia ? '#ffffff' : '#7aa2ff', dia ? 2 : 1.4, 3, 1.4);
    luzInterna.position.set(0, 1.4, 0.4);
    g.add(luzInterna);
    return {
      group: g,
      ancora: carro,
      pov, // interior interativo (compartimento dos Tic Tacs, volante, porta-luvas...)
      assentos: ASSENTOS_SUBARU,
      slots: { L: ASSENTOS_SUBARU.L, R: ASSENTOS_SUBARU.R, C: ASSENTOS_SUBARU.TC },
      alturaCarta: 1.05,
      cam: { pos: [0.05, 1.4, -0.84], look: [-0.02, 0.98, 0.9] },
      fov: 62,
      camRaio: 0.35,
      bg: dia ? 0xbfdcff : 0x05070f,
      fog: [dia ? 0xd7e7ff : 0x0a0f1f, dia ? 0.012 : 0.03],
      luz: dia
        ? { sky: '#ffffff', ground: '#8a8a8a', hemi: 1.4, key: '#fff6e0', keyI: 2.2, keyPos: [6, 12, -4], fillI: 0.7 }
        : { sky: '#4a5a9a', ground: '#111', hemi: 0.6, key: '#ffb35c', keyI: 0.6, keyPos: [-4, 6, -6], fillI: 0.55, fill: '#9fb4ff' },
      grade: dia ? { exposure: 1.05, saturation: 1.05 } : { tint: [0.98, 0.98, 1.06], vignette: 0.75, bloom: 1.0 },
      update(dt, t) {
        if (o.parado) return;
        postes.forEach((p) => {
          p.position.z += dt * 16;
          if (p.position.z > 10) p.position.z -= 12 * 14;
        });
        carro.position.y = Math.sin(t * 9) * 0.004;
        carro.rotation.z = Math.sin(t * 0.7) * 0.004;
      }
    };
  };

  BUILDERS.subaru_sonho = () => {
    const THREE = T();
    const { M, sphere, createParticles, plane, textures, createCapybaraMesh } = L();
    const g = new THREE.Group();
    ceu(g, [[0, '#1e1b4b'], [0.35, '#7e22ce'], [0.6, '#f472b6'], [0.8, '#fdba74'], [1, '#fde68a']]);
    estrelas(g, 400, 100, '#ffffff', 0.25);
    g.add(sphere(8, M.glow('#fff1f2', 1.4), -30, 30, -80, 32));
    // Estrada flutuante dos sonhos sob o carro
    const estradaTex = textures.asphalt(1, 40, { base: '#3b2b6b' });
    const estrada = plane(7, 300, M.std('#ffffff', 0.4, 0.2, { map: estradaTex, emissive: '#7c3aed', emissiveIntensity: 0.2 }), 0, -0.3, -120);
    estrada.rotation.x = -Math.PI / 2;
    g.add(estrada);
    const nuvens = [];
    for (let i = 0; i < 26; i++) {
      const n = new THREE.Group();
      for (let k = 0; k < 4; k++) n.add(sphere(1 + Math.random() * 1.2, M.toon('#fdf4ff', { emissive: '#f5d0fe', emissiveIntensity: 0.35 }), k * 1.4, Math.random() * 0.6, Math.random() * 0.8, 10));
      n.position.set((Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 18), -3 + Math.random() * 9, -Math.random() * 120);
      g.add(n);
      nuvens.push(n);
    }
    const capivaras = [];
    for (let i = 0; i < 3; i++) {
      const c = createCapybaraMesh();
      c.scale.setScalar(0.8);
      c.position.set((i % 2 ? 1 : -1) * (6 + i * 3), 3 + i * 2, -20 - i * 25);
      c.rotation.y = Math.PI / 2;
      g.add(c);
      capivaras.push(c);
    }
    const { carro, pov } = interiorSubaru(g);
    // No sonho ninguém senta no banco do passageiro: some com ele para enxergar Luis e Sol atrás
    pov?.group.children.forEach((c) => {
      if (c.type === 'Group' && Math.abs(c.position.x - 0.42) < 0.01) c.visible = false;
    });
    const brilhos = createParticles({ count: 160, size: 0.12, shape: 'spark', colors: ['#fde68a', '#f9a8d4', '#c4b5fd'], intensity: 2, ambient: { center: [0, 2, -10], size: [20, 8, 30], vel: [[-0.1, 0.05, 1], [0.1, 0.3, 3]] }, life: [3, 6] });
    g.add(brilhos.points);
    const luzRosa = new THREE.PointLight('#f9a8d4', 2.4, 4, 1.3);
    luzRosa.position.set(0, 1.4, 0.6);
    g.add(luzRosa);
    return {
      group: g,
      ancora: carro,
      pov,
      assentos: ASSENTOS_SUBARU,
      slots: { L: ASSENTOS_SUBARU.L, R: ASSENTOS_SUBARU.TR, C: ASSENTOS_SUBARU.TL },
      alturaCarta: 1.05,
      cam: { pos: [0.08, 1.42, -0.84], look: [-0.1, 0.98, 0.95] },
      fov: 64,
      camRaio: 0.35,
      bg: 0x7e22ce,
      fog: [0xd8b4fe, 0.01],
      luz: { sky: '#fbcfe8', ground: '#6d28d9', hemi: 1.3, key: '#fff1f2', keyI: 1.4, keyPos: [-8, 12, 6], fillI: 0.7, fill: '#f5d0fe' },
      grade: { tint: [1.05, 0.95, 1.08], saturation: 1.2, bloom: 1.1, aberration: 0.25, lift: [0.04, 0.0, 0.06] },
      drift: 0,
      update(dt, t) {
        estradaTex.offset.y -= dt * 2.4;
        brilhos.update(dt);
        nuvens.forEach((n) => {
          n.position.z += dt * 14;
          if (n.position.z > 12) n.position.z -= 130;
        });
        capivaras.forEach((c, i) => {
          c.position.z += dt * (9 + i);
          c.position.y += Math.sin(t * 2 + i) * 0.01;
          if (c.position.z > 15) c.position.z -= 90;
          c.children.forEach((w) => (w.name === 'asaE' || w.name === 'asaD') && (w.rotation.x = Math.sin(t * 16 + i) * 0.6));
        });
        // Balanço do drift dos sonhos
        const d = this.drift || 0;
        carro.rotation.y = Math.sin(t * 0.5) * 0.05 + d;
        carro.rotation.z = Math.sin(t * 0.8) * 0.02 - d * 0.3;
        carro.position.y = Math.sin(t * 1.3) * 0.03;
      }
    };
  };

  BUILDERS.subaru_fora = () => {
    // Subaru estacionado na frente da academia, à noite, balançando com os vidros embaçados (Cap. 4)
    const env = BUILDERS.centro_noite({ garoa: false });
    const sub = env.subaru;
    sub.position.set(0.6, 0, -1.5);
    sub.rotation.y = -0.5;
    sub.traverse((m) => {
      if (m.isMesh && m.material && m.material.transparent && m.material.opacity > 0.8 && m.material.opacity < 0.95) {
        m.material = m.material.clone();
        m.material.color.set('#d7dde8');
        m.material.opacity = 0.92;
        m.material.roughness = 0.9;
      }
    });
    const base = env.update;
    env.cam = { pos: [3.6, 1.8, 4.6], look: [0.4, 0.8, -1.5] };
    env.slots = { L: [-6, 0, 6], R: [6, 0, 6], C: [0, 0, 8] };
    env.semElenco = true;
    env.update = function (dt, t) {
      base.call(env, dt, t);
      sub.rotation.z = Math.sin(t * 7) * 0.025;
      sub.position.y = Math.abs(Math.sin(t * 7)) * 0.03;
    };
    return env;
  };

  // ---------- ANIVERSÁRIO DA SOL · QUINTAL COM PISCINA (Cap. 14, bônus) ----------
  BUILDERS.festa_piscina = () => {
    const THREE = T();
    const { box, cyl, plane, sphere, M, textures, halo, makeCanvasTex } = L();
    const g = new THREE.Group();
    ceu(g, [[0, '#05071a'], [0.55, '#0d1433'], [1, '#1b2350']]);
    estrelas(g, 380, 100, '#ffffff', 0.15);

    // Gramado + deck de madeira em volta da piscina
    const grama = plane(40, 40, M.std('#1f4d2b', 0.95), 0, 0, -6);
    grama.rotation.x = -Math.PI / 2;
    g.add(grama);
    const deck = plane(10, 8.6, M.std('#ffffff', 0.7, 0, { map: textures.wood('#7a5134', 4, 3) }), 0, 0.01, -2.6);
    deck.rotation.x = -Math.PI / 2;
    g.add(deck);

    // Piscina no meio: borda de pedra + água iluminada com ondinhas animadas
    const pedra = M.std('#d6d3d1', 0.8);
    const px = 0;
    const pz = -3.2;
    const pw = 5.2;
    const pd = 2.8;
    g.add(box(pw + 0.5, 0.08, 0.25, pedra, px, 0.04, pz - pd / 2 - 0.12));
    g.add(box(pw + 0.5, 0.08, 0.25, pedra, px, 0.04, pz + pd / 2 + 0.12));
    g.add(box(0.25, 0.08, pd, pedra, px - pw / 2 - 0.12, 0.04, pz));
    g.add(box(0.25, 0.08, pd, pedra, px + pw / 2 + 0.12, 0.04, pz));
    const aguaTex = makeCanvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(224,247,255,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        const y0 = Math.random() * h;
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y0 + Math.sin(x * 0.06 + i) * 6);
        ctx.stroke();
      }
    });
    aguaTex.wrapS = aguaTex.wrapT = THREE.RepeatWrapping;
    aguaTex.repeat.set(2, 1.2);
    const agua = plane(pw, pd, M.glow('#7dd3fc', 1.25, { map: aguaTex }), px, 0.03, pz);
    agua.rotation.x = -Math.PI / 2;
    agua.userData.noOutline = true;
    g.add(agua);
    const luzPiscina = luz('#38bdf8', 9, 7, 1.3);
    luzPiscina.position.set(px, 0.5, pz);
    g.add(luzPiscina);
    // Boia de rosquinha boiando
    const boia = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 10, 24), M.toon('#f472b6'));
    boia.rotation.x = -Math.PI / 2;
    boia.position.set(px + 1.4, 0.08, pz + 0.3);
    g.add(boia);

    // Casa ao fundo com janelas acesas e porta de vidro
    const fachada = box(14, 4.2, 0.4, M.std('#e7dccb', 0.9), 0, 2.1, -7.4);
    g.add(fachada);
    g.add(box(14.6, 0.25, 1.2, M.std('#57534e', 0.7), 0, 4.3, -7.1));
    [-4.6, 4.6].forEach((x) => {
      const j = plane(1.6, 1.2, M.glow('#fde68a', 1.4), x, 2.3, -7.18);
      j.userData.noOutline = true;
      g.add(j);
      const h = halo('#fcd34d', 1.6, 0.6);
      h.position.set(x, 2.3, -7.0);
      g.add(h);
    });
    const porta = plane(2.4, 2.4, M.glow('#fef3c7', 1.1), 0, 1.2, -7.18);
    porta.userData.noOutline = true;
    g.add(porta);
    const luzCasa = luz('#ffd59a', 8, 9, 1.4);
    luzCasa.position.set(0, 2, -6.2);
    g.add(luzCasa);

    // Varal de luzinhas cruzando o quintal
    const luzinhas = [];
    [-5.6, -1.2].forEach((zv) => {
      for (let i = 0; i < 16; i++) {
        const x = -5.5 + i * 0.73;
        const y = 3.3 - Math.sin((i / 15) * Math.PI) * 0.5;
        const cor = ['#fde68a', '#f9a8d4', '#a5f3fc', '#bbf7d0'][i % 4];
        const b = sphere(0.045, M.glow(cor, 3.2), x, y, zv, 6);
        g.add(b);
        const h = halo(cor, 0.4, 0.8);
        h.position.set(x, y, zv);
        g.add(h);
        luzinhas.push(b);
      }
    });

    // Mesa do bolo (à esquerda) com o famoso bolo VERDE
    const toalha = M.std('#fafafa', 0.9);
    g.add(box(1.6, 0.06, 0.8, toalha, -3.4, 0.78, -0.4));
    [[-0.7, -0.32], [0.7, -0.32], [-0.7, 0.32], [0.7, 0.32]].forEach(([dx, dz]) => g.add(box(0.05, 0.76, 0.05, M.std('#44403c', 0.6), -3.4 + dx, 0.38, -0.4 + dz)));
    const verde = M.std('#22c55e', 0.45, 0, { emissive: '#16a34a', emissiveIntensity: 0.35 });
    g.add(cyl(0.38, 0.4, 0.26, verde, -3.4, 0.94, -0.4, 28));
    g.add(cyl(0.27, 0.29, 0.2, verde, -3.4, 1.17, -0.4, 28));
    // Gotas de cobertura escorrendo
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const gota = sphere(0.05, verde, -3.4 + Math.cos(a) * 0.39, 0.86, -0.4 + Math.sin(a) * 0.39, 6);
      gota.scale.set(1, 1.8, 1);
      g.add(gota);
    }
    const chamas = [];
    [-0.12, 0, 0.12].forEach((dx) => {
      g.add(cyl(0.012, 0.012, 0.14, M.std('#f472b6', 0.5), -3.4 + dx, 1.34, -0.4, 6));
      const ch = sphere(0.025, M.glow('#fbbf24', 4), -3.4 + dx, 1.43, -0.4, 6);
      g.add(ch);
      chamas.push(ch);
    });
    const hBolo = halo('#fbbf24', 0.8, 0.9);
    hBolo.position.set(-3.4, 1.45, -0.4);
    g.add(hBolo);
    // Pratinhos sujos de verde
    [[-3.95, -0.25], [-2.85, -0.55]].forEach(([x, z]) => {
      g.add(cyl(0.12, 0.12, 0.015, M.std('#ffffff', 0.6), x, 0.82, z, 16));
      g.add(cyl(0.05, 0.05, 0.02, verde, x, 0.83, z, 10));
    });

    // Cadeiras de piscina e cerca viva nas laterais
    [3.6, 4.6].forEach((x) => {
      const esp = box(0.6, 0.08, 1.6, M.std('#f8fafc', 0.6), x, 0.35, -2.6);
      esp.rotation.x = -0.08;
      g.add(esp);
    });
    [-1, 1].forEach((s) => g.add(box(0.6, 1.4, 12, M.toon('#14532d'), s * 6.8, 0.7, -2)));

    return {
      group: g,
      slots: { L: [-1.5, 0, 1.0], R: [1.5, 0, 1.0], C: [0, 0, 1.2], TL: [-0.75, 0, 0.15], TR: [0.75, 0, 0.15] },
      cam: { pos: [0, 1.9, 7.4], look: [0, 1.35, -1.5] },
      bg: 0x05071a,
      fog: [0x0b1028, 0.025],
      luz: { sky: '#6b7bd6', ground: '#10241a', hemi: 0.5, key: '#ffd8a8', keyI: 0.6, keyPos: [-5, 10, 6] },
      grade: { tint: [1.0, 1.0, 1.04], saturation: 1.12, bloom: 1.0, vignette: 0.6 },
      update(dt, t) {
        aguaTex.offset.x = (t * 0.03) % 1;
        aguaTex.offset.y = Math.sin(t * 0.4) * 0.05;
        boia.position.y = 0.08 + Math.sin(t * 1.6) * 0.02;
        boia.rotation.z = t * 0.15;
        luzPiscina.intensity = 9 + Math.sin(t * 1.3) * 1.2;
        chamas.forEach((c, i) => c.scale.setScalar(1 + Math.sin(t * 13 + i * 2) * 0.25));
        luzinhas.forEach((b, i) => (b.visible = Math.sin(t * 1.5 + i * 0.9) > -0.85));
      }
    };
  };

  // ------------------------------------------------------------------
  // MAPA CAPÍTULO -> CENÁRIO
  // ------------------------------------------------------------------
  const CAPITULOS = {
    0: ['cozinha'],
    1: ['sala_aula'],
    2: ['quarto_estudio'],
    3: ['corredor'],
    4: ['academia'],
    5: ['bec_bar'],
    6: ['centro_noite'],
    7: ['apartamento'],
    8: ['sad_baile'],
    9: ['cafe'],
    10: ['emily_doces'],
    11: ['sonho'],
    12: ['academia', { gotica: true }],
    13: ['galpao'],
    14: ['balada'],
    15: ['cozinha', { amanhecer: true }]
  };

  function build(nome, opts) {
    const fn = BUILDERS[nome] || BUILDERS.safepoint;
    let env;
    try {
      env = fn(opts || {});
    } catch (e) {
      // Um cenário quebrado não pode travar a história com a tela preta: cai no Safepoint
      console.error(`[Luiggi3DEnv] erro ao montar o cenário "${nome}":`, e);
      if (fn === BUILDERS.mirante) throw e;
      env = fn === BUILDERS.safepoint ? BUILDERS.mirante({}) : BUILDERS.safepoint({});
    }
    env.nome = nome;
    env.update = env.update || (() => { });
    return env;
  }

  function paraCapitulo(capId) {
    const [nome, opts] = CAPITULOS[capId] || ['safepoint'];
    return build(nome, opts);
  }

  function aplicar(stage, env) {
    const THREE = T();
    stage.scene.background = new THREE.Color(env.bg ?? 0x090d1a);
    if (env.fog) stage.scene.fog = new THREE.FogExp2(env.fog[0], env.fog[1]);
    else stage.scene.fog = null;
    const l = env.luz || {};
    if (stage.hemiLight) {
      stage.hemiLight.color.set(l.sky || '#93c5fd');
      stage.hemiLight.groundColor.set(l.ground || '#1e293b');
      stage.hemiLight.intensity = l.hemi ?? 0.8;
    }
    if (stage.fillLight) {
      stage.fillLight.color.set(l.fill || l.sky || '#dfe8ff');
      stage.fillLight.intensity = l.fillI ?? 0.45;
    }
    if (stage.dirLight) {
      stage.dirLight.color.set(l.key || '#fef3c7');
      stage.dirLight.intensity = l.keyI ?? 1.4;
      stage.dirLight.position.set(...(l.keyPos || [12, 22, 14]));
    }
    stage.setGrade({
      bloom: 0.7,
      threshold: 1.05,
      exposure: 1,
      vignette: 0.55,
      grain: 0.035,
      saturation: 1.08,
      contrast: 1.04,
      aberration: 0,
      scanlines: 0,
      sepia: 0,
      tint: [1, 1, 1],
      lift: [0, 0, 0],
      fadeAmt: 0,
      flash: 0,
      ...(env.grade || {})
    });
  }

  root.Luiggi3DEnv = { build, paraCapitulo, aplicar, CAPITULOS, helpers: { luz, instanced, sala, ceu, estrelas, cidade, poste, lampadaPendente, multidao, holofotes, mesaComCadeiras, janela, vistaNoturna, vistaAmanhecer } };
})(window);
