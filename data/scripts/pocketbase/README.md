# Local PocketBase for the v2 viewer

This folder holds the tracked source files for the v2 PocketBase. The binary and the data are not tracked. They live in `data/pocketbase/`, which Git ignores.

## 1. What each file does

- `pb_migrations/1793300000_v2_users_rules.js` adds the `role` and `disabled` fields to `users`. It sets the v2 rules for `users` and the sign-in rule `disabled = false`.
- `pb_migrations/1793300001_v2_collections.js` creates six collections: `own_translations`, `comments`, `run_marks`, `catalog_items`, `magazine_chapters` and `page_runs`.
- `pb_users.py` lists users, adds users, sets passwords, sets roles, and disables or enables users. A reader that it adds or sets gets `approved` true (unit RC3).
- `test_local.py` is a throwaway test. It starts a temp PocketBase on port 8091 and checks every rule. It deletes the temp data at the end.

- `pb_migrations/1793300002_v2_batch.js` turns on the batch API (`POST /api/batch`) with `maxRequests` 200 and `timeout` 10. The Save of the human-translation-view uses it (`app/lib/pb.ts` line 226), so that a page saves all records or none. All six migrations are safe to run twice (see sections 7 and 8). Each one adds only what is missing or sets the same values again.

## 2. Local server

The local server already exists. Unit P2 created it on 2026-10-28. See section 5 at the end for the accounts. Run every command from the folder that the step names. The repository root is `kendo-translation-viewer`.

1. The binary is already in `data/pocketbase/pocketbase`. Do not download it again.
2. Open a terminal in `data/pocketbase/`:

   ```
   cd data/pocketbase
   ```

3. If the server does not run, start it in the background. Run this command in `data/pocketbase/`:

   ```
   nohup ./pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data --migrationsDir=../scripts/pocketbase/pb_migrations --automigrate=false > ./pb.log 2>&1 &
   ```

4. The server writes its output to `pb.log` in the same folder. Do not print `pb.log`. It once held a one-time installer link.
5. A server that started before a new migration file existed does not apply that file. Stop the server and start it again once.
6. After a restart of the Mac, the server does not start by itself. Run the command in step 3 by hand.
7. Open a second terminal in the repository root. Make sure that the server runs. The answer holds code 200:

   ```
   curl -s http://127.0.0.1:8090/api/health
   ```

8. To find the process id (PID) of the server, run:

   ```
   pgrep -fl 'pocketbase serve'
   ```

9. To stop the server, run this command. Replace `PID` with the number from step 8:

   ```
   kill PID
   ```

10. On a new machine, create the superuser with this command in `data/pocketbase/`. Replace `EMAIL` and `PASSWORD`:

    ```
    ./pocketbase superuser upsert EMAIL PASSWORD --dir=./pb_data --migrationsDir=../scripts/pocketbase/pb_migrations
    ```

11. Make sure that the four users exist. Run this command in the repository root:

    ```
    python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL list
    ```

Replace `SUPERUSER_EMAIL` with `superuser@kendo-translation.local`. You can also set the environment variable `PB_SUPERUSER_EMAIL` and drop the `--superuser` option.

The script never takes a password from the command line or from the environment. It never prints a password or a token.

Other commands:

```
python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL set-password EMAIL
python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL set-role EMAIL admin|translator|reader
python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL disable EMAIL
python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL enable EMAIL
```

A disabled user cannot sign in. A token that the user got before the disable stays valid until it expires. The token cannot be refreshed.

The script uses `http://127.0.0.1:8090` by default. For any other host, the script requires `https://`. Use the `--url` option to name the host.

## 3. How to run the test

Run the test from the repository root. The test uses port 8091 and needs it free. Never set `PORT` in `test_local.py` to 8090. The local server uses 8090.

Shape `fresh` applies only the v2 migrations to a new PocketBase:

```
python3 -B data/scripts/pocketbase/test_local.py
```

Shape `live-shape` is optional. The deploy does not need it. It applies the v1 migrations first and then the v2 migrations. Give the folder of the v1 migrations. The test copies seven files from that folder and never prints them. It never uses the seed file.

```
python3 -B data/scripts/pocketbase/test_local.py --v1-migrations ../kendo-translation-viewer-v1/migration/pocketbase/pb_migrations
```

