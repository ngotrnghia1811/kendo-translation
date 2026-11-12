// Token counts of model calls (unit VW93, round 91). Pure functions with no import, so every lib file can use them with no import cycle.
// Owner rule: tokens, not USD (Q-A 3:4.2, 3:6.3, 3:7.2). Owner pick Q-A 3:15.2 "Short in tables, all 5 in details". Owner pick Q-A 3:15.3 "Show 'no token data'".
// The text formats sit in lib/tokens-view.ts. They reuse tokensText and thousands of lib/phase2-row.ts.
// This file does not import lib/phase2-row.ts: that file imports lib/book-status-rules.ts, and book-status-rules.ts imports this file.
// Use only erasable TypeScript syntax here (no enum, no parameter property). A test runs this file with plain node (scripts/tokens-view-test.mjs).
//
// Sources of the counts (the Translator writes them, the Viewer only reads them):
//   calls.jsonl of a page run folder: each row of kind "model" holds "tokens": {input, output, reasoning, cache_read, cache_write}.
//   summary.json of a page run and of a critic-only folder: "tokens" with the 5 kinds (and "calls" in newer files).
//   progress.json of a list folder: "tokens" with the 5 kinds, and "tokens" on each page row. Older lists have no such key.
//   status.json of a book store: "tokens_phase" with the 5 kinds and "calls".
//   compare.json of critic_compare.py: "tokens" in each totals row.

/** The five token kinds, in the order of the phase 2 row, and the number of calls. A missing kind or calls count is null. Same shape as Phase2Tokens. */
export interface TokenCounts {
  input: number | null;
  output: number | null;
  reasoning: number | null;
  cache_read: number | null;
  cache_write: number | null;
  calls: number | null;
}

/** A sum of token counts. `tokens` is null when no part holds token data. `missing` counts the parts with no token data. */
export interface TokenSum {
  tokens: TokenCounts | null;
  missing: number;
}

export const TOKEN_KEYS = ["input", "output", "reasoning", "cache_read", "cache_write"] as const;
export type TokenKey = (typeof TOKEN_KEYS)[number];

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

/**
 * The token counts of one key "tokens" (or "tokens_phase"). Null when the value is no object or holds no valid kind.
 * `calls` is the number of calls: the key "calls" of the object wins, else the argument.
 */
export function tokenCounts(v: unknown, calls: number | null = null): TokenCounts | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  const t = v as Record<string, unknown>;
  const out: TokenCounts = { input: null, output: null, reasoning: null, cache_read: null, cache_write: null, calls: count(t.calls) ?? count(calls) };
  for (const k of TOKEN_KEYS) out[k] = count(t[k]);
  return TOKEN_KEYS.every((k) => out[k] === null) ? null : out;
}

/**
 * The sum of many token counts. A null part counts as "missing" and adds nothing.
 * [unit default VW93] A sum of parts where only some hold token data is the sum of the parts with data, and `missing` names the rest.
 * A kind that is null in every part with data stays null. The calls count adds the known counts only.
 */
export function sumTokens(parts: (TokenCounts | null)[]): TokenSum {
  let tokens: TokenCounts | null = null;
  let missing = 0;
  for (const p of parts) {
    if (!p) {
      missing += 1;
      continue;
    }
    if (!tokens) tokens = { input: null, output: null, reasoning: null, cache_read: null, cache_write: null, calls: null };
    for (const k of [...TOKEN_KEYS, "calls"] as const) {
      const v = p[k];
      if (v !== null) tokens[k] = (tokens[k] ?? 0) + v;
    }
  }
  return { tokens, missing };
}

/**
 * The tokens of the model calls in the rows of calls.jsonl. A model call is a row of kind "model" whose model is not "program"
 * (the same rule as model_calls of summary.json, <T2>/data/scripts/translator_run.py:1656). A program row (TS boxes) has 0 tokens.
 * A call with no key "tokens" counts as missing. Rows of kind "search" (Voyage) are not model calls.
 */
export function callsTokens(rows: unknown[]): TokenSum {
  const parts: (TokenCounts | null)[] = [];
  for (const r of rows) {
    if (r === null || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    if (row.kind !== "model" || row.model === "program") continue;
    const t = tokenCounts(row.tokens, 1);
    parts.push(t ? { ...t, calls: 1 } : null);
  }
  return sumTokens(parts);
}
