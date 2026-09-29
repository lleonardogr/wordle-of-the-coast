import {
  MAX_ATTEMPTS,
  dailyIndex,
  puzzleNumber,
  targetNameForMode,
  buildCells,
  guessableLength,
  computeFeedback,
  mergeKeyState,
  revealState,
  buildScryfallQuery,
  scryfallSearchUrl,
} from "./gameLogic.js";

const COLOR_NAMES = { W: "branco", U: "azul", B: "preto", R: "vermelho", G: "verde" };
const COLOR_LABEL_ORDER = ["W", "U", "B", "R", "G"];

const el = {
  board: document.getElementById("board"),
  kb: document.getElementById("kb"),
  meta: document.getElementById("meta"),
  message: document.getElementById("message"),
  manaCost: document.getElementById("manaCost"),
  pips: document.getElementById("pips"),
  artBox: document.getElementById("artBox"),
  typeLine: document.getElementById("typeLine"),
  cmcLabel: document.getElementById("cmcLabel"),
  oracleBox: document.getElementById("oracleBox"),
  hintsProgress: document.getElementById("hintsProgress"),
  hintsNext: document.getElementById("hintsNext"),
  q: document.getElementById("q"),
  scryfallLink: document.getElementById("scryfallLink"),
  bEasy: document.getElementById("bEasy"),
  bHard: document.getElementById("bHard"),
  resultPanel: document.getElementById("resultPanel"),
  resultImg: document.getElementById("resultImg"),
  resultName: document.getElementById("resultName"),
  resultType: document.getElementById("resultType"),
  resultOracle: document.getElementById("resultOracle"),
  resultLink: document.getElementById("resultLink"),
  shareBtn: document.getElementById("shareBtn"),
};

const KB_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Scryfall representa símbolos de mana como texto cru "{W}{U}{2}{T}" —
// troca cada símbolo por uma pastilha estilizada em vez de mostrar as chaves.
function renderManaText(text) {
  return escapeHtml(text).replace(/\{([^}]+)\}/g, (_, symbol) => {
    const cls = symbol.replace(/\//g, "").toLowerCase();
    return `<i class="ms ms-${cls}">${symbol}</i>`;
  });
}

function renderOracleHtml(oracleText) {
  const lines = (oracleText || "").split("\n").filter(Boolean);
  if (!lines.length) return `<p><em>Sem texto de regras.</em></p>`;
  return lines.map((l) => `<p>${renderManaText(l)}</p>`).join("");
}

let cardsPool = [];
let todayCard = null;
let mode = "easy";
let messageTimer = null;

const modeState = {
  easy: null,
  hard: null,
};

function storageKey(m) {
  return `wordle-mtg:${puzzleNumber()}:${m}`;
}

