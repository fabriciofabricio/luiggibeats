/**
 * src/minigames/quick/Capitulos1a5.js
 * Minigames 3D: Puzzle do Armário, Basquete com a Maria Clara, Autocorretor Traidor,
 * Não Olha Pra Porta, Treino na Academia / Treino em Dupla, Fuga das Notificações, Medidor de Dilema.
 * Mesma lógica, pontuação e conquistas das versões originais.
 */
(function (root) {
  'use strict';

  const Q = () => root.LuiggiQuickMinigames;
  const L = () => root.Luiggi3D;
  const U = () => root.Luiggi3D.U;

  // ======================================================================
  // 1. PUZZLE DO ARMÁRIO (Cap. 1)
  // ======================================================================
  function puzzleArmario(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Puzzle do Armário', icone: '🔐', capitulo: 1, cor: '#3b82f6', ambiente: 'corredor', max: 300 });
    const { stage, THREE } = kit;
    const { M, box, cyl, textures } = L();
    const cam = stage.camera;
    cam.position.set(1.55, 1.2, -2.12);
    cam.lookAt(2.7, 1.08, -2.3);

    // Porta do armário em destaque (abre no final)
    const porta = new THREE.Group();
    porta.position.set(2.43, 0.95, -2.02);
    const portaMesh = box(0.04, 1.8, 0.54, M.std('#1d4ed8', 0.4, 0.5), 0, 0, -0.27);
    porta.add(portaMesh);
    stage.scene.add(porta);
    const interior = box(0.02, 1.7, 0.5, M.std('#0b1020', 0.9), 2.68, 0.95, -2.3);
    stage.scene.add(interior);
    const cookie = L().createCookieMesh();
    cookie.scale.setScalar(0.08);
    cookie.rotation.z = Math.PI / 2;
    cookie.position.set(2.6, 1.2, -2.3);
    stage.scene.add(cookie);
    const brilho = L().halo('#fbbf24', 0.6, 1.4);
    brilho.position.set(2.58, 1.2, -2.3);
    brilho.visible = false;
    stage.scene.add(brilho);

    // Cadeado
    const cadeado = new THREE.Group();
    cadeado.position.set(2.38, 1.05, -2.3);
    cadeado.rotation.y = -Math.PI / 2;
    const ouro = M.std('#e0a526', 0.25, 0.9);
    cadeado.add(box(0.3, 0.26, 0.1, ouro, 0, 0, 0));
    const argola = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.017, 10, 24, Math.PI), M.std('#d1d5db', 0.2, 1));
    argola.position.set(0, 0.12, 0);
    cadeado.add(argola);
    const strip = L().makeCanvasTex(640, 64, (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        ctx.save();
        ctx.translate(i * 64 + 32, h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(String(i), 0, 2);
        ctx.restore();
      }
    });
    const discos = [];
    const digitos = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 24, 1, false);
      geo.rotateZ(Math.PI / 2);
      const t = strip.clone();
      t.needsUpdate = true;
      const d = new THREE.Mesh(geo, [M.std('#ffffff', 0.4, 0.2, { map: t }), M.std('#1e293b', 0.4), M.std('#1e293b', 0.4)]);
      d.position.set(-0.085 + i * 0.085, -0.03, 0.075);
      d.userData.idx = i;
      cadeado.add(d);
      discos.push({ mesh: d, rot: 0 });
    }
    stage.scene.add(cadeado);
    const luz = new THREE.PointLight('#fff4d6', 1.2, 3, 1.5);
    luz.position.set(1.7, 1.5, -2.0);
    stage.scene.add(luz);

    let mateus = null;
    let aberto = false;
    let porMim = false;
    let abrirT = 0;

    function setDigito(i, v) {
      digitos[i] = (v + 10) % 10;
      kit.sfx('blip');
      checar();
    }
    function checar() {
      if (!aberto && digitos.join('') === '420') abrir(true);
    }
    function abrir(sozinho) {
      if (aberto) return;
      aberto = true;
      porMim = sozinho;
      kit.sfx('tranca');
      kit.pop(sozinho ? 'ABRIU! 🔓' : '🔓', { x: 60, y: 40 }, '#4ade80', { grande: true });
      brilho.visible = true;
      kit.botoes([{ label: '🔓 Puxar Cadeado', primary: true, tecla: 'Enter', onClick: terminar }]);
    }
    function terminar() {
      kit.fim(porMim ? 300 : 150, { max: 300, texto: porMim ? 'Você abriu antes do Mateus! (Ele vai dizer que deixou.)' : 'Mateus Buse: "Fácil. Próximo desafio?"' });
    }

    kit.picker &&
      kit.on(stage.domElement, 'pointerdown', (e) => {
        const hit = kit.picker.pick(e, discos.map((d) => d.mesh));
        if (hit) setDigito(hit.object.userData.idx, digitos[hit.object.userData.idx] + 1);
      });
    let sel = 0;
    kit.tecla((e) => {
      if (e.key >= '1' && e.key <= '3') setDigito(Number(e.key) - 1, digitos[Number(e.key) - 1] + 1);
      if (e.code === 'ArrowLeft') sel = (sel + 2) % 3;
      if (e.code === 'ArrowRight') sel = (sel + 1) % 3;
      if (e.code === 'ArrowUp') setDigito(sel, digitos[sel] + 1);
      if (e.code === 'ArrowDown') setDigito(sel, digitos[sel] - 1);
      if (e.code === 'Enter' && aberto) terminar();
    });
    kit.botoes([{ label: '🔓 Puxar Cadeado', onClick: () => (aberto ? terminar() : (kit.sfx('bruh'), kit.msg('Trancado. Gire os números (clique nos discos ou 1, 2, 3).', '#f87171', 1800))) }]);

    kit.loop((dt, t) => {
      discos.forEach((d, i) => {
        const alvo = -(digitos[i] / 10) * Math.PI * 2;
        d.rot = U().damp(d.rot, alvo, 14, dt);
        d.mesh.rotation.x = d.rot;
        d.mesh.material[0].emissive.set(i === sel ? '#1d4ed8' : '#000000');
        d.mesh.material[0].emissiveIntensity = 0.5;
      });
      if (aberto) {
        abrirT += dt;
        argola.position.y = U().damp(argola.position.y, 0.2, 8, dt);
        if (abrirT > 0.6) porta.rotation.y = U().damp(porta.rotation.y, -1.6, 4, dt);
        cookie.rotation.x += dt * 2;
      }
    });

    kit.intro('Tente abrir o cadeado do armário. Clique nos discos para girar os números… antes que o <b>Mateus Buse</b> resolva em 2 segundos.', ['🖱️ Clique nos discos', '⌨️ 1 · 2 · 3', '⌨️ ← → ↑ ↓']).then(() => {
      kit.msg('Gire os números para tentar abrir o cadeado...');
      kit.timeout(() => {
        mateus = document.createElement('div');
        mateus.className = 'mgk-cameo';
        mateus.innerHTML = root.LuiggiRig.renderVisualNovelSprite(kit.personagem('mateus_buse'), { expressao: 'feliz', speaking: true });
        kit.layer.appendChild(mateus);
        kit.sfx('blip');
        kit.timeout(() => {
          kit.msg('🤓 Mateus Buse: "A senha é 4-2-0, mano. Pronto, abri em 2 segundos."', '#60a5fa');
          [4, 2, 0].forEach((v, i) => (digitos[i] = v));
          kit.sfx('blip');
          abrir(false);
        }, 1500);
      }, 2200);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 2. BASQUETE COM A MARIA CLARA (Cap. 1)
  // ======================================================================
  function basquete(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Basquete com a Maria Clara', icone: '🏀', capitulo: 1, cor: '#f97316', ambiente: 'quadra', max: 750 });
    const { stage, env, THREE } = kit;
    const G = 9.8;
    const R = 0.12;
    const aro = env.aro.clone();
    const aroR = 0.23;
    const tabelaZ = aro.z - 0.32;
    const lancador = new THREE.Vector3(0, 2.35, aro.z + 5.2);

    const luis = kit.boneco('luis', [0, 0, lancador.z + 0.35], Math.PI);
    const maria = kit.boneco('maria_clara', [2.6, 0, aro.z + 3.4], -Math.PI * 0.7);
    maria.setPose('idle');

    stage.camera.position.set(0.9, 2.5, lancador.z + 3.6);
    const look = new THREE.Vector3(0, 2.7, aro.z);
    stage.camera.lookAt(look);

    const bola = L().sphere(R, L().M.std('#ffffff', 0.7, 0, { map: L().textures.basketball() }), 0, 0, 0, 24);
    stage.scene.add(bola);
    const sombra = L().blobShadow(0.16, 0.5);
    stage.scene.add(sombra);
    const mira = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.3, 32), L().M.glow('#fbbf24', 2, { transparent: true, opacity: 0.6 }));
    mira.rotation.x = -Math.PI / 2;
    mira.position.set(aro.x, 0.02, aro.z);
    stage.scene.add(mira);
    const confete = kit.particulas({ count: 160, size: 0.07, shape: 'square', colors: ['#f97316', '#fbbf24', '#a855f7', '#22d3ee'], intensity: 1.5, gravity: 4, life: [0.8, 1.6], additive: false });

    let cestas = 0;
    let tent = 5;
    let power = 0;
    let dir = 1;
    let mira3 = 0;
    let mouseMira = null;
    const ball = { p: new THREE.Vector3(), v: new THREE.Vector3(), ativo: false, cesta: false, t: 0, bateuAro: false, spin: 0 };

    // Velocidade exata para acertar a cesta com ângulo de 52°
    const theta = (52 * Math.PI) / 180;
    function v0Para(alvo) {
      const dx = alvo.x - lancador.x;
      const dz = alvo.z - lancador.z;
      const d = Math.hypot(dx, dz);
      const h = alvo.y - lancador.y;
      return Math.sqrt((G * d * d) / (2 * Math.cos(theta) ** 2 * (d * Math.tan(theta) - h)));
    }

    function hud() {
      kit.hud(kit.pill(`🏀 Cestas: ${cestas}`) + kit.pill(`🎯 Restam: ${tent}`));
    }
    hud();

    function prender() {
      ball.ativo = false;
      ball.cesta = false;
      ball.bateuAro = false;
      ball.t = 0;
      luis.setPose('idle');
    }
    prender();

    function arremessar() {
      if (ball.ativo || tent <= 0 || kit.terminado) return;
      luis.play('throw', 0.55);
      kit.timeout(() => {
        const alvo = aro.clone();
        const v0 = v0Para(alvo) * (0.86 + 0.28 * power);
        const yaw = mira3 * 0.2;
        const dirH = new THREE.Vector3(alvo.x - lancador.x, 0, alvo.z - lancador.z).normalize();
        dirH.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        ball.p.copy(lancador);
        ball.v.set(dirH.x * v0 * Math.cos(theta), v0 * Math.sin(theta), dirH.z * v0 * Math.cos(theta));
        ball.ativo = true;
        ball.spin = -8;
        kit.sfx('blip');
      }, 260);
    }

    function fimTentativa() {
      if (!ball.cesta) {
        kit.msg(ball.bateuAro ? '💥 Quase! Bateu no aro!' : '😬 Passou longe...', '#f87171', 1500);
        kit.sfx('bruh');
        maria.setExpression('chocado');
      }
      tent--;
      hud();
      if (tent <= 0) {
        kit.timeout(() => kit.fim(cestas * 150, { max: 750, texto: cestas >= 3 ? 'Maria Clara: "Joga muito! Bora jogar de novo amanhã."' : 'Maria Clara: "Relaxa, basquete é treino."' }), 700);
        return;
      }
      kit.timeout(prender, 450);
    }

    function colisaoAro() {
      // Ponto mais próximo no círculo do aro
      const dx = ball.p.x - aro.x;
      const dz = ball.p.z - aro.z;
      const rh = Math.hypot(dx, dz) || 1e-4;
      const cx = aro.x + (dx / rh) * aroR;
      const cz = aro.z + (dz / rh) * aroR;
      const nx = ball.p.x - cx;
      const ny = ball.p.y - aro.y;
      const nz = ball.p.z - cz;
      const dist = Math.hypot(nx, ny, nz);
      const lim = R + 0.02;
      if (dist < lim) {
        const n = new THREE.Vector3(nx / dist, ny / dist, nz / dist);
        const vn = ball.v.dot(n);
        if (vn < 0) {
          ball.v.addScaledVector(n, -1.6 * vn);
          ball.v.multiplyScalar(0.82);
          ball.bateuAro = true;
          kit.sfx('punch');
        }
        ball.p.addScaledVector(n, lim - dist);
      }
    }

    function quadro(dt) {
      if (!ball.ativo) {
        // Bola nas mãos do Luis
        const mao = luis.maoDireita.getWorldPosition(new THREE.Vector3());
        bola.position.copy(mao).add(new THREE.Vector3(-0.08, 0.05, -0.12));
        return;
      }
      const passos = 4;
      const h = dt / passos;
      for (let i = 0; i < passos; i++) {
        ball.v.y -= G * h;
        const yAntes = ball.p.y;
        ball.p.addScaledVector(ball.v, h);
        colisaoAro();
        // Tabela
        if (ball.p.z - R < tabelaZ && ball.v.z < 0 && Math.abs(ball.p.x - aro.x) < 0.9 && ball.p.y > aro.y - 0.25 && ball.p.y < aro.y + 0.8) {
          ball.p.z = tabelaZ + R;
          ball.v.z *= -0.55;
          ball.bateuAro = true;
          kit.sfx('punch');
        }
        // Cesta: cruza o plano do aro descendo, por dentro
        if (!ball.cesta && yAntes >= aro.y && ball.p.y < aro.y && ball.v.y < 0 && Math.hypot(ball.p.x - aro.x, ball.p.z - aro.z) < aroR - R * 0.4) {
          ball.cesta = true;
          cestas++;
          hud();
          kit.msg('✨ CHUÁ! Maria Clara: "Boa!! Joga muito!"', '#4ade80', 1800);
          kit.pop(ball.bateuAro ? 'CESTA!' : 'CHUÁ!', aro.clone().add(new THREE.Vector3(0, 0.4, 0)), '#fbbf24', { grande: true });
          kit.sfx('forno');
          confete.burst(80, aro.clone(), 4);
          maria.play('jump', 0.6).setExpression('feliz');
          env.rede.scale.set(1.15, 0.8, 1.15);
          stage.shake(0.04, 6);
        }
        // Chão
        if (ball.p.y < R) {
          ball.p.y = R;
          ball.v.y *= -0.62;
          ball.v.x *= 0.85;
          ball.v.z *= 0.85;
          if (Math.abs(ball.v.y) > 1) kit.sfx('punch');
        }
      }
      ball.t += dt;
      bola.position.copy(ball.p);
      bola.rotation.x += ball.spin * dt;
      if (ball.t > 3.2 || ball.p.z > lancador.z + 4) {
        ball.ativo = false;
        fimTentativa();
      }
    }

    kit.on(stage.domElement, 'pointermove', (e) => {
      const r = stage.domElement.getBoundingClientRect();
      mouseMira = U().clamp(((e.clientX - r.left) / r.width - 0.5) * 2.2, -1, 1);
    });
    kit.on(stage.domElement, 'pointerdown', arremessar);
    const teclas = {};
    kit.tecla((e) => {
      teclas[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        arremessar();
      }
    });
    kit.tecla((e) => (teclas[e.code] = false), 'keyup');

    kit.botoes([{ label: '🏀 ARREMESSAR!', primary: true, tecla: 'Espaço', onClick: arremessar }]);

    kit.loop((dt, t) => {
      if (!ball.ativo) {
        power += dir * dt * 1.25;
        if (power >= 1 || power <= 0) {
          dir *= -1;
          power = U().clamp(power, 0, 1);
        }
      }
      if (teclas.ArrowLeft) mouseMira = null, (mira3 = U().clamp(mira3 - dt * 1.5, -1, 1));
      if (teclas.ArrowRight) mouseMira = null, (mira3 = U().clamp(mira3 + dt * 1.5, -1, 1));
      if (mouseMira !== null && !ball.ativo) mira3 = U().damp(mira3, mouseMira, 10, dt);
      kit.medidor('forca', 'Força do arremesso', power, { marcador: true, zona: [0.4, 0.6] });
      // Linha de mira no chão
      const yaw = mira3 * 0.2;
      const d = new THREE.Vector3(aro.x - lancador.x, 0, aro.z - lancador.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      mira.position.set(lancador.x + d.x, 0.02, lancador.z + d.z);
      mira.material.opacity = ball.ativo ? 0.15 : 0.6 + Math.sin(t * 6) * 0.2;
      luis.group.rotation.y = Math.PI + yaw;
      quadro(dt);
      sombra.position.set(bola.position.x, 0.015, bola.position.z);
      sombra.scale.setScalar(U().clamp(1.4 - bola.position.y * 0.2, 0.4, 1.4));
      env.rede.scale.x = U().damp(env.rede.scale.x, 1, 6, dt);
      env.rede.scale.y = U().damp(env.rede.scale.y, 1, 6, dt);
      env.rede.scale.z = env.rede.scale.x;
      if (!maria.acao && maria.pose !== 'cheer' && Math.random() < 0.002) maria.setExpression('neutro');
    });

    kit.intro('Arremesse com a força na <b>zona verde</b> e mire com o mouse. 5 tentativas na quadra do colégio!', ['🖱️ Mover = mirar', '🖱️ Clique / Espaço = arremessar']);
    return kit.promessa;
  }

  // ======================================================================
  // 3. DIGITANDO... AUTOCORRETOR TRAIDOR (Cap. 3)
  // ======================================================================
  function autocorretor(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Digitando… (Autocorretor Traidor)', icone: '📱', capitulo: 3, cor: '#22c55e', ambiente: 'corredor', max: 300, grade: { vignette: 0.9, saturation: 0.7, bloom: 0.35 } });
    const { stage, THREE } = kit;
    stage.camera.position.set(0, 1.55, -7.6);
    stage.camera.lookAt(0, 1.45, -12);
    const sabotagens = [
      { alvo: 'Não posso hoje', virou: 'Não posso... mas quero 😍' },
      { alvo: 'Tenho aula agora', virou: 'Tô indo aí agora!' },
      { alvo: 'Hoje não vai dar', virou: 'Hoje sim com certeza!' }
    ];
    let envios = 0;
    const mensagens = [{ de: 'ela', txt: 'Felpsss bora se encontrar? 💕' }];
    let digitando = '';
    let sabotou = false;

    function desenhar(ctx, w, h) {
      ctx.fillStyle = '#0b141a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1f2c34';
      ctx.fillRect(0, 0, w, 120);
      ctx.fillStyle = '#e9edef';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.fillText('Cecília 🧡', 110, 66);
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillStyle = '#8696a0';
      ctx.fillText('digitando...', 110, 98);
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.arc(60, 70, 34, 0, Math.PI * 2);
      ctx.fill();
      let y = 170;
      ctx.font = '28px "Segoe UI", sans-serif';
      mensagens.forEach((m) => {
        const tw = Math.min(w - 120, ctx.measureText(m.txt).width + 40);
        const x = m.de === 'ela' ? 24 : w - 24 - tw;
        ctx.fillStyle = m.de === 'ela' ? '#202c33' : m.sab ? '#7f1d1d' : '#005c4b';
        L().roundRect(ctx, x, y, tw, 64, 16);
        ctx.fill();
        ctx.fillStyle = '#e9edef';
        ctx.fillText(m.txt, x + 20, y + 42);
        y += 84;
      });
      // Barra de digitação
      ctx.fillStyle = '#1f2c34';
      ctx.fillRect(0, h - 120, w, 120);
      ctx.fillStyle = sabotou ? '#7f1d1d' : '#2a3942';
      L().roundRect(ctx, 20, h - 100, w - 40, 76, 38);
      ctx.fill();
      ctx.fillStyle = digitando ? '#e9edef' : '#8696a0';
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillText(digitando || 'Mensagem', 50, h - 52);
    }

    const fone = L().createPhoneMesh(desenhar);
    fone.position.set(0, 1.42, -9.0);
    fone.rotation.x = -0.12;
    fone.scale.setScalar(0.75);
    stage.scene.add(fone);
    const mao = L().sphere(0.18, L().M.toon('#ECC3AB'), 0, 0, 0, 16);
    mao.scale.set(1.5, 0.9, 0.5);
    mao.position.set(0.12, -0.92, 0.1);
    fone.add(mao);
    const luz = new THREE.PointLight('#a7f3d0', 1.2, 3, 1.6);
    luz.position.set(0, 1.6, -8.3);
    stage.scene.add(luz);

    const box = document.createElement('div');
    box.className = 'mgk-input';
    box.innerHTML = `<input id="auto-inp" placeholder="Digite a recusa..." autocomplete="off" /><button class="mg-btn primary" id="auto-send">Enviar</button>`;
    kit.layer.appendChild(box);
    const inp = box.querySelector('input');

    function rodada() {
      const s = sabotagens[envios];
      digitando = '';
      sabotou = false;
      inp.value = '';
      inp.focus();
      kit.hud(kit.pill(`📨 ${envios + 1}/3`));
      kit.msg(`Digite a recusa: <b>"${s.alvo}"</b>`);
      fone.redraw();
    }

    kit.on(inp, 'input', () => {
      const s = sabotagens[envios];
      if (!s) return;
      if (inp.value.length > 7 && !sabotou) {
        inp.value = s.virou;
        sabotou = true;
        kit.msg('⚠️ AUTOCORRETOR TRAIDOR SABOTOU SUA MENSAGEM!', '#f87171');
        kit.sfx('bruh');
        stage.shake(0.03, 8);
        stage.pulseGrade('aberration', 3, 0.6, 0);
      } else if (inp.value.length > 7) inp.value = s.virou;
      digitando = inp.value;
      fone.redraw();
    });

    function enviar() {
      if (envios >= 3) return;
      const s = sabotagens[envios];
      mensagens.push({ de: 'eu', txt: inp.value || s.virou, sab: sabotou || !inp.value });
      kit.sfx('discord');
      envios++;
      kit.timeout(() => {
        mensagens.push({ de: 'ela', txt: ['😍😍😍 tô indo!!', 'FELPS!! aeeee 💕', 'sabia que você ia topar 🥰'][envios - 1] });
        while (mensagens.length > 7) mensagens.shift();
        fone.redraw();
        kit.sfx('blip');
      }, 500);
      while (mensagens.length > 7) mensagens.shift();
      digitando = '';
      fone.redraw();
      if (envios >= 3) {
        kit.conquista('autocorretor_traidor');
        kit.timeout(() => kit.fim(300, { max: 300, texto: 'Três recusas enviadas. Três "sim" recebidos. O autocorretor venceu.' }), 1300);
      } else kit.timeout(rodada, 900);
    }
    kit.on(box.querySelector('#auto-send'), 'click', enviar);
    kit.on(inp, 'keydown', (e) => e.key === 'Enter' && enviar());

    kit.loop((dt, t) => {
      fone.position.y = 1.42 + Math.sin(t * 1.3) * 0.01;
      fone.rotation.z = sabotou ? Math.sin(t * 40) * 0.01 : 0;
    });
    kit.intro('A Cecília te chamou pra sair. Digite a recusa no ZapZap… se o autocorretor deixar.', ['⌨️ Digite e aperte Enter'], { semContagem: true }).then(rodada);
    return kit.promessa;
  }

  // ======================================================================
  // 4. NÃO OLHA PRA PORTA (Cap. 3)
  // ======================================================================
  function naoOlhaPorta(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Não Olha Pra Porta!', icone: '🚪', capitulo: 3, cor: '#ef4444', ambiente: 'sala_aula', ambienteOpts: { quadro: ['CÁLCULO I: f(x) = x²', 'PRESTE ATENÇÃO!', "lim x→0 (sen x)/x = 1"] }, max: 1000 });
    const { stage, THREE } = kit;
    const { M, box } = L();
    // Porta na parede direita com janelinha
    const porta = new THREE.Group();
    porta.position.set(6.94, 0, -1.2);
    const folha = new THREE.Group();
    folha.position.set(0, 0, -0.6);
    folha.add(box(0.08, 2.4, 1.2, M.std('#78350f', 0.6), 0, 1.2, 0.6));
    folha.add(box(0.1, 0.6, 0.5, M.basic('#1e293b'), 0, 1.7, 0.6));
    porta.add(folha);
    porta.add(box(0.06, 2.4, 1.25, M.basic('#05060a'), 0.05, 1.2, 0));
    stage.scene.add(porta);
    const cecilia = L().createCharacterCard(kit.personagem('cecilia'), { altura: 2.3 });
    cecilia.group.position.set(6.6, 0, -1.25);
    cecilia.group.visible = false;
    stage.scene.add(cecilia.group);
    stage.addUpdate((dt) => cecilia.update(dt, stage.camera));

    const cam = stage.camera;
    cam.position.set(0, 1.25, 3.4);
    const alvoQuadro = new THREE.Vector3(-0.8, 2.0, -4.5);
    const alvoPorta = new THREE.Vector3(6.9, 1.6, -1.2);
    let yaw = 0;
    let yawDesejado = 0;
    let atencao = 72;
    let seg = 15;
    let visivel = false;
    let gag = '';
    const bolha = document.createElement('div');
    bolha.className = 'mgk-bubble';
    bolha.style.display = 'none';
    kit.layer.appendChild(bolha);

    const olhando = () => yaw < 0.4;
    function hud() {
      kit.hud(kit.pill(`⏱️ ${seg}s`) + kit.pill(`🧠 Atenção: ${atencao}%`));
    }
    hud();

    kit.on(stage.domElement, 'pointermove', (e) => {
      const r = stage.domElement.getBoundingClientRect();
      yawDesejado = U().clamp((e.clientX - r.left) / r.width, 0, 1);
    });
    kit.tecla((e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') yawDesejado = 0;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') yawDesejado = 1;
    });
    kit.botoes([
      { label: '👀 Olhar Quadro', primary: true, tecla: 'A', onClick: () => (yawDesejado = 0) },
      { label: '🙄 Olhar Porta', tecla: 'D', onClick: () => (yawDesejado = 1) }
    ]);

    const gags = ['🫶 "felps!"', '💌 Bilhete no vidro', '👀 Olhando fixo', '🤫 "psiu!"'];
    const look = new THREE.Vector3();
    kit.loop((dt, t) => {
      // A tentação puxa o olhar pra porta quando a Cecília aparece
      const puxao = visivel ? 0.55 * dt : 0;
      yawDesejado = U().clamp(yawDesejado + puxao, 0, 1);
      yaw = U().damp(yaw, yawDesejado, 5, dt);
      look.copy(alvoQuadro).lerp(alvoPorta, yaw);
      cam.position.y = 1.25 + Math.sin(t * 1.4) * 0.01;
      cam.lookAt(look);
      folha.rotation.y = U().damp(folha.rotation.y, visivel ? -1.2 : 0, 6, dt);
      kit.medidor('foco', olhando() ? '✅ Olhando o quadro' : '⚠️ Olhando a porta', atencao / 100, { cor: atencao > 50 ? '#22c55e' : '#ef4444' });
      if (visivel) {
        const p = L().projectToScreen(stage, new THREE.Vector3(6.9, 2.4, -1.2));
        const r = stage.domElement.getBoundingClientRect();
        bolha.style.left = `${U().clamp((p.x / r.width) * 100 - 8, 2, 70)}%`;
        bolha.style.top = `${U().clamp((p.y / r.height) * 100 - 14, 2, 80)}%`;
      }
    });

    kit.intro('A Cecília vai aparecer na porta. Mantenha os olhos no <b>quadro</b> e resista quando o olhar for puxado!', ['🖱️ Mouse à esquerda = quadro', '⌨️ A / D']).then(() => {
      kit.intervalo(() => {
        seg--;
        visivel = Math.random() < 0.62;
        gag = gags[Math.floor(Math.random() * gags.length)];
        cecilia.group.visible = visivel;
        if (visivel) {
          cecilia.setExpression(Math.random() < 0.5 ? 'feliz' : 'neutro');
          bolha.style.display = 'block';
          bolha.innerHTML = `<span class="quem">Cecília</span>${gag}`;
          if (gag.includes('felps')) kit.sfx('felps');
        } else bolha.style.display = 'none';
        if (olhando()) atencao = Math.min(100, atencao + 5);
        else atencao = Math.max(0, atencao - (visivel ? 18 : 6));
        hud();
        if (seg <= 0) {
          kit.conquista('nao_olha_pra_porta');
          kit.fim(atencao * 10, { max: 1000, texto: atencao >= 70 ? 'O professor ficou orgulhoso. A Cecília, não.' : '"...felps?"' });
        }
      }, 1000);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 5. TREINO NA ACADEMIA / TREINO EM DUPLA (Caps. 4 e 12)
  // ======================================================================
  function treino(id) {
    const dupla = id === 'treino_dupla';
    const kit = root.LuiggiKit.abrir({
      id,
      titulo: dupla ? 'Treino em Dupla (Eloiza)' : 'Treino na Academia',
      icone: '🏋️',
      capitulo: dupla ? 12 : 4,
      cor: dupla ? '#dc2626' : '#22d3ee',
      ambiente: 'academia',
      ambienteOpts: { gotica: dupla },
      max: 650
    });
    const { stage, THREE } = kit;
    const { M, box, cyl } = L();
    const total = 6;
    let reps = 0;
    let pos = 0;
    let dirM = 1;
    let erroT = 0;

    function montarSupino(x, charId) {
      const g = new THREE.Group();
      g.position.set(x, 0, -1.6);
      g.rotation.y = -Math.PI / 2;
      stage.scene.add(g);
      const b = root.Luiggi3DChar.create(kit.personagem(charId));
      b.group.rotation.x = -Math.PI / 2;
      b.group.position.set(0, 0.62, 0.75);
      b.setPose('bench');
      g.add(b.group);
      stage.addUpdate((dt) => b.update(dt));
      const barra = new THREE.Group();
      barra.add(cyl(0.02, 0.02, 1.9, M.std('#d1d5db', 0.2, 1), 0, 0, 0, 10).rotateZ(Math.PI / 2));
      [-0.8, 0.8].forEach((dx) => {
        const anilha = cyl(0.22, 0.22, 0.07, M.std('#111', 0.5, 0.3), dx, 0, 0, 20);
        anilha.rotation.z = Math.PI / 2;
        barra.add(anilha);
      });
      barra.position.set(0, 1.25, -0.42);
      g.add(barra);
      // Suporte
      [-0.55, 0.55].forEach((dx) => g.add(box(0.06, 1.3, 0.06, M.std('#4b5563', 0.4, 0.8), dx, 0.65, -0.45)));
      g.add(box(0.4, 0.12, 1.5, M.std('#111827', 0.6), 0, 0.5, 0.0));
      [-0.55, 0.55].forEach((dz) => g.add(box(0.1, 0.45, 0.1, M.std('#4b5563', 0.4, 0.8), 0, 0.22, dz)));
      return { g, b, barra };
    }

    const luis = montarSupino(dupla ? -1.4 : -0.4, 'luis');
    const eloiza = dupla ? montarSupino(1.4, 'eloiza') : null;
    const amigo = dupla ? null : kit.boneco('amigo_academia', [1.15, 0, -2.0], -Math.PI * 0.6);
    const flag = dupla ? L().createFlagMesh() : null;
    if (flag) {
      flag.scale.setScalar(0.35);
      flag.position.set(2.6, 0, -0.6);
      stage.scene.add(flag);
    }
    stage.camera.position.set(0, 1.75, 2.0);
    stage.camera.lookAt(0, 0.85, -1.6);
    const suor = kit.particulas({ count: 40, size: 0.05, color: '#bae6fd', intensity: 1.2, gravity: 3, life: [0.4, 0.8], additive: false });

    function hud() {
      kit.hud(kit.pill(`💪 ${reps}/${total}`));
    }
    hud();

    function levantar() {
      if (kit.terminado) return;
      if (pos >= 0.35 && pos <= 0.65) {
        reps++;
        luis.b.play('press', 0.7);
        if (eloiza) eloiza.b.play('press', 0.7);
        kit.sfx('forno');
        kit.pop(pos > 0.45 && pos < 0.55 ? 'PERFEITO!' : '+1', luis.barra.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)), '#4ade80');
        if (amigo) amigo.play('thumbs', 0.6);
        suor.burst(10, luis.g.position.clone().add(new THREE.Vector3(0, 0.9, -0.1)), 1);
        hud();
        if (reps >= total) {
          if (dupla) kit.conquista('parceiros_de_treino');
          luis.b.setExpression('feliz');
          kit.timeout(() => kit.fim(650, { max: 650, texto: dupla ? 'Sincronia perfeita. (A bandeirinha vermelha no canto continua lá.)' : 'Amigo da academia: "Monstro! Mais uma série!"' }), 900);
        }
      } else {
        erroT = 0.5;
        kit.sfx('bruh');
        luis.b.setExpression('bravo');
        kit.msg('Travou! Aperte na zona verde.', '#f87171', 900);
      }
    }

    kit.on(stage.domElement, 'pointerdown', levantar);
    kit.tecla((e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        levantar();
      }
    });
    kit.botoes([{ label: '💪 Empurrar Barra na Zona Verde!', primary: true, tecla: 'Espaço', onClick: levantar }]);

    kit.loop((dt, t) => {
      pos += dirM * dt * 1.6;
      if (pos >= 1 || pos <= 0) {
        dirM *= -1;
        pos = U().clamp(pos, 0, 1);
      }
      kit.medidor('ritmo', 'Ritmo do supino', pos, { marcador: true, zona: [0.35, 0.65] });
      erroT = Math.max(0, erroT - dt);
      [luis, eloiza].forEach((s) => {
        if (!s) return;
        const ext = s.b.acao === 'press' ? Math.sin(Math.min(1, s.b.joints.eL.rotation.x + 1.2) * Math.PI * 0.5) : 0;
        s.barra.position.y = 1.0 + ext * 0.28 + (erroT > 0 && s === luis ? Math.sin(t * 50) * 0.02 : 0);
        s.barra.rotation.z = erroT > 0 && s === luis ? Math.sin(t * 30) * 0.06 : 0;
      });
      if (flag) {
        flag.userData.update(t);
        flag.visible = Math.floor(t * 2) % 2 === 0;
      }
    });

    kit.intro(dupla ? 'Treine em sincronia com a Eloiza. Aperte na <b>zona verde</b> para empurrar a barra.' : 'Aperte na <b>zona verde</b> de ritmo para levantar o supino sem travar.', ['🖱️ Clique / Espaço']);
    return kit.promessa;
  }

  // ======================================================================
  // 6. FUGA DAS NOTIFICAÇÕES (Cap. 4)
  // ======================================================================
  function fugaNotificacoes(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Fuga das Notificações', icone: '🔕', capitulo: 4, cor: '#a855f7', ambiente: 'academia', max: 550, grade: { vignette: 0.9 } });
    const { stage, THREE } = kit;
    stage.camera.position.set(0, 1.6, 3.2);
    stage.camera.lookAt(0, 1.5, 0);
    const msgs = ['oi sumido', 'vai treinar hj?', 'pq n responde?', 'tô passando aí', 'me respondeee', 'oi??'];
    const fone = L().createPhoneMesh((ctx, w, h) => {
      ctx.fillStyle = '#0b141a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(0, 0, w, 130);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillText('Gi Eta 💜 (Online)', 30, 80);
      ctx.font = 'bold 120px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('999+', w / 2, h / 2 + 40);
      ctx.font = '30px sans-serif';
      ctx.fillText('notificações', w / 2, h / 2 + 100);
    });
    fone.position.set(0, 1.45, 0);
    fone.scale.setScalar(0.6);
    stage.scene.add(fone);
    const faisca = kit.particulas({ count: 120, size: 0.08, shape: 'spark', color: '#c084fc', intensity: 2.4, life: [0.3, 0.7], drag: 2 });
    const notifs = [];
    let arquivadas = 0;
    const cache = new Map();

    function texNotif(txt) {
      if (cache.has(txt)) return cache.get(txt);
      const t = L().textures.text(`💬 Gi Eta: "${txt}"  ✕`, { w: 768, h: 128, size: 44, color: '#ffffff', bg: '#4c1d95', radius: 36, align: 'left' });
      t.userData.shared = true;
      cache.set(txt, t);
      return t;
    }

    function spawn() {
      if (notifs.length >= 12) {
        stage.shake(0.03, 6);
        kit.msg('📳 O celular não para de vibrar!', '#c084fc', 900);
        return;
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.18), new THREE.MeshBasicMaterial({ map: texNotif(U().pick(msgs)), transparent: true }));
      m.position.copy(fone.position);
      const alvo = new THREE.Vector3(U().rand(-2.0, 2.0), U().rand(0.7, 2.4), U().rand(0.2, 1.3));
      notifs.push({ m, alvo, t: 0, saindo: false, vel: new THREE.Vector3(), ph: Math.random() * 6 });
      stage.scene.add(m);
      kit.sfx('discord');
    }

    kit.on(stage.domElement, 'pointerdown', (e) => {
      const hit = kit.picker.pick(e, notifs.filter((n) => !n.saindo).map((n) => n.m));
      if (!hit) return;
      const n = notifs.find((x) => x.m === hit.object);
      n.saindo = true;
      n.vel.set(n.m.position.x > 0 ? 9 : -9, 2, 0);
      arquivadas++;
      kit.sfx('blip');
      faisca.burst(18, n.m.position.clone(), 2.5);
      kit.hud(kit.pill(`🗂️ Arquivadas: ${arquivadas}/10`));
      if (arquivadas >= 10) kit.timeout(() => kit.fim(550, { max: 550, texto: 'Modo não perturbe ativado. Por 5 minutos.' }), 400);
    });
    kit.on(stage.domElement, 'pointermove', (e) => {
      stage.domElement.style.cursor = kit.picker.pick(e, notifs.map((n) => n.m)) ? 'pointer' : '';
    });
    kit.hud(kit.pill('🗂️ Arquivadas: 0/10'));

    kit.loop((dt, t) => {
      fone.rotation.y = Math.sin(t * 0.8) * 0.2;
      fone.position.x = notifs.length > 8 ? Math.sin(t * 60) * 0.01 : 0;
      for (let i = notifs.length - 1; i >= 0; i--) {
        const n = notifs[i];
        n.t += dt;
        if (n.saindo) {
          n.m.position.addScaledVector(n.vel, dt);
          n.m.rotation.z += dt * 4;
          n.m.material.opacity = Math.max(0, n.m.material.opacity - dt * 2.5);
          if (n.m.material.opacity <= 0) {
            stage.scene.remove(n.m);
            n.m.geometry.dispose();
            n.m.material.dispose();
            notifs.splice(i, 1);
          }
        } else {
          U().dampVec3(n.m.position, n.alvo, 3, dt);
          n.m.position.y += Math.sin(t * 2 + n.ph) * 0.002;
          n.m.lookAt(stage.camera.position);
          const s = U().easeOutBack(Math.min(1, n.t * 2.5));
          n.m.scale.setScalar(s);
        }
      }
    });
    kit.intro('A Gi Eta está mandando mensagem sem parar. <b>Clique nas notificações</b> para arquivar 10 delas!', ['🖱️ Clique nas notificações']).then(() => {
      kit.intervalo(spawn, 500);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 7. MEDIDOR DE DILEMA (Cap. 5 · Bec Bar)
  // ======================================================================
  function medidorDilema(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Medidor de Dilema (Bec Bar)', icone: '⚖️', capitulo: 5, cor: '#ec4899', ambiente: 'bec_bar', max: 650 });
    const { stage, THREE } = kit;
    const { M, box, cyl } = L();
    stage.camera.position.set(0, 2.2, 5.4);
    stage.camera.lookAt(0, 1.6, 0);
    // Gangorra
    const base = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), M.std('#facc15', 0.3, 0.7));
    base.position.set(0, 0.4, 0.4);
    base.rotation.y = Math.PI / 6;
    stage.scene.add(base);
    const prancha = new THREE.Group();
    prancha.position.set(0, 0.85, 0.4);
    prancha.add(box(5.2, 0.12, 0.7, M.std('#ec4899', 0.35, 0.3), 0, 0, 0));
    prancha.add(box(5.2, 0.02, 0.72, M.glow('#f472b6', 1.5), 0, -0.07, 0, { cast: false }));
    stage.scene.add(prancha);
    const ch = (cid) => root.Luiggi3DChar.create(kit.personagem(cid));
    const fab = ch('fabricio');
    fab.group.position.set(0, 0.06, 0);
    fab.setPose('balance');
    const agatha = ch('agatha');
    agatha.group.position.set(-2.2, 0.06, 0);
    agatha.group.rotation.y = 0.6;
    const cali = ch('caliandra');
    cali.group.position.set(2.2, 0.06, 0);
    cali.group.rotation.y = -0.6;
    [fab, agatha, cali].forEach((b) => {
      prancha.add(b.group);
      stage.addUpdate((dt) => b.update(dt));
    });
    const grito = L().neonSign('FABRICIO, VOCÊ SABE O QUE FAZ!!', '#f43f5e', 4.4, 0.6, { size: 58, font: '"Arial Black", Impact, sans-serif' });
    grito.position.set(0, 3.0, 0.6);
    grito.visible = false;
    stage.scene.add(grito);

    let pos = 50;
    let seg = 14;
    const hud = () => kit.hud(kit.pill(`⏱️ ${seg}s`));
    hud();
    const puxar = (d) => (pos = U().clamp(pos + d, 5, 95));
    kit.tecla((e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') puxar(-14);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') puxar(14);
    });
    kit.botoes([
      { label: '⬅ Puxar Agatha', tecla: '←', onClick: () => puxar(-14) },
      { label: 'Puxar Caliandra ➡', tecla: '→', onClick: () => puxar(14) }
    ]);

    let ang = 0;
    kit.loop((dt, t) => {
      const alvo = ((pos - 50) / 50) * 0.32;
      ang = U().damp(ang, alvo, 5, dt);
      prancha.rotation.z = -ang;
      fab.inclinar(ang * 1.2);
      kit.medidor('dilema', 'Agatha ⟷ Caliandra', pos / 100, { marcador: true, zona: [0.42, 0.58] });
      grito.visible = pos < 42;
      if (grito.visible) grito.scale.setScalar(1 + Math.sin(t * 14) * 0.04);
    });

    kit.intro('Equilibre o Fabricio entre a <b>Agatha</b> e a <b>Caliandra</b>. Se pender demais... você sabe.', ['⌨️ ← →', '🖱️ Botões']).then(() => {
      kit.intervalo(() => {
        pos += (Math.random() - 0.54) * 18;
        pos = U().clamp(pos, 5, 95);
        if (pos < 42) {
          kit.contador('voceSabeOQueFaz', 1);
          kit.sfx('voce_sabe');
          cali.play('shout', 0.5).setExpression('bravo');
          stage.shake(0.03, 8);
        } else cali.setExpression('neutro');
        agatha.setExpression(pos > 58 ? 'bravo' : 'feliz');
      }, 450);
      kit.intervalo(() => {
        seg--;
        hud();
        if (seg <= 0) {
          kit.conquista('equilibrista');
          kit.fim(650, { max: 650, texto: 'Fabricio sobreviveu. Por enquanto.' });
        }
      }, 1000);
    });
    return kit.promessa;
  }

  const reg = (id, fn) => Q().registrar(id, fn);
  reg('puzzle_armario', puzzleArmario);
  reg('basquete_maria_clara', basquete);
  reg('digitando_autocorretor', autocorretor);
  reg('nao_olha_porta', naoOlhaPorta);
  reg('treino_academia', treino);
  reg('treino_dupla', treino);
  reg('fuga_notificacoes', fugaNotificacoes);
  reg('medidor_dilema', medidorDilema);
})(window);
