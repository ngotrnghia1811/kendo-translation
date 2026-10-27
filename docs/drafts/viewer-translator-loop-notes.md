# Viewer notes: the translator or admin in the Translator loop

- Status: Notes for the later Viewer design. Not a validated vision. The owner validates each point in the Viewer design rounds.
- File name `viewer-translator-loop-notes.md` is an `[agent inference]`. The owner did not name the file.
- Author and time: aki-execute for aki-main, unit V-NOTE, 2026-10-25 `[check: V-NOTE date 2026-10-25 14:12]`.
- Branch: `v2/viewer`. Commit `8974f9a` added the file after round 38 answer 16 `[file: .opencode/reminders/qa/qa-memory-2026-10-25.md:153]`. Commit `5a21d02` added the decisions of round 40 `[check: VF git log 2026-10-26 10:53]`. Commit `9e26126` fixed stale lines and the dataset count. Commit `ebe14f1` fixed stale lines and design cites and added the design-then-code note `[check: VD git log 2026-10-26 15:25]`.
- Round 38 answer 8 renames theme to critique group. Quoted older text keeps the old word.
- Scope: a note of what the person views and does. The note holds no screen design, no data schema, and no API.

## 1. Legend and sources

- Tags follow `docs/VISION-viewer.md` section 1 `[file: docs/VISION-viewer.md:26-32]`.
  - `[user YYYY-MM-DD HH:MM]`: owner words, verbatim.
  - `[accepted recommendation YYYY-MM-DD HH:MM]`: an option label with "(Recommended)" that the owner picked. The label is not owner words.
  - `[accepted option YYYY-MM-DD HH:MM]`: an option label without "(Recommended)" that the owner picked.
  - `[agent inference]`: an agent reading that the owner did not validate.
  - `[check: V-NOTE <tool> YYYY-MM-DD HH:MM]`: a fact that unit V-NOTE checked with a tool.
- Q-A record: `qa-memory-2026-10-25.md` in `/Users/nghiango-mbp/projects/kendo-translation/.opencode/reminders/qa/`. Citations name the file and the line.
- Translator files: four files in `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/docs/drafts/`.
  - `translator-design.md`, `translator-process-diagrams.md`, `translator-prompt-templates.md`, and `translator-worked-examples.md`.
  - Unit V-NOTE copied them on 2026-10-25 at 14:12 and read the copies `[check: V-NOTE cp 2026-10-25 14:12]`.
  - Other units edit the originals now. Line numbers in citations come from the copies and can move. The Translator branch `v2/translator` is at HEAD 559c835 `[check: VD git log 2026-10-26 15:25]`. At that HEAD, the change list lines of design section 7.5.5 are at l2163-2166 `[check: VD grep 2026-10-26 15:26]`.
- Viewer files: citations of `docs/VISION-viewer.md` use the file on `v2/viewer` after the two edits of unit V-NOTE. The line numbers did not change.
- Terms follow `docs/VISION-viewer.md`: component, panel, translation viewing, research layer, and page. Round 44 names the view of the human translator human-translation-view (section 15).
- The Translator design called a critique group of one failure a "theme" until round 38 answer 8. The owner asked for a better term `[user 2026-10-25 13:56]` "What exactly is a `themes` here? the term is confusing. Can we propose a better term?" `[file: qa-memory-2026-10-25.md:118]`.
  - This note says "critique group". Role names such as critique-grouper stay as the Translator design writes them.

## 2. Owner text

- Round 37 answer 9 `[user 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`, verbatim: "Option 1. Aslo Keep a note of all these optimization processes in viewer design for translator/admin. Translator in the loop should be able to view the input, output, diff (and more) and interacts throughout each phase as designed with optimized UI UX experience, in terms of clarity and  intuitiveness."
- Option 1 was "Audit, then you check before lock (Recommended)" `[file: qa-memory-2026-10-25.md:115]`.
  - The meaning below comes from aki-main, not from the owner.
  - In phases 1 to 3, a change to a rubric table comes from the optimizer of that QA box type at an update point.
  - The prompt-audit-judge checks the change with the same five checks as for an instruction text.
  - An accepted change goes live at once.
  - The owner reads the change list at the end of phase 2 and before each phase 4 lock. The owner can undo a change.
- The answer has two parts `[agent inference]`.
  - Part 1 picks option 1.
  - Part 2 asks for this note. The Viewer design later decides the screens.
- The Viewer design comes later `[file: qa-memory-2026-10-25.md:132]`. The line is an aki-main note, not owner words.

## 3. Who uses this part of the Viewer

- The owner names the person: "translator/admin" and "Translator in the loop" `[user 2026-10-25 13:56]`.
- The Viewer has three roles: reader, translator, and admin `[user 2026-10-07 14:58]` `[file: docs/VISION-viewer.md:80]`.
  - A translator and an admin also see the research layer and the scores `[validated reading 2026-10-07 20:05]` `[file: docs/VISION-viewer.md:82]`.
  - Readers never see the research layer `[validated reading 2026-10-07 20:05]` `[file: docs/VISION-viewer.md:229]`.
