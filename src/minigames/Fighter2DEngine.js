/**
 * src/minigames/Fighter2DEngine.js
 * X1: THE RED FLAG BATTLE — Eloiza vs Yohana (+ secretos: Cara Aleatório e Luis).
 * Lógica de luta 2D original (mesmos golpes, danos, CPU e 2P local), agora encenada em 3D:
 * arena no galpão underground do TNT, lutadoras como bonecos 3D animados, projéteis 3D,
 * faíscas de impacto, câmera dinâmica e câmera lenta no nocaute.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;
  const U = () => root.Luiggi3D.U;

  const LUTADORES = {
    eloiza: {
      id: 'eloiza',
      nome: 'ELOIZA',
      cor: '#A855F7',
      stats: 'Ciúme 10/10 · Red Flags 11/10 · Transparência 0/10 · Mostrar Celular 0/10',
      especialNome: 'Melhores Amigos / Cadê Você?',
      superNome: 'SUPER: Minha Mãe Não Sabe'
    },
    yohana: {
      id: 'yohana',
      nome: 'YOHANA',
      cor: '#F59E0B',
      stats: 'Drama 10/10 · Red Flags 9/10 · Paciência Cinema 10/10 · Pagar Conta 0/10',
      especialNome: 'Tinder na França / Cala a Boca',
      superNome: 'SUPER: O Cara Aleatório Concorda'
    },
    cara_aleatorio: {
      id: 'cara_aleatorio',
      nome: 'O CARA ALEATÓRIO',
      cor: '#64748B',
      secreto: true,
      stats: 'Concordância 100/10 · Dano 1/10 · Identidade 0/10',
      especialNome: 'É... Verdade',
      superNome: 'SUPER: Complicado, né...'
    },
    luis: {
      id: 'luis',
      nome: 'LUIS (PACIFISTA)',
      cor: '#3B82F6',
      secreto: true,
      stats: 'Paz 10/10 · Cookies 10/10 · Ataque 0/10',
      especialNome: 'Pedir Calma / Fingir Celular',
      superNome: 'SUPER: Ir Embora Fazer Cookie'
    }
  };

  function abrirLutaX1(modoLivre = false) {
    const save = root.LuiggiSave;
    const conq = save?.state?.conquistas || [];
    const jogoZerado = save?.state?.jogoZerado;
    const liberarSecretos = modoLivre || jogoZerado || conq.includes('red_flag_battle');

    if (!root.LuiggiKit || !L()?.hasThree()) return Promise.resolve({ winId: 'eloiza' });

    const kit = root.LuiggiKit.abrir({ id: 'x1_eloiza_yohana', titulo: 'THE RED FLAG BATTLE', icone: '🥊', capitulo: 13, subtitulo: 'X1 no galpão do TNT', cor: '#ef4444', ambiente: 'galpao', max: 1200 });
    const { stage, THREE } = kit;
    const cam = stage.camera;
    cam.position.set(0, 2.2, 7);
    cam.lookAt(0, 1.2, 0);
    // Holofotes brancos sobre a arena para as lutadoras ficarem legíveis
        [[-3, '#fff1e0'], [3, '#e0e7ff']].forEach(([x, cor]) => {
      const sp = new THREE.SpotLight(cor, 12, 16, 0.55, 0.5, 1.2);
      sp.position.set(x, 6.5, 4.5);
      sp.target.position.set(x * 0.3, 1, 0.8);
      sp.castShadow = stage.renderer.shadowMap.enabled;
      stage.scene.add(sp, sp.target);
    });
    stage.setGrade({ tint: [1.02, 0.97, 0.97], exposure: 1.15, saturation: 1.05 });

    let p1Pick = 'eloiza';
    let p2Pick = 'yohana';
    let twoPlayers = false;
    let b1 = null;
    let b2 = null;

    function montarBonecos() {
      [b1, b2].forEach((b) => b && stage.scene.remove(b.group));
      b1 = root.Luiggi3DChar.create(kit.personagem(p1Pick), { escala: 1.15 });
      b2 = root.Luiggi3DChar.create(kit.personagem(p2Pick), { escala: 1.15 });
      b1.group.position.set(-2.2, 0, 0.8);
      b2.group.position.set(2.2, 0, 0.8);
      b1.group.rotation.y = Math.PI / 2 - 0.35;
      b2.group.rotation.y = -Math.PI / 2 + 0.35;
      b1.setPose('fight');
      b2.setPose('fight');
      stage.scene.add(b1.group, b2.group);
    }
    stage.addUpdate((dt) => {
      if (b1) b1.update(dt);
      if (b2) b2.update(dt);
    });

    // ------------------------------------------------------------------
    // SELEÇÃO
    // ------------------------------------------------------------------
    function telaSelecao() {
      montarBonecos();
      kit.botoes([]);
      kit.hud('');
      const el = document.createElement('div');
      el.className = 'fx-select';
      el.innerHTML = `
        <div class="fx-select-top">
          <h2>🥊 THE RED FLAG BATTLE</h2>
          <div class="btn-row">
            <button class="mini-btn ${!twoPlayers ? 'active' : ''}" data-modo="1">1P vs CPU</button>
            <button class="mini-btn ${twoPlayers ? 'active' : ''}" data-modo="2">2P Local</button>
            ${modoLivre ? '<button class="mini-btn" data-sair="1">Sair</button>' : ''}
          </div>
        </div>
        <div class="fx-roster">
          ${Object.values(LUTADORES)
          .filter((l) => !l.secreto || liberarSecretos)
          .map(
            (l) => `
            <button class="fx-card ${p1Pick === l.id ? 'p1' : ''} ${p2Pick === l.id ? 'p2' : ''}" data-pick="${l.id}" style="--c:${l.cor}">
              <div class="fx-card-art">${root.LuiggiRig.renderVisualNovelSprite(kit.personagem(l.id), { expressao: 'bravo' })}</div>
              <div class="fx-card-name">${l.nome} ${l.secreto ? '★' : ''}</div>
              <div class="fx-card-stats">${l.stats}</div>
              <div class="fx-card-moves">${l.especialNome}<br/>${l.superNome}</div>
            </button>`
          )
          .join('')}
        </div>
        <p class="fx-help">1P: <b>← → ↑</b> mover/pular · <b>A</b> Soco · <b>S</b> Chute · <b>D</b> Especial/Super · <b>F</b> Defender${twoPlayers ? ' · 2P: <b>N M I</b> mover · <b>J K L</b> golpes · <b>U</b> defender' : ''}</p>
        <button class="mg-btn primary fx-go">🔥 FIGHT!</button>`;
      kit.layer.innerHTML = '';
      kit.layer.appendChild(el);
      el.querySelectorAll('[data-modo]').forEach((b) =>
        b.addEventListener('click', () => {
          twoPlayers = b.dataset.modo === '2';
          telaSelecao();
        })
      );
      el.querySelector('[data-sair]')?.addEventListener('click', () => kit.encerrar({ cancelado: true }));
      el.querySelectorAll('[data-pick]').forEach((b) =>
        b.addEventListener('click', () => {
          p1Pick = b.dataset.pick;
          p2Pick = p1Pick === 'yohana' ? 'eloiza' : 'yohana';
          kit.sfx('blip');
          telaSelecao();
        })
      );
      el.querySelector('.fx-go').addEventListener('click', () => {
        el.remove();
        iniciarLuta();
      });
    }

    // ------------------------------------------------------------------
    // LUTA (lógica original em coordenadas 720x360, a 60 passos/s)
    // ------------------------------------------------------------------
    function iniciarLuta() {
      montarBonecos();
      const hudEl = document.createElement('div');
      hudEl.className = 'fx-hud';
      hudEl.innerHTML = `
        <div class="fx-side"><div class="fx-name" style="color:${LUTADORES[p1Pick].cor}">${LUTADORES[p1Pick].nome}</div><div class="fx-hp"><div id="f-hp1" style="background:${LUTADORES[p1Pick].cor}"></div></div><div class="fx-sp"><div id="f-sp1"></div></div><div class="fx-wins" id="f-w1"></div></div>
        <div class="fx-timer" id="f-timer">99</div>
        <div class="fx-side right"><div class="fx-name" style="color:${LUTADORES[p2Pick].cor}">${LUTADORES[p2Pick].nome}</div><div class="fx-hp"><div id="f-hp2" style="background:${LUTADORES[p2Pick].cor}"></div></div><div class="fx-sp"><div id="f-sp2"></div></div><div class="fx-wins" id="f-w2"></div></div>
        <div class="fx-announce" id="f-announce"></div>
        <div class="fx-commentary" id="f-comment">🎙️ Fabricio & Matheus Neuman: "THE RED FLAG BATTLE!"</div>
        <div class="fx-credits hidden" id="f-credits">PÓS-CRÉDITOS BLOQUEANDO A VISÃO...</div>`;
      kit.layer.innerHTML = '';
      kit.layer.appendChild(hudEl);
      const $ = (id) => hudEl.querySelector('#' + id);
      kit.hud(kit.pill(`${LUTADORES[p1Pick].nome} vs ${LUTADORES[p2Pick].nome}`));

      const faiscas = kit.particulas({ count: 200, size: 0.12, shape: 'spark', colors: ['#fde047', '#fb923c', '#ffffff'], intensity: 3, gravity: 6, life: [0.2, 0.5], drag: 2 });
      const cartas3D = [];

      const keys = {};
      let round = 1;
      let winsP1 = 0;
      let winsP2 = 0;
      let timer = 99;
      let frame = 0;
      let creditsOverlay = 0;
      let acumulado = 0;
      let slowmo = 0;
      let pausaRound = 1.2;

      function makeFighter(id, x, facing) {
        return { id, x, y: 300, vy: 0, hp: 100, superMeter: 0, facing, defending: false, stun: 0, cd: 0, tookDamage: false, animTxt: '' };
      }
      let f1 = makeFighter(p1Pick, 170, 1);
      let f2 = makeFighter(p2Pick, 550, -1);
      const projectiles = [];
      const to3X = (px) => (px - 360) * 0.0125;
      const to3Y = (py) => Math.max(0, (300 - py) * 0.0125);
      const bonecoDe = (f) => (f === f1 ? b1 : b2);

      function anunciar(txt, cor = '#fde047') {
        const a = $('f-announce');
        a.textContent = txt;
        a.style.color = cor;
        a.classList.remove('show');
        void a.offsetWidth;
        a.classList.add('show');
      }
      function addPopup(txt, x, y, col = '#FACC15') {
        kit.pop(txt, new THREE.Vector3(to3X(x), to3Y(y) + 0.6, 0.8), col);
      }
      function comentar(txt) {
        $('f-comment').textContent = `🎙️ ${txt}`;
      }
      function impacto(f, forte) {
        const b = bonecoDe(f);
        b.play('hit', 0.35).setExpression('bravo');
        faiscas.burst(forte ? 40 : 18, new THREE.Vector3(to3X(f.x), to3Y(f.y) + 1.5, 0.8), forte ? 4 : 2.5);
        stage.shake(forte ? 0.22 : 0.08, 7);
        kit.sfx('punch');
      }

      function ataque(atk, def, tipo) {
        if (atk.cd > 0 || atk.stun > 0 || pausaRound > 0) return;
        atk.cd = tipo === 'a' ? 18 : tipo === 's' ? 24 : 34;
        const ba = bonecoDe(atk);
        ba.play(tipo === 'a' ? (Math.random() < 0.5 ? 'punch' : 'punchL') : tipo === 's' ? 'kick' : 'special', tipo === 'd' ? 0.5 : 0.32);
        kit.sfx('punch');

        if (atk.id === 'luis') {
          atk.animTxt = tipo === 'd' ? '🍪 Vou fazer cookie!' : '🙏 Calma aí!';
          atk.hp = Math.min(100, atk.hp + 4);
          addPopup('CALMA!', atk.x, atk.y - 70, '#60A5FA');
          if (tipo === 'd') {
            def.hp -= 12;
            def.tookDamage = true;
            addPopup('SILÊNCIO!', def.x, def.y - 60, '#93C5FD');
            impacto(def, false);
          }
          return;
        }
        if (atk.id === 'cara_aleatorio') {
          atk.animTxt = 'É... verdade.';
          if (Math.abs(atk.x - def.x) < 110) {
            def.hp -= def.defending ? 1 : 4;
            def.tookDamage = true;
            addPopup('É... VERDADE', def.x, def.y - 65, '#CBD5E1');
            impacto(def, false);
          }
          return;
        }
        if (tipo === 'd') {
          if (atk.superMeter >= 100) {
            atk.superMeter = 0;
            stage.pulseGrade('flash', 0.6, 0.5, 0);
            stage.pulseGrade('aberration', 4, 0.8, 0);
            if (atk.id === 'eloiza') {
              atk.x = Math.max(40, Math.min(680, def.x - def.facing * 50));
              def.hp -= 26;
              def.tookDamage = true;
              addPopup('MINHA MÃE NÃO SABE!', def.x, 180, '#C084FC');
              anunciar('MINHA MÃE NÃO SABE!', '#c084fc');
              comentar('Fabricio: "QUE GOLPE, NEUMAN!"');
            } else {
              def.hp -= 24;
              def.tookDamage = true;
              addPopup('O CARA ALEATÓRIO CONCORDA!', def.x, 180, '#FBBF24');
              anunciar('O CARA ALEATÓRIO CONCORDA!', '#fbbf24');
              comentar('Neuman: "ISSO VAI DEIXAR MARCA NO GRUPO!"');
            }
            impacto(def, true);
            return;
          }
          if (atk.id === 'eloiza') {
            projectiles.push({ owner: atk, x: atk.x + atk.facing * 24, y: atk.y - 35, vx: atk.facing * 6.5, dmg: 12, label: '🔒⭐' });
            addPopup('MELHORES AMIGOS!', atk.x, atk.y - 75, '#4ADE80');
          } else {
            projectiles.push({ owner: atk, x: def.x, y: 40, vx: 0, vy: 6, dmg: 13, label: '🧾🇫🇷' });
            if (Math.random() < 0.4) creditsOverlay = 90;
            addPopup('TINDER NA FRANÇA!', atk.x, atk.y - 75, '#F59E0B');
          }
          return;
        }
        const alcance = tipo === 's' ? 92 : 76;
        if (Math.abs(atk.x - def.x) <= alcance && Math.abs(atk.y - def.y) < 55) {
          const dmg = (tipo === 's' ? 11 : 8) * (def.defending ? 0.3 : 1);
          def.hp = Math.max(0, def.hp - dmg);
          def.tookDamage = true;
          atk.superMeter = Math.min(100, atk.superMeter + 18);
          addPopup(tipo === 's' ? 'PLAFT!' : 'POW!', def.x, def.y - 60);
          if (def.defending) faiscas.burst(10, new THREE.Vector3(to3X(def.x), to3Y(def.y) + 1.3, 0.8), 1.5, '#38bdf8');
          else impacto(def, tipo === 's');
        }
      }

      kit.tecla((e) => {
        keys[e.code] = true;
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
        if (e.code === 'KeyA') ataque(f1, f2, 'a');
        if (e.code === 'KeyS') ataque(f1, f2, 's');
        if (e.code === 'KeyD') ataque(f1, f2, 'd');
        if (twoPlayers) {
          if (e.code === 'KeyJ') ataque(f2, f1, 'a');
          if (e.code === 'KeyK') ataque(f2, f1, 's');
          if (e.code === 'KeyL') ataque(f2, f1, 'd');
        }
      });
      kit.tecla((e) => (keys[e.code] = false), 'keyup');
      const tecla = (code) => ({ onDown: () => (keys[code] = true), onUp: () => (keys[code] = false) });
      kit.botoes([
        { label: '◀', ...tecla('ArrowLeft') },
        { label: '▲', ...tecla('ArrowUp') },
        { label: '▶', ...tecla('ArrowRight') },
        { label: '👊 Soco', tecla: 'A', onClick: () => ataque(f1, f2, 'a') },
        { label: '🦵 Chute', tecla: 'S', onClick: () => ataque(f1, f2, 's') },
        { label: '✨ Especial', tecla: 'D', primary: true, onClick: () => ataque(f1, f2, 'd') },
        { label: '🛡️ Defender', tecla: 'F', ...tecla('KeyF') }
      ]);

      function proximoRound(vencedor) {
        const perdedor = vencedor === 1 ? f2 : f1;
        bonecoDe(perdedor).setPose('ko').setExpression('chocado');
        bonecoDe(vencedor === 1 ? f1 : f2).setPose('cheer').setExpression('feliz');
        anunciar(perdedor.hp <= 0 ? 'K.O.!' : 'TEMPO!', '#ef4444');
        slowmo = 1.4;
        kit.sfx('bruh');
        if (vencedor === 1) {
          winsP1++;
          if (!f1.tookDamage) kit.conquista('perfect_x1');
        } else winsP2++;
        $('f-w1').textContent = '🏆'.repeat(winsP1);
        $('f-w2').textContent = '🏆'.repeat(winsP2);
        if (winsP1 >= 2 || winsP2 >= 2) {
          kit.timeout(() => finalizarLuta(winsP1 >= 2 ? 1 : 2), 2200);
          pausaRound = 999;
          return;
        }
        pausaRound = 2.6;
        kit.timeout(() => {
          round++;
          timer = 99;
          f1 = makeFighter(p1Pick, 170, 1);
          f2 = makeFighter(p2Pick, 550, -1);
          b1.setPose('fight').setExpression('neutro');
          b2.setPose('fight').setExpression('neutro');
          comentar(`ROUND ${round}... FIGHT!`);
          anunciar(`ROUND ${round}`, '#fde047');
          kit.timeout(() => anunciar('FIGHT!', '#ef4444'), 900);
        }, 1800);
      }

      function updateFighter(f, left, right, up, def) {
        if (f.cd > 0) f.cd--;
        if (f.stun > 0) {
          f.stun--;
          return;
        }
        f.defending = def;
        if (!def) {
          if (left) f.x -= 4.2;
          if (right) f.x += 4.2;
          if (up && f.y >= 300) {
            f.vy = -12.5;
            bonecoDe(f).play('jump', 0.6);
          }
        }
        f.vy += 0.65;
        f.y += f.vy;
        if (f.y >= 300) {
          f.y = 300;
          f.vy = 0;
        }
        f.x = Math.max(45, Math.min(675, f.x));
      }

      function passo() {
        frame++;
        if (frame % 60 === 0 && timer > 0) timer--;
        if (creditsOverlay > 0) creditsOverlay--;
        updateFighter(f1, keys.ArrowLeft, keys.ArrowRight, keys.ArrowUp, keys.KeyF);
        f1.facing = f2.x >= f1.x ? 1 : -1;
        f2.facing = f1.x >= f2.x ? 1 : -1;
        if (twoPlayers) updateFighter(f2, keys.KeyN, keys.KeyM, keys.KeyI, keys.KeyU);
        else {
          const dist = f2.x - f1.x;
          updateFighter(f2, dist > 78, dist < -78, Math.random() < 0.015, Math.random() < 0.12);
          if (Math.abs(dist) < 92 && frame % 34 === 0) ataque(f2, f1, Math.random() < 0.25 ? 'd' : Math.random() < 0.5 ? 's' : 'a');
        }
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.x += p.vx || 0;
          p.y += p.vy || 0;
          const target = p.owner === f1 ? f2 : f1;
          if (Math.abs(p.x - target.x) < 28 && Math.abs(p.y - (target.y - 35)) < 45) {
            target.hp = Math.max(0, target.hp - (target.defending ? p.dmg * 0.3 : p.dmg));
            target.tookDamage = true;
            p.owner.superMeter = Math.min(100, p.owner.superMeter + 20);
            addPopup('ACERTOU!', target.x, target.y - 70);
            impacto(target, false);
            projectiles.splice(i, 1);
          } else if (p.x < 0 || p.x > 720 || p.y > 390) projectiles.splice(i, 1);
        }
        if (f1.hp <= 0) proximoRound(2);
        else if (f2.hp <= 0) proximoRound(1);
        else if (timer <= 0) proximoRound(f1.hp >= f2.hp ? 1 : 2);
      }

      function projetil3D(p) {
        const g = new THREE.Group();
        if (p.label === '🔒⭐') {
          const estrela = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), L().M.glow('#4ade80', 2.5));
          g.add(estrela);
          const cad = L().box(0.2, 0.16, 0.08, L().M.std('#facc15', 0.3, 0.9), 0, -0.02, 0.12);
          g.add(cad);
          g.add(L().halo('#4ade80', 0.9, 1.2));
        } else {
          const nota = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ map: L().textures.text('🧾\nFRANÇA\n€€€', { w: 128, h: 170, size: 34, color: '#111827', bg: '#f8fafc' }), side: THREE.DoubleSide }));
          g.add(nota);
          g.add(L().halo('#f59e0b', 0.8, 1.0));
        }
        stage.scene.add(g);
        return g;
      }

      anunciar('ROUND 1', '#fde047');
      kit.timeout(() => anunciar('FIGHT!', '#ef4444'), 900);
      const look = new THREE.Vector3(0, 1.4, 0);

      kit.loop((dt, t) => {
        const escala = slowmo > 0 ? 0.25 : 1;
        slowmo = Math.max(0, slowmo - dt);
        pausaRound = Math.max(0, pausaRound - dt);
        if (pausaRound <= 0) {
          acumulado += dt * escala;
          while (acumulado >= 1 / 60) {
            acumulado -= 1 / 60;
            passo();
            if (pausaRound > 0) break;
          }
        }
        // HUD
        $('f-hp1').style.width = `${Math.max(0, f1.hp)}%`;
        $('f-hp2').style.width = `${Math.max(0, f2.hp)}%`;
        $('f-sp1').style.width = `${Math.min(100, f1.superMeter)}%`;
        $('f-sp2').style.width = `${Math.min(100, f2.superMeter)}%`;
        $('f-sp1').parentElement.classList.toggle('cheio', f1.superMeter >= 100);
        $('f-sp2').parentElement.classList.toggle('cheio', f2.superMeter >= 100);
        $('f-timer').textContent = timer;
        $('f-credits').classList.toggle('hidden', creditsOverlay <= 0);
        // Bonecos
        [[f1, b1], [f2, b2]].forEach(([f, b]) => {
          const x = to3X(f.x);
          b.group.position.x = U().damp(b.group.position.x, x, 18, dt);
          b.group.position.y = to3Y(f.y);
          b.group.rotation.y = U().damp(b.group.rotation.y, f.facing > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35, 12, dt);
          if (b.pose !== 'ko' && b.pose !== 'cheer') {
            const andando = Math.abs(b.group.position.x - x) > 0.01;
            b.setPose(f.defending ? 'block' : andando && f.y >= 300 ? 'walk' : 'fight', 1.6);
          }
        });
        // Projéteis
        while (cartas3D.length < projectiles.length) cartas3D.push(projetil3D(projectiles[cartas3D.length]));
        while (cartas3D.length > projectiles.length) {
          const g = cartas3D.pop();
          stage.scene.remove(g);
        }
        cartas3D.forEach((g, i) => {
          const p = projectiles[i];
          g.position.set(to3X(p.x), to3Y(p.y) + 1.4, 0.8);
          g.rotation.y += dt * 6;
        });
        // Câmera
        const xa = b1.group.position.x;
        const xb = b2.group.position.x;
        const mid = (xa + xb) / 2;
        const sep = Math.abs(xa - xb);
        const alvoZ = 4.0 + sep * 0.45 + (slowmo > 0 ? -1.2 : 0);
        cam.position.x = U().damp(cam.position.x, mid * 0.8, 4, dt);
        cam.position.z = U().damp(cam.position.z, alvoZ, 3, dt);
        cam.position.y = U().damp(cam.position.y, 1.9 + Math.sin(t * 0.4) * 0.08, 3, dt);
        look.set(U().damp(look.x, mid, 5, dt), 1.2, 0.6);
        cam.lookAt(look);
      });

      function finalizarLuta(vencedorNum) {
        const winId = vencedorNum === 1 ? p1Pick : p2Pick;
        kit.conquista('red_flag_battle');
        if (winId === 'eloiza') kit.conquista('time_eloiza');
        if (winId === 'yohana') kit.conquista('time_yohana');
        if (winId === 'cara_aleatorio') kit.conquista('lenda_do_concordo');
        if (winId === 'luis') kit.conquista('pacifista');
        if (save) save.salvarRecordeMinigame('x1_eloiza_yohana', winsP1 * 500 + 200);
        const el = document.createElement('div');
        el.className = 'mgk-result';
        el.innerHTML = `
          <div class="mgk-result-card">
            <div class="mgk-result-kicker">Vitória</div>
            <h2 style="margin:6px 0;color:${LUTADORES[winId].cor}">🏆 ${LUTADORES[winId].nome} WINS!</h2>
            <div class="fx-stamp" style="margin:8px auto;">MAS NA VIDA REAL...</div>
            <p>Ninguém venceu. O Luis perdeu a paz, o Fabricio perdeu o rolê, e o Cara Aleatório continua concordando até hoje.</p>
            <div class="mg-actions">
              ${modoLivre ? '<button class="mg-btn" data-again="1">↻ Outro X1</button>' : ''}
              <button class="mg-btn primary" data-done="1">Continuar ▶</button>
            </div>
          </div>`;
        kit.layer.appendChild(el);
        el.querySelector('[data-done]').addEventListener('click', () => kit.encerrar({ winId }));
        el.querySelector('[data-again]')?.addEventListener('click', () => {
          kit.encerrar(null);
          abrirLutaX1(modoLivre).then((r) => resolverExterno(r));
        });
      }
    }

    let resolverExterno = null;
    const promessaFinal = new Promise((r) => (resolverExterno = r));
    kit.promessa.then((v) => {
      if (v !== null) resolverExterno(v);
    });
    telaSelecao();
    return promessaFinal;
  }

  root.LuiggiFighter = { abrirLutaX1 };
})(window);
