"use client";
import { MarkedText, type PickedTerm } from "./HtvMarkedText";
import { FONT_STACKS, type ReaderSettings } from "@/lib/htv-settings";
import { LABEL_AGENT_UNCHECKED, LABEL_AGREE_ROW, LABEL_V1_JA, NO_PAGE_TEXT, type ReaderMark, type ReaderPageData, type ReaderViewRow } from "@/lib/reader-types";
import type { TermMark } from "@/lib/htv-types";

/*
 * The text of one page on the reader pages (unit RC1, round 63). Three text modes (round 62 answer 8, Q-A 2026-10-28 l290):
 *   en    single language English
 *   ja    single language Japanese
 *   pair  bilingual pairing: for each row, Japanese beside English on a wide screen, Japanese above English on a phone
 * The EN text is the agent text (default, with the AI label) or the human version of the page.
 * The research layer never reaches this component: the data has no verdict, no score, no QA, no TL_3 panel, and no reasoning.
 *
 * Unit RT73a (round 73, VISION-viewer 15.26): the page shows what is available. Owner rule: "Even if there is no translated data, you still have to show the full original data".
 *   - A web article page shows its Original text rows (JA) and its Human version (the kendojidai.com text, no AI label).
 *   - 18d4ac29 has agent rows and web rows in one record. The EN text control picks the family: Agent shows the agent rows, Human shows the web rows.
 *   - A page with no Agent text and no Human version shows the v1 placeholder (if the md file exists on this machine) with its page line.
 *   - A page with no EN text shows the JA text. A page with nothing shows "No text for this page yet.".
 * Components, panels, the Original text button, and the on-screen fact marks come with unit RT73b.
 */

export type EffectiveSettings = Required<Omit<ReaderSettings, "panelSeen">> & { panelSeen?: boolean };

/** A reader mark has no EN form check. The term pop-up reads the fields result and detail, so they are null here. */
function asTermMarks(marks: ReaderMark[]): TermMark[] {
  return marks.map((m) => ({ ...m, result: null, detail: null }));
}

/**
 * Which English text a page shows (unit RT73a). The choice of the reader (EN text: Agent | Human) wins when the page has that text.
 * Else the page shows the text that it has. "none" means that the page has no Agent text and no Human version.
 */
export function enSourceOf(data: Pick<ReaderPageData, "hasAgent" | "hasHuman">, want: "agent" | "human"): "agent" | "human" | "none" {
  if (want === "human" && data.hasHuman) return "human";
  if (data.hasAgent) return "agent";
  if (data.hasHuman) return "human";
  return "none";
}

interface Shown {
  text: string;
  marks: ReaderMark[];
  /** The small tag of the row, or "". */
  tag: string;
}

const NO_SHOWN: Shown = { text: "", marks: [], tag: "" };

function shownEn(row: ReaderViewRow, mode: "agent" | "human"): Shown {
  if (mode === "human" && row.human) {
    if (row.human.kind === "own") return { text: row.human.text, marks: row.human.marks, tag: "" };
    if (row.human.kind === "agree") return { text: row.human.text, marks: row.human.marks, tag: LABEL_AGREE_ROW };
    return { text: row.human.text, marks: row.human.marks, tag: "AI translation" };
  }
  return { text: row.agent.text, marks: row.agent.marks, tag: row.agent.agreedByTranslator ? LABEL_AGREE_ROW : "" };
}

function Tag({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 align-middle text-[11px] font-medium text-stone-700" data-row-tag>
      {text}
    </span>
  );
}

/** One row of the screen, whatever its source (agent row, web row, or v1 block). */
interface VRow {
  key: string;
  part: "lines" | "block_title";
  ja: string;
  jaMarks: ReaderMark[];
  en: Shown;
}

