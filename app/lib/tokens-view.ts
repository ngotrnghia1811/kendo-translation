// Token text of the Viewer screens (unit VW93, round 91). Pure functions: no file access, no server-only import. Client and server code use them.
// Owner rule: tokens, not USD (Q-A 3:4.2, 3:6.3, 3:7.2). No screen shows USD or "$" for a model cost.
// Owner pick Q-A 3:15.2 "Short in tables, all 5 in details":
//   tables and one-line places show "Tokens in (with cache) / out": the Lists page `/runs`, the book rows, the line of all books
//   on the Monitor dashboard `/` on this Mac, and the step view lines of level 1 and level 2.
// Owner pick Q-A 3:20.2 "In = input + cache" (unit VW96): "in" = input + cache read + cache write, "out" = output.
//   detail places show the 5 kinds in the words and order of the phase 2 row: the run view, the page view, the per-call lists of Extra detail, the book detail view.
// Owner pick Q-A 3:15.3 "Show 'no token data'": a run or a list with no token numbers shows "no token data" in grey (class text-muted).
// The 5-kind line is tokensText of lib/phase2-row.ts, unchanged. The numbers use thousands of the same file.
import { thousands, tokensText } from "./phase2-row";
import { TOKEN_KEYS, type TokenCounts, type TokenKey, type TokenSum } from "./tokens-sum";

export { TOKEN_KEYS, callsTokens, sumTokens, tokenCounts } from "./tokens-sum";
export type { TokenCounts, TokenKey, TokenSum } from "./tokens-sum";

/** Text in place of the tokens when a run, a list, or a call holds no token numbers (Q-A 3:15.3). */
export const NO_TOKEN_DATA = "no token data";
/**
 * Column head and label of the short form (Q-A 3:15.2, changed by Q-A 3:20.2 "In = input + cache", unit VW96).
 * "in" is input + cache read + cache write, because a Claude call sends its prompt as cache. Every screen uses this one constant.
 */
export const TOKENS_SHORT_LABEL = "Tokens in (with cache) / out";
/** The hover text of the short form: what "in" counts. */
export const TOKENS_SHORT_HELP = "In = input + cache read + cache write. Out = output tokens. A page view shows all 5 kinds.";
/** Label of the 5-kind form. */
export const TOKENS_LABEL = "Tokens";
/** Column heads of the 5 kinds, in the words and order of the phase 2 row. */
export const TOKEN_KIND_WORDS: Record<TokenKey, string> = { input: "input", output: "output", reasoning: "reasoning", cache_read: "cache read", cache_write: "cache write" };
export const TOKEN_KIND_HEADS: string[] = TOKEN_KEYS.map((k) => TOKEN_KIND_WORDS[k]);

const PREFIX = "Tokens: ";

function n(v: number | null): string {
  return v === null ? "–" : thousands(v);
}

/**
 * Tokens in (Q-A 3:20.2): input + cache read + cache write. A kind that is null adds nothing.
 * Null when all three kinds are null (no call held any of them).
 */
export function tokensIn(t: TokenCounts): number | null {
  const parts = [t.input, t.cache_read, t.cache_write].filter((v): v is number => v !== null);
  return parts.length === 0 ? null : parts.reduce((a, b) => a + b, 0);
}

/** The short form: "101,234,566 / 345,678" (input + cache read + cache write, then output). "no token data" for null. */
export function tokensShort(t: TokenCounts | null): string {
  return t ? `${n(tokensIn(t))} / ${n(t.output)}` : NO_TOKEN_DATA;
}

/** The 5 kinds of one call or one sum, with no calls count: "input 4 · output 17,590 · reasoning – · cache read – · cache write 28,671". "no token data" for null. */
export function tokensKinds(t: TokenCounts | null): string {
  if (!t) return NO_TOKEN_DATA;
  return TOKEN_KEYS.map((k) => `${TOKEN_KIND_WORDS[k]} ${n(t[k])}`).join(" · ");
}

/** The 5-kind line of the phase 2 row: "Tokens: input 1,234 · output 56 · reasoning 7 · cache read 8,901 · cache write 234 · 12 calls". "no token data" for null. */
export function tokensLine(t: TokenCounts | null): string {
  return t ? tokensText(t) : NO_TOKEN_DATA;
}

/** The 5-kind line with no "Tokens: " in front, for a place that shows the label "Tokens" above or beside it. "no token data" for null. */
export function tokensBody(t: TokenCounts | null): string {
  if (!t) return NO_TOKEN_DATA;
  const line = tokensText(t);
  return line.startsWith(PREFIX) ? line.slice(PREFIX.length) : line;
}

/** One cell of a 5-kind table: the count with thousands separators, "–" for null. */
export function tokenCell(t: TokenCounts, k: TokenKey): string {
  return n(t[k]);
}

/**
 * The note of a sum where some parts have no token data: " (3 calls without token data)". Empty text when no part is missing,
 * or when no part has data (then the whole place shows "no token data").
 */
export function missingNote(s: TokenSum, one: string, many: string): string {
  if (s.missing === 0 || s.tokens === null) return "";
  return ` (${thousands(s.missing)} ${s.missing === 1 ? one : many} without token data)`;
}

/** The line of all books on the Monitor dashboard `/`: "Tokens in (with cache) / out of all books: 1,234 / 567" and the note for books without token data. */
export function allBooksText(s: TokenSum): string {
  if (s.tokens === null) return `${TOKENS_SHORT_LABEL} of all books: ${NO_TOKEN_DATA}`;
  return `${TOKENS_SHORT_LABEL} of all books: ${tokensShort(s.tokens)}${missingNote(s, "book", "books")}`;
}
