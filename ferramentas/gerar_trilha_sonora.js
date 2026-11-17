#!/usr/bin/env node
/**
 * ferramentas/gerar_trilha_sonora.js
 * Lê assets/Musicas mp3/ e gera data/musicas.json (catálogo do LuiggiCloud + LuiggiBeats Hero):
 *  - artista pela pasta, álbum, número da faixa, título limpo
 *  - com ffmpeg/ffprobe instalados: duração, forma de onda real (picos) e loudness (LUFS) para
 *    normalizar o volume entre faixas
 * Preserva campos editados à mão nas faixas existentes (titulo, descricao, desbloqueiaNoCapitulo, bpm...)
 * quando "aConfirmar" for false.
 *
 * Uso: node ferramentas/gerar_trilha_sonora.js && node ferramentas/empacotar_dados.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PASTA = path.join(ROOT, 'assets', 'Musicas mp3');
const SAIDA = path.join(ROOT, 'data', 'musicas.json');
const EXTS = new Set(['.mp3', '.m4a', '.wav', '.ogg']);
const ALVO_LUFS = -16;
const BARRAS = 120;

// Pasta -> artista / álbum
const PASTAS = {
  'Primeiro album luis Bandido sobre o vitor': { artista: 'luiggibeats', album: 'Bandido', descricaoAlbum: 'Primeiro álbum do LuiggiBeats — sobre o Vitor.', capa: 'Imagem capa do album.jpg', ano: 2020 },
  'Luis outras musicas': { artista: 'luiggibeats', album: 'Singles', ano: 2021 },
  CyberSupremacy: { artista: 'cybersupremacy' },
  Dujazz: { artista: 'dujazz' },
  Roddie: { artista: 'roddie' },
  siris69: { artista: 'siris69' }
};

const ARTISTAS = [
  { id: 'luiggibeats', nome: 'LuiggiBeats', verificado: true, cor: '#ff5500', avatar: 'assets/sprites/luis/cartoon.png', bio: 'Shittrap, sofrência e beats de madrugada. Curitiba.' },
  { id: 'cybersupremacy', nome: 'CyberSupremacy', cor: '#a855f7', bio: 'Coletivo · faixas bônus' },
  { id: 'dujazz', nome: 'Dujazz', cor: '#22c55e', bio: 'Faixas bônus' },
  { id: 'roddie', nome: 'Roddie', cor: '#38bdf8', bio: 'Faixas bônus' },
  { id: 'siris69', nome: 'siris69', cor: '#f43f5e', bio: 'Faixas bônus' }
];

// Apelidos usados como prefixo "apelido - título" nos nomes de arquivo
const ALIASES = { siris69: ['siris'], Dujazz: ['Dujazz'] };
// Ajustes finos de título (depois da limpeza automática)
const TITULOS = {
  'siris roddie - te amo 3 (prod. rip borba)': 'te amo 3 w/ Roddie (prod. rip borba)',
  'tareq - Garagem feat. Dujazz': 'Garagem (Tareq feat. Dujazz)',
  'Meia noite feat. Tareq': 'Meia Noite feat. Tareq',
  'ﾟﾟProfissionalKillerﾟﾟ': 'ﾟﾟProfissional Killerﾟﾟ'
};

function temBinario(nome) {
  const r = spawnSync(nome, ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}
const FFMPEG = temBinario('ffmpeg');
const FFPROBE = temBinario('ffprobe');

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function limparTitulo(base, nomeArtista) {
  let t = base;
  let faixa = null;
  const sc = /^soundcloud-(\d+)-(.+)-\d{6,}$/.exec(t);
  if (sc) {
    faixa = Number(sc[1]);
    t = sc[2];
  }
  t = t.replace(/_KLICKAUD$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*DISPONIVEL NO SPOTIFY\s*/i, ' ').trim();
  // "Artista - Título" -> "Título" quando o artista é o da pasta
  const pref = new RegExp(`^${nomeArtista.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*`, 'i');
  t = t.replace(pref, '');
  for (const alias of ALIASES[nomeArtista] || []) t = t.replace(new RegExp(`^${alias}\\s*-\\s*`, 'i'), '');
  t = t.replace(/\bprod\s*(?=[A-Z])/, 'prod ');
  t = t.replace(/\bprod\s+(.+)$/i, '(prod. $1)').replace(/\s+w\s+/i, ' w/ ').replace(/\s+ft\s+/i, ' ft. ').replace(/\s+feat\s+/i, ' feat. ');
  if (TITULOS[t]) t = TITULOS[t];
  t = t.replace(/Slowed Reverb/i, '(Slowed + Reverb)').replace(/Bonus Track/i, '(Bonus Track)');
  return { titulo: t, faixa };
}

function ffprobeDuracao(arquivo) {
  if (!FFPROBE) return null;
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arquivo], { encoding: 'utf8' });
  const v = parseFloat(r.stdout);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