- Translation viewing is a group of read-only components for the translator and admin roles only `[validated reading 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:141-143]`. Round 44: the agent-translation-monitor is not part of translation viewing. It is its own view for admins `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`.
- Only the admin role opens the admin pages `[accepted recommendation 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:89]`.
- The Translator design names the person in the loop "the owner" in its approval steps `[file: translator-design.md:2033-2035]` (now l2132-2134 at HEAD 2cdb7b3).
  - Which Viewer role acts as "the owner" in each step was open. Decided in round 40 answer 10: the translator role and the admin role both act as "the owner" `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`.

## 4. Phase 1: setup

- Phase 1 runs once. Each QA box proposes changes to the starting rubric table. The owner approves each table `[file: translator-design.md:2341-2344]` (now l2562-2565 at HEAD 2cdb7b3).
- The person views:
  - The starting rubric table: 8 rows, each with a weight, and cell values 0, 5, and 10 `[file: translator-design.md:1925-1934]` (now l1998-2007 at HEAD 2cdb7b3).
  - The FAIL rule and the issue fields that start with the table `[file: translator-process-diagrams.md:633]`.
  - Four proposed tables, one per QA box, shown side by side `[file: translator-process-diagrams.md:637-642]` `[file: translator-design.md:2034]` (now l2133 at HEAD 2cdb7b3).
  - The reason for each proposed change `[file: translator-design.md:2034]` (now l2133 at HEAD 2cdb7b3).
  - The role that wrote the proposal: rubric-proposal-judge, which is a QA_l box in setup mode `[file: translator-design.md:2196]` (now l2273 and l2397 at HEAD 2cdb7b3).
- Interaction points that the Translator design already decides:
  - The owner approves each table `[accepted recommendation 2026-10-25 00:27]` "You approve each table (Recommended)" `[file: translator-design.md:2033]` (now l2132 at HEAD 2cdb7b3).
  - The owner accepts or rejects each change of each table `[accepted recommendation 2026-10-25 00:27]` `[file: translator-design.md:2035]` (now l2134 at HEAD 2cdb7b3).
  - The tables can still change in phases 2 and 3 `[user 2026-10-25 10:21]` "Mostlt correct. but the rubric tables are only locked at start of phase 4" `[file: translator-design.md:2043]` (now l2142-2143 at HEAD 2cdb7b3).
- Interaction points that are proposals only:
  - Show the old and the new value of each changed row side by side `[agent inference]`.
  - Keep a dated record of each accept and each reject `[agent inference]`.
  - Show the accepted state of the four tables before phase 2 starts `[agent inference]`.

## 5. Phase 2: training on the paired dataset

- The grid runs on the 40 `train-feedback` articles, article by article `[file: translator-design.md:2346]` (now l2566-2567 at HEAD 2cdb7b3) `[file: translator-process-diagrams.md:160-161]`.
- The person views:
  - Inputs:
    - The JA text of the article, cut into A4 pages (section 11) `[file: translator-process-diagrams.md:249]`.
    - The human EN of the same aligned units. Only phase 2 has a human EN `[file: translator-process-diagrams.md:165-166]`.
    - The instruction text of each of the 16 box types that the run uses `[file: translator-process-diagrams.md:338]`.
  - Outputs:
    - The result and the reasoning of each of the 16 boxes (section 9) `[file: translator-design.md:603]`.
    - The final EN, which is the `ED_3` text, with the `QA_3` verdict `[file: translator-design.md:2364]` (now l2585 at HEAD 2cdb7b3).
    - The cells, the penalty, the page score, and the verdict of each QA box `[file: translator-process-diagrams.md:402-415]`.
    - The QA issues and the marks on the issues of the QA box below `[file: translator-process-diagrams.md:408-409]`.
  - Diffs:
    - The final EN against the human EN. The reference-diff-critic compares these two texts after each feedback article `[file: translator-design.md:2136]` (now l2569 at HEAD 2cdb7b3). Chosen in round 40 answer 13 `[accepted option 2026-10-25 22:43]` "Final EN vs human EN (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`. A human EN exists only for the dataset web articles, not for book pages `[agent inference]`.
    - The `ED_0` to `ED_3` texts, one under the other. The Viewer already lists them as level versions `[accepted recommendation 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:148-149]`. Chosen in round 40 answer 13 `[accepted option 2026-10-25 22:43]` "ED_0 to ED_3 texts (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
    - The old and the new rubric table after a table change `[file: qa-memory-2026-10-25.md:115]`. Chosen in round 40 answer 13 `[accepted option 2026-10-25 22:43]` "Old vs new rubric table (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
    - The old and the new instruction text after an update point (section 10) `[file: translator-process-diagrams.md:567-569]`. Chosen in round 40 answer 13 `[accepted option 2026-10-25 22:43]` "Old vs new instruction (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
    - Before round 40, the owner did not say which diffs "diff" means `[agent inference]`. The list above was a reading, not a decision. Round 40 answer 13 decides it: the owner chose all five diffs, the four above and the OCR text against the TS text (section 7) `[accepted option 2026-10-25 22:43]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
  - More:
    - The critiques from the box-critic after each page and from the reference-diff-critic after each feedback article `[file: translator-process-diagrams.md:1231]` `[file: translator-process-diagrams.md:1253]`.
    - The critique count of each box type against the trigger N. The value of N is open `[file: translator-design.md:772]`.
    - The rubric table changes and the change list (section 10) `[file: qa-memory-2026-10-25.md:115]`.
- Interaction points that the Translator design already decides:
  - The prompt-audit-judge checks a table change with the five checks `[accepted recommendation 2026-10-25 13:56]` "Audit, then you check before lock (Recommended)" `[file: qa-memory-2026-10-25.md:115]`.
  - An accepted table change goes live at once `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The owner reads the change list at the end of phase 2 `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The owner can undo a table change `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The owner typed "Translator in the loop should be able to view the input, output, diff (and more) and interacts throughout each phase" `[user 2026-10-25 13:56]`. The typed text names no other step.
