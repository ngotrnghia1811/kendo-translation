#!/usr/bin/env python3
"""Throwaway test for the dictionary list (migration 1793300019, unit VW126, Q-A 3:116.8, 3:117.6). Python 3 standard library only.

Usage:
  TMPDIR=<unit folder>/tmp PB_BIN=<path of the pocketbase binary> python3 -B data/scripts/pocketbase/test_dictionary.py [--keep]
  Optional: DICT_SYNC_TERMBASE=<path of termbase.draft.jsonl> adds the checks of the sync command app/scripts/sync-dictionary.mjs against the test server (needs node).

What it does:
  - copies every migration of pb_migrations into a temp folder and starts a throwaway PocketBase on 127.0.0.1:8092 with a new pb_data there,
  - makes made-up users (@example.test) with random passwords (held in memory, never printed): an admin, a translator, an approved reader, a reader that waits,
  - makes made-up links (on, off, ended, end in the future) and made-up entries,
  - checks: the rules and the fields of dictionary_entries, who reads it (approved reader, translator, admin, the key of a link that is on) and who reads nothing
    (no sign-in, a reader that waits, no key, a wrong key, a link that is off or ended), that nobody but the superuser writes, the field limits,
  - checks that the migration changes no other collection, is safe to run twice, stops with a plain line if view_links is missing,
    and that the down function keeps a list with records and removes an empty list,
  - with DICT_SYNC_TERMBASE: dry run, apply, second run, a changed entry, an entry that only the server holds.
The test uses port 8092 only. It never contacts port 8090 or a real server. The last line is "<n> passed, <m> failed".
"""

import argparse
import json
import os
import re
import secrets
import shutil
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pb_users  # noqa: E402  (same folder)

PORT = 8092
BASE = "http://127.0.0.1:" + str(PORT)
V2_MIGRATIONS = os.path.join(HERE, "pb_migrations")
APP_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "..", "app"))
MIGRATION = "1793300019_v2_dictionary.js"
LINKS_MIGRATION = "1793300018_v2_view_links.js"
NAME = "dictionary_entries"
KEY_HEADER = "X-Kendo-View-Key"

# Expected rules, written again here on purpose so that the test does not trust the migration file.
READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")'
LINK_OK = ('@request.headers.x_kendo_view_key != "" && @collection.view_links:l.key ?= @request.headers.x_kendo_view_key && @collection.view_links:l.off ?= false'
           ' && (@collection.view_links:l.ends ?= "" || @collection.view_links:l.ends ?> @now)')
READ_RULE = "(" + READ_OK + ") || (" + LINK_OK + ")"
ADMIN = '@request.auth.role = "admin"'
FIELDS = {"id", "entry_id", "headword", "variants", "reading", "romaji", "concise_en", "short_en", "common", "view", "search_ja", "search_en", "sort_key", "created", "updated"}
TEXT_MAX = {"entry_id": 64, "headword": 300, "reading": 300, "romaji": 300, "concise_en": 600, "short_en": 400, "common": 40, "search_ja": 30000, "search_en": 30000, "sort_key": 300}


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
    return os.path.join(tmp, "pb-dictionary-8092")


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

    def skip(self, name, reason):
        print("SKIP " + name + ": " + reason)


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


def quote(text):
    return urllib.parse.quote(text, safe="")


# ---------------------------------------------------------------- server

class Server:
    def __init__(self, folder, migrations=None):
        self.data = os.path.join(folder, "pb_data")
        self.migrations = migrations or os.path.join(folder, "pb_migrations")
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


def listing(token=None, key=None, extra="", name=NAME):
    status, data = js("GET", "/api/collections/" + name + "/records?perPage=200" + extra, token=token, key=key)
    return status, data.get("items", []) if status == 200 else []


def total(token, extra=""):
    status, data = js("GET", "/api/collections/" + NAME + "/records?perPage=1&skipTotal=0" + extra, token=token)
    return data.get("totalItems", -1) if status == 200 else -1


