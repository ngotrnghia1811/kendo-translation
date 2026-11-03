# Viewer app

This is the Viewer of the kendo translation project. It reads Translator run data and item metadata from files on disk. The Viewer docs decide two views, the human-translation-view and the agent-translation-monitor, and both views exist now. The human-translation-view needs a PocketBase server (see the section Human-translation-view at the end).

## Requirements

- Node.js 20.9.0 or newer. The file `package.json` sets no Node version. Next.js 16.4.3 sets this minimum.
- A Translator `data` folder on the same computer (see Configuration).

## Start

1. Go to the app folder: `cd app`
2. Install the packages (first time only): `npm install`
3. Start the development server: `npm run dev`
4. Open http://localhost:3000 in a browser.
5. Stop the server with Ctrl-C.

If the terminal says that another dev server already runs for this folder, open the address that it prints.

## Production

1. Build the app: `npm run build`
2. Start the server: `npm run start`
3. Open the address that the terminal prints.

Use `npm run build && npm run start` to do both steps in one line.

## Smoke test

The script `scripts/smoke.mjs` tests the built app. It starts `next start` on a free port at 127.0.0.1, sends requests, and stops the server. Round 49 answer 8 (Q-A 2026-10-28 l11) set the copy method below.

Never run `npm run build` or the smoke script in the app folder while `npm run dev` runs there. The build and the dev server both write the folder `.next`. Work in a copy.

1. Copy the app folder. On macOS use an APFS clone: `cp -cR app /tmp/app-copy`
2. Delete the folder `.next` in the copy only.
3. Go to the copy: `cd /tmp/app-copy`
4. Build the copy: `npm run build`
5. Run the checks: `node scripts/smoke.mjs smoke`

The copy reads the `data` folder that `viewer.config.json` names. A relative path in the file counts from the folder where you start the script. The script writes `smoke-output.json` in that folder.

Mode `smoke` sends GET requests only. It is safe for the real `data` folder. Each check prints PASS, FAIL, or SKIP. A SKIP names its reason and does not count as a failure. The exit code is 1 if one check fails.

The checks of mode `smoke`:

- Lists page (`/runs`) and run view of the pilot list `20261026T182511Z` (22 pages, state "completed with failures").
- Run API and all 22 page views, with the QA_3 verdict of each page.
- Page view: ED_3 text, JA text, the 8 cell names, and no Reasoning text before the owner asks.
- The 6 extra items, the page image, and the path tests (`../`, absolute paths, bad list names).
- Books page: the groups Books and Articles, a size under 500 KB, the keys `hasMeta` and `chapterCount`, and no chapter rows.
- Books API `/api/books/<id>`: 13 chapters for `kendojidai_2014`, the key `webLink` on each article, status 403 for a bad name, status 404 for an unknown item.
- Memory API and compare API for the pilot list and for the chain list `20261028T023006Z`. The chain list checks read no count, because the run changes the counts. If that list is missing or not readable, the checks print SKIP.
- One check prints SKIP if the data holds no web link for `kendojidai_2014`.

The data decides some checks. A change of the pilot list, the chain list, or the Books data can make a check fail. Update the script then.

Mode `pause` sends POST requests to `/api/pause` and creates and deletes a `PAUSE` file. It needs a fixture. Never run it with the real `data` folder, because a `PAUSE` file pauses a real run.

1. Copy a `data` folder into a fixture folder, so that the fixture holds `data/pilot-run/lists/`.
2. Add the list folders `20261026T182511Z` (completed) and `20261027T000000Z` (state `running`) to the fixture.
3. Write a config file with `translatorDataDir` set to the `data` folder of the fixture.
4. Run: `node scripts/smoke.mjs pause --config FILE --fixture DIR`

Unit TF84 (round 85 answer 20): the check "Run view shows Paused since HH:MM" reads PST (UTC minus 8 hours), because the run view shows PST all year. It passes in any time zone of the Mac. The fixture of `fake_translator.py` holds no list folder `20261027T000000Z`, so step 2 is needed there too (the test harness adds it with `prep_pause.py`).

## Configuration

The file `viewer.config.json` in the app folder holds the settings. It has four keys, `translatorDataDir`, `pocketbaseUrl`, `runSource`, and `monitor`. The last three are optional (see the sections Human-translation-view and Deploy settings (round 58) at the end).

```json
{
  "translatorDataDir": "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data"
}
```

- `translatorDataDir` is the `data` folder of the Translator worktree. The app reads files only inside this folder.
- A relative path counts from the folder where you start the server.
- Change the path if the Translator worktree is in another place.
- To use another settings file, set the environment variable `VIEWER_CONFIG` to the path of that file.

## Screens

The title bar shows agent-translation-monitor and the tabs Monitor dashboard, Lists, Books, and Human translation (see the sections Monitor dashboard and Human-translation-view at the end). The tab Run settings does not exist yet.

- Lists tab (`/runs`, unit VW77a: the old Runs tab, which sat at `/` before): one row for each list folder, newest first. Columns: list, kind, state, pages, calls, failed, flagged, cost (models), cost (listed), started, updated. The table refreshes every 3 seconds while a list has the state `running` or `paused`.
  - The kind column shows `chain` for a list from `run-chain` and `list` for every other list. Below it, the table shows the critic mode and the number of book jobs. A list from before the critic mode shows "critic mode not stored".
- Run page (`/runs/<list>`): click a list name to open it. It shows the totals of the list and one row for each page. Columns: page, kind, state, calls, USD, minutes, QA_3 verdict.
  - The totals also show the list kind, the critic mode (or "not stored"), and the book jobs.
  - The Pause button writes a pause file. The button shows only if the list has the state `running` or `paused`. After a pause, the same button reads Resume.
  - Click a page ID to open the page view.
  - A page that did not run shows the state `skipped` and the line `Skipped:` with the text of `skipped_reason` from `progress.json`.
  - If the page row in `list-summary.json` has the keys `forward_failures` and `critic_failures`, the state cell shows each list apart, in a closed part. An old file has no such keys, so the cell shows nothing.
  - Chain lists only: the section "Chain state per book" is a table of the books. Columns: book, pages, state, accepted pages, memory pairs, critic failures. The state `stopped: ...` shows in red. The page table gets one more column, "Book memory", that shows the `book_memory` key of the page row.
  - Chain lists only: the section "Book translation memory" has one closed line for each book. Open a line to read the pairs of that book, grouped by page. Each pair shows pair ID, part, JA text, EN text, run ID, and written at. The pairs load when you open the line.
  - Compare of critic modes: the page looks for `critic-compare/<name>/compare.json` files that belong to the list. It shows the totals per variant: pages, critiques, critiques by stage (TS, TL, ED, QA), critiques that cite issues, critiques that cite another QA level, calls, failed calls, cost, and seconds. If the compare has more than one variant, a second table shows the pages that every variant covers. A chain list without a compare shows a short note. Another list shows nothing.
- Page view (`/page/<book>/<page>`): the JA text sits next to the EN text of one stage. It opens at the last stage, ED_3.
  - Stage tabs ED_0 to ED_3: each tab shows the QA verdict of its stage.
  - Read and Compare stages: Read shows one stage. Compare stages shows all stages one under the other, and a line that did not change shows "same as ED_k".
  - Show page image and Hide page image: the button is disabled when the page has no image file.
  - QA panel (right side): verdict, page score, cells, issues, and marks of the stage.
    - Each mark shows the ID of the lower issue and the mark value.
    - A `still_in_ed` mark also shows `own issue` with a link to that issue in the same panel. The link works only if the panel lists that issue.
    - The values `still_in_ed` (red) and `not_in_ed` (green) are new. The old values `confirmed` and `false_alarm` and any other value show as plain text.
  - Reasoning button: it shows the explanation text of one box. A box is one cell of the Translator grid, for example ED_3. The text stays hidden until you press the button.
  - Run folder list: it shows when a page has more than one run folder.
  - Header facts of a chain run: "Critic mode" shows the mode from `summary.json`. In session mode it also shows the turns, the sessions, the restarts, and the turn message. An old page reads "not stored". "Book memory" shows the QA_3 verdict and the pairs written. "Critic-only runs" shows the number of `critic-<mode>-<stamp>` subfolders.
  - Extra detail menu: 9 items, all off at start. A tick shows the item below the text. The items are:
    1. Cost and seconds per call. If a reply needed a JSON repair, the row shows `JSON repaired:` and the kind as text. A kind for several repairs shows joined with `+`.
    2. Exact text sent
    3. Dictionary and aligned memory hits
    4. Failed and flagged calls
    5. Program check results. The EN form check shows a count line `follows / breaks / notes` and one label for each term: `follows`, `breaks`, or `note`. A note has its own color. An old file has no `notes` count, so the line shows 0 notes.
    6. Critiques with the note for the next critic
    7. Critique counts against N
    8. Chain inputs. It shows what the four forward boxes of the stage received from the book chain: the previous page, the previous page pair, the book translation memory pairs, and the earlier term marks.
    9. Critic-only runs. It shows the critiques of the command `critic-only`, stored in a `critic-<mode>-<stamp>` subfolder of the run folder.
