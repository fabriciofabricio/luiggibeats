/**
 * src/minigames/FLStudioGame.js
 * FL Estúdio do LuiggiBeats (paródia de DAW) em call no Discord.
 */
(function (root) {
  'use strict';

  function abrirFLEstudio(modoLivre = false) {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;

      const beat = {
        id: 'beat_' + Date.now(),
        nome: `Beat do Luiggi #${(save?.state?.beatsAutorais?.length || 0) + 1}`,
        bpm: 140,
        kick: Array(16).fill(0),
        snare: Array(16).fill(0),
        clap: Array(16).fill(0),
        hihat: Array(16).fill(0), // 0 off, 1 hit, 2 roll 1/32
        vitor: Array(16).fill(0),
        notes808: Array(16).fill(null), // 0..5 pentatônica menor
        distortion808: 0.25,
        volumes: { kick: 0.9, snare: 0.8, clap: 0.8, hihat: 0.7, bass808: 0.9, vitor: 0.85 },
        playlist: []
      };
      // Padrão inicial simpático
      beat.kick[0] = 1;
      beat.snare[4] = 1;
      beat.snare[12] = 1;

      let playing = false;
      let stopBeatFn = null;
      let currentStep = -1;
      let mutadoCount = 0;
      let flStage3D = null;
      let flRaf = null;
      const flBars = [];

      function destroy3D() {
        if (flRaf) cancelAnimationFrame(flRaf);
        flRaf = null;
        flBars.length = 0;
        if (flStage3D) {
          flStage3D.dispose();
          flStage3D = null;
        }
      }

      function checarMissoes() {
        const hasKick1 = beat.kick[0] === 1;
        const hasRoll = beat.hihat.some((v) => v === 2);
        const has808 = beat.notes808.some((v) => v !== null);
        const vitorCount = beat.vitor.filter(Boolean).length;
        const hasPlaylist = beat.playlist.length >= 3;
        return {
          kick1: hasKick1,
          hihat_roll: hasRoll,
          sub_808: has808,
          vitor_3x: vitorCount >= 3,
          playlist_3: hasPlaylist,
          todas: hasKick1 && hasRoll && has808 && vitorCount >= 3 && hasPlaylist
        };
      }

      function falarDiscord(quem, texto, muted = false) {
        const chat = document.getElementById('fl-discord-chat');
        const fabAv = document.getElementById('fl-av-fab');
        const matAv = document.getElementById('fl-av-mat');
        if (quem === 'fabricio' && fabAv) {
          fabAv.classList.add('speaking');
          setTimeout(() => fabAv.classList.remove('speaking'), 900);
        }
        if (quem === 'mateus_buse' && matAv) {
          matAv.classList.add('speaking');
          setTimeout(() => matAv.classList.remove('speaking'), 900);
        }
        if (!chat) return;
        const div = document.createElement('div');
        div.className = 'fl-d-line';
        div.innerHTML = `<strong>${quem === 'fabricio' ? 'Fabricio' : 'Mateus'}:</strong> ${
          muted ? '<em>(falando mutado...)</em>' : texto
        }`;
        chat.appendChild(div);
        while (chat.children.length > 6) chat.removeChild(chat.firstChild);
      }

      function reagirAoBeat() {
        const totalOn =
          beat.kick.filter(Boolean).length +
          beat.snare.filter(Boolean).length +
          beat.hihat.filter(Boolean).length;

        if (beat.distortion808 > 0.85 && beat.volumes.bass808 > 0.85) {
          falarDiscord('fabricio', 'ESSE 808 TÁ PESADO DEMAIS! OS VIZINHOS VÃO LIGAR PRO SÍNDICO!');
          if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('808_treme_parede');
        } else if (beat.bpm > 175) {
          falarDiscord('fabricio', 'isso é trap ou ataque cardíaco?!');
        } else if (totalOn <= 3) {
          falarDiscord('fabricio', 'tá vazio isso aí, mano');
        } else if (beat.vitor.filter(Boolean).length >= 3) {
          falarDiscord('fabricio', 'KKKKKKKKKK coloca mais vocal do Vitor');
        } else if (beat.hihat.some((v) => v === 2)) {
          falarDiscord('fabricio', 'hi-hat roll de trap, respeito');
        } else {
          mutadoCount++;
          falarDiscord('mateus_buse', '...', true);
          setTimeout(() => {
            falarDiscord('fabricio', 'Mateus, você tá mutado de novo.');
            if (save) save.incrementarContador('avisosMutado', 1);
          }, 450);
        }
      }

      function render() {
        destroy3D();
        const m = checarMissoes();
        host.classList.remove('hidden');
        const canais = [
          { key: 'kick', label: 'Kick' },
          { key: 'snare', label: 'Snare' },
          { key: 'clap', label: 'Clap' },
          { key: 'hihat', label: 'Hi-Hat (clique 2x = Roll)' },
          { key: 'vitor', label: 'Vocal do Vitor ("ééé")' }
        ];
        const notasLabel = ['A1', 'C2', 'D2', 'E2', 'G2', 'A2'];

        host.innerHTML = `
          <div class="mg-modal fl-theme">
            <div class="mg-header fl-topbar">
              <div>
                <h3>🎛️ LuiggiDAW Studio 20</h3>
                <div class="mg-sub">Clique nos passos · Clique 2x no Hi-Hat para <strong>Roll 1/32</strong></div>
              </div>
              <div class="btn-row">
                <button class="mg-btn ${playing ? 'active' : 'primary'}" id="fl-play">${playing ? '⏹ Stop' : '▶ Play'}</button>
                <label style="font-size:0.78rem;">BPM: <strong id="fl-bpm-val">${beat.bpm}</strong>
                  <input type="range" id="fl-bpm" min="80" max="200" value="${beat.bpm}" style="width:90px;vertical-align:middle;" />
                </label>
                <button class="mg-btn" id="fl-export">💾 Exportar Beat</button>
                ${modoLivre ? `<button class="mini-btn" id="fl-close">Sair</button>` : ''}
              </div>
            </div>

            <div class="fl-layout">
              <div class="fl-main">
                <div class="fl-section-title">Channel Rack (16 passos)</div>
                <div class="fl-rack">
                  ${canais
                    .map(
                      (c) => `
                    <div class="fl-row">
                      <span class="fl-ch-name">${c.label}</span>
                      <div class="fl-steps">
                        ${beat[c.key]
                          .map(
                            (val, idx) =>
                              `<button class="fl-step ${idx % 4 === 0 ? 'beat-mark' : ''} ${val === 1 ? 'on' : val === 2 ? 'roll' : ''} ${
                                currentStep === idx ? 'now' : ''
                              }" data-ch="${c.key}" data-step="${idx}">${val === 2 ? 'R' : ''}</button>`
                          )
                          .join('')}
                      </div>
                    </div>`
                    )
                    .join('')}
                </div>

                <div class="fl-section-title" style="margin-top:10px;">Piano Roll do 808 (Pentatônica Menor travada)</div>
                <div class="fl-piano">
                  ${[5, 4, 3, 2, 1, 0]
                    .map(
                      (notaIdx) => `
                    <div class="fl-piano-row">
                      <span class="fl-note-lbl">${notasLabel[notaIdx]}</span>
                      <div class="fl-steps">
                        ${beat.notes808
                          .map(
                            (v, s) =>
                              `<button class="fl-step ${v === notaIdx ? 'on-808' : ''} ${s % 4 === 0 ? 'beat-mark' : ''}" data-808-step="${s}" data-808-nota="${notaIdx}"></button>`
                          )
                          .join('')}
                      </div>
                    </div>`
                    )
                    .join('')}
                </div>

                <div class="fl-bottom-row">
                  <div class="fl-mixer">
                    <div class="fl-section-title">Mixer & Distorção</div>
                    <label>Vol 808: <input type="range" id="fl-vol808" min="0" max="1" step="0.05" value="${beat.volumes.bass808}" /></label>
                    <label>Distorção 808: <input type="range" id="fl-dist808" min="0" max="1" step="0.05" value="${beat.distortion808}" /></label>
                  </div>
                  <div class="fl-playlist">
                    <div class="fl-section-title">Playlist (clique para montar)</div>
                    <div class="btn-row">
                      <button class="mini-btn" data-add-part="Intro">+ Intro</button>
                      <button class="mini-btn" data-add-part="Verso">+ Verso</button>
                      <button class="mini-btn" data-add-part="Refrão">+ Refrão</button>
                    </div>
                    <div class="fl-timeline" id="fl-timeline">
                      ${
                        beat.playlist.length
                          ? beat.playlist.map((p) => `<span class="fl-clip">${p}</span>`).join('')
                          : '<small style="color:#64748b;">Adicione pelo menos 3 partes...</small>'
                      }
                    </div>
                  </div>
                </div>
              </div>

              <aside class="fl-sidebar">
                <div id="fl-3d-vp" style="width:100%;height:125px;border-radius:10px;overflow:hidden;border:1px solid #4c1d95;margin-bottom:8px;"></div>
                <div class="fl-postit">
                  <strong>📌 Post-it de Missões</strong>
                  <ul>
                    <li class="${m.kick1 ? 'done' : ''}">${m.kick1 ? '✓' : '○'} Kick no tempo 1</li>
                    <li class="${m.hihat_roll ? 'done' : ''}">${m.hihat_roll ? '✓' : '○'} Hi-hat roll (2x no passo)</li>
                    <li class="${m.sub_808 ? 'done' : ''}">${m.sub_808 ? '✓' : '○'} Colocar 808 no Piano Roll</li>
                    <li class="${m.vitor_3x ? 'done' : ''}">${m.vitor_3x ? '✓' : '○'} Vocal do Vitor 3x (${beat.vitor.filter(Boolean).length}/3)</li>
                    <li class="${m.playlist_3 ? 'done' : ''}">${m.playlist_3 ? '✓' : '○'} 3 partes na Playlist (${beat.playlist.length}/3)</li>
                  </ul>
                </div>

                <div class="fl-discord-box">
                  <div class="fl-d-head">🎧 Call no Discord</div>
                  <div class="fl-avatars">
                    <div class="fl-av" id="fl-av-fab">Fabricio</div>
                    <div class="fl-av muted" id="fl-av-mat">Mateus 🔇</div>
                  </div>
                  <div class="fl-d-chat" id="fl-discord-chat">
                    <div class="fl-d-line"><strong>Fabricio:</strong> Bora fazer o beat zoando o Vitor!</div>
                  </div>
                  <div class="btn-row" style="margin-top:6px;">
                    <button class="mini-btn" data-flsb="buzina">📯</button>
                    <button class="mini-btn" data-flsb="risada">😂</button>
                    <button class="mini-btn" data-flsb="bruh">🗿</button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        `;

        wireEvents();

        const vp3d = document.getElementById('fl-3d-vp');
        flStage3D =
          root.Luiggi3D &&
          vp3d &&
          root.Luiggi3D.createStage(vp3d, { bg: 0x0b0718, fov: 44, camPos: [0, 3.2, 7.6], lookAt: [0, 0.8, 0] });
        if (flStage3D) {
          const { THREE, scene } = flStage3D;
          const desk = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.3, 4),
            new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, metalness: 0.3 })
          );
          desk.position.y = -0.2;
          scene.add(desk);
          for (let i = 0; i < 12; i++) {
            const col = i < 4 ? 0xf59e0b : i < 8 ? 0xa855f7 : 0x38bdf8;
            const bm = new THREE.Mesh(
              new THREE.BoxGeometry(0.42, 1, 0.42),
              new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.25 })
            );
            bm.position.set(-3.3 + i * 0.6, 0.5, 0);
            scene.add(bm);
            flBars.push(bm);
          }
          const anim = () => {
            if (!flStage3D) return;
            flRaf = requestAnimationFrame(anim);
            const t = performance.now() * 0.006;
            flBars.forEach((b, idx) => {
              const hitBoost = playing ? 1.2 + Math.abs(Math.sin(t + idx * 0.6)) * (1.2 + beat.distortion808) : 0.35 + Math.sin(t * 0.3 + idx) * 0.12;
              b.scale.y = Math.max(0.2, hitBoost);
              b.position.y = b.scale.y * 0.5;
            });
            flStage3D.camera.position.x = Math.sin(t * 0.15) * 0.8;
            flStage3D.camera.lookAt(0, 0.8, 0);
            flStage3D.renderer.render(flStage3D.scene, flStage3D.camera);
          };
          flRaf = requestAnimationFrame(anim);
        }
      }

      function wireEvents() {
        host.querySelectorAll('[data-ch]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const ch = btn.dataset.ch;
            const s = Number(btn.dataset.step);
            if (ch === 'hihat') {
              beat.hihat[s] = (beat.hihat[s] + 1) % 3;
            } else {
              beat[ch][s] = beat[ch][s] ? 0 : 1;
              if (beat[ch][s] && ch === 'vitor') root.LuiggiAudio.playVitorSample();
            }
            if (playing) reiniciarLoop();
            render();
            reagirAoBeat();
          });
        });

        host.querySelectorAll('[data-808-step]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const s = Number(btn.dataset['808Step']);
            const nota = Number(btn.dataset['808Nota']);
            beat.notes808[s] = beat.notes808[s] === nota ? null : nota;
            if (beat.notes808[s] !== null) {
              const esc = [55, 65.41, 73.42, 82.41, 98, 110];
              root.LuiggiAudio.play808(null, esc[nota], null, beat.distortion808, 0.3, 0.6);
            }
            if (playing) reiniciarLoop();
            render();
          });
        });

        host.querySelectorAll('[data-add-part]').forEach((btn) => {
          btn.addEventListener('click', () => {
            beat.playlist.push(btn.dataset.addPart);
            render();
          });
        });

        host.querySelectorAll('[data-flsb]').forEach((btn) => {
          btn.addEventListener('click', () => {
            root.LuiggiAudio.playSFX(btn.dataset.flsb);
            falarDiscord('fabricio', btn.dataset.flsb === 'buzina' ? 'KKKK PARA COM ESSA BUZINA' : 'KKKKKKK');
          });
        });

        document.getElementById('fl-bpm').addEventListener('input', (e) => {
          beat.bpm = Number(e.target.value);
          document.getElementById('fl-bpm-val').textContent = beat.bpm;
          if (playing) reiniciarLoop();
        });

        document.getElementById('fl-vol808').addEventListener('input', (e) => {
          beat.volumes.bass808 = Number(e.target.value);
          reagirAoBeat();
        });
        document.getElementById('fl-dist808').addEventListener('input', (e) => {
          beat.distortion808 = Number(e.target.value);
          reagirAoBeat();
        });

        document.getElementById('fl-play').addEventListener('click', () => {
          playing = !playing;
          if (playing) {
            reiniciarLoop();
            reagirAoBeat();
          } else if (stopBeatFn) {
            stopBeatFn();
            stopBeatFn = null;
          }
          render();
        });

        document.getElementById('fl-export').addEventListener('click', () => {
          destroy3D();
          if (stopBeatFn) stopBeatFn();
          playing = false;
          const m = checarMissoes();
          if (m.todas && root.LuiggiAchievements) {
            root.LuiggiAchievements.desbloquear('produtor_musical');
          }
          exportarCom99PorCento();
        });

        const closeBtn = document.getElementById('fl-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            destroy3D();
            if (stopBeatFn) stopBeatFn();
            host.classList.add('hidden');
            host.innerHTML = '';
            resolve({ cancelado: true });
          });
        }
      }

      function reiniciarLoop() {
        if (stopBeatFn) stopBeatFn();
        stopBeatFn = root.LuiggiAudio.tocarBeatFL(beat, beat.bpm, true, (step) => {
          currentStep = step;
          host.querySelectorAll('.fl-step').forEach((el) => {
            const s = Number(el.dataset.step ?? el.dataset['808Step']);
            el.classList.toggle('now', s === step);
          });
        });
      }

      function exportarCom99PorCento() {
        host.innerHTML = `
          <div class="mg-modal fl-theme" style="max-width:460px;text-align:center;">
            <div class="mg-header"><h3>💾 Renderizando MP3...</h3></div>
            <div class="mg-body">
              <div class="progress-bar" style="height:22px;"><div class="progress-fill" id="fl-render-bar" style="width:0%;background:#f97316;"></div></div>
              <p id="fl-render-pct" style="margin-top:10px;font-weight:700;">0%</p>
            </div>
          </div>
        `;
        const bar = document.getElementById('fl-render-bar');
        const pctEl = document.getElementById('fl-render-pct');
        let p = 0;
        const t = setInterval(() => {
          if (p < 99) {
            p = Math.min(99, p + 14);
            bar.style.width = `${p}%`;
            pctEl.textContent = `${p}%`;
            if (p === 99) {
              if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('renderizando');
              pctEl.textContent = '99%... (travado como todo produtor)';
              setTimeout(() => {
                clearInterval(t);
                bar.style.width = '100%';
                pctEl.textContent = '100%! Beat salvo para o LuiggiBeats Hero e Museu!';
                if (save) {
                  save.state.beatsAutorais.push(beat);
                  save.salvarRecordeMinigame('fl_estudio', 1000);
                  save.salvar();
                }
                setTimeout(() => {
                  host.classList.add('hidden');
                  host.innerHTML = '';
                  resolve({ beat });
                }, 900);
              }, 1600);
            }
          }
        }, 120);
      }

      render();
    });
  }

  root.LuiggiFLStudio = { abrirFLEstudio };
})(window);
