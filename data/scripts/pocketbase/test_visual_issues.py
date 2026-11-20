#!/usr/bin/env python3
"""Throwaway test for the collection visual_issues (migration 1793300017, unit VW118, Q-A 3:98.5 and 3:99.5). Python 3 standard library only.

Usage:
  TMPDIR=<unit folder>/tmp PB_BIN=<path of the pocketbase binary> python3 -B data/scripts/pocketbase/test_visual_issues.py [--keep]

What it does:
  - copies every migration of pb_migrations into a temp folder and starts a throwaway PocketBase on 127.0.0.1:8092 with a new pb_data there,
  - makes made-up users (@example.test) with random passwords (held in memory, never printed): an admin, two translators, two readers,
  - checks the rules of visual_issues (create, list, view, file, update, delete), the field limits, and the picture limit,
  - checks that the migration is safe to run twice and that the down function keeps a collection with records,
  - stops the PocketBase and deletes the temp folder (unless --keep).
The test uses port 8092 only. It never contacts port 8090 or a real server. The last line is "<n> passed, <m> failed".
"""

import argparse
import json
import os
import secrets
import shutil
import socket
import sqlite3
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zlib

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pb_users  # noqa: E402  (same folder)

PORT = 8092
BASE = "http://127.0.0.1:" + str(PORT)
V2_MIGRATIONS = os.path.join(HERE, "pb_migrations")
MIGRATION = "1793300017_v2_visual_issues.js"
COLLECTION = "visual_issues"
PATH = "/api/collections/" + COLLECTION + "/records"

# Expected rules, written again here on purpose so that the test does not trust the migration file.
CREATE = ('@request.auth.id != "" && (@request.auth.role = "translator" || @request.auth.role = "admin") && @request.body.user = @request.auth.id'
          ' && @request.body.state = "open" && @request.body.resolve_note:isset = false')
READ = '@request.auth.id != "" && (@request.auth.role = "admin" || (@request.auth.role = "translator" && user = @request.auth.id))'
ADMIN = '@request.auth.role = "admin"'
PICTURE_BYTES = 5242880


def pb_binary():
    candidates = [os.environ.get("PB_BIN", ""), os.path.abspath(os.path.join(HERE, "..", "..", "pocketbase", "pocketbase"))]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    raise SystemExit("Set PB_BIN to the pocketbase binary.")


def work_root():
    tmp = os.environ.get("TMPDIR", "")
    if not tmp or tmp.startswith("/tmp") or tmp.startswith("/private/tmp"):
        raise SystemExit("Set TMPDIR to a folder of the unit (not /tmp).")
    return os.path.join(tmp, "pb-visual-8092")


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


# ---------------------------------------------------------------- http

def raw(method, path, data=None, token=None, content_type=None):
    """Return (status, body bytes). Never raise on a 4xx or 5xx status."""
    headers = {}
    if content_type:
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()


