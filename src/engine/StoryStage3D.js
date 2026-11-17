/**
 * src/engine/StoryStage3D.js
 * Palco 3D persistente das cenas de história (substitui o fundo de foto estático + Phaser).
 *
 * - Um cenário 3D por capítulo (Environments3D), com luz, clima e correção de cor próprios.
 * - Personagens como cartas (sprites originais) dentro do mundo 3D, com sombra e entrada animada.
 * - Câmera cinematográfica: plano aberto, panorâmica para quem fala, close em sustos/raiva, dutch angle.
 * - Efeitos de convergência (VHS, vinil, glitch...) aplicados na imagem final.
 * - O gato da Luiza escondido no cenário (Caps. 7 a 15), clicável.
 * Se WebGL não estiver disponível, `ativo` fica false e o jogo usa a camada DOM antiga.
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;
  const E = () => root.Luiggi3DEnv;

  let stage = null;
  let env = null;
  let host = null;
  let capAtual = null;
  const cartas = new Map(); // id -> { card, slot }
  const slots = { L: null, R: null };
  let ativo = false;
  let pausado = false;
  let gato = null;
  let gatoCallback = null;
  let picker = null;
  let modoMenu = false;

  const camAlvo = { pos: null, look: null, roll: 0, fov: 42 };
  const camAtual = { look: null, roll: 0 };
  let tomada = 'cam-wide';
  let falante = null;

  function init(container) {
    host = container;
    if (!L()?.hasThree()) return false;
    stage = L().createStage(host, { radius: '0', fov: 42, near: 0.1, far: 300 });
    if (!stage) return false;
    const THREE = root.THREE;
    camAlvo.pos = new THREE.Vector3(0, 1.8, 6);
    camAlvo.look = new THREE.Vector3(0, 1.5, 0);
    camAtual.look = camAlvo.look.clone();
    picker = L().createPicker(stage);
    stage.domElement.addEventListener('pointerdown', onClick);
    stage.domElement.addEventListener('pointermove', onHover);
    stage.start(update);
    ativo = true;
    // Fundo ambiente enquanto nenhum capítulo foi aberto (menu)
    montarMenu();
    return true;
  }

  /** Menu: Subaru no mirante com Luis e Fabricio ao lado, câmera orbitando. */
  function montarMenu() {
    montarAmbiente('safepoint', { farois: true, rotSubaru: Math.PI * 0.82 });
    modoMenu = true;
    // Luz de destaque no Subaru
    const spot = new root.THREE.SpotLight('#cfe0ff', 40, 18, 0.5, 0.6, 1.2);
    spot.position.set(3, 6, 2);
    spot.target.position.set(0, 0.5, -3.2);
    env.group.add(spot, spot.target);
    const map = root.LuiggiData?.cache?.personagemMap;
    [['luis', [1.4, 0, -0.9]], ['fabricio', [2.5, 0, -0.2]]].forEach(([id, pos]) => {
      const ch = map?.get(id);
      if (!ch) return;
      const card = L().createCharacterCard(ch, { altura: 2.25, tint: '#dfe6ff', expr: 'feliz' });
      card.group.position.set(...pos);
      stage.scene.add(card.group);
      cartas.set(id, { card, slot: null });
    });
  }

  function montarAmbiente(nome, opts) {
    limparCenario();
    env = E().build(nome, opts);
    stage.scene.add(env.group);
    E().aplicar(stage, env);
    enquadrarBase(true);
  }

  function limparCenario() {
    cartas.forEach(({ card }) => {
      stage.scene.remove(card.group);
      card.dispose();
    });
    cartas.clear();
    slots.L = null;
    slots.R = null;
    gato = null;
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
    camAlvo.roll = 0;
    if (instantaneo) {
      stage.camera.position.copy(camAlvo.pos);
      camAtual.look.copy(camAlvo.look);
      camAtual.roll = 0;
    }
  }

  // ------------------------------------------------------------------
  // CAPÍTULOS
  // ------------------------------------------------------------------
  function entrarCapitulo(cap) {
    if (!ativo) return;
    modoMenu = false;
    capAtual = cap;
    limparCenario();
    env = E().paraCapitulo(cap.id);
    stage.scene.add(env.group);
    E().aplicar(stage, env);
    enquadrarBase(true);
    // Começa um pouco mais longe e "entra" na cena
    stage.camera.position.add(new root.THREE.Vector3(0, 0.6, 2.4));
    if (cap.temGatoEscondido) colocarGato(cap.id);
    falante = null;
    tomada = 'cam-wide';
  }

  /** Cenário avulso (minigames que reaproveitam o palco, flashbacks...). */
  function usarCenario(nome, opts) {
    if (!ativo) return;
    modoMenu = false;
    montarAmbiente(nome, opts);
  }

  // ------------------------------------------------------------------
  // GATO DA LUIZA (easter egg)
  // ------------------------------------------------------------------
  function criarGato() {
    return L().createCatMesh();
  }

  function colocarGato(capId) {
    const save = root.LuiggiSave;
    if (!save || save.state.gatosVistos.includes(capId)) return;
    gato = criarGato();
    // Posição discreta: canto do cenário, perto da câmera
    const lado = capId % 2 ? 1 : -1;
    gato.position.set(lado * (3.2 + (capId % 3) * 0.4), env.oculta ? env.oculta + 0.02 : 0, (env.slots.L[2] || 0) + 0.9);
    gato.rotation.y = -lado * 0.6;
    gato.userData.capId = capId;
    env.group.add(gato);
  }

  function onClick(e) {
    if (!gato) return;
    const hit = picker.pick(e, [gato]);
    if (hit) {
      const capId = gato.userData.capId;
      const save = root.LuiggiSave;
      if (!save.state.gatosVistos.includes(capId)) {
        save.state.gatosVistos.push(capId);
        save.salvar();
        root.LuiggiAchievements?.verificarContadores(save.state);
      }
      root.LuiggiAudio?.playSFX('blip');
      const fx = L().createParticles({ count: 30, size: 0.08, shape: 'spark', color: '#facc15', intensity: 3, life: [0.4, 0.9], gravity: 2 });
      fx.points.position.copy(gato.position);
      stage.scene.add(fx.points);
      fx.burst(30, { x: 0, y: 0.4, z: 0 }, 2.2);
      const rm = stage.addUpdate((dt) => fx.update(dt));
      setTimeout(() => {
        rm();
        stage.scene.remove(fx.points);
      }, 1200);
      env.group.remove(gato);
      gato = null;
      stage.domElement.style.cursor = '';
      if (gatoCallback) gatoCallback(capId);
    }
  }

  function onHover(e) {
    if (!gato) return;
    stage.domElement.style.cursor = picker.pick(e, [gato]) ? 'pointer' : '';
  }

  // ------------------------------------------------------------------
  // ELENCO
  // ------------------------------------------------------------------
  function tintParaCena() {
    const THREE = root.THREE;
    const sky = new THREE.Color(env?.luz?.sky || '#ffffff');
    const t = new THREE.Color('#ffffff').lerp(sky, 0.16);
    const mx = Math.max(t.r, t.g, t.b);
    t.multiplyScalar(1 / mx);
    return t;
  }

  function obterCarta(id, slotKey) {
    if (cartas.has(id)) {
      const c = cartas.get(id);
      c.slot = slotKey;
      return c.card;
    }
    const char = root.LuiggiData?.cache?.personagemMap?.get(id);
    if (!char) return null;
    const card = L().createCharacterCard(char, { altura: 2.6, tint: tintParaCena() });
    stage.scene.add(card.group);
    cartas.set(id, { card, slot: slotKey });
    return card;
  }

  /**
   * Atualiza elenco e foco (chamado pelo DialogueSystem a cada fala).
   * left/right: ids no palco; ativoId: quem fala; expr: expressão; shot: classe de câmera opcional.
   */
  function foco(left, right, ativoId, expr = 'neutro', shot = null) {
    if (!ativo || !env) return;
    const THREE = root.THREE;
    slots.L = left;
    slots.R = right;
    const presentes = new Set([left, right].filter(Boolean));
    // Remove quem saiu de cena
    cartas.forEach((v, id) => {
      if (!presentes.has(id)) {
        stage.scene.remove(v.card.group);
        v.card.dispose();
        cartas.delete(id);
      }
    });
    [['L', left], ['R', right]].forEach(([k, id]) => {
      if (!id) return;
      const card = obterCarta(id, k);
      if (!card) return;
      const p = env.slots[k];
      card.group.position.set(p[0], p[1], p[2]);
      const fala = id === ativoId;
      card.setSpeaking(fala);
      card.setDim(!!ativoId && ativoId !== 'narrador' && !fala);
      card.setExpression(fala ? expr : 'neutro');
    });
    falante = ativoId;

    // Câmera
    if (ativoId && ativoId !== 'narrador') {
      const k = ativoId === left ? 'L' : 'R';
      tomada = shot || (expr === 'chocado' ? (k === 'L' ? 'cam-dutch' : 'cam-closeup') : expr === 'bravo' ? 'cam-closeup' : k === 'L' ? 'cam-pan-left' : 'cam-pan-right');
    } else {
      tomada = shot || 'cam-wide';
    }
    calcularTomada();
    if (expr === 'chocado' || expr === 'bravo') stage.shake(0.06, 7);
  }

  function calcularTomada() {
    const base = env.cam;
    const P = new root.THREE.Vector3(...base.pos);
    const T = new root.THREE.Vector3(...base.look);
    const k = falante === slots.L ? 'L' : 'R';
    const S = env.slots[k] || [0, 0, 0];
    const headY = (env.slots[k]?.[1] || 0) + 2.25;
    camAlvo.roll = 0;
    if (tomada === 'cam-pan-left' || tomada === 'cam-pan-right') {
      camAlvo.pos.set(P.x + S[0] * 0.38, P.y - 0.02, P.z - 0.55);
      camAlvo.look.set(T.x + S[0] * 0.55, T.y + 0.08, T.z);
    } else if (tomada === 'cam-closeup') {
      camAlvo.pos.set(U().lerp(P.x, S[0], 0.62), headY - 0.12, U().lerp(P.z, S[2] + 2.0, 0.7));
      camAlvo.look.set(S[0], headY - 0.25, S[2]);
    } else if (tomada === 'cam-dutch') {
      camAlvo.pos.set(P.x + S[0] * 0.45, P.y + 0.05, P.z - 1.1);
      camAlvo.look.set(S[0] * 0.8, headY - 0.45, S[2]);
      camAlvo.roll = 0.07;
    } else {
      camAlvo.pos.copy(P);
      camAlvo.look.copy(T);
    }
  }

  const U = () => L().U;

  // ------------------------------------------------------------------
  // LAÇO
  // ------------------------------------------------------------------
  function update(dt, t) {
    if (!env) return;
    env.update(dt, t);
    cartas.forEach(({ card }) => card.update(dt, stage.camera));
    if (gato) {
      gato.userData.cauda.rotation.z = Math.sin(t * 2) * 0.3;
      const piscar = (t % 4) < 0.12;
      gato.children.forEach((c) => c.name === 'olho' && (c.scale.y = piscar ? 0.15 : 1));
    }
    const cam = stage.camera;
    if (modoMenu) {
      // Órbita lenta; o alvo é deslocado para a esquerda para o carro aparecer à direita do painel do menu
      const a = Math.sin(t * 0.07) * 0.55 + 0.35;
      const centro = new root.THREE.Vector3(0.9, 1.0, -2.0);
      const pos = new root.THREE.Vector3(centro.x + Math.sin(a) * 7.2, 2.0 + Math.sin(t * 0.13) * 0.25, centro.z + Math.cos(a) * 7.2);
      U().dampVec3(cam.position, pos, 1.5, dt);
      const dir = centro.clone().sub(cam.position).normalize();
      const direita = new root.THREE.Vector3().crossVectors(dir, new root.THREE.Vector3(0, 1, 0)).normalize();
      const alvo = centro.clone().addScaledVector(direita, -(window.innerWidth > 900 ? 2.4 : 0));
      U().dampVec3(camAtual.look, alvo, 2, dt);
      cam.lookAt(camAtual.look);
      return;
    }
    // Câmera suave + leve câmera na mão
    U().dampVec3(cam.position, camAlvo.pos, 2.6, dt);
    U().dampVec3(camAtual.look, camAlvo.look, 3.2, dt);
    camAtual.roll = U().damp(camAtual.roll, camAlvo.roll, 3, dt);
    const sway = 0.012;
    cam.lookAt(camAtual.look.x + Math.sin(t * 0.7) * sway, camAtual.look.y + Math.sin(t * 0.9) * sway * 0.6, camAtual.look.z);
    cam.rotateZ(camAtual.roll);
  }

  // ------------------------------------------------------------------
  // EFEITOS
  // ------------------------------------------------------------------
  function efeito(tipo, dur = 2.4) {
    if (!ativo || !stage.post) return;
    const p = stage.pulseGrade;
    if (tipo === 'vhs') {
      p('scanlines', 1, dur, 0);
      p('aberration', 2.5, dur, env?.grade?.aberration || 0);
      p('saturation', 0.5, dur, env?.grade?.saturation || 1.08);
    } else if (tipo === 'vinyl') {
      p('sepia', 0.85, dur, 0);
      p('grain', 0.16, dur, 0.035);
    } else if (tipo === 'glitch') {
      p('aberration', 6, dur, env?.grade?.aberration || 0);
      p('flash', 0.25, 0.5, 0);
      stage.shake(0.2, 5);
    } else if (tipo === 'strikethrough') {
      p('saturation', 0.15, dur, env?.grade?.saturation || 1.08);
      p('contrast', 1.3, dur, env?.grade?.contrast || 1.04);
    } else if (tipo === 'discord') {
      p('saturation', 0.6, dur, env?.grade?.saturation || 1.08);
      p('fadeAmt', 0.25, dur, 0);
    } else if (tipo === 'flash') {
      p('flash', 0.8, 0.6, 0);
    } else if (tipo === 'felps') {
      p('flash', 0.35, 0.4, 0);
      p('aberration', 3, 0.6, env?.grade?.aberration || 0);
      stage.shake(0.25, 6);
    } else {
      p('vignette', 1.4, dur, env?.grade?.vignette ?? 0.55);
      p('saturation', 0.4, dur, env?.grade?.saturation || 1.08);
    }
  }

  function tremor(intensidade = 0.12) {
    if (ativo) stage.shake(intensidade, 6);
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

  function retomarSeguro() {
    if (pausado) {
      pausado = false;
      stage.start();
    }
  }

  root.LuiggiStory3D = {
    init,
    entrarCapitulo,
    usarCenario,
    foco,
    efeito,
    tremor,
    pausar,
    retomar,
    voltarAoMenu() {
      if (!ativo) return;
      capAtual = null;
      if (!modoMenu) montarMenu();
      retomarSeguro();
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
    }
  };
})(window);