def sorted_json(items):
    return json.dumps(sorted(items, key=lambda x: x.get("id", "")), sort_keys=True)


# ---------------------------------------------------------------- data.db helpers (the server must be stopped)

def db_rows(root, sql, args=()):
    connection = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
    try:
        return connection.execute(sql, args).fetchall()
    finally:
        connection.close()


def has_collection(root, name):
    return len(db_rows(root, "SELECT 1 FROM _collections WHERE name = ?", (name,))) == 1


def rules_db(root, name):
    rows = db_rows(root, "SELECT listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name = ?", (name,))
    return tuple(rows[0]) if rows else (None,) * 5


def snapshot_db(root, skip=()):
    """name -> (type, rules, fields, indexes) of every collection. The server must be stopped."""
    out = {}
    for name, ctype, lr, vr, cr, ur, dr, fields, indexes in db_rows(root, "SELECT name, type, listRule, viewRule, createRule, updateRule, deleteRule, fields, indexes FROM _collections"):
        if name in skip:
            continue
        out[name] = json.dumps([ctype, lr, vr, cr, ur, dr, json.loads(fields or "[]"), json.loads(indexes or "[]")], sort_keys=True)
    return out


def forget_migration(root):
    connection = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
    try:
        connection.execute("DELETE FROM _migrations WHERE file = ?", (MIGRATION,))
        connection.commit()
    finally:
        connection.close()


def copy_migrations(target, skip=()):
    os.makedirs(target)
    for name in sorted(os.listdir(V2_MIGRATIONS)):
        if name.endswith(".js") and name not in skip:
            shutil.copy2(os.path.join(V2_MIGRATIONS, name), os.path.join(target, name))


def entry_body(n, **extra):
    """A made-up entry. `view` has the shape that the page reads (a short copy)."""
    body = {
        "entry_id": "c-test0000000" + str(n),
        "headword": ["引き面", "小手", "ヒキワザ"][n - 1],
        "variants": [] if n != 3 else ["引き技"],
        "reading": ["ひきめん", "こて", "ひきわざ"][n - 1],
        "romaji": ["hiki-men", "kōte", "hiki-waza"][n - 1],
        "concise_en": ["retreating head strike", "forearm strike", "retreating technique"][n - 1],
        "short_en": "Made-up short English explanation " + str(n) + ".",
        "common": "common",
        "view": {"id": "c-test0000000" + str(n), "headword": "made up " + str(n), "langs": [{"lang": "en", "terms": [{"term": "made up", "preferred": True}], "definitions": []}]},
        "search_ja": ["ひきめん", "こて", "ひきわざ"][n - 1],
        "search_en": ["hikimen retreating head strike", "kote forearm strike", "hikiwaza retreating technique"][n - 1],
        "sort_key": ["ひきめん", "こて", "ひきわざ"][n - 1],
    }
    body.update(extra)
    return body


# ---------------------------------------------------------------- the checks

