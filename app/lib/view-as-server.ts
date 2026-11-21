import "server-only";
import { getSession } from "./htv-session";
import type { ViewAs } from "./view-as";

// Unit VW119 (plan item P56, Q-A 3:103.5): what the root layout needs for the select "View as" and the band. Two flags and no token, no user, no e-mail address.
// A fault of PocketBase hides both and breaks no page (the same rule as canReportIssues of unit VW118). This file is new on purpose (VW77a: old module instances).

export interface ViewInfo {
  /** The real role of the account is admin. */
  admin: boolean;
  /** The view of the admin, or null. */
  view: ViewAs | null;
}

export async function viewInfo(): Promise<ViewInfo> {
  try {
    const s = await getSession();
    return s && s.realRole === "admin" ? { admin: true, view: s.view } : { admin: false, view: null };
  } catch {
    return { admin: false, view: null };
  }
}
