import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveInside } from "@/lib/safe-path";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// Round 44 answer 13 (Q-A l142): reads only inside the Translator data folder. Used for the page image.
export async function GET(req: Request) {
  try {
    // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives 404 before any file read.
    const off = await monitorOffResponse();
    if (off) return off;
    const rel = new URL(req.url).searchParams.get("path") ?? "";
    const full = await resolveInside(rel);
    const type = TYPES[path.extname(full).toLowerCase()];
    if (!type) return jsonResponse({ error: "File type not allowed." }, 415);
    const buf = await fs.readFile(full);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return jsonResponse({ error: "No such file." }, 404);
    return errorResponse(e);
  }
}
