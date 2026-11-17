#!/usr/bin/env node
/**
 * ferramentas/reformular_roteiro.js
 * Aplica a reformulação de roteiro descrita em ROTEIRO_REFORMULADO.md em data/dialogos.json
 * e data/escolhas.json, preservando todas as falas e referências:
 *  1. O "Narrador da Realidade" passa a ser o Fabricio comentando (adendo). Onde o narrador citava
 *     o Fabricio em 3ª pessoa, a frase vira 1ª pessoa ("o Fabricio" -> "eu").
 *  2. Fabricio só aparece no Discord quando não está do lado do Luis (cookies, pandemia, mensagens
 *     depois do sonho, final). Nos outros casos vira comentário presencial.
 *  3. Eventos "cena" marcam as trocas de lugar dentro do capítulo (com elenco fixo em cenas no Subaru).
 * É idempotente: pode rodar mais de uma vez.
 * Uso: node ferramentas/reformular_roteiro.js && node ferramentas/empacotar_dados.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const pDial = path.join(ROOT, 'data', 'dialogos.json');
const pEsc = path.join(ROOT, 'data', 'escolhas.json');
const dial = JSON.parse(fs.readFileSync(pDial, 'utf8'));
const esc = JSON.parse(fs.readFileSync(pEsc, 'utf8'));
const cap = (id) => dial.capitulos.find((c) => c.id === id);

// ---------------------------------------------------------------- 1. Textos do narrador em 1ª pessoa
const TROCAS = [
  ['É a Caliandra, ex-ficante do Fabricio, de franja, acompanhada da amiga Luiza. Detalhe: o Fabricio já está ficando com a Agatha.', 'É a Caliandra, minha ex-ficante, de franja, acompanhada da amiga Luiza. Detalhe: eu já tava ficando com a Agatha.'],
  ["Todos vão pro apartamento da Luiza. No outro quarto, Caliandra repete mais 5 vezes: 'Fabricio, você sabe o que faz.' Eles ficam.", "Todo mundo vai pro apartamento da Luiza. No outro quarto, a Caliandra repete mais 5 vezes: 'Fabricio, você sabe o que faz.' A gente fica."],
  ['Enquanto isso, na sala, o Luis aprendia geografia alemã. De repente, o celular do Fabricio vibra.', 'Enquanto isso, na sala, o Luis aprendia geografia alemã. De repente, o meu celular vibra.'],
  ['Ao fundo, Fabricio conhece a Rayssa com corações voando. Enquanto isso, Luis conhece a Yohana...', 'Ao fundo, eu conheço a Rayssa com corações voando. Enquanto isso, o Luis conhece a Yohana...'],
  ["No Subaru: Luis, Eloiza, Fabricio e Matheus Neuman. O combinado era dar carona pra Yohana pro TNT.", "No Subaru: o Luis, a Eloiza, eu e o Matheus Neuman. O combinado era dar carona pra Yohana pro TNT."],
  ['Mais tarde, no galpão underground. Luz vermelha, grave pesado. A Yohana chama Luis e Fabricio lá fora...', 'Mais tarde, no galpão underground. Luz vermelha, grave pesado. A Yohana chama eu e o Luis lá fora...'],
  ['MAS NA VIDA REAL... ninguém venceu. Luis perdeu a paz, Fabricio perdeu o rolê, e o Cara Aleatório continua concordando até hoje.', 'MAS NA VIDA REAL... ninguém venceu. O Luis perdeu a paz, eu perdi o rolê, e o Cara Aleatório continua concordando até hoje.'],
  ['Por que você ainda não sabe o que ela posta? Por que a mãe dela ainda não sabe que você existe? Se fosse o Fabricio vivendo isso, o que você diria pra ele?', 'Por que você ainda não sabe o que ela posta? Por que a mãe dela ainda não sabe que você existe? Se fosse eu vivendo isso, o que você diria pra mim?'],
  ["Celular vibra: 'Luiza: chegou bem? 🙂' — Narrador: 'Pelo menos alguém perguntou.'", "Celular vibra: 'Luiza: chegou bem? 🙂' — Fabricio: 'Pelo menos alguém perguntou.'"],
  ["Dia de TNT. O Subaru tem 5 lugares. Narrador: 'Isso vai ser um problema.'", "Dia de TNT. O Subaru tem 5 lugares. Fabricio: 'Isso vai ser um problema.'"],
  // Mini-cenas e eventos reais das escolhas
  ['O Fabricio encara o vidro embaçado do Subaru em silêncio cinematográfico.', 'Eu fiquei encarando o vidro embaçado do Subaru em silêncio cinematográfico.'],
  ['Ao fundo, o Fabricio já está beijando a Marilis Docinho e dando joinha.', 'Ao fundo, eu já tava beijando a Marilis Docinho e dando joinha.'],
  ['O Fabricio já está lá dentro na fila do bar.', 'Eu já tava lá dentro na fila do bar.'],
  ["O Fabricio chama no Discord: 'mano, bora fazer uma música zoando o Vitor'.", "Aí eu te chamei no Discord: 'mano, bora fazer uma música zoando o Vitor'."],
  ['Silêncio absoluto. O Fabricio cobre o rosto. O Discord explode rindo da inocência do Luis.', 'Silêncio absoluto. Eu cubro o rosto. O Discord explode rindo da inocência do Luis.'],
  ['O Fabricio fala da Rayssa pelo resto da viagem inteira.', 'E eu falei da Rayssa pelo resto da viagem inteira.'],
  ['O Fabricio puxa o freio de mão e começa o drift dos sonhos.', 'Aí eu puxo o freio de mão e começa o drift dos sonhos.'],
  ['O Fabricio passa a achar que a Tutuluiza quer ficar com ele e se arruma demais todo rolê.', 'E eu passei a achar que a Tutuluiza queria ficar comigo e me arrumava demais todo rolê.'],
  ['A Lara puxa o Fabricio e começa a Operação Ponto Cego.', 'A Lara me puxa e começa a Operação Ponto Cego.'],
  ["Ela solta um 'oi' sem olhar e puxa o Fabricio. Luis fica com a mão no ar.", "Ela solta um 'oi' sem olhar e me puxa. O Luis fica com a mão no ar."],
  ['O Luis sai da casa da Luiza pra dar carona pro Fabricio, enquanto a Caliandra grita da porta.', 'O Luis sai da casa da Luiza pra me dar carona, enquanto a Caliandra grita da porta.'],
  ['Eles chegam na balada K-pop de qualquer jeito.', 'A gente chega na balada K-pop de qualquer jeito.'],
  ["Ele vai com a roupa que dá tempo porque o Fabricio já está gritando 'cheguei' há 10 minutos.", "Ele vai com a roupa que dá tempo porque eu já tava gritando 'cheguei' há 10 minutos."]
];
const usadas = new Set();
function trocar(s) {
  for (const [a, b] of TROCAS) if (s === a || s === b) { usadas.add(b); return b; }
  return s;
}
for (const c of dial.capitulos) {
  c.eventos.forEach((e) => {
    if (e.fala) e.fala = trocar(e.fala);
    if (e.texto) e.texto = trocar(e.texto);
  });
  if (c.cliffhanger) c.cliffhanger = trocar(c.cliffhanger);
}
for (const e of Object.values(esc.escolhas)) {
  if (e.eventoReal) e.eventoReal = trocar(e.eventoReal);
  e.opcoes.forEach((o) => (o.miniCena || []).forEach((l) => (l.fala = trocar(l.fala))));
}

// ---------------------------------------------------------------- 2. Regra do Discord
// Fabricio ao lado do Luis -> comentário presencial (adendo). Fabricio longe -> Discord.
const viraAdendo = [
  [1, 'E eu aparecendo aí no fundo sem nem saber que ia virar o melhor amigo desse cara kkkk'],
  [2, 'E assim nasceu a dupla dinâmica. Melhor fase da quarentena kkkk'],
  [3, 'CONTA LOGO MANO! Até hoje ele não fala nem pra mim!'],
  [14, 'PLOT TWIST!! EU PROTEGI OS SENTIMENTOS DE QUEM QUERIA MEU AMIGO O TEMPO TODO KKKKKK']
];
viraAdendo.forEach(([cid, fala]) => {
  const ev = cap(cid).eventos.find((e) => e.fala === fala);
  if (ev) {
    ev.tipo = 'dialogo';
    ev.quem = 'narrador';
    ev.expr = 'feliz';
  }
});
// Pandemia: o Fabricio estava em casa, na call
const evDaw = cap(2).eventos.find((e) => e.quem === 'fabricio' && /abre a DAW/.test(e.fala || ''));
if (evDaw) evDaw.tipo = 'discord';
esc.escolhas.c2_tema_musica.opcoes.forEach((o) => (o.miniCena || []).forEach((l) => {
  if (l.quem === 'fabricio' || l.quem === 'mateus_buse') l.canal = 'discord';
}));

// ---------------------------------------------------------------- 3. Trocas de cena
// cena: { tipo: 'cena', cenario, opts?, elenco? (id -> assento), legenda? }
function inserirAntes(cid, predicado, evento) {
  const c = cap(cid);
  if (c.eventos.some((e) => e.tipo === 'cena' && e.legenda === evento.legenda && e.cenario === evento.cenario)) return;
  const i = c.eventos.findIndex(predicado);
  if (i < 0) throw new Error(`Ponto de inserção não encontrado no cap. ${cid}: ${evento.legenda}`);
  c.eventos.splice(i, 0, { tipo: 'cena', ...evento });
}
const falaComeca = (txt) => (e) => typeof e.fala === 'string' && e.fala.startsWith(txt);
const textoComeca = (txt) => (e) => typeof e.texto === 'string' && e.texto.startsWith(txt);
const escolha = (id) => (e) => e.escolhaId === id;
const minigame = (id) => (e) => e.minigameId === id;

inserirAntes(1, falaComeca('Bora tirar um X1 de basquete'), { cenario: 'quadra', legenda: 'Quadra do colégio · fim da aula' });
inserirAntes(2, falaComeca('*ajoelhando na chuva*'), { cenario: 'centro_noite', legenda: 'Enquanto isso, na casa do Vitor...' });
inserirAntes(2, falaComeca('E assim nasceu a dupla dinâmica'), { cenario: 'quarto_estudio', legenda: 'De volta ao quarto' });
inserirAntes(4, textoComeca('CENSURADO'), { cenario: 'subaru_fora', legenda: 'Estacionamento da academia' });
inserirAntes(4, falaComeca('Dia seguinte.'), { cenario: 'quarto_estudio', opts: { dia: true }, legenda: 'Dia seguinte' });
inserirAntes(5, falaComeca('Todo mundo vai pro apartamento da Luiza'), { cenario: 'apartamento', legenda: 'Apartamento da Luiza' });
inserirAntes(6, escolha('c6_sair_apartamento'), { cenario: 'apartamento', legenda: 'Apartamento da Luiza · 3h da manhã' });
inserirAntes(6, escolha('c6_carro_pessoa_ruim'), { cenario: 'subaru_noite', elenco: { luis: 'L', fabricio: 'R' }, legenda: 'No Subaru, a caminho do Centro' });
inserirAntes(6, falaComeca('Balada K-Pop.'), { cenario: 'balada', opts: { kpop: true }, legenda: 'Balada K-Pop' });
inserirAntes(6, escolha('c6_praca_agora'), { cenario: 'centro_noite', opts: { garoa: false }, legenda: 'Praça no Centro · 3h' });
inserirAntes(7, minigame('praca_alimentacao'), { cenario: 'shopping', legenda: 'Shopping · primeiro encontro' });
inserirAntes(7, textoComeca('Na casa dela'), { cenario: 'apartamento', legenda: 'Apartamento da Luiza' });
inserirAntes(9, falaComeca("No cinema assistindo 'Nora'"), { cenario: 'cinema', legenda: "Cinema · filme 'Nora'" });
inserirAntes(10, minigame('direcao_bacacheri'), { cenario: 'subaru_noite', opts: { dia: true }, elenco: { luis: 'L', fabricio: 'R' }, legenda: 'Bacacheri → Centro' });
inserirAntes(10, falaComeca('Olha aí o Tico e o Teco'), { cenario: 'emily_doces', legenda: 'Emily Doces' });
inserirAntes(11, falaComeca('*acorda abraçado no travesseiro'), { cenario: 'quarto_estudio', legenda: 'Quarto do Luis · de manhã' });
inserirAntes(12, textoComeca('A mãe da Eloiza chega em casa'), { cenario: 'apartamento', legenda: 'Casa da Eloiza' });
inserirAntes(13, falaComeca('No Subaru: o Luis'), { cenario: 'subaru_noite', elenco: { luis: 'L', eloiza: 'R', fabricio: 'TL', matheus_neuman: 'TR', yohana: 'FORA' }, legenda: 'No Subaru · dia de TNT' });
inserirAntes(13, falaComeca('Mais tarde, no galpão underground'), { cenario: 'galpao', legenda: 'Galpão underground' });
inserirAntes(14, minigame('lembra_quando'), { cenario: 'balada', legenda: 'Yard' });
inserirAntes(14, textoComeca('Depois do primeiro tempo'), { cenario: 'subaru_noite', elenco: { luis: 'L' }, opts: { parado: true }, legenda: 'Sozinho no Subaru' });

// Cenário inicial de cada capítulo (antes do primeiro evento), com elenco quando é dentro do carro
const INICIAL = {
  0: { cenario: 'cozinha', legenda: 'Ontem · Cozinha do Luis' },
  1: { cenario: 'sala_aula' },
  2: { cenario: 'quarto_estudio' },
  3: { cenario: 'corredor' },
  4: { cenario: 'academia' },
  5: { cenario: 'bec_bar' },
  7: { cenario: 'quarto_estudio' },
  8: { cenario: 'sad_baile' },
  9: { cenario: 'cafe' },
  11: { cenario: 'subaru_sonho', elenco: { fabricio: 'L', luis: 'TL', sol: 'TC' } },
  12: { cenario: 'academia', opts: { gotica: true } },
  14: { cenario: 'centro_noite', opts: { garoa: false, yard: true } },
  15: { cenario: 'cozinha', opts: { amanhecer: true } }
};
for (const [cid, ini] of Object.entries(INICIAL)) {
  const c = cap(Number(cid));
  if (c.eventos[0]?.tipo === 'cena' && c.eventos[0].inicial) continue;
  c.eventos.unshift({ tipo: 'cena', inicial: true, ...ini });
}

fs.writeFileSync(pDial, JSON.stringify(dial, null, 2) + '\n');
fs.writeFileSync(pEsc, JSON.stringify(esc, null, 2) + '\n');
const cenas = dial.capitulos.reduce((n, c) => n + c.eventos.filter((e) => e.tipo === 'cena').length, 0);
TROCAS.filter(([, b]) => !usadas.has(b)).forEach(([a]) => console.warn("Troca não aplicada:", a.slice(0, 80)));
console.log(`Roteiro reformulado: ${cenas} cenas, ${TROCAS.length} adaptações de 1ª pessoa, ${viraAdendo.length} comentários presenciais.`);