- Books tab (`/books`): a table of books and magazine years, then a table of web articles that have run folders. Columns: book, title (JA, with EN below), author, publisher, year, confidence, pages, pages with runs. Click a page in the last column to open its page view. The page carries no metadata row. The Details part loads on request, so the page stays small.
  - The tab reads `item-metadata/items.filled.jsonl`. If that file has no rows, it reads `item-metadata/items.draft.jsonl`.
  - The table uses these fields: `title_ja`, `title_en`, `author_ja` (or `author_en` if `author_ja` is empty), `publisher`, `publish_year`, `confidence`, `pages`.
  - Details part: each item has a closed line "Details of <item>". Click it to open all metadata of the item. The part asks the route `/api/books/<item>` once, at the first click. The tab only reads. It writes nothing.
    - The part shows every key of the metadata row in these groups: Main, Text, Check state, Draft fields.
    - Main: `title_ja`, `title_en`, `title_en_source`, `title_alternatives`, `author_ja`, `author_en`, `author_en_source`, `publisher`, `publish_year`, `publish_date_text`, `isbn`, `pages`, `kind`, `folder`.
    - Text: `synopsis`, `synopsis_source`, `notes`.
    - Check state: `status`, `confidence`, `confirmed_by`, `filled_by`, `sources`.
    - Draft fields: `confidence_draft`, `notes_draft`, `hint_secondary`.
    - Other: every key of the row that no group above names.
    - A group key that the row lacks shows "–". An empty value shows "–". A list of texts shows as a list. Other lists and objects, for example `sources`, show as JSON in a closed part.
  - Month chapters: the Details part of a magazine year also lists the chapters of that year from `item-metadata/magazine-chapters.jsonl`.
    - The part shows the book title, then one line for each chapter: chapter title, page range, and number of articles. The front chapter comes first, then the months.
    - Click a chapter to see its articles: order, series, title (JA, with EN below), and page range.
    - The label `draft` marks an EN title with `title_en_status` "draft". The label `guess` marks a page range with `page_guess` true.
    - If the chapter file is absent or empty, the part shows "No chapter file yet.". A bad line in the file is skipped.
  - Web articles: an article row with the key `web_link` shows the title, the score, the status, and the URL of its web article in the column "Web article". A row without the key, or with `null`, shows "–".
    - Below the article table, "Web candidates of this chapter" lists the web rows of `item-metadata/web-magazine-candidates.jsonl` whose key `link` points at the chapter. Each row shows the `link_status` text and a closed list of its candidates, with the score of each.
    - A second closed part lists the web articles that have a candidate in the chapter but no link there. Only the best web match of a web article links to a table of contents entry.
    - An old file has no `link` and no `link_status`. The row then shows "no link_status".

## Data files

The app reads these files. All paths are relative to `translatorDataDir`.

- `pilot-run/lists/<list>/progress.json`: state and page rows of a list.
- `pilot-run/lists/<list>/list.json` and `pilot-run/lists/<list>/PAUSE`: used by the Pause button.
- `pilot-run/<book>_pNNN/<run folder>/summary.json`: status, cost, calls, critique counts of one page run.
- `pilot-run/<book>_pNNN/<run folder>/page/page.json`: page kind and the path of the page image.
- `pilot-run/<book>_pNNN/<run folder>/results/TS_n.json`, `ED_n.json`, `QA_n.json`: stage results, n = 0 to 3.
- For the extra items, the same run folder:
  - `calls.jsonl`
  - `messages/<box>.txt`
  - `lookup/<box>.json` and `lookup/<box>.aligned.json`
  - `failed/*.json`
  - `programs/en_form_check.ED_n.json`, `programs/term_marks.ED_n.json`, `programs/page_structure_check.ED_n.json`
  - `critiques/queue-<box>.jsonl`
- `pilot-sample/book-slugs.json`: the list of books for the Books tab.
- `item-metadata/items.filled.jsonl` and `item-metadata/items.draft.jsonl`: item metadata.
- `item-metadata/magazine-chapters.jsonl`: month chapters and articles of the magazine years (Books tab). An article row can hold `web_link`.
- `item-metadata/web-magazine-candidates.jsonl`: the web articles with their candidate chapters, `link`, and `link_status` (Books tab, Details part).
- Chain lists:
  - `pilot-run/lists/<list>/list.json`: also the keys `kind`, `book_jobs`, `no_critic`, `no_voyage`, `critic_mode`, and the table `chains`.
  - `pilot-run/lists/<list>/list-summary.json`: page rows with `forward_failures`, `critic_failures`, and `book_memory`. The Viewer falls back to its `chains` table if `list.json` has none.
  - `pilot-run/lists/<list>/book-memory/<book>.jsonl`: the book translation memory pairs of one book (Run page).
  - `pilot-run/<book>_pNNN/<run folder>/critic-<mode>-<stamp>/`: output of the command `critic-only` (Extra detail item 9). The Viewer reads `summary.json` and `critiques/queue-<box>.jsonl` there.
  - `critic-compare/<name>/compare.json`: output of `critic_compare.py` (Run page). The compare belongs to a list if the folder name equals the list name, or if one path in `inputs` ends with the list name.

## Not done yet

- Sign-in and roles exist on the human-translation-view only. Every visitor sees every screen of the agent-translation-monitor.
- The human-translation-view is a first version. Its open items are in section 15.13 of `docs/VISION-viewer.md`.
- No screen to approve or undo rubric table changes.
- No other screens. The reader pages of the vision docs do not exist.
- The Viewer cannot start a chain run, a `critic-only` run, or a compare. It reads the files that these commands write.
- No real chain run exists yet. The panels for chain runs were tested only with data from the plan mode.
- The only file write is the pause file. The Pause button creates `PAUSE` in the list folder, and Resume deletes it. The human-translation-view writes to PocketBase only.
- The ticks of the Extra detail menu stay in the browser. They are not saved with an account.

## Where to read more

- `docs/VISION-viewer.md` (in the repository root): the decided vision of the Viewer.
- `docs/drafts/viewer-translator-loop-notes.md` (in the repository root): design notes for the agent-translation-monitor.

## Human-translation-view

The human-translation-view lets a translator write own translations next to the agent text. It sits under the tab Human translation (`/translate`). It needs a PocketBase server for sign-in and for the data. Round 54 (unit H1) built it. The sources are the sections 15.10 to 15.13 of `docs/VISION-viewer.md`.

### Start

1. Start PocketBase as `data/scripts/pocketbase/README.md` says (section 2). The server listens on `http://127.0.0.1:8090`.
2. Make sure that the server loads the migrations `data/scripts/pocketbase/pb_migrations/1793300002_v2_batch.js` and `1793300003_v2_page_runs_columns.js`. The first turns on the batch API. The second adds the run columns of `page_runs`. A server that started before the file existed must restart once.
3. Add the users with `pb_users.py`. The roles are `admin`, `translator`, and `reader`.
4. Start the app (`npm run dev`) and open http://localhost:3000/translate.
5. To use another PocketBase address, add the key `pocketbaseUrl` to `viewer.config.json`. The default is `http://127.0.0.1:8090`.

```json
{
  "translatorDataDir": "/path/to/translator/data",
  "pocketbaseUrl": "http://127.0.0.1:8090"
}
```

### Sign in

- The sign-in page is `/translate/sign-in`. A page of the view sends a visitor who is not signed in to this page.
- The login route sets the cookie `htv_token` (httpOnly, SameSite=Lax, Secure on https only). Page scripts never see the token.
- A token lives 5 days. A page refreshes it when less than 3 days are left.
- Only the human-translation-view needs sign-in. The agent-translation-monitor and its routes stay open.

### Roles

- The admin and the translator write own translations and comments.
- The reader sees the JA text, the ED_3 text, and the TL_3 information panel. The reader sees no own box and no comments.
- The admin can set and clear the run mark of a page. A translator or reader cannot.

### Screens

