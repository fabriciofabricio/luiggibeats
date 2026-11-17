#!/usr/bin/env node
/**
 * ferramentas/gerar_sprites.js
 *
 * Gera os sprites/retratos SVG em /assets/sprites/<id>/ a partir de data/personagens.json
 * e atualiza data/personagens_bundle.js para uso sem servidor (file://).
 *
 * Uso: node ferramentas/gerar_sprites.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Rig = require('../src/engine/CharacterRig.js');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'personagens.json');
const SPRITES_DIR = path.join(ROOT, 'assets', 'sprites');
const BUNDLE_PATH = path.join(ROOT, 'data', 'personagens_bundle.js');

const EXPRESSOES = ['neutro', 'feliz', 'bravo', 'envergonhado', 'chocado'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  ensureDir(SPRITES_DIR);

  let totalArquivos = 0;

  for (const p of data.personagens) {
    const dir = path.join(SPRITES_DIR, p.id);
    ensureDir(dir);

    // Corpo inteiro padrão
    const corpo = Rig.renderCharacterSVG(p, { expressao: 'neutro', scale: 'full' });
    fs.writeFileSync(path.join(dir, 'corpo.svg'), corpo, 'utf8');
    totalArquivos++;

    // Falando (boca aberta)
    const falando = Rig.renderCharacterSVG(p, { expressao: 'neutro', scale: 'portrait', talkPhase: 2 });
    fs.writeFileSync(path.join(dir, 'falando.svg'), falando, 'utf8');
    totalArquivos++;

    // 5 expressões em busto
    for (const expr of EXPRESSOES) {
      const retrato = Rig.renderCharacterSVG(p, { expressao: expr, scale: 'portrait' });
      fs.writeFileSync(path.join(dir, `retrato_${expr}.svg`), retrato, 'utf8');
      totalArquivos++;
    }
  }

  for (const v of data.veiculos || []) {
    const dir = path.join(SPRITES_DIR, v.id);
    ensureDir(dir);
    const svg = Rig.renderVehicleSVG(v);
    fs.writeFileSync(path.join(dir, 'veiculo.svg'), svg, 'utf8');
    totalArquivos++;
  }

  // Bundle JS para abertura direta via file://
  const bundle = `// Gerado automaticamente por ferramentas/gerar_sprites.js\nwindow.__LUIGGI_PERSONAGENS__ = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(BUNDLE_PATH, bundle, 'utf8');

  console.log(`Sprites e retratos gerados em /assets/sprites/: ${totalArquivos} arquivos SVG.`);
  console.log(`Bundle atualizado: data/personagens_bundle.js`);
}

main();
