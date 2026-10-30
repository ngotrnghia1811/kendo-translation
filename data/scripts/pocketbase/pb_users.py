#!/usr/bin/env python3
"""Manage v2 users in a PocketBase server. Python 3 standard library only.

Commands: list, add, set-password, set-role, disable, enable. Unit RC3 (round 66 answer 7): add --role reader and set-role reader set approved true.

Password rules:
  - The superuser password comes only from a getpass prompt.
  - A new user password comes from getpass twice. Both entries must match.
  - No password goes into argv, env, a file, a log or the screen.
  - The superuser token stays in memory only.

The logic lives in functions that take the password as an argument, so the
test script can call them with random passwords. Only `main` calls getpass.
"""

import argparse
import getpass
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_URL = "http://127.0.0.1:8090"
LOCAL_HOSTS = ("127.0.0.1", "localhost")
ROLES = ("admin", "translator", "reader")
USERS_PATH = "/api/collections/users/records"


class PbError(Exception):
    """A clear error message for the person at the terminal."""


def check_url(url):
    """Allow plain http only for the local machine. Return the url without a trailing slash."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise PbError("The URL must start with http:// or https:// and name a host.")
    if parts.scheme == "http" and parts.hostname not in LOCAL_HOSTS:
        raise PbError("Plain http is only allowed for 127.0.0.1 or localhost. Use https:// for " + parts.hostname + ".")
    return url.rstrip("/")


def request(base_url, method, path, body=None, token=None):
    """Send one JSON request. Return the decoded JSON body. Never put the body into an error."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = token
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=headers)
    context = ssl.create_default_context() if base_url.startswith("https://") else None
    try:
        with urllib.request.urlopen(req, timeout=30, context=context) as response:
            raw = response.read()
    except urllib.error.HTTPError as err:
        raise PbError(describe_http_error(err)) from None
    except urllib.error.URLError as err:
        raise PbError("Cannot reach " + base_url + ": " + str(err.reason)) from None
    return json.loads(raw) if raw else {}


def describe_http_error(err):
    """Build a short message from the status and the PocketBase message. Skip the request body."""
    message = ""
    try:
        payload = json.loads(err.read())
        message = str(payload.get("message", ""))
        for field, info in (payload.get("data") or {}).items():
            message += " [" + str(field) + ": " + str(info.get("message", "")) + "]"
    except (ValueError, AttributeError):
        pass
    return "HTTP " + str(err.code) + " " + message.strip()


def superuser_token(base_url, email, password):
    """Sign in as superuser. Return the token. Raise a clear error if sign-in fails."""
    try:
        result = request(base_url, "POST", "/api/collections/_superusers/auth-with-password",
                         {"identity": email, "password": password})
    except PbError as err:
        raise PbError("Superuser sign-in failed for " + email + ": " + str(err)) from None
    return result["token"]


def find_user(base_url, token, email):
    """Return the user record for an email, or raise."""
    flt = 'email = "' + email.replace("\\", "\\\\").replace('"', '\\"') + '"'
    query = urllib.parse.urlencode({"filter": flt, "perPage": 1})
    items = request(base_url, "GET", USERS_PATH + "?" + query, token=token).get("items", [])
    if not items:
        raise PbError("No user with email " + email + ".")
    return items[0]


def list_users(base_url, token):
    """Return all users, oldest first."""
    users, page = [], 1
    while True:
        query = urllib.parse.urlencode({"page": page, "perPage": 200, "sort": "created"})
        result = request(base_url, "GET", USERS_PATH + "?" + query, token=token)
        users.extend(result.get("items", []))
        if page >= result.get("totalPages", 1):
            return users
        page += 1


def add_user(base_url, token, email, role, password, name=""):
    """Create a verified user. The password is an argument and is never printed."""
    check_role(role)
    body = {"email": email, "password": password, "passwordConfirm": password,
            "verified": True, "emailVisibility": True, "role": role, "disabled": False}
    if role == "reader":  # unit RC3: the superuser names this reader, so no admin step is needed
        body["approved"] = True
    if name:
        body["name"] = name
    return request(base_url, "POST", USERS_PATH, body, token)


