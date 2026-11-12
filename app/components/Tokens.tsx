// Token parts of the Viewer screens (unit VW93, round 91). Q-A 3:15.2 "Short in tables, all 5 in details", Q-A 3:15.3 "Show 'no token data'".
// The text comes from lib/tokens-view.ts. "no token data" uses the existing grey class text-muted (no new color, so scripts/contrast-dark.mjs needs no new pair).
import { NO_TOKEN_DATA, TOKEN_KEYS, TOKEN_KIND_HEADS, missingNote, tokenCell, tokensBody, tokensShort, type TokenCounts, type TokenSum } from "@/lib/tokens-view";

/** "no token data" in grey. */
export function NoTokenData() {
  return <span className="text-muted" data-no-token-data>{NO_TOKEN_DATA}</span>;
}

/** The short form for a table cell or a one-line place: "1,234,567 / 345,678", or "no token data" in grey. */
export function TokensShort({ tokens }: { tokens: TokenCounts | null }) {
  return tokens ? <span data-tokens-short>{tokensShort(tokens)}</span> : <NoTokenData />;
}

/** The 5-kind line with no "Tokens: " in front (the place shows the label), or "no token data" in grey. `sum` adds the note of the parts without token data. */
export function TokensDetail({ tokens, sum, one = "call", many = "calls" }: { tokens: TokenCounts | null; sum?: TokenSum; one?: string; many?: string }) {
  if (!tokens) return <NoTokenData />;
  const note = sum ? missingNote(sum, one, many) : "";
  return (
    <span data-tokens-detail>
      {tokensBody(tokens)}
      {note ? <span className="text-muted">{note}</span> : null}
    </span>
  );
}

/** The 5 column heads of a detail table: input, output, reasoning, cache read, cache write. */
export function TokenHeads({ className }: { className: string }) {
  return (
    <>
      {TOKEN_KIND_HEADS.map((h) => (
        <th key={h} className={className}>
          {h}
        </th>
      ))}
    </>
  );
}

/** The 5 cells of one row of a detail table. A row with no token data gets one cell over the 5 columns with "no token data" in grey. */
export function TokenCells({ tokens, className }: { tokens: TokenCounts | null; className: string }) {
  if (!tokens)
    return (
      <td colSpan={TOKEN_KEYS.length} className={className}>
        <NoTokenData />
      </td>
    );
  return (
    <>
      {TOKEN_KEYS.map((k) => (
        <td key={k} className={className}>
          {tokenCell(tokens, k)}
        </td>
      ))}
    </>
  );
}
