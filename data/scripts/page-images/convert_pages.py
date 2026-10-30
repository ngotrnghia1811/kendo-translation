#!/usr/bin/env python3
"""Convert book page PDFs to one gray WebP image per page.

Run with: python3 -B convert_pages.py --slugs <path to book-slugs.json>

Pipeline for each page:
  1. gs renders the PDF to a temporary PNG (150 dpi, 8-bit gray).
  2. cwebp encodes the PNG to a temporary WebP (quality 70).
  3. The script renames the temporary WebP to <out>/<slug>/p<NNN>.webp.
  4. The script deletes the PNG.

CamScanner mark crop (unit PC4):
  - A page that draws the CamScanner mark (a small image drawn at "80 0 0 30 500 10 cm"
    in the page content stream) loses its bottom 50 pt before step 2. cwebp does the cut
    with -crop, so there is only one lossy encode. A page without the mark stays as is.
  - Before the cut, the script makes sure that the cut strip holds no dark pixels outside
    the mark box. A page that fails this check is not cut and goes to the crop log.
  - crop-extra.txt can ask for a deeper cut for a whole book (for example kata_full).
  - The script writes the crop facts of each run to <out>/_log/crop-<time>.tsv.

Rules:
  - Python 3 standard library only.
  - The script opens the PDF files read only. It never writes to the PDF folder.
  - A page that already has a non-empty output file is skipped. Use --force to overwrite.
  - --only-marked converts again only the pages with the CamScanner mark (it overwrites them).
  - One failed page does not stop the run. The exit code is 1 if any page failed.
  - Do not run two copies of the script on the same --out folder at the same time.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import zlib

sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "page-images"))
DEFAULT_COLOR_LIST = os.path.join(HERE, "color-pages.txt")
DEFAULT_CROP_EXTRA = os.path.join(HERE, "crop-extra.txt")
MAX_WORKERS = 6
MB = 1048576.0
PDF_NAME = re.compile(r"^page_(\d+)\.pdf$")
PAGE_ID = re.compile(r"^[a-z0-9_]+/p\d{3,4}$")
OUT_NAME = re.compile(r"^p\d{3,4}\.webp$")
DPI = 150
GS_BASE = ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-r%d" % DPI,
           "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4"]
WEBP_QUALITY = "70"
CMD_TIMEOUT = 600

# CamScanner mark: a small image drawn at "80 0 0 30 500 10 cm" (point units, 1 pt tolerance).
MARK_DRAW = (80.0, 30.0, 500.0, 10.0)
MARK_TOL = 1.0
CUT_PT = 50.0                 # bottom cut for a page with the mark
DARK = 128                    # a gray value below this counts as a dark pixel
ALLOW_X_PT = (494.4, 590.4)   # x range in pt where the cut strip can hold the mark box
ALLOW_X_DEEP_PT = (470.0, 590.4)  # same for a deeper cut (the mark box and a logo)
HEAD_BYTES = 65536
TAIL_BYTES = 16384
MAX_STREAM = 200000           # content streams are small, skip a raw stream above this size
MAX_DECODED = 1 << 20
CM_DO = re.compile(rb"([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+cm\s*/(\w+)\s+Do")
BOX = re.compile(rb"/(MediaBox|CropBox)\s*\[([^\]]*)\]")
STREAM_START = re.compile(rb">>\s*stream\r?\n")


def id_digits(last_page):
    """Return 4 if the book has more than 999 pages, else 3."""
    return 4 if last_page > 999 else 3


def page_id(slug, n, last_page):
    return "%s/p%0*d" % (slug, id_digits(last_page), n)


def parse_color_list(text, source="color list"):
    """Return the page IDs of a color list. Ignore comments and blank lines."""
    ids = []
    for no, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if not PAGE_ID.match(line):
            raise ValueError("%s line %d: bad page ID %r (expected slug/pNNN, for example left_foot_full/p001)"
                             % (source, no, line))
        ids.append(line)
    return ids


def load_color_list(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return parse_color_list(f.read(), path)


def parse_range(text):
    m = re.match(r"^(\d+)-(\d+)$", text.strip())
    if not m or int(m.group(1)) > int(m.group(2)):
        raise ValueError("--pages must look like 10-20 (first not above last), got %r" % text)
    return int(m.group(1)), int(m.group(2))


def need_tools():
    gs = shutil.which("gs")
    cwebp = shutil.which("cwebp")
    dwebp = shutil.which("dwebp")
    missing = [n for n, p in (("gs (Ghostscript)", gs), ("cwebp (WebP tools)", cwebp),
                              ("dwebp (WebP tools)", dwebp)) if not p]
    if missing:
        sys.exit("Missing tool: %s. Install it and run again." % ", ".join(missing))
    return gs, cwebp, dwebp


def parse_crop_extra(text, source="crop list"):
    """Return {slug: cut in pt} from a crop list. Ignore comments and blank lines."""
    out = {}
    for no, raw in enumerate(text.splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        try:
            if len(parts) != 2 or not re.match(r"^[a-z0-9_]+$", parts[0]):
                raise ValueError
            pt = float(parts[1])
        except ValueError:
            raise ValueError("%s line %d: bad line %r (expected <slug> <pt>, for example kata_full 90)"
                             % (source, no, line)) from None
        if not CUT_PT <= pt <= 200:
            raise ValueError("%s line %d: cut %s pt is outside 50 to 200" % (source, no, parts[1]))
        if parts[0] in out:
            raise ValueError("%s line %d: slug %s appears twice" % (source, no, parts[0]))
        out[parts[0]] = pt
    return out


def load_crop_extra(path):
    if not path or not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return parse_crop_extra(f.read(), path)


def cut_px(pt, dpi=DPI):
    """Return a cut in pt as whole pixels (rounded to the nearest pixel)."""
    return int(pt * dpi / 72.0 + 0.5)


def crop_height(height, cut):
    """Return the image height after a bottom cut of cut px."""
    if cut < 0 or cut * 2 >= height:
        raise ValueError("cut of %d px is not valid for an image %d px high" % (cut, height))
    return height - cut


def allowed_x(width, deep, dpi=DPI):
    """Return the pixel range [x0, x1) where dark pixels are allowed in the cut strip."""
    lo, hi = ALLOW_X_DEEP_PT if deep else ALLOW_X_PT
    return max(0, int(round(lo * dpi / 72.0))), min(width, int(round(hi * dpi / 72.0)))


def has_mark_draw(stream):
    """Return True if a content stream draws a small image at 80 0 0 30 500 10 cm."""
    for m in CM_DO.finditer(stream):
        a, b, c, d, e, f = [float(x) for x in m.groups()[:6]]
        if (abs(a - MARK_DRAW[0]) <= MARK_TOL and abs(d - MARK_DRAW[1]) <= MARK_TOL
                and abs(e - MARK_DRAW[2]) <= MARK_TOL and abs(f - MARK_DRAW[3]) <= MARK_TOL
                and abs(b) < 0.01 and abs(c) < 0.01):
            return True
    return False


def pdf_info(data):
    """Read the page boxes and the content streams of PDF bytes.

    Return {"mark", "media", "crop", "draws", "open"}. "draws" is True if a decoded
    stream draws an image. "open" is True if a stream that is not an image has no end in data.
    """
    boxes = {}
    for m in BOX.finditer(data):
        key = m.group(1).decode()
        if key not in boxes:
            try:
                boxes[key] = [float(x) for x in m.group(2).split()]
            except ValueError:
                pass
    mark = draws = is_open = False
    for m in STREAM_START.finditer(data):
        s = m.end()
        e = data.find(b"endstream", s)
        if e < 0:
            head = data[max(0, m.start() - 400):m.start() + 2]
            head = head[head.rfind(b" obj") + 1:]
            if b"/Image" not in head:
                is_open = True
            continue
        if e - s > MAX_STREAM:
            continue
        try:
            text = zlib.decompressobj().decompress(data[s:e], MAX_DECODED)
        except zlib.error:
            continue
        if CM_DO.search(text):
            draws = True
        if has_mark_draw(text):
            mark = True
    return {"mark": mark, "media": boxes.get("MediaBox"), "crop": boxes.get("CropBox"),
            "draws": draws, "open": is_open}


def scan_pdf(path):
    """Return the pdf_info of a page PDF. Read the head and the tail first, the whole file if needed."""
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        if size > HEAD_BYTES + TAIL_BYTES:
            head = f.read(HEAD_BYTES)
            f.seek(size - TAIL_BYTES)
            tail = f.read()
            info = pdf_info(head)
            if info["draws"] and not info["open"]:
                tinfo = pdf_info(tail)
                info["media"] = info["media"] or tinfo["media"]
                info["crop"] = info["crop"] or tinfo["crop"]
                if info["media"]:
                    return info
            f.seek(0)
        else:
            f.seek(0)
        return pdf_info(f.read())


def png_size(path):
    """Return (width, height) from the PNG header."""
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        raise RuntimeError("gs made a file that is not a PNG")
    return struct.unpack(">II", head[16:24])


def webp_size(path):
    """Return (width, height) of a lossy WebP file, or None for other kinds."""
    with open(path, "rb") as f:
        head = f.read(30)
    if len(head) < 30 or head[:4] != b"RIFF" or head[8:12] != b"WEBP" or head[12:16] != b"VP8 ":
        return None
    return struct.unpack("<H", head[26:28])[0] & 0x3FFF, struct.unpack("<H", head[28:30])[0] & 0x3FFF


def read_gray(tools, png, y, width, height, base):
    """Return the 8-bit gray pixels (row by row) of a PNG area that starts at x 0 and row y."""
    _, cwebp, dwebp = tools
    lossless, pam = base + ".strip.webp", base + ".strip.pam"
    try:
        run_cmd([cwebp, "-quiet", "-lossless", "-z", "0", "-crop", "0", str(y), str(width), str(height),
                 png, "-o", lossless])
        run_cmd([dwebp, "-quiet", "-pam", lossless, "-o", pam])
        with open(pam, "rb") as f:
            data = f.read()
    finally:
        for p in (lossless, pam):
            try:
                os.remove(p)
            except OSError:
                pass
    start = data.index(b"ENDHDR\n") + 7
    px = data[start:]
    if len(px) != width * height * 4:
        raise RuntimeError("strip decode gave %d bytes, expected %d" % (len(px), width * height * 4))
    return px[0::4]


DARK_TABLE = bytes(1 if i < DARK else 0 for i in range(256))


def count_dark_outside(gray, width, x0, x1):
    """Count pixels below DARK in gray rows (each row is width px) outside the columns x0 to x1."""
    mask = gray.translate(DARK_TABLE)
    total = 0
    for r in range(len(mask) // width):
        row = mask[r * width:(r + 1) * width]
        total += row[:x0].count(1) + row[x1:].count(1)
    return total


def decide_cut(tools, png, width, height, want_pt, base):
    """Return (cut px, cut pt, reason, refused list) for a page with the CamScanner mark.

    Try the wanted cut first. If the strip holds dark pixels outside the allowed
    columns, refuse it and try the plain 50 pt cut. cut px is 0 if all tries fail.
    """
    tries = [want_pt] if want_pt == CUT_PT else [want_pt, CUT_PT]
    refused = []
    for pt in tries:
        px = cut_px(pt)
        x0, x1 = allowed_x(width, pt > CUT_PT)
        gray = read_gray(tools, png, crop_height(height, px), width, px, base)
        dark = count_dark_outside(gray, width, x0, x1)
        if dark == 0:
            reason = "mark" if pt == CUT_PT and want_pt == CUT_PT else (
                "mark+extra" if pt == want_pt else "mark (extra refused)")
            return px, pt, reason, refused
        refused.append((pt, dark))
    return 0, 0.0, "refused", refused


def list_pages(books_dir, folder):
    """Return {page number: PDF path} from the file names in one folder."""
    found = {}
    for name in os.listdir(os.path.join(books_dir, folder)):
        m = PDF_NAME.match(name)
        if m:
            found[int(m.group(1))] = os.path.join(books_dir, folder, name)
    return found


def build_plan(slug_data, books_dir, only_books, page_range, color_ids, report):
    """Return a list of page dicts. Add notes about count differences to report."""
    plan = []
    known = set()
    for row in slug_data["books"]:
        slug = row["slug"]
        pages = list_pages(books_dir, row["folder"])
        if not pages:
            report.append("DIFF %s: no PDF files in folder %r" % (slug, row["folder"]))
            continue
        last = max(pages)
        if len(pages) != row.get("pages"):
            report.append("DIFF %s: %d PDF files, slug file says pages=%s" % (slug, len(pages), row.get("pages")))
        if last != row.get("last_page"):
            report.append("DIFF %s: last page %d, slug file says last_page=%s" % (slug, last, row.get("last_page")))
        if id_digits(last) != row.get("id_digits"):
            report.append("DIFF %s: id digits %d, slug file says id_digits=%s" % (slug, id_digits(last), row.get("id_digits")))
        for n in sorted(pages):
            pid = page_id(slug, n, last)
            known.add(pid)
            if only_books and slug not in only_books:
                continue
            if page_range and not (page_range[0] <= n <= page_range[1]):
                continue
            plan.append({"slug": slug, "n": n, "pid": pid, "pdf": pages[n],
                         "mode": "color" if pid in color_ids else "gray",
                         "rel": "%s/%s.webp" % (slug, pid.split("/")[1])})
    unknown = sorted(set(color_ids) - known)
    if unknown:
        raise ValueError("color list has page IDs that match no PDF: %s" % ", ".join(unknown))
    return plan


def run_cmd(cmd):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=CMD_TIMEOUT)
    if r.returncode != 0:
        err = (r.stderr or r.stdout).decode("utf-8", "replace").strip().replace("\n", " ")[:200]
        raise RuntimeError("%s exit %d: %s" % (os.path.basename(cmd[0]), r.returncode, err))


def convert_one(item, out_dir, tmp_dir, tools, force, crop_extra=None):
    """Convert one page. Return (status, out_bytes, seconds, error, facts).

    facts is None for a skipped page. Else it is a dict with the keys mark, cut_px, cut_pt,
    reason, refused (list of (pt, dark pixel count)), width, height_in, height_out.
    """
    gs, cwebp = tools[0], tools[1]
    final = os.path.join(out_dir, item["rel"])
    t0 = time.time()
    if not force:
        try:
            if os.path.getsize(final) > 0:
                return "skip", os.path.getsize(final), 0.0, "", None
        except OSError:
            pass
    tag = item["pid"].replace("/", "__")
    png = os.path.join(tmp_dir, tag + ".png")
    webp = os.path.join(tmp_dir, tag + ".webp")
    device = "png16m" if item["mode"] == "color" else "pnggray"
    facts = None
    try:
        info = item.get("info") or scan_pdf(item["pdf"])
        run_cmd([gs] + GS_BASE + ["-sDEVICE=" + device, "-sOutputFile=" + png, item["pdf"]])
        if not os.path.exists(png) or os.path.getsize(png) == 0:
            raise RuntimeError("gs made no PNG")
        width, height = png_size(png)
        facts = {"mark": info["mark"], "cut_px": 0, "cut_pt": 0.0, "reason": "", "refused": [],
                 "width": width, "height_in": height, "height_out": height}
        crop_args = []
        if info["mark"]:
            want = (crop_extra or {}).get(item["slug"], CUT_PT)
            px, pt, reason, refused = decide_cut(tools, png, width, height, want, os.path.join(tmp_dir, tag))
            facts.update(cut_px=px, cut_pt=pt, reason=reason, refused=refused)
            if px:
                facts["height_out"] = crop_height(height, px)
                crop_args = ["-crop", "0", "0", str(width), str(facts["height_out"])]
        run_cmd([cwebp, "-quiet", "-q", WEBP_QUALITY] + crop_args + [png, "-o", webp])
        if not os.path.exists(webp) or os.path.getsize(webp) == 0:
            raise RuntimeError("cwebp made no WebP")
        os.makedirs(os.path.dirname(final), exist_ok=True)
        os.replace(webp, final)
        return "ok", os.path.getsize(final), time.time() - t0, "", facts
    except Exception as e:  # one failed page must not stop the run
        return "fail", 0, time.time() - t0, str(e), facts
    finally:
        for p in (png, webp):
            try:
                os.remove(p)
            except OSError:
                pass


def write_manifest(out_dir, color_ids):
    rows = []
    for slug in sorted(os.listdir(out_dir)):
        d = os.path.join(out_dir, slug)
        if slug.startswith((".", "_")) or not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not OUT_NAME.match(name):
                continue
            path = os.path.join(d, name)
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
            pid = "%s/%s" % (slug, name[:-5])
            rows.append((pid, os.path.getsize(path), h.hexdigest(), "color" if pid in color_ids else "gray"))
    tmp = os.path.join(out_dir, "manifest.tsv.part")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("page_id\tbytes\tsha256\tmode\n")
        for r in rows:
            f.write("%s\t%d\t%s\t%s\n" % r)
    os.replace(tmp, os.path.join(out_dir, "manifest.tsv"))
    return len(rows)


STAT_KEYS = ("cut", "deep", "refused", "plain", "skip", "fail")


def book_stats_line(slug, st):
    return ("  %-22s cut 50 pt %4d, cut deeper %4d, refused %3d, no mark %5d, skipped %5d, failed %3d"
            % (slug, st["cut"], st["deep"], st["refused"], st["plain"], st["skip"], st["fail"]))


def count_page(st, status, facts):
    """Add one page result to the stats of its book. Return the stat key."""
    if status == "skip":
        key = "skip"
    elif status == "fail":
        key = "fail"
    elif not facts["mark"]:
        key = "plain"
    elif not facts["cut_px"]:
        key = "refused"
    elif facts["cut_pt"] > CUT_PT:
        key = "deep"
    else:
        key = "cut"
    st[key] += 1
    return key


def scan_plan(plan, workers):
    """Read the PDF of every plan page (head and tail) and set item["info"]."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for item, info in zip(plan, ex.map(lambda p: scan_pdf(p["pdf"]), plan)):
            item["info"] = info


