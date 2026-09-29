# Wordle of the Coast

Um Wordle diário de criaturas lendárias de *Magic: The Gathering*, com dados e
imagens vindos da [API do Scryfall](https://scryfall.com/docs/api).

Jogue em: https://lleonardogr.github.io/wordle-of-the-coast/

Para contexto de desenvolvimento (arquitetura, decisões, pipeline de dados),
veja [CLAUDE.md](CLAUDE.md). Para o sistema visual e estado de design
conhecido, [docs/DESIGN.md](docs/DESIGN.md). Para como testar — inclusive
visualmente, sem depender de automação de navegador ao vivo —
[docs/TESTING.md](docs/TESTING.md).

## Como funciona

- Todo dia (UTC), uma criatura lendária é sorteada de forma determinística
  entre o pool de cartas em `data/cards.json` — a mesma carta para todo mundo,
  igual ao Wordle original.
- **Modo fácil**: adivinhe apenas o nome antes da vírgula (ex: `ATRAXA`).
- **Modo difícil**: adivinhe o nome completo da carta, incluindo pontuação
  (ex: `ATRAXA, PRAETORS' VOICE`). Espaços e pontuação já vêm revelados nas
  peças fixas do tabuleiro; só as letras são adivinhadas.
- Ambos os modos têm 5 tentativas — a dificuldade vem do tamanho do
  nome-alvo, não de ter menos chances.
- A cada tentativa, uma nova dica é revelada: linhas do texto de regras
  (Oracle text) e, depois, o subtipo de criatura. A identidade de cor e o
  valor de mana já aparecem desde o início. A arte da carta só é revelada
  quando a partida termina (vitória ou tentativas esgotadas).
- O painel "Ver opções no Scryfall" monta uma busca no Scryfall com tudo que
  já foi revelado (cor, valor de mana, subtipo, tamanho do nome), para quem
  quiser explorar as cartas compatíveis.
- Progresso de cada modo fica salvo no `localStorage` do navegador.

## Rodando localmente

É um site 100% estático (HTML/CSS/JS vanilla, sem build). Como `app.js` usa
`fetch()` para carregar `data/cards.json`, abra com um servidor HTTP local em
vez de abrir o arquivo diretamente:

```bash
npm run serve
```

Depois acesse `http://localhost:8123`.

## Atualizando o pool de cartas

O pool de criaturas lendárias fica em `data/cards.json`, gerado a partir da
busca do Scryfall `t:legendary t:creature -is:funny game:paper lang:en
name:/,/` (o `name:/,/` garante que toda carta tem o formato
"Nome, Epíteto", essencial para o modo fácil ser sempre curto de verdade).

```bash
npm run fetch-cards
```

Um workflow do GitHub Actions (`.github/workflows/update-cards.yml`) roda essa
mesma busca automaticamente toda segunda-feira e commita o arquivo se houver
mudanças (novas cartas lançadas, erratas etc.), mantendo o pool sempre
atualizado sem intervenção manual.

## Deploy no GitHub Pages

O site é publicado direto da branch `main` (raiz do repositório) via GitHub
Pages — sem etapa de build. Qualquer push em `main` (incluindo os commits
automáticos do workflow acima) já atualiza o site publicado.

## Estrutura

```
index.html          markup da página
css/styles.css       estilos (baseados no protótipo de design)
js/gameLogic.js       lógica pura do jogo (sem DOM) — feedback do Wordle,
                       seleção da carta do dia, montagem da query do Scryfall
js/app.js              estado, renderização e eventos de UI
scripts/fetch-cards.mjs  gera data/cards.json a partir da API do Scryfall
scripts/e2e-smoke.mjs    teste ponta-a-ponta (Chromium headless) — ver docs/TESTING.md
data/cards.json          pool de cartas elegíveis (gerado)
.github/workflows/       atualização agendada dos dados
```

## Atribuição

Wordle of the Coast é Fan Content não-oficial, permitido pela
[Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).
As informações literais e gráficas sobre Magic: The Gathering aqui presentes
— incluindo imagens de cartas, símbolos de mana e texto de regras — são
copyright da Wizards of the Coast, LLC, subsidiária da Hasbro, Inc. Wordle of
the Coast não é produzido, endossado, apoiado ou afiliado à Wizards of the
Coast.

Dados e imagens das cartas são fornecidos pela [Scryfall](https://scryfall.com).
Wordle of the Coast não é produzido nem endossado pela Scryfall. Projeto de
fã, sem fins lucrativos.
