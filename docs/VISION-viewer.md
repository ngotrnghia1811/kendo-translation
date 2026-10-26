# MAC-RAG Translation: vision (Viewer)

## 1. Header

- Status: approved by the owner `[accepted option 2026-10-08 11:48]` "Approve as is". Committed in `8a9dced` on `v2/viewer`. The commit is on all three v2 branches: `v2/base`, `v2/viewer`, and `v2/translator`. The Viewer research files are on all three v2 branches since `ab8d3f2` and the merge `3e3b311` `[file: .opencode/reminders/plan/evolving-plan-2026-10-13.md:15]`.
  - Round 18 added content to sections 3, 4, 6, 11, 13, and 14. The owner sees those lines before the commit `[file: .opencode/reminders/qa/qa-memory-2026-10-08.md:58]`.
  - Round 20 added content to sections 6 and 13 `[file: .opencode/reminders/qa/qa-memory-2026-10-09.md:20]`.
  - This draft is the next Viewer document `[accepted recommendation 2026-10-08 07:00]` "Draft VISION-viewer.md next (Recommended)".
  - The file stayed untracked until the owner approved it `[file: .opencode/reminders/plan/evolving-plan-2026-10-08.md:11]`.
  - Round 21 validated the three meanings in section 6 and asked for this header fix `[accepted recommendation 2026-10-09 19:49]` "Correct, fix and commit (Recommended)".
- Commit plan, done (see Status). After owner approval, commit this file and `docs/VISION.md` in one commit on `v2/viewer`, fast-forward `v2/base`, merge into `v2/translator`, and do not push `[accepted recommendation 2026-10-08 11:48]` "Commit after approval (Recommended)".
  - The order of branches comes from the round 18 record `[file: .opencode/reminders/qa/qa-memory-2026-10-08.md:48]`.
  - The file reaches `v2/base` as a separate file `[accepted recommendation 2026-10-07 10:55]` "Separate file on v2/base (Recommended)".
  - The commit follows the Translator commit flow `[accepted recommendation 2026-10-07 10:55]` "Same flow (Recommended)".
  - The Translator flow merges into both v2 branches and does not push `[file: .opencode/reminders/qa/qa-memory-2026-10-02.md:168]`.
  - The same commit carries the tag fix in `docs/VISION.md` `[accepted recommendation 2026-10-08 07:00]` "Fix with the Viewer commit (Recommended)".
- Process: owner statements, then one articulation per point, then owner validation, then a draft from validated points only `[accepted recommendation 2026-10-07 20:05]` "Accept this process (Recommended)".
  - This file has no PROPOSALS section. Proposals appear only if the owner asks `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:92]`.
- Sources:
  - The owner Q-A record in the project folder `/Users/nghiango-mbp/projects/kendo-translation` `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:3]`:
    - `.opencode/reminders/qa/qa-memory-2026-10-02.md`, rounds 1 to 11 (round 11 carries the date 2026-10-05).
    - `.opencode/reminders/qa/qa-memory-2026-10-07.md`, rounds 12 to 16.
    - `.opencode/reminders/qa/qa-memory-2026-10-08.md`, rounds 17 to 19.
    - `.opencode/reminders/qa/qa-memory-2026-10-09.md`, rounds 20 and 21.
  - The articulation draft `docs/drafts/viewer-vision-articulation.md`, revision 2, Part A `[file: docs/drafts/viewer-vision-articulation.md:16]`.
- Legend
  - `[user YYYY-MM-DD HH:MM]`: words that the owner typed. The quote is verbatim, typos and double spaces included.
  - `[accepted recommendation YYYY-MM-DD HH:MM]`: an agent option label with "(Recommended)" that the owner picked. The quote is the label. It is not owner words.
  - `[accepted option YYYY-MM-DD HH:MM]`: an agent option label without "(Recommended)" that the owner picked. The quote is the label. It is not owner words.
  - `[validated reading YYYY-MM-DD HH:MM]`: an aki-main reading that the owner marked correct. The quote is the owner answer.
  - `[file: path:line]`: a fact from a project file. Paths that start with `.opencode/` are in the project folder.
  - `[agent inference]`: an agent reading that the owner did not validate.
