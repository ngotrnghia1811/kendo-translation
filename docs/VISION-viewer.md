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
  - The panel covers these eight input blocks. Sections 1 to 4 and 6 are fixed text of the box and do not change from page to page `[agent inference]`. Whether the panel shows them is open (section 15.11.8).
  - Older messages hold fewer blocks. Of 65 TL_3 messages under `data/pilot-run`, 8 hold all eight blocks, 3 lack `previous_page_pair`, and 54 lack `grid_place` and `previous_page_pair` `[check: D3 2026-10-28 08:40 python3 re.findall of [BLOCK name] in */*/messages/TL_3.txt]`. A reader of the message text must accept a missing block `[agent inference]`.
- Default of the panel `[reading pending owner check]`: all blocks except `grid_place`. The owner wrote "the same information as TL_3 agent ... including the retrieved information". The block `grid_place` describes the place of the agent in the grid and holds no page content. Whether `grid_place` and `lower_pair` (the TL_2 agent draft) belong in the panel is open (section 15.11.8).
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
  - The own translation of a row refers to the TS_3 lines of its sentence group. A different run can cut other groups. A version must record the run ID of the ED_3 text that the translator saw `[agent inference]`. The open item is in section 15.11.8.

#### 15.11.4 Run choice

- Rule: the newest finished run of a page is the default, and the admin can mark one run for a page when needed `[user 2026-10-28 08:21]` "Newest by default, but admin can mark one when needed." `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:53]`.
- Finished run `[agent inference]`. A run folder is finished when all of these hold:
  - The folder sits directly under `data/pilot-run/<page folder>/`.
  - The folder holds `summary.json`, and `summary.json` holds `qa.QA_3.verdict` with the value PASS or FAIL.
  - The folder holds `results/ED_3.json`.
  - A folder with a name that starts with `plan-` is a plan run. It has no `summary.json` and no `run.json`, so it is not finished `[check: D3 2026-10-28 08:40 ls left_foot_full_p046/plan-20261026T070259Z]`.
  - A folder `critic-separate-<time>` sits inside a run folder. It is not a run.
  - The `status` text can be `completed` or `completed with failures`. The run `ogawa_lecture_part2_p089/20261026T185029Z-r41` has `completed with failures` because of one critic failure, and it holds the QA_3 verdict PASS `[check: D3 2026-10-28 08:40 python3 read of summary.json]`. The rule above counts it as finished. This is open (section 15.11.8).
- Newest `[agent inference]`: the largest `started_utc` in `run.json`. Folder names end in `-r41`, `-test13`, or `-test13b`, so a sort by folder name is not safe.
- Check on `data/pilot-run/left_foot_full_p046/` `[check: D3 2026-10-28 08:40 ls and python3 read of summary.json and run.json]`:
  - `20261026T182512Z-r41`: finished, QA_3 PASS, `started_utc` 2026-10-26T18:25:12Z.
  - `20261028T023007Z-r41`: finished, QA_3 PASS, `started_utc` 2026-10-28T02:30:07Z.
  - `plan-20261026T070259Z`: plan run, not finished.
  - The rule picks `20261028T023007Z-r41`.
- Second check, a page where the newest run is a FAIL: `mental_full_p014` holds `20261028T023007Z-r41` (FAIL, started 2026-10-28T02:30:07Z) and `20261026T195046Z-r41` (PASS, started 2026-10-26T19:50:46Z). The rule picks the FAIL run. The admin can mark the PASS run instead `[check: D3 2026-10-28 08:40 python3 read of summary.json and run.json]`.
- Page list, answer 13: the list holds all pages with at least one finished run, FAIL pages included `[accepted recommendation 2026-10-28 08:21]` "All finished pages (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:58]`. By the rule above, 30 page folders under `data/pilot-run` hold at least one finished run, and 5 of them hold more than one `[check: D3 2026-10-28 08:40 python3 glob of */*/summary.json]`.
- The mark of the admin lives in the Viewer database, not in the run folder, because the agent files never change `[agent inference]`. The database design is open (unit DB1).