def js(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    status, payload = raw(method, path, data, token, "application/json" if data is not None else None)
    try:
        return status, (json.loads(payload) if payload else {})
    except ValueError:
        return status, {}


def multipart(fields, files):
    boundary = "----vw118" + secrets.token_hex(8)
    parts = []
    for key, value in fields.items():
        parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n' % (boundary, key, value)).encode("utf-8"))
    for key, (name, ctype, data) in files.items():
        parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: %s\r\n\r\n' % (boundary, key, name, ctype)).encode("utf-8"))
        parts.append(data)
        parts.append(b"\r\n")
    parts.append(("--%s--\r\n" % boundary).encode("utf-8"))
    return b"".join(parts), "multipart/form-data; boundary=" + boundary


def post_issue(token, fields, picture="png"):
    files = {}
    if picture == "png":
        files["picture"] = ("issue.png", "image/png", SMALL_PNG)
    elif picture == "big":
        files["picture"] = ("issue.png", "image/png", BIG_PNG)
    elif picture == "text":
        files["picture"] = ("issue.png", "image/png", b"this is not a picture, only text")
    elif picture == "jpeg-name":
        files["picture"] = ("issue.jpg", "image/jpeg", b"\xff\xd8\xff\xe0" + b"\x00" * 64)
    data, ctype = multipart(fields, files)
    status, payload = raw("POST", PATH, data, token, ctype)
    try:
        return status, (json.loads(payload) if payload else {})
    except ValueError:
        return status, {}


def is_ok(status):
    return 200 <= status < 300


def is_denied(status):
    return 400 <= status < 500


# ---------------------------------------------------------------- png

def png_bytes(width, height, noise):
    """A valid RGB PNG. noise True makes random pixels that do not compress (for the 5 MB limit)."""
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
    row_len = width * 3
    rows = []
    for y in range(height):
        rows.append(b"\x00" + (os.urandom(row_len) if noise else bytes([200, 40, 40]) * width))
    pixels = b"".join(rows)
    compressed = zlib.compress(pixels, 0 if noise else 6)
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")


SMALL_PNG = png_bytes(40, 30, False)
BIG_PNG = png_bytes(1400, 1250, True)


# ---------------------------------------------------------------- server

class Server:
    def __init__(self, folder):
        self.data = os.path.join(folder, "pb_data")
        self.migrations = os.path.join(folder, "pb_migrations")
        self.log_path = os.path.join(folder, "server.log")
        self.proc = None

    def args(self):
        return ["--dir=" + self.data, "--migrationsDir=" + self.migrations]

    def start(self):
        with socket.socket() as sock:
            sock.settimeout(1)
            if sock.connect_ex(("127.0.0.1", PORT)) == 0:
                raise RuntimeError("Something already listens on 127.0.0.1:" + str(PORT) + ". Stop it first.")
        log = open(self.log_path, "ab")
        self.proc = subprocess.Popen([pb_binary(), "serve", "--http=127.0.0.1:" + str(PORT)] + self.args() + ["--automigrate=false"],
                                     stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
        log.close()
        deadline = time.time() + 40
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError("PocketBase stopped at start. Last log lines:\n" + self.log_tail())
            try:
                if js("GET", "/api/health")[0] == 200:
                    return
            except (urllib.error.URLError, ConnectionError, OSError):
                pass
            time.sleep(0.2)
        raise RuntimeError("PocketBase did not answer /api/health in 40 s.")

    def stop(self):
        if not self.proc or self.proc.poll() is not None:
            return
        self.proc.terminate()
        try:
            self.proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait(timeout=15)

    def log_tail(self, lines=15):
        try:
            with open(self.log_path, "rb") as handle:
                return b"\n".join(handle.read().splitlines()[-lines:]).decode("utf-8", "replace")
        except OSError:
            return "(no log)"

    def log_text(self):
        try:
            with open(self.log_path, "rb") as handle:
                return handle.read().decode("utf-8", "replace")
        except OSError:
            return ""


def sign_in(email, password):
    status, data = js("POST", "/api/collections/users/auth-with-password", {"identity": email, "password": password})
    return status, data.get("token", "")


def file_token(token):
    status, data = js("POST", "/api/files/token", {}, token)
    return data.get("token", "") if status == 200 else ""


def fields_for(user_id, **over):
    base = {"user": user_id, "state": "open", "comment": "Made-up comment: the button looks too small.", "page_url": "/read/made-up-book?view=page&at=p003",
            "screen_width": "1280", "theme": "light"}
    base.update(over)
    return {k: v for k, v in base.items() if v is not None}


# ---------------------------------------------------------------- the checks

def run(res, keep):
    root = work_root()
    if os.path.exists(root):
        shutil.rmtree(root)
    os.makedirs(os.path.join(root, "pb_migrations"))
    os.makedirs(os.path.join(root, "pb_data"))
    for name in sorted(os.listdir(V2_MIGRATIONS)):
        if name.endswith(".js"):
            shutil.copy2(os.path.join(V2_MIGRATIONS, name), os.path.join(root, "pb_migrations", name))
    server = Server(root)
    try:
        superuser_pw = secrets.token_urlsafe(18)
        done = subprocess.run([pb_binary(), "superuser", "upsert", "super@example.test", superuser_pw] + server.args(), capture_output=True, text=True, timeout=120)
        if done.returncode != 0:
            raise RuntimeError("superuser upsert failed with exit code " + str(done.returncode))
        server.start()
        status, data = js("POST", "/api/collections/_superusers/auth-with-password", {"identity": "super@example.test", "password": superuser_pw})
        if status != 200:
            raise RuntimeError("superuser sign-in failed with status " + str(status))
        su = data["token"]

        plan = [("admin1", "admin"), ("tr1", "translator"), ("tr2", "translator"), ("rd1", "reader"), ("rd2", "reader")]
        pw, tok, uid = {}, {}, {}
        for key, role in plan:
            pw[key] = secrets.token_urlsafe(18)
            record = pb_users.add_user(BASE, su, key + "@example.test", role, pw[key], name=key)
            uid[key] = record["id"]
        # rd2 is a reader that waits for approval.
        pb_users.update_user(BASE, su, "rd2@example.test", {"approved": False})
        for key, _ in plan:
            status, token = sign_in(key + "@example.test", pw[key])
            if status != 200:
                raise RuntimeError("setup sign-in failed for " + key)
            tok[key] = token

        # ---- the collection and its rules
        status, col = js("GET", "/api/collections/" + COLLECTION, token=su)
        res.check("0a the collection visual_issues exists after the migrations", status == 200, "status " + str(status))
        for rule, want in (("createRule", CREATE), ("listRule", READ), ("viewRule", READ), ("updateRule", ADMIN), ("deleteRule", ADMIN)):
            res.check("0b rule " + rule + " has the expected text", col.get(rule) == want, "got " + str(col.get(rule)))
        names = {f["name"]: f for f in col.get("fields", [])}
        res.check("0c the fields are user, picture, comment, page_url, screen_width, theme, state, resolve_note, created, updated",
                  set(names) == {"id", "user", "picture", "comment", "page_url", "screen_width", "theme", "state", "resolve_note", "created", "updated"}, str(sorted(names)))
        res.check("0d the picture field is one protected PNG file of at most 5 MB",
                  names["picture"].get("maxSelect") == 1 and names["picture"].get("protected") is True and names["picture"].get("maxSize") == PICTURE_BYTES
                  and names["picture"].get("mimeTypes") == ["image/png"], str(names["picture"]))
        res.check("0e each text field has an explicit max", all(names[n].get("max", 0) > 0 for n in ("comment", "page_url", "theme", "resolve_note")), "a max is missing")

        # ---- create
        status, first = post_issue(tok["tr1"], fields_for(uid["tr1"]))
        res.check("1a a translator creates an own issue", is_ok(status) and first.get("state") == "open" and first.get("user") == uid["tr1"], "status " + str(status) + " " + str(first)[:160])
        res.check("1b the stored picture has a file name", isinstance(first.get("picture"), str) and first["picture"].endswith(".png"), str(first.get("picture")))
        status, adm = post_issue(tok["admin1"], fields_for(uid["admin1"], comment="Admin issue"))
        res.check("1c an admin creates an own issue", is_ok(status) and adm.get("state") == "open", "status " + str(status))
        status, second = post_issue(tok["tr2"], fields_for(uid["tr2"], comment="Second translator issue"))
        res.check("1d a second translator creates an own issue", is_ok(status), "status " + str(status))
        status, _ = post_issue(tok["rd1"], fields_for(uid["rd1"]))
        res.check("2a an approved reader cannot create an issue", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["rd2"], fields_for(uid["rd2"]))
        res.check("2b a reader that waits for approval cannot create an issue", is_denied(status), "status " + str(status))
        status, _ = post_issue(None, fields_for(uid["tr1"]))
        res.check("2c a request without a sign-in cannot create an issue", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr2"]))
        res.check("3a a translator cannot create an issue for another user", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["admin1"], fields_for(uid["tr1"]))
        res.check("3b an admin cannot create an issue for another user", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], user=None))
        res.check("3c a create without the user field is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], state="resolved"))
        res.check("4a a create with the state resolved is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], state=None))
        res.check("4b a create without a state is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], resolve_note="done"))
        res.check("4c a create with a resolve note is refused", is_denied(status), "status " + str(status))

        # ---- field limits
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], comment="x" * 5000))
        res.check("5a a comment of 5000 characters is accepted", is_ok(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], comment="x" * 5001))
        res.check("5b a comment of 5001 characters is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], comment=""))
        res.check("5c an empty comment is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], page_url="/" + "a" * 1999))
        res.check("5d a page address of 2000 characters is accepted", is_ok(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], page_url="/" + "a" * 2000))
        res.check("5e a page address of 2001 characters is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], theme="t" * 41))
        res.check("5f a theme text of 41 characters is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], screen_width="-5"))
        res.check("5g a negative screen width is refused", is_denied(status), "status " + str(status))
        # Observation: PocketBase treats the number 0 as an empty value, so the min rule does not apply to it. The app never sends 0 (it sends the window width, at least 1).
        status, zero = post_issue(tok["tr1"], fields_for(uid["tr1"], screen_width="0"))
        res.check("5g2 a screen width of 0 counts as no value (PocketBase skips the min rule for an empty number)", is_ok(status) and zero.get("screen_width") == 0, "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], screen_width="20001"))
        res.check("5h a screen width of 20001 is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"], screen_width="390.5"))
        res.check("5i a screen width that is no whole number is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"]), picture="none")
        res.check("6a a create without a picture is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"]), picture="big")
        res.check("6b a picture over 5 MB is refused (" + str(len(BIG_PNG)) + " bytes, limit " + str(PICTURE_BYTES) + ")", len(BIG_PNG) > PICTURE_BYTES and is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"]), picture="text")
        res.check("6c a file that is no PNG is refused", is_denied(status), "status " + str(status))
        status, _ = post_issue(tok["tr1"], fields_for(uid["tr1"]), picture="jpeg-name")
        res.check("6d a JPEG file is refused", is_denied(status), "status " + str(status))

        # ---- list and view
        def count(token):
            status, data = js("GET", PATH + "?perPage=200&skipTotal=0", token=token)
            return status, data.get("totalItems", None)
        status, n_admin = count(tok["admin1"])
        status_tr1, n_tr1 = count(tok["tr1"])
        status_tr2, n_tr2 = count(tok["tr2"])
        # tr1 made 4 issues (first, 5000-char comment, 2000-char page address, width 0). admin1 made 1, tr2 made 1.
        res.check("7a a translator lists the own issues only (4 of 6)", status_tr1 == 200 and n_tr1 == 4 and n_admin == 6, "tr1 " + str(n_tr1) + ", admin " + str(n_admin))
        res.check("7b the second translator lists the own issue only (1)", status_tr2 == 200 and n_tr2 == 1, str(n_tr2))
        status, n_rd = count(tok["rd1"])
        res.check("7c a reader lists no issue", is_denied(status) or n_rd == 0, "status " + str(status) + " items " + str(n_rd))
        status, n_none = count(None)
        res.check("7d no sign-in lists no issue", is_denied(status) or n_none == 0, "status " + str(status) + " items " + str(n_none))
        one = PATH + "/" + first["id"]
        status, _ = js("GET", one, token=tok["tr2"])
        res.check("8a a translator cannot view the issue of another translator", is_denied(status), "status " + str(status))
        status, _ = js("GET", one, token=tok["tr1"])
        res.check("8b a translator views the own issue", is_ok(status), "status " + str(status))
        status, _ = js("GET", one, token=tok["admin1"])
        res.check("8c an admin views any issue", is_ok(status), "status " + str(status))
        status, _ = js("GET", one, token=tok["rd1"])
        res.check("8d a reader cannot view an issue", is_denied(status), "status " + str(status))
        status, _ = js("GET", one)
        res.check("8e no sign-in cannot view an issue", is_denied(status), "status " + str(status))
        status, data = js("GET", PATH + "?perPage=200&sort=state,-created&expand=user&fields=id,state,expand.user.name", token=tok["admin1"])
        res.check("8f an admin reads the name of the user through expand", status == 200 and any(i.get("expand", {}).get("user", {}).get("name") == "tr1" for i in data.get("items", [])), "status " + str(status))

        # ---- the picture file (protected)
        furl = "/api/files/" + COLLECTION + "/" + first["id"] + "/" + first["picture"]
        status, _ = raw("GET", furl)
        res.check("9a the picture file without a token is refused", is_denied(status), "status " + str(status))
        status, body = raw("GET", furl + "?token=" + file_token(tok["admin1"]))
        res.check("9b the admin gets the picture with a file token and it is a PNG", status == 200 and body[:8] == b"\x89PNG\r\n\x1a\n", "status " + str(status))
        status, body = raw("GET", furl + "?token=" + file_token(tok["tr1"]))
        res.check("9c the author gets the own picture with a file token", status == 200 and body[:8] == b"\x89PNG\r\n\x1a\n", "status " + str(status))
        status, _ = raw("GET", furl + "?token=" + file_token(tok["tr2"]))
        res.check("9d another translator does not get the picture", is_denied(status), "status " + str(status))
        status, _ = raw("GET", furl + "?token=" + file_token(tok["rd1"]))
        res.check("9e a reader does not get the picture", is_denied(status), "status " + str(status))

        # ---- update and delete
        status, _ = js("PATCH", one, {"state": "resolved", "resolve_note": "forged"}, tok["tr1"])
        res.check("10a the author cannot set the state", is_denied(status), "status " + str(status))
        status, _ = js("PATCH", one, {"state": "resolved", "resolve_note": "forged"}, tok["tr2"])
        res.check("10b another translator cannot set the state", is_denied(status), "status " + str(status))
        status, _ = js("PATCH", one, {"state": "resolved", "resolve_note": "forged"}, tok["rd1"])
        res.check("10c a reader cannot set the state", is_denied(status), "status " + str(status))
        status, _ = js("PATCH", one, {"state": "resolved", "resolve_note": "forged"})
        res.check("10d no sign-in cannot set the state", is_denied(status), "status " + str(status))
        status, _ = js("DELETE", one, token=tok["tr1"])
        res.check("10e the author cannot delete the issue", is_denied(status), "status " + str(status))
        status, data = js("GET", one, token=tok["admin1"])
        res.check("10f the issue is still open and has no note after the refused changes", data.get("state") == "open" and data.get("resolve_note", "") == "", str(data.get("state")))
        status, data = js("PATCH", one, {"state": "resolved", "resolve_note": "unit VW199, commit abc1234"}, tok["admin1"])
        res.check("11a the admin marks the issue resolved with a note", is_ok(status) and data.get("state") == "resolved" and data.get("resolve_note") == "unit VW199, commit abc1234", "status " + str(status))
        status, _ = js("PATCH", one, {"resolve_note": "n" * 2001}, tok["admin1"])
        res.check("11b a resolve note of 2001 characters is refused", is_denied(status), "status " + str(status))
        status, data = js("GET", PATH + "?perPage=200&sort=state,-created&fields=id,state", token=tok["admin1"])
        states = [i["state"] for i in data.get("items", [])]
        res.check("11c the list sorted by state puts the open issues before the resolved one", states == sorted(states) and states[-1] == "resolved" and states.count("resolved") == 1, str(states))
        status, _ = js("DELETE", PATH + "/" + second["id"], token=tok["admin1"])
        res.check("11d the admin deletes an issue", is_ok(status) or status == 204, "status " + str(status))

        # ---- the migration twice, and the down function
        server.stop()
        db = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
        before = db.execute("select count(*) from _migrations where file = ?", (MIGRATION,)).fetchone()[0]
        db.execute("delete from _migrations where file = ?", (MIGRATION,))
        db.commit()
        db.close()
        server.start()
        res.check("12a the migration was recorded once and the record was removed for the test", before == 1, "count " + str(before))
        res.check("12b the second run prints that the collection exists and leaves it", "collection visual_issues exists, left as it is" in server.log_text(), "line missing in the log")
        su = js("POST", "/api/collections/_superusers/auth-with-password", {"identity": "super@example.test", "password": superuser_pw})[1].get("token", "")
        status, col2 = js("GET", "/api/collections/" + COLLECTION, token=su)
        res.check("12c the collection keeps its rules and fields after the second run", status == 200 and col2.get("createRule") == CREATE and len(col2.get("fields", [])) == len(col.get("fields", [])), "status " + str(status))
        status, data = js("GET", PATH + "?perPage=1", token=su)
        total = data.get("totalItems", 0)
        res.check("12d the records are still there after the second run (" + str(total) + ")", status == 200 and total == 5, "total " + str(total))
        # The down function. After `migrate down` the server is not started, because a start applies the open migration again. The test reads the collection list of the file data.db.
        def has_collection():
            db = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
            try:
                return db.execute("select count(*) from _collections where name = ?", (COLLECTION,)).fetchone()[0] == 1
            finally:
                db.close()
        server.stop()
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        res.check("13a the down function keeps a collection with records and says so", "collection visual_issues has records, kept" in (down.stdout + down.stderr), (down.stdout + down.stderr)[-200:])
        res.check("13b the collection with records is still in the database after the down run", has_collection(), "collection is gone")
        server.start()
        su = js("POST", "/api/collections/_superusers/auth-with-password", {"identity": "super@example.test", "password": superuser_pw})[1].get("token", "")
        status, data = js("GET", PATH + "?perPage=1", token=su)
        res.check("13c the records are still there after down and the next start (" + str(data.get("totalItems")) + ")", status == 200 and data.get("totalItems") == 5, "status " + str(status))
        # Remove the records, then the down function deletes the empty collection.
        status, data = js("GET", PATH + "?perPage=200&fields=id", token=su)
        for item in data.get("items", []):
            js("DELETE", PATH + "/" + item["id"], token=su)
        server.stop()
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        res.check("13d the down function deletes an empty collection", not has_collection(), (down.stdout + down.stderr)[-200:])
        up = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        res.check("13e the up run creates the collection again", has_collection(), (up.stdout + up.stderr)[-200:])
    finally:
        server.stop()
        with socket.socket() as sock:
            sock.settimeout(1)
            res.check("14 the test PocketBase on port 8092 is stopped", sock.connect_ex(("127.0.0.1", PORT)) != 0, "port 8092 still answers")
        if not keep and os.path.exists(root):
            shutil.rmtree(root)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()
    res = Results()
    try:
        run(res, args.keep)
    except Exception as err:  # noqa: BLE001  (the test reports any setup fault as a failed check)
        res.check("setup and run without an error", False, str(err)[:400])
    print("%d passed, %d failed" % (res.passed, res.failed))
    return 1 if res.failed else 0


if __name__ == "__main__":
    sys.exit(main())
