#!/usr/bin/env python3
"""Throwaway test for the PocketBase hook pb_hooks/page_images.pb.js (unit RC2, round 65). Python 3 standard library only.

Usage:
  python3 -B data/scripts/pocketbase/test_page_images.py [--hooks PATH]
The env variable PB_TEST_BIN replaces the path of the PocketBase binary.

The test starts its own PocketBase on 127.0.0.1:8092 (never the live server, never port 8090) with a new empty data folder,
one scenario after the other: a good key, no key, a short key, and a missing image folder.
Test images are made by the test (random bytes with the name p048.webp), so no real page image is needed.
Keys and signatures are random and never printed. The test deletes its temp folder at the end.
Other scripts can import check_good_server(base, key, image_dir, sample, res) and run it against a server that they started.
"""

import argparse
import hashlib
import hmac
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
V2_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PB_BIN = os.environ.get("PB_TEST_BIN", os.path.join(V2_ROOT, "data", "pocketbase", "pocketbase"))
HOOKS = os.path.join(HERE, "pb_hooks")
PORT = 8092
BASE = "http://127.0.0.1:" + str(PORT)


class Results:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def check(self, name, ok, reason=""):
        if ok:
            self.passed += 1
            print("PASS " + name)
        else:
            self.failed += 1
            print("FAIL " + name + ": " + reason)


def sign(key, slug, file, exp):
    """Lower-case hex HMAC-SHA256 over "<slug>/<file>:<exp>" (the contract of the hook)."""
    return hmac.new(key.encode(), ("%s/%s:%s" % (slug, file, exp)).encode(), hashlib.sha256).hexdigest()


def get(base, path):
    """Return (status, headers, body). Never raise on a 4xx or 5xx status."""
    try:
        with urllib.request.urlopen(base + path, timeout=30) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read()


SIGS = []  # every real signature that the test made, to look for it in the server log


def link(key, slug, file, exp=None, sig=None):
    exp = int(time.time()) + 600 if exp is None else exp
    sig = sign(key, slug, file, exp) if sig is None else sig
    SIGS.append(sig)
    return "/page-images/%s/%s?exp=%s&sig=%s" % (slug, file, exp, sig)


