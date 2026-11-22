import "server-only";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSession } from "./htv-session";
import { pstDateTime } from "./pst";
import { resolveInside } from "./safe-path";
import { canReportIssues } from "./visual-issues";
import type { IssueInput } from "./visual-issue-rules";
import { isLocalIssueId, issueToolMode, localIssueId, LOCAL_LIST_MAX, newestFirst, NOT_SIGNED_IN, parseLocalIssue, SENDER_UNKNOWN, type LocalIssueView } from "./visual-issues-local-rules";

/*
 * Unit VW121 (plan item P60, Q-A 3:112.2 rows 3 to 6, Q-A 3:110.2 "Icon for all on this Mac"): the visual issues of this Mac are files, not PocketBase records.
 * One folder for each issue below <Viewer repo>/data/visual-issues-local/ (git ignores data/*):
 *   <id>/picture.png   the picture that the person drew on
 *   <id>/issue.json    comment, page address, screen width, theme, time (UTC and PST), who sent it ("not signed in" or the name), state
 * The folder is NOT a request value: it comes from the working folder of the app (process.cwd() is <Viewer repo>/app, so ../data/visual-issues-local).
 * The name of an issue folder is made here (PST time and 6 random hex characters). A request can only name an existing issue by that form, and every read and write goes
 * through resolveInside (lib/safe-path.ts: no "..", no absolute path, no link that leaves the folder).
 * The routes call these functions only after the Monitor switch check. A new file on purpose: the dev server keeps old module instances (VW77a).
 * Every function takes the folder as the last argument, so scripts/vw121-test.mjs can use a made-up folder. The routes never pass it.
 */

/** The folder of the issues. Relative to the app folder, never from a request. The comment tells the build not to trace the whole project for this path (as in lib/config.ts). */
export function localIssuesRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), "..", "data", "visual-issues-local");
}

/** Who the issue comes from. A signed-in person gives the readable name (never the e-mail address, Q-A 3:17.4) and the real role. Nobody gives "not signed in". */
export interface Sender {
  sentBy: string;
  role: string;
  viewedAs: string;
}

export async function senderOfRequest(): Promise<Sender> {
  try {
    const s = await getSession();
    if (!s) return { sentBy: NOT_SIGNED_IN, role: "", viewedAs: "" };
    return { sentBy: s.user.name.trim() || "(no name)", role: s.realRole, viewedAs: s.view ?? "" };
  } catch {
    // A fault of the sign-in server must not stop the save. The file says that the sender is not known.
    return { sentBy: SENDER_UNKNOWN, role: "", viewedAs: "" };
  }
}

/** Rows 1 and 2: the flags for the layout. With the Monitor switch on the tool shows for everyone and saves to the folder. Off: a translator or admin, and PocketBase, as before. */
export async function issueToolFlags(monitor: boolean): Promise<{ show: boolean; local: boolean }> {
  return issueToolMode(monitor, monitor ? false : await canReportIssues());
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

/**
 * Row 3: save one issue. `f` is the checked input (lib/visual-issue-rules.ts checkIssueInput), `png` the checked picture bytes.
 * The folder is made with mkdir (it fails if the name exists, then a new name is tried). The picture goes first and issue.json last,
 * so the list never shows an issue without its picture. If a write fails, the new folder is removed and the error goes on. Returns the issue ID (the folder name).
 */
export async function saveLocalIssue(f: IssueInput, png: Uint8Array, who: Sender, root: string = localIssuesRoot(), nowMs: number = Date.now()): Promise<string> {
  await fs.mkdir(root, { recursive: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = localIssueId(nowMs, randomBytes(3).toString("hex"));
    const dir = await resolveInside(id, root);
    try {
      await fs.mkdir(dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw e;
    }
    try {
      await fs.writeFile(path.join(dir, "picture.png"), png, { flag: "wx" });
      await writeJsonAtomic(path.join(dir, "issue.json"), {
        id,
        state: "open",
        comment: f.comment,
        page_url: f.pageUrl,
        screen_width: f.screenWidth,
        theme: f.theme,
        created_utc: new Date(nowMs).toISOString(),
        created_pst: pstDateTime(nowMs / 1000),
        sent_by: who.sentBy,
        sent_by_role: who.role || null,
        viewed_as: who.viewedAs || null,
        picture: "picture.png",
        resolved_utc: null,
        resolved_pst: null,
      });
    } catch (e) {
      await fs.rm(dir, { recursive: true, force: true });
      throw e;
    }
    return id;
  }
  throw new Error("The issue folder could not be made.");
}

/** Row 6: the issues of the folder, the newest first. A folder with no readable issue.json is skipped and counted. A missing folder gives an empty list. */
export async function listLocalIssues(root: string = localIssuesRoot()): Promise<{ issues: LocalIssueView[]; skipped: number; hidden: number }> {
  let names: string[];
  try {
    names = await fs.readdir(root);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { issues: [], skipped: 0, hidden: 0 };
    throw e;
  }
  const ids = newestFirst(names.filter(isLocalIssueId).map((id) => ({ id })));
  const shown = ids.slice(0, LOCAL_LIST_MAX);
  const issues: LocalIssueView[] = [];
  let skipped = 0;
  for (const { id } of shown) {
    try {
      const raw: unknown = JSON.parse(await fs.readFile(await resolveInside(`${id}/issue.json`, root), "utf8"));
      const v = parseLocalIssue(id, raw);
      if (v) issues.push(v);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { issues, skipped, hidden: ids.length - shown.length };
}

/**
 * Row 6: "Resolved". Writes state "resolved" and the time into issue.json. Other fields stay, also fields that the owner added by hand. No file is deleted.
 * An issue that is resolved already stays as it is (the answer is the same). Returns null when the ID is not an issue ID or the issue does not exist.
 */
export async function resolveLocalIssue(id: unknown, root: string = localIssuesRoot(), nowMs: number = Date.now()): Promise<"resolved" | null> {
  if (!isLocalIssueId(id)) return null;
  let file: string;
  let doc: Record<string, unknown>;
  try {
    file = await resolveInside(`${id}/issue.json`, root);
    const raw: unknown = JSON.parse(await fs.readFile(file, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    doc = raw as Record<string, unknown>;
  } catch {
    return null;
  }
  if (doc.state !== "resolved") {
    doc.state = "resolved";
    doc.resolved_utc = new Date(nowMs).toISOString();
    doc.resolved_pst = pstDateTime(nowMs / 1000);
    await writeJsonAtomic(file, doc);
  }
  return "resolved";
}

/** The bytes of picture.png of one issue. null when the ID is not an issue ID or there is no such file. Nothing else of the folder can be read. */
export async function localIssuePicture(id: unknown, root: string = localIssuesRoot()): Promise<Buffer | null> {
  if (!isLocalIssueId(id)) return null;
  try {
    return await fs.readFile(await resolveInside(`${id}/picture.png`, root));
  } catch {
    return null;
  }
}
