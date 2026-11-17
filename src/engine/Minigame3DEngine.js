/**
 * src/engine/Minigame3DEngine.js
 * Fábrica de cenas, iluminação PBR, texturas procedurais e modelos 3D (Three.js WebGL)
 * para todos os minigames do LuiggiBeats.
 */
(function (root) {
  'use strict';

  function hasThree() {
    return typeof root.THREE !== 'undefined';
  }

  function makeCanvasTex(w, h, drawFn, repeatX = 1, repeatY = 1) {
    if (!hasThree()) return null;
    const THREE = root.THREE;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const textures = {
    asphalt(rx = 6, ry = 6) {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = '#181c26';
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 1600; i++) {
            const g = 18 + Math.floor(Math.random() * 28);
            ctx.fillStyle = `rgb(${g},${g + 2},${g + 6})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
          }
          ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
          ctx.fillRect(w / 2 - 4, 18, 8, 88);
          ctx.fillRect(w / 2 - 4, 148, 8, 88);
        },
        rx,
        ry
      );
    },
    parquet() {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          const tones = ['#b46a2c', '#9c5620', '#c47b39', '#8b491a'];
          for (let y = 0; y < h; y += 32) {
            for (let x = 0; x < w; x += 64) {
              ctx.fillStyle = tones[((x / 64 + y / 32) | 0) % tones.length];
              ctx.fillRect(x, y, 63, 31);
              ctx.strokeStyle = 'rgba(55,25,8,0.35)';
              ctx.strokeRect(x, y, 64, 32);
            }
          }
        },
        4,
        4
      );
    },
    cookie(corMassa = '#d69249') {
      return makeCanvasTex(256, 256, (ctx, w, h) => {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
        grad.addColorStop(0, corMassa);
        grad.addColorStop(0.82, '#b46927');
        grad.addColorStop(1, '#7c3f14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 650; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,230,190,0.16)' : 'rgba(70,32,8,0.18)';
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    basketball() {
      return makeCanvasTex(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 500; i++) {
          ctx.fillStyle = 'rgba(0,0,0,0.09)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w * 0.34, h * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    },
    danceFloor() {
      return makeCanvasTex(
        256,
        256,
        (ctx, w, h) => {
          ctx.fillStyle = '#0b1020';
          ctx.fillRect(0, 0, w, h);
          const cols = ['#ec4899', '#38bdf8', '#a855f7', '#1e293b'];
          for (let y = 0; y < h; y += 32) {
            for (let x = 0; x < w; x += 32) {
              ctx.fillStyle = Math.random() > 0.7 ? cols[((x + y) / 32) % cols.length] : '#111827';
              ctx.globalAlpha = 0.42;
              ctx.fillRect(x + 2, y + 2, 28, 28);
            }
          }
          ctx.globalAlpha = 1;
        },
        4,
        4
      );
    }
  };

  function createStage(hostEl, opts = {}) {
    if (!hasThree() || !hostEl) return null;
    const THREE = root.THREE;
    const width = opts.width || hostEl.clientWidth || 740;
    const height = opts.height || hostEl.clientHeight || 420;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opts.alpha, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
    } catch (_e) {
      return null;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1.15;
    }

    hostEl.innerHTML = '';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.borderRadius = opts.radius || '12px';
    hostEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.bg ?? 0x090d1a);
    if (opts.fog) {
      scene.fog = new THREE.FogExp2(opts.fogColor ?? opts.bg ?? 0x090d1a, opts.fog);
    }

    const camera = new THREE.PerspectiveCamera(opts.fov || 52, width / height, 0.1, 350);
    camera.position.set(...(opts.camPos || [0, 5, 10]));
    if (opts.lookAt) camera.lookAt(...opts.lookAt);

    // Iluminação cinematográfica padrão
    const hemi = new THREE.HemisphereLight(opts.skyColor ?? 0x93c5fd, opts.groundColor ?? 0x1e293b, opts.hemiIntensity ?? 0.8);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(opts.keyColor ?? 0xfef3c7, opts.keyIntensity ?? 1.45);
    dir.position.set(12, 22, 14);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    function resize(nw, nh) {
      const w = nw || hostEl.clientWidth || width;
      const h = nh || hostEl.clientHeight || height;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    function dispose() {
      try {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          }
        });
        renderer.dispose();
      } catch (_e) {}
    }

    return { THREE, scene, camera, renderer, dirLight: dir, hemiLight: hemi, resize, dispose, domElement: renderer.domElement };
  }

  function createSubaruMesh(corHex = '#1245A8', neon = false) {
    const THREE = root.THREE;
    const car = new THREE.Group();

    const paint = new THREE.MeshStandardMaterial({
      color: new THREE.Color(corHex),
      metalness: 0.65,
      roughness: 0.24
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.08
    });
    const trim = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

    // Carroceria principal (sedã esportivo)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 4.5), paint);
    body.position.y = 0.52;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Cabine
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.5, 2.25), paint);
    cabin.position.set(0, 0.98, -0.15);
    cabin.castShadow = true;
    car.add(cabin);

    // Vidros escuros (frente, trás, laterais)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.42, 2.3), glass);
    windshield.position.set(0, 0.96, -0.15);
    car.add(windshield);

    // Hood scoop turbo característico do Subaru!
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.55), trim);
    scoop.position.set(0, 0.84, 1.32);
    car.add(scoop);

    // Aerofólio traseiro
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.28), paint);
    wing.position.set(0, 0.96, -2.05);
    car.add(wing);

    // Faróis e lanternas emissivas
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 2.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.8 });
    [-0.72, 0.72].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.1), headMat);
      hl.position.set(x, 0.54, 2.24);
      car.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.1), tailMat);
      tl.position.set(x, 0.56, -2.24);
      car.add(tl);
    });

    // 4 rodas 3D
    const wheels = [];
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12);
    rimGeo.rotateZ(Math.PI / 2);
    [
      [-1.02, 0.36, 1.42],
      [1.02, 0.36, 1.42],
      [-1.02, 0.36, -1.42],
      [1.02, 0.36, -1.42]
    ].forEach(([x, y, z]) => {
      const wg = new THREE.Group();
      wg.add(new THREE.Mesh(tireGeo, trim));
      wg.add(new THREE.Mesh(rimGeo, rimMat));
      wg.position.set(x, y, z);
      car.add(wg);
      wheels.push(wg);
    });

    if (neon) {
      const ug = new THREE.PointLight(0x38bdf8, 1.6, 5);
      ug.position.set(0, 0.2, 0);
      car.add(ug);
    }

    car.userData.wheels = wheels;
    return car;
  }

  function createCookieMesh(corMassa = '#d69249', corGotas = '#3b1f10') {
    const THREE = root.THREE;
    const grp = new THREE.Group();
    const tex = textures.cookie(corMassa);
    const doughMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.04 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.82, 0.42, 36), doughMat);
    disc.castShadow = true;
    disc.receiveShadow = true;
    grp.add(disc);

    // Borda crocante levemente irregular
    const chipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(corGotas), roughness: 0.38, metalness: 0.08 });
    const chipOffsets = [
      [-0.75, 0.22, -0.55],
      [0.65, 0.23, -0.62],
      [0.05, 0.24, 0.08],
      [-0.58, 0.22, 0.72],
      [0.82, 0.22, 0.55],
      [-0.12, 0.23, -0.95],
      [-1.05, 0.21, 0.15],
      [0.35, 0.23, 0.96]
    ];
    chipOffsets.forEach(([x, y, z], idx) => {
      const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (idx % 3) * 0.04, 1), chipMat);
      chip.position.set(x, y, z);
      chip.scale.set(1.1, 0.65, 1.1);
      grp.add(chip);
    });
    return grp;
  }

  function createCupMesh(artType = 'coracao') {
    const THREE = root.THREE;
    const grp = new THREE.Group();
    const ceramic = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.05 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

    // Pires de madeira
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.45, 0.16, 32), wood);
    saucer.position.y = -0.78;
    grp.add(saucer);

    // Xícara cerâmica
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.88, 1.35, 32), ceramic);
    cup.castShadow = true;
    grp.add(cup);

    // Alça
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 12, 24, Math.PI), ceramic);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(1.18, 0.05, 0);
    grp.add(handle);

    // Superfície de café com Latte Art procedural
    const foamTex = makeCanvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#a16207');
      g.addColorStop(1, '#6b3410');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#fef3c7';
      if (artType === 'coracao') {
        ctx.beginPath();
        ctx.arc(104, 108, 28, 0, Math.PI * 2);
        ctx.arc(152, 108, 28, 0, Math.PI * 2);
        ctx.moveTo(80, 118);
        ctx.lineTo(128, 184);
        ctx.lineTo(176, 118);
        ctx.fill();
      } else if (artType === 'subaru') {
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(128, 128, 66, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ ★', 128, 140);
      } else if (artType === 'felps') {
        ctx.font = 'bold 46px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FELPS!', 128, 142);
      } else {
        ctx.beginPath();
        ctx.arc(128, 128, 54, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(110, 120, 6, 0, Math.PI * 2);
        ctx.arc(146, 120, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const foam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 1.16, 0.06, 32),
      new THREE.MeshStandardMaterial({ map: foamTex, roughness: 0.45 })
    );
    foam.position.y = 0.66;
    grp.add(foam);
    return grp;
  }

  root.Luiggi3D = {
    hasThree,
    textures,
    createStage,
    createSubaruMesh,
    createCookieMesh,
    createCupMesh
  };
})(window);