def check_good_server(base, key, image_dir, sample, res, label=""):
    """Checks against a server that holds the key and the folder. sample = (slug, file) of an image that exists in image_dir."""
    slug, file = sample
    want = open(os.path.join(image_dir, slug, file), "rb").read()
    now = int(time.time())
    p = lambda s: label + s
    st, h, body = get(base, link(key, slug, file))
    res.check(p("hook: a good signature gives 200"), st == 200, str(st))
    res.check(p("hook: the body equals the file"), body == want, "%d bytes, want %d" % (len(body), len(want)))
    res.check(p("hook: Content-Type is image/webp"), (h.get("Content-Type") or "").split(";")[0].strip() == "image/webp", str(h.get("Content-Type")))
    res.check(p("hook: Cache-Control is private, max-age=600"), h.get("Cache-Control") == "private, max-age=600", str(h.get("Cache-Control")))
    st, _, body = get(base, link(key, slug, file, sig="0" * 64))
    res.check(p("hook: a wrong signature gives 403"), st == 403, str(st))
    res.check(p("hook: a wrong signature gives no image bytes"), want not in body)
    exp1 = now + 600
    good1 = sign(key, slug, file, exp1)
    st, _, _ = get(base, link(key, slug, file, exp=exp1, sig=good1[:-1] + ("1" if good1[-1] == "0" else "0")))
    res.check(p("hook: a signature that differs in the last character gives 403"), st == 403, str(st))
    st, _, _ = get(base, link(key, slug, file, sig=good1.upper()))
    res.check(p("hook: an upper-case signature gives 403"), st == 403, str(st))
    st, _, _ = get(base, link(key, slug, file, sig=""))
    res.check(p("hook: an empty signature gives 403"), st == 403, str(st))
    st, _, _ = get(base, "/page-images/%s/%s?exp=%d" % (slug, file, now + 600))
    res.check(p("hook: no signature gives 403"), st == 403, str(st))
    st, _, _ = get(base, "/page-images/%s/%s" % (slug, file))
    res.check(p("hook: no query gives 403"), st == 403, str(st))
    st, _, _ = get(base, link(key, slug, file, sig=sign("other-key-" + "k" * 32, slug, file, now + 600)))
    res.check(p("hook: a signature made with another key gives 403"), st == 403, str(st))
    # A signature for another page cannot open this page.
    st, _, _ = get(base, "/page-images/%s/%s?exp=%d&sig=%s" % (slug, file, now + 600, sign(key, slug, "p999.webp", now + 600)))
    res.check(p("hook: a signature of another page gives 403"), st == 403, str(st))
    # Time limits.
    st, _, _ = get(base, link(key, slug, file, exp=now - 10))
    res.check(p("hook: an exp in the past gives 403"), st == 403, str(st))
    st, _, _ = get(base, link(key, slug, file, exp=now + 905))
    res.check(p("hook: an exp more than 900 seconds ahead gives 403"), st == 403, str(st))
    st, _, _ = get(base, link(key, slug, file, exp=now + 890))
    res.check(p("hook: an exp 890 seconds ahead gives 200"), st == 200, str(st))
    st, _, _ = get(base, "/page-images/%s/%s?exp=abc&sig=%s" % (slug, file, "0" * 64))
    res.check(p("hook: an exp that is not a number gives 403"), st == 403, str(st))
    st, _, _ = get(base, "/page-images/%s/%s?exp=%d.5&sig=%s" % (slug, file, now + 600, "0" * 64))
    res.check(p("hook: an exp with a decimal point gives 403"), st == 403, str(st))
    # Names.
    for bad in ("Bad-Slug", "UPPER", "a.b"):
        st, _, _ = get(base, link(key, bad, file))
        res.check(p("hook: the bad slug %s gives 400" % bad), st == 400, str(st))
    for bad in ("p48.webp", "p048.png", "p048.WEBP", "p00048.webp", "x048.webp", "p048.webp.webp"):
        st, _, _ = get(base, link(key, slug, bad))
        res.check(p("hook: the bad file name %s gives 400" % bad), st == 400, str(st))
    st, _, body = get(base, "/page-images/%s/..%%2F..%%2Fsecret.webp?exp=%d&sig=%s" % (slug, now + 600, "0" * 64))
    res.check(p("hook: a file name with an encoded slash is refused"), st in (400, 404), str(st))
    # Missing file (correctly signed).
    st, _, _ = get(base, link(key, slug, "p998.webp"))
    res.check(p("hook: a missing file gives 404"), st == 404, str(st))
    st, _, _ = get(base, link(key, "no_such_book", file))
    res.check(p("hook: a missing book folder gives 404"), st == 404, str(st))
    st, _, _ = get(base, "/api/health")
    res.check(p("hook: the route /api/health still works"), st == 200, str(st))


def check_unset_server(base, key_for_link, slug, file, res, label):
    """A server with no usable key or folder answers 503 to every request, also to a request that is signed with the key."""
    now = int(time.time())
    for name, path in (
        ("a signed request", link(key_for_link, slug, file)),
        ("a request with no query", "/page-images/%s/%s" % (slug, file)),
        ("a bad slug", link(key_for_link, "Bad-Slug", file)),
        ("a bad file name", link(key_for_link, slug, "p48.png")),
        ("an exp in the past", link(key_for_link, slug, file, exp=now - 10)),
    ):
        st, _, body = get(base, path)
        res.check("%s: %s gives 503" % (label, name), st == 503, str(st))
    res.check(label + ": the 503 body does not hold the key", key_for_link.encode() not in body)
    st, _, _ = get(base, "/api/health")
    res.check(label + ": the route /api/health still works", st == 200, str(st))


