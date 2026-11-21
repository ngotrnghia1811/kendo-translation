"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { bandShowsOn, parseViewChoice, VIEW_CHOICES, type ViewChoice } from "@/lib/view-as";
import { sendView, useViewAs } from "./ViewAsProvider";

// Unit VW119 (plan item P56, Q-A 3:103.5 rows 1 and 2): the select "View as" in the top bar, for an account with the real role admin only.
// The choices are Admin (normal), Translator, and Reader. A choice calls /api/htv/view, then the page loads again so that every server part acts as the role.
// The select shows in a view too, so the admin can go back. A person with another role sees nothing, and the Monitor pages show nothing (row 8).
export default function ViewAsSelect() {
  const state = useViewAs();
  const path = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!state || !state.admin || !bandShowsOn(path, state.monitor)) return null;
  const current: ViewChoice = state.view ?? "admin";

  async function pick(raw: string) {
    const choice = parseViewChoice(raw);
    if (!choice || choice === current) return;
    setBusy(true);
    setError("");
    const err = await sendView(choice);
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <label className="inline-flex items-center gap-1" data-view-as>
      <span>View as</span>
      <select
        aria-label="View as"
        value={current}
        disabled={busy}
        onChange={(e) => void pick(e.target.value)}
        data-view-as-select
        className="min-h-[32px] rounded border border-line bg-white px-1 py-0.5 text-sm text-foreground disabled:opacity-50"
      >
        {VIEW_CHOICES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-muted" data-view-as-error>
          {error}
        </span>
      ) : null}
    </label>
  );
}
