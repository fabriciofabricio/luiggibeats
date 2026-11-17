/**
 * src/minigames/DrivingEngine.js
 * Motor de Direção 3D (Three.js WebGL com câmera chase em terceira pessoa + fallback 2D).
 * Modos: madrugada (cap. 6), curitiba (cap. 10), racha (cap. 10 / revanche), amanhecer (cap. 15), livre (Museu).
 */
(function (root) {
  'use strict';

  const WORLD_SCALE = 0.08;

  function abrirDirecao(modo = 'livre') {
    return new Promise((resolve) => {
      const host = document.getElementById('minigame-overlay');
      const save = root.LuiggiSave;
      const mapa = root.LuiggiData?.cache?.mapa_curitiba || {};
      const musicas = root.LuiggiData?.cache?.musicas?.faixas || [];
      const mods = save?.state?.subaruMods || {};

      host.classList.remove('hidden');
      host.innerHTML = `
        <div class="mg-modal drive-theme">
          <div class="mg-header">
            <div>
              <h3>🚙 Subaru Legacy 3D: ${modo === 'racha'
          ? 'Racha x Civic da Emily'
          : modo === 'madrugada'
            ? 'Centro 3h da Manhã'
            : modo === 'amanhecer'
              ? 'Amanhecer em Curitiba'
              : modo === 'curitiba'
                ? 'Bacacheri → Centro'
                : 'Direção Livre'
        }</h3>
              <div class="mg-sub" id="drv-gps">GPS: "Siga em frente rumo ao marcador amarelo, Tico."</div>
            </div>
            <div class="btn-row">
              <span class="badge-pill" id="drv-hud">0 km/h · Dano: 0%</span>
              <button class="mini-btn" id="drv-exit">Encerrar</button>
            </div>
          </div>
          <div class="drive-wrap">
            <div id="drv-viewport" style="width:100%;max-width:780px;height:430px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #334155;background:#070b14;"></div>
            <div class="drive-controls-hint">
              WASD/Setas: Dirigir · ESPAÇO: Drift · SHIFT: Nitro · H: Buzinar · R: Rádio (<span id="drv-radio">Rádio LuiggiBeats</span>)
            </div>
            <div class="touch-pad">
              <button id="tc-left">◀</button>
              <button id="tc-up">▲</button>
              <button id="tc-down">▼</button>
              <button id="tc-right">▶</button>
              <button id="tc-drift">DRIFT</button>
              <button id="tc-nitro">NITRO</button>
              <button id="tc-horn">📯</button>
            </div>
          </div>
        </div>
      `;

      const viewport = document.getElementById('drv-viewport');
      const gpsEl = document.getElementById('drv-gps');
      const hudEl = document.getElementById('drv-hud');
      const radioEl = document.getElementById('drv-radio');

      const keys = {};
      let weatherIdx = modo === 'madrugada' ? 2 : 0;
      const weathers = ['sol', 'chuva', 'neblina'];
      const seenWeathers = new Set([weathers[weatherIdx]]);
      let radioIdx = 0;

      const car = {
        x: 240,
        y: 260,
        angle: 0,
        speed: 0,
        maxSpeed: 5.5 + (mods.motorBoost || 0) * 0.45,
        grip: 0.96 + (mods.gripBoost || 0) * 0.01,
        nitro: 100,
        damage: 0,
        turbos: 0,
        radars: 0
      };

      const civic = { x: 240, y: 305, angle: 0, speed: 0, wpIdx: 0, fala: 'Vai, Tico! 💨' };

      const checkpoints =
        modo === 'racha'
          ? [
            { x: 640, y: 260, nome: 'Reta da Avenida' },
            { x: 1180, y: 420, nome: 'Teatro Guaíra' },
            { x: 1360, y: 760, nome: 'Praça Tiradentes' },
            { x: 900, y: 980, nome: 'Prudente de Moraes (CHEGADA!)' }
          ]
          : modo === 'curitiba'
            ? [
              { x: 240, y: 260, nome: 'Casa do Fabricio (Buzine [H]!)' },
              { x: 920, y: 540, nome: 'Estação-Tubo Central' },
              { x: 1620, y: 860, nome: 'Emily Doces (CHEGADA!)' }
            ]
            : [
              { x: 860, y: 540, nome: 'Centro de Curitiba' },
              { x: 1360, y: 760, nome: 'Praça Tiradentes (CHEGADA!)' }
            ];

      let cpIdx = 0;
      let bacacheriWait = modo === 'curitiba';
      let hornCountAtHouse = 0;
      let ended = false;
      let rafId = null;

      const capivaras =
        modo === 'amanhecer'
          ? []
          : Array.from({ length: 7 }, (_, i) => ({
            x: 420 + i * 190,
            y: 260 + ((i * 137) % 680),
            desviada: false
          }));

      const radares =
        modo === 'amanhecer'
          ? []
          : [
            { x: 680, y: 340, lim: 4.3, cd: 0 },
            { x: 1100, y: 600, lim: 4.3, cd: 0 }
          ];

      const biarticulados =
        modo === 'amanhecer' || modo === 'madrugada'
          ? []
          : [
            { x: 760, y: 520, vx: 1.4, w: 96, h: 30 },
            { x: 1200, y: 720, vx: -1.4, w: 96, h: 30 }
          ];

      const turboOrbs = Array.from({ length: 8 }, (_, i) => ({
        x: 360 + i * 170,
        y: 230 + ((i * 193) % 720),
        got: false
      }));

      // ==================== CENA 3D THREE.JS ====================
      const stage3D =
        root.Luiggi3D &&
        root.Luiggi3D.createStage(viewport, {
          bg: modo === 'madrugada' ? 0x050814 : modo === 'amanhecer' ? 0x2c1b30 : 0x0d1729,
          fog: 0.012,
          fov: 58,
          preserveDrawingBuffer: true,
          keyIntensity: modo === 'amanhecer' ? 1.7 : 1.3
        });

      let fallbackCanvas = null;
      let fallbackCtx = null;

      const sceneObjs = {
        subaru: null,
        civic: null,
        buses: [],
        capis: [],
        orbs: [],
        radars: [],
        beacon: null,
        rain: null
      };

      if (stage3D) {
        const { THREE, scene } = stage3D;
        // Chão urbano + ruas em asfalto 3D
        const cityFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(240, 180),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92 })
        );
        cityFloor.rotation.x = -Math.PI / 2;
        cityFloor.receiveShadow = true;
        cityFloor.position.set(75, -0.02, 48);
        scene.add(cityFloor);

        const roadTex = root.Luiggi3D.textures.asphalt(1, 14);
        const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.65, metalness: 0.1 });
        for (let x = 100; x <= 1700; x += 320) {
          const ave = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.04, 90), roadMat);
          ave.position.set(x * WORLD_SCALE + 3, 0, 48);
          ave.receiveShadow = true;
          scene.add(ave);
        }
        const roadTexH = root.Luiggi3D.textures.asphalt(18, 1);
        const roadMatH = new THREE.MeshStandardMaterial({ map: roadTexH, roughness: 0.65 });
        for (let y = 180; y <= 1050; y += 260) {
          const st = new THREE.Mesh(new THREE.BoxGeometry(142, 0.05, 5.8), roadMatH);
          st.position.set(75, 0.01, y * WORLD_SCALE + 2.4);
          st.receiveShadow = true;
          scene.add(st);
        }

        // Marcos / prédios 3D de Curitiba
        for (const m of mapa.marcos || []) {
          const bh = 6 + ((m.x % 7) + 2);
          const bld = new THREE.Mesh(
            new THREE.BoxGeometry(6.5, bh, 5.2),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(m.cor || '#475569'),
              roughness: 0.55,
              metalness: 0.25,
              emissive: new THREE.Color(m.cor || '#1e293b'),
              emissiveIntensity: 0.18
            })
          );
          bld.position.set(m.x * WORLD_SCALE, bh / 2, m.y * WORLD_SCALE);
          bld.castShadow = true;
          scene.add(bld);
        }

        // Prédios decorativos entre quadras para cidade parecer viva
        const winMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 });
        const glowWin = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.8 });
        for (let gx = 240; gx <= 1560; gx += 320) {
          for (let gy = 300; gy <= 840; gy += 260) {
            const h = 4 + ((gx + gy) % 9);
            const blk = new THREE.Mesh(new THREE.BoxGeometry(11, h, 9), winMat);
            blk.position.set(gx * WORLD_SCALE, h / 2, gy * WORLD_SCALE);
            blk.castShadow = true;
            scene.add(blk);
            const band = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.45, 9.1), glowWin);
            band.position.set(gx * WORLD_SCALE, h * 0.65, gy * WORLD_SCALE);
            scene.add(band);
          }
        }

        // Subaru 3D do Luis + holofote real
        sceneObjs.subaru = root.Luiggi3D.createSubaruMesh(mods.cor || '#1245A8', !!mods.neon);
        const headlight = new THREE.SpotLight(0xfef9c3, 4.5, 42, Math.PI / 5.5, 0.45, 1.2);
        headlight.position.set(0, 1.2, 2.1);
        const hTarget = new THREE.Object3D();
        hTarget.position.set(0, 0, 14);
        sceneObjs.subaru.add(headlight, hTarget);
        headlight.target = hTarget;
        scene.add(sceneObjs.subaru);

        if (modo === 'racha') {
          sceneObjs.civic = root.Luiggi3D.createSubaruMesh('#ECEEF2', true);
          scene.add(sceneObjs.civic);
        }

        // Biarticulados 3D
        const busMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.3 });
        biarticulados.forEach(() => {
          const bm = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.2, 2.4), busMat);
          bm.castShadow = true;
          scene.add(bm);
          sceneObjs.buses.push(bm);
        });

        // Capivaras 3D fofas
        const capMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
        capivaras.forEach((c) => {
          const grp = new THREE.Group();
          const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), capMat);
          torso.scale.set(1.35, 0.85, 0.85);
          torso.position.y = 0.5;
          grp.add(torso);
          grp.position.set(c.x * WORLD_SCALE, 0, c.y * WORLD_SCALE);
          scene.add(grp);
          sceneObjs.capis.push(grp);
        });

        // Orbs de Turbo 3D
        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 1.6,
          metalness: 0.7,
          roughness: 0.15
        });
        turboOrbs.forEach((o) => {
          const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), orbMat);
          mesh.position.set(o.x * WORLD_SCALE, 1.0, o.y * WORLD_SCALE);
          scene.add(mesh);
          sceneObjs.orbs.push(mesh);
        });

        // Radares 3D
        radares.forEach((r) => {
          const g = new THREE.Group();
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.8, 8), new THREE.MeshStandardMaterial({ color: 0x64748b }));
          pole.position.y = 1.9;
          const camBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.6, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6 })
          );
          camBox.position.y = 3.8;
          g.add(pole, camBox);
          g.position.set(r.x * WORLD_SCALE, 0, r.y * WORLD_SCALE);
          scene.add(g);
          sceneObjs.radars.push(camBox);
        });

        // Pilar de luz dourada no checkpoint alvo
        const beaconGeo = new THREE.CylinderGeometry(1.8, 1.8, 16, 20, 1, true);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.38, side: THREE.DoubleSide });
        sceneObjs.beacon = new THREE.Mesh(beaconGeo, beaconMat);
        scene.add(sceneObjs.beacon);

        // Partículas de chuva 3D
        const rainGeo = new THREE.BufferGeometry();
        const rainPos = new Float32Array(900 * 3);
        for (let i = 0; i < 900; i++) {
          rainPos[i * 3] = Math.random() * 160;
          rainPos[i * 3 + 1] = Math.random() * 24;
          rainPos[i * 3 + 2] = Math.random() * 110;
        }
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        sceneObjs.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.18, transparent: true, opacity: 0.65 }));
        sceneObjs.rain.visible = weathers[weatherIdx] === 'chuva';
        scene.add(sceneObjs.rain);
      } else {
        fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 760;
        fallbackCanvas.height = 430;
        fallbackCanvas.style.width = '100%';
        fallbackCanvas.style.height = '100%';
        viewport.appendChild(fallbackCanvas);
        fallbackCtx = fallbackCanvas.getContext('2d');
      }

      function falarGPS(msg) {
        if (gpsEl) gpsEl.textContent = `GPS: "${msg}"`;
      }

      function buzinar() {
        if (root.LuiggiAudio) root.LuiggiAudio.playSFX('buzina');
        if (bacacheriWait) {
          hornCountAtHouse++;
          if (save) save.incrementarContador('buzinasBacacheri', 1);
          if (hornCountAtHouse === 1) falarGPS('Fabricio: "tô descendo"');
          else if (hornCountAtHouse === 2) falarGPS('Fabricio: "TÔ DESCENDO!!"');
          else if (hornCountAtHouse >= 3) {
            bacacheriWait = false;
            cpIdx = 1;
            falarGPS('Fabricio entrou no Subaru! Bora pro Emily Doces!');
            if (root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('motorista_aplicativo');
          }
          if (hornCountAtHouse >= 10 && root.LuiggiAchievements) {
            root.LuiggiAchievements.desbloquear('to_descendo');
          }
        }
      }

      function trocarRadio() {
        if (!musicas.length) return;
        radioIdx = (radioIdx + 1) % musicas.length;
        const m = musicas[radioIdx];
        if (radioEl) radioEl.textContent = m.titulo;
        root.LuiggiAudio.tocarEstiloSintetizado(m.ehMusicaDoTiago ? 'tiago' : 'trap', m.bpm || 132);
      }

      function onKeyDown(e) {
        keys[e.code] = true;
        if (e.code === 'KeyH') buzinar();
        if (e.code === 'KeyR') trocarRadio();
      }
      function onKeyUp(e) {
        keys[e.code] = false;
      }
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      const bindTouch = (id, code) => {
        const b = document.getElementById(id);
        if (!b) return;
        b.addEventListener('pointerdown', () => (keys[code] = true));
        b.addEventListener('pointerup', () => (keys[code] = false));
        b.addEventListener('pointerleave', () => (keys[code] = false));
      };
      bindTouch('tc-left', 'ArrowLeft');
      bindTouch('tc-right', 'ArrowRight');
      bindTouch('tc-up', 'ArrowUp');
      bindTouch('tc-down', 'ArrowDown');
      bindTouch('tc-drift', 'Space');
      bindTouch('tc-nitro', 'ShiftLeft');
      document.getElementById('tc-horn').addEventListener('click', buzinar);

      let frame = 0;

      function cleanup() {
        ended = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        if (stage3D) stage3D.dispose();
        root.LuiggiAudio.pararMusica();
      }

      document.getElementById('drv-exit').addEventListener('click', () => {
        cleanup();
        encerrar(true);
      });

      function loop() {
        if (ended) return;
        frame++;

        if (modo !== 'amanhecer' && modo !== 'madrugada' && frame % 540 === 0) {
          weatherIdx = (weatherIdx + 1) % weathers.length;
          seenWeathers.add(weathers[weatherIdx]);
          falarGPS('Curitiba: 4 estações em 1 dia!');
          if (seenWeathers.size >= 3 && root.LuiggiAchievements) {
            root.LuiggiAchievements.desbloquear('quatro_estacoes');
          }
        }

        const up = keys['ArrowUp'] || keys['KeyW'];
        const down = keys['ArrowDown'] || keys['KeyS'];
        const left = keys['ArrowLeft'] || keys['KeyA'];
        const right = keys['ArrowRight'] || keys['KeyD'];
        const drift = keys['Space'];
        const nitroOn = (keys['ShiftLeft'] || keys['ShiftRight']) && car.nitro > 0;

        if (!bacacheriWait) {
          if (up) car.speed += nitroOn ? 0.28 : 0.16;
          if (down) car.speed -= 0.14;
          if (nitroOn && up) {
            car.nitro = Math.max(0, car.nitro - 1.1);
            if (frame % 25 === 0) {
              root.LuiggiAudio.playSFX('boxer');
              if (save) save.incrementarContador('nitrosUsados', 1);
            }
          } else {
            car.nitro = Math.min(100, car.nitro + 0.25);
          }

          const top = nitroOn ? car.maxSpeed + 2.2 : car.maxSpeed;
          car.speed = Math.max(-2.2, Math.min(top, car.speed * (weathers[weatherIdx] === 'chuva' ? 0.985 : car.grip)));

          const turnRate = (drift ? 0.075 : 0.048) * (car.speed >= 0 ? 1 : -1);
          if (Math.abs(car.speed) > 0.2) {
            if (left) car.angle -= turnRate;
            if (right) car.angle += turnRate;
          }

          car.x = Math.max(60, Math.min(1840, car.x + Math.cos(car.angle) * car.speed));
          car.y = Math.max(60, Math.min(1140, car.y + Math.sin(car.angle) * car.speed));
        }

        if (modo === 'racha') {
          const target = checkpoints[civic.wpIdx];
          if (target) {
            const dx = target.x - civic.x;
            const dy = target.y - civic.y;
            const desired = Math.atan2(dy, dx);
            civic.angle += Math.sin(desired - civic.angle) * 0.12;
            civic.speed = 5.15;
            civic.x += Math.cos(civic.angle) * civic.speed;
            civic.y += Math.sin(civic.angle) * civic.speed;
            if (Math.hypot(dx, dy) < 55) {
              civic.wpIdx++;
              if (civic.wpIdx >= checkpoints.length) {
                cleanup();
                encerrar(false, false);
                return;
              }
            }
          }
          if (frame % 180 === 0) {
            const falas = ['Vai, Tico!', 'Lé e Cré, cadê vocês?', 'Esse boxer só faz barulho?'];
            civic.fala = falas[Math.floor(Math.random() * falas.length)];
          }
        }

        for (let i = 0; i < biarticulados.length; i++) {
          const b = biarticulados[i];
          b.x += b.vx;
          if (b.x > 1650 || b.x < 300) b.vx *= -1;
          if (Math.abs(car.x - b.x) < b.w / 2 + 16 && Math.abs(car.y - b.y) < b.h / 2 + 12) {
            car.speed *= -0.4;
            car.damage = Math.min(100, car.damage + 12);
            falarGPS('Cada arranhão dói na alma do Luis.');
          }
        }

        for (const cap of capivaras) {
          const d = Math.hypot(car.x - cap.x, car.y - cap.y);
          if (d < 90 && !cap.desviada) {
            cap.desviada = true;
            cap.y += car.y < cap.y ? 45 : -45;
            if (save) save.incrementarContador('capivarasDesviadas', 1);
          }
        }

        for (let i = 0; i < turboOrbs.length; i++) {
          const o = turboOrbs[i];
          if (!o.got && Math.hypot(car.x - o.x, car.y - o.y) < 36) {
            o.got = true;
            car.turbos++;
            car.nitro = Math.min(100, car.nitro + 35);
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('blip');
          }
        }

        for (let i = 0; i < radares.length; i++) {
          const r = radares[i];
          if (r.cd > 0) r.cd--;
          if (r.cd === 0 && Math.hypot(car.x - r.x, car.y - r.y) < 52 && Math.abs(car.speed) > r.lim) {
            r.cd = 180;
            car.radars++;
            if (root.LuiggiAudio) root.LuiggiAudio.playSFX('radar');
            if (save) {
              const snapEl = stage3D ? stage3D.domElement : fallbackCanvas;
              save.incrementarContador('radaresPegos', 1);
              save.state.radarFotos.push({
                titulo: `Multa #${save.state.radarFotos.length + 1}`,
                velocidade: `${Math.round(Math.abs(car.speed) * 22)} km/h`,
                dataUrl: snapEl ? snapEl.toDataURL('image/png') : ''
              });
              save.salvar();
            }
            falarGPS('FLASH! Sorria, foto enviada pro Museu!');
          }
        }

        const alvo = checkpoints[cpIdx];
        if (alvo && Math.hypot(car.x - alvo.x, car.y - alvo.y) < 62 && !bacacheriWait) {
          cpIdx++;
          if (cpIdx >= checkpoints.length && modo !== 'livre') {
            cleanup();
            encerrar(false, true);
            return;
          }
        }

        // ==================== ATUALIZA CENA 3D ====================
        if (stage3D) {
          const { THREE, scene, camera, renderer } = stage3D;
          const sx = car.x * WORLD_SCALE;
          const sz = car.y * WORLD_SCALE;
          const yaw = -car.angle + Math.PI / 2;

          sceneObjs.subaru.position.set(sx, 0, sz);
          sceneObjs.subaru.rotation.y = yaw;
          sceneObjs.subaru.rotation.z = (left ? 0.05 : right ? -0.05 : 0) * (drift ? 1.8 : 1);
          sceneObjs.subaru.userData.wheels.forEach((w) => (w.rotation.x += car.speed * 0.22));

          // Câmera chase cinematográfica atrás do Subaru
          const camDist = 9.5 + Math.abs(car.speed) * 0.35;
          const targetCamX = sx - Math.cos(car.angle) * camDist;
          const targetCamZ = sz - Math.sin(car.angle) * camDist;
          camera.position.lerp(new THREE.Vector3(targetCamX, 4.3, targetCamZ), 0.14);
          camera.lookAt(sx + Math.cos(car.angle) * 6, 0.9, sz + Math.sin(car.angle) * 6);
          camera.fov = 56 + Math.abs(car.speed) * 1.8;
          camera.updateProjectionMatrix();

          if (sceneObjs.civic) {
            sceneObjs.civic.position.set(civic.x * WORLD_SCALE, 0, civic.y * WORLD_SCALE);
            sceneObjs.civic.rotation.y = -civic.angle + Math.PI / 2;
            sceneObjs.civic.userData.wheels.forEach((w) => (w.rotation.x += civic.speed * 0.22));
          }

          biarticulados.forEach((b, i) => {
            if (sceneObjs.buses[i]) sceneObjs.buses[i].position.set(b.x * WORLD_SCALE, 1.1, b.y * WORLD_SCALE);
          });
          capivaras.forEach((c, i) => {
            if (sceneObjs.capis[i]) sceneObjs.capis[i].position.set(c.x * WORLD_SCALE, 0, c.y * WORLD_SCALE);
          });
          turboOrbs.forEach((o, i) => {
            const m = sceneObjs.orbs[i];
            if (m) {
              m.visible = !o.got;
              m.rotation.y += 0.05;
              m.position.y = 1.0 + Math.sin(frame * 0.08 + i) * 0.25;
            }
          });
          radares.forEach((r, i) => {
            if (sceneObjs.radars[i]) {
              sceneObjs.radars[i].material.emissive.setHex(r.cd > 165 ? 0xffffff : 0xf59e0b);
            }
          });
          if (sceneObjs.beacon) {
            sceneObjs.beacon.visible = !!alvo && modo !== 'livre';
            if (alvo) {
              sceneObjs.beacon.position.set(alvo.x * WORLD_SCALE, 8, alvo.y * WORLD_SCALE);
              sceneObjs.beacon.rotation.y += 0.04;
            }
          }

          scene.fog.density = weathers[weatherIdx] === 'neblina' ? 0.032 : 0.011;
          sceneObjs.rain.visible = weathers[weatherIdx] === 'chuva';
          if (sceneObjs.rain.visible) {
            const pos = sceneObjs.rain.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) {
              pos[i] -= 0.45;
              if (pos[i] < 0) pos[i] = 22;
            }
            sceneObjs.rain.geometry.attributes.position.needsUpdate = true;
          }

          renderer.render(scene, camera);
        } else if (fallbackCtx) {
          fallbackCtx.fillStyle = '#0b1222';
          fallbackCtx.fillRect(0, 0, 760, 430);
          fallbackCtx.fillStyle = '#38bdf8';
          fallbackCtx.fillRect(360, 200, 40, 22);
        }

        hudEl.textContent = `${Math.round(Math.abs(car.speed) * 22)} km/h · Nitro: ${Math.round(car.nitro)}% · Clima: ${weathers[weatherIdx]} · Dano: ${car.damage}% · ⚡ ${car.turbos}`;
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);

      function encerrar(abortou, venceu) {
        if (!abortou) {
          if (car.radars === 0 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('cidadao_exemplar');
          if (car.damage === 0 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('sem_arranhao');
          if (modo === 'racha' && root.LuiggiAchievements) {
            root.LuiggiAchievements.desbloquear(venceu ? 'rei_do_racha' : 'ela_tem_turbo');
          }
          if (save) {
            save.salvarRecordeMinigame(`direcao_${modo}`, Math.max(0, 1000 - car.damage * 10 + car.turbos * 60));
          }
        }
        host.innerHTML = `
          <div class="mg-modal drive-theme" style="max-width:460px;text-align:center;">
            <div class="mg-header"><h3>🏁 ${modo === 'racha' ? (venceu ? 'SUBARU VENCEU!' : 'ELA TEM TURBO!') : 'Trajeto Concluído'}</h3></div>
            <div class="mg-body">
              <p>${modo === 'racha'
            ? venceu
              ? 'Emily sai do Civic rindo: "Tá, Tico, essa foi sua!"'
              : 'O Civic passa estalando o escapamento: "TCHAU, LÉ E CRÉ!"'
            : 'Você sobreviveu ao trânsito de Curitiba!'
          }</p>
              <p>Dano ao Subaru: <strong>${car.damage}%</strong> · Radares: <strong>${car.radars}</strong> · Turbos: <strong>${car.turbos}</strong></p>
              <div class="mg-actions">
                ${modo === 'racha' ? `<button class="mg-btn" id="drv-revanche">↻ Revanche</button>` : ''}
                <button class="mg-btn primary" id="drv-ok">Continuar</button>
              </div>
            </div>
          </div>
        `;
        const rev = document.getElementById('drv-revanche');
        if (rev) rev.addEventListener('click', () => abrirDirecao('racha').then(resolve));
        document.getElementById('drv-ok').addEventListener('click', () => {
          host.classList.add('hidden');
          host.innerHTML = '';
          resolve({ venceu, damage: car.damage, turbos: car.turbos });
        });
      }
    });
  }

  root.LuiggiDriving = { abrirDirecao };
})(window);
