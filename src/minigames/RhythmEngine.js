/**
 * src/minigames/RhythmEngine.js
 * Motor de Ritmo reutilizável:
 *  - LuiggiBeats Hero (4 trilhas em perspectiva, notas longas, Hiperfoco, plateia animada, Modo Gravação)
 *  - Passinho Sad (setas DDR com Rebeca se aproximando a cada combo)
 *  - Soundboard do Discord (cap. 15)
 */
(function (root) {
  'use strict';

  function calcularRanking(precisao) {
    if (precisao >= 95) return 'Lenda do Shittrap';
    if (precisao >= 85) return 'LuiggiBeats';
    if (precisao >= 72) return 'Shittrapper';
    if (precisao >= 58) return 'Fundão';
    if (precisao >= 40) return 'Vitor no Date';
    return 'Tiago Music';
  }

  function abrirLuiggiBeatsHero(opcoes = {}) {
    return new Promise(async (resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      const musicasBase = root.LuiggiData?.cache?.musicas?.faixas || [];
      const autorais = (save?.state?.beatsAutorais || []).map((b) => ({
        id: b.id,
        titulo: `${b.nome} (Beat Autoral)`,
        artista: 'Você (FL Estúdio)',
        bpm: b.bpm || 140,
        desbloqueiaNoCapitulo: 2,
        customBeat: b
      }));
      const todas = [...musicasBase, ...autorais];
      let faixa = opcoes.faixa || todas[opcoes.musicaIndex ?? 1] || todas[0];
      let dificuldade = opcoes.dificuldade || 'medio';
      let modoGravacao = false;
      let gravadas = [];

      function mostrarSeletor() {
        host.classList.remove('hidden');
        const capMax = save?.state?.capituloMaxDesbloqueado ?? 0;
        const liberadas = save?.state?.jogoZerado
          ? todas
          : todas.filter((m) => (m.desbloqueiaNoCapitulo ?? 0) <= capMax || m.ehMusicaDoTiago);

        host.innerHTML = `
          <div class="mg-modal hero-theme">
            <div class="mg-header">
              <h3>🎸 LuiggiBeats Hero</h3>
              <button class="mini-btn" id="hero-exit">Sair</button>
            </div>
            <div class="mg-body">
              <div class="hero-setup">
                <div>
                  <label>Música:</label>
                  <select id="hero-song" class="mg-select">
                    ${liberadas
            .map(
              (m) =>
                `<option value="${m.id}" ${m.id === faixa.id ? 'selected' : ''}>${m.titulo} — ${m.artista} (${m.bpm || 140} BPM)</option>`
            )
            .join('')}
                  </select>
                </div>
                <div>
                  <label>Dificuldade:</label>
                  <div class="btn-row">
                    <button class="mini-btn ${dificuldade === 'facil' ? 'active' : ''}" data-diff="facil">Fácil</button>
                    <button class="mini-btn ${dificuldade === 'medio' ? 'active' : ''}" data-diff="medio">Médio</button>
                    <button class="mini-btn ${dificuldade === 'dificil' ? 'active' : ''}" data-diff="dificil">Difícil</button>
                  </div>
                </div>
                <div style="font-size:0.78rem;color:#cbd5e1;">
                  Teclas: <strong>D · F · J · K</strong> (ou 1 2 3 4) · <strong>ESPAÇO</strong>: Hiperfoco (2x pontos) · Toque nas trilhas no celular.
                </div>
                <div class="mg-actions">
                  <button class="mg-btn primary" id="hero-play">▶ Tocar no Palco</button>
                  <button class="mini-btn" id="hero-rec" title="Modo secreto para criar chart manual">● Modo Gravação</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.getElementById('hero-exit').addEventListener('click', () => {
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ cancelado: true });
        });
        host.querySelectorAll('[data-diff]').forEach((b) => {
          b.addEventListener('click', () => {
            dificuldade = b.dataset.diff;
            mostrarSeletor();
          });
        });
        document.getElementById('hero-song').addEventListener('change', (e) => {
          faixa = liberadas.find((m) => m.id === e.target.value) || faixa;
        });
        document.getElementById('hero-play').addEventListener('click', () => {
          modoGravacao = false;
          iniciarPalco();
        });
        document.getElementById('hero-rec').addEventListener('click', () => {
          modoGravacao = true;
          gravadas = [];
          iniciarPalco();
        });
      }

      async function iniciarPalco() {
        host.classList.remove('hidden');
        host.innerHTML = `
          <div class="mg-modal hero-theme">
            <div class="mg-header">
              <div>
                <h3>🎸 ${faixa.titulo}</h3>
                <div class="mg-sub" id="hero-hud">Pontos: 0 · Combo: 0 (x1) · Público: 70%</div>
              </div>
              <div class="btn-row">
                <span class="badge-pill" id="hero-hyper-badge">⚡ Hiperfoco: 0%</span>
                <button class="mini-btn" id="hero-quit">Parar</button>
              </div>
            </div>
            <div class="hero-stage-wrap" id="hero-stage-wrap">
              <div class="hero-crowd" id="hero-crowd">
                <span>🎤 Luis & 🎧 Fabricio no palco</span>
                <span>👎 Vitor vaiando (cantando junto) · 😒 Tiago · 🧐 Mateus</span>
              </div>
              <div id="hero-viewport" style="width:100%;max-width:600px;height:380px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #334155;"></div>
              <div class="hero-feedback" id="hero-feedback"></div>
              <div class="hero-touch-lanes">
                <button data-lane="0">D / 1</button>
                <button data-lane="1">F / 2</button>
                <button data-lane="2">J / 3</button>
                <button data-lane="3">K / 4</button>
                <button id="hero-hyper-btn" class="hyper-btn">⚡</button>
              </div>
            </div>
          </div>
        `;

        const viewport = document.getElementById('hero-viewport');
        const hudEl = document.getElementById('hero-hud');
        const fbEl = document.getElementById('hero-feedback');
        const hyperEl = document.getElementById('hero-hyper-badge');
        const wrapEl = document.getElementById('hero-stage-wrap');

        const prep = await root.LuiggiAudio.prepararFaixaHero(faixa, dificuldade);
        const notes = prep.chart.notas.map((n, idx) => ({ ...n, idx, hit: false, missed: false }));
        const totalMs = prep.chart.duracaoTotalMs || 35000;
        const latencyOffset = save?.state?.config?.latenciaHeroMs || 0;

        let startCtxTime = root.LuiggiAudio.getCurrentTime();
        let stopMusicFn = null;
        if (prep.buffer) {
          startCtxTime = root.LuiggiAudio.tocarBuffer(prep.buffer);
        } else if (faixa.customBeat) {
          stopMusicFn = root.LuiggiAudio.tocarBeatFL(faixa.customBeat, faixa.customBeat.bpm || 140, true);
        } else {
          stopMusicFn = root.LuiggiAudio.tocarEstiloSintetizado(
            faixa.ehMusicaDoTiago ? 'tiago' : 'trap',
            faixa.bpm || 140
          );
        }

        let score = 0;
        let combo = 0;
        let maxCombo = 0;
        let hits = 0;
        let misses = 0;
        let crowd = 70;
        let hyper = 0;
        let hyperActiveUntil = 0;
        let hyperCount = 0;
        let ended = false;
        let rafId = null;

        const laneColors = ['#22C55E', '#EF4444', '#EAB308', '#3B82F6'];
        const laneHex = [0x22c55e, 0xef4444, 0xeab308, 0x3b82f6];
        const laneX = [-2.25, -0.75, 0.75, 2.25];
        const pressedLanes = [false, false, false, false];

        // Palco 3D Three.js
        const stage3D =
          root.Luiggi3D &&
          root.Luiggi3D.createStage(viewport, {
            bg: 0x090b16,
            fog: 0.025,
            fov: 50,
            camPos: [0, 6.4, 8.8],
            lookAt: [0, 0.2, -3.5]
          });
        let fallbackCanvas = null;
        let fallbackCtx = null;

        const hero3D = { receptors: [], notePool: [], sustainPool: [], spots: [], frets: [] };
        if (stage3D) {
          const { THREE, scene } = stage3D;
          // Pista / braço da guitarra 3D
          const deck = new THREE.Mesh(
            new THREE.BoxGeometry(6.8, 0.24, 34),
            new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.55 })
          );
          deck.position.set(0, -0.18, -9);
          deck.receiveShadow = true;
          scene.add(deck);

          // Trilhos neon separando faixas
          [-3.1, -1.5, 0, 1.5, 3.1].forEach((rx) => {
            const rail = new THREE.Mesh(
              new THREE.BoxGeometry(0.06, 0.08, 34),
              new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0x38bdf8, emissiveIntensity: 0.25 })
            );
            rail.position.set(rx, -0.02, -9);
            scene.add(rail);
          });

          // Trastes animados
          const fretMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
          for (let f = 0; f < 10; f++) {
            const fm = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.02, 0.08), fretMat);
            fm.position.set(0, -0.04, 4 - f * 3);
            scene.add(fm);
            hero3D.frets.push(fm);
          }

          // Receptores 3D na linha de hit (z = 4.2)
          for (let l = 0; l < 4; l++) {
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.55, 0.13, 14, 28),
              new THREE.MeshStandardMaterial({
                color: laneHex[l],
                emissive: laneHex[l],
                emissiveIntensity: 0.45,
                metalness: 0.6,
                roughness: 0.2
              })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(laneX[l], 0.06, 4.2);
            scene.add(ring);
            hero3D.receptors.push(ring);
          }

          // Holofotes do palco
          [0xa855f7, 0x38bdf8].forEach((col, idx) => {
            const sp = new THREE.PointLight(col, 3.2, 30);
            sp.position.set(idx === 0 ? -6 : 6, 7, -6);
            scene.add(sp);
            hero3D.spots.push(sp);
          });

          // Pool de notas 3D para zero-GC em tempo real
          const gemGeo = new THREE.CylinderGeometry(0.46, 0.56, 0.28, 20);
          for (let i = 0; i < 42; i++) {
            const mat = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0xffffff,
              emissiveIntensity: 0.7,
              metalness: 0.4,
              roughness: 0.18
            });
            const m = new THREE.Mesh(gemGeo, mat);
            m.visible = false;
            scene.add(m);
            hero3D.notePool.push(m);

            const sm = new THREE.Mesh(
              new THREE.BoxGeometry(0.24, 0.12, 1),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
            );
            sm.visible = false;
            scene.add(sm);
            hero3D.sustainPool.push(sm);
          }
        } else {
          fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 520;
          fallbackCanvas.height = 380;
          fallbackCanvas.style.width = '100%';
          fallbackCanvas.style.height = '100%';
          viewport.appendChild(fallbackCanvas);
          fallbackCtx = fallbackCanvas.getContext('2d');
        }

        function showFeedback(text, color) {
          fbEl.textContent = text;
          fbEl.style.color = color;
          fbEl.classList.remove('pop');
          void fbEl.offsetWidth;
          fbEl.classList.add('pop');
        }

        function triggerHyper() {
          if (hyper >= 100 && root.LuiggiAudio.getCurrentTime() > hyperActiveUntil) {
            hyper = 0;
            hyperActiveUntil = root.LuiggiAudio.getCurrentTime() + 6;
            hyperCount++;
            wrapEl.classList.add('hyper-gold');
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('felps');
            if (hyperCount >= 5 && root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('hiperfoco_total');
            }
          }
        }

        function hitLane(lane) {
          if (ended) return;
          const nowMs = (root.LuiggiAudio.getCurrentTime() - startCtxTime) * 1000 - latencyOffset;
          if (modoGravacao) {
            gravadas.push({ tempoMs: Math.round(Math.max(0, nowMs)), trilha: lane, duracaoMs: 0 });
            showFeedback('GRAVADA!', '#38BDF8');
            return;
          }

          let best = null;
          let bestDiff = 9999;
          for (const n of notes) {
            if (n.hit || n.missed || n.trilha !== lane) continue;
            const d = Math.abs(n.tempoMs - nowMs);
            if (d < bestDiff) {
              bestDiff = d;
              best = n;
            }
          }

          if (best && bestDiff <= 135) {
            best.hit = true;
            hits++;
            combo++;
            maxCombo = Math.max(maxCombo, combo);
            const mult = Math.min(4, 1 + Math.floor(combo / 8)) * (root.LuiggiAudio.getCurrentTime() < hyperActiveUntil ? 2 : 1);
            if (bestDiff <= 60) {
              score += 100 * mult;
              showFeedback('PERFEITO!', '#34D399');
            } else {
              score += 60 * mult;
              showFeedback('BOM!', '#FBBF24');
            }
            crowd = Math.min(100, crowd + 3);
            hyper = Math.min(100, hyper + 8);
          } else {
            combo = 0;
            misses++;
            crowd -= 5;
            showFeedback('ERROU!', '#F87171');
          }
        }

        function onKeyDown(e) {
          const k = e.key.toLowerCase();
          const map = { d: 0, '1': 0, f: 1, '2': 1, j: 2, '3': 2, k: 3, '4': 3 };
          if (k in map) {
            pressedLanes[map[k]] = true;
            hitLane(map[k]);
          } else if (e.code === 'Space') {
            e.preventDefault();
            triggerHyper();
          }
        }
        function onKeyUp(e) {
          const k = e.key.toLowerCase();
          const map = { d: 0, '1': 0, f: 1, '2': 1, j: 2, '3': 2, k: 3, '4': 3 };
          if (k in map) pressedLanes[map[k]] = false;
        }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        host.querySelectorAll('[data-lane]').forEach((btn) => {
          const l = Number(btn.dataset.lane);
          btn.addEventListener('pointerdown', () => {
            pressedLanes[l] = true;
            hitLane(l);
          });
          btn.addEventListener('pointerup', () => (pressedLanes[l] = false));
        });
        document.getElementById('hero-hyper-btn').addEventListener('click', triggerHyper);

        function cleanup() {
          ended = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          if (stopMusicFn) stopMusicFn();
          if (stage3D) stage3D.dispose();
          root.LuiggiAudio.pararMusica();
        }

        document.getElementById('hero-quit').addEventListener('click', () => {
          cleanup();
          finalizar(false, true);
        });

        function loop() {
          if (ended) return;
          const nowCtx = root.LuiggiAudio.getCurrentTime();
          const nowMs = (nowCtx - startCtxTime) * 1000 - latencyOffset;
          if (nowCtx >= hyperActiveUntil) wrapEl.classList.remove('hyper-gold');

          // Notas perdidas
          if (!modoGravacao) {
            for (const n of notes) {
              if (!n.hit && !n.missed && nowMs - n.tempoMs > 150) {
                n.missed = true;
                misses++;
                combo = 0;
                crowd -= 7;
              }
            }
            if (crowd <= 0) {
              cleanup();
              finalizar(true, false);
              return;
            }
          }

          if (nowMs >= totalMs) {
            cleanup();
            finalizar(false, false);
            return;
          }

          // Renderização 3D da pista e notas em perspectiva
          const lookAhead = 1650;
          if (stage3D) {
            const { scene, camera, renderer } = stage3D;
            scene.background.setHex(nowCtx < hyperActiveUntil ? 0x2d1d06 : 0x090b16);

            // Trastes deslizando
            for (const fm of hero3D.frets) {
              fm.position.z += 0.34;
              if (fm.position.z > 6) fm.position.z -= 30;
            }

            // Receptores pulsando
            for (let l = 0; l < 4; l++) {
              const r = hero3D.receptors[l];
              const p = pressedLanes[l];
              r.material.emissiveIntensity = p ? 2.2 : 0.45;
              r.scale.setScalar(p ? 1.18 : 1.0);
            }

            // Notas ativas mapeadas no pool 3D
            for (const m of hero3D.notePool) m.visible = false;
            for (const sm of hero3D.sustainPool) sm.visible = false;

            let pIdx = 0;
            for (const n of notes) {
              if (n.hit || n.missed || pIdx >= hero3D.notePool.length) continue;
              const dt = n.tempoMs - nowMs;
              if (dt > lookAhead || dt < -150) continue;
              const prog = 1 - dt / lookAhead; // 0 distante -> 1 linha de hit
              const z = -22 + prog * 26.2; // hit = +4.2
              const x = laneX[n.trilha];
              const gem = hero3D.notePool[pIdx];
              gem.visible = true;
              gem.position.set(x, 0.2, z);
              gem.material.color.setHex(laneHex[n.trilha]);
              gem.material.emissive.setHex(laneHex[n.trilha]);

              if (n.duracaoMs > 0) {
                const tailProg = Math.max(0, 1 - (dt + n.duracaoMs) / lookAhead);
                const tz = -22 + tailProg * 26.2;
                const len = Math.max(0.2, z - tz);
                const sm = hero3D.sustainPool[pIdx];
                sm.visible = true;
                sm.position.set(x, 0.14, (z + tz) / 2);
                sm.scale.z = len;
                sm.material.color.setHex(laneHex[n.trilha]);
                sm.material.emissive.setHex(laneHex[n.trilha]);
              }
              pIdx++;
            }

            hero3D.spots[0].intensity = 2.6 + Math.sin(nowMs * 0.008) * 1.4;
            hero3D.spots[1].intensity = 2.6 + Math.cos(nowMs * 0.008) * 1.4;
            renderer.render(scene, camera);
          } else if (fallbackCtx) {
            fallbackCtx.clearRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
            fallbackCtx.fillStyle = nowCtx < hyperActiveUntil ? '#3B2809' : '#11131E';
            fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
          }

          const mult = Math.min(4, 1 + Math.floor(combo / 8)) * (nowCtx < hyperActiveUntil ? 2 : 1);
          hudEl.textContent = `Pontos: ${score} · Combo: ${combo} (x${mult}) · Público: ${Math.max(0, crowd)}%`;
          hyperEl.textContent = nowCtx < hyperActiveUntil ? '⚡ HIPERFOCO ATIVO (2x)!' : `⚡ Hiperfoco: ${hyper}%`;
          rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);

        function finalizar(falhou, abortou) {
          if (modoGravacao) {
            const json = JSON.stringify({ musicaId: faixa.id, bpm: faixa.bpm || 140, notas: gravadas }, null, 2);
            host.innerHTML = `
              <div class="mg-modal hero-theme">
                <div class="mg-header"><h3>● Chart Gravada (${gravadas.length} notas)</h3></div>
                <div class="mg-body">
                  <textarea style="width:100%;height:200px;background:#0b0c12;color:#e5e7eb;font-family:monospace;">${json}</textarea>
                  <div class="mg-actions"><button class="mg-btn primary" id="rec-close">Fechar</button></div>
                </div>
              </div>`;
            document.getElementById('rec-close').addEventListener('click', () => {
              host.classList.add('hidden');
              host.innerHTML = '';
              resolve({ score: 0 });
            });
            return;
          }

          const total = Math.max(1, hits + misses);
          const precisao = Math.round((hits / total) * 100);
          const estrelas = falhou ? 0 : precisao >= 92 ? 5 : precisao >= 80 ? 4 : precisao >= 65 ? 3 : precisao >= 45 ? 2 : 1;
          const ranking = calcularRanking(precisao);

          if (falhou) {
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('por_que_voce_fez_isso');
          } else if (!abortou) {
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('primeira_nota');
              if (misses === 0 && hits > 0) root.LuiggiAchievements.desbloquear('full_combo');
              if (ranking === 'Lenda do Shittrap') root.LuiggiAchievements.desbloquear('lenda_do_shittrap');
              if (faixa.customBeat) root.LuiggiAchievements.desbloquear('autoral');
              if (faixa.ehMusicaDoTiago) root.LuiggiAchievements.desbloquear('masoquista');
            }
            if (save) {
              save.state.heroRecordes[faixa.id] = Math.max(save.state.heroRecordes[faixa.id] || 0, score);
              save.salvarRecordeMinigame('luiggibeats_hero', score);
            }
          }

          host.innerHTML = `
            <div class="mg-modal hero-theme">
              <div class="mg-header"><h3>${falhou ? '💀 A MÚSICA PAROU!' : '🏆 Fim da Apresentação'}</h3></div>
              <div class="mg-body" style="text-align:center;">
                ${falhou
              ? `<div style="font-size:1.3rem;color:#f87171;margin:10px 0;">Tiago Music apareceu na plateia: <strong>"Por que você fez isso?"</strong></div>`
              : `<div style="font-size:2rem;color:#fbbf24;">${'★'.repeat(estrelas)}${'☆'.repeat(5 - estrelas)}</div>`
            }
                <p><strong>Ranking:</strong> ${ranking}</p>
                <p>Pontuação: <strong>${score}</strong> · Precisão: <strong>${precisao}%</strong> · Maior Combo: <strong>${maxCombo}</strong></p>
                <div class="mg-actions">
                  <button class="mg-btn" id="hero-retry">↻ Tocar Outra</button>
                  <button class="mg-btn primary" id="hero-done">Continuar</button>
                </div>
              </div>
            </div>
          `;
          document.getElementById('hero-retry').addEventListener('click', () => mostrarSeletor());
          document.getElementById('hero-done').addEventListener('click', () => {
            host.classList.add('hidden');
            host.innerHTML = '';
            resolve({ score, precisao, estrelas, ranking });
          });
        }
      }

      if (opcoes.direto) iniciarPalco();
      else mostrarSeletor();
    });
  }

  // ==================== PASSINHO SAD (DDR 3D CAP. 8) ====================
  function abrirPassinhoSad() {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      host.classList.remove('hidden');
      const setas = ['←', '↓', '↑', '→'];
      const keyMap = { ArrowLeft: 0, a: 0, ArrowDown: 1, s: 1, ArrowUp: 2, w: 2, ArrowRight: 3, d: 3 };
      let idxAtual = 0;
      let combo = 0;
      let pontos = 0;
      let passosRestantes = 16;
      let ended = false;
      let stage3D = null;
      let luis3D = null;
      let rebeca3D = null;
      let discoLight = null;
      let rafId = null;

      host.innerHTML = `
        <div class="mg-modal sad-theme">
          <div class="mg-header">
            <h3>🕺 Passinho Sad 3D (Sad Baile)</h3>
            <span id="ddr-hud">Restam ${passosRestantes} passos · Combo: ${combo}</span>
          </div>
          <div class="mg-body" style="text-align:center;">
            <div id="sad-3d-vp" style="width:100%;height:210px;border-radius:12px;overflow:hidden;border:1px solid #4c1d95;margin-bottom:10px;"></div>
            <div style="font-size:3.2rem;margin:10px 0;color:#c084fc;font-weight:900;text-shadow:0 0 18px #a855f7;" id="ddr-target">${setas[idxAtual]}</div>
            <div class="btn-row" style="justify-content:center;">
              ${setas.map((s, i) => `<button class="mg-btn" data-ddr="${i}" style="font-size:1.3rem;min-width:60px;">${s}</button>`).join('')}
            </div>
          </div>
        </div>
      `;

      const vp = document.getElementById('sad-3d-vp');
      stage3D =
        root.Luiggi3D &&
        root.Luiggi3D.createStage(vp, { bg: 0x0a0618, fov: 46, camPos: [0, 3.6, 8.2], lookAt: [0, 1.1, 0] });
      if (stage3D) {
        const { THREE, scene } = stage3D;
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(18, 12),
          new THREE.MeshStandardMaterial({ map: root.Luiggi3D.textures.danceFloor(), roughness: 0.25, metalness: 0.45 })
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        const makeDancer = (bodyCol, headCol) => {
          const g = new THREE.Group();
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.35, 16), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.4 }));
          b.position.y = 0.72;
          const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), new THREE.MeshStandardMaterial({ color: headCol, roughness: 0.5 }));
          h.position.y = 1.68;
          g.add(b, h);
          return g;
        };
        luis3D = makeDancer(0x1d4ed8, 0xf1c27d);
        luis3D.position.set(-2.2, 0, 0);
        rebeca3D = makeDancer(0xec4899, 0x9a3412);
        rebeca3D.position.set(4.5, 0, 0);
        scene.add(luis3D, rebeca3D);

        discoLight = new THREE.PointLight(0xd946ef, 3.4, 18);
        discoLight.position.set(0, 4.5, 2);
        scene.add(discoLight);

        const anim = (t) => {
          if (ended) return;
          rafId = requestAnimationFrame(anim);
          const s = t * 0.005;
          luis3D.position.y = Math.abs(Math.sin(s)) * 0.16;
          rebeca3D.position.y = Math.abs(Math.cos(s)) * 0.18;
          const targetX = Math.max(-0.9, 4.5 - combo * 0.55);
          rebeca3D.position.x += (targetX - rebeca3D.position.x) * 0.12;
          discoLight.position.x = Math.sin(s * 0.7) * 4;
          discoLight.color.setHSL(((t * 0.0002) % 1), 0.85, 0.6);
          stage3D.renderer.render(stage3D.scene, stage3D.camera);
        };
        rafId = requestAnimationFrame(anim);
      }

      function proximoPasso() {
        idxAtual = Math.floor(Math.random() * 4);
        const tgt = document.getElementById('ddr-target');
        const hud = document.getElementById('ddr-hud');
        if (tgt) tgt.textContent = setas[idxAtual];
        if (hud) hud.textContent = `Restam ${passosRestantes} passos · Combo: ${combo}`;
      }

      function tentar(dir) {
        if (ended) return;
        if (dir === idxAtual) {
          combo++;
          pontos += 50 + combo * 10;
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
        } else {
          combo = 0;
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
        }
        passosRestantes--;
        if (passosRestantes <= 0) {
          ended = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener('keydown', onKey);
          if (stage3D) stage3D.dispose();
          if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('passinho_triste');
          if (root.LuiggiSave) root.LuiggiSave.salvarRecordeMinigame('passinho_sad', pontos);
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ pontos });
          return;
        }
        proximoPasso();
      }

      host.querySelectorAll('[data-ddr]').forEach((b) =>
        b.addEventListener('click', () => tentar(Number(b.dataset.ddr)))
      );
      function onKey(e) {
        if (e.key in keyMap) {
          e.preventDefault();
          tentar(keyMap[e.key]);
        }
      }
      window.addEventListener('keydown', onKey);
      proximoPasso();
    });
  }

  // ==================== SOUNDBOARD DO DISCORD (CAP. 15) ====================
  function abrirSoundboardDiscord() {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const falas = [
        { autor: 'Fabricio', texto: 'E quando o Vitor elogiou o tênis da menina dizendo que a mãe tinha igual?!', alvo: 'grilo', label: '🦗 Grilo' },
        { autor: 'Mateus Buse', texto: 'E o Luis na cozinha às 4 da manhã jurando que era só uma fornada!', alvo: 'risada', label: '😂 Risada' },
        { autor: 'Fabricio', texto: 'Mano, lembra do corredor da faculdade?!', alvo: 'felps', label: '📢 FELPS!' },
        { autor: 'Mateus Buse', texto: 'E o Subaru balançando na frente da academia kkkkk', alvo: 'buzina', label: '📯 Buzina' },
        { autor: 'Fabricio', texto: 'Eu na casa da Luiza sem saber o que fazer da vida...', alvo: 'voce_sabe', label: '☝️ Você Sabe' },
        { autor: 'Mateus Buse', texto: 'E o Cara Aleatório no TNT?!', alvo: 'bruh', label: '🗿 Bruh' }
      ];
      let round = 0;
      let acertos = 0;

      function render() {
        if (round >= falas.length) {
          if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('soundboard_master');
          if (root.LuiggiSave) root.LuiggiSave.salvarRecordeMinigame('soundboard_discord', acertos * 100);
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ acertos });
          return;
        }
        const f = falas[round];
        host.classList.remove('hidden');
        host.innerHTML = `
          <div class="mg-modal discord-theme">
            <div class="mg-header">
              <h3>🔊 Soundboard do Discord (${round + 1}/${falas.length})</h3>
              <span>Acertos: ${acertos}</span>
            </div>
            <div class="mg-body">
              <div class="discord-quote"><strong>${f.autor}:</strong> "${f.texto}"</div>
              <p style="font-size:0.84rem;color:#9ca3af;">Aperte o som perfeito pro timing da piada!</p>
              <div class="soundboard-grid">
                ${falas
            .map(
              (b) =>
                `<button class="mg-btn ${b.alvo === f.alvo ? '' : ''}" data-sb="${b.alvo}">${b.label}</button>`
            )
            .join('')}
              </div>
            </div>
          </div>
        `;
        host.querySelectorAll('[data-sb]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX(btn.dataset.sb);
            if (btn.dataset.sb === f.alvo) acertos++;
            round++;
            setTimeout(render, 420);
          });
        });
      }
      render();
    });
  }

  root.LuiggiRhythm = {
    abrirLuiggiBeatsHero,
    abrirPassinhoSad,
    abrirSoundboardDiscord
  };
})(window);