Each check prints `PASS` or `FAIL`. The exit code is 1 if one check fails. Add `--keep` to keep the temp folders for a look. Last run on 2026-10-28 at 20:04, shape `fresh`: `Total: 120 PASS, 0 FAIL`. The run took about 3 seconds.

## 4. Live server note

Nothing in this folder touches the v1 live server. The v2 deploy gets its own new PocketBase with only the v2 migrations. The owner chose this on 2026-10-28. The plan names the same Oracle server and the host `v2.kendotranslation.com`. The deploy steps are a later unit.

## 5. Local accounts

The local server holds one superuser and four users. Unit P2 created them on 2026-10-28.

- The superuser is `superuser@kendo-translation.local`.
- `admin@kendo-translation.local` has the role `admin`.
- `translator@kendo-translation.local` has the role `translator`.
- `reader@kendo-translation.local` has the role `reader`.
- `wenqian@kendo-translation.local` has the role `translator`.

The passwords are random. They sit only in `data/pocketbase/local-accounts.txt`. The file has mode 600 and Git ignores it.

Do not commit `local-accounts.txt`. The file holds passwords.

Do not print `local-accounts.txt` in a log, a chat or a report. The file holds passwords.

To change a password, run this command in the repository root. The script asks for the superuser password and then for the new password. Read the superuser password in your own editor.

```
python3 -B data/scripts/pocketbase/pb_users.py --superuser superuser@kendo-translation.local set-password EMAIL
```

Do not use a password that you need later in the `superuser upsert` command. The shell history keeps the command line.

## 6. Not verified

The installer link form `http://127.0.0.1:8090/_/#/pbinstal/...` was never verified. Use `superuser upsert` from step 10 instead.

## 7. Migration 1793300003 and the S2 upload

- `pb_migrations/1793300003_v2_page_runs_columns.js` adds the text fields `started_utc` and `status` to `page_runs`, only if they are missing.
- The migration sets the list rule and the view rule of `page_runs` to `@request.auth.id != ""`. Every signed-in user can read the records, a reader too. Create, update, and delete stay with the superuser.
- The down function puts back the old rules (translator or admin). It keeps the fields and all data.
- A server that started before this file existed must restart once. Run the commands of section 2, steps 8, 9, and 3.
- Start the server in a normal terminal. A server that a tool shell started can stop when that shell ends.
- The sync command S2 fills `page_runs`. See the section Sync command S2 in `app/README.md`.
- The test `test_local.py` checks the six migrations. It removes 6 history rows in check 13b and runs `migrate down 6` in check 15a.

## 8. Migrations 1793300004 and 1793300005 (unit UXC, round 59)

- `pb_migrations/1793300004_v2_own_translations_agree.js` adds the bool field `agree` to `own_translations`, only if it is missing. The rules do not change. A ticked row has `agree` true and an empty `text`. An old record reads as `agree` false. The down function keeps the field and the data.
- `pb_migrations/1793300005_v2_user_settings.js` creates the collection `user_settings`, only if it does not exist. It holds one record for each user: `user` (relation, required, unique), `theme` (`light` or `dark`), and `panes` (JSON, 20000 bytes at most).
- A user reads and changes the own record only. The create rule has no role limit, so a reader keeps settings too. Nobody deletes a record with a user token. The down function deletes the collection only when it holds 0 records.
- A server that started before these files existed must restart once. Start it in a normal terminal or with Python `subprocess.Popen(..., start_new_session=True)`. A `nohup ... &` command from a tool shell can stop when the shell ends.
- The test `test_local.py` has the new checks 17 (the field `agree`) and 18 (the rules of `user_settings`). The checks 13b, 15a, 15c, and 15k cover the second run and the down function of both migrations.
- The env variable `PB_TEST_WORK_ROOT` sets the work folder of the test. The default is the folder of unit P1. Run: `PB_TEST_WORK_ROOT=/some/folder python3 -B data/scripts/pocketbase/test_local.py`
- The last run of unit UXC gave `Total: 151 PASS, 0 FAIL`.
- The sync command S2 now also fills `magazine_chapters` with the 103 month chapters. See the section Book screen in `app/README.md`.
- Round 61 (unit UXC2): no new migration. The column `panes` of `user_settings` also holds the key `ui` (view, book index state, TL_3 panel state). The shape is in `docs/VISION-viewer.md` section 15.18.3. `test_local.py` gave `Total: 151 PASS, 0 FAIL`.
- Round 61 (unit UXC2): S2 now fills `catalog_items` with 37 rows (36 book folders and the web article). See `app/README.md`.

