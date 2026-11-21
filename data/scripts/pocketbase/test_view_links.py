#!/usr/bin/env python3
"""Throwaway test for the view-only links (migration 1793300018, unit VW120, Q-A 3:105.8, 3:106.5, 3:107.4, 3:107.5). Python 3 standard library only.

Usage:
  TMPDIR=<unit folder>/tmp PB_BIN=<path of the pocketbase binary> python3 -B data/scripts/pocketbase/test_view_links.py [--keep]

What it does:
  - copies every migration of pb_migrations into a temp folder and starts a throwaway PocketBase on 127.0.0.1:8092 with a new pb_data there,
  - makes made-up users (@example.test) with random passwords (held in memory, never printed): an admin, a translator, an approved reader, a reader that waits,
  - makes made-up records in the seven reader lists and made-up links (on, off, ended, end in the future),
  - checks: no key and a wrong key read nothing, the key of a link that is on reads the reader lists exactly as an approved reader, a link that is off or ended reads nothing,
    a key holder cannot list or view view_links, cannot change a link, cannot write any list, a real reader, translator and admin read as before,
    the open count list (create-only), the rules and the fields of the two new lists,
  - checks that the migration is safe to run twice and that the down function puts the old rules back exactly,
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
import subprocess
import sys
import time
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pb_users  # noqa: E402  (same folder)

PORT = 8092
BASE = "http://127.0.0.1:" + str(PORT)
V2_MIGRATIONS = os.path.join(HERE, "pb_migrations")
MIGRATION = "1793300018_v2_view_links.js"
KEY_HEADER = "X-Kendo-View-Key"

# Expected rules, written again here on purpose so that the test does not trust the migration file.
ADMIN = '@request.auth.role = "admin"'
READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")'
SIGNED_IN = '@request.auth.id != ""'
LINK_OK = ('@request.headers.x_kendo_view_key != "" && @collection.view_links:l.key ?= @request.headers.x_kendo_view_key && @collection.view_links:l.off ?= false'
           ' && (@collection.view_links:l.ends ?= "" || @collection.view_links:l.ends ?> @now)')
OPENS_CREATE = '@request.body.key = @request.headers.x_kendo_view_key && @request.body.created:isset = false && ' + LINK_OK
# list name -> (old read rule, old create rule, old update rule, old delete rule). The write rules must not change.
READ_LISTS = {
    "reader_pages": (READ_OK, None, None, None),
    "reader_versions": (READ_OK, ADMIN, ADMIN, ADMIN),
    "v1_placeholders": (READ_OK, None, None, None),
    "catalog_items": (SIGNED_IN, None, None, None),
    "magazine_chapters": (SIGNED_IN, None, None, None),
    "book_toc": (SIGNED_IN, None, None, None),
    "page_checks": (SIGNED_IN, ADMIN, ADMIN, ADMIN),
}
# Lists that a link visitor must NOT read (the key must not open them).
CLOSED_LISTS = ["page_runs", "run_marks", "reader_opens", "reader_progress", "reader_bookmarks", "user_settings", "own_translations", "comments", "users",
                "visual_issues", "view_links", "view_link_opens"]


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
    return os.path.join(tmp, "pb-viewlinks-8092")


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

def js(method, path, body=None, token=None, key=None, headers=None):
    """Return (status, json). Never raise on a 4xx or 5xx status. `key` is sent in the header X-Kendo-View-Key."""
    h = {}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h["Content-Type"] = "application/json"
    if token:
        h["Authorization"] = token
    if key is not None:
        h[KEY_HEADER] = key
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            payload = response.read()
            status = response.status
    except urllib.error.HTTPError as err:
        payload = err.read()
        status = err.code
    try:
        return status, (json.loads(payload) if payload else {})
    except ValueError:
        return status, {}


def is_ok(status):
    return 200 <= status < 300


def is_denied(status):
    return 400 <= status < 500


def new_key():
    return secrets.token_urlsafe(32)  # 43 characters


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


def listing(name, token=None, key=None, extra=""):
    status, data = js("GET", "/api/collections/" + name + "/records?perPage=200" + extra, token=token, key=key)
    return status, data.get("items", []) if status == 200 else []


def sorted_json(items):
    return json.dumps(sorted(items, key=lambda x: x.get("id", "")), sort_keys=True)


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

        plan = [("admin1", "admin"), ("tr1", "translator"), ("rd1", "reader"), ("rd2", "reader")]
        pw, tok, uid = {}, {}, {}
        for key, role in plan:
            pw[key] = secrets.token_urlsafe(18)
            record = pb_users.add_user(BASE, su, key + "@example.test", role, pw[key], name=key)
            uid[key] = record["id"]
        pb_users.update_user(BASE, su, "rd2@example.test", {"approved": False})  # rd2 waits for approval
        for key, _ in plan:
            status, token = sign_in(key + "@example.test", pw[key])
            if status != 200:
                raise RuntimeError("setup sign-in failed for " + key)
            tok[key] = token

        # ---- the two new collections and the new read rules
        status, links = js("GET", "/api/collections/view_links", token=su)
        res.check("0a the collection view_links exists after the migrations", status == 200, "status " + str(status))
        for rule in ("listRule", "viewRule", "createRule", "updateRule", "deleteRule"):
            res.check("0b view_links " + rule + " is admin only", links.get(rule) == ADMIN, "got " + str(links.get(rule)))
        lf = {f["name"]: f for f in links.get("fields", [])}
        res.check("0c view_links fields are name, key, ends, off, created_by, created, updated",
                  set(lf) == {"id", "name", "key", "ends", "off", "created_by", "created", "updated"}, str(sorted(lf)))
        res.check("0d view_links key is a required text of exactly 43 characters with the base64url pattern",
                  lf["key"].get("required") is True and lf["key"].get("min") == 43 and lf["key"].get("max") == 43 and lf["key"].get("pattern") == "^[A-Za-z0-9_-]{43}$", str(lf["key"]))
        res.check("0e view_links name is required with a max of 120", lf["name"].get("required") is True and lf["name"].get("max") == 120, str(lf["name"]))
        res.check("0f view_links has a unique index on key", any("UNIQUE" in i.upper() and "key" in i for i in links.get("indexes", [])), str(links.get("indexes")))
        status, opens = js("GET", "/api/collections/view_link_opens", token=su)
        res.check("0g the collection view_link_opens exists", status == 200, "status " + str(status))
        res.check("0h view_link_opens list and view are admin only", opens.get("listRule") == ADMIN and opens.get("viewRule") == ADMIN, str((opens.get("listRule"), opens.get("viewRule"))))
        res.check("0i view_link_opens create rule is the key check", opens.get("createRule") == OPENS_CREATE, "got " + str(opens.get("createRule")))
        res.check("0j view_link_opens update and delete are closed (superuser only)", opens.get("updateRule") is None and opens.get("deleteRule") is None,
                  str((opens.get("updateRule"), opens.get("deleteRule"))))
        of = {f["name"]: f for f in opens.get("fields", [])}
        res.check("0k view_link_opens fields are key and created", set(of) == {"id", "key", "created"}, str(sorted(of)))
        for name, (old, c, u, d) in READ_LISTS.items():
            status, col = js("GET", "/api/collections/" + name, token=su)
            want = "(" + old + ") || (" + LINK_OK + ")"
            res.check("0l " + name + " list and view rules are the old rule or the link rule", status == 200 and col.get("listRule") == want and col.get("viewRule") == want,
                      "list " + str(col.get("listRule")) + " view " + str(col.get("viewRule")))
            res.check("0m " + name + " write rules did not change", (col.get("createRule"), col.get("updateRule"), col.get("deleteRule")) == (c, u, d),
                      str((col.get("createRule"), col.get("updateRule"), col.get("deleteRule"))))

        # ---- made-up data in the seven reader lists (superuser)
        seed = {
            "reader_pages": {"page_id": "book_a/p001", "item_id": "book_a", "n": 1, "run_id": "run1", "rows": [], "terms": {}, "extras": [], "agree": {}, "search_en": "made up text"},
            "reader_versions": {"page_id": "book_a/p001", "version": 1, "run_id": "run1", "rows": []},
            "v1_placeholders": {"slug": "book_a", "n": 1, "page_id": "book_a/p001", "md": "made up v1 text"},
            "catalog_items": {"item_id": "book_a", "kind": "book", "folder": "book_a", "pages": 3, "title_en": "Made-up book"},
            "magazine_chapters": {"chapter": "kj-2014-10", "book": "kj", "year": 2014, "month": 10, "chapter_title_en": "Made-up chapter"},
            "book_toc": {"book": "book_a", "order": 1, "level": 1, "title_ja": "made up", "title_en": "Made-up chapter"},
            "page_checks": {"page_id": "book_a/p001", "note": "made up"},
        }
        rec_id = {}
        for name, body in seed.items():
            status, rec = js("POST", "/api/collections/" + name + "/records", body, token=su)
            res.check("1a seed record in " + name, is_ok(status), "status " + str(status) + " " + str(rec)[:200])
            rec_id[name] = rec.get("id", "")
        # records in lists that a link visitor must not read
        js("POST", "/api/collections/reader_opens/records", {"run_id": "run1", "page_id": "book_a/p001"}, token=su)
        js("POST", "/api/collections/comments/records", {"user": uid["tr1"], "page_id": "book_a/p001", "group_key": "g", "text": "made up", "shared": True}, token=su)

        # ---- links (made by the admin through the API, like the app does)
        keys = {n: new_key() for n in ("on", "off", "future", "past", "on2")}
        mk = {
            "on": {"name": "Link on"},
            "off": {"name": "Link off", "off": True},
            "future": {"name": "Link future end", "ends": "2099-01-01 07:59:59.000Z"},
            "past": {"name": "Link ended", "ends": "2020-01-01 07:59:59.000Z"},
            "on2": {"name": "Second link on"},
        }
        link_id = {}
        for n, body in mk.items():
            status, rec = js("POST", "/api/collections/view_links/records", dict(body, key=keys[n], created_by=uid["admin1"]), token=tok["admin1"])
            res.check("2a the admin makes the link '" + n + "'", is_ok(status) and rec.get("key") == keys[n], "status " + str(status) + " " + str(rec)[:200])
            link_id[n] = rec.get("id", "")
        status, rec = js("POST", "/api/collections/view_links/records", {"name": "Same key", "key": keys["on"]}, token=tok["admin1"])
        res.check("2b a second link with the same key is refused (unique)", is_denied(status), "status " + str(status))
        for label, bad in (("42 characters", new_key()[:42]), ("44 characters", new_key() + "a"), ("a space inside", new_key()[:42] + " "), ("a plus sign", new_key()[:42] + "+"), ("empty", "")):
            status, _ = js("POST", "/api/collections/view_links/records", {"name": "Bad key", "key": bad}, token=tok["admin1"])
            res.check("2c a key of " + label + " is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_links/records", {"name": "", "key": new_key()}, token=tok["admin1"])
        res.check("2d a link with no name is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_links/records", {"name": "n" * 121, "key": new_key()}, token=tok["admin1"])
        res.check("2e a link name of 121 characters is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_links/records", {"name": "n" * 120, "key": new_key()}, token=tok["admin1"])
        res.check("2f a link name of 120 characters is accepted", is_ok(status), "status " + str(status))

        # ---- who reads what: the reference is an approved reader (rd1)
        reference = {}
        for name in READ_LISTS:
            status, items = listing(name, token=tok["rd1"])
            reference[name] = items
            res.check("3a an approved reader reads one record of " + name, status == 200 and len(items) == 1, "status " + str(status) + " items " + str(len(items)))

        # no key, wrong key, odd keys read nothing
        wrongs = [("no key", None), ("a wrong key of 43 characters", new_key()), ("a short key", "abc"), ("empty header", ""), ("43 percent signs", "%" * 43),
                  ("43 underscores", "_" * 43), ("an SQL-like text", '" || 1=1 --'), ("an asterisk", "*"), ("the key in lower case", keys["on"].lower()),
                  ("the key with a space at the end", keys["on"] + " x")]
        for name in READ_LISTS:
            for label, k in wrongs:
                status, items = listing(name, key=k)
                res.check("3b " + name + ": " + label + " reads nothing", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
            status, _ = js("GET", "/api/collections/" + name + "/records/" + rec_id[name])
            res.check("3c " + name + ": a view with no key is refused", status in (403, 404), "status " + str(status))
            status, _ = js("GET", "/api/collections/" + name + "/records/" + rec_id[name], key=new_key())
            res.check("3d " + name + ": a view with a wrong key is refused", status in (403, 404), "status " + str(status))

        # the key of a link that is on (and of a link with an end in the future) reads exactly as an approved reader
        for label in ("on", "future", "on2"):
            for name in READ_LISTS:
                status, items = listing(name, key=keys[label])
                res.check("4a " + name + ": the key of link '" + label + "' lists the same records as an approved reader", status == 200 and sorted_json(items) == sorted_json(reference[name]),
                          "status " + str(status) + " items " + str(len(items)))
                status, one = js("GET", "/api/collections/" + name + "/records/" + rec_id[name], key=keys[label])
                ref_one = js("GET", "/api/collections/" + name + "/records/" + rec_id[name], token=tok["rd1"])[1]
                res.check("4b " + name + ": the key of link '" + label + "' views the record like an approved reader", status == 200 and json.dumps(one, sort_keys=True) == json.dumps(ref_one, sort_keys=True),
                          "status " + str(status))

        # off or ended: nothing
        for label in ("off", "past"):
            for name in READ_LISTS:
                status, items = listing(name, key=keys[label])
                res.check("5a " + name + ": the key of link '" + label + "' reads nothing", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
                status, _ = js("GET", "/api/collections/" + name + "/records/" + rec_id[name], key=keys[label])
                res.check("5b " + name + ": a view with the key of link '" + label + "' is refused", status in (403, 404), "status " + str(status))

        # the state changes at once: turn the link off, then on again, then end it
        status, _ = js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"off": True}, token=tok["admin1"])
        status2, items = listing("catalog_items", key=keys["on"])
        res.check("5c after the admin turns a link off, its key reads nothing at once", is_ok(status) and status2 == 200 and len(items) == 0, "patch " + str(status) + " list " + str(status2) + " items " + str(len(items)))
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"off": False}, token=tok["admin1"])
        status2, items = listing("catalog_items", key=keys["on"])
        res.check("5d after the admin turns it on again, the key reads again", status2 == 200 and len(items) == 1, "items " + str(len(items)))
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"ends": "2020-06-01 07:59:59.000Z"}, token=tok["admin1"])
        status2, items = listing("catalog_items", key=keys["on"])
        res.check("5e after an end date in the past, the key reads nothing", status2 == 200 and len(items) == 0, "items " + str(len(items)))
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"ends": ""}, token=tok["admin1"])
        status2, items = listing("catalog_items", key=keys["on"])
        res.check("5f after the end date is cleared, the key reads again", status2 == 200 and len(items) == 1, "items " + str(len(items)))
        # a key that is on does not help while another link is off (all conditions hold on one record)
        status2, items = listing("catalog_items", key=keys["off"])
        res.check("5g a link that is off stays closed while other links are on", len(items) == 0, "items " + str(len(items)))

        # ---- lists that a link visitor must not read
        for name in CLOSED_LISTS:
            status, items = listing(name, key=keys["on"])
            res.check("6a " + name + ": the key of a link that is on reads nothing here", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        status, items = listing("view_links", key=keys["on"])
        res.check("6b a key holder cannot list view_links (status " + str(status) + ", " + str(len(items)) + " items)", len(items) == 0, "status " + str(status))
        status, one = js("GET", "/api/collections/view_links/records/" + link_id["on"], key=keys["on"])
        res.check("6c a key holder cannot view the own link record (status " + str(status) + ")", is_denied(status) and "key" not in one, "status " + str(status))
        status, data = js("GET", "/api/collections/view_links/records?filter=" + urllib_quote('key="' + keys["on"] + '"'), key=keys["on"])
        res.check("6d a key holder cannot find a link by a filter on its key", len(data.get("items", [])) == 0, "status " + str(status))
        for who in ("tr1", "rd1", "rd2"):
            status, items = listing("view_links", token=tok[who])
            res.check("6e " + who + " cannot list view_links", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
            status, _ = js("GET", "/api/collections/view_links/records/" + link_id["on"], token=tok[who])
            res.check("6f " + who + " cannot view a link record", is_denied(status), "status " + str(status))
            status, _ = js("POST", "/api/collections/view_links/records", {"name": "x", "key": new_key()}, token=tok[who])
            res.check("6g " + who + " cannot make a link", is_denied(status), "status " + str(status))
            status, _ = js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"off": True}, token=tok[who])
            res.check("6h " + who + " cannot change a link", is_denied(status), "status " + str(status))
            status, _ = js("DELETE", "/api/collections/view_links/records/" + link_id["on"], token=tok[who])
            res.check("6i " + who + " cannot delete a link", is_denied(status), "status " + str(status))
        status, items = listing("view_links")
        res.check("6j a request with no sign-in and no key cannot list view_links", len(items) == 0, "status " + str(status))
        status, items = listing("view_links", token=tok["admin1"])
        res.check("6k the admin lists all links (" + str(len(items)) + ")", status == 200 and len(items) >= 6, "status " + str(status) + " items " + str(len(items)))

        # ---- a key holder cannot write any list
        write_bodies = {
            "reader_pages": seed["reader_pages"], "reader_versions": dict(seed["reader_versions"], page_id="book_a/p002"), "v1_placeholders": dict(seed["v1_placeholders"], n=2, page_id="book_a/p002"),
            "catalog_items": dict(seed["catalog_items"], item_id="book_b"), "magazine_chapters": dict(seed["magazine_chapters"], chapter="kj-2014-11"),
            "book_toc": dict(seed["book_toc"], order=2), "page_checks": dict(seed["page_checks"], page_id="book_a/p002"),
            "page_runs": {"run_id": "r"}, "run_marks": {"page_id": "x"}, "reader_opens": {"run_id": "r2", "page_id": "book_a/p001"},
            "reader_progress": {"user": uid["rd1"], "page_id": "book_a/p001"}, "reader_bookmarks": {"user": uid["rd1"], "page_id": "book_a/p001"},
            "user_settings": {"user": uid["rd1"]}, "own_translations": {"user": uid["rd1"]}, "comments": {"user": uid["rd1"], "page_id": "book_a/p001", "text": "x"},
            "visual_issues": {"user": uid["rd1"], "comment": "x", "state": "open"}, "view_links": {"name": "x", "key": new_key()},
        }
        for name, body in write_bodies.items():
            for label, k in (("a key that is on", keys["on"]), ("a wrong key", new_key()), ("no key", None)):
                status, _ = js("POST", "/api/collections/" + name + "/records", body, key=k)
                res.check("7a " + name + ": a create with " + label + " is refused", is_denied(status), "status " + str(status))
        for name, rid in rec_id.items():
            status, _ = js("PATCH", "/api/collections/" + name + "/records/" + rid, {"page_id": "changed"} if "page_id" in seed[name] else {"note": "changed"}, key=keys["on"])
            res.check("7b " + name + ": an update with a key that is on is refused", is_denied(status), "status " + str(status))
            status, _ = js("DELETE", "/api/collections/" + name + "/records/" + rid, key=keys["on"])
            res.check("7c " + name + ": a delete with a key that is on is refused", is_denied(status), "status " + str(status))
        # the records are still there and unchanged
        for name in READ_LISTS:
            status, items = listing(name, token=tok["rd1"])
            res.check("7d " + name + " is unchanged after the refused writes", sorted_json(items) == sorted_json(reference[name]), "items differ")
        # the sign-up rule of users is public by design (a key header does not change it)
        status, _ = js("POST", "/api/collections/users/records", {"email": "x@example.test", "password": "x" * 12, "passwordConfirm": "x" * 12, "role": "admin"}, key=keys["on"])
        res.check("7e a key holder cannot create an admin user (the sign-up rule allows readers only)", is_denied(status), "status " + str(status))

        # ---- real readers, translators and admins read as before
        for name in READ_LISTS:
            status, items = listing(name, token=tok["tr1"])
            res.check("8a a translator reads " + name + " as before", status == 200 and len(items) == 1, "items " + str(len(items)))
            status, items = listing(name, token=tok["admin1"])
            res.check("8b an admin reads " + name + " as before", status == 200 and len(items) == 1, "items " + str(len(items)))
        for name, (old, c, u, d) in READ_LISTS.items():
            status, items = listing(name, token=tok["rd2"])
            expect = 0 if old == READ_OK else 1
            res.check("8c a reader that waits for approval reads " + str(expect) + " record(s) of " + name + " as before", status == 200 and len(items) == expect, "items " + str(len(items)))
            status, items = listing(name)
            res.check("8d a request with no sign-in and no key reads nothing of " + name, len(items) == 0, "items " + str(len(items)))
        for name in ("reader_versions", "page_checks"):
            status, _ = js("POST", "/api/collections/" + name + "/records", write_bodies[name], token=tok["admin1"])
            res.check("8e the admin still creates a record in " + name, is_ok(status), "status " + str(status))
            status, _ = js("POST", "/api/collections/" + name + "/records", dict(write_bodies[name], page_id="book_a/p003"), token=tok["rd1"])
            res.check("8f a reader still cannot create a record in " + name, is_denied(status), "status " + str(status))
        # a waiting reader gains nothing from a key header of a link that is off, and an approved reader is not worse off with a key header
        status, items = listing("reader_pages", token=tok["rd2"], key=keys["off"])
        res.check("8g a reader that waits for approval reads nothing of reader_pages with the key of a link that is off", len(items) == 0, "items " + str(len(items)))
        status, items = listing("reader_pages", token=tok["rd1"], key=new_key())
        res.check("8h an approved reader reads as before with a wrong key header", status == 200 and len(items) == 1, "items " + str(len(items)))

        # ---- the open list (create-only)
        def open_count(k):
            status, data = js("GET", "/api/collections/view_link_opens/records?perPage=1&skipTotal=0&sort=-created&filter=" + urllib_quote('key="' + k + '"'), token=tok["admin1"])
            return data.get("totalItems", -1) if status == 200 else -1, (data.get("items") or [{}])[0].get("created", "")

        n0, _ = open_count(keys["on"])
        res.check("9a no open is stored before the first open", n0 == 0, "count " + str(n0))
        status, rec = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on"]}, key=keys["on"])
        res.check("9b a key holder adds one open with its own key", is_ok(status) and rec.get("key") == keys["on"], "status " + str(status) + " " + str(rec)[:160])
        time.sleep(1.1)
        status, rec = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on"]}, key=keys["on"])
        res.check("9c a second open is added", is_ok(status), "status " + str(status))
        n1, last = open_count(keys["on"])
        res.check("9d the admin counts 2 opens and sees a last open time (" + last + ")", n1 == 2 and bool(last), "count " + str(n1) + " last " + last)
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["off"]}, key=keys["off"])
        res.check("9e an open of a link that is off is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["past"]}, key=keys["past"])
        res.check("9f an open of a link that has ended is refused", is_denied(status), "status " + str(status))
        wrong = new_key()
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": wrong}, key=wrong)
        res.check("9g an open with an unknown key is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on2"]}, key=keys["on"])
        res.check("9h a body key that differs from the header key is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on"]})
        res.check("9i an open with no key header is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on"]}, token=tok["rd1"])
        res.check("9j a signed-in reader without the key header cannot add an open", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {"key": keys["on"], "created": "2001-01-01 00:00:00.000Z"}, key=keys["on"])
        res.check("9k an open that sets the time by hand is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/view_link_opens/records", {}, key=keys["on"])
        res.check("9l an open with no body key is refused", is_denied(status), "status " + str(status))
        status, items = listing("view_link_opens", key=keys["on"])
        res.check("9m a key holder cannot list the opens", len(items) == 0, "status " + str(status))
        for who in ("tr1", "rd1"):
            status, items = listing("view_link_opens", token=tok[who])
            res.check("9n " + who + " cannot list the opens", len(items) == 0, "status " + str(status))
        status, items = listing("view_link_opens", token=tok["admin1"])
        res.check("9o the admin lists the opens (2 so far)", status == 200 and len(items) == 2, "items " + str(len(items)))
        first = items[0]["id"] if items else "x"
        status, _ = js("PATCH", "/api/collections/view_link_opens/records/" + first, {"key": keys["on2"]}, key=keys["on"])
        res.check("9p a key holder cannot change an open", is_denied(status), "status " + str(status))
        status, _ = js("PATCH", "/api/collections/view_link_opens/records/" + first, {"key": keys["on2"]}, token=tok["admin1"])
        res.check("9q even an admin cannot change an open (superuser only)", is_denied(status), "status " + str(status))
        status, _ = js("DELETE", "/api/collections/view_link_opens/records/" + first, key=keys["on"])
        res.check("9r a key holder cannot delete an open", is_denied(status), "status " + str(status))
        status, _ = js("DELETE", "/api/collections/view_link_opens/records/" + first, token=tok["admin1"])
        res.check("9s even an admin cannot delete an open (superuser only)", is_denied(status), "status " + str(status))
        status, rec = js("GET", "/api/collections/view_link_opens/records/" + first, token=tok["admin1"])
        res.check("9t the admin views one open: it holds the key and the time only", status == 200 and set(rec) <= {"id", "key", "created", "collectionId", "collectionName"}, str(sorted(rec)))

        # ---- the migration is safe to run twice, and the down function restores the old rules exactly.
        # Note: "pocketbase serve" applies a migration that is missing in _migrations at start. So after a down run the state is read from data.db (server stopped),
        # and a server that must show the old state starts on a copy of the migrations folder without the new file.
        server.stop()
        forget_migration(root)
        again = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        out = again.stdout + again.stderr
        res.check("10a the migration runs again on existing data without an error", again.returncode == 0 and "Applied " + MIGRATION in out, out[-300:])
        res.check("10b the second run reports the two collections as existing", out.count("exists, left as it is") == 2, out[-400:])
        res.check("10c the second run changes no rule text (no 'another text' line)", "another text" not in out, out[-400:])
        for name, (old, c, u, d) in READ_LISTS.items():
            got = rules_db(root, name)
            want = "(" + old + ") || (" + LINK_OK + ")"
            res.check("10d " + name + " rules are the same after the second run", got[:2] == (want, want) and got[2:] == (c, u, d), str(got))
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        out = down.stdout + down.stderr
        res.check("10e the down run ends without an error", down.returncode == 0 and "Reverted " + MIGRATION in out, out[-300:])
        res.check("10f the down run keeps view_links and view_link_opens because they hold records", out.count("has records, kept") == 2 and has_collection(root, "view_links") and has_collection(root, "view_link_opens"), out[-400:])
        for name, (old, c, u, d) in READ_LISTS.items():
            got = rules_db(root, name)
            res.check("10g " + name + ": the down run restores the old list and view rule exactly", got[0] == old and got[1] == old, "list " + str(got[0]) + " view " + str(got[1]))
            res.check("10h " + name + ": the write rules are the same as before", got[2:] == (c, u, d), str(got[2:]))
        # a server on the old state: the migrations folder without the new file
        old_dir = os.path.join(root, "pb_migrations_old")
        shutil.copytree(os.path.join(root, "pb_migrations"), old_dir)
        os.remove(os.path.join(old_dir, MIGRATION))
        old_server = Server(root)
        old_server.migrations = old_dir
        old_server.start()
        su = js("POST", "/api/collections/_superusers/auth-with-password", {"identity": "super@example.test", "password": superuser_pw})[1].get("token", "")
        status, items = listing("catalog_items", key=keys["on"])
        res.check("10i after the down run, a key reads nothing (the old rules)", len(items) == 0, "items " + str(len(items)))
        status, items = listing("reader_pages", token=tok["rd1"])
        res.check("10j after the down run, an approved reader still reads", status == 200 and len(items) == 1, "items " + str(len(items)))
        for name in ("view_link_opens", "view_links"):
            data = js("GET", "/api/collections/" + name + "/records?perPage=200&fields=id", token=su)[1]
            for item in data.get("items", []):
                js("DELETE", "/api/collections/" + name + "/records/" + item["id"], token=su)
        old_server.stop()
        # the up run puts the link rules back, then a down run with empty lists deletes the two collections
        up = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        res.check("10k the up run after the down run puts the link rules back", up.returncode == 0 and "Applied " + MIGRATION in (up.stdout + up.stderr) and rules_db(root, "catalog_items")[0] == "(" + SIGNED_IN + ") || (" + LINK_OK + ")",
                  (up.stdout + up.stderr)[-300:])
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        res.check("10l the down run deletes the two empty collections", not has_collection(root, "view_links") and not has_collection(root, "view_link_opens"), (down.stdout + down.stderr)[-300:])
        for name, (old, c, u, d) in READ_LISTS.items():
            got = rules_db(root, name)
            res.check("10m " + name + ": the old rules are in place after the second down run", got == (old, old, c, u, d), str(got))
        up = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        res.check("10n the up run makes the two collections again", has_collection(root, "view_links") and has_collection(root, "view_link_opens"), (up.stdout + up.stderr)[-300:])
        server.start()
        server.stop()
        log = server.log_text()
        res.check("11 the server log holds no key of a link", not any(k in log for k in keys.values()), "a key is in server.log")
    finally:
        server.stop()
        with socket.socket() as sock:
            sock.settimeout(1)
            res.check("12 the test PocketBase on port 8092 is stopped", sock.connect_ex(("127.0.0.1", PORT)) != 0, "port 8092 still answers")
        if not keep and os.path.exists(root):
            shutil.rmtree(root)


def urllib_quote(text):
    import urllib.parse
    return urllib.parse.quote(text, safe="")


def db_rows(root, sql, args=()):
    connection = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
    try:
        return connection.execute(sql, args).fetchall()
    finally:
        connection.close()


def has_collection(root, name):
    return len(db_rows(root, "SELECT 1 FROM _collections WHERE name = ?", (name,))) == 1


def rules_db(root, name):
    """(listRule, viewRule, createRule, updateRule, deleteRule) of a collection from data.db. The server must be stopped."""
    rows = db_rows(root, "SELECT listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name = ?", (name,))
    return tuple(rows[0]) if rows else (None,) * 5


def forget_migration(root):
    """Remove the row of the new migration from _migrations so that PocketBase runs the file again. The server must be stopped."""
    connection = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
    try:
        connection.execute("DELETE FROM _migrations WHERE file = ?", (MIGRATION,))
        connection.commit()
    finally:
        connection.close()


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