def run(slugs, out_dir, books_dir=None, books=None, pages=None, workers=4, color_list=None,
        force=False, dry_run=False, limit=None, only_color=False, quiet=False,
        crop_extra=None, only_marked=False):
    """Run the conversion. Return the exit code (0 all good, 1 if any page failed)."""
    workers = max(1, min(int(workers), MAX_WORKERS))
    with open(slugs, encoding="utf-8") as f:
        slug_data = json.load(f)
    books_dir = books_dir or slug_data["books_dir"]
    color_ids = set(load_color_list(color_list or DEFAULT_COLOR_LIST))
    extra = load_crop_extra(DEFAULT_CROP_EXTRA if crop_extra is None else crop_extra)
    page_range = parse_range(pages) if pages else None
    known_slugs = {r["slug"] for r in slug_data["books"]}
    for b in books or []:
        if b not in known_slugs:
            raise ValueError("unknown book slug %r" % b)
    for b in extra:
        if b not in known_slugs:
            raise ValueError("crop list has an unknown book slug %r" % b)
    report = []
    plan = build_plan(slug_data, books_dir, set(books or []), page_range, color_ids, report)
    if only_color:
        plan = [p for p in plan if p["mode"] == "color"]
        force = True
    if only_marked:
        scan_plan(plan, workers)
        print("Read %d PDF files: %d have the CamScanner mark." % (len(plan), sum(1 for p in plan if p["info"]["mark"])))
        plan = [p for p in plan if p["info"]["mark"]]
        force = True
    if limit is not None:
        plan = plan[:limit]
    for line in report:
        print(line)
    print("Plan: %d pages, %d books, %d in color list, %d books in crop list, workers %d, out %s"
          % (len(plan), len({p["slug"] for p in plan}), sum(1 for p in plan if p["mode"] == "color"),
             len(extra), workers, out_dir))
    if dry_run:
        per = {}
        for p in plan:
            s = per.setdefault(p["slug"], [0, 0])
            s[0] += 1
            if not force and os.path.exists(os.path.join(out_dir, p["rel"])) and os.path.getsize(os.path.join(out_dir, p["rel"])) > 0:
                s[1] += 1
        for slug in sorted(per):
            print("  %s: %d pages, %d already done" % (slug, per[slug][0], per[slug][1]))
        print("Dry run: nothing written.")
        return 0
    tools = need_tools()
    os.makedirs(out_dir, exist_ok=True)
    tmp_dir = os.path.join(out_dir, ".tmp")
    shutil.rmtree(tmp_dir, ignore_errors=True)
    os.makedirs(tmp_dir)
    log_dir = os.path.join(out_dir, "_log")
    os.makedirs(log_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    suffix = ""
    while os.path.exists(os.path.join(log_dir, "convert-%s%s.tsv" % (stamp, suffix))):
        suffix = "-%d" % (int(suffix[1:] or 1) + 1)
    log_path = os.path.join(log_dir, "convert-%s%s.tsv" % (stamp, suffix))
    crop_path = os.path.join(log_dir, "crop-%s%s.tsv" % (stamp, suffix))
    counts = {"ok": 0, "skip": 0, "fail": 0}
    stats = {}
    written = 0
    t_start = time.time()
    done = 0
    total = len(plan)
    with open(log_path, "w", encoding="utf-8") as log, open(crop_path, "w", encoding="utf-8") as clog:
        log.write("page_id\tmode\tstatus\tsrc_MB\tout_MB\tseconds\terror\n")
        clog.write("page_id\tcut_px\tcut_pt\treason\trefused\twidth\theight_in\theight_out\n")
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(convert_one, p, out_dir, tmp_dir, tools, force, extra): p for p in plan}
            try:
                for fut in concurrent.futures.as_completed(futures):
                    item = futures[fut]
                    status, size, secs, err, facts = fut.result()
                    counts[status] += 1
                    done += 1
                    st = stats.setdefault(item["slug"], dict.fromkeys(STAT_KEYS, 0))
                    count_page(st, status, facts)
                    if status == "ok":
                        written += size
                    if facts and facts["mark"]:
                        clog.write("%s\t%d\t%g\t%s\t%s\t%d\t%d\t%d\n"
                                   % (item["pid"], facts["cut_px"], facts["cut_pt"], facts["reason"],
                                      ",".join("%gpt:%d" % r for r in facts["refused"]),
                                      facts["width"], facts["height_in"], facts["height_out"]))
                        clog.flush()
                    try:
                        src = os.path.getsize(item["pdf"]) / MB
                    except OSError:
                        src = 0.0
                    log.write("%s\t%s\t%s\t%.3f\t%.3f\t%.2f\t%s\n"
                              % (item["pid"], item["mode"], status, src, size / MB, secs, err.replace("\t", " ")))
                    log.flush()
                    if status == "fail":
                        print("FAIL %s: %s" % (item["pid"], err), flush=True)
                    if facts and facts["mark"] and not facts["cut_px"]:
                        print("REFUSED %s: dark pixels in the cut strip (%s)"
                              % (item["pid"], ",".join("%gpt:%d" % r for r in facts["refused"])), flush=True)
                    if done % 200 == 0 and not quiet:
                        el = time.time() - t_start
                        conv = counts["ok"] + counts["fail"]
                        left = total - done
                        proj = (el / conv * left / 60.0) if conv else 0.0
                        print("progress: %d/%d done, %d failed, %.1f MB written, %.0f s, about %.1f min left"
                              % (done, total, counts["fail"], written / MB, el, proj), flush=True)
            except KeyboardInterrupt:
                for f in futures:
                    f.cancel()
                print("Stopped by user. Run again without --force to continue.", flush=True)
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return 1
    shutil.rmtree(tmp_dir, ignore_errors=True)
    n_manifest = write_manifest(out_dir, color_ids)
    el = time.time() - t_start
    print("Per book:")
    for slug in sorted(stats):
        print(book_stats_line(slug, stats[slug]))
    print("Finished: %d ok, %d skip, %d fail, %.1f MB written, %.1f s. Log: %s. Crop log: %s. Manifest: %d lines."
          % (counts["ok"], counts["skip"], counts["fail"], written / MB, el, log_path, crop_path, n_manifest), flush=True)
    return 1 if counts["fail"] else 0


