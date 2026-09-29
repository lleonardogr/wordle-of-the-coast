# Wordle de Magic — contexto do projeto

Wordle diário de criaturas lendárias de *Magic: The Gathering*. Site
estático (HTML/CSS/JS puro, sem build, sem framework) publicado no GitHub
Pages, com dados vindos da API do Scryfall.

- **Produção:** https://lleonardogr.github.io/wordle-mtg/
- **Repositório:** https://github.com/lleonardogr/wordle-mtg
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

Busca `t:legendary t:creature -is:funny game:paper lang:en` e escreve
`data/cards.json`. Pontos de atenção, já resolvidos no script mas fáceis de
reintroduzir se mexer nele:

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

- **Modo fácil**: nome antes da vírgula (ou nome completo se não houver
  vírgula — alguns nomes sem vírgula são longos; ver nota de tamanho de
  peça abaixo).
- **Modo difícil**: nome completo, pontuação/espaços já revelados como
  peças fixas.
- Tentativas: fácil = 6, difícil = 8 (`MAX_ATTEMPTS` em `gameLogic.js`).
- Dicas reveladas progressivamente por tentativa: linhas do Oracle text,
  depois o subtipo de criatura. Identidade de cor e valor de mana (MV) já
  aparecem desde o início; o custo de mana exato fica com "?" até o fim.
  Arte só é revelada quando a partida termina (vitória ou derrota).
- Tamanho de peça do tabuleiro é **compacto com base no comprimento real do
  nome-alvo** (`guessableLength > 10`), não no modo — um bug real: nomes
  sem vírgula no modo fácil podem ser tão longos quanto no modo difícil, e
  ficavam com peças grandes demais, quebrando em várias linhas.
- Progresso por modo fica em `localStorage`, chaveado por
  `wordle-mtg:<número-do-puzzle>:<modo>`.
- Símbolos de mana do Oracle text (`{W}`, `{T}`, etc.) são convertidos em
  pastilhas (`renderManaText` em `app.js`), nunca mostrados como texto cru.

## Deploy

GitHub Pages publica direto da branch `main`, raiz do repo — sem etapa de
build. Qualquer push em `main` (inclusive os commits automáticos do
workflow de atualização de dados) já atualiza o site.
