"use client";
import { useEffect, useRef, useState } from "react";

/*
 * Original page image on the reader pages (unit RC2, round 65). VISION-viewer 15.19.4 and 15.19.7.
 * Wide screen: the image on the left, the text on the right. Phone: two tabs, "Text | Image", above the text. They are not side by side.
 * The image comes from GET /api/read/image/<book>/<page>. In signed mode that route sends the browser to a signed link on the PocketBase server.
 * A missing image (404) or a load error shows "No page image available". The image shows as it is in every theme (no color change).
 */

export const NO_PAGE_IMAGE = "No page image available";

/** Address of the image route for a page ID such as "left_foot_full/p048". */
export function imageHref(pageId: string): string {
  return `/api/read/image/${pageId}`;
}

function ImagePane({ pageId, n }: { pageId: string; n: number }) {
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

/**
 * The page text with the page image beside it (wide) or behind a tab (phone). `children` is the text of the page.
 * Give the component a key with the page ID, so that the tab and the error state start again on each page.
 */
export default function ReaderWithImage({ pageId, n, children }: { pageId: string; n: number; children: React.ReactNode }) {
  const [tab, setTab] = useState<"text" | "image">("text");
  return (
    <div data-with-image data-image-tab={tab}>
      <div role="tablist" aria-label="Page text or page image" className="mb-3 flex overflow-hidden rounded border border-line text-sm md:hidden" data-image-tabs>
        {(["text", "image"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} data-image-tab-button={t} onClick={() => setTab(t)} className={"min-h-[44px] flex-1 px-3 py-1 " + (tab === t ? "bg-accent font-semibold text-white" : "")}>
            {t === "text" ? "Text" : "Image"}
          </button>
        ))}
      </div>
      <div className="md:flex md:items-start md:gap-6">
        <div className={(tab === "image" ? "block" : "hidden") + " md:sticky md:top-16 md:block md:max-h-[calc(100vh-5rem)] md:w-[42%] md:shrink-0 md:overflow-auto"} data-image-column>
          <ImagePane pageId={pageId} n={n} />
        </div>
        <div className={(tab === "text" ? "block" : "hidden") + " min-w-0 md:block md:flex-1"} data-text-column>
          {children}
        </div>
      </div>
    </div>
  );
}
