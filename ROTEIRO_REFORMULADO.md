# Roteiro Reformulado — LuiggiBeats: O Destino Já Foi Escrito

Este documento descreve como a história passou a ser **montada e apresentada** para ficar fluida. Ele não reescreve a história. As 95 falas dos capítulos, todas as escolhas, mini-cenas, piadas e referências continuam lá. O que mudou é a forma de contar: quem narra, onde cada cena acontece e como uma coisa passa para a outra.

A reformulação é aplicada nos dados por `ferramentas/reformular_roteiro.js`. O script é idempotente e pode rodar de novo sem duplicar nada.

---

## 1. O problema do formato antigo

O jogo alternava, sem respiro, entre quatro coisas diferentes:

1. Uma fala na caixa de diálogo.
2. Um "zoom" de câmera em quem falava.
3. Uma tela inteira com texto grande no meio: tela preta, tela azul falsa, "MAS NA VIDA REAL...", "REBOBINANDO FITA VHS", o banner "FELPS!!" e a abertura de capítulo com foto.
4. Um minigame que abria de repente.

Além disso, vários capítulos mudavam de lugar só no texto. O Cap. 6, por exemplo, vai do apartamento para o Subaru, depois para a balada K-Pop e depois para a praça no Centro, enquanto o cenário continuava o mesmo. A narração vinha de um "Narrador da Realidade" sem rosto, e o Fabricio aparecia "no Discord" mesmo estando do lado do Luis.

Resultado: muita informação rápida, muitos cortes e pouca sensação de lugar.

---

## 2. A espinha dorsal: Luis conta, Fabricio comenta

A moldura do jogo sempre foi esta: **Luis e Fabricio dentro do Subaru azul, no Safepoint, relembrando tudo em ordem cronológica.** A reformulação leva essa moldura para dentro dos capítulos:

- **O Luis conta a história.** O que aparece na tela é a memória dele.
- **O Fabricio é a voz de fora da memória.** Tudo que antes era "Narrador da Realidade" agora é o Fabricio comentando de dentro do Subaru. Na caixa de diálogo aparece **Fabricio · 🚙 comentando do Subaru**, com caixa azul e texto em itálico.
- **As piadas de tela inteira viram comentário do Fabricio.** A tela preta do banheiro, a tela azul `LUIS_SEM_COOKIES.SYS`, o "MAS NA VIDA REAL...", a fita VHS, o glitch e a escolha "riscada à caneta" são ditos por ele, sem tirar o jogador da cena. O efeito visual fica só como um leve filtro sobre o 3D (VHS, sépia, aberração).

### Convergências (quando a escolha não muda nada)

O jogador escolhe, assiste à mini-cena da "realidade alternativa", e o Fabricio corrige com a frase que antes ocupava a tela inteira:

| Tipo | O Fabricio diz, antes do evento real |
|---|---|
| VHS | "◀◀ Rebobina essa fita aí." |
| Vinil | "Mas na vida real..." |
| Discord | "Mano, não foi isso que aconteceu kkkk." |
| Glitch | "Realidade restaurada." |
| Riscado | "Risca essa escolha aí, foi à caneta." |
| Narrador / Forçado | "Você realmente achou que ia funcionar?" |

### Ajustes de 1ª pessoa (23 frases)

Quando o narrador citava o Fabricio em 3ª pessoa, a frase passou para 1ª pessoa, porque agora é ele quem fala. O conteúdo e a piada não mudam. Exemplos:

- Cap. 5: "...ex-ficante **do Fabricio**... Detalhe: **o Fabricio** já está ficando com a Agatha." → "...**minha** ex-ficante... Detalhe: **eu** já tava ficando com a Agatha."
- Cap. 13: "Luis perdeu a paz, **Fabricio perdeu o rolê**..." → "O Luis perdeu a paz, **eu perdi o rolê**..."
- Cap. 15: "Se fosse **o Fabricio** vivendo isso, o que você diria **pra ele**?" → "Se fosse **eu** vivendo isso, o que você diria **pra mim**?"
- Ganchos dos Caps. 6 e 12: "Narrador: '...'" → "Fabricio: '...'"

A lista completa está em `TROCAS`, dentro de `ferramentas/reformular_roteiro.js`.

---

## 3. Regra do Discord

