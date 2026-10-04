#!/usr/bin/env node
/**
 * Valida mensagens de commit no formato Conventional Commits — ver
 * CONTRIBUTING.md. Sem dependências, de propósito (o projeto não tem build).
 *
 * Uso:
 *   node scripts/lint-commit-msg.mjs <arquivo>      # hook commit-msg
 *   node scripts/lint-commit-msg.mjs --range A..B    # CI: valida um intervalo
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const TYPES = ["feat", "fix", "perf", "refactor", "docs", "style", "test", "build", "ci", "chore", "revert"];
const HEADER = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9-]+\\))?!?: \\S.*$`);
const MAX_HEADER = 100;

// Mensagens geradas pelo próprio git, que não vale a pena barrar.
const IGNORED = [/^Merge /, /^Revert "/, /^(fixup|squash|amend)! /];

export function lintHeader(header) {
  if (IGNORED.some((re) => re.test(header))) return null;
  if (!HEADER.test(header)) {
    return `cabeçalho fora do padrão "<tipo>(<escopo>): <descrição>". Tipos: ${TYPES.join(", ")}`;
  }
  if (header.length > MAX_HEADER) return `cabeçalho com ${header.length} caracteres (máximo ${MAX_HEADER})`;
  return null;
}

function firstLine(message) {
  return message.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() ?? "";
}

const args = process.argv.slice(2);
let failures = [];

if (args[0] === "--range") {
  const out = execFileSync("git", ["log", "--format=%h%x00%s", args[1]], { encoding: "utf8" });
  for (const line of out.split("\n").filter(Boolean)) {
    const [sha, subject] = line.split("\0");
    const err = lintHeader(subject);
    if (err) failures.push(`${sha} "${subject}": ${err}`);
  }
} else if (args[0]) {
  const header = firstLine(readFileSync(args[0], "utf8"));
  const err = lintHeader(header);
  if (err) failures.push(`"${header}": ${err}`);
} else {
  console.error("uso: lint-commit-msg.mjs <arquivo> | --range A..B");
  process.exit(2);
}

if (failures.length) {
  console.error("Mensagem de commit inválida (ver CONTRIBUTING.md):");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
