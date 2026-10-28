#!/usr/bin/env python3
"""Throwaway test for the v2 PocketBase migrations. Python 3 standard library only.

Usage:
  python3 -B data/scripts/pocketbase/test_local.py [--v1-migrations PATH] [--keep]

Shapes:
  fresh       only the v2 migrations on a new PocketBase
  live-shape  the v1 migrations (without the seed file) first, then the v2 migrations.
              This runs only if --v1-migrations is given.

The test uses 127.0.0.1:8091 only. It never contacts the live server.
Every temp folder lives in WORK_ROOT. The test deletes it at the end unless --keep is set.
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
WORK_ROOT = "/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r53/P1"
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
# Expected rules, written again here on purpose so that the test does not trust the migration file.
EXPECTED_RULES = {
    "users": {
        "listRule": SIGNED, "viewRule": SIGNED, "createRule": None,
        "updateRule": '(id = @request.auth.id && @request.body.role:isset = false && '
                      '@request.body.disabled:isset = false) || @request.auth.role = "admin"',
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
    "catalog_items": {"listRule": SIGNED, "viewRule": SIGNED, "createRule": None, "updateRule": None, "deleteRule": None},
    "magazine_chapters": {"listRule": SIGNED, "viewRule": SIGNED, "createRule": None, "updateRule": None, "deleteRule": None},
    "page_runs": {"listRule": STAFF, "viewRule": STAFF, "createRule": None, "updateRule": None, "deleteRule": None},
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

def http(method, path, body=None, token=None):
    """Return (status, decoded JSON). Never raise on a 4xx or 5xx status."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
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
    status, _ = http("POST", "/api/collections/users/records", stranger)
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
    status, data = http("GET", path, token=t["rd1"])
    ctx.check("10a rd1 list of page_runs fails or is empty", is_denied(status) or data.get("totalItems", 1) == 0,
              "status " + str(status))
    snapshot = snapshot_of(200 * 1024)
    body = {"page_id": "kendojidai_2014/p0839", "item_id": "kendojidai_2014", "run_id": "run-1", "verdict": "PASS",
            "qa3_page_score": 0.9, "finished": "2026-10-28 10:00:00.000Z", "snapshot": snapshot}
    status, record = http("POST", path, body, ctx.su_token)
    ctx.check("10b superuser creates page run with 200 KB snapshot", is_ok(status), "status " + str(status))
    status, back = http("GET", path + "/" + record.get("id", "x"), token=t["tr1"])
    ctx.check("10c tr1 reads the snapshot back with the same content", is_ok(status) and back.get("snapshot") == snapshot,
              "status " + str(status))
    ctx.check("10d snapshot size matches", len(json.dumps(back.get("snapshot"))) == len(json.dumps(snapshot)), "size differs")
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


def count_records(ctx):
    counts = {}
    for name in ("own_translations", "comments", "run_marks", "page_runs"):
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
    ctx.check("13b v2 history rows removed for the test (3 expected)", removed == 3, "removed " + str(removed))
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
    ctx.check("13b the second run reports the 6 existing collections", exists_lines == 6, "lines " + str(exists_lines))


def check_down_up(ctx, server, shape_dir):
    server.stop()
    code, output = run_cli(server, ["migrate", "down", "3"])
    ctx.check("15a migrate down 3 exits with 0", code == 0, "exit " + str(code) + ": " + output.strip()[-300:])
    ctx.check("15g down turns the batch API off", batch_enabled_db(shape_dir) is False, "batch " + repr(batch_enabled_db(shape_dir)))
    ctx.check("15b down sets users authRule to empty", users_auth_rule(shape_dir) == "", "authRule " + repr(users_auth_rule(shape_dir)))
    names = {row["name"] for row in read_collections_db(shape_dir)}
    kept = {"own_translations", "comments", "run_marks", "page_runs"}
    gone = {"catalog_items", "magazine_chapters"}
    ctx.check("15c down keeps collections with records and drops empty ones",
              kept <= names and not (gone & names), "kept " + str(sorted(kept & names)) + " empty-left " + str(sorted(gone & names)))
    code, output = run_cli(server, ["migrate", "up"])
    ctx.check("15d migrate up exits with 0", code == 0, "exit " + str(code) + ": " + output.strip()[-300:])
    ctx.check("15h up turns the batch API on again", batch_enabled_db(shape_dir) is True, "batch " + repr(batch_enabled_db(shape_dir)))
    ctx.check("15e up sets users authRule again", users_auth_rule(shape_dir) == "disabled = false",
              "authRule " + repr(users_auth_rule(shape_dir)))
    names = {row["name"] for row in read_collections_db(shape_dir)}
    ctx.check("15f up creates the 6 collections again", set(NEW_COLLECTIONS) <= names, "missing " + str(sorted(set(NEW_COLLECTIONS) - names)))


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
