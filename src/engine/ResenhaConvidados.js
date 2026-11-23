/**
 * src/engine/ResenhaConvidados.js
 * Convidados do banco de trás no Momento Resenha (modo 3D e modo clássico).
 *
 * O banco de trás tem três lugares: o Mateus Buse fica atrás do passageiro e os outros dois
 * (atrás do motorista e no meio) podem receber qualquer personagem do jogo (Sol, Emily, Eloiza...).
 * Sozinho, a escolha fica salva neste navegador. Online, quem manda é o anfitrião da sala:
 * todo mundo pede pra ele e ele espalha a lista no estado do carro (est.c.conv).
 */
(function (root) {
  'use strict';

  const SLOTS = ['tras_esq', 'tras_meio'];
  const NOMES_SLOT = { tras_esq: 'Atrás do motorista', tras_meio: 'No meio, atrás' };
  const FIXOS = ['luis', 'fabricio', 'mateus_buse'];
  const CHAVE = 'luiggi_resenha_convidados';
  const FRASES = ['Aumenta essa!', 'Que cheiro de baunilha é esse?', 'Quem escolheu essa música?', '*dança no banco de trás*', 'Bora ficar mais um pouco no Safepoint?', 'Me passa um Tic Tac aí.'];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const mapa = () => root.LuiggiData?.cache?.personagemMap || new Map();

  /** Personagens que podem ir pro banco de trás (todo mundo menos o trio fixo e o gato). */
  function disponiveis() {
    return [...mapa().values()].filter((p) => p && !p.isPet && !FIXOS.includes(p.id) && p.fichaVisual).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const valido = (pid) => typeof pid === 'string' && disponiveis().some((p) => p.id === pid);
  /** Normaliza { tras_esq, tras_meio } (o que vem da rede ou do navegador). */
  function limpar(conv) {
    const out = {};
    SLOTS.forEach((s) => (out[s] = conv && valido(conv[s]) ? conv[s] : null));
    return out;
  }
  function ler() {
    try {
      return limpar(JSON.parse(localStorage.getItem(CHAVE) || '{}'));
    } catch (_) {
      return limpar({});
    }
  }
  function gravar(conv) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(limpar(conv)));
    } catch (_) { }
  }
  const nome = (pid) => mapa().get(pid)?.nome || pid;
  /** Algo que o convidado fala quando alguém clica nele (a frase marcante da ficha, ou uma genérica). */
  function frase(pid) {
    const p = mapa().get(pid);
    const opcoes = [p?.fraseMarcante, ...FRASES].filter(Boolean);
    return opcoes[Math.floor(Math.random() * Math.min(opcoes.length, p?.fraseMarcante ? 3 : opcoes.length))];
  }
  /** Texto pra avisar o que mudou entre duas listas (ou null). */
  function descreverMudanca(antes, depois, quem) {
    const partes = [];
    SLOTS.forEach((s) => {
      if ((antes?.[s] || null) === (depois?.[s] || null)) return;
      if (depois[s]) partes.push(`${nome(depois[s])} sentou no banco de trás`);
      else if (antes?.[s]) partes.push(`${nome(antes[s])} saiu do banco de trás`);
    });
    if (!partes.length) return null;
    return `${quem ? `${quem}: ` : ''}${partes.join(' e ')}.`;
  }

  /**
   * Painel pra escolher quem senta atrás.
   * o = { host, obter: () => conv, definir: (slot, pid|null) => void, ocupado: (slot) => nome|null }
   */
  function criarPainel(o = {}) {
    const el = document.createElement('div');
    el.className = 'rs-online rs-conv hidden';
    const lista = disponiveis();
    el.innerHTML = `
      <div class="rs-on-head"><strong>➕ Banco de trás</strong><button class="mini-btn" data-conv-fechar title="Fechar">✕</button></div>
      <small class="rs-on-dica">O Mateus Buse fica atrás do passageiro. Escolha quem senta nos outros dois lugares. Online, todo mundo na sala vê os mesmos convidados.</small>
      ${SLOTS.map(
        (s) => `<label class="rs-on-campo">${NOMES_SLOT[s]}
          <span class="rs-conv-linha">
            <select data-conv-slot="${s}"><option value="">— lugar vazio —</option>${lista.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}${p.apelido && p.apelido !== p.nome ? ` (${esc(p.apelido)})` : ''}</option>`).join('')}</select>
            <button class="mini-btn" data-conv-sortear="${s}" title="Sortear alguém">🎲</button>
          </span>
          <small class="rs-conv-aviso" data-conv-aviso="${s}"></small>
        </label>`
      ).join('')}
      <button class="mg-btn" data-conv-esvaziar>🚪 Esvaziar o banco de trás</button>`;
    (o.host || document.body).appendChild(el);
    ['keydown', 'pointerdown', 'wheel'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));

    el.querySelectorAll('[data-conv-slot]').forEach((sel) => sel.addEventListener('change', () => o.definir?.(sel.dataset.convSlot, sel.value || null)));
    el.querySelectorAll('[data-conv-sortear]').forEach((b) =>
      b.addEventListener('click', () => {
        const atual = o.obter?.() || {};
        const usados = new Set(Object.values(atual).filter(Boolean));
        const livres = lista.filter((p) => !usados.has(p.id));
        if (livres.length) o.definir?.(b.dataset.convSortear, livres[Math.floor(Math.random() * livres.length)].id);
      })
    );
    el.querySelector('[data-conv-esvaziar]').addEventListener('click', () => SLOTS.forEach((s) => o.definir?.(s, null)));
    el.querySelector('[data-conv-fechar]').addEventListener('click', () => fechar());

    function atualizar() {
      const conv = o.obter?.() || {};
      el.querySelectorAll('[data-conv-slot]').forEach((sel) => {
        const s = sel.dataset.convSlot;
        if (document.activeElement !== sel) sel.value = conv[s] || '';
        const aviso = el.querySelector(`[data-conv-aviso="${s}"]`);
        const quem = o.ocupado?.(s);
        aviso.textContent = quem && conv[s] ? `${quem} está sentado aí agora; o convidado aparece quando o lugar vagar.` : '';
      });
    }
    function abrir() {
      el.classList.remove('hidden');
      atualizar();
    }
    function fechar() {
      el.classList.add('hidden');
    }
    return {
      el,
      abrir,
      fechar,
      atualizar,
      alternar() {
        if (el.classList.contains('hidden')) abrir();
        else fechar();
        return !el.classList.contains('hidden');
      },
      get aberto() {
        return !el.classList.contains('hidden');
      }
    };
  }

  root.LuiggiResenhaConvidados = { SLOTS, NOMES_SLOT, disponiveis, valido, limpar, ler, gravar, nome, frase, descreverMudanca, criarPainel };
})(window);