function loadState(m) {
  try {
    const raw = localStorage.getItem(storageKey(m));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.guesses)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(m) {
  try {
    localStorage.setItem(storageKey(m), JSON.stringify(modeState[m]));
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem persistência.
  }
}

function freshState(m) {
  const target = targetNameForMode(todayCard, m);
  return {
    mode: m,
    target,
    cells: buildCells(target),
    guesses: [], // cada item: { letters: [...], feedback: [...] }
    current: "",
    status: "playing", // playing | won | lost
  };
}

function ensureState(m) {
  if (modeState[m]) return modeState[m];
  const saved = loadState(m);
  const target = targetNameForMode(todayCard, m);
  if (saved && saved.target === target) {
    modeState[m] = saved;
  } else {
    modeState[m] = freshState(m);
  }
  return modeState[m];
}

function attemptsUsed(m) {
  return modeState[m].guesses.length;
}

function showMessage(text, timeout = 1800) {
  el.message.textContent = text;
  if (messageTimer) clearTimeout(messageTimer);
  if (timeout) {
    messageTimer = setTimeout(() => {
      el.message.textContent = "";
    }, timeout);
  }
}

// ---------- Renderização ----------

function tileHtml(displayChar, stateClass, extraClass = "") {
  const cls = ["t", stateClass, extraClass].filter(Boolean).join(" ");
  return `<div class="${cls}">${displayChar || ""}</div>`;
}

function renderRow(cells, letters, feedback, isActive) {
  let activeSlot = -1;
  if (isActive) {
    activeSlot = letters.findIndex((l) => l === null);
  }
  let html = "";
  let wordHtml = "";
  let guessIdx = -1;
  const flushWord = () => {
    if (wordHtml) html += `<div class="word">${wordHtml}</div>`;
    wordHtml = "";
  };
  cells.forEach((cell) => {
    if (cell.display === " ") {
      flushWord();
      return;
    }
    if (!cell.guessable) {
      wordHtml += tileHtml(cell.display, "fix", "fix");
      return;
    }
    guessIdx += 1;
    const letter = letters[guessIdx];
    if (feedback) {
      wordHtml += tileHtml(letter, feedback[guessIdx]);
    } else {
      const isCur = isActive && guessIdx === activeSlot;
      wordHtml += tileHtml(letter, isCur ? "cur" : "");
    }
  });
  flushWord();
  return `<div class="row">${html}</div>`;
}

function renderBoard() {
  const state = modeState[mode];
  const max = MAX_ATTEMPTS[mode];
  // Tiles ficam compactos com base no tamanho real do nome-alvo, não no
  // modo — alguns nomes sem vírgula (sem separador "fácil") ainda são
  // longos e quebram em várias linhas com o tamanho padrão de peça.
  el.board.classList.toggle("compact", guessableLength(state.cells) > 10);

  let rowsHtml = "";
  state.guesses.forEach((g) => {
    rowsHtml += renderRow(state.cells, g.letters, g.feedback, false);
  });

  const guessesLeft = max - state.guesses.length;
  if (state.status === "playing" && guessesLeft > 0) {
    const currentLetters = lettersFromInput(state.cells, state.current);
    rowsHtml += renderRow(state.cells, currentLetters, null, true);
    for (let i = 1; i < guessesLeft; i++) {
      rowsHtml += renderRow(state.cells, new Array(guessableLength(state.cells)).fill(null), null, false);
    }
  }

  el.board.innerHTML = rowsHtml;

  const remaining = Math.max(max - state.guesses.length, 0);
  const glen = guessableLength(state.cells);
  const puzzleLabel = `carta #${puzzleNumber()}`;
  if (state.status === "playing") {
    el.meta.textContent = `${glen} letras · ${remaining} tentativa${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"} · ${puzzleLabel}`;
  } else if (state.status === "won") {
    el.meta.textContent = `Acertou em ${state.guesses.length} tentativa${state.guesses.length === 1 ? "" : "s"} · ${puzzleLabel}`;
  } else {
    el.meta.textContent = `Tentativas esgotadas · ${puzzleLabel}`;
  }
}

function lettersFromInput(cells, current) {
  const glen = guessableLength(cells);
  const arr = new Array(glen).fill(null);
  for (let i = 0; i < current.length && i < glen; i++) arr[i] = current[i];
  return arr;
}

function keyStatesFor(m) {
  const state = modeState[m];
  const result = {};
  state.guesses.forEach((g) => {
    g.letters.forEach((letter, i) => {
      result[letter] = mergeKeyState(result[letter], g.feedback[i]);
    });
  });
  return result;
}

function renderKeyboard() {
  const states = keyStatesFor(mode);
  const rowsHtml = KB_ROWS.map((row, i) => {
    const keys = [...row]
      .map((c) => `<div class="k ${states[c] || ""}" data-key="${c}">${c}</div>`)
      .join("");
    if (i === 2) {
      return `<div class="kr"><div class="k wide" data-key="ENTER">Enviar</div>${keys}<div class="k wide" data-key="BACK">Apagar</div></div>`;
    }
    return `<div class="kr">${keys}</div>`;
  }).join("");
  el.kb.innerHTML = rowsHtml;
}

function renderHintsPanel() {
  const state = modeState[mode];
  const card = todayCard;
  const used = attemptsUsed(mode);
  const gameOver = state.status !== "playing";
  const hints = revealState(used, card);

  const pipCount = (card.mana_cost.match(/\{[^}]+\}/g) || []).length;
  if (gameOver) {
    el.manaCost.innerHTML = pipCount > 0 ? renderManaText(card.mana_cost) : "—";
  } else {
    el.manaCost.textContent = pipCount > 0 ? Array(pipCount).fill("?").join(" ") : "—";
  }

  const identity = card.color_identity.length
    ? COLOR_LABEL_ORDER.filter((c) => card.color_identity.includes(c))
    : [];
  el.pips.innerHTML = identity.length
    ? identity.map((c) => `<i class="pip ${c.toLowerCase()}" title="${COLOR_NAMES[c]}"></i>`).join("")
    : `<span class="pip-none" title="Incolor">Incolor</span>`;
  el.pips.setAttribute(
    "aria-label",
    identity.length ? `Identidade de cor: ${identity.map((c) => COLOR_NAMES[c]).join(", ")}` : "Incolor"
  );

  const supertypeType = card.type_line.split("—")[0].trim();
  el.typeLine.textContent =
    gameOver || hints.subtypeRevealed ? card.type_line : `${supertypeType} — ${hints.subtype ? "?" : ""}`;
  el.cmcLabel.textContent = `MV ${card.cmc}`;

  if (gameOver) {
    el.artBox.classList.add("revealed");
    el.artBox.innerHTML = `<img src="${card.art_crop}" alt="Arte de ${card.name}">`;
  } else {
    el.artBox.classList.remove("revealed");
    el.artBox.textContent = "arte revelada no fim";
  }

  if (gameOver) {
    el.oracleBox.innerHTML = renderOracleHtml(card.oracle_text);
  } else if (hints.revealedLines.length) {
    el.oracleBox.innerHTML = hints.revealedLines.map((l) => `<p>${renderManaText(l)}</p>`).join("");
  } else {
    el.oracleBox.innerHTML = `<p class="oracle-placeholder">As dicas de texto de regras aparecem conforme você tenta.</p>`;
  }

  if (gameOver) {
    el.hintsProgress.textContent = "Carta revelada";
    el.hintsNext.textContent = "";
  } else {
    const totalStages = hints.totalLines + 1; // linhas de oráculo + subtipo
    const doneStages = hints.revealedLines.length + (hints.subtypeRevealed ? 1 : 0);
    el.hintsProgress.textContent = `Dica ${doneStages} de ${totalStages} revelada${doneStages === 1 ? "" : "s"}`;
    let next = "próxima tentativa";
    if (hints.revealedLines.length < hints.totalLines) next = "mais uma linha de texto";
    else if (!hints.subtypeRevealed && hints.subtype) next = "subtipo";
    else next = "arte (ao fim da partida)";
    el.hintsNext.textContent = `Próxima: ${next}`;
  }

  const query = buildScryfallQuery(card, mode, modeState[mode].cells, hints);
  el.q.textContent = query;
  el.scryfallLink.href = scryfallSearchUrl(query);
}

