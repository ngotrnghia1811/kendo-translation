# Local PocketBase for the v2 viewer

This folder holds the tracked source files for the v2 PocketBase. The binary and the data are not tracked. They live in `data/pocketbase/`, which Git ignores.

## 1. What each file does

- `pb_migrations/1793300000_v2_users_rules.js` adds the `role` and `disabled` fields to `users`. It sets the v2 rules for `users` and the sign-in rule `disabled = false`.
- `pb_migrations/1793300001_v2_collections.js` creates six collections: `own_translations`, `comments`, `run_marks`, `catalog_items`, `magazine_chapters` and `page_runs`.
- `pb_users.py` lists users, adds users, sets passwords, sets roles, and disables or enables users.
- `test_local.py` is a throwaway test. It starts a temp PocketBase on port 8091 and checks every rule. It deletes the temp data at the end.

- `pb_migrations/1793300002_v2_batch.js` turns on the batch API (`POST /api/batch`) with `maxRequests` 200 and `timeout` 10. The Save of the human-translation-view uses it (`app/lib/pb.ts` line 226), so that a page saves all records or none. All three migrations are safe to run twice. Each one adds only what is missing or sets the same values again.

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

Each check prints `PASS` or `FAIL`. The exit code is 1 if one check fails. Add `--keep` to keep the temp folders for a look. Last run on 2026-10-28 at 16:37, shape `fresh`: `Total: 110 PASS, 0 FAIL`. The run took about 3 seconds.

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
