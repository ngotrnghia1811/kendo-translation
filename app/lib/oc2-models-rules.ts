// Unit VW125 (plan P66, card P66.1). Owner words 2026-11-22 14:00 PST: "The model picker should have show ALL models in oc2, not just some specific models".
// Accepted rows 1 to 5 of Q-A 3:118.2. Pure rules of the oc2 model list file <V2>/data/oc2-models.json (schema "oc2-models-v1"):
//   check the text, build the catalog (providers, models, efforts), and write the read time in PST.
// No file access and no server-only import, so a client component can import it. The file is read by lib/oc2-models.ts (server side).
// A new file, because the dev server keeps old module instances (VW77a).
//
// Shape of the list file (written by aki-main, not by the Viewer):
//   read_utc      the time that aki-main read the list from oc2
//   variant_sets  a list of effort lists. A model points at one of them by its index. One list can be empty (a model with no efforts).
//   providers     { <provider ID>: { label, models: [[model ID without provider, readable name, index into variant_sets], ...] } }
// The full value of a model is "<provider ID>/<model ID>". It is the spelling that the run uses, so it stays as it is.
// The reader uses the names of the keys only. It never depends on the order of the keys, except the order of the providers (the order of the file is the order of the picker).

export const OC2_SCHEMA = "oc2-models-v1";
export const FALLBACK_TEXT = "The picker shows the models of translator-models.yaml.";

export type Oc2Provider = { id: string; label: string; models: [string, string, number][] };
/** What the server gives the forms (a field of both settings snapshots). `ok` holds the checked list. Else `note` holds the one line that the page shows. */
export type Oc2Block =
  | { status: "ok"; read_utc: string; variant_sets: string[][]; providers: Oc2Provider[] }
  | { status: "missing" | "broken"; note: string };

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

/** The block for a list file that does not exist. */
export function missingBlock(): Oc2Block {
  return { status: "missing", note: `Model list from oc2 not found. ${FALLBACK_TEXT}` };
}

/**
 * Check the text of the list file and make the block. It never throws.
 * A file that fails a check gives status "broken" and the reason in the note, so the picker falls back to the yaml models.
 * A model that appears twice (same provider ID and model ID) shows once: the first entry counts.
 */
export function parseOc2List(text: string): Oc2Block {
  const broken = (why: string): Oc2Block => ({ status: "broken", note: `Model list from oc2 cannot be read (${why}). ${FALLBACK_TEXT}` });
  let doc: unknown;
  try { doc = JSON.parse(text); } catch { return broken("the file is not valid JSON"); }
  if (!isObject(doc)) return broken("the file is not a JSON object");
  if (doc.schema !== OC2_SCHEMA) return broken(`the key schema is not ${OC2_SCHEMA}`);
  const readUtc = doc.read_utc;
  if (typeof readUtc !== "string" || Number.isNaN(Date.parse(readUtc))) return broken("the key read_utc is not a time");
  const sets = doc.variant_sets;
  if (!Array.isArray(sets) || !sets.every((s) => Array.isArray(s) && s.every((e) => typeof e === "string" && e !== ""))) return broken("the key variant_sets is not a list of effort lists");
  if (!isObject(doc.providers)) return broken("the key providers is not an object");
  const variantSets = sets as string[][];
  const providers: Oc2Provider[] = [];
  const seen = new Set<string>();
  for (const [id, p] of Object.entries(doc.providers)) {
    if (!PROVIDER_ID.test(id)) return broken(`the provider ID ${JSON.stringify(id)} is not valid`);
    if (!isObject(p) || typeof p.label !== "string" || p.label.trim() === "" || !Array.isArray(p.models)) return broken(`provider ${id} needs a label and a models list`);
    const models: [string, string, number][] = [];
    for (const [i, m] of p.models.entries()) {
      const ok = Array.isArray(m) && m.length === 3 && typeof m[0] === "string" && m[0] !== "" && typeof m[1] === "string" && Number.isInteger(m[2]) && m[2] >= 0 && m[2] < variantSets.length;
      if (!ok) return broken(`provider ${id}, model ${i + 1} is not [model ID, name, effort list index]`);
      const full = `${id}/${m[0]}`;
      if (seen.has(full)) continue;
      seen.add(full);
      models.push([m[0], m[1].trim() === "" ? m[0] : m[1], m[2]]);
    }
    if (models.length) providers.push({ id, label: p.label.trim(), models });
  }
  if (providers.length === 0) return broken("the file lists no model");
  return { status: "ok", read_utc: readUtc, variant_sets: variantSets, providers };
}

/** "2026-11-22 14:10": the read time in PST (UTC-8 all year, the project rule). A time that cannot be read gives "time unreadable". */
export function pstMinute(utc: string): string {
  const t = Date.parse(utc);
  return Number.isNaN(t) ? "time unreadable" : new Date(t - 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

/** The one line that a settings page shows about the list (row 4 of Q-A 3:118.2): the read time, or the note for a list that is missing or broken. */
export function listLine(block: Oc2Block): string {
  return block.status === "ok" ? `Model list from oc2, read ${pstMinute(block.read_utc)} PST` : block.note;
}

export type CatalogModel = { id: string; provider: string; providerLabel: string; name: string; efforts: readonly string[] };
export type CatalogProvider = { id: string; label: string; models: CatalogModel[] };
export type Catalog = { providers: CatalogProvider[]; byId: ReadonlyMap<string, CatalogModel>; size: number };

/**
 * The catalog of a checked list. A model has its full ID, its readable name, its provider label and its own efforts.
 * A block that is not "ok", or a missing block, gives null: the pickers then work as in unit VW123 (the yaml models).
 */
export function catalogOf(block: Oc2Block | null | undefined): Catalog | null {
  if (!block || block.status !== "ok") return null;
  const byId = new Map<string, CatalogModel>();
  const providers = block.providers.map((p): CatalogProvider => ({
    id: p.id,
    label: p.label,
    models: p.models.map(([model, name, set]): CatalogModel => {
      const entry = { id: `${p.id}/${model}`, provider: p.id, providerLabel: p.label, name, efforts: block.variant_sets[set] ?? [] };
      byId.set(entry.id, entry);
      return entry;
    }),
  }));
  return { providers, byId, size: byId.size };
}
