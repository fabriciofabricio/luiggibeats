/**
 * src/engine/AchievementManager.js
 * Gerenciador de conquistas estilo Xbox/Steam com pop-up animado e som.
 */
(function (root) {
  'use strict';

  const fila = [];
  let exibindo = false;

  function desbloquear(id) {
    const save = root.LuiggiSave;
    const data = root.LuiggiData?.cache?.conquistas?.conquistas || [];
    if (!save || save.state.conquistas.includes(id)) return false;

    const info = data.find((c) => c.id === id);
    if (!info) return false;

    save.state.conquistas.push(id);
    save.salvar();

    fila.push(info);
    if (!exibindo) processarFila();
    return true;
  }

  function processarFila() {
    if (!fila.length) {
      exibindo = false;
      return;
    }
    exibindo = true;
    const item = fila.shift();

    if (root.LuiggiAudio) root.LuiggiAudio.playSFX('conquista');

    const host = document.getElementById('achievement-toast-host');
    if (host) {
      const toast = document.createElement('div');
      toast.className = 'ach-toast';
      toast.innerHTML = `
        <div class="ach-icon">${item.icone || '🏆'}</div>
        <div class="ach-body">
          <div class="ach-kicker">CONQUISTA DESBLOQUEADA!</div>
          <div class="ach-name">${item.nome}</div>
          <div class="ach-desc">${item.descricao}</div>
        </div>
      `;
      host.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      const closeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      };
      toast.style.pointerEvents = 'auto';
      toast.style.cursor = 'pointer';
      toast.title = 'Clique para fechar';
      toast.addEventListener('click', closeToast);
      setTimeout(closeToast, 8000);
    }

    setTimeout(processarFila, 2200);
  }

  function verificarContadores(state) {
    const ct = state.contadores || {};
    if (ct.felpsOmeter >= 10) desbloquear('felps_10');
    if (ct.felpsOmeter >= 50) desbloquear('felps_50');
    if (ct.felpsOmeter >= 100) desbloquear('felps_100');
    if (ct.voceSabeOQueFaz >= 1) desbloquear('voce_sabe_o_que_faz');
    if (ct.voceSabeOQueFaz >= 20) desbloquear('ela_disse_de_novo');
    if (ct.fabricioOlhouPraTras >= 10) desbloquear('ele_olhou_de_novo');
    if (ct.redFlags >= 50) desbloquear('colecionador_bandeiras');
    if (ct.concordancias >= 10) desbloquear('e_verdade');
    if (ct.avisosMutado >= 5) desbloquear('voce_ta_mutado');
    if (ct.contraDestino >= 10) desbloquear('contra_o_destino');
    if (ct.capivarasDesviadas >= 10) desbloquear('amigo_capivaras');
    if (ct.radaresPegos >= 5) desbloquear('sorria_multado');
    if (ct.nitrosUsados >= 10) desbloquear('boxer_rumble');
    if (state.cookiesEscondidos.length >= 48) desbloquear('confeiteiro');
    if (state.gatosVistos.length >= 9) desbloquear('onde_esta_o_gato');
  }

  function verificarEscolhas(choiceId, capId) {
    const save = root.LuiggiSave;
    const escolhas = root.LuiggiData?.cache?.escolhas?.escolhas || {};
    if (!save) return;

    const vistas = save.state.escolhasVistas[choiceId] || [];
    if (vistas.length >= 3) desbloquear('multiverso');

    const doCap = Object.values(escolhas).filter((e) => e.capitulo === capId && !e.semTimer);
    if (doCap.length > 0 && doCap.every((e) => (save.state.escolhasVistas[e.id] || []).length >= 3)) {
      desbloquear('viajante_dimensional');
    }

    const todas = Object.values(escolhas).filter((e) => !e.semTimer);
    if (todas.length > 0 && todas.every((e) => (save.state.escolhasVistas[e.id] || []).length >= 3)) {
      desbloquear('doutor_estranho');
    }
  }

  root.LuiggiAchievements = {
    desbloquear,
    verificarContadores,
    verificarEscolhas
  };
})(window);
