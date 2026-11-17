// Unit VW106, check c6: the program counts of 3 points of a real prompt version, computed by lib/vector-map-rules.ts (the code of the screen).
// Read only. Run: cd app && node scripts/vw106-real-values.mjs <out file> [box] [version] [points, comma separated]
// The data folder comes from viewer.config.json of the app folder or the file in VIEWER_CONFIG, as lib/config.ts reads it.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pointValues, oneDecimal } from "../lib/vector-map-rules.ts";

const app = path.resolve(import.meta.dirname, "..");
const [out, box = "QA_3", version = "v2.1.14", nums = "2.4,6.7,6.8"] = process.argv.slice(2);
if (!out) throw new Error("Give the output file.");
const cfg = JSON.parse(readFileSync(process.env.VIEWER_CONFIG ?? path.join(app, "viewer.config.json"), "utf8"));
const file = path.join(cfg.translatorDataDir, "book-store", "paired-dataset", "prompts", box, `${version}.json`);
const text = JSON.parse(readFileSync(file, "utf8")).text;
const values = pointValues(text);
const line = nums
  .split(",")
  .map((n) => {
    const p = values.find((v) => v.num === n);
    if (!p) throw new Error(`No point ${n} in ${box} ${version}.`);
    return `${n} comp ${oneDecimal(p.comp)} imp ${oneDecimal(p.imp)}`;
  })
  .join(" | ");
writeFileSync(out, line + "\n");
console.log(`${box} ${version}: ${text.length} characters, ${values.length} points, ${values.reduce((a, p) => a + p.marks, 0)} marks`);
console.log(line);
