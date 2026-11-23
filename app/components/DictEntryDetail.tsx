// Unit VW126 (Q-A 3:117.6 row 4): the full entry of the dictionary. It shows all fields that the term pop-up of the reading view shows (headword, readings, romaji, kind, each language with its terms and definitions,
// the label "agent-written"), plus the other writings of the headword and the sources. No hook, so a server page renders it.
import Link from "next/link";
import { DICT_WORDS, dictHref, type DictEntryView } from "@/lib/dictionary-core";

const LANG_NAMES: Record<string, string> = { ja: "JA", en: "EN", zh: "ZH", vi: "VI", ko: "KO" };

function AgentTag() {
  return <span className="ml-1 rounded bg-stone-200 px-1 text-[10px] font-medium text-stone-700">agent-written</span>;
}

export default function DictEntryDetail({ entry, backQuery }: { entry: DictEntryView; backQuery: string }) {
  return (
    <article data-dict-detail={entry.id} className="rounded border border-line bg-white p-4">
      <p className="mb-3 text-sm">
        <Link href={dictHref({ q: backQuery })} className="text-accent underline" data-dict-back>
          ‹ {DICT_WORDS.back}
        </Link>
      </p>
      <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span lang="ja" className="font-ja text-2xl font-semibold" data-dict-headword>
          {entry.headword}
        </span>
        {entry.readings.length ? (
          <span lang="ja" className="font-ja text-lg text-muted" data-dict-readings>
            {entry.readings.join(", ")}
          </span>
        ) : null}
        {entry.romaji ? (
          <span className="font-serif text-lg italic" data-dict-romaji>
            {entry.romaji}
          </span>
        ) : null}
      </h2>
      <div className="mt-2 space-y-1 text-sm text-muted">
        {entry.common ? <div data-dict-kind>Kind: {entry.common}</div> : null}
        {entry.variants.length ? (
          <div lang="ja" data-dict-variants>
            {DICT_WORDS.variantsLabel}: <span className="font-ja text-foreground">{entry.variants.join(", ")}</span>
          </div>
        ) : null}
        {entry.insideLonger ? <div>{DICT_WORDS.insideLonger}</div> : null}
      </div>
      <div className="mt-3 space-y-3">
        {entry.langs.map((l) => (
          <section key={l.lang} className="border-t border-line/60 pt-2" data-dict-lang={l.lang}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">{LANG_NAMES[l.lang] ?? l.lang}</h3>
            {l.terms.map((t, i) => (
              <div key={i} data-dict-term>
                <span className="font-medium">{t.term}</span>
                {t.preferred ? <span className="ml-1 text-xs text-muted">preferred</span> : null}
                {t.agentWritten ? <AgentTag /> : null}
              </div>
            ))}
            {l.definitions.map((d, i) => (
              <p key={i} className="mt-1 text-muted" data-dict-definition>
                {d.text}
                {d.agentWritten ? <AgentTag /> : null}
              </p>
            ))}
          </section>
        ))}
      </div>
      {entry.sources.length ? (
        <details className="mt-3 text-xs text-muted" data-dict-sources>
          <summary className="cursor-pointer">
            {DICT_WORDS.sourcesLabel} ({entry.sources.length})
          </summary>
          <p className="mt-1 break-words">{entry.sources.join(", ")}</p>
        </details>
      ) : null}
    </article>
  );
}
