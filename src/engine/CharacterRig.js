/**
 * src/engine/CharacterRig.js
 *
 * Motor de personagens 2D estilo Visual Novel / Dating Simulator (inspirado em /assets/personagens/).
 * - Usa os sprites PNG transparentes de alta definição (`char.spriteCartoon`) gerados a partir das fotos reais
 *   quando disponíveis, com animação de respiração, destaque de fala e balões de expressão.
 * - Para os demais personagens (ou quando solicitado em modo SVG), gera um rig vetorial em camadas
 *   com traço fino anime/cartoon, brilho no cabelo, olhos detalhados e sombreamento cel-shaded.
 *
 * Compatível com Browser (window.LuiggiRig) e Node.js (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LuiggiRig = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STROKE = '#18141C';
  const SW = 2.4;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function darken(hex, amt = 0.18) {
    if (!hex || !hex.startsWith('#')) return '#333333';
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amt)));
    const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amt)));
    const b = Math.max(0, Math.round((num & 255) * (1 - amt)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function lighten(hex, amt = 0.2) {
    if (!hex || !hex.startsWith('#')) return '#ffffff';
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amt));
    const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amt));
    const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * amt));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // ==================== PET: O GATO DA LUIZA ====================
  function renderCatSVG(char, opts = {}) {
    const f = char.fichaVisual || {};
    const p1 = f.pelagemPrimaria || '#1F2026';
    const p2 = f.pelagemSecundaria || '#F4F4F6';
    const eyeCol = f.olhosCor || '#FACC15';
    const expr = opts.expressao || 'neutro';
    const scale = opts.scale || 'full';
    const vb = scale === 'portrait' ? '25 15 170 160' : '0 0 220 260';

    let pupilScale = expr === 'chocado' ? 1.45 : expr === 'bravo' ? 0.55 : 0.9;
    if (opts.blink) pupilScale = 0.05;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="luiggi-rig-svg" data-char="${esc(char.id)}">
      <g class="rig-root">
        <path d="M148 205 Q186 190 182 145 Q180 130 168 138" fill="none" stroke="${p1}" stroke-width="14" stroke-linecap="round"/>
        <g class="rig-torso">
          <ellipse cx="110" cy="186" rx="46" ry="50" fill="${p1}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="110" cy="196" rx="26" ry="34" fill="${p2}"/>
          <path d="M74 176 Q110 184 146 176" fill="none" stroke="${f.coleira || '#EF4444'}" stroke-width="7" stroke-linecap="round"/>
          <circle cx="110" cy="186" r="5" fill="#FACC15" stroke="${STROKE}" stroke-width="1.8"/>
          <ellipse cx="86" cy="230" rx="12" ry="8" fill="${p2}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="134" cy="230" rx="12" ry="8" fill="${p2}" stroke="${STROKE}" stroke-width="${SW}"/>
        </g>
        <g class="rig-head">
          <polygon points="62,92 54,42 94,72" fill="${p1}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
          <polygon points="158,92 166,42 126,72" fill="${p1}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
          <polygon points="66,85 62,55 86,74" fill="#F48FB1"/>
          <polygon points="154,85 158,55 134,74" fill="#F48FB1"/>
          <ellipse cx="110" cy="112" rx="52" ry="44" fill="${p1}" stroke="${STROKE}" stroke-width="${SW}"/>
          <path d="M84 120 Q110 105 136 120 Q142 152 110 155 Q78 152 84 120 Z" fill="${p2}"/>
          <g class="rig-eyes">
            ${
              opts.blink
                ? `<line x1="78" y1="108" x2="98" y2="108" stroke="${STROKE}" stroke-width="3.2" stroke-linecap="round"/>
                   <line x1="122" y1="108" x2="142" y2="108" stroke="${STROKE}" stroke-width="3.2" stroke-linecap="round"/>`
                : `<circle cx="88" cy="108" r="13.5" fill="${eyeCol}" stroke="${STROKE}" stroke-width="2.2"/>
                   <circle cx="132" cy="108" r="13.5" fill="${eyeCol}" stroke="${STROKE}" stroke-width="2.2"/>
                   <ellipse cx="88" cy="108" rx="${4.8 * pupilScale}" ry="${9.5 * pupilScale}" fill="#111"/>
                   <ellipse cx="132" cy="108" rx="${4.8 * pupilScale}" ry="${9.5 * pupilScale}" fill="#111"/>
                   <circle cx="84" cy="103" r="3.2" fill="#fff"/>
                   <circle cx="128" cy="103" r="3.2" fill="#fff"/>`
            }
          </g>
          <polygon points="105,123 115,123 110,129" fill="${f.narizCor || '#F48FB1'}" stroke="${STROKE}" stroke-width="1.5"/>
          <path d="M110 129 L110 135 M102 135 Q110 140 118 135" fill="none" stroke="${STROKE}" stroke-width="2" stroke-linecap="round"/>
          <line x1="56" y1="122" x2="82" y2="125" stroke="${p2}" stroke-width="2"/>
          <line x1="56" y1="131" x2="82" y2="131" stroke="${p2}" stroke-width="2"/>
          <line x1="164" y1="122" x2="138" y2="125" stroke="${p2}" stroke-width="2"/>
          <line x1="164" y1="131" x2="138" y2="131" stroke="${p2}" stroke-width="2"/>
        </g>
      </g>
    </svg>`;
  }

  // ==================== VEÍCULOS ====================
  function renderVehicleSVG(vehicle) {
    const f = vehicle.fichaVisual || {};
    if (vehicle.id === 'subaru_legacy') {
      const blue = f.corCarroceria || '#1245A8';
      const blueHi = f.corReflexo || '#4D88F0';
      const gold = f.corRodas || '#C5A059';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150" class="luiggi-rig-svg" data-vehicle="subaru_legacy">
        <ellipse cx="160" cy="134" rx="135" ry="11" fill="rgba(0,0,0,0.28)"/>
        <path d="M26 78 L40 66 L54 66 L48 78 Z" fill="${darken(blue, 0.2)}" stroke="${STROKE}" stroke-width="2.5"/>
        <path d="M22 104 L26 82 L68 76 L104 44 L198 44 L236 74 L292 84 Q300 94 296 108 L266 112 L254 112 Q232 112 222 112 L94 112 Q74 112 64 112 L22 108 Z"
          fill="${blue}" stroke="${STROKE}" stroke-width="2.8" stroke-linejoin="round"/>
        <path d="M74 78 L196 76 L282 86" fill="none" stroke="${blueHi}" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
        <line x1="136" y1="43" x2="178" y2="43" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
        <polygon points="108,49 148,49 148,74 78,74" fill="#93C5FD" stroke="${STROKE}" stroke-width="2.2"/>
        <polygon points="154,49 194,49 224,74 154,74" fill="#93C5FD" stroke="${STROKE}" stroke-width="2.2"/>
        <line x1="115" y1="53" x2="132" y2="70" stroke="#ffffff" stroke-width="3" opacity="0.48"/>
        <path d="M226 75 L254 71 L258 78 L228 79 Z" fill="${darken(blue, 0.25)}" stroke="${STROKE}" stroke-width="2"/>
        <rect x="92" y="106" width="128" height="7" rx="2" fill="${f.corSaias || '#6B7280'}" stroke="${STROKE}" stroke-width="2"/>
        <rect x="282" y="86" width="14" height="10" rx="2" fill="#FEF08A" stroke="${STROKE}" stroke-width="2"/>
        <rect x="22" y="84" width="10" height="10" rx="2" fill="#EF4444" stroke="${STROKE}" stroke-width="2"/>
        <rect x="291" y="96" width="6" height="6" fill="#DC2626"/>
        ${[74, 240]
          .map(
            (cx) => `
          <g transform="translate(${cx}, 112)">
            <circle r="21" fill="#18181B" stroke="${STROKE}" stroke-width="2.6"/>
            <circle r="14" fill="#D1D5DB" stroke="${STROKE}" stroke-width="1.6"/>
            <circle r="11.5" fill="${gold}" stroke="${darken(gold, 0.25)}" stroke-width="1.4"/>
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#785A28" stroke-width="1.6"/>
            <line x1="0" y1="-10" x2="0" y2="10" stroke="#785A28" stroke-width="1.6"/>
            <line x1="-7" y1="-7" x2="7" y2="7" stroke="#785A28" stroke-width="1.4"/>
            <line x1="-7" y1="7" x2="7" y2="-7" stroke="#785A28" stroke-width="1.4"/>
            <circle r="3" fill="#18181B"/>
          </g>`
          )
          .join('')}
      </svg>`;
    }

    const bodyCol = f.corCarroceria || '#ECEEF2';
    const neon = f.corNeon || '#EC4899';
    const wheelCol = f.corRodas || '#CBD5E1';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150" class="luiggi-rig-svg" data-vehicle="civic_emily">
      <ellipse cx="160" cy="135" rx="132" ry="12" fill="${neon}" opacity="0.38"/>
      <ellipse cx="160" cy="134" rx="126" ry="8" fill="rgba(0,0,0,0.32)"/>
      <path d="M22 76 L34 62 L52 62 L46 76 Z" fill="${bodyCol}" stroke="${STROKE}" stroke-width="2.4"/>
      <path d="M24 106 L30 80 L74 74 L112 46 L196 46 L242 74 L296 86 Q304 98 296 110 L24 110 Z"
        fill="${bodyCol}" stroke="${STROKE}" stroke-width="2.8" stroke-linejoin="round"/>
      <line x1="138" y1="45" x2="180" y2="45" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>
      <polygon points="116,52 154,52 154,74 86,74" fill="#60A5FA" stroke="${STROKE}" stroke-width="2.2"/>
      <polygon points="160,52 194,52 228,74 160,74" fill="#60A5FA" stroke="${STROKE}" stroke-width="2.2"/>
      <rect x="280" y="88" width="15" height="9" rx="2" fill="#F8FAFC" stroke="${STROKE}" stroke-width="2"/>
      <rect x="276" y="103" width="22" height="5" rx="2" fill="#18181B" stroke="${STROKE}" stroke-width="1.6"/>
      <circle cx="20" cy="103" r="5" fill="#FBBF24" opacity="0.85"/>
      ${[76, 240]
        .map(
          (cx) => `
        <g transform="translate(${cx}, 112)">
          <circle r="20" fill="#09090B" stroke="${STROKE}" stroke-width="2.6"/>
          <circle r="13" fill="${wheelCol}" stroke="#475569" stroke-width="1.8"/>
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#64748B" stroke-width="2"/>
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#64748B" stroke-width="2"/>
          <circle r="4" fill="#334155"/>
        </g>`
        )
        .join('')}
    </svg>`;
  }

  // ==================== CABELO TRÁS & FRENTE (ANIME / CEL-SHADED) ====================
  function renderHairBack(char) {
    const c = char.fichaVisual?.cabelo || {};
    const col = c.cor;
    if (!col || c.estilo === 'careca') return '';
    const dark = darken(col, 0.25);
    const estilo = c.estilo || 'curto_classico';

    if (estilo.startsWith('longo') || estilo === 'gotico_hime_franja' || estilo === 'repicado_cortina') {
      return `
        <path d="M56 76 Q42 142 46 218 Q110 232 174 218 Q178 142 164 76 Q110 20 56 76 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
        <path d="M64 118 Q58 168 62 212 M156 118 Q162 168 158 212" fill="none" stroke="${dark}" stroke-width="2.2" opacity="0.65"/>
      `;
    }
    if (estilo === 'wolf_cut_mecha' || estilo === 'wolf_cut_castanho' || estilo === 'medio_repicado_franja') {
      return `
        <path d="M55 72 Q38 124 44 162 L65 148 L66 170 L154 170 L155 148 L176 162 Q182 124 165 72 Q110 22 55 72 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    }
    if (estilo === 'medio_dividido_meio' || estilo === 'medio_microfranja') {
      return `
        <path d="M55 74 Q46 128 52 158 Q110 166 168 158 Q174 128 165 74 Q110 22 55 74 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    }
    if (estilo === 'cacheado_ruivo') {
      return `
        <path d="M48 84 Q30 112 45 144 Q38 166 60 172 L160 172 Q182 166 175 144 Q190 112 172 84 Q142 28 110 30 Q78 28 48 84 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
      `;
    }
    if (estilo === 'chanel_gotico') {
      return `
        <path d="M54 78 Q46 126 58 148 L162 148 Q174 126 166 78 Q110 28 54 78 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
      `;
    }
    if (estilo === 'preso_tras') {
      return `
        <ellipse cx="110" cy="70" rx="52" ry="44" fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
        <path d="M142 64 Q184 84 174 150 Q158 142 148 110 Z" fill="${dark}" stroke="${STROKE}" stroke-width="${SW}"/>
      `;
    }
    return `<ellipse cx="110" cy="72" rx="51" ry="43" fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>`;
  }

  function renderHairFront(char) {
    const c = char.fichaVisual?.cabelo || {};
    const col = c.cor;
    if (!col || c.estilo === 'careca') return '';
    const mecha = c.corMecha;
    const hi = lighten(col, 0.25);
    const estilo = c.estilo || 'curto_classico';

    let out = '';
    if (estilo === 'wolf_cut_castanho' || estilo === 'medio_repicado_franja' || estilo === 'repicado_cortina' || estilo === 'longo_ondulado_franja') {
      out = `
        <path d="M56 84 Q56 26 110 24 Q164 26 164 84 Q152 52 126 68 Q114 44 110 42 Q106 44 94 68 Q68 52 56 84 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    } else if (estilo === 'longo_mecha_roxa') {
      out = `
        <path d="M56 84 Q56 26 110 24 Q164 26 164 84 Q146 44 110 44 Q74 44 56 84 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
        <path d="M68 44 Q60 100 65 144 L78 144 Q78 88 86 46 Z" fill="${mecha || '#9333EA'}" stroke="${STROKE}" stroke-width="2"/>
        <path d="M148 46 Q156 100 151 144 L138 144 Q140 88 132 48 Z" fill="${mecha || '#9333EA'}" stroke="${STROKE}" stroke-width="2"/>
      `;
    } else if (estilo === 'longo_liso_franja' || estilo === 'chanel_gotico') {
      out = `
        <path d="M58 80 Q58 26 110 24 Q162 26 162 80 L148 70 L132 75 L118 68 L104 75 L88 68 L72 74 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    } else if (estilo === 'longo_liso_meio' || estilo === 'longo_liso' || estilo === 'longo_ondulado' || estilo === 'longo_liso_lateral') {
      out = `
        <path d="M56 90 Q56 26 110 26 Q94 46 66 94 Z" fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
        <path d="M164 90 Q164 26 110 26 Q126 46 154 94 Z" fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    } else if (estilo === 'cacheado_ruivo') {
      out = `
        <path d="M54 84 Q56 28 110 26 Q164 28 166 84 Q142 52 114 56 Q88 50 54 84 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
      `;
    } else if (estilo === 'preso_tras') {
      out = `
        <path d="M58 82 Q60 28 110 28 Q160 28 162 82 Q144 44 110 44 Q76 44 58 82 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}"/>
      `;
    } else {
      out = `
        <path d="M58 78 Q58 28 110 26 Q162 28 162 78 Q144 46 120 58 Q96 44 74 62 Z"
          fill="${col}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
      `;
    }

    // Brilho anime no cabelo (como nos sprites de /assets/personagens/)
    return `${out}
      <path d="M74 44 Q92 36 105 41 M116 41 Q128 36 146 44" fill="none" stroke="${hi}" stroke-width="2.6" opacity="0.55" stroke-linecap="round"/>
    `;
  }

  // ==================== ROUPAS & CORPO (Busto / Meio-Corpo Anime) ====================
  function renderOutfit(char) {
    const f = char.fichaVisual || {};
    const pal = f.roupa?.paletaCores || ['#334155', '#1E293B'];
    const topCol = pal[0] || '#27272A';
    const topDark = darken(topCol, 0.22);
    const botCol = pal[1] || '#18181B';
    const corpo = f.corpo?.tipoCorpo || 'medio';
    const isTank = /regata|tomara|alcinha|top/i.test(f.roupa?.pecaSuperior || '');
    const isSkirt = /saia|vestido|short/i.test(f.roupa?.pecaInferior || '');
    const isJacket = /jaqueta|cardigã|moletom/i.test(f.roupa?.pecaSuperior || '');

    const w = corpo === 'robusto_forte' ? 42 : corpo === 'cheinho_fofo' ? 36 : corpo === 'esguio' || corpo === 'magro' ? 28 : 32;
    const x1 = 110 - w;
    const x2 = 110 + w;
    const skin = f.tomPele || '#ECC3AB';
    const skinSh = f.sombreamentoPele || darken(skin, 0.14);

    let torsoSvg = '';
    if (isTank) {
      torsoSvg = `
        <path d="M${x1} 142 Q110 132 ${x2} 142 L${x2 - 2} 214 L${x1 + 2} 214 Z" fill="${skin}" stroke="${STROKE}" stroke-width="${SW}"/>
        <path d="M${x1 + 7} 152 Q110 166 ${x2 - 7} 152 L${x2 - 3} 214 L${x1 + 3} 214 Z" fill="${topCol}" stroke="${STROKE}" stroke-width="${SW}"/>
        <path d="M98 141 Q110 146 122 141" fill="none" stroke="${skinSh}" stroke-width="1.8"/>
      `;
      if (!/tomara/i.test(f.roupa?.pecaSuperior || '')) {
        torsoSvg += `
          <rect x="${x1 + 7}" y="138" width="7" height="16" fill="${topCol}" stroke="${STROKE}" stroke-width="2"/>
          <rect x="${x2 - 14}" y="138" width="7" height="16" fill="${topCol}" stroke="${STROKE}" stroke-width="2"/>
        `;
      }
    } else {
      torsoSvg = `
        <path d="M${x1} 142 Q110 132 ${x2} 142 L${x2 - 2} 214 L${x1 + 2} 214 Z" fill="${topCol}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
        <path d="M95 138 Q110 148 125 138" fill="${skin}" stroke="${STROKE}" stroke-width="2"/>
        <path d="M${x1 + 6} 168 L${x1 + 14} 195 M${x2 - 6} 168 L${x2 - 14} 195" stroke="${topDark}" stroke-width="2" opacity="0.6" stroke-linecap="round"/>
      `;
    }

    if (f.roupa?.estampa === 'emilydoces') {
      torsoSvg += `<text x="110" y="182" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="8.5" fill="#F9FAFB">emilydoces</text>`;
    } else if (char.id === 'marilis_docinho') {
      torsoSvg += `<path d="M100 148 L120 148 L110 158 Z" fill="none" stroke="#374151" stroke-width="1.8"/>`;
    } else if (isJacket) {
      torsoSvg += `<line x1="110" y1="146" x2="110" y2="213" stroke="${topDark}" stroke-width="2.4"/>`;
    }

    let legsSvg = '';
    if (isSkirt) {
      legsSvg = `
        <path d="M${x1 + 3} 210 L${x2 - 3} 210 L${x2 + 6} 244 L${x1 - 6} 244 Z" fill="${botCol}" stroke="${STROKE}" stroke-width="${SW}"/>
        <g class="rig-leg-l">
          <rect x="86" y="242" width="14" height="36" rx="6" fill="${skin}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="91" cy="280" rx="12" ry="6" fill="#18181B" stroke="${STROKE}" stroke-width="${SW}"/>
        </g>
        <g class="rig-leg-r">
          <rect x="120" y="242" width="14" height="36" rx="6" fill="${skin}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="129" cy="280" rx="12" ry="6" fill="#18181B" stroke="${STROKE}" stroke-width="${SW}"/>
        </g>
      `;
    } else {
      legsSvg = `
        <g class="rig-leg-l">
          <rect x="84" y="210" width="19" height="66" rx="7" fill="${botCol}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="92" cy="280" rx="13" ry="6.5" fill="#18181B" stroke="${STROKE}" stroke-width="${SW}"/>
        </g>
        <g class="rig-leg-r">
          <rect x="117" y="210" width="19" height="66" rx="7" fill="${botCol}" stroke="${STROKE}" stroke-width="${SW}"/>
          <ellipse cx="128" cy="280" rx="13" ry="6.5" fill="#18181B" stroke="${STROKE}" stroke-width="${SW}"/>
        </g>
      `;
    }

    const sleeveCol = isTank ? skin : topCol;
    const armW = corpo === 'robusto_forte' ? 16 : 12;
    const armLen = isTank ? 56 : 44;
    const tattooArms =
      char.id === 'erion'
        ? `<path d="M${x1 - 10} 150 L${x1 - 10} 198 M${x2 + 10} 150 L${x2 + 10} 198" stroke="#2D4F48" stroke-width="8" opacity="0.7" stroke-linecap="round"/>`
        : '';

    const armsSvg = `
      <g class="rig-arm-l">
        <rect x="${x1 - armW + 2}" y="143" width="${armW}" height="${armLen}" rx="6" fill="${sleeveCol}" stroke="${STROKE}" stroke-width="${SW}"/>
        <circle cx="${x1 - armW / 2 + 2}" cy="${143 + armLen + 5}" r="6" fill="${skin}" stroke="${STROKE}" stroke-width="${SW}"/>
      </g>
      <g class="rig-arm-r">
        <rect x="${x2 - 2}" y="143" width="${armW}" height="${armLen}" rx="6" fill="${sleeveCol}" stroke="${STROKE}" stroke-width="${SW}"/>
        <circle cx="${x2 + armW / 2 - 2}" cy="${143 + armLen + 5}" r="6" fill="${skin}" stroke="${STROKE}" stroke-width="${SW}"/>
      </g>
      ${tattooArms}
    `;

    return { legsSvg, torsoSvg, armsSvg };
  }

  // ==================== ROSTO ANIME/CARTOON ====================
  function renderEyes(char, expr, blink) {
    const r = char.fichaVisual?.rosto || {};
    const eyeCol = r.olhos?.cor || '#33241D';
    const eyeHi = lighten(eyeCol, 0.35);
    const liner = r.olhos?.delineado;

    if (blink) {
      return `
        <path d="M78 84 Q90 90 101 84" fill="none" stroke="${STROKE}" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M119 84 Q130 90 142 84" fill="none" stroke="${STROKE}" stroke-width="2.8" stroke-linecap="round"/>
      `;
    }
    if (expr === 'feliz') {
      return `
        <path d="M79 85 Q90 73 101 85" fill="none" stroke="${STROKE}" stroke-width="3" stroke-linecap="round"/>
        <path d="M119 85 Q130 73 141 85" fill="none" stroke="${STROKE}" stroke-width="3" stroke-linecap="round"/>
      `;
    }

    const rEye = expr === 'chocado' ? 11 : 9.2;
    const pupilR = expr === 'chocado' ? 4 : 5.8;

    return `
      <path d="M77 83 Q90 72 102 83 Q90 93 77 83 Z" fill="#FFFFFF" stroke="${STROKE}" stroke-width="1.8"/>
      <path d="M118 83 Q130 72 143 83 Q130 93 118 83 Z" fill="#FFFFFF" stroke="${STROKE}" stroke-width="1.8"/>
      <circle cx="90" cy="83" r="${pupilR}" fill="${eyeCol}"/>
      <circle cx="130" cy="83" r="${pupilR}" fill="${eyeCol}"/>
      <circle cx="90" cy="84" r="${pupilR * 0.55}" fill="#111"/>
      <circle cx="130" cy="84" r="${pupilR * 0.55}" fill="#111"/>
      <path d="M86 86 Q90 89 94 86" fill="none" stroke="${eyeHi}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M126 86 Q130 89 134 86" fill="none" stroke="${eyeHi}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="87" cy="80" r="2.2" fill="#FFF"/>
      <circle cx="127" cy="80" r="2.2" fill="#FFF"/>
      ${
        liner
          ? `<path d="M75 79 Q90 71 103 80 L105 78 M145 79 Q130 71 117 80 L115 78" fill="none" stroke="#111" stroke-width="2.8" stroke-linecap="round"/>`
          : `<path d="M77 79 Q90 73 102 80 M118 80 Q130 73 143 79" fill="none" stroke="${STROKE}" stroke-width="2.4" stroke-linecap="round"/>`
      }
      ${rEye > 10 ? '<circle cx="90" cy="83" r="0.1"/>' : ''}
    `;
  }

  function renderEyebrows(char, expr) {
    const sb = char.fichaVisual?.rosto?.sobrancelhas || {};
    const col = sb.cor || '#222';
    const w = sb.espessura === 'grossa' ? 3.8 : sb.espessura === 'fina' ? 2.0 : 2.8;

    if (expr === 'bravo') {
      return `
        <line x1="78" y1="68" x2="100" y2="74" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
        <line x1="142" y1="68" x2="120" y2="74" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
      `;
    }
    if (expr === 'envergonhado' || expr === 'chocado') {
      return `
        <path d="M78 70 Q90 62 100 68" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
        <path d="M120 68 Q130 62 142 70" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
      `;
    }
    return `
      <path d="M77 70 Q89 65 101 70" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
      <path d="M119 70 Q131 65 143 70" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
    `;
  }

  function renderMouth(char, expr, talkPhase) {
    const maq = char.fichaVisual?.detalhes?.maquiagem || '';
    const lipMatch = maq.match(/#[0-9A-Fa-f]{6}/);
    const lipCol = lipMatch ? lipMatch[0] : '#C95E60';

    if (talkPhase && talkPhase > 0) {
      const openH = talkPhase === 2 ? 7.5 : 4.2;
      return `<ellipse cx="110" cy="110" rx="8" ry="${openH}" fill="#7F1D1D" stroke="${STROKE}" stroke-width="2"/>`;
    }
    if (expr === 'feliz') {
      return `<path d="M98 106 Q110 119 122 106 Z" fill="#FFFFFF" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>`;
    }
    if (expr === 'bravo') {
      return `<path d="M100 112 Q110 106 120 112" fill="none" stroke="${STROKE}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    if (expr === 'chocado') {
      return `<ellipse cx="110" cy="110" rx="6.5" ry="8" fill="#7F1D1D" stroke="${STROKE}" stroke-width="2.2"/>`;
    }
    if (expr === 'envergonhado') {
      return `<path d="M102 109 Q106 107 110 109 Q114 111 118 109" fill="none" stroke="${STROKE}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    if (lipMatch) {
      return `<path d="M99 109 Q110 114 121 109 Q110 105 99 109 Z" fill="${lipCol}" stroke="${STROKE}" stroke-width="1.8"/>`;
    }
    return `<path d="M101 109 Q110 114 119 109" fill="none" stroke="${STROKE}" stroke-width="2.2" stroke-linecap="round"/>`;
  }

  function renderAccessories(char) {
    const d = char.fichaVisual?.detalhes || {};
    const acc = char.fichaVisual?.roupa?.acessorios || [];
    const accText = acc.join(' ').toLowerCase();
    let svg = '';

    if (d.oculos) {
      const oc = d.oculos;
      const arm = oc.corArmacao || '#222';
      const tint = oc.lenteTinta ? `fill="${oc.lenteTinta}" fill-opacity="0.32"` : 'fill="rgba(255,255,255,0.12)"';
      if (oc.tipo === 'redondo_fino' || oc.tipo === 'redondo_oval_fino') {
        svg += `
          <circle cx="90" cy="83" r="13.5" ${tint} stroke="${arm}" stroke-width="2.2"/>
          <circle cx="130" cy="83" r="13.5" ${tint} stroke="${arm}" stroke-width="2.2"/>
          <line x1="103.5" y1="83" x2="116.5" y2="83" stroke="${arm}" stroke-width="2.2"/>
        `;
      } else if (oc.tipo === 'na_cabeca_fino') {
        svg += `
          <rect x="74" y="40" width="28" height="12" rx="4" fill="rgba(255,255,255,0.18)" stroke="${arm}" stroke-width="2.2"/>
          <rect x="118" y="40" width="28" height="12" rx="4" fill="rgba(255,255,255,0.18)" stroke="${arm}" stroke-width="2.2"/>
          <line x1="102" y1="46" x2="118" y2="46" stroke="${arm}" stroke-width="2.2"/>
        `;
      } else {
        svg += `
          <rect x="74" y="75" width="31" height="15" rx="3" ${tint} stroke="${arm}" stroke-width="2.3"/>
          <rect x="115" y="75" width="31" height="15" rx="3" ${tint} stroke="${arm}" stroke-width="2.3"/>
          <line x1="105" y1="82" x2="115" y2="82" stroke="${arm}" stroke-width="2.3"/>
        `;
      }
    }

    const pText = (d.piercings || []).join(' ').toLowerCase();
    if (pText.includes('septo')) svg += `<path d="M107 98 Q110 103 113 98" fill="none" stroke="#E5E7EB" stroke-width="2"/>`;
    if (pText.includes('argola')) {
      svg += `<circle cx="62" cy="96" r="5" fill="none" stroke="#E5E7EB" stroke-width="1.8"/>
              <circle cx="158" cy="96" r="5" fill="none" stroke="#E5E7EB" stroke-width="1.8"/>`;
    }

    if (accText.includes('choker')) {
      svg += `<rect x="97" y="128" width="26" height="5" rx="2" fill="#18181B" stroke="${STROKE}" stroke-width="1.5"/>`;
      if (accText.includes('cruz')) svg += `<path d="M110 133 L110 144 M106 137 L114 137" stroke="#E5E7EB" stroke-width="2"/>`;
    } else if (accText.includes('corrente') || accText.includes('colar') || accText.includes('pérolas')) {
      svg += `<path d="M97 134 Q110 152 123 134" fill="none" stroke="#D1D5DB" stroke-width="2.4"/>`;
    }

    if (accText.includes('orelhinhas')) {
      svg += `
        <path d="M74 44 Q64 12 86 24 Q92 34 88 42 Z" fill="#FFFFFF" stroke="${STROKE}" stroke-width="2.2"/>
        <path d="M76 40 Q72 20 84 26 Z" fill="#F9A8D4"/>
        <path d="M146 44 Q156 12 134 24 Q128 34 132 42 Z" fill="#FFFFFF" stroke="${STROKE}" stroke-width="2.2"/>
        <path d="M144 40 Q148 20 136 26 Z" fill="#F9A8D4"/>
      `;
    }
    return svg;
  }

  function renderFacialHair(char) {
    const b = (char.fichaVisual?.detalhes?.barbaBigode || '').toLowerCase();
    if (!b || b === 'nenhuma') return '';
    if (b.includes('barba cheia')) {
      return `
        <path d="M68 94 Q70 132 110 134 Q150 132 152 94 L144 94 Q142 117 110 119 Q78 117 76 94 Z"
          fill="#1B1817" stroke="${STROKE}" stroke-width="1.8"/>
        <path d="M95 103 Q110 98 125 103 Q120 108 110 107 Q100 108 95 103 Z" fill="#1B1817"/>
      `;
    }
    if (b.includes('bigode')) {
      return `
        <path d="M97 102 Q110 98 123 102" fill="none" stroke="#2C221E" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M105 119 Q110 124 115 119" fill="none" stroke="#2C221E" stroke-width="2.8" stroke-linecap="round"/>
      `;
    }
    if (b.includes('cavanhaque') || b.includes('por fazer')) {
      return `<path d="M103 118 Q110 124 117 118" fill="none" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return '';
  }

  // ==================== RENDERIZADOR SVG ANIME-CARTOON ====================
  function renderCharacterSVG(char, opts = {}) {
    if (!char) return '';
    if (char.isPet) return renderCatSVG(char, opts);
    if (char.id === 'subaru_legacy' || char.id === 'civic_emily') return renderVehicleSVG(char);

    const f = char.fichaVisual || {};
    const skin = f.tomPele || '#ECC3AB';
    const skinShadow = f.sombreamentoPele || darken(skin, 0.14);
    const expr = opts.expressao || 'neutro';
    const scale = opts.scale || 'full';
    const talkPhase = opts.talkPhase || 0;
    const blink = !!opts.blink;
    const modoCabecao = !!opts.modoCabecao && char.temFoto && char.fotos?.length > 0;
    const vb = scale === 'portrait' ? '26 14 168 178' : '0 0 220 296';

    const { legsSvg, torsoSvg, armsSvg } = renderOutfit(char);
    const clipId = `cabecao_${char.id}_${Math.random().toString(36).slice(2, 7)}`;

    const headInner = modoCabecao
      ? `
        <defs><clipPath id="${clipId}"><ellipse cx="110" cy="83" rx="44" ry="48"/></clipPath></defs>
        <image href="${esc(char.fotos[0])}" x="56" y="26" width="108" height="114" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clipId})"/>
        <ellipse cx="110" cy="83" rx="44" ry="48" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>
      `
      : `
        <circle cx="66" cy="86" r="7.5" fill="${skinShadow}" stroke="${STROKE}" stroke-width="${SW}"/>
        <circle cx="154" cy="86" r="7.5" fill="${skinShadow}" stroke="${STROKE}" stroke-width="${SW}"/>
        <!-- Rosto anime/webtoon afinado no queixo -->
        <path d="M68 72 Q68 34 110 34 Q152 34 152 72 Q151 104 136 120 Q120 132 110 132 Q100 132 84 120 Q69 104 68 72 Z"
          fill="${skin}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
        <path d="M107 88 L111 96 L106 97" fill="none" stroke="${skinShadow}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="82" cy="96" rx="10" ry="4.5" fill="#F43F5E" opacity="${expr === 'envergonhado' ? '0.45' : '0.22'}"/>
        <ellipse cx="138" cy="96" rx="10" ry="4.5" fill="#F43F5E" opacity="${expr === 'envergonhado' ? '0.45' : '0.22'}"/>
        ${renderFacialHair(char)}
        <g class="rig-eyes">${renderEyes(char, expr, blink)}</g>
        <g class="rig-brows">${renderEyebrows(char, expr)}</g>
        <g class="rig-mouth">${renderMouth(char, expr, talkPhase)}</g>
      `;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="luiggi-rig-svg" data-char="${esc(char.id)}">
      <g class="rig-root">
        ${scale === 'full' ? '<ellipse cx="110" cy="285" rx="44" ry="8" fill="rgba(0,0,0,0.22)"/>' : ''}
        <g class="rig-hair-back">${modoCabecao ? '' : renderHairBack(char)}</g>
        <g class="rig-legs">${scale === 'full' ? legsSvg : ''}</g>
        <path d="M98 124 L122 124 L124 144 Q110 150 96 144 Z" fill="${skinShadow}" stroke="${STROKE}" stroke-width="${SW}"/>
        <g class="rig-torso">${torsoSvg}</g>
        <g class="rig-arms">${armsSvg}</g>
        <g class="rig-head">${headInner}</g>
        <g class="rig-hair-front">${modoCabecao ? '' : renderHairFront(char)}</g>
        <g class="rig-accessories">${modoCabecao ? '' : renderAccessories(char)}</g>
      </g>
    </svg>`;
  }

  // ==================== VISUAL NOVEL SPRITE (USA PNG CARTOON QUANDO EXISTE!) ====================
  function getCartoonSpriteUrl(char, expressao = 'neutro') {
    if (!char) return null;
    if (expressao === 'feliz' && char.spriteCartoonFeliz) return char.spriteCartoonFeliz;
    return char.spriteCartoon || null;
  }

  function renderVisualNovelSprite(char, opts = {}) {
    if (!char) return '';
    const expr = opts.expressao || 'neutro';
    const pngUrl = !opts.modoCabecao && !opts.forceSvg ? getCartoonSpriteUrl(char, expr) : null;

    if (pngUrl) {
      const emote =
        expr === 'feliz'
          ? '✨'
          : expr === 'bravo'
          ? '💢'
          : expr === 'envergonhado'
          ? '😳'
          : expr === 'chocado'
          ? '❗'
          : '';
      return `
        <div class="vn-sprite-wrap ${opts.speaking ? 'speaking' : ''} ${opts.dim ? 'dim' : ''}" data-expr="${esc(expr)}">
          ${emote ? `<span class="vn-emote">${emote}</span>` : ''}
          <img src="${encodeURI(pngUrl)}" alt="${esc(char.nome)}" class="vn-sprite-img" />
        </div>
      `;
    }

    return `
      <div class="vn-sprite-wrap ${opts.speaking ? 'speaking' : ''} ${opts.dim ? 'dim' : ''}" data-expr="${esc(expr)}">
        ${renderCharacterSVG(char, {
          expressao: expr,
          scale: opts.scale || 'portrait',
          modoCabecao: opts.modoCabecao
        })}
      </div>
    `;
  }

  // ==================== ANIMADOR AO VIVO ====================
  class RigAnimator {
    constructor(containerEl, char, initialOpts = {}) {
      this.container = containerEl;
      this.char = char;
      this.opts = {
        expressao: 'neutro',
        animacao: 'idle',
        scale: 'full',
        modoCabecao: false,
        forceSvg: false,
        ...initialOpts
      };
      this.talkPhase = 0;
      this.talkTimer = 0;
      this.blink = false;
      this.nextBlinkAt = performance.now() + 2000 + Math.random() * 2200;
      this.rafId = null;
      this.startTime = performance.now();
      this.render();
      this.start();
    }

    setOptions(patch) {
      Object.assign(this.opts, patch);
      this.render();
    }

    pulseTalk() {
      this.talkTimer = 180;
    }

    render() {
      const pngUrl = !this.opts.modoCabecao && !this.opts.forceSvg ? getCartoonSpriteUrl(this.char, this.opts.expressao) : null;
      if (pngUrl) {
        this.container.innerHTML = renderVisualNovelSprite(this.char, {
          expressao: this.opts.expressao,
          speaking: this.opts.animacao === 'talk' || this.talkTimer > 0,
          modoCabecao: this.opts.modoCabecao
        });
        this.svg = null;
        return;
      }

      this.container.innerHTML = renderCharacterSVG(this.char, {
        ...this.opts,
        talkPhase: this.talkPhase,
        blink: this.blink
      });
      this.svg = this.container.querySelector('svg');
    }

    start() {
      if (this.rafId) return;
      const tick = (now) => {
        this.rafId = requestAnimationFrame(tick);
        if (!this.container.isConnected) return;

        // Se for PNG animado, aplica respiração e bounce de fala suavemente no wrapper
        const wrap = this.container.querySelector('.vn-sprite-wrap');
        if (wrap && !this.svg) {
          const t = (now - this.startTime) / 1000;
          let dy = Math.sin(t * 2.2) * 2.5;
          let dx = 0;
          if (this.opts.animacao === 'talk' || this.talkTimer > 0) {
            if (this.talkTimer > 0) this.talkTimer -= 16;
            dy = -Math.abs(Math.sin(t * 14)) * 5;
          } else if (this.opts.animacao === 'walk') {
            dy = -Math.abs(Math.sin(t * 8)) * 6;
          } else if (this.opts.animacao === 'susto') {
            dy = -Math.abs(Math.sin(t * 9)) * 18;
          } else if (this.opts.animacao === 'raiva') {
            dx = Math.sin(t * 48) * 3.5;
          }
          wrap.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
          return;
        }

        if (!this.svg) return;
        if (now >= this.nextBlinkAt && this.opts.expressao !== 'feliz') {
          if (!this.blink) {
            this.blink = true;
            this.render();
            this.nextBlinkAt = now + 130;
          } else {
            this.blink = false;
            this.render();
            this.nextBlinkAt = now + 2200 + Math.random() * 2800;
          }
        }

        if (this.opts.animacao === 'talk' || this.talkTimer > 0) {
          if (this.talkTimer > 0) this.talkTimer -= 16;
          const phase = Math.floor((now / 120) % 3);
          if (phase !== this.talkPhase) {
            this.talkPhase = phase;
            this.render();
          }
        } else if (this.talkPhase !== 0) {
          this.talkPhase = 0;
          this.render();
        }
      };
      this.rafId = requestAnimationFrame(tick);
    }

    destroy() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  return {
    renderCharacterSVG,
    renderVehicleSVG,
    renderCatSVG,
    renderVisualNovelSprite,
    getCartoonSpriteUrl,
    RigAnimator
  };
});