**O Fabricio só aparece no Discord quando não está do lado do Luis.**

| Momento | Antes | Agora |
|---|---|---|
| Prólogo (cookies, ontem) | Discord | **Discord** (ele estava em casa, na call) |
| Cap. 1: "E eu aparecendo aí no fundo..." | Discord | Comentário do Fabricio |
| Cap. 2: "Mano, abre a DAW aí!" | Fala presencial | **Discord** (pandemia: cada um na sua casa) |
| Cap. 2: escolha do tema da música | Fala presencial | **Discord** (Fabricio e Mateus na call) |
| Cap. 2: "E assim nasceu a dupla dinâmica..." | Discord | Comentário do Fabricio |
| Cap. 3: "CONTA LOGO MANO!" | Discord | Comentário do Fabricio |
| Cap. 11: mensagens depois de acordar do sonho | Discord | **Discord** (Luis manda mensagem de casa) |
| Cap. 14: "PLOT TWIST!!" | Discord | Comentário do Fabricio (ele estava na James) |
| Final "Próximo Capítulo" | Discord | **Discord** (Luis em casa) |

As mensagens do **Mateus Buse** continuam no Discord (é a piada dele: sempre mutado na call). Ele está na call **ouvindo o Luis contar a história**, então comenta em todos os capítulos como quem reage no presente. No Cap. 1 ele aparece **em pessoa** no fundão (na escola ainda não existia botão de mutar), zoando o Vitor e o Luis; no final ele desmuta pela primeira vez. As falas novas estão em `ferramentas/mais_mateus.py` (idempotente). Mensagens de Discord e WhatsApp aparecem como mensagens, com o selo do app, e **não** colocam a pessoa dentro da cena.

---

## 4. Cenas: cada lugar é um lugar de verdade

Cada mudança de lugar dentro de um capítulo agora é um evento `cena`. Ele troca o cenário 3D com um fade curto e mostra uma **legenda discreta no canto** ("Balada K-Pop", "Praça no Centro · 3h"). No primeiro lugar do capítulo, a legenda traz o título do capítulo. A abertura em tela cheia com foto foi removida.

Nas cenas dentro do Subaru, o **elenco é fixo nos assentos** (motorista, passageiro e banco de trás) e se move junto com o carro.

| Cap. | Sequência de lugares |
|---|---|
| Prólogo | Cozinha do Luis (Fabricio e Mateus no Discord) |
| 1 | Sala de aula → **Quadra** (X1 com a Maria Clara) |
| 2 | Quarto-estúdio → **casa do Vitor, na chuva** (ele ajoelhando) → quarto |
| 3 | Corredor da faculdade |
| 4 | Academia → **Subaru estacionado, balançando, vidros embaçados** → quarto, no dia seguinte |
| 5 | Bec Bar → **apartamento da Luiza** |
| 6 | Apartamento da Luiza (3h) → **dentro do Subaru** (Luis dirigindo, Fabricio no passageiro) → **balada K-Pop** → **praça no Centro** |
| 7 | Quarto (mensagens) → **shopping** → **apartamento da Luiza** (o gato) |
| 8 | Sad Baile |
| 9 | Asterisco Café → **cinema ("Nora")** |
| 10 | **Dentro do Subaru**, de dia (Bacacheri) → **Emily Doces** |
| 11 | **Dentro do Subaru, no céu dos sonhos** (Fabricio dirigindo, Luis e Sol no banco de trás) → quarto do Luis, de manhã |
| 12 | Academia (era gótica) → **casa da Eloiza** (a mãe chegando) |
| 13 | **Dentro do Subaru** (Luis, Eloiza, Fabricio, Matheus Neuman; Yohana na calçada) → galpão underground |
| 14 | Rua Prudente de Moraes, na frente da Yard → **Yard/James** → **sozinho no Subaru**, música calma |
| 15 | Cozinha do Luis, amanhecer (o presente) |

### Cenas especiais

O texto de cada cena especial é dito pelo Fabricio. O 3D só reforça:

