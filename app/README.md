# Viewer app

This is the Viewer of the kendo translation project. It reads Translator run data and item metadata from files on disk. The Viewer docs decide two views, the human-translation-view and the agent-translation-monitor, and only the agent-translation-monitor exists now.

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

## Configuration

The file `viewer.config.json` in the app folder holds the settings. It has one key, `translatorDataDir`.

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

The title bar shows agent-translation-monitor and two tabs, Runs and Books.

- Runs tab (`/`): one row for each list folder, newest first. Columns: list, state, pages, calls, failed, flagged, cost (models), cost (listed), started, updated. The table refreshes every 3 seconds while a list has the state `running` or `paused`.
- Run page (`/runs/<list>`): click a list name to open it. It shows the totals of the list and one row for each page. Columns: page, kind, state, calls, USD, minutes, QA_3 verdict.
  - The Pause button writes a pause file. The button shows only if the list has the state `running` or `paused`. After a pause, the same button reads Resume.
  - Click a page ID to open the page view.
- Page view (`/page/<book>/<page>`): the JA text sits next to the EN text of one stage. It opens at the last stage, ED_3.
  - Stage tabs ED_0 to ED_3: each tab shows the QA verdict of its stage.
  - Read and Compare stages: Read shows one stage. Compare stages shows all stages one under the other, and a line that did not change shows "same as ED_k".
  - Show page image and Hide page image: the button is disabled when the page has no image file.
  - QA panel (right side): verdict, page score, cells, issues, and marks of the stage.
  - Reasoning button: it shows the explanation text of one box. A box is one cell of the Translator grid, for example ED_3. The text stays hidden until you press the button.
  - Run folder list: it shows when a page has more than one run folder.
  - Extra detail menu: 7 items, all off at start. A tick shows the item below the text. The items are:
    1. Cost and seconds per call
    2. Exact text sent
    3. Dictionary and aligned memory hits
    4. Failed and flagged calls
    5. Program check results
    6. Critiques with the note for the next critic
    7. Critique counts against N
- Books tab (`/books`): a table of books and magazine years, then a table of web articles that have run folders. Columns: book, title (JA, with EN below), author, publisher, year, confidence, pages, pages with runs. Click a page in the last column to open its page view.
  - The tab reads `item-metadata/items.filled.jsonl`. If that file has no rows, it reads `item-metadata/items.draft.jsonl`.
  - The tab uses these fields: `title_ja`, `title_en`, `author_ja` (or `author_en` if `author_ja` is empty), `publisher`, `publish_year`, `confidence`, `pages`.
  - The tab does not show the synopsis.

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

## Not done yet

- No sign-in and no roles. Every visitor sees every screen.
- No human-translation-view and no editor for a human translation.
- No screen to approve or undo rubric table changes.
- No other screens. The reader pages of the vision docs do not exist.
- The only write is the pause file. The Pause button creates `PAUSE` in the list folder, and Resume deletes it.
- The ticks of the Extra detail menu stay in the browser. They are not saved with an account.

## Where to read more

- `docs/VISION-viewer.md` (in the repository root): the decided vision of the Viewer.
- `docs/drafts/viewer-translator-loop-notes.md` (in the repository root): design notes for the agent-translation-monitor.