- Conventions
  - A tag without a quote shares the quote of the nearest earlier tag with the same name, date, and time in the same section.
  - A literal `\n` or `\"` in a quote is how the Q-A memory stores the answer `[file: docs/drafts/viewer-vision-articulation.md:124]`.
  - The owner rule on tags `[user 2026-10-07 20:05]` "`\"Viewer shows Translator output (Recommended)` is your recommendation that I accept, not `my words`".

## 2. Goal

- The Viewer has two objectives. The owner first message is the primary source `[user 2026-10-07 20:05]` "Viewer focus on two objection:\n+ Best user reading experience and efficiency\n+ user Flexible and customizable UI for reading components".
- Objective 1, reading experience `[validated reading 2026-10-07 23:47]` "Correct reading (Recommended)".
  - The text sits at the center. Controls stay hidden until the reader needs them `[validated reading 2026-10-07 23:47]`.
  - The path goes dashboard, then work, then page, with no dead ends `[validated reading 2026-10-07 23:47]`.
  - Kendo terms are highlighted, and one click shows the definition from the kendo dictionary (section 8) `[validated reading 2026-10-07 23:47]`.
  - The quality bar `[user 2026-10-07 14:05]` "Make it like a professional book reading website."
- Objective 1, efficiency has four meanings `[accepted recommendation 2026-10-07 23:47]` "Fast loading (Recommended), Fast lookup (Recommended), Fast comparison (Recommended), Few steps (Recommended)".
  - Fast loading: pages open fast, also on a phone or a slow network `[accepted recommendation 2026-10-07 23:47]`.
  - Fast lookup: a one-click term pop-up, and search across all works and all languages `[accepted recommendation 2026-10-07 23:47]`.
  - Fast comparison: a tap on a sentence marks its pair in the other panels, and the panels scroll together `[accepted recommendation 2026-10-07 23:47]`.
  - Few steps: two clicks from the dashboard to the text, and the reader resumes the last page on any device `[accepted recommendation 2026-10-07 23:47]`.
  - The owner did not pick fast work for translator and admin `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:123]`.
- Objective 2, a flexible and customizable UI for reading components `[validated reading 2026-10-07 23:47]` "Correct reading (Recommended)".
  - A *component* is one item in the list that the reader checks, for example a text in one language (section 7) `[validated reading 2026-10-07 23:47]`.
  - A *panel* is one screen area that holds one component `[validated reading 2026-10-07 23:47]`.
    - aki-main marked this definition as an inference when the owner validated it `[file: docs/drafts/viewer-vision-articulation.md:29]`.
  - Section 7 holds the customization rules `[validated reading 2026-10-07 23:47]`.

## 3. Place in v2, scope and exclusions

- The Viewer is a new app that starts empty `[accepted recommendation 2026-10-02 19:20]` "New app, live stays v1 (Recommended)".
- Place in v2 `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
  - No v1 code or v1 decision carries over, except the three roles of section 4 `[validated reading 2026-10-07 20:05]`.
  - The live site stays v1 until the owner names a switch date `[validated reading 2026-10-07 20:05]`.
- Order of work `[user 2026-10-07 14:05]` "Work on viewer vision -> desgin of both -> then code".
  - The design phase starts with the Translator `[accepted option 2026-10-07 14:58]` "Translator design first". Round 39 update: the owner asked for Viewer work during the Translator tests and design polish `[user 2026-10-25 21:47]` "We should start working on viewer while testing Translator and polishing its design" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:13]`. Round 40 decision: the owner picked option 1 `[user 2026-10-25 22:43]` "OPtion 1." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:38]`. Option 1 is "Design now, code later (Recommended)". The Viewer design starts now, in parallel with the Translator tests and the Translator design polish. Viewer code waits until both designs are done.
  - The shared output format of the two apps is decided in the design phase `[validated reading 2026-10-07 20:05]`.
- Exclusions:
  - The Viewer has no editing, for every role `[accepted option 2026-10-08 07:00]` "No editing in the Viewer".
    - The rule covers the text of works. Only the admin role opens the admin pages (section 4) `[accepted recommendation 2026-10-08 11:48]` "Admin pages in the Viewer (Recommended)". Round 40 answer 11: the rule covers text only `[accepted recommendation 2026-10-25 22:43]` "Rule covers text only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:35]`. Nobody edits the text of works in the Viewer. Approve and undo buttons for Translator state, for example rubric table changes and instruction text changes, are allowed on the Translator loop pages. Where these pages live stays open (section 13 of `docs/drafts/viewer-translator-loop-notes.md`). Round 40 answer 10: the translator role and the admin role both act as "the owner" in the Translator loop steps, for example approving a change list and undo `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`.
  - No licence work. The round 11 licence answer covers the Viewer `[accepted recommendation 2026-10-07 14:58]` "Same answer covers the Viewer (Recommended)".
    - Round 11 licence answer `[user 2026-10-05 23:48]` "option 4. you dont have to bother about the license/permission/etc".
  - No link to the blog post now `[accepted recommendation 2026-10-07 14:58]` "No link now (Recommended)".
    - The owner picked this list of later items as option 1 `[user 2026-10-07 20:05]` "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines."