function renderResultPanel() {
  const state = modeState[mode];
  const card = todayCard;
  if (state.status === "playing") {
    el.resultPanel.hidden = true;
    return;
  }
  el.resultPanel.hidden = false;
  el.resultImg.src = card.image;
  el.resultImg.alt = card.name;
  el.resultName.textContent = card.name;
  el.resultType.textContent = card.type_line;
  el.resultOracle.innerHTML = renderOracleHtml(card.oracle_text);
  el.resultLink.href = card.scryfall_uri;
  el.resultPanel.classList.toggle("won", state.status === "won");
  el.resultPanel.classList.toggle("lost", state.status === "lost");
}

function renderAll() {
  renderBoard();
  renderKeyboard();
  renderHintsPanel();
  renderResultPanel();
}

// ---------- Entrada ----------

function typeLetter(letter) {
  const state = modeState[mode];
  if (state.status !== "playing") return;
  const glen = guessableLength(state.cells);
  if (state.current.length >= glen) return;
  state.current += letter;
  renderBoard();
}

function backspace() {
  const state = modeState[mode];
  if (state.status !== "playing") return;
  state.current = state.current.slice(0, -1);
  renderBoard();
}

function submitGuess() {
  const state = modeState[mode];
  if (state.status !== "playing") return;
  const glen = guessableLength(state.cells);
  if (state.current.length < glen) {
    showMessage("Preencha todas as letras antes de enviar.");
    return;
  }

  const guessLetters = [...state.current];
  const targetLetters = state.cells.filter((c) => c.guessable).map((c) => c.compare);
  const feedback = computeFeedback(guessLetters, targetLetters);

  state.guesses.push({ letters: guessLetters, feedback });
  state.current = "";

  const won = feedback.every((f) => f === "ok");
  if (won) {
    state.status = "won";
    showMessage("Você acertou! 🎉", 0);
  } else if (state.guesses.length >= MAX_ATTEMPTS[mode]) {
    state.status = "lost";
    showMessage(`Não foi dessa vez. Era ${todayCard.name}.`, 0);
  }

  saveState(mode);
  renderAll();
}

