/**
 * Seed script: insert global agent_prompts rows for all four MAC-RAG phases.
 *
 * The /api/mac-rag/generate route looks up:
 *   SELECT id FROM agent_prompts
 *   WHERE agent_type = <phase>
 *     AND active = true
 *     AND user_id IS NULL
 *
 * Without a matching row the route silently skips writing prompt_edits audit
 * records, making the prompt-edit audit trail empty for that phase.
 *
 * This script seeds one row per phase (translate / edit / proofread / qa)
 * using the canonical system prompt text from lib/agents/phase-prompts.ts.
 *
 * The template column stores only the static system prompt (the `user`
 * message varies per segment and is not stored here).
 *
 * Phases seeded:
 *   translate  — initial translation system prompt
 *   edit       — accuracy + fluency edit system prompt
 *   proofread  — surface polish proofread system prompt
 *   qa         — advisory QA reviewer system prompt
 *
 * Usage:
 *   npx tsx scripts/seed-agent-prompts.ts --dry-run   # show what would be inserted
 *   npx tsx scripts/seed-agent-prompts.ts              # insert (skip existing)
 *   npx tsx scripts/seed-agent-prompts.ts --force      # update template if changed
 *
 * Side-effects: inserts up to 4 rows in public.agent_prompts.
 * Safe to re-run (idempotent without --force).
 */

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Canonical prompt templates (static system messages)
// Mirrors lib/agents/phase-prompts.ts without importing TS directly.
// ---------------------------------------------------------------------------

const COMMON_RULES = [
  "You are a translation assistant for a Japanese kendo literature co-translation platform.",
  "Output ONLY the revised English target text. Do not include any preamble, explanation, JSON, markdown, or quotation marks around the result.",
  "Preserve standard kendo romanizations (men, kote, dō, tsuki, kiai, kamae, seme, zanshin, etc.) without translating them.",
  "Maintain a formal, literary register appropriate for kendo instructional and historical texts.",
].join("\n");

const PHASE_TEMPLATES: Record<string, string> = {
  translate: [
    COMMON_RULES,
    "Task: produce an initial English translation of the Japanese source segment below.",
  ].join("\n"),

  edit: [
    COMMON_RULES,
    "Task: edit the existing English translation for accuracy and fluency against the Japanese source.",
    "Make corrections where meaning, terminology, or grammar are off; leave well-translated portions intact.",
  ].join("\n"),

  proofread: [
    COMMON_RULES,
    "Task: proofread the English translation for surface polish — punctuation, typography, capitalization, consistency, and minor stylistic issues.",
    "Preserve all meaning and word choices; do not retranslate. Only adjust surface form.",
  ].join("\n"),

  qa: [
    "You are a QA reviewer for a Japanese kendo literature co-translation platform.",
    "I propose; I never commit.  Your findings are advisory — a human translator decides which to accept.",
    "",
    "Review the English translation against the Japanese source and return a JSON array of qa_issue candidates.",
    "Each item must have: category (Mistranslation | Terminology | Register/Keigo | Fluency | Cultural-adaptation | Omission/Addition | Style), severity (minor|major|critical), body (1-2 sentence explanation), char_start (0-based index into target text or null), char_end (exclusive end index or null).",
    "Return ONLY valid JSON — no preamble, no markdown, no backticks. If no issues are found, return an empty array [].",
    "",
    "Guidelines:",
    "- Mistranslation: meaning in target differs significantly from source.",
    "- Terminology: kendo or martial-arts term is mistranslated or inconsistent (e.g. men/kote/dō/tsuki should stay romanised).",
    "- Register/Keigo: register (formal/informal/honorific) does not match the source.",
    "- Fluency: English is grammatically awkward or unnatural.",
    "- Cultural-adaptation: cultural nuance is lost or misrepresented.",
    "- Omission/Addition: content is missing from or added to the translation without justification.",
    "- Style: punctuation, capitalisation, or typographic inconsistency.",
    "",
    "Be concise and precise. Do not invent issues. Major = changes meaning; critical = fundamentally wrong.",
  ].join("\n"),
};

const PHASES = Object.keys(PHASE_TEMPLATES) as Array<keyof typeof PHASE_TEMPLATES>;

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(".env.local", "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isForce = process.argv.includes("--force");

  const env = await loadEnv();
  const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch existing rows for all phases to detect conflicts.
  const { data: existing, error: fetchErr } = await supabase
    .from("agent_prompts")
    .select("id, agent_type, active, version, template")
    .in("agent_type", PHASES)
    .is("user_id", null)
    .eq("active", true);

  if (fetchErr) {
    console.error("Failed to fetch existing agent_prompts:", fetchErr.message);
    process.exit(1);
  }

  const existingByPhase = new Map<string, { id: string; version: number; template: string }>();
  for (const row of existing ?? []) {
    existingByPhase.set(row.agent_type as string, {
      id: row.id as string,
      version: (row.version as number) ?? 1,
      template: row.template as string,
    });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const phase of PHASES) {
    const template = PHASE_TEMPLATES[phase];
    const ex = existingByPhase.get(phase);

    if (ex) {
      if (ex.template === template) {
        console.log(`  [skip]   ${phase} — active row exists and template is unchanged (id=${ex.id})`);
        skipped++;
        continue;
      }

      if (!isForce) {
        console.log(
          `  [skip]   ${phase} — active row exists with DIFFERENT template (id=${ex.id}). Pass --force to overwrite.`
        );
        skipped++;
        continue;
      }

      // --force: deactivate old row and insert new one.
      console.log(`  [update] ${phase} — deactivating old row id=${ex.id}, inserting new version ${ex.version + 1}`);
      if (!isDryRun) {
        const { error: deactivateErr } = await supabase
          .from("agent_prompts")
          .update({ active: false })
          .eq("id", ex.id);
        if (deactivateErr) {
          console.error(`    ✗ Failed to deactivate old row: ${deactivateErr.message}`);
          continue;
        }
        const { error: insertErr } = await supabase
          .from("agent_prompts")
          .insert({
            agent_type: phase,
            approach: null,
            user_id: null,
            template,
            active: true,
            version: ex.version + 1,
          });
        if (insertErr) {
          console.error(`    ✗ Failed to insert new row: ${insertErr.message}`);
          // Re-activate old row on failure.
          await supabase.from("agent_prompts").update({ active: true }).eq("id", ex.id);
          continue;
        }
      }
      updated++;
      continue;
    }

    // No existing row: insert.
    console.log(`  [insert] ${phase} — seeding new agent_prompt (${template.length} chars)`);
    if (!isDryRun) {
      const { error: insertErr } = await supabase
        .from("agent_prompts")
        .insert({
          agent_type: phase,
          approach: null,
          user_id: null,
          template,
          active: true,
          version: 1,
        });
      if (insertErr) {
        console.error(`    ✗ Failed to insert ${phase}: ${insertErr.message}`);
        continue;
      }
    }
    inserted++;
  }

  console.log("");
  if (isDryRun) {
    console.log(`DRY RUN complete — would insert: ${inserted}, update: ${updated}, skip: ${skipped}`);
  } else {
    console.log(`Done — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
