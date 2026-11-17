/**
 * src/minigames/StealthEngine.js
 * Motor de Furtividade com Cone de Visão:
 *  - centro_3h (Cap. 6: Sobrevivência: Centro 3h)
 *  - baile (Cap. 8: Esconde-Esconde no Baile)
 *  - ponto_cego (Cap. 14: Operação Ponto Cego)
 */
(function (root) {
  'use strict';

  function abrirFurtividade(modo = 'centro_3h') {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      host.classList.remove('hidden');

      const titulos = {
        centro_3h: '🔦 Sobrevivência: Centro 3h da Manhã',
        baile: '💃 Esconde-Esconde no Sad Baile',
        ponto_cego: '🕶️ OPERAÇÃO PONTO CEGO (James)'
      };

      host.innerHTML = `
        <div class="mg-modal stealth-theme">
          <div class="mg-header">
            <div>
              <h3>${titulos[modo] || 'Furtividade'}</h3>
              <div class="mg-sub" id="st-sub">WASD / Setas ou toque para mover o Luis</div>
            </div>
            <span class="badge-pill" id="st-hud">...</span>
          </div>
          <div class="stealth-wrap">
            <div id="st-viewport" style="width:100%;height:390px;border-radius:12px;overflow:hidden;border:1px solid #334155;"></div>
            <div id="st-popup" class="stealth-popup hidden"></div>
            ${
              modo === 'ponto_cego'
                ? `<div class="btn-row" style="justify-content:center;margin-top:8px;">
                     <button class="mini-btn" data-dist="filme">🎬 Assunto de Filme</button>
                     <button class="mini-btn" data-dist="selfie">🤳 Selfie!</button>
                     <button class="mini-btn" data-dist="dj">🎧 Olha o DJ!</button>
                     <button class="mini-btn" data-dist="drink">🍹 Pedir Drink</button>
                   </div>`
                : ''
            }
            <div class="touch-pad">
              <button data-stdir="left">◀</button>
              <button data-stdir="up">▲</button>
              <button data-stdir="down">▼</button>
              <button data-stdir="right">▶</button>
            </div>
          </div>
        </div>
      `;

      const viewport = document.getElementById('st-viewport');
      const canvas = { width: 720, height: 410 };
      const hudEl = document.getElementById('st-hud');
      const popEl = document.getElementById('st-popup');

      const keys = {};
      const luis = { x: 65, y: 210, speed: 3.1 };
      let ended = false;
      let rafId = null;
      let frame = 0;

      const stage3D =
        root.Luiggi3D &&
        root.Luiggi3D.createStage(viewport, {
          bg: modo === 'centro_3h' ? 0x050812 : modo === 'baile' ? 0x0e0820 : 0x100824,
          fog: 0.022,
          fov: 48,
          camPos: [0, 12.5, 11.5],
          lookAt: [0, 0.2, 0]
        });
      const toX = (px) => (px - 360) * 0.032;
      const toZ = (py) => (py - 205) * 0.032;
      const st3D = { luis: null, sacola: null, rebeca: null, coneRebeca: null, tutu: null, coneTutu: null, casal: null, isabela: null, flash: null };
      if (stage3D) {
        const { THREE, scene } = stage3D;
        const floorMat =
          modo === 'centro_3h'
            ? new THREE.MeshStandardMaterial({ map: root.Luiggi3D.textures.asphalt(3, 2), roughness: 0.85 })
            : new THREE.MeshStandardMaterial({ map: root.Luiggi3D.textures.danceFloor(), roughness: 0.35, metalness: 0.4 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const mkChar = (col, h = 1.2) => {
          const g = new THREE.Group();
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, h, 14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
          b.position.y = h / 2;
          b.castShadow = true;
          const hd = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), new THREE.MeshStandardMaterial({ color: 0xfde2d4 }));
          hd.position.y = h + 0.24;
          g.add(b, hd);
          scene.add(g);
          return g;
        };

        st3D.luis = mkChar(0x3b82f6);
        st3D.flash = new THREE.PointLight(0xfef08a, modo === 'centro_3h' ? 2.4 : 0.8, 7);
        st3D.flash.position.y = 1.6;
        st3D.luis.add(st3D.flash);

        if (modo === 'centro_3h') {
          const sub = root.Luiggi3D.createSubaruMesh('#1245A8', true);
          sub.scale.setScalar(0.55);
          sub.position.set(toX(645), 0, toZ(205));
          sub.rotation.y = Math.PI / 2;
          scene.add(sub);

          [
            { x: 180, y: 95, w: 95, h: 45, tipo: 'marquise' },
            { x: 390, y: 270, w: 110, h: 45, tipo: 'marquise' },
            { x: 260, y: 160, w: 30, h: 30, tipo: 'poste' },
            { x: 520, y: 180, w: 30, h: 30, tipo: 'poste' }
          ].forEach((p) => {
            if (p.tipo === 'poste') {
              const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
              pole.position.set(toX(p.x + 15), 1.8, toZ(p.y + 15));
              const pl = new THREE.PointLight(0xfacc15, 2.2, 6);
              pl.position.set(toX(p.x + 15), 3.4, toZ(p.y + 15));
              scene.add(pole, pl);
            } else {
              const b = new THREE.Mesh(
                new THREE.BoxGeometry(p.w * 0.032, 1.4, p.h * 0.032),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
              );
              b.position.set(toX(p.x + p.w / 2), 0.7, toZ(p.y + p.h / 2));
              scene.add(b);
            }
          });
          st3D.sacola = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.32, 0),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x94a3b8, emissiveIntensity: 0.5 })
          );
          scene.add(st3D.sacola);
        } else if (modo === 'baile') {
          [
            { x: 190, y: 120, w: 54, h: 90, label: 'Pilar' },
            { x: 360, y: 230, w: 90, h: 44, label: 'Bar' },
            { x: 520, y: 110, w: 50, h: 55, label: 'Caixa Som' }
          ].forEach((p) => {
            const bm = new THREE.Mesh(
              new THREE.BoxGeometry(p.w * 0.032, 2.1, p.h * 0.032),
              new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.45 })
            );
            bm.position.set(toX(p.x + p.w / 2), 1.05, toZ(p.y + p.h / 2));
            bm.castShadow = true;
            scene.add(bm);
          });
          st3D.rebeca = mkChar(0xf43f5e);
          const coneGeo = new THREE.ConeGeometry(2.8, 7.6, 20, 1, true);
          coneGeo.translate(0, -3.8, 0);
          coneGeo.rotateX(Math.PI / 2);
          st3D.coneRebeca = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
          st3D.coneRebeca.position.y = 0.8;
          st3D.rebeca.add(st3D.coneRebeca);
        } else {
          st3D.tutu = mkChar(0xef4444);
          const coneGeo = new THREE.ConeGeometry(3.8, 14, 20, 1, true);
          coneGeo.translate(0, -7, 0);
          coneGeo.rotateX(Math.PI / 2);
          st3D.coneTutu = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
          st3D.coneTutu.position.y = 0.8;
          st3D.tutu.add(st3D.coneTutu);
          st3D.casal = mkChar(0xec4899, 1.4);
          st3D.isabela = mkChar(0xa855f7, 1.25);
        }
      }

      // Estado por modo
      let battery = 5.0;
      let fear = 0;
      let trancas = 0;
      let spottedCount = 0;
      let timeLeft = modo === 'baile' ? 22 : modo === 'ponto_cego' ? 32 : 999;

      // Centro 3h obstáculos e sustos
      const sacola = { x: 290, y: 200, vx: 1.5, vy: 0.9 };
      const pombo = { x: 460, y: 140 };
      const subaruPos = { x: 645, y: 205 };
      const pilaresCentro = [
        { x: 180, y: 95, w: 95, h: 45, tipo: 'marquise' },
        { x: 390, y: 270, w: 110, h: 45, tipo: 'marquise' },
        { x: 260, y: 160, w: 30, h: 30, tipo: 'poste' },
        { x: 520, y: 180, w: 30, h: 30, tipo: 'poste' }
      ];

      // Baile (Rebeca procurando)
      const pilaresBaile = [
        { x: 190, y: 120, w: 54, h: 90, label: 'Pilar' },
        { x: 360, y: 230, w: 90, h: 44, label: 'Bar' },
        { x: 520, y: 110, w: 50, h: 55, label: 'Caixa Som' },
        { x: 250, y: 295, w: 28, h: 28, label: 'Fabricio' }
      ];
      const rebeca = { x: 480, y: 240, ang: Math.PI, dir: 1 };

      // Operação Ponto Cego
      const tutuluiza = { x: 130, y: 205, ang: 0, distTimer: 0 };
      const casal = { x: 560, y: 205, vx: 0, vy: 1.2 };
      const isabelaDom = { x: 350, y: 120, vx: 1.4, vy: 1.7 };
      let suspicion = 0;
      let fails = 0;
      let distCD = 0;

      function showPop(txt, dur = 1200) {
        popEl.textContent = txt;
        popEl.classList.remove('hidden');
        clearTimeout(popEl._t);
        popEl._t = setTimeout(() => popEl.classList.add('hidden'), dur);
      }

      if (modo === 'ponto_cego') {
        host.querySelectorAll('[data-dist]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (distCD > 0) return;
            distCD = 220;
            tutuluiza.distTimer = 170;
            const tipo = btn.dataset.dist;
            if (tipo === 'filme') showPop('🎬 "E aquele filme da A24?!" (Tutuluiza olha pro Luis!)');
            else if (tipo === 'selfie') showPop('🤳 "Selfie rápida!" (Ela olha pro celular!)');
            else if (tipo === 'dj') showPop('🎧 "Olha o DJ!" (Ela vira pro palco!)');
            else {
              tutuluiza.y = Math.max(90, tutuluiza.y - 40);
              showPop('🍹 "Bora ali no bar!" (Arriscado!)');
            }
          });
        });
      }

      function onKeyDown(e) {
        keys[e.code] = true;
      }
      function onKeyUp(e) {
        keys[e.code] = false;
      }
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      host.querySelectorAll('[data-stdir]').forEach((b) => {
        const d = b.dataset.stdir;
        const map = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
        b.addEventListener('pointerdown', () => (keys[map[d]] = true));
        b.addEventListener('pointerup', () => (keys[map[d]] = false));
        b.addEventListener('pointerleave', () => (keys[map[d]] = false));
      });

      function pointInCone(px, py, ox, oy, ang, spread, range) {
        const dx = px - ox;
        const dy = py - oy;
        const dist = Math.hypot(dx, dy);
        if (dist > range) return false;
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
        const projX = ax + t * dx;
        const projY = ay + t * dy;
        return Math.hypot(px - projX, py - projY) <= rad;
      }

      function cleanup() {
        ended = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        if (stage3D) stage3D.dispose();
      }

      function loop() {
        if (ended) return;
        frame++;

        let dx = 0;
        let dy = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (dx && dy) {
          dx *= 0.707;
          dy *= 0.707;
        }
        luis.x = Math.max(25, Math.min(canvas.width - 25, luis.x + dx * luis.speed));
        luis.y = Math.max(25, Math.min(canvas.height - 25, luis.y + dy * luis.speed));

        // ==================== MODO 1: CENTRO 3H ====================
        if (modo === 'centro_3h') {
          sacola.x += sacola.vx;
          sacola.y += sacola.vy;
          if (sacola.x < 120 || sacola.x > 600) sacola.vx *= -1;
          if (sacola.y < 50 || sacola.y > 360) sacola.vy *= -1;

          if (Math.hypot(luis.x - sacola.x, luis.y - sacola.y) < 34) {
            fear = Math.min(100, fear + 2.2);
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('medo_de_sacola');
            if (frame % 30 === 0) showPop('😱 SUSTO! Era só uma sacola plástica!', 900);
          }

          const nearLight = Math.hypot(luis.x - 275, luis.y - 175) < 95 || Math.hypot(luis.x - 535, luis.y - 195) < 95;
          if (!nearLight) fear = Math.min(100, fear + 0.14);
          else fear = Math.max(0, fear - 0.35);

          battery = Math.max(1.0, battery - 0.006);

          if (fear >= 100) {
            fear = 0;
            luis.x = 65;
            luis.y = 210;
            showPop('💀 VOCÊ MORREU... brincadeira, o Luis só correu estilo Naruto de susto! Tenta de novo.', 2200);
          }

          if (Math.hypot(luis.x - subaruPos.x, luis.y - subaruPos.y) < 42) {
            cleanup();
            if (battery <= 1.5 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('um_porcento_bateria');
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('sobrevivente_centro');
              root.LuiggiAchievements.desbloquear('tranca_tranca_tranca');
            }
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('tranca');
            encerrar('Luis entrou no Subaru e trancou as portas 5 vezes: CLACK CLACK CLACK CLACK CLACK!', true);
            return;
          }

          if (st3D.sacola) {
            st3D.sacola.position.set(toX(sacola.x), 0.7 + Math.sin(frame * 0.12) * 0.25, toZ(sacola.y));
            st3D.sacola.rotation.y += 0.08;
          }
          hudEl.textContent = `🪫 Lanterna: ${Math.ceil(battery)}% · 😱 Medo: ${Math.round(fear)}%`;
        }

        // ==================== MODO 2: ESCONDE-ESCONDE NO BAILE ====================
        else if (modo === 'baile') {
          rebeca.ang += 0.024 * rebeca.dir;
          if (frame % 180 === 0) rebeca.dir *= -1;

          const escondido = pilaresBaile.some(
            (p) =>
              p.label !== 'Fabricio' &&
              luis.x > p.x - 12 &&
              luis.x < p.x + p.w + 12 &&
              luis.y > p.y - 12 &&
              luis.y < p.y + p.h + 12
          );

          if (!escondido && pointInCone(luis.x, luis.y, rebeca.x, rebeca.y, rebeca.ang, 0.35, 250)) {
            if (frame % 45 === 0) {
              spottedCount++;
              showPop('💖 Rebeca: "Te achei! Vem dançar!" (mas o jogo continua kkk)', 1100);
            }
          }

          if (st3D.rebeca) {
            st3D.rebeca.position.set(toX(rebeca.x), 0, toZ(rebeca.y));
            st3D.rebeca.rotation.y = -rebeca.ang + Math.PI / 2;
          }

          if (frame % 60 === 0) timeLeft--;
          hudEl.textContent = `⏱️ ${timeLeft}s · Flagras: ${spottedCount}`;
          if (timeLeft <= 0) {
            cleanup();
            if (spottedCount === 0 && root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('fantasma_do_baile');
            }
            encerrar(
              spottedCount === 0 ? 'Fantasma do Baile! Nem a Rebeca nem o segurança te acharam!' : 'No fim ela te achou do mesmo jeito!',
              true
            );
            return;
          }
        }

        // ==================== MODO 3: OPERAÇÃO PONTO CEGO ====================
        else if (modo === 'ponto_cego') {
          if (distCD > 0) distCD--;
          if (tutuluiza.distTimer > 0) {
            tutuluiza.distTimer--;
            tutuluiza.ang = Math.atan2(luis.y - tutuluiza.y, luis.x - tutuluiza.x);
          } else {
            tutuluiza.ang = Math.sin(frame * 0.025) * 0.55;
          }

          casal.y += casal.vy;
          if (casal.y < 85 || casal.y > 330) casal.vy *= -1;
          if (frame % 260 === 0 && save) {
            save.incrementarContador('fabricioOlhouPraTras', 1);
            showPop('👀 Fabricio olhou pra trás: "tá dando certo?!"', 1000);
          }

          isabelaDom.x += isabelaDom.vx;
          isabelaDom.y += isabelaDom.vy;
          if (isabelaDom.x < 190 || isabelaDom.x > 520) isabelaDom.vx *= -1;
          if (isabelaDom.y < 60 || isabelaDom.y > 350) isabelaDom.vy *= -1;
          if (Math.hypot(luis.x - isabelaDom.x, luis.y - isabelaDom.y) < 30) {
            luis.y += isabelaDom.vy * 14;
            if (frame % 25 === 0 && save) {
              const tot = save.incrementarContador('empurroesDominik', 1);
              if (tot >= 5 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('culpa_do_dominik');
              showPop('💃 Isabela Dominik empurrou sem querer dançando!', 900);
            }
          }

          const vendoCasal =
            tutuluiza.distTimer <= 0 &&
            pointInCone(casal.x, casal.y, tutuluiza.x, tutuluiza.y, tutuluiza.ang, 0.25, 520);
          const luisBloqueando =
            lineBlocked(tutuluiza.x, tutuluiza.y, casal.x, casal.y, luis.x, luis.y, 30) ||
            lineBlocked(tutuluiza.x, tutuluiza.y, casal.x, casal.y, isabelaDom.x, isabelaDom.y, 24);

          if (vendoCasal && !luisBloqueando) {
            suspicion = Math.min(100, suspicion + 1.1);
            if (suspicion >= 100) {
              suspicion = 0;
              fails++;
              showPop('🚨 MISSÃO FRACASSADA! Tutuluiza quase viu! Reiniciando barra...', 1400);
            }
          } else {
            suspicion = Math.max(0, suspicion - 0.35);
          }

          if (st3D.tutu) {
            st3D.tutu.position.set(toX(tutuluiza.x), 0, toZ(tutuluiza.y));
            st3D.tutu.rotation.y = -tutuluiza.ang + Math.PI / 2;
            st3D.coneTutu.material.color.setHex(tutuluiza.distTimer > 0 ? 0x38bdf8 : 0xfacc15);
            st3D.casal.position.set(toX(casal.x), 0, toZ(casal.y));
            st3D.isabela.position.set(toX(isabelaDom.x), 0, toZ(isabelaDom.y));
          }

          if (frame % 60 === 0) timeLeft--;
          hudEl.textContent = `🎵 Música: ${timeLeft}s · Desconfiança: ${Math.round(suspicion)}% ${luisBloqueando ? '🛡️ BLOQUEADO!' : ''}`;

          if (timeLeft <= 0) {
            cleanup();
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('agente_secreto');
              if (fails === 0) root.LuiggiAchievements.desbloquear('zero_desconfianca');
              if (save?.state?.contadores?.fabricioOlhouPraTras >= 10) {
                root.LuiggiAchievements.desbloquear('seguranca_particular');
              }
            }
            encerrar('🕶️ MISSÃO CUMPRIDA! O casal saiu de fininho sem a Tutuluiza ver!', true);
            return;
          }
        }

        if (stage3D && st3D.luis) {
          st3D.luis.position.set(toX(luis.x), 0, toZ(luis.y));
          stage3D.renderer.render(stage3D.scene, stage3D.camera);
        }

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);

      function encerrar(msg, ok) {
        if (save) save.salvarRecordeMinigame(`stealth_${modo}`, ok ? 1000 : 200);
        host.innerHTML = `
          <div class="mg-modal stealth-theme" style="max-width:460px;text-align:center;">
            <div class="mg-header"><h3>${titulos[modo]}</h3></div>
            <div class="mg-body">
              <p>${msg}</p>
              <div class="mg-actions"><button class="mg-btn primary" id="st-ok">Continuar</button></div>
            </div>
          </div>
        `;
        document.getElementById('st-ok').addEventListener('click', () => {
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ ok });
        });
      }
    });
  }

  root.LuiggiStealth = { abrirFurtividade };
})(window);