function handleVirtualKey(key) {
  if (key === "ENTER") return submitGuess();
  if (key === "BACK") return backspace();
  typeLetter(key);
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key;
  if (key === "Enter") return submitGuess();
  if (key === "Backspace") return backspace();
  if (/^[a-zA-Z]$/.test(key)) return typeLetter(key.toUpperCase());
});

el.kb.addEventListener("click", (e) => {
  const target = e.target.closest("[data-key]");
  if (!target) return;
  handleVirtualKey(target.dataset.key);
});

function switchMode(next) {
  mode = next;
  el.bEasy.setAttribute("aria-pressed", String(mode === "easy"));
  el.bHard.setAttribute("aria-pressed", String(mode === "hard"));
  ensureState(mode);
  renderAll();
}

el.bEasy.addEventListener("click", () => switchMode("easy"));
el.bHard.addEventListener("click", () => switchMode("hard"));

el.shareBtn?.addEventListener("click", async () => {
  const state = modeState[mode];
  const grid = state.guesses
    .map((g) => g.feedback.map((f) => (f === "ok" ? "🟩" : f === "pres" ? "🟨" : "⬛")).join(""))
    .join("\n");
  const label = mode === "easy" ? "fácil" : "difícil";
  const result = state.status === "won" ? `${state.guesses.length}/${MAX_ATTEMPTS[mode]}` : "X";
  const text = `Wordle de Magic #${puzzleNumber()} (${label}) ${result}\n${grid}`;
  try {
    await navigator.clipboard.writeText(text);
    showMessage("Resultado copiado!");
  } catch {
    showMessage("Não foi possível copiar automaticamente.");
  }
});

// ---------- Inicialização ----------

async function init() {
  el.meta.textContent = "Carregando cartas do Scryfall…";
  const res = await fetch("./data/cards.json");
  if (!res.ok) throw new Error("Falha ao carregar data/cards.json");
  const data = await res.json();
  cardsPool = data.cards;

  const idx = dailyIndex(cardsPool.length);
  todayCard = cardsPool[idx];

  ensureState("easy");
  ensureState("hard");
  switchMode("easy");
}

init().catch((err) => {
  console.error(err);
  el.meta.textContent = "Não foi possível carregar o jogo. Tente recarregar a página.";
});
