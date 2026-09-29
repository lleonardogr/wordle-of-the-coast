# Wordle of the Coast — contexto do projeto

Wordle diário de criaturas lendárias de *Magic: The Gathering*. Site
estático (HTML/CSS/JS puro, sem build, sem framework) publicado no GitHub
Pages, com dados vindos da API do Scryfall. Nome é um trocadilho com
"Wizards of the Coast" — por isso o rodapé do site carrega um aviso de Fan
Content Policy explícito deixando clara a falta de afiliação.

- **Produção:** https://lleonardogr.github.io/wordle-of-the-coast/
- **Repositório:** https://github.com/lleonardogr/wordle-of-the-coast
  (renomeado de `wordle-mtg` — se algum link antigo apontar para
  `wordle-mtg`, o GitHub redireciona automaticamente por um tempo, mas não
  para sempre)
- Leia também **[docs/DESIGN.md](docs/DESIGN.md)** (sistema visual, protótipo
  original, decisões de layout) e **[docs/TESTING.md](docs/TESTING.md)**
  (como testar, inclusive visualmente, sem automação de navegador).

## Rodando localmente

```bash
npm run serve   # python3 -m http.server 8123 — precisa ser HTTP, não file://
```

Depois abra `http://localhost:8123`.

## Arquitetura

```
index.html               markup
css/styles.css            estilos — ver docs/DESIGN.md para o sistema visual
js/gameLogic.js            lógica pura do jogo, sem DOM (testável isolada):
                            - seleção determinística da carta do dia
                            - nome-alvo por modo (fácil = antes da vírgula)
                            - algoritmo de feedback estilo Wordle
                            - montagem da query de busca do Scryfall
js/app.js                   estado, renderização e eventos de UI (usa gameLogic.js)
scripts/fetch-cards.mjs      gera data/cards.json a partir da API do Scryfall
scripts/e2e-smoke.mjs        teste de fumaça com Chromium headless — ver TESTING.md
data/cards.json               pool de cartas elegíveis (gerado, ~3.5MB, 3520 cartas)
.github/workflows/update-cards.yml   re-busca o Scryfall toda segunda-feira
```

`js/gameLogic.js` não toca no DOM de propósito — qualquer mudança de regra
do jogo (tamanho de tentativas, ordem das dicas, formato da query) deve
entrar ali, não espalhada pelo `app.js`.

## Pipeline de dados (Scryfall)

```bash
npm run fetch-cards
```

Busca `t:legendary t:creature -is:funny game:paper lang:en name:/,/` e
escreve `data/cards.json` (2.567 cartas na última geração). Pontos de
atenção, já resolvidos no script mas fáceis de reintroduzir se mexer nele:

- **`name:/,/` na query** garante que toda carta do pool tem o formato
  "Nome, Epíteto" — essencial para o modo fácil ser sempre curto de
  verdade (ver "Decisões de design do jogo" abaixo). Sem isso, cartas como
  "Go-Shintai of Life's Origin" (sem vírgula) caíam no fallback de nome
  completo em `targetNameForMode()` e o fácil virava tão difícil quanto o
  difícil.
- Essa vírgula pode estar na face "errada": para cartas de duas faces
  (transform/flip), o nome bruto do Scryfall é tipo
  `"Frente // Verso, Epíteto"` — a query casa pela vírgula no VERSO, mas
  `pickFace()` pode escolher a FRENTE (sem vírgula) como nome final. Por
  isso `normalizeCard()` também descarta (`return null`) qualquer carta
  cujo nome final não tenha vírgula, não confiando só na query.
- **Rate limit do Scryfall**: usa delay de 750ms entre páginas + retry com
  backoff exponencial em 429/5xx. Delays menores (~200ms) começaram a
  tomar 429 na prática durante o desenvolvimento — não abaixar sem motivo.
- **Cartas de duas faces** (transform, modal DFC, adventure, e mecânicas
  novas como "prepare"): a detecção de qual face usar é baseada na
  *ausência* de `oracle_text` no nível superior do card, não numa lista de
  `layout` conhecidos — layouts novos aparecem com frequência e uma lista
  fixa quebra silenciosamente (gerava nomes tipo `"A // B"` e oracle_text
  vazio). Ver `pickFace()` em `scripts/fetch-cards.mjs`.
- O workflow agendado (`.github/workflows/update-cards.yml`) precisa do
  escopo `workflow` no token do `gh` para poder ser criado/atualizado via
  push — se recriar o repo do zero, rodar
  `gh auth refresh -h github.com -s workflow` antes do primeiro push.

## Decisões de design do jogo

- **Modo fácil**: nome antes da vírgula. O pool (`fetch-cards.mjs`) só
  inclui cartas com vírgula no nome, então isso é garantido pelos dados,
  não por um fallback no código do jogo — `targetNameForMode()` ainda tem
  um fallback de nome completo por segurança, mas ele não deveria disparar
  na prática.
- **Modo difícil**: nome completo, pontuação/espaços já revelados como
  peças fixas.
- Tentativas: 5 nos dois modos (`MAX_ATTEMPTS` em `gameLogic.js`) — a
  dificuldade vem só do tamanho do nome-alvo (curto vs. completo), não de
  ter menos chances.
- Dicas reveladas progressivamente por tentativa: linhas do Oracle text,
  depois o subtipo de criatura. Identidade de cor e valor de mana (MV) já
  aparecem desde o início; o custo de mana exato fica com "?" até o fim.
  Arte só é revelada quando a partida termina (vitória ou derrota).
- Tamanho de peça do tabuleiro é **compacto com base no comprimento real do
  nome-alvo** (`guessableLength > 10`), não no modo — um bug real: nomes
  sem vírgula no modo fácil podem ser tão longos quanto no modo difícil, e
  ficavam com peças grandes demais, quebrando em várias linhas.
- Progresso por modo fica em `localStorage`, chaveado por
  `wordle-of-the-coast:<número-do-puzzle>:<modo>`.
- Símbolos de mana do Oracle text (`{W}`, `{T}`, etc.) são convertidos em
  pastilhas (`renderManaText` em `app.js`), nunca mostrados como texto cru.

## Deploy

GitHub Pages publica direto da branch `main`, raiz do repo — sem etapa de
build. Qualquer push em `main` (inclusive os commits automáticos do
workflow de atualização de dados) já atualiza o site.
