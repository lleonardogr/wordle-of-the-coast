// Funções puras de lógica de jogo — sem acesso ao DOM.
// Facilita testar e raciocinar sobre as regras separadamente da renderização.

export const MAX_ATTEMPTS = { easy: 6, hard: 8 };

// Época fixa usada para calcular o índice do "puzzle do dia" de forma
// determinística e igual para todos os jogadores (mesmo princípio do Wordle).
const EPOCH_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export function todayUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function puzzleNumber(date = new Date()) {
  const diff = todayUTC(date).getTime() - EPOCH_UTC;
  return Math.floor(diff / DAY_MS) + 1;
}

export function dailyIndex(poolLength, date = new Date()) {
  const n = puzzleNumber(date);
  return ((n % poolLength) + poolLength) % poolLength;
}

export function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Nome-alvo de acordo com o modo de jogo.
// Fácil: apenas o nome antes da vírgula (ou o nome completo se não houver vírgula).
// Difícil: nome completo da carta, incluindo pontuação.
export function targetNameForMode(card, mode) {
  if (mode === "easy") {
    const commaIdx = card.name.indexOf(",");
    return commaIdx === -1 ? card.name : card.name.slice(0, commaIdx);
  }
  return card.name;
}

// Quebra o nome-alvo em "células": letras (adivináveis) e caracteres fixos
// (espaços, vírgulas, apóstrofos, hífens...) que já aparecem revelados.
export function buildCells(targetName) {
  const normalized = stripDiacritics(targetName).toUpperCase();
  const original = targetName;
  const cells = [];
  for (let i = 0; i < original.length; i++) {
    const displayChar = original[i];
    const compareChar = normalized[i];
    const isLetter = /[A-Z]/.test(compareChar);
    cells.push({ display: displayChar, compare: compareChar, guessable: isLetter });
  }
  return cells;
}

export function guessableLength(cells) {
  return cells.filter((c) => c.guessable).length;
}

// Algoritmo padrão do Wordle (lida corretamente com letras repetidas).
export function computeFeedback(guessLetters, targetLetters) {
  const n = targetLetters.length;
  const result = new Array(n).fill("abs");
  const remaining = {};
  for (let i = 0; i < n; i++) {
    remaining[targetLetters[i]] = (remaining[targetLetters[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = "ok";
      remaining[guessLetters[i]] -= 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === "ok") continue;
    const letter = guessLetters[i];
    if (remaining[letter] > 0) {
      result[i] = "pres";
      remaining[letter] -= 1;
    }
  }
  return result;
}

// Funde o estado (ok > pres > abs) de uma letra no teclado virtual.
export function mergeKeyState(prev, next) {
  const rank = { ok: 3, pres: 2, abs: 1, undefined: 0 };
  return rank[next] > rank[prev] ? next : prev;
}

function oracleLines(card) {
  return (card.oracle_text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function subtypeOf(card) {
  const parts = card.type_line.split("—");
  return parts.length > 1 ? parts[1].trim() : null;
}

// Calcula quais dicas já devem estar reveladas dado o número de tentativas
// usadas até agora. A arte só é revelada quando a partida termina
// (vitória, derrota ou tentativas esgotadas) — isso é decidido pelo chamador.
export function revealState(attemptsUsed, card) {
  const lines = oracleLines(card);
  const subtype = subtypeOf(card);
  const revealedLines = lines.filter((_, i) => attemptsUsed > i);
  const subtypeRevealed = subtype !== null && attemptsUsed > lines.length;
  return {
    revealedLines,
    totalLines: lines.length,
    subtype,
    subtypeRevealed,
  };
}

function escapeRegExpLiteral(char) {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Monta um padrão regex "spoiler-safe" que descreve o formato do nome-alvo
// (tamanho das palavras e pontuação fixa) sem revelar as letras.
export function buildNameRegexFragment(cells) {
  let out = "";
  let run = 0;
  const flush = () => {
    if (run > 0) {
      out += `.{${run}}`;
      run = 0;
    }
  };
  for (const cell of cells) {
    if (cell.guessable) {
      run += 1;
    } else {
      flush();
      out += escapeRegExpLiteral(cell.display);
    }
  }
  flush();
  return out;
}

function colorIdentityQuery(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) return "id=c";
  return `id=${[...colorIdentity].sort().join("")}`;
}

// Constrói a query do Scryfall refletindo apenas as dicas já reveladas,
// para o jogador explorar as opções compatíveis sem spoilers extras.
export function buildScryfallQuery(card, mode, cells, hints) {
  const parts = ["t:legendary", "t:creature", colorIdentityQuery(card.color_identity)];
  if (Number.isFinite(card.cmc)) parts.push(`cmc=${card.cmc}`);
  if (hints.subtypeRevealed && hints.subtype) {
    parts.push(`t:"${hints.subtype.split(" ")[0]}"`);
  }
  const pattern = buildNameRegexFragment(cells);
  const anchor = mode === "easy" ? `name:/^${pattern}(,|$)/` : `name:/^${pattern}$/`;
  parts.push(anchor);
  return parts.join(" ");
}

export function scryfallSearchUrl(query) {
  const params = new URLSearchParams({ q: query, unique: "cards", order: "name" });
  return `https://scryfall.com/search?${params.toString()}`;
}
