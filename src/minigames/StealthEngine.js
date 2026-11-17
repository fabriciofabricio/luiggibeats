/**
 * src/minigames/StealthEngine.js
 * Furtividade em 3D com cones de visão (mesma lógica 2D original em coordenadas 720x410):
 *  - centro_3h (Cap. 6: Sobrevivência: Centro 3h) — rua do Centro, lanterna, medo, sacola plástica.
 *  - baile (Cap. 8: Esconde-Esconde no Sad Baile) — Rebeca procurando com cone de visão.
 *  - ponto_cego (Cap. 14: Operação Ponto Cego) — bloquear a visão da Tutuluiza para Fabricio e Lara.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;
  const U = () => root.Luiggi3D.U;

  const TITULOS = {
    centro_3h: ['Sobrevivência: Centro 3h da Manhã', '🔦', 6, '#f59e0b', 'centro_noite'],
    baile: ['Esconde-Esconde no Sad Baile', '💃', 8, '#ec4899', 'sad_baile'],
    ponto_cego: ['OPERAÇÃO PONTO CEGO (James)', '🕶️', 14, '#facc15', 'balada']
  };

  /** Leque de visão desenhado no chão. */
  function cone(THREE, raio, spread, cor) {
    const geo = new THREE.CircleGeometry(raio, 32, -spread, spread * 2);
    geo.rotateX(-Math.PI / 2);
    const tex = L().textures.radial('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.05)', 128);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(1.5), map: tex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.y = 0.03;
    m.userData.noOutline = true;
    return m;
  }

  function abrirFurtividade(modo = 'centro_3h') {
    const [titulo, icone, cap, cor, ambiente] = TITULOS[modo] || TITULOS.centro_3h;
    const save = root.LuiggiSave;
    const idMg = { centro_3h: 'sobrevivencia_centro', baile: 'esconde_esconde_baile', ponto_cego: 'operacao_ponto_cego' }[modo];
    const kit = root.LuiggiKit.abrir({ id: idMg, titulo, icone, capitulo: cap, cor, ambiente, max: 1000 });
    const { stage, env, THREE } = kit;
    const cam = stage.camera;
    const W = 720;
    const H = 410;
    const S = 0.032;
    // Centro: mapa girado ao longo da rua (x do mapa -> -z do mundo). Baile/James: x -> x, y -> z.
    const rua = modo === 'centro_3h';
    const to3 = (px, py) => (rua ? new THREE.Vector3((py - 205) * S, 0, -(px - 360) * S) : new THREE.Vector3((px - 360) * S, 0, (py - 205) * S - 1.2));
    const ang3 = (a) => (rua ? -a - Math.PI : -a + Math.PI / 2);

    const keys = {};
    const luis = { x: 65, y: 210, speed: 3.1 };
    let frame = 0;
    const luisB = kit.boneco('luis', [0, 0, 0], 0, { escala: 0.9 });

    // Estado
    let battery = 5.0;
    let fear = 0;
    let spottedCount = 0;
    let timeLeft = modo === 'baile' ? 22 : modo === 'ponto_cego' ? 32 : 999;
    const sacola = { x: 290, y: 200, vx: 1.5, vy: 0.9 };
    const subaruPos = { x: 645, y: 205 };
    const pilaresBaile = [
      { x: 190, y: 120, w: 54, h: 90, label: 'Pilar' },
      { x: 360, y: 230, w: 90, h: 44, label: 'Bar' },
      { x: 520, y: 110, w: 50, h: 55, label: 'Caixa Som' },
      { x: 250, y: 295, w: 28, h: 28, label: 'Fabricio' }
    ];
    const rebeca = { x: 480, y: 240, ang: Math.PI, dir: 1 };
    const tutuluiza = { x: 130, y: 205, ang: 0, distTimer: 0 };
    const casal = { x: 560, y: 205, vx: 0, vy: 1.2 };
    const isabelaDom = { x: 350, y: 120, vx: 1.4, vy: 1.7 };
    let suspicion = 0;
    let fails = 0;
    let distCD = 0;

    // ---------- Montagem 3D por modo ----------
    const s3 = {};
    if (modo === 'centro_3h') {
      if (env.subaru) env.subaru.visible = false;
      const sub = L().createSubaruMesh(save?.state?.subaruMods?.cor || '#1245A8', false);
      sub.position.copy(to3(subaruPos.x, subaruPos.y));
      sub.rotation.y = Math.PI / 2;
      stage.scene.add(sub);
      s3.subaru = sub;
      const halo = L().halo('#60a5fa', 3, 0.6);
      halo.position.copy(sub.position).setY(1.2);
      stage.scene.add(halo);
      s3.haloSub = halo;
      // Zonas seguras (postes acesos) — mesmas da lógica original
      [[275, 175], [535, 195]].forEach(([x, y]) => {
        const p = to3(x, y);
        root.Luiggi3DEnv.helpers.poste(stage.scene, p.x - 1, p.z, '#ffd27a', { lado: 1, altura: 4.2, intensidade: 14, cone: 0.09 });
        const zona = new THREE.Mesh(new THREE.CircleGeometry(95 * S, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(0.5), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
        zona.rotation.x = -Math.PI / 2;
        zona.position.set(p.x, 0.02, p.z);
        stage.scene.add(zona);
      });
      // Sacola plástica voando
      const bag = new THREE.Group();
      const corpo = L().sphere(0.22, new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, transparent: true, opacity: 0.85 }), 0, 0, 0, 10);
      corpo.scale.set(1, 0.8, 0.7);
      bag.add(corpo);
      [-0.1, 0.1].forEach((x) => bag.add(L().box(0.04, 0.16, 0.02, corpo.material, x, 0.2, 0)));
      stage.scene.add(bag);
      s3.sacola = bag;
      // Lanterna do Luis
      const lant = new THREE.SpotLight('#fff3c4', 18, 9, 0.45, 0.5, 1.4);
      lant.position.set(0, 1.2, 0);
      lant.target.position.set(0, 0, 3);
      luisB.group.add(lant, lant.target);
      s3.lanterna = lant;
      stage.setGrade({ exposure: 0.85, vignette: 0.9 });
    } else if (modo === 'baile') {
      pilaresBaile.forEach((p) => {
        const c = to3(p.x + p.w / 2, p.y + p.h / 2);
        if (p.label === 'Fabricio') {
          const fab = kit.boneco('fabricio', [c.x, 0, c.z], 0.4, { escala: 0.9 });
          fab.setPose('dance_sad');
          return;
        }
        const mat = p.label === 'Bar' ? L().M.std('#111827', 0.3, 0.5) : p.label === 'Caixa Som' ? L().M.std('#18181b', 0.6) : L().M.std('#312e81', 0.45);
        const b = L().box(p.w * S, 2.1, p.h * S, mat, c.x, 1.05, c.z);
        stage.scene.add(b);
        if (p.label === 'Bar') stage.scene.add(L().box(p.w * S, 0.04, p.h * S, L().M.glow('#a855f7', 2), c.x, 2.12, c.z, { cast: false }));
      });
      s3.rebeca = kit.boneco('rebeca', [0, 0, 0], 0, { escala: 0.9 });
      s3.rebeca.setPose('walk', 0.6);
      s3.cone = cone(THREE, 250 * S, 0.35, '#ec4899');
      stage.scene.add(s3.cone);
    } else {
      s3.tutu = kit.boneco('tutuluiza', [0, 0, 0], 0, { escala: 0.9 });
      s3.cone = cone(THREE, 520 * S, 0.25, '#facc15');
      stage.scene.add(s3.cone);
      s3.fab = kit.boneco('fabricio', [0, 0, 0], 0, { escala: 0.9 });
      s3.lara = kit.boneco('lara', [0, 0, 0], 0, { escala: 0.9 });
      s3.fab.setPose('dance_sad');
      s3.lara.setPose('dance_sad');
      s3.isa = kit.boneco('isabela_dominik', [0, 0, 0], 0, { escala: 0.9 });
      s3.isa.setPose('dance', 1.3);
      // Linha de visão (raio) Tutuluiza -> casal
      s3.raio = L().box(0.04, 0.04, 1, L().M.glow('#facc15', 3, { transparent: true, opacity: 0.7 }), 0, 1.4, 0, { cast: false });
      stage.scene.add(s3.raio);
    }

    // ---------- Distrações (Ponto Cego) ----------
    if (modo === 'ponto_cego') {
      const distrair = (tipo) => {
        if (distCD > 0) return kit.msg('⏳ Espere um pouco antes da próxima distração.', '#94a3b8', 900);
        distCD = 220;
        tutuluiza.distTimer = 170;
        if (tipo === 'filme') kit.msg('🎬 "E aquele filme da A24?!" (Tutuluiza olha pro Luis!)', '#38bdf8', 1300);
        else if (tipo === 'selfie') kit.msg('🤳 "Selfie rápida!" (Ela olha pro celular!)', '#38bdf8', 1300);
        else if (tipo === 'dj') kit.msg('🎧 "Olha o DJ!" (Ela vira pro palco!)', '#38bdf8', 1300);
        else {
          tutuluiza.y = Math.max(90, tutuluiza.y - 40);
          kit.msg('🍹 "Bora ali no bar!" (Arriscado!)', '#fbbf24', 1300);
        }
        s3.tutu.setExpression('feliz');
      };
      kit.botoes([
        { label: '🎬 Assunto de Filme', tecla: '1', onClick: () => distrair('filme') },
        { label: '🤳 Selfie!', tecla: '2', onClick: () => distrair('selfie') },
        { label: '🎧 Olha o DJ!', tecla: '3', onClick: () => distrair('dj') },
        { label: '🍹 Pedir Drink', tecla: '4', onClick: () => distrair('drink') }
      ]);
      kit.tecla((e) => {
        const m = { Digit1: 'filme', Digit2: 'selfie', Digit3: 'dj', Digit4: 'drink' }[e.code];
        if (m) distrair(m);
      });
    }

    kit.tecla((e) => {
      keys[e.code] = true;
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    kit.tecla((e) => (keys[e.code] = false), 'keyup');
    // Joystick por toque/arraste no palco
    let toque = null;
    kit.on(stage.domElement, 'pointerdown', (e) => (toque = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }));
    kit.on(stage.domElement, 'pointermove', (e) => {
      if (!toque) return;
      toque.dx = U().clamp((e.clientX - toque.x) / 60, -1, 1);
      toque.dy = U().clamp((e.clientY - toque.y) / 60, -1, 1);
    });
    kit.on(window, 'pointerup', () => (toque = null));

    function pointInCone(px, py, ox, oy, ang, spread, range) {
      const dx = px - ox;
      const dy = py - oy;
      if (Math.hypot(dx, dy) > range) return false;
      let diff = Math.atan2(dy, dx) - ang;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return Math.abs(diff) <= spread;
    }
    function lineBlocked(ax, ay, bx, by, px, py, rad = 26) {
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= rad;
    }

    function encerrar(msg, ok) {
      if (save) save.salvarRecordeMinigame(`stealth_${modo}`, ok ? 1000 : 200);
      kit.fim(ok ? 1000 : 200, { max: 1000, titulo: ok ? 'Missão cumprida' : 'Fim', texto: msg, extra: { ok } });
    }

    let ativo = false;
    let andou = false;
    let ultimoAng = 0;
    function passo() {
      frame++;
      let dx = 0;
      let dy = 0;
      if (keys.ArrowLeft || keys.KeyA) dx -= 1;
      if (keys.ArrowRight || keys.KeyD) dx += 1;
      if (keys.ArrowUp || keys.KeyW) dy -= 1;
      if (keys.ArrowDown || keys.KeyS) dy += 1;
      if (toque) {
        dx += toque.dx;
        dy += toque.dy;
      }
      // No modo rua, "frente" do jogador é ao longo da rua
      if (rua) [dx, dy] = [-dy, dx];
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      andou = m > 0.1;
      if (andou) ultimoAng = Math.atan2(dy, dx);
      luis.x = Math.max(25, Math.min(W - 25, luis.x + dx * luis.speed));
      luis.y = Math.max(25, Math.min(H - 25, luis.y + dy * luis.speed));

      if (modo === 'centro_3h') {
        sacola.x += sacola.vx;
        sacola.y += sacola.vy;
        if (sacola.x < 120 || sacola.x > 600) sacola.vx *= -1;
        if (sacola.y < 50 || sacola.y > 360) sacola.vy *= -1;
        if (Math.hypot(luis.x - sacola.x, luis.y - sacola.y) < 34) {
          fear = Math.min(100, fear + 2.2);
          kit.conquista('medo_de_sacola');
          if (frame % 30 === 0) {
            kit.msg('😱 SUSTO! Era só uma sacola plástica!', '#f87171', 900);
            luisB.play('stumble', 0.5).setExpression('chocado');
            stage.shake(0.12, 8);
          }
        }
        const nearLight = Math.hypot(luis.x - 275, luis.y - 175) < 95 || Math.hypot(luis.x - 535, luis.y - 195) < 95;
        if (!nearLight) fear = Math.min(100, fear + 0.14);
        else fear = Math.max(0, fear - 0.35);
        battery = Math.max(1.0, battery - 0.006);
        if (fear >= 100) {
          fear = 0;
          luis.x = 65;
          luis.y = 210;
          kit.msg('💀 VOCÊ MORREU... brincadeira, o Luis só correu estilo Naruto de susto! Tenta de novo.', '#f87171', 2200);
        }
        if (Math.hypot(luis.x - subaruPos.x, luis.y - subaruPos.y) < 42) {
          ativo = false;
          if (battery <= 1.5) kit.conquista('um_porcento_bateria');
          kit.conquista('sobrevivente_centro');
          kit.conquista('tranca_tranca_tranca');
          for (let i = 0; i < 5; i++) kit.timeout(() => (kit.sfx('tranca'), kit.pop('CLACK!', { x: 40 + i * 5, y: 40 - i * 4 }, '#93c5fd')), i * 160);
          encerrar('Luis entrou no Subaru e trancou as portas 5 vezes: CLACK CLACK CLACK CLACK CLACK!', true);
          return;
        }
        kit.hud(kit.pill(`🪫 Lanterna: ${Math.ceil(battery)}%`) + kit.pill(`😱 Medo: ${Math.round(fear)}%`));
      } else if (modo === 'baile') {
        rebeca.ang += 0.024 * rebeca.dir;
        if (frame % 180 === 0) rebeca.dir *= -1;
        const escondido = pilaresBaile.some((p) => p.label !== 'Fabricio' && luis.x > p.x - 12 && luis.x < p.x + p.w + 12 && luis.y > p.y - 12 && luis.y < p.y + p.h + 12);
        const visto = !escondido && pointInCone(luis.x, luis.y, rebeca.x, rebeca.y, rebeca.ang, 0.35, 250);
        s3.vistoAgora = visto;
        if (visto && frame % 45 === 0) {
          spottedCount++;
          kit.msg('💖 Rebeca: "Te achei! Vem dançar!" (mas o jogo continua kkk)', '#f472b6', 1100);
          s3.rebeca.setExpression('feliz');
        }
        if (frame % 60 === 0) timeLeft--;
        kit.hud(kit.pill(`⏱️ ${timeLeft}s`) + kit.pill(`💖 Flagras: ${spottedCount}`) + (escondido ? kit.pill('🫥 Escondido') : ''));
        if (timeLeft <= 0) {
          ativo = false;
          if (spottedCount === 0) kit.conquista('fantasma_do_baile');
          encerrar(spottedCount === 0 ? 'Fantasma do Baile! Nem a Rebeca nem o segurança te acharam!' : 'No fim ela te achou do mesmo jeito!', true);
          return;
        }
      } else {
        if (distCD > 0) distCD--;
        if (tutuluiza.distTimer > 0) {
          tutuluiza.distTimer--;
          tutuluiza.ang = Math.atan2(luis.y - tutuluiza.y, luis.x - tutuluiza.x);
        } else tutuluiza.ang = Math.sin(frame * 0.025) * 0.55;
        casal.y += casal.vy;
        if (casal.y < 85 || casal.y > 330) casal.vy *= -1;
        if (frame % 260 === 0 && save) {
          save.incrementarContador('fabricioOlhouPraTras', 1);
          kit.msg('👀 Fabricio olhou pra trás: "tá dando certo?!"', '#fbbf24', 1000);
          s3.fab.play('wave', 0.8);
        }
        isabelaDom.x += isabelaDom.vx;
        isabelaDom.y += isabelaDom.vy;
        if (isabelaDom.x < 190 || isabelaDom.x > 520) isabelaDom.vx *= -1;
        if (isabelaDom.y < 60 || isabelaDom.y > 350) isabelaDom.vy *= -1;
        if (Math.hypot(luis.x - isabelaDom.x, luis.y - isabelaDom.y) < 30) {
          luis.y += isabelaDom.vy * 14;
          if (frame % 25 === 0 && save) {
            const tot = save.incrementarContador('empurroesDominik', 1);
            if (tot >= 5) kit.conquista('culpa_do_dominik');
            kit.msg('💃 Isabela Dominik empurrou sem querer dançando!', '#c084fc', 900);
            luisB.play('stumble', 0.5);
          }
        }
        const vendoCasal = tutuluiza.distTimer <= 0 && pointInCone(casal.x, casal.y, tutuluiza.x, tutuluiza.y, tutuluiza.ang, 0.25, 520);
        const bloqueando = lineBlocked(tutuluiza.x, tutuluiza.y, casal.x, casal.y, luis.x, luis.y, 30) || lineBlocked(tutuluiza.x, tutuluiza.y, casal.x, casal.y, isabelaDom.x, isabelaDom.y, 24);
        s3.vendo = vendoCasal;
        s3.bloqueando = bloqueando;
        if (vendoCasal && !bloqueando) {
          suspicion = Math.min(100, suspicion + 1.1);
          if (suspicion >= 100) {
            suspicion = 0;
            fails++;
            kit.msg('🚨 MISSÃO FRACASSADA! Tutuluiza quase viu! Reiniciando barra...', '#ef4444', 1400);
            stage.pulseGrade('flash', 0.4, 0.4, 0);
          }
        } else suspicion = Math.max(0, suspicion - 0.35);
        if (frame % 60 === 0) timeLeft--;
        kit.hud(kit.pill(`🎵 Música: ${timeLeft}s`) + kit.pill(`🕵️ Desconfiança: ${Math.round(suspicion)}%`) + (bloqueando ? kit.pill('🛡️ BLOQUEADO!') : ''));
        if (timeLeft <= 0) {
          ativo = false;
          kit.conquista('agente_secreto');
          if (fails === 0) kit.conquista('zero_desconfianca');
          if (save?.state?.contadores?.fabricioOlhouPraTras >= 10) kit.conquista('seguranca_particular');
          encerrar('🕶️ MISSÃO CUMPRIDA! O casal saiu de fininho sem a Tutuluiza ver!', true);
        }
      }
    }

    let acc = 0;
    const camAlvo = new THREE.Vector3();
    const lookAlvo = new THREE.Vector3();
    const look = new THREE.Vector3();
    kit.loop((dt, t) => {
      if (ativo) {
        acc += dt;
        while (acc >= 1 / 60) {
          acc -= 1 / 60;
          passo();
          if (!ativo) break;
        }
      }
      // Luis
      const p = to3(luis.x, luis.y);
      luisB.group.position.lerp(p, 0.5);
      luisB.setPose(andou ? (modo === 'baile' || modo === 'ponto_cego' ? 'sneak' : 'walk') : 'idle', 1.2);
      luisB.group.rotation.y = U().damp(luisB.group.rotation.y, ang3(ultimoAng), 10, dt);
      if (modo === 'centro_3h') {
        s3.sacola.position.copy(to3(sacola.x, sacola.y)).setY(0.6 + Math.sin(t * 7) * 0.25);
        s3.sacola.rotation.set(Math.sin(t * 3) * 0.6, t * 2, Math.cos(t * 4) * 0.4);
        s3.lanterna.intensity = 4 + battery * 3 + (Math.random() < 0.03 ? -4 : 0);
        s3.haloSub.scale.setScalar(2.6 + Math.sin(t * 3) * 0.4);
        stage.setGrade({ vignette: 0.85 + fear / 160, saturation: 1 - fear / 220 });
        kit.medidor('medo', '😱 Medo', fear / 100, { cor: fear > 70 ? '#ef4444' : '#f59e0b' });
        camAlvo.set(p.x + 1.4, 6.5, p.z + 6.2);
        lookAlvo.set(p.x, 0.6, p.z - 2.5);
      } else if (modo === 'baile') {
        const r = to3(rebeca.x, rebeca.y);
        s3.rebeca.group.position.copy(r);
        s3.rebeca.group.rotation.y = ang3(rebeca.ang);
        s3.cone.position.set(r.x, 0.03, r.z);
        s3.cone.rotation.y = -rebeca.ang;
        s3.cone.material.color.set(s3.vistoAgora ? '#ff2a6d' : '#ec4899').multiplyScalar(s3.vistoAgora ? 2.4 : 1.4);
        camAlvo.set(p.x * 0.4, 9.5, p.z + 7.5);
        lookAlvo.set(p.x * 0.5, 0, p.z - 0.6);
      } else {
        const tp = to3(tutuluiza.x, tutuluiza.y);
        s3.tutu.group.position.copy(tp);
        s3.tutu.group.rotation.y = ang3(tutuluiza.ang);
        s3.cone.position.set(tp.x, 0.03, tp.z);
        s3.cone.rotation.y = -tutuluiza.ang;
        s3.cone.material.color.set(tutuluiza.distTimer > 0 ? '#38bdf8' : s3.vendo && !s3.bloqueando ? '#ef4444' : '#facc15').multiplyScalar(1.5);
        const cp = to3(casal.x, casal.y);
        s3.fab.group.position.set(cp.x - 0.3, 0, cp.z);
        s3.lara.group.position.set(cp.x + 0.3, 0, cp.z);
        s3.fab.group.rotation.y = Math.PI / 2;
        s3.lara.group.rotation.y = -Math.PI / 2;
        s3.isa.group.position.copy(to3(isabelaDom.x, isabelaDom.y));
        // Raio de visão
        const meio = tp.clone().add(cp).multiplyScalar(0.5);
        s3.raio.position.set(meio.x, 1.4, meio.z);
        s3.raio.scale.z = tp.distanceTo(cp);
        s3.raio.lookAt(cp.x, 1.4, cp.z);
        s3.raio.visible = s3.vendo;
        s3.raio.material.color.set(s3.bloqueando ? '#38bdf8' : '#ef4444').multiplyScalar(3);
        kit.medidor('susp', '🕵️ Desconfiança da Tutuluiza', suspicion / 100, { cor: suspicion > 70 ? '#ef4444' : '#facc15' });
        camAlvo.set(0, 10.5, 7.5);
        lookAlvo.set(0, 0, -1.4);
      }
      U().dampVec3(cam.position, camAlvo, 3, dt);
      U().dampVec3(look, lookAlvo, 4, dt);
      cam.lookAt(look);
    });

    const intro = {
      centro_3h: '3h20 da manhã, sozinho no Centro. Chegue ao <b>Subaru</b> antes que o medo dispare! Fique perto da luz dos postes.',
      baile: 'Esconda-se da <b>Rebeca</b> atrás do pilar, do bar e da caixa de som. Fique fora do cone de visão!',
      ponto_cego: 'Fique entre a <b>Tutuluiza</b> e o casal (Fabricio e Lara) para bloquear a visão. Use distrações quando apertar!'
    }[modo];
    kit.intro(intro, ['⌨️ WASD / Setas', '🖱️ Arrastar no palco'].concat(modo === 'ponto_cego' ? ['⌨️ 1–4 distrações'] : [])).then(() => {
      ativo = true;
    });
    return kit.promessa;
  }

  root.LuiggiStealth = { abrirFurtividade };
})(window);
