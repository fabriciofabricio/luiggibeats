/**
 * src/engine/ResenhaOnline.js
 * Rede do Momento Resenha Online (várias pessoas no mesmo Subaru).
 *
 * Como funciona:
 * - P2P (WebRTC) com o Trystero (vendor/trystero-nostr.min.js). A conexão inicial é combinada por relays
 *   Nostr públicos; depois os dados vão direto entre os navegadores. Não precisa de servidor próprio,
 *   então funciona no GitHub Pages. A senha da sala (o código) criptografa essa combinação.
 * - Ninguém transmite áudio: cada um toca o MP3 do próprio jogo. Só trafega o ESTADO do rádio
 *   (faixa, posição, tocando/pausado) e do carro (porta-luvas, compartimento), além das ações.
 * - Um anfitrião é eleito sozinho (o menor id entre quem já está sincronizado). Ele é a fonte da verdade:
 *   os outros pedem (ped) e ele aplica e espalha (est/fx). Se ele sair, o próximo assume sem cortar a música.
 *
 * Mensagens (canal 'rs'):
 *   oi  {nome, pov, sync, v}  presença (ao entrar, ao chegar alguém, ao trocar de POV/nome)
 *   est {…}                   estado completo, anfitrião → todos (1x por segundo e a cada mudança)
 *   ped {…}                   pedido de alguém → anfitrião (rádio, ações do carro)
 *   fx  {…}                   ação aplicada, anfitrião → todos (buzina, volante, porta-luvas…)
 */
