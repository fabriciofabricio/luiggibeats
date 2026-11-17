#!/usr/bin/env node
/**
 * ferramentas/empacotar_dados.js
 * Empacota todos os JSONs de /data/ e assets/manifest.json em data/game_bundle.js
 * para permitir rodar o jogo abrindo index.html direto (file://) sem erros de CORS.
 * Uso: node ferramentas/empacotar_dados.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const FILES = [
  ['personagens', path.join(DATA_DIR, 'personagens.json')],
  ['musicas', path.join(DATA_DIR, 'musicas.json')],
  ['conquistas', path.join(DATA_DIR, 'conquistas.json')],
  ['receitas', path.join(DATA_DIR, 'receitas.json')],
  ['namedrops', path.join(DATA_DIR, 'namedrops.json')],
  ['mapa_curitiba', path.join(DATA_DIR, 'mapa_curitiba.json')],
  ['museu', path.join(DATA_DIR, 'museu.json')],
  ['minigames', path.join(DATA_DIR, 'minigames.json')],
  ['escolhas', path.join(DATA_DIR, 'escolhas.json')],
  ['dialogos', path.join(DATA_DIR, 'dialogos.json')],
  ['manifest', path.join(ROOT, 'assets', 'manifest.json')]
];

const bundle = {};
for (const [key, filePath] of FILES) {
  bundle[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const outPath = path.join(DATA_DIR, 'game_bundle.js');
fs.writeFileSync(
  outPath,
  `// Gerado automaticamente por ferramentas/empacotar_dados.js\nwindow.__LUIGGI_GAME_BUNDLE__ = ${JSON.stringify(bundle)};\n`,
  'utf8'
);
console.log(`Bundle completo gerado em data/game_bundle.js (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB).`);
