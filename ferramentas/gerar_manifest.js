#!/usr/bin/env node
/**
 * ferramentas/gerar_manifest.js
 *
 * Script Node sem dependências para inspecionar /assets, mapear fotos, cenários
 * e MP3s conforme a seção 13, e gerar:
 *   - assets/manifest.json
 *   - data/musicas.json (preservando entradas já confirmadas pelo usuário)
 *   - data/manifest_bundle.js (fallback para abertura direta via file://)
 *
 * Uso: node ferramentas/gerar_manifest.js
 * Nunca renomeia, move ou apaga arquivos originais.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DATA_DIR = path.join(ROOT, 'data');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const GENERATED_SUBDIRS = new Set(['sprites', 'cenarios_gerados', 'sfx']);

function normalizarTexto(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Mapa explícito da Seção 13 (pasta/nome normalizado -> id canônico)
const MAPA_SECAO_13 = [
  { id: 'luis', nomes: ['luisfelipepersonagemprincipal', 'luisfelipe', 'luiggibeats', 'luis', 'felps'], tipo: 'personagem' },
  { id: 'fabricio', nomes: ['fabricioventuri', 'fabricio'], tipo: 'personagem' },
  { id: 'mateus_buse', nomes: ['mateusbuse', 'buse'], tipo: 'personagem' },
  { id: 'matheus_neuman', nomes: ['matheusnneuman', 'matheusneuman', 'mateusneuman', 'neuman'], tipo: 'personagem' },
  { id: 'tiago_music', nomes: ['tiagomusic', 'tiago'], tipo: 'personagem' },
  { id: 'vitor_witiuk', nomes: ['vitorwitiuk', 'vitor'], tipo: 'personagem' },
  { id: 'maria_clara', nomes: ['mariaclara'], tipo: 'personagem' },
  { id: 'cecilia', nomes: ['cecilia'], tipo: 'personagem' },
  { id: 'tutuluiza', nomes: ['tutuluiza'], tipo: 'personagem' },
  { id: 'gi_eta', nomes: ['gieta'], tipo: 'personagem' },
  { id: 'caliandra', nomes: ['caliandra'], tipo: 'personagem' },
  { id: 'luiza', nomes: ['luizaprimeirasegundanamorada', 'luiza'], tipo: 'personagem' },
  { id: 'agatha', nomes: ['agatha'], tipo: 'personagem' },
  { id: 'gato_luiza', nomes: ['gatodaluiza', 'gato', 'gatoluiza'], tipo: 'pet' },
  { id: 'rebeca', nomes: ['rebeca'], tipo: 'personagem' },
  { id: 'pietra', nomes: ['pietra'], tipo: 'personagem' },
  { id: 'julie', nomes: ['julie'], tipo: 'personagem' },
  { id: 'ruiva_misteriosa', nomes: ['ruivamisteriosa'], tipo: 'personagem' },
  { id: 'marilis_docinho', nomes: ['marilisdocinho', 'marilis'], tipo: 'personagem' },
  { id: 'yohana', nomes: ['yohana'], tipo: 'personagem' },
  { id: 'yuri', nomes: ['yuri'], tipo: 'personagem' },
  { id: 'erion', nomes: ['erion'], tipo: 'personagem' },
  { id: 'rayssa', nomes: ['rayssadoces', 'rayssa'], tipo: 'personagem' },
  { id: 'emily', nomes: ['emilydoces', 'emily'], tipo: 'personagem' },
  { id: 'sol', nomes: ['sol'], tipo: 'personagem' },
  { id: 'eloiza', nomes: ['eloiza'], tipo: 'personagem' },
  { id: 'lara', nomes: ['lara'], tipo: 'personagem' },
  { id: 'isabela_dominik', nomes: ['isabeladominik', 'isabela', 'dominik'], tipo: 'personagem' },
  { id: 'subaru_legacy', nomes: ['carrosubarulegacy', 'subarulegacy', 'subaru'], tipo: 'veiculo' },
  { id: 'civic_emily', nomes: ['civicdaemilydoces', 'civicdaemily', 'civictunado', 'civic'], tipo: 'veiculo' }
];

const CAPITULO_POR_PALAVRA_CHAVE = [
  { chaves: ['tiago'], cap: 1 },
  { chaves: ['vitor', 'pandemia', 'shittrap', '2020', 'nasce'], cap: 2 },
  { chaves: ['felps', 'cecilia', 'confidencial', 'faculdade'], cap: 3 },
  { chaves: ['subaru', 'academia', 'boxer', 'gieta'], cap: 4 },
  { chaves: ['becbar', 'caliandra', 'alemanha'], cap: 5 },
  { chaves: ['vela', 'centro', '3h', 'madrugada', 'agatha'], cap: 6 },
  { chaves: ['gato', 'luiza', 'shopping'], cap: 7 },
  { chaves: ['sadbaile', 'sad', 'ruiva', 'baile', 'marilis'], cap: 8 },
  { chaves: ['tnt', 'asterisco', 'yohana', 'franca', 'nora'], cap: 9 },
  { chaves: ['tico', 'teco', 'civic', 'racha', 'emily', 'rayssa'], cap: 10 },
  { chaves: ['sonho', 'drift', 'sol'], cap: 11 },
  { chaves: ['eloiza', 'redflag', 'gotica'], cap: 12 },
  { chaves: ['treta', 'x1', 'underground'], cap: 13 },
  { chaves: ['pontocego', 'yard', 'james', 'tutuluiza'], cap: 14 },
  { chaves: ['cookie', 'hiperfoco', 'final', 'escolha'], cap: 15 }
];

function lerTagsID3Basicas(filePath) {
  const resultado = { titulo: null, artista: null, ano: null };
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const header = Buffer.alloc(Math.min(4096, stat.size));
    fs.readSync(fd, header, 0, header.length, 0);

    // ID3v2
    if (header.slice(0, 3).toString('ascii') === 'ID3') {
      const version = header[3];
      const tagSize =
        ((header[6] & 0x7f) << 21) |
        ((header[7] & 0x7f) << 14) |
        ((header[8] & 0x7f) << 7) |
        (header[9] & 0x7f);
      const totalRead = Math.min(stat.size, tagSize + 10, 65536);
      const tagBuf = Buffer.alloc(totalRead);
      fs.readSync(fd, tagBuf, 0, totalRead, 0);
      let pos = 10;
      const frameHeaderSize = version === 2 ? 6 : 10;
      while (pos + frameHeaderSize < tagBuf.length) {
        const frameId =
          version === 2
            ? tagBuf.slice(pos, pos + 3).toString('ascii')
            : tagBuf.slice(pos, pos + 4).toString('ascii');
        if (!/^[A-Z0-9]{3,4}$/.test(frameId)) break;
        let frameSize = 0;
        if (version === 2) {
          frameSize = (tagBuf[pos + 3] << 16) | (tagBuf[pos + 4] << 8) | tagBuf[pos + 5];
        } else if (version === 4) {
          frameSize =
            ((tagBuf[pos + 4] & 0x7f) << 21) |
            ((tagBuf[pos + 5] & 0x7f) << 14) |
            ((tagBuf[pos + 6] & 0x7f) << 7) |
            (tagBuf[pos + 7] & 0x7f);
        } else {
          frameSize = tagBuf.readUInt32BE(pos + 4);
        }
        if (frameSize <= 0 || pos + frameHeaderSize + frameSize > tagBuf.length) break;
        const payload = tagBuf.slice(pos + frameHeaderSize, pos + frameHeaderSize + frameSize);
        if (['TIT2', 'TT2', 'TPE1', 'TP1', 'TYER', 'TDRC', 'TYE'].includes(frameId)) {
          const enc = payload[0];
          let text = '';
          if (enc === 1 || enc === 2) {
            text = payload.slice(1).toString('utf16le').replace(/^\uFEFF/, '');
          } else if (enc === 3) {
            text = payload.slice(1).toString('utf8');
          } else {
            text = payload.slice(1).toString('latin1');
          }
          text = text.replace(/\0/g, '').trim();
          if (text) {
            if (frameId === 'TIT2' || frameId === 'TT2') resultado.titulo = text;
            if (frameId === 'TPE1' || frameId === 'TP1') resultado.artista = text;
            if (frameId === 'TYER' || frameId === 'TDRC' || frameId === 'TYE') {
              const m = text.match(/\d{4}/);
              if (m) resultado.ano = Number(m[0]);
            }
          }
        }
        pos += frameHeaderSize + frameSize;
      }
    }

    // ID3v1 fallback (últimos 128 bytes)
    if (!resultado.titulo && stat.size >= 128) {
      const tail = Buffer.alloc(128);
      fs.readSync(fd, tail, 0, 128, stat.size - 128);
      if (tail.slice(0, 3).toString('ascii') === 'TAG') {
        const t = tail.slice(3, 33).toString('latin1').replace(/\0/g, '').trim();
        const a = tail.slice(33, 63).toString('latin1').replace(/\0/g, '').trim();
        const y = tail.slice(93, 97).toString('latin1').replace(/\0/g, '').trim();
        if (t) resultado.titulo = t;
        if (a && !resultado.artista) resultado.artista = a;
        if (/^\d{4}$/.test(y) && !resultado.ano) resultado.ano = Number(y);
      }
    }
    fs.closeSync(fd);
  } catch (_) {
    // Silencioso: usa nome do arquivo como fallback
  }
  return resultado;
}

function percorrerPasta(dir, relBase = '') {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let arquivos = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!relBase && GENERATED_SUBDIRS.has(entry.name.toLowerCase())) continue;
      arquivos = arquivos.concat(percorrerPasta(full, rel));
    } else if (entry.isFile()) {
      if (!relBase && entry.name.toLowerCase() === 'manifest.json') continue;
      arquivos.push({ full, rel, name: entry.name });
    }
  }
  return arquivos;
}

function classificarArquivo(relPath) {
  const parts = relPath.split('/');
  const ext = path.extname(relPath).toLowerCase();
  const baseName = path.basename(relPath, ext);
  const topFolder = parts.length > 1 ? parts[0] : '';
  const topNorm = normalizarTexto(topFolder);
  const fileNorm = normalizarTexto(baseName);

  const isAudio = AUDIO_EXTS.has(ext);
  const isImage = IMAGE_EXTS.has(ext);
  const tipo = isAudio ? 'audio' : isImage ? 'imagem' : 'outro';

  if (tipo === 'audio') {
    const isTiago = fileNorm.includes('tiago') || topNorm.includes('tiago');
    return {
      caminho: `assets/${relPath}`,
      tipo: 'audio',
      categoria: isTiago ? 'audio_tiago' : 'musica',
      associadoId: isTiago ? 'tiago_music' : 'luiggibeats',
      ambiguo: false,
      foraSecao13: false
    };
  }

  // Cenários / backgrounds
  if (topNorm === 'cenarios' || topNorm === 'colegiobackgrounds') {
    return {
      caminho: `assets/${relPath}`,
      tipo,
      categoria: 'cenario',
      associadoId: normalizarTexto(parts.slice(1, -1).join('_') || baseName),
      ambiguo: false,
      foraSecao13: topNorm === 'colegiobackgrounds'
    };
  }

  // Pasta legada /personagens/
  if (topNorm === 'personagens') {
    let matched = null;
    for (const item of MAPA_SECAO_13) {
      if (item.nomes.some((n) => fileNorm.startsWith(n) || fileNorm.includes(n))) {
        matched = item.id;
        break;
      }
    }
    return {
      caminho: `assets/${relPath}`,
      tipo,
      categoria: 'sprite_legado',
      associadoId: matched || normalizarTexto(baseName),
      ambiguo: false,
      foraSecao13: !matched
    };
  }

  // Correspondência exata por pasta ou arquivo na Seção 13 (primeiro exato, depois substring)
  for (const item of MAPA_SECAO_13) {
    if (topNorm && item.nomes.some((n) => topNorm === n)) {
      return {
        caminho: `assets/${relPath}`,
        tipo,
        categoria: item.tipo,
        associadoId: item.id,
        ambiguo: false,
        foraSecao13: false
      };
    }
  }
  for (const item of MAPA_SECAO_13) {
    const bateTop = topNorm && item.nomes.some((n) => topNorm.includes(n));
    const bateFile = item.nomes.some((n) => fileNorm.includes(n));
    if (bateTop || (!topNorm && bateFile)) {
      return {
        caminho: `assets/${relPath}`,
        tipo,
        categoria: item.tipo,
        associadoId: item.id,
        ambiguo: false,
        foraSecao13: false
      };
    }
  }

  // Fotos de galeria em /assets/fotos/
  if (topNorm === 'fotos') {
    return {
      caminho: `assets/${relPath}`,
      tipo,
      categoria: 'foto_galeria',
      associadoId: null,
      ambiguo: false,
      foraSecao13: false
    };
  }

  // Pastas extras fora da Seção 13 (ex.: Amanda Becker, Amanda Souza, Gabriel Cardoso, Isabel, Isabela Biscaia, Mateus Tuon)
  return {
    caminho: `assets/${relPath}`,
    tipo,
    categoria: 'extra_nao_identificado_secao13',
    associadoId: topNorm || fileNorm,
    ambiguo: true,
    notaAmbiguidade: `Arquivo/pasta "${topFolder || baseName}" não consta na lista da seção 13.`,
    foraSecao13: true
  };
}

function sugerirCapituloMusica(nomeArquivo, indice, total) {
  const norm = normalizarTexto(nomeArquivo);
  for (const regra of CAPITULO_POR_PALAVRA_CHAVE) {
    if (regra.chaves.some((c) => norm.includes(c))) return regra.cap;
  }
  // Distribui entre capítulos 2..15 caso o nome não indique capítulo
  if (total <= 1) return 2;
  return 2 + Math.floor((indice / total) * 13);
}

function formatarTituloArquivo(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('Pasta /assets não encontrada.');
    process.exit(1);
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const encontrados = percorrerPasta(ASSETS_DIR);
  const itens = encontrados.map((f) => classificarArquivo(f.rel));

  const porPersonagem = {};
  const porVeiculo = {};
  const cenarios = [];
  const musicas = [];
  const spritesLegados = [];
  const extras = [];

  for (const item of itens) {
    if (item.categoria === 'personagem') {
      if (!porPersonagem[item.associadoId]) porPersonagem[item.associadoId] = [];
      porPersonagem[item.associadoId].push(item.caminho);
    } else if (item.categoria === 'veiculo') {
      if (!porVeiculo[item.associadoId]) porVeiculo[item.associadoId] = [];
      porVeiculo[item.associadoId].push(item.caminho);
    } else if (item.categoria === 'cenario') {
      cenarios.push(item);
    } else if (item.categoria === 'musica' || item.categoria === 'audio_tiago') {
      musicas.push(item);
    } else if (item.categoria === 'sprite_legado') {
      spritesLegados.push(item);
    } else {
      extras.push(item);
    }
  }

  const semFotoSecao13 = MAPA_SECAO_13.filter(
    (m) => !porPersonagem[m.id] && !porVeiculo[m.id]
  ).map((m) => m.id);

  const manifest = {
    versao: 1,
    geradoEm: new Date().toISOString(),
    resumo: {
      totalArquivos: itens.length,
      imagens: itens.filter((i) => i.tipo === 'imagem').length,
      audios: itens.filter((i) => i.tipo === 'audio').length,
      personagensComFoto: Object.keys(porPersonagem).length,
      veiculosComFoto: Object.keys(porVeiculo).length,
      cenarios: cenarios.length,
      extrasForaSecao13: extras.length,
      semFotoSecao13
    },
    porPersonagem,
    porVeiculo,
    cenarios,
    musicas,
    spritesLegados,
    extras,
    arquivos: itens
  };

  fs.writeFileSync(
    path.join(ASSETS_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // Atualiza data/musicas.json preservando entradas já confirmadas (aConfirmar: false)
  const musicasPath = path.join(DATA_DIR, 'musicas.json');
  let musicasExistentes = [];
  if (fs.existsSync(musicasPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(musicasPath, 'utf8'));
      if (Array.isArray(parsed.faixas)) musicasExistentes = parsed.faixas;
    } catch (_) {}
  }

  const mapaExistente = new Map(musicasExistentes.map((m) => [m.arquivo, m]));
  const mp3Files = encontrados.filter((f) => AUDIO_EXTS.has(path.extname(f.name).toLowerCase()));
  const faixasGeradas = mp3Files.map((f, idx) => {
    const rel = `assets/${f.rel}`;
    const antiga = mapaExistente.get(rel);
    if (antiga && antiga.aConfirmar === false) return antiga;

    const tags = lerTagsID3Basicas(f.full);
    const isTiago = normalizarTexto(f.name).includes('tiago');
    return {
      id: normalizarTexto(path.basename(f.name, path.extname(f.name))),
      arquivo: rel,
      titulo: tags.titulo || formatarTituloArquivo(f.name),
      artista: tags.artista || (isTiago ? 'Tiago Music' : 'LuiggiBeats'),
      ano: tags.ano || 2020,
      descricao: isTiago
        ? 'A lendária primeira música do Tiago Music.'
        : 'Faixa original do LuiggiBeats detectada automaticamente em /assets.',
      desbloqueiaNoCapitulo: isTiago ? 1 : sugerirCapituloMusica(f.name, idx, mp3Files.length),
      bpm: 140,
      ehMusicaDoTiago: isTiago,
      sintetizadaFallback: false,
      aConfirmar: true
    };
  });

  // Se não houver MP3s reais ainda, mantém faixas sintetizadas de fallback para o jogo nunca quebrar
  const faixasFallback =
    faixasGeradas.length > 0
      ? faixasGeradas
      : [
          {
            id: 'tiago_primeira_musica_placeholder',
            arquivo: null,
            titulo: 'Primeira Música do Tiago (Placeholder Desafinado)',
            artista: 'Tiago Music',
            ano: 2019,
            descricao:
              'Nenhum MP3 com "tiago" foi encontrado em /assets. Áudio propositalmente desafinado sintetizado via Web Audio.',
            desbloqueiaNoCapitulo: 1,
            bpm: 112,
            ehMusicaDoTiago: true,
            sintetizadaFallback: true,
            aConfirmar: true
          },
          {
            id: 'vitor_no_date_shittrap',
            arquivo: null,
            titulo: 'Vitor no Date (Shittrap 2020)',
            artista: 'LuiggiBeats feat. Fabricio',
            ano: 2020,
            descricao:
              'Faixa placeholder sintetizada até os MP3s reais do LuiggiBeats serem adicionados em /assets.',
            desbloqueiaNoCapitulo: 2,
            bpm: 140,
            ehMusicaDoTiago: false,
            sintetizadaFallback: true,
            aConfirmar: true
          },
          {
            id: 'subaru_madrugada_beat',
            arquivo: null,
            titulo: 'Subaru 3h da Manhã',
            artista: 'LuiggiBeats',
            ano: 2022,
            descricao: 'Beat placeholder atmosférico para as cenas noturnas em Curitiba.',
            desbloqueiaNoCapitulo: 6,
            bpm: 128,
            ehMusicaDoTiago: false,
            sintetizadaFallback: true,
            aConfirmar: true
          },
          {
            id: 'sad_baile_type_beat',
            arquivo: null,
            titulo: 'Sad Baile (Choro no Grave)',
            artista: 'LuiggiBeats',
            ano: 2023,
            descricao: 'Beat placeholder melancólico do capítulo 8.',
            desbloqueiaNoCapitulo: 8,
            bpm: 132,
            ehMusicaDoTiago: false,
            sintetizadaFallback: true,
            aConfirmar: true
          },
          {
            id: 'red_flag_queen_anthem',
            arquivo: null,
            titulo: 'Melhores Amigos Bloqueados',
            artista: 'LuiggiBeats',
            ano: 2024,
            descricao: 'Beat placeholder gótico/trap da era Eloiza.',
            desbloqueiaNoCapitulo: 12,
            bpm: 145,
            ehMusicaDoTiago: false,
            sintetizadaFallback: true,
            aConfirmar: true
          }
        ];

  const musicasJson = {
    nota:
      mp3Files.length === 0
        ? 'Nenhum arquivo MP3 encontrado em /assets até o momento. Coloque os MP3s em /assets e rode `node ferramentas/gerar_manifest.js`.'
        : 'Lista gerada a partir dos MP3s em /assets. Mude "aConfirmar" para false após revisar.',
    mp3sEncontrados: mp3Files.length,
    faixas: faixasFallback
  };

  fs.writeFileSync(musicasPath, JSON.stringify(musicasJson, null, 2), 'utf8');

  // Bundle JS para compatibilidade com abertura direta via file://
  const bundleContent = `// Gerado automaticamente por ferramentas/gerar_manifest.js\nwindow.__LUIGGI_MANIFEST__ = ${JSON.stringify(manifest, null, 2)};\nwindow.__LUIGGI_MUSICAS__ = ${JSON.stringify(musicasJson, null, 2)};\n`;
  fs.writeFileSync(path.join(DATA_DIR, 'manifest_bundle.js'), bundleContent, 'utf8');

  console.log('Manifest gerado com sucesso!');
  console.log(`- Total de arquivos em /assets: ${manifest.resumo.totalArquivos}`);
  console.log(`- Imagens: ${manifest.resumo.imagens} | Áudios/MP3s: ${manifest.resumo.audios}`);
  console.log(`- Personagens com foto: ${manifest.resumo.personagensComFoto} | Veículos com foto: ${manifest.resumo.veiculosComFoto}`);
  console.log(`- Sem foto (Seção 13): ${semFotoSecao13.join(', ')}`);
}

main();
