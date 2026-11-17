/**
 * src/minigames/QuickMinigames.js
 * Despachante dos minigames rápidos. Cada minigame 3D se registra com `registrar(id, fn)`
 * (arquivos em src/minigames/quick/). Sem WebGL, cai automaticamente na versão 2D clássica.
 */
(function (root) {
  'use strict';

  const registro = {};
  let webgl = null;

  function webglDisponivel() {
    if (webgl !== null) return webgl;
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (_e) {
      webgl = false;
    }
    return webgl;
  }

  function registrar(id, fn) {
    registro[id] = fn;
  }

  function meta(id) {
    return root.LuiggiData?.cache?.minigames?.minigames?.[id] || { id, titulo: id };
  }

  function abrir(id) {
    const fn = registro[id];
    if (fn && root.Luiggi3D?.hasThree() && webglDisponivel()) {
      try {
        return fn(id, meta(id));
      } catch (e) {
        console.error('[Minigame 3D] falhou, usando versão clássica:', id, e);
        const host = document.getElementById('minigame-overlay');
        host.classList.add('hidden');
        host.innerHTML = '';
      }
    }
    if (root.LuiggiQuickMinigamesClassic) return root.LuiggiQuickMinigamesClassic.abrir(id);
    return Promise.resolve({ pontos: 100 });
  }

  root.LuiggiQuickMinigames = { abrir, registrar, meta, ids: () => Object.keys(registro) };
})(window);