def run(res, keep):
    root = work_root()
    if os.path.exists(root):
        shutil.rmtree(root)
    os.makedirs(os.path.join(root, "pb_data"))
    # Step A: the first 19 migrations only (everything before this unit), to compare "no other collection changes".
    copy_migrations(os.path.join(root, "pb_migrations"), skip=(MIGRATION,))
    server = Server(root)
    superuser_pw = secrets.token_urlsafe(18)
    done = subprocess.run([pb_binary(), "superuser", "upsert", "super@example.test", superuser_pw] + server.args(), capture_output=True, text=True, timeout=120)
    if done.returncode != 0:
        raise RuntimeError("superuser upsert failed with exit code " + str(done.returncode))
    up_old = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
    res.check("0a the migrations before this unit run on a new data folder", up_old.returncode == 0 and not has_collection(root, NAME), (up_old.stdout + up_old.stderr)[-300:])
    before = snapshot_db(root)
    shutil.copy2(os.path.join(V2_MIGRATIONS, MIGRATION), os.path.join(root, "pb_migrations", MIGRATION))
    up_new = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
    out = up_new.stdout + up_new.stderr
    res.check("0b the new migration runs on the existing data folder", up_new.returncode == 0 and "Applied " + MIGRATION in out and has_collection(root, NAME), out[-300:])
    after = snapshot_db(root)
    changed = [n for n in before if before[n] != after.get(n)]
    res.check("0c the migration adds exactly one collection, dictionary_entries", sorted(set(after) - set(before)) == [NAME], str(sorted(set(after) - set(before))))
    res.check("0d the migration changes no other collection (rules, fields, indexes of " + str(len(before)) + " collections equal)", not changed, "changed: " + str(changed))
    try:
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

        # ---- the collection
        status, col = js("GET", "/api/collections/" + NAME, token=su)
        res.check("1a the collection dictionary_entries exists", status == 200, "status " + str(status))
        res.check("1b list rule is the reader rule or the link rule", col.get("listRule") == READ_RULE, "got " + str(col.get("listRule")))
        res.check("1c view rule is the reader rule or the link rule", col.get("viewRule") == READ_RULE, "got " + str(col.get("viewRule")))
        res.check("1d create, update and delete rules are closed (superuser only)", col.get("createRule") is None and col.get("updateRule") is None and col.get("deleteRule") is None,
                  str((col.get("createRule"), col.get("updateRule"), col.get("deleteRule"))))
        fields = {f["name"]: f for f in col.get("fields", [])}
        res.check("1e fields are entry_id, headword, variants, reading, romaji, concise_en, short_en, common, view, search_ja, search_en, sort_key, created, updated", set(fields) == FIELDS, str(sorted(set(fields) ^ FIELDS)))
        res.check("1f entry_id and headword are required", fields["entry_id"].get("required") is True and fields["headword"].get("required") is True, str((fields["entry_id"], fields["headword"])))
        wrong = [n for n, mx in TEXT_MAX.items() if fields[n].get("max") != mx]
        res.check("1g each text field has an explicit max", not wrong, "wrong " + str(wrong))
        res.check("1h view and variants are json fields", fields["view"].get("type") == "json" and fields["variants"].get("type") == "json" and fields["view"].get("maxSize") == 5242880, str((fields["view"], fields["variants"])))
        res.check("1i created and updated are autodate fields", fields["created"].get("type") == "autodate" and fields["updated"].get("type") == "autodate" and fields["updated"].get("onUpdate") is True, str((fields["created"], fields["updated"])))
        idx = " ".join(col.get("indexes", [])).upper()
        res.check("1j a unique index on entry_id and an index on sort_key", "UNIQUE" in idx and "ENTRY_ID" in idx and "SORT_KEY" in idx, str(col.get("indexes")))

        # ---- the superuser makes made-up entries
        rec_id = {}
        for n in (1, 2, 3):
            status, rec = js("POST", "/api/collections/" + NAME + "/records", entry_body(n), token=su)
            res.check("2a the superuser makes entry " + str(n), is_ok(status), "status " + str(status) + " " + str(rec)[:200])
            rec_id[n] = rec.get("id", "")
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1), token=su)
        res.check("2b a second entry with the same entry_id is refused (unique)", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id=""), token=su)
        res.check("2c an entry with no entry_id is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-" + "a" * 63), token=su)
        res.check("2d an entry_id of 65 characters is refused", is_denied(status), "status " + str(status))
        status, rec = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-" + "b" * 62), token=su)
        res.check("2e an entry_id of 64 characters is accepted", is_ok(status), "status " + str(status))
        js("DELETE", "/api/collections/" + NAME + "/records/" + rec.get("id", "x"), token=su)
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000x", headword=""), token=su)
        res.check("2f an entry with no headword is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000y", headword="a" * 301), token=su)
        res.check("2g a headword of 301 characters is refused", is_denied(status), "status " + str(status))
        status, rec = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000z", search_ja="あ" * 30000), token=su)
        res.check("2h a search_ja text of 30000 characters is accepted", is_ok(status), "status " + str(status) + " " + str(rec)[:200])
        js("DELETE", "/api/collections/" + NAME + "/records/" + rec.get("id", "x"), token=su)
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000w", search_ja="あ" * 30001), token=su)
        res.check("2i a search_ja text of 30001 characters is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000v", concise_en="e" * 601), token=su)
        res.check("2j a concise_en text of 601 characters is refused", is_denied(status), "status " + str(status))
        status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test0000000u", view={"text": "v" * 1048576}), token=su)
        res.check("2k a view of 1 MB is accepted", is_ok(status), "status " + str(status))
        status, items = listing(token=su)
        for item in items:
            if item["entry_id"] not in ("c-test00000001", "c-test00000002", "c-test00000003"):
                js("DELETE", "/api/collections/" + NAME + "/records/" + item["id"], token=su)
        res.check("2l the three made-up entries are in the list", total(su) == 3, "total " + str(total(su)))

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
            res.check("3a the admin makes the link '" + n + "'", is_ok(status) and rec.get("key") == keys[n], "status " + str(status) + " " + str(rec)[:200])
            link_id[n] = rec.get("id", "")

        # ---- who reads what: the reference is an approved reader (rd1)
        status, reference = listing(token=tok["rd1"])
        res.check("4a an approved reader reads the 3 entries", status == 200 and len(reference) == 3, "status " + str(status) + " items " + str(len(reference)))
        for who, label in (("tr1", "a translator"), ("admin1", "an admin")):
            status, items = listing(token=tok[who])
            res.check("4b " + label + " reads the 3 entries as an approved reader", status == 200 and sorted_json(items) == sorted_json(reference), "status " + str(status) + " items " + str(len(items)))
        for who, label in (("tr1", "a translator"), ("admin1", "an admin"), ("rd1", "an approved reader")):
            status, one = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], token=tok[who])
            res.check("4c " + label + " views one entry with its view field", status == 200 and one.get("view", {}).get("id") == "c-test00000001", "status " + str(status))
        # the same request that the app sends: filter on both search fields, sort, and a fields list
        app_query = "&filter=" + quote('search_ja ~ "ひきめん" || search_en ~ "hikimen"') + "&sort=sort_key,entry_id&fields=entry_id,headword,sort_key"
        status, items = listing(token=tok["rd1"], extra=app_query)
        res.check("4d an approved reader runs the app query (filter on search_ja or search_en, sort, fields): 1 entry", status == 200 and [i["entry_id"] for i in items] == ["c-test00000001"], "status " + str(status) + " " + str(items)[:200])
        status, items = listing(token=tok["rd1"], extra="&sort=sort_key,entry_id&fields=entry_id")
        res.check("4e the sort by sort_key lists the entries by reading (こて, ひきめん, ひきわざ)", [i["entry_id"] for i in items] == ["c-test00000002", "c-test00000001", "c-test00000003"], str(items))

        # no sign-in, a reader that waits, no key, wrong key, odd keys read nothing
        status, items = listing()
        res.check("5a a request with no sign-in and no key reads nothing", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        status, items = listing(token=tok["rd2"])
        res.check("5b a reader that waits for approval reads nothing", status == 200 and len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        status, _ = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], token=tok["rd2"])
        res.check("5c a reader that waits for approval cannot view one entry", status in (403, 404), "status " + str(status))
        status, _ = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1])
        res.check("5d a view with no sign-in and no key is refused", status in (403, 404), "status " + str(status))
        wrongs = [("a wrong key of 43 characters", new_key()), ("a short key", "abc"), ("an empty header", ""), ("43 percent signs", "%" * 43),
                  ("43 underscores", "_" * 43), ("an SQL-like text", '" || 1=1 --'), ("an asterisk", "*"), ("the key in lower case", keys["on"].lower()),
                  ("the key with text after it", keys["on"] + " x")]
        for label, k in wrongs:
            status, items = listing(key=k)
            res.check("5e " + label + " reads nothing", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
            status, items = listing(key=k, extra=app_query)
            res.check("5f " + label + " reads nothing with the app query", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        status, _ = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], key=new_key())
        res.check("5g a view with a wrong key is refused", status in (403, 404), "status " + str(status))
        status, items = listing(token=tok["rd2"], key=keys["off"])
        res.check("5h a reader that waits for approval reads nothing with the key of a link that is off", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        status, items = listing(token=tok["rd1"], key=new_key())
        res.check("5i an approved reader reads as before with a wrong key header", status == 200 and len(items) == 3, "status " + str(status) + " items " + str(len(items)))

        # the key of a link that is on (and of a link with an end in the future) reads exactly as an approved reader
        for label in ("on", "future", "on2"):
            status, items = listing(key=keys[label])
            res.check("6a the key of link '" + label + "' lists the same entries as an approved reader", status == 200 and sorted_json(items) == sorted_json(reference), "status " + str(status) + " items " + str(len(items)))
            status, items = listing(key=keys[label], extra=app_query)
            res.check("6b the key of link '" + label + "' runs the app query", status == 200 and [i["entry_id"] for i in items] == ["c-test00000001"], "status " + str(status) + " " + str(items)[:160])
            status, one = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], key=keys[label])
            ref_one = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], token=tok["rd1"])[1]
            res.check("6c the key of link '" + label + "' views one entry like an approved reader", status == 200 and json.dumps(one, sort_keys=True) == json.dumps(ref_one, sort_keys=True), "status " + str(status))
        # off or ended: nothing
        for label in ("off", "past"):
            status, items = listing(key=keys[label])
            res.check("7a the key of link '" + label + "' reads nothing", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
            status, _ = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[1], key=keys[label])
            res.check("7b a view with the key of link '" + label + "' is refused", status in (403, 404), "status " + str(status))
        # the state changes at once
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"off": True}, token=tok["admin1"])
        res.check("7c after the admin turns a link off, its key reads nothing at once", len(listing(key=keys["on"])[1]) == 0, "items read")
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"off": False}, token=tok["admin1"])
        res.check("7d after the admin turns it on again, the key reads again", len(listing(key=keys["on"])[1]) == 3, "items missing")
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"ends": "2020-06-01 07:59:59.000Z"}, token=tok["admin1"])
        res.check("7e after an end date in the past, the key reads nothing", len(listing(key=keys["on"])[1]) == 0, "items read")
        js("PATCH", "/api/collections/view_links/records/" + link_id["on"], {"ends": ""}, token=tok["admin1"])
        res.check("7f after the end date is cleared, the key reads again", len(listing(key=keys["on"])[1]) == 3, "items missing")

        # ---- nobody but the superuser writes
        who_writes = [("the admin", tok["admin1"], None), ("a translator", tok["tr1"], None), ("an approved reader", tok["rd1"], None), ("a reader that waits", tok["rd2"], None),
                      ("a key that is on", None, keys["on"]), ("a wrong key", None, new_key()), ("no sign-in and no key", None, None),
                      ("the admin with a key that is on", tok["admin1"], keys["on"])]
        for label, token, key in who_writes:
            status, _ = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-test000000new"), token=token, key=key)
            res.check("8a a create by " + label + " is refused", is_denied(status), "status " + str(status))
            status, _ = js("PATCH", "/api/collections/" + NAME + "/records/" + rec_id[1], {"headword": "changed"}, token=token, key=key)
            res.check("8b an update by " + label + " is refused", is_denied(status), "status " + str(status))
            status, _ = js("DELETE", "/api/collections/" + NAME + "/records/" + rec_id[1], token=token, key=key)
            res.check("8c a delete by " + label + " is refused", is_denied(status), "status " + str(status))
        status, items = listing(token=tok["rd1"])
        res.check("8d the list is unchanged after the refused writes", status == 200 and sorted_json(items) == sorted_json(reference), "items differ")
        # a key holder cannot read the links
        status, items = listing(key=keys["on"], name="view_links")
        res.check("8e a key holder cannot list view_links (the new rule does not open it)", len(items) == 0, "status " + str(status) + " items " + str(len(items)))
        # the superuser can change and delete (the sync command needs this)
        status, _ = js("PATCH", "/api/collections/" + NAME + "/records/" + rec_id[3], {"short_en": "changed by the superuser"}, token=su)
        res.check("8f the superuser updates an entry", is_ok(status), "status " + str(status))
        status, one = js("GET", "/api/collections/" + NAME + "/records/" + rec_id[3], token=tok["rd1"])
        res.check("8g an approved reader sees the change", one.get("short_en") == "changed by the superuser", str(one)[:160])
        js("PATCH", "/api/collections/" + NAME + "/records/" + rec_id[3], {"short_en": entry_body(3)["short_en"]}, token=su)

        # ---- the migration is safe to run twice, and the down function
        server.stop()
        forget_migration(root)
        again = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        out = again.stdout + again.stderr
        res.check("9a the migration runs again on existing data without an error", again.returncode == 0 and "Applied " + MIGRATION in out, out[-300:])
        res.check("9b the second run says that the collection exists and leaves it", "collection " + NAME + " exists, left as it is" in out, out[-300:])
        res.check("9c the second run keeps the rules and the 3 records", rules_db(root, NAME) == (READ_RULE, READ_RULE, None, None, None) and db_rows(root, "SELECT count(*) FROM " + NAME)[0][0] == 3,
                  str(rules_db(root, NAME)))
        other_before = snapshot_db(root, skip=(NAME,))
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        out = down.stdout + down.stderr
        res.check("9d the down run keeps the list because it holds records, and says so", down.returncode == 0 and "Reverted " + MIGRATION in out and "collection " + NAME + " has records, kept" in out and has_collection(root, NAME), out[-300:])
        res.check("9e the down run changes no other collection", snapshot_db(root, skip=(NAME,)) == other_before, "another collection changed")
        res.check("9f the 3 records are still there after the down run", db_rows(root, "SELECT count(*) FROM " + NAME)[0][0] == 3, "count differs")
        # delete the records (server stopped: direct delete in the made-up data file), then the down run removes the empty list
        connection = sqlite3.connect(os.path.join(root, "pb_data", "data.db"))
        try:
            connection.execute("DELETE FROM " + NAME)
            connection.commit()
        finally:
            connection.close()
        up = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        res.check("9g the up run after the down run finds the list and leaves it", up.returncode == 0 and "Applied " + MIGRATION in (up.stdout + up.stderr), (up.stdout + up.stderr)[-300:])
        down = subprocess.run([pb_binary(), "migrate", "down", "1"] + server.args(), capture_output=True, text=True, timeout=120, input="y\n")
        res.check("9h the down run removes the empty list", down.returncode == 0 and not has_collection(root, NAME), (down.stdout + down.stderr)[-300:])
        res.check("9i the down run changes no other collection", snapshot_db(root) == other_before, "another collection changed")
        up = subprocess.run([pb_binary(), "migrate", "up"] + server.args(), capture_output=True, text=True, timeout=120)
        res.check("9j the up run makes the list again with the same rules", has_collection(root, NAME) and rules_db(root, NAME) == (READ_RULE, READ_RULE, None, None, None), (up.stdout + up.stderr)[-300:])

        # ---- the migration stops with a plain line if view_links is missing
        nolinks = os.path.join(root, "nolinks")
        copy_migrations(os.path.join(nolinks, "pb_migrations"), skip=(LINKS_MIGRATION,))
        os.makedirs(os.path.join(nolinks, "pb_data"))
        bad = Server(nolinks)
        stopped = subprocess.run([pb_binary(), "migrate", "up"] + bad.args(), capture_output=True, text=True, timeout=120)
        text = stopped.stdout + stopped.stderr
        # PocketBase prints the error and exits with 0 for `migrate up`, so the test reads the text and the data file, not the exit code.
        res.check("10a without view_links the migration stops with a plain line, creates no list, and is not recorded as applied",
                  "failed to apply migration " + MIGRATION in text and "the collection view_links does not exist. Run migration 1793300018 first." in text
                  and not has_collection(nolinks, NAME) and db_rows(nolinks, "SELECT count(*) FROM _migrations WHERE file = ?", (MIGRATION,))[0][0] == 0, text[-300:])

        # ---- the sync command against this test server (optional)
        termbase = os.environ.get("DICT_SYNC_TERMBASE", "")
        if termbase and os.path.isfile(termbase) and shutil.which("node") and os.path.isdir(APP_DIR):
            sync_checks(res, root, server, superuser_pw, tok, termbase)
        else:
            res.skip("11 the sync command checks", "set DICT_SYNC_TERMBASE to a termbase.draft.jsonl file, and make sure that node and the app folder exist")

        server.stop()
        log = server.log_text()
        res.check("12 the server log holds no key of a link", not any(k in log for k in keys.values()), "a key is in server.log")
    finally:
        server.stop()
        with socket.socket() as sock:
            sock.settimeout(1)
            res.check("13 the test PocketBase on port 8092 is stopped", sock.connect_ex(("127.0.0.1", PORT)) != 0, "port 8092 still answers")
        if not keep and os.path.exists(root):
            shutil.rmtree(root)


