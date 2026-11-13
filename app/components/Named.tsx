import { StatePill } from "./Pills";
import { KIND_CHIP } from "./BoxCode";
import { chainStateWord, groupHelp, pageRunStatusWord, sessionShort } from "@/lib/readable-names";
import { listStateWord, pageStateWord } from "@/lib/run-view-words";

// Unit VW96 (round 91), card P31.3. Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Small pieces that the screens share: a plain state pill (the color still follows the state value), a raw ID in small grey text,
// a critique group code with its hover, and a short session ID with the full ID in the hover. The words come from lib/readable-names.ts
// and lib/run-view-words.ts (VW94). Box codes use components/BoxCode.tsx (Q-A 3:18.5 "Keep codes, explain on hover").
// A new file, because the dev server keeps old module instances (VW77a).

/** The raw name (stamp, folder, slug) in small grey text, so a person can find the folder. */
export function RawId({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span data-raw-id className="font-mono text-xs break-all text-muted" title={title}>
      {children}
    </span>
  );
}

/** State of a list (progress.json): "Translating now", "Translated", "Stopped". */
export function ListStatePill({ state }: { state: string }) {
  const w = listStateWord(state);
  return <StatePill state={state} label={w.label} help={w.help} />;
}

/** State of a page in a list: "Not started yet", "Translating now", "Translated". */
export function PageListStatePill({ state }: { state: string }) {
  const w = pageStateWord(state);
  return <StatePill state={state} label={w.label} help={w.help} />;
}

/** Status of a page run (summary.json): "Translated", "Translated, with failures", "No summary yet". */
export function PageRunStatusPill({ status }: { status: string }) {
  const w = pageRunStatusWord(status);
  return <StatePill state={status} label={w.label} help={w.help} />;
}

/** State of a chain row in a list-summary. */
export function ChainStatePill({ state }: { state: string }) {
  const w = chainStateWord(state);
  return <StatePill state={state} label={w.label} help={w.help} />;
}

/** A critique group code (TS, TL, ED, QA) with its hover, the same dotted underline as a box code. Another text shows as it is. */
export function GroupCode({ code }: { code: string }) {
  const help = groupHelp(code);
  if (!help) return <>{code}</>;
  return (
    <span data-group-code={code} title={help} className={`relative cursor-help underline decoration-dotted underline-offset-2 rounded px-1 ${KIND_CHIP[code] ?? ""}`}>
      {code}
      <span className="sr-only"> ({help})</span>
    </span>
  );
}

/** A session ID in short form ("…a1b2c3") with the full ID in the hover. */
export function SessionId({ id }: { id: string }) {
  return (
    <span data-session-id={id} title={`Full session ID: ${id}`}>
      {sessionShort(id)}
    </span>
  );
}