def update_user(base_url, token, email, changes):
    """PATCH the user that has this email."""
    user = find_user(base_url, token, email)
    return request(base_url, "PATCH", USERS_PATH + "/" + user["id"], changes, token)


def set_password(base_url, token, email, password):
    return update_user(base_url, token, email, {"password": password, "passwordConfirm": password})


def set_role(base_url, token, email, role):
    check_role(role)
    return update_user(base_url, token, email, {"role": role, "approved": True} if role == "reader" else {"role": role})  # unit RC3: reader also approves


def set_disabled(base_url, token, email, disabled):
    return update_user(base_url, token, email, {"disabled": bool(disabled)})


def check_role(role):
    if role not in ROLES:
        raise PbError("Role must be one of: " + ", ".join(ROLES) + ".")


def format_users(users):
    """Return text lines: email, role, approved, disabled, verified, created. No password, no token."""
    lines = ["email\trole\tapproved\tdisabled\tverified\tcreated"]
    for user in users:
        lines.append("\t".join(str(user.get(key, "")) for key in ("email", "role", "approved", "disabled", "verified", "created")))
    return "\n".join(lines)


def build_parser():
    parser = argparse.ArgumentParser(description="Manage v2 users in PocketBase.")
    parser.add_argument("--url", default=DEFAULT_URL, help="PocketBase URL (default " + DEFAULT_URL + ")")
    parser.add_argument("--superuser", default=os.environ.get("PB_SUPERUSER_EMAIL"),
                        help="superuser email (or env PB_SUPERUSER_EMAIL)")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list", help="list users")
    add = sub.add_parser("add", help="create a verified user (a reader is approved at once)")
    add.add_argument("email")
    add.add_argument("--role", required=True, choices=ROLES)
    add.add_argument("--name", default="")
    pw = sub.add_parser("set-password", help="set a new password for a user")
    pw.add_argument("email")
    role = sub.add_parser("set-role", help="change the role of a user (the role reader also approves the user)")
    role.add_argument("email")
    role.add_argument("role", choices=ROLES)
    for name, text in (("disable", "block sign-in for a user"), ("enable", "allow sign-in for a user")):
        sub.add_parser(name, help=text).add_argument("email")
    return parser


def ask_new_password():
    first = getpass.getpass("New user password: ")
    second = getpass.getpass("New user password again: ")
    if first != second:
        raise PbError("The two passwords differ.")
    if len(first) < 8:
        raise PbError("The password needs at least 8 characters.")
    return first


def run(args):
    base_url = check_url(args.url)
    if not args.superuser:
        raise PbError("Give the superuser email with --superuser or env PB_SUPERUSER_EMAIL.")
    new_password = None
    if args.command in ("add", "set-password"):
        new_password = ask_new_password()
    token = superuser_token(base_url, args.superuser, getpass.getpass("Superuser password: "))
    if args.command == "list":
        print(format_users(list_users(base_url, token)))
    elif args.command == "add":
        add_user(base_url, token, args.email, args.role, new_password, args.name)
        print("Added " + args.email + " with role " + args.role + "." + (" The reader is approved." if args.role == "reader" else ""))
    elif args.command == "set-password":
        set_password(base_url, token, args.email, new_password)
        print("Password changed for " + args.email + ".")
    elif args.command == "set-role":
        set_role(base_url, token, args.email, args.role)
        print("Role of " + args.email + " is now " + args.role + "." + (" The reader is approved." if args.role == "reader" else ""))
    elif args.command in ("disable", "enable"):
        set_disabled(base_url, token, args.email, args.command == "disable")
        print(args.command.capitalize() + "d " + args.email + ".")


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        run(args)
    except PbError as err:
        print("Error: " + str(err), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Stopped.", file=sys.stderr)
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