## 4. Readers and roles

- Readers are the public, in all languages `[validated reading 2026-10-07 20:05]` "option 1. Also admin have to validate reader signup before they can actually view the contents".
  - Audience `[accepted recommendation 2026-10-02 19:40]` "Public readers (Recommended)".
  - No language group comes first `[user 2026-10-07 14:05]` "Reader across ALL languages".
- Every person signs in, and three roles exist `[user 2026-10-07 14:58]` "all users need sign in - 3 roles (reader - translator - admin) like in v1".
  - A reader reads, picks components, and reports problems `[validated reading 2026-10-07 20:05]`.
  - A translator and an admin also see the research layer and the scores (section 11) `[validated reading 2026-10-07 20:05]`.
  - No role edits text in the Viewer (section 3) `[accepted option 2026-10-08 07:00]` "No editing in the Viewer".
- Sign-up `[user 2026-10-07 20:05]` "option 1. Also admin have to validate reader signup before they can actually view the contents".
  - Any member of the public signs up and gets a reader account. This is option 1 `[validated reading 2026-10-07 20:05]`.
  - An admin approves each sign-up before the reader can view content `[user 2026-10-07 20:05]`.
  - An admin gives the translator and admin roles `[validated reading 2026-10-07 20:05]`.
- Admin pages `[accepted recommendation 2026-10-08 11:48]` "Admin pages in the Viewer (Recommended)".
  - The Viewer has separate admin pages. Only the admin role opens them `[accepted recommendation 2026-10-08 11:48]`.
  - The admin pages hold the sign-up approval and the human-check record (section 11) `[accepted recommendation 2026-10-08 11:48]`.
  - Reading pages stay read-only `[accepted recommendation 2026-10-08 11:48]`.
  - The rule "No editing in the Viewer" covers the text of works (section 3) `[accepted recommendation 2026-10-08 11:48]`.
- Before approval, the person sees the dashboard index but no text `[accepted option 2026-10-07 23:47]` "Dashboard index, no text".
  - The person sees work titles and translation progress, but cannot open any text `[accepted option 2026-10-07 23:47]`.

## 5. Content

- The content scope in the owner words `[user 2026-10-07 14:05]` "Refer to previous question about reading components. Reader can have diffent component options for the same languagues (i.e., EN-original, EN-translated)".
  - The owner wants this scope as stated `[user 2026-10-07 14:58]` "EXACTLY AS I SAID. YOU DONT UNDERSTAND BECAUSE YOU JUST HALLUCINATE THE WHOLE VISION docs".
- The Viewer shows Translator output `[accepted recommendation 2026-10-02 19:40]` "Viewer shows Translator output (Recommended)".
  - Human versions are reader components next to the Translator output `[user 2026-10-07 14:05]` "Reader can have diffent component options for the same languagues (i.e., EN-original, EN-translated)".
