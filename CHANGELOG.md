# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui. O formato
segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto
usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

A partir da 1.0.0, as entradas são geradas automaticamente pelo
[release-please](https://github.com/googleapis/release-please) a partir das
mensagens de commit ([Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)).
Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## [1.0.0](https://github.com/lleonardogr/wordle-of-the-coast/releases/tag/v1.0.0) (2026-10-03)

Primeira versão pública.

### Novidades

* Wordle diário de criaturas lendárias de *Magic: The Gathering*, com a mesma carta para todo mundo a cada dia (UTC)
* Modo fácil (nome antes da vírgula) e modo difícil (nome completo, com pontuação e espaços já revelados), ambos com 5 tentativas
* Dicas progressivas a cada tentativa: linhas do Oracle text e subtipo de criatura; identidade de cor e valor de mana desde o início; arte revelada ao fim da partida
* Painel "Ver opções no Scryfall" com uma busca montada a partir do que já foi revelado
* Progresso salvo por modo no `localStorage`
* Pool de cartas gerado pela API do Scryfall (`npm run fetch-cards`) e atualizado toda segunda-feira por um workflow do GitHub Actions
* Pool restrito a cartas no formato "Nome, Epíteto", garantindo que o modo fácil seja sempre curto
* Aviso de Fan Content Policy da Wizards of the Coast e atribuição ao Scryfall no rodapé
* Versão atual e link para o código-fonte no rodapé

### Correções

* Símbolos de mana no Oracle text renderizados como ícones em vez de texto cru (`{W}`, `{T}`)
* Tamanho das peças do tabuleiro calculado pelo comprimento real do nome-alvo, evitando quebra de linha em nomes longos
* Subtipo de criatura revelado ao fim da partida
