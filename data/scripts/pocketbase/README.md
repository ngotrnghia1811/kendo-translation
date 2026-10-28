# Local PocketBase for the v2 viewer

This folder holds the tracked source files for the v2 PocketBase. The binary and the data are not tracked. They live in `data/pocketbase/`, which Git ignores.

## 1. What each file does

- `pb_migrations/1793300000_v2_users_rules.js` adds the `role` and `disabled` fields to `users`. It sets the v2 rules for `users`.
- `pb_migrations/1793300001_v2_collections.js` creates six collections: `own_translations`, `comments`, `run_marks`, `catalog_items`, `magazine_chapters` and `page_runs`.
- `pb_users.py` lists users, adds users, sets passwords, sets roles, and disables or enables users.
- `test_local.py` is a throwaway test. It starts a temp PocketBase on port 8091 and checks every rule. It deletes the temp data at the end.

The migrations are safe to run twice. They add a field only if it is missing. They create a collection only if it is missing.

## 2. Owner first start

Run every command from the folder that the step names. The repository root is `kendo-translation-viewer`.

1. The binary is already in `data/pocketbase/pocketbase`. Do not download it again.
2. Open a terminal in `data/pocketbase/`:

   ```
   cd data/pocketbase
   ```

3. Start the server:

   ```
   ./pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data --migrationsDir=../scripts/pocketbase/pb_migrations --automigrate=false
   ```

4. Find the installer link in the terminal output. The link has the form `http://127.0.0.1:8090/_/#/pbinstal/...`.
5. Open the link in a browser. Create the superuser. Choose the password yourself.
6. Open a second terminal in the repository root.
7. Add the admin user. The script asks for the superuser password and then for the new password:

   ```
   python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL add admin@kendo-translation.local --role admin
   ```

8. Add the translator user:

   ```
   python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL add translator@kendo-translation.local --role translator
   ```

9. Add the reader user:

   ```
   python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL add reader@kendo-translation.local --role reader
   ```

10. Add the user for wenqian. This user is a translator:

    ```
    python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL add wenqian@kendo-translation.local --role translator
    ```

11. Make sure that the four users exist:

    ```
    python3 -B data/scripts/pocketbase/pb_users.py --superuser SUPERUSER_EMAIL list
    ```

Replace `SUPERUSER_EMAIL` with the email that you chose in step 5. You can also set the environment variable `PB_SUPERUSER_EMAIL` and drop the `--superuser` option.

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

Run the test from the repository root. The test needs port 8091 to be free.

Shape `fresh` applies only the v2 migrations to a new PocketBase:

```
python3 -B data/scripts/pocketbase/test_local.py
```

Shape `live-shape` applies the v1 migrations first, as on the live server, and then the v2 migrations. Give the folder of the v1 migrations. The test copies seven files from that folder and never prints them. It never uses the seed file.

```
python3 -B data/scripts/pocketbase/test_local.py --v1-migrations ../kendo-translation-viewer-v1/migration/pocketbase/pb_migrations
```

Each check prints `PASS` or `FAIL`. The exit code is 1 if one check fails. Add `--keep` to keep the temp folders for a look.

## 4. Live server note

Nothing in this folder touches the live server. The v2 migrations go into the live migrations folder in a later deploy unit. Make a backup of the live `pb_data` first.
