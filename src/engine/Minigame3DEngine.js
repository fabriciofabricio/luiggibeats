/**
 * src/engine/Minigame3DEngine.js
 * Núcleo gráfico 3D do LuiggiBeats (Three.js r160 global, sem build).
 *
 * - Palco (createStage): renderer, câmera, luzes, laço de animação, resize automático, tremor de câmera.
 * - Pós-processamento próprio: bloom HDR, ACES, correção de cor, vinheta, granulação,
 *   aberração cromática, scanlines (VHS), fade e flash.
 * - Qualidade automática (alta / média / baixa) com rebaixamento se o FPS cair.
 * - Materiais cel-shaded, contornos, texturas procedurais, partículas e modelos (Subaru, Civic, cookie, xícara...).
 * - Cartas de personagem (sprites PNG/SVG dentro do mundo 3D).
 *
 * API antiga preservada: hasThree, textures, createStage, createSubaruMesh, createCookieMesh, createCupMesh.
 */
(function (root) {
  'use strict';

  function hasThree() {
    return typeof root.THREE !== 'undefined';
  }
  const T = () => root.THREE;

  // =====================================================================
  // QUALIDADE
  // =====================================================================
  const PERFIS = {
    alta: { pixelRatio: 2, shadows: true, shadowSize: 2048, post: true, msaa: 4, bloomScale: 0.5 },
    media: { pixelRatio: 1.25, shadows: true, shadowSize: 1024, post: true, msaa: 0, bloomScale: 0.4 },
    baixa: { pixelRatio: 1, shadows: false, shadowSize: 512, post: false, msaa: 0, bloomScale: 0.35 }
  };
  let autoDetectado = null;

  function detectarQualidade() {
    if (autoDetectado) return autoDetectado;
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    const cores = navigator.hardwareConcurrency || 4;
    autoDetectado = mobile || cores <= 2 ? 'baixa' : cores <= 4 ? 'media' : 'alta';
    return autoDetectado;
  }

  function perfilQualidade() {
    const cfg = root.LuiggiSave?.state?.config?.qualidade || 'auto';
    const nome = cfg === 'auto' ? detectarQualidade() : cfg;
    return { nome, auto: cfg === 'auto', ...(PERFIS[nome] || PERFIS.media) };
  }

  function canUseImageTextures() {
    return typeof location === 'undefined' || location.protocol !== 'file:';
  }

  // =====================================================================
  // UTILITÁRIOS
  // =====================================================================
  const U = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    easeOutBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    dampVec3(v, target, lambda, dt) {
      const k = 1 - Math.exp(-lambda * dt);
      v.x += (target.x - v.x) * k;
      v.y += (target.y - v.y) * k;
      v.z += (target.z - v.z) * k;
      return v;
    }
  };

  // =====================================================================
  // PÓS-PROCESSAMENTO
  // =====================================================================
  const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  const BRIGHT_FRAG = `
    uniform sampler2D tDiffuse; uniform float threshold; uniform float knee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = max(c.r, max(c.g, c.b));
      float k = smoothstep(threshold, threshold + knee, l);
      gl_FragColor = vec4(min(c * k, vec3(24.0)), 1.0);
    }`;

  const BLUR_FRAG = `
    uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
    void main(){
      vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
      s += texture2D(tDiffuse, vUv + dir * 1.3846).rgb * 0.3162162;
      s += texture2D(tDiffuse, vUv - dir * 1.3846).rgb * 0.3162162;
      s += texture2D(tDiffuse, vUv + dir * 3.2308).rgb * 0.0702703;
      s += texture2D(tDiffuse, vUv - dir * 3.2308).rgb * 0.0702703;
      gl_FragColor = vec4(s, 1.0);
    }`;

  const COMPOSITE_FRAG = `
    uniform sampler2D tScene; uniform sampler2D tBloomA; uniform sampler2D tBloomB;
    uniform float bloom; uniform float exposure; uniform float vignette; uniform float grain; uniform float time;
    uniform float saturation; uniform float contrast; uniform float aberration; uniform float scanlines;
    uniform float fadeAmt; uniform float flash; uniform float sepia;
    uniform vec3 tint; uniform vec3 lift; uniform vec3 fadeColor; uniform vec2 res;
    varying vec2 vUv;

    vec3 lgRRTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 lgACES(vec3 color){
      const mat3 ACESIn = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 ACESOut = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= exposure / 0.6;
      color = ACESIn * color; color = lgRRTFit(color); color = ACESOut * color;
      return clamp(color, 0.0, 1.0);
    }
    vec3 lgToSRGB(vec3 c){ return mix(c * 12.92, pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, step(0.0031308, c)); }
    float lgHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main(){
      vec2 uv = vUv;
      vec3 col;
      if (aberration > 0.001) {
        vec2 d = (uv - 0.5) * aberration * 0.014;
        col = vec3(texture2D(tScene, uv + d).r, texture2D(tScene, uv).g, texture2D(tScene, uv - d).b);
      } else {
        col = texture2D(tScene, uv).rgb;
      }
      col += (texture2D(tBloomA, uv).rgb * 0.65 + texture2D(tBloomB, uv).rgb * 0.85) * bloom;
      col = lgToSRGB(lgACES(col));
      col = col * tint + lift * (1.0 - col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = mix(col, vec3(l) * vec3(1.07, 0.88, 0.66), sepia);
      col = (col - 0.5) * contrast + 0.5;
      float vg = smoothstep(0.95, 0.25, length((uv - 0.5) * vec2(1.0, 0.82)) * 1.15);
      col *= mix(1.0, vg, vignette);
      if (scanlines > 0.001) {
        col *= 1.0 - scanlines * 0.4 * step(0.5, fract(uv.y * res.y * 0.25));
        col += scanlines * 0.05 * sin(uv.y * 40.0 + time * 9.0);
      }
      col += (lgHash(uv * res + fract(time) * 91.0) - 0.5) * grain;
      col = mix(col, fadeColor, clamp(fadeAmt, 0.0, 1.0));
      col += vec3(flash);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  const GRADE_PADRAO = {
    bloom: 0.7,
    threshold: 1.05,
    exposure: 1.0,
    vignette: 0.55,
    grain: 0.035,
    saturation: 1.08,
    contrast: 1.04,
    aberration: 0,
    scanlines: 0,
    sepia: 0,
    tint: [1, 1, 1],
    lift: [0, 0, 0],
    fadeColor: [0, 0, 0],
    fadeAmt: 0,
    flash: 0
  };

  function createPostFX(renderer, rawRender, w, h, perfil) {
    const THREE = T();
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const halfOk = isWebGL2 || renderer.extensions.has('OES_texture_half_float');
    const type = halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (ww, hh, samples, depth) =>
      new THREE.WebGLRenderTarget(Math.max(2, Math.floor(ww)), Math.max(2, Math.floor(hh)), {
        type,
        samples: samples || 0,
        depthBuffer: !!depth
      });

    let pr = renderer.getPixelRatio();
    let W = w * pr;
    let H = h * pr;
    const bs = perfil.bloomScale;
    const rtScene = mk(W, H, isWebGL2 ? perfil.msaa : 0, true);
    const rtA = mk(W * bs, H * bs);
    const rtB = mk(W * bs, H * bs);
    const rtC = mk(W * bs * 0.5, H * bs * 0.5);
    const rtD = mk(W * bs * 0.5, H * bs * 0.5);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    quadScene.add(quad);

    const shader = (frag, uniforms) =>
      new THREE.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });

    const brightMat = shader(BRIGHT_FRAG, { tDiffuse: { value: null }, threshold: { value: 0.85 }, knee: { value: 0.7 } });
    const blurMat = shader(BLUR_FRAG, { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } });
    const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const compMat = shader(COMPOSITE_FRAG, {
      tScene: { value: rtScene.texture },
      tBloomA: { value: rtA.texture },
      tBloomB: { value: rtD.texture },
      bloom: { value: GRADE_PADRAO.bloom },
      exposure: { value: 1 },
      vignette: { value: GRADE_PADRAO.vignette },
      grain: { value: GRADE_PADRAO.grain },
      time: { value: 0 },
      saturation: { value: GRADE_PADRAO.saturation },
      contrast: { value: GRADE_PADRAO.contrast },
      aberration: { value: 0 },
      scanlines: { value: 0 },
      sepia: { value: 0 },
      fadeAmt: { value: 0 },
      flash: { value: 0 },
      tint: { value: v3(GRADE_PADRAO.tint) },
      lift: { value: v3(GRADE_PADRAO.lift) },
      fadeColor: { value: v3(GRADE_PADRAO.fadeColor) },
      res: { value: new THREE.Vector2(W, H) }
    });

    function pass(mat, target) {
      quad.material = mat;
      renderer.setRenderTarget(target);
      rawRender(quadScene, cam);
    }

    function blur(src, dst, dx, dy, spread) {
      blurMat.uniforms.tDiffuse.value = src.texture;
      blurMat.uniforms.dir.value.set((dx * spread) / dst.width, (dy * spread) / dst.height);
      pass(blurMat, dst);
    }

    function render(scene, camera) {
      renderer.setRenderTarget(rtScene);
      rawRender(scene, camera);
      brightMat.uniforms.tDiffuse.value = rtScene.texture;
      pass(brightMat, rtA);
      blur(rtA, rtB, 1, 0, 1.2);
      blur(rtB, rtA, 0, 1, 1.2);
      blur(rtA, rtC, 1, 0, 2.2);
      blur(rtC, rtD, 0, 1, 2.2);
      blur(rtD, rtC, 1, 0, 3.4);
      blur(rtC, rtD, 0, 1, 3.4);
      compMat.uniforms.time.value = performance.now() / 1000;
      pass(compMat, null);
    }

    function setSize(nw, nh) {
      pr = renderer.getPixelRatio();
      W = nw * pr;
      H = nh * pr;
      rtScene.setSize(Math.max(2, Math.floor(W)), Math.max(2, Math.floor(H)));
      rtA.setSize(Math.max(2, Math.floor(W * bs)), Math.max(2, Math.floor(H * bs)));
      rtB.setSize(Math.max(2, Math.floor(W * bs)), Math.max(2, Math.floor(H * bs)));
      rtC.setSize(Math.max(2, Math.floor(W * bs * 0.5)), Math.max(2, Math.floor(H * bs * 0.5)));
      rtD.setSize(Math.max(2, Math.floor(W * bs * 0.5)), Math.max(2, Math.floor(H * bs * 0.5)));
      compMat.uniforms.res.value.set(W, H);
    }

    function setGrade(g = {}) {
      const u = compMat.uniforms;
      for (const [k, v] of Object.entries(g)) {
        if (k === 'threshold') brightMat.uniforms.threshold.value = v;
        else if (u[k]) {
          if (Array.isArray(v)) u[k].value.set(v[0], v[1], v[2]);
          else if (typeof v === 'number') u[k].value = v;
        }
      }
    }

    function getGrade(k) {
      if (k === 'threshold') return brightMat.uniforms.threshold.value;
      const u = compMat.uniforms[k];
      if (!u) return undefined;
      return u.value && u.value.isVector3 ? [u.value.x, u.value.y, u.value.z] : u.value;
    }

    function dispose() {
      [rtScene, rtA, rtB, rtC, rtD].forEach((rt) => rt.dispose());
      [brightMat, blurMat, compMat].forEach((m) => m.dispose());
      quad.geometry.dispose();
    }

    return { render, setSize, setGrade, getGrade, dispose, enabled: true };
  }

  // =====================================================================
  // PALCO 3D
  // =====================================================================
  function createStage(hostEl, opts = {}) {
    if (!hasThree() || !hostEl) return null;
    const THREE = T();
    const perfil = perfilQualidade();
    let width = opts.width || hostEl.clientWidth || 740;
    let height = opts.height || hostEl.clientHeight || 420;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !perfil.post || opts.post === false,
        alpha: !!opts.alpha,
        preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
        powerPreference: 'high-performance'
      });
    } catch (_e) {
      return null;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perfil.pixelRatio));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = perfil.shadows && opts.shadows !== false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 1.0;

    hostEl.innerHTML = '';
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.borderRadius = opts.radius ?? '12px';
    canvas.style.touchAction = 'none';
    hostEl.appendChild(canvas);

    const scene = new THREE.Scene();
    if (opts.bg !== null && !opts.alpha) scene.background = new THREE.Color(opts.bg ?? 0x090d1a);
    if (opts.fog) scene.fog = new THREE.FogExp2(opts.fogColor ?? opts.bg ?? 0x090d1a, opts.fog);
    if (opts.fogLinear) scene.fog = new THREE.Fog(opts.fogColor ?? opts.bg ?? 0x090d1a, opts.fogLinear[0], opts.fogLinear[1]);

    const camera = new THREE.PerspectiveCamera(opts.fov || 52, width / height, opts.near || 0.1, opts.far || 400);
    camera.position.set(...(opts.camPos || [0, 5, 10]));
    if (opts.lookAt) camera.lookAt(...opts.lookAt);

    let hemi = null;
    let dir = null;
    let fill = null;
    if (opts.lights !== false) {
      hemi = new THREE.HemisphereLight(opts.skyColor ?? 0x93c5fd, opts.groundColor ?? 0x1e293b, opts.hemiIntensity ?? 0.8);
      scene.add(hemi);
      dir = new THREE.DirectionalLight(opts.keyColor ?? 0xfef3c7, opts.keyIntensity ?? 1.45);
      dir.position.set(...(opts.keyPos || [12, 22, 14]));
      dir.castShadow = renderer.shadowMap.enabled;
      const sb = opts.shadowBounds || 16;
      dir.shadow.camera.left = -sb;
      dir.shadow.camera.right = sb;
      dir.shadow.camera.top = sb;
      dir.shadow.camera.bottom = -sb;
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far = 90;
      dir.shadow.mapSize.set(perfil.shadowSize, perfil.shadowSize);
      dir.shadow.bias = -0.0004;
      dir.shadow.normalBias = 0.02;
      scene.add(dir);
      scene.add(dir.target);
      fill = new THREE.DirectionalLight(opts.fillColor ?? 0xdfe8ff, opts.fillIntensity ?? 0.35);
      fill.position.set(0, 4, 14);
      scene.add(fill);
    }

    // ---------- Pós-processamento ----------
    const rawRender = renderer.render.bind(renderer);
    let post = null;
    if (perfil.post && opts.post !== false && !opts.alpha) {
      try {
        post = createPostFX(renderer, rawRender, width, height, perfil);
        post.setGrade({ ...GRADE_PADRAO, ...(opts.grade || {}) });
      } catch (e) {
        console.warn('[Luiggi3D] Pós-processamento indisponível:', e);
        post = null;
      }
    }

    // Tremor de câmera (aplicado só durante o render)
    const shakeState = { amp: 0, decay: 6 };
    const shakeOffset = new THREE.Vector3();

    renderer.render = function (s, c) {
      let shaken = false;
      if (shakeState.amp > 0.0005 && c === camera) {
        shakeOffset.set((Math.random() - 0.5) * shakeState.amp, (Math.random() - 0.5) * shakeState.amp, (Math.random() - 0.5) * shakeState.amp * 0.5);
        camera.position.add(shakeOffset);
        shaken = true;
      }
      if (post && post.enabled) post.render(s, c);
      else rawRender(s, c);
      if (shaken) camera.position.sub(shakeOffset);
    };

    // ---------- Resize ----------
    function resize(nw, nh) {
      const w = nw || hostEl.clientWidth || width;
      const h = nh || hostEl.clientHeight || height;
      if (w < 2 || h < 2) return;
      width = w;
      height = h;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (post) post.setSize(w, h);
    }
    let ro = null;
    if (!opts.width && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(hostEl);
    }

    // ---------- Laço de animação ----------
    let rafId = null;
    let updateFns = [];
    let last = 0;
    let elapsed = 0;
    let fpsAcc = 0;
    let fpsFrames = 0;
    let slowStrikes = 0;

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      if (!canvas.isConnected) {
        stop();
        return;
      }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      elapsed += dt;
      shakeState.amp *= Math.exp(-shakeState.decay * dt);
      for (const fn of updateFns) {
        try {
          fn(dt, elapsed);
        } catch (e) {
          console.error('[Luiggi3D] erro no update:', e);
        }
      }
      if (opts.autoRender !== false) renderer.render(scene, camera);

      // Monitor de desempenho (só no modo automático)
      fpsAcc += dt;
      fpsFrames++;
      if (fpsAcc >= 2.5) {
        const fps = fpsFrames / fpsAcc;
        fpsAcc = 0;
        fpsFrames = 0;
        if (perfil.auto && fps < 28) {
          slowStrikes++;
          if (slowStrikes >= 2) {
            slowStrikes = 0;
            degradar();
          }
        } else slowStrikes = 0;
      }
    }

    function degradar() {
      const prAtual = renderer.getPixelRatio();
      if (prAtual > 1) {
        renderer.setPixelRatio(1);
        resize();
      } else if (post && post.enabled) {
        post.enabled = false;
        renderer.shadowMap.enabled = false;
      }
      if (autoDetectado === 'alta') autoDetectado = 'media';
      else if (autoDetectado === 'media') autoDetectado = 'baixa';
    }

    function start(fn) {
      if (fn) updateFns.push(fn);
      if (!rafId) {
        last = 0;
        rafId = requestAnimationFrame(frame);
      }
      return stage;
    }
    function addUpdate(fn) {
      updateFns.push(fn);
      return () => removeUpdate(fn);
    }
    function removeUpdate(fn) {
      updateFns = updateFns.filter((f) => f !== fn);
    }
    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function shake(amount = 0.25, decay = 6) {
      shakeState.amp = Math.max(shakeState.amp, amount);
      shakeState.decay = decay;
    }

    // Efeitos temporários de grade (flash, aberração...)
    const tweens = [];
    function pulseGrade(key, peak, duration = 0.6, base) {
      if (!post) return;
      const from = base ?? post.getGrade(key) ?? 0;
      const tw = { key, from, peak, t: 0, duration };
      tweens.push(tw);
    }
    addUpdate((dt) => {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.duration);
        const v = tw.peak + (tw.from - tw.peak) * U.easeOut(k);
        post?.setGrade({ [tw.key]: v });
        if (k >= 1) tweens.splice(i, 1);
      }
    });

    function setGrade(g) {
      if (post) post.setGrade(g);
    }

    /** Renderiza direto em um render target (sem pós-processamento): retrovisores, telas... */
    function renderTo(target, s, c) {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      rawRender(s, c);
      renderer.setRenderTarget(prev);
    }

    function dispose() {
      stop();
      updateFns = [];
      if (ro) ro.disconnect();
      try {
        disposeObject(scene);
        if (post) post.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
      } catch (_e) { }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    const stage = {
      THREE,
      scene,
      camera,
      renderer,
      dirLight: dir,
      hemiLight: hemi,
      fillLight: fill,
      post,
      perfil,
      resize,
      dispose,
      domElement: canvas,
      start,
      stop,
      addUpdate,
      removeUpdate,
      shake,
      setGrade,
      pulseGrade,
      renderTo,
      get elapsed() {
        return elapsed;
      },
      get size() {
        return { width, height };
      }
    };
    return stage;
  }

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          for (const key of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'gradientMap']) {
            if (m[key] && m[key].dispose && !m[key].userData?.shared) m[key].dispose();
          }
          m.dispose();
        });
      }
    });
  }

  // =====================================================================
  // MATERIAIS
  // =====================================================================
  let toonGradient = null;
  function gradientMap() {
    if (toonGradient) return toonGradient;
    const THREE = T();
    const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
    toonGradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    toonGradient.minFilter = THREE.NearestFilter;
    toonGradient.magFilter = THREE.NearestFilter;
    toonGradient.generateMipmaps = false;
    toonGradient.needsUpdate = true;
    toonGradient.userData.shared = true;
    return toonGradient;
  }

  const M = {
    toon(color, o = {}) {
      const THREE = T();
      return new THREE.MeshToonMaterial({
        color: new THREE.Color(color),
        gradientMap: gradientMap(),
        map: o.map || null,
        emissive: new THREE.Color(o.emissive ?? 0x000000),
        emissiveIntensity: o.emissiveIntensity ?? 1,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
        side: o.side ?? THREE.FrontSide,
        alphaTest: o.alphaTest ?? 0
      });
    },
    std(color, roughness = 0.6, metalness = 0, o = {}) {
      const THREE = T();
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness,
        map: o.map || null,
        emissive: new THREE.Color(o.emissive ?? 0x000000),
        emissiveIntensity: o.emissiveIntensity ?? 1,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
        side: o.side ?? THREE.FrontSide,
        envMapIntensity: o.envMapIntensity ?? 1
      });
    },
    glow(color, intensity = 2.5, o = {}) {
      const THREE = T();
      const c = new THREE.Color(color).multiplyScalar(intensity);
      return new THREE.MeshBasicMaterial({
        color: c,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
        side: o.side ?? THREE.FrontSide,
        blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: o.depthWrite ?? !o.additive,
        map: o.map || null,
        fog: o.fog ?? true
      });
    },
    basic(color, o = {}) {
      const THREE = T();
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        map: o.map || null,
        transparent: !!o.transparent,
        opacity: o.opacity ?? 1,
        side: o.side ?? THREE.FrontSide,
        depthWrite: o.depthWrite ?? true,
        blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        fog: o.fog ?? true,
        alphaTest: o.alphaTest ?? 0
      });
    }
  };

  /** Contorno estilo cartoon (casca invertida escalada). Funciona melhor em formas centradas. */
  function addOutline(obj, thickness = 0.03, color = 0x120f18) {
    const THREE = T();
    const alvos = [];
    obj.traverse((m) => {
      if (m.isMesh && !m.userData.noOutline && !m.userData.isOutline) alvos.push(m);
    });
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    alvos.forEach((m) => {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const s = new THREE.Vector3();
      m.geometry.boundingBox.getSize(s);
      const c = new THREE.Vector3();
      m.geometry.boundingBox.getCenter(c);
      const o = new THREE.Mesh(m.geometry, mat);
      o.userData.isOutline = true;
      o.castShadow = false;
      o.receiveShadow = false;
      o.raycast = () => { };
      o.scale.set((s.x + thickness * 2) / Math.max(s.x, 1e-3), (s.y + thickness * 2) / Math.max(s.y, 1e-3), (s.z + thickness * 2) / Math.max(s.z, 1e-3));
      o.position.copy(c).multiplyScalar(1 - o.scale.x).setY(c.y * (1 - o.scale.y)).setZ(c.z * (1 - o.scale.z));
      m.add(o);
    });
    return obj;
  }

  // =====================================================================
  // TEXTURAS PROCEDURAIS
  // =====================================================================
  function makeCanvasTex(w, h, drawFn, repeatX = 1, repeatY = 1, o = {}) {
    if (!hasThree()) return null;
    const THREE = T();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 4;
    if (o.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
    if (o.nearest) {
      tex.magFilter = THREE.NearestFilter;
    }
    tex.userData.canvas = c;
    tex.userData.ctx = ctx;
    return tex;
  }

  function noise(ctx, w, h, n, colors, size = [1, 3]) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
      const s = size[0] + Math.random() * (size[1] - size[0]);
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = String(text).split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineH;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }

  const textures = {
    asphalt(rx = 6, ry = 6, o = {}) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = o.base || '#1a1d26';
          ctx.fillRect(0, 0, w, h);
          noise(ctx, w, h, 2200, ['#22262f', '#14161d', '#2a2e38', '#101218'], [1, 3]);
          for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let x = Math.random() * w;
            let y = Math.random() * h;
            ctx.moveTo(x, y);
            for (let k = 0; k < 6; k++) {
              x += (Math.random() - 0.5) * 40;
              y += (Math.random() - 0.5) * 40;
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          if (o.lines !== false) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.fillRect(w / 2 - 4, 18, 8, 88);
            ctx.fillRect(w / 2 - 4, 148, 8, 88);
          }
        },
        rx,
        ry
      );
    },
    parquet(rx = 4, ry = 4) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          const tones = ['#b46a2c', '#9c5620', '#c47b39', '#8b491a', '#a9612a'];
          for (let y = 0; y < h; y += 32) {
            const off = (y / 32) % 2 ? 32 : 0;
            for (let x = -64; x < w; x += 64) {
              ctx.fillStyle = tones[(Math.random() * tones.length) | 0];
              ctx.fillRect(x + off, y, 63, 31);
              ctx.strokeStyle = 'rgba(55,25,8,0.45)';
              ctx.strokeRect(x + off + 0.5, y + 0.5, 63, 31);
              ctx.strokeStyle = 'rgba(255,220,180,0.06)';
              for (let k = 0; k < 4; k++) {
                ctx.beginPath();
                ctx.moveTo(x + off, y + 4 + k * 7 + Math.random() * 3);
                ctx.lineTo(x + off + 63, y + 4 + k * 7 + Math.random() * 3);
                ctx.stroke();
              }
            }
          }
        },
        rx,
        ry
      );
    },
    tiles(base = '#d9d4cc', grout = '#a8a29e', rx = 6, ry = 6, n = 4) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = grout;
          ctx.fillRect(0, 0, w, h);
          const s = w / n;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              const v = (Math.random() - 0.5) * 14;
              ctx.fillStyle = shade(base, v);
              ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
            }
        },
        rx,
        ry
      );
    },
    checker(a = '#f1f5f9', b = '#1f2937', rx = 6, ry = 6, n = 8) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          const s = w / n;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              ctx.fillStyle = (x + y) % 2 ? a : b;
              ctx.fillRect(x * s, y * s, s, s);
            }
        },
        rx,
        ry
      );
    },
    brick(base = '#7c2d12', rx = 3, ry = 3) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = '#3f2a22';
          ctx.fillRect(0, 0, w, h);
          const bh = 24;
          const bw = 56;
          for (let y = 0; y < h; y += bh) {
            const off = (y / bh) % 2 ? bw / 2 : 0;
            for (let x = -bw; x < w + bw; x += bw) {
              ctx.fillStyle = shade(base, (Math.random() - 0.5) * 30);
              ctx.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
            }
          }
          noise(ctx, w, h, 900, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.05)'], [1, 2]);
        },
        rx,
        ry
      );
    },
    concrete(base = '#4b5058', rx = 3, ry = 3) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, w, h);
          noise(ctx, w, h, 3000, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.15)'], [1, 3]);
          for (let i = 0; i < 10; i++) {
            const g = ctx.createRadialGradient(Math.random() * w, Math.random() * h, 2, Math.random() * w, Math.random() * h, 60);
            g.addColorStop(0, 'rgba(0,0,0,0.12)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
          }
        },
        rx,
        ry
      );
    },
    wood(base = '#7c4a24', rx = 1, ry = 1) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 2) {
            ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '0,0,0' : '255,220,170'},${0.04 + Math.random() * 0.08})`;
            ctx.beginPath();
            ctx.moveTo(0, y + Math.sin(y * 0.1) * 2);
            for (let x = 0; x < w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + y * 0.2) * 2.5);
            ctx.stroke();
          }
        },
        rx,
        ry
      );
    },
    chalkboard(lines = [], o = {}) {
      return makeCanvasTex(1024, 512, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, o.cor || '#1f4d33');
        g.addColorStop(1, shade(o.cor || '#1f4d33', -18));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 2500, ['rgba(255,255,255,0.025)', 'rgba(0,0,0,0.06)'], [1, 4]);
        ctx.fillStyle = 'rgba(240,244,248,0.9)';
        ctx.font = `bold ${o.fonte || 54}px "Segoe Print", "Comic Sans MS", cursive`;
        lines.forEach((l, i) => ctx.fillText(l, 60, 110 + i * (o.fonte || 54) * 1.45));
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.moveTo(60, h - 60);
        ctx.quadraticCurveTo(w / 2, h - 110, w - 80, h - 50);
        ctx.stroke();
      });
    },
    cookie(corMassa = '#d69249') {
      return makeCanvasTex(256, 256, (ctx, w, h) => {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
        grad.addColorStop(0, corMassa);
        grad.addColorStop(0.82, shade(corMassa, -22));
        grad.addColorStop(1, shade(corMassa, -55));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 650; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,230,190,0.16)' : 'rgba(70,32,8,0.18)';
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(60,25,5,0.35)';
        for (let i = 0; i < 14; i++) {
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.beginPath();
          const x = Math.random() * w;
          const y = Math.random() * h;
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
          ctx.stroke();
        }
      });
    },
    basketball() {
      return makeCanvasTex(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 1500, ['rgba(0,0,0,0.12)', 'rgba(255,200,150,0.08)'], [1, 2]);
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 4, 0);
        ctx.lineTo(w / 4, h);
        ctx.moveTo((w * 3) / 4, 0);
        ctx.lineTo((w * 3) / 4, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w * 0.16, h * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    },
    danceFloor(cols = ['#ec4899', '#38bdf8', '#a855f7', '#1e293b']) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = '#0b1020';
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 32) {
            for (let x = 0; x < w; x += 32) {
              ctx.fillStyle = Math.random() > 0.6 ? cols[((x + y) / 32) % cols.length] : '#111827';
              ctx.globalAlpha = 0.55;
              ctx.fillRect(x + 2, y + 2, 28, 28);
            }
          }
          ctx.globalAlpha = 1;
        },
        4,
        4
      );
    },
    windows(o = {}) {
      // Fachada de prédio com janelas acesas aleatórias
      return makeCanvasTex(
        128,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = o.base || '#121522';
          ctx.fillRect(0, 0, w, h);
          const cols = o.cols || 4;
          const rows = o.rows || 10;
          const cw = w / cols;
          const rh = h / rows;
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
              const on = Math.random() < (o.lit ?? 0.32);
              ctx.fillStyle = on ? U.pick(o.litColors || ['#fde68a', '#fcd34d', '#fef3c7', '#93c5fd']) : o.off || '#1c2133';
              ctx.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.2, cw * 0.64, rh * 0.55);
            }
        },
        o.rx || 1,
        o.ry || 1
      );
    },
    gradient(stops, w = 4, h = 256, vertical = true) {
      return makeCanvasTex(w, h, (ctx) => {
        const g = vertical ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, 0, w, 0);
        stops.forEach(([p, c]) => g.addColorStop(p, c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    },
    radial(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
      return makeCanvasTex(size, size, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    },
    /** Texto como textura (placas, neons, telas). */
    text(text, o = {}) {
      const w = o.w || 512;
      const h = o.h || 128;
      return makeCanvasTex(w, h, (ctx) => {
        if (o.bg) {
          ctx.fillStyle = o.bg;
          if (o.radius) {
            roundRect(ctx, 0, 0, w, h, o.radius);
            ctx.fill();
          } else ctx.fillRect(0, 0, w, h);
        }
        ctx.font = `${o.weight || 'bold'} ${o.size || 64}px ${o.font || '"Segoe UI", system-ui, sans-serif'}`;
        ctx.textAlign = o.align || 'center';
        ctx.textBaseline = 'middle';
        if (o.glow) {
          ctx.shadowColor = o.glow;
          ctx.shadowBlur = o.glowBlur || 18;
        }
        ctx.fillStyle = o.color || '#ffffff';
        const lines = String(text).split('\n');
        const lh = (o.size || 64) * 1.15;
        const x = o.align === 'left' ? 20 : w / 2;
        lines.forEach((l, i) => ctx.fillText(l, x, h / 2 + (i - (lines.length - 1) / 2) * lh));
        if (o.stroke) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = o.stroke;
          ctx.lineWidth = o.strokeWidth || 3;
          lines.forEach((l, i) => ctx.strokeText(l, x, h / 2 + (i - (lines.length - 1) / 2) * lh));
        }
      });
    },
    poster(titulo, sub = '', cores = ['#7c3aed', '#ec4899']) {
      return makeCanvasTex(256, 384, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, cores[0]);
        g.addColorStop(1, cores[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 600, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.1)'], [1, 3]);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.42, w * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px "Segoe UI", sans-serif';
        wrapText(ctx, titulo, w / 2, h * 0.78, w - 30, 42);
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.fillText(sub, w / 2, h - 22);
      });
    },
    sprite(shape = 'soft') {
      return makeCanvasTex(64, 64, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2);
        if (shape === 'soft' || shape === 'smoke') {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(shape === 'smoke' ? 0.5 : 0.25, `rgba(255,255,255,${shape === 'smoke' ? 0.35 : 0.6})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else if (shape === 'spark') {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(0.15, 'rgba(255,255,255,0.8)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(-w / 2, -2, w, 4);
          ctx.fillRect(-2, -h / 2, 4, h);
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'streak') {
          const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(1, 'rgba(255,255,255,0.9)');
          ctx.fillStyle = g;
          ctx.fillRect(-1.5, -h / 2, 3, h);
        } else if (shape === 'heart') {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 54px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♥', 0, 4);
        } else if (shape === 'square') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(-14, -9, 28, 18);
        } else if (shape === 'note') {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 50px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♪', 0, 2);
        } else {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  };

  function shade(hex, amt) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const r = U.clamp(((n >> 16) & 255) + amt, 0, 255) | 0;
    const g = U.clamp(((n >> 8) & 255) + amt, 0, 255) | 0;
    const b = U.clamp((n & 255) + amt, 0, 255) | 0;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // =====================================================================
  // PARTÍCULAS
  // =====================================================================
  const spriteCache = {};
  function spriteTex(shape) {
    if (!spriteCache[shape]) {
      spriteCache[shape] = textures.sprite(shape);
      spriteCache[shape].userData.shared = true;
    }
    return spriteCache[shape];
  }

  /**
   * Sistema de partículas leve (THREE.Points).
   * opts: count, size, shape, color(s), additive, gravity, drag, life:[min,max],
   *       ambient: { center:[x,y,z], size:[x,y,z], vel:[[min],[max]] } para partículas contínuas.
   */
  function createParticles(opts = {}) {
    const THREE = T();
    const n = opts.count || 200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const additive = opts.additive !== false;
    const mat = new THREE.PointsMaterial({
      size: opts.size || 0.12,
      map: spriteTex(opts.shape || 'soft'),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      opacity: opts.opacity ?? 1,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: opts.sizeAttenuation !== false,
      alphaTest: additive ? 0 : 0.02,
      fog: opts.fog ?? true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.userData.noOutline = true;

    const cols = (opts.colors || [opts.color || '#ffffff']).map((c) => new THREE.Color(c).multiplyScalar(opts.intensity ?? 1));
    const P = [];
    for (let i = 0; i < n; i++) P.push({ alive: false, life: 0, max: 1, vx: 0, vy: 0, vz: 0, c: cols[0], spin: 0 });
    let cursor = 0;
    const lifeR = opts.life || [1, 2];
    const grav = opts.gravity ?? 0;
    const drag = opts.drag ?? 0;
    const amb = opts.ambient;

    function spawn(i, x, y, z, vx, vy, vz, c) {
      const p = P[i];
      p.alive = true;
      p.life = 0;
      p.max = U.rand(lifeR[0], lifeR[1]);
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.c = c || U.pick(cols);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }

    function ambientSpawn(i, anywhere) {
      const [cx, cy, cz] = amb.center || [0, 0, 0];
      const [sx, sy, sz] = amb.size || [10, 5, 10];
      const v0 = amb.vel?.[0] || [0, 0, 0];
      const v1 = amb.vel?.[1] || [0, 0, 0];
      const y = anywhere ? cy + U.rand(-sy / 2, sy / 2) : amb.fromTop ? cy + sy / 2 : amb.fromBottom ? cy - sy / 2 : cy + U.rand(-sy / 2, sy / 2);
      spawn(i, cx + U.rand(-sx / 2, sx / 2), y, cz + U.rand(-sz / 2, sz / 2), U.rand(v0[0], v1[0]), U.rand(v0[1], v1[1]), U.rand(v0[2], v1[2]));
      if (anywhere) P[i].life = Math.random() * P[i].max;
    }

    if (amb) for (let i = 0; i < n; i++) ambientSpawn(i, true);

    function emit(count, origin, velFn, color) {
      const o = origin || { x: 0, y: 0, z: 0 };
      for (let k = 0; k < count; k++) {
        const i = cursor;
        cursor = (cursor + 1) % n;
        const v = velFn ? velFn(k) : { x: U.rand(-1, 1), y: U.rand(0.5, 2), z: U.rand(-1, 1) };
        spawn(i, o.x, o.y, o.z, v.x, v.y, v.z, color ? new THREE.Color(color).multiplyScalar(opts.intensity ?? 1) : null);
      }
    }

    function burst(count, origin, speed = 3, color) {
      emit(
        count,
        origin,
        () => {
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          const s = speed * (0.4 + Math.random() * 0.6);
          return { x: Math.sin(ph) * Math.cos(th) * s, y: Math.abs(Math.cos(ph)) * s + speed * 0.3, z: Math.sin(ph) * Math.sin(th) * s };
        },
        color
      );
    }

    function update(dt) {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (!p.alive) continue;
        p.life += dt;
        if (p.life >= p.max) {
          if (amb) {
            ambientSpawn(i, false);
            continue;
          }
          p.alive = false;
          pos[i * 3 + 1] = -9999;
          continue;
        }
        p.vy -= grav * dt;
        if (drag) {
          const k = Math.exp(-drag * dt);
          p.vx *= k;
          p.vy *= k;
          p.vz *= k;
        }
        if (amb?.sway) p.vx += Math.sin((p.life + i) * 2) * amb.sway * dt;
        pos[i * 3] += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        if (opts.floor !== undefined && pos[i * 3 + 1] < opts.floor) {
          pos[i * 3 + 1] = opts.floor;
          p.vy *= -0.25;
          p.vx *= 0.6;
          p.vz *= 0.6;
        }
        const t = p.life / p.max;
        const fade = additive ? (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) : 1;
        col[i * 3] = p.c.r * fade;
        col[i * 3 + 1] = p.c.g * fade;
        col[i * 3 + 2] = p.c.b * fade;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    return { points, emit, burst, update, object: points };
  }

  // =====================================================================
  // PRIMITIVAS E PEÇAS
  // =====================================================================
  function box(w, h, d, mat, x = 0, y = 0, z = 0, o = {}) {
    const THREE = T();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.receive ?? true;
    return m;
  }
  function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20, o = {}) {
    const THREE = T();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.receive ?? true;
    return m;
  }
  function sphere(r, mat, x = 0, y = 0, z = 0, seg = 20) {
    const THREE = T();
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, (seg * 0.7) | 0)), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function plane(w, h, mat, x = 0, y = 0, z = 0) {
    const THREE = T();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    return m;
  }

  /** Mancha de sombra suave no chão (barata, para quando sombras estiverem desligadas). */
  let blobTex = null;
  function blobShadow(r = 0.6, opacity = 0.45) {
    const THREE = T();
    if (!blobTex) {
      blobTex = textures.radial('rgba(0,0,0,1)', 'rgba(0,0,0,0)', 64);
      blobTex.userData.shared = true;
    }
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    m.userData.noOutline = true;
    m.renderOrder = 1;
    return m;
  }

  /** Halo luminoso (billboard aditivo) para lâmpadas, faróis e neons. */
  let haloTex = null;
  function halo(color = '#fde68a', size = 1, intensity = 1.6) {
    const THREE = T();
    if (!haloTex) {
      haloTex = textures.radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 128);
      haloTex.userData.shared = true;
    }
    const mat = new THREE.SpriteMaterial({
      map: haloTex,
      color: new THREE.Color(color).multiplyScalar(intensity),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    s.userData.noOutline = true;
    return s;
  }

  /** Cone de luz volumétrico falso (feixe de holofote/poste). */
  function lightCone(color = '#fde68a', radius = 1.6, height = 4, opacity = 0.16) {
    const THREE = T();
    const geo = new THREE.ConeGeometry(radius, height, 24, 1, true);
    geo.translate(0, -height / 2, 0);
    const tex = textures.gradient([
      [0, 'rgba(255,255,255,1)'],
      [1, 'rgba(255,255,255,0)']
    ]);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      alphaMap: tex,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.noOutline = true;
    return m;
  }

  /** Placa de neon com texto (com brilho real via bloom). */
  function neonSign(text, color = '#ec4899', w = 2.4, h = 0.6, o = {}) {
    const THREE = T();
    const tex = textures.text(text, {
      w: 1024,
      h: Math.round(1024 * (h / w)),
      size: o.size || Math.round(1024 * (h / w) * 0.62),
      color: '#ffffff',
      glow: color,
      glowBlur: 30,
      font: o.font || '"Segoe Script", "Brush Script MT", cursive'
    });
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(color).multiplyScalar(o.intensity ?? 2.6),
      transparent: true,
      depthWrite: false,
      blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.userData.noOutline = true;
    return m;
  }

  // =====================================================================
  // CARROS (perfil extrudado)
  // =====================================================================
  function carProfileShape(tipo) {
    const THREE = T();
    const s = new THREE.Shape();
    const wb = tipo === 'civic' ? 1.36 : 1.42;
    const rr = 0.44;
    s.moveTo(-2.28, 0.3);
    s.lineTo(-wb - rr, 0.3);
    s.absarc(-wb, 0.34, rr, Math.PI, 0, true);
    s.lineTo(wb - rr, 0.3);
    s.absarc(wb, 0.34, rr, Math.PI, 0, true);
    if (tipo === 'civic') {
      s.lineTo(2.22, 0.28);
      s.quadraticCurveTo(2.42, 0.36, 2.36, 0.56);
      s.quadraticCurveTo(2.3, 0.74, 1.95, 0.8);
      s.lineTo(0.95, 0.88);
      s.lineTo(-1.35, 0.9);
      s.quadraticCurveTo(-2.05, 0.9, -2.22, 0.84);
      s.quadraticCurveTo(-2.36, 0.62, -2.28, 0.3);
    } else {
      s.lineTo(2.24, 0.3);
      s.lineTo(2.38, 0.42);
      s.quadraticCurveTo(2.42, 0.62, 2.3, 0.72);
      s.lineTo(2.05, 0.82);
      s.lineTo(1.0, 0.9);
      s.lineTo(-1.42, 0.93);
      s.lineTo(-2.08, 0.9);
      s.quadraticCurveTo(-2.32, 0.86, -2.34, 0.7);
      s.lineTo(-2.36, 0.46);
      s.lineTo(-2.28, 0.3);
    }
    return s;
  }

  function greenhouseShape(tipo) {
    const THREE = T();
    const s = new THREE.Shape();
    if (tipo === 'civic') {
      s.moveTo(1.02, 0.86);
      s.quadraticCurveTo(0.55, 1.22, 0.2, 1.33);
      s.lineTo(-0.85, 1.34);
      s.quadraticCurveTo(-1.25, 1.2, -1.45, 0.9);
      s.lineTo(1.02, 0.86);
    } else {
      s.moveTo(1.06, 0.88);
      s.lineTo(0.28, 1.36);
      s.lineTo(-0.92, 1.38);
      s.lineTo(-1.56, 0.92);
      s.lineTo(1.06, 0.88);
    }
    return s;
  }

  function extrudeSide(shape, width, bevel = 0.05) {
    const THREE = T();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 18
    });
    geo.rotateY(-Math.PI / 2);
    geo.translate((width - bevel * 2) / 2, 0, 0);
    geo.computeVertexNormals();
    return geo;
  }

  function createCarMesh(o = {}) {
    const THREE = T();
    const tipo = o.tipo || 'subaru';
    const car = new THREE.Group();
    const corHex = o.cor || (tipo === 'civic' ? '#ECEEF2' : '#1245A8');

    const paint = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(corHex),
      metalness: 0.55,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1222, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.88 });
    const trim = M.std(0x0d0f14, 0.75, 0.2);
    const rubber = M.std(0x111111, 0.9, 0);
    const rimMat = M.std(o.rodas || (tipo === 'civic' ? '#CBD5E1' : '#C5A059'), 0.25, 0.9);
    const chrome = M.std(0xe2e8f0, 0.15, 1);

    const W = tipo === 'civic' ? 1.72 : 1.78;
    const body = new THREE.Mesh(extrudeSide(carProfileShape(tipo), W, 0.06), paint);
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    const gh = new THREE.Mesh(extrudeSide(greenhouseShape(tipo), W - 0.26, 0.05), glass);
    gh.castShadow = true;
    car.add(gh);

    // Teto pintado por cima do vidro
    const roof = box(W - 0.3, 0.05, tipo === 'civic' ? 0.95 : 1.12, paint, 0, tipo === 'civic' ? 1.36 : 1.4, tipo === 'civic' ? -0.32 : -0.32);
    car.add(roof);
    // Colunas B
    [-1, 1].forEach((sx) => car.add(box(0.06, 0.42, 0.1, trim, sx * (W / 2 - 0.15), 1.12, -0.25, { cast: false })));

    // Faixa preta inferior (saias)
    car.add(box(W + 0.02, 0.1, 2.0, trim, 0, 0.33, 0));

    if (tipo !== 'civic') {
      // Hood scoop característico + aerofólio + teto solar
      const scoop = box(0.62, 0.1, 0.6, trim, 0, 0.92, 1.45);
      scoop.rotation.x = -0.06;
      car.add(scoop);
      car.add(box(0.5, 0.02, 0.05, M.basic(0x000000), 0, 0.95, 1.74, { cast: false }));
      const wing = box(1.6, 0.05, 0.3, paint, 0, 1.08, -2.0);
      car.add(wing);
      [-0.6, 0.6].forEach((x) => car.add(box(0.06, 0.14, 0.12, trim, x, 1.0, -2.0)));
      car.add(box(0.7, 0.02, 0.5, glass, 0, 1.43, -0.15, { cast: false }));
    } else {
      // Lip dianteiro e asa baixa do Civic
      car.add(box(W - 0.1, 0.05, 0.25, trim, 0, 0.27, 2.25));
      car.add(box(1.4, 0.04, 0.22, trim, 0, 0.97, -2.12));
    }

    // Grade e faróis
    const grille = box(0.9, 0.18, 0.05, trim, 0, 0.6, 2.36);
    car.add(grille);
    if (tipo !== 'civic') {
      const badge = box(0.16, 0.06, 0.02, M.glow('#ef4444', 1.4), 0, 0.6, 2.39, { cast: false });
      car.add(badge);
    }
    const headMat = M.glow(0xfff7d6, o.farolIntensidade ?? 3.2);
    const tailMat = M.glow(0xff2d2d, 2.2);
    [-1, 1].forEach((sx) => {
      const hl = box(0.42, 0.12, 0.06, headMat, sx * 0.6, 0.66, 2.33, { cast: false });
      hl.rotation.y = sx * -0.12;
      car.add(hl);
      const tl = box(0.44, 0.12, 0.06, tailMat, sx * 0.6, 0.72, -2.33, { cast: false });
      car.add(tl);
      // Retrovisores
      car.add(box(0.14, 0.1, 0.18, paint, sx * (W / 2 + 0.06), 0.98, 0.78));
      // Maçanetas
      car.add(box(0.02, 0.03, 0.14, chrome, sx * (W / 2 + 0.005), 0.84, 0.2, { cast: false }));
      car.add(box(0.02, 0.03, 0.14, chrome, sx * (W / 2 + 0.005), 0.84, -0.75, { cast: false }));
    });
    // Placas
    const plateTex = textures.text(o.placa || (tipo === 'civic' ? 'EMI-1D0C' : 'LUI-6G1B'), { w: 256, h: 80, size: 46, color: '#111827', bg: '#f1f5f9', radius: 8 });
    [2.4, -2.39].forEach((z) => {
      const p = plane(0.42, 0.13, M.basic(0xffffff, { map: plateTex }), 0, 0.45, z);
      if (z < 0) p.rotation.y = Math.PI;
      car.add(p);
    });

    // Rodas
    const wheels = [];
    const wb = tipo === 'civic' ? 1.36 : 1.42;
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.27, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(0.28, 0.04, 0.42);
    [
      [-1, wb],
      [1, wb],
      [-1, -wb],
      [1, -wb]
    ].forEach(([sx, z]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, rubber);
      tire.castShadow = true;
      wg.add(tire);
      wg.add(new THREE.Mesh(rimGeo, rimMat));
      const nSpokes = tipo === 'civic' ? 5 : 10;
      for (let i = 0; i < nSpokes; i++) {
        const sp = new THREE.Mesh(spokeGeo, tipo === 'civic' ? chrome : rimMat);
        sp.rotation.x = (i / nSpokes) * Math.PI;
        sp.scale.set(1, 1, tipo === 'civic' ? 1 : 0.95);
        sp.position.x = sx * 0.02;
        wg.add(sp);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.29, 12).rotateZ(Math.PI / 2), chrome);
      wg.add(cap);
      wg.position.set(sx * (W / 2 - 0.08), 0.36, z);
      car.add(wg);
      wheels.push(wg);
    });

    // Neon por baixo
    if (o.neon) {
      const neonCor = o.corNeon || (tipo === 'civic' ? '#EC4899' : '#38BDF8');
      const glowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 5.2),
        new THREE.MeshBasicMaterial({
          map: textures.radial('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 128),
          color: new THREE.Color(neonCor).multiplyScalar(1.6),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      glowPlane.rotation.x = -Math.PI / 2;
      glowPlane.position.y = 0.03;
      glowPlane.userData.noOutline = true;
      car.add(glowPlane);
      const ug = new THREE.PointLight(neonCor, 3, 5, 1.2);
      ug.position.set(0, 0.2, 0);
      car.add(ug);
      car.add(box(W - 0.2, 0.02, 0.02, M.glow(neonCor, 3), 0, 0.26, 1.0, { cast: false }));
      car.add(box(W - 0.2, 0.02, 0.02, M.glow(neonCor, 3), 0, 0.26, -1.0, { cast: false }));
    }

    // Halos dos faróis
    const halos = [];
    [-1, 1].forEach((sx) => {
      const h = halo('#fff4c2', 0.55, 0.9);
      h.position.set(sx * 0.6, 0.66, 2.42);
      car.add(h);
      halos.push(h);
      const t = halo('#ff3030', 0.35, 0.8);
      t.position.set(sx * 0.6, 0.72, -2.42);
      car.add(t);
    });

    car.userData.wheels = wheels;
    car.userData.halos = halos;
    car.userData.paint = paint;
    car.userData.tipo = tipo;
    return car;
  }

  function createSubaruMesh(corHex = '#1245A8', neon = false) {
    return createCarMesh({ tipo: 'subaru', cor: corHex, neon });
  }
  function createCivicMesh(neon = true) {
    return createCarMesh({ tipo: 'civic', cor: '#ECEEF2', neon, corNeon: '#EC4899' });
  }

  /** Faróis com SpotLight real (para estradas à noite). */
  function addHeadlights(car, intensity = 30, distance = 40) {
    const THREE = T();
    const lights = [];
    [-0.6, 0.6].forEach((x) => {
      const s = new THREE.SpotLight(0xfff1c9, intensity, distance, 0.5, 0.6, 1.2);
      s.position.set(x, 0.7, 2.3);
      s.target.position.set(x * 1.2, 0, 14);
      car.add(s);
      car.add(s.target);
      lights.push(s);
    });
    return lights;
  }

  // =====================================================================
  // COOKIE, XÍCARA, CELULAR, CAPIVARA, BANDEIRA...
  // =====================================================================
  function createCookieMesh(corMassa = '#d69249', corGotas = '#3b1f10', o = {}) {
    const THREE = T();
    const grp = new THREE.Group();
    const tex = textures.cookie(corMassa);
    const doughMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.02 });

    // Disco "fofinho" com bordas irregulares (Lathe + deformação)
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const r = 1.8 * Math.sin((t * Math.PI) / 2);
      const y = 0.32 * Math.cos((t * Math.PI) / 2) + (t > 0.85 ? -0.08 * (t - 0.85) / 0.15 : 0);
      pts.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    pts.push(new THREE.Vector2(1.78, -0.12));
    pts.push(new THREE.Vector2(0.001, -0.12));
    const geo = new THREE.LatheGeometry(pts, 48);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const ang = Math.atan2(z, x);
      const rr = Math.hypot(x, z);
      const k = 1 + Math.sin(ang * 5) * 0.035 + Math.sin(ang * 11 + 1.3) * 0.02;
      p.setX(i, x * k);
      p.setZ(i, z * k);
      if (rr > 0.2 && p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(ang * 7 + rr * 3) * 0.025);
    }
    geo.computeVertexNormals();
    const disc = new THREE.Mesh(geo, doughMat);
    disc.castShadow = true;
    disc.receiveShadow = true;
    grp.add(disc);

    const chipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(corGotas), roughness: 0.35, metalness: 0.05 });
    const nChips = o.gotas ?? 11;
    for (let i = 0; i < nChips; i++) {
      const a = (i / nChips) * Math.PI * 2 + Math.random() * 0.5;
      const r = i === 0 ? 0 : 0.35 + Math.random() * 1.1;
      const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.08, 0), chipMat);
      chip.position.set(Math.cos(a) * r, 0.27 - (r / 1.8) * 0.18, Math.sin(a) * r);
      chip.scale.set(1.1, 0.6, 1.1);
      chip.rotation.set(Math.random(), Math.random(), Math.random());
      chip.castShadow = true;
      grp.add(chip);
    }
    return grp;
  }

  function createCupMesh(artType = 'coracao', o = {}) {
    const THREE = T();
    const grp = new THREE.Group();
    const ceramic = new THREE.MeshPhysicalMaterial({ color: o.cor || 0xf8fafc, roughness: 0.15, clearcoat: 0.8 });
    const wood = M.std(0x6b3410, 0.7);

    const saucerPts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(1.9, 0.02), new THREE.Vector2(2.05, 0.14), new THREE.Vector2(1.95, 0.16), new THREE.Vector2(0.9, 0.06), new THREE.Vector2(0.001, 0.06)];
    const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerPts, 48), o.pires === 'madeira' ? wood : ceramic);
    saucer.position.y = -0.78;
    saucer.receiveShadow = true;
    saucer.castShadow = true;
    grp.add(saucer);

    const cupPts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      cupPts.push(new THREE.Vector2(0.8 + Math.pow(t, 0.8) * 0.48, -0.7 + t * 1.42));
    }
    cupPts.push(new THREE.Vector2(1.2, 0.72));
    for (let i = 14; i >= 0; i--) {
      const t = i / 14;
      cupPts.push(new THREE.Vector2(0.72 + Math.pow(t, 0.8) * 0.48, -0.6 + t * 1.32));
    }
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 48), ceramic);
    cup.castShadow = true;
    grp.add(cup);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 24, Math.PI * 1.2), ceramic);
    handle.rotation.z = -Math.PI * 0.6;
    handle.position.set(1.22, 0.02, 0);
    grp.add(handle);

    // Superfície do café: textura de canvas que pode ser pintada (latte art)
    const foamTex = makeCanvasTex(512, 512, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#a5651f');
      g.addColorStop(0.75, '#7a4416');
      g.addColorStop(1, '#4a2509');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 900, ['rgba(255,230,190,0.05)', 'rgba(60,25,5,0.1)'], [1, 4]);
      if (artType && artType !== 'vazio') desenharLatte(ctx, w, h, artType);
    });
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1.13, 48), new THREE.MeshStandardMaterial({ map: foamTex, roughness: 0.35 }));
    foam.rotation.x = -Math.PI / 2;
    foam.position.y = 0.6;
    foam.userData.noOutline = true;
    grp.add(foam);
    grp.userData.foam = foam;
    grp.userData.foamTex = foamTex;
    return grp;
  }

  function desenharLatte(ctx, w, h, artType) {
    ctx.fillStyle = '#fdf3dc';
    ctx.strokeStyle = '#fdf3dc';
    const s = w / 256;
    if (artType === 'coracao') {
      ctx.beginPath();
      ctx.arc(104 * s, 108 * s, 28 * s, 0, Math.PI * 2);
      ctx.arc(152 * s, 108 * s, 28 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(78 * s, 116 * s);
      ctx.lineTo(128 * s, 184 * s);
      ctx.lineTo(178 * s, 116 * s);
      ctx.fill();
    } else if (artType === 'subaru') {
      ctx.lineWidth = 8 * s;
      ctx.beginPath();
      ctx.ellipse(128 * s, 128 * s, 66 * s, 42 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `bold ${34 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★ ★', 128 * s, 140 * s);
    } else if (artType === 'felps') {
      ctx.font = `bold ${46 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('FELPS!', 128 * s, 142 * s);
    } else {
      ctx.beginPath();
      ctx.arc(128 * s, 128 * s, 54 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Celular 3D com tela de canvas redesenhável. draw(ctx, w, h) é chamado em redraw(). */
  function createPhoneMesh(draw, o = {}) {
    const THREE = T();
    const g = new THREE.Group();
    const w = o.w || 1.0;
    const h = o.h || 2.05;
    const shape = new THREE.Shape();
    const r = 0.16;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
    bodyGeo.translate(0, 0, -0.05);
    const body = new THREE.Mesh(bodyGeo, M.std(o.cor || 0x1f2937, 0.3, 0.7));
    body.castShadow = true;
    g.add(body);

    const tex = makeCanvasTex(o.resW || 540, o.resH || 1110, (ctx, cw, ch) => draw && draw(ctx, cw, ch));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.07, h - 0.08), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.051;
    screen.userData.noOutline = true;
    g.add(screen);
    // Notch / câmera
    const notch = box(0.24, 0.04, 0.01, M.basic(0x05060a), 0, h / 2 - 0.09, 0.056, { cast: false });
    g.add(notch);

    g.userData.screen = screen;
    g.userData.tex = tex;
    g.redraw = (fn) => {
      const ctx = tex.userData.ctx;
      const c = tex.userData.canvas;
      (fn || draw)(ctx, c.width, c.height);
      tex.needsUpdate = true;
    };
    return g;
  }

  /** Capivara low-poly (estrela do sonho do Cap. 11). */
  function createCapybaraMesh() {
    const THREE = T();
    const g = new THREE.Group();
    const fur = M.toon('#8b5a2b');
    const dark = M.toon('#3b2412');
    const body = sphere(0.7, fur, 0, 0.7, 0);
    body.scale.set(1, 0.8, 1.45);
    g.add(body);
    const head = box(0.62, 0.55, 0.75, fur, 0, 0.95, 1.05);
    g.add(head);
    const snout = box(0.56, 0.42, 0.3, fur, 0, 0.88, 1.5);
    g.add(snout);
    [-0.2, 0.2].forEach((x) => {
      g.add(sphere(0.06, dark, x, 1.08, 1.43, 8));
      g.add(sphere(0.1, fur, x * 1.3, 1.26, 0.88, 8));
    });
    g.add(box(0.2, 0.06, 0.04, dark, 0, 0.92, 1.66));
    [
      [-0.38, 0.6],
      [0.38, 0.6],
      [-0.38, -0.6],
      [0.38, -0.6]
    ].forEach(([x, z]) => g.add(cyl(0.12, 0.12, 0.5, fur, x, 0.25, z, 8)));
    // Asinhas de sonho
    const wingMat = M.toon('#fbcfe8', { emissive: '#f472b6', emissiveIntensity: 0.4, side: THREE.DoubleSide });
    [-1, 1].forEach((sx) => {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0, Math.PI), wingMat);
      wing.position.set(sx * 0.6, 1.25, 0);
      wing.rotation.set(0, sx * 0.4, sx * -0.6);
      wing.name = sx < 0 ? 'asaE' : 'asaD';
      g.add(wing);
    });
    addOutline(g, 0.03);
    return g;
  }

  /** O gato preto da Luiza (olhos amarelos brilhantes). */
  function createCatMesh() {
    const THREE = root.THREE;
    
    const g = new THREE.Group();
    const pelo = M.toon('#15151b');
    const corpo = sphere(0.22, pelo, 0, 0.22, 0, 14);
    corpo.scale.set(1, 0.9, 1.3);
    g.add(corpo);
    const cab = sphere(0.16, pelo, 0, 0.42, 0.22, 14);
    g.add(cab);
    [-1, 1].forEach((s) => {
      const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), pelo);
      orelha.position.set(s * 0.09, 0.57, 0.2);
      g.add(orelha);
      const olho = sphere(0.032, M.glow('#facc15', 5), s * 0.06, 0.44, 0.36, 8);
      olho.name = 'olho';
      g.add(olho);
    });
    const cauda = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16, Math.PI * 1.2), pelo);
    cauda.position.set(0, 0.3, -0.28);
    cauda.rotation.y = Math.PI / 2;
    g.add(cauda);
    g.userData.cauda = cauda;
    addOutline(g, 0.01);
    return g;
  }

  /** Bandeira vermelha tremulando (vertex animation). */
  function createFlagMesh(cor = '#dc2626') {
    const THREE = T();
    const g = new THREE.Group();
    const pole = cyl(0.025, 0.025, 1.4, M.std(0xd1d5db, 0.3, 0.8), 0, 0.7, 0, 8);
    g.add(pole);
    const geo = new THREE.PlaneGeometry(0.8, 0.5, 12, 6);
    geo.translate(0.4, 0, 0);
    const flag = new THREE.Mesh(geo, M.toon(cor, { side: THREE.DoubleSide, emissive: cor, emissiveIntensity: 0.25 }));
    flag.position.set(0.02, 1.15, 0);
    g.add(flag);
    const base = geo.attributes.position.array.slice();
    g.userData.update = (t) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.setZ(i, Math.sin(x * 6 - t * 8) * 0.08 * x);
        p.setY(i, base[i * 3 + 1] + Math.sin(x * 4 - t * 6) * 0.03 * x);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    };
    return g;
  }

  // =====================================================================
  // CARTAS DE PERSONAGEM (sprites 2D dentro do mundo 3D)
  // =====================================================================
  const texCache = new Map();

  function carregarImagem(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /** Converte imagem em canvas com o pé esmaecido (sprites de meio corpo não terminam "cortados"). */
  function imagemParaCanvas(img, fadeBottom = 0.1, maxH = 1024) {
    const k = Math.min(1, maxH / img.height);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (fadeBottom > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createLinearGradient(0, c.height * (1 - fadeBottom), 0, c.height);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, c.height * (1 - fadeBottom), c.width, c.height * fadeBottom);
      ctx.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  /**
   * Gera (com cache) a textura do personagem para uma expressão.
   * Retorna { tex, aspect, tipo: 'png'|'svg', meioCorpo }
   */
  async function texturaPersonagem(char, expr = 'neutro') {
    const THREE = T();
    const rig = root.LuiggiRig;
    const png = canUseImageTextures() ? rig?.getCartoonSpriteUrl?.(char, expr) : null;
    const key = `${char.id}|${png ? png : 'svg:' + expr}`;
    if (texCache.has(key)) return texCache.get(key);

    const p = (async () => {
      let canvas;
      let meioCorpo = false;
      if (png) {
        const img = await carregarImagem(encodeURI(png));
        canvas = imagemParaCanvas(img, 0.3);
        meioCorpo = true;
      } else {
        const svgStr = rig.renderCharacterSVG(char, { expressao: expr, scale: 'full' });
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        try {
          const img = await carregarImagem(url);
          canvas = document.createElement('canvas');
          canvas.width = 440;
          canvas.height = 592;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.userData.shared = true;
      return { tex, aspect: canvas.width / canvas.height, tipo: png ? 'png' : 'svg', meioCorpo };
    })();
    texCache.set(key, p);
    p.catch(() => texCache.delete(key));
    return p;
  }

  /**
   * Carta de personagem: plano com o sprite, sombra projetada recortada, emote e animação.
   * card.update(dt) deve ser chamado no laço.
   */
  function createCharacterCard(char, o = {}) {
    const THREE = T();
    const group = new THREE.Group();
    const altura = o.altura || 2.6;
    const pivot = new THREE.Group();
    group.add(pivot);

    const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, color: 0xffffff, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.visible = false;
    mesh.userData.noOutline = true;
    mesh.castShadow = true;
    pivot.add(mesh);

    const shadow = blobShadow(0.7, 0.4);
    group.add(shadow);

    let emoteSprite = null;
    const state = {
      expr: o.expr || 'neutro',
      speaking: false,
      dim: false,
      t: Math.random() * 10,
      pulse: 0,
      tint: new THREE.Color(o.tint || 0xffffff),
      ready: false,
      meioCorpo: false,
      emoteT: 0,
      entrada: 0
    };
    let token = 0;

    async function aplicarTextura(expr) {
      const my = ++token;
      try {
        const info = await texturaPersonagem(char, expr);
        if (my !== token) return;
        mat.map = info.tex;
        mat.needsUpdate = true;
        const h = info.meioCorpo ? altura * 0.8 : altura * (o.alturaSvg ?? 1.06);
        mesh.scale.set(h * info.aspect, h, 1);
        mesh.position.y = h / 2 + (info.meioCorpo ? altura * 0.2 : 0);
        state.meioCorpo = info.meioCorpo;
        shadow.visible = !info.meioCorpo;
        mesh.visible = true;
        if (!state.ready) state.readyAt = performance.now();
        state.ready = true;
        // Sombra projetada com o recorte do sprite
        mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: info.tex, alphaTest: 0.5 });
      } catch (e) {
        if (o.onError) o.onError(e);
      }
    }

    const EMOTES = { feliz: '✨', bravo: '💢', envergonhado: '😳', chocado: '❗' };
    function mostrarEmote(expr) {
      if (emoteSprite) {
        pivot.remove(emoteSprite);
        emoteSprite.material.map?.dispose();
        emoteSprite.material.dispose();
        emoteSprite = null;
      }
      const e = EMOTES[expr];
      if (!e) return;
      const tex = textures.text(e, { w: 128, h: 128, size: 92 });
      emoteSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false }));
      emoteSprite.scale.set(0.55, 0.55, 1);
      emoteSprite.renderOrder = 5;
      pivot.add(emoteSprite);
      state.emoteT = 0;
    }

    function setExpression(expr) {
      if (expr === state.expr && state.ready) return;
      state.expr = expr;
      aplicarTextura(expr);
      mostrarEmote(expr);
      state.pulse = 1;
    }

    function update(dt, camera) {
      state.t += dt;
      state.entrada = state.ready ? Math.min(1, (performance.now() - state.readyAt) / (o.fadeMs ?? 450)) : 0;
      state.pulse = Math.max(0, state.pulse - dt * 3);
      const t = state.t;
      const breathe = Math.sin(t * 2.1) * 0.012;
      let dy = 0;
      let sx = 1 + breathe;
      let sy = 1 - breathe * 0.6;
      if (state.speaking) {
        dy = Math.abs(Math.sin(t * 12)) * 0.035;
        sy += Math.abs(Math.sin(t * 12)) * 0.012;
      }
      if (state.expr === 'bravo' && state.speaking) pivot.position.x = Math.sin(t * 50) * 0.015;
      else pivot.position.x = 0;
      const ent = U.easeOutBack(state.entrada);
      pivot.position.y = dy + (1 - ent) * -0.4;
      pivot.scale.set(sx * (0.92 + ent * 0.08) * (1 + state.pulse * 0.04), sy * (0.92 + ent * 0.08) * (1 + state.pulse * 0.06), 1);
      // Billboard só no eixo Y
      if (camera) {
        const camPos = camera.position;
        const wp = group.getWorldPosition(new THREE.Vector3());
        pivot.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) - group.rotation.y;
      }
      const alvo = state.dim ? 0.55 : 1;
      const cur = mat.color.r / Math.max(0.001, state.tint.r);
      const v = U.damp(cur, alvo, 8, dt);
      mat.color.copy(state.tint).multiplyScalar(v);
      mat.opacity = state.entrada;
      if (emoteSprite) {
        state.emoteT += dt;
        const k = Math.min(1, state.emoteT * 4);
        const topo = mesh.position.y + mesh.scale.y / 2;
        emoteSprite.position.set(mesh.scale.x * 0.3, topo - 0.15 + Math.sin(state.emoteT * 5) * 0.04, 0.05);
        const s = 0.55 * U.easeOutBack(k);
        emoteSprite.scale.set(s, s, 1);
        if (state.emoteT > 2.6) emoteSprite.material.opacity = Math.max(0, 1 - (state.emoteT - 2.6) * 2);
      }
    }

    aplicarTextura(state.expr);

    return {
      group,
      char,
      setExpression,
      setSpeaking(v) {
        state.speaking = v;
      },
      setDim(v) {
        state.dim = v;
      },
      setTint(c) {
        state.tint.set(c);
      },
      update,
      get ready() {
        return state.ready;
      },
      get altura() {
        return altura;
      },
      get meioCorpo() {
        return state.meioCorpo;
      },
      dispose() {
        token++;
        mat.dispose();
        mesh.geometry.dispose();
      }
    };
  }

  // =====================================================================
  // RAYCAST
  // =====================================================================
  function createPicker(stage) {
    const THREE = T();
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    return {
      ray,
      pick(evt, objects, recursive = true) {
        const r = stage.domElement.getBoundingClientRect();
        const cx = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const cy = evt.touches ? evt.touches[0].clientY : evt.clientY;
        ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, stage.camera);
        const hits = ray.intersectObjects(objects, recursive);
        return hits[0] || null;
      },
      ndc
    };
  }

  /** Projeta um ponto 3D para coordenadas de tela (px) dentro do canvas do palco. */
  function projectToScreen(stage, v3) {
    const THREE = T();
    const v = v3.clone().project(stage.camera);
    const r = stage.domElement.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
  }

  root.Luiggi3D = {
    hasThree,
    canUseImageTextures,
    perfilQualidade,
    U,
    M,
    textures,
    makeCanvasTex,
    roundRect,
    wrapText,
    shade,
    createStage,
    disposeObject,
    addOutline,
    createParticles,
    box,
    cyl,
    sphere,
    plane,
    blobShadow,
    halo,
    lightCone,
    neonSign,
    createCarMesh,
    createSubaruMesh,
    createCivicMesh,
    addHeadlights,
    createCookieMesh,
    createCupMesh,
    desenharLatte,
    createPhoneMesh,
    createCapybaraMesh,
    createCatMesh,
    createFlagMesh,
    texturaPersonagem,
    createCharacterCard,
    createPicker,
    projectToScreen
  };
})(window);
