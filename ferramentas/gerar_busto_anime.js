/**
 * ferramentas/gerar_busto_anime.js
 * Gera ilustrações vetoriais de meio corpo em estilo webtoon (896x1200, mesmo enquadramento
 * dos sprites cartoon.png) para personagens sem arte pintada: Emily Doces e Eloiza.
 *
 * Uso: node ferramentas/gerar_busto_anime.js
 * Saída: assets/sprites/<id>/busto.svg  (convertido para cartoon.png pelo navegador)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LINHA = '#2a1a1c';

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((1 << 24) + (c((n >> 16) & 255) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1)}`;
}

function olho(cx, cy, lado, cor, o) {
  const w = 34;
  const id = `iris${lado < 0 ? 'E' : 'D'}`;
  const feliz = o.sorriso === 'aberto';
  const top = cy - (feliz ? 13 : 16);
  const bot = cy + (feliz ? 7 : 10);
  const inner = cx - lado * w;
  const outer = cx + lado * w;
  const forma = `M ${inner} ${cy + 2} Q ${cx - lado * 10} ${top - 2} ${outer} ${cy - 5} Q ${cx + lado * 8} ${bot + 3} ${inner} ${cy + 2} Z`;
  const asa = o.delineadoGatinho ? `<path d="M ${outer - lado * 4} ${cy - 6} L ${outer + lado * 22} ${cy - 18} L ${outer + lado * 2} ${cy + 1} Z" fill="${LINHA}"/>` : '';
  return `
  <defs>
    <radialGradient id="${id}" cx="50%" cy="70%" r="65%">
      <stop offset="0%" stop-color="${shade(cor, 60)}"/>
      <stop offset="60%" stop-color="${cor}"/>
      <stop offset="100%" stop-color="${shade(cor, -50)}"/>
    </radialGradient>
    <clipPath id="clip${id}"><path d="${forma}"/></clipPath>
  </defs>
  <path d="${forma}" fill="#f7f1ee"/>
  <g clip-path="url(#clip${id})">
    <circle cx="${cx + lado * 2}" cy="${cy}" r="14" fill="url(#${id})"/>
    <circle cx="${cx + lado * 2}" cy="${cy}" r="14" fill="none" stroke="${shade(cor, -70)}" stroke-width="2"/>
    <circle cx="${cx + lado * 2}" cy="${cy + 1}" r="6.5" fill="${shade(cor, -95)}"/>
    <path d="M ${inner - 10} ${top - 10} L ${outer + 10} ${top - 10} L ${outer + 10} ${cy - 4} Q ${cx} ${cy - 10} ${inner - 10} ${cy - 2} Z" fill="#3a2a2a" opacity="0.22"/>
    <circle cx="${cx - 3}" cy="${cy - 5}" r="3.6" fill="#fff"/>
    <circle cx="${cx + 6}" cy="${cy + 6}" r="1.8" fill="#fff" opacity="0.8"/>
  </g>
  <path d="M ${inner - lado * 2} ${cy + 1} Q ${cx - lado * 10} ${top - 4} ${outer + lado * 3} ${cy - 6}" fill="none" stroke="${LINHA}" stroke-width="${o.delineado ? 6 : 4.5}" stroke-linecap="round"/>
  ${asa}
  <path d="M ${inner + lado * 6} ${cy + 4} Q ${cx + lado * 6} ${bot + 4} ${outer - lado * 2} ${cy - 1}" fill="none" stroke="#7a5550" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
  <path d="M ${inner} ${top - 6} Q ${cx - lado * 6} ${top - 14} ${outer} ${cy - 12}" fill="none" stroke="#b78f86" stroke-width="1.6" opacity="0.6"/>
  `;
}

function rosto(f) {
  const pele = f.pele;
  const sombra = shade(pele, -30);
  const batom = f.batom || '#cf8a86';
  const boca =
    f.sorriso === 'aberto'
      ? `<path d="M 420 388 Q 448 412 476 388 Q 448 394 420 388 Z" fill="#7d2a33" stroke="${LINHA}" stroke-width="2.5" stroke-linejoin="round"/>
         <path d="M 424 389 Q 448 395 472 389 L 469 395 Q 448 399 427 395 Z" fill="#fff"/>
         <path d="M 414 384 Q 418 388 422 386" fill="none" stroke="${LINHA}" stroke-width="2.5" stroke-linecap="round"/>
         <path d="M 474 386 Q 478 388 482 384" fill="none" stroke="${LINHA}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<path d="M 428 390 Q 448 383 468 390 Q 448 405 428 390 Z" fill="${batom}" stroke="${shade(batom, -50)}" stroke-width="1.6"/>
         <path d="M 428 390 Q 448 395 468 390" fill="none" stroke="${shade(batom, -80)}" stroke-width="2.2"/>
         <ellipse cx="454" cy="397" rx="6" ry="2" fill="#fff" opacity="0.6"/>`;
  const argolas = f.argola
    ? `<circle cx="324" cy="330" r="9" fill="none" stroke="#d6d9de" stroke-width="3.5"/><circle cx="572" cy="330" r="9" fill="none" stroke="#d6d9de" stroke-width="3.5"/>`
    : '';
  return `
  <defs>
    <linearGradient id="peleG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(pele, 10)}"/>
      <stop offset="100%" stop-color="${shade(pele, -4)}"/>
    </linearGradient>
  </defs>
  <path d="M 336 262 Q 314 258 318 292 Q 322 322 342 322 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3.5"/>
  <path d="M 560 262 Q 582 258 578 292 Q 574 322 554 322 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3.5"/>
  ${argolas}
  <path d="M 338 214 C 334 300 352 372 400 420 Q 430 450 448 454 Q 466 450 496 420 C 544 372 562 300 558 214 C 552 120 344 120 338 214 Z" fill="url(#peleG)" stroke="${LINHA}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M 344 300 Q 356 380 404 424 Q 430 446 448 450 Q 410 420 384 380 Q 360 340 344 300 Z" fill="${sombra}" opacity="0.28"/>
  <path d="M 340 220 Q 448 250 556 220 L 556 236 Q 448 268 340 236 Z" fill="${sombra}" opacity="0.35"/>
  <ellipse cx="380" cy="334" rx="26" ry="9" fill="#ef7f8c" opacity="${f.blush || 0.25}"/>
  <ellipse cx="516" cy="334" rx="26" ry="9" fill="#ef7f8c" opacity="${f.blush || 0.25}"/>
  <path d="M 358 250 Q 384 238 418 247" fill="none" stroke="${f.sobrancelha}" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 478 247 Q 512 238 538 250" fill="none" stroke="${f.sobrancelha}" stroke-width="5.5" stroke-linecap="round"/>
  ${olho(392, 282, -1, f.olhos, f)}
  ${olho(504, 282, 1, f.olhos, f)}
  <path d="M 452 298 Q 460 336 446 346 Q 440 348 436 344" fill="none" stroke="${sombra}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 436 344 Q 448 351 458 345" fill="none" stroke="${shade(sombra, -20)}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>
  ${boca}
  `;
}

function pescocoETronco(f) {
  const pele = f.pele;
  const sombra = shade(pele, -32);
  const roupa = f.roupa;
  const roupaS = shade(roupa, -16);
  const roupaH = shade(roupa, 30);
  let tronco = '';
  if (f.tomaraQueCaia) {
    tronco = `
    <path d="M 120 1200 L 128 760 Q 140 640 250 600 Q 360 568 404 520 L 492 520 Q 536 568 646 600 Q 756 640 768 760 L 776 1200 Z" fill="${pele}" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 312 600 Q 360 590 400 612" fill="none" stroke="${sombra}" stroke-width="3.5" opacity="0.7"/>
    <path d="M 584 600 Q 536 590 496 612" fill="none" stroke="${sombra}" stroke-width="3.5" opacity="0.7"/>
    <path d="M 200 760 Q 210 960 196 1200" fill="none" stroke="${sombra}" stroke-width="4" opacity="0.6"/>
    <path d="M 696 760 Q 686 960 700 1200" fill="none" stroke="${sombra}" stroke-width="4" opacity="0.6"/>
    <path d="M 232 1200 L 236 806 Q 448 752 660 806 L 664 1200 Z" fill="${roupa}" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 236 806 Q 448 752 660 806 L 660 826 Q 448 776 236 826 Z" fill="${roupaH}" opacity="0.5"/>
    ${[300, 390, 500, 590].map((x) => `<path d="M ${x} 850 Q ${x + 12} 1020 ${x - 4} 1196" fill="none" stroke="${roupaS}" stroke-width="4" opacity="0.8"/>`).join('')}
    <path d="M 410 690 Q 448 720 486 690" fill="none" stroke="${sombra}" stroke-width="3" opacity="0.5"/>
    `;
  } else {
    const estampa = f.estampa
      ? `<text x="448" y="790" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="54" fill="#f2f2f2">${f.estampa}</text>`
      : '';
    tronco = `
    <path d="M 86 1200 L 100 790 Q 112 650 250 606 L 388 540 Q 448 584 508 540 L 646 606 Q 784 650 796 790 L 810 1200 Z" fill="${roupa}" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 388 540 Q 448 600 508 540 Q 448 572 388 540 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3"/>
    <path d="M 388 540 Q 448 600 508 540" fill="none" stroke="${roupaH}" stroke-width="8" opacity="0.5"/>
    <path d="M 234 700 Q 250 900 236 1190" fill="none" stroke="${roupaS}" stroke-width="6" opacity="0.9"/>
    <path d="M 662 700 Q 646 900 660 1190" fill="none" stroke="${roupaS}" stroke-width="6" opacity="0.9"/>
    <path d="M 300 620 Q 448 670 596 620" fill="none" stroke="${roupaH}" stroke-width="4" opacity="0.35"/>
    <path d="M 340 980 Q 448 1010 556 980" fill="none" stroke="${roupaS}" stroke-width="5" opacity="0.6"/>
    ${estampa}
    `;
  }
  const colar = f.colar
    ? `<path d="M 404 548 Q 448 640 492 548" fill="none" stroke="#d9dde3" stroke-width="2.5"/>
       <path d="M 448 600 q -8 12 0 21 q 8 -9 0 -21 Z" fill="#e9eef5" stroke="#9aa3ad" stroke-width="1.8"/>`
    : '';
  const choker = f.choker ? `<path d="M 404 478 Q 448 494 492 478 L 492 494 Q 448 510 404 494 Z" fill="#101013" stroke="${LINHA}" stroke-width="2.5"/>` : '';
  return `
  <path d="M 404 410 L 400 540 Q 448 580 496 540 L 492 410 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3.5"/>
  <path d="M 404 430 Q 448 482 492 430 L 492 470 Q 448 510 404 470 Z" fill="${sombra}" opacity="0.5"/>
  ${tronco}
  ${choker}
  ${colar}
  `;
}

function cabeloTras(f) {
  const c = f.cabelo;
  const s = shade(c, -18);
  const grad = `<defs><linearGradient id="cabG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${shade(c, 22)}"/><stop offset="100%" stop-color="${c}"/></linearGradient></defs>`;
  if (f.estilo === 'longo_franja') {
    const fios = [[296, 460], [318, 480], [580, 470], [600, 450], [610, 600], [286, 610]]
      .map(([x, y]) => `<path d="M ${x} ${y} Q ${x + (x < 448 ? -10 : 10)} ${y + 240} ${x + (x < 448 ? -4 : 4)} ${y + 470}" fill="none" stroke="${s}" stroke-width="4" opacity="0.85"/>`)
      .join('');
    return `${grad}<path d="M 314 214 Q 300 70 448 56 Q 596 70 582 214 L 624 620 Q 650 820 616 980 Q 566 1010 524 940 L 506 600 L 390 600 L 372 940 Q 330 1010 280 980 Q 246 820 272 620 Z" fill="url(#cabG)" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>${fios}`;
  }
  return `${grad}<path d="M 310 220 Q 280 64 448 50 Q 616 64 586 220 Q 640 330 628 450 Q 660 540 610 588 Q 566 610 540 556 L 356 556 Q 330 610 286 588 Q 236 540 268 450 Q 256 330 310 220 Z" fill="url(#cabG)" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 290 380 Q 266 470 300 572" fill="none" stroke="${s}" stroke-width="4.5"/>
    <path d="M 606 380 Q 630 470 596 572" fill="none" stroke="${s}" stroke-width="4.5"/>
    <path d="M 274 470 Q 250 520 270 560" fill="none" stroke="${s}" stroke-width="3.5"/>
    <path d="M 622 470 Q 646 520 626 560" fill="none" stroke="${s}" stroke-width="3.5"/>`;
}

function cabeloFrente(f) {
  const c = f.cabelo;
  const s = shade(c, -24);
  const brilho = shade(c, 80);
  if (f.estilo === 'longo_franja') {
    const fios = [356, 388, 420, 452, 484, 516, 544].map((x) => `<path d="M ${x} 170 L ${x + 4} 260" stroke="${s}" stroke-width="3" opacity="0.8"/>`).join('');
    return `
    <path d="M 330 230 Q 312 82 448 70 Q 584 82 566 230 L 568 262 L 328 262 Z" fill="url(#cabG)" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
    ${fios}
    <path d="M 330 230 Q 318 330 326 430 Q 330 500 312 560 Q 352 510 354 430 Q 358 330 352 262 Z" fill="${c}" stroke="${LINHA}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 566 230 Q 578 330 570 430 Q 566 500 584 560 Q 544 510 542 430 Q 538 330 544 262 Z" fill="${c}" stroke="${LINHA}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 366 120 Q 448 92 530 120" fill="none" stroke="${brilho}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
    <path d="M 380 140 Q 448 120 516 140" fill="none" stroke="${brilho}" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
    `;
  }
  const fios = [[386, 110, 376, 214], [448, 90, 452, 202], [510, 110, 522, 214], [416, 100, 410, 180], [482, 100, 490, 180]]
    .map(([a, b, cc, d]) => `<path d="M ${a} ${b} Q ${(a + cc) / 2 + 8} ${(b + d) / 2} ${cc} ${d}" fill="none" stroke="${s}" stroke-width="3.2" opacity="0.85"/>`)
    .join('');
  return `
  <path d="M 326 246 Q 312 82 448 64 Q 584 82 570 246 Q 552 208 534 226 Q 518 182 494 218 Q 478 170 450 208 Q 420 168 402 218 Q 380 180 362 228 Q 344 206 326 246 Z" fill="url(#cabG)" stroke="${LINHA}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 326 246 Q 310 320 330 396 Q 342 446 322 496 Q 364 448 360 380 Q 356 304 364 252 Z" fill="${c}" stroke="${LINHA}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M 570 246 Q 586 320 566 396 Q 554 446 574 496 Q 532 448 536 380 Q 540 304 532 252 Z" fill="${c}" stroke="${LINHA}" stroke-width="3.5" stroke-linejoin="round"/>
  ${fios}
  <path d="M 368 118 Q 448 90 528 118" fill="none" stroke="${brilho}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
  `;
}

function bracos(f) {
  const pele = f.pele;
  const sombra = shade(pele, -30);
  if (f.tomaraQueCaia) return '';
  return `
  <path d="M 110 880 Q 100 1040 98 1200 L 186 1200 Q 184 1040 190 880 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3.5"/>
  <path d="M 786 880 Q 796 1040 798 1200 L 710 1200 Q 712 1040 706 880 Z" fill="${pele}" stroke="${LINHA}" stroke-width="3.5"/>
  <path d="M 120 900 Q 126 1040 122 1190" fill="none" stroke="${sombra}" stroke-width="5" opacity="0.5"/>
  <path d="M 776 900 Q 770 1040 774 1190" fill="none" stroke="${sombra}" stroke-width="5" opacity="0.5"/>
  <path d="M 96 900 Q 148 878 204 900 L 214 820 Q 150 800 90 830 Z" fill="${f.roupa}" stroke="${LINHA}" stroke-width="4"/>
  <path d="M 800 900 Q 748 878 692 900 L 682 820 Q 746 800 806 830 Z" fill="${f.roupa}" stroke="${LINHA}" stroke-width="4"/>
  `;
}

function busto(f) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 896 1200" width="896" height="1200">
  ${cabeloTras(f)}
  ${pescocoETronco(f)}
  ${bracos(f)}
  ${rosto(f)}
  ${cabeloFrente(f)}
</svg>`;
}

const PERSONAGENS = {
  emily: {
    pele: '#efc8b4',
    cabelo: '#2b2220',
    estilo: 'medio_franja',
    olhos: '#5e6b64',
    sobrancelha: '#2b2220',
    sorriso: 'aberto',
    roupa: '#19191c',
    estampa: 'emilydoces',
    colar: true,
    argola: true,
    blush: 0.3
  },
  eloiza: {
    pele: '#f3d2c1',
    cabelo: '#1d1513',
    estilo: 'longo_franja',
    olhos: '#3a2621',
    sobrancelha: '#2a1d1a',
    sorriso: 'fechado',
    batom: '#d4707c',
    delineado: true,
    delineadoGatinho: true,
    roupa: '#141416',
    tomaraQueCaia: true,
    choker: true,
    blush: 0.38
  }
};

for (const [id, f] of Object.entries(PERSONAGENS)) {
  const dir = path.join(ROOT, 'assets', 'sprites', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'busto.svg'), busto(f));
  console.log('gerado', path.join('assets', 'sprites', id, 'busto.svg'));
}
