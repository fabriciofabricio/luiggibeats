# Plano de Remake 3D — LuiggiBeats: O Destino Já Foi Escrito

Plano de melhoria completa do jogo: gráficos novos, cenas de história em 3D e todos os minigames refeitos, mantendo o roteiro e os personagens exatamente como estão.

**Status:** plano aguardando aprovação. Nenhum arquivo do jogo foi alterado ainda.

---

## 1. Como o jogo está hoje

- **História:** prólogo + 15 capítulos em `data/dialogos.json`, escolhas em `data/escolhas.json`, 32 personagens em `data/personagens.json`.
- **Cenas de diálogo:** 100% 2D. Uma foto de fundo com dois sprites por cima.
- **Minigames:** 37 no total.
  - 6 motores grandes (cookies, ritmo, FL Estúdio, direção, furtividade, luta) já usam um pouco de Three.js.
  - 19 minigames rápidos são retângulos e círculos num canvas 2D, ou só botões HTML.
- **Safepoint (Subaru):** montado com HTML e CSS, sem profundidade.
- **Phaser:** carrega cerca de 1 MB só para desenhar 24 bolinhas flutuando no fundo.

## 2. O que não muda

- **Roteiro.** Falas, escolhas, convergências, os três finais, conquistas e as conversas no Safepoint ficam idênticos. Os textos dos JSONs não são editados.
- **Personagens.** Mesmos sprites cartoon, mesmas fotos, mesma ficha visual.
- **Piadas de roteiro dentro dos minigames.** O Mateus Buse abre o cadeado em 2 segundos, o autocorretor sabota a mensagem, o botão "Pular Créditos" foge, "FABRICIO, VOCÊ SABE O QUE FAZ", a Pietra chamando famoso pelo primeiro nome.
- **Compatibilidade.** O save atual continua valendo, assim como os IDs dos minigames, os recordes e as conquistas. O jogo continua abrindo sem build, direto pelo `index.html`.
- **Ferramentas e fluxo de edição.** Os scripts em `ferramentas/` e a forma de adicionar MP3s, personagens e charts continuam funcionando.

## 3. Limites

- **Todo o 3D será gerado por código:** geometria, shaders e texturas procedurais. Não há modelagem em Blender nem geração de imagens novas. O visual será estilizado (low-poly / cel-shaded com boa iluminação), não fotorrealista.
- **É uma reescrita grande**, perto de 9 mil linhas de código. Será feita em fases, com o jogo jogável ao final de cada uma.

---

## 4. Fases

### Fase 0 — Segurança e base

- [ ] Criar repositório git e fazer commit do estado atual, para tudo ser reversível.
- [ ] Baixar o Three.js para uma pasta local (`vendor/`), para o jogo rodar offline.
- [ ] Remover o Phaser e substituir o fundo de partículas por uma camada do próprio motor 3D.

### Fase 1 — Motor gráfico novo

Reescrita de `src/engine/Minigame3DEngine.js`, que passa a servir tanto as cenas de história quanto os minigames.

- [ ] Pós-processamento próprio: bloom, vinheta, granulação e correção de cor por capítulo.
- [ ] Sombras suaves, neblina e materiais cel-shaded com contorno.
- [ ] Sistema de partículas: farinha, chuva, fumaça, confete, faíscas, poeira de luz.
- [ ] Subaru Legacy e Civic remodelados com mais detalhe (carroceria, rodas, faróis, interior).
- [ ] Ajuste automático de qualidade para computadores mais fracos.
- [ ] Laço de animação único, com limpeza correta de memória ao fechar cada cena.

Biblioteca de cenários 3D reutilizáveis:

| Cenário | Usado em |
|---|---|
| Cozinha do Luis | Prólogo, Cap. 15 |
| Sala de aula e corredor do colégio | Cap. 1, Cap. 3, flashbacks do Cap. 14 |
| Quadra do colégio | Cap. 1 |
| Quarto-estúdio (pandemia) | Cap. 2 |
| Academia | Cap. 4, Cap. 12 |
| Bec Bar | Cap. 5 |
| Rua do Centro às 3h | Cap. 6 |
| Shopping e apartamento da Luiza | Cap. 7 |
| Sad Baile | Cap. 8 |
| Asterisco Café e cinema | Cap. 9 |
| Emily Doces e garagem | Cap. 10 |
| Plano dos sonhos | Cap. 11 |
| Galpão underground do TNT | Cap. 13 |
| Yard e James | Cap. 14 |
| Interior do Subaru no Safepoint | entre todos os capítulos |
| Ruas de Curitiba (direção) | Cap. 6, Cap. 10, final |

### Fase 2 — Cenas de história em 3D

- [ ] Cada capítulo ganha um cenário 3D vivo atrás do diálogo, com luz e clima próprios.
- [ ] Câmera cinematográfica: close, plano aberto, inclinação nos sustos e travelling suave quando troca quem fala. Substitui as classes `cam-*` de CSS atuais.
- [ ] Os personagens continuam sendo os sprites atuais, posicionados dentro do cenário 3D com sombra no chão e luz ambiente.
- [ ] As fotos reais dos lugares continuam aparecendo, como telão de fundo ou transição de entrada do capítulo.
- [ ] Efeitos de convergência (VHS, vinil, glitch, risco à caneta) refeitos como efeitos de tela cheia do motor.
- [ ] Safepoint vira um interior 3D do Subaru em primeira pessoa: volante, painel aceso, retrovisor, Fabricio no banco do passageiro e a cidade pelo para-brisa. Volante, rádio, retrovisor e porta-luvas continuam clicáveis.
- [ ] A volta para casa no final vira uma cena 3D dirigindo ao amanhecer.
- [ ] O gato da Luiza continua escondido nos capítulos 7 a 15, agora dentro do cenário 3D.

### Fase 3 — Minigames

Todos refeitos, com a mesma função na história e o mesmo resultado para o save e as conquistas.

| Cap. | Minigame | Como fica |
|---|---|---|
| 0, 15 | Fábrica de Cookies | Cozinha 3D completa: farinha em partículas, massa deformando, gotas de chocolate, forno com brilho e ponto de assar visível |
| 1 | Ajude o Vitor | Continua sendo escolha de diálogo, encenada no corredor 3D |
| 1 | Puzzle do Armário | Armário e cadeado 3D com discos giratórios |
| 1 | Basquete com a Maria Clara | Quadra 3D, mira com arco previsto, física real de bola, aro e tabela |
| 2 | FL Estúdio | Interface polida, com quarto-estúdio 3D reagindo ao beat |
| 2 | LuiggiBeats Hero | Pista 3D em perspectiva, notas com brilho, palco reativo à música |
| 3 | Autocorretor Traidor | Celular 3D na mão, com teclado e balões animados |
| 3 | Não Olha Pra Porta | Sala 3D em primeira pessoa; o mouse controla o olhar |
| 4 | Treino na Academia | Academia 3D, supino animado com timing |
| 4 | Fuga das Notificações | Notificações voando em 3D para arrastar e arquivar |
| 5 | Medidor de Dilema | Bec Bar 3D, Fabricio equilibrado entre Agatha e Caliandra |
| 5 | Conversa com a Luiza | Cena 3D na mesa do bar, com reações e barra de química animada |
| 6 | Direção na Madrugada | Curitiba 3D às 3h: prédios, postes, neblina, reflexos no asfalto |
| 6 | Segurando Vela | Rua 3D em terceira pessoa; a chama da vela é o medidor |
| 6 | Sobrevivência: Centro 3h | Visão isométrica 3D com lanterna de verdade e medidor de medo |
| 7 | Conversa por Mensagem | Celular 3D com o timing da resposta visível |
| 7 | Praça de Alimentação | Corrida 3D com bandeja física e obstáculos |
| 8 | Grito no Bar | Bar 3D com caixas de som pulsando; a pausa na batida fica visível |
| 8 | Name Drop da Pietra | Quiz encenado na pista 3D |
| 8 | Passinho Sad | Pista de dança 3D, com a Rebeca se aproximando a cada combo |
| 8 | Esconde-Esconde no Baile | Furtividade isométrica 3D dentro do baile |
| 8 | Onde Está a Ruiva? | Multidão 3D sob estrobo; a câmera procura |
| 8 | Papo de Fim de Noite | Cena 3D na pista, com barra de química animada |
| 9 | Latte Art no TNT | Xícara 3D com leite pintado de verdade e nota por semelhança ao coração |
| 9 | Detector de Red Flags | Stories em 3D com bandeiras surgindo |
| 9 | Créditos Infinitos | Sala de cinema 3D com os créditos rolando na tela |
| 10 | Direção Bacacheri → Centro | Curitiba 3D de dia, com tráfego |
| 10 | Latte Art da Rayssa | Mesma mecânica nova do latte, no balcão do Emily Doces |
| 10 | Garagem: Mods do Subaru | Garagem 3D com o Subaru girando e os mods aparecendo no carro |
| 10 | Racha: Subaru x Civic | Corrida 3D noturna contra o Civic branco com neon |
| 11 | Beijo no Drift | Drift 3D de sonho: estrada flutuante, capivara voadora, flash do radar |
| 12 | Treino em Dupla | Academia 3D em versão gótica, Eloiza sincronizada ao lado |
| 12 | Detetive do Instagram | Celular 3D com o perfil navegável e as provas escondidas nele |
| 13 | X1: Eloiza vs Yohana | Arena 3D no galpão, lutadoras 3D, câmera dinâmica, efeitos de impacto |
| 14 | Lembra Quando? | Quiz na Yard com flashbacks 3D das cenas da escola |
| 14 | Operação Ponto Cego | Furtividade isométrica 3D na balada, com cones de visão |
| 15 | Soundboard do Discord | Mesa de som 3D com a call reagindo |