- Interaction points that are proposals only:
  - Pause the run before an update point. The forward run already waits at each update point `[file: translator-design.md:774]`. `[agent inference]`
  - Read the new instruction text and its audit verdict before the text goes live. `[agent inference]`
  - Override an audit verdict. `[agent inference]`
  - Undo an instruction text version, as for a table change. `[agent inference]`
  - Mark a critique as wrong and keep it out of the queue. `[agent inference]`
  - Add a comment to a page or a critique for later review. `[agent inference]`
  - Choose the order of the articles. `[agent inference]`

## 6. Write-up after phase 2

- The write-up runs once, after phase 2, on the 27 `test` articles. It uses the frozen instruction texts of the end of phase 2 `[accepted recommendation 2026-10-25 10:21]` "After phase 2 (Recommended)" `[file: translator-design.md:2400-2401]` (now l2621-2622 at HEAD 2cdb7b3).
- The person views:
  - Inputs:
    - The JA text of the 27 test articles `[file: translator-process-diagrams.md:695]`.
    - The instruction texts and the rubric table that the write-up uses. Which table is open `[file: translator-design.md:2050]` (now l2149, closed at l2169-2170 at HEAD 2cdb7b3).
  - Outputs:
    - The `ED_3` EN text of each page `[file: translator-process-diagrams.md:698]`.
    - The page scores of the frozen `QA_3` box in write-up mode, and the article score `[file: translator-process-diagrams.md:698-699]`.
    - The scores of chrF, COMET-22, and CometKiwi-22 for each unit and each article `[file: translator-process-diagrams.md:705-708]`.
    - The Kendall tau-b of `QA_3` against each metric, over 351 pairs `[file: translator-process-diagrams.md:710-711]`.
  - Diffs:
    - The grid EN against the human EN of each aligned unit, which the metrics read `[file: translator-process-diagrams.md:703-707]`.
    - The baselines against the grid. The scoring of baselines is open `[file: translator-process-diagrams.md:712]`.
- Interaction points that the Translator design already decides:
  - None. Diagram 8 shows no step for a person `[file: translator-process-diagrams.md:694-712]`.
  - The change list of the end of phase 2 comes before the write-up `[agent inference]`. The order is not stated.
- Interaction points that are proposals only:
  - Show which instruction text versions and which rubric table version the write-up used. `[agent inference]`
  - Open one article score and show the page scores behind it. `[agent inference]`
  - Show the units where `QA_3` and a metric disagree most. `[agent inference]`

## 7. Phase 3: warm initialization per target book

- Phase 3 runs on pages 1 to 20 of one target book, on the whole grid TS to QA, with freeze off `[file: translator-design.md:2352]` (now l2573 at HEAD 2cdb7b3).
- It starts from the instruction texts at the end of phase 2 `[accepted recommendation 2026-10-25 10:21]` "End of phase 2 (Recommended)" `[file: translator-design.md:2391-2392]` (now l2612-2613 at HEAD 2cdb7b3).
- The update signal comes from judge feedback only. No label exists `[user 2026-10-25 02:53]` `[file: translator-design.md:2327]` (now l2576 at HEAD 2cdb7b3).
- The person views:
  - Inputs:
    - The page image of the book. The page image feeds TS at every level `[file: translator-design.md:657]`.
    - The NDLOCR-Lite output (TS level -1), with its boxes and box types `[file: translator-process-diagrams.md:247]` `[file: translator-design.md:2272-2277]` (target not found at HEAD 2cdb7b3 for the boxes and box types, TS level -1 is at l2482).
    - The link between each TS line and its OCR line, with a flag when the score is below 0.5 `[file: translator-process-diagrams.md:248]`.
    - The start instruction texts of the 16 box types `[file: translator-design.md:2353]` (now l2574 at HEAD 2cdb7b3).
  - Outputs:
    - The same outputs as phase 2 (section 5), page by page `[file: translator-design.md:2356]` (now l2577 at HEAD 2cdb7b3).
    - The TS fields of the book page: captions, running heads, page numbers, and ruby `[accepted option 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:152-153]`.
    - The QA issues that point to TS, in the rows "JA text" and "Page structure" `[file: translator-process-diagrams.md:500-501]`.
  - Diffs:
    - The OCR text against the TS text `[agent inference]`. The TS text is the JA text that TS read from the image and the OCR pair. Chosen in round 40 answer 13 `[accepted option 2026-10-25 22:43]` "OCR text vs TS text (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
    - The old and the new instruction text, and the old and the new rubric table (section 10).
    - No human EN exists, so the person sees no diff against a human EN. The reference-diff-critic does not run in phase 3 `[file: translator-process-diagrams.md:181]`.
  - More:
    - The critiques, the update points, and the table changes of the book, as in phase 2.
