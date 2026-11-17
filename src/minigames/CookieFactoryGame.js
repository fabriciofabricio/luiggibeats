/**
 * src/minigames/CookieFactoryGame.js
 * Fábrica de Cookies: Modo Hiperfoco (6 etapas) + Modo Infinito (clicker com upgrades).
 */
(function (root) {
  'use strict';

  function abrirFabricaCookies(modo = 'livre') {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      const receitas = root.LuiggiData?.cache?.receitas?.receitas || [];
      const capMax = save?.state?.capituloMaxDesbloqueado ?? 0;
      const disponiveis = receitas.filter(
        (r) => save?.state?.receitasDesbloqueadas?.includes(r.id) || r.desbloqueiaNoCapitulo <= capMax
      );
      let receitaAtual = disponiveis[disponiveis.length - 1] || receitas[0] || {
        id: 'classico',
        nome: 'Cookie Clássico',
        corMassa: '#D99B52',
        corGotas: '#4A2C1D'
      };

      let etapa = 1;
      let pontos = 0;
      let horaRelogio = 23;
      let hiperfoco = 35;

      let activeStage3D = null;
      let activeRaf = null;

      function destroy3D() {
        if (activeRaf) cancelAnimationFrame(activeRaf);
        activeRaf = null;
        if (activeStage3D) {
          activeStage3D.dispose();
          activeStage3D = null;
        }
      }

      function renderShell(innerHtml) {
        destroy3D();
        host.classList.remove('hidden');
        host.innerHTML = `
          <div class="mg-modal cookie-theme">
            <div class="mg-header">
              <div>
                <h3>🍪 Fábrica de Cookies: Modo Hiperfoco</h3>
                <div class="mg-sub">Receita: <strong>${receitaAtual.nome}</strong> · Etapa ${etapa}/6</div>
              </div>
              <div class="cookie-hud-right">
                <span class="badge-pill">🕓 ${String(horaRelogio % 24).padStart(2, '0')}:00</span>
                <span class="badge-pill">⚡ Hiperfoco: ${hiperfoco}%</span>
              </div>
            </div>
            ${etapa === 1 && disponiveis.length > 1
            ? `<div class="recipe-strip">Receitas: ${disponiveis
              .map(
                (r) =>
                  `<button class="mini-btn ${r.id === receitaAtual.id ? 'active' : ''}" data-rec="${r.id}">${r.nome}</button>`
              )
              .join('')}</div>`
            : ''
          }
            <div class="mg-body">${innerHtml}</div>
          </div>
        `;
        host.querySelectorAll('[data-rec]').forEach((b) => {
          b.addEventListener('click', () => {
            receitaAtual = disponiveis.find((r) => r.id === b.dataset.rec) || receitaAtual;
            iniciarEtapa1();
          });
        });
      }

      // ETAPA 1: Balança (peso certo vs explosão de farinha)
      function iniciarEtapa1() {
        etapa = 1;
        let peso = 0;
        const meta = 250;
        let segurando = false;
        let raf = null;

        renderShell(`
          <p>Segure <strong>ADICIONAR FARINHA</strong> até atingir <strong>${meta}g</strong> (entre 225g e 275g). Passar de 340g explode na cara do Luis!</p>
          <div id="ck-3d-scale" style="width:100%;height:190px;border-radius:12px;overflow:hidden;margin-bottom:10px;border:1px solid #451a03;"></div>
          <div class="scale-box">
            <div class="scale-needle-bar"><div class="scale-zone"></div><div class="scale-fill" id="ck-fill"></div></div>
            <div class="scale-readout" id="ck-peso">0g / ${meta}g</div>
          </div>
          <div class="mg-actions">
            <button class="mg-btn primary" id="ck-hold">🥣 Segurar Farinha</button>
            <button class="mg-btn" id="ck-done">✓ Parar Balança</button>
          </div>
        `);

        const fillEl = document.getElementById('ck-fill');
        const pesoEl = document.getElementById('ck-peso');
        const holdBtn = document.getElementById('ck-hold');

        // Balança + tigela 3D
        let flourMound = null;
        activeStage3D =
          root.Luiggi3D &&
          root.Luiggi3D.createStage(document.getElementById('ck-3d-scale'), {
            bg: 0x1a110b,
            fov: 40,
            camPos: [0, 3.2, 5.4],
            lookAt: [0, 0.3, 0]
          });
        if (activeStage3D) {
          const { THREE, scene } = activeStage3D;
          const counter = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.4, 6),
            new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.3, metalness: 0.15 })
          );
          counter.position.y = -0.8;
          scene.add(counter);
          const scaleBase = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.35, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
          );
          scaleBase.position.y = -0.4;
          scene.add(scaleBase);
          const bowl = new THREE.Mesh(
            new THREE.CylinderGeometry(1.35, 0.85, 1.0, 28, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, side: THREE.DoubleSide })
          );
          bowl.position.y = 0.25;
          scene.add(bowl);
          flourMound = new THREE.Mesh(
            new THREE.SphereGeometry(0.95, 20, 16),
            new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.95 })
          );
          flourMound.position.y = -0.05;
          flourMound.scale.set(1, 0.08, 1);
          scene.add(flourMound);
        }

        function loop() {
          if (segurando) {
            peso += 3.8;
            fillEl.style.width = `${Math.min(100, (peso / 360) * 100)}%`;
            pesoEl.textContent = `${Math.round(peso)}g / ${meta}g`;
            if (flourMound) flourMound.scale.y = Math.max(0.08, (peso / 250) * 0.68);
            if (peso >= 340) {
              segurando = false;
              cancelAnimationFrame(raf);
              if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('nuvem_de_farinha');
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
              pesoEl.innerHTML = `<span style="color:#fff">💨 BUUUM! Nuvem de farinha na cara do Luis!</span>`;
              setTimeout(() => iniciarEtapa2(), 1100);
              return;
            }
          }
          if (activeStage3D) {
            activeStage3D.camera.position.x = Math.sin(performance.now() * 0.0008) * 0.4;
            activeStage3D.camera.lookAt(0, 0.25, 0);
            activeStage3D.renderer.render(activeStage3D.scene, activeStage3D.camera);
          }
          raf = requestAnimationFrame(loop);
          activeRaf = raf;
        }
        raf = requestAnimationFrame(loop);
        activeRaf = raf;

        holdBtn.addEventListener('mousedown', () => (segurando = true));
        holdBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          segurando = true;
        });
        window.addEventListener('mouseup', () => (segurando = false), { once: false });
        window.addEventListener('touchend', () => (segurando = false), { once: false });

        document.getElementById('ck-done').addEventListener('click', () => {
          cancelAnimationFrame(raf);
          const diff = Math.abs(peso - meta);
          if (diff <= 30) {
            pontos += 250;
            hiperfoco = Math.min(100, hiperfoco + 20);
          } else {
            pontos += 120;
          }
          iniciarEtapa2();
        });
      }

      // ETAPA 2: Misturar no ritmo
      function iniciarEtapa2() {
        etapa = 2;
        let progresso = 0;
        let lastAngle = null;
        renderShell(`
          <p>Faça movimentos circulares com o mouse/dedo na tigela (ou clique no botão no ritmo) até a massa ficar lisa!</p>
          <div class="bowl-area" id="ck-bowl" style="background:${receitaAtual.corMassa || '#D99B52'}">
            <div class="bowl-spoon" id="ck-spoon">🥄</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="ck-mix-bar" style="width:0%"></div></div>
          <div class="mg-actions"><button class="mg-btn" id="ck-mix-tap">🔄 Misturar Rápido</button></div>
        `);

        const bowl = document.getElementById('ck-bowl');
        const spoon = document.getElementById('ck-spoon');
        const bar = document.getElementById('ck-mix-bar');

        function avancar(delta) {
          progresso = Math.min(100, progresso + delta);
          bar.style.width = `${progresso}%`;
          spoon.style.transform = `rotate(${progresso * 10}deg)`;
          if (progresso >= 100) {
            pontos += 200;
            hiperfoco = Math.min(100, hiperfoco + 15);
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
            iniciarEtapa3();
          }
        }

        function onMove(cx, cy) {
          const rect = bowl.getBoundingClientRect();
          const ang = Math.atan2(cy - (rect.top + rect.height / 2), cx - (rect.left + rect.width / 2));
          if (lastAngle !== null && Math.abs(ang - lastAngle) > 0.2) avancar(4);
          lastAngle = ang;
        }
        bowl.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        bowl.addEventListener('touchmove', (e) => {
          e.preventDefault();
          onMove(e.touches[0].clientX, e.touches[0].clientY);
        });
        document.getElementById('ck-mix-tap').addEventListener('click', () => avancar(14));
      }

      // ETAPA 3: Gotas de chocolate
      function iniciarEtapa3() {
        etapa = 3;
        let gotas = 0;
        renderShell(`
          <p>Clique na massa para espalhar gotas de chocolate (meta: 8 a 12 gotas — se passar de 15, o Luis come metade!).</p>
          <div class="dough-pad" id="ck-dough" style="background:${receitaAtual.corMassa || '#D99B52'}"></div>
          <div id="ck-chips-status" style="text-align:center;margin:8px 0;">Gotas: 0 (Pouco)</div>
          <div class="mg-actions"><button class="mg-btn primary" id="ck-chips-ok">✓ Próxima Etapa</button></div>
        `);

        const pad = document.getElementById('ck-dough');
        const st = document.getElementById('ck-chips-status');
        pad.addEventListener('click', (e) => {
          gotas++;
          const rect = pad.getBoundingClientRect();
          const dot = document.createElement('div');
          dot.className = 'choco-chip';
          dot.style.background = receitaAtual.corGotas || '#3B2214';
          dot.style.left = `${e.clientX - rect.left - 7}px`;
          dot.style.top = `${e.clientY - rect.top - 7}px`;
          pad.appendChild(dot);
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
          if (gotas < 7) st.textContent = `Gotas: ${gotas} (Pouco)`;
          else if (gotas <= 13) st.textContent = `Gotas: ${gotas} (PERFEITO!)`;
          else st.textContent = `Gotas: ${gotas} (O Luis comeu metade da tigela!)`;
        });
        document.getElementById('ck-chips-ok').addEventListener('click', () => {
          if (gotas >= 7 && gotas <= 13) pontos += 200;
          else pontos += 100;
          iniciarEtapa4();
        });
      }

      // ETAPA 4: Bolinhas na assadeira
      function iniciarEtapa4() {
        etapa = 4;
        const nomesEngracados = [
          'Cookie Padrão LuiggiBeats',
          'Cookie do Vitor: pequeno e inseguro',
          'Cookie Tico e Teco',
          'Cookie 808 gigante',
          'Cookie Subaru',
          'Cookie Pós-Créditos'
        ];
        const tamanhos = [0, 0, 0, 0, 0, 0];
        renderShell(`
          <p>Clique nos 6 espaços da assadeira para modelar as bolinhas (tente deixar todas com tamanho ~3!).</p>
          <div class="tray-grid">
            ${tamanhos
            .map(
              (_, i) => `
              <button class="tray-slot" data-slot="${i}">
                <div class="ball-preview" id="ball-${i}" style="background:${receitaAtual.corMassa}"></div>
                <span id="ball-lbl-${i}">Vazio</span>
              </button>`
            )
            .join('')}
          </div>
          <div class="mg-actions"><button class="mg-btn primary" id="ck-tray-go">🔥 Botar no Forno</button></div>
        `);
        host.querySelectorAll('.tray-slot').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.slot);
            tamanhos[idx] = (tamanhos[idx] % 4) + 1;
            const b = document.getElementById(`ball-${idx}`);
            const l = document.getElementById(`ball-lbl-${idx}`);
            const sz = 16 + tamanhos[idx] * 10;
            b.style.width = `${sz}px`;
            b.style.height = `${sz}px`;
            l.textContent = tamanhos[idx] === 1 ? nomesEngracados[1] : `Tamanho ${tamanhos[idx]}`;
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
          });
        });
        document.getElementById('ck-tray-go').addEventListener('click', () => {
          const uniformes = tamanhos.filter((t) => t === 3).length;
          pontos += uniformes * 40;
          iniciarEtapa5();
        });
      }

      // ETAPA 5: Forno + Relógio Hiperfoco
      function iniciarEtapa5() {
        etapa = 5;
        let temp = 0;
        let assado = false;
        let esperandoPos = false;
        renderShell(`
          <p>Tire os cookies na <strong>ZONA DOURADA (60% a 82%)</strong>! Se passar, queima. ${receitaAtual.recheioSecreto ? '<em>(Dica Pós-Créditos: espere um pouquinho!)</em>' : ''}</p>
          <div id="ck-3d-oven" style="width:100%;height:200px;border-radius:12px;overflow:hidden;border:2px solid #9a3412;margin-bottom:10px;"></div>
          <div class="scale-needle-bar"><div class="scale-zone" style="left:60%;width:22%;background:rgba(245,158,11,0.45)"></div><div class="scale-fill" id="ck-oven-fill"></div></div>
          <div id="ck-oven-msg" style="text-align:center;margin:8px 0;">Assando...</div>
          <div class="mg-actions"><button class="mg-btn primary" id="ck-pull">🧤 Tirar do Forno</button></div>
        `);

        const fill = document.getElementById('ck-oven-fill');
        const msg = document.getElementById('ck-oven-msg');

        let ovenCookies = [];
        let ovenLight = null;
        activeStage3D =
          root.Luiggi3D &&
          root.Luiggi3D.createStage(document.getElementById('ck-3d-oven'), {
            bg: 0x1c0d07,
            fov: 42,
            camPos: [0, 3.6, 6.2],
            lookAt: [0, 0, 0]
          });
        if (activeStage3D) {
          const { THREE, scene } = activeStage3D;
          const tray = new THREE.Mesh(
            new THREE.BoxGeometry(6.8, 0.16, 4.4),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.28 })
          );
          tray.position.y = -0.2;
          scene.add(tray);
          ovenLight = new THREE.PointLight(0xf97316, 2.5, 16);
          ovenLight.position.set(0, 2.8, 1.5);
          scene.add(ovenLight);
          for (let i = 0; i < 3; i++) {
            const cm = root.Luiggi3D.createCookieMesh(receitaAtual.corMassa || '#D99B52', receitaAtual.corGotas || '#3B1F10');
            cm.scale.setScalar(0.55);
            cm.position.set(-2.0 + i * 2.0, 0.12, 0);
            scene.add(cm);
            ovenCookies.push(cm);
          }
          const renderOven = () => {
            if (assado) return;
            activeRaf = requestAnimationFrame(renderOven);
            ovenCookies.forEach((c, idx) => (c.rotation.y += 0.008 * (idx + 1)));
            if (ovenLight) ovenLight.intensity = 2.2 + (temp / 100) * 3.5;
            activeStage3D.renderer.render(activeStage3D.scene, activeStage3D.camera);
          };
          activeRaf = requestAnimationFrame(renderOven);
        }
        const int = setInterval(() => {
          if (assado) return;
          temp += 1.6;
          fill.style.width = `${Math.min(100, temp)}%`;
          if (temp >= 50) {
            horaRelogio = 28; // 04:00 da manhã!
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('que_horas_sao');
          }
          if (temp < 58) msg.textContent = 'Ainda cru...';
          else if (temp <= 84) msg.textContent = '✨ NO PONTO! DOURADO!';
          else msg.textContent = '🔥 QUEIMANDO!';
          if (temp >= 100) {
            assado = true;
            clearInterval(int);
            iniciarEtapa6('Queimado (mas comestível no Discord)');
          }
        }, 70);

        document.getElementById('ck-pull').addEventListener('click', () => {
          if (assado) return;
          assado = true;
          clearInterval(int);
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
          if (temp >= 58 && temp <= 84) {
            pontos += 350;
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('cookie_perfeito');
            iniciarEtapa6('Dourado por fora, macio por dentro! ✨');
          } else if (temp < 58) {
            pontos += 100;
            iniciarEtapa6('Meio cru (a pressa do hiperfoco).');
          } else {
            pontos += 90;
            iniciarEtapa6('Passou um tiquinho do ponto.');
          }
        });
      }

      // ETAPA 6: Avaliação no Discord
      function iniciarEtapa6(resultadoForno) {
        etapa = 6;
        if (save) {
          save.incrementarContador('cookiesAssados', 6);
          save.salvarRecordeMinigame('fabrica_cookies', pontos);
        }

        renderShell(`
          <div class="oven-result">
            <div id="ck-3d-result" style="width:100%;height:190px;border-radius:12px;overflow:hidden;margin-bottom:10px;"></div>
            <h4>Fornada Concluída!</h4>
            <p>${resultadoForno}</p>
            <p><strong>Pontuação:</strong> ${pontos} pts · 🕓 Já são 04:00 da manhã!</p>
            <div class="discord-eval">
              <div><strong>Mateus Buse:</strong> "Crocância periférica 8, centro macio 9,5."</div>
              <div><strong>Fabricio Venturi:</strong> "manda um pra mim"</div>
            </div>
          </div>
          <div class="mg-actions">
            <button class="mg-btn primary" id="ck-finish">Continuar</button>
          </div>
        `);
        activeStage3D =
          root.Luiggi3D &&
          root.Luiggi3D.createStage(document.getElementById('ck-3d-result'), {
            bg: 0x16110e,
            fov: 40,
            camPos: [0, 3.2, 4.4],
            lookAt: [0, 0, 0]
          });
        if (activeStage3D) {
          const heroCk = root.Luiggi3D.createCookieMesh(receitaAtual.corMassa || '#D99B52', receitaAtual.corGotas || '#3B1F10');
          activeStage3D.scene.add(heroCk);
          const spin = () => {
            if (!activeStage3D) return;
            activeRaf = requestAnimationFrame(spin);
            heroCk.rotation.y += 0.015;
            heroCk.rotation.x = 0.28 + Math.sin(performance.now() * 0.002) * 0.08;
            activeStage3D.renderer.render(activeStage3D.scene, activeStage3D.camera);
          };
          activeRaf = requestAnimationFrame(spin);
        }
        document.getElementById('ck-finish').addEventListener('click', () => {
          destroy3D();
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ pontos });
        });
      }

      iniciarEtapa1();
    });
  }

  function abrirModoInfinito() {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      const upgrades = root.LuiggiData?.cache?.receitas?.upgradesInfinito || [];
      const inf = save.state.cookiesInfinitos;

      function calcCPS() {
        return upgrades.reduce((sum, u) => sum + (inf.upgrades[u.id] || 0) * u.cps, 0);
      }

      function custo(u) {
        const q = inf.upgrades[u.id] || 0;
        return Math.round(u.custoBase * Math.pow(1.28, q));
      }

      host.classList.remove('hidden');
      host.innerHTML = `
        <div class="mg-modal cookie-theme">
          <div class="mg-header">
            <h3>🍪 Modo Infinito de Cookies</h3>
            <button class="mini-btn" id="inf-close">Fechar</button>
          </div>
          <div class="mg-body" style="text-align:center;">
            <div style="font-size:1.7rem;font-weight:800;color:#fbbf24;" id="inf-total">${Math.floor(inf.total)} cookies</div>
            <div style="font-size:0.85rem;color:#cbd5e1;margin-bottom:14px;" id="inf-cps">${calcCPS()} cookies/seg</div>
            <button id="inf-cookie-btn" class="giant-cookie-btn">🍪</button>
            <div class="upgrade-list" id="inf-upgrades" style="margin-top:14px;"></div>
          </div>
        </div>
      `;

      function renderUpgrades() {
        const box = document.getElementById('inf-upgrades');
        if (!box) return;
        box.innerHTML = upgrades
          .map((u) => {
            const c = custo(u);
            const q = inf.upgrades[u.id] || 0;
            return `
              <button class="upgrade-row" data-upg="${u.id}" ${inf.total < c ? 'disabled' : ''}>
                <div><strong>${u.nome}</strong> (x${q})<br/><small>${u.descricao}</small></div>
                <span>+${u.cps}/s · 🍪 ${c}</span>
              </button>`;
          })
          .join('');
        box.querySelectorAll('[data-upg]').forEach((b) => {
          b.addEventListener('click', () => {
            const u = upgrades.find((x) => x.id === b.dataset.upg);
            const c = custo(u);
            if (inf.total >= c) {
              inf.total -= c;
              inf.upgrades[u.id] = (inf.upgrades[u.id] || 0) + 1;
              save.salvar();
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
              atualizarUI();
              renderUpgrades();
            }
          });
        });
      }

      function atualizarUI() {
        const tEl = document.getElementById('inf-total');
        const cEl = document.getElementById('inf-cps');
        if (tEl) tEl.textContent = `${Math.floor(inf.total)} cookies`;
        if (cEl) cEl.textContent = `${calcCPS()} cookies/seg`;
        if (inf.total >= 10000 && root.LuiggiAchievements) {
          root.LuiggiAchievements.desbloquear('mestre_dos_cookies');
        }
      }

      document.getElementById('inf-cookie-btn').addEventListener('click', () => {
        inf.total += 1 + Math.floor(calcCPS() * 0.1);
        if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
        save.salvar();
        atualizarUI();
        renderUpgrades();
      });

      const tick = setInterval(() => {
        const cps = calcCPS();
        if (cps > 0) {
          inf.total += cps / 4;
          save.salvar();
          atualizarUI();
        }
      }, 250);

      renderUpgrades();

      document.getElementById('inf-close').addEventListener('click', () => {
        clearInterval(tick);
        save.salvar();
        host.classList.add('hidden');
        host.innerHTML = '';
        resolve();
      });
    });
  }

  root.LuiggiCookies = {
    abrirFabricaCookies,
    abrirModoInfinito
  };
})(window);
