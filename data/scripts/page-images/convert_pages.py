#!/usr/bin/env python3
"""Convert book page PDFs to one gray WebP image per page.

Run with: python3 -B convert_pages.py --slugs <path to book-slugs.json>

Pipeline for each page:
  1. gs renders the PDF to a temporary PNG (150 dpi, 8-bit gray).
  2. cwebp encodes the PNG to a temporary WebP (quality 70).
  3. The script renames the temporary WebP to <out>/<slug>/p<NNN>.webp.
  4. The script deletes the PNG.

Rules:
  - Python 3 standard library only.
  - The script opens the PDF files read only. It never writes to the PDF folder.
  - A page that already has a non-empty output file is skipped. Use --force to overwrite.
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
import subprocess
import sys
import tempfile
import time

sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "page-images"))
DEFAULT_COLOR_LIST = os.path.join(HERE, "color-pages.txt")
MAX_WORKERS = 6
MB = 1048576.0
PDF_NAME = re.compile(r"^page_(\d+)\.pdf$")
PAGE_ID = re.compile(r"^[a-z0-9_]+/p\d{3,4}$")
OUT_NAME = re.compile(r"^p\d{3,4}\.webp$")
GS_BASE = ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-r150",
           "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4"]
WEBP_QUALITY = "70"
CMD_TIMEOUT = 600


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
    missing = [n for n, p in (("gs (Ghostscript)", gs), ("cwebp (WebP tools)", cwebp)) if not p]
    if missing:
        sys.exit("Missing tool: %s. Install it and run again." % ", ".join(missing))
    return gs, cwebp


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


def convert_one(item, out_dir, tmp_dir, tools, force):
    """Convert one page. Return (status, out_bytes, seconds, error)."""
    gs, cwebp = tools
    final = os.path.join(out_dir, item["rel"])
    t0 = time.time()
    if not force:
        try:
            if os.path.getsize(final) > 0:
                return "skip", os.path.getsize(final), 0.0, ""
        except OSError:
            pass
    tag = item["pid"].replace("/", "__")
    png = os.path.join(tmp_dir, tag + ".png")
    webp = os.path.join(tmp_dir, tag + ".webp")
    device = "png16m" if item["mode"] == "color" else "pnggray"
    try:
        run_cmd([gs] + GS_BASE + ["-sDEVICE=" + device, "-sOutputFile=" + png, item["pdf"]])
        if not os.path.exists(png) or os.path.getsize(png) == 0:
            raise RuntimeError("gs made no PNG")
        run_cmd([cwebp, "-quiet", "-q", WEBP_QUALITY, png, "-o", webp])
        if not os.path.exists(webp) or os.path.getsize(webp) == 0:
            raise RuntimeError("cwebp made no WebP")
        os.makedirs(os.path.dirname(final), exist_ok=True)
        os.replace(webp, final)
        return "ok", os.path.getsize(final), time.time() - t0, ""
    except Exception as e:  # one failed page must not stop the run
        return "fail", 0, time.time() - t0, str(e)
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


def run(slugs, out_dir, books_dir=None, books=None, pages=None, workers=4, color_list=None,
        force=False, dry_run=False, limit=None, only_color=False, quiet=False):
    """Run the conversion. Return the exit code (0 all good, 1 if any page failed)."""
    workers = max(1, min(int(workers), MAX_WORKERS))
    with open(slugs, encoding="utf-8") as f:
        slug_data = json.load(f)
    books_dir = books_dir or slug_data["books_dir"]
    color_ids = set(load_color_list(color_list or DEFAULT_COLOR_LIST))
    page_range = parse_range(pages) if pages else None
    known_slugs = {r["slug"] for r in slug_data["books"]}
    for b in books or []:
        if b not in known_slugs:
            raise ValueError("unknown book slug %r" % b)
    report = []
    plan = build_plan(slug_data, books_dir, set(books or []), page_range, color_ids, report)
    if only_color:
        plan = [p for p in plan if p["mode"] == "color"]
        force = True
    if limit is not None:
        plan = plan[:limit]
    for line in report:
        print(line)
    print("Plan: %d pages, %d books, %d in color list, workers %d, out %s"
          % (len(plan), len({p["slug"] for p in plan}), sum(1 for p in plan if p["mode"] == "color"),
             workers, out_dir))
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
    log_path = os.path.join(log_dir, "convert-%s.tsv" % datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    counts = {"ok": 0, "skip": 0, "fail": 0}
    written = 0
    t_start = time.time()
    done = 0
    total = len(plan)
    with open(log_path, "w", encoding="utf-8") as log:
        log.write("page_id\tmode\tstatus\tsrc_MB\tout_MB\tseconds\terror\n")
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(convert_one, p, out_dir, tmp_dir, tools, force): p for p in plan}
            try:
                for fut in concurrent.futures.as_completed(futures):
                    item = futures[fut]
                    status, size, secs, err = fut.result()
                    counts[status] += 1
                    done += 1
                    if status == "ok":
                        written += size
                    try:
                        src = os.path.getsize(item["pdf"]) / MB
                    except OSError:
                        src = 0.0
                    log.write("%s\t%s\t%s\t%.3f\t%.3f\t%.2f\t%s\n"
                              % (item["pid"], item["mode"], status, src, size / MB, secs, err.replace("\t", " ")))
                    log.flush()
                    if status == "fail":
                        print("FAIL %s: %s" % (item["pid"], err), flush=True)
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
    print("Finished: %d ok, %d skip, %d fail, %.1f MB written, %.1f s. Log: %s. Manifest: %d lines."
          % (counts["ok"], counts["skip"], counts["fail"], written / MB, el, log_path, n_manifest), flush=True)
    return 1 if counts["fail"] else 0


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
    tmp = tempfile.mkdtemp(prefix="convert_pages_selftest_")
    try:
        code = run(args.slugs, tmp, books_dir=args.books_dir, books=["left_foot_full"], pages="1-2",
                   workers=2, color_list=args.color_list, quiet=True)
        check("real run of 2 pages exits 0", code == 0)
        for n in (1, 2):
            p = os.path.join(tmp, "left_foot_full", "p%03d.webp" % n)
            head = open(p, "rb").read(12) if os.path.exists(p) else b""
            check("p%03d.webp starts with RIFF and holds WEBP at bytes 8 to 11" % n,
                  head[:4] == b"RIFF" and head[8:12] == b"WEBP")
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
                   args.workers, args.color_list, args.force, args.dry_run, args.limit, args.only_color_list)
    except (ValueError, OSError, json.JSONDecodeError) as e:
        sys.exit("Error: %s" % e)


if __name__ == "__main__":
    sys.exit(main())
