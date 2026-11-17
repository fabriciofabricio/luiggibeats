/**
 * src/engine/SubaruPOV.js
 * Safepoint em 3D: POV do Luis no banco do motorista do Subaru Legacy azul, com o Fabricio
 * no banco do passageiro e Curitiba à noite pelo para-brisa.
 *
 * Interações (clique no objeto 3D ou nos atalhos do painel):
 *   volante (ronco do boxer), rádio (troca o estilo), porta-luvas (cookies), retrovisor (banco de trás),
 *   Fabricio (reage). As falas são as mesmas do roteiro original.
 * Também contém a cena final "Voltando para casa" (Subaru 3D dirigindo ao amanhecer).
 */
(function (root) {
  'use strict';

  const L = () => root.Luiggi3D;

  const CONVERSAS_CARRO = {
    intro: {
      titulo: 'Safepoint · Início da Noite',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Encostamos no Safepoint, mano. E que cheiro forte de baunilha é esse dentro do Subaru?!' },
        { quem: 'luis', expr: 'envergonhado', fala: 'Então... antes da gente lembrar do começo de toda a nossa história, eu quero te contar como foi o meu dia de ontem com os cookies.' },
        { quem: 'fabricio', expr: 'chocado', fala: 'Ontem?! Você ficou o dia inteiro no hiperfoco assando cookie na cozinha, Luiggi?!' },
        { quem: 'luis', expr: 'feliz', fala: 'Fiquei! Deixa eu te mostrar primeiro como foi esse dia de ontem, e depois a gente volta lá pro começo no Ensino Médio.' }
      ],
      proximoLabel: '🍪 Ouvir sobre o dia de ontem (Prólogo — Hiperfoco)'
    },
    0: {
      titulo: 'Safepoint · Pós-Prólogo',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Beleza, cookies aprovados! Agora volta a fita lá pro começo de tudo: o Fundão do Ensino Médio.' },
        { quem: 'luis', expr: 'neutro', fala: 'Nossa... época do Tiago Music, do Vitor pagando mico, da Maria Clara no basquete... e da Cecília gritando FELPS.' },
        { quem: 'fabricio', expr: 'feliz', fala: 'Eu ainda mal falava com você nessa época, só aparecia lá atrás de vez em quando! Bora relembrar o Capítulo 1!' }
      ],
      proximoLabel: '🏫 Puxar Assunto: Cap. 1 — O Fundão'
    },
    1: {
      titulo: 'Safepoint · Pós-Capítulo 1',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'KKKKK mano, você destruiu o sonho musical do Tiago com quatro palavras: "Por que você fez isso?"' },
        { quem: 'luis', expr: 'envergonhado', fala: 'E o Vitor elogiando o tênis da garota falando da mãe dele... e a Maria Clara só querendo saber de mangá e das meninas da arquibancada.' },
        { quem: 'fabricio', expr: 'feliz', fala: 'Aí o mundo parou em 2020 e foi aí que a gente realmente ficou irmão na call do Discord! Lembra do nosso primeiro shittrap?' }
      ],
      proximoLabel: '🎧 Puxar Assunto: Cap. 2 — Nasce o LuiggiBeats'
    },
    2: {
      titulo: 'Safepoint · Pós-Capítulo 2',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'O Vitor ajoelhando na chuva por causa do beat kkkkk. A gente criou uma lenda na quarentena!' },
        { quem: 'luis', expr: 'chocado', fala: 'Mas aí acabou a pandemia, começou a faculdade... e adivinhe quem tava lá no corredor esperando?' },
        { quem: 'fabricio', expr: 'chocado', fala: '"...felps?" — A saga do Arquivo Confidencial!' }
      ],
      proximoLabel: '🔒 Puxar Assunto: Cap. 3 — O Arquivo Confidencial'
    },
    3: {
      titulo: 'Safepoint · Pós-Capítulo 3',
      falas: [
        { quem: 'fabricio', expr: 'bravo', fala: 'Até aqui dentro do meu carro favorito você não me conta se entrou naquele banheiro com a Cecília?!' },
        { quem: 'luis', expr: 'envergonhado', fala: 'Segredo de Estado, Fabricio. Mudando de assunto... lembra quando eu comprei esse Subaru azul e comecei na academia?' },
        { quem: 'fabricio', expr: 'feliz', fala: 'Lembro demais! 21 anos, banco traseiro famoso e 999 notificações da Gi Eta!' }
      ],
      proximoLabel: '🚙 Puxar Assunto: Cap. 4 — Subaru Azul'
    },
    4: {
      titulo: 'Safepoint · Pós-Capítulo 4',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'O anjinho no teu ombro levando voadora e os vidros do Subaru embaçados na frente da academia kkkkk.' },
        { quem: 'luis', expr: 'envergonhado', fala: 'Pior que depois dessa fase a gente foi parar lá no Bec Bar numa noite fria... e você também se meteu em encrenca!' },
        { quem: 'fabricio', expr: 'chocado', fala: 'Nem me lembra daquela franja gritando meu nome no meio do bar...' }
      ],
      proximoLabel: '🍺 Puxar Assunto: Cap. 5 — Fabricio, Você Sabe o Que Faz'
    },
    5: {
      titulo: 'Safepoint · Pós-Capítulo 5',
      falas: [
        { quem: 'luis', expr: 'feliz', fala: 'Enquanto você equilibrava Agatha e Caliandra no outro quarto, eu aprendi toda a geografia da Alemanha com a Luiza!' },
        { quem: 'fabricio', expr: 'envergonhado', fala: 'E aí às 3 da manhã eu olhei o celular e lembrei que tinha combinado com a Agatha na balada K-Pop...' }
      ],
      proximoLabel: '🕯️ Puxar Assunto: Cap. 6 — Segurando Vela'
    },
    6: {
      titulo: 'Safepoint · Pós-Capítulo 6',
      falas: [
        { quem: 'fabricio', expr: 'envergonhado', fala: 'Desculpa de novo por deixar você segurando a maior vela de Curitiba e correndo de sacola plástica às 3h da manhã.' },
        { quem: 'luis', expr: 'neutro', fala: 'Tranquilo, quando entrei aqui no Subaru e travei as portas cinco vezes, a Luiza mandou mensagem perguntando se cheguei bem. Pena que tinha... um gato.' }
      ],
      proximoLabel: '🐈‍⬛ Puxar Assunto: Cap. 7 — O Gato Viu Tudo'
    },
    7: {
      titulo: 'Safepoint · Pós-Capítulo 7',
      falas: [
        { quem: 'fabricio', expr: 'neutro', fala: 'Aquele gato ainda me dá arrepio. E você triste demais com o término... até eu te arrastar pro Sad Baile!' },
        { quem: 'luis', expr: 'feliz', fala: 'A noite das ruivas! E da Pietra chamando o Aka Rasta de Guilherme como se fossem primos!' }
      ],
      proximoLabel: '💧 Puxar Assunto: Cap. 8 — Sad Baile'
    },
    8: {
      titulo: 'Safepoint · Pós-Capítulo 8',
      falas: [
        { quem: 'fabricio', expr: 'bravo', fala: 'Só não repete aquele card final da Marilis Docinho aqui no carro, beleza?!' },
        { quem: 'luis', expr: 'feliz', fala: 'Fechado! Mas lembra que saindo do Sad Baile a gente viu o cartaz do TNT no Asterisco Café? Foi onde você conheceu a Rayssa... e eu conheci a Yohana.' }
      ],
      proximoLabel: '☕ Puxar Assunto: Cap. 9 — TNT no Asterisco Café'
    },
    9: {
      titulo: 'Safepoint · Pós-Capítulo 9',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Pelo menos do TNT saiu meu namoro com a Rayssa! Já você teve que assistir 12 minutos de créditos de "Nora" sem pós-créditos...' },
        { quem: 'luis', expr: 'neutro', fala: 'E no dia seguinte eu fui te buscar no Bacacheri pra ir no Emily Doces. Bem-vindo à era Tico e Teco!' }
      ],
      proximoLabel: '🐿️ Puxar Assunto: Cap. 10 — Tico e Teco'
    },
    10: {
      titulo: 'Safepoint · Pós-Capítulo 10',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Tico e Teco, Lé e Cré, e o racha épico do Subaru contra o Civic branco da Emily!' },
        { quem: 'luis', expr: 'envergonhado', fala: 'É... e naquela noite eu fui dormir e tive AQUELE sonho lúcido completamente maluco com você dirigindo o Subaru.' }
      ],
      proximoLabel: '☁️ Puxar Assunto: Cap. 11 — Sonho Lúcido'
    },
    11: {
      titulo: 'Safepoint · Pós-Capítulo 11',
      falas: [
        { quem: 'fabricio', expr: 'chocado', fala: 'Eu ainda não superei a Sol no banco de trás e a minha CNH de giz de cera! Mas pelo menos era só um sonho...' },
        { quem: 'luis', expr: 'neutro', fala: 'Pior veio depois, na vida real: dois olhos brilhando no escuro da academia. A era gótica.' }
      ],
      proximoLabel: '🚩 Puxar Assunto: Cap. 12 — A Rainha das Red Flags'
    },
    12: {
      titulo: 'Safepoint · Pós-Capítulo 12',
      falas: [
        { quem: 'fabricio', expr: 'bravo', fala: 'O Detector de Red Flags literalmente explodiu, a memória do Uber nunca existiu e o "vou parar com isso" entrou em loop infinito.' },
        { quem: 'luis', expr: 'envergonhado', fala: 'E aí chegou o próximo TNT com o carro cheio... você, eu, o Matheus Neuman e a Eloiza barrando a Yohana na porta do carro.' }
      ],
      proximoLabel: '🥊 Puxar Assunto: Cap. 13 — Treta no TNT'
    },
    13: {
      titulo: 'Safepoint · Pós-Capítulo 13',
      falas: [
        { quem: 'fabricio', expr: 'chocado', fala: 'Que climão histórico dentro desse mesmo Subaru! E o Cara Aleatório só concordando: "é... verdade".' },
        { quem: 'luis', expr: 'neutro', fala: 'Depois veio o nosso primeiro "tempo"... e aquela noite maluca na Yard e na James com a Tutuluiza, a Lara e a Isabela Dominik.' }
      ],
      proximoLabel: '🕶️ Puxar Assunto: Cap. 14 — Operação Ponto Cego'
    },
    14: {
      titulo: 'Safepoint · Pós-Capítulo 14',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Eu nunca vou esquecer o Luis.exe parando de responder quando a Tutuluiza começou a flertar com você no meio da pista KKKKK.' },
        { quem: 'luis', expr: 'neutro', fala: 'É, mano... e isso traz a gente exatamente pro dia de hoje. Pro presente. Pra escolha que eu ainda não escrevi.' }
      ],
      proximoLabel: '🪞 Puxar Assunto: Cap. 15 (Final) — O Presente'
    },
    15: {
      titulo: 'Safepoint · Fim da Jornada',
      falas: [
        { quem: 'fabricio', expr: 'feliz', fala: 'Contamos tudo, do Fundão até agora. Independente do que acontecer daqui pra frente, tamo junto no Discord e na vida real, meu irmão.' },
        { quem: 'luis', expr: 'feliz', fala: 'Valeu por tudo, Fabricio. Agora... hora de ligar o boxer e finalmente voltar pra casa.' }
      ],
      proximoLabel: '🏠 Ligar o Subaru Azul e Voltar para Casa (Finalizar Jogo)'
    }
  };

  const ESTILOS_RADIO = ['lofi', 'trap', 'sad', 'sonho', 'gotico'];
  const NOMES_RADIO = { lofi: 'LO-FI 4AM', trap: 'SHITTRAP FM', sad: 'SAD BAILE', sonho: 'SONHO LÚCIDO', gotico: 'ERA GÓTICA' };

  // ------------------------------------------------------------------
  // INTERIOR DO SUBARU (frente = -z)
  // ------------------------------------------------------------------
  function construirInterior(o = {}) {
    const THREE = root.THREE;
    const { box, cyl, plane, M, textures, halo } = L();
    const g = new THREE.Group();
    const couro = M.std('#16181d', 0.75, 0.05);
    const plastico = M.std('#0e1014', 0.6, 0.1);
    const tecido = M.std('#22252c', 0.95);
    const azul = M.std(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', 0.3, 0.6);

    // Painel
    const painel = box(1.9, 0.26, 0.55, plastico, 0, 0.88, -0.78);
    g.add(painel);
    g.add(box(1.9, 0.08, 0.35, couro, 0, 1.02, -0.92));
    // Saídas de ar
    [-0.72, -0.08, 0.08, 0.72].forEach((x) => g.add(box(0.13, 0.06, 0.02, M.std('#2a2d35', 0.4, 0.6), x, 0.95, -0.5, { cast: false })));
    // Detalhe azul do painel
    g.add(box(1.85, 0.015, 0.01, M.glow('#3b82f6', 1.6), 0, 0.82, -0.505, { cast: false }));

    // Cluster de instrumentos (canvas animado)
    const gauges = L().makeCanvasTex(512, 200, () => { });
    const cluster = plane(0.42, 0.16, M.basic('#ffffff', { map: gauges }), -0.38, 0.99, -0.62);
    cluster.rotation.x = -0.25;
    cluster.material.color.multiplyScalar(1.3);
    g.add(cluster);
    g.add(box(0.48, 0.1, 0.12, plastico, -0.38, 1.1, -0.66));

    // Volante
    const volante = new THREE.Group();
    volante.position.set(-0.38, 0.84, -0.52);
    volante.rotation.x = 0.5;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 12, 40), couro);
    volante.add(aro);
    [0, 2.2, -2.2].forEach((a) => {
      const raio = box(0.16, 0.03, 0.02, M.std('#2b2e36', 0.4, 0.6), Math.cos(a - Math.PI / 2) * 0.08, Math.sin(a - Math.PI / 2) * 0.08, 0);
      raio.rotation.z = a;
      volante.add(raio);
    });
    const hubTex = textures.text('SUBARU', { w: 256, h: 128, size: 40, color: '#93c5fd', bg: '#0b1220', radius: 30 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 24), [M.std('#0b1220', 0.4), M.basic('#ffffff', { map: hubTex }), M.std('#0b1220', 0.4)]);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.01;
    volante.add(hub);
    const coluna = cyl(0.03, 0.04, 0.3, plastico, 0, 0, -0.16, 10);
    coluna.rotation.x = Math.PI / 2;
    volante.add(coluna);
    volante.userData.acao = 'volante';
    g.add(volante);

    // Console central + rádio
    g.add(box(0.36, 0.5, 0.5, plastico, 0, 0.62, -0.62));
    const radioTex = L().makeCanvasTex(256, 128, () => { });
    const radio = plane(0.24, 0.12, M.basic('#ffffff', { map: radioTex }), 0, 0.83, -0.505);
    radio.material.color.multiplyScalar(1.4);
    radio.userData.acao = 'radio';
    g.add(radio);
    g.add(box(0.36, 0.12, 0.9, couro, 0, 0.52, -0.05));
    const cambio = cyl(0.015, 0.015, 0.16, M.std('#9ca3af', 0.3, 0.9), 0, 0.64, -0.2, 8);
    g.add(cambio);
    g.add(L().sphere(0.035, M.std('#111', 0.3), 0, 0.73, -0.2, 10));

    // Porta-luvas (lado do passageiro, abre)
    const portaLuvas = new THREE.Group();
    portaLuvas.position.set(0.48, 0.76, -0.5);
    const tampa = box(0.42, 0.16, 0.03, plastico, 0, -0.08, 0);
    portaLuvas.add(tampa);
    portaLuvas.userData.acao = 'portaluvas';
    tampa.userData.acao = 'portaluvas';
    g.add(portaLuvas);
    const cookieMini = L().createCookieMesh('#d69249', '#3b1f10', { gotas: 5 });
    cookieMini.scale.setScalar(0.035);
    cookieMini.position.set(0.48, 0.72, -0.56);
    cookieMini.visible = false;
    g.add(cookieMini);

    // Bancos
    const banco = (x) => {
      const b = new THREE.Group();
      b.add(box(0.5, 0.12, 0.5, tecido, 0, 0.42, 0.15));
      const enc = box(0.5, 0.62, 0.12, tecido, 0, 0.78, 0.45);
      enc.rotation.x = -0.15;
      b.add(enc);
      if (!o.estatico) b.add(box(0.28, 0.18, 0.1, tecido, 0, 1.2, 0.52));
      b.position.x = x;
      return b;
    };
    g.add(banco(-0.42));
    g.add(banco(0.42));
    // Banco de trás
    g.add(box(1.4, 0.15, 0.5, tecido, 0, 0.42, 1.2));
    g.add(box(1.4, 0.6, 0.12, tecido, 0, 0.75, 1.45));

    // Estrutura: teto, colunas, portas
    g.add(box(1.9, 0.04, 2.6, M.std('#2a2c33', 0.95), 0, 1.5, 0.2));
    const barra = (a, b, esp, mat) => {
      const va = new THREE.Vector3(...a);
      const vb = new THREE.Vector3(...b);
      const len = va.distanceTo(vb);
      const m = new THREE.Mesh(new THREE.BoxGeometry(esp, len, esp), mat);
      m.position.copy(va).add(vb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      m.castShadow = true;
      return m;
    };
    [-1, 1].forEach((s) => {
      g.add(barra([s * 0.9, 1.0, -1.02], [s * 0.82, 1.5, -0.32], 0.08, plastico));
      g.add(box(0.06, 0.45, 1.8, M.std('#14161b', 0.8), s * 0.95, 0.72, 0.2));
      g.add(box(0.05, 0.03, 1.6, azul, s * 0.93, 0.96, 0.2));
      g.add(box(0.06, 0.05, 1.8, plastico, s * 0.95, 1.48, 0.2));
      g.add(box(0.06, 0.05, 0.05, plastico, s * 0.95, 1.2, 0.35));
    });

    // Para-brisa (vidro com leve reflexo)
    const vidro = plane(1.8, 0.62, new THREE.MeshPhysicalMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.0, clearcoat: 1, depthWrite: false }), 0, 1.22, -0.98);
    vidro.rotation.x = -0.65;
    vidro.userData.noOutline = true;
    g.add(vidro);

    // Retrovisor com render target real
    const rt = new THREE.WebGLRenderTarget(320, 120);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.repeat.x = -1;
    rt.texture.offset.x = 1;
    const retro = new THREE.Group();
    retro.position.set(0.02, 1.36, -0.72);
    retro.rotation.y = 0.18;
    retro.add(box(0.27, 0.085, 0.03, plastico, 0, 0, 0));
    const espelho = plane(0.25, 0.07, o.estatico ? M.std('#1e293b', 0.05, 0.9) : new THREE.MeshBasicMaterial({ map: rt.texture }), 0, 0, 0.017);
    espelho.userData.acao = 'retrovisor';
    retro.add(espelho);
    retro.add(box(0.02, 0.07, 0.02, plastico, 0, 0.07, -0.02));
    retro.userData.acao = 'retrovisor';
    retro.visible = !o.estatico; // nas cenas de história a câmera fica onde está o retrovisor
    g.add(retro);
    const camRetro = new THREE.PerspectiveCamera(48, 320 / 120, 0.05, 60);
    camRetro.position.set(0, 1.25, -0.55);
    camRetro.lookAt(0, 1.0, 2.5);

    // Gato no banco de trás (se já foi visto na história)
    if ((root.LuiggiSave?.state?.gatosVistos || []).length > 0) {
      const gato = L().createCatMesh();
      gato.scale.setScalar(0.7);
      gato.position.set(-0.35, 0.5, 1.15);
      gato.rotation.y = Math.PI;
      g.add(gato);
    }

    // Luz azul dos instrumentos + luz de teto fraca
    const luzPainel = new THREE.PointLight('#5b8cff', 3.2, 3, 1.4);
    luzPainel.position.set(-0.2, 1.0, -0.4);
    g.add(luzPainel);
    const luzTeto = new THREE.PointLight('#ffd9a8', 1.6, 3, 1.4);
    luzTeto.position.set(0, 1.45, 0.2);
    g.add(luzTeto);
    const h = halo('#3b82f6', 0.25, 0.5);
    h.position.set(-0.38, 0.99, -0.6);
    g.add(h);

    return { group: g, volante, gauges, radioTex, portaLuvas, cookieMini, retro, rt, camRetro };
  }

  function desenharGauges(tex, rpm, vel) {
    const ctx = tex.userData.ctx;
    const w = 512;
    const h = 200;
    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, w, h);
    const gauge = (cx, val, max, label, cor) => {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, 112, 74, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      ctx.strokeStyle = cor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, 112, 74, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, val / max));
      ctx.stroke();
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.75 + (Math.PI * 1.5 * i) / 8;
        ctx.strokeStyle = i >= 7 && label === 'RPM' ? '#ef4444' : '#93c5fd';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 60, 112 + Math.sin(a) * 60);
        ctx.lineTo(cx + Math.cos(a) * 68, 112 + Math.sin(a) * 68);
        ctx.stroke();
      }
      const a = Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, val / max);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, 112);
      ctx.lineTo(cx + Math.cos(a) * 62, 112 + Math.sin(a) * 62);
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, 150);
    };
    gauge(110, rpm, 8000, 'RPM', '#3b82f6');
    gauge(402, vel, 240, 'km/h', '#3b82f6');
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 256, 90);
    ctx.font = '13px monospace';
    ctx.fillText('BOXER 2.0 · SAFEPOINT', 256, 118);
    tex.needsUpdate = true;
  }

  function desenharRadio(tex, estilo, t) {
    const ctx = tex.userData.ctx;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('📻 ' + (NOMES_RADIO[estilo] || estilo.toUpperCase()), 128, 44);
    for (let i = 0; i < 16; i++) {
      const hh = 8 + Math.abs(Math.sin(t * 6 + i * 0.7)) * 38;
      ctx.fillStyle = i % 2 ? '#0ea5e9' : '#a855f7';
      ctx.fillRect(16 + i * 14.5, 112 - hh, 10, hh);
    }
    tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------
  // CENA DO SAFEPOINT
  // ------------------------------------------------------------------
  function abrirSubaruSafepoint(chave = 'intro') {
    return new Promise((resolve) => {
      const ov = document.getElementById('safepoint-overlay');
      const data = root.LuiggiData.cache;
      const save = root.LuiggiSave;
      const info = CONVERSAS_CARRO[chave] || CONVERSAS_CARRO[0];
      const fabricio = data.personagemMap.get('fabricio');
      const luis = data.personagemMap.get('luis');

      root.LuiggiAudio.tocarEstiloSintetizado('lofi', 98);
      ov.classList.remove('hidden');
      ov.innerHTML = `
        <div class="sp3d-shell">
          <div class="sp3d-view" id="sp3d-view"></div>
          <div class="sp3d-topbar">
            <div class="sp3d-local"><span class="sp3d-pin">📍</span> ${info.titulo}<small>Banco do motorista · POV Luis</small></div>
            <div class="btn-row">
              <button class="mini-btn" id="pov-museum">🏛️ Museu</button>
              <button class="mini-btn" id="pov-hero">🎸 Hero</button>
              <button class="mini-btn" id="pov-cookies">🍪 Cookies</button>
              <button class="mini-btn" id="pov-menu">🏠 Menu</button>
            </div>
          </div>
          <div class="sp3d-tooltip hidden" id="sp3d-tip"></div>
          <div class="sp3d-dialog">
            <div class="sp3d-portrait" id="sp3d-portrait"></div>
            <div class="sp3d-body">
              <div class="sp3d-speaker" id="pov-speaker"></div>
              <div class="sp3d-text" id="pov-text"></div>
              <div class="sp3d-gadgets">
                <button class="chip-btn" data-acao="volante">🛞 Acelerar</button>
                <button class="chip-btn" data-acao="radio">📻 <span id="pov-radio-lbl">Rádio</span></button>
                <button class="chip-btn" data-acao="portaluvas">🍪 Porta-luvas</button>
                <button class="chip-btn" data-acao="retrovisor">🪞 Retrovisor</button>
              </div>
            </div>
            <div class="sp3d-actions" id="pov-actions"></div>
          </div>
        </div>`;

      const view = document.getElementById('sp3d-view');
      const txtEl = document.getElementById('pov-text');
      const spkEl = document.getElementById('pov-speaker');
      const portraitEl = document.getElementById('sp3d-portrait');
      const actionsEl = document.getElementById('pov-actions');
      const tip = document.getElementById('sp3d-tip');

      // ---------- 3D ----------
      let stage = null;
      let interior = null;
      let card = null;
      let env = null;
      const st3 = { rpm: 850, rpmAlvo: 850, radio: 0, portaAberta: false, lookX: 0, lookY: 0, focoFab: false, gaugeT: 0, radioT: 0, mirrorT: 0 };
      if (L()?.hasThree()) {
        stage = L().createStage(view, { radius: '0', fov: 68, near: 0.02, far: 400, fillIntensity: 0.6, fillColor: '#9fb4ff' });
      }
      if (stage) {
        const THREE = root.THREE;
        env = root.Luiggi3DEnv.build('safepoint', { semSubaru: true, raio: 9, arco: Math.PI * 0.62 });
        env.group.position.z = 2.5;
        stage.scene.add(env.group);
        root.Luiggi3DEnv.aplicar(stage, env);
        stage.setGrade(env.foto ? { vignette: 0.7, bloom: 0.5, threshold: 1.4 } : { vignette: 0.85, bloom: 1.1 });
        interior = construirInterior();
        stage.scene.add(interior.group);
        card = L().createCharacterCard(fabricio, { altura: 0.98, tint: env.foto ? '#ffffff' : '#dfe6ff', emotes: false });
        card.group.position.set(0.5, 0.52, -0.02);
        stage.scene.add(card.group);
        stage.camera.position.set(-0.38, 1.2, 0.18);
        const look = new THREE.Vector3(0.1, 1.05, -1);
        const lookAlvo = new THREE.Vector3();
        const picker = L().createPicker(stage);
        const clicaveis = [interior.volante, interior.retro, interior.portaLuvas, card.group];
        interior.group.traverse((o) => o.userData.acao === 'radio' && clicaveis.push(o));

        const acaoDe = (hit) => {
          let o = hit?.object;
          while (o) {
            if (o.userData.acao) return o.userData.acao;
            if (o === card.group) return 'fabricio';
            o = o.parent;
          }
          return null;
        };
        const NOMES = { volante: '🛞 Volante — acelerar o boxer', radio: '📻 Rádio LuiggiBeats', portaluvas: '🍪 Porta-luvas (47 fornadas)', retrovisor: '🪞 Retrovisor', fabricio: '🎧 Fabricio' };
        view.addEventListener('pointermove', (e) => {
          const r = view.getBoundingClientRect();
          st3.lookX = ((e.clientX - r.left) / r.width - 0.5) * 2;
          st3.lookY = ((e.clientY - r.top) / r.height - 0.5) * 2;
          const a = acaoDe(picker.pick(e, clicaveis));
          view.style.cursor = a ? 'pointer' : '';
          if (a) {
            tip.textContent = NOMES[a];
            tip.style.left = `${e.clientX - r.left + 14}px`;
            tip.style.top = `${e.clientY - r.top + 14}px`;
            tip.classList.remove('hidden');
          } else tip.classList.add('hidden');
        });
        view.addEventListener('pointerdown', (e) => {
          const a = acaoDe(picker.pick(e, clicaveis));
          if (a) interagir(a);
        });

        desenharGauges(interior.gauges, 850, 0);
        stage.start((dt, t) => {
          env.update(dt, t);
          card.update(dt, stage.camera);
          // Olhar: segue o mouse e vira para o Fabricio quando ele fala
          if (st3.focoFab) lookAlvo.set(0.42 + st3.lookX * 0.25, 1.12 - st3.lookY * 0.12, -0.42);
          else lookAlvo.set(0.12 + st3.lookX * 0.45, 1.06 - st3.lookY * 0.22, -1);
          L().U.dampVec3(look, lookAlvo, 3.2, dt);
          stage.camera.position.y = 1.2 + Math.sin(t * 1.6) * 0.003 + (st3.rpm > 2500 ? (Math.random() - 0.5) * 0.004 : 0);
          stage.camera.lookAt(look);
          // Motor
          st3.rpmAlvo = L().U.damp(st3.rpmAlvo, 850, 1.2, dt);
          st3.rpm = L().U.damp(st3.rpm, st3.rpmAlvo, 6, dt) + Math.sin(t * 30) * 12;
          interior.volante.rotation.z = L().U.damp(interior.volante.rotation.z, 0, 4, dt);
          st3.gaugeT += dt;
          if (st3.gaugeT > 0.05) {
            st3.gaugeT = 0;
            desenharGauges(interior.gauges, st3.rpm, 0);
          }
          st3.radioT += dt;
          if (st3.radioT > 0.08) {
            st3.radioT = 0;
            desenharRadio(interior.radioTex, ESTILOS_RADIO[st3.radio], t);
          }
          // Porta-luvas
          interior.portaLuvas.rotation.x = L().U.damp(interior.portaLuvas.rotation.x, st3.portaAberta ? 1.1 : 0, 6, dt);
          // Retrovisor (renderiza a cada 2 quadros)
          st3.mirrorT++;
          if (st3.mirrorT % 2 === 0) {
            interior.retro.visible = false;
            stage.renderTo(interior.rt, stage.scene, interior.camRetro);
            interior.retro.visible = true;
          }
        });
      }

      function falar(texto) {
        txtEl.textContent = texto;
      }

      function interagir(acao) {
        if (acao === 'volante') {
          root.LuiggiAudio.playSFX('boxer');
          st3.rpmAlvo = 6200;
          if (interior) interior.volante.rotation.z = 0.25;
          if (stage) stage.shake(0.012, 3);
          falar('*VRUMM VRUMMM!* Fabricio: "Motor boxer roncando lindo até parado no Safepoint!"');
          if (card) card.setExpression('feliz');
        } else if (acao === 'retrovisor') {
          root.LuiggiAudio.playSFX('blip');
          falar(
            save.state.gatosVistos.length > 0
              ? 'Você olha no retrovisor... o gato da Luiza tá no banco de trás te encarando.'
              : 'Luis olha no retrovisor: "Olheiras de quem só dorme depois das 4h da manhã..."'
          );
          if (stage) {
            st3.focoFab = false;
            stage.pulseGrade('vignette', 1.2, 1.2, 0.85);
          }
        } else if (acao === 'radio') {
          st3.radio = (st3.radio + 1) % ESTILOS_RADIO.length;
          root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[st3.radio], 122);
          document.getElementById('pov-radio-lbl').textContent = NOMES_RADIO[ESTILOS_RADIO[st3.radio]];
        } else if (acao === 'portaluvas') {
          root.LuiggiAudio.playSFX('forno');
          st3.portaAberta = !st3.portaAberta;
          if (interior) interior.cookieMini.visible = st3.portaAberta;
          falar('Luis pega um cookie do porta-luvas. Fabricio: "Me dá um aí, Tico!"');
          if (card) card.setExpression('feliz');
        } else if (acao === 'fabricio') {
          root.LuiggiAudio.playSFX('blip');
          st3.focoFab = true;
          if (card) card.setExpression('feliz');
        }
      }

      ov.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => interagir(b.dataset.acao)));

      let falaIdx = 0;
      let typer = null;

      function mostrarFala() {
        const cur = info.falas[falaIdx];
        const fabFala = cur.quem === 'fabricio';
        spkEl.textContent = fabFala ? '🎧 Fabricio Venturi · passageiro' : '🧢 Luis Felipe · você, no volante';
        st3.focoFab = fabFala;
        if (card) {
          card.setSpeaking(fabFala);
          card.setExpression(fabFala ? cur.expr : 'neutro');
          card.setDim(!fabFala);
        }
        portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(fabFala ? fabricio : luis, { expressao: cur.expr, speaking: true });
        if (cur.expr === 'chocado' || cur.expr === 'bravo') stage?.shake(0.02, 5);
        clearInterval(typer);
        txtEl.textContent = '';
        let i = 0;
        const speed = save.state.config.velocidadeTexto ?? 24;
        typer = setInterval(() => {
          if (i >= cur.fala.length) return clearInterval(typer);
          txtEl.textContent += cur.fala[i++];
          if (i % 3 === 0) root.LuiggiAudio.playSFX('blip');
        }, Math.max(8, speed));
        const ultima = falaIdx >= info.falas.length - 1;
        actionsEl.innerHTML = ultima
          ? `<button class="mg-btn primary" id="pov-go-story">${info.proximoLabel} ▶</button>`
          : `<button class="mg-btn primary" id="pov-next-line">Continuar ▶</button>`;
        const next = document.getElementById('pov-next-line');
        if (next) next.addEventListener('click', avancar);
        const go = document.getElementById('pov-go-story');
        if (go) go.addEventListener('click', sair);
      }

      function avancar() {
        const cur = info.falas[falaIdx];
        if (txtEl.textContent.length < cur.fala.length && txtEl.textContent !== cur.fala) {
          clearInterval(typer);
          txtEl.textContent = cur.fala;
          return;
        }
        if (falaIdx < info.falas.length - 1) {
          root.LuiggiAudio.playSFX('blip');
          falaIdx++;
          mostrarFala();
        }
      }

      function onKey(e) {
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        if (document.getElementById('minigame-overlay')?.classList.contains('hidden') === false) return;
        if (document.getElementById('museum-overlay')?.classList.contains('hidden') === false) return;
        e.preventDefault();
        if (falaIdx >= info.falas.length - 1 && txtEl.textContent === info.falas[falaIdx].fala) sair();
        else avancar();
      }
      window.addEventListener('keydown', onKey);

      function limpar() {
        window.removeEventListener('keydown', onKey);
        clearInterval(typer);
        if (stage) {
          interior?.rt.dispose();
          stage.dispose();
        }
        ov.classList.add('hidden');
        ov.innerHTML = '';
      }

      function sair() {
        limpar();
        root.LuiggiAudio.pararMusica();
        resolve();
      }

      document.getElementById('pov-museum').addEventListener('click', () => root.LuiggiMuseum.abrirMuseu('saguao'));
      document.getElementById('pov-hero').addEventListener('click', () => root.LuiggiRhythm.abrirLuiggiBeatsHero());
      document.getElementById('pov-cookies').addEventListener('click', () => root.LuiggiCookies.abrirFabricaCookies('livre'));
      document.getElementById('pov-menu').addEventListener('click', () => {
        limpar();
        root.LuiggiAudio.pararMusica();
        root.LuiggiStory3D?.retomar();
        root.LuiggiGame.mostrarMenuPrincipal();
      });

      mostrarFala();
    });
  }

  // ------------------------------------------------------------------
  // FINAL: VOLTANDO PARA CASA COM O SUBARU AZUL (amanhecer)
  // ------------------------------------------------------------------
  function cenaVoltaPraCasa(host, duracao = 9) {
    if (!L()?.hasThree()) return null;
    const THREE = root.THREE;
    const { M, textures, plane, box, createSubaruMesh, addHeadlights } = L();
    const stage = L().createStage(host, { radius: '14px', fov: 50, bg: 0x0b1229 });
    if (!stage) return null;
    const H = root.Luiggi3DEnv.helpers;
    const g = new THREE.Group();
    stage.scene.add(g);
    const ceuMesh = H.ceu(g, [
      [0, '#0b1229'],
      [0.5, '#2b3a78'],
      [0.75, '#f59e8b'],
      [1, '#fde7c2']
    ]);
    const estrelas = H.estrelas(g, 300, 100);
    const pista = plane(10, 400, M.std('#ffffff', 0.4, 0.2, { map: textures.asphalt(2, 60) }), 0, 0, -150);
    pista.rotation.x = -Math.PI / 2;
    g.add(pista);
    const grama = plane(400, 400, M.std('#1f2a1c', 0.95), 0, -0.02, -150);
    grama.rotation.x = -Math.PI / 2;
    g.add(grama);
    H.cidade(g, { n: 60, linha: [-160, 160], z: -170, prof: 30, hMin: 6, hMax: 30, lit: 0.3 });
    const postes = [];
    for (let i = 0; i < 14; i++) {
      const pg = new THREE.Group();
      H.poste(pg, 6, 0, '#ffc074', { lado: -1, altura: 5, luz: i < 4, intensidade: 10 });
      pg.position.z = -i * 22;
      g.add(pg);
      postes.push(pg);
    }
    const sub = createSubaruMesh(root.LuiggiSave?.state?.subaruMods?.cor || '#1245A8', !!root.LuiggiSave?.state?.subaruMods?.neon);
    sub.rotation.y = Math.PI;
    sub.position.set(-1.6, 0, 0);
    addHeadlights(sub, 26, 30);
    g.add(sub);
    const sol = L().sphere(6, M.glow('#ffd29a', 2), 30, -4, -190, 24);
    g.add(sol);
    stage.scene.fog = new THREE.FogExp2(0x24305e, 0.008);
    stage.setGrade({ bloom: 1.1, vignette: 0.6 });
    let t0 = 0;
    stage.start((dt, t) => {
      t0 += dt;
      const k = Math.min(1, t0 / duracao);
      sub.userData.wheels.forEach((w) => (w.rotation.x -= dt * 22));
      sub.position.y = Math.sin(t * 18) * 0.008;
      postes.forEach((p) => {
        p.position.z += dt * 18;
        if (p.position.z > 12) p.position.z -= 14 * 22;
      });
      // Amanhecer
      sol.position.y = -4 + k * 16;
      estrelas.material.opacity = 1 - k;
      estrelas.material.transparent = true;
      stage.scene.fog.color.set('#24305e').lerp(new THREE.Color('#e7a98f'), k);
      stage.hemiLight.intensity = 0.4 + k * 0.9;
      stage.hemiLight.color.set('#3b4a8a').lerp(new THREE.Color('#ffd7b0'), k);
      ceuMesh.rotation.x = -k * 0.15;
      const ang = t * 0.15;
      stage.camera.position.set(-1.6 + Math.sin(ang) * 5.5, 1.6 + Math.sin(t * 0.3) * 0.2, 5.5 + Math.cos(ang) * 1.5);
      stage.camera.lookAt(-1.6, 0.8, -2);
    });
    return stage;
  }

  root.LuiggiSubaruPOV = { abrirSubaruSafepoint, cenaVoltaPraCasa, construirInterior };
})(window);
