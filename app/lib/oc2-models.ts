import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { missingBlock, parseOc2List, type Oc2Block } from "./oc2-models-rules";

// Unit VW125 (plan P66, card P66.1, Q-A 3:118.2 rows 1 and 4). Server side of the oc2 model list.
// The list file is data/oc2-models.json beside the app folder, as the page images (../data/page-images) and the v1 md files (../data/v1-md) are.
// Reason for this path: the file is data of this Mac, not a setting of the Viewer, and git ignores it (data/*). aki-main writes it ("refresh models"). No key in viewer.config.json is needed.
// The variable VIEWER_OC2_MODELS names another file (the tests use it). An empty variable counts as not set.
// The file is read at each request (about 16 KB), so a refresh by aki-main shows at the next page load with no restart and no cache that can go stale.
// A new file, because the dev server keeps old module instances (VW77a).

export const DEFAULT_OC2_MODELS = "../data/oc2-models.json";

export function oc2ModelsPath(): string {
  const env = process.env.VIEWER_OC2_MODELS?.trim();
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env ? env : DEFAULT_OC2_MODELS);
}

/**
 * The block for the settings snapshots. It never throws: a missing file gives status "missing", a file that fails a check gives "broken".
 * The note of a block names the file by its short name only, never by its full path.
 */
export async function readOc2Block(file: string = oc2ModelsPath()): Promise<Oc2Block> {
  let text: string;
  try { text = await fs.readFile(file, "utf8"); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return missingBlock();
    return { status: "broken", note: `Model list from oc2 cannot be read (the file is not readable). The picker shows the models of translator-models.yaml.` };
  }
  return parseOc2List(text);
}