## 9. Migrations 1793300006 to 1793300009 (unit RC1, round 63)

Reader pages. Owner answers 3, 4, 5, 6, and 7 of round 63. Every file creates only what is missing, is safe to run twice, and has a down function.

- `1793300006_v2_users_approved.js` adds the bool field `approved` to `users`. A new field gets true for all existing users. A second run never approves a sign-up.
- Create rule of `users`: `@request.body.role = "reader" && @request.body.disabled:isset = false && (@request.body.approved:isset = false || @request.body.approved = false)`.
- Update rule of `users`: the first branch also needs `@request.body.approved:isset = false`. An admin can still change any record.
- List and view rule of `users`: `@request.auth.id != "" && (id = @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "translator")`.
- Down: the create rule goes back to null. The field, the data, and the stricter update, list, and view rules stay.
- `1793300007_v2_reader_collections.js` creates `reader_pages`, `reader_versions`, and `page_checks`.
- `reader_pages`: list and view for READ_OK. No other rule (only the superuser writes, that is S2). One record for each `page_id` (unique).
- `reader_versions`: list and view for READ_OK. Create, update, and delete for the admin. One record for each `page_id` (unique).
- `page_checks`: list and view for every signed-in user. Create, update, and delete for the admin. One record for each `page_id` (unique).
- READ_OK is `@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")`.
- `1793300008_v2_reader_user_data.js` creates `reader_bookmarks` (list, view, create, delete) and `reader_progress` (list, view, create, update) for own records only, with READ_OK.
- The names differ from `bookmarks` and `reading_progress`. The live server holds v1 collections with those names, and "create only if absent" would skip the v2 files.
- `1793300009_v2_reader_rules.js` sets the list and view rule of `page_runs` to `@request.auth.role = "translator" || @request.auth.role = "admin"`. It adds the theme names `sepia`, `solarized-light`, and `solarized-dark` to `user_settings.theme`.
- Down of 1793300009: `page_runs` goes back to every signed-in user (the state of 1793300003). The theme values stay.
- A server that started before these files existed must restart once. Start it in a normal terminal or with Python `subprocess.Popen(..., start_new_session=True)`.
- `pb_users.py` makes a reader with `approved` true since unit RC3 (round 66 answer 7). A translator and an admin read anyway (READ_OK). A reader who signs up on the web page waits for an admin on `/admin/readers`.
- The test `test_local.py` checked ten migrations in unit RC1. Unit RC4 added an eleventh: check 13b removes 11 history rows and check 15a runs `migrate down 11`. The checks 19 to 22 cover the sign-up rule, the approval, the closed `page_runs`, and the reader collections. Checks 10d2 and 10d3 changed: a reader no longer reads `page_runs`.
- The last run of unit RC1 gave `Total: 219 PASS, 0 FAIL` (shape fresh). The live shape was not run.

## Hook for page images (unit RC2, round 65)

The file `pb_hooks/page_images.pb.js` serves the page images of the reader pages with a signed short link. Design: `docs/VISION-viewer.md` section 15.21.

- Route: `GET /page-images/{slug}/{file}?exp=<seconds>&sig=<hex>`. Example file: `p048.webp`.
- The signature is the lower-case hex HMAC-SHA256 of the text `<slug>/<file>:<exp>` with the key. `exp` must be after now and at most 900 seconds ahead.
- The Next app makes the link after it checks the sign-in of the reader. See `app/README.md`, section Page images.

### Server settings

| Variable (environment of the PocketBase process) | Meaning |
|---|---|
| `PAGE_IMAGE_KEY` | The signing key, at least 32 characters. The same value as `VIEWER_PAGE_IMAGE_KEY` of the app |
| `PAGE_IMAGE_DIR` | Folder of the images, with one subfolder for each book. On the server: `/opt/pocketbase-v2/page-images` |

1. Start PocketBase with the option `--hooksDir=<folder that holds page_images.pb.js>`.
2. Make sure that both variables are set in the environment of the process. PocketBase reads them at each request.
3. Do not write the key in a file of the repository.

### Answers