- Three EN kinds exist `[validated reading 2026-10-08 07:00]` "Correct reading (Recommended)".
  - Names `[user 2026-10-07 20:05]` "Need to specif `EN-translated` to `EN-trans-human` (human translation), and `EN-trans-machine` (machine translation)".
  - EN-original: a work first written in English `[user 2026-10-07 23:47]` "option 1. but EN-original mean the item is originally written in English".
  - EN-trans-human: a human translation that exists outside the project, for example the kendojidai EN of the 313 article pairs `[validated reading 2026-10-08 07:00]`. 313 article pairs were collected. Dataset 1.1.0 holds 311 after 2 exclusions `[file: kendo-translation-translator/data/full/dataset/dataset-summary.json]` `[check: VF 2026-10-26 10:53]`.
  - EN-trans-machine: the Translator output, that is, the `ED_3` text `[validated reading 2026-10-08 07:00]`.
  - The kendojidai EN is not EN-original `[validated reading 2026-10-08 07:00]`.
- EN-original items `[accepted recommendation 2026-10-08 07:00]` "Name the kind, no items now (Recommended)".
  - The vision names the kind `[accepted recommendation 2026-10-08 07:00]`.
  - No EN-original item enters the Viewer now `[accepted recommendation 2026-10-08 07:00]`.
- EN-trans-human with changed facts `[accepted recommendation 2026-10-07 23:47]` "As published, facts marked (Recommended)".
  - The reader sees the EN-trans-human text as kendojidai published it `[accepted recommendation 2026-10-07 23:47]`.
  - A mark on each changed fact shows the JA fact `[accepted recommendation 2026-10-07 23:47]`.
- Languages `[user 2026-10-07 20:05]` "Correct, plus JA interface".
  - Content `[accepted recommendation 2026-10-07 14:58]` "Audience all, content EN first (Recommended)".
    - Content arrives EN first, then ZH, KO, and VI, per work `[validated reading 2026-10-07 20:05]` "Correct, plus JA interface".
    - Coverage goes per work `[accepted recommendation 2026-10-07 14:05]` "EN first, coverage per work (Recommended)".
  - Interface: English first, then other interface languages arrive with their content `[accepted recommendation 2026-10-07 14:58]` "English first, then with content (Recommended)".
    - The interface also comes in Japanese `[user 2026-10-07 20:05]` "Correct, plus JA interface".
  - The JA source is always a component `[validated reading 2026-10-07 20:05]`.

## 6. Types of viewing and components

- The Viewer serves all types of viewing `[user 2026-10-07 14:05]` "Viewer focus on the VIEWING  experience first. Be VIEWING  I mean ALL TYPES of VIEWING - single language viewing, bilingual viewing, raw data view, translation viewing, etc Make it like a professional book reading website."
- Types named from v1 `[user 2026-10-07 23:47]` "Single language (Recommended), Bilingual pairing (Recommended), Focus mode (Recommended), Themes, fonts, size (Recommended), Aligned table (Recommended), Original page view (Recommended)".
  - The owner asked aki-main to check v1 for these types `[user 2026-10-07 20:05]` "option 1. also check v1 for different mode of viewing contents".
  - The owner did not pick tap to reveal or two-column width `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:126]`.
- Single language and bilingual pairing `[user 2026-10-07 23:47]`.
- Raw data view is the original Japanese source `[accepted recommendation 2026-10-07 14:58]` "Original Japanese source (Recommended)".
  - For a book: a page image plus JA text with ruby `[validated reading 2026-10-07 20:05]` "option 1. also check v1 for different mode of viewing contents".
  - For an article: the JA text `[validated reading 2026-10-07 20:05]`.
- Focus mode, themes, fonts and size, and the aligned table `[user 2026-10-07 23:47]`.
- Original page view, page by page `[validated reading 2026-10-08 07:00]` "option 1. Also note: the item pdfs (in universal-agents) are very large (they are high-resolution scans), we should be able to siginifcantly compress the pdfs without reducing quality".
  - Owner words `[user 2026-10-07 23:47]` "for option 4, need a better solution. v1 basically load the whole book from ggdrive, so user have to wait. User should be able to view page-by-page efficiently".
  - The original page view stays `[validated reading 2026-10-08 07:00]`.
  - One page opens at once, with no wait for the whole book `[validated reading 2026-10-08 07:00]`.
  - v1 loaded the whole book from Google Drive first `[validated reading 2026-10-08 07:00]`.
  - Storage and serving of the pages are a design-phase matter (section 13) `[validated reading 2026-10-08 07:00]`.
