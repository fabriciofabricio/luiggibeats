/**
 * src/minigames/QuickMinigames.js
 * Minigames com gráficos 2D em Canvas, efeitos visuais e jogabilidade caprichada (Caps. 1 a 14).
 */
(function (root) {
  'use strict';

  function fechar(host, id, pontos, resolve, extra = {}) {
    if (root.LuiggiSave) root.LuiggiSave.salvarRecordeMinigame(id, pontos);
    host.classList.add('hidden');
    host.innerHTML = '';
    resolve({ pontos, ...extra });
  }

  function abrir(id) {
    const host = document.getElementById('minigame-overlay');
    const save = root.LuiggiSave;

    // 1. PUZZLE DO ARMÁRIO (Cap. 1 - Cadeado animado)
    if (id === 'puzzle_armario') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const digits = [0, 0, 0];
        host.innerHTML = `
          <div class="mg-modal" style="max-width:540px;">
            <div class="mg-header"><h3>🔐 Puzzle do Armário (Colégio)</h3></div>
            <div class="mg-body" style="text-align:center;">
              <div class="locker-door">
                <div class="locker-vents"><div></div><div></div><div></div></div>
                <div class="padlock-body">
                  <div class="padlock-shackle"></div>
                  <div class="dial-row">
                    ${[0, 1, 2]
                      .map((i) => `<button class="dial-btn" data-dial="${i}">0</button>`)
                      .join('')}
                  </div>
                </div>
              </div>
              <p id="puz-msg" style="color:#fbbf24;min-height:24px;margin-top:10px;">Gire os números para tentar abrir o cadeado...</p>
              <div class="mg-actions"><button class="mg-btn primary" id="puz-try">Puxar Cadeado</button></div>
            </div>
          </div>`;
        host.querySelectorAll('[data-dial]').forEach((b) => {
          b.addEventListener('click', () => {
            const idx = Number(b.dataset.dial);
            digits[idx] = (digits[idx] + 1) % 10;
            b.textContent = String(digits[idx]);
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
          });
        });
        const t = setTimeout(() => {
          const msg = document.getElementById('puz-msg');
          if (msg) msg.textContent = '🤓 Mateus Buse: "A senha é 4-2-0, mano. Pronto, abri em 2 segundos."';
          host.querySelectorAll('[data-dial]').forEach((b, i) => (b.textContent = [4, 2, 0][i]));
        }, 2200);
        document.getElementById('puz-try').addEventListener('click', () => {
          clearTimeout(t);
          fechar(host, id, 150, resolve);
        });
      });
    }

    // 2. BASQUETE COM A MARIA CLARA (Cap. 1 - Canvas 2D com física parabólica)
    if (id === 'basquete_maria_clara') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let cestas = 0;
        let tent = 5;
        let power = 0;
        let dir = 1;
        let ball = { x: 115, y: 255, vx: 0, vy: 0, active: false, scored: false };
        let netSwing = 0;
        let raf = null;

        host.innerHTML = `
          <div class="mg-modal" style="max-width:680px;">
            <div class="mg-header"><h3>🏀 Basquete com a Maria Clara</h3><span id="bsq-hud">Cestas: 0 · Restam: 5</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="bsq-c" width="620" height="320" style="width:100%;border-radius:10px;border:1px solid #334155;"></canvas>
              <p id="bsq-msg" style="min-height:22px;margin:8px 0;color:#fbbf24;">Clique em ARREMESSAR com a força na zona verde!</p>
              <div class="mg-actions"><button class="mg-btn primary" id="bsq-shoot">🏀 ARREMESSAR!</button></div>
            </div>
          </div>`;

        const c = document.getElementById('bsq-c');
        const ctx = c.getContext('2d');
        const msg = document.getElementById('bsq-msg');
        const hud = document.getElementById('bsq-hud');

        function resetBall() {
          ball = { x: 115, y: 245, vx: 0, vy: 0, active: false, scored: false };
        }

        function loop() {
          raf = requestAnimationFrame(loop);
          if (!ball.active) {
            power += dir * 2.4;
            if (power >= 100 || power <= 0) dir *= -1;
          } else {
            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.vy += 0.36;
            // Tabela e aro em x=515, y=135
            if (ball.x > 542 && ball.x < 560 && ball.y > 75 && ball.y < 165) {
              ball.vx *= -0.6;
            }
            if (!ball.scored && Math.abs(ball.x - 512) < 22 && Math.abs(ball.y - 135) < 15 && ball.vy > 0) {
              ball.scored = true;
              cestas++;
              netSwing = 18;
              msg.textContent = '✨ CHUÁ! Maria Clara: "Boa!! Joga muito!"';
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
            }
            if (ball.y > 310 || ball.x > 630) {
              if (!ball.scored) {
                msg.textContent = '💥 Quase! Bateu no aro!';
                if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
              }
              tent--;
              hud.textContent = `Cestas: ${cestas} · Restam: ${tent}`;
              resetBall();
              if (tent <= 0) {
                cancelAnimationFrame(raf);
                setTimeout(() => fechar(host, id, cestas * 150, resolve), 750);
                return;
              }
            }
          }
          if (netSwing > 0) netSwing *= 0.92;

          // Quadra céu + madeira
          const g = ctx.createLinearGradient(0, 0, 0, 320);
          g.addColorStop(0, '#1e3a5f');
          g.addColorStop(0.7, '#d97706');
          g.addColorStop(1, '#78350f');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 620, 320);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(0, 265, 620, 55);

          // Poste, tabela e aro
          ctx.fillStyle = '#334155';
          ctx.fillRect(555, 110, 12, 165);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(542, 70, 14, 78);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(492, 135);
          ctx.lineTo(542, 135);
          ctx.stroke();
          // Rede
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(496 + i * 13, 137);
            ctx.lineTo(502 + i * 10 + Math.sin(netSwing) * 4, 168);
            ctx.stroke();
          }

          // Luis + Maria Clara na quadra
          ctx.fillStyle = '#18181b';
          ctx.fillRect(92, 215, 22, 55);
          ctx.fillStyle = '#ebc1a9';
          ctx.beginPath();
          ctx.arc(103, 202, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7c44d6';
          ctx.fillRect(425, 218, 22, 52);
          ctx.fillStyle = '#f2cfc0';
          ctx.beginPath();
          ctx.arc(436, 205, 12, 0, Math.PI * 2);
          ctx.fill();

          // Bola de basquete
          ctx.fillStyle = '#ea580c';
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Medidor de força
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(28, 24, 240, 20);
          ctx.fillStyle = 'rgba(16,185,129,0.55)';
          ctx.fillRect(28 + 240 * 0.48, 24, 240 * 0.2, 20);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(28, 24, 240 * (power / 100), 20);
        }
        raf = requestAnimationFrame(loop);

        document.getElementById('bsq-shoot').addEventListener('click', () => {
          if (ball.active || tent <= 0) return;
          ball.active = true;
          const pNorm = power / 100;
          ball.vx = 5.4 + pNorm * 3.8;
          ball.vy = -8.6 - pNorm * 4.8;
        });
      });
    }

    // 3. DIGITANDO... (Cap. 3)
    if (id === 'digitando_autocorretor') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let envios = 0;
        const sabotagens = [
          { alvo: 'Não posso hoje', virou: 'Não posso... mas quero 😍' },
          { alvo: 'Tenho aula agora', virou: 'Tô indo aí agora!' },
          { alvo: 'Hoje não vai dar', virou: 'Hoje sim com certeza!' }
        ];
        function render() {
          if (envios >= 3) {
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('autocorretor_traidor');
            fechar(host, id, 300, resolve);
            return;
          }
          const s = sabotagens[envios];
          host.innerHTML = `
            <div class="mg-modal" style="max-width:440px;">
              <div class="mg-header"><h3>📱 ZapZap — Cecília</h3><span>${envios + 1}/3</span></div>
              <div class="mg-body">
                <div class="phone-screen">
                  <div class="chat-bubble them">Cecília: "Felpsss bora se encontrar? 💕"</div>
                  <div class="chat-typing">digitando...</div>
                </div>
                <p style="font-size:0.86rem;">Digite a recusa: <strong>"${s.alvo}"</strong></p>
                <input id="auto-inp" class="mg-input" placeholder="Digite aqui..." autocomplete="off" />
                <div id="auto-sab" style="color:#f87171;font-size:0.84rem;min-height:22px;"></div>
                <div class="mg-actions"><button class="mg-btn primary" id="auto-send">Enviar</button></div>
              </div>
            </div>`;
          const inp = document.getElementById('auto-inp');
          const sab = document.getElementById('auto-sab');
          inp.focus();
          inp.addEventListener('input', () => {
            if (inp.value.length > 7) {
              inp.value = s.virou;
              sab.textContent = '⚠️ AUTOCORRETOR TRAIDOR SABOTOU SUA MENSAGEM!';
            }
          });
          document.getElementById('auto-send').addEventListener('click', () => {
            envios++;
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('discord');
            render();
          });
        }
        render();
      });
    }

    // 4. NÃO OLHA PRA PORTA (Cap. 3 - Sala de aula animada em Canvas 2D)
    if (id === 'nao_olha_porta') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let atencao = 72;
        let olhandoQuadro = true;
        let ceciliaVisivel = false;
        let gag = 'felps!';
        let seg = 15;
        let frame = 0;

        host.innerHTML = `
          <div class="mg-modal" style="max-width:680px;">
            <div class="mg-header"><h3>🚪 Não Olha Pra Porta!</h3><span id="nop-hud">⏱️ 15s · Atenção: 72%</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="nop-c" width="620" height="270" style="width:100%;border-radius:10px;border:1px solid #334155;"></canvas>
              <div class="mg-actions">
                <button class="mg-btn primary" id="nop-board">👀 Olhar Quadro</button>
                <button class="mg-btn" id="nop-door">🙄 Olhar Porta</button>
              </div>
            </div>
          </div>`;

        const c = document.getElementById('nop-c');
        const ctx = c.getContext('2d');
        const hud = document.getElementById('nop-hud');
        document.getElementById('nop-board').addEventListener('click', () => (olhandoQuadro = true));
        document.getElementById('nop-door').addEventListener('click', () => (olhandoQuadro = false));

        let raf = null;
        function draw() {
          raf = requestAnimationFrame(draw);
          frame++;
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(0, 0, 620, 270);
          // Quadro verde
          ctx.fillStyle = '#14532d';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 6;
          ctx.fillRect(30, 30, 320, 160);
          ctx.strokeRect(30, 30, 320, 160);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 16px monospace';
          ctx.fillText('CÁLCULO I: f(x) = x²', 60, 85);
          ctx.fillText('PRESTE ATENÇÃO!', 60, 125);

          // Porta e janelinha
          ctx.fillStyle = '#78350f';
          ctx.fillRect(430, 20, 140, 240);
          ctx.fillStyle = ceciliaVisivel ? '#7f3923' : '#1e293b';
          ctx.fillRect(465, 45, 70, 85);
          if (ceciliaVisivel) {
            ctx.fillStyle = '#f0c8b6';
            ctx.beginPath();
            ctx.arc(500, 95, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fb7185';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(gag, 455, 155);
          }

          // Foco visual
          ctx.strokeStyle = olhandoQuadro ? '#22c55e' : '#ef4444';
          ctx.lineWidth = 5;
          ctx.strokeRect(olhandoQuadro ? 22 : 422, 14, olhandoQuadro ? 336 : 156, 248);
        }
        raf = requestAnimationFrame(draw);

        const gags = ['🫶 "felps!"', '💌 Bilhete no vidro', '👀 Olhando fixo', '🤫 "psiu!"'];
        const int = setInterval(() => {
          seg--;
          ceciliaVisivel = Math.random() < 0.62;
          gag = gags[Math.floor(Math.random() * gags.length)];
          if (olhandoQuadro) atencao = Math.min(100, atencao + 5);
          else atencao = Math.max(0, atencao - (ceciliaVisivel ? 18 : 6));
          hud.textContent = `⏱️ ${seg}s · Atenção: ${atencao}%`;
          if (seg <= 0) {
            clearInterval(int);
            cancelAnimationFrame(raf);
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('nao_olha_pra_porta');
            fechar(host, id, atencao * 10, resolve);
          }
        }, 1000);
      });
    }

    // 5. TREINO NA ACADEMIA / TREINO EM DUPLA (Caps. 4 e 12 - Canvas Supino)
    if (id === 'treino_academia' || id === 'treino_dupla') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let reps = 0;
        const total = 6;
        let pos = 0;
        let dir = 1;
        let liftAnim = 0;
        let raf = null;

        host.innerHTML = `
          <div class="mg-modal" style="max-width:620px;">
            <div class="mg-header"><h3>🏋️ ${id === 'treino_dupla' ? 'Treino em Dupla (Eloiza)' : 'Treino na Academia'}</h3><span id="tr-hud">0/${total}</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="tr-c" width="560" height="250" style="width:100%;border-radius:10px;border:1px solid #334155;"></canvas>
              <div class="mg-actions"><button class="mg-btn primary" id="tr-lift">💪 Empurrar Barra na Zona Verde!</button></div>
            </div>
          </div>`;

        const c = document.getElementById('tr-c');
        const ctx = c.getContext('2d');
        const hud = document.getElementById('tr-hud');

        function draw() {
          raf = requestAnimationFrame(draw);
          pos += dir * 2.8;
          if (pos >= 100 || pos <= 0) dir *= -1;
          if (liftAnim > 0) liftAnim *= 0.88;

          ctx.fillStyle = id === 'treino_dupla' ? '#1a1026' : '#1b2232';
          ctx.fillRect(0, 0, 560, 250);
          // Espelho academia
          ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
          ctx.fillRect(60, 20, 440, 140);
          // Banco & Luis levantando barra
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(190, 180, 180, 24);
          const barY = 128 - liftAnim;
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(150, barY, 260, 10);
          ctx.fillStyle = '#111';
          ctx.fillRect(140, barY - 18, 18, 46);
          ctx.fillRect(402, barY - 18, 18, 46);
          ctx.fillStyle = '#ebc1a9';
          ctx.beginPath();
          ctx.arc(280, 162, 16, 0, Math.PI * 2);
          ctx.fill();

          if (id === 'treino_dupla') {
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText('🖤 Eloiza sincronizada + 🚩 discreta no canto', 140, 44);
          }

          // Medidor de ritmo
          ctx.fillStyle = '#090a10';
          ctx.fillRect(80, 215, 400, 18);
          ctx.fillStyle = 'rgba(16,185,129,0.5)';
          ctx.fillRect(80 + 400 * 0.35, 215, 400 * 0.3, 18);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(80 + 400 * (pos / 100) - 5, 212, 10, 24);
        }
        raf = requestAnimationFrame(draw);

        document.getElementById('tr-lift').addEventListener('click', () => {
          if (pos >= 35 && pos <= 65) {
            reps++;
            liftAnim = 42;
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
          } else if (root.LuiggiAudio) {
            root.LuiggiAudio.playSFX('bruh');
          }
          hud.textContent = `${reps}/${total}`;
          if (reps >= total) {
            cancelAnimationFrame(raf);
            if (id === 'treino_dupla' && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('parceiros_de_treino');
            fechar(host, id, 650, resolve);
          }
        });
      });
    }

    // 6. FUGA DAS NOTIFICAÇÕES (Cap. 4)
    if (id === 'fuga_notificacoes') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let arquivadas = 0;
        const msgs = ['oi sumido', 'vai treinar hj?', 'pq n responde?', 'tô passando aí', 'me respondeee', 'oi??'];
        host.innerHTML = `
          <div class="mg-modal" style="max-width:520px;">
            <div class="mg-header"><h3>🔕 Fuga das Notificações</h3><span id="not-hud">Arquivadas: 0/10</span></div>
            <div class="mg-body">
              <div class="phone-mockup">
                <div class="phone-notch">Gi Eta (Online)</div>
                <div id="not-arena" style="position:relative;height:250px;background:#0b141a;border-radius:10px;overflow:hidden;"></div>
              </div>
            </div>
          </div>`;
        const arena = document.getElementById('not-arena');
        const hud = document.getElementById('not-hud');
        const sp = setInterval(() => {
          const b = document.createElement('button');
          b.className = 'notif-bubble';
          b.textContent = `💬 Gi Eta: "${msgs[Math.floor(Math.random() * msgs.length)]}" ✕`;
          b.style.left = `${6 + Math.random() * 52}%`;
          b.style.top = `${10 + Math.random() * 75}%`;
          b.addEventListener('click', () => {
            b.remove();
            arquivadas++;
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
            hud.textContent = `Arquivadas: ${arquivadas}/10`;
            if (arquivadas >= 10) {
              clearInterval(sp);
              fechar(host, id, 550, resolve);
            }
          });
          arena.appendChild(b);
        }, 500);
      });
    }

    // 7. MEDIDOR DE DILEMA (Cap. 5 - Balança animada no Bec Bar)
    if (id === 'medidor_dilema') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let pos = 50;
        let seg = 14;
        let raf = null;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:620px;">
            <div class="mg-header"><h3>⚖️ Medidor de Dilema (Bec Bar)</h3><span id="dil-hud">⏱️ 14s</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="dil-c" width="560" height="220" style="width:100%;border-radius:10px;"></canvas>
              <div class="mg-actions">
                <button class="mg-btn" id="dil-l">⬅ Puxar Agatha</button>
                <button class="mg-btn" id="dil-r">Puxar Caliandra ➡</button>
              </div>
            </div>
          </div>`;
        const ctx = document.getElementById('dil-c').getContext('2d');
        const hud = document.getElementById('dil-hud');
        document.getElementById('dil-l').addEventListener('click', () => (pos = Math.max(5, pos - 14)));
        document.getElementById('dil-r').addEventListener('click', () => (pos = Math.min(95, pos + 14)));

        function draw() {
          raf = requestAnimationFrame(draw);
          const ang = ((pos - 50) / 50) * 0.45;
          ctx.fillStyle = '#190e24';
          ctx.fillRect(0, 0, 560, 220);
          ctx.save();
          ctx.translate(280, 130);
          ctx.rotate(ang);
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(-160, -6, 320, 12);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('💋 AGATHA', -195, -20);
          ctx.fillText('💥 CALIANDRA', 110, -20);
          ctx.restore();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(280, 132);
          ctx.lineTo(255, 195);
          ctx.lineTo(305, 195);
          ctx.fill();
          if (pos < 42) {
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FABRICIO, VOCÊ SABE O QUE FAZ!!', 280, 42);
            ctx.textAlign = 'left';
          }
        }
        raf = requestAnimationFrame(draw);

        const int = setInterval(() => {
          pos += (Math.random() - 0.54) * 18;
          pos = Math.max(5, Math.min(95, pos));
          if (pos < 42) {
            if (save) save.incrementarContador('voceSabeOQueFaz', 1);
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('voce_sabe');
          }
        }, 450);
        const t = setInterval(() => {
          seg--;
          hud.textContent = `⏱️ ${seg}s`;
          if (seg <= 0) {
            clearInterval(int);
            clearInterval(t);
            cancelAnimationFrame(raf);
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('equilibrista');
            fechar(host, id, 650, resolve);
          }
        }, 1000);
      });
    }

    // 8. CONVERSAS COM BARRA DE QUÍMICA (Caps. 5, 7, 8, 10 Garagem)
    if (id === 'conversa_luiza' || id === 'conversa_mensagem' || id === 'papo_fim_noite' || id === 'garagem_emily') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const configs = {
          conversa_luiza: {
            titulo: '🇩🇪 Conversa com a Luiza',
            perguntas: [
              { q: 'Escolha um assunto:', op: ['Falar de música', 'Falar de política', 'Perguntar da viagem pra Alemanha'], re: ['Silêncio...', 'Ela fala 20 min e você concorda.', 'Os olhos dela brilham! Alemanha!'] },
              { q: 'Ela mostrou fotos de viagem:', op: ['Elogiar as paisagens', 'Mostrar foto do Subaru', 'Perguntar da cerveja alemã'], re: ['+Química!', 'Ela riu por educação.', 'Mais 30 minutos de geografia!'] }
            ]
          },
          conversa_mensagem: {
            titulo: '💬 Conversa por Mensagem (Luiza)',
            perguntas: [
              { q: 'Ela mandou: "chegou bem? 🙂"', op: ['Responder em 0.2s (ansioso)', 'Esperar 2 minutos e mandar 🙂', 'Visualizar e responder só amanhã'], re: ['Ansioso demais kkk', 'Timing perfeito!', 'Frio demais!'] },
              { q: 'Ela perguntou o que vai fazer no fds:', op: ['"Bora almoçar no shopping?"', '"Bora num restaurante chique?"', '"Vou assar 47 cookies"'], re: ['Sempre o shopping!', 'Caro demais!', 'Ela achou fofo!'] }
            ]
          },
          papo_fim_noite: {
            titulo: '✨ Papo com a Ruiva Misteriosa',
            perguntas: [
              { q: 'As luzes da pista estão piscando:', op: ['Pagar uma bebida', 'Dançar junto no ritmo', 'Contar que o Fabricio sumiu'], re: ['Ela sorriu!', 'A química subiu muito!', 'Ela riu e chegou mais perto!'] }
            ]
          },
          garagem_emily: {
            titulo: '🔧 Garagem: Mods do Subaru',
            perguntas: [
              { q: 'Primeira mod do Subaru pro racha?', op: ['Turbo maior (+velocidade)', 'Rebaixar (+grip)', 'Escapamento direto (barulho!)'], re: ['Emily: "Aí sim, Tico!"', 'Emily: "Ficou baixo hein!"', 'Emily: "Só não acorda o bairro!"'] },
              { q: 'Opinião sobre o Civic branco dela?', op: ['"Muito bonito"', '"Subaru é melhor"', '"Esse neon é sério?"'], re: ['Emily: "Boa resposta!"', 'Emily: "Então prova no racha!"', 'Emily: "No racha você vai ver ele no retrovisor!"'] }
            ]
          }
        };
        const cfg = configs[id];
        let step = 0;
        let quimica = 50;

        function render() {
          if (step >= cfg.perguntas.length) {
            if (id === 'garagem_emily' && root.LuiggiDialogue) {
              root.LuiggiDialogue.mostrarSeloTelltale('Uau, uma escolha que importa. Mais ou menos.');
            }
            fechar(host, id, quimica * 10, resolve);
            return;
          }
          const cur = cfg.perguntas[step];
          host.innerHTML = `
            <div class="mg-modal" style="max-width:560px;">
              <div class="mg-header"><h3>${cfg.titulo}</h3><span>Química: ${quimica}%</span></div>
              <div class="mg-body">
                <div class="progress-bar"><div class="progress-fill" style="width:${quimica}%;background:#ec4899;"></div></div>
                <p style="margin-top:12px;"><strong>${cur.q}</strong></p>
                <div class="btn-col">
                  ${cur.op.map((o, i) => `<button class="mg-btn" data-qop="${i}">${o}</button>`).join('')}
                </div>
                <p id="q-re" style="margin-top:10px;color:#fbbf24;min-height:24px;"></p>
              </div>
            </div>`;
          host.querySelectorAll('[data-qop]').forEach((b) => {
            b.addEventListener('click', () => {
              const idx = Number(b.dataset.qop);
              quimica = Math.min(100, quimica + 20);
              if (id === 'garagem_emily' && save) {
                if (idx === 0) save.state.subaruMods.motorBoost = (save.state.subaruMods.motorBoost || 0) + 1;
                if (idx === 1) save.state.subaruMods.gripBoost = (save.state.subaruMods.gripBoost || 0) + 1;
                save.salvar();
              }
              document.getElementById('q-re').textContent = cur.re[idx];
              step++;
              setTimeout(render, 800);
            });
          });
        }
        render();
      });
    }

    // 9. SEGURANDO VELA (Cap. 6 - Canvas 2D rua noturna)
    if (id === 'segurando_vela') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let dist = 50;
        let seg = 14;
        let tocouVermelho = false;
        let raf = null;

        host.innerHTML = `
          <div class="mg-modal" style="max-width:640px;">
            <div class="mg-header"><h3>🕯️ Segurando Vela no Centro</h3><span id="vl-hud">⏱️ 14s</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="vl-c" width="580" height="220" style="width:100%;border-radius:10px;"></canvas>
              <div id="vl-fab" style="color:#fbbf24;min-height:22px;margin:6px 0;"></div>
              <div class="mg-actions">
                <button class="mg-btn" id="vl-near">⬆ Chegar Perto</button>
                <button class="mg-btn" id="vl-far">⬇ Dar Espaço</button>
                <button class="mg-btn primary" id="vl-joinha">👍 Fazer Joinha</button>
              </div>
            </div>
          </div>`;

        const ctx = document.getElementById('vl-c').getContext('2d');
        const fab = document.getElementById('vl-fab');
        document.getElementById('vl-near').addEventListener('click', () => (dist = Math.max(5, dist - 14)));
        document.getElementById('vl-far').addEventListener('click', () => (dist = Math.min(95, dist + 14)));
        document.getElementById('vl-joinha').addEventListener('click', () => (fab.textContent = 'Fabricio olhou e continuou confuso!'));

        function draw() {
          raf = requestAnimationFrame(draw);
          ctx.fillStyle = '#090d1b';
          ctx.fillRect(0, 0, 580, 220);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 150, 580, 70);
          // Poste amarelo
          ctx.fillStyle = 'rgba(250,204,21,0.18)';
          ctx.beginPath();
          ctx.arc(290, 90, 95, 0, Math.PI * 2);
          ctx.fill();
          // Casal na frente
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(430, 115, 22, 48);
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(460, 110, 22, 53);
          ctx.fillStyle = '#fff';
          ctx.font = '11px sans-serif';
          ctx.fillText('Agatha & Fabricio', 415, 102);

          // Luis atrás conforme distância
          const luisX = 400 - dist * 3.3;
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(luisX, 112, 22, 50);
          ctx.font = '24px sans-serif';
          ctx.fillText('🕯️', luisX - 2, 102);

          // Barra ideal
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(90, 188, 400, 14);
          ctx.fillStyle = 'rgba(16,185,129,0.5)';
          ctx.fillRect(90 + 400 * 0.35, 188, 400 * 0.33, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(90 + 400 * (dist / 100) - 4, 185, 8, 20);
        }
        raf = requestAnimationFrame(draw);

        const int = setInterval(() => {
          dist += (Math.random() - 0.5) * 16;
          dist = Math.max(5, Math.min(95, dist));
          if (dist < 35) tocouVermelho = true;
          if (Math.random() < 0.28) {
            if (save) save.incrementarContador('fabricioOlhouPraTras', 1);
            fab.textContent = '👀 Fabricio olhou pra trás sem saber o que fazer!';
          }
        }, 450);
        const t = setInterval(() => {
          seg--;
          document.getElementById('vl-hud').textContent = `⏱️ ${seg}s`;
          if (seg <= 0) {
            clearInterval(int);
            clearInterval(t);
            cancelAnimationFrame(raf);
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('segurando_vela');
              if (!tocouVermelho) root.LuiggiAchievements.desbloquear('distancia_respeitosa');
            }
            fechar(host, id, tocouVermelho ? 450 : 950, resolve);
          }
        }, 1000);
      });
    }

    // 10. PRAÇA DE ALIMENTAÇÃO (Cap. 7 - Canvas 2D equilibrando bandejas)
    if (id === 'praca_alimentacao') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let bal = 50;
        let derrubou = false;
        let dist = 0;
        let raf = null;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:620px;">
            <div class="mg-header"><h3>🍟 Praça de Alimentação</h3><span id="pr-hud">0% até a Luiza</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="pr-c" width="560" height="220" style="width:100%;border-radius:10px;"></canvas>
              <p id="pr-ev" style="min-height:22px;color:#fbbf24;"></p>
              <div class="mg-actions">
                <button class="mg-btn" id="pr-l">⬅ Inclinar Esq</button>
                <button class="mg-btn primary" id="pr-walk">🚶 Andar</button>
                <button class="mg-btn" id="pr-r">Inclinar Dir ➡</button>
              </div>
            </div>
          </div>`;
        const ctx = document.getElementById('pr-c').getContext('2d');
        const ev = document.getElementById('pr-ev');
        const hud = document.getElementById('pr-hud');

        function draw() {
          raf = requestAnimationFrame(draw);
          ctx.fillStyle = '#2d2438';
          ctx.fillRect(0, 0, 560, 220);
          ctx.fillStyle = '#475569';
          ctx.fillRect(0, 165, 560, 55);
          // Mesa da Luiza na direita
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(490, 120, 46, 46);
          ctx.fillStyle = '#fff';
          ctx.font = '12px sans-serif';
          ctx.fillText('Luiza', 498, 110);

          const lx = 45 + (dist / 100) * 410;
          ctx.save();
          ctx.translate(lx, 125);
          ctx.rotate(((bal - 50) / 50) * 0.45);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-26, -6, 52, 8);
          ctx.font = '18px sans-serif';
          ctx.fillText('🍔🍟', -22, -10);
          ctx.restore();

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(130, 190, 300, 14);
          ctx.fillStyle = 'rgba(16,185,129,0.5)';
          ctx.fillRect(130 + 60, 190, 180, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(130 + 300 * (bal / 100) - 4, 187, 8, 20);
        }
        raf = requestAnimationFrame(draw);

        document.getElementById('pr-l').addEventListener('click', () => (bal = Math.max(0, bal - 14)));
        document.getElementById('pr-r').addEventListener('click', () => (bal = Math.min(100, bal + 14)));
        document.getElementById('pr-walk').addEventListener('click', () => {
          dist += 15;
          bal += (Math.random() - 0.5) * 26;
          if (bal < 20 || bal > 80) {
            derrubou = true;
            ev.textContent = '💥 Quase caiu batata no piso molhado!';
          } else {
            ev.textContent = '⚠️ Desviou de criança correndo!';
          }
          hud.textContent = `${Math.min(100, dist)}% até a mesa`;
          if (dist >= 100) {
            cancelAnimationFrame(raf);
            if (!derrubou && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('garcom_shopping');
            fechar(host, id, derrubou ? 350 : 850, resolve);
          }
        });
      });
    }

    // 11. GRITO NO BAR (Cap. 8 - Sad Baile neon Canvas)
    if (id === 'grito_no_bar') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let round = 0;
        let pausa = false;
        let raf = null;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:580px;">
            <div class="mg-header"><h3>🍹 Grito no Bar (Sad Baile)</h3><span id="gb-hud">0/3 pedidos</span></div>
            <div class="mg-body" style="text-align:center;">
              <canvas id="gb-c" width="520" height="200" style="width:100%;border-radius:10px;"></canvas>
              <p id="gb-barman" style="min-height:24px;color:#c084fc;margin:8px 0;">Espere a pausa na batida para gritar!</p>
              <div class="mg-actions"><button class="mg-btn primary" id="gb-shout">🗣️ GRITAR PEDIDO!</button></div>
            </div>
          </div>`;
        const ctx = document.getElementById('gb-c').getContext('2d');
        const barman = document.getElementById('gb-barman');
        let pulse = 0;

        function draw() {
          raf = requestAnimationFrame(draw);
          pulse += 0.15;
          ctx.fillStyle = '#110f24';
          ctx.fillRect(0, 0, 520, 200);
          ctx.strokeStyle = pausa ? '#34d399' : '#a855f7';
          ctx.lineWidth = 4;
          ctx.strokeRect(18, 18, 120, 52);
          ctx.fillStyle = pausa ? '#34d399' : '#c084fc';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText('SAD 💧', 30, 54);
          // Caixas de som pulsando
          const r = pausa ? 22 : 22 + Math.abs(Math.sin(pulse)) * 12;
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(390, 40, 90, 120);
          ctx.strokeStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(435, 100, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(pausa ? '🤫 PAUSA! GRITE AGORA!' : '🔊 SOM ESTOURADO!', 160, 120);
        }
        raf = requestAnimationFrame(draw);

        const int = setInterval(() => (pausa = !pausa), 900);
        document.getElementById('gb-shout').addEventListener('click', () => {
          if (pausa) {
            round++;
            barman.textContent = round >= 3 ? 'Barman: "AEE, AGORA OUVI!"' : 'Barman: "DOIS... SUCOS DE LUZ?!"';
            document.getElementById('gb-hud').textContent = `${round}/3 pedidos`;
            if (round >= 3) {
              clearInterval(int);
              cancelAnimationFrame(raf);
              if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('grito_no_bar');
              setTimeout(() => fechar(host, id, 550, resolve), 650);
            }
          } else {
            barman.textContent = 'Barman: "QUÊ?! NÃO DÁ PRA OUVIR NADA!"';
          }
        });
      });
    }

    // 12. NAME DROP DA PIETRA (Cap. 8)
    if (id === 'namedrop_pietra') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const lista = root.LuiggiData?.cache?.namedrops?.namedrops || [];
        let idx = 0;
        let pts = 0;
        function render() {
          if (idx >= lista.length) {
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('intimo_dos_famosos');
            fechar(host, id, pts, resolve);
            return;
          }
          const n = lista[idx];
          host.innerHTML = `
            <div class="mg-modal" style="max-width:540px;">
              <div class="mg-header"><h3>⭐ Name Drop da Pietra</h3><span>Intimidade Forçada: ${(idx + 1) * 33}%</span></div>
              <div class="mg-body">
                <p><strong>Pietra:</strong> "${n.falaPietra}"</p>
                <p>Quem é <strong>"${n.chamavaDe}"</strong>?</p>
                <div class="btn-col">
                  ${n.opcoes.map((o, i) => `<button class="mg-btn" data-nd="${i}">${o}</button>`).join('')}
                </div>
              </div>
            </div>`;
          host.querySelectorAll('[data-nd]').forEach((b) => {
            b.addEventListener('click', () => {
              if (idx === 0 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('quem_e_guilherme');
              pts += 150;
              if (root.LuiggiDialogue && n.reacaoDiscord) root.LuiggiDialogue.postDiscord('fabricio', n.reacaoDiscord);
              idx++;
              render();
            });
          });
        }
        render();
      });
    }

    // 13. ONDE ESTÁ A RUIVA? (Cap. 8 - Pista lotada com estrobo em Canvas 2D)
    if (id === 'onde_esta_ruiva') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const crowd = [
          { nome: 'Rebeca (cacheada pink)', x: 110, y: 120, hair: '#b93d22', top: '#db2777', alvo: false, dica: 'Fabricio: "Essa é a Rebeca, CORRE!"' },
          { nome: 'Julie (gótica)', x: 240, y: 200, hair: '#8f251b', top: '#111114', alvo: false, dica: 'Fabricio: "Não, essa é a Julie!"' },
          { nome: 'Pietra (mechas roxas)', x: 370, y: 110, hair: '#9333ea', top: '#1f2937', alvo: false, dica: 'Fabricio: "Essa é a Pietra falando do Guilherme!"' },
          { nome: 'Ruiva Misteriosa', x: 470, y: 195, hair: '#d04d24', top: '#0f766e', alvo: true, dica: 'Fabricio: "É ESSA AÍ!!"' },
          { nome: 'Figurante Ruiva #1', x: 170, y: 230, hair: '#ea580c', top: '#334155', alvo: false, dica: 'Fabricio: "Altura errada!"' },
          { nome: 'Figurante Ruiva #2', x: 520, y: 95, hair: '#c2410c', top: '#4c1d95', alvo: false, dica: 'Fabricio: "Essa tá de costas!"' }
        ];
        let raf = null;
        let frame = 0;

        host.innerHTML = `
          <div class="mg-modal" style="max-width:640px;">
            <div class="mg-header"><h3>🔍 Onde Está a Ruiva Misteriosa?</h3></div>
            <div class="mg-body" style="text-align:center;">
              <p style="font-size:0.84rem;">Clique na pista estroboscópica para achar a <strong>Ruiva Misteriosa</strong> (blusa verde-esmeralda, altura média)!</p>
              <canvas id="wl-c" width="580" height="280" style="width:100%;border-radius:10px;cursor:crosshair;"></canvas>
              <p id="w-msg" style="color:#fbbf24;min-height:22px;margin-top:6px;"></p>
            </div>
          </div>`;

        const c = document.getElementById('wl-c');
        const ctx = c.getContext('2d');
        const msg = document.getElementById('w-msg');

        function draw() {
          raf = requestAnimationFrame(draw);
          frame++;
          ctx.fillStyle = frame % 28 < 14 ? '#120f26' : '#1b1236';
          ctx.fillRect(0, 0, 580, 280);
          for (const p of crowd) {
            const bob = Math.sin(frame * 0.1 + p.x) * 3;
            ctx.fillStyle = p.hair;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 16 + bob, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f3cbb9';
            ctx.beginPath();
            ctx.arc(p.x, p.y - 14 + bob, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = p.top;
            ctx.fillRect(p.x - 13, p.y - 2 + bob, 26, 30);
          }
        }
        raf = requestAnimationFrame(draw);

        c.addEventListener('click', (e) => {
          const r = c.getBoundingClientRect();
          const mx = ((e.clientX - r.left) / r.width) * 580;
          const my = ((e.clientY - r.top) / r.height) * 280;
          for (const p of crowd) {
            if (Math.hypot(mx - p.x, my - p.y) < 30) {
              msg.textContent = p.dica;
              if (save) save.incrementarContador('ruivasEncontradas', 1);
              if (p.alvo) {
                cancelAnimationFrame(raf);
                if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('onde_esta_a_ruiva');
                setTimeout(() => fechar(host, id, 650, resolve), 650);
              }
              break;
            }
          }
        });
      });
    }

    // 14. LATTE ART (Caps. 9 e 10 - Xícara + leite com guia)
    if (id === 'latte_art' || id === 'latte_art_rayssa') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let desenhou = 0;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:480px;">
            <div class="mg-header"><h3>☕ ${id === 'latte_art_rayssa' ? 'Latte Art da Rayssa' : 'Latte Art no TNT'}</h3></div>
            <div class="mg-body" style="text-align:center;">
              <p>Desenhe o coração de leite dentro da xícara de espresso!</p>
              <canvas id="latte-c" width="240" height="240" style="background:radial-gradient(#7c4a26,#452712);border-radius:50%;border:10px solid #f1f5f9;box-shadow:0 0 0 14px #cbd5e1;cursor:crosshair;margin:10px auto;"></canvas>
              <div class="mg-actions"><button class="mg-btn primary" id="latte-ok">✓ Servir Café</button></div>
            </div>
          </div>`;
        const c = document.getElementById('latte-c');
        const cx = c.getContext('2d');
        cx.strokeStyle = 'rgba(255,255,255,0.2)';
        cx.setLineDash([4, 4]);
        cx.beginPath();
        cx.arc(120, 115, 50, 0, Math.PI * 2);
        cx.stroke();
        cx.setLineDash([]);
        cx.fillStyle = '#f8fafc';
        c.addEventListener('pointermove', (e) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return;
          const r = c.getBoundingClientRect();
          cx.beginPath();
          cx.arc(e.clientX - r.left, e.clientY - r.top, 9, 0, Math.PI * 2);
          cx.fill();
          desenhou++;
        });
        document.getElementById('latte-ok').addEventListener('click', () => {
          if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('barista_amador');
          fechar(host, id, Math.min(1000, desenhou * 12), resolve);
        });
      });
    }

    // 15. DETECTOR DE RED FLAGS (Cap. 9)
    if (id === 'detector_red_flags') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const falas = [
          'Fui pra França e baixei Tinder só pra pagarem jantar pra mim!',
          'Adoro quando o date paga tudo sem perguntar.',
          'Não respondo mensagem quando tô na praia com meu ex.'
        ];
        let clicks = 0;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:560px;">
            <div class="mg-header"><h3>🚩 Detector de Red Flags</h3><span id="rf-hud">Flags: 0/6</span></div>
            <div class="mg-body" style="text-align:center;">
              <p id="rf-quote" style="font-style:italic;color:#fca5a5;">"${falas[0]}"</p>
              <div id="rf-pad" style="height:200px;position:relative;background:radial-gradient(#2c1118,#0b0c14);border-radius:10px;border:1px solid #7f1d1d;"></div>
            </div>
          </div>`;
        const pad = document.getElementById('rf-pad');
        const sp = setInterval(() => {
          const f = document.createElement('button');
          f.className = 'rf-btn';
          f.textContent = '🚩 RED FLAG!';
          f.style.left = `${10 + Math.random() * 65}%`;
          f.style.top = `${15 + Math.random() * 65}%`;
          f.addEventListener('click', () => {
            f.remove();
            clicks++;
            if (save) save.incrementarContador('redFlags', 1);
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
            document.getElementById('rf-hud').textContent = `Flags: ${clicks}/6`;
            document.getElementById('rf-quote').textContent = `"${falas[clicks % falas.length]}"`;
            if (clicks >= 6) {
              clearInterval(sp);
              fechar(host, id, 600, resolve);
            }
          });
          pad.appendChild(f);
        }, 620);
      });
    }

    // 16. CRÉDITOS INFINITOS (Cap. 9)
    if (id === 'creditos_infinitos') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const creds = root.LuiggiData?.cache?.dialogos?.creditos || ['Músicas por LuiggiBeats'];
        let fugas = 0;
        let seg = 11;
        host.innerHTML = `
          <div class="mg-modal" style="max-width:560px;background:#050507;border-color:#991b1b;">
            <div class="mg-header"><h3>🎞️ Cinema: Créditos de "Nora"</h3><span id="cr-hud">Clique nos nomes pra ganhar cookies! (${seg}s)</span></div>
            <div class="mg-body" style="text-align:center;">
              <div class="credits-roll" id="cr-roll">
                ${creds.map((c) => `<div class="cr-line">${c}</div>`).join('')}
              </div>
              <button class="mini-btn" id="cr-skip" style="margin-top:10px;position:relative;">Pular Créditos</button>
            </div>
          </div>`;
        const skip = document.getElementById('cr-skip');
        const fugir = () => {
          fugas++;
          skip.style.transform = `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 60}px)`;
          if (fugas >= 15 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('botao_fujao');
        };
        skip.addEventListener('mouseenter', fugir);
        skip.addEventListener('click', fugir);
        host.querySelectorAll('.cr-line').forEach((l) => {
          l.addEventListener('click', () => {
            if (!l.dataset.got) {
              l.dataset.got = '1';
              l.style.color = '#fbbf24';
              if (save) save.incrementarContador('cookiesAssados', 1);
            }
          });
        });
        const int = setInterval(() => {
          seg--;
          const h = document.getElementById('cr-hud');
          if (h) h.textContent = seg > 0 ? `Yohana: "Cala a boca, vai ter pós-créditos!" (${seg}s)` : '... Não tinha cena pós-créditos.';
          if (seg <= 0) {
            clearInterval(int);
            setTimeout(() => fechar(host, id, 400, resolve), 1200);
          }
        }, 1000);
      });
    }

    // 17. BEIJO NO DRIFT (Cap. 11 - Para-brisa do sonho em Canvas 2D)
    if (id === 'beijo_no_drift') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        let medidor = 45;
        let tecs = 0;
        let combo = 0;
        let rodadas = 7;
        let ladoDrift = 'ESQUERDA';
        let frame = 0;
        let raf = null;

        function prox() {
          if (rodadas <= 0) {
            cancelAnimationFrame(raf);
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('drift_romantico');
              if (tecs === 0) root.LuiggiAchievements.desbloquear('sem_bater_dente');
              if (combo >= 5) root.LuiggiAchievements.desbloquear('trabalho_em_equipe');
            }
            fechar(host, id, medidor * 10, resolve);
            return;
          }
          ladoDrift = Math.random() < 0.5 ? 'ESQUERDA' : 'DIREITA';
          const ev =
            rodadas === 4
              ? '🦫 CAPIVARA VOADORA NA JANELA!'
              : rodadas === 2
              ? '📸 FLASH DO RADAR — FAÇA POSE!'
              : `🚨 Fabricio: "${ladoDrift}!"`;
          host.innerHTML = `
            <div class="mg-modal dream-theme" style="max-width:620px;">
              <div class="mg-header"><h3>💋 Beijo no Drift (Sonho)</h3><span>Restam: ${rodadas} · Combo: ${combo}</span></div>
              <div class="mg-body" style="text-align:center;">
                <canvas id="dr-c" width="560" height="200" style="width:100%;border-radius:10px;"></canvas>
                <div style="font-size:1.1rem;font-weight:700;margin:8px 0;">${ev}</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${medidor}%;background:#ec4899;"></div></div>
                <div class="mg-actions" style="margin-top:12px;">
                  <button class="mg-btn" id="dr-l">⬅ Compensar Esquerda</button>
                  <button class="mg-btn" id="dr-r">Compensar Direita ➡</button>
                </div>
              </div>
            </div>`;

          const ctx = document.getElementById('dr-c').getContext('2d');
          function draw() {
            raf = requestAnimationFrame(draw);
            frame++;
            const g = ctx.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, '#f472b6');
            g.addColorStop(0.55, '#7e22ce');
            g.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 560, 200);
            // Estrada curva de sonho
            const bend = ladoDrift === 'ESQUERDA' ? -60 : 60;
            ctx.fillStyle = '#312e81';
            ctx.beginPath();
            ctx.moveTo(240 + bend, 110);
            ctx.lineTo(320 + bend, 110);
            ctx.lineTo(480, 200);
            ctx.lineTo(80, 200);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '14px sans-serif';
            ctx.fillText('🖍️ CNH: CONFIA', 20, 30);
            ctx.fillText('💖 Beijo Alinhado', 410, 30);
          }
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(draw);

          const responder = (dir) => {
            const correto = (ladoDrift === 'ESQUERDA' && dir === 'DIREITA') || (ladoDrift === 'DIREITA' && dir === 'ESQUERDA');
            if (correto) {
              combo++;
              medidor = Math.min(100, medidor + 12);
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('forno');
            } else {
              combo = 0;
              tecs++;
              medidor = Math.max(0, medidor - 10);
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
            }
            rodadas--;
            prox();
          };
          document.getElementById('dr-l').addEventListener('click', () => responder('ESQUERDA'));
          document.getElementById('dr-r').addEventListener('click', () => responder('DIREITA'));
        }
        prox();
      });
    }

    // 18. DETETIVE DO INSTAGRAM (Cap. 12)
    if (id === 'detetive_instagram') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const achadas = new Set();
        const provas = [
          { id: 'p1', txt: '⭐ Melhores Amigos com cadeado (Luis removido)' },
          { id: 'p2', txt: '🔥 Segue todos os caras que vieram do Tinder' },
          { id: 'p3', txt: '💬 Resposta de story: "onde você tá?" pro cara do Tinder' },
          { id: 'p4', txt: '❤️ 99+ curtidas masculinas recentes' }
        ];
        host.innerHTML = `
          <div class="mg-modal" style="max-width:520px;background:#140c1c;">
            <div class="mg-header"><h3>🕵️ Detetive do InstaGram (Paródia)</h3><span id="ig-hud">Provas: 0/4</span></div>
            <div class="mg-body">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:52px;height:52px;border-radius:50%;border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🦇</div>
                <div><strong>@eloiza_dark</strong><br/><small style="color:#9ca3af;">Close Friends 🔒 · 99+ solicitações</small></div>
              </div>
              <div class="btn-col">
                ${provas.map((p) => `<button class="mg-btn" data-ig="${p.id}">${p.txt}</button>`).join('')}
              </div>
            </div>
          </div>`;
        host.querySelectorAll('[data-ig]').forEach((b) => {
          b.addEventListener('click', () => {
            achadas.add(b.dataset.ig);
            b.disabled = true;
            b.textContent = '🚩 ' + b.textContent;
            if (save) save.incrementarContador('redFlags', 10);
            document.getElementById('ig-hud').textContent = `Provas: ${achadas.size}/4`;
            if (achadas.size >= 4) {
              if (root.LuiggiAchievements) {
                root.LuiggiAchievements.desbloquear('detetive_instagram');
                root.LuiggiAchievements.desbloquear('detector_quebrado');
              }
              setTimeout(() => fechar(host, id, 800, resolve), 650);
            }
          });
        });
      });
    }

    // 19. LEMBRA QUANDO? (Cap. 14)
    if (id === 'lembra_quando') {
      return new Promise((resolve) => {
        host.classList.remove('hidden');
        const qs = [
          { q: 'Tutuluiza: "Lembra quando o Tiago mostrou a primeira música dele?"', op: ['Eu elogiei!', 'Eu disse: "Por que você fez isso?"', 'Eu fingi que dormi'] },
          { q: 'Tutuluiza: "Lembra da Cecília gritando pela sala?"', op: ['FELPS!!', 'LUIS!!', 'TICO!!'] },
          { q: 'Tutuluiza: "Lembra do Vitor tentando puxar papo?"', op: ['Ele arrasou', 'Foi o pior roteiro da história', 'Ele cantou rap'] }
        ];
        let i = 0;
        function render() {
          if (i >= qs.length) {
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('lembra_quando');
            fechar(host, id, 500, resolve);
            return;
          }
          host.innerHTML = `
            <div class="mg-modal" style="max-width:520px;">
              <div class="mg-header"><h3>🎬 Lembra Quando? (Yard)</h3><span>${i + 1}/${qs.length}</span></div>
              <div class="mg-body">
                <p><strong>${qs[i].q}</strong></p>
                <div class="btn-col">
                  ${qs[i].op.map((o) => `<button class="mg-btn" data-lq="1">${o}</button>`).join('')}
                </div>
              </div>
            </div>`;
          host.querySelectorAll('[data-lq]').forEach((b) => {
            b.addEventListener('click', () => {
              i++;
              render();
            });
          });
        }
        render();
      });
    }

    return Promise.resolve({ pontos: 100 });
  }

  root.LuiggiQuickMinigames = { abrir };
})(window);
