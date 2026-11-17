/**
 * src/minigames/quick/Capitulos5a8.js
 * Minigames 3D: Conversa com a Luiza, Conversa por Mensagem, Papo de Fim de Noite, Garagem (mods do Subaru),
 * Segurando Vela, Praça de Alimentação, Grito no Bar, Name Drop da Pietra, Onde Está a Ruiva?
 * Textos, opções, pontuação e conquistas idênticos às versões originais.
 */
(function (root) {
  'use strict';

  const Q = () => root.LuiggiQuickMinigames;
  const L = () => root.Luiggi3D;
  const U = () => root.Luiggi3D.U;

  function escolhas(kit, opcoes, onPick) {
    const box = document.createElement('div');
    box.className = 'mgk-choices';
    box.innerHTML = opcoes.map((o, i) => `<button class="mgk-choice" style="animation-delay:${i * 0.07}s" data-i="${i}"><b>${i + 1}</b>${o}</button>`).join('');
    kit.layer.appendChild(box);
    let feito = false;
    const pick = (i) => {
      if (feito) return;
      feito = true;
      box.remove();
      window.removeEventListener('keydown', onK);
      onPick(i);
    };
    const onK = (e) => {
      if (['1', '2', '3'].includes(e.key) && Number(e.key) <= opcoes.length) pick(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onK);
    box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    return box;
  }

  function bolha(kit, quem, texto, x = 52, y = 14) {
    kit.layer.querySelectorAll('.mgk-bubble').forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'mgk-bubble';
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.innerHTML = `<span class="quem">${quem}</span>${texto}`;
    kit.layer.appendChild(b);
    return b;
  }

  // ======================================================================
  // 1. CONVERSAS COM BARRA DE QUÍMICA (Caps. 5, 7, 8 e Garagem do Cap. 10)
  // ======================================================================
  const CONFIGS = {
    conversa_luiza: {
      titulo: '🇩🇪 Conversa com a Luiza',
      icone: '🇩🇪',
      cap: 5,
      cor: '#e7928b',
      ambiente: 'bec_bar',
      quem: 'luiza',
      perguntas: [
        { q: 'Escolha um assunto:', op: ['Falar de música', 'Falar de política', 'Perguntar da viagem pra Alemanha'], re: ['Silêncio...', 'Ela fala 20 min e você concorda.', 'Os olhos dela brilham! Alemanha!'] },
        { q: 'Ela mostrou fotos de viagem:', op: ['Elogiar as paisagens', 'Mostrar foto do Subaru', 'Perguntar da cerveja alemã'], re: ['+Química!', 'Ela riu por educação.', 'Mais 30 minutos de geografia!'] }
      ]
    },
    conversa_mensagem: {
      titulo: '💬 Conversa por Mensagem (Luiza)',
      icone: '💬',
      cap: 7,
      cor: '#22c55e',
      ambiente: 'apartamento',
      quem: 'luiza',
      celular: true,
      perguntas: [
        { q: 'Ela mandou: "chegou bem? 🙂"', op: ['Responder em 0.2s (ansioso)', 'Esperar 2 minutos e mandar 🙂', 'Visualizar e responder só amanhã'], re: ['Ansioso demais kkk', 'Timing perfeito!', 'Frio demais!'] },
        { q: 'Ela perguntou o que vai fazer no fds:', op: ['"Bora almoçar no shopping?"', '"Bora num restaurante chique?"', '"Vou assar 47 cookies"'], re: ['Sempre o shopping!', 'Caro demais!', 'Ela achou fofo!'] }
      ]
    },
    papo_fim_noite: {
      titulo: '✨ Papo com a Ruiva Misteriosa',
      icone: '✨',
      cap: 8,
      cor: '#0f766e',
      ambiente: 'sad_baile',
      quem: 'ruiva_misteriosa',
      perguntas: [{ q: 'As luzes da pista estão piscando:', op: ['Pagar uma bebida', 'Dançar junto no ritmo', 'Contar que o Fabricio sumiu'], re: ['Ela sorriu!', 'A química subiu muito!', 'Ela riu e chegou mais perto!'] }]
    },
    garagem_emily: {
      titulo: '🔧 Garagem: Mods do Subaru',
      icone: '🔧',
      cap: 10,
      cor: '#38bdf8',
      ambiente: 'garagem',
      quem: 'emily',
      garagem: true,
      perguntas: [
        { q: 'Primeira mod do Subaru pro racha?', op: ['Turbo maior (+velocidade)', 'Rebaixar (+grip)', 'Escapamento direto (barulho!)'], re: ['Emily: "Aí sim, Tico!"', 'Emily: "Ficou baixo hein!"', 'Emily: "Só não acorda o bairro!"'] },
        { q: 'Opinião sobre o Civic branco dela?', op: ['"Muito bonito"', '"Subaru é melhor"', '"Esse neon é sério?"'], re: ['Emily: "Boa resposta!"', 'Emily: "Então prova no racha!"', 'Emily: "No racha você vai ver ele no retrovisor!"'] }
      ]
    }
  };

  function conversa(id) {
    const cfg = CONFIGS[id];
    const kit = root.LuiggiKit.abrir({ id, titulo: cfg.titulo.replace(/^\S+\s/, ''), icone: cfg.icone, capitulo: cfg.cap, cor: cfg.cor, ambiente: cfg.ambiente, max: 1000 });
    const { stage, env, THREE } = kit;
    const save = root.LuiggiSave;
    let quimica = 50;
    let step = 0;
    const coracoes = kit.particulas({ count: 80, size: 0.22, shape: 'heart', colors: ['#f472b6', '#fb7185', '#f9a8d4'], intensity: 1.8, gravity: -0.6, life: [1, 1.8], drag: 1 });
    let pessoa = null;
    let fone = null;
    let sub = null;
    let civic = null;
    const chat = [];

    if (cfg.celular) {
      stage.camera.position.set(0, 1.6, 2.3);
      stage.camera.lookAt(0, 1.45, 0);
      fone = L().createPhoneMesh((ctx, w, h) => {
        ctx.fillStyle = '#0b141a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1f2c34';
        ctx.fillRect(0, 0, w, 120);
        ctx.fillStyle = '#e9edef';
        ctx.font = 'bold 34px "Segoe UI", sans-serif';
        ctx.fillText('Luiza 🇩🇪', 110, 66);
        ctx.fillStyle = '#d4605c';
        ctx.beginPath();
        ctx.arc(60, 64, 34, 0, Math.PI * 2);
        ctx.fill();
        let y = 160;
        ctx.font = '27px "Segoe UI", sans-serif';
        chat.slice(-8).forEach((m) => {
          const tw = Math.min(w - 110, ctx.measureText(m.txt).width + 40);
          const x = m.de === 'ela' ? 24 : w - 24 - tw;
          ctx.fillStyle = m.de === 'ela' ? '#202c33' : '#005c4b';
          L().roundRect(ctx, x, y, tw, 60, 16);
          ctx.fill();
          ctx.fillStyle = '#e9edef';
          ctx.fillText(m.txt.slice(0, 34), x + 20, y + 40);
          y += 78;
        });
      });
      fone.position.set(-0.35, 1.45, 0.2);
      fone.scale.setScalar(0.62);
      stage.scene.add(fone);
      pessoa = kit.carta(cfg.quem, [1.3, 0.1, -0.9], { altura: 2.0 });
    } else if (cfg.garagem) {
      stage.camera.position.set(0, 2.2, 7.4);
      stage.camera.lookAt(0, 0.9, 0);
      sub = L().createSubaruMesh(save.state.subaruMods.cor || '#1245A8', !!save.state.subaruMods.neon);
      stage.scene.add(sub);
      pessoa = kit.carta(cfg.quem, [3.4, 0, 1.2], { altura: 2.4 });
    } else {
      stage.camera.position.set(0.3, 1.85, 4.2);
      stage.camera.lookAt(0.6, 1.55, 0);
      pessoa = kit.carta(cfg.quem, [0.9, env.slots.R[1], env.slots.R[2]], { altura: 2.5 });
    }
    const chamas = kit.particulas({ count: 120, size: 0.25, shape: 'smoke', colors: ['#f97316', '#fbbf24', '#ef4444'], intensity: 2.2, life: [0.25, 0.5], drag: 2 });

    function hud() {
      kit.hud(kit.pill(`💖 Química: ${quimica}%`));
      kit.medidor('quimica', 'Química', quimica / 100, { cor: '#ec4899' });
    }
    hud();

    function proxima() {
      if (step >= cfg.perguntas.length) {
        if (id === 'garagem_emily' && root.LuiggiDialogue) root.LuiggiDialogue.mostrarSeloTelltale('Uau, uma escolha que importa. Mais ou menos.');
        kit.fim(quimica * 10, { max: 1000, texto: quimica >= 90 ? 'A química foi lá em cima!' : 'Até que foi bem.' });
        return;
      }
      const cur = cfg.perguntas[step];
      kit.msg(cur.q);
      if (fone && step === 0) {
        chat.push({ de: 'ela', txt: 'chegou bem? 🙂' });
        fone.redraw();
      } else if (fone && step === 1) {
        chat.push({ de: 'ela', txt: 'o que vai fazer no fds?' });
        fone.redraw();
      }
      if (sub && step === 1 && !civic) {
        civic = L().createCivicMesh(true);
        civic.position.set(-4.2, 0, -1.2);
        civic.rotation.y = 0.7;
        stage.scene.add(civic);
      }
      escolhas(kit, cur.op, (idx) => {
        quimica = Math.min(100, quimica + 20);
        if (id === 'garagem_emily' && save) {
          if (step === 0 && idx === 0) save.state.subaruMods.motorBoost = (save.state.subaruMods.motorBoost || 0) + 1;
          if (step === 0 && idx === 1) save.state.subaruMods.gripBoost = (save.state.subaruMods.gripBoost || 0) + 1;
          save.salvar();
          if (step === 0) aplicarMod(idx);
        }
        if (fone) {
          chat.push({ de: 'eu', txt: cur.op[idx].replace(/^"|"$/g, '').slice(0, 30) });
          fone.redraw();
        }
        bolha(kit, kit.personagem(cfg.quem)?.nome || '', cur.re[idx], fone ? 46 : 46, 10);
        pessoa?.setExpression(idx === 1 && id === 'conversa_luiza' ? 'neutro' : 'feliz');
        kit.sfx('blip');
        const centro = pessoa ? pessoa.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)) : new THREE.Vector3(0, 2, 0);
        coracoes.burst(18, centro, 1.6);
        kit.pop('+20 💖', centro, '#f472b6');
        hud();
        step++;
        kit.timeout(proxima, 1500);
      });
    }

    let rebaixar = 0;
    let turbo = false;
    function aplicarMod(idx) {
      if (idx === 0) {
        turbo = true;
        kit.sfx('boxer');
      } else if (idx === 1) rebaixar = 0.09;
      else {
        kit.sfx('boxer');
        stage.shake(0.05, 5);
        for (let i = 0; i < 6; i++) kit.timeout(() => chamas.burst(14, sub.localToWorld(new THREE.Vector3(0.5, 0.35, -2.4)), 1.8), i * 120);
      }
    }

    kit.loop((dt, t) => {
      if (sub) {
        sub.rotation.y += dt * 0.35;
        if (env?.prato) env.prato.rotation.y = sub.rotation.y;
        sub.position.y = U().damp(sub.position.y, -rebaixar, 4, dt);
        if (turbo && Math.random() < 0.3) chamas.emit(2, sub.localToWorld(new THREE.Vector3(0.5, 0.35, -2.4)), () => ({ x: U().rand(-0.3, 0.3), y: U().rand(0.2, 0.6), z: -2 }));
      }
      if (fone) fone.rotation.y = Math.sin(t * 0.7) * 0.08;
    });

    kit.intro('Escolha bem as palavras e veja a <b>química</b> subir.', ['🖱️ Clique na opção', '⌨️ 1 · 2 · 3'], { semContagem: true }).then(proxima);
    return kit.promessa;
  }

  // ======================================================================
  // 2. SEGURANDO VELA (Cap. 6 · Centro às 3h)
  // ======================================================================
  function segurandoVela(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Segurando Vela no Centro', icone: '🕯️', capitulo: 6, cor: '#fbbf24', ambiente: 'centro_noite', max: 950 });
    const { stage, THREE } = kit;
    const save = root.LuiggiSave;
    const fab = kit.boneco('fabricio', [0.35, 0.15, 0], Math.PI);
    const aga = kit.boneco('agatha', [-0.35, 0.15, 0], Math.PI);
    const luis = kit.boneco('luis', [0, 0.15, 3], Math.PI);
    [fab, aga, luis].forEach((b) => b.setPose('walk', 0.75));
    // Vela na mão do Luis
    const vela = L().cyl(0.025, 0.025, 0.22, L().M.std('#f5f5f4', 0.8), 0, 0.1, 0, 8);
    luis.maoDireita.add(vela);
    const chama = L().halo('#ffb347', 0.35, 2.4);
    chama.position.y = 0.25;
    luis.maoDireita.add(chama);
    const luzVela = new THREE.PointLight('#ff9d3c', 3, 4, 1.6);
    luzVela.position.y = 0.3;
    luis.maoDireita.add(luzVela);
    let dist = 50;
    let seg = 14;
    let tocouVermelho = false;
    let olhando = 0;
    let z = 6;
    const cam = stage.camera;
    const look = new THREE.Vector3();

    const hud = () => kit.hud(kit.pill(`⏱️ ${seg}s`));
    hud();
    const ajustar = (d) => (dist = U().clamp(dist + d, 5, 95));
    kit.tecla((e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') ajustar(-14);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') ajustar(14);
      if (e.code === 'Space') joinha();
    });
    function joinha() {
      luis.play('thumbs', 0.8);
      kit.msg('Fabricio olhou e continuou confuso!', '#fbbf24', 1400);
    }
    kit.botoes([
      { label: '⬆ Chegar Perto', tecla: '↑', onClick: () => ajustar(-14) },
      { label: '⬇ Dar Espaço', tecla: '↓', onClick: () => ajustar(14) },
      { label: '👍 Fazer Joinha', primary: true, tecla: 'Espaço', onClick: joinha }
    ]);

    kit.loop((dt, t) => {
      z -= dt * 1.1;
      const gap = 1.1 + (dist / 100) * 5;
      fab.group.position.z = z;
      aga.group.position.z = z;
      luis.group.position.z = U().damp(luis.group.position.z, z + gap, 3, dt);
      cam.position.set(1.3, 2.3, luis.group.position.z + 3.6);
      look.set(0, 1.2, z + gap * 0.4);
      cam.lookAt(look);
      chama.scale.setScalar(0.35 + Math.sin(t * 17) * 0.04 + Math.sin(t * 7) * 0.03);
      luzVela.intensity = 3 + Math.sin(t * 13) * 0.5;
      olhando = Math.max(0, olhando - dt);
      fab.setPose(olhando > 0 ? 'look_back' : 'walk', 0.75);
      kit.medidor('dist', 'Distância do casal', dist / 100, { marcador: true, zona: [0.35, 0.68] });
    });

    kit.intro('Mantenha a <b>distância ideal</b> atrás do Fabricio e da Agatha às 3h da manhã. Reaja quando ele olhar pra trás!', ['⌨️ ↑ ↓', '⌨️ Espaço = joinha']).then(() => {
      kit.intervalo(() => {
        dist += (Math.random() - 0.5) * 16;
        dist = U().clamp(dist, 5, 95);
        if (dist < 35) tocouVermelho = true;
        if (Math.random() < 0.28) {
          if (save) save.incrementarContador('fabricioOlhouPraTras', 1);
          olhando = 0.9;
          fab.setExpression('chocado');
          kit.msg('👀 Fabricio olhou pra trás sem saber o que fazer!', '#fbbf24', 1200);
        } else fab.setExpression('neutro');
      }, 450);
      kit.intervalo(() => {
        seg--;
        hud();
        if (seg <= 0) {
          kit.conquista('segurando_vela');
          if (!tocouVermelho) kit.conquista('distancia_respeitosa');
          kit.fim(tocouVermelho ? 450 : 950, { max: 950, texto: tocouVermelho ? 'Chegou perto demais em algum momento...' : 'Distância respeitosa o tempo inteiro. Profissional.' });
        }
      }, 1000);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 3. PRAÇA DE ALIMENTAÇÃO (Cap. 7)
  // ======================================================================
  function pracaAlimentacao(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Praça de Alimentação', icone: '🍟', capitulo: 7, cor: '#f97316', ambiente: 'shopping', max: 850 });
    const { stage, THREE } = kit;
    const { M, box, cyl, sphere } = L();
    root.Luiggi3DEnv.helpers.mesaComCadeiras(stage.scene, 0, -6.2, { tampo: M.std('#fda4af', 0.4), cadeira: M.std('#f97316', 0.6) });
    kit.carta('luiza', [0.9, 0, -6.2], { altura: 2.3 });
    const luis = kit.boneco('luis', [0, 0, 5], Math.PI);
    luis.setPose('carry');
    // Bandeja
    const bandeja = new THREE.Group();
    bandeja.add(box(0.5, 0.03, 0.34, M.std('#f59e0b', 0.5), 0, 0, 0));
    const burger = new THREE.Group();
    burger.add(cyl(0.08, 0.09, 0.04, M.toon('#d97706'), 0, 0.03, 0, 14));
    burger.add(cyl(0.085, 0.085, 0.025, M.toon('#7c2d12'), 0, 0.06, 0, 14));
    const pao = sphere(0.085, M.toon('#f59e0b'), 0, 0.08, 0, 14);
    pao.scale.set(1, 0.55, 1);
    burger.add(pao);
    burger.position.x = -0.1;
    bandeja.add(burger);
    const fritas = new THREE.Group();
    fritas.add(box(0.1, 0.1, 0.07, M.toon('#dc2626'), 0, 0.06, 0));
    for (let i = 0; i < 7; i++) fritas.add(box(0.012, 0.09, 0.012, M.toon('#fde047'), -0.035 + i * 0.012, 0.13, (i % 2) * 0.02 - 0.01));
    fritas.position.x = 0.12;
    bandeja.add(fritas);
    bandeja.position.set(0, 1.2, 4.55);
    stage.scene.add(bandeja);
    const batatas = kit.particulas({ count: 60, size: 0.06, shape: 'square', color: '#fde047', intensity: 1, gravity: 9, life: [0.8, 1.2], additive: false, floor: 0.02 });
    // Criança correndo (obstáculo)
    const crianca = root.Luiggi3DChar.createExtra({ escala: 0.6, top: '#22c55e' });
    crianca.setPose('run');
    crianca.group.visible = false;
    stage.scene.add(crianca.group);
    stage.addUpdate((dt) => crianca.update(dt));

    let bal = 50;
    let derrubou = false;
    let dist = 0;
    let andando = 0;
    let criancaT = 0;
    const cam = stage.camera;

    const hud = () => kit.hud(kit.pill(`🚶 ${Math.min(100, dist)}% até a mesa`));
    hud();
    const inclinar = (d) => (bal = U().clamp(bal + d, 0, 100));
    function andar() {
      if (andando > 0 || dist >= 100) return;
      dist += 15;
      andando = 0.5;
      bal += (Math.random() - 0.5) * 26;
      if (bal < 20 || bal > 80) {
        derrubou = true;
        kit.msg('💥 Quase caiu batata no piso molhado!', '#f87171', 1300);
        batatas.burst(16, bandeja.position.clone(), 1.6);
        kit.sfx('bruh');
        luis.play('stumble', 0.6);
      } else {
        kit.msg('⚠️ Desviou de criança correndo!', '#fbbf24', 1300);
        crianca.group.visible = true;
        criancaT = 0;
      }
      hud();
      if (dist >= 100) {
        if (!derrubou) kit.conquista('garcom_shopping');
        kit.timeout(() => kit.fim(derrubou ? 350 : 850, { max: 850, texto: derrubou ? 'Chegou... com algumas batatas a menos.' : 'Garçom de shopping nível profissional!' }), 900);
      }
    }
    kit.tecla((e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inclinar(-14);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inclinar(14);
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') andar();
    });
    kit.botoes([
      { label: '⬅ Inclinar Esq', tecla: '←', onClick: () => inclinar(-14) },
      { label: '🚶 Andar', primary: true, tecla: '↑', onClick: andar },
      { label: 'Inclinar Dir ➡', tecla: '→', onClick: () => inclinar(14) }
    ]);

    const zIni = 5;
    const zFim = -5.2;
    kit.loop((dt, t) => {
      andando = Math.max(0, andando - dt);
      luis.setPose(andando > 0 ? 'walk' : 'carry');
      const zAlvo = zIni + (zFim - zIni) * Math.min(1, dist / 100);
      luis.group.position.z = U().damp(luis.group.position.z, zAlvo, 4, dt);
      const tilt = ((bal - 50) / 50) * 0.45;
      bandeja.position.set(luis.group.position.x, 1.2 + (andando > 0 ? Math.abs(Math.sin(t * 14)) * 0.02 : 0), luis.group.position.z - 0.45);
      bandeja.rotation.z = U().damp(bandeja.rotation.z, -tilt, 8, dt);
      cam.position.set(1.4, 2.6, luis.group.position.z + 3.4);
      cam.lookAt(0, 1.1, luis.group.position.z - 2.5);
      if (crianca.group.visible) {
        criancaT += dt;
        crianca.group.position.set(-4 + criancaT * 6, 0, luis.group.position.z - 1.6);
        crianca.group.rotation.y = Math.PI / 2;
        if (criancaT > 1.4) crianca.group.visible = false;
      }
      kit.medidor('bal', 'Equilíbrio da bandeja', bal / 100, { marcador: true, zona: [0.2, 0.8] });
    });

    kit.intro('Leve a bandeja até a <b>mesa da Luiza</b> sem derrubar nada. Equilibre a cada passo!', ['⌨️ ↑ / Espaço = andar', '⌨️ ← → = inclinar']);
    return kit.promessa;
  }

  // ======================================================================
  // 4. GRITO NO BAR (Cap. 8 · Sad Baile)
  // ======================================================================
  function gritoNoBar(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Grito no Bar (Sad Baile)', icone: '🍹', capitulo: 8, cor: '#a855f7', ambiente: 'sad_baile', max: 550 });
    const { stage, env, THREE } = kit;
    const { M, box } = L();
    // Balcão em primeiro plano + barman
    stage.scene.add(box(6, 1.1, 0.8, M.std('#111827', 0.3, 0.5), 0, 0.55, 2.4));
    stage.scene.add(box(6, 0.05, 0.9, M.glow('#a855f7', 1.6), 0, 1.12, 2.4, { cast: false }));
    const barman = kit.carta('barman', [0, 0, 1.5], { altura: 2.5 });
    stage.camera.position.set(0, 1.75, 5.2);
    stage.camera.lookAt(0, 1.6, 0);
    const ondas = kit.particulas({ count: 60, size: 0.5, shape: 'soft', color: '#c084fc', intensity: 1.2, life: [0.4, 0.7], drag: 1 });
    let round = 0;
    let pausa = false;

    const hud = () => kit.hud(kit.pill(`🗣️ ${round}/3 pedidos`));
    hud();
    function gritar() {
      if (kit.terminado) return;
      ondas.emit(16, new THREE.Vector3(0, 1.6, 4.2), () => ({ x: U().rand(-1, 1), y: U().rand(-0.3, 0.3), z: -4 }));
      if (pausa) {
        round++;
        hud();
        bolha(kit, 'Barman', round >= 3 ? '"AEE, AGORA OUVI!"' : '"DOIS... SUCOS DE LUZ?!"', 48, 8);
        barman.setExpression(round >= 3 ? 'feliz' : 'chocado');
        kit.sfx('blip');
        if (round >= 3) {
          kit.conquista('grito_no_bar');
          kit.timeout(() => kit.fim(550, { max: 550, texto: 'Pedido entregue. Era suco mesmo?' }), 1100);
        }
      } else {
        bolha(kit, 'Barman', '"QUÊ?! NÃO DÁ PRA OUVIR NADA!"', 48, 8);
        barman.setExpression('bravo');
        kit.sfx('bruh');
      }
    }
    kit.on(stage.domElement, 'pointerdown', gritar);
    kit.tecla((e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        gritar();
      }
    });
    kit.botoes([{ label: '🗣️ GRITAR PEDIDO!', primary: true, tecla: 'Espaço', onClick: gritar }]);

    kit.loop(() => {
      env.energia = pausa ? 0.05 : 1.4;
      kit.medidor('som', pausa ? '🤫 PAUSA! GRITE AGORA!' : '🔊 SOM ESTOURADO!', pausa ? 0.08 : 0.95, { cor: pausa ? '#34d399' : '#a855f7' });
    });
    kit.intro('O som está estourado. Grite o pedido <b>exatamente nas pausas</b> da batida para o barman ouvir!', ['🖱️ Clique / Espaço']).then(() => {
      kit.msg('Espere a pausa na batida para gritar!', '#c084fc');
      kit.intervalo(() => {
        pausa = !pausa;
        if (pausa) stage.pulseGrade('saturation', 0.4, 0.5, 1.15);
        else stage.shake(0.03, 9);
      }, 900);
    });
    return kit.promessa;
  }

  // ======================================================================
  // 5. NAME DROP DA PIETRA (Cap. 8)
  // ======================================================================
  function namedropPietra(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Name Drop da Pietra', icone: '⭐', capitulo: 8, cor: '#9333ea', ambiente: 'sad_baile', max: 450 });
    const { stage, env } = kit;
    const lista = root.LuiggiData?.cache?.namedrops?.namedrops || [];
    const pietra = kit.carta('pietra', [0.8, 0, env.slots.R[2]], { altura: 2.5 });
    stage.camera.position.set(0.2, 1.85, 4.4);
    stage.camera.lookAt(0.5, 1.6, 0);
    let idx = 0;
    let pts = 0;
    function render() {
      if (idx >= lista.length) {
        kit.conquista('intimo_dos_famosos');
        kit.fim(pts, { max: Math.max(150, lista.length * 150), texto: 'Pietra: "...e aí eu falei pro Guilherme, né, Guilherme, primo..."' });
        return;
      }
      const n = lista[idx];
      kit.medidor('intim', 'Intimidade Forçada', Math.min(1, ((idx + 1) * 33) / 100), { cor: '#9333ea' });
      bolha(kit, 'Pietra', `"${n.falaPietra}"`, 44, 6);
      pietra.setExpression('feliz');
      pietra.setSpeaking(true);
      kit.msg(`Quem é <b>"${n.chamavaDe}"</b>?`);
      escolhas(kit, n.opcoes, () => {
        if (idx === 0) kit.conquista('quem_e_guilherme');
        pts += 150;
        kit.sfx('blip');
        pietra.setSpeaking(false);
        if (n.reacaoDiscord) bolha(kit, 'Fabricio (Discord)', n.reacaoDiscord, 6, 12);
        kit.pop('+150 ⭐', { x: 60, y: 30 }, '#c084fc');
        idx++;
        kit.timeout(render, 1400);
      });
    }
    kit.intro('A Pietra chama os famosos pelo primeiro nome como se fossem primos. <b>Adivinhe de quem ela está falando!</b>', ['🖱️ Clique', '⌨️ 1 · 2 · 3'], { semContagem: true }).then(render);
    return kit.promessa;
  }

  // ======================================================================
  // 6. ONDE ESTÁ A RUIVA? (Cap. 8 · pista lotada com estrobo)
  // ======================================================================
  function ondeEstaRuiva(id) {
    const kit = root.LuiggiKit.abrir({ id, titulo: 'Onde Está a Ruiva Misteriosa?', icone: '🔍', capitulo: 8, cor: '#0f766e', ambiente: 'sad_baile', max: 650 });
    const { stage, THREE } = kit;
    const save = root.LuiggiSave;
    const pessoas = [];
    const add = (b, info) => {
      stage.scene.add(b.group);
      stage.addUpdate((dt) => b.update(dt));
      b.setPose(Math.random() < 0.5 ? 'dance' : 'dance_sad', 0.7 + Math.random() * 0.6);
      b.group.userData.info = info;
      pessoas.push(b);
    };
    const nomeados = [
      ['rebeca', 'Rebeca (cacheada pink)', 'Fabricio: "Essa é a Rebeca, CORRE!"', false],
      ['julie', 'Julie (gótica)', 'Fabricio: "Não, essa é a Julie!"', false],
      ['pietra', 'Pietra (mechas roxas)', 'Fabricio: "Essa é a Pietra falando do Guilherme!"', false],
      ['ruiva_misteriosa', 'Ruiva Misteriosa', 'Fabricio: "É ESSA AÍ!!"', true]
    ];
    const posicoes = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) posicoes.push([-4.2 + c * 1.7 + (r % 2) * 0.6, -0.5 - r * 1.25]);
    posicoes.sort(() => Math.random() - 0.5);
    let k = 0;
    nomeados.forEach(([cid, nome, dica, alvo]) => {
      const b = root.Luiggi3DChar.create(kit.personagem(cid), { contorno: false });
      const p = posicoes[k++];
      b.group.position.set(p[0], 0, p[1]);
      add(b, { nome, dica, alvo });
    });
    [['#ea580c', 'Figurante Ruiva #1', 'Fabricio: "Altura errada!"', 0.85], ['#c2410c', 'Figurante Ruiva #2', 'Fabricio: "Essa tá de costas!"', 1]].forEach(([cor, nome, dica, esc]) => {
      const b = root.Luiggi3DChar.createExtra({ cabelo: cor, estilo: 'longo_ondulado', escala: esc, top: '#334155' });
      const p = posicoes[k++];
      b.group.position.set(p[0], 0, p[1]);
      if (nome.includes('#2')) b.group.rotation.y = Math.PI;
      add(b, { nome, dica, alvo: false });
    });
    while (k < 20) {
      const b = root.Luiggi3DChar.createExtra({ cabelo: U().pick(['#1A1412', '#3B2417', '#121215', '#C9A27A', '#6B4226']) });
      const p = posicoes[k++];
      b.group.position.set(p[0], 0, p[1]);
      b.group.rotation.y = U().rand(-0.6, 0.6);
      add(b, { nome: 'Alguém aleatório', dica: 'Fabricio: "Mano, esse aí nem é ruivo."', alvo: false });
    }
    const cam = stage.camera;
    cam.position.set(0, 2.6, 4.6);
    let yaw = 0;
    let yawAlvo = 0;
    const estrobo = new THREE.PointLight('#ffffff', 0, 20, 1);
    estrobo.position.set(0, 5, 0);
    stage.scene.add(estrobo);
    const brilho = kit.particulas({ count: 60, size: 0.12, shape: 'spark', color: '#5eead4', intensity: 3, life: [0.5, 1], gravity: 1 });

    kit.on(stage.domElement, 'pointermove', (e) => {
      const r = stage.domElement.getBoundingClientRect();
      yawAlvo = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
      stage.domElement.style.cursor = kit.picker.pick(e, pessoas.map((p) => p.group)) ? 'crosshair' : '';
    });
    kit.on(stage.domElement, 'pointerdown', (e) => {
      const hit = kit.picker.pick(e, pessoas.map((p) => p.group));
      if (!hit) return;
      let o = hit.object;
      while (o && !o.userData.info) o = o.parent;
      if (!o) return;
      const info = o.userData.info;
      kit.msg(info.dica, info.alvo ? '#4ade80' : '#fbbf24', 1600);
      if (save) save.incrementarContador('ruivasEncontradas', 1);
      kit.pop(info.nome, o.position.clone().add(new THREE.Vector3(0, 2.1, 0)), info.alvo ? '#5eead4' : '#fbbf24');
      if (info.alvo) {
        brilho.burst(50, o.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 2.5);
        kit.conquista('onde_esta_a_ruiva');
        kit.timeout(() => kit.fim(650, { max: 650, texto: 'Achou! Agora... falar com ela é outra história.' }), 900);
      }
    });

    kit.loop((dt, t) => {
      yaw = U().damp(yaw, yawAlvo, 3, dt);
      cam.position.x = yaw * 4;
      cam.lookAt(yaw * 6, 1.3, -2);
      const flash = Math.floor(t * 7) % 4 === 0;
      estrobo.intensity = flash ? 22 : 0;
    });
    kit.intro('Ache a <b>Ruiva Misteriosa</b> (blusa verde-esmeralda, altura média) na pista estroboscópica!', ['🖱️ Mova para olhar', '🖱️ Clique na pessoa']);
    return kit.promessa;
  }

  const reg = (id, fn) => Q().registrar(id, fn);
  ['conversa_luiza', 'conversa_mensagem', 'papo_fim_noite', 'garagem_emily'].forEach((id) => reg(id, conversa));
  reg('segurando_vela', segurandoVela);
  reg('praca_alimentacao', pracaAlimentacao);
  reg('grito_no_bar', gritoNoBar);
  reg('namedrop_pietra', namedropPietra);
  reg('onde_esta_ruiva', ondeEstaRuiva);
})(window);