- Translation viewing `[user 2026-10-08 07:00]` "I mean viewing components for translator".
- The reading of translation viewing `[validated reading 2026-10-08 11:48]` "Correct reading (Recommended)".
  - Translation viewing is a group of read-only components for the translator and admin roles only `[validated reading 2026-10-08 11:48]`.
  - The group sits in the same component checklist as the reader components (section 7) `[validated reading 2026-10-08 11:48]`.
  - Readers do not see the group `[validated reading 2026-10-08 11:48]`.
  - The translator inspects the Translator output. The translator does not change the text `[validated reading 2026-10-08 11:48]`.
- The components of the group:
  - Aligned table `[accepted recommendation 2026-10-08 11:48]` "Aligned table (Recommended)".
    - The aligned table is the type from v1 in the list above. The owner placed it in the translator group `[accepted recommendation 2026-10-08 11:48]`.
  - Level versions `[accepted recommendation 2026-10-08 11:48]` "Level versions ED_0 to ED_3 (Recommended)".
    - The translator sees the `ED_0` to `ED_3` texts, one under the other `[accepted recommendation 2026-10-08 11:48]`.
  - Verdict and scores `[accepted recommendation 2026-10-08 11:48]` "QA_3 verdict and scores (Recommended)".
    - The translator sees the `QA_3` verdict in words and the numeric scores (section 11) `[accepted recommendation 2026-10-08 11:48]`.
  - Transcription fields `[accepted option 2026-10-08 11:48]` "Transcription fields of books".
    - For books, the translator sees the page image next to the output fields of the TS stage: captions, running heads, page numbers, and ruby `[accepted option 2026-10-08 11:48]`.
  - The owner did not pick links to the paired dataset or the reasoning text `[file: .opencode/reminders/qa/qa-memory-2026-10-08.md:43]`. Round 40 answer 12 puts the reasoning text on the Translator loop pages `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`. Whether those pages sit inside translation viewing is open `[file: docs/drafts/viewer-translator-loop-notes.md:303]`.
- Example from the project, shown to the owner with the reading `[validated reading 2026-10-08 11:48]`:
  - Pair 252, record `b5106cae-44f6-4a27-a91f-8c75312fcce9`. The JA sentence holds 世界選手権大会団体優勝4回.
  - The translator sees the `ED_0` to `ED_3` EN texts of that sentence, one under the other, and the `QA_3` verdict in words.
  - The EN-trans-human text says "team title 3 times". Its fact mark shows the JA fact 4.
- Viewing types added for "etc" `[user 2026-10-08 14:04]` "Option 1. when i write `etc`, it means you should suggest any relevant appropriate options to add."
  - The owner picked three types and one wish from the agent suggestions `[file: .opencode/reminders/qa/qa-memory-2026-10-09.md:20]`.
  - Print and export view `[accepted option 2026-10-09 09:26]` "Print and export view".
    - A clean page of the chosen components, for print or for export to a file `[validated reading 2026-10-09 19:49]` "Correct, fix and commit (Recommended)".
  - Version history view `[accepted option 2026-10-09 09:26]` "Version history view".
    - Earlier versions of a page text with their dates, tied to the change log (section 10) `[validated reading 2026-10-09 19:49]`.
  - Vertical JA view `[accepted recommendation 2026-10-09 09:26]` "Vertical JA view (Recommended)".
    - The JA text set in vertical writing (tategaki), as in the printed source `[validated reading 2026-10-09 19:49]`.
  - Linked page image, an owner wish `[user 2026-10-09 09:26]` "I want to do option 2. but LLM-based TS doesnt have region position".
    - A tap on a sentence shows its region on the page image, and the reverse `[file: .opencode/reminders/qa/qa-memory-2026-10-09.md:21]`.
    - Open point: LLM-based TS output has no region positions `[user 2026-10-09 09:26]`.
    - The link needs a source of region positions `[agent inference]`.
    - The Translator design topic on the TS output format decides this point (section 13) `[accepted recommendation 2026-10-09 09:26]` "TS output format (Recommended)".

