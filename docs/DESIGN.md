# Design

## Origem

O layout parte de um protótipo estático em HTML que o usuário anexou no
início do projeto (arquivo local, não versionado aqui:
`Wordle de Magic — protótipo de design.html`, em `~/Downloads`). `css/styles.css`
começou como uma cópia quase literal do CSS desse protótipo — mantenha os
dois em sintonia se o protótipo for atualizado, ou considere este arquivo a
fonte da verdade a partir de agora.

## Sistema visual

- **Fontes**: "IM Fell English SC" (títulos, serifada, clima de grimório)
  + "Instrument Sans" (corpo). Carregadas via Google Fonts no `<head>`.
- **Tema**: escuro fixo (`--bg:#141830`), não segue `prefers-color-scheme`
  do sistema — é um site próprio, não um Artifact, então isso é uma escolha
  de marca, não uma lacuna de acessibilidade a corrigir.
- **Painel de dicas** (`.card`): simula uma carta de pergaminho
  (`--parch:#e9dfc3`) com borda grossa marrom — contraste deliberado com o
  resto da UI, que é escura/moderna.
- **Peças do tabuleiro** (`.t`): verde `--ok`/amarelo `--pres`/roxo-escuro
  `--abs`, igual ao Wordle original. Tamanho responde a `clamp()` e ao
  comprimento real do nome-alvo (classe `.compact`) — ver CLAUDE.md.
- **Símbolos de mana** (`.ms`): pastilhas circulares pequenas, cores por
  naipe (W/U/B/R/G), usadas tanto na barra de custo de mana quanto dentro
  do texto de regras. Adicionadas depois do protótipo original (que não
  tinha texto de regras dinâmico) — ver `renderManaText()` em `js/app.js`.

## Estado visual conhecido (última verificação)

Screenshots em `docs/screenshots/` foram gerados por
`scripts/e2e-smoke.mjs` rodando contra `localhost:8123` e representam o
estado real renderizado (não mockups):

| Arquivo | O que mostra |
|---|---|
| `01-initial-easy.png` | Carga inicial, modo fácil, nenhuma dica revelada |
| `02-after-wrong-guess.png` | Depois de 1 tentativa errada — dica de Oracle text revelada |
| `03-hard-mode.png` | Modo difícil, tabuleiro compacto (nome longo) |
| `04-win-state.png` | Vitória — carta totalmente revelada (arte, símbolos de mana, subtipo) |
| `05-loss-state.png` | Derrota — mesma revelação completa, painel de resultado com borda vermelha |

Se for mexer em CSS/layout, gere screenshots novos com
`npm run test:e2e` (salva em `e2e-screenshots/`, git-ignorado) e compare
visualmente com os anteriores antes de substituir os de `docs/screenshots/`.

## Coisas que já foram corrigidas (não reintroduzir)

Encontradas via teste com Chromium headless, não por leitura de código —
ver `docs/TESTING.md` para o porquê disso ser necessário:

1. Símbolos de mana do Oracle text apareciam como texto cru `{W}{U}{T}` em
   vez de ícones — corrigido com `renderManaText()`.
2. Peças do tabuleiro só ficavam compactas no modo difícil
   (`mode === "hard"`), mas nomes sem vírgula no modo fácil também podem
   ser longos — corrigido para depender do comprimento real do nome
   (`guessableLength(cells) > 10`), não do modo.
3. Custo de mana real nunca era revelado ao fim da partida (sempre "? ?").
4. Subtipo de criatura ficava com "?" residual no painel de dicas mesmo
   depois da carta já estar totalmente revelada (arte, Oracle text
   completo) — a condição de revelação não considerava `gameOver`.
5. Desproporção de desbalanceamento: até ~26% do pool não tinha vírgula
   no nome, então o modo fácil às vezes virava tão longo/difícil quanto o
   difícil (chegou a acontecer com a carta do dia durante o
   desenvolvimento: 22 letras nos dois modos). Corrigido restringindo o
   pool a cartas com vírgula (`name:/,/` na query do Scryfall + guarda em
   `normalizeCard()`) — ver CLAUDE.md.

## Responsividade

`.game` vira duas colunas (`340px 1fr`) a partir de 820px de largura; abaixo
disso empilha verticalmente (painel de dicas em cima do tabuleiro). Ainda
não testado formalmente em viewport de celular real — se for revisar
design, vale conferir em ~375px de largura.
