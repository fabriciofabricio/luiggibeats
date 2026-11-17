/**
 * src/engine/AudioEngine.js
 *
 * Motor de Áudio 100% Web Audio API + suporte nativo a MP3s reais em /assets.
 * Inclui:
 *   - Decodificação e análise automática de MP3s (OfflineAudioContext + filtro passa-baixa + onset/flux)
 *   - Cache de charts geradas no localStorage
 *   - Sintetizador de músicas de fallback (shittrap, k-pop, sad funk, underground, lo-fi, Tiago desafinado)
 *   - Sintetizador de batidas do FL Estúdio (kick, snare, clap, hi-hat, 808 com glide, vocal do Vitor)
 *   - Biblioteca completa de efeitos sonoros (SFX)
 */
(function (root) {
  'use strict';

  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let voiceGain = null;
  let currentBgStop = null;
  let currentTrackSource = null;

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      musicGain = ctx.createGain();
      sfxGain = ctx.createGain();
      voiceGain = ctx.createGain();
      musicGain.connect(ctx.destination);
      sfxGain.connect(ctx.destination);
      voiceGain.connect(ctx.destination);
      aplicarVolumes();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function aplicarVolumes() {
    if (!ctx) return;
    const cfg = root.LuiggiSave?.state?.config || {};
    musicGain.gain.value = cfg.volMusica ?? 0.7;
    sfxGain.gain.value = cfg.volSfx ?? 0.85;
    voiceGain.gain.value = cfg.volVozes ?? 0.75;
  }

  function getCurrentTime() {
    const c = ensureContext();
    return c ? c.currentTime : performance.now() / 1000;
  }

  // ==================== SINTETIZADOR DE PERCUSSÃO & INSTRUMENTOS ====================
  function playKick(when, dest = musicGain, vol = 0.8) {
    const c = ensureContext();
    if (!c) return;
    const t = when ?? c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  function playNoiseBurst(when, freq, q, dur, vol, type = 'bandpass', dest = musicGain) {
    const c = ensureContext();
    if (!c) return;
    const t = when ?? c.currentTime;
    const bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.setValueAtTime(q, t);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  function playSnare(when, dest = musicGain, vol = 0.45) {
    playNoiseBurst(when, 1800, 0.8, 0.15, vol, 'highpass', dest);
    const c = ensureContext();
    if (!c) return;
    const t = when ?? c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    g.gain.setValueAtTime(vol * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  function playClap(when, dest = musicGain, vol = 0.45) {
    const t = when ?? getCurrentTime();
    playNoiseBurst(t, 1400, 1.2, 0.06, vol, 'bandpass', dest);
    playNoiseBurst(t + 0.025, 1600, 1.2, 0.11, vol * 0.8, 'bandpass', dest);
  }

  function playHiHat(when, dest = musicGain, vol = 0.25) {
    playNoiseBurst(when, 7500, 1.5, 0.045, vol, 'highpass', dest);
  }

  function play808(when, freq = 55, glideTo = null, distortion = 0, dur = 0.42, vol = 0.7, dest = musicGain) {
    const c = ensureContext();
    if (!c) return;
    const t = when ?? c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.6);

    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    if (distortion > 0.05) {
      const ws = c.createWaveShaper();
      const k = distortion * 45;
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
      }
      ws.curve = curve;
      osc.connect(ws);
      ws.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playVitorSample(when, dest = sfxGain, vol = 0.5) {
    const c = ensureContext();
    if (!c) return;
    const t = when ?? c.currentTime;
    const osc = c.createOscillator();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.linearRampToValueAtTime(142, t + 0.14);
    osc.frequency.linearRampToValueAtTime(155, t + 0.28);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(850, t);
    f.Q.value = 3.5;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.34);
  }

  // ==================== EFEITOS SONOROS (SFX) ====================
  function playSFX(nome) {
    const c = ensureContext();
    if (!c) return;
    const t = c.currentTime;

    switch (nome) {
      case 'blip': {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(340 + Math.random() * 140, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        o.connect(g);
        g.connect(voiceGain);
        o.start(t);
        o.stop(t + 0.05);
        break;
      }
      case 'conquista': {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(f, t + i * 0.07);
          g.gain.setValueAtTime(0.24, t + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.28);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + i * 0.07);
          o.stop(t + i * 0.07 + 0.3);
        });
        break;
      }
      case 'vhs': {
        playNoiseBurst(t, 1200, 0.7, 0.45, 0.35, 'bandpass', sfxGain);
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(520, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.4);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.44);
        break;
      }
      case 'vinyl': {
        playNoiseBurst(t, 2800, 2, 0.22, 0.4, 'bandpass', sfxGain);
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, t);
        o.frequency.linearRampToValueAtTime(95, t + 0.16);
        g.gain.setValueAtTime(0.26, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.22);
        break;
      }
      case 'discord': {
        [587.33, 880].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t + i * 0.09);
          g.gain.setValueAtTime(0.22, t + i * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.16);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + i * 0.09);
          o.stop(t + i * 0.09 + 0.18);
        });
        break;
      }
      case 'buzina': {
        [370, 466].forEach((f) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t);
          o.stop(t + 0.3);
        });
        break;
      }
      case 'risada': {
        [0, 0.11, 0.22, 0.33].forEach((off, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(420 - i * 25, t + off);
          g.gain.setValueAtTime(0.2, t + off);
          g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.09);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + off);
          o.stop(t + off + 0.1);
        });
        break;
      }
      case 'bruh': {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(140, t);
        o.frequency.linearRampToValueAtTime(92, t + 0.35);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.4);
        break;
      }
      case 'grilo': {
        [0, 0.14, 0.36, 0.5].forEach((off) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(4100, t + off);
          g.gain.setValueAtTime(0.12, t + off);
          g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.08);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + off);
          o.stop(t + off + 0.09);
        });
        break;
      }
      case 'felps': {
        [660, 880, 990].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(f, t + i * 0.05);
          g.gain.setValueAtTime(0.16, t + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.14);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + i * 0.05);
          o.stop(t + i * 0.05 + 0.15);
        });
        break;
      }
      case 'voce_sabe': {
        [293.66, 261.63, 220].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(f, t + i * 0.14);
          g.gain.setValueAtTime(0.24, t + i * 0.14);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.22);
          o.connect(g);
          g.connect(sfxGain);
          o.start(t + i * 0.14);
          o.stop(t + i * 0.14 + 0.24);
        });
        break;
      }
      case 'radar':
      case 'forno': {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(nome === 'radar' ? 1480 : 1046, t);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.36);
        break;
      }
      case 'tranca': {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(920, t);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.07);
        break;
      }
      case 'boxer': {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(62, t);
        o.frequency.linearRampToValueAtTime(98, t + 0.22);
        o.frequency.linearRampToValueAtTime(68, t + 0.45);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
        o.connect(g);
        g.connect(sfxGain);
        o.start(t);
        o.stop(t + 0.5);
        break;
      }
      case 'punch': {
        playKick(t, sfxGain, 0.7);
        playNoiseBurst(t, 800, 1, 0.09, 0.4, 'lowpass', sfxGain);
        break;
      }
      case 'tiago_ruim': {
        // Propositalmente desafinado!
        [240, 267, 251, 299, 233, 312].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f, t + i * 0.24);
          g.gain.setValueAtTime(0.18, t + i * 0.24);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.24 + 0.22);
          o.connect(g);
          g.connect(musicGain);
          o.start(t + i * 0.24);
          o.stop(t + i * 0.24 + 0.23);
        });
        break;
      }
      case 'vitor_sample':
        playVitorSample(t, sfxGain, 0.5);
        break;
      default:
        playKick(t, sfxGain, 0.4);
    }
  }

  // ==================== MÚSICA DE FUNDO & RADIO ====================
  function pararMusica() {
    if (currentBgStop) {
      currentBgStop();
      currentBgStop = null;
    }
    if (currentTrackSource) {
      try {
        currentTrackSource.stop();
      } catch (_) {}
      currentTrackSource = null;
    }
  }

  function tocarEstiloSintetizado(estilo = 'lofi', bpm = 120) {
    pararMusica();
    const c = ensureContext();
    if (!c) return () => {};
    let stopped = false;
    let step = 0;
    const stepMs = (60 / bpm / 2) * 1000;
    const notas =
      estilo === 'tiago'
        ? [261, 277, 245, 311, 255, 293, 238, 329]
        : estilo === 'gotico'
        ? [220, 261.63, 246.94, 196, 220, 293.66, 261.63, 196]
        : estilo === 'sonho'
        ? [329.63, 392, 493.88, 587.33, 493.88, 392, 329.63, 293.66]
        : [220, 261.63, 329.63, 293.66, 220, 261.63, 392, 329.63];

    const timer = setInterval(() => {
      if (stopped || c.state !== 'running') return;
      const t = c.currentTime + 0.02;
      const s = step % 8;
      if (s === 0 || s === 4) playKick(t, musicGain, 0.35);
      if (s === 2 || s === 6) playSnare(t, musicGain, 0.18);
      if (estilo === 'kpop' || estilo === 'trap' || estilo === 'underground') playHiHat(t, musicGain, 0.12);
      if (s % 2 === 0) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = estilo === 'tiago' ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(notas[s], t);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g);
        g.connect(musicGain);
        o.start(t);
        o.stop(t + 0.26);
      }
      step++;
    }, stepMs);

    const stopFn = () => {
      stopped = true;
      clearInterval(timer);
    };
    currentBgStop = stopFn;
    return stopFn;
  }

  // ==================== GERADOR AUTOMÁTICO DE CHARTS (MP3 & FALLBACK) ====================
  async function analisarAudioParaChart(arrayBuffer, musicaId, dificuldade = 'medio') {
    const cacheKey = `luiggi_chart_${musicaId}_${dificuldade}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    const c = ensureContext();
    const decoded = await c.decodeAudioData(arrayBuffer.slice(0));
    const offline = new OfflineAudioContext(1, decoded.length, decoded.sampleRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;

    // Filtro passa-baixa para destacar bumbo e 808
    const lp = offline.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    src.connect(lp);
    lp.connect(offline.destination);
    src.start(0);

    const rendered = await offline.startRendering();
    const ch = rendered.getChannelData(0);
    const raw = decoded.getChannelData(0);
    const sr = decoded.sampleRate;
    const hop = Math.floor(sr * 0.04); // janela 40ms
    const minGapMs = dificuldade === 'dificil' ? 190 : dificuldade === 'medio' ? 280 : 420;
    const limiarMult = dificuldade === 'dificil' ? 1.25 : dificuldade === 'medio' ? 1.45 : 1.7;

    const energies = [];
    for (let i = 0; i < ch.length; i += hop) {
      let sum = 0;
      for (let j = i; j < i + hop && j < ch.length; j++) sum += ch[j] * ch[j];
      energies.push(Math.sqrt(sum / hop));
    }

    const avg = energies.reduce((a, b) => a + b, 0) / (energies.length || 1);
    const notas = [];
    let lastMs = -999;

    for (let k = 1; k < energies.length - 1; k++) {
      const e = energies[k];
      const flux = e - energies[k - 1];
      const ms = Math.round((k * hop * 1000) / sr);
      if (ms < 600) continue;
      if (e > avg * limiarMult && flux > avg * 0.25 && ms - lastMs >= minGapMs) {
        // Distribui trilha pela energia aguda vs grave na janela
        const start = k * hop;
        let high = 0;
        for (let j = start + 1; j < start + hop && j < raw.length; j++) {
          high += Math.abs(raw[j] - raw[j - 1]);
        }
        const ratio = high / (hop * (e + 0.001));
        const trilha = Math.min(3, Math.max(0, Math.floor((ratio * 2 + k) % 4)));
        const duracaoMs = e > avg * 2.1 && Math.random() < 0.2 ? 320 : 0;
        notas.push({ tempoMs: ms, trilha, duracaoMs });
        lastMs = ms;
      }
    }

    const result = { musicaId, duracaoTotalMs: Math.round(decoded.duration * 1000), notas };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (_) {}
    return result;
  }

  function gerarChartSintetizada(faixa, dificuldade = 'medio') {
    const bpm = faixa.bpm || 140;
    const stepMs = (60 / bpm) * 1000;
    const mult = dificuldade === 'dificil' ? 0.5 : dificuldade === 'medio' ? 1 : 1.5;
    const duracaoTotalMs = 36000;
    const notas = [];
    let t = 1000;
    let idx = 0;

    while (t < duracaoTotalMs - 1000) {
      const offsetTiago = faixa.ehMusicaDoTiago ? (Math.random() - 0.5) * 260 : 0;
      const trilha = faixa.ehMusicaDoTiago ? Math.floor(Math.random() * 4) : (idx * 3 + (idx % 2)) % 4;
      const duracaoMs = idx % 7 === 0 ? Math.round(stepMs * 0.7) : 0;
      notas.push({ tempoMs: Math.max(500, Math.round(t + offsetTiago)), trilha, duracaoMs });
      t += stepMs * mult;
      idx++;
    }
    return { musicaId: faixa.id, bpm, duracaoTotalMs, notas };
  }

  async function prepararFaixaHero(faixa, dificuldade = 'medio') {
    const c = ensureContext();
    if (faixa.customBeat) {
      return {
        buffer: null,
        chart: gerarChartSintetizada(faixa, dificuldade),
        isSynth: true
      };
    }

    // Tenta chart manual opcional
    let chartManual = null;
    if (root.LuiggiData) {
      chartManual = await root.LuiggiData.carregarChartOpcional(faixa.id);
    }

    if (faixa.arquivo && !faixa.sintetizadaFallback) {
      try {
        const res = await fetch(encodeURI(faixa.arquivo));
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buffer = await c.decodeAudioData(ab.slice(0));
          const chart = chartManual || (await analisarAudioParaChart(ab, faixa.id, dificuldade));
          return { buffer, chart, isSynth: false };
        }
      } catch (_) {}
    }

    return {
      buffer: null,
      chart: chartManual || gerarChartSintetizada(faixa, dificuldade),
      isSynth: true
    };
  }

  function tocarBuffer(audioBuffer, onEnded) {
    const c = ensureContext();
    pararMusica();
    const src = c.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(musicGain);
    const startTime = c.currentTime + 0.05;
    src.start(startTime);
    if (onEnded) src.onended = onEnded;
    currentTrackSource = src;
    return startTime;
  }

  function tocarBeatFL(beat, bpm, loop = false, onStep = null) {
    pararMusica();
    const c = ensureContext();
    if (!c) return () => {};
    let stopped = false;
    let step = 0;
    const stepMs = (60 / bpm / 4) * 1000; // semicolcheia
    const escala808 = [55, 65.41, 73.42, 82.41, 98, 110];

    const timer = setInterval(() => {
      if (stopped) return;
      const s = step % 16;
      const t = c.currentTime + 0.015;
      const vol = beat.volumes || {};
      if (beat.kick?.[s]) playKick(t, musicGain, (vol.kick ?? 0.9) * 0.85);
      if (beat.snare?.[s]) playSnare(t, musicGain, (vol.snare ?? 0.8) * 0.55);
      if (beat.clap?.[s]) playClap(t, musicGain, (vol.clap ?? 0.8) * 0.55);
      if (beat.hihat?.[s]) {
        const hv = (vol.hihat ?? 0.7) * 0.35;
        if (beat.hihat[s] === 2) {
          playHiHat(t, musicGain, hv);
          playHiHat(t + stepMs / 2000, musicGain, hv * 0.8);
        } else {
          playHiHat(t, musicGain, hv);
        }
      }
      if (beat.notes808?.[s] !== null && beat.notes808?.[s] !== undefined) {
        const f = escala808[beat.notes808[s]] || 55;
        play808(t, f, f * 0.94, beat.distortion808 || 0, 0.36, (vol.bass808 ?? 0.9) * 0.75, musicGain);
      }
      if (beat.vitor?.[s]) playVitorSample(t, musicGain, (vol.vitor ?? 0.85) * 0.55);
      if (onStep) onStep(s);
      step++;
      if (!loop && step >= 16) {
        stopped = true;
        clearInterval(timer);
      }
    }, stepMs);

    const stopFn = () => {
      stopped = true;
      clearInterval(timer);
    };
    currentBgStop = stopFn;
    return stopFn;
  }

  root.LuiggiAudio = {
    ensureContext,
    aplicarVolumes,
    getCurrentTime,
    playSFX,
    playKick,
    playSnare,
    playClap,
    playHiHat,
    play808,
    playVitorSample,
    pararMusica,
    tocarEstiloSintetizado,
    prepararFaixaHero,
    tocarBuffer,
    tocarBeatFL
  };
})(window);
