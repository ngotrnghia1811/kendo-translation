"use client";
import { createContext, useContext, type ReactNode } from "react";
import { VIEW_PATH, type ViewAs, type ViewChoice } from "@/lib/view-as";

// Unit VW119 (plan item P56, Q-A 3:103.5 rows 1 to 4): what the select "View as" and the band need from the server, without a token and without a user.
// The root layout reads the session once and gives three flags: `admin` (the real role is admin), `view` (the view of the admin, or null), and `monitor`.
// The bars (ReaderBar, HtvBar) draw the select with the context, so no page needs a new prop. Without a provider (a test, an old page) the context is null and
// the select and the band draw nothing.

export interface ViewAsState {
  admin: boolean;
  view: ViewAs | null;
  monitor: boolean;
}

const ViewAsContext = createContext<ViewAsState | null>(null);

export function ViewAsProvider({ admin, view, monitor, children }: ViewAsState & { children: ReactNode }) {
  return <ViewAsContext.Provider value={{ admin, view, monitor }}>{children}</ViewAsContext.Provider>;
}

export function useViewAs(): ViewAsState | null {
  return useContext(ViewAsContext);
}

/**
 * Ask the route to set the view. Returns "" when it worked, else the plain line of the answer.
 * The caller reloads the page after a success: a full load makes every server part (the top bar links, the hidden lines, the address rules) act as the new role.
 */
export async function sendView(choice: ViewChoice): Promise<string> {
  try {
    const r = await fetch(VIEW_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ view: choice }) });
    if (r.ok) return "";
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    return j.error ?? "The view did not change.";
  } catch {
    return "The view did not change.";
  }
}
