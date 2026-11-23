/**
 * src/engine/MomentoResenha3D.js
 * MOMENTO RESENHA (remake): o Subaru Legacy azul parado na rua do Safepoint, com todo mundo em 3D.
 *
 * - Cada pessoa é um boneco 3D (Luis, Fabricio ou Mateus Buse). Quem ninguém escolheu fica no carro
 *   como "NPC", sentado no banco de sempre (Mateus SEMPRE atrás do passageiro, se o lugar estiver livre).
 * - Dentro do carro: primeira pessoa, sentado por padrão; o mouse mexe o olhar (e a cabeça do boneco,
 *   que os outros veem). F sai do carro pela porta do banco; na rua: WASD/setas andam, Shift corre,
 *   arrastar gira a câmera, F perto do carro entra no banco livre mais próximo.
 * - Modo pose (P): câmera em volta do próprio boneco, clica numa parte do corpo (ou nos pontinhos) e
 *   arrasta pra girar cada articulação: cabeça, pescoço, tronco, quadril, ombros, cotovelos, pulsos,
 *   coxas, joelhos e tornozelos. Tem controles finos (X/Y/Z), poses prontas e "espelhar".
 * - Celular (C): app LuiggiCloud pareado por Bluetooth com o rádio do Subaru (ver ResenhaCelular.js).
 * - Rádio do painel com botões ⏮ ⏯ ⏭ de verdade.
 * - Dá pra DIRIGIR o Subaru pela rua (quem está no banco do motorista): W/S acelera e freia (ré),
 *   A/D vira, Espaço é o freio de mão, V troca pra câmera de fora. "🅿️ Voltar pra vaga" estaciona ele
 *   de novo no lugar de sempre, em frente ao portão. Online, o motorista manda a posição do carro.
 * - Online (ResenhaOnline.js): todo mundo vê o boneco, o banco, a caminhada, a pose e o celular dos
 *   outros. O rádio continua com um anfitrião como fonte da verdade.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;
  const POV = () => root.LuiggiSubaruPOV;
  const SL = () => root.LuiggiSubaruLegacy;

  const PERSONAGENS = {
    luis: { nome: 'Luis', icone: '🧢', banco: 'motorista' },
    fabricio: { nome: 'Fabricio', icone: '🎧', banco: 'passageiro' },
    mateus_buse: { nome: 'Mateus Buse', icone: '🔇', banco: 'tras_dir' }
  };
  const ORDEM_BANCOS = ['motorista', 'passageiro', 'tras_dir', 'tras_esq', 'tras_meio'];
  const ESCALA = 0.85;
  const VEL_ANDAR = 4.4;
  const VEL_CORRER = 4.4;
  // Rua (coordenadas do mundo: o carro fica na origem olhando pra −z; muros em z≈−5, cercas do outro lado em z≈15)
  const RUA = { x0: -34, x1: 34, z0: -4.75, z1: 14.6 };
  const RAIO = 0.28;
  const DIST_ENTRAR = 1.9;
  const OLHAR_BANCO = {
    motorista: { base: 0.3, yawMin: -1.7, yawMax: 2.75 },
    passageiro: { base: -0.2, yawMin: -3.7, yawMax: 1.7 },
    tras_dir: { base: -0.22, yawMin: -1.9, yawMax: 1.5 },
    tras_esq: { base: 0.22, yawMin: -1.5, yawMax: 1.9 },
    tras_meio: { base: 0, yawMin: -1.9, yawMax: 1.9 }
  };
  // Articulações que dá pra posar (o lado "L" do boneco é o lado direito dele)
  const JUNTAS = [
    ['head', 'Cabeça'],
    ['neck', 'Pescoço'],
    ['spine', 'Tronco'],
    ['hips', 'Quadril'],
    ['sR', 'Ombro esq.'],
    ['eR', 'Cotovelo esq.'],
    ['pR', 'Pulso esq.'],
    ['sL', 'Ombro dir.'],
    ['eL', 'Cotovelo dir.'],
    ['pL', 'Pulso dir.'],
    ['hR', 'Coxa esq.'],
    ['kR', 'Joelho esq.'],
    ['tR', 'Tornozelo esq.'],
    ['hL', 'Coxa dir.'],
    ['kL', 'Joelho dir.'],
    ['tL', 'Tornozelo dir.']
  ];
  const NOME_JUNTA = Object.fromEntries(JUNTAS);
  const PARES = [['sL', 'sR'], ['eL', 'eR'], ['pL', 'pR'], ['hL', 'hR'], ['kL', 'kR'], ['tL', 'tR']];
  // Arrastar na tela: [eixo do movimento horizontal, eixo do vertical] (0 = x, 1 = y, 2 = z)
  const EIXOS_ARRASTO = { head: [1, 0], neck: [1, 0], spine: [1, 0], hips: [1, 0], sL: [2, 0], sR: [2, 0], eL: [1, 0], eR: [1, 0], pL: [2, 0], pR: [2, 0], hL: [2, 0], hR: [2, 0], kL: [1, 0], kR: [1, 0], tL: [2, 0], tR: [2, 0] };
  /** Poses prontas (somadas à pose sentada). lado: −1 = banco do lado do motorista, 1 = do passageiro. */
  const POSES_PRONTAS = [
    { id: 'sentado', nome: '🪑 Sentado', ex: () => ({}) },
    { id: 'maos', nome: '🙌 Mãos pro alto', ex: () => ({ sL: [0.42, 0, -2.45], sR: [0.42, 0, 2.45], eL: [0.6, -0.25, 0], eR: [0.6, 0.25, 0], head: [-0.25, 0, 0] }) },
    {
      id: 'janela',
      nome: '😎 Braço na janela',
      ex: (lado) => {
        const s = lado < 0 ? 'R' : 'L';
        const k = s === 'R' ? 1 : -1;
        return { [`s${s}`]: [0.25, 0, k * 1.2], [`e${s}`]: [-0.35, k * -0.25, 0], [`p${s}`]: [0, 0, k * -0.4], head: [0, k * 0.25, 0], spine: [0, 0, k * 0.06] };
      }
    },
    { id: 'paz', nome: '✌️ Paz e amor', ex: () => ({ sR: [-0.9, 0, 0.35], eR: [-0.9, 0.25, 0], pR: [-0.3, 0, 0], head: [0, 0.15, 0.08] }) },
    { id: 'rock', nome: '🤘 Rock', ex: () => ({ sL: [0.1, 0, -1.9], sR: [0.1, 0, 1.9], eL: [-0.9, -0.25, 0], eR: [-0.9, 0.25, 0], head: [-0.3, 0, 0] }) },
    { id: 'pensando', nome: '🤔 Pensando', ex: () => ({ sR: [-0.55, 0, -0.15], eR: [-1.25, 0.2, 0], pR: [0.4, 0, 0], head: [0.15, 0, -0.18], spine: [0.08, 0, 0] }) },
    { id: 'dormindo', nome: '😴 Dormindo', ex: (lado) => ({ head: [0.5, 0, -lado * 0.4], neck: [0.12, 0, 0], spine: [0.06, 0, -lado * 0.08], sL: [0.25, 0, 0.05], sR: [0.25, 0, -0.05] }) },
    { id: 'esticado', nome: '🦵 Esticadão', ex: () => ({ hips: [0.12, 0, 0], spine: [-0.2, 0, 0], hL: [0.35, 0, -0.05], hR: [0.35, 0, 0.05], kL: [-0.85, 0, 0], kR: [-0.85, 0, 0], sL: [0.3, 0, -0.1], sR: [0.3, 0, 0.1] }) }
  ];
  const RESENHA_AMBIENTE_PADRAO = [
    { quem: 'fabricio', fala: 'Aumenta essa aí, Tico!' },
    { quem: 'luis', fala: 'Essa batida é LuiggiBeats raiz.' },
    { quem: 'fabricio', fala: 'Bora ficar só mais cinco minutos aqui no Safepoint.' },
    { quem: 'mateus_buse', fala: '🔇 kkkkkk' },
    { quem: 'luis', fala: 'Alguém quer um Tic Tac? ...Pergunta retórica.' },
    { quem: 'fabricio', fala: 'Tico e Teco e o comentarista mutado. Formação clássica.' }
  ];
  const ACOES_COMPARTILHADAS = ['volante', 'buzina', 'portaluvas', 'tictac'];
  const ACOES_RADIO = { radio: 'next', radio_next: 'next', radio_prev: 'prev', radio_toggle: 'toggle' };
  const CMDS_RADIO = ['next', 'prev', 'toggle', 'faixa', 'seek', 'estacao'];

  const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const r2 = (v) => Math.round(v * 100) / 100;
  const lerLocal = (k) => {
    try {
      return localStorage.getItem(k) || '';
    } catch (_) {
      return '';
    }
  };
  const gravarLocal = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (_) { }
  };
  /** Diferença entre dois ângulos no intervalo (−π, π]. */
  const difAng = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  /** Limpa as rotações extras que chegam pela rede. */
  function limparExtras(ex) {
    const out = {};
    if (!ex || typeof ex !== 'object') return out;
    JUNTAS.forEach(([k]) => {
      const v = ex[k];
      if (!Array.isArray(v)) return;
      const t = [0, 1, 2].map((i) => Math.max(-Math.PI, Math.min(Math.PI, Number(v[i]) || 0)));
      if (t.some((n) => Math.abs(n) > 0.001)) out[k] = t;
    });
    return out;
  }

  // ==================================================================
  // ABRIR O MOMENTO RESENHA
  // ==================================================================
  /** Tela de carregamento (fica por cima até o primeiro quadro 3D aparecer). */
  function telaCarregando(texto, frac) {
    const ov = document.getElementById('safepoint-overlay');
    if (!ov) return;
    let el = document.getElementById('rs-carregando');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rs-carregando';
      el.className = 'rs-carregando';
      el.innerHTML = '<div class="rs-carr-caixa"><strong>🎶 Momento Resenha</strong><span class="rs-carr-txt"></span><div class="rs-carr-barra"><i></i></div><small>Na primeira vez o bairro inteiro é baixado (~0,7 MB) e montado.</small></div>';
      document.body.appendChild(el);
    }
    el.querySelector('.rs-carr-txt').textContent = texto;
    el.querySelector('.rs-carr-barra i').style.width = `${Math.round(Math.max(0.05, Math.min(1, frac)) * 100)}%`;
  }
  function fecharCarregando() {
    document.getElementById('rs-carregando')?.remove();
  }
  /** Deixa a tela desenhar (a montagem da cena é pesada e bloqueia). */
  const respirar = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

  /** Abre o Momento Resenha (antes carrega o bairro, que não vem mais junto com o site). */
  async function abrir(opcoes = {}) {
    telaCarregando('Baixando o mapa do bairro…', 0.15);
    await respirar();
    try {
      if (root.LuiggiBairro?.carregarDados) {
        const ok = await root.LuiggiBairro.carregarDados();
        if (!ok) telaCarregando('Não deu pra baixar o bairro; abrindo só a rua da casa…', 0.4);
      }
    } catch (_) { }
    telaCarregando('Montando a rua, as casas e o Subaru…', 0.55);
    await respirar();
    let promessa;
    try {
      promessa = abrirAgora(opcoes);
    } catch (e) {
      fecharCarregando();
      throw e;
    }
    // Some quando a cena já apareceu (ou depois de um tempo, por garantia)
    telaCarregando('Quase lá…', 0.9);
    const ate = performance.now() + 8000;
    const vigiar = () => {
      if (window.__resenha3D?.stage?.elapsed > 0.3 || performance.now() > ate) fecharCarregando();
      else setTimeout(vigiar, 120);
    };
    vigiar();
    return promessa.finally(fecharCarregando);
  }
  function abrirAgora(opcoes = {}) {
    return new Promise((resolve) => {
      const THREE = root.THREE;
      const U = L().U;
      const ASSENTOS = SL().ASSENTOS;
      const CAIXA = SL().CAIXA;
      const ov = document.getElementById('safepoint-overlay');
      const map = root.LuiggiData.cache.personagemMap;
      const cloud = () => (root.LuiggiCloud?.ativo ? root.LuiggiCloud : null);
      const Online = root.LuiggiResenhaOnline;
      const ESTILOS_RADIO = POV().ESTILOS_RADIO;
      const NOMES_RADIO = POV().NOMES_RADIO;
      const AMBIENTE = POV().RESENHA_AMBIENTE || RESENHA_AMBIENTE_PADRAO;
      const toque = root.matchMedia?.('(pointer: coarse)').matches;

      root.LuiggiAudio.tocarEstiloSintetizado('lofi', 98);
      document.body.classList.add('resenha-aberta');
      ov.classList.remove('hidden');
      ov.innerHTML = `
        <div class="sp3d-shell resenha-shell rs3-shell" id="rs-shell">
          <div class="sp3d-view" id="rs-view"></div>
          <div class="rs-tags" id="rs-tags"></div>
          <div class="sp3d-topbar">
            <div class="sp3d-local"><span>🎶 Momento Resenha</span><small id="rs-pov-lbl"></small></div>
            <div class="btn-row rs-povs">
              ${Object.entries(PERSONAGENS).map(([id, p], i) => `<button class="mini-btn" data-pers="${id}" title="Ser o ${p.nome} (${i + 1})">${p.icone} ${p.nome}<span class="rs-pov-n" data-pers-n="${id}"></span></button>`).join('')}
              ${root.LuiggiResenhaConvidados ? '<button class="mini-btn" id="rs-conv-btn" title="Colocar mais gente no banco de trás">➕ Banco de trás</button>' : ''}
              <button class="mini-btn" id="rs-classico" title="Modo clássico: só o pessoal dentro do carro, sem andar pela rua">🎴 Clássico</button>
              <button class="mini-btn rs-online-btn" id="rs-online-btn" title="Resenha Online: várias pessoas no mesmo Subaru">🌐 Online</button>
              <button class="mini-btn" id="rs-duelos-btn" title="Duelos 1x1 / 2x2, friendly fire e placar">⚔️ Duelos</button>
              <button class="mini-btn" id="rs-config-btn" title="Voltar ao menu, gráficos, som e teclas (Esc)">⚙️ Configurações</button>
            </div>
          </div>
          <div class="rs-online rs-config hidden" id="rs-config"></div>
          <div class="rs-online hidden" id="rs-online">
            <div class="rs-on-head"><strong>🌐 Resenha Online</strong><button class="mini-btn" id="rs-on-fechar" title="Fechar">✕</button></div>
            <div id="rs-on-corpo"></div>
          </div>
          <div class="rs-pose hidden" id="rs-pose">
            <div class="rs-on-head"><strong>🦾 Modo pose</strong><button class="mini-btn" id="rs-pose-fechar" title="Terminar (P)">✓ Pronto</button></div>
            <small class="rs-on-dica">Clique numa parte do corpo (ou num pontinho) e arraste pra girar. Arrastar no vazio gira a câmera; a rodinha aproxima. Todo mundo na sala vê a sua pose.</small>
            <div class="rs-pose-juntas" id="rs-pose-juntas">${JUNTAS.map(([k, n]) => `<button class="rs-junta" data-junta="${k}">${n}</button>`).join('')}</div>
            <div class="rs-pose-sel" id="rs-pose-sel">Nenhuma parte escolhida</div>
            <div class="rs-pose-sliders">
              ${['Frente / trás', 'Girar', 'De lado'].map((n, i) => `<label>${n}<input type="range" min="-180" max="180" step="1" value="0" data-eixo="${i}"><output data-eixo-v="${i}">0°</output></label>`).join('')}
            </div>
            <div class="rs-pose-btns"><button class="mini-btn" id="rs-pose-zerar1">↺ Esta parte</button><button class="mini-btn" id="rs-pose-zerar">↺ Tudo</button><button class="mini-btn" id="rs-pose-espelhar">🪞 Espelhar</button></div>
            <div class="rs-pose-prontas">${POSES_PRONTAS.map((p) => `<button class="chip-btn" data-pronta="${p.id}">${p.nome}</button>`).join('')}</div>
          </div>
          <div class="rs-bancos hidden" id="rs-bancos"></div>
          <div class="rs-dica-andar hidden" id="rs-dica-andar">${toque ? '🕹️ Arraste o controle pra andar · arraste a tela pra girar a câmera' : '⌨️ <b>WASD</b>/setas andam · <b>Shift</b> corre · <b>arraste</b> pra girar a câmera · <b>rodinha</b> aproxima · <b>F</b> entra no carro'}</div>
          <div class="rs-joy hidden" id="rs-joy"><div class="rs-joy-bola" id="rs-joy-bola"></div></div>
          <div class="rs-velo hidden" id="rs-velo">0 km/h</div>
          <div class="rs-mapa hidden" id="rs-mapa" title="Mapa do bairro (clique pra aumentar)"><canvas id="rs-mapa-cv" width="360" height="360"></canvas><div class="rs-rua" id="rs-rua"></div></div>
          <div class="sp3d-tooltip hidden" id="rs-tip"></div>
          <div class="sp3d-dialog">
            <div class="sp3d-portrait" id="rs-portrait"></div>
            <div class="sp3d-body">
              <div class="sp3d-speaker" id="rs-speaker"></div>
              <div class="sp3d-text" id="rs-text"></div>
              <div class="sp3d-gadgets rs-acoes" id="rs-acoes"></div>
            </div>
            <div class="sp3d-actions rs-musica">
              <div class="rs-faixa" id="rs-faixa">📻 Rádio</div>
              <div class="btn-row">
                <button class="mg-btn" id="rs-prev" title="Voltar faixa">⏮</button>
                <button class="mg-btn primary" id="rs-play" title="Tocar / pausar">⏯</button>
                <button class="mg-btn" id="rs-next" title="Próxima">⏭</button>
              </div>
              ${root.LuiggiResenhaCelular?.volume?.html() || ''}
            </div>
          </div>
        </div>`;

      const shell = document.getElementById('rs-shell');
      const view = document.getElementById('rs-view');
      const txtEl = document.getElementById('rs-text');
      const spkEl = document.getElementById('rs-speaker');
      const portraitEl = document.getElementById('rs-portrait');
      const faixaEl = document.getElementById('rs-faixa');
      const acoesEl = document.getElementById('rs-acoes');
      const painelOnline = document.getElementById('rs-online');
      const painelPose = document.getElementById('rs-pose');
      const painelBancos = document.getElementById('rs-bancos');
      const dicaAndar = document.getElementById('rs-dica-andar');
      const tip = document.getElementById('rs-tip');
      const tagsHost = document.getElementById('rs-tags');
      const veloEl = document.getElementById('rs-velo');
      const mapaEl = document.getElementById('rs-mapa');
      const ruaEl = document.getElementById('rs-rua');
      // Volume da música: individual, cada um no seu aparelho (não vai pra rede)
      const VOL = root.LuiggiResenhaCelular?.volume;
      const desligarVolume = VOL ? VOL.ligar(shell) : () => { };
      let ultimaInteracao = performance.now();

      function falar(texto, quem = null, rotulo = null) {
        txtEl.textContent = texto;
        if (quem) {
          const p = map.get(quem);
          spkEl.textContent = `${PERSONAGENS[quem]?.icone || ''} ${p?.nome || quem}`;
          if (p) portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(p, { expressao: 'feliz', speaking: true });
        } else if (rotulo) spkEl.textContent = rotulo;
      }
      const avisoOnline = (texto) => falar(texto, null, '🌐 Resenha Online');

      // ---------------- Palco, rua e carro ----------------
      // Valores de segurança: se o motor vier de outra versão (cache), nada fica indefinido
      const perfilBase = L().perfilQualidade?.() || {};
      const perfilGfx = {
        ...perfilBase,
        distancia: Number(perfilBase.distancia) > 0 ? Number(perfilBase.distancia) : 290,
        retrovisor: Number.isFinite(perfilBase.retrovisor) ? perfilBase.retrovisor : 2,
        cssLeve: !!perfilBase.cssLeve
      };
      const stage = L().createStage(view, { radius: '0', fov: 68, near: 0.02, far: perfilGfx.distancia + 170, fillIntensity: 0.6, fillColor: '#9fb4ff', shadowBounds: 26 });
      // O bairro inteiro (da casa até a R. Fagundes Varela) entra junto com a rua
      const env = root.Luiggi3DEnv.build('safepoint', { semSubaru: true, bairro: true });
      const vaga = env.vaga || [0, 0, -1];
      if (env.alinharNaVaga) env.alinharNaVaga();
      else env.group.position.set(-vaga[0], 0, -vaga[2]);
      env.group.updateMatrixWorld(true);
      // Limites da rua (curva) vindos do cenário: converte mundo ↔ coordenadas do cenário
      const vLim = new THREE.Vector3();
      function limitarNaRua(p) {
        if (!env.limitarAndar) {
          p.x = Math.max(RUA.x0, Math.min(RUA.x1, p.x));
          p.z = Math.max(RUA.z0, Math.min(RUA.z1, p.z));
          return p;
        }
        vLim.set(p.x, 0, p.z);
        env.group.worldToLocal(vLim);
        const q = env.limitarAndar(vLim.x, vLim.z);
        vLim.set(q.x, 0, q.z);
        env.group.localToWorld(vLim);
        p.x = vLim.x;
        p.z = vLim.z;
        return p;
      }
      stage.scene.add(env.group);
      root.Luiggi3DEnv.aplicar(stage, env);
      stage.setGrade(env.dia ? { vignette: 0.6, bloom: 0.4, threshold: 1.4 } : { vignette: 0.85, bloom: 1.1 });
      const interior = POV().construirInterior({ exterior: true });
      // Desempenho: o interior tem centenas de pecinhas paradas; junta por material (o que mexe ou é clicável fica separado)
      if (root.LuiggiRuaSafepoint?.juntarEstaticos) {
        // Partes que se mexem (ficam como estão) e partes que somem/aparecem juntas (cada uma é juntada por dentro)
        const mexem = [interior.volante, interior.portaLuvas, interior.consoleTampa, interior.retro, interior.aromatizante, interior.chaveiro, interior.cookieMini, interior.camRetro, ...[].concat(interior.rodas || []), ...[].concat(interior.bancosFrente || [])].filter(Boolean);
        const blocosCarro = [interior.teto, interior.exterior, interior.laterais].filter(Boolean);
        const dentroDe = (m, raiz, lista) => {
          for (let p = m; p && p !== raiz; p = p.parent) if (lista.includes(p)) return true;
          return false;
        };
        const J = root.LuiggiRuaSafepoint.juntarEstaticos;
        J(interior.group, { pular: (m) => dentroDe(m, interior.group, mexem) || dentroDe(m, interior.group, blocosCarro) });
        blocosCarro.forEach((b) => J(b, { pular: (m) => dentroDe(m, b, mexem) }));
        // Pecinhas pequenas do painel não precisam projetar sombra
        interior.group.traverse((m) => {
          if (!m.isMesh || !m.castShadow) return;
          if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
          if (m.geometry.boundingSphere.radius < 0.12 && !m.userData.juntado) m.castShadow = false;
        });
      }
      // O Subaru inteiro (interior + lataria) num grupo que anda; bancos, câmera e portas são relativos a ele
      const carroGrupo = new THREE.Group();
      carroGrupo.add(interior.group);
      interior.group.add(interior.camRetro);
      stage.scene.add(carroGrupo);
      const carro = { x: 0, z: 0, yaw: 0, vel: 0, volante: 0, alvo: null, parado: 99 };
      const VEL_MAX = 16.7; // ~60 km/h
      const VEL_RE = 5;
      const ENTRE_EIXOS = 2.7;
      function aplicarPoseCarro() {
        carroGrupo.position.set(carro.x, 0, carro.z);
        carroGrupo.rotation.y = carro.yaw;
        carroGrupo.updateMatrixWorld(true);
      }
      const doCarro = (v) => carroGrupo.localToWorld(v);
      const praoCarro = (v) => carroGrupo.worldToLocal(v);
      const controle = POV().criarControleCarro(interior, { stage });
      controle.st.sintetizadoTocando = !cloud();
      const picker = L().createPicker(stage);
      const ehExterior = (o) => {
        for (let p = o; p; p = p.parent) if (p === interior.exterior) return true;
        return false;
      };
      let clicaveis = { dentro: [], fora: [] };
      function recalcularClicaveis() {
        const todos = POV().clicaveisDo(interior);
        clicaveis = { dentro: todos.filter((o) => !ehExterior(o)), fora: todos.filter(ehExterior) };
      }

      // ==================================================================
      // BONECOS
      // ==================================================================
      const avatares = new Map(); // id (pessoa ou 'npc:pid') -> avatar
      const tmpV = new THREE.Vector3();

      function novoAvatar(id, pid, o = {}) {
        const ch = map.get(pid) || map.get('luis');
        const b = root.Luiggi3DChar.create(ch, { escala: ESCALA });
        b.setPose('sit_car');
        stage.scene.add(b.group);
        const a = {
          id,
          pid,
          b,
          eu: !!o.eu,
          npc: !!o.npc,
          nome: o.nome || PERSONAGENS[pid]?.nome || pid,
          modo: 'carro',
          banco: o.banco || PERSONAGENS[pid]?.banco || 'motorista',
          pos: new THREE.Vector3(),
          alvo: new THREE.Vector3(),
          rot: Math.PI,
          rotAlvo: Math.PI,
          anim: 'idle',
          aw: 0,
          extras: {},
          cel: false,
          curtir: false,
          olhar: [0, 0],
          falandoAte: 0,
          tag: null,
          celular3D: null,
          marcadores: null,
          primeiro: true
        };
        if (!a.eu && !a.npc) {
          a.tag = document.createElement('div');
          a.tag.className = 'rs-tag hidden';
          tagsHost.appendChild(a.tag);
        }
        // Clique num boneco: descobre quem é
        b.group.userData.avatarId = id;
        avatares.set(id, a);
        return a;
      }

      function removerAvatar(id) {
        const a = avatares.get(id);
        if (!a) return;
        stage.scene.remove(a.b.group);
        a.b.dispose();
        L().disposeObject?.(a.b.group);
        a.tag?.remove();
        avatares.delete(id);
      }

      /** Troca o personagem (boneco) de um avatar mantendo o resto. */
      function trocarBoneco(a, pid) {
        if (a.pid === pid) return;
        stage.scene.remove(a.b.group);
        a.b.dispose();
        a.celular3D = null;
        a.marcadores = null;
        const ch = map.get(pid) || map.get('luis');
        a.b = root.Luiggi3DChar.create(ch, { escala: ESCALA });
        a.b.setPose(a.modo === 'carro' ? 'sit_car' : 'idle');
        a.b.group.userData.avatarId = a.id;
        stage.scene.add(a.b.group);
        a.pid = pid;
        a.primeiro = true;
      }

      /** Ponto na calçada ao lado da porta de um banco. */
      function pontoDaPorta(banco) {
        const s = ASSENTOS[banco];
        const v = doCarro(new THREE.Vector3(s.lado * (CAIXA.x1 + 0.45), 0, s.z + (s.tras ? 0.05 : -0.05)));
        v.y = 0;
        return v;
      }

      function celularDo(a) {
        if (!a.celular3D) {
          a.celular3D = root.LuiggiResenhaCelular?.criarCelular3D();
          if (a.celular3D) {
            a.celular3D.position.set(0, -0.06, 0.03);
            a.celular3D.rotation.set(-1.25, Math.PI, 0);
            a.b.maoDireita.add(a.celular3D);
          }
        }
        return a.celular3D;
      }

      /** Pose final = pose sentada + pose do jogador + celular + curtir o som + olhar. */
      function extrasDe(a, t) {
        const out = {};
        const soma = (k, v) => {
          const e = out[k] || (out[k] = [0, 0, 0]);
          e[0] += v[0];
          e[1] += v[1];
          e[2] += v[2];
        };
        if (a.modo === 'carro') Object.entries(a.extras).forEach(([k, v]) => soma(k, v));
        if (a.curtir && a.modo === 'carro') {
          const b = t * Math.PI * 2 * (96 / 60);
          soma('head', [Math.max(0, Math.sin(b)) * 0.18, Math.sin(b * 0.5) * 0.12, 0]);
          soma('spine', [0, 0, Math.sin(b * 0.5) * 0.07]);
          soma('sL', [0, 0, -Math.abs(Math.sin(b)) * 0.12]);
          soma('sR', [0, 0, Math.abs(Math.sin(b)) * 0.12]);
        }
        if (a.cel) {
          // Braço com o celular na frente do rosto, cabeça olhando pra tela
          delete out.sR;
          delete out.eR;
          delete out.pR;
          if (a.modo === 'carro') {
            soma('sR', [-0.35, 0, -0.38]);
            soma('eR', [-1.0, 0.25, 0]);
          } else {
            soma('sR', [-0.75, 0, -0.42]);
            soma('eR', [-1.55, 0.2, 0]);
          }
          soma('head', [0.32, 0, 0]);
        }
        return out;
      }

      function atualizarAvatar(a, dt, t) {
        const b = a.b;
        if (a.modo === 'carro') {
          const s = ASSENTOS[a.banco] || ASSENTOS.motorista;
          doCarro(a.alvo.set(s.x, s.y - 0.44 * b.escala, s.z));
          a.rotAlvo = Math.PI + carro.yaw;
          if (b.pose !== 'sit_car') b.setPose('sit_car');
        } else {
          const morto = a.eu ? combate?.morto : a.morto;
          const pose = morto ? 'ko' : a.anim === 'walk' ? 'walk' : a.anim === 'run' ? 'run' : a.anim === 'dance' ? 'dance' : 'idle';
          if (b.pose !== pose) b.setPose(pose, a.anim === 'run' ? 1.1 : 1);
        }
        // Dentro do carro o boneco vai colado no banco (o carro pode estar andando)
        if (a.eu || a.primeiro || a.modo === 'carro' || a.pos.distanceTo(a.alvo) > 4) a.pos.copy(a.alvo);
        else U.dampVec3(a.pos, a.alvo, 12, dt);
        if (a.primeiro || a.modo === 'carro') a.rot = a.rotAlvo;
        a.rot += difAng(a.rot, a.rotAlvo) * (1 - Math.exp(-12 * dt));
        a.primeiro = false;
        b.group.position.copy(a.pos);
        b.group.rotation.y = a.rot;
        const ex = extrasDe(a, t);
        if (combate) Object.entries(combate.extrasDe(a)).forEach(([k, v]) => {
          const e = ex[k] || (ex[k] = [0, 0, 0]);
          e[0] += v[0];
          e[1] += v[1];
          e[2] += v[2];
        });
        b.setExtras(ex);
        // Cabeça segue o olhar (dentro do carro); o resto do giro vai pro tronco
        if (a.modo === 'carro' && !a.npc) {
          const yaw = a.olhar[0] - (OLHAR_BANCO[a.banco]?.base || 0) * 0.3;
          const cab = Math.max(-1.25, Math.min(1.25, -yaw));
          b.lookAt(cab, Math.max(-0.6, Math.min(0.7, -a.olhar[1] - 0.1)));
        } else if (!a.npc) b.lookAt(0, 0);
        const cel = a.cel ? celularDo(a) : a.celular3D;
        if (cel) {
          cel.visible = a.cel;
          if (a.cel && (cel.userData.t = (cel.userData.t || 0) + dt) > 1.5) {
            cel.userData.t = 0;
            cel.redraw?.(cel.userData.desenhar);
          }
        }
        b.setTalking(a.falandoAte > t);
        b.update(dt);
      }

      // ==================================================================
      // EU (jogador local)
      // ==================================================================
      // Convidados do banco de trás (ResenhaConvidados.js): sozinho fica salvo; online quem manda é o anfitrião
      const Conv = root.LuiggiResenhaConvidados;
      // Vindo do outro modo, continua com os mesmos convidados (sem avisar de novo)
      let convidados = Conv ? (opcoes.convidados ? Conv.limpar(opcoes.convidados) : Conv.ler()) : {};
      let ultimoConvPor = null;
      let painelConv = null;
      const persSalvo = lerLocal('luiggi_resenha_pers');
      const eu = novoAvatar('eu', PERSONAGENS[persSalvo] ? persSalvo : 'luis', { eu: true, nome: 'Você' });
      eu.banco = 'motorista';
      let modoCam = 'carro'; // 'carro' (primeira pessoa) | 'pe' (terceira pessoa na rua) | 'pose'
      const cam = { yaw: OLHAR_BANCO.motorista.base, pitch: -0.1, mx: 0, my: 0, foco: null, focoNome: null };
      const orb = { yaw: 0, pitch: 0.28, dist: 3.4, alvo: new THREE.Vector3(), pos: new THREE.Vector3() };
      const teclas = new Set();
      const joy = { x: 0, y: 0, ativo: false };
      let correrToggle = false;

      function bancoLivre(banco, ignorar = null) {
        if (convidados[banco]) return false; // lugar reservado pra um convidado
        for (const a of avatares.values()) if (a !== ignorar && !a.npc && a.modo === 'carro' && a.banco === banco) return false;
        return true;
      }
      const bancosLivres = (ignorar = null) => ORDEM_BANCOS.filter((b) => bancoLivre(b, ignorar));

      /** Quem ninguém escolheu fica no carro como NPC (no banco de sempre, se estiver livre). */
      function atualizarNPCs() {
        const jogadores = [...avatares.values()].filter((a) => !a.npc);
        const usados = new Set(jogadores.map((a) => a.pid));
        const ocupados = new Set(jogadores.filter((a) => a.modo === 'carro').map((a) => a.banco));
        // Convidados do banco de trás (somem enquanto tem alguém sentado no lugar deles)
        (Conv ? Conv.SLOTS : []).forEach((slot) => {
          const id = `conv:${slot}`;
          const pid = convidados[slot];
          if (!pid || ocupados.has(slot)) return removerAvatar(id);
          ocupados.add(slot);
          let a = avatares.get(id);
          if (a) trocarBoneco(a, pid);
          else {
            a = novoAvatar(id, pid, { npc: true, banco: slot });
            a.conv = true;
          }
          a.banco = slot;
          a.nome = Conv.nome(pid);
        });
        const livres = Object.entries(PERSONAGENS).filter(([pid]) => !usados.has(pid));
        Object.keys(PERSONAGENS).forEach((pid) => usados.has(pid) && removerAvatar(`npc:${pid}`));
        // Primeiro quem tem o banco de sempre livre; depois os desalojados, no primeiro lugar que sobrar
        const escolha = {};
        livres.forEach(([pid, p]) => {
          if (!ocupados.has(p.banco)) {
            escolha[pid] = p.banco;
            ocupados.add(p.banco);
          }
        });
        livres.forEach(([pid]) => {
          if (escolha[pid]) return;
          const b = ORDEM_BANCOS.find((x) => !ocupados.has(x));
          if (b) {
            escolha[pid] = b;
            ocupados.add(b);
          }
        });
        livres.forEach(([pid]) => {
          const id = `npc:${pid}`;
          const banco = escolha[pid];
          if (!banco) return removerAvatar(id);
          const a = avatares.get(id) || novoAvatar(id, pid, { npc: true, banco });
          a.banco = banco;
        });
      }

      // ---------------- Câmera ----------------
      const dirV = new THREE.Vector3();
      const olhoAlvo = new THREE.Vector3();
      const raioCam = new THREE.Ray();
      const caixaCarro = new THREE.Box3(new THREE.Vector3(CAIXA.x0, 0, CAIXA.z0), new THREE.Vector3(CAIXA.x1, 1.56, CAIXA.z1));
      const invCarro = new THREE.Matrix4();
      const raioLocal = new THREE.Ray();
      const EIXO_Y = new THREE.Vector3(0, 1, 0);
      const olhoLocal = new THREE.Vector3();
      let olhoBanco = null;
      let camFora = false; // V: câmera de fora, atrás do carro
      const camForaPos = new THREE.Vector3();
      const camForaAlvo = new THREE.Vector3();
      const limitar = (yaw) => {
        const o = OLHAR_BANCO[eu.banco] || OLHAR_BANCO.motorista;
        return Math.max(o.yawMin, Math.min(o.yawMax, yaw));
      };
      const yawEquivalente = (yaw) => {
        let melhor = limitar(yaw);
        let erro = Infinity;
        [yaw, yaw - Math.PI * 2, yaw + Math.PI * 2].forEach((y) => {
          const e = Math.abs(limitar(y) - y);
          if (e < erro) {
            erro = e;
            melhor = limitar(y);
          }
        });
        return melhor;
      };
      /** Primeira pessoa: vira a cabeça pra um ponto (ou volta pra frente). */
      function mirarEm(nome) {
        let p = null;
        if (nome === 'console') p = [0, 0.5, 0.15];
        else if (nome && nome !== 'frente') {
          const alvoA = [...avatares.values()].find((a) => a !== eu && a.modo === 'carro' && (a.pid === nome || a.id === nome));
          if (alvoA) p = [alvoA.pos.x, alvoA.pos.y + 0.95, alvoA.pos.z];
        }
        if (!p || modoCam !== 'carro') {
          cam.foco = null;
          cam.focoNome = null;
          return;
        }
        if (nome === 'console') {
          doCarro(tmpV.set(p[0], p[1], p[2]));
          p = [tmpV.x, tmpV.y, tmpV.z];
        }
        // Direção nas coordenadas do carro (ele pode estar virado)
        const d = new THREE.Vector3(...p).sub(stage.camera.position).applyAxisAngle(EIXO_Y, -carro.yaw);
        cam.foco = { yaw: yawEquivalente(Math.atan2(d.x, -d.z)), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)), mx: cam.mx, my: cam.my };
        cam.focoNome = nome;
      }

      function atualizarCamera(dt, t) {
        const c = stage.camera;
        if (modoCam === 'carro') {
          const lim = OLHAR_BANCO[eu.banco] || OLHAR_BANCO.motorista;
          let yawAlvo;
          let pitchAlvo;
          if (cam.foco) {
            yawAlvo = cam.foco.yaw;
            pitchAlvo = cam.foco.pitch;
          } else {
            const k = Math.sign(cam.mx) * Math.pow(Math.abs(cam.mx), 1.5);
            yawAlvo = lim.base + (k >= 0 ? k * (lim.yawMax - lim.base) : -k * (lim.yawMin - lim.base));
            pitchAlvo = Math.max(-0.85, Math.min(0.45, -0.17 - cam.my * 0.6));
          }
          cam.yaw = U.damp(cam.yaw, limitar(yawAlvo), 4, dt);
          cam.pitch = U.damp(cam.pitch, pitchAlvo, 4, dt);
          const s = ASSENTOS[eu.banco];
          const olho = s.olho;
          const centro = olho[0] > 0.05 ? -1 : olho[0] < -0.05 ? 1 : 0;
          const k = centro && Math.sign(cam.yaw) === centro ? Math.min(1, Math.max(0, (Math.abs(cam.yaw) - 1.0) / 1.5)) : 0;
          const tremor = controle.st.rpm > 2500 ? (Math.random() - 0.5) * 0.004 : 0;
          olhoAlvo.set(olho[0] + centro * 0.14 * k, olho[1] + 0.08 * k + Math.sin(t * 1.6) * 0.003 + tremor, olho[2] + 0.05 * k);
          if (olhoBanco !== eu.banco) {
            olhoBanco = eu.banco;
            olhoLocal.copy(olhoAlvo);
          }
          U.dampVec3(olhoLocal, olhoAlvo, 6, dt);
          eu.olhar = [cam.yaw, cam.pitch];
          if (camFora) {
            // Atrás e acima do carro, olhando um pouco à frente dele
            doCarro(camForaPos.set(0, 2.7, 7.4));
            doCarro(camForaAlvo.set(0, 1.0, -3));
            U.dampVec3(c.position, camForaPos, 5, dt);
            if (c.position.y < 0.6) c.position.y = 0.6;
            c.lookAt(camForaAlvo);
            return;
          }
          // Primeira pessoa: o olho fica preso ao banco do carro (que pode estar andando)
          c.position.copy(olhoLocal);
          doCarro(c.position);
          dirV.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch)).applyAxisAngle(EIXO_Y, carro.yaw);
          c.lookAt(c.position.x + dirV.x, c.position.y + dirV.y, c.position.z + dirV.z);
          return;
        }
        // Terceira pessoa (rua) e modo pose: câmera orbitando
        if (modoCam === 'pose') {
          eu.b.joints.hips.getWorldPosition(tmpV);
          orb.alvo.copy(tmpV).add(new THREE.Vector3(0, 0.22, 0));
        } else orb.alvo.set(eu.pos.x, eu.pos.y + 1.25, eu.pos.z);
        const ajuste = modoCam === 'pe' ? combate?.ajusteCamera() : null;
        if (ajuste?.primeiraPessoa) {
          // Luneta da AWP: olho do boneco
          eu.b.cabeca.getWorldPosition(c.position);
          c.position.y += 0.06;
          const cpp = Math.cos(orb.pitch);
          c.lookAt(c.position.x - Math.sin(orb.yaw) * cpp, c.position.y - Math.sin(orb.pitch), c.position.z - Math.cos(orb.yaw) * cpp);
          eu.b.cabeca.visible = false;
          return;
        }
        if (modoCam === 'pe') eu.b.cabeca.visible = true;
        if (ajuste) {
          // Sobre o ombro direito
          orb.alvo.x += Math.cos(orb.yaw) * ajuste.ombro;
          orb.alvo.z -= Math.sin(orb.yaw) * ajuste.ombro;
          orb.alvo.y += ajuste.altura;
        }
        const cp = Math.cos(orb.pitch);
        let dist = ajuste ? ajuste.dist : orb.dist;
        if (modoCam === 'pe') {
          // Se o Subaru ficar entre a câmera e o boneco, a câmera chega mais perto
          raioCam.origin.copy(orb.alvo);
          raioCam.direction.set(Math.sin(orb.yaw) * cp, Math.sin(orb.pitch), Math.cos(orb.yaw) * cp);
          invCarro.copy(carroGrupo.matrixWorld).invert();
          raioLocal.copy(raioCam).applyMatrix4(invCarro);
          if (!caixaCarro.containsPoint(raioLocal.origin) && raioLocal.intersectBox(caixaCarro, tmpV)) dist = Math.max(0.6, Math.min(dist, tmpV.distanceTo(raioLocal.origin) - 0.2));
        }
        orb.pos.set(orb.alvo.x + Math.sin(orb.yaw) * cp * dist, orb.alvo.y + Math.sin(orb.pitch) * dist, orb.alvo.z + Math.cos(orb.yaw) * cp * dist);
        if (orb.pos.y < 0.25) orb.pos.y = 0.25;
        U.dampVec3(c.position, orb.pos, modoCam === 'pose' ? 10 : 8, dt);
        c.lookAt(orb.alvo);
      }

      // ---------------- Andar na rua ----------------
      const tmpL = new THREE.Vector3();
      function colidir(p) {
        limitarNaRua(p);
        // Carroceria do Subaru (caixa, nas coordenadas do carro, que pode estar em qualquer lugar) empurra pra fora
        const q = praoCarro(tmpL.set(p.x, 0, p.z));
        const cx = Math.max(CAIXA.x0, Math.min(CAIXA.x1, q.x));
        const cz = Math.max(CAIXA.z0, Math.min(CAIXA.z1, q.z));
        const dx = q.x - cx;
        const dz = q.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < RAIO) {
          if (d > 1e-4) {
            q.x = cx + (dx / d) * RAIO;
            q.z = cz + (dz / d) * RAIO;
          } else {
            // Dentro da caixa: sai pelo lado mais perto
            const opcoes = [[CAIXA.x0 - RAIO - q.x, 0], [CAIXA.x1 + RAIO - q.x, 0], [0, CAIXA.z0 - RAIO - q.z], [0, CAIXA.z1 + RAIO - q.z]];
            opcoes.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
            q.x += opcoes[0][0];
            q.z += opcoes[0][1];
          }
          doCarro(q);
          p.x = q.x;
          p.z = q.z;
        }
        // Os outros bonecos na rua também ocupam espaço
        avatares.forEach((o) => {
          if (o === eu || o.modo !== 'pe') return;
          const ex = p.x - o.pos.x;
          const ez = p.z - o.pos.z;
          const ed = Math.hypot(ex, ez);
          if (ed < RAIO * 1.8 && ed > 1e-4) {
            p.x = o.pos.x + (ex / ed) * RAIO * 1.8;
            p.z = o.pos.z + (ez / ed) * RAIO * 1.8;
          }
        });
      }
      const distAoCarro = (p) => {
        const q = praoCarro(tmpL.set(p.x, 0, p.z));
        return Math.hypot(q.x - Math.max(CAIXA.x0, Math.min(CAIXA.x1, q.x)), q.z - Math.max(CAIXA.z0, Math.min(CAIXA.z1, q.z)));
      };

      // ==================================================================
      // DIRIGIR O SUBARU
      // ==================================================================
      const euDirijo = () => eu.modo === 'carro' && eu.banco === 'motorista';
      const motoristaRemoto = () => [...avatares.values()].find((a) => !a.eu && !a.npc && !a.classico && a.modo === 'carro' && a.banco === 'motorista');
      const vLimC = new THREE.Vector3();
      /** Ponto do carro dentro do que dá pra dirigir (rua, calçadas, transversal). */
      function limitarCarro(x, z) {
        if (!env.limitarVeiculo) return { x, z };
        vLimC.set(x, 0, z);
        env.group.worldToLocal(vLimC);
        const q = env.limitarVeiculo(vLimC.x, vLimC.z, 1.05);
        vLimC.set(q.x, 0, q.z);
        env.group.localToWorld(vLimC);
        return { x: vLimC.x, z: vLimC.z };
      }
      const obstaculosMundo = (env.obstaculos || []).map((o) => {
        const v = env.group.localToWorld(new THREE.Vector3(o.x, 0, o.z));
        return { x: v.x, z: v.z, r: o.r };
      });
      // Obstáculos do bairro (árvores, postes, carros parados): só os perto do carro, convertidos pro mundo
      const vObs = new THREE.Vector3();
      const obsPerto = [];
      function obstaculosDoBairro(x, z) {
        obsPerto.length = 0;
        if (!env.obstaculosPerto) return obsPerto;
        vObs.set(x, 0, z);
        env.group.worldToLocal(vObs);
        const lista = env.obstaculosPerto(vObs.x, vObs.z, 6);
        for (const o of lista) {
          vObs.set(o.x, 0, o.z);
          env.group.localToWorld(vObs);
          obsPerto.push({ x: vObs.x, z: vObs.z, r: o.r });
        }
        return obsPerto;
      }
      // Três círculos ao longo do carro (traseira, meio, frente) fazem a colisão
      const CIRCULOS_CARRO = [-1.6, 0, 1.55];
      function colidirCarro() {
        const fx = -Math.sin(carro.yaw);
        const fz = -Math.cos(carro.yaw);
        let impacto = 0;
        const doBairro = obstaculosDoBairro(carro.x, carro.z);
        for (const o of CIRCULOS_CARRO) {
          const px = carro.x + fx * o;
          const pz = carro.z + fz * o;
          const q = limitarCarro(px, pz);
          const dx = q.x - px;
          const dz = q.z - pz;
          if (dx * dx + dz * dz > 1e-6) {
            carro.x += dx;
            carro.z += dz;
            impacto = Math.max(impacto, Math.hypot(dx, dz));
          }
          const empurrar = (ox, oz, r) => {
            const ex = px - ox;
            const ez = pz - oz;
            const d = Math.hypot(ex, ez);
            const min = 1.05 + r;
            if (d < min && d > 1e-4) {
              carro.x += (ex / d) * (min - d);
              carro.z += (ez / d) * (min - d);
              impacto = Math.max(impacto, min - d);
            }
          };
          obstaculosMundo.forEach((ob) => empurrar(ob.x, ob.z, ob.r));
          doBairro.forEach((ob) => empurrar(ob.x, ob.z, ob.r));
          avatares.forEach((a) => a.modo === 'pe' && empurrar(a.pos.x, a.pos.z, 0.3));
        }
        if (impacto > 0) {
          if (Math.abs(carro.vel) > 4 && !colidirCarro.batendo) {
            stage.shake?.(Math.min(0.05, Math.abs(carro.vel) * 0.003), 6);
            root.LuiggiAudio.playSFX('punch');
          }
          colidirCarro.batendo = true;
          carro.vel *= 0.35;
        } else colidirCarro.batendo = false;
      }

      function dirigir(dt) {
        if (euDirijo() && modoCam === 'carro') {
          carro.alvo = null;
          let gas = (teclas.has('KeyW') || teclas.has('ArrowUp') ? 1 : 0) - (teclas.has('KeyS') || teclas.has('ArrowDown') ? 1 : 0);
          let giro = (teclas.has('KeyA') || teclas.has('ArrowLeft') ? 1 : 0) - (teclas.has('KeyD') || teclas.has('ArrowRight') ? 1 : 0);
          if (joy.ativo) {
            gas = Math.max(-1, Math.min(1, -joy.y * 1.4));
            giro = Math.max(-1, Math.min(1, -joy.x * 1.4));
          }
          // Volante pesa menos com o carro andando rápido
          const limiteGiro = 0.62 - Math.min(0.3, Math.abs(carro.vel) * 0.018);
          carro.volante = U.damp(carro.volante, giro * limiteGiro, 6, dt);
          if (gas > 0.05) {
            if (carro.parado > 2.5) root.LuiggiAudio.playSFX('boxer');
            carro.vel += (carro.vel < -0.2 ? 14 : 5.5) * gas * dt;
          } else if (gas < -0.05) carro.vel -= (carro.vel > 0.2 ? 14 : 3.2) * -gas * dt;
          else carro.vel *= Math.exp(-0.7 * dt);
          if (teclas.has('Space')) carro.vel *= Math.exp(-4.5 * dt);
          carro.vel = Math.max(-VEL_RE, Math.min(VEL_MAX, carro.vel));
          if (Math.abs(carro.vel) < 0.03 && Math.abs(gas) < 0.05) carro.vel = 0;
          carro.parado = Math.abs(carro.vel) < 0.1 ? carro.parado + dt : 0;
          carro.yaw += ((carro.vel * Math.tan(carro.volante)) / ENTRE_EIXOS) * dt;
          carro.x += -Math.sin(carro.yaw) * carro.vel * dt;
          carro.z += -Math.cos(carro.yaw) * carro.vel * dt;
          colidirCarro();
          if (Math.abs(carro.vel) > 0.3) ultimaInteracao = performance.now();
        } else if (carro.alvo) {
          // Outra pessoa dirige (ou o anfitrião mandou onde o carro está): segue suave
          const a = carro.alvo;
          const k = 1 - Math.exp(-10 * dt);
          if (Math.hypot(a.x - carro.x, a.z - carro.z) > 25) {
            carro.x = a.x;
            carro.z = a.z;
            carro.yaw = a.yaw;
          }
          carro.x += (a.x - carro.x) * k;
          carro.z += (a.z - carro.z) * k;
          carro.yaw += difAng(carro.yaw, a.yaw) * k;
          carro.vel = a.vel;
          carro.volante = a.volante;
        } else if (carro.vel) {
          // Ninguém no volante: o carro para sozinho
          carro.vel *= Math.exp(-3 * dt);
          if (Math.abs(carro.vel) < 0.05) carro.vel = 0;
          carro.x += -Math.sin(carro.yaw) * carro.vel * dt;
          carro.z += -Math.cos(carro.yaw) * carro.vel * dt;
          colidirCarro();
        }
        aplicarPoseCarro();
        // Rodas girando, rodas da frente e volante esterçando
        (interior.rodas || []).forEach((r, i) => {
          r.rotation.order = 'YXZ';
          r.rotation.x -= (carro.vel * dt) / 0.33;
          if (i < 2) r.rotation.y = carro.volante;
        });
        interior.volante.rotation.z = carro.volante * 2.4;
        controle.st.vel = carro.vel;
        if (Math.abs(carro.vel) > 0.2) controle.st.rpmAlvo = Math.max(controle.st.rpmAlvo, 1100 + Math.abs(carro.vel) * 310 + (teclas.has('KeyW') ? 900 : 0));
        // Velocidade na tela pra quem dirige
        if (euDirijo()) {
          const kmh = Math.round(Math.abs(carro.vel) * 3.6);
          if (kmh !== dirigir.kmh) {
            dirigir.kmh = kmh;
            veloEl.textContent = `${kmh} km/h${carro.vel < -0.1 ? ' · ré' : ''}`;
          }
        }
        veloEl.classList.toggle('hidden', !euDirijo());
      }

      /** Estaciona o Subaru de novo na vaga, em frente ao portão. */
      function voltarPraVaga(porId) {
        carro.x = 0;
        carro.z = 0;
        carro.yaw = 0;
        carro.vel = 0;
        carro.volante = 0;
        carro.alvo = null;
        aplicarPoseCarro();
        // Quem estava a pé em cima da vaga sai da frente
        if (eu.modo === 'pe') colidir(eu.alvo);
        root.LuiggiAudio.playSFX('tranca');
        const quem = porId && net && porId !== net.eu ? net.nomeDe(porId) : null;
        falar(quem ? `🅿️ ${quem} estacionou o Subaru de volta na vaga, em frente ao portão.` : '🅿️ Subaru estacionado de volta na vaga, em frente ao portão.', null, '🚗 Subaru');
        aoMudarMeuEstado(true);
        if (net?.souHost) publicarEstado();
      }
      function pedirVaga() {
        if (net) {
          if (!net.pedir({ tipo: 'vaga' })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        voltarPraVaga(null);
      }

      function andar(dt) {
        if (combate) return combate.mover(dt);
        if (modoCam !== 'pe') return;
        let ix = 0;
        let iz = 0;
        if (teclas.has('KeyW') || teclas.has('ArrowUp')) iz += 1;
        if (teclas.has('KeyS') || teclas.has('ArrowDown')) iz -= 1;
        if (teclas.has('KeyD') || teclas.has('ArrowRight')) ix += 1;
        if (teclas.has('KeyA') || teclas.has('ArrowLeft')) ix -= 1;
        if (joy.ativo) {
          ix += joy.x;
          iz += -joy.y;
        }
        const mag = Math.min(1, Math.hypot(ix, iz));
        if (mag < 0.08) {
          if (eu.anim === 'walk' || eu.anim === 'run') eu.anim = 'idle';
          return;
        }
        const correr = teclas.has('ShiftLeft') || teclas.has('ShiftRight') || correrToggle || (joy.ativo && mag > 0.92);
        const v = (correr ? VEL_CORRER : VEL_ANDAR) * mag;
        // Frente = pra onde a câmera olha
        const fx = -Math.sin(orb.yaw);
        const fz = -Math.cos(orb.yaw);
        const rx = Math.cos(orb.yaw);
        const rz = -Math.sin(orb.yaw);
        const n = Math.hypot(ix, iz) || 1;
        const mx = ((fx * iz + rx * ix) / n) * v * dt;
        const mz = ((fz * iz + rz * ix) / n) * v * dt;
        eu.alvo.x += mx;
        eu.alvo.z += mz;
        colidir(eu.alvo);
        eu.rotAlvo = Math.atan2(mx, mz);
        eu.anim = correr ? 'run' : 'walk';
        ultimaInteracao = performance.now();
      }

      function sairDoCarro() {
        if (eu.modo !== 'carro') return;
        if (Math.abs(carro.vel) > 1.2) {
          falar('Para o carro antes de descer (S freia, Espaço é o freio de mão).', null, '🚗 Subaru');
          return;
        }
        if (euDirijo()) carro.vel = 0;
        camFora = false;
        if (modoCam === 'pose') terminarPose();
        const s = ASSENTOS[eu.banco];
        const p = pontoDaPorta(eu.banco);
        colidir(p);
        eu.modo = 'pe';
        eu.alvo.copy(p);
        eu.pos.copy(p);
        eu.rotAlvo = Math.atan2(s.lado, 0) + carro.yaw;
        eu.rot = eu.rotAlvo;
        eu.anim = 'idle';
        orb.yaw = s.lado * (Math.PI / 2 - 0.6) + carro.yaw;
        orb.pitch = 0.3;
        orb.dist = 3.6;
        modoCam = 'pe';
        eu.b.cabeca.visible = true;
        stage.camera.position.set(p.x + Math.sin(orb.yaw) * orb.dist, 1.6, p.z + Math.cos(orb.yaw) * orb.dist);
        andar.perto = true;
        atualizarNPCs();
        atualizarAcoes();
        root.LuiggiAudio.playSFX('tranca');
        falar(`Você desceu do Subaru pela porta do ${s.nome.toLowerCase()}. ${toque ? 'Use o controle pra andar.' : 'WASD pra andar; F perto do carro pra entrar de novo.'}`, null, '🚶 Na rua');
        dicaAndar.classList.remove('hidden');
        clearTimeout(dicaAndar._t);
        dicaAndar._t = setTimeout(() => dicaAndar.classList.add('hidden'), 9000);
        celular.atualizar();
        aoMudarMeuEstado(true);
      }

      function entrarNoCarro(bancoPreferido = null) {
        if (eu.modo === 'carro') return;
        if (distAoCarro(eu.pos) > DIST_ENTRAR) {
          falar('Chega mais perto do Subaru pra entrar (encosta na porta e aperta F).', null, '🚗 Subaru');
          return;
        }
        const livres = bancosLivres(eu);
        if (!livres.length) {
          falar('O Subaru tá lotado: 5 lugares, 5 pessoas. Fica na calçada curtindo o som!', null, '🚗 Subaru');
          return;
        }
        let banco = bancoPreferido && livres.includes(bancoPreferido) ? bancoPreferido : null;
        if (!banco) banco = livres.slice().sort((a, b) => pontoDaPorta(a).distanceTo(eu.pos) - pontoDaPorta(b).distanceTo(eu.pos))[0];
        eu.modo = 'carro';
        eu.banco = banco;
        eu.anim = 'idle';
        modoCam = 'carro';
        cam.yaw = OLHAR_BANCO[banco].base;
        cam.pitch = -0.1;
        cam.foco = null;
        stage.camera.position.set(...ASSENTOS[banco].olho);
        eu.b.cabeca.visible = false;
        dicaAndar.classList.add('hidden');
        root.LuiggiAudio.playSFX('tranca');
        falar(
          banco === 'motorista'
            ? `Você tá no volante! ${toque ? 'Use o controle na tela pra dirigir.' : 'W acelera, S freia e dá ré, A/D vira, Espaço é o freio de mão e V troca a câmera.'}`
            : `Você entrou e sentou no banco ${rotuloBanco(banco)}.${eu.cel ? ' O celular pareou com o rádio de novo.' : ''}`,
          null,
          '🚗 Subaru'
        );
        atualizarNPCs();
        atualizarAcoes();
        celular.atualizar();
        aoMudarMeuEstado(true);
      }

      function trocarBanco(banco) {
        painelBancos.classList.add('hidden');
        if (eu.modo !== 'carro' || banco === eu.banco) return;
        if (!bancoLivre(banco, eu)) {
          falar('Esse banco já tem gente.', null, '🪑 Bancos');
          return;
        }
        eu.banco = banco;
        cam.yaw = OLHAR_BANCO[banco].base;
        cam.foco = null;
        stage.camera.position.set(...ASSENTOS[banco].olho);
        root.LuiggiAudio.playSFX('blip');
        falar(`Você pulou pro banco ${rotuloBanco(banco)}.`, null, '🪑 Bancos');
        atualizarNPCs();
        atualizarAcoes();
        aoMudarMeuEstado(true);
      }
      const rotuloBanco = (b) => ({ motorista: 'do motorista', passageiro: 'do passageiro', tras_dir: 'de trás (atrás do passageiro)', tras_esq: 'de trás (atrás do motorista)', tras_meio: 'de trás (no meio)' })[b] || b;

      function trocarPersonagem(pid) {
        if (!PERSONAGENS[pid]) return;
        if (modoCam === 'pose') terminarPose();
        trocarBoneco(eu, pid);
        eu.b.cabeca.visible = modoCam !== 'carro' || camFora;
        const bancoDele = PERSONAGENS[pid].banco;
        if (eu.modo === 'carro' && eu.banco !== bancoDele && bancoLivre(bancoDele, eu)) {
          eu.banco = bancoDele;
          cam.yaw = OLHAR_BANCO[bancoDele].base;
          cam.foco = null;
          stage.camera.position.set(...ASSENTOS[bancoDele].olho);
        }
        gravarLocal('luiggi_resenha_pers', pid);
        atualizarNPCs();
        ov.querySelectorAll('[data-pers]').forEach((b) => b.classList.toggle('ativo', b.dataset.pers === pid));
        const p = map.get(pid);
        spkEl.textContent = `${PERSONAGENS[pid].icone} Você é ${p?.nome || PERSONAGENS[pid].nome}`;
        if (p) portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(p, { expressao: 'feliz', speaking: false });
        txtEl.textContent = {
          luis: 'Você é o Luis. O volante é seu, o cheiro de baunilha também.',
          fabricio: 'Você é o Fabricio. Visão privilegiada do Luis cantando a letra errada.',
          mateus_buse: 'Você é o Mateus Buse. Microfone mutado, vista direta pro compartimento dos Tic Tacs.'
        }[pid];
        root.LuiggiAudio.playSFX('blip');
        net?.atualizar({ pov: pid });
        aoMudarMeuEstado(true);
        if (acoesEl.childElementCount) atualizarAcoes();
      }

      // ==================================================================
      // MODO POSE
      // ==================================================================
      let juntaSel = null;
      const sliders = [...painelPose.querySelectorAll('input[data-eixo]')];
      const saidas = [...painelPose.querySelectorAll('output[data-eixo-v]')];
      const matMarca = new THREE.MeshBasicMaterial({ color: '#fbbf24', depthTest: false, transparent: true, opacity: 0.9 });
      const matMarcaSel = new THREE.MeshBasicMaterial({ color: '#22d3ee', depthTest: false, transparent: true, opacity: 1 });
      const geoMarca = new THREE.SphereGeometry(0.028, 12, 8);

      function criarMarcadores() {
        if (eu.marcadores) return;
        eu.marcadores = {};
        JUNTAS.forEach(([k]) => {
          const j = eu.b.joints[k];
          if (!j) return;
          const m = new THREE.Mesh(geoMarca, matMarca);
          m.renderOrder = 999;
          m.userData.junta = k;
          m.userData.noOutline = true;
          if (k === 'head') m.position.y = 0.05;
          j.add(m);
          eu.marcadores[k] = m;
        });
      }
      function mostrarMarcadores(v) {
        if (v) criarMarcadores();
        Object.entries(eu.marcadores || {}).forEach(([k, m]) => {
          m.visible = v;
          m.material = k === juntaSel ? matMarcaSel : matMarca;
          m.scale.setScalar(k === juntaSel ? 1.5 : 1);
        });
      }
      function mostrarPartesDoCarro(v) {
        if (interior.teto) interior.teto.visible = v;
        if (interior.exterior) interior.exterior.visible = v;
        if (interior.laterais) interior.laterais.visible = v;
        recalcularClicaveis();
      }

      function comecarPose() {
        if (eu.modo !== 'carro') {
          falar('Dá pra posar sentado no carro. Entra no Subaru primeiro (F perto da porta).', null, '🦾 Pose');
          return;
        }
        if (celular.aberto) celular.fechar();
        modoCam = 'pose';
        eu.b.cabeca.visible = true;
        const s = ASSENTOS[eu.banco];
        orb.yaw = s.lado * (Math.PI / 2 + 0.45);
        orb.pitch = 0.3;
        orb.dist = 1.7;
        mostrarPartesDoCarro(false);
        painelPose.classList.remove('hidden');
        mostrarMarcadores(true);
        selecionarJunta(juntaSel || 'sR');
        falar('Modo pose: escolha uma parte do corpo e arraste. O teto e as portas somem só pra você enxergar.', null, '🦾 Pose');
        atualizarAcoes();
      }
      function terminarPose() {
        if (modoCam !== 'pose') return;
        modoCam = eu.modo === 'carro' ? 'carro' : 'pe';
        eu.b.cabeca.visible = modoCam !== 'carro' || camFora;
        if (modoCam === 'carro') stage.camera.position.set(...ASSENTOS[eu.banco].olho);
        mostrarPartesDoCarro(true);
        mostrarMarcadores(false);
        painelPose.classList.add('hidden');
        aoMudarMeuEstado(true);
        atualizarAcoes();
      }
      function selecionarJunta(k) {
        juntaSel = k;
        painelPose.querySelectorAll('[data-junta]').forEach((b) => b.classList.toggle('ativo', b.dataset.junta === k));
        document.getElementById('rs-pose-sel').textContent = k ? `Mexendo: ${NOME_JUNTA[k]}` : 'Nenhuma parte escolhida';
        mostrarMarcadores(modoCam === 'pose');
        atualizarSliders();
      }
      function atualizarSliders() {
        const v = (juntaSel && eu.extras[juntaSel]) || [0, 0, 0];
        sliders.forEach((s, i) => {
          const g = Math.round((v[i] * 180) / Math.PI);
          s.value = g;
          s.disabled = !juntaSel;
          saidas[i].textContent = `${g}°`;
        });
      }
      function girarJunta(k, eixo, delta) {
        const v = eu.extras[k] || [0, 0, 0];
        v[eixo] = Math.max(-Math.PI, Math.min(Math.PI, v[eixo] + delta));
        eu.extras[k] = v;
        aoMudarMeuEstado();
      }
      sliders.forEach((s, i) =>
        s.addEventListener('input', () => {
          if (!juntaSel) return;
          const v = eu.extras[juntaSel] || [0, 0, 0];
          v[i] = (Number(s.value) * Math.PI) / 180;
          eu.extras[juntaSel] = v;
          saidas[i].textContent = `${s.value}°`;
          aoMudarMeuEstado();
        })
      );
      painelPose.querySelectorAll('[data-junta]').forEach((b) => b.addEventListener('click', () => selecionarJunta(b.dataset.junta)));
      painelPose.querySelectorAll('[data-pronta]').forEach((b) =>
        b.addEventListener('click', () => {
          const p = POSES_PRONTAS.find((x) => x.id === b.dataset.pronta);
          if (!p) return;
          eu.extras = limparExtras(p.ex(ASSENTOS[eu.banco]?.lado || -1));
          atualizarSliders();
          root.LuiggiAudio.playSFX('blip');
          aoMudarMeuEstado(true);
        })
      );
      document.getElementById('rs-pose-zerar1').addEventListener('click', () => {
        if (!juntaSel) return;
        delete eu.extras[juntaSel];
        atualizarSliders();
        aoMudarMeuEstado(true);
      });
      document.getElementById('rs-pose-zerar').addEventListener('click', () => {
        eu.extras = {};
        atualizarSliders();
        aoMudarMeuEstado(true);
      });
      document.getElementById('rs-pose-espelhar').addEventListener('click', () => {
        const novo = {};
        const espelho = (v) => (v ? [v[0], -v[1], -v[2]] : null);
        Object.entries(eu.extras).forEach(([k, v]) => {
          const par = PARES.find((p) => p.includes(k));
          const dest = par ? par[par[0] === k ? 1 : 0] : k;
          novo[dest] = espelho(v);
        });
        eu.extras = limparExtras(novo);
        atualizarSliders();
        aoMudarMeuEstado(true);
      });
      document.getElementById('rs-pose-fechar').addEventListener('click', terminarPose);

      // ==================================================================
      // CELULAR
      // ==================================================================
      const celular = root.LuiggiResenhaCelular.criar({
        host: shell,
        conectado: () => eu.modo === 'carro',
        galera: () => [...avatares.values()].filter((a) => !a.npc && a.modo === 'carro'),
        estacao: () => controle.st.radio,
        tocandoSintetizado: () => controle.st.sintetizadoTocando,
        onComando: (cmd, arg) => comandoRadio(cmd, arg, 'celular'),
        onFechar: () => {
          eu.cel = false;
          aoMudarMeuEstado(true);
          atualizarAcoes();
        }
      });
      function alternarCelular() {
        if (modoCam === 'pose') terminarPose();
        eu.cel = celular.alternar();
        if (eu.cel) falar(eu.modo === 'carro' ? '📱 Celular na mão, pareado com o rádio do Subaru. Escolhe a música!' : '📱 Na rua o Bluetooth do Subaru não pega. Volta pro carro pra mexer no som.', null, '📱 Celular');
        aoMudarMeuEstado(true);
        atualizarAcoes();
      }

      // ==================================================================
      // RÁDIO (sozinho ou com o anfitrião da sala)
      // ==================================================================
      let net = null;
      let modoPainel = null;
      let prefill = Online ? Online.normalizarCodigo(opcoes.sala) : '';
      let chaveRadio = null;
      let ultimoPor = null;
      let jaSincronizou = false;
      const membrosAnt = new Map();

      function estadoRadio() {
        const c = cloud();
        if (c) return { m: 'c', id: c.faixa?.id || null, p: Math.round((c.posicao || 0) * 1000) / 1000, on: c.tocando };
        return { m: 's', e: controle.st.radio, on: controle.st.sintetizadoTocando };
      }
      const chaveDe = (r) => `${r.m === 'c' ? r.id : `s${r.e}`}|${r.on ? 1 : 0}`;

      /** Executa um comando de rádio aqui (sozinho ou como anfitrião). Devolve o texto pra mostrar. */
      function executarRadio(cmd, arg) {
        const c = cloud();
        let txt = null;
        if (cmd === 'next' || cmd === 'prev') txt = controle.trocarRadio(cmd === 'next' ? 1 : -1);
        else if (cmd === 'toggle') txt = controle.alternarRadio();
        else if (cmd === 'faixa' && c && typeof arg === 'string') {
          const f = c.catalogo.faixas.find((x) => x.id === arg);
          if (f) {
            c.tocarFaixa(f.id);
            txt = `📱 Tocando "${f.titulo}" — ${f.artista}`;
          }
        } else if (cmd === 'seek' && c && isFinite(arg)) {
          c.seek(Number(arg));
          if (!c.tocando) c.play();
        } else if (cmd === 'estacao' && !c && isFinite(arg)) {
          const e = Math.max(0, Math.min(ESTILOS_RADIO.length - 1, Math.floor(arg)));
          controle.st.radio = e;
          root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[e], 98);
          controle.st.sintetizadoTocando = true;
          txt = `📻 ${NOMES_RADIO[ESTILOS_RADIO[e]]}`;
        }
        atualizarFaixa();
        setTimeout(atualizarFaixa, 120);
        return txt;
      }

      /** Botões ⏮ ⏯ ⏭, o rádio do painel e o celular. Online, quem decide é o anfitrião. */
      function comandoRadio(cmd, arg, origem) {
        ultimaInteracao = performance.now();
        if (cmd === 'next' || cmd === 'prev' || cmd === 'toggle') controle.apertarBotao(cmd === 'next' ? 'radio_next' : cmd === 'prev' ? 'radio_prev' : 'radio_toggle');
        if (net) {
          if (!net.pedir({ tipo: 'radio', cmd, arg, cel: origem === 'celular' })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        const txt = executarRadio(cmd, arg);
        if (txt && origem !== 'botao') falar(txt, null, origem === 'celular' ? '📱 Celular' : '📻 Rádio');
      }

      function aplicarEstadoRadio(r, atraso) {
        const c = cloud();
        if (r.m === 'c' && c && typeof r.id === 'string') {
          c.sincronizar({ id: r.id, pos: (Number(r.p) || 0) + (r.on ? atraso : 0), tocando: !!r.on });
          return;
        }
        const e = r.m === 's' ? Math.max(0, Math.min(ESTILOS_RADIO.length - 1, Number(r.e) || 0)) : controle.st.radio;
        const mudou = controle.st.radio !== e;
        controle.st.radio = e;
        if (r.on && (!controle.st.sintetizadoTocando || mudou)) {
          if (c?.tocando) c.pause(false);
          root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[e], 98, { forcar: true });
          controle.st.sintetizadoTocando = true;
        } else if (!r.on && controle.st.sintetizadoTocando) {
          root.LuiggiAudio.pararMusica();
          controle.st.sintetizadoTocando = false;
        }
      }

      function notarRadio(r, porId, peloCelular) {
        const chave = chaveDe(r);
        if (chave === chaveRadio) return;
        const antes = chaveRadio;
        chaveRadio = chave;
        if (antes === null || !net) return;
        const quem = porId ? (porId === net.eu ? 'Você' : net.nomeDe(porId)) : null;
        const trocouFaixa = antes.split('|')[0] !== chave.split('|')[0];
        const via = peloCelular ? ' pelo celular' : '';
        if (trocouFaixa) {
          const f = cloud()?.faixa;
          const nome = r.m === 'c' ? (f ? `"${f.titulo}" — ${f.artista}` : 'outra faixa') : NOMES_RADIO[ESTILOS_RADIO[r.e]] || 'outra estação';
          falar(quem ? `${quem} trocou a música${via}: ${nome}` : `Tocando agora: ${nome}`, null, peloCelular ? '📱 Celular' : '📻 Rádio');
        } else falar(r.on ? `▶ ${quem || 'O rádio'} soltou o som${via}.` : `⏸ ${quem || 'O rádio'} pausou o rádio${via}.`, null, '📻 Rádio');
      }

      function atualizarFaixa() {
        const c = cloud();
        if (c) {
          const f = c.faixa;
          faixaEl.textContent = `${c.tocando ? '▶' : '⏸'} ${f ? `${f.titulo} · ${f.artista}` : 'LuiggiCloud'}`;
        } else faixaEl.textContent = `${controle.st.sintetizadoTocando ? '▶' : '⏸'} ${NOMES_RADIO[ESTILOS_RADIO[controle.st.radio]]}`;
      }

      // ---------------- Anfitrião ----------------
      function publicarEstado(alvo) {
        if (!net || !net.souHost) return;
        const r = estadoRadio();
        const por = ultimoPor && ultimoPor.chave === chaveDe(r) ? ultimoPor : null;
        net.enviarEstado({ r, c: { porta: controle.st.portaAberta, cons: controle.st.consoleAberto, conv: convidados, carro: [r2(carro.x), r2(carro.z), Math.round(carro.yaw * 1000) / 1000] }, cq: ultimoConvPor, por: por?.id || null, pc: por?.cel ? 1 : 0, ff: combate?.ff ? 1 : 0 }, alvo);
        notarRadio(r, por?.id || null, por?.cel);
      }

      function processarPedido(d, de) {
        if (!d || typeof d !== 'object') return;
        if (d.tipo === 'radio' && CMDS_RADIO.includes(d.cmd)) {
          if (d.cmd === 'seek' && !isFinite(Number(d.arg))) return;
          executarRadio(d.cmd, d.arg);
          ultimoPor = { id: de, chave: chaveDe(estadoRadio()), cel: !!d.cel };
          publicarEstado();
        } else if (d.tipo === 'convidado' && Conv && Conv.SLOTS.includes(d.banco) && (d.pid === null || Conv.valido(d.pid))) {
          ultimoConvPor = de;
          aplicarConvidados({ ...convidados, [d.banco]: d.pid }, de);
          if (de === net.eu) Conv.gravar(convidados);
          publicarEstado();
        } else if (d.tipo === 'vaga') {
          voltarPraVaga(de);
          net.fx({ acao: 'vaga', por: de });
        } else if (d.tipo === 'acao' && ACOES_COMPARTILHADAS.includes(d.acao)) {
          const r = controle.interagir(d.acao, { remoto: de !== net.eu });
          mostrarReacao(r, de);
          net.fx({ acao: d.acao, por: de, porta: controle.st.portaAberta, cons: controle.st.consoleAberto });
        }
      }

      // ---------------- Quem segue o anfitrião ----------------
      function aplicarEstado(d, _de, atraso) {
        if (!d || typeof d !== 'object') return;
        if (d.r && typeof d.r === 'object') {
          aplicarEstadoRadio(d.r, atraso);
          notarRadio(d.r, typeof d.por === 'string' ? d.por : null, !!d.pc);
        }
        if (d.c) controle.definir(d.c);
        if ('ff' in d && combate) combate.definirFF(!!d.ff);
        if (d.c && d.c.conv) aplicarConvidados(d.c.conv, typeof d.cq === 'string' ? d.cq : null);
        // Onde o Subaru está (pra quem chegou agora), se ninguém estiver dirigindo
        if (d.c && Array.isArray(d.c.carro) && !euDirijo() && !motoristaRemoto()) {
          const [x, z, yaw] = d.c.carro.map(Number);
          if ([x, z, yaw].every(isFinite)) carro.alvo = { x, z, yaw, vel: 0, volante: 0 };
        }
        atualizarFaixa();
        if (!jaSincronizou && net) {
          jaSincronizou = true;
          atualizarListaOnline();
          avisoOnline(`Você entrou no Subaru da sala ${net.sala}! O rádio agora é de todo mundo.`);
        }
      }
      function aplicarFx(d) {
        if (d && d.acao === 'vaga') return voltarPraVaga(typeof d.por === 'string' ? d.por : null);
        if (!d || !ACOES_COMPARTILHADAS.includes(d.acao)) return;
        const aberto = d.acao === 'tictac' ? d.cons : d.acao === 'portaluvas' ? d.porta : undefined;
        const r = controle.interagir(d.acao, { remoto: d.por !== net?.eu, aberto });
        mostrarReacao(r, d.por);
      }
      /** Troca a lista de convidados e avisa o que mudou. */
      function aplicarConvidados(novo, porId) {
        if (!Conv) return;
        novo = Conv.limpar(novo);
        const quem = porId && net ? (porId === net.eu ? 'Você' : net.nomeDe(porId)) : null;
        const msg = Conv.descreverMudanca(convidados, novo, quem);
        convidados = novo;
        atualizarNPCs();
        painelConv?.atualizar();
        if (msg) falar(`🪑 ${msg}`, null, '➕ Banco de trás');
      }
      function definirConvidado(slot, pid) {
        if (net) {
          if (!net.pedir({ tipo: 'convidado', banco: slot, pid: pid || null })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        aplicarConvidados({ ...convidados, [slot]: pid || null }, null);
        Conv.gravar(convidados);
        root.LuiggiAudio.playSFX('blip');
      }
      function abrirConvidados() {
        if (!painelConv) return;
        painelOnline.classList.add('hidden');
        painelConv.alternar();
      }

      /** Quem está no modo clássico não manda boneco: aparece sentado no banco do personagem dele. */
      function sincronizarClassicos() {
        if (!net) return;
        const pessoas = net.pessoas.filter((p) => !p.eu);
        avatares.forEach((a) => {
          if (a.classico && !pessoas.some((p) => p.id === a.id && p.modo === 'classico')) removerAvatar(a.id);
        });
        pessoas.forEach((p) => {
          if (p.modo !== 'classico') return;
          const pid = PERSONAGENS[p.pov] ? p.pov : 'luis';
          let a = avatares.get(p.id);
          if (!a) a = novoAvatar(p.id, pid, { nome: p.nome });
          else trocarBoneco(a, pid);
          Object.assign(a, { classico: true, nome: p.nome, modo: 'carro', extras: {}, cel: false, curtir: false, anim: 'idle', olhar: [0, 0] });
          const livre = (b) => !convidados[b] && ![...avatares.values()].some((o) => o !== a && !o.npc && o.modo === 'carro' && o.banco === b);
          const pref = PERSONAGENS[pid].banco;
          if (livre(pref)) a.banco = pref;
          else if (!livre(a.banco)) a.banco = ORDEM_BANCOS.find(livre) || pref;
        });
        atualizarNPCs();
      }

      function mostrarReacao(r, porId) {
        if (!r) return;
        if (!net || porId === net.eu) {
          if (r.texto) falar(r.texto);
          if (r.interjeicao) root.LuiggiDialogue?.mostrarInterjeicao?.({ ...r.interjeicao, host: shell });
          if (r.olhar) mirarEm(r.olhar);
          return;
        }
        const nome = net.nomeDe(porId);
        falar(String(r.texto || '').replace(/^Você /, `${nome} `), null, `🌐 ${nome}`);
        if (r.interjeicao) root.LuiggiDialogue?.mostrarInterjeicao?.({ ...r.interjeicao, host: shell });
      }

      // ==================================================================
      // AVATARES PELA REDE
      // ==================================================================
      let envio = { ultimo: 0, assin: '' };
      let seqAvatar = 0;
      function meuEstado() {
        const ex = {};
        Object.entries(eu.extras).forEach(([k, v]) => (ex[k] = v.map(r2)));
        return {
          p: eu.pid,
          m: eu.modo === 'carro' ? 'c' : 'p',
          b: eu.banco,
          x: r2(eu.alvo.x),
          z: r2(eu.alvo.z),
          r: r2(eu.rotAlvo),
          an: eu.anim,
          aw: eu.aw,
          ex,
          cel: eu.cel ? 1 : 0,
          cs: eu.curtir ? 1 : 0,
          ol: [r2(eu.olhar[0]), r2(eu.olhar[1])],
          s: ++seqAvatar,
          ...(combate ? combate.estadoRede() : {}),
          car: euDirijo() ? [r2(carro.x), r2(carro.z), Math.round(carro.yaw * 1000) / 1000, r2(carro.vel), r2(carro.volante)] : undefined
        };
      }
      /** Avisa a galera que algo meu mudou (forcar = manda já, sem esperar). */
      function aoMudarMeuEstado(forcar = false) {
        if (forcar) envio.forcar = true;
      }
      function talvezEnviarAvatar(agora) {
        if (!net) return;
        const d = meuEstado();
        const assin = JSON.stringify({ ...d, s: 0 });
        const passou = agora - envio.ultimo;
        if (envio.forcar || (assin !== envio.assin && passou > 100) || passou > 2500) {
          net.enviarAvatar(d);
          envio = { ultimo: agora, assin, forcar: false };
        }
      }

      function receberAvatar(d, de) {
        if (!d || typeof d !== 'object' || !net) return;
        const pid = PERSONAGENS[d.p] ? d.p : 'luis';
        let a = avatares.get(de);
        // A mesma atualização pode chegar pelas duas rotas: só vale a mais nova
        if (a && typeof d.s === 'number' && typeof a.seq === 'number' && d.s <= a.seq && d.s > a.seq - 1e6) return;
        if (!a) a = novoAvatar(de, pid, { nome: net.nomeDe(de) });
        else trocarBoneco(a, pid);
        if (typeof d.s === 'number') a.seq = d.s;
        a.classico = false;
        // Quem está no volante manda onde o carro está
        if (Array.isArray(d.car) && d.m !== 'p' && d.b === 'motorista' && !euDirijo()) {
          const [x, z, yaw, vel, vol] = d.car.map(Number);
          if ([x, z, yaw].every(isFinite)) carro.alvo = { x, z, yaw, vel: isFinite(vel) ? Math.max(-VEL_RE, Math.min(VEL_MAX, vel)) : 0, volante: isFinite(vol) ? Math.max(-0.7, Math.min(0.7, vol)) : 0 };
        }
        a.nome = net.nomeDe(de);
        const modo = d.m === 'p' ? 'pe' : 'carro';
        a.modo = modo;
        if (modo === 'carro') a.banco = ASSENTOS[d.b] ? d.b : a.banco;
        else {
          const x = Number(d.x);
          const z = Number(d.z);
          if (isFinite(x) && isFinite(z)) limitarNaRua(a.alvo.set(x, 0, z));
          if (isFinite(Number(d.r))) a.rotAlvo = Number(d.r);
        }
        a.anim = ['idle', 'walk', 'run', 'dance'].includes(d.an) ? d.an : 'idle';
        combate?.aplicarRemoto(a, d);
        if (typeof d.aw === 'number' && d.aw !== a.aw) {
          if (a.aw) a.b.play('wave', 1.6);
          a.aw = d.aw;
        }
        a.extras = limparExtras(d.ex);
        a.cel = !!d.cel;
        a.curtir = !!d.cs;
        if (Array.isArray(d.ol)) a.olhar = [Math.max(-4, Math.min(4, Number(d.ol[0]) || 0)), Math.max(-1.5, Math.min(1.5, Number(d.ol[1]) || 0))];
        // Duas pessoas no mesmo banco: fica quem tem o menor id; o outro procura outro lugar
        if (eu.modo === 'carro' && modo === 'carro' && a.banco === eu.banco && de < net.eu) {
          const livre = bancosLivres(eu)[0];
          if (livre) {
            eu.banco = livre;
            cam.yaw = OLHAR_BANCO[livre].base;
            falar(`${a.nome} sentou no mesmo banco que você; você chegou pro banco ${rotuloBanco(livre)}.`, null, '🪑 Bancos');
            atualizarAcoes();
          } else {
            sairDoCarro();
          }
          aoMudarMeuEstado(true);
        }
        atualizarNPCs();
        atualizarListaOnline();
      }

      function receberEvento(d, de) {
        if (!d || !net) return;
        if (combate?.receberEvento(d, de)) return;
        if (d.tipo === 'cutucar') {
          root.LuiggiAudio.playSFX('blip');
          falar(`👉 ${net.nomeDe(de)} te cutucou.`, null, `🌐 ${net.nomeDe(de)}`);
          stage.shake(0.01, 4);
        }
      }

      // ==================================================================
      // CONEXÃO (painel online)
      // ==================================================================
      /** Quem recebe os eventos da sala neste modo. */
      function eventosRede(fundador) {
        return {
          onMembros: (lista, info) => {
            anunciarMudanca(lista, info);
            if (info?.tipo === 'saiu') {
              combate?.pessoaSaiu(info.id);
              removerAvatar(info.id);
              atualizarNPCs();
            }
            if (info?.tipo === 'entrou' && net) net.enviarAvatar(meuEstado(), info.id);
            sincronizarClassicos();
            atualizarListaOnline();
          },
          onHost: (souHost, hostId, antes) => {
            const c = cloud();
            if (c) c.controleExterno = !souHost;
            if (souHost) setTimeout(publicarEstado, 0);
            if (antes && net) avisoOnline(souHost ? '👑 O anfitrião saiu: agora o rádio de referência é o seu.' : `👑 ${net.nomeDe(hostId)} virou o anfitrião.`);
            else if (souHost && !fundador && net) avisoOnline('Ninguém apareceu nessa sala ainda, então o rádio de referência é o seu. Quando a galera entrar, todo mundo ouve junto.');
            setTimeout(atualizarListaOnline, 0);
          },
          onEstado: aplicarEstado,
          onPedido: processarPedido,
          onFx: aplicarFx,
          onAvatar: receberAvatar,
          onEvento: receberEvento,
          onPrecisaEstado: (alvo) => publicarEstado(alvo),
          onStatus: (tipo, msg) => {
            if (tipo === 'reserva') avisoOnline(`${msg} Tudo continua funcionando, só com um tiquinho mais de atraso.`);
            if (tipo === 'relays') atualizarListaOnline();
          }
        };
      }

      /** Veio do modo clássico já numa sala: continua nela (sem sair e entrar de novo). */
      function adotarRede(sessao) {
        net = sessao;
        net.adotar(eventosRede(false));
        net.atualizar({ pov: eu.pid, modo: '3d' });
        if (cloud()) cloud().controleExterno = !net.souHost;
        prefill = net.sala;
        jaSincronizou = net.sincronizado;
        envio = { ultimo: 0, assin: '', forcar: true };
        renderOnline();
        sincronizarClassicos();
        if (net.souHost) setTimeout(publicarEstado, 0);
        avisoOnline(`Modo 3D, ainda na sala ${net.sala}. A galera vê o seu boneco agora.`);
      }

      function conectar(sala, nome, fundador) {
        if (net || !Online) return;
        const n = Online.limparNome(nome || lerLocal('luiggi_resenha_nome') || `Passageiro ${Math.floor(Math.random() * 90 + 10)}`);
        gravarLocal('luiggi_resenha_nome', n);
        root.LuiggiAudio?.obterContexto?.();
        if (!fundador && cloud()) cloud().controleExterno = true;
        try {
          net = Online.criarSessao({
            sala,
            nome: n,
            pov: eu.pid,
            modo: '3d',
            fundador,
            eventos: eventosRede(fundador)
          });
        } catch (e) {
          net = null;
          if (cloud()) cloud().controleExterno = false;
          avisoOnline('Não deu pra ligar o modo online neste navegador.');
          return;
        }
        prefill = sala;
        envio = { ultimo: 0, assin: '', forcar: true };
        renderOnline();
        avisoOnline(fundador ? `Sala ${sala} criada! Copie o link do convite e mande pra galera.` : `Entrando na sala ${sala}… procurando a galera.`);
      }

      function desconectar(manual) {
        if (!net) return;
        net.sair();
        net = null;
        if (cloud()) cloud().controleExterno = false;
        chaveRadio = null;
        ultimoPor = null;
        membrosAnt.clear();
        jaSincronizou = false;
        [...avatares.values()].filter((a) => !a.eu && !a.npc).forEach((a) => removerAvatar(a.id));
        // Fora da sala, volta a valer o banco de trás salvo neste navegador
        if (Conv) convidados = Conv.ler();
        ultimoConvPor = null;
        painelConv?.atualizar();
        atualizarNPCs();
        renderOnline();
        if (manual) avisoOnline('Você saiu da sala. O Subaru voltou a ser só seu.');
      }

      function ondeEsta(id) {
        const a = avatares.get(id === net?.eu ? 'eu' : id);
        if (!a) return '';
        return a.modo === 'carro' ? ASSENTOS[a.banco]?.nome || '' : '🚶 na rua';
      }

      function anunciarMudanca(lista, info) {
        const antes = new Map(membrosAnt);
        membrosAnt.clear();
        lista.forEach((p) => membrosAnt.set(p.id, p.pov));
        if (!net || !net.sincronizado || !info) return;
        const p = lista.find((x) => x.id === info.id);
        if (info.tipo === 'entrou' && p) {
          root.LuiggiAudio.playSFX('blip');
          avisoOnline(`${p.nome} chegou na resenha (como ${PERSONAGENS[p.pov]?.nome || 'alguém'}).`);
        } else if (info.tipo === 'saiu') avisoOnline(`${info.nome} foi embora.`);
        else if (info.tipo === 'mudou' && p && antes.has(p.id) && antes.get(p.id) !== p.pov) avisoOnline(`${p.nome} agora é o ${PERSONAGENS[p.pov]?.nome || p.pov}.`);
        if (info.tipo === 'entrou' && p?.modo === 'classico') setTimeout(() => avisoOnline(`${p.nome} está no modo clássico: aparece sentado no banco do ${PERSONAGENS[p.pov]?.nome || 'personagem'}.`), 1500);
      }

      const linkConvite = () => `${location.href.split(/[?#]/)[0]}?resenha=${net.sala}`;
      async function copiarConvite() {
        if (!net) return;
        const link = linkConvite();
        try {
          await navigator.clipboard.writeText(link);
          avisoOnline(`Link copiado! Mande pra galera: ${link}`);
        } catch (_) {
          window.prompt('Copie o link do convite:', link);
        }
      }

      function abrirPainelOnline(v) {
        if (v) painelConv?.fechar();
        painelOnline.classList.toggle('hidden', !v);
        if (v) {
          renderOnline();
          painelOnline.querySelector(prefill && lerLocal('luiggi_resenha_nome') ? '#rs-on-entrar' : '#rs-on-nome')?.focus();
        }
      }

      function renderOnline() {
        const corpo = document.getElementById('rs-on-corpo');
        const modo = !Online || !Online.disponivel() ? 'indisponivel' : net ? 'sala' : 'entrar';
        if (modo !== modoPainel) {
          modoPainel = modo;
          if (modo === 'indisponivel') {
            corpo.innerHTML = '<p class="rs-on-aviso">Este navegador não suporta o modo online. Tente no Chrome, Edge, Firefox ou Safari atualizados.</p>';
          } else if (modo === 'entrar') {
            corpo.innerHTML = `
              <label class="rs-on-campo">Seu nome<input id="rs-on-nome" maxlength="18" autocomplete="nickname" placeholder="Como a galera te chama" value="${escHtml(lerLocal('luiggi_resenha_nome'))}"></label>
              <button class="mg-btn primary" id="rs-on-criar">➕ Criar sala</button>
              <div class="rs-on-ou"><span>ou entre numa sala</span></div>
              <div class="rs-on-linha"><input id="rs-on-codigo" maxlength="8" placeholder="CÓDIGO" spellcheck="false" autocapitalize="characters" value="${escHtml(prefill)}"><button class="mg-btn" id="rs-on-entrar">Entrar</button></div>
              <small class="rs-on-dica">Até ${Online.MAX_PESSOAS} pessoas (5 dentro do Subaru, o resto na calçada). Cada um escolhe o boneco, senta onde quiser, desce pra andar na rua, faz pose e mexe no som pelo celular. Todo mundo vê todo mundo.</small>`;
            const nomeEl = corpo.querySelector('#rs-on-nome');
            const codEl = corpo.querySelector('#rs-on-codigo');
            codEl.addEventListener('input', () => {
              codEl.value = Online.normalizarCodigo(codEl.value);
              codEl.classList.remove('erro');
            });
            const entrar = () => {
              const c = Online.normalizarCodigo(codEl.value);
              if (c.length < 4) {
                codEl.classList.add('erro');
                codEl.focus();
                return;
              }
              conectar(c, nomeEl.value, false);
            };
            corpo.querySelector('#rs-on-criar').addEventListener('click', () => conectar(Online.gerarCodigo(), nomeEl.value, true));
            corpo.querySelector('#rs-on-entrar').addEventListener('click', entrar);
            codEl.addEventListener('keydown', (e) => e.key === 'Enter' && entrar());
            nomeEl.addEventListener('keydown', (e) => e.key === 'Enter' && (codEl.value ? entrar() : corpo.querySelector('#rs-on-criar').click()));
          } else {
            corpo.innerHTML = `
              <div class="rs-on-sala"><small>Código da sala</small><strong id="rs-on-cod"></strong></div>
              <button class="mg-btn primary" id="rs-on-copiar">🔗 Copiar link do convite</button>
              ${location.protocol === 'file:' ? '<small class="rs-on-aviso">Você abriu o jogo direto do arquivo: o link só funciona neste PC. Pra chamar a galera, abram o jogo pelo site (GitHub Pages) e usem o código.</small>' : ''}
              <div class="rs-on-status" id="rs-on-status"></div>
              <ul class="rs-on-lista" id="rs-on-lista"></ul>
              <label class="rs-on-campo">Seu nome<input id="rs-on-nome" maxlength="18" value=""></label>
              <button class="mg-btn" id="rs-on-sair">🚪 Sair da sala</button>`;
            corpo.querySelector('#rs-on-copiar').addEventListener('click', copiarConvite);
            const nomeEl = corpo.querySelector('#rs-on-nome');
            nomeEl.value = net.nomeDe(net.eu);
            nomeEl.addEventListener('change', () => {
              const n = Online.limparNome(nomeEl.value);
              nomeEl.value = n;
              gravarLocal('luiggi_resenha_nome', n);
              net?.atualizar({ nome: n });
            });
            corpo.querySelector('#rs-on-sair').addEventListener('click', () => desconectar(true));
          }
        }
        atualizarListaOnline();
      }

      function atualizarListaOnline() {
        const btn = document.getElementById('rs-online-btn');
        if (!btn) return;
        btn.textContent = net ? `🌐 ${net.sala} · ${net.total}` : '🌐 Online';
        btn.classList.toggle('ativo', !!net);
        const pessoas = net ? net.pessoas : [];
        ov.querySelectorAll('[data-pers-n]').forEach((el) => {
          const n = pessoas.filter((p) => !p.eu && p.pov === el.dataset.persN).length;
          el.textContent = n ? ` +${n}` : '';
        });
        avatares.forEach((a) => {
          if (a.tag) a.tag.textContent = `🎮 ${a.nome}`;
        });
        if (!net || modoPainel !== 'sala') return;
        const cod = document.getElementById('rs-on-cod');
        if (cod) cod.textContent = net.sala;
        const status = document.getElementById('rs-on-status');
        if (status) {
          const semRede = net.relaysConectados === 0 && !net.pessoas.some((p) => p.via === 'p2p');
          status.textContent = semRede ? 'Procurando conexão com a internet…' : !net.sincronizado ? 'Conectando ao carro… procurando a galera.' : net.total === 1 ? 'Só você por enquanto. Mande o link pra galera.' : `${net.total} pessoas na resenha`;
          status.classList.toggle('pulsando', !net.sincronizado);
        }
        const lista = document.getElementById('rs-on-lista');
        if (lista) {
          lista.innerHTML = pessoas
            .map(
              (p) => `<li class="${p.eu ? 'eu' : ''}">
                <span class="rs-on-pov">${PERSONAGENS[p.pov]?.icone || '❔'}</span>
                <span class="rs-on-nome">${escHtml(p.nome)}${p.eu ? ' <small>(você)</small>' : ''}</span>
                ${p.host ? '<span class="rs-on-host" title="Anfitrião: o rádio dele é a referência de todo mundo">👑</span>' : ''}
                ${p.versaoDiferente ? '<span title="Essa pessoa está com outra versão do jogo">⚠️</span>' : ''}
                <small class="rs-on-banco">${escHtml(ondeEsta(p.id))}</small>
                ${p.eu ? '' : p.via === 'p2p' ? '<span class="rs-on-via" title="Conexão direta (P2P)">⚡</span>' : '<span class="rs-on-via" title="Pela rota reserva (relay): a rede não deixou conectar direto">📡</span>'}
              </li>`
            )
            .join('');
        }
      }

      // ---------------- Etiquetas com o nome em cima de cada pessoa ----------------
      const vTag = new THREE.Vector3();
      function posicionarTags() {
        const w = view.clientWidth;
        const h = view.clientHeight;
        avatares.forEach((a) => {
          if (!a.tag) return;
          a.b.cabeca.getWorldPosition(vTag);
          vTag.y += 0.34;
          vTag.project(stage.camera);
          const dentro = vTag.z < 1 && Math.abs(vTag.x) < 1.05 && Math.abs(vTag.y) < 1.05;
          a.tag.classList.toggle('hidden', !dentro);
          if (dentro) a.tag.style.transform = `translate(${((vTag.x + 1) / 2) * w}px, ${((1 - vTag.y) / 2) * h}px) translate(-50%, -100%)`;
        });
      }

      // ==================================================================
      // AÇÕES E BOTÕES
      // ==================================================================
      function interagir(acao) {
        ultimaInteracao = performance.now();
        if (acao === 'porta') return eu.modo === 'carro' ? sairDoCarro() : entrarNoCarro();
        if (acao === 'entrar_carro') return eu.modo === 'pe' ? entrarNoCarro() : null;
        if (acao === 'sair_entrar') return eu.modo === 'carro' ? sairDoCarro() : entrarNoCarro();
        if (acao === 'vaga') return pedirVaga();
        if (acao === 'spawn') return combate?.voltarProSpawn();
        if (acao === 'armas') return combate?.sacar(combate.arma ? String(R_ARMAS[combate.arma]?.slot || 1) : '1');
        if (acao === 'pular') {
          combate?.teclaDown({ code: 'Space', repeat: false });
          return;
        }
        if (acao === 'camfora') {
          if (modoCam === 'pe') return combate?.alternarCamera();
          if (eu.modo !== 'carro' || modoCam === 'pose') return;
          camFora = !camFora;
          eu.b.cabeca.visible = camFora;
          return atualizarAcoes();
        }
        if (acao === 'pose') return modoCam === 'pose' ? terminarPose() : comecarPose();
        if (acao === 'celular') return alternarCelular();
        if (acao === 'bancos') return mostrarBancos();
        if (acao === 'convidados') return abrirConvidados();
        if (acao.startsWith('conv:')) {
          const pid = convidados[acao.slice(5)];
          const a = avatares.get(acao);
          if (!pid) return;
          root.LuiggiAudio.playSFX('blip');
          falar(`"${Conv.frase(pid)}"`, pid);
          if (a) {
            a.b.setExpression('feliz');
            a.falandoAte = relogioT + 2.5;
          }
          return;
        }
        if (acao === 'curtir') {
          eu.curtir = !eu.curtir;
          falar(eu.curtir ? '🎶 Curtindo o som: cabeça no ritmo.' : 'Parou de dançar no banco.', null, '🎶');
          aoMudarMeuEstado(true);
          return atualizarAcoes();
        }
        if (acao === 'acenar') {
          eu.aw = (eu.aw || 0) + 1;
          eu.b.play('wave', 1.6);
          aoMudarMeuEstado(true);
          return;
        }
        if (acao === 'dancar') {
          eu.anim = eu.anim === 'dance' ? 'idle' : 'dance';
          aoMudarMeuEstado(true);
          return atualizarAcoes();
        }
        if (acao === 'correr') {
          correrToggle = !correrToggle;
          return atualizarAcoes();
        }
        if (acao.startsWith('pessoa:')) {
          const id = acao.slice(7);
          const a = avatares.get(id);
          if (!a || !net) return;
          net.enviarEvento({ tipo: 'cutucar' }, id);
          root.LuiggiAudio.playSFX('blip');
          falar(`👉 Você cutucou ${a.nome} (${PERSONAGENS[a.pid]?.nome || ''}, ${a.modo === 'carro' ? ASSENTOS[a.banco].nome.toLowerCase() : 'na rua'}).`, null, '🌐 Resenha Online');
          return;
        }
        if (acao === 'retrovisor') {
          root.LuiggiAudio.playSFX('blip');
          const atras = [...avatares.values()].filter((a) => a !== eu && a.modo === 'carro' && ASSENTOS[a.banco]?.tras).map((a) => (a.npc && PERSONAGENS[a.pid] ? PERSONAGENS[a.pid].nome : a.nome));
          falar(atras.length ? `No retrovisor: ${atras.join(' e ')} no banco de trás.` : 'No retrovisor: o banco de trás vazio... e a rua do Safepoint.');
          mirarEm('frente');
          stage.pulseGrade?.('vignette', 1.2, 1.2, 0.85);
          return;
        }
        if (acao === 'olhar_tras') {
          if (eu.modo !== 'carro') return;
          if (cam.focoNome === 'mateus_buse') return mirarEm('frente');
          mirarEm('mateus_buse');
          falar(ASSENTOS[eu.banco].tras ? 'Você já tá no banco de trás.' : 'Você vira pra trás: o Mateus Buse tá no banco de trás. Como sempre.');
          return;
        }
        if (ACOES_RADIO[acao]) {
          if (eu.modo !== 'carro') return falar('O rádio fica lá dentro do carro.', null, '📻 Rádio');
          return comandoRadio(ACOES_RADIO[acao], undefined, 'botao3d');
        }
        if (eu.modo !== 'carro') return;
        if (net && ACOES_COMPARTILHADAS.includes(acao)) {
          if (!net.pedir({ tipo: 'acao', acao })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        const r = controle.interagir(acao);
        mostrarReacao(r, net?.eu);
        const npc = avatares.get(`npc:${acao}`);
        if (npc) {
          npc.b.setExpression('feliz');
          npc.falandoAte = relogioT + 1.5;
        }
        atualizarFaixa();
      }

      function mostrarBancos() {
        if (eu.modo !== 'carro') return;
        if (!painelBancos.classList.contains('hidden')) {
          painelBancos.classList.add('hidden');
          return;
        }
        painelBancos.innerHTML =
          '<strong>🪑 Trocar de banco</strong>' +
          ORDEM_BANCOS.map((b) => {
            const quem = [...avatares.values()].find((a) => a.modo === 'carro' && a.banco === b);
            const nome = !quem ? 'livre' : quem === eu ? 'você' : quem.conv ? `${quem.nome} (convidado)` : quem.npc ? `${PERSONAGENS[quem.pid].nome} (sai pro lado)` : quem.nome;
            const ocupado = quem && (!quem.npc || quem.conv) && quem !== eu;
            return `<button class="mini-btn ${quem === eu ? 'ativo' : ''}" data-banco="${b}" ${ocupado ? 'disabled' : ''}>${ASSENTOS[b].icone} ${ASSENTOS[b].nome}<small>${escHtml(nome)}</small></button>`;
          }).join('');
        painelBancos.querySelectorAll('[data-banco]').forEach((b) => b.addEventListener('click', () => trocarBanco(b.dataset.banco)));
        painelBancos.classList.remove('hidden');
      }

      /** Botões da barra de baixo mudam com o lugar: dentro do carro ou na rua. */
      function atualizarAcoes() {
        const dentro = eu.modo === 'carro';
        shell.classList.toggle('rs-a-pe', !dentro && modoCam !== 'pose' && !toque); // no celular/tablet os botões continuam (não tem teclado)
        const chip = (acao, txt, ativo = false, titulo = '') => `<button class="chip-btn ${ativo ? 'ativo' : ''}" data-acao="${acao}" ${titulo ? `title="${titulo}"` : ''}>${txt}</button>`;
        acoesEl.innerHTML = dentro
          ? [
            chip('sair_entrar', '🚪 Descer <kbd>F</kbd>'),
            chip('bancos', `🪑 ${ASSENTOS[eu.banco].nome}`),
            chip('camfora', '🎥 Câmera de fora <kbd>V</kbd>', camFora),
            chip('vaga', '🅿️ Voltar pra vaga', false, 'Estaciona o Subaru de novo em frente ao portão'),
            chip('spawn', '🏁 Voltar pro spawn', false, 'Desce do carro e volta pra calçada em frente à casa'),
            chip('pose', modoCam === 'pose' ? '✓ Terminar pose <kbd>P</kbd>' : '🦾 Posar <kbd>P</kbd>', modoCam === 'pose'),
            chip('celular', '📱 Celular <kbd>C</kbd>', eu.cel),
            chip('curtir', '🎶 Curtir o som', eu.curtir),
            chip('volante', '🛞 Acelerar'),
            chip('buzina', '📣 Buzina'),
            chip('portaluvas', '🍪 Porta-luvas'),
            chip('tictac', '🍬 Compartimento'),
            chip('retrovisor', '🪞 Retrovisor'),
            chip('olhar_tras', '👀 Olhar pro Mateus')
          ].join('')
          : [
            chip('sair_entrar', '🚗 Entrar no carro <kbd>F</kbd>'),
            chip('acenar', '👋 Acenar'),
            chip('dancar', '💃 Dançar', eu.anim === 'dance'),
            chip('correr', '🏃 Correr', correrToggle, 'Ou segure Shift'),
            chip('celular', '📱 Celular <kbd>C</kbd>', eu.cel),
            chip('vaga', '🅿️ Voltar pra vaga', false, 'Estaciona o Subaru de novo em frente ao portão'),
            chip('spawn', '🏁 Voltar pro spawn', false, 'Volta pra calçada em frente à casa'),
            chip('armas', '🔫 Armas <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>', false, '1: AK-47 / AWP / Negev · 2: Desert Eagle / USP · 3: Karambit · Q guarda'),
            chip('pular', '⤴ Pular <kbd>Espaço</kbd>', false, 'Pule na hora de encostar no chão e vire a câmera com A/D apertado pra ganhar velocidade (bunny hop)')
          ].join('');
        const lbl = document.getElementById('rs-pov-lbl');
        const p = PERSONAGENS[eu.pid];
        lbl.textContent =
          modoCam === 'pose'
            ? `🦾 Posando como ${p.nome} · clique numa parte do corpo e arraste`
            : dentro && euDirijo()
              ? `🛞 ${p.nome} no volante · ${toque ? 'controle na tela dirige' : 'W/S acelera e freia · A/D vira · Espaço freio de mão · V câmera'} · F desce (parado)`
              : dentro
              ? `${p.icone} ${p.nome} · ${ASSENTOS[eu.banco].nome} · 🖱️ mexa o mouse pra olhar · F desce · P posa · C celular`
              : `🚶 ${p.nome} na rua · ${toque ? 'controle na tela' : 'WASD anda · Espaço pula · 1/2/3 armas · V câmera · Esc configurações'} · F entra no carro`;
        document.getElementById('rs-joy').classList.toggle('hidden', !(toque && (!dentro || euDirijo()) && modoCam !== 'pose'));
      }
      acoesEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-acao]');
        if (b) interagir(b.dataset.acao);
      });

      // ==================================================================
      // MOUSE, TOQUE E TECLADO
      // ==================================================================
      let arrasto = null; // { tipo: 'orbita' | 'junta', x, y, junta }
      function alvosDoClique() {
        const outros = [...avatares.values()].filter((a) => a !== eu).map((a) => a.b.group);
        if (modoCam === 'pose') return [eu.b.group];
        if (modoCam === 'carro') return clicaveis.dentro.concat(outros);
        return clicaveis.fora.concat(outros);
      }
      function acaoDoAlvo(hit) {
        if (!hit) return null;
        for (let p = hit.object; p; p = p.parent) {
          if (p.userData?.acao) return p.userData.acao;
          if (p.userData?.avatarId) {
            const a = avatares.get(p.userData.avatarId);
            if (!a || a === eu) return null;
            return a.conv ? `conv:${a.banco}` : a.npc ? a.pid : `pessoa:${a.id}`;
          }
        }
        return null;
      }
      const nomeAcao = (a) => {
        if (!a) return '';
        if (a.startsWith('pessoa:')) {
          const p = avatares.get(a.slice(7));
          return p ? `🎮 ${p.nome}${p.classico ? ' (modo clássico)' : ''} · cutucar` : '';
        }
        if (a.startsWith('conv:')) return convidados[a.slice(5)] ? `💬 ${Conv.nome(convidados[a.slice(5)])} · banco de trás` : '';
        if (a === 'entrar_carro') return eu.modo === 'pe' ? (distAoCarro(eu.pos) <= DIST_ENTRAR ? '🚗 Entrar no Subaru (F)' : '🚗 Subaru Legacy · chegue mais perto') : '';
        if (a === 'porta') return eu.modo === 'carro' ? '🚪 Descer do carro (F)' : '🚗 Entrar';
        return POV().NOMES_ACAO[a] || ({ luis: '🧢 Luis', fabricio: '🎧 Fabricio', mateus_buse: '🔇 Mateus Buse' })[a] || a;
      };

      function onMove(e) {
        if (combate?.pointerMove(e)) return;
        const r = view.getBoundingClientRect();
        if (arrasto) {
          const dx = e.clientX - arrasto.x;
          const dy = e.clientY - arrasto.y;
          arrasto.x = e.clientX;
          arrasto.y = e.clientY;
          arrasto.moveu = arrasto.moveu || Math.abs(dx) + Math.abs(dy) > 2;
          if (arrasto.tipo === 'orbita') {
            orb.yaw -= dx * 0.006;
            orb.pitch = Math.max(-0.25, Math.min(1.25, orb.pitch + dy * 0.005));
          } else if (arrasto.tipo === 'junta') {
            const [eh, ev] = arrasto.shift ? [2, 1] : EIXOS_ARRASTO[arrasto.junta] || [1, 0];
            girarJunta(arrasto.junta, eh, dx * 0.012);
            girarJunta(arrasto.junta, ev, dy * 0.012);
            atualizarSliders();
          }
          tip.classList.add('hidden');
          return;
        }
        cam.mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        cam.my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        if (cam.foco && Math.hypot(cam.mx - cam.foco.mx, cam.my - cam.foco.my) > 0.35) {
          cam.foco = null;
          cam.focoNome = null;
        }
        if (e.pointerType === 'touch') return;
        let nome = '';
        if (modoCam === 'pose') {
          const hit = picker.pick(e, [eu.b.group]);
          const j = hit ? (hit.object.userData.junta && !hit.object.userData.isOutline ? hit.object.userData.junta : eu.b.juntaDe(hit.object)) : null;
          nome = j ? `🦾 ${NOME_JUNTA[j] || j}` : '';
        } else nome = nomeAcao(acaoDoAlvo(picker.pick(e, alvosDoClique())));
        view.style.cursor = nome ? 'pointer' : modoCam !== 'carro' ? 'grab' : '';
        if (nome) {
          tip.textContent = nome;
          tip.style.left = `${e.clientX - r.left + 14}px`;
          tip.style.top = `${e.clientY - r.top + 14}px`;
          tip.classList.remove('hidden');
        } else tip.classList.add('hidden');
      }
      function onDown(e) {
        painelBancos.classList.add('hidden');
        if (combate?.pointerDown(e)) return;
        if (modoCam === 'pose') {
          const hit = picker.pick(e, [eu.b.group]);
          const j = hit ? hit.object.userData.junta || eu.b.juntaDe(hit.object) : null;
          if (j) {
            selecionarJunta(j);
            arrasto = { tipo: 'junta', junta: j, x: e.clientX, y: e.clientY, shift: e.shiftKey };
          } else arrasto = { tipo: 'orbita', x: e.clientX, y: e.clientY };
          view.setPointerCapture?.(e.pointerId);
          return;
        }
        const a = acaoDoAlvo(picker.pick(e, alvosDoClique()));
        if (modoCam === 'pe') {
          arrasto = { tipo: 'orbita', x: e.clientX, y: e.clientY, acao: a };
          view.setPointerCapture?.(e.pointerId);
          view.style.cursor = 'grabbing';
          return;
        }
        if (a) interagir(a);
      }
      function onUp() {
        combate?.pointerUp();
        if (arrasto?.tipo === 'junta') aoMudarMeuEstado(true);
        if (arrasto?.acao && !arrasto.moveu) interagir(arrasto.acao);
        arrasto = null;
        if (modoCam !== 'carro') view.style.cursor = 'grab';
      }
      function onWheel(e) {
        if (combate?.wheel(e)) return;
        if (modoCam === 'carro') return;
        e.preventDefault();
        const [mn, mx] = modoCam === 'pose' ? [0.8, 3.2] : [1.6, 8];
        orb.dist = Math.max(mn, Math.min(mx, orb.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
      }
      view.addEventListener('pointermove', onMove);
      view.addEventListener('pointerdown', onDown);
      view.addEventListener('pointerup', onUp);
      view.addEventListener('pointercancel', onUp);
      view.addEventListener('wheel', onWheel, { passive: false });

      // Controle virtual (celular/tablet)
      const joyEl = document.getElementById('rs-joy');
      const joyBola = document.getElementById('rs-joy-bola');
      function joyMove(e) {
        const r = joyEl.getBoundingClientRect();
        const raio = r.width / 2;
        let x = (e.clientX - (r.left + raio)) / raio;
        let y = (e.clientY - (r.top + raio)) / raio;
        const m = Math.hypot(x, y);
        if (m > 1) {
          x /= m;
          y /= m;
        }
        joy.x = x;
        joy.y = y;
        joyBola.style.transform = `translate(${x * raio * 0.6}px, ${y * raio * 0.6}px)`;
      }
      joyEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        joy.ativo = true;
        joyEl.setPointerCapture(e.pointerId);
        joyMove(e);
      });
      joyEl.addEventListener('pointermove', (e) => joy.ativo && joyMove(e));
      const joySolta = () => {
        joy.ativo = false;
        joy.x = joy.y = 0;
        joyBola.style.transform = '';
      };
      joyEl.addEventListener('pointerup', joySolta);
      joyEl.addEventListener('pointercancel', joySolta);

      function onKey(e) {
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === 'Escape') {
          if (combate && (combate.travado || combate.acabouDeSoltar())) return;
          if (!painelBancos.classList.contains('hidden')) return painelBancos.classList.add('hidden');
          if (modoCam === 'pose') return terminarPose();
          if (celular.aberto) return celular.fechar();
          if (painelConv?.aberto) return painelConv.fechar();
          if (!painelOnline.classList.contains('hidden')) return abrirPainelOnline(false);
          return alternarConfig();
        }
        if (e.repeat) {
          if (e.code.startsWith('Key') || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
          if (e.code === 'Space') combate?.teclaDown(e);
          return;
        }
        if (combate?.teclaDown(e)) {
          e.preventDefault();
          if (e.code === 'Space') teclas.add(e.code);
          return;
        }
        teclas.add(e.code);
        if (e.code === 'KeyF' || e.code === 'KeyE') interagir('sair_entrar');
        else if (e.code === 'KeyP') interagir('pose');
        else if (e.code === 'KeyC') interagir('celular');
        else if (e.code === 'KeyV') interagir('camfora');
        else if (e.code === 'KeyM') VOL?.alternarMudo();
        else if (e.key === '1') trocarPersonagem('luis');
        else if (e.key === '2') trocarPersonagem('fabricio');
        else if (e.key === '3') trocarPersonagem('mateus_buse');
        if ((modoCam === 'pe' || euDirijo()) && /^(Arrow|Key[WASD]|Space)/.test(e.code)) e.preventDefault();
      }
      function onKeyUp(e) {
        teclas.delete(e.code);
      }
      const limparTeclas = () => teclas.clear();
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', limparTeclas);

      // ---------------- Botões fixos ----------------
      document.getElementById('rs-prev').addEventListener('click', () => comandoRadio('prev', undefined, 'barra'));
      document.getElementById('rs-next').addEventListener('click', () => comandoRadio('next', undefined, 'barra'));
      document.getElementById('rs-play').addEventListener('click', () => comandoRadio('toggle', undefined, 'barra'));
      document.getElementById('rs-online-btn').addEventListener('click', () => abrirPainelOnline(painelOnline.classList.contains('hidden')));
      document.getElementById('rs-duelos-btn').addEventListener('click', () => combate?.abrirPainel());
      document.getElementById('rs-on-fechar').addEventListener('click', () => abrirPainelOnline(false));
      [painelOnline, painelPose, painelBancos].forEach((p) => ['keydown', 'pointerdown', 'wheel'].forEach((t) => p.addEventListener(t, (e) => e.stopPropagation())));
      ov.querySelectorAll('[data-pers]').forEach((b) => b.addEventListener('click', () => trocarPersonagem(b.dataset.pers)));

      // ==================================================================
      // LAÇO
      // ==================================================================
      let relogioT = 0;
      let quadro = 0;
      // ---------------- Pulo, armas, tiro, duelos (ResenhaCombate.js) ----------------
      const R_ARMAS = root.LuiggiResenhaCombate?.ARMAS || {};
      const vSpawn = new THREE.Vector3();
      const raioCarroTmp = new THREE.Ray();
      const combate = root.LuiggiResenhaCombate
        ? root.LuiggiResenhaCombate.criar({
            stage,
            view,
            shell,
            eu,
            avatares,
            teclas,
            orb,
            joy,
            env,
            net: () => net,
            modoCam: () => modoCam,
            colidir,
            correrSempre: () => correrToggle,
            mexeu: () => (ultimaInteracao = performance.now()),
            avisar: (txt) => falar(txt, null, '⚔️ Resenha'),
            mudouEstado: (f) => aoMudarMeuEstado(f),
            tremer: (k) => stage.shake?.(k, 8),
            /** Spawn: calçada em frente à casa (com um sorteio pequeno pra ninguém nascer em cima do outro). */
            spawn() {
              const S = root.LuiggiRuaSafepoint;
              const x = 5 + (Math.random() - 0.5) * 6;
              const c = S ? S.curvar(x, -2.3) : { x, z: -2.3 };
              vSpawn.set(c.x, 0, c.z);
              env.group.localToWorld(vSpawn);
              return { x: vSpawn.x, z: vSpawn.z, yaw: orb.yaw };
            },
            /** Leva o boneco pra (x, z) a pé (desce do carro se precisar). */
            teleportar(x, z, yaw) {
              if (eu.modo === 'carro') {
                if (euDirijo()) carro.vel = 0;
                sairDoCarro();
              }
              eu.alvo.set(x, 0, z);
              eu.pos.copy(eu.alvo);
              if (Number.isFinite(yaw)) {
                orb.yaw = yaw;
                eu.rotAlvo = yaw + Math.PI;
              }
              aoMudarMeuEstado(true);
            },
            descer() {
              if (eu.modo === 'carro') {
                if (euDirijo()) carro.vel = 0;
                sairDoCarro();
              }
            },
            /** Distância do raio até a lataria do Subaru (ou null). */
            raioNoCarro(o, d) {
              invCarro.copy(carroGrupo.matrixWorld).invert();
              raioCarroTmp.origin.copy(o);
              raioCarroTmp.direction.copy(d);
              raioCarroTmp.applyMatrix4(invCarro);
              const hit = raioCarroTmp.intersectBox(caixaCarro, tmpV);
              if (!hit) return null;
              return doCarro(tmpV.clone()).distanceTo(o);
            },
            mudarFF(v) {
              if (!net || !net.souHost) return;
              combate.definirFF(v);
              publicarEstado();
              avisoOnline(v ? '🔥 Friendly fire LIGADO: os tiros machucam todo mundo da sala.' : '🕊️ Friendly fire desligado: fora dos duelos ninguém se machuca.');
            }
          })
        : null;

      // ---------------- Minimapa e nome da rua ----------------
      const mapa = (() => {
        const D = root.__LUIGGI_BAIRRO;
        if (!env.bairro || !D || !mapaEl) return null;
        const [X0, Z0, GW, GH] = D.caixa;
        const K = 0.6; // px por metro na imagem de fundo
        const fundo = document.createElement('canvas');
        fundo.width = Math.ceil(GW * K);
        fundo.height = Math.ceil(GH * K);
        const fx = fundo.getContext('2d');
        fx.fillStyle = '#dfe7d2';
        fx.fillRect(0, 0, fundo.width, fundo.height);
        const P = (x, z) => [(x - X0) * K, (z - Z0) * K];
        (D.areas || []).forEach(([t, pl]) => {
          fx.fillStyle = t === 3 ? '#9cc3e6' : '#b9d6a3';
          fx.beginPath();
          for (let i = 0; i < pl.length; i += 2) fx[i ? 'lineTo' : 'moveTo'](...P(pl[i], pl[i + 1]));
          fx.fill();
        });
        const ifv = D.nomes.indexOf('Rua Fagundes Varela');
        const imsr = D.nomes.indexOf('Rua Mercedes Seiler Rocha');
        const linha = (pts, larg, cor) => {
          fx.strokeStyle = cor;
          fx.lineWidth = Math.max(1.2, larg * K);
          fx.lineCap = 'round';
          fx.lineJoin = 'round';
          fx.beginPath();
          pts.forEach((p, i) => fx[i ? 'lineTo' : 'moveTo'](...P(p[0], p[1])));
          fx.stroke();
        };
        const ruas = D.ruas.map(([tipo, larg, calc, nome, mao, pl]) => {
          const pts = [];
          for (let i = 0; i < pl.length; i += 2) pts.push([pl[i], pl[i + 1]]);
          return { larg, nome, pts };
        });
        // Ruas do cenário antigo (a da casa e a transversal)
        const S = root.LuiggiRuaSafepoint;
        const antigas = [];
        if (S) {
          const casa = [];
          for (let x = -112; x <= 112; x += 4) {
            const c = S.curvar(x, 5.6);
            casa.push([c.x, c.z]);
          }
          antigas.push({ larg: 8, nome: imsr, pts: casa });
          const tr = [];
          for (let z = -112; z <= 116; z += 4) {
            const c = S.curvar(52.8 + (z - 5.6) * Math.tan(0.17), z);
            tr.push([c.x, c.z]);
          }
          antigas.push({ larg: 7.6, nome: -1, pts: tr });
        }
        const todas = ruas.concat(antigas);
        todas.forEach((r) => linha(r.pts, r.larg + 5, '#ffffff'));
        todas.forEach((r) => linha(r.pts, r.larg + 1, r.nome === ifv ? '#f5b82e' : r.nome === imsr ? '#5b8def' : '#9aa1ab'));
        const cv = document.getElementById('rs-mapa-cv');
        const cx = cv.getContext('2d');
        const vaga = (() => {
          const v = new THREE.Vector3(0, 0, 0);
          env.group.worldToLocal(v);
          return v;
        })();
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        let t = 0;
        let ruaAnterior = '';
        mapaEl.classList.remove('hidden');
        mapaEl.addEventListener('click', () => mapaEl.classList.toggle('grande'));
        mapaEl.addEventListener('pointerdown', (e) => e.stopPropagation());
        return {
          atualizar(dt) {
            if ((t -= dt) > 0) return;
            // Nos níveis de gráfico leves o mapa atualiza menos (desenhar a imagem girada custa)
            t = perfilGfx.cssLeve ? 0.3 : 0.1;
            const quem = eu.modo === 'pe' ? eu.pos : carroGrupo.position;
            vA.set(quem.x, 0, quem.z);
            env.group.worldToLocal(vA);
            // Pra onde a câmera olha (no sistema do cenário)
            stage.camera.getWorldDirection(vB);
            vB.multiplyScalar(10).add(stage.camera.position);
            env.group.worldToLocal(vB);
            const cam = new THREE.Vector3().copy(stage.camera.position);
            env.group.worldToLocal(cam);
            const ang = Math.atan2(vB.x - cam.x, vB.z - cam.z);
            const W = cv.width;
            const H = cv.height;
            const escala = mapaEl.classList.contains('grande') ? 1.1 : 1.6;
            cx.save();
            cx.fillStyle = '#d5dcc8';
            cx.fillRect(0, 0, W, H);
            cx.translate(W / 2, H / 2);
            // Pra cima = pra onde a câmera olha
            cx.rotate(Math.PI + ang);
            cx.scale(escala, escala);
            const [px, pz] = P(vA.x, vA.z);
            cx.drawImage(fundo, -px, -pz);
            // Casa (vaga do Subaru)
            const [hx, hz] = P(vaga.x, vaga.z);
            cx.fillStyle = '#ef4444';
            cx.beginPath();
            cx.arc(hx - px, hz - pz, 4 / escala + 2, 0, Math.PI * 2);
            cx.fill();
            // Arena do duelo (quando tem)
            if (combate?.arena) {
              const ar = combate.arena;
              vB.set(ar.cx, 0, ar.cz);
              env.group.worldToLocal(vB);
              const [axp, azp] = P(vB.x, vB.z);
              cx.fillStyle = '#f97316';
              cx.fillRect(axp - px - 8, azp - pz - 8, 16, 16);
            }
            // O Subaru, quando a pessoa está a pé
            if (eu.modo === 'pe') {
              vB.set(carroGrupo.position.x, 0, carroGrupo.position.z);
              env.group.worldToLocal(vB);
              const [sx, sz] = P(vB.x, vB.z);
              cx.fillStyle = '#1d4ed8';
              cx.fillRect(sx - px - 3, sz - pz - 3, 6, 6);
            }
            cx.restore();
            // Seta de quem joga (sempre no meio, apontando pra cima)
            cx.fillStyle = '#111827';
            cx.strokeStyle = '#ffffff';
            cx.lineWidth = 3;
            cx.beginPath();
            cx.moveTo(W / 2, H / 2 - 13);
            cx.lineTo(W / 2 + 9, H / 2 + 10);
            cx.lineTo(W / 2, H / 2 + 5);
            cx.lineTo(W / 2 - 9, H / 2 + 10);
            cx.closePath();
            cx.stroke();
            cx.fill();
            const nome = env.nomeDaRua ? env.nomeDaRua(vA.x, vA.z) : null;
            const txt = nome ? '📍 ' + nome.replace(/^Rua /, 'R. ').replace(/^Avenida /, 'Av. ') : '📍 Bacacheri, Curitiba';
            if (txt !== ruaAnterior) {
              ruaAnterior = txt;
              ruaEl.textContent = txt;
            }
          }
        };
      })();
      // Sombra do sol acompanha quem joga (o bairro é grande; a caixa de sombra tem poucas dezenas de metros)
      const luzSol = stage.dirLight;
      const luzDesloc = luzSol ? luzSol.position.clone().sub(luzSol.target.position) : null;
      function seguirSol() {
        if (!luzSol) return;
        const alvo = eu.modo === 'pe' ? eu.pos : carroGrupo.position;
        // Anda em passos de 2 m pra sombra não "tremer"
        const x = Math.round(alvo.x / 2) * 2;
        const z = Math.round(alvo.z / 2) * 2;
        if (luzSol.target.position.x === x && luzSol.target.position.z === z) return;
        luzSol.target.position.set(x, 0, z);
        luzSol.target.updateMatrixWorld();
        luzSol.position.set(x + luzDesloc.x, luzDesloc.y, z + luzDesloc.z);
      }
      // Retrovisor só precisa do que está perto
      if (interior.camRetro) {
        interior.camRetro.far = Math.min(interior.camRetro.far || 90, 90);
        interior.camRetro.updateProjectionMatrix?.();
      }
      recalcularClicaveis();
      atualizarNPCs();
      stage.camera.position.set(...ASSENTOS.motorista.olho);
      eu.b.cabeca.visible = false;
      stage.start((dt, t) => {
        relogioT = t;
        env.update?.(dt, t, stage.camera);
        controle.update(dt, t);
        dirigir(dt);
        andar(dt);
        avatares.forEach((a) => atualizarAvatar(a, dt, t));
        combate?.update(dt);
        atualizarCamera(dt, t);
        seguirSol();
        mapa?.atualizar(dt);
        // Retrovisor: de quantos em quantos quadros atualiza depende do nível de gráfico (0 = parado)
        const cadaRetro = perfilGfx.retrovisor;
        if (modoCam === 'carro' && cadaRetro > 0 && ++quadro % cadaRetro === 0) {
          interior.retro.visible = false;
          stage.renderTo(interior.rt, stage.scene, interior.camRetro);
          interior.retro.visible = true;
        }
        posicionarTags();
        talvezEnviarAvatar(performance.now());
        // Dica de entrar quando chega perto do carro
        if (eu.modo === 'pe') {
          const perto = distAoCarro(eu.pos) <= DIST_ENTRAR;
          if (perto !== andar.perto) {
            andar.perto = perto;
            if (perto) falar(toque ? 'Toque em "Entrar no carro" pra sentar.' : 'Aperta F pra entrar no Subaru.', null, '🚗 Subaru');
          }
        }
      });

      // Uma vez por segundo: faixa, estado do anfitrião e, de vez em quando, um NPC comenta
      let ambIdx = Math.floor(Math.random() * AMBIENTE.length);
      const relogio = setInterval(() => {
        atualizarFaixa();
        if (net?.souHost) publicarEstado();
        if (performance.now() - ultimaInteracao < 40000) return;
        ultimaInteracao = performance.now();
        const convs = [...avatares.values()].filter((a) => a.conv);
        if (convs.length && Math.random() < 0.35) {
          const c = convs[Math.floor(Math.random() * convs.length)];
          falar(`"${Conv.frase(c.pid)}"`, c.pid);
          c.b.setExpression('feliz');
          c.falandoAte = relogioT + 2.5;
          return;
        }
        const linha = AMBIENTE[ambIdx++ % AMBIENTE.length];
        const npc = avatares.get(`npc:${linha.quem}`);
        if (!npc) return; // personagem "ocupado" por alguém (ou por você) não fala sozinho
        falar(linha.fala, linha.quem);
        npc.b.setExpression('feliz');
        npc.falandoAte = relogioT + 2.5;
      }, 1000);

      function sair(opts = {}) {
        const trocarPara = opts && opts.trocarPara;
        // Trocando de modo, a sala continua aberta e vai pro outro modo
        let sessao = null;
        if (trocarPara && net) {
          sessao = net;
          sessao.adotar({});
          net = null;
        } else desconectar(false);
        document.body.classList.remove('resenha-aberta');
        clearInterval(relogio);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', limparTeclas);
        desligarVolume();
        celular.dispose();
        combate?.dispose();
        avatares.forEach((a) => a.b.dispose());
        interior.rt.dispose();
        stage.dispose();
        ov.classList.add('hidden');
        ov.innerHTML = '';
        if (!trocarPara) root.LuiggiAudio.pararMusica();
        if (root.__resenha3D?.stage === stage) root.__resenha3D = null;
        resolve(trocarPara ? { trocarPara, net: sessao, convidados } : undefined);
      }
      document.getElementById('rs-config-btn').addEventListener('click', () => alternarConfig());

      // ---------------- ⚙️ Configurações: voltar ao menu, câmera, gráficos, som e teclas ----------------
      const painelConfig = document.getElementById('rs-config');
      ['pointerdown', 'wheel', 'keydown'].forEach((t) => painelConfig.addEventListener(t, (e) => e.stopPropagation()));
      const TECLAS = [
        ['W A S D / setas', 'Andar (no volante: acelerar, frear/ré e virar)'],
        ['Shift', 'A pé: passo lento (armado: passo silencioso)'],
        ['Espaço', 'Pular (segure pra pular de novo toda vez que encostar no chão · bunny hop) · no volante: freio de mão'],
        ['Rodinha do mouse', 'Armado: pular · sem arma: aproximar a câmera'],
        ['F ou E', 'Descer do carro / entrar no carro'],
        ['V', 'No carro: câmera de fora · a pé: primeira ou terceira pessoa'],
        ['1', 'AK-47 → AWP → Negev (aperte de novo pra trocar) · no carro: ser o Luis'],
        ['2', 'Desert Eagle → USP-S · no carro: ser o Fabricio'],
        ['3', 'Karambit · no carro: ser o Mateus'],
        ['Botão esquerdo', 'Atirar / golpe (clique uma vez pra travar o mouse e mirar)'],
        ['Botão direito', 'Luneta da AWP / golpe forte da faca'],
        ['R', 'Recarregar'],
        ['Q', 'Guardar a arma'],
        ['P', 'Posar (no carro)'],
        ['C', 'Celular'],
        ['M', 'Música no mudo'],
        ['Esc', 'Soltar o mouse · fechar painel · abrir estas configurações']
      ];
      function montarConfig() {
        const cfg = root.LuiggiSave?.state?.config || {};
        const L3 = L();
        const p = L3.perfilQualidade?.() || {};
        const vol = (id, v) => `<input type="range" min="0" max="1" step="0.05" data-cfg="${id}" value="${v ?? 0.8}">`;
        painelConfig.innerHTML = `
          <div class="rs-on-head"><strong>⚙️ Configurações</strong><button class="mini-btn" data-cfg="fechar" title="Fechar (Esc)">✕</button></div>
          <div class="rs-cfg-sec rs-cfg-botoes">
            <button class="mg-btn" data-cfg="menu">🏠 Voltar ao menu principal</button>
            <button class="mini-btn" data-cfg="spawn">🏁 Voltar pro spawn</button>
            <button class="mini-btn" data-cfg="vaga">🅿️ Subaru de volta na vaga</button>
            <button class="mini-btn" data-cfg="camera">${combate?.primeiraPessoa ? '🎥 Câmera: primeira pessoa' : '🎥 Câmera: terceira pessoa'} <kbd>V</kbd></button>
          </div>
          <div class="rs-cfg-sec"><b>🖥️ Gráficos</b>
            <label>Qualidade <select data-cfg="qualidade">
              ${[['auto', 'Automática'], ['muito_baixa', 'Muito baixa'], ['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['ultra', 'Ultra']].map(([v, n]) => `<option value="${v}" ${(cfg.qualidade || 'auto') === v ? 'selected' : ''}>${n}</option>`).join('')}
            </select></label>
            <label>Limite de FPS <select data-cfg="fps">
              ${[['0', 'Do nível'], ['30', '30'], ['60', '60'], ['-1', 'Sem limite']].map(([v, n]) => `<option value="${v}" ${String(cfg.limiteFps ?? 0) === v ? 'selected' : ''}>${n}</option>`).join('')}
            </select></label>
            <label><span><input type="checkbox" data-cfg="resdin" ${cfg.resDinamica !== false ? 'checked' : ''}> Resolução dinâmica</span></label>
            <small>Agora: ${L3.PERFIS_QUALIDADE?.[p.nome]?.rotulo || p.nome || '—'}${p.auto ? ' (automático)' : ''}. Sombras, efeitos e distância do bairro mudam ao reabrir a Resenha.</small>
          </div>
          <div class="rs-cfg-sec"><b>🔊 Som</b>
            <label>Música ${vol('volMusica', cfg.volMusica ?? 0.7)}</label>
            <label>Efeitos (tiros, carro…) ${vol('volSfx', cfg.volSfx ?? 0.85)}</label>
            <label>Vozes ${vol('volVozes', cfg.volVozes ?? 0.75)}</label>
          </div>
          <div class="rs-cfg-sec"><b>⌨️ Teclas</b>
            <table class="rs-cfg-teclas">${TECLAS.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>
          </div>`;
      }
      function alternarConfig(abrir) {
        const vai = abrir ?? painelConfig.classList.contains('hidden');
        if (vai) {
          montarConfig();
          if (document.pointerLockElement) document.exitPointerLock?.();
        }
        painelConfig.classList.toggle('hidden', !vai);
      }
      painelConfig.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cfg]');
        if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
        const a = b.dataset.cfg;
        if (a === 'fechar') alternarConfig(false);
        else if (a === 'menu') sair();
        else if (a === 'spawn') {
          alternarConfig(false);
          combate?.voltarProSpawn();
        } else if (a === 'vaga') {
          alternarConfig(false);
          interagir('vaga');
        } else if (a === 'camera') {
          if (modoCam !== 'pe') falar('A câmera em primeira/terceira pessoa é pra quando você está a pé (no carro, V liga a câmera de fora).', null, '⚙️ Configurações');
          else combate?.alternarCamera();
          montarConfig();
        }
      });
      const salvarCfg = () => {
        try {
          root.LuiggiSave.salvar();
        } catch (_) { }
      };
      painelConfig.addEventListener('change', (e) => {
        const cfg = root.LuiggiSave?.state?.config;
        if (!cfg) return;
        const a = e.target.dataset.cfg;
        if (a === 'qualidade') cfg.qualidade = e.target.value;
        else if (a === 'fps') cfg.limiteFps = Number(e.target.value);
        else if (a === 'resdin') cfg.resDinamica = e.target.checked;
        else return;
        salvarCfg();
        L().aplicarQualidade?.();
        montarConfig();
      });
      painelConfig.addEventListener('input', (e) => {
        const cfg = root.LuiggiSave?.state?.config;
        const a = e.target.dataset.cfg;
        if (!cfg || !['volMusica', 'volSfx', 'volVozes'].includes(a)) return;
        if (a === 'volMusica' && VOL) VOL.definir(Number(e.target.value));
        else {
          cfg[a] = Number(e.target.value);
          root.LuiggiAudio?.aplicarVolumes?.();
          salvarCfg();
        }
      });
      document.getElementById('rs-classico').addEventListener('click', () => sair({ trocarPara: 'classico' }));
      document.getElementById('rs-conv-btn')?.addEventListener('click', abrirConvidados);
      if (Conv) {
        painelConv = Conv.criarPainel({
          host: shell,
          obter: () => convidados,
          definir: definirConvidado,
          ocupado: (slot) => {
            const a = [...avatares.values()].find((x) => !x.npc && x.modo === 'carro' && x.banco === slot);
            return a ? (a.eu ? 'Você' : a.nome) : null;
          }
        });
      }

      // Começa como o personagem salvo, no banco dele (Mateus vai pro banco de trás)
      eu.banco = PERSONAGENS[eu.pid].banco;
      cam.yaw = OLHAR_BANCO[eu.banco].base;
      stage.camera.position.set(...ASSENTOS[eu.banco].olho);
      trocarPersonagem(eu.pid);
      atualizarAcoes();
      atualizarFaixa();
      atualizarListaOnline();
      if (opcoes.net) adotarRede(opcoes.net);
      else if (prefill) {
        abrirPainelOnline(true);
        avisoOnline(`Convite para a sala ${prefill}: escreva seu nome e clique em Entrar.`);
      }

      // Pra testes automatizados e depuração no console
      root.__resenha3D = { stage, env, avatares, eu, interagir, carro, voltarPraVaga, dirigir, andar, combate, get camFora() { return camFora; }, definirConvidado, get convidados() { return convidados; }, sair, trocarBanco, trocarPersonagem, comecarPose, terminarPose, selecionarJunta, girarJunta, entrarNoCarro, sairDoCarro, orb, cam, teclas, celular, get net() { return net; }, conectar, POSES_PRONTAS };
    });
  }

  root.LuiggiMomentoResenha = { abrir, PERSONAGENS, JUNTAS };
})(window);
