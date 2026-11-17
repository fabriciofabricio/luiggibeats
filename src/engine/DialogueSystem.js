/**
 * src/engine/DialogueSystem.js
 * Motor de Diálogo estilo Dating Simulator / Visual Novel + 3 Escolhas + 7 Convergências + Discord + Relatório.
 */
(function (root) {
  'use strict';

  let activePortraitAnim = null;
  let keyHandler = null;
  let ticoFlip = 0;
  let sceneCast = { left: 'luis', right: null };

  function el(id) {
    return document.getElementById(id);
  }

  function resetCast(leftId = 'luis', rightId = null) {
    sceneCast = { left: leftId, right: rightId };
    renderCast(null, 'neutro');
  }

  function applyCameraShot(shot) {
    const frame = el('stage-frame') || document.querySelector('.stage-frame');
    if (!frame) return;
    frame.classList.remove('cam-wide', 'cam-closeup', 'cam-dutch', 'cam-pan-left', 'cam-pan-right');
    if (shot) frame.classList.add(shot);
  }

  function renderCast(activeId, expr = 'neutro', shot = null) {
    const layer = el('vn-cast-layer');
    if (!layer || !root.LuiggiRig || !root.LuiggiData?.cache?.personagemMap) return;

    const map = root.LuiggiData.cache.personagemMap;
    const modoCab = !!root.LuiggiSave?.state?.config?.modoCabecao;

    // Palco 3D: o elenco vive dentro do cenário (exceto no Modo Cabeção, que usa a camada DOM)
    if (root.LuiggiStory3D?.ativo && !modoCab) {
      if (activeId && activeId !== 'narrador') {
        if (activeId === sceneCast.left || activeId === 'luis') sceneCast.left = activeId;
        else sceneCast.right = activeId;
      }
      layer.innerHTML = '';
      root.LuiggiStory3D.foco(sceneCast.left, sceneCast.right, activeId, expr, shot);
      return;
    }

    // Atualiza slots e ângulo de câmera dinamicamente!
    if (activeId && activeId !== 'narrador') {
      if (activeId === 'luis') {
        sceneCast.left = 'luis';
        applyCameraShot(shot || (expr === 'chocado' ? 'cam-dutch' : 'cam-pan-left'));
      } else {
        sceneCast.right = activeId;
        applyCameraShot(shot || (expr === 'chocado' || expr === 'bravo' ? 'cam-closeup' : 'cam-pan-right'));
      }
    } else {
      applyCameraShot(shot || 'cam-wide');
    }

    const leftChar = sceneCast.left ? map.get(sceneCast.left) : null;
    const rightChar = sceneCast.right ? map.get(sceneCast.right) : null;

    const leftHtml = leftChar
      ? `<div class="vn-slot vn-left">
           ${root.LuiggiRig.renderVisualNovelSprite(leftChar, {
        expressao: activeId === leftChar.id ? expr : 'neutro',
        speaking: activeId === leftChar.id,
        dim: activeId && activeId !== 'narrador' && activeId !== leftChar.id,
        modoCabecao: modoCab
      })}
         </div>`
      : '';

    const rightHtml = rightChar
      ? `<div class="vn-slot vn-right">
           ${root.LuiggiRig.renderVisualNovelSprite(rightChar, {
        expressao: activeId === rightChar.id ? expr : 'neutro',
        speaking: activeId === rightChar.id,
        dim: activeId && activeId !== 'narrador' && activeId !== rightChar.id,
        modoCabecao: modoCab
      })}
         </div>`
      : '';

    layer.innerHTML = leftHtml + rightHtml;
  }

    function postDiscord() {
      // Removido popup aleatório de mensagens flutuantes para manter a tela limpa.
    }

      function mostrarSeloTelltale() {
        // Removido banner flutuante aleatório durante o diálogo.
      }

      function tremorTela() {
        if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.tremor(0.12);
        const stage = el('game-shell');
        if (!stage) return;
        stage.classList.remove('shake');
        void stage.offsetWidth;
        stage.classList.add('shake');
        setTimeout(() => stage.classList.remove('shake'), 450);
      }

      function nomeExibido(quemId, capId) {
        if (quemId === 'narrador') return 'Narrador da Realidade';
        const p = root.LuiggiData?.cache?.personagemMap?.get(quemId);
        if (!p) return quemId;
        if (capId >= 10 && (quemId === 'luis' || quemId === 'fabricio')) {
          ticoFlip++;
          if (root.LuiggiSave && ticoFlip % 2 === 1) {
            root.LuiggiSave.incrementarContador('vezesTico', 1);
          }
          const pair = ticoFlip % 4 < 2 ? ['Tico', 'Teco'] : ['Lé', 'Cré'];
          return quemId === 'luis' ? `${pair[0]} (${p.nome.split(' ')[0]})` : `${pair[1]} (${p.nome.split(' ')[0]})`;
        }
        return p.nome;
      }

      function mostrarDialogo({ quem, expr = 'neutro', fala, capId = 0 }) {
        return new Promise((resolve) => {
          const box = el('dialogue-overlay');
          const portraitEl = el('dialogue-portrait');
          const nameEl = el('dialogue-name');
          const textEl = el('dialogue-text');
          const nextBtn = el('dialogue-next');
          if (!box) return resolve();

          renderCast(quem, expr);

          box.classList.remove('hidden');
          nameEl.textContent = nomeExibido(quem, capId);
          textEl.textContent = '';

          if (activePortraitAnim) {
            activePortraitAnim.destroy();
            activePortraitAnim = null;
          }
          portraitEl.innerHTML = '';

          const char = root.LuiggiData?.cache?.personagemMap?.get(quem);
          if (char && root.LuiggiRig) {
            activePortraitAnim = new root.LuiggiRig.RigAnimator(portraitEl, char, {
              expressao: expr,
              animacao: 'talk',
              scale: 'portrait',
              modoCabecao: !!root.LuiggiSave?.state?.config?.modoCabecao
            });
          } else {
            portraitEl.innerHTML = `<div class="narrator-orb">👁️</div>`;
          }

          if (expr === 'chocado' || expr === 'bravo') tremorTela();

          const speed = root.LuiggiSave?.state?.config?.velocidadeTexto ?? 24;
          let i = 0;
          let finished = false;
          const timer = setInterval(() => {
            if (i >= fala.length) {
              clearInterval(timer);
              finished = true;
              if (activePortraitAnim) activePortraitAnim.setOptions({ animacao: 'idle' });
              return;
            }
            textEl.textContent += fala[i++];
            if (i % 3 === 0 && root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
            if (activePortraitAnim) activePortraitAnim.pulseTalk();
          }, Math.max(8, speed));

          function finishOrAdvance() {
            if (!finished) {
              clearInterval(timer);
              textEl.textContent = fala;
              finished = true;
              if (activePortraitAnim) activePortraitAnim.setOptions({ animacao: 'idle' });
              return;
            }
            cleanup();
            box.classList.add('hidden');
            resolve();
          }

          function onKey(e) {
            if (e.code === 'Space' || e.code === 'Enter') {
              e.preventDefault();
              finishOrAdvance();
            }
          }

          function cleanup() {
            clearInterval(timer);
            nextBtn.removeEventListener('click', finishOrAdvance);
            window.removeEventListener('keydown', onKey);
            if (activePortraitAnim) {
              activePortraitAnim.destroy();
              activePortraitAnim = null;
            }
          }

          nextBtn.addEventListener('click', finishOrAdvance);
          window.addEventListener('keydown', onKey);
        });
      }

      function executarConvergencia(tipo, eventoReal) {
        return new Promise((resolve) => {
          const fx = el('convergence-overlay');
          const fxInner = el('convergence-content');
          if (!fx || !fxInner) return resolve();

          fx.className = 'convergence-overlay show fx-' + tipo;
          if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.efeito(tipo, 2.4);

          if (tipo === 'vhs') {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('vhs');
            fxInner.innerHTML = `<div class="fx-tag">◀◀ REBOBINANDO FITA VHS...</div><div class="fx-real">${eventoReal}</div>`;
          } else if (tipo === 'vinyl') {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('vinyl');
            fxInner.innerHTML = `<div class="fx-stamp">MAS NA VIDA REAL...</div><div class="fx-real">${eventoReal}</div>`;
          } else if (tipo === 'discord') {
            postDiscord('fabricio', 'mano, não foi isso que aconteceu kkkk');
            fxInner.innerHTML = `<div class="fx-tag">💬 INTERVENÇÃO DO DISCORD</div><div class="fx-real">${eventoReal}</div>`;
          } else if (tipo === 'glitch') {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
            fxInner.innerHTML = `<div class="fx-glitch">REALIDADE RESTAURADA</div><div class="fx-real">${eventoReal}</div>`;
          } else if (tipo === 'strikethrough') {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('vinyl');
            fxInner.innerHTML = `<div class="fx-strike">Sua escolha foi riscada à caneta</div><div class="fx-real">${eventoReal}</div>`;
          } else {
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('voce_sabe');
            fxInner.innerHTML = `<div class="fx-tag">O NARRADOR DA REALIDADE:</div><div class="fx-sub">"Você realmente achou que ia funcionar?"</div><div class="fx-real">${eventoReal}</div>`;
          }

          setTimeout(() => {
            fx.className = 'convergence-overlay hidden';
            resolve();
          }, 2400);
        });
      }

      function mostrarEscolha(escolhaId, capId) {
        return new Promise(async (resolve) => {
          const escolha = root.LuiggiData?.cache?.escolhas?.escolhas?.[escolhaId];
          if (!escolha) return resolve(null);

          const ov = el('choice-overlay');
          const qEl = el('choice-question');
          const cardsEl = el('choice-cards');
          const timerFill = el('choice-timer-fill');
          const timerWrap = el('choice-timer-wrap');
          if (!ov) return resolve(null);

          const vistas = root.LuiggiSave?.state?.escolhasVistas?.[escolhaId] || [];
          qEl.textContent = escolha.pergunta;
          cardsEl.innerHTML = '';
          ov.classList.remove('hidden');

          const useTimer = !escolha.semTimer && root.LuiggiSave?.state?.config?.timerEscolhas !== false;
          timerWrap.style.display = useTimer ? 'block' : 'none';

          let chosen = false;
          let timerInt = null;
          let timeLeft = 100;

          if (useTimer) {
            timerFill.style.width = '100%';
            timerInt = setInterval(() => {
              timeLeft -= 1.25;
              timerFill.style.width = `${Math.max(0, timeLeft)}%`;
              if (timeLeft <= 0 && !chosen) {
                selecionar(0);
              }
            }, 100);
          }

          function cleanup() {
            clearInterval(timerInt);
            if (keyHandler) window.removeEventListener('keydown', keyHandler);
            keyHandler = null;
          }

          async function selecionar(idx) {
            if (chosen) return;
            chosen = true;
            cleanup();
            ov.classList.add('hidden');

            if (escolha.convergencia === 'final_real') {
              const opt = escolha.opcoes[idx];
              if (root.LuiggiSave) {
                root.LuiggiSave.state.finalEscolhido = opt.finalId;
                root.LuiggiSave.salvar();
              }
              resolve(opt);
              return;
            }

            const opt = escolha.opcoes[idx];
            if (root.LuiggiSave) {
              root.LuiggiSave.registrarEscolha(escolhaId, idx);
              if (opt.tag === 'sensato') root.LuiggiSave.incrementarContador('contraDestino', 1);
            }
            if (root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear('iludido');
              root.LuiggiAchievements.verificarEscolhas(escolhaId, capId);
            }
            if (escolha.conquista && root.LuiggiAchievements) {
              root.LuiggiAchievements.desbloquear(escolha.conquista);
            }

            if (opt.efeito === 'bsod_fake') {
              await mostrarTelaAzulFake();
            }

            for (const linha of opt.miniCena || []) {
              await mostrarDialogo({ quem: linha.quem, expr: linha.expr || 'neutro', fala: linha.fala, capId });
            }

            await executarConvergencia(escolha.convergencia, escolha.eventoReal);

            resolve(opt);
          }

          escolha.opcoes.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-card';
            if (opt.estiloBotao === 'gigante_pulsando') btn.classList.add('choice-giant');
            if (opt.estiloBotao === 'fujão') btn.classList.add('choice-flee');
            if (opt.estiloBotao === 'piscando') btn.classList.add('choice-blink');

            const vistoBadge = vistas.includes(idx) ? `<span class="seen-badge">✓ visto</span>` : '';
            btn.innerHTML = `<span class="choice-num">${idx + 1}</span> <span class="choice-txt">${opt.texto}</span> ${vistoBadge}`;

            if (escolha.convergencia === 'forced') {
              const forcar = () => {
                cardsEl.querySelectorAll('.choice-txt').forEach((t) => (t.textContent = escolha.textoForcado));
              };
              btn.addEventListener('mouseenter', forcar);
              btn.addEventListener('touchstart', forcar, { passive: true });
            }

            if (opt.estiloBotao === 'fujão') {
              let fugas = 0;
              btn.addEventListener('mouseenter', () => {
                if (fugas < 5) {
                  fugas++;
                  btn.style.transform = `translate(${(Math.random() - 0.5) * 180}px, ${(Math.random() - 0.5) * 90}px)`;
                  if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
                }
              });
            }

            btn.addEventListener('click', () => selecionar(idx));
            cardsEl.appendChild(btn);
          });

          keyHandler = (e) => {
            if (e.key === '1') selecionar(0);
            if (e.key === '2') selecionar(1);
            if (e.key === '3') selecionar(2);
          };
          window.addEventListener('keydown', keyHandler);
        });
      }

      function mostrarTelaAzulFake() {
        return new Promise((resolve) => {
          const ov = el('bsod-overlay');
          if (!ov) return resolve();
          ov.classList.remove('hidden');
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
          setTimeout(() => {
            ov.classList.add('hidden');
            resolve();
          }, 2100);
        });
      }

      function mostrarTelaPreta(texto) {
        return new Promise((resolve) => {
          const ov = el('blackout-overlay');
          const txt = el('blackout-text');
          if (!ov || !txt) return resolve();
          txt.textContent = '';
          ov.classList.remove('hidden');
          let i = 0;
          const t = setInterval(() => {
            if (i >= texto.length) {
              clearInterval(t);
              setTimeout(() => {
                ov.classList.add('hidden');
                resolve();
              }, 1800);
              return;
            }
            txt.textContent += texto[i++];
          }, 36);
        });
      }

      function mostrarRelatorioRealidade(capId, cliffhangerTexto) {
        return new Promise((resolve) => {
          const ov = el('report-overlay');
          const body = el('report-body');
          const btn = el('report-continue');
          if (!ov || !body) return resolve();

          const escolhasMap = root.LuiggiData?.cache?.escolhas?.escolhas || {};
          const doCap = Object.values(escolhasMap).filter((e) => e.capitulo === capId);
          const vistasMap = root.LuiggiSave?.state?.escolhasVistas || {};
          const totalCenas = doCap.length * 3;
          const cenasVistas = doCap.reduce((acc, e) => acc + (vistasMap[e.id]?.length || 0), 0);

          let extraHtml = '';
          if (capId === 11) {
            extraHtml = `<p class="report-note">Este capítulo nem aconteceu. (Graças a Deus.)</p>`;
          } else if (capId === 14) {
            extraHtml = `
          <p class="report-note">Missões cumpridas: <strong>1</strong> · Plot twists previstos pelo Fabricio: <strong>0</strong></p>
          <div class="critica-box">🎬 Crítica da Tutuluiza: <strong>"Operação Ponto Cego (20XX). ★★★★☆. Ótimo suspense, final constrangedor."</strong></div>
        `;
          }

          body.innerHTML = `
        <div class="report-stat"><span>Escolhas feitas neste capítulo:</span> <strong>${doCap.length}</strong></div>
        <div class="report-stat highlight"><span>Escolhas que mudaram o destino:</span> <strong id="zero-anim">99</strong></div>
        <div class="report-stat"><span>Universos paralelos vistos:</span> <strong>${cenasVistas} de ${totalCenas || 3}</strong></div>
        ${extraHtml}
        <p class="report-fake">📊 <em>87% dos jogadores escolheram a mesma coisa. Nenhum deles mudou nada também.</em></p>
        <div class="cliffhanger-card">
          <div class="cliff-kicker">NO PRÓXIMO CAPÍTULO...</div>
          <div class="cliff-text">${cliffhangerTexto}</div>
        </div>
      `;

          ov.classList.remove('hidden');
          const zeroEl = document.getElementById('zero-anim');
          let num = 14;
          const anim = setInterval(() => {
            num = Math.max(0, num - 2);
            if (zeroEl) zeroEl.textContent = num === 0 ? '0' : String(num);
            if (num === 0) clearInterval(anim);
          }, 65);

          const go = () => {
            btn.removeEventListener('click', go);
            ov.classList.add('hidden');
            resolve();
          };
          btn.addEventListener('click', go);
        });
      }

      root.LuiggiDialogue = {
        resetCast,
        renderCast,
        postDiscord,
        mostrarSeloTelltale,
        tremorTela,
        mostrarDialogo,
        executarConvergencia,
        mostrarEscolha,
        mostrarTelaPreta,
        mostrarRelatorioRealidade
      };
    }) (window);
