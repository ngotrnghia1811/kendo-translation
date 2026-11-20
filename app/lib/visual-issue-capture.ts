// Unit VW118 (plan item P53, Q-A 3:99.5 row 3): "A small screenshot library draws that part inside the browser, so the browser asks no permission."
// Browser code only. The library is modern-screenshot (MIT). It is loaded with a dynamic import() when a person picks a box, so no page loads it before.
// How it draws one part: the library copies the page (the body) into an SVG picture and draws it on a canvas. The options below make the canvas as large as the box
// and move the copy of the body, so that the box lies at the top left corner of the canvas. The page itself is not changed.
import { captureScales, PEN_COLOR, type Box, type Stroke } from "./visual-issue-rules";

/** Every part of the tool carries this attribute. The capture leaves out every element that has it (the icon, the dim layer, the box border, the hint). */
export const UI_ATTR = "data-visual-issue-ui";

export interface Captured {
  canvas: HTMLCanvasElement;
  /** Canvas pixels for one CSS pixel of the page. */
  scale: number;
}

/** Wait for two frames, so that the browser paints the page without the dim layer before the capture starts. */
export function twoFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Draw the part `box` (viewport pixels) of the page into a canvas. Row 3: at the device pixel ratio (at most 2). A fault throws an Error with a plain text.
 * A box over a page image works, because the images load from the same site.
 */
export async function captureBox(box: Box): Promise<Captured> {
  const { domToCanvas } = await import("modern-screenshot");
  const scale = captureScales(window.devicePixelRatio)[0];
  const body = document.body;
  const rect = body.getBoundingClientRect();
  // The offset of the box inside the body. The body has no margin in this app, but the numbers come from the browser, so a margin or a scroll position does not matter.
  const dx = box.x - rect.left;
  const dy = box.y - rect.top;
  const background = getComputedStyle(body).backgroundColor;
  try {
    const canvas = await domToCanvas(body, {
      scale,
      width: box.w,
      height: box.h,
      backgroundColor: background && background !== "rgba(0, 0, 0, 0)" ? background : "#ffffff",
      // The library sets the width and the height of the copy to the size of the box. This style puts the real size of the body back and moves the copy.
      // The copy of the body gets the default margin of 8 px of the browser (the check of the unit showed a shift of exactly 8 px), so the margin is set to 0.
      // The offset above counts from the real position of the body (rect), so a margin of the real body does not matter.
      style: { margin: "0px", width: `${rect.width}px`, height: `${rect.height}px`, transform: `translate(${-dx}px, ${-dy}px)`, transformOrigin: "0 0" },
      filter: (node) => !(node instanceof Element && node.hasAttribute(UI_ATTR)),
      features: { restoreScrollPosition: true },
      font: false,
      timeout: 15000,
    });
    if (canvas.width < 1 || canvas.height < 1) throw new Error("empty");
    return { canvas, scale };
  } catch {
    throw new Error("The picture could not be made. Close this pop-up and try again.");
  }
}

/** A PNG of a canvas. A canvas that gives no blob throws a plain Error. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The picture could not be saved as a PNG."))), "image/png");
  });
}

/** Row 4: the pen draws red lines. Each stroke is a list of points in picture pixels with its own width. One point makes a dot. */
export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]): void {
  for (const s of strokes) {
    if (s.points.length === 0) continue;
    ctx.save();
    ctx.strokeStyle = PEN_COLOR;
    ctx.fillStyle = PEN_COLOR;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * A PNG of `source` that is at most `limit` bytes. It tries the size of the picture, then smaller copies (3/4, 1/2, 1/3 of the width and the height) until one fits.
 * The pen lines are part of the pixels already. Null when no copy fits.
 */
export async function pngWithin(source: HTMLCanvasElement, limit: number): Promise<Blob | null> {
  for (const f of [1, 0.75, 0.5, 1 / 3]) {
    let canvas = source;
    if (f !== 1) {
      canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.width * f));
      canvas.height = Math.max(1, Math.round(source.height * f));
      canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
    }
    const blob = await canvasToPng(canvas);
    if (blob.size <= limit) return blob;
  }
  return null;
}
