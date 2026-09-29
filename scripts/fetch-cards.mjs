#!/usr/bin/env node
/**
 * Busca no Scryfall todas as criaturas lendárias (papel, inglês, sem cartas
 * "un-sets") e gera data/cards.json com os campos necessários para o jogo.
 *
 * Uso: node scripts/fetch-cards.mjs
 *
 * Respeita as diretrizes de uso da API do Scryfall: envia um User-Agent
 * descritivo e aguarda ~100ms entre requisições.
 * https://scryfall.com/docs/api
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "cards.json");

const USER_AGENT = "wordle-mtg-data-fetcher/1.0 (+https://github.com/)";
const SEARCH_QUERY = "t:legendary t:creature -is:funny game:paper lang:en";
const REQUEST_DELAY_MS = 750;
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > MAX_RETRIES) {
      throw new Error(`Scryfall request failed (${res.status}) after ${MAX_RETRIES} retries: ${url}`);
    }
    const backoff = 500 * 2 ** (attempt - 1);
    process.stdout.write(`  (${res.status}, tentando de novo em ${backoff}ms...)\n`);
    await sleep(backoff);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Scryfall request failed (${res.status}): ${url}`);
  }
  return res.json();
}

function pickFace(card) {
  // Cartas com múltiplas "faces" (transform, modal DFC, adventure, e
  // mecânicas mais novas como "prepare") não têm oracle_text no nível
  // superior — o texto fica dividido entre card_faces. Detectar por essa
  // ausência (em vez de uma lista fixa de layouts) evita quebrar quando o
  // Scryfall introduz um layout novo.
  const isMultiFaced =
    Array.isArray(card.card_faces) &&
    card.card_faces.length > 0 &&
    !card.oracle_text;
  return isMultiFaced ? card.card_faces[0] : card;
}

function normalizeCard(card) {
  const face = pickFace(card);
  const imageSource = face.image_uris ? face : card.image_uris ? card : face;
  const imageUris = imageSource.image_uris || card.image_uris || {};

  const name = face.name || card.name;
  const oracleText = face.oracle_text || card.oracle_text || "";
  const typeLine = face.type_line || card.type_line || "";
  const manaCost = face.mana_cost || card.mana_cost || "";

  if (!name || !typeLine.includes("Creature")) return null;
  if (!imageUris.art_crop || !imageUris.normal) return null;

  return {
    id: card.oracle_id || card.id,
    name,
    mana_cost: manaCost,
    cmc: card.cmc,
    color_identity: card.color_identity || [],
    type_line: typeLine,
    oracle_text: oracleText,
    art_crop: imageUris.art_crop,
    image: imageUris.normal,
    scryfall_uri: card.scryfall_uri,
    set_name: card.set_name,
    released_at: card.released_at,
  };
}

async function fetchAllCards() {
  const cards = [];
  const seen = new Set();
  let url =
    "https://api.scryfall.com/cards/search?" +
    new URLSearchParams({
      q: SEARCH_QUERY,
      unique: "cards",
      order: "name",
    }).toString();

  let page = 1;
  while (url) {
    process.stdout.write(`Buscando página ${page}...\n`);
    const data = await fetchJson(url);
    for (const raw of data.data) {
      const normalized = normalizeCard(raw);
      if (!normalized) continue;
      if (seen.has(normalized.id)) continue;
      seen.add(normalized.id);
      cards.push(normalized);
    }
    url = data.has_more ? data.next_page : null;
    page += 1;
    if (url) await sleep(REQUEST_DELAY_MS);
  }
  return cards;
}

async function main() {
  const cards = await fetchAllCards();
  cards.sort((a, b) => a.name.localeCompare(b.name, "en"));

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        query: SEARCH_QUERY,
        count: cards.length,
        cards,
      },
      null,
      2
    )
  );

  console.log(`\n${cards.length} criaturas lendárias salvas em ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
