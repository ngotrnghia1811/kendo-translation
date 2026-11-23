#!/usr/bin/env python3
"""Throwaway test for the v2 PocketBase migrations. Python 3 standard library only.

Usage:
  python3 -B data/scripts/pocketbase/test_local.py [--v1-migrations PATH] [--keep]

Shapes:
  fresh       only the v2 migrations on a new PocketBase
  live-shape  the v1 migrations (without the seed file) first, then the v2 migrations.
              This runs only if --v1-migrations is given.

The test uses 127.0.0.1:8091 only. It never contacts the live server.
Every temp folder lives in WORK_ROOT. The env variable PB_TEST_WORK_ROOT replaces the default folder. The test deletes it at the end unless --keep is set.
All passwords are random, held in memory and never printed.
"""

import argparse
import json
import os
import re
import secrets
import shutil
import signal
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

V2_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PB_BIN = os.path.join(V2_ROOT, "data", "pocketbase", "pocketbase")
V2_MIGRATIONS = os.path.join(HERE, "pb_migrations")
WORK_ROOT = os.environ.get("PB_TEST_WORK_ROOT", "/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r53/P1")
PORT = 8091
BASE = "http://127.0.0.1:" + str(PORT)

# The seven v1 migration files that the live server holds, without the seed file.
V1_FILES = [
    "1753123456_initial_schema.js",
    "1753123458_book_hierarchy.js",
    "1753123459_fix_id_length.js",
    "1753123460_fix_text_lengths.js",
    "1753123461_bookmarks_reading_progress_book.js",
    "1753123462_add_created_timestamps.js",
    "1753123463_terminology_collection.js",
]
V1_COLLECTIONS = [
    "agent_logs", "agent_prompts", "articles", "bookmarks", "books", "document_assignments",
    "document_decisions", "document_sections", "document_settings", "edit_patterns", "glossary",
    "qa_issue_pattern_events", "qa_issue_patterns", "qa_issues", "reading_progress", "segment_comments",
    "segment_phase_transitions", "segment_revisions", "segment_suggestions", "segments", "style_guide",
    "terminology", "user_history", "video_notes", "videos",
]

WRITER = '(@request.auth.role = "translator" || @request.auth.role = "admin")'
OWN = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
COMMENT_LIST = ('@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin" || '
                '(shared = true && @request.auth.role = "translator"))')
SELF = '@request.auth.id != "" && @request.body.user = @request.auth.id && ' + WRITER
SIGNED = '@request.auth.id != ""'
ADMIN = '@request.auth.role = "admin"'
STAFF = '@request.auth.role = "translator" || @request.auth.role = "admin"'
OWN_ONLY = '@request.auth.id != "" && user = @request.auth.id'
# Migrations 1793300006 to 1793300009 (unit RC1, round 63). READ_OK = signed in, and approved or a translator or an admin.
READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")'
SEE_USERS = '@request.auth.id != "" && (id = @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "translator")'
THEMES = ["light", "dark", "sepia", "solarized-light", "solarized-dark"]
# Migration 1793300018 (unit VW120, Q-A 3:107.4 "Route A: key check"): the 7 reader lists also accept the key of a link that is on and not ended.
# The header X-Kendo-View-Key reaches a rule as @request.headers.x_kendo_view_key. New list and view rule = "(old rule) || (LINK_OK)". Details: test_view_links.py.
LINK_OK = ('@request.headers.x_kendo_view_key != "" && @collection.view_links:l.key ?= @request.headers.x_kendo_view_key && @collection.view_links:l.off ?= false'
           ' && (@collection.view_links:l.ends ?= "" || @collection.view_links:l.ends ?> @now)')


def with_link(old):
    return "(" + old + ") || (" + LINK_OK + ")"


