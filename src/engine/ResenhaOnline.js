/**
 * src/engine/ResenhaOnline.js
 * Rede do Momento Resenha Online (várias pessoas no mesmo Subaru).
 *
 * Como funciona (híbrido, sem servidor próprio, roda no GitHub Pages):
 * - ROTA DIRETA (P2P/WebRTC, Trystero em vendor/trystero-nostr.min.js): a conexão é combinada por relays
 *   Nostr públicos e depois os dados vão direto entre os navegadores. É a mais rápida, mas algumas redes
 *   (NAT restrito, 4G/CGNAT, firewall) não deixam a conexão direta fechar.
 * - ROTA RESERVA (relay): as mesmas mensagens vão por relays Nostr públicos (WebSocket na porta 443, passa
 *   em quase toda rede), criptografadas com AES-GCM derivado do código da sala. Cada pessoa usa a rota
 *   direta com quem conseguiu conectar e a reserva com o resto. Atraso típico da reserva: 50–300 ms.
 * - Ninguém transmite áudio: cada um toca o MP3 do próprio jogo. Só trafega o ESTADO do rádio
 *   (faixa, posição, tocando/pausado) e do carro (porta-luvas, compartimento), além das ações.
 * - Um anfitrião é eleito sozinho e fica enquanto estiver na sala. Ele é a fonte da verdade:
 *   os outros pedem (ped) e ele aplica e espalha (est/fx). Se ele sair, outro assume sem cortar a música.
 *
 * Mensagens:
 *   oi    {nome, pov, sync, h, cri, hd, v}  presença (ao entrar, a cada 8 s pela reserva e ao mudar algo)
 *   tchau {}                                saiu da sala
 *   est   {…}   estado completo, anfitrião → todos (1x por segundo e a cada mudança)
 *   ped   {…}   pedido de alguém → anfitrião (rádio, ações do carro)
 *   fx    {…}   ação aplicada, anfitrião → todos (buzina, volante, porta-luvas…)
 *   pg/pp {n}   ping/pong pra medir a latência até o anfitrião (compensa a posição da música)
 */
