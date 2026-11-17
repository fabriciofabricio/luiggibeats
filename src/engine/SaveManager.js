/**
 * src/engine/SaveManager.js
 * Salvamento automático completo em localStorage.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'luiggibeats_save_v1';

  function criarEstadoPadrao() {
    return {
      capituloAtual: 0,
      capituloMaxDesbloqueado: 0,
      capitulosConcluidos: [],
      jogoZerado: false,
      finalEscolhido: null, // 'loop' | 'proximo_capitulo' | 'ainda_nao_sei'
      escolhasVistas: {}, // { choiceId: [0,1,2] }
      conquistas: [], // [id]
      contadores: {
        felpsOmeter: 0,
        voceSabeOQueFaz: 0,
        redFlags: 0,
        fabricioOlhouPraTras: 0,
        vezesTico: 0,
        ruivasEncontradas: 0,
        cookiesAssados: 0,
        cumprimentosIgnorados: 0,
        concordancias: 0,
        tentativasCofre: 0,
        contraDestino: 0,
        avisosMutado: 0,
        buzinasBacacheri: 0,
        empurroesDominik: 0,
        capivarasDesviadas: 0,
        radaresPegos: 0,
        nitrosUsados: 0
      },
      cookiesEscondidos: [],
      gatosVistos: [],
      fabricioCap1Visto: false,
      tutuluizaCap1Vista: false,
      julieConversas: 0,
      celularEloizaPedidos: 0,
      radarFotos: [], // [{ titulo, velocidade, dataUrl }]
      legendasFotos: {},
      beatsAutorais: [],
      receitasDesbloqueadas: ['classico'],
      recordesMinigames: {},
      heroRecordes: {},
      lojinhaComprados: ['traje_moletom'],
      trajeAtual: 'traje_moletom',
      subaruMods: {
        cor: '#1245A8',
        adesivo: null,
        neon: false,
        motorBoost: 0,
        gripBoost: 0
      },
      cookiesInfinitos: {
        total: 0,
        upgrades: {}
      },
      config: {
        volMusica: 0.7,
        volSfx: 0.85,
        volVozes: 0.75,
        velocidadeTexto: 24, // ms por letra
        timerEscolhas: true,
        latenciaHeroMs: 0,
        modoCabecao: false
      }
    };
  }

  let state = carregar();

  function mesclar(base, salvo) {
    const out = structuredClone(base);
    if (!salvo || typeof salvo !== 'object') return out;
    for (const k of Object.keys(base)) {
      if (salvo[k] === undefined) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        out[k] = { ...base[k], ...salvo[k] };
      } else {
        out[k] = salvo[k];
      }
    }
    return out;
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return mesclar(criarEstadoPadrao(), JSON.parse(raw));
    } catch (_) {}
    return criarEstadoPadrao();
  }

  function salvar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function resetarJogo(manterConquistas = false) {
    const prevConq = manterConquistas ? [...state.conquistas] : [];
    const prevConfig = { ...state.config };
    state = criarEstadoPadrao();
    state.conquistas = prevConq;
    state.config = prevConfig;
    salvar();
    return state;
  }

  function incrementarContador(nome, delta = 1) {
    state.contadores[nome] = (state.contadores[nome] || 0) + delta;
    salvar();
    if (root.LuiggiAchievements) {
      root.LuiggiAchievements.verificarContadores(state);
    }
    if (root.LuiggiUI && root.LuiggiUI.atualizarHUD) {
      root.LuiggiUI.atualizarHUD();
    }
    return state.contadores[nome];
  }

  function registrarEscolha(choiceId, optIndex) {
    if (!state.escolhasVistas[choiceId]) state.escolhasVistas[choiceId] = [];
    if (!state.escolhasVistas[choiceId].includes(optIndex)) {
      state.escolhasVistas[choiceId].push(optIndex);
    }
    salvar();
  }

  function concluirCapitulo(capId) {
    if (!state.capitulosConcluidos.includes(capId)) {
      state.capitulosConcluidos.push(capId);
    }
    if (capId + 1 > state.capituloMaxDesbloqueado && capId < 15) {
      state.capituloMaxDesbloqueado = capId + 1;
    }
    if (capId === 15) state.jogoZerado = true;
    salvar();
  }

  function salvarRecordeMinigame(id, pontos) {
    const prev = state.recordesMinigames[id] || 0;
    if (pontos > prev) state.recordesMinigames[id] = pontos;
    salvar();
  }

  function temSaveAtivo() {
    return state.capitulosConcluidos.length > 0 || state.capituloMaxDesbloqueado > 0 || Object.keys(state.escolhasVistas).length > 0;
  }

  root.LuiggiSave = {
    get state() {
      return state;
    },
    salvar,
    resetarJogo,
    incrementarContador,
    registrarEscolha,
    concluirCapitulo,
    salvarRecordeMinigame,
    temSaveAtivo
  };
})(window);
