/**
 * src/engine/DataLoader.js
 * Carrega os arquivos JSON de /data/ e /assets/manifest.json.
 * Usa fetch() em servidores HTTP e cai automaticamente para window.__LUIGGI_GAME_BUNDLE__ em file://.
 */
(function (root) {
  'use strict';

  const CACHE = {};

  async function carregarTudo() {
    if (CACHE._loaded) return CACHE;
    const bundle = root.__LUIGGI_GAME_BUNDLE__ || {};
    const mapa = {
      personagens: 'data/personagens.json',
      musicas: 'data/musicas.json',
      conquistas: 'data/conquistas.json',
      receitas: 'data/receitas.json',
      namedrops: 'data/namedrops.json',
      mapa_curitiba: 'data/mapa_curitiba.json',
      museu: 'data/museu.json',
      minigames: 'data/minigames.json',
      escolhas: 'data/escolhas.json',
      dialogos: 'data/dialogos.json',
      manifest: 'assets/manifest.json'
    };

    const isFile = typeof location !== 'undefined' && location.protocol === 'file:';
    await Promise.all(
      Object.entries(mapa).map(async ([k, url]) => {
        if (!isFile) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
              CACHE[k] = await res.json();
              return;
            }
          } catch (_) {}
        }
        CACHE[k] = bundle[k] || {};
      })
    );

    // Indexadores rápidos
    CACHE.personagemMap = new Map(
      (CACHE.personagens?.personagens || []).map((p) => [p.id, p])
    );
    CACHE.veiculoMap = new Map(
      (CACHE.personagens?.veiculos || []).map((v) => [v.id, v])
    );
    CACHE._loaded = true;
    return CACHE;
  }

  async function carregarChartOpcional(musicaId) {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return null;
    try {
      const res = await fetch(`data/charts/${musicaId}.json`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  }

  root.LuiggiData = {
    carregarTudo,
    carregarChartOpcional,
    get cache() {
      return CACHE;
    }
  };
})(window);
