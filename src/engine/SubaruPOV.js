/**
 * src/engine/SubaruPOV.js
 * O Subaru Legacy azul por dentro.
 *
 * - Safepoint: POV do Luis no banco do motorista entre os capítulos, com o Fabricio no passageiro
 *   e o Mateus Buse SEMPRE no banco de trás (atrás do passageiro). O mouse mexe o olhar: nas bordas
 *   dá pra virar a cabeça pros lados e pra trás pra ver o Mateus.
 * - Momento Resenha (menu): ficar no carro ouvindo música com o Fabricio e o Mateus, trocando o POV
 *   entre Luis (motorista), Fabricio (passageiro) e Mateus (banco de trás).
 * - Interações (clique no objeto 3D ou nos atalhos): volante (boxer), buzina, rádio, porta-luvas (cookie),
 *   retrovisor e o compartimento entre os bancos da frente, que só tem caixinhas de Tic Tac branco:
 *   abrir sempre faz o Mateus e o Fabricio rirem juntos ("kkkkkkkkkk").
 * - criarControleCarro() também é usado pelas cenas de história dentro do carro (StoryStage3D).
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
        { quem: 'luis', expr: 'envergonhado', fala: 'E o Vitor ajoelhado na chuva pra pararem de zoar a Amanda Becker... e a Maria Clara só querendo saber de mangá e das meninas da arquibancada.' },
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

  /**
   * Lugares no Subaru (frente = -z). O Mateus Buse SEMPRE vai no banco de trás, atrás do passageiro.
   * olho: posição da câmera em primeira pessoa; carta: onde o personagem fica sentado.
   */
  const LUGARES = {
    luis: { olho: [-0.38, 1.2, 0.18], carta: [-0.47, 0.52, -0.02], altura: 0.98, nome: 'Luis', papel: 'banco do motorista', icone: '🧢' },
    fabricio: { olho: [0.42, 1.2, 0.18], carta: [0.5, 0.52, -0.02], altura: 0.98, nome: 'Fabricio', papel: 'banco do passageiro', icone: '🎧' },
    mateus_buse: { olho: [0.36, 1.27, 1.2], carta: [0.4, 0.32, 1.12], altura: 1.02, nome: 'Mateus Buse', papel: 'banco de trás, atrás do passageiro', icone: '🔇' }
  };
  // Até onde dá pra virar a cabeça em cada banco (yaw positivo = direita)
  const OLHAR = {
    luis: { base: 0.3, yawMin: -1.7, yawMax: 2.75 },
    fabricio: { base: -0.2, yawMin: -3.7, yawMax: 1.7 },
    mateus_buse: { base: -0.22, yawMin: -1.9, yawMax: 1.5 }
  };
  const PONTOS_OLHAR = {
    console: [0, 0.5, 0.15],
    mateus_buse: [0.4, 0.95, 1.12],
    fabricio: [0.5, 1.0, -0.02],
    luis: [-0.47, 1.0, -0.02]
  };
  const NOMES_ACAO = {
    volante: '🛞 Volante · acelerar o boxer',
    buzina: '📣 Buzina',
    radio: '📻 Rádio LuiggiBeats · próxima',
    radio_prev: '⏮ Rádio · voltar faixa',
    radio_next: '⏭ Rádio · próxima faixa',
    radio_toggle: '⏯ Rádio · tocar / pausar',
    porta: '🚪 Porta',
    entrar_carro: '🚗 Subaru Legacy · entrar',
    portaluvas: '🍪 Porta-luvas',
    tictac: '🍬 Compartimento entre os bancos',
    retrovisor: '🪞 Retrovisor',
    fabricio: '🎧 Fabricio',
    luis: '🧢 Luis',
    mateus_buse: '🔇 Mateus Buse · banco de trás'
  };
  const FALAS_MATEUS = ['🔇 (microfone mutado)', 'kkkkkkkkkk', '*aponta pro compartimento dos Tic Tacs*', '*ri em silêncio no banco de trás*', '🔇 ...'];

  // ------------------------------------------------------------------
  // INTERIOR DO SUBARU (frente = -z)
  // ------------------------------------------------------------------
  function construirInterior(o = {}) {
    // Modelo novo e detalhado (SubaruLegacy3D.js); o de baixo fica de reserva
    if (root.LuiggiSubaruLegacy) return root.LuiggiSubaruLegacy.construir(o);
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
    hub.userData.acao = 'buzina';
    volante.add(hub);
    const coluna = cyl(0.03, 0.04, 0.3, plastico, 0, 0, -0.16, 10);
    coluna.rotation.x = Math.PI / 2;
    volante.add(coluna);
    volante.userData.acao = 'volante';
    g.add(volante);

    // Console central + rádio
    const consoleCentral = box(0.36, 0.5, 0.5, plastico, 0, 0.62, -0.62);
    consoleCentral.userData.acao = 'radio';
    g.add(consoleCentral);
    const radioTex = L().makeCanvasTex(256, 128, () => { });
    const radio = plane(0.24, 0.12, M.basic('#ffffff', { map: radioTex }), 0, 0.83, -0.505);
    radio.material.color.multiplyScalar(1.4);
    radio.userData.acao = 'radio';
    g.add(radio);
    g.add(box(0.36, 0.12, 0.42, couro, 0, 0.52, -0.29));

    // Compartimento entre o banco do motorista e o do passageiro: abre e só tem Tic Tac branco
    const comp = new THREE.Group();
    comp.position.set(0, 0, 0.17);
    comp.userData.acao = 'tictac';
    const fundoComp = M.std('#07080b', 0.9);
    comp.add(box(0.36, 0.1, 0.5, couro, 0, 0.41, 0));
    comp.add(box(0.33, 0.02, 0.47, fundoComp, 0, 0.47, 0, { cast: false }));
    [-1, 1].forEach((s) => {
      comp.add(box(0.02, 0.12, 0.5, couro, s * 0.17, 0.53, 0));
      comp.add(box(0.36, 0.12, 0.02, couro, 0, 0.53, s * 0.24));
    });
    const rotulo = textures.text('tic tac', { w: 256, h: 150, size: 74, color: '#15803d', bg: '#ffffff', radius: 26 });
    const plasticoTT = M.std('#f8fafc', 0.3, 0, { transparent: true, opacity: 0.93 });
    const tampaTT = M.std('#ffffff', 0.5);
    const geoTT = new THREE.BoxGeometry(0.068, 0.017, 0.04);
    const matsTT = [plasticoTT, plasticoTT, M.basic('#ffffff', { map: rotulo }), plasticoTT, plasticoTT, plasticoTT];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) {
        const tt = new THREE.Mesh(geoTT, matsTT);
        tt.position.set(-0.12 + c * 0.08 + (Math.random() - 0.5) * 0.008, 0.489, -0.2 + r * 0.056 + (Math.random() - 0.5) * 0.008);
        tt.rotation.y = (Math.random() - 0.5) * 0.25;
        comp.add(tt);
        const tampinha = box(0.012, 0.018, 0.038, tampaTT, 0.034, 0, 0, { cast: false });
        tt.add(tampinha);
        if (Math.random() < 0.35) {
          const cima = tt.clone();
          cima.position.y += 0.018;
          cima.rotation.y += (Math.random() - 0.5) * 0.6;
          comp.add(cima);
        }
      }
    }
    g.add(comp);
    // Tampa (dobradiça na parte de trás, abre pra cima)
    const consoleTampa = new THREE.Group();
    consoleTampa.position.set(0, 0.61, 0.42);
    consoleTampa.userData.acao = 'tictac';
    const tampaComp = box(0.37, 0.04, 0.5, couro, 0, 0, -0.25);
    tampaComp.userData.acao = 'tictac';
    consoleTampa.add(tampaComp);
    g.add(consoleTampa);
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

    // Assoalho: carpete, tapetes, túnel do câmbio, parede de fogo e pedais
    const carpete = M.std('#ffffff', 1, 0, {
      map: L().makeCanvasTex(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#1b1d22';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = ['#23262c', '#15171b', '#202329', '#2a2d34'][i % 4];
          ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
      }, 6, 8)
    });
    const borracha = M.std('#0d0e11', 0.9);
    g.add(box(1.86, 0.04, 2.72, carpete, 0, 0.28, 0.24));
    // Parede de fogo (entre o painel e o assoalho) e lateral dos pés
    g.add(box(1.86, 0.5, 0.05, carpete, 0, 0.53, -1.07));
    const rampa = box(1.86, 0.04, 0.42, carpete, 0, 0.36, -0.9);
    rampa.rotation.x = 0.42;
    g.add(rampa);
    // Túnel central entre os bancos da frente e o de trás
    g.add(box(0.3, 0.1, 1.5, carpete, 0, 0.34, 0.2));
    // Tapetes de borracha
    [-0.42, 0.42].forEach((x) => g.add(box(0.5, 0.012, 0.55, borracha, x, 0.306, -0.5, { cast: false })));
    [-0.42, 0.42].forEach((x) => g.add(box(0.48, 0.012, 0.36, borracha, x, 0.306, 0.78, { cast: false })));
    // Pedais (embreagem, freio, acelerador)
    [[-0.54, 0.07, 0.07], [-0.4, 0.08, 0.07], [-0.24, 0.05, 0.12]].forEach(([x, w, h]) => {
      const p = box(w, h, 0.018, M.std('#2b2e35', 0.4, 0.7), x, 0.42, -0.86);
      p.rotation.x = -0.45;
      g.add(p);
      g.add(box(0.015, 0.2, 0.015, M.std('#1f2228', 0.5, 0.6), x, 0.55, -0.9));
    });
    // Trilhos e base dos bancos da frente; base do banco de trás
    [-0.42, 0.42].forEach((x) => {
      g.add(box(0.42, 0.08, 0.44, plastico, x, 0.33, 0.15));
      [-0.15, 0.15].forEach((dx) => g.add(box(0.03, 0.02, 0.6, M.std('#3a3d44', 0.4, 0.8), x + dx, 0.31, 0.15, { cast: false })));
    });
    g.add(box(1.4, 0.07, 0.5, tecido, 0, 0.33, 1.2));
    // Parte de baixo das portas, colunas dos pés e laterais traseiras (fecha o carro até o assoalho)
    [-1, 1].forEach((s) => {
      g.add(box(0.06, 0.22, 1.8, M.std('#14161b', 0.8), s * 0.95, 0.39, 0.2));
      g.add(box(0.06, 0.7, 0.36, plastico, s * 0.93, 0.62, -0.88));
      g.add(box(0.06, 0.62, 0.5, plastico, s * 0.93, 0.6, 1.36));
      // Soleira com detalhe azul
      g.add(box(0.1, 0.03, 1.7, plastico, s * 0.89, 0.31, 0.2, { cast: false }));
    });

    // Capô azul com a tomada de ar (aparece pelo para-brisa) e retrovisores externos
    const capo = box(1.72, 0.06, 1.55, azul, 0, 0.96, -1.85);
    capo.rotation.x = -0.07;
    g.add(capo);
    const tomada = box(0.5, 0.07, 0.4, azul, 0, 1.0, -1.5);
    tomada.rotation.x = -0.12;
    g.add(tomada);
    g.add(box(0.42, 0.03, 0.02, plastico, 0, 1.01, -1.3, { cast: false }));
    g.add(box(1.8, 0.05, 0.14, plastico, 0, 0.99, -1.06));
    [-1, 1].forEach((s) => {
      g.add(box(0.12, 0.05, 0.08, azul, s * 0.98, 0.98, -0.66));
      g.add(box(0.2, 0.12, 0.09, azul, s * 1.09, 1.03, -0.68));
      g.add(plane(0.17, 0.09, M.std('#9fb1c9', 0.05, 0.9), s * 1.09, 1.03, -0.633));
    });

    // Estrutura: teto, colunas, portas
    // Teto termina na travessa do para-brisa (antes ia até o painel e escondia tudo acima de ~3 m lá fora)
    g.add(box(1.9, 0.04, 2.02, M.std('#2a2c33', 0.95), 0, 1.5, 0.56));
    g.add(box(1.86, 0.07, 0.12, plastico, 0, 1.47, -0.47));
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
      g.add(barra([s * 0.9, 1.0, -1.04], [s * 0.84, 1.49, -0.46], 0.08, plastico));
      g.add(box(0.06, 0.45, 1.8, M.std('#14161b', 0.8), s * 0.95, 0.72, 0.2));
      g.add(box(0.05, 0.03, 1.6, azul, s * 0.93, 0.96, 0.2));
      g.add(box(0.06, 0.05, 1.8, plastico, s * 0.95, 1.48, 0.2));
    });

    // Traseira: colunas, moldura e vidro traseiro (olhando pra trás dá pra ver que é um carro)
    g.add(box(1.9, 0.08, 0.1, plastico, 0, 1.47, 1.56));
    g.add(box(1.9, 0.12, 0.1, plastico, 0, 0.86, 1.6));
    [-1, 1].forEach((s) => {
      g.add(barra([s * 0.86, 0.9, 1.62], [s * 0.8, 1.48, 1.5], 0.16, plastico));
      g.add(barra([s * 0.93, 0.98, 0.72], [s * 0.88, 1.48, 0.62], 0.06, plastico));
    });
    const vidroTras = plane(1.6, 0.6, new THREE.MeshPhysicalMaterial({ color: 0x8fa4c8, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, depthWrite: false }), 0, 1.18, 1.57);
    vidroTras.rotation.x = 0.35;
    vidroTras.userData.noOutline = true;
    g.add(vidroTras);
    const luzTras = new THREE.PointLight('#ffd9a8', 1.1, 2.4, 1.4);
    luzTras.position.set(0.2, 1.42, 1.0);
    g.add(luzTras);

    // Para-brisa (vidro com leve reflexo)
    const vidro = plane(1.8, 0.8, new THREE.MeshPhysicalMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.0, clearcoat: 1, depthWrite: false }), 0, 1.24, -0.76);
    vidro.rotation.x = 0.89;
    vidro.userData.noOutline = true;
    g.add(vidro);

    // Retrovisor com render target real
    const rt = new THREE.WebGLRenderTarget(320, 120);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.repeat.x = -1;
    rt.texture.offset.x = 1;
    const retro = new THREE.Group();
    retro.position.set(0.02, 1.37, -0.5);
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

    return { group: g, volante, gauges, radioTex, portaLuvas, cookieMini, consoleTampa, retro, rt, camRetro };
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

  function desenharRadio(tex, estilo, t, tocando = true) {
    const ctx = tex.userData.ctx;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 128);
    const cloud = root.LuiggiCloud?.ativo ? root.LuiggiCloud : null;
    const f = cloud?.faixa;
    if (cloud) tocando = cloud.tocando;
    // Barra de status: fonte (bluetooth do celular ou FM) e play/pause
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(f ? 'BT · LUIGGICLOUD' : 'FM · LUIGGIBEATS', 10, 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = tocando ? '#22c55e' : '#f59e0b';
    ctx.fillText(tocando ? '▶ PLAY' : '❚❚ PAUSE', 246, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    const nome = f ? f.titulo : NOMES_RADIO[estilo] || estilo.toUpperCase();
    const largura = ctx.measureText(nome).width;
    const x = largura > 230 ? 128 + ((240 - largura) / 2) * Math.sin(t * 0.6) : 128;
    ctx.fillText(nome, x, 42);
    if (f) {
      ctx.font = '13px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(f.artista, 128, 60);
    }
    for (let i = 0; i < 16; i++) {
      const hh = tocando ? 6 + Math.abs(Math.sin(t * 6 + i * 0.7)) * 30 : 3;
      ctx.fillStyle = i % 2 ? '#0ea5e9' : '#a855f7';
      ctx.fillRect(16 + i * 14.5, 104 - hh, 10, hh);
    }
    // Progresso da faixa
    const dur = f?.duracao || 0;
    const k = dur ? Math.min(1, (cloud.posicao || 0) / dur) : (t * 0.02) % 1;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 114, 224, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(16, 114, 224 * k, 4);
    tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------
  // CONTROLE DO CARRO (compartilhado: Safepoint, Momento Resenha e cenas de história)
  // ------------------------------------------------------------------
  /** Lista dos objetos clicáveis (e visíveis) do interior. */
  function clicaveisDo(interior) {
    const lista = [];
    const visivel = (o) => {
      for (let p = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    // Objetos escondidos (ex.: retrovisor nas cenas de história, onde fica a câmera) não podem roubar o clique
    interior.group.traverse((o) => o.userData.acao && visivel(o) && lista.push(o));
    return lista;
  }

  /** Descobre a ação de um objeto atingido (sobe pelos pais; cartas de personagem viram o id). */
  function acaoDoObjeto(obj, cartas = {}) {
    let o = obj;
    while (o) {
      if (o.userData?.acao) return o.userData.acao;
      for (const id in cartas) if (cartas[id] && o === cartas[id].group) return id;
      o = o.parent;
    }
    return null;
  }

  /**
   * Estado e reações do Subaru. interagir(acao) anima, toca o som e devolve
   * { texto, interjeicao?, olhar? } para cada tela mostrar do seu jeito.
   */
  function criarControleCarro(interior, o = {}) {
    const U = () => L().U;
    // vel: velocidade do carro em m/s (o Momento Resenha preenche quando alguém dirige)
    const st = { rpm: 850, rpmAlvo: 850, vel: 0, radio: 0, portaAberta: false, consoleAberto: false, gaugeT: 0, radioT: 0, mateusIdx: 0, sintetizadoTocando: true, apertos: {} };
    const BOTAO_DA_ACAO = { radio_prev: 'prev', radio_next: 'next', radio_toggle: 'toggle', radio: 'next' };

    /** Afunda um botão físico do rádio por um instante. */
    function apertarBotao(acao) {
      const nome = BOTAO_DA_ACAO[acao] || acao;
      if (interior.botoesRadio?.[nome]) st.apertos[nome] = 0.18;
    }

    /** ⏯ do rádio: pausa ou solta o som (LuiggiCloud ou rádio sintetizado). */
    function alternarRadio() {
      const c = root.LuiggiCloud?.ativo ? root.LuiggiCloud : null;
      if (c) {
        const estava = c.tocando;
        if (estava) c.pause();
        else c.play();
        const f = c.faixa;
        return estava ? `⏸ Rádio pausado${f ? `: "${f.titulo}"` : ''}.` : `▶ Tocando${f ? ` "${f.titulo}" — ${f.artista}` : ''}.`;
      }
      if (st.sintetizadoTocando) {
        root.LuiggiAudio.pararMusica();
        st.sintetizadoTocando = false;
        return '⏸ Rádio desligado. Silêncio no Subaru… até alguém rir.';
      }
      root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[st.radio], 98);
      st.sintetizadoTocando = true;
      return `▶ ${NOMES_RADIO[ESTILOS_RADIO[st.radio]]}`;
    }

    function trocarRadio(passo = 1) {
      if (root.LuiggiCloud?.ativo) {
        if (passo < 0 && root.LuiggiCloud.anterior) root.LuiggiCloud.anterior(true);
        else root.LuiggiCloud.proxima();
        const f = root.LuiggiCloud.faixa;
        return f ? `📻 Tocando agora: "${f.titulo}" — ${f.artista}` : '📻 Rádio LuiggiBeats';
      }
      st.radio = (st.radio + passo + ESTILOS_RADIO.length) % ESTILOS_RADIO.length;
      root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[st.radio], 122);
      st.sintetizadoTocando = true;
      return `📻 ${NOMES_RADIO[ESTILOS_RADIO[st.radio]]}`;
    }

    /**
     * op.aberto: estado forçado de porta-luvas/compartimento (vem do anfitrião na Resenha Online).
     * op.remoto: a ação foi de outra pessoa (não conta conquista nem contador pra quem só viu).
     */
    function interagir(acao, op = {}) {
      const A = root.LuiggiAudio;
      if (acao === 'tictac') {
        st.consoleAberto = op.aberto !== undefined ? !!op.aberto : !st.consoleAberto;
        A.playSFX(st.consoleAberto ? 'tranca' : 'blip');
        if (!st.consoleAberto) return { texto: 'Compartimento fechado. Os Tic Tacs continuam lá dentro. Sempre estarão.' };
        if (!op.remoto) {
          root.LuiggiSave?.incrementarContador('ticTacs', 1);
          root.LuiggiAchievements?.desbloquear('so_tic_tac');
        }
        return {
          texto: 'Você abre o compartimento entre os bancos da frente: só caixinhas de Tic Tac branco. Várias. Mais nada.',
          interjeicao: { ids: ['mateus_buse', 'fabricio'], texto: 'kkkkkkkkkk', som: 'risada' },
          olhar: 'console'
        };
      }
      if (acao === 'volante') {
        A.playSFX('boxer');
        st.rpmAlvo = 6200;
        interior.volante.rotation.z = 0.25;
        o.stage?.shake?.(0.012, 3);
        return { texto: '*VRUMM VRUMMM!* O boxer ronca lindo até com o Subaru parado.' };
      }
      if (acao === 'buzina') {
        A.playSFX('buzina');
        o.stage?.shake?.(0.006, 4);
        return { texto: '*BII BIIII!* Alguém lá fora levou um susto.' };
      }
      if (acao === 'radio' || acao === 'radio_next') {
        apertarBotao(acao);
        return { texto: trocarRadio(1), radio: true };
      }
      if (acao === 'radio_prev') {
        apertarBotao(acao);
        return { texto: trocarRadio(-1), radio: true };
      }
      if (acao === 'radio_toggle') {
        apertarBotao(acao);
        return { texto: alternarRadio(), radio: true };
      }
      if (acao === 'porta' || acao === 'entrar_carro') {
        A.playSFX('blip');
        return { texto: 'Melhor deixar a porta fechada: a resenha tá boa aqui dentro.' };
      }
      if (acao === 'portaluvas') {
        A.playSFX('forno');
        st.portaAberta = op.aberto !== undefined ? !!op.aberto : !st.portaAberta;
        interior.cookieMini.visible = st.portaAberta;
        return { texto: st.portaAberta ? 'Porta-luvas aberto: um cookie de emergência. Fabricio: "Me dá um aí, Tico!"' : 'Porta-luvas fechado. O cheiro de baunilha fica.' };
      }
      if (acao === 'mateus_buse') {
        A.playSFX('blip');
        const fala = FALAS_MATEUS[st.mateusIdx++ % FALAS_MATEUS.length];
        return { texto: `Mateus Buse, no banco de trás: ${fala}`, interjeicao: { ids: ['mateus_buse'], texto: fala } };
      }
      if (acao === 'fabricio') {
        A.playSFX('blip');
        return { texto: 'Fabricio: "Que foi, Tico? Bora resenha!"' };
      }
      if (acao === 'luis') {
        A.playSFX('blip');
        return { texto: 'Luis: "Relaxa que eu tô no volante. Mesmo parado."' };
      }
      return null;
    }

    function update(dt, t) {
      st.rpmAlvo = U().damp(st.rpmAlvo, 850, 1.2, dt);
      st.rpm = U().damp(st.rpm, st.rpmAlvo, 6, dt) + Math.sin(t * 30) * 12;
      interior.volante.rotation.z = U().damp(interior.volante.rotation.z, 0, 4, dt);
      interior.portaLuvas.rotation.x = U().damp(interior.portaLuvas.rotation.x, st.portaAberta ? 1.1 : 0, 6, dt);
      interior.consoleTampa.rotation.x = U().damp(interior.consoleTampa.rotation.x, st.consoleAberto ? 1.95 : 0, 7, dt);
      st.gaugeT += dt;
      if (st.gaugeT > 0.05) {
        st.gaugeT = 0;
        desenharGauges(interior.gauges, st.rpm, Math.abs(st.vel || 0) * 3.6);
      }
      st.radioT += dt;
      if (st.radioT > 0.08) {
        st.radioT = 0;
        desenharRadio(interior.radioTex, ESTILOS_RADIO[st.radio], t, st.sintetizadoTocando);
      }
      // Botões do rádio voltando depois do clique
      Object.entries(interior.botoesRadio || {}).forEach(([nome, b]) => {
        const k = st.apertos[nome] || 0;
        if (k > 0) st.apertos[nome] = Math.max(0, k - dt);
        b.position.z = b.userData.zBase - (k > 0 ? 0.007 : 0);
      });
      // Arvorezinha de baunilha e chaveiro balançando (mais ainda com o motor acelerado)
      const vibra = st.rpm > 2500 ? 0.12 : 0.03;
      if (interior.aromatizante) {
        interior.aromatizante.rotation.z = Math.sin(t * 1.7) * 0.06 + Math.sin(t * 23) * vibra * 0.3;
        interior.aromatizante.rotation.x = Math.sin(t * 1.1) * 0.04;
      }
      if (interior.chaveiro) interior.chaveiro.rotation.x = Math.sin(t * 2.3) * 0.12 + Math.sin(t * 27) * vibra * 0.2;
    }

    /** Ajusta porta-luvas e compartimento sem som (quem entra numa Resenha Online já em andamento). */
    function definir(e = {}) {
      if (typeof e.porta === 'boolean') {
        st.portaAberta = e.porta;
        interior.cookieMini.visible = e.porta;
      }
      if (typeof e.cons === 'boolean') st.consoleAberto = e.cons;
    }

    return { interagir, update, trocarRadio, alternarRadio, apertarBotao, definir, st };
  }

  // ------------------------------------------------------------------
  // CARRO EM PRIMEIRA PESSOA (Safepoint e Momento Resenha)
  // Mouse mexe o olhar: dá pra olhar pros lados e virar pra trás pra ver o Mateus.
  // ------------------------------------------------------------------
  function montarCarro3D(view, o = {}) {
    if (!L()?.hasThree()) return null;
    const THREE = root.THREE;
    const U = L().U;
    const stage = L().createStage(view, { radius: '0', fov: 68, near: 0.02, far: 400, fillIntensity: 0.6, fillColor: '#9fb4ff' });
    if (!stage) return null;
    const env = root.Luiggi3DEnv.build('safepoint', { semSubaru: true });
    // O carro fica na origem olhando pra −z: a rua é deslocada pra vaga do Subaru cair aqui
    const vaga = env.vaga || [0, 0, -2.5];
    // A rua é curva: alinharNaVaga põe a vaga na origem com o carro reto em relação à rua
    if (env.alinharNaVaga) env.alinharNaVaga();
    else env.group.position.set(-vaga[0], 0, -vaga[2]);
    stage.scene.add(env.group);
    root.Luiggi3DEnv.aplicar(stage, env);
    stage.setGrade(env.dia ? { vignette: 0.7, bloom: 0.4, threshold: 1.4 } : { vignette: 0.85, bloom: 1.1 });
    const interior = construirInterior();
    stage.scene.add(interior.group);

    const map = root.LuiggiData.cache.personagemMap;
    const cartas = {};
    Object.entries(LUGARES).forEach(([id, l]) => {
      const ch = map.get(id);
      if (!ch) return;
      const c = L().createCharacterCard(ch, { altura: l.altura, tint: env.dia ? '#ffffff' : '#dfe6ff', emotes: false });
      c.group.position.set(...l.carta);
      stage.scene.add(c.group);
      cartas[id] = c;
    });

    // Convidados do banco de trás (Momento Resenha): atrás do motorista e no meio
    const CARTA_CONVIDADO = { tras_esq: [-0.42, 0.32, 1.12], tras_meio: [0.0, 0.34, 1.17] };
    const convAtual = {};
    function definirConvidados(conv = {}) {
      Object.entries(CARTA_CONVIDADO).forEach(([slot, pos]) => {
        const pid = conv[slot] || null;
        const id = `conv:${slot}`;
        if (convAtual[slot] === pid) return;
        convAtual[slot] = pid;
        if (cartas[id]) {
          stage.scene.remove(cartas[id].group);
          cartas[id].dispose?.();
          delete cartas[id];
        }
        const ch = pid && map.get(pid);
        if (!ch) return;
        const c = L().createCharacterCard(ch, { altura: slot === 'tras_meio' ? 0.98 : 1.02, tint: env.dia ? '#ffffff' : '#dfe6ff', emotes: false });
        c.group.position.set(...pos);
        stage.scene.add(c.group);
        cartas[id] = c;
      });
    }

    const controle = criarControleCarro(interior, { stage });
    const picker = L().createPicker(stage);
    const fixos = clicaveisDo(interior);
    const alvos = () => fixos.concat(Object.values(cartas).filter((c) => c.group.visible).map((c) => c.group));

    let pov = o.pov || 'luis';
    const cam = { yaw: OLHAR[pov].base, pitch: -0.1, mx: 0, my: 0, foco: null, focoNome: null };
    const alvoPos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    stage.camera.position.set(...LUGARES[pov].olho);

    const limitar = (yaw) => Math.max(OLHAR[pov].yawMin, Math.min(OLHAR[pov].yawMax, yaw));
    // Virar 200° pra esquerda e 160° pra direita apontam pro mesmo lugar: usa o que cabe no banco
    const yawEquivalente = (yaw) => {
      let melhor = limitar(yaw);
      let erro = Infinity;
      [yaw, yaw - Math.PI * 2, yaw + Math.PI * 2].forEach((y) => {
        const e = Math.abs(limitar(y) - y);
        if (e < erro) {
          erro = e;
          melhor = limitar(y);
        }
      });
      return melhor;
    };

    function aplicarPOV(id) {
      if (!LUGARES[id]) return;
      pov = id;
      Object.entries(cartas).forEach(([cid, c]) => (c.group.visible = cid !== id));
      cam.foco = null;
      cam.focoNome = null;
      cam.yaw = OLHAR[id].base;
      stage.camera.position.set(...LUGARES[id].olho);
    }

    /** Vira a cabeça para um ponto ('console', 'mateus_buse', 'fabricio', 'luis') ou volta pra frente ('frente'). */
    function mirarEm(nome) {
      const p = PONTOS_OLHAR[nome];
      if (!p || nome === pov) {
        cam.foco = null;
        cam.focoNome = null;
        return;
      }
      const d = new THREE.Vector3(...p).sub(stage.camera.position);
      cam.foco = { yaw: yawEquivalente(Math.atan2(d.x, -d.z)), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)), mx: cam.mx, my: cam.my };
      cam.focoNome = nome;
    }

    function onMove(e) {
      const r = view.getBoundingClientRect();
      cam.mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      cam.my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      if (cam.foco && Math.hypot(cam.mx - cam.foco.mx, cam.my - cam.foco.my) > 0.35) {
        cam.foco = null;
        cam.focoNome = null;
      }
      const a = acaoDoObjeto(picker.pick(e, alvos())?.object, cartas);
      view.style.cursor = a ? 'pointer' : '';
      if (o.tip) {
        if (a) {
          const conv = a.startsWith('conv:') ? convAtual[a.slice(5)] : null;
          o.tip.textContent = conv ? `💬 ${map.get(conv)?.nome || conv} · banco de trás` : NOMES_ACAO[a] || a;
          o.tip.style.left = `${e.clientX - r.left + 14}px`;
          o.tip.style.top = `${e.clientY - r.top + 14}px`;
          o.tip.classList.remove('hidden');
        } else o.tip.classList.add('hidden');
      }
    }
    function onDown(e) {
      const a = acaoDoObjeto(picker.pick(e, alvos())?.object, cartas);
      if (a && o.onAcao) o.onAcao(a);
    }
    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerdown', onDown);

    aplicarPOV(pov);
    desenharGauges(interior.gauges, 850, 0);
    let quadro = 0;
    stage.start((dt, t) => {
      env.update(dt, t);
      Object.values(cartas).forEach((c) => c.update(dt, stage.camera));
      controle.update(dt, t);

      // Olhar: mouse no centro = frente; nas bordas vira a cabeça (até pra trás)
      const lim = OLHAR[pov];
      let yawAlvo;
      let pitchAlvo;
      if (cam.foco) {
        yawAlvo = cam.foco.yaw;
        pitchAlvo = cam.foco.pitch;
      } else {
        const c = Math.sign(cam.mx) * Math.pow(Math.abs(cam.mx), 1.5);
        yawAlvo = lim.base + (c >= 0 ? c * (lim.yawMax - lim.base) : -c * (lim.yawMin - lim.base));
        pitchAlvo = Math.max(-0.85, Math.min(0.45, -0.1 - cam.my * 0.6));
      }
      cam.yaw = U.damp(cam.yaw, limitar(yawAlvo), 4, dt);
      cam.pitch = U.damp(cam.pitch, pitchAlvo, 4, dt);

      // Ao virar pro meio do carro, o corpo inclina (dá pra ver o banco de trás sem bater no encosto)
      const olho = LUGARES[pov].olho;
      const centro = olho[0] > 0 ? -1 : 1;
      const k = Math.sign(cam.yaw) === centro ? Math.min(1, Math.max(0, (Math.abs(cam.yaw) - 1.0) / 1.5)) : 0;
      const tremor = controle.st.rpm > 2500 ? (Math.random() - 0.5) * 0.004 : 0;
      alvoPos.set(olho[0] + centro * 0.3 * k, olho[1] + 0.12 * k + Math.sin(t * 1.6) * 0.003 + tremor, olho[2] + 0.05 * k);
      U.dampVec3(stage.camera.position, alvoPos, 6, dt);
      dir.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
      stage.camera.lookAt(stage.camera.position.x + dir.x, stage.camera.position.y + dir.y, stage.camera.position.z + dir.z);

      // Retrovisor (renderiza a cada 2 quadros)
      if (++quadro % 2 === 0) {
        interior.retro.visible = false;
        stage.renderTo(interior.rt, stage.scene, interior.camRetro);
        interior.retro.visible = true;
      }
      if (o.onFrame) o.onFrame(dt, t);
    });

    return {
      stage,
      interior,
      cartas,
      controle,
      aplicarPOV,
      mirarEm,
      definirConvidados,
      get pov() {
        return pov;
      },
      get focoNome() {
        return cam.focoNome;
      },
      dispose() {
        view.removeEventListener('pointermove', onMove);
        view.removeEventListener('pointerdown', onDown);
        interior.rt.dispose();
        stage.dispose();
      }
    };
  }

  /** Aplica o resultado de uma interação na tela em primeira pessoa (texto, interjeição, olhar). */
  function aplicarReacao(carro, r, falar, host) {
    if (!r) return;
    if (r.texto && falar) falar(r.texto);
    if (r.interjeicao) root.LuiggiDialogue?.mostrarInterjeicao?.({ ...r.interjeicao, host });
    if (r.olhar && carro) carro.mirarEm(r.olhar);
  }

  const CHIPS_CARRO = `
    <button class="chip-btn" data-acao="volante">🛞 Acelerar</button>
    <button class="chip-btn" data-acao="buzina">📣 Buzina</button>
    <button class="chip-btn" data-acao="radio_prev" title="Rádio: voltar faixa">⏮</button>
    <button class="chip-btn" data-acao="radio">📻 <span class="radio-lbl">Rádio</span> ⏭</button>
    <button class="chip-btn" data-acao="portaluvas">🍪 Porta-luvas</button>
    <button class="chip-btn" data-acao="tictac">🍬 Compartimento</button>
    <button class="chip-btn" data-acao="retrovisor">🪞 Retrovisor</button>
    <button class="chip-btn" data-acao="olhar_tras">👀 Olhar pro Mateus</button>`;

  /** Ações que dependem da tela (retrovisor e virar pra trás); o resto vai pro controle do carro. */
  function acaoDeTela(carro, acao, falar) {
    if (acao === 'retrovisor') {
      root.LuiggiAudio.playSFX('blip');
      const gato = (root.LuiggiSave?.state?.gatosVistos || []).length > 0;
      falar(gato ? 'No retrovisor: o Mateus Buse lá atrás... e o gato da Luiza do lado dele, te encarando.' : 'No retrovisor: o Mateus Buse no banco de trás, quietinho, olhando pro compartimento dos Tic Tacs.');
      if (carro) {
        carro.mirarEm('frente');
        carro.stage.pulseGrade('vignette', 1.2, 1.2, 0.85);
      }
      return true;
    }
    if (acao === 'olhar_tras') {
      if (!carro) return true;
      if (carro.focoNome === 'mateus_buse' || carro.pov === 'mateus_buse') {
        carro.mirarEm('frente');
        falar(carro.pov === 'mateus_buse' ? 'Você É o Mateus. Já tá no banco de trás.' : 'De volta pra frente.');
      } else {
        carro.mirarEm('mateus_buse');
        carro.cartas.mateus_buse?.setExpression('feliz');
        falar('Você vira pra trás: o Mateus Buse tá no banco de trás, atrás do passageiro. Como sempre.');
      }
      return true;
    }
    return false;
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
        <div class="sp3d-shell" id="sp3d-shell">
          <div class="sp3d-view" id="sp3d-view"></div>
          <div class="sp3d-topbar">
            <div class="sp3d-local"><span class="sp3d-pin">📍</span> ${info.titulo}<small>Banco do motorista · POV Luis · 🖱️ mexa o mouse pra olhar em volta</small></div>
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
              <div class="sp3d-gadgets">${CHIPS_CARRO}</div>
            </div>
            <div class="sp3d-actions" id="pov-actions"></div>
          </div>
        </div>`;

      const shell = document.getElementById('sp3d-shell');
      const txtEl = document.getElementById('pov-text');
      const spkEl = document.getElementById('pov-speaker');
      const portraitEl = document.getElementById('sp3d-portrait');
      const actionsEl = document.getElementById('pov-actions');

      function falar(texto) {
        clearInterval(typer);
        txtEl.textContent = texto;
      }

      const carro = montarCarro3D(document.getElementById('sp3d-view'), { pov: 'luis', tip: document.getElementById('sp3d-tip'), onAcao: interagir });

      function interagir(acao) {
        if (acaoDeTela(carro, acao, falar)) return;
        const r = carro ? carro.controle.interagir(acao) : null;
        aplicarReacao(carro, r, falar, shell);
        if (r?.radio) ov.querySelectorAll('.radio-lbl').forEach((el) => (el.textContent = r.texto.replace(/^📻\s*(Tocando agora:\s*)?/, '')));
        if (carro && carro.cartas[acao]) carro.cartas[acao].setExpression('feliz');
        if (!carro && acao === 'tictac') root.LuiggiDialogue?.mostrarInterjeicao?.({ ids: ['mateus_buse', 'fabricio'], texto: 'kkkkkkkkkk', som: 'risada', host: shell });
      }

      ov.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => interagir(b.dataset.acao)));

      let falaIdx = 0;
      let typer = null;

      function mostrarFala() {
        const cur = info.falas[falaIdx];
        const fabFala = cur.quem === 'fabricio';
        spkEl.textContent = fabFala ? '🎧 Fabricio Venturi · passageiro' : '🧢 Luis Felipe · você, no volante';
        const cardFab = carro?.cartas.fabricio;
        if (cardFab) {
          cardFab.setSpeaking(fabFala);
          cardFab.setExpression(fabFala ? cur.expr : 'neutro');
          cardFab.setDim(!fabFala);
        }
        if (carro) carro.mirarEm(fabFala ? 'fabricio' : 'frente');
        portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(fabFala ? fabricio : luis, { expressao: cur.expr, speaking: true });
        if (cur.expr === 'chocado' || cur.expr === 'bravo') carro?.stage.shake(0.02, 5);
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
        carro?.dispose();
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
  // MOMENTO RESENHA: só ficar no Subaru ouvindo música com o Fabricio e o Mateus.
  // Dá pra trocar o POV entre Luis (motorista), Fabricio (passageiro) e Mateus (banco de trás).
  // ------------------------------------------------------------------
  const POV_TEXTO = {
    luis: 'POV Luis: banco do motorista. O volante é seu, o cheiro de baunilha também.',
    fabricio: 'POV Fabricio: banco do passageiro. Visão privilegiada do Luis cantando a letra errada.',
    mateus_buse: 'POV Mateus Buse: banco de trás, atrás do passageiro. Microfone mutado, vista direta pro compartimento dos Tic Tacs.'
  };
  const RESENHA_AMBIENTE = [
    { quem: 'fabricio', fala: 'Aumenta essa aí, Tico!' },
    { quem: 'luis', fala: 'Essa batida é LuiggiBeats raiz.' },
    { quem: 'fabricio', fala: 'Bora ficar só mais cinco minutos aqui no Safepoint.' },
    { quem: 'mateus_buse', fala: '🔇 kkkkkk' },
    { quem: 'luis', fala: 'Alguém quer um Tic Tac? ...Pergunta retórica.' },
    { quem: 'fabricio', fala: 'Tico e Teco e o comentarista mutado. Formação clássica.' }
  ];

  // Resenha Online: ações que mudam o carro de todo mundo (o resto é só da tela de cada um)
  const ACOES_COMPARTILHADAS = ['volante', 'buzina', 'portaluvas', 'tictac'];
  const CMDS_RADIO = ['next', 'prev', 'toggle'];
  const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const lerNomeOnline = () => {
    try {
      return localStorage.getItem('luiggi_resenha_nome') || '';
    } catch (_) {
      return '';
    }
  };
  const gravarNomeOnline = (n) => {
    try {
      localStorage.setItem('luiggi_resenha_nome', n);
    } catch (_) { }
  };

  /**
   * opcoes.sala: código de uma sala da Resenha Online (link de convite ?resenha=CODIGO);
   * abre o painel online já preenchido.
   */
  const lerModoResenha = () => {
    try {
      return localStorage.getItem('luiggi_resenha_modo') === 'classico' ? 'classico' : '3d';
    } catch (_) {
      return '3d';
    }
  };
  const gravarModoResenha = (m) => {
    try {
      localStorage.setItem('luiggi_resenha_modo', m);
    } catch (_) { }
  };

  /**
   * Momento Resenha: abre o modo 3D (MomentoResenha3D.js: bonecos andando, poses, celular) ou o
   * clássico (só o pessoal dentro do carro, trocando de POV). Lembra o último modo usado e troca
   * de um pro outro sem sair da sala online nem parar a música.
   * opcoes: { sala, modo: '3d' | 'classico', net (sessão online já aberta, vinda do outro modo) }
   */
  async function abrirMomentoResenha(opcoes = {}) {
    const tem3D = !!(root.LuiggiMomentoResenha && root.Luiggi3D?.hasThree());
    let modo = opcoes.modo || (opcoes.classico ? 'classico' : lerModoResenha());
    let op = { ...opcoes };
    for (;;) {
      if (!tem3D) modo = 'classico';
      const r = modo === 'classico' ? await abrirResenhaClassica(op) : await root.LuiggiMomentoResenha.abrir(op);
      if (!r || !r.trocarPara) return;
      modo = r.trocarPara;
      gravarModoResenha(modo);
      // A sala online (se tiver) passa direto pro outro modo
      op = { net: r.net || null, convidados: r.convidados };
    }
  }

  function abrirResenhaClassica(opcoes = {}) {
    return new Promise((resolve) => {
      const ov = document.getElementById('safepoint-overlay');
      const map = root.LuiggiData.cache.personagemMap;
      const cloud = () => (root.LuiggiCloud?.ativo ? root.LuiggiCloud : null);
      const Online = root.LuiggiResenhaOnline;

      root.LuiggiAudio.tocarEstiloSintetizado('lofi', 98);
      document.body.classList.add('resenha-aberta');
      let tocandoSintetizado = !cloud();
      ov.classList.remove('hidden');
      ov.innerHTML = `
        <div class="sp3d-shell resenha-shell" id="rs-shell">
          <div class="sp3d-view" id="rs-view"></div>
          <div class="rs-tags" id="rs-tags"></div>
          <div class="sp3d-topbar">
            <div class="sp3d-local"><span>🎶 Momento Resenha</span><small id="rs-pov-lbl"></small></div>
            <div class="btn-row rs-povs">
              ${Object.entries(LUGARES).map(([id, l]) => `<button class="mini-btn" data-pov="${id}">${l.icone} ${l.nome}<span class="rs-pov-n" data-pov-n="${id}"></span></button>`).join('')}
              ${root.LuiggiResenhaConvidados ? '<button class="mini-btn" id="rs-conv-btn" title="Colocar mais gente no banco de trás">➕ Banco de trás</button>' : ''}
              ${root.LuiggiMomentoResenha && root.Luiggi3D?.hasThree() ? '<button class="mini-btn" id="rs-modo3d" title="Modo 3D: bonecos andando pela rua, poses e celular">🧍 Modo 3D</button>' : ''}
              <button class="mini-btn rs-online-btn" id="rs-online-btn" title="Resenha Online: várias pessoas no mesmo Subaru">🌐 Online</button>
              <button class="mini-btn" id="rs-sair">🏠 Menu</button>
            </div>
          </div>
          <div class="rs-online hidden" id="rs-online">
            <div class="rs-on-head"><strong>🌐 Resenha Online</strong><button class="mini-btn" id="rs-on-fechar" title="Fechar">✕</button></div>
            <div id="rs-on-corpo"></div>
          </div>
          <div class="sp3d-tooltip hidden" id="rs-tip"></div>
          <div class="sp3d-dialog">
            <div class="sp3d-portrait" id="rs-portrait"></div>
            <div class="sp3d-body">
              <div class="sp3d-speaker" id="rs-speaker"></div>
              <div class="sp3d-text" id="rs-text"></div>
              <div class="sp3d-gadgets">${CHIPS_CARRO}</div>
            </div>
            <div class="sp3d-actions rs-musica">
              <div class="rs-faixa" id="rs-faixa">📻 Rádio</div>
              <div class="btn-row">
                <button class="mg-btn" id="rs-prev" title="Anterior">⏮</button>
                <button class="mg-btn primary" id="rs-play" title="Tocar / pausar">⏯</button>
                <button class="mg-btn" id="rs-next" title="Próxima">⏭</button>
              </div>
            </div>
          </div>
        </div>`;

      const shell = document.getElementById('rs-shell');
      const view = document.getElementById('rs-view');
      const txtEl = document.getElementById('rs-text');
      const spkEl = document.getElementById('rs-speaker');
      const portraitEl = document.getElementById('rs-portrait');
      const faixaEl = document.getElementById('rs-faixa');
      const painelOnline = document.getElementById('rs-online');
      let ultimaInteracao = performance.now();
      let povAtual = 'luis';

      // Estado da Resenha Online
      let net = null;
      let modoPainel = null;
      let prefill = Online ? Online.normalizarCodigo(opcoes.sala) : '';
      let chaveRadio = null; // última faixa/estado do rádio anunciado
      let ultimoPor = null; // { id, chave }: quem mexeu no rádio por último
      let membrosAnt = new Map();
      let jaSincronizou = false;
      // Convidados do banco de trás: sozinho fica salvo; online quem manda é o anfitrião
      const Conv = root.LuiggiResenhaConvidados;
      // Vindo do outro modo, continua com os mesmos convidados (sem avisar de novo)
      let convidados = Conv ? (opcoes.convidados ? Conv.limpar(opcoes.convidados) : Conv.ler()) : {};
      let ultimoConvPor = null;
      let painelConv = null;

      function falar(texto, quem = null, rotulo = null) {
        txtEl.textContent = texto;
        if (quem) {
          const p = map.get(quem);
          spkEl.textContent = `${LUGARES[quem]?.icone || ''} ${p?.nome || quem}`;
          if (p) portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(p, { expressao: 'feliz', speaking: true });
        } else if (rotulo) spkEl.textContent = rotulo;
      }
      const avisoOnline = (texto) => falar(texto, null, '🌐 Resenha Online');

      const carro = montarCarro3D(view, { pov: 'luis', tip: document.getElementById('rs-tip'), onAcao: interagir, onFrame: posicionarTags });
      carro?.definirConvidados(convidados);

      /** Troca a lista de convidados e avisa o que mudou. */
      function aplicarConvidados(novo, porId) {
        if (!Conv) return;
        novo = Conv.limpar(novo);
        const quem = porId && net ? (porId === net.eu ? 'Você' : net.nomeDe(porId)) : null;
        const msg = Conv.descreverMudanca(convidados, novo, quem);
        convidados = novo;
        carro?.definirConvidados(convidados);
        painelConv?.atualizar();
        if (msg) falar(`🪑 ${msg}`, null, '➕ Banco de trás');
      }
      function definirConvidado(slot, pid) {
        if (net) {
          if (!net.pedir({ tipo: 'convidado', banco: slot, pid: pid || null })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        aplicarConvidados({ ...convidados, [slot]: pid || null }, null);
        Conv.gravar(convidados);
        root.LuiggiAudio.playSFX('blip');
      }

      // ---------------- Rádio ----------------
      function estadoRadio() {
        const c = cloud();
        if (c) return { m: 'c', id: c.faixa?.id || null, p: Math.round((c.posicao || 0) * 1000) / 1000, on: c.tocando };
        return { m: 's', e: carro ? carro.controle.st.radio : 0, on: tocandoSintetizado };
      }
      const chaveDe = (r) => `${r.m === 'c' ? r.id : `s${r.e}`}|${r.on ? 1 : 0}`;

      /** Executa um comando de rádio aqui (sozinho ou como anfitrião). */
      function executarRadio(cmd) {
        let txt = null;
        const c = cloud();
        if (cmd === 'next' || cmd === 'prev') {
          if (carro) txt = carro.controle.trocarRadio(cmd === 'next' ? 1 : -1);
          else if (c) cmd === 'next' ? c.proxima() : c.anterior();
          tocandoSintetizado = !cloud();
        } else if (cmd === 'toggle') {
          if (c) {
            if (c.tocando) c.pause();
            else c.play();
          } else if (tocandoSintetizado) {
            root.LuiggiAudio.pararMusica();
            tocandoSintetizado = false;
          } else {
            root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[carro ? carro.controle.st.radio : 0], 98);
            tocandoSintetizado = true;
          }
        }
        atualizarFaixa();
        setTimeout(atualizarFaixa, 120);
        return txt;
      }

      /** Botões ⏮ ⏯ ⏭ e o rádio do painel. Online, quem decide é o anfitrião. */
      function comandoRadio(cmd, doCarro = false) {
        ultimaInteracao = performance.now();
        if (net) {
          if (!net.pedir({ tipo: 'radio', cmd })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        const txt = executarRadio(cmd);
        if (doCarro && txt) falar(txt);
      }

      /** Quem não é anfitrião: deixa o rádio igual ao dele. */
      function aplicarEstadoRadio(r, atraso) {
        const c = cloud();
        if (r.m === 'c' && c && typeof r.id === 'string') {
          c.sincronizar({ id: r.id, pos: (Number(r.p) || 0) + (r.on ? atraso : 0), tocando: !!r.on });
          return;
        }
        // Rádio sintetizado (ou este jogo não tem as músicas): segue só a estação e o liga/desliga
        const e = r.m === 's' ? Math.max(0, Math.min(ESTILOS_RADIO.length - 1, Number(r.e) || 0)) : carro ? carro.controle.st.radio : 0;
        const mudou = carro && carro.controle.st.radio !== e;
        if (carro) carro.controle.st.radio = e;
        if (r.on && (!tocandoSintetizado || mudou)) {
          if (c?.tocando) c.pause(false);
          root.LuiggiAudio.tocarEstiloSintetizado(ESTILOS_RADIO[e], 98, { forcar: true });
          tocandoSintetizado = true;
        } else if (!r.on && tocandoSintetizado) {
          root.LuiggiAudio.pararMusica();
          tocandoSintetizado = false;
        }
      }

      /** Anuncia quando a música muda ou alguém pausa/solta o som. */
      function notarRadio(r, porId) {
        const chave = chaveDe(r);
        if (chave === chaveRadio) return;
        const antes = chaveRadio;
        chaveRadio = chave;
        if (antes === null || !net) return;
        const quem = porId ? (porId === net.eu ? 'Você' : net.nomeDe(porId)) : null;
        const trocouFaixa = antes.split('|')[0] !== chave.split('|')[0];
        if (trocouFaixa) {
          const f = cloud()?.faixa;
          const nome = r.m === 'c' ? (f ? `"${f.titulo}" — ${f.artista}` : 'outra faixa') : NOMES_RADIO[ESTILOS_RADIO[r.e]] || 'outra estação';
          falar(quem ? `${quem} trocou a música: ${nome}` : `Tocando agora: ${nome}`, null, '📻 Rádio');
        } else {
          falar(r.on ? `▶ ${quem || 'O rádio'} soltou o som.` : `⏸ ${quem || 'O rádio'} pausou o rádio.`, null, '📻 Rádio');
        }
      }

      function atualizarFaixa() {
        const c = cloud();
        if (c) {
          const f = c.faixa;
          faixaEl.textContent = `${c.tocando ? '▶' : '⏸'} ${f ? `${f.titulo} · ${f.artista}` : 'LuiggiCloud'}`;
        } else {
          faixaEl.textContent = `${tocandoSintetizado ? '▶' : '⏸'} ${NOMES_RADIO[ESTILOS_RADIO[carro ? carro.controle.st.radio : 0]]}`;
        }
      }

      // ---------------- Ações do carro ----------------
      function interagir(acao) {
        ultimaInteracao = performance.now();
        if (typeof acao === 'string' && acao.startsWith('conv:')) {
          const pid = convidados[acao.slice(5)];
          if (!pid) return;
          root.LuiggiAudio.playSFX('blip');
          falar(`"${Conv.frase(pid)}"`, pid);
          carro?.cartas[acao]?.setExpression('feliz');
          return;
        }
        if (acaoDeTela(carro, acao, falar)) return;
        if (acao === 'radio') return comandoRadio('next', true);
        if (net && carro && ACOES_COMPARTILHADAS.includes(acao)) {
          if (!net.pedir({ tipo: 'acao', acao })) avisoOnline('Ainda conectando ao carro…');
          return;
        }
        const r = carro ? carro.controle.interagir(acao) : null;
        aplicarReacao(carro, r, falar, shell);
        if (!carro && acao === 'tictac') root.LuiggiDialogue?.mostrarInterjeicao?.({ ids: ['mateus_buse', 'fabricio'], texto: 'kkkkkkkkkk', som: 'risada', host: shell });
        if (carro && carro.cartas[acao]) carro.cartas[acao].setExpression('feliz');
        atualizarFaixa();
      }

      /** Mostra o resultado de uma ação; se foi outra pessoa, aparece o nome dela e a câmera não vira. */
      function mostrarReacao(r, porId) {
        if (!r) return;
        if (!net || porId === net.eu) return aplicarReacao(carro, r, falar, shell);
        const nome = net.nomeDe(porId);
        falar(String(r.texto || '').replace(/^Você /, `${nome} `), null, `🌐 ${nome}`);
        if (r.interjeicao) root.LuiggiDialogue?.mostrarInterjeicao?.({ ...r.interjeicao, host: shell });
      }

      // ---------------- Anfitrião ----------------
      function publicarEstado(alvo) {
        if (!net || !net.souHost) return;
        const r = estadoRadio();
        const por = ultimoPor && ultimoPor.chave === chaveDe(r) ? ultimoPor.id : null;
        net.enviarEstado({ r, c: { porta: carro ? carro.controle.st.portaAberta : false, cons: carro ? carro.controle.st.consoleAberto : false, conv: convidados }, cq: ultimoConvPor, por }, alvo);
        notarRadio(r, por);
      }

      function processarPedido(d, de) {
        if (!d || typeof d !== 'object') return;
        if (d.tipo === 'radio' && CMDS_RADIO.includes(d.cmd)) {
          executarRadio(d.cmd);
          ultimoPor = { id: de, chave: chaveDe(estadoRadio()) };
          publicarEstado();
        } else if (d.tipo === 'convidado' && Conv && Conv.SLOTS.includes(d.banco) && (d.pid === null || Conv.valido(d.pid))) {
          ultimoConvPor = de;
          aplicarConvidados({ ...convidados, [d.banco]: d.pid }, de);
          if (de === net.eu) Conv.gravar(convidados);
          publicarEstado();
        } else if (d.tipo === 'acao' && ACOES_COMPARTILHADAS.includes(d.acao) && carro) {
          const r = carro.controle.interagir(d.acao, { remoto: de !== net.eu });
          mostrarReacao(r, de);
          net.fx({ acao: d.acao, por: de, porta: carro.controle.st.portaAberta, cons: carro.controle.st.consoleAberto });
        }
      }

      // ---------------- Quem segue o anfitrião ----------------
      function aplicarEstado(d, _de, atraso) {
        if (!d || typeof d !== 'object') return;
        if (d.r && typeof d.r === 'object') {
          aplicarEstadoRadio(d.r, atraso);
          notarRadio(d.r, typeof d.por === 'string' ? d.por : null);
        }
        if (d.c && carro) carro.controle.definir(d.c);
        if (d.c && d.c.conv) aplicarConvidados(d.c.conv, typeof d.cq === 'string' ? d.cq : null);
        atualizarFaixa();
        if (!jaSincronizou && net) {
          jaSincronizou = true;
          atualizarListaOnline();
          avisoOnline(`Você entrou no Subaru da sala ${net.sala}! O rádio agora é de todo mundo.`);
        }
      }

      function aplicarFx(d) {
        if (!carro || !d || !ACOES_COMPARTILHADAS.includes(d.acao)) return;
        const aberto = d.acao === 'tictac' ? d.cons : d.acao === 'portaluvas' ? d.porta : undefined;
        const r = carro.controle.interagir(d.acao, { remoto: d.por !== net?.eu, aberto });
        mostrarReacao(r, d.por);
      }

      // ---------------- Conexão ----------------
      /** Quem recebe os eventos da sala neste modo. */
      function eventosRede(fundador) {
        return {
          onMembros: (lista, info) => {
            anunciarMudanca(lista, info);
            atualizarListaOnline();
          },
          onHost: (souHost, hostId, antes) => {
            const c = cloud();
            if (c) c.controleExterno = !souHost;
            if (souHost) setTimeout(publicarEstado, 0);
            if (antes && net) avisoOnline(souHost ? '👑 O anfitrião saiu: agora o rádio de referência é o seu.' : `👑 ${net.nomeDe(hostId)} virou o anfitrião.`);
            else if (souHost && !fundador && net) avisoOnline('Ninguém apareceu nessa sala ainda, então o rádio de referência é o seu. Quando a galera entrar, todo mundo ouve junto.');
            setTimeout(atualizarListaOnline, 0);
          },
          onEstado: aplicarEstado,
          onPedido: processarPedido,
          onFx: aplicarFx,
          onPrecisaEstado: (alvo) => publicarEstado(alvo),
          onStatus: (tipo, msg) => {
            if (tipo === 'reserva') avisoOnline(`${msg} Tudo continua funcionando, só com um tiquinho mais de atraso.`);
            if (tipo === 'relays') atualizarListaOnline();
          }
        };
      }

      /** Veio do modo 3D já numa sala: continua nela (sem sair e entrar de novo). */
      function adotarRede(sessao) {
        net = sessao;
        net.adotar(eventosRede(false));
        net.atualizar({ pov: povAtual, modo: 'classico' });
        if (cloud()) cloud().controleExterno = !net.souHost;
        prefill = net.sala;
        jaSincronizou = net.sincronizado;
        renderOnline();
        if (net.souHost) setTimeout(publicarEstado, 0);
        avisoOnline(`Modo clássico, ainda na sala ${net.sala}. Pra galera do modo 3D você aparece sentado no banco do seu personagem.`);
      }

      function conectar(sala, nome, fundador) {
        if (net || !Online) return;
        const n = Online.limparNome(nome || lerNomeOnline() || `Passageiro ${Math.floor(Math.random() * 90 + 10)}`);
        gravarNomeOnline(n);
        root.LuiggiAudio?.obterContexto?.();
        // Quem entra numa sala existente não avança faixa sozinho até o anfitrião mandar o estado
        if (!fundador && cloud()) cloud().controleExterno = true;
        try {
          net = Online.criarSessao({
            sala,
            nome: n,
            pov: povAtual,
            modo: 'classico',
            fundador,
            eventos: eventosRede(fundador)
          });
        } catch (e) {
          net = null;
          if (cloud()) cloud().controleExterno = false;
          avisoOnline('Não deu pra ligar o modo online neste navegador.');
          return;
        }
        prefill = sala;
        renderOnline();
        avisoOnline(fundador ? `Sala ${sala} criada! Copie o link do convite e mande pra galera.` : `Entrando na sala ${sala}… procurando a galera.`);
      }

      function desconectar(manual) {
        if (!net) return;
        net.sair();
        net = null;
        if (cloud()) cloud().controleExterno = false;
        chaveRadio = null;
        ultimoPor = null;
        membrosAnt = new Map();
        jaSincronizou = false;
        // Fora da sala, volta a valer o banco de trás salvo neste navegador
        if (Conv) {
          convidados = Conv.ler();
          carro?.definirConvidados(convidados);
          painelConv?.atualizar();
        }
        ultimoConvPor = null;
        renderOnline();
        if (manual) avisoOnline('Você saiu da sala. O Subaru voltou a ser só seu.');
      }

      function anunciarMudanca(lista, info) {
        const antes = membrosAnt;
        membrosAnt = new Map(lista.map((p) => [p.id, p.pov]));
        if (!net || !net.sincronizado || !info) return;
        const p = lista.find((x) => x.id === info.id);
        if (info.tipo === 'entrou' && p) {
          root.LuiggiAudio.playSFX('blip');
          avisoOnline(`${p.nome} entrou no Subaru (${LUGARES[p.pov]?.papel || 'banco'}).`);
        } else if (info.tipo === 'saiu') avisoOnline(`${info.nome} saiu do carro.`);
        else if (info.tipo === 'mudou' && p && antes.has(p.id) && antes.get(p.id) !== p.pov) avisoOnline(`${p.nome} trocou de lugar: agora tá no POV ${LUGARES[p.pov]?.nome || p.pov}.`);
      }

      const linkConvite = () => `${location.href.split(/[?#]/)[0]}?resenha=${net.sala}`;
      async function copiarConvite() {
        if (!net) return;
        const link = linkConvite();
        try {
          await navigator.clipboard.writeText(link);
          avisoOnline(`Link copiado! Mande pra galera: ${link}`);
        } catch (_) {
          window.prompt('Copie o link do convite:', link);
        }
      }

      // ---------------- Painel online ----------------
      function abrirPainelOnline(v) {
        if (v) painelConv?.fechar();
        painelOnline.classList.toggle('hidden', !v);
        if (v) {
          renderOnline();
          // Convite com nome já salvo: o foco vai direto pro Entrar
          painelOnline.querySelector(prefill && lerNomeOnline() ? '#rs-on-entrar' : '#rs-on-nome')?.focus();
        }
      }

      function renderOnline() {
        const corpo = document.getElementById('rs-on-corpo');
        const modo = !Online || !Online.disponivel() ? 'indisponivel' : net ? 'sala' : 'entrar';
        if (modo !== modoPainel) {
          modoPainel = modo;
          if (modo === 'indisponivel') {
            corpo.innerHTML = '<p class="rs-on-aviso">Este navegador não suporta o modo online. Tente no Chrome, Edge, Firefox ou Safari atualizados.</p>';
          } else if (modo === 'entrar') {
            corpo.innerHTML = `
              <label class="rs-on-campo">Seu nome<input id="rs-on-nome" maxlength="18" autocomplete="nickname" placeholder="Como a galera te chama" value="${escHtml(lerNomeOnline())}"></label>
              <button class="mg-btn primary" id="rs-on-criar">➕ Criar sala</button>
              <div class="rs-on-ou"><span>ou entre numa sala</span></div>
              <div class="rs-on-linha"><input id="rs-on-codigo" maxlength="8" placeholder="CÓDIGO" spellcheck="false" autocapitalize="characters" value="${escHtml(prefill)}"><button class="mg-btn" id="rs-on-entrar">Entrar</button></div>
              <small class="rs-on-dica">Até ${Online.MAX_PESSOAS} pessoas no mesmo Subaru. Cada um escolhe o banco (POV) que quiser e todo mundo mexe no rádio. A música toca no jogo de cada um, sincronizada.</small>`;
            const nomeEl = corpo.querySelector('#rs-on-nome');
            const codEl = corpo.querySelector('#rs-on-codigo');
            codEl.addEventListener('input', () => {
              codEl.value = Online.normalizarCodigo(codEl.value);
              codEl.classList.remove('erro');
            });
            const entrar = () => {
              const c = Online.normalizarCodigo(codEl.value);
              if (c.length < 4) {
                codEl.classList.add('erro');
                codEl.focus();
                return;
              }
              conectar(c, nomeEl.value, false);
            };
            corpo.querySelector('#rs-on-criar').addEventListener('click', () => conectar(Online.gerarCodigo(), nomeEl.value, true));
            corpo.querySelector('#rs-on-entrar').addEventListener('click', entrar);
            codEl.addEventListener('keydown', (e) => e.key === 'Enter' && entrar());
            nomeEl.addEventListener('keydown', (e) => e.key === 'Enter' && (codEl.value ? entrar() : corpo.querySelector('#rs-on-criar').click()));
          } else {
            corpo.innerHTML = `
              <div class="rs-on-sala"><small>Código da sala</small><strong id="rs-on-cod"></strong></div>
              <button class="mg-btn primary" id="rs-on-copiar">🔗 Copiar link do convite</button>
              ${location.protocol === 'file:' ? '<small class="rs-on-aviso">Você abriu o jogo direto do arquivo: o link só funciona neste PC. Pra chamar a galera, abram o jogo pelo site (GitHub Pages) e usem o código.</small>' : ''}
              <div class="rs-on-status" id="rs-on-status"></div>
              <ul class="rs-on-lista" id="rs-on-lista"></ul>
              <label class="rs-on-campo">Seu nome<input id="rs-on-nome" maxlength="18" value=""></label>
              <button class="mg-btn" id="rs-on-sair">🚪 Sair da sala</button>`;
            corpo.querySelector('#rs-on-copiar').addEventListener('click', copiarConvite);
            const nomeEl = corpo.querySelector('#rs-on-nome');
            nomeEl.value = net.nomeDe(net.eu);
            nomeEl.addEventListener('change', () => {
              const n = Online.limparNome(nomeEl.value);
              nomeEl.value = n;
              gravarNomeOnline(n);
              net?.atualizar({ nome: n });
            });
            corpo.querySelector('#rs-on-sair').addEventListener('click', () => desconectar(true));
          }
        }
        atualizarListaOnline();
      }

      /** Atualiza o que muda com a galera: botão 🌐, lista, contagem por banco e etiquetas no 3D. */
      function atualizarListaOnline() {
        const btn = document.getElementById('rs-online-btn');
        if (!btn) return;
        btn.textContent = net ? `🌐 ${net.sala} · ${net.total}` : '🌐 Online';
        btn.classList.toggle('ativo', !!net);
        const pessoas = net ? net.pessoas : [];
        ov.querySelectorAll('[data-pov-n]').forEach((el) => {
          const n = pessoas.filter((p) => !p.eu && p.pov === el.dataset.povN).length;
          el.textContent = n ? ` +${n}` : '';
        });
        Object.entries(tagEls).forEach(([id, el]) => {
          const nomes = pessoas.filter((p) => !p.eu && p.pov === id).map((p) => p.nome);
          el.textContent = nomes.length ? `🎮 ${nomes.join(', ')}` : '';
          el.dataset.vazio = nomes.length ? '' : '1';
          if (!nomes.length) el.classList.add('hidden');
        });
        if (!net || modoPainel !== 'sala') return;
        const cod = document.getElementById('rs-on-cod');
        if (cod) cod.textContent = net.sala;
        const status = document.getElementById('rs-on-status');
        if (status) {
          const semRede = net.relaysConectados === 0 && !net.pessoas.some((p) => p.via === 'p2p');
          status.textContent = semRede
            ? 'Procurando conexão com a internet…'
            : !net.sincronizado
              ? 'Conectando ao carro… procurando a galera.'
              : net.total === 1
                ? 'Só você no carro por enquanto. Mande o link pra galera.'
                : `${net.total} pessoas no Subaru`;
          status.classList.toggle('pulsando', !net.sincronizado);
        }
        const lista = document.getElementById('rs-on-lista');
        if (lista) {
          lista.innerHTML = pessoas
            .map(
              (p) => `<li class="${p.eu ? 'eu' : ''}">
                <span class="rs-on-pov">${LUGARES[p.pov]?.icone || '❔'}</span>
                <span class="rs-on-nome">${escHtml(p.nome)}${p.eu ? ' <small>(você)</small>' : ''}</span>
                ${p.host ? '<span class="rs-on-host" title="Anfitrião: o rádio dele é a referência de todo mundo">👑</span>' : ''}
                ${p.versaoDiferente ? '<span title="Essa pessoa está com outra versão do jogo">⚠️</span>' : ''}
                <small class="rs-on-banco">${escHtml(LUGARES[p.pov]?.nome || '')}</small>
                ${p.eu ? '' : p.via === 'p2p' ? '<span class="rs-on-via" title="Conexão direta (P2P)">⚡</span>' : '<span class="rs-on-via" title="Pela rota reserva (relay): a rede não deixou conectar direto">📡</span>'}
              </li>`
            )
            .join('');
        }
      }

      // ---------------- Etiquetas 3D (nome de quem está em cada banco) ----------------
      const tagsHost = document.getElementById('rs-tags');
      const tagEls = {};
      Object.keys(LUGARES).forEach((id) => {
        const el = document.createElement('div');
        el.className = 'rs-tag hidden';
        el.dataset.vazio = '1';
        tagsHost.appendChild(el);
        tagEls[id] = el;
      });
      const vTag = root.THREE ? new root.THREE.Vector3() : null;
      function posicionarTags() {
        if (!net || !carro || !vTag) return;
        const cam = carro.stage.camera;
        const w = view.clientWidth;
        const h = view.clientHeight;
        Object.entries(LUGARES).forEach(([id, l]) => {
          const el = tagEls[id];
          if (!el || el.dataset.vazio || id === carro.pov) {
            el?.classList.add('hidden');
            return;
          }
          // O sprite tem uma folga transparente em cima: 84% da altura fica logo acima da cabeça
          vTag.set(l.carta[0], l.carta[1] + l.altura * 0.84, l.carta[2]).project(cam);
          const dentro = vTag.z < 1 && Math.abs(vTag.x) < 1.05 && Math.abs(vTag.y) < 1.05;
          el.classList.toggle('hidden', !dentro);
          if (dentro) el.style.transform = `translate(${((vTag.x + 1) / 2) * w}px, ${((1 - vTag.y) / 2) * h}px) translate(-50%, -100%)`;
        });
      }

      // ---------------- POV ----------------
      function trocarPOV(id) {
        if (!LUGARES[id]) return;
        povAtual = id;
        carro?.aplicarPOV(id);
        ov.querySelectorAll('[data-pov]').forEach((b) => b.classList.toggle('ativo', b.dataset.pov === id));
        document.getElementById('rs-pov-lbl').textContent = `${LUGARES[id].icone} ${LUGARES[id].nome} · ${LUGARES[id].papel} · 🖱️ mexa o mouse pra olhar em volta`;
        const p = map.get(id);
        spkEl.textContent = `${LUGARES[id].icone} Você é ${p?.nome || LUGARES[id].nome}`;
        if (p) portraitEl.innerHTML = root.LuiggiRig.renderVisualNovelSprite(p, { expressao: 'feliz', speaking: false });
        txtEl.textContent = POV_TEXTO[id];
        root.LuiggiAudio.playSFX('blip');
        net?.atualizar({ pov: id });
      }

      document.getElementById('rs-prev').addEventListener('click', () => comandoRadio('prev'));
      document.getElementById('rs-next').addEventListener('click', () => comandoRadio('next'));
      document.getElementById('rs-play').addEventListener('click', () => comandoRadio('toggle'));
      document.getElementById('rs-online-btn').addEventListener('click', () => abrirPainelOnline(painelOnline.classList.contains('hidden')));
      document.getElementById('rs-on-fechar').addEventListener('click', () => abrirPainelOnline(false));
      ['keydown', 'pointerdown'].forEach((t) => painelOnline.addEventListener(t, (e) => e.stopPropagation()));

      ov.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => interagir(b.dataset.acao)));
      ov.querySelectorAll('[data-pov]').forEach((b) => b.addEventListener('click', () => trocarPOV(b.dataset.pov)));

      // Uma vez por segundo: atualiza a faixa, o anfitrião espalha o estado e, de vez em quando, alguém comenta
      let ambIdx = Math.floor(Math.random() * RESENHA_AMBIENTE.length);
      const relogio = setInterval(() => {
        atualizarFaixa();
        if (net?.souHost) publicarEstado();
        if (performance.now() - ultimaInteracao < 40000) return;
        ultimaInteracao = performance.now();
        const convs = Object.values(convidados).filter(Boolean);
        if (convs.length && Math.random() < 0.35) {
          const pid = convs[Math.floor(Math.random() * convs.length)];
          falar(`"${Conv.frase(pid)}"`, pid);
          return;
        }
        const linha = RESENHA_AMBIENTE[ambIdx++ % RESENHA_AMBIENTE.length];
        if (carro && carro.pov === linha.quem) return;
        // Personagem "ocupado" por alguém da sala não fala sozinho
        if (net && net.pessoas.some((p) => !p.eu && p.pov === linha.quem)) return;
        falar(linha.fala, linha.quem);
        carro?.cartas[linha.quem]?.setExpression('feliz');
      }, 1000);

      function sair(opts = {}) {
        const trocarPara = opts && opts.trocarPara;
        // Trocando de modo, a sala continua aberta e vai pro outro modo
        let sessao = null;
        if (trocarPara && net) {
          sessao = net;
          sessao.adotar({});
          net = null;
        } else desconectar(false);
        document.body.classList.remove('resenha-aberta');
        clearInterval(relogio);
        window.removeEventListener('keydown', onKey);
        carro?.dispose();
        ov.classList.add('hidden');
        ov.innerHTML = '';
        if (!trocarPara) root.LuiggiAudio.pararMusica();
        resolve(trocarPara ? { trocarPara, net: sessao, convidados } : undefined);
      }
      function onKey(e) {
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === 'Escape') {
          if (!painelOnline.classList.contains('hidden')) abrirPainelOnline(false);
          else if (painelConv?.aberto) painelConv.fechar();
          else sair();
        }
        if (e.key === '1') trocarPOV('luis');
        if (e.key === '2') trocarPOV('fabricio');
        if (e.key === '3') trocarPOV('mateus_buse');
      }
      window.addEventListener('keydown', onKey);
      document.getElementById('rs-sair').addEventListener('click', () => sair());
      document.getElementById('rs-modo3d')?.addEventListener('click', () => sair({ trocarPara: '3d' }));
      if (Conv) {
        painelConv = Conv.criarPainel({ host: shell, obter: () => convidados, definir: definirConvidado });
        document.getElementById('rs-conv-btn')?.addEventListener('click', () => {
          painelOnline.classList.add('hidden');
          painelConv.alternar();
        });
      }

      trocarPOV('luis');
      atualizarFaixa();
      atualizarListaOnline();
      if (opcoes.net) adotarRede(opcoes.net);
      else if (prefill) {
        abrirPainelOnline(true);
        avisoOnline(`Convite para a sala ${prefill}: escreva seu nome e clique em Entrar.`);
      }
      // Pra testes automatizados e depuração no console
      root.__resenhaClassica = { aplicarConvidados, definirConvidado, get convidados() { return convidados; }, get net() { return net; }, sair };
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

  root.LuiggiSubaruPOV = { abrirSubaruSafepoint, abrirMomentoResenha, cenaVoltaPraCasa, construirInterior, criarControleCarro, clicaveisDo, acaoDoObjeto, aplicarReacao, NOMES_ACAO, LUGARES, OLHAR, ESTILOS_RADIO, NOMES_RADIO, RESENHA_AMBIENTE, desenharGauges };
})(window);
