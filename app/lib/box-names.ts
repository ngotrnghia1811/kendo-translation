// Unit VW94 fix round (round 91). Owner pick Q-A 3:18.5 (2026-11-11, batch 18 question 5): "Keep codes, explain on hover".
// Option text: "the screen shows "TL_2", and the full name shows when you point at it."
// So a box code (TS_0 ... QA_3, box-critic.ED_2) stays as it is on the screen. This file gives the hover text.
// Sources of the words, copied as they are:
//   - Stage roles: <T2>/data/scripts/translator/messages.py:531-534 (GRID_BOX_ROLE), also quoted in VISION-viewer.md:524.
//   - Levels: <T2>/data/scripts/translator/messages.py:524 (GRID_HEAD): "4 levels (0 weakest model, 3 strongest model)".
//   - box-critic: the critic call of one box. VISION-viewer.md:3951 calls a failure of box-critic.TS_3 a "critic failure".
// Pure: no file read. Unit VW95 (step view) can use it too.

/** messages.py:531-534 GRID_BOX_ROLE, word for word. */
export const BOX_ROLE: Record<string, string> = {
  TS: "transcription stage, writes the Japanese text of the page",
  TL: "translation stage, writes the English draft of the page",
  ED: "edit stage, revises the English draft against the Japanese text",
  QA: "quality check stage, judges the English text against the Japanese text",
};

/** One box code: TS_0 ... QA_3, with an optional "box-critic." in front. */
const BOX_RE = /^(box-critic\.)?(TS|TL|ED|QA)_([0-3])$/;
/** The same codes inside a longer text. */
const BOX_IN_TEXT = /(?<![\w.-])(?:box-critic\.)?(?:TS|TL|ED|QA)_[0-3](?![\w])/g;

/**
 * The hover text of a box code, or null for another text.
 * "QA_2" gives "QA_2: quality check stage, judges the English text against the Japanese text. Level 2 of 4 (0 weakest model, 3 strongest model)."
 * "box-critic.ED_2" gives "box-critic.ED_2: the critic call of box ED_2. ED_2: edit stage, ... Level 2 of 4 (...)."
 */
export function boxHelp(code: string): string | null {
  const m = BOX_RE.exec(code);
  if (!m) return null;
  const box = `${m[2]}_${m[3]}`;
  const role = `${box}: ${BOX_ROLE[m[2]]}. Level ${m[3]} of 4 (0 weakest model, 3 strongest model).`;
  return m[1] ? `${code}: the critic call of box ${box}. ${role}` : role;
}

/** A text cut into plain parts and box codes, in order. A text without a box code gives one plain part. */
export type BoxTextPart = { text: string; box?: false } | { text: string; box: true; help: string };

export function splitBoxCodes(text: string): BoxTextPart[] {
  const out: BoxTextPart[] = [];
  let at = 0;
  for (const m of text.matchAll(BOX_IN_TEXT)) {
    const i = m.index ?? 0;
    const help = boxHelp(m[0]);
    if (!help) continue;
    if (i > at) out.push({ text: text.slice(at, i) });
    out.push({ text: m[0], box: true, help });
    at = i + m[0].length;
  }
  if (at < text.length || out.length === 0) out.push({ text: text.slice(at) });
  return out;
}