- List (`/translate`): one row for each book. The list holds the 36 book folders and the web article that has a run (37 rows). A row shows the page count and the count of pages with an agent translation. A run is finished when `summary.json` holds a QA_3 verdict and the files `results/TS_3.json` and `results/ED_3.json` exist.
- Page section of the book screen (`/translate/<book>`, old route `/translate/<book>/<page>` redirects): the shown run is the run that the admin marked. If no run is marked, it is the finished run with the largest `started_utc` in `run.json`.
  - One row for each sentence group (same cut as the book translation memory). A row shows the JA text, the ED_3 text of the shown run, an own box, and a button that copies the ED_3 text into the box. A row with no ED_3 text shows a note.
  - Save writes every row, empty rows included, as one saved version. All records of one Save get the same version number. A failed Save writes no row.
  - Version history: a table of saved versions with the time and the run ID. A button loads an older version into the boxes. A new Save keeps it as a new version.
  - A saved text from another run than the shown run gets a notice on its row. The notice shows on every run difference and compares no text.
  - The box "Saved for lines that this run cuts in another way" shows saved texts and comments whose group key has no row in the shown run.
  - Comments: each row has a comment list. A new comment starts private. The writer can edit it, share it, and delete it. The admin can delete any comment.
  - TL_3 information panel: the input blocks of the TL_3 message for the whole page. The panel hides `grid_place`, the fixed text, and the box header. A collapse button in its header makes it a thin bar.
  - Term highlight: a click on a highlighted term opens the termbase entry. The pop-up shows the first definition of each language. A button shows the full entry.
  - A warning shows when the user leaves with unsaved text (reload, close, and a click on a link of the app).

### Where the code sits

- `lib/htv-runs.ts`: all reads of run folders for this view. The config key `runSource` switches it to the collection `page_runs`. `lib/htv-build.ts` holds the pure build code that this file and the sync command S2 share.
- `lib/pb.ts`: all PocketBase calls (plain `fetch`, the token of the signed-in user).
- `lib/htv-groups.ts` and `lib/htv-panel.ts`: pure code for the sentence groups, the term marks, and the TL_3 message.
- `lib/htv-session.ts` and `lib/htv-api.ts`: cookie, sign-in check, and route guard.
- `app/translate/` (pages) and `app/api/htv/` (routes).

### Smoke test, mode `htv`

Mode `htv` writes versions, comments, and run marks into PocketBase. Use a throwaway PocketBase on a local port (the harness uses 8092 or 8093) and never the real server on port 8090. The guard in `scripts/smoke-guards.mjs` refuses port 8090 and a host that is not on this Mac.

1. Start a throwaway PocketBase on `127.0.0.1:8092` with a temporary data folder and the migrations of `data/scripts/pocketbase/pb_migrations/`. Make a temporary superuser.
2. Add four users with random passwords: an admin, two translators, and a reader.
3. Copy the app as the section Smoke test says. Set `pocketbaseUrl` to `http://127.0.0.1:8092` in the file `viewer.config.json` of the copy.
4. Set the env variables `HTV_ADMIN_EMAIL`, `HTV_ADMIN_PASSWORD`, `HTV_TR1_EMAIL`, `HTV_TR1_PASSWORD`, `HTV_TR2_EMAIL`, `HTV_TR2_PASSWORD`, `HTV_READER_EMAIL`, and `HTV_READER_PASSWORD`.
5. Build the copy and run: `node scripts/smoke.mjs htv`
6. Stop the throwaway server and delete its data folder.

The script never prints a password or a token. It checks these parts:

- Sign-in, the list, and the rows of `mental_full/p014`.
- Save and the version numbers.
- The version history time of a saved version on `/translate/mental_full?at=p014` reads "YYYY-MM-DD HH:MM PST" and the page shows no "UTC" (unit TF84, round 85 answer 20).
- Comments of two translators, and the limits of the reader.
- The run mark and the notice.
- The panel line count of `kendojidai_2014/p0839`.
- An old run folder with missing files.

## Sync command S2

The command `scripts/sync-runs.mjs` copies the finished page runs from the run folders on this Mac into the PocketBase collection `page_runs`. It also fills `catalog_items` with all 347 metadata rows (titles, page counts, translated pages, and the placement of the web articles) and `reader_pages` with the reader text and the folded search columns. The deployed app reads these records, because it cannot read this Mac. Section 15.15 of `docs/VISION-viewer.md` holds the details.

Run it in the app folder. The first command is a dry run. It signs in, compares, and writes nothing:

```
cd /Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer/app
node scripts/sync-runs.mjs --superuser superuser@kendo-translation.local
```

The second command writes. Run the dry run first and read the plan:

```
node scripts/sync-runs.mjs --superuser superuser@kendo-translation.local --apply
```

- The command asks for the password in a hidden prompt. It never takes the password from an option, an env variable, or a file.
- The default server is `http://127.0.0.1:8090`. Use `--url` for another server. Plain http works for 127.0.0.1 and localhost only.
- `--page mental_full/p014` limits the run to one page. The option can repeat.
- `--list PATH` limits the run to the pages of a list folder, a `list.json` file, or a text file with one page ID per line.
- `--offline` runs a dry run with no sign-in. The plan then shows "not compared".
- A record is created if it is missing, updated if it differs, and left alone if it is equal. A second run changes nothing.
- A record whose run folder is gone stays on the server. The report lists it as "on the server only".
- The report prints every size in MB (1 MB is 1,048,576 bytes). Each snapshot must stay below 5 MB.
- The exit code is 1 if a check or a write fails. The message names the run and the PocketBase error.

The config key `runSource` in `viewer.config.json` picks the source of the human-translation-view:

- `files` is the default. The view reads the run folders.
- `pocketbase` makes the view read `page_runs` and `catalog_items`. The key `translatorDataDir` is then optional. The agent-translation-monitor still reads files and needs the key.

Do not add `"runSource": "pocketbase"` to the tracked `viewer.config.json`. To test the source, copy the app as the section Smoke test says. Write a config file for the copy and start the smoke test with `node scripts/smoke.mjs htv --config FILE`.

## Deploy settings (round 58)

Round 58 answer 7 (Q-A 2026-10-28 l205) added three environment variables and the monitor setting. The deployed app on Vercel uses them, because Vercel has no `viewer.config.json`.

### Settings

| Env variable | File key | Values | Default | Wins |
| --- | --- | --- | --- | --- |
| `VIEWER_RUN_SOURCE` | `runSource` | `files`, `pocketbase` | `files` | env |
| `VIEWER_POCKETBASE_URL` | `pocketbaseUrl` | address of PocketBase | `http://127.0.0.1:8090` | env |
| `VIEWER_MONITOR` | `monitor` | env: `on`, `off`, `true`, `false`, `1`, `0`. File: `true`, `false` | on | env |

- An env variable that is empty counts as not set.
- A wrong value stops the app with an error that names the variable or the key.
- The app trims the address of PocketBase and removes slashes at the end.
- If the config file does not exist and `VIEWER_RUN_SOURCE` is set, the app builds the settings from the env variables alone. The folder `translatorDataDir` is then empty.
- If the config file does not exist and `VIEWER_RUN_SOURCE` is not set, the app stops with an error that names the file path and the variable.
- If no env variable is set and the file exists, the app behaves as before.

### Plain http rule

- Plain `http://` works for the hosts `127.0.0.1`, `localhost`, and `[::1]` only.
- Every other host needs `https://`. The sign-in sends passwords to PocketBase.
- The rule applies to the env variable and to the file key. The files `pb_users.py` and `scripts/sync-runs.mjs` use the same rule, but they do not accept `[::1]`.

### Monitor setting

The setting `monitor` hides the agent-translation-monitor. The deployed app has no Translator data folder, so the monitor has nothing to show.

When the monitor is off, the app does this:

- The page `/` sends the visitor by the sign-in state: no session to `/sign-in`, a reader to `/read`, a translator or an admin to `/translate` (unit RC4, round 70).
- The pages `/books`, `/page/<book>/<page>`, `/runs`, and `/runs/<list>` show the page "not found".
- These routes answer with status 404 and the body `{"error":"Not found"}`. The app reads no run data before it answers.
  - `/api/books/<id>`
  - `/api/file`
  - `/api/monitor/books`
  - `/api/monitor/books/<slug>/mark` and `/api/monitor/books/<slug>/pause` (POST, unit VW77b1)
  - `/api/page-extra`
  - `/api/pause`
  - `/api/runs`
  - `/api/runs/<list>`
  - `/api/runs/<list>/compare`
  - `/api/runs/<list>/memory`
- The title bar shows the tab Human translation only.
- The human-translation-view (`/translate`) and the routes under `/api/htv` stay as they are.

### Values for Vercel (v2)

Round 56 answer 6 set the addresses: the app on `v2.kendotranslation.com`, PocketBase on `pb-v2.kendotranslation.com`.

