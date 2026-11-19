/**
 * src/engine/StoryStage3D.js
 * Palco 3D persistente das cenas de história.
 *
 * - Cenas: cada evento "cena" do roteiro troca o cenário com uma transição suave (fade) e uma
 *   legenda discreta no canto (lower third), em vez de cortes secos.
 * - Elenco: personagens como cartas (sprites originais) dentro do mundo 3D. Em cenas no Subaru o
 *   elenco é fixo nos assentos (motorista, passageiro, banco de trás) e se move junto com o carro.
 * - Câmera calma: plano base com leve aproximação para quem fala; sem zooms bruscos nem tremores.
 * - O gato da Luiza escondido no cenário (Caps. 7 a 15), clicável.
 * Se WebGL não estiver disponível, `ativo` fica false e o jogo usa a camada DOM antiga.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;
  const E = () => root.Luiggi3DEnv;
  const U = () => root.Luiggi3D.U;

  let stage = null;
  let env = null;
  let host = null;
  let capAtual = null;
  const cartas = new Map(); // id -> { card, slot }
  const slots = { L: null, R: null };
  let elencoFixo = null; // { id: assento }
  let ativo = false;
  let pausado = false;
  let gato = null;
  let gatoCallback = null;
  let picker = null;
  let modoMenu = false;
  let falante = null;
  let fade = 0;
  let fadeAlvo = 0;
  // Subaru interativo nas cenas de história
  let carroCtl = null;
  let clicaveisCarro = [];
  let bloquearClique = false;
  let tipCarro = null;
  let dicaCarroMostrada = false;

  const camAlvo = { pos: null, look: null };
  const camAtual = { look: null };

  function init(container) {
    host = container;
    if (!L()?.hasThree()) return false;
    stage = L().createStage(host, { radius: '0', fov: 42, near: 0.05, far: 300 });
    if (!stage) return false;
    const THREE = root.THREE;
    camAlvo.pos = new THREE.Vector3(0, 1.8, 6);
    camAlvo.look = new THREE.Vector3(0, 1.5, 0);
    camAtual.look = camAlvo.look.clone();
    picker = L().createPicker(stage);
    stage.domElement.addEventListener('pointerdown', onClick);
    stage.domElement.addEventListener('pointermove', onHover);
    // Clique que interagiu com o carro não avança o diálogo
    stage.domElement.addEventListener('click', (e) => {
      if (!bloquearClique) return;
      bloquearClique = false;
      e.stopPropagation();
    });
    stage.start(update);
    ativo = true;
    montarMenu();
    return true;
  }

  /** Menu: Subaru no Safepoint com Luis e Fabricio ao lado, câmera orbitando. */
  function montarMenu() {
    montarAmbiente('safepoint', { farois: true, rotSubaru: Math.PI * 0.82 });
    modoMenu = true;
    if (!env.foto) {
      const spot = new root.THREE.SpotLight('#cfe0ff', 40, 18, 0.5, 0.6, 1.2);
      spot.position.set(3, 6, 2);
      spot.target.position.set(0, 0.5, -3.2);
      env.group.add(spot, spot.target);
    }
    const map = root.LuiggiData?.cache?.personagemMap;
    [['luis', [1.4, 0, -0.9]], ['fabricio', [2.5, 0, -0.2]]].forEach(([id, pos]) => {
      const ch = map?.get(id);
      if (!ch) return;
      const card = L().createCharacterCard(ch, { altura: 2.25, tint: env.foto ? '#ffffff' : '#dfe6ff', expr: 'feliz', emotes: false });
      card.group.position.set(...pos);
      stage.scene.add(card.group);
      cartas.set(id, { card, slot: null });
    });
  }

  function montarAmbiente(nome, opts) {
    limparCenario();
    env = E().build(nome, opts);
    stage.scene.add(env.group);
    if (env.pov && root.LuiggiSubaruPOV?.criarControleCarro) {
      carroCtl = root.LuiggiSubaruPOV.criarControleCarro(env.pov, { stage });
      clicaveisCarro = root.LuiggiSubaruPOV.clicaveisDo(env.pov);
    }
    E().aplicar(stage, env);
    stage.camera.fov = env.fov || 42;
    stage.camera.updateProjectionMatrix();
    enquadrarBase(true);
  }

  function limparCenario() {
    cartas.forEach(({ card }) => {
      card.group.parent?.remove(card.group);
      card.dispose();
    });
    cartas.clear();
    slots.L = null;
    slots.R = null;
    elencoFixo = null;
    gato = null;
    carroCtl = null;
    clicaveisCarro = [];
    if (tipCarro) tipCarro.classList.add('hidden');
    if (env) {
      stage.scene.remove(env.group);
      L().disposeObject(env.group);
      env = null;
    }
  }

  function enquadrarBase(instantaneo) {
    if (!env) return;
    camAlvo.pos.set(...env.cam.pos);
    camAlvo.look.set(...env.cam.look);
    if (instantaneo) {
      stage.camera.position.copy(camAlvo.pos);
      camAtual.look.copy(camAlvo.look);
    }
  }

  // ------------------------------------------------------------------
  // CAPÍTULOS E CENAS
  // ------------------------------------------------------------------
  function entrarCapitulo(cap, o = {}) {
    if (!ativo) return;
    modoMenu = false;
    capAtual = cap;
    falante = null;
    if (o.semCenario) return;
    montarAmbiente(...(E().CAPITULOS[cap.id] || ['safepoint']));
    aproximarEntrada();
    if (cap.temGatoEscondido) colocarGato(cap.id);
  }

  function aproximarEntrada() {
    // Começa um pouco mais longe e "entra" devagar na cena
    const raio = env.camRaio || 2.2;
    stage.camera.position.add(new root.THREE.Vector3(0, raio * 0.2, raio));
  }

  /**
   * Troca de cena com fade. elenco: { idPersonagem: 'L' | 'R' | 'TL' | 'TR' | 'TC' | 'FORA' }.
   * Retorna uma Promise que resolve quando a nova cena já está visível.
   */
  function mudarCena(nome, opts = {}, elenco = null) {
    if (!ativo) return Promise.resolve();
    modoMenu = false;
    const primeira = !env || fade >= 0.99;
    return new Promise((resolve) => {
      const trocar = () => {
        montarAmbiente(nome, opts);
        aproximarEntrada();
        if (elenco) {
          elencoFixo = { ...elenco };
          Object.entries(elencoFixo).forEach(([id, seat]) => posicionar(id, seat));
        }
        if (env.pov) garantirMateusNoBancoDeTras();
        if (capAtual?.temGatoEscondido) colocarGato(capAtual.id);
        fadeAlvo = 0;
        setTimeout(resolve, 380);
      };
      if (primeira && !env) {
        fade = 1;
        trocar();
        return;
      }
      fadeAlvo = 1;
      setTimeout(trocar, 360);
    });
  }

  function escurecer(v = 1) {
    fadeAlvo = v;
  }

  // ------------------------------------------------------------------
  // GATO DA LUIZA (easter egg)
  // ------------------------------------------------------------------
  function colocarGato(capId) {
    const save = root.LuiggiSave;
    if (!save || save.state.gatosVistos.includes(capId) || !env || env.semElenco) return;
    gato = L().createCatMesh();
    if (env.ancora) {
      gato.scale.setScalar(0.55);
      gato.position.set(0.35, 0.95, 1.6);
      gato.rotation.y = Math.PI;
      env.ancora.add(gato);
    } else {
      const lado = capId % 2 ? 1 : -1;
      gato.position.set(lado * (3.2 + (capId % 3) * 0.4), env.oculta ? env.oculta + 0.02 : 0, (env.slots.L[2] || 0) + 0.9);
      gato.rotation.y = -lado * 0.6;
      env.group.add(gato);
    }
    gato.userData.capId = capId;
  }

  function onClick(e) {
    bloquearClique = false;
    if (gato && picker.pick(e, [gato])) {
      e.stopPropagation();
      bloquearClique = true;
      pegarGato();
      return;
    }
    const a = acaoCarro(e);
    if (!a) return;
    e.stopPropagation();
    bloquearClique = true;
    reagirCarro(a);
  }

  function pegarGato() {
    const capId = gato.userData.capId;
    const save = root.LuiggiSave;
    if (!save.state.gatosVistos.includes(capId)) {
      save.state.gatosVistos.push(capId);
      save.salvar();
      root.LuiggiAchievements?.verificarContadores(save.state);
    }
    root.LuiggiAudio?.playSFX('blip');
    const pos = gato.getWorldPosition(new root.THREE.Vector3());
    const fx = L().createParticles({ count: 30, size: 0.08, shape: 'spark', color: '#facc15', intensity: 3, life: [0.4, 0.9], gravity: 2 });
    stage.scene.add(fx.points);
    fx.burst(30, { x: pos.x, y: pos.y + 0.3, z: pos.z }, 2.2);
    const rm = stage.addUpdate((dt) => fx.update(dt));
    setTimeout(() => {
      rm();
      stage.scene.remove(fx.points);
    }, 1200);
    gato.parent?.remove(gato);
    gato = null;
    stage.domElement.style.cursor = '';
    if (gatoCallback) gatoCallback(capId);
  }

  // ---------- Subaru interativo (cenas dentro do carro) ----------
  function cartaMateus() {
    return cartas.get('mateus_buse')?.card || null;
  }

  function acaoCarro(e) {
    if (!carroCtl || !env?.pov) return null;
    const m = cartaMateus();
    const alvos = m ? clicaveisCarro.concat([m.group]) : clicaveisCarro;
    const hit = picker.pick(e, alvos);
    return hit ? root.LuiggiSubaruPOV.acaoDoObjeto(hit.object, m ? { mateus_buse: m } : {}) : null;
  }

  function reagirCarro(acao) {
    const r = carroCtl.interagir(acao);
    if (!r) return;
    const D = root.LuiggiDialogue;
    if (r.interjeicao) D?.mostrarInterjeicao?.(r.interjeicao);
    else if (r.texto) D?.mostrarInterjeicao?.({ texto: r.texto, duracao: 2600 });
    if (acao === 'mateus_buse') cartaMateus()?.setExpression('feliz');
  }

  /** O Mateus Buse sempre vai no banco de trás, atrás do passageiro (assento TR). */
  function garantirMateusNoBancoDeTras() {
    elencoFixo = elencoFixo || {};
    if (elencoFixo.mateus_buse === 'TR') return;
    const ocupante = Object.keys(elencoFixo).find((id) => elencoFixo[id] === 'TR' && id !== 'mateus_buse');
    if (ocupante) {
      const usados = new Set(Object.values(elencoFixo));
      const livre = ['TC', 'TL'].find((s) => !usados.has(s));
      if (livre) {
        elencoFixo[ocupante] = livre;
        posicionar(ocupante, livre);
      }
    }
    elencoFixo.mateus_buse = 'TR';
    posicionar('mateus_buse', 'TR');
    if (!dicaCarroMostrada) {
      dicaCarroMostrada = true;
      setTimeout(() => root.LuiggiDialogue?.mostrarInterjeicao?.({ texto: '🖱️ Dá pra clicar nas coisas do Subaru: volante, porta-luvas, o Mateus lá atrás... e o compartimento entre os bancos da frente.', duracao: 5600 }), 1600);
    }
  }

  function onHover(e) {
    let nome = null;
    if (gato && picker.pick(e, [gato])) nome = '🐈‍⬛ ...';
    else {
      const a = acaoCarro(e);
      if (a) nome = root.LuiggiSubaruPOV.NOMES_ACAO[a] || a;
    }
    stage.domElement.style.cursor = nome ? 'pointer' : '';
    if (!carroCtl) return;
    if (!tipCarro) {
      tipCarro = document.createElement('div');
      tipCarro.className = 'sp3d-tooltip hidden';
      (host.parentElement || host).appendChild(tipCarro);
    }
    if (nome && nome !== '🐈‍⬛ ...') {
      const r = (host.parentElement || host).getBoundingClientRect();
      tipCarro.textContent = nome;
      tipCarro.style.left = `${e.clientX - r.left + 14}px`;
      tipCarro.style.top = `${e.clientY - r.top + 14}px`;
      tipCarro.classList.remove('hidden');
    } else tipCarro.classList.add('hidden');
  }

  // ------------------------------------------------------------------
  // ELENCO
  // ------------------------------------------------------------------
  function tintParaCena() {
    const THREE = root.THREE;
    const sky = new THREE.Color(env?.luz?.sky || '#ffffff');
    const t = new THREE.Color('#ffffff').lerp(sky, 0.14);
    const mx = Math.max(t.r, t.g, t.b);
    t.multiplyScalar(1 / mx);
    return t;
  }

  function obterCarta(id) {
    if (cartas.has(id)) return cartas.get(id).card;
    const char = root.LuiggiData?.cache?.personagemMap?.get(id);
    if (!char) return null;
    const card = L().createCharacterCard(char, { altura: env.alturaCarta || 2.6, tint: tintParaCena(), emotes: false, fadeMs: 550 });
    (env.ancora || stage.scene).add(card.group);
    cartas.set(id, { card, slot: null });
    return card;
  }

  function posicionar(id, seat) {
    const card = obterCarta(id);
    if (!card) return null;
    const p = (env.assentos && env.assentos[seat]) || env.slots[seat] || env.slots.C;
    card.group.position.set(p[0], p[1], p[2]);
    cartas.get(id).slot = seat;
    return card;
  }

  function assentoLivre() {
    const ocupados = new Set(Object.values(elencoFixo || {}));
    return ['R', 'TR', 'TL', 'TC'].find((s) => !ocupados.has(s) && ((env.assentos && env.assentos[s]) || env.slots[s])) || null;
  }

  /**
   * Atualiza elenco e foco (chamado pelo DialogueSystem a cada fala).
   * left/right: ids no palco (modo livre); ativoId: quem fala (null/narrador = ninguém em foco).
   */
  function foco(left, right, ativoId, expr = 'neutro') {
    if (!ativo || !env || modoMenu) return;
    if (env.semElenco) {
      falante = null;
      return;
    }
    if (elencoFixo) {
      if (ativoId && ativoId !== 'narrador' && !elencoFixo[ativoId]) {
        const s = assentoLivre();
        if (s) {
          elencoFixo[ativoId] = s;
          posicionar(ativoId, s);
        }
      }
    } else {
      slots.L = left;
      slots.R = right;
      const presentes = new Set([left, right].filter(Boolean));
      cartas.forEach((v, id) => {
        if (!presentes.has(id)) {
          v.card.group.parent?.remove(v.card.group);
          v.card.dispose();
          cartas.delete(id);
        }
      });
      [['L', left], ['R', right]].forEach(([k, id]) => id && posicionar(id, k));
    }
    cartas.forEach(({ card }, id) => {
      const fala = id === ativoId;
      card.setSpeaking(fala);
      card.setDim(!!ativoId && ativoId !== 'narrador' && !fala);
      card.setExpression(fala ? expr : 'neutro');
    });
    falante = ativoId && cartas.has(ativoId) ? ativoId : null;
    calcularTomada();
  }

  function calcularTomada() {
    const P = new root.THREE.Vector3(...env.cam.pos);
    const T = new root.THREE.Vector3(...env.cam.look);
    camAlvo.pos.copy(P);
    camAlvo.look.copy(T);
    if (!falante) return;
    const card = cartas.get(falante)?.card;
    if (!card) return;
    const alvo = card.group.getWorldPosition(new root.THREE.Vector3());
    alvo.y += (env.alturaCarta || 2.6) * 0.72;
    // Leve inclinação do olhar para quem fala (sem zoom)
    camAlvo.look.lerp(alvo, env.ancora ? 0.35 : 0.22);
    if (!env.ancora) camAlvo.pos.x += (alvo.x - P.x) * 0.12;
  }

  // ------------------------------------------------------------------
  // LAÇO
  // ------------------------------------------------------------------
  function update(dt, t) {
    if (!env) return;
    env.update(dt, t);
    cartas.forEach(({ card }) => card.update(dt, stage.camera));
    if (carroCtl) carroCtl.update(dt, t);
    if (gato) {
      gato.userData.cauda.rotation.z = Math.sin(t * 2) * 0.3;
      const piscar = t % 4 < 0.12;
      gato.children.forEach((c) => c.name === 'olho' && (c.scale.y = piscar ? 0.15 : 1));
    }
    // Fade de transição de cena
    fade = U().damp(fade, fadeAlvo, 9, dt);
    stage.setGrade({ fadeAmt: fade, fadeColor: [0, 0, 0] });
    const cam = stage.camera;
    if (modoMenu) {
      const a = Math.sin(t * 0.07) * 0.45 + 0.3;
      const centro = new root.THREE.Vector3(0.9, 1.0, -2.0);
      const pos = new root.THREE.Vector3(centro.x + Math.sin(a) * 7.2, 1.9 + Math.sin(t * 0.13) * 0.2, centro.z + Math.cos(a) * 7.2);
      U().dampVec3(cam.position, pos, 1.5, dt);
      const dir = centro.clone().sub(cam.position).normalize();
      const direita = new root.THREE.Vector3().crossVectors(dir, new root.THREE.Vector3(0, 1, 0)).normalize();
      const alvo = centro.clone().addScaledVector(direita, -(window.innerWidth > 900 ? 2.4 : 0));
      U().dampVec3(camAtual.look, alvo, 2, dt);
      cam.lookAt(camAtual.look);
      return;
    }
    // Câmera calma, com respiração leve
    U().dampVec3(cam.position, camAlvo.pos, 1.4, dt);
    U().dampVec3(camAtual.look, camAlvo.look, 1.8, dt);
    const sway = env.ancora ? 0.004 : 0.008;
    cam.lookAt(camAtual.look.x + Math.sin(t * 0.5) * sway, camAtual.look.y + Math.sin(t * 0.7) * sway * 0.6, camAtual.look.z);
  }

  // ------------------------------------------------------------------
  // EFEITOS (sutis: a piada fica no texto do Fabricio, não na tela)
  // ------------------------------------------------------------------
  function efeito(tipo, dur = 1.6) {
    if (!ativo || !stage.post) return;
    const p = stage.pulseGrade;
    const g = env?.grade || {};
    if (tipo === 'vhs') {
      p('scanlines', 0.6, dur, 0);
      p('aberration', 1.4, dur, g.aberration || 0);
    } else if (tipo === 'vinyl') {
      p('sepia', 0.55, dur, 0);
    } else if (tipo === 'glitch') {
      p('aberration', 3, dur * 0.6, g.aberration || 0);
    } else if (tipo === 'strikethrough') {
      p('saturation', 0.35, dur, g.saturation || 1.08);
    } else if (tipo === 'discord') {
      p('saturation', 0.7, dur, g.saturation || 1.08);
    } else if (tipo === 'bsod') {
      p('fadeAmt', 0.35, 0.8, 0);
    } else if (tipo === 'felps') {
      p('aberration', 1.6, 0.5, g.aberration || 0);
      stage.shake(0.05, 8);
    } else {
      p('saturation', 0.6, dur, g.saturation || 1.08);
    }
  }

  /** Efeitos visuais das cenas especiais do roteiro (o texto é dito pelo Fabricio). */
  function efeitoEspecial(id) {
    if (!ativo || !env) return;
    const p = stage.pulseGrade;
    if (id === 'gato_testemunha') {
      const card = L().createCharacterCard(root.LuiggiData.cache.personagemMap.get('gato_luiza'), { altura: 1.6, emotes: false, fadeMs: 900 });
      const cam = stage.camera;
      const frente = new root.THREE.Vector3();
      cam.getWorldDirection(frente);
      card.group.position.copy(cam.position).addScaledVector(frente, 2.6).setY(cam.position.y - 1.0);
      stage.scene.add(card.group);
      cartas.set('gato_luiza', { card, slot: null });
    } else if (id === 'cards_sad_baile') {
      p('exposure', 1.5, 3, 1);
      if (env) env.energia = 0.2;
    } else if (id === 'virada_final') {
      p('saturation', 0.4, 4, env.grade?.saturation || 1.08);
    } else if (id === 'loop_eloiza') {
      efeito('vhs', 2.4);
    } else if (id === 'esconder_mae_eloiza') {
      stage.shake(0.04, 6);
    } else if (id === 'momento_honesto') {
      p('vignette', 1.1, 5, env.grade?.vignette ?? 0.55);
    }
  }

  function tremor(intensidade = 0.04) {
    if (ativo) stage.shake(Math.min(intensidade, 0.05), 6);
  }

  function pausar() {
    if (!ativo || pausado) return;
    pausado = true;
    stage.stop();
  }

  function retomar() {
    if (!ativo || !pausado) return;
    pausado = false;
    stage.start();
  }

  root.LuiggiStory3D = {
    init,
    entrarCapitulo,
    mudarCena,
    escurecer,
    usarCenario(nome, opts) {
      if (!ativo) return;
      modoMenu = false;
      montarAmbiente(nome, opts);
      if (env?.pov) garantirMateusNoBancoDeTras();
    },
    foco,
    efeito,
    efeitoEspecial,
    tremor,
    pausar,
    retomar,
    voltarAoMenu() {
      if (!ativo) return;
      capAtual = null;
      fadeAlvo = 0;
      if (!modoMenu) montarMenu();
      if (pausado) retomar();
    },
    onGato(cb) {
      gatoCallback = cb;
    },
    get ativo() {
      return ativo;
    },
    get stage() {
      return stage;
    },
    get cenario() {
      return env;
    },
    get elencoFixo() {
      return elencoFixo;
    }
  };
})(window);
