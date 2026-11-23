/**
 * src/engine/ResenhaCelular.js
 * O celular de cada pessoa no Momento Resenha. Dentro do Subaru ele está pareado por Bluetooth
 * com o rádio do carro: dá pra trocar, voltar, pausar, escolher qualquer faixa da LuiggiCloud
 * e pular pra um ponto da música. Fora do carro o Bluetooth perde o sinal (só dá pra olhar).
 *
 * Uso:
 *   const cel = LuiggiResenhaCelular.criar({ host, onComando(cmd, arg), conectado: () => bool, galera: () => [...], onFechar });
 *   cel.alternar(); cel.atualizar();
 * Comandos: 'prev' | 'next' | 'toggle' | 'faixa' (arg = id) | 'seek' (arg = segundos) | 'estacao' (arg = índice)
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tempo = (s) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };
  const cloud = () => (root.LuiggiCloud?.ativo ? root.LuiggiCloud : null);

  // ---------------- Volume da música (individual: só muda o som de quem mexe) ----------------
  // Usa o mesmo volume de música do jogo (config.volMusica), que fica salvo neste aparelho e nunca vai pra rede.
  const volume = (() => {
    let antesDoMudo = null;
    const cfg = () => root.LuiggiSave?.state?.config || null;
    const ler = () => {
      const v = cfg()?.volMusica;
      return Number.isFinite(v) ? v : 0.7;
    };
    function definir(v) {
      v = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
      const c = cfg();
      if (c) {
        c.volMusica = v;
        try {
          root.LuiggiSave.salvar();
        } catch (_) { }
      }
      root.LuiggiAudio?.aplicarVolumes?.();
      root.LuiggiCloud?.aplicarVolume?.();
      if (v > 0) antesDoMudo = null;
      root.dispatchEvent(new CustomEvent('luiggi-volume-musica', { detail: v }));
    }
    function alternarMudo() {
      const v = ler();
      if (v > 0) {
        antesDoMudo = v;
        definir(0);
        antesDoMudo = v;
      } else definir(antesDoMudo || 0.7);
    }
    const icone = (v) => (v <= 0 ? '🔇' : v < 0.35 ? '🔈' : v < 0.7 ? '🔉' : '🔊');
    const html = (extra = '') =>
      `<div class="rs-vol ${extra}" title="Volume da música — só pra você, cada um ajusta o seu"><button class="rs-vol-mudo" type="button" title="Mudo (M)">🔊</button><input class="rs-vol-range" type="range" min="0" max="1" step="0.05" aria-label="Volume da música"><output class="rs-vol-n">70%</output></div>`;
    /** Liga todos os controles .rs-vol dentro de host. Devolve uma função pra desligar. */
    function ligar(host) {
      const sync = () => {
        const v = ler();
        host.querySelectorAll('.rs-vol').forEach((w) => {
          const r = w.querySelector('.rs-vol-range');
          if (r && document.activeElement !== r) r.value = v;
          const b = w.querySelector('.rs-vol-mudo');
          if (b) b.textContent = icone(v);
          const n = w.querySelector('.rs-vol-n');
          if (n) n.textContent = `${Math.round(v * 100)}%`;
          w.classList.toggle('mudo', v <= 0);
        });
      };
      const onInput = (e) => {
        if (e.target.classList?.contains('rs-vol-range')) definir(Number(e.target.value));
      };
      const onClick = (e) => {
        if (e.target.closest?.('.rs-vol-mudo')) alternarMudo();
      };
      // Soltou o controle: devolve o teclado pro jogo (WASD não fica preso no volume)
      const onChange = (e) => {
        if (e.target.classList?.contains('rs-vol-range')) e.target.blur();
      };
      host.addEventListener('change', onChange);
      // Não deixa o arrastar do volume girar a câmera nem as setas andarem
      const parar = (e) => {
        if (e.target.closest?.('.rs-vol')) e.stopPropagation();
      };
      host.addEventListener('input', onInput);
      host.addEventListener('click', onClick);
      host.addEventListener('pointerdown', parar);
      host.addEventListener('keydown', parar);
      root.addEventListener('luiggi-volume-musica', sync);
      sync();
      return () => {
        host.removeEventListener('input', onInput);
        host.removeEventListener('change', onChange);
        host.removeEventListener('click', onClick);
        host.removeEventListener('pointerdown', parar);
        host.removeEventListener('keydown', parar);
        root.removeEventListener('luiggi-volume-musica', sync);
      };
    }
    return { ler, definir, alternarMudo, html, ligar };
  })();

  function criar(o = {}) {
    const el = document.createElement('div');
    el.className = 'rs-cel hidden';
    el.innerHTML = `
      <div class="rs-cel-aparelho">
        <div class="rs-cel-notch"></div>
        <div class="rs-cel-status"><span class="rs-cel-hora"></span><span class="rs-cel-bt"></span><span>🔋 87%</span></div>
        <div class="rs-cel-tela">
          <div class="rs-cel-app-head">
            <span class="rs-cel-logo">☁️ LuiggiCloud</span>
            <button class="rs-cel-x" data-cel="fechar" title="Guardar o celular (C)">✕</button>
          </div>
          <div class="rs-cel-aviso"></div>
          <div class="rs-cel-agora">
            <img class="rs-cel-capa" alt="">
            <div class="rs-cel-info"><strong class="rs-cel-titulo"></strong><small class="rs-cel-artista"></small></div>
          </div>
          <div class="rs-cel-barra" data-cel="seek" title="Toque pra pular pra esse ponto da música"><div class="rs-cel-progresso"></div></div>
          <div class="rs-cel-tempos"><span class="rs-cel-t0">0:00</span><span class="rs-cel-t1">0:00</span></div>
          <div class="rs-cel-ctrl">
            <button data-cel="prev" title="Voltar">⏮</button>
            <button data-cel="toggle" class="rs-cel-play" title="Tocar / pausar">⏯</button>
            <button data-cel="next" title="Próxima">⏭</button>
          </div>
          ${volume.html('rs-cel-vol')}
          <div class="rs-cel-abas"></div>
          <div class="rs-cel-lista"></div>
          <div class="rs-cel-rodape"></div>
        </div>
        <div class="rs-cel-home"></div>
      </div>`;
    (o.host || document.body).appendChild(el);
    const $ = (s) => el.querySelector(s);
    const desligarVolume = volume.ligar(el);
    let aba = 'todas';
    let assinaturaLista = '';
    let timer = null;

    // Pra jogar com o celular aberto: cliques e teclas aqui não vazam pro 3D
    ['pointerdown', 'wheel'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cel]');
      if (!b) return;
      const cmd = b.dataset.cel;
      if (cmd === 'fechar') return fechar();
      if (cmd === 'aba') {
        aba = b.dataset.aba;
        assinaturaLista = '';
        return atualizar();
      }
      if (!o.conectado?.()) {
        tremer();
        return;
      }
      if (cmd === 'seek') {
        const c = cloud();
        const f = c?.faixa;
        if (!f?.duracao) return;
        const r = b.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        o.onComando?.('seek', Math.round(k * f.duracao * 10) / 10);
      } else if (cmd === 'faixa') o.onComando?.('faixa', b.dataset.id);
      else if (cmd === 'estacao') o.onComando?.('estacao', Number(b.dataset.e));
      else o.onComando?.(cmd);
      root.LuiggiAudio?.playSFX?.('blip');
      setTimeout(atualizar, 150);
    });

    function tremer() {
      el.classList.remove('tremendo');
      void el.offsetWidth;
      el.classList.add('tremendo');
      root.LuiggiAudio?.playSFX?.('bruh');
    }

    function listaFaixas() {
      const c = cloud();
      if (!c) return null;
      const cat = c.catalogo;
      return aba === 'todas' ? cat.faixas : cat.faixas.filter((f) => f.artistaId === aba);
    }

    function desenharLista() {
      const c = cloud();
      const atual = c?.faixa?.id || `s${o.estacao?.() ?? 0}`;
      const lista = listaFaixas();
      const assinatura = `${aba}|${atual}|${lista ? lista.length : 's'}`;
      if (assinatura === assinaturaLista) return;
      assinaturaLista = assinatura;
      const abasEl = $('.rs-cel-abas');
      const listaEl = $('.rs-cel-lista');
      if (!c) {
        // Sem as músicas (ex.: aberto direto do arquivo): estações do rádio sintetizado
        abasEl.innerHTML = '<span class="ativo">📻 Estações</span>';
        const nomes = root.LuiggiSubaruPOV?.NOMES_RADIO || {};
        const est = root.LuiggiSubaruPOV?.ESTILOS_RADIO || [];
        listaEl.innerHTML = est
          .map((e, i) => `<button class="rs-cel-faixa ${atual === `s${i}` ? 'ativa' : ''}" data-cel="estacao" data-e="${i}"><span class="rs-cel-mini" style="background:hsl(${i * 60},70%,45%)">📻</span><span><strong>${esc(nomes[e] || e)}</strong><small>Rádio LuiggiBeats</small></span></button>`)
          .join('');
        return;
      }
      const artistas = c.catalogo.artistas.filter((a) => c.catalogo.faixas.some((f) => f.artistaId === a.id));
      abasEl.innerHTML = [`<button data-cel="aba" data-aba="todas" class="${aba === 'todas' ? 'ativo' : ''}">Todas</button>`]
        .concat(artistas.map((a) => `<button data-cel="aba" data-aba="${esc(a.id)}" class="${aba === a.id ? 'ativo' : ''}">${esc(a.nome)}</button>`))
        .join('');
      listaEl.innerHTML = lista
        .map(
          (f) => `<button class="rs-cel-faixa ${f.id === atual ? 'ativa' : ''}" data-cel="faixa" data-id="${esc(f.id)}">
            <img class="rs-cel-mini" src="${esc(c.capaDe(f))}" alt="" loading="lazy">
            <span><strong>${esc(f.titulo)}</strong><small>${esc(f.artista)}${f.album ? ` · ${esc(f.album)}` : ''}</small></span>
            <em>${f.id === atual ? '🔊' : tempo(f.duracao)}</em>
          </button>`
        )
        .join('');
      const ativa = listaEl.querySelector('.ativa');
      if (ativa) ativa.scrollIntoView({ block: 'nearest' });
    }

    function atualizar() {
      if (el.classList.contains('hidden')) return;
      const agora = new Date();
      $('.rs-cel-hora').textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const conectado = !!o.conectado?.();
      el.classList.toggle('desconectado', !conectado);
      $('.rs-cel-bt').textContent = conectado ? '🔵 Subaru' : '⚪ sem BT';
      $('.rs-cel-aviso').textContent = conectado ? '' : '📵 Fora do alcance do Bluetooth do Subaru. Volta pro carro pra mexer no som.';
      const c = cloud();
      const f = c?.faixa;
      if (c) {
        $('.rs-cel-capa').src = f ? c.capaDe(f) : '';
        $('.rs-cel-capa').style.visibility = f ? '' : 'hidden';
        $('.rs-cel-titulo').textContent = f ? f.titulo : 'Nada tocando';
        $('.rs-cel-artista').textContent = f ? `${f.artista}${f.album ? ` · ${f.album}` : ''}` : 'Escolha uma faixa aí embaixo';
        const dur = f?.duracao || 0;
        const pos = c.posicao || 0;
        $('.rs-cel-progresso').style.width = `${dur ? Math.min(100, (pos / dur) * 100) : 0}%`;
        $('.rs-cel-t0').textContent = tempo(pos);
        $('.rs-cel-t1').textContent = tempo(dur);
        $('.rs-cel-play').textContent = c.tocando ? '⏸' : '▶';
      } else {
        const nomes = root.LuiggiSubaruPOV?.NOMES_RADIO || {};
        const est = root.LuiggiSubaruPOV?.ESTILOS_RADIO || [];
        $('.rs-cel-capa').style.visibility = 'hidden';
        $('.rs-cel-titulo').textContent = nomes[est[o.estacao?.() ?? 0]] || 'Rádio';
        $('.rs-cel-artista').textContent = 'Rádio LuiggiBeats (sintetizado)';
        $('.rs-cel-progresso').style.width = '0%';
        $('.rs-cel-play').textContent = o.tocandoSintetizado?.() ? '⏸' : '▶';
      }
      const galera = o.galera?.() || [];
      $('.rs-cel-rodape').textContent = conectado
        ? `🔵 Conectado ao Subaru Legacy${galera.length > 1 ? ` · ${galera.length} celulares no carro` : ''} · o som sai no rádio`
        : '⚪ Bluetooth: procurando o Subaru…';
      desenharLista();
    }

    function abrir() {
      el.classList.remove('hidden');
      assinaturaLista = '';
      atualizar();
      clearInterval(timer);
      timer = setInterval(atualizar, 500);
    }
    function fechar() {
      if (el.classList.contains('hidden')) return;
      el.classList.add('hidden');
      clearInterval(timer);
      o.onFechar?.();
    }

    return {
      el,
      abrir,
      fechar,
      alternar() {
        if (el.classList.contains('hidden')) abrir();
        else fechar();
        return !el.classList.contains('hidden');
      },
      atualizar,
      get aberto() {
        return !el.classList.contains('hidden');
      },
      dispose() {
        clearInterval(timer);
        desligarVolume();
        el.remove();
      }
    };
  }

  /** Celular 3D pra mão do boneco: a tela mostra a LuiggiCloud tocando. */
  function criarCelular3D() {
    const L = root.Luiggi3D;
    if (!L) return null;
    const desenhar = (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ff7a1a');
      g.addColorStop(0.45, '#7c2d12');
      g.addColorStop(1, '#0b0c10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(w * 0.18, h * 0.16, w * 0.64, w * 0.64);
      ctx.fillStyle = '#ff5500';
      ctx.font = `bold ${w * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♪', w / 2, h * 0.16 + w * 0.43);
      const f = root.LuiggiCloud?.faixa;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${w * 0.09}px sans-serif`;
      ctx.fillText((f?.titulo || 'LuiggiCloud').slice(0, 16), w / 2, h * 0.62);
      ctx.fillStyle = '#fed7aa';
      ctx.font = `${w * 0.07}px sans-serif`;
      ctx.fillText((f?.artista || 'Resenha no Subaru').slice(0, 20), w / 2, h * 0.68);
      ctx.fillStyle = '#fff';
      ctx.font = `${w * 0.12}px sans-serif`;
      ctx.fillText('⏮   ⏯   ⏭', w / 2, h * 0.84);
    };
    const m = L.createPhoneMesh(desenhar, { resW: 180, resH: 370 });
    m.scale.setScalar(0.075);
    m.userData.desenhar = desenhar;
    return m;
  }

  root.LuiggiResenhaCelular = { criar, criarCelular3D, volume };
})(window);
