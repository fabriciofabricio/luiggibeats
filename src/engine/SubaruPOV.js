/**
 * src/engine/SubaruPOV.js
 * Cena interativa em primeira pessoa (POV do Luis no banco do motorista do Subaru Azul)
 * olhando para o Fabricio Venturi no banco do passageiro, com o Safepoint pelo para-brisa.
 */
(function (root) {
  'use strict';

  const SAFEPOINT_BG = 'assets/Cenarios/safe point para chilling/Screenshot 2026-11-17 012957.png';

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

  function abrirSubaruSafepoint(chave = 'intro') {
    return new Promise(async (resolve) => {
      const ov = document.getElementById('safepoint-overlay');
      const data = root.LuiggiData.cache;
      const save = root.LuiggiSave;
      const info = CONVERSAS_CARRO[chave] || CONVERSAS_CARRO[0];
      const fabricio = data.personagemMap.get('fabricio');
      const luis = data.personagemMap.get('luis');

      root.LuiggiAudio.tocarEstiloSintetizado('lofi', 98);
      ov.classList.remove('hidden');

      let falaIdx = 0;

      function renderCena(interactiveReady = false) {
        const cur = info.falas[Math.min(falaIdx, info.falas.length - 1)];
        const fabSpeak = cur && cur.quem === 'fabricio';

        ov.innerHTML = `
          <div class="subaru-pov-shell">
            <!-- Para-brisa e janela com Safepoint real -->
            <div class="pov-windshield" style="background-image:url('${encodeURI(SAFEPOINT_BG)}')">
              <div class="pov-night-tint"></div>
              <div class="pov-roof-bar">
                <span>📍 ${info.titulo} · Banco do Motorista (POV Luis)</span>
                <div class="btn-row">
                  <button class="mini-btn" id="pov-museum">🏛️ Museu</button>
                  <button class="mini-btn" id="pov-hero">🎸 Hero</button>
                  <button class="mini-btn" id="pov-cookies">🍪 Cookies</button>
                  <button class="mini-btn" id="pov-menu">🏠 Menu</button>
                </div>
              </div>

              <!-- Retrovisor clicável -->
              <button class="pov-mirror" id="pov-mirror-btn" title="Olhar pelo retrovisor">
                <div class="mirror-glass">${save.state.gatosVistos.length > 0 ? '🐈‍⬛ 👀' : '🪞 Olhos do Luis'}</div>
              </button>

              <!-- Fabricio no banco do passageiro -->
              <div class="pov-passenger" id="pov-fab-click" title="Conversar com Fabricio">
                <div class="seat-headrest"></div>
                ${root.LuiggiRig.renderVisualNovelSprite(fabricio, {
          expressao: fabSpeak ? cur.expr : 'neutro',
          speaking: fabSpeak,
          dim: !fabSpeak && !interactiveReady,
          modoCabecao: !!save.state.config.modoCabecao
        })}
              </div>
            </div>

            <!-- Painel interior do Subaru Legacy POV -->
            <div class="pov-dashboard">
              <div class="dash-wheel" id="pov-wheel" title="Dar uma acelerada no motor boxer">
                <div class="wheel-rim">
                  <div class="wheel-hub">SUBARU</div>
                </div>
                <small>Volante (clique p/ ronco)</small>
              </div>

              <div class="dash-dialogue">
                <div class="dash-speaker">
                  ${cur.quem === 'fabricio' ? '🎧 Fabricio Venturi (Passageiro)' : '🧢 Luis Felipe (Você · Motorista)'}
                </div>
                <div class="dash-text" id="pov-text">${cur.fala}</div>
                <div class="dash-actions">
                  ${!interactiveReady
            ? `<button class="mg-btn primary" id="pov-next-line">Continuar Conversa ▶</button>`
            : `<button class="mg-btn primary" id="pov-go-story">${info.proximoLabel} ▶</button>`
          }
                </div>
              </div>

              <div class="dash-console">
                <button class="console-gadget" id="pov-radio">📻 Rádio LuiggiBeats<br/><small id="pov-radio-lbl">Trocar música</small></button>
                <button class="console-gadget" id="pov-glovebox">🍪 Caixa de Cookies<br/><small>47 fornadas</small></button>
              </div>
            </div>
          </div>
        `;

        // Interações no carro!
        document.getElementById('pov-wheel').addEventListener('click', () => {
          root.LuiggiAudio.playSFX('boxer');
          const txt = document.getElementById('pov-text');
          if (txt) txt.textContent = '*VRUMM VRUMMM!* Fabricio: "Motor boxer roncando lindo até parado no Safepoint!"';
        });

        document.getElementById('pov-mirror-btn').addEventListener('click', () => {
          root.LuiggiAudio.playSFX('blip');
          const txt = document.getElementById('pov-text');
          if (txt) {
            txt.textContent =
              save.state.gatosVistos.length > 0
                ? 'Você olha no retrovisor... o gato da Luiza tá no banco de trás te encarando.'
                : 'Luis olha no retrovisor: "Olheiras de quem só dorme depois das 4h da manhã..."';
          }
        });

        let radioTrack = 0;
        document.getElementById('pov-radio').addEventListener('click', () => {
          const styles = ['lofi', 'trap', 'sad', 'sonho', 'gotico'];
          radioTrack = (radioTrack + 1) % styles.length;
          root.LuiggiAudio.tocarEstiloSintetizado(styles[radioTrack], 122);
          document.getElementById('pov-radio-lbl').textContent = `Modo: ${styles[radioTrack].toUpperCase()}`;
        });

        document.getElementById('pov-glovebox').addEventListener('click', () => {
          root.LuiggiAudio.playSFX('forno');
          const txt = document.getElementById('pov-text');
          if (txt) txt.textContent = 'Luis pega um cookie do porta-luvas. Fabricio: "Me dá um aí, Tico!"';
        });

        document.getElementById('pov-museum').addEventListener('click', () => root.LuiggiMuseum.abrirMuseu('saguao'));
        document.getElementById('pov-hero').addEventListener('click', () => root.LuiggiRhythm.abrirLuiggiBeatsHero());
        document.getElementById('pov-cookies').addEventListener('click', () => root.LuiggiCookies.abrirFabricaCookies('livre'));
        document.getElementById('pov-menu').addEventListener('click', () => {
          ov.classList.add('hidden');
          ov.innerHTML = '';
          root.LuiggiAudio.pararMusica();
          root.LuiggiGame.mostrarMenuPrincipal();
        });

        const nextBtn = document.getElementById('pov-next-line');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            root.LuiggiAudio.playSFX('blip');
            if (falaIdx < info.falas.length - 1) {
              falaIdx++;
              renderCena(falaIdx === info.falas.length - 1);
            } else {
              renderCena(true);
            }
          });
        }

        const goBtn = document.getElementById('pov-go-story');
        if (goBtn) {
          goBtn.addEventListener('click', () => {
            ov.classList.add('hidden');
            ov.innerHTML = '';
            root.LuiggiAudio.pararMusica();
            resolve();
          });
        }
      }

      renderCena(info.falas.length <= 1);
    });
  }

  root.LuiggiSubaruPOV = { abrirSubaruSafepoint };
})(window);
