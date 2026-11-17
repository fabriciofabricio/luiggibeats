/**
 * src/minigames/Fighter2DEngine.js
 * Jogo de Luta 2D pastelão: X1 Eloiza vs Yohana (+ secretos: Cara Aleatório e Luis).
 * Suporta 1P vs CPU e 2P local no mesmo teclado.
 */
(function (root) {
  'use strict';

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
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      const conq = save?.state?.conquistas || [];
      const jogoZerado = save?.state?.jogoZerado;

      let p1Pick = 'eloiza';
      let p2Pick = 'yohana';
      let twoPlayers = false;

      function telaSelecao() {
        host.classList.remove('hidden');
        const liberarSecretos = modoLivre || jogoZerado || conq.includes('red_flag_battle');

        host.innerHTML = `
          <div class="mg-modal fight-theme">
            <div class="mg-header">
              <h3>🥊 THE RED FLAG BATTLE — Seleção de Lutador</h3>
              <div class="btn-row">
                <button class="mini-btn ${!twoPlayers ? 'active' : ''}" id="f-1p">1P vs CPU</button>
                <button class="mini-btn ${twoPlayers ? 'active' : ''}" id="f-2p">2P Local</button>
                ${modoLivre ? `<button class="mini-btn" id="f-close">Sair</button>` : ''}
              </div>
            </div>
            <div class="mg-body">
              <div class="fighter-grid">
                ${Object.values(LUTADORES)
                  .filter((l) => !l.secreto || liberarSecretos)
                  .map(
                    (l) => `
                  <button class="fighter-card ${p1Pick === l.id ? 'p1-sel' : ''}" data-pick="${l.id}">
                    <div class="f-name" style="color:${l.cor}">${l.nome} ${l.secreto ? '★' : ''}</div>
                    <div class="f-stats">${l.stats}</div>
                    <div class="f-moves">${l.especialNome}<br/>${l.superNome}</div>
                  </button>`
                  )
                  .join('')}
              </div>
              <p style="font-size:0.8rem;color:#cbd5e1;margin-top:10px;text-align:center;">
                Controles 1P: <strong>← → ↑ ↓</strong> mover/pular · <strong>A</strong> Soco · <strong>S</strong> Chute · <strong>D</strong> Especial/Super · <strong>F</strong> Defender
              </p>
              <div class="mg-actions"><button class="mg-btn primary" id="f-start">🔥 FIGHT!</button></div>
            </div>
          </div>
        `;

        document.getElementById('f-1p').addEventListener('click', () => {
          twoPlayers = false;
          telaSelecao();
        });
        document.getElementById('f-2p').addEventListener('click', () => {
          twoPlayers = true;
          telaSelecao();
        });
        const cl = document.getElementById('f-close');
        if (cl) {
          cl.addEventListener('click', () => {
            host.classList.add('hidden');
            host.innerHTML = '';
            resolve({ cancelado: true });
          });
        }

        host.querySelectorAll('[data-pick]').forEach((btn) => {
          btn.addEventListener('click', () => {
            p1Pick = btn.dataset.pick;
            p2Pick = p1Pick === 'yohana' ? 'eloiza' : 'yohana';
            telaSelecao();
          });
        });

        document.getElementById('f-start').addEventListener('click', () => iniciarLuta());
      }

      function iniciarLuta() {
        host.innerHTML = `
          <div class="mg-modal fight-theme">
            <div class="mg-header">
              <div>
                <h3>🥊 ${LUTADORES[p1Pick].nome} vs ${LUTADORES[p2Pick].nome}</h3>
                <div class="mg-sub" id="f-comment">🎙️ Fabricio & Matheus Neuman: "THE RED FLAG BATTLE!"</div>
              </div>
              <span class="badge-pill" id="f-round-lbl">ROUND 1 · 99</span>
            </div>
            <div class="fight-wrap" style="position:relative;">
              <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;">
                <div style="flex:1;">
                  <div style="font-size:0.74rem;font-weight:800;color:${LUTADORES[p1Pick].cor}">${LUTADORES[p1Pick].nome}</div>
                  <div style="height:12px;background:#1f2937;border-radius:6px;overflow:hidden;"><div id="f-hp1" style="height:100%;width:100%;background:${LUTADORES[p1Pick].cor};transition:width 0.12s;"></div></div>
                  <div style="height:5px;background:#111827;border-radius:4px;margin-top:3px;overflow:hidden;"><div id="f-sp1" style="height:100%;width:0%;background:#facc15;"></div></div>
                </div>
                <div style="flex:1;text-align:right;">
                  <div style="font-size:0.74rem;font-weight:800;color:${LUTADORES[p2Pick].cor}">${LUTADORES[p2Pick].nome}</div>
                  <div style="height:12px;background:#1f2937;border-radius:6px;overflow:hidden;"><div id="f-hp2" style="height:100%;width:100%;background:${LUTADORES[p2Pick].cor};margin-left:auto;transition:width 0.12s;"></div></div>
                  <div style="height:5px;background:#111827;border-radius:4px;margin-top:3px;overflow:hidden;"><div id="f-sp2" style="height:100%;width:0%;background:#facc15;margin-left:auto;"></div></div>
                </div>
              </div>
              <div id="f-viewport" style="width:100%;height:360px;border-radius:12px;overflow:hidden;border:1px solid #3f1d28;position:relative;"></div>
              <div id="f-float-msg" style="position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);font-weight:900;font-size:1.4rem;color:#facc15;text-shadow:0 3px 10px #000;pointer-events:none;"></div>
              <div class="touch-pad">
                <button data-fk="left">◀</button>
                <button data-fk="up">▲</button>
                <button data-fk="right">▶</button>
                <button data-fk="a">A Soco</button>
                <button data-fk="s">S Chute</button>
                <button data-fk="d">D Esp</button>
                <button data-fk="f">F Def</button>
              </div>
            </div>
          </div>
        `;

        const viewport = document.getElementById('f-viewport');
        const hp1El = document.getElementById('f-hp1');
        const hp2El = document.getElementById('f-hp2');
        const sp1El = document.getElementById('f-sp1');
        const sp2El = document.getElementById('f-sp2');
        const floatEl = document.getElementById('f-float-msg');
        const comEl = document.getElementById('f-comment');
        const roundEl = document.getElementById('f-round-lbl');

        const stage3D =
          root.Luiggi3D &&
          root.Luiggi3D.createStage(viewport, {
            bg: 0x12070b,
            fog: 0.03,
            fov: 46,
            camPos: [0, 4.2, 13.5],
            lookAt: [0, 1.5, 0]
          });
        let fallbackCtx = null;
        const fight3D = { p1: null, p2: null, s1: null, s2: null, projs: [] };

        if (stage3D) {
          const { THREE, scene } = stage3D;
          const floor = new THREE.Mesh(
            new THREE.BoxGeometry(24, 0.4, 12),
            new THREE.MeshStandardMaterial({ color: 0x26131a, roughness: 0.45, metalness: 0.25 })
          );
          floor.position.y = -0.2;
          floor.receiveShadow = true;
          scene.add(floor);

          // Subaru azul estacionado ao fundo do galpão!
          const sub = root.Luiggi3D.createSubaruMesh('#1245A8', true);
          sub.scale.setScalar(0.9);
          sub.position.set(0, 0, -4.4);
          sub.rotation.y = Math.PI / 2;
          scene.add(sub);

          const makeFighterMesh = (colHex) => {
            const g = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colHex), roughness: 0.38, metalness: 0.2 });
            const skin = new THREE.MeshStandardMaterial({ color: 0xfde2d4, roughness: 0.6 });
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.35, 0.55), mat);
            torso.position.y = 1.45;
            torso.castShadow = true;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), skin);
            head.position.y = 2.52;
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), mat);
            legL.position.set(-0.24, 0.42, 0);
            const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), mat);
            legR.position.set(0.24, 0.42, 0);
            const shield = new THREE.Mesh(
              new THREE.SphereGeometry(1.5, 16, 14),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, wireframe: true })
            );
            shield.position.y = 1.45;
            shield.visible = false;
            g.add(torso, head, legL, legR, shield);
            g.userData.shield = shield;
            return g;
          };

          fight3D.p1 = makeFighterMesh(LUTADORES[p1Pick].cor);
          fight3D.p2 = makeFighterMesh(LUTADORES[p2Pick].cor);
          scene.add(fight3D.p1, fight3D.p2);
        } else {
          const cv = document.createElement('canvas');
          cv.width = 720;
          cv.height = 360;
          viewport.appendChild(cv);
          fallbackCtx = cv.getContext('2d');
        }

        const keys = {};
        let round = 1;
        let winsP1 = 0;
        let winsP2 = 0;
        let timer = 99;
        let ended = false;
        let rafId = null;
        let frame = 0;
        let creditsOverlay = 0;

        function makeFighter(id, x, facing) {
          return {
            id,
            x,
            y: 300,
            vy: 0,
            hp: 100,
            superMeter: 0,
            facing,
            defending: false,
            stun: 0,
            cd: 0,
            tookDamage: false,
            animTxt: ''
          };
        }

        let f1 = makeFighter(p1Pick, 170, 1);
        let f2 = makeFighter(p2Pick, 550, -1);
        const projectiles = [];
        const popups = [];

        function addPopup(txt, x, y, col = '#FACC15') {
          popups.push({ txt, x, y, col, life: 36 });
        }

        function comentar(txt) {
          if (comEl) comEl.textContent = `🎙️ ${txt}`;
        }

        function ataque(atk, def, tipo) {
          if (atk.cd > 0 || atk.stun > 0) return;
          atk.cd = tipo === 'a' ? 18 : tipo === 's' ? 24 : 34;
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('punch');

          if (atk.id === 'luis') {
            atk.animTxt = tipo === 'd' ? '🍪 Vou fazer cookie!' : '🙏 Calma aí!';
            atk.hp = Math.min(100, atk.hp + 4);
            addPopup('CALMA!', atk.x, atk.y - 70, '#60A5FA');
            // Luis pacifista dá dano moral mínimo se o oponente tentar atacar ou vence por tempo/paciência!
            if (tipo === 'd') {
              def.hp -= 12;
              def.tookDamage = true;
              addPopup('SILÊNCIO!', def.x, def.y - 60, '#93C5FD');
            }
            return;
          }

          if (atk.id === 'cara_aleatorio') {
            atk.animTxt = 'É... verdade.';
            if (Math.abs(atk.x - def.x) < 110) {
              def.hp -= def.defending ? 1 : 4;
              def.tookDamage = true;
              addPopup('É... VERDADE', def.x, def.y - 65, '#CBD5E1');
            }
            return;
          }

          if (tipo === 'd') {
            // Especial ou Super!
            if (atk.superMeter >= 100) {
              atk.superMeter = 0;
              if (atk.id === 'eloiza') {
                atk.x = Math.max(40, Math.min(680, def.x - def.facing * 50));
                def.hp -= 26;
                def.tookDamage = true;
                addPopup('MINHA MÃE NÃO SABE!', def.x, 180, '#C084FC');
                comentar('Fabricio: "QUE GOLPE, NEUMAN!"');
              } else {
                def.hp -= 24;
                def.tookDamage = true;
                addPopup('O CARA ALEATÓRIO CONCORDA!', def.x, 180, '#FBBF24');
                comentar('Neuman: "ISSO VAI DEIXAR MARCA NO GRUPO!"');
              }
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
          }
        }

        function onKeyDown(e) {
          keys[e.code] = true;
          if (e.code === 'KeyA') ataque(f1, f2, 'a');
          if (e.code === 'KeyS') ataque(f1, f2, 's');
          if (e.code === 'KeyD') ataque(f1, f2, 'd');
          if (twoPlayers) {
            if (e.code === 'KeyJ') ataque(f2, f1, 'a');
            if (e.code === 'KeyK') ataque(f2, f1, 's');
            if (e.code === 'KeyL') ataque(f2, f1, 'd');
          }
        }
        function onKeyUp(e) {
          keys[e.code] = false;
        }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        host.querySelectorAll('[data-fk]').forEach((b) => {
          const k = b.dataset.fk;
          b.addEventListener('pointerdown', () => {
            if (k === 'left') keys['ArrowLeft'] = true;
            if (k === 'right') keys['ArrowRight'] = true;
            if (k === 'up') keys['ArrowUp'] = true;
            if (k === 'f') keys['KeyF'] = true;
            if (k === 'a' || k === 's' || k === 'd') ataque(f1, f2, k);
          });
          b.addEventListener('pointerup', () => {
            keys['ArrowLeft'] = false;
            keys['ArrowRight'] = false;
            keys['ArrowUp'] = false;
            keys['KeyF'] = false;
          });
        });

        function cleanup() {
          ended = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          if (stage3D) stage3D.dispose();
        }

        function proximoRound(vencedor) {
          if (vencedor === 1) {
            winsP1++;
            if (!f1.tookDamage && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('perfect_x1');
          } else {
            winsP2++;
          }
          if (winsP1 >= 2 || winsP2 >= 2) {
            cleanup();
            finalizarLuta(winsP1 >= 2 ? 1 : 2);
            return;
          }
          round++;
          timer = 99;
          f1 = makeFighter(p1Pick, 170, 1);
          f2 = makeFighter(p2Pick, 550, -1);
          comentar(`ROUND ${round}... FIGHT!`);
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
            if (up && f.y >= 300) f.vy = -12.5;
          }
          f.vy += 0.65;
          f.y += f.vy;
          if (f.y >= 300) {
            f.y = 300;
            f.vy = 0;
          }
          f.x = Math.max(45, Math.min(675, f.x));
        }

        function loop() {
          if (ended) return;
          frame++;
          if (frame % 60 === 0 && timer > 0) timer--;
          if (creditsOverlay > 0) creditsOverlay--;

          updateFighter(f1, keys['ArrowLeft'], keys['ArrowRight'], keys['ArrowUp'], keys['KeyF']);
          f1.facing = f2.x >= f1.x ? 1 : -1;
          f2.facing = f1.x >= f2.x ? 1 : -1;

          if (twoPlayers) {
            updateFighter(f2, keys['KeyN'], keys['KeyM'], keys['KeyI'], keys['KeyU']);
          } else {
            // CPU simples e justa
            const dist = f2.x - f1.x;
            const moveL = dist > 78;
            const moveR = dist < -78;
            updateFighter(f2, moveL, moveR, Math.random() < 0.015, Math.random() < 0.12);
            if (Math.abs(dist) < 92 && frame % 34 === 0) {
              ataque(f2, f1, Math.random() < 0.25 ? 'd' : Math.random() < 0.5 ? 's' : 'a');
            }
          }

          // Projéteis
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
              projectiles.splice(i, 1);
            } else if (p.x < 0 || p.x > 720 || p.y > 390) {
              projectiles.splice(i, 1);
            }
          }

          if (f1.hp <= 0) proximoRound(2);
          else if (f2.hp <= 0) proximoRound(1);
          else if (timer <= 0) proximoRound(f1.hp >= f2.hp ? 1 : 2);

          // Atualiza HUD HTML & Cena 3D
          if (hp1El) hp1El.style.width = `${Math.max(0, f1.hp)}%`;
          if (hp2El) hp2El.style.width = `${Math.max(0, f2.hp)}%`;
          if (sp1El) sp1El.style.width = `${Math.min(100, f1.superMeter)}%`;
          if (sp2El) sp2El.style.width = `${Math.min(100, f2.superMeter)}%`;

          const lastPop = popups[popups.length - 1];
          if (floatEl) {
            floatEl.textContent = creditsOverlay > 0 ? 'PÓS-CRÉDITOS BLOQUEANDO A VISÃO...' : lastPop ? lastPop.txt : '';
            if (lastPop) floatEl.style.color = lastPop.col;
          }
          for (let i = popups.length - 1; i >= 0; i--) {
            popups[i].life--;
            if (popups[i].life <= 0) popups.splice(i, 1);
          }

          if (stage3D) {
            const { THREE, scene, camera, renderer } = stage3D;
            const to3X = (px) => (px - 360) * 0.025;
            const to3Y = (py) => Math.max(0, (300 - py) * 0.025);

            fight3D.p1.position.set(to3X(f1.x), to3Y(f1.y), 0);
            fight3D.p1.rotation.y = f1.facing > 0 ? 0.35 : -0.35;
            fight3D.p1.userData.shield.visible = f1.defending;

            fight3D.p2.position.set(to3X(f2.x), to3Y(f2.y), 0);
            fight3D.p2.rotation.y = f2.facing > 0 ? 0.35 : -0.35;
            fight3D.p2.userData.shield.visible = f2.defending;

            // Sincroniza projéteis 3D
            while (fight3D.projs.length < projectiles.length) {
              const pm = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.32, 0),
                new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.5 })
              );
              scene.add(pm);
              fight3D.projs.push(pm);
            }
            fight3D.projs.forEach((pm, i) => {
              const p = projectiles[i];
              pm.visible = !!p;
              if (p) {
                pm.position.set(to3X(p.x), to3Y(p.y) + 1.2, 0.3);
                pm.rotation.z += 0.18;
              }
            });

            const midX = (to3X(f1.x) + to3X(f2.x)) * 0.35;
            camera.position.x += (midX - camera.position.x) * 0.1;
            camera.lookAt(midX, 1.4, 0);
            renderer.render(scene, camera);
          } else if (fallbackCtx) {
            fallbackCtx.fillStyle = '#14060A';
            fallbackCtx.fillRect(0, 0, 720, 360);
          }

          roundEl.textContent = `ROUND ${round} (${winsP1}x${winsP2}) · ${timer}`;
          rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);

        function finalizarLuta(vencedorNum) {
          const winId = vencedorNum === 1 ? p1Pick : p2Pick;
          if (root.LuiggiAchievements) {
            root.LuiggiAchievements.desbloquear('red_flag_battle');
            if (winId === 'eloiza') root.LuiggiAchievements.desbloquear('time_eloiza');
            if (winId === 'yohana') root.LuiggiAchievements.desbloquear('time_yohana');
            if (winId === 'cara_aleatorio') root.LuiggiAchievements.desbloquear('lenda_do_concordo');
            if (winId === 'luis') root.LuiggiAchievements.desbloquear('pacifista');
          }
          if (save) save.salvarRecordeMinigame('x1_eloiza_yohana', winsP1 * 500 + 200);

          host.innerHTML = `
            <div class="mg-modal fight-theme" style="max-width:480px;text-align:center;">
              <div class="mg-header"><h3>🏆 ${LUTADORES[winId].nome} WINS!</h3></div>
              <div class="mg-body">
                <div class="fx-stamp" style="margin:8px auto;">MAS NA VIDA REAL...</div>
                <p>Ninguém venceu. O Luis perdeu a paz, o Fabricio perdeu o rolê, e o Cara Aleatório continua concordando até hoje.</p>
                <div class="mg-actions">
                  ${modoLivre ? `<button class="mg-btn" id="f-again">↻ Outro X1</button>` : ''}
                  <button class="mg-btn primary" id="f-done">Continuar</button>
                </div>
              </div>
            </div>
          `;
          const ag = document.getElementById('f-again');
          if (ag) ag.addEventListener('click', () => telaSelecao());
          document.getElementById('f-done').addEventListener('click', () => {
            host.classList.add('hidden');
            host.innerHTML = '';
            resolve({ winId });
          });
        }
      }

      telaSelecao();
    });
  }

  root.LuiggiFighter = { abrirLutaX1 };
})(window);
