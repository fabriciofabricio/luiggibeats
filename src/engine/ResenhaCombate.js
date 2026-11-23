/**
 * src/engine/ResenhaCombate.js
 * Momento Resenha 3D: pulo e bunny hop, armas (1 = AK-47/AWP/Negev, 2 = Desert Eagle/USP, 3 = Karambit),
 * tiro com vida/morte/renascimento, friendly fire (só o dono da sala liga), "voltar pro spawn",
 * duelos 1x1 e 2x2 numa arena que aparece no meio do bairro e placar de quem ganhou mais de quem.
 *
 * Placar sem conta: cada aparelho tem uma identidade aleatória (luiggi_uid) e guarda os duelos de que participou.
 * Quando duas pessoas se encontram numa sala, elas trocam os duelos que jogaram uma contra a outra e juntam
 * (pela id do duelo), então o placar se recupera mesmo se alguém limpar o navegador. Um "código de recuperação"
 * leva a identidade e o histórico pra outro aparelho.
 *
 * Movimento no estilo dos jogos de tiro da engine Source: atrito no chão, aceleração limitada no ar (strafe),
 * pulo que não perde velocidade se apertado na hora de encostar no chão (bunny hop).
 */
(function (root) {
  'use strict';

  const T = () => root.THREE;
  const L = () => root.Luiggi3D;

  // ------------------------------------------------------------------
  // Armas
  // ------------------------------------------------------------------
  const ARMAS = {
    ak47: { slot: 1, nome: 'AK-47', icone: '🔫', dano: 36, cabeca: 4, cadencia: 0.1, auto: true, pente: 30, recarga: 2.4, espalha: 0.012, espalhaAndando: 0.06, recuo: 0.012, vel: 4.6, som: 'rifle' },
    awp: { slot: 1, nome: 'AWP', icone: '🎯', dano: 115, cabeca: 1.5, cadencia: 1.45, auto: false, pente: 5, recarga: 3.4, espalha: 0.0004, espalhaAndando: 0.14, recuo: 0.05, vel: 4.0, mira: true, som: 'awp' },
    negev: { slot: 1, nome: 'Negev', icone: '🔫', dano: 32, cabeca: 4, cadencia: 0.07, auto: true, pente: 150, recarga: 5.2, espalha: 0.03, espalhaAndando: 0.08, recuo: 0.006, vel: 3.9, som: 'negev' },
    deagle: { slot: 2, nome: 'Desert Eagle', icone: '🔫', dano: 63, cabeca: 3.6, cadencia: 0.24, auto: false, pente: 7, recarga: 2.2, espalha: 0.006, espalhaAndando: 0.07, recuo: 0.05, vel: 5.0, som: 'deagle' },
    usp: { slot: 2, nome: 'USP-S', icone: '🔫', dano: 35, cabeca: 4, cadencia: 0.17, auto: false, pente: 12, recarga: 2.2, espalha: 0.004, espalhaAndando: 0.04, recuo: 0.02, vel: 5.0, som: 'usp' },
    karambit: { slot: 3, nome: 'Karambit', icone: '🔪', dano: 40, forte: 65, alcance: 2.0, cadencia: 0.42, faca: true, vel: 5.4, som: 'faca' }
  };
  const SLOTS = { 1: ['ak47', 'awp', 'negev'], 2: ['deagle', 'usp'], 3: ['karambit'] };
  const VIDA = 100;

  // Movimento (metros e segundos): valores no espírito da engine Source, na escala dos bonecos
  const MOV = {
    gravidade: 20,
    pulo: 6.1, // ~0,9 m de altura
    atrito: 5.2,
    paradaMin: 2.0,
    acel: 5.5,
    acelAr: 12,
    arMax: 0.76, // o limite do "desejo" no ar: é ele que deixa ganhar velocidade virando a câmera no strafe
    buffer: 0.12 // apertou o pulo um pouquinho antes de encostar no chão: ainda vale
  };

  // ------------------------------------------------------------------
  // Modelos 3D das armas (feitos aqui, estilizados): cano no +z, topo no +y
  // ------------------------------------------------------------------
  function modeloArma(id) {
    const THREE = T();
    const g = new THREE.Group();
    const std = (c, r = 0.5, m = 0.4) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const caixa = (w, h, d, mat, x, y, z, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      g.add(m);
      return m;
    };
    const cil = (r1, r2, h, mat, x, y, z, rx = Math.PI / 2, seg = 10) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      g.add(m);
      return m;
    };
    const preto = std('#1b1d21', 0.45, 0.7);
    const cinza = std('#3b3f46', 0.4, 0.8);
    const madeira = std('#8a4b22', 0.6, 0.05);
    const madeiraEsc = std('#5e3216', 0.6, 0.05);
    let muzzle = 0.5;
    if (id === 'ak47') {
      // Receptor, cano, guarda-mão e coronha de madeira, pente curvo
      caixa(0.055, 0.075, 0.34, cinza, 0, 0.02, 0.05);
      caixa(0.05, 0.02, 0.28, preto, 0, 0.065, 0.06);
      cil(0.012, 0.012, 0.42, preto, 0, 0.035, 0.42);
      cil(0.008, 0.008, 0.34, preto, 0, 0.065, 0.36);
      caixa(0.06, 0.06, 0.2, madeira, 0, 0.025, 0.3);
      caixa(0.04, 0.05, 0.03, preto, 0, 0.075, 0.6);
      caixa(0.045, 0.07, 0.26, madeira, 0, -0.005, -0.23, -0.12);
      caixa(0.05, 0.11, 0.05, madeiraEsc, 0, -0.04, -0.36);
      const pente = caixa(0.04, 0.17, 0.07, std('#24262b', 0.5, 0.6), 0, -0.08, 0.12, 0.35);
      pente.position.z = 0.13;
      caixa(0.035, 0.09, 0.045, madeiraEsc, 0, -0.06, -0.04, -0.3);
      muzzle = 0.64;
    } else if (id === 'awp') {
      const verde = std('#3f5b3a', 0.65, 0.15);
      caixa(0.07, 0.09, 0.62, verde, 0, 0.0, 0.0);
      caixa(0.075, 0.14, 0.24, verde, 0, -0.01, -0.36);
      caixa(0.06, 0.06, 0.06, std('#2a3a28', 0.6, 0.1), 0, -0.05, -0.47);
      cil(0.014, 0.016, 0.62, preto, 0, 0.03, 0.6);
      cil(0.022, 0.022, 0.08, preto, 0, 0.03, 0.93);
      // Luneta
      cil(0.025, 0.025, 0.3, preto, 0, 0.11, 0.05);
      cil(0.034, 0.025, 0.06, preto, 0, 0.11, 0.22);
      cil(0.03, 0.025, 0.05, preto, 0, 0.11, -0.12);
      caixa(0.02, 0.04, 0.03, preto, 0, 0.07, 0.0);
      caixa(0.02, 0.04, 0.03, preto, 0, 0.07, 0.12);
      caixa(0.04, 0.09, 0.05, preto, 0, -0.075, 0.1);
      caixa(0.035, 0.08, 0.04, verde, 0, -0.07, -0.08, -0.3);
      muzzle = 0.98;
    } else if (id === 'negev') {
      caixa(0.07, 0.09, 0.42, cinza, 0, 0.02, 0.05);
      cil(0.015, 0.015, 0.5, preto, 0, 0.03, 0.5);
      cil(0.03, 0.03, 0.22, std('#2b2e33', 0.6, 0.5), 0, 0.03, 0.38);
      caixa(0.09, 0.12, 0.13, std('#3a3d33', 0.7, 0.2), -0.05, -0.06, 0.08);
      caixa(0.05, 0.07, 0.24, preto, 0, 0.0, -0.26);
      caixa(0.045, 0.09, 0.05, preto, 0, -0.06, -0.35);
      caixa(0.035, 0.08, 0.04, preto, 0, -0.06, -0.02, -0.3);
      // Bipé dobrado
      cil(0.006, 0.006, 0.18, preto, 0.02, 0.0, 0.6);
      cil(0.006, 0.006, 0.18, preto, -0.02, 0.0, 0.6);
      caixa(0.02, 0.03, 0.12, preto, 0, 0.085, 0.0);
      muzzle = 0.76;
    } else if (id === 'deagle') {
      const prata = std('#c7cbd1', 0.25, 1);
      caixa(0.035, 0.05, 0.22, prata, 0, 0.04, 0.05);
      caixa(0.03, 0.03, 0.2, std('#9aa0a8', 0.3, 1), 0, 0.01, 0.06);
      caixa(0.03, 0.11, 0.05, preto, 0, -0.04, -0.03, -0.25);
      caixa(0.006, 0.03, 0.03, prata, 0, 0.0, 0.04);
      cil(0.008, 0.008, 0.02, preto, 0, 0.04, 0.165);
      muzzle = 0.17;
    } else if (id === 'usp') {
      caixa(0.03, 0.04, 0.18, preto, 0, 0.035, 0.03);
      caixa(0.028, 0.025, 0.16, std('#2a2d32', 0.5, 0.6), 0, 0.01, 0.04);
      caixa(0.028, 0.1, 0.045, preto, 0, -0.035, -0.03, -0.25);
      cil(0.018, 0.018, 0.16, std('#26282c', 0.45, 0.7), 0, 0.032, 0.2);
      muzzle = 0.28;
    } else if (id === 'karambit') {
      // Lâmina curva (garra) com fio claro, cabo com argola
      const aco = std('#dfe4ea', 0.28, 0.55);
      const fio = std('#ffffff', 0.15, 0.4);
      const cabo = std('#1e2126', 0.6, 0.2);
      const curva = new THREE.Shape();
      curva.moveTo(0, 0);
      curva.quadraticCurveTo(0.06, 0.02, 0.1, 0.11);
      curva.quadraticCurveTo(0.11, 0.16, 0.085, 0.19);
      curva.quadraticCurveTo(0.08, 0.13, 0.045, 0.08);
      curva.quadraticCurveTo(0.025, 0.045, 0, 0.03);
      curva.lineTo(0, 0);
      const lam = new THREE.Mesh(new THREE.ExtrudeGeometry(curva, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 }), aco);
      lam.rotation.y = -Math.PI / 2;
      lam.position.set(0.003, 0.0, 0.06);
      g.add(lam);
      const filete = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.0025, 4, 16, 1.1), fio);
      filete.rotation.y = Math.PI / 2;
      filete.position.set(0, 0.07, 0.1);
      g.add(filete);
      caixa(0.022, 0.03, 0.11, cabo, 0, 0.0, 0.0);
      const argola = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 20), aco);
      argola.rotation.y = Math.PI / 2;
      argola.position.set(0, 0.0, -0.075);
      g.add(argola);
      muzzle = 0.25;
      g.scale.setScalar(1.35);
    }
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.userData.noOutline = true;
      }
    });
    g.userData.boca = muzzle;
    return g;
  }

  // ------------------------------------------------------------------
  // Sons (sintetizados)
  // ------------------------------------------------------------------
  let ruido = null;
  function somTiro(tipo, volume = 1) {
    const A = root.LuiggiAudio;
    const c = A?.obterContexto?.();
    if (!c || volume < 0.02) return;
    const cfg = root.LuiggiSave?.state?.config || {};
    const v = (cfg.volSfx ?? 0.85) * volume;
    if (!ruido) {
      ruido = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime;
    const P = {
      rifle: [1800, 0.16, 0.55, 90],
      negev: [1500, 0.12, 0.45, 80],
      awp: [900, 0.5, 0.9, 55],
      deagle: [1200, 0.25, 0.8, 70],
      usp: [3200, 0.07, 0.18, 0],
      faca: [5000, 0.12, 0.25, 0],
      seco: [2500, 0.05, 0.15, 0]
    }[tipo] || [1800, 0.15, 0.5, 80];
    const src = c.createBufferSource();
    src.buffer = ruido;
    const f = c.createBiquadFilter();
    f.type = tipo === 'faca' ? 'highpass' : 'lowpass';
    f.frequency.setValueAtTime(P[0], t);
    if (tipo !== 'faca') f.frequency.exponentialRampToValueAtTime(Math.max(120, P[0] * 0.2), t + P[1]);
    const gn = c.createGain();
    gn.gain.setValueAtTime(P[2] * v, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + P[1]);
    src.connect(f).connect(gn).connect(c.destination);
    src.start(t);
    src.stop(t + P[1] + 0.05);
    if (P[3]) {
      // "Soco" grave do disparo
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(P[3] * 2, t);
      o.frequency.exponentialRampToValueAtTime(P[3] * 0.5, t + 0.12);
      const g2 = c.createGain();
      g2.gain.setValueAtTime(P[2] * v * 0.9, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g2).connect(c.destination);
      o.start(t);
      o.stop(t + 0.18);
    }
  }

  // ------------------------------------------------------------------
  // Identidade (sem conta) e histórico de duelos
  // ------------------------------------------------------------------
  const Placar = (() => {
    const K_UID = 'luiggi_uid';
    const K_DUELOS = 'luiggi_duelos';
    const ler = (k) => {
      try {
        return localStorage.getItem(k);
      } catch (_) {
        return null;
      }
    };
    const gravar = (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch (_) { }
    };
    let uid = ler(K_UID);
    if (!uid || !/^[0-9a-f]{16}$/.test(uid)) {
      const b = new Uint8Array(8);
      (root.crypto || {}).getRandomValues ? root.crypto.getRandomValues(b) : b.forEach((_, i) => (b[i] = Math.floor(Math.random() * 256)));
      uid = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      gravar(K_UID, uid);
    }
    let duelos = {};
    try {
      duelos = JSON.parse(ler(K_DUELOS) || '{}') || {};
    } catch (_) {
      duelos = {};
    }
    const valido = (d) => d && typeof d.id === 'string' && Array.isArray(d.A) && Array.isArray(d.B) && (d.v === 'A' || d.v === 'B') && d.A.concat(d.B).every((p) => p && typeof p.u === 'string');
    function salvar() {
      // Guarda os 600 mais recentes
      const lista = Object.values(duelos).sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 600);
      duelos = Object.fromEntries(lista.map((d) => [d.id, d]));
      gravar(K_DUELOS, JSON.stringify(duelos));
    }
    function registrar(d) {
      if (!valido(d) || duelos[d.id]) return false;
      duelos[d.id] = d;
      salvar();
      return true;
    }
    const tem = (d, u) => d.A.some((p) => p.u === u) || d.B.some((p) => p.u === u);
    /** Duelos em que eu e a outra pessoa estávamos. */
    const entre = (outro) => Object.values(duelos).filter((d) => tem(d, uid) && tem(d, outro));
    /** Junta duelos que outra pessoa mandou (só os que me envolvem). */
    function juntar(lista) {
      let n = 0;
      (Array.isArray(lista) ? lista : []).slice(0, 600).forEach((d) => {
        if (valido(d) && tem(d, uid) && !duelos[d.id]) {
          duelos[d.id] = d;
          n++;
        }
      });
      if (n) salvar();
      return n;
    }
    /** Resumo contra cada pessoa: { u: { nome, eu, ele, eu2, ele2 } } (1x1 e 2x2). */
    function resumo() {
      const out = {};
      Object.values(duelos).forEach((d) => {
        const meuTime = d.A.some((p) => p.u === uid) ? 'A' : d.B.some((p) => p.u === uid) ? 'B' : null;
        if (!meuTime) return;
        const outros = meuTime === 'A' ? d.B : d.A;
        const ganhei = d.v === meuTime;
        outros.forEach((p) => {
          const r = out[p.u] || (out[p.u] = { nome: p.n || '?', eu: 0, ele: 0, eu2: 0, ele2: 0, t: 0 });
          if ((d.t || 0) >= r.t) {
            r.nome = p.n || r.nome;
            r.t = d.t || 0;
          }
          if (d.modo === '2x2') ganhei ? r.eu2++ : r.ele2++;
          else ganhei ? r.eu++ : r.ele++;
        });
      });
      return out;
    }
    /** Código de recuperação: identidade + histórico, pra levar pra outro aparelho. */
    function exportar() {
      const json = JSON.stringify({ u: uid, d: Object.values(duelos) });
      return 'LB1.' + btoa(unescape(encodeURIComponent(json)));
    }
    function importar(cod) {
      const s = String(cod || '').trim();
      if (!s.startsWith('LB1.')) throw new Error('Código inválido');
      const obj = JSON.parse(decodeURIComponent(escape(atob(s.slice(4)))));
      if (!obj || !/^[0-9a-f]{16}$/.test(obj.u)) throw new Error('Código inválido');
      uid = obj.u;
      gravar(K_UID, uid);
      (obj.d || []).forEach((d) => valido(d) && (duelos[d.id] = d));
      salvar();
      return Object.keys(duelos).length;
    }
    return {
      get uid() {
        return uid;
      },
      registrar,
      entre,
      juntar,
      resumo,
      exportar,
      importar
    };
  })();

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const r2 = (v) => Math.round(v * 100) / 100;

  // ------------------------------------------------------------------
  // Combate (uma instância por Momento Resenha aberto)
  // ------------------------------------------------------------------
  function criar(ctx) {
    const THREE = T();
    const { stage, view, shell, eu, avatares, teclas, orb } = ctx;
    const net = () => ctx.net();

    // ---------- Estado local ----------
    const st = {
      arma: null, // id da arma na mão (ou null)
      ultimoPorSlot: { 1: 'ak47', 2: 'deagle', 3: 'karambit' },
      municao: Object.fromEntries(Object.entries(ARMAS).map(([k, a]) => [k, a.pente || 0])),
      recarregandoAte: 0,
      proximoTiro: 0,
      atirando: false,
      mira: false, // luneta da AWP
      vida: VIDA,
      morto: false,
      renasceEm: 0,
      vel: new THREE.Vector3(),
      vy: 0,
      noChao: true,
      puloPedido: -1,
      tempoNoChao: 0,
      recuo: 0,
      ff: false,
      ataque: 0, // animação da faca
      primeira: false, // câmera em primeira pessoa (a pé)
      puloTela: false,
      travado: false,
      soltouEm: 0
    };
    eu.vida = VIDA;
    eu.uid = Placar.uid;

    // ---------- HUD ----------
    const hud = document.createElement('div');
    hud.className = 'cb-hud';
    hud.innerHTML = `
      <div class="cb-mira hidden" id="cb-mira"><i></i><i></i><i></i><i></i></div>
      <div class="cb-luneta hidden" id="cb-luneta"></div>
      <div class="cb-acerto hidden" id="cb-acerto">✕</div>
      <div class="cb-dano" id="cb-dano"></div>
      <div class="cb-status hidden" id="cb-status"><span class="cb-vida" id="cb-vida">❤ 100</span><span class="cb-arma" id="cb-arma"></span><span class="cb-velo" id="cb-velo"></span></div>
      <div class="cb-feed" id="cb-feed"></div>
      <div class="cb-duelo hidden" id="cb-duelo"></div>
      <div class="cb-morto hidden" id="cb-morto"></div>
      <div class="cb-convite hidden" id="cb-convite"></div>`;
    shell.appendChild(hud);
    const $ = (id) => hud.querySelector('#' + id);
    const miraEl = $('cb-mira');
    const lunetaEl = $('cb-luneta');
    const acertoEl = $('cb-acerto');
    const danoEl = $('cb-dano');
    const statusEl = $('cb-status');
    const vidaEl = $('cb-vida');
    const armaEl = $('cb-arma');
    const veloEl = $('cb-velo');
    const feedEl = $('cb-feed');
    const dueloEl = $('cb-duelo');
    const mortoEl = $('cb-morto');
    const conviteEl = $('cb-convite');
    ['pointerdown', 'click', 'wheel'].forEach((t) => conviteEl.addEventListener(t, (e) => e.stopPropagation()));

    // ---------- Armas nas mãos dos bonecos ----------
    const cacheModelos = new Map();
    function armaDoAvatar(a) {
      const id = a.eu ? st.arma : a.arma;
      if (a.armaObj && (a.armaObj.userData.id !== id || a.armaObj.parent !== a.b.maoDireita)) {
        a.armaObj.parent?.remove(a.armaObj);
        a.armaObj = null;
      }
      if (!id || !ARMAS[id] || a.morto || (a.eu && st.morto)) {
        if (a.armaObj) {
          a.armaObj.parent?.remove(a.armaObj);
          a.armaObj = null;
        }
        return null;
      }
      if (!a.armaObj && a.b.maoDireita) {
        let base = cacheModelos.get(id);
        if (!base) cacheModelos.set(id, (base = modeloArma(id)));
        const w = new THREE.Group();
        const m = base.clone();
        // Na mão: o cano aponta pra onde o antebraço aponta (−y da mão) e o topo pra +z
        m.rotation.x = Math.PI / 2;
        if (ARMAS[id].faca) m.position.set(0, -0.02, 0.01);
        else m.position.set(0, -0.03, -0.015);
        w.add(m);
        w.userData.id = id;
        w.userData.boca = base.userData.boca;
        a.b.maoDireita.add(w);
        a.armaObj = w;
      }
      return a.armaObj;
    }

    /** Rotações extras (somadas à pose) pra segurar a arma, mirar pra cima/baixo e encolher as pernas no pulo. */
    function extrasDe(a) {
      const ex = {};
      const id = a.eu ? st.arma : a.arma;
      const morto = a.eu ? st.morto : a.morto;
      if (morto || a.modo !== 'pe') return ex;
      const pitch = Math.max(-0.9, Math.min(0.9, a.eu ? -(orb.pitch - 0.18) * 0.9 : a.mirY || 0));
      const def = ARMAS[id];
      if (def && !def.faca) {
        if (def.slot === 2) {
          ex.sR = [-1.45 - pitch, 0, -0.12];
          ex.eR = [-0.05, 0, 0];
          ex.sL = [-1.42 - pitch, 0, 0.5];
          ex.eL = [-0.1, 0, 0];
        } else {
          // Coronha no ombro: cotovelo direito dobrado, mão esquerda lá na frente no guarda-mão
          ex.sR = [-1.0 - pitch, 0, -0.3];
          ex.eR = [-0.57, 0, 0];
          ex.sL = [-1.15 - pitch, 0, 0.85];
          ex.eL = [-0.2, 0, 0];
          ex.spine = [0, -0.25, 0];
          ex.head = [0, 0.25, 0];
        }
      } else if (def && def.faca) {
        const golpe = a.eu ? st.ataque : a.golpe || 0;
        ex.sR = [-0.45 - golpe * 1.2, 0, -0.18 - golpe * 0.4];
        ex.eR = [-0.85 + golpe * 0.7, 0, 0];
      }
      const noAr = a.eu ? !st.noChao : (a.alturaY || 0) > 0.12;
      if (noAr) {
        ex.hL = [-0.55, 0, 0];
        ex.hR = [-0.55, 0, 0];
        ex.kL = [1.0, 0, 0];
        ex.kR = [1.0, 0, 0];
      }
      return ex;
    }

    // ---------- Regras de dano ----------
    let duelo = null; // { id, modo, A:[ids], B:[ids], dono, arena, placar:[a,b], rodada, vivos, ... }
    const timeDe = (id) => (duelo ? (duelo.A.includes(id) ? 'A' : duelo.B.includes(id) ? 'B' : null) : null);
    function podeDano(atirador, alvo) {
      if (atirador === alvo) return false;
      const ta = timeDe(atirador);
      const tb = timeDe(alvo);
      if (duelo && duelo.ativo) {
        if (ta && tb) return ta !== tb;
        if (ta || tb) return false;
      }
      return st.ff;
    }

    // ---------- Tiros: traçantes, faíscas, marcas ----------
    const efeitos = [];
    const matTracante = new THREE.LineBasicMaterial({ color: '#ffe8a3', transparent: true, opacity: 0.9 });
    const matFlash = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.95 });
    const geoFlash = new THREE.SphereGeometry(0.06, 6, 5);
    function efeitoTiro(o, f, comFlash = true) {
      const g = new THREE.BufferGeometry().setFromPoints([o, f]);
      const l = new THREE.Line(g, matTracante.clone());
      l.userData.noOutline = true;
      stage.scene.add(l);
      efeitos.push({ obj: l, vida: 0.07, total: 0.07 });
      if (comFlash) {
        const fl = new THREE.Mesh(geoFlash, matFlash.clone());
        fl.position.copy(o);
        fl.scale.setScalar(1.6);
        stage.scene.add(fl);
        efeitos.push({ obj: fl, vida: 0.05, total: 0.05 });
      }
      const fa = new THREE.Mesh(geoFlash, new THREE.MeshBasicMaterial({ color: '#cbd5e1', transparent: true, opacity: 0.8 }));
      fa.position.copy(f);
      fa.scale.setScalar(0.6);
      stage.scene.add(fa);
      efeitos.push({ obj: fa, vida: 0.18, total: 0.18 });
    }
    function atualizarEfeitos(dt) {
      for (let i = efeitos.length - 1; i >= 0; i--) {
        const e = efeitos[i];
        e.vida -= dt;
        if (e.obj.material) e.obj.material.opacity = Math.max(0, e.vida / e.total);
        if (e.vida <= 0) {
          stage.scene.remove(e.obj);
          e.obj.geometry !== geoFlash && e.obj.geometry?.dispose();
          e.obj.material?.dispose();
          efeitos.splice(i, 1);
        }
      }
    }

    // ---------- Arena de duelo ----------
    const ARENAS = { '1x1': { hx: 13, hz: 8 }, '2x2': { hx: 18, hz: 11 } };
    let arena = null; // { grupo, centro, yaw, hx, hz, caixas:[{x,z,hx,hz,h}] }
    function lugaresDeArena() {
      // Parques e praças do bairro (no meio da cidade), do maior pro menor; reserva: a rua da casa
      const lista = [];
      const D = root.__LUIGGI_BAIRRO;
      const env = ctx.env;
      if (D && env?.group) {
        (D.areas || []).forEach(([t, pl]) => {
          if (t === 3 || pl.length < 8) return;
          let a = 0;
          let cx = 0;
          let cz = 0;
          const n = pl.length / 2;
          for (let i = 0; i < n; i++) {
            const x0 = pl[i * 2], z0 = pl[i * 2 + 1];
            const x1 = pl[((i + 1) % n) * 2], z1 = pl[((i + 1) % n) * 2 + 1];
            const c = x0 * z1 - x1 * z0;
            a += c;
            cx += (x0 + x1) * c;
            cz += (z0 + z1) * c;
          }
          a /= 2;
          if (Math.abs(a) < 1500) return;
          cx /= 6 * a;
          cz /= 6 * a;
          lista.push({ x: cx, z: cz, area: Math.abs(a) });
        });
      }
      lista.sort((a, b) => b.area - a.area);
      const out = lista.slice(0, 6).map((p) => {
        const v = new THREE.Vector3(p.x, 0, p.z);
        env.group.localToWorld(v);
        return { x: v.x, z: v.z };
      });
      if (!out.length) out.push({ x: 40, z: 25 });
      return out;
    }
    let lugares = null;
    function montarArena(modo, idx) {
      desmontarArena();
      lugares = lugares || lugaresDeArena();
      const p = lugares[(idx || 0) % lugares.length];
      const dim = ARENAS[modo] || ARENAS['1x1'];
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const M = L().M;
      const chao = new THREE.Mesh(new THREE.BoxGeometry(dim.hx * 2 + 1, 0.12, dim.hz * 2 + 1), M.std('#9ca3af', 0.85));
      chao.position.y = 0.06;
      chao.receiveShadow = true;
      g.add(chao);
      // Faixas no chão (meio e áreas de spawn)
      const faixa = (w, d, x, z, cor) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), M.std(cor, 0.7));
        m.position.set(x, 0.13, z);
        g.add(m);
      };
      faixa(0.25, dim.hz * 2, 0, 0, '#f8fafc');
      faixa(2.5, 4, -dim.hx + 1.6, 0, '#ef4444');
      faixa(2.5, 4, dim.hx - 1.6, 0, '#3b82f6');
      const parede = M.std('#334155', 0.7);
      const listra = M.std('#f97316', 0.6);
      const muro = (w, d, x, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), parede);
        m.position.set(x, 1.6, z);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        const l = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.25, d + 0.02), listra);
        l.position.set(x, 3.0, z);
        g.add(l);
      };
      muro(dim.hx * 2 + 1, 0.5, 0, -dim.hz - 0.25);
      muro(dim.hx * 2 + 1, 0.5, 0, dim.hz + 0.25);
      muro(0.5, dim.hz * 2, -dim.hx - 0.25, 0);
      muro(0.5, dim.hz * 2, dim.hx + 0.25, 0);
      // Caixotes de cobertura (simétricos)
      const caixas = [];
      const madeira = M.std('#a16207', 0.8);
      const caixote = (x, z, w, d, h) => {
        [1, -1].forEach((s) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), madeira);
          m.position.set(s * x, h / 2 + 0.12, s * z);
          m.castShadow = true;
          m.receiveShadow = true;
          g.add(m);
          caixas.push({ x: s * x, z: s * z, hx: w / 2, hz: d / 2, h: h + 0.12 });
        });
      };
      caixote(dim.hx * 0.45, dim.hz * 0.45, 1.4, 1.4, 1.2);
      caixote(dim.hx * 0.2, -dim.hz * 0.5, 1.2, 2.6, 1.0);
      caixote(dim.hx * 0.62, -dim.hz * 0.15, 1.0, 1.0, 1.8);
      if (modo === '2x2') {
        caixote(dim.hx * 0.1, dim.hz * 0.15, 1.2, 1.2, 1.2);
        caixote(dim.hx * 0.8, dim.hz * 0.6, 1.4, 1.0, 1.0);
      }
      // Placa
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 128;
      const c2 = cv.getContext('2d');
      c2.fillStyle = '#0f172a';
      c2.fillRect(0, 0, 512, 128);
      c2.fillStyle = '#f97316';
      c2.font = 'bold 64px Arial';
      c2.textAlign = 'center';
      c2.fillText(`⚔ ARENA ${modo}`, 256, 86);
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      placa.position.set(0, 4.3, -dim.hz - 0.55);
      g.add(placa);
      const placa2 = placa.clone();
      placa2.position.set(0, 4.3, dim.hz + 0.55);
      placa2.rotation.y = Math.PI;
      g.add(placa2);
      g.traverse((m) => m.isMesh && (m.userData.noOutline = true));
      stage.scene.add(g);
      arena = { grupo: g, cx: p.x, cz: p.z, hx: dim.hx, hz: dim.hz, caixas };
      return arena;
    }
    function desmontarArena() {
      if (!arena) return;
      stage.scene.remove(arena.grupo);
      L().disposeObject?.(arena.grupo);
      arena = null;
    }
    function spawnNaArena(time, i) {
      if (!arena) return null;
      const lado = time === 'A' ? -1 : 1;
      return { x: arena.cx + lado * (arena.hx - 1.6), z: arena.cz + (i ? 1.6 : -1.6) * (duelo?.modo === '2x2' ? 1 : 0), yaw: lado < 0 ? -Math.PI / 2 : Math.PI / 2 };
    }
    /** Dentro da arena: fica entre as paredes e fora dos caixotes. Fora dela: não entra. */
    function limitarArena(p, raio, dentro) {
      if (!arena) return;
      const lx = p.x - arena.cx;
      const lz = p.z - arena.cz;
      if (dentro) {
        p.x = arena.cx + Math.max(-arena.hx + raio, Math.min(arena.hx - raio, lx));
        p.z = arena.cz + Math.max(-arena.hz + raio, Math.min(arena.hz - raio, lz));
        arena.caixas.forEach((c) => {
          const dx = p.x - (arena.cx + c.x);
          const dz = p.z - (arena.cz + c.z);
          const ox = c.hx + raio - Math.abs(dx);
          const oz = c.hz + raio - Math.abs(dz);
          if (ox > 0 && oz > 0 && (p.y || 0) < c.h - 0.05) {
            if (ox < oz) p.x += Math.sign(dx || 1) * ox;
            else p.z += Math.sign(dz || 1) * oz;
          }
        });
      } else {
        const ox = arena.hx + 0.6 + raio - Math.abs(lx);
        const oz = arena.hz + 0.6 + raio - Math.abs(lz);
        if (ox > 0 && oz > 0) {
          if (ox < oz) p.x += Math.sign(lx || 1) * ox;
          else p.z += Math.sign(lz || 1) * oz;
        }
      }
    }
    const naArena = () => !!(duelo && duelo.ativo && arena && timeDe(net()?.eu));

    // ---------- Movimento: pulo, atrito, strafe no ar ----------
    const wish = new THREE.Vector3();
    function acelerar(dir, velDesejada, acel, dt, noAr) {
      const lim = noAr ? Math.min(velDesejada, MOV.arMax) : velDesejada;
      const atual = st.vel.dot(dir);
      const falta = lim - atual;
      if (falta <= 0) return;
      const add = Math.min(falta, acel * velDesejada * dt);
      st.vel.addScaledVector(dir, add);
    }
    function atrito(dt) {
      const v = Math.hypot(st.vel.x, st.vel.z);
      if (v < 0.02) {
        st.vel.x = st.vel.z = 0;
        return;
      }
      const queda = Math.max(v, MOV.paradaMin) * MOV.atrito * dt;
      const k = Math.max(0, v - queda) / v;
      st.vel.x *= k;
      st.vel.z *= k;
    }
    const antes = new THREE.Vector3();
    function mover(dt) {
      if (ctx.modoCam() !== 'pe') return;
      if (st.morto) {
        eu.anim = 'idle';
        return;
      }
      let ix = 0;
      let iz = 0;
      if (teclas.has('KeyW') || teclas.has('ArrowUp')) iz += 1;
      if (teclas.has('KeyS') || teclas.has('ArrowDown')) iz -= 1;
      if (teclas.has('KeyD') || teclas.has('ArrowRight')) ix += 1;
      if (teclas.has('KeyA') || teclas.has('ArrowLeft')) ix -= 1;
      const joy = ctx.joy;
      if (joy.ativo) {
        ix += joy.x;
        iz += -joy.y;
      }
      const mag = Math.min(1, Math.hypot(ix, iz));
      const def = ARMAS[st.arma];
      const shift = teclas.has('ShiftLeft') || teclas.has('ShiftRight');
      // Sem arma: andar devagar e Shift corre (como antes). Armado: corre por padrão e Shift anda (passo silencioso)
      let maxVel;
      if (def) maxVel = shift ? def.vel * 0.52 : def.vel;
      // Sem arma: anda num passo normal (4,4 m/s); Shift = passo lento; "Correr" ligado = corrida
      else maxVel = shift ? 1.9 : ctx.correrSempre() ? 5.6 : 4.4;
      if (st.mira) maxVel *= 0.5;
      const fx = -Math.sin(orb.yaw), fz = -Math.cos(orb.yaw);
      const rx = Math.cos(orb.yaw), rz = -Math.sin(orb.yaw);
      wish.set(fx * iz + rx * ix, 0, fz * iz + rz * ix);
      if (wish.lengthSq() > 1e-6) wish.normalize();
      const agora = performance.now() / 1000;
      // Pulo: no chão e com o pulo apertado agora há pouco (bunny hop: pula sem atrito)
      // Segurando Espaço o pulo sai sozinho toda vez que encosta no chão (bunny hop segurando)
      const quer = (st.puloPedido > 0 && agora - st.puloPedido < MOV.buffer) || teclas.has('Space') || st.puloTela;
      if (st.noChao) {
        if (quer) {
          st.vy = MOV.pulo;
          st.noChao = false;
          st.puloPedido = -1;
          st.tempoNoChao = 0;
          // no frame do pulo não tem atrito: a velocidade do strafe passa pro próximo pulo
          if (mag > 0.05) acelerar(wish, maxVel * mag, MOV.acel, dt, false);
        } else {
          st.tempoNoChao += dt;
          atrito(dt);
          if (mag > 0.05) acelerar(wish, maxVel * mag, MOV.acel, dt, false);
        }
      } else if (mag > 0.05) acelerar(wish, maxVel * mag, MOV.acelAr, dt, true);
      // Gravidade
      if (!st.noChao) {
        st.vy -= MOV.gravidade * dt;
        eu.alvo.y += st.vy * dt;
        if (eu.alvo.y <= 0) {
          eu.alvo.y = 0;
          st.vy = 0;
          st.noChao = true;
          st.tempoNoChao = 0;
        }
      }
      // Anda e colide (rua/calçadas, Subaru, arena); o que bater na parede perde a velocidade naquela direção
      antes.copy(eu.alvo);
      eu.alvo.x += st.vel.x * dt;
      eu.alvo.z += st.vel.z * dt;
      if (naArena()) limitarArena(eu.alvo, 0.3, true);
      else {
        ctx.colidir(eu.alvo);
        limitarArena(eu.alvo, 0.3, false);
      }
      if (dt > 0) {
        const realX = (eu.alvo.x - antes.x) / dt;
        const realZ = (eu.alvo.z - antes.z) / dt;
        if (Math.abs(realX - st.vel.x) > 0.01) st.vel.x = realX;
        if (Math.abs(realZ - st.vel.z) > 0.01) st.vel.z = realZ;
      }
      const vh = Math.hypot(st.vel.x, st.vel.z);
      // Pra onde o boneco olha: armado, pra onde a câmera olha; sem arma, pra onde anda
      if (def || st.primeira) eu.rotAlvo = orb.yaw + Math.PI;
      else if (vh > 0.3) eu.rotAlvo = Math.atan2(st.vel.x, st.vel.z);
      eu.anim = !st.noChao ? 'idle' : vh > 3.2 ? 'run' : vh > 0.25 ? 'walk' : 'idle';
      if (vh > 0.2 || !st.noChao) ctx.mexeu();
    }

    // ---------- Disparo ----------
    const raio = new THREE.Raycaster();
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const dirTiro = new THREE.Vector3();
    function bocaDaArma(a, out) {
      const w = armaDoAvatar(a);
      if (w) {
        out.set(0, -(w.userData.boca || 0.5), 0);
        return w.localToWorld(out);
      }
      a.b.cabeca.getWorldPosition(out);
      out.y -= 0.25;
      return out;
    }
    /** Distância até um capsulão (segmento a-b com raio r) ao longo do raio, ou Infinity. */
    function raioCapsula(o, d, a, b, r) {
      // Amostra o segmento (simples e suficiente pra hitbox)
      let melhor = Infinity;
      for (let i = 0; i <= 6; i++) {
        vC.copy(a).lerp(b, i / 6);
        const t = vC.clone().sub(o).dot(d);
        if (t < 0) continue;
        const dist2 = o.clone().addScaledVector(d, t).distanceToSquared(vC);
        if (dist2 < r * r) melhor = Math.min(melhor, t - Math.sqrt(r * r - dist2));
      }
      return melhor;
    }
    /** Primeiro obstáculo do cenário no caminho do tiro (muros dos lotes, Subaru, arena), em metros. */
    function obstaculoNoRaio(o, d, max) {
      let dist = max;
      // Arena
      if (arena) {
        const tests = [{ x: 0, z: -arena.hz - 0.25, hx: arena.hx + 0.5, hz: 0.25, h: 3.2 }, { x: 0, z: arena.hz + 0.25, hx: arena.hx + 0.5, hz: 0.25, h: 3.2 }, { x: -arena.hx - 0.25, z: 0, hx: 0.25, hz: arena.hz, h: 3.2 }, { x: arena.hx + 0.25, z: 0, hx: 0.25, hz: arena.hz, h: 3.2 }].concat(arena.caixas);
        const box = new THREE.Box3();
        const rr = new THREE.Ray(o, d);
        tests.forEach((c) => {
          box.min.set(arena.cx + c.x - c.hx, 0, arena.cz + c.z - c.hz);
          box.max.set(arena.cx + c.x + c.hx, c.h, arena.cz + c.z + c.hz);
          if (rr.intersectBox(box, vA)) dist = Math.min(dist, vA.distanceTo(o));
        });
      }
      // Subaru
      const t = ctx.raioNoCarro?.(o, d);
      if (t != null && t < dist) dist = t;
      // Bairro: anda pelo raio e para no primeiro lote/muro (até ~2,6 m de altura)
      const bairro = ctx.env?.bairro;
      if (bairro && !naArena()) {
        const env = ctx.env;
        for (let s = 1; s < dist; s += 0.5) {
          vA.copy(o).addScaledVector(d, s);
          if (vA.y > 2.6 || vA.y < 0) {
            if (vA.y < 0) return Math.min(dist, s);
            continue;
          }
          vB.copy(vA);
          env.group.worldToLocal(vB);
          if (bairro.classeEm(vB.x, vB.z) === 0) return Math.min(dist, s);
        }
      }
      return dist;
    }
    function atirar() {
      const def = ARMAS[st.arma];
      if (!def || st.morto) return;
      const agora = performance.now() / 1000;
      if (agora < st.proximoTiro || agora < st.recarregandoAte) return;
      st.proximoTiro = agora + def.cadencia;
      const n = net();
      if (def.faca) {
        golpe(def, false);
        return;
      }
      if (st.municao[st.arma] <= 0) {
        somTiro('seco', 0.6);
        recarregar();
        return;
      }
      st.municao[st.arma]--;
      // Raio do centro da tela (a mira), com espalhamento (andando/pulando espalha mais; luneta da AWP só é precisa parada)
      const cam = stage.camera;
      // Matrizes em dia (o tiro pode sair entre um quadro e outro)
      cam.updateMatrixWorld();
      avatares.forEach((a) => !a.eu && a.modo === 'pe' && a.b.group.updateMatrixWorld(true));
      const vh = Math.hypot(st.vel.x, st.vel.z);
      let esp = def.espalha + (vh > 1 ? def.espalhaAndando * Math.min(1, vh / 4) : 0) + (!st.noChao ? def.espalhaAndando * 1.5 : 0) + st.recuo * 0.6;
      if (st.arma === 'awp' && !st.mira) esp += 0.08;
      cam.getWorldDirection(dirTiro);
      dirTiro.x += (Math.random() - 0.5) * 2 * esp;
      dirTiro.y += (Math.random() - 0.5) * 2 * esp + st.recuo * 0.5;
      dirTiro.z += (Math.random() - 0.5) * 2 * esp;
      dirTiro.normalize();
      const o = cam.position.clone();
      // O raio sai da câmera (a mira é o centro da tela); paredes só contam a partir do próprio boneco
      // (a câmera fica atrás do ombro e pode estar "dentro" de um muro)
      vA.set(eu.pos.x - o.x, 0, eu.pos.z - o.z);
      const pular = Math.max(0, vA.dot(dirTiro) - 0.4);
      const alcance = 600;
      const parede = pular + obstaculoNoRaio(o.clone().addScaledVector(dirTiro, pular), dirTiro, alcance - pular);
      let alvo = null;
      let distAlvo = parede;
      let cabeca = false;
      avatares.forEach((a, id) => {
        if (a.eu || a.modo !== 'pe' || a.morto || a.npc || a.classico) return;
        a.b.cabeca.getWorldPosition(vA);
        // Cabeça
        const tc = raioCapsula(o, dirTiro, vA, vA, 0.16);
        if (tc < distAlvo) {
          distAlvo = tc;
          alvo = id;
          cabeca = true;
        }
        vB.set(a.pos.x, a.pos.y + 0.25, a.pos.z);
        vC.set(a.pos.x, vA.y - 0.24, a.pos.z);
        const tb = raioCapsula(o, dirTiro, vB.clone(), vC.clone(), 0.27);
        if (tb < distAlvo - 0.01) {
          distAlvo = tb;
          alvo = id;
          cabeca = false;
        }
      });
      const fim = o.clone().addScaledVector(dirTiro, Math.min(distAlvo, alcance));
      st.ultimoTiro = { o: o.toArray().map(r2), d: dirTiro.toArray().map((v) => Math.round(v * 1000) / 1000), parede: r2(parede), alvo, dist: r2(distAlvo), cabeca, alvos: [...avatares.values()].filter((a) => !a.eu).map((a) => `${a.modo}:${a.pos.toArray().map(r2)}${a.morto ? ' morto' : ''}${a.npc ? ' npc' : ''}${a.classico ? ' cls' : ''}`) };
      const boca = bocaDaArma(eu, new THREE.Vector3());
      efeitoTiro(boca, fim);
      somTiro(def.som, 1);
      st.recuo = Math.min(0.12, st.recuo + def.recuo);
      orb.pitch = Math.max(-0.6, Math.min(1.25, orb.pitch - def.recuo * 0.6));
      eu.atirouEm = performance.now();
      if (st.municao[st.arma] <= 0) setTimeout(recarregar, 250);
      let dano = 0;
      if (alvo) {
        dano = Math.round(def.dano * (cabeca ? def.cabeca : 1) * (distAlvo > 60 && !def.mira ? 0.85 : 1));
        if (n && podeDano(n.eu, alvo)) mostrarAcerto(cabeca);
        else if (n) avisoRapido(duelo?.ativo ? 'Fora do duelo: o tiro não machuca.' : 'Friendly fire desligado (o dono da sala liga em ⚔️).');
      }
      if (n) n.enviarEvento({ tipo: 'tiro', a: st.arma, o: [r2(boca.x), r2(boca.y), r2(boca.z)], f: [r2(fim.x), r2(fim.y), r2(fim.z)], alvo, dano, cab: cabeca ? 1 : 0 });
      if (st.arma === 'awp' && st.mira) definirMira(false);
      atualizarHud();
    }
    function golpe(def, forte) {
      st.ataque = 1;
      somTiro('faca', 0.8);
      const n = net();
      // Alvo mais perto na frente (até 2 m)
      const fx = -Math.sin(orb.yaw), fz = -Math.cos(orb.yaw);
      let alvo = null;
      let dm = def.alcance;
      let costas = false;
      avatares.forEach((a, id) => {
        if (a.eu || a.modo !== 'pe' || a.morto || a.npc || a.classico) return;
        const dx = a.pos.x - eu.pos.x;
        const dz = a.pos.z - eu.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > dm || Math.abs(a.pos.y - eu.pos.y) > 1.2) return;
        if ((dx * fx + dz * fz) / (d || 1) < 0.55) return;
        dm = d;
        alvo = id;
        // De costas: o alvo olha pro mesmo lado que eu
        const fa = [Math.sin(a.rot), Math.cos(a.rot)];
        costas = fa[0] * fx + fa[1] * fz > 0.5;
      });
      const dano = alvo ? (costas ? 180 : forte ? def.forte : def.dano) : 0;
      if (alvo && n && podeDano(n.eu, alvo)) mostrarAcerto(false);
      if (n) n.enviarEvento({ tipo: 'tiro', a: 'karambit', alvo, dano, cab: 0, faca: 1 });
      eu.atirouEm = performance.now();
    }
    function recarregar() {
      const def = ARMAS[st.arma];
      if (!def || def.faca || st.municao[st.arma] >= def.pente || performance.now() / 1000 < st.recarregandoAte) return;
      st.recarregandoAte = performance.now() / 1000 + def.recarga;
      const arma = st.arma;
      somTiro('seco', 0.4);
      setTimeout(() => {
        st.municao[arma] = ARMAS[arma].pente;
        atualizarHud();
      }, def.recarga * 1000);
      atualizarHud();
    }
    function sacar(slot) {
      const lista = SLOTS[slot];
      if (!lista || st.morto) return;
      // Apertar de novo o mesmo número troca entre as armas daquele número
      let id;
      if (ARMAS[st.arma]?.slot === Number(slot)) id = lista[(lista.indexOf(st.arma) + 1) % lista.length];
      else id = st.ultimoPorSlot[slot] || lista[0];
      st.ultimoPorSlot[slot] = id;
      st.arma = id;
      st.recarregandoAte = 0;
      st.proximoTiro = performance.now() / 1000 + 0.35;
      definirMira(false);
      root.LuiggiAudio?.playSFX?.('blip');
      ctx.avisar(`${ARMAS[id].icone} ${ARMAS[id].nome}${lista.length > 1 ? ` (aperte ${slot} de novo: ${lista.filter((x) => x !== id).map((x) => ARMAS[x].nome).join(' / ')})` : ''} · clique pra mirar com o mouse, botão esquerdo atira${ARMAS[id].mira ? ', direito usa a luneta' : ARMAS[id].faca ? ', direito golpe forte' : ''}, R recarrega, Q guarda.`);
      ctx.mudouEstado(true);
      atualizarHud();
    }
    function guardar() {
      if (!st.arma) return;
      st.arma = null;
      definirMira(false);
      if (document.pointerLockElement === view) document.exitPointerLock?.();
      ctx.mudouEstado(true);
      atualizarHud();
    }
    function definirMira(v) {
      st.mira = !!v && st.arma === 'awp';
      stage.camera.fov = st.mira ? 18 : 68;
      stage.camera.updateProjectionMatrix();
      lunetaEl.classList.toggle('hidden', !st.mira);
    }

    // ---------- Vida, dano, morte ----------
    let piscar = 0;
    function mostrarAcerto(cabeca) {
      acertoEl.classList.remove('hidden');
      acertoEl.classList.toggle('cabeca', cabeca);
      clearTimeout(mostrarAcerto.t);
      mostrarAcerto.t = setTimeout(() => acertoEl.classList.add('hidden'), 160);
      somTiro('seco', 0.35);
    }
    let avisoT = 0;
    function avisoRapido(txt) {
      if (performance.now() - avisoT < 2500) return;
      avisoT = performance.now();
      ctx.avisar(txt);
    }
    function levarDano(dano, de, arma, cabeca) {
      if (st.morto || !(dano > 0)) return;
      st.vida = Math.max(0, st.vida - dano);
      eu.vida = st.vida;
      piscar = 0.35;
      ctx.tremer?.(0.02);
      atualizarHud();
      if (st.vida <= 0) morrer(de, arma, cabeca);
      else ctx.mudouEstado(true);
    }
    function morrer(de, arma, cabeca) {
      st.morto = true;
      eu.morto = true;
      st.vel.set(0, 0, 0);
      definirMira(false);
      if (document.pointerLockElement === view) document.exitPointerLock?.();
      const n = net();
      if (n) n.enviarEvento({ tipo: 'morte', por: de, a: arma, cab: cabeca ? 1 : 0 });
      registrarMorte(n?.eu || 'eu', de, arma, cabeca);
      if (n) dueloMorte(n.eu);
      const emDuelo = duelo && duelo.ativo && timeDe(n?.eu);
      st.renasceEm = emDuelo ? Infinity : performance.now() + 3500;
      mortoEl.textContent = emDuelo ? '💀 Você caiu. Espera a próxima rodada…' : '💀 Você caiu. Renascendo no spawn…';
      mortoEl.classList.remove('hidden');
      ctx.mudouEstado(true);
      atualizarHud();
    }
    function renascer(pos) {
      st.morto = false;
      eu.morto = false;
      st.vida = VIDA;
      eu.vida = VIDA;
      st.vel.set(0, 0, 0);
      st.vy = 0;
      st.noChao = true;
      Object.keys(st.municao).forEach((k) => (st.municao[k] = ARMAS[k].pente || 0));
      mortoEl.classList.add('hidden');
      const p = pos || ctx.spawn();
      ctx.teleportar(p.x, p.z, p.yaw);
      ctx.mudouEstado(true);
      atualizarHud();
    }
    function voltarProSpawn() {
      if (duelo && duelo.ativo && timeDe(net()?.eu)) {
        ctx.avisar('No meio do duelo não dá pra voltar pro spawn.');
        return;
      }
      if (st.morto) return renascer();
      ctx.teleportar(...(() => {
        const p = ctx.spawn();
        return [p.x, p.z, p.yaw];
      })());
      st.vel.set(0, 0, 0);
      ctx.avisar('🏁 De volta ao spawn (na calçada, em frente à casa).');
    }

    // ---------- Feed de abates ----------
    function nomeDe(id) {
      const n = net();
      if (!n) return 'Você';
      if (id === n.eu) return 'Você';
      return n.nomeDe(id) || 'Alguém';
    }
    function registrarMorte(quem, por, arma, cabeca) {
      const li = document.createElement('div');
      li.className = 'cb-feed-item';
      li.innerHTML = `<b>${esc(nomeDe(por))}</b> <span>${ARMAS[arma]?.icone || '💥'} ${esc(ARMAS[arma]?.nome || '')}${cabeca ? ' 🎯' : ''}</span> <b>${esc(nomeDe(quem))}</b>`;
      feedEl.prepend(li);
      setTimeout(() => li.remove(), 6000);
      while (feedEl.children.length > 5) feedEl.lastChild.remove();
    }

    // ---------- HUD ----------
    function atualizarHud() {
      const def = ARMAS[st.arma];
      const pe = ctx.modoCam() === 'pe';
      statusEl.classList.toggle('hidden', !pe);
      miraEl.classList.toggle('hidden', !pe || !def || st.morto || st.mira || def.faca);
      vidaEl.textContent = `❤ ${st.vida}`;
      vidaEl.classList.toggle('baixa', st.vida <= 30);
      if (def) {
        const rec = performance.now() / 1000 < st.recarregandoAte;
        armaEl.textContent = def.faca ? `${def.icone} ${def.nome}` : `${def.icone} ${def.nome} · ${rec ? 'recarregando…' : `${st.municao[st.arma]}/${def.pente}`}`;
      } else armaEl.textContent = '✋ 1 rifle · 2 pistola · 3 faca';
    }

    // ---------- Entrada ----------
    function teclaDown(e) {
      if (ctx.modoCam() !== 'pe') return false;
      if (e.code === 'Space') {
        if (!e.repeat) st.puloPedido = performance.now() / 1000;
        return true;
      }
      if (e.repeat) return false;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        sacar(e.key);
        return true;
      }
      if (e.code === 'KeyQ') {
        guardar();
        return true;
      }
      if (e.code === 'KeyR') {
        recarregar();
        return true;
      }
      return false;
    }
    function teclaUp() {
      return false;
    }
    /** Botão do mouse na tela (true = usou o clique). */
    function pointerDown(e) {
      if (ctx.modoCam() !== 'pe' || st.morto) return false;
      // Primeira pessoa sem arma: o clique só trava o mouse pra olhar em volta
      if (!st.arma) {
        if (st.primeira && e.pointerType !== 'touch' && document.pointerLockElement !== view) {
          view.requestPointerLock?.();
          return true;
        }
        return false;
      }
      if (e.pointerType === 'touch') {
        if (e.button === 0) {
          st.atirando = true;
          atirar();
        }
        return false;
      }
      if (document.pointerLockElement !== view) {
        view.requestPointerLock?.();
        return true;
      }
      if (e.button === 2) {
        if (st.arma === 'awp') definirMira(!st.mira);
        else if (ARMAS[st.arma]?.faca) {
          const agora = performance.now() / 1000;
          if (agora >= st.proximoTiro) {
            st.proximoTiro = agora + 0.9;
            golpe(ARMAS.karambit, true);
          }
        }
        return true;
      }
      st.atirando = true;
      atirar();
      return true;
    }
    function pointerUp() {
      st.atirando = false;
    }
    function pointerMove(e) {
      if (document.pointerLockElement !== view) return false;
      const s = st.mira ? 0.0007 : 0.0024;
      orb.yaw -= e.movementX * s;
      orb.pitch = Math.max(st.primeira || st.mira ? -1.3 : -0.6, Math.min(st.primeira || st.mira ? 1.35 : 1.25, orb.pitch + e.movementY * s));
      return true;
    }
    /** Rodinha: armado vira o pulo (como o "bind" de pulo na rodinha dos jogos de tiro). */
    function wheel(e) {
      if (ctx.modoCam() !== 'pe' || !st.arma) return false;
      st.puloPedido = performance.now() / 1000;
      e.preventDefault();
      return true;
    }
    const onLock = () => {
      st.travado = document.pointerLockElement === view;
      if (!st.travado) st.soltouEm = performance.now();
      view.classList.toggle('cb-travado', st.travado);
    };
    document.addEventListener('pointerlockchange', onLock);
    view.addEventListener('contextmenu', (e) => st.arma && e.preventDefault());

    // ---------- Rede ----------
    function estadoRede() {
      return {
        w: st.arma || undefined,
        hp: st.vida,
        mt: st.morto ? 1 : 0,
        y: r2(eu.alvo.y || 0),
        mi: r2(Math.max(-0.9, Math.min(0.9, -(orb.pitch - 0.18) * 0.9))),
        u: Placar.uid
      };
    }
    function aplicarRemoto(a, d) {
      a.arma = ARMAS[d.w] ? d.w : null;
      a.vida = Number.isFinite(d.hp) ? d.hp : VIDA;
      a.morto = !!d.mt;
      a.alturaY = Math.max(0, Math.min(3, Number(d.y) || 0));
      a.alvo.y = a.alturaY;
      a.mirY = Math.max(-0.9, Math.min(0.9, Number(d.mi) || 0));
      if (typeof d.u === 'string' && /^[0-9a-f]{16}$/.test(d.u) && a.uid !== d.u) {
        a.uid = d.u;
        // Conheci essa pessoa agora: troca o histórico de duelos entre a gente
        const lista = Placar.entre(d.u);
        if (lista.length) net()?.enviarEvento({ tipo: 'h2h', duelos: lista }, a.id);
        atualizarPainel();
      }
    }
    /** Eventos de combate e duelo. Devolve true se era um deles. */
    function receberEvento(d, de) {
      const n = net();
      if (!d || !n) return false;
      if (d.tipo === 'tiro') {
        const a = avatares.get(de);
        if (!a) return true;
        a.golpe = d.faca ? 1 : 0;
        if (!d.faca && Array.isArray(d.o) && Array.isArray(d.f)) {
          const o = new THREE.Vector3(...d.o.map(Number));
          const f = new THREE.Vector3(...d.f.map(Number));
          if ([o.x, o.y, o.z, f.x, f.y, f.z].every(Number.isFinite)) efeitoTiro(o, f);
          const dist = a.pos.distanceTo(eu.pos);
          somTiro(ARMAS[d.a]?.som || 'rifle', Math.max(0, 1 - dist / 140) * (d.a === 'usp' ? 0.4 : 1));
        } else somTiro('faca', Math.max(0, 0.7 - a.pos.distanceTo(eu.pos) / 20));
        if (d.alvo === n.eu && podeDano(de, n.eu)) levarDano(Math.max(0, Math.min(200, Number(d.dano) || 0)), de, d.a, !!d.cab);
        return true;
      }
      if (d.tipo === 'morte') {
        const a = avatares.get(de);
        if (a) a.morto = true;
        registrarMorte(de, d.por, d.a, !!d.cab);
        if (d.por === n.eu) ctx.avisar(`🎯 Você derrubou ${nomeDe(de)}${d.cab ? ' (na cabeça!)' : ''}.`);
        dueloMorte(de);
        return true;
      }
      if (d.tipo === 'h2h') {
        const novos = Placar.juntar(d.duelos);
        if (novos) atualizarPainel();
        return true;
      }
      if (d.tipo && d.tipo.startsWith('du-')) {
        dueloEvento(d, de);
        return true;
      }
      return false;
    }

    // ------------------------------------------------------------------
    // DUELOS
    // ------------------------------------------------------------------
    let convitePendente = null; // convite recebido
    let meuConvite = null; // convite que eu mandei: { id, modo, A, B, aceitos:Set, ate }
    const ALVO_RODADAS = 3;
    function novoId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
    function convidar(modo, A, B) {
      const n = net();
      if (!n) return ctx.avisar('Entre numa sala online (🌐) pra chamar a galera pro duelo.');
      if (duelo || meuConvite) return ctx.avisar('Já tem um duelo rolando ou um convite seu esperando resposta.');
      const todos = [...A, ...B];
      if (new Set(todos).size !== todos.length || todos.some((id) => !n.pessoas.some((p) => p.id === id))) return ctx.avisar('Escolha pessoas diferentes que estão na sala.');
      if (modo === '1x1' && (A.length !== 1 || B.length !== 1)) return;
      if (modo === '2x2' && (A.length !== 2 || B.length !== 2)) return ctx.avisar('No 2x2 escolha seu parceiro e os dois adversários.');
      const id = novoId();
      meuConvite = { id, modo, A, B, aceitos: new Set([n.eu]), ate: performance.now() + 30000 };
      todos.filter((x) => x !== n.eu).forEach((x) => n.enviarEvento({ tipo: 'du-conv', id, modo, A, B }, x));
      ctx.avisar(`⚔️ Convite de duelo ${modo} enviado. Esperando todo mundo aceitar (30 s)…`);
      atualizarPainel();
    }
    function responderConvite(ok) {
      const c = convitePendente;
      convitePendente = null;
      conviteEl.classList.add('hidden');
      if (!c || !net()) return;
      net().enviarEvento({ tipo: 'du-resp', id: c.id, ok: ok ? 1 : 0 }, c.dono);
      if (!ok) ctx.avisar('Convite recusado.');
    }
    function dueloEvento(d, de) {
      const n = net();
      if (d.tipo === 'du-conv') {
        if (duelo) return n.enviarEvento({ tipo: 'du-resp', id: d.id, ok: 0, ocupado: 1 }, de);
        const A = (d.A || []).filter((x) => typeof x === 'string');
        const B = (d.B || []).filter((x) => typeof x === 'string');
        convitePendente = { id: d.id, modo: d.modo === '2x2' ? '2x2' : '1x1', A, B, dono: de, ate: performance.now() + 30000 };
        const meuTime = A.includes(n.eu) ? A : B;
        const outro = meuTime === A ? B : A;
        const nomes = (l) => l.map((x) => esc(nomeDe(x))).join(' + ');
        conviteEl.innerHTML = `<strong>⚔️ ${esc(nomeDe(de))} te chamou pra um duelo ${convitePendente.modo}</strong>
          <small>${nomes(meuTime)} <b>vs</b> ${nomes(outro)} · primeiro a ganhar ${ALVO_RODADAS} rodadas</small>
          <div><button class="mg-btn primary" data-du="sim">Aceitar</button><button class="mg-btn" data-du="nao">Recusar</button></div>`;
        conviteEl.classList.remove('hidden');
        conviteEl.querySelector('[data-du="sim"]').onclick = () => responderConvite(true);
        conviteEl.querySelector('[data-du="nao"]').onclick = () => responderConvite(false);
        root.LuiggiAudio?.playSFX?.('blip');
        return;
      }
      if (d.tipo === 'du-resp') {
        if (!meuConvite || d.id !== meuConvite.id) return;
        if (!d.ok) {
          ctx.avisar(`⚔️ ${nomeDe(de)} ${d.ocupado ? 'já está num duelo' : 'recusou o duelo'}.`);
          meuConvite = null;
          atualizarPainel();
          return;
        }
        meuConvite.aceitos.add(de);
        const todos = [...meuConvite.A, ...meuConvite.B];
        if (todos.every((x) => meuConvite.aceitos.has(x))) {
          const c = meuConvite;
          meuConvite = null;
          // Todo mundo aceitou: começa (o dono do duelo é quem conta as rodadas)
          const ini = { tipo: 'du-ini', id: c.id, modo: c.modo, A: c.A, B: c.B, dono: n.eu, arena: Math.floor(Math.random() * 6) };
          n.enviarEvento(ini);
          dueloEvento(ini, n.eu);
        }
        return;
      }
      if (d.tipo === 'du-ini') {
        if (duelo) desmontarArena();
        duelo = { id: d.id, modo: d.modo === '2x2' ? '2x2' : '1x1', A: d.A || [], B: d.B || [], dono: d.dono || de, ativo: true, placar: [0, 0], rodada: 1, mortos: new Set(), uids: {} };
        montarArena(duelo.modo, d.arena || 0);
        const t = timeDe(n.eu);
        if (t) {
          // Participante: vai pra arena
          if (eu.modo !== 'pe') ctx.descer?.();
          const i = (t === 'A' ? duelo.A : duelo.B).indexOf(n.eu);
          renascer(spawnNaArena(t, i));
          if (!st.arma) sacar(duelo.modo === '1x1' ? '2' : '1');
          ctx.avisar(`⚔️ Duelo ${duelo.modo} começou! Primeiro a ganhar ${ALVO_RODADAS} rodadas.`);
        } else ctx.avisar(`⚔️ ${[...duelo.A].map(nomeDe).join(' + ')} vs ${[...duelo.B].map(nomeDe).join(' + ')}: duelo ${duelo.modo} na arena (fica no minimapa).`);
        atualizarDueloHud();
        atualizarPainel();
        ctx.mudouEstado(true);
        return;
      }
      if (!duelo || d.id !== duelo.id) return;
      if (d.tipo === 'du-rnd') {
        duelo.placar = [Number(d.p?.[0]) || 0, Number(d.p?.[1]) || 0];
        duelo.rodada = Number(d.r) || duelo.rodada + 1;
        duelo.mortos = new Set();
        const t = timeDe(n.eu);
        ctx.avisar(`⚔️ Rodada pro time ${d.v === 'A' ? 'vermelho' : 'azul'}! ${duelo.placar[0]} × ${duelo.placar[1]}`);
        if (t) {
          const i = (t === 'A' ? duelo.A : duelo.B).indexOf(n.eu);
          setTimeout(() => duelo && renascer(spawnNaArena(t, i)), 1800);
        }
        atualizarDueloHud();
        return;
      }
      if (d.tipo === 'du-fim') {
        const fim = d;
        const meu = timeDe(n.eu);
        if (!fim.cancelado && meu && fim.reg) {
          if (Placar.registrar(fim.reg)) atualizarPainel();
        }
        if (fim.cancelado) ctx.avisar('⚔️ Duelo cancelado (alguém saiu da sala).');
        else ctx.avisar(meu ? (fim.v === meu ? `🏆 Você ganhou o duelo! ${fim.p[0]} × ${fim.p[1]}` : `Você perdeu o duelo. ${fim.p[0]} × ${fim.p[1]}`) : `⚔️ Fim do duelo: time ${fim.v === 'A' ? 'vermelho' : 'azul'} ganhou ${fim.p[0]} × ${fim.p[1]}.`);
        const eraParticipante = !!meu;
        duelo = null;
        desmontarArena();
        if (eraParticipante) setTimeout(() => renascer(), 1500);
        atualizarDueloHud();
        atualizarPainel();
        ctx.mudouEstado(true);
      }
    }
    /** Alguém morreu: o dono do duelo vê se o time inteiro caiu. */
    function dueloMorte(id) {
      const n = net();
      if (!duelo || !duelo.ativo || !n || duelo.dono !== n.eu) return;
      if (!timeDe(id)) return;
      duelo.mortos.add(id);
      ['A', 'B'].forEach((t) => {
        const time = duelo[t];
        if (time.length && time.every((x) => duelo.mortos.has(x)) && !duelo.fechandoRodada) {
          duelo.fechandoRodada = true;
          const vence = t === 'A' ? 'B' : 'A';
          const placar = [...duelo.placar];
          placar[vence === 'A' ? 0 : 1]++;
          setTimeout(() => {
            duelo && (duelo.fechandoRodada = false);
            if (!duelo) return;
            if (Math.max(...placar) >= ALVO_RODADAS) {
              const pessoa = (x) => ({ u: avatares.get(x)?.uid || (x === n.eu ? Placar.uid : x.slice(0, 16).padEnd(16, '0')), n: nomeDe(x) === 'Você' ? n.nomeDe(n.eu) : nomeDe(x) });
              const reg = { id: duelo.id, t: Date.now(), modo: duelo.modo, A: duelo.A.map(pessoa), B: duelo.B.map(pessoa), v: vence, p: placar };
              const fim = { tipo: 'du-fim', id: duelo.id, v: vence, p: placar, reg };
              n.enviarEvento(fim);
              dueloEvento(fim, n.eu);
            } else {
              const rnd = { tipo: 'du-rnd', id: duelo.id, p: placar, v: vence, r: duelo.rodada + 1 };
              n.enviarEvento(rnd);
              dueloEvento(rnd, n.eu);
            }
          }, 900);
        }
      });
    }
    function pessoaSaiu(id) {
      const n = net();
      if (!duelo || !n) return;
      if (timeDe(id) || duelo.dono === id) {
        const fim = { tipo: 'du-fim', id: duelo.id, cancelado: 1 };
        if (duelo.dono === n.eu) n.enviarEvento(fim);
        dueloEvento(fim, n.eu);
      }
    }
    function atualizarDueloHud() {
      if (!duelo) {
        dueloEl.classList.add('hidden');
        return;
      }
      const nomes = (l) => l.map((x) => esc(nomeDe(x))).join(' + ');
      dueloEl.innerHTML = `<span class="cb-time a">${nomes(duelo.A)}</span><strong>${duelo.placar[0]} × ${duelo.placar[1]}</strong><span class="cb-time b">${nomes(duelo.B)}</span><small>Duelo ${duelo.modo} · rodada ${duelo.rodada} · primeiro a ${ALVO_RODADAS}</small>`;
      dueloEl.classList.remove('hidden');
    }

    // ------------------------------------------------------------------
    // PAINEL ⚔️ (friendly fire, desafios, placar, código de recuperação)
    // ------------------------------------------------------------------
    const painel = document.createElement('div');
    painel.className = 'rs-online cb-painel hidden';
    shell.appendChild(painel);
    ['pointerdown', 'wheel', 'keydown'].forEach((t) => painel.addEventListener(t, (e) => e.stopPropagation()));
    function atualizarPainel() {
      if (painel.classList.contains('hidden')) return;
      const n = net();
      const pessoas = n ? n.pessoas.filter((p) => !p.eu) : [];
      const res = Placar.resumo();
      const opc = (sel) => `<option value="">—</option>` + pessoas.map((p) => `<option value="${esc(p.id)}" ${sel === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');
      const linhasPlacar = Object.entries(res)
        .sort((a, b) => b[1].t - a[1].t)
        .map(([u, r]) => `<li><span>${esc(r.nome)}</span><b class="${r.eu > r.ele ? 'ganha' : r.eu < r.ele ? 'perde' : ''}">${r.eu} × ${r.ele}</b>${r.eu2 + r.ele2 ? `<small>2x2: ${r.eu2} × ${r.ele2}</small>` : ''}</li>`)
        .join('');
      painel.innerHTML = `
        <div class="rs-on-head"><strong>⚔️ Duelos e tiro</strong><button class="mini-btn" data-cb="fechar">✕</button></div>
        ${n ? `<label class="cb-ff"><input type="checkbox" data-cb="ff" ${st.ff ? 'checked' : ''} ${n.souHost ? '' : 'disabled'}> Friendly fire ${n.souHost ? '<small>(só você, o dono da sala, muda isso)</small>' : `<small>(quem muda é o dono da sala: ${esc(n.pessoas.find((p) => p.host)?.nome || '—')})</small>`}</label>` : '<small class="rs-on-dica">Entre numa sala 🌐 Online pra duelar com a galera. Sozinho dá pra treinar o pulo e as armas.</small>'}
        ${n
          ? `<div class="cb-sec"><b>Desafiar 1x1</b>
              <ul class="cb-lista">${pessoas.length ? pessoas.map((p) => `<li><span>${esc(p.nome)}</span><button class="mini-btn" data-cb="1x1" data-id="${esc(p.id)}">⚔️ 1x1</button></li>`).join('') : '<li><small>Ninguém mais na sala ainda.</small></li>'}</ul></div>
             <div class="cb-sec"><b>Chamar 2x2</b>
              <label>Seu parceiro <select data-cb="par">${opc()}</select></label>
              <label>Adversário <select data-cb="op1">${opc()}</select></label>
              <label>Adversário <select data-cb="op2">${opc()}</select></label>
              <button class="mg-btn" data-cb="2x2">⚔️ Chamar 2x2</button></div>`
          : ''}
        ${duelo ? `<div class="cb-sec"><b>Duelo rolando:</b> ${duelo.placar[0]} × ${duelo.placar[1]}</div>` : meuConvite ? '<div class="cb-sec"><small>Esperando aceitarem o seu convite…</small></div>' : ''}
        <div class="cb-sec"><b>Placar 1x1 (quem ganhou mais de quem)</b>
          <ul class="cb-placar">${linhasPlacar || '<li><small>Nenhum duelo ainda.</small></li>'}</ul>
          <small class="rs-on-dica">Sem conta: o placar fica guardado neste aparelho e, quando vocês se encontram numa sala, os jogos de um com o outro são juntados. Pra levar pra outro aparelho, use o código.</small>
          <div class="cb-cod"><button class="mini-btn" data-cb="exp">📋 Copiar meu código</button><button class="mini-btn" data-cb="imp">📥 Usar um código</button></div></div>`;
      painel.querySelector('[data-cb="fechar"]').onclick = () => painel.classList.add('hidden');
      const ff = painel.querySelector('[data-cb="ff"]');
      if (ff) ff.onchange = () => ctx.mudarFF(ff.checked);
      painel.querySelectorAll('[data-cb="1x1"]').forEach((b) => (b.onclick = () => convidar('1x1', [n.eu], [b.dataset.id])));
      const b2 = painel.querySelector('[data-cb="2x2"]');
      if (b2)
        b2.onclick = () => {
          const v = (k) => painel.querySelector(`[data-cb="${k}"]`).value;
          if (!v('par') || !v('op1') || !v('op2')) return ctx.avisar('Escolha o parceiro e os dois adversários.');
          convidar('2x2', [n.eu, v('par')], [v('op1'), v('op2')]);
        };
      painel.querySelector('[data-cb="exp"]').onclick = async () => {
        const cod = Placar.exportar();
        try {
          await navigator.clipboard.writeText(cod);
          ctx.avisar('📋 Código copiado. Cole em "Usar um código" no outro aparelho (é a sua identidade dos duelos, guarde com você).');
        } catch (_) {
          prompt('Seu código (copie):', cod);
        }
      };
      painel.querySelector('[data-cb="imp"]').onclick = () => {
        const cod = prompt('Cole o código do outro aparelho:');
        if (!cod) return;
        try {
          const nDuelos = Placar.importar(cod);
          eu.uid = Placar.uid;
          ctx.mudouEstado(true);
          ctx.avisar(`📥 Identidade importada (${nDuelos} duelos no histórico).`);
          atualizarPainel();
        } catch (e) {
          ctx.avisar('Esse código não é válido.');
        }
      };
    }
    function abrirPainel() {
      painel.classList.toggle('hidden');
      atualizarPainel();
    }

    // ------------------------------------------------------------------
    // Laço
    // ------------------------------------------------------------------
    let hudT = 0;
    function update(dt) {
      const agora = performance.now();
      // Tiro automático (AK/Negev) segurando o botão
      if (st.atirando && ARMAS[st.arma]?.auto) atirar();
      st.recuo = Math.max(0, st.recuo - dt * 0.25);
      st.ataque = Math.max(0, st.ataque - dt * 4);
      avatares.forEach((a) => {
        if (a.golpe) a.golpe = Math.max(0, a.golpe - dt * 4);
        armaDoAvatar(a);
      });
      if (st.morto && agora >= st.renasceEm) renascer();
      if (piscar > 0) {
        piscar -= dt;
        danoEl.style.opacity = Math.max(0, piscar * 2.2).toFixed(2);
      } else danoEl.style.opacity = '0';
      if (convitePendente && agora > convitePendente.ate) {
        convitePendente = null;
        conviteEl.classList.add('hidden');
      }
      if (meuConvite && agora > meuConvite.ate) {
        meuConvite = null;
        ctx.avisar('⚔️ O convite de duelo expirou (nem todo mundo aceitou).');
        atualizarPainel();
      }
      atualizarEfeitos(dt);
      if ((hudT -= dt) <= 0) {
        hudT = 0.15;
        atualizarHud();
        const vh = Math.hypot(st.vel.x, st.vel.z);
        veloEl.textContent = ctx.modoCam() === 'pe' && (vh > 5.2 || !st.noChao) ? `💨 ${Math.round(vh * 3.6)} km/h` : '';
      }
    }

    /** A câmera de quem está armado fica sobre o ombro direito (e entra na luneta). */
    function ajusteCamera() {
      if (ctx.modoCam() !== 'pe' || st.morto) return null;
      if (st.mira || st.primeira) return { primeiraPessoa: true };
      if (st.arma) return { ombro: 0.55, dist: 2.3, altura: 0.3 };
      return null;
    }

    return {
      update,
      mover,
      teclaDown,
      teclaUp,
      pointerDown,
      pointerUp,
      pointerMove,
      wheel,
      estadoRede,
      aplicarRemoto,
      receberEvento,
      extrasDe,
      ajusteCamera,
      voltarProSpawn,
      abrirPainel,
      atualizarPainel,
      pessoaSaiu,
      limitarArena,
      definirFF(v) {
        st.ff = !!v;
        atualizarPainel();
      },
      get ff() {
        return st.ff;
      },
      get arma() {
        return st.arma;
      },
      get morto() {
        return st.morto;
      },
      get travado() {
        return document.pointerLockElement === view;
      },
      acabouDeSoltar: () => performance.now() - st.soltouEm < 400,
      get emDuelo() {
        return !!(duelo && duelo.ativo && timeDe(net()?.eu));
      },
      get arena() {
        return arena;
      },
      sacar,
      guardar,
      atirar,
      /** Alterna a câmera a pé entre primeira e terceira pessoa. */
      alternarCamera() {
        st.primeira = !st.primeira;
        if (!st.primeira && document.pointerLockElement === view && !st.arma) document.exitPointerLock?.();
        ctx.avisar(st.primeira ? '👁️ Primeira pessoa · clique na tela pra olhar com o mouse (Esc solta) · V volta pra terceira pessoa' : '🎥 Terceira pessoa · arraste pra girar a câmera · V volta pra primeira pessoa');
        return st.primeira;
      },
      get primeiraPessoa() {
        return st.primeira;
      },
      convidar,
      responderConvite,
      get vida() {
        return st.vida;
      },
      get ultimoTiro() {
        return st.ultimoTiro;
      },
      get duelo() {
        return duelo;
      },
      dispose() {
        document.removeEventListener('pointerlockchange', onLock);
        if (document.pointerLockElement === view) document.exitPointerLock?.();
        desmontarArena();
        efeitos.forEach((e) => stage.scene.remove(e.obj));
        hud.remove();
        painel.remove();
      }
    };
  }

  root.LuiggiResenhaCombate = { criar, ARMAS, SLOTS, Placar, modeloArma, MOV };
})(window);