- Interaction points that the Translator design already decides:
  - The owner reads the change list before the phase 4 lock `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The owner can undo a table change `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - Each book runs its own phase 3 and phase 4 `[accepted recommendation 2026-10-25 13:56]` "Reading 1, per book (Recommended)" `[file: qa-memory-2026-10-25.md:120]`. So one lock and one reading happen for each book `[agent inference]`.
- Interaction points that are proposals only:
  - Choose the target book and confirm the pages 1 to 20 before the run starts. `[agent inference]`
  - Stop phase 3 before page 20 or extend it. `[agent inference]`
  - Open the page image and the OCR boxes side by side for one TS line. `[agent inference]`
  - Pause the run before an update point, as in phase 2. `[agent inference]`

## 8. Phase 4: production run

- Phase 4 runs on the same book from page 1, with the instruction texts of phase 3. Freeze is on `[file: translator-design.md:2359-2363]` (now l2579-2584 at HEAD 2cdb7b3).
- The book translation memory of the phase 3 pages is empty at the start. The rubric tables lock at the start `[accepted recommendation 2026-10-25 10:21]` "Empty it at phase 4 start (Recommended)" `[file: translator-design.md:2393-2394]` (now l2614-2615 at HEAD 2cdb7b3) `[file: translator-design.md:2361]` (now l2581-2582 at HEAD 2cdb7b3).
- The person views:
  - Inputs:
    - The same inputs as phase 3, page by page.
    - The book translation memory pairs that each box saw. A `QA_3` PASS adds the page `[file: translator-process-diagrams.md:191]`.
  - Outputs:
    - The `ED_3` text with the `QA_3` verdict for each page `[file: translator-design.md:2364]` (now l2585 at HEAD 2cdb7b3).
    - The locked rubric tables and the cells of each page `[file: translator-design.md:2044]` (now l2143 at HEAD 2cdb7b3).
  - Diffs:
    - Changes of the instruction text after each update point, for the box types that are still open.
    - The pages 1 to 20 of phase 3 against the same pages in phase 4 `[agent inference]`. Phase 4 translates them again `[file: translator-design.md:2395]` (now l2616 at HEAD 2cdb7b3).
  - Freeze state:
    - Each box type is frozen or open. The box-freeze-check writes the state `[file: translator-process-diagrams.md:1381]`.
    - The test is "No hard theme K times, K=3" `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:117]`. The exact meaning of the label is Not verified.
    - After the freeze of a box type, no update point starts for it `[file: translator-process-diagrams.md:547]`.
    - After the lock, only the instruction text changes `[agent inference]` `[file: translator-design.md:2047]` (now l2146 at HEAD 2cdb7b3).
