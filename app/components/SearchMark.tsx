"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { foldQuery, matchRanges, SEARCH_WORDS } from "@/lib/search-core";

/*
 * Unit VW124 (Q-A 3:117.4 row 3: "A click opens that exact page with the match marked", Q-A 3:117.5 row 4: "marks the hit").
 * A hit link of the search carries the typed words in the address (?view=page&at=p048&q=seme). This component marks every match of those words in the text on the screen.
 * It uses the CSS Custom Highlight API (CSS.highlights, the rule ::highlight(search-hit) in app/globals.css), so the term marks and the layout of the text stay as they are.
 * The match is yellow (--color-amber-200) in each of the five themes. A browser without the API shows the status line and no yellow.
 * The marks follow the DOM: the pages that the Scroll view loads later get their marks too (MutationObserver). The first match of the page that the address names scrolls into view.
 * The words stay after the Scroll view replaces the address. A move to another page without `q` in the address, or the button "Clear mark", removes them.
 */

const HIGHLIGHT = "search-hit";
const TEXT_SELECTOR = "[data-ja], [data-en], [data-extra]";

interface HighlightRegistry {
  set(name: string, value: unknown): void;
  delete(name: string): void;
}

function registry(): HighlightRegistry | null {
  const r = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS?.highlights;
  return r ?? null;
}

/** All matches of the folded words in the text nodes of the page text on the screen, as DOM ranges, in document order. */
function rangesIn(root: ParentNode, folded: string): Range[] {
  const out: Range[] = [];
  root.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
    // A text box inside another text box (a caption in a row) counts once.
    if (el.parentElement?.closest(TEXT_SELECTOR)) return;
    const nodes: Text[] = [];
    const starts: number[] = [];
    let text = "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      starts.push(text.length);
      nodes.push(n as Text);
      text += (n as Text).data;
    }
    // The node that holds the character at `o` (start of a match), and the node that holds the character before `o` (end of a match).
    const locateStart = (o: number): [Text, number] | null => {
      for (let i = 0; i < nodes.length; i++) if (o < starts[i] + nodes[i].data.length) return [nodes[i], o - starts[i]];
      return null;
    };
    const locateEnd = (o: number): [Text, number] | null => {
      for (let i = 0; i < nodes.length; i++) if (o > starts[i] && o <= starts[i] + nodes[i].data.length) return [nodes[i], o - starts[i]];
      return null;
    };
    for (const [a, b] of matchRanges(text, folded)) {
      const s = locateStart(a);
      const e = locateEnd(b);
      if (!s || !e) continue;
      const r = document.createRange();
      r.setStart(s[0], s[1]);
      r.setEnd(e[0], e[1]);
      out.push(r);
    }
  });
  return out;
}

export default function SearchMark({ at, view }: { at: number | null; view: string }) {
  const params = useSearchParams();
  const fromAddress = foldQuery(params.get("q") ?? "");
  const [words, setWords] = useState(fromAddress);
  const [seen, setSeen] = useState({ at, view, fromAddress });
  const [count, setCount] = useState(0);

  // Follow the address while rendering (React guide "Adjusting state when a prop changes").
  if (seen.at !== at || seen.view !== view || seen.fromAddress !== fromAddress) {
    setSeen({ at, view, fromAddress });
    if (fromAddress) setWords(fromAddress);
    else if (seen.at !== at) setWords("");
  }

  useEffect(() => {
    const reg = registry();
    if (!words) {
      reg?.delete(HIGHLIGHT);
      return;
    }
    const root = document.querySelector("[data-reading]");
    if (!root) return;
    let frame = 0;
    let scrolled = false;
    const apply = () => {
      const ranges = rangesIn(root, words);
      setCount(ranges.length);
      const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
      if (reg && H) reg.set(HIGHLIGHT, new H(...ranges));
      if (!scrolled && ranges.length) {
        // The first match of the page that the address names. Else the first match on the screen.
        const section = at === null ? null : root.querySelector(`[data-page-n="${at}"]`);
        const first = (section ? ranges.find((r) => section.contains(r.startContainer)) : undefined) ?? ranges[0];
        const box = first.getBoundingClientRect();
        if (box.height > 0) {
          scrolled = true;
          window.scrollTo({ top: Math.max(0, box.top + window.scrollY - window.innerHeight * 0.35) });
        }
      }
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    later();
    const watch = new MutationObserver(later);
    watch.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame);
      reg?.delete(HIGHLIGHT);
    };
  }, [words, at, view]);

  if (!words) return null;
  const clear = () => {
    setWords("");
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search);
  };
  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" role="status" data-search-mark>
      <span>
        {SEARCH_WORDS.marked} <strong>{words}</strong>
        {count > 0 ? ` · ${count} on the screen` : ` · ${SEARCH_WORDS.markedNone}`}
      </span>
      <button type="button" onClick={clear} data-search-mark-clear className="min-h-[44px] rounded border border-line px-3 py-0.5 md:min-h-0">
        {SEARCH_WORDS.clearMark}
      </button>
    </p>
  );
}