## 7. Reader customization

- The reader builds the reading screen from components `[user 2026-10-07 14:05]` "Reader should be able to customize their reading experience, including able to customize their UI: add/remove components (raw images, text in different languages, ruby, bilingual pairing, etc) - these components should be a list that reader checks to selects. User should also able to move, resize, hide, show, etc customize their panels"
- The reading is correct `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
- The component list `[validated reading 2026-10-07 23:47]` "Correct reading (Recommended)":
  - Page image of the original, for books only `[validated reading 2026-10-07 23:47]`.
  - JA source text `[validated reading 2026-10-07 23:47]`.
  - Ruby `[validated reading 2026-10-07 23:47]`.
  - EN-trans-human and EN-trans-machine `[validated reading 2026-10-07 23:47]`.
  - ZH, KO, and VI text, when each arrives `[validated reading 2026-10-07 23:47]`.
  - Bilingual pairing `[validated reading 2026-10-07 23:47]`.
  - Kendo term highlights `[validated reading 2026-10-07 23:47]`.
- The reader checks components in the list `[validated reading 2026-10-07 23:47]`.
- The reader moves, resizes, hides, and shows panels `[validated reading 2026-10-07 23:47]`.
- The reader picks components first, before reading `[accepted option 2026-10-07 14:58]` "Reader picks first".
- The layout is saved per account, across all devices `[accepted option 2026-10-07 14:58]` "Per account, all devices".
- Phones are in scope, with a simpler layout `[accepted recommendation 2026-10-07 14:58]` "In scope, simpler layout (Recommended)".

## 8. Kendo terms

- Highlight and pop-up `[user 2026-10-07 14:05]` "option 1, also highlight the term. when reading ,user can click the term of pop-up definition of the term".
  - The romanized term stays in the text and is highlighted `[validated reading 2026-10-07 20:05]` "option 1. Also there is and extended dictionary here: /Users/nghiango-mbp/Downloads/kendo_dictionary_update_2.md and /Users/nghiango-mbp/Downloads/kendo_dictionary_update.md".
  - One click opens a pop-up definition from the kendo dictionary, in the language of the text `[validated reading 2026-10-07 20:05]`.
- Source `[user 2026-10-07 14:58]` "From the kendo dictionary. check v1 for all the kendo dictionary sources".
- The kendo dictionary is three files `[user 2026-10-07 23:47]` "option 1. I think option 1 is also v1".
  - `kendo_dict.md` from v1 `[user 2026-10-07 23:47]`.
  - `/Users/nghiango-mbp/Downloads/kendo_dictionary_update.md` `[user 2026-10-07 20:05]` "/Users/nghiango-mbp/Downloads/kendo_dictionary_update.md".
  - `/Users/nghiango-mbp/Downloads/kendo_dictionary_update_2.md` `[user 2026-10-07 20:05]` "/Users/nghiango-mbp/Downloads/kendo_dictionary_update_2.md".
- VI and KO definitions for the supplement terms are a gap. The vision states the gap and decides it later `[accepted recommendation 2026-10-07 23:47]` "State the gap, decide later (Recommended)".

## 9. Dashboard and search

- The home page is a dashboard `[user 2026-10-07 14:05]` "option 3. and dashboard homepage should be an index of all current items (in category folds)  and their translation progresses."
- The reading is correct `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
- The dashboard lists every work, also at zero progress `[accepted recommendation 2026-10-07 14:58]` "Every work, also at zero (Recommended)".
- Folds go by kind (books, articles), then by series or source `[accepted recommendation 2026-10-07 14:58]` "Kind, then series or source (Recommended)".
- Progress per language is the finished share `[accepted recommendation 2026-10-07 14:58]` "Finished share per language (Recommended)".
  - "Finished" means a final `ED_3` text with a `QA_3` verdict `[validated reading 2026-10-07 20:05]`.
- Search covers all works in all languages `[accepted recommendation 2026-10-07 14:58]` "All works, all languages (Recommended)".
  - Search also covers romanized terms `[validated reading 2026-10-07 20:05]`.