# Expected rules, written again here on purpose so that the test does not trust the migration file.
EXPECTED_RULES = {
    "users": {
        # Migration 1793300006 (unit RC1, round 63 answer 4): a public sign-up creates a reader with approved false. A reader sees only the own record.
        "listRule": SEE_USERS, "viewRule": SEE_USERS,
        "createRule": '@request.body.role = "reader" && @request.body.disabled:isset = false && '
                      '(@request.body.approved:isset = false || @request.body.approved = false)',
        "updateRule": '(id = @request.auth.id && @request.body.role:isset = false && '
                      '@request.body.disabled:isset = false && @request.body.approved:isset = false) || @request.auth.role = "admin"',
        "deleteRule": ADMIN, "authRule": "disabled = false",
    },
    "own_translations": {"listRule": OWN, "viewRule": OWN, "createRule": SELF, "updateRule": None, "deleteRule": None},
    "comments": {
        "listRule": COMMENT_LIST, "viewRule": COMMENT_LIST, "createRule": SELF,
        "updateRule": 'user = @request.auth.id && @request.body.user:changed = false && '
                      '@request.body.page_id:changed = false && @request.body.group_key:changed = false',
        "deleteRule": 'user = @request.auth.id || @request.auth.role = "admin"',
    },
    "run_marks": {"listRule": SIGNED, "viewRule": SIGNED, "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN},
    # Migration 1793300012 (unit RT74, round 75 answer 3): reader_opens is for the admin only (readers do not list it).
    "reader_opens": {"listRule": ADMIN, "viewRule": ADMIN, "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN},
    "catalog_items": {"listRule": with_link(SIGNED), "viewRule": with_link(SIGNED), "createRule": None, "updateRule": None, "deleteRule": None},
    "magazine_chapters": {"listRule": with_link(SIGNED), "viewRule": with_link(SIGNED), "createRule": None, "updateRule": None, "deleteRule": None},
    # Migration 1793300013 (unit VW77e): the table of contents. Unit VW120 added the link rule to the list and view rule.
    "book_toc": {"listRule": with_link(SIGNED), "viewRule": with_link(SIGNED), "createRule": None, "updateRule": None, "deleteRule": None},
    # Migration 1793300003 (unit S2C) opened page_runs to every signed-in user. Migration 1793300009 (unit RC1, round 63 answer 3) closes it again:
    # only translators and admins read page_runs (verdict, score, and TL_3 panel are not for readers). Writes stay with the superuser.
    "page_runs": {"listRule": STAFF, "viewRule": STAFF, "createRule": None, "updateRule": None, "deleteRule": None},
    # Migrations 1793300007 and 1793300008 (unit RC1, round 63 answers 3, 6, and 7).
    "reader_pages": {"listRule": with_link(READ_OK), "viewRule": with_link(READ_OK), "createRule": None, "updateRule": None, "deleteRule": None},
    "reader_versions": {"listRule": with_link(READ_OK), "viewRule": with_link(READ_OK), "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN},
    "page_checks": {"listRule": with_link(SIGNED), "viewRule": with_link(SIGNED), "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN},
    "reader_bookmarks": {"listRule": READ_OK + " && user = @request.auth.id", "viewRule": READ_OK + " && user = @request.auth.id",
                         "createRule": READ_OK + " && @request.body.user = @request.auth.id", "updateRule": None,
                         "deleteRule": READ_OK + " && user = @request.auth.id"},
    "reader_progress": {"listRule": READ_OK + " && user = @request.auth.id", "viewRule": READ_OK + " && user = @request.auth.id",
                        "createRule": READ_OK + " && @request.body.user = @request.auth.id",
                        "updateRule": READ_OK + " && user = @request.auth.id && @request.body.user:changed = false", "deleteRule": None},
    # Migration 1793300016 (unit VW104, Q-A 3:44.4, 3:45.2, 3:45.3): the v1 placeholder md text of each page. Same read rule as reader_pages. Only the superuser writes.
    "v1_placeholders": {"listRule": with_link(READ_OK), "viewRule": with_link(READ_OK), "createRule": None, "updateRule": None, "deleteRule": None},
    # Migration 1793300018 (unit VW120, Q-A 3:106.5, 3:107.4): the view-only links. Only an admin reads and changes view_links (the key is a secret).
    # view_link_opens is create-only for a key holder of a live link (the key in the body must equal the key in the header), and only an admin reads it. Details: test_view_links.py.
    "view_links": {"listRule": ADMIN, "viewRule": ADMIN, "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN},
    "view_link_opens": {"listRule": ADMIN, "viewRule": ADMIN,
                        "createRule": '@request.body.key = @request.headers.x_kendo_view_key && @request.body.created:isset = false && ' + LINK_OK,
                        "updateRule": None, "deleteRule": None},
    # Migration 1793300019 (unit VW126, Q-A 3:116.8, 3:117.6): the dictionary entries. Same read rule as reader_pages (approved reader, translator, admin, or a link key). Only the superuser writes. Details: test_dictionary.py.
    "dictionary_entries": {"listRule": with_link(READ_OK), "viewRule": with_link(READ_OK), "createRule": None, "updateRule": None, "deleteRule": None},
    # Migration 1793300017 (unit VW118, Q-A 3:98.5, 3:99.5): the visual issues. Own create by a translator or admin, own list for a translator, all for an admin, only an admin changes. Details: test_visual_issues.py.
    "visual_issues": {"listRule": '@request.auth.id != "" && (@request.auth.role = "admin" || (@request.auth.role = "translator" && user = @request.auth.id))',
                      "viewRule": '@request.auth.id != "" && (@request.auth.role = "admin" || (@request.auth.role = "translator" && user = @request.auth.id))',
                      "createRule": '@request.auth.id != "" && (@request.auth.role = "translator" || @request.auth.role = "admin") && @request.body.user = @request.auth.id'
                                    ' && @request.body.state = "open" && @request.body.resolve_note:isset = false',
                      "updateRule": ADMIN, "deleteRule": ADMIN},
    # Migration 1793300005 (unit UXC, round 59 answer 6): a user reads and changes the own settings record only. Nobody deletes.
    "user_settings": {"listRule": OWN_ONLY, "viewRule": OWN_ONLY,
                      "createRule": '@request.auth.id != "" && @request.body.user = @request.auth.id',
                      "updateRule": 'user = @request.auth.id && @request.body.user:changed = false', "deleteRule": None},
}
NEW_COLLECTIONS = [name for name in EXPECTED_RULES if name != "users"]


# ---------------------------------------------------------------- results

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

    def info(self, text):
        print("INFO " + text)


# ---------------------------------------------------------------- http

def http(method, path, body=None, token=None, xff=None):
    """Return (status, decoded JSON). Never raise on a 4xx or 5xx status."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    if xff:
        # Migration 1793300014 (unit VW101) allows 5 sign-ups per address and hour. A test sign-up sends its own made-up address.
        # Migration 1793300015 (unit VW102) makes PocketBase read that address from the header X-Kendo-Client-IP. It ignores X-Forwarded-For.
        headers["X-Kendo-Client-IP"] = xff
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as err:
        raw = err.read()
        try:
            return err.code, json.loads(raw)
        except ValueError:
            return err.code, {}


def is_ok(status):
    return 200 <= status < 300


def is_denied(status):
    return 400 <= status < 500


def user_sign_in(email, password):
    status, data = http("POST", "/api/collections/users/auth-with-password", {"identity": email, "password": password})
    return status, data.get("token", "")


# ---------------------------------------------------------------- server

class Server:
    """One PocketBase process on port 8091."""

    def __init__(self, shape_dir, label):
        self.dir = shape_dir
        self.data = os.path.join(shape_dir, "pb_data")
        self.migrations = os.path.join(shape_dir, "pb_migrations")
        self.log_path = os.path.join(shape_dir, "server-" + label + ".log")
        self.proc = None

    def base_args(self):
        return ["--dir=" + self.data, "--migrationsDir=" + self.migrations]

    def start(self):
        require_port_free()
        log = open(self.log_path, "ab")
        self.proc = subprocess.Popen(
            [PB_BIN, "serve", "--http=127.0.0.1:" + str(PORT), "--dir=" + self.data,
             "--migrationsDir=" + self.migrations, "--automigrate=false"],
            stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
        log.close()
        deadline = time.time() + 40
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError("PocketBase stopped at start. Last log lines:\n" + self.log_tail())
            try:
                status, _ = http("GET", "/api/health")
                if status == 200:
                    return
            except (urllib.error.URLError, ConnectionError, OSError):
                pass
            time.sleep(0.2)
        raise RuntimeError("PocketBase did not answer /api/health in 40 s. Last log lines:\n" + self.log_tail())

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


def require_port_free():
    with socket.socket() as sock:
        sock.settimeout(1)
        if sock.connect_ex(("127.0.0.1", PORT)) == 0:
            raise RuntimeError("Something already listens on 127.0.0.1:" + str(PORT) + ". Stop it first.")


# ---------------------------------------------------------------- shape setup

def refuse_seed(path):
    if "seed" in os.path.basename(path).lower():
        raise SystemExit("Refused: " + os.path.basename(path) + " looks like a seed file. The test never uses it.")


def copy_v1_files(v1_dir, target):
    """Copy the seven v1 files by name. Copy bytes only. Never print or link."""
    refuse_seed(v1_dir)
    for name in V1_FILES:
        refuse_seed(name)
        source = os.path.join(v1_dir, name)
        if not os.path.isfile(source):
            raise SystemExit("Missing v1 migration file: " + name)
        shutil.copy2(source, os.path.join(target, name))


def prepare_shape(shape, v1_dir):
    shape_dir = os.path.join(WORK_ROOT, "run-" + shape)
    if os.path.exists(shape_dir):
        shutil.rmtree(shape_dir)
    migrations = os.path.join(shape_dir, "pb_migrations")
    os.makedirs(migrations)
    os.makedirs(os.path.join(shape_dir, "pb_data"))
    if shape == "live-shape":
        copy_v1_files(v1_dir, migrations)
    for name in sorted(os.listdir(V2_MIGRATIONS)):
        if name.endswith(".js"):
            shutil.copy2(os.path.join(V2_MIGRATIONS, name), os.path.join(migrations, name))
    return shape_dir


def create_superuser(server, email, password):
    # The password goes into argv for this one call. This is a local throwaway
    # database that the test deletes. The owner never uses this command for real users.
    result = subprocess.run([PB_BIN, "superuser", "upsert", email, password] + server.base_args(),
                            capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError("superuser upsert failed with exit code " + str(result.returncode))


def superuser_sign_in(email, password):
    status, data = http("POST", "/api/collections/_superusers/auth-with-password", {"identity": email, "password": password})
    if status != 200:
        raise RuntimeError("superuser sign-in failed with status " + str(status))
    return data["token"]


# ---------------------------------------------------------------- the checks

class Context:
    def __init__(self, shape, res):
        self.shape = shape
        self.res = res
        self.pw = {}
        self.token = {}
        self.id = {}
        self.su_token = ""

    def check(self, name, ok, reason=""):
        self.res.check(self.shape + " " + name, ok, reason)

    def info(self, text):
        self.res.info(self.shape + " " + text)


def addr(key):
    return key + "@p1-test.local"


def create_users(ctx):
    plan = [("admin1", "admin"), ("tr1", "translator"), ("tr2", "translator"), ("rd1", "reader"), ("dis1", "translator")]
    for key, role in plan:
        ctx.pw[key] = secrets.token_urlsafe(18)
        record = pb_users.add_user(BASE, ctx.su_token, addr(key), role, ctx.pw[key], name=key)
        ctx.id[key] = record["id"]
    pb_users.set_disabled(BASE, ctx.su_token, addr("dis1"), False)
    for key, _ in plan:
        status, token = user_sign_in(addr(key), ctx.pw[key])
        if status != 200:
            raise RuntimeError("setup sign-in failed for " + key + " with status " + str(status))
        ctx.token[key] = token


def check_users(ctx):
    users = pb_users.list_users(BASE, ctx.su_token)
    ctx.check("0 pb_users list shows 5 test users", len([u for u in users if u["email"].endswith("@p1-test.local")]) == 5,
              "count differs")
    stranger = {"email": "stranger@p1-test.local", "password": "x" * 12, "passwordConfirm": "x" * 12, "role": "admin"}
    status, _ = http("POST", "/api/collections/users/records", stranger, xff="203.0.113.1")
    ctx.check("1 anonymous user create fails", is_denied(status), "status " + str(status))
    status, data = http("GET", "/api/collections/users/records")
    ctx.check("2 anonymous list of users fails or is empty", is_denied(status) or data.get("totalItems", 1) == 0,
              "status " + str(status))

    tr1 = ctx.token["tr1"]
    own = "/api/collections/users/records/" + ctx.id["tr1"]
    status, _ = http("PATCH", own, {"role": "admin"}, tr1)
    ctx.check("3a tr1 sets own role to admin fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", own, {"disabled": True}, tr1)
    ctx.check("3b tr1 sets own disabled fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", own, {"name": "tr1 renamed"}, tr1)
    ctx.check("3c tr1 changes own name works", is_ok(status), "status " + str(status))
    record = pb_users.find_user(BASE, ctx.su_token, addr("tr1"))
    ctx.check("3d tr1 role and disabled unchanged", record["role"] == "translator" and record["disabled"] is False,
              "role " + str(record["role"]) + " disabled " + str(record["disabled"]))

    status, _ = http("PATCH", "/api/collections/users/records/" + ctx.id["tr2"], {"name": "hijack"}, tr1)
    ctx.check("4a tr1 updates tr2 fails", is_denied(status), "status " + str(status))
    other = "/api/collections/users/records/" + ctx.id["tr2"]
    status1, _ = http("PATCH", other, {"role": "reader"}, ctx.token["admin1"])
    status2, _ = http("PATCH", other, {"role": "translator"}, ctx.token["admin1"])
    ctx.check("4b admin1 sets tr2 role to reader and back works", is_ok(status1) and is_ok(status2),
              "status " + str(status1) + " and " + str(status2))

    status, _ = user_sign_in(addr("dis1"), ctx.pw["dis1"])
    before = status == 200
    old_token = ctx.token["dis1"]
    pb_users.set_disabled(BASE, ctx.su_token, addr("dis1"), True)
    status_off, _ = user_sign_in(addr("dis1"), ctx.pw["dis1"])
    ctx.check("5a dis1 sign-in works before disable", before, "status " + str(status))
    ctx.check("5b dis1 sign-in fails after disable", is_denied(status_off), "status " + str(status_off))
    # Observation only. A token that exists before the disable stays valid until it expires.
    status_old, _ = http("GET", "/api/collections/users/records", token=old_token)
    status_refresh, _ = http("POST", "/api/collections/users/auth-refresh", token=old_token)
    ctx.info("5i old dis1 token after disable: list users status " + str(status_old) + ", auth-refresh status " + str(status_refresh))
    pb_users.set_disabled(BASE, ctx.su_token, addr("dis1"), False)
    status_on, _ = user_sign_in(addr("dis1"), ctx.pw["dis1"])
    ctx.check("5c dis1 sign-in works after enable", status_on == 200, "status " + str(status_on))


def translation_body(ctx, key, version=1, group="L01-L05", user_key=None):
    return {"user": ctx.id[user_key or key], "item_id": "kendojidai_2014", "page_id": "kendojidai_2014/p0839",
            "group_key": "kendojidai_2014/p0839/ts3/" + group, "ts_ids": ["L01", "L02"], "part": "body",
            "ja_text": "日本語", "run_id": "run-1", "ed3_text": "ED text", "text": "Own text " + key, "version": version}


def check_own_translations(ctx):
    path = "/api/collections/own_translations/records"
    t = ctx.token
    status, first = http("POST", path, translation_body(ctx, "tr1"), t["tr1"])
    ctx.check("6a tr1 creates own translation as self works", is_ok(status), "status " + str(status))
    status, _ = http("POST", path, translation_body(ctx, "tr1", user_key="tr2"), t["tr1"])
    ctx.check("6b tr1 creates with user = tr2 fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, translation_body(ctx, "rd1"), t["rd1"])
    ctx.check("6c rd1 creates fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, translation_body(ctx, "tr1"), t["tr1"])
    ctx.check("6d duplicate (user, page_id, group_key, version) fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, translation_body(ctx, "tr1", version=2), t["tr1"])
    ctx.check("6e tr1 creates version 2 works", is_ok(status), "status " + str(status))
    record_url = path + "/" + first.get("id", "none")
    status, _ = http("PATCH", record_url, {"text": "changed"}, t["tr1"])
    ctx.check("6f tr1 update fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", record_url, token=t["tr1"])
    ctx.check("6g tr1 delete fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", record_url, {"text": "changed"}, t["admin1"])
    ctx.check("6h admin1 update fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", record_url, token=t["admin1"])
    ctx.check("6i admin1 delete fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, translation_body(ctx, "admin1"), t["admin1"])
    ctx.check("6j admin1 creates as self works", is_ok(status), "status " + str(status))

    status, data = http("GET", path, token=t["tr2"])
    ctx.check("7a tr2 list of own_translations is empty", is_ok(status) and data.get("totalItems") == 0,
              "status " + str(status) + " items " + str(data.get("totalItems")))
    status, _ = http("GET", record_url, token=t["tr2"])
    ctx.check("7b tr2 view of tr1 record fails", is_denied(status), "status " + str(status))
    status, data = http("GET", path, token=t["admin1"])
    ctx.check("7c admin1 list shows all 3 records", is_ok(status) and data.get("totalItems") == 3,
              "status " + str(status) + " items " + str(data.get("totalItems")))
    status, _ = http("GET", record_url, token=t["admin1"])
    ctx.check("7d admin1 view works", is_ok(status), "status " + str(status))
    status, data = http("GET", path, token=t["tr1"])
    ctx.check("7e tr1 list shows own 2 records", is_ok(status) and data.get("totalItems") == 2,
              "status " + str(status) + " items " + str(data.get("totalItems")))


def comment_body(ctx, key, text, shared, page="kendojidai_2014/p0839"):
    return {"user": ctx.id[key], "page_id": page, "group_key": page + "/ts3/L01-L05", "run_id": "run-1",
            "text": text, "shared": shared}


def visible_ids(ctx, who):
    status, data = http("GET", "/api/collections/comments/records?perPage=200", token=ctx.token[who])
    return {item["id"] for item in data.get("items", [])} if is_ok(status) else None


def check_comments(ctx):
    path = "/api/collections/comments/records"
    t = ctx.token
    _, private = http("POST", path, comment_body(ctx, "tr1", "private note", False), t["tr1"])
    _, shared = http("POST", path, comment_body(ctx, "tr1", "shared note", True), t["tr1"])
    ctx.check("8a tr1 creates private and shared comment", "id" in private and "id" in shared, "create failed")
    p_url, s_url = path + "/" + private.get("id", "x"), path + "/" + shared.get("id", "x")
    tr2_ids, rd1_ids = visible_ids(ctx, "tr2"), visible_ids(ctx, "rd1")
    ctx.check("8b private comment hidden from tr2", tr2_ids is not None and private.get("id") not in tr2_ids, "visible")
    ctx.check("8c private comment hidden from rd1", rd1_ids is not None and private.get("id") not in rd1_ids, "visible")
    ctx.check("8d shared comment visible to tr2", tr2_ids is not None and shared.get("id") in tr2_ids, "not visible")
    ctx.check("8e shared comment hidden from rd1", rd1_ids is not None and shared.get("id") not in rd1_ids, "visible")
    status, _ = http("GET", p_url, token=t["tr2"])
    ctx.check("8f tr2 view of private comment fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", s_url, {"text": "edit by tr2"}, t["tr2"])
    ctx.check("8g tr2 update of tr1 comment fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", s_url, token=t["tr2"])
    ctx.check("8h tr2 delete of tr1 comment fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", s_url, {"text": "edit by tr1"}, t["tr1"])
    ctx.check("8i tr1 changes own text works", is_ok(status), "status " + str(status))
    status, _ = http("PATCH", s_url, {"page_id": "kendojidai_2014/p0001"}, t["tr1"])
    ctx.check("8j tr1 changes page_id fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", s_url, {"user": ctx.id["tr2"]}, t["tr1"])
    ctx.check("8k tr1 changes user fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", s_url, {"text": "edit by admin"}, t["admin1"])
    ctx.check("8l admin1 update of tr1 comment fails", is_denied(status), "status " + str(status))
    admin_ids = visible_ids(ctx, "admin1")
    ctx.check("8m admin1 sees private and shared comment", admin_ids is not None and {private.get("id"), shared.get("id")} <= admin_ids,
              "not visible")
    status, _ = http("POST", path, comment_body(ctx, "rd1", "reader comment", False), t["rd1"])
    ctx.check("8n rd1 creates comment fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", s_url, token=t["admin1"])
    ctx.check("8o admin1 delete of tr1 comment works", is_ok(status), "status " + str(status))
    status, _ = http("DELETE", p_url, token=t["tr1"])
    ctx.check("8p tr1 delete of own comment works", is_ok(status), "status " + str(status))


def batch_request(ctx, key, group, version, text="batch text", user_key=None):
    """One request of a batch call: create an own translation."""
    body = translation_body(ctx, key, version=version, group=group, user_key=user_key)
    body["text"] = text
    return {"method": "POST", "url": "/api/collections/own_translations/records", "body": body}


def count_version(ctx, page_id, version):
    status, data = http("GET", "/api/collections/own_translations/records?perPage=1&filter=" +
                        urllib.parse.quote('page_id="' + page_id + '" && version=' + str(version)), token=ctx.su_token)
    return data.get("totalItems") if is_ok(status) else None


def check_batch(ctx):
    """Unit H1, round 54 answer 7: one Save writes every row in one batch call. The migration 1793300002 turns batch on."""
    path = "/api/batch"
    t = ctx.token
    page = "kendojidai_2014/p0839"
    status, settings = http("GET", "/api/settings", token=ctx.su_token)
    batch = settings.get("batch", {}) if is_ok(status) else {}
    ctx.check("17a batch API is on, with maxRequests >= 200 and timeout >= 10",
              batch.get("enabled") is True and batch.get("maxRequests", 0) >= 200 and batch.get("timeout", 0) >= 10, "batch " + str(batch))
    ok_calls = {"requests": [batch_request(ctx, "tr1", g, 5) for g in ("B01-B01", "B02-B02", "B03-B03")]}
    status, data = http("POST", path, ok_calls, t["tr1"])
    ctx.check("17b tr1 batch of 3 own translations with one version works", is_ok(status) and isinstance(data, list) and len(data) == 3
              and all(item.get("status") == 200 for item in data), "status " + str(status))
    ctx.check("17b the 3 records are saved", count_version(ctx, page, 5) == 3, "count " + str(count_version(ctx, page, 5)))
    bad_dup = {"requests": [batch_request(ctx, "tr1", "B04-B04", 6), batch_request(ctx, "tr1", "B01-B01", 5)]}
    status, _ = http("POST", path, bad_dup, t["tr1"])
    ctx.check("17c batch with one duplicate record fails", is_denied(status), "status " + str(status))
    ctx.check("17c nothing of the failed batch is saved (all or nothing)", count_version(ctx, page, 6) == 0, "count " + str(count_version(ctx, page, 6)))
    bad_user = {"requests": [batch_request(ctx, "tr1", "B05-B05", 7), batch_request(ctx, "tr1", "B06-B06", 7, user_key="tr2")]}
    status, _ = http("POST", path, bad_user, t["tr1"])
    ctx.check("17d batch with a record for another user fails", is_denied(status), "status " + str(status))
    ctx.check("17d nothing of that batch is saved", count_version(ctx, page, 7) == 0, "count " + str(count_version(ctx, page, 7)))
    status, _ = http("POST", path, {"requests": [batch_request(ctx, "rd1", "B07-B07", 1)]}, t["rd1"])
    ctx.check("17e rd1 batch fails (the create rule applies to each request)", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"requests": [batch_request(ctx, "tr1", "B07-B07", 1)]})
    ctx.check("17e anonymous batch fails", is_denied(status), "status " + str(status))
    many = {"requests": [batch_request(ctx, "tr1", "M%03d-M%03d" % (n, n), 8) for n in range(200)]}
    status, data = http("POST", path, many, t["tr1"])
    ctx.check("17f batch of 200 records works", is_ok(status) and isinstance(data, list) and len(data) == 200, "status " + str(status))
    over = {"requests": [batch_request(ctx, "tr1", "N%03d-N%03d" % (n, n), 9) for n in range(201)]}
    status, _ = http("POST", path, over, t["tr1"])
    ctx.check("17f batch of 201 records is refused", is_denied(status), "status " + str(status))


def check_run_marks(ctx):
    path = "/api/collections/run_marks/records"
    t = ctx.token
    body = {"page_id": "kendojidai_2014/p0839", "run_id": "run-1", "marked_by": ctx.id["admin1"], "note": "pick"}
    status, _ = http("POST", path, body, t["tr1"])
    ctx.check("9a tr1 creates run mark fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, body, t["admin1"])
    ctx.check("9b admin1 creates run mark works", is_ok(status), "status " + str(status))
    status, _ = http("POST", path, dict(body, run_id="run-2"), t["admin1"])
    ctx.check("9c second run mark with same page_id fails", is_denied(status), "status " + str(status))
    status, data = http("GET", path, token=t["tr1"])
    ctx.check("9d tr1 list of run marks works", is_ok(status) and data.get("totalItems") == 1, "status " + str(status))


def snapshot_of(size):
    return {"TL_3.txt": "t" * (size // 2), "ED_3.json": {"text": "e" * (size // 2 - 40)}}


def check_page_runs(ctx):
    path = "/api/collections/page_runs/records"
    t = ctx.token
    status, data = http("GET", path)
    ctx.check("10a anonymous list of page_runs fails or is empty", is_denied(status) or data.get("totalItems", 1) == 0,
              "status " + str(status))
    collection = get_collection(ctx, "page_runs") or {}
    names = [f["name"] for f in collection.get("fields", [])]
    ctx.check("10a1 page_runs has the text fields started_utc and status (migration 1793300003)",
              all(n in names for n in ("started_utc", "status")), "fields " + ", ".join(names))
    snapshot = snapshot_of(200 * 1024)
    body = {"page_id": "kendojidai_2014/p0839", "item_id": "kendojidai_2014", "run_id": "run-1", "verdict": "PASS",
            "qa3_page_score": 0.9, "finished": "2026-10-28 10:00:00.000Z", "started_utc": "2026-10-28T09:59:00Z",
            "status": "completed", "snapshot": snapshot}
    status, record = http("POST", path, body, ctx.su_token)
    ctx.check("10b superuser creates page run with 200 KB snapshot", is_ok(status), "status " + str(status))
    status, back = http("GET", path + "/" + record.get("id", "x"), token=t["tr1"])
    ctx.check("10c tr1 reads the snapshot back with the same content", is_ok(status) and back.get("snapshot") == snapshot,
              "status " + str(status))
    ctx.check("10d snapshot size matches", len(json.dumps(back.get("snapshot"))) == len(json.dumps(snapshot)), "size differs")
    ctx.check("10d1 started_utc and status are stored", back.get("started_utc") == body["started_utc"] and back.get("status") == "completed",
              "started_utc " + repr(back.get("started_utc")) + " status " + repr(back.get("status")))
    status, listing = http("GET", path + "?perPage=1&fields=run_id,started_utc,status", token=t["rd1"])
    ctx.check("10d2 rd1 (reader) lists page_runs and sees no record (closed to readers by migration 1793300009)",
              is_denied(status) or listing.get("totalItems", 1) == 0 or not listing.get("items"), "status " + str(status))
    status, one = http("GET", path + "/" + record.get("id", "x"), token=t["rd1"])
    ctx.check("10d3 rd1 (reader) cannot view one page run (no snapshot, no verdict, no score)", is_denied(status) and "snapshot" not in one,
              "status " + str(status))
    status, _ = http("POST", path, dict(body, run_id="run-8"), t["rd1"])
    ctx.check("10d4 rd1 (reader) creates page run fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", path + "/" + record.get("id", "x"), {"status": "x"}, t["tr1"])
    ctx.check("10d5 tr1 updates page run fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", path + "/" + record.get("id", "x"), token=t["tr1"])
    ctx.check("10d6 tr1 deletes page run fails", is_denied(status), "status " + str(status))
    status, upd = http("PATCH", path + "/" + record.get("id", "x"), {"status": "completed with failures", "qa3_page_score": 0.8}, ctx.su_token)
    ctx.check("10d7 superuser updates a page run", is_ok(status) and upd.get("status") == "completed with failures", "status " + str(status))
    status, _ = http("POST", path, dict(body, run_id="run-9"), t["tr1"])
    ctx.check("10e tr1 creates page run fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, body, ctx.su_token)
    ctx.check("10f duplicate (page_id, run_id) fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, dict(body, run_id="run-big", snapshot=snapshot_of(2 * 1024 * 1024)), ctx.su_token)
    ctx.check("10g 2 MB snapshot works (above the 1 MB JSON default)", is_ok(status), "status " + str(status))
    status, _ = http("POST", path, dict(body, run_id="run-huge", snapshot=snapshot_of(6 * 1024 * 1024)), ctx.su_token)
    ctx.check("10h 6 MB snapshot fails (above the 5 MB limit)", is_denied(status), "status " + str(status))


def check_catalog(ctx):
    t = ctx.token
    body = {"item_id": "x", "chapter": "x"}
    for name in ("catalog_items", "magazine_chapters"):
        path = "/api/collections/" + name + "/records"
        status, _ = http("POST", path, body, t["tr1"])
        ctx.check("11 tr1 create in " + name + " fails", is_denied(status), "status " + str(status))
        status, _ = http("GET", path, token=t["tr1"])
        ctx.check("11 tr1 list of " + name + " works", is_ok(status), "status " + str(status))
        status, _ = http("GET", path, token=t["rd1"])
        ctx.check("11 rd1 list of " + name + " works", is_ok(status), "status " + str(status))
        status, _ = http("GET", path)
        ctx.check("11 anonymous list of " + name + " fails or is empty", is_denied(status) or _.get("totalItems", 1) == 0,
                  "status " + str(status))


def check_user_script(ctx):
    """Check the safety rules of pb_users.py: refuse remote http, hide the password in errors."""
    for url, allowed in (("http://127.0.0.1:8090", True), ("http://localhost:8090", True),
                         ("http://example.com", False), ("https://example.com", True)):
        try:
            pb_users.check_url(url)
            got = True
        except pb_users.PbError:
            got = False
        ctx.check("16a url rule for " + url, got == allowed, "allowed " + str(got))
    wrong = secrets.token_urlsafe(18)
    try:
        pb_users.superuser_token(BASE, ctx.su_email, wrong)
        ctx.check("16b wrong superuser password raises a clear error", False, "no error")
    except pb_users.PbError as err:
        message = str(err)
        ctx.check("16b wrong superuser password raises a clear error", "sign-in failed" in message, message[:100])
        ctx.check("16c the error text holds no password", wrong not in message, "password in message")
    try:
        pb_users.set_role(BASE, ctx.su_token, addr("rd1"), "qa")
        ctx.check("16d role qa is refused for new role changes", False, "no error")
    except pb_users.PbError:
        ctx.check("16d role qa is refused for new role changes", True)
    try:
        pb_users.find_user(BASE, ctx.su_token, "nobody@p1-test.local")
        ctx.check("16e unknown email gives a clear error", False, "no error")
    except pb_users.PbError as err:
        ctx.check("16e unknown email gives a clear error", "No user" in str(err), str(err)[:100])
    check_user_script_approved(ctx)


def check_user_script_approved(ctx):
    """Unit RC3 (round 66 answer 7): pb_users.py approves the readers that the superuser makes. Each check below is one behavior."""
    su = ctx.su_token
    users = "/api/collections/users/records"
    ctx.check("16f add_user with role reader makes the account with approved true (rd1 of the setup)", pb_users.find_user(BASE, su, addr("rd1")).get("approved") is True, "")
    ctx.check("16g add_user with role translator does not approve (approved stays false, the PocketBase default)", pb_users.find_user(BASE, su, addr("tr1")).get("approved") is False, "")
    status, data = http("GET", "/api/collections/reader_pages/records", token=ctx.token["rd1"])
    ctx.check("16h a reader made by the script opens the reader_pages list at once (status 200, no admin step)", is_ok(status), "status " + str(status))
    pw = secrets.token_urlsafe(18)
    pb_users.add_user(BASE, su, addr("rc3a"), "translator", pw, name="rc3a")
    before = pb_users.find_user(BASE, su, addr("rc3a"))
    pb_users.set_role(BASE, su, addr("rc3a"), "reader")
    after = pb_users.find_user(BASE, su, addr("rc3a"))
    ctx.check("16i set_role to reader sets approved true (unit default: the superuser names that person)", before.get("approved") is False and after.get("role") == "reader" and after.get("approved") is True, "approved " + str(after.get("approved")))
    pb_users.set_role(BASE, su, addr("rc3a"), "translator")
    back = pb_users.find_user(BASE, su, addr("rc3a"))
    ctx.check("16j set_role to translator leaves approved as it is (true stays true)", back.get("role") == "translator" and back.get("approved") is True, "approved " + str(back.get("approved")))
    http("PATCH", users + "/" + back["id"], {"approved": False}, su)
    pb_users.set_role(BASE, su, addr("rc3a"), "admin")
    ctx.check("16k set_role to admin leaves approved as it is (false stays false)", pb_users.find_user(BASE, su, addr("rc3a")).get("approved") is False, "")
    text = pb_users.format_users([pb_users.find_user(BASE, su, addr("rd1")), pb_users.find_user(BASE, su, addr("tr1"))])
    lines = text.splitlines()
    cols = lines[0].split("\t")
    ctx.check("16l format_users has the column approved after role", cols[:3] == ["email", "role", "approved"] and len(cols) == 6, lines[0])
    ctx.check("16m format_users shows approved true for the reader and false for the translator", lines[1].split("\t")[2] == "True" and lines[2].split("\t")[2] == "False", str(lines[1:]))
    ctx.check("16n format_users output holds no password and no token", ctx.pw["rd1"] not in text and su not in text and "passwordHash" not in text, "")
    # The command line path: main() with a fake getpass. The output and the error text must not hold any password.
    import contextlib
    import io
    cli_pw = secrets.token_urlsafe(18)
    answers = iter([cli_pw, cli_pw, ctx.su_pw])
    real_getpass = pb_users.getpass.getpass
    pb_users.getpass.getpass = lambda prompt="": next(answers)
    out, err = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = pb_users.main(["--url", BASE, "--superuser", ctx.su_email, "add", addr("rc3b"), "--role", "reader"])
    finally:
        pb_users.getpass.getpass = real_getpass
    shown = out.getvalue() + err.getvalue()
    ctx.check("16o the command add --role reader exits 0, says that the reader is approved, and the account has approved true", code == 0 and "approved" in shown and pb_users.find_user(BASE, su, addr("rc3b")).get("approved") is True, shown[:150])
    ctx.check("16p the command prints no password (new user password and superuser password)", cli_pw not in shown and ctx.su_pw not in shown, "password in output")
    status, _ = user_sign_in(addr("rc3b"), cli_pw)
    ctx.check("16q the reader that the command made signs in with the password that was typed", status == 200, "status " + str(status))
    answers = iter([ctx.su_pw])
    pb_users.getpass.getpass = lambda prompt="": next(answers)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            code = pb_users.main(["--url", BASE, "--superuser", ctx.su_email, "list"])
    finally:
        pb_users.getpass.getpass = real_getpass
    ctx.check("16r the command list prints the header with approved and the row of rc3b with True, and no password", code == 0 and "\tapproved\t" in out.getvalue() and any(l.startswith(addr("rc3b")) and "\tTrue\t" in l for l in out.getvalue().splitlines()) and cli_pw not in out.getvalue(), out.getvalue()[:150])


def get_collection(ctx, name):
    status, data = http("GET", "/api/collections/" + name, token=ctx.su_token)
    return data if status == 200 else None


def check_schema(ctx, live):
    for name, rules in EXPECTED_RULES.items():
        collection = get_collection(ctx, name)
        if collection is None:
            ctx.check("12 collection " + name + " exists", False, "missing")
            continue
        wrong = [key for key, value in rules.items() if collection.get(key) != value]
        ctx.check("12 rules of " + name + " equal the v2 strings", not wrong, "differs: " + ", ".join(wrong))
    users = get_collection(ctx, "users")
    role = next((f for f in users["fields"] if f["name"] == "role"), None)
    disabled = next((f for f in users["fields"] if f["name"] == "disabled"), None)
    ctx.check("12 users has role select with maxSelect 1", bool(role) and role["type"] == "select" and role["maxSelect"] == 1,
              "role field wrong")
    ctx.check("12 users has disabled bool", bool(disabled) and disabled["type"] == "bool", "disabled field wrong")
    if live:
        ctx.check("12 live role values still hold qa", "qa" in role["values"], "values " + str(role["values"]))
        _, listing = http("GET", "/api/collections?perPage=200", token=ctx.su_token)
        names = {c["name"] for c in listing.get("items", [])}
        missing = [n for n in V1_COLLECTIONS if n not in names]
        ctx.check("12 all 25 v1 collections still exist", not missing, "missing " + ", ".join(missing))
    else:
        ctx.check("12 fresh role values are admin, translator, reader", role["values"] == ["admin", "translator", "reader"],
                  "values " + str(role["values"]))


def check_long_text(ctx):
    path = "/api/collections/comments/records"
    t = ctx.token["tr1"]
    long_body = comment_body(ctx, "tr1", "t" * 60000, False)
    status, _ = http("POST", path, long_body, t)
    ctx.check("14a text field with max 100000 takes 60000 characters", is_ok(status), "status " + str(status))
    short_field = comment_body(ctx, "tr1", "ok", False, page="p" * 6000)
    status, _ = http("POST", path, short_field, t)
    ctx.check("14b text field without max rejects 6000 characters (default limit is 5000)", is_denied(status),
              "status " + str(status))


def check_agree(ctx):
    """Migration 1793300004 (unit UXC, round 58 answer 4): the bool field agree of own_translations."""
    path = "/api/collections/own_translations/records"
    t = ctx.token
    collection = get_collection(ctx, "own_translations") or {}
    field = next((f for f in collection.get("fields", []) if f["name"] == "agree"), None)
    ctx.check("17a own_translations has the field agree of type bool (migration 1793300004)", bool(field) and field["type"] == "bool",
              "field " + repr(field))
    page = "mental_full/p014"
    base = {"user": ctx.id["tr1"], "item_id": "mental_full", "page_id": page, "group_key": page + "/ts3/L01-L08", "ts_ids": ["x"],
            "part": "lines", "ja_text": "ja", "run_id": "run-agree", "ed3_text": "agent text", "text": "", "version": 1}
    status, ticked = http("POST", path, dict(base, agree=True), t["tr1"])
    ctx.check("17b tr1 creates a record with agree true and an empty text", is_ok(status) and ticked.get("agree") is True and ticked.get("text") == "",
              "status " + str(status))
    status, plain = http("POST", path, dict(base, group_key=page + "/ts3/L09-L13", text="own text"), t["tr1"])
    ctx.check("17c a record without agree reads back agree false (the default)", is_ok(status) and plain.get("agree") is False, "status " + str(status) + " " + repr(plain.get("agree")))
    status, back = http("GET", path + "/" + ticked.get("id", "x"), token=t["tr1"])
    ctx.check("17d tr1 reads agree true back", is_ok(status) and back.get("agree") is True, "status " + str(status))
    status, _ = http("PATCH", path + "/" + ticked.get("id", "x"), {"agree": False}, t["tr1"])
    ctx.check("17e tr1 cannot change agree later (the records never change)", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, dict(base, agree=True, user=ctx.id["tr2"], group_key=page + "/ts3/L14-L15"), t["tr1"])
    ctx.check("17f the create rule still refuses user = tr2 for tr1 (rules unchanged)", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, dict(base, agree=True, group_key=page + "/ts3/L14-L15", user=ctx.id["rd1"]), t["rd1"])
    ctx.check("17g rd1 (reader) cannot create a ticked record (rules unchanged)", is_denied(status), "status " + str(status))
    status, data = http("GET", path + "?filter=" + urllib.parse.quote('page_id="' + page + '" && agree=true'), token=t["tr2"])
    ctx.check("17h tr2 does not see the ticked record of tr1", is_ok(status) and data.get("totalItems") == 0, "status " + str(status))
    status, data = http("GET", path + "?filter=" + urllib.parse.quote('page_id="' + page + '" && agree=true'), token=t["tr1"])
    ctx.check("17i tr1 filters the own ticked records (1 found)", is_ok(status) and data.get("totalItems") == 1, "status " + str(status) + " " + str(data.get("totalItems")))


def check_user_settings(ctx):
    """Migration 1793300005 (unit UXC, round 59 answer 6): the collection user_settings, own record only."""
    path = "/api/collections/user_settings/records"
    t = ctx.token
    collection = get_collection(ctx, "user_settings") or {}
    fields = {f["name"]: f for f in collection.get("fields", [])}
    ctx.check("18a user_settings has user (relation, required), theme (select with the 5 theme names), panes (json, 20000 bytes)",
              fields.get("user", {}).get("type") == "relation" and fields["user"].get("required") is True and fields["user"].get("maxSelect") == 1
              and fields.get("theme", {}).get("type") == "select" and fields["theme"].get("values") == THEMES
              and fields.get("panes", {}).get("type") == "json" and fields["panes"].get("maxSize") == 20000, "fields " + ", ".join(fields))
    ctx.check("18b user_settings has created and updated autodate fields and the unique index on user",
              fields.get("created", {}).get("type") == "autodate" and fields.get("updated", {}).get("type") == "autodate"
              and any("UNIQUE" in i.upper() and "user" in i for i in collection.get("indexes", [])), "indexes " + repr(collection.get("indexes")))
    panes = {"v": 1, "panes": {"tl3": {"font": "sans", "size": 15, "width": 520}}}
    status, mine = http("POST", path, {"user": ctx.id["tr1"], "theme": "dark", "panes": panes}, t["tr1"])
    ctx.check("18c tr1 creates the own settings record", is_ok(status) and mine.get("theme") == "dark" and mine.get("panes") == panes, "status " + str(status))
    status, _ = http("POST", path, {"user": ctx.id["tr2"], "theme": "dark"}, t["tr1"])
    ctx.check("18d tr1 creates a record for tr2 fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"user": ctx.id["tr1"], "theme": "light"}, t["tr1"])
    ctx.check("18e a second record for tr1 fails (unique index)", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"user": ctx.id["tr2"], "theme": "purple"}, t["tr2"])
    ctx.check("18f a theme that is not one of the 5 theme names fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"user": ctx.id["tr2"], "panes": {"v": 1, "pad": "x" * 21000}}, t["tr2"])
    ctx.check("18g panes above 20000 bytes fail", is_denied(status), "status " + str(status))
    status, rd = http("POST", path, {"user": ctx.id["rd1"], "theme": "dark"}, t["rd1"])
    ctx.check("18h rd1 (reader) creates the own settings record (no role limit)", is_ok(status), "status " + str(status))
    status, data = http("GET", path, token=t["tr2"])
    ctx.check("18i tr2 list shows no record", is_ok(status) and data.get("totalItems") == 0, "status " + str(status) + " " + str(data.get("totalItems")))
    status, _ = http("GET", path + "/" + mine.get("id", "x"), token=t["tr2"])
    ctx.check("18j tr2 view of the record of tr1 fails", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", path + "/" + mine.get("id", "x"), {"theme": "light"}, t["tr2"])
    ctx.check("18k tr2 update of the record of tr1 fails", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", path + "/" + mine.get("id", "x"), token=t["tr2"])
    ctx.check("18l tr2 delete of the record of tr1 fails", is_denied(status), "status " + str(status))
    status, upd = http("PATCH", path + "/" + mine.get("id", "x"), {"theme": "light"}, t["tr1"])
    ctx.check("18m tr1 updates the own record (theme light)", is_ok(status) and upd.get("theme") == "light", "status " + str(status))
    status, _ = http("PATCH", path + "/" + mine.get("id", "x"), {"user": ctx.id["tr2"]}, t["tr1"])
    ctx.check("18n tr1 cannot give the record to tr2 (the user cannot change)", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", path + "/" + mine.get("id", "x"), token=t["tr1"])
    ctx.check("18o tr1 delete of the own record fails (the delete rule is null)", is_denied(status), "status " + str(status))
    status, _ = http("DELETE", path + "/" + mine.get("id", "x"), token=t["admin1"])
    ctx.check("18p admin1 delete fails too (only the superuser deletes)", is_denied(status), "status " + str(status))
    status, data = http("GET", path, token=t["admin1"])
    ctx.check("18q admin1 list shows no record of other users (own record only, no admin rule)", is_ok(status) and data.get("totalItems") == 0, "status " + str(status) + " " + str(data.get("totalItems")))
    status, data = http("GET", path)
    ctx.check("18r anonymous list fails or is empty", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    ctx.check("18s rd1 reads back the own record", is_ok(http("GET", path + "/" + rd.get("id", "x"), token=t["rd1"])[0]), "read failed")


def check_reader_pages(ctx):
    """Migrations 1793300006 to 1793300009 (unit RC1, round 63): the sign-up rule, the approval, the reader collections, and the closed page_runs."""
    users = "/api/collections/users/records"
    su = ctx.su_token
    sign_up_count = [10]

    def sign_up(key, extra):
        sign_up_count[0] += 1
        pw = secrets.token_urlsafe(18)
        body = {"email": addr(key), "password": pw, "passwordConfirm": pw, "name": key}
        body.update(extra)
        status, data = http("POST", users, body, xff="203.0.113." + str(sign_up_count[0]))
        return status, data, pw

    status, data, pw1 = sign_up("su1", {"role": "reader"})
    ctx.check("19a a public sign-up with role reader works and the account has approved false", is_ok(status) and data.get("approved") is False, "status " + str(status))
    ctx.check("19b a sign-up with role admin fails", is_denied(sign_up("su2", {"role": "admin"})[0]), "")
    ctx.check("19c a sign-up with role translator fails", is_denied(sign_up("su3", {"role": "translator"})[0]), "")
    ctx.check("19d a sign-up with approved true fails", is_denied(sign_up("su4", {"role": "reader", "approved": True})[0]), "")
    ctx.check("19e a sign-up with no role fails", is_denied(sign_up("su5", {})[0]), "")
    ctx.check("19f a sign-up that sets disabled fails", is_denied(sign_up("su6", {"role": "reader", "disabled": False})[0]), "")
    ctx.check("19g a sign-up with approved false works", is_ok(sign_up("su7", {"role": "reader", "approved": False})[0]), "")
    status, tok = user_sign_in(addr("su1"), pw1)
    ctx.check("19h the new reader signs in", status == 200, "status " + str(status))
    ctx.token["su1"] = tok
    ctx.id["su1"] = http("GET", users + "?filter=" + urllib.parse.quote('email="' + addr("su1") + '"'), token=su)[1]["items"][0]["id"]
    t = ctx.token
    status, _ = http("PATCH", users + "/" + ctx.id["su1"], {"approved": True}, t["su1"])
    ctx.check("19i a reader cannot approve the own account", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", users + "/" + ctx.id["su1"], {"role": "admin"}, t["su1"])
    ctx.check("19j a reader cannot change the own role", is_denied(status), "status " + str(status))
    status, _ = http("PATCH", users + "/" + ctx.id["su1"], {"name": "new name"}, t["su1"])
    ctx.check("19k a reader can change the own name", is_ok(status), "status " + str(status))
    status, _ = http("PATCH", users + "/" + ctx.id["tr1"], {"approved": True}, t["tr1"])
    ctx.check("19l a translator cannot set approved on the own record", is_denied(status), "status " + str(status))
    status, data = http("GET", users, token=t["su1"])
    ctx.check("19m a reader lists only the own user record (no other name, role, or email)", is_ok(status) and [u["id"] for u in data.get("items", [])] == [ctx.id["su1"]], "status " + str(status))
    status, _ = http("GET", users + "/" + ctx.id["tr1"], token=t["su1"])
    ctx.check("19n a reader cannot view the user record of a translator", is_denied(status), "status " + str(status))
    status, data = http("GET", users, token=t["tr1"])
    ctx.check("19o a translator lists all users (the comment view needs the user names)", is_ok(status) and data.get("totalItems", 0) >= 5, "status " + str(status))
    # an approved reader made by the superuser
    pw2 = secrets.token_urlsafe(18)
    ctx.id["rd2"] = pb_users.add_user(BASE, su, addr("rd2"), "reader", pw2, name="rd2")["id"]
    ctx.check("19p a reader account that the superuser makes has approved true (unit RC3, round 66 answer 7)", http("GET", users + "/" + ctx.id["rd2"], token=su)[1].get("approved") is True, "")
    http("PATCH", users + "/" + ctx.id["rd2"], {"approved": False}, su)
    status, data = http("PATCH", users + "/" + ctx.id["rd2"], {"approved": True}, t["admin1"])
    ctx.check("19q an admin approves a reader", is_ok(status) and data.get("approved") is True, "status " + str(status))
    ctx.token["rd2"] = user_sign_in(addr("rd2"), pw2)[1]
    # seed data by the superuser
    status, page = http("POST", "/api/collections/reader_pages/records", {"page_id": "rc1/p001", "item_id": "rc1", "n": 1, "run_id": "r1", "rows": [{"key": "rc1/p001/ts3/L01"}], "terms": {}, "extras": [], "agree": []}, su)
    ctx.check("19r the superuser creates a reader_pages record", is_ok(status), "status " + str(status) + " " + str(page)[:200])
    status, run = http("POST", "/api/collections/page_runs/records", {"page_id": "rc1/p001", "run_id": "r1", "verdict": "PASS", "snapshot": {"x": 1}}, su)
    ctx.check("19s the superuser creates a page_runs record", is_ok(status), "status " + str(status))
    rp = "/api/collections/reader_pages/records"
    status, data = http("GET", rp, token=t["su1"])
    ctx.check("19t a not approved reader gets no reader_pages record", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    status, _ = http("GET", rp + "/" + page.get("id", "x"), token=t["su1"])
    ctx.check("19u a not approved reader cannot view a reader_pages record", is_denied(status), "status " + str(status))
    status, data = http("GET", rp, token=t["rd2"])
    ctx.check("19v an approved reader lists the reader_pages record", is_ok(status) and data.get("totalItems") == 1, "status " + str(status))
    status, data = http("GET", rp, token=t["tr1"])
    ctx.check("19w a translator lists the reader_pages record", is_ok(status) and data.get("totalItems") == 1, "status " + str(status))
    ctx.check("19x the reader_pages record has no verdict, score, panel, or reasoning field",
              not any(k in (data.get("items") or [{}])[0] for k in ("verdict", "score", "panel", "reasoning", "qa3_page_score", "snapshot")), "")
    for who in ("su1", "rd2", "tr1", "admin1"):
        status, _ = http("POST", rp, {"page_id": "rc1/p002", "run_id": "r2"}, t[who])
        ctx.check("19y " + who + " cannot write reader_pages (only the superuser)", is_denied(status), "status " + str(status))
    pr = "/api/collections/page_runs/records"
    for who in ("su1", "rd2"):
        status, data = http("GET", pr, token=t[who])
        ctx.check("19z " + who + " (reader) gets no page_runs record: verdict, score, and TL_3 panel stay closed", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
        status, _ = http("GET", pr + "/" + run.get("id", "x"), token=t[who])
        ctx.check("19z " + who + " cannot view a page_runs record", is_denied(status), "status " + str(status))
    for who in ("tr1", "admin1"):
        status, data = http("GET", pr, token=t[who])
        ctx.check("19z " + who + " reads page_runs", is_ok(status) and data.get("totalItems", 0) >= 1, "status " + str(status))
    # reader_versions and page_checks: only the admin writes
    version_body = {"page_id": "rc1/p001", "user": ctx.id["tr1"], "version": 1, "run_id": "r1", "rows": [{"key": "k", "text": "x"}], "chosen_by": ctx.id["admin1"]}
    for who in ("rd2", "tr1"):
        ctx.check("20a " + who + " cannot write reader_versions", is_denied(http("POST", "/api/collections/reader_versions/records", version_body, t[who])[0]), "")
        ctx.check("20b " + who + " cannot write page_checks", is_denied(http("POST", "/api/collections/page_checks/records", {"page_id": "rc1/p001", "checked_by": ctx.id[who]}, t[who])[0]), "")
    status, ver = http("POST", "/api/collections/reader_versions/records", version_body, t["admin1"])
    ctx.check("20c admin writes reader_versions", is_ok(status), "status " + str(status) + " " + str(ver)[:200])
    ctx.check("20d a second reader_versions record for the same page fails (unique index)", is_denied(http("POST", "/api/collections/reader_versions/records", version_body, t["admin1"])[0]), "")
    status, chk = http("POST", "/api/collections/page_checks/records", {"page_id": "rc1/p001", "checked_by": ctx.id["admin1"], "note": "ok"}, t["admin1"])
    ctx.check("20e admin writes page_checks", is_ok(status), "status " + str(status))
    ctx.check("20f an approved reader reads reader_versions", http("GET", "/api/collections/reader_versions/records", token=t["rd2"])[1].get("totalItems") == 1, "")
    status, data = http("GET", "/api/collections/reader_versions/records", token=t["su1"])
    ctx.check("20g a not approved reader gets no reader_versions record", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    ctx.check("20h a not approved reader reads page_checks (titles level)", http("GET", "/api/collections/page_checks/records", token=t["su1"])[1].get("totalItems") == 1, "")
    ctx.check("20i a reader cannot delete page_checks", is_denied(http("DELETE", "/api/collections/page_checks/records/" + chk.get("id", "x"), token=t["rd2"])[0]), "")
    # bookmarks and reading progress: own records only
    bm, pg = "/api/collections/reader_bookmarks/records", "/api/collections/reader_progress/records"
    status, mine = http("POST", bm, {"user": ctx.id["rd2"], "page_id": "rc1/p001", "item_id": "rc1", "note": "n"}, t["rd2"])
    ctx.check("21a an approved reader adds a bookmark", is_ok(status), "status " + str(status))
    ctx.check("21b the same bookmark twice fails (unique index)", is_denied(http("POST", bm, {"user": ctx.id["rd2"], "page_id": "rc1/p001", "item_id": "rc1"}, t["rd2"])[0]), "")
    ctx.check("21c a not approved reader cannot add a bookmark", is_denied(http("POST", bm, {"user": ctx.id["su1"], "page_id": "rc1/p001", "item_id": "rc1"}, t["su1"])[0]), "")
    ctx.check("21d a reader cannot add a bookmark for another user", is_denied(http("POST", bm, {"user": ctx.id["tr1"], "page_id": "rc1/p009", "item_id": "rc1"}, t["rd2"])[0]), "")
    http("POST", bm, {"user": ctx.id["tr1"], "page_id": "rc1/p005", "item_id": "rc1"}, t["tr1"])
    status, data = http("GET", bm, token=t["rd2"])
    ctx.check("21e a reader lists the own bookmarks only", is_ok(status) and [x["user"] for x in data.get("items", [])] == [ctx.id["rd2"]], "")
    ctx.check("21f another user cannot view or delete the bookmark", is_denied(http("GET", bm + "/" + mine.get("id", "x"), token=t["tr1"])[0]) and is_denied(http("DELETE", bm + "/" + mine.get("id", "x"), token=t["tr1"])[0]), "")
    ctx.check("21g a bookmark cannot be updated", is_denied(http("PATCH", bm + "/" + mine.get("id", "x"), {"note": "z"}, t["rd2"])[0]), "")
    status, prog = http("POST", pg, {"user": ctx.id["rd2"], "item_id": "rc1", "page_id": "rc1/p003"}, t["rd2"])
    ctx.check("21h an approved reader saves the last page of a book", is_ok(status), "status " + str(status))
    ctx.check("21i a second progress record for the same book fails (unique index)", is_denied(http("POST", pg, {"user": ctx.id["rd2"], "item_id": "rc1", "page_id": "rc1/p004"}, t["rd2"])[0]), "")
    status, upd = http("PATCH", pg + "/" + prog.get("id", "x"), {"page_id": "rc1/p007"}, t["rd2"])
    ctx.check("21j a reader updates the own progress", is_ok(status) and upd.get("page_id") == "rc1/p007", "status " + str(status))
    ctx.check("21k a reader cannot change the user of a progress record", is_denied(http("PATCH", pg + "/" + prog.get("id", "x"), {"user": ctx.id["tr1"]}, t["rd2"])[0]), "")
    ctx.check("21l another user cannot update or delete the progress", is_denied(http("PATCH", pg + "/" + prog.get("id", "x"), {"page_id": "rc1/p008"}, t["tr1"])[0]) and is_denied(http("DELETE", pg + "/" + prog.get("id", "x"), token=t["rd2"])[0]), "")
    status, data = http("GET", pg, token=t["tr1"])
    ctx.check("21m another user lists none of the progress records of the reader", is_ok(status) and all(x["user"] == ctx.id["tr1"] for x in data.get("items", [])), "")
    # the five theme names, and cleanup so that the down check sees empty collections
    for coll in ("reader_pages", "reader_versions", "page_checks", "reader_bookmarks", "reader_progress", "page_runs"):
        _, listing = http("GET", "/api/collections/" + coll + "/records?perPage=200", token=su)
        for item in listing.get("items", []):
            if coll != "page_runs" or item.get("page_id") == "rc1/p001":
                http("DELETE", "/api/collections/" + coll + "/records/" + item["id"], token=su)
    ctx.check("22a the reader test records are removed again", all(http("GET", "/api/collections/" + c + "/records?perPage=1", token=su)[1].get("totalItems") == 0 for c in ("reader_pages", "reader_versions", "page_checks", "reader_bookmarks", "reader_progress")), "")


def check_dashboard_fields(ctx):
    """Migration 1793300010 (unit RC4, round 70): translated and placement in catalog_items, search_ja and search_en in reader_pages."""
    su = ctx.su_token
    t = ctx.token

    def field(collection, name):
        return next((f for f in (get_collection(ctx, collection) or {}).get("fields", []) if f.get("name") == name), None)

    for coll, name, kind in (("catalog_items", "translated", "json"), ("catalog_items", "placement", "json"), ("reader_pages", "search_ja", "text"), ("reader_pages", "search_en", "text")):
        f = field(coll, name)
        ctx.check("23a " + coll + "." + name + " exists with the type " + kind, bool(f) and f.get("type") == kind, "field " + str(f))
    ctx.check("23b the search columns have an explicit max of 100000 characters (the text field default is 5000)",
              all((field("reader_pages", n) or {}).get("max") == 100000 for n in ("search_ja", "search_en")), "max differs")
    ctx.check("23c the rules of catalog_items and reader_pages did not change (list and view as before)",
              all((get_collection(ctx, n) or {}).get(k) == EXPECTED_RULES[n][k] for n in ("catalog_items", "reader_pages") for k in ("listRule", "viewRule", "createRule", "updateRule", "deleteRule")), "rules differ")
    item = {"item_id": "rc4x", "kind": "web-article", "translated": {"en": [46, 47, 48]}, "placement": {"web_year": 2025, "web_month": 4, "print_year": 2011, "print_month": 8}}
    status, rec = http("POST", "/api/collections/catalog_items/records", item, su)
    ctx.check("23d the superuser writes translated and placement into catalog_items", is_ok(status) and rec.get("translated") == item["translated"] and rec.get("placement") == item["placement"], "status " + str(status) + " " + str(rec)[:200])
    ctx.check("23p the old name is gone: catalog_items has no field finished (unit RC4b renamed it to translated before any database applied it)", field("catalog_items", "finished") is None and "finished" not in rec, "field " + str(field("catalog_items", "finished")))
    cat = "/api/collections/catalog_items/records?filter=" + urllib.parse.quote('item_id="rc4x"')
    for who in ("rd1", "tr1", "su1"):
        status, data = http("GET", cat, token=t[who])
        ctx.check("23e " + who + " (" + ("a reader who waits for approval" if who == "su1" else "signed in") + ") reads translated and placement of catalog_items",
                  is_ok(status) and data.get("items") and data["items"][0].get("translated") == item["translated"] and data["items"][0].get("placement") == item["placement"], "status " + str(status))
    for who in ("rd1", "su1", "tr1"):
        status, _ = http("POST", "/api/collections/catalog_items/records", {"item_id": "rc4y"}, t[who])
        ctx.check("23f " + who + " cannot write catalog_items", is_denied(status), "status " + str(status))
    page = {"page_id": "rc4x/p001", "item_id": "rc4x", "n": 1, "run_id": "r1", "rows": [], "terms": {}, "extras": [], "agree": [],
            "search_ja": "わたしは剣先を相手の中墨から外さず" , "search_en": "i keep applying seme without letting my kensen leave the aite's chuzumi"}
    status, rec = http("POST", "/api/collections/reader_pages/records", page, su)
    ctx.check("23g the superuser writes search_ja and search_en into reader_pages", is_ok(status) and rec.get("search_en") == page["search_en"], "status " + str(status) + " " + str(rec)[:200])
    flt = "/api/collections/reader_pages/records?filter=" + urllib.parse.quote('search_en ~ "chuzumi" || search_ja ~ "chuzumi"')
    for who in ("rd1", "tr1"):
        status, data = http("GET", flt, token=t[who])
        ctx.check("23h " + who + " finds the page with the filter ~ on search_en", is_ok(status) and data.get("totalItems") == 1, "status " + str(status))
    status, data = http("GET", "/api/collections/reader_pages/records?filter=" + urllib.parse.quote('search_ja ~ "中墨"'), token=t["rd1"])
    ctx.check("23i the filter ~ finds a Japanese word in search_ja", is_ok(status) and data.get("totalItems") == 1, "status " + str(status))
    status, data = http("GET", flt, token=t["su1"])
    ctx.check("23j a reader who waits for approval gets no page hit from the filter (rule READ_OK)", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    status, _ = http("POST", "/api/collections/reader_pages/records", dict(page, page_id="rc4x/p002", search_en="x" * 60000), su)
    ctx.check("23k a search column takes 60000 characters (above the 5000 default)", is_ok(status), "status " + str(status))
    status, _ = http("POST", "/api/collections/reader_pages/records", dict(page, page_id="rc4x/p003", search_en="x" * 100001), su)
    ctx.check("23l a search column of 100001 characters fails (above the limit)", is_denied(status), "status " + str(status))
    status, _ = http("POST", "/api/collections/reader_pages/records", dict(page, page_id="rc4x/p004", search_ja="x" * 100001), su)
    ctx.check("23m search_ja of 100001 characters fails as well", is_denied(status), "status " + str(status))
    status, _ = http("POST", "/api/collections/catalog_items/records", {"item_id": "rc4z", "translated": {"en": list(range(1, 200000))}}, su)
    ctx.check("23n translated above 1 MB of JSON fails (explicit limit)", is_denied(status), "status " + str(status))
    for coll, flt2 in (("reader_pages", 'item_id="rc4x"'), ("catalog_items", 'item_id="rc4x"')):
        status, data = http("GET", "/api/collections/" + coll + "/records?perPage=50&filter=" + urllib.parse.quote(flt2), token=su)
        for item_ in data.get("items", []):
            http("DELETE", "/api/collections/" + coll + "/records/" + item_["id"], token=su)
    ctx.check("23o the RC4 test records are removed again", all(http("GET", "/api/collections/" + c + "/records?perPage=1", token=su)[1].get("totalItems") == 0 for c in ("reader_pages", "catalog_items")), "")


def check_web_fields(ctx):
    """Migration 1793300011 (unit RT73a, round 73): own_translations.facts for the kendojidai.com text of the web articles, the default choice with an empty chosen_by,
    and the system account that can never sign in. There is no collection reader_v1 (owner answer 8 of round 73d)."""
    su = ctx.su_token
    t = ctx.token

    def field(collection, name):
        return next((f for f in (get_collection(ctx, collection) or {}).get("fields", []) if f.get("name") == name), None)

    f = field("own_translations", "facts")
    ctx.check("24a own_translations.facts exists with the type json and maxSize 1 MB", bool(f) and f.get("type") == "json" and f.get("maxSize") == 1048576, "field " + str(f))
    ctx.check("24b the migration adds no collection reader_v1", get_collection(ctx, "reader_v1") is None, "")
    ctx.check("24c the rules of own_translations did not change", all((get_collection(ctx, "own_translations") or {}).get(k) == EXPECTED_RULES["own_translations"][k] for k in ("listRule", "viewRule", "createRule", "updateRule", "deleteRule")), "rules differ")
    facts = [{"start": 75, "end": 111, "ja": "その上がった手元に小手を打たれる", "type": "action", "kind": "changed"}, {"start": None, "end": None, "ja": "右足", "type": "body_part", "kind": "dropped"}]
    pw = secrets.token_urlsafe(18)
    status, system = http("POST", "/api/collections/users/records", {"email": "kendojidai-com@system.invalid", "name": "kendojidai.com", "password": pw, "passwordConfirm": pw,
                                                                    "verified": True, "emailVisibility": False, "role": "reader", "approved": False, "disabled": True}, su)
    ctx.check("24d the superuser creates the system account kendojidai.com (email ending .invalid, role reader, approved false, disabled true)", is_ok(status) and system.get("disabled") is True, "status " + str(status) + " " + str(system)[:200])
    status, _ = user_sign_in("kendojidai-com@system.invalid", pw)
    ctx.check("24e the system account cannot sign in, even with the right password (users.authRule is disabled = false)", is_denied(status), "status " + str(status))
    page = "rt73x/p001"
    row = {"user": system["id"], "item_id": "rt73x", "page_id": page, "group_key": page + "/web/U071", "ts_ids": [], "part": "lines", "ja_text": "詰めたところから", "run_id": "",
           "ed3_text": "", "text": "If you try to strike from there", "version": 1, "agree": False, "facts": facts}
    status, rec = http("POST", "/api/collections/own_translations/records", row, su)
    ctx.check("24f the superuser writes an own_translations row of the system account with two fact marks", is_ok(status) and rec.get("facts") == facts, "status " + str(status) + " " + str(rec)[:200])
    status, _ = http("POST", "/api/collections/own_translations/records", dict(row, group_key=page + "/web/U072", facts=[{"ja": "x" * 1100000}]), su)
    ctx.check("24g facts above 1 MB of JSON fail (explicit limit)", is_denied(status), "status " + str(status))
    status, data = http("GET", "/api/collections/own_translations/records?filter=" + urllib.parse.quote('page_id="' + page + '"'), token=t["admin1"])
    ctx.check("24h an admin reads the row of the system account with the facts", is_ok(status) and data.get("totalItems") == 1 and data["items"][0].get("facts") == facts, "status " + str(status))
    status, data = http("GET", "/api/collections/own_translations/records?filter=" + urllib.parse.quote('page_id="' + page + '"'), token=t["tr1"])
    ctx.check("24i a translator does not see the row of the system account (list rule: own rows or admin)", is_ok(status) and data.get("totalItems") == 0, "status " + str(status))
    version = {"page_id": page, "user": system["id"], "version": 1, "run_id": "", "rows": [{"key": page + "/web/U071", "text": row["text"], "facts": facts}]}
    status, rv = http("POST", "/api/collections/reader_versions/records", version, su)
    ctx.check("24j reader_versions takes the default choice with an empty chosen_by (no change of the collection needed)", is_ok(status) and rv.get("chosen_by") == "" and rv.get("rows") == version["rows"], "status " + str(status) + " " + str(rv)[:200])
    status, data = http("GET", "/api/collections/reader_versions/records?filter=" + urllib.parse.quote('page_id="' + page + '"'), token=t["rd1"])
    ctx.check("24k an approved reader reads the default choice with the facts", is_ok(status) and data.get("totalItems") == 1 and data["items"][0]["rows"][0].get("facts") == facts, "status " + str(status))
    status, _ = http("POST", "/api/collections/reader_versions/records", dict(version, page_id="rt73x/p002"), t["rd1"])
    ctx.check("24l a reader cannot write reader_versions", is_denied(status), "status " + str(status))
    for coll, flt in (("own_translations", 'item_id="rt73x"'), ("reader_versions", 'page_id~"rt73x/"')):
        status, data = http("GET", "/api/collections/" + coll + "/records?perPage=50&filter=" + urllib.parse.quote(flt), token=su)
        for item_ in data.get("items", []):
            http("DELETE", "/api/collections/" + coll + "/records/" + item_["id"], token=su)
    http("DELETE", "/api/collections/users/records/" + system["id"], token=su)
    ctx.check("24m the RT73a test records and the test account are removed again", all(http("GET", "/api/collections/" + c + "/records?perPage=1&filter=" + urllib.parse.quote(fl), token=su)[1].get("totalItems") == 0 for c, fl in (("own_translations", 'item_id="rt73x"'), ("reader_versions", 'page_id~"rt73x/"'), ("users", 'name="kendojidai.com"'))), "")


def check_v1_placeholders(ctx):
    """Migration 1793300016 (unit VW104, Q-A 3:44.4, 3:45.2, 3:45.3): the collection v1_placeholders for the v1 placeholder md text of each page.
    The read rule is the rule of reader_pages. Only the superuser writes. The text is made up."""
    su = ctx.su_token
    t = ctx.token
    path = "/api/collections/v1_placeholders/records"
    col = get_collection(ctx, "v1_placeholders") or {}
    fields = {f.get("name"): f for f in col.get("fields", [])}
    ctx.check("25a v1_placeholders is a base collection with slug, n, page_id, md, sha256", col.get("type") == "base" and all(k in fields for k in ("slug", "n", "page_id", "md", "sha256")), "fields " + str(sorted(fields)))
    ctx.check("25b slug, n and page_id are required, n is a whole number from 1, md has max 200000 characters",
              all(fields.get(k, {}).get("required") for k in ("slug", "n", "page_id")) and fields.get("n", {}).get("onlyInt") is True and fields.get("n", {}).get("min") == 1 and fields.get("md", {}).get("max") == 200000, "fields " + str(fields.get("n")) + str(fields.get("md")))
    indexes = " | ".join(col.get("indexes") or []).replace("`", "")
    ctx.check("25c a unique index on (slug, n) and an index on slug", "UNIQUE INDEX" in indexes.upper() and "(slug, n)" in indexes and "(slug)" in indexes, indexes)
    ctx.check("25d the rules equal the rules of reader_pages (read: signed in and approved, translator or admin; write: superuser only)",
              all(col.get(k) == EXPECTED_RULES["v1_placeholders"][k] for k in ("listRule", "viewRule", "createRule", "updateRule", "deleteRule")), "rules differ")
    big = ("---\n" + "あ" * 30 + "。\nA made-up English line that has some length to it.\n这是一个编造的句子。\n") * 700
    status, rec = http("POST", path, {"slug": "vw104x", "n": 1, "page_id": "vw104x/p001", "md": big, "sha256": "a" * 64}, su)
    ctx.check("25e the superuser writes a large made-up md (%d characters)" % len(big), is_ok(status) and rec.get("md") == big, "status " + str(status) + " " + str(rec)[:200])
    rid = rec.get("id", "x")
    status, _ = http("POST", path, {"slug": "vw104x", "n": 2, "page_id": "vw104x/p002", "md": "x" * 200001, "sha256": "b" * 64}, su)
    ctx.check("25f a md over 200,000 characters fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"slug": "vw104x", "n": 1, "page_id": "vw104x/p001", "md": "again", "sha256": "c" * 64}, su)
    ctx.check("25g a second record for the same (slug, n) fails (unique index)", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"slug": "vw104x", "n": 0, "page_id": "vw104x/p000", "md": "zero", "sha256": "d" * 64}, su)
    ctx.check("25h n = 0 fails", is_denied(status), "status " + str(status))
    status, _ = http("POST", path, {"slug": "vw104x", "n": 2, "md": "no page id", "sha256": "e" * 64}, su)
    ctx.check("25i a record with no page_id fails", is_denied(status), "status " + str(status))
    status, data = http("GET", path)
    ctx.check("25j a guest gets no v1_placeholders record", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    status, _ = http("GET", path + "/" + rid)
    ctx.check("25k a guest cannot view a record", is_denied(status), "status " + str(status))
    status, data = http("GET", path, token=t["su1"])
    ctx.check("25l a not approved reader gets no record", is_denied(status) or data.get("totalItems", 1) == 0, "status " + str(status))
    status, _ = http("GET", path + "/" + rid, token=t["su1"])
    ctx.check("25m a not approved reader cannot view a record", is_denied(status), "status " + str(status))
    for who in ("rd1", "rd2", "tr1", "admin1"):
        status, data = http("GET", path + "?filter=" + urllib.parse.quote('slug="vw104x"') + "&fields=n", token=t[who])
        ctx.check("25n " + who + " lists the record with a filter on slug and the field n", is_ok(status) and data.get("totalItems") == 1 and data["items"][0].get("n") == 1, "status " + str(status))
        status, one = http("GET", path + "/" + rid, token=t[who])
        ctx.check("25o " + who + " views the whole md", is_ok(status) and one.get("md") == big, "status " + str(status))
    for who in ("su1", "rd1", "rd2", "tr1", "admin1"):
        s1, _ = http("POST", path, {"slug": "vw104y", "n": 1, "page_id": "vw104y/p001", "md": "x", "sha256": "f" * 64}, t[who])
        s2, _ = http("PATCH", path + "/" + rid, {"md": "changed"}, t[who])
        s3, _ = http("DELETE", path + "/" + rid, token=t[who])
        ctx.check("25p " + who + " cannot create, update or delete (only the superuser)", is_denied(s1) and is_denied(s2) and is_denied(s3), "status " + str((s1, s2, s3)))
    status, one = http("GET", path + "/" + rid, token=su)
    ctx.check("25q the record is whole after the denied writes", is_ok(status) and one.get("md") == big, "status " + str(status))
    http("DELETE", path + "/" + rid, token=su)
    ctx.check("25r the test record is removed again (the collection is empty for the down check)", http("GET", path + "?perPage=1", token=su)[1].get("totalItems") == 0, "")


def count_records(ctx):
    counts = {}
    for name in ("own_translations", "comments", "run_marks", "page_runs", "user_settings"):
        _, data = http("GET", "/api/collections/" + name + "/records?perPage=1", token=ctx.su_token)
        counts[name] = data.get("totalItems")
    return counts


# ---------------------------------------------------------------- restart and down checks

def forget_v2_history(shape_dir):
    """Remove the v2 rows from _migrations so that PocketBase runs the v2 files again."""
    connection = sqlite3.connect(os.path.join(shape_dir, "pb_data", "data.db"))
    try:
        cursor = connection.execute("DELETE FROM _migrations WHERE file LIKE '1793300%'")
        connection.commit()
        return cursor.rowcount
    finally:
        connection.close()


def read_collections_db(shape_dir):
    """Return {name: (rules dict from options and columns)} from data.db. The server must be stopped."""
    connection = sqlite3.connect("file:" + os.path.join(shape_dir, "pb_data", "data.db") + "?mode=ro", uri=True)
    try:
        columns = [row[1] for row in connection.execute("PRAGMA table_info(_collections)")]
        rows = connection.execute("SELECT * FROM _collections").fetchall()
    finally:
        connection.close()
    return [dict(zip(columns, row)) for row in rows]


def users_auth_rule(shape_dir):
    for row in read_collections_db(shape_dir):
        if row["name"] == "users":
            if "authRule" in row:
                return row["authRule"]
            return json.loads(row["options"]).get("authRule")
    return "(users missing)"


def batch_enabled_db(shape_dir):
    """Value of settings.batch.enabled from data.db. The server must be stopped."""
    connection = sqlite3.connect("file:" + os.path.join(shape_dir, "pb_data", "data.db") + "?mode=ro", uri=True)
    try:
        row = connection.execute("SELECT value FROM _params WHERE id = 'settings'").fetchone()
    finally:
        connection.close()
    if not row:
        return None
    value = row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
    return json.loads(value).get("batch", {}).get("enabled")


def run_cli(server, args, answer="y\n"):
    result = subprocess.run([PB_BIN] + args + server.base_args(), input=answer, capture_output=True, text=True, timeout=120)
    return result.returncode, (result.stdout + result.stderr)


def check_restart(ctx, server, shape_dir, counts):
    server.stop()
    try:
        server.start()
        ok, reason = True, ""
    except RuntimeError as err:
        ok, reason = False, str(err)[:200]
    ctx.check("13a restart on the same data gives no error", ok, reason)
    if not ok:
        return
    ctx.su_token = superuser_sign_in(ctx.su_email, ctx.su_pw)
    ctx.check("13a records survive the restart", count_records(ctx) == counts, "counts differ")
    server.stop()
    removed = forget_v2_history(shape_dir)
    ctx.check("13b v2 history rows removed for the test (20 expected, unit VW118 added migration 1793300017, unit VW120 added migration 1793300018, unit VW126 added migration 1793300019)", removed == 20, "removed " + str(removed))
    try:
        server.start()
        ok, reason = True, ""
    except RuntimeError as err:
        ok, reason = False, str(err)[:300]
    ctx.check("13b v2 migrations run again on existing data without error", ok, reason)
    if not ok:
        return
    ctx.su_token = superuser_sign_in(ctx.su_email, ctx.su_pw)
    ctx.check("13b records survive the second run", count_records(ctx) == counts, "counts differ")
    wrong = [n for n, rules in EXPECTED_RULES.items()
             for key, value in rules.items() if (get_collection(ctx, n) or {}).get(key) != value]
    ctx.check("13b rules still equal the v2 strings", not wrong, "differs in " + ", ".join(sorted(set(wrong))))
    log = open(server.log_path, "rb").read().decode("utf-8", "replace")
    exists_lines = len(re.findall(r"v2 migration: collection \w+ exists, left as it is", log))
    ctx.info("13b log lines 'collection ... exists, left as it is': " + str(exists_lines))
    ctx.check("13b the second run reports the 19 existing collections (6 of 1793300001, user_settings, 3 of 1793300007, 2 of 1793300008, reader_opens of 1793300012, book_toc of 1793300013, v1_placeholders of 1793300016, visual_issues of 1793300017, view_links and view_link_opens of 1793300018, dictionary_entries of 1793300019)", exists_lines == 19, "lines " + str(exists_lines))
    approved_lines = len(re.findall(r"v2 migration: field approved exists, data left as it is", log))
    ctx.check("13b the second run reports that the field approved exists and leaves the data (migration 1793300006)", approved_lines == 1, "lines " + str(approved_lines))
    status, data = http("GET", "/api/collections/users/records?filter=" + urllib.parse.quote('email="' + addr("su1") + '"'), token=ctx.su_token)
    ctx.check("13b a sign-up that waits stays not approved after the second run (the migration does not approve new accounts)",
              is_ok(status) and data.get("items") and data["items"][0].get("approved") is False, "status " + str(status))
    dash_lines = len(re.findall(r"v2 migration: field (?:catalog_items\.translated|catalog_items\.placement|reader_pages\.search_ja|reader_pages\.search_en) exists, left as it is", log))
    ctx.check("13b the second run reports that the 4 fields of migration 1793300010 exist (translated, placement, search_ja, search_en) and leaves them", dash_lines == 4, "lines " + str(dash_lines))
    web_lines = len(re.findall(r"v2 migration: field own_translations\.facts exists, left as it is", log))
    ctx.check("13b the second run reports that the field own_translations.facts exists (migration 1793300011) and leaves it", web_lines == 1, "lines " + str(web_lines))
    agree_lines = len(re.findall(r"v2 migration: field agree exists, left as it is", log))
    ctx.check("13b the second run reports that the field agree exists (migration 1793300004)", agree_lines == 1, "lines " + str(agree_lines))


def check_down_up(ctx, server, shape_dir):
    server.stop()
    code, output = run_cli(server, ["migrate", "down", "20"])  # unit VW126: 20 v2 migrations (19 before 1793300019)
    ctx.check("15a migrate down 20 exits with 0", code == 0, "exit " + str(code) + ": " + output.strip()[-300:])
    ctx.check("15q down of migration 1793300011 prints that the field own_translations.facts stays (soft down)", "the field own_translations.facts stays" in output, output.strip()[-300:])
    ctx.check("15o down of migration 1793300010 prints that the 4 fields stay (soft down)", "the fields catalog_items.translated, catalog_items.placement, reader_pages.search_ja, and reader_pages.search_en stay" in output, output.strip()[-300:])
    ctx.check("15g down turns the batch API off", batch_enabled_db(shape_dir) is False, "batch " + repr(batch_enabled_db(shape_dir)))
    ctx.check("15b down sets users authRule to empty", users_auth_rule(shape_dir) == "", "authRule " + repr(users_auth_rule(shape_dir)))
    names = {row["name"] for row in read_collections_db(shape_dir)}
    kept = {"own_translations", "comments", "run_marks", "page_runs", "user_settings"}
    gone = {"catalog_items", "magazine_chapters", "reader_pages", "reader_versions", "page_checks", "reader_bookmarks", "reader_progress", "reader_opens", "v1_placeholders", "visual_issues", "view_links", "view_link_opens", "dictionary_entries"}
    ctx.check("15c down keeps collections with records and drops empty ones",
              kept <= names and not (gone & names), "kept " + str(sorted(kept & names)) + " empty-left " + str(sorted(gone & names)))
    down_runs = next((row for row in read_collections_db(shape_dir) if row["name"] == "page_runs"), {})
    ctx.check("15i down puts back the old page_runs list and view rules (translator or admin)",
              down_runs.get("listRule") == STAFF and down_runs.get("viewRule") == STAFF,
              "listRule " + repr(down_runs.get("listRule")) + " viewRule " + repr(down_runs.get("viewRule")))
    users_row = next((row for row in read_collections_db(shape_dir) if row["name"] == "users"), {})
    ctx.check("15m down sets the users create rule back to null and keeps the field approved (migration 1793300006, soft down)",
              users_row.get("createRule") is None and any(f.get("name") == "approved" for f in json.loads(users_row.get("fields") or "[]")),
              "createRule " + repr(users_row.get("createRule")))
    own = next((row for row in read_collections_db(shape_dir) if row["name"] == "own_translations"), {})
    ctx.check("15k down keeps the field agree of own_translations (migration 1793300004, soft down)",
              any(f.get("name") == "agree" for f in json.loads(own.get("fields") or "[]")), "fields missing agree")
    code, output = run_cli(server, ["migrate", "up"])
    ctx.check("15d migrate up exits with 0", code == 0, "exit " + str(code) + ": " + output.strip()[-300:])
    ctx.check("15h up turns the batch API on again", batch_enabled_db(shape_dir) is True, "batch " + repr(batch_enabled_db(shape_dir)))
    users_up = next((row for row in read_collections_db(shape_dir) if row["name"] == "users"), {})
    ctx.check("15n up sets the users create rule for the sign-up again", users_up.get("createRule") == EXPECTED_RULES["users"]["createRule"], "createRule " + repr(users_up.get("createRule")))
    ctx.check("15e up sets users authRule again", users_auth_rule(shape_dir) == "disabled = false",
              "authRule " + repr(users_auth_rule(shape_dir)))
    names = {row["name"] for row in read_collections_db(shape_dir)}
    ctx.check("15f up creates the collections again (the reader collections, reader_opens, book_toc, v1_placeholders, visual_issues, view_links, view_link_opens, and dictionary_entries)", set(NEW_COLLECTIONS) <= names, "missing " + str(sorted(set(NEW_COLLECTIONS) - names)))
    up_runs = next((row for row in read_collections_db(shape_dir) if row["name"] == "page_runs"), {})
    ctx.check("15j up sets the page_runs list and view rules to translator or admin (migration 1793300009)",
              up_runs.get("listRule") == STAFF and up_runs.get("viewRule") == STAFF,
              "listRule " + repr(up_runs.get("listRule")) + " viewRule " + repr(up_runs.get("viewRule")))


# ---------------------------------------------------------------- one shape

def run_shape(shape, v1_dir, res):
    print("== shape: " + shape + " ==")
    shape_dir = prepare_shape(shape, v1_dir)
    server = Server(shape_dir, shape)
    ctx = Context(shape, res)
    ctx.su_email, ctx.su_pw = "su@p1-test.local", secrets.token_urlsafe(24)
    try:
        create_superuser(server, ctx.su_email, ctx.su_pw)
        server.start()
        ctx.su_token = superuser_sign_in(ctx.su_email, ctx.su_pw)
        create_users(ctx)
        check_users(ctx)
        check_own_translations(ctx)
        check_batch(ctx)
        check_comments(ctx)
        check_run_marks(ctx)
        check_page_runs(ctx)
        check_catalog(ctx)
        check_schema(ctx, live=(shape == "live-shape"))
        check_long_text(ctx)
        check_user_script(ctx)
        check_agree(ctx)
        check_user_settings(ctx)
        check_reader_pages(ctx)
        check_dashboard_fields(ctx)
        check_web_fields(ctx)
        check_v1_placeholders(ctx)
        counts = count_records(ctx)
        check_restart(ctx, server, shape_dir, counts)
        check_down_up(ctx, server, shape_dir)
    except Exception as err:  # keep going to the cleanup, and count it as a failure
        res.check(shape + " no unexpected error", False, type(err).__name__ + ": " + str(err)[:400])
    finally:
        server.stop()
    return shape_dir


def leftover_processes():
    result = subprocess.run(["pgrep", "-fl", "pocketbase"], capture_output=True, text=True)
    return [line for line in result.stdout.splitlines() if "run-" in line]


def main():
    parser = argparse.ArgumentParser(description="Throwaway test of the v2 PocketBase migrations.")
    parser.add_argument("--v1-migrations", help="folder with the v1 migration files (read only, copied)")
    parser.add_argument("--keep", action="store_true", help="keep the temp folders in " + WORK_ROOT)
    args = parser.parse_args()
    if not os.path.isfile(PB_BIN):
        raise SystemExit("PocketBase binary not found: " + PB_BIN)
    if args.v1_migrations:
        # Refuse a seed path and a missing file before any server starts.
        refuse_seed(args.v1_migrations)
        for name in V1_FILES:
            if not os.path.isfile(os.path.join(args.v1_migrations, name)):
                raise SystemExit("Missing v1 migration file: " + name)
    shapes = ["fresh"] + (["live-shape"] if args.v1_migrations else [])
    res = Results()
    folders = []
    try:
        for shape in shapes:
            folders.append(run_shape(shape, args.v1_migrations, res))
    finally:
        left = leftover_processes()
        res.check("no pocketbase process of this test remains", not left, "; ".join(left))
        if not args.keep:
            for folder in folders:
                shutil.rmtree(folder, ignore_errors=True)
    print("Total: " + str(res.passed) + " PASS, " + str(res.failed) + " FAIL")
    return 1 if res.failed else 0


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(1))
    sys.exit(main())