- 503: the key is missing or has fewer than 32 characters, or the folder is missing. Every request gets 503 then.
- 400: the slug does not match `^[a-z0-9_]+$` or the file does not match `^p\d{3,4}\.webp$`.
- 403: `exp` is not a whole number, is not after now, or is more than 900 seconds ahead. Or the signature is wrong.
- 404: the file does not exist.
- 200: the image, with `Content-Type: image/webp` and `Cache-Control: private, max-age=600`.
- The hook writes nothing to the log. It changes no other route, rule, or collection. It needs no migration.

### Test

- Run: `python3 -B data/scripts/pocketbase/test_page_images.py`
- The test starts its own PocketBase on 127.0.0.1:8092 with a new empty folder. It never uses the live server.
- It makes its own test image and a random key. It checks the answers above, the time limits, the signature, the file names, and the log.
- It also starts a server with no key, a short key, an empty key, no folder, a missing folder, and a file in place of the folder. Each gives 503.
- The last run of unit RC2 gave `Total: 82 PASS, 0 FAIL`.
- The env variable `PB_TEST_BIN` replaces the path of the PocketBase binary.
- JavaScript handlers of PocketBase cannot see variables outside the handler. The hook keeps all helpers inside the handler.

## Unit RC3 notes (round 66)

- `pb_users.py add --role reader` creates the reader with `approved` true. The reader can open the reader pages at once.
- `pb_users.py set-role EMAIL reader` also sets `approved` true. A change to another role leaves `approved` as it is.
- `pb_users.py list` shows the column `approved` after `role`.
- `add` for a translator or an admin leaves `approved` false. A translator and an admin read anyway.
- The script still never prints a password or a token. `test_local.py` checks the new behavior (checks 16f to 16r and 19p).
- The last run of unit RC3 gave `Total: 232 PASS, 0 FAIL` for `test_local.py` (shape `fresh`).

## Unit RC4 notes (round 70): migration 1793300010

The Reader dashboard needs four new fields. Design: `docs/VISION-viewer.md` section 15.23. Owner answers: round 69 answers 7, 9, and 10.

- `1793300010_v2_dashboard_fields.js` adds four fields. `catalog_items.translated` and `catalog_items.placement` are JSON (up to 1 MB). `reader_pages.search_ja` and `reader_pages.search_en` are text (up to 100,000 characters).
- `translated` holds the English pages that readers can read, for example `{"en": [46, 47, 48, 49, 50, 75]}`. Every signed-in user can read it, so a reader that waits for approval sees the progress.
- `placement` holds the web date and the print stamp of a web article (year and month each). Example: `{"web_year": 2025, "web_month": 4, "print_year": 2011, "print_month": 8}`. It is null for a book.
- `search_ja` and `search_en` hold folded text (lowercase, no macron, no hyphen). The search uses the filter `~` on them. The text field default limit is 5,000 characters, so the file sets the limit.
- No rule changes. The list and view rules of `catalog_items` and `reader_pages` stay as they were. A reader that waits for approval gets no page hit, because READ_OK closes `reader_pages`.
- The file adds a field only if it is missing. A second run prints "v2 migration: field catalog_items.translated exists, left as it is" for each field.
- Down (soft): the four fields stay. S2 derives their values again, and a rollback must not drop data.
- Restart PocketBase once so that the file runs. Then run S2 from the app folder: `node scripts/sync-runs.mjs --superuser EMAIL`, then the same command with `--apply`. See the section Reader dashboard in `app/README.md`.
- S2 `--apply` stops with the line "Restart PocketBase so that migration 1793300010 runs." if a field is missing. A dry run goes on with a warning.
- Speed of the filter `~`: the test used 13,278 synthetic `reader_pages` records on a throwaway server. Each had 2,380 characters in `search_en` and 774 in `search_ja`. Each query took 49 to 134 ms with the rule READ_OK. The database file had 62.9 MB.
- `test_local.py` has 25 new checks. They are 23a to 23o (fields, types, limits, rules, filter, clean up), 13b (four "exists" lines on the second run), and 15o (the down line). The last run gave `Total: 257 PASS, 0 FAIL` (shape `fresh`). The test `test_page_images.py` gave `Total: 82 PASS, 0 FAIL`.

### Word and field rename (unit RC4b, round 71)

