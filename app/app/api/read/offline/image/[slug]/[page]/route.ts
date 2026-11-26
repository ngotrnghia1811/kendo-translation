import { guardReader, htvError, isResponse } from "@/lib/htv-api";
import { offlineImage } from "@/lib/offline-copy-server";

export const dynamic = "force-dynamic";

// The bytes of one page image for an offline copy (unit VW131, Q-A 3:134.3 row 2). GET /api/read/offline/image/left_foot_full/p048
// Who: the same as /api/read/offline (guardReader, no allowLink). Which pages: the same checks as GET /api/read/image/<book>/<page>.
// The browser stores the answer under the address of the Reader image (/api/read/image/<book>/<page>), so the Reader screen shows it with no network.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string; page: string }> }) {
  try {
    const g = await guardReader(req, { mutating: false });
    if (isResponse(g)) return g;
    const { slug, page } = await ctx.params;
    return await offlineImage(g, slug, page);
  } catch (e) {
    return htvError(e);
  }
}
