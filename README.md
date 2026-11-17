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

## Trilha sonora (LuiggiCloud)

A trilha do jogo é o **LuiggiCloud**, um mini player no estilo SoundCloud (canto superior esquerdo; clique na capa para abrir o painel). Ele toca as músicas de `assets/Musicas mp3/`, separadas por artista, e continua tocando entre os capítulos.

- **🚗 Modo Trilha (som de carro):** liga e desliga no botão 🚗 do player ou em Configurações. Deixa a música abafada (passa-alta + passa-baixa), comprimida, quase mono, com ambiência curta de cabine e mais baixa enquanto alguém fala, para não competir com o texto.
- O volume de cada faixa é normalizado (medido com o ffmpeg), então nenhuma música estoura mais que as outras.
- O player pausa sozinho nos minigames com música própria (LuiggiBeats Hero, FL Estúdio, Passinho Sad, Soundboard).
- O botão de rádio do Subaru, no Safepoint, pula para a próxima faixa.

### Adicionar ou trocar músicas

1. Coloque os arquivos em `assets/Musicas mp3/<Pasta do artista>/` (`.mp3`, `.m4a`, `.wav` ou `.ogg`).
2. Se for um artista novo, cadastre a pasta em `PASTAS` e o artista em `ARTISTAS`, no topo de `ferramentas/gerar_trilha_sonora.js`. Uma imagem `capa` na pasta vira a capa do álbum.
3. Rode:
   ```bash
   node ferramentas/gerar_trilha_sonora.js
   node ferramentas/empacotar_dados.js
   ```
   Com o ffmpeg instalado, o script calcula duração, forma de onda e volume de cada faixa.
4. Para corrigir um título à mão, edite a faixa em `data/musicas.json` e mude `"aConfirmar"` para `false`. Assim a próxima geração preserva a sua edição.

As mesmas músicas aparecem no **LuiggiBeats Hero** e na Jukebox do Museu.

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
