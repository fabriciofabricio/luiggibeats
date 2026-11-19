/**
 * src/engine/DialogueSystem.js
 * Diálogo da Visual Novel: falas, escolhas (3 opções, sem tempo), convergências e relatório.
 *
 * Ritmo da história (ver ROTEIRO_REFORMULADO.md):
 *  - O "Narrador da Realidade" é o Fabricio comentando a história do Luis (adendo, de dentro do Subaru).
 *  - Toda piada que antes ocupava a tela inteira (tela preta, tela azul, "MAS NA VIDA REAL...",
 *    convergências) agora é uma fala do Fabricio na mesma caixa de diálogo, sem tirar o jogador da cena.
 *  - Mensagens de Discord/WhatsApp aparecem como mensagens, sem colocar a pessoa dentro da cena.
 *  - Avança com clique em qualquer lugar da cena, Espaço ou Enter.
 */
(function (root) {
  'use strict';

  let activePortraitAnim = null;
  let ticoFlip = 0;
  let sceneCast = { left: 'luis', right: null };

  const PREFIXO_CONVERGENCIA = {
    vhs: '◀◀ Rebobina essa fita aí.',
    vinyl: 'Mas na vida real...',
    discord: 'Mano, não foi isso que aconteceu kkkk.',
    glitch: 'Realidade restaurada.',
    strikethrough: 'Risca essa escolha aí, foi à caneta.',
    narrator: 'Você realmente achou que ia funcionar?',
    forced: 'Você realmente achou que ia funcionar?'
  };

  function el(id) {
    return document.getElementById(id);
  }

  function resetCast(leftId = 'luis', rightId = null) {
    sceneCast = { left: leftId, right: rightId };
    renderCast(null, 'neutro');
  }

  function renderCast(activeId, expr = 'neutro') {
    const layer = el('vn-cast-layer');
    if (!layer || !root.LuiggiRig || !root.LuiggiData?.cache?.personagemMap) return;
    const map = root.LuiggiData.cache.personagemMap;
    const modoCab = !!root.LuiggiSave?.state?.config?.modoCabecao;

    if (activeId && activeId !== 'narrador') {
      if (activeId === sceneCast.left || activeId === 'luis') sceneCast.left = activeId;
      else sceneCast.right = activeId;
    }

    if (root.LuiggiStory3D?.ativo && !modoCab) {
      layer.innerHTML = '';
      root.LuiggiStory3D.foco(sceneCast.left, sceneCast.right, activeId, expr);
      return;
    }

    const slot = (id, cls) => {
      const ch = id ? map.get(id) : null;
      if (!ch) return '';
      return `<div class="vn-slot ${cls}">${root.LuiggiRig.renderVisualNovelSprite(ch, {
        expressao: activeId === ch.id ? expr : 'neutro',
        speaking: activeId === ch.id,
        dim: activeId && activeId !== 'narrador' && activeId !== ch.id,
        modoCabecao: modoCab
      })}</div>`;
    };
    layer.innerHTML = slot(sceneCast.left, 'vn-left') + slot(sceneCast.right, 'vn-right');
  }

  // Mantidos por compatibilidade (minigames antigos chamam estas funções)
  function postDiscord() { }
  function mostrarSeloTelltale() { }

  function tremorTela() {
    if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.tremor(0.04);
  }

  function nomeExibido(quemId, capId) {
    if (quemId === 'narrador') return 'Fabricio';
    const p = root.LuiggiData?.cache?.personagemMap?.get(quemId);
    if (!p) return quemId;
    if (capId >= 10 && (quemId === 'luis' || quemId === 'fabricio')) {
      ticoFlip++;
      if (root.LuiggiSave && ticoFlip % 2 === 1) root.LuiggiSave.incrementarContador('vezesTico', 1);
      const pair = ticoFlip % 4 < 2 ? ['Tico', 'Teco'] : ['Lé', 'Cré'];
      return quemId === 'luis' ? `${pair[0]} (${p.nome.split(' ')[0]})` : `${pair[1]} (${p.nome.split(' ')[0]})`;
    }
    return p.nome;
  }

  /** Detecta o canal da fala: adendo do Fabricio, Discord, WhatsApp ou presencial. */
  function detectarCanal(quem, fala, canal) {
    if (canal) return { canal, texto: fala };
    if (quem === 'narrador') return { canal: 'adendo', texto: fala };
    const m = /^\[(Discord[^\]]*|WhatsApp)\]\s*/.exec(fala || '');
    if (m) return { canal: /WhatsApp/.test(m[1]) ? 'whatsapp' : 'discord', texto: fala.slice(m[0].length), detalhe: m[1] };
    return { canal: null, texto: fala };
  }

  const TAGS = {
    adendo: '🚙 comentando do Subaru',
    discord: '💬 no Discord',
    whatsapp: '📱 no WhatsApp'
  };

  /**
   * Mostra uma fala. canal: 'adendo' | 'discord' | 'whatsapp' | null (presencial).
   */
  function mostrarDialogo({ quem, expr = 'neutro', fala, capId = 0, canal = null }) {
    return new Promise((resolve) => {
      const box = el('dialogue-overlay');
      const portraitEl = el('dialogue-portrait');
      const nameEl = el('dialogue-name');
      const tagEl = el('dialogue-tag');
      const textEl = el('dialogue-text');
      const nextBtn = el('dialogue-next');
      if (!box) return resolve();

      root.LuiggiCloud?.duck?.(true);
      const info = detectarCanal(quem, fala, canal);
      const quemReal = info.canal === 'adendo' ? 'fabricio' : quem;
      const texto = info.texto;

      // Só fala presencial mexe no elenco da cena
      if (!info.canal) renderCast(quem, expr);
      else if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.foco(sceneCast.left, sceneCast.right, null, 'neutro');

      box.classList.remove('hidden', 'canal-adendo', 'canal-discord', 'canal-whatsapp', 'pronto');
      if (info.canal) box.classList.add('canal-' + info.canal);
      nameEl.textContent = info.canal === 'adendo' ? 'Fabricio' : nomeExibido(quem, capId);
      if (tagEl) tagEl.textContent = info.canal ? (info.detalhe && /flutuando/.test(info.detalhe) ? '💬 no Discord (flutuando nas nuvens)' : TAGS[info.canal]) : '';
      textEl.textContent = '';

      if (activePortraitAnim) {
        activePortraitAnim.destroy();
        activePortraitAnim = null;
      }
      portraitEl.innerHTML = '';
      const char = root.LuiggiData?.cache?.personagemMap?.get(quemReal);
      if (char && root.LuiggiRig) {
        activePortraitAnim = new root.LuiggiRig.RigAnimator(portraitEl, char, {
          expressao: expr || 'neutro',
          animacao: 'talk',
          scale: 'portrait',
          modoCabecao: !!root.LuiggiSave?.state?.config?.modoCabecao
        });
      }

      const speed = root.LuiggiSave?.state?.config?.velocidadeTexto ?? 24;
      let i = 0;
      let finished = false;
      const timer = setInterval(() => {
        if (i >= texto.length) {
          clearInterval(timer);
          finished = true;
          box.classList.add('pronto');
          if (activePortraitAnim) activePortraitAnim.setOptions({ animacao: 'idle' });
          return;
        }
        textEl.textContent += texto[i++];
        if (i % 4 === 0 && root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
        if (activePortraitAnim) activePortraitAnim.pulseTalk();
      }, Math.max(8, speed));

      function finishOrAdvance(e) {
        if (e && e.target && e.target.closest && e.target.closest('button:not(#dialogue-next), a, .top-hud, .vn-hotspot-btn')) return;
        if (!finished) {
          clearInterval(timer);
          textEl.textContent = texto;
          finished = true;
          box.classList.add('pronto');
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
      function onNext(ev) {
        ev.stopPropagation();
        finishOrAdvance();
      }

      const frame = document.querySelector('.stage-frame');
      let ligarFrame = null;
      function cleanup() {
        root.LuiggiCloud?.duck?.(false);
        clearInterval(timer);
        clearTimeout(ligarFrame);
        nextBtn.removeEventListener('click', onNext);
        frame?.removeEventListener('click', finishOrAdvance);
        window.removeEventListener('keydown', onKey);
        if (activePortraitAnim) {
          activePortraitAnim.destroy();
          activePortraitAnim = null;
        }
      }

      nextBtn.addEventListener('click', onNext);
      // Evita que o clique que abriu a fala já a pule
      ligarFrame = setTimeout(() => frame?.addEventListener('click', finishOrAdvance), 150);
      window.addEventListener('keydown', onKey);
    });
  }

  /**
   * Interjeição rápida por cima da cena, sem interromper o diálogo em andamento.
   * Ex.: Mateus e Fabricio juntos rindo quando alguém abre o compartimento dos Tic Tacs.
   * ids: personagens que falam juntos (podem ser vários); host: onde mostrar (padrão: palco).
   */
  let interjeicaoTimer = null;
  let interjeicaoTyper = null;
  function mostrarInterjeicao({ ids = [], texto = '', host = null, duracao = 2800, som = null } = {}) {
    const alvo = host || document.querySelector('.stage-frame') || document.body;
    let box = alvo.querySelector(':scope > .vn-interjeicao');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vn-interjeicao';
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        box.classList.remove('ativo');
      });
      alvo.appendChild(box);
    }
    const map = root.LuiggiData?.cache?.personagemMap;
    const pessoas = ids.map((id) => map?.get(id)).filter(Boolean);
    const nomes = pessoas.length > 1 ? pessoas.map((p) => p.nome.split(' ')[0]).join(' & ') : pessoas[0]?.nome || '';
    box.innerHTML = `
      ${pessoas.length ? `<div class="vi-rostos">${pessoas.map((p) => `<div class="vi-rosto">${root.LuiggiRig?.renderVisualNovelSprite(p, { expressao: 'feliz', speaking: true }) || ''}</div>`).join('')}</div>` : ''}
      <div class="vi-corpo">${nomes ? `<div class="vi-nome">${nomes}${pessoas.length > 1 ? ' <small>juntos</small>' : ''}</div>` : ''}<div class="vi-texto"></div></div>`;
    box.classList.toggle('so-texto', !pessoas.length);
    void box.offsetWidth;
    box.classList.add('ativo');
    if (som && root.LuiggiAudio) root.LuiggiAudio.playSFX(som);
    const txt = box.querySelector('.vi-texto');
    clearInterval(interjeicaoTyper);
    let i = 0;
    interjeicaoTyper = setInterval(() => {
      if (i >= texto.length) return clearInterval(interjeicaoTyper);
      txt.textContent += texto[i++];
    }, 22);
    clearTimeout(interjeicaoTimer);
    interjeicaoTimer = setTimeout(() => box.classList.remove('ativo'), duracao);
  }

  /** Comentário do Fabricio (substitui telas pretas / narrador). */
  function mostrarAdendo(texto, capId = 0, expr = 'neutro') {
    return mostrarDialogo({ quem: 'narrador', expr, fala: texto, capId, canal: 'adendo' });
  }

  /** Convergência: o Fabricio corrige a "realidade alternativa" sem sair da cena. */
  async function executarConvergencia(tipo, eventoReal, capId = 0) {
    if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.efeito(tipo);
    if (root.LuiggiAudio) {
      const som = { vhs: 'vhs', vinyl: 'vinyl', glitch: 'bruh', strikethrough: 'vinyl', discord: 'discord' }[tipo] || 'voce_sabe';
      root.LuiggiAudio.playSFX(som);
    }
    const prefixo = PREFIXO_CONVERGENCIA[tipo] || PREFIXO_CONVERGENCIA.narrator;
    await mostrarAdendo(`${prefixo} ${eventoReal}`, capId, tipo === 'discord' ? 'feliz' : 'neutro');
  }

  /** Escolha com 3 opções. Sem limite de tempo. */
  function mostrarEscolha(escolhaId, capId) {
    return new Promise((resolve) => {
      const escolha = root.LuiggiData?.cache?.escolhas?.escolhas?.[escolhaId];
      if (!escolha) return resolve(null);
      const ov = el('choice-overlay');
      const qEl = el('choice-question');
      const cardsEl = el('choice-cards');
      const timerWrap = el('choice-timer-wrap');
      if (!ov) return resolve(null);

      const vistas = root.LuiggiSave?.state?.escolhasVistas?.[escolhaId] || [];
      qEl.textContent = escolha.pergunta;
      cardsEl.innerHTML = '';
      if (timerWrap) timerWrap.style.display = 'none';
      ov.classList.remove('hidden');
      ov.classList.toggle('escolha-final', escolha.convergencia === 'final_real');
      if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.foco(sceneCast.left, sceneCast.right, null, 'neutro');

      let chosen = false;
      let keyHandler = null;

      async function selecionar(idx) {
        if (chosen) return;
        chosen = true;
        window.removeEventListener('keydown', keyHandler);
        ov.classList.add('hidden');
        const opt = escolha.opcoes[idx];

        if (escolha.convergencia === 'final_real') {
          if (root.LuiggiSave) {
            root.LuiggiSave.state.finalEscolhido = opt.finalId;
            root.LuiggiSave.salvar();
          }
          resolve(opt);
          return;
        }

        if (root.LuiggiSave) {
          root.LuiggiSave.registrarEscolha(escolhaId, idx);
          if (opt.tag === 'sensato') root.LuiggiSave.incrementarContador('contraDestino', 1);
        }
        if (root.LuiggiAchievements) {
          root.LuiggiAchievements.desbloquear('iludido');
          root.LuiggiAchievements.verificarEscolhas(escolhaId, capId);
          if (escolha.conquista) root.LuiggiAchievements.desbloquear(escolha.conquista);
        }

        if (opt.efeito === 'bsod_fake') {
          if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.efeito('bsod');
          if (root.LuiggiAudio) root.LuiggiAudio.playSFX('bruh');
          await mostrarAdendo('Nessa hora o cérebro dele deu tela azul: "Ocorreu um problema no arquivo LUIS_SEM_COOKIES.SYS". Código de parada: HIPERFOCO_NOT_STOPPED. Reiniciando pra realidade...', capId, 'feliz');
        }

        for (const linha of opt.miniCena || []) {
          await mostrarDialogo({ quem: linha.quem, expr: linha.expr || 'neutro', fala: linha.fala, capId, canal: linha.canal || null });
        }

        // O Fabricio só comenta quando a escolha foge do que aconteceu de verdade.
        // Opções marcadas com "real": true (ou escolhas "forced", em que todo botão vira a fala real)
        // já são a realidade, então não precisam de adendo.
        const escolhaFoiReal = opt.real === true || escolha.convergencia === 'forced';
        if (!escolhaFoiReal) await executarConvergencia(escolha.convergencia, escolha.eventoReal, capId);
        resolve(opt);
      }

      escolha.opcoes.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-card';
        btn.style.animationDelay = `${idx * 0.06}s`;
        if (opt.estiloBotao === 'gigante_pulsando') btn.classList.add('choice-giant');
        if (opt.estiloBotao === 'fujão') btn.classList.add('choice-flee');
        if (opt.estiloBotao === 'piscando') btn.classList.add('choice-blink');
        const vistoBadge = vistas.includes(idx) ? `<span class="seen-badge">✓ visto</span>` : '';
        btn.innerHTML = `<span class="choice-num">${idx + 1}</span> <span class="choice-txt">${opt.texto}</span> ${vistoBadge}`;

        if (escolha.convergencia === 'forced') {
          const forcar = () => cardsEl.querySelectorAll('.choice-txt').forEach((t) => (t.textContent = escolha.textoForcado));
          btn.addEventListener('mouseenter', forcar);
          btn.addEventListener('touchstart', forcar, { passive: true });
        }
        if (opt.estiloBotao === 'fujão') {
          let fugas = 0;
          btn.addEventListener('mouseenter', () => {
            if (fugas < 5) {
              fugas++;
              btn.style.transform = `translate(${(Math.random() - 0.5) * 180}px, ${(Math.random() - 0.5) * 60}px)`;
              if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
            }
          });
        }
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selecionar(idx);
        });
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

  /** Antes: tela preta com texto. Agora: comentário do Fabricio na cena. */
  function mostrarTelaPreta(texto, capId = 0) {
    return mostrarAdendo(texto, capId);
  }

  /** Tela cheia de verdade (só para os créditos finais). */
  function mostrarCreditos(linhas) {
    return new Promise((resolve) => {
      const ov = el('blackout-overlay');
      const txt = el('blackout-text');
      if (!ov || !txt) return resolve();
      txt.innerHTML = linhas.map((l, i) => `<div class="cred-linha" style="animation-delay:${i * 0.35}s">${l}</div>`).join('');
      ov.classList.remove('hidden');
      ov.classList.add('creditos');
      const fim = () => {
        clearTimeout(t);
        ov.removeEventListener('click', fim);
        ov.classList.add('hidden');
        ov.classList.remove('creditos');
        resolve();
      };
      const t = setTimeout(fim, 3000 + linhas.length * 450);
      setTimeout(() => ov.addEventListener('click', fim), 600);
    });
  }

  /** Fim de capítulo: nota rápida do Fabricio com o "relatório da realidade" e o gancho. */
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
      if (capId === 11) extraHtml = `<p class="report-note">Este capítulo nem aconteceu. (Graças a Deus.)</p>`;
      else if (capId === 14)
        extraHtml = `<p class="report-note">Missões cumpridas: <strong>1</strong> · Plot twists previstos pelo Fabricio: <strong>0</strong></p>
          <div class="critica-box">🎬 Crítica da Tutuluiza: <strong>"Operação Ponto Cego (20XX). ★★★★☆. Ótimo suspense, final constrangedor."</strong></div>`;
      const fab = root.LuiggiData?.cache?.personagemMap?.get('fabricio');
      body.innerHTML = `
        <div class="report-head">
          <div class="report-avatar">${fab ? root.LuiggiRig.renderVisualNovelSprite(fab, { expressao: 'feliz' }) : '🚙'}</div>
          <div><div class="report-kicker">Relatório da Realidade · by Fabricio</div><div class="report-sub">Anotado no banco do passageiro</div></div>
        </div>
        <div class="report-stat"><span>Escolhas feitas neste capítulo</span> <strong>${doCap.length}</strong></div>
        <div class="report-stat highlight"><span>Escolhas que mudaram o destino</span> <strong id="zero-anim">14</strong></div>
        <div class="report-stat"><span>Universos paralelos vistos</span> <strong>${cenasVistas} de ${totalCenas || 3}</strong></div>
        ${extraHtml}
        <p class="report-fake">📊 <em>87% dos jogadores escolheram a mesma coisa. Nenhum deles mudou nada também.</em></p>
        <div class="cliffhanger-card">
          <div class="cliff-kicker">NO PRÓXIMO CAPÍTULO...</div>
          <div class="cliff-text">${cliffhangerTexto}</div>
        </div>`;
      ov.classList.remove('hidden');
      const zeroEl = document.getElementById('zero-anim');
      let num = 14;
      const anim = setInterval(() => {
        num = Math.max(0, num - 2);
        if (zeroEl) zeroEl.textContent = String(num);
        if (num === 0) clearInterval(anim);
      }, 70);
      const onK = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          go();
        }
      };
      function go() {
        btn.removeEventListener('click', go);
        window.removeEventListener('keydown', onK);
        ov.classList.add('hidden');
        resolve();
      }
      btn.addEventListener('click', go);
      setTimeout(() => window.addEventListener('keydown', onK), 500);
    });
  }

  root.LuiggiDialogue = {
    resetCast,
    renderCast,
    postDiscord,
    mostrarSeloTelltale,
    tremorTela,
    mostrarDialogo,
    mostrarAdendo,
    mostrarInterjeicao,
    executarConvergencia,
    mostrarEscolha,
    mostrarTelaPreta,
    mostrarCreditos,
    mostrarRelatorioRealidade
  };
})(window);