class Server:
    def __init__(self, work, hooks, env_extra, tag):
        self.work, self.hooks, self.env_extra, self.tag, self.proc = work, hooks, env_extra, tag, None
        self.log_path = os.path.join(work, tag + ".log")

    def start(self):
        with socket.socket() as s:
            s.settimeout(1)
            if s.connect_ex(("127.0.0.1", PORT)) == 0:
                raise RuntimeError("port %d is busy" % PORT)
        env = {k: v for k, v in os.environ.items() if k not in ("PAGE_IMAGE_KEY", "PAGE_IMAGE_DIR")}
        env.update(self.env_extra)
        data = os.path.join(self.work, "data-" + self.tag)
        os.makedirs(data)
        log = open(self.log_path, "wb")
        self.proc = subprocess.Popen(
            [PB_BIN, "serve", "--http=127.0.0.1:%d" % PORT, "--dir=" + data, "--hooksDir=" + self.hooks],
            env=env, stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
        for _ in range(200):
            if self.proc.poll() is not None:
                raise RuntimeError("PocketBase stopped at start")
            try:
                if get(BASE, "/api/health")[0] == 200:
                    return
            except (urllib.error.URLError, ConnectionError):
                pass
            time.sleep(0.1)
        raise RuntimeError("PocketBase did not answer")

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait(timeout=15)

    def log(self):
        return open(self.log_path, "rb").read()


def main():
    parser = argparse.ArgumentParser(description="Throwaway test of the page image hook.")
    parser.add_argument("--hooks", default=HOOKS, help="folder with page_images.pb.js (default: pb_hooks next to this file)")
    args = parser.parse_args()
    if not os.path.isfile(PB_BIN):
        raise SystemExit("PocketBase binary not found: " + PB_BIN)
    res = Results()
    work = tempfile.mkdtemp(prefix="page-images-test-")
    servers = []
    try:
        images = os.path.join(work, "images")
        slug, file = "test_book", "p048.webp"
        os.makedirs(os.path.join(images, slug))
        open(os.path.join(images, slug, file), "wb").write(b"RIFF" + secrets.token_bytes(5000) + b"WEBP")
        key = secrets.token_hex(32)
        # Scenario 1: key and folder are set.
        s = Server(work, args.hooks, {"PAGE_IMAGE_KEY": key, "PAGE_IMAGE_DIR": images}, "good")
        servers.append(s)
        s.start()
        check_good_server(BASE, key, images, (slug, file), res)
        s.stop()
        log = s.log()
        res.check("hook: the server log does not hold the key", key.encode() not in log)
        res.check("hook: the server log does not hold a signature", not any(x[:16].encode() in log for x in SIGS if len(x) >= 16))
        # Scenario 2 to 4: no usable setup.
        for tag, env in (
            ("no-key", {"PAGE_IMAGE_DIR": images}),
            ("short-key", {"PAGE_IMAGE_KEY": key[:31], "PAGE_IMAGE_DIR": images}),
            ("empty-key", {"PAGE_IMAGE_KEY": "", "PAGE_IMAGE_DIR": images}),
            ("no-dir", {"PAGE_IMAGE_KEY": key}),
            ("missing-dir", {"PAGE_IMAGE_KEY": key, "PAGE_IMAGE_DIR": os.path.join(work, "no-such-folder")}),
            ("dir-is-file", {"PAGE_IMAGE_KEY": key, "PAGE_IMAGE_DIR": os.path.join(images, slug, file)}),
        ):
            s = Server(work, args.hooks, env, tag)
            servers.append(s)
            s.start()
            check_unset_server(BASE, key, slug, file, res, "hook (" + tag + ")")
            s.stop()
            res.check("hook (%s): the server log does not hold the key" % tag, key.encode() not in s.log())
        # Scenario 5: a key of exactly 32 characters works.
        key32 = secrets.token_hex(16)
        s = Server(work, args.hooks, {"PAGE_IMAGE_KEY": key32, "PAGE_IMAGE_DIR": images}, "key32")
        servers.append(s)
        s.start()
        st, _, body = get(BASE, link(key32, slug, file))
        res.check("hook (32-character key): a good signature gives 200", st == 200, str(st))
        s.stop()
    except Exception as err:  # count it as a failure and go to the cleanup
        res.check("hook: no unexpected error", False, type(err).__name__ + ": " + str(err)[:300])
    finally:
        for s in servers:
            s.stop()
        shutil.rmtree(work, ignore_errors=True)
    print("Total: " + str(res.passed) + " PASS, " + str(res.failed) + " FAIL")
    return 1 if res.failed else 0


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(1))
    sys.exit(main())
