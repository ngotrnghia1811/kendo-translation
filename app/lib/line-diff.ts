// Unit VW95 (round 91), Q-A 3:17.1 note (2026-11-11): "be able to see prompt diff after each training step update".
// Q-A 3:18.3: the section "Prompt updates" of the run view shows a line diff of the prompt text (old version text against new version text).
// A small line diff without a new package (unit rule). Pure: no file read.
// Method: cut the lines that both texts share at the start and at the end, then a longest common subsequence (LCS) table on the middle part.
// [unit default VW95] When the middle part is larger than MAX_CELLS table cells, the middle shows as all old lines removed, then all new lines added.

export type DiffOp = "same" | "removed" | "added";

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** Line number in the old text (same and removed lines), else null. 1-based. */
  oldNo: number | null;
  /** Line number in the new text (same and added lines), else null. 1-based. */
  newNo: number | null;
}

/** One block of the shown diff: changed lines, or a run of same lines that the screen folds. */
export type DiffBlock = { kind: "lines"; lines: DiffLine[] } | { kind: "fold"; count: number; fromOld: number; fromNew: number };

export const MAX_CELLS = 4_000_000;

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** The line diff of two texts, in order. Same lines, removed lines (old text only) and added lines (new text only). */
export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out: DiffLine[] = [];
  for (let i = 0; i < start; i++) out.push({ op: "same", text: a[i], oldNo: i + 1, newNo: i + 1 });
  const n = endA - start;
  const m = endB - start;
  if (n * m > MAX_CELLS) {
    for (let i = start; i < endA; i++) out.push({ op: "removed", text: a[i], oldNo: i + 1, newNo: null });
    for (let j = start; j < endB; j++) out.push({ op: "added", text: b[j], oldNo: null, newNo: j + 1 });
  } else {
    // lcs[i][j] = length of the LCS of a[start+i..endA) and b[start+j..endB).
    const lcs: Uint32Array[] = [];
    for (let i = 0; i <= n; i++) lcs.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] = a[start + i] === b[start + j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        out.push({ op: "same", text: a[start + i], oldNo: start + i + 1, newNo: start + j + 1 });
        i++;
        j++;
      } else if (j < m && (i >= n || lcs[i][j + 1] > lcs[i + 1][j])) {
        out.push({ op: "added", text: b[start + j], oldNo: null, newNo: start + j + 1 });
        j++;
      } else {
        out.push({ op: "removed", text: a[start + i], oldNo: start + i + 1, newNo: null });
        i++;
      }
    }
  }
  for (let k = 0; k < a.length - endA; k++) out.push({ op: "same", text: a[endA + k], oldNo: endA + k + 1, newNo: endB + k + 1 });
  return out;
}

/** Counts of a diff: lines removed and lines added. */
export function diffCounts(lines: DiffLine[]): { removed: number; added: number; same: number } {
  let removed = 0;
  let added = 0;
  let same = 0;
  for (const l of lines) {
    if (l.op === "removed") removed++;
    else if (l.op === "added") added++;
    else same++;
  }
  return { removed, added, same };
}

/**
 * The diff in blocks for the screen. A changed line keeps `context` same lines before and after it. A longer run of same lines becomes one fold
 * ("12 same lines"). A diff with no change gives one fold.
 */
export function diffBlocks(lines: DiffLine[], context = 2): DiffBlock[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.op === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: DiffBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    if (keep[i]) {
      const block: DiffLine[] = [];
      while (i < lines.length && keep[i]) block.push(lines[i++]);
      out.push({ kind: "lines", lines: block });
    } else {
      const first = lines[i];
      let count = 0;
      while (i < lines.length && !keep[i]) {
        count++;
        i++;
      }
      out.push({ kind: "fold", count, fromOld: first.oldNo ?? 0, fromNew: first.newNo ?? 0 });
    }
  }
  return out;
}