## 10. Reader feedback

- One "report a problem" path `[accepted recommendation 2026-10-07 14:05]` "One "report a problem" path (Recommended)".
  - The report has a reason list and a comment `[accepted recommendation 2026-10-07 14:58]` "Reason list plus comment (Recommended)".
- The reading is correct `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
- Reports are logged only, for now `[user 2026-10-07 14:05]` "option 3 for now. We will go through the feedback processing later".
- Status and change log `[accepted recommendation 2026-10-07 14:05]` "Public status and change log (Recommended)".
  - The status shows "Received" now. An admin adds values later `[accepted recommendation 2026-10-07 14:58]` "\"Received\" now, more later (Recommended)".
  - Each work has a public change log with dates `[validated reading 2026-10-07 20:05]`.
  - Every signed-in user sees the statuses and the change log `[validated reading 2026-10-07 20:05]`.

## 11. Research layer, scores, and the AI label

- The reading of this point is correct, with one owner addition `[validated reading 2026-10-07 20:05]` "Correct, admin only records".
- Research layer `[user 2026-10-07 14:05]` "option 1. also only available to translator and admin roles".
  - Readers never see the research layer `[validated reading 2026-10-07 20:05]`.
  - Translator and admin see a closed layer per page or passage `[validated reading 2026-10-07 20:05]`.
  - Content `[accepted recommendation 2026-10-07 14:05]` "Verdict and level versions (Recommended)":
    - the `QA_3` verdict `[accepted recommendation 2026-10-07 14:05]`,
    - the `ED` text of levels 0 to 3 `[accepted recommendation 2026-10-07 14:58]` "ED text per level (Recommended)",
    - the numeric scores `[validated reading 2026-10-07 20:05]`.
  - The layer holds no reasoning text `[validated reading 2026-10-07 20:05]`. Round 40 answer 12: the Translator loop pages show the reasoning text of each box `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`. The research layer stays as validated, with no reasoning text.
- Numeric scores `[user 2026-10-07 14:05]` "only show to translator and admin".
- The AI label is item metadata `[validated reading 2026-10-08 07:00]` "Correct reading (Recommended)".
  - Owner words `[user 2026-10-07 23:47]` "This should be the item metadata, together with item's title, author, origin language, etc".
  - The AI label is one field of the item metadata, next to the title, the author, the origin language, and other fields `[validated reading 2026-10-08 07:00]`.
  - It is not a checklist panel. A reader cannot hide it. Every user sees it `[validated reading 2026-10-08 07:00]`.
- Label content `[accepted recommendation 2026-10-07 14:58]` "AI plus human check status (Recommended)".
  - The label shows AI translation plus the human check status `[accepted recommendation 2026-10-07 14:58]`.
  - Every work and page carries the label `[accepted recommendation 2026-10-07 14:05]` "Label per work and page (Recommended)".
  - Place of the label `[accepted recommendation 2026-10-08 11:48]` "Work block plus page line (Recommended)".
    - The AI label field in the work metadata block gives a summary, for example "AI translation, human check: 12 of 40 pages" `[accepted recommendation 2026-10-08 11:48]`.
    - Each page has a short page metadata line, for example "AI translation, human check: not yet" `[accepted recommendation 2026-10-08 11:48]`.
  - Only an admin records that a human checked a page `[user 2026-10-07 20:05]` "Correct, admin only records".
  - Human versions carry no AI label `[validated reading 2026-10-07 20:05]`.

## 12. Pages for articles without printed page numbers

- The A4 rule `[user 2026-10-07 20:05]` "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines."
- The reading of the rule `[validated reading 2026-10-07 23:47]` "Correct reading (Recommended)".
  - The rule applies to every article without printed page numbers. Today, these are the 313 kendojidai articles `[validated reading 2026-10-07 23:47]`. 313 article pairs were collected. Dataset 1.1.0 holds 311 after 2 exclusions `[file: kendo-translation-translator/data/full/dataset/dataset-summary.json]` `[check: VF 2026-10-26 10:53]`.
  - Books keep their printed pages `[validated reading 2026-10-07 23:47]`.
  - The JA original is split into pages by the line count of an A4 page `[validated reading 2026-10-07 23:47]`.
  - The page is the unit for the AI label, the admin human-check record, and the research layer `[validated reading 2026-10-07 23:47]`.
  - Each translation follows the JA page breaks `[validated reading 2026-10-07 23:47]`.
  - The line count and the font size are set in the design phase `[validated reading 2026-10-07 23:47]`. Decided: 40 characters per line, 36 lines, 10.5 pt, 1,440 characters per page `[accepted recommendation 2026-10-25 13:56]` "40 x 36, 10.5 pt (Recommended)".

## 13. Open, decided later

- Resolved: section 6 lists the viewing types added for "etc" `[user 2026-10-08 14:04]` "Option 1. when i write `etc`, it means you should suggest any relevant appropriate options to add."
- Region positions for the linked page image, decided with the TS output format (section 6) `[accepted recommendation 2026-10-09 09:26]` "TS output format (Recommended)".
- VI and KO definitions for the supplement terms of the kendo dictionary `[accepted recommendation 2026-10-07 23:47]` "State the gap, decide later (Recommended)".
- Design-phase items `[user 2026-10-07 14:05]` "Work on viewer vision -> desgin of both -> then code".
  - The shared output format of the Translator and the Viewer `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
  - The A4 line count and the font size for article pages `[validated reading 2026-10-07 23:47]` "Correct reading (Recommended)". Decided: 40 characters per line, 36 lines, 10.5 pt, 1,440 characters per page `[accepted recommendation 2026-10-25 13:56]` "40 x 36, 10.5 pt (Recommended)".
  - The article page unit `[accepted recommendation 2026-10-07 14:58]` "Decide in the design phase (Recommended)".
  - Storage and serving of original page images `[validated reading 2026-10-08 07:00]` "option 1. Also note: the item pdfs (in universal-agents) are very large (they are high-resolution scans), we should be able to siginifcantly compress the pdfs without reducing quality".
    - Design-phase note on PDF compression, owner words `[user 2026-10-08 07:00]` "Also note: the item pdfs (in universal-agents) are very large (they are high-resolution scans), we should be able to siginifcantly compress the pdfs without reducing quality".