export default function ReaderPageView({
  data,
  s,
  onPick,
  focus,
}: {
  data: ReaderPageData;
  s: EffectiveSettings;
  onPick: (p: PickedTerm) => void;
  focus: boolean;
}) {
  const eff = enSourceOf(data, s.en);
  const placeholder = !data.hasText && data.v1.length > 0;
  // The family of rows: a web article page has rows with web keys. 18d4ac29 has agent rows and web rows. Human shows the web rows, Agent shows the other rows.
  const webRows = data.rows.filter((r) => r.web);
  const plainRows = data.rows.filter((r) => !r.web);
  const useWeb = eff === "human" ? webRows.length > 0 : eff === "none" && plainRows.length === 0;
  const rows = useWeb ? webRows : webRows.length > 0 && plainRows.length > 0 ? plainRows : data.rows;
  const skipEmpty = useWeb || placeholder || eff === "none";
  const all: VRow[] = placeholder
    ? data.v1.map((v) => ({ key: v.key, part: "lines" as const, ja: v.ja, jaMarks: [], en: { text: v.en, marks: [], tag: "" } }))
    : rows.map((r) => ({ key: r.key, part: r.part, ja: r.ja, jaMarks: r.jaMarks, en: eff === "none" ? NO_SHOWN : shownEn(r, eff) }));
  const hasEn = all.some((r) => r.en.text.trim() !== "");
  const hasJa = all.some((r) => r.ja.trim() !== "");
  // Show what is available (owner rule of round 72). No English text on the page: the Original text shows. No Japanese text: the English text shows.
  let textMode = s.text;
  let note = "";
  if (textMode !== "ja" && !hasEn && hasJa) {
    textMode = "ja";
    note = "No English text for this page yet. The Original text shows.";
  } else if (textMode === "ja" && !hasJa && hasEn) {
    textMode = "en";
    note = "No Japanese text for this page. The English text shows.";
  }
  const shown = all.filter((r) => (textMode === "en" ? !skipEmpty || r.en.text.trim() !== "" : textMode === "ja" ? r.ja.trim() !== "" : r.ja.trim() !== "" || r.en.text.trim() !== ""));
  const enStyle = { fontFamily: FONT_STACKS[s.fontEn], fontSize: `${s.size}px`, lineHeight: s.line };
  const jaStyle = { fontFamily: FONT_STACKS[s.fontJa], fontSize: `${s.size}px`, lineHeight: s.line };
  const maxWidth = focus ? "72ch" : textMode === "pair" ? (s.width === "wide" ? "120ch" : "100ch") : s.width === "wide" ? "96ch" : "72ch";
  const label = placeholder ? (textMode === "ja" ? LABEL_V1_JA : data.label.v1) : eff === "human" ? data.label.human : eff === "agent" ? data.label.agent || LABEL_AGENT_UNCHECKED : "";
  const section = (
    <section id={`p${String(data.n).padStart(3, "0")}`} data-section={data.pageId} data-page-n={data.n} className="mx-auto w-full scroll-mt-28" style={{ maxWidth }}>
      {focus ? null : (
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-1">
          <h2 className="text-base font-semibold" data-page-name>
            {data.name}
          </h2>
          {(data.hasText || placeholder) && label ? (
            <p className="text-sm text-muted" data-ai-label data-label-kind={placeholder ? "v1" : eff}>
              {label}
            </p>
          ) : null}
        </header>
      )}
      {!data.hasText && !placeholder ? (
        <p className="rounded border border-line p-3 text-sm text-muted" data-no-text>
          {NO_PAGE_TEXT}
        </p>
      ) : (
        <div className="space-y-5">
          {note && !focus ? (
            <p className="text-xs text-muted" data-page-note>
              {note}
            </p>
          ) : null}
          {shown.map((row) => {
            const isTitle = row.part === "block_title";
            const jaNode = (
              <p lang="ja" style={jaStyle} className={isTitle ? "font-semibold" : ""} data-ja>
                <MarkedText text={row.ja} marks={asTermMarks(row.jaMarks)} onPick={onPick} />
              </p>
            );
            const enNode = (
              <p lang="en" style={enStyle} className={isTitle ? "font-semibold" : ""} data-en>
                {row.en.text ? <MarkedText text={row.en.text} marks={asTermMarks(row.en.marks)} onPick={onPick} /> : <span className="text-muted">No English text for this row.</span>}
                <Tag text={focus ? "" : row.en.tag} />
              </p>
            );
            return (
              <div key={row.key} data-row={row.key} data-row-kind={isTitle ? "title" : "text"}>
                {textMode === "en" ? enNode : null}
                {textMode === "ja" ? jaNode : null}
                {textMode === "pair" ? (
                  <div className="grid gap-2 md:grid-cols-2 md:gap-6" data-pair>
                    <div className="border-l-4 border-red-700 pl-3">{jaNode}</div>
                    <div className="border-l-4 border-blue-800 pl-3">{enNode}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {data.extras.length > 0 ? (
            <aside className="border-t border-line pt-3" data-extras aria-label="Photo captions and running head">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Photo captions</h3>
              <ul className="space-y-2">
                {data.extras.map((x) => (
                  <li key={x.id} data-extra={x.id} className="text-[0.9em]">
                    {s.text !== "en" && x.ja ? (
                      <p lang="ja" style={{ ...jaStyle, fontSize: `${s.size * 0.9}px` }}>
                        {x.ja}
                      </p>
                    ) : null}
                    {s.text !== "ja" ? (
                      <p lang="en" style={{ ...enStyle, fontSize: `${s.size * 0.9}px` }}>
                        {x.kind === "running_head" ? <span className="mr-1 text-xs uppercase text-muted">Running head</span> : null}
                        {x.en}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
  return section;
}
