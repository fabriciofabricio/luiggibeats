/**
 * src/minigames/MinigameKit.js
 * Moldura padrão de todos os minigames 3D: janela, palco 3D, HUD, medidores, mensagens,
 * textos flutuantes, tela de instruções com contagem regressiva e tela de resultado (estrelas + recorde).
 * Também cuida da limpeza (intervalos, timeouts, listeners, WebGL) ao terminar.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function abrir(cfg) {
    const host = document.getElementById('minigame-overlay');
    host.classList.remove('hidden');
    host.classList.add('mgk-host');
    const capLbl = cfg.capitulo === undefined ? '' : cfg.capitulo === 0 ? 'Prólogo' : `Cap. ${cfg.capitulo}`;
    host.innerHTML = `
      <div class="mgk-modal" style="--accent:${cfg.cor || '#f59e0b'}">
        <div class="mgk-header">
          <div class="mgk-title">
            <span class="mgk-icon">${cfg.icone || '🎮'}</span>
            <div><h3>${esc(cfg.titulo)}</h3><small>${esc(capLbl)}${cfg.subtitulo ? ' · ' + esc(cfg.subtitulo) : ''}</small></div>
          </div>
          <div class="mgk-hud"></div>
          <button class="mgk-skip" title="Pular minigame">Pular ⏭</button>
        </div>
        <div class="mgk-view ${cfg.vistaClasse || ''}">
          <div class="mgk-canvas"></div>
          <div class="mgk-meters"></div>
          <div class="mgk-pops"></div>
          <div class="mgk-msg"></div>
          <div class="mgk-layer"></div>
          <div class="mgk-intro hidden"></div>
          <div class="mgk-result hidden"></div>
        </div>
        <div class="mgk-controls"></div>
      </div>`;

    const q = (sel) => host.querySelector(sel);
    const canvasHost = q('.mgk-canvas');
    const hudEl = q('.mgk-hud');
    const msgEl = q('.mgk-msg');
    const popsEl = q('.mgk-pops');
    const metersEl = q('.mgk-meters');
    const controlsEl = q('.mgk-controls');
    const layerEl = q('.mgk-layer');

    const limpezas = [];
    let terminado = false;
    let resolver = null;
    const promessa = new Promise((r) => (resolver = r));

    // ---------- Palco 3D ----------
    let stage = null;
    let env = null;
    if (cfg.stage !== false && L()?.hasThree()) {
      stage = L().createStage(canvasHost, { radius: '0', fov: 50, ...(cfg.stage || {}) });
      if (stage && cfg.ambiente) {
        env = root.Luiggi3DEnv.build(cfg.ambiente, cfg.ambienteOpts || {});
        stage.scene.add(env.group);
        root.Luiggi3DEnv.aplicar(stage, env);
        stage.camera.position.set(...env.cam.pos);
        stage.camera.lookAt(...env.cam.look);
        stage.addUpdate((dt, t) => env.update(dt, t));
      }
      if (stage && cfg.grade) stage.setGrade(cfg.grade);
    }

    const kit = {
      host,
      cfg,
      stage,
      env,
      THREE: root.THREE,
      view: q('.mgk-view'),
      layer: layerEl,
      canvasHost,
      picker: stage ? L().createPicker(stage) : null,
      get terminado() {
        return terminado;
      },
      promessa,

      hud(html) {
        hudEl.innerHTML = html;
      },
      pill(texto) {
        return `<span class="mgk-pill">${texto}</span>`;
      },

      msg(texto, cor, dur = 0) {
        const tok = (kit._msgTok = (kit._msgTok || 0) + 1);
        msgEl.innerHTML = texto ? `<span style="${cor ? `--c:${cor}` : ''}">${texto}</span>` : '';
        msgEl.classList.remove('pulse');
        void msgEl.offsetWidth;
        if (texto) msgEl.classList.add('pulse');
        if (dur) kit.timeout(() => tok === kit._msgTok && kit.msg(''), dur);
      },

      /** Texto flutuante em coordenadas de tela (%) ou sobre um ponto 3D (THREE.Vector3). */
      pop(texto, onde, cor = '#fbbf24', o = {}) {
        const el = document.createElement('div');
        el.className = 'mgk-pop' + (o.grande ? ' grande' : '');
        el.textContent = texto;
        el.style.color = cor;
        let x = 50;
        let y = 40;
        if (onde && onde.isVector3 && stage) {
          const p = L().projectToScreen(stage, onde);
          const r = canvasHost.getBoundingClientRect();
          x = (p.x / r.width) * 100;
          y = (p.y / r.height) * 100;
        } else if (onde) {
          x = onde.x;
          y = onde.y;
        }
        el.style.left = x + '%';
        el.style.top = y + '%';
        popsEl.appendChild(el);
        setTimeout(() => el.remove(), o.dur || 1100);
      },

      /** Medidor no topo da cena. valor/zona em 0..1. */
      medidor(id, label, valor, o = {}) {
        let el = metersEl.querySelector(`[data-m="${id}"]`);
        if (!el) {
          el = document.createElement('div');
          el.className = 'mgk-meter';
          el.dataset.m = id;
          el.innerHTML = `<label></label><div class="mgk-bar"><div class="mgk-zone"></div><div class="mgk-fill"></div><div class="mgk-mark"></div></div>`;
          metersEl.appendChild(el);
        }
        el.querySelector('label').textContent = label;
        const v = Math.max(0, Math.min(1, valor));
        const fill = el.querySelector('.mgk-fill');
        const mark = el.querySelector('.mgk-mark');
        const zone = el.querySelector('.mgk-zone');
        if (o.marcador) {
          fill.style.width = '0';
          mark.style.display = 'block';
          mark.style.left = `${v * 100}%`;
        } else {
          mark.style.display = 'none';
          fill.style.width = `${v * 100}%`;
        }
        fill.style.background = o.cor || 'var(--accent)';
        if (o.zona) {
          zone.style.display = 'block';
          zone.style.left = `${o.zona[0] * 100}%`;
          zone.style.width = `${(o.zona[1] - o.zona[0]) * 100}%`;
          const dentro = v >= o.zona[0] && v <= o.zona[1];
          el.classList.toggle('ok', dentro);
          el.classList.toggle('fora', !dentro);
        } else zone.style.display = 'none';
      },

      botoes(lista) {
        controlsEl.innerHTML = '';
        lista.forEach((b) => {
          const el = document.createElement('button');
          el.className = 'mg-btn' + (b.primary ? ' primary' : '') + (b.classe ? ' ' + b.classe : '');
          el.innerHTML = b.label + (b.tecla ? ` <kbd>${b.tecla}</kbd>` : '');
          if (b.id) el.id = b.id;
          if (b.onDown) {
            el.addEventListener('pointerdown', (e) => {
              e.preventDefault();
              b.onDown();
            });
            el.addEventListener('pointerup', () => b.onUp && b.onUp());
            el.addEventListener('pointerleave', () => b.onUp && b.onUp());
          }
          if (b.onClick) el.addEventListener('click', () => !terminado && b.onClick(el));
          controlsEl.appendChild(el);
        });
        return controlsEl;
      },

      on(target, evt, fn, opts) {
        target.addEventListener(evt, fn, opts);
        limpezas.push(() => target.removeEventListener(evt, fn, opts));
      },
      tecla(fn, tipo = 'keydown') {
        const h = (e) => {
          if (terminado) return;
          if (e.target && e.target.tagName === 'INPUT') return;
          fn(e);
        };
        kit.on(window, tipo, h);
      },
      intervalo(fn, ms) {
        const id = setInterval(() => !terminado && fn(), ms);
        limpezas.push(() => clearInterval(id));
        return id;
      },
      timeout(fn, ms) {
        const id = setTimeout(() => !terminado && fn(), ms);
        limpezas.push(() => clearTimeout(id));
        return id;
      },
      loop(fn) {
        if (stage) stage.start((dt, t) => !terminado && fn(dt, t));
        else {
          let last = performance.now();
          let raf = 0;
          const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!terminado) fn(dt, now / 1000);
          };
          raf = requestAnimationFrame(tick);
          limpezas.push(() => cancelAnimationFrame(raf));
        }
      },
      sfx(nome) {
        root.LuiggiAudio?.playSFX(nome);
      },
      conquista(id) {
        root.LuiggiAchievements?.desbloquear(id);
      },
      contador(nome, d = 1) {
        root.LuiggiSave?.incrementarContador(nome, d);
      },
      personagem(id) {
        return root.LuiggiData?.cache?.personagemMap?.get(id);
      },
      /** Boneco 3D de um personagem (já adicionado à cena e animado no laço). */
      boneco(id, pos = [0, 0, 0], rotY = 0, o = {}) {
        if (!stage) return null;
        const ch = typeof id === 'string' ? kit.personagem(id) : id;
        const b = root.Luiggi3DChar.create(ch, o);
        b.group.position.set(...pos);
        b.group.rotation.y = rotY;
        stage.scene.add(b.group);
        stage.addUpdate((dt) => b.update(dt));
        return b;
      },
      carta(id, pos = [0, 0, 0], o = {}) {
        if (!stage) return null;
        const c = L().createCharacterCard(kit.personagem(id), { altura: 2.3, ...o });
        c.group.position.set(...pos);
        stage.scene.add(c.group);
        stage.addUpdate((dt) => c.update(dt, stage.camera));
        return c;
      },
      particulas(opts) {
        if (!stage) return null;
        const p = L().createParticles(opts);
        stage.scene.add(p.points);
        stage.addUpdate((dt) => p.update(dt));
        return p;
      },

      /** Tela de instruções + contagem regressiva. */
      intro(texto, controles = [], o = {}) {
        const el = q('.mgk-intro');
        el.classList.remove('hidden');
        el.innerHTML = `
          <div class="mgk-intro-card">
            <div class="mgk-intro-icon">${cfg.icone || '🎮'}</div>
            <h2>${esc(cfg.titulo)}</h2>
            <p>${texto}</p>
            ${controles.length ? `<div class="mgk-keys">${controles.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}
            <button class="mg-btn primary mgk-go">Começar ▶</button>
          </div>`;
        return new Promise((resolve) => {
          let foi = false;
          const go = () => {
            if (foi) return;
            foi = true;
            window.removeEventListener('keydown', onK);
            if (o.semContagem) {
              el.classList.add('hidden');
              return resolve();
            }
            let n = 3;
            el.innerHTML = `<div class="mgk-count">${n}</div>`;
            kit.sfx('blip');
            const it = setInterval(() => {
              n--;
              if (n <= 0) {
                clearInterval(it);
                el.innerHTML = `<div class="mgk-count go">VAI!</div>`;
                kit.sfx('conquista');
                setTimeout(() => {
                  el.classList.add('hidden');
                  resolve();
                }, 450);
              } else {
                el.innerHTML = `<div class="mgk-count">${n}</div>`;
                kit.sfx('blip');
              }
            }, 520);
            limpezas.push(() => clearInterval(it));
          };
          const onK = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
              e.preventDefault();
              go();
            }
          };
          window.addEventListener('keydown', onK);
          limpezas.push(() => window.removeEventListener('keydown', onK));
          el.querySelector('.mgk-go').addEventListener('click', go);
        });
      },

      /**
       * Termina o minigame: mostra o resultado e resolve com { pontos, ...extra }.
       * o: { max, titulo, texto, extra, rapido }
       */
      fim(pontos, o = {}) {
        if (terminado) return promessa;
        terminado = true;
        const id = cfg.id;
        const save = root.LuiggiSave;
        const recordeAnterior = save?.state?.recordesMinigames?.[id] || 0;
        if (save) save.salvarRecordeMinigame(id, pontos);
        const max = o.max || cfg.max || 1000;
        const frac = Math.max(0, Math.min(1, pontos / max));
        const estrelas = frac >= 0.85 ? 3 : frac >= 0.5 ? 2 : frac > 0 ? 1 : 0;
        const novoRecorde = pontos > recordeAnterior && pontos > 0;
        const el = q('.mgk-result');
        const encerrar = () => {
          limpar();
          resolver({ pontos, ...(o.extra || {}) });
        };
        if (o.rapido) {
          setTimeout(encerrar, 50);
          return promessa;
        }
        setTimeout(() => {
          el.classList.remove('hidden');
          el.innerHTML = `
            <div class="mgk-result-card">
              <div class="mgk-result-kicker">${esc(o.titulo || 'Resultado')}</div>
              <div class="mgk-stars">${[0, 1, 2].map((i) => `<span class="${i < estrelas ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.18}s">★</span>`).join('')}</div>
              <div class="mgk-score"><strong data-v="${pontos}">0</strong> pontos</div>
              ${novoRecorde ? '<div class="mgk-record">🏆 Novo recorde!</div>' : `<div class="mgk-best">Recorde: ${Math.max(recordeAnterior, pontos)}</div>`}
              ${o.texto ? `<p>${o.texto}</p>` : ''}
              <button class="mg-btn primary mgk-cont">Continuar ▶</button>
            </div>`;
          const s = el.querySelector('.mgk-score strong');
          const t0 = performance.now();
          const anim = () => {
            const k = Math.min(1, (performance.now() - t0) / 700);
            s.textContent = Math.round(pontos * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(anim);
          };
          requestAnimationFrame(anim);
          if (estrelas >= 2) kit.sfx('conquista');
          const onK = (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
              e.preventDefault();
              window.removeEventListener('keydown', onK);
              encerrar();
            }
          };
          setTimeout(() => window.addEventListener('keydown', onK), 350);
          el.querySelector('.mgk-cont').addEventListener('click', () => {
            window.removeEventListener('keydown', onK);
            encerrar();
          });
        }, o.atraso ?? 500);
        return promessa;
      }
    };

    function limpar() {
      limpezas.forEach((f) => {
        try {
          f();
        } catch (_e) { }
      });
      limpezas.length = 0;
      if (stage) stage.dispose();
      host.classList.add('hidden');
      host.classList.remove('mgk-host');
      host.innerHTML = '';
      if (cfg.aoFechar) cfg.aoFechar();
    }

    q('.mgk-skip').addEventListener('click', () => {
      if (terminado) return;
      if (cfg.aoPular) cfg.aoPular();
      kit.fim(cfg.pontosPular ?? 0, { titulo: 'Minigame pulado', rapido: true });
    });

    return kit;
  }

  root.LuiggiKit = { abrir };
})(window);
