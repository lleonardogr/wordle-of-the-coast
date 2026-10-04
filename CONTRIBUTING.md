# Contribuindo

Obrigado pelo interesse! Este é um projeto pequeno e estático (HTML/CSS/JS
puro, sem build). Para arquitetura e decisões do jogo, leia
[CLAUDE.md](CLAUDE.md); para testes, [docs/TESTING.md](docs/TESTING.md).

## Ambiente

```bash
npm install        # instala o Playwright e ativa o hook de commit (.githooks/)
npm run serve      # http://localhost:8123
npm run test:e2e   # smoke test (precisa de `npx playwright install chromium` uma vez)
```

## Mensagens de commit

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).
As mensagens alimentam o versionamento e o [CHANGELOG](CHANGELOG.md)
automaticamente, então o tipo importa:

```
<tipo>(<escopo opcional>): <descrição no imperativo>
```

| Tipo       | Quando usar                                   | Efeito na versão |
| ---------- | --------------------------------------------- | ---------------- |
| `feat`     | nova funcionalidade para quem joga            | minor (1.**1**.0) |
| `fix`      | correção de bug                               | patch (1.0.**1**) |
| `perf`     | melhoria de desempenho                        | patch            |
| `refactor` | mudança interna sem alterar comportamento     | nenhum           |
| `docs`     | só documentação                               | nenhum           |
| `style`    | formatação de código (não é CSS visual!)      | nenhum           |
| `test`     | testes                                        | nenhum           |
| `build`    | dependências, `package.json`                  | nenhum           |
| `ci`       | workflows do GitHub Actions                   | nenhum           |
| `chore`    | manutenção (inclui atualização do pool de cartas) | nenhum       |
| `revert`   | reverte um commit anterior                    | patch            |

Mudanças incompatíveis (ex.: formato do progresso salvo no `localStorage` que
apaga partidas em andamento) levam `!` depois do tipo, ou um rodapé
`BREAKING CHANGE: ...`, e geram versão major.

Escopos sugeridos: `game` (regras em `gameLogic.js`), `ui` (`app.js`, CSS,
HTML), `data` (pool de cartas e `fetch-cards.mjs`), `e2e`, `deps`.

Exemplos:

```
feat(game): adicionar modo de prática com carta aleatória
fix(ui): evitar quebra de linha das peças em telas estreitas
chore(data): atualizar dados de cartas do Scryfall
```

A validação roda em dois lugares: localmente pelo hook `commit-msg` (ativado
pelo `npm install`) e no CI, para cada push e pull request.

## Releases

Ninguém cria tag ou edita o CHANGELOG à mão. A cada push em `main`, o
[release-please](https://github.com/googleapis/release-please) mantém um pull
request "chore(main): release X.Y.Z" com o changelog acumulado. Ao fazer
merge desse PR, ele cria a tag `vX.Y.Z` e a release no GitHub.

Commits que não alteram a versão (`chore`, `docs`, `ci`...) não abrem PR de
release sozinhos; eles entram junto da próxima `feat` ou `fix`.