- Switch date of the live site from v1 to v2: the owner names it `[validated reading 2026-10-07 20:05]` "Correct reading (Recommended)".
- Feedback processing is a later topic `[user 2026-10-07 14:05]` "We will go through the feedback processing later".
  - More status values come later `[accepted recommendation 2026-10-07 14:58]` "\"Received\" now, more later (Recommended)".

## 14. Where to read more

- References are for reference and adoption only `[user 2026-10-02 07:50]` "We simple want to refer, and if relevant, adopt from their work."
  - This document does not compare the project with them `[user 2026-10-02 07:50]` "WE DO NOT CARE ABOUT RESULTS FROM OTHER PAPERS."
- The Viewer register: `docs/research/viewer/surveys.md`, version 2 `[file: docs/research/viewer/surveys.md:5]`.
- The register, the references, the five summaries, and the survey draft are on all v2 branches `[accepted option 2026-10-10 14:57]` "Fast-forward anyway" `[accepted recommendation 2026-10-11 05:38]` "Move Viewer register (Recommended)".
  - `docs/research/sources/` stays git-ignored `[file: .gitignore:3]`.
- Tier 1 holds five items `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:45]`:
  - LAIT (Ferstler et al. 2026): `docs/research/summaries/LAIT_lossless.md` `[file: docs/research/viewer/surveys.md:59]`.
  - BookTranslate.ai "The System": `docs/research/summaries/BookTranslateSystem_lossless.md` `[file: docs/research/viewer/surveys.md:60]`.
  - Sefaria help pages: `docs/research/summaries/SefariaHelp_lossless.md` `[file: docs/research/viewer/surveys.md:61]`.
  - SuttaCentral interface wiki: `docs/research/summaries/SuttaCentralInterface_lossless.md` `[file: docs/research/viewer/surveys.md:62]`.
  - Wikisource Help:Page status: `docs/research/summaries/WikisourcePageStatus_lossless.md` `[file: docs/research/viewer/surveys.md:63]`.