- Round 70 answer 3, owner words: "`translated` instead of `finished`". Round 70 answer 9, owner choice: "Same wording on year rows (Recommended)".
- The field `catalog_items.translated` replaces `catalog_items.finished`. The file `1793300010_v2_dashboard_fields.js` changed in place, because no long-lived database applied it yet. The other three fields stay.
- A throwaway database that applied the old file keeps its field `finished`. It does not run the file again. Make a new database for it.
- The down line now names `catalog_items.translated`. The second run prints "v2 migration: field catalog_items.translated exists, left as it is".
- `test_local.py` has one new check, 23p (the old field name is gone). The last run gave `Total: 258 PASS, 0 FAIL` (shape `fresh`). The test `test_page_images.py` gave `Total: 82 PASS, 0 FAIL`.

## Unit RT73a notes (round 73): migration 1793300011

- `1793300011_v2_components.js` adds the JSON field `own_translations.facts` (up to 1 MB). It holds the fact marks of the kendojidai.com text of a web article. A row of a translator has no facts.
- The migration adds no collection `reader_v1`. The Viewer reads the v1 md files from a folder on this Mac.
- `reader_versions.chosen_by` stays optional. An empty value means that S2 chose the version by default.
- The migration is safe to run twice. The down function keeps the field.
- S2 creates the disabled account `kendojidai-com@system.invalid` (name "kendojidai.com", role reader, approved false, disabled true) with a random password that nobody sees. The rule `authRule` "disabled = false" refuses its sign-in.
- S2 `--apply` stops with the line "Restart PocketBase so that migration 1793300011 runs." if the field is missing. Restart PocketBase so that it runs the new file.
- `test_local.py` checks 24a to 24m cover the field, the account, and the default choice. The restart check removes 12 history rows. The down check uses `migrate down 12`.

## Migrations 1793300012 and 1793300013 (units RT74 and VW77e)

- `1793300012_v2_reader_opens.js` creates `reader_opens`: one record for each run of one book that the admin opened with "Open to readers". S2 shows Agent text only for these runs. Only the admin and the superuser read or write it.
- `1793300013_v2_book_toc.js` creates `book_toc`: one record for each table of contents row of one book. S2 loads it from `<Translator data>/item-metadata/book-toc.jsonl` (23 books, 1,181 rows). The Reader dashboard `/read` shows the rows in the fold of each book.

## Sign-up rate limit: migrations 1793300014 and 1793300015 and the hook `sign_up_key.pb.js` (units VW101 and VW102)

- `1793300014_v2_rate_limits.js` turns on the rate limiter with one rule: `users:create`, all requests, at most 5 in 3600 s for one address. It removes the 4 default rules. Superusers are never limited. The down function turns the limiter off and puts back the defaults.
- `1793300015_v2_sign_up_address.js` makes PocketBase take the client address from the header `X-Kendo-Client-IP`. The website sends the reader address in it.
- `pb_hooks/sign_up_key.pb.js` refuses a create in `users` without the header `X-Kendo-Sign-Up-Key` equal to the environment variable `SIGN_UP_KEY` (at least 32 characters). A superuser passes. A missing or short `SIGN_UP_KEY` refuses every public sign-up (fail closed).
- Copy the migration and the hook to the server together. Start PocketBase with `--hooksDir` (hand-steps sections 8.5, 8.5a and 8.6).
- `test_local.py` covers all 16 files: 274 PASS, 0 FAIL (unit VW102 on port 8092). Each test sign-up sends its own made-up address, so the limit does not stop the test.

## Visual issues: migration 1793300017 (unit VW118, plan item P53, Q-A 3:98.5 and 3:99.5)

- `1793300017_v2_visual_issues.js` makes the collection `visual_issues`. Each record is one issue that a translator or an admin sends with the visual-issue tool (a picture of a part of a screen, a comment, the page address, the screen width, the theme, the state `open` or `resolved`, and a note).
- Rules: a signed-in translator or admin creates an issue for the own user with the state `open`. An admin sees all issues. A translator sees the own issues. A reader sees none. Only an admin updates or deletes.
- The picture field holds one PNG of at most 5 MB. It is protected, so a file address needs a short-lived file token of a user who can view the record.
- The migration creates the collection only if it is absent. The down function deletes it only if it has 0 records.
- `test_visual_issues.py` checks the rules, the limits, and the migration on a throwaway PocketBase on port 8092 (standard library only, `TMPDIR` and `PB_BIN` set): 71 PASS, 0 FAIL. `test_local.py` now covers all 18 files: 304 PASS, 0 FAIL.
- Copy the migration to the v2 server only after a backup and an owner pick in a destructive question (Q-A 3:99.5 row 6). The local PocketBase on port 8090 gets it at the commit.