#### 15.11.5 Comments

- A new comment starts private. The writer edits own comments `[accepted recommendation 2026-10-28 08:21]` "Writer edits, starts private (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:55]`.
  - A comment attaches to one sentence row (section 15.10.2).
  - Shared comment: translators and the admin read it `[reading pending owner check]`.
  - Private comment: the writer and the admin read it. The admin reads all comments, also private ones `[user 2026-10-28 08:21]` "option 2. this is just a translation app. you dont need to tell writer about it" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:56]`.
  - The writer is not told that the admin reads private comments. The owner wrote "you dont need to tell writer about it". The screen gives no notice and no wording that private means only the writer `[agent inference]`.
  - The writer deletes own comments `[reading pending owner check]`. The owner words say "Writer edits" and say nothing on delete. The v1 collection `segment_comments` lets the writer or an admin delete (section 15.10.2).
  - The writer can change a comment from private to shared `[reading pending owner check]`. Round 50 answer 10 says the writer chooses per comment whether to share.

#### 15.11.6 Storage and sign-in

- Storage: PocketBase records store the own translations (with their versions), the comments, and the mark of the admin on a run `[user 2026-10-28 08:21]` "Option 3? Have we design any database yet? we need to setup for deployment soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:51]`. The agent files stay on disk and stay read-only `[agent inference]`.
- Sign-in: PocketBase runs locally on this machine with the v1 setup files (migrations). The four v1 test accounts are created again: admin@, translator@, reader@, and wenqian@kendo-translation.local `[user 2026-10-28 08:21]` "option 2. Also what is the process for replacing v1 with v2 on https://kendotranslation.com/? We should do it soon" `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:47]`.
  - The v1 schema migration is `kendo-translation-viewer-v1/migration/pocketbase/pb_migrations/1753123456_initial_schema.js` (section 15.10.4).
  - The v1 seed migration holds a plain password for the admin account `[file: .opencode/reminders/plan/evolving-plan-2026-10-28.md:19]`. The code unit must not print that password or copy it into a file. The owner changes passwords with the script below.
  - The role of the account wenqian@kendo-translation.local is Not verified.
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
  - The cause of a missing EN text (unit S1R), the v2 database design, and the process to replace v1 (unit DB1).
  - Whether the v1 PocketBase server on Oracle Cloud still runs, and the role of the account wenqian@kendo-translation.local.
- Open items for the owner. The recommended default comes first in each item.
  - Panel blocks `grid_place` and `lower_pair`. (1) Hide `grid_place`, show `lower_pair` (recommended). (2) Hide both. (3) Show both.
  - Fixed text of TL_3 (sections 1 to 3 of the message: role, rules, instruction text). (1) Hide it in the panel (recommended). The agent-translation-monitor already has the extra item for the exact text sent to each box. (2) Show it.
  - Panel scope. (1) The panel shows the blocks of the page (recommended). (2) The panel filters dictionary entries and memory pairs by the row.
  - Source of the panel text. (1) Parse `messages/TL_3.txt` (recommended). (2) Read the structured files and rebuild the three parts that have no stored selection.
  - Unit of a saved version. (1) One version for the whole page on each click on Save (recommended). (2) One version for each changed row.
  - Row identity when the run changes. (1) A version records the run ID, and the translator sees a notice when the shown run differs (recommended). (2) Rows follow the sentence group text, and the Viewer matches them again.
  - Delete of a comment, and a change from private to shared. (1) The writer deletes own comments and can change private to shared (recommended). (2) The writer edits only.
  - Status `completed with failures`. (1) Count a run as finished when the QA_3 verdict exists (recommended). (2) Count only status `completed`.
  - Unsaved text. (1) Show a warning when the user leaves a page with unsaved text (recommended). (2) Show no warning.
  - The seed migration of v1 holds a plain password. (1) Apply the schema migration only and create the accounts with the user management script (recommended). (2) Apply all v1 migrations and change the password at once.

Status: open.
