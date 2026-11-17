/**
 * src/ui/MuseumUI.js
 * O Museu Interativo das Memórias do LuiggiBeats (Hub completo com todas as áreas da seção 8).
 */
(function (root) {
  'use strict';

  function abrirMuseu(abaInicial = 'saguao') {
    const host = document.getElementById('museum-overlay');
    const data = root.LuiggiData.cache;
    const save = root.LuiggiSave;
    const museu = data.museu || {};
    let aba = abaInicial;

    function render() {
      host.classList.remove('hidden');
      const totalCookies = (save.state.contadores.cookiesAssados || 0) + save.state.cookiesEscondidos.length;

      host.innerHTML = `
        <div class="museum-shell">
          <header class="museum-top">
            <div>
              <h2>🏛️ Museu das Memórias do LuiggiBeats</h2>
              <div class="mg-sub">Capítulos concluídos: ${save.state.capitulosConcluidos.length}/16 · 🍪 Cookies: ${totalCookies}</div>
            </div>
            <button class="mg-btn" id="mus-close">⬅ Voltar ao Jogo</button>
          </header>
          <div class="museum-layout">
            <nav class="museum-nav">
              ${(museu.areasGerais || [])
                .map(
                  (a) =>
                    `<button class="mus-tab ${aba === a.id ? 'active' : ''}" data-mus-tab="${a.id}">${a.nome}</button>`
                )
                .join('')}
              <button class="mus-tab ${aba === 'salas' ? 'active' : ''}" data-mus-tab="salas">🚪 Salas dos Capítulos</button>
            </nav>
            <section class="museum-content" id="mus-body"></section>
          </div>
        </div>
      `;

      document.getElementById('mus-close').addEventListener('click', () => {
        root.LuiggiAudio.pararMusica();
        host.classList.add('hidden');
        host.innerHTML = '';
      });

      host.querySelectorAll('[data-mus-tab]').forEach((b) => {
        b.addEventListener('click', () => {
          aba = b.dataset.musTab;
          render();
        });
      });

      renderConteudo(document.getElementById('mus-body'));
    }

    function renderConteudo(el) {
      if (aba === 'saguao') {
        const subaru = data.veiculoMap.get('subaru_legacy');
        el.innerHTML = `
          <h3>🚙 Saguão Principal — O Subaru Legacy Azul</h3>
          <p class="mus-plaque">"Veículo de valor sentimental incalculável. Os bancos guardam segredos." — Curadoria LuiggiBeats</p>
          <div class="saguao-car">${subaru && root.LuiggiRig ? root.LuiggiRig.renderVehicleSVG(subaru) : ''}</div>
          <div class="btn-row" style="margin-top:14px;">
            <button class="mg-btn primary" data-jump="salas">Explorar Salas dos Capítulos</button>
            <button class="mg-btn" data-jump="mapa_multiverso">Ver Mapa do Multiverso</button>
            <button class="mg-btn" data-jump="fliperama">Ir pro Fliperama</button>
          </div>
        `;
        el.querySelectorAll('[data-jump]').forEach((b) =>
          b.addEventListener('click', () => {
            aba = b.dataset.jump;
            render();
          })
        );
      } else if (aba === 'salas') {
        const concluidos = save.state.capitulosConcluidos;
        const maxCap = save.state.capituloMaxDesbloqueado;
        el.innerHTML = `
          <h3>🚪 Salas por Capítulo</h3>
          <div class="mus-grid">
            ${(museu.salasCapitulos || [])
              .map((s) => {
                const liberada = save.state.jogoZerado || concluidos.includes(s.capitulo) || s.capitulo <= maxCap;
                return `
                  <div class="mus-card ${liberada ? '' : 'locked'}">
                    <h4>${s.capitulo === 0 ? 'Prólogo' : 'Cap. ' + s.capitulo}: ${s.nome}</h4>
                    ${
                      liberada
                        ? `<ul>${s.objetos
                            .map((o) => `<li><strong>${o.nome}:</strong> <em>${o.placa}</em></li>`)
                            .join('')}</ul>
                           ${
                             s.cofreTrancado
                               ? `<button class="mini-btn" id="btn-cofre">🔐 Tentar Abrir Cofre</button> <span id="cofre-msg" style="color:#f87171;font-size:0.8rem;"></span>`
                               : ''
                           }
                           ${
                             s.capitulo === 13
                               ? `<button class="mini-btn" id="btn-cera">🗿 Interagir com Estátua</button> <span id="cera-msg" style="color:#93c5fd;font-size:0.8rem;"></span>`
                               : ''
                           }
                           <div style="margin-top:10px;">
                             <button class="mg-btn" data-replay="${s.capitulo}">▶ Rejogar Capítulo</button>
                           </div>`
                        : `<p>🔒 Conclua o capítulo anterior para desbloquear esta sala.</p>`
                    }
                  </div>`;
              })
              .join('')}
          </div>
        `;

        const cofreBtn = document.getElementById('btn-cofre');
        if (cofreBtn) {
          cofreBtn.addEventListener('click', () => {
            const c = save.incrementarContador('tentativasCofre', 1);
            const msgs = museu.salasCapitulos[3]?.mensagensCofre || ['Acesso negado.'];
            document.getElementById('cofre-msg').textContent = msgs[(c - 1) % msgs.length];
            if (c >= 10 && root.LuiggiAchievements) root.LuiggiAchievements.desbloquear('curioso_demais');
          });
        }
        const ceraBtn = document.getElementById('btn-cera');
        if (ceraBtn) {
          ceraBtn.addEventListener('click', () => {
            save.incrementarContador('concordancias', 1);
            document.getElementById('cera-msg').textContent = 'Estátua: "É... verdade. Complicado, né."';
          });
        }
        el.querySelectorAll('[data-replay]').forEach((b) => {
          b.addEventListener('click', () => {
            host.classList.add('hidden');
            host.innerHTML = '';
            root.LuiggiGame.iniciarCapitulo(Number(b.dataset.replay));
          });
        });
      } else if (aba === 'palco_hero') {
        el.innerHTML = `
          <h3>🎸 Palco LuiggiBeats</h3>
          <p>Toque qualquer faixa desbloqueada no LuiggiBeats Hero (incluindo seus beats do FL Estúdio) ou dance o Passinho Sad!</p>
          <div class="btn-row">
            <button class="mg-btn primary" id="mus-hero">🎸 Abrir LuiggiBeats Hero</button>
            <button class="mg-btn" id="mus-ddr">🕺 Passinho Sad</button>
          </div>
        `;
        document.getElementById('mus-hero').addEventListener('click', () => root.LuiggiRhythm.abrirLuiggiBeatsHero());
        document.getElementById('mus-ddr').addEventListener('click', () => root.LuiggiRhythm.abrirPassinhoSad());
      } else if (aba === 'estudio_livre') {
        el.innerHTML = `
          <h3>🎛️ Estúdio FL Livre</h3>
          <p>Produza novos beats com sintetizador Web Audio e o Discord reagindo ao vivo! Beats salvos: <strong>${save.state.beatsAutorais.length}</strong></p>
          <button class="mg-btn primary" id="mus-fl">🎹 Abrir Estúdio</button>
        `;
        document.getElementById('mus-fl').addEventListener('click', () => root.LuiggiFLStudio.abrirFLEstudio(true));
      } else if (aba === 'cozinha_livre') {
        el.innerHTML = `
          <h3>🍪 Cozinha & Modo Infinito</h3>
          <p>Receitas desbloqueadas ou entre no Modo Infinito de Cookies!</p>
          <div class="btn-row">
            <button class="mg-btn primary" id="mus-ck">🥣 Fazer Fornada</button>
            <button class="mg-btn" id="mus-inf">♾️ Modo Infinito de Cookies</button>
          </div>
        `;
        document.getElementById('mus-ck').addEventListener('click', () => root.LuiggiCookies.abrirFabricaCookies('livre'));
        document.getElementById('mus-inf').addEventListener('click', () => root.LuiggiCookies.abrirModoInfinito());
      } else if (aba === 'jukebox') {
        const faixas = data.musicas?.faixas || [];
        el.innerHTML = `
          <h3>📻 Jukebox "Rádio LuiggiBeats"</h3>
          <p style="font-size:0.84rem;color:#9ca3af;">${data.musicas?.nota || ''}</p>
          <div class="mus-grid">
            ${faixas
              .map(
                (f) => `
              <div class="mus-card">
                <h4>🎵 ${f.titulo}</h4>
                <p><small>${f.artista}${f.album ? ' · ' + f.album : ''}${f.ano ? ' (' + f.ano + ')' : ''}</small></p>
                <p>${f.descricao}</p>
                <button class="mini-btn" data-play-jb="${f.id}">▶ Ouvir no LuiggiCloud</button>
              </div>`
              )
              .join('')}
          </div>
          <button class="mini-btn" id="jb-stop" style="margin-top:10px;">⏹ Parar Áudio</button>
        `;
        el.querySelectorAll('[data-play-jb]').forEach((b) => {
          b.addEventListener('click', () => {
            const f = faixas.find((x) => x.id === b.dataset.playJb);
            if (f && root.LuiggiCloud?.ativo) root.LuiggiCloud.tocarFaixa(f.id);
            else if (f) root.LuiggiAudio.tocarEstiloSintetizado(f.ehMusicaDoTiago ? 'tiago' : 'trap', f.bpm || 136, { forcar: true });
          });
        });
        document.getElementById('jb-stop').addEventListener('click', () => {
          root.LuiggiAudio.pararMusica();
          root.LuiggiCloud?.pause?.(true);
        });
      } else if (aba === 'garagem') {
        el.innerHTML = `
          <h3>🔧 Garagem & Direção Livre</h3>
          <p>Cor atual do Subaru: <strong>${save.state.subaruMods.cor}</strong> · Boost Motor: +${save.state.subaruMods.motorBoost || 0}</p>
          <div class="btn-row" style="margin-bottom:12px;">
            <button class="mini-btn" data-carcol="#1245A8">Azul Rally Clássico</button>
            <button class="mini-btn" data-carcol="#1D4ED8">Azul Neon</button>
            <button class="mini-btn" data-carcol="#18181B">Preto Noturno</button>
          </div>
          <div class="btn-row">
            <button class="mg-btn primary" id="gar-livre">🚗 Direção Livre por Curitiba</button>
            <button class="mg-btn" id="gar-racha">🏁 Revanche do Racha vs Emily</button>
          </div>
        `;
        el.querySelectorAll('[data-carcol]').forEach((b) => {
          b.addEventListener('click', () => {
            save.state.subaruMods.cor = b.dataset.carcol;
            save.salvar();
            render();
          });
        });
        document.getElementById('gar-livre').addEventListener('click', () => root.LuiggiDriving.abrirDirecao('livre'));
        document.getElementById('gar-racha').addEventListener('click', () => root.LuiggiDriving.abrirDirecao('racha'));
      } else if (aba === 'fliperama') {
        const mgs = Object.values(data.minigames?.minigames || {});
        el.innerHTML = `
          <h3>🕹️ Fliperama do Museu</h3>
          <div class="mus-grid">
            ${mgs
              .map(
                (m) => `
              <div class="mus-card">
                <h4>${m.titulo}</h4>
                <p><small>Cap. ${m.capitulo} · Recorde: ${save.state.recordesMinigames[m.id] || 0} pts</small></p>
                <button class="mini-btn" data-arc="${m.id}">▶ Jogar</button>
              </div>`
              )
              .join('')}
          </div>
        `;
        el.querySelectorAll('[data-arc]').forEach((b) => {
          b.addEventListener('click', () => root.LuiggiGame.executarMinigame(b.dataset.arc, true));
        });
      } else if (aba === 'arena_x1') {
        el.innerHTML = `
          <h3>🥊 Arena do X1</h3>
          <p>Modo livre de luta 2D (1P vs CPU ou 2P no mesmo teclado), incluindo personagens secretos!</p>
          <button class="mg-btn primary" id="mus-x1">🔥 Abrir Arena X1</button>
        `;
        document.getElementById('mus-x1').addEventListener('click', () => root.LuiggiFighter.abrirLutaX1(true));
      } else if (aba === 'galeria_fotos') {
        const fotosReais = (data.personagens?.personagens || []).filter((p) => p.temFoto && p.fotos?.length);
        const radares = save.state.radarFotos || [];
        el.innerHTML = `
          <h3>📸 Galeria de Fotos Reais & Radares do Subaru</h3>
          ${
            radares.length
              ? `<h4>📷 Fotos dos Radares (${radares.length})</h4>
                 <div class="photo-gallery-grid">
                   ${radares
                     .map(
                       (r) => `<div class="gal-item"><img src="${r.dataUrl}" /><div>${r.titulo} (${r.velocidade})</div></div>`
                     )
                     .join('')}
                 </div>`
              : `<p>Nenhum radar te pegou ainda (dirija rápido por Curitiba!).</p>`
          }
          <h4 style="margin-top:16px;">🖼️ Acervo Real (/assets) — Clique para editar legenda</h4>
          <div class="photo-gallery-grid">
            ${fotosReais
              .map((p) => {
                const leg = save.state.legendasFotos[p.id] || `${p.nome} — "${p.fraseMarcante}"`;
                return `
                  <div class="gal-item">
                    <img src="${encodeURI(p.fotos[0])}" alt="${p.nome}" />
                    <div class="gal-cap" data-cap-id="${p.id}" title="Clique para editar legenda">${leg}</div>
                  </div>`;
              })
              .join('')}
          </div>
        `;
        el.querySelectorAll('[data-cap-id]').forEach((c) => {
          c.addEventListener('click', () => {
            const novo = prompt('Nova legenda da foto:', c.textContent);
            if (novo !== null) {
              save.state.legendasFotos[c.dataset.capId] = novo;
              save.salvar();
              render();
            }
          });
        });
      } else if (aba === 'mapa_multiverso') {
        const escs = Object.values(data.escolhas?.escolhas || {});
        const vistas = save.state.escolhasVistas || {};
        el.innerHTML = `
          <h3>🌀 Mapa do Multiverso</h3>
          <p>Todos os galhos vistos ficam coloridos; os não vistos aparecem como "???". Todos convergem num tronco único: <strong>A VIDA REAL</strong>.</p>
          <div class="multiverse-list">
            ${escs
              .map((e) => {
                const v = vistas[e.id] || [];
                return `
                  <div class="mv-node">
                    <div class="mv-q">Cap. ${e.capitulo}: ${e.pergunta}</div>
                    <div class="mv-branches">
                      ${e.opcoes
                        .map((o, i) =>
                          v.includes(i)
                            ? `<span class="mv-branch seen">✓ ${o.texto}</span>`
                            : `<span class="mv-branch">???</span>`
                        )
                        .join('')}
                    </div>
                    <div class="mv-trunk">➔ A VIDA REAL: ${e.eventoReal}</div>
                  </div>`;
              })
              .join('')}
          </div>
        `;
      } else if (aba === 'mural_conquistas') {
        const todas = data.conquistas?.conquistas || [];
        const desb = save.state.conquistas || [];
        const pct = Math.round((desb.length / (todas.length || 1)) * 100);
        el.innerHTML = `
          <h3>🏆 Mural de Conquistas (${desb.length}/${todas.length} · ${pct}%)</h3>
          <div class="mus-grid">
            ${todas
              .map((c) => {
                const ok = desb.includes(c.id);
                return `
                  <div class="mus-card ${ok ? 'ach-ok' : 'locked'}">
                    <h4>${ok ? c.icone : '🔒'} ${ok ? c.nome : c.secreta ? 'Conquista Secreta' : '???'}</h4>
                    <p>${ok ? c.descricao : c.secreta ? 'Segredo misterioso.' : c.dica}</p>
                  </div>`;
              })
              .join('')}
          </div>
        `;
      } else if (aba === 'sala_personagens') {
        const lista = data.personagens?.personagens || [];
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <h3>👥 Sala de Personagens</h3>
            <a href="galeria_personagens.html" target="_blank" class="mg-btn primary" style="text-decoration:none;">🎨 Abrir Galeria de Comparação (Dev)</a>
          </div>
          <div class="char-cards-grid">
            ${lista
              .map(
                (p) => `
              <div class="mus-card char-mini-card">
                <div class="char-mini-svg">${root.LuiggiRig ? root.LuiggiRig.renderCharacterSVG(p, { expressao: 'neutro', scale: 'portrait' }) : ''}</div>
                <h4>${p.nome}</h4>
                <small>${p.apelido} · ${p.capituloPrimeiraAparicao === 0 ? 'Prólogo' : 'Cap. ' + p.capituloPrimeiraAparicao}</small>
                <p><em>"${p.fraseMarcante}"</em></p>
              </div>`
              )
              .join('')}
          </div>
        `;
      } else if (aba === 'lojinha_cookies') {
        const itens = museu.lojinha || [];
        el.innerHTML = `
          <h3>🍪 Lojinha de Cookies (Saldo: ${totalCookies} cookies)</h3>
          <div class="mus-grid">
            ${itens
              .map((it) => {
                const comprou = save.state.lojinhaComprados.includes(it.id);
                const equipado = save.state.trajeAtual === it.id;
                return `
                  <div class="mus-card">
                    <h4>${it.nome}</h4>
                    <p>${it.descricao}</p>
                    ${
                      comprou
                        ? `<button class="mini-btn ${equipado ? 'active' : ''}" data-equip="${it.id}">${equipado ? '✓ Equipado' : 'Equipar'}</button>`
                        : `<button class="mg-btn primary" data-buy="${it.id}" ${totalCookies < it.custo ? 'disabled' : ''}>Comprar (${it.custo} 🍪)</button>`
                    }
                  </div>`;
              })
              .join('')}
          </div>
        `;
        el.querySelectorAll('[data-buy]').forEach((b) => {
          b.addEventListener('click', () => {
            const it = itens.find((x) => x.id === b.dataset.buy);
            if (it && totalCookies >= it.custo) {
              save.state.contadores.cookiesAssados = Math.max(0, (save.state.contadores.cookiesAssados || 0) - it.custo);
              save.state.lojinhaComprados.push(it.id);
              if (it.tipo === 'subaru' && it.id === 'subaru_neon') save.state.subaruMods.neon = true;
              save.salvar();
              render();
            }
          });
        });
        el.querySelectorAll('[data-equip]').forEach((b) => {
          b.addEventListener('click', () => {
            save.state.trajeAtual = b.dataset.equip;
            save.salvar();
            render();
          });
        });
      }
    }

    render();
  }

  root.LuiggiMuseum = { abrirMuseu };
})(window);