(function (root) {
  'use strict';

  const APP_ID = 'luiggibeats-resenha-v1';
  const PROTO = 2;
  const MAX_PESSOAS = 8;
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I pra não confundir
  // Quem entra por convite espera um pouco antes de concluir que a sala está vazia e virar anfitrião
  const ESPERA_FUNDADOR_MS = 12000;
  const HEARTBEAT_MS = 8000;
  const SUMIU_MS = 22000;
  // Relays Nostr que aceitaram e devolveram eventos efêmeros num teste de nov/2026 (rota reserva).
  const RELAYS_RESERVA = ['nos.lol', 'relay.nostr.dev.br', 'relay.piazza.today', 'nostr.christiansass.de', 'relay.grigic.org', 'relay.nostrmap.net', 'cdn.satellite.earth'].map((u) => `wss://${u}`);
  // Servidores TURN opcionais (ex.: credenciais grátis da Metered/Cloudflare). Vazio = só STUN + rota reserva.
  const TURN_SERVIDORES = [];

  function gerarCodigo(n = 5) {
    const a = new Uint32Array(n);
    root.crypto.getRandomValues(a);
    return Array.from(a, (x) => ALFABETO[x % ALFABETO.length]).join('');
  }
  const normalizarCodigo = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const limparNome = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Passageiro';
  const disponivel = () => !!(root.Trystero && root.crypto?.subtle && root.WebSocket);

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const paraB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

  // ------------------------------------------------------------------
  // ROTA RESERVA: publica/assina eventos Nostr efêmeros (criptografados) em vários relays
  // ------------------------------------------------------------------
  function criarRelay(sala, onMensagem, onConectados) {
    const T = root.Trystero;
    const sockets = new Map(); // url -> { ws, tentativas, timer }
    const vistos = new Set();
    const fila = [];
    let fechado = false;
    let topico = null;
    let chave = null;
    let kind = null;
    const subId = `lb${Math.random().toString(36).slice(2, 12)}`;

    const pronto = (async () => {
      topico = hex(await root.crypto.subtle.digest('SHA-256', enc.encode(`luiggibeats-resenha-relay|${sala}`))).slice(0, 40);
      const bruta = await root.crypto.subtle.digest('SHA-256', enc.encode(`luiggibeats|${sala}|chave-da-resenha`));
      chave = await root.crypto.subtle.importKey('raw', bruta, 'AES-GCM', false, ['encrypt', 'decrypt']);
      kind = JSON.parse(await T.createEvent(topico, ''))[1].kind;
    })();

    const abertos = () => [...sockets.values()].filter((s) => s.ws && s.ws.readyState === 1);
    const avisar = () => onConectados?.(abertos().length);

    function conectar(url) {
      if (fechado) return;
      const s = sockets.get(url) || { ws: null, tentativas: 0, timer: null };
      sockets.set(url, s);
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (_) {
        return reconectar(url);
      }
      s.ws = ws;
      ws.onopen = () => {
        s.tentativas = 0;
        ws.send(JSON.stringify(['REQ', subId, { kinds: [kind], '#x': [topico], since: Math.floor(Date.now() / 1000) - 10 }]));
        avisar();
        // Manda o que ficou na fila enquanto nenhum relay estava aberto
        while (fila.length && abertos().length) {
          const ev = fila.shift();
          abertos().forEach((o) => o.ws.send(ev));
        }
      };
      ws.onmessage = (e) => {
        let d;
        try {
          d = JSON.parse(e.data);
        } catch (_) {
          return;
        }
        if (d[0] !== 'EVENT' || d[1] !== subId || !d[2] || typeof d[2].content !== 'string') return;
        const id = d[2].id;
        if (vistos.has(id)) return; // o mesmo evento chega por vários relays
        vistos.add(id);
        if (vistos.size > 600) vistos.delete(vistos.values().next().value);
        abrir(d[2].content).then((obj) => obj && onMensagem(obj)).catch(() => { });
      };
      ws.onclose = () => {
        avisar();
        reconectar(url);
      };
      ws.onerror = () => { };
    }
    function reconectar(url) {
      if (fechado) return;
      const s = sockets.get(url);
      s.tentativas++;
      clearTimeout(s.timer);
      s.timer = setTimeout(() => conectar(url), Math.min(60000, 3000 * 2 ** Math.min(s.tentativas, 5)));
    }

    async function fechar_(obj) {
      const iv = root.crypto.getRandomValues(new Uint8Array(12));
      const ct = await root.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, enc.encode(JSON.stringify(obj)));
      return `${paraB64(iv)}.${paraB64(ct)}`;
    }
    async function abrir(txt) {
      const [iv, ct] = txt.split('.');
      if (!iv || !ct) return null;
      const pt = await root.crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, chave, deB64(ct));
      return JSON.parse(dec.decode(pt));
    }

    pronto.then(() => RELAYS_RESERVA.forEach(conectar)).catch(() => { });

    return {
      async enviar(obj) {
        if (fechado) return;
        await pronto;
        const ev = await T.createEvent(topico, await fechar_(obj));
        const lista = abertos();
        if (!lista.length) {
          fila.push(ev);
          if (fila.length > 20) fila.shift();
          return;
        }
        lista.forEach((s) => {
          try {
            s.ws.send(ev);
          } catch (_) { }
        });
      },
      get conectados() {
        return abertos().length;
      },
      fechar() {
        fechado = true;
        sockets.forEach((s) => {
          clearTimeout(s.timer);
          try {
            s.ws?.send(JSON.stringify(['CLOSE', subId]));
            s.ws?.close();
          } catch (_) { }
        });
      }
    };
  }

  /**
   * Entra (ou cria) uma sala.
   * o = { sala, nome, pov, fundador, eventos: { onMembros, onHost, onEstado, onPedido, onFx, onPrecisaEstado, onStatus } }
   */
  function criarSessao(o = {}) {
    if (!disponivel()) throw new Error('Modo online indisponível neste navegador');
    const T = root.Trystero;
    const ev = o.eventos || {};
    const eu = T.selfId;
    const sala = normalizarCodigo(o.sala);
    // cri: criou a sala pelo botão; hd: desde quando sou anfitrião (Date.now) — desempatam conflitos
    const meu = { nome: limparNome(o.nome), pov: o.pov || 'luis', sync: !!o.fundador, cri: !!o.fundador, hd: null };
    const membros = new Map(); // peerId -> { nome, pov, sync, h, cri, hd, v, visto }
    const p2p = new Set(); // com quem a rota direta está aberta
    const rtt = new Map(); // peerId -> ms (média suave)
    const entrouEm = performance.now();
    let hostId = null;
    let fechado = false;
    let avisouP2P = false;
    let ultimoEstRelay = { assinatura: '', t: 0 };

    // Rota direta
    let room = null;
    let canal = null;
    if (root.RTCPeerConnection) {
      try {
        const cfg = { appId: APP_ID, password: `luiggi-${sala}` };
        if (TURN_SERVIDORES.length) cfg.turnConfig = TURN_SERVIDORES;
        room = T.joinRoom(cfg, `resenha-${sala}`, {
          // Falha de conexão direta não é fatal: a rota reserva segue funcionando
          onJoinError: () => {
            if (avisouP2P || fechado) return;
            avisouP2P = true;
            ev.onStatus?.('reserva', 'A rede bloqueou a conexão direta; usando a rota reserva (relay).');
          }
        });
        canal = room.makeAction('rs', { onMessage: (m, ctx) => receber(m, ctx?.peerId, 'p2p') });
      } catch (_) {
        room = null;
      }
    }

    // Rota reserva
    const relay = criarRelay(
      sala,
      (env) => {
        if (!env || env.de === eu || typeof env.de !== 'string') return;
        if (env.para && env.para !== eu) return;
        receber(env.m, env.de, 'relay');
      },
      (n) => {
        ev.onStatus?.('relays', n);
        if (n > 0) enviarOi(); // acabou de abrir um relay: se apresenta pra galera
      }
    );

    /** Manda pela rota direta pra quem dá; pela reserva pro resto. */
    function enviar(m, alvo) {
      if (fechado) return;
      const direto = (id) => !!canal && p2p.has(id);
      if (alvo) {
        if (direto(alvo)) enviarP2P(m, alvo);
        else relay.enviar({ de: eu, para: alvo, m }).catch(() => { });
        return;
      }
      if (canal && p2p.size) enviarP2P(m);
      const faltam = [...membros.keys()].some((id) => !direto(id));
      // "oi" sempre vai pela reserva também, pra quem ainda não conseguiu conexão direta achar a sala
      if (!faltam && m.t !== 'oi' && m.t !== 'tchau') return;
      if (m.t === 'est' && !deveMandarEstPeloRelay(m)) return;
      relay.enviar({ de: eu, para: null, m }).catch(() => { });
    }
    function enviarP2P(m, alvo) {
      try {
        const p = canal.send(m, alvo ? { target: alvo } : undefined);
        if (p && p.catch) p.catch(() => { });
      } catch (_) { }
    }
    /** Pela reserva o estado só vai quando muda algo ou a cada 2 s (a posição da música é estimada no meio). */
    function deveMandarEstPeloRelay(m) {
      const d = m.d || {};
      const assinatura = JSON.stringify([d.r && { ...d.r, p: undefined }, d.c, d.por]);
      const agora = performance.now();
      if (assinatura === ultimoEstRelay.assinatura && agora - ultimoEstRelay.t < 2000) return false;
      ultimoEstRelay = { assinatura, t: agora };
      return true;
    }

    const meuOi = () => ({ t: 'oi', nome: meu.nome, pov: meu.pov, sync: meu.sync, h: hostId, cri: meu.cri, hd: meu.hd, v: PROTO });
    const enviarOi = (alvo) => enviar(meuOi(), alvo);

    function lista() {
      const arr = [{ id: eu, nome: meu.nome, pov: meu.pov, eu: true, host: hostId === eu, via: 'eu' }];
      membros.forEach((m, id) => arr.push({ id, nome: m.nome, pov: m.pov, eu: false, host: hostId === id, versaoDiferente: m.v !== PROTO, via: p2p.has(id) ? 'p2p' : 'relay' }));
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

    function remover(id) {
      const m = membros.get(id);
      if (!m) return;
      membros.delete(id);
      rtt.delete(id);
      eleger();
      ev.onMembros?.(lista(), { tipo: 'saiu', id, nome: m.nome });
    }

    function receber(m, de, via) {
      if (fechado || !de || de === eu || !m || typeof m !== 'object') return;
      const conhecido = membros.get(de);
      if (conhecido) conhecido.visto = performance.now();
      // Pela reserva, ignora quem já fala comigo pela rota direta (a mensagem chega em dobro)
      if (via === 'relay' && p2p.has(de) && m.t !== 'tchau') return;

      if (m.t === 'oi') {
        const novo = !conhecido;
        if (novo && membros.size >= MAX_PESSOAS - 1) return; // carro lotado
        const antes = conhecido ? JSON.stringify([conhecido.nome, conhecido.pov, conhecido.sync, conhecido.h]) : '';
        membros.set(de, {
          nome: limparNome(m.nome),
          pov: typeof m.pov === 'string' ? m.pov : 'luis',
          sync: !!m.sync,
          h: typeof m.h === 'string' ? m.h : null,
          cri: !!m.cri,
          hd: typeof m.hd === 'number' && isFinite(m.hd) ? m.hd : null,
          v: m.v,
          visto: performance.now()
        });
        const mudou = antes !== JSON.stringify([limparNome(m.nome), m.pov, !!m.sync, m.h || null]);
        eleger();
        if (novo) {
          // Alguém novo: me apresento e, se sou o anfitrião, mando o estado
          enviarOi(de);
          if (hostId === eu) setTimeout(() => ev.onPrecisaEstado?.(de), 60);
        }
        if (novo || mudou) ev.onMembros?.(lista(), { tipo: novo ? 'entrou' : 'mudou', id: de });
        return;
      }
      if (m.t === 'tchau') return remover(de);
      if (!conhecido) {
        // Mensagem de alguém que ainda não se apresentou (ex.: o "oi" se perdeu): pede apresentação
        enviarOi(de);
        return;
      }
      if (m.t === 'est') {
        if (de !== hostId) return;
        marcarSincronizado();
        ev.onEstado?.(m.d, de, (rtt.get(de) ?? 150) / 2000);
      } else if (m.t === 'ped') {
        if (hostId === eu) ev.onPedido?.(m.d, de);
      } else if (m.t === 'fx') {
        if (de === hostId) ev.onFx?.(m.d, de);
      } else if (m.t === 'pg') {
        enviar({ t: 'pp', n: m.n }, de);
      } else if (m.t === 'pp') {
        const ms = performance.now() - Number(m.n);
        if (!isFinite(ms) || ms < 0 || ms > 10000) return;
        const ant = rtt.get(de);
        rtt.set(de, ant == null ? ms : ant * 0.7 + ms * 0.3);
      }
    }

    if (room) {
      room.onPeerJoin = (id) => {
        p2p.add(id);
        enviarOi(id);
        // O anfitrião manda o estado logo depois do "oi" (o canal é ordenado, então o oi chega antes)
        if (hostId === eu) setTimeout(() => ev.onPrecisaEstado?.(id), 60);
        if (membros.has(id)) ev.onMembros?.(lista(), { tipo: 'rota', id });
      };
      room.onPeerLeave = (id) => {
        p2p.delete(id);
        const m = membros.get(id);
        // Se a pessoa ainda aparece pela reserva, só perdeu a rota direta
        if (m && performance.now() - m.visto < 3000 + HEARTBEAT_MS) {
          ev.onMembros?.(lista(), { tipo: 'rota', id });
          return;
        }
        remover(id);
      };
    }

    let ultimoHeartbeat = performance.now();
    const relogio = setInterval(() => {
      if (fechado) return;
      const agora = performance.now();
      if (!meu.sync && !hostId && agora - entrouEm > ESPERA_FUNDADOR_MS) marcarSincronizado();
      // Presença pela reserva (descoberta de quem não tem rota direta)
      if (agora - ultimoHeartbeat > HEARTBEAT_MS) {
        ultimoHeartbeat = agora;
        relay.enviar({ de: eu, para: null, m: meuOi() }).catch(() => { });
      }
      // Quem sumiu sem dar tchau
      membros.forEach((m, id) => {
        if (!p2p.has(id) && agora - m.visto > SUMIU_MS) remover(id);
      });
      // Latência até o anfitrião
      if (hostId && hostId !== eu) enviar({ t: 'pg', n: agora }, hostId);
    }, 2000);

    const aoFecharAba = () => sair();
    root.addEventListener('pagehide', aoFecharAba);

    function sair() {
      if (fechado) return;
      enviar({ t: 'tchau' });
      fechado = true;
      clearInterval(relogio);
      root.removeEventListener('pagehide', aoFecharAba);
      // Dá um instante pro "tchau" sair antes de fechar os sockets
      setTimeout(() => {
        relay.fechar();
        try {
          room?.leave();
        } catch (_) { }
      }, 400);
    }

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
      get relaysConectados() {
        return relay.conectados;
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
      sair
    };
  }

  root.LuiggiResenhaOnline = { criarSessao, gerarCodigo, normalizarCodigo, limparNome, disponivel, MAX_PESSOAS, PROTO };
})(window);