(function (root) {
  'use strict';

  const APP_ID = 'luiggibeats-resenha-v1';
  const PROTO = 1;
  const MAX_PESSOAS = 8;
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I pra não confundir
  // Quem entra por convite espera bastante antes de concluir que a sala está vazia: a primeira
  // conexão pelos relays públicos pode levar uns 20-30 s numa rede ruim.
  const ESPERA_FUNDADOR_MS = 30000;

  function gerarCodigo(n = 5) {
    const a = new Uint32Array(n);
    root.crypto.getRandomValues(a);
    return Array.from(a, (x) => ALFABETO[x % ALFABETO.length]).join('');
  }
  const normalizarCodigo = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const limparNome = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Passageiro';
  const disponivel = () => !!(root.Trystero && root.RTCPeerConnection && root.crypto?.subtle);

  /**
   * Entra (ou cria) uma sala.
   * o = { sala, nome, pov, fundador, eventos: { onMembros, onHost, onEstado, onPedido, onFx, onPrecisaEstado, onStatus } }
   */
  function criarSessao(o = {}) {
    if (!disponivel()) throw new Error('WebRTC indisponível neste navegador');
    const T = root.Trystero;
    const ev = o.eventos || {};
    const eu = T.selfId;
    const sala = normalizarCodigo(o.sala);
    // cri: criou a sala pelo botão; hd: desde quando sou anfitrião (Date.now) — desempatam conflitos
    const meu = { nome: limparNome(o.nome), pov: o.pov || 'luis', sync: !!o.fundador, cri: !!o.fundador, hd: null };
    const membros = new Map(); // peerId -> { nome, pov, sync, h, cri, hd, v }
    const rtt = new Map(); // peerId -> ms (média suave)
    const entrouEm = performance.now();
    let hostId = null;
    let fechado = false;

    const room = T.joinRoom({ appId: APP_ID, password: `luiggi-${sala}` }, `resenha-${sala}`, {
      onJoinError: (d) => ev.onStatus?.('erro', d?.error || 'Falha ao entrar na sala')
    });
    const canal = room.makeAction('rs', { onMessage: (m, ctx) => receber(m, ctx?.peerId) });

    function enviar(m, alvo) {
      if (fechado) return;
      try {
        const p = canal.send(m, alvo ? { target: alvo } : undefined);
        if (p && p.catch) p.catch(() => { });
      } catch (_) { }
    }
    const meuOi = () => ({ t: 'oi', nome: meu.nome, pov: meu.pov, sync: meu.sync, h: hostId, cri: meu.cri, hd: meu.hd, v: PROTO });
    const enviarOi = (alvo) => enviar(meuOi(), alvo);

    function lista() {
      const arr = [{ id: eu, nome: meu.nome, pov: meu.pov, eu: true, host: hostId === eu }];
      membros.forEach((m, id) => arr.push({ id, nome: m.nome, pov: m.pov, eu: false, host: hostId === id, versaoDiferente: m.v !== PROTO }));
      return arr;
    }

    /** Pode ser anfitrião: sou eu (sincronizado) ou alguém presente e sincronizado. */
    const elegivel = (id) => !!id && (id === eu ? meu.sync : !!membros.get(id)?.sync);

    const infoHost = (id) => {
      const m = id === eu ? meu : membros.get(id) || {};
      return { id, cri: !!m.cri, hd: typeof m.hd === 'number' ? m.hd : Infinity };
    };
    /** Entre dois anfitriões: quem criou a sala > quem é anfitrião há mais tempo > menor id. */
    const melhorHost = (a, b) => {
      const A = infoHost(a);
      const B = infoHost(b);
      if (A.cri !== B.cri) return A.cri;
      if (Math.abs(A.hd - B.hd) > 3000) return A.hd < B.hd;
      return A.id < B.id;
    };

    /**
     * O anfitrião fica enquanto estiver na sala (quem chega depois NÃO toma o lugar dele).
     * Quem acabou de chegar segue o anfitrião que a galera anuncia. Só quando ele sai é que
     * todo mundo escolhe o menor id entre os sincronizados (a mesma conta em todos os PCs).
     * Se dois anfitriões se encontrarem (ex.: alguém entrou pelo convite e, sem achar ninguém,
     * virou fundador), fica o melhor pela regra de melhorHost e o outro passa a seguir esse.
     */
    function eleger() {
      let novo = hostId;
      // Meu anfitrião passou a seguir outro: vou junto
      const meuHost = novo && novo !== eu ? membros.get(novo) : null;
      if (meuHost && meuHost.h && meuHost.h !== novo && elegivel(meuHost.h)) novo = meuHost.h;
      if (!elegivel(novo)) {
        novo = null;
        // Recém-chegado: adota o anfitrião que os sincronizados anunciam
        membros.forEach((m) => {
          if (m.sync && elegivel(m.h) && (!novo || m.h < novo)) novo = m.h;
        });
        if (!novo) {
          const candidatos = [];
          if (meu.sync) candidatos.push(eu);
          membros.forEach((m, id) => m.sync && candidatos.push(id));
          novo = candidatos.sort()[0] || null;
        }
      }
      // Conflito: outro sincronizado se diz anfitrião
      membros.forEach((m, id) => {
        if (m.sync && m.h === id && novo && novo !== id && melhorHost(id, novo)) novo = id;
      });
      if (novo === hostId) return;
      const antes = hostId;
      hostId = novo;
      meu.hd = hostId === eu ? Date.now() : null;
      ev.onHost?.(hostId === eu, hostId, antes);
      enviarOi(); // avisa a galera quem eu sigo
    }

    function marcarSincronizado() {
      if (meu.sync) return;
      meu.sync = true;
      enviarOi();
      eleger();
    }

    function receber(m, de) {
      if (fechado || !de || !m || typeof m !== 'object') return;
      if (m.t === 'oi') {
        const novo = !membros.has(de);
        if (novo && membros.size >= MAX_PESSOAS - 1) return; // carro lotado
        membros.set(de, {
          nome: limparNome(m.nome),
          pov: typeof m.pov === 'string' ? m.pov : 'luis',
          sync: !!m.sync,
          h: typeof m.h === 'string' ? m.h : null,
          cri: !!m.cri,
          hd: typeof m.hd === 'number' && isFinite(m.hd) ? m.hd : null,
          v: m.v
        });
        eleger();
        ev.onMembros?.(lista(), { tipo: novo ? 'entrou' : 'mudou', id: de });
        return;
      }
      if (!membros.has(de)) return; // só aceita quem já se apresentou
      if (m.t === 'est') {
        if (de !== hostId) return;
        marcarSincronizado();
        ev.onEstado?.(m.d, de, (rtt.get(de) ?? 120) / 2000);
      } else if (m.t === 'ped') {
        if (hostId === eu) ev.onPedido?.(m.d, de);
      } else if (m.t === 'fx') {
        if (de === hostId) ev.onFx?.(m.d, de);
      }
    }

    room.onPeerJoin = (id) => {
      enviarOi(id);
      // O anfitrião manda o estado logo depois do "oi" (o canal é ordenado, então o oi chega antes)
      if (hostId === eu) setTimeout(() => ev.onPrecisaEstado?.(id), 60);
    };
    room.onPeerLeave = (id) => {
      const m = membros.get(id);
      membros.delete(id);
      rtt.delete(id);
      eleger();
      if (m) ev.onMembros?.(lista(), { tipo: 'saiu', id, nome: m.nome });
    };

    // Latência até o anfitrião (compensa a posição da música) + virar fundador se a sala estiver vazia
    const relogio = setInterval(() => {
      if (fechado) return;
      if (!meu.sync && !hostId && performance.now() - entrouEm > ESPERA_FUNDADOR_MS) marcarSincronizado();
      if (hostId && hostId !== eu) {
        const alvo = hostId;
        room
          .ping(alvo)
          .then((ms) => {
            if (typeof ms !== 'number' || !isFinite(ms)) return;
            const ant = rtt.get(alvo);
            rtt.set(alvo, ant == null ? ms : ant * 0.7 + ms * 0.3);
          })
          .catch(() => { });
      }
    }, 2500);

    if (meu.sync) eleger();
    ev.onMembros?.(lista(), { tipo: 'eu' });

    return {
      sala,
      eu,
      get souHost() {
        return hostId === eu;
      },
      get hostId() {
        return hostId;
      },
      get sincronizado() {
        return meu.sync;
      },
      get pessoas() {
        return lista();
      },
      get total() {
        return membros.size + 1;
      },
      nomeDe(id) {
        return id === eu ? meu.nome : membros.get(id)?.nome || 'Alguém';
      },
      latenciaHost() {
        return hostId && hostId !== eu ? rtt.get(hostId) ?? null : 0;
      },
      atualizar(campos = {}) {
        if (campos.nome !== undefined) meu.nome = limparNome(campos.nome);
        if (campos.pov !== undefined) meu.pov = campos.pov;
        enviarOi();
        ev.onMembros?.(lista(), { tipo: 'eu' });
      },
      /** Anfitrião → todos (ou só um, com alvo). */
      enviarEstado(d, alvo) {
        if (hostId === eu) enviar({ t: 'est', d }, alvo);
      },
      /** Pede ao anfitrião. Se eu sou o anfitrião, processa aqui mesmo. Retorna false se ainda não há anfitrião. */
      pedir(d) {
        if (hostId === eu) {
          ev.onPedido?.(d, eu);
          return true;
        }
        if (!hostId) return false;
        enviar({ t: 'ped', d }, hostId);
        return true;
      },
      /** Anfitrião espalha uma ação já aplicada. */
      fx(d) {
        if (hostId === eu) enviar({ t: 'fx', d });
      },
      sair() {
        if (fechado) return;
        fechado = true;
        clearInterval(relogio);
        try {
          room.leave();
        } catch (_) { }
      }
    };
  }

  root.LuiggiResenhaOnline = { criarSessao, gerarCodigo, normalizarCodigo, limparNome, disponivel, MAX_PESSOAS, PROTO };
})(window);
