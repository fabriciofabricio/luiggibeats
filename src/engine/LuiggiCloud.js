/**
 * src/engine/LuiggiCloud.js
 * Trilha sonora do jogo como uma mini interface estilo SoundCloud ("LuiggiCloud").
 *
 * - Toca as músicas reais de assets/Musicas mp3/ (catálogo em data/musicas.json, gerado por
 *   ferramentas/gerar_trilha_sonora.js): perfis de artista, álbuns, waveform clicável, fila,
 *   aleatório, repetir e curtidas.
 * - Volume normalizado por faixa (LUFS medido com ffmpeg), para nenhuma música "estourar".
 * - Modo Trilha (som de carro): passa-alta + passa-baixa (abafado), ressonância de cabine,
 *   compressor, quase mono, ambiência curta e volume que abaixa sozinho durante os diálogos.
 *   Assim a música vira trilha de fundo e não disputa atenção com o texto.
 * - Substitui a música sintetizada do jogo, continua entre capítulos e pausa sozinha nos
 *   minigames que têm música própria (Hero, FL Estúdio, Passinho, Soundboard).
 */
(function (root) {
  'use strict';

  const LARANJA = '#ff5500';
  let catalogo = { artistas: [], albuns: [], faixas: [] };
  let audio = null;
  let grafo = null; // nós Web Audio (null = tocando direto no elemento, ex.: file://)
  let fila = [];
  let pos = -1;
  let tocando = false;
  let pausadoPeloUsuario = false;
  let suspensoes = 0;
  let aleatorio = false;
  let repetir = 'todas'; // 'todas' | 'uma' | 'nao'
  let artistaAberto = null;
  let painelAberto = false;
  let duckTimer = null;
  let pronto = false;
  const artes = new Map();

  const st = () => root.LuiggiSave?.state;
  const cfg = () => st()?.config || {};
  const modoCarro = () => cfg().trilhaModoCarro !== false;

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }
  function tempo(s) {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }
  const faixaAtual = () => (pos >= 0 ? catalogo.faixas.find((f) => f.id === fila[pos]) : null);
  const artista = (id) => catalogo.artistas.find((a) => a.id === id);

  // ------------------------------------------------------------------
  // ARTE (capas e avatares gerados quando não há imagem)
  // ------------------------------------------------------------------
  function arteGerada(chave, cor, texto) {
    if (artes.has(chave)) return artes.get(chave);
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 160, 160);
    gr.addColorStop(0, cor);
    gr.addColorStop(1, '#111318');
    g.fillStyle = gr;
    g.fillRect(0, 0, 160, 160);
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.05 + i * 0.015})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(120, 40, 20 + i * 18, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.font = 'bold 54px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, 80, 88);
    const url = c.toDataURL('image/png');
    artes.set(chave, url);
    return url;
  }
  function capaDe(f) {
    if (f?.capa) return encodeURI(f.capa);
    const a = artista(f?.artistaId) || {};
    return arteGerada(`a:${a.id}`, a.cor || LARANJA, (a.nome || '?').slice(0, 2).toUpperCase());
  }
  function avatarDe(a) {
    if (a.avatar) return encodeURI(a.avatar);
    return arteGerada(`a:${a.id}`, a.cor || LARANJA, a.nome.slice(0, 2).toUpperCase());
  }

  // ------------------------------------------------------------------
  // ÁUDIO
  // ------------------------------------------------------------------
  function respostaImpulso(ctx, dur = 0.35) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; // ruído mais "fechado", como cabine
        d[i] = lp * Math.pow(1 - i / n, 3.2);
      }
    }
    return buf;
  }

  function montarGrafo() {
    if (grafo !== null || !audio) return;
    // Em file:// o navegador bloqueia processar o áudio local: toca direto, sem efeitos
    if (location.protocol === 'file:') {
      grafo = false;
      return;
    }
    const ctx = root.LuiggiAudio?.obterContexto?.();
    if (!ctx) {
      grafo = false;
      return;
    }
    try {
      const src = ctx.createMediaElementSource(audio);
      const norm = ctx.createGain();
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 150;
      hp.Q.value = 0.7;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1350;
      lp.Q.value = 0.85;
      const cabine = ctx.createBiquadFilter();
      cabine.type = 'peaking';
      cabine.frequency.value = 260;
      cabine.Q.value = 1.1;
      cabine.gain.value = 3.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -30;
      comp.knee.value = 12;
      comp.ratio.value = 7;
      comp.attack.value = 0.008;
      comp.release.value = 0.28;
      const mono = ctx.createGain();
      mono.channelCount = 1;
      mono.channelCountMode = 'explicit';
      mono.channelInterpretation = 'speakers';
      const reverb = ctx.createConvolver();
      reverb.buffer = respostaImpulso(ctx);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.22;
      const master = ctx.createGain();
      const duck = ctx.createGain();

      src.connect(norm);
      norm.connect(dry);
      norm.connect(hp);
      hp.connect(lp);
      lp.connect(cabine);
      cabine.connect(comp);
      comp.connect(mono);
      mono.connect(wet);
      mono.connect(reverb);
      reverb.connect(revGain);
      revGain.connect(wet);
      dry.connect(master);
      wet.connect(master);
      master.connect(duck);
      duck.connect(ctx.destination);
      const medidor = ctx.createAnalyser();
      medidor.fftSize = 1024;
      duck.connect(medidor);
      grafo = { ctx, norm, dry, wet, master, duck, medidor };
      aplicarModo(true);
      aplicarVolume();
    } catch (e) {
      console.warn('[LuiggiCloud] sem efeitos de áudio:', e);
      grafo = false;
    }
  }

  function aplicarModo(instantaneo = false) {
    const carro = modoCarro();
    document.body.classList.toggle('lc-carro', carro);
    if (!grafo) return;
    const t = grafo.ctx.currentTime;
    const k = instantaneo ? 0.001 : 0.25;
    grafo.dry.gain.setTargetAtTime(carro ? 0 : 1, t, k);
    // O compressor do Web Audio aplica ganho de compensação automático: 0.32 deixa o modo carro ~5 dB abaixo do normal
    grafo.wet.gain.setTargetAtTime(carro ? 0.32 : 0, t, k);
  }

  function aplicarVolume() {
    const vol = cfg().volMusica ?? 0.7;
    const f = faixaAtual();
    const norm = Math.pow(10, (f?.ganhoDb || 0) / 20);
    if (grafo) {
      const t = grafo.ctx.currentTime;
      grafo.norm.gain.setTargetAtTime(norm, t, 0.05);
      grafo.master.gain.setTargetAtTime(vol * (modoCarro() ? 0.75 : 1), t, 0.1);
      audio.volume = 1;
    } else if (audio) {
      audio.volume = Math.max(0, Math.min(1, vol * Math.min(1, norm) * (modoCarro() ? 0.55 : 1)));
    }
  }

  /** Abaixa a trilha enquanto alguém fala (só no Modo Trilha). */
  function duck(ativo) {
    clearTimeout(duckTimer);
    const aplicar = (v) => {
      if (grafo) grafo.duck.gain.setTargetAtTime(v, grafo.ctx.currentTime, 0.18);
    };
    if (ativo) aplicar(modoCarro() ? 0.55 : 0.85);
    else duckTimer = setTimeout(() => aplicar(1), 700);
  }

  function carregar(i, tocarJa = true) {
    if (!fila.length) return;
    pos = (i + fila.length) % fila.length;
    const f = faixaAtual();
    if (!f) return;
    audio.src = encodeURI(f.arquivo);
    if (st()) {
      st().trilha = { ...(st().trilha || {}), ultima: f.id };
      root.LuiggiSave.salvar();
    }
    aplicarVolume();
    if (tocarJa) play();
    render();
  }

  function play() {
    if (!audio || !fila.length) return;
    if (pos < 0) carregar(0, false);
    montarGrafo();
    root.LuiggiAudio?.obterContexto?.();
    pausadoPeloUsuario = false;
    if (suspensoes > 0) return;
    const p = audio.play();
    if (p && p.catch) p.catch(() => esperarGesto());
  }

  function pause(peloUsuario = true) {
    if (peloUsuario) pausadoPeloUsuario = true;
    audio?.pause();
  }

  function proxima(automatico = false) {
    if (!fila.length) return;
    if (automatico && repetir === 'uma') {
      audio.currentTime = 0;
      play();
      return;
    }
    if (automatico && repetir === 'nao' && pos === fila.length - 1) {
      tocando = false;
      render();
      return;
    }
    carregar(pos + 1);
  }

  function anterior() {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else carregar(pos - 1);
  }

  function montarFila(ids, comecarEm = 0) {
    fila = ids.slice();
    if (aleatorio) {
      const primeiro = fila.splice(comecarEm, 1)[0];
      fila.sort(() => Math.random() - 0.5);
      if (primeiro) fila.unshift(primeiro);
      comecarEm = 0;
    }
    carregar(comecarEm);
  }

  function tocarFaixa(id, contexto = null) {
    const lista = contexto || catalogo.faixas.map((f) => f.id);
    const i = Math.max(0, lista.indexOf(id));
    montarFila(lista, i);
  }

  let esperandoGesto = false;
  function esperarGesto() {
    if (esperandoGesto) return;
    esperandoGesto = true;
    const go = () => {
      esperandoGesto = false;
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
      if (!pausadoPeloUsuario && suspensoes === 0) play();
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }

  // ------------------------------------------------------------------
  // INTEGRAÇÃO COM O JOGO
  // ------------------------------------------------------------------
  /** Chamado no lugar da música sintetizada. Retorna true se a trilha assumiu. */
  function assumirTrilha() {
    if (!pronto || !catalogo.faixas.length || cfg().trilhaAtiva === false) return false;
    if (!pausadoPeloUsuario && suspensoes === 0 && (!tocando || audio.paused)) {
      if (pos < 0) {
        const ultima = st()?.trilha?.ultima;
        const ids = catalogo.faixas.map((f) => f.id);
        fila = ids;
        carregar(Math.max(0, ids.indexOf(ultima)), false);
      }
      play();
    }
    return true;
  }

  /** Pausa temporária (minigames com música própria). */
  function suspender() {
    suspensoes++;
    if (audio && !audio.paused) audio.pause();
  }
  function retomar() {
    suspensoes = Math.max(0, suspensoes - 1);
    if (suspensoes === 0 && !pausadoPeloUsuario && pos >= 0) play();
  }

  function envolverMinigamesComMusica() {
    const envolver = (obj, nome) => {
      const o = root[obj];
      if (!o || typeof o[nome] !== 'function' || o[nome].__lc) return;
      const orig = o[nome];
      o[nome] = function (...args) {
        suspender();
        let r;
        try {
          r = orig.apply(this, args);
        } catch (e) {
          retomar();
          throw e;
        }
        Promise.resolve(r).finally(retomar);
        return r;
      };
      o[nome].__lc = true;
    };
    envolver('LuiggiRhythm', 'abrirLuiggiBeatsHero');
    envolver('LuiggiRhythm', 'abrirPassinhoSad');
    envolver('LuiggiRhythm', 'abrirSoundboardDiscord');
    envolver('LuiggiFLStudio', 'abrirFLEstudio');
  }

  // ------------------------------------------------------------------
  // INTERFACE
  // ------------------------------------------------------------------
  function desenharOnda(canvas, picos, progresso, o = {}) {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 40;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const barras = Math.max(10, Math.floor(w / (o.passo || 3)));
    const bw = Math.max(1, w / barras - 1);
    const lista = picos && picos.length ? picos : Array.from({ length: 60 }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 1.7)));
    const base = o.espelho ? h * 0.68 : h;
    for (let i = 0; i < barras; i++) {
      const v = lista[Math.floor((i / barras) * lista.length)] || 0.1;
      const bh = Math.max(2, v * base * 0.95);
      const x = (i / barras) * w;
      const tocado = i / barras <= progresso;
      const hover = o.hover !== undefined && i / barras <= o.hover;
      g.fillStyle = tocado ? LARANJA : hover ? 'rgba(255,85,0,0.45)' : 'rgba(255,255,255,0.32)';
      g.fillRect(x, base - bh, bw, bh);
      if (o.espelho) {
        g.fillStyle = tocado ? 'rgba(255,85,0,0.35)' : 'rgba(255,255,255,0.12)';
        g.fillRect(x, base + 1, bw, bh * 0.42);
      }
    }
  }

  function criarDom() {
    const mini = document.createElement('div');
    mini.id = 'lc-mini';
    mini.className = 'lc-mini';
    mini.innerHTML = `
      <button class="lc-mini-art" data-lc="abrir" title="Abrir LuiggiCloud"><img alt=""/></button>
      <div class="lc-mini-info" data-lc="abrir">
        <div class="lc-mini-title">LuiggiCloud</div>
        <div class="lc-mini-artist">Escolha uma faixa</div>
        <canvas class="lc-mini-wave"></canvas>
      </div>
      <div class="lc-mini-ctrl">
        <button data-lc="prev" title="Anterior">⏮</button>
        <button data-lc="play" class="lc-play" title="Tocar/Pausar">▶</button>
        <button data-lc="next" title="Próxima">⏭</button>
        <button data-lc="carro" class="lc-carro-btn" title="Modo Trilha (som de carro)">🚗</button>
      </div>`;
    document.body.appendChild(mini);

    const painel = document.createElement('div');
    painel.id = 'lc-painel';
    painel.className = 'lc-painel';
    document.body.appendChild(painel);

    mini.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lc]');
      if (!b) return;
      e.stopPropagation();
      acao(b.dataset.lc);
    });
    painel.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-lc]');
      if (!b) return;
      acao(b.dataset.lc, b.dataset);
    });
    ['keydown', 'pointerdown'].forEach((ev) => painel.addEventListener(ev, (e) => e.stopPropagation()));
    mini.addEventListener('pointerdown', (e) => e.stopPropagation());

    // Seek clicando na waveform
    const seek = (canvas, e) => {
      const r = canvas.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      if (audio.duration) audio.currentTime = k * audio.duration;
      if (audio.paused && !pausadoPeloUsuario) play();
    };
    painel.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('lc-big-wave')) seek(e.target, e);
    });
    mini.querySelector('.lc-mini-wave').addEventListener('click', (e) => {
      e.stopPropagation();
      seek(e.currentTarget, e);
    });
    painel.addEventListener('pointermove', (e) => {
      if (e.target.classList.contains('lc-big-wave')) {
        const r = e.target.getBoundingClientRect();
        e.target.dataset.hover = (e.clientX - r.left) / r.width;
      }
    });
    painel.addEventListener('pointerleave', () => painel.querySelectorAll('.lc-big-wave').forEach((c) => delete c.dataset.hover));
    painel.addEventListener('input', (e) => {
      if (e.target.dataset.lc === 'volume') {
        if (st()) {
          st().config.volMusica = Number(e.target.value);
          root.LuiggiSave.salvar();
        }
        root.LuiggiAudio?.aplicarVolumes?.();
        aplicarVolume();
      }
    });
  }

  function acao(a, ds = {}) {
    root.LuiggiAudio?.obterContexto?.();
    if (a === 'abrir') return abrirPainel(!painelAberto);
    if (a === 'fechar') return abrirPainel(false);
    if (a === 'play') {
      if (pos < 0) return tocarFaixa(catalogo.faixas[0]?.id);
      if (audio.paused) play();
      else pause(true);
    } else if (a === 'next') proxima();
    else if (a === 'prev') anterior();
    else if (a === 'carro') {
      if (st()) {
        st().config.trilhaModoCarro = !modoCarro();
        root.LuiggiSave.salvar();
      }
      aplicarModo();
      aplicarVolume();
      toast(modoCarro() ? '🚗 Modo Trilha ligado: som abafado de carro, mais baixo nos diálogos.' : '🎧 Modo Trilha desligado: som original.');
    } else if (a === 'aleatorio') aleatorio = !aleatorio;
    else if (a === 'repetir') repetir = repetir === 'todas' ? 'uma' : repetir === 'uma' ? 'nao' : 'todas';
    else if (a === 'artista') artistaAberto = ds.id || null;
    else if (a === 'faixa') {
      const lista = listaVisivel().map((f) => f.id);
      if (faixaAtual()?.id === ds.id && !audio.paused) pause(true);
      else if (faixaAtual()?.id === ds.id) play();
      else tocarFaixa(ds.id, lista);
    } else if (a === 'tocarTudo') {
      const lista = listaVisivel().map((f) => f.id);
      if (lista.length) montarFila(lista, 0);
    } else if (a === 'curtir') {
      const id = ds.id || faixaAtual()?.id;
      if (id && st()) {
        const c = new Set(st().trilha?.curtidas || []);
        c.has(id) ? c.delete(id) : c.add(id);
        st().trilha = { ...(st().trilha || {}), curtidas: [...c] };
        root.LuiggiSave.salvar();
      }
    }
    render();
  }

  function toast(msg) {
    let t = document.getElementById('lc-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lc-toast';
      t.className = 'lc-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function abrirPainel(v) {
    painelAberto = v;
    document.getElementById('lc-painel').classList.toggle('aberto', v);
    render();
  }

  const curtidas = () => new Set(st()?.trilha?.curtidas || []);

  function listaVisivel() {
    if (artistaAberto === '__curtidas') return catalogo.faixas.filter((f) => curtidas().has(f.id));
    if (artistaAberto) return catalogo.faixas.filter((f) => f.artistaId === artistaAberto);
    return catalogo.faixas;
  }

  function render() {
    const f = faixaAtual();
    const mini = document.getElementById('lc-mini');
    if (!mini) return;
    mini.querySelector('img').src = f ? capaDe(f) : arteGerada('logo', LARANJA, '☁');
    mini.querySelector('.lc-mini-title').textContent = f ? f.titulo : 'LuiggiCloud';
    mini.querySelector('.lc-mini-artist').textContent = f ? f.artista : 'Escolha uma faixa';
    mini.querySelector('.lc-play').textContent = audio && !audio.paused ? '⏸' : '▶';
    mini.querySelector('.lc-carro-btn').classList.toggle('on', modoCarro());
    mini.classList.toggle('tocando', !!(audio && !audio.paused));
    if (painelAberto) renderPainel();
  }

  function renderPainel() {
    const painel = document.getElementById('lc-painel');
    const f = faixaAtual();
    const c = curtidas();
    const a = artistaAberto && artistaAberto !== '__curtidas' ? artista(artistaAberto) : null;
    const lista = listaVisivel();
    const totalMin = Math.round(lista.reduce((s, x) => s + (x.duracao || 0), 0) / 60);
    const albunsDoArtista = a ? catalogo.albuns.filter((al) => al.artista === a.id) : [];
    const semEfeitos = grafo === false && location.protocol === 'file:';
    painel.innerHTML = `
      <div class="lc-head">
        <div class="lc-logo"><span>☁</span> LuiggiCloud</div>
        <button class="lc-x" data-lc="fechar" title="Fechar">✕</button>
      </div>
      <div class="lc-modo ${modoCarro() ? 'on' : ''}">
        <button class="lc-switch" data-lc="carro" aria-pressed="${modoCarro()}"><span></span></button>
        <div>
          <strong>🚗 Modo Trilha · som de carro</strong>
          <small>${semEfeitos ? 'Efeitos indisponíveis abrindo o index.html direto. Use o INICIAR_JOGO.bat.' : 'Abafado (passa-alta + passa-baixa), comprimido, quase mono e mais baixo durante os diálogos.'}</small>
        </div>
      </div>
      <div class="lc-agora">
        <img src="${f ? capaDe(f) : arteGerada('logo', LARANJA, '☁')}" alt=""/>
        <div class="lc-agora-info">
          <div class="lc-agora-artist">${f ? esc(f.artista) : 'Nada tocando'}</div>
          <div class="lc-agora-title">${f ? esc(f.titulo) : 'Escolha uma faixa abaixo'}</div>
          ${f?.album ? `<div class="lc-agora-album">${esc(f.album)}</div>` : ''}
        </div>
        ${f ? `<button class="lc-heart ${c.has(f.id) ? 'on' : ''}" data-lc="curtir" title="Curtir">♥</button>` : ''}
      </div>
      <canvas class="lc-big-wave"></canvas>
      <div class="lc-tempo"><span class="lc-t-atual">0:00</span><span>${tempo(f?.duracao)}</span></div>
      <div class="lc-controles">
        <button data-lc="aleatorio" class="${aleatorio ? 'on' : ''}" title="Aleatório">🔀</button>
        <button data-lc="prev" title="Anterior">⏮</button>
        <button data-lc="play" class="lc-play-big">${audio && !audio.paused ? '⏸' : '▶'}</button>
        <button data-lc="next" title="Próxima">⏭</button>
        <button data-lc="repetir" class="${repetir !== 'nao' ? 'on' : ''}" title="Repetir">${repetir === 'uma' ? '🔂' : '🔁'}</button>
      </div>
      <label class="lc-vol">🔊 <input type="range" min="0" max="1" step="0.05" data-lc="volume" value="${cfg().volMusica ?? 0.7}"/></label>
      <div class="lc-artistas">
        <button class="lc-art-chip ${!artistaAberto ? 'on' : ''}" data-lc="artista"><span class="lc-ico">☁</span>Tudo</button>
        ${catalogo.artistas
        .map((ar) => `<button class="lc-art-chip ${artistaAberto === ar.id ? 'on' : ''}" data-lc="artista" data-id="${ar.id}" style="--c:${ar.cor}"><img src="${avatarDe(ar)}" alt=""/>${esc(ar.nome)}</button>`)
        .join('')}
        <button class="lc-art-chip ${artistaAberto === '__curtidas' ? 'on' : ''}" data-lc="artista" data-id="__curtidas"><span class="lc-ico">♥</span>Curtidas</button>
      </div>
      ${a
        ? `<div class="lc-perfil" style="--c:${a.cor}">
              <img src="${avatarDe(a)}" alt=""/>
              <div><h3>${esc(a.nome)} ${a.verificado ? '<span class="lc-verif" title="Verificado">✔</span>' : ''}</h3>
              <p>${esc(a.bio || '')}</p><small>${lista.length} faixas · ${totalMin} min</small></div>
            </div>
            ${albunsDoArtista
          .filter((al) => al.capa)
          .map((al) => `<div class="lc-album"><img src="${encodeURI(al.capa)}" alt=""/><div><small>Álbum · ${al.ano || ''}</small><strong>${esc(al.titulo)}</strong><p>${esc(al.descricao)}</p></div></div>`)
          .join('')}`
        : ''}
      <div class="lc-lista-head"><strong>${artistaAberto === '__curtidas' ? 'Curtidas' : a ? 'Faixas' : 'Todas as faixas'}</strong><button class="lc-tocar-tudo" data-lc="tocarTudo">▶ Tocar</button></div>
      <div class="lc-lista">
        ${lista.length
        ? lista
          .map((x, i) => {
            const atual = f && f.id === x.id;
            return `<button class="lc-faixa ${atual ? 'atual' : ''}" data-lc="faixa" data-id="${x.id}">
                  <span class="lc-n">${atual && audio && !audio.paused ? '<span class="lc-eq"><i></i><i></i><i></i></span>' : i + 1}</span>
                  <img src="${capaDe(x)}" alt=""/>
                  <span class="lc-f-txt"><span class="lc-f-t">${esc(x.titulo)}</span><span class="lc-f-a">${esc(x.artista)}${x.album ? ' · ' + esc(x.album) : ''}</span></span>
                  ${c.has(x.id) ? '<span class="lc-f-h">♥</span>' : ''}
                  <span class="lc-f-d">${tempo(x.duracao)}</span>
                </button>`;
          })
          .join('')
        : '<p class="lc-vazio">Nenhuma faixa aqui ainda. Toque no ♥ de uma música para curtir.</p>'}
      </div>`;
  }

  let rafOnda = 0;
  function loopOnda() {
    rafOnda = requestAnimationFrame(loopOnda);
    const f = faixaAtual();
    if (!f || !audio) return;
    const prog = audio.duration ? audio.currentTime / audio.duration : 0;
    const mini = document.querySelector('#lc-mini .lc-mini-wave');
    desenharOnda(mini, f.picos, prog, { passo: 3 });
    if (painelAberto) {
      const big = document.querySelector('#lc-painel .lc-big-wave');
      desenharOnda(big, f.picos, prog, { passo: 4, espelho: true, hover: big?.dataset.hover ? Number(big.dataset.hover) : undefined });
      const ta = document.querySelector('#lc-painel .lc-t-atual');
      if (ta) ta.textContent = tempo(audio.currentTime);
    }
  }

  // ------------------------------------------------------------------
  // INICIALIZAÇÃO
  // ------------------------------------------------------------------
  function init() {
    if (pronto) return;
    const m = root.LuiggiData?.cache?.musicas || {};
    catalogo = { artistas: m.artistas || [], albuns: m.albuns || [], faixas: (m.faixas || []).filter((f) => f.arquivo && !f.sintetizadaFallback) };
    if (!catalogo.faixas.length) return;
    if (st() && st().config.trilhaModoCarro === undefined) st().config.trilhaModoCarro = true;
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('play', () => {
      tocando = true;
      render();
    });
    audio.addEventListener('pause', () => render());
    audio.addEventListener('ended', () => proxima(true));
    audio.addEventListener('error', () => setTimeout(() => proxima(true), 400));
    criarDom();
    envolverMinigamesComMusica();
    // Esconde o mini player dentro de minigames e no museu
    const obs = new MutationObserver(() => {
      const mg = !document.getElementById('minigame-overlay')?.classList.contains('hidden');
      const mus = !document.getElementById('museum-overlay')?.classList.contains('hidden');
      document.body.classList.toggle('lc-escondido', mg || mus);
    });
    ['minigame-overlay', 'museum-overlay'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
    aplicarModo(true);
    pronto = true;
    render();
    loopOnda();
  }

  /** Nível RMS da saída (0..1), útil para conferir se o som está passando pelos efeitos. */
  function nivel() {
    if (!grafo || !grafo.medidor) return null;
    const d = new Float32Array(grafo.medidor.fftSize);
    grafo.medidor.getFloatTimeDomainData(d);
    return Math.sqrt(d.reduce((s2, v) => s2 + v * v, 0) / d.length);
  }

  root.LuiggiCloud = {
    init,
    nivel,
    __seek(t) {
      if (audio) audio.currentTime = t;
    },
    assumirTrilha,
    suspender,
    retomar,
    duck,
    aplicarVolume,
    aplicarModo,
    tocarFaixa,
    proxima: () => proxima(false),
    anterior: () => anterior(),
    play,
    pause,
    abrirPainel,
    get faixa() {
      return faixaAtual();
    },
    get tocando() {
      return !!(audio && !audio.paused);
    },
    get ativo() {
      return pronto && catalogo.faixas.length > 0;
    }
  };
})(window);