def sync_command(args, password, root):
    env = {"PATH": os.environ.get("PATH", ""), "TMPDIR": os.environ.get("TMPDIR", ""), "HOME": os.environ.get("HOME", "")}
    result = subprocess.run(["node", os.path.join(APP_DIR, "scripts", "sync-dictionary.mjs"), "--url", BASE, "--superuser", "super@example.test"] + args,
                            input=password + "\n", capture_output=True, text=True, timeout=300, cwd=APP_DIR, env=env)
    return result.returncode, result.stdout + result.stderr


def sync_counts(text):
    def find(label):
        match = re.search(re.escape(label) + r": (\d+)", text)
        return int(match.group(1)) if match else -1
    return find("New (create)"), find("Changed (update)"), find("Same (nothing to do)"), find("On the server only (kept)")


def sync_checks(res, root, server, superuser_pw, tok, termbase):
    """The sync command on a test server that has the list but no entry (the migration made it empty in step 9)."""
    with open(termbase, encoding="utf-8") as handle:
        lines = [line for line in handle.read().split("\n") if line.strip()]
    n = len(lines)
    work = os.path.join(root, "sync")
    os.makedirs(work)
    file_path = os.path.join(work, "termbase.draft.jsonl")
    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    server.start()
    su = js("POST", "/api/collections/_superusers/auth-with-password", {"identity": "super@example.test", "password": superuser_pw})[1].get("token", "")
    rd = tok["rd1"]
    res.check("11a the list is empty before the sync", total(su) == 0, "total " + str(total(su)))
    code, text = sync_command(["--termbase", file_path], superuser_pw, root)
    res.check("11b a dry run counts " + str(n) + " new, 0 changed, 0 same and exits with 0", code == 0 and sync_counts(text)[:3] == (n, 0, 0) and "Nothing was written" in text, "exit " + str(code) + " " + text[-300:])
    res.check("11c the dry run wrote nothing", total(su) == 0, "total " + str(total(su)))
    code, text = sync_command(["--termbase", file_path, "--apply"], superuser_pw, root)
    res.check("11d --apply creates " + str(n) + " entries without a failure", code == 0 and ("Written: created " + str(n) + ", updated 0, failed 0") in text, "exit " + str(code) + " " + text[-300:])
    res.check("11e the list holds " + str(n) + " entries (read by the superuser)", total(su) == n, "total " + str(total(su)))
    res.check("11f an approved reader reads " + str(n) + " entries", total(rd) == n, "total " + str(total(rd)))
    code, text = sync_command(["--termbase", file_path], superuser_pw, root)
    res.check("11g a second dry run counts 0 new, 0 changed, " + str(n) + " same", code == 0 and sync_counts(text)[:3] == (0, 0, n), "exit " + str(code) + " " + text[-300:])
    code, text = sync_command(["--termbase", file_path, "--apply"], superuser_pw, root)
    res.check("11h a second --apply writes nothing (safe to run twice)", code == 0 and "Written: created 0, updated 0, failed 0" in text and sync_counts(text)[:3] == (0, 0, n) and total(su) == n, "exit " + str(code) + " " + text[-300:])
    # one changed entry: change the preferred English text of the first line
    first = json.loads(lines[0])
    changed_line = lines[0]
    for lang in first.get("langSec", []):
        if lang.get("lang") == "en" and lang.get("termSec"):
            lang["termSec"][0]["term"] = "changed by the test"
            changed_line = json.dumps(first, ensure_ascii=False)
            break
    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join([changed_line] + lines[1:]) + "\n")
    code, text = sync_command(["--termbase", file_path], superuser_pw, root)
    res.check("11i a changed entry counts 0 new, 1 changed, " + str(n - 1) + " same", code == 0 and sync_counts(text)[:3] == (0, 1, n - 1), "exit " + str(code) + " " + text[-300:])
    code, text = sync_command(["--termbase", file_path, "--apply"], superuser_pw, root)
    status, data = js("GET", "/api/collections/" + NAME + "/records?perPage=1&filter=" + quote('entry_id="' + first["id"] + '"'), token=rd)
    got = (data.get("items") or [{}])[0].get("concise_en", "")
    res.check("11j --apply updates the changed entry (concise_en is now '" + got + "')", code == 0 and "updated 1" in text and got == "changed by the test", "exit " + str(code) + " " + text[-300:])
    # an entry that only the server holds is kept
    status, rec = js("POST", "/api/collections/" + NAME + "/records", entry_body(1, entry_id="c-serveronly01"), token=su)
    code, text = sync_command(["--termbase", file_path, "--apply"], superuser_pw, root)
    res.check("11k an entry that only the server holds is reported and kept", code == 0 and sync_counts(text)[3] == 1 and total(su) == n + 1, "exit " + str(code) + " total " + str(total(su)) + " " + text[-300:])
    # a bad line and a repeated ID are skipped and counted
    with open(file_path, "a", encoding="utf-8") as handle:
        handle.write("{not json}\n" + lines[1] + "\n")
    code, text = sync_command(["--termbase", file_path], superuser_pw, root)
    res.check("11l a bad line and a repeated entry ID are skipped and counted", code == 0 and "Bad lines skipped: 1" in text and "Repeated entry IDs skipped: 1" in text, "exit " + str(code) + " " + text[-300:])
    # a wrong password
    code, text = sync_command(["--termbase", file_path], "wrong-" + secrets.token_urlsafe(6), root)
    res.check("11m a wrong password stops the command with an error and a plain line", code != 0 and "Error" in text, "exit " + str(code) + " " + text[-300:])
    res.check("11n the list still holds " + str(n + 1) + " entries after all runs (the command never deletes)", total(su) == n + 1, "total " + str(total(su)))
    server.stop()


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
