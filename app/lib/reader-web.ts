// Constants of the web articles (unit RT73a, round 73; VISION-viewer 15.26.3, 15.26.12, 15.26.13).
// No import and no server-only marker, so the page code, the sync command S2, and a test script can load it.

/**
 * A reader_pages record with this run_id holds the Original text rows of a web article page and no Agent text (VISION-viewer 15.26.13).
 * A record with another run_id is an agent record (the ED_3 text of a run).
 */
export const WEB_RUN_ID = "web-ja";

/** True when the reader_pages record holds an Agent text. A missing record and a "web-ja" record hold none. */
export function hasAgentRecord(rec: { run_id?: string; runId?: string } | null | undefined): boolean {
  if (!rec) return false;
  const run = rec.run_id ?? rec.runId ?? "";
  return run !== "" && run !== WEB_RUN_ID;
}

/**
 * The disabled system account that owns the copy of the kendojidai.com text in own_translations (design D26, round 73 answer 5).
 * The account can never sign in: the field disabled is true (users.authRule "disabled = false") and nobody knows its password.
 * The email ends in .invalid, a name that never resolves, so no mail can reach it.
 */
export const WEB_SYSTEM_EMAIL = "kendojidai-com@system.invalid";
export const WEB_SYSTEM_NAME = "kendojidai.com";
/** Version number of the kendojidai.com text in own_translations and in reader_versions. */
export const WEB_VERSION = 1;

/** Row key of a web article row, for example "d7835263/p001/web/U004". */
export function isWebKey(key: string): boolean {
  return /\/p\d{3,4}\/web\/[A-Za-z0-9_]+$/.test(key);
}

/** The fact marks of a Human row (VISION-viewer 15.26.8). start and end count characters of the EN text. null means the whole sentence. */
export interface ReaderFact {
  start: number | null;
  end: number | null;
  ja: string;
  type: string;
  kind: "changed" | "dropped";
}
