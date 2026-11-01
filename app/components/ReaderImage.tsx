"use client";
import { useEffect, useRef, useState } from "react";

/*
 * Original page image on the reader pages (unit RC2, round 65). VISION-viewer 15.19.4 and 15.19.7.
 * Unit RT73b (round 73c answer 4): the image is the body of the panel "Page image" (ReaderPageView). The panels and the phone tabs are in ReaderPanels.
 * The image comes from GET /api/read/image/<book>/<page>. In signed mode that route sends the browser to a signed link on the PocketBase server.
 * A missing image (404) or a load error shows "No page image available". The image shows as it is in every theme (no color change).
 */

export const NO_PAGE_IMAGE = "No page image available";

/** Address of the image route for a page ID such as "left_foot_full/p048". */
export function imageHref(pageId: string): string {
  return `/api/read/image/${pageId}`;
}

export function ImagePane({ pageId, n }: { pageId: string; n: number }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const src = imageHref(pageId);
  // The browser can report a load error before React attaches the handler (server-rendered page). Look at the image once after the first render.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  return (
    <div data-page-image-pane>
      {failed ? (
        <p className="rounded border border-line p-3 text-sm text-muted" data-no-image>
          {NO_PAGE_IMAGE}
        </p>
      ) : (
        <>
          <p className="mb-1 text-xs">
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-accent underline" data-image-full>
              Open full size
            </a>
          </p>
          {/* A plain img on purpose: in signed mode the route redirects to another host, and next/image would fetch and cache that redirect. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={img} src={src} alt={`Original page image, Page ${n}`} loading="lazy" decoding="async" onError={() => setFailed(true)} className="block h-auto w-full rounded border border-line" data-page-image />
        </>
      )}
    </div>
  );
}