- Interaction points that the Translator design already decides:
  - The owner reads the change list before the lock and can undo a change `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The optimizer reads the freeze state of the box types `[user 2026-10-25 10:21]` `[file: translator-design.md:2396]` (now l2620 at HEAD 2cdb7b3). The person has no step here.
- Interaction points of the Viewer that touch the output of phase 4:
  - Only an admin records that a human checked a page `[user 2026-10-07 20:05]` "Correct, admin only records" `[file: docs/VISION-viewer.md:247]`.
  - The record lives on the admin pages `[accepted recommendation 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:90]`.
- Interaction points that are proposals only:
  - Pause the run before an update point. `[agent inference]`
  - Open a frozen box type and show the update point that froze it. `[agent inference]`
  - Ask the Translator side to unfreeze a box type. `[agent inference]`
  - Link a page with a `QA_3` FAIL to the admin human-check record. `[agent inference]`

## 9. Page view

- One page holds 16 boxes: TS, TL, ED, and QA, each on levels 0 to 3 `[file: translator-process-diagrams.md:251-258]`.
- The person views, for each page:
  - Boxes:
    - The result and the reasoning of each box `[file: translator-design.md:603]`.
    - The inputs of each box, for example the inputs of `TL_2` and `QA_2` `[file: translator-process-diagrams.md:331-353]`.
    - The pair of page p-1 that the box read `[file: translator-process-diagrams.md:261]`.
  - Source text:
    - The NDLOCR-Lite output, for a book `[file: translator-process-diagrams.md:247]`.
    - The page image, for a book `[file: docs/VISION-viewer.md:130]`.
  - Programs. A program makes no model call.
    - The term marks `[file: translator-process-diagrams.md:269]`.
    - The EN form check list, one line per term `[file: translator-process-diagrams.md:270-272]`.
    - The page structure check list: each part found, missing, or moved `[file: translator-process-diagrams.md:273-275]`.
    - The score arithmetic: the cells, the penalty, the page score, and the verdict `[file: translator-process-diagrams.md:412-415]`.
  - Quality check:
    - The QA issues: row, severity, JA piece, EN piece, reason, and suspected stage `[file: translator-process-diagrams.md:408]`.
    - The marks on the lower QA issues, confirmed or false alarm, with a reason `[file: translator-process-diagrams.md:409]`.
  - Memory:
    - The dictionary entries that each box saw `[file: translator-process-diagrams.md:264]`.
    - The book translation memory pairs that each box saw `[file: translator-process-diagrams.md:265]`.
- Costs per call and per page:
  - Unit COST1 writes a cost estimate at `docs/drafts/translator-cost-estimate.md` in the Translator worktree. Its status is in progress `[file: qa-memory-2026-10-25.md:121]`. The file exists now (see the next line).
  - The file did not exist at 14:12 `[check: V-NOTE cp 2026-10-25 14:12]`. This note holds no cost value. The file exists now: `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/docs/drafts/translator-cost-estimate.md`, commit `10da9d5` `[check: VS git log 2026-10-26 13:04]`.
  - A cost line for each call and each page is a view item `[agent inference]`.
- The Viewer research layer holds no reasoning text `[validated reading 2026-10-07 20:05]` `[file: docs/VISION-viewer.md:235]`. The page view above shows reasoning. The conflict is decided: the agent-translation-monitor (named Translator loop pages before round 43) shows the reasoning text of each box, and the research layer stays without it. Round 40 answer 12 `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`.

## 10. Update point view

- An update point starts when the critique count of a box type since its last rewrite reaches N `[accepted option 2026-10-20 08:27]` `[file: translator-process-diagrams.md:546]`.
- The person views:
  - Critiques:
    - The critique queue of each box type, 16 queues `[file: translator-process-diagrams.md:498]`.
    - Each critique with its source (box-critic or reference-diff-critic) and the version tag of the instruction text `[file: translator-process-diagrams.md:489-495]`.
    - The box-critic critiques. The design counts 16 calls per page `[user 2026-10-25 13:56]` "option 1. but I need some estimation of the cost per call." `[file: qa-memory-2026-10-25.md:121]`.
    - The reference-diff-critic critiques, in phase 2 only `[file: translator-process-diagrams.md:488]`.
  - Groups:
    - The groups from the critique-grouper, each with its critiques and pages `[file: translator-process-diagrams.md:552]`.
    - The hard or soft mark of the critique-group-check-judge on each group `[file: translator-process-diagrams.md:554]`.
  - Instruction text:
    - The new text from the prompt-rewrite-optimizer `[file: translator-process-diagrams.md:557]`.
    - The old text and the new text with a diff `[agent inference]`. The version tag rises by one when a new text goes live `[file: translator-process-diagrams.md:568]`.
    - All versions of the text of a box type, each with its diff to the version before `[agent inference]`.
  - Audit:
    - The five checks of the prompt-audit-judge: keeps the role statement, no copied answers, covers each hard critique group, drops no earlier rule, and no conflict with fixed rules `[file: translator-design.md:2208-2213]` (now l2427-2432 at HEAD 2cdb7b3).
    - The verdict. The values ACCEPT and REJECT are an `[agent inference]` `[file: translator-process-diagrams.md:591]`.
    - After a REJECT, one quick retry `[accepted option 2026-10-25 13:56]` "One quick retry" `[file: qa-memory-2026-10-25.md:119]`. The optimizer gets the audit reasons and writes the text once more at once. If the audit rejects again, the old text and the critiques stay `[file: qa-memory-2026-10-25.md:119]`. The text after "One quick retry" in that line is an aki-main note.
  - Freeze state:
    - The freeze state of each box type, as in phase 4 (section 8) `[file: translator-process-diagrams.md:550]`.
  - Rubric tables:
    - The table changes that come from the optimizer of a QA box type at an update point `[file: qa-memory-2026-10-25.md:115]`.
    - The audit result of each table change `[file: qa-memory-2026-10-25.md:115]`.
    - The change list, with the state of each change: live, undone `[file: qa-memory-2026-10-25.md:115]`.
- Interaction points that the Translator design already decides:
  - The owner reads the change list at the end of phase 2 and before each phase 4 lock `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The owner can undo a table change `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:115]`.
  - The audit is the last step before a new instruction text goes live `[accepted recommendation 2026-10-25 10:21]` "Remove, keep the audit (Recommended)" `[file: translator-design.md:2232]` (now l2433 at HEAD 2cdb7b3).
- Interaction points that are proposals only:
  - Pause before an update point and release it by hand. `[agent inference]`
  - Edit an instruction text before the audit. `[agent inference]`
  - Override an audit verdict, in both directions. `[agent inference]`
  - Roll back an instruction text to an earlier version. `[agent inference]`
  - Exclude a critique or a group from one update point. `[agent inference]`
  - Show a warning when a new text and the locked rubric table disagree. `[agent inference]`

## 11. The A4 page decision

- Decision: 40 characters per line, 36 lines, 10.5 pt, 1,440 characters per page `[accepted recommendation 2026-10-25 13:56]` "40 x 36, 10.5 pt (Recommended)" `[file: qa-memory-2026-10-25.md:114]`.
  - The check: 40 x 36 = 1,440 `[check: V-NOTE arithmetic 2026-10-25 14:12]`.
  - The Viewer shares the page `[file: qa-memory-2026-10-25.md:114]`. The words "shared with Viewer" are an aki-main note.