| Setting | Value |
| --- | --- |
| Root Directory | `app` |
| Build command | `next build` |
| Node.js | 20.9 or newer |
| `VIEWER_RUN_SOURCE` | `pocketbase` |
| `VIEWER_POCKETBASE_URL` | `https://pb-v2.kendotranslation.com` |
| `VIEWER_MONITOR` | `off` |

Run the sync command S2 against `https://pb-v2.kendotranslation.com` before the first visit. The deployed view reads the uploaded snapshots only.

### Smoke test, mode `deploy`

The mode `deploy` tests the deploy shape: no config file, settings from env variables, monitor off. It checks the redirect from `/`, the 404 answers of the monitor, the sign-in, and the read-only view of a reader. Run it in a copy of the app, never in the folder of the dev server.

1. Start a throwaway PocketBase on port 8092 and add one translator and one reader.
2. Upload the run snapshots with S2 (section Sync command S2) into that server.
3. Copy the app as the section Smoke test says. Build the copy. Move `viewer.config.json` out of the copy.
4. Set the env variables `VIEWER_RUN_SOURCE=pocketbase`, `VIEWER_POCKETBASE_URL=http://127.0.0.1:8092`, and `VIEWER_MONITOR=off`.
5. Set the env variables `HTV_TR1_EMAIL`, `HTV_TR1_PASSWORD`, `HTV_READER_EMAIL`, and `HTV_READER_PASSWORD`.
6. Run: `node scripts/smoke.mjs deploy`

The script never prints a password or a token. It fails if the config file exists or if the address of PocketBase is not a local throwaway address (port 8090 is refused, see `scripts/smoke-guards.mjs`).

## Book screen, agree tick, panel cards, dark theme, and settings cog (unit UXC, round 59)

Design: `docs/VISION-viewer.md` section 15.16. Code state: section 15.17.

### Book screen

- `/translate` lists the books. `/translate/<book>` shows one book with all pages. A page with a finished run shows its rows. A page without one shows the page ID and the tag "No agent translation".
- The old route `/translate/<book>/<page>` redirects (307) to `/translate/<book>?at=<page>#<page>`.
- The server sends the page index at once. The browser asks `GET /api/htv/page?ids=<page ID>,...` (8 pages at most) for the rows of the pages near the screen.
- Each page section has its own Save, version numbers, run notice, comments, and run mark control (admin only).
- The left index lists the pages with their tags. The box "Go to page" takes `48`, `p048`, or `839` and jumps to the page.
- A magazine year shows month headings. In runSource `files` they come from `item-metadata/magazine-chapters.jsonl`. In runSource `pocketbase` they come from the collection `magazine_chapters`.
- The constant `BOOK_LIST_MODE` in `lib/htv-books.ts` is `"all"` (round 61 answer 6). The constant `DEFAULT_THEME` in `lib/htv-settings.ts` is `"light"`. The cogs, the page view, and the panel bars are in the section of unit UXC2 at the end.

### Agree tick

- A row has the box "Agree with the agent text". A tick and own text exclude each other. Save writes the field `agree` for every row.
- The save route refuses a tick with own text, and a tick on a row without an agent text (400).

### TL_3 information panel

- `lib/htv-panel-cards.ts` turns the lines of the TL_3 message into cards when the panel shows. The snapshot format stays 1.
- The panel hides `entry_id`, `store`, `source`, the line `stance`, and the block of the JA text. A drag on the left edge changes the width (280 to 720 px).

### Theme

- The switch in the top bar sets the cookie `theme`. The root layout writes `data-theme` on `<html>`. A signed-in user also keeps the theme in the account.
- `node scripts/contrast-dark.mjs` tests the dark colors (7 to 1 or more) and finds palette colors without a dark value. A new color class must follow the pairing rule of `app/globals.css`.

### Settings cog

- Each of the 7 panes has one cog. Unit UXC2 moved the cogs out of the rows: see the section of unit UXC2 at the end. The monitor panes have none.
- The cog sets font, size, line height, text color, background color, width, and Reset. A custom color belongs to one theme. A warning shows below a contrast of 4.5 to 1.
- The settings stay in the account (collection `user_settings`, route `/api/htv/settings`).

### Sync command S2 and tests

- S2 also fills `magazine_chapters` (103 rows). Dry run, compare, skip or update, and never delete, as for `catalog_items`. The chapters do not depend on `--page` or `--list`.
- Make sure that the server loads the migrations `1793300004_v2_own_translations_agree.js` and `1793300005_v2_user_settings.js` before you run S2. See `data/scripts/pocketbase/README.md` section 8.
- Smoke test results of unit UXC: `smoke` 70 PASS, `htv` 208 PASS (files and pocketbase), `deploy` 34 PASS.

## Page view, collapsible panels, column cogs, 36 books, and review fixes (unit UXC2, round 61)

Round 61 answers 3 to 7 (Q-A 2026-10-29 l263 to l267) set these parts.

### Page view

- The book screen has a switch "Scroll view" / "Page view". The scroll view stays as before.
- The page view shows one page at a time with its rows, own boxes, ticks, Save, and comments. A page with no agent translation shows its page number and the tag "No agent translation".
- The buttons "Previous page" and "Next page" go through every page of the book. The page number box and the left index jump to a page.
- A leave warning shows when unsaved text exists before the screen moves to another page, or before the view changes.
- URL: `/translate/left_foot_full?view=page&at=p048`. A `view` in the URL wins, else the view of the account, else the scroll view.
- The view choice stays in the account (`user_settings.panes`, key `ui.view`).

### Collapsible panels

- The book index (left) and the TL_3 information panel (right) have a collapse button in their header. The close button is gone.
- A collapsed panel is a bar of 28 px with the name and an arrow. A click on the bar opens the panel at its old width.
- The state and the widths stay in the account: `ui.index.open`, `ui.index.width` (160 to 400 px, default 192 px), `ui.tl3.open`. The width of the TL_3 panel stays in `panes.tl3.width`.
- Example of the stored JSON: `{"v":1,"panes":{"tl3":{"width":500}},"ui":{"view":"page","index":{"open":true,"width":260},"tl3":{"open":false}}}`. A record without `ui` stays readable.

### Column cogs

- A sticky header row above the rows holds one cog for each column: Japanese, Agent translation, Your translation, Comments, and Version history. The book index and the TL_3 panel keep one cog in their own header. The book list page keeps one cog in its header.
- No row holds a cog. A setting applies to every row of the screen.

### 36 books

- `BOOK_LIST_MODE` is `"all"`. The book list holds the 36 book folders of `pilot-sample/book-slugs.json` and the web article `18d4ac29`. A book with no run opens and shows its page numbers with "No agent translation".
- S2 fills `catalog_items` with all 347 rows of `items.filled.jsonl` since unit RC4 (36 folders and 311 web articles). The list at `/translate` still shows 37 rows, because `lib/htv-books.ts` leaves out a web article that has no run. The catalog rows are about 0.39 MB.

### Review fixes

- The sign-in page calls `redirect()` outside the `try` block.
- `app/translate/loading.tsx` and `app/translate/error.tsx` exist. Because of `loading.tsx`, Next streams the pages under `/translate`. A `redirect()` and a `notFound()` inside a page now answer HTTP 200 with a client side redirect or the not-found screen.
- The comment view holds no `userId`.
- `lib/htv-origin.ts` checks the Origin for the four places (route guard, login, logout, theme). It uses `x-forwarded-host` when present, else `host`. `Origin: null` and an Origin that is no URL get 403. A request with no Origin header passes as before.
- `app/translate/layout.tsx` sets the browser title "human-translation-view".
- `next.config.ts` keeps the loader `@tailwindcss/turbopack`. The build and the dark theme contrast check pass with it. A switch to `@tailwindcss/postcss` needs a change of the build and a new contrast check.
- The lines `export const dynamic = "force-dynamic"` stay (27 lines in 27 files, none added, none removed).

## Reader pages (unit RC1, round 63)

The reader pages are the book reading site for readers. Design: `docs/VISION-viewer.md` section 15.19. Code state: section 15.20.

### Routes

- `/sign-up` makes an account. The account is a reader that waits for approval. The person signs in at once.
- `/sign-in` signs in every role. A reader goes to `/read`. A translator and an admin go to `/translate`. `/translate/sign-in` stays.
- `/read` shows the Reader dashboard (section Reader dashboard, unit RC4). `/read/<book>` shows the book screen. `?view=page&at=p048` shows one page. `?view=scroll&at=p048` shows all pages in one scroll.
- `/admin/readers` lists the readers that wait for approval. `/admin/versions?page=left_foot_full/p048` chooses the human version and the page check. Only the admin role opens them.
- `/translate` sends a reader to `/read`. `GET /api/htv/page` answers a reader with 403.