### Fase 4 — Interface e som

- [ ] Menu principal com o Subaru 3D girando no Safepoint.
- [ ] Transições entre cenas (fade, corte com título do capítulo).
- [ ] Caixa de diálogo, cartas de escolha, relatório da realidade e HUD redesenhados.
- [ ] Museu das Memórias com visual novo.
- [ ] Seletor de capítulos e configurações redesenhados, com opção de qualidade gráfica.
- [ ] Trilha sintetizada mais rica por estilo (lofi, trap, sad, sonho, gótico, underground).
- [ ] Sons novos de impacto, ambiente e interface.

### Fase 5 — Testes

- [ ] Rodar o jogo num servidor local.
- [ ] Abrir cada capítulo e cada minigame no navegador em modo automático, com screenshot de cada um.
- [ ] Conferir que não há erros no console.
- [ ] Jogar a história do prólogo ao final nos três finais.
- [ ] Conferir que um save antigo continua carregando.
- [ ] Atualizar o `README.md` com o que mudou.

---

## 5. Ordem de execução

1. Fase 0 (segurança e base).
2. Fase 1 (motor gráfico).
3. Fase 2 (cenas de história e Safepoint).
4. Fase 3 (minigames, na ordem dos capítulos).
5. Fase 4 (interface e som).
6. Fase 5 (testes finais). Cada fase também é testada antes de passar para a seguinte.

## 6. Decisões pendentes

### 6.1 Personagens nos minigames de ação

Vale para luta, furtividade, basquete e dança. Nos diálogos, os sprites atuais ficam de qualquer jeito.

- **Opção A (recomendada):** bonecos 3D estilizados gerados a partir da ficha visual de cada personagem (tom de pele, cabelo, roupa, óculos). Sprite parado não luta nem dança bem.
- **Opção B:** usar os sprites 2D atuais como "figuras de papel" dentro do cenário 3D. É mais fiel ao desenho e bem menos animado.

### 6.2 Ordem de entrega

- **Opção A (recomendada):** seguir a ordem da seção 5.
- **Opção B:** entregar primeiro o Prólogo e o Capítulo 1 completos, para aprovar o estilo visual antes de refazer o resto.
