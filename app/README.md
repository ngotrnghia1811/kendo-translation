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

- Runs page and run view of the pilot list `20261026T182511Z` (22 pages, state "completed with failures").
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

## Configuration

The file `viewer.config.json` in the app folder holds the settings. It has three keys, `translatorDataDir`, `pocketbaseUrl`, and `runSource`. The keys `pocketbaseUrl` and `runSource` are optional (see the section Human-translation-view at the end).

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

The title bar shows agent-translation-monitor and two tabs, Runs and Books, and a third tab, Human translation (see the section Human-translation-view at the end).

- Runs tab (`/`): one row for each list folder, newest first. Columns: list, kind, state, pages, calls, failed, flagged, cost (models), cost (listed), started, updated. The table refreshes every 3 seconds while a list has the state `running` or `paused`.
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

- List (`/translate`): one row for each page with a finished run, FAIL pages included. A run is finished when `summary.json` holds a QA_3 verdict and the files `results/TS_3.json` and `results/ED_3.json` exist. The status text does not matter.
- Page (`/translate/<book>/<page>`): the shown run is the run that the admin marked. If no run is marked, it is the finished run with the largest `started_utc` in `run.json`.
  - One row for each sentence group (same cut as the book translation memory). A row shows the JA text, the ED_3 text of the shown run, an own box, and a button that copies the ED_3 text into the box. A row with no ED_3 text shows a note.
  - Save writes every row, empty rows included, as one saved version. All records of one Save get the same version number. A failed Save writes no row.
  - Version history: a table of saved versions with the time and the run ID. A button loads an older version into the boxes. A new Save keeps it as a new version.
  - A saved text from another run than the shown run gets a notice on its row. The notice shows on every run difference and compares no text.
  - The box "Saved for lines that this run cuts in another way" shows saved texts and comments whose group key has no row in the shown run.
  - Comments: each row has a comment list. A new comment starts private. The writer can edit it, share it, and delete it. The admin can delete any comment.
  - TL_3 information panel: the input blocks of the TL_3 message for the whole page. The panel hides `grid_place`, the fixed text, and the box header. A button hides and shows the panel.
  - Term highlight: a click on a highlighted term opens the termbase entry. The pop-up shows the first definition of each language. A button shows the full entry.
  - A warning shows when the user leaves with unsaved text (reload, close, and a click on a link of the app).

### Where the code sits

- `lib/htv-runs.ts`: all reads of run folders for this view. The config key `runSource` switches it to the collection `page_runs`. `lib/htv-build.ts` holds the pure build code that this file and the sync command S2 share.
- `lib/pb.ts`: all PocketBase calls (plain `fetch`, the token of the signed-in user).
- `lib/htv-groups.ts` and `lib/htv-panel.ts`: pure code for the sentence groups, the term marks, and the TL_3 message.
- `lib/htv-session.ts` and `lib/htv-api.ts`: cookie, sign-in check, and route guard.
- `app/translate/` (pages) and `app/api/htv/` (routes).

### Smoke test, mode `htv`

Mode `htv` writes versions, comments, and run marks into PocketBase. Use a throwaway PocketBase on port 8092 and never the real server.

1. Start a throwaway PocketBase on `127.0.0.1:8092` with a temporary data folder and the migrations of `data/scripts/pocketbase/pb_migrations/`. Make a temporary superuser.
2. Add four users with random passwords: an admin, two translators, and a reader.
3. Copy the app as the section Smoke test says. Set `pocketbaseUrl` to `http://127.0.0.1:8092` in the file `viewer.config.json` of the copy.
4. Set the env variables `HTV_ADMIN_EMAIL`, `HTV_ADMIN_PASSWORD`, `HTV_TR1_EMAIL`, `HTV_TR1_PASSWORD`, `HTV_TR2_EMAIL`, `HTV_TR2_PASSWORD`, `HTV_READER_EMAIL`, and `HTV_READER_PASSWORD`.
5. Build the copy and run: `node scripts/smoke.mjs htv`
6. Stop the throwaway server and delete its data folder.

The script never prints a password or a token. It checks these parts:

- Sign-in, the list, and the rows of `mental_full/p014`.
- Save and the version numbers.
- Comments of two translators, and the limits of the reader.
- The run mark and the notice.
- The panel line count of `kendojidai_2014/p0839`.
- An old run folder with missing files.

## Sync command S2

The command `scripts/sync-runs.mjs` copies the finished page runs from the run folders on this Mac into the PocketBase collection `page_runs`. It also fills `catalog_items` with the book titles. The deployed app reads these records, because it cannot read this Mac. Section 15.15 of `docs/VISION-viewer.md` holds the details.

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
