"use client";
import { useEffect, useState } from "react";
import { OFFLINE_WORDS, formatMb, updatePages, percentOf, pstDate, type OfflineCopy, type OfflinePlan } from "@/lib/offline-copy";
import { fetchPlan, offlineSupported, pruneCopy, readCopy, registerOfflineWorker, removeCopy, saveCopy, OfflineError } from "@/lib/offline-copy-client";

/*
 * The control "Read offline" of the book screen /read/<book> (unit VW131, Q-A 3:134.3 rows 1, 2 and 4).
 * ReaderBook draws it for an approved account that is not a visitor of a view-only link (canSaveOffline). An admin in "View as" Reader sees it too.
 *   no copy        button "Read offline". A click asks the server for the size, then shows "Save 12.6 MB for offline reading?" with Save and Cancel.
 *   saving         a progress bar and the line "Saving: 3.2 of 12.6 MB."
 *   saved          "Saved for offline on 2026-11-25 (12.6 MB)." and the button "Remove offline copy".
 *                  "Update offline copy" shows when the book has pages with text that the copy lacks.
 * When a copy exists, the screen asks the server for the page list (no size). Pages that the reader can no longer read leave the copy (gate).
 * A 401 or 403 answer removes every copy of the device (row 6). A 404 answer (the book is hidden now) removes this copy.
 */

type State =
  | { kind: "checking" }
  | { kind: "none"; note: string }
  | { kind: "counting" }
  | { kind: "ask"; plan: OfflinePlan }
  | { kind: "saving"; done: number; total: number; update: boolean }
  | { kind: "saved"; copy: OfflineCopy; fresh: number[] }
  | { kind: "unsupported" };

const primary = "min-h-[44px] rounded bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50 md:min-h-0 md:py-1.5";
const plain = "min-h-[44px] rounded border border-line px-3 py-2 disabled:opacity-50 md:min-h-0 md:py-1";

function bytesOf(c: OfflinePlan): number {
  return c.textBytes + c.imageBytes;
}

export default function OfflineSave({ slug }: { slug: string }) {
  const [st, setSt] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let live = true;
    const set = (s: State) => {
      if (live) setSt(s);
    };
    (async () => {
      if (!offlineSupported()) return set({ kind: "unsupported" });
      const copy = await readCopy(slug);
      if (!copy) return set({ kind: "none", note: "" });
      // Keep the service worker current. The browser checks the file for a change (updateViaCache "none").
      void registerOfflineWorker().catch(() => undefined);
      if (!navigator.onLine) return set({ kind: "saved", copy, fresh: [] });
      const { plan, status } = await fetchPlan(slug, false).catch(() => ({ plan: null, status: 0 }));
      if (status === 401 || status === 403) return set({ kind: "none", note: OFFLINE_WORDS.removed });
      if (status === 404) {
        await removeCopy(slug);
        return set({ kind: "none", note: OFFLINE_WORDS.removed });
      }
      if (!plan) return set({ kind: "saved", copy, fresh: [] });
      const kept = await pruneCopy(copy, plan);
      set({ kind: "saved", copy: kept, fresh: updatePages(plan, kept) });
    })().catch(() => set({ kind: "none", note: "" }));
    return () => {
      live = false;
    };
  }, [slug]);

  async function ask() {
    setSt({ kind: "counting" });
    try {
      const { plan, status } = await fetchPlan(slug, true);
      if (!plan) return setSt({ kind: "none", note: OFFLINE_WORDS.failed(`The server answered ${status}.`) });
      setSt({ kind: "ask", plan });
    } catch {
      setSt({ kind: "none", note: OFFLINE_WORDS.failed("There is no network.") });
    }
  }

  async function save(plan: OfflinePlan, update: boolean, before: State) {
    setSt({ kind: "saving", done: 0, total: bytesOf(plan), update });
    try {
      if (navigator.storage?.estimate && !update) {
        const est = await navigator.storage.estimate();
        if (est.quota !== undefined && est.usage !== undefined && est.quota - est.usage < bytesOf(plan)) throw new OfflineError(OFFLINE_WORDS.noSpace);
      }
      const copy = await saveCopy(plan, (p) => setSt({ kind: "saving", done: p.doneBytes, total: p.totalBytes, update }));
      setSt({ kind: "saved", copy, fresh: [] });
    } catch (e) {
      const why = e instanceof Error ? e.message : "The save failed.";
      if (update && before.kind === "saved") return setSt({ ...before });
      setSt({ kind: "none", note: OFFLINE_WORDS.failed(why) });
    }
  }

  async function update(before: State) {
    setSt({ kind: "saving", done: 0, total: 0, update: true });
    try {
      const { plan } = await fetchPlan(slug, true);
      if (!plan) return setSt(before);
      await save(plan, true, before);
    } catch {
      setSt(before);
    }
  }

  async function remove() {
    await removeCopy(slug);
    setSt({ kind: "none", note: OFFLINE_WORDS.removed });
  }

  if (st.kind === "checking") return null;
  return (
    <section className="mb-4 max-w-3xl rounded border border-line bg-white p-3 text-sm" aria-label="Offline copy" data-offline>
      {st.kind === "unsupported" ? <p className="text-muted">{OFFLINE_WORDS.noSupport}</p> : null}
      {st.kind === "none" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void ask()} className={primary} data-offline-save>
            {OFFLINE_WORDS.save}
          </button>
          {st.note ? (
            <span role="status" data-offline-note>
              {st.note}
            </span>
          ) : null}
        </div>
      ) : null}
      {st.kind === "counting" ? (
        <p role="status" data-offline-counting>
          {OFFLINE_WORDS.counting}
        </p>
      ) : null}
      {st.kind === "ask" ? (
        <div className="flex flex-wrap items-center gap-3" data-offline-ask>
          <span className="font-semibold">{OFFLINE_WORDS.ask(formatMb(bytesOf(st.plan)))}</span>
          <button type="button" onClick={() => void save(st.plan, false, st)} className={primary} data-offline-yes>
            {OFFLINE_WORDS.yes}
          </button>
          <button type="button" onClick={() => setSt({ kind: "none", note: "" })} className={plain} data-offline-no>
            {OFFLINE_WORDS.no}
          </button>
        </div>
      ) : null}
      {st.kind === "saving" ? (
        <div data-offline-saving>
          <div role="progressbar" aria-label={st.update ? OFFLINE_WORDS.updating : OFFLINE_WORDS.save} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentOf(st.done, st.total)} className="h-3 w-full overflow-hidden rounded border border-line" data-offline-progress>
            <div className="h-full bg-accent" style={{ width: `${percentOf(st.done, st.total)}%` }} />
          </div>
          <p role="status" className="mt-1">
            {st.total > 0 ? OFFLINE_WORDS.saving(formatMb(st.done), formatMb(st.total)) : OFFLINE_WORDS.updating}
          </p>
        </div>
      ) : null}
      {st.kind === "saved" ? (
        <div className="flex flex-wrap items-center gap-3" data-offline-saved>
          <span>{OFFLINE_WORDS.saved(pstDate(st.copy.savedAt), formatMb(bytesOf(st.copy)))}</span>
          {st.fresh.length > 0 ? (
            <>
              <span data-offline-update-note>{OFFLINE_WORDS.updateNote(st.fresh.length)}</span>
              <button type="button" onClick={() => void update(st)} className={primary} data-offline-update>
                {OFFLINE_WORDS.update}
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => void remove()} className={plain} data-offline-remove>
            {OFFLINE_WORDS.remove}
          </button>
        </div>
      ) : null}
    </section>
  );
}
