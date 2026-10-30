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
  - The design phase starts with the Translator `[accepted option 2026-10-07 14:58]` "Translator design first". Round 39 update: the owner asked for Viewer work during the Translator tests and design polish `[user 2026-10-25 21:47]` "We should start working on viewer while testing Translator and polishing its design" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:13]`. Round 40 decision: the owner picked option 1 `[user 2026-10-25 22:43]` "OPtion 1." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:38]`. Option 1 is "Design now, code later (Recommended)". The Viewer design starts now, in parallel with the Translator tests and the Translator design polish. Viewer code waits until both designs are done. Round 42 decision: the owner picked "Design a topic, then code it (Recommended)" `[accepted recommendation 2026-10-26 12:56]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. Each Viewer topic goes design, owner check, then code. The first topic is the agent-translation-monitor (named Translator loop pages before round 43). The code stack is a later design point. This settles the conflict between round 40 answer 14 and round 41 answer 16 `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:66]`.
  - The shared output format of the two apps is decided in the design phase `[validated reading 2026-10-07 20:05]`.
- Exclusions:
  - The Viewer has no editing for readers and for agent output `[accepted option 2026-10-08 07:00]` "No editing in the Viewer". (Before round 44: the rule read "for every role".) Round 44: human translators write and edit their own translation text in the human-translation-view. The Viewer stores it as a separate translation per user `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:148]`. It never updates the agent translation. The agent output (ED_3) and the JA source stay read-only `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]` (section 15.6).
    - The rule covers the text of works. Only the admin role opens the admin pages (section 4) `[accepted recommendation 2026-10-08 11:48]` "Admin pages in the Viewer (Recommended)". Round 40 answer 11: the rule covers text only `[accepted recommendation 2026-10-25 22:43]` "Rule covers text only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:35]`. Nobody edits the agent output or the JA source in the Viewer (round 44, see the first line of this list). Approve and undo buttons for Translator state, for example rubric table changes and instruction text changes, are allowed on the agent-translation-monitor. Round 44 answer 7: the agent-translation-monitor is its own view for admins, next to the human-translation-view `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]` (before round 44: where this view lives was open, section 13 of `docs/drafts/viewer-translator-loop-notes.md`). Round 40 answer 10: the translator role and the admin role both act as "the owner" in the Translator loop steps, for example approving a change list and undo `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`. Round 43 narrows the first sentence of this line: approve and undo act on rubric table changes only, not on instruction text `[accepted recommendation 2026-10-26 15:17]` "Correct (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]` (section 15.3). (Before round 44: the line also said the translator and the admin act the same, and round 43 answer 4 said the agent-translation-monitor is for admins.) Round 44 answer 6: only the admin role opens the agent-translation-monitor and uses approve, undo, and pause. Human translators do not see it `[accepted recommendation 2026-10-26 21:33]` "Admins only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]` (section 15.6).
  - No licence work. The round 11 licence answer covers the Viewer `[accepted recommendation 2026-10-07 14:58]` "Same answer covers the Viewer (Recommended)".
    - Round 11 licence answer `[user 2026-10-05 23:48]` "option 4. you dont have to bother about the license/permission/etc".
  - No link to the blog post now `[accepted recommendation 2026-10-07 14:58]` "No link now (Recommended)".
    - The owner picked this list of later items as option 1 `[user 2026-10-07 20:05]` "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines."

## 4. Readers and roles

- Readers are the public, in all languages `[validated reading 2026-10-07 20:05]` "option 1. Also admin have to validate reader signup before they can actually view the contents".
  - Audience `[accepted recommendation 2026-10-02 19:40]` "Public readers (Recommended)".
  - No language group comes first `[user 2026-10-07 14:05]` "Reader across ALL languages".
- Every person signs in, and three roles exist `[user 2026-10-07 14:58]` "all users need sign in - 3 roles (reader - translator - admin) like in v1". Round 43 role meanings `[user 2026-10-26 15:17]` "this `Comment` refer to comment on the translation content, NOT the agent translation design\nNote: When we refer to `translator`, we are refer to `human-translator`, who task is to translate the content themselves.\nWhen we refer to `admin` we are refering to `researcher` (me), who are working on the agent translation design and running the agent translation process." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`: "translator" means human translator, and "admin" means researcher (section 15.1). Round 50 answer 12 adds real sign-in now, with a password, and asks to reuse the test users of v1 `[user 2026-10-27 20:54]` "option 2. we have test user in v1 right? can we reuse them?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:33]`. The option text "real sign-in with a password" comes from the brief of unit D2 and is Not verified in the Q-A file. Round 51 answer 2 decides the method: a local PocketBase with the v1 setup files, and the four v1 test accounts created again `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]` (sections 15.10.4 and 15.11.6). History: the method was open. The process to replace v1 on https://kendotranslation.com/ is open (unit DB1).
  - A reader reads, picks components, and reports problems `[validated reading 2026-10-07 20:05]`.
  - A translator and an admin also see the research layer and the scores (section 11) `[validated reading 2026-10-07 20:05]`.
  - No role edits the agent translation (ED_3 and all box results) or the JA source in the Viewer (section 3) `[accepted recommendation 2026-10-27 01:16]` "Fix VISION-viewer line 83 (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:11]`. Human translators write their own translation in the human-translation-view. The Viewer stores it as a separate translation per user. It never overwrites the agent translation `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`. Round 45 answer 1 asked for this fix `[accepted recommendation 2026-10-26 22:44]` "Accept, fix line 83 (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:154]`. History: this line read "No role edits text in the Viewer" `[accepted option 2026-10-08 07:00]` "No editing in the Viewer". Round 44 answer 5 replaces that decision for human translators.
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
  - Translation viewing is a group of read-only components for the translator and admin roles only `[validated reading 2026-10-08 11:48]`. Round 43 splits translation viewing into two views (section 15.2). Round 44: the owner named the view of the human translator human-translation-view, so the name "translation viewing" gives way to it `[agent inference]` `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`. The agent-translation-monitor is its own view for admins. Its approve, undo, and pause buttons are for admins only `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. The human translator writes their own translation text, and the agent output stays read-only (section 15.6). Round 45 answer 19 decided the rule "split by task": each component goes to the view whose task needs it `[accepted recommendation 2026-10-26 22:44]` "Split by task (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:172]`. The full option text is Not verified. The list below holds the placement of each component. The tasks of the human-translation-view are: read the agent translation, write their own translation, comment on the content, and look up kendo terms `[reading pending owner check]`. The tasks of the agent-translation-monitor are: watch runs, compare stage results ED_0 to ED_3, read box reasoning and critiques, see costs and calls, pause, and approve or undo rubric table changes `[reading pending owner check]`. A component that both tasks need goes to both views `[reading pending owner check]`. Each placement below carries the tag of its source. A placement without a decided source carries `[reading pending owner check]`.
  - The group sits in the same component checklist as the reader components (section 7) `[validated reading 2026-10-08 11:48]`.
  - Readers do not see the group `[validated reading 2026-10-08 11:48]`.
  - The translator inspects the Translator output. The translator does not change the agent translation (ED_3 and all box results) or the JA source `[agent inference]`. The translator writes and edits their own translation text in the human-translation-view. The Viewer stores it as a separate user translation `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]` (section 15.6). History: this line read "The translator does not change the text" `[validated reading 2026-10-08 11:48]`. Round 43 said a human translator translates and edits content in the human-translation-view `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`. Round 44 answer 5 replaces the 2026-10-08 reading for human translators.
- The components of the group, with the view that holds each one (rule: round 45 answer 19, "split by task" `[accepted recommendation 2026-10-26 22:44]`, section 15.2):
  - Aligned table `[accepted recommendation 2026-10-08 11:48]` "Aligned table (Recommended)".
    - The aligned table is the type from v1 in the list above. The owner placed it in the translator group `[accepted recommendation 2026-10-08 11:48]`. View: both `[accepted recommendation 2026-10-27 10:40]` "Aligned table in both views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). Task in the human-translation-view: write their own translation next to the JA text and the agent translation. Task in the agent-translation-monitor: compare stage results `[agent inference]`.
  - Level versions `[accepted recommendation 2026-10-08 11:48]` "Level versions ED_0 to ED_3 (Recommended)".
    - The translator sees the `ED_0` to `ED_3` texts, one under the other `[accepted recommendation 2026-10-08 11:48]`. View: both `[accepted recommendation 2026-10-27 10:40]` "Level versions in both views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). In the agent-translation-monitor, all four levels serve the task compare stage results ED_0 to ED_3 `[agent inference]`. In the human-translation-view, the `ED_3` text serves the task read the agent translation. Whether that view also shows `ED_0` to `ED_2` is open `[reading pending owner check]`.
  - Verdict and scores `[accepted recommendation 2026-10-08 11:48]` "QA_3 verdict and scores (Recommended)".
    - The translator sees the `QA_3` verdict in words and the numeric scores (section 11) `[accepted recommendation 2026-10-08 11:48]`. View: both `[accepted recommendation 2026-10-27 10:40]` "Verdict and scores in both views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). The owner did not choose "Verdict and scores on the monitor only". This agrees with the owner words of section 11 `[user 2026-10-07 14:05]` "only show to translator and admin" and with the note of aki-main `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:44]`. Tasks: in the agent-translation-monitor, watch runs and compare stage results. In the human-translation-view, read the agent translation `[agent inference]`.
  - Transcription fields `[accepted option 2026-10-08 11:48]` "Transcription fields of books".
    - For books, the translator sees the page image next to the output fields of the TS stage: captions, running heads, page numbers, and ruby `[accepted option 2026-10-08 11:48]`. View: both `[accepted recommendation 2026-10-27 10:40]` "Transcription fields in both views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). In the human-translation-view, the page image and the JA text with ruby serve the task write their own translation. In the agent-translation-monitor, the TS output fields serve the task compare stage results `[agent inference]`.
  - Own-translation editor `[accepted recommendation 2026-10-27 10:40]` "Add 3 missing parts to the list (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). View: human-translation-view. Each human translator writes an own translation. The Viewer stores it per user, apart from the agent translation, and never over it `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]` (round 44 answer 5, section 15.6). Round 50 answers 8 and 9: one box per JA sentence, the box starts empty, and a button on each row copies the agent ED_3 text of that row into the box `[accepted recommendation 2026-10-27 20:54]` "One box per JA sentence (Recommended)", "Empty, with a copy button (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:29-30]`. Detail is in section 15.10. Round 51 decides these open points. Answer 7: a version is saved on a click on Save, and every saved version stays with its time `[user 2026-10-28 08:21]` "Option 1. But user have to click save to save it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:52]`. Answer 8: a row shows the ED_3 text of the newest finished run, and the admin can mark one run `[user 2026-10-28 08:21]` "Newest by default, but admin can mark one when needed." `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]`. Answer 8 also adds a panel with the inputs of TL_3 next to the ED_3 text, and the user can hide the panel `[user 2026-10-28 08:21]` "We want human-translation to access the same information as TL_3 agent when it translations. Show these information (including the retrieved information) along side with ED_3 text (user can hide them later)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]`. Answer 6: PocketBase records store the text `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. Detail is in section 15.11. The database design is open (unit DB1).
  - Comments `[accepted recommendation 2026-10-27 10:40]` "Add 3 missing parts to the list (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). View: human-translation-view, because a comment is on the translation content (section 15.5). Round 50 answer 10: a comment attaches to one sentence row, and the writer chooses per comment whether to share it `[user 2026-10-27 20:54]` "option 1. but user can choose whether to share comments or not" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:31]`. Detail is in section 15.10. Round 51 answers 10 and 11: a comment starts private, the writer edits it, and the admin reads all comments, also private ones. The writer is not told `[accepted recommendation 2026-10-28 08:21]` "Writer edits, starts private (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:55]` `[user 2026-10-28 08:21]` "option 2. this is just a translation app. you dont need to tell writer about it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:56]` (section 15.11.5). Answer 6: PocketBase records store comments `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The database design is open (unit DB1). Delete of a comment is open `[reading pending owner check]`.
  - Kendo term look-up `[accepted recommendation 2026-10-27 10:40]` "Add 3 missing parts to the list (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]` (round 47 answer 12). View: human-translation-view `[reading pending owner check]`. The look-up uses the kendo dictionary of section 8, with the term highlight and the pop-up definition. Round 50 answer 11: the Viewer highlights the kendo terms that the run found (stored marks) in the JA text and in the agent text, and a click opens the termbase entry in all languages. One-character terms that the run skipped get no highlight `[accepted recommendation 2026-10-27 20:54]` "Highlight from stored marks (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:32]`. Detail is in section 15.10. Round 51 answer 12: a mark with result `breaks` or a note gets the same highlight on the JA side only `[accepted recommendation 2026-10-28 08:21]` "Same highlight, JA side (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:57]`. Round 51 answer 14: the pop-up shows the first definition with the agent-written mark, and the user can expand the pop-up to show the full entry `[user 2026-10-28 08:21]` "option 1. but user can expand the popup to show full" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:59]`.
  - The owner did not pick links to the paired dataset or the reasoning text `[file: .opencode/reminders/qa/qa-memory-2026-10-08.md:43]`. Round 40 answer 12 puts the reasoning text on the agent-translation-monitor `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`. Round 44 answer 7: that view is its own view for admins and does not sit inside translation viewing `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]` (before round 44: this was open `[file: docs/drafts/viewer-translator-loop-notes.md:303]`). Round 43 splits translation viewing into two views (section 15.2). Placement: the reasoning text goes to the agent-translation-monitor only. Task: read box reasoning and critiques. The two answers above decide this placement.
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
- Phones are in scope, with a simpler layout `[accepted recommendation 2026-10-07 14:58]` "In scope, simpler layout (Recommended)". Round 42 answer 16 says no phone layout is needed for the translation page `[user 2026-10-26 12:56]` "you dont need to bother with phone layout for translation page" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 44 answer 8 settles the conflict. The agent-translation-monitor and the human-translation-view are desktop only. Reader pages keep the phone layout of this line `[accepted recommendation 2026-10-26 21:33]` "Both translator-role views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:137]` (section 15.6).

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
  - The layer holds no reasoning text `[validated reading 2026-10-07 20:05]`. Round 40 answer 12: the agent-translation-monitor shows the reasoning text of each box `[accepted recommendation 2026-10-25 22:43]` "Loop pages show it (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:36]`. The research layer stays as validated, with no reasoning text.
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
- Design-phase items `[user 2026-10-07 14:05]` "Work on viewer vision -> desgin of both -> then code". Round 43 open items: the conflicts and the item metadata database are in sections 15.6 and 15.7.
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

## 15. Round 43 decisions: roles, two views, agent-translation-monitor

- Source: owner answers of round 42 `[user 2026-10-26 12:56]`, round 43 `[user 2026-10-26 15:17]`, and round 44 `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:75-151]`. Unit VD wrote this section `[check: VD 2026-10-26 15:27]`. Unit VR2 added the round 44 answers 5 to 9 `[check: VR2 2026-10-26 21:40]`.
  - The Q-A file stores the label of each accepted option and a short note by aki-main. A detail after a label comes from the unit VD brief or the unit VR2 brief. The full option text is Not verified `[agent inference]`.
  - The name "Translator loop pages" became "agent-translation-monitor" in round 43 `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`. Sections 3, 6, and 11 use the new name.
- 15.1 Role meanings `[user 2026-10-26 15:17]` "this `Comment` refer to comment on the translation content, NOT the agent translation design\nNote: When we refer to `translator`, we are refer to `human-translator`, who task is to translate the content themselves.\nWhen we refer to `admin` we are refering to `researcher` (me), who are working on the agent translation design and running the agent translation process." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
  - "translator" means human translator, a person who translates the content themselves.
  - "admin" means researcher, the owner, who works on the agent translation design and runs the agent translation process.
  - Older lines of this file that say translator or admin use these meanings from now on `[agent inference]`.
- 15.2 Two views `[user 2026-10-26 15:17]` "Let be concise so there wont be any confusion in the future.\nFor translator (and admin) role. There are the following view:\n+ View for Human Translation: This is the view for other users that are given the translator role. They will provide furthur translation/editing based on agent translation. Their maybe multiple human translators collaborating on the translation.\n+ View for Agent Translation Monitoring: This is the view for me (and any admins) who work on the agent translation design  and running the agent translation process. (This cover most of the `Translator loop pages` <- just rename this to agent-translation-monitor)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`.
  - View for Human Translation: the view for users who have the translator role. They give further translation and editing based on the agent translation. Several human translators can work together on one translation. Round 44 name: human-translation-view `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`.
  - View for Agent Translation Monitoring: the view for the researcher and any admins. It covers most of the former pages and has the name agent-translation-monitor.
  - Human translators use the human-translation-view. Admins use the agent-translation-monitor `[user 2026-10-26 15:17]`. Round 44 answer 7: the agent-translation-monitor is its own view for admins, next to the human-translation-view `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`.
  - Round 44 answer 9 decides whether an admin opens the human-translation-view. The admin opens every view. These are reader pages, human-translation-view, agent-translation-monitor, and admin pages `[accepted recommendation 2026-10-26 21:33]` "Yes, admins see all (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:138]`. (Before round 44 this was open. The owner wrote "For translator (and admin) role".) Role-to-view map: the reader opens the reader pages `[agent inference]`. The translator (human translator) opens the reader pages and the human-translation-view `[agent inference]`. The admin opens all views `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:138]`. Round 44 answer 6 closes the agent-translation-monitor to human translators `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`.
  - The owner wrote that the monitor covers "most of" the former pages. Round 45 answer 19 decided the rule "split by task" `[accepted recommendation 2026-10-26 22:44]` "Split by task (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:172]`. The list in section 6 holds the placement of each component. The placements carry `[reading pending owner check]` unless a decided answer names them.
- 15.3 Decided items of the agent-translation-monitor. Each item names its source.
  - Approve and undo cover rubric table changes only, not instruction text. Round 42 answer 15 `[user 2026-10-26 12:56]` "1. No\n2. the program\nAlso you need to provide proper recommendation option for theses questions" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:91]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` "Correct (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`.
  - The program locks the rubric tables at the start of phase 4. The monitor has no lock button. Same sources as the line above.
  - The monitor also shows live runs. Round 42 answer 16 `[user 2026-10-26 12:56]` "Also live" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`.
  - The change list shows the old and the new text side by side. Round 42 answer 16 `[user 2026-10-26 12:56]` "old and new side by side" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`.
    - The list has 10 fields: change ID, QA box type, phase, update point, row, kind of change, text before, text after, critiques behind the change, and audit result `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]` `[file: kendo-translation-translator/docs/drafts/translator-design.md:2163-2165]` `[check: VD 2026-10-26 15:27]`.
  - (Before round 44: the translator and the admin see and do the same, and the admin has admin functions in addition.) Round 42 answer 16 `[user 2026-10-26 12:56]` "admin just have extra admin function" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`. Round 44 answer 6 replaces the same-actions part: only the admin role opens the monitor and uses approve, undo, and pause `[accepted recommendation 2026-10-26 21:33]` "Admins only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]` (section 15.6).
  - The bar "professional book reading website" and the bar of clarity and intuitiveness apply to the monitor. Round 42 answer 16 `[user 2026-10-26 12:56]` "yes" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`. The quote of the first bar is in section 2 `[user 2026-10-07 14:05]` "Make it like a professional book reading website."
  - Explanation text, the reasoning text of each box, shows on request. Round 42 answer 16 `[user 2026-10-26 12:56]` "on request" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Round 43 answer 5 `[accepted recommendation 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:109]`.
  - The first view has two tabs, Runs first and Books second. Each tab has full width, and one click switches the tab. Round 43 answer 6 `[user 2026-10-26 15:17]` "option 1." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:110]`, which is the option "Two tabs (Recommended)". Round 42 answer 12 `[user 2026-10-26 12:56]` "list of runs and list of books" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:88]`.
  - Seven extra items are off by default. The user ticks an item to show it. Round 42 answer 13 `[user 2026-10-26 12:56]` "all of them, off by default, user can tick to show thme" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`.
    - The seven items: cost and seconds per call, exact text sent to each box, dictionary and aligned memory hits, failed and flagged calls, program check results, critiques with the note for the next critic, and critique counts against N `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`.
    - The ticks are saved with the account for every page and device, as for the layout in section 7. Round 43 answer 7 `[accepted recommendation 2026-10-26 15:17]` "Saved per account (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:111]`.
  - Pause: the Viewer writes a pause file into the list folder of the run. The run program checks for the file before each new model call. Running calls finish. Resume deletes the file. Round 43 answer 8 `[accepted recommendation 2026-10-26 15:17]` "Pause before next call (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:112]`. Round 42 answer 14 `[user 2026-10-26 12:56]` "pause,  write a comment" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:90]`. Round 44 answer 6: only the admin role uses pause `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`.
  - Live data: a small local server reads `progress.json` and the page folders of the Translator. The browser polls every few seconds. Round 43 answer 10 `[accepted recommendation 2026-10-26 15:17]` "Read files, refresh often (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:114]`.
- 15.4 Technical decisions. The owner answered these for the Viewer. They came with the monitor questions. Whether they cover the whole Viewer is an `[agent inference]`.
  - Code stack: Next.js, React, TypeScript, and Tailwind. The stack is chosen fresh for v2, because no v1 decision carries over (section 3). No database and no hosting yet. History: round 51 answer 6 sets PocketBase records as the storage `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]` (section 15.11.6). The Viewer reads the files in the Translator `data/` folder. Round 43 answer 11 `[accepted recommendation 2026-10-26 15:17]` "Next.js, React, TS (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:115]`. Tailwind is Not verified in the Q-A line.
  - Local first: the Viewer runs on the owner Mac only and reads files directly. Sign-in with the 3 roles and hosting come later with the reader pages. Round 43 answer 12 `[accepted recommendation 2026-10-26 15:17]` "Local first (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:116]`. History: round 50 answer 12 asks for real sign-in now, with a password, and asks to reuse the test users of v1 `[user 2026-10-27 20:54]` "option 2. we have test user in v1 right? can we reuse them?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:33]`. Round 51 answer 2 decides the method: a local PocketBase with the v1 setup files, and the four v1 test accounts created again `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]` (section 15.11.6). History: this line set local first and hosting later. Round 51 answer 6 asks for deployment soon `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The deployment design and the process to replace v1 are open (unit DB1).
- 15.5 Comments `[user 2026-10-26 15:17]` "this `Comment` refer to comment on the translation content, NOT the agent translation design\nNote: When we refer to `translator`, we are refer to `human-translator`, who task is to translate the content themselves.\nWhen we refer to `admin` we are refering to `researcher` (me), who are working on the agent translation design and running the agent translation process." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
  - A comment is a comment on the translation content. It is not a comment on the agent translation design.
  - So comments belong to the human-translation-view, not to the agent-translation-monitor. Round 42 answer 14 `[user 2026-10-26 12:56]` "pause,  write a comment" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:90]` and the aki-main note `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:124]`.
  - History: where a comment is stored and who reads it were open `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:100]`. Round 51 decides both: PocketBase records store comments (answer 6), and the admin reads all comments (answer 11) (sections 15.10.2 and 15.11.5).
- 15.6 Conflicts. Round 44 decided four of the five and settled the fifth in part. Items that stay open are marked `[reading pending owner check]`.
  - Editing against the rule. Decided in round 44 answer 5 `[user 2026-10-26 21:33]` "option 1. Human translation are stored as separate user's translation, not an update of agent translation" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`. Human translators write and edit their own translation text in the human-translation-view. The agent output (ED_3) and the JA source stay read-only. The rule "No editing in the Viewer" now covers readers and agent output (sections 3 and 6). Before round 44: human translators translate and edit content in the View for Human Translation `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:108]`. Section 3 said "No editing in the Viewer" `[accepted option 2026-10-08 07:00]`. Section 6 said "The translator does not change the text" `[validated reading 2026-10-08 11:48]`.
  - Who approves. Decided in round 44 answer 6 `[accepted recommendation 2026-10-26 21:33]` "Admins only (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. Only the admin role opens the agent-translation-monitor and uses approve, undo, and pause. Human translators do not see it. Before round 44: round 40 answer 10 `[accepted recommendation 2026-10-25 22:43]` "Translator and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:34]`, round 42 answer 16, and round 43 answer 5 said the translator and the admin see and do the same. Round 43 answer 4 said the agent-translation-monitor is for the researcher and admins.
  - Place of the monitor. Decided in round 44 answer 7 `[user 2026-10-26 21:33]` "option 1. but name the other human-translation-view" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`. The agent-translation-monitor is its own view for admins, next to the human-translation-view. Before round 44: round 42 answer 11 `[user 2026-10-26 12:56]` "translation viewing" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:87]` put it inside translation viewing. Round 43 answer 4 named a separate View for Agent Translation Monitoring. Round 45 answer 19 decided the rule "split by task" for the components of the group in section 6 `[accepted recommendation 2026-10-26 22:44]` "Split by task (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:172]`. The placement of each component is in section 6 `[reading pending owner check]`.
  - Phone layout. Decided in round 44 answer 8 `[accepted recommendation 2026-10-26 21:33]` "Both translator-role views (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:137]`. The agent-translation-monitor and the human-translation-view are desktop only. Reader pages keep the phone layout of section 7. Before round 44: section 7 said phones are in scope with a simpler layout `[accepted recommendation 2026-10-07 14:58]`. Round 42 answer 16 said "you dont need to bother with phone layout for translation page" `[user 2026-10-26 12:56]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:92]`. Whether this covered both views was open.
  - Read-only components. Settled in part by round 44 answers 5 and 6 `[agent inference]`. The agent output (ED_3) and the JA source stay read-only in the human-translation-view `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`. The approve, undo, and pause buttons are for admins only `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. Whether the words "read-only components" in section 6 need a new wording for the buttons of the monitor is open `[reading pending owner check]`. Before round 44: section 6 said translation viewing is a group of "read-only components" `[validated reading 2026-10-08 11:48]`. The monitor has approve, undo, and pause buttons. The View for Human Translation has editing.
- 15.7 Open item: metadata database for items. Round 43 answer 6 `[user 2026-10-26 15:17]` "option 1.\nAlso can you create a metadata database for the items (books, articles, etc)\ncurrent pdf name is just short name.\nMetadata should consist of: title, author, and some optional fields such as (publish year, Synopsis, etc)\nMOst of the metadata should be in the first few page (some time last few page)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:110]`.
  - The request covers books and articles. Fields: title, author, and optional fields such as publish year and synopsis. The owner says the current pdf name is only a short name.
  - Most of the metadata sits in the first pages of a book and sometimes in the last pages `[user 2026-10-26 15:17]`.
  - The database feeds the dashboard index (section 9) and the Books tab of the monitor (section 15.3). The AI label is already one field of the item metadata (section 11).
  - Another unit (MD) makes a draft inventory now. The schema is not decided `[agent inference]`.
- 15.8 Round 44 decisions: roles and views. Unit VR2 wrote this index `[check: VR2 2026-10-26 21:40]`. The details sit in the lines of sections 3, 6, 7, 15.2, 15.3, and 15.6.
  - Answer 5, editing: human translators write their own translation text, stored as a separate user translation `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`.
  - Answer 6, who approves, undoes, and pauses: admins only `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`.
  - Answer 7, place of the monitor: its own view, next to the human-translation-view `[user 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:136]`.
  - Answer 8, phone layout: both translator-role views are desktop only `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:137]`.
  - Answer 9, admin access: the admin opens every view `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:138]`.
  - The Q-A file stores the labels and the notes of aki-main. The full option text of answers 5 to 9 comes from the unit VR2 brief and is Not verified in the Q-A file.
  - Open after round 44, state after round 46: round 45 answer 19 decided the rule "split by task" `[accepted recommendation 2026-10-26 22:44]` "Split by task (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:172]`. Round 47 answer 12 decided the placement of Aligned table, Level versions, Verdict and scores, and Transcription fields: all four go to both views `[accepted recommendation 2026-10-27 10:40]` "Aligned table in both views (Recommended), Level versions in both views (Recommended), Verdict and scores in both views (Recommended), Transcription fields in both views (Recommended), Add 3 missing parts to the list (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:34]`. The same answer added three parts to the list in section 6: the own-translation editor, comments, and the kendo term look-up. The details of the three parts are open in section 6 `[reading pending owner check]`. Which part of the former pages falls outside the monitor (section 15.2) follows that placement `[reading pending owner check]`. The line "No role edits text in the Viewer" in section 4 was stale after answer 5 `[agent inference]`. Round 46 answer 8 fixed it (section 4, line 83) `[accepted recommendation 2026-10-27 01:16]` "Fix VISION-viewer line 83 (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:11]`.
- 15.9 Round 48 answer 9: chain run screens of the agent-translation-monitor. Unit V2 wrote this section `[check: V2 2026-10-27 16:44]`. Lines 318 and 319 keep the decision of seven extra items. This section adds two items.
  - Source: owner answer 9 of round 48 `[accepted recommendation 2026-10-27 16:18]` "V2 Viewer for chain runs (Recommended), M2 magazine data fix (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:55]`. The Q-A file stores the label only. The option text comes from the unit V2 brief and is Not verified in the Q-A file: the Viewer shows the chain state per book, skipped pages, the book translation memory pairs, the previous page pair, the critic mode and the session turn, the compare table, the web candidates per chapter, and the Books Details part loaded on request.
  - Source for the web parts: round 48 answer 7 `[accepted option 2026-10-27 16:18]` "One web article per entry" `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:53]`. The note of aki-main says that only the best web match links to a table of contents entry `[reading pending owner check]` `[file: .opencode/reminders/qa/qa-memory-2026-10-27.md:60]`.
  - The run view of a chain list shows the list kind, the critic mode, and the book jobs. It shows a table with one row for each book, a skipped reason for each page that did not run, and the forward failures apart from the critic failures `[agent inference]`.
  - The run view also shows the book translation memory pairs of each book, grouped by page, and the compare table of the two critic modes `[agent inference]`. The Runs tab shows the list kind, the critic mode, and the book jobs in one column `[agent inference]`.
  - The page view shows the critic mode and the session turns in its header. Two new Extra detail items sit in the menu, off at start like the seven decided items: "Chain inputs" and "Critic-only runs" `[agent inference]`. Round 42 answer 13 named only seven items `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`. The owner has not decided items 8 and 9 `[reading pending owner check]`.
  - The Books tab loads the Details part of one item on request. A magazine chapter shows its articles with the key `web_link` and the candidate list of the web rows that point at the chapter, with the link status `[agent inference]`.
  - Placement: all of these parts go to the agent-translation-monitor only. The human-translation-view has no task that needs them (section 6, task rule "split by task") `[agent inference]`.
  - The parts only read files. The pause file stays the only write of the Viewer `[file: app/README.md]`.

### 15.10 Human-translation-view parts (round 50)

- Source: owner answers 8 to 13 of round 50 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:29-34]`. Unit D2 wrote this section `[check: D2 2026-10-27 21:10]`.
  - The Q-A file stores the label of each accepted option and a note by aki-main. The option texts come from the brief of unit D2. They are Not verified in the Q-A file.
  - The design process of round 42 answer 9 applies: design a topic, then code it `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. Round 50 answer 13: the code follows these docs in the same round, and the code unit asks clarifying questions first `[user 2026-10-27 20:54]` "option 2. ask clarifying question if needed" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:34]`.
  - Section 6 holds the short form of each decision (the lines for the own-translation editor, comments, and kendo term look-up). This section holds the detail.
  - Nothing in this section exists in code today. The Viewer shows ED lines one by one and has no sign-in `[file: app/README.md]` `[file: app/components/PageText.tsx:20-46]`.

#### 15.10.1 Own-translation editor

- Rows are the sentence groups of the book translation memory. The owner chose one box per JA sentence `[accepted recommendation 2026-10-27 20:54]` "One box per JA sentence (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:29]`.
  - The rule of the Translator: body lines of TS_3 join until a line ends a sentence with 。, ！, or ？. A closing mark 」, 』, or ） can follow the end mark. A title (block_title) is a group of its own `[file: kendo-translation-translator/data/scripts/translator/book_memory.py:59-98]`.
  - Running heads, page numbers, captions, and figures make no group `[file: kendo-translation-translator/data/scripts/translator/book_memory.py:72-80]` `[agent inference]`.
  - The EN side of a row is the ED_3 items that cite the TS_3 lines of the group. An ED_3 item that cites lines of two groups goes to the first group. A group with no EN item makes no pair `[file: kendo-translation-translator/data/scripts/translator/book_memory.py:101-132]`.
- Each row shows four things: the JA text of the group, the agent ED_3 text of the group, an own translation box, and a copy button `[accepted recommendation 2026-10-27 20:54]` "Empty, with a copy button (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:30]`.
  - The box starts empty. The button copies the agent ED_3 text of that row into the box. The translator can then edit the copy.
  - The agent files never change. The own translation is stored per translator per page, apart from the agent files `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:134]`.
- Number of rows. The current book memory file of the long run holds 3 to 6 pairs per page, with 10 to 280 JA characters per pair `[check: D2 2026-10-27 21:05 python3 count by page_id in book-memory/left_foot_full.jsonl and book-memory/kendojidai_2014.jsonl]`. Unit T2 gave 3 to 4 groups per OCR page and 75 to 310 JA characters. The file does not agree with that range.
  - The rule gives more rows when many lines end with 。. The page kendojidai_2014/p0839 gives 21 groups and 21 pairs, with 0 skipped `[check: D2 2026-10-27 21:04 python3 -B, book_memory.cut_pairs on TS_3 and ED_3 after_program_step]`.
  - The number of rows is not fixed. The editor must not assume a small number of rows per page `[agent inference]`.
- Decided in round 51 answer 8: a row shows the ED_3 text of the newest finished run, and the admin can mark one run for a page `[user 2026-10-28 08:21]` "Newest by default, but admin can mark one when needed." `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]` (section 15.11.4). Before round 51: the run whose ED_3 text a row shows, when a page has several runs, was open. Today 23 page folders hold more than one run folder, and most of those extra folders are plan runs `[check: D2 2026-10-27 21:04 python3 listing of results/ED_3.json by page folder]`.
- Decided in round 51: PocketBase records store the own translations (answer 6) `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The Viewer keeps every saved version with its time, and a version is saved on a click on Save (answer 7) `[user 2026-10-28 08:21]` "Option 1. But user have to click save to save it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:52]` (sections 15.11.3 and 15.11.6). Before round 51: the storage place and the number of saved versions were open.
- Decided in round 51 answer 15: a group with no EN item (no pair) gets a row with an empty agent text `[user 2026-10-28 08:21]` "option 1. but why would the EN translation be  missing? the system should have been designed to address this?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:60]` (section 15.11.7). The cause of a missing EN item is open (unit S1R). Before round 51: whether such a group gets a row was open.

#### 15.10.2 Comments

- A comment is on the translation content. It is not on the agent translation design `[user 2026-10-26 15:17]` "this `Comment` refer to comment on the translation content, NOT the agent translation design" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
- A comment attaches to one sentence row. The writer chooses per comment whether to share it `[user 2026-10-27 20:54]` "option 1. but user can choose whether to share comments or not" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:31]`.
  - Shared comment: all translators and the admin read it `[reading pending owner check]`.
  - Private comment: the writer and the admin read it `[user 2026-10-28 08:21]` "option 2. this is just a translation app. you dont need to tell writer about it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:56]`. History: this line read "only the writer reads it" `[reading pending owner check]`.
  - Decided in round 51 answer 11: the admin reads all comments, also private ones. The writer is not told `[user 2026-10-28 08:21]` "option 2. this is just a translation app. you dont need to tell writer about it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:56]`. Before round 51: this was open.
- Decided in round 51: PocketBase records store comments (answer 6). The writer edits own comments, and a new comment starts private (answer 10) `[accepted recommendation 2026-10-28 08:21]` "Writer edits, starts private (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:55]` (section 15.11.5). Delete of a comment stays open `[reading pending owner check]`. Before round 51: the storage place, edit and delete of a comment, and the default of the share choice were open.
- v1 facts. The v1 migration has a collection `segment_comments` with the fields `content`, `resolved`, `parent_comment_id`, `mentions`, `segment`, and `user`. Anyone can list and view it. Only the writer can update a comment. The writer or an admin can delete it `[file: kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123456_initial_schema.js:481-503]`.
  - The v1 collection has no field for shared or private `[file: kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123456_initial_schema.js:481-503]`.
  - v1 has no collection for a human translation that one translator keeps apart from the agent text. The migrations hold `segment_suggestions` and `segment_revisions` per segment `[check: D2 2026-10-27 21:04 grep of the v1 migrations for human_translation, user_translation, suggestion, and comment]`.
  - No v1 code carries over (section 3). The v1 fields are only a reference `[agent inference]`.

#### 15.10.3 Kendo term look-up

- The Viewer highlights the kendo terms that the run found, in the JA text and in the agent text. A click opens the termbase entry in all languages `[accepted recommendation 2026-10-27 20:54]` "Highlight from stored marks (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:32]`.
- Source of the highlight: two files in the `programs` folder of the run folder of the page, for example `kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/programs/`.
  - `term_marks.ED_3.json` holds the marks. A mark has the fields `entry_id`, `surface`, `source`, `ja`, `en`, and `mark_id`.
  - `ja` holds `item_id`, `start`, and `end`. `en` holds `item_id`, `start`, `end`, `explained`, and `found`. `en` is null when the check found no EN form.
  - `en_form_check.ED_3.json` holds the items of the EN form check. An item has the fields `row_id`, `term`, `entry_id`, `source`, `en_form`, `common`, `use`, `required`, `result`, `detail`, and `ja_item`.
  - The `result` value is `follows`, `breaks`, or `note`. A `note` means that a common term has no EN term in the text `[file: kendo-translation-translator/data/scripts/translator/programs.py:498]`. The file of p0839 holds `follows` and `breaks` only `[check: D2 2026-10-27 21:04 python3 count of result in en_form_check.ED_3.json]`.
- Place of a mark. `ja.start` and `ja.end` are character offsets in the text of the TS_3 item `ja.item_id`. `en.start` and `en.end` are character offsets in the text of the ED_3 item `en.item_id`.
  - Check: in p0839, the mark M01 gives characters 5 to 7 of `kendojidai_2014/p0839/ts3/L03`, which are 剣道. It gives characters 13 to 18 of `kendojidai_2014/p0839/ed3/L03`, which are `Kendō` `[check: D2 2026-10-27 21:04 python3 slice of the two item texts]`.
  - The field `found` holds the longer EN form `Kendō (the way of the sword)`. The offsets cover only the word `Kendō`.
  - A row of the editor finds its marks through the item IDs of its lines. A line belongs to one sentence group through `ts_ids` and `ja_refs` `[agent inference]`.
- The pop-up shows the termbase entry with the same `entry_id`. The file is `kendo-translation-translator/data/termbase/termbase.draft.jsonl` and holds 1030 entries `[check: D2 2026-10-27 21:03 wc -l]`.
  - An entry has these keys: `id`, `langSec`, `x-headword`, `x-readings`, `x-romaji`, `x-romaji-preferred`, `x-common`, `x-sections`, `x-decisions`, `x-flags`, `x-records`, `x-senseNote`, `crossReference`, `note`, and `subjectField` `[check: D2 2026-10-27 21:03 python3 keys of the entry c-fefdc125669e]`.
  - `langSec` has one section per language. A section holds `termSec` (terms, with `preferredTerm-admn-sts` or `admittedTerm-admn-sts`) and `definition` (texts). The entry for 剣道 has the languages ja, en, zh, vi, and ko. The entry for 抜き面 has ja, en, and zh only `[check: D2 2026-10-27 21:03]`.
  - The pop-up content is the headword, the reading, the romaji, and for each language the preferred term and the definition text `[agent inference]`. A language that the entry lacks shows no section `[agent inference]`.
- No highlight:
  - One-character terms that the run skipped, for example 面 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:41]`. The page search skips a headword of one character `[file: kendo-translation-translator/data/scripts/translator/termbase.py:120]`. p0839 holds 64 marks and none has a one-character `surface` `[check: D2 2026-10-27 21:04 python3 count of len(surface)]`.
  - The EN side of a mark with `en` null, that is, a mark with result `breaks` and `en_form` "none", or a note with no EN term found. In p0839, 10 marks have `en` null and 10 items have result `breaks` `[check: D2 2026-10-27 21:04]`.
- Decided in round 51 answer 12: the JA side of a mark with `en` null (result `breaks` or `note`) gets the same highlight as a mark that follows, and the EN side has no highlight `[accepted recommendation 2026-10-28 08:21]` "Same highlight, JA side (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:57]`. Decided in round 51 answer 14: the pop-up shows the first definition of a language with its agent-written mark, and the user can expand the pop-up to show the full entry `[user 2026-10-28 08:21]` "option 1. but user can expand the popup to show full" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:59]`. Before round 51: both points were open.

#### 15.10.4 Sign-in

- Round 50 answer 12: real sign-in with a password, and reuse of the v1 test users `[user 2026-10-27 20:54]` "option 2. we have test user in v1 right? can we reuse them?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:33]`. Round 51 answer 2 decides the method `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]` (section 15.11.6). History: the method was open.
- v1 facts. No password appears in this document.
  - Login: a POST route takes the email and the password, calls `signInWithPassword` against PocketBase, and sets an auth cookie `[file: kendo-translation-viewer-v1/app/api/auth/login/route.ts]`.
  - Users: the PocketBase collection `users` has a `role` field with the values admin, translator, reader, and qa. It also has `username` and `display_name` `[file: kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123456_initial_schema.js:45-58]`.
  - The role comes from `pb.authStore.record.role` `[file: kendo-translation-viewer-v1/lib/auth/requireAdmin.ts:8-31]`.
  - The seed migration sets one account in code: admin@kendo-translation.local with the role admin. Its header says that users must reset the temporary password at the first login `[file: kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123457_seed_users.js:4-28]`. The other accounts of the header are Not verified.
  - The Playwright tests name four test accounts: admin@kendo-translation.local (role admin), translator@kendo-translation.local (role translator), reader@kendo-translation.local (role reader), and wenqian@kendo-translation.local. The PocketBase role of the last account is Not verified `[file: kendo-translation-viewer-v1/tests/global-setup.ts:54-77]`.
  - The default PocketBase address is `http://127.0.0.1:8090` `[file: kendo-translation-viewer-v1/lib/pocketbase/client.ts:19]`.
  - No PocketBase server runs on this machine, and no `pocketbase` binary is in the PATH `[check: D2 2026-10-27 21:04 curl http://127.0.0.1:8090/api/health gave code 000, which pocketbase found nothing]`.
  - The v1 server ran on Oracle Cloud `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:42]`. Whether it still runs and holds these accounts is Not verified.
- Three methods were offered. Round 51 answer 2 chose (b). History: none was chosen.
  - (a) A local user file in the v2 Viewer. It reuses the v1 account names and roles. It holds new hashed passwords. Commit: the Viewer owns a small user store and the sign-in code `[reading pending owner check]`. Not chosen in round 51 answer 2.
  - (b) Run PocketBase on this machine with the v1 migrations, and recreate the test users there. Commit: a second program to install and run next to the Viewer `[reading pending owner check]`. Chosen in round 51 answer 2 `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]`.
  - (c) Connect to the live v1 PocketBase server, if it still runs. Commit: the Viewer needs the network and the v1 server, and it reads the v1 accounts as they are `[reading pending owner check]`. Not chosen in round 51 answer 2.
  - The v2 roles are reader, translator, and admin (section 4). The v1 role qa has no meaning in v2 `[agent inference]`.

#### 15.10.5 Worked example

- Page: `kendojidai_2014/p0839`, run folder `20261026T205441Z-r41`. The QA_3 verdict of this run is FAIL `[file: kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/summary.json]`. The run still serves as a data example.
- The cut rule gives 21 sentence groups for this page. Group 1 holds the TS_3 lines `L01` to `L05` `[check: D2 2026-10-27 21:04 python3 -B, book_memory.cut_pairs on TS_3 and ED_3 after_program_step]`.
- One row of the editor, group 1:
  - JA text of the group: `これらの事は、年齢を重ねてきてようやく分かる事であり、老いてできる事もあります。剣道においても様々な経験・体験を積み重ねて分かる事があり、老いて伸びていく事もあると感じています。` `[file: kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/results/TS_3.json]`
  - Agent ED_3 text of the group: `These are things that one comes to understand only as the years pile up, and there are also things that become possible with age. In Kendō (the way of the sword) too, there are things one understands by accumulating various experiences and firsthand experiences, and as one grows old, there are also things that continue to develop. That is how I feel.` `[file: kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/results/ED_3.json]`
  - Own translation box: empty. Button next to it: copy the agent text.
- Highlighted term 1, result `follows` `[file: kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/programs/term_marks.ED_3.json]` `[file: kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41/programs/en_form_check.ED_3.json]`:
  - Mark `kendojidai_2014/p0839/ed3/M01`, `entry_id` `c-fefdc125669e`, `surface` `剣道`. JA side: item `kendojidai_2014/p0839/ts3/L03`, characters 5 to 7. EN side: item `kendojidai_2014/p0839/ed3/L03`, characters 13 to 18, which are `Kendō`. `found`: `Kendō (the way of the sword)`. `explained`: true.
  - Item `kendojidai_2014/p0839/ed3/L03#1`: `result` `follows`, `common` `common`, `use` `first`.
- Pop-up of the termbase entry `c-fefdc125669e` `[file: kendo-translation-translator/data/termbase/termbase.draft.jsonl]`:
  - JA: term `剣道`, reading `けんどう`, definition `剣の道`.
  - EN: preferred term `the way of the sword`, romaji `Kendō`. Definition: `Kendō (剣道) is the way of the sword. It is the Japanese art of swordsmanship.` The entry holds a second EN definition: `The Japanese art of swordsmanship`.
  - ZH: preferred term `剑道`. Definition: `剑道即剑之道，指日本的剑术艺术。` The entry holds a second ZH definition: `劍之道`.
  - VI: term `Kiếm đạo`. Definition: `Nghệ thuật kiếm thuật Nhật Bản`.
  - KO: term `검도`. Definition: `일본의 검술 무예`.
  - The first EN and ZH definitions carry `x-agent-written` true. The others come from the dictionary files `[check: D2 2026-10-27 21:04 python3 print of the entry]`.
- Highlighted term 2, result `breaks`, in the same row: mark `kendojidai_2014/p0839/ed3/M02`, `surface` `伸び`, `entry_id` `c-4ae30881f8ac`, JA item `kendojidai_2014/p0839/ts3/L05`, characters 1 to 3. `en` is null. `detail`: `no EN form found for this JA mark`. The EN side has no highlight.

#### 15.10.6 Not verified and open items

- Not verified:
  - The option texts of round 50 answers 8 to 13. The Q-A file stores labels and notes only.
  - Whether the v1 PocketBase server on Oracle Cloud still runs and holds the test accounts.
  - The PocketBase role of the account wenqian@kendo-translation.local, and the other accounts of the seed header.
  - The pop-up content and the row layout. They are readings of the files, not owner decisions `[agent inference]`.
  - Any screen. No code for these parts exists.
- State after round 51. Items marked Decided have their detail in section 15.11. Items marked Open carry over to section 15.11.8:
  - Decided in round 51: PocketBase records store own translations and comments (answer 6), and the Viewer keeps every saved version (answer 7). Open: the database design (unit DB1).
  - Decided in round 51 answer 8: the newest finished run, and the admin can mark one run. Open: where the mark is stored (unit DB1).
  - Decided in round 51 answer 9: the book memory rule.
  - Decided in round 51: the writer edits own comments (answer 10), and the admin reads all comments (answer 11). Open: delete of comments.
  - Decided in round 51 answer 12: the same highlight on the JA side.
  - Decided in round 51 answer 2: method (b). Open: the process to replace v1 on https://kendotranslation.com/ (unit DB1).
  - Decided in round 51 answer 13: all finished pages, FAIL pages included.

Status: open.

### 15.11 Round 51 decisions (human-translation-view)

- Source: owner answers 2, 3, and 6 to 15 of round 51 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47-60]`. Unit D3 wrote this section `[check: D3 2026-10-28 08:40]`.
  - The Q-A file stores the label of each accepted option and short notes in parentheses. The option meanings in this section come from those notes and from the brief of unit D3. The full option texts are Not verified.
  - The design process of round 42 answer 9 applies: design a topic, then code it `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. This section is the design text. Code waits for the owner check.
  - This section settles open items of section 15.10. The lines of section 15.10 carry the change in place, and the old state stays as history.
  - Answers 1, 4, 5, and 16 of round 51 belong to other units. They are not in this section.
  - Unit D3 did not read the Viewer code. Whether code for these parts exists is Not verified.

#### 15.11.1 Decisions table

| Answer | Topic | Owner words (exact) | Tag | Q-A line | Meaning |
| --- | --- | --- | --- | --- | --- |
| 2 | Sign-in method | "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" | `[user 2026-10-28 08:21]` | l47 | Option 2: run PocketBase locally with the v1 setup files (migrations). Create the four v1 test accounts again. The process to replace v1 on https://kendotranslation.com/ is open (unit DB1). |
| 3 | User management script | "write a user management script. I will run it to change the passwords whne needed" | `[user 2026-10-28 08:21]` | l48 | A script sets passwords and roles of PocketBase accounts. The owner runs it. No password goes into a file or a report. |
| 6 | Storage place | "Option 3? Have we design any database yet? we need to setup for deployment soon" | `[user 2026-10-28 08:21]` | l51 | Option 3: PocketBase records store the data of the human-translation-view. The v2 database design is open (unit DB1). |
| 7 | Saved versions | "Option 1. But user have to click save to save it" | `[user 2026-10-28 08:21]` | l52 | Option 1: the Viewer keeps every saved version with its time. Nothing saves without a click on Save. |
| 8 | Run choice and TL_3 inputs | "Newest by default, but admin can mark one when needed.\nAlso some revision:\nWe want human-translation to access the same information as TL_3 agent when it translations. Show these information (including the retrieved information) along side with ED_3 text (user can hide them later)" | `[user 2026-10-28 08:21]` | l53 | The newest finished run is the default, and the admin can mark one run. A panel shows the inputs of TL_3 next to the ED_3 text, and the user can hide the panel. |
| 9 | Row size | "Book memory rule (Recommended)" | `[accepted recommendation 2026-10-28 08:21]` | l54 | One editor row per sentence group, with the same cut as the book translation memory. |
| 10 | Comment edit and share | "Writer edits, starts private (Recommended)" | `[accepted recommendation 2026-10-28 08:21]` | l55 | The writer edits own comments. A new comment starts private. |
| 11 | Admin and private comments | "option 2. this is just a translation app. you dont need to tell writer about it" | `[user 2026-10-28 08:21]` | l56 | Option 2: the admin reads all comments, also private ones. The writer is not told. |
| 12 | Terms without EN term | "Same highlight, JA side (Recommended)" | `[accepted recommendation 2026-10-28 08:21]` | l57 | A mark with result `breaks` or a note gets the same highlight on the JA side only. |
| 13 | Page list | "All finished pages (Recommended)" | `[accepted recommendation 2026-10-28 08:21]` | l58 | The human-translation-view lists all finished pages, FAIL pages included. |
| 14 | Two definitions | "option 1. but user can expand the popup to show full" | `[user 2026-10-28 08:21]` | l59 | Option 1: the pop-up shows the first definition with the agent-written mark. The user can expand the pop-up to show the full entry. |
| 15 | Row with no EN text | "option 1. but why would the EN translation be  missing? the system should have been designed to address this?" | `[user 2026-10-28 08:21]` | l60 | Option 1: a sentence group with no ED_3 text gets a row with an empty agent text. The cause of the missing EN text is under review (unit S1R). |

- Where each decision lands:
  - Answers 2, 3, and 6: section 15.11.6.
  - Answer 7: section 15.11.3.
  - Answer 8: sections 15.11.2 and 15.11.4.
  - Answer 9: section 15.10.1 stays as written. It already uses the sentence groups of the book translation memory.
  - Answers 10 and 11: section 15.11.5.
  - Answers 12 and 14: section 15.10.3, changed in place.
  - Answer 13: section 15.11.4.
  - Answer 15: section 15.11.7.

#### 15.11.2 The TL_3 information panel

- Owner words, answer 8: the human-translation-view shows the same information that the TL_3 agent gets. The panel sits next to the ED_3 text, and the user can hide it later `[user 2026-10-28 08:21]` "We want human-translation to access the same information as TL_3 agent when it translations. Show these information (including the retrieved information) along side with ED_3 text (user can hide them later)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]`.
- Real message for the check: page left_foot_full/p047, run folder `kendo-translation-translator/data/pilot-run/left_foot_full_p047/20261028T025716Z-r41`. The file `messages/TL_3.txt` holds 637 lines and 46883 characters `[check: D3 2026-10-28 08:40 wc -lc messages/TL_3.txt]`.
  - The message holds six sections: role statement, fixed rules, instruction text version v0, box header, input blocks, and output format `[check: D3 2026-10-28 08:40 python3 re.findall of [SECTION n: name]]`.
  - Section 5 holds eight input blocks: `grid_place`, `ja_text`, `lower_pair`, `previous_page_pair`, `earlier_term_marks`, `dictionary_lookup`, `book_translation_memory`, and `aligned_translation_memory` `[check: D3 2026-10-28 08:40 python3 re.findall of [BLOCK name]]`.
  - The panel covers these eight input blocks. Sections 1 to 4 and 6 are fixed text of the box and do not change from page to page `[agent inference]`. Decided in round 53 answer 5: the panel hides them `[accepted recommendation 2026-10-28 12:34]` "Hide the fixed text (Recommended)" (section 15.12.5).
  - Older messages hold fewer blocks. Of 65 TL_3 messages under `data/pilot-run`, 8 hold all eight blocks, 3 lack `previous_page_pair`, and 54 lack `grid_place` and `previous_page_pair` `[check: D3 2026-10-28 08:40 python3 re.findall of [BLOCK name] in */*/messages/TL_3.txt]`. A reader of the message text must accept a missing block `[agent inference]`.
- Default of the panel `[reading pending owner check]`: all blocks except `grid_place`. The owner wrote "the same information as TL_3 agent ... including the retrieved information". The block `grid_place` describes the place of the agent in the grid and holds no page content. Round 52 answer 12 decided that the panel hides `grid_place`. `lower_pair` (the TL_2 agent draft) stays in the default `[reading pending owner check]` (section 15.11.8).
- The blocks, in the order of the message. Paths below start at the run folder `kendo-translation-translator/data/pilot-run/left_foot_full_p047/20261028T025716Z-r41` unless the path names another folder.

  - `grid_place` (message l48-70). Content: the place of the box TL_3 in the grid, the boxes that feed it, and the source of each input block. Panel default: hidden.
    - Excerpt: `this box: TL_3 (stage TL, level 3)`
    - Excerpt: `lower box: TL_2`
    - Excerpt: `fed by: TS_3 (transcription stage, writes the Japanese text of the page)`
    - Source on disk: the message text only. No structured file holds it `[check: D3 2026-10-28 08:40 ls lookup programs results parsed]`.
  - `ja_text` (l72-117). Content: the Japanese items of TS_3 for the page, with item IDs and reading order. The block holds 28 lines, 2 titles, 1 pillar, 1 folio, and 1 figure. Panel default: shown.
    - Excerpt: `left_foot_full/p047/ts3/L01 | order=2 | 左のラインを意識して背骨をしっかり伸ばし`
    - Excerpt: `left_foot_full/p047/ts3/T01 | order=12 | 左足のひかがみは常に緊張`
    - Source on disk: `results/TS_3.json`, key `after_program_step`. Each line has `item_id`, `reading_order`, and `text`. The line L01 matches the message `[check: D3 2026-10-28 08:40 python3 read of results/TS_3.json]`.
  - `lower_pair` (l119-124). Content: the result and the translation rationale of TL_2 for the same page. TL_3 must assume that this pair holds errors. Panel default: shown `[reading pending owner check]`.
    - Excerpt: `from: TL_2`
    - Excerpt: `{"ja_refs": ["left_foot_full/p047/ts2/L01"], "text": "With the left line in mind, firmly extend"}`
    - Source on disk: `results/TL_2.json`, keys `model_result` and `reasoning`. The first line text is in the message `[check: D3 2026-10-28 08:40 python3 read of results/TL_2.json]`.
  - `previous_page_pair` (l126-130). Content: the result and the translation rationale of TL_3 on the page before. Panel default: shown.
    - Excerpt: `from: TL_3 on page left_foot_full/p046`
    - Excerpt: `In Kendō (the way of the sword), the flow is Kamae (stance) ↓ Seme-ai (union of pressure) ↓ ...`
    - Source on disk: `kendo-translation-translator/data/pilot-run/left_foot_full_p046/20261028T023007Z-r41/results/TL_3.json`, keys `after_program_step` and `reasoning` `[agent inference]`. The first item text is in the message `[check: D3 2026-10-28 08:40 python3 read of the p046 results/TL_3.json]`. The pick of that run folder is Not verified.
  - `earlier_term_marks` (l132-147). Content: the kendo terms that earlier accepted pages of the book already used, with the first EN form and the result. Panel default: shown.
    - Excerpt: `pages_read: 1`
    - Excerpt: `c-fefdc125669e | 剣道 | Kendō (the way of the sword) | first used on page left_foot_full/p046 | result=follows`
    - Excerpt: `c-186a6aacb50b | 構え | Kamae (stance) | first used on page left_foot_full/p046 | result=follows`
    - Source on disk: no file of its own. A program builds the block from the p046 run files `kendo-translation-translator/data/pilot-run/left_foot_full_p046/20261028T023007Z-r41/programs/term_marks.ED_3.json` and `programs/en_form_check.ED_3.json` `[agent inference]`.
    - The p046 file holds 13 entry IDs. The message lists 11. The missing two are c-f31e71b719b5 (極意) and c-8645895476e7 (崩れ). The rule behind this gap is Not verified `[check: D3 2026-10-28 08:40 python3 compare of entry IDs]`.
  - `dictionary_lookup` (l149-463). Content: the termbase entries that a program found for the words of the TS_3 text. The block holds 28 entries for 21 requested words. Each entry has `entry_id`, `store`, `source`, `headword_ja`, `reading`, `romaji`, `concise_en`, `common`, and `detailed_en`. Panel default: shown.
    - Excerpt: `entry_id: c-fefdc125669e | headword_ja: 剣道 | romaji: Kendō`
    - Excerpt: `concise_en: the way of the sword | common: common`
    - Excerpt: `source: kd:1029, refinement:d-0365, kd:1030`
    - Source on disk: `lookup/TL_3.json` holds `mode`, `matched` (21 words), `search` (8 pairs of entry ID and score), and `entry_ids` (28). It holds no entry text. The 21 words equal `requested_words` of the message, and the 28 IDs equal the `entry_id` lines of the message `[check: D3 2026-10-28 08:40 python3 compare with the message]`.
    - The entry text comes from `kendo-translation-translator/data/termbase/termbase.draft.jsonl` by `entry_id` `[agent inference]`. The termbase can change after a run. Only the message text shows the entry as TL_3 saw it.
  - `book_translation_memory` (l465-484). Content: 3 pairs (JA group and EN text) from earlier accepted pages of the same book. All 3 come from page p046. Panel default: shown.
    - Excerpt: `source: page left_foot_full/p046, pair P05, run 20261028T023006Z/20261028T023007Z-r41, split none`
    - Excerpt: `ja: わたしは安定した構えをとるために左手・左腰・左足という左のラインを意識しています。...`
    - Excerpt: `en: In order to take a stable Kamae, I keep in mind the left line of the Hidari-te (left hand), left hip, and left foot. ...`
    - Source on disk: no file lists the 3 pairs that TL_3 saw. The file `kendo-translation-translator/data/pilot-run/lists/20261028T023006Z/book-memory/left_foot_full.jsonl` (26 lines) holds rows with `page_id`, `pair_id`, `run_id`, `ja`, `en`, and `ts_ids`. The rows P01, P05, and P04 of p046 have `ja` and `en` text that equals the message `[check: D3 2026-10-28 08:40 python3 compare with the message]`.
    - The file also holds the pairs of p047, written after the call. The file alone does not tell which pairs TL_3 saw. The rule that picks the 3 pairs is Not verified.
  - `aligned_translation_memory` (l486-504). Content: 3 earlier JA and EN pairs from the aligned dataset, found by Voyage. Panel default: shown.
    - Excerpt: `source: unit u_18629c5c_U036`
    - Excerpt: `ja: 左腰が入ることで上半身の力が抜け、竹刀の剣先が生きてくると考えています。`
    - Excerpt: `en: I believe that by engaging the left hip, the upper body becomes more relaxed, and the tip of the shinai becomes more responsive.`
    - Source on disk: `lookup/TL_3.aligned.json` holds `mode` (`voyage`) and `pairs` (3). A pair has `unit_id`, `ja`, `en`, and `score`. The 3 unit IDs and texts are in the message `[check: D3 2026-10-28 08:40 python3 compare with the message]`.

- What this means for the code unit:
  - Five blocks have a structured source: `ja_text`, `lower_pair`, `previous_page_pair`, the entry IDs of `dictionary_lookup`, and `aligned_translation_memory`.
  - Three parts have no stored selection: `earlier_term_marks`, the entry text of `dictionary_lookup`, and the pairs of `book_translation_memory`.
  - The message text holds all eight blocks as TL_3 saw them. The markers `[BLOCK name]` and `[END name]` bound each block. Entries sit between `[ENTRY]` and `[END ENTRY]`, and pairs sit between `[PAIR]` and `[END PAIR]` `[check: D3 2026-10-28 08:40 grep of messages/TL_3.txt]`.
  - Recommendation: parse `messages/TL_3.txt` block by block for the panel. Use the structured files only to add links, for example `entry_id` to the term pop-up `[agent inference]`.
  - TL_3 got its blocks for the whole page. The owner words do not ask for a filter by row. The panel shows the blocks of the page `[agent inference]`.

#### 15.11.3 Saved versions

- A click on Save makes a new version with its time. Nothing saves without that click `[user 2026-10-28 08:21]` "Option 1. But user have to click save to save it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:52]`.
  - The Viewer keeps every saved version. It deletes none.
  - The version history view of section 6 lists the versions with their dates `[accepted option 2026-10-09 09:26]` "Version history view". The decision of round 51 answer 7 agrees with it.
  - Whether the version history of the own translation is the same list as the change log of section 10 is open `[reading pending owner check]`.
  - The own translation of a row refers to the TS_3 lines of its sentence group. A different run can cut other groups. A version must record the run ID of the ED_3 text that the translator saw `[agent inference]`. Decided in round 53 answer 7: each version keeps the run ID and the row shows a notice (section 15.12.4).

#### 15.11.4 Run choice

- Rule: the newest finished run of a page is the default, and the admin can mark one run for a page when needed `[user 2026-10-28 08:21]` "Newest by default, but admin can mark one when needed." `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]`.
- Finished run `[agent inference]`. A run folder is finished when all of these hold:
  - The folder sits directly under `data/pilot-run/<page folder>/`.
  - The folder holds `summary.json`, and `summary.json` holds `qa.QA_3.verdict` with the value PASS or FAIL.
  - The folder holds `results/ED_3.json`.
  - A folder with a name that starts with `plan-` is a plan run. It has no `summary.json` and no `run.json`, so it is not finished `[check: D3 2026-10-28 08:40 ls left_foot_full_p046/plan-20261026T070259Z]`.
  - A folder `critic-separate-<time>` sits inside a run folder. It is not a run.
  - The `status` text can be `completed` or `completed with failures`. The run `ogawa_lecture_part2_p089/20261026T185029Z-r41` has `completed with failures` because of one critic failure, and it holds the QA_3 verdict PASS `[check: D3 2026-10-28 08:40 python3 read of summary.json]`. The rule above counts it as finished. Decided in round 53 answer 8 `[accepted recommendation 2026-10-28 12:34]` "Count it if QA_3 gave a verdict (Recommended)" (section 15.12.4).
- Newest `[agent inference]`: the largest `started_utc` in `run.json`. Folder names end in `-r41`, `-test13`, or `-test13b`, so a sort by folder name is not safe.
- Check on `data/pilot-run/left_foot_full_p046/` `[check: D3 2026-10-28 08:40 ls and python3 read of summary.json and run.json]`:
  - `20261026T182512Z-r41`: finished, QA_3 PASS, `started_utc` 2026-10-26T18:25:12Z.
  - `20261028T023007Z-r41`: finished, QA_3 PASS, `started_utc` 2026-10-28T02:30:07Z.
  - `plan-20261026T070259Z`: plan run, not finished.
  - The rule picks `20261028T023007Z-r41`.
- Second check, a page where the newest run is a FAIL: `mental_full_p014` holds `20261028T023007Z-r41` (FAIL, started 2026-10-28T02:30:07Z) and `20261026T195046Z-r41` (PASS, started 2026-10-26T19:50:46Z). The rule picks the FAIL run. The admin can mark the PASS run instead `[check: D3 2026-10-28 08:40 python3 read of summary.json and run.json]`.
- Page list, answer 13: the list holds all pages with at least one finished run, FAIL pages included `[accepted recommendation 2026-10-28 08:21]` "All finished pages (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:58]`. By the rule above, 30 page folders under `data/pilot-run` hold at least one finished run, and 5 of them hold more than one `[check: D3 2026-10-28 08:40 python3 glob of */*/summary.json]`.
- The mark of the admin lives in the Viewer database, not in the run folder, because the agent files never change `[agent inference]`. The database design is in section 15.12.2 (round 53).

#### 15.11.5 Comments

- A new comment starts private. The writer edits own comments `[accepted recommendation 2026-10-28 08:21]` "Writer edits, starts private (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:55]`.
  - A comment attaches to one sentence row (section 15.10.2).
  - Shared comment: translators and the admin read it `[reading pending owner check]`.
  - Private comment: the writer and the admin read it. The admin reads all comments, also private ones `[user 2026-10-28 08:21]` "option 2. this is just a translation app. you dont need to tell writer about it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:56]`.
  - The writer is not told that the admin reads private comments. The owner wrote "you dont need to tell writer about it". The screen gives no notice and no wording that private means only the writer `[agent inference]`.
  - The writer deletes own comments `[accepted recommendation 2026-10-28 10:12]` (round 52 answer 12), and the admin deletes any comment `[accepted option 2026-10-28 12:34]` "Writer and admin" (round 53 answer 10, section 15.12.1). The owner words say "Writer edits" and say nothing on delete. The v1 collection `segment_comments` lets the writer or an admin delete (section 15.10.2).
  - The writer can change a comment from private to shared `[accepted recommendation 2026-10-28 10:12]` "Writer deletes, can share later (Recommended)" (round 52 answer 12). Round 50 answer 10 says the writer chooses per comment whether to share.

#### 15.11.6 Storage and sign-in

- Storage: PocketBase records store the own translations (with their versions), the comments, and the mark of the admin on a run `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The agent files stay on disk and stay read-only `[agent inference]`.
- Sign-in: PocketBase runs locally on this machine with the v1 setup files (migrations). The four v1 test accounts are created again: admin@, translator@, reader@, and wenqian@kendo-translation.local `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]`. History: the words "with the v1 setup files" are replaced in round 54 answer 2 and round 55 answer 5 (section 15.12.3). The local PocketBase uses the v2 migrations only.
  - The v1 schema migration is `kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123456_initial_schema.js` (section 15.10.4).
  - The v1 seed migration holds a plain password for the admin account `[file: .opencode/reminders/plan/evolving-plan-2026-10-28.md:19]`. The code unit must not print that password or copy it into a file. The owner changes passwords with the script below.
  - Round 53 answer 12: the role of the account wenqian@kendo-translation.local is translator `[accepted recommendation 2026-10-28 12:34]` "Translator (Recommended)".
- User management script: a script creates accounts, sets passwords, and sets roles in PocketBase. The owner runs it when a password must change `[user 2026-10-28 08:21]` "write a user management script. I will run it to change the passwords whne needed" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:48]`. No password goes into a file or a report `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:66]`.
- Deployment: the owner asks for the process to replace v1 with v2 on https://kendotranslation.com/ soon, and wants to set up deployment soon `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]` `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The database design and the replacement process are open (unit DB1).

#### 15.11.7 Rows with no EN text

- A sentence group with no ED_3 text gets a row with an empty agent text `[user 2026-10-28 08:21]` "option 1. but why would the EN translation be  missing? the system should have been designed to address this?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:60]`.
  - The book memory skips a group with no EN item (section 15.10.1). The memory file cannot list such a group. The rows must come from the TS_3 groups, cut by the same rule, and not from the memory pairs alone `[agent inference]`.
  - On p047 the memory wrote 6 pairs and skipped 0 groups for a missing EN item and 0 for a missing JA item `[file: kendo-translation-translator/data/pilot-run/left_foot_full_p047/20261028T025716Z-r41/summary.json]` `[check: D3 2026-10-28 08:40 python3 read of summary.json key book_memory]`.
  - The owner asks why EN text is missing and expects the system to handle it. The cause is open and under review (unit S1R). Unit D3 did not check any cause. Not verified.

#### 15.11.8 Not verified and open items

- Not verified:
  - The full option texts of round 51 answers 2, 6, 7, 11, 14, and 15. The Q-A file stores labels and short notes.
  - The Viewer code. Unit D3 did not read it, and no screen exists for these parts.
  - The rule that left 2 of 13 p046 term entries out of the block `earlier_term_marks`.
  - The rule that picks the 3 pairs of the block `book_translation_memory`.
  - Whether the termbase file equals the termbase at the time of the run.
  - Whether the older TL_3 messages hold the same text inside each block. Unit D3 checked the block names only.
  - The cause of a missing EN text (unit S1R), the v2 database design (written in section 15.12.2), and the process to replace v1 (unit DB1).
  - Whether the v1 PocketBase server on Oracle Cloud still runs, and the role of the account wenqian@kendo-translation.local (decided in round 53 answer 12: translator).
- Open items for the owner. The recommended default comes first in each item.
  - Panel blocks `grid_place` and `lower_pair`. Decided in round 52 answer 12: the panel hides `grid_place`. (1) Hide `grid_place`, show `lower_pair` (recommended). (2) Hide both. (3) Show both.
  - Fixed text of TL_3 (sections 1 to 3 of the message: role, rules, instruction text). Decided in round 53 answer 5: option (1). (1) Hide it in the panel (recommended). The agent-translation-monitor already has the extra item for the exact text sent to each box. (2) Show it.
  - Panel scope. Decided in round 53 answer 6: option (1). (1) The panel shows the blocks of the page (recommended). (2) The panel filters dictionary entries and memory pairs by the row.
  - Source of the panel text. Decided in round 52 answer 12 (the panel reads the TL_3 message): option (1). (1) Parse `messages/TL_3.txt` (recommended). (2) Read the structured files and rebuild the three parts that have no stored selection.
  - Unit of a saved version. Round 52 answer 12 chose "One version per Save". The mapping to records is open (section 15.12.6, question 1). (1) One version for the whole page on each click on Save (recommended). (2) One version for each changed row.
  - Row identity when the run changes. Decided in round 53 answer 7: option (1). (1) A version records the run ID, and the translator sees a notice when the shown run differs (recommended). (2) Rows follow the sentence group text, and the Viewer matches them again.
  - Delete of a comment, and a change from private to shared. Decided in round 52 answer 12 and round 53 answer 10: option (1), and the admin also deletes any comment. (1) The writer deletes own comments and can change private to shared (recommended). (2) The writer edits only.
  - Status `completed with failures`. Decided in round 53 answer 8: option (1). (1) Count a run as finished when the QA_3 verdict exists (recommended). (2) Count only status `completed`.
  - Unsaved text. Decided in round 52 answer 12: option (1). (1) Show a warning when the user leaves a page with unsaved text (recommended). (2) Show no warning.
  - The seed migration of v1 holds a plain password. Round 52 answer 10 chose to skip the v1 seed file and to use a Python user script. The use of v1 files stays open (section 15.12.3). (1) Apply the schema migration only and create the accounts with the user management script (recommended). (2) Apply all v1 migrations and change the password at once.

Status: open.

### 15.12 Round 53 decisions (PocketBase base and human-translation-view details)

- Source: owner answers 2, 3, and 5 to 14 of round 53 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:94-108]`. The batch was asked at 10:37 and answered at 12:34. Unit H1D wrote this section `[check: H1D 2026-10-28 12:55]`.
  - The Q-A file stores the label of each accepted option and short notes in parentheses. The meaning of each answer comes from those notes and from the brief of unit H1D. The full option texts are Not verified.
  - Answers 1 and 4 belong to other units (P1 and T7). They are not in this section.
  - The design process of round 42 answer 9 applies: design a topic, then code it `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. Round 50 answer 13: the code unit asks clarifying questions before code `[user 2026-10-27 20:54]` "option 2. ask clarifying question if needed" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:34]`. Section 15.12.6 holds those questions.
  - Unit P1 builds the collections of section 15.12.2 at the same time. Unit H1D did not read the files of P1. Whether P1 matches section 15.12.2 is Not verified.
  - This section settles open items of section 15.11.8. The lines of section 15.11 carry the change in place, and the old state stays as history.
- Earlier decisions that stay valid:
  - Round 52 answer 12: the panel hides the grid place, the panel reads the TL_3 message, the writer deletes and can share later, one version per Save, FAIL-list pages count, and a warning shows when the user leaves with unsaved text `[accepted recommendation 2026-10-28 10:12]` "Accept and commit D3 (Recommended), Panel hides grid place (Recommended), Panel reads TL_3 message (Recommended), Writer deletes, can share later (Recommended), One version per Save (Recommended), FAIL-list pages count (Recommended), Warn on unsaved leave (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:83]`.
  - Round 52 answers 9 to 11: v2 goes live first on a subdomain, on the same PocketBase with new collections. The monitor stays on the Mac and syncs snapshots. The v1 seed file is skipped. A Python script manages the users `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:80-82]`. Replaced in round 55 answer 5: the part "on the same PocketBase with new collections" is history. v2 gets its own new PocketBase `[user 2026-10-28 16:29]` "option 1. Will it be easy to replace v1 with v2 later?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]` (section 15.14.9).

#### 15.12.1 Decisions table

| Answer | Topic | Owner words (exact) | Tag | Q-A line | Meaning |
| --- | --- | --- | --- | --- | --- |
| 2 | Live security steps | "Change all live passwords (Recommended), Fix live users rules now (Recommended), Read live PocketBase version (Recommended), Make the repo private (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l96 | The owner does these steps on the live v1 system now. Status: Not verified. The owner reports later. |
| 3 | Old password file | "Leave file and history as is" | `[accepted option 2026-10-28 12:34]` | l97 | The owner leaves the file and its git history as they are. |
| 5 | TL_3 panel fixed text | "Hide the fixed text (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l99 | The panel does not show the fixed parts of the TL_3 message (role, rules, instruction text). The agent-translation-monitor already shows the exact text sent to each box. |
| 6 | TL_3 panel scope | "Whole page blocks (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l100 | The panel shows the blocks of the whole page. It does not filter the entries for each row. |
| 7 | Saved rows when the shown run changes | "Keep run ID, show a notice (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l101 | Each saved version stores the run ID. If the shown run differs from the run of the saved version, the row shows a notice. |
| 8 | Runs with status `completed with failures` | "Count it if QA_3 gave a verdict (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l102 | A run with that status counts as finished if QA_3 gave a verdict. |
| 9 | Folder for v1 migration copies | "What exactly are you trying to do here? Why would we want anything from v1 schema to copy to v2?" | `[user 2026-10-28 12:34]` | l103 | The owner questions the copies. The decision is open (section 15.12.3). |
| 10 | Admin delete of comments | "Writer and admin" | `[accepted option 2026-10-28 12:34]` | l104 | The writer deletes own comments. The admin deletes any comment. |
| 11 | Run snapshot in `page_runs` | "JSON field (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l105 | The snapshot of one page run sits in one JSON field of the collection `page_runs`. |
| 12 | Role of local wenqian@kendo-translation.local | "Translator (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l106 | The local account wenqian@kendo-translation.local has the role translator. This closes the open role of round 52 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:91]`. |
| 13 | Test method for P1 | "Throwaway test in <TMP> (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l107 | Unit P1 tests the migrations with a throwaway test in the temporary work folder. The test is not part of the v2 repo `[agent inference]`. |
| 14 | Start of v2 deploy steps | "After H1 works locally (Recommended)" | `[accepted recommendation 2026-10-28 12:34]` | l108 | The steps to put v2 on v2.kendotranslation.com start after the human-translation-view works on this Mac. |

- Status of answers 2 and 3: the owner does the live steps and reports later. Unit H1D checked none of them. Not verified.
- Answer 10 extends round 52 answer 12 (the writer deletes own comments) `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:83]`. It differs from the earlier DB1 survey recommendation (the writer only) `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:116]`.
- Where each decision lands:
  - Answers 2, 3, and 14: this table only.
  - Answers 5 and 6: section 15.12.5.
  - Answers 7 and 8: section 15.12.4.
  - Answers 10 to 13: section 15.12.2.
  - Answer 9: section 15.12.3.

#### 15.12.2 PocketBase collections for v2

- Source: round 52 answers 9 to 11 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:80-82]` and round 53 answers 10 to 12. Unit P1 builds exactly this design `[check: brief of H1D 2026-10-28 12:37]`.
- The v2 app uses the same live PocketBase as v1, with new collections. The first live place is the subdomain v2.kendotranslation.com (round 52 answer 9). Replaced in round 55 answer 5: v2 gets its own new PocketBase on the same Oracle server, behind v2.kendotranslation.com, with only the v2 migrations and fresh accounts `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`. The first sentence of this line is history.
- Role map. A role is a value of the field `role` in the collection `users`.
  - `admin`: the researcher (the owner), as set in round 43 `[user 2026-10-26 15:17]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:113]`.
  - `translator`: a human translator.
  - `reader`: a reader of the reader pages that come later.
  - `qa`: a v1 value with no meaning in v2. The v2 app treats it as `reader` `[agent inference]`.

##### Collection users (reuse of the v1 collection is replaced in round 55 answer 5: the own v2 PocketBase has its own users)

- The migration adds the select field `role` (admin, translator, reader) only if it is missing. It keeps the v1 values on the live server, `qa` included. It adds the bool field `disabled` only if it is missing. Replaced in round 55 answer 5: the own v2 PocketBase holds no v1 value, so the keep rule for `qa` has no case to keep `[agent inference]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`.
- Rules:

```
listRule   = '@request.auth.id != ""'
viewRule   = '@request.auth.id != ""'
createRule = null
updateRule = '(id = @request.auth.id && @request.body.role:isset = false && @request.body.disabled:isset = false) || @request.auth.role = "admin"'
deleteRule = '@request.auth.role = "admin"'
authRule   = 'disabled = false'
```

- `null` means superuser only. A signed-in user cannot create users, and cannot change the own `role` or `disabled`.

##### New collections

| Collection | Purpose | Fields | Indexes |
| --- | --- | --- | --- |
| own_translations | one record per Save of a human translator | user, item_id, page_id, group_key, ts_ids (json), part, ja_text, run_id, ed3_text, text, version, created | unique (user, page_id, group_key, version), (page_id, group_key) |
| comments | comment per sentence row | user, page_id, group_key, run_id, text, shared (false at start), created, updated | (page_id, group_key), (user) |
| run_marks | admin pick of the run shown for a page | page_id, run_id, marked_by, note, created, updated | unique (page_id) |
| catalog_items | books, magazine years, web items | item_id, kind, folder, pages, title_ja, title_en, author_ja, author_en, publisher, publish_year, row (json) | unique (item_id) |
| magazine_chapters | month chapters and articles | chapter, book, year, month, chapter_title_ja, chapter_title_en, page_start, page_end, first_page_id, last_page_id, article_count, articles (json) | unique (chapter), (book) |
| page_runs | snapshot of one finished page run (filled later by sync command S2) | page_id, item_id, run_id, verdict, qa3_page_score, finished, snapshot (json, maxSize raised) | unique (page_id, run_id), (page_id) |

##### Rules of the new collections

```
own_translations
  listRule = viewRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")'
  createRule = '@request.auth.id != "" && @request.body.user = @request.auth.id && (@request.auth.role = "translator" || @request.auth.role = "admin")'
  updateRule = null
  deleteRule = null
comments
  listRule = viewRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin" || (shared = true && @request.auth.role = "translator"))'
  createRule = '@request.auth.id != "" && @request.body.user = @request.auth.id && (@request.auth.role = "translator" || @request.auth.role = "admin")'
  updateRule = 'user = @request.auth.id && @request.body.user:changed = false && @request.body.page_id:changed = false && @request.body.group_key:changed = false'
  deleteRule = 'user = @request.auth.id || @request.auth.role = "admin"'
run_marks
  listRule = viewRule = '@request.auth.id != ""'
  createRule = updateRule = deleteRule = '@request.auth.role = "admin"'
catalog_items, magazine_chapters
  listRule = viewRule = '@request.auth.id != ""'
  createRule = updateRule = deleteRule = null
page_runs
  listRule = viewRule = '@request.auth.role = "translator" || @request.auth.role = "admin"'
  createRule = updateRule = deleteRule = null
```

- What the rules mean, one fact each `[agent inference]`:
  - An own translation can be created, never changed, never deleted. A new text is a new record with a higher version.
  - The writer and the admin read own translations. No other translator reads them. This matches round 52 answer 10 "Own translations: writer and admin (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:81]`.
  - A private comment is read by the writer and the admin. A shared comment is read by all translators. This matches round 51 answers 10 and 11.
  - The writer deletes own comments, and the admin deletes any comment (round 53 answer 10).
  - The writer can change the text and the field `shared` of a comment. The writer cannot change `user`, `page_id`, or `group_key`.
  - Only translators and the admin read `page_runs`. Only a superuser writes `page_runs`, `catalog_items`, and `magazine_chapters`.

##### Group key, version, and snapshot

- Group key: `<page_id>/ts3/<first short ID>-<last short ID>`. Example: `kendojidai_2014/p0839/ts3/L01-L05`.
  - Rows are the sentence groups of `sentence_groups(ts)` in `kendo-translation-translator/data/scripts/translator/book_memory.py:82`. The input is the key `after_program_step` of `results/TS_3.json`.
  - A group of one item gives the same ID twice. The title group of `kendojidai_2014/p0794` is `kendojidai_2014/p0794/ts3/T01-T01` `[check: H1D 2026-10-28 12:47 python3 -B, book_memory.sentence_groups on results/TS_3.json]`.
  - The key is stable inside one run only. Another run can cut other lines. For this reason each version also stores `ts_ids`, `ja_text`, and `run_id`.
- Version number: the app reads the highest version for (`user`, `page_id`, `group_key`) and writes that number plus 1. The unique index rejects a duplicate from a second tab. Question 1 of section 15.12.6 asks how this rule fits "One version per Save".
- Snapshot of `page_runs`: one JSON object in the field `snapshot` with these keys:
  - `groups`: for each group the `group_key`, `part`, `ts_ids`, `ja`, `ed3_text`, `ed_index`, and `marks`.
  - `tl3_blocks`: the blocks of the TL_3 message.
  - `en_form_check`: the items of the EN form check.
  - `termbase`: the termbase entries that the marks cite.
  - `verdict`: the QA_3 verdict.
- Size facts `[check: aki-main 2026-10-28 12:31]`: the source files of one run have 34,780 to 155,327 bytes over 33 runs. The smallest is `eiga_full_p159/20261026T202055Z-r41`. The largest is `kendojidai_2014_p0839/20261026T205441Z-r41`. Unit H1D did not run this check again.
  - The JSON field limit is about 1 MB unless `maxSize` is raised `[check: brief of H1D 2026-10-28 12:37]`. Not verified by unit H1D.
- Local PocketBase `[check: H1D 2026-10-28 12:49 ./data/pocketbase/pocketbase --version]`:
  - The binary is version 0.39.10. It sits in `data/pocketbase/`, which git ignores (`.gitignore` line 6 holds `data/*`).
  - The server listens on 127.0.0.1:8090 `[check: brief of H1D 2026-10-28 12:37]`.
  - The migrations sit in the tracked folder `data/scripts/pocketbase/pb_migrations/`. The user script is `pb_users.py`. The owner sets all passwords.
  - The local accounts are admin@, translator@, reader@, and wenqian@kendo-translation.local. The account wenqian@ has the role translator (round 53 answer 12).
  - Unit H1D did not read the folder `data/scripts/pocketbase/`. Not verified.

#### 15.12.3 Use of the v1 schema (answer 9, closed by round 54 answer 2 and round 55 answer 5)

- The owner asked `[user 2026-10-28 12:34]` "What exactly are you trying to do here? Why would we want anything from v1 schema to copy to v2?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:103]`.
- The problem in one example. Round 51 answer 2 chose a local PocketBase "with the v1 setup files". Then the v1 schema file `1753123456_initial_schema.js` sits in a folder of the v2 repo. The v2 collections of section 15.12.2 hold none of its collections.
- Conflicting lines:
  - Round 51 answer 2 `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]`. Option 2 was "Local PocketBase, v1 setup" (install PocketBase, apply the v1 setup files, create the four test accounts again).
  - Section 15.11.6, first sign-in line: "PocketBase runs locally on this machine with the v1 setup files (migrations)" `[file: docs/VISION-viewer.md:610]`.
  - Section 3, line 62: "No v1 code or v1 decision carries over, except the three roles of section 4" `[validated reading 2026-10-07 20:05]` `[file: docs/VISION-viewer.md:62]`.
- Reading of aki-main `[reading pending owner check]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:115]`:
  - The v2 repo needs nothing from v1. The v2 migrations are self-contained.
  - The v1 schema files are read in place only. The throwaway test of unit P1 reads them to make sure that the v2 migrations apply on the live shape. The live server holds 25 v1 collections and the v1 users fields. Round 55 answer 5: the live-shape test is no longer needed for the deploy, because v2 gets its own PocketBase `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`.
  - No v1 collection clashes with a v2 name. v1 has `segment_comments`, and v2 has `comments` `[file: .opencode/reminders/plan/evolving-plan-2026-10-28.md:45]`.
- Unit H1D did not change the words of section 15.11.6 about "v1 setup files". The words stay until the owner decides. Round 54 answer 2 and round 55 answer 5 replace them: the local PocketBase uses the v2 migrations only `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:121]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]`.
- Status: closed by round 54 answer 2 `[user 2026-10-28 15:01]` "+ Do we need to do any of this? can we just proceed with v2?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:121]` and by round 55 answer 5 `[user 2026-10-28 16:29]` "option 1. Will it be easy to replace v1 with v2 later?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]`. The reading that the v2 repo holds no v1 file is the reading of aki-main `[reading pending owner check]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:138]`. Old text: "Status: open. The owner decides in the next batch (section 15.12.7, item 1)."

#### 15.12.4 Run choice and saved rows (answers 7 and 8)

##### Finished run

- Rule after answer 8 `[accepted recommendation 2026-10-28 12:34]` "Count it if QA_3 gave a verdict (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:102]`. A run folder is finished when all of these hold:
  - The folder sits directly under `data/pilot-run/<page folder>/`, and its name starts with a time stamp.
  - The file `summary.json` holds `qa.QA_3.verdict` with the value PASS or FAIL.
  - The file `results/ED_3.json` exists.
  - The value of `status` does not matter. Both `completed` and `completed with failures` count.
- Example: `ogawa_lecture_part2_p089/20261026T185029Z-r41` `[check: H1D 2026-10-28 12:46 python3 read of summary.json]`.
  - `status` is `completed with failures`.
  - `failures` holds one entry: "box-critic.TS_3: invalid JSON: Expecting ',' delimiter: line 1 column 913 (char 912)". `failed_calls` holds `box-critic.TS_3`.
  - `qa.QA_3` has `verdict` PASS and `page_score` 10.0.
  - The rule counts this run as finished. The failed call was a critic call, and QA_3 still gave a verdict.
- Count over `data/pilot-run` (plan folders and `smoke-r41` left out) `[check: H1D 2026-10-28 12:47 python3 over */*/summary.json and results/ED_3.json]`:
  - 39 run folders exist, and 37 are finished.
  - Two folders are not finished: `men0_p005/20261026T001543Z` and `18d4ac29_p001/20261026T005532Z`. Both have status `completed with failures`, no QA_3 verdict, and no `results/ED_3.json`.
  - 30 page folders hold at least one finished run, and 5 hold more than one.
  - Two of the four runs with a status other than `completed` count: `ogawa_lecture_part2_p089/20261026T185029Z-r41` and `men0_p005/20261025T232811Z-test13` (PASS).
- Newest finished run: the largest `started_utc` in `run.json` (section 15.11.4). On the 5 pages with more than one run, the order by `started_utc` equals the order by folder name `[check: H1D 2026-10-28 12:47 python3 over run.json]`.

##### Worked example: saved rows and a run change

- Page `mental_full/p014`. Two finished runs exist `[check: H1D 2026-10-28 12:46 python3 -B, book_memory.sentence_groups and cut_pairs on results/TS_3.json and results/ED_3.json]`:
  - `20261026T195046Z-r41`: status `completed`, QA_3 PASS, `started_utc` 2026-10-26T19:50:46Z.
  - `20261028T023007Z-r41`: status `completed`, QA_3 FAIL, `started_utc` 2026-10-28T02:30:07Z.
- Both runs cut the same 3 sentence groups:

| Group key | JA starts with | JA characters |
| --- | --- | --- |
| `mental_full/p014/ts3/L01-L08` | `はめた場合、普段の稽古への取り組み方を考える大きなヒントにな` | 304 |
| `mental_full/p014/ts3/L09-L13` | `たとえ、今日はうまくできなくても、明日はできるかもしれません` | 170 |
| `mental_full/p014/ts3/L14-L15` | `大事なのは、「できる」と思って挑戦すること。そして、自分自身` | 75 |

- The ED_3 text of group 1 differs between the runs:
  - Run `20261026T195046Z-r41`: `If applied, it becomes a great hint for thinking about how to approach everyday Keiko (practice).`
  - Run `20261028T023007Z-r41`: `If you apply this, it becomes a great hint for thinking about how to approach your everyday Keiko (practice).`
  - Both texts go on after this first sentence. Only the first sentence is shown here.
- The case, step by step:
  - The admin marks run `20261026T195046Z-r41` for this page. A translator opens the page and writes an own translation for group 1.
  - The translator clicks Save. The version stores `run_id` `20261026T195046Z-r41`, `group_key` `mental_full/p014/ts3/L01-L08`, the `ts_ids` L01 to L08, the `ja_text`, and the `ed3_text` of that run.
  - The admin removes the mark. The newest finished run, `20261028T023007Z-r41`, is now the shown run.
  - The row for `mental_full/p014/ts3/L01-L08` still exists in the new run. The row shows the saved own translation and a notice.
- The notice in plain words `[agent inference]`. The owner decided only that a notice shows (answer 7). The wording is a proposal:
  - "You saved this text while the page showed run 20261026T195046Z-r41. The page now shows run 20261028T023007Z-r41. The agent text of this row can differ."
- The notice is needed. Between the two runs of `left_foot_full/p046`, 4 of 5 rows have other ED_3 text `[check: H1D 2026-10-28 12:49 python3 -B, book_memory.cut_pairs]`.
- The key alone does not show a change. On the 5 pages with more than one run, the group keys are equal across all runs `[check: H1D 2026-10-28 12:47 python3 -B, book_memory.sentence_groups]`.
  - On `men0_p005`, two groups have the same key but another JA text. The runs `20261025T235047Z-test13b` and `20261026T182512Z-r41` differ from run `20261025T232811Z-test13` in 2 groups `[check: H1D 2026-10-28 12:48 python3 -B, book_memory.sentence_groups]`.
  - Example: the group `men0/p005/ts3/L01-L04`. Run `20261025T232811Z-test13` reads `…気持ちを失いませんでした。 つまり極限な状況にあっても…` with a space after the end mark. Run `20261025T235047Z-test13b` reads `…失いませんでした。つまり極限な状況にあっても…` with no space `[check: H1D 2026-10-28 12:47 python3 -B, book_memory.sentence_groups]`.
  - For this reason each version stores `ja_text` and `run_id`.
- Open: a saved version whose key has no row in the shown run. No such case exists in the data today. A later run can cut other lines. See question 5 of section 15.12.6.

#### 15.12.5 TL_3 panel details (answers 5 and 6)

- Rule of answer 5 `[accepted recommendation 2026-10-28 12:34]` "Hide the fixed text (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:99]`. The panel does not show the fixed parts of the TL_3 message. These are the role statement, the fixed rules, and the instruction text.
- Rule of answer 6 `[accepted recommendation 2026-10-28 12:34]` "Whole page blocks (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:100]`. The panel shows each input block of the page in full. It does not filter dictionary entries or memory pairs for the row.
- Worked example: page `kendojidai_2014/p0839`, run `20261026T205441Z-r41`. The file `messages/TL_3.txt` has 721 lines `[check: H1D 2026-10-28 12:46 grep -n of [SECTION and [BLOCK in messages/TL_3.txt]`.
  - The folder is `kendo-translation-translator/data/pilot-run/kendojidai_2014_p0839/20261026T205441Z-r41`.
  - The sections start at these lines: section 1 at l1, section 2 at l6, section 3 at l30, section 4 at l37, section 5 at l45, section 6 at l588.

| Block | Message lines | Lines | Panel | Content in this run |
| --- | --- | --- | --- | --- |
| `ja_text` | l46-186 | 141 | shown | the TS_3 items of the page |
| `lower_pair` | l188-193 | 6 | shown | the TL_2 result and rationale |
| `earlier_term_marks` | l195-200 | 6 | shown | `pages_read: 0` and `none` |
| `dictionary_lookup` | l202-560 | 359 | shown | 32 entries for 25 requested words |
| `book_translation_memory` | l562-566 | 5 | shown | `pairs_found: 0` |
| `aligned_translation_memory` | l568-586 | 19 | shown | 3 pairs |

- The panel shows 536 of the 721 lines `[check: H1D 2026-10-28 12:47 python3 over the block markers]`.
- The panel hides these lines:
  - l1-36: section 1 (role statement), section 2 (fixed rules), and section 3 (instruction text, version v0). This is the fixed text of answer 5.
  - l37-44: section 4 (box header with `box_type`, `level`, `mode`, `book_id`, `page_id`, `page_index`). The owner words name the fixed text. Section 4 is fixed text by structure `[agent inference]`. Item 5 of section 15.12.7 asks the owner.
  - l45: the heading of section 5.
  - l587-721: section 6 (output format).
  - The blank lines between the blocks.
- This run has no block `previous_page_pair` and no block `grid_place` `[check: H1D 2026-10-28 12:50 grep -c grid_place and previous_page_pair gave 0]`. This run is the first page of the book in the list. A chain run adds `previous_page_pair` `[file: kendo-translation-translator/data/scripts/translator/messages.py:511]`. The panel must accept a missing block (section 15.11.2).
- Whole page blocks. The row `kendojidai_2014/p0839/ts3/L01-L05` is the first sentence group of the page. The panel still shows all 32 dictionary entries and all 3 aligned pairs. It does not cut the list to the words of that row.
- Section 15.11.2 stays as written. Answers 5 and 6 settle its open items on the fixed text and on the panel scope.

#### 15.12.6 Questions to ask before H1 code

- Source: round 50 answer 13 `[user 2026-10-27 20:54]` "option 2. ask clarifying question if needed" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:34]`. The code unit H1 asks these questions first. The recommended default comes first in each question.
- Evidence for the app today `[check: H1D 2026-10-28 12:46 reads of app/package.json, app/lib/config.ts, app/lib/page.ts, app/lib/books.ts, app/lib/safe-path.ts]`:
  - `app/package.json` lists `next`, `react`, and `react-dom` as dependencies. It lists no PocketBase library.
  - The app has no sign-in. The comments in `app/app/api/pause/route.ts:7` and `app/components/extras-store.ts:6-7` say so.
  - The server code reads the Translator run folders from disk. The path of the Translator data folder sits in `app/viewer.config.json` under the key `translatorDataDir` `[file: app/lib/config.ts:10-31]`.

##### Question 1: how one Save maps to records

- Problem. Round 52 answer 12 says "One version per Save". The collection `own_translations` holds one record per sentence group, and a record is never changed.
- Example. The page `mental_full/p014` has 3 rows. The translator writes rows 1 and 2, leaves row 3 empty, and clicks Save once.
- The version rule of section 15.12.2 gives a number for each (`user`, `page_id`, `group_key`). Row 1 and row 2 can get version 1, and row 3 gets none. A later Save that adds row 3 gives row 3 version 1 and rows 1 and 2 version 2. One Save then does not map to one number.
- Options:
  - (1) One Save writes one record for every row of the page, empty rows included. All records get the same version number, the highest number of the page plus 1 (recommended). Benefit: a page version is complete, and a restore needs one number. Cost: page `kendojidai_2014/p0839` writes 21 records per Save. The version rule of section 15.12.2 changes from "per group" to "per page". The unique index of P1 still fits.
  - (2) One Save writes one record for each row that holds text, with the same page number. Benefit: fewer records. Cost: a row that the translator clears has no record, so the clear is not saved.
  - (3) One Save writes one record for each changed row, with its own number for each row. Benefit: the fewest records. Cost: one Save is no longer one version, and the version list of the page needs the time of each record.
- Not verified: whether one Save of several records is one all-or-nothing call in PocketBase 0.39.10. With separate calls, a failure can leave a part of the rows saved. Checked in round 54 by unit H1: the batch API of PocketBase 0.39.10 saves all records or none. It stays off until the migration `1793300002_v2_batch.js` turns it on (section 15.13.2).

##### Question 2: where H1 reads run data before the sync command S2

- Problem. The collection `page_runs` is empty until S2 exists. Round 52 answer 13 did not choose S2 for now `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:84]`. Replaced in round 55 answer 8: the owner chose the S2 design `[accepted recommendation 2026-10-28 16:29]` "S2 design + P3 README (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:153]` (section 15.14).
- Example. The page `mental_full/p014` needs the TS_3 groups, the ED_3 text, and the TL_3 blocks of run `20261028T023007Z-r41`. The files sit in `data/pilot-run/mental_full_p014/20261028T023007Z-r41/` on this Mac.
- Options:
  - (1) Read the run folders with the server code of the agent-translation-monitor (recommended). The function `getPage` in `app/lib/page.ts:87` reads `results/TS_n.json` and `results/ED_n.json`. The path comes from `viewer.config.json`. Benefit: no new unit, fresh data, tested code. Cost: this works on the Mac only. H1 must keep the reading in one module, so the later change to `page_runs` touches one file.
  - (2) Read `page_runs` in the local PocketBase. Benefit: the same path as the deploy. Cost: S2 must exist first, and S2 is not chosen now. Round 55 answer 8 chose the S2 design (section 15.14). The S2 code is not built. Round 56: the S2 code and the switch exist on this Mac (section 15.15).
  - (3) Both, with a fallback from `page_runs` to the files. Benefit: smooth change later. Cost: two paths to test.
- Fact for H1: `getPage` picks `runFolders[0]`, the newest folder name, with no check that the run is finished `[file: app/lib/page.ts:91-92]` `[file: app/lib/books.ts:15-18]`. The list `listBooks` does the same with `runs[0]` `[file: app/lib/books.ts:50]`. Today the newest folder is finished on every page `[check: H1D 2026-10-28 12:47 python3 over */*/summary.json]`. The two unfinished folders (`men0_p005/20261026T001543Z` and `18d4ac29_p001/20261026T005532Z`) are not the newest. A future failed run will be the newest. H1 needs the finished-run rule of section 15.12.4 in its own code.

##### Question 3: how the Next app talks to PocketBase

- Problem. The app has no PocketBase code and no sign-in today. H1 must sign users in and read and write records.
- Example. A translator signs in as translator@kendo-translation.local, opens `kendojidai_2014/p0839`, and clicks Save for 21 rows. The save call must carry the user token, so that the rules of section 15.12.2 apply.
- Options:
  - (1) Server routes of the Next app call PocketBase with plain `fetch`. A login route sets an httpOnly cookie with the token (recommended). Benefit: no new dependency, and page scripts cannot read the token. The app already uses server routes (`app/api/*/route.ts`). Cost: H1 writes the small sign-in, error, and token code. Token expiry and refresh are Not verified.
  - (2) The PocketBase JS library in the browser. The library keeps the token in `localStorage`. Benefit: less code. Cost: a new dependency, a token that page scripts can read, and origin settings on the live PocketBase server `[agent inference]`.
  - (3) The PocketBase JS library on the server only, with the cookie of option 1. Benefit: typed calls. Cost: a new dependency that must match PocketBase 0.39.10 (Not verified).
- The v1 app used a login route that sets an auth cookie `[file: docs/VISION-viewer.md:421]`. No v1 code carries over (section 3). The fact is a reference only.
- Fact: the file `app/AGENTS.md` says that this Next version has breaking changes and that H1 reads `node_modules/next/dist/docs/` before code. Unit H1D did not read those docs.

##### Question 4: how "newest finished run" sorts

- Problem. Section 15.11.4 says: the largest `started_utc` in `run.json`. The existing code sorts by folder name.
- Example. The page `men0_p005` has run folders `20261025T232811Z-test13`, `20261025T235047Z-test13b`, `20261026T001543Z` (unfinished), and `20261026T182512Z-r41`. Both sorts give `20261026T182512Z-r41`.
- Options:
  - (1) Sort by `started_utc` of finished runs (recommended). Benefit: the name of the folder does not matter. Cost: one more file read for each run.
  - (2) Sort by folder name of finished runs. Benefit: the code exists in `runFoldersOf`. Cost: a folder name that does not start with a time stamp breaks the order. The names end in `-r41`, `-test13`, or `-test13b`, but all start with a time stamp today.
- Fact: on the 5 pages with more than one run, both sorts give the same order `[check: H1D 2026-10-28 12:47 python3 over run.json]`.

##### Question 5: a saved version or comment with no row in the shown run

- Problem. The group key is stable inside one run only. A saved version or a comment can have a key that the shown run does not cut.
- Example. A translator saved a version for `mental_full/p014/ts3/L09-L13`. A later run cuts the lines L09 to L12 as one group and the line L13 as another group. The shown run has no row with the saved key. No such case exists in the data today `[check: H1D 2026-10-28 12:47 python3 -B, book_memory.sentence_groups over 5 pages with several runs]`.
- Options:
  - (1) Show the saved text in a box below the rows, with the label "Saved for lines that this run cuts in another way". The box shows `ja_text`, `run_id`, and the saved text (recommended). Benefit: nothing is lost, and the translator can copy the text into a new row. Cost: one more box in the layout.
  - (2) Show these versions only in the version history view. Benefit: simple. Cost: the translator can miss the text.
  - (3) Match by the JA text with a tolerance. Benefit: the text moves to a row. Cost: the match is a guess. Answer 7 chose the run ID and a notice, not a match.

##### Question 6: when the notice shows

- Problem. Answer 7 says the row shows a notice when the shown run differs from the run of the saved version.
- Example. Between the two runs of `left_foot_full/p046`, 4 of 5 rows have other ED_3 text. One row has the same text `[check: H1D 2026-10-28 12:49 python3 -B, book_memory.cut_pairs]`.
- Options:
  - (1) Show the notice on every run difference, with no text compare (recommended). Benefit: it follows the owner words. Cost: the row with the same text also shows the notice.
  - (2) Show the notice on every run difference. The notice also says whether the ED_3 text of the row changed. Benefit: the translator knows if a new read is needed. Cost: a text compare, and a rule for white space (see `men0_p005`, section 15.12.4).

##### Question 7: sign-in on the agent-translation-monitor

- Problem. Round 44 answer 6 says only the admin role opens the agent-translation-monitor and uses approve, undo, and pause `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. The monitor has no sign-in today. The route `app/api/pause/route.ts` writes a file and checks only the origin.
- Example. After H1, a translator signs in. The monitor page `/runs/<stamp>` still opens for anyone who reaches port 3000.
- Options:
  - (1) H1 adds the sign-in and the role check to the human-translation-view only. The monitor stays open on this Mac and gets the admin check in the deploy unit (recommended). Benefit: H1 stays small, and the app runs on 127.0.0.1 only for now. Cost: the monitor stays open until that unit.
  - (2) H1 also adds the admin check to the monitor pages and to the pause route. Benefit: it follows round 44 answer 6 at once. Cost: H1 touches the existing pages, and the smoke script `app/scripts/smoke.mjs` must sign in. Not verified how the script reads pages.
- Related: the store of the extra items still lives in `localStorage` `[file: app/components/extras-store.ts:6-7]`. A move of that store to the account is not part of this question.

##### Question 8: where H1 reads the PocketBase address

- Problem. The file `app/lib/config.ts` reads one key, `translatorDataDir`. It throws an error if that key is missing.
- Example. H1 needs `http://127.0.0.1:8090` on this Mac and the live address later.
- Options:
  - (1) Add the key `pocketbaseUrl` to `viewer.config.json`, with a default of `http://127.0.0.1:8090` (recommended). Benefit: one configuration file, as in round 44 answer 13. Cost: a change in `loadConfig`, and the live server needs its own file or the variable `VIEWER_CONFIG`.
  - (2) Use an environment variable. Benefit: usual for a deploy. Cost: a second place for settings.

#### 15.12.7 Not verified and open items

- Not verified:
  - The full option texts of round 53 answers 2, 3, and 5 to 14. The Q-A file stores labels and short notes.
  - The live security steps of answers 2 and 3. The owner reports later.
  - The files of unit P1. Whether they match section 15.12.2.
  - The JSON field limit of PocketBase (about 1 MB) and the effect of `maxSize`.
  - Whether PocketBase 0.39.10 has an all-or-nothing call for several records, and the token expiry of PocketBase. Checked in round 54 by unit H1: yes, the batch API. A user token lives 432000 seconds (section 15.13.5).
  - The size facts of 12:31. Unit H1D did not run them again.
  - The notice wording of section 15.12.4. It is a proposal.
  - Any screen. No code for these parts exists.
- Open items for the owner. The recommended default comes first in each item.
  - Item 1, use of the v1 schema (answer 9). (1) Confirm the reading of aki-main: the v2 repo holds no v1 file, and the words "with the v1 setup files" in section 15.11.6 are replaced (recommended). (2) Keep round 51 answer 2 as written: copy the v1 schema file into the v2 repo. Closed by round 54 answer 2 and round 55 answer 5 (section 15.12.3).
  - Item 2, list rule of `users`. The rule lets every signed-in user list all users. (1) Keep it, so that shared comments can show the name of the writer (recommended, `[agent inference]`). (2) Limit the list to the own record and the admin. Cost: shared comments then show no writer name, unless a view is added. Decided in round 54 answer 10: option (1) `[accepted recommendation 2026-10-28 15:01]` "Users list for signed-in (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:129]`.
  - Item 3, who fills `catalog_items`, `magazine_chapters`, and `page_runs`. Only a superuser writes them. (1) Leave them empty until the sync command S2, and let H1 read files (recommended). (2) Plan an import script before H1. Decided in round 54 answer 10: option (1) `[accepted recommendation 2026-10-28 15:01]` "Three collections empty for now (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:129]`.
  - Item 4, group of one item. The key reads `T01-T01`. (1) Keep the key rule as written (recommended). (2) Write `T01` for a group of one item. Cost: a second form of the key. Decided in round 54 answer 9: option (1) `[accepted recommendation 2026-10-28 15:01]` "One-item group key T01-T01 (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:128]`.
  - Item 5, the panel and section 4 of the TL_3 message (box header). (1) Hide it with the fixed text (recommended). (2) Show it. Decided in round 54 answer 9: option (1) `[accepted recommendation 2026-10-28 15:01]` "Hide TL_3 box header (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:128]`.
  - Item 6, the eight questions of section 15.12.6. Decided in round 54 answers 7 to 10 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:126-129]`. Section 15.13 holds the code state.

Status: open.

### 15.13 H1 code state (round 54)

- Source: owner answers 2, 7, 8, 9, and 10 of round 54 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:119-134]`. Unit H1 wrote the code and this section `[check: H1 2026-10-28 15:34]`.
  - The Q-A file stores the label of each accepted option. The full option texts are Not verified.
  - Round 54 answer 2 `[user 2026-10-28 15:01]` "+ Do we need to do any of this? can we just proceed with v2?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:121]`. Unit H1 used no v1 code and no v1 file. It opened no v1 folder.
  - The code state is the first version of the human-translation-view. It runs on this Mac against a local PocketBase.

#### 15.13.1 Files

- Run reads (one module): `app/lib/htv-runs.ts`. It lists finished runs, picks the shown run, and builds the rows, the term marks, the panel, and the termbase entries of a page.
- PocketBase calls (one module): `app/lib/pb.ts`. It uses plain `fetch` and the token of the signed-in user.
- Pure code, loadable with Node type stripping: `app/lib/htv-groups.ts` (sentence groups, ED_3 text of a row, place of the term marks) and `app/lib/htv-panel.ts` (parser of `messages/TL_3.txt`).
- Sign-in and routes: `app/lib/htv-session.ts`, `app/lib/htv-api.ts`, `app/lib/htv-types.ts`, `app/lib/htv-format.ts`.
- Routes: `app/app/api/htv/login`, `logout`, `refresh`, `save`, `version`, `comments`, `comments/[id]`, and `mark`.
- Pages: `app/app/translate/page.tsx` (list), `app/app/translate/sign-in/page.tsx`, and `app/app/translate/[slug]/[page]/page.tsx`.
- Components: `HtvList`, `HtvEditor`, `HtvComments`, `HtvMarkedText`, `HtvPanel`, `HtvBar`, and `HtvSignIn` in `app/components/`. The file `Nav.tsx` has a third tab.
- Changed files: `app/lib/config.ts` (key `pocketbaseUrl`), `app/scripts/smoke.mjs` (mode `htv`), `app/README.md`, and `data/scripts/pocketbase/test_local.py` (batch checks).
- New migration: `data/scripts/pocketbase/pb_migrations/1793300002_v2_batch.js`.

#### 15.13.2 Round 54 decisions as built

- Answer 7, one Save `[accepted recommendation 2026-10-28 15:01]` "Every row, one page number (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:126]`.
  - One Save writes one `own_translations` record for every row of the page, empty rows included. All records get the version number: the highest version of this user on this page plus 1.
  - The call is `POST /api/batch`. PocketBase 0.39.10 has the batch API off by default (status 403 "Batch requests are not allowed."). The migration `1793300002_v2_batch.js` turns it on with `maxRequests` 200 and `timeout` 10. Its down function turns the API off and keeps the other values.
  - The batch saves all records or none `[check: H1 2026-10-28 15:18 python3 test_local.py checks 17c and 17d]`. A duplicate record or a record for another user makes the call fail, and no record of that call stays.
  - The rules of the collection apply to each request of the batch. A reader fails, and an anonymous call fails.
  - A batch of 200 requests works. A batch of 201 requests fails. The app refuses a page with more than 200 rows with a plain message.
  - If two tabs take the same number, the unique index rejects one batch. The app reads the highest number again and tries up to 3 times `[check: H1 2026-10-28 15:28 refresh_check.py, three parallel saves gave versions 1, 2, and 3]`.
- Answer 8, run data `[user 2026-10-28 15:01]` "option 1 for dev. but these data will be uploaded for deployment right?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:127]`.
  - All run reads sit in `app/lib/htv-runs.ts`. The switch to `page_runs` after the sync command S2 changes that file only.
- Answer 9, five screen details `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:128]`.
  - A saved text or a comment can have a key with no row in the shown run. It shows in a box below the rows. The label is "Saved for lines that this run cuts in another way".
  - The notice shows on every run difference, with no text compare.
  - Only the human-translation-view needs sign-in. The monitor, the pause route, and the existing API routes stay open.
  - The panel hides section 4 of the TL_3 message.
  - A one-item group repeats the ID: `kendojidai_2014/p0794/ts3/T01-T01`.
- Answer 10, five technical details `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:129]`.
  - Server routes call PocketBase with plain `fetch`. The login route sets the httpOnly cookie `htv_token`. Page scripts never see the token. No new npm dependency.
  - Newest finished run: the finished run with the largest `started_utc` of `run.json`. An admin run mark in `run_marks` (one for each page) comes first.
  - The key `pocketbaseUrl` of `viewer.config.json` names the PocketBase address. The default is `http://127.0.0.1:8090`.
  - The list rule of `users` stays at signed-in. Shared comments show the name of the writer, or the email if the name is empty.
  - `catalog_items`, `magazine_chapters`, and `page_runs` stay empty. The unit did not fill them.

#### 15.13.3 Unit defaults

- Each item below is a choice of unit H1. The docs leave the detail open. The owner has not decided any of them.
  - Routes: `/translate` (list), `/translate/<book>/<page>` (one page), and `/translate/sign-in`. A page ID has two parts, so the page route has two segments. (Round 58: the book screen `/translate/<book>` becomes the main route, and the old page route redirects. See 15.16.2.)
  - Reader: a read-only view with the JA text, the ED_3 text, and the panel. It has no own box, no comments, and no saved data. Section 15.2 says that the reader opens the reader pages `[agent inference]`, so this default is open.
  - Session: the app checks the token on each request with the user record. It treats a disabled account as not signed in. A page refreshes the token when less than 3 days are left.
  - Times show in UTC, so that the server and the browser agree.
  - A panel block with more than 40 lines starts closed.
  - A saved text gets the run notice only if the text is not empty. The page also shows one line above the rows when any row has a notice.
  - The notice text is the proposal of section 15.12.4.
  - The admin run mark control sits on the page view, with a list of the finished runs and two buttons. The page list shows the word "marked".
  - The panel sits in a column of 26 rem at the right of the rows. The view is for desktop only (round 44 answer 8). (Round 58: need 3 makes the width changeable by drag, with 416 px as the default. See 15.16.4.)
  - The top bar title reads "human-translation-view" on the paths under `/translate`.
  - Loading an older version puts it in the boxes. The boxes then count as saved, because the older version stays in PocketBase. A new Save keeps it as a new version.
  - The warning on unsaved text covers a reload, a close, a typed address, and a click on a link of the app. It does not cover the back button of the browser.
  - The term pop-up shows the result of the EN form check as one line, and it closes on scroll.
  - Rows come from body lines and titles only (the book memory rule). Pillar, caption, folio, and figure items make no row.
  - The version history lists the versions of the user on the page. The list reads the records of the user on that page.

#### 15.13.4 Test results

- All tests ran in a copy of the app folder against a throwaway PocketBase on port 8092 `[check: H1 2026-10-28 15:33]`.
  - `npx tsc --noEmit` and `npm run lint` in `app/`: no error.
  - `npm run build` in the copy: success, 24 routes.
  - `node scripts/smoke.mjs smoke`: 70 PASS, 0 FAIL, 0 SKIP. The count equals the earlier count of 70 `[file: .opencode/reminders/plan/evolving-plan-2026-10-28.md:9]`.
  - `node scripts/smoke.mjs htv`: 98 PASS, 0 FAIL.
  - Group parity with `translator.book_memory`: 37 finished runs, 278 groups, 0 differences. The check includes the ED_3 text of each row against `cut_pairs`.
  - Mark places: 916 marks. 854 JA marks and 741 EN marks sit in rows, and 0 of them point at wrong text. 62 JA marks sit on pillar and caption items, which make no row.
  - TL_3 panel parser: 9 PASS. Page `kendojidai_2014/p0839` gives 536 of 721 lines.
  - Token refresh, token expiry, and three parallel saves: 12 PASS.
  - Chrome headless (hydration, typing, copy button, leave warning, Save, version load, comments, term pop-up, panel toggle, sign out): 27 PASS, 0 console errors.
  - P1 test `test_local.py`, shape fresh: 110 PASS, 0 FAIL. The run used port 8093 because the unit must not use port 8091.
- Port 3000 after the last edit: `/` and `/books` gave 200, and `/translate` gave 307 to the sign-in page.

#### 15.13.5 Facts found

- The run status sits in `summary.json`. The file `run.json` has no key `status`. The finished-run rule of section 15.12.4 stays right.
- A user token of PocketBase 0.39.10 lives 432000 seconds (5 days). The shortest value that the collection accepts is 10 seconds.
- An expired token gives 307 on the pages and 401 on the routes. `auth-refresh` of a fresh token returns the same token inside one second.
- One group has no ED_3 text: `kendojidai_2014/p0794/ts3/L11-L13` in the run `20261026T205247Z-r41`. The newest run of that page has ED_3 text for all groups.
- The unit did not start the local PocketBase on port 8090. A server that started before the file `1793300002_v2_batch.js` existed has the batch API off. It needs one restart.

#### 15.13.6 Not verified and open items

- Not verified:
  - A browser other than Chrome headless.
  - Load with many users at the same time.
  - A deploy on https. The cookie flag Secure follows the request scheme in code, and no test used https.
  - The effect of the migration on the live PocketBase server. Round 55 answer 5: the v2 migrations go to the own v2 PocketBase, and not to the live v1 server (section 15.14.9).
- Open items for the owner. The recommended default comes first in each item.
  - Item 1, reader access. (1) Keep the read-only view (recommended). Benefit: a reader can read the panel and the agent text. Cost: it differs from the reading of section 15.2. (2) Close the view to the reader. Cost: one check in the page route.
  - Item 2, pillar, caption, folio, and figure items. (1) Keep them out of the rows (recommended, book memory rule). Cost: 62 JA marks have no highlight. (2) Add a read-only block below the rows. Cost: a new layout part.
  - Item 3, the local PocketBase on port 8090. (1) Restart it once, so that it loads the batch migration (recommended). Cost: a short break. (2) Turn the batch API on in the dashboard. Cost: the setting is not in the repository.
  - Item 4, `data/scripts/pocketbase/README.md` names two migrations and port 8091. (1) Update it in the next P unit (recommended). (2) Leave it.
  - Item 5, the browser back button with unsaved text. (1) Leave as is (recommended). (2) Add a guard. Cost: more client code and history handling.
  - Item 6, a column "your latest version" in the page list. (1) Leave it out (recommended). (2) Add it. Cost: one more PocketBase call for each list view.
  - Item 7, the window title of the app. It reads "agent-translation-monitor" on all pages. (1) Keep it (recommended). (2) Set a title for each view.

Status: open.

### 15.14 Sync command S2 design (round 55)

- Source: owner answers 5 and 8 of round 55 and the notes of aki-main `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:145-158]`. Unit S2D wrote this section `[check: S2D 2026-10-28 16:47]`.
  - The unit writes docs only. It writes no code and it changes no repo file except the two doc files of this round.
  - The Q-A file stores the label of each accepted option. The full option texts are Not verified.
  - The design process of round 42 answer 9 applies: the owner states the need, aki-main restates it with project examples, the owner validates, then a docs unit writes the design, then a code unit builds it `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. This section is the docs unit. The owner has not validated it.
- The origin of S2. Round 52 answer 10 chose "Monitor on Mac, sync snapshots (Recommended)". The full answer reads `[accepted recommendation 2026-10-28 10:12]` "Same PocketBase, new collections (Recommended), Monitor on Mac, sync snapshots (Recommended), Own translations: writer and admin (Recommended), Skip the v1 seed file (Recommended), Python user script (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:81]`.
  - The part "Same PocketBase, new collections" is replaced. Round 55 answer 5 reads `[user 2026-10-28 16:29]` "option 1. Will it be easy to replace v1 with v2 later?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]`. Option 1 was "Own new PocketBase for v2 (Recommended)". The note of aki-main says: v2 gets its own new PocketBase on the same Oracle server behind v2.kendotranslation.com, with only the v2 migrations and fresh accounts `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`.
  - The part "Monitor on Mac, sync snapshots" stays. Round 54 answer 8 reads `[user 2026-10-28 15:01]` "option 1 for dev. but these data will be uploaded for deployment right?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:127]`. The note of aki-main answers yes, through S2 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:142]`.
- The change of plan for S2. Round 52 answer 13 did not choose S2 `[accepted recommendation 2026-10-28 10:12]` "P1 PocketBase base (Recommended), H1 human-translation-view (Recommended), T7 Translator fixes (Recommended)" with the note "not chosen now: S2 sync command" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:84]`. Round 55 answer 8 now chose the S2 design `[accepted recommendation 2026-10-28 16:29]` "S2 design + P3 README (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:153]`.
- Words used in this section. "Snapshot" is the JSON object of one finished page run. "Dry run" is a run that writes nothing. "Idempotent" means safe to run twice. "Upload" is a write to PocketBase from this Mac.

#### 15.14.1 The need, with one example

- The problem. The human-translation-view reads the run folders on this Mac today `[file: app/lib/htv-runs.ts:11-16]`. A deployed copy of the app on Vercel has no access to this Mac. The deployed copy must read the same data from PocketBase. S2 copies the data from the run folders into the collection `page_runs`.
- Example page: `mental_full/p014`. It has two finished runs `[check: S2D 2026-10-28 16:38 node size_draft.mjs, files summary.json and run.json]`:

| Run ID | Status | QA_3 | Page score | started_utc | Draft snapshot bytes |
| --- | --- | --- | --- | --- | --- |
| `20261026T195046Z-r41` | completed | PASS | 10.0 | 2026-10-26T19:50:46Z | 33,689 |
| `20261028T023007Z-r41` | completed | FAIL | 8.5 | 2026-10-28T02:30:07Z | 31,951 |

- Both runs cut 3 sentence groups. The first group key is `mental_full/p014/ts3/L01-L08`.
  - The JA text of the group starts with `はめた場合、普段の稽古への取り組み方を考える大きなヒントにな`. The group has 304 characters `[file: docs/VISION-viewer.md:823]`.
  - The ED_3 text of run `20261026T195046Z-r41` starts with `If applied, it becomes a great hint for thinking about how to approach everyday Keiko (practice).` The group holds 8 JA marks and 6 EN marks.
  - The ED_3 text of run `20261028T023007Z-r41` starts with `If you apply this, it becomes a great hint for thinking about how to approach your everyday Keiko (practice).` The group holds 8 JA marks and 7 EN marks.
- What the deployed view needs from these two runs:
  - The 3 rows of each run: the group key, the JA text, the ED_3 text, and the term marks with their place in the text.
  - The TL_3 panel blocks of each run: 18,099 bytes for the first run and 16,205 bytes for the second run.
  - The 6 termbase entries that the marks of each run cite.
  - The verdict and the page score of each run, and the list of the two runs for the run choice.
- What S2 uploads: 2 records in `page_runs`, one for each run. The first record holds `page_id` `mental_full/p014`, `item_id` `mental_full`, `run_id` `20261026T195046Z-r41`, `verdict` PASS, `qa3_page_score` 10.0, and the snapshot. The second record holds the values of the second run.
- What S2 does not upload: the other box files of the run folder, such as `raw/`, `parsed/`, `calls.jsonl`, and `critiques/`. The agent-translation-monitor stays on this Mac and reads them there.
- The newest run is `20261028T023007Z-r41` (FAIL). The page shows it first, unless the admin marks the older run in `run_marks`.

#### 15.14.2 What S2 reads

- The finished-run rule is the rule of `finishedRuns` `[file: app/lib/htv-runs.ts:30-51]`. S2 must use the same rule:
  - The folder sits in `data/pilot-run/<page folder>/`. The name of the run folder starts with a time stamp of the form `\d{8}T\d{6}Z` `[file: app/lib/htv-runs.ts:31]`.
  - The file `summary.json` holds `qa.QA_3.verdict` with the value PASS or FAIL `[file: app/lib/htv-runs.ts:35-38]`.
  - The files `results/TS_3.json` and `results/ED_3.json` exist `[file: app/lib/htv-runs.ts:39]`.
  - The text of `status` does not matter (round 53 answer 8) `[accepted recommendation 2026-10-28 12:34]` "Count it if QA_3 gave a verdict (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:102]`.
  - The newest run has the largest `started_utc` of `run.json`. A tie breaks on the folder name `[file: app/lib/htv-runs.ts:49]`.
  - A page folder name has the form `<slug>_p<digits>` `[file: app/lib/format.ts:32-35]`.
- Count on this Mac `[check: S2D 2026-10-28 16:38 node size_draft.mjs]`:
  - 37 finished runs, 30 pages, 5 pages with more than one finished run, and 12 items. The counts equal the counts of unit H1 `[file: docs/VISION-viewer.md:808-810]`.
  - 35 runs have status `completed` and 2 runs have status `completed with failures`. 34 runs have the verdict PASS and 3 runs have the verdict FAIL.
  - The 37 runs hold 278 sentence groups. Unit H1 found the same number `[file: docs/VISION-viewer.md:1046]`.
- Files that S2 reads for each run: `summary.json`, `run.json`, `results/TS_3.json`, `results/ED_3.json`, `messages/TL_3.txt`, `programs/term_marks.ED_3.json`, and `programs/en_form_check.ED_3.json` `[file: app/lib/htv-runs.ts:169-211]`.
  - Six of these files (all except `run.json`) have 50,610 to 242,215 bytes for each run. The median is 75,824 bytes `[check: S2D 2026-10-28 16:38 node size_draft.mjs]`.
  - S2 also reads the termbase file `termbase/termbase.draft.jsonl` (1030 entries, 3,037,882 bytes) and the item metadata file `item-metadata/items.filled.jsonl` (347 rows) `[check: S2D 2026-10-28 16:37 wc -lc]`.
  - S2 never writes into a run folder.
- Which pages S2 syncs. Question 1 asks the owner. The proposed command line has three forms:
  - No filter: every page folder with at least one finished run (30 pages).
  - `--page <slug>/<pNNN>`, for example `--page mental_full/p014`. The flag can repeat.
  - `--list <stamp>`, for example `--list 20261028T023006Z`. S2 reads the key `pages` of `data/pilot-run/lists/<stamp>/list.json`. That list holds 15 page IDs `[check: S2D 2026-10-28 16:40 python3 -B read of list.json]`. S2 skips a page with no finished run and prints its ID.

#### 15.14.3 What one snapshot holds

- The key list of section 15.12.2 `[file: docs/VISION-viewer.md:763-768]` is called shape B here. It holds `groups` (each with `group_key`, `part`, `ts_ids`, `ja`, `ed3_text`, `ed_index`, `marks`), `tl3_blocks`, `en_form_check`, `termbase`, and `verdict`. The loop notes repeat it `[file: docs/drafts/viewer-translator-loop-notes.md:374]`.
- `loadHtvPage` builds the type `HtvPageData` `[file: app/lib/htv-types.ts:79-99]`. The table shows where each field comes from and whether the snapshot of one run must hold it:

| Field of `HtvPageData` | Source today | In the snapshot |
| --- | --- | --- |
| `pageId`, `slug`, `page` | the page folder name | no, the record holds `page_id` |
| `bookTitle` | item metadata, `bookTitle(slug)` | no, see 15.14.5 |
| `verdict`, `score`, `runId`, `startedUtc`, `status` | `summary.json`, `run.json` | yes |
| `runs` | all finished runs of the page | no, the other records of the page hold them |
| `markedRunId`, `markNote` | `run_marks` in PocketBase | no |
| `rows` | TS_3 groups, ED_3 text, placed marks | yes |
| `panel` | `messages/TL_3.txt` | yes |
| `terms` | termbase entries that the marks cite | yes |
| `notes` | missing-file notes | yes |

- The difference between shape B and the page. Shape B keeps the marks as stored, with offsets inside the TS_3 item or the ED_3 item. The page needs the marks placed in the row text, with the result and detail of the EN form check. `placeMarks` does that work and needs the text of each item and the pieces of the ED_3 text `[file: app/lib/htv-groups.ts:166-205]`. A deployed app that reads shape B needs this code and the item texts. `HtvRow` has no field `ed_index` `[file: app/lib/htv-types.ts:51-62]`.
- Recommended shape A. S2 runs the same functions as the app and stores the built page of one run. The deployed app then maps the record to `HtvPageData` and runs no placement code. `[agent inference]`

```
{
  "snapshot_format": 1,
  "page_id": "mental_full/p014",
  "run_id": "20261028T023007Z-r41",
  "started_utc": "2026-10-28T02:30:07Z",
  "status": "completed",
  "verdict": "FAIL",
  "score": 8.5,
  "rows": [ ...HtvRow ],
  "panel": { ...PanelData },
  "terms": { "<entry_id>": { ...TermEntry } },
  "notes": []
}
```

- The keys inside `rows`, `panel`, and `terms` keep the names of the types `HtvRow` `[file: app/lib/htv-types.ts:51-62]`, `PanelData` `[file: app/lib/htv-panel.ts:37-46]`, and `TermEntry` `[file: app/lib/htv-types.ts:70-77]`. The size script leaves out `shortKey`, which is about 15 bytes for each row. The app derives it from `key` `[file: app/lib/htv-runs.ts:189]`.
- The page needs these fields from the snapshot: rows with marks, panel blocks, termbase entries, verdict, and score. The run list comes from the other records of the page. The record columns must hold the fields that the run list shows (15.14.5).
- The key `snapshot_format`. Recommended, with one number: 1. Reason: shape A freezes the output of `sentenceGroups`, `edForGroups`, `placeMarks`, `parseTl3Message`, and `termEntryView` at upload time. If one of them changes later, old snapshots keep the old output. The key lets the deployed app detect an old format. It also lets S2 find the records that it must rebuild. Cost: one key. `[agent inference]`
- Cost of shape A. A change of the placement code needs a new S2 upload of all runs. A new upload of 37 runs sends 2,100,601 bytes (15.14.4).

#### 15.14.4 Size

- Method. The throwaway script `<TMP>/r55/S2D/size_draft.mjs` builds shape A and shape B for each of the 37 finished runs and prints the JSON size in bytes `[check: S2D 2026-10-28 16:38 node size_draft.mjs]`. The output sits in `<TMP>/r55/S2D/size_draft.out.txt`.
  - The script loads the real files `app/lib/htv-groups.ts` and `app/lib/htv-panel.ts` with Node type stripping. Node v24.6.0 needed no flag. It printed one warning, `MODULE_TYPELESS_PACKAGE_JSON`, because `app/package.json` has no key `type`.
  - `app/lib/htv-runs.ts` cannot load outside Next. It imports `server-only` and `./json` without a file extension `[file: app/lib/htv-runs.ts:1-9]`. The script copies the logic of `finishedRuns`, `loadHtvPage`, and `termEntryView`. The copy is a draft, not S2.
- Result, in bytes of compact JSON in UTF-8:

| Measure | Shape A (recommended) | Shape B (15.12.2 keys) | Six source files |
| --- | --- | --- | --- |
| Runs | 37 | 37 | 37 |
| Minimum | 25,468 | 31,628 | 50,610 |
| Page of the minimum | `eiga_full/p159`, run `20261026T202055Z-r41` | same | same |
| Median | 51,432 | 69,088 | 75,824 |
| Maximum | 134,753 | 183,603 | 242,215 |
| Page of the maximum | `kendojidai_2014/p0839`, run `20261026T205441Z-r41` | same | same |
| Sum | 2,100,601 | 2,835,950 | 3,222,121 |

- Compare with the limit. The field `snapshot` has `maxSize: SNAPSHOT_BYTES` with 5,242,880 bytes `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:20]` `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:163]`.
  - The largest shape A is 134,753 bytes. That is 2.6 percent of the limit.
  - No run is above 1,048,576 bytes (1 MB) in shape A or in shape B. The default limit of a JSON field is about 1 MB `[file: docs/VISION-viewer.md:770]`.
  - Unit P1 tested the limit: a 2 MB snapshot works, and a 6 MB snapshot fails `[file: data/scripts/pocketbase/test_local.py:517-520]`.
- Parts of shape A over the 37 runs:
  - The panel holds 968,498 bytes (46.1 percent).
  - The termbase entries hold 706,330 bytes (33.6 percent).
  - The rows hold 418,040 bytes (19.9 percent).
  - The rest is 7,733 bytes.
- All runs or the newest run of each page. The newest run of each of the 30 pages sums to 1,778,845 bytes. All 37 runs sum to 2,100,601 bytes. The 7 older runs add 321,756 bytes.
- Termbase copies. The marks of the 37 runs cite 434 entries, and 156 entries are different. The 156 entries have 267,725 bytes in the compact form. The copies in the snapshots have 706,330 bytes. About 438,605 bytes are repeats.
- Not verified: how PocketBase stores the JSON field. The size limit of one request to PocketBase. The size of the database file on the server.

#### 15.14.5 Which collections S2 fills

- `page_runs`. S2 fills it for sure. The fields are `page_id`, `item_id`, `run_id`, `verdict`, `qa3_page_score`, `finished`, and `snapshot` `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:156-164]`. There is a unique index on (`page_id`, `run_id`) `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:166]`. The rules are: list and view for a translator or an admin, and create, update, and delete for a superuser only (`null`) `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:151-155]`.
  - `page_id` is the folder name with the last `_` turned into `/`, for example `mental_full/p014`. `item_id` is the slug, for example `mental_full`.
- Gap 1: the run list needs `startedUtc` and `status`. `HtvRun` holds `runId`, `startedUtc`, `status`, `verdict`, and `score` `[file: app/lib/htv-types.ts:15-23]`. The run choice shows `startedUtc` and the page shows `status` `[file: app/components/HtvEditor.tsx:196]` `[file: app/components/HtvEditor.tsx:242]`. The collection has no column for either value. A list request must not read the snapshots, because 37 snapshots have 2.1 MB. The app already reads a list with `fields` and no big field `[file: app/lib/pb.ts:286-289]`.
- Gap 2: the field `finished` has no source. Neither `summary.json` nor `run.json` holds a finish time. `run.json` has the keys `page`, `levels`, `critic`, `critic_mode`, `jobs`, `max_usd`, `started_utc`, `models`, and `voyage`. `summary.json` has `wall_seconds` in all 37 runs `[check: S2D 2026-10-28 16:38 python3 -B read of two summary.json and run.json files, node size_draft.mjs]`. Question 5 asks the owner.
- Gap 3: the rule of `page_runs` closes it to the reader. A reader token gets no record `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:151-152]`. The human-translation-view shows a read-only page to a reader today `[file: docs/VISION-viewer.md:1024]`. After the switch the reader sees no page. Question 12 asks the owner.
- `catalog_items` and `magazine_chapters`. The deployed list page needs the book title. The app gets it today from `bookTitle(slug)` `[file: app/lib/htv-runs.ts:75]` `[file: app/lib/htv-runs.ts:218]`.
  - `bookTitle` reads `item-metadata/items.filled.jsonl`, or `items.draft.jsonl` if the filled file is empty. It returns `title_en`, or `title_ja` if `title_en` is empty `[file: app/lib/books.ts:20-27]` `[file: app/lib/books.ts:107-111]`.
  - The Books tab of the monitor reads `pilot-sample/book-slugs.json` (36 books), the item metadata, and `item-metadata/magazine-chapters.jsonl` `[file: app/lib/books.ts:39-41]`. The human-translation-view does not use the chapters.
  - `items.filled.jsonl` has 347 rows and 648,576 bytes. The 12 items with a finished run have 11 rows in that file and 51,200 bytes. The row of the web article is missing under the short ID (next bullet) `[check: S2D 2026-10-28 16:40 python3 -B read of items.filled.jsonl]`.
  - `magazine-chapters.jsonl` has 103 rows and 691,603 bytes. The 26 rows of `kendojidai_2012` and `kendojidai_2014` have 171,918 bytes `[check: S2D 2026-10-28 16:40 python3 -B read of magazine-chapters.jsonl]`.
  - The fields of both collections `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:109-119]` `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:131-142]` exist as keys in the two files `[check: S2D 2026-10-28 16:37 python3 -B read of the first row of each file]`.
  - A web article has two names. The page folder is `18d4ac29_p001` with slug `18d4ac29`. The item row has `item_id` `18d4ac29-12d5-4753-b032-35337361fee5`. `bookTitle("18d4ac29")` finds no row, so the list shows no title for this page today `[check: S2D 2026-10-28 16:40 grep of items.filled.jsonl]` `[agent inference from app/lib/books.ts:107-111]`.
  - Two items have no `publish_year` (`None`). The field `publish_year` is text. How PocketBase takes a null for a text field is Not verified.
  - Question 6 asks the owner.
- Termbase. Shape A holds the cited entries in each snapshot (15.14.4). No collection exists for termbase entries. The migration creates six collections only `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:192]`. Question 7 asks the owner.
- `run_marks`. The marks of the admin live in PocketBase already `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:84-100]`. S2 does not touch them. A mark names a run ID. If a run record leaves `page_runs`, the page shows the note for a stale mark `[file: app/lib/htv-runs.ts:226]`.

#### 15.14.6 How S2 talks to PocketBase

- Sign-in. S2 signs in as superuser, as `pb_users.py` does `[file: data/scripts/pocketbase/pb_users.py:77-84]`:
  - The call is `POST /api/collections/_superusers/auth-with-password` with the body `identity` and `password`.
  - The email comes from `--superuser EMAIL` or from the variable `PB_SUPERUSER_EMAIL` `[file: data/scripts/pocketbase/pb_users.py:154-155]`.
  - The password comes from a hidden prompt, and not from argv, env, or a file `[file: data/scripts/pocketbase/pb_users.py:6-10]`.
  - The token stays in memory.
  - The URL check allows plain http only for 127.0.0.1 and localhost. Any other host needs https `[file: data/scripts/pocketbase/pb_users.py:36-43]`.
- A superuser can create a record in `page_runs`. Unit P1 tested a create with a superuser token `[file: data/scripts/pocketbase/test_local.py:507]` `[file: data/scripts/pocketbase/test_local.py:517]`. A duplicate (`page_id`, `run_id`) fails `[file: data/scripts/pocketbase/test_local.py:515-516]`. An update by a superuser is Not verified.
- One request for each record. The batch API is on, with `maxRequests` 200 and `timeout` 10 `[file: data/scripts/pocketbase/pb_migrations/1793300002_v2_batch.js:22-31]`. A batch of 37 snapshots has 2.1 MB. Whether that fits in 10 seconds and in the request limit is Not verified. One request for each record also keeps the other records safe when one fails. `[agent inference]`
- Idempotence (safe to run twice). The unique index makes a second create fail. S2 must look up the record first. Question 4 gives three options. The recommended option is: read the record of (`page_id`, `run_id`), skip it if the snapshot is equal, and update it if not.
- A report at the end lists the counts: created, updated, unchanged, skipped (no finished run), and on the server only. It lists the run IDs of each group.
- A run folder deleted on this Mac. S2 does not delete the record by default. It lists the record as "on the server only". Question 11 asks the owner.
- Dry run. A dry run signs in, reads the records, and prints what S2 will create or update. It writes nothing. Question 10 asks the owner which mode is the default.
- Safety checks before a write: the snapshot size is below 5,242,880 bytes, the key `snapshot_format` is present, and the URL passes the check above.
- The superuser account of the own v2 PocketBase does not exist yet. Its email is Not verified.

#### 15.14.7 Where the S2 code lives and in which language

- Three options. The benefit and the cost of each follow from the code that exists today.
  - (a) A Python script in `data/scripts/pocketbase/` next to `pb_users.py`.
    - Benefit: standard library only, a hidden prompt (`getpass`), and the URL check already exist in `pb_users.py` `[file: data/scripts/pocketbase/pb_users.py:36-43]`. The groups can come from `translator.book_memory.sentence_groups` `[file: kendo-translation-translator/data/scripts/translator/book_memory.py:82]`.
    - Cost: the other four pieces exist in TypeScript only. They are the ED_3 pieces with the strip offsets `[file: app/lib/htv-groups.ts:109-140]`, the mark placement `[file: app/lib/htv-groups.ts:166-205]`, the TL_3 parser `[file: app/lib/htv-panel.ts:51-128]`, and the term view `[file: app/lib/htv-runs.ts:130-150]`. That is about 170 lines to port, plus the helpers for Python `strip` and code point counts `[file: app/lib/htv-groups.ts:14-31]`. The port needs its own parity test. The script also needs a path to the Translator package or a second copy of the group rule.
  - (b) A Node script in `app/scripts/`, next to `smoke.mjs`, that loads `htv-groups.ts` and `htv-panel.ts`.
    - Benefit: S2 runs the same functions as the app. The snapshot equals the page of today by construction. The size script loaded both files without a flag. Node v24.6.0 has `fetch`. `app/package.json` lists no PocketBase library `[file: docs/VISION-viewer.md:877]`, and S2 can call the REST API with `fetch` as the server routes do `[agent inference]`.
    - Cost: `htv-runs.ts` cannot load in Node (15.14.4). The code of `loadHtvPage` and `termEntryView` must move to a pure file, or S2 must copy it. A copy can drift. Node has no `getpass`, so the hidden prompt needs about 15 lines of new code `[agent inference]`. A pure file that imports `./htv-groups` without the extension `.ts` does not load in Node. Whether the Next configuration allows the extension is Not verified.
  - (c) Two steps. A Node script builds the snapshots into a folder of JSON files. A Python script in the style of `pb_users.py` uploads them.
    - Benefit: the TypeScript code builds the snapshots, and the Python code keeps the hidden prompt and the URL check. The files can be read and compared before the upload. A dry run needs no server.
    - Cost: two programs, one folder between them, and two sets of options to explain.
- Recommended default: (b). The main risk of S2 is that the deployed page differs from the page on this Mac. Option (b) has one copy of the rules. Round 52 answer 10 chose Python for the user script, and it did not choose a language for S2 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:81]`. `[agent inference]`
- Parity test, for every option. The deployed page built from the snapshot must equal the page built from the files:
  - Data level: for each of the 37 runs, build `HtvPageData` from the files and from the snapshot. Compare `rows`, `panel`, `terms`, `notes`, `verdict`, `score`, `runId`, `startedUtc`, and `status`. The expected result is 0 differences.
  - To reach the older runs, the test needs a function that takes a run ID. `loadHtvPage` takes only the admin mark today `[file: app/lib/htv-runs.ts:159-164]`.
  - Screen level: run smoke mode `htv` twice against a throwaway PocketBase, once with `runSource` `files` and once with `pocketbase`, and compare the page text `[file: app/scripts/smoke.mjs:316-655]`. That the smoke helpers can compare two runs is Not verified.
  - Group rule: the script `<TMP>/r54/H1/parity/parity.py` compares the TypeScript groups with `translator.book_memory`. Unit H1 found 278 groups and 0 differences `[file: docs/VISION-viewer.md:1046]`. The test stays as the check of the group rule.
  - Limit: every snapshot is below 5,242,880 bytes.

#### 15.14.8 How `htv-runs.ts` switches its source

- The config key. Add the key `runSource` to `viewer.config.json`. The value `files` is the default and keeps the behavior of today. The value `pocketbase` reads `page_runs`. `loadConfig` reads the file and throws an error if `translatorDataDir` is missing `[file: app/lib/config.ts:25-34]`. On Vercel no Translator data folder exists, so `translatorDataDir` must become optional when `runSource` is `pocketbase`. `[agent inference]`
- The header of `htv-runs.ts` says that the switch changes the functions of this file only `[file: app/lib/htv-runs.ts:15]`. The check shows more:
  - The three read functions take no token. `page_runs` needs the user token (rule 15.14.5, gap 3). The functions `finishedRuns`, `listFinishedPages`, `loadHtvPage`, and `rowsForSave` get a token parameter.
  - Four callers pass the call: `app/translate/page.tsx:22`, `app/translate/[slug]/[page]/page.tsx:28`, `app/api/htv/mark/route.ts:16`, and `app/api/htv/save/route.ts:30` `[check: S2D 2026-10-28 16:44 grep of the functions]`. Each caller holds a token (`s.token` or `g.token`).
- Functions that change:
  - `finishedRuns` (l30): it reads `page_runs` with a filter on `page_id` and the fields `run_id`, `verdict`, `qa3_page_score`, `started_utc`, and `status`, sorted by `started_utc` descending. It needs the new columns of question 5.
  - `listFinishedPages` (l65): one list of all `page_runs` without the snapshot replaces the scan of the folder. It groups the records by `page_id`. The book title comes from `catalog_items`.
  - `loadHtvPage` (l159): it reads the snapshot of the shown run and maps it to `HtvPageData`. It reads no file.
  - The termbase read (l103-127): it is not used at read time, because `terms` sits in the snapshot.
- Functions that stay: `pickShownRun` (l54, pure) and the type file. `rowsForSave` (l235) changes only through `loadHtvPage`.
- The monitor routes still read files. On Vercel they have no data folder. How the deploy hides them is Not verified.
- A test on this Mac needs no server change: set `pocketbaseUrl` to the local PocketBase and `runSource` to `pocketbase` after an S2 upload to it.

#### 15.14.9 Deploy path in short (answer to "Will it be easy to replace v1 with v2 later?")

- The question reads `[user 2026-10-28 16:29]` "option 1. Will it be easy to replace v1 with v2 later?" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:150]`. Round 53 answer 14 set the start of the deploy steps: "After H1 works locally (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:108]`.
- Facts that the repos hold:
  - The live v1 PocketBase runs on an Oracle Cloud ARM instance. The v1 files name `/opt/pocketbase` `[file: kendo-translation-viewer-v1/migration/pocketbase/README.md:114]` `[file: kendo-translation-viewer-v1/migration/pocketbase/README.md:118]`, the service `pocketbase` `[file: kendo-translation-viewer-v1/migration/pocketbase/ROLLBACK.md:130]`, and the address `https://155-248-165-196.nip.io` `[file: kendo-translation-viewer-v1/migration/pocketbase/ROLLBACK.md:132]`. Nobody verified these on the server in this unit.
  - The v1 README says that the flag `--migrationsDir` is required, or the custom migrations are skipped `[file: kendo-translation-viewer-v1/migration/pocketbase/README.md:121]`.
  - The v1 README names a reverse proxy (Caddy or nginx) for the case of no real domain `[file: kendo-translation-viewer-v1/migration/pocketbase/README.md:133]`.
  - The v2 app calls PocketBase from server routes with plain `fetch`. The browser never calls PocketBase `[file: docs/VISION-viewer.md:1014]`. So the browser needs no cross-origin setting for PocketBase `[agent inference]`.
  - The live site stays v1 until the owner names a switch date `[file: docs/VISION-viewer.md:63]`.
- Steps, in order. Each step is a fact or a proposal, and the status is marked:
  - Step 1, the server. Add a second PocketBase in its own folder, with its own port, its own `pb_data`, and its own systemd service. The v1 service keeps its name and its folder. Status: proposal. The ports and the proxy of v1 are Not verified.
  - Step 2, the proxy. Two PocketBase servers cannot both listen on port 443. A reverse proxy (Caddy or nginx) can route by host name. Status: `[agent inference]`. How v1 is served now is Not verified.
  - Step 3, the version and the migrations. Use PocketBase 0.39.10 for linux/arm64 (the local server is 0.39.10 `[file: docs/VISION-viewer.md:771]`). Copy the three v2 migrations and start with `--migrationsDir`. Status: proposal.
  - Step 4, the accounts. Create the superuser and the accounts with `pb_users.py` over https. The 15 v1 users do not move `[file: .opencode/reminders/plan/evolving-plan-2026-10-28.md:83]`. The owner sets new passwords. v1 data in the 25 v1 collections does not move unless the owner decides `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`.
  - Step 5, the names. The app and the PocketBase need two different host names. Round 55 names v2.kendotranslation.com only `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:158]`. One host name cannot point at Vercel and at the Oracle server `[agent inference]`. Question 13 asks the owner. The DNS provider is Not verified.
  - Step 6, the app. Make a new Vercel project from the branch `v2/viewer`. The app needs the PocketBase address and `runSource` `pocketbase`. The Mac path in `viewer.config.json` must not be required. Status: proposal. Vercel was not opened.
  - Step 7, the first upload. Run S2 from this Mac against the own v2 PocketBase over https. Check the list, one page, and one Save with each role.
  - Step 8, the switch. Move the domain kendotranslation.com from the v1 project to the v2 project in Vercel. Keep the v1 PocketBase on for a time. Make a backup of its `pb_data`. The way back is to move the domain to the v1 project again. Status: Not verified. Vercel was not opened.
- The answer to the question in facts. The v2 app, the v2 PocketBase, and the v2 accounts do not touch v1. The only shared item is the server, and later the domain. Three unknowns decide the effort. They are the ports and the proxy of v1 on the server, the host name of the v2 PocketBase, and the Vercel side. `[agent inference]`

#### 15.14.10 Old lines that round 55 changes

- Unit S2D changed these lines in place, one old line to one new line. Each old text stays and a short note follows `[check: S2D 2026-10-28 16:47 difflib]`:
  - `docs/VISION-viewer.md` l610 (sign-in line, "v1 setup files"), l659 (answers 9 to 11 of round 52, "same PocketBase"), l690 (the v2 app uses the same live PocketBase), l697 (header "Collection users (reuse)"), and l699 (keep the v1 values, `qa` included).
  - `docs/VISION-viewer.md` l778 (header of 15.12.3), l788 (live-shape test), l790 (words of 15.11.6), and l791 (status of 15.12.3, now closed).
  - `docs/VISION-viewer.md` l894 and l898 (S2 not chosen), l968 (item 1 of 15.12.7), and l1068 (effect of the migration on the live server).
  - `docs/drafts/viewer-translator-loop-notes.md` l375 ("S2 is not now").
- Lines that stay as history, with no change: l80, l325, and l487 say "v1 setup files" in the sign-in history. l610 and 15.12.3 carry the note. l908, l951, and l953 name "the live PocketBase" in option texts for H1. The loop notes l356 and l374 stay.
- The finished-run line of the loop notes l376 names only `results/ED_3.json`. The code needs `results/TS_3.json` also `[file: app/lib/htv-runs.ts:39]`. Unit S2D did not change l376, because round 55 does not make it wrong. The new section in the loop notes names both files.

#### 15.14.11 Questions for the owner

- The recommended default comes first in each question. Each question has an example from this project.

##### Question 1: which pages S2 syncs

- Problem. S2 can send every page or a part. Example: the folder `data/pilot-run` holds 30 pages with a finished run. The list `20261028T023006Z` names 15 pages.
- Options:
  - (1) No filter sends all 30 pages. The flags `--page` and `--list` narrow the set (recommended). Benefit: the deployed list equals the list on this Mac. One command. Cost: a test page also goes up, for example `men0/p005` with the runs `test13` and `test13b`.
  - (2) Only `--list <stamp>`. Benefit: the owner picks the pages. Cost: a page that no list names never goes up.
  - (3) Only `--page`. Benefit: the smallest upload. Cost: many commands.

##### Question 2: the shape of the snapshot

- Problem. The key list of section 15.12.2 is the old draft. The page needs placed marks. Example: group `mental_full/p014/ts3/L01-L08` of run `20261028T023007Z-r41` has 8 JA marks and 7 EN marks, and each mark needs a place in the row text.
- Options:
  - (1) Shape A, the built page of one run, with `snapshot_format` 1 (recommended). Benefit: the deployed app maps the record and runs no placement code. The sum is 2,100,601 bytes. Cost: a change of the placement code needs a new upload.
  - (2) Shape B, the key list of 15.12.2. Benefit: it keeps raw data. The sum is 2,835,950 bytes. Cost: the deployed app needs `placeMarks` and the item texts, and a second parity test.
  - (3) Shape A without `snapshot_format`. Benefit: one key less. Cost: no way to tell an old snapshot from a new one.

##### Question 3: the language and the place of the S2 code

- Problem. The group rule and the placement code exist in TypeScript and the group rule in Python. Example: `placeMarks` puts the mark `jaMarks` of group `L01-L08` at the right character, and a Python copy of this code must give the same offsets.
- Options:
  - (1) A Node script in `app/scripts/` that loads the app code (recommended). Benefit: one copy of the rules. Cost: a small move of `loadHtvPage` code into a pure file, and a hidden prompt in Node.
  - (2) A Python script next to `pb_users.py`. Benefit: the style of `pb_users.py`. Cost: about 170 lines ported, and a parity test.
  - (3) Node builds files, and Python uploads them. Benefit: files to compare before the upload. Cost: two programs.

##### Question 4: the rule when a record exists

- Problem. The unique index (`page_id`, `run_id`) rejects a second create. Example: the owner runs S2 twice for `mental_full/p014`. The second run must not fail and must not leave a copy.
- Options:
  - (1) Read the record. Skip it if the snapshot is equal. Update it if not (recommended). Benefit: safe to run twice, and a new rule reaches the old records. Cost: one read of up to 135 KB for each run.
  - (2) Always update. Benefit: no compare code. Cost: 37 writes for each run of S2, even with no change.
  - (3) Skip a record that exists. Benefit: the simplest code. Cost: a changed snapshot never reaches the server.

##### Question 5: the run columns and the field `finished`

- Problem. The run choice shows the start time and the status of each run, and the collection has no column for them. The field `finished` has no source. Example: the run list of `mental_full/p014` shows `20261028T023007Z-r41 · FAIL · 2026-10-28T02:30:07Z` `[file: app/components/HtvEditor.tsx:242]`.
- Options:
  - (1) A new migration `1793300003` adds the text fields `started_utc` and `status`. S2 fills `finished` with `started_utc` plus `wall_seconds` (recommended). Benefit: the list reads columns, sorts on `started_utc`, and reads no snapshot. Cost: one more migration and one more P1 test run. The sum is an estimate of the finish time `[agent inference]`.
  - (2) No migration. S2 puts `started_utc` into `finished`, and the status stays in the snapshot. Benefit: no code in the PocketBase part. Cost: the name `finished` is wrong, and the run list cannot show the status without a snapshot read.
  - (3) Read the snapshots for the run list. Benefit: no new column. Cost: 2.1 MB for a list of 37 runs.

##### Question 6: `catalog_items` and `magazine_chapters`

- Problem. The deployed list needs the book title, and the Books tab and the later reader pages need the item rows. Example: `mental_full` has a `title_en` in `items.filled.jsonl` that starts with "Making the Difference on the Day". The web article `18d4ac29` has a different ID in the item file.
- Options:
  - (1) S2 fills `catalog_items` for the items with a finished run (12 items, about 51 KB) and fills `magazine_chapters` later (recommended). Benefit: the list gets titles, and the collection design is in use. Cost: the web article needs a rule for its long ID. Without a rule the title stays empty, as it is today.
  - (2) S2 fills all 347 items and all 103 chapters (about 1.3 MB). Benefit: the reader pages find the data later. Cost: data that no deployed view reads yet.
  - (3) S2 fills no catalog. The page_runs row holds a title column. Benefit: one collection less. Cost: the title repeats in every run, and `catalog_items` stays empty.

##### Question 7: the termbase entries

- Problem. The term pop-up needs the entry text. Example: run `20261028T023007Z-r41` cites 6 entries, and the whole termbase has 1030 entries (3,037,882 bytes).
- Options:
  - (1) One copy of the cited entries in each snapshot (recommended). Benefit: no new collection. The page needs one read. Cost: 438,605 bytes of repeats over 37 runs.
  - (2) A new collection `termbase_entries` with one record per entry. Benefit: no repeats. 156 entries are cited now. Cost: a new migration, a second read for each page, and a new fill rule in S2.

##### Question 8: when S2 runs

- Problem. The deployed view shows only what S2 uploaded. Example: run `20261028T023007Z-r41` is FAIL. If S2 does not run after a new run, the deployed page keeps the old data.
- Options:
  - (1) By hand, after the owner checks the runs (recommended). Benefit: no change in the Translator, and the owner decides what goes up. Cost: the owner must remember.
  - (2) After each list or chain run, started by the Translator launcher. Benefit: no step to forget. Cost: a change in the Translator, and a failed run can trigger an upload of half-done data.
  - (3) On a timer. Benefit: no step to remember. Cost: a stored superuser password. The rules of `pb_users.py` forbid it `[file: data/scripts/pocketbase/pb_users.py:6-10]`, and S2 follows the same rules `[agent inference]`.

##### Question 9: old runs

- Problem. A page can have several finished runs. Example: `left_foot_full/p046` has 2 runs. 4 of 5 rows differ between them `[file: docs/VISION-viewer.md:838]`.
- Options:
  - (1) Send all finished runs (recommended). Benefit: the run choice and the run marks of the admin work for old runs. Saved versions name their run ID. Cost: 321,756 bytes more than the newest runs only.
  - (2) Send the newest finished run of each page. Benefit: 1,778,845 bytes. Cost: no run choice, and a saved version can name a run that is not on the server.

##### Question 10: the default mode

- Problem. An upload changes the server. Example: a wrong `--url` can send 37 snapshots to the wrong server.
- Options:
  - (1) Dry run is the default. The flag `--apply` writes (recommended). Benefit: a safe first call. Cost: one more flag.
  - (2) Write is the default. The flag `--dry-run` shows the plan. Benefit: one call less. Cost: a slip writes.

##### Question 11: a run folder deleted on this Mac

- Problem. A record can stay on the server after its folder is gone. Example: a test run folder of `men0_p005` is removed. A saved version and an admin mark can name that run.
- Options:
  - (1) S2 keeps the record and lists it as "on the server only" (recommended). Benefit: no data loss. Cost: the record stays until the owner removes it.
  - (2) The flag `--prune` deletes such records after a prompt. Benefit: the server follows the Mac. Cost: a deleted record cannot return, and a saved version loses its run.
  - (3) S2 always deletes them. Benefit: no flag. Cost: the same loss, with no prompt. This option is destructive and has no recommended mark.

##### Question 12: the reader and `page_runs`

- Problem. The rule of `page_runs` lets only a translator or an admin read it. H1 shows the page to a reader today. Example: reader@kendo-translation.local opens `/translate/mental_full/p014` on this Mac and sees the page. After the switch the same call returns no record.
- Options:
  - (1) Keep the rule and close the human-translation-view to the reader (recommended). Benefit: no migration. It fits the round 43 text that the view is for the translator role `[file: docs/drafts/viewer-translator-loop-notes.md:331]`. Cost: one check in the page route. It differs from the default of H1 `[file: docs/VISION-viewer.md:1070]`. `[agent inference]`
  - (2) Open the list and view rules of `page_runs` to every signed-in user. Benefit: the read-only view stays. Cost: a new migration, and a reader reads the full TL_3 panel.

##### Question 13: the host name of the v2 PocketBase

- Problem. The app on Vercel and the PocketBase on Oracle need two host names. Round 55 names v2.kendotranslation.com only. Example: S2 uploads to the PocketBase URL, and the Vercel app calls the same URL from its server routes.
- Options:
  - (1) A second subdomain for the PocketBase, for example a name under kendotranslation.com (recommended). Benefit: clean separation, and a certificate for each name. Cost: one more DNS record.
  - (2) A route on v2.kendotranslation.com that forwards to Oracle. Benefit: one name. Cost: a forward rule on the Vercel side. Not verified.
  - (3) A nip.io name of the Oracle IP, as v1 does. Benefit: no DNS record. Cost: v1 already uses the plain nip.io name of this IP address `[file: kendo-translation-viewer-v1/migration/pocketbase/ROLLBACK.md:132]`. A second nip.io name is Not verified.

#### 15.14.12 Not verified

- The full option texts of round 55 answers 5 and 8. The Q-A file stores labels and short notes.
- Anything on the Oracle server, in Vercel, in DNS, and at the live v1 PocketBase. Unit S2D contacted none of them.
- An update of a `page_runs` record by a superuser. A batch of 37 snapshots. The request size limit of PocketBase.
- How PocketBase takes a null for a text field.
- Whether Next accepts an import with the extension `.ts`. Whether the smoke helpers can compare two runs.
- The effort to port the 170 lines to Python. The count comes from the line ranges above.
- The size of shape A after the real S2 code. The script is a draft and leaves out `shortKey`.
- The host names of the v2 app and of the v2 PocketBase.
- How the deploy hides the monitor routes on Vercel.
- The superuser email of the own v2 PocketBase.
- The owner has not validated this design.

Status: questions 1 to 12 decided in round 56 answers 3 to 5, question 13 in answer 6 (section 15.15).

### 15.15 S2 code state (round 56)

- Source: owner answers 3 to 6 of round 56 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:163-166]` and answer 10 "S2 code + switch, local (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:170]`. Unit S2C built the code `[check: S2C 2026-10-28 20:09]`.
- Scope. The unit builds the sync command S2, the migration 1793300003, and the switch to `page_runs`. It tests all three on this Mac only. It contacts no server outside 127.0.0.1.
- Size rule. Every size in this section is in MB. One MB is 1,048,576 bytes. The limit of the field `snapshot` is 5 MB.
- Words. "Dry run" is a run that writes nothing. "Idempotent" means safe to run twice.

#### 15.15.1 Commands

- Files. The command is `app/scripts/sync-runs.mjs`. It uses `app/lib/htv-build.ts`, the file that the app uses to build a page. So the rules exist once.
  - `app/scripts/ts-resolve-hook.mjs` lets plain Node load the app files. The app files import each other without the extension `.ts`. The hook adds it. No app import line changed.
  - Node v24.6.0 loads the `.ts` files by type stripping. Older Node versions are Not verified.
- Dry run. It is the default. It builds every snapshot, signs in as superuser, compares each snapshot with the stored record, and writes nothing. Open a terminal in the app folder and run:

```
cd /Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer/app
node scripts/sync-runs.mjs --superuser superuser@kendo-translation.local
```

- Apply. The option `--apply` writes. One request goes out for each record.

```
node scripts/sync-runs.mjs --superuser superuser@kendo-translation.local --apply
```

- Filters. Without a filter the command takes every page with a finished run (30 pages, 37 runs today).
  - `--page mental_full/p014` takes one page. The option can repeat.
  - `--list PATH` takes the pages of a list. PATH is a list folder with `list.json` (key `pages`), a `.json` file, or a text file with one page ID per line.
  - Example: `--list /Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data/pilot-run/lists/20261028T023006Z`
- Other options. `--url URL` names the server (default `http://127.0.0.1:8090`, plain http only for 127.0.0.1 and localhost). `--superuser EMAIL` or the env variable `PB_SUPERUSER_EMAIL` names the account. `--data DIR` names the Translator data folder. `--offline` runs a dry run with no sign-in. `--help` shows the text.
- Password. A hidden prompt asks for it. If stdin is not a terminal, the command reads one line from stdin. The command never reads a password from an option, an env variable, or a file. It never prints the password or the token.
- Choice of the unit. A dry run signs in by default, because the compare with the server needs it. The option `--offline` skips the compare and prints "not compared".
- Safety before any write: the URL rule, the key `snapshot_format`, and the size of each snapshot below 5 MB. If one check fails, the command writes nothing and exits with code 1. A failed write gives exit code 1 and the PocketBase message `[check: S2C 2026-10-28 20:08 run_screen.py smoke]`.

#### 15.15.2 What the counts mean

- `created`: the record did not exist. The command made it.
- `updated`: the record existed and differed from the new snapshot or from a column. The command wrote the new values.
- `unchanged`: the record equals the new data. The command wrote nothing.
- `failed`: the write got an error. The line names the run and the PocketBase message.
- `skipped (no finished run)`: a page in the selection has no finished run, or has no run folder.
- `on the server only`: a record has no finished run folder on this Mac. The command keeps the record and never deletes. With a filter, the line lists only the pages of the filter.
- `would create` and `would update` replace `created` and `updated` in a dry run.
- The compare uses the columns and the snapshot with sorted keys. The date `finished` is compared as a point in time.

#### 15.15.3 The migration 1793300003

- File: `data/scripts/pocketbase/pb_migrations/1793300003_v2_page_runs_columns.js`.
- It adds the text fields `started_utc` and `status` to `page_runs`, only if they are missing.
- It sets `listRule` and `viewRule` of `page_runs` to `@request.auth.id != ""`. Round 56 answer 5 chose "Keep reader read-only". `createRule`, `updateRule`, and `deleteRule` stay `null` (superuser only).
- The down function puts back the old list and view rules (translator or admin). It keeps the fields and all data. The up direction ran twice in test check 13b without error. The down direction sets fixed values, so a second run changes nothing `[agent inference]`.
- The field `finished` is computed. S2 adds `wall_seconds` of `summary.json` to `started_utc`. The result is an estimate of the end time.
- The P1 test now checks 120 PASS and 0 FAIL, shape `fresh` `[check: S2C 2026-10-28 20:04 python3 -B run_p1_test.py]`. The new checks: an anonymous list fails, a reader lists and views `page_runs`, a reader and a translator cannot create, update, or delete, the superuser creates and updates, the new fields exist, and the down and up steps change the rules. The test of the shape `live-shape` needs the v1 files and did not run.
- The local server on port 8090 restarted once to load the file. The new PID is 59793 `[check: S2C 2026-10-28 20:04 pgrep -fl 'pocketbase serve']`.

#### 15.15.4 The switch `runSource`

- Key in `viewer.config.json`: `runSource`. The value `files` is the default. It reads the run folders and works as in H1. The value `pocketbase` reads `page_runs` and `catalog_items`.
- The tracked `app/viewer.config.json` does not hold the key. The dev server on port 3000 keeps the value `files`.
- With `runSource` `pocketbase`, the key `translatorDataDir` is optional. The agent-translation-monitor (tabs Runs and Books) still reads files. Without the key it shows an error. (Round 58: code reading by unit DP1A shows empty tables and 404 pages, and 500 only on /api/file and /api/pause `[file: app/lib/json.ts:6-58]`. Round 58 answer 7 hides the monitor on the deploy, unit DPC.)
- Changed code: `app/lib/htv-runs.ts`, `app/lib/config.ts`, `app/lib/pb.ts`, and the four callers `app/app/translate/page.tsx`, `app/app/translate/[slug]/[page]/page.tsx`, `app/app/api/htv/mark/route.ts`, and `app/app/api/htv/save/route.ts`. The functions `finishedRuns`, `listFinishedPages`, `loadHtvPage`, and `rowsForSave` take the user token.
- In `pocketbase` mode:
  - The run list is a request on `page_runs` with the fields `page_id`, `run_id`, `verdict`, `qa3_page_score`, `started_utc`, and `status`. It has no snapshot. It sorts by `-started_utc,-run_id`.
  - The page list is one request on all `page_runs`, grouped by `page_id`. The titles come from `catalog_items`.
  - The page view reads the snapshot of the shown run. A snapshot with another `snapshot_format` gives a plain error that tells you to run S2 again.
- How to test it on this Mac, without a change in the dev server:
  1. Copy the app as `app/README.md` says (`cp -cR`) and build the copy.
  2. Start a throwaway PocketBase on port 8092 with the four migrations.
  3. Run S2 with `--apply` into it.
  4. Write a config file with `"runSource": "pocketbase"` and `"pocketbaseUrl": "http://127.0.0.1:8092"`.
  5. Run `node scripts/smoke.mjs htv --config FILE` in the copy.

#### 15.15.5 Worked example

- Page `mental_full/p014` has two finished runs. S2 makes two records `[check: S2C 2026-10-28 20:08 python3 -B p014.py]`.

| Run ID | Verdict | Score | started_utc | finished (computed) | Snapshot size |
| --- | --- | --- | --- | --- | --- |
| `20261026T195046Z-r41` | PASS | 10.0 | 2026-10-26T19:50:46Z | 2026-10-26 20:28:29.100Z | 0.03 MB |
| `20261028T023007Z-r41` | FAIL | 8.5 | 2026-10-28T02:30:07Z | 2026-10-28 02:56:57.600Z | 0.03 MB |

- Both records have `item_id` `mental_full` and `status` `completed`. Each snapshot holds 3 rows and 6 termbase entries.
- The first row of both has the key `mental_full/p014/ts3/L01-L08`. Run `20261026T195046Z-r41` marks 8 JA terms and 6 EN terms in it. Run `20261028T023007Z-r41` marks 8 JA terms and 7 EN terms.
- The page shows the newest run (FAIL) first. The admin can mark the older run in `run_marks`. A test passes the older run ID as the mark. Both sources then show the run `20261026T195046Z-r41` with PASS and 10.

#### 15.15.6 Results

- Upload into the local server on port 8090 `[check: S2C 2026-10-28 20:05 sync-runs.mjs]`:

| Step | page_runs | catalog_items |
| --- | --- | --- |
| Dry run before | would create 37 | would create 12 |
| First apply | created 37, failed 0 | created 12, failed 0 |
| Second apply | unchanged 37, created 0, updated 0 | unchanged 12 |
| Dry run after | unchanged 37 | unchanged 12 |

- Sizes of the 37 snapshots: min 0.02 MB (`eiga_full/p159`), median 0.05 MB, max 0.13 MB (`kendojidai_2014/p0839`), total 2.01 MB. The max is about 2.6 percent of the 5 MB limit. The total is 0.01 MB above the draft of 15.14.4, because each row now holds `shortKey`.
- Parity, data level (script `parity_data.mjs`, real `htv-runs.ts` of an app copy, reader token, local server on port 8090) `[check: S2C 2026-10-28 20:06 node parity_data.mjs]`:
  - 37 runs, 30 pages, 278 sentence groups, 1 group with no ED_3 text.
  - The H1 code and the new files mode give equal pages for all 37 runs: 0 differences.
  - The files mode and the `pocketbase` mode give equal `rows`, `panel`, `terms`, `notes`, `verdict`, `score`, `runId`, `startedUtc`, and `status`: 0 differences. The whole page object also has 0 differences.
  - The page list has 30 pages in both modes and is equal. A marked run and a stale mark give equal results.
- Parity, group rule: `parity.py` compares the groups in the stored snapshots with `translator.book_memory`: 37 runs, 278 groups, 0 differences `[check: S2C 2026-10-28 20:07 python3 -B parity.py]`.
- Screen level, throwaway server on port 8092 `[check: S2C 2026-10-28 20:08 run_screen.py]`: smoke mode `htv` with `runSource` `files`: 98 PASS, 0 FAIL. The same with `runSource` `pocketbase`: 98 PASS, 0 FAIL. Smoke mode `smoke`: 70 PASS, 0 FAIL. A control run with `pocketbase` and an empty `page_runs` fails, so the second run reads the collection.
- S2 checks on the throwaway server: a changed record gives `would update` 1, then `updated` 1. A record with no run folder is listed as "on the server only" and stays. A wrong password gives exit code 1. A write error gives exit code 1 and the PocketBase message.
- `npx tsc --noEmit` and `npm run lint` in `app` give no output.

#### 15.15.7 The catalog choice

- S2 writes one `catalog_items` record for each item with a finished run. The `item_id` is the book slug, the same value that the app writes in `own_translations`. The whole metadata row goes into the field `row`.
- 11 of the 12 items have a metadata row with the same `item_id`. They get their titles.
- The web article `18d4ac29` has no row under this ID. The row has the long ID `18d4ac29-12d5-4753-b032-35337361fee5`. S2 makes the record with `item_id` `18d4ac29` and empty titles. It invents no ID rule. This matches the title in the files mode, which is empty too.
- A missing value in a text field is stored as an empty text. `publish_year` is empty for `100_practice_full`, `lifelong_full`, and `18d4ac29`.
- `magazine_chapters` stays empty.

#### 15.15.8 Not verified

- Node versions before v24.6.0 with the hook.
- How PocketBase stores a null in a text field. S2 sends an empty text instead.
- A run with no page score. The column `qa3_page_score` holds 0 for it. All 37 runs have a score today. The shown run takes its score from the snapshot, so only the run list can show 0.
- Anything on the Oracle server, in Vercel, and in DNS.
- The upload of a large set over https. The batch API is not used by S2.
- The finish time in `finished`. It is an estimate.
- The live-shape test of the migrations.
- A signed-in page view in the owner dev server on port 3000 with the new code. Only the status codes were seen after the change: `/` 200, `/books` 200, and `/translate` 307 `[check: S2C 2026-10-28 20:11 curl]`. The unit did not restart the dev server.

#### 15.15.9 Open items

- Title of the web article `18d4ac29`.
  - Option 1 (recommended): keep the empty title. Benefit: no new rule. Cost: the list shows no title for this page.
  - Option 2: match the short ID to the start of the long ID. Benefit: a title. Cost: an ID rule that no owner decision names.
  - Option 3: add a small map file from short ID to long ID. Benefit: exact. Cost: a new file to keep.
- Run with no page score.
  - Option 1 (recommended): keep it. No run has this case.
  - Option 2: add a flag field in a new migration. Cost: another migration.
- Hook for plain Node.
  - Option 1 (recommended): keep the hook. Benefit: no change to `package.json` and no change to the app imports. Cost: Node must support type stripping.
  - Option 2: add `"type": "module"` to `app/package.json`. Cost: the effect on Next is Not verified.
- Superuser of the own v2 PocketBase. `pb_users.py` manages users only. The superuser comes from `pocketbase superuser upsert` on the server. This belongs to the deploy unit.

#### 15.15.10 Old lines that this section makes stale

- Section 15.14.8 says that the switch changes `htv-runs.ts` only. It changes this file and four callers (see 15.15.4). The header of `htv-runs.ts` now says so.
- Section 15.14.4 gives a draft total of 2.00 MB. The real total is 2.01 MB.
- The questions of 15.14.11 are decided. Questions 1 to 12 follow round 56 answers 3 to 5. Question 13 follows round 56 answer 6: the app on `v2.kendotranslation.com` and the PocketBase on `pb-v2.kendotranslation.com`.

Status: decided for the code. The owner has not yet run S2 by hand.

### 15.16 Screen needs of round 57 (design, round 58)

- Source: owner answer 5 of round 57 and owner answers 3 to 6 of round 58 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:185]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:201-205]`. Unit UXD wrote this section `[check: UXD 2026-10-28 22:40]`.
- This section holds design only. No code and no data changed. The design process of round 42 answer 9 applies: the owner states a need, aki-main restates it, the owner validates it, a docs unit writes the design, then a code unit builds it `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`.
- Sizes use MB. One MB is 1,048,576 bytes.
- `<TMP>` is the folder `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode`. The work files of unit UXD sit in `<TMP>/r58/UXD/`.
- Code line numbers name the commit `bf62d61` (read with `git show HEAD:path`). Unit DPC edits `app/**` at the same time, so a line can move later.
- Words follow the owner vocabulary: EN term, book translation memory, aligned translation memory, short English explanation, critique group, sentence group, agent translation, own translation. A new plain name has the mark "(proposal)".
- Section 15.16.8 holds the questions. A default named there is not an owner decision.

#### 15.16.1 Owner words and decisions

- Round 57 answer 5, the four wishes `[user 2026-10-28 21:15]` `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:185]`. The text below is exact, with the owner spelling:

```
+ The human translator should view and access content like a normal reader view. not page-by-page
+ Add a checkbox for human translator: tick mean completely agree with the agent trasnlation
+ The right side UI for additional context is literally unreadable. Optimize the UI UX for user properly.
+ also can you add a high contrast dark theme?
```

- Round 58 answers, after aki-main restated each need with project examples `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:201-205]`:

| Need | Q-A line | Owner words | Tag |
|---|---|---|---|
| 1 Book screen | l201 | "Not just translated pages. All pages. With agent translated pages tagged." | `[user 2026-10-28 22:17]` |
| 2 Agree tick | l202 | "Correct, new agree field (Recommended)" | `[accepted recommendation 2026-10-28 22:17]` |
| 3 TL_3 panel | l203 | "Option 1. but also: customizable font and panel size/color/etc. Every pane should have a setting cog button for customization" | `[user 2026-10-28 22:17]` |
| 4 Dark theme | l204 | "Whole app, per account (Recommended)" | `[accepted recommendation 2026-10-28 22:17]` |
| Deploy code | l205 | "Env settings for Vercel (Recommended), Hide monitor on deploy (Recommended), Keep email and names (Recommended)" | `[accepted recommendation 2026-10-28 22:17]` |

- What the answers decide `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:211-216]`:
  - Need 1. The book screen shows all pages of a book. A page with an agent translation carries a tag. The gap line idea of the first restatement ("p051 to p074: no translated pages") is replaced.
  - Need 2. Each row gets one checkbox "Agree with the agent text". The next Save stores the tick in a new true/false field `agree` of `own_translations` (migration 1793300004). The own box can stay empty. If a newer run shows other text later, the tick stays and the existing run notice says that the user saved for the older run.
  - Need 3. Option 1 of the restatement, plus a settings cog on every pane. Option 1 holds these parts:
    - Dictionary cards, plain EN lines for the lower pair, and JA and EN memory pairs.
    - English in a 15 px sans-serif font, a width that changes by drag, and a panel that closes.
    - No JA text block. The block order is dictionary, book translation memory, aligned translation memory, lower pair, earlier term marks.
    - The change is on the screen only. Snapshots and S2 stay the same.
  - Need 4. A switch in the top bar offers "Light" and "High-contrast dark". The dark colors come from the v1 high-contrast theme. The theme covers the human-translation-view and the monitor. A signed-in user keeps the choice in the account. The monitor keeps it in the browser.
  - Deploy code (answer 7). Unit DPC builds it in parallel. This section does not design it.
- Readings that wait for the owner `[reading pending owner check]`:
  - Save stays per page. The owner corrected only the part "translated pages only" of the first restatement.
  - Pane settings live in the account, like the theme. Older answers point this way: layout "Per account, all devices" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:67]` and extra items "Saved per account (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:111]`.
  - What an untranslated page shows is open (question 1 of 15.16.8).
- Earlier decisions that bind this design:
  - Reader role: a read-only view `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:151]`. Page runs are readable by every signed-in user `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:165]`.
  - The H1 defaults stay `[file: docs/VISION-viewer.md:1022-1037]`:
    - Pillar, caption, folio, and figure items make no row.
    - Times show in UTC.
    - A long panel block starts closed.
    - No back-button guard.
    - One Save takes at most 200 rows.
  - Every Save writes one record for every row of the page, all with the same version number `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:126]`.
  - The TL_3 panel hides the fixed text and shows whole page blocks `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:99-100]`.
  - Reader vision: "Make it like a professional book reading website." The reader moves, resizes, hides, and shows panels. The layout is saved per account, across all devices `[file: docs/VISION-viewer.md:123]` `[file: docs/VISION-viewer.md:176-192]`. The human-translation-view is for desktop only `[file: docs/VISION-viewer.md:1031]`.

#### 15.16.2 Need 1: one book screen with all pages

##### The problem, with an example

- Today the list `/translate` has one table row for each page with a finished run. A page opens alone at `/translate/<book>/<page>` `[file: app/app/translate/page.tsx:22]` `[file: app/app/translate/[slug]/[page]/page.tsx:13-16]` `[file: app/components/HtvList.tsx:10]`.
- Example: the book `left_foot_full` ("The Secret of Kendo and the Left Foot") has 120 pages `[check: UXD 2026-10-28 22:24 python3 -B counts.py]`. Six of them have a finished run: p046, p047, p048, p049, p050, and p075 `[check: UXD 2026-10-28 22:29 node rows.mjs]`.
  - The translator opens p048. It shows 5 rows. To read p049, the translator goes back to the list through the link "All pages" and clicks p049 `[file: app/components/HtvBar.tsx:21]`.
  - The other 114 pages have no link at all. The translator cannot see that they exist.
- Cause: the list comes from the runs `[file: app/lib/htv-runs.ts:79-146]`. A row comes from a sentence group of a run, and the group key holds the TS_3 line IDs, for example `mental_full/p014/ts3/L01-L08` `[file: app/lib/htv-groups.ts:47-91]`. A page with no run has no group, so it has no row.

##### The data of the 12 items that have a finished run

- The 11 book and magazine folders hold 3,544 pages in 4,967.9 MB. All 36 folders hold 13,278 pages in 19,259.2 MB `[check: UXD 2026-10-28 22:30 python3 -B size sum over pages_of]`.
- Each folder numbers its pages from 1 to the last page with no gap `[check: UXD 2026-10-28 22:24 python3 -B counts.py, contig=True for 36 of 36]`.
- A page ID has 4 digits when the folder holds more than 999 pages `[file: kendo-translation-translator/data/scripts/translator/pages.py:id_digits]`. So `kendojidai_2014` has p0001 to p1051. `kendojidai_2012` has p001 to p949.

| Item | Pages | Page PDFs in MB | Pages with a finished run (verdict, score of the newest finished run) |
|---|---|---|---|
| `100_practice_full` | 367 | 277.0 | 2: p067 PASS 10.0, p255 PASS 9.5 |
| `18d4ac29` (web article) | no folder | none | 1: p001 PASS 9.25 |
| `eiga_full` | 204 | 201.1 | 2: p053 PASS 10.0, p159 PASS 10.0 |
| `kendojidai_2012` | 949 | 1,718.0 | 2: p350 PASS 9.5, p711 PASS 10.0 |
| `kendojidai_2014` | 1,051 | 1,830.5 | 6: p0794 PASS 9.5, p0795 PASS 9.0, p0796 PASS 9.5, p0797 PASS 9.5, p0798 PASS 9.5, p0839 FAIL 8.25 |
| `left_foot_full` | 120 | 111.3 | 6: p046 PASS 10.0, p047 PASS 9.5, p048 PASS 10.0, p049 PASS 10.0, p050 PASS 9.5, p075 PASS 10.0 |
| `lifelong_full` | 279 | 235.1 | 2: p099 PASS 10.0, p140 PASS 9.5 |
| `men0` | 11 | 11.4 | 1: p005 PASS 10.0 |
| `mental_full` | 169 | 186.0 | 2: p014 FAIL 8.5, p057 PASS 10.0 |
| `ogawa_lecture_part2` | 150 | 142.9 | 2: p085 PASS 10.0, p089 PASS 10.0 |
| `ogawa_lecture_part3` | 102 | 102.1 | 2: p048 PASS 10.0, p088 PASS 10.0 |
| `sumiss_train_full` | 142 | 152.6 | 2: p096 PASS 9.0, p129 PASS 10.0 |

- The verdict and score come from `summary.json`, key `qa.QA_3`, of the newest finished run of each page `[check: UXD 2026-10-28 22:24 python3 -B verdict scan of data/pilot-run, 30 pages]`. The sum of the last column is 30 pages.
- A run that is still in progress is not finished and gets no tag. Example: the folder `left_foot_full_p046/20261029T051154Z-r41` has no `summary.json` now `[check: UXD 2026-10-28 22:24 python3 -B finished-run scan]`.
- The web article `18d4ac29` has one page, `18d4ac29/p001`. It has no page folder in `BOOKS_DIR`. What "all pages" means for a new web article is Not verified `[agent inference]`.
- A magazine year holds the months as chapters. Example: `kendojidai_2014` October 2014 is p778 to p868 (91 pages) and holds p0794 to p0798 and p0839 `[check: UXD 2026-10-28 22:28 python3 -B read of magazine-chapters.jsonl]`.

##### What exists for a page without an agent translation

| Content | Where | Size | On the deploy |
|---|---|---|---|
| Page PDF `page_048.pdf` | `BOOKS_DIR` on this Mac `[file: kendo-translation-translator/data/scripts/translator_run.py:103]` | 0.84 MB for `left_foot_full` p048, 111.3 MB for the whole book | No |
| Markdown of the earlier pipeline `page_048.md` | `/Volumes/NghiaHDD2T/universal-agent_v2/book-postprocessing/Left foot full/pages/` | 0.61 MB for 120 pages. `kendojidai_2014`: 7.12 MB for 1,043 of 1,051 pages. `Men 0` has none | No |
| JA transcription TS_3 of the v2 Translator | run folder `results/TS_3.json` | only for a page with a run | Only through the snapshot |

- `[check: UXD 2026-10-28 22:25 ls and wc of book-postprocessing, python3 -B size sum]`. The earlier-pipeline folder holds 10 of the 11 items that have a page folder. `Men 0` has no folder there. The web article has none.
- Block format of the markdown file. A block has an optional label line, then the JA line, the EN line, and the ZH line. A line with `---` ends the block. Example from `left_foot_full` p048 `[check: UXD 2026-10-28 22:25 cat of page_048.md]`:

```
【Heading】
左手左腰左足の一体化
The unification of *hidari-te*, *hidari-koshi*, and *hidari-ashi*.
*Hidari-te*、*hidari-koshi*与*hidari-ashi*的一体化。

---
```

- The magazine file `kendojidai_2014` page_839.md uses the label `[Heading]` with square brackets. Its first block is `柳生新陰流と「理合剣道」` `[check: UXD 2026-10-28 22:25 sed of page_839.md]`.
- The EN line of the markdown file is not the v2 agent translation. It comes from an earlier pipeline. It has its own style, for example `*datotsu*` in italics and notes like `[T/N: Term not in reference dictionary; ...]` `[check: UXD 2026-10-28 22:25 cat of page_048.md]`. The book screen must not tag it as an agent translation.
- No JA transcription of the v2 Translator exists for a page without a run. The OCR cache `data/pilot-run/cache/ndlocr` holds 277 entries. It is a cache of earlier page runs, not a store of all pages `[check: UXD 2026-10-28 22:25 ls of cache]`.
- The earlier-pipeline text also sits in one file for each book, for example `/Volumes/NghiaHDD2T/universal-agent_v2/compiled_agents/gemini_kendo_book_translator/translated/Left foot full_trilingual.md` (0.67 MB, 120 pages) `[check: UXD 2026-10-28 22:42 ls and head]`.
- Page images are not in PocketBase. The size of the Oracle server disk is Not verified.

##### Design

- Book list. The route `/translate` shows one row for each book: title, slug, page count, and the count of pages with an agent translation. One click opens the book screen. Example row: `left_foot_full`, "The Secret of Kendo and the Left Foot", 120 pages, 6 with an agent translation. Question 2 asks which books the list shows.
- Book screen. The new route `/translate/<book>` shows one section for each page, from the first to the last page. A thin heading opens each section. The heading holds the page ID and a tag.
  - Tag of a page with an agent translation: the verdict pill with the score, and the shown run. Example: `left_foot_full/p048`, PASS 10.0, run `20261028T033359Z-r41`. The verdict pill exists today `[file: app/components/Pills.tsx:19-28]`.
  - Tag of a page without one: the words "No agent translation" (proposal).
  - A page with an agent translation shows its rows as today: JA column, agent translation column, own box, copy button, comments, and the tick of need 2.
  - What an untranslated page shows below its heading is question 1.
- Worked example, `left_foot_full` with 120 pages `[check: UXD 2026-10-28 22:29 node rows.mjs]`:

| Pages | Heading tag | Rows |
|---|---|---|
| p001 to p045 (45 pages) | No agent translation | none |
| p046 | PASS 10.0, run `20261028T023007Z-r41` | 5 |
| p047 | PASS 9.5, run `20261028T025716Z-r41` | 6 |
| p048 | PASS 10.0, run `20261028T033359Z-r41` | 5 |
| p049 | PASS 10.0, run `20261028T040511Z-r41` | 4 |
| p050 | PASS 9.5, run `20261028T042806Z-r41` | 6 |
| p051 to p074 (24 pages) | No agent translation | none |
| p075 | PASS 10.0, run `20261026T182512Z-r41` | 13 |
| p076 to p120 (45 pages) | No agent translation | none |

- The table sums to 39 rows, 6 tagged pages, and 114 untagged pages. The translator scrolls from p045 to p046 to p047 without a click.
- Load of a long book. A 120-page book of translated pages holds about 6.8 MB of snapshots (120 pages at the average of 0.057 MB). The magazine year `kendojidai_2014` holds about 60 MB `[agent inference]` `[check: UX0 2026-10-28 21:2x items.log: 30 pages, 1.70 MB]`. The browser must not load all of it.
  - The server sends the page index at once: page number, tag, verdict, score, and run for each page. It comes from `page_runs` fields without the snapshot, like the list reads them today `[file: app/lib/pb.ts:329-347]`.
  - A section loads its rows when it is within 2 pages of the screen (proposal). The browser asks a new route `GET /api/htv/page` for the page data, the saved versions, the saved rows, and the comments.
  - A section with unsaved text never unloads (proposal).
  - Precedent in v1: a virtual list (`react-virtuoso`), and a server that sends page 1 while the browser fetches the other pages in the background `[file: kendo-translation-viewer-v1/components/reader/VirtualizedReader.tsx]` `[file: kendo-translation-viewer-v1/components/reader/ReaderView.tsx:172-177,302-330]`.
- URL of a page inside the book screen. The anchor `/translate/left_foot_full#p048` scrolls to the section. The query `?at=p048` makes the server load the window around p048 first. The old route `/translate/left_foot_full/p048` answers with a redirect to `/translate/left_foot_full?at=p048#p048`, so old links work (proposal).
- Save. Each page section keeps its own Save, version history, comments, and run mark control for the admin. The routes take a page ID and stay as they are `[file: app/app/api/htv/save/route.ts:19,30-41]` `[file: app/lib/pb.ts:206-208]` `[file: app/app/api/htv/comments/route.ts:14,18]`. Question 3 asks about a Save for the whole screen.
- Panel. The screen has one TL_3 panel at the right. It shows the page in view. The page in view is the section that holds the line at 35 percent of the screen height (proposal). A click on a page heading pins that page. For an untranslated page the panel says "No agent run for this page."
- Leave warning. Today one flag covers one page `[file: app/components/HtvEditor.tsx:77-81,90-115]`. The book screen keeps a list of the pages with unsaved text. The warning shows when the list is not empty. A move inside the screen has the same path, so it does not warn `[file: app/components/HtvEditor.tsx:103]`.
- Reader role. The same screen, read-only. It loads no own box, no comment, and no saved data `[file: app/app/translate/[slug]/[page]/page.tsx:31-35]`.
- Run mark. One mark for each page stays. A page section shows the control only for the admin `[file: app/components/HtvEditor.tsx:236-253]`.
- Code places that change:
  - `app/app/translate/page.tsx` (book list) and `app/components/HtvList.tsx` (book table).
  - A new `app/app/translate/[slug]/page.tsx` (book screen).
  - `app/app/translate/[slug]/[page]/page.tsx` (redirect).
  - `app/components/HtvEditor.tsx`. The state of one page sits in one component today. The code unit splits it into a page section.
  - `app/lib/htv-runs.ts:79-146,172-240` (page index and page data).
  - `app/lib/pb.ts:329-361` (index from `page_runs` and `catalog_items`).
  - A new `app/app/api/htv/page/route.ts`.

##### Page count on the deploy

- The deploy has no `BOOKS_DIR`. The count comes from `catalog_items.pages`. S2 fills it from the field `pages` of `items.filled.jsonl` `[file: app/scripts/sync-runs.mjs:368-381]`.
- The field `pages` equals the PDF count for all 36 folders, with 0 differences `[check: UXD 2026-10-28 22:30 python3 -B compare of counts.json with items.filled.jsonl]`. The 36 folders are 25 books, 9 magazine years, and 2 web captures.
- Fields that hold a page count `[check: UXD 2026-10-28 22:42 python3 -B read of the item-metadata files]`:
  - `items.filled.jsonl`: `pages`. S2 copies it.
  - `inventory.json`, 36 items: `pages`, `first_page`, `last_page`, `first_page_id`, `last_page_id`.
  - `magazine-chapters.jsonl`, 103 rows: `last_pdf_page`, `page_start`, `page_end`, `page_count`, `pages_listed`.
- No field holds a full page list of a book. No list is needed, because the pages run from 1 to `pages` `[check: UXD 2026-10-28 22:24 counts.py]`.
- The web article `18d4ac29` has `pages` 0 in `catalog_items`. S2 looks up the short ID, and the metadata row has the long ID `[file: app/scripts/sync-runs.mjs:458]` `[file: docs/VISION-viewer.md:1536-1542]`. The book screen must treat `pages` 0 as "one page p001 with a run" `[agent inference]`.
- `magazine_chapters` stays empty `[file: docs/VISION-viewer.md:1542]`. Month headings for the magazine years need a fill step for the 103 rows (question 12).
- Not verified: the stored value of `catalog_items.pages` in the local PocketBase. The unit did not call the server.

#### 15.16.3 Need 2: the agree tick

##### The problem, with an example

- Today a row has the JA text, the agent text (ED_3), an own box, and a copy button. A translator who agrees with the agent text must copy it into the box and save `[file: app/components/HtvEditor.tsx:402-404,413-428]`. The copy makes a second text that equals the first.
- Example: `mental_full/p014`, row `mental_full/p014/ts3/L01-L08`, run `20261028T023007Z-r41`. The JA text starts `はめた場合、普段の稽古への取り組み方を考える大きなヒントになります。`. The agent text starts "If you apply this, it becomes a great hint for thinking about how to approach your everyday Keiko (practice)." `[check: UXD 2026-10-28 22:31 node p014.mjs]`. The page has 3 rows and the verdict FAIL 8.5.
- A tick means: "I accept this whole ED_3 paragraph as it is." The own box stays empty.

##### Design

- Field. One new field `agree` (true or false) in `own_translations`. The records never change after the create (update and delete rules are null) `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:36-61]`. So the tick is part of a version.
- Migration. The file `1793300004_v2_own_translations_agree.js` adds a `BoolField` named `agree` if it is missing. It follows the style of `1793300003`: safe to run twice, and the down function keeps the field and the data `[file: data/scripts/pocketbase/pb_migrations/1793300003_v2_page_runs_columns.js:3-22]`. The rules do not change.
- Old records. Their `agree` value is false. This is an `[agent inference]` about PocketBase. Not verified.
- Save. A row in the request becomes `{ groupKey, text, agree }`. The server accepts a missing `agree` as false. The browser sends one value for every row, like it sends the text of every row today.
  - Code: the row check `[file: app/app/api/htv/save/route.ts:23-28]`, the `SaveRow` type and the batch body `[file: app/lib/pb.ts:186-193,209-224]`.
  - Read: the field list of `savedRows` `[file: app/lib/pb.ts:179]`, and `SavedRow` in `[file: app/lib/htv-types.ts:110-115]`.
- Screen. Each row gets one checkbox with the label "Agree with the agent text" under the agent text column. It is off at start.
  - The box is disabled when the row has no agent text, because the row shows "No agent text for this row." `[file: app/components/HtvEditor.tsx:403]`.
  - The reader sees no box `[file: app/components/HtvEditor.tsx:406]`.
  - A tick counts as a change. The leave warning and the Save state compare the tick with the saved tick `[file: app/components/HtvEditor.tsx:77]`.
- Version history. The table gets a column "Agreed" with the count of ticked rows (proposal). A load of an older version sets the ticks of that version `[file: app/components/HtvEditor.tsx:145-158,255-292]`.
- Run notice. The notice today shows only when the saved text is not empty `[file: app/components/HtvEditor.tsx:117-121]`. With a tick and an empty box, no notice shows. So the rule changes: the notice shows when the saved text is not empty or the saved tick is on. The tick stays when the run changes.
  - Notice text for a tick (proposal): "You ticked this row while the page showed run 20261028T023007Z-r41. The page now shows run 20261026T195046Z-r41. The agent text of this row can differ."
- Rows with no row in the shown run. The section "Saved for lines that this run cuts in another way" lists a saved row with text `[file: app/components/HtvEditor.tsx:316-348]`. A ticked row with no text must show too. It shows the text that the user agreed to, from the field `ed3_text` of the record (proposal).
- Reader. The reader has no own box and no tick.

##### Worked example

1. A translator opens `mental_full/p014`. The page shows run `20261028T023007Z-r41`. Row L01-L08 shows "If you apply this, it becomes a great hint ..." in the agent column.
2. The translator ticks "Agree with the agent text" on rows L01-L08 and L09-L13. The translator types an own text in row L14-L15 and leaves the tick off.
3. A click on Save writes version 1 with 3 records. Rows 1 and 2 hold `agree` true and `text` empty. Row 3 holds `agree` false and the own text. Each record holds the agent text in `ed3_text`.
4. Later the admin marks the older run `20261026T195046Z-r41` for this page. Its row L01-L08 starts "If applied, it becomes a great hint ..." `[check: UXD 2026-10-28 22:31 node p014.mjs]`.
5. The page now shows the older run. Rows 1 and 2 keep the tick. Each shows the run notice above.

##### Own text and tick together

- The owner words say: "tick mean completely agree with the agent trasnlation". A row with an own text and a tick has no clear meaning. Question 4 asks the owner.

#### 15.16.4 Need 3: the TL_3 panel and the settings cog

##### The problem, with an example

- The panel shows the lines of the TL_3 message as text. Page `kendojidai_2014/p0839`, run `20261026T205441Z-r41`: 536 of 721 message lines. It takes 7.0 screens with the default blocks and 21.3 screens with all blocks open `[check: UX0 2026-10-28 21:2x measure.json]`.
- The block `dictionary_lookup` takes 67 to 70 percent of the shown lines on p014, p0839, and p048. An entry takes about 11.5 lines `[check: UX0 2026-10-28 21:2x items.log]`.
- One entry of p0839 as the panel shows it today. These are the exact lines of the file `messages/TL_3.txt`:

```
entry_id: c-fefdc125669e
store: termbase
source: kd:1029, refinement:d-0365, kd:1030
headword_ja: 剣道 (written variants: none)
reading: けんどう
romaji: Kendō
concise_en: the way of the sword
common: common
detailed_en: Kendō (剣道) is the way of the sword. It is the Japanese art of swordsmanship.
```

- The panel is 416 px wide with 375 px of text. All text, English and JSON too, uses the font stack "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif at 12 px in a `<pre>` `[file: app/components/HtvPanel.tsx:22,26]` `[file: app/components/HtvEditor.tsx:352]` `[check: UX0 2026-10-28 21:2x measure.json]`. The contrast is 16.42 to 1, so the color is not the problem `[check: UX0 2026-10-28 21:2x contrast.json]`.
- The lower pair of p0839 is one line `result: {"lines": [...]}` of 15,220 characters. It holds 105 lines `[check: UXD 2026-10-28 22:32 python3 -B read of TL_3.txt]`. The start of that line:

```
result: {"lines": [{"ja_refs": ["kendojidai_2014/p0839/ts2/L01"], "text": "These are things that, as the years accumulate, at"}, {"ja_refs": ["kendojidai_2014/p0839/ts2/L02"], "text": "last come to be understood, and things one can do in old age"}, ...
```

- The parser splits only at `[ENTRY]` and `[PAIR]` `[file: app/lib/htv-panel.ts:86-111]`. The block "Japanese text of the page" repeats the rows (141 of the 536 shown lines at p0839) `[check: UX0 2026-10-28 21:2x items.log]`.

##### Field names in the TL_3 message

- `[check: UXD 2026-10-28 22:32 python3 -B scan of 65 messages under data/pilot-run/*/*/messages/TL_3.txt]`. The scan counted 1,182 `[ENTRY]` items and 219 `[PAIR]` items.

| Block | Fields (all lines have the form `name: value`) |
|---|---|
| `[ENTRY]` in `dictionary_lookup` | `entry_id`, `store`, `source`, `headword_ja`, `reading`, `romaji`, `concise_en`, `common`, `detailed_en`. All 1,182 entries hold exactly these 9 fields. |
| `[PAIR]` in `book_translation_memory` | `source` (form: `page left_foot_full/p049, pair P02, run 20261028T023006Z/20261028T040511Z-r41, split none`), `ja`, `en` |
| `[PAIR]` in `aligned_translation_memory` | `source` (form: `unit u_dfc3823c_U052`), `ja`, `en` |
| `lower_pair` | `from`, `stance`, `result` (JSON with the list `lines`, each line holds `ja_refs` and `text`), `translation_rationale` |
| `previous_page_pair` | `from`, `result` (each line also holds `item_id`, `order`, `bad_refs`), `translation_rationale` |
| `earlier_term_marks` | `book_id`, `pages_read`, then one row for each term in the form `entry_id \| JA \| EN term with short English explanation \| first used on page <page ID> \| result=follows` (or `none`) |

- One pair out of 219 holds a JA text with a line break. The parser must add a line that has no `name: ` start to the field before it. Any other unknown line shows as plain text, so no text is lost.
- The line `stance` is the same text in 65 of 65 messages: "Assume that this pair holds errors. Find them and correct them in your own result." The panel can hide it (proposal).
- Only a pair of the book translation memory names a page. A pair of the aligned translation memory names a unit of the paired dataset, so it has no page ID.

##### Design of the panel (option 1 of the owner, plus the cog)

- Order of the blocks (owner answer): dictionary cards, book translation memory, aligned translation memory, lower pair, earlier term marks. The block `previous_page_pair` has no place in the owner order. It sits after the lower pair (proposal).
- The block "Japanese text of the page" is gone from the screen. The snapshot keeps it. The snapshot format stays `1`.
- A long block starts closed, as before (more than 40 lines) `[file: app/components/HtvPanel.tsx:7]`.
- Dictionary card. One card for each `[ENTRY]`.
  - The card shows the headword, the reading, the EN term (`romaji`), the mark "common" or "not common", and the short English explanation (`concise_en`).
  - The long explanation (`detailed_en`) sits behind a link "more".
  - The card hides `entry_id`, `store`, and `source`.
  - The text "written variants" shows only when it is not "none". Example: `触刃の間 (written variants: 触刃, 触刃の間合)` `[check: UXD 2026-10-28 22:26 grep of headword_ja over 65 messages]`.
- Card of p0839, closed:

```
剣道   けんどう
Kendō   common
the way of the sword
more
```

- The same card, open (the text after "more" is the exact `detailed_en`):

```
Kendō (剣道) is the way of the sword. It is the Japanese art of swordsmanship.
```

- A second card, from `left_foot_full` p050, run `20261028T042806Z-r41`. The long explanation has 3 sentences, so it needs "more":

```
懐   ふところ
Futokoro   not common
inner space
more
Futokoro (懐) is the central space near the chest and abdomen, inside the arms in kamae (構え, stance). If you keep the hidari-te (左手, left hand) firmly in the futokoro until the moment of datotsu (打突, strike or thrust), the move to the strike becomes more precise and sharp. If the hidari-kobushi (左拳, left fist) moves to the right and the futokoro becomes narrow, slackness or tension appears in the kamae.
```

- No `[ENTRY]` for the term 面 (Men) exists in the 65 messages `[check: UXD 2026-10-28 22:25 grep of headword_ja: 面 over data/pilot-run]`. The cards above use real entries.
- p0839 holds 32 entries. The `detailed_en` text has 76 to 367 characters, median 243 `[check: UXD 2026-10-28 22:31 python3 -B read of TL_3.txt]`. A closed card takes 4 short lines `[agent inference]`.
- Lower pair. The block shows `from` as a heading and the lines of `result` as plain EN lines. A narrow column on the left holds the line ID. The ID `left_foot_full/p050/ts2/L01` shows as `ts2/L01`, and the full ID sits in the tooltip. The long `translation_rationale` (1,571 characters at p050) sits behind "more".
- Three real lines of the lower pair of p050 `[check: UXD 2026-10-28 22:31 python3 -B read of TL_3.txt]`:

```
ts2/L01  so that, by executing Datotsu, the left line works effectively. At this time,
ts2/L02  you must take care that the right shoulder does not come out ahead of the left shoulder. If the right
ts2/L03  shoulder comes forward, the left foot tends to open, the kick becomes weak, and the drawing-
```

- Memory pair. One card for each `[PAIR]`: a chip with the source, the JA text, and the EN text. For the book translation memory the chip names the page and the pair, for example `left_foot_full/p049 · P02`. In the book screen the chip is a link to that page section. The chip hides the run and the word `split none`.
- Pair of the book translation memory in the message of p050 (chip `left_foot_full/p049 · P02`):

```
JA  左手を支点に両肩を意識して円運動の要領で振り上げ、振り下ろす。このとき中墨から竹刀の軌道を外さないように打突することで左のラインが有効に働く。右肩が左肩より前に出ないように注意している
EN  With the Hidari-te as the fulcrum and both shoulders in mind, in the manner of circular motion I perform the Furi-age and Furi-oroshi. At this time, by executing the Datotsu without letting the trajectory of the Shinai leave the Chūzumi, the left line works effectively. I take care that the right shoulder does not come out in front of the left shoulder.
```

- Pair of the aligned translation memory in the message of p0839 (chip `unit u_dfc3823c_U052`):

```
JA  剣道をはじめ武道や伝統的な芸道では、〝稽古〟といって古きを考えつつ自らを高めようとする態度と共に〝習う〟という修行者としての素直な心構えを尊重します。
EN  In Kendo, Budo and other traditional arts, “Keiko” represents an attitude that seeks to improve oneself while considering the past, and respects an honest attitude as someone in the process of learning.
```

- Earlier term marks. A small table with the columns JA, EN term with short English explanation, first used on page (link), and result. It hides `entry_id`. Example row of p050: `剣道 | Kendō (the way of the sword) | left_foot_full/p046 | follows`. At p0839 the block says "0 pages read. No earlier marks."
- Fonts. English text uses a 15 px sans-serif font (`--font-sans`). Only Japanese text uses the Japanese font (`--font-ja`). The Japanese parts are the headword, the reading, the JA text of a pair, and the JA column of the mark table.
- Width. The default stays 416 px. A drag handle on the left edge changes the width. Limits: 280 to 720 px (proposal). The panel closes with the existing button `[file: app/components/HtvEditor.tsx:213-215]`. [Replaced in round 61: a collapse button makes the panel a bar of 28 px, and the close button is gone. See 15.18.2.]
- Parser. A pure function in a new file (proposal: `app/lib/htv-panel-cards.ts`) turns a `PanelBlock` into cards when the panel shows. The snapshot stays as it is, because `PanelPart.lines` keeps the raw message lines `[file: app/lib/htv-panel.ts:19-23,82-100]` `[file: app/lib/htv-build.ts:166-179]`. `SNAPSHOT_FORMAT` stays 1 `[file: app/lib/htv-build.ts:17]`. S2 does not change.

##### The settings cog

- The owner words: "Every pane should have a setting cog button for customization". A pane is a screen area with its own frame (proposal). The cog is a small button in the top right corner of the pane. It opens a small box. [Replaced in round 61: one cog for each column header in a sticky header row, none inside a row. See 15.18.2.]
- Panes of the human-translation-view today `[file: app/components/HtvEditor.tsx]`:

| Pane id (proposal) | Where | Cog |
|---|---|---|
| `list` | book list `[file: app/components/HtvList.tsx:8-42]` | yes |
| `ja` | JA column of a row `[file: app/components/HtvEditor.tsx:399-401]` | yes |
| `agent` | agent text column of a row `[file: app/components/HtvEditor.tsx:402-404]` | yes |
| `own` | own translation box `[file: app/components/HtvEditor.tsx:413-420]` | yes |
| `tl3` | TL_3 information panel `[file: app/components/HtvEditor.tsx:351-355]` | yes |
| `comments` | comments of a row `[file: app/components/HtvComments.tsx:24]` | yes |
| `versions` | version history `[file: app/components/HtvEditor.tsx:255-292]` | yes |
| top bar, page heading, notices, run mark bar, term pop-up, section "Saved for lines that this run cuts in another way" | small controls and notes | no (proposal) |

- A setting of one pane applies to every row of the screen. A row has no own setting.
- Settings of a pane (proposal):

| Setting | Values and limits | Default |
|---|---|---|
| Font family | EN panes: sans, serif, mono. JA panes: mincho, gothic. System fonts only, because the app loads no font from the network `[file: app/app/globals.css:3-4]` | as today (`ja` and `agent` keep Mincho and Georgia, `tl3` uses sans) |
| Font size | 12 to 28 px, step 1 | as today for `ja`, `agent`, and `own` (1.05 rem, which is 16.8 px `[check: UX0 2026-10-28 21:2x measure.json]`), 15 px for `tl3` |
| Line height | 1.2 to 2.2, step 0.1 | as today for rows (`leading-relaxed`), 1.5 for `tl3` |
| Text color | any color. The box shows the contrast ratio and a warning below 4.5 to 1 | theme color |
| Background color | any color, same warning | theme color |
| Width | `tl3`: 280 to 720 px by drag. `ja` and `agent`: share of the row, 30 to 70 percent | 416 px, 50 percent |
| Reset | one button for the pane, one for all panes | none |

- The v1 settings panel had colour theme, font family, font colour, size, width, furigana, tap-to-reveal, and focus mode `[file: kendo-translation-viewer-v1/components/reader/ReaderSettingsPanel.tsx:14-40,145-300]`. v1 offered the font families sans, serif, and mincho `[file: kendo-translation-viewer-v1/app/globals.css:226-235]`. This design takes font family, size, color, and width. It does not take furigana, tap-to-reveal, or focus mode, because the owner did not ask for them.
- A custom color belongs to one theme. The record keeps a color for "light" and a color for "dark". A color that is good on white can be unreadable on black.
- Storage. The settings of the signed-in user go to the account (section 15.16.6). A change applies at once and saves 800 ms after the last change (proposal). The server reads the settings with the page, so the first paint has no jump `[agent inference]`.
- Monitor. The monitor has no sign-in. Its panes are:
  - the Runs table `[file: app/components/RunsTable.tsx:11-79]` and the Books table `[file: app/components/BooksView.tsx:15-107]`
  - the text columns of the page view `[file: app/components/PageText.tsx:20-115]`
  - the QA panel `[file: app/components/QaPanel.tsx:10-90]`
  - the extra panels, up to 9 sections `[file: app/components/ExtraPanels.tsx:12-422]`
  - the chain panels `[file: app/components/ChainPanels.tsx:24-283]`
  - the book details `[file: app/components/BookDetails.tsx:13-259]`
- The monitor can keep pane settings in the browser, like the extra items checklist today `[file: app/components/extras-store.ts:4-7]`. Question 5 asks the owner.

#### 15.16.5 Need 4: the high-contrast dark theme

##### The problem

- The app has one light theme. The tokens sit in `app/app/globals.css` (34 lines): `--background` `#faf8f3`, `--foreground` `#1f1d1a`, `--muted` `#6b665d`, `--line` `#e3dfd4`, `--accent` `#7a1f1f` `[file: app/app/globals.css:5-11]`.
- 461 color uses in 30 files: 287 project tokens, 130 Tailwind palette classes, and 44 uses of white or black `[check: UX0 2026-10-28 21:2x colors.log]`. The 44 are 39 `bg-white` and 5 `text-white` `[check: UXD 2026-10-28 22:27 grep over app/components and app/app]`. The Htv files hold 128 of the 461 uses.
- The palette classes use 29 Tailwind color variables and the variable `white`, for example `bg-green-100`, `text-red-700`, and `bg-amber-100` `[check: UXD 2026-10-28 22:26 node allclasses.mjs]`.
- The app has 0 uses of the class prefix `dark:` `[check: UXD 2026-10-28 22:33 grep]`.

##### Design

- Switch. Two options in the top bar, at the right: "Light" and "High-contrast dark". It sits in `Nav` (monitor and view) `[file: app/components/Nav.tsx:16-36]`. The sign-in bar of the view has the same switch `[file: app/components/HtvBar.tsx:22-29]`. Light is the default.
- Base colors. The dark values come from the v1 block `[data-reader-theme="high-contrast"]` `[file: kendo-translation-viewer-v1/app/globals.css:193-206]`. The surface color is `--rt-surface` of the same block.

| Token | Light | Dark | Text on background, light | Text on background, dark |
|---|---|---|---|---|
| `--background` | `#faf8f3` | `#000000` | n/a | n/a |
| `--foreground` | `#1f1d1a` | `#ffffff` | 15.84 | 21.00 |
| `--muted` | `#6b665d` | `#aaaaaa` | 5.37 | 9.04 |
| `--accent` | `#7a1f1f` | `#ffff00` | 9.68 | 19.56 |
| `--line` | `#e3dfd4` | `#444444` | 1.25 (line) | 2.16 (line) |
| surface (`bg-white`) | `#ffffff` | `#1a1a1a` | n/a | n/a |

- The ratios use the formula (L1+0.05)/(L2+0.05) with linearized sRGB `[check: UXD 2026-10-28 22:33 python3 -B dark2.py]`. The light page background in the script is `#faf8f3`. `contrast.json` of unit UX0 measured the row text on `#fdfdfb` (16.52 to 1), so a value can differ.
- How the palette gets dark values. Tailwind 4 writes each palette class as a read of a CSS variable, for example `.bg-green-100 { background-color: var(--color-green-100); }`. A block `[data-theme="dark"] { --color-green-100: #052e16; }` in `globals.css` then changes every use of `bg-green-100` with no change in the 25 files that use color. A compile check of this unit shows the rule for `bg-green-100`, `text-green-800`, `bg-white`, `text-white`, `bg-stone-50/60`, `hover:bg-amber-50`, and `border-red-200` `[check: UXD 2026-10-28 22:33 node twtest.mjs with @tailwindcss/node compile]`. A class with an alpha value reads the same variable.
  - The rule inverts light and dark for each variable. A class that gave dark text on a light fill now gives light text on a dark fill. `text-white` on `bg-accent` becomes `#1a1a1a` on `#ffff00` (16.21 to 1).
  - A later class must follow this pairing rule. A contrast script must test every palette class pair (code plan 15.16.7).
- `@custom-variant`. Tailwind 4 reads the variant `dark` as `@media (prefers-color-scheme: dark)` by default `[check: UXD 2026-10-28 22:27 grep in tailwindcss/dist/lib.js]`. The line `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` makes `dark:` follow the attribute. The compile check gave `.dark\:bg-black:where([data-theme=dark], [data-theme=dark] *)` `[check: UXD 2026-10-28 22:27 node twtest.mjs]`. The plan above needs no `dark:` class. The line keeps later `dark:` classes tied to the switch and not to the system setting.
- Alternative B. Name the roles (`--pass-bg`, `--fail-bg`, `--notice-bg`) and change the 174 class uses. Benefit: clear names. Cost: a diff in 25 files and more risk. Question 9 asks the owner.

##### Dark colors for the palette in use

- Each pair below is a class pair of the app code. All dark pairs reach 7 to 1 or more (the lowest is 7.49 to 1) `[check: UXD 2026-10-28 22:33 python3 -B dark2.py]`.

| Use | Classes | Light pair, ratio | Dark pair, ratio |
|---|---|---|---|
| Body text on page | `text-foreground` on page | `#1f1d1a` on `#faf8f3`, 15.84 | `#ffffff` on `#000000`, 21.00 |
| Muted text on page | `text-muted` | `#6b665d` on `#faf8f3`, 5.37 | `#aaaaaa` on `#000000`, 9.04 |
| Muted text on card | `text-muted` on `bg-white` | `#6b665d` on `#ffffff`, 5.70 | `#aaaaaa` on `#1a1a1a`, 7.49 |
| Body text on card | `text-foreground` on `bg-white` | `#1f1d1a` on `#ffffff`, 16.81 | `#ffffff` on `#1a1a1a`, 17.40 |
| Link | `text-accent` on page | `#7a1f1f` on `#faf8f3`, 9.68 | `#ffff00` on `#000000`, 19.56 |
| Save button | `text-white` on `bg-accent` | `#ffffff` on `#7a1f1f`, 10.28 | `#1a1a1a` on `#ffff00`, 16.21 |
| PASS pill | `text-green-800` on `bg-green-100` | `#016630` on `#dcfce7`, 6.49 | `#bbf7d0` on `#052e16`, 12.30 |
| FAIL pill | `text-red-800` on `bg-red-100` | `#9f0712` on `#ffe2e2`, 6.85 | `#fecaca` on `#450a0a`, 11.16 |
| State running | `text-blue-800` on `bg-blue-100` | `#193cb8` on `#dbeafe`, 7.23 | `#bfdbfe` on `#172554`, 10.34 |
| State paused, chip | `text-amber-800` on `bg-amber-100` | `#973c00` on `#fef3c6`, 6.36 | `#fcd34d` on `#4a3600`, 8.01 |
| State completed with failures | `text-orange-800` on `bg-orange-100` | `#9f2d00` on `#ffedd4`, 6.43 | `#fed7aa` on `#431407`, 11.56 |
| State interrupted, tag "agent-written" | `text-stone-700` on `bg-stone-200` | `#44403b` on `#e7e5e4`, 8.19 | `#e7e5e4` on `#292524`, 12.08 |
| State waiting | `text-stone-600` on `bg-stone-100` | `#57534d` on `#f5f5f4`, 7.00 | `#d6d3d1` on `#1c1917`, 11.74 |
| Marked chip, comments tag | `text-sky-800` on `bg-sky-100` | `#00598a` on `#dff2fe`, 6.53 | `#bae6fd` on `#082f49`, 10.46 |
| Note box | `text-blue-800` on `bg-blue-50` | `#193cb8` on `#eff6ff`, 8.11 | `#bfdbfe` on `#0b1b3a`, 11.99 |
| Error text | `text-red-700` on page | `#c10007` on `#faf8f3`, 6.05 | `#fca5a5` on `#000000`, 11.06 |
| Error text in a box | `text-red-700` on `bg-red-50` | `#c10007` on `#fef2f2`, 5.87 | `#fca5a5` on `#2a0a0a`, 9.65 |
| Success text | `text-green-800` on page | `#016630` on `#faf8f3`, 6.72 | `#bbf7d0` on `#000000`, 17.33 |
| Mark note | `text-amber-800` on page | `#973c00` on `#faf8f3`, 6.68 | `#fcd34d` on `#000000`, 14.56 |
| Warn text | `text-amber-700` on page | `#bb4d00` on `#faf8f3`, 4.74 | `#fbbf24` on `#000000`, 12.58 |
| Run notice and row notice | `text-amber-900` on `bg-amber-50` | `#7b3306` on `#fffbeb`, 8.73 | `#fef3c7` on `#2a1d00`, 14.80 |
| Term highlight | `text-foreground` on `bg-amber-100` | `#1f1d1a` on `#fef3c6`, 15.09 | `#ffffff` on `#4a3600`, 11.55 |
| Term highlight, hover | `text-foreground` on `bg-amber-200` | `#1f1d1a` on `#fee685`, 13.51 | `#ffffff` on `#664b00`, 8.17 |
| Resume button | `text-white` on `bg-green-700` | `#ffffff` on `#008236`, 4.95 | `#1a1a1a` on `#86efac`, 12.40 |
| Resume button, hover | `text-white` on `bg-green-800` | `#ffffff` on `#016630`, 7.13 | `#1a1a1a` on `#bbf7d0`, 14.36 |
| Pause button | `text-amber-800` on `bg-white` | `#973c00` on `#ffffff`, 7.09 | `#fcd34d` on `#1a1a1a`, 12.07 |

- Dark values of the variables (light values in brackets). `white` `#1a1a1a` (`#ffffff`). `stone-50` `#111111` (`#fafaf9`), `stone-100` `#1c1917` (`#f5f5f4`), `stone-200` `#292524` (`#e7e5e4`), `stone-600` `#d6d3d1` (`#57534d`), `stone-700` `#e7e5e4` (`#44403b`). `amber-50` `#2a1d00` (`#fffbeb`), `amber-100` `#4a3600` (`#fef3c6`), `amber-200` `#664b00` (`#fee685`), `amber-300` `#b88a00` (`#ffd230`), `amber-600` `#f59e0b` (`#e17100`), `amber-700` `#fbbf24` (`#bb4d00`), `amber-800` `#fcd34d` (`#973c00`), `amber-900` `#fef3c7` (`#7b3306`). `red-50` `#2a0a0a` (`#fef2f2`), `red-100` `#450a0a` (`#ffe2e2`), `red-200` `#7f1d1d` (`#ffc9c9`), `red-700` `#fca5a5` (`#c10007`), `red-800` `#fecaca` (`#9f0712`). `green-100` `#052e16` (`#dcfce7`), `green-700` `#86efac` (`#008236`), `green-800` `#bbf7d0` (`#016630`). `blue-50` `#0b1b3a` (`#eff6ff`), `blue-100` `#172554` (`#dbeafe`), `blue-500` unchanged `#2b7fff`, `blue-800` `#bfdbfe` (`#193cb8`). `sky-100` `#082f49` (`#dff2fe`), `sky-800` `#bae6fd` (`#00598a`). `orange-100` `#431407` (`#ffedd4`), `orange-800` `#fed7aa` (`#9f2d00`).
- The light hex values come from a conversion of the Tailwind oklch colors. A value can differ by 1 in one channel from the browser value. For example the script gives `#dcfce7` for `green-100`, and `contrast.json` gives `#dbfce7` `[check: UXD 2026-10-28 22:33 python3 -B dark2.py]`.
- Borders. `--line` `#444444` has 2.16 to 1 on black and 1.79 to 1 on the surface. The light line has 1.25 to 1 today. For an own box or a select, 3 to 1 is the usual limit for a control edge. `#777777` gives 3.89 to 1 on the surface and 4.69 to 1 on black. A CSS rule for `textarea`, `input`, and `select` can set that edge in the dark theme with no class change (proposal). Question 9 asks.
- Focus ring. The accent `#ffff00` gives 19.56 to 1 on black.
- Own box placeholder. It has 3.27 to 1 on white today, below the AA limit of 4.5 to 1 `[check: UX0 2026-10-28 21:2x contrast.json]`. Dark placeholder `#b3b3b3` on `#1a1a1a` gives 8.30 to 1. For the light theme, `#6b665d` on white gives 5.70 to 1.

##### First paint, storage, and monitor

- The server sets the theme. The root layout reads a cookie `theme` with `cookies()` and writes `<html data-theme="dark">`. A missing cookie means light. The Next docs state that `cookies` in a layout makes the route dynamic `[file: app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md:69]`. All 7 page files already use `force-dynamic` `[check: UXD 2026-10-28 22:33 git show HEAD: grep force-dynamic]`. So the layout costs nothing more.
- The rule `[data-theme="dark"]` also sets `color-scheme: dark`, so that scroll bars and form controls match (proposal). Not tested in a browser.
- Not verified: no browser test of the first paint in this unit. The plan needs no inline script, because the server writes the attribute before the first byte of HTML `[agent inference]`.
- Switch. A click on the switch calls a new route (proposal: `PUT /api/theme`). The route sets the cookie `theme` (1 year, path `/`, SameSite lax, readable by the server). If the user is signed in, the route also saves the value in the account (`user_settings.theme`). The sign-in route copies the account value into the cookie, so a second device gets the theme at sign-in.
- Monitor. It uses the same cookie and the same switch. It has no account, so the cookie is the only storage. This matches the owner answer "the monitor keeps it in the browser".
- The deploy hides the monitor (answer 7), so the monitor theme matters on this Mac only.

#### 15.16.6 Data and migrations

- New migration files. The next free number is 1793300004 (files 1793300000 to 1793300003 exist) `[check: UXD 2026-10-28 22:27 ls data/scripts/pocketbase/pb_migrations]`.

| File | What it does | Rules |
|---|---|---|
| `1793300004_v2_own_translations_agree.js` | Adds the bool field `agree` to `own_translations` if it is missing. Safe to run twice. The down function keeps the field and the data. | Unchanged: list and view `@request.auth.id != "" && (user = @request.auth.id \|\| @request.auth.role = "admin")`, create `@request.auth.id != "" && @request.body.user = @request.auth.id && (@request.auth.role = "translator" \|\| @request.auth.role = "admin")`, update null, delete null. |
| `1793300005_v2_user_settings.js` (proposal) | Creates the collection `user_settings` if it does not exist. The down function deletes it only when it holds 0 records, like the other v2 migrations. | See below. |

- Collection `user_settings` (proposal), one record for each user:
  - `user`: relation to `users`, required, one value, `cascadeDelete` false.
  - `theme`: select with the values `light` and `dark`.
  - `panes`: JSON, at most 20,000 bytes.
  - `created` and `updated`: autodate fields, set in the same way as in `1793300001`.
  - Index: `CREATE UNIQUE INDEX idx_user_settings_user ON user_settings (user)`.
- Rules of `user_settings`, in the style of the existing migrations:

```js
const OWN_ONLY = '@request.auth.id != "" && user = @request.auth.id';
// listRule: OWN_ONLY
// viewRule: OWN_ONLY
// createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id'
// updateRule: 'user = @request.auth.id && @request.body.user:changed = false'
// deleteRule: null
```

- The create rule has no role limit. A reader can keep a theme and pane settings, because a reader has the same screen.
- Shape of `panes` (proposal). The key `v` is the format number.

```json
{"v": 1, "panes": {"tl3": {"font": "sans", "size": 15, "line": 1.5, "width": 416, "color": {"light": null, "dark": null}, "bg": {"light": null, "dark": null}}, "ja": {"font": "mincho", "size": 16.8}}}
```

- Alternative to the collection: two fields `theme` and `panes` on `users`. The update rule of `users` lets a user change the own record, if the change holds no `role` and no `disabled` `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:44-45]`. So no rule changes. But the list rule and the view rule of `users` are open to every signed-in user `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:41-42]`. Every signed-in user can then read the settings of every other user.
- S2 and the snapshot. They stay as they are. The cards of need 3 are built when the panel shows, from the raw lines. The page index of need 1 uses fields of `page_runs` that exist. The page count comes from `catalog_items.pages` that exists. `SNAPSHOT_FORMAT` stays 1 `[file: app/lib/htv-build.ts:17]`.
- Optional data step: fill `magazine_chapters` (103 rows) for the month headings (question 12). S2 does not fill it today `[file: docs/VISION-viewer.md:1542]`.
- New code that touches data: `app/lib/pb.ts` (read and write `user_settings`, the field `agree`), a new route `app/app/api/htv/settings/route.ts`, and a new route `app/app/api/theme/route.ts`.

#### 15.16.7 Code plan for the later code unit

- Start after unit DPC commits. Both units edit `app/app/layout.tsx`, `app/components/Nav.tsx`, and files of `app/lib/` (proposal).
- Order. Steps A and B touch the row card and the panel. Step D splits `HtvEditor.tsx`, so it follows A and B. Step E adds a cog to every pane, so it comes last. Step C is CSS and can go at any place. The caller decides if one code unit or five units build it.

| Step | Content | Files |
|---|---|---|
| A. Agree | migration 1793300004, field in save and read, checkbox, notice rule, version column | `data/scripts/pocketbase/pb_migrations/1793300004_v2_own_translations_agree.js`, `app/lib/pb.ts:154-224`, `app/lib/htv-types.ts:102-115`, `app/app/api/htv/save/route.ts:23-41`, `app/components/HtvEditor.tsx:62-66,77,117-121,124-143,255-292,398-431` |
| B. Panel cards | parser of cards, new panel, drag width | new `app/lib/htv-panel-cards.ts`, `app/components/HtvPanel.tsx`, `app/components/HtvEditor.tsx:351-355` |
| C. Theme | dark block, layout attribute, switch, route, sign-in copy | `app/app/globals.css`, `app/app/layout.tsx`, `app/components/Nav.tsx`, `app/components/HtvBar.tsx`, new `app/components/ThemeSwitch.tsx`, new `app/app/api/theme/route.ts`, `app/app/api/htv/login/route.ts` |
| D. Book screen | book list, book screen, page route, page section, window load, panel follow, redirect | `app/app/translate/page.tsx`, `app/components/HtvList.tsx`, new `app/app/translate/[slug]/page.tsx`, `app/app/translate/[slug]/[page]/page.tsx`, `app/components/HtvEditor.tsx`, `app/lib/htv-runs.ts:79-146,172-240`, `app/lib/pb.ts:329-361`, new `app/app/api/htv/page/route.ts` |
| E. Cog and settings | migration 1793300005, settings routes, cog component, settings in the account | `data/scripts/pocketbase/pb_migrations/1793300005_v2_user_settings.js`, `app/lib/pb.ts`, new `app/app/api/htv/settings/route.ts`, new `app/components/PaneCog.tsx`, the pane wrappers of steps A, B, and D |

- Tests:
  - `npx tsc --noEmit` and `npm run lint` in `app/`.
  - `node scripts/smoke.mjs smoke` must keep 70 PASS `[file: docs/VISION-viewer.md:1044]`.
  - `node scripts/smoke.mjs htv` must keep 98 PASS `[file: docs/VISION-viewer.md:1045]`. It must gain checks for:
    - the field `agree` in save and read, and the run notice for a tick
    - the card parser on the 65 messages (1,182 entries and 219 pairs, 0 lost lines)
    - the redirect of an old page URL
    - the page index of `left_foot_full` (120 pages, 6 tagged)
    - the theme cookie
  - `data/scripts/pocketbase/test_local.py`: the field `agree` exists, `user_settings` lets a user read only the own record, and both migrations run twice with no error.
  - Chrome headless screenshots in light and dark at 1500x1000 and 1280x800: the book list, the book screen at `left_foot_full` p045 to p051, `mental_full/p014`, and `kendojidai_2014/p0839` with the panel open.
  - A contrast script that reads every palette class pair of the app and fails below 7 to 1 in the dark theme.
  - Parity must stay: 37 finished runs, 278 sentence groups, 0 differences `[file: docs/VISION-viewer.md:1046,1514-1535]`. A dry run of S2 must report the same snapshot sizes as before.
- Optional small fix in step C: the own box placeholder of the light theme (3.27 to 1) can use `text-muted` (5.70 to 1). The owner did not ask for it.

#### 15.16.8 Open questions for the owner

- Each question names a real case. The first option is the recommended default. Benefit and cost follow each option.

##### Question 1: what an untranslated page shows (decided: round 59 answer 3, option 1)

- Case: `left_foot_full/p045` has no run, so it has no sentence group and no row. The book screen shows its heading and nothing below it. A translator who wants to see the page cannot.
- Option 1 (recommended): the page number, the tag "No agent translation", and one note line. Benefit: needs only the page count that the deploy has. Cost: the translator sees no content of the page.
- Option 2: add the page image (`page_048.pdf` has 0.84 MB, the whole book 111.3 MB). Benefit: the translator reads the Japanese page. Cost: a copy of the PDFs for each book and a storage design that section 13 leaves open. The disk size of the Oracle server is Not verified.
- Option 3: add the JA text of the earlier pipeline (0.61 MB for the 120 pages of `left_foot_full`, JA lines only). Benefit: the translator reads the text on the screen. Cost: the text is from an earlier pipeline, the v2 Translator did not check it, and an upload step is needed. `kendojidai_2014` has 1,043 of 1,051 pages and `Men 0` has none.
- Option 4: one free own box for a page with no run. Benefit: the translator can translate any page. Cost: no sentence group exists, so a new key rule is needed. The rows can differ when a run arrives later.

##### Question 2: which books the list shows (not decided: unit UXC uses option 1 in the constant BOOK_LIST_MODE)

- Case: 12 items have a finished run. The folder `BOOKS_DIR` holds 36 folders (13,278 pages).
- Option 1 (recommended): the 12 items with a finished run. Benefit: each book has data, and S2 fills `catalog_items` for exactly these items `[file: app/scripts/sync-runs.mjs:4]`. Cost: a translator cannot open the other 24 folders.
- Option 2: all 36 folders. Benefit: the whole library is visible. Cost: 24 books show only "No agent translation", and S2 must fill `catalog_items` for them.
- Option 3: the 12 items, and a switch "Show all books". Benefit: both views. Cost: one more control and a change in S2.

##### Question 3: Save per page section (decided: round 59 answer 4, option 1)

- Case: a translator edits p046 and p047 of `left_foot_full`. Today each page has one Save and one version number `[file: app/lib/pb.ts:206-208]`.
- Option 1 (recommended): each page section keeps its own Save. Benefit: the round 54 rule stays (one version for each Save and page). A failure hits one page only. Cost: two edited pages need two clicks.
- Option 2: Option 1 plus a button "Save all changed pages". Benefit: fewer clicks. Cost: it is not one step for all pages. One batch call writes one page, with at most 200 rows `[file: app/lib/pb.ts:184,203]`. A failure can leave some pages saved and some not.
- Option 3: one Save for the whole screen with one version number. Benefit: one click. Cost: it changes the version rule. A book of 255 pages holds about 1,800 rows `[agent inference]`, so one Save needs many batch calls.

##### Question 4: tick and own text in one row (decided: round 59 answer 5, option 1)

- Case: `mental_full/p014`, row L14-L15. The translator ticks "Agree with the agent text" and also has own text in the box.
- Option 1 (recommended): they exclude each other. A typed character clears the tick. A tick on a row with own text asks "Clear your own text in this row?". Benefit: `agree` true always means "the agent text as it is". Cost: one question box. Unsaved own text can go. Saved versions keep the old text.
- Option 2: both can exist. The tick means "the agent text is acceptable" and the own text is an alternative. Benefit: no friction. Cost: the meaning of a row with both is not clear for later use of the data.
- Option 3: a tick copies the agent text into the box. Benefit: the own text is always complete. Cost: two equal texts. It also conflicts with the answer "the own box can stay empty".

##### Question 5: which panes get a cog (decided: round 59 answer 6, option 1)

- Case: the owner wrote "Every pane should have a setting cog button". The human-translation-view has 7 panes in 15.16.4. The monitor has about 10 more.
- Option 1 (recommended): the human-translation-view only. Benefit: the smallest change, and the monitor is hidden on the deploy. Cost: the monitor has no pane settings.
- Option 2: the human-translation-view and the monitor, with the monitor settings in the browser. Benefit: every pane. Cost: more panes to build and test. The monitor has no account, so the settings stay in one browser.

##### Question 6: which settings a cog offers (decided: round 59 answer 6, option 1)

- Case: the owner wrote "customizable font and panel size/color/etc."
- Option 1 (recommended): font family, font size, line height, text color, background color, width (panels), and reset. Benefit: it covers the words of the owner. Cost: a custom color can make text unreadable, so the box shows the contrast ratio and a warning below 4.5 to 1.
- Option 2: font family, font size, and width only. Benefit: no color risk. Cost: it does not cover "color".
- Option 3: Option 1 plus the v1 extras furigana, tap-to-reveal, and focus mode. Benefit: the same list as v1. Cost: the owner did not ask for them, and each one needs new data or new code `[agent inference]`.

##### Question 7: where pane settings live (decided: round 59 answer 6, option 1)

- Case: a translator sets the panel to 520 px on the laptop and signs in on the desktop later.
- Option 1 (recommended): the account, in the new collection `user_settings`. Benefit: all devices, and only the own record is readable. Cost: a new collection, and one more PocketBase request for each page.
- Option 2: the account, in two fields of `users`. Benefit: no new collection. Cost: every signed-in user can read the `users` records, so the settings of all users are visible.
- Option 3: the browser only. Benefit: no migration. Cost: it breaks the earlier answer "Per account, all devices". The server cannot read it, so the first paint can jump.

##### Question 8: the default theme (not decided: unit UXC uses option 1 in the constant DEFAULT_THEME)

- Case: a new account has no saved theme.
- Option 1 (recommended): Light is the default. Benefit: no change for today users, and it matches the two options of the owner. Cost: a user who wants dark must click once on each device. The sign-in copies the account choice.
- Option 2: follow the system setting until the user chooses. Benefit: dark at night with no click. Cost: a third state that the owner did not name.
- Option 3: dark is the default. Benefit: none that the owner words name. Cost: it changes the paper look for everyone.

##### Question 9: dark colors, borders, and method (decided: round 59 answer 7, option 1)

- Case: the PASS pill is `#016630` on `#dcfce7` in light. The table in 15.16.5 gives `#bbf7d0` on `#052e16` (12.30 to 1) in dark. The FAIL pill gives `#fecaca` on `#450a0a` (11.16 to 1).
- Option 1 (recommended): the table of 15.16.5, the variable override, borders `#444444` as in v1, and an edge of `#777777` on boxes. Benefit: no class change, every dark pair at 7.49 to 1 or more. Cost: a new class must follow the pairing rule.
- Option 2: as option 1, with all borders `#777777`. Benefit: clearer lines. Cost: a heavier look, and a value that differs from v1.
- Option 3: named roles and a change of the 174 class uses. Benefit: clear names. Cost: a diff in 25 files and more risk.

##### Question 10: migration files (decided: round 59 answer 7, option 1)

- Case: the owner named the number 1793300004 for the field `agree`.
- Option 1 (recommended): two files, `1793300004` for `agree` and `1793300005` for `user_settings`. Benefit: the tick can ship alone, and each file undoes alone. Cost: two files to run on the server.
- Option 2: one file `1793300004` for both. Benefit: one step on the server. Cost: the tick cannot ship without the settings table.

##### Question 11: a way to jump in the book screen (decided: round 59 answer 4, option 1)

- Case: `kendojidai_2014/p0839` is 838 sections below the top. Scroll alone is slow.
- Option 1 (recommended): a left index with the page numbers, a mark on tagged pages, and a box "Go to page". Benefit: any page in one step. Cost: a new component.
- Option 2: scroll and the URL `?at=p0839` only. Benefit: the smallest change. Cost: the translator scrolls through hundreds of sections.
- Option 3: Option 1 plus a switch "Agent-translated pages only". Benefit: the translator moves between the 6 tagged pages of `kendojidai_2014`. Cost: one more control. When it is on, it hides the all-pages view that the owner asked for.

##### Question 12: month headings for a magazine year (decided: round 59 answer 4, option 1)

- Case: `kendojidai_2014` has 1,051 pages. October 2014 is p778 to p868 `[check: UXD 2026-10-28 22:28 python3 -B read of magazine-chapters.jsonl]`.
- Option 1 (recommended): group by month chapter. S2 or a new command fills the 103 rows of `magazine_chapters`. Benefit: a reader finds "October 2014" at once. Cost: a new fill step. The article titles in the file have the status draft.
- Option 2: page numbers only. Benefit: no new data. Cost: 1,051 flat sections.

##### Question 13: a tick for all rows of a page (decided: round 59 answer 4, option 1)

- Case: `kendojidai_2014/p0839` has 21 rows. A translator who agrees with all of them needs 21 clicks.
- Option 1 (recommended): no bulk control now. Benefit: it follows the owner answer (one tick for each row). Cost: 21 clicks on that page.
- Option 2: a button "Tick all rows of this page" in the page heading. Benefit: one click. Cost: a control that the owner did not name. A translator can tick a FAIL page by mistake (p0839 is FAIL 8.25).

##### Question 14: two panel details that this design chose (decided: round 59 answer 6, option 1)

- Case: the lower pair block holds the same line `stance` in 65 of 65 messages. The block `previous_page_pair` is not in the owner order.
- Option 1 (recommended): hide `stance`, and place `previous_page_pair` after the lower pair. Benefit: less noise. Cost: a translator cannot see the stance line.
- Option 2: show both as they are in the message. Benefit: the panel equals the message. Cost: one fixed line in every lower pair block.

#### 15.16.9 Not verified

- The screen was not built and not shown in a browser. All screen text above is a design.
- No server was called. The stored value of `catalog_items.pages` in the local PocketBase is Not verified. It follows from the code of S2.
- The default of a new bool field for old records in PocketBase 0.39.10.
- The first paint of the theme with the cookie and `cookies()` in Next 16.4.3. The Next docs state that the route becomes dynamic. A browser test is Not verified.
- The effect of `color-scheme: dark` on scroll bars in each browser.
- The system fonts "Hiragino Kaku Gothic ProN" and the like on a translator machine. The font list of the cog uses names that the unit did not test on other systems.
- The window size of 2 pages and the 35 percent line of the page in view are proposals. No test shows that they feel right.
- The size of a closed dictionary card (4 short lines) and the height of an untranslated page section.
- What "all pages" means for a new web article. Only `18d4ac29/p001` exists.
- The disk size of the Oracle server for page images.
- The contrast ratios are computed values with a conversion from oklch. The browser value can differ by 1 in one channel.
- Not read: the markdown files of the earlier pipeline for pages other than `left_foot_full` p048 and `kendojidai_2014` p839. The block format of other pages is Not verified.

#### 15.16.10 Old lines that this section makes stale

- Section 15.13.3 says that the route `/translate/<book>/<page>` shows one page. The book screen replaces it, and the old route redirects (15.16.2).
- Section 15.13.3 says that the panel sits in a column of 26 rem. Need 3 makes the width changeable by drag, with 416 px as the default.
- Section 15.15.4 says that the monitor shows an error without the key. Unit DP1A found empty tables and 404 pages, and 500 only on two routes.
- The page-by-page wish of 2026-10-07 (section 6) is about load speed of the original page view. It does not conflict with the book screen, because the book screen loads pages in a window `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:193]`.

Status: open.

### 15.17 UXC code state (round 59)

- Source: owner answers 3 to 7 of round 59 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:218-235]`. Unit UXC built steps A to E of section 15.16.7 in the Viewer worktree `[check: UXC 2026-10-28 23:56 git status --short -uall]`.
- Sizes use MB. One MB is 1,048,576 bytes.
- When the design of 15.16 and a round 59 answer differ, the answer wins. Section 15.17.3 lists every difference.

#### 15.17.1 What was built, step by step

- Step A, agree tick.
  - Migration `data/scripts/pocketbase/pb_migrations/1793300004_v2_own_translations_agree.js` (36 lines) adds the bool field `agree` to `own_translations`. The rules stay. The down function keeps the field and the data.
  - `app/lib/pb.ts:154-240` reads and writes `agree` and counts the ticks of a version. `app/lib/htv-types.ts:102-121` holds the new fields `agreed`, `agree`, and `ed3Text`.
  - `app/app/api/htv/save/route.ts` takes `agree` for each row. A missing `agree` counts as false.
  - The server refuses a row with a tick and own text (400). It also refuses a tick on a row with no agent text (400). Both rules go beyond the design.
  - `app/components/HtvPageSection.tsx` shows the tick "Agree with the agent text" and the column "Agreed" in the version history.
  - A tick on a row with own text asks "Clear your own text in this row?". Typing in the own box clears the tick.
  - The run notice shows for a saved text or a saved tick. A ticked saved row with no row in the shown run appears in the box "Saved for lines that this run cuts in another way", with the agent text that the user agreed to.
  - The own box placeholder uses `text-muted` (5.70 to 1 on white).
- Step B, panel cards.
  - `app/lib/htv-panel-cards.ts` (297 lines) is a pure parser of `PanelPart.lines`. The function `rawLines()` rebuilds the raw lines of each card. `SNAPSHOT_FORMAT` stays 1 and S2 did not change for this step.
  - `app/components/HtvPanel.tsx` (256 lines) shows dictionary cards, memory pairs with a page chip, plain EN lines of the lower pair with short IDs, and a table of the earlier term marks.
  - The panel hides `entry_id`, `store`, `source`, the line `stance`, the block `ja_text`, and the run of a memory pair. EN text is 15 px sans-serif. Only JA text uses the JA font.
  - Block order: dictionary lookup, book translation memory, aligned translation memory, lower pair, previous page pair, earlier term marks. A block with more than 40 lines starts closed.
  - The lines before the first item of a dictionary or memory block (`store`, `lookup_source`, `requested_words`, `entries_found`, `pairs_found`, `book_id`) show as a small note card.
  - `app/components/HtvPanelFrame.tsx` (70 lines) gives the drag handle (280 to 720 px, default 416 px, arrow keys change it by 16 px) and the button "Close the panel". [Replaced in round 61: the close button is gone. HtvPanelFrame.tsx now has 145 lines and a collapse button. See 15.18.2.]
- Step C, theme.
  - `app/app/globals.css:36-86` holds the block `[data-theme="dark"]` with the 29 Tailwind color variables of 15.16.5, the v1 base colors, `color-scheme: dark`, and the box edge `#777777`. It also holds the line `@custom-variant dark`.
  - `app/lib/theme.ts` (33 lines) reads the cookie `theme`. `app/app/layout.tsx` writes `data-theme` on `<html>`, so the first paint has no jump.
  - `app/components/ThemeSwitch.tsx` (38 lines) is the switch "Light" and "High-contrast dark". It sits in `app/components/Nav.tsx`, so it shows on every page, the sign-in page included.
  - `app/app/api/theme/route.ts` (36 lines) sets the cookie. A signed-in user also keeps the theme in `user_settings`. `app/app/api/htv/login/route.ts` copies the account theme into the cookie at sign-in.
  - `app/scripts/contrast-dark.mjs` (103 lines) tests 31 text and background pairs (7 to 1 or more) and finds the palette colors without a dark value (29 colors used, 0 without).
- Step D, book screen.
  - `app/lib/htv-books.ts` (164 lines) builds the book list, the page index, and the data of page sections. `app/app/translate/page.tsx` shows the book list. `app/app/translate/[slug]/page.tsx` shows one book.
  - `app/components/HtvBook.tsx` (464 lines) holds the screen: one section for each page, the window load, the panel that follows the page in view, the pin, the leave warning for all sections, and the jump. `app/components/HtvIndex.tsx` (114 lines) is the left index with "Go to page" and the month headings.
  - `app/components/HtvPageSection.tsx` (457 lines) is the old `HtvEditor.tsx` for one page. The old file is gone.
  - `app/app/api/htv/page/route.ts` (29 lines) answers `GET /api/htv/page?ids=...` for 8 pages at most.
  - `app/app/translate/[slug]/[page]/page.tsx` redirects (307) to `/translate/<book>?at=<page>#<page>`.
  - `app/scripts/sync-runs.mjs:296-304,383-413` fills `magazine_chapters` with the 103 rows of `magazine-chapters.jsonl`. It uses the same rules as `catalog_items`: dry run by default, compare, skip or update, never delete.
  - A page with no agent translation shows its page ID and the tag "No agent translation" only.
- Step E, settings cog.
  - Migration `1793300005_v2_user_settings.js` (79 lines) creates `user_settings` with the rules of 15.16.6. The down function deletes the collection only when it holds 0 records.
  - `app/lib/htv-settings.ts` (198 lines) holds the pane names, fonts, limits, the clean-up function `sanitizeSettings`, and the contrast formula. `app/app/api/htv/settings/route.ts` (36 lines) reads and writes the record of the signed-in user.
  - `app/components/PaneSettings.tsx` (345 lines) holds the provider, the cog, and the wrapper `Pane`. A change applies at once and saves 800 ms after the last change. The cog warns when the contrast is below 4.5 to 1. [Replaced in round 61: the wrapper `Pane` has no cog. PaneSettings.tsx now has 364 lines. See 15.18.2.]
  - The 7 panes are the book list, the JA column, the agent column, the own box, the TL_3 information panel, the comments, and the version history. The monitor panes get no cog.

#### 15.17.2 Two constants that the owner has not decided

- `BOOK_LIST_MODE` sits in `app/lib/htv-books.ts:25`. The value `"with-runs"` shows the 12 books that have a finished run. The value `"all"` shows every book of `book-slugs.json` (runSource files) or every row of `catalog_items` (runSource pocketbase). A third option "12 plus a Show all books switch" needs a small new control. Not built. [Replaced in round 61: the value is now `"all"`, and the list has 37 rows. See 15.18.2.]
- `DEFAULT_THEME` sits in `app/lib/htv-settings.ts:12`. The value is `"light"`. The value `"dark"` makes dark the default. A "follow the computer setting" mode needs a third state. Not built.

#### 15.17.3 Differences between the design and the code

- The switch sits in `Nav` only. The design also named `HtvBar`. `Nav` shows on every page of the view, so a second switch gives no gain.
- The cog of the own box sits in the top right corner of each box. The cog of the JA column and the agent column also sits in each row. All rows share one setting. [Replaced in round 61: no row holds a cog. See 15.18.2.]
- The share of the row for the JA column is one value. A change in the cog of the agent column stores the rest and clears the share of the JA column.
- The panel line count "Panel lines: N of M" counts the shown blocks only. For `kendojidai_2014/p0839` the count is 395 of 721. It was 536 of 721 with the JA text block.
- Sections that are far from the screen unload when they are clean. The unit chose 8 pages as the limit. The design named only the load window of 2 pages.
- After a jump the target section stays at the top for 5 seconds unless the user scrolls. Sections above the target load and grow in that time. Without this rule a jump ends on another page.
- The book list in `"with-runs"` mode takes the page count of a web article as the last tagged page, at least 1 (the web article `18d4ac29` has `pages` 0 in `catalog_items`). [Replaced in round 61: the mode is now `"all"`. See 15.18.2.]
- The server refuses a tick with own text, and a tick on a row without an agent text (400).
- The sign-in route copies the account theme into the cookie. A theme change on a second device shows after the next sign-in.

#### 15.17.4 Tests

- All counts below come from runs in the copy `<TMP>/r59/UXC/app-copy` against the throwaway PocketBase on 127.0.0.1:8092 `[check: UXC 2026-10-28 23:56 run_all.py]`.

| Test | Result |
|---|---|
| `npx tsc --noEmit` and `npm run lint` in `app/` | exit 0 and exit 0 |
| `npm run build` in the copy | exit 0, 0 lines "Dynamic filesystem access" |
| `node scripts/smoke.mjs smoke` | 70 PASS, 0 FAIL |
| `node scripts/smoke.mjs htv`, runSource files | 208 PASS, 0 FAIL |
| `node scripts/smoke.mjs htv`, runSource pocketbase, after the S2 upload | 208 PASS, 0 FAIL |
| `node scripts/smoke.mjs deploy` | 34 PASS (29 old and 5 new, the brief named 27 old), 0 FAIL |
| `python3 -B data/scripts/pocketbase/test_local.py` | Total: 151 PASS, 0 FAIL |
| Chrome headless checks (`browser_all.mjs`) | 45 PASS, 0 FAIL |
| Parity files mode against pocketbase mode | 40 finished runs, 30 pages, 294 groups, 0 differences. Book list and 12 book indexes equal |
| Group parity against `translator.book_memory` | 40 runs, 294 groups, 0 differences |
| S2 dry run after the upload | 40 page runs, 12 catalog items, 103 magazine chapters, all unchanged. Snapshots 2.23 MB in total (0.02 MB smallest, 0.13 MB largest) | [Round 59 count. After round 61 the dry run shows 37 catalog items. See 15.18.5.]

- Card parser over the TL_3 messages of finished runs: 68 messages, 1,255 entries, 234 pairs, 1,907 parts, 0 lost lines.
- The count of finished runs grew from 37 to 40 while the unit worked, because the paid Translator chain added runs `[check: UXC 2026-10-28 23:53 parity_data.mjs]`.
- Changed old checks: 9 checks of the mode `htv` and `deploy` changed text, and about 30 checks changed their URL from `/translate/<book>/<page>` to `/translate/<book>?at=<page>`. The old route is covered by the new redirect checks.

#### 15.17.5 Measures at `kendojidai_2014/p0839`

- Unit UX0 measured the old screen and unit UXC measured the new screen at 1500 by 1000 px `[check: UX0 2026-10-28 21:24 measure.json]` `[check: UXC 2026-10-28 23:51 browser_all.mjs]`.

| Measure | Before (UX0) | After (UXC) |
|---|---|---|
| Panel width | 416 px | 416 px, changes by drag between 280 and 720 px |
| EN text | 12 px Mincho | 15 px sans-serif |
| JA text | 12 px Mincho | Mincho, 18.75 px for the headword |
| Scroll length, default blocks | 7.0 screens | 6.0 screens |
| Scroll length, all blocks open | 21.3 screens | 15.5 screens |

- Screenshots sit in `<TMP>/r59/UXC/shots/` (20 files, light and dark, 1500 by 1000 and 1280 by 800).

#### 15.17.6 Not verified

- The book screen was tested in Chrome headless only. Safari and Firefox are Not verified.
- The window load and the unload of sections were tested on `left_foot_full` (120 pages). A book of 1,051 pages with many tagged pages is Not verified.
- The effect of `color-scheme: dark` on scroll bars in each browser.
- The system fonts "Hiragino Kaku Gothic ProN" and "Yu Gothic" on a translator machine.
- The first paint of the theme in a browser with a slow network. The server writes the attribute, so a jump is not expected.
- The owner dev server on port 3000 ran the new code with hot reload. Its screens were not checked by this unit. [Round 59 note. For round 61 see 15.18.9.]
- The S2 upload of `magazine_chapters` and of the 3 new runs into the local PocketBase on port 8090. The owner runs S2 by hand.
- The size of the Oracle server disk.

Status: code built, owner check open.

### 15.18 UXC2 code state (round 61)

- Source: owner answers 3 to 7 and 10 of round 61 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:263-267,270]` and answer 7 of round 60 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:244]`. Unit UXC2 wrote the code.
- Method: the unit changed the code in a copy of `app/` and copied the result back in one step at the end `[check: UXC2 2026-10-29 diff -rq app app-copy]`. The owner dev server on port 3000 never saw half-done code.
- Sizes use MB. One MB is 1,048,576 bytes. `<TMP>` is `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode`. The work files sit in `<TMP>/r61/UXC2/`.
- Next guides read before the code: `error-handling.md`, `linking-and-navigating.md`, `redirect.md`, `use-search-params.md`, `use-router.md`, `server-actions.md`, `data-security.md`, `error.md`, `loading.md`, and `14-metadata-and-og-images.md` in `app/node_modules/next/dist/docs/01-app/`.

#### 15.18.1 Owner words

- Round 60 answer 7 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:244]`:

```
+ Add a page-by-page view also, not just scrolling view. translator can switch
+ Instead of `closing`, Make the left and right panel collapsible
+ Dont add cog to EVERY translator writing box. It should be one cog that apply to all of them
```

- Round 61 answer 3 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:263]`: "Correct as written (Recommended)". The restatement has a switch "Scroll view" / "Page view", one page at a time, "Previous page" and "Next page", a page number box, the left index, a leave warning, the URL `/translate/left_foot_full?view=page&at=p048`, the view choice in the account, and pages with no agent translation inside the page view. The scroll view stays as it is.
- Round 61 answer 4 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:264]`: "Correct as written (Recommended)". Each side panel gets a collapse button. The close button is gone. A collapsed panel is a bar of about 28 px with the name and an arrow. The state and the width stay in the account.
- Round 61 answer 5 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:265]`: "A: one cog per column header (Recommended)". A sticky header row holds the cogs of Japanese, Agent translation, Your translation, and Comments. No row holds a cog.
- Round 61 answer 6 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:266]`: "36 books plus web article (Recommended)". `BOOK_LIST_MODE` is `"all"`. S2 uploads the 36 book folders and the web article `18d4ac29`.
- Round 61 answer 7 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:267]`: "Fix the 6 findings (Recommended), Keep the Tailwind loader (Recommended), Keep force-dynamic lines (Recommended)".
- Round 61 answer 10 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:270]`: "Work in a copy, copy back at end (Recommended)".

#### 15.18.2 What was built

- Page view `[round 61 answer 3]`.
  - `app/components/HtvBook.tsx:602-634` holds the toolbar with the switch and the page buttons. `:159-217` is `PageNav` (Previous page, Next page, page number box). `:220-227` is `writeUrl`. `:466-505` hold the leave warning, `movePage`, and `switchView`.
  - `app/app/translate/[slug]/page.tsx:22,39-41` reads `?view` and `?at`, and chooses the view. An `at` outside the book gives the message `No such page: p999. This book has pages 1 to 120. The screen starts at the first page.`.
  - The page view renders one section. The window load of the scroll view also fills the pages next to it, so Next page is fast.
  - A move to another page drops the cached copy of the page that the screen leaves, because a Save changes its saved data. A switch of the view drops all cached pages.
  - `app/components/HtvIndex.tsx` opens a page on a click in the page view. In the scroll view the link scrolls as before.
- Collapsible panels `[round 61 answer 4]`.
  - `app/components/HtvPanelFrame.tsx:12-52` has `BAR_WIDTH` 28, `CollapsedBar`, and `CollapseButton`. `:54-106` is `DragHandle`, which serves both panels. `:108-145` is the frame of the TL_3 information panel.
  - `app/components/HtvIndex.tsx:1-172` has the header (name, cog, collapse button), the drag handle on the right edge, and the bar. Width limits: 160 to 400 px, default 192 px.
  - `app/components/HtvBook.tsx:261-263` reads the state from the account. The old state `panelOpen`, the link "Hide the TL_3 information panel", and the button `data-panel-close` are gone.
- Column cogs `[round 61 answer 5]`.
  - `app/components/HtvBook.tsx:131-157` is the sticky header row `ColumnHeader`. The cogs are Japanese, Agent translation, Your translation, Comments, and Version history.
  - `app/components/PaneSettings.tsx:357-366`: the wrapper `Pane` has no cog. `:210` `PaneCog` takes `align`, so a box opens to the right or to the left.
  - The index and the TL_3 information panel keep one cog in their header. The book list page keeps one cog in its header (`app/components/HtvList.tsx`). `app/components/HtvPageSection.tsx` has no cog.
  - A reader sees the cogs of Japanese and Agent translation only (plus the index and the panel).
- 36 books and S2 `[round 61 answer 6]`.
  - `app/lib/htv-books.ts:27` `BOOK_LIST_MODE = "all"`. `:66-73`: in the files mode only the rows of the 36 book folders count. `items.filled.jsonl` holds 347 rows, and 311 are web articles.
  - `app/scripts/sync-runs.mjs:363-376` `loadBookSlugs` reads `pilot-sample/book-slugs.json`. `:521-528` builds 37 catalog items (36 books and the web article). `:590` prints the count and the size.
  - The catalog rows hold 0.16 MB. A book with no run opens and shows the page numbers with "No agent translation" on every page.
- Six fixes `[round 61 answer 7]`.
  - Finding 1: `app/app/translate/sign-in/page.tsx:12-21` reads the session in `try` and calls `redirect()` after the block.
  - Finding 2: `app/app/translate/loading.tsx` (10 lines) and `app/app/translate/error.tsx` (20 lines). This Next version gives an error boundary the props `error` and `retry` (guide `error.md`).
  - Finding 3: the key `userId` is gone from `CommentView` (`app/lib/htv-types.ts`) and from `app/lib/pb.ts`. The keys `mine` and `userName` stay.
  - Finding 4: `app/lib/htv-origin.ts` (27 lines) is the one helper. `app/lib/htv-api.ts:4,24-25`, `app/app/api/htv/login/route.ts:3,14-15`, `app/app/api/theme/route.ts:3,16-17`, and `app/app/api/htv/logout/route.ts:2,9-10` call it.
  - Finding 5: `next.config.ts` is unchanged. The reason sits in `app/README.md` (section of unit UXC2).
  - Finding 6: `app/app/translate/layout.tsx` (13 lines) exports `metadata` with the title "human-translation-view".
- Stale smoke check `[unit DPP finding]`: `app/scripts/smoke.mjs:1102-1104` reads the first line of the lower pair from the newest finished run of p050. `:365-396` `dataFacts` reads the book count and the finished runs from the data. `:398` `lowerPairFirstLine`.

#### 15.18.3 Settings shape and the view rule

- No new migration. The column `user_settings.panes` (JSON, 20,000 bytes at most) holds the new key `ui`. Old records have no `ui` and stay readable.
- `app/lib/htv-settings.ts:92-118` defines the types. `:147-171` `sanitizeUi` and `sanitizeSettings` clean the value. A bad view, a bad open value, and an unknown key drop out. The index width is clamped to 160 to 400.
- The width of the TL_3 information panel stays in `panes.tl3.width`, where older records keep it.
- Example:

```json
{"v":1,"panes":{"tl3":{"width":500}},"ui":{"view":"page","index":{"open":true,"width":260},"tl3":{"open":false}}}
```

- "Reset all panes" resets `panes` only. The view choice and the panel state stay.
- Precedence of the view: a `view` in the URL wins, else `ui.view` of the account, else the scroll view.

#### 15.18.4 Side effect of `loading.tsx`

- `loading.tsx` makes Next stream the pages under `/translate`. After the first flush a page cannot change the HTTP status `[file: app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md:12]`.
- So `redirect()` inside a page now answers HTTP 200 with the tag `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=...">` and a client side redirect. Before it answered 307.
- `notFound()` inside a page now answers HTTP 200 with the not-found screen and `noindex`. Before it answered 404.
- This covers the redirect to the sign-in page, the old route `/translate/<book>/<page>`, and a book that does not exist. The redirects still work in a browser `[check: UXC2 2026-10-29 smoke htv]`. The smoke script accepts both forms.
- The routes under `/api` keep their statuses.

#### 15.18.5 Tests

- All runs used the copy `<TMP>/r61/UXC2/app-copy` and the throwaway PocketBase on 127.0.0.1:8092. Each mode ran on a fresh server.

| Test | Result |
|---|---|
| `npx tsc --noEmit`, `npm run lint` | exit 0 and exit 0, no warning |
| `npm run build` in the copy | exit 0, 0 lines "Dynamic filesystem" |
| `node scripts/smoke.mjs smoke` | 70 PASS, 0 FAIL |
| `smoke.mjs htv`, runSource files | 262 PASS, 0 FAIL |
| `smoke.mjs htv`, runSource pocketbase | 262 PASS, 0 FAIL |
| `smoke.mjs deploy` | 34 PASS, 0 FAIL |
| Chrome headless (`browser_all.mjs`) | 59 PASS, 0 FAIL |
| `python3 -B data/scripts/pocketbase/test_local.py` | Total: 151 PASS, 0 FAIL |
| `node scripts/contrast-dark.mjs` | 0 failures, lowest ratio 7.49 to 1, 29 palette colors, 0 without a dark value |
| Parity files mode against pocketbase mode | 42 runs, 30 pages, 304 groups, 0 differences. Book list 37 and 37 rows equal. 37 book indexes, 0 differences |
| Group parity against `translator.book_memory` | 42 runs, 304 groups, 0 differences |

- S2 on the throwaway server: the first dry run lists 42 page runs, 37 catalog items, and 103 chapters to create. `--apply` created them with 0 failed. The second dry run shows all unchanged. Snapshots hold 2.34 MB in total (0.02 MB smallest, 0.13 MB largest). The catalog rows hold 0.16 MB.
- S2 dry run on the local server 8090: 0 page runs to create (42 unchanged), 25 catalog items to create (12 unchanged), 103 chapters unchanged. Nothing was written.
- New checks: the page view (SSR for 10 URLs and the clicks in Chrome), the leave warning, the view choice in the account, the collapse of both panels with the old width, 0 cogs inside rows, the book list with 37 rows, a book with no run (`kendojidai_2013`, 1039 pages), and the six fixes.
- Changed old checks: the book count and the stale p050 check read the data. The checks for a redirect and a missing page accept the streamed form (section 15.18.4). The close button check is now a collapse button check.
- Load of `kendojidai_2014` (production build, median of 7 requests, local PocketBase): scroll view 0.77 MB and 207 ms (1.03 MB and 400 ms with `?at=p0839`). Page view 0.47 MB and 391 ms at p0839, 0.22 MB and 255 ms at p0001. The times vary much between runs (maximum 1,618 ms).
- `left_foot_full`: scroll view 0.60 MB and 1,161 ms, page view 0.46 MB and 1,042 ms.
- Screenshots: `<TMP>/r61/UXC2/shots/` (34 files, light and dark, 1500 by 1000 and 1280 by 800).

#### 15.18.6 Unit defaults

- A `view` in the URL wins, else the account, else the scroll view. Alternative: the account wins.
- The cog of Version history sits in the header row next to the Comments cog. Alternative: no cog for that pane.
- The book index uses the pane `list` for its cog (label "Book list and book index"). Alternative: a new pane `index`.
- The book index has a drag handle. Width 160 to 400 px, default 192 px.
- The page view opens p001 when the URL has no `at`. A switch from the scroll view opens the page in view. A switch back jumps to the page of the page view.
- The page view changes the URL with `replaceState`. A move to another page adds no history entry. Alternative: `router.push`, so the back button works.
- A move with unsaved text asks and then drops the text. Alternative: keep the sections mounted.
- Previous page and Next page show twice: at the top, and below the rows.
- S2 always uploads the 36 book folders, even with `--page` or `--list` (like the chapters).
- `app/translate/layout.tsx` sets the title for all pages under `/translate`. Alternative: `metadata` in each page.
- An origin with no host header gets 403.

#### 15.18.7 Open items

- `loading.tsx` changes redirect and not-found statuses to 200 (section 15.18.4). Options: keep (the guide advice), move the file to `app/translate/[slug]/` only, or remove it.
- The web article `18d4ac29` shows its slug as title. The owner decided an empty title `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:184]`.
- The owner must run S2 with `--apply` on the local server to add 25 catalog items.

#### 15.18.8 Differences from the brief

- The brief names 15 lines `export const dynamic = "force-dynamic"`. The app has 27 lines in 27 files. No line changed.
- The brief expects 0.17 MB of catalog rows. The measure is 0.16 MB.
- The brief names `test_local.py` for new counts. The unit made no migration, so it did not change.

#### 15.18.9 Not verified

- Safari and Firefox.
- The dev server on port 3000 after the copy back. The unit checks only the status codes of `/translate` and `/translate/sign-in`.
- A book with 1,051 pages and many tagged pages in the scroll view.
- The `error.tsx` screen for a failure of the server on the real PocketBase. The unit used a stub server that fails.

Status: code built and tested in a copy, then copied back. Owner check open.

### 15.19 Reader pages design (round 62)

- Source: owner answers 5 to 12 of round 62 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:287-294]` and the notes of aki-main `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:296-302]`. Unit RVD wrote this section.
- Scope: docs only. The unit wrote no code, no migration, and no git change. It started no server and did not touch PocketBase on port 8090 or the dev server on port 3000.
- Design process of round 42 answer 9: aki-main restates the need, the owner validates, a docs unit writes the design, then a code unit builds it. This section is the docs step. Every proposal below needs the owner check.
- Sizes use MB. One MB is 1,048,576 bytes. `<TMP>` is `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode`. The work files sit in `<TMP>/r62/RVD/`.
- Evidence tags: `[file: path:line]` and `[check: RVD 2026-10-29 HH:MM command]` mark facts that the unit read or ran. `[agent inference]` marks a guess. "Not verified" marks a fact without evidence.
- Terms. "Reader pages" are the pages under `/read` for the reader role. An "unapproved reader" is a reader with `approved` false. A "chosen human version" is one saved version of an own translation that an admin picks for readers.
- This section adds no new terminology beyond these three. Collections keep their field names.

#### 15.19.1 Owner words

Round 62 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:282-294]`, all tagged `[accepted ... 2026-10-29 10:36]` or `[user 2026-10-29 10:36]`:

- Answer 5, line 287: "Correct, reader pages (Recommended)". Reading: the phrase "start working on the Viewer pages" means the reader pages.
- Answer 6, line 288, reader access: "Sign-up page plus approval".
- Answer 7, line 289, reader EN text: "option 3, with option 1 as default. Admin can choose which human versionn to show" `[user 2026-10-29 10:36]`. The word "versionn" is the owner spelling.
- Answer 8, line 290, reader views: "Single language EN or JA (Recommended), Bilingual pairing (Recommended), Themes, fonts, size (Recommended), Page and Scroll switch (Recommended), Original page image, Focus mode, WE should be able to compress every pdf to be less than 1GB in total without loss of quality right?" `[user 2026-10-29 10:36]`. The Aligned table is not in the list.
- Answer 9, line 291, book and page details: "36 books with metadata (Recommended), Month headings (Recommended), Term highlight and pop-up (Recommended), Resume at last page (Recommended), Phone one-column layout (Recommended), Bookmarks".
- Answer 10, line 292, page number: "File number 'Page 48' (Recommended)".
- Answer 11, line 293, left out for now: "ZH, KO, VI stay out (Recommended), Report button stays out (Recommended), Ruby stays out (Recommended)".
- Answer 12, line 294, next step: "RVD design + TF2 (Recommended)".
- Note of aki-main, line 300: the reader has a switch between the agent text (default, with AI label) and one human version that an admin chooses per page `[reading pending owner check]`.
- Note of aki-main, line 301: 1 GB is about 0.08 MB per page against about 1.45 MB per page today. Lossless methods cannot reach 95 percent less `[agent inference, to measure in unit PC1]`.
- Note of aki-main, line 302: answer 9 adds Bookmarks to the first reader version.

Older decisions that this design keeps:

- Reader access, 2026-10-07 line 96: "option 1. Also admin have to validate reader signup before they can actually view the contents" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:96]`.
- Before approval, the person sees titles and progress and no text `[file: docs/VISION-viewer.md:93-94]`.
- Quality bar, 2026-10-07 line 32: "Make it like a professional book reading website." `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:32]`.
- Component list, 2026-10-07 line 34: "these components should be a list that reader checks to selects" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:34]`.
- Two objectives, 2026-10-07 line 93: "Best user reading experience and efficiency" and "user Flexible and customizable UI for reading components" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:93]`.
- Page by page, 2026-10-07 line 126: "User should be able to view page-by-page efficiently" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:126]`.
- Layout memory, 2026-10-07 line 67: "Per account, all devices" `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:67]`.
- Readers never see the research layer, the scores, the verdict, or the TL_3 panel `[file: docs/VISION-viewer.md:232,239]`.
- AI label `[file: docs/VISION-viewer.md:240-251]`. Every user sees it. A reader cannot hide it. The work block gives a summary such as "AI translation, human check: 12 of 40 pages". Each page has a line such as "AI translation, human check: not yet". Human versions carry no AI label.
- Phone layout `[file: docs/VISION-viewer.md:192,334]`. Reader pages keep the phone layout. The human-translation-view and the agent-translation-monitor are desktop only.
- Magazine, 2026-10-26 line 168: "Each year is one book, with each month is on chapter consists of all articles in that month" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:168]`.
- All pages, round 58 answer 3, line 201: "Not just translated pages. All pages. With agent translated pages tagged." `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:201]`. The book screen of the reader pages lists every page. A page without a run shows "No agent translation yet".
- Admin pages `[file: docs/VISION-viewer.md:88-92]`: only the admin role opens them, they hold the sign-up approval and the human-check record, and "Reading pages stay read-only".
- The reader role today opens a read-only human-translation-view. Round 55 answer 6 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:151]` "Reader read-only (Recommended)". Round 56 answer 5 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:165]` "Keep reader read-only (Recommended)".

#### 15.19.2 Routes and roles

Facts about the code and the data today:

- No reader page exists. The routes are the agent-translation-monitor at `/`, `/books`, `/runs/...`, `/page/...`, and the human-translation-view under `/translate` `[check: RVD 2026-10-29 10:41 find app -type f]`.
- `users.createRule` is `null`. Only a superuser can create a user `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:43]`.
- `users.authRule` is `disabled = false`. A disabled account cannot sign in `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:48]`. So the field `disabled` cannot mark an unapproved reader, because that reader must sign in to see titles.
- `users.updateRule` lets a user change the own record when the body has no `role` and no `disabled`. An admin can change any record `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:44-45]`. A new field `approved` must join the first branch, or a reader can approve the own account.
- `users.listRule` and `users.viewRule` are `@request.auth.id != ""` `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:41-42]`. Any signed-in person can read user records. With public sign-up, a stranger can list names and roles. Whether the email shows is Not verified.
- The cookie `htv_token` holds the PocketBase token. `isSafeNext` accepts only paths under `/translate`. The sign-in path is `/translate/sign-in` `[file: app/lib/htv-session.ts:14,49]`.
- The guard of the routes `/api/htv/*` blocks writes for the reader role with status 403 `[file: app/lib/htv-api.ts:31]`.
- `page_runs` is readable by every signed-in user since migration 1793300003 `[file: data/scripts/pocketbase/pb_migrations/1793300003_v2_page_runs_columns.js:43-44]`. The snapshot holds `verdict`, `score`, and `panel` (the TL_3 information) `[file: app/lib/htv-build.ts:155-181]`. So today a reader can read the research layer through the API. This conflicts with `[file: docs/VISION-viewer.md:232,239]`. It is a broken state that this design closes (question 1).

Routes (proposal):

| Route | Who | What it shows |
|---|---|---|
| `/sign-up` | public | Form: name, email, password. Creates an unapproved reader. |
| `/sign-in` | public | Sign-in for all roles. `/translate/sign-in` stays and sends to it. |
| `/read` | signed in | The 36 books and the web article with metadata and progress. |
| `/read/<book>` | signed in | Book screen: metadata block, month headings, all pages. Page text for approved users only. |
| `/read/<book>?view=page&at=p048` | approved | One page at a time. The same URL form as the human-translation-view `[file: app/components/HtvBook.tsx:21]`. |
| `/read/<book>?view=scroll&at=p048` | approved | All pages in one scroll, jump to p048. |
| `/admin/readers` | admin | List of unapproved readers with Approve. Role change and disable for all users. |
| `/admin/versions` | admin | Choose one human version for a page. Record the human check of a page. |

States of a person:

| State | Condition | What the person can do |
|---|---|---|
| Visitor | no token | Open `/sign-up` and `/sign-in`. |
| Unapproved reader | `role` reader, `approved` false | `/read` and the metadata block of a book. No page text. A banner says "Your account waits for approval." |
| Approved reader | `role` reader, `approved` true | All reader pages. |
| Translator | `role` translator | Reader pages and `/translate`. |
| Admin | `role` admin | Everything, with `/admin/*` and the monitor. |

Roles after the change:

- Proposal: a reader goes to `/read` after sign-in. A translator goes to `/translate`. An admin goes to `/translate`. All three can open `/read` `[agent inference]`.
- Proposal: all existing accounts get `approved` true in the migration, so no one is locked out `[agent inference]`.
- Proposal: an admin who sets the role translator or admin sets `approved` true in the same action. The role change is the approval `[file: docs/VISION-viewer.md:87]`.
- The state "Unapproved reader" sees the same book list as an approved reader. Progress shows as the share of pages with an agent translation (section 9 of this file `[file: docs/VISION-viewer.md:206-215]`). The book screen shows the metadata block and the note "The text opens after approval." No page list opens.
- How the account is created (create rule or server route) is question 2. How `approved` is stored is question 3. What happens to the read-only view of the reader under `/translate` is question 4.

#### 15.19.3 Book list and book screen

Book list `/read` `[round 62 answer 9: "36 books with metadata (Recommended)"]`:

- One card for each of the 36 book folders and the web article `18d4ac29`, 37 in all `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:278]`. The data is `catalog_items`, 37 rows by the brief of unit RVD `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:102-123]`. The live row count is Not verified.
- A card shows the EN title large and the JA title small, the author, the year, the page count, and the AI label summary.
- A card shows the progress: the share of pages with an agent translation, for example "6 of 120 pages".
- A card shows "Continue at Page 48" when the account has a saved place (`reading_progress`, section 15.19.8).
- Fields that are empty in the metadata do not show. No label "unknown" appears.

Metadata (checked, not guessed):

- `items.filled.jsonl` holds 347 rows. The 36 book folders have `title_en` 36, `title_ja` 35, `author_en` 26, `publisher` 34, `publish_year` 33, `isbn` 22, `synopsis` 36 of 36 `[check: RVD 2026-10-29 10:42 python3 count over book-slugs.json and items.filled.jsonl]`. The kinds are book 25, magazine-year 9, web-capture 2 `[check: RVD 2026-10-29 10:42 same command]`.
- S2 uploads the whole item row in the JSON field `row` of `catalog_items`. It also copies the columns `title_ja`, `title_en`, `author_ja`, `author_en`, `publisher`, `publish_year`, `pages` `[file: app/scripts/sync-runs.mjs:434-448]`. So `synopsis`, `isbn`, and `publish_date_text` are in `row`, and S2 needs no change for the book metadata.
- The row `left_foot_full` has `title_en` "The Secret of Kendo and the Left Foot", 120 pages, author "Mitsuru Kobayashi", year 2017, and a synopsis `[check: RVD 2026-10-29 10:42 python3 read of items.filled.jsonl]`. The synopsis comes from an agent. Its `status` field says "filled, not checked by the owner" `[check: RVD 2026-10-29 10:42 same command]`. So the book block marks the synopsis as "Written by an AI agent".
- `row` also holds research fields: `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, `source_url`. `catalog_items` is readable by every signed-in user `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:102-123]`. This is an open item (section 15.19.12).
- The web article `18d4ac29` has an empty title and `pages` 0 in `catalog_items` `[file: docs/drafts/viewer-translator-loop-notes.md:424]`. Its card needs a title from the owner (round 43 answer 4, `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:157]`: "They should have their paired EN articles with EN titles, no?"). This is an open item.

Book screen `/read/<book>`:

- Top: the metadata block. It holds the title, the author, the publisher, the year, the ISBN, the page count, the synopsis, and the AI label summary.
- AI label summary (work block, `[file: docs/VISION-viewer.md:248]`): "AI translation: 6 of 120 pages. Human check: 0 of 6 pages." The numbers can be lower under question 5 option 1. They come from `reader_pages` and `page_checks`. The pilot data has 6 pages of `left_foot_full` with a run folder: p046, p047, p048, p049, p050, p075 `[check: RVD 2026-10-29 10:46 ls pilot-run]`.
- Index: month headings for the 9 magazine years `[round 62 answer 9: "Month headings (Recommended)"]`. The data is `magazine_chapters`, 103 rows. The code of `ChapterHead` exists `[file: app/lib/htv-types.ts:159-179]`. A month heading shows "October 2014" and the page range.
- Index: for a book without chapters, a plain list of page numbers with a mark on pages that have a translation.
- Pages: every page of the book is listed `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:201]`. A page with no usable run shows "No agent translation yet". Which run counts as usable is question 5.
- Page name: "Page 48" from the file number p048. The printed folio is not shown `[round 62 answer 10: "File number 'Page 48' (Recommended)"]`. For `kendojidai_2014/p0839` the name is "Page 839".
- Button "Continue at Page N" when a saved place exists. The bookmark panel is on the left, next to the index.

Where the numbers stand today: 30 pages in 12 folders have a finished run (PASS or FAIL) out of 13,278 pages in the 36 books. This is 0.23 percent `[check: RVD 2026-10-29 10:43 python3 count of summary.json under pilot-run, and 10:51 python3 arithmetic 30/13278]`. So the first reader version holds little text. The design must make the pages without a run look intended, not broken.

#### 15.19.4 Page content views

The words below use the page `left_foot_full/p048`, run `20261029T061734Z-r41`, verdict PASS, score 9.5 `[brief of unit RVD, from unit RV0]`. The run gives 5 rows: T01, T02, L01-L05, L06-L10, L11-L12. A second run `20261028T033359Z-r41` exists for this page. Both runs give the same 5 group keys under the sentence rule `[check: RVD 2026-10-29 10:48 python3 re-implementation of the rule over TS_3.json of both runs]`. Whether the keys stay equal on other pages is Not verified.

Row `left_foot_full/p048/ts3/L01-L05`:

- JA: `わたしは剣先を相手の中墨から外さず攻めつづけ、相手に少しでも隙が生じたと思ったら、気で乗り、腰で乗るようにして先を取って打突するよう心がけています。打突する際は右足の踏み込みと左足の蹴り、さらに左足の引きつけに注意して左手左腰左足の一体化をはかっています。`
- EN (ED_3): `I keep applying Seme without letting my Kensen leave the Ai-te's Chūzumi (centerline), and if I think the Ai-te has even a slight opening, I ride in with ki and, as if riding in with the hips, make a point of taking the initiative and executing Datotsu. When executing Datotsu, I take care with the stepping in of the Migi-ashi (right foot) and the kick of the left foot, and furthermore with the Hiki-tsuke (pull into place) of the left foot, and I work on unifying the Hidari-te, left hip, and left foot into one.`
- Titles: T01 "Unification of the Hidari-te, Left Hip, and Left Foot" and T02 "All Datotsu Are Decided by the Left".

Term marks of this row in the run file `programs/term_marks.ED_3.json` `[check: RVD 2026-10-29 10:41 python3 read of term_marks.ED_3.json]`:

| Mark | JA | EN found | Item |
|---|---|---|---|
| M04 | 剣先 | Kensen | L01 |
| M05 | 相手 | Ai-te | L01 |
| M06 | 中墨 | Chūzumi (centerline) | L01 |
| M07 | 攻め | Seme | L01 |
| M08 | 相手 | Ai-te | L01 |
| M09 | 打突 | Datotsu | L03 |
| M10 | 打突 | Datotsu | L03 |
| M11 | 右足 | Migi-ashi (right foot) | L03 |
| M12 | 引き | Hiki | L04 |

- The row has 9 marks. The file has 30 marks for the whole page.
- Observation: the JA line L04 holds 左手 and the EN line L04 holds "Hidari-te". The file has no mark for them. It marks 左手 only at L11 (M22).
- Observation: the file marks 引き and "Hiki" only. The EN text reads "Hiki-tsuke (pull into place)", and the term list names the headword 引き付け with the EN form "Hiki-tsuke (pull into place)". The highlight covers part of the word.
- Inference: both gaps come from the term search on single lines. The fix TF2 (join split JA lines before the term search) targets this `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:298]`. The reader pages use the marks as the file gives them.
- In the mock-ups below, `[[x]]` marks a highlighted term.

Single language EN (default):

```
Page 48                       AI translation, human check: not yet
-----------------------------------------------------------------
Unification of the Hidari-te, Left Hip, and Left Foot
All Datotsu Are Decided by the Left

I keep applying [[Seme]] without letting my [[Kensen]] leave the
[[Ai-te]]'s [[Chūzumi (centerline)]], and if I think the [[Ai-te]]
has even a slight opening, I ride in with ki and, as if riding in
with the hips, make a point of taking the initiative and executing
[[Datotsu]]. When executing [[Datotsu]], I take care with the
stepping in of the [[Migi-ashi (right foot)]] and the kick of the
left foot, and furthermore with the [[Hiki]]-tsuke (pull into
place) of the left foot, and I work on unifying the Hidari-te,
left hip, and left foot into one.
```

- One click on a highlighted term opens the pop-up of the termbase entry, for example `c-47155949e7b9` (中墨). The code exists `[file: app/components/HtvMarkedText.tsx:17-133]`.
- The pop-up of the reader pages must not show the line "EN form check" (result and detail). That line is research data `[file: app/components/HtvMarkedText.tsx:98-101]`. The reader pages need a prop that hides it.
- The entry text of the pop-up comes from `termbase.draft.jsonl`. The reader sees the short entry first, with the tag "agent-written" where it applies `[file: app/components/HtvMarkedText.tsx:47-49]`.

Single language JA:

```
Page 48                       AI translation, human check: not yet
-----------------------------------------------------------------
左手左腰左足の一体化
すべての打突は左が決定する

わたしは[[剣先]]を[[相手]]の[[中墨]]から外さず[[攻め]]つづけ、
[[相手]]に少しでも隙が生じたと思ったら、気で乗り、腰で乗る
ようにして先を取って[[打突]]するよう心がけています。[[打突]]する
際は[[右足]]の踏み込みと左足の蹴り、さらに左足の[[引き]]つけに
注意して左手左腰左足の一体化をはかっています。
```

- The JA text uses the font Mincho by default. Ruby stays out `[round 62 answer 11: "Ruby stays out (Recommended)"]`.

Bilingual pairing:

```
Page 48
-----------------------------------------------------------------
| JA  左手左腰左足の一体化
| EN  Unification of the Hidari-te, Left Hip, and Left Foot

| JA  すべての打突は左が決定する
| EN  All Datotsu Are Decided by the Left

| JA  わたしは[[剣先]]を[[相手]]の[[中墨]]から外さず[[攻め]]つづけ、...
| EN  I keep applying [[Seme]] without letting my [[Kensen]] ...
```

- The unit of a pair is one row (one sentence group). The bar at the left of JA is red and the bar of EN is blue, as in v1 `[check: RV0 report, not re-read by RVD]`.
- On a wide screen the pair can sit side by side (JA left, EN right). On a phone it stacks (JA above EN).
- The Aligned table is not a reader view `[round 62 answer 8]`.

Focus mode:

```
(the bars, the index, and the side panels are hidden)

        I keep applying [[Seme]] without letting my [[Kensen]]
        leave the [[Ai-te]]'s [[Chūzumi (centerline)]], and if ...
        (column 72 characters wide, centered)
                                      Esc or a tap leaves the mode
```

- The column is 72 characters wide `[check: RVD 2026-10-29 10:42 grep in kendo-translation-viewer-v1/components/reader/ReaderView.tsx, line 1399]`. Esc leaves the mode.
- Focus mode works in the page view and in the scroll view. The text mode (EN, JA, pairing) stays as set.

Original page image:

```
+---------------------+--------------------------------------------+
|                     | Page 48                                    |
|   [image of p048]   | Unification of the Hidari-te, Left Hip ... |
|                     | I keep applying [[Seme]] without ...       |
+---------------------+--------------------------------------------+
```

- Books and magazine years have a PDF. The web article has no page image `[file: docs/VISION-viewer.md:181]`. For the web article the toggle is absent.
- The image source is open. The PDFs sit on the owner Mac only. The 36 books hold 13,278 pages and about 19,259 MB `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:301]`. That is about 1.45 MB per page. A limit of 1 GB (1,024 MB) means about 0.077 MB per page `[check: RVD 2026-10-29 10:51 python3 arithmetic 19259/13278 and 1024/13278]`.
- Unit PC1 measures how far a PDF can shrink. The owner question "without loss of quality right?" belongs to PC1. This design does not answer it.
- The view needs only one thing from PC1: one image file for each page at a known path, for example `<images>/<book>/p048.jpg`. The route `/api/read/image/<book>/<page>` serves the file to approved users `[agent inference]`.
- Until the source exists, the component shows "No page image available" or stays hidden (question 12).

Page and Scroll switch:

```
[ Page view | Scroll view ]                    Page 48  < >  [ 48 ]

Scroll view:
  Page 47   No agent translation yet
  Page 48   (5 rows as above)
  Page 49   (rows)
  Page 50   (rows)
  Page 51   No agent translation yet
```

- The switch, the URL form, the page box, and the previous and next buttons repeat the human-translation-view `[file: app/components/HtvBook.tsx:21,219-226]`.
- The choice is saved in the account.
- A page opens alone in the page view. The scroll view loads a window of pages around the page in view, as the human-translation-view does (`WINDOW_PAGES` 2, `[file: app/lib/htv-books.ts:30]`).
- Page 51 of `left_foot_full` has no run folder `[check: RVD 2026-10-29 10:46 ls pilot-run]`. It is an example of a page that shows "No agent translation yet".

Rows that make no row:

- Caption, pillar, folio, and figure items make no row in the data of the human-translation-view `[file: app/lib/htv-build.ts:90-135]`. Page 48 has 6 caption items C01 to C06 and a running head H01 "The Gokui (deepest secrets) of Kendō and the Left Foot" `[check: RVD 2026-10-29 10:42 python3 read of ED_3.json]`. Example C02 EN: "Point the toes straight toward the Ai-te, bend the ankle slightly, and keep the Hikagami (back of the knee)". The reader misses this text. See question 6.

#### 15.19.5 EN text: agent text and human version

Rule of the owner `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:289,300]`: the default EN text is the agent text. An admin chooses one human version per page. The reader can switch.

What the data holds:

- The agent text is `ed3` of the shown run, in `page_runs.snapshot.rows` `[file: app/lib/htv-types.ts:51-62]`.
- Human versions are the records of `own_translations`: fields `user`, `item_id`, `page_id`, `group_key`, `ts_ids`, `part`, `ja_text`, `run_id`, `ed3_text`, `text`, `agree`, `version`, `created` `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:36-62]`.
- `own_translations` is readable by the owner of the record and by admins only. Records never change after the create `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:27,36-40]`. So a reader cannot read a human version from there.
- An admin can read all own translations. This gives a way to copy a chosen version without a superuser token (question 8).

Proposal for the choice (details in section 15.19.8):

- A new collection `reader_versions` holds at most one record for each page. The field `page_id` is unique.
- The record holds a copy of the rows of the chosen version: `group_key`, `text`, `agree`, `ed3_text`, `ja_text`. It also holds `user` (the translator), `version`, `run_id`, and `chosen_by`.
- The admin page `/admin/versions` lists the versions of a page (translator name, version number, date, row count, count of ticked rows). The admin picks one and presses "Show to readers". The admin can also press "Remove the choice".
- A copy is needed because an approved reader must read the text and `own_translations` is closed to readers. The copy stays valid if the translator later saves a newer version.

Row rules for a chosen version:

| Row of the version | The reader sees | Label |
|---|---|---|
| `text` is not empty | the own text of the translator | none (human version, `[file: docs/VISION-viewer.md:251]`) |
| `agree` is true, `text` is empty | `ed3_text`, the agent text that the translator accepted as it is | see question 7 |
| `text` empty and `agree` false | the agent text of the shown run for the same `group_key` | "AI translation" on this row |

Worked example. Row `left_foot_full/p048/ts3/L01-L05`. The text below is an example written for this design. No real own translation of this row was read by the unit.

```
Own text (example only):
  I keep my kensen on the opponent's centerline and press on. When
  I sense even a small opening, I enter with spirit and hips, take
  the initiative, and strike. ...
Agree tick: the translator ticks the row and leaves the box empty.
  The reader sees the ED_3 text above, as saved in ed3_text.
```

The order of rows: the copy takes the order of the agent rows of the run named in `run_id` of the version. The admin route reads that run from `page_runs`. The rows have a stable key `<page_id>/ts3/<first>-<last>`. A group key that the agent rows do not have goes to the end of the page `[agent inference]`.

Term highlight in a human version:

- The stored marks belong to the ED_3 text. They do not fit an own text.
- The JA side keeps its marks. The EN side of an own text has no highlight. The EN side of an agree row has the marks of ED_3 (question 7).

The switch for the reader:

- In the toolbar: "EN text: Agent | Human". The control is active only on pages that have a chosen version. On other pages the agent text shows and the control is grey with the note "No human version for this page".
- The choice is saved in the account as `reader.en` (section 15.19.6). The default is "Agent".
- The page line names the shown text: "AI translation, human check: not yet" or "Human translation. Chosen by an admin." No translator name shows unless the owner asks (question 7).

AI label text `[file: docs/VISION-viewer.md:240-251]`:

- Work block: "AI translation: 6 of 120 pages. Human check: 0 of 6 pages."
- Page line, agent text, no human check: "AI translation, human check: not yet".
- Page line, agent text, with a human check: "AI translation, human check: done on 2026-10-29".
- Page line, human version: "Human translation. Chosen by an admin."
- Synopsis in the book block: "Written by an AI agent."
- The label is in the data of every page response. The reader cannot hide it.

The human check record: only an admin records that a human checked a page `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:105]` "Correct, admin only records". The record is a new collection `page_checks` (question 9).

#### 15.19.6 Settings

Facts:

- `user_settings` holds one record for each user: `theme` (light or dark) and `panes` (JSON, at most 20,000 bytes, key `v` 1, key `panes`, key `ui`) `[file: data/scripts/pocketbase/pb_migrations/1793300005_v2_user_settings.js]`.
- `sanitizeSettings` copies only the keys `panes` and `ui`. It drops every other key `[file: app/lib/htv-settings.ts:169-205]`. So a new key `reader` needs a code change in this file.
- The ids of the panes are fixed: `list`, `ja`, `agent`, `own`, `tl3`, `comments`, `versions` `[file: app/lib/htv-settings.ts:20]`. The reader pages need no new pane id if the settings go in a new key.

Proposal: a new key `reader` next to `panes` and `ui`:

| Key | Values | Default |
|---|---|---|
| `reader.text` | `en`, `ja`, `pair` | `en` |
| `reader.en` | `agent`, `human` | `agent` |
| `reader.view` | `page`, `scroll` | `page` (question 13) |
| `reader.font` | EN: `serif`, `sans`. JA: `mincho`, `gothic` | `serif`, `mincho` |
| `reader.size` | 12 to 28 px, step 0.5 | 18 |
| `reader.line` | 1.2 to 2.2 | 1.7 |
| `reader.width` | `narrow`, `wide` | `narrow` |
| `reader.focus` | true, false | false |
| `reader.image` | true, false | false |
| `reader.index` | open or closed, width in px | open, 192 |

- The theme stays in `user_settings.theme` and the cookie `theme`. The reader pages use the same switch as the other views `[file: app/lib/theme.ts]`. Two themes exist now: light and high-contrast dark. The number of themes is question 11.
- The limits of size and line come from `SIZE_LIMITS` and `LINE_LIMITS` `[file: app/lib/htv-settings.ts:69-70]`. The fonts come from `FONT_STACKS` `[file: app/lib/htv-settings.ts:37-43]`.
- Per account, all devices `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:67]`. A phone and a desktop use the same record. Size and width on a phone can differ from the desktop because of the screen. A separate set for the phone is not planned `[agent inference]`.
- The settings panel opens from one cog in the reader bar. It holds: Text (EN, JA, Pairing), EN text (Agent, Human), Theme, Font, Size, Line height, Width, Focus mode, Page image, and Reset.
- The first visit: "Reader picks first" `[file: docs/VISION-viewer.md:190]`. The first page view opens the settings panel once. The panel closes at the first change or at the button "Start reading". The panel shows the defaults.
- The size of the `reader` key is small (under 400 bytes) `[agent inference]`. The limit of 20,000 bytes stays.

#### 15.19.7 Phone one-column layout

Round 62 answer 9: "Phone one-column layout (Recommended)".

```
+------------------------------+
| <  Left foot full       [cog]|   top bar: back, title, settings
|------------------------------|
| Page 48        AI translation|
| Unification of the Hidari-te,|
| Left Hip, and Left Foot      |
|                              |
| I keep applying Seme without |
| letting my Kensen leave the  |
| ...                          |
|------------------------------|
| <  [ 48 ]  >   [bm]  [Aa]    |   bottom bar
+------------------------------+
```

- One column. The index, the bookmark panel, and the settings panel open as full-width sheets over the text. The sheet closes with a tap outside or the button "Close".
- The bottom bar holds: previous page, the page box, next page, the bookmark button, and the text settings button. This follows `MobileBottomBar.tsx` of v1 `[check: RV0, not re-read by RVD]`.
- Bilingual pairing stacks JA above EN for each row.
- The original page image is a tab above the text: "Text | Image". It is not side by side.
- Focus mode hides both bars. A tap on the text shows them again.
- The tap target is at least 44 px high `[agent inference]`.
- The page view is the default on a phone. The scroll view stays available.
- Test width: 390 px `[agent inference]`. The check is that no horizontal scroll bar appears.
- The human-translation-view and the monitor stay desktop only `[file: docs/VISION-viewer.md:334]`.

#### 15.19.8 Data and migrations

Rules for all new migrations, as in migrations 1793300001 to 1793300005:

- Create a collection only if it is absent.
- If the collection exists, print a line and change nothing.
- Set explicit `created` and `updated` fields.
- Set an explicit `max` on long text fields.
- Keep the data in the down function.

Next free number: 1793300006 `[check: RVD 2026-10-29 10:40 ls pb_migrations]`.

Helper rule strings:

```
SIGNED_IN = @request.auth.id != ""
APPROVED  = @request.auth.id != "" && @request.auth.approved = true
ADMIN     = @request.auth.role = "admin"
```

Migration `1793300006_v2_users_approved.js`:

- Add the bool field `approved` to `users` if it is absent.
- Set `approved` true on every existing record. A fresh PocketBase has no user yet.
- `updateRule`: add `@request.body.approved:isset = false` to the first branch. New rule:

```
(id = @request.auth.id && @request.body.role:isset = false && @request.body.disabled:isset = false && @request.body.approved:isset = false) || @request.auth.role = "admin"
```

- `createRule` depends on question 2. Option 1 string:

```
@request.body.role = "reader" && @request.body.approved = false && @request.body.disabled:isset = false
```

- `listRule` and `viewRule` depend on the open item in section 15.19.12.
- Down function: keep the field and the data. Set `createRule` back to `null`.

Migration `1793300007_v2_reader_collections.js`:

| Collection | Fields | Index | list / view | create / update / delete |
|---|---|---|---|---|
| `reader_pages` | `page_id` text required, `item_id` text, `n` number, `run_id` text, `rows` json, `terms` json, `extras` json, `built` text | unique `page_id` | `APPROVED` | `null` (S2 only) |
| `reader_versions` | `page_id` text required, `user` relation users, `version` number, `run_id` text, `rows` json, `chosen_by` relation users | unique `page_id` | `APPROVED` | `ADMIN` for all three |
| `page_checks` | `page_id` text required, `checked_by` relation users, `note` text max 500 | unique `page_id` | `SIGNED_IN` | `ADMIN` for all three |

- `reader_pages.rows` holds for each row: `key`, `shortKey`, `part`, `ja`, `ed3`, `jaMarks`, `edMarks`. A mark holds `start`, `end`, `markId`, `entryId`, `surface`. The fields `result` and `detail` of the mark are dropped.
- `reader_pages.terms` holds only the termbase entries that the marks cite, as in the snapshot `[file: app/lib/htv-build.ts:127-133]`.
- `reader_pages.extras` holds the caption items and the running head (question 6). It is an empty list if question 6 is answered no.
- `reader_pages` holds no `verdict`, no `score`, no `panel`, and no reasoning text.
- `reader_pages` has one record for each page. The record holds the run that readers see (question 5).
- The record size is Not measured. The unit made no build of a record.

Migration `1793300008_v2_reader_user_data.js`:

| Collection | Fields | Index | Rules |
|---|---|---|---|
| `bookmarks` | `user` relation, `page_id` text, `item_id` text, `label` text max 200 | unique (`user`, `page_id`) | list and view: `user = @request.auth.id && @request.auth.approved = true`. create: `@request.body.user = @request.auth.id && @request.auth.approved = true`. update: `null`. delete: `user = @request.auth.id`. |
| `reading_progress` | `user` relation, `item_id` text, `page_id` text, `updated` autodate | unique (`user`, `item_id`) | list and view: as `bookmarks`. create: as `bookmarks`. update: `user = @request.auth.id && @request.body.user:changed = false`. delete: `null`. |

- The progress of a user is one record for each book. It changes at a page turn, so it does not belong in `user_settings.panes` (question 10).

Changes to existing rules:

- `page_runs` list and view: back to `@request.auth.role = "translator" || @request.auth.role = "admin"`, the rule of migration 1793300001 `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:150-153]`. This depends on question 1 and question 4. The change can sit in migration 1793300007 or in a separate file `1793300009`.
- `own_translations`: no change. An admin reads all records already.

Changes to S2 (`app/scripts/sync-runs.mjs`):

- Build one `reader_pages` record for each page that has a usable run. Use the same `buildRun` as the snapshot, then drop the research fields.
- Read `run_marks` from PocketBase to pick the run. The run of the admin mark wins. Else the newest usable run (question 5).
- Add the caption items and the running head to `extras` if question 6 is answered yes.
- Keep `catalog_items` as it is. No change for the book metadata.
- A change of a run mark shows to readers at the next S2 run. A mark route that writes `reader_pages` with the admin token is a later option `[agent inference]`.
- Not verified: the cost of a full S2 run with `reader_pages`.

Changes on the Translator side: none (see `docs/drafts/viewer-translator-loop-notes.md`, not changed in round 62). The folio is not needed, because answer 10 chose the file number.

#### 15.19.9 Code plan

Read first: the Next guides in `app/node_modules/next/dist/docs/` for routes, `redirect`, `loading`, `error`, `server-actions`, and `data-security`, as `app/AGENTS.md` requires `[file: app/AGENTS.md:5]`.

The steps, in this order. A step ends when its tests pass.

1. Migrations `1793300006`, `1793300007`, `1793300008`, and rule tests in `data/scripts/pocketbase/test_local.py`. Use a temporary PocketBase on another port, as the earlier tests did.
2. Library. `app/lib/htv-session.ts`: allow `/read`, `/admin`, and `/translate` in `isSafeNext`, and move the sign-in to `/sign-in`. `app/lib/htv-types.ts`: roles and the new `approved` flag in `SessionUser`. `app/lib/pb.ts`: `toUser` reads `approved`, and new functions for sign-up, `reader_pages`, `reader_versions`, `page_checks`, `bookmarks`, and `reading_progress`. `app/lib/htv-settings.ts`: the key `reader` and its limits.
3. New library files: `app/lib/reader-types.ts` (shapes), `app/lib/reader-data.ts` (merge of agent rows, human rows, label text, and window of pages).
4. S2: `app/scripts/sync-runs.mjs` writes `reader_pages`.
5. Routes of the API: `app/app/api/read/sign-up/route.ts`, `app/app/api/read/page/route.ts`, `app/app/api/read/progress/route.ts`, `app/app/api/read/bookmarks/route.ts`, `app/app/api/read/image/[book]/[page]/route.ts` (after PC1), `app/app/api/admin/readers/route.ts`, `app/app/api/admin/versions/route.ts`, `app/app/api/admin/checks/route.ts`. Each route checks the origin and the role like `guard` `[file: app/lib/htv-api.ts:22-33]`. No route uses a superuser token.
6. Pages: `app/app/sign-up/page.tsx`, `app/app/sign-in/page.tsx`, `app/app/read/layout.tsx`, `app/app/read/page.tsx`, `app/app/read/[slug]/page.tsx`, `loading.tsx` and `error.tsx` for `/read`, `app/app/admin/readers/page.tsx`, `app/app/admin/versions/page.tsx`.
7. Components: `ReaderBar`, `ReaderList`, `ReaderBook`, `ReaderPageSection`, `ReaderText` (the three text modes), `ReaderSettings`, `ReaderBookmarks`, `ReaderImage`. Reuse `HtvIndex` (index), `MarkedText` and `TermPopup` (with a prop that hides the research line), `ThemeSwitch`, and the page and scroll logic of `HtvBook` `[file: app/components/HtvBook.tsx]`. Reuse means a shared file or a copy. The unit that builds this step must pick one and name it.
8. The read-only reader under `/translate`: change per question 4.
9. Tests (section 15.19.10) and a state section 15.20 in this file.

Files that the plan does not touch: the monitor pages, the save route, the comment routes, and the Translator repository.

#### 15.19.10 Tests plan

Rule tests with four tokens: unapproved reader, approved reader, translator, admin (own test PocketBase, not port 8090):

| Check | Expected |
|---|---|
| Create a user with `role` "admin" through the create rule | fails |
| Create a user with `approved` true | fails |
| Create a user with `role` "reader" and `approved` false | works |
| An unapproved reader sets `approved` true on the own record | fails |
| A translator sets `approved` on the own record | fails |
| An admin sets `approved` true on a reader | works |
| An unapproved reader lists `reader_pages` | empty list or status 403 (Not verified which) |
| An approved reader lists `reader_pages` and `reader_versions` | works, read only |
| An approved reader reads `page_runs` and `own_translations` of another user | fails |
| A reader or a translator writes `reader_versions` or `page_checks` | fails |
| An admin writes `reader_versions` and `page_checks` | works |
| A user lists `bookmarks` or `reading_progress` of another user | empty |

Data checks:

- The JSON of `/api/read/page?pageId=left_foot_full/p048` has none of the keys `score`, `verdict`, `panel`, `result`, `detail`, `reasoning`. A script scans all keys.
- The 5 rows of `left_foot_full/p048` equal the rows of the snapshot except for the dropped fields (parity script, as in the earlier tests).
- A page with a chosen version returns the human rows in the order of the agent rows. A page without one returns the agent rows.
- A page with no usable run returns the state "No agent translation yet".

Screen checks (Chrome, the owner dev server is not used, a copy of the app on another port):

- Sign-up shows the state "waits for approval". `/read` lists 37 cards. A book page shows no text for an unapproved reader.
- After approval, page 48 shows the 5 rows in each of the modes EN, JA, and pairing.
- A click on "Chūzumi (centerline)" opens the pop-up. The pop-up has no "EN form check" line.
- The EN switch changes to the human version on a page with a chosen version.
- Focus mode hides the bars. Esc leaves it.
- Page and Scroll switch keep the page. The URL carries `view` and `at`.
- Resume: leave at Page 48, open the book again, and the button says "Continue at Page 48".
- A bookmark added on Page 48 shows in the panel and opens Page 48.
- Phone: width 390 px, no horizontal scroll bar, bottom bar visible, pairing stacked.
- Dark theme: the contrast script covers the reader pages `[file: app/scripts/contrast-dark.mjs]`.
- Not verified: Safari and Firefox.

#### 15.19.11 Owner questions

Each question gives the case, the options with benefit and cost, and the recommended option first. All cases use real data of the project.

##### Question 1: where the reader text comes from

- Case: today every signed-in user can read `page_runs`. The snapshot of `left_foot_full/p048` holds `verdict` PASS, `score` 9.5, and the TL_3 panel. Your rule is that readers never see these `[file: docs/VISION-viewer.md:232,239]`.
- Option 1 (recommended): a new collection `reader_pages` that holds only the JA text, the ED_3 text, the term marks, and the termbase entries. S2 fills it. `page_runs` goes back to translator and admin. Benefit: PocketBase itself blocks the research layer, and the app holds no superuser token. Cost: a second copy of the text, a new S2 step, and a delay until the next S2 run after an admin run mark.
- Option 2: the app reads `page_runs` with a superuser token and strips the fields in a route. Benefit: no second copy. Cost: a superuser secret in the web app. One bug leaks all data.
- Option 3: keep `page_runs` open to all signed-in users and hide the fields only in the screen. Benefit: no work. Cost: a reader can read the verdict and score through the API. This breaks your rule.

##### Question 2: how a sign-up creates the account

- Case: `users.createRule` is `null`. A person who fills the form on `/sign-up` cannot create a record.
- Option 1 (recommended): a create rule that allows only `role` "reader" and `approved` false. The route `/api/read/sign-up` sends the form to PocketBase with no secret. Benefit: no superuser token in the app. The rule limits what a stranger can create. Cost: anyone can call the API and create unapproved accounts (spam). Rate limits of PocketBase are Not verified for v0.39.10.
- Option 2: the route creates the user with a superuser token. Benefit: the route can check and limit requests. Cost: a superuser secret in the web app.
- Option 3: no public form. An admin creates each reader by hand. Benefit: no spam. Cost: this is not "Sign-up page plus approval" (round 62 answer 6).

##### Question 3: how to store "approved"

- Case: a new reader must sign in to see titles and progress, but must not see text. The field `disabled` blocks the sign-in `[file: data/scripts/pocketbase/pb_migrations/1793300000_v2_users_rules.js:48]`.
- Option 1 (recommended): a new bool field `approved` on `users`. All existing accounts get true. Benefit: simple, and `role` keeps its meaning. Cost: every rule that guards text names `approved`.
- Option 2: a fourth role value "pending". Benefit: one field. Cost: the live server holds the v1 role value "qa", and the app maps unknown values to reader. A role change then does two jobs.
- Option 3: reuse `disabled` and change `authRule`. Benefit: no new field. Cost: a rejected or disabled person and a new person look the same.

##### Question 4: the read-only view of the reader under /translate

- Case: a reader today opens `/translate/left_foot_full?at=p048` and sees JA, ED_3, and the TL_3 panel in read-only form (round 55 answer 6 and round 56 answer 5).
- Option 1 (recommended): a reader goes to `/read`. `/translate` answers a reader with a redirect to `/read`. Benefit: matches the rule that readers never see the panel. `page_runs` can go back to translator and admin. Cost: the read-only view of round 55 and 56 ends.
- Option 2: keep both. Benefit: no change for the reader role. Cost: `page_runs` stays open to readers, so question 1 option 1 does not close the leak.
- Option 3: keep `/translate` read-only for approved readers but hide the panel and scores. Benefit: a reader sees the long human-translation-view layout. Cost: more code, and the view duplicates `/read`.

##### Question 5: which agent runs a reader sees

- Case: 42 finished runs have a verdict: 39 PASS and 3 FAIL `[check: RVD 2026-10-29 10:43 python3 count of summary.json]`. One FAIL run is `mental_full/p014`, run `20261028T023007Z-r41`, score 8.5. Its first JA line is `はめた場合、普段の稽古への取り組み方を考える大きなヒントになります。大切なのは、稽` and the ED_3 line is `If you apply this, it becomes a great hint for thinking about how to approach your everyday Keiko (practice). What is important is that, during Keiko,`.
- Option 1 (recommended): a page shows the run of the admin mark, else the newest PASS run. A page with only FAIL runs shows "No agent translation yet". Benefit: no reader sees text that QA_3 rejected. Cost: the 3 FAIL pages stay hidden until an admin marks a run, and the words "No agent translation yet" are not exact for them.
- Option 2: the same rule as the human-translation-view: the newest finished run, FAIL included. Benefit: more pages. Cost: a reader sees text with a failed check, and the reader cannot know it, because the verdict is hidden.
- Option 3: PASS runs and FAIL runs with a score of 8.5 or more. Benefit: a middle way. Cost: a new threshold that no decision supports.

##### Question 6: photo captions and the running head

- Case: page 48 has 6 caption items. C02 reads: "Point the toes straight toward the Ai-te, bend the ankle slightly, and keep the Hikagami (back of the knee)". The rows of the data do not include captions `[file: app/lib/htv-build.ts:90-135]`.
- Option 1 (recommended): S2 copies the captions and the running head into `reader_pages.extras`. The page shows them as a block "Photo captions" after the rows. Benefit: a reader gets all translated text of the page. Cost: S2 work, and the pairing of a caption with its photo is not shown.
- Option 2: leave captions out of the first version. Benefit: no S2 change. Cost: a reader misses text on every page with photos.

##### Question 7: how a ticked "agree" row shows, and the translator name

- Case: a translator ticks the row `left_foot_full/p048/ts3/L01-L05` and leaves the box empty. The own text is empty, and `ed3_text` holds the agent text. Your rule says human versions carry no AI label `[file: docs/VISION-viewer.md:251]`, but this text is still agent text.
- Option 1 (recommended): the row shows the agent text with the small tag "AI translation, checked by a translator". The term highlight of ED_3 stays. The translator name does not show. Benefit: honest, and the label rule for agent text holds. Cost: a human page can show both tags.
- Option 2: the row shows as human text with no tag. Benefit: the page looks uniform. Cost: AI text appears with no AI label.
- Option 3: show the translator name on the page line ("Human translation by <name>"). Benefit: credit for the translator. Cost: it shows the name of a user to the public, and no decision allows this yet.

##### Question 8: how the admin chooses a human version

- Case: an admin picks one version of a page. The copy goes to `reader_versions` with the admin token. `own_translations` allows an admin to read all records.
- Option 1 (recommended): the admin page `/admin/versions` lists versions (translator, version, date, rows, ticked rows) and has "Show to readers" and "Remove the choice". Benefit: it keeps "Reading pages stay read-only" `[file: docs/VISION-viewer.md:91]`. Cost: the admin leaves the reader page to choose.
- Option 2: the choice sits on the reader page, visible to admins only. Benefit: the admin sees what the reader sees. Cost: it breaks "Reading pages stay read-only".
- Option 3: no copy. A pointer (`user`, `version`) in `reader_versions`, and a route with a superuser token reads the text. Benefit: no copy. Cost: a superuser secret in the app.

##### Question 9: the human check record

- Case: the label says "AI translation, human check: not yet". Only an admin records a check `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:105]`.
- Option 1 (recommended): a collection `page_checks` and a button "Mark as human checked" on `/admin/versions`. Benefit: the check and the choice of a version are two facts. Cost: one more collection and button.
- Option 2: a chosen human version counts as a check. Benefit: no new collection. Cost: a version can be chosen without a real check.

##### Question 10: where the resume place and the bookmarks live

- Case: a reader leaves `left_foot_full` at Page 48 and later opens the book. The place is saved at a page turn.
- Option 1 (recommended): collections `reading_progress` (one record for each user and book) and `bookmarks`. Benefit: small writes, and the settings JSON stays small. Cost: two collections.
- Option 2: both inside `user_settings.panes`. Benefit: no new collection. Cost: every page turn rewrites the settings JSON (limit 20,000 bytes), and a long list of bookmarks can fill it.

##### Question 11: how many themes

- Case: the human-translation-view has two themes: light and high-contrast dark `[file: app/lib/htv-settings.ts:7]`. v1 had 7 themes `[check: RV0, not re-read by RVD]`. Your answer: "Themes, fonts, size (Recommended)".
- Option 1 (recommended): the two themes of the app now. Benefit: no new colors to check. Cost: no sepia for long reading.
- Option 2: add a third theme "Sepia". Benefit: a softer page for long reading. Cost: new colors and a new contrast check.
- Option 3: the 7 themes of v1. Benefit: full v1 match. Cost: a large contrast check, and the theme is a setting of the whole app.

##### Question 12: the image source of the Original page image

- Case: the PDFs sit on the owner Mac only. 13,278 pages are about 19,259 MB. Unit PC1 measures the size after compression. The image component needs a file for each page.
- Option 1 (recommended): build the reader pages without the image. The toggle appears when PC1 gives a source and a size. Benefit: the other views do not wait for PC1. Cost: the answer 8 item "Original page image" comes later.
- Option 2: serve images from the Mac data folder for the local app now. Benefit: you can see the view at once. Cost: it works on the Mac only, so not for the hosted site.
- Option 3: wait for PC1 and build the image view in the first release. Benefit: one release. Cost: a delay of all reader pages.

##### Question 13: the default view

- Case: your words "view page-by-page efficiently" and the human-translation-view default to the scroll view `[file: app/lib/htv-settings.ts:93]`.
- Option 1 (recommended): the page view is the default for readers. Benefit: one page loads at a time, as asked. Cost: a reader who likes to scroll must switch once. The choice is saved.
- Option 2: the scroll view is the default, as in the human-translation-view. Benefit: one rule for both views. Cost: the first load carries a window of pages.

#### 15.19.12 Not verified

- The live behavior of the proposed create rule and update rule on PocketBase v0.39.10. The unit ran no PocketBase request.
- Whether `@request.body.approved = false` accepts a sign-up body that has no `approved` key.
- Whether PocketBase hides the email of a user from other signed-in users.
- Whether a list rule that fails gives an empty list or status 403 on this version.
- The rate limit of PocketBase for the sign-up route.
- The size of one `reader_pages` record and of all records.
- The group keys of a page across runs, except for `left_foot_full/p048` (two runs, the same 5 keys).
- The order of the saved rows of `own_translations` by `created`. The design uses the order of the agent rows.
- The text of the v1 reader files. The unit used the report of unit RV0 and two greps only.
- A real own translation of `left_foot_full/p048`. The worked example for a human version is written text.
- The Next 16.4.3 guide pages for the routes. The code unit must read them.
- Whether S2 can read `run_marks` and write `reader_pages` within its present limits.
- Safari, Firefox, and a real phone.

Open items:

- Where the hosted front door `/` points. The monitor owns `/` today. The decision belongs to unit DB1.
- `catalog_items.row` holds research fields that every signed-in user can read. Strip them or keep them.
- `users` list and view rules show user records to every signed-in person. With public sign-up, a rule such as `id = @request.auth.id || @request.auth.approved = true` can limit it. The comment view reads the user name through `expand` `[file: app/lib/pb.ts:255,271]`, so a change needs a test.
- The title of the web article `18d4ac29`.
- Search, the dashboard folds, the change log, and keyboard keys are not in answers 8 or 9. The first reader version leaves them out `[agent inference]`.
- Print and export, Version history view, Vertical JA view, and Linked page image `[file: docs/VISION-viewer.md:162-175]` are not in answer 8. They stay out of the first version `[agent inference]`.
- The rule for a PDF size limit of 1 GB belongs to unit PC1.

Status: open. The code of this design is in section 15.20 (unit RC1).

### 15.20 Reader pages code state (round 63, unit RC1)

- Source: the design of section 15.19 and the 13 owner answers of round 63 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:304-318]`. Unit RC1 wrote the code.
- Scope: Viewer app, four PocketBase migrations, the sync command S2, the tests, and the docs. No git write. The unit used throwaway servers on ports 8091 and 8092. It restarted the local PocketBase on port 8090 once, so that it loads the new migrations.
- Terms: "reader pages", "agent translation", "own translation", and "human-translation-view" keep the meaning of section 15.19.
- Evidence tags: `[check: RC1 2026-10-29 HH:MM command]` marks a result of the unit. `[agent inference]` marks a guess. "Not verified" marks a fact without evidence.
- Sizes use MB (1 MB is 1,048,576 bytes).

#### 15.20.1 What was built

- Public pages `/sign-up` and `/sign-in`. A sign-up makes a reader with `approved` false. The person signs in at once and sees the book list and the line "Your account waits for approval by an admin."
- Reader pages `/read` (37 book cards) and `/read/<book>` (book screen). `?view=page&at=p048` is the page view. `?view=scroll&at=p048` is the scroll view.
- Text modes: single language EN, single language JA, and bilingual pairing (side by side on a wide screen, stacked on a phone). The EN text is the agent text or the human version that an admin chose.
- Settings per account: text mode, EN text, view, fonts, size, line height, width, focus mode, and index state. The key is `reader` in `user_settings.panes`. The theme stays in `user_settings.theme`.
- Five themes: Light, High-contrast dark, Sepia, Solarized light, and Solarized dark. Constants for the default of each page group: `DEFAULT_THEME_HTV` (light) and `DEFAULT_THEME_READER` (solarized-light) `[file: app/lib/htv-settings.ts:31-32]`.
- Focus mode (text only, 72 characters wide, Esc leaves), term pop-up without the line "EN form check", photo captions and the running head, bookmarks, and resume at the last page.
- Admin pages `/admin/readers` (approve, remove approval, disable, enable) and `/admin/versions` (saved human versions, preview, choose, remove the choice, add or remove a page check).
- `/translate` sends a reader to `/read`. The route `/api/htv/page` answers a reader with 403. The page views of translators and admins did not change.
- The sync command S2 builds `reader_pages`. Report: 29 records, min 0.01 MB, median 0.03 MB, max 0.06 MB, total 0.78 MB `[check: RC1 2026-10-29 13:10 node scripts/sync-runs.mjs --apply on port 8092]`.

#### 15.20.2 Migrations

- `1793300006_v2_users_approved.js`: field `approved` on `users`. All existing users get true when the field is new. A second run never approves a sign-up.
- Create rule of `users`: `@request.body.role = "reader" && @request.body.disabled:isset = false && (@request.body.approved:isset = false || @request.body.approved = false)`.
- Update rule of `users`: the first branch also forbids the key `approved`. So a reader cannot approve the own account.
- List and view rule of `users`: a reader sees the own record only. A translator and an admin see all records. Reason: a public sign-up must not show names, roles, and emails to strangers. This is a unit default (section 15.20.6).
- `1793300007_v2_reader_collections.js`: `reader_pages` (S2 writes), `reader_versions` (admin writes), and `page_checks` (admin writes).
- `1793300008_v2_reader_user_data.js`: `reader_bookmarks` and `reader_progress` (own records only). The names differ from the brief (section 15.20.6).
- `1793300009_v2_reader_rules.js`: `page_runs` list and view go back to translator or admin. `user_settings.theme` takes the five theme names.
- Every file is safe to run twice and has a down function. The rules are written out in `data/scripts/pocketbase/README.md` section 9.

#### 15.20.3 Where the agree tag comes from

- Decision: S2 copies it. The record `reader_pages.agree` is a list of group keys. It holds no name.
- Reason: a PocketBase rule cannot hide the field `user` of `own_translations` and also let a reader read the record. A copy by S2 holds only the facts that a reader can see.
- Rule: a row counts when the newest saved version of a translator has the tick and the saved agent text equals the agent text of the shown run. So a new run drops the tag until a translator agrees again.
- Cost: the tag changes at the next S2 run, not at once.

#### 15.20.4 Test results

- `npx tsc --noEmit` and `npm run lint` in the copy: no error and no warning. `npm run build`: exit 0 and no "Dynamic filesystem" warning.
- `node scripts/smoke.mjs smoke`: 70 PASS. `htv` with files: 262 PASS. `htv` with PocketBase: 262 PASS. `deploy`: 34 PASS. New mode `read`: 166 PASS.
- Chrome headless (`browser_rc1.mjs`): 63 PASS, 29 screenshots at 1500x1000, 1280x800, and 390x844 in Solarized light and in two dark themes.
- `test_local.py` (fresh): 219 PASS, 0 FAIL. Rule test of the new migrations: 63 PASS, 0 FAIL.
- Lowest contrast pair for each theme: light 4.73, dark 7.49, sepia 6.11, solarized-light 6.03, solarized-dark 6.96 (to 1). Body text reaches 7 to 1 or more in the four non-light themes.
- Checks that changed because a reader goes to /read: four in `htv` (files), five in `htv` (PocketBase), and one in `deploy`. The list is in the report of unit RC1.

#### 15.20.5 Not verified

- Safari, Firefox, and a real phone. The 390 px test used Chrome device emulation.
- The rate limit of PocketBase for the public sign-up route.
- The test `test_local.py` in the live shape (the v1 migrations). The unit ran the fresh shape only.
- A full S2 run against the live server and the behavior with the real number of readers.
- The speed of the scroll view in a book of 1,000 pages or more.

#### 15.20.6 Unit defaults and open items

- Unit default: the collections are `reader_bookmarks` and `reader_progress`. The live server holds the v1 collections `bookmarks` and `reading_progress`, and the rule "create only if absent" would skip the v2 files.
- Unit default: `users` list and view rules limit a reader to the own record. This closes the open item of section 15.19.12 for names and roles.
- Unit default: the sign-up route sets `emailVisibility` true, so that an admin sees the email on the approval page.
- Unit default: a reader with no saved theme and no cookie gets the cookie `theme=solarized-light` at sign-in. A visitor with no cookie sees the default after the page script runs.
- Unit default: the page view saves the place at each page. The scroll view saves it 1.2 seconds after the page in view changes.
- Open item: the owner check of the default theme reading (Solarized light for the reader pages only).
- Closed by unit RC2 (round 65): S2 drops `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, and `source_url` from `catalog_items.row`. See section 15.21.5.
- Open item: the title of the web article `18d4ac29`. The card shows "Web article 18d4ac29".
- Open item: `pb_users.py` makes readers with `approved` false. The admin page approves them.

Status: built in unit RC1, owner check pending.

### 15.21 Original page image and research fields (unit RC2, round 65)

- Source: owner answers of round 65 `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:7-13]`. Answer 1: "Defer this after I can view the actual book page." So the unit made no fix for the reader pages. Answer 6: "Signed short link (Recommended)".
- Scope: the page image view, the research fields in S2, and the Node warning DEP0205. Not in scope: the sign-up rate limit, web article titles, color pages, and Translator items.
- Evidence tags: `[check: RC2 2026-10-29 HH:MM command]` marks a result of the unit. `[agent inference]` marks a guess. "Not verified" marks a fact without evidence.
- Sizes use MB (1 MB is 1,048,576 bytes).

#### 15.21.1 What was built

- Route `GET /api/read/image/<book>/<page>` in `app/app/api/read/image/[slug]/[page]/route.ts`. Example: `/api/read/image/left_foot_full/p048`.
- Four app keys in `app/lib/config.ts`: `VIEWER_PAGE_IMAGE_SOURCE`, `VIEWER_PAGE_IMAGE_DIR`, `VIEWER_PAGE_IMAGE_URL`, and `VIEWER_PAGE_IMAGE_KEY`.
- PocketBase hook `data/scripts/pocketbase/pb_hooks/page_images.pb.js` with the route `GET /page-images/{slug}/{file}`.
- Component `app/components/ReaderImage.tsx` and the setting "Page image" in the settings panel.
- Test script `data/scripts/pocketbase/test_page_images.py` for the hook.
- S2 drops six research fields from `catalog_items.row`. The resolve hook of Node (`app/scripts/ts-resolve-hook.mjs`) uses `module.registerHooks()`.

#### 15.21.2 The contract of the route and the hook

- Source `files` (this Mac, default): the route reads `<VIEWER_PAGE_IMAGE_DIR>/<book>/<page>.webp`. The default folder is `../data/page-images` from the app folder. It answers 200 with `Content-Type: image/webp` and `Cache-Control: private, max-age=600`. A missing file answers 404 with a short JSON body.
- Source `signed` (deploy): the route answers 302 to `<VIEWER_PAGE_IMAGE_URL>/<book>/<page>.webp?exp=<exp>&sig=<sig>`. It adds `Cache-Control: private, no-store`.
- `exp` is the Unix time in seconds now plus 600. `sig` is the lower-case hex HMAC-SHA256 of the text `<book>/<page>.webp:<exp>` with the key. The app uses `node:crypto`. The unit added no npm package.
- If a key of signed mode is missing, the route answers 500 with a message that names the key. The message never holds a key value. A key must have at least 32 characters. A plain http address works for `127.0.0.1`, `localhost`, and `[::1]` only.
- The hook reads `PAGE_IMAGE_KEY` and `PAGE_IMAGE_DIR` from the environment of the PocketBase process at each request. Start PocketBase with `--hooksDir=<folder>`.
- Hook answers: 503 when the key is missing or shorter than 32 characters or the folder is missing. 400 for a bad `slug` (rule `^[a-z0-9_]+$`) or a bad `file` (rule `^p\d{3,4}\.webp$`). 403 for an `exp` that is not a whole number, is not after now, or is more than 900 seconds ahead, and for a wrong signature. 404 for a missing file. 200 with the image otherwise.
- The hook compares the signature with `$security.equal` (constant time). It writes nothing to the log. It changes no other route, rule, or collection. The unit needs no new migration.
- A PocketBase handler cannot see a variable or a function that sits outside it `[file: https://pocketbase.io/docs/js-overview/, section Handlers scope]`. So the hook keeps every helper inside the handler.
- The names of the PocketBase functions come from `pb_data/types.d.ts` of the binary 0.39.10: `$os.getenv`, `$os.stat`, `$os.dirFS`, `$security.hs256`, `$security.equal`, `e.fileFS`. The web docs show v0.41.1, so the unit did not trust them alone `[check: RC2 2026-10-29 15:19 grep in the types.d.ts that PocketBase 0.39.10 wrote]`.

#### 15.21.3 Access rule

- The same rule as `/api/read/page`: an approved reader, a translator, or an admin. No session gives 401. A reader that waits for approval gives 403.
- The route accepts `slug` with `^[a-z0-9_]+$` and `page` with `^p\d{3,4}$`. Else 400.
- The route asks `catalog_items` for the page count of the book. An unknown book, a page count of 0 (the web article 18d4ac29), a page after the last page, and a wrong number of digits give 404. A book of up to 999 pages has 3 digits. A longer book has 4.
- Files mode builds the path with `resolveInside` of `app/lib/safe-path.ts`. A link inside the image folder that points outside gives 403.
- The web article has no page image. The toggle does not show for it.

#### 15.21.4 Screen rules and unit defaults

- The settings panel has "Page image" (Off, On). It shows only for an item with page images. The setting is `reader.image` in `user_settings.panes`, like the other reader settings.
- Wide screen with Page image On in the page view: the image on the left, the text on the right. The image column is 42 percent wide. The link "Open full size" is above the image and opens the route in a new tab.
- Phone width (below the `md` breakpoint of 768 px): two tabs "Text | Image" above the text. The first tab is Text. The tabs are 44 px high. No horizontal scroll bar appears at 390 px.
- A missing image or a load error shows "No page image available". A page with no agent translation (kendojidai_2014/p0839) shows "No agent translation yet" and its page image.
- The image is a plain `<img>` with `loading="lazy"`, `decoding="async"`, and `alt="Original page image, Page 48"`. The route can send the browser to another host, and `next/image` is made for fixed hosts `[agent inference]`. One line disables the lint rule `@next/next/no-img-element` with the reason.
- Unit default: Page image is Off. Reason: the brief of the unit said so. See open item 1.
- Unit default: the scroll view and focus mode show text only. See open item 2.
- Unit default: the image shows as it is in every theme (no color change). See open item 3.
- Unit default: the keys of the app come from the environment only. The file `viewer.config.json` does not hold them, because one of them is a secret.

#### 15.21.5 S2 and the research fields

- Step 1: the six fields are `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, and `source_url` `[file: docs/VISION-viewer.md:2558]`. No screen reads one of them from `catalog_items.row`. The app reads `row.isbn` and `row.synopsis` only `[file: app/lib/pb.ts:524-526]`.
- The monitor tab Books shows the six fields. It reads the files of the Translator, not PocketBase `[file: app/lib/books.ts:77,97]` and `[file: app/lib/meta-fields.ts:11]`. The monitor is off on the deployed app. So S2 can drop the fields.
- Step 2: S2 builds `row` without the six fields. An `--apply` run compares the stored `row` with the new `row`. A record that holds a field gets an update, so one run cleans the records of an earlier run. The files in `item-metadata` keep all fields.
- Step 3: the test seeded `left_foot_full` with all 26 keys of its metadata row on the throwaway PocketBase (port 8092). The dry run planned an update. After `--apply`, the six fields were gone and the other 20 keys stayed with the same values. The next dry run said "unchanged".
- S2 was not run against port 8090. The first run there belongs to aki-main (round 65 answer 7).

#### 15.21.6 Node warning DEP0205

- Node 26 prints DEP0205 for `module.register()`. The hook file now exports `resolve`, `load`, and `installTsResolveHook()`, which calls `module.registerHooks()`. The hooks run on the same thread and are synchronous.
- Callers changed: `app/scripts/sync-runs.mjs` and two places in `app/scripts/smoke.mjs`.
- Proof: the command `node scripts/sync-runs.mjs --offline --page left_foot_full/p048 2>&1 | grep -c DEP0205` printed 1 before and 0 after. The output of the script was the same `[check: RC2 2026-10-29 15:42 the command above, before with the archived files and after with the new files]`.
- The option `--help` of S2 exits before Node prints the warning, so it is not a good test.

#### 15.21.7 Test results

- `npx tsc --noEmit` and `npm run lint` in the copy: no error and no warning. `npm run build`: exit 0.
- `node scripts/smoke.mjs smoke`: 70 PASS. `htv` with files: 262 PASS. `htv` with PocketBase: 262 PASS. `deploy`: 34 PASS. `read`: 231 PASS (166 earlier and 65 new).
- The new `read` checks cover: the route in files mode and in signed mode (302, then the real hook on port 8092), 401, 403, 400, 404, the path checks, the setting, the page HTML with the image on and off, the settings errors, and the research fields.
- `test_page_images.py`: 82 PASS, 0 FAIL. The same hook checks on the PocketBase of the `read` run: 62 PASS with the real gray images.
- `test_local.py`: 219 PASS, 0 FAIL (the earlier checks stay).
- Chrome headless: 86 PASS (63 earlier and 23 new), 35 screenshots at 1440x900 and 390x844.
- The test image `left_foot_full/p048.webp` has 90,280 bytes. The route sent the same bytes `[check: RC2 2026-10-29 15:31 smoke read, check "the bytes equal the file"]`.

#### 15.21.8 Not verified

- The hook on a PocketBase server of the Oracle host. The unit ran PocketBase 0.39.10 on this Mac only.
- A browser request across two hosts (Vercel and the PocketBase host) with real https.
- Safari, Firefox, and a real phone.
- The load of 36 books of images (about 19,259 MB of PDF before the conversion) `[file: docs/VISION-viewer.md:2687]`.
- The behavior of `fileFS` for a Range request or a request with `If-Modified-Since`.

#### 15.21.9 Open items

- Item 1: the default of Page image. Option A (recommended): On in the page view, because the owner wants to view the page image. Option B: Off, as built, and the reader turns it on in the settings panel. The change is one value in `READER_DEFAULTS` in `app/lib/htv-settings.ts`.
- Item 2: the scroll view and focus mode show text only. Option A (recommended): keep it. Option B: show the image in the scroll view too. That needs a lazy image for each of up to 1,000 pages.
- Item 3: dark themes show the image as it is. Option A (recommended): keep it, because the scan is gray. Option B: dim the image in the dark themes.
- Item 4: other fields of `row` look like research fields: `confidence_draft` (36 of 36 books), `notes_draft` (11), `hint_secondary` (34), `issue_evidence` (9), `status` (36), `title_en_source`, `author_en_source`, and `synopsis_source`. Option A (recommended): keep them until the owner names them. Option B: add them to the list `RESEARCH_FIELDS` in S2.
- Item 5: in signed mode each page view asks for a new link, so the browser cannot reuse an image from an earlier visit. Option A (recommended): keep it (about 0.09 MB for each page). Option B: round `exp` to a 5-minute step so that the URL repeats.
- Item 6: the settings of the reader save 400 ms after the last change. A reload within that time loses the change. This is the behavior of unit RC1 for all reader settings.
- Item 7: the toggle sits in the settings panel only. Option A (recommended): keep it. Option B: add a button "Image" to the toolbar.

Status: built in unit RC2, owner check pending.
