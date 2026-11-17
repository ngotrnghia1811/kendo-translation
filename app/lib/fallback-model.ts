// Unit VW108 (round 94), Q-A 3:71.3 row 1, from Q-A 3:67.2 row 3: the fallback model on the Monitor line and in the step view.
// Fallback model (Translator unit TR96): the next model that the Translator tries after all tries of a model fail.
// Writer: <T2>/data/scripts/translator_run.py make_update_watch (about lines 483-488) adds four keys to status.json running_update on each try:
//   model    "provider/model-id", for example "claude-028c2ffe/claude-fable-5-2" or "openai/gpt-6.1-sol"
//   variant  the thinking level, for example "low"
//   step     0 for the model of the role, 1, 2, 3 for the fallback models of the ladder
//   steps    the number of fallback models of the ladder (3 in TR96)
// An older status.json has none of these keys. Then no piece shows.
// Pure functions: no file access, no server-only import, so a client component and a plain node test (scripts/vw108-test.mjs) can import this file.
// A new file, because the dev server keeps old module instances (VW77a). Use only erasable TypeScript syntax here.

/** The fallback model of the running try. Only for step 1 or higher. */
export interface FallbackModel {
  /** "provider/model-id" as the Translator writes it. */
  model: string;
  /** Thinking level, or null when the key is missing or empty. */
  variant: string | null;
  /** 1 for the first fallback model of the ladder. */
  step: number;
  /** Number of fallback models of the ladder. */
  steps: number;
}

const MAX_STEPS = 20;

function wholeIn(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

function shortText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t !== "" && t.length <= max ? t : null;
}

/**
 * The fallback model of a running_update object, or null. Null for step 0 (the model of the role), for an older status.json without the keys,
 * and for a wrong value: a step that is not a whole number from 1 to steps, a missing model, or a value that is no object. This function never throws.
 */
export function fallbackOf(v: unknown): FallbackModel | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const steps = wholeIn(r.steps, 1, MAX_STEPS);
  if (steps === null) return null;
  const step = wholeIn(r.step, 1, steps);
  const model = shortText(r.model, 160);
  if (step === null || model === null) return null;
  return { model, variant: shortText(r.variant, 20), step, steps };
}

/** The model ID after the provider part: "claude-028c2ffe/claude-fable-5-2" gives "claude-fable-5-2" (the rule of model_words of the Translator). */
export function modelIdOf(model: string): string {
  const i = model.indexOf("/");
  return i >= 0 && i < model.length - 1 ? model.slice(i + 1) : model;
}

function capital(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * [unit default VW108] A readable model name: "claude-fable-5-2" gives "Fable 5.2", "claude-haiku-5-5" gives "Haiku 5.5", "gpt-6.1-sol" gives "GPT-6.1 Sol".
 * Any other ID shows as it is, after the provider part.
 */
export function readableModelName(model: string): string {
  const id = modelIdOf(model);
  const claude = /^claude-([a-z]+)-(\d{1,3})-(\d{1,3})$/.exec(id);
  if (claude) return `${capital(claude[1])} ${claude[2]}.${claude[3]}`;
  const gpt = /^gpt-(\d{1,3}(?:\.\d{1,3})?)((?:-[a-z0-9]+)*)$/.exec(id);
  if (gpt) return `GPT-${gpt[1]}${gpt[2].split("-").filter((w) => w !== "").map((w) => ` ${capital(w)}`).join("")}`;
  return id;
}

/** "fallback model 1 of 3: Fable 5.2 low". The piece of the Monitor line and of the step view. */
export function fallbackText(f: FallbackModel): string {
  return `fallback model ${f.step} of ${f.steps}: ${readableModelName(f.model)}${f.variant ? ` ${f.variant}` : ""}`;
}
