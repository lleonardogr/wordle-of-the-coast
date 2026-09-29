# Testando o jogo

## Por que isso existe

Durante o desenvolvimento, a automação de navegador do Claude Code
(`claude-in-chrome`) não respondeu neste ambiente (`tabs_context_mcp`
travava sem responder). A alternativa que funcionou — e que vale repetir em
vez de tentar `claude-in-chrome` de novo às cegas — foi Playwright com
Chromium headless, rodado direto do terminal via Node. Isso está
consolidado em `scripts/e2e-smoke.mjs`, já commitado no repo, em vez de
viver só em scripts descartáveis de sessão.

Se `claude-in-chrome` estiver respondendo na sua sessão, é a opção mais
rica (screenshots + clique real + inspeção de acessibilidade) — tente
primeiro. Se travar como travou aqui, não insista mais que 2-3 tentativas;
caia para o Playwright abaixo.

## Rodando o teste de fumaça

```bash
npx playwright install chromium   # uma vez só, baixa o binário (~280MB)
npm run serve                     # num terminal — serve em localhost:8123
npm run test:e2e                  # noutro terminal — roda os 3 cenários
```

Ou direto contra produção (sem precisar do `npm run serve`):

```bash
node scripts/e2e-smoke.mjs https://lleonardogr.github.io/wordle-of-the-coast/
```

O script:
1. Lê `data/cards.json` localmente e usa `js/gameLogic.js` para calcular
   qual é a carta do dia — a mesma lógica que o app usa no navegador — para
   saber de antemão a resposta certa e poder testar vitória de propósito.
2. Abre o Chromium, navega até a URL alvo, digita respostas (erradas e
   certas) via teclado, clica nas abas Fácil/Difícil.
3. Verifica: tamanho do tabuleiro bate com o nome-alvo real, progressão de
   dicas, mensagens de vitória/derrota, símbolos de mana renderizados como
   ícones (não texto cru), subtipo revelado ao fim, imagem da arte
   carregada de verdade (`naturalWidth > 0`), persistência em
   `localStorage` depois de um reload.
4. Salva screenshots em `e2e-screenshots/` (git-ignorado — são artefatos de
   execução, não a referência visual; essa fica em `docs/screenshots/`, ver
   `docs/DESIGN.md`).
5. Sai com código de erro se algum `console.error`/`pageerror` do navegador
   for capturado durante o fluxo, ou se alguma verificação falhar.

## Armadilhas já encontradas escrevendo esses testes

- **Timeout fixo curto depois de uma ação não é confiável** quando a página
  carrega uma imagem de um CDN externo (`cards.scryfall.io`) — o teste de
  vitória falhava uns 50% das vezes com `waitForTimeout(300)`. Trocado por
  `waitForFunction(() => img.complete)`.
- **A página sempre abre na aba "Fácil"**, mesmo que o progresso salvo seja
  do modo difícil — isso é comportamento correto do app, não um bug de
  persistência. Um teste que recarrega a página e checa o estado do modo
  difícil precisa clicar em `#bHard` de novo antes de ler o `#meta`.
- **Rate limit do Scryfall** (429) ao rodar `npm run fetch-cards` em
  sequência rápida — não é bug do teste, é da API; ver nota em `CLAUDE.md`.

## O que NÃO está coberto ainda

- Teste em viewport de celular real (o smoke test roda em 900px de
  largura). O CSS tem breakpoint em 820px — vale conferir abaixo disso.
- Teclado físico em diferentes layouts/idiomas do SO.
- Comportamento com `localStorage` desabilitado (modo privado agressivo) —
  o código tem `try/catch` ao redor do acesso, mas não foi exercitado por
  teste automatizado.
- Acessibilidade (leitor de tela, navegação só por teclado no teclado
  virtual).
