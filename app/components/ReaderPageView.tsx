"use client";
import { MarkedText, type PickedTerm } from "./HtvMarkedText";
import { FONT_STACKS, type ReaderSettings } from "@/lib/htv-settings";
import { LABEL_AGENT_UNCHECKED, LABEL_AGREE_ROW, NO_TEXT, type ReaderMark, type ReaderPageData, type ReaderViewRow } from "@/lib/reader-types";
import type { TermMark } from "@/lib/htv-types";

/*
 * The text of one page on the reader pages (unit RC1, round 63). Three text modes (round 62 answer 8, Q-A 2026-10-28 l290):
 *   en    single language English
 *   ja    single language Japanese
 *   pair  bilingual pairing: for each row, Japanese beside English on a wide screen, Japanese above English on a phone
 * The EN text is the agent text (default, with the AI label) or the human version that an admin chose for the page.
 * The research layer never reaches this component: the data has no verdict, no score, no QA, no TL_3 panel, and no reasoning.
 */

export type EffectiveSettings = Required<ReaderSettings>;

/** A reader mark has no EN form check. The term pop-up reads the fields result and detail, so they are null here. */
function asTermMarks(marks: ReaderMark[]): TermMark[] {
  return marks.map((m) => ({ ...m, result: null, detail: null }));
}

interface Shown {
  text: string;
  marks: ReaderMark[];
  /** The small tag of the row, or "". */
  tag: string;
}

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
  const mode: "agent" | "human" = s.en === "human" && data.hasHuman ? "human" : "agent";
  const enStyle = { fontFamily: FONT_STACKS[s.fontEn], fontSize: `${s.size}px`, lineHeight: s.line };
  const jaStyle = { fontFamily: FONT_STACKS[s.fontJa], fontSize: `${s.size}px`, lineHeight: s.line };
  const maxWidth = focus ? "72ch" : s.text === "pair" ? (s.width === "wide" ? "120ch" : "100ch") : s.width === "wide" ? "96ch" : "72ch";
  const label = mode === "human" ? data.label.human : data.label.agent || LABEL_AGENT_UNCHECKED;
  const section = (
    <section id={`p${String(data.n).padStart(3, "0")}`} data-section={data.pageId} data-page-n={data.n} className="mx-auto w-full scroll-mt-28" style={{ maxWidth }}>
      {focus ? null : (
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-1">
          <h2 className="text-base font-semibold" data-page-name>
            {data.name}
          </h2>
          {data.hasText ? (
            <p className="text-sm text-muted" data-ai-label>
              {label}
            </p>
          ) : null}
        </header>
      )}
      {!data.hasText ? (
        <p className="rounded border border-line p-3 text-sm text-muted" data-no-text>
          {NO_TEXT}
        </p>
      ) : (
        <div className="space-y-5">
          {data.rows.map((row) => {
            const en = shownEn(row, mode);
            const isTitle = row.part === "block_title";
            const jaNode = (
              <p lang="ja" style={jaStyle} className={isTitle ? "font-semibold" : ""} data-ja>
                <MarkedText text={row.ja} marks={asTermMarks(row.jaMarks)} onPick={onPick} />
              </p>
            );
            const enNode = (
              <p lang="en" style={enStyle} className={isTitle ? "font-semibold" : ""} data-en>
                {en.text ? <MarkedText text={en.text} marks={asTermMarks(en.marks)} onPick={onPick} /> : <span className="text-muted">No English text for this row.</span>}
                <Tag text={focus ? "" : en.tag} />
              </p>
            );
            return (
              <div key={row.key} data-row={row.key} data-row-kind={isTitle ? "title" : "text"}>
                {s.text === "en" ? enNode : null}
                {s.text === "ja" ? jaNode : null}
                {s.text === "pair" ? (
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