### Rules for the data

- A reader that waits for approval sees the Reader dashboard with the progress of each work, and the line "Your account waits for approval by an admin." PocketBase gives it no `reader_pages` record.
- A reader never gets the verdict, the score, the QA fields, the TL_3 panel, the run list, or the reasoning. `page_runs` is closed to readers. The pages read `reader_pages`.
- The reader pages read PocketBase only. With `runSource` files, run `node scripts/sync-runs.mjs` first. Without a `reader_pages` record a page shows "No agent translation yet".
- The AI label is always on the page. "AI translation, not yet checked by a person" or "AI translation, checked by a person (date)". The human version shows "Human translation. Chosen by an admin."

### Settings and themes

- The settings of the reader are in `user_settings.panes` under the key `reader`. The key `panelSeen` (the first-visit panel was closed once) lives there too and is not in `READER_DEFAULTS`, so "Reset text settings" keeps it. `sanitizeSettings` keeps the key.
- Defaults: text EN, EN text agent, page view, serif and Mincho, 18 px, line height 1.7, narrow, focus off, image on. See `READER_DEFAULTS` in `lib/htv-settings.ts`. `panelSeen` has no default.
- Themes: `light`, `dark` (High-contrast dark), `sepia`, `solarized-light`, `solarized-dark`. The colors are in `app/globals.css`.
- The default theme of each page group is one constant: `DEFAULT_THEME_HTV` and `DEFAULT_THEME_READER` in `lib/htv-settings.ts`. To change the default of the reader pages, change one line.
- `node scripts/contrast-dark.mjs` tests every text pair of the five themes. Lowest pair: light 4.73, dark 7.49, sepia 6.11, solarized-light 6.03, solarized-dark 6.96 (to 1).

### S2 and reader_pages

- S2 builds one `reader_pages` record for each page with an agent translation. The run is the run of the admin run mark if that run is open, else the newest open PASS run (round 75 answer 3, round 76 answers 10 and 11). An admin opens a run with "Open to readers" on the run view `/runs/<stamp>`. The collection `reader_opens` holds the opened runs. A page with no open PASS run gets no agent text. A book page loses its record, and a web article page goes back to its `web-ja` record. S2 stops if `reader_opens` is missing.
- The record holds rows, term entries, captions (extras), the group keys with a translator tick (agree), and the folded search columns `search_ja` and `search_en` (unit RC4). It holds no name.
- Dry run is the default. `--apply` writes. A second run changes nothing. The report lists the count and the sizes in MB.
- Last test on a throwaway server (unit RC4, with the search columns): 29 records, min 0.01 MB, median 0.03 MB, max 0.06 MB, total 0.88 MB.
- Run S2 again after an admin opens or closes a run, marks a run, a translator ticks agree, or a new run ends. The reader pages change at that time.

### Tests

- `node scripts/smoke.mjs read` runs 287 checks since unit RC4. It needs the setup of `run_all.py` in the work folder of the unit (S2 upload, one saved version of a translator, an approved reader, and a reader that waits).
- The checks of the human-translation-view for a reader changed into redirect checks. The list is in the report of unit RC1.

## Page images (unit RC2, round 65)

The reader pages can show the scanned book page next to the text. Design and contract: `docs/VISION-viewer.md` section 15.21.

### Keys

All keys are environment variables. An empty variable counts as not set. Only the first one is needed on this Mac.

| Key | Meaning |
|---|---|
| `VIEWER_PAGE_IMAGE_SOURCE` | `files` (default) or `signed` |
| `VIEWER_PAGE_IMAGE_DIR` | Files mode. Folder of the images. Default `../data/page-images` from the app folder |
| `VIEWER_PAGE_IMAGE_URL` | Signed mode. Base address, for example `https://pb-v2.kendotranslation.com/page-images` |
| `VIEWER_PAGE_IMAGE_KEY` | Signed mode. The signing key. It is a secret. Make it with `openssl rand -hex 32` |

### Local mode (this Mac)

1. Put the images in `data/page-images/<book>/p048.webp`. Use 4 digits (`p0839.webp`) for a book of more than 999 pages.
2. Start the app as usual. The route `/api/read/image/<book>/<page>` reads the file.
3. Sign in as a reader, a translator, or an admin. Open a page in Page view. The page image shows by default. Press "Image" in the bar to turn it off.

### Signed mode (deploy)

1. Set the four keys on the app host (Vercel).
2. Set `PAGE_IMAGE_KEY` (the same value as `VIEWER_PAGE_IMAGE_KEY`) and `PAGE_IMAGE_DIR` on the PocketBase host. Start PocketBase with `--hooksDir`. See `data/scripts/pocketbase/README.md`.
3. The route checks the sign-in. Then it answers 302 to a link that is valid for 10 minutes. The hook of PocketBase checks the link and sends the file.

### Rules

- Access: an approved reader, a translator, or an admin. No session gives 401. A reader that waits for approval gives 403.
- A bad page ID gives 400. An unknown book, a page that is not in the book, and the web article give 404.
- The image shows in the page view only. The scroll view and focus mode show text only.
- A missing image shows "No page image available". Page image is on by default since unit RC3. The button "Image" in the reader bar turns it off and on.
- Make sure that no log, message, or page shows the key.

### Tests

- `node scripts/smoke.mjs read` runs 287 checks (unit RC4). They need the setup of `run_all.py` and two more variables: `VIEWER_PAGE_IMAGE_DIR` (test images, with one link that leaves the folder) and `VIEWER_PAGE_IMAGE_TEST_KEY` (the key of the test PocketBase). Without them the page image checks give one SKIP.
- The checks start extra copies of the app on other ports for signed mode and for the wrong settings. They stop them at the end.
- The Chrome checks of the page image view and the Image button (1440 px and 390 px) are in the work folder of unit RC3 (`browser_rc2.mjs`, 100 checks).

### Other changes of unit RC2