def make_png(width, height, dark_blocks):
    """Return PNG bytes of a white 8-bit gray image with black blocks (x0, y0, x1, y1)."""
    rows = []
    for y in range(height):
        row = bytearray(b"\xff" * width)
        for x0, y0, x1, y1 in dark_blocks:
            if y0 <= y < y1:
                row[x0:x1] = b"\x00" * (x1 - x0)
        rows.append(b"\x00" + bytes(row))

    def chunk(kind, body):
        return (struct.pack(">I", len(body)) + kind + body
                + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows))) + chunk(b"IEND", b""))


def fake_pdf(content, media=b"[0 0 595 842]", crop=b""):
    """Return PDF bytes with one Flate content stream and a page object."""
    body = zlib.compress(content)
    return (b"%PDF-1.7\n3 0 obj\n<</Filter/FlateDecode/Length " + str(len(body)).encode() + b">>\nstream\n" + body
            + b"\nendstream\nendobj\n9 0 obj\n<</Type/Page/MediaBox" + media + crop
            + b"/Contents 3 0 R>>\nendobj\n")


def selftest_crop(check, args):
    """Self checks for the CamScanner mark crop. They use no PDF folder."""
    scan = b"q Q q /Perceptual ri q 497.2842 0 0 790 48.85789 52 cm /Im1 Do Q "
    info = pdf_info(fake_pdf(scan + b"q 80 0 0 30 500 10\ncm /Im2 Do Q Q", crop=b"/CropBox[0 50 595 842]"))
    check("mark draw (80 0 0 30 500 10 cm) is found in a Flate content stream", info["mark"] and info["draws"])
    check("MediaBox and CropBox are read", info["media"] == [0, 0, 595, 842] and info["crop"] == [0, 50, 595, 842])
    check("mark draw within 1 pt is found",
          pdf_info(fake_pdf(b"q 79.5 0 0 30.9 500.9 9.1 cm /Im2 Do Q"))["mark"])
    check("scan draw alone is not the mark", not pdf_info(fake_pdf(scan))["mark"])
    check("draw 2 pt away is not the mark", not pdf_info(fake_pdf(b"q 80 0 0 30 502 10 cm /Im2 Do Q"))["mark"])
    check("draw of another size is not the mark", not pdf_info(fake_pdf(b"q 82 0 0 30 500 10 cm /Im2 Do Q"))["mark"])
    check("a cut-off content stream is reported as open",
          pdf_info(fake_pdf(scan)[:60])["open"] and not pdf_info(fake_pdf(scan))["open"])
    check("cut of 50 pt at 150 dpi is 104 px", cut_px(50) == 104)
    check("cut of 90 pt at 150 dpi is 188 px", cut_px(90) == 188)
    check("cut of 50 pt at 72 dpi is 50 px", cut_px(50, 72) == 50)
    check("page 1754 px high with a 104 px cut is 1650 px", crop_height(1754, 104) == 1650)
    try:
        crop_height(1754, 900)
        check("cut of more than half the page gives an error", False)
    except ValueError:
        check("cut of more than half the page gives an error", True)
    check("allowed columns at 150 dpi are 1030 to 1230", allowed_x(1240, False) == (1030, 1230))
    gray = bytes([255] * 100 * 4)
    left = bytearray(gray)
    left[2 * 100 + 10] = 0
    right = bytearray(gray)
    right[2 * 100 + 90] = 0
    check("dark pixel outside the allowed columns is counted", count_dark_outside(bytes(left), 100, 80, 100) == 1)
    check("dark pixel inside the allowed columns is not counted", count_dark_outside(bytes(right), 100, 80, 100) == 0)
    check("crop list parses slug and pt, with comments",
          parse_crop_extra("# note\n\nkata_full 90  # logo\nmen1 60.5\n") == {"kata_full": 90.0, "men1": 60.5})
    for text, why in (("kata full 90\n", "bad slug"), ("kata_full\n", "no pt"), ("kata_full 20\n", "pt below 50"),
                      ("kata_full 90\nkata_full 80\n", "twice")):
        try:
            parse_crop_extra(text, "test list")
            check("crop list with %s gives an error" % why, False)
        except ValueError as e:
            check("crop list with %s gives an error that names the line" % why, "line" in str(e))
    tools = need_tools()
    tmp = tempfile.mkdtemp(prefix="convert_pages_selftest_crop_")
    try:
        def decide(blocks, want):
            png = os.path.join(tmp, "t.png")
            with open(png, "wb") as pf:
                pf.write(make_png(1240, 400, blocks))
            return decide_cut(tools, png, 1240, 400, want, os.path.join(tmp, "t"))

        px, pt, reason, refused = decide([(1100, 350, 1200, 390)], 50)
        check("mark box in the strip is allowed, cut is 104 px", (px, pt, reason, refused) == (104, 50, "mark", []))
        px, pt, reason, refused = decide([(100, 350, 110, 390)], 50)
        check("dark pixels outside the mark box refuse the cut", px == 0 and reason == "refused" and refused == [(50, 400)])
        px, pt, reason, refused = decide([(1000, 250, 1010, 290)], 90)
        check("deeper cut allows the logo columns, cut is 188 px", (px, pt, reason) == (188, 90, "mark+extra"))
        px, pt, reason, refused = decide([(100, 250, 110, 260)], 90)
        check("refused deeper cut falls back to 50 pt", (px, pt, reason) == (104, 50, "mark (extra refused)")
              and refused == [(90, 100)])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def selftest(args):
    bad = []

    def check(name, cond):
        print("%s: %s" % ("PASS" if cond else "FAIL", name))
        if not cond:
            bad.append(name)

    check("page 48 of 120 is p048", page_id("book", 48, 120) == "book/p048")
    check("page 839 of 1051 is p0839", page_id("book", 839, 1051) == "book/p0839")
    check("page 999 of 999 has 3 digits", page_id("b", 999, 999) == "b/p999")
    check("page 5 of 1000 has 4 digits", page_id("b", 5, 1000) == "b/p0005")
    check("color list ignores comments and blank lines",
          parse_color_list("# note\n\n  \nleft_foot_full/p001\n# more\nkendojidai_2014/p0839\n")
          == ["left_foot_full/p001", "kendojidai_2014/p0839"])
    try:
        parse_color_list("# ok\nleft foot/p1\n", "test list")
        check("bad color list line gives an error", False)
    except ValueError as e:
        check("bad color list line gives an error that names the line", "line 2" in str(e) and "bad page ID" in str(e))
    try:
        parse_range("20-10")
        check("bad page range gives an error", False)
    except ValueError:
        check("bad page range gives an error", True)
    selftest_crop(check, args)
    tmp = tempfile.mkdtemp(prefix="convert_pages_selftest_")
    try:
        code = run(args.slugs, tmp, books_dir=args.books_dir, books=["left_foot_full"], pages="1-2",
                   workers=2, color_list=args.color_list, quiet=True, crop_extra=args.crop_extra)
        check("real run of 2 pages exits 0", code == 0)
        with open(args.slugs, encoding="utf-8") as sf:
            sdata = json.load(sf)
        folder = [r["folder"] for r in sdata["books"] if r["slug"] == "left_foot_full"][0]
        for n in (1, 2):
            p = os.path.join(tmp, "left_foot_full", "p%03d.webp" % n)
            head = open(p, "rb").read(12) if os.path.exists(p) else b""
            check("p%03d.webp starts with RIFF and holds WEBP at bytes 8 to 11" % n,
                  head[:4] == b"RIFF" and head[8:12] == b"WEBP")
            pdf = os.path.join(args.books_dir or sdata["books_dir"], folder, "page_%03d.pdf" % n)
            marked = scan_pdf(pdf)["mark"]
            size = webp_size(p) if os.path.exists(p) else None
            check("p%03d.webp height is 1650 with the mark (1754 without it): mark %s, size %s" % (n, marked, size),
                  size is not None and size == (1240, 1650 if marked else 1754))
        check("temporary folder removed", not os.path.exists(os.path.join(tmp, ".tmp")))
        check("manifest has 2 lines plus header",
              os.path.exists(os.path.join(tmp, "manifest.tsv"))
              and len(open(os.path.join(tmp, "manifest.tsv")).read().splitlines()) == 3)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("Selftest: %s" % ("all passed" if not bad else "%d failed" % len(bad)))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description="Convert book page PDFs to gray WebP images.")
    ap.add_argument("--slugs", required=True, help="path to book-slugs.json")
    ap.add_argument("--out", default=DEFAULT_OUT, help="output folder (default: data/page-images)")
    ap.add_argument("--books-dir", default=None, help="PDF folder (default: books_dir of the slug file)")
    ap.add_argument("--book", action="append", default=None, help="book slug to convert (repeatable)")
    ap.add_argument("--pages", default=None, help="page number range, for example 10-20")
    ap.add_argument("--workers", type=int, default=4, help="parallel workers (default 4, maximum 6)")
    ap.add_argument("--color-list", default=DEFAULT_COLOR_LIST, help="file with color page IDs")
    ap.add_argument("--crop-extra", default=DEFAULT_CROP_EXTRA,
                    help="file with deeper bottom cuts per book (default: crop-extra.txt)")
    ap.add_argument("--only-marked", action="store_true",
                    help="convert only the pages with the CamScanner mark, and overwrite them")
    ap.add_argument("--only-color-list", action="store_true",
                    help="convert only the pages in the color list, in color, and overwrite them")
    ap.add_argument("--force", action="store_true", help="overwrite existing outputs")
    ap.add_argument("--dry-run", action="store_true", help="print the plan and counts only")
    ap.add_argument("--limit", type=int, default=None, help="stop after N pages")
    ap.add_argument("--selftest", action="store_true", help="run the self checks")
    args = ap.parse_args()
    if args.workers > MAX_WORKERS:
        print("Workers capped at %d." % MAX_WORKERS)
    try:
        if args.selftest:
            need_tools()
            return selftest(args)
        return run(args.slugs, os.path.abspath(args.out), args.books_dir, args.book, args.pages,
                   args.workers, args.color_list, args.force, args.dry_run, args.limit, args.only_color_list,
                   crop_extra=args.crop_extra, only_marked=args.only_marked)
    except (ValueError, OSError, json.JSONDecodeError) as e:
        sys.exit("Error: %s" % e)


if __name__ == "__main__":
    sys.exit(main())