function ffmpegPicos(arquivo) {
  if (!FFMPEG) return null;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', arquivo, '-ac', '1', '-ar', '4000', '-f', 's16le', '-'], { maxBuffer: 1024 * 1024 * 200 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const amostras = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  const por = Math.max(1, Math.floor(amostras.length / BARRAS));
  const picos = [];
  for (let i = 0; i < BARRAS; i++) {
    let soma = 0;
    let pico = 0;
    for (let k = i * por; k < Math.min(amostras.length, (i + 1) * por); k++) {
      const v = Math.abs(amostras[k]) / 32768;
      soma += v * v;
      if (v > pico) pico = v;
    }
    picos.push(Math.sqrt(soma / por) * 0.7 + pico * 0.3);
  }
  const max = Math.max(...picos, 1e-6);
  return picos.map((p) => Math.round((p / max) * 100) / 100);
}

function ffmpegLufs(arquivo) {
  if (!FFMPEG) return null;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arquivo, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  const m = /I:\s+(-?[\d.]+)\s+LUFS/.exec(r.stderr || '');
  return m ? parseFloat(m[1]) : null;
}

function main() {
  if (!fs.existsSync(PASTA)) {
    console.error('Pasta não encontrada:', PASTA);
    process.exit(1);
  }
  let antigas = [];
  try {
    antigas = JSON.parse(fs.readFileSync(SAIDA, 'utf8')).faixas || [];
  } catch (_) { }
  const confirmadas = new Map(antigas.filter((f) => f.aConfirmar === false).map((f) => [f.arquivo, f]));

  const arquivos = listar(PASTA).filter((f) => EXTS.has(path.extname(f).toLowerCase()));
  const faixas = [];
  const albuns = new Map();
  arquivos.forEach((abs, idx) => {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const pastaNome = path.basename(path.dirname(abs));
    const info = PASTAS[pastaNome] || { artista: slug(pastaNome) };
    const artista = ARTISTAS.find((a) => a.id === info.artista) || { id: info.artista, nome: pastaNome };
    const base = path.basename(abs, path.extname(abs));
    const { titulo, faixa } = limparTitulo(base, artista.nome);
    const id = `${artista.id}-${slug(titulo) || idx}`;
    process.stdout.write(`  ${artista.nome.padEnd(15)} ${titulo}\n`);
    const duracao = ffprobeDuracao(abs);
    const picos = ffmpegPicos(abs);
    const lufs = ffmpegLufs(abs);
    const ganhoDb = lufs === null ? 0 : Math.max(-12, Math.min(9, ALVO_LUFS - lufs));
    const capa = info.capa ? path.relative(ROOT, path.join(path.dirname(abs), info.capa)).split(path.sep).join('/') : null;
    if (info.album) {
      const k = `${artista.id}|${info.album}`;
      if (!albuns.has(k)) albuns.set(k, { id: slug(`${artista.id}-${info.album}`), artista: artista.id, titulo: info.album, descricao: info.descricaoAlbum || '', capa, ano: info.ano || null });
    }
    const conf = confirmadas.get(rel) || {};
    faixas.push({
      id,
      arquivo: rel,
      titulo: conf.titulo || titulo,
      artista: artista.nome,
      artistaId: artista.id,
      album: info.album || null,
      faixa,
      capa,
      ano: conf.ano || info.ano || null,
      duracao,
      picos,
      lufs,
      ganhoDb: Math.round(ganhoDb * 10) / 10,
      descricao: conf.descricao || (artista.id === 'luiggibeats' ? `Faixa do LuiggiBeats${info.album ? ` · ${info.album}` : ''}.` : `Faixa bônus de ${artista.nome}.`),
      desbloqueiaNoCapitulo: conf.desbloqueiaNoCapitulo ?? (artista.id === 'luiggibeats' ? 2 : 0),
      bpm: conf.bpm || 140,
      ehMusicaDoTiago: false,
      sintetizadaFallback: false,
      aConfirmar: conf.aConfirmar ?? true
    });
  });
  // Ordena: LuiggiBeats primeiro, álbum em ordem de faixa
  const ordemArtista = (id) => ARTISTAS.findIndex((a) => a.id === id) + 1 || 99;
  faixas.sort((a, b) => ordemArtista(a.artistaId) - ordemArtista(b.artistaId) || (a.album || 'zz').localeCompare(b.album || 'zz') || (a.faixa || 99) - (b.faixa || 99) || a.titulo.localeCompare(b.titulo));

  const json = {
    nota: 'Gerado por ferramentas/gerar_trilha_sonora.js a partir de assets/Musicas mp3/. Mude "aConfirmar" para false numa faixa para preservar edições manuais.',
    alvoLufs: ALVO_LUFS,
    mp3sEncontrados: faixas.length,
    artistas: ARTISTAS.filter((a) => faixas.some((f) => f.artistaId === a.id)),
    albuns: [...albuns.values()],
    faixas
  };
  fs.writeFileSync(SAIDA, JSON.stringify(json, null, 2) + '\n');
  console.log(`\n${faixas.length} faixas, ${json.artistas.length} artistas, ${json.albuns.length} álbuns. ffmpeg: ${FFMPEG ? 'sim' : 'não (sem waveform/loudness)'}.`);
}

main();