- S2 drops six keys (`sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, and `source_url`) from `catalog_items.row`. Unit RC3 drops eight more. See the notes of unit RC3 below.
- `scripts/ts-resolve-hook.mjs` uses `module.registerHooks()`. Node 26 prints no DEP0205 warning. Call `installTsResolveHook()` before the first import of an app file.

## Unit RC3 notes (round 66)

- The reader bar has a button "Image" right of the View buttons. It turns the page image on and off and saves `reader.image` like the other reader settings. The Settings panel has no "Page image" switch.
- The button shows only for a book with page images. In Scroll view it stays and is disabled. Its title is "Page image shows in Page view only".
- Page image is on by default. A reader who saved Off keeps Off. The Reset button of the Settings panel sets it to on.
- S2 drops 14 keys from `catalog_items.row`: the six above plus `hint_secondary`, `confidence_draft`, `notes_draft`, `issue_evidence`, `status`, `title_en_source`, `author_en_source`, and `synopsis_source`.
- `node scripts/smoke.mjs read` now fails if one of the 14 keys is in a `catalog_items` record.
- A copy of the app in a work folder must point at the throwaway PocketBase in `viewer.config.json` (key `pocketbaseUrl`). Without the key the app uses port 8090.

## Reader dashboard (unit RC4, round 70)

The Reader dashboard is the page `/read`. It replaces the card grid of unit RC1. Design: `docs/VISION-viewer.md` section 15.23. Owner answers: round 68 answers 3, 4, and 5, and round 69 answers 6 to 15.

### Routes

- `/read` shows the folds and the progress of every work.
- `/read?q=seme` shows the search results. Add `&screen=2` for the next 20 hits.
- `/read?open=kj-2011-08` shows the dashboard with that month drawn on the server. A browser without script uses it through the link "Show this month".
- `GET /api/read/month?id=kj-2011-08` gives the rows of one month. A reader that waits for approval gets it too, because the rows hold titles and counts only.
- `/` is the front door. With the monitor off, `/` goes to `/sign-in` (no session), `/read` (reader), or `/translate` (translator and admin). With the monitor on, `/` shows the Monitor dashboard as before.

### Folds

- The first level has Books (22 works) and Kendo Jidai (320 works). The first level starts open. Deeper folds start closed.
- Books: works with one English title form a fold. Example: the three `ogawa_lecture_part` folders. Other works are rows.
- Kendo Jidai has one fold for each year, 2010 to 2025. A year from 2010 to 2018 holds the row of the year volume and month folds with the magazine articles (1,155 rows in all). A year from 2019 to 2025 holds month folds with web articles.
- A web article goes to the month of its web date, also when it has a print stamp (36 articles). Round 83 answer 4 chose "Show web year" (unit TF83). Example: record `63654ba0` (stamp "2011.8 KENDOJIDAI", web date 2025-04-28) sits in Kendo Jidai > 2025 > April 2025. Before unit TF83 it sat in Kendo Jidai > 2011 > August 2011.
- Effect: the fold "Kendo Jidai 2019" holds 14 web articles (39 pages). It held 9 articles (24 pages). The web-only months of 2018 (June, July, September, October) and the web articles in the magazine months of 2011 to 2018 go away.
- The slug of a web article is the first 8 characters of its `item_id`. Example: `18d4ac29` shows the title "Kendo droplet guard".
- Hidden works: `men0` and `men1` (their metadata names `men_full` in `part_of`), `mental2_clean` (same title and pages as `mental_full`), and the web captures `matsubara` and `morishima`. `/translate` keeps all of them.
- A web article counts as 1 page.
- The month folds send no rows in the page. The rows load when the fold opens. The page had 2.08 MB with all rows. The page has 0.29 MB now.
- A row shows "English: 6 of 120 pages translated (5.0 percent)" and one link, "Start at Page 46" or "Continue at Page N". A reader that waits for approval sees no link.

### Choices in one place

- `lib/reader-folds.ts` holds `WEB_PLACE` (`kendo-jidai` is reading A, `separate` is reading B with a first-level fold "Web articles"), `STAMPED_PLACE` (`web` since unit TF83, or `print`), `HIDE_WEB_CAPTURES`, and `HIDDEN_COPIES`. Round 70 answer 5 confirmed reading A. Round 83 answer 4 chose `web` for `STAMPED_PLACE`.
- `lib/reader-translated.ts` holds the rule `isTranslatedPage`, the word `TRANSLATED_WORD`, and the progress lines. A page counts as translated when a `reader_pages` record exists. To change the word, change one line.
- `lib/reader-search.ts` holds the fold rule of the search.

### Search

- The box searches titles, authors, publishers, years, and synopses of the visible works. It also searches the folded page text.
- The fold rule: lowercase, no accent mark on a Latin letter, no hyphen. Example: "chuzumi" finds "Chūzumi" on `left_foot_full` p048 and p049. Japanese text stays as it is.
- The columns `reader_pages.search_en` and `reader_pages.search_ja` hold the folded text. The filter `~` reads them. The column `search_en` also holds the romaji of the term marks of the page.
- A reader that waits for approval gets titles and metadata only. The note says "Page text search opens after approval." PocketBase refuses the page hits (rule READ_OK).
- The list shows title hits first, then page hits by book and page. One screen holds 20 hits.
- Speed: on 13,278 synthetic records with real text sizes, the filter answered in 49 to 134 ms. The test used a throwaway PocketBase.

### Data and tolerance

- Migration `1793300010_v2_dashboard_fields.js` adds `catalog_items.translated`, `catalog_items.placement`, `reader_pages.search_ja`, and `reader_pages.search_en`. See `data/scripts/pocketbase/README.md`.
- Without the migration, the dashboard still answers. An approved reader sees the progress from `reader_pages`. A reader that waits sees no progress line. A search shows "Search needs the next database update (S2)."
- Order on a server: restart PocketBase, run `node scripts/sync-runs.mjs --superuser EMAIL` (dry run), then add `--apply`. `--apply` stops with a plain message if the migration is missing.
- Last dry run on the upgrade copy: catalog_items create 310 and update 37, reader_pages update 29. A second run says unchanged (347 and 29).
- Placement: S2 reads `web-magazine-candidates.jsonl` (36 stamps). A row of `web-magazine-overrides.jsonl` with the action `link` wins only if its month differs from the stamp. The 11 link rows today do not differ.

### Panel at the first visit

- An account without `reader.panelSeen` sees the settings panel once, on its first text screen. A book screen does not open it.
- A change of a setting, the cog, and "Reset text settings" do not close it. The button "Start reading" and the Esc key close it and save the mark.
- With focus mode on, the first Esc closes the panel. The second Esc leaves focus mode.
- On a phone, the sheet is up to 50 percent of the screen high. The button stays at its bottom.

### Tests (unit RC4)

- `node scripts/smoke.mjs folds` runs 41 checks. It needs no server and no PocketBase. It runs the folds, the hidden works, the fold rule, and the progress words on the real metadata files.
- `node scripts/smoke.mjs tolerance` runs 19 checks on a PocketBase with the migrations up to 1793300009 only.
- `node scripts/smoke.mjs read` runs 287 checks (46 more than before). `deploy` runs 39 checks (5 new, 2 changed).
- 13 old checks changed. They tested the 37 cards, the card line "AI translation: 6 of 120 pages", the synopsis note on a card, and the web article card. They also tested `catalog_items` with 37 records, the translator list, and `/` going to `/translate`.
- The Chrome checks (1440 x 900 and 390 x 844, five themes) are in the work folder of unit RC4 (`browser_rc4.mjs`, 137 checks).
- `node scripts/contrast-dark.mjs` gives 0 failures. The hit mark uses the pair of the term highlight.

### Word and field rename (unit RC4b, round 71)

- Round 70 answer 3, owner words:
  > Pages with translation that reader can view
  > use the CORRECT word. `translated` instead of `finished`
  > Also reader can open any page, just no translated data. Be concise with your wording.
- Round 70 answer 9, owner choice: "Same wording on year rows (Recommended)". Every first-level fold, year row, month row, and the total line uses the full form "English: N of M pages translated (P percent)". Example: "English: 20 of 4,821 pages translated (0.4 percent)".
- The rule does not change. A page counts as translated when a `reader_pages` record exists.
- The database field is `catalog_items.translated`. The old name was `finished`. The migration `1793300010_v2_dashboard_fields.js` changed in place, because no long-lived database applied it yet.
- The file is `lib/reader-translated.ts`. The old name was `lib/reader-finished.ts`. The names are `TRANSLATED_WORD`, `isTranslatedPage`, `progressLine`, `foldProgress`, and `percentText`.
- S2 writes `translated`. S2 does not read or remove a field `finished` on a throwaway database that applied the old migration file.
- The word "finished" stays in the translator code. There it means a run with a QA_3 verdict (`finishedRunOf` in `lib/htv-build.ts`) or the end time of a run (`page_runs.finished`).
- The Monitor dashboard text "pages done" does not change.
- A year row counts a web article as 1 page. Its page count can differ from the page count in its note. Example: "Kendo Jidai 2012 949 pages · 3 web articles English: 2 of 952 pages translated (0.2 percent)".
- Test counts of this unit: `smoke` 70, `htv` 262 (files) and 262 (PocketBase), `deploy` 39, `read` 292, `folds` 44, `tolerance` 20, hook checks 62, Chrome 138. The test `test_page_images.py` gave 82 PASS. The test `test_local.py` gave 258 PASS.

## Arrow keys and full form on article rows (unit RC5, round 72)

### Arrow keys on the book screen

- Round 71 answer 1, owner words: "Add key-arrow for navigation".
- In the Page view, the Left arrow key opens the previous page. The Right arrow key opens the next page.
- This direction is a reading that waits for the owner check. A Japanese book reads right to left on paper, so the owner can ask for the other direction.
- The two keys sit in one constant, `PAGE_KEYS`, at the top of `components/ReaderBook.tsx`. To flip the direction, swap the two values.
- A key press opens the same address as the link "Previous" or "Next". The place save runs as for a click.
- The keys do nothing in these cases:
  - An Alt, Ctrl, Meta, or Shift key is down.
  - The key repeats because the reader holds it down. One press moves one page.
  - The focus is in a text box, a range slider, a list, a menu, a splitter, or editable text. A button does not count.
  - The settings panel, the first-visit panel, or the term pop-up is open.
  - The page is the first page (Left key) or the last page (Right key).
  - The view is the Scroll view. The browser keeps its own arrow key behavior there.
- Focus mode in the Page view takes the keys too. Focus mode stays on.
- The links "Previous", "Next", "Previous page", and "Next page" have the title "Previous page (Left arrow key)" and "Next page (Right arrow key)". The title comes from `PAGE_KEYS`.
- The two arrow buttons of the phone bar have no title. A phone has no arrow keys.

### Full form on article rows and chapter lines

- Round 71 answer 4, owner choice: "Full form".
- An article row and a chapter line show the same full form as a work row. Example: "English: 5 of 31 pages translated (16.1 percent)".
- The number of pages is `pageEnd - pageStart + 1`. The code uses `progressLine` from `lib/reader-translated.ts`. The rows are in `components/ReaderRows.tsx`.
- A row shows the line only when at least one page is translated. A zero is not safe to show here.
- A reader who waits for approval gets 0 for every row, because the counts are not readable. A database without migration 1793300010 gives the same 0.
- A work row hides its line in that state (`known`). An article row and a chapter line have no such flag, so a shown "0 of N" can be false.
- Result today: the 14 rows of August 2011 show no count. October 2014 shows the count on the row "Kendo Lesson Series No. 16!" (pages 785-815, "English: 5 of 31 pages translated (16.1 percent)").
- Open: to show the line at zero, the page must pass `known` to the rows. That change touches `components/ReaderList.tsx` and `components/ReaderMonth.tsx` too.

### Tests (unit RC5)

- `node scripts/smoke.mjs read` runs 297 checks (5 new). The 5 checks cover the article rows of August 2011 and October 2014, the number M, the chapter lines, and the absence of "N translated" without "English:".
- The Chrome checks run 159 checks (21 new). They cover the keys, the title hint, the first and last page, the Scroll view, focus mode, and the screens with a panel or pop-up.
- Other counts stay: `smoke` 70, `htv` 262 (files) and 262 (PocketBase), `deploy` 39, `folds` 44, `tolerance` 20, hook checks 62. The test `test_page_images.py` gave 82 PASS. The test `test_local.py` gave 258 PASS.

## Text-only works and the v1 placeholder (unit RT73a, round 73)

Design: section 15.26 of `docs/VISION-viewer.md`. This unit is part a of two. It builds the data and the counts. Unit RT73b builds the component list, the panels, the Original text button, and the fact marks on the screen.

### Web articles on the Reader dashboard `/read`

- A web article has A4 pages (40 characters, 36 lines). The Translator script `data/scripts/web_pages.py` writes the page file `item-metadata/web-pages.jsonl`. It has 311 articles and 1,124 pages.
- S2 reads that page file (option `--web-pages FILE`, default `<data>/item-metadata/web-pages.jsonl`). For each page it writes a `reader_pages` record with `run_id` "web-ja" (Original text rows), the kendojidai.com text as the chosen Human version in `reader_versions` (`chosen_by` empty), and a copy in `own_translations` under the disabled account `kendojidai-com@system.invalid` (name "kendojidai.com", version 1).
- S2 writes the default choice once. A choice that an admin removed or changed stays. A page with an agent record (18d4ac29 p001) keeps that record. It gets the web Original text rows (keys `<page_id>/web/<unit>`) and the Human text in its search column.
- A page counts as translated when it has an Agent text or a Human version (`lib/reader-translated.ts`). A page with only the "web-ja" record does not count. The v1 placeholder counts in no number.
- The total line reads "English: 1,151 of 14,135 pages translated (8.1 percent)" with the data of the throwaway test. The year folds 2019 to 2025 read "Kendo Jidai 2019" to "Kendo Jidai 2025".
- S2 `--apply` stops with the line "Restart PocketBase so that migration 1793300011 runs." if `own_translations.facts` is missing.

### Book screen `/read/<slug>`

- The work block reads "AI translation: 6 of 120 pages. Human check: 0 of 6 pages." for a book, and "AI translation: 0 of 3 pages. Human translation: 3 of 3 pages." for d7835263. The metadata line says "1 page" for one page.
- A web article page shows its Human version (page line "Human translation from kendojidai.com.", no AI label). With the Text control "JA" it shows the Original text. 18d4ac29 has an Agent text and a Human version. The control "English text: Agent | Human" swaps them.
- A page with no Agent text and no Human version shows the v1 EN placeholder, if the md file exists (page line "v1 Gemini translation placeholder."). A page with nothing shows "No text for this page yet.".
- The kind of the work decides the Image button, not the page count (`lib/reader-data.ts`).

### v1 placeholder

- The v1 md files sit in `data/v1-md/<slug>/page_NNN.md` (copies of the files of the v1 folders, 13,083 files). The env variable `VIEWER_V1_DIR` names another folder. A missing folder gives no placeholder.
- `lib/reader-v1.ts` holds the block rule. `lib/reader-v1-files.ts` reads the files and refuses any path that leaves the folder.
- The placeholder is not uploaded, not searched, and not counted.

### Tests

- `node scripts/smoke.mjs web` runs the checks of this unit. The runner `run_all.py` of the unit prepares the test folder with `VIEWER_V1_DIR` and `RT73A_WEB_PAGES`.
- `node scripts/smoke.mjs folds` needs the page file (env variable `RT73A_WEB_PAGES`, else `<data>/item-metadata/web-pages.jsonl`).

## Monitor dashboard (unit VW77a, round 80)

The first screen `/` is the Monitor dashboard. It shows one row for each book, in six groups. The design is section 15.24.4 of `docs/VISION-viewer.md`. This unit builds the read side only.

### What it reads

- `<translatorDataDir>/book-store/<book>/status.json`, `PAUSE`, and `request.json`. The Translator writes them. A `status.json` is the truth for its book.
- `<translatorDataDir>/book-store/<book>/prompts/<BOX>/current`. The label `v<phase>.<run>.<updates>` gives the run number. A book with no prompt file shows no run number.
- The list folders `pilot-run/lists/<stamp>/` (`progress.json`, `list.json`, `list-summary.json`, `PAUSE`). A book with no `status.json` gets a derived row from them. The row carries the tag "pilot list". Pilot lists do not count as real runs.
- The book set is the slugs of `pilot-sample/book-slugs.json`, plus each book ID in a `book-store` folder or a list folder.
- The code reads a file again only when its modification time changed. A broken `status.json` gives the row "Status file unreadable". The other rows stay.
- The pid check sends signal 0. It sends no signal to the process.

### Files

- `lib/book-status-rules.ts`: pure rules. It takes the file contents and the clock, and gives the label, the group, the row text, and the summary line. It gives the same label as `label_of` in `store.py`.
- `lib/book-status.ts`: server code. It reads the files and calls the rules.
- `app/api/monitor/books/route.ts`: `GET` only. It returns the rows as JSON. With the monitor off, it answers 404 like the other monitor routes.
- `components/MonitorDashboard.tsx`, `BookRow.tsx`, `StateLabel.tsx`, `monitor-open-store.ts`: the screen. The groups are `details` elements. The browser keeps the open state of each group, like the checklist of the extra items.
- `components/useLive.tsx`: the poll runs every 3 seconds. No poll runs in a hidden tab. A banner shows after 3 failed polls.
- `app/monitor/[slug]/page.tsx`, `app/api/monitor/books/[slug]/route.ts` (`GET` only), `lib/book-detail.ts`, `lib/book-detail-rules.ts`, `lib/critique-share.ts`, `components/BookDetailView.tsx`: the Details view (unit VW77c, section Details view below).

### Times

Every time on the Monitor dashboard shows in PST (UTC minus 8 hours, all year, text "PST"). The helpers are `pstClock`, `pstStamp`, `pstDateTime`, and `pstClockSeconds`. The code sits in `lib/pst.ts`, and `lib/format.ts` re-exports it. The rules import `lib/pst.ts` directly, because the dev server keeps an old instance of `lib/format.ts` for the route handlers that it loaded before. The Lists tab, the run view, and the page check dates of the Reader book screen show PST too since unit VW77b1 (helpers in `lib/pst-more.ts`). The old helpers `dateTime` and `clock` of `lib/format.ts` stay in the code. Times on `/translate` and `/admin` show PST since unit TF83 (round 82 answer 14, helpers in `lib/htv-pst.ts`: `pstTime`, `pstTimeOrText`, `pstDay`). Example: a comment written at 2026-10-27 18:04 UTC reads "2026-10-27 10:04 PST". Unit TF84 removed the old helper `utcTime` of `lib/htv-format.ts` (round 85 answer 20). The same file still holds `parsePageNumber`. Example: 2026-07-10T16:00:00Z shows as 08:00 PST.

### Buttons (unit VW77b1, round 81)

The row buttons follow section 15.27.3 and 15.29.2 of `docs/VISION-viewer.md`. Every press opens a confirm dialog first (Cancel has the focus, Esc writes nothing). The rules are in `lib/book-status-rules.ts` (`actionButtons`).

| Row | Buttons |
|---|---|
| Not started, and a pilot row (a pilot list is no real run) | Run (phase `agent-phase-3`). Grayed until the 16 files `book-store/paired-dataset/prompts/<BOX>/current` exist |
| Running | Pause. Run and Resume are grayed with a reason: "Resume is off because this book runs now (pid 4821)" |
| Running with pause requested | Pause is grayed: "Pause is already requested" |
| Running while a Restart mark waits | no button |
| Stopped, Stopped by failure, Stopped unexpectedly | Resume |
| Completed in phase 3 | Run phase 4 |
| A mark waits (`request.json` exists, no process) | Run and Resume are grayed: "A mark waits: Run requested 08:40 PST" |

A grayed button has `aria-disabled="true"`, stays in the Tab order, and shows its reason as a tooltip, as text for a screen reader, and as visible text after a press.

- `app/api/monitor/books/<slug>/mark/route.ts`: `POST` with the body `{"action": "run" | "resume", "phase": "agent-phase-3" | "agent-phase-4"}`. It writes `request.json` in the form of `store.write_mark` (`lib/book-actions.ts`).
- `app/api/monitor/books/<slug>/pause/route.ts`: `POST` with the body `{}`. It writes the file `PAUSE` (one JSON line) in `book-store/<slug>/`.
- Checks in this order: monitor off 404, foreign Origin 403, content type not JSON 415, slug not safe or not in the book set 404, wrong body 400, action does not fit the book (fresh read of `status.json`) 409 with the reason, `request.json` exists 409 "A mark waits already".
- `components/RowButtons.tsx`, `row-message-store.ts`: the buttons, the dialogs, and the message of a failed press.
- A refused Restart keeps the group of the book. Its extra line reads "Restart refused: <reason>".
- Clear mark shows grayed on a Run mark with `after: "restart"` (the Run mark that the Translator leaves to start the new run after a Restart). Unit TF83 built this (round 83 answer 11, round 84 answer 2). The reason reads "Clear mark is off because this mark starts the new run after a Restart." The route `clear-mark` answers 409 with the same words, because it reads the `stateReason` of the button. The rule sits in `lib/clear-mark-rule.ts`. Example: the book `rs_wait_after` of the test fixture keeps its `request.json`. Other marks keep an active Clear mark.
- The Lists tab, the run view, and the page checks of the Reader book screen show their times in PST (`lib/pst-more.ts`).
- The mode `node scripts/smoke.mjs monitor-actions --config FILE --fixture DIR` tests the routes on a fixture. It writes into the fixture folder. The guard reads the config (unit TF83, `scripts/smoke-guards.mjs`): the fixture folder must not sit inside `<T2>/data`, `<V2>/data`, or a folder in the env variable `SMOKE_PROTECTED_DIRS` (colon list), and `translatorDataDir` of the config must name `<fixture>/data`. Any folder name and any port pass. The mode `node scripts/smoke.mjs guards` shows one pass and one refuse example. The comparison of folder states ignores the three heartbeat files of the fake Translator (`history.jsonl`, `status.json`, `progress.json`), because they change every 3 s.

### Details view (unit VW77c, round 86)

The page `/monitor/<slug>` shows one book. It follows section 15.24.5 and 15.27.5 of `docs/VISION-viewer.md`. With the monitor off, the page and the route `GET /api/monitor/books/<slug>` give "not found". A slug that is not safe, or not in the book set, gives "not found" too. The route reads files and writes none. The page polls the route every 3 seconds in a visible tab.

Every row of the Monitor dashboard `/` has a link "Details" to this page. The link is no button, so a Running row while a Restart waits keeps it with no button (round 80 answer 18).

The title of a row (title and slug, for example "Making the Difference on the Day (mental_full)") is a second link to the same page (unit TF85, round 87 answer 9). It has the attribute `data-title-link` and the same href as the link "Details". The link "Details" stays on every row (round 87 answer 8, D1). The title link is the first element of the row, so Tab reaches it before the buttons and before the link "Details" (section 15.24.4.7 of `docs/VISION-viewer.md`). Enter on the title opens the Details view.

The row order of the Monitor dashboard `/` sits in `lib/row-order.ts` (unit TF85, round 87 answer 9). The groups come in the order of `GROUPS`. Inside a group the newest event comes first, a row with no time comes last, and the slug breaks a tie. A Not started row sorts by slug. The order is strict and total, so Node and the browser give the same order for the same rows. The old comparator mixed two rules across groups. For the three rows `rs_pilot` (Stopped), `rs_mark_broken` and `rs_ns` (Not started) of the fixture `dt`, it gave a different order in Node and in Firefox, and React gave error #418 on `/`. `sortRows` in `lib/book-status-rules.ts` keeps its name and calls `orderRows`.

| Part | Content | Source |
|---|---|---|
| Header | Title, slug, state label, sentence, row buttons (the same rules and dialogs as the row, with Restart), pages done, cost, page time, list folders | the row of `loadBookFresh` |
| Last error | The red line, the time in PST, the file link. Fixed text "No error stored for this book." when none | the row, `last_error.utc` of `status.json` |
| List folders | One fold for each list folder that holds a page of the book, newest first. The newest fold starts open. A page row shows state, calls, QA_3, cost, time, memory pairs | `pilot-run/lists/<stamp>/`, `getRun` of `lib/runs.ts` |
| Critiques against N | Count of each box type for each page, a star where the count reached N, the total row on top, and the stop flag | `summary.json` of each page folder, `history.jsonl` |
| Settings used | N and the models of each page. The mark "Settings changed before this page" | `summary.json` (`update_N`), `run.json` (`models`, `settings.sha1`) |
| Critique share of the current run | One line for each box that has an event `update-point-ended`: used and dropped, with percentages | `history.jsonl` |
| Archived runs | Run ID (PST), phase, pages done, prompts at start, prompts at end | `book-store/<slug>/archive/<run ID folder>/` |

- The stop flag reads "ED_2 stopped after 3 double REJECTs in a row". It has no button. It lists the 3 reject reasons. A reason is the reasons of the last try of one double REJECT, with the page and the names of the failed checks. Example: "After p040, try 2, checks message-rebuild and audit: MESSAGE REBUILD FAIL: ... AUDIT FAIL: ...". A "resumed" event after the box stop removes the flag.
- The critique share uses the events after the last `restart` or `phase-changed` event. The code in `lib/critique-share.ts` gives the same numbers as `critique_share` of `translator/critique_queue.py`, including the rounding of Python (`round(6.25, 1)` gives 6.2). The test `details` runs the Python function on the fixture history and compares.
- The Run ID of an archived run is the folder name in PST. Example: the folder `20261104T001500-0800` reads "2026-11-04 00:15 PST". A folder name in another form stays as plain text, for example `20261105T093000Z`.
- The prompt cells list only the boxes whose label changed in the run. The start labels come from `run.json` of the first archived page. The end labels come from the files `prompts/<BOX>/current` of the archive folder. A missing file gives "Not stored".
- A page of a real book takes its page folder from `book-store/<slug>/pages/<pid>.json` (the current run). A page of a pilot book takes it from the page rows of its list folders.

### Not built yet

- No Restart button (with its 16 pick lists). Unit VW77b2 adds it. The buttons Run, Run phase 4, Pause, and Resume are built (see the section Buttons below).
- The Details view has no box grid (part 4 of section 15.24.5) and no list of memory pairs (part 5). Each page row links to the page view and each list folder links to the run view `/runs/<stamp>`. The Translator builds a freeze of a box in unit TR77f. The Viewer text for it comes later.
- No tab and page Run settings. Unit VW77d adds them.
- The row of a refused Restart is built (unit VW77b1). It reads the event `restart-refused` of `history.jsonl`. Check the Translator code of unit TR77c2 for the event.
- No phase 2 row. The screen shows the line "Phase 2 (paired dataset): no run record yet."

### Tests

- `node scripts/smoke.mjs monitor-rules --t2 <T2>/data`: pure tests of the rules and the PST helpers. It starts no server. It runs `python3 -B` once to compare the labels with `label_of`. Unit TF85 adds 6 checks of the row order: the 3 `dt` rows in all 6 input orders, transitivity over 74088 triples, strict order, the VISION rule for 200 random input orders, an unknown group, and a time that is NaN.
- `node scripts/smoke.mjs monitor --config FILE --fixture DIR`: the screen and the route on a fixture. The fixture comes from `fake_translator.py` of the unit folder, which uses the real code of `store.py`. The test reads only. It ends the fake Translator at the end.
- `node scripts/smoke.mjs details --config FILE --fixture DIR --t2-scripts DIR`: the Details view on the fixture of `restart_fixture.py --details`. It tests the link on each row, the route, the page, every 404, the Run ID text, the critique share against `critique_share` of the Translator (run from `--t2-scripts`), the stop flag with its 3 reasons, and the Restart button. The test reads only. Unit TF85 adds 4 checks: one title link and one link "Details" with the same href on every row, the visible text of the title link, the title link before the buttons, and the title link outside the Details cell.
- Browser check of the Monitor dashboard `/` and the Details view (`browser_vw77c.mjs`, Firefox through Playwright, fixture `dt`). Unit TF85 turns the old NOTE about React error #418 into a check of 0 script errors on `/`. It adds the tab order inside a row (title link first, `Details` last), Enter on the title link, and a click on the title link.