- The Viewer rule `[user 2026-10-07 20:05]` "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines." `[file: docs/VISION-viewer.md:252]`.
  - The rule applies to every article without printed page numbers. Today these are the 313 kendojidai articles `[validated reading 2026-10-07 23:47]` `[file: docs/VISION-viewer.md:254]`. 313 pairs were collected. Dataset 1.1.0 holds 311 articles after 2 exclusions `[file: /Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data/full/dataset/dataset-summary.json:4-8]` `[check: VS grep 2026-10-26 13:04]`.
  - Books keep their printed pages `[validated reading 2026-10-07 23:47]` `[file: docs/VISION-viewer.md:255]`.
  - The page is the unit for the AI label, the admin human-check record, and the research layer `[validated reading 2026-10-07 23:47]` `[file: docs/VISION-viewer.md:257]`.
  - Each translation follows the JA page breaks `[validated reading 2026-10-07 23:47]` `[file: docs/VISION-viewer.md:258]`.
- The Translator uses the same rule for a web article page `[user 2026-10-25 10:21]` "option 1. We talked about this already right?" `[file: translator-design.md:2384]` (now l2605 at HEAD 2cdb7b3) `[file: translator-design.md:2389]` (now l2610 at HEAD 2cdb7b3).
- Link to this part of the Viewer `[agent inference]`:
  - A page number in the translator page view equals the page number in the reader view of the same article.
  - A page of a web article holds at most 1,440 characters of JA text, so the person reads one page in one view.
  - A person can ask about "page 3 of article X" in the same words in the Translator loop and in the reader view.
- Questions that the decision leaves open (section 13):
  - What counts as a character: punctuation, ruby text, and blank lines.
  - What happens when a paragraph ends inside a page.
  - Whether 10.5 pt fixes only the page cut or also the display size. The Viewer lets the reader pick fonts and size `[accepted recommendation 2026-10-07 23:47]` `[file: docs/VISION-viewer.md:125]`.

## 12. Clarity and intuitiveness

- The owner goal, in owner words only `[user 2026-10-25 13:56]`:
  - "optimized UI UX experience, in terms of clarity and  intuitiveness"
  - "view the input, output, diff (and more)"
  - "interacts throughout each phase as designed"
- The quality bar for readers is separate `[user 2026-10-07 14:05]` "Make it like a professional book reading website." `[file: docs/VISION-viewer.md:45]`. The owner did not extend it to this part.
- This note invents no UI design.
- Layout ideas for the Viewer design rounds. Each idea is an `[agent inference]`.
  - One entry for each phase, so the person knows the phase before anything else.
  - Input and output of one box in two panels, so the person compares them without a click. The Viewer already has panels `[file: docs/VISION-viewer.md:54]`.
  - One list of changes with a state for each change: live, undone, or waiting for the audit.
  - Show the reasoning on request, not by default, because the research layer holds no reasoning text.

## 13. Open items

- Owner questions:
  - Which role acts as "the owner" in the steps of sections 4 to 10: the translator, the admin, or both? Decided: both `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`. Round 43 sets the meanings of the roles: see section 15 of this file. Round 44 answer 6 narrows this: only the admin role uses approve, undo, and pause on the agent-translation-monitor `[accepted recommendation 2026-10-26 21:33]` "Admins only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`.
  - Does "interacts" include actions on Translator state, for example undo of a table change? Decided: yes. Approve and undo buttons for Translator state are allowed on the agent-translation-monitor, and the rule "No editing in the Viewer" covers text only `[accepted recommendation 2026-10-25 22:43]` "Rule covers text only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:35]`.
    - The Viewer has no editing for every role. The rule covers the text of works `[accepted option 2026-10-08 07:00]` `[file: docs/VISION-viewer.md:68-69]`. Round 44 answer 5: human translators write their own translation text in the human-translation-view, stored as a separate user translation. The agent output (ED_3) and the JA source stay read-only, and the rule covers readers and agent output `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`.
    - The translation viewing components are read-only `[validated reading 2026-10-08 11:48]` `[file: docs/VISION-viewer.md:141]`. They stay read-only for the text of works. The agent-translation-monitor can hold approve and undo buttons for Translator state `[accepted recommendation 2026-10-25 22:43]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:35]`. Round 44 answer 7: that view is its own view for admins (line 303). Only admins use the buttons (round 44 answer 6, line 297).
  - Does this part show reasoning text? The research layer holds none `[validated reading 2026-10-07 20:05]` `[file: docs/VISION-viewer.md:235]`. Decided: yes, the agent-translation-monitor shows the reasoning text of each box `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`.
  - Which diffs does "diff" mean? Section 5 lists four. Decided: all five, the four of section 5 and the OCR text against the TS text `[accepted option 2026-10-25 22:43]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:37]`.
  - Does this part live inside translation viewing, on the admin pages, or on its own pages? Round 43 state: answer 4 `[user 2026-10-26 15:17]` names a View for Agent Translation Monitoring for the researcher and any admins, apart from the View for Human Translation `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`. The agent-translation-monitor is this view. Round 42 answer 11 `[user 2026-10-26 12:56]` "translation viewing" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:87]`. Decided in round 44 answer 7: the monitor is its own view for admins, next to the human-translation-view. It does not sit inside translation viewing `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`. (Before round 44: whether the monitor sat inside translation viewing was open.) Round 44 answer 9: the admin opens every view `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:138]`. Round 43 answer 11 `[accepted recommendation 2026-10-26 15:17]` "Next.js, React, TS (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:115]` sets the code stack. It does not set the place.
  - Which proposals of sections 4 to 10 does the owner keep? Round 43 state: the kept items are approve and undo on rubric table changes, live runs, pause, the side-by-side change list, the extra items off by default, and the explanation text on request `[accepted recommendation 2026-10-26 15:17]` "Correct (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`. Round 43 answer 5 limits approve and undo to rubric table changes, so the proposals to undo or edit an instruction text (l104, l257, l259) are not kept `[agent inference]`. The comment item (l106) moves to the human-translation-view `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
