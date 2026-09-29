# Wordle de Magic

Um Wordle diário de criaturas lendárias de *Magic: The Gathering*, com dados e
imagens vindos da [API do Scryfall](https://scryfall.com/docs/api).

## Como funciona

- Todo dia (UTC), uma criatura lendária é sorteada de forma determinística
  entre o pool de cartas em `data/cards.json` — a mesma carta para todo mundo,
  igual ao Wordle original.
- **Modo fácil**: adivinhe apenas o nome antes da vírgula (ex: `ATRAXA`).
- **Modo difícil**: adivinhe o nome completo da carta, incluindo pontuação
  (ex: `ATRAXA, PRAETORS' VOICE`). Espaços e pontuação já vêm revelados nas
  peças fixas do tabuleiro; só as letras são adivinhadas.
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
python3 -m http.server 8000
# ou: npx serve
```

Depois acesse `http://localhost:8000`.

## Atualizando o pool de cartas

O pool de criaturas lendárias fica em `data/cards.json`, gerado a partir da
busca do Scryfall `t:legendary t:creature -is:funny game:paper lang:en`.

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
data/cards.json          pool de cartas elegíveis (gerado)
.github/workflows/       atualização agendada dos dados
```

## Atribuição

Este é um projeto de fã, sem afiliação com a Wizards of the Coast. Dados e
imagens das cartas são fornecidos pela [Scryfall](https://scryfall.com).
Magic: The Gathering é propriedade da Wizards of the Coast.
