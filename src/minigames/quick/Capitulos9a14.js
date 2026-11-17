/**
 * src/minigames/quick/Capitulos9a14.js
 * Minigames 3D: Latte Art (TNT e Rayssa), Detector de Red Flags, Créditos Infinitos (Nora),
 * Beijo no Drift (Sonho), Detetive do Instagram, Lembra Quando?
 */
(function (root) {
  'use strict';

  const Q = () => root.LuiggiQuickMinigames;
  const L = () => root.Luiggi3D;
  const U = () => root.Luiggi3D.U;

  function bolha(kit, quem, texto, x = 52, y = 14) {
    kit.layer.querySelectorAll('.mgk-bubble').forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'mgk-bubble';
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.innerHTML = `<span class="quem">${quem}</span>${texto}`;
    kit.layer.appendChild(b);
    return b;
  }

  // ======================================================================
  // 1. LATTE ART (Caps. 9 e 10)
  // ======================================================================
  function latteArt(id) {
    const rayssa = id === 'latte_art_rayssa';
    const kit = root.LuiggiKit.abrir({ id, titulo: rayssa ? 'Latte Art da Rayssa' : 'Latte Art no TNT', icone: '☕', capitulo: rayssa ? 10 : 9, cor: '#d97706', ambiente: rayssa ? 'emily_doces' : 'cafe', max: 1000 });
    const { stage, THREE } = kit;
    const { M, cyl } = L();
    const xicara = L().createCupMesh('vazio', { pires: 'madeira' });
    xicara.scale.setScalar(0.32);
    xicara.position.set(0, 1.62, 3.0);
    stage.scene.add(xicara);
    stage.scene.add(L().cyl(0.9, 0.9, 0.06, M.std('#3b2414', 0.6), 0, 1.35, 3.0, 32));
    kit.carta(rayssa ? 'rayssa' : 'yohana', [1.2, 0, 0.6], { altura: 2.4 });
    stage.camera.position.set(0, 2.75, 3.75);
    stage.camera.lookAt(0, 1.7, 2.95);

    const foam = xicara.userData.foam;
    const tex = xicara.userData.foamTex;
    const ctx = tex.userData.ctx;
    const W = tex.userData.canvas.width;
    // Máscara do que foi pintado (para a nota)
    const mask = document.createElement('canvas');
    mask.width = 64;
    mask.height = 64;
    const mctx = mask.getContext('2d');
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, 64, 64);
    // Máscara do coração ideal
    const alvo = document.createElement('canvas');
    alvo.width = 64;
    alvo.height = 64;
    const actx = alvo.getContext('2d');
    actx.fillStyle = '#000';
    actx.fillRect(0, 0, 64, 64);
    L().desenharLatte(actx, 64, 64, 'coracao');
    // Guia pontilhado (só visual)
    const guiaTex = L().makeCanvasTex(256, 256, (c) => {
      c.setLineDash([8, 8]);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(104, 108, 28, Math.PI * 0.75, Math.PI * 1.95);
      c.arc(152, 108, 28, Math.PI * 1.05, Math.PI * 0.25);
      c.lineTo(128, 184);
      c.closePath();
      c.stroke();
    });
    const guia = new THREE.Mesh(new THREE.CircleGeometry(1.13, 48), new THREE.MeshBasicMaterial({ map: guiaTex, transparent: true, depthWrite: false }));
    guia.rotation.x = -Math.PI / 2;
    guia.position.y = 0.61;
    xicara.add(guia);

    // Jarra de leite + jato
    const jarra = new THREE.Group();
    jarra.add(cyl(0.07, 0.09, 0.2, M.std('#e5e7eb', 0.15, 1), 0, 0, 0, 20));
    const jato = cyl(0.008, 0.008, 1, M.basic('#fdf6e3'), 0, 0, 0, 8);
    jarra.add(jato);
    jarra.rotation.z = 0.6;
    jarra.scale.setScalar(0.45);
    stage.scene.add(jarra);
    const respingos = kit.particulas({ count: 40, size: 0.025, color: '#fff7e6', intensity: 1, gravity: 4, life: [0.2, 0.4], additive: false });

    let pintando = false;
    let desenhou = 0;
    let ultimo = null;
    const pontoMundo = new THREE.Vector3();
    let temPonto = false;

    function pintar(uv) {
      const x = uv.x * W;
      const y = (1 - uv.y) * W;
      const pts = ultimo ? Math.max(1, Math.ceil(Math.hypot(x - ultimo.x, y - ultimo.y) / 6)) : 1;
      for (let i = 1; i <= pts; i++) {
        const px = ultimo ? ultimo.x + ((x - ultimo.x) * i) / pts : x;
        const py = ultimo ? ultimo.y + ((y - ultimo.y) * i) / pts : y;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 26);
        g.addColorStop(0, 'rgba(253,246,227,0.95)');
        g.addColorStop(0.6, 'rgba(253,246,227,0.7)');
        g.addColorStop(1, 'rgba(253,246,227,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 26, 0, Math.PI * 2);
        ctx.fill();
        mctx.fillStyle = '#fff';
        mctx.beginPath();
        mctx.arc((px / W) * 64, (py / W) * 64, 2.6, 0, Math.PI * 2);
        mctx.fill();
      }
      ultimo = { x, y };
      tex.needsUpdate = true;
      desenhou++;
    }

    function onMove(e) {
      const hit = kit.picker.pick(e, [foam]);
      temPonto = !!hit;
      if (!hit) {
        ultimo = null;
        return;
      }
      pontoMundo.copy(hit.point);
      if (pintando) {
        pintar(hit.uv);
        if (Math.random() < 0.4) respingos.emit(2, hit.point, () => ({ x: U().rand(-0.3, 0.3), y: U().rand(0.3, 0.8), z: U().rand(-0.3, 0.3) }));
      }
    }
    kit.on(stage.domElement, 'pointerdown', (e) => {
      pintando = true;
      ultimo = null;
      onMove(e);
    });
    kit.on(stage.domElement, 'pointermove', onMove);
    kit.on(window, 'pointerup', () => {
      pintando = false;
      ultimo = null;
    });

    function nota() {
      const p = mctx.getImageData(0, 0, 64, 64).data;
      const a = actx.getImageData(0, 0, 64, 64).data;
      let inter = 0;
      let uni = 0;
      for (let i = 0; i < p.length; i += 4) {
        const pp = p[i] > 128;
        const aa = a[i] > 128;
        if (pp && aa) inter++;
        if (pp || aa) uni++;
      }
      return uni ? inter / uni : 0;
    }

    function servir() {
      const iou = nota();
      const pts = desenhou === 0 ? 0 : Math.min(1000, Math.round(iou * 1400 + 120));
      kit.conquista('barista_amador');
      guia.visible = false;
      const quem = rayssa ? 'Rayssa' : 'Yohana';
      const comentario = iou > 0.55 ? 'Um coração perfeito! 😍' : iou > 0.3 ? 'É... dá pra ver que é um coração. Quase.' : desenhou ? 'Isso é... uma nuvem? Um Subaru?' : 'Café puro, então.';
      kit.fim(pts, { max: 1000, texto: `${quem}: "${comentario}"` });
    }
    kit.botoes([{ label: '✓ Servir Café', primary: true, tecla: 'Enter', onClick: servir }]);
    kit.tecla((e) => e.code === 'Enter' && servir());

    kit.loop((dt, t) => {
      if (temPonto) {
        jarra.visible = true;
        jarra.position.set(pontoMundo.x - 0.06, pontoMundo.y + 0.16, pontoMundo.z);
        jato.visible = pintando;
        jato.scale.y = 0.3;
        jato.position.set(0.1, -0.12, 0);
      } else jarra.visible = false;
      guia.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
    });
    kit.intro('Segure e arraste dentro da xícara para desenhar o <b>coração de leite</b>. Siga o pontilhado!', ['🖱️ Segurar e arrastar', '⌨️ Enter = servir'], { semContagem: true });
    return kit.promessa;
  }

  // ======================================================================
  // 2. DETECTOR DE RED FLAGS (Cap. 9)
  // ======================================================================
  function detectorRedFlags(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Detector de Red Flags', icone: '🚩', capitulo: 9, cor: '#dc2626', ambiente: 'cafe', max: 600 });
    const { stage, THREE } = kit;
    const save = root.LuiggiSave;
    const yohana = kit.carta('yohana', [0, 0, 0.45], { altura: 2.5 });
    yohana.setSpeaking(true);
    stage.camera.position.set(0, 1.9, 5.2);
    stage.camera.lookAt(0, 1.7, 0);
    const falas = ['Fui pra França e baixei Tinder só pra pagarem jantar pra mim!', 'Adoro quando o date paga tudo sem perguntar.', 'Não respondo mensagem quando tô na praia com meu ex.'];
    const flags = [];
    let clicks = 0;
    const faisca = kit.particulas({ count: 100, size: 0.1, shape: 'spark', color: '#f87171', intensity: 2.5, life: [0.3, 0.7], drag: 2 });

    function spawn() {
      const f = L().createFlagMesh();
      f.scale.setScalar(0.01);
      const lado = Math.random() < 0.5 ? -1 : 1;
      f.position.set(lado * U().rand(0.9, 2.3), U().rand(1.1, 1.8), U().rand(1.9, 2.6));
      f.userData.vida = 0;
      f.userData.max = 1.7;
      stage.scene.add(f);
      flags.push(f);
    }
    function remover(f) {
      stage.scene.remove(f);
      L().disposeObject(f);
      flags.splice(flags.indexOf(f), 1);
    }
    kit.on(stage.domElement, 'pointerdown', (e) => {
      const hit = kit.picker.pick(e, flags);
      if (!hit) return;
      let o = hit.object;
      while (o.parent && !flags.includes(o)) o = o.parent;
      faisca.burst(24, o.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 2.5);
      kit.pop('🚩 RED FLAG!', o.position.clone().add(new THREE.Vector3(0, 0.6, 0)), '#f87171');
      remover(o);
      clicks++;
      if (save) save.incrementarContador('redFlags', 1);
      kit.sfx('blip');
      kit.hud(kit.pill(`🚩 Flags: ${clicks}/6`));
      bolha(kit, 'Yohana', `"${falas[clicks % falas.length]}"`, 36, 6);
      yohana.setExpression(clicks % 2 ? 'feliz' : 'neutro');
      if (clicks >= 6) kit.timeout(() => kit.fim(600, { max: 600, texto: 'Detector de Red Flags: 100% de precisão. 0% de ação.' }), 500);
    });
    kit.hud(kit.pill('🚩 Flags: 0/6'));
    kit.loop((dt, t) => {
      for (let i = flags.length - 1; i >= 0; i--) {
        const f = flags[i];
        f.userData.vida += dt;
        f.userData.update(t);
        const v = f.userData.vida;
        const s = v < 0.25 ? U().easeOutBack(v / 0.25) : v > f.userData.max - 0.3 ? Math.max(0.01, (f.userData.max - v) / 0.3) : 1;
        f.scale.setScalar(s * 0.55);
        f.lookAt(stage.camera.position.x, f.position.y, stage.camera.position.z);
        if (v >= f.userData.max) remover(f);
      }
    });
    kit.intro('Clique nas <b>bandeirinhas vermelhas</b> antes que desapareçam das histórias da Yohana!', ['🖱️ Clique nas bandeiras']).then(() => {
      bolha(kit, 'Yohana', `"${falas[0]}"`, 36, 6);
      kit.intervalo(spawn, 620);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 3. CRÉDITOS INFINITOS (Cap. 9 · Cinema, filme "Nora")
  // ======================================================================
  function creditosInfinitos(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Cinema: Créditos de "Nora"', icone: '🎞️', capitulo: 9, cor: '#991b1b', ambiente: 'cinema', max: 400 });
    const { stage, env, THREE } = kit;
    const save = root.LuiggiSave;
    const creds = root.LuiggiData?.cache?.dialogos?.creditos || ['Músicas por LuiggiBeats'];
    const linhas = [];
    for (let i = 0; i < 4; i++) creds.forEach((c) => linhas.push({ txt: c, got: false }));
    const telaTex = L().makeCanvasTex(1024, 448, () => { });
    telaTex.wrapS = telaTex.wrapT = THREE.ClampToEdgeWrapping;
    env.tela.material.map = telaTex;
    env.tela.material.color.setScalar(1.25);
    env.tela.material.needsUpdate = true;
    const yohana = kit.carta('yohana', [-1.0, 0.75, -2.3], { altura: 1.6 });
    stage.camera.position.set(0.15, 2.05, -1.0);
    stage.camera.lookAt(0, 3.25, -11);
    let scroll = 0;
    const LH = 46;
    function desenharTela() {
      const c = telaTex.userData.ctx;
      c.fillStyle = '#000';
      c.fillRect(0, 0, 1024, 448);
      c.textAlign = 'center';
      c.font = '30px Georgia, serif';
      linhas.forEach((l, i) => {
        const y = 448 + i * LH - scroll;
        if (y < -LH || y > 448 + LH) return;
        c.fillStyle = l.got ? '#fbbf24' : '#e5e7eb';
        c.fillText(l.txt + (l.got ? '  🍪' : ''), 512, y);
      });
      telaTex.needsUpdate = true;
    }
    kit.on(stage.domElement, 'pointerdown', (e) => {
      const hit = kit.picker.pick(e, [env.tela]);
      if (!hit) return;
      const y = (1 - hit.uv.y) * 448;
      const i = Math.round((y + scroll - 448) / LH);
      const l = linhas[i];
      if (l && !l.got) {
        l.got = true;
        if (save) save.incrementarContador('cookiesAssados', 1);
        kit.pop('+🍪', hit.point, '#fbbf24');
        kit.sfx('blip');
      }
    });
    // Botão "Pular Créditos" fujão
    const skip = document.createElement('button');
    skip.className = 'mini-btn';
    skip.textContent = 'Pular Créditos ⏭';
    skip.style.cssText = 'position:absolute;right:6%;bottom:12%;transition:transform 0.18s ease;';
    kit.layer.appendChild(skip);
    let fugas = 0;
    const fugir = () => {
      fugas++;
      skip.style.transform = `translate(${(Math.random() - 0.5) * 420}px, ${(Math.random() - 0.5) * 160}px)`;
      kit.sfx('blip');
      if (fugas >= 15) kit.conquista('botao_fujao');
    };
    kit.on(skip, 'mouseenter', fugir);
    kit.on(skip, 'click', fugir);
    let seg = 11;
    kit.hud(kit.pill(`⏱️ ${seg}s`));
    kit.loop((dt) => {
      scroll += dt * 70;
      if (scroll > linhas.length * LH + 448) scroll = 0;
      desenharTela();
    });
    kit.intro('Os créditos de "Nora" não acabam nunca. <b>Clique nos nomes</b> na tela para ganhar cookies enquanto espera a cena pós-créditos.', ['🖱️ Clique nos nomes']).then(() => {
      bolha(kit, 'Yohana', '"Cala a boca, vai ter pós-créditos!"', 6, 30);
      yohana.setSpeaking(true);
      kit.intervalo(() => {
        seg--;
        kit.hud(kit.pill(`⏱️ ${Math.max(0, seg)}s`));
        if (seg <= 0) {
          bolha(kit, 'Yohana', '"... Não tinha cena pós-créditos."', 6, 30);
          yohana.setExpression('chocado');
          kit.timeout(() => kit.fim(400, { max: 400, texto: 'Doze minutos de créditos. Zero pós-créditos.' }), 1400);
        }
      }, 1000);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 4. BEIJO NO DRIFT (Cap. 11 · Sonho)
  // ======================================================================
  function beijoNoDrift(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Beijo no Drift (Sonho)', icone: '💋', capitulo: 11, cor: '#ec4899', ambiente: 'sonho', max: 1000 });
    const { stage, env, THREE } = kit;
    const { M, plane, textures, createSubaruMesh, createCapybaraMesh } = L();
    env.group.children.forEach((c) => {
      // Ilha central fica escondida (a estrada passa por ela)
      if (c.position && c.position.x === 0 && c.position.z === 0 && c.type === 'Group') c.visible = false;
    });
    const estradaTex = textures.asphalt(1, 30, { base: '#3b2b6b' });
    const estrada = plane(8, 400, M.std('#ffffff', 0.4, 0.2, { map: estradaTex, emissive: '#7c3aed', emissiveIntensity: 0.15 }), 0, 0, -150);
    estrada.rotation.x = -Math.PI / 2;
    stage.scene.add(estrada);
    [-4.1, 4.1].forEach((x) => stage.scene.add(L().box(0.12, 0.08, 400, M.glow('#f9a8d4', 2.4), x, 0.04, -150, { cast: false })));
    const sub = createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', true);
    stage.scene.add(sub);
    sub.rotation.y = Math.PI;
    const fumaca = kit.particulas({ count: 200, size: 0.9, shape: 'smoke', colors: ['#f5d0fe', '#fbcfe8', '#ddd6fe'], intensity: 0.5, life: [0.6, 1.2], drag: 1.5 });
    const coracoes = kit.particulas({ count: 80, size: 0.3, shape: 'heart', colors: ['#f472b6', '#fb7185'], intensity: 2, gravity: -1, life: [0.8, 1.4] });
    const capivara = createCapybaraMesh();
    capivara.visible = false;
    capivara.scale.setScalar(0.7);
    stage.scene.add(capivara);

    let medidor = 45;
    let tecs = 0;
    let combo = 0;
    let rodadas = 7;
    let lado = 'ESQUERDA';
    let drift = 0;
    let driftAlvo = 0;
    let janela = 0;
    let aguardando = false;
    let capT = -1;
    const cam = stage.camera;

    function hud() {
      kit.hud(kit.pill(`🔁 Restam: ${rodadas}`) + kit.pill(`🔥 Combo: ${combo}`));
      kit.medidor('beijo', '💖 Beijo Alinhado', medidor / 100, { cor: '#ec4899' });
    }
    hud();

    function proxima() {
      if (rodadas <= 0) {
        kit.conquista('drift_romantico');
        if (tecs === 0) kit.conquista('sem_bater_dente');
        if (combo >= 5) kit.conquista('trabalho_em_equipe');
        kit.fim(medidor * 10, { max: 1000, texto: medidor >= 80 ? 'Drift e beijo perfeitamente alinhados. (Era só um sonho.)' : 'CNH: giz de cera. Beijo: com dente.' });
        return;
      }
      lado = Math.random() < 0.5 ? 'ESQUERDA' : 'DIREITA';
      const ev = rodadas === 4 ? '🦫 CAPIVARA VOADORA NA JANELA!' : rodadas === 2 ? '📸 FLASH DO RADAR — FAÇA POSE!' : `🚨 Fabricio: "${lado}!"`;
      kit.msg(ev, '#f9a8d4');
      if (rodadas === 4) {
        capivara.visible = true;
        capT = 0;
        if (root.LuiggiSave) root.LuiggiSave.incrementarContador('capivarasDesviadas', 1);
      }
      if (rodadas === 2) {
        kit.sfx('radar');
        stage.pulseGrade('flash', 1, 0.7, 0);
        if (root.LuiggiSave) root.LuiggiSave.incrementarContador('radaresPegos', 1);
      }
      driftAlvo = lado === 'ESQUERDA' ? 0.55 : -0.55;
      janela = 3;
      aguardando = true;
    }

    function responder(dir) {
      if (!aguardando || kit.terminado) return;
      aguardando = false;
      const correto = (lado === 'ESQUERDA' && dir === 'DIREITA') || (lado === 'DIREITA' && dir === 'ESQUERDA');
      if (correto) {
        combo++;
        medidor = Math.min(100, medidor + 12);
        kit.sfx('forno');
        kit.pop(combo >= 3 ? `COMBO x${combo}! 💋` : 'ALINHADO! 💋', sub.position.clone().add(new THREE.Vector3(0, 1.8, 0)), '#f472b6');
        coracoes.burst(20, sub.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 2);
      } else {
        combo = 0;
        tecs++;
        medidor = Math.max(0, medidor - 10);
        kit.sfx('bruh');
        kit.pop('*TEC* 🦷', sub.position.clone().add(new THREE.Vector3(0, 1.8, 0)), '#f87171');
        stage.shake(0.2, 6);
      }
      driftAlvo = 0;
      rodadas--;
      hud();
      kit.timeout(proxima, 1100);
    }

    kit.tecla((e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') responder('ESQUERDA');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') responder('DIREITA');
    });
    kit.botoes([
      { label: '⬅ Compensar Esquerda', tecla: '←', onClick: () => responder('ESQUERDA') },
      { label: 'Compensar Direita ➡', tecla: '→', onClick: () => responder('DIREITA') }
    ]);

    kit.loop((dt, t) => {
      estradaTex.offset.y -= dt * 2.2;
      drift = U().damp(drift, driftAlvo, 3, dt);
      sub.rotation.y = Math.PI + drift;
      sub.position.x = U().damp(sub.position.x, -drift * 2.2, 2, dt);
      sub.userData.wheels.forEach((w) => (w.rotation.x -= dt * 20));
      if (Math.abs(drift) > 0.15) {
        [-0.8, 0.8].forEach((x) => fumaca.emit(1, sub.localToWorld(new THREE.Vector3(x, 0.2, -1.4)), () => ({ x: U().rand(-0.5, 0.5), y: U().rand(0.3, 0.8), z: 3 })));
      }
      cam.position.set(sub.position.x * 0.6 + Math.sin(t * 0.5) * 0.3, 2.6, 6.2);
      cam.lookAt(sub.position.x * 0.5, 0.9, -3);
      if (aguardando) {
        janela -= dt;
        kit.medidor('tempo', 'Tempo para compensar', Math.max(0, janela / 3), { cor: '#a855f7' });
        if (janela <= 0) responder(lado);
      }
      if (capT >= 0) {
        capT += dt;
        capivara.position.set(-8 + capT * 7, 2.2 + Math.sin(capT * 6) * 0.3, -2.5);
        capivara.rotation.y = Math.PI / 2;
        capivara.children.forEach((c) => (c.name === 'asaE' || c.name === 'asaD') && (c.rotation.x = Math.sin(t * 20) * 0.6));
        if (capT > 2.4) {
          capivara.visible = false;
          capT = -1;
        }
      }
    });
    kit.intro('Sonho lúcido: o Fabricio dirige o Subaru com a CNH de giz de cera. Quando ele gritar o lado da curva, <b>compense para o lado oposto</b> e alinhe o beijo!', ['⌨️ ← →', '🖱️ Botões']).then(proxima);
    return kit.promessa;
  }

  // ======================================================================
  // 5. DETETIVE DO INSTAGRAM (Cap. 12 · paródia)
  // ======================================================================
  function detetiveInstagram(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Detetive do InstaGram (Paródia)', icone: '🕵️', capitulo: 12, cor: '#22c55e', ambiente: 'academia', ambienteOpts: { gotica: true }, max: 800, grade: { vignette: 1 } });
    const { stage, THREE } = kit;
    const save = root.LuiggiSave;
    const provas = [
      { id: 'p1', txt: '⭐ Melhores Amigos com cadeado (Luis removido)', r: [40, 150, 170, 170] },
      { id: 'p2', txt: '🔥 Segue todos os caras que vieram do Tinder', r: [390, 175, 150, 110] },
      { id: 'p3', txt: '💬 Resposta de story: "onde você tá?" pro cara do Tinder', r: [440, 20, 90, 90] },
      { id: 'p4', txt: '❤️ 99+ curtidas masculinas recentes', r: [370, 20, 70, 90] }
    ];
    const achadas = new Set();

    function desenhar(ctx, w, h) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.fillText('eloiza_dark 🔒', 30, 70);
      ctx.font = '40px sans-serif';
      ctx.fillText('♡', 384, 74);
      ctx.fillText('➤', 462, 74);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(420, 40, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('99+', 408, 45);
      // Avatar com anel verde (Melhores Amigos)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(125, 235, 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1f1f1f';
      ctx.beginPath();
      ctx.arc(125, 235, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '64px sans-serif';
      ctx.fillText('🦇', 90, 258);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      [['312', 'posts', 250], ['8.4k', 'seguidores', 340], ['1.2k', 'seguindo', 455]].forEach(([n, l, x]) => {
        ctx.textAlign = 'center';
        ctx.fillText(n, x, 230);
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.fillText(l, x, 260);
        ctx.font = 'bold 30px "Segoe UI", sans-serif';
      });
      ctx.textAlign = 'left';
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillText('🖤 vou parar com isso', 40, 345);
      ctx.fillText('Close Friends 🔒 · 99+ solicitações', 40, 378);
      const cores = ['#1c1917', '#450a0a', '#111827', '#3f0f1a', '#18181b', '#292524', '#1e1b4b', '#3f3f46', '#0c0a09'];
      for (let i = 0; i < 9; i++) {
        const x = (i % 3) * (w / 3);
        const y = 420 + Math.floor(i / 3) * (w / 3);
        ctx.fillStyle = cores[i];
        ctx.fillRect(x + 2, y + 2, w / 3 - 4, w / 3 - 4);
        ctx.font = '60px sans-serif';
        ctx.fillText(['🖤', '🕯️', '🦇', '⛓️', '🥀', '🌙', '💀', '🖤', '🩸'][i], x + 55, y + 110);
      }
      // Marcas das provas achadas
      provas.forEach((p) => {
        if (!achadas.has(p.id)) return;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.strokeRect(p.r[0], p.r[1], p.r[2], p.r[3]);
        ctx.font = '40px sans-serif';
        ctx.fillText('🚩', p.r[0] + p.r[2] - 34, p.r[1] + 36);
      });
    }
    const fone = L().createPhoneMesh(desenhar, { resW: 540, resH: 1110 });
    fone.position.set(0, 1.55, 1.8);
    fone.scale.setScalar(0.9);
    stage.scene.add(fone);
    kit.carta('eloiza', [1.9, 0, -0.8], { altura: 2.4 });
    stage.camera.position.set(0, 1.65, 3.6);
    stage.camera.lookAt(0.3, 1.5, 0);
    const luz = new THREE.PointLight('#bbf7d0', 1.5, 3, 1.5);
    luz.position.set(0, 1.8, 2.7);
    stage.scene.add(luz);

    const painel = document.createElement('div');
    painel.className = 'mgk-evidencias';
    kit.layer.appendChild(painel);
    function atualizarPainel() {
      painel.innerHTML = `<h4>🗂️ Provas (${achadas.size}/4)</h4>` + provas.map((p) => `<div class="${achadas.has(p.id) ? 'ok' : ''}">${achadas.has(p.id) ? '🚩 ' + p.txt : '❓ ???'}</div>`).join('');
      kit.hud(kit.pill(`🔎 Provas: ${achadas.size}/4`));
    }
    atualizarPainel();

    kit.on(stage.domElement, 'pointerdown', (e) => {
      const hit = kit.picker.pick(e, [fone.userData.screen]);
      if (!hit) return;
      const x = hit.uv.x * 540;
      const y = (1 - hit.uv.y) * 1110;
      const p = provas.find((pp) => !achadas.has(pp.id) && x >= pp.r[0] && x <= pp.r[0] + pp.r[2] && y >= pp.r[1] && y <= pp.r[1] + pp.r[3]);
      if (!p) {
        kit.msg('Nada suspeito aqui... continue procurando.', '#94a3b8', 1000);
        return;
      }
      achadas.add(p.id);
      if (save) save.incrementarContador('redFlags', 10);
      kit.sfx('blip');
      stage.shake(0.02, 8);
      kit.pop('🚩 PROVA!', hit.point, '#f87171');
      fone.redraw();
      atualizarPainel();
      if (achadas.size >= 4) {
        kit.conquista('detetive_instagram');
        kit.conquista('detector_quebrado');
        kit.timeout(() => kit.fim(800, { max: 800, texto: 'O Detector de Red Flags explodiu. Literalmente.' }), 700);
      }
    });
    kit.on(stage.domElement, 'pointermove', (e) => {
      stage.domElement.style.cursor = kit.picker.pick(e, [fone.userData.screen]) ? 'zoom-in' : '';
    });
    kit.loop((dt, t) => {
      fone.rotation.y = Math.sin(t * 0.5) * 0.05;
    });
    kit.intro('Investigue o perfil <b>@eloiza_dark</b>: clique nos detalhes suspeitos da tela para achar as 4 provas.', ['🖱️ Clique no celular'], { semContagem: true });
    return kit.promessa;
  }

  // ======================================================================
  // 6. LEMBRA QUANDO? (Cap. 14 · Yard)
  // ======================================================================
  function lembraQuando(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Lembra Quando? (Yard)', icone: '🎬', capitulo: 14, cor: '#a3e635', ambiente: 'balada', max: 500 });
    const { stage, env, THREE } = kit;
    const balada = env;
    const escola = root.Luiggi3DEnv.build('sala_aula');
    escola.group.visible = false;
    stage.scene.add(escola.group);
    stage.addUpdate((dt, t) => escola.group.visible && escola.update(dt, t));
    const tutu = kit.carta('tutuluiza', [0.9, 0, 1.2], { altura: 2.5 });
    tutu.setSpeaking(true);
    const qs = [
      { q: 'Lembra quando o Tiago mostrou a primeira música dele?', op: ['Eu elogiei!', 'Eu disse: "Por que você fez isso?"', 'Eu fingi que dormi'], flash: 'tiago_music' },
      { q: 'Lembra da Cecília gritando pela sala?', op: ['FELPS!!', 'LUIS!!', 'TICO!!'], flash: 'cecilia' },
      { q: 'Lembra do Vitor tentando puxar papo?', op: ['Ele arrasou', 'Foi o pior roteiro da história', 'Ele cantou rap'], flash: 'vitor_witiuk' }
    ];
    let i = 0;
    let flashCarta = null;
    let luisCarta = null;
    const camBase = () => {
      stage.camera.position.set(0.2, 1.85, 4.6);
      stage.camera.lookAt(0.6, 1.6, 0);
    };
    camBase();

    function flashback(charId, done) {
      kit.sfx('vhs');
      stage.pulseGrade('flash', 0.9, 0.5, 0);
      balada.group.visible = false;
      tutu.group.visible = false;
      escola.group.visible = true;
      root.Luiggi3DEnv.aplicar(stage, escola);
      stage.setGrade({ sepia: 0.75, grain: 0.1, vignette: 1.0, scanlines: 0.4 });
      flashCarta = kit.carta(charId, [1.4, 0, 0.6], { altura: 2.5 });
      luisCarta = kit.carta('luis', [-1.4, 0, 0.6], { altura: 2.5 });
      flashCarta.setSpeaking(true);
      stage.camera.position.set(0, 1.7, 5.4);
      stage.camera.lookAt(0, 1.55, 0);
      kit.msg('◀◀ Flashback · Ensino Médio', '#fbbf24');
      kit.timeout(() => {
        stage.pulseGrade('flash', 0.9, 0.5, 0);
        [flashCarta, luisCarta].forEach((c) => stage.scene.remove(c.group));
        escola.group.visible = false;
        balada.group.visible = true;
        tutu.group.visible = true;
        root.Luiggi3DEnv.aplicar(stage, balada);
        camBase();
        done();
      }, 2200);
    }

    function render() {
      if (i >= qs.length) {
        kit.conquista('lembra_quando');
        kit.fim(500, { max: 500, texto: 'Tutuluiza: "Eu falei que essa cena ia voltar!"' });
        return;
      }
      const cur = qs[i];
      bolha(kit, 'Tutuluiza', `"${cur.q}"`, 44, 6);
      kit.hud(kit.pill(`🎬 ${i + 1}/${qs.length}`));
      const box = document.createElement('div');
      box.className = 'mgk-choices';
      box.innerHTML = cur.op.map((o, k) => `<button class="mgk-choice" data-k="${k}"><b>${k + 1}</b>${o}</button>`).join('');
      kit.layer.appendChild(box);
      const pick = () => {
        box.remove();
        window.removeEventListener('keydown', onK);
        kit.layer.querySelectorAll('.mgk-bubble').forEach((b) => b.remove());
        tutu.setExpression('feliz');
        kit.sfx('blip');
        flashback(cur.flash, () => {
          i++;
          render();
        });
      };
      const onK = (e) => ['1', '2', '3'].includes(e.key) && pick();
      window.addEventListener('keydown', onK);
      box.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', pick));
    }
    kit.intro('A Tutuluiza quer relembrar os tempos de escola no meio da Yard. Responda e reviva as cenas!', ['🖱️ Clique', '⌨️ 1 · 2 · 3'], { semContagem: true }).then(render);
    return kit.promessa;
  }

  const reg = (id, fn) => Q().registrar(id, fn);
  reg('latte_art', latteArt);
  reg('latte_art_rayssa', latteArt);
  reg('detector_red_flags', detectorRedFlags);
  reg('creditos_infinitos', creditosInfinitos);
  reg('beijo_no_drift', beijoNoDrift);
  reg('detetive_instagram', detetiveInstagram);
  reg('lembra_quando', lembraQuando);
})(window);
