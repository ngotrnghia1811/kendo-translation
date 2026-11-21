"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LINK_NAME_MAX, type LinkState } from "@/lib/view-link";

// Admin page of the view-only links (unit VW120, plan item P58). Owner request (Q-A 3:105.8, 2026-11-20 23:43 PST): "Can we create a view-only link: people with link
// can be a reader without sign-up, but all operation is only strictly view-only?" Q-A 3:106.5 rows 1 and 6, Q-A 3:107.5 rows 6 and 8.
// The form makes a link: a name (who gets it) and an optional end date. Each link shows its name, the full link with a button Copy, the day it was made, the end date,
// the number of opens, the last open, and its state. The button "Turn off" asks once more, then turns the link off for good (the record stays).
// All times and dates are PST. The full link holds the key, so only the admin page shows it.
export interface LinkItem {
  id: string;
  name: string;
  /** The full link, `<origin>/v/<key>`. */
  url: string;
  /** PST day the link was made, `YYYY-MM-DD`. */
  made: string;
  /** PST day of the end, `YYYY-MM-DD`, or "" for no end. */
  ends: string;
  opens: number;
  /** PST time of the last open, or "" when nobody opened the link. */
  lastOpen: string;
  state: LinkState;
}

const STATE_TEXT: Record<LinkState, string> = { on: "On", off: "Off", ended: "Ended" };
const STATE_CLASS: Record<LinkState, string> = { on: "bg-state-ok text-state-ok-ink", off: "bg-state-wait text-state-wait-ink", ended: "bg-state-stop text-state-stop-ink" };

export default function AdminLinks({ items }: { items: LinkItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [asking, setAsking] = useState("");

  async function send(method: "POST" | "PATCH", body: unknown, busyKey: string): Promise<boolean> {
    setBusy(busyKey);
    setError("");
    try {
      const r = await fetch("/api/admin/links", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "The change failed.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy("");
    }
  }

  async function make(e: React.FormEvent) {
    e.preventDefault();
    if (await send("POST", { name, ends }, "make")) {
      setName("");
      setEnds("");
    }
  }

  async function copy(item: LinkItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.id);
      setTimeout(() => setCopied((c) => (c === item.id ? "" : c)), 2000);
    } catch {
      setError("The browser did not allow the copy. Select the link and copy it by hand.");
    }
  }

  return (
    <div data-admin-links>
      <p className="mb-3 max-w-3xl text-sm text-muted">
        A person with a link reads the books that you opened to readers, with no sign-up. The link is view-only: no bookmarks, no reading place, no comments. Give each link a name, for example the
        club that gets it. Dates and times are PST.
      </p>
      <form onSubmit={make} className="mb-5 flex flex-wrap items-end gap-3 rounded border border-line bg-white p-3 text-sm" data-link-form>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Name (who gets the link)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={LINK_NAME_MAX}
            required
            placeholder="Kendo club Berlin"
            className="w-72 max-w-full rounded border border-line bg-white px-2 py-1 text-sm text-foreground placeholder:text-muted"
            data-link-name
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">End date (optional)</span>
          <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className="rounded border border-line bg-white px-2 py-1 text-sm text-foreground" data-link-ends />
        </label>
        <button type="submit" disabled={busy === "make" || !name.trim()} className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50" data-link-make>
          {busy === "make" ? "Making…" : "Make link"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-700" data-link-error>
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted" data-links-empty>
          No link yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-links-list>
          {items.map((i) => (
            <li key={i.id} data-link={i.id} data-link-state={i.state} className="rounded border border-line bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold" data-link-title>
                  {i.name}
                </span>
                <span className={"rounded px-2 py-0.5 text-xs font-semibold " + STATE_CLASS[i.state]} data-link-state-label>
                  {STATE_TEXT[i.state]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor={`link-url-${i.id}`} className="sr-only">
                  Link for {i.name}
                </label>
                <input
                  id={`link-url-${i.id}`}
                  type="text"
                  readOnly
                  value={i.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 basis-72 rounded border border-line bg-white px-2 py-1 font-mono text-xs text-foreground"
                  data-link-url
                />
                <button type="button" onClick={() => void copy(i)} className="rounded border border-line px-3 py-1 text-sm" data-link-copy>
                  {copied === i.id ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-muted" data-link-meta>
                Made {i.made || "–"}. Ends {i.ends || "No end"}. Opens {i.opens}. Last open {i.lastOpen || "never"}.
              </p>
              {i.state === "on" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {asking === i.id ? (
                    <>
                      <span>Turn this link off for good?</span>
                      <button
                        type="button"
                        disabled={busy === i.id}
                        onClick={async () => {
                          if (await send("PATCH", { id: i.id }, i.id)) setAsking("");
                        }}
                        className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                        data-link-off-yes
                      >
                        Yes, turn off
                      </button>
                      <button type="button" onClick={() => setAsking("")} className="rounded border border-line px-3 py-1 text-sm">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setAsking(i.id)} className="rounded border border-line px-3 py-1 text-sm" data-link-off>
                      Turn off
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
