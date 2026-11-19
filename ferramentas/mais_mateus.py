"""Mateus Buse mais presente na história (pedido do Fabricio, 19/11/2026).

- Cap. 1 (escola): o Mateus aparece EM PESSOA, com diálogos engraçados com o Vitor Witiuk e o Luis.
  Na escola ainda não existia o botão de mutar, então ele fala de verdade.
- Demais capítulos: o Mateus está na call do Discord ouvindo o Luis contar a história. As mensagens dele são
  reações do presente (ele continua mutado e digita no chat).
- Cap. 15: ele desmuta pela primeira vez no jogo.

Idempotente: cada inserção só entra se a fala ainda não estiver no capítulo.
Uso: python ferramentas/mais_mateus.py  (depois: node ferramentas/empacotar_dados.js)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P_DIAL = ROOT / "data" / "dialogos.json"
P_ESC = ROOT / "data" / "escolhas.json"

dial = json.loads(P_DIAL.read_text(encoding="utf-8"))
esc = json.loads(P_ESC.read_text(encoding="utf-8"))


def d(quem, expr, fala):
    return {"tipo": "dialogo", "quem": quem, "expr": expr, "fala": fala}


def disc(fala, quem="mateus_buse"):
    return {"tipo": "discord", "quem": quem, "fala": fala}


def cap(cid):
    return next(c for c in dial["capitulos"] if c["id"] == cid)


def acha(c, alvo):
    """Índice do evento-âncora: trecho da fala/texto, ou id de escolha/minigame."""
    for i, e in enumerate(c["eventos"]):
        if alvo in (e.get("escolhaId"), e.get("minigameId")):
            return i
        if alvo in (e.get("fala") or "") or alvo in (e.get("texto") or ""):
            return i
    raise SystemExit(f"âncora não achada no cap. {c['id']}: {alvo!r}")


def inserir(cid, ancora, eventos, antes=False):
    c = cap(cid)
    falas = {e.get("fala") for e in c["eventos"]}
    novos = [e for e in eventos if e["fala"] not in falas]
    if not novos:
        return 0
    i = acha(c, ancora) + (0 if antes else 1)
    c["eventos"][i:i] = novos
    return len(novos)


n = 0

# ---------------------------------------------------------------- Prólogo: ele está na call
n += inserir(0, "fabrica_cookies", [
    disc("(continua mutado, digitando) análise técnica pela câmera: crocância periférica 8, centro macio 9,5."),
])
n += inserir(0, "Cada fornada assa uma memória", [
    disc("pera. se vai ter história do fundão eu fico na call. eu tava lá. eu lembro de TUDO."),
])

# ---------------------------------------------------------------- Cap. 1: o Mateus em pessoa na escola
n += inserir(1, "Bem-vindo ao Fundão", [
    d("mateus_buse", "feliz", "Luis, guardei teu lugar no fundão. Taxa de um cookie, como sempre."),
    d("luis", "neutro", "Mateus, você já comeu três cookies meus hoje."),
    d("mateus_buse", "neutro", "Juros compostos, mano. Estudei no intervalo."),
    d("narrador", "feliz", "Detalhe: na escola o Mateus ainda falava. O botão de mutar só entrou na vida dele em 2020."),
])
c1 = cap(1)
i_felps = next(i for i, e in enumerate(c1["eventos"]) if e["tipo"] == "felps")
n += inserir(1, c1["eventos"][i_felps]["fala"], [
    d("vitor_witiuk", "chocado", "Por que a Cecília só grita FELPS? Ninguém nunca gritou VITOR nesse colégio."),
    d("mateus_buse", "neutro", "Pra alguém gritar teu nome, Vitor, primeiro alguém precisa saber teu nome."),
    d("vitor_witiuk", "bravo", "POR QUÊÊÊ?!"),
    d("luis", "envergonhado", "Relaxa, Vitor. Ela te chama de 'o amigo do Felps'. Já é alguma coisa."),
])
n += inserir(1, "c1_tiago_musica", [
    d("mateus_buse", "neutro", "Análise técnica da música do Tiago: afinação 2, coragem 10. O microfone pediu transferência de escola."),
])
n += inserir(1, "me ajuda a puxar papo com aquela menina", [
    d("mateus_buse", "feliz", "Vitor, eu fiz as contas: tua chance com ela é de 3%. E isso contando que ela tropece e caia em cima de você."),
    d("vitor_witiuk", "envergonhado", "3% é bastante, né? ...Luis, 3% é bastante?"),
])
n += inserir(1, "c1_vitor_assunto", [
    d("mateus_buse", "neutro", "Corrigindo: a chance era 3%. Agora é zero. Um feito científico."),
    d("vitor_witiuk", "chocado", "Mas ela olhou pra mim!"),
    d("luis", "neutro", "Ela olhou pro grilo, Vitor."),
])
n += inserir(1, "puzzle_armario", [
    d("luis", "chocado", "Esqueci a senha do meu armário de novo..."),
    d("vitor_witiuk", "feliz", "Pede pro Mateus! Ele sabe a senha de todo mundo da sala."),
    d("mateus_buse", "neutro", "Sei. Inclusive a tua, Vitor. E sei da cartinha pra menina do corredor que tá aí dentro faz 4 meses."),
    d("vitor_witiuk", "envergonhado", "...Luis, abre logo esse armário, por favor."),
    d("mateus_buse", "feliz", "Vai, tenta. Se em 2 segundos não abrir, eu abro."),
], antes=True)
n += inserir(1, "Bora tirar um X1 de basquete", [
    d("vitor_witiuk", "feliz", "Vai lá, Luis! Eu e o Mateus vamos ficar na arquibancada dando apoio moral!"),
    d("mateus_buse", "neutro", "Eu vou calcular o ângulo de cada arremesso que você errar. Apoio técnico."),
])
n += inserir(1, "c1_declarar_maria_clara", [
    d("vitor_witiuk", "feliz", "Agora é a hora! Se declara! Usa a minha técnica do clima!"),
    d("mateus_buse", "neutro", "Luis, não usa nenhuma técnica do Vitor. Foi provado cientificamente que não funciona. Hoje mesmo."),
], antes=True)
n += inserir(1, "c1_declarar_maria_clara", [
    d("mateus_buse", "neutro", "Eu já sabia. Ela passou o recreio inteiro falando da menina da arquibancada."),
    d("luis", "chocado", "E você não me avisou?!"),
    d("mateus_buse", "feliz", "Você não perguntou. E o Vitor apostou um cookie que ia dar certo."),
    d("vitor_witiuk", "envergonhado", "...te devo um cookie, Mateus."),
])
n += inserir(1, "E eu aparecendo aí no fundo", [
    disc("(mutado, digitando no chat) confirmo tudo. e o Vitor até hoje não pagou o cookie."),
])

# ---------------------------------------------------------------- Caps. 2–15: ouvindo pela call
n += inserir(2, "abre a DAW", [
    disc("(fala por 40 segundos com o microfone mutado)"),
    disc("Mateus. Mutado. De novo.", quem="fabricio"),
    disc("(digitando) eu disse que o 808 tem que entrar no compasso 9. vocês perderam minha melhor ideia."),
])
n += inserir(2, "E assim nasceu a dupla dinâmica", [
    disc("o Vitor me ligou chorando depois. falei que a música era top 1 na casa dele. não ajudou."),
], antes=True)
n += inserir(3, "um rosto aparece na janelinha", [
    disc("eu reconheço essa franja desde o fundão. se prepara pro FELPS."),
])
n += inserir(4, "432 mensagens", [
    disc("432 mensagens até o meio-dia dá uma a cada 100 segundos. eu fiz a conta. ela não dormiu."),
])
n += inserir(5, "eu já tava ficando com a Agatha", [
    disc("pausa. o Fabricio tava com a Agatha E encontrou a ex no bar? isso já é capítulo de série."),
])
n += inserir(5, "aprendia geografia alemã", [
    disc("geografia alemã. anotado."),
])
n += inserir(6, "CLACK! CLACK!", [
    disc("5 travas em 1 segundo. recorde mundial de medo."),
])
n += inserir(7, "O GATO DA LUIZA", [
    disc("o gato é a única testemunha confiável dessa história inteira."),
])
n += inserir(8, "O lugar se chamava Sad Baile", [
    disc("Luis na bad indo no Sad Baile. nota 10 de coerência."),
])
n += inserir(9, "No cinema assistindo 'Nora'", [
    disc("eu fui ver 'Nora' depois por causa dessa história. o filme é bom. o silêncio de vocês não."),
])
n += inserir(10, "Olha aí o Tico e o Teco", [
    disc("Tico e Teco. finalmente alguém resumiu essa amizade em duas palavras."),
])
n += inserir(12, "ERRO 404", [
    disc("nunca. conheço o Luis desde o fundão, ele não espera nem o micro-ondas apitar."),
])
n += inserir(13, "MAS NA VIDA REAL", [
    disc("eu ouvindo isso aqui na call: ainda bem que eu não fui."),
])
n += inserir(14, "PLOT TWIST!!", [
    disc("a Tutuluiza avisou lá no fundão: 'essa cena ainda vai voltar'. eu anotei."),
])
n += inserir(15, "esperando ela mudar... ou esperando você ter coragem", [
    disc("(desmuta pela primeira vez no jogo inteiro) Luis... qualquer escolha que você fizer, a gente tá aqui na call."),
])

# ---------------------------------------------------------------- Créditos
cred = dial["creditos"]
for k, linha in enumerate(cred):
    if linha == "Comentarista Mutado: Mateus Buse":
        cred[k] = "Comentarista Mutado e Colega do Fundão: Mateus Buse"
        n += 1

# ---------------------------------------------------------------- Escolha do Vitor: Mateus na mini-cena
e = esc["escolhas"]["c1_vitor_assunto"]
clima = e["opcoes"][0]["miniCena"]
fala_clima = "Pelo menos os dados de umidade estavam corretos."
if all(m.get("fala") != fala_clima for m in clima):
    clima.append({"quem": "mateus_buse", "expr": "neutro", "fala": fala_clima})
    n += 1

P_DIAL.write_text(json.dumps(dial, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
P_ESC.write_text(json.dumps(esc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"inserções: {n}")
