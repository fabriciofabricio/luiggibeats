/**
 * src/scenes/GameOrchestrator.js
 * Orquestrador principal em tela cheia (Visual Novel com palco 3D em Three.js).
 * Molde cronológico:
 *   Menu Principal -> Dentro do Subaru Azul no Safepoint (POV Luis -> Fabricio) ->
 *   História -> Relatório -> Volta pro Subaru no Safepoint comentando e puxando a próxima história -> ...
 *   Após a história final (Cap. 15) + último Safepoint -> Voltando para casa com o Subaru Azul -> Fim!
 */
(function (root) {
  'use strict';

  let phaserGame = null;
  let runningChapter = false;

  const SAFEPOINT_BG = 'assets/Cenarios/safe point para chilling/Screenshot 2026-11-17 012957.png';

  const VIBE_POR_CAPITULO = {
    0: '⚡ Hiperfoco: 100% · Cookies: 47',
    1: '💘 Química com Maria Clara: 0% (ela gosta de mulheres)',
    2: '🎧 Shittrap: 100% · Vitor chorando na chuva',
    3: '🔒 Nível de Mistério: Confidencial',
    4: '🚙 Vidros Embaçados · Notificações: 999+',
    5: '🇩🇪 Geografia Alemã: 100% · Dilema: Máximo',
    6: '🕯️ Vela Acesa: 100% · Bateria: 1%',
    7: '🐈‍⬛ Olhos do Gato: Fixos em você',
    8: '💧 Sadness: 80% · Ruivas Encontradas: várias',
    9: '🚩 Red Flags: Ignoradas · Pós-créditos: 0',
    10: '🐿️ Tico & Teco: 1 Neurônio Compartilhado',
    11: '☁️ Lógica de Sonho: 100% · CNH: Giz de cera',
    12: '🖤 Red Flags: Detector Quebrado!',
    13: '🥊 Climão: Histórico · Concordância: "é... verdade"',
    14: '🕶️ Modo Agente Secreto · Plot Twist!',
    15: '🪞 A Escolha Que Ainda Não Foi Escrita'
  };

  const SAFEPOINT_FALAS = {
    0: 'Fabricio: "Bora no Safepoint pegar um ar, mano. Já são 4 da manhã e você ainda tá cheirando a baunilha."',
    1: 'Fabricio: "Relaxa, Luiggi... no ensino médio eu mal aparecia no fundão, mas anota: ainda vamos dominar a quarentena."',
    2: 'Fabricio: "O Vitor nunca vai superar esse beat kkkk. Encosta o Subaru aqui no Safepoint!"',
    3: 'Fabricio: "Nem aqui no Safepoint você me conta se entrou naquele banheiro ou não, né?!"',
    4: 'Fabricio: "Limpa esse vidro embaçado do Subaru aí, Tico. Bora respirar no Safepoint."',
    5: 'Fabricio: "Caliandra gritando aquilo na porta do prédio ainda tá ecoando na minha cabeça..."',
    6: 'Fabricio: "Valeu pela carona até o Centro, irmão... e desculpa por deixar você segurando vela às 3h."',
    7: 'Fabricio: "O gato viu tudo mesmo? Mano, hoje a gente vai pro Sad Baile pra curar essa bad."',
    8: 'Fabricio: "E NÃO COLOCA AQUELA PARADA DA MARILIS DOCINHO NO JOGO, TÁ ME OUVINDO?!"',
    9: 'Fabricio: "Tinder na França e zero pós-créditos no cinema... bora pro Emily Doces amanhã que tô namorando a Rayssa!"',
    10: 'Fabricio: "Tico e Teco, Lé e Cré... depois desse racha com a Emily eu só quero dormir."',
    11: 'Fabricio: "Nunca mais sonha que eu tô dirigindo teu Subaru com a Sol no banco de trás, mano."',
    12: 'Fabricio: "Mano, até o Detector de Red Flags explodiu. Respira aqui no Safepoint."',
    13: 'Fabricio: "Que climão histórico no TNT... e aquele Cara Aleatório concordando com tudo?!"',
    14: 'Fabricio: "EU PROTEGI OS SENTIMENTOS DE QUEM QUERIA VOCÊ O TEMPO TODO KKKKKK"'
  };

  function iniciarPalco3D() {
    const ok = root.LuiggiStory3D && root.LuiggiStory3D.init(document.getElementById('stage3d-container'));
    document.body.classList.toggle('modo-3d', !!ok);
    if (ok) {
      root.LuiggiStory3D.onGato(() => {
        root.LuiggiAudio?.playSFX('blip');
        root.LuiggiAchievements?.verificarContadores(root.LuiggiSave.state);
      });
    }
    return ok;
  }

  // Legenda discreta no canto (lower third): título do capítulo ou nome do lugar.
  let legendaTimer = null;
  function mostrarLegenda(titulo, sub = '', o = {}) {
    const el = document.getElementById('lower-third');
    if (!el) return;
    clearTimeout(legendaTimer);
    el.innerHTML = `${o.kicker ? `<div class="lt-kicker">${o.kicker}</div>` : ''}<div class="lt-title">${titulo}</div>${sub ? `<div class="lt-sub">${sub}</div>` : ''}`;
    el.classList.toggle('lt-capitulo', !!o.kicker);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    legendaTimer = setTimeout(() => el.classList.remove('show'), o.duracao || 3600);
  }

  // Transição suave (fade) entre história e minigames
  function transicao(entrar = true, ms = 380) {
    const f = document.getElementById('fade-overlay');
    if (!f) return Promise.resolve();
    f.classList.toggle('on', entrar);
    return new Promise((r) => setTimeout(r, ms));
  }

  function configurarCenarioDatingSim(cap) {
    const bgEl = document.getElementById('vn-backdrop');
    const dayHud = document.getElementById('vn-day-hud');
    const hotspotsEl = document.getElementById('vn-hotspots');
    const save = root.LuiggiSave;
    const data = root.LuiggiData.cache;

    const usa3D = !!root.LuiggiStory3D?.ativo;
    const comecaComCena = (cap.eventos || [])[0]?.tipo === 'cena';
    if (usa3D) root.LuiggiStory3D.entrarCapitulo(cap, { semCenario: comecaComCena });
    if (bgEl && !usa3D) {
      const pal = cap.paleta || { bg: '#16192b', accent: '#f59e0b' };
      if (cap.cenarioImagem) {
        bgEl.style.backgroundImage = `url('${encodeURI(cap.cenarioImagem)}')`;
      } else {
        bgEl.style.backgroundImage = `radial-gradient(circle at 50% 35%, ${pal.accent}33 0%, ${pal.bg} 72%)`;
      }
    }

    if (dayHud) dayHud.innerHTML = '';

    // Elenco começa só com o Luis; os outros entram em cena quando falam pessoalmente
    root.LuiggiDialogue.resetCast('luis', null);

    // Hotspots discretos apenas para o easter egg do Gato da Luiza (Caps. 7 a 15)
    if (hotspotsEl) {
      hotspotsEl.innerHTML = '';

      if (!usa3D && cap.temGatoEscondido && !save.state.gatosVistos.includes(cap.id)) {
        const catBtn = document.createElement('button');
        catBtn.className = 'vn-hotspot-btn';
        catBtn.textContent = '🐈‍⬛';
        catBtn.title = 'O Gato da Luiza está observando...';
        catBtn.style.right = '14px';
        catBtn.style.bottom = '118px';
        catBtn.addEventListener('click', () => {
          save.state.gatosVistos.push(cap.id);
          save.salvar();
          root.LuiggiAudio.playSFX('blip');
          root.LuiggiAchievements.verificarContadores(save.state);
          catBtn.remove();
        });
        hotspotsEl.appendChild(catBtn);
      }
    }
  }

  function atualizarHUD() {
    const hud = document.getElementById('hud-counters');
    if (!hud || !root.LuiggiSave) return;
    const totalAchs = root.LuiggiData?.cache?.conquistas?.conquistas?.length || 123;
    const capId = root.LuiggiSave.state.capituloAtual ?? 0;
    const capLabel = capId === 0 ? 'Prólogo' : `Cap. ${capId}`;
    hud.innerHTML = `
      <span>📖 ${capLabel}</span>
      <span>🏆 ${root.LuiggiSave.state.conquistas.length}/${totalAchs} Conquistas</span>
    `;
  }

  function dispararFelpsPop() {
    if (root.LuiggiSave) root.LuiggiSave.incrementarContador('felpsOmeter', 1);
    if (root.LuiggiAudio) root.LuiggiAudio.playSFX('felps');
    if (root.LuiggiStory3D?.ativo) root.LuiggiStory3D.efeito('felps');
  }

  async function executarMinigame(minigameId, modoLivre = false) {
    const st = root.LuiggiStory3D;
    if (minigameId === 'ajude_vitor') return executarMinigameInterno(minigameId, modoLivre);
    await transicao(true);
    if (st?.ativo) st.pausar();
    const p = executarMinigameInterno(minigameId, modoLivre);
    setTimeout(() => transicao(false), 60);
    try {
      return await p;
    } finally {
      await transicao(true, 260);
      if (st?.ativo) st.retomar();
      transicao(false);
    }
  }

  async function executarMinigameInterno(minigameId, modoLivre = false) {
    if (minigameId === 'fabrica_cookies') return root.LuiggiCookies.abrirFabricaCookies(modoLivre ? 'livre' : 'historia');
    if (minigameId === 'luiggibeats_hero') return root.LuiggiRhythm.abrirLuiggiBeatsHero({ direto: !modoLivre });
    if (minigameId === 'passinho_sad') return root.LuiggiRhythm.abrirPassinhoSad();
    if (minigameId === 'soundboard_discord') return root.LuiggiRhythm.abrirSoundboardDiscord();
    if (minigameId === 'fl_estudio') return root.LuiggiFLStudio.abrirFLEstudio(modoLivre);
    if (minigameId === 'direcao_madrugada') return root.LuiggiDriving.abrirDirecao('madrugada');
    if (minigameId === 'direcao_bacacheri') return root.LuiggiDriving.abrirDirecao('curitiba');
    if (minigameId === 'racha_subaru_civic') return root.LuiggiDriving.abrirDirecao('racha');
    if (minigameId === 'sobrevivencia_centro') return root.LuiggiStealth.abrirFurtividade('centro_3h');
    if (minigameId === 'esconde_esconde_baile') return root.LuiggiStealth.abrirFurtividade('baile');
    if (minigameId === 'operacao_ponto_cego') return root.LuiggiStealth.abrirFurtividade('ponto_cego');
    if (minigameId === 'x1_eloiza_yohana') return root.LuiggiFighter.abrirLutaX1(modoLivre);
    if (minigameId === 'ajude_vitor') return root.LuiggiDialogue.mostrarEscolha('c1_vitor_assunto', 1);
    return root.LuiggiQuickMinigames.abrir(minigameId);
  }

  // ==================== VOLTA PRA CASA NO SUBARU AZUL (SOMENTE AO FINAL DO JOGO) ====================
  function telaVoltandoParaCasaComSubaru() {
    return new Promise((resolve) => {
      const ov = document.getElementById('drivehome-overlay');
      const data = root.LuiggiData.cache;
      const subaru = data.veiculoMap.get('subaru_legacy');

      root.LuiggiAudio.playSFX('boxer');
      root.LuiggiAudio.tocarEstiloSintetizado('lofi', 112);

      ov.classList.remove('hidden');
      ov.innerHTML = `
        <div class="drivehome-card">
          <div class="menu-kicker">VOLTANDO PARA CASA COM O SUBARU AZUL...</div>
          <h2 style="margin:6px 0 4px;">🌙 Ruas de Curitiba · Fim da Noite no Safepoint</h2>
          <p style="color:#9ca3af;font-size:0.86rem;margin:0;">Todas as histórias foram contadas em ordem cronológica. Ronco boxer no escape, LuiggiBeats no rádio, rumo a casa.</p>
          <div class="road-scene" id="dh-3d">
            <div class="road-dashes"></div>
            <div class="headlight-beam"></div>
            <div class="cruising-subaru">${root.LuiggiRig.renderVehicleSVG(subaru)}</div>
          </div>
          <div class="cliffhanger-card" style="text-align:left;margin-bottom:14px;">
            <div class="cliff-kicker">DESTINO FINAL</div>
            <div class="cliff-text"><strong>Casa do Luis</strong> — Obrigado por jogar "LuiggiBeats: O Destino Já Foi Escrito".</div>
          </div>
          <button class="mg-btn primary" id="dh-next">Chegar em Casa & Encerrar Jornada ▶</button>
        </div>
      `;

      const palco3D = root.LuiggiSubaruPOV.cenaVoltaPraCasa?.(document.getElementById('dh-3d'), 9);
      if (palco3D) document.getElementById('dh-3d').classList.add('road-3d');

      const avancar = () => {
        clearTimeout(autoTimer);
        if (palco3D) palco3D.dispose();
        ov.classList.add('hidden');
        ov.innerHTML = '';
        root.LuiggiAudio.pararMusica();
        resolve();
      };

      const autoTimer = setTimeout(avancar, 9500);
      document.getElementById('dh-next').addEventListener('click', avancar);
    });
  }

  async function executarFinal(finalId) {
    if (finalId === 'loop') {
      root.LuiggiAchievements.desbloquear('o_loop');
      await root.LuiggiDialogue.mostrarDialogo({ quem: 'eloiza', expr: 'neutro', fala: 'Vou parar com isso.', capId: 15 });
      await root.LuiggiDialogue.mostrarDialogo({ quem: 'eloiza', expr: 'neutro', fala: 'Vou parar com isso.', capId: 15 });
      await root.LuiggiDialogue.mostrarTelaPreta('Você sabe como essa história continua. Você acabou de jogar ela.');
    } else if (finalId === 'proximo_capitulo') {
      root.LuiggiAchievements.desbloquear('proximo_capitulo');
      await root.LuiggiDialogue.mostrarDialogo({ quem: 'luis', expr: 'neutro', fala: 'Acho que a gente precisa terminar de vez. Cuida de você.', capId: 15, canal: 'whatsapp' });
      await root.LuiggiDialogue.mostrarDialogo({ quem: 'fabricio', expr: 'feliz', fala: '[Discord] Tamo junto, mano. Pega o Subaru, bora dar uma volta sem rumo no amanhecer.', capId: 15 });
      await root.LuiggiDialogue.mostrarDialogo({ quem: 'mateus_buse', expr: 'feliz', fala: '[Discord] (desmutou só pra dizer: tamo junto, Luiggi.)', capId: 15 });
      await root.LuiggiDriving.abrirDirecao('amanhecer');
      await root.LuiggiDialogue.mostrarTelaPreta('Sala no Museu desbloqueada: "Próximo Capítulo: ainda não escrito."');
    } else {
      root.LuiggiAchievements.desbloquear('ainda_nao_sei');
      await root.LuiggiDialogue.mostrarTelaPreta('Tudo bem não saber hoje. Mas você sabe que vai ter que escolher um dia.');
    }

    const creds = root.LuiggiData.cache.dialogos.creditos || [];
    await root.LuiggiDialogue.mostrarCreditos(creds);
    await root.LuiggiDialogue.mostrarDialogo({
      quem: 'fabricio',
      expr: 'feliz',
      fala: '[PÓS-CRÉDITOS DE VERDADE!] Viu, Yohana?! ESSE aqui tem cena pós-créditos! KKKKK',
      capId: 15
    });
    await root.LuiggiDialogue.mostrarTelaPreta('A história do LuiggiBeats ainda está sendo escrita.');
  }

  async function iniciarCapitulo(capId) {
    if (runningChapter) return;
    runningChapter = true;
    esconderMenuPrincipal();

    const data = root.LuiggiData.cache;
    const save = root.LuiggiSave;
    const cap = (data.dialogos?.capitulos || []).find((c) => c.id === capId);
    if (!cap) {
      runningChapter = false;
      return;
    }

    save.state.capituloAtual = capId;
    save.salvar();
    atualizarHUD();

    (data.receitas?.receitas || []).forEach((r) => {
      if (r.desbloqueiaNoCapitulo <= capId && !save.state.receitasDesbloqueadas.includes(r.id)) {
        save.state.receitasDesbloqueadas.push(r.id);
      }
    });
    if (save.state.receitasDesbloqueadas.length >= (data.receitas?.receitas?.length || 8)) {
      root.LuiggiAchievements.desbloquear('livro_de_receitas');
    }

    configurarCenarioDatingSim(cap);
    if ((cap.eventos || [])[0]?.tipo !== 'cena') {
      mostrarLegenda(cap.titulo, `${cap.era}`, { kicker: cap.codigo });
      await new Promise((r) => setTimeout(r, 900));
    }

    const estiloMap = { 2: 'trap', 8: 'sad', 11: 'sonho', 12: 'gotico', 13: 'underground' };
    root.LuiggiAudio.tocarEstiloSintetizado(estiloMap[capId] || 'lofi', 118);

    let teveCena = false;
    for (const ev of cap.eventos || []) {
      if (ev.tipo === 'cena') {
        const primeira = !teveCena;
        teveCena = true;
        const elenco = ev.elenco || null;
        root.LuiggiDialogue.resetCast(elenco ? (elenco.luis ? 'luis' : null) : 'luis', null);
        if (root.LuiggiStory3D?.ativo) await root.LuiggiStory3D.mudarCena(ev.cenario, ev.opts || {}, elenco);
        if (primeira) mostrarLegenda(cap.titulo, ev.legenda || cap.era, { kicker: cap.codigo });
        else if (ev.legenda) mostrarLegenda(ev.legenda);
        await new Promise((r) => setTimeout(r, primeira ? 1100 : 500));
        continue;
      }
      if (ev.tipo === 'dialogo') {
        await root.LuiggiDialogue.mostrarDialogo({
          quem: ev.quem,
          expr: ev.expr || 'neutro',
          fala: ev.fala,
          capId
        });
      } else if (ev.tipo === 'discord') {
        await root.LuiggiDialogue.mostrarDialogo({ quem: ev.quem, expr: 'neutro', fala: ev.fala, capId, canal: 'discord' });
      } else if (ev.tipo === 'sfx') {
        root.LuiggiAudio.playSFX(ev.som);
      } else if (ev.tipo === 'felps') {
        dispararFelpsPop();
        await root.LuiggiDialogue.mostrarDialogo({ quem: 'cecilia', expr: 'feliz', fala: ev.fala, capId });
      } else if (ev.tipo === 'conquista') {
        root.LuiggiAchievements.desbloquear(ev.id);
      } else if (ev.tipo === 'tela_preta' || ev.tipo === 'cena_especial') {
        if (ev.tipo === 'cena_especial' && root.LuiggiStory3D?.ativo) root.LuiggiStory3D.efeitoEspecial(ev.id);
        await root.LuiggiDialogue.mostrarAdendo(ev.texto, capId);
      } else if (ev.tipo === 'escolha') {
        const res = await root.LuiggiDialogue.mostrarEscolha(ev.escolhaId, capId);
        if (ev.escolhaId === 'c15_escolha_final' && res?.finalId) {
          await executarFinal(res.finalId);
        }
      } else if (ev.tipo === 'minigame') {
        root.LuiggiAudio.pararMusica();
        await executarMinigame(ev.minigameId, false);
        root.LuiggiAudio.tocarEstiloSintetizado(estiloMap[capId] || 'lofi', 118);
      } else if (ev.tipo === 'cliffhanger') {
        if (cap.conquistaConclusao) root.LuiggiAchievements.desbloquear(cap.conquistaConclusao);
        save.concluirCapitulo(capId);
        await root.LuiggiDialogue.mostrarRelatorioRealidade(capId, ev.texto);
      }
    }

    if (capId === 15) {
      if (cap.conquistaConclusao) root.LuiggiAchievements.desbloquear(cap.conquistaConclusao);
      save.concluirCapitulo(15);
    }

    root.LuiggiAudio.pararMusica();
    runningChapter = false;

    root.LuiggiStory3D?.pausar();
    if (capId < 15) {
      await root.LuiggiSubaruPOV.abrirSubaruSafepoint(capId);
      root.LuiggiStory3D?.retomar();
      iniciarCapitulo(capId + 1);
    } else {
      await root.LuiggiSubaruPOV.abrirSubaruSafepoint(15);
      await telaVoltandoParaCasaComSubaru();
      root.LuiggiStory3D?.retomar();
      mostrarMenuPrincipal();
    }
  }

  function alternarTelaCheia() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  }

  function esconderMenuPrincipal() {
    const m = document.getElementById('main-menu-overlay');
    if (m) m.classList.add('hidden');
  }

  function mostrarMenuPrincipal() {
    const m = document.getElementById('main-menu-overlay');
    const save = root.LuiggiSave;
    const data = root.LuiggiData.cache;
    const subaru = data.veiculoMap?.get('subaru_legacy');
    const luis = data.personagemMap?.get('luis');
    const fabricio = data.personagemMap?.get('fabricio');
    const temSave = save.temSaveAtivo();
    const totalAchs = data.conquistas?.conquistas?.length || 123;
    const desbAchs = save.state.conquistas.length || 0;
    const menu3D = !!root.LuiggiStory3D?.ativo;
    if (menu3D) root.LuiggiStory3D.voltarAoMenu();
    const dlg = document.getElementById('dialogue-overlay');
    if (dlg) dlg.classList.add('hidden');

    m.classList.remove('hidden');
    m.classList.toggle('menu-3d', menu3D);
    m.innerHTML = `
      <div class="menu-fullscreen-wrap">
        <div class="menu-bg-photo" style="background-image:url('${encodeURI(SAFEPOINT_BG)}')"></div>
        <div class="menu-vignette"></div>

        <div class="menu-showcase-card">
          <div class="menu-left-panel">
            <div class="menu-kicker">VISUAL NOVEL 3D · CURITIBA</div>
            <h1 class="menu-title">LUIGGIBEATS:<br/><span>O DESTINO JÁ FOI ESCRITO</span></h1>
            <p class="menu-tagline">"Dentro do Subaru azul no Safepoint, toda a nossa história em ordem cronológica. Todas as escolhas têm 3 opções. Nenhuma muda o passado. Exceto a última."</p>

            <div class="menu-badges-row">
              <span class="menu-stat-pill">🏆 ${desbAchs}/${totalAchs} Conquistas</span>
              <span class="menu-stat-pill">🍪 ${save.state.contadores.cookiesAssados || 0} Cookies</span>
              <span class="menu-stat-pill">📖 ${save.state.capitulosConcluidos.length}/16 Histórias</span>
            </div>

            <div class="menu-buttons-grid">
              ${temSave
        ? `<button class="mg-btn primary span-2" id="mm-cont">▶ Continuar Jornada (${save.state.capituloAtual === 0 ? 'Prólogo' : 'Cap. ' + save.state.capituloAtual})</button>`
        : ''
      }
              <button class="mg-btn ${temSave ? '' : 'primary span-2'}" id="mm-new">🚙 Novo Jogo (Começar no Subaru · Safepoint)</button>
              <button class="mg-btn ${temSave ? '' : 'span-2'}" id="mm-resenha">🎶 Momento Resenha <small>· 🌐 online</small></button>
              <button class="mg-btn" id="mm-caps">📖 Capítulos</button>
              <button class="mg-btn" id="mm-museum">🏛️ Museu das Memórias</button>
              <button class="mg-btn" id="mm-cfg">⚙️ Configurações</button>
              <button class="mg-btn" id="mm-fs">⛶ Modo Tela Cheia</button>
              <a href="galeria_personagens.html" target="_blank" class="mg-btn span-2" style="text-decoration:none;text-align:center;">🎨 Galeria de Personagens 2D vs Fotos Reais</a>
            </div>

            ${save.state.finalEscolhido === 'ainda_nao_sei'
        ? `<div class="ainda-nao-sei-corner">
                     <small>E aí, Luis... já sabe o que faz?</small>
                     <div class="btn-row" style="margin-top:4px;">
                       <button class="mini-btn" data-rechoose="loop">Voltar</button>
                       <button class="mini-btn" data-rechoose="proximo_capitulo">Terminar</button>
                       <button class="mini-btn" data-rechoose="ainda_nao_sei">Ainda não sei</button>
                     </div>
                   </div>`
        : ''
      }
          </div>

          ${menu3D ? '' : `<div class="menu-right-showcase">
            <div class="menu-duo-stage">
              ${luis && root.LuiggiRig ? root.LuiggiRig.renderVisualNovelSprite(luis, { expressao: 'feliz', speaking: false }) : ''}
              ${fabricio && root.LuiggiRig ? root.LuiggiRig.renderVisualNovelSprite(fabricio, { expressao: 'feliz', speaking: true }) : ''}
            </div>
            <div class="menu-subaru-showcase">
              ${subaru && root.LuiggiRig ? root.LuiggiRig.renderVehicleSVG(subaru) : ''}
              <div class="menu-subaru-caption">Subaru Legacy Azul · Safepoint Curitiba</div>
            </div>
          </div>`}
        </div>
      </div>
    `;

    const cont = document.getElementById('mm-cont');
    if (cont) cont.addEventListener('click', () => iniciarCapitulo(save.state.capituloAtual || 0));

    document.getElementById('mm-new').addEventListener('click', async () => {
      if (temSave && !confirm('Começar um novo jogo do início no Subaru? (Suas conquistas serão mantidas!)')) return;
      save.resetarJogo(true);
      esconderMenuPrincipal();
      root.LuiggiStory3D?.pausar();
      await root.LuiggiSubaruPOV.abrirSubaruSafepoint('intro');
      root.LuiggiStory3D?.retomar();
      iniciarCapitulo(0);
    });
    document.getElementById('mm-resenha').addEventListener('click', async () => {
      esconderMenuPrincipal();
      root.LuiggiStory3D?.pausar();
      await root.LuiggiSubaruPOV.abrirMomentoResenha();
      root.LuiggiStory3D?.retomar();
      mostrarMenuPrincipal();
    });
    document.getElementById('mm-museum').addEventListener('click', () => root.LuiggiMuseum.abrirMuseu('saguao'));
    document.getElementById('mm-caps').addEventListener('click', abrirSeletorCapitulos);
    document.getElementById('mm-cfg').addEventListener('click', abrirConfiguracoes);
    document.getElementById('mm-fs').addEventListener('click', alternarTelaCheia);

    m.querySelectorAll('[data-rechoose]').forEach((b) => {
      b.addEventListener('click', async () => {
        save.state.finalEscolhido = b.dataset.rechoose;
        save.salvar();
        esconderMenuPrincipal();
        await executarFinal(b.dataset.rechoose);
        mostrarMenuPrincipal();
      });
    });
  }

  function abrirSeletorCapitulos() {
    const host = document.getElementById('minigame-overlay');
    const caps = root.LuiggiData.cache.dialogos?.capitulos || [];
    const save = root.LuiggiSave;
    host.classList.remove('hidden');
    host.innerHTML = `
      <div class="mg-modal">
        <div class="mg-header">
          <h3>📖 Selecionar Capítulo</h3>
          <button class="mini-btn" id="cs-close">Fechar</button>
        </div>
        <div class="mg-body">
          <div class="mus-grid">
            ${caps
        .map((c) => {
          const ok = save.state.jogoZerado || c.id <= save.state.capituloMaxDesbloqueado;
          return `
                  <button class="mus-card ${ok ? '' : 'locked'}" ${ok ? `data-play-cap="${c.id}"` : ''} style="text-align:left;cursor:pointer;">
                    <h4>${c.codigo}: ${c.titulo}</h4>
                    <small>${c.era}</small>
                    <div>${ok ? '▶ Jogar' : '🔒 Bloqueado'}</div>
                  </button>`;
        })
        .join('')}
          </div>
          <div style="margin-top:12px;text-align:right;">
            <button class="mini-btn" id="cs-unlock-all">🔓 Desbloquear Todos os Capítulos (Modo Livre)</button>
          </div>
        </div>
      </div>`;
    document.getElementById('cs-close').addEventListener('click', () => {
      host.classList.add('hidden');
      host.innerHTML = '';
    });
    document.getElementById('cs-unlock-all').addEventListener('click', () => {
      save.state.capituloMaxDesbloqueado = 15;
      save.salvar();
      abrirSeletorCapitulos();
    });
    host.querySelectorAll('[data-play-cap]').forEach((b) => {
      b.addEventListener('click', () => {
        host.classList.add('hidden');
        host.innerHTML = '';
        iniciarCapitulo(Number(b.dataset.playCap));
      });
    });
  }

  function abrirConfiguracoes() {
    const host = document.getElementById('minigame-overlay');
    const cfg = root.LuiggiSave.state.config;
    host.classList.remove('hidden');
    host.innerHTML = `
      <div class="mg-modal" style="max-width:480px;">
        <div class="mg-header">
          <h3>⚙️ Configurações</h3>
          <button class="mini-btn" id="cfg-close">Fechar</button>
        </div>
        <div class="mg-body">
          <div class="cfg-list">
            <label>Volume Música: <input type="range" id="cfg-mus" min="0" max="1" step="0.05" value="${cfg.volMusica}" /></label>
            <label>Volume Efeitos: <input type="range" id="cfg-sfx" min="0" max="1" step="0.05" value="${cfg.volSfx}" /></label>
            <label>Volume Vozes: <input type="range" id="cfg-voz" min="0" max="1" step="0.05" value="${cfg.volVozes}" /></label>
            <label>Velocidade do Texto (ms): <input type="range" id="cfg-txt" min="8" max="50" step="2" value="${cfg.velocidadeTexto}" /></label>
            <label>Calibração Latência Hero (ms): <input type="number" id="cfg-lat" value="${cfg.latenciaHeroMs}" style="width:80px;" /></label>
            <label><input type="checkbox" id="cfg-carro" ${cfg.trilhaModoCarro !== false ? 'checked' : ''} /> <strong>🚗 Modo Trilha</strong> (música abafada de carro, mais baixa nos diálogos)</label>
            <label><input type="checkbox" id="cfg-trilha" ${cfg.trilhaAtiva !== false ? 'checked' : ''} /> Tocar as músicas do LuiggiCloud como trilha sonora</label>
            <button class="mini-btn" id="cfg-cloud">☁ Abrir LuiggiCloud</button>
            <label><input type="checkbox" id="cfg-cab" ${cfg.modoCabecao ? 'checked' : ''} /> <strong>Modo Cabeção</strong> (foto real recortada no corpo cartoon!)</label>
          </div>
        </div>
      </div>`;

    const bind = (id, fn) => document.getElementById(id).addEventListener('input', fn);
    bind('cfg-mus', (e) => {
      cfg.volMusica = Number(e.target.value);
      root.LuiggiAudio.aplicarVolumes();
      root.LuiggiSave.salvar();
    });
    bind('cfg-sfx', (e) => {
      cfg.volSfx = Number(e.target.value);
      root.LuiggiAudio.aplicarVolumes();
      root.LuiggiSave.salvar();
    });
    bind('cfg-voz', (e) => {
      cfg.volVozes = Number(e.target.value);
      root.LuiggiAudio.aplicarVolumes();
      root.LuiggiSave.salvar();
    });
    bind('cfg-txt', (e) => {
      cfg.velocidadeTexto = Number(e.target.value);
      root.LuiggiSave.salvar();
    });
    bind('cfg-lat', (e) => {
      cfg.latenciaHeroMs = Number(e.target.value) || 0;
      root.LuiggiSave.salvar();
    });
    document.getElementById('cfg-carro').addEventListener('change', (e) => {
      cfg.trilhaModoCarro = e.target.checked;
      root.LuiggiSave.salvar();
      root.LuiggiCloud?.aplicarModo?.();
      root.LuiggiCloud?.aplicarVolume?.();
    });
    document.getElementById('cfg-trilha').addEventListener('change', (e) => {
      cfg.trilhaAtiva = e.target.checked;
      root.LuiggiSave.salvar();
      if (!e.target.checked) root.LuiggiCloud?.pause?.(true);
    });
    document.getElementById('cfg-cloud').addEventListener('click', () => {
      host.classList.add('hidden');
      host.innerHTML = '';
      root.LuiggiCloud?.abrirPainel?.(true);
    });
    document.getElementById('cfg-cab').addEventListener('change', (e) => {
      cfg.modoCabecao = e.target.checked;
      root.LuiggiSave.salvar();
    });
    document.getElementById('cfg-close').addEventListener('click', () => {
      host.classList.add('hidden');
      host.innerHTML = '';
    });
  }

  async function boot() {
    await root.LuiggiData.carregarTudo();
    iniciarPalco3D();
    root.LuiggiCloud?.init();
    const atalho = aplicarAtalhosDeTeste();
    atualizarHUD();

    // Barra superior aparece só quando o mouse chega no topo da tela
    window.addEventListener('mousemove', (e) => {
      if (e.clientY < 36) document.body.classList.add('hud-visivel');
      else if (e.clientY > 110) document.body.classList.remove('hud-visivel');
    });

    document.getElementById('btn-top-fs').addEventListener('click', alternarTelaCheia);
    document.getElementById('btn-top-museum').addEventListener('click', () => root.LuiggiMuseum.abrirMuseu('saguao'));
    document.getElementById('btn-top-menu').addEventListener('click', () => mostrarMenuPrincipal());
    document.getElementById('btn-top-cfg').addEventListener('click', () => abrirConfiguracoes());

    if (!atalho) mostrarMenuPrincipal();
  }

  // Atalhos por URL (úteis para testar): ?capitulo=3  ·  ?minigame=basquete_maria_clara  ·  ?safepoint=4
  // Convite da Resenha Online: ?resenha=CODIGO
  function aplicarAtalhosDeTeste() {
    const q = new URLSearchParams(location.search);
    if (q.has('resenha')) {
      root.LuiggiStory3D?.pausar();
      setTimeout(async () => {
        await root.LuiggiSubaruPOV.abrirMomentoResenha({ sala: q.get('resenha') });
        root.LuiggiStory3D?.retomar();
        mostrarMenuPrincipal();
      }, 50);
    } else if (q.has('capitulo')) setTimeout(() => iniciarCapitulo(Number(q.get('capitulo'))), 50);
    else if (q.has('minigame')) setTimeout(() => executarMinigame(q.get('minigame'), true).then(() => mostrarMenuPrincipal()), 50);
    else if (q.has('safepoint')) {
      root.LuiggiStory3D?.pausar();
      setTimeout(() => root.LuiggiSubaruPOV.abrirSubaruSafepoint(isNaN(Number(q.get('safepoint'))) ? q.get('safepoint') : Number(q.get('safepoint'))).then(() => mostrarMenuPrincipal()), 50);
    } else return false;
    return true;
  }

  root.LuiggiUI = { atualizarHUD };
  root.LuiggiGame = {
    boot,
    iniciarCapitulo,
    executarMinigame,
    mostrarMenuPrincipal
  };

  window.addEventListener('DOMContentLoaded', boot);
})(window);