- Open points that sit in the Translator design: (Partly decided, see l306-309.)
  - The value of N `[file: translator-design.md:772]`. Pilot value: N = 2. The owner wrote "For pilot, set N to 2" `[user 2026-10-25 22:43]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:33]`. The production value stays open (design section 5.4.2).
  - The meaning of K=3 in the freeze test `[file: qa-memory-2026-10-25.md:117]`. Decided: a box type freezes when 3 update points of that box type in a row give no hard critique group. The freeze runs in phase 4 only (design section 7.6.2) `[accepted recommendation 2026-10-25 13:56]`. An update point whose audit rejects twice does not count `[accepted recommendation 2026-10-25 15:45]` `[file: qa-memory-2026-10-25.md:149]`.
  - Which rubric table the write-up uses `[file: translator-design.md:2050]` (now l2149, closed at l2169-2170 at HEAD 2cdb7b3). Decided: the rubric tables as they stand at the end of phase 2 (design section 7.5.5) `[accepted recommendation 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:116]`. Open in design section 7.8: whether that write-up is the final write-up for the paper `[agent inference]`.
  - Whether phases 3 and 4 repeat for each new book `[file: translator-design.md:2409]` (now l2630 and l2640 at HEAD 2cdb7b3). Decided: each target book runs its own phase 3 and phase 4 (design section 7.8, reading 1) `[validated reading 2026-10-25 13:56]` `[file: qa-memory-2026-10-25.md:120]`. This matches line 156. Which books are target books is closed in part (design section 7.7) `[reading pending owner check]`.
- Open points of the A4 decision (section 11): the character count rule and the display size. Round 38 answer 10 sets the cut of the Translator page: lines of 40 characters, each JA block on a new line, 36 lines, and a page break at a line end (design section 7.8) `[accepted recommendation 2026-10-25 15:45]` `[file: qa-memory-2026-10-25.md:147]`. What counts as a character and the display size stay open (lines 276 and 278).
- Closed point of the term "theme": round 38 answer 8 gives "critique group" `[file: qa-memory-2026-10-25.md:145]`. The older line is an aki-main note `[file: qa-memory-2026-10-25.md:131]`.
- The cost estimate of unit COST1 is in progress. This note needs it for the cost view. The cost file exists now: `docs/drafts/translator-cost-estimate.md` on `v2/translator`, commit `10da9d5` `[check: VF git log 2026-10-26 10:53]`. It is a draft, and its numbers wait for the pilot measures `[file: translator-cost-estimate.md:4]`.

## 14. Not verified

- The Translator files changed after the copy of 14:12. Unit V-NOTE did not read later versions. Unit VF read the committed design at `263a9ba` for lines 306 to 312 and 317 only `[check: VF git show 2026-10-26 10:53]`.
- The copies of the Translator design do not yet record round 37. For example, `translator-design.md:2048` (now l2147 at HEAD 2cdb7b3) still lists "who approves a table change in phases 2 and 3" as open. The committed design now records round 37. Section 7.5.5 marks that point "Replaced by round 37 answer 9" `[check: VF git show 2026-10-26 10:53]`.
  - The rule of round 37 answer 9 comes from `qa-memory-2026-10-25.md:115` only. The committed design now records the answer in section 7.5.5 `[file: translator-design.md:2150-2155]` `[check: VS git show HEAD 2cdb7b3 2026-10-26 13:04]`.
- The option text of round 37 answer 9 comes from the aki-main parenthesis in `qa-memory-2026-10-25.md:115`. The full text that the owner saw is Not verified.
- The cost values per call and per page. The cost file did not exist at 14:12. The file exists now: `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/docs/drafts/translator-cost-estimate.md`, commit `10da9d5` `[check: VS git log 2026-10-26 13:04]`.
- The Translator branch and the commit `ff956ef`. Unit V-NOTE read working files and ran no git command in the Translator worktree. The branch `v2/translator` holds `ff956ef` `[check: VS git branch --contains ff956ef 2026-10-26 13:04]`. Unit VS read the design at HEAD 2cdb7b3 `[check: VS git show 2026-10-26 13:04]`.
- Whether the phase 3 and phase 4 rubric tables are shared across books. The sources that unit V-NOTE read do not say. The question is still open in the design at HEAD 2cdb7b3 `[check: VS grep of translator-design.md 2026-10-26 13:04]`. Section 7.5.5 says each target book has its own phase 4 `[file: translator-design.md:2158]`.
- The read of long Translator sections is partial. Unit V-NOTE read sections 3, 4.2, 5, 7.1, 7.2, 7.5, 7.6, and 7.8 of the design, and diagrams 1 to 8 and the update cards. It did not read the worked examples or the prompt templates in full.

