# LUIGGIBEATS: O DESTINO JÁ FOI ESCRITO

Jogo web de aventura narrativa em 3D (HTML5 + Three.js + Web Audio API), em português do Brasil, sobre a vida real de **Luis Felipe (LuiggiBeats)** e seus amigos em Curitiba.

- Como a história é contada (Fabricio narrando, cenas, ritmo): [ROTEIRO_REFORMULADO.md](ROTEIRO_REFORMULADO.md)
- Plano técnico do remake 3D: [PLANO_REMAKE_3D.md](PLANO_REMAKE_3D.md)
- Laboratório para ver cenários e bonecos 3D: [laboratorio3d.html](laboratorio3d.html)

---

## Como rodar o jogo

0. **Mais fácil (Windows):** dê dois cliques em `INICIAR_JOGO.bat`. Ele sobe um servidor local e abre o jogo.

1. **Opção recomendada (servidor estático simples):**
   ```bash
   npx serve .
   ```
   ou com Python:
   ```bash
   python -m http.server 8080
   ```
   Depois abra `http://localhost:8080/index.html` (ou `http://localhost:8080/galeria_personagens.html`).

2. **Opção direta (`file://`):**
   Também é possível abrir [index.html](index.html) ou [galeria_personagens.html](galeria_personagens.html) diretamente no navegador graças aos bundles em `/data/*_bundle.js`. *(Observação: para decodificar MP3s locais via `fetch`, prefira usar um servidor estático como `npx serve .`.)*

---

## Como adicionar seus MP3s depois

1. Coloque seus arquivos `.mp3` dentro de `/assets/` (ou em `/assets/musicas/`).
   - Se houver a primeira música do Tiago, inclua `tiago` no nome do arquivo (ex.: `tiago_primeira_musica.mp3`).
2. Rode os scripts de atualização (sem dependências externas):
   ```bash
   node ferramentas/gerar_manifest.js
   node ferramentas/empacotar_dados.js
   ```
3. Abra `data/musicas.json` para conferir títulos, anos, descrições e o campo `"desbloqueiaNoCapitulo"`. Quando terminar de revisar uma faixa, mude `"aConfirmar": true` para `false` para que futuras execuções do script não a sobrescrevam.
4. Todas as músicas entram automaticamente no **LuiggiBeats Hero** (com geração automática de notas via `OfflineAudioContext`), na **Jukebox Rádio LuiggiBeats** e no **Rádio do Subaru**.

---

## Como editar conteúdo, personagens, textos e charts

- **Personagens e fichas visuais:** edite `data/personagens.json` e rode:
  ```bash
  node ferramentas/gerar_sprites.js
  node ferramentas/empacotar_dados.js
  ```
  Confira o resultado em `galeria_personagens.html`.
- **Diálogos e capítulos (Prólogo + 1 a 15):** edite `data/dialogos.json`. Falas do Fabricio comentando usam `"quem": "narrador"`; trocas de lugar usam eventos `cena` (veja ROTEIRO_REFORMULADO.md).
- **Sprites de meio corpo sem arte pintada (Emily, Eloiza):** `node ferramentas/gerar_busto_anime.js` gera os SVGs; para trocar por arte pintada, salve `assets/sprites/<id>/cartoon.png` (896x1200, fundo transparente).
- **Escolhas, mini-cenas e convergências:** edite `data/escolhas.json`.
- **Charts manuais do LuiggiBeats Hero:** salve um arquivo `/data/charts/<id-da-musica>.json` (ou use o **● Modo Gravação** escondido dentro do seletor do Hero para exportar o JSON no ritmo!).
- **Receitas de cookies e upgrades:** edite `data/receitas.json`.
- **Name drops da Pietra:** adicione novos itens em `data/namedrops.json`.
- **Conquistas, Museu e Mapa de Curitiba:** edite `data/conquistas.json`, `data/museu.json` e `data/mapa_curitiba.json`.
- Sempre que editar qualquer JSON de `/data/` e quiser manter o modo `file://` atualizado, rode `node ferramentas/empacotar_dados.js`.
