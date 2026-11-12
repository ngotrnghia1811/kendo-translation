// Screen text of a JSON viewer error (unit VW92, round 91). Pure functions. Used by components/JsonViewer.tsx.
// Why this file exists: the JSON viewer page is a server-rendered client component (components/JsonViewer.tsx). Node writes the text of the
// server HTML. Firefox writes the text of the first render in the browser. React compares the two and throws error #418 if they differ.
// The parse message of the JavaScript engine differs by engine (the VW91 browser check, tools/aki-main/VW91/browser-check/engine-msg.log):
//   Node    : Expected property name or '}' in JSON at position 2 (line 1 column 3)
//   Firefox : JSON.parse: expected property name or '}' at line 1 column 3 of the JSON data
// So the screen never shows that message. It shows the line and the column that lib/json-view.ts firstErrorAt finds from the file text alone.
// The same text gives the same line and column on every engine.
// A new file, because the dev server keeps old module instances (see the note of lib/pst.ts).
import { firstErrorAt, lineAndColumn } from "./json-view";

/**
 * The red line above the plain text of a JSON file that is not valid.
 * Q-A 3:1.8 words kept: "This file is not valid JSON (line 4, column 1)". The engine message after the colon is gone.
 */
export function jsonErrorText(line: number | null, column: number | null): string {
  const at = line !== null && column !== null ? ` (line ${line}, column ${column})` : "";
  return `This file is not valid JSON${at}. The plain text follows.`;
}

/**
 * The red line of a JSONL record that is not valid: "Line 2 is not valid JSON (column 10)".
 * [unit default VW92] The column comes from the same scan as the JSON file. The old text had the engine message here, which named a position in its own form.
 */
export function jsonlErrorText(row: { line: number; raw: string }): string {
  const at = firstErrorAt(row.raw);
  const col = at === null ? "" : ` (column ${lineAndColumn(row.raw, at).column})`;
  return `Line ${row.line} is not valid JSON${col}`;
}