## 15. Round 43 state: roles, two views, agent-translation-monitor

- Source: owner answers of round 42 `[user 2026-10-26 12:56]`, round 43 `[user 2026-10-26 15:17]`, and round 44 `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:75-151]`. Unit VD wrote this section `[check: VD 2026-10-26 15:27]`. Unit VR2 added the round 44 answers 5 to 9 `[check: VR2 2026-10-26 21:40]`. Decided items with their quotes and tags are in `docs/VISION-viewer.md` section 15.
- The name "Translator loop pages" is now "agent-translation-monitor" `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`. The first place of the old name in this file (l220) carries the note.
- Role meanings `[user 2026-10-26 15:17]` "this `Comment` refer to comment on the translation content, NOT the agent translation design\nNote: When we refer to `translator`, we are refer to `human-translator`, who task is to translate the content themselves.\nWhen we refer to `admin` we are refering to `researcher` (me), who are working on the agent translation design and running the agent translation process." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
  - In this file, "the translator" and "the owner" in sections 3 to 10 refer to roles that need a new reading. "translator" means human translator and "admin" means researcher `[agent inference]`.
- Two views `[user 2026-10-26 15:17]` "Let be concise so there wont be any confusion in the future.\nFor translator (and admin) role. There are the following view:\n+ View for Human Translation: This is the view for other users that are given the translator role. They will provide furthur translation/editing based on agent translation. Their maybe multiple human translators collaborating on the translation.\n+ View for Agent Translation Monitoring: This is the view for me (and any admins) who work on the agent translation design  and running the agent translation process. (This cover most of the `Translator loop pages` <- just rename this to agent-translation-monitor)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`.
  - Sections 4 to 10 describe the agent-translation-monitor. The human-translation-view has no section in this file.
- Decided items of the monitor: two tabs (Runs first, Books second), seven extra items off by default and saved per account, pause before the next call, read files with a polling browser, Next.js stack, local first. See `docs/VISION-viewer.md` section 15.3 and 15.4.
- Conflicts. Round 44 decided four of the five and settled the fifth in part. See `docs/VISION-viewer.md` section 15.6.
  - Editing against the rule: decided in round 44 answer 5. Human translators write their own translation text in the human-translation-view, stored as a separate user translation. The agent output (ED_3) and the JA source stay read-only `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`. Before round 44, this conflicted with "No editing in the Viewer" (`docs/VISION-viewer.md` l68-69) and with l144 "The translator does not change the text".
  - Who approves: decided in round 44 answer 6. Only the admin role opens the monitor and uses approve, undo, and pause `[accepted recommendation 2026-10-26 21:33]` "Admins only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. Before round 44: round 40 answer 10 `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`, round 42 answer 16, and round 43 answer 5 said the translator and the admin see and do the same.
  - Place of the monitor: decided in round 44 answer 7. The monitor is its own view for admins, next to the human-translation-view `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`. Before round 44: round 42 answer 11 put the monitor inside translation viewing, and round 43 answer 4 named a separate view. Round 45 answer 19 decided the rule "split by task" for the components of translation viewing (`docs/VISION-viewer.md` l139-157) `[accepted recommendation 2026-10-26 22:44]` "Split by task (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:172]`. Round 47 answer 12 decided the placement of Aligned table, Level versions, Verdict and scores, and Transcription fields: all four go to both views `[accepted recommendation 2026-10-27 10:40]` "Aligned table in both views (Recommended), Level versions in both views (Recommended), Verdict and scores in both views (Recommended), Transcription fields in both views (Recommended), Add 3 missing parts to the list (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]`. The same answer added three parts: the own-translation editor, comments, and the kendo term look-up (`docs/VISION-viewer.md` l154-156). The details of the three parts are open in `docs/VISION-viewer.md` section 6 `[reading pending owner check]`.
  - Phone layout: decided in round 44 answer 8. The monitor and the human-translation-view are desktop only. Reader pages keep the phone layout of l192 `[accepted recommendation 2026-10-26 21:33]` "Both translator-role views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:137]`. Before round 44: round 42 answer 16 said "you dont need to bother with phone layout for translation page" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`.
  - Read-only components: settled in part by round 44 answers 5 and 6 `[agent inference]`. The agent output and the JA source stay read-only, and the buttons of the monitor are for admins only. Whether l141 "read-only components" needs a new wording for the buttons is open `[reading pending owner check]`.
- Open item: the metadata database for items (round 43 answer 6). See `docs/VISION-viewer.md` section 15.7.
- Admin access and role-to-view map, round 44 answer 9. The admin opens every view, which are reader pages, human-translation-view, agent-translation-monitor, and admin pages `[accepted recommendation 2026-10-26 21:33]` "Yes, admins see all (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:138]`. The map is in `docs/VISION-viewer.md` section 15.2. Unit VR2 wrote this line `[check: VR2 2026-10-26 21:40]`.
- Not verified: the full option text of round 44 answers 5 to 9. The Q-A file holds the labels and the notes of aki-main only.
