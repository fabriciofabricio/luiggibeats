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

## Momento Resenha (bonecos 3D, rua, poses e celular)

No menu, **🎶 Momento Resenha** abre o Subaru Legacy azul parado na rua do Safepoint, com todo mundo em 3D:

- **Dois modos:** o **modo 3D** (o padrão, descrito abaixo) e o **🎴 modo clássico**, o antigo, que mostra só o pessoal dentro do carro (as cartas dos personagens) e troca de POV entre Luis, Fabricio e Mateus. O botão 🎴 Clássico / 🧍 Modo 3D, no topo, troca de um pro outro sem sair da sala online e sem parar a música, e o jogo lembra o último modo usado. Online dá pra misturar: quem está no clássico aparece sentado no banco do personagem dele pra quem está no 3D.
- **➕ Banco de trás:** o Mateus fica atrás do passageiro, e os outros dois lugares de trás (atrás do motorista e no meio) podem receber qualquer personagem do jogo (Sol, Emily, Eloiza, Lara, Yohana...), com 🎲 pra sortear. Os convidados aparecem nos dois modos, falam a frase marcante quando alguém clica neles e de vez em quando comentam sozinhos. Sozinho, a escolha fica salva no navegador; online, a sala inteira vê os mesmos convidados (quem manda é o anfitrião, e todo mundo pode pedir pra trocar).

- **Personagem:** os botões 🧢 Luis, 🎧 Fabricio e 🔇 Mateus Buse (ou as teclas 1, 2 e 3) trocam o seu boneco. Quem ninguém escolheu fica no carro como NPC, no banco de sempre (o Mateus sempre atrás do passageiro, se o lugar estiver livre).
- **Dentro do carro** você fica sentado e em primeira pessoa: o mouse mexe o olhar (e a cabeça do boneco, que os outros veem). O botão 🪑 troca de banco (5 lugares).
- **Descer e andar:** **F** (ou a maçaneta da porta) desce pela porta do banco. Na rua: **WASD**/setas andam, **Shift** corre, arrastar gira a câmera e a rodinha aproxima. No celular/tablet aparece um controle na tela. Perto do carro, **F** entra no banco livre mais próximo. Na rua dá pra 👋 acenar e 💃 dançar.
- **Dirigir o Subaru:** quem está no banco do motorista dirige pela rua (que é curva, como a de verdade) e pela transversal: **W** acelera, **S** freia e dá ré, **A/D** viram, **Espaço** é o freio de mão e **V** troca entre a visão do volante e a câmera de fora. O carro bate em muros, carros estacionados, postes, árvores e pessoas; os passageiros vão junto. Só dá pra descer com ele parado. **🅿️ Voltar pra vaga** estaciona o Subaru de novo em frente ao portão. Online, quem dirige manda a posição do carro pra todo mundo, e qualquer um pode pedir pra voltar pra vaga.
- **Modo pose (P):** sentado no carro, a câmera vai pra fora do seu boneco (teto e portas somem só pra você). Clique numa parte do corpo ou num pontinho e arraste: cabeça, pescoço, tronco, quadril, ombros, cotovelos, pulsos, coxas, joelhos e tornozelos. Tem ajuste fino (frente/trás, girar, de lado), poses prontas (mãos pro alto, braço na janela, paz e amor, rock, pensando, dormindo, esticadão), 🪞 espelhar e ↺ resetar. 🎶 *Curtir o som* faz o boneco balançar a cabeça no ritmo.
- **Celular (C):** cada pessoa tem um celular com o app LuiggiCloud pareado por Bluetooth com o rádio do Subaru: ⏮ ⏯ ⏭, escolher qualquer faixa (por artista), tocar na barra pra pular pra um ponto da música. Fora do carro o Bluetooth perde o sinal. O boneco segura o celular na mão (os outros veem).
- **Rádio do painel:** a central multimídia tem botões físicos ⏮ (volta direto pra faixa anterior), ⏯ e ⏭, além dos botões giratórios. Os mesmos comandos ficam na barra de baixo.
- O interior do Subaru foi refeito com bem mais detalhe (`src/engine/SubaruLegacy3D.js`): painel moldado, quadro de instrumentos, saídas de ar, pisca-alerta, ar-condicionado, volante com o logo das plêiades, câmbio, freio de mão, porta-copos, bancos com faixa azul, cintos, forros de porta, teto solar, quebra-sóis, retrovisor de verdade e a arvorezinha de baunilha. Por fora: lataria, faróis, grade com o emblema, aerofólio, escapamento duplo e rodas douradas. As cenas da história dentro do carro usam o mesmo interior.

## Momento Resenha Online (multiplayer)

No **Momento Resenha**, o botão **🌐 Online** deixa várias pessoas (até 8) na mesma resenha (5 dentro do Subaru, o resto na calçada):

- **Criar sala** gera um código de 5 letras e um link de convite (`?resenha=CODIGO`). Quem abre o link só digita o nome e clica em Entrar.
- Todo mundo vê o boneco de todo mundo: qual personagem é, em que banco sentou, andando na rua, a pose que montou, o celular na mão e para onde está olhando. Uma etiqueta com o nome aparece em cima de cada pessoa; clicar em alguém dá uma cutucada. Se duas pessoas sentarem no mesmo banco ao mesmo tempo, uma vai pro próximo lugar livre.
- Todo mundo controla o rádio (⏮ ⏯ ⏭, o rádio do painel e o celular). A tela avisa quem trocou a música e se foi pelo celular. A buzina, o volante, o porta-luvas e os Tic Tacs aparecem para todos.
- A conexão é híbrida e não precisa de servidor (funciona no GitHub Pages): direta P2P (WebRTC, via `vendor/trystero-nostr.min.js`, ⚡ na lista) quando a rede deixa, e pela rota reserva (📡) quando não deixa: mensagens criptografadas por relays Nostr públicos. Ninguém transmite áudio; cada jogo toca o próprio MP3 e só a faixa/posição é sincronizada. Um anfitrião é escolhido sozinho e, se ele sair, outro assume sem parar a música. Cada pessoa manda o próprio avatar (pela rota reserva, no máximo ~3 vezes por segundo).
- Todos precisam estar com a mesma versão do jogo (a lista mostra ⚠️ pra quem estiver com outra).
- Para jogar online, todos devem abrir o jogo pelo site. Servidores locais sem suporte a *Range* (como o `python -m http.server` do `INICIAR_JOGO.bat`) não deixam pular para o meio da música.
- Se quiser conexão direta até em redes muito restritas, dá pra cadastrar servidores TURN em `TURN_SERVIDORES`, no topo de `src/engine/ResenhaOnline.js`.

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
