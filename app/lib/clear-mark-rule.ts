// The rule "Clear mark is off on the Run mark that a Restart leaves" (unit TF83, round 84). Pure function. Shared by the button rules and the route.
// Round 83 answer 11 (Q-A 2026-11-02 l106): "Clear mark on the Run mark that a Restart leaves: Gray it out (Recommended)".
// Round 84 answer 2 (Q-A 2026-11-02 l128): "Reading and text are right (Recommended)". The text is CLEAR_OFF_AFTER_RESTART below.
// Reason for the rule [agent inference]: the Translator wrote this Run mark (key `after` is "restart") to start the new run after a Restart.
// A Clear mark press would end that start, and the archive of the old run would stay with no new run.
// The rule lives in a new file on purpose (unit VW77a): the dev server keeps one old instance of a module, and a new file has none.
// The route POST /api/monitor/books/<slug>/clear-mark reads `stateReason` of the button, so the button and the route give the same words and the route answers 409.
//
// Example: request.json {"action": "run", "after": "restart", "requested_by": "run program"} gives the reason below.
//          request.json {"action": "run", "phase": "agent-phase-3"} gives null (Clear mark works).
export const CLEAR_OFF_AFTER_RESTART = "Clear mark is off because this mark starts the new run after a Restart.";

/** The reason that Clear mark is off for this mark, or null when the mark does not forbid it. Other rules (no mark, a live process) stay in book-status-rules.ts. */
export function clearOffReason(mark: { action?: string | null; after?: string | null } | null | undefined): string | null {
  return mark && mark.action === "run" && mark.after === "restart" ? CLEAR_OFF_AFTER_RESTART : null;
}