- **Cap. 4, Subaru balançando:** o carro estacionado balança com os vidros embaçados.
- **Cap. 7, o gato viu tudo:** o gato da Luiza aparece na frente da câmera, encarando.
- **Cap. 8, cards do Sad Baile:** as luzes da balada acendem.
- **Cap. 12, "vou parar com isso" em loop:** efeito de fita repetindo.
- **Cap. 14, momento honesto:** a cena escurece devagar, só o Luis no Subaru.
- **Cap. 15, virada final:** as cores esfriam quando o forno desliga.

---

## 5. Ritmo: regras de apresentação

1. **Nenhum texto em tela cheia durante a história.** A única exceção são os créditos finais.
2. **Câmera calma.** Sem zoom em close nem câmera inclinada. A câmera só se inclina de leve para quem fala e respira devagar. Tremor só em momentos pontuais (o "FELPS!!" da Cecília).
3. **Sem emojis flutuando** sobre as cabeças e sem banner "FELPS!!" gigante.
4. **Avançar é fácil:** clique em qualquer lugar da cena, Espaço ou Enter. O primeiro clique completa o texto; o segundo avança.
5. **Escolhas sem tempo.** O cronômetro foi removido. As opções aparecem sobre a cena, sem escurecer a tela toda; só a escolha final do jogo ganha destaque central.
6. **Minigames com transição:** fade para preto ao entrar e ao sair, em vez de um modal que pula na tela.
7. **Conquistas no canto superior direito,** compactas e por 4 segundos. Nunca cobrem o botão de continuar.
8. **Barra superior escondida** durante a história. Ela aparece quando o mouse chega no topo da tela.
9. **Fim de capítulo:** o "Relatório da Realidade" virou um cartão compacto **by Fabricio**, com as mesmas piadas ("Escolhas que mudaram o destino: 0", "87% dos jogadores...") e o gancho do próximo capítulo.
10. **Safepoint:** a conversa entre capítulos acontece dentro do Subaru, com a **foto real do Safepoint** vista pelo para-brisa, em 2.5D.

---

## 6. Personagens

- **Eloiza e Sol estavam com os visuais trocados.** A arte gótica (blusa branca de babados, cabelo hime, piercing no septo, terço) corresponde à foto da pasta `assets/Sol/` e agora é a **Sol**. A **Eloiza** ganhou um visual novo, baseado na foto da pasta `assets/Eloiza/`: cabelo longo escuro com franja reta, delineado gatinho, gloss rosa, choker e top preto.
- **Emily Doces** ganhou um sprite de meio corpo no mesmo enquadramento e estilo webtoon dos outros personagens principais.
- As novas artes (Emily e Eloiza) são vetoriais, geradas por `ferramentas/gerar_busto_anime.js`. Se você gerar artes pintadas como as originais, basta salvar em `assets/sprites/<id>/cartoon.png` (fundo transparente, 896×1200) para substituí-las.

---

## 7. O que não mudou

- Todas as falas, escolhas, opções, mini-cenas, eventos reais, ganchos e créditos.
- As referências: "felps", "Por que você fez isso?", "Fabricio, você sabe o que faz", Tico e Teco / Lé e Cré, "vou parar com isso", "é... verdade", pós-créditos de "Nora", capivara voadora, CNH de giz de cera, LUIS_SEM_COOKIES.SYS, 47 fornadas, o gato da Luiza e o Mateus mutado.
- As conquistas, os contadores e o save.
- A escolha final (Voltar / Terminar / Ainda não sei) e os três finais.

---

## 8. Como editar daqui pra frente

- **Falas:** `data/dialogos.json` e `data/escolhas.json`. Fala do Fabricio comentando = `"quem": "narrador"`.
- **Nova troca de lugar:** um evento `{ "tipo": "cena", "cenario": "...", "legenda": "...", "elenco": { "luis": "L", ... } }`.
  - Cenários: `cozinha`, `sala_aula`, `quadra`, `corredor`, `quarto_estudio`, `academia`, `bec_bar`, `apartamento`, `centro_noite`, `shopping`, `sad_baile`, `cafe`, `cinema`, `emily_doces`, `garagem`, `galpao`, `balada`, `safepoint`, `subaru_noite`, `subaru_sonho`, `subaru_fora`.
  - Assentos no Subaru: `L` (motorista), `R` (passageiro), `TL`, `TC`, `TR` (banco de trás) e `FORA` (calçada).
- Depois de editar, rode `node ferramentas/empacotar_dados.js` para atualizar o modo `file://`.
