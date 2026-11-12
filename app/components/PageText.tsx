import type { StageText } from "@/lib/types";
import Reasoning from "./Reasoning";
import { BoxCode } from "./BoxCode"; // Unit VW96 (Q-A 3:18.5): box codes keep their place, the readable name shows on hover.

// Round 44 answer 13 (Q-A l142): ED_0 to ED_3 texts, line by line, with the JA text next to them.
//
// [agent inference] Design choice for clarity:
//  - "Read" mode: JA at the left, ONE ED stage at the right, two equal columns. A reader compares one pair at a time.
//    Four EN columns plus JA would be too narrow on a desktop screen (5 columns of about 240 px).
//  - "Compare" mode: JA at the left, the four ED stages stacked at the right. A stage line that equals the line of the
//    stage before shows "same as ED_k" in grey, so only real changes draw the eye (goal: fast comparison).

function itemKey(id: string): string {
  return id.replace(/^.*\/(?:ed\d|ED_\d)\//, "");
}

function shortId(id: string): string {
  return itemKey(id).split("/").pop() ?? id;
}

export function ReadText({ stage }: { stage: StageText }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-8 border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <div>
          JA (<BoxCode code={`TS_${stage.box.slice(-1)}`} />)
        </div>
        <div>
          EN (<BoxCode code={stage.box} />)
        </div>
      </div>
      {stage.items.map((it, idx) => {
        const head = idx === 0 || stage.items[idx - 1].section !== it.section;
        return (
          <div key={it.id}>
            {head && it.section !== "Body" ? <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">{it.section}</div> : null}
            <div className="grid grid-cols-2 gap-8 border-b border-line/60 py-2">
              <div className="font-ja text-[1.05rem] leading-relaxed">
                <span className="mr-2 align-top font-mono text-[10px] text-muted">{shortId(it.id)}</span>
                {it.jaText || <span className="text-muted">–</span>}
              </div>
              <div className="font-serif text-[1.05rem] leading-relaxed">{it.text}</div>
            </div>
          </div>
        );
      })}
      <TermList stage={stage} />
      <Reasoning text={stage.reasoning} label={stage.box} />
    </div>
  );
}

export function CompareText({ stages }: { stages: StageText[] }) {
  const last = stages[stages.length - 1];
  if (!last) return null;
  const byStage = stages.map((s) => new Map(s.items.map((i) => [itemKey(i.id), i.text])));
  return (
    <div>
      <div className="grid grid-cols-2 gap-8 border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <div>
          JA (<BoxCode code={`TS_${last.box.slice(-1)}`} />)
        </div>
        <div>EN (all stages)</div>
      </div>
      {last.items.map((it, idx) => {
        const key = itemKey(it.id);
        const head = idx === 0 || last.items[idx - 1].section !== it.section;
        return (
          <div key={it.id}>
            {head && it.section !== "Body" ? <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">{it.section}</div> : null}
            <div className="grid grid-cols-2 gap-8 border-b border-line/60 py-2">
              <div className="font-ja text-[1.05rem] leading-relaxed">
                <span className="mr-2 align-top font-mono text-[10px] text-muted">{shortId(it.id)}</span>
                {it.jaText || <span className="text-muted">–</span>}
              </div>
              <div className="space-y-1">
                {stages.map((s, k) => {
                  const text = byStage[k].get(key);
                  const prev = k > 0 ? byStage[k - 1].get(key) : undefined;
                  const same = k > 0 && text !== undefined && text === prev;
                  return (
                    <div key={s.box} className="flex gap-2">
                      <span className="mt-1 w-9 shrink-0 font-mono text-[10px] text-muted"><BoxCode code={s.box} /></span>
                      {text === undefined ? (
                        <span className="text-muted">–</span>
                      ) : same ? (
                        <span className="text-sm text-muted">same as <BoxCode code={stages[k - 1].box} /></span>
                      ) : (
                        <span className="font-serif text-[1.05rem] leading-relaxed">{text}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex flex-wrap gap-x-4">
        {stages.map((s) => (
          <Reasoning key={s.box} text={s.reasoning} label={s.box} />
        ))}
      </div>
    </div>
  );
}

function TermList({ stage }: { stage: StageText }) {
  if (stage.termList.length === 0) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">EN terms in <BoxCode code={stage.box} /> ({stage.termList.length})</summary>
      <ul className="mt-1 space-y-0.5">
        {stage.termList.map((t, k) => (
          <li key={k}>
            <span className="font-ja">{t.ja}</span> → <span className="font-serif">{t.en}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
