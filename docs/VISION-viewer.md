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
  - Few steps: two clicks from the dashboard to the text, and the reader resumes the last page on any device `[accepted recommendation 2026-10-07 23:47]`. A web article takes 3 clicks on the Reader dashboard (/read): year, month, link. Search is the short path `[accepted recommendation 2026-10-29 23:36]` "Accept 3 clicks, use search (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:122]`.
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
- Progress per language is the translated share `[accepted recommendation 2026-10-07 14:58]` "Finished share per language (Recommended)". Round 70 answer 3 set the word "translated" for the Reader dashboard (/read) `[user 2026-10-29 23:36]`.
  - "Finished" means a final `ED_3` text with a `QA_3` verdict `[validated reading 2026-10-07 20:05]`. This is the old tag text, kept as history. Round 70 answer 3 `[user 2026-10-29 23:36]` `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:118]`: "Pages with translation that reader can view\nuse the CORRECT word. `translated` instead of `finished`\nAlso reader can open any page, just no translated data. Be concise with your wording." Rule today: on the Reader dashboard (/read), a page counts as translated when readers can view its English text. Any page opens, also a page with no translated text. The Monitor dashboard (/ on this Mac) counts "pages done" with any verdict, FAIL noted `[accepted recommendation 2026-10-29 23:36]` "Any verdict, FAIL noted (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:119]`.
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
  - The JA original is split into pages by the line count of an A4 page `[validated reading 2026-10-07 23:47]`. Round 73c answer 8: a page that holds no unit is dropped `[accepted recommendation 2026-10-30 20:17]` "Drop them, small Translator fix (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-30.md:114]`. Example: `c7bb369d` has 4 A4 pages by the old cut and 3 pages after the drop (section 15.26.3).
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
  - The first view has two tabs, Runs first and Books second. Each tab has full width, and one click switches the tab. Round 43 answer 6 `[user 2026-10-26 15:17]` "option 1." `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:110]`, which is the option "Two tabs (Recommended)". Round 42 answer 12 `[user 2026-10-26 12:56]` "list of runs and list of books" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:88]`. Round 70 (section 15.24): the first tab becomes the Monitor dashboard with one row for each book, and the table of lists moves to the tab Lists `[reading pending owner check]`.
  - Seven extra items are off by default. The user ticks an item to show it. Round 42 answer 13 `[user 2026-10-26 12:56]` "all of them, off by default, user can tick to show thme" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`.
    - The seven items: cost and seconds per call, exact text sent to each box, dictionary and aligned memory hits, failed and flagged calls, program check results, critiques with the note for the next critic, and critique counts against N `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`.
    - The ticks are saved with the account for every page and device, as for the layout in section 7. Round 43 answer 7 `[accepted recommendation 2026-10-26 15:17]` "Saved per account (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:111]`.
  - Pause: the Viewer writes a pause file into the list folder of the run. The run program checks for the file before each new model call. Running calls finish. Resume deletes the file. Round 43 answer 8 `[accepted recommendation 2026-10-26 15:17]` "Pause before next call (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:112]`. Round 42 answer 14 `[user 2026-10-26 12:56]` "pause,  write a comment" `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:90]`. Round 44 answer 6: only the admin role uses pause `[accepted recommendation 2026-10-26 21:33]` `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:135]`. Round 70 (section 15.24.4.5): a file `PAUSE` for one book joins the file of the list folder `[reading pending owner check]`.
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
  - The run view also shows the book translation memory pairs of each book, grouped by page, and the compare table of the two critic modes `[agent inference]`. The Runs tab shows the list kind, the critic mode, and the book jobs in one column `[agent inference]`. Round 70: the tab Lists at `/runs` shows this column (section 15.24.4.1).
  - The page view shows the critic mode and the session turns in its header. Two new Extra detail items sit in the menu, off at start like the seven decided items: "Chain inputs" and "Critic-only runs" `[agent inference]`. Round 42 answer 13 named only seven items `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:89]`. The owner has not decided items 8 and 9 `[reading pending owner check]`.
  - The Books tab loads the Details part of one item on request. A magazine chapter shows its articles with the key `web_link` and the candidate list of the web rows that point at the chapter, with the link status `[agent inference]`.
  - Placement: all of these parts go to the agent-translation-monitor only. The human-translation-view has no task that needs them (section 6, task rule "split by task") `[agent inference]`.
  - The parts only read files. The pause file stays the only write of the Viewer `[file: app/README.md]`. Round 70 (section 15.24.6) adds two writes in the folder `config` of the Translator: the settings file and its history.

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
  - The email comes from `--superuser EMAIL` or from the variable `PB_SUPERUSER_EMAIL` `[file: data/scripts/pocketbase/pb_users.py:156-157]`.
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
- The web article `18d4ac29` has no row under this ID. The row has the long ID `18d4ac29-12d5-4753-b032-35337361fee5`. S2 makes the record with `item_id` `18d4ac29` and empty titles. It invents no ID rule. This matches the title in the files mode, which is empty too. (State of unit S2C. Round 69 answer 7 and unit RC4 changed this. S2 takes the first 8 characters of the long ID as the slug, and the title is "Kendo droplet guard". Section 15.25 gives the state.)
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
  - Option 1 (recommended): keep the empty title. Benefit: no new rule. Cost: the list shows no title for this page. Round 69 answer 7 replaced this item. The title is "Kendo droplet guard" (section 15.25).
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
- Round 61 answer 6 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:266]`: "36 books plus web article (Recommended)". `BOOK_LIST_MODE` is `"all"`. S2 uploads the 36 book folders and the web article `18d4ac29`. (Round 61 state. Unit RC4 changed S2 to upload 347 rows, section 15.25.)
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
- 36 books and S2 `[round 61 answer 6]`. (Round 61 state. S2 now uploads 347 metadata rows, section 15.25.)
  - `app/lib/htv-books.ts:27` `BOOK_LIST_MODE = "all"`. `:66-73`: in the files mode only the rows of the 36 book folders count. `items.filled.jsonl` holds 347 rows, and 311 are web articles.
  - `app/scripts/sync-runs.mjs:363-376` `loadBookSlugs` reads `pilot-sample/book-slugs.json`. `:521-528` builds 37 catalog items (36 books and the web article). `:590` prints the count and the size. (Round 61 state. Unit RC4 changed the build to 347 catalog rows, section 15.25.)
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
- The web article `18d4ac29` shows its slug as title. The owner decided an empty title `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:184]`. Round 69 answer 7 `[user 2026-10-29 21:49]` replaced this decision. The title is "Kendo droplet guard" (section 15.25).
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
| `/read` | signed in | The Reader dashboard: folds of 342 visible works, search, and progress (state of unit RC4, section 15.25). Unit RC1 showed 36 books and the web article. |
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
- (RC1 state.) The state "Unapproved reader" sees the same book list as an approved reader. Progress shows as the share of pages with an agent translation (section 9 of this file `[file: docs/VISION-viewer.md:206-215]`). The book screen shows the metadata block and the note "The text opens after approval." No page list opens. Unit RC4 changed the list. The Reader dashboard (/read) shows the folds and the total line to this reader (section 15.25).
- How the account is created (create rule or server route) is question 2. How `approved` is stored is question 3. What happens to the read-only view of the reader under `/translate` is question 4.

#### 15.19.3 Book list and book screen

Book list `/read` `[round 62 answer 9: "36 books with metadata (Recommended)"]`: (RC1 state. The Reader dashboard replaced the list, sections 15.23 and 15.25.)

- (RC1 state.) One card for each of the 36 book folders and the web article `18d4ac29`, 37 in all `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:278]`. The data is `catalog_items`, 37 rows by the brief of unit RVD `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:102-123]`. The live row count is Not verified. Unit RC4 changed this. S2 uploads 347 rows, and `/read` shows 342 visible works in folds (section 15.25).
- A card shows the EN title large and the JA title small, the author, the year, the page count, and the AI label summary.
- A card shows the progress: the share of pages with an agent translation, for example "6 of 120 pages".
- A card shows "Continue at Page 48" when the account has a saved place (`reading_progress`, section 15.19.8).
- Fields that are empty in the metadata do not show. No label "unknown" appears.

Metadata (checked, not guessed):

- `items.filled.jsonl` holds 347 rows. The 36 book folders have `title_en` 36, `title_ja` 35, `author_en` 26, `publisher` 34, `publish_year` 33, `isbn` 22, `synopsis` 36 of 36 `[check: RVD 2026-10-29 10:42 python3 count over book-slugs.json and items.filled.jsonl]`. The kinds are book 25, magazine-year 9, web-capture 2 `[check: RVD 2026-10-29 10:42 same command]`.
- S2 uploads the whole item row in the JSON field `row` of `catalog_items`. It also copies the columns `title_ja`, `title_en`, `author_ja`, `author_en`, `publisher`, `publish_year`, `pages` `[file: app/scripts/sync-runs.mjs:434-448]`. So `synopsis`, `isbn`, and `publish_date_text` are in `row`, and S2 needs no change for the book metadata.
- The row `left_foot_full` has `title_en` "The Secret of Kendo and the Left Foot", 120 pages, author "Mitsuru Kobayashi", year 2017, and a synopsis `[check: RVD 2026-10-29 10:42 python3 read of items.filled.jsonl]`. The synopsis comes from an agent. Its `status` field says "filled, not checked by the owner" `[check: RVD 2026-10-29 10:42 same command]`. So the book block marks the synopsis as "Written by an AI agent".
- `row` also holds research fields: `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, `source_url`. `catalog_items` is readable by every signed-in user `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:102-123]`. This is an open item (section 15.19.12).
- The web article `18d4ac29` has an empty title and `pages` 0 in `catalog_items` `[file: docs/drafts/viewer-translator-loop-notes.md:424]`. Its card needs a title from the owner (round 43 answer 4, `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:157]`: "They should have their paired EN articles with EN titles, no?"). This is an open item. Closed by round 69 answer 7 `[user 2026-10-29 21:49]`. The title is "Kendo droplet guard" (section 15.25).

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

Rule of the owner `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:289,300]`: the default EN text is the agent text. An admin chooses one human version per page. The reader can switch. Replaced in part in round 75 answer 3 (`qa-memory-2026-10-31.md:53`): readers see the agent text of a run only after the admin presses "Open to readers" for that run (section 15.28.2).

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

- In the toolbar: "EN text: Agent | Human". The control is active only on pages that have a chosen version. On other pages the agent text shows and the control is grey with the note "No human version for this page". Replaced in round 73c answer 4 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:110`), see 15.26.6.4: the component list holds the check boxes Agent text and Human version. The reader can show one or both.
- The choice is saved in the account as `reader.en` (section 15.19.6). The default is "Agent". Replaced in round 73c answer 4 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:110`), see 15.26.6.9: the saved value `reader.shown` holds the checked components, and an old `reader.en` turns into it.
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
| `reader.en` | `agent`, `human` | `agent` (replaced in round 73c answer 4, see 15.26.6.9) |
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
- The settings panel opens from one cog in the reader bar. It holds: Text (EN, JA, Pairing), EN text (Agent, Human), View, Theme, Font, Size, Line height, Width, Focus mode, and Reset. The button Image sits in the reader bar since unit RC3 (section 15.22.1). Replaced in round 73c answer 4 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:110`), see 15.26.6.4: Text and EN text leave the settings panel. The Components button in the reader bar opens the component list.
- The first visit: "Reader picks first" `[file: docs/VISION-viewer.md:190]`. The first page view opens the settings panel once. Round 68 answer 5: the panel closes only at the button "Start reading" or the Esc key, not at the first change. The panel shows the defaults. See section 15.23.6.
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
- Read `run_marks` from PocketBase to pick the run. The run of the admin mark wins. Else the newest usable run (question 5). Replaced in round 75 answer 3 (`qa-memory-2026-10-31.md:53`): the candidate runs are the runs that the admin opened (section 15.28.2).
- Add the caption items and the running head to `extras` if question 6 is answered yes.
- Keep `catalog_items` as it is. No change for the book metadata.
- A change of a run mark shows to readers at the next S2 run. A mark route that writes `reader_pages` with the admin token is a later option `[agent inference]`. Still true after round 75 answer 3: readers see a change only after the next S2 run (section 15.28.2).
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

- Sign-up shows the state "waits for approval". `/read` lists 37 cards. A book page shows no text for an unapproved reader. (RC1 state. Now `/read` shows the folds of 342 visible works, section 15.25.)
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
- Option 1 (recommended): a page shows the run of the admin mark, else the newest PASS run. A page with only FAIL runs shows "No agent translation yet". Benefit: no reader sees text that QA_3 rejected. Cost: the 3 FAIL pages stay hidden until an admin marks a run, and the words "No agent translation yet" are not exact for them. Replaced in part in round 75 answer 3: the candidate runs are the opened runs. The rule "newest PASS" applies among them. A page with only FAIL runs still shows "No agent translation yet" (section 15.28.2).
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

- Where the hosted front door `/` points. Decided in round 68 answer 4: `/` opens the reader dashboard. The monitor keeps `/` on the Mac when the monitor is on. See section 15.23.7.
- `catalog_items.row` holds research fields that every signed-in user can read. Strip them or keep them.
- `users` list and view rules show user records to every signed-in person. With public sign-up, a rule such as `id = @request.auth.id || @request.auth.approved = true` can limit it. The comment view reads the user name through `expand` `[file: app/lib/pb.ts:255,271]`, so a change needs a test.
- The title of the web article `18d4ac29`.
- Search and the dashboard folds are in scope since round 68 answer 3 (section 15.23). The change log and keyboard keys are not in answers 8 or 9. The first reader version leaves them out `[agent inference]`.
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

- Public pages `/sign-up` and `/sign-in`. A sign-up makes a reader with `approved` false. The person signs in at once and sees the book list and the line "Your account waits for approval by an admin." (RC1 state. The person now sees the Reader dashboard, section 15.25.)
- Reader pages `/read` (37 book cards) and `/read/<book>` (book screen). `?view=page&at=p048` is the page view. `?view=scroll&at=p048` is the scroll view. (RC1 state. `/read` is now the Reader dashboard, section 15.25.)
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
- Open item: the title of the web article `18d4ac29`. The card shows "Web article 18d4ac29". (RC1 state.) Closed by round 69 answer 7 `[user 2026-10-29 21:49]` and unit RC4. The row shows "Kendo droplet guard".
- Closed by unit RC3 (round 66 answer 7): `pb_users.py` makes readers with `approved` true. See section 15.22.4.

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
- Component `app/components/ReaderImage.tsx`. Since unit RC3 the setting is a button "Image" in the reader bar (section 15.22.1).
- Test script `data/scripts/pocketbase/test_page_images.py` for the hook.
- S2 drops six research fields from `catalog_items.row` (14 keys since unit RC3). The resolve hook of Node (`app/scripts/ts-resolve-hook.mjs`) uses `module.registerHooks()`.

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
- The web article has no page image. The button "Image" does not show for it.

#### 15.21.4 Screen rules and unit defaults

- The button "Image" in the reader bar (next to the View buttons) turns the page image on or off. It shows only for an item with page images. The Settings panel has no switch since unit RC3. The setting is `reader.image` in `user_settings.panes`, like the other reader settings.
- Wide screen with Page image On in the page view: the image on the left, the text on the right. The image column is 42 percent wide. The link "Open full size" is above the image and opens the route in a new tab.
- Phone width (below the `md` breakpoint of 768 px): two tabs "Text | Image" above the text. The first tab is Text. The tabs are 44 px high. No horizontal scroll bar appears at 390 px.
- A missing image or a load error shows "No page image available". A page with no agent translation (kendojidai_2014/p0839) shows "No agent translation yet" and its page image.
- The image is a plain `<img>` with `loading="lazy"`, `decoding="async"`, and `alt="Original page image, Page 48"`. The route can send the browser to another host, and `next/image` is made for fixed hosts `[agent inference]`. One line disables the lint rule `@next/next/no-img-element` with the reason.
- Page image is On by default since unit RC3 (round 66 answer 4). A reader who saved Off keeps Off. See open item 1.
- Unit default: the scroll view and focus mode show text only. See open item 2.
- Unit default: the image shows as it is in every theme (no color change). See open item 3.
- Unit default: the keys of the app come from the environment only. The file `viewer.config.json` does not hold them, because one of them is a secret.

#### 15.21.5 S2 and the research fields

- Step 1: the six fields of unit RC2 are `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, and `source_url` `[file: docs/VISION-viewer.md:2558]`. Unit RC3 adds eight keys (section 15.22.3). No screen reads one of them from `catalog_items.row`. The app reads `row.isbn` and `row.synopsis` only `[file: app/lib/pb.ts:524-526]`.
- The monitor tab Books shows the six fields. It reads the files of the Translator, not PocketBase `[file: app/lib/books.ts:77,97]` and `[file: app/lib/meta-fields.ts:11]`. The monitor is off on the deployed app. So S2 can drop the fields.
- Step 2: S2 builds `row` without the research keys (six in unit RC2, 14 since unit RC3). An `--apply` run compares the stored `row` with the new `row`. A record that holds a key gets an update, so one run cleans the records of an earlier run. The files in `item-metadata` keep all fields.
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

- Item 1: closed by unit RC3 (round 66 answer 4, "On in Page view (Recommended)"). Page image is On by default in the page view. A reader who saved Off keeps Off. The value is `image` in `READER_DEFAULTS` in `app/lib/htv-settings.ts`.
- Item 2: the scroll view and focus mode show text only. Option A (recommended): keep it. Option B: show the image in the scroll view too. That needs a lazy image for each of up to 1,000 pages.
- Item 3: dark themes show the image as it is. Option A (recommended): keep it, because the scan is gray. Option B: dim the image in the dark themes.
- Item 4: closed by unit RC3 (round 66 answer 6). S2 now drops `confidence_draft`, `notes_draft`, `hint_secondary`, `issue_evidence`, `status`, `title_en_source`, `author_en_source`, and `synopsis_source` too. See section 15.22.3.
- Item 5: in signed mode each page view asks for a new link, so the browser cannot reuse an image from an earlier visit. Option A (recommended): keep it (about 0.09 MB for each page). Option B: round `exp` to a 5-minute step so that the URL repeats.
- Item 6: the settings of the reader save 400 ms after the last change. A reload within that time loses the change. This is the behavior of unit RC1 for all reader settings.
- Item 7: closed by unit RC3 (round 66 answers 1 and 5). The button "Image" sits in the reader bar next to the View buttons. The Settings panel has no switch.

Status: built in unit RC2, owner check pending.

### 15.22 Reader pages code state (RC3, round 66)

- Source: owner answers of round 66 `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:27-36]`. Evidence tags: `[check: RC3 2026-10-29 HH:MM command]` marks a result of the unit. `[agent inference]` marks a guess. "Not verified" marks a fact without evidence.
- Scope: the button "Image" in the reader bar, the default On, 14 research keys in S2, and the approved flag in `pb_users.py`. Not in scope: the CamScanner mark on the scans (unit PC4) and the owner steps file (unit DP4).
- Answer 1, line 27, point 1: "Move the image outside of setting. It should be on the same bar as the view type".
- Answer 4, line 30: "On in Page view (Recommended)". Answer 5, line 31: "Add an Image button to the bar". Answer 6, line 32: eight more research keys. Answer 7, line 33: "Script approves its readers (Recommended)".
- Answer 8, line 34: the owner runs S2 once on port 8090 after RC3. Answer 10, line 36: "New link each view (Recommended)". The signed links did not change.
- The reading of answer 1 and 5 (the bar of the view type, not the Previous and Next bar) is a note of aki-main and waits for the owner check `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:40]`.

#### 15.22.1 The button Image in the reader bar

- File `app/components/ReaderBook.tsx`. The new function `ToolToggle` draws one button with `aria-pressed` and the classes of one option of `ToolSeg`. So it looks like the View buttons in every theme.
- The button sits in a `div` with `data-view-tools`, right of the View buttons. The `div` keeps both controls in one row when the bar wraps on a phone.
- A click saves `reader.image` through `save({ image: !s.image })`. This is the path of the other reader settings (PUT `/api/read/settings` after 400 ms).
- The button shows only if `index.images` is true. The web article has no page images, so it has no button.
- In the scroll view the button stays and is disabled. The title says "Page image shows in Page view only". Focus mode has no bar, so the question does not arise.
- The Settings panel has no "Page image" switch. The prop `hasImages` is gone. The Reset button sends `READER_DEFAULTS`, so it sets `reader.image` to true.
- The tabs "Text | Image" of unit RC2 did not change. They show on a phone while the image is On.

#### 15.22.2 Default On

- `READER_DEFAULTS.image` is `true` in `app/lib/htv-settings.ts`. The reader merges the saved settings over the defaults, so a reader who saved Off keeps Off.
- The check on port 8090 was read only. The `user_settings` collection has 2 records and 1 of them holds `reader.image`. The value is `false` and the account is `reader@kendo-translation.local`. That reader sees no image until the button is pressed `[check: RC3 2026-10-29 18:48 read8090.py, GET calls with a superuser token, no write]`.

#### 15.22.3 S2 and the 14 research keys

- `RESEARCH_FIELDS` in `app/scripts/sync-runs.mjs` has 14 keys. The six of unit RC2 are `sources`, `confidence`, `filled_by`, `confirmed_by`, `notes`, and `source_url`.
- Unit RC3 adds `hint_secondary`, `confidence_draft`, `notes_draft`, `issue_evidence`, `status`, `title_en_source`, `author_en_source`, and `synopsis_source`. The key `hint_secondary` holds the path of a file on the Mac of the owner.
- The monitor tab Books reads these keys from the files of the Translator. It does not read `catalog_items` `[file: app/lib/meta-fields.ts:8-12]` and `[file: app/lib/books.ts:77,97]`. The reader pages use `row.isbn` and `row.synopsis` only. Both stay.
- The test seeded `left_foot_full` with its full metadata row of 26 keys. That row holds 12 of the 14 keys. The dry run planned an update. After `--apply`, the 12 keys were gone and the other 14 keys kept the same values. The next dry run said "unchanged" `[check: RC3 2026-10-29 18:52 run_all.py s2research read hook]`.
- The `read` checks now test, for each of the 14 keys, that no `catalog_items` record holds it. They also test that no row holds the text `/Volumes/` or `/Users/`.
- Nobody ran S2 against port 8090. The owner decision is one run after the owner accepts RC3 (answer 8).

#### 15.22.4 pb_users.py and the approved flag

- `add --role reader` creates the account with `approved` true. `add` for a translator or an admin leaves `approved` as the PocketBase default (false).
- Unit default: `set-role <email> reader` also sets `approved` true, because the superuser names that person. A change to another role leaves `approved` as it is. Other option: `set-role` changes the role only, and an admin approves on `/admin/readers`.
- `list` shows the new column `approved` after `role`.
- A reader who signs up on the web page still has `approved` false and waits for an admin. The migration and the rules did not change.
- The script still prints no password and no token. A test runs `main()` with a fake `getpass` and searches the output.

#### 15.22.5 Test results

- `npx tsc --noEmit` and `npm run lint` in the copy: no error and no warning. `npm run build`: exit 0.
- `node scripts/contrast-dark.mjs`: 0 failures. The lowest pair of each theme did not change.
- `node scripts/smoke.mjs smoke`: 70 PASS. `htv` with files: 262 PASS. `htv` with PocketBase: 262 PASS. `deploy`: 34 PASS. `read`: 241 PASS (231 earlier and 10 new). All with 0 FAIL.
- `test_page_images.py`: 82 PASS. The hook checks on the PocketBase of the `read` run: 62 PASS. `test_local.py`: 232 PASS (219 earlier and 13 new).
- Chrome headless: 100 PASS, 0 FAIL (82 kept from RC2, 18 new, 4 RC2 checks removed or replaced). 48 screenshots.
- Contrast of the Image button, text on background, measured in the browser: Light 10.28 (pressed) and 15.84. High-contrast dark 16.21 and 21. Sepia 9.45 and 13.38. Solarized light 6.24 and 13.92. Solarized dark 9.02 and 13.92. The values equal those of the View buttons in each state.
- New screenshots: `image-button-p048-<theme>-1440x900.png` and `image-button-p048-<theme>-off-1440x900.png` for the five themes, `image-button-p048-phone-390x844.png`, `image-button-scroll-view-1440x900.png`, and `settings-panel-no-image-1440x900.png`.
- The tests ran in a copy of the app with a throwaway PocketBase on port 8092. The harness of unit RC2 gave `rd2` the state "not approved" by hand, because `pb_users.py` now approves readers.

#### 15.22.6 Not verified

- The owner check of the bar position (answer 1 and 5 reading).
- The button on a real phone, Safari, and Firefox.
- The button and the image on the deployed app.
- The effect of the CamScanner crop of unit PC4 on the page view.

#### 15.22.7 Open items

- Item 1: the Image button in the scroll view. Option A (recommended): keep it, disabled, with the title. Option B: hide it in the scroll view.
- Item 2: `set-role <email> reader`. Option A (recommended): approve the reader. Option B: leave `approved` as it is.
- Item 3: the account `reader@kendo-translation.local` saved Off earlier. Option A (recommended): the owner presses the button once. Option B: an admin removes `reader.image` from the saved settings of that account.

Status: built in unit RC3, owner check pending.

### 15.23 Reader dashboard, first-visit panel, and the front door (design, round 68)

- Source: owner answers of round 68 `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:60-69]`. This section is a design. It changes no code.
- Evidence tags: `[file: path:line]` marks a file that unit DV69 read. `[check: DV69 2026-10-29 HH:MM command]` marks a result of the unit. `[agent inference]` marks a guess. "Not verified" marks a fact without evidence.
- The checks on the local PocketBase (port 8090) used GET calls. The one POST was the sign-in for the superuser token. The scripts `q1.py` to `q7.py` sit in the folder `r69/DV69/` of the temp folder of the unit.
- Scope: the reader dashboard at `/read` (folds, progress, search), the first-visit panel, and the front door `/` of the hosted site.
- The monitor home and the config panel are in section 15.24 (round 70).
- A *work* is one dashboard row: a book folder, a magazine year, a web capture, or a web article. A *fold* is a row group under one heading.

#### 15.23.1 Owner words and older decisions

Round 68 answers (asked 19:47, answered 2026-10-29 20:47) `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:60-69]`:

- Answer 2, line 62, part A: "A. Reader home (Recommended)" `[accepted recommendation plus option C plus user typed 2026-10-29 20:47]`. Part C and the typed text are about the monitor home. They are in section 15.24.
- Answer 3, line 63: "Folds and search together" `[accepted option 2 2026-10-29 20:47]`.
- Answer 4, line 64: "/ opens the dashboard (Recommended)" `[accepted recommendation 2026-10-29 20:47]`.
- Answer 5, line 65: "Close only at Start reading (Recommended)" `[accepted recommendation 2026-10-29 20:47]`.
- Answer 9, line 69: "Run step 1 now (Recommended)" `[accepted recommendation 2026-10-29 20:47]`. Step 1 is this section. Step 2 is a code unit after the owner reads this section.

Notes of aki-main, not owner words `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:73-75]`:

- Line 73: one code unit builds folds and search.
- Line 74: on the hosted site, `/` shows the reader dashboard. The Mac keeps the monitor at `/` when the monitor is on.
- Line 75: the panel opens once per account. The reader can change several settings. "Start reading" or Esc closes the panel and saves the mark.
- The brief of unit DV69 adds two points that the Q-A file does not hold: visitors get a sign-in link, and translators keep `/translate`. Section 15.23.7 treats both as unit defaults with open items 5 and 6.

Older decisions that this design relies on:

- Line 50: "Few steps: two clicks from the dashboard to the text, and the reader resumes the last page on any device" `[accepted recommendation 2026-10-07 23:47]`.
- Line 80: "all users need sign in - 3 roles (reader - translator - admin) like in v1" `[user 2026-10-07 14:58]`.
- Lines 93 and 94: "Dashboard index, no text" `[accepted option 2026-10-07 23:47]`. The person sees work titles and translation progress and cannot open any text.
- Lines 190 and 191: "Reader picks first" `[accepted option 2026-10-07 14:58]`. The layout is saved "Per account, all devices".
- Line 208: "option 3. and dashboard homepage should be an index of all current items (in category folds)  and their translation progresses." `[user 2026-10-07 14:05]`.
- Line 210: "Every work, also at zero (Recommended)". Line 211: "Kind, then series or source (Recommended)". Line 212: "Finished share per language (Recommended)". The word on the Reader dashboard is now "translated" (round 70 answer 3).
- Line 213: "Finished" means a final `ED_3` text with a `QA_3` verdict `[validated reading 2026-10-07 20:05]`. Round 70 answer 3 `[user 2026-10-29 23:36]` replaced the rule for the Reader dashboard (/read). A page is translated when readers can view its English text (section 15.25).
- Lines 214 and 215: "All works, all languages (Recommended)", and search also covers romanized terms.

#### 15.23.2 Facts about the code before unit RC4 (RC1 state)

- (RC1 state.) `/read` shows a grid of cards, one card for each row of `catalog_items`, sorted by `item_id`. It has no folds and no search `[file: app/components/ReaderList.tsx:14-50]` `[file: app/lib/pb.ts:513]`.
- (RC1 state.) A card shows the EN title, the JA title, the author, the year, the page count, the synopsis with the AI note, and "Continue at Page N". An approved reader also sees "AI translation: N of M pages" `[file: app/components/ReaderList.tsx:21-43]`.
- (RC1 state.) N counts the pages that have reader text. The code reads every `reader_pages` record to count them `[file: app/lib/pb.ts:482-488]` `[file: app/lib/reader-data.ts:64-72]`.
- (RC1 state. Closed by unit RC4: the title is "Kendo droplet guard".) The card of the web article `18d4ac29` shows the title "Web article 18d4ac29" `[file: app/components/ReaderList.tsx:23]`. Its `pages` value is 0. So the progress line reads "AI translation: 1 of 0 pages" `[agent inference from app/components/ReaderList.tsx:18,38]`.
- An unapproved reader sees the cards and the line "Your account waits for approval by an admin." The progress line is hidden `[file: app/app/read/page.tsx:11-27]` `[file: app/components/ReaderList.tsx:38]`.
- `/read` needs a session. If no session exists, the app sends the visitor to `/sign-in?next=%2Fread` `[file: app/lib/htv-session.ts:39-49,63-65]`.
- (RC1 state. Unit RC4 changed the case of the monitor off, section 15.25.) `/` shows the runs table of the monitor. If the monitor is off, `/` redirects to `/translate` `[file: app/app/page.tsx:9-12]` `[file: app/lib/monitor.ts:20-26]`. The hosted site runs with `VIEWER_MONITOR=off` `[brief of unit DV69]`.
- (RC1 state. Unit RC4 changed the front door.) A visitor on the hosted site then reaches `/translate/sign-in`, because `requireStaff` uses the sign-in path of the translator side `[file: app/lib/htv-session.ts:14,55-60]`.
- The panel `Reading settings` holds Text, English text, View, Theme, English font, Japanese font, Size, Line height, Width, Focus mode, and Reset text settings `[file: app/components/ReaderSettingsPanel.tsx:63-95]`. The button Image sits in the reader bar `[file: docs/VISION-viewer.md:3264-3265]`.
- (RC1 state. Unit RC4 added the first-visit panel with Esc, section 15.25.) `showSettings` starts false. The panel has a button "Close" and no Esc handler. Esc leaves the focus mode only `[file: app/components/ReaderBook.tsx:91,149-155]` `[file: app/components/ReaderSettingsPanel.tsx:59]`.
- (RC1 state. Unit RC4 added `reader.panelSeen`.) The type `ReaderSettings` has no seen flag. `sanitizeReader` drops unknown keys `[file: app/lib/htv-settings.ts:160-172,188-206]`.
- `catalog_items` is readable by every signed-in user. The local PocketBase reports the list rule `@request.auth.id != ""` `[check: DV69 2026-10-29 20:58 q6.py, GET /api/collections/catalog_items]`.
- `reader_pages` is readable by an approved reader, a translator, and an admin `[file: data/scripts/pocketbase/pb_migrations/1793300007_v2_reader_collections.js:14,33]`.

#### 15.23.3 Reader dashboard at `/read`

##### 15.23.3.1 The works in the data

The metadata file holds more works than `catalog_items`. The table counts both `[check: DV69 2026-10-29 20:54 python3 -B read of items.filled.jsonl in the Translator]` `[check: DV69 2026-10-29 20:54 q1.py and q2.py, GET catalog_items]`. The table shows the state before unit RC4. After S2 runs, `catalog_items` holds 347 rows (section 15.25).

| Kind | Rows in `items.filled.jsonl` | Records in `catalog_items` | Missing |
|---|---|---|---|
| `book` | 25 | 25 | 0 |
| `magazine-year` | 9 | 9 | 0 |
| `web-capture` | 2 | 2 | 0 |
| `web-article` | 311 | 1 (`18d4ac29`, kind empty) | 310 |
| Total | 347 | 37 | 310 |

- The "36 book folders" of `book-slugs.json` are 25 books, 9 magazine years, and 2 web captures `[check: DV69 2026-10-29 20:54 same counts]`.
- The pages of the 36 folders add up to 13,278: books 5,067, magazine years 8,171, web captures 40 `[check: DV69 2026-10-29 20:55 q4.py, sum of catalog_items.pages]`.
- The 311 web articles have no page count. All 311 have the source `kendojidai.net`. Years: 2019 has 14, 2020 has 54, 2021 has 55, 2022 has 51, 2023 has 48, 2024 has 45, 2025 has 44 `[check: DV69 2026-10-29 20:54 python3 -B read of items.filled.jsonl]`.
- The first 8 characters of the 311 long IDs are all different. So `18d4ac29` can name the work `18d4ac29-12d5-4753-b032-35337361fee5` without a clash `[check: DV69 2026-10-29 20:57 python3 -B read of items.filled.jsonl]`.
- The record `18d4ac29` in `catalog_items` has an empty kind, an empty title, `pages` 0, and no `row`. The metadata row has the title_en "Kendo droplet guard", the title_ja 剣道飛沫ガード, and the year 2020 `[check: DV69 2026-10-29 20:54 q2.py and python3 -B read of items.filled.jsonl]`.

(RC1 state. Closed by unit RC4: the Reader dashboard lists 342 visible works.) The problem: line 210 says the dashboard lists every work, also at zero. Today a reader sees 37 works. The work "Kendo droplet guard" appears as "Web article 18d4ac29". The other 310 web articles do not appear. Open item 1 holds the options.

Magazine years have month chapters. `magazine_chapters` holds 103 records and 1,155 articles in total. Kendo Jidai 2014 holds 13 chapters: "Table of contents" (pages 1 to 22) and 12 months `[check: DV69 2026-10-29 20:54 q2.py, GET magazine_chapters]`. The brief of this unit said 1,157 articles. The count in the data is 1,155.

##### 15.23.3.2 Folds

The first level goes by kind (line 211). The second level goes by series or source (line 211). The files hold no series field, so the groups below come from fields that exist `[check: DV69 2026-10-29 20:54 key list of items.filled.jsonl]`.

- Books: Books is one fold of 22 works. `men_full` and `mental_full` are plain rows. The three `ogawa_lecture` parts stay as three rows in one fold `[check: RC4 smoke-folds.log:3,7,8]`. Round 69 answer 12 hides `men0`, `men1`, and `mental2_clean`.
- Kendo Jidai: one fold with 16 year folds, 2010 to 2025. A year fold holds the year volume row and the month folds. A month fold holds the article rows (round 69 answer 14, "Add article rows") `[check: RC4 smoke-folds.log:4,9,13]`.
- Web articles: they sit in the month folds of Kendo Jidai (round 69 answer 7). Every web article sits in the fold of its web year and month (round 83 answer 4, "Show web year", and round 84 answer 1, "Reading is right (Recommended)"). Old rule, replaced: a stamped article sat in its print month (round 70 answer 6, "Print month (Recommended)", section 15.36.4). The 2 web captures are hidden (round 69 answer 15).

The first level starts open. All deeper folds start closed. The folds use the HTML elements `details` and `summary`, so a keyboard works. A month loads its rows when it opens, and the link "Show this month" works without script `[check: RC4 smoke-read.log:56,62]`.

Example tree of the built Reader dashboard (342 visible works). Percent values are translated pages divided by pages `[check: DV71 2026-10-30 00:12 python3 -B calc.py]`. The fold lines use the full form of unit RC4b `[file: app/lib/reader-translated.ts:38]` `[check: RC4b 2026-10-30 00:45 unit report]`.

```
Books                         22 works   4,821 pages   English: 20 of 4,821 pages translated (0.4 percent)
  The Secret of Kendo and the Left Foot        120 pages   English: 6 of 120 pages translated (5.0 percent)
  One Hundred Practice Sessions                367 pages   English: 2 of 367 pages translated (0.5 percent)
  Etiquette and Manners in Kendo               176 pages   English: 0 of 176 pages translated (0.0 percent)
  > Lectures on Kendo, New Edition   3 works   533 pages   English: 4 of 533 pages translated (0.8 percent)
      ogawa_lecture_part1  281 pages  English: 0 of 281 pages translated (0.0 percent)
      ogawa_lecture_part2  150 pages  English: 2 of 150 pages translated (1.3 percent)
      ogawa_lecture_part3  102 pages  English: 2 of 102 pages translated (2.0 percent)
  Men: Kendo Hanshi 9th Dan Narazaki Masahiko (men_full)   354 pages   English: 0 of 354 pages translated (0.0 percent)
  Making the Difference on the Day: Mental Strengthening for Kendo (mental_full)   169 pages   English: 2 of 169 pages translated (1.2 percent)
  ... (the other books, in the same form)
Kendo Jidai (剣道時代)         320 works   8,482 pages   English: 8 of 8,482 pages translated (0.1 percent)
  > 2010   Kendo Jidai 2010 (July to December)   532 pages   English: 0 of 532 pages translated (0.0 percent)
  > 2012   Kendo Jidai 2012                      949 pages   English: 2 of 949 pages translated (0.2 percent)
  v 2014   Kendo Jidai 2014                    1,051 pages   English: 5 of 1051 pages translated (0.5 percent)
      > January 2014    pages 23-117    English: 0 of 95 pages translated (0.0 percent)
      v October 2014    pages 778-868   11 articles   English: 5 of 91 pages translated (5.5 percent)
          (11 article rows. Each row opens the first page of its article.)
      > December 2014   pages 948-1051  English: 0 of 104 pages translated (0.0 percent)
  > 2018   Kendo Jidai 2018 (January to April)   296 pages   English: 0 of 296 pages translated (0.0 percent)
      > September 2018   web articles only, no magazine pages
  v 2020   web articles
      v August 2020   web date 2020-08-17
          Kendo droplet guard (剣道飛沫ガード)   English: 1 of 1 page translated (100.0 percent)   [Start at Page 1]
  > 2019   web articles
  > 2025   web articles
  Hidden on this screen: men0, men1, mental2_clean, matsubara, morishima.
```

Notes on the tree:

- "v" marks an open fold and ">" marks a closed fold. The sketch opens two folds only to show the content.
- The Men and Mental folds of the first design are gone (round 69 answer 12, "Show only the full book"). `men0`, `men1`, and `mental2_clean` are hidden. `men_full` and `mental_full` are plain rows.
- History, replaced in round 73b answer 6: "Web articles count as 1 page each. The `pages` value of a web article stays 0 in `catalog_items`, so the button Image stays off for it `[file: docs/VISION-viewer.md:3267]`. The dashboard uses the denominator 1 for the kind `web-article` `[agent inference]`." This old statement contradicts section 12 (A4 rule, 40 characters by 36 lines, 1,440 characters per page). Rule now: a web article has as many pages as its A4 cut. The 311 web articles have 1,126 pages together (1 page: 6 articles, 2 pages: 36, 3: 100, 4: 116, 5: 39, 6: 10, 7: 3, 8: 1). Example: `d7835263` has 3 pages and `18d4ac29` has 1 page. The button Image stays off for a web article, because it has no page image. Owner words: "We talked about splitting article into A4 page right? Did you need do it for 2019->2025 kendojidai?" `[user 2026-10-30 15:35]` `[file: .opencode/reminders/qa/qa-memory-2026-10-30.md:87]` `[check: aki-main 2026-10-30 15:39 a4count.py]` `[check: DD73 2026-10-30 15:51 python3 -B a4count.py, 311 articles, 1126 pages]`. The code still counts 1 page for a web article. Unit RT73 fixes the code. Not verified: the `pages` value in `catalog_items` after the fix.
- The month rows come from `magazine_chapters`. October 2014 spans pages 778 to 868, which is 91 pages. The 5 translated pages p0794 to p0798 lie inside that range `[check: DV69 2026-10-29 20:54 q2.py and 20:55 q4.py]`.

##### 15.23.3.3 One row

A row holds the same facts as a card of unit RC1, in this order:

- The EN title as a link to the book screen `/read/<slug>`. The JA title below it in small type.
- The line: author, year, pages. A field that is empty does not show.
- The progress line: `English: N of M pages translated (P percent)`.
- One link to the text: "Continue at Page N" if the account has a saved place, else "Start at Page N" with N as the first translated page. A work without a translated page and without a saved place has no link to the text. The title link opens the book screen. Any page opens, also a page with no translated text.

Worked rows from the local data `[check: DV69 2026-10-29 20:55 q1.py and q4.py]`:

- `left_foot_full`: "English: 6 of 120 pages translated (5.0 percent)". The translated pages are p046 to p050 and p075. "Start at Page 46".
- `kendojidai_2014`: "English: 5 of 1051 pages translated (0.5 percent)". The translated pages are p0794 to p0798. "Start at Page 794".
- `etiqu1_full`: "English: 0 of 176 pages translated (0.0 percent)". No link to the text. The title link opens the book screen.
- `day_breath_clean`: "English: 0 of 207 pages translated (0.0 percent)" and "Continue at Page 154". The account `reader@kendo-translation.local` saved page 154 `[check: DV69 2026-10-29 20:54 q2.py, GET reader_progress]`.

The progress of a language is the translated pages divided by the pages of the work, times 100, with one decimal. Only English has an agent translation today. A line for ZH, KO, or VI appears when that language arrives (line 185). Round 70 answer 3 closed open item 2. The word is "translated", and a page counts when readers can view its English text.

##### 15.23.3.4 Who sees what

- Visitor who is not signed in: no dashboard. `/read` sends the visitor to `/sign-in?next=%2Fread`. Line 80 says every person signs in, and the list rule of `catalog_items` needs a session. Open item 5 holds the other option.
- Unapproved reader: the dashboard index with titles and progress, and no text (line 93). A row has no link to a page. The title link opens the book screen with the note "The text opens after approval." `[file: docs/VISION-viewer.md:2540]`.
- Approved reader, translator, admin: full rows, links to the text, and search in the page text.
- RC1 state: the progress line was hidden for an unapproved reader, because the counts came from `reader_pages`. Unit RC4 reads the counts from `catalog_items` (round 69 answer 9). Not verified: whether a reader who waits for approval sees the progress line on port 8090.

##### 15.23.3.5 Clicks from the dashboard to the text (two for a book, three for a web article)

The row link goes straight to the text, so a reader never needs the book screen. The path holds at most one closed fold for a book or a year volume, and two for a web article.

- `left_foot_full`: the fold Books is open and the work is a plain row. Click 1: "Start at Page 46". The text opens.
- `kendojidai_2014`: click 1 opens the year fold 2014. Click 2: "Start at Page 794".
- "Kendo droplet guard": click 1 opens the year fold 2020. Click 2 opens August 2020. Click 3: "Start at Page 1". Round 70 answer 7 `[accepted recommendation 2026-10-29 23:36]` "Accept 3 clicks, use search (Recommended)" `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:122]`.
- A search result is one click away from the text (section 15.23.4).

#### 15.23.4 Search

Search runs together with the folds (round 68 answer 3). One search box sits at the top of the dashboard. A search is a GET form to `/read?q=seme`. The server draws the result list, so the page needs no script `[unit default]`.

What the search covers (lines 214 and 215 and round 68 answer 3):

- Titles: `title_en`, `title_ja`.
- Authors and metadata: `author_en`, `author_ja`, `publisher`, `publish_year`, and the synopsis.
- Page text: the JA text and the EN agent translation of every page that has reader text, with the captions.
- Romanized terms: the EN text keeps them, for example "Seme". Each row also gets the romaji of its marked terms (see below).

The human versions are not searched in the first version `[unit default]`. They sit in `own_translations` (private) and `reader_versions` (admin choice).

Where the term data lives:

- The termbase in the Translator: `data/termbase/termbase.draft.jsonl` with 1,030 entries `[file: translator data/scripts/translator/termbase.py:3]` `[check: DV69 2026-10-29 20:55 python3 -B read of termbase.draft.jsonl]`. The entry `c-1b485180497d` has the headword 攻め, the romaji "Seme", and the kana form せめ. The entry `c-47155949e7b9` has the headword 中墨 and the romaji "Chūzumi". 294 entries have a romaji with a diacritic mark.
- The term pop-up data of unit RC1 in the Viewer: the column `terms` of `reader_pages` holds the entries that the page cites. The type `TermEntry` has `headword`, `readings`, and `romaji` `[file: app/lib/htv-types.ts:75-82]`. The marks of each row (`jaMarks`, `edMarks`) hold the `entryId` and the JA surface `[check: DV69 2026-10-29 20:58 q6.py, left_foot_full/p048 row L01-L05]`.

Worked examples on the 29 pages that have reader text `[check: DV69 2026-10-29 20:55 q3.py, GET reader_pages with the filter operator ~ on the column rows]`:

- "seme" finds 10 pages in 3 works: `left_foot_full` (p046, p047, p048, p075), `kendojidai_2014` (p0794 to p0798), and `100_practice_full` (p067). The EN line of `left_foot_full` p048 starts "I keep applying Seme without letting my Kensen leave the Ai-te's Chūzumi (centerline)," and the JA line starts わたしは剣先を相手の中墨から外さず攻めつづけ、.
- 攻め finds the same 10 pages. The query 攻 finds 11 pages, one more in `sumiss_train_full` (p096).
- "chuzumi" without the macron finds 0 pages in the filter test. "Chūzumi" finds 2 pages: `left_foot_full` p048 and p049. So the search must fold the macron (see below).
- "kendo" must find "Kendō". The EN line of `left_foot_full` p046 reads "In Kendō (the way of the sword), Kamae (stance) ↓ Seme-ai (union of pressure)" `[check: DV69 2026-10-29 21:01 q7.py]`. The filter test with "kendo" did not run, so the claim that it fails is Not verified.
- 3 rows have the term mark 攻め in the JA text and no "Seme" in the EN text, for example `kendojidai_2014` p0797: 突き心で攻めて相手の崩れを誘う `[check: DV69 2026-10-29 21:01 q7.py]`. The romaji of the marks lets "seme" find them. This is a design step that the EN text alone cannot do `[agent inference]`.
- The query "seme" on the column `terms` finds 17 pages, not 10. The column holds the definition text of cited entries, so it also matches pages that only cite an entry whose definition names Seme `[check: DV69 2026-10-29 20:55 q3.py]`. The search must not use `terms`.

Fold rule, applied to the text and to the query `[agent inference]`: lowercase, remove the accent marks (macrons), remove the hyphen. Example: "aite" finds "Ai-te's". The JA text is not changed.

Result list:

- One result is one page. It shows the work title, the page number, a snippet of about 140 characters with the hit marked, and the link `/read/<slug>?view=page&at=pNNN`. Example link: `/read/left_foot_full?view=page&at=p048`.
- Order: works that match by title or author come first. Page hits follow, by work and then by page number. There is no score.
- The list holds 20 results for each screen, with a link "Next".
- An unapproved reader gets titles and metadata only, and the note "Page text search opens after approval." The PocketBase rule for `reader_pages` enforces this.

Search engine options are in open item 4. Size facts: the 29 reader pages hold 871,431 bytes as JSON, which is 30,049 bytes for each page. The JA and EN text alone is 3,383 bytes for each page. For 13,278 pages that is about 399 MB for the full records and about 45 MB for the text alone `[check: DV69 2026-10-29 20:57 q5.py]` `[agent inference for the 13,278 pages]`. The brief of this unit used 0.78 MB for 29 pages. The sum measured here is 0.87 MB.

#### 15.23.5 Text sketches

Desktop, 1440 px wide. The reader bar is the one of today.

```
All books   Human translation   Readers   Human versions            reader@kendo-translation.local (reader)  [Sign out]
---------------------------------------------------------------------------------------------------------------------
Reader dashboard
[ Search titles, authors, and text (seme, Chūzumi, 攻め)                                        ] [Search]
342 works, 13,303 pages. English: 28 of 13,303 pages translated (0.2 percent).

v Books      22 works  4,821 pages  English: 20 of 4,821 pages translated (0.4 percent)
  +-----------------------------------------------------------------------------------------------------------+
  | The Secret of Kendo and the Left Foot                           剣道の極意と左足                              |
  | Mitsuru Kobayashi · 2017 · 120 pages                                                                      |
  | English: 6 of 120 pages translated (5.0 percent)                              [Start at Page 46]            |
  +-----------------------------------------------------------------------------------------------------------+
  | Etiquette and Manners in Kendo                                  剣道の礼法と作法                              |
  | Takenori Baba · 2020 · 176 pages                                                                          |
  | English: 0 of 176 pages translated (0.0 percent)                                                            |
  +-----------------------------------------------------------------------------------------------------------+
  > Lectures on Kendo, New Edition      3 works  533 pages  English: 4 of 533 pages translated (0.8 percent)
> Kendo Jidai   320 works  8,482 pages  English: 8 of 8,482 pages translated (0.1 percent)
  (the 311 web articles sit in the year and month folds of Kendo Jidai)
```

Phone, 390 px wide. One column. A row has full width. A tap target has at least 44 px. A progress line of a fold wraps on a phone, so the sketch shortens it.

```
+------------------------------------+
| All books  Human translation  [≡]  |
+------------------------------------+
| Reader dashboard                   |
| [ Search            ] [Search]     |
| 347 works. English: 0.2 percent    |
|                                    |
| v Books                            |
|   22 works · 4,821 pages           |
|   English: 20 of 4,821 translated  |
| +--------------------------------+ |
| | The Secret of Kendo and the    | |
| | Left Foot                      | |
| | 剣道の極意と左足                  | |
| | Mitsuru Kobayashi · 2017       | |
| | 120 pages                      | |
| | English: 6 of 120 pages        | |
| | translated (5.0 percent)       | |
| | [ Start at Page 46 ]           | |
| +--------------------------------+ |
| > Kendo Jidai                      |
|   320 works · 8,482 pages          |
+------------------------------------+
```

Search results, desktop, for "chuzumi" (design target, see the fold rule):

```
Search: chuzumi        2 pages in 1 work                                               [Clear search]
The Secret of Kendo and the Left Foot · Page 48
  ...without letting my Kensen leave the Ai-te's [Chūzumi] (centerline), and if I think the Ai-te has even a...
The Secret of Kendo and the Left Foot · Page 49
  ...without letting the trajectory of the Shinai leave the [Chūzumi], the left line functions effectively. I take...
```

#### 15.23.6 First-visit panel

The panel is the settings panel of today in a first-visit mode (round 68 answer 5: "Close only at Start reading (Recommended)").

When it opens:

- The panel opens on the first text screen of any book, for an account without the seen mark. A text screen is a page in the Page view or the Scroll view with `at` set. The book screen does not open it.
- A reader who waits for approval never reaches a text screen (`at` is null for that reader `[file: app/app/read/[slug]/page.tsx:58]`). The panel opens after approval.
- The panel opens once for each account. The mark is saved per account, so it holds on every device (line 191).

What it holds:

- The title "Reading settings" and every control of today. These are Text, English text, View, Theme, English font, Japanese font, Size, Line height, Width, Focus mode, and Reset text settings. Replaced in round 73c answer 4 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:110`), see 15.26.6.4: Text and English text leave the panel, and the panel starts with the component list.
- One line: "Use the Image button in the bar above the text to show or hide the page image." The line shows only for a work with page images. The web article has no Image button `[file: docs/VISION-viewer.md:3267]`. Replaced in round 73c answer 4 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:110`), see 15.26.6.4: a web article now has the Original text button, and the panel names it.
- The button "Start reading". It replaces the button "Close".

How it closes:

- Only the button "Start reading" or the Esc key closes the panel. A change of a setting does not close it. The cog in the bar does not close it.
- Both actions save the mark. The other changes of the reader are saved by the current path (PUT `/api/read/settings`, 400 ms after the last change `[file: docs/VISION-viewer.md:3248]`).
- If the reader leaves the page without the button, the mark is not saved. The panel opens again at the next visit. The settings that the reader changed stay saved.
- If the focus mode is On when Esc comes, the first Esc closes the panel. A second Esc leaves the focus mode `[unit default]`.

Where the seen mark lives:

- The proposed field is `reader.panelSeen`, a boolean in the key `reader` of `user_settings.panes`. The key `reader` holds under 400 bytes today, so one more field fits `[file: docs/VISION-viewer.md:2803]`.
- The type `ReaderSettings` and `sanitizeReader` need the field. `READER_DEFAULTS` must not hold it. Else the button "Reset text settings" sends `panelSeen: false` and the panel opens again `[file: app/components/ReaderSettingsPanel.tsx:90]`.

Accounts that exist `[check: DV69 2026-10-29 20:54 q2.py, GET users and user_settings]`:

- `reader@kendo-translation.local` (reader, approved) has a saved `reader` key with 7 values: focus, fontJa, image, index, text, view, width. The value `image` is `true` now. Unit RC3 recorded `false`. So the owner pressed the button Image since then.
- `wenqian@kendo-translation.local` (translator, approved) has no `user_settings` record. A translator can read, because READ_OK includes the translator role. The panel opens once for this account.
- `translator@kendo-translation.local` has a record with no panes. `admin@kendo-translation.local` has no record. Both see the panel once.
- Three test readers are not approved. They see the panel after approval.
- Unit default: no account gets the mark by data change. Every approved account sees the panel once. Open item 9 holds the other option.

Phone: the settings panel is a sheet at the bottom with a height up to 85 percent of the screen `[file: app/components/ReaderSettingsPanel.tsx:56]`. In the first-visit mode the button "Start reading" stays at the bottom of the sheet, at least 44 px high. The Chrome check at 390 x 844 decides if the sheet must be lower, so that the reader sees the text change `[unit default]`.

Desktop sketch (the panel sits at the right edge, 320 px wide, as today):

```
+----------------------------------------------------------------+------------------------------+
| All books  Book page  Human translation          reader (reader)| Reading settings            |
|                                                                 |                              |
| The Secret of Kendo and the Left Foot                           | TEXT                         |
| [Page view][Scroll view]  [Image]  [cog]                        | [English][Japanese][Pairing] |
|                                                                 | ENGLISH TEXT [Agent][Human]  |
| Page 48                                                         | VIEW  [Page view][Scroll]    |
| I keep applying Seme without letting my Kensen leave the        | THEME [Light][Dark][Sepia]...|
| Ai-te's Chūzumi (centerline), and if I think the Ai-te has      | SIZE: 18 px  ---o-------     |
| even a slight opening, ...                                      | LINE HEIGHT: 1.7  --o----    |
|                                                                 | WIDTH [Narrow][Wide]         |
|                                                                 | FOCUS MODE [Off][On]         |
|                                                                 | [Reset text settings]        |
|                                                                 | Use the Image button in the  |
|                                                                 | bar above the text to show   |
|                                                                 | or hide the page image.      |
|                                                                 | [ Start reading ]            |
+----------------------------------------------------------------+------------------------------+
```

Phone sketch (a sheet over the lower part of the text):

```
+------------------------------------+
| All books  Book page          [≡]  |
| Page 48   [Page][Scroll] [Image]   |
| I keep applying Seme without       |
| letting my Kensen leave the        |
+====================================+
| Reading settings                   |
| TEXT [English][Japanese][Pairing]  |
| THEME [Light][Dark][Sepia]...      |
| SIZE: 18 px  ----o---------        |
| ...                                |
| Use the Image button in the bar    |
| above the text to show or hide     |
| the page image.                    |
| [        Start reading        ]    |
+------------------------------------+
```

#### 15.23.7 Front door `/`

Round 68 answer 4: "/ opens the dashboard (Recommended)". The hosted site runs with the monitor off. The Mac runs with the monitor on, and the monitor keeps `/` there (line 74). The monitor home design is in section 15.24 (round 70).

Where `/` goes on the hosted site (monitor off), by role `[unit default]`:

| Person | `/` goes to | Then |
|---|---|---|
| Visitor, not signed in | `/sign-in` | After sign-in, a reader goes to `/read`. A translator or an admin goes to `/translate` `[file: app/app/sign-in/page.tsx:27]`. The page holds the link "Create an account" to `/sign-up` `[file: app/components/HtvSignIn.tsx:58]`. |
| Reader, not approved | `/read` | The dashboard with titles and progress, and the note that the account waits for approval. |
| Reader, approved | `/read` | The dashboard. |
| Translator | `/translate` | The human-translation-view. The bar of the dashboard holds the links "All books" and "Human translation" `[file: app/components/ReaderBar.tsx:21-34]`. |
| Admin | `/translate` | Same as the translator, plus the admin links. |

On the Mac (monitor on): `/` shows the Monitor dashboard for every role (section 15.24). Today it shows the runs table. The code of `/` has no session check `[file: app/app/page.tsx:9-12]` `[file: app/lib/htv-session.ts:10]`. The dashboard opens by the address `/read`.

Mechanism options (open item 7). The default is the redirect:

- Option A, redirect (recommended): `/` stays a route without a page of its own. A function in `app/lib/monitor.ts` replaces `requireMonitorOrTranslate`. It reads the session with `getSession()` and calls `redirect()` to `/sign-in`, `/read`, or `/translate`.
- Option B, render: `/` draws the dashboard when the monitor is off.

The session code is in `app/lib/htv-session.ts`: `getSession` (lines 27-33), `requireSession` (39-49), `requireStaff` (55-60), `requireReaderSession` (63-65), and `isSafeNext` (76-78).

#### 15.23.8 Plan for the code unit (step 2, built in units RC4 and RC4b, see 15.25)

Files to change in the Viewer by the plan (all under `app/` unless a path says more). Section 15.25 lists the files that unit RC4 changed:

- `app/app/page.tsx` and `app/lib/monitor.ts`: the front door.
- `app/app/read/page.tsx`: the heading "Reader dashboard", the search box, and the query `q`.
- `app/components/ReaderList.tsx`: rewritten as folds. New `app/lib/reader-folds.ts` (a pure function from cards to a tree, tested without PocketBase). New `app/components/ReaderSearch.tsx` if the box needs a client part.
- `app/lib/reader-data.ts`, `app/lib/pb.ts`, `app/lib/reader-types.ts`: card fields (kind, source, year, translated pages), the search query.
- `app/lib/htv-books.ts:24-26`: the translator book list reads all rows of `catalog_items`. If S2 copies 347 rows, the list at `/translate` grows from 37 to 347 rows. The list must keep the 36 folders and the works that have a run. The owner decided this in round 61 answer 6 `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:266]`. Built: `/translate` stays at 37 rows `[check: RC4 smoke-tolerance.log:17]`.
- `app/lib/htv-settings.ts`, `app/components/ReaderSettingsPanel.tsx`, `app/components/ReaderBook.tsx`: the first-visit panel and `reader.panelSeen`.
- `app/scripts/sync-runs.mjs`: see below. A new migration file after `1793300009_v2_reader_rules.js` in `data/scripts/pocketbase/pb_migrations/`. Built: `1793300010_v2_dashboard_fields.js`.
- `app/scripts/smoke.mjs`: new checks. The old check "Book list: the card shows 'AI translation: 6 of 120 pages'" (line 1458) must change to the new progress line. Unit RC4 changed this check (smoke-read.log:50).
- `app/README.md` (line 462 and the section "Settings and themes") and the table of `reader.*` keys in this file (line 2795).

What S2 must change:

- Copy all 347 rows of `items.filled.jsonl` into `catalog_items`. The header of `sync-runs.mjs` says the 311 web articles stay out (lines 7-8). The slug of a web article is the first 8 characters of the long ID. Unit RC4 built this. S2 now uploads 347 rows (section 15.25).
- Write the translated pages of each work into `catalog_items` (open item 3), for example `translated` = `{"en": [46, 47, 48, 49, 50, 75]}`. Unit RC4 first named the field `finished`. Unit RC4b renamed it to `translated` in the migration file `[file: data/scripts/pocketbase/pb_migrations/1793300010_v2_dashboard_fields.js:7,31,64]` `[check: RC4b 2026-10-30 00:45 unit report]`.
- Write search columns (open item 4).
- Keep `pages` at 0 for web articles.
- The dry run must stay safe: compare, then skip or update, and never delete.

New tests:

- Smoke mode `read`: the 2 first-level folds with counts (22 and 320 works). The rows "English: 6 of 120 pages translated (5.0 percent)", "English: 5 of 1051 pages translated (0.5 percent)", and "English: 0 of 176 pages translated (0.0 percent)". The unapproved reader gets progress and no link to a page.
- Search: "seme" gives 10 pages in 3 works. "Chūzumi" and "chuzumi" both give `left_foot_full` p048 and p049. "kendo" finds p046. 攻め gives 10 pages. An unapproved reader gets no page hit.
- Front door: `/` sends a visitor to `/sign-in`, a reader to `/read`, and a translator to `/translate`, in signed mode. With the monitor on, `/` shows the Monitor dashboard.
- First-visit panel: the panel is present when `panelSeen` is missing. It stays open after a change. The button "Start reading" and Esc close it and save the mark. "Reset text settings" keeps the mark. The panel is absent at the next visit.
- Chrome checks at 1440 x 900 and 390 x 844. They test the click paths of section 15.23.3.5, the fold buttons by keyboard, the panel on both sizes, and screenshots in the five themes. `node scripts/contrast-dark.mjs` must show 0 failures for the new elements.
- S2: a dry run plans 310 new `catalog_items`. A second run says "unchanged".

#### 15.23.9 Open items (decided in rounds 69 and 70, see section 15.25)

- Item 1: the 310 web articles that `catalog_items` lacks. Example: the metadata row `d7835263-fe16-4f05-8c51-98b2a8aa0a3e` ("How do elite swordsmen hit men? : Hojo Masaomi", 2019) is not on the dashboard today. Line 210 says every work, also at zero.
  - Option A (recommended): S2 copies all 347 rows. Benefit: the dashboard matches line 210, and the title of `18d4ac29` becomes "Kendo droplet guard", which closes the open item about its empty title. Cost: 310 more records, a change in `htv-books.ts` so that `/translate` keeps its 37 rows, and a code unit for S2 with a slug rule.
  - Option B: the dashboard lists the 37 works of today. Benefit: no S2 change. Cost: it breaks line 210, and a reader sees 1 web article of 311.
  - Option C: S2 copies the 347 rows and the dashboard shows the web articles as one closed fold with counts only. Benefit: a short page. Cost: the reader cannot find an article without search.
- Item 2 (closed by round 70 answer 3, the word is now "translated"): the old word "finished". Line 213 says: "Finished" means a final `ED_3` text with a `QA_3` verdict. S2 gives reader text to a page from the run of the admin mark, or else from the newest `PASS` run. The code says "A page with only FAIL runs gets no record" `[file: app/scripts/sync-runs.mjs:10,628-662]`. Example: `kendojidai_2014` p0839 has one run and the verdict is FAIL (`20261026T205441Z-r41`). The reader sees "No agent translation yet" there `[file: docs/VISION-viewer.md:3201]`. The admin run mark is the only other source of reader text, and the local `run_marks` collection holds 0 records `[check: DV69 2026-10-29 20:55 q4.py, GET run_marks]`. A second example: `mental_full` p014 has a PASS run (`20261026T195046Z-r41`) and a newer FAIL run (`20261028T023007Z-r41`). The reader sees the PASS text `[check: DV69 2026-10-29 20:55 q4.py, GET page_runs]`. Replaced in round 75 answer 3: S2 gives reader text only from a run that the admin opened (section 15.28.2). In the example of `mental_full` p014, the reader sees the PASS text only while the admin keeps the PASS run open.
  - Option A (recommended): translated = the page has reader text. `kendojidai_2014` shows 5 of 1051 pages (0.5 percent). Benefit: the number matches what the reader can open. Cost: line 213 needs new words after the owner agrees.
  - Option B: translated = a page with any `QA_3` verdict, also FAIL. `kendojidai_2014` shows 6 of 1051 pages (0.6 percent). Benefit: it counts all agent work. Cost: the link "Start at Page 839" opens a page with no text.
  - Option C: show both numbers, "5 translated, 1 failed". Benefit: nothing is hidden. Cost: more noise on each row, and a reader sees the word "failed".
- Item 3: progress for an unapproved reader. Line 94 says that person sees translation progress. Today the count comes from `reader_pages`, which that reader cannot read. Example: the test reader `new-reader-1793312884055@rc1-test.local` (not approved) sees no progress line `[file: app/components/ReaderList.tsx:38]`.
  - Option A (recommended): S2 writes the translated pages into `catalog_items` (readable by every signed-in user). Benefit: one request gives all counts, for every role, also for 13,278 pages. Today the code lists every `reader_pages` record in pages of 500 `[file: app/lib/pb.ts:144,482-488]`. Cost: a new field, a migration, and S2 must run after each new page run.
  - Option B: keep the count from `reader_pages` and hide the progress for an unapproved reader, as today. Benefit: no S2 change. Cost: it breaks line 94.
- Item 4: the search engine. Example: "chuzumi" must find "Chūzumi" on `left_foot_full` p048 and p049, and "kendo" must find "Kendō".
  - Option A (recommended): S2 adds text columns to `reader_pages`: the plain JA text, the plain EN text, and a folded copy (lowercase, no macron, no hyphen, plus the romaji of the marked terms). The search uses the filter operator `~` on these columns. Benefit: the fold rule works. The snippet comes from the same record. The rule READ_OK blocks an unapproved reader without new code. Cost: a migration, S2 code, and about 5 KB more for each page, which is about 68 MB more for 13,278 pages `[agent inference]`. The speed of the `~` scan over 13,278 pages is Not verified.
  - Option B: the filter `~` on the current column `rows`. Benefit: it works today without a migration (10 pages for "seme" in the test). Cost: no fold rule, because "chuzumi" finds 0 pages. The column also holds JSON keys such as `part`, so a query like "part" matches every page `[agent inference]`.
  - Option C: an index in the memory of the Next server. Benefit: fast scan and any fold rule. Cost: the hosted site runs on Vercel `[file: app/lib/config.ts:10]`. The memory does not persist between requests, so the index loads at each cold start (about 45 MB) `[agent inference]`. Not verified on the deployed app.
- Item 5: a visitor who is not signed in. Brief: "visitors get a sign-in link". Line 80 says every person signs in. Example: a first-time visitor to `/` sees only the sign-in page.
  - Option A (recommended): `/` sends the visitor to `/sign-in`, which holds the link to `/sign-up`. Benefit: no rule change. Cost: a visitor cannot see which works exist before sign-up.
  - Option B: open the list rule of `catalog_items` to anyone, so the dashboard shows titles and progress to visitors. Benefit: a visitor sees the 347 works first. Cost: the metadata is public (the 14 research keys are already stripped), and line 80 changes.
- Item 6: a translator or an admin at `/` on the hosted site. Brief: "translators keep `/translate`". Example: `wenqian@kendo-translation.local` (translator) opens `/` and lands on `/translate`.
  - Option A (recommended): `/` sends a translator or an admin to `/translate`. Benefit: it matches the sign-in route of today `[file: app/app/sign-in/page.tsx:27]`. Cost: this person reaches the dashboard by the link "All books".
  - Option B: `/` sends every role to `/read`. Benefit: one rule, as the answer text says. Cost: a translator needs one more click to reach `/translate`.
- Item 7: the mechanism for `/`.
  - Option A (recommended): redirect. Benefit: one address for the dashboard (`/read`), and the bar, the sign-in `next` list (`isSafeNext`), and the smoke checks stay as they are. Cost: the address bar never shows `/` for a signed-in person.
  - Option B: render the dashboard at `/`. Benefit: the address stays `/`. Cost: `Nav.tsx:19` and `isSafeNext` must learn that `/` is a reader route when the monitor is off, and two routes draw one page.
- Item 8: works that share one title. Example: `mental_full` and `mental2_clean` both read "Making the Difference on the Day: Mental Strengthening for Kendo" with 169 pages. `men0`, `men1`, and `men_full` read "Men: Kendo Hanshi 9th Dan Narazaki Masahiko" with 11, 66, and 354 pages. `ogawa_lecture_part1` to `part3` read "Lectures on Kendo, New Edition" `[check: DV69 2026-10-29 20:54 q1.py]`.
  - Option A (recommended): one fold for each shared title, with a row for each folder named by its slug. Benefit: this is the "series" level of line 211, and the rows stay as the 36 folders of round 63 answer 9. Cost: the fold hides no work, but the owner must say if `men0` is part of `men_full`.
  - Option B: a flat alphabetical list inside Books. Benefit: no guess about series. Cost: the reader sees the same title two or three times with no hint why.
- Item 9: the panel for accounts that exist. Example: `reader@kendo-translation.local` has 7 saved values and the role reader.
  - Option A (recommended): every approved account sees the panel once at its next text screen. Benefit: no data change, and the owner sees the panel at once. Cost: `reader@` sees a panel that it does not need.
  - Option B: a script sets `panelSeen` to true for the accounts that have a saved `reader` key. Benefit: `reader@` is not interrupted. Cost: a write to the local PocketBase and to the hosted one, and the owner does not see the panel with that account.
- Item 10: the depth of the magazine folds. Example: October 2014 holds 11 articles in `magazine_chapters`.
  - Option A (recommended): stop at the month row. Benefit: the page stays short, and progress per month needs only the page ranges. Cost: the reader cannot jump to an article from the dashboard.
  - Option B: add an article row below each month (1,155 articles). Benefit: a title-level index, as in a print table of contents. Cost: a long page, and the articles have only draft EN titles (`title_en_status` "draft").
- Item 11: where the 2 web captures go. Example: `matsubara` ("Matsubara Teruyuki", 15 pages) and `morishima` ("Tateo Morishima, Kendo Hanshi", 25 pages) have the kind `web-capture` and have page counts.
  - Option A (recommended): a fold "Web captures" under Web articles. Benefit: the kind name from the data stays visible. Cost: the first level has the label "Web articles" for a work that has pages.
  - Option B: a fourth first-level fold "Web captures". Benefit: a clear kind. Cost: the first level grows to four folds, and the owner asked for books and articles (line 211).

#### 15.23.10 Not verified

- The speed of the filter `~` over 13,278 pages. The test ran on 29 pages.
- The deployed app on Vercel: the front door, the memory behavior of an index, and the cookie flow.
- The panel and the folds on a real phone, Safari, and Firefox.
- Whether `men0`, `men1`, and `men_full` are parts or copies of one book, and whether `mental2_clean` is a copy of `mental_full`.
- The query "kendo" against the column `rows`. The claim that it misses "Kendō" follows from the "chuzumi" result `[agent inference]`.
- The size of 310 more `catalog_items` records.
- Lines 2540 and 2547 of this file describe the unapproved reader and the 37 cards of unit RC1. They stay as the history of that unit and carry the tag "(RC1 state)". Unit RC4 built section 15.23 (see section 15.25).

Status: design, accepted by the owner (round 69 answer 6).

### 15.24 Monitor dashboard and config panel (design, round 70)

- Source: owner answers of round 68 and round 69 `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:60-113]`. Unit DM70 wrote this section. It is a design. It changes no code. Unit DF72 (round 72) updated the lines about Run, Resume, Pause, and the store folder after round 70 answers 11 and 12 and round 71 answers 7 to 10.
- Evidence tags: `[file: path:line]` marks a file that unit DM70 read. `[check: DM70 2026-10-29 HH:MM command]` marks a result of the unit. `[agent inference]` marks a guess. `[unit default]` marks a choice of the unit. "Not verified" marks a fact without evidence.
- The unit read files only. It started no process, called no model, and spent 0 USD. The script `facts.py` in the folder `r70/DM70/` of the temp folder of the unit prints the numbers of this section.
- Scope: the Monitor dashboard (`/` on the Mac), the book detail view, the config panel, and the resume path. It also covers the files that the Viewer reads and writes. Translator code is out of scope. Unit TR70 writes the Translator side of the same contract.
- Names: the *Monitor dashboard* is the page `/` on the Mac. It lists books. The owner calls it "Monitor Home". The *Reader dashboard* is `/read` (section 15.23). The *config panel* is the page `/settings/run`. The *settings file* is `translator-settings.json` in the folder `config` of the Translator.
- Two counts differ. The Monitor dashboard counts pages done by a run, with any verdict. The Reader dashboard counts translated pages, that is, pages that readers can view. Section 15.24.4.3 gives one example.
- New words in this section, each defined at first use:
  - *book row*: one dashboard row for one book.
  - *Needs attention*: the group of books that do not go on alone.
  - *derived row*: a book row built from old list folders.
  - *heartbeat*: a time stamp that a live run writes at short intervals.
  - *stop reason*: the cause that a run writes when it ends.

#### 15.24.1 Owner words and older decisions

Round 68 (asked 19:47, answered 2026-10-29 20:47) `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:60-69]`:

- Answer 2, line 62, option C and the typed text, verbatim: "A. Reader home (Recommended), C. Monitor home /, * Monitor Home:\n\n  * Similar to Reader Home, but for monitoring the agent running process (phase 4)\n  * Note that the agent will run async for each book:\n\n    * We are not running each book fully one-by-one\n    * We may run any book - at anytime - resuming from the latest stopping point of that book\n    * The monitor home will show the running status of each book: what is running? what was stopped? When? Errors? and so on" `[accepted recommendation plus option C plus user typed 2026-10-29 20:47]`.
- Answer 6, line 66, the typed part, verbatim: "B5 memory pairs (Recommended), B1 neighbor link rule (Recommended), Agent Process Running config: for monitor view, I should be able to change the value of the hyper-parameters of the running process, including N. Create a config panel that I can update the config values as needed" `[accepted two recommendations plus user typed 2026-10-29 20:47]`.

Round 69 (asked 21:14, answered 2026-10-29 21:49) `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:79-101]`:

- Answer 8, line 87, verbatim: "Next time be clear Reader Dashboard or Monitor Dashboard\nWhat finished? where?" `[user 2026-10-29 21:49]`. This section always names the screen, says what a number counts, and says where it shows.
- Answer 16, line 95, verbatim: "Option 1. Theses are part of the UI UX desgin. Implement them with optimal UI UX in mind, as intuitive and clear information as possible" `[user 2026-10-29 21:49]`. This is the main quality bar of this section.
- Answer 17, line 96: "Per-book store, design first (Recommended)" `[accepted recommendation 2026-10-29 21:49]`.
- Answer 18, line 97: "N (Recommended), Model and effort per level (Recommended), Box critic model (Recommended), Cost limit per page (Recommended), Jobs and book jobs (Recommended), Critic mode (Recommended), Memory and link constants, Call timeout and retries" `[accepted options 2026-10-29 21:49]`. All eight groups go into the config panel.
- Answer 19, line 98: "New settings file, next page (Recommended)" `[accepted recommendation 2026-10-29 21:49]`.
- Answer 20, line 99, verbatim: "Option 1. Name them agent-phase-2/3/4" `[user 2026-10-29 21:49]`. The phase keys are "agent-phase-2", "agent-phase-3", and "agent-phase-4".
- Answer 21, line 100: "Reading right (Recommended)" `[accepted recommendation 2026-10-29 21:49]`. The deploy waits for these parts:
  - The Reader dashboard with search, the first-visit panel, the front door, the Monitor dashboard, and the config panel are built and accepted.
  - Phase 2 is finished with prompt rewrites.
  - Phase 3 is tested on the first 20 pages of one book and watched in the Monitor dashboard.
- Answer 11, line 90: "Reading right (Recommended)" `[accepted recommendation 2026-10-29 21:49]`. The front door redirect is for the hosted site. With the monitor on (the Mac), `/` keeps the monitor (section 15.23.7).

Phase words of the owner, round 35 answer 1 `[user 2026-10-25 02:53]` `[file: kendo-translation-translator/docs/drafts/translator-design.md:2549]`, verbatim: "+ Phase 2 using the paired dataset right? why is the training set on 40 article? there are more than 300\n+ Phase 3. Warm Initialization:  should be the warm intialization of the whole networks for a target book. Given the first 20 pages, the systems run  optimization for the whole network (TS to QA, freeze disabled), in self-supervised manner (no label) update signal come from judge feedback.\n+ Phase 4. Production run: Start from the beginning of the target book with phase 3 updated system. Follow same self-supervised optmization process, but with freeze enabled, gradually freeze model update."

- Phase 2 runs on the paired dataset (web articles with human English). It does not run on one target book.
- Phases 3 and 4 run on one target book. Phase 4 starts at the beginning of the book.
- The prompts update in phases 2 and 3. In phase 4, the box types stop updates one by one `[file: kendo-translation-translator/docs/VISION.md:245]`.

Older decisions that bind this design:

- The monitor is desktop only `[file: docs/VISION-viewer.md:334]` `[file: docs/VISION-viewer.md:2493]`.
- Translator pages and the monitor default to the theme Light. Solarized light is the default on reader pages only (round 64 answer 3) `[file: .opencode/reminders/qa/qa-memory-2026-10-28.md:332]`.
- The hosted site runs with the monitor off `[file: docs/VISION-viewer.md:3365]`. Monitor routes give "not found" there `[file: app/lib/monitor.ts:7-9,28-31]`.
- The monitor has no sign-in `[file: app/README.md:165]`. The pause button is the only write of the monitor under the Translator folder `[file: app/lib/runs.ts:135-140]`.
- The bar "professional book reading website", clear and intuitive, applies to the monitor (line 315).
- The process of round 42 answer 9 applies `[file: .opencode/reminders/qa/qa-memory-2026-10-26.md:85]`. The owner states a need and aki-main restates it. The owner validates. A docs unit writes the design. A code unit builds it.

Notes of aki-main, not owner words `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:111-113]`:

- Line 111: unit DM70 writes this design with a strong UI and UX focus. Code follows after the owner checks the design.
- Line 112: the memory and link constants and the call timeout and retries need Translator code that reads them from the settings file.
- Line 113: the phase key values are "agent-phase-2", "agent-phase-3", and "agent-phase-4".

#### 15.24.2 Facts about today

Viewer `[check: DM70 2026-10-29 21:59 cat -n of the files named below]`:

- `/` shows the runs table. It has one row for each list folder. The columns are List, Kind, State, Pages, Calls, Failed, Flagged, Cost (models), Cost (listed), Started, and Updated `[file: app/components/RunsTable.tsx:27-37]` `[file: app/app/page.tsx:9-12]`.
- The table polls `/api/runs` every 3000 ms while one row runs or pauses `[file: app/components/useLive.tsx:4,20-25]` `[file: app/components/RunsTable.tsx:12]`. A failed poll is silent `[file: app/components/useLive.tsx:15-18]`.
- The time helper `dateTime` shows the time of the browser without a zone name `[file: app/lib/format.ts:8-13]`. Changed in round 81 answers 17 and 18 (`qa-memory-2026-11-02.md:22,23`): every time shows PST. Unit VW77b1 built PST on the Lists tab, the run view, and the page check date (round 81, accepted in round 82 answer 8). See sections 15.34.6 and 15.35.6.
- The state colors cover running, paused, completed, done, completed with failures, failed, interrupted, and waiting `[file: app/components/Pills.tsx:3-12]`. A pill has color and a word.
- The pause button writes the file `PAUSE` into one list folder. It accepts a list in the state running or paused `[file: app/lib/runs.ts:141-170]`. The route refuses a foreign Origin. It does not check the Host header `[file: app/app/api/pause/route.ts:15-19]`.
- The Books tab lists the 36 books of `book-slugs.json` and adds any ID that has run folders `[file: app/lib/books.ts:38-104]`.
- The file reader accepts paths inside `<T2>/data` only `[file: app/lib/safe-path.ts:6-17]` `[file: app/lib/config.ts:132-136]`. The folder `<T2>/config` lies outside. So the settings file needs one new path rule.
- The tabs are Runs, Books, and Human translation `[file: app/components/Nav.tsx:8-13]`. The dark theme switch sits in the same bar `[file: app/components/Nav.tsx:42]`.

Translator `[check: DM70 2026-10-29 22:00 grep and python3 -B read of the Translator files]`:

- Three list folders exist: `20261026T182511Z`, `20261028T023006Z`, and `20261029T051152Z`. The folder `data/pilot-run/books/` does not exist `[check: DM70 2026-10-29 22:08 python3 -B facts.py]`.
- No file holds a phase key, a process ID, or a heartbeat. The code has no `getpid`, no `heartbeat`, and no `"phase"` key `[check: DM70 2026-10-29 22:00 grep -rn 'getpid\|heartbeat\|"phase"' in translator_run.py and translator/*.py]`.
- `progress.json` is written after each call event, atomically `[file: data/scripts/translator/progress.py:5,246-252]`. A list in the state running shows the warning "no update" after 600 s `[file: data/scripts/translator/progress.py:304-305]`.
- A call times out after 1500 s `[file: data/scripts/translator/launcher.py:17]`. A call makes at most 2 attempts `[file: data/scripts/translator_run.py:526]`. The longest call of the T7 pages took 414.8 s (`ED_0` of `left_foot_full/p048`) `[check: DM70 2026-10-29 22:08 python3 -B facts.py]`.
- Ctrl-C ends a chain list with the state "interrupted" and exit code 130. The program prints the resume command `[file: data/scripts/translator_run.py:2142-2146,2173-2177]`. Not verified: what a killed process leaves. The code has no handler for a kill signal.
- `run-chain --resume LISTDIR` works for one list folder. It reuses the stored mode, jobs, book jobs, and cost limit `[file: data/scripts/translator_run.py:1945-1953]`.
- A QA_3 FAIL does not stop a chain any more (round 51 answer 1) `[file: data/scripts/translator_run.py:1904-1906]`. A resume reopens a chain that an older session stopped on a QA_3 FAIL `[file: data/scripts/translator_run.py:1918-1919]`.
- The program reads `config/translator-models.yaml` with `load_config_for` at the start of each page run. The function sits at line 1318. The calls sit at lines 1372 and 1578 `[file: data/scripts/translator_run.py:1318,1372,1578]`.
- `jobs` is the count of calls in parallel inside one page. `book_jobs` is the count of books in parallel. `max_usd` is a cost limit for each page. The help texts say so `[file: data/scripts/translator_run.py:6088-6090]`. A page stops with "cost guard" when the limit is reached `[file: data/scripts/translator_run.py:278-283]`.
- `run.json` holds the keys page, levels, critic, critic_mode, jobs, max_usd, started_utc, models, and voyage. It holds no settings block `[check: DM70 2026-10-29 22:08 python3 -B facts.py]`.
- Today's values: N is 2 (`config/translator-models.yaml:664-665`). The models are in `level_0` (line 275), `level_1` (285), `level_2` (295), `level_3` (307), and `box-critic` (372). `MEMORY_K` is 3 `[file: data/scripts/translator/book_memory.py:31]`. `JOIN_PAGE_END` is true (line 47). `WINDOW_LINES` is 1 `[file: data/scripts/translator/programs.py:341]`. `NEIGHBOR_SKIP_CITES` is 5 (line 354).
- Today N only sets the marks "reached N" in `summary.json`. The note in the file says: "reached N, an update point would start here. The run program has no update step yet." No freeze code exists. A comment about K = 3 sits in `config/translator-models.yaml:593`.

Real data `[check: DM70 2026-10-29 22:08 python3 -B facts.py]`:

- The 3 list folders hold 12 books. 11 of them are in `book-slugs.json`. The 12th is the web article `18d4ac29`. The other 25 slugs never ran.
- The table gives the numbers that a derived row shows. Pages done counts pages in the state done. Times are local PDT.

| Book | Pages done | Cost (models) | Page time | Lists | Last page end |
|---|---|---|---|---|---|
| `left_foot_full` | 6 of 120 | $22.16 | 413.6 min | 3 | Oct 29 00:50 |
| `kendojidai_2014` | 6 of 1051 | $15.77 | 269.0 min | 2 | Oct 27 21:46 |
| `mental_full` | 2 of 169 | $5.48 | 102.3 min | 2 | Oct 27 19:56 |
| `100_practice_full` | 2 of 367 | $4.61 | 99.0 min | 1 | Oct 26 14:26 |
| `eiga_full` | 2 of 204 | $3.27 | 66.9 min | 1 | Oct 26 14:03 |
| `sumiss_train_full` | 2 of 142 | $4.05 | 80.1 min | 1 | Oct 26 13:54 |
| `ogawa_lecture_part3` | 2 of 102 | $3.66 | 71.1 min | 1 | Oct 26 13:20 |
| `kendojidai_2012` | 2 of 949 | $3.88 | 91.9 min | 1 | Oct 26 13:16 |
| `lifelong_full` | 2 of 279 | $3.70 | 81.4 min | 1 | Oct 26 12:50 |
| `ogawa_lecture_part2` | 1 of 150 | $3.73 | 76.3 min | 1 | Oct 26 12:25 |
| `men0` | 1 of 11 | $2.14 | 44.0 min | 1 | Oct 26 12:09 |
| `18d4ac29` | 1 of unknown | $1.51 | 25.3 min | 1 | Oct 26 11:50 |

- The sum of the cost column is $73.95. It equals the sum of the three lists: 46.026293 + 19.623303 + 8.296852.
- T7 chain, list `20261029T051152Z`, `left_foot_full` p046 to p050. All 5 pages are done with QA_3 PASS. The cost is 8.296852 USD and the list ran 9517.7 s (158.6 min). 26 memory pairs exist. The critique counts are TL 13, ED 17, QA 3, and TS 1 against N = 2.
- Retry: `kendojidai_2012/p350`, run `20261026T191803Z-r41`. The box TL_0 made 2 attempts. Try 1 ended with `"reason":"length"` and 62292 reasoning tokens (`raw/TL_0.try1.jsonl`). Try 2 passed. The page cost 2.509567 USD, took 3520.0 s, and got QA_3 PASS 9.5.
- Critic failure: list `20261026T182511Z`, page `ogawa_lecture_part2/p089`. The state is "completed with failures". The text is `box-critic.TS_3: invalid JSON: Expecting ',' delimiter: line 1 column 913 (char 912)`. The file is `data/pilot-run/ogawa_lecture_part2_p089/20261026T185029Z-r41/failed/box-critic.TS_3.json`.
- FAIL verdict: `kendojidai_2014/p0839`, run `20261026T205441Z-r41`. QA_2 and QA_3 are FAIL. The page cost 4.379641 USD and took 4491.5 s.
- Stop by an old rule: list `20261028T023006Z` (started Oct 27 19:30 PDT) holds 3 chains. The chain `mental_full` has the state "stopped: QA_3 FAIL on mental_full/p014". The pages p015 to p018 stay in the state waiting. The list cost 19.623303 USD. `left_foot_full` appears in 3 separate list folders today.

#### 15.24.3 Users and tasks

The user is one person: the owner, in the admin role, at the Mac. The screen is desktop only. The owner asks an opencode agent to run a book. The agent reads the mark that the Monitor dashboard writes (round 70 answer 11). He runs any book at any time and comes back after hours. He needs to know in seconds if a run needs him.

Tasks, in order of how often they happen `[agent inference]`:

1. Look at the state of all books after an absence.
2. Find out why a book stopped and when.
3. Mark a book to resume from its last stop. Also mark a book to restart. A restart archives the run and runs the whole book again from page 1 (round 73e answer 9, round 74 answers 7 to 9, section 15.27.4).
4. Pause a book or a list that costs too much.
5. Change a run value, for example N or a model, while a book runs.
6. Mark a book that never ran to start.
7. Check the cost and the time of one book.

The Monitor dashboard must answer these questions, in this order. Each question has one place on the screen.

1. Does any book need me now? The group Needs attention answers. It sits at the top. It always shows, also when empty.
2. What runs now, on which page and box, and is it alive? The group Running answers. Each row shows page, box, and the time of the last sign of life.
3. What is stopped, since when, and why? The group Stopped answers (round 76 answer 4, the group Paused is gone). The row text holds the cause and the next page in words. A book with a Run or Resume mark that no process picked up yet sits in the group Waiting for a run.
4. What is the last error, in words? The second line of the row shows the error text.
5. How far is each book, and which page comes next? The progress bar and the text "Next page" answer.
6. What did the book cost, and how long did it take? Two columns answer.
7. Which phase does the book run? One column answers.
8. Which books never ran? The closed group Not started answers.

#### 15.24.4 Monitor dashboard (`/` on the Mac)

##### 15.24.4.1 Layout and groups

- One screen shows the overview. A summary line sits at the top. Groups follow. A group is a heading and a list of book rows.
- The summary line counts the groups in one sentence. It also shows the model cost of all books. Example: "1 needs attention · 0 waiting for a run · 0 running · 11 stopped · 0 completed · 25 not started". The reader sees the whole state before the first row.
- The order of the groups is: Needs attention, Waiting for a run, Running, Stopped, Completed, Not started (round 76 answer 4, `.opencode/reminders/qa/qa-memory-2026-11-01.md:7`, the group Paused is gone). The group Waiting for a run is new (round 73b answer 4, `.opencode/reminders/qa/qa-memory-2026-10-30.md:85`, "New group"). Reason: exceptions come first because a stopped book wastes time at every minute. A book with a Run or Resume mark comes second, because the owner pressed a button and waits for an opencode agent to start the process. Live work comes third because it needs a look and no action. Stopped books wait for the owner, also a book that the owner paused. Completed and Not started books need nothing. The name "Waiting for a run" and the position after Needs attention are unit defaults of DD73 `[agent inference]`. Other name: "Mark waiting". Other position: after Running. Benefit of that position: live work stays second. Cost: a mark that nobody picked up sits below the live rows, and the owner can miss it. A Restart mark puts the book row in this group too (round 73d answer 4, `.opencode/reminders/qa/qa-memory-2026-10-30.md:132`). Round 74 answer 5: a book that a box stopped sits in the group Needs attention until the owner presses Resume or Restart (section 15.27.4).
- Needs attention and Running always show. When empty they show one line: "Nothing needs attention." and "Nothing runs now. The last list ended Oct 29 00:50 PDT (21 h ago)." An empty group that disappears makes the owner doubt the page.
- Waiting for a run, Stopped, and Completed show when they hold a row. Not started shows always, closed. Example: the group Waiting for a run shows no heading while no book holds a mark `[unit default of DD73, agent inference]`. Other option: it shows always, with the line "No mark waits." as Running does. Benefit: the layout never jumps. Cost: one more empty group on the screen.
- Needs attention, Waiting for a run, Running, and Stopped start open. Completed and Not started start closed. A group uses the HTML elements `details` and `summary`, so the keyboard works without script `[unit default]`. The browser keeps the open state of each group, like the checklist of the extra items `[file: app/components/extras-store.ts:4-7]`.
- Inside a group, the newest event comes first. Not started books sort by slug.
- The tab title shows the count of the group Needs attention, for example "(1) Monitor dashboard". The owner sees a problem from another tab.
- The bar holds five tabs: Monitor dashboard (`/`), Lists (`/runs`), Books (`/books`), Run settings (`/settings/run`), and Human translation. The Lists tab keeps the old runs table, one row for each list folder. Reason: the column "Cost (listed)" and the list counts still help when the owner audits one list.

##### 15.24.4.2 States and the exact rules

A *state label* is a symbol and a word. Color is never the only sign. The symbols differ in shape.

Plain meaning of each label:

- Running: a process works on the book now.
- Running with pause requested: the owner asked for a pause. The process finishes the current page (forward boxes, critic and critique steps backward, memory write), then ends. Label renamed in round 81 answer 23 (`qa-memory-2026-11-02.md:28`). Old label: Running, pause requested.
- Stopped by a Pause (the old label Paused, merged into Stopped by round 76 answer 4, `qa-memory-2026-11-01.md:7`): the process ended on purpose after the page that it finished at the pause. Resume writes a mark (round 71 answer 10). Between the mark and the first sign of the process, the row shows the state Mark waiting: "Mark waiting: Resume requested HH:MM" (round 72 answer 17, `.opencode/reminders/qa/qa-memory-2026-10-30.md:45`). The row moves into the group Waiting for a run (round 73b answer 4, `.opencode/reminders/qa/qa-memory-2026-10-30.md:85`, "New group"). Example: the owner presses Resume on `mental_full` at 10:42. The row leaves Needs attention and shows "Mark waiting: Resume requested 10:42" in the group Waiting for a run. The row leaves the group at the first sign of the process, and the book goes to Running. A Run mark shows "Mark waiting: Run requested HH:MM" in the same group (unit default of DU73, accepted in round 73b answer 2, `qa-memory-2026-10-30.md:83`). A Restart mark shows "Mark waiting: Restart requested HH:MM" in the same group `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 5, "Short mark row text"). Old text, replaced in round 74 answers 5 to 11: the row text named a box ("Mark waiting: Restart ED_2 requested HH:MM", round 73d answer 4) and the button sat on the flag of the box. Other text: "Mark waiting: Restart (prompts: start) requested HH:MM". Benefit of the other text: the row shows the prompt choice. Cost: a longer row. Example: the owner presses Restart on the book row of `left_foot_full` at 10:42. The row shows "Mark waiting: Restart requested 10:42" in the group Waiting for a run. A mark waits while the book folder holds `request.json` `[file: <T2>/data/scripts/translator/store.py:246-250]` `[agent inference]`.
- Stopped: the process ended on purpose. The cause is a Pause or a Ctrl-C (round 76 answer 4). The row names the cause, the time, the last saved page, and the page where Resume starts. After a Pause: "Stopped by Pause at 16:40. Last saved page p080. Resume starts at p081." After Ctrl-C: "Stopped by Ctrl-C at 16:40. Page p080 was not saved. Resume starts at p080." The end of the target page set gives Completed.
- Stopped unexpectedly: the file says "running", but the process is gone or silent.
- Stopped by failure: the run ended because of a failure or a rule. The book does not go on alone. A box with 3 double REJECTs in a row stops the whole book after the page is saved, with the stop reason "rule" (round 74 answer 5). The owner presses Resume to continue with the next page, or Restart to archive the run and run the book again from page 1.
- Completed: the book reached the target of its phase.
- Not started: no run for this book exists.

| Label | Group | Rule when `status.json` exists | Rule for a derived row |
|---|---|---|---|
| ● Running | Running | `state` is "running". The pid is alive. The heartbeat is not older than 120 s. | The newest list that holds the book is in the state "running". The chain of the book is "running", or a page of the book is "running". `updated_epoch` is not older than 1800 s. |
| ● Running with pause requested | Running | A file `PAUSE` exists in the book folder. The state is still "running" until the current page ends. | Same as Running. The file `PAUSE` exists in the list folder. |
| ■ Stopped, cause Pause | Stopped | `state` is "stopped". `stop_reason` is "pause" `[unit default DZ75]`. The process ended after the page, so no process lives. The code of TB71 wrote `state` "paused". TR77c (2f07ce9) writes "stopped" with `stop_reason` "pause" `[file: <T2>/data/scripts/translator/store.py:102-127]`. | The list state is "paused". The gate of an old list waits before each call, so the process lives. The label is Running with pause requested (round 81 answer 23), in the group Running `[unit default DZ75]`. |
| ■ Stopped, cause Ctrl-C | Stopped | `state` is "stopped". `stop_reason` is "ctrl-c". The end of the target page set gives `state` "completed" (TB71 `run-book`). | The list is final. The chain is "completed", "interrupted", or "stopped: interrupted". No page of the book has a forward failure. |
| ▲ Stopped unexpectedly | Needs attention | `state` is "running" in the file. The pid is gone, or the heartbeat is older than 120 s. | The list is "running". `updated_epoch` is older than 1800 s. |
| ▲ Stopped by failure | Needs attention | `state` is "stopped". `stop_reason` is "forward-failure", "cost-guard", or "rule". The reason "rule" also covers a box with 3 double REJECTs in a row (round 74 answer 5). | The chain state starts with "stopped:" and is not "stopped: interrupted". |
| ✓ Completed | Completed | `state` is "completed". All pages of the phase target are accepted. | Never. See the note below. |
| ○ Not started | Not started | `state` is "not-started". | No list folder holds the book, and no `status.json` exists. |

Notes on the rules:

- The word "alive" means the pid answers a check with signal 0. The check sends no signal. Another process can reuse a pid, so the rule adds the heartbeat check `[agent inference]`.
- The limit 120 s is four heartbeats of 30 s `[agent inference]`. The heartbeat must come from a thread that does not wait for a model call. A call can last 1500 s `[file: data/scripts/translator/launcher.py:17]`.
- The limit 1800 s for derived rows is the call timeout 1500 s plus 300 s `[agent inference]`. The old warning at 600 s `[file: data/scripts/translator/progress.py:304-305]` is too short. A retried call took 771.1 s in the run of `kendojidai_2012/p350` `[check: DM70 2026-10-29 22:00 python3 -B read of calls.jsonl]`. Between 600 s and 1800 s, a Running row shows the warning "No update for N min. A long call can take 25 min."
- A critic failure does not move a book to Needs attention. Example: `box-critic.TS_3` on `ogawa_lecture_part2/p089`. The chain went on. The row shows the error text in red. The summary line has no error count (round 81 answer 21, `qa-memory-2026-11-02.md:26`). Needs attention means that the book does not go on without the owner.
- A QA_3 FAIL does not move a book to Needs attention. The chain goes on (round 51 answer 1). The row shows "1 FAIL page" when the data holds it.
- A derived row is never Completed. The old lists hold test lists of 5 pages, not the target of a phase. Example: `left_foot_full` shows 6 of 120 pages after a completed list of 5 pages. The row says "Stopped at p050: the list finished".
- Pages done counts pages in the state "done" in `progress.json`. A page is done when its calls and critic calls all ended without a failure. The QA_3 verdict can be PASS or FAIL.

##### 15.24.4.3 One book row

A row has two lines. Line 1 holds the facts in fixed columns. Line 2 holds one sentence in words. Reason: the left edge shows the state first, so the eye scans for the symbol. The sentence explains what the symbol means.

Line 1, from left to right:

1. State label, for example "▲ Stopped by failure".
2. Title in English and the slug in a mono font, for example "Making the Difference on the Day (`mental_full`)". The title comes from the item metadata `[file: app/lib/books.ts:107-111]`. The slug stays if no title exists.
3. Phase, for example "Phase 3" with the owner words "warm initialization", or "Phase 4" with "production run". A pilot row shows an empty phase cell (round 81 answer 22, `qa-memory-2026-11-02.md:27`). Old text: it showed "Phase not stored".
4. Progress: a bar and the text "5 of 20 pages". The bar has a text next to it and the role `progressbar` with values. The count is pages done of the pages in the phase target. Phase 3 has 20 pages. Phase 4 has all pages of the book.
5. Cost: "$8.30". It counts the model cost (`cost_usd_models`) of the book in the current phase. For a derived row it counts all list folders.
6. Time: "159 min". It is the sum of the page times, with no pauses. It is not the clock time between start and end.
7. Actions: the buttons of section 15.24.4.5.

Line 2 is a sentence. Examples with real data:

- "Stopped at p014: QA_3 FAIL (old rule). Oct 27 19:56 PDT, 2 days ago. Next page: p015."
- "Stopped at p050: the list finished. Oct 29 00:50 PDT, 21 h ago. 3 list folders. Next page: not stored."
- "Now: p051, box TL_2. Running since Oct 29 21:12 PDT (54 min). Last sign of life 4 s ago."
- "No update for 12 min: the process is gone. Last page done: p050."

A third line shows only when an error text exists. It is red and it names the page, the box, and the text. It never cuts the text. A link opens the file. Example: "Error on p089, box `box-critic.TS_3`: invalid JSON: Expecting ',' delimiter: line 1 column 913 (char 912)".

What each number counts, and where it shows:

- "Pages done" counts pages that a run finished, on the Monitor dashboard. The Reader dashboard (`/read`) shows "translated" pages, which are pages with reader text `[file: docs/VISION-viewer.md:3462]`.
- Example: `kendojidai_2014` has 6 pages done on the Monitor dashboard: p0794 to p0798 and p0839. The Reader dashboard shows 5 of 1051 pages, because p0839 has a QA_3 FAIL and no reader text `[file: docs/VISION-viewer.md:3458,3724]`.
- "Cost" counts what the models charged. It does not count Voyage `[file: data/pilot-run/lists/20261029T051152Z/progress.json, key cost_models_usd]`.

##### 15.24.4.4 Phase 2

Phase 2 runs on the paired dataset. The paired dataset holds web articles with human English. The owner wrote that it holds more than 300 articles (quote in 15.24.1). A phase 2 run has no book, so it has no book row.

- The dashboard shows one closed line below Not started: "Phase 2 (paired dataset): no run record yet." The line stays until the Translator writes a phase 2 record. Round 80 answers 22 to 24: the row shape for phase 2 is an open item (section 15.33.8).
- Reason: no phase 2 run exists. The Translator has no phase key and no command for it `[check: DM70 2026-10-29 22:06 sed of build_parser in translator_run.py]`. A made-up row shows invented data.
- Open item 7 holds the options for the later shape.

##### 15.24.4.5 Actions

- Pause. A row of a book in the state Running has the button "Pause" (round 70 answer 12: "Each book with running process has a Pause button. When click, the running process finishing the process (forward and backward) for current page and stop the process." [user 2026-10-29 23:36]). The button writes the file `PAUSE` in the book store folder (round 71 answer 10: "Reading right (Recommended)" [accepted recommendation 2026-10-30 02:37]). The process finishes the current page, then ends. An old list folder keeps one pause file for the list. One list can hold several books. Example: list `20261028T023006Z` holds `mental_full`, `left_foot_full`, and `kendojidai_2014`.
  - A list with one book pauses at once, with no dialog. The action is reversible. Replaced in round 74 answer 12 (`.opencode/reminders/qa/qa-memory-2026-10-31.md:38`) `[reading pending owner check]`: the button Pause opens a confirm dialog also for one book (section 15.27.2).
  - A list with more than one book in the state Running opens a dialog (sketch 5 shows a similar dialog). The dialog names every book that will wait. Item 3 of section 15.24.11 holds the decision for one pause file per book.
- Resume of a book that stopped by a Pause. The process ended at the pause, so no process lives to read a change. The button "Resume" writes a mark `request.json` in the book store folder, like "Run" (round 70 answer 11, round 71 answer 9). The owner asks an opencode agent. The agent runs `translator_run.py marks` and then the printed `run-book` command. The command deletes the file `PAUSE` at its start. Draft DM70: the button deleted the pause file `[file: app/components/PauseButton.tsx:24-39,52]`.
- Resume of a stopped book. The button "Resume" writes a mark `request.json` with the action "resume" and the phase. A confirm dialog opens first (round 74 answer 12, section 15.27.2). No command shows. Section 15.24.7 holds the flow. Draft DM70: the button "Resume…" opened a dialog with the exact command and a button "Copy command".
- Start of a book that never ran. The button "Run" writes a mark `request.json` with the action "run" and the phase "agent-phase-3". Draft DM70: the button "Start…" opened a dialog with the command. Round 74 answer 12: the button "Run" opens a confirm dialog first (section 15.27.2).
- Next phase. A Completed book of phase 3 shows the button "Run phase 4" `[unit default]`. The button writes a mark with the phase "agent-phase-4". Phase 4 starts at the beginning of the book (owner quote). Draft DM70: the button "Start phase 4…" opened a dialog. Round 74 answer 12: the button "Run phase 4" opens a confirm dialog first (section 15.27.2).
- Details. The title and the button "Details" open the book detail view (section 15.24.5).
- A button is disabled with a reason in words. Example (the pid is made up): "Resume is off because this book runs now (pid 4821)". The button Restart sits on the book row and in the Details view only (round 74 answer 11, `.opencode/reminders/qa/qa-memory-2026-10-31.md:37`). No Restart button sits on a stopped-box flag. Resume and Restart differ (round 73d answer 4, `.opencode/reminders/qa/qa-memory-2026-10-30.md:132`, owner question "What is the different between Restart and Resume again?"). Owner words, round 73e answer 9 (`.opencode/reminders/qa/qa-memory-2026-10-31.md:12`): "Resume mean continue the whole book\nRestart mean archive the current run, and run the whole book from the first page." Resume continues the whole book. Its button sits on the book row, and the run starts at the next page after the last accepted page (section 15.24.7). After Resume, the double REJECT count of a stopped box goes back to 0 (round 74 answer 6). Restart moves the run files into `<T2>/data/book-store/<book>/archive/<run ID>/` and runs the whole book from page 1 in the same phase (round 74 answers 7 and 9). A box with 3 double REJECTs in a row stops the whole book after the page is saved (round 74 answer 5). Replaced in round 74 answers 5 to 11: the old text of this line let one stopped box restart alone, with a button on the flag of the box. Section 15.27 holds the rules and the confirm dialog. Round 80 answer 13 (`qa-memory-2026-11-01.md:135`): the Run and Resume buttons are grayed out on a Running row, with a reason in words (section 15.33.3).

##### 15.24.4.6 Time, refresh, and the empty, first-load, and error states

- Time. Each time shows in PST (UTC-8) all year, with the word PST, then the relative time (round 80 answer 19, `qa-memory-2026-11-01.md:141`, section 15.33.2). Old text and example: local time with the zone name, "Oct 29 00:50 PDT (21 h ago)". The PDT times in the examples of this section are old examples. The tooltip and the detail view show the UTC stamp of the file, for example "2026-10-29T07:50:31Z" `[file: data/pilot-run/lists/20261029T051152Z/progress.json, key updated_utc]`. Round 81 answers 17 and 18 (`qa-memory-2026-11-02.md:22,23`) extend PST to the Lists tab `/runs` and the run view `/runs/<stamp>`. They extend it to the Reader dashboard `/read` and the book screens `/read/<slug>` too (section 15.34.6).
- Relative time: under 1 min "just now", under 60 min "N min ago", under 48 h "N h ago", else "N days ago". The relative text updates every 30 s in the browser, with no request.
- Refresh. The page polls every 3000 ms while the tab is visible (round 81 answer 24, `qa-memory-2026-11-02.md:29`: "Every 3 s in a visible tab (Recommended)"). Old text: it polled only while one row was Running or Pause requested, as today `[file: app/components/useLive.tsx:4]`. Before round 81, with no live row, the page loaded once, and the owner used the button "Refresh" or came back to the tab. Now the page polls with no live row too `[unit default DZ80]`. The poll stops while the tab is hidden (round 81 answer 24).
- The header shows "Updated 22:06:12 PDT (3 s ago)". After 3 failed polls, a banner shows: "The Viewer server does not answer. This page shows the data from 22:06:12 PDT." The banner goes away at the next good poll. Today a failed poll is silent. Round 80 answer 19: the header time shows in PST too (section 15.33.2). The PDT times in this example are old text.
- First paint. The server sends the rows with the page, as today `[file: app/app/page.tsx:11]`. No spinner shows at the first load. A route change shows grey placeholder rows.
- Empty. If no list folder and no `status.json` exists: "No run found. Press Run on a book. The button writes a mark. Ask an opencode agent to run it."
- Error. If the data folder is not readable: "The Monitor dashboard cannot read the Translator data folder. Check the key translatorDataDir in viewer.config.json." The message names the file, not the Mac path.
- A broken `status.json` shows the row with the label "Status file unreadable" and the file path. The other rows stay.

##### 15.24.4.7 Keyboard and contrast

- Tab order: the summary line, the group headings, then for each row the title link, the buttons, and the file link. Enter or Space toggles a group. Enter on the title opens the detail view.
- A group heading is a `summary` element. A button has a visible focus ring with at least 3:1 contrast.
- Color never works alone. Every state has a symbol and a word. Every error text is red and has the word "Error". A bar has the text "5 of 20 pages".
- All text pairs must reach 4.5:1 in the themes Light and High-contrast dark. The check is `node scripts/contrast-dark.mjs`, which must show 0 failures for the new elements.
- The summary line has the role `status` and `aria-live="polite"`. It announces a change of the count of Needs attention only.

#### 15.24.5 Book detail view (`/monitor/<slug>`)

The detail view answers the question "why is this book in this state, and what happened". It shows the facts in layers: book, list folder, page, box.

1. Header: title, slug, phase, state label with sentence, and the actions of the row. Below: pages done, cost, page time, list folders, and the count of errors.
2. Last error: the newest error text, the page, the box, the time, and the file path of the failed file. Example path: `data/pilot-run/ogawa_lecture_part2_p089/20261026T185029Z-r41/failed/box-critic.TS_3.json`. If none: "No error stored for this book."
3. Timeline: one fold for each list folder, newest first. The newest fold starts open. The fold heading shows the stamp, start and end in PST (round 80 answer 19), the kind, the critic mode, the book jobs, and the list state. The page table below has these columns: Page, State, Calls, QA_3, Cost, Time, Critiques against N, Memory pairs, and Settings.
4. Boxes: a page row opens a grid of 4 box types by 4 levels. Each cell shows ok, failed, running, or waiting, with a word. A failed cell links to the file in `failed/` or `raw/`. A page in the state running shows the boxes in `running` of `progress.json` `[file: app/lib/runs.ts:108]`.
5. Memory pairs: the count for each page and the list of pairs, reused from the panel of today `[file: app/components/ChainPanels.tsx:69-160]`. Example: p046 wrote 5 pairs, p047 6, p048 5, p049 4, p050 6. The total is 26.
6. Critiques against N: for each page, the count of each box type, with a star when the count reached N. A total row sums the pages. Example: TS 1, TL 13, ED 17, QA 3 against N = 2. The note stays: "The run program has no update step yet." A box that stopped after 3 double REJECTs in a row shows a flag next to its count (round 72 answer 11, `.opencode/reminders/qa/qa-memory-2026-10-30.md:39`). The flag text is "ED_2 stopped after 3 double REJECTs in a row" for the box ED_2 (round 73b answer 2, `qa-memory-2026-10-30.md:83`, and round 74 answer 5). The flag also lists the 3 audit reject reasons. The flag has no button (round 74 answer 11). Replaced in round 74: the flag held a button Restart (round 73b answer 3). Round 74 answer 2: each box also shows the critique share, used and dropped (section 15.27.5). Translator design: section 9.25.4.
7. Settings used: each page row shows N (key `update_N` of `summary.json`) and the models (`run.json`). A mark "Settings changed before this page" shows when a page used other values than the page before. Today `run.json` holds models, mode, jobs, and the cost limit. After unit TR70, it also holds the block `settings` and its sha1.

Where each fact comes from:

- `progress.json`: page state, cost, and time.
- `summary.json` of the page run folder: QA_3, critique counts, and memory counts.
- `calls.jsonl`: box states and retries.
- `list-summary.json`: failure texts.
- `run.json`: settings.
- `book-memory/<book>.jsonl` or the book store: pairs.

#### 15.24.6 Config panel (`/settings/run`)

The config panel edits the settings file. The panel is under the Monitor dashboard: the button "Run settings" and the tab with the same name open it. It exists on the Mac only. With the monitor off, the page and its API route give "not found", like the pause route `[file: app/lib/monitor.ts:28-31]`.

Page layout:

- At the top, one sentence names the books that run now and says when a change reaches them. Example: "left_foot_full runs now at p051. It reads new values at the start of p052."
- The left column lists the 8 groups as links. The right column shows the groups as forms. Reason: the owner jumps to one value and sees the other groups in context.
- Each field shows the name and one sentence of plain meaning. It shows the input. It shows the default with a button "Reset". It shows the allowed values, the unit, and the time when a change takes effect.
- A mark "Changed" shows next to an unsaved field. A mark "Not default" shows next to a saved value that differs from the default.
- A bar at the bottom shows "3 unsaved changes" with the buttons "Review changes" and "Discard".

The 8 groups. "Today" is the value of the Translator now. It is also the default, because the settings file does not exist yet. Allowed ranges are `[unit default]` unless a file names them.

| Group | Key | Plain meaning | Today | Allowed | Unit | Takes effect |
|---|---|---|---|---|---|---|
| 1 N | `update.N` | Critique count of one box type that starts a prompt rewrite. | 5 (N = 5 from phase 3, round 72 answer 7, `.opencode/reminders/qa/qa-memory-2026-10-30.md:35`. Unit UN73 sets 5 in the config files, round 73b answer 5, `qa-memory-2026-10-30.md:86`. It was 2.) | whole number, 1 or more | critiques | next page |
| 2 Model and effort per level | `levels."0"` to `levels."3"`, each with `model` and `variant` | The model and the effort of the four boxes of one level. | level 0: google/antigravity-gemini-3.8-flash-high, high. Level 1: anthropic/claude-haiku-5-5, xhigh. Level 2: xai/grok-4.7, low. Level 3: anthropic/claude-sonnet-5-5, high. | model ID from the list, effort from the list | none | next page |
| 3 Box critic model | `box_critic.model`, `box_critic.variant` | The model of the critic that reads each box. | anthropic/claude-opus-5-5, medium | same as group 2 | none | next page |
| 4 Cost limit per page | `run.max_usd_per_page` | A page stops with "cost guard" when its cost reaches the limit. | no limit | empty, or a number above 0 | USD | next page |
| 5 Jobs and book jobs | `run.jobs`, `run.book_jobs` | Calls in parallel inside one page. Books in parallel. | 1 and 1 | whole numbers, 1 or more | calls, books | next list or book start |
| 6 Critic mode | `run.critic_mode` | "separate": one critic session per box, 16 calls per page. "session": one critic session per page. | separate | separate or session | none | next list or book start |
| 7 Memory and link constants | `memory.memory_k`, `memory.join_page_end`, `links.neighbor_skip_cites`, `links.window_lines` | Memory pairs for one box. Join a pair across the page end. Cited items that skip the neighbor link. Lines of the neighbor window. | 3, on, 5, 1 | whole number 1 or more, on or off, whole number 0 or more (0 is off), whole number 0 or more | pairs, lines | next page |
| 8 Call timeout and retries | `calls.call_timeout_s`, `calls.max_attempts` | Seconds before one call times out. Attempts for one call. | 1500, 2 | whole numbers, 60 or more and 1 or more | seconds, attempts | next page |

Notes on the groups:

- Group 1: the panel shows the line "Today N only sets the marks 'reached N'. The run program has no update step yet." The line goes when the Translator builds the update step.
- Group 2 and 3: the list of model IDs comes from the IDs in `config/translator-models.yaml`, plus the field "Other…". An ID from "Other…" shows the warning "The Viewer cannot check this ID. A wrong ID stops the page at the start with CONFIG ERROR." Open item 6 holds the options.
- Group 4: the field shows a hint from real data: "The pages of the last list cost $1.24 to $1.93 each." The most expensive page in the three list folders cost $4.38 (`kendojidai_2014/p0839`).
- Group 4: an empty field means no limit. The command line value `--max-usd` also exists. The settings file wins (round 70 answer 14, item 5 of section 15.24.11).
- Group 5 and 6: the conflict. A list that runs cannot change jobs, book jobs, or the critic mode. The list reads them at its start, and a resume reuses the stored mode. The Translator says: "RESUME ERROR: %s ran with --critic-mode %s. A resume must use the same mode." `[file: data/scripts/translator_run.py:1953]`. The panel shows the badge "Next list or book start" on these three fields. It does not hide them. Round 69 answer 19 says "next page" for the file. Open item 4 holds the options.
- Group 7 and 8: the Translator must read these keys. Today the values are constants in code (note of aki-main, line 112).

Validation:

- The panel checks each field when the owner leaves it, and again at save. The server runs the same checks (one shared function `validateSettings`).
- A wrong value shows a sentence at the field. Example: "N must be a whole number, 1 or more."
- A key that the panel does not know stays in the file unchanged. The panel never shows a value whose key name holds "key", "token", "secret", or "password".

Review, save, history, and reset:

- "Review changes" opens a dialog (sketch 5). It lists each change as "name: old → new (when it takes effect)". It names the books that read the new values.
- "Save" writes the whole file: a temporary file in the same folder, then a rename. A reader of the file never sees half a file. The form holds the sha1 of the file it loaded. If the sha1 differs at save, the server answers 409 and the panel says: "The file changed since you opened this page. Reload and check your changes."
- Each save adds one line to `translator-settings.history.jsonl`: time, the changed keys with old and new value, and the sha1 before and after. The panel shows the last 20 lines under the form as "Change history", with a link to the full file.
- "Reset" on a field restores the default in the form. "Reset all" does it for all fields. Both need a save. A reset saves the default value as an explicit value.
- Only the Viewer on the Mac writes. The write route has four conditions `[agent inference]`:
  - The monitor is on.
  - The body is JSON.
  - The Origin matches the Host.
  - The Host is `localhost`, `127.0.0.1`, or `[::1]`.
- Open item 9 holds the reason for the last condition.

#### 15.24.7 Resume per book

The owner marks a book from the screen and asks an opencode agent to run it. A book can stop at any page. The resume point is the next page after the last accepted page. DM70 drafted three ways. The owner chose another way in round 70 answer 11 and confirmed it in round 71 answer 9. Owner words, round 70 answer 11: "Actually, the [Run] and [Resume] button should only `mark` the book for run start/continue. I will only run through asking agent to run on opencode, where the agent will read the mark and perform the action needed. The monitor just need to reflect the changes during/after the run" [user 2026-10-29 23:36]. Round 71 answer 9 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:14`): "Reading right (Recommended)" [accepted recommendation 2026-10-30 02:37]. The flow: the button Run, Resume, or Restart (Restart on the book row and in Details, round 74 answer 11) writes `request.json` in the book store folder. The owner asks an opencode agent. The agent runs `translator_run.py marks` and then the printed `run-book` command. The handled mark becomes `request.done.json`. The Monitor dashboard shows the progress. Every process button opens a confirm dialog first (round 74 answer 12, section 15.27.2).

- Draft option 1, copy the exact command (DM70 recommendation, not chosen). In the draft, the button "Resume…" showed the command and a button "Copy command". The owner pasted it in the Terminal. Benefit: the web app gets no new power. No visitor of port 3000 can start a paid run. The command is visible and can be checked. Cost: one manual step in the Terminal.
- Draft option 2, a request file that the Translator watches. The owner chose the file of this option and replaced the process that watches with an opencode agent (round 70 answer 11). The Viewer writes a file and a Translator process starts the work. Benefit: one click. Cost: a process must watch, and a stopped book has no process. So a new always-on Translator process is needed. That is a new component for unit TR70.
- Draft option 3, the Viewer starts the process (not chosen). The Viewer runs the command on the Mac. Benefit: one click, no Terminal. Cost: the monitor has no sign-in. Any person who reaches the port can start a paid run. The run ends with the Next server. This is the largest risk of the three.

The dialog of draft option 1 listed these items (not built):

- The book, the page where it continues, and the phase.
- The command in a code block, with the folder to run it from.
- A command for a check without any write, when one exists. Example: `python3 data/scripts/translator_run.py run-chain --resume data/pilot-run/lists/20261028T023006Z --dry-run`.
- A warning when the book runs now, with the pid. The button "Copy command" stays enabled but the text says "This book runs now".

Commands for the opencode agent. The agent runs them. The Viewer runs nothing:

- For a book with a store: the agent runs `python3 data/scripts/translator_run.py marks`. It prints one line for each mark with the command, for example `python3 data/scripts/translator_run.py run-book left_foot_full --phase agent-phase-3` `[file: <T2>/data/scripts/translator_run.py, functions mark_command and cmd_marks]`. Unit TB71 built both. The draft name `--book` was not used.
- Draft command for a derived row whose list has pages in the state waiting: `python3 data/scripts/translator_run.py run-chain --resume data/pilot-run/lists/20261028T023006Z` (the book `mental_full`). The list holds 3 chains. The resume runs the chains that have pages in the state waiting. In this list only `mental_full` has such pages (p015 to p018). The owner chose marks, and `run-book` ignores list folders and pilot data (round 70 answer 15: "Option 1. pilots are just testing. None of the pilot data should be retained for actual run" [user 2026-10-29 23:36]). So a mark for a derived row starts at p001 `[file: <T2>/data/scripts/translator_run.py, docstring of cmd_run_book]`.
- Draft text for a derived row whose list finished all pages (for example `left_foot_full`): the dialog said "The old list folder has no page in the state waiting. Start the next pages with run-book, which unit TR70 builds." No command showed. Unit TB71 built `run-book`. A mark for this book makes `run-book` start at p001, because the store holds no accepted page.

A book that stopped by a Pause is no exception now. The process ended at the pause (round 70 answer 12), so "Resume" writes a mark like every other button. Draft DM70: "Resume" deleted the pause file, because the process still lived and the Viewer had this power.

#### 15.24.8 Text sketches

Desktop, 1440 px wide. A row marked [real] uses the derived numbers of section 15.24.2. A row marked [example] is an illustration with T7 numbers.

Sketch 1: Monitor dashboard today, with the data on this Mac (no list runs now).

```
Monitor   Lists   Books   Run settings   Human translation                                            Light  [High-contrast dark]
-------------------------------------------------------------------------------------------------------------------------------
Monitor dashboard                                       Updated 22:06:12 PDT (3 s ago)   [Refresh]   [Run settings]
1 needs attention · 0 waiting for a run · 0 running · 11 stopped · 0 completed · 25 not started          Model cost in list folders: $73.95
-------------------------------------------------------------------------------------------------------------------------------
v ▲ Needs attention (1)
  ▲ Stopped by failure  Making the Difference on the Day (mental_full)  Phase not stored  2 of 169 pages [#.........]  $5.48  102 min  [Resume] [Restart] [Details]
      Stopped at p014: QA_3 FAIL (old rule). Oct 27 19:56 PDT, 2 days ago. Next page: p015.                                    [real]

v ● Running (0)
  Nothing runs now. The last list ended Oct 29 00:50 PDT (21 h ago).

v ■ Stopped (11)
  ■ Stopped  The Secret of Kendo and the Left Foot (left_foot_full)  Phase not stored  6 of 120 pages [#.........]  $22.16  414 min  [Resume] [Details]
      Stopped at p050: the list finished. Oct 29 00:50 PDT, 21 h ago. 3 list folders. Next page: not stored.                   [real]
  ■ Stopped  Kendo Jidai 2014 (kendojidai_2014)  Phase not stored  6 of 1051 pages [..........]  $15.77  269 min  [Resume] [Details]
      Stopped at p0798: the list finished. Oct 27 21:46 PDT, 2 days ago. 2 list folders. Next page: not stored.                [real]
      (6 more rows)
  ■ Stopped  Lectures on Kendo, New Edition (ogawa_lecture_part2)  Phase not stored  1 of 150 pages [..........]  $3.73  76 min  [Resume] [Details]
      Stopped at p089: the list ended with 1 error. Oct 26 12:25 PDT, 3 days ago.                                              [real]
      Error on p089, box box-critic.TS_3: invalid JSON: Expecting ',' delimiter: line 1 column 913 (char 912)
      File: data/pilot-run/ogawa_lecture_part2_p089/20261026T185029Z-r41/failed/box-critic.TS_3.json
      (2 more rows)

> ○ Not started (25)
> Phase 2 (paired dataset): no run record yet.
```

Sketch 2: the same screen when books run. The rows are examples that use the T7 numbers of `left_foot_full`. They are not real data.

```
1 needs attention · 0 waiting for a run · 1 running · 10 stopped · 0 completed · 25 not started
v ▲ Needs attention (1)
  ▲ Stopped unexpectedly  Kendo Jidai 2012 (kendojidai_2012)  Phase 3 · warm initialization  2 of 20 pages [#.........]  $3.88  92 min  [Resume] [Details]
      No update for 12 min: the process is gone. Last page done: p711. The call of box TL_2 on the next page did not end.   [example]
v ● Running (1)
  ● Running  The Secret of Kendo and the Left Foot (left_foot_full)  Phase 3 · warm initialization  5 of 20 pages [##........]  $8.30  159 min  [Pause] [Details]
      Now: p051, box TL_2. Running since Oct 29 21:12 PDT (54 min). Last sign of life 4 s ago. Next page: p052.                 [example]
v ■ Stopped (10)
  ■ Stopped  Making the Difference on the Day (mental_full)  Phase 3 · warm initialization  2 of 20 pages [#.........]  $5.48  102 min  [Resume] [Restart] [Details]
      Stopped by Pause at 21:40. Last saved page p014. Resume starts at p015.                                                    [example]
```

Sketch 3: book detail of `left_foot_full`, real derived data.

```
< Monitor dashboard
The Secret of Kendo and the Left Foot (left_foot_full)                                                         [Resume]
■ Stopped at p050: the list finished. Oct 29 00:50 PDT (2026-10-29T07:50:31Z), 21 h ago. Phase not stored.
6 of 120 pages · Model cost $22.16 · 414 min of page time · 3 list folders · Errors: none stored

v List 20261029T051152Z   Oct 28 22:11 PDT to Oct 29 00:50 PDT   chain · critic separate · 1 book job · completed
  Page  State  Calls   QA_3        Cost   Time      Critiques (N = 2)           Memory pairs  Settings
  p046  done   32/32   PASS 9.5    $1.60  31.2 min  TS 0  TL 3*  ED 4*  QA 0    5            N 2 · models of run.json
  p047  done   32/32   PASS 9.5    $1.93  34.5 min  TS 0  TL 4*  ED 6*  QA 1    6            same
  p048  done   32/32   PASS 9.5    $1.72  32.7 min  TS 0  TL 3*  ED 4*  QA 1    5            same
  p049  done   32/32   PASS 10.0   $1.24  25.0 min  TS 0  TL 0   ED 0   QA 0    4            same
  p050  done   32/32   PASS 9.0    $1.81  35.3 min  TS 1  TL 3*  ED 3*  QA 1    6            same
  Total                            $8.30  159 min   TS 1  TL 13  ED 17  QA 3    26
  * the count reached N. The run program has no update step yet.

  p050 boxes     Level 0   Level 1   Level 2   Level 3        (cell words: ok, failed, running, waiting)
     TS          ok        ok        ok        ok
     TL          ok        ok        ok        ok
     ED          ok        ok        ok        ok
     QA          ok        ok        ok        ok

> List 20261028T023006Z   Oct 27 19:30 PDT to Oct 27 21:58 PDT   chain · critic session · 6 book jobs · completed with failures
> List 20261026T182511Z   Oct 26 11:25 PDT to Oct 26 15:09 PDT   list · 4 jobs · completed with failures
```

Sketch 4: config panel. Groups 1, 4, 5, and 6 are drawn in full. The settings file does not exist yet. The unsaved values and the running book are an example.

```
Monitor dashboard > Run settings                     Settings file: translator-settings.json · not created yet. The Translator uses today's values.
left_foot_full runs now at p051. It reads new values at the start of p052. Jobs, book jobs, and critic mode apply at the next list or book start.
+------------------+--------------------------------------------------------------------------------------------------------+
| 1 N              | 1 N                                                                                                    |
| 2 Models         |   Critiques of one box type that start a prompt rewrite.                                               |
| 3 Box critic     |   Value [ 3 ]  Changed      Default 5  [Reset]     Whole number, 1 or more · critiques                 |
| 4 Cost limit     |   Takes effect: next page.                                                                             |
| 5 Jobs           |   Today N only sets the marks "reached N". The run program has no update step yet.                     |
| 6 Critic mode    |                                                                                                        |
| 7 Memory, links  | 4 Cost limit per page                                                                                  |
| 8 Timeout        |   A page stops with "cost guard" when its cost reaches the limit.                                      |
|                  |   Value [ 3.00 ] USD  Changed   Default: no limit  [Reset]    Empty or above 0                         |
|                  |   The pages of the last list cost $1.24 to $1.93 each. The highest page cost $4.38.                    |
|                  |                                                                                                        |
|                  | 5 Jobs and book jobs                                           Badge: next list or book start          |
|                  |   Calls in parallel inside one page   [ 1 ]    Default 1                                               |
|                  |   Books in parallel                   [ 1 ]    Default 1                                               |
|                  | 6 Critic mode   (o) separate   ( ) session                     Badge: next list or book start          |
|                  |   A resume must use the same mode as the list.                                                         |
|                  | ...                                                                                                    |
|                  | Change history                                                                                         |
|                  |   No entry yet.                                                                                        |
+------------------+--------------------------------------------------------------------------------------------------------+
2 unsaved changes                                                                         [Discard]  [Review changes]
```

Sketch 5: confirm dialog after "Review changes". The values are an example. The book `left_foot_full` at p051 is the example of sketch 2.

```
+--------------------------------------------------------------------------------------+
| Save 2 changes to translator-settings.json?                                          |
|                                                                                      |
|   N                       2 → 3                 next page                            |
|   Cost limit per page     no limit → 3.00 USD   next page                            |
|   "Next page" means the start of the next page of each book.                         |
|                                                                                      |
| Books that read the new values:                                                      |
|   left_foot_full          runs now at p051. It reads them at the start of p052.      |
|                                                                                      |
| The file changes on this Mac only. You can undo with the button "Reset".             |
|                                                                                      |
|                                                      [Cancel]   [Save 2 changes]     |
+--------------------------------------------------------------------------------------+
```

The focus starts on "Cancel". Esc closes the dialog. The dialog has the role `dialog` and a label.

#### 15.24.9 Data contract and how the Viewer reads it

This contract refines the draft of aki-main. Unit TR70 writes the Translator side. The list after the block names the points where this design differs from the draft.

```
Settings file (round 69 answers 18, 19)
  path:    <T2>/config/translator-settings.json (next to translator-models.yaml). Git ignores it (round 71 answer 8: "Keep it out of git (Recommended)"). The defaults file stays tracked
  read:    by the Translator at the start of each page, when it reads translator-models.yaml
  defaults: <T2>/config/translator-settings.defaults.json (read only for the Viewer, written by the Translator)
  keys:    update.N, levels."0".model, levels."0".variant, ... levels."3".*, box_critic.model, box_critic.variant,
           run.max_usd_per_page, run.jobs, run.book_jobs, run.critic_mode,
           memory.memory_k, memory.join_page_end, links.neighbor_skip_cites, links.window_lines,
           calls.call_timeout_s, calls.max_attempts
  a key that is absent means: use today's value
  each page run writes run.json: a "settings" block with the values it used, and "settings_sha1"
History of the settings file
  path:    <T2>/config/translator-settings.history.jsonl  (the Viewer appends one line for each save, git ignores it, default of unit TB72 and no owner answer)
Per-book store (round 69 answer 17)
  folder:  <T2>/data/book-store/<book>/  (round 71 answer 7: "Move to data/book-store (Recommended)")
  status.json
    book, phase ("agent-phase-2" | "agent-phase-3" | "agent-phase-4")
    state: "not-started" | "running" | "stopped" | "completed"
    stop_reason: null | "ctrl-c" | "target-reached" | "forward-failure" | "cost-guard" | "rule" | "pause" | "restart"
    stop_text: the sentence of the stop, for example "stopped: QA_3 FAIL on mental_full/p014"
    list_stamp, pid, heartbeat_utc (written every 30 s by a thread that does not wait for a call)
    running_page, running_boxes (for example ["TL_2"])
    last_accepted_page, next_page
    pages_done, pages_total (pages of the target of this phase: 20 for phase 3, all pages for phase 4), book_pages
    fail_pages (list of pages with QA_3 FAIL)
    cost_usd_models_phase, seconds_phase (page time of this phase)
    last_error {page, box, text, file, utc}
    settings_sha1, started_utc, run_id (PST start time, for example "2026-11-04T00:15:00-08:00"), updated_utc
  book-memory.jsonl   book translation memory that survives list folders
  history.jsonl       one event per line: list started, page done, page failed, paused, resumed, stopped, phase changed, settings changed
  PAUSE               pause file of the book. The Translator checks it after the current page ends (16 boxes forward, critic and critique steps backward, memory write). Then the process ends and the state is "paused" (round 71 answer 10)
"phase" also sits in list.json, progress.json, and run.json
```

Differences from the draft of aki-main:

- New keys `stop_reason`, `stop_text`, `running_boxes`, `book_pages`, and `fail_pages`. The screen needs them to say why a book stopped and what runs.
- `pages_total` counts the pages of the phase target. The draft left this open. Phase 3 needs 20, not the pages of the book.
- The cost and the time count one phase. A phase change writes the old totals to `history.jsonl`.
- The heartbeat comes from a thread that does not wait for a model call. A call can last 1500 s.
- A file `PAUSE` for one book. The draft had the list file only. The Monitor dashboard also writes the mark `request.json` in the book folder (round 70 answer 11, round 71 answer 9). The mark holds the keys schema ("book-request-v1"), book, action ("run" or "resume"), phase, requested_utc, and requested_by `[file: <T2>/data/scripts/translator/store.py, function write_mark]`. The restart mark uses the same file with the action "restart" and no key `box` (round 74 answers 5 to 9). Old text, replaced: the key `box` named one stopped box (unit default of DD73). One more key sets the prompt choice. Round 79 answer 12 (`qa-memory-2026-11-01.md:104`) decides that the key `prompts` holds a map of 16 labels, one for each box (section 15.32.4). Old text, replaced (round 74 answer 8): `"prompts": "start"` (the default, the prompts that the archived run started with) or `"prompts": "last"` (the last live prompts of the archived run) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 3, "One restart action"). Other option: two actions, "restart" and "restart-last". Benefit of the key: one action. Cost: the key is valid for the action "restart" only. A Restart mark on a running book makes the run program stop after the page is saved, archive the run, and end. An opencode agent starts the book again from page 1 `[accepted option 2 2026-11-01 08:12, round 77 answer 12, qa-memory-2026-11-01.md:43]` (section 15.30.3). Old text: "start again from page 1" in the same process `[accepted 2026-11-01 01:03, round 76 answer 5, qa-memory-2026-11-01.md:8]`. Other option in section 15.27.4, not chosen. Not verified: `MARK_ACTIONS` in `store.py` holds only "run" and "resume" (l30), so a Translator unit must add "restart". `run-book` keeps the handled mark as `request.done.json`. The run program reads the restart mark at each page start. So a mark reaches a book that runs at the next page (round 73c answer 10, `.opencode/reminders/qa/qa-memory-2026-10-30.md:116`, "Run program reads the mark per page (Recommended)" `[accepted recommendation 2026-10-30 20:17]`). Replaced in round 78 answers 4 and 5 (`qa-memory-2026-11-01.md:66-67`) `[reading pending owner check]`: the choice is a version for each box, and the key `prompts` can hold a map from box to label. The shape is decided in round 79 answer 12 (section 15.32.4).
- A defaults file, so that the Viewer shows the default of each key without a copy of the table.
- A history file of the settings file. The draft had no place for who changed what.

How the Viewer reads it:

- Book set: the slugs of `pilot-sample/book-slugs.json`, plus any book ID in a `status.json` or in a list folder. This matches the rule of the Books tab `[file: app/lib/books.ts:66-103]`.
- For each book, a `status.json` is the truth when it exists. The Viewer checks the pid with signal 0 and the heartbeat age, and sets the label by the table in 15.24.4.2.
- A book without `status.json` gets a derived row: the Viewer reads every `progress.json` and `list.json` of the list folders, and `list-summary.json` for the failure texts. It builds the row by the derived column of the table in 15.24.4.2.
- Pages done is the count of distinct page IDs in the state "done". Cost and page time are sums over all list folders. The last event is the latest `ended_epoch` of the book. The phase is "not stored". The next page is the first page in the state waiting of the newest list, else "not stored".
- The Viewer reads a file again only when its modification time changed `[agent inference]`. The poll runs every 3 s. 37 books and many lists must not slow it.
- A broken or half file gives the row "Status file unreadable". It never stops the page.
- The Viewer writes five kinds of files: `PAUSE` (list or book), `request.json` (book, a Run, Resume, or Restart mark), `request.done.json` (book, Clear mark moves `request.json` there and overwrites an older `request.done.json`, round 83 answers 12 and 13), `translator-settings.json`, and `translator-settings.history.jsonl`. The last two sit in `<T2>/config`. A new function in `app/lib/safe-path.ts` accepts only these two names in that folder. The key `translatorConfigDir` in `viewer.config.json` sets the folder. The default is the folder `config` next to `translatorDataDir`. Another check accepts only the names `PAUSE`, `request.json`, and `request.done.json` in a folder `book-store/<book>/` `[unit default]`. The code writes these three fixed names in that folder `[file: <V2>/app/lib/book-actions.ts:116,124]` `[file: <V2>/app/lib/book-restart-actions.ts:159]`. The file `app/lib/safe-path.ts` holds no list of names `[check: DZ82 2026-11-02 20:52 PST grep -n 'request\|PAUSE\|done' lib/safe-path.ts]`.

#### 15.24.10 Plan for the code unit

All paths start in the folder `app/` of the Viewer repository. The routes sit in `app/app/`.

Files to add:

- `app/app/runs/page.tsx`: the old runs table, tab Lists.
- `app/app/monitor/[slug]/page.tsx`: the book detail view.
- `app/app/settings/run/page.tsx`: the config panel.
- `app/app/api/monitor/books/route.ts` (GET, the poll) and `app/app/api/monitor/books/[slug]/route.ts` (GET), and `app/app/api/monitor/books/[slug]/mark/route.ts` (POST, writes the mark `request.json`) `[unit default]`.
- `app/app/api/settings/run/route.ts` (GET and PUT).
- `app/lib/book-status.ts`: server code. It reads `status.json`, derives rows, and checks the pid.
- `app/lib/book-status-rules.ts`: a pure function from file contents and a clock to labels, groups, and sentences. It has no file access, so a test runs it without the server.
- `app/lib/settings-run.ts`: server code. It reads, validates, and writes the settings file and the history.
- `app/lib/settings-schema.ts`: a pure module with the field table, `validateSettings`, and the diff.
- `app/components/MonitorDashboard.tsx`, `BookRow.tsx`, `StateLabel.tsx`, `MarkButton.tsx` (the buttons Run, Resume, and Restart, each with a confirm dialog, and Restart on the book row and in Details only), `BookDetail.tsx`, `RunSettingsForm.tsx`, and `ConfirmDialog.tsx`.

Files to change:

- `app/app/page.tsx`: shows the Monitor dashboard.
- `app/lib/safe-path.ts`: the allowlist function for the two config files.
- `app/lib/config.ts`: the optional key `translatorConfigDir`.
- `app/lib/monitor.ts`: a check for the Host header of write routes.
- `app/lib/runs.ts`: `setPause` also handles the pause file of one book.
- `app/lib/format.ts`: time in PST (UTC-8) all year, and relative time (round 80 answer 19).
- `app/lib/types.ts`: new types.
- `app/components/Nav.tsx`: the five tabs. The match of the first tab becomes `p === "/"` or `p.startsWith("/monitor")`.
- `app/components/Pills.tsx`: the new labels.
- `app/components/useLive.tsx`: the banner after 3 failed polls, and no poll in a hidden tab.
- `app/components/PauseButton.tsx`: the dialog for a list with several books.
- `app/components/RunsTable.tsx`: the heading says "Lists". `app/components/RunView.tsx`: the back link says "← Lists".
- `app/scripts/smoke.mjs`: a new mode `monitor`. `app/scripts/contrast-dark.mjs`: the new elements. `app/README.md`: the new routes and files.
- Migrations: none. Nothing goes to PocketBase.

Tests:

- Pure functions, run with the resolve hook `[file: app/scripts/ts-resolve-hook.mjs]`:
  - Every row of the state table in 15.24.4.2, with the real examples. `mental_full` gives Stopped by failure. `left_foot_full` gives Stopped with 6 of 120 pages. `ogawa_lecture_part2` gives Stopped with an error text.
  - The limits 120 s and 1800 s, at the edge.
  - Relative time.
  - `validateSettings` for all 21 keys, with a good and a bad value, and the diff.
- Smoke mode `monitor` with a fixture folder that holds copies of the 3 list folders and a `config` folder. It adds fake `status.json` files: running (own pid), stopped unexpectedly (pid of a finished process), stopped by a pause, completed, and a broken file. It checks the rows, the groups, the summary line, and the 404 answers with the monitor off.
- Settings write tests: the file is written by temp file and rename, with no temp file left. A stale sha1 gives 409. A foreign Origin and a foreign Host give 403. A key that the panel does not know stays. A save writes one line in the history. No other path in the fixture changes.
- Pause tests extend the mode `pause`: the list with 3 books shows the dialog, and one pause file per book works. Mark tests: the button writes `request.json` in the book folder and no other file. The same test covers the button Restart on the book row and in Details. A dialog test covers each process button: the dialog opens with the focus on Cancel, and Cancel writes no file `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 7, "Dialog test").
- Chrome checks at 1440 x 900:
  - Keyboard through all groups and buttons.
  - The focus ring.
  - A screenshot in the themes Light and High-contrast dark.
  - `node scripts/contrast-dark.mjs` with 0 failures.

#### 15.24.11 Open items

- Item 1: how the owner resumes a book. Decided in round 70 answer 11: "Actually, the [Run] and [Resume] button should only `mark` the book for run start/continue. I will only run through asking agent to run on opencode, where the agent will read the mark and perform the action needed. The monitor just need to reflect the changes during/after the run" [user 2026-10-29 23:36]. Round 71 answer 9 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:14`): "Reading right (Recommended)" [accepted recommendation 2026-10-30 02:37]. The button writes `request.json`. An opencode agent runs `translator_run.py marks` and then the printed `run-book` command. The handled mark becomes `request.done.json`. Section 15.24.7 holds the flow. Example: `mental_full` stopped at p014 on Oct 27 19:56 PDT. Decided in round 72 answer 17 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:45`): "Accept all 3 (Recommended)" [accepted recommendation 2026-10-30 09:28]. Between the mark and the first sign of the process, the row shows "Mark waiting: Resume requested HH:MM". Example: a resume mark for `mental_full` at 10:42 shows "Mark waiting: Resume requested 10:42". For a Run mark, the row shows "Mark waiting: Run requested HH:MM" (unit default of DU73, round 73 [agent inference]). Section 15.24.4.2 names this state.
  - Draft option A (DM70 recommendation, not chosen): copy the command. Benefit: no new power in the web app. Cost: one step in the Terminal.
  - Draft option B (the file is the owner choice): a request file. Benefit: one click. Cost: a new always-on Translator process. The owner removed this cost, because an opencode agent reads the mark.
  - Draft option C (not chosen): the Viewer starts the process. Benefit: one click. Cost: the monitor has no sign-in, so any visitor of the port can start a paid run.
- Item 2: Needs attention rows for old problems. Example: `mental_full` stays in Needs attention until a resume, and it stopped 2 days ago. Decided in round 73c answer 13 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:119`): "Row stays until the book runs (Recommended)" `[accepted recommendation 2026-10-30 20:17]`. Option A is chosen.
  - Option A (chosen, recommended): the row stays until the book runs again. Benefit: no new write, and a real problem does not hide. Cost: an old accepted problem keeps a row at the top.
  - Option B (not chosen): a button "Mark as seen" writes an event to the book history. Benefit: the group empties. Cost: a new write of the Viewer, and the Translator must write the store first.
- Item 3: the scope of Pause. Decided in round 70 answer 12: "Each book with running process has a Pause button. When click, the running process finishing the process (forward and backward) for current page and stop the process." [user 2026-10-29 23:36] Round 71 answer 10: "Reading right (Recommended)" [accepted recommendation 2026-10-30 02:37]. The button writes `PAUSE` in the book store folder. The process finishes the current page (16 boxes forward, critic and critique steps backward, memory write), then ends. The Monitor dashboard shows Stopped with the cause Pause (round 76 answer 4). Resume writes a mark. Draft option A is the built one for `run-book`. Example: list `20261028T023006Z` holds 3 books, and a pause on the row of `mental_full` stopped all 3 in the draft. Not verified: the pause of an old list folder in the new design. The old list file stays `[agent inference]`.
  - Draft option A (chosen for `run-book`): one pause file per book for `run-book`, and a dialog for old lists that names all books. Benefit: the owner pauses one book. Cost: the Translator must check one more file after each page.
  - Draft option B (not chosen): the pause file stays per list. Benefit: no Translator change. Cost: one book cannot pause alone, and a dialog is needed.
- Item 4: jobs, book jobs, and critic mode. Decided in round 72 answer 17 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:45`): "Accept all 3 (Recommended)" [accepted recommendation 2026-10-30 09:28]. Option A. Round 69 answer 19 says "next page". A list that runs reads these three at its start. Example: a resume of `left_foot_full` (mode separate) with the mode session gives "RESUME ERROR".
  - Option A (chosen): the three fields save at once and show the badge "Next list or book start". The dialog says so. Benefit: the owner sets the next run in advance. Cost: the change does not reach a list that runs, and the owner must read the badge.
  - Option B: the three fields are disabled while any book runs. Benefit: no wrong hope. Cost: the owner cannot prepare the next run.
  - Option C: the three fields apply at the next page. Benefit: it follows answer 19 to the letter. Cost: unit TR70 must build parallel pools that change size `[agent inference]`, and a mode change breaks the resume of a started book.
- Item 5: the command line value `--max-usd` and the settings file. Decided in round 70 answer 14: "Settings file wins (Recommended)" [accepted recommendation 2026-10-29 23:36]. Unit TB71 built it `[file: <T2>/data/scripts/translator/settings.py:10-12]`. Example: a list that starts with `--max-usd 3` and a file that says no limit.
  - Draft option A (chosen): the file wins for keys that it holds, and the row of the book shows "limit from the settings file". Benefit: the panel has the last word, as the owner asked. Cost: a command line value is ignored after the file holds the key.
  - Draft option B (not chosen): the command line wins, and the panel shows "overridden by the command line". Benefit: nothing changes for old commands. Cost: the panel can lie to the owner.
- Item 6: the allowed models. Example: the owner types "anthropic/claude-sonet-5-5" with one letter left out.
  - Option A (recommended): a list with the IDs of `translator-models.yaml` and a field "Other…" with a warning. Benefit: no typo for known IDs. Cost: a new model needs "Other…".
  - Option B: free text only. Benefit: simple. Cost: a typo stops a page at the start with CONFIG ERROR. Not verified: what the chain does after that error.
  - Option C: the Translator writes a catalog file of the models that the account can call. Benefit: a complete list. Cost: a new file and a new step in unit TR70.
- Item 7: the shape of the phase 2 record. Example: the paired dataset holds more than 300 articles.
  - Option A (recommended): the closed line "no run record yet" now, and the shape later with the phase 2 run. Benefit: no invented data. Cost: phase 2 is not visible until it exists.
  - Option B: define now a file `<T2>/data/pilot-run/phase2/status.json` with the same fields, where a page means an article. Benefit: the Viewer is ready. Cost: a guess about a run that has no design.
- Item 8: the stale limits. Example: a retried call took 771.1 s.
  - Option A (recommended): heartbeat 30 s and limit 120 s for new rows, limit 1800 s for derived rows. Benefit: no false alarm for a long call. Cost: a gone process in an old list shows after 30 min.
  - Option B: keep the 600 s warning of `progress.py` for derived rows. Benefit: earlier alarm. Cost: false alarms for long calls.
- Item 9: write routes only from the Mac itself. Example: the dev server listens on a network address, and a person on the same network opens the settings page and changes N. Not verified: the address on which the server listens.
  - Option A (recommended): write routes check the Host header and accept loopback names only. The pause route gets the same check. Benefit: no change of settings from another computer. Cost: one more check, and a test.
  - Option B: no check. Benefit: no code. Cost: the monitor has no sign-in, so the risk stays.
- Item 10: the first tab. Example: the owner opens `/` and wants the old table of lists.
  - Option A (recommended): the Monitor dashboard is `/` and the old table moves to the tab Lists at `/runs`. Benefit: the owner sees books first, as asked. Cost: the old table is one click away.
  - Option B: keep the table on `/` and add the dashboard at `/monitor`. Benefit: no change of `/`. Cost: it breaks round 68 answer 2, which names `/` as the Monitor home.
- Item 11: what "pages done" counts. Decided in round 72 answer 17 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:45`): "Accept all 3 (Recommended)" [accepted recommendation 2026-10-30 09:28]. Option A. Example: `kendojidai_2014` has 6 pages done on the Monitor dashboard and 5 translated pages on the Reader dashboard.
  - Option A (chosen): the Monitor dashboard counts finished runs of any verdict, and the row shows "1 FAIL page" when known. Benefit: the number shows the work of the agent. Cost: it differs from the Reader dashboard.
  - Option B: count PASS pages only. Benefit: closer to the Reader dashboard. Cost: a FAIL page that cost 4.38 USD does not show as work.

#### 15.24.12 Not verified

- The behavior of a killed Translator process. The code has no handler, and the unit did not kill a process.
- Whether the retry of a call writes `progress.json` again. The limit of 1800 s for derived rows depends on it.
- The address on which the Next server listens on this Mac.
- Whether a page stops or the chain stops after a CONFIG ERROR at the start of a page.
- The commands `run-book` and `marks`, and the file `translator-settings.defaults.json`. Unit TB71 built them (commit ae70266, brief of unit DF72). Unit DF72 ran none of them. The file exists in `<T2>/config` `[check: DF72 2026-10-30 02:51 ls config]`. Not verified: that its keys match section 15.24.9.
- The speed of the poll with many list folders. Today only 3 exist.
- The panel and the dashboard in a browser, in both themes, and by keyboard. The unit wrote a design and ran no browser.
- How the Translator reads a settings file that changes while a page runs. The design says: at the start of each page. Round 69 answer 19 gave that rule.
- Titles for all 12 books on the dashboard. The unit read the titles of 4 books from `docs/VISION-viewer.md` only.

Status: design accepted (round 70 answer 10), Run, Resume, Pause, and store folder lines updated by unit DF72 (round 72). Items 1, 4 and 11 of 15.24.11 decided in round 72 answer 17, written by unit DU73 (round 73).

#### 15.25 Code state of the Reader dashboard (units RC4 and RC4b, rounds 70 and 71)

- Source: unit RC4 (round 70) built the code of the Reader dashboard (`/read`). Unit RC4b (round 71) renames the word "finished" to "translated" in the code. Unit DV71 wrote this section from the files and the logs of RC4 in `<TMP>/r70/RC4/`.
- Screens: this section always names the screen, either "Reader dashboard (/read)" or "Monitor dashboard (/ on this Mac)". It says what a number counts.
- Evidence tags: as in section 15.24. Unit DF71 filled the marks of unit RC4b on 2026-10-30. The sources are the RC4b report and the aki-main checks of 2026-10-30 01:06 to 01:08.
- State: the code is not committed. The Viewer worktree holds 26 changed files on the branch `v2/viewer` at `0e8ab70` `[check: DV71 2026-10-30 00:06 git status --short -uall]`.
- The owner checked the Reader dashboard after aki-main updated the local PocketBase on port 8090 (round 70 answer 2). Port 8090 is updated: restart at 2026-10-30 01:06 with migration 1793300010, then S2 `--apply` at 01:07 (section 15.25.14). The counts are `page_runs` 42, `catalog_items` 347, `magazine_chapters` 103, and `reader_pages` 29 (0.88 MB) `[check: aki-main 2026-10-30 01:08 count71.py]`. The owner gave feedback in round 71 answer 1 `[file: .opencode/reminders/qa/qa-memory-2026-10-30.md:6]`: arrow keys, the question about the 2019-2025 web articles, and a ToC for books. The Reader dashboard is not accepted yet.

##### 15.25.1 Files

- Page and route: `app/app/read/page.tsx` and `app/app/api/read/month/route.ts`. The route answers `GET /api/read/month?id=`. The address `/read?open=<month>` draws one month on the server.
- Components in `app/components/`: `ReaderList`, `ReaderRows`, `ReaderMonth`, and `ReaderSearch`.
- Libraries in `app/lib/`: `reader-folds.ts`, `reader-search.ts`, `reader-data.ts`, and `pb.ts`. The rule file is `reader-translated.ts` (40 lines) `[file: app/lib/reader-translated.ts]`. Unit RC4b renamed it from `reader-finished.ts` and deleted the old file `[check: RC4b 2026-10-30 00:45 unit report]`.
- Front door: the function `frontDoor` in `app/lib/monitor.ts`. It replaces `requireMonitorOrTranslate` `[file: app/lib/monitor.ts]`.
- First-visit panel: `ReaderBook.tsx` and `ReaderSettingsPanel.tsx`. The mark is `reader.panelSeen`. It sits outside `READER_DEFAULTS`.
- Migration: `1793300010_v2_dashboard_fields.js` in `data/scripts/pocketbase/pb_migrations/`.
- Other changed files: `app/scripts/sync-runs.mjs`, `app/scripts/smoke.mjs`, `data/scripts/pocketbase/test_local.py`, `htv-books.ts`, `htv-build.ts`, `htv-settings.ts`, `reader-types.ts`, `ReaderPageView.tsx`, and two README files `[check: DV71 2026-10-30 00:06 git status --short -uall]`.

##### 15.25.2 Data

| Collection | Field | What it holds |
|---|---|---|
| `catalog_items` | `translated` | JSON with the translated pages, for example `{"en":[46,47,48,49,50,75]}` for `left_foot_full`. The name was `finished` in RC4, and unit RC4b renamed it in the migration file `[file: data/scripts/pocketbase/pb_migrations/1793300010_v2_dashboard_fields.js:7,31,64]` `[check: RC4b 2026-10-30 00:45 unit report]`. |
| `catalog_items` | `placement` | JSON with the web year and month and the print year and month of a work. |
| `reader_pages` | `search_ja` | The JA text of the page, folded for the search. |
| `reader_pages` | `search_en` | The EN text of the page, folded for the search. |

- Source of the table: `[file: data/scripts/pocketbase/pb_migrations/1793300010_v2_dashboard_fields.js:5-12]`.
- Rule (name `isTranslatedPage`): a page counts as translated when a `reader_pages` record exists. That is, readers can view its English text `[file: app/lib/reader-translated.ts:18]`.
- Every signed-in user can read `catalog_items`. So a count in `translated` needs no read of `reader_pages` (round 69 answer 9).
- A page with only FAIL runs has no `reader_pages` record. Example: `kendojidai_2014` p0839 `[check: RC4 s2-apply.log, line "skipped (no PASS run and no run mark): 1"]`. Round 75 answer 3: a page with no opened run also has no `reader_pages` record (section 15.28.2).
- Any page opens for an approved reader. The page p0839 opens and shows "No agent translation yet" `[file: docs/VISION-viewer.md:3724]`. The translated count skips it.

##### 15.25.3 Folds and counts

- Two folds on the first level: Books and Kendo Jidai. Both start open. The deeper folds start closed `[check: RC4 smoke-read.log:25]`.
- Books holds 22 works, 4,821 pages, and 20 translated pages `[check: DZ73 2026-10-31 15:25 grep -n "Books 22 works" /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/smoke-read.log, line 71]`. Kendo Jidai holds 320 works, 9,295 pages, and 1,131 translated pages (12.2 percent) `[check: DZ73 2026-10-31 15:25 grep -n "9,295" /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/smoke-web.log, line 4]`. Old text, replaced by unit RT73a: Kendo Jidai held 8,482 pages and 8 translated pages `[check: DV71 2026-10-30 00:12 python3 -B calc.py]`.
- The 320 works are 9 year volumes and 311 web articles. All 311 web articles come from kendojidai.net with web dates from 2019 to 2025 (round 70 answer 5).
- Total line: 342 works, 14,116 pages. English: 1,151 of 14,116 pages translated (8.2 percent) `[check: DZ73 2026-10-31 15:25 grep -n "14,116" /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/smoke-web.log, line 3]`. Old text, replaced by unit RT73a: 342 visible works, 13,303 pages, and 28 translated pages (0.2 percent), with a web article as 1 page `[check: RC4 smoke-folds.log:5]`. History, replaced in round 73b answer 6: this count of 1 page contradicts section 12. A web article has as many pages as its A4 cut, so 311 web articles have 1,126 pages `[file: .opencode/reminders/qa/qa-memory-2026-10-30.md:87]` `[check: aki-main 2026-10-30 15:39 a4count.py]`. If the 8,482 pages of Kendo Jidai count each web article as 1 page, the Kendo Jidai total becomes 9,297 pages (8,482 minus 311 plus 1,126) and the total line becomes 14,118 pages `[agent inference]`. Unit RT73a fixed the code. It measured 9,295 pages for Kendo Jidai and 14,116 in all `[check: DZ73 2026-10-31 15:25 smoke-web.log, lines 3 and 4]`. The inference above was 2 pages too high.
- Kendo Jidai holds 16 year folds, 2010 to 2025, and 172 month folds. It shows 1,155 magazine article rows and 311 web article rows `[check: RC4 smoke-read.log:57]`.
- Hidden works: `men0`, `men1`, `mental2_clean`, `matsubara`, and `morishima` (round 69 answers 12 and 15). The page `/translate` keeps all folders.
- Every web article sits in the fold of its web year and month (round 83 answer 4, round 84 answer 1). Example: `63654ba0` (Teramoto, part 2, stamp 2011.8 KENDOJIDAI) has 4 pages. It moves from Kendo Jidai > 2011 > August 2011 to Kendo Jidai > 2025 > April 2025 `[brief fact, aki-main check 2026-11-02]` `[file: <TMP>/r82/SV82/db_web.json:105]`. Old rule, replaced: a stamped web article sat in its print month (round 70 answer 6). Unit TF83 changes the code in round 84, so the code result is Not verified.
- An unstamped web article sits in its web month. Example: `18d4ac29` sits in Kendo Jidai > 2020 > August 2020. Its title is "Kendo droplet guard". Its ID is the first 8 characters of its `item_id` `[check: RC4 smoke-read.log:54]`.
- The volume `kendojidai_2018` covers January to April only. Old rule, replaced: a stamped 2018 article made a month fold with web articles only (June 1, July 1, September 5, October 2 articles `[file: <TMP>/r82/SV82/compare.txt]`). Those four folds go away under the web year rule (round 83 answer 4).
- The HTML of `/read` has 0.286 MB, because the rows of a month load when the month opens. With all rows it has 2.08 MB `[check: RC4 smoke-read.log:67]` `[brief of unit DV71]`.

##### 15.25.4 Rows

- `left_foot_full`: "English: 6 of 120 pages translated (5.0 percent)" and the link "Start at Page 46". The translated pages are p046 to p050 and p075. The count 6 comes from the database on 8090 `[check: aki-main 2026-10-30 01:08 count71.py]`. The page total 120, the percent value, and the link come from the RC4 and RC4b reports `[check: RC4b 2026-10-30 00:45 unit report]`. Not verified on the live page.
- `kendojidai_2014`: "English: 5 of 1051 pages translated (0.5 percent)" and the link "Start at Page 794". The count 5 comes from the database on 8090 `[check: aki-main 2026-10-30 01:08 count71.py]`. The page total 1051 matches the page ID p1051 in line 1648 of this file. The percent value and the link come from the RC4 and RC4b reports `[check: RC4b 2026-10-30 00:45 unit report]`. Not verified on the live page.
- `etiqu1_full`: "English: 0 of 176 pages translated (0.0 percent)". The row has no link to the text. The title link opens the book screen. The S2 run lists 0 translated pages for `etiqu1_full` `[file: <TMP>/r71/S2/apply.txt:61]`. The page total 176 and the row text come from the RC4 and RC4b reports `[check: RC4b 2026-10-30 00:45 unit report]`. Not verified on the live page.
- Link rule: "Continue at Page N" if the account has a saved place. Else "Start at Page N" with N as the first translated page.
- Year rows, month rows, and the total line use the same full form (round 70 answer 9, "Same wording on year rows (Recommended)"). A fold row reads "English: N of M pages translated (P percent)" `[file: app/lib/reader-translated.ts:38]`. The live Reader dashboard shows this form on the total line, the Books fold, August 2011, and September 2018 `[check: aki-main 2026-10-30 01:08 read_check.py]`. Not verified on the live page: the year rows. The RC4b report states the full form on year rows `[check: RC4b 2026-10-30 00:45 unit report]`.

##### 15.25.5 Search

- A search is a GET form to `/read?q=seme`. The server draws the result list. The query has at most 80 characters `[file: app/lib/reader-search.ts:8]`.
- "seme" finds 10 pages in 3 works: `left_foot_full` (p046, p047, p048, p075), `kendojidai_2014` (p0794 to p0798), and `100_practice_full` (p067) `[check: RC4 smoke-read.log:78]`.
- 攻め finds the same 10 pages `[check: RC4 smoke-read.log:79]`.
- "chuzumi" and "Chūzumi" both find `left_foot_full` p048 and p049 `[check: RC4 smoke-read.log:80-81]`.
- "kendo" finds "Kendō" on `left_foot_full` p046. "droplet" finds the work `18d4ac29` by title and its page p001 `[check: RC4 smoke-read.log:83-84]`.
- Hidden works never match. An unapproved reader gets the note "Page text search opens after approval." and no page hit `[check: RC4 smoke-read.log:26]`.
- A search column that reaches 100,000 characters is cut. The S2 run cut 0 columns `[check: RC4 s2-apply.log]`.
- Time of "seme": 97 to 291 ms over 5 requests, with 29 pages that have reader text `[check: RC4 smoke-read.log:67]`.

##### 15.25.6 First-visit panel

- The panel opens on the first text screen of an account without `reader.panelSeen`. Example: the page view of `left_foot_full` p048 `[check: RC4 smoke-read.log:69]`.
- The book screen has no panel. An account that waits for approval has no panel. A translator sees the panel once `[check: RC4 smoke-read.log:70,72,77]`.
- A web article has the panel without the Image line `[check: RC4 smoke-read.log:71]`.
- "Start reading" or Esc closes the panel and saves the mark. The next visit has no panel `[check: RC4 run-browser.out:30-31]`.
- "Reset text settings" keeps the mark. A bad value for `panelSeen` gives status 400 `[check: RC4 smoke-read.log:75-76]`.
- Phone: the panel stays as built (round 70 answer 8, "Keep as built (Recommended)").

##### 15.25.7 Front door

- Monitor dashboard (/ on this Mac): `/` keeps the runs table for a visitor, a reader, and an admin `[check: RC4 smoke-read.log:68]`.
- Hosted site (monitor off): a visitor goes to `/sign-in`. A reader goes to `/read`. A translator and an admin go to `/translate` `[check: RC4 smoke-deploy.log:4,33-35]`.
- A cookie with a bad token counts as no session and goes to `/sign-in` `[check: RC4 smoke-deploy.log:36]`.

##### 15.25.8 Sync command S2

- S2 copies 347 metadata rows into `catalog_items`: 25 books, 9 magazine years, 2 web captures, and 311 web articles `[check: RC4 s2-apply.log, line "Catalog: 347 metadata rows"]`.
- The slug of a web article is the first 8 characters of its `item_id`.
- S2 writes `translated`, `placement`, `search_ja`, and `search_en`. The field name `translated` is the RC4b name. After the S2 run of 2026-10-30 01:07, 347 of 347 `catalog_items` records hold `translated` and 0 hold `finished`. All 29 `reader_pages` records hold `search_ja` and `search_en` `[check: aki-main 2026-10-30 01:08 count71.py]`.
- The log of S2 reads: "Placement: 311 web articles, 36 with a print stamp, 0 override row(s) change a month" `[check: RC4 s2-apply.log]`.
- If the server lacks the four fields, the dry run prints a warning that ends "Restart PocketBase so that migration 1793300010 runs." The option `--apply` stops `[file: app/scripts/sync-runs.mjs:676-692]`.
- First dry run after the database update: `catalog_items` create 310 and update 37, `reader_pages` update 29, `page_runs` unchanged 42, and `magazine_chapters` unchanged 103 `[check: RC4 upgrade-new-dry.log]`.
- A second dry run says "unchanged" for every record `[check: RC4 s2-dry-second.log]`.
- The page `kendojidai_2014/p0839` gets no `reader_pages` record. The 29 records hold 0.88 MB. The 42 snapshots hold 2.34 MB `[check: RC4 s2-apply.log]`.

##### 15.25.9 Tolerance mode

- The Viewer also runs on a database without migration 1793300010. In that state `/read` shows 32 works (37 rows, 5 hidden) `[check: RC4 smoke-tolerance.log:3]`.
- A search shows "Search needs the next database update (S2)." and no page hit `[check: RC4 smoke-tolerance.log:8]`.
- The panel mark `panelSeen` saves without the migration. A web article that the old database lacks gives the 404 page and no error 500 `[check: RC4 smoke-tolerance.log]`.
- `/translate` keeps 37 rows for a translator `[check: RC4 smoke-tolerance.log:17]`.

##### 15.25.10 Tests of unit RC4

| Test | Result |
|---|---|
| smoke, mode `smoke` | 70 PASS |
| smoke, modes `htv` (files and PocketBase) | 262 PASS each |
| smoke, mode `deploy` | 39 PASS |
| smoke, mode `read` | 287 PASS |
| smoke, mode `folds` | 41 PASS |
| smoke, mode `tolerance` | 19 PASS |
| hook test | 62 PASS |
| page image test | 82 PASS |
| `test_local.py` | 257 PASS, 0 FAIL |
| Chrome run | 137 PASS, 0 FAIL, 84 screenshots in `<TMP>/r70/RC4/shots/` |

- Source of the table: `[check: DV71 2026-10-30 00:07 grep -c "^PASS" on the logs of RC4]` and the last lines of `run-browser.out`, `run-read-s2research-hook.out`, and `test_local.log`.
- The table holds the numbers of RC4. Unit RC4b ran the tests again on a fresh throwaway PocketBase on port 8092, all with 0 FAIL. The `tsc`, lint, build, and contrast checks passed. New numbers: smoke 70, htv files 262, htv PocketBase 262, deploy 39, read 292 (RC4: 287), folds 44 (RC4: 41), tolerance 20 (RC4: 19). Hook test 62, page image test 82, `test_local.py` 258 (RC4: 257), and Chrome run 138 (RC4: 137) with 84 screenshots in `<TMP>/r71/RC4b/shots/` `[check: RC4b 2026-10-30 00:45 unit report]`. DF71 counted the PASS lines in the logs of `<TMP>/r71/RC4b/` and found the same numbers, except the hook count `[check: DF71 2026-10-30 01:12 grep -c "^PASS"]`.

##### 15.25.11 Owner answers of round 70, answers 1 to 9

Source: `[file: .opencode/reminders/qa/qa-memory-2026-10-29.md:116-124]`.

- Answer 1, line 116: "Update 8090, then I look (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.
- Answer 2, line 117: "aki-main does it now, with backup (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.
- Answer 3, line 118: "Pages with translation that reader can view\nuse the CORRECT word. `translated` instead of `finished`\nAlso reader can open any page, just no translated data. Be concise with your wording." `[user 2026-10-29 23:36]`.
- Answer 4, line 119: "Any verdict, FAIL noted (Recommended)" `[accepted recommendation 2026-10-29 23:36]`. It applies to "pages done" on the Monitor dashboard.
- Answer 5, line 120: "option 1. The 311 web articles ARE kendojidai 2019 to 2025 right?" `[accepted option 1 with direct question 2026-10-29 23:36]`. aki-main checked the data and answered yes (line 141).
- Answer 6, line 121: "Print month (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.
- Answer 7, line 122: "Accept 3 clicks, use search (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.
- Answer 8, line 123: "Keep as built (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.
- Answer 9, line 124: "Same wording on year rows (Recommended)" `[accepted recommendation 2026-10-29 23:36]`.

##### 15.25.12 Open items

- The owner checked the Reader dashboard and gave feedback in round 71 answer 1: arrow keys, the question about the 2019-2025 web articles, and a ToC for books. The local PocketBase on port 8090 holds the update (migration 1793300010 at 01:06, then S2 at 01:07, section 15.25.14). The Reader dashboard is not accepted yet.
- The open items 1 to 11 of section 15.23.9 are decided. Round 69 answers 7 to 15 and round 70 answers 3 and 5 to 9 hold the decisions.
- Unit RC4b returned at about 2026-10-30 00:45. The marks of RC4b are filled. Two open items from its report are in section 15.25.15.

##### 15.25.13 Not verified

- The Reader dashboard in a browser of the owner, on a real phone, in Safari, and in Firefox.
- The speed of the search over 13,303 pages. The test ran with 29 pages that have reader text.
- The deployed app on Vercel and the server PocketBase.
- The RC4b test numbers come from its report and logs. DF71 did not run the tests again, and did not read the `tsc` output, the build output, or the hook count 62. The three row texts of section 15.25.4 and the year rows are Not verified on the live page.
- Whether a reader who waits for approval sees the progress line on port 8090 after the update.

##### 15.25.14 Local update of 8090 (aki-main, 2026-10-30 01:06 to 01:08)

- At 2026-10-30 01:06 aki-main stopped the old PocketBase process on port 8090 (PID 19063). aki-main started PocketBase again with the same command. The new PID is 98232 `[check: aki-main 2026-10-30 01:06]`.
- Backup of the stopped data folder: `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r71/pb-backup/pb_data-20261030-0106-stopped`, with the sums in `SHA256SUMS-20261030-0106` `[check: aki-main 2026-10-30 01:06]`.
- Health check: `{"message":"API is healthy.","code":200,...}`. The start applied migration 1793300010. S2 found all four new fields and printed no warning about an absent field `[check: aki-main 2026-10-30 01:06]`.
- S2 ran three times from `<V2>/app` with `node scripts/sync-runs.mjs --superuser superuser@kendo-translation.local`. The password came from stdin. The runs were a dry run, `--apply`, and a second dry run. The outputs are `<TMP>/r71/S2/dry.txt`, `apply.txt`, and `dry2.txt`.
- Result of `--apply`: `page_runs` unchanged 42. `catalog_items` created 310, updated 37, failed 0. `magazine_chapters` unchanged 103. `reader_pages` updated 29, failed 0, skipped 1 (`kendojidai_2014/p0839`, only FAIL runs) `[check: aki-main 2026-10-30 01:07 S2]`.
- The second dry run found nothing to create or update. The size of the 29 `reader_pages` records is 0.88 MB `[check: aki-main 2026-10-30 01:07 S2]`.
- Counts after the update: `page_runs` 42, `catalog_items` 347, `magazine_chapters` 103, `reader_pages` 29, `user_settings` 2, and `users` 7 `[check: aki-main 2026-10-30 01:08 count71.py]`.
- All 347 `catalog_items` records hold `translated`, and 0 hold `finished`. Research keys 0, Mac paths 0. 29 translated pages in 12 works `[check: aki-main 2026-10-30 01:08 count71.py]`.
- Kinds of `catalog_items`: book 25, magazine-year 9, web-capture 2, and web-article 311. All 311 web articles have `placement`. All 29 `reader_pages` records have `search_ja` and `search_en` `[check: aki-main 2026-10-30 01:08 count71.py]`.
- The record `18d4ac29` has the title "Kendo droplet guard" `[check: aki-main 2026-10-30 01:08 count71.py]`.
- 36 web articles hold a print stamp. September 2018 holds 5 web articles in a web-only month, because the volume `kendojidai_2018` covers January to April only `[check: aki-main 2026-10-30 01:08 count71.py]`.
- Live check of the Reader dashboard (/read). The owner dev server on port 3000 ran against 8090. The account was `reader@kendo-translation.local`. The total line reads "342 works, 13,303 pages. English: 28 of 13,303 pages translated (0." The check file cut the line at "(0." `[check: aki-main 2026-10-30 01:08 read_check.py]`.
- The same check: 0 words "finished" and 223 words "translated" on `/read`, and no tolerance line. The Books fold reads "22 works · 4,821 pages English: 20 of 4,821 pages translated (0.4 percent)" `[check: aki-main 2026-10-30 01:08 read_check.py]`.
- The same check: "August 2011 14 articles · pages 591-674 · 2 web articles English: 0 of 86 pages translated (0.0 percent)" and "September 2018 5 web articles English: 0 of 5 pages translated (0.0 percent)" `[check: aki-main 2026-10-30 01:08 read_check.py]`.
- The same check: `/read?q=seme` shows "10 pages in 3 works by text", and `/read?q=chuzumi` shows "2 pages in 1 work by text" (The Secret of Kendo and the Left Foot). The Monitor dashboard (`/`) answers 200 `[check: aki-main 2026-10-30 01:08 read_check.py]`.
- The total of 28 equals Books 20 plus Kendo Jidai 8. The 29th translated page belongs to the hidden work `men0` `[agent inference]`. After unit RT73a the total is 1,151, which equals Books 20 plus Kendo Jidai 1,131 `[check: DZ73 2026-10-31 15:25 smoke-web.log, lines 3 and 4]`.
- Readers on 8090: the account `reader@kendo-translation.local` has 7 saved values. Every approved account sees the first-visit panel once (round 69 answer 13). Not verified in a browser.

##### 15.25.15 Open items of unit RC4b (round 71)

- Open item 1, article rows. An article row inside an open month uses the short form, for example "2 translated" `[file: app/components/ReaderRows.tsx:72]` `[check: RC4b 2026-10-30 00:45 unit report]`. Option (a), recommended by RC4b: keep the short form "2 translated". Option (b): use the full form "2 of 3 pages translated".
- Open item 2, year row count. A year row note counts magazine pages, and the line counts a web article as 1 page. Example after unit RT73a: "Kendo Jidai 2012 949 pages · 3 web articles English: 11 of 958 pages translated (1.1 percent)" and "Kendo Jidai 2014 1,051 pages · 3 web articles English: 15 of 1,061 pages translated (1.4 percent)" `[check: DZ73 2026-10-31 15:25 grep -n "11 of 958" /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/smoke-read.log, line 70]`. Old example, replaced: "Kendo Jidai 2012 949 pages · 3 web articles English: 2 of 952 pages translated (0.2 percent)" `[check: RC4b 2026-10-30 00:45 unit report]`. Option (a), recommended: keep 949 and 958. RT73a counts the A4 pages of the web articles of the year. Option (b): count only magazine pages in the year line.
- Open item 3, owner check. The owner looks at the Reader dashboard (/read) on port 8090 with the steps in `.opencode/aki-main/owner-hand-steps.md` section 11. The check is still pending.

Status: code built, local PocketBase updated, waiting for the owner check (round 71).

#### 15.26 Text-only works, reader components and panels (design, unit DW73, rounds 72 to 73c)

- Status: design. No code, no database record, and no data file changed. Unit RT73 builds it after the owner checks the readings of 15.26.18 and the restatement of unit DW73.
- This section replaces the draft of unit DT73b. The draft lived in the temp folder only. It never sat in this file.
- Screens: "Reader dashboard `/read`" lists the works. "Book screen `/read/<slug>`" shows one work page by page. "Monitor dashboard `/` on this Mac" is not part of this section. "`/translate`" is the page of the translators.
- Words: a *component* is one item in the list that the reader checks. A *panel* is one screen area that holds one component `[file: docs/VISION-viewer.md:53-54]`.
- More words: "Agent text" is the EN-trans-machine text (the `ED_3` text of a run). "Human version" is the EN-trans-human text. "JA source text" is the Japanese text of the work. "Page image" is the scan of the printed page.
- More words: "v1 placeholder" is the text of the v1 md files that the browser Gemini agent made in v1. It fills the display until a v2 text exists. "Page line" is the short line at the top of a text panel `[file: docs/VISION-viewer.md:249]`. "Work block" is the metadata block of the book screen.
- Words of the new design: the "Components button" opens the "component list". The "title bar" is the top bar of a panel. A "fact mark" shows a fact of the JA that the EN changed or left out.
- Evidence tags: `[file: path:line]` for a file. `[check: DW73 2026-10-30 HH:MM command]` for a command of this unit. `[check: DT73b ...]` for a number that unit DT73b checked. `[agent inference]` for a conclusion. A fact without a tag is Not verified.
- Check scripts of this unit: `<TMP>/r73/DW73/check/` (`jaonly.py`, `jaonly2.py`). Check scripts of unit DT73b: `<TMP>/r73/DT73b/check/`.
- Size unit: 1 MB = 1,048,576 bytes, as in `app/scripts/sync-runs.mjs:42`.
- Each design point carries one mark: "decided" (owner quote and Q-A line), "unit default" (with the other option), or "open item" (for the owner).
- Lines of this file that still say "1 page" for a web article are l3433, l4446, and l4577. Unit RT73 fixes them with the code.

##### 15.26.1 Sources and owner words

###### 15.26.1.1 Vision lines that this design follows

- l40 `[user 2026-10-07 20:05]`: "Viewer focus on two objection:\n+ Best user reading experience and efficiency\n+ user Flexible and customizable UI for reading components".
- l49, fast comparison: "a tap on a sentence marks its pair in the other panels, and the panels scroll together". See 15.26.6.6.
- l53 and l54: a component is "one item in the list that the reader checks, for example a text in one language". A panel is "one screen area that holds one component".
- l102 to l107: three EN kinds. EN-original, EN-trans-human (the kendojidai EN of the 313 article pairs), and EN-trans-machine (the `ED_3` text).
- l108 to l110: "No EN-original item enters the Viewer now". So no EN-original component has data.
- l111 to l113: "As published, facts marked". "A mark on each changed fact shows the JA fact".
- l116: "Content arrives EN first, then ZH, KO, and VI, per work".
- l120: "The JA source is always a component".
- l129 to l131: the raw data view of a book is "a page image plus JA text with ruby". The raw data view of an article is "the JA text".
- l158 to l161: pair 252, record `b5106cae-44f6-4a27-a91f-8c75312fcce9`. The JA says 世界選手権大会団体優勝4回. The EN-trans-human text says "team title 3 times". "Its fact mark shows the JA fact 4".
- l178 `[user 2026-10-07 14:05]`: "add/remove components (raw images, text in different languages, ruby, bilingual pairing, etc) - these components should be a list that reader checks to selects. User should also able to move, resize, hide, show, etc customize their panels".
- l180 to l187, the component list. It names the page image of the original (books only), the JA source text, and ruby. It also names EN-trans-human, EN-trans-machine, and ZH KO VI text "when each arrives". The last two items are bilingual pairing and kendo term highlights.
- l188 to l192: "The reader checks components in the list". "The reader moves, resizes, hides, and shows panels". "Reader picks first". "The layout is saved per account, across all devices". "Phones are in scope, with a simpler layout".
- l212 and l213: the Reader dashboard `/read` counts a page as translated when readers can view its English text. Any page opens, also a page with no translated text.
- l214: "Search covers all works in all languages".
- l246 to l251: the AI label sits in the work block and on the page line. "Human versions carry no AI label".
- l255 to l262, section 12: A4 pages for articles without printed page numbers. "Each translation follows the JA page breaks". Decided size: 40 characters per line, 36 lines, 1,440 characters per page.
- l2716 to l2769, section 15.19.5: the agent text is the default. An admin chooses one Human version per page on `/admin/versions`. The toolbar reads "EN text: Agent | Human". The page line of a chosen version reads "Human translation. Chosen by an admin.".
- l2780 to l2803, section 15.19.6: the `reader` key of `user_settings.panes`. The settings panel holds "Text (EN, JA, Pairing), EN text (Agent, Human)".
- l2805 to l2834, section 15.19.7: the phone layout. One column. "Bilingual pairing stacks JA above EN for each row". "The original page image is a tab above the text".

###### 15.26.1.2 Owner words of rounds 72 to 73c

All in `.opencode/reminders/qa/qa-memory-2026-10-30.md`.

- l30, round 72 answer 2 `[user 2026-10-30 09:28]`: "Why is there an articlw with only 1 page? \nEven if there is no translated data, you still have to show the full original data\nIn case of text only article, show the original text\nAlso most of the kendojidai article 2019-2025 HAVE the translation (human translation). Why they are not shown? What happen to the discussion we have about different translation data type that user can choose to view?"
- l31, round 72 answer 3: "Check previous answer. We talked about this. For ones with only original text instead of image, read the image button with original-text button".
- l62 and l63, round 73 answers 1 and 2 `[accepted recommendation 2026-10-30 10:42]`: "Reading right (Recommended)".
- l65 to l67, round 73 answers 4 to 6 `[accepted recommendation 2026-10-30 10:42]`: "Source A, units.jsonl (Recommended)", "Chosen by default (Recommended)", "All 311 go in (Recommended)".
- l68, round 73 answer 7 `[user 2026-10-30 10:42]`: "Are they really just 1-page per article? If yes then option 2.\nAlso add kendojidai to the book name 2019 -> 2025".
- l71, round 73 answer 10 `[user 2026-10-30 10:42]`: "option 1. But for now, you can use the v1 data in universal-agent as place-holder text (those are data generated by browser-based gemini agent)."
- l87, round 73b answer 6 `[user 2026-10-30 15:35]`: "We talked about splitting article into A4 page right? Did you need do it for 2019->2025 kendojidai?"
- l88, round 73b answer 7: "We talked about it in Viewer Vision no? There is original-EN (text that is originally written in EN),  human-EN (text that is translated by human to EN), agent-EN (text that is translated by agent to EN), and reader can choose what to show in their customizable UI\nDid you even review the Viewer vision yet?"
- l89, answer 8: "Also dropped facts" `[accepted option 2026-10-30 15:35]`.
- l90, answer 9: "JA column beside EN (Recommended)" `[accepted recommendation 2026-10-30 15:35]`.
- l91, answer 10: "Not translated, not searched (Recommended)" `[accepted recommendation 2026-10-30 15:35]`.
- l92, answer 11: "v1 Gemini translation placeholder." `[user 2026-10-30 15:35]`.
- l93, answer 12: "No link now (Recommended)" `[accepted recommendation 2026-10-30 15:35]`.
- l94, answer 13: "User can swap between them, and also show both of them." `[user 2026-10-30 15:35]`.
- l95, answer 14 `[user 2026-10-30 15:35]`: "+ sentence row\n+ I SAID USER CAN VIEW WHAT IS AVAILABLE IN THE VIEWER VISION. Review it properly\n+ keep it\n+ If ZH is available in v1, User can view the ZH v1 placeholder".
- l108, round 73c answer 2 `[accepted recommendation 2026-10-30 20:17]` `[user 2026-10-30 20:17]`: "Reading 1, A4 pages (Recommended), Reading 2, sentence rows (Recommended), Reading 3, what is available (Recommended), Reading 4, Agent text first (Recommended), Reading 5, counts (Recommended), Reading 6, Kendo Jidai 2019 (Recommended), `placeholder` DOES NOT COUNT AS ANYTHING. They are just placeholder and will be replaced in the future".
- l109, answer 3 `[user 2026-10-30 20:17]`: "option 1. v1 tranlsation are simply just placeholder, for display testing purpose ONLY."
- l110, answer 4 `[user 2026-10-30 20:17]`: "option 3. Do the text-only button also". Option 3 was the Viewer vision section 7 in full.
- l111, answer 5: "Separate component, off at first (Recommended)". l112, answer 6: "Small tag after the sentence". l113, answer 7: "From kendojidai.com (Recommended)".
- l114, answer 8: "Drop them, small Translator fix (Recommended)". l116, answer 10: "Run program reads the mark per page (Recommended)". l119, answer 13: "Row stays until the book runs (Recommended)". l120, answer 14: "DW73 + TF73 now, RT73 after DW73 check (Recommended)".
- l122 to l124, notes of aki-main (not owner words): the v1 placeholder counts in no number on any screen. The v1 ZH placeholder shows as one component. Answer 4 widens round 62 answer 8. All three were `[reading pending owner check]`. Round 73d answer 2 validated the readings of answers 2 and 3 `[validated reading 2026-10-30 22:04]` (`.opencode/reminders/qa/qa-memory-2026-10-30.md:130`). The reading of answer 4 (l124) stays `[reading pending owner check]`.

###### 15.26.1.3 Earlier decisions that this design applies

- `qa-memory-2026-10-07.md:37` `[user]`: "Reader can have diffent component options for the same languagues (i.e., EN-original, EN-translated)".
- `qa-memory-2026-10-07.md:97`: "Need to specif `EN-translated` to `EN-trans-human` (human translation), and `EN-trans-machine` (machine translation)".
- `qa-memory-2026-10-07.md:106`: "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines." The reading is validated at l132: "Correct reading (Recommended)".
- `qa-memory-2026-10-07.md:129`: "option 1. but EN-original mean the item is originally written in English".
- `qa-memory-2026-10-07.md:130`: "As published, facts marked (Recommended)".
- `qa-memory-2026-10-08.md:45`: human versions carry no AI label.
- `qa-memory-2026-10-25.md:114`: "40 x 36, 10.5 pt (Recommended)". `qa-memory-2026-10-25.md:147`: "Each block starts a new line (Recommended)".
- `qa-memory-2026-10-26.md:134` `[user 2026-10-26 21:33]`: "Human translation are stored as separate user's translation, not an update of agent translation".
- `qa-memory-2026-10-28.md:289`, round 62 answer 7 `[user 2026-10-29 10:36]`: "option 3, with option 1 as default. Admin can choose which human versionn to show". The text of options 1 and 3 is not in the Q-A files. Line 300 holds the reading of aki-main: the agent text is the default and an admin chooses one Human version per page `[reading pending owner check]`.
- `qa-memory-2026-10-28.md:290`, round 62 answer 8: "Single language EN or JA (Recommended), Bilingual pairing (Recommended), Themes, fonts, size (Recommended), Page and Scroll switch (Recommended), Original page image, Focus mode".
- `qa-memory-2026-10-28.md:293`, round 62 answer 11 `[accepted recommendation 2026-10-29 10:36]`: "ZH, KO, VI stay out (Recommended), Report button stays out (Recommended), Ruby stays out (Recommended)".
- `qa-memory-2026-10-28.md:310`, round 63 answer 6: "Admin page /admin/versions (Recommended), Collection page_checks (Recommended)".
- `qa-memory-2026-10-29.md:118` (round 70 answer 3): "Pages with translation that reader can view\nuse the CORRECT word. `translated` instead of `finished`\nAlso reader can open any page, just no translated data. Be concise with your wording."
- `qa-memory-2026-10-02.md:71`: triplet.json is "level-0 machine output, baseline only, never reference". The rule is about Translator retrieval. The v1 placeholder is a display use in the Reader `[agent inference]`. Round 73 answer 10 is the owner decision for it.

###### 15.26.1.4 Conflicts between decisions

- Conflict 1, ZH. Round 62 answer 11 (`qa-memory-2026-10-28.md:293`, `[accepted recommendation 2026-10-29 10:36]`) says "ZH, KO, VI stay out (Recommended)". Round 73b answer 14 (`qa-memory-2026-10-30.md:95`) says "If ZH is available in v1, User can view the ZH v1 placeholder". Round 73c answer 3 (`qa-memory-2026-10-30.md:109`) picks option 1: the v1 ZH placeholder shows, "for display testing purpose ONLY". ZH agent text stays out. This section applies that reading `[validated reading 2026-10-30 22:04]` (`.opencode/reminders/qa/qa-memory-2026-10-30.md:130`, round 73d answer 2).
- Conflict 2, pages of a web article. Round 73 answer 7 (`qa-memory-2026-10-30.md:68`, 2026-10-30 10:42) says "Are they really just 1-page per article? If yes then option 2." Round 73b answer 6 (`qa-memory-2026-10-30.md:87`, 2026-10-30 15:35) asks for the A4 split. Round 73c answer 2 accepts "Reading 1, A4 pages". The A4 split holds.
- Conflict 3, the control for the EN texts. Round 73 answer 2 (`qa-memory-2026-10-30.md:63`) accepted the toolbar "EN text: Agent | Human". Round 73b answers 13 and 14 ask for swap, both, and "WHAT IS AVAILABLE IN THE VIEWER VISION". Round 73c answer 4 picks the Viewer vision section 7 in full. The component list replaces the toolbar control (15.26.6.4).
- Conflict 4, views of the first reader version. Round 62 answer 8 (`qa-memory-2026-10-28.md:290`) lists the views. The list has no panel move, resize, hide, or show. Vision l189 asks for them. Round 73c answer 4 widens the first reader version `[reading pending owner check]` (`qa-memory-2026-10-30.md:124`).
- Observation, not a conflict of the owner: the table of 15.19.6 says `reader.image` defaults to `false` (l2795). The code sets `image: true` since unit RC3 `[file: app/lib/htv-settings.ts:187]`.

##### 15.26.2 The problem today

Example. The web article d7835263-fe16-4f05-8c51-98b2a8aa0a3e. Title JA 王者は面をどう打つか：北条将臣. Title EN "How do elite swordsmen hit men? : Hojo Masaomi". It was published on kendojidai.net on 2019-10-21. It was printed in Kendo Jidai 2012 February (stamp "2012.2 KENDOJIDAI"). It has 90 units: 86 aligned units and 4 added units `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`.

What a reader sees today. This list comes from code reading. Not verified on a live screen.

- Reader dashboard `/read`: the row of d7835263 reads "English: 0 of 1 page translated (0.0 percent)". It has no "Start at" link `[file: app/lib/reader-folds.ts:127-134]`.
- Book screen `/read/d7835263`: the metadata line reads "1 pages" `[file: app/components/ReaderBook.tsx:333]`. The screen has no "Start reading" button, because `start` is `resumeAt ?? textPages[0] ?? null` `[file: app/components/ReaderBook.tsx:361]`.
- At `?at=p001` the screen draws `emptyPage` with the line "No agent translation yet" `[file: app/components/ReaderBook.tsx:423]` `[file: app/lib/reader-types.ts:178]`.
- The JA source text never shows. The reader bar has no Image button for a web article `[file: app/components/ReaderBook.tsx:510]`. The Human version never shows.
- Cause: the sync command S2 builds `reader_pages` only from agent page runs. The 311 web articles have `pages` 0 `[file: app/scripts/sync-runs.mjs:9-14]`.

The same gap exists for books. Example: `left_foot_full` page 51 has a page image and no agent run. The page shows "No agent translation yet" and nothing else. The v1 md file of this page holds JA, EN, and ZH lines (15.26.9).

The owner rule that the system broke: "Even if there is no translated data, you still have to show the full original data" (`qa-memory-2026-10-30.md:30`). And: "USER CAN VIEW WHAT IS AVAILABLE IN THE VIEWER VISION" (`qa-memory-2026-10-30.md:95`).

##### 15.26.3 A4 pages of a web article

Decided: `qa-memory-2026-10-07.md:106`, `qa-memory-2026-10-25.md:114,147`, and round 73c answer 2 "Reading 1, A4 pages" (`qa-memory-2026-10-30.md:108`). Vision l262 gives the size.

The Translator already cuts the pages. The agent runs and the Human version use the same cut, so that "each translation follows the JA page breaks" (l261).

- Constants: 40 characters per line, 36 lines `[file: <T2>/data/scripts/translator/programs.py:30-31]`.
- `load_web_units` takes the units of one article that have JA text and are not `site_text` `[file: <T2>/data/scripts/translator/programs.py:55-70]`.
- `a4_cut` starts each JA block on a new line. A unit stays whole on the page of its first line `[file: <T2>/data/scripts/translator/programs.py:73-99]`.
- `translator_run.py` uses the cut and writes `a4_cut.json` `[file: <T2>/data/scripts/translator_run.py:443-456]`.
- Page ID form: `<slug>/p<NNN>` with 3 digits. Example `d7835263/p002`. The pilot page `18d4ac29/p001` keeps its ID `[check: DT73b 2026-10-30 15:54 cat page.json]`.

Result for the 311 articles `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`:

| Pages per article | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Articles | 6 | 36 | 100 | 116 | 39 | 10 | 3 | 1 |

- The cut gives 1,126 pages. 1,124 pages hold at least one unit. Two pages hold none: `c7bb369d` page 4 of 4 and `ba9de4c8` page 5 of 5 `[check: DT73b 2026-10-30 15:56 python3 -B empty_pages.py]`.
- Decided in round 73c answer 8 (`qa-memory-2026-10-30.md:114`): "Drop them, small Translator fix (Recommended)". The two empty pages go away. `c7bb369d` has 3 pages. `ba9de4c8` has 4 pages. The Reader uses 1,124 pages.
- Unit TF73 fixes `a4_cut` in the Translator (round 73c answer 14, `qa-memory-2026-10-30.md:120`). Not verified: the result of TF73. Until TF73 returns, the page file of 15.26.3 can hold 1,126 pages. Unit RT73 must test for 1,124.
- Observation: `translator_run.py:452` reads `cut["units"][0]`. For an empty page this raises an IndexError `[agent inference, not run]`.
- 31 pages hold more than 1,440 JA characters, because a unit stays whole. The largest page holds 1,511 characters `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`.

Worked example, d7835263 `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`:

| Page | A4 units (first to last) | A4 lines | JA characters | Rows (first to last, count) | EN characters |
|---|---|---|---|---|---|
| `d7835263/p001` | U003 to U034 (31) | 36 | 1,325 | U003 to U034 (32) | 3,342 |
| `d7835263/p002` | U035 to U066 (32) | 36 | 1,337 | U035 to U066 (32) | 3,844 |
| `d7835263/p003` | U067 to U082 (16) | 17 | 585 | U067 to U086 (20) | 1,584 |

- Page 1 starts with U003, the note "※この記事は『剣道時代 2012年2月号』に掲載されたものです。" (block type `magazine_note`). The units U001 "Tweet" and U002 "Pocket" make no row (15.26.4).
- Page 1 holds the row U006 with the EN "Profile" and no JA. The A4 cut skips it, because it has no JA. It takes the page of the row before it.
- Page 3 holds four rows after U082: U083 "Debana-men" (EN only), U084 "関連" (JA only), U085 "Hojo Masaomi", and U086 "Men". They are `site_text` rows that the A4 cut skips.
- For 18d4ac29: 1 page, 21 A4 lines, 522 JA characters `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`. This equals `a4_cut.json` of the pilot run `[check: DT73b 2026-10-30 15:54 python3 read of a4_cut.json]`.

Where the other units go (unit default D1):

- A unit that the A4 cut skips takes the page of the unit before it in file order. It takes page 1 if no unit is before it. Cases: 649 `site_text` units and 633 units with no JA text, 1,282 in all.
- 52 articles start with such a unit. Example: 18d4ac29 U001 "無料記事" with the EN "FREE ARTICLE" goes to page 1.
- The other option, the page of the next unit, moves only 1 of the 1,282 units. The choice has almost no effect.
- The 1,419 added units make no row and get no page (D2). Each added unit holds no EN text of its own. Its field `source_en` equals the EN text of its source unit in 1,419 of 1,419 cases. Its JA text (`ja_added`) comes from an annotator agent, not from the author. Example: `u_d7835263_U042_A01` has `ja_added` "手が先に動くと" for the EN words "your hands move first". Its source unit U042 sits on page 2 and shows the EN already.

Effect on the Reader dashboard `/read` `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`:

- Today: Books 4,821 pages, magazine years 8,171 pages, web articles 311 pages (1 each). Total 13,303 pages. This equals the live line "342 works, 13,303 pages" `[file: docs/VISION-viewer.md:4448]`.
- New: 4,821 + 8,171 + 1,124 = 14,116 pages.
- Code: `workPages` returns 1 for a web article `[file: app/lib/reader-folds.ts:127-130]`. It must return the page count that S2 writes into `catalog_items.pages`.
- `loadReaderIndex` sets `images: f.pages > 0` `[file: app/lib/reader-data.ts:179]`. With real page counts, the test is true for a web article, and the screen shows an Image button with no image. The code needs a kind test (15.26.6.1).

S2 is a Node script and `a4_cut` is Python. S2 cannot call it `[file: app/scripts/sync-runs.mjs:23]` ("Node built-ins only"). Unit default D3: a small Python script in the Translator repo imports `programs.a4_cut` and writes one file with the page of every unit. S2 reads that file. Other option: a copy of the rule in JavaScript. Cost: two copies of one rule can drift. A test must compare both on all 311 articles.

##### 15.26.4 Sentence rows

Decided: round 73b answer 14, "+ sentence row" (`qa-memory-2026-10-30.md:95`), and round 73c answer 2 "Reading 2, sentence rows".

- One row for each aligned unit of `units.jsonl`, in file order. The key form is `<slug>/p<NNN>/web/<work_unit_id>`. Example: `d7835263/p001/web/U004`. The agent rows use `<page_id>/ts3/<first>-<last>` `[file: docs/VISION-viewer.md:2751]`.
- Counts `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py and facts_sizes.py]`: 34,575 aligned units, minus 622 units "Tweet" and "Pocket", give 33,953 rows. 32,937 rows have EN text. 1,016 rows have JA only. 765 rows have EN only.
- The two noise sentences "Tweet" and "Pocket" make no row. The rebuilt JA and EN have the same count of characters as the snapshot in 311 of 311 records `[check: DT73b 2026-10-30 16:03 python3 -B rebuild_check.py, variant Z]`.
- JA text of a row: line breaks inside the unit become nothing. EN text: a line break becomes one space. Example: U003 JA "※この記事は『\n\n剣道時代 2012年2月号\n\n』に掲載されたものです。" becomes "※この記事は『剣道時代 2012年2月号』に掲載されたものです。".
- Row type: a row of block type `heading` or `name_heading` is a title row (`part` "block_title"). Other rows are `lines` `[file: app/lib/reader-types.ts:19]`.
- A row with one side empty is allowed. Example: U006 has the EN "Profile" and no JA. U084 has the JA "関連" and no EN.

Rows of d7835263 page 1, the first five `[check: DT73b 2026-10-30 16:00 python3 -B, sample_rows.txt]`:

| Row | JA | EN as published |
|---|---|---|
| U003 | ※この記事は『剣道時代 2012年2月号』に掲載されたものです。 | 2012.2　KENDOJIDAI |
| U004 | 剣道はなぜ面なのか。 | Why is kendo all about men? |
| U005 | これぞ会心の面。面を打ちたいあなたのために寺本将司、髙鍋進、北条将臣、佐藤博光があきらかにする。 | To attain the ultimate men-strike, we bring the expert views of Teramoto Shoji, Takanabe Susumu, Hojo Masaomi and Sato Hiromitsu to you. |
| U006 | (none) | Profile |
| U007 | 北条将臣（ほうじょう・まさおみ）／教士七段　昭和４９年神奈川県生まれ。 | Hojo Masaomi Kyoshi 7th dan, born 1974 in Kanagawa Prefecture. |

Why sentence rows help. A tap on the EN row U004 marks the JA row U004 in the Original text panel (vision l49). The Human version rows share their keys with the JA rows, so the version needs no copy of the JA text (15.26.13).

##### 15.26.5 Components of a page

Components follow vision l180 to l187. A page draws a component only when the page has data for it. The component list shows a component with no data on this page in grey, with a short reason. This applies the owner words "USER CAN VIEW WHAT IS AVAILABLE IN THE VIEWER VISION" (`qa-memory-2026-10-30.md:95`). RT73b default 9 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): Page image counts as present when the work has page images.

Table. "Yes" means that the page has the data. The cell names the source.

| Component | d7835263 p001 (web, no run) | 18d4ac29 p001 (web, run) | left_foot_full p050 (run) | left_foot_full p051 (no run) | ogawa_lecture_part1 p281 (no run, no md file) |
|---|---|---|---|---|---|
| Page image | No. Text only. | No. Text only. | Yes. `p050.webp` | Yes. `p051.webp` | Yes. `p281.webp` |
| JA source text | Yes. Rows of `units.jsonl`. | Yes. `TS_3` lines of the run. | Yes. `TS_3` lines of the run. | Yes. The v1 JA line (a v1 placeholder). | No. |
| Agent text | No. | Yes. `ED_3` of the run. | Yes. `ED_3` of the run. | No. | No. |
| Human version | Yes. The kendojidai.com EN. | Yes. The kendojidai.com EN. | No data. | No data. | No data. |
| v1 EN placeholder | No. | No. | Yes. | Yes. | No. |
| v1 ZH placeholder | No. | No. | Yes. | Yes. | No. |
| EN-original | No data (vision l110). | No data. | No data. | No data. | No data. |
| Kendo term highlights | No. | Not verified. | Yes. Marks of the run. | No. | No. |

Sources of the v1 cells `[check: DT73b 2026-10-30 15:58 python3 -B v1_zh_check.py]`. The 31 visible book and magazine folders hold 12,992 pages. 12,717 pages have a v1 file with an EN line (4,696 book pages and 8,021 magazine pages). 11,317 pages have a ZH line (a line with Han characters and no kana). The page `ogawa_lecture_part1/p281` has no md file `[check: DT73b 2026-10-30 16:01 ls page-images and book-postprocessing]`.

Not in the first reader version (decided):

- Ruby: `qa-memory-2026-10-28.md:293` "Ruby stays out (Recommended)". The component list has no ruby row.
- ZH, KO, and VI agent text: `qa-memory-2026-10-28.md:293`. The v1 ZH placeholder is in (round 73c answer 3).
- EN-original: no data (vision l108 to l110). The component list does not show it until an item exists (D17). The saved value accepts its ID `enorig`, so a later unit needs no change of the sanitizer.

The v1 JA line on a page with no run and no `units.jsonl` rows (unit default D20). Example: `left_foot_full` p051. The v1 JA line is a v1 placeholder too, so it counts as nothing (round 73c answer 2). It fills the Original text panel when the page has no other JA source text.

- Page line of that panel: "v1 Gemini placeholder text."
- Other option: "v1 Gemini translation placeholder.", the owner line for v1 EN. Benefit: one line for all v1 text. Cost: the JA line is not a translation, so the line is wrong for JA.
- The owner gave only the line for v1 EN (`qa-memory-2026-10-30.md:92`). The JA line is a unit default. Round 73d answers 5 to 7 accepted it `[validated reading 2026-10-30 22:04]` (`.opencode/reminders/qa/qa-memory-2026-10-30.md:133-135`, reading 11 of unit DW73).
- On a page with a run, the Original text panel shows the `TS_3` JA lines and the v1 JA line stays unseen.

##### 15.26.6 Component list and panels

Decided: round 73c answer 4, "option 3. Do the text-only button also" (`qa-memory-2026-10-30.md:110`). The design below follows vision l178 to l192. Every point is a unit default unless it names an owner line. The code unit RT73 builds it (15.26.15).

###### 15.26.6.1 Parts and kinds of work

Parts of the book screen `/read/<slug>` on a wide screen, from the left:

- The page index, as today `[file: app/components/ReaderBook.tsx:492]`. It stays and collapses to a bar, as today.
- The reader bar. It holds the title, the view tools, the Components button, the page controls, Bookmark, Focus, and Settings `[file: app/components/ReaderBook.tsx:504-543]`.
- The panel row under the reader bar. One panel for each checked component that has data on the page.
- A panel has a title bar and a body. The title bar holds the name, the buttons Move left and Move right, the button Hide, and a resize handle at the right edge. The body holds the page line and the rows.

Two kinds of work (used for the saved layout and for the first layout):

- Kind `book`: a work with page images. Books and magazine years. `ReaderBookIndex.images` is true `[file: app/lib/reader-types.ts:155]`.
- Kind `article`: a work with no page image. The 311 web articles.
- The code test is `catalog_items.kind` (`web-article`) and not `f.pages > 0`, because a web article now has pages `[file: app/lib/reader-data.ts:179]`.

###### 15.26.6.2 The component list

Where it opens (unit default D4): a button "Components" in the reader bar, right after the view tools. A click opens the list as a dialog, like the settings dialog `[file: app/components/ReaderSettingsPanel.tsx:60-66]`. On a wide screen the dialog sits at the right edge. On a phone it is a sheet over the text. The button "Close" or the Esc key closes it.

- Other option: the list is a part of the settings panel of the cog. Benefit: one control less in the reader bar. Cost: two clicks to reach it, and the settings panel grows tall.
- The first-visit panel holds the same list as its first group (unit default D5). This follows vision l190 "Reader picks first" and `[file: docs/VISION-viewer.md:3594]`.

What the list holds. One row for each component, in the saved order. A row has a check box, the name, and a short note.

| ID | Name in the list | Note |
|---|---|---|
| `image` | Page image | Books and magazines only. |
| `ja` | Original text | The JA source text. |
| `agent` | Agent text | "AI translation". |
| `human` | Human version | "from kendojidai.com" or "chosen by an admin". |
| `v1en` | v1 EN placeholder | "v1 Gemini translation placeholder." |
| `v1zh` | v1 ZH placeholder | "for display testing purpose ONLY". |

Below the six rows, a group "Added to the panels" holds two check boxes: "Bilingual pairing" (15.26.6.5) and "Kendo term highlights" (vision l187). The button "Reset layout" ends the list.

Rules of the list:

- The list shows a component when the work has data for it on at least one page. Example: the list of `left_foot_full` has no Human version row, because no page has one. The list of d7835263 has no Page image row and no v1 rows.
- A row is grey when the work has the component but this page lacks it. The check box is disabled and keeps its saved state. The note gives the reason.
- Reasons: "No page image for this page". "Page view only" (Scroll view and Focus mode). "No Japanese text for this page". "No agent translation yet" (`NO_TEXT`, `[file: app/lib/reader-types.ts:178]`). "No human version for this page" `[file: app/components/ReaderBook.tsx:514]`. "No v1 text for this page". "No term marks on this page". "Needs Original text and one English text" (for Bilingual pairing).
- Other option for a grey row: the check box stays enabled. Benefit: the reader can choose a component for later pages. Cost: a check that changes nothing on this page confuses the reader.
- The button "Reset layout" removes `components`, `shown`, `widths`, `pair`, and `terms` from the saved value (15.26.6.9). The page then uses the first layout (15.26.6.7). The button "Reset text settings" in the settings panel does not change the layout. The button also removes `text`, `en`, and `image` through the field `clear` of `PUT /api/read/settings` (RT73b defaults 3 and 16, accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`) `[file: app/app/api/read/settings/route.ts:11-22]` `[file: app/lib/htv-settings.ts:206]`.

Mockup of the list, d7835263 p001 and left_foot_full p051 (grey rows show the reason):

```
Components                       [Close]     Components                              [Close]
 [x] Original text (JA)                       [x] Page image
 [x] Human version                            [ ] Original text (JA)
     from kendojidai.com                      [ ] Agent text    No agent translation yet
 Added to the panels                          [x] v1 EN placeholder
 [ ] Bilingual pairing                        [ ] v1 ZH placeholder
 [x] Kendo term highlights                    Added to the panels
     No term marks on this page               [ ] Bilingual pairing   (grey: needs Original text)
 [Reset layout]                               [ ] Kendo term highlights  No term marks on this page
```

The left list is the first layout of d7835263 p001. The right list is the first layout of left_foot_full p051.

###### 15.26.6.3 Panels: order, move, resize, hide, show

Order (unit default D6). The panels draw in the saved order `components`. The default order is: Page image, Original text, Agent text, Human version, v1 EN placeholder, v1 ZH placeholder.

- The Page image is first, as the image column is today `[file: app/components/ReaderImage.tsx:65]`.
- Other option: Original text first. Benefit: the reader meets the Japanese first. Cost: the image moves to the right of the text, against the habit of a book.

Move (unit default D7). Two ways, and both write the same saved order.

- The buttons "Move left" and "Move right" in the title bar. They are the keyboard way. The label reads "Move the Agent text panel left". The first panel has no Move left. The last panel has no Move right.
- A drag of the title bar. The reader presses on the name, drags over the other title bars, and drops. The new place is where the pointer lands.
- A move swaps with the next drawn panel. Components that the page does not draw keep their places in the order.
- Other option: buttons only. Benefit: less code and no drag test. Cost: the vision asks the reader to "move" panels, and most readers expect a drag.

Resize (unit default D8). One handle sits on the right edge of every panel except the last. It is the `DragHandle` of `HtvPanelFrame.tsx`.

- `DragHandle` is a client function with the props `side`, `width`, `min`, `max`, `onWidth`, `label`, and `attr` `[file: app/components/HtvPanelFrame.tsx:54-71]`.
- It has `role="separator"` and a pointer drag `[file: app/components/HtvPanelFrame.tsx:78,87-96]`.
- The arrow keys change the width by 16 px: "if (e.key === wider) onWidth(clamp(width + 16, min, max))" `[file: app/components/HtvPanelFrame.tsx:100-101]`.
- The book index already uses it with `side="right"` `[file: app/components/HtvIndex.tsx:103]`. Its limits are 160 to 400 px with 192 px as default `[file: app/lib/htv-settings.ts:121]`.
- The TL_3 information panel uses 280 to 720 px with 416 px as default `[file: app/lib/htv-settings.ts:93]`.
- Reader panels use the limits 280 and 720 px. They have no default in px.
- A panel with no saved width shares the free width of the row with the other such panels, in equal parts. The last panel always takes the rest.
- A drag sets a width in px for the panel on the left of the handle. The width goes into `widths` under the ID of that panel. RT73b default 11 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the width of a merged pairing panel is stored under `ja`, and the last panel ignores its saved width.
- If the panels need more width than the row has, the row scrolls sideways.
- Other option: widths as percent shares of the row, as `SHARE_LIMITS` does for the JA and agent columns `[file: app/lib/htv-settings.ts:95]`. Benefit: the layout fits any screen width. Cost: the handle code needs a new unit, and the owner words in round 58 answer 5 say "drag width" in px.

Hide and show (unit default D9).

- The button "Hide" (a cross) in the title bar unchecks the component. The panel goes away and its width stays saved.
- The reader shows the panel again with its check box in the component list.
- The last drawn panel has no Hide button. Its title reads "Keep at least one panel". Other option: allow zero panels and show the line "Check a component in the list". Benefit: the reader has full control. Cost: a blank screen against the owner rule that the reader sees what is available. RT73b default 4 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the only drawn panel cannot be unchecked `[file: app/components/ReaderPanels.tsx:75]`.

###### 15.26.6.4 Controls of today: what stays and what the list replaces

Round 73c answer 4 replaces the control "EN text: Agent | Human" of 15.19.5 (l2760) and the Text control. The table names each control.

| Control of today | Where | After RT73 |
|---|---|---|
| View: Page view, Scroll view | `ReaderBook.tsx:509` | Stays. |
| Button Image (books) | `ReaderBook.tsx:510` | Stays as a quick button. It checks or unchecks Page image. It is grey in Scroll view and Focus mode, as `IMAGE_PAGE_ONLY` says now. |
| Button Original text (new) | reader bar | Quick button on a work with no page image. It checks or unchecks Original text. It replaces Image on such a work (round 72 answer 3). |
| Text: EN, JA, Pairing | `ReaderBook.tsx:512` | The list replaces it. EN means Agent text, Human version, or v1 EN checked. JA means Original text checked. Pairing is the check box "Bilingual pairing". |
| English text: Agent, Human | `ReaderBook.tsx:513-514` | The list replaces it (round 73c answer 4). The note "No human version for this page" moves to the grey row. |
| Focus | `ReaderBook.tsx:536` | Stays (15.26.6.11). |
| Settings (cog) | `ReaderBook.tsx:539` | Stays. It loses the rows Text and English text `[file: app/components/ReaderSettingsPanel.tsx:75-83]`. |
| Components (new) | reader bar | Opens the component list. |

- Unit default D10: only the buttons Image and Original text stay as quick buttons.
- Other option: keep the Text control as a quick preset (EN, JA, Pairing) next to the Components button. Benefit: one click gives Japanese only. Cost: two controls change the same state, and the preset must handle every combination.
- The first-visit line about the Image button `[file: app/components/ReaderSettingsPanel.tsx:110-113]` stays for a work with page images. For a work with no page image it reads "Use the Original text button in the bar above the text to show or hide the Japanese text."
- The page keys (Left and Right arrow) stay as built `[file: app/components/ReaderBook.tsx:49]`.

###### 15.26.6.5 Bilingual pairing

Vision l186 lists "Bilingual pairing" as a component. In the list it is a check box in the group "Added to the panels" (unit default D11).

- When it is checked, the Original text panel and the first EN panel in the order draw as one panel. Each row shows the JA text beside the EN text. This is the pair mode of today `[file: app/components/ReaderPageView.tsx:102-106]`.
- The title bar reads "Original text and Agent text". The Hide button of this panel unchecks Bilingual pairing. The two panels then return side by side.
- The other EN panels stay as separate panels.
- Example: d7835263 p001 with Bilingual pairing checked. One panel shows U004 JA "剣道はなぜ面なのか。" beside the EN "Why is kendo all about men?".
- Other option: the pairing panel is a third panel and the two source panels stay. Benefit: the reader moves each panel alone. Cost: the same text shows twice.
- The box needs the JA source text and one EN text on the page. Else it is grey. RT73b default 5 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the box is grey until Original text and one English panel are drawn. The reason reads "Needs Original text and one English text".
- On a phone the pairing tab stacks JA above EN (15.19.7, l2827).

###### 15.26.6.6 Fast comparison

Vision l49: "a tap on a sentence marks its pair in the other panels, and the panels scroll together". Two panels pair when their rows carry the same row key. A row key is the value of `data-row` `[file: app/components/ReaderPageView.tsx:99]`.

Row keys by data:

| Key form | Panels that carry it |
|---|---|
| `<page_id>/ts3/<first>-<last>` (run key) | Original text and Agent text of a page with a run. Human version of a book page `[file: docs/VISION-viewer.md:2751]`. |
| `<slug>/p<NNN>/web/<work_unit_id>` (web key) | Original text and Human version of a web page with no run. |
| `<page_id>/v1/<NN>` (v1 key, new) | Original text (v1 JA), v1 EN placeholder, and v1 ZH placeholder of one md block. |

Which panels pair, with the real pages:

- d7835263 p001: Original text and Human version share web keys. They pair.
- 18d4ac29 p001: Original text and Agent text share run keys. The Human version has web keys. It does not pair with the other two (unit default D13). RT73b default 6 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): rows of two key families do not merge. The pair panel of 18d4ac29 uses the Human rows with their own JA.
- left_foot_full p050: Original text and Agent text pair. The v1 panels pair with each other and not with the Agent text.
- left_foot_full p051: Original text (v1 JA), v1 EN, and v1 ZH share v1 keys. All three pair.

Unit default D12:

- A tap on a row, outside a term mark or a fact mark, makes that row the active row. The row and its pairs in the other panels get the class `data-pair-active`, with a tint and a left border.
- The panels that hold the pair scroll so that the pair row is in view.
- A scroll in one panel moves each panel that shares keys with it, to the row at the same place. If a panel lacks the row, it moves to the row before it.
- A second tap on the same row, or the Esc key, clears the mark. RT73b default 10 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the Esc key clears the pair mark first.
- If no other panel holds the key, the tapped row marks in its own panel only. No panel moves. No note shows.
- Other option for that case: a short note "No pair for this row in the other panels." Benefit: the reader learns why nothing moved. Cost: more noise on a page where pairs are rare.
- Other option for the whole rule: mark only and no scroll together. Benefit: no scroll code. Cost: it breaks vision l49.
- Limit of this design: rows take no focus, so the tap has no keyboard way. A keyboard reader uses Bilingual pairing for aligned rows.
- Each panel body scrolls on its own, like `HtvPanelFrame` (`min-h-0 flex-1 overflow-auto` `[file: app/components/HtvPanelFrame.tsx:142]`). Scroll together needs that. RT73b default 8 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the panel row height is the window height minus 9.5 rem in Page view, and the bodies scroll inside `[file: app/components/ReaderPanels.tsx:246]`.
- The other option for 18d4ac29 (D13): S2 maps each agent row to its unit. The file `source_parts.json` of the run holds the `unit_id` of each part `[check: DT73b 2026-10-30 15:54 python3 read of source_parts.json and TS_3.json]`. Benefit: all three panels pair. Cost: a step in S2 that maps the rows, for 1 of 1,124 pages today.

###### 15.26.6.7 First layout

The first layout is the set of panels that a page draws in two cases. The account has no saved layout for the kind. Or the saved layout draws nothing on this page. The first layout is not saved until the reader changes it.

Rules (unit default D14):

- R1. The account has `shown` for the kind of work. If at least one of its components has data on this page, the page draws those that have data (15.26.6.8).
- R2. Else the page uses the first layout R3.
- R3a. Page image, if the page has one.
- R3b. Original text, if the work has no page image (kind `article`).
- R3c. The first EN text that the page has. The order is Agent text, Human version, v1 EN placeholder. This is "Reading 4, Agent text first" of round 73c answer 2.
- R3d. Nothing else. The v1 placeholder is off when an Agent text or a Human version exists (round 73c answer 5, "Separate component, off at first"). The v1 ZH placeholder is off. Bilingual pairing is off. Kendo term highlights are on.
- R3e. If the page has no EN text, R3b applies to every kind of work. The page draws the Original text if it exists.
- R3f. If the page has no component at all, the page shows the line "No text for this page yet." (15.26.6.12).
- When the reader changes the list on a page that uses R2, the change starts from the layout on the screen. The result goes into `shown` for the kind.

First layout of the five pages:

| Page | Panels at first | One click away |
|---|---|---|
| `d7835263/p001` | Original text, Human version | Bilingual pairing. |
| `18d4ac29/p001` | Original text, Agent text | Human version (swap or both, round 73b answer 13). |
| `left_foot_full/p050` | Page image, Agent text | Original text, v1 EN placeholder, v1 ZH placeholder. |
| `left_foot_full/p051` | Page image, v1 EN placeholder | Original text (the v1 JA line), v1 ZH placeholder. |
| `ogawa_lecture_part1/p281` | Page image | Nothing. The page has no other data. |

- Other option for R3: show every EN text that exists, in the order Agent text, Human version, v1 EN placeholder. Benefit: the reader sees all data at once, as "USER CAN VIEW WHAT IS AVAILABLE" reads. Cost: three narrow panels on a normal screen, and the owner chose "off at first" for the v1 placeholder.
- Why Original text is on for an article and off for a book: a book has the Page image as its original data. An article has only the JA text. Round 72 answer 2: "you still have to show the full original data". Round 73b answer 9: "JA column beside EN".

###### 15.26.6.8 A checked component with no data on the page

Example. An account saved `shown.book` = Page image and Agent text. The reader turns from `left_foot_full` p050 to p051. The page has the image and no Agent text.

- Unit default D16: the page draws the Page image only. A one-line note sits above the panel row: "Not on this page: Agent text. On this page, in the Components list: Original text, v1 EN placeholder, v1 ZH placeholder."
- The note shows only when a checked component lacks data and the page has other components. RT73b default 7 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the note names only components that the work has on some page `[file: app/lib/reader-layout.ts:340-349]`.
- The saved `shown` stays as it is. The next page that has an Agent text draws the panel again.
- Other option: a thin bar of 28 px stands in for the absent panel, like the collapsed bar `[file: app/components/HtvPanelFrame.tsx:12,17-35]`. Benefit: the other panels do not change width when the reader turns the page. Cost: a bar that looks like a collapsed panel but opens nothing.
- If none of the checked components has data, R2 applies (the first layout). Example: `shown.article` = Human version only, and the admin removed the choice on d7835263. The page draws Original text.

###### 15.26.6.9 Saved layout

Where: `user_settings.panes`, key `reader` `[file: app/lib/htv-settings.ts:141-142]`. The column holds at most 20,000 bytes `[file: app/lib/htv-settings.ts:215]`. The new keys use about 300 bytes `[agent inference]`.

Shape (unit default D15). The text after `//` is a comment for this document.

```
reader: {
  components: ["image","ja","agent","human","v1en","v1zh"],   // order of the panels, left to right
  shown: { book: ["image","agent"], article: ["ja","human"] }, // checked components for each kind of work
  widths: { "agent": 420 },                                    // px, 280 to 720, only for panels that the reader resized
  pair: false,                                                 // Bilingual pairing
  terms: true,                                                 // Kendo term highlights
  text: "en", en: "agent", image: true                         // old keys, read when shown is absent
}
```

- `components` and `widths` are the same for all kinds of work. `shown` has one list for each kind, because a book and an article have different components.
- Other option: one `shown` list for all works. Benefit: a smaller value. Cost: a layout that the reader built on a book draws nothing useful on an article, so R2 runs more often.

Old values turn into the new value when the account has no `shown` (read time, no write):

| Old value | New value |
|---|---|
| `text` "en", `en` "agent" | `shown.book` Agent text (and Page image if `image` is true). `shown.article` Agent text. `pair` false. |
| `text` "en", `en` "human" | Same, with Human version instead of Agent text. |
| `text` "ja" | Original text only (and Page image if `image` is true). |
| `text` "pair", `en` "human" | Original text and Human version. `pair` true. |
| `image` false | Page image not in `shown.book`. |

- Example: the account `reader@kendo-translation.local` saved `reader.image` Off (round 67 answer 5). Its `shown.book` has no Page image until the reader presses Image once.
- The next write adds the new keys. The old keys stay in the value and are ignored when `shown` exists. This keeps a rollback possible. Cost: about 40 bytes.

What the sanitizer `sanitizeReader` must accept `[file: app/lib/htv-settings.ts:191-210]`:

- `components`: a list of at most 7 unique IDs from `image`, `ja`, `agent`, `human`, `v1en`, `v1zh`, `enorig`. It drops other IDs. It appends IDs that the list lacks, in the default order.
- `shown`: an object with the keys `book` and `article`. Each value is a list of the same IDs, without repeats. RT73b default 15 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): an empty saved list is valid.
- `widths`: an object that maps an ID to a number. The number is clamped to 280 to 720 and rounded to a whole number, as `num(v, 280, 720, 0)` does.
- `pair` and `terms`: booleans.
- The old keys `text`, `en`, and `image` stay accepted.
- `READER_DEFAULTS` is typed `Required<Omit<ReaderSettings, "panelSeen">>` `[file: app/lib/htv-settings.ts:177]`. The new keys need defaults, or they must sit outside it, as `panelSeen` does.
- Old note, verified below: how `save(patch)` in `ReaderBook.tsx` merges a patch, and whether the route `PUT /api/read/settings` can clear a key. "Reset layout" needs a way to clear. Verified `[check: DZ74 2026-10-31 19:39 read of app/app/api/read/settings/route.ts:17-24 and app/components/ReaderBook.tsx:361,365,187]`: the route merges shallow (`{ ...old.reader, ...reader }`), and the client sends the whole `shown` and the whole `widths`. The route accepts `clear`, a list of layout keys to remove (RT73b default 16, accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`).

###### 15.26.6.10 Phone layout

Vision l192 and 15.19.7: one column, a simpler layout. Round 44 answer 8 keeps the phone layout for the reader pages (vision l192).

- Unit default D18: the panels become tabs. The tab row follows the pattern of `ReaderImage.tsx:57-68`: `role="tablist"`, a button for each tab, at least 44 px high, shown below the `md` width.
- One tab for each drawn panel, in the saved order. With Bilingual pairing the pair is one tab.
- The tab that opens first is the first EN text. If the page has no EN text, it is the first tab.
- No resize and no move on a phone. The list sets which tabs exist. The Hide button does not show.
- A tap on a row marks its pair. When the reader switches to the tab of a paired panel, that tab scrolls to the marked row.
- The Components button opens the list as a sheet.

```
+--------------------------------+
| <  Left foot full        [cog] |
|--------------------------------|
| [ Page image ][ v1 EN placeholder ] |
|--------------------------------|
| Page 51                        |
| v1 Gemini translation          |
| placeholder.                   |
| Kendo is about hidari-te,      |
| hidari-koshi, and hidari-ashi. |
|--------------------------------|
| Pages   <  [51]  >   [Components] |
+--------------------------------+
```

###### 15.26.6.11 Scroll view and Focus mode

- Scroll view (unit default D19): each page is one band. A band holds the text panels side by side with the widths of the Page view. The Page image panel does not show in Scroll view, as today `[file: app/components/ReaderBook.tsx:399]`.
- In Scroll view, the title bars sit in one sticky row under the reader bar, so that Move, Resize, and Hide work for all bands. Replaced by the code of RT73b (default 2, accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): each band has its own title bars, and there is no sticky row `[file: app/components/ReaderPanels.tsx:12]`.
- Pairing and scroll together work inside one band. Replaced by the code of RT73b (default 2): the bodies of a band have natural height, so the panels move with the page. There is no scroll together in a band `[file: app/components/ReaderPanels.tsx:12,167,198]`.
- Focus mode: the text panels stay, in their order, with equal widths. The title bars, the handles, and the Page image panel are hidden. The button "Leave focus mode (Esc)" stays `[file: app/components/ReaderBook.tsx:452]`.
- Other option for Focus mode: only the first text panel shows. Benefit: the purest reading view. Cost: no comparison in Focus mode.

###### 15.26.6.12 Mockups

Wide screen, Page view. The text of the rows is real where the rows are quoted. The panels draw under a line "Page N".

Mockup 1. d7835263 p001, first layout. The reader bar has Original text and no Image.

```
How do elite swordsmen hit men? : Hojo Masaomi
[Page view|Scroll view] [Original text] [Components]       < Previous [1 of 3] Next >  [Focus] [Settings]
Page 1
+----------------------------------+------------------------------------------------+
| Original text         [>] [x]    | Human version                      [<] [x]     |
|                                  | Human translation from kendojidai.com.         |
| ※この記事は『剣道時代 2012年2月号』  | 2012.2　KENDOJIDAI                             |
| に掲載されたものです。              | Why is kendo all about men?                    |
| 剣道はなぜ面なのか。                | To attain the ultimate men-strike, we bring    |
| これぞ会心の面。面を打ちたいあなた    | the expert views of Teramoto Shoji, Takanabe   |
| のために寺本将司、髙鍋進、北条将臣、   | Susumu, Hojo Masaomi and Sato Hiromitsu to you.|
| 佐藤博光があきらかにする。           | Profile                                        |
| 北条将臣（ほうじょう・まさおみ）／教士 | Hojo Masaomi Kyoshi 7th dan, born 1974 in      |
| 七段　昭和４９年神奈川県生まれ。       | Kanagawa Prefecture.                           |
+----------------------------------+------------------------------------------------+
```

Mockup 2. 18d4ac29 p001, first layout. The reader then checks Human version in the list and gets a third panel. Rows U004 and U005 are real `[check: DT73b 2026-10-30 16:00 python3 read of units.jsonl]`.

```
Kendo droplet guard
[Page view|Scroll view] [Original text] [Components]       < Previous [1 of 1] Next >  [Focus] [Settings]
Page 1
+------------------------+--------------------------------+------------------------------+
| Original text  [>] [x] | Agent text           [<] [>] [x]| Human version        [<] [x] |
|                        | AI translation, not yet checked| Human translation from       |
|                        | by a person                    | kendojidai.com.              |
| 新型コロナウイルスの影響で、| Due to the impact of the novel | Due to the effects of the    |
| 剣道の稽古再開時には…      | coronavirus, measures to …     | coronavirus, measures to …   |
| 稽古者個人の感染…          | Please make use of the         | Please use this “Kendo Men   |
|                        | "Kendō Droplet Guard" …        | Shield” as a measure to …    |
+------------------------+--------------------------------+------------------------------+
```

- In the Human panel, “Kendo Men Shield” and “those responsible” carry fact marks (15.26.8). The JA facts are 剣道飛沫ガード and 稽古責任者 `[check: DT73b 2026-10-30 16:00 python3 read of units.jsonl, 18d4ac29 U005]`.
- The Agent rows carry the keys `18d4ac29/p001/ts3/L01`, `L02`, and so on. The Human rows carry `18d4ac29/p001/web/U004`. A tap on an Agent row marks its pair in the Original text panel. A tap on a Human row marks no pair (D13).
- Swap: the reader unchecks Agent text and checks Human version. Both: the reader checks both.

Mockup 3. left_foot_full p050, first layout. The Agent text rows are not quoted here.

```
The Secret of Kendo and the Left Foot
[Page view|Scroll view] [Image] [Components]               < Previous [50 of 120] Next >  [Focus] [Settings]
Page 50
+-----------------------+-----------------------------------------------------+
| Page image      [>]   | Agent text                                  [<]     |
|                       | AI translation, not yet checked by a person         |
|   [image of p050]     | (rows of the run)                                   |
+-----------------------+-----------------------------------------------------+
```

Mockup 4. left_foot_full p051, first layout. The rows are real (`<BP>/Left foot full/pages/page_051.md`) `[check: DT73b 2026-10-30 15:58 cat page_051.md]`.

```
Page 51
+-----------------------+-----------------------------------------------------+
| Page image      [>]   | v1 EN placeholder                           [<]     |
|                       | v1 Gemini translation placeholder.                  |
|   [image of p051]     | Kendo is about hidari-te, hidari-koshi, and         |
|                       | hidari-ashi.                                        |
|                       | It is said that they acquired smooth footwork, and  |
|                       | I too performed it while imagining that and        |
|                       | sending from the koshi.                             |
+-----------------------+-----------------------------------------------------+
```

Mockup 5. ogawa_lecture_part1 p281, first layout. One panel, so no Move and no Hide button.

```
Page 281
+--------------------------------------------------------------+
| Page image                                                   |
|   [image of p281]                                            |
+--------------------------------------------------------------+
No text for this page yet. Only the page image exists.
```

###### 15.26.6.13 What this design does not decide

- The look of the title bar in each theme. RT73 uses the colors of the reader theme.
- The exact scroll code. The rule is in 15.26.6.6.
- Not verified: that `DragHandle` works inside a grid or flex row of the reader. The component sits inside `HtvPanelFrame` and `HtvIndex` today.

##### 15.26.7 Page lines and the Original text button

Page lines (decided where the owner gave the words):

| Panel | Page line | Source |
|---|---|---|
| Agent text | "AI translation, not yet checked by a person" (or "AI translation, checked by a person") | Vision l249, section 11 `[file: app/lib/reader-types.ts:173-174]`. |
| Human version, default choice | "Human translation from kendojidai.com." | Round 73c answer 7, `qa-memory-2026-10-30.md:113`. Round 73e answer 4 (`qa-memory-2026-10-31.md:7`): "Leave until RT73b (Recommended)". RT73b fixes the page line (RT73b report). |
| Human version, chosen by an admin | "Human translation. Chosen by an admin." | Vision l2769 `[file: app/lib/reader-types.ts:175]`. |
| v1 EN placeholder | "v1 Gemini translation placeholder." | Round 73b answer 11, `qa-memory-2026-10-30.md:92`. |
| v1 ZH placeholder | "v1 Gemini translation placeholder." | Same line, same answer. |
| Original text from v1 JA | "v1 Gemini placeholder text." | Unit default D20 (15.26.5). |

- Human versions carry no AI label (vision l251, `qa-memory-2026-10-08.md:45`). The Human panel shows no "AI translation" tag and no row tag.
- The Human version of a book page, chosen by an admin, keeps the row labels of 15.19.5.
- The default choice and the admin choice differ by the field `chosen_by` of `reader_versions`. An empty value means a default choice (15.26.13).

The "Original text" button (decided, round 72 answer 3, round 73b answer 9, round 73c answer 4):

- It is a quick button that checks or unchecks the component Original text.
- It shows on a work with no page image (all web articles). It replaces the Image button there.
- On a work with page images, the Image button stays. The JA source text of a book page shows through the component list (unit default D10).
- Other option: the button on books too. Cost: two panels at the left of the EN text, and little width.
- The button has no new setting. It writes `shown.article`.

##### 15.26.8 Fact marks

Decided: "As published, facts marked (Recommended)" (`qa-memory-2026-10-07.md:130`), "Also dropped facts" (`qa-memory-2026-10-30.md:89`), and "Small tag after the sentence" (`qa-memory-2026-10-30.md:112`).

The Human version shows the EN as kendojidai.com published it. A mark shows each fact where the EN differs from the JA.

Counts over the 311 articles, by sentence rows `[check: DT73b 2026-10-30 15:56 python3 -B facts_sizes.py]`:

| Kind of mark | Marks | On a phrase | On a whole sentence | Rows with a mark |
|---|---|---|---|---|
| Changed fact (unit label `fact_change`, no credit line) | 1,762 | 1,549 | 213 | 1,351 |
| Dropped fact (unit label `omission` without `fact_change`) | 3,808 | 1,245 | 2,563 | 3,172 |

Forms (decided in part, unit default D21 to D25):

- A mark on a phrase: a dotted line under the EN words. A tap on the words opens a pop-up. This follows the vision example (l158 to l161). RT73b defaults 12 and 13 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): the pop-up closes on any scroll `[file: app/components/ReaderPageView.tsx:79]`. A dropped fact on a phrase draws dotted words, and the pop-up reads "The English leaves this out." (d7835263 p001 U013 ３０歳).
- A dropped fact where the EN has no words for it (round 73c answer 6): a small tag "fact dropped" after the EN sentence. The tag opens the same pop-up. RT73b default 14 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): a fact that cannot be placed on EN words goes to the tag after the sentence.
- A changed fact where the EN has no words for it (213 marks, unit default D22): a small tag "fact changed" after the EN sentence. Other option: a dotted line under the whole sentence. Benefit: no new tag text. Cost: long sentences show much ink.
- One sentence with several whole-sentence marks of one kind gets one tag. The pop-up lists each fact (D23).
- The pop-up shows the JA fact only. `en_fixed` never shows (D24).
- 31 credit-line units carry the label `fact_change`. They get no mark (D25). Example: U082 of d7835263, `Translation — Jouke van der Woude` against 翻訳＝小関ヤオカ.
- The mark is a different mark from a kendo term highlight. It has no EN form check.

Examples. Per page of d7835263 `[check: DT73b 2026-10-30 15:59 python3 -B d7835263_marks.py]`:

| Page | Changed fact marks | Dropped fact marks |
|---|---|---|
| p001 | 0 | 1 (U013) |
| p002 | 2 (U051, U062) | 1 (U059) |
| p003 | 1 (U071) | 1 (U072) |

Changed fact, U071 on page 3. The EN has words for the fact.

```
JA:        詰めたところから打っても空を切るだけですし、その上がった手元に小手を打たれる危険性もあります。
Published: If you try to strike from there, you will cut air and it would be risky to try for kote when their hands are up like that.
Mark:      dotted line under "try for kote when their hands are up"
Pop-up:    Japanese says: その上がった手元に小手を打たれる
```

Dropped fact, U059 on page 2. The EN has no word for 右足 (the right foot).

```
JA:        前方に跳び込むのではなく、右足の踏み込みと手の内の決めで一本にするようにしています。
Published: Rather than jumping forward, you can land it through a good fumikomi and tenouchi.
Mark:      small tag "fact dropped" after the sentence
Pop-up:    Japanese says: 右足. The English leaves this out.
```

Vision example (l158 to l161), record `b5106cae` unit U011. Three marks sit in one sentence `[check: DT73b 2026-10-30 15:59 python3 read of units.jsonl, b5106cae_example.txt]`. Correction of unit DZ73: the stored fact 熊本 of U011 has the kind "changed", with `start` and `end` null, and not the kind "dropped" `[check: DZ73 2026-10-31 15:26 python3 read of /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/web-pages.jsonl, record b5106cae/p001/web/U011]`. Not verified: the tag text that the screen shows for this case.

```
JA fact 団体優勝4回   EN "team title 3 times"          dotted line under the phrase (changed fact)
JA fact 熊本          no EN words                       small tag after the sentence (stored kind "changed")
JA fact 全日本選抜剣道八段優勝大会  EN "8th Dan Tournament"  dotted line under the phrase (changed fact)
```

A whole JA sentence with no EN sentence (1,016 rows, unit default D21). Example: web article `396571c1` U055, JA また、攻防の際、間合取りにも注意しています。 and no EN `[check: DW73 2026-10-30 20:29 python3 -B jaonly2.py]`.

- 377 of the 1,016 rows are `site_text` (web page chrome). Example: d7835263 U084 "関連". 639 rows are other block types: 396 `body`, 97 `profile`, 56 `heading`, and 90 more of seven other types `[check: DW73 2026-10-30 20:29 python3 -B jaonly.py]`.
- Default: a `site_text` row makes no line in the Human panel. Every other JA-only row makes a muted line with the tag "fact dropped". The pop-up reads "Japanese says: また、攻防の際、間合取りにも注意しています。 The English leaves this out." Benefit: the reader sees that the published EN has no such sentence, and the rows stay level with the Original text panel. Cost: 639 tag-only lines. RT73b default 1 (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`): a `site_text` row that has English text stays in the Human panel with its line. Example: d7835263 p003 U083 "Debana-men" keeps its line. U084 関連 has no English and gives no line `[file: app/lib/reader-layout.ts:138-143]`.
- Other option: no line for any JA-only row. Benefit: the Human panel shows only the published text. Cost: a dropped sentence leaves no trace in that panel, and the tap on the JA row finds no pair.
- Another option: a line for all 1,016 rows. Cost: 377 lines for page chrome such as "関連".

Data field (unit default): the Human row gets `facts`, a list of `{start, end, ja, type, kind}`. `kind` is "changed" or "dropped". `start` and `end` count characters in the EN text of the row. A whole-sentence fact has `start` and `end` null. A Human version from another source has no `facts`. The size is inside the sizes of 15.26.13.

Not verified: the number of rows that carry a tag, because several marks share one tag.

##### 15.26.9 The v1 placeholder

Decided: `qa-memory-2026-10-30.md:71` (use it), `:91` (no count, no search), `:92` (page line), `:95` (keep the notes, ZH shows), `:108` ("`placeholder` DOES NOT COUNT AS ANYTHING"), `:109` ("for display testing purpose ONLY"), `:111` (separate component, off at first), `:130` (the readings of answers 2 and 3 are right), `:136` (round 73d answer 8: the v1 files are copied into `<V2>/data/v1-md/` on this Mac).

Rule for all counts `[validated reading 2026-10-30 22:04]` (`.opencode/reminders/qa/qa-memory-2026-10-30.md:130`, reading at `qa-memory-2026-10-30.md:122`): the v1 placeholder counts in no number on any screen.

- Not translated: it does not count as a translated page on the Reader dashboard `/read`.
- Not searched: its text is not in the search columns.
- No line in the work block.
- No count on the Monitor dashboard `/` on this Mac.
- It fills the display until a v2 text exists. When an Agent text or a Human version exists for the page, the placeholder stays a separate component, off at first.

Source and block rule (unit default D28, from unit DT73):

- Source: `<BP>/<folder>/pages/page_NNN.md`. The number NNN equals the PDF page number and the image `p<NNN>.webp`. Map by number, never by count. Round 73d answer 8 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:136`, "This Mac, copy in data folder (Recommended)" `[accepted recommendation 2026-10-30 22:04]`): the md files are copied from `/Volumes/NghiaHDD2T/universal-agent_v2/book-postprocessing` into `<V2>/data/v1-md/` (git-ignored). The Viewer reads the copy when a page opens. Layout default `<V2>/data/v1-md/<slug>/page_NNN.md`, not final until RT73a reports. Unit RT73a copied 13,083 md files in 32 folders, 84.10 MiB (88,190,061 bytes) `[check: DZ73 2026-10-31 15:26 find <V2>/data/v1-md -type f -name 'page_*.md' with stat -f %z and awk]`. The folder "Chinese Translation Sword Theory Part 1" (199 files) has no slug and stays out. RT73a built the layout `<V2>/data/v1-md/<slug>/page_NNN.md` `[check: DZ73 2026-10-31 15:26 copy_v1.sh]`. The hosted site has no such folder, so it shows no placeholder.
- Folder to slug: the field `folder` of `items.filled.jsonl`. 36 of 37 folders have a slug. "Chinese Translation Sword Theory Part 1" (199 files) has none and stays out (`qa-memory-2026-10-30.md:98`). "Mental 2 clean" maps to `mental2_clean`, which the Reader dashboard hides.
- A block is the text between lines of `---`. The "Page N" header and the tag `【Heading】` are not part of a row. In a block of 3 or 4 lines, line 1 is JA, line 2 is EN, and line 3 is ZH. In a block of 4 lines, line 4 (a page reference such as "p. 948") joins the EN row. A block of 1 line, or of 5 lines or more, gives one row with no JA and no ZH. Round 73e answer 3 (`.opencode/reminders/qa/qa-memory-2026-10-31.md:6`): "Keep it (Recommended)" `[accepted recommendation 2026-10-31 00:59]`. Blocks of 2 lines, for example JA plus ZH in `kendojidai_2014/page_252.md`, stay as they are. Not verified: the row rule of the RT73a code for a block of 2 lines.
- The markdown mark `*x*` loses the asterisks.
- The notes `[T/N: ...]` stay in the EN row (decided, `qa-memory-2026-10-30.md:95`, "+ keep it").
- The row key is `<page_id>/v1/<NN>`, with NN the number of the block on the page.

Real example. `left_foot_full` page 51 `[check: DT73b 2026-10-30 15:58 cat page_051.md and python3 -B v1_zh_check.py]`. The file has 17 blocks: 16 blocks of 3 lines and 1 block of 1 line.

```
JA  剣道は左手・左腰・左足である
EN  Kendo is about hidari-te, hidari-koshi, and hidari-ashi.
ZH  Kendo在于hidari-te、hidari-koshi与hidari-ashi。

JA  て滑らかな足遣いを身につけたといいますが、わたしもそれをイメージしながら腰から送るようにして行ないました。
EN  It is said that they acquired smooth footwork, and I too performed it while imagining that and sending from the koshi.
ZH  据说他们掌握了流畅的步法，我也在心中构思着这种意象，像从koshi发力传送一样进行练习。
```

Data `[check: DT73b 2026-10-30 15:58 python3 -B v1_zh_check.py]`: `left_foot_full` has 120 files. 120 have an EN line and 120 have a ZH line. `ogawa_lecture_part1` has 280 files, 253 with an EN line and 181 with a 3-line block. All folders: 13,282 files, 13,085 with an EN line, 11,679 with a ZH line. The 31 visible folders: 12,992 pages, 12,717 with an EN line, 11,317 with a ZH line.

On a page that has an Agent text (decided, round 73c answer 5): the v1 placeholder is a separate component, off at first. Example: `left_foot_full` p050. The reader checks "v1 EN placeholder" in the list and sees both panels. The panels do not pair row by row (15.26.6.6).

##### 15.26.10 Counts and the word "translated"

Rule today: a page counts as translated when a `reader_pages` record exists `[file: app/lib/reader-translated.ts:18]`.

Rule after the change (unit default): a page counts as translated when the page has an Agent text or a Human version. The base is round 70 answer 3 (`qa-memory-2026-10-29.md:118`): "Pages with translation that reader can view". A page with only the v1 placeholder does not count (decided). A page with only the Original text does not count. The word on the screen stays "translated".

New totals on the Reader dashboard `/read` `[check: DT73b 2026-10-30 15:56 python3 -B a4_rows.py]`. These numbers are `[agent inference]`. Unit RT73 must check them again after TF73 returns.

| Line | Today | New |
|---|---|---|
| Works | 342 | 342 |
| Pages | 13,303 | 14,116 |
| Translated pages | 28 | 1,151 |
| Percent | 0.2 | 8.2 |
| Books fold | 22 works, 4,821 pages, 20 translated (0.4 percent) | no change |
| Kendo Jidai fold | 320 works, 8,482 pages, 8 translated (0.1 percent) | 320 works, 9,295 pages, 1,131 translated (12.2 percent) |

- Translated new = 28 - 1 + 1,124. The article 18d4ac29 page 1 is one of the 28 and one of the 1,124. It counts once.
- All 1,124 article pages hold a Human version, so all count.
- The live line reads "English: 28 of 13,303 pages translated (0.2 percent)" `[file: docs/VISION-viewer.md:4567]`. The new line reads "English: 1,151 of 14,116 pages translated (8.2 percent)".
- The v1 placeholder adds nothing to these numbers (round 73c answer 2).

Work block of the book screen. The AI label rule (vision l246 to l248) stays: "AI translation: A of N pages. Human check: C of A pages." One line is new (unit default):

- d7835263: "AI translation: 0 of 3 pages. Human translation: 3 of 3 pages."
- left_foot_full: "AI translation: 6 of 120 pages. Human check: 0 of 6 pages." No v1 line (round 73c answer 2).
- The line "Human translation: N of M pages." shows when at least one page of the work has a Human version.

The old code counts every `reader_pages` record as an AI page `[file: app/components/ReaderBook.tsx:342]`. With JA-only records for web pages that count is wrong. The record must say what it holds (15.26.13).

Article row on the Reader dashboard `/read`: d7835263 reads "English: 3 of 3 pages translated (100.0 percent)" and "Start at Page 1".

The metadata line reads "3 pages". The code writes "pages" for 1, so "1 page" needs a singular test `[file: app/components/ReaderBook.tsx:333]`.

##### 15.26.11 Year folds

Decided: `qa-memory-2026-10-30.md:68` "Also add kendojidai to the book name 2019 -> 2025", and round 73c answer 2 "Reading 6, Kendo Jidai 2019".

- The folds 2019 to 2025 show "2019" today, because the code writes `String(year)` when no magazine volume exists `[file: app/lib/reader-folds.ts:253]`. The note of aki-main names l255. The line is l253.
- They become "Kendo Jidai 2019" to "Kendo Jidai 2025", the same form as "Kendo Jidai 2013" `[file: docs/VISION-viewer.md:3422-3424]`.
- The test of mode `folds` in `app/scripts/smoke.mjs` must change its expected titles.
- Not verified: how the search matches a fold title.

##### 15.26.12 Admin choice and labels

Decided: `qa-memory-2026-10-30.md:66` "Chosen by default (Recommended)". `qa-memory-2026-10-28.md:310` "Admin page /admin/versions (Recommended)".

- The kendojidai.com EN is the chosen Human version of all 311 articles from the start. An admin can press "Remove the choice" on `/admin/versions` (vision l2729) and choose again.
- After "Remove the choice" on d7835263: the Human version row of the list turns grey with the reason "No human version for this page". The page uses R2 and draws Original text. The reader still sees the full original data (round 72 answer 2).
- Human versions carry no AI label (vision l251).

##### 15.26.13 Storage in PocketBase

Technical default. It changes what the reader sees only through the choices above.

Facts:

- `reader_pages`: one record per page, `page_id` unique, JSON fields at most 5 MB, `run_id` required `[file: data/scripts/pocketbase/pb_migrations/1793300007_v2_reader_collections.js:50-71]`.
- `reader_versions`: one record per page, `page_id` unique, `rows` JSON `[file: same file:73-91]`.
- `own_translations`: one record per row and version. A record never changes `[file: data/scripts/pocketbase/pb_migrations/1793300001_v2_collections.js:27-60]`. S2 uses a superuser, so the rules do not stop it.
- Migrations: `<V2>/data/scripts/pocketbase/pb_migrations/` and an identical copy in `<T2>/data/scripts/pocketbase/pb_migrations/`. The last number is 1793300010 `[check: DT73b 2026-10-30 15:53 ls]`.

Proposal (unit default):

| Data | Where | Records | Size |
|---|---|---|---|
| JA rows of web pages | `reader_pages`, `run_id` "web-ja", rows with `ed3` empty | 1,123 new (18d4ac29 p001 keeps its agent record) | 14.40 MB, measured by RT73a `[check: DZ73 2026-10-31 15:26 grep -n "14.40 MB" /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/run-upgrade.out, line 8]`. Old estimate: 7.64 MB for 1,124 pages |
| Human version of web pages | `reader_versions`, `chosen_by` empty means chosen by default | 1,124 | 5.25 MB, measured by RT73a (`run-upgrade.out`, line 9). Old estimate: 5.60 MB. Rows `{key, text, facts}` |
| Same Human version, so an admin can choose it again (D26) | `own_translations` under a disabled user "kendojidai.com", `version` 1 | 32,937 | 13.93 MB, measured by RT73a (`run-upgrade.out`, line 10). Old estimate: about 11.84 MB |
| Search columns | `search_ja`, `search_en` of the 1,124 `reader_pages` records | | 3.68 MB and 3.37 MB |
| v1 placeholder (JA, EN, ZH) (D27) | Replaced in round 73d answer 8 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:136`): no PocketBase record. The md files sit in `<V2>/data/v1-md/` on this Mac only. Old default D27: collection `reader_v1`, one record per page | 0 records. Old default: about 12,717 | 84.10 MiB on disk for 13,083 files in 32 folders (measured by RT73a), 0 MB on the server, and no collection `reader_v1`. Old default: about 100 MB without ZH and about 120 MB with ZH `[agent inference]` |

Sources of the figures `[check: DT73b 2026-10-30 15:56 python3 -B facts_sizes.py]`. The largest JSON field of one page record is 0.014 MB, far below the 5 MB limit. The v1 figure comes from unit DT73 (EN 36.66 MB, JA 24.42 MB) plus 21.18 MB of ZH lines. It is not measured as records.

- Sentence rows keep the Human rows small. A Human row holds the key, the text, and the marks. It holds no JA copy. With a JA copy per row the version needs 10.62 MB instead of 5.60 MB.
- `reader_pages` needs a way to say what a record holds. The `run_id` value "web-ja" says "JA only, no agent text". `textPages` (agent pages) counts only the records with an agent run.
- Why `own_translations` at all: after "Remove the choice" the admin must be able to choose the kendojidai.com version again. `reader_versions` keeps one record per page and the remove deletes it. Option without `own_translations`: only a new S2 run brings the text back. Benefit: 32,937 fewer records and no system user. Cost: no way back on `/admin/versions`.
- Migration 1793300011 (new): add `own_translations.facts` (JSON, 1 MB), and add a field that says which components a page has. Old text, replaced in round 73d answer 8: it also added the collection `reader_v1`. It must run twice without error, as the earlier migrations do. Not verified: `pb_users.py` can create a disabled user.
- Open item 1 (15.26.18) is decided in round 73d answer 8 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:136`): no collection `reader_v1`, no v1 record on any server.

##### 15.26.14 Search and print link

- The Human version text goes into the search columns of the page record (vision l214). A search for "seme" finds 189 of the 311 articles in the published EN `[file: DT73 search_effect.txt]`. Not re-run in this unit.
- The v1 placeholder stays out of the search (decided, `qa-memory-2026-10-30.md:91`).
- The cap of 2,000 page hits stays `[file: app/lib/pb.ts:615]`. With 1,124 more pages in the search, a query like "kendo" (311 articles) fills more of the cap `[agent inference]`.
- No link between a web article and its print pages (decided, `qa-memory-2026-10-30.md:93` "No link now (Recommended)"). Example: d7835263 sits in Kendo Jidai > 2012 > February 2012, print article 4 on PDF pages 140 to 178. The Reader shows no link.

##### 15.26.15 Changes by file, tests, and the split of RT73

Repo `<V2>`, paths under `app/` unless a path says more. Read each file before the change.

Decided in round 73d answer 9 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:137`, "Two units, RT73a first (Recommended)" `[accepted recommendation 2026-10-30 22:04]`): run RT73 as two code units. The draft had this as a recommendation `[agent inference]`.

- RT73a, data and counts. S2, the Python page file, migration 1793300011, folds, counts, A4 pages, the Human version, the v1 copy in `<V2>/data/v1-md/` (round 73d answer 8), and the work block. It has about 10 files and a test by dry run and smoke counts. It needs a scope grant for one new file in `<T2>`.
- RT73b, components and panels. The component list, the panels, the first layout, the saved layout, the phone tabs, fast comparison, fact marks, and the Original text button. It has about 10 files and a browser test.
- Reason: RT73a is checkable with numbers (1,124 pages, 33,953 rows, 1,151 of 14,116) and has no layout risk. RT73b changes the main reading screen and needs a browser check by the owner. One unit with both is too large to review.
- After RT73a alone, the old controls still work. The Human version shows through "English text: Human", and the JA text through "Text: JA". The screen is clumsy but usable `[agent inference]`. RT73b must follow RT73a. The S2 upload to the local PocketBase `127.0.0.1:8090` after RT73a: aki-main runs it once (round 73d answer 10, `.opencode/reminders/qa/qa-memory-2026-10-30.md:138`, "aki-main runs it once (Recommended)" `[accepted recommendation 2026-10-30 22:04]`), after a copy of `pb_data`. Later S2 runs stay by hand by the owner (round 56 answer 4, `qa-memory-2026-10-28.md:164`, "You start S2 by hand (Recommended)").

RT73a:

| File | Change |
|---|---|
| `data/scripts/pocketbase/pb_migrations/1793300011_v2_components.js` (new) | `own_translations.facts` and components field. The collection `reader_v1` is dropped (round 73d answer 8). Copy to `<T2>` on commit. |
| `<T2>/data/scripts/web_pages.py` (new, outside `<V2>`) | Imports `programs.a4_cut` and writes the page of every unit. Needs a scope grant. |
| `scripts/sync-runs.mjs` (header l9-12, `catalogBody` l536, `countTranslated` l763-778, report l814-819) | Reads the page file. Builds sentence rows. Writes web `pages`, JA records, Human versions, `own_translations`. It writes no v1 record (round 73d answer 8). Counts a page as translated by the new rule. |
| `lib/reader-folds.ts` (l52, l127-130, l253) | `workPages` returns `w.pages` (at least 1). Year fold title "Kendo Jidai " + year. |
| `lib/reader-translated.ts:18` | `isTranslatedPage` takes `{ agent, human }` and gives false for "web-ja" records and for a page with a v1 file alone (round 73d answer 8). |
| `lib/reader-data.ts` (l166-185, l195-219, l226-250) | `loadReaderIndex`: `images` needs the kind. `mergeRows`: Human rows by key. `loadReaderPages`: components of each page. |
| `lib/pb.ts` (l477, l483, l615, l717-739, l793-805) | No v1 records (round 73d answer 8). RT73a places the code that reads the v1 md files. Carry `facts`. `readerTextPages` returns agent pages only. |
| `lib/reader-search.ts` | Search columns of web pages. No v1 text. |
| `components/ReaderBook.tsx` (l333, l341-343, l361) | Work block lines. "1 page". Start link. |
| `scripts/smoke.mjs`, `data/scripts/pocketbase/test_local.py` | Checks below. |

RT73b (the files that RT73b changed beyond this table are in section 15.28.7):

| File | Change |
|---|---|
| `components/ReaderBook.tsx` (l49, l399, l423, l504-514) | Components button, Original text button, panel row, note line, empty page. |
| New `components/ReaderPanels.tsx` | Panel row, title bars, move, hide, tabs on a phone. |
| New `components/ReaderComponentList.tsx` | The dialog with the list and "Reset layout". |
| `components/ReaderPageView.tsx` (l59, l94) | One body per component. Page lines. Fact marks and pop-up. Pair mark. |
| `components/HtvPanelFrame.tsx` | No change. Import `DragHandle`. |
| `components/ReaderImage.tsx` | Panel body for the Page image. Tabs pattern for a phone. |
| `components/ReaderSettingsPanel.tsx` (l66-72, l110-113) | Remove Text and English text. First-visit group with the list. |
| `lib/htv-settings.ts` (l141-210) | New keys, defaults, sanitizer. |
| `lib/reader-types.ts` (l155, l178) | Component IDs, `has` of a page, `facts`, labels. |
| `app/api/admin/versions/route.ts`, `components/AdminVersionPanel.tsx` | List the version of "kendojidai.com". Show `facts` in the preview. `app/admin/versions/page.tsx` needs no change `[check: DZ74 2026-10-31 19:39 git show --stat e9ebd81, no line for that file]`. |
| `scripts/smoke.mjs` | Checks below. |

Checks to add (expected numbers in brackets):

- S2 dry run prints: articles 311, pages 1,124, rows 33,953, Human rows 32,937, changed marks 1,762, dropped marks 3,808, and the sizes of 15.26.13.
- The page file of the Translator gives 1,124 pages that hold a unit and no empty page (after TF73).
- Reader dashboard `/read`: "English: 1,151 of 14,116 pages translated (8.2 percent)" and the folds "Kendo Jidai 2019" to "Kendo Jidai 2025".
- `/read/d7835263?view=page&at=p001`: button Original text, no button Image, panels Original text and Human version, 32 Human rows, no AI label on the Human panel.
- `/read/18d4ac29?view=page&at=p001`: panels Original text and Agent text. After a check of Human version: three panels.
- `/read/left_foot_full?view=page&at=p050`: panels Page image and Agent text. `at=p051`: Page image and v1 EN with the page line "v1 Gemini translation placeholder."
- `/read/ogawa_lecture_part1?view=page&at=p281`: the image and the line "No text for this page yet."
- Layout: Move right swaps two panels. A drag handle changes `widths`. Hide unchecks. The last panel has no Hide.
- Old saved value `{text:"pair", en:"human"}` gives Original text and Human version with `pair` true.
- A phone width of 390 px shows tabs and no horizontal scroll bar.
- Fact marks: U071 shows the dotted line and the pop-up "Japanese says: その上がった手元に小手を打たれる". U059 shows the tag "fact dropped".
- A database without migration 1793300011 still opens every page.
- The v1 placeholder adds 0 to every count on the Reader dashboard `/read`.

Cost: 0 USD. No model call and no network call outside localhost.

##### 15.26.16 Unit defaults

| # | Default | Other option |
|---|---|---|
| D1 | A unit that the A4 cut skips takes the page of the unit before it. | The page of the next unit (moves 1 unit). |
| D2 | Added units make no row. | A row with `ja_added`. Cost: JA text that the author did not write. |
| D3 | A Python script writes the page file. S2 reads it. | A JavaScript copy of `a4_cut`. |
| D4 | A Components button in the reader bar opens the list. | The list sits in the settings panel of the cog. |
| D5 | The first-visit panel holds the same list. | The list only on the button. |
| D6 | Order: Page image, Original text, Agent text, Human version, v1 EN, v1 ZH. | Original text first. |
| D7 | Move by buttons and by drag of the title bar. | Buttons only. |
| D8 | Resize by `DragHandle`, 280 to 720 px, step 16 px, free width shared. | Percent shares. |
| D9 | The Hide button unchecks. The last panel has no Hide button. | Allow zero panels. |
| D10 | Image and Original text stay as quick buttons. The Text and English text controls go. | Keep the Text control as a preset. |
| D11 | Bilingual pairing merges Original text and the first EN panel. | A third panel. |
| D12 | A tap marks the pair. The panels that share keys scroll together. A tap with no pair marks its own row only. | A note, or mark only. |
| D13 | Agent text and Human version of 18d4ac29 do not pair. | S2 maps agent rows to units. |
| D14 | First layout R1 to R3. | Show every EN text that exists. |
| D15 | `shown` has one list for each kind of work. | One list for all works. |
| D16 | A checked component with no data draws no panel. One note line names it. The note names only components that the work has (RT73b default 7, accepted in round 75 answer 13). | A 28 px bar. |
| D17 | The list hides EN-original. | Grey row. |
| D18 | Phone: tabs, no move, no resize. | None. |
| D19 | Scroll view: bands, title bars per band (no scroll together in a band, RT73b default 2, accepted in round 75 answer 13), no Page image. Focus mode: text panels, no title bars. | Focus mode with the first text panel only. |
| D20 | The v1 JA line fills Original text. Page line "v1 Gemini placeholder text." Accepted in round 73d answer 7 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:135`). | "v1 Gemini translation placeholder." |
| D21 | A JA-only row of a type other than `site_text` shows a muted line with the tag "fact dropped" in the Human panel. A `site_text` row with English text keeps its line (RT73b default 1, accepted in round 75 answer 13). | No line for any JA-only row, or a line for all. |
| D22 | A changed fact with no EN words gets a tag "fact changed". | A dotted line under the whole sentence. |
| D23 | One tag for each kind in a sentence. The pop-up lists all facts. | One tag for each fact. |
| D24 | `en_fixed` never shows. | Show it with an AI label. |
| D25 | Credit lines get no mark. | Mark them. |
| D26 | The Human version is also copied into `own_translations`. | `reader_versions` only. |
| D27 | Replaced in round 73d answer 8 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:136`): the v1 placeholder lives in md files copied to `<V2>/data/v1-md/` on this Mac. Old default: `reader_v1` records. | Records on every server (the old D27). Closed: the migration 1793300011 creates no collection `reader_v1` `[check: DZ73 2026-10-31 15:26 grep -n "reader_v1" 1793300011_v2_components.js, line 12 is a comment only]`. |
| D28 | The block rule of 15.26.9. Asterisks go. Notes stay. | Cut dictionary remarks. |
| D29 | A page with an image and no text shows the image and names the absent components. | None. |

##### 15.26.17 Decided items

| # | Item | Owner words | Tag | Q-A line |
|---|---|---|---|---|
| 1 | Every article page shows its full original data | "Even if there is no translated data, you still have to show the full original data" | `[user 2026-10-30 09:28]` | `qa-memory-2026-10-30.md:30` |
| 2 | Original text button instead of the Image button | "read the image button with original-text button" | `[user 2026-10-30 09:28]` | `qa-memory-2026-10-30.md:31` |
| 3 | Text source, default choice, all 311 | "Source A, units.jsonl (Recommended)", "Chosen by default (Recommended)", "All 311 go in (Recommended)" | `[accepted recommendation 2026-10-30 10:42]` | `qa-memory-2026-10-30.md:65-67` |
| 4 | Year folds | "Also add kendojidai to the book name 2019 -> 2025" | `[user 2026-10-30 10:42]` | `qa-memory-2026-10-30.md:68` |
| 5 | v1 data as placeholder | "option 1. But for now, you can use the v1 data in universal-agent as place-holder text" | `[user 2026-10-30 10:42]` | `qa-memory-2026-10-30.md:71` |
| 6 | A4 pages for articles | "We talked about splitting article into A4 page right?" | `[user 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:87` |
| 7 | Reader chooses what to show | "reader can choose what to show in their customizable UI" | `[user 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:88` |
| 8 | Dropped facts | "Also dropped facts" | `[accepted option 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:89` |
| 9 | Original text beside EN | "JA column beside EN (Recommended)" | `[accepted recommendation 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:90` |
| 10 | v1 not counted, not searched | "Not translated, not searched (Recommended)" | `[accepted recommendation 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:91` |
| 11 | Page line of v1 text | "v1 Gemini translation placeholder." | `[user 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:92` |
| 12 | No link to print pages | "No link now (Recommended)" | `[accepted recommendation 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:93` |
| 13 | Swap and both | "User can swap between them, and also show both of them." | `[user 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:94` |
| 14 | Sentence rows, vision first, keep notes, ZH v1 | "+ sentence row", "+ keep it", "+ If ZH is available in v1, User can view the ZH v1 placeholder" | `[user 2026-10-30 15:35]` | `qa-memory-2026-10-30.md:95` |
| 15 | Readings 1 to 6 and "placeholder DOES NOT COUNT AS ANYTHING" | "`placeholder` DOES NOT COUNT AS ANYTHING." | `[accepted recommendation 2026-10-30 20:17]` `[user 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:108` |
| 16 | v1 ZH placeholder shows as one component | "option 1. v1 tranlsation are simply just placeholder, for display testing purpose ONLY." | `[user 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:109` |
| 17 | Component list and panels, Original text button | "option 3. Do the text-only button also" | `[user 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:110` |
| 18 | v1 placeholder is its own component, off at first | "Separate component, off at first (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:111` |
| 19 | Dropped fact with no EN words | "Small tag after the sentence" | `[accepted option 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:112` |
| 20 | Page line of the default Human version | "From kendojidai.com (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:113` |
| 21 | Two empty A4 pages | "Drop them, small Translator fix (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:114` |
| 22 | Mark read at each page start (Restart: replaced in part in round 74, section 15.27.4) | "Run program reads the mark per page (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:116` |
| 23 | Monitor dashboard row stays until the book runs | "Row stays until the book runs (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:119` |
| 24 | Unit order | "DW73 + TF73 now, RT73 after DW73 check (Recommended)" | `[accepted recommendation 2026-10-30 20:17]` | `qa-memory-2026-10-30.md:120` |

##### 15.26.18 Open items for the owner

No open item remains. The one item below was decided in round 73d answer 8 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:136`, "This Mac, copy in data folder (Recommended)" `[accepted recommendation 2026-10-30 22:04]`). The text stays as history.

1. Where the v1 placeholder lives. Example: `left_foot_full` p051 has no Agent text. Its page image shows on `v2.kendotranslation.com` (when it goes live). The v1 EN line "Kendo is about hidari-te, hidari-koshi, and hidari-ashi." exists in the md file on this Mac. You said that the v1 text is "for display testing purpose ONLY" (`qa-memory-2026-10-30.md:109`).
   - (a) Chosen in round 73d answer 8: the v1 placeholder shows on this Mac only. The Viewer reads the md files from the copy in `<V2>/data/v1-md/` when a page opens. The old text said: "at request time when a switch is on". Benefit: 0 MB on the server, no migration for it, and nothing to delete later. Cost: the hosted site shows no placeholder, and the code has one more switch.
   - (b) The v1 placeholder goes into `reader_v1` records on every server. Benefit: the hosted site shows it, as a test reader needs. Cost: about 100 to 120 MB on the server, a larger S2 upload, and a clean-up later.

All other choices of this section are unit defaults (15.26.16). The restatement of unit DW73 asks the owner to check the readings of the panel design before RT73b runs. The owner checked the readings in round 73d answers 5, 6, and 7 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:133-135`): "All 5 right (Recommended)", "All 5 right (Recommended)", "All 4 right (Recommended)" `[accepted recommendation 2026-10-30 22:04]`. The defaults D4 to D23 are the design behind these readings `[agent inference]`. The 16 unit defaults of RT73b are accepted (round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`, section 15.28.7).

##### 15.26.19 What changes against the DT73b draft and against the current docs

Against the DT73b draft:

- The control for the EN texts (check boxes in the toolbar) becomes the full component list with movable and resizable panels (round 73c answer 4).
- The v1 ZH placeholder is a component (round 73c answer 3). The draft left it open.
- The v1 placeholder is a separate component, off at first (round 73c answer 5). The draft had it as option (a) of an open item.
- A dropped fact with no EN words shows as a small tag (round 73c answer 6). The draft used a dotted line under the whole sentence.
- The page line of the default Human version is "Human translation from kendojidai.com." (round 73c answer 7).
- The two empty pages are dropped (round 73c answer 8). The Reader uses 1,124 pages.
- The v1 placeholder counts in no number and has no line in the work block (round 73c answer 2). The draft had a v1 line in the work block.
- New unit defaults. D20 is the JA line of a v1 file. D21 is the JA-only rows of the Human panel. D22 is the changed fact with no EN words.

Against the current docs and code:

- 15.19.5 l2760 and l2761, 15.19.6 l2788 and l2801, and 15.23.6 l3594 and l3595 state the toolbar control as the rule. They now carry a note that round 73c answer 4 replaces it.
- Section 12 l259 now notes that a page with no unit is dropped.
- 15.24.11 item 2 is decided: Option A.
- The restart mark line (l4293) now says that the run program reads the mark at each page start. Replaced in round 74: the restart mark has no key `box` and archives the run (section 15.27.4).
- Lines that still say 1 page: l3433, l4446, l4577. RT73a fixes them.
- `app/lib/reader-folds.ts:127-130`: `workPages` returns 1 for a web article.
- `app/lib/reader-data.ts:179`: `images: f.pages > 0`.
- `app/components/ReaderBook.tsx:333`: "1 pages".
- `app/components/ReaderBook.tsx:341-343`: the AI line counts every record.

##### 15.26.20 Not verified

- The screens of 15.26.2 on a live browser.
- The text of options 1 and 3 of round 62 answer 7.
- That the settings sanitizer and the save route handle the new keys and a clear (15.26.6.9). Verified in part by DZ74 for the route and the sanitizer (15.26.6.9). The test numbers of RT73b are Not verified here.
- That `pb_users.py` can create a disabled user.
- The code of `AdminVersionPanel` and of `matchWorks`.
- The size of the v1 records (about 100 to 120 MB is an estimate).
- That the Translator crashes on an empty page (the claim comes from the code at `translator_run.py:452`).
- The result of unit TF73. This section assumes that `a4_cut` gives 1,124 pages after TF73.
- Whether the md JA lines equal the page images. Unit DT73b read pages 50 and 51 of `left_foot_full` only.
- The count of pages with a Human version on the live database. This unit did not read PocketBase.
- That `DragHandle` works inside the grid of the reader panels, and the scroll sync across panel bodies. Replaced in part: the RT73b report says that the `DragHandle` in the panel row and the scroll together are tested in Firefox (accepted in round 75 answers 13 and 14, `qa-memory-2026-10-31.md:63-64`). DZ74 ran no browser test, so this stays Not verified by DZ74. A band has no scroll together (15.26.6.11).
- The kendo term highlights of 18d4ac29 p001.
- The number of rows that carry a tag "fact dropped" or "fact changed".
- The test numbers of round 72. They come from the brief.

##### 15.26.21 Decided in round 73d (unit DY73)

Source: `.opencode/reminders/qa/qa-memory-2026-10-30.md:129-141`, owner answers of 2026-10-30 22:04. The lines above carry the same facts in place.

- Answer 2 (`:130`): the readings of round 73c answers 2, 3, 9, and 11 are right `[validated reading 2026-10-30 22:04]`. Example: the v1 placeholder of `left_foot_full` p051 counts in no number on the Reader dashboard `/read`.
- Answer 4 (`:132`): the row of a book with a waiting Restart mark reads "Mark waiting: Restart ED_2 requested HH:MM" in the group "Waiting for a run" on the Monitor dashboard `/` (15.24.4.1). Section 15.24.4.5 explains Resume and Restart. Replaced in round 74 answers 5 to 11: the row text is "Mark waiting: Restart requested HH:MM" (section 15.27.4).
- Answers 5, 6, and 7 (`:133-135`): the readings 1 to 14 of unit DW73 are right `[validated reading 2026-10-30 22:04]`. Example: the v1 JA line of `left_foot_full` p051 has the page line "v1 Gemini placeholder text."
- Answer 8 (`:136`): the v1 placeholder lives in `<V2>/data/v1-md/` on this Mac. It replaces the default D27 (collection `reader_v1`) and decides open item 1 of 15.26.18.
- Answer 9 (`:137`): RT73 runs as two units. RT73a does the data and the counts. RT73b does the components and the panels.
- Answer 10 (`:138`): aki-main runs the S2 upload to the local PocketBase `127.0.0.1:8090` once, after RT73a. Later runs stay by hand by the owner.
- Open: the reading of round 73c answer 4 (`:124`) has no validation in answer 2. It stays `[reading pending owner check]` in 15.26.1.2 and 15.26.1.4 (conflict 4).
- Not changed in this unit: the lines l3433, l4446, and l4577 that still say 1 page. RT73a measures the new numbers and a later docs unit changes them. Unit DZ73 changed l4446, l4448, and l4577 in round 74 (section 15.27.7). The line l3433 is a text sketch and stays `[agent inference]`.

#### 15.27 Round 74 decisions: Stop, Resume, Restart, confirm dialogs, critique share (unit DZ73)

Unit DZ73 wrote this section on 2026-10-31 (round 74). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-10-31.md`, lines 26 to 48. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.25. Each line of this file that this section replaces carries a pointer to it. Section 15.27.7 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, round 74 answer 4). Resume and Restart apply to real runs in `<T2>/data/book-store/<book>/` only. That folder does not exist yet `[check: DZ73 2026-10-31 15:32 ls data/book-store in <T2>, "No such file or directory"]`.

##### 15.27.1 Owner words

- Round 73e answer 9 (`qa-memory-2026-10-31.md:12`), first two lines: "Resume mean continue the whole book\nRestart mean archive the current run, and run the whole book from the first page." `[user 2026-10-31 00:59]`.
- Round 74 answer 2 (`qa-memory-2026-10-31.md:28`): "option 1. we will want to record the percentage of actually used critique vs rejected" `[user 2026-10-31 15:17]`.
- Round 74 answer 5 (`qa-memory-2026-10-31.md:31`): "Whole book stops (Recommended)" `[accepted recommendation 2026-10-31 15:17]`.
- Round 74 answer 6 (`qa-memory-2026-10-31.md:32`): "Count back to 0 (Recommended)" `[accepted recommendation 2026-10-31 15:17]`.
- Round 74 answer 7 (`qa-memory-2026-10-31.md:33`): "Move run files, keep history (Recommended)" `[accepted recommendation 2026-10-31 15:17]`.
- Round 74 answer 8 (`qa-memory-2026-10-31.md:34`): "User can choose option 1 or 2. Option 1 is default." `[user 2026-10-31 15:17]`. Option 1 is the prompts that the archived run started with. Option 2 is the last live prompts of the archived run.
- Round 74 answer 9 (`qa-memory-2026-10-31.md:35`): "Same phase (Recommended)" `[accepted recommendation 2026-10-31 15:17]`.
- Round 74 answer 10 (`qa-memory-2026-10-31.md:36`): see section 15.27.6.
- Round 74 answer 11 (`qa-memory-2026-10-31.md:37`): "Book row and Details only (Recommended)" `[accepted recommendation 2026-10-31 15:17]`.
- Round 74 answer 12 (`qa-memory-2026-10-31.md:38`): "option 1. also for other process-related buttons (start, pause, etc)" `[user 2026-10-31 15:17]`.

##### 15.27.2 Confirm dialog

Reading of answer 12 `[reading pending owner check]`: each process button of the Monitor dashboard `/` on this Mac opens a confirm dialog. The buttons are Run, Pause, Resume, and Restart. Cancel is the first button.

Dialog rules `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 4, "Dialog text per button"):

- Cancel is the first button and has the focus when the dialog opens. Esc closes the dialog. The dialog has the role `dialog` and a label. Sketch 5 in section 15.24.8 uses the same rules.
- The dialog names the book and says what the button does.
- A press on Cancel writes no file.
- The dialog of Restart holds the prompt choice. Option 1 is the default. Replaced in round 78 answers 4 and 5 (`qa-memory-2026-11-01.md:66-67`) `[reading pending owner check]`: the dialog holds one pick list for each box, with quick select rows. "Starting versions" is the default. See section 15.31.2.
- Other option: one generic text for all buttons, for example "Restart this book?". Benefit: one component and no text for each button. Cost: the owner must remember what each button does.

Example (values are an example): the dialog of the button Restart on the book row of `mental_full`.

```
+--------------------------------------------------------------------------------------+
| Restart Making the Difference on the Day (mental_full)?                              |
|                                                                                      |
|   The current run moves to archive/<UTC time>/.                                      |
|   The book runs again from page 1 in phase agent-phase-4.                            |
|   Prompts:                                                                           |
|     (o) The prompts that the archived run started with (ED_2 v4.1.0)                 |
|     ( ) The last live prompts of the archived run (ED_2 v4.1.6)                      |
|                                                                                      |
|                                                          [Cancel]   [Restart]        |
+--------------------------------------------------------------------------------------+
```

The other three dialogs follow the same frame `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`:

- Run: "Run Making the Difference on the Day (mental_full) in phase agent-phase-3? The button writes a mark. An opencode agent starts the run."
- Pause: "Pause Making the Difference on the Day (mental_full)? The process finishes the current page and its update point, then it stops." The source of the second sentence is round 72 answer 12 (`.opencode/reminders/qa/qa-memory-2026-10-30.md:40`). This text is for the Pause button of a real book on the Monitor dashboard `/` on this Mac (round 70 answer 12). That button finishes the current page and ends the process. The pilot Pause button on the run view `/runs/<stamp>` has its own text, see below.
- Resume: "Resume Making the Difference on the Day (mental_full)? The book continues with the next page after the last accepted page."

The pilot component `app/components/PauseButton.tsx` has no dialog today `[check: DZ73 2026-10-31 15:35 grep -n -i "confirm\|dialog" app/components/PauseButton.tsx, no line]`. Section 15.27.10 holds the open item. This unit changes no code. Decided in round 75 answer 11: RT74 adds the dialog (section 15.28.6). RT74 added the dialog to the pilot Pause button on the run view `/runs/<stamp>` `[file: <V2>/app/components/PauseButton.tsx]`. Pause: title "Pause run <stamp>?" and body "The button creates the file PAUSE. Calls that run now finish. New calls wait until you press Resume." Resume: title "Resume run <stamp>?" and body "The button deletes the file PAUSE. A waiting run goes on within a few seconds." The texts follow `/api/pause` `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]` ("Pilot Pause dialog text (Recommended)").

##### 15.27.3 Buttons of the Monitor dashboard

| Button | Where | What it writes | Dialog |
|---|---|---|---|
| Run | Book row of a book that never ran, and "Run phase 4" of a completed phase 3 book. Grayed out on a Running row (round 80 answer 13, section 15.33.3) | `request.json`, action "run", with the phase | Yes |
| Pause | Book row of a book in the state Running | file `PAUSE` | Yes |
| Resume | Book row of a Stopped book (cause Pause or Ctrl-C). Grayed out on a Running row (round 80 answer 13, section 15.33.3) | `request.json`, action "resume" | Yes |
| Restart | Book row and Details view only (round 74 answer 11), in every state with a run (round 76 answer 5) | `request.json`, action "restart", with the key `prompts` | Yes, with the prompt choice |

No Restart button sits on a stopped-box flag. The states that show the button Restart are decided in round 76 answer 5: every state with a run (section 15.29.3).

##### 15.27.4 Rules of Stop, Resume, and Restart

Stop (round 74 answer 5):

- A box that gets its 3rd double REJECT in a row stops the whole book after the current page is saved.
- The stop reason is "rule". The row reads "Stopped by failure" in the group "Needs attention" `[file: <T2>/data/scripts/translator/store.py:37,97]`.
- The Details view shows the flag as text: "ED_2 stopped after 3 double REJECTs in a row", and the 3 audit reject reasons. The flag has no button.
- Replaced in round 74 answer 5 (`qa-memory-2026-10-31.md:31`): an earlier unit default of DU73 let the book run on while one box was stopped. The owner never decided it (round 73e answer 9, `qa-memory-2026-10-31.md:12`).

Resume (round 74 answers 5 and 6):

- Resume continues the whole book with the next page after the last accepted page (section 15.24.7).
- The double REJECT count of the stopped box goes back to 0. The box fires again after 5 new critiques. Three more double REJECTs in a row stop the book again.

Restart (round 73e answer 9, round 74 answers 7, 8, 9):

- Restart moves the run files of the book into `<T2>/data/book-store/<book>/archive/<run ID>/`. Nothing is deleted. The folder `prompts/` moves too (round 75 answer 9, section 15.28.4). Replaced in round 79 answer 10 (`qa-memory-2026-11-01.md:102`): the folder name is the run ID of the ended run (section 15.32.5).
- The file `history.jsonl` stays in place and gets one event "restart".
- The new run uses the same phase and starts at page 1. Reader text after a Restart: readers keep the text of the opened run until the admin opens a run of the new start (round 75 answer 4, section 15.28.3).
- The prompt choice is the key `prompts` of the mark. Replaced in round 78 answers 4 and 5: the choice is a version for each box (section 15.31.2).

Mark `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 3, "One restart action"). Example values:

```
{"schema": "book-request-v1", "book": "mental_full", "action": "restart", "phase": "agent-phase-4", "prompts": {"TS_0": "v4.1.0", "TS_1": "v4.1.0", "TS_2": "v4.1.0", "TS_3": "v4.1.0", "TL_0": "v4.1.0", "TL_1": "v4.1.0", "TL_2": "v4.1.0", "TL_3": "v4.1.0", "ED_0": "v4.1.0", "ED_1": "v4.1.0", "ED_2": "v4.1.0", "ED_3": "v4.1.0", "QA_0": "v4.1.0", "QA_1": "v4.1.0", "QA_2": "v4.1.0", "QA_3": "v4.1.0"}, "requested_utc": "2026-11-05T09:30:00Z", "requested_by": "Monitor dashboard"}
```

- The key `prompts` is a map of 16 labels, one for each box (round 79 answer 12, section 15.32.4). Old text, replaced: "start" (default) or "last". The keys schema, book, action, phase, requested_utc, and requested_by are the keys of `write_mark` `[file: <T2>/data/scripts/translator/store.py:253-262]`.
- Other option: two actions, "restart" and "restart-last", and no key `prompts`. Benefit: each action has a fixed key list. Cost: a second action in `MARK_ACTIONS`.

Restart mark on a running book `[accepted 2026-11-01 01:03, round 76 answer 5, qa-memory-2026-11-01.md:8]` ("Every state with a run (Recommended)", section 15.29.3): the run program stops after the current page is saved, archives the run, and ends. An opencode agent starts the book again from page 1 (round 77 answer 12, `qa-memory-2026-11-01.md:43`, section 15.30.3). Old text: "starts again from page 1" in the same process.

- Other option: the Monitor dashboard refuses Restart until the book is stopped (also after a Pause). Not chosen. Benefit: the archive never runs in a live process. Cost: the owner must press Pause first.

Row text of a waiting Restart mark `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`: "Mark waiting: Restart requested HH:MM" (section 15.24.4.5).

##### 15.27.5 Details view: archived runs and critique share

The Details view of a book gets two new parts `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]` (DZ73 default 6, "Details per box"). The Viewer reads files only. It writes no prompt file.

```
Archived runs (1)
UTC time          Phase          Pages done   Prompts at start     Prompts at end
20261105T093000Z  agent-phase-4  80 of 169    ED_2 v4.1.0, TL_1 v4.1.0 ED_2 v4.1.6, TL_1 v4.1.2

Critique share of the current run
Box    Critiques used in live rewrites     Critiques dropped after a double REJECT
ED_2   10 of 15 (66.7 percent)             5 of 15 (33.3 percent)
TL_1   5 of 5 (100.0 percent)              0 of 5 (0.0 percent)
```

- The values are an example and not run data.
- The archive folder name gives the UTC time. The archived `status.json` gives the phase, the pages done, and the prompt versions at the end `[agent inference]`. The version labels followed round 75 answer 9: `v<run>.<updates>`, for example `v1.6` (section 15.28.4). Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): `v<phase>.<run>.<updates>`, for example `v4.1.6` (section 15.30.2). The archive folder also holds the folder `prompts/` of the run `[reading pending owner check]`.
- The prompt versions at the start come from the `prompts` block of `run.json` of the first archived page (`translator-design.md` section 9.23.5, item 10) `[agent inference]`.
- The line of each box follows the owner words of round 74 answer 2. The count comes from the events `update-point-ended` in `history.jsonl` (`translator-design.md` section 9.25.2).
- Other option: one share for the whole book, with no line for each box. Benefit: a shorter view. Cost: the owner cannot see which box loses its critiques.

##### 15.27.6 Reader access to agent text (decided in round 75 answer 3)

Status: decided in round 75 answer 3 (`qa-memory-2026-10-31.md:53`): "Admin opens any run" `[accepted option 2 2026-10-31 19:21]`. The option text said: "The same button, but it shows for every run, also for unfinished runs and pilots. You decide each time. Benefit: you can show a sample early. Cost: nothing guards against a wrong click." Section 15.28.2 holds the design. DZ73 did not design the gate.

Owner words, round 74 answer 10 (`qa-memory-2026-10-31.md:36`): "Reader should only have access to agent-translation that admin (me) open access to right? I will only show finished translation (all phase finish) to Reader anyway." `[user 2026-10-31 15:17]`.

Fact today:

- S2 puts the run of the admin run mark, else the newest PASS run of `<T2>/data/pilot-run`, into `reader_pages` `[file: app/scripts/sync-runs.mjs:14,51,86,792-822]` `[check: DZ73 2026-10-31 15:35 grep -n "newest PASS\|PILOT" app/scripts/sync-runs.mjs]`. Replaced in round 75 answer 3 (`qa-memory-2026-10-31.md:53`): S2 uses the opened runs only (section 15.28.2).
- So pilot agent text is in `reader_pages` now. The rule `isTranslatedPage` counts a page as translated when a `reader_pages` record exists, that is, when readers can view its English text (section 15.25.2).
- S2 does not read `<T2>/data/book-store` `[check: DZ73 2026-10-31 15:35 grep -c -i "book-store" app/scripts/sync-runs.mjs, 0]`.
- No admin step opens agent text to readers today `[check: aki-main 2026-10-31 15:18]`. Replaced in round 75 answer 3: the admin presses "Open to readers" for a run (section 15.28.2).

Rule of the vision (`VISION-viewer.md` l2716): the default EN text is the agent text. An admin chooses one human version per page. The reader can switch. Replaced in part in round 75 answer 3: the agent text reaches readers after the admin opens its run (section 15.28.2).

##### 15.27.7 Lines of this file that round 74 replaced

| Lines | Subject | Action |
|---|---|---|
| 3889, 3912, 3928, 3931, 3942 | Restart, Resume, stop reason | rewritten to the owner rules |
| 3996, 3999, 4000, 4001 | no dialog | replaced by the confirm dialog (15.27.2) |
| 4003, 4033, 4100, 4134 | button place, flag, flow, example row | rewritten, Restart on the book row and in Details |
| 4293, 4322, 4350 | mark keys, component list, tests | rewritten (15.27.4, 15.27.2) |
| 4305 | files that the Viewer writes | no change, `request.json` still holds the Restart mark |
| 4446, 4448, 4571, 4577 | counts of the Reader dashboard | new numbers of unit RT73a (15.27.8) |
| 5238, 5242, 5271, 5273 | fact marks, v1 placeholder | corrected (15.27.8) |
| 5360, 5361, 5362, 5364, 5471 | sizes, D27 | measured sizes, D27 closed (15.27.8) |
| 5500, 5532, 5561, 5567 | history lists | pointer to this section |

##### 15.27.8 Numbers that unit RT73a measured

The checks read the RT73a logs in `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r73/RT73a/`. Not verified: the live check of aki-main at 2026-10-31 01:04. The output file of that check was not found. The RT73a logs give the same numbers.

- Books: 22 works, 4,821 pages, 20 translated (`smoke-read.log:71`).
- Kendo Jidai: 320 works, 9,295 pages, 1,131 translated, 12.2 percent (`smoke-web.log:4`).
- Total: 342 works, 14,116 pages, 1,151 translated, 8.2 percent (`smoke-web.log:3`).
- Year rows: Kendo Jidai 2012 has 949 pages, 3 web articles, and 11 of 958 pages translated (1.1 percent). Kendo Jidai 2014 has 1,051 pages, 3 web articles, and 15 of 1,061 pages translated (1.4 percent) (`smoke-read.log:70`).
- Storage in PocketBase (`run-upgrade.out:8-10`): `reader_pages` with the run_id web-ja 14.40 MB, `reader_versions` 5.25 MB, `own_translations` 13.93 MB. No collection `reader_v1` exists in the migration 1793300011.
- The v1 copy in `<V2>/data/v1-md/` holds 13,083 md files in 32 folders. The size is 88,190,061 bytes, which is 84.10 MiB (`copy_v1.out:6` and a `stat` sum of DZ73). The brief of DZ73 said "84.10 MB". The unit is MiB.
- Two-line v1 blocks stay as they are (round 73e answer 3, `qa-memory-2026-10-31.md:6`).
- The fact 熊本 of `b5106cae` U011 has the kind "changed" and not "dropped".
- Default D27 is closed.

##### 15.27.9 Unit defaults of DZ73

1. The wording of the four confirm dialogs and the layout of the Restart dialog (15.27.2). Other option: one generic text. Accepted in round 75 answer 12 ("Dialog text per button (Recommended)", DZ73 default 4) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`.
2. The key `prompts` of the Restart mark (15.27.4). Other option: two actions. Accepted in round 75 answer 12 ("One restart action (Recommended)", DZ73 default 3) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`.
3. A Restart mark on a running book stops the run after the page is saved (15.27.4). Other option: the button refuses until the book is stopped (also after a Pause). Accepted in round 76 answer 5 (DZ73 default 2, `qa-memory-2026-11-01.md:8`, section 15.29.3).
4. The row text "Mark waiting: Restart requested HH:MM" (15.27.4). Other text: "Mark waiting: Restart (prompts: start) requested HH:MM". Accepted in round 75 answer 12 ("Short mark row text (Recommended)", DZ73 default 5) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`.
5. The two new parts of the Details view (15.27.5). Other option: one share for the whole book. Accepted in round 75 answer 12 ("Details per box (Recommended)", DZ73 default 6) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`.

##### 15.27.10 Open items for the owner

1. The dialog of the pilot button `PauseButton.tsx`. Option 1 (recommended): add the dialog with the Monitor dashboard code unit, with `ConfirmDialog.tsx`. Benefit: one change, one component. Cost: the pilot button has no dialog until then. Option 2: add the dialog to `PauseButton.tsx` now. Benefit: the rule of answer 12 holds at once. Cost: a code unit for one button, and a second edit later. Decided in round 75 answer 11 (`qa-memory-2026-10-31.md:61`): "Add it in the next code unit (Recommended)" `[accepted recommendation 2026-10-31 19:21]`. Option 1 is chosen. Unit RT74 builds the dialog now (section 15.28.6).
2. Reader access to agent text (15.27.6). Decided in round 75 answer 3 (section 15.28.2).
3. The states that show the button Restart. Option 1 (recommended): every state with an archived or stored run, also Completed. Benefit: the owner can repeat a finished book. Cost: a mistake is possible, but the dialog asks first. Option 2: Stopped, Stopped by failure, and Paused only. Benefit: fewer mistakes. Cost: the owner cannot repeat a finished book. Decided in round 76 answer 5 (`qa-memory-2026-11-01.md:8`): "Every state with a run (Recommended)" `[accepted recommendation 2026-11-01 01:03]`. Option 1 is chosen. The states are Running, Stopped, Stopped by failure, Stopped unexpectedly, and Completed (section 15.29.3). Round 76 answer 4 merged Paused into Stopped (section 15.29.2).
4. The unit defaults 3 and 5 of section 15.27.9. Round 75 answer 12 accepted default 5 (Details per box). Round 76 answer 5 accepts default 3.
5. The prompt restore and the files that move at a Restart (`translator-design.md` section 9.25.6, item e).

##### 15.27.11 Not verified

- No code ran. The Monitor dashboard code is not built, except the pilot `PauseButton.tsx`.
- The reading of answer 12 is `[reading pending owner check]`.
- The dialog texts, the mark key, and the Details view are unit defaults and not owner decisions. Round 75 answer 12 accepted the dialog texts, the key `prompts`, the row text, and the Details view (section 15.28.7). The Restart mark on a running book is accepted in round 76 answer 5.
- The live check of aki-main at 2026-10-31 01:04 (section 15.27.8).
- The tag text of the fact 熊本 for the kind "changed" with `start` and `end` null.

Status: round 74 answers applied by unit DZ73. Waiting for the owner check.

#### 15.28 Round 75 decisions: admin gate for agent text, reader text after Restart, Pause dialog, AI tag, Paused and Stopped (unit DZ74)

Unit DZ74 wrote this section on 2026-10-31 (round 75). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-10-31.md`, lines 50 to 76. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.26. Unit RT74 builds the code of sections 15.28.2 and 15.28.6 at the same time. Each line of this file that this section replaces carries a pointer to it. Section 15.28.8 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10). No real run exists yet `[check: DZ74 2026-10-31 19:35 ls data/book-store in <T2>, "No such file or directory"]`.

##### 15.28.1 Owner words

- Round 75 answer 3 (`qa-memory-2026-10-31.md:53`): "Admin opens any run" `[accepted option 2 2026-10-31 19:21]`. Option text: "The same button, but it shows for every run, also for unfinished runs and pilots. You decide each time. Benefit: you can show a sample early. Cost: nothing guards against a wrong click." Option 1 (not chosen) showed the button only after all phases finished.
- Round 75 answer 4 (`qa-memory-2026-10-31.md:54`): "Keep the opened text (Recommended)" `[accepted recommendation 2026-10-31 19:21]`.
- Round 75 answer 9 (`qa-memory-2026-10-31.md:59`): "option 2. but label using both run number and update number: v2.5 means that in book run #2 (1 restart), after 5 prompt updates" `[user 2026-10-31 19:21]`. Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): "integrate the phase number into the version number (v3.2.4 mean phase 3 - run 2 - version 4)" `[user 2026-11-01 08:12]`.
- Round 75 answer 10 (`qa-memory-2026-10-31.md:60`): "What is there `paused` and `stopped`? they should be the same?" `[user 2026-10-31 19:21]`. Decided in round 76 answer 4 (section 15.29.2).
- Round 75 answer 11 (`qa-memory-2026-10-31.md:61`): "Add it in the next code unit (Recommended)" `[accepted recommendation 2026-10-31 19:21]`.
- Round 75 answer 12 (`qa-memory-2026-10-31.md:62`): "Share from history (Recommended), One restart action (Recommended), Dialog text per button (Recommended), Short mark row text (Recommended), Details per box (Recommended), Dialog test (Recommended)" `[accepted recommendation 2026-10-31 19:21]`.
- Round 75 answers 13 and 14 (`qa-memory-2026-10-31.md:63-64`): the 16 unit defaults of RT73b, each with "(Recommended)" `[accepted recommendation 2026-10-31 19:21]`. Section 15.28.7 lists them.
- Round 75 answer 15 (`qa-memory-2026-10-31.md:65`): "Fix in next code unit (Recommended)" `[accepted recommendation 2026-10-31 19:21]`.
- Round 74 answer 10 (`qa-memory-2026-10-31.md:36`) is the question behind answer 3: "Reader should only have access to agent-translation that admin (me) open access to right? I will only show finished translation (all phase finish) to Reader anyway."

##### 15.28.2 Admin gate for agent text

Problem today. S2 puts the run of the admin run mark, else the newest PASS run of `<T2>/data/pilot-run`, into `reader_pages` `[file: app/scripts/sync-runs.mjs:14,51,86,792-822]`. No admin step opens agent text. So the pilot pages of `left_foot_full` p046 to p050 are readable by approved readers now, and the owner never agreed to that.

Rule (owner words, answer 3): the admin opens a run. The button shows for every run, also for unfinished runs and pilot runs. The admin decides each time.

Design. Round 76 answers 10 and 11 (`.opencode/reminders/qa/qa-memory-2026-11-01.md:13-14`) accepted every part below that is not owner words. The tags show the answer. Unit RT74 built the design in commit f42e8e6.

1. Readers see the agent text of a run only after the admin presses "Open to readers" for that run `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`. A record of `reader_opens` holds one run folder name of one page, and not one run stamp of one book. Pilot example: book `left_foot_full`, p046 has the folder `20261029T051154Z-r41` and p047 has `20261029T054303Z-r41`. The run view button writes one record for each page run. It opens or closes all 5 page runs of list `20261029T051152Z` in one step `[file: <V2>/app/lib/pb.ts:370-381]` `[file: <V2>/app/app/api/admin/opens/route.ts]` `[file: <V2>/app/components/ReaderOpenRows.tsx]`. Round 78 answer 8 (`qa-memory-2026-11-01.md:70`): a real book run has one record for each book run, and a pilot keeps one record for each page (section 15.31.4).
2. Nothing is open by default `[reading pending owner check]` (`qa-memory-2026-10-31.md:71`).
3. Store `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`: a new PocketBase collection `reader_opens`. The migration is `1793300012_v2_reader_opens.js`. One record holds one opened page run: source, book, and run folder name. All five rules of the collection (list, view, create, update, delete) are admin only, also list and view. They are not the rules of `run_marks` `[file: <V2>/data/scripts/pocketbase/pb_migrations/1793300012_v2_reader_opens.js:49-53]`. Other option: a field on `run_marks`. Benefit: no new collection. Cost: a run mark is per page, and an open is per run.
4. Close `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`: the admin can close a run again with "Close to readers". Other option: an open is final. Cost: a wrong click cannot be undone.
5. Place of the button `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`: the run view `/runs/<stamp>` on the Monitor dashboard. It shows one row for each book of the run. The status line sits on the page `/translate/<slug>?at=pNNN` (component `HtvPageSection.tsx`), and not on `/page/<slug>/<page>`. It reads "Readers see: run X (opened)" or "Readers see: run X (opened, run mark)" or "Readers see no agent text for this page. No run of this page is open." A fourth text covers an open run without a PASS verdict: "Readers see no agent text for this page. The open run X has no PASS verdict." The line ends with "Readers see a change after the next S2 run." `[file: <V2>/app/lib/reader-opens-rule.ts:48-53]` `[file: <V2>/app/components/HtvPageSection.tsx:269]`.
6. Confirm dialog `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]` ("Open dialog counts PASS pages"): Open and Close ask first. Cancel is the first button and has the focus. This is the rule of section 15.27.2. Text of the Open dialog in the code of RT74: title "Open run 20261029T051152Z of left_foot_full to readers?", body "Readers see the Agent text of 5 of 5 pages after the next S2 run. The number counts the pages whose run has the verdict PASS. You can close the run again.", buttons [Cancel] [Open to readers] `[file: <V2>/app/components/ReaderOpenRows.tsx]`. The title holds the stamp of the run view. The number 5 of 5 is the example of RT74 and is Not verified by DZ75. The example text of DZ74 is replaced.
7. S2 rule `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`. It replaces the old rule "run mark, else newest PASS". The candidate runs of a page are the opened runs. The shown run is one of three:
   - the run of the admin run mark, if that run is open
   - else the newest open PASS run
   - else no agent text
8. A page whose `reader_pages` record holds a run that is no longer open loses the agent text at the next S2 run. A web article page goes back to the Original text record `web-ja`. A book page loses its record. `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]`.
9. Readers see a change only after the next S2 run. The admin page views still show all runs. `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]`. If the collection `reader_opens` is missing, S2 stops with "Collection reader_opens is missing. Restart PocketBase so that migration 1793300012 runs." `[file: <V2>/app/scripts/sync-runs.mjs:774-776]`.

Example of the S2 rule (`mental_full` p014, data from the line 3724 of this file). The page has a PASS run `20261026T195046Z-r41` and a newer FAIL run `20261028T023007Z-r41`.

- The admin opens the PASS run only. Readers see the PASS text.
- The admin opens the FAIL run only. Readers see no agent text, because the rule takes the newest open PASS run. `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]` ("Open FAIL run shows nothing").
- The admin opens neither. Readers see no agent text.

Effect at the next S2 run with nothing opened:

- The 28 pilot agent pages leave `reader_pages`. They are 20 pages in Books and 8 pages in Kendo Jidai. S2 removed 28 agent records and set `18d4ac29/p001` back to `web-ja`. So 29 records changed `[check: aki-main 2026-11-01, S2 --apply, relayed in the brief of DZ75]`.
- The Reader dashboard `/read` count went from "English: 1,151 of 14,116 pages translated (8.2 percent)" to "English: 1,124 of 14,116 pages translated (8.0 percent)" `[check: aki-main 2026-11-01 01:08 live read of the Reader dashboard /read, relayed in the brief of DZ75]`. The drop is 27 and not 28, because `men0/p005` belongs to `men0`, which the Reader hides as part of `men_full` (round 69 answer 12, `[file: <V2>/app/lib/reader-folds.ts:29]`).
- The 311 web articles keep their Original text records `web-ja` and their Human versions (section 15.26).

Open check for aki-main. The data names a run ID for each page: p046 has `20261029T051154Z-r41` and p047 has `20261029T054303Z-r41` `[check: DZ74 2026-10-31 19:41 ls data/pilot-run/left_foot_full_p046 and left_foot_full_p047]`. The list folder `20261029T051152Z` groups the 5 pages. So "one run stamp of one book" can mean the list stamp or the run ID of one page. Which one the record of `reader_opens` holds is Not verified. The report of RT74 states it. Answer, checked by DZ75: the record holds the run folder name of one page `[file: <V2>/data/scripts/pocketbase/pb_migrations/1793300012_v2_reader_opens.js:7-13]`.

##### 15.28.3 Reader text after a Restart

Owner words (answer 4): "Keep the opened text (Recommended)".

Reading `[reading pending owner check]` (`qa-memory-2026-10-31.md:72`): after a Restart, readers keep the text of the opened run. They see it until the admin opens a run of the new start. Replaced in round 77 answer 13 (`qa-memory-2026-11-01.md:44`): "If admin choose to show it then reader can read it, if not then they cant" `[user 2026-11-01 08:12]`. The admin gate also covers an archived run `[reading pending owner check]` (`qa-memory-2026-11-01.md:58`).

- A Restart moves the run files into `<T2>/data/book-store/<book>/archive/<run ID>/` (round 74 answer 7). S2 then reads the opened run from that archive folder, only if the admin opened that run (round 77 answer 13).
- S2 does not read `<T2>/data/book-store` today `[check: DZ73 2026-10-31 15:35 grep -c -i "book-store" app/scripts/sync-runs.mjs, 0]`. A code unit must add it.
- Example (invented times): the admin opened run 1 of `mental_full`. The owner presses Restart at 09:30. The files of run 1 move to `archive/20261104T001500-0800/`. Readers still see run 1, because the admin opened run 1 before the Restart. If the admin did not open run 1, readers see no agent text. If the admin closes run 1 later, readers lose its text at the next S2 run. The admin later opens run 2. The S2 rule shows the newest open PASS run, which is run 2 `[accepted 2026-11-01 01:03, round 76 answer 12, qa-memory-2026-11-01.md:15]`.
- Other option for the last step: when the admin opens run 2, run 1 closes at once. Benefit: one open run for each book. Cost: a second click or a hidden side effect.

##### 15.28.4 Version labels on the Monitor dashboard

Owner words (answer 9): "label using both run number and update number: v2.5 means that in book run #2 (1 restart), after 5 prompt updates". The label was `v<run>.<updates>`. Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): `v<phase>.<run>.<updates>` (section 15.30.2). `<T2>/docs/drafts/translator-design.md`, section 9.26.4 holds the rule, the example of ED_2, and four open points. Round 76 answers 6 to 8 decided points i to iii (section 15.29.4).

- The Restart dialog (section 15.27.2) shows the labels. Example line: "The prompts that the archived run started with (ED_2 v4.1.0)". The other line: "The last live prompts of the archived run (ED_2 v4.1.6)". The prompt files move into the archive with the run files, and the chosen versions are copied back as `v4.2.0`. Replaced in round 78 answers 4 and 5 (`qa-memory-2026-11-01.md:66-67`) `[reading pending owner check]`: the dialog shows a pick list for each box with notes, and not these two lines (section 15.31.2).
- The Details view (section 15.27.5) lists the labels at the start and at the end of each archived run. Example row: start "ED_2 v4.1.0, TL_1 v4.1.0", end "ED_2 v4.1.6, TL_1 v4.1.2".
- The grid "Prompt versions" of the book detail view shows the label of each box, and the label holds the phase, for example "ED_2 v3.1.1" `[reading pending owner check]` (round 77 answer 10 and `qa-memory-2026-11-01.md:54`). Old text: "ED_2 phase 3 v1.1", default F, not accepted in round 77 answer 9 (`translator-design.md` section 9.23.7).
- Round 76 answers 6 to 8 decided points i to iii of section 9.26.4. Point iv (rollback) is removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`). Example of the per-phase rule (round 77 answer 10): `mental_full` ends phase 3 with ED_2 at `v3.1.4`. The owner starts phase 4. The label is `v4.1.0`, a full copy of `v3.1.4` `[reading pending owner check]`.

##### 15.28.5 Paused and Stopped (decided in round 76 answer 4: merge into Stopped)

Decided in round 76 answer 4 (`.opencode/reminders/qa/qa-memory-2026-11-01.md:7`): "Merge into Stopped (Recommended)" `[accepted recommendation 2026-11-01 01:03]`. The facts below describe the code and the screen before the merge (section 15.29.2). Round 75 answer 10 was not decided. The owner asked: "What is there `paused` and `stopped`? they should be the same?"

Facts:

- Code before the merge. The states are `("not-started", "running", "paused", "stopped", "completed")` `[file: <T2>/data/scripts/translator/store.py:26]`. The stop reasons are `("ctrl-c", "target-reached", "forward-failure", "cost-guard", "rule")` `[file: <T2>/data/scripts/translator/store.py:27]`. The labels are in the lines 32 to 35, and `label_of` is in the lines 74 to 97.
- Old state Paused (merged into Stopped): the owner pressed Pause on the Monitor dashboard. The Viewer wrote the file `PAUSE`. The process finishes the current page (16 boxes forward, critic and critique steps backward, memory write), then ends (round 70 answer 12, `VISION-viewer.md:3928` and `:4366`).
- Stopped by Ctrl-C: the owner pressed Ctrl-C in the terminal. Running model calls end at once. The current page is not accepted `[file: <T2>/data/scripts/translator_run.py:2578-2595]`. The selftest text reads "Ctrl-C: the book stops with state stopped and reason ctrl-c, exit 130, and the page is not accepted" `[file: <T2>/data/scripts/translator_run.py:5180]`. `VISION-viewer.md:3929` holds the label.
- Both cases wait for Resume or Restart. The difference: whether the last page finished.
- Example: `mental_full` runs p080. After Pause, p080 is saved and Resume starts at p081. After Ctrl-C, p080 is not accepted and Resume starts at p080 again.

Options for the owner:

- Option 1 `[agent inference]`: keep two states. Benefit: the owner sees at once whether the last page is in the book. No code changes. Cost: the owner must learn two words for "waits for Resume". Not chosen.
- Option 2: one state "Stopped". The stop reason tells "pause" or "ctrl-c". Benefit: one idea. Cost: the state list, the labels, the group table, and the selftest change, and the row loses the sign that the last page finished. Chosen in round 76 answer 4. The stop reason "pause" names the cause `[unit default DZ75]`.

Items that waited for this answer. Round 76 answer 5 decided them:

- DZ73 default 2: a Restart mark on a running book (section 15.27.4). Accepted in round 76 answer 5.
- Section 15.27.10, item 3: the states that show the button Restart. If the owner merges the two states, option 2 of that item names fewer states. Decided in round 76 answer 5: option 1, every state with a run.

##### 15.28.6 Pause dialog and AI tag

Pause dialog (answer 11, option 1 of section 15.27.10 item 1). The pilot component `app/components/PauseButton.tsx` has no dialog `[check: DZ73 2026-10-31 15:35 grep -n -i "confirm\|dialog" app/components/PauseButton.tsx, no line]`. Unit RT74 adds it now. The dialog follows the rules of section 15.27.2: Cancel is first and has the focus, Esc closes, and a press on Cancel writes no file. The Pause text is the text of section 15.27.2. RT74 added it. The pilot texts are in section 15.27.2 (run view `/runs/<stamp>`) `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]`.

AI tag in the page index (answer 15). Rule: the page index tag "AI" shows only on a page with Agent text. Vision l251: "Human versions carry no AI label".

- Example: `/read/d7835263` has Human versions and no Agent text on any page. Its page index must show no "AI" tag.
- Fact at the time of the read: the index marks every page of `textPages`, and `textPages` is the union of agent pages and human pages `[file: app/components/ReaderIndex.tsx:42,113]` `[file: app/lib/reader-data.ts:188,201]`. The line numbers can move while RT74 works.
- Unit RT74 builds the fix. `agentPages` already exists in `ReaderIndex` data `[file: app/lib/reader-data.ts:201]`. RT74 built the fix: a page with only a Human version shows the tag "Human translation" in the page index and "Human" in the side index. A page with Agent text shows "AI translation" or "AI" `[file: <V2>/app/components/ReaderIndex.tsx:125-129]` `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]` ("Tag \"Human translation\" (Recommended)").

##### 15.28.7 Accepted defaults of DZ73 and RT73b

DZ73 defaults (answer 12) `[accepted 2026-10-31 19:21, round 75 answer 12, qa-memory-2026-10-31.md:62]`:

| Default | Name in the answer | Place |
|---|---|---|
| 1 | Share from history | `translator-design.md` section 9.25.2 and 9.25.7 |
| 3 | One restart action | section 15.27.4 and 15.27.9, item 2 |
| 4 | Dialog text per button | section 15.27.2 and 15.27.9, item 1 |
| 5 | Short mark row text | section 15.24.4.2, section 15.27.4 and 15.27.9, item 4 |
| 6 | Details per box | section 15.27.5 and 15.27.9, item 5 |
| 7 | Dialog test | section 15.24 test list (l4350) |

DZ73 default 2 (a Restart mark on a running book) is accepted in round 76 answer 5 (`qa-memory-2026-11-01.md:8`, section 15.29.3).

The numbers 1 to 7 are the numbers of the brief of DZ74. The list of section 15.27.9 has 5 items, and the list of `translator-design.md` section 9.25.7 has 2 items. The table maps the names.

RT73b defaults (answers 13 and 14, `qa-memory-2026-10-31.md:63-64`), all accepted:

| # | Default | Place |
|---|---|---|
| 1 | Site rows with English stay in the Human panel | 15.26.8, D21 |
| 2 | Title bars per band, no scroll together in a band | 15.26.6.11, D19 |
| 3 | Reset layout also removes `text`, `en`, `image` | 15.26.6.2 |
| 4 | The only drawn panel cannot be unchecked | 15.26.6.3 |
| 5 | Bilingual pairing is grey until two panels are drawn | 15.26.6.5 |
| 6 | Rows of two key families do not merge | 15.26.6.6 |
| 7 | The note line names only components of the work | 15.26.6.8, D16 |
| 8 | Panel row height is the window minus 9.5 rem | 15.26.6.6 |
| 9 | Page image counts when the work has page images | 15.26.5 |
| 10 | Esc clears the pair mark first | 15.26.6.6 |
| 11 | Merged width under `ja`, last panel ignores its width | 15.26.6.3 |
| 12 | The fact pop-up closes on any scroll | 15.26.8 |
| 13 | Dropped fact on a phrase: dotted words | 15.26.8 |
| 14 | Fact that cannot be placed: tag after the sentence | 15.26.8 |
| 15 | An empty saved list is valid | 15.26.6.9 |
| 16 | `PUT /api/read/settings` accepts `clear` | 15.26.6.2, 15.26.6.9 |

Doc fixes that RT73b listed, applied in place:

- 15.26.6.11 and D19: title bars per band, no scroll together in a band.
- 15.26.6.2: "Reset layout" also removes `text`, `en`, and `image` through `clear`.
- 15.26.6.9: the route merges shallow, and the client sends the whole `shown` and `widths`. Verified by reading `route.ts` and `ReaderBook.tsx`.
- 15.26.8 and D21: a site row with English text keeps its line. Example: d7835263 p003 U083 "Debana-men". U084 関連 has no English and gives no line.
- 15.26.6.8 and D16: the note names only components that the work has.
- 15.26.15, RT73b table. Files that RT73b changed beyond that table: `app/lib/reader-layout.ts` (new, 349 lines), `app/app/api/read/settings/route.ts`, `app/lib/reader-data.ts`, and `app/components/AdminVersionPanel.tsx`. The file `app/admin/versions/page.tsx` needs no change `[check: DZ74 2026-10-31 19:39 git show --stat e9ebd81]`.
- 15.26.20: the `DragHandle` in the panel row and the scroll together are tested in Firefox, per the RT73b report. Not verified by DZ74.
- Round 73e answer 4 note: the page line "Human translation from kendojidai.com." is fixed by RT73b, per the RT73b report.

##### 15.28.8 Lines of this file that round 75 replaced

| Lines | Subject | Action |
|---|---|---|
| 2716, 2906, 2909, 3007, 3724, 4440, 5700, 5703, 5705 | S2 rule "run mark, else newest PASS" | replaced note, pointer to 15.28.2 |
| 5692, 5694, 5746 | reader access, open item | decided, pointer to 15.28.2 |
| 5651, 5653 | Restart text | pointer to 15.28.3 and 15.28.4 |
| 5609, 5610, 5678, 5687 | version labels "v3", "v6", "v2" | labels `v1.0`, `v1.6`, `v1.2` |
| 5622, 5745 | dialog of the pilot Pause button | decided, RT74 builds it |
| 5747, 5748, 5665, 5739 | states that show Restart, Restart mark on a running book | pending round 75 answer 10 |
| 3928, 4293, 4350, 5592, 5616, 5656, 5669, 5673, 5737 to 5741, 5755 | tags of DZ73 defaults | accepted, round 75 answer 12 |
| 4767, 4842, 4883, 4891, 4922, 4940, 4949, 4954, 4991, 5032, 5037, 5069, 5070, 5171, 5204, 5205, 5249, 5460, 5463, 5465, 5512, 5543, 5551 | RT73b defaults and doc fixes | accepted, round 75 answers 13 and 14 |
| 5407, 5420 | RT73b file table | files added, `page.tsx` no change |

##### 15.28.9 Unit defaults of DZ74

1. `[accepted 2026-11-01 01:03, round 76 answer 10, qa-memory-2026-11-01.md:13]` The parts of the admin gate in 15.28.2 that are not owner words (items 3 to 9). The other option sits beside each item.
2. Replaced by the real text of RT74 (15.28.2, item 6) `[accepted 2026-11-01 01:03, round 76 answer 11, qa-memory-2026-11-01.md:14]`. The example text of DZ74 is gone.
3. `[accepted 2026-11-01 01:03, round 76 answer 12, qa-memory-2026-11-01.md:15]` After a Restart, the older opened run stays open, and the S2 rule shows the newest open PASS run (15.28.3). Other option: when the admin opens the new run, the old run closes.
4. Replaced by round 76 answer 4: the owner chose the merge, which is option 2 of 15.28.5.

##### 15.28.10 Open items for the owner

1. Paused and Stopped (15.28.5). Decided in round 76 answer 4: merge into Stopped (section 15.29.2). The old recommendation, option 1, is not chosen.
2. Audit checks C3 and C4 (`translator-design.md` section 9.26.5). Decided in round 76 answer 3 (`qa-memory-2026-11-01.md:6`): C3 and C4 learn soft.
3. Open points i to iv of the version labels (`translator-design.md` section 9.26.4). Decided in round 76 answers 6 to 8 (`qa-memory-2026-11-01.md:9-11`): each phase has its own series and starts at `v1.0` (section 15.29.4). Point iv (rollback) is removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`). The label form is replaced in round 77 answer 10 (section 15.30.2).
4. The admin gate (15.28.2): accepted in round 76 answers 10 and 11 (section 15.29.5). The meaning of "run": the record holds the run folder name of one page.
5. How S2 finds an opened run inside `archive/<run ID>/` (15.28.3). Not designed.

##### 15.28.11 Not verified

- No code ran in this unit. The Monitor dashboard and S2 changes are built by RT74 and are not checked here.
- The count about 1,123 or 1,124 on the Reader dashboard `/read` was not measured. Round 76: 1,124 (section 15.28.2).
- The meaning of "run" for the gate (15.28.2, Open check). Answered by DZ75 in round 76.
- The Firefox test of RT73b, the example U083 "Debana-men", and the example U013 ３０歳 come from the RT73b report. DZ74 did not open them.
- The reading of answer 4 (`qa-memory-2026-10-31.md:72`) and the reading of answer 3 (`qa-memory-2026-10-31.md:71`) are `[reading pending owner check]`.

Status: round 75 answers applied by unit DZ74. Items 15.28.5 and 15.28.10 wait for the owner.

#### 15.29 Round 76 decisions: Stopped state, Restart states, version labels per phase, gate details (unit DZ75)

Unit DZ75 wrote this section on 2026-11-01 (round 76). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-01.md`, lines 3 to 29. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.27. Each line of this file that this section replaces carries a pointer to it. Section 15.29.6 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10). No real run exists yet `[check: DZ75 2026-11-01 01:19 ls data/book-store in <T2>, "No such file or directory"]`. All examples in this section are examples and not run data.

##### 15.29.1 Owner words

- Round 76 answer 3 (`qa-memory-2026-11-01.md:6`): "option 1. Also be more detail with the judge check rules." `[user 2026-11-01 01:03]`. The design side holds it (`translator-design.md`, section 9.27.2).
- Round 76 answer 4 (`qa-memory-2026-11-01.md:7`): "Merge into Stopped (Recommended)" `[accepted recommendation 2026-11-01 01:03]`.
- Round 76 answer 5 (`qa-memory-2026-11-01.md:8`): "Every state with a run (Recommended)" `[accepted recommendation 2026-11-01 01:03]`.
- Round 76 answer 6 (`qa-memory-2026-11-01.md:9`): "A full copy (Recommended)" `[accepted recommendation 2026-11-01 01:03]`.
- Round 76 answer 7 (`qa-memory-2026-11-01.md:10`): "Each phase keep separate version number (e.g. phase 3 v2.4 etc)" `[user 2026-11-01 01:03]`. Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`).
- Round 76 answer 8 (`qa-memory-2026-11-01.md:11`): "Every book starts at v1.0 (Recommended)" `[accepted recommendation 2026-11-01 01:03]`. Replaced in round 77 answer 10: phase 3 starts at `v3.1.0`.
- Round 76 answer 9 (`qa-memory-2026-11-01.md:12`): "What rollback? is this stale?" `[user 2026-11-01 01:03]`. This was a question about the design side. Decided in round 77 answer 3: removed (`translator-design.md`, section 9.28.2).
- Round 76 answer 10 (`qa-memory-2026-11-01.md:13`): "One record per page run (Recommended), New table reader_opens (Recommended), Admin only, also for listing (Recommended), Close to readers button (Recommended), Run view button, status line (Recommended), S2: mark if open, else newest open PASS (Recommended), Change shows after next S2 run (Recommended), S2 stops if the table is missing (Recommended)" `[accepted recommendation 2026-11-01 01:03]`.
- Round 76 answer 11 (`qa-memory-2026-11-01.md:14`): "Closed run: page loses agent text (Recommended), Open FAIL run shows nothing (Recommended), Tag \"Human translation\" (Recommended), Pilot Pause dialog text (Recommended), Sign-in line for non-admins (Recommended), Open dialog counts PASS pages (Recommended)" `[accepted recommendation 2026-11-01 01:03]`.
- Round 76 answer 12 (`qa-memory-2026-11-01.md:15`): "Optimizer told: text must differ (Recommended), Restart gives all 16 boxes v<run>.0 (Recommended), Old opened run stays open (Recommended)" `[accepted recommendation 2026-11-01 01:03]`. The label form `v<run>.0` is replaced in round 77 answer 10 (`v<phase>.<run>.0`).
- The readings of aki-main for the answers 4 and 7 were `[reading pending owner check]` (`qa-memory-2026-11-01.md:25,27`). Round 77 answer 8 validated the reading of answer 4 (`qa-memory-2026-11-01.md:39`). Round 77 answer 10 replaced the reading of answer 7 (`qa-memory-2026-11-01.md:41`).

##### 15.29.2 Stopped state on the Monitor dashboard

Decided in round 76 answer 4. One state "Stopped" in one group. The old label Paused and the old group Paused are gone.

Group table (6 groups):

| Group | Holds | Starts |
|---|---|---|
| Needs attention | Stopped unexpectedly, Stopped by failure | open, always shows |
| Waiting for a run | a book with a Run, Resume, or Restart mark that no process picked up | open, shows when it holds a row |
| Running | Running, Running with pause requested | open, always shows |
| Stopped | Stopped (cause Pause or Ctrl-C) | open, shows when it holds a row |
| Completed | Completed | closed, shows when it holds a row |
| Not started | Not started | closed, always shows |

Row text. The row names the cause, the time, and the next page. The two texts are the examples of the owner option:

- After a Pause: "Stopped by Pause at 16:40. Last saved page p080. Resume starts at p081."
- After Ctrl-C: "Stopped by Ctrl-C at 16:40. Page p080 was not saved. Resume starts at p080."
- Stopped by failure and Stopped unexpectedly stay in the group Needs attention.
- The Monitor builds the text from the status fields `stop_reason`, `updated_utc`, `last_accepted_page`, and `next_page` `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]`. The design side holds the other option (`translator-design.md`, section 9.27.3).

Buttons for each state:

| State | Buttons | Source |
|---|---|---|
| Not started | Run | section 15.27.3 |
| Running | Pause, Restart, Details. Run and Resume are grayed out (round 80 answer 13, section 15.33.3) | section 15.27.3, round 76 answer 5 |
| Stopped | Resume, Restart, Details | section 15.27.3, round 76 answer 5 |
| Stopped by failure | Resume, Restart, Details | sketch of section 15.24.8, round 76 answer 5 |
| Stopped unexpectedly | Resume, Restart, Details | sketch of section 15.24.8, round 76 answer 5 |
| Completed | Restart, Details, and "Run phase 4" after phase 3 | section 15.27.3, round 76 answer 5 |

Example (values are an example): `mental_full` stopped at 21:40 after a Pause. The row sits in the group Stopped. It reads "Stopped by Pause at 21:40. Last saved page p014. Resume starts at p015." The buttons are [Resume] [Restart] [Details].

Unit defaults of this part, accepted in round 77 answer 9 (`qa-memory-2026-11-01.md:40`):

- Both causes use the symbol ■. Other option: keep ‖ for the cause Pause. Benefit of the default: one state, one symbol. Cost: the symbol does not tell the cause, but the row text does.
- A pilot list in the state "paused" (an old list, the process lives and waits at the gate) shows as "Running with pause requested" in the group Running (round 81 answer 23). Other option: show it as Stopped. Benefit of the default: the process lives, so the label is true. Cost: the label differs from the file value.
- The pilot Pause and Resume on the run view `/runs/<stamp>` stay as they are `[reading pending owner check]`. They are a pilot behavior. The real-book Pause on the Monitor dashboard (round 70 answer 12) finishes the current page and ends the process.

The contract text of section 15.24.9 (the block with `state: "not-started" | "running" | "paused" | ...`) and the history line of the book store folder still show `paused`. They describe the code of TB71. The code unit changes them with the state list. Changed in round 80: the lines 4270, 4271, and 4280 of the contract now match `store.py` at TR77c (section 15.33.7). The lines 4282, 4283, and 4293 stay as old text.

##### 15.29.3 Restart states

Decided in round 76 answer 5. The button Restart shows on the book row and in the Details view (round 74 answer 11) for these states:

- Running
- Stopped
- Stopped by failure
- Stopped unexpectedly
- Completed

A Running book saves its current page and its update point, archives the run, and ends the process. An opencode agent starts the book again from page 1 (round 77 answer 12, `qa-memory-2026-11-01.md:43`: "Process ends, agent restarts", section 15.30.3). This accepts DZ73 default 2, a Restart mark on a running book. The other option was a refusal until the book is stopped. It is not chosen. Old text: "then restarts".

Example (values are an example): `mental_full` runs phase 4 at p080. The owner presses Restart in the dialog (Cancel is first). The run finishes p080 and saves it. The run files move to `<T2>/data/book-store/mental_full/archive/<run ID>/`. The process ends. The row shows "Waiting for a run" until an opencode agent starts the book again from p001 in phase 4 (section 15.30.3). Before the process reads the Restart mark, the row text is "Mark waiting: Restart requested HH:MM" (section 15.24.4.2).

The states Not started and Waiting for a run show no Restart button. This is `[agent inference]`, because the owner list has five states.

##### 15.29.4 Version labels per phase

Owner words (answer 7): "Each phase keep separate version number (e.g. phase 3 v2.4 etc)". Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): "integrate the phase number into the version number (v3.2.4 mean phase 3 - run 2 - version 4)" `[user 2026-11-01 08:12]`. The label is `v<phase>.<run>.<updates>`. The design side holds the rules and the example table (`translator-design.md`, section 9.28.3).

- A Restart gives all 16 boxes `v<phase>.<run>.0` (round 77 answer 10). The file is a full copy of the chosen version, not a link (answers 6 and 12 of round 76).
- Phase 3 starts at `v3.1.0`, and phase 4 starts at `v4.1.0` (round 77 answer 10) `[reading pending owner check]`. Phase 4 `v4.1.0` is a full copy of the last live phase 3 prompt. Old text: every phase of a book started at `v1.0` (round 76 answers 7 and 8).
- The grid "Prompt versions" of the book detail view shows the label of each box, for example "ED_2 v3.1.1" `[reading pending owner check]` (`qa-memory-2026-11-01.md:54`). Old text: "ED_2 phase 3 v1.1", not accepted in round 77 answer 9.
- The Details view lists the labels at the start and at the end of each archived run. The column "Phase" of that list already gives the phase.
- Decided in round 77 answer 11 (`qa-memory-2026-11-01.md:42`): "both option combine". The phase 3 files move to `<book>/agent-phase-3/prompts/`. The Monitor dashboard reads that folder for the history of phase 3 (`translator-design.md`, section 9.28.4).

Rollback: removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`): "OPtion 1. However, it should already be part of the `Restart` function" `[user 2026-11-01 08:12]`. The Viewer has no rollback button. The way back is the prompt choice of the Restart dialog (`translator-design.md`, section 9.28.2).

##### 15.29.5 Admin gate: accepted parts and the seven fixes

Round 76 answers 10 and 11 accepted the design of section 15.28.2. Unit RT74 built it in commit f42e8e6. Unit DZ75 checked each fix below against the code of that commit.

| # | Place | Fix | Code checked |
|---|---|---|---|
| 1 | 15.28.2 item 1 | The record holds one run folder name of one page, not one run stamp of one book. The run view button opens or closes all 5 page runs of list `20261029T051152Z` in one step. | `app/lib/pb.ts` (`openRun`, `closeRun`), `app/app/api/admin/opens/route.ts`, `app/components/ReaderOpenRows.tsx` |
| 2 | 15.28.2 item 3 | All five rules of `reader_opens` are admin only, also list and view. They are not the rules of `run_marks`. | migration `1793300012_v2_reader_opens.js`, lines 49 to 53 |
| 3 | 15.28.2 item 5 | The status line sits on `/translate/<slug>?at=pNNN`, not on `/page/<slug>/<page>`. | `app/components/HtvPageSection.tsx:269`, `app/lib/reader-opens-rule.ts:48-53` |
| 4 | 15.28.2 item 6 | The real Open dialog text replaces the example of DZ74. | `app/components/ReaderOpenRows.tsx` |
| 5 | 15.28.2 effect | The count after the gate is 1,124 of 14,116 pages translated (8.0 percent). | live read of aki-main (not checked in code) |
| 6 | 15.27.2 | The pilot Pause and Resume dialog text follows `/api/pause`. | `app/components/PauseButton.tsx` |
| 7 | 15.28.6 | A Human-only page shows "Human translation" in the page index and "Human" in the side index. | `app/components/ReaderIndex.tsx:125-129` |

Details:

- Fix 3 texts: "Readers see: run X (opened)", "Readers see: run X (opened, run mark)", and "Readers see no agent text for this page. No run of this page is open." A fourth text covers an open run without a PASS verdict. The line ends with "Readers see a change after the next S2 run."
- Fix 4 text: title "Open run 20261029T051152Z of left_foot_full to readers?", body "Readers see the Agent text of 5 of 5 pages after the next S2 run. The number counts the pages whose run has the verdict PASS. You can close the run again.", buttons [Cancel] [Open to readers]. The number 5 of 5 is the example of RT74.
- Fix 5: S2 removed 28 agent records and set `18d4ac29/p001` back to `web-ja`. That is 29 records changed. The Reader dashboard `/read` drop is 27, because `men0/p005` belongs to `men0`, which the Reader hides as part of `men_full` (round 69 answer 12, `app/lib/reader-folds.ts:29`).
- Fix 6: this is the pilot run view `/runs/<stamp>`. The real-book Pause on the Monitor dashboard (round 70 answer 12) finishes the current page and ends the process. Its dialog text is in section 15.27.2.
- Fix 7: a page with Agent text shows "AI translation" in the page index and "AI" in the side index. A page with Agent text that a person checked shows "AI translation, checked by a person".

##### 15.29.6 Lines of this file that round 76 replaced

| Line | What changed | Source |
|---|---|---|
| 3899 | groups Paused and Stopped | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3911 | summary line example | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3912 | group order, group order reason | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3914 | groups that show when not empty | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3915 | groups that start open | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3928 | label Paused | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3929 | label Stopped and row texts | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3939 | label table row Paused | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3940 | label table row Stopped | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 3998 | Resume of a paused book | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4009 | refresh rule | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4119 | paused book text | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4131 | sketch 1 summary line | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4159 | sketch 2 summary line | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4166 | sketch 2 group heading | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4167 | sketch 2 row | round 76 answer 4, qa-memory-2026-11-01.md:7 and round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 4168 | sketch 2 row text | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4293 | DZ73 default 2 tag | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 4348 | smoke fixture list | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 4366 | item 3 Pause scope | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5619 | Pause dialog text (fix 6) | RT74 fix 6, PauseButton.tsx |
| 5622 | pilot Pause dialog text (fix 6) | round 76 answer 11, qa-memory-2026-11-01.md:14 |
| 5630 | button table Resume | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5631 | button table Restart | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5633 | Restart states not decided | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5665 | DZ73 default 2 tag | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5667 | refuse option | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5739 | DZ73 default 2 tag, refuse option | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5747 | item 3 Restart states | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5748 | item 4 default 3 pending | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5755 | Restart mark open | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5772 | answer 10 not decided | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5785 | design tag intro | round 76 answers 10 and 11 |
| 5787 | item 1 run | RT74 fix 1 |
| 5789 | item 3 store and rules | RT74 fix 2 |
| 5790 | item 4 tag | round 76 answer 10 |
| 5791 | item 5 place and status line | RT74 fix 3 |
| 5792 | item 6 dialog text | RT74 fix 4 |
| 5793 | item 7 tag | round 76 answer 10 |
| 5797 | item 8 tag | round 76 answer 11 |
| 5798 | item 9 tag and S2 stop | round 76 answer 10 |
| 5803 | FAIL run example tag | round 76 answer 11 |
| 5808 | effect, records changed | RT74 fix 5 |
| 5809 | effect, count after the gate | RT74 fix 5 |
| 5812 | open check on run meaning | RT74 fix 1 |
| 5822 | Restart and opened run tag | round 76 answer 12, qa-memory-2026-11-01.md:15 |
| 5827 | four open points | round 76 answers 6 to 8, qa-memory-2026-11-01.md:9-11 |
| 5831 | Prompt versions grid | round 76 answer 7, qa-memory-2026-11-01.md:10 |
| 5832 | open points i to iv | round 76 answers 6 to 8 |
| 5834 | heading 15.28.5 | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5836 | answer 10 not decided | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5840 | facts code state | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5841 | Paused fact | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5842 | Stopped fact | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5843 | both states | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5848 | option 1 keep two states | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5849 | option 2 one state | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5851 | items that wait | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5853 | DZ73 default 2 | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5854 | item 3 Restart states | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5858 | Pause dialog added | round 76 answer 11 |
| 5864 | AI tag fix (fix 7) | round 76 answer 11 |
| 5879 | DZ73 default 2 pending | round 76 answer 5, qa-memory-2026-11-01.md:8 |
| 5931 | RT74 defaults tag | round 76 answers 10 and 11 |
| 5932 | DZ74 default 5 example text | round 76 answer 11 |
| 5933 | DZ74 default 3 tag | round 76 answer 12 |
| 5934 | DZ74 default 4 recommended option | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5938 | open item 1 | round 76 answer 4, qa-memory-2026-11-01.md:7 |
| 5939 | open item 2 | round 76 answer 3 |
| 5940 | open item 3 | round 76 answers 6 to 8 |
| 5941 | open item 4 | round 76 answers 10 and 11 |
| 5947 | not verified count | RT74 fix 5 |
| 5948 | not verified run meaning | RT74 fix 1 |

##### 15.29.7 Unit defaults of DZ75 (1 to 3 accepted, 4 not accepted, round 77 answer 9)

1. `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` The symbol ■ for both causes of Stopped (section 15.29.2). Other option: keep ‖ for the cause Pause. Benefit: one state, one symbol. Cost: the symbol does not tell the cause.
2. `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` A pilot list in the state "paused" shows as "Running, pause requested" (section 15.29.2). Other option: show it as Stopped. Benefit: the label is true, because the process lives. Cost: the label differs from the file value. History line: round 81 answer 23 (`qa-memory-2026-11-02.md:28`) renamed the label to "Running with pause requested" (section 15.34.7).
3. `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` The Monitor builds the row text of a Stopped book from the status fields (section 15.29.2). Other option: the run program writes the whole text into `stop_text`. Benefit: the text follows the fields. Cost: the Monitor holds the sentence patterns.
4. Not accepted (round 77 answer 9, `qa-memory-2026-11-01.md:40`). Old default F: the grid "Prompt versions" shows "ED_2 phase 3 v1.1" (section 15.29.4). Replaced by round 77 answer 10: the phase sits in the label, so a cell reads "ED_2 v3.1.1" (section 15.30.2).

##### 15.29.8 Open items for the owner (all four decided in round 77)

a. Decided in round 77 answer 11 (`qa-memory-2026-11-01.md:42`): "both option combine" (`translator-design.md`, section 9.28.4). Example: ED_2 of `mental_full` has `v3.1.0` to `v3.1.4` in phase 3. The Monitor dashboard reads `agent-phase-3/prompts/` for them.
b. Rollback: decided in round 77 answer 3 (`qa-memory-2026-11-01.md:34`): removed (`translator-design.md`, section 9.28.2).
c. The audit rule for a hard group that needs a dropped line (`translator-design.md`, section 9.27.9, item c). Decided in round 77 answer 6 (`qa-memory-2026-11-01.md:37`): "No line disappears (Recommended)".
d. The reading of answer 4 is validated in round 77 answer 8 (`qa-memory-2026-11-01.md:39`). The reading of answer 7 is replaced by round 77 answer 10 (`qa-memory-2026-11-01.md:41`).

##### 15.29.9 Not verified

- No code ran in this unit. The Monitor dashboard code for the merged state is not built.
- The Open dialog text and the status line texts come from the code of f42e8e6. The number "5 of 5 pages" is the example of RT74. DZ75 did not run the page.
- The count 1,124 of 14,116 pages translated comes from a live read of aki-main at 2026-11-01 01:08. DZ75 did not repeat the read.
- The S2 numbers (28 records removed, 29 records changed) come from the brief of aki-main.
- The symbols and the label of a pilot list in the state "paused" are unit defaults.

Status: round 76 answers applied by unit DZ75. Items in section 15.29.8 wait for the owner.

#### 15.30 Round 77 decisions: labels with the phase, Restart on a running book, archived runs and the admin gate (unit DZ76)

Unit DZ76 wrote this section on 2026-11-01 (round 77). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-01.md`, lines 31 to 60. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.28. Each line of this file that this section replaces carries a pointer to it. Section 15.30.5 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10). No real run exists yet `[check: DZ76 2026-11-01 08:19 ls data/book-store in <T2>, "No such file or directory"]`. All examples in this section are examples and not run data.

##### 15.30.1 Owner words

- Round 77 answer 3 (`qa-memory-2026-11-01.md:34`): "OPtion 1. However, it should already be part of the `Restart` function" `[user 2026-11-01 08:12]`. The Viewer has no rollback button.
- Round 77 answer 9 (`qa-memory-2026-11-01.md:40`): "D: one symbol (Recommended), E: pilot label (Recommended), C: Monitor builds text (Recommended), B: event stopped (Recommended), A: reason pause (Recommended)" `[accepted recommendation 2026-11-01 08:12]`. The owner did not check default F, the grid cell "ED_2 phase 3 v1.1".
- Round 77 answer 10 (`qa-memory-2026-11-01.md:41`): "integrate the phase number into the version number (v3.2.4 mean phase 3 - run 2 - version 4)" `[user 2026-11-01 08:12]`.
- Round 77 answer 11 (`qa-memory-2026-11-01.md:42`): "both option combine" `[user 2026-11-01 08:12]`.
- Round 77 answer 12 (`qa-memory-2026-11-01.md:43`): "Process ends, agent restarts" `[accepted option 2 2026-11-01 08:12]`.
- Round 77 answer 13 (`qa-memory-2026-11-01.md:44`): "If admin choose to show it then reader can read it, if not then they cant" `[user 2026-11-01 08:12]`.
- The readings of aki-main (`qa-memory-2026-11-01.md:53-58`) are `[reading pending owner check]`.

##### 15.30.2 Labels on the screens

The label is `v<phase>.<run>.<updates>`. The example `v3.2.4` reads: phase 3, run 2 of phase 3, after 4 prompt updates. The design side holds the rules and the example table (`translator-design.md`, section 9.28.3).

Where a label shows (example values for `mental_full`, ED_2 and TL_1):

| Screen | Before round 77 | Now |
|---|---|---|
| Monitor dashboard `/`, book detail view, grid "Prompt versions" | "ED_2 phase 3 v1.1" (default F, not accepted) | "ED_2 v3.1.1" `[reading pending owner check]` |
| Monitor dashboard `/`, Restart dialog, line 1 | "(ED_2 v1.0)" | "(ED_2 v4.1.0)" |
| Monitor dashboard `/`, Restart dialog, line 2 | "(ED_2 v1.6)" | "(ED_2 v4.1.6)" |
| Monitor dashboard `/`, Details view, archived run row | "ED_2 v1.0, TL_1 v1.0" and "ED_2 v1.6, TL_1 v1.2" | "ED_2 v4.1.0, TL_1 v4.1.0" and "ED_2 v4.1.6, TL_1 v4.1.2" |

Example of the whole path for ED_2 of `mental_full` in phase 4. Run 1 starts at `v4.1.0` and ends at `v4.1.6`. The owner presses Restart and keeps the default "start prompts". The new run starts at `v4.2.0`, a full copy of `v4.1.0`. The grid cell reads "ED_2 v4.2.0" until the first live update. After that update it reads "ED_2 v4.2.1".

Phase 3 files. At the phase move, `prompts/` moves into `<T2>/data/book-store/<book>/agent-phase-3/prompts/` (round 77 answer 11, `translator-design.md`, section 9.28.4). The Monitor dashboard reads that folder to show the history of phase 3.

##### 15.30.3 Restart on a running book, on the Monitor dashboard

Decided in round 77 answer 12: the process ends and an opencode agent starts the book again. Example (values invented): `mental_full` runs phase 4 and stands at p080 at 16:40.

| Moment | Group on the Monitor dashboard `/` | Row text | Buttons |
|---|---|---|---|
| Before the press | Running | the running row | Pause, Restart, Details (section 15.29.2). Run and Resume grayed out (round 80 answer 13) |
| After the press, until the process reads the mark at the next page start | Running (round 78 answer 10, `qa-memory-2026-11-01.md:72`, old text: not designed) | "Restart requested 16:40" (old text: not designed) | none (round 79 answer 13, `qa-memory-2026-11-01.md:105`, section 15.32.6) |
| The process saved p080, archived, and ended | Waiting for a run | "Mark waiting: Restart requested 16:40" (round 78 answers 10 and 11, `qa-memory-2026-11-01.md:72-73`, section 15.31.5) `[reading pending owner check]`. Time decided in round 79 answer 11 (`qa-memory-2026-11-01.md:103`): the press time. Old text: "Mark waiting: Run requested 16:41" | Details (no Restart button in this group, section 15.29.3) |
| An opencode agent started the book | Running | the running row at p001 in phase 4 | Pause, Restart, Details |

- The second line is not designed. The rule "A mark waits while the book folder holds `request.json`" (line 3928 of this file) can put the row in the group "Waiting for a run" while the process still runs `[agent inference]`. The owner can decide this (section 15.30.7, item e). Decided in round 78 answer 10 (`qa-memory-2026-11-01.md:72`): "Stays Running, with a note (Recommended)". The row stays in the group Running, also while `request.json` exists `[agent inference]`.
- The row text of the third line follows the patterns for Resume and Restart (lines 3928 and 5669 of this file). The run program writes a Run mark before it ends (`translator-design.md`, section 9.28.5, unit default 1). Round 78 answer 11 (`qa-memory-2026-11-01.md:73`): the Run mark keeps the word Restart in one key, and the row text is "Mark waiting: Restart requested HH:MM".
- The Details view lists the archived run with its UTC time, phase, pages done, and the labels at start and end (section 15.30.2).
- The group "Waiting for a run" holds a book with a mark that no process picked up (section 15.29.2).
- Not designed: how soon the Monitor dashboard shows the third line. The Monitor refresh rule of section 15.24 applies `[agent inference]`.

##### 15.30.4 Archived runs on the run view and S2

Owner words (round 77 answer 13): "If admin choose to show it then reader can read it, if not then they cant". Reading `[reading pending owner check]` (`qa-memory-2026-11-01.md:58`): the admin gate covers archived runs.

- If the admin opened run 1 before the Restart, readers keep its text from `archive/<run ID>/`. They see it on the book screen `/read/<slug>` and on `/translate/<slug>?at=pNNN`.
- If the admin did not open run 1, readers see no agent text from it.
- If the admin closes run 1 later, the page loses its agent text at the next S2 run (round 76 answer 11, `qa-memory-2026-11-01.md:14`: "Closed run: page loses agent text (Recommended)").
- The status line of the page reads "Readers see: run X (opened)" or "Readers see no agent text for this page. No run of this page is open." (section 15.29.5, fix 3).

Facts about S2 and the store are in `translator-design.md`, section 9.28.6. S2 reads only the source "pilot-run" today. The naming of a real book run in `reader_opens` and the folders that S2 searches are an open design item there. Decided in round 78 answers 7 and 8 (`qa-memory-2026-11-01.md:69-70`): the run ID is the start time in PST (UTC-8 all year, round 79 answer 9, section 15.32.5), and the record is one for each book run (section 15.31.4).

Not designed: what the admin sees to open an archived run. Today the button "Open to readers" sits on the run view `/runs/<stamp>` on the Monitor dashboard, one row for each book of the run (section 15.28.2, item 5). Decided in round 78 answer 9 (`qa-memory-2026-11-01.md:71`): "Button on Details rows (Recommended)" (section 15.31.4).

- Option 1 (recommended `[agent inference]`): a run view for a book run, with the same "Readers" part. Benefit: the admin sign-in, the Open dialog, and the status line exist already. Cost: a new route and a run ID for the address. Not chosen (round 78 answer 9).
- Option 2: a button on each archived run row of the Details view (section 15.27.5). Benefit: the list of archived runs is already there. Cost: the Details view needs the admin sign-in and the Open dialog. Chosen in round 78 answer 9.
- Example for both: the archived run `20261104T001500-0800` of `mental_full` has a row. The admin presses "Open to readers", reads the dialog, and presses the action button. Readers see the change after the next S2 run.

##### 15.30.5 Lines of this file that round 77 replaced

| Line | Old (first changed words) | New (first changed words) | Owner source |
|---|---|---|---|
| 4293 | start | end. An opencode agent starts the book / `[accepted option 2 2026-11-01 08:12, round 77 answer 12, qa-memor... | round 77 answer 12, qa-memory-2026-11-01.md:43 |
| 5609 | v1.0)   | v4.1.0) | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5610 | v1.6)   | v4.1.6) | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5665 | (none) | ends. An opencode agent / the book | round 77 answer 12, qa-memory-2026-11-01.md:43 |
| 5678 | v1.0, / v1.0 | v4.1.0, / v4.1.0 | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5687 | follow | followed / Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): `v<phase>.<run>.<updates>`, for e... | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5771 | (none) | Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): "integrate the phase number into the version... | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5818 | (none) | Replaced in round 77 answer 13 (`qa-memory-2026-11-01.md:44`): "If admin choose to show it then reader can ... | round 77 answer 13, qa-memory-2026-11-01.md:44 |
| 5820 | folder. | folder, only if the admin opened that run (round 77 answer 13). | round 77 answer 13, qa-memory-2026-11-01.md:44 |
| 5822 | 1. | 1, because the admin opened run 1 before the Restart. If the admin did not open run 1, readers see no agent... | round 77 answer 13, qa-memory-2026-11-01.md:44 |
| 5827 | is | was / Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): `v<phase>.<run>.<updates>` (section 15... | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5829 | v1.0)". / v1.6)". | v4.1.0)". / v4.1.6)". | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5830 | v1.0, / v1.0", | v4.1.0, / v4.1.0", | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5831 | phase and the | and the label holds the phase, | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5832 | waits for the owner. / 76 | is removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`). / 77 | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5940 | waits for the owner. | is removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`). The label form is replaced in round 77 answ... | round 77 answer 3, qa-memory-2026-11-01.md:34 |
| 5966 | (none) | Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`). | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5967 | (none) | Replaced in round 77 answer 10: phase 3 starts at `v3.1.0`. | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5968 | is / side | was / side. Decided in round 77 answer 3: removed | round 77 answer 3, qa-memory-2026-11-01.md:34 |
| 5971 | (none) | The label form `v<run>.0` is replaced in round 77 answer 10 (`v<phase>.<run>.0`). | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 5972 | are | were / Round 77 answer 8 validated the reading of answer 4 (`qa-memory-2026-11-01.md:39`). Round 77 answer ... | round 77 answers 8 and 10 |
| 5994 | `[unit default DZ75]`. | `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]`. | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6009 | part `[unit default DZ75]`: | part, accepted in round 77 answer 9 (`qa-memory-2026-11-01.md:40`): | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6027 | page, then restarts. | page and its update point, archives the run, and ends the process. An opencode agent starts the book again ... | round 77 answer 12, qa-memory-2026-11-01.md:43 |
| 6029 | runs | process ends. The row shows "Waiting for a run" until an opencode agent starts the | round 77 answer 12, qa-memory-2026-11-01.md:43 |
| 6035 | Reading `[reading pending owner check]`: the screen shows / with | Replaced in round 77 answer 10 (`qa-memory-2026-11-01.md:41`): "integrate / number into | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 6037 | `v<run>.0`. / 12). | `v<phase>.<run>.0` (round 77 answer 10). / 12 of round 76). | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 6038 | Every phase of a book / `v1.0` (answers 7 | Phase 3 / `v3.1.0`, | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 6039 | phase and the / phase 3 v1.1" | v3.1.1" | round 77 answer 10, qa-memory-2026-11-01.md:41 |
| 6041 | Open (item a / section 15.29.8): where the | Decided / round 77 answer 11 (`qa-memory-2026-11-01.md:42`): "both option combine". The | round 77 answer 11, qa-memory-2026-11-01.md:42 |
| 6043 | design side holds the text with a tag that says no owner source exists (`translator-design.md`, section 9.2... | removed in round 77 answer 3 (`qa-memory-2026-11-01.md:34`): "OPtion 1. However, it should already be part ... | round 77 answer 3, qa-memory-2026-11-01.md:34 |
| 6145 | (none) | (1 to 3 accepted, 4 not accepted, round 77 answer 9) | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6147 | `[unit default DZ75]` | `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6148 | `[unit default DZ75]` | `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6149 | `[unit default DZ75]` | `[accepted 2026-11-01 08:12, round 77 answer 9, qa-memory-2026-11-01.md:40]` | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6150 | `[unit / DZ75]` The | Not accepted (round 77 answer 9, `qa-memory-2026-11-01.md:40`). Old / F: the | round 77 answer 9, qa-memory-2026-11-01.md:40 |
| 6152 | (none) | (all four decided in round 77) | round 77 answers 3, 6, 8, 10, 11 |
| 6154 | Where the phase 3 prompt files go at the phase move / 9.27.5). Recommended: option 1, `prompts/` moves with... | Decided in round 77 answer 11 (`qa-memory-2026-11-01.md:42`): "both option combine" / 9.28.4). | round 77 answer 11, qa-memory-2026-11-01.md:42 |
| 6155 | aki-main answers the owner | decided / answer 3 (`qa-memory-2026-11-01.md:34`): removed | round 77 answer 3, qa-memory-2026-11-01.md:34 |
| 6156 | (none) | Decided in round 77 answer 6 (`qa-memory-2026-11-01.md:37`): "No line disappears (Recommended)". | round 77 answer 6, qa-memory-2026-11-01.md:37 |
| 6157 | readings / answers | reading / answer | round 77 answers 8 and 10 |

Lines that stay as history and still show an old label: line 5922 (table 15.28.6 lists what round 75 replaced). The lines 1283, 1411, and 5027 contain the word rollback for other topics (the v1 server file ROLLBACK.md and the saved view keys). Round 77 does not touch them.

##### 15.30.6 Unit defaults of DZ76

1. `[unit default DZ76]` The row text of a book that waits after a Restart on a running book is "Mark waiting: Run requested HH:MM". Other option: the run program keeps the word Restart in the mark (a key `after`), so the row reads "Mark waiting: Restart requested HH:MM". Benefit of the default: no new key, and the mark is a normal Run mark. Cost: the owner sees "Run" after pressing Restart. Not accepted in round 78 answer 11 (`qa-memory-2026-11-01.md:73`): the owner did not check "Row text says Run". The other option applies: the run program keeps the word Restart in the mark (a key `after`), and the row reads "Mark waiting: Restart requested HH:MM".
2. `[unit default DZ76]` The sketches of the Restart dialog and the Details view use phase 4 labels (`v4.1.0`, `v4.1.6`). Other option: use phase 3 labels. Benefit of the default: the dialog sketch already names phase `agent-phase-4`. Cost: none known. Accepted in round 78 answer 12 (`qa-memory-2026-11-01.md:74`): "Sketches use phase 4 (Recommended)".

##### 15.30.7 Open items for the owner

a. How the admin opens an archived run (section 15.30.4). Recommended: option 1, a run view for a book run. Example: the archived run `20261104T001500-0800` of `mental_full`. Decided in round 78 answer 9: option 2, a button on each run row of the Details view (section 15.31.4).
b. The Restart prompt choice: two choices or any saved version (`translator-design.md`, section 9.28.10, item a). Example: ED_2 at `v4.1.6` and the wish for `v4.1.3`. Decided in round 78 answers 4 and 5 (`qa-memory-2026-11-01.md:66-67`) `[reading pending owner check]`: a pick list for each box with quick select rows (section 15.31.2).
c. The run ID of a book run and one record for each run or each page (`translator-design.md`, section 9.28.10, items b and c). Decided in round 78 answers 7 and 8: the run ID is the start time in PST (UTC-8 all year, round 79 answer 9), and the record is one for each book run. The value form is a reading pending the owner (section 15.32.5).
d. The readings at `qa-memory-2026-11-01.md:53-58` (`translator-design.md`, section 9.28.10, item e). Decided in round 78 answers 2, 3, and 6 (`qa-memory-2026-11-01.md:64,65,68`): the readings are right.
e. The row of a running book from the press of Restart until the process reads the mark (section 15.30.3). Recommended: the row stays in the group Running with the extra text "Restart requested HH:MM" `[agent inference]`. Benefit: the group matches the live process. Cost: a new row text. Other option: the row moves to "Waiting for a run" at once, as line 3928 reads. Benefit: no new rule. Cost: the group says "waiting" while pages still run. Decided in round 78 answer 10 (`qa-memory-2026-11-01.md:72`): "Stays Running, with a note (Recommended)".

No conflict found between round 77 answer 13 and round 75 answer 4 (`qa-memory-2026-10-31.md:54`, "Keep the opened text (Recommended)").

##### 15.30.8 Not verified

- No code ran in this unit. The Monitor dashboard code for the label, the group after a Restart, and the archived run buttons is not built.
- The row text "Mark waiting: Run requested HH:MM" is built from the patterns for Resume and Restart. No source states it for a Run mark. Replaced in round 78 answer 11 (`qa-memory-2026-11-01.md:73`): the row text after a Restart is "Mark waiting: Restart requested HH:MM". The Run text applies to a Run button press on a book that never ran.
- The times, labels, and archive folder names in the examples are invented.
- S2 does not read `<T2>/data/book-store`. The status line texts come from the code of f42e8e6 (section 15.29.5).

Status: round 77 answers applied by unit DZ76. Items in section 15.30.7 wait for the owner. Round 78 answers applied by unit DZ77 (section 15.31).

#### 15.31 Round 78 answers: Restart version choice, run ID, gate for book runs, Restart rows (unit DZ77, round 78)

Unit DZ77 wrote this section on 2026-11-01 (round 78). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-01.md`, lines 62 to 90. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.29. Each line of this file that this section replaces carries a pointer to it. Section 15.31.6 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`). No real run exists yet `[check: DZ77 2026-11-01 14:19 ls data/book-store in <T2>, "No such file or directory"]`. All values in the examples are invented. No code ran in this unit.

##### 15.31.1 Owner words

- Round 78 answer 4 (`qa-memory-2026-11-01.md:66`): "User can choose what version to roll back to, which some note about what that version is (e.g. v4.1.0 have `starting version` note, v4.1.3 have `previous restart version`, and so on.\nyou can suggest which the list of notes should be" `[user 2026-11-01 13:56]`.
- Round 78 answer 5 (`qa-memory-2026-11-01.md:67`): "option 3 with option 1 for quick select, but not every page, only at each updated point (after every N critiques ~ N pages)" `[user 2026-11-01 13:56]`.
- Round 78 answer 7 (`qa-memory-2026-11-01.md:69`): "option 1, but PST time" `[user 2026-11-01 13:56]`.
- Round 78 answer 8 (`qa-memory-2026-11-01.md:70`): "One record per book run (Recommended)" `[accepted recommendation 2026-11-01 13:56]`.
- Round 78 answer 9 (`qa-memory-2026-11-01.md:71`): "Button on Details rows (Recommended)" `[accepted recommendation 2026-11-01 13:56]`.
- Round 78 answer 10 (`qa-memory-2026-11-01.md:72`): "Stays Running, with a note (Recommended)" `[accepted recommendation 2026-11-01 13:56]`.
- Round 78 answer 11 (`qa-memory-2026-11-01.md:73`): "Program writes a Run mark (Recommended), Program copies prompts first (Recommended)" `[accepted recommendation 2026-11-01 13:56]`. The third item, "Row text says Run", was not checked.
- The notes of aki-main at `qa-memory-2026-11-01.md:86-87` mark the readings of answers 4, 5, and 7 as `[reading pending owner check]`. Round 79 answer 3 confirms the readings of answers 4 and 5 (`qa-memory-2026-11-01.md:95`). Round 79 answer 9 replaces the reading of answer 7 (`qa-memory-2026-11-01.md:101`).

##### 15.31.2 Restart dialog

The screen. You press Restart on the book row of the Monitor dashboard `/` on this Mac, or in the Details view. A dialog opens (sections 15.27.2 and 15.30.3). The old dialog showed two choices (lines 5609 and 5610). The new dialog follows the readings of answers 4 and 5 `[reading pending owner check]`, confirmed in round 79 answer 3 (`qa-memory-2026-11-01.md:95`):

1. The title names the book. The facts lines say where the current run goes and where the new run starts.
2. The part "Quick select" is a list of single choices. "Starting versions" is the default. The list also holds "Last live versions" and one row for each update point of all runs of the phase, where at least one rewrite went live. A row names its run, for example "Run 1, after the update point at p050" (round 79 answers 6 and 7, section 15.32.3).
3. A quick select sets the versions of all 16 boxes at once. A row for a page does not exist (answer 5: "not every page, only at each updated point").
4. Below the quick select, each of the 16 boxes has a row. The row shows the box, the chosen version, the note of the version, and facts: the pages on which the version was live, the PASS and FAIL counts, and the critiques that the update point used.
5. You can change a single box after a quick select.
6. The buttons are [Cancel] and [Restart]. Cancel has the focus when the dialog opens (round 75 answer 12, section 15.27.2).

The notes are the proposal of aki-main `[aki-main proposal 2026-11-01]`. The owner accepted them in round 79 answer 4, "Five notes plus facts (Recommended)", and answer 5, "Meaning A plus a run-end note (Recommended)". They are "starting version", "restart start version", "previous restart version", "current live version", and "update after pNNN". The table of the notes is in `translator-design.md`, section 9.29.2. Accepted in round 79 answers 4 and 5 (`qa-memory-2026-11-01.md:96-97`). Answer 5 adds the note "last version of run N" (section 15.32.2).

Sketch (all values invented). The book `mental_full` runs phase 4 and stands at p080. You chose the quick select "After the update point at p075". Then you changed ED_2 to `v4.1.3`. The sketch shows 4 of the 16 box rows. The notes of a row follow the DZ78 order (round 83 answer 16, "Keep DZ78 order (Recommended)", section 15.32.9, item 1). The facts name the run, as in section 15.32.2.

```
+--------------------------------------------------------------------------------------------------------------------------+
| Restart Making the Difference on the Day (mental_full)?                                                                  |
|                                                                                                                          |
|   The current run moves to archive/<time>/.                                                                              |
|   The book runs again from p001 in phase agent-phase-4.                                                                  |
|                                                                                                                          |
|   Quick select                                                                                                           |
|     (o) Starting versions (default)                                                                                      |
|     ( ) Last live versions                                                                                               |
|     ( ) After the update point at p050                                                                                   |
|     (x) After the update point at p075                                                                                   |
|     ...                                                                                                                  |
|                                                                                                                          |
|   Version for each box (you can change one box after a quick select)                                                     |
|     TS_0  [v4.1.0 · starting version, current live version · run 1, p001-p080 (80), 66 PASS 14 FAIL, no critiques used]  |
|     TL_1  [v4.1.2 · current live version, update after p040 · run 1, p041-p080 (40), 33 PASS 7 FAIL, 5 critiques used]   |
|     ED_2  [v4.1.3 · update after p060 · run 1, p061-p065 (5), 4 PASS 1 FAIL, 5 critiques used]   <- changed by hand      |
|     QA_3  [v4.1.1 · current live version, update after p050 · run 1, p051-p080 (30), 25 PASS 5 FAIL, 5 critiques used]   |
|     ... (12 more boxes)                                                                                                  |
|                                                                                                                          |
|   Focus is on [Cancel] when the dialog opens.                                                                            |
|                                                                                   [Cancel]   [Restart]                   |
+--------------------------------------------------------------------------------------------------------------------------+
```

How the mark carries 16 choices is not designed. Today the key `prompts` holds "start" or "last" (lines 5654 to 5659). A map from box to label can replace it `[agent inference]`. Decided in round 79 answer 12 (`qa-memory-2026-11-01.md:104`): a map of 16 labels replaces "start" and "last" (section 15.32.4).

##### 15.31.3 Run ID on screens

Owner words (answer 7): "option 1, but PST time". Reading `[reading pending owner check]` (`qa-memory-2026-11-01.md:87`): the run ID is the start time of the run in Pacific local time. Replaced in round 79 answer 9 (`qa-memory-2026-11-01.md:101`): the run ID uses PST all year (UTC-8), section 15.32.5. The run program writes it once into `status.json` when page 1 starts. It never changes.

Proposal `[proposal aki-main 2026-11-01, pending owner check]`: the value is `2026-11-04T00:15:00-08:00`, which is 00:15 PST and 08:15 UTC. The folder-safe form is `20261104T001500-0800`. The offset keeps the ID unique when the clocks go back, because 01:30 PDT (`-0700`) and 01:30 PST (`-0800`) are two different times. The design side holds the reason (`translator-design.md`, section 9.29.3). This reason is void since round 79 answer 9 (`qa-memory-2026-11-01.md:101`): a fixed UTC-8 offset has no repeated hour (section 15.32.5).

Screens show the run as "phase 4 run 1, started 2026-11-04 00:15 PST". In summer they show PST too, one hour behind the wall clock (round 79 answer 9, section 15.32.5).

Open: archive folder names. They use UTC in the design today. The open item is in section 15.31.8, item c. Decided in round 79 answer 10 (`qa-memory-2026-11-01.md:102`): the archive folder name is the run ID of the ended run (section 15.32.5).

##### 15.31.4 Details view: run rows and the gate

Owner words: answer 8 "One record per book run (Recommended)" and answer 9 "Button on Details rows (Recommended)". Answer 6 (`qa-memory-2026-11-01.md:68`) accepts that the admin gate also covers archived runs.

Rules:

- Each run row in the Details view of a book on the Monitor dashboard `/` gets one button. The button reads "Open to readers" or "Close to readers". This also applies to an archived run.
- One click on the button writes one record in `reader_opens` for the whole run: source "book-store", book, and `run_id` (section 15.31.3).
- The Details view checks the admin sign-in. The API `/api/admin/opens` does this already `[file: <V2>/app/app/api/admin/opens]`. A person who is not the admin sees a sign-in line and no button `[agent inference]` (round 76 answer 11, `qa-memory-2026-11-01.md:14`: "Sign-in line for non-admins (Recommended)").
- The button opens a confirm dialog. Cancel is the first button and has the focus (section 15.28.2, item 6, line 5792). The same rule holds for the process buttons (round 74 answer 12, line 5590).
- The dialog counts the PASS pages of the run (round 76 answer 11: "Open dialog counts PASS pages (Recommended)").
- S2 looks for the run in three places: the book folder (the current run), `archive/<run ID>/` (after a Restart), and `agent-phase-3/` (after the phase move). It shows the PASS pages of an open run only.
- Pilot runs keep one record for each page (round 76 answer 10, `qa-memory-2026-11-01.md:13`) and keep the button on the run view `/runs/<stamp>`.

Example (invented values). The Details view of `mental_full` after one Restart:

```
+----------------------------------------------------------------------------------------------------------------------+
| Runs of Making the Difference on the Day (mental_full)                                                               |
|                                                                                                                      |
| Run                                           Phase          Place     Pages done   Readers                          |
| phase 4 run 1, started 2026-11-04 00:15 PST   agent-phase-4  archive   80 of 169    Closed   [Open to readers]       |
| phase 4 run 2, started 2026-11-05 09:50 PST   agent-phase-4  current    12 of 169    Open     [Close to readers]     |
+----------------------------------------------------------------------------------------------------------------------+
```

You press "Open to readers" on the row of run 1. The dialog says that readers see the Agent text of the PASS pages of run 1 after the next S2 run. You press the action button. At the next S2 run, the book screen `/read/mental_full` shows the PASS pages of run 1 as translated. It shows no text of run 2, because run 2 is closed.

The S2 code and the Details view code for this are not built (unit VW77e, named in the brief of DZ77).

##### 15.31.5 Restart rows on the Monitor dashboard

Owner words: answer 10 "Stays Running, with a note (Recommended)" and answer 11 (a Run mark that keeps the word Restart). Example (invented times): `mental_full` runs phase 4 and p080 runs at 16:40.

| Time | Event | Group on the Monitor dashboard `/` | Row text |
|---|---|---|---|
| 16:40 | You press Restart and then the action button of the dialog. p080 runs. | Running | "Restart requested 16:40" |
| 16:40 to 16:52 | The process finishes p080 and its update point. | Running | "Restart requested 16:40" |
| 16:52 | The process saves p080, archives the run, and copies the chosen prompts (DZ76 default 2, accepted). | Running | "Restart requested 16:40" |
| 16:52 | The run program writes a Run mark with one key that keeps the word Restart (DZ76 default 1, accepted). The process ends. | Waiting for a run | "Mark waiting: Restart requested 16:40" |
| later | An opencode agent starts the book at p001 in phase 4. | Running | the running row |

The key name is `after` (section 15.30.6, default 1, line 6286). The value of the key is not designed. Round 79 answer 12 decides the key `prompts` only (section 15.32.4). Decided in round 80 answer 14 (`qa-memory-2026-11-01.md:136`): the press time sits in the key `requested_utc`, the key `restart_requested_utc` goes away, and `after` = "restart" stays (section 15.33.5). Old text: the key `after` and the press time were a unit default of TR77c.

Open: the time in the row of the fourth line. The row can show the press time (16:40) or the time of the mark (16:52). The recommendation is the press time `[agent inference]` (section 15.31.8, item d). Decided in round 79 answer 11 (`qa-memory-2026-11-01.md:103`): the press time (section 15.32.6).

Not designed: the buttons on the row between the press and the end of the page. Decided in round 79 answer 13 (`qa-memory-2026-11-01.md:105`): no buttons (section 15.32.6).

##### 15.31.6 Lines of this file that round 78 replaced

| Line | Old rule in short | New rule | Owner source |
|---|---|---|---|
| 5597, 5654, 5829, 4293 | The Restart dialog holds two prompt choices, and the key `prompts` holds "start" or "last" | One pick list for each box, with quick select rows | round 78 answers 4 and 5, qa-memory-2026-11-01.md:66-67 |
| 5787 | A record of `reader_opens` holds one page run | A real book run has one record for each book run | round 78 answer 8, qa-memory-2026-11-01.md:70 |
| 6209 | After the press: not designed | The row stays in the group Running with the text "Restart requested HH:MM" | round 78 answer 10, qa-memory-2026-11-01.md:72 |
| 6210, 6213, 6214 | Row text "Mark waiting: Run requested 16:41" | "Mark waiting: Restart requested HH:MM" | round 78 answers 10 and 11, qa-memory-2026-11-01.md:72-73 |
| 6228, 6230, 6232, 6233 | The place to open an archived run is not designed | A button on the run rows of the Details view | round 78 answers 7 to 9, qa-memory-2026-11-01.md:69-71 |
| 6286 | Default 1: the row says Run | Not accepted. The row keeps the word Restart | round 78 answer 11, qa-memory-2026-11-01.md:73 |
| 6287 | Default 2: sketches use phase 4 | Accepted | round 78 answer 12, qa-memory-2026-11-01.md:74 |
| 6291 to 6295 | Open items a to e | Each item carries its round 78 status | round 78 answers 2 to 10, qa-memory-2026-11-01.md:64-72 |
| 6302 | No source states the row text for a Run mark | The row text after a Restart keeps the word Restart | round 78 answer 11, qa-memory-2026-11-01.md:73 |

Lines that stay as they are: line 3928 and line 4359 state the Run text for a Run button press on a book that never ran. Round 78 does not change that text. The dialog sketch in lines 5609 and 5610 sits in a fenced block and stays as history.

##### 15.31.7 Accepted defaults

- DZ76 default 1 of section 15.30.6, the Run row text: not accepted in round 78 answer 11. The other option applies.
- DZ76 default 2 of section 15.30.6, sketches use phase 4 labels: accepted in round 78 answer 12 (`qa-memory-2026-11-01.md:74`).
- The DZ76 defaults 1 and 2 of `translator-design.md`, section 9.28.9 (Run mark, copy of the prompts): accepted in round 78 answer 11.
- The unit defaults of DZ77 are in `translator-design.md`, section 9.29.10. Default 1 (rows only for update points with a live rewrite) is accepted in round 79 answer 6 (`qa-memory-2026-11-01.md:98`). Default 2 (rows cover only the run that the Restart ends) is not accepted in round 79 answer 7 (`qa-memory-2026-11-01.md:99`): the other option applies, rows cover all runs, each row names its run.

##### 15.31.8 Open items for the owner

a. The list of notes (`translator-design.md`, section 9.29.11, item a). Recommended: accept the five notes of the proposal. Example: ED_2 `v4.1.3` reads "update after p060". Decided in round 79 answers 4 and 5 (`qa-memory-2026-11-01.md:96-97`): five notes plus facts, and the note "last version of run N" (section 15.32.2).
b. Versions of an earlier phase in the pick list. Recommended: no, a Restart stays in the same phase. Example: a phase 4 Restart lists `v4.1.0` to `v4.1.6` and not `v3.2.2`. Decided in round 79 answer 8 (`qa-memory-2026-11-01.md:100`): "No, same phase only (Recommended)" (section 15.32.7).
c. Run ID format and archive folder names. Recommended: the Pacific form `20261104T001500-0800` for both. Example: the folder `archive/20261105T013000-0800/`. Decided in round 79 answers 9 and 10 (`qa-memory-2026-11-01.md:101-102`): PST all year (UTC-8), and the archive folder name is the run ID of the ended run, for example `archive/20261104T001500-0800/` (section 15.32.5).
d. The time in the Restart row. Recommended: the press time. Example: "Mark waiting: Restart requested 16:40", and not 16:52. Decided in round 79 answer 11 (`qa-memory-2026-11-01.md:103`): "Press time 16:40 (Recommended)".
e. The design of phase 2 and its prompt files (`translator-design.md`, section 9.29.11, item e). Recommended: design it before any phase 3 test. Decided in round 79 answer 15 (`qa-memory-2026-11-01.md:107`): "Survey first (Recommended)". The design waits for unit SV79.

##### 15.31.9 Not verified

- No code ran in this unit. The Monitor dashboard code for the dialog, the run rows, and the buttons is not built.
- The readings of answers 4, 5, and 7 wait for the owner. Round 79 answer 3 confirms the readings of answers 4 and 5. Round 79 answer 9 replaces the reading of answer 7.
- The note list, the run ID format, and the archive folder names are proposals. Round 79 answers 4, 5, 9, and 10 decide the note list, the run ID, and the archive folder names. The value form of the run ID is a reading pending the owner.
- The shape of the mark with 16 choices is not designed. Decided in round 79 answer 12 (`qa-memory-2026-11-01.md:104`): a map of 16 labels.
- The buttons of a Running row with the text "Restart requested HH:MM" are not designed. Decided in round 79 answer 13 (`qa-memory-2026-11-01.md:105`): no buttons.
- The times, labels, and run IDs in the examples are invented.

Status: round 78 answers applied by unit DZ77. Items in section 15.31.8 wait for the owner.

#### 15.32 Round 79 answers: Restart dialog notes, quick select rows, run ID in PST, archive folder names, Restart mark with 16 labels (unit DZ78, round 79)

Unit DZ78 wrote this section on 2026-11-01 (round 79). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-01.md`, lines 92 to 120. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.30. This section covers the Viewer side only. Each line of this file that this section replaces carries a pointer to it. Section 15.32.8 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`). No real run exists yet `[check: DZ78 2026-11-01 22:43 ls data/book-store in <T2>, "No such file or directory"]`. All values in the examples are invented, except where a line gives a source. No code ran in this unit.

##### 15.32.1 Owner words

- Round 79 answers 1 and 2 (`qa-memory-2026-11-01.md:93-94`): "Accept and commit (Recommended)" for the DZ77 docs and for the TR77ab code. `git log` in <T2> shows the commits 03e03ea (this file) and 76392e0 `[check: DZ78 2026-11-01 22:45 git log --oneline -6 in <T2>]`.
- Answer 3 (`qa-memory-2026-11-01.md:95`): "Yes, the reading is right (Recommended)". It confirms the readings of round 78 answers 4 and 5.
- Answer 4 (`qa-memory-2026-11-01.md:96`): "Five notes plus facts (Recommended)".
- Answer 5 (`qa-memory-2026-11-01.md:97`): "Meaning A plus a run-end note (Recommended)".
- Answer 6 (`qa-memory-2026-11-01.md:98`): "Only points with a live rewrite (Recommended)".
- Answer 7 (`qa-memory-2026-11-01.md:99`): "All runs, with run number" (option 2).
- Answer 8 (`qa-memory-2026-11-01.md:100`): "No, same phase only (Recommended)".
- Answer 9 (`qa-memory-2026-11-01.md:101`): "PST all year (UTC-8)" (option 2).
- Answer 10 (`qa-memory-2026-11-01.md:102`): "Run ID of the ended run (Recommended)".
- Answer 11 (`qa-memory-2026-11-01.md:103`): "Press time 16:40 (Recommended)".
- Answer 12 (`qa-memory-2026-11-01.md:104`): "Map of 16 labels (Recommended)".
- Answer 13 (`qa-memory-2026-11-01.md:105`): "No buttons (Recommended)".
- Answer 14 (`qa-memory-2026-11-01.md:106`): the 12 defaults of TR77ab stay. They are Translator code and sit in `translator-design.md`, section 9.30.8.
- Answers 15, 17, and 18 (`qa-memory-2026-11-01.md:107,109,110`): "Survey first (Recommended)" for phase 2 and for the tanden pages. Unit SV79 reads files only. This file holds no design for either topic. The design waits for SV79. Round 80 answers 3 to 7 and 22 to 24 answer them (sections 15.33.8 and 15.33.9).
- Answer 16 (`qa-memory-2026-11-01.md:108`): the units DZ78, TR77c, and SV79 run. VW77a is not checked.

##### 15.32.2 Restart dialog: notes and facts

The screen. You press Restart on the book row of the Monitor dashboard `/` on this Mac, or in the Details view. The dialog of section 15.31.2 opens. Round 79 answer 3 confirms its 16 pick lists. Each box has one list. A list holds all saved versions of the current phase, also versions of archived runs. Each version row shows the version, its notes, and the facts.

The notes are six (`translator-design.md`, section 9.30.2):

- "starting version": `v<phase>.1.0`, the copy of the last live version of the previous phase. Example: ED_2 `v4.1.0`, copy of `v3.2.2`.
- "restart start version": `v<phase>.<run>.0` for run 2 or later. Example: ED_2 `v4.2.0`, copy of `v4.1.3`.
- "previous restart version": the version that an earlier Restart picked. Example: ED_2 `v4.1.3`.
- "last version of run N": the version that was live when a Restart ended run N. Example: ED_2 `v4.1.6` gets "last version of run 1".
- "current live version": the version that the pointer `current` names.
- "update after pNNN": the version that the update point after page pNNN made. Example: "update after p060".

The facts on each row: the pages on which the version was live, the PASS and FAIL counts of those pages, and the critiques that the update point used. The page IDs start again at p001 in each run, so the pages name the run, for example "run 1, p061 to p065".

Sketch (all values invented, the second Restart of `mental_full` during run 2). You opened the pick list of ED_2. The quick select "Run 1, after the update point at p075" gave `v4.1.6`. You picked `v4.1.3` by hand.

```
+--------------------------------------------------------------------------------------------------------------------------------+
| Version for ED_2 (you can change one box after a quick select)                                                                 |
|                                                                                                                                |
|      Version  Notes                                         Pages live                  PASS / FAIL    Critiques used          |
|  ( ) v4.1.0   starting version                              run 1, p001-p020 (20)       17 / 3         none                    |
|  ( ) v4.1.1   update after p020                             run 1, p021-p040 (20)       16 / 4         5                       |
|  ( ) v4.1.2   update after p040                             run 1, p041-p060 (20)       17 / 3         5                       |
|  (x) v4.1.3   update after p060, previous restart version   run 1, p061-p065 (5)         4 / 1         5                       |
|  ( ) v4.1.4   update after p065                             run 1, p066-p070 (5)         4 / 1         5                       |
|  ( ) v4.1.5   update after p070                             run 1, p071-p075 (5)         5 / 0         5                       |
|  ( ) v4.1.6   update after p075, last version of run 1      run 1, p076-p080 (5)         4 / 1         6                       |
|  ( ) v4.2.0   restart start version (copy of v4.1.3)        run 2, p001-p025 (25)       21 / 4         none                    |
|  ( ) v4.2.1   update after p025                             run 2, p026-p040 (15)       13 / 2         5                       |
|  ( ) v4.2.2   update after p040, current live version       run 2, p041-p050 (10)        8 / 2         5                       |
+--------------------------------------------------------------------------------------------------------------------------------+
```

The facts of `v4.1.3` come from the sketch of section 15.31.2. The pages live of run 1 come from `translator-design.md`, section 9.29.2. All other facts are invented.

A row with two notes shows them in one cell (unit default DZ78 1, section 15.32.9). A start version shows "none" in "Critiques used" (unit default DZ78 2).

##### 15.32.3 Quick select rows

Owner words: answer 6 "Only points with a live rewrite (Recommended)" and answer 7 "All runs, with run number" (option 2). The part "Quick select" of the dialog holds these rows:

1. "Starting versions" (default).
2. "Last live versions".
3. One row for each update point of each run of the phase, where at least one rewrite went live. The row names its run.

An update point where every rewrite was "rejected twice" has no row. A row for a page does not exist (round 78 answer 5: "not every page, only at each updated point").

Example for the second Restart of `mental_full` (values invented):

```
Quick select
  (o) Starting versions (default)
  ( ) Last live versions
  ( ) Run 1, after the update point at p020
  ( ) Run 1, after the update point at p040
  ( ) Run 1, after the update point at p050
  ( ) Run 1, after the update point at p060
  ( ) Run 1, after the update point at p065
  ( ) Run 1, after the update point at p070
  (x) Run 1, after the update point at p075
  ( ) Run 2, after the update point at p025
  ( ) Run 2, after the update point at p040
```

The row "Last live versions" and the row "Run 2, after the update point at p040" hold the same 16 versions in this example. Unit default DZ78 3 keeps both rows.

What "Starting versions" means in run 2 or later is decided in round 80 answer 17 (`qa-memory-2026-11-01.md:139`): the start versions of the phase, for example ED_2 `v4.1.0` in run 2 (section 15.33.6). Old text: it was open (section 15.32.10, item b).

##### 15.32.4 Restart mark with 16 labels

Owner words (answer 12): "Map of 16 labels (Recommended)". The Monitor writes the key `prompts` as a map from box to label with all 16 boxes. It replaces the old values "start" and "last". The mark when you keep the quick select "Starting versions" of phase 4 run 1 for `mental_full` (one JSON line):

```
{"schema": "book-request-v1", "book": "mental_full", "action": "restart", "phase": "agent-phase-4", "prompts": {"TS_0": "v4.1.0", "TS_1": "v4.1.0", "TS_2": "v4.1.0", "TS_3": "v4.1.0", "TL_0": "v4.1.0", "TL_1": "v4.1.0", "TL_2": "v4.1.0", "TL_3": "v4.1.0", "ED_0": "v4.1.0", "ED_1": "v4.1.0", "ED_2": "v4.1.0", "ED_3": "v4.1.0", "QA_0": "v4.1.0", "QA_1": "v4.1.0", "QA_2": "v4.1.0", "QA_3": "v4.1.0"}, "requested_utc": "2026-11-05T09:30:00Z", "requested_by": "Monitor dashboard"}
```

Second example in prose. You pick the quick select "Run 1, after the update point at p075" and change ED_2 to `v4.1.3`. The map holds the label that was live after p075 for 15 boxes. For ED_2 it holds `"ED_2": "v4.1.3"`.

Rules:

- The key `requested_utc` stays in UTC. Only the run ID uses PST.
- The names of the keys in the Run mark that the run program writes after a Restart (the key `after` and the press time) were a unit default of TR77c. Round 80 answer 14 decides them (section 15.33.5).
- The line 5659 of this file holds the earlier example of the mark. Unit DZ78 replaced its key `prompts`.

##### 15.32.5 Run ID on screens, in the Details view, and in archive folder names

Owner words: answer 9 "PST all year (UTC-8)" (option 2) and answer 10 "Run ID of the ended run (Recommended)". The rejected option of answer 9 was Pacific clock time with the offset of the day.

Rules:

- The run ID is the start time of the run in UTC-8, all year, also in summer.
- Screens show it as "phase 4 run 1, started 2026-11-04 00:15 PST".
- The archive folder is named with the run ID of the ended run in folder form.

The value form below is a reading `[reading pending owner check]` (note of aki-main at `qa-memory-2026-11-01.md:117`):

| Case | Start of the run | Run ID | Folder form | Screen text |
|---|---|---|---|---|
| Winter | 2026-11-04 08:15 UTC | `2026-11-04T00:15:00-08:00` | `20261104T001500-0800` | "phase 4 run 1, started 2026-11-04 00:15 PST" |
| Summer | 2026-07-10 16:00 UTC, which is 09:00 PDT on the wall clock | `2026-07-10T08:00:00-08:00` | `20260710T080000-0800` | "phase 4 run 1, started 2026-07-10 08:00 PST" |

In summer, the screen time is one hour behind the wall clock. A run that starts at 09:00 PDT shows "08:00 PST". This follows the owner choice of answer 9. The conversions come from `[check: DZ78 2026-11-01 22:43 python3 -B tz_check.py]`.

Details view. Each run row in the Details view of `mental_full` (section 15.31.4) names the run by its start time in PST. The folder of run 1 is `<T2>/data/book-store/mental_full/archive/20261104T001500-0800/`. The `run_id` of the record in `reader_opens` is the run ID of the same run. The old example folder `archive/20261105T093000Z/` is replaced.

The design side holds the side effect that the repeated hour of 2026-11-01 does not repeat in run IDs (`translator-design.md`, section 9.30.5). Unit TR77c builds the code (round 79 answer 16). Built in TR77c (commit 2f07ce9, accepted in round 80 answer 2): `pst_iso` and `run_id_folder` `[file: <T2>/data/scripts/translator/store.py:59-74]`.

##### 15.32.6 Restart rows: press time and no buttons

Owner words: answer 11 "Press time 16:40 (Recommended)" and answer 13 "No buttons (Recommended)". The Restart row shows the time of your press. It does not show the time of the Run mark (16:52). While a Restart waits, the Running row shows no buttons. That is the time between the press and the end of the process.

Example (invented times, run 1 started 2026-11-04 00:15 PST). `mental_full` runs phase 4 and p080 runs at 16:40.

| Time | Event | Group on the Monitor dashboard `/` | Row text | Buttons |
|---|---|---|---|---|
| 16:40 | You press Restart and then the action button of the dialog. p080 runs. | Running | "Restart requested 16:40" | none |
| 16:40 to 16:52 | The process finishes p080 and its update point. | Running | "Restart requested 16:40" | none |
| 16:52 | The run program saves p080, moves the run files into `archive/20261104T001500-0800/`, and copies the chosen versions as `v4.2.0`. | Running | "Restart requested 16:40" | none |
| 16:52 | The run program writes the Run mark. The process ends. | Waiting for a run | "Mark waiting: Restart requested 16:40" | not changed by round 79 |
| later | An opencode agent starts the book at p001 in phase 4. | Running | the running row | the buttons of a running row |

The row has the buttons Pause, Restart, and Details before the press (section 15.30.3). Answer 13 says "No buttons". Whether the link Details goes away is open (section 15.32.10, item c). Answered in round 80 answer 18 (`qa-memory-2026-11-01.md:140`): the link Details stays (section 15.33.3).

##### 15.32.7 Same phase only

Owner words (answer 8): "No, same phase only (Recommended)". Pick lists hold no version of an earlier phase. Example: a phase 4 Restart of `mental_full` lists `v4.1.0` to `v4.1.6` and `v4.2.0` to `v4.2.2`. It does not list `v3.2.2`. The text of `v3.2.2` stays reachable, because `v4.1.0` is a full copy of it and carries the note "starting version" `[agent inference]`.

##### 15.32.8 Lines of this file that round 79 replaced

Each row is one line of this file that the unit changed in place. The unit changed no line count.

| Line | Old text in short | New text in short | Owner source |
|---|---|---|---|
| 4003 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 4293 | `"prompts": "start"` as the current value | map of 16 labels, the old value stays as quoted old text | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 5651 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 5659 | "prompts": "start" | the map of 16 labels (JSON line) | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 5662 | key `prompts` is "start" or "last" | key `prompts` is a map of 16 labels | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 5689 | events `update point ended` | `update-point-ended` | round 79 answer 14, qa-memory-2026-11-01.md:106 |
| 5820 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 5822 | archive/20261105T093000Z/ | archive/20261104T001500-0800/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 5942 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6029 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6209 | buttons cell: not designed | buttons cell: none | round 79 answer 13, qa-memory-2026-11-01.md:105 |
| 6210 | time open | time decided: press time | round 79 answer 11, qa-memory-2026-11-01.md:103 |
| 6223 | archive/<UTC time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6228 | Pacific start time | start time in PST (UTC-8 all year) | round 79 answer 9, qa-memory-2026-11-01.md:101 |
| 6234 | run `20261105T093000Z` | run `20261104T001500-0800` | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6291 | run `20261105T093000Z` | run `20261104T001500-0800` | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6293 | Pacific start time, format open | start time in PST, value form is a reading pending the owner | round 79 answer 9, qa-memory-2026-11-01.md:101 |
| 6323 | readings pending (no change to text) | confirmation and replacement appended | round 79 answer 3, qa-memory-2026-11-01.md:95 and answer 9 |
| 6327 | readings of answers 4 and 5 [reading pending owner check] | same, confirmed in round 79 answer 3 | round 79 answer 3, qa-memory-2026-11-01.md:95 |
| 6330 | rows for update points of the run, "After the update point at p050" | rows of all runs with a live rewrite, "Run 1, after the update point at p050" | round 79 answer 6, qa-memory-2026-11-01.md:98 and 7 |
| 6336 | proposal pending owner check | acceptance appended | round 79 answer 4, qa-memory-2026-11-01.md:96 and 5 |
| 6366 | shape not designed (no change to text) | decision appended | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 6370 | Pacific local time | replacement note inserted | round 79 answer 9, qa-memory-2026-11-01.md:101 |
| 6372 | offset reason (no change to text) | void note appended | round 79 answer 9, qa-memory-2026-11-01.md:101 |
| 6374 | "In summer they show PDT" | "In summer they show PST too" | round 79 answer 9, qa-memory-2026-11-01.md:101 |
| 6376 | open text (no change to text) | decision appended | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6389 | archive/<time>/ | archive/<run ID>/ | round 79 answer 10, qa-memory-2026-11-01.md:102 |
| 6420 | key after open (no change to text) | pointer appended | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 6422 | time open (no change to text) | decision appended | round 79 answer 11, qa-memory-2026-11-01.md:103 |
| 6424 | buttons not designed (no change to text) | decision appended | round 79 answer 13, qa-memory-2026-11-01.md:105 |
| 6447 | unit defaults of DZ77 (pointer only) | status of defaults 1 and 2 appended | round 79 answer 6, qa-memory-2026-11-01.md:98 and 7 |
| 6451 | open item a (no change to text) | decision appended | round 79 answer 4, qa-memory-2026-11-01.md:96 and 5 |
| 6452 | open item b (no change to text) | decision appended | round 79 answer 8, qa-memory-2026-11-01.md:100 |
| 6453 | open item c (no change to text) | decision appended | round 79 answer 9, qa-memory-2026-11-01.md:101 and 10 |
| 6454 | open item d (no change to text) | decision appended | round 79 answer 11, qa-memory-2026-11-01.md:103 |
| 6455 | open item e (no change to text) | decision appended | round 79 answer 15, qa-memory-2026-11-01.md:107 |
| 6460 | readings wait (no change to text) | status appended | round 79 answer 3, qa-memory-2026-11-01.md:95 |
| 6461 | proposals (no change to text) | status appended | round 79 answer 4, qa-memory-2026-11-01.md:96 and answers 5, 9, and 10 |
| 6462 | mark shape not designed (no change to text) | decision appended | round 79 answer 12, qa-memory-2026-11-01.md:104 |
| 6463 | buttons not designed (no change to text) | decision appended | round 79 answer 13, qa-memory-2026-11-01.md:105 |

Lines that stay as history or inside a code block, checked by the unit:

- Line 4282: code block (folder tree): the event names `page done`, `page failed`, `phase changed` stay.
- Line 5606: code block (dialog sketch of 15.27): `archive/<UTC time>/` stays.
- Line 5678: code block (archived runs sketch): `20261105T093000Z` and the header `UTC time` stay.
- Line 6344: code block (dialog sketch of 15.31.2): `archive/<time>/` stays.
- Line 6316: owner quote of round 78 answer 4 (note `previous restart version`).
- Line 6430: history row of table 15.31.6 (key `prompts` with "start" or "last").
- Line 5740: other text of a DZ73 option: `Restart (prompts: start)`.
- Line 3857: local PDT times of the Monitor dashboard, not run IDs (item d of section 15.32.10 asks about them).

##### 15.32.9 Unit defaults of DZ78

1. `[unit default DZ78]` A row of a pick list shows two notes in one cell, in a fixed order (starting or restart start, last version of run N, previous restart, current live, update after pNNN). Other option: one row for each note. Benefit of the default: one row for each version. Cost: a long cell for a version with 3 notes.
2. `[unit default DZ78]` The fact "Critiques used" reads "none" for a start version such as ED_2 `v4.1.0`. Other option: show "0". Benefit of the default: a start version has no update point. The value "0" reads as an update point with no critique. Cost: one more word to read.
3. `[unit default DZ78]` The quick select keeps "Last live versions" when it holds the same 16 versions as the newest update point row. Other option: drop the update point row. Benefit of the default: every update point with a live rewrite has its row. Cost: two rows with the same 16 versions.
4. `[unit default DZ78]` A quick select row names its run also when the phase has one run only. Other option: leave out "Run 1" before the first Restart. Benefit of the default: one row pattern. Cost: a longer text before the first Restart.
5. `[unit default DZ78]` The quick select rows run in this order: "Starting versions", "Last live versions", run 1 by page, then run 2 by page. Other option: newest first. Benefit of the default: the order matches the pick list. Cost: the newest row sits at the end of a long list.
6. `[unit default DZ78]` In line 4293 of this file, the inline text `"prompts": "start"` stays as quoted old text, because the sentence names both old values. The sentence now says that the key holds a map of 16 labels. Other option: put the full map into the sentence. Benefit of the default: the sentence stays readable. Cost: a search for `"prompts": "start"` still finds that line.
7. `[unit default DZ78]` The line 4282 stays unchanged, because it sits in a code block of the folder tree. Other option: change the event names in the code block. Benefit of the default: the rule "do not alter code blocks" holds. Cost: the tree shows `phase changed` while the code writes `phase-changed`.

##### 15.32.10 Open items for the owner

a. The value form and the screen text of the run ID (section 15.32.5). Recommended: accept `2026-11-04T00:15:00-08:00`, the folder form `20261104T001500-0800`, and "started 2026-11-04 00:15 PST". Example: a run that starts at 09:00 PDT on 2026-07-10 shows "started 2026-07-10 08:00 PST". Benefit: one rule all year. Cost: in summer the screen is one hour behind the wall clock. Other option: add the wall clock in brackets, "started 2026-07-10 08:00 PST (09:00 PDT)". Benefit: you can match the screen with your clock. Cost: a longer text. Answered in round 80 answer 16 (`qa-memory-2026-11-01.md:138`): "PST only (Recommended)".
b. What "Starting versions" means in run 2 or later (section 15.32.3). Recommended: the start versions of the run that the Restart ends. Example: a second Restart of `mental_full` during run 2 sets ED_2 to `v4.2.0`, the copy of `v4.1.3`. Benefit: it matches round 74 answer 8, option 1. Cost: the row does not reach `v4.1.0`, but the pick list holds it. Other option: the first versions of the phase, `v4.1.0` for all boxes. Benefit: the row always means the phase start. Cost: the start set of run 2 is on no quick select row. Answered in round 80 answer 17 (`qa-memory-2026-11-01.md:139`): "Phase start: v4.1.0" (option 2). This replaces the recommendation above (section 15.33.6).
c. The Running row after the press (section 15.32.6). Question: does "No buttons" include the link Details? Recommended: the link Details stays, because it is not a process action `[agent inference]`. Example: `mental_full` at 16:45 shows "Restart requested 16:40" and the link Details. Benefit: you can read the state of the book. Cost: the row is not empty. Other option: remove the link until the process ends. Benefit: the row matches the words "No buttons". Cost: you cannot open Details for about 12 minutes in the example. Answered in round 80 answer 18 (`qa-memory-2026-11-01.md:140`): "Keep the Details link (Recommended)".
d. The time zone of other times on the Monitor dashboard `/` (line 4007: local time with the zone name). Recommended: keep it. Example: in summer the Restart row shows "Restart requested 16:40" in local time, and the run ID shows PST. Benefit: only the run ID changes. Cost: two zones on one screen in summer. Other option: show all times in PST. Benefit: one zone. Cost: the row time differs from your clock in summer. Answered in round 80 answer 19 (`qa-memory-2026-11-01.md:141`): "All times in PST" (option 2). This replaces the recommendation above (section 15.33.2).
e. The length of the quick select list (section 15.32.3). Recommended: show all rows. Example: after 3 Restarts of `mental_full`, the list holds about 30 rows. Benefit: you reach every update point. Cost: a long list. Other option: show the last two runs and one row "More runs". Benefit: a short list. Cost: one more step to reach an old run. Answered in round 80 answer 20 (`qa-memory-2026-11-01.md:142`): "Show all rows (Recommended)".

##### 15.32.11 Not verified

- No code ran in this unit. The Monitor dashboard code for the dialog, the notes, the quick select, the run rows, and the run ID text is not built.
- Unit TR77c is built (commit 2f07ce9, accepted in round 80 answer 2). Old text: it was not built, and the run ID code, the mark with 16 labels, and the archive folder names had no code. The Viewer cannot show "Critiques used" until the run loop writes the event `update-point-ended` (unit TR77d).
- The value form of the run ID, the folder form, and the screen text are readings of aki-main (`qa-memory-2026-11-01.md:117`).
- The pages live, the PASS and FAIL counts, and the critique counts in the sketch are invented, except those of `v4.1.3`.
- Phase 2 and the tanden pages have no design in this file. Unit SV79 must report first. Round 80 answers 22 to 24 set the first phase 2 rules (`translator-design.md`, section 9.31.6). The tanden join is planned in unit TJ80 (section 15.33.9).

Status: round 79 answers applied by unit DZ78. Items in section 15.32.10 wait for the owner.

#### 15.33 Round 80 answers: PST times, buttons on a Running row, refused Restart, "Starting versions", data contract, phase 2 row, tanden pages (unit DZ79, round 80)

Unit DZ79 wrote this section on 2026-11-02 (round 80). The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-01.md`, lines 122 to 158. Answer N sits at line 122+N. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.31. This section covers the Viewer side only. Each line of this file that this section replaces carries a pointer to it. Section 15.33.10 lists those lines.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`). No real run exists yet `[check: DZ79 2026-11-02 00:03 ls data/book-store in <T2>, "No such file or directory"]`. All values in the examples are invented, except where a line gives a source. No code ran in this unit.

Screen names in this section: the Monitor dashboard `/` on this Mac, the Reader dashboard `/read`, the book screen `/read/<slug>`, and the run view `/runs/<stamp>`.

##### 15.33.1 Owner words

The full list of the owner words of round 80 is in `translator-design.md`, section 9.31.1. The answers that touch the Viewer are:

- Answers 1 and 2 (`qa-memory-2026-11-01.md:123-124`): "Accept and commit now (Recommended)" for the DZ78 docs, and "Accept and commit (Recommended)" for the TR77c code. `git log` shows the commits 196f574 in <V2> and 2f07ce9 in <T2> `[check: DZ79 2026-11-02 00:03 git log --oneline in <T2> and <V2>]`.
- Answer 10 (line 132): "Refuse and show the reason (Recommended)".
- Answer 13 (line 135): "Just prevent this from happening by gray out the buttons".
- Answer 14 (line 136): "Press time in requested_utc".
- Answer 16 (line 138): "PST only (Recommended)".
- Answer 17 (line 139): "Phase start: v4.1.0".
- Answer 18 (line 140): "Keep the Details link (Recommended)".
- Answer 19 (line 141): "All times in PST".
- Answer 20 (line 142): "Show all rows (Recommended)".
- Answer 21 (line 143): all 9 DZ78 docs defaults are accepted. Section 15.33.11 lists them.
- Answers 22 to 24 (lines 144 to 146): the order of phase 2 (section 15.33.8).
- Answers 25, 26, and 28 (lines 147, 148, 150): units DZ79, VW77a, and TJ80 run. "Tighten the briefs (Recommended)". "Run the plan (Recommended)".

##### 15.33.2 Times on the Monitor dashboard in PST all year (answers 16 and 19)

Owner words, answer 19: "All times in PST" (option 2) `[accepted option 2 2026-11-01 23:42]`. Reading (`qa-memory-2026-11-01.md:156`) `[reading pending owner check]`: every time on the Monitor dashboard `/` shows in PST (UTC-8) all year, like the run ID. This replaces the recommendation of DZ78 (section 15.32.10, item d: keep local time). Round 81 answers 17 and 18 (`qa-memory-2026-11-02.md:22,23`) extend PST to the Lists tab, the run view, the Reader dashboard, and the book screens (section 15.34.6).

Rules:

- Each time on the Monitor dashboard shows in PST with the word PST, then the relative time. Example: "Nov 4 00:15 PST (3 h ago)".
- This holds for the header time, the row text, the times in the Details view, and the run ID text.
- The run ID text reads "phase 4 run 1, started 2026-11-04 00:15 PST". In summer it reads PST too (answer 16: "PST only (Recommended)").
- The relative time does not change.
- The files keep UTC. The tooltip and the detail view show the UTC stamp of the file (line 4007) `[unit default DZ79]`.

Example for July (invented). You press Restart when the wall clock shows 16:40 PDT. The row reads "Restart requested 15:40 PST". The file holds the UTC time 23:40. The tooltip reads "2026-07-10T23:40:00Z".

Example for November (invented). The wall clock and PST agree after 2026-11-01. You press Restart at 16:40. The row reads "Restart requested 16:40 PST".

The PDT times in the sketches of section 15.24 are old examples. They show real list data of October 2026 `[real]`. The sketches stay as they are. The row examples in sections 15.30 to 15.32 show "16:40" with no zone. Since answer 19 they read "16:40 PST".

Decided in round 81 answer 18 (`qa-memory-2026-11-02.md:23`): the Reader dashboard `/read` and the book screens `/read/<slug>` show PST too (section 15.34.6). Old text: the Reader dashboard was not decided.

Unit that builds this: VW77a (the read side of the Monitor dashboard) `[aki-main proposal in the brief of DZ79, not verified]`. The helper is `app/lib/format.ts` (line 4331 of this file). Round 81: unit VW77b1 built the PST change for the Lists tab, the run view, and the page check date, with helpers in `lib/pst-more.ts`. The owner accepted it in round 82 answer 8. The word PST on the page check date comes in unit VW77b2 (it runs in round 82, result Not verified).

##### 15.33.3 Buttons and the note on a Running row (answers 13 and 18)

Owner words, answer 13: "Just prevent this from happening by gray out the buttons". The Viewer grays out Run and Resume on a Running row of the Monitor dashboard `/`. So no Run or Resume mark comes from the Monitor dashboard while the book runs. The run program keeps its fallback: such a mark stays in `request.json` and the book goes on (`translator-design.md`, section 9.31.4, rule 7). Round 81 answer 19 (`qa-memory-2026-11-02.md:24`) confirms this reading: "Reading is right (Recommended)".

Owner words, answer 18: "Keep the Details link (Recommended)". The Running row keeps the link Details while a Restart waits. Round 79 answer 13 (`qa-memory-2026-11-01.md:105`) stays: "No buttons (Recommended)".

| Moment | Group on the Monitor dashboard `/` | Row text | Buttons and links |
|---|---|---|---|
| Running, no Restart waits | Running | the running row | Pause, Restart, Details. Run and Resume are grayed out with a reason `[unit default DZ79]`. |
| Running, you pressed Restart at 16:40 | Running | "Restart requested 16:40 PST" | No buttons. The link Details stays. |
| The process saved p080 and ended | Waiting for a run | "Mark waiting: Restart requested 16:40 PST" | Details (section 15.30.3) |
| An opencode agent started the book | Running | the running row at p001 in phase 4 | Pause, Restart, Details. Run and Resume are grayed out. |

Example with `mental_full` (invented). The book runs phase 4 at p080. The row shows [Pause] [Restart] [Details] and two grayed buttons. The grayed Resume carries the reason "Resume is off because this book runs now" (the form of line 4003). At 16:40 you press Restart and confirm. Until the process ends, the row shows no button and the link Details.

Which unit builds this: VW77b (the buttons) `[aki-main proposal in the brief of DZ79, not verified]`. The order of the code units is in `translator-design.md`, line 8376. Round 81: unit VW77b1 built the buttons Run, Run phase 4, Pause, and Resume with confirm dialogs. The owner accepted it in round 82 answer 8. Unit VW77b2 built the Restart dialog and Clear mark (commit e7b4b5d, accepted in round 83 answer 2, section 15.36.3).

##### 15.33.4 Row text of a refused Restart (answer 10)

Owner words (`qa-memory-2026-11-01.md:132`): "Refuse and show the reason (Recommended)". The question held a proposal of aki-main `[aki-main proposal]`:

- The Translator writes a history event `restart-refused` with the reason.
- The row text on the Monitor dashboard `/` reads "Restart refused: ED_2 v4.1.3 has no file".
- The book state stays.

Before TR77c2, the Translator did not write the event (`translator-design.md`, section 9.31.5, item a). The row text needs a Viewer unit. Round 81 answers 15 and 16 (`qa-memory-2026-11-02.md:20,21`) set the row and the event keys. Unit TR77c2 built the event (accepted in round 82 answer 4). See section 15.34.5.

Example with `mental_full`. The book is Stopped by a Pause at p080. You open the Restart dialog and pick ED_2 `v4.1.3`. The file is gone. An opencode agent runs the run-book command. The command refuses. The mark stays in `request.json`. After the code change, the history holds `restart-refused`. The row reads "Restart refused: ED_2 v4.1.3 has no file".

Decided in round 81 answer 15 (`qa-memory-2026-11-02.md:20`): the row keeps the group of its own state and shows a second line (section 15.34.5). Old text: the group was not designed.

##### 15.33.5 Press time in the Run mark (answer 14)

Owner words (`qa-memory-2026-11-01.md:136`): "Press time in requested_utc". After the code change, the Run mark that a Restart leaves holds the press time in `requested_utc`. The key `restart_requested_utc` goes away. The key `after` = "restart" stays. The Translator side is in `translator-design.md`, section 9.31.5, item c. TR77c2 removed the key (round 81).

Before TR77c2, the code of TR77c wrote `restart_requested_utc` `[file: <T2>/data/scripts/translator/store.py:355]`. The Monitor dashboard must work before and after the code change. The rule `[aki-main proposal]`:

- For a Run mark with `after` = "restart", the row text reads the press time from `restart_requested_utc` when the key is present. TR77c2 no longer writes the key. Whether the Viewer code still reads it is Not verified.
- If the key is absent, the row text reads `requested_utc`.
- For every other mark, the row text reads `requested_utc`.

Example (invented values, the times of section 15.32.6). Run 1 started at 2026-11-04 00:15 PST. You pressed Restart at 16:40 PST, which is 2026-11-05T00:40:00Z. The run program wrote the mark at 16:52 PST.

- Mark of today: `restart_requested_utc` is "2026-11-05T00:40:00Z" and `requested_utc` is "2026-11-05T00:52:00Z". The row reads "Mark waiting: Restart requested 16:40 PST".
- Mark after the code change: `requested_utc` is "2026-11-05T00:40:00Z". The row reads "Mark waiting: Restart requested 16:40 PST".

##### 15.33.6 Quick select "Starting versions" in run 2 or later (answer 17)

Owner words (`qa-memory-2026-11-01.md:139`): "Phase start: v4.1.0" (option 2) `[accepted option 2 2026-11-01 23:42]`. The quick select row "Starting versions" always means the start versions of the phase. This replaces the recommendation of DZ78 (section 15.32.10, item b). Round 81 answer 20 (`qa-memory-2026-11-02.md:25`) confirms this reading: "Reading is right (Recommended)". The note of aki-main at `qa-memory-2026-11-01.md:155` carried the pending tag until then.

Example. `mental_full` is in phase 4, run 2. You press Restart. The dialog shows:

```
Quick select
  (x) Starting versions (default)       every box at its phase start, ED_2 v4.1.0
  ( ) Last live versions                every box at its live version, ED_2 v4.2.2
  ( ) Run 1, after the update point at p060
  ...

Version for ED_2
  ( ) v4.1.0   starting version
  ...
  ( ) v4.2.0   restart start version (copy of v4.1.3)
  ( ) v4.2.2   update after p040, current live version
```

The pick list of ED_2 still holds `v4.2.0` with the note "restart start version". So the choice of round 74 answer 8, option 1, stays reachable by hand: "User can choose option 1 or 2. Option 1 is default." (`qa-memory-2026-10-31.md:34`). Option 1 was "the prompts that the archived run started with". For run 2 that is `v4.2.0`. You pick it in each of the 16 lists.

Answer 20 (`qa-memory-2026-11-01.md:142`): "Show all rows (Recommended)". The quick select shows all rows, with no limit.

##### 15.33.7 Data contract: states, stop reasons, `run_id`, and mark keys

TR77c changed the files that the Viewer reads. The lines 4270, 4271, and 4280 of section 15.24.9 now match `store.py`. The rest of the contract block stays as old text.

Facts from the code of TR77c `[check: DZ79 2026-11-02 00:01 read of store.py, restart.py, and translator_run.py in <T2>]`:

- States: `"not-started"`, `"running"`, `"stopped"`, and `"completed"` `[file: <T2>/data/scripts/translator/store.py:33]`. The state `"paused"` is gone.
- Stop reasons: `"ctrl-c"`, `"target-reached"`, `"forward-failure"`, `"cost-guard"`, `"rule"`, `"pause"`, and `"restart"` `[file: <T2>/data/scripts/translator/store.py:35]`.
- New keys in `status.json`: `run_id` (a PST start time, for example "2026-11-04T00:15:00-08:00"), `started_utc`, and `pause_requested` `[file: <T2>/data/scripts/translator/store.py:136-142]`. The key `run_id` keeps the first start. The key `started_utc` changes at every start `[file: <T2>/data/scripts/translator_run.py:2669-2671]`.
- The block of 15.24.9 does not list these keys of `new_status`: `accepted`, `critic_mode`, `settings_revision`, `settings_values`, `settings_warnings`, and `pause_requested`. A later docs unit can add them.
- Keys of a mark `request.json` `[file: <T2>/data/scripts/translator/store.py:324-358]`:

| Key | Values | Remark |
|---|---|---|
| `schema` | "book-request-v1" | all marks |
| `book` | the slug | all marks |
| `action` | "run", "resume", or "restart" | all marks |
| `phase` | "agent-phase-3" or "agent-phase-4" | all marks |
| `prompts` | a map of the 16 boxes to labels | only the action "restart" |
| `after` | "restart" | only a Run mark that a Restart leaves |
| `restart_requested_utc` | the press time in UTC | only with `after`. It goes away after the code change (section 15.33.5). TR77c2 removed it (round 81). |
| `requested_utc` | UTC time | the write time today. The press time after the code change. |
| `requested_by` | "Monitor dashboard" or "run program" | all marks |

- History events that TR77c writes: `start` with `run_id` `[file: <T2>/data/scripts/translator_run.py:2674]`, `stopped` with the reason `pause` `[file: <T2>/data/scripts/translator_run.py:2852]`, and `restart` followed by `prompts-copied` `[file: <T2>/data/scripts/translator/restart.py:179-182]`. Unit TR77c2 added the event `restart-refused` in round 81 with the keys `reason` and `requested_utc` (accepted in round 82 answer 4, section 15.34.5).
- The folder `archive/<run ID folder>/` holds `book-memory.jsonl`, `pages/`, `prompts/`, and `status.json`. The file `status.json` there says `stopped` and `restart`. The files `history.jsonl`, `lock`, and `request.done.json` stay in the book folder `[file: <T2>/data/scripts/translator/store.py:270-282]`.
- The key `path` in `parent` of a version file is relative to the store root `data/book-store/` (`translator-design.md`, section 9.31.3). Example: `mental_full/archive/20261104T001500-0800/prompts/ED_2/v4.1.3.json`.

The line 4283 of the contract block still says that the state is "paused" after a Pause. The line 4282 still lists the old event names. Both lines sit in a code block, and the brief of DZ79 did not name them. They stay as old text.

##### 15.33.8 Phase 2 on the Monitor dashboard (answers 22 to 24)

The Translator side is in `translator-design.md`, section 9.31.6. Phase 2 is one run on the 40 `train-feedback` articles (round 81 answers 12 to 14, section 15.34.4). The order of `articles.jsonl` forms year blocks from 2019 to 2025 with 1, 9, 7, 7, 5, 6, and 5 articles. Old text: phase 2 ran on the web articles in year blocks `[unit default DZ79]`. A page is one A4 part of an article. The update point check runs after the last part of each article. The articles run in the order of `articles.jsonl`. One pass, then the owner decides.

Today the Monitor dashboard shows one closed line below Not started: "Phase 2 (paired dataset): no run record yet." (line 3989). The Translator has no phase 2 run command, so no record exists.

Open item 2 in section 15.33.12 asks for the row shape. The options:

- Option A: one row for the phase 2 run. The row shows the year block and the article, for example "Phase 2 (paired dataset): Running. Article 4 of 40 (year block 2020). Page 17 of 144 pages." Benefit: it fits one run in one store folder. Cost: a year change is a text change in the row. The values of the example are invented. Option A fits the one run of round 81 answers 12 to 14 `[agent inference]`.
- Option B: one row for each year block, 7 rows. Benefit: each year has its own state. Cost: the screen gets 7 phase 2 rows. History: it does not fit one run (round 81 answers 12 to 14). No year runs exist in phase 2.

Old text, replaced in round 81: no recommendation stood on its own `[agent inference]`. The choice follows open item 4 in `translator-design.md`, section 9.31.9 (one run or one run for each year). Round 81 answers 12 to 14 pick one run, so option A fits `[reading pending owner check]` (section 15.34.4).

##### 15.33.9 `tanden_full` on the Reader dashboard (answers 3 to 7)

The join is data work. This file holds no design for it. Unit TJ80 plans it. The effect on the Reader dashboard `/read` and the book screen `/read/tanden_full` follows `[agent inference]`. It holds until the join unit runs. Round 81 answers 3 to 11 (`qa-memory-2026-11-02.md:8-16`) approve the plan of TJ80 and order unit TJ81 to run the join (section 15.34.3). Round 82: TJ81 ran the join, and the owner accepted the result (section 15.35.4).

- The book `tanden_full` grows from 276 to 295 pages (`translator-design.md`, section 9.31.2). Round 81 answer 4 (`qa-memory-2026-11-02.md:9`) orders the join. The count 295 holds after TJ81 and the PocketBase sync. Round 82: the book screen `/read/tanden_full` reads "AI translation: 0 of 295 pages." `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.
- The book screen `/read/tanden_full` lists 295 pages. The 19 new pages are p111 to p129. The old p111 to p276 become p130 to p295.
- The Reader dashboard total grows by 19 pages, from 14,116 to 14,135 pages. The works count stays 342. The line now reads "English: 1,124 of 14,116 pages translated (8.0 percent)" `[file: .opencode/reminders/plan/evolving-plan-2026-11-01.md:6]`. After the join it reads "1,124 of 14,135 pages translated (8.0 percent)", because 1,124 of 14,135 is 7.95 percent. Round 82: the Reader dashboard `/read` reads "342 works, 14,135 pages. English: 1,124 of 14,135 pages translated (8.0 percent)" after the join `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.
- The 19 new pages are not translated. They add to the total and not to the translated count. Round 81 answer 5 (`qa-memory-2026-11-02.md:10`): each new page has a text file with only the header line. They hold no English text. Round 82: the pages p111 and p129 show 0 text rows `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.

The word is "translated" on the Reader dashboard (round 70 answer 3). The Monitor dashboard says "pages done".

##### 15.33.10 Lines of this file that round 80 replaced

Each row is one line of this file that the unit changed in place. The line numbers are the same before and after the edit, because the unit changed no line count above the end of the file.

| Line | Old text in short | New text in short | Source |
|---|---|---|---|
| 3939 | TB71 still writes `paused` | TR77c writes `stopped`, reason `pause` | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 3989 | no run record yet | pointer to 15.33.8 | round 80 answers 22 to 24, qa-memory-2026-11-01.md:144,145,146 |
| 4003 | a button is disabled with a reason | answer 13 appended | round 80 answer 13, qa-memory-2026-11-01.md:135 |
| 4007 | local time with the zone name | PST all year | round 80 answer 19, qa-memory-2026-11-01.md:141 |
| 4010 | header time in PDT | PST note appended | round 80 answer 19, qa-memory-2026-11-01.md:141 |
| 4030 | start and end in local time | start and end in PST | round 80 answer 19, qa-memory-2026-11-01.md:141 |
| 4270 | state list holds `paused` | state list as in store.py:33 | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 4271 | stop reasons without pause and restart | stop reasons as in store.py:35 | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 4280 | key list lacks run_id | key list holds started_utc and run_id | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 4331 | local time with the zone name | PST all year | round 80 answer 19, qa-memory-2026-11-01.md:141 |
| 5628 | Run button, no note for a Running row | grayed out on a Running row | round 80 answer 13, qa-memory-2026-11-01.md:135 |
| 5630 | Resume button, no note for a Running row | grayed out on a Running row | round 80 answer 13, qa-memory-2026-11-01.md:135 |
| 6001 | Running row buttons: Pause, Restart, Details | Run and Resume grayed out | round 80 answer 13, qa-memory-2026-11-01.md:135 |
| 6015 | contract still shows `paused` | lines 4270, 4271, 4280 changed | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 6208 | buttons before the press | Run and Resume grayed out | round 80 answer 13, qa-memory-2026-11-01.md:135 |
| 6420 | key `after` and press time: unit default of TR77c | answer 14 rule | round 80 answer 14, qa-memory-2026-11-01.md:136 |
| 6489 | no design for phase 2 and tanden | pointer to 15.33.8 and 15.33.9 | round 80 answers 3 to 7 and 22 to 24, qa-memory-2026-11-01.md:125,126,127,128,129,144,145,146 |
| 6560 | meaning in run 2 or later is open | decided: the phase start | round 80 answer 17, qa-memory-2026-11-01.md:139 |
| 6575 | key names: unit default of TR77c | answer 14 decides them | round 80 answer 14, qa-memory-2026-11-01.md:136 |
| 6599 | TR77c builds the code | built, anchors appended | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 6615 | does No buttons include the link Details | answer appended | round 80 answer 18, qa-memory-2026-11-01.md:140 |
| 6691 | open item a | answer appended | round 80 answer 16, qa-memory-2026-11-01.md:138 |
| 6692 | open item b, recommended option 1 | answer appended, option 2 chosen | round 80 answer 17, qa-memory-2026-11-01.md:139 |
| 6693 | open item c | answer appended | round 80 answer 18, qa-memory-2026-11-01.md:140 |
| 6694 | open item d, recommended keep local time | answer appended, option 2 chosen | round 80 answer 19, qa-memory-2026-11-01.md:141 |
| 6695 | open item e | answer appended | round 80 answer 20, qa-memory-2026-11-01.md:142 |
| 6700 | TR77c is not built | TR77c is built | TR77c commit 2f07ce9, round 80 answer 2, qa-memory-2026-11-01.md:124 |
| 6703 | phase 2 and tanden have no design | pointer to 9.31.6 and 15.33.9 | round 80 answers 22 to 24, qa-memory-2026-11-01.md:144,145,146 |

Lines that stay as history or inside a code block, checked by the unit:

- Line 3857: local PDT times of real list data, not a rule.
- Line 4282: code block (folder tree) with the old event names. Round 80 answer 21 keeps it.
- Line 4283: code block line that says the state is "paused" after a Pause. The brief did not name it.
- Line 4293: the old text of the mark keys. Round 80 answer 21 keeps it.
- Lines 4130 to 4196: sketches with PDT times of real list data in a code block.
- Line 4153: the sketch line "Phase 2 (paired dataset): no run record yet." in a code block.
- Lines 6370 and 6372: text with Pacific time. Section 15.32 already marks them.
- Lines 6567 and 6574: the mark of the Monitor with `requested_utc` in UTC. They stay true.

##### 15.33.11 Unit defaults of DZ79 and accepted defaults of DZ78

Answer 21 (`qa-memory-2026-11-01.md:143`) accepts all 9 DZ78 docs defaults. They are in section 15.32.9 and in `translator-design.md`, section 9.30.11.

The unit defaults of DZ79 follow. No owner answer settles them.

1. `[unit default DZ79]` A Running row shows Run and Resume as grayed buttons with a reason in words. Example: the row of `mental_full` shows "Resume is off because this book runs now". Other option: the row hides both buttons. Section 15.29.2 lists only Pause, Restart, and Details for a Running row. Benefit of the default: it matches the words "gray out the buttons" of answer 13. Cost: two more controls on each Running row. While a Restart waits, the row shows no buttons at all (round 79 answer 13). Accepted in round 81 answer 26 (`qa-memory-2026-11-02.md:31`).
2. `[unit default DZ79]` The tooltip and the detail view keep the UTC stamp of the file. The visible time shows PST. Example: the row reads "Restart requested 15:40 PST" and the tooltip reads "2026-07-10T23:40:00Z". Other option: the tooltip shows PST too. Benefit of the default: the tooltip shows the raw value of the file. Cost: two zones in one place. Accepted in round 81 answer 26 (`qa-memory-2026-11-02.md:31`).
3. `[unit default DZ79]` Until the owner answers open item a of `translator-design.md`, section 9.31.6, the docs describe the year blocks of phase 2 as 2019 to 2025. Example: the first block holds 14 articles. Other option: leave all examples of phase 2 open. Benefit of the default: the examples use real counts. Cost: the examples change if the owner picks another reading of "kendojidai-2018". Accepted in round 81 answer 26 (`qa-memory-2026-11-02.md:31`). Round 81 answers 12 to 14 narrow it: the years stay only as the order of the one phase 2 run (section 15.34.4).
4. `[unit default DZ79]` The Run mark of the future code keeps the key order of today without the key `restart_requested_utc`: schema, book, action, phase, after, requested_utc, requested_by. Other option: write `after` last. Benefit of the default: the order is the same as today. Cost: none beyond the code change. Accepted in round 81 answer 26 (`qa-memory-2026-11-02.md:31`). Built in TR77c2 (round 81). The key order is schema, book, action, phase, [prompts], [after], requested_utc, requested_by `[aki-main report in the brief of DZ81]`.

##### 15.33.12 Open items for the owner

1. The group of a refused Restart on the Monitor dashboard `/` (section 15.33.4). Recommended: the row keeps its group and shows the refusal as a second line. Reason: answer 10 says "book state stays". Example: `mental_full` stays in the group Stopped and shows "Restart refused: ED_2 v4.1.3 has no file". Benefit: the group matches the book state. Cost: the mark stays in `request.json`, so the rule "a mark waits while `request.json` exists" must skip a refused mark. The Viewer can find it from the newest event `restart-refused` `[agent inference]`. Other option: the group Needs attention. Benefit: you see the refusal at once. Cost: the group does not match the book state. Answered in round 81 answer 15 (`qa-memory-2026-11-02.md:20`): "Same group, second line (Recommended)" (section 15.34.5).
2. The row of phase 2 on the Monitor dashboard `/` (section 15.33.8). Recommended: follow open item 4 of `translator-design.md`, section 9.31.9. One run gives option A, one row. One run for each year gives option B, 7 rows. Reason: the row shape follows the run shape. Example: with one run, the row reads "Phase 2 (paired dataset): Running. Block 2020, article 3 of 9." Answered in part by round 81 answers 12 to 14: one run, so option A fits `[reading pending owner check]` (section 15.34.4).
3. The time zone on the Reader dashboard `/read`. Answer 19 names the Monitor dashboard only. Recommended: keep the Reader dashboard as it is. Reason: the owner asked for PST on the Monitor dashboard, and readers use their own clock `[agent inference]`. Benefit: no change to reader screens. Cost: the two dashboards show two zones. Other option: PST on both dashboards. Benefit: one zone. Cost: a reader far from the Pacific coast reads a foreign zone. Answered in round 81 answers 17 and 18 (`qa-memory-2026-11-02.md:22,23`): PST on the Reader dashboard too. This replaces the recommendation above (section 15.34.6).
4. The items 2 to 8 of `translator-design.md`, section 9.31.9, ask about phase 2, the table of contents of `tanden_full`, and the events of a refused Restart. They have no Viewer part. Answered in round 81 answers 3 to 16 and 29. See `translator-design.md`, section 9.32.12 for the new open items.

##### 15.33.13 Not verified

- No code ran in this unit. The Monitor dashboard code for the PST times, the grayed buttons, the refused row, and the phase 2 row is not built. Round 81: units VW77b1 and TR77c2 build parts of this. Their results are Not verified at the write time of DZ80. Round 82: aki-main checked the results (section 15.35.3).
- The reading of answer 13 and the reading of answer 19 wait for the owner (`qa-memory-2026-11-01.md:152,156`). The reading of answer 17 waits too (`qa-memory-2026-11-01.md:155`). Round 81 answers 19 and 20 (`qa-memory-2026-11-02.md:24,25`) confirm the readings of answers 13 and 17. Round 81 answers 17 and 18 extend the PST reading of answer 19.
- The effect of the join on the Reader dashboard (section 15.33.9) is an inference. No unit ran the join.
- The names of the units VW77a and VW77b and their roles come from the brief of DZ79. Unit DZ79 did not check them against another source.
- The dev server on port 3000 and the PocketBase on port 8090 were not read or changed.

Status: round 80 answers applied by unit DZ79. Items in section 15.33.12 wait for the owner.

#### 15.34 Round 81 answers: Monitor dashboard details, refused Restart row, PST on every screen, phase 2 and the year books, tanden pages (unit DZ80, round 81)

Unit DZ80 wrote this section on 2026-11-02 (round 81). It records the owner answers of round 81. The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-02.md`. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.32. This section has the Viewer weight. This unit changed docs only. It ran no code.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`): "All these are pilots, which DO NOT COUNT toward real runs". All values in the examples are invented, except where a line gives a source.

Screen names in this section: the Monitor dashboard `/`, the Lists tab `/runs`, the run view `/runs/<stamp>`, the Reader dashboard `/read`, and the book screen `/read/<slug>`. The Reader dashboard says "translated". The Monitor dashboard says "pages done".

Source tags: an owner sentence carries the Q-A file and the line. A design sentence without owner words carries `[unit default DZ80]`, `[aki-main proposal]`, or `[agent inference]`.

##### 15.34.1 Sources and scope

- The Q-A file has 46 lines. Answer N sits at line 5+N, so the answers fill the lines 6 to 39. The notes of aki-main at the lines 40 to 46 are not owner words `[check: DZ80 2026-11-02 07:15 Read of qa-memory-2026-11-02.md]`.
- Answers 1 and 2 (`qa-memory-2026-11-02.md:6,7`): "Accept and commit (Recommended)" for the DZ79 docs and the VW77a Monitor read side. The commits are a4d1314, f27a50c, 0440eb1, and 569ca7f `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:11]`. `git log --oneline -1` shows 0440eb1 in <V2> `[check: DZ80 2026-11-02 07:15 git log --oneline -1 in <V2>]`.
- Five other units of round 81 run in parallel with this unit: TJ81 (tanden join), TR77c2 (small Translator code change), VW77b1 (Viewer buttons and screens), CE81 (cost file), and TV81 (table of contents check) `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:14]`. Their results are Not verified at the write time of this unit. Round 82: aki-main checked the results (section 15.35.3).
- Section 15.34.2 holds the owner words. Section 15.34.3 holds answers 3 to 11. Section 15.34.4 holds answers 12 to 14. Section 15.34.5 holds answers 15 and 16. Section 15.34.6 holds answers 17 and 18. Section 15.34.7 holds answers 19 to 24. Section 15.34.8 holds answers 25 and 26. Section 15.34.9 holds answers 27 to 34.

##### 15.34.2 Owner words of round 81

The list below holds all 34 answers. A script copied each text after the number from the Q-A file and added the line number. The text of answer 33 says that the owner gave no answer.

- Answer 1 (line 6): Accept DZ79 docs (design 9.31, VISION 15.33): "Accept and commit (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 2 (line 7): Accept VW77a Monitor dashboard code (read side, 9 changed and 9 new app files): "Accept and commit (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 3 (line 8): TJ80 tanden join plan (dry run 1,148 steps, 0 problems): "Plan is right (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 4 (line 9): DANGER run the tanden join unit TJ81 now (options: Not now / Run TJ81 now, all steps / Run TJ81, PocketBase later): "Run TJ81 now, all steps" [user chose destructive option 2 2026-11-02 06:53]
- Answer 5 (line 10): Text files for the 19 new tanden pages: "Empty file with header" [accepted option 2 2026-11-02 06:53]
- Answer 6 (line 11): Page size of the 19 new page PDFs: "Fit to A4 (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 7 (line 12): Three old BP PDFs and the whole-book PDF: "Leave them (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 8 (line 13): Old history files with p273 to p276: "Leave them (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 9 (line 14): Pilot cache files of tanden_full: "Leave them (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 10 (line 15): Upload of tanden page images to the server: "After the join (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 11 (line 16): Stray "Page 101" block in page_111.md: "Remove it, copy kept (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 12 (line 17): Meaning of "kendojidai-2018" in round 80 answer 22: "All kendojidai books (2010 to 2025). Also I am talking about phase 3 and 4\nFor phase 2, we are running using the train-feedback dataset as planned (40 article)" [user 2026-11-02 06:53]
- Answer 13 (line 18): Which web articles phase 2 translates: "Only 40 train-feedback (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 14 (line 19): One phase 2 run per year or one run with year blocks: "You are confused. check previous answer" [user 2026-11-02 06:53]
- Answer 15 (line 20): Refused Restart row on the Monitor dashboard: "Same group, second line (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 16 (line 21): Fields of history event `restart-refused`: "Reason and press time (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 17 (line 22): Time zone on Lists tab /runs and run view: "PST there too (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 18 (line 23): Time zone on Reader dashboard /read and book screens /read/<slug>: "PST there too" [accepted option 2 2026-11-02 06:53]
- Answer 19 (line 24): Reading of round 80 answer 13 (grayed Run and Resume with reason on a Running row, code fallback stays): "Reading is right (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 20 (line 25): Reading of round 80 answer 17 ("Starting versions" = phase start versions, ED_2 v4.1.0): "Reading is right (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 21 (line 26): "1 error" at the end of the Monitor summary line: "Drop it (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 22 (line 27): "Phase not stored" on pilot rows: "Empty cell (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 23 (line 28): Pause-request label: "Running with pause requested (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 24 (line 29): Monitor refresh rule: "Every 3 s in a visible tab (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 25 (line 30): Other VW77a defaults (multi-select, all 12 ticked): "No Run settings tab yet (Recommended), No Details link yet (Recommended), "pilot list" tag (Recommended), Times end with PST (Recommended), Mark symbols ◇ and ? (Recommended), Note for a mark on Running (Recommended), Pilot failure is Stopped by failure (Recommended), Long-call warning on pilot rows (Recommended), Screen reader count line (Recommended), "No run found" text (Recommended), Fallback row texts (Recommended), Data error answers 200 (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 26 (line 31): DZ79 docs defaults (multi-select, all 4 ticked): "Grayed buttons with reason (Recommended), UTC in the tooltip (Recommended), Phase 2 examples 2019 to 2025 (Recommended), Run mark key order kept (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 27 (line 32): Dev server restart: "aki-main restarts it once" [accepted option 3 2026-11-02 06:53]
- Answer 28 (line 33): ToC review of 100_practice_full, eiga_full, men_full: "Read-only unit, aki-main spot-checks (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 29 (line 34): Next units (multi-select): "DZ80 docs (Recommended), TR77c2 small code (Recommended), VW77b1 buttons (Recommended), TV81 ToC check (Recommended), Cost file update to N = 5" [user 2026-11-02 06:53] (TR77d1 not ticked)
- Answer 30 (line 35): Commit plan: "Separate code and docs commits (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 31 (line 36): Unit rule breaks: "Add an after-return check (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 32 (line 37): Housekeeping (multi-select): "Use the 2026-11-02 files (Recommended), Fix the old tanden guess (Recommended)" [accepted recommendation 2026-11-02 06:53]
- Answer 33 (line 38): Other wishes: unanswered [user 2026-11-02 06:53]
- Answer 34 (line 39): Session control: "Run the plan (Recommended)" [accepted recommendation 2026-11-02 06:53]

##### 15.34.3 `tanden_full` on the Reader dashboard (answers 3 to 11)

The data work is in `translator-design.md`, section 9.32.3. This part gives the Viewer effect.

- Answer 4 (`qa-memory-2026-11-02.md:9`): "Run TJ81 now, all steps". Unit TJ81 joins the 19 new pages after p110. The new pages are p111 to p129. The old p111 to p276 become p130 to p295. The book has 295 pages.
- Answer 5 (`qa-memory-2026-11-02.md:10`): "Empty file with header". Each new page has a text file with only the header line, from `Page 111` to `Page 129`. The 38 md files sit in `<BP>/Tanden Full/pages/` and `<V2>/data/v1-md/tanden_full/`. No `triplet.json` key exists for them `[file: .opencode/reminders/qa/qa-memory-2026-11-02.md:43]` `[reading confirmed in round 82 answer 2, qa-memory-2026-11-02.md:51]`.
- Answer 6 (`qa-memory-2026-11-02.md:11`): "Fit to A4 (Recommended)". The 19 page PDFs have 595 x 842 pt.
- Answer 10 (`qa-memory-2026-11-02.md:15`): "After the join (Recommended)". The upload of the page images to the server comes after the join (owner hand step 8.10a `[aki-main proposal in the brief of DZ80, not checked by DZ80]`).
- aki-main runs the PocketBase sync of `catalog_items` (276 to 295 pages) after TJ81 `[file: .opencode/reminders/qa/qa-memory-2026-11-02.md:44]`. Done: the backup and the sync ran in round 81 `[check: aki-main 2026-11-02 07:52 sync-runs.mjs dry run, --apply, second dry run]`.

Chapter starts after the join: ch12 at p111, ch13 at p118, ch14 at p121, ch15 at p130, and ch28 at p286 `[file: /var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r80/TJ80/toc-rows.tsv:14-17,31]`.

Effect on the screens `[agent inference]`:

- The book screen `/read/tanden_full` lists 295 pages. Example: p111 shows the header `Page 111` and no English text.
- The Reader dashboard `/read` total grows from 14,116 to 14,135 pages. The works count stays 342. Checked in round 82: the Reader dashboard `/read` reads "342 works, 14,135 pages." `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.
- The 19 new pages count as not translated. Old Gemini v1 text counts as nothing translated, and the new pages hold no text of that kind.
- The line "English: 1,124 of 14,116 pages translated (8.0 percent)" reads "English: 1,124 of 14,135 pages translated (8.0 percent)" after the join and the sync. The result 7.95 percent rounds to 8.0. Checked in round 82: the line reads "English: 1,124 of 14,135 pages translated (8.0 percent)" `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.

Round 82: aki-main checked the result of TJ81 (section 15.35.3). The Reader dashboard showed the new total after the PocketBase sync.

##### 15.34.4 Phase 2 and the year books (answers 12 to 14)

Owner words:

- Answer 12 (`qa-memory-2026-11-02.md:17`): "All kendojidai books (2010 to 2025). Also I am talking about phase 3 and 4\nFor phase 2, we are running using the train-feedback dataset as planned (40 article)" `[user 2026-11-02 06:53]`.
- Answer 13 (`qa-memory-2026-11-02.md:18`): "Only 40 train-feedback (Recommended)".
- Answer 14 (`qa-memory-2026-11-02.md:19`): "You are confused. check previous answer" `[user 2026-11-02 06:53]`.
- Round 80 answer 22 (`qa-memory-2026-11-01.md:144`): "option 1. Note that we are translating the web articles in book-wise yearly order, not article-wise.\nMeaning 1 full run of kendojidai-2018, 1 full run of kendojidai-2019 etc".
- Older words: "Each year is one book, with each month is on chapter consists of all articles in that month" (`qa-memory-2026-10-26.md:168`) and "option 1. The 311 web articles ARE kendojidai 2019 to 2025 right?" (`qa-memory-2026-10-29.md:120`).

Reading of aki-main `[reading confirmed in round 82 answer 19, qa-memory-2026-11-02.md:68]` (`qa-memory-2026-11-02.md:41,42`):

1. Phase 2 is one run on the 40 `train-feedback` articles, in the store folder `data/book-store/paired-dataset/`.
2. The articles run in the order of `articles.jsonl`. That order forms year blocks from 2019 to 2025 with 1, 9, 7, 7, 5, 6, and 5 articles. The blocks are an order fact and not separate runs.
3. Each A4 part is one page. The update point check comes after the last part of each article. N = 5 refers to one box with 5 critiques. One pass, then aki-main decides.
4. The year runs of round 80 answer 22 belong to phases 3 and 4. Each Kendo Jidai year from 2010 to 2025 is one book. The name "kendojidai-2018" means the scanned volume `kendojidai_2018`.

Facts `[check: DZ80 2026-11-02 07:19 python3 -B count of articles.jsonl in <T2>]`: the file has 311 rows, 244 `train-retrieval`, 40 `train-feedback`, and 27 `test` articles. The 2019 year has 14 articles, and 1 is `train-feedback`.

Effect on the Monitor dashboard `/`. The line below Not started reads "Phase 2 (paired dataset): no run record yet." (line 3989). No phase 2 run command exists, because the run-book parser accepts only `agent-phase-3` and `agent-phase-4` `[file: <T2>/data/scripts/translator_run.py:8259]`. A row for phase 2 shows one run. Option A of section 15.33.8 fits `[agent inference]`. Example (invented values): "Phase 2 (paired dataset): Running. Article 4 of 40 (year block 2020). Page 17 of 144 pages." Option B, 7 rows, does not fit one run. Round 82 answer 18 keeps this example (`qa-memory-2026-11-02.md:67`).

The year books of phases 3 and 4 show as books on the Monitor dashboard `/`, like `mental_full`. The book ID of a web year book is `kendojidai_2019` to `kendojidai_2025` (round 82 answer 22, `qa-memory-2026-11-02.md:71`).

##### 15.34.5 Row of a refused Restart (answers 15 and 16)

Owner words:

- Answer 15 (`qa-memory-2026-11-02.md:20`): "Same group, second line (Recommended)".
- Answer 16 (`qa-memory-2026-11-02.md:21`): "Reason and press time (Recommended)".

Rules:

1. The row on the Monitor dashboard `/` keeps the group of its own state. Example: `mental_full` stays in the group Stopped.
2. The row shows a second line: "Restart refused: ED_2 v4.1.3 has no file".
3. The Translator writes the history event `restart-refused` with the keys `reason` and `requested_utc`. The key `requested_utc` is the press time of the refused Restart mark.
4. The Viewer pairs the event with `request.json` by `requested_utc`.
5. A running book with a failed check also writes the event and stops with the reason `rule` `[aki-main proposal, unit TR77c2]`.

Example with `mental_full` (invented values). You press Restart at 09:30 UTC. The Restart mark in `request.json`:

```
{"schema": "book-request-v1", "book": "mental_full", "action": "restart", "phase": "agent-phase-4", "prompts": {"ED_2": "v4.1.3"}, "requested_utc": "2026-11-05T09:30:00Z", "requested_by": "Monitor dashboard"}
```

The map `prompts` shows 1 box of 16. The event in `history.jsonl` (the text of `reason` is an example):

```
{"utc": "2026-11-05T09:31:02Z", "event": "restart-refused", "reason": "restart mark: box ED_2 has the label v4.1.3, but no file ...", "requested_utc": "2026-11-05T09:30:00Z"}
```

Both lines have `requested_utc` equal to "2026-11-05T09:30:00Z". So the row shows the second line. The rule "a mark waits while `request.json` exists" must skip a refused mark `[agent inference]`. If `request.json` is gone, or holds another `requested_utc`, the second line goes away `[unit default DZ80]`.

Unit TR77c2 builds the event in round 81. Unit VW77b1 builds the second line. Round 82: the owner accepted both (answers 4 and 8, sections 15.35.5 and 15.35.6). Open item 1 of section 15.33.12 is answered.

The lines 6771 to 6783 (section 15.33.4) now carry a pointer to this section.

##### 15.34.6 PST on every screen (answers 17 and 18)

Owner words:

- Answer 17 (`qa-memory-2026-11-02.md:22`): "PST there too (Recommended)". The question was about the Lists tab `/runs` and the run view `/runs/<stamp>`.
- Answer 18 (`qa-memory-2026-11-02.md:23`): "PST there too". The owner chose option 2 `[accepted option 2 2026-11-02 06:53]`. The question was about the Reader dashboard `/read` and the book screens `/read/<slug>`.

Rule. Every time on these five screens shows PST (UTC-8 all year):

| Screen | Path |
|---|---|
| Monitor dashboard | `/` |
| Lists tab | `/runs` |
| Run view | `/runs/<stamp>` |
| Reader dashboard | `/read` |
| Book screen | `/read/<slug>` |

Example. The list stamp `2026-10-29T07:50:00Z` shows "2026-10-28 23:50 PST". The date changes to the day before, because 07:50 minus 8 hours is 23:50 of the day before.

Which times the Reader screens show is Not verified (`qa-memory-2026-11-02.md:45`). The helper `dateTime` in `app/lib/format.ts` shows the time of the browser without a zone name `[file: app/lib/format.ts:8-13]` (line 3832 of this file). The helper must change. Unit VW77b1 builds this change `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:14]`. The result is Not verified. Round 82: VW77b1 built PST helpers in `lib/pst-more.ts`, and the owner accepted them in answer 8. Whether the helper `dateTime` itself changed is Not verified.

The sketches of section 15.24 show PDT times of real list data in code blocks. They stay as old examples (section 15.34.10).

Open item 3 in section 15.33.12 is answered. Line 4007 of this file carries the extension.

##### 15.34.7 Monitor dashboard details (answers 19 to 24)

- Answer 19 (`qa-memory-2026-11-02.md:24`): "Reading is right (Recommended)". Run and Resume are grayed on a Running row, with a reason in words. The Translator keeps its fallback. Example: the row of `mental_full` at p080 shows [Pause] [Restart] [Details], and the grayed [Run] and [Resume] with the reason "Resume is off because this book runs now". The tag `[reading pending owner check]` is removed from section 15.33.3.
- Answer 20 (`qa-memory-2026-11-02.md:25`): "Reading is right (Recommended)". The quick select row "Starting versions" means the start versions of the phase, also in run 2 or later. Example: ED_2 `v4.1.0`. The tag is removed from section 15.33.6.
- Answer 21 (`qa-memory-2026-11-02.md:26`): "Drop it (Recommended)". The summary line has no "1 error" at the end. Example: the real summary text ended with "25 not started · 1 error" `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:6]`. It now ends with "25 not started". Line 3951 changed. The sketch line 4147 sits in a code block and stays (section 15.34.10).
- Answer 22 (`qa-memory-2026-11-02.md:27`): "Empty cell (Recommended)". A pilot row shows an empty phase cell. Example: the pilot row of `kendojidai_2014` has no text between the title and "6 of 1051 pages". Line 3964 changed. The sketch lines 4134, 4141, 4143, 4146, and 4176 sit in code blocks and stay.
- Answer 23 (`qa-memory-2026-11-02.md:28`): "Running with pause requested (Recommended)". The old label was "Running, pause requested". Lines 3927, 3938, 3939, and 6012 changed. Line 6148 is a history line of round 77 and stays with a note.
- Answer 24 (`qa-memory-2026-11-02.md:29`): "Every 3 s in a visible tab (Recommended)". Line 4009 (section 15.24.4.6) changed. The page polls every 3000 ms while the tab is visible and stops while the tab is hidden.

##### 15.34.8 Defaults kept (answers 25 and 26)

Answer 25 (`qa-memory-2026-11-02.md:30`): "Other VW77a defaults (multi-select, all 12 ticked): "No Run settings tab yet (Recommended), No Details link yet (Recommended), "pilot list" tag (Recommended), Times end with PST (Recommended), Mark symbols ◇ and ? (Recommended), Note for a mark on Running (Recommended), Pilot failure is Stopped by failure (Recommended), Long-call warning on pilot rows (Recommended), Screen reader count line (Recommended), "No run found" text (Recommended), Fallback row texts (Recommended), Data error answers 200 (Recommended)" [accepted recommendation 2026-11-02 06:53]".

Answer 26 (`qa-memory-2026-11-02.md:31`): "DZ79 docs defaults (multi-select, all 4 ticked): "Grayed buttons with reason (Recommended), UTC in the tooltip (Recommended), Phase 2 examples 2019 to 2025 (Recommended), Run mark key order kept (Recommended)" [accepted recommendation 2026-11-02 06:53]".

The 12 VW77a defaults by name:

1. No Run settings tab yet.
2. No Details link yet.
3. "pilot list" tag.
4. Times end with PST.
5. Mark symbols ◇ and ?.
6. Note for a mark on Running.
7. Pilot failure is Stopped by failure.
8. Long-call warning on pilot rows.
9. Screen reader count line.
10. "No run found" text.
11. Fallback row texts.
12. Data error answers 200.

The four DZ79 defaults by name (section 15.33.11, items 1 to 4):

1. Grayed buttons with reason.
2. UTC in the tooltip. Example: the row reads "Restart requested 15:40 PST" and the tooltip reads "2026-07-10T23:40:00Z".
3. Phase 2 examples 2019 to 2025. Round 81 answers 12 to 14 narrow this default. The years stay only as the order of the one phase 2 run (section 15.34.4).
4. Run mark key order kept.

The full text of the 12 VW77a defaults is in the VW77a report. Unit DZ80 did not open that report.

##### 15.34.9 Process answers (answers 27 to 34)

- Answer 27 (`qa-memory-2026-11-02.md:32`): "aki-main restarts it once". aki-main restarts `next dev` on port 3000 once, at the end of the round.
- Answer 28 (`qa-memory-2026-11-02.md:33`): "Read-only unit, aki-main spot-checks (Recommended)". Unit TV81 reads the tables of contents of `100_practice_full`, `eiga_full`, and `men_full`. Round 82: the owner applied the rows (section 15.35.8).
- Answer 29 (`qa-memory-2026-11-02.md:34`): DZ80 docs, TR77c2 small code, VW77b1 buttons, TV81 ToC check, and the cost file update to N = 5. TR77d1 is not ticked.
- Answer 30 (`qa-memory-2026-11-02.md:35`): "Separate code and docs commits (Recommended)".
- Answer 31 (`qa-memory-2026-11-02.md:36`): "Add an after-return check (Recommended)".
- Answer 32 (`qa-memory-2026-11-02.md:37`): "Use the 2026-11-02 files (Recommended), Fix the old tanden guess (Recommended)".
- Answer 33 (`qa-memory-2026-11-02.md:38`): unanswered.
- Answer 34 (`qa-memory-2026-11-02.md:39`): "Run the plan (Recommended)".

##### 15.34.10 Lines of this file that round 81 replaced

Each row is one line of this file that the unit changed in place. The line numbers are the same before and after the edit. The unit changed no line count above the end of the file.

| Line | Old text in short | New text in short | Source |
|---|---|---|---|
| 3832 | browser time without a zone name | pointer to PST on all screens | round 81 answers 17 and 18, qa-memory-2026-11-02.md:22,23 |
| 3927 | label Running, pause requested | Running with pause requested | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 3927 | no note | rename note appended | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 3938 | label Running, pause requested | Running with pause requested | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 3939 | label Running, pause requested | Running with pause requested | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 3951 | counts it in the summary line as 1 error | summary line has no error count | round 81 answer 21, qa-memory-2026-11-02.md:26 |
| 3964 | Phase not stored | empty phase cell | round 81 answer 22, qa-memory-2026-11-02.md:27 |
| 4007 | PST on the Monitor dashboard | PST on all five screens | round 81 answers 17 and 18, qa-memory-2026-11-02.md:22,23 |
| 4009 | polls only while a row is live | polls every 3 s in a visible tab | round 81 answer 24, qa-memory-2026-11-02.md:29 |
| 4009 | no polling with no live row | polls with no live row too | round 81 answer 24, qa-memory-2026-11-02.md:29 |
| 4009 | unit default | round 81 answer 24 | round 81 answer 24, qa-memory-2026-11-02.md:29 |
| 6012 | label Running, pause requested | Running with pause requested | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 6148 | history line, old label | marked as history | round 81 answer 23, qa-memory-2026-11-02.md:28 |
| 6734 | PST on the Monitor dashboard | PST on all five screens | round 81 answers 17 and 18, qa-memory-2026-11-02.md:22,23 |
| 6750 | Reader dashboard not decided | PST on the Reader dashboard | round 81 answer 18, qa-memory-2026-11-02.md:23 |
| 6752 | unit VW77a builds this | unit VW77b1 builds the extension | round 81 plan, evolving-plan-2026-11-02.md:14 |
| 6756 | reading pending the owner | reading confirmed | round 81 answer 19, qa-memory-2026-11-02.md:24 |
| 6769 | unit VW77b builds the buttons | unit VW77b1 builds them | round 81 plan, evolving-plan-2026-11-02.md:14 |
| 6779 | Translator does not write the event | TR77c2 builds the event | round 81 answers 15 and 16, qa-memory-2026-11-02.md:20,21 |
| 6783 | group not designed | same group, second line | round 81 answer 15, qa-memory-2026-11-02.md:20 |
| 6802 | reading pending owner check | reading confirmed | round 81 answer 20, qa-memory-2026-11-02.md:25 |
| 6848 | event not written yet | TR77c2 builds the event | round 81 answer 16, qa-memory-2026-11-02.md:21 |
| 6856 | phase 2 in year blocks 2019 to 2025 | one run on 40 articles, year blocks are an order fact | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6862 | Block 2020, article 3 of 9 | Article 4 of 40 (year block 2020) | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6862 | option A | option A fits one run | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6863 | option B | marked as history | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6865 | no recommendation on its own | marked as old text | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6865 | if one run option A, if one run per year option B | one run, so option A | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6869 | unit TJ80 plans it | TJ81 runs the join | round 81 answers 3 to 11, qa-memory-2026-11-02.md:8,9,10,11,12,13,14,15,16 |
| 6871 | inference until the join runs | ordered in round 81 | round 81 answer 4, qa-memory-2026-11-02.md:9 |
| 6874 | 19 pages are not translated | header-only files, no English text | round 81 answer 5, qa-memory-2026-11-02.md:10 |
| 6930 | default 1 | accepted | round 81 answer 26, qa-memory-2026-11-02.md:31 |
| 6931 | default 2 | accepted | round 81 answer 26, qa-memory-2026-11-02.md:31 |
| 6932 | default 3, year blocks of phase 2 | accepted, narrowed to an order fact | round 81 answers 12 to 14 and 26, qa-memory-2026-11-02.md:17,18,19,31 |
| 6933 | default 4 | accepted | round 81 answer 26, qa-memory-2026-11-02.md:31 |
| 6937 | open item 1 | answered by answer 15 | round 81 answer 15, qa-memory-2026-11-02.md:20 |
| 6938 | open item 2 | answered in part | round 81 answers 12 to 14, qa-memory-2026-11-02.md:17,18,19 |
| 6939 | open item 3 | answered, PST chosen | round 81 answers 17 and 18, qa-memory-2026-11-02.md:22,23 |
| 6940 | open item 4 | answered, new items in 9.32.12 | round 81 answers 3 to 16 and 29, qa-memory-2026-11-02.md:8,17,18,19,20,21,34 |
| 6944 | code not built | VW77b1 and TR77c2 build parts | round 81 plan, evolving-plan-2026-11-02.md:14 |
| 6945 | readings wait | readings of 13 and 17 confirmed | round 81 answers 19 and 20, qa-memory-2026-11-02.md:24,25 |

Lines that stay as history or inside a code block, checked by the unit:

- Line 4147: the sketch line "Stopped at p089: the list ended with 1 error." in a code block. The real list data of October 2026 `[real]` stays. The summary line rule changed in line 3951 (answer 21).
- Lines 4134, 4141, 4143, and 4146: sketch rows with "Phase not stored" in a code block. They show the screen of October 2026. Since answer 22 the phase cell of a pilot row is empty.
- Line 4176: the sketch line with "Phase not stored" and the PDT time in a code block. It stays as an old example (answers 17 and 22).
- Line 6148: a history line of round 77 answer 9. It keeps the old label "Running, pause requested".
- The sketches of section 15.24 with PDT times stay as real list data.

##### 15.34.11 Unit defaults of DZ80

No owner answer settles these items.

1. `[unit default DZ80]` Rule: an old option text stays in the file as history. A note "Answered in round 81 answer N" ends its line. Example: the open items 1 to 4 of section 15.33.12 carry the note. Other option: delete the old text. Benefit: the owner can read why the options existed. Cost: the lines get longer. Accepted in round 82 answer 18 (`qa-memory-2026-11-02.md:67`).
2. `[unit default DZ80]` Rule: the Monitor dashboard polls every 3 seconds in a visible tab, also when no row is live. Example: with all books Not started, the tab still polls. Other option: poll only while a row is Running. Benefit: the Monitor dashboard shows a new mark at once. Cost: the Monitor dashboard calls the API in an idle state. Answer 24 does not say which reading is right. Accepted in round 82 answer 18 (`qa-memory-2026-11-02.md:67`).
3. `[unit default DZ80]` Rule: the second line of a refused Restart goes away when `request.json` is gone or holds another `requested_utc`. Example: you press Restart again at 09:40 UTC. Other option: keep the line until the next start. Benefit: the line matches the mark in the file. Cost: a refused line can vanish before you read it. Accepted in round 82 answer 18 (`qa-memory-2026-11-02.md:67`).
4. `[unit default DZ80]` Rule: PST on the Reader dashboard and the book screens covers every time that those screens show. Example: any saved-progress time on a book screen. Other option: PST on named fields only. Benefit: one rule for all screens. Cost: unit VW77b1 must find each time. Accepted in round 82 answer 18 (`qa-memory-2026-11-02.md:67`).
5. `[unit default DZ80]` Rule: the phase 2 row example uses option A of section 15.33.8 (one row). Example: "Article 4 of 40 (year block 2020)". Other option: leave the row shape open. Benefit: the example matches one run. Cost: the example changes if the owner picks 7 rows. Accepted in round 82 answer 18 (`qa-memory-2026-11-02.md:67`).

##### 15.34.12 Open items for the owner

The first option of each item is the recommended option. The items about the year books also appear in `translator-design.md`, section 9.32.12.

1. Confirm the reading of answers 12 to 14 (section 15.34.4). Recommended: yes `[aki-main proposal]`. Example: the Monitor dashboard shows one phase 2 row for the 40 articles, and the 16 year books show as books. Benefit: one reading for all docs. Cost: none. Other option: tell aki-main which part is wrong. Answered in round 82 answer 19 (`qa-memory-2026-11-02.md:68`): the reading is right.
2. Which articles the web year books hold. Recommended `[aki-main proposal]`: all articles of the year. Example: the 2019 book holds 14 articles, 1 `train-feedback` and 3 `test`. Benefit: the book is complete. Cost: the `test` articles run in the book `[agent inference]`. Other option: all articles except the 27 `test` articles. Example: the 2019 book holds 11 articles. Answered in round 82 answer 20 (`qa-memory-2026-11-02.md:69`): "Treating them like every other book" `[user]`. Option 1 is the reading of aki-main. Round 83 answer 5 (`qa-memory-2026-11-02.md:100`) confirms it: "Reading is right (Recommended)".
3. The book ID of a web year book. Recommended `[aki-main proposal]`: `kendojidai_2019`, the form of the scanned volumes. Benefit: one ID form for 16 books. Cost: none known. Other option: `kendojidai-2019`, the spelling in the owner words. Answered in round 82 answer 22 (`qa-memory-2026-11-02.md:71`): `kendojidai_2019`. The other option stays as history.
4. The run order of the 16 year books and the other books. Recommended `[aki-main proposal]`: year order 2010 to 2025, and then the other books. Benefit: one simple rule. Cost: books like `mental_full` wait. Other option: the other books first. Answered in round 82 answer 23 (`qa-memory-2026-11-02.md:72`): no fixed order. The owner presses Run per book on the Monitor dashboard `/`.
5. Which times the Reader dashboard and the book screens show (`qa-memory-2026-11-02.md:45`). Recommended: unit VW77b1 lists them in its report. Benefit: the PST rule has a full list. Cost: none. Answered in part in round 82: answer 15 sets the page check date, and answer 18 keeps PST on every Reader time (`qa-memory-2026-11-02.md:64,67`).

##### 15.34.13 Not verified

- Round 82: aki-main checked the results of TJ81, TR77c2, VW77b1, CE81, and TV81 (section 15.35.3). Unit DZ80 did not read them.
- Round 82: the counts 295 and 14,135 hold `[check: aki-main 2026-11-02 07:51 ls counts]` `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`. The count 38 is 19 pages in 2 folders and DZ81 did not count it.
- The Monitor code, the Reader code, and the helper `dateTime` were not read in this unit. No code ran.
- The readings of aki-main at `qa-memory-2026-11-02.md:41,42,43,45` wait for the owner. Round 82: the owner confirmed the readings at the lines 41 and 43 (answers 19 and 2). The reading at the line 45 stays Not verified for the full list of Reader times.
- Whether the Monitor dashboard polls with no live row is not stated in answer 24. Answer 18 of round 82 settles this: the Monitor dashboard polls also with no live row (`qa-memory-2026-11-02.md:67`).
- The dev server on port 3000 and PocketBase on port 8090 were not read or changed.

Status: round 81 answers applied by unit DZ80. The owner answered the items in section 15.34.12 in round 82 (section 15.35).

#### 15.35 Round 82 answers: tanden join accepted, Monitor dashboard buttons, refused Restart row, year books, cost base case, ToC rows (unit DZ81, round 82)

Unit DZ81 wrote this section on 2026-11-02 (round 82). It records the owner answers of round 82. The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-02.md`. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.33. This section has the Viewer weight. This unit changed docs only. It ran no code, no model call, and no Voyage call.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`): "All these are pilots, which DO NOT COUNT toward real runs". All values in the examples are invented, except where a line gives a source.

Screen names in this section: the Monitor dashboard `/`, the Lists tab `/runs`, and the run view `/runs/<stamp>`. The Reader screens are the Reader dashboard `/read` and the book screen `/read/<slug>`. The Reader dashboard says "translated". The Monitor dashboard says "pages done".

Source tags: an owner sentence carries the Q-A file and the line. A sentence without owner words carries `[unit default DZ81]`, `[aki-main proposal]`, or `[agent inference]`. A tag `[file: ...]` or `[check: ...]` gives the evidence. A tag `[aki-main report in the brief of DZ81]` marks a fact that DZ81 did not check.

In this section `<BP>` is `/Volumes/NghiaHDD2T/universal-agent_v2/book-postprocessing`. The folder `<PG>` is `/Volumes/NghiaHDD2T/universal-agent_v2/compiled_agents/gemini_kendo_book_translator/pages`. The folder `<TMP>` is `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode`.

##### 15.35.1 Sources and scope

- The Q-A file has 93 lines. The round 82 header sits at line 48. Answer N sits at line 49+N, so the answers fill the lines 50 to 86. The notes of aki-main at the lines 87 to 93 are not owner words `[check: DZ81 2026-11-02 12:13 Read of qa-memory-2026-11-02.md]`.
- The plan file is `.opencode/reminders/plan/evolving-plan-2026-11-02.md` (28 lines). Its line 22 sums up the answers. Its line 28 lists the five units of round 82.
- `git log --oneline -1` shows a370c11 in <T2> and 611b3f8 in <V2>. `git status --short` prints nothing in both repos `[check: DZ81 2026-11-02 12:13 git log --oneline -1 and git status --short in <T2> and <V2>]`.
- Four other units of round 82 run in parallel with this unit: TF82 (test numbers), VW77b2 (Restart dialog, Clear mark, page check date with PST), SV82 (read-only survey), and TV82 (ToC rows) `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:28]`. Their results are in section 15.36.3.
- This unit writes two docs: this file and `<T2>/docs/drafts/translator-design.md`.
- Section 15.35.2 holds the owner words. Section 15.35.3 holds the results of the round 81 units. Section 15.35.4 holds answers 1 to 3. Section 15.35.5 holds answers 4 to 7. Section 15.35.6 holds answers 8 to 16 and 18. Section 15.35.7 holds answers 25 to 27. Section 15.35.8 holds answers 28 to 32. Section 15.35.9 holds answers 19 to 24. Section 15.35.10 holds answers 17 and 33 to 37.

##### 15.35.2 Owner words of round 82

The list below holds all 37 answers. A script copied each text after the number from the Q-A file and added the line number. The text of answer 36 holds the owner reminder in full. The brackets at the end of each text are the source tags of the Q-A file.

- Answer 1 (line 50): TJ81 tanden join result: "Accept, keep the copy (Recommended)" [accepted recommendation]
- Answer 2 (line 51): Reading of round 81 answer 5 (38 header-only md files, no triplet key): "Reading is right (Recommended)" [accepted recommendation]
- Answer 3 (line 52): Stale ToC values (16 match fields, md_files 276): "Fix by the full rebuild (Recommended)" [accepted recommendation]
- Answer 4 (line 53): TR77c2 code: "Accept and commit (Recommended)" [accepted recommendation]
- Answer 5 (line 54): Refused Restart on a Not started book creates history.jsonl: "Keep, write the event (Recommended)" [accepted recommendation]
- Answer 6 (line 55): Repeated events on a stale Running book: "Leave as is (Recommended)" [accepted recommendation]
- Answer 7 (line 56): Other TR77c2 rules: "No event on bad press time (Recommended), Press time needs Restart (Recommended), No read of the old key (Recommended), Archive hint in reason (Recommended), Marks line keeps two times (Recommended), Event on running book too (Recommended)" [accepted all 6]
- Answer 8 (line 57): VW77b1 code: "Accept and commit (Recommended)" [accepted recommendation]
- Answer 9 (line 58): 9 old Viewer test lines: "Unit TF82 fixes them (Recommended)" [accepted recommendation]
- Answer 10 (line 59): Clear a refused mark: "Clear mark button in VW77b2 (Recommended)" [accepted recommendation]
- Answer 11 (line 60): Run grayed until phase 2 files: "Keep it grayed (Recommended)" [accepted recommendation]
- Answer 12 (line 61): Run on pilot rows: "Keep Run on pilot rows (Recommended)" [accepted recommendation]
- Answer 13 (line 62): Resume on Stopped by failure and Stopped unexpectedly: "Show Resume (Recommended)" [accepted recommendation]
- Answer 14 (line 63): Times on /translate and /admin: "PST in a later unit (Recommended)" [accepted recommendation]
- Answer 15 (line 64): Reading of round 81 answer 18 and zone word on the page check date: "Right, add PST" [accepted option 2]
- Answer 16 (line 65): Other VW77b1 rules: all 15 kept ("Pilot list reason", "No Resume for some stops", "Pause grayed when asked", "Waiting row reason", "Gray button form", "Run phase 4 dialog text", "Resume phase must match", "PAUSE file content", "Safe mark write", "Refused line is extra", "Pause stays on refused", "paired-dataset not a row", "Pause with Run/Resume mark", "Route names", "Helper file pst-more.ts") [accepted all 15]
- Answer 17 (line 66): DZ80 docs: "Accept and commit (Recommended)" [accepted recommendation]
- Answer 18 (line 67): DZ80 docs defaults: all 5 kept ("Old text stays as history", "Poll also with no live row", "Refused line goes away", "PST on all Reader times", "Phase 2 row example") [accepted all 5]
- Answer 19 (line 68): Reading of round 81 answers 12 to 14 (phase 2 one run on 40 train-feedback; 16 year books in phases 3 and 4): "Reading is right (Recommended)" [accepted recommendation]
- Answer 20 (line 69): Which web articles go into a web year book: "Treating them like every other book" [user]
- Answer 21 (line 70): Same-article retrieval rule: "No rule" [accepted option 2]
- Answer 22 (line 71): Year book ID: "kendojidai_2019 (Recommended)" [accepted recommendation]
- Answer 23 (line 72): Run order of year books and other books: "optoin 3. I will click the run button on the Monitor view myself" [user]
- Answer 24 (line 73): Fold 2019 9 vs 14: "Read-only survey SV82 (Recommended)" [accepted recommendation]
- Answer 25 (line 74): CE81 cost file: "Accept and commit (Recommended)" [accepted recommendation]
- Answer 26 (line 75): Cost base case: "Variant B in next cost unit (Recommended)" [accepted recommendation]
- Answer 27 (line 76): Next cost unit items: "Optimizer reads all groups (Recommended), Price the 16 year books (Recommended), Measure the critique rate (Recommended), Keep one pass as base (Recommended)" [accepted all 4]
- Answer 28 (line 77): Apply TV81 ToC rows: "Apply now (Recommended)" [accepted recommendation]
- Answer 29 (line 78): Front matter numbers of 100_practice_full: "No number (Recommended)" [accepted recommendation]
- Answer 30 (line 79): ToC misprints: "Page spelling (Recommended)" [accepted recommendation]
- Answer 31 (line 80): Other TV81 rules: all 6 kept ("Two levels", "Order by page", "Part with no number", "Repeated title own row", "Drop magazine notes", "東海大四高校時代 at p36") [accepted all 6]
- Answer 32 (line 81): Next ToC books: "Next 3 only" [accepted option 2]
- Answer 33 (line 82): Next units: "DZ81 docs (Recommended), TF82 test numbers (Recommended), VW77b2 Restart dialog (Recommended), SV82 read-only survey (Recommended), TV82 ToC rows (Recommended)" [TR77d1 not ticked]
- Answer 34 (line 83): Rule-break guards: "Keep briefs as they are" [accepted option 2]
- Answer 35 (line 84): Dev server place: "Keep it in the background (Recommended)" [accepted recommendation]
- Answer 36 (line 85): Other wishes: "Reminder: Also when you dispatch a subagent, include full detail within your message on not just the main task but also your writing/coding/thinking principle and so on. The initial dispatch message cost is negligible, so try to be as detailed as possible in your dispatch message\n\nThe question message cost is negligible, so try to be as `humanly reabable` as possible in your question message and your answers\n\n( include the information that you provide before these questions in the questions themself, so the questions are self-contained and I can refer to them without checking other place)\n\nTry being grounded to the project vision and context and references. Don't hallucinate as we continue this long session and multiple compression." [user]
- Answer 37 (line 86): Session control: "Run the plan (Recommended)" [accepted recommendation]

Notes of aki-main at the lines 88 to 93 of the Q-A file. They are not owner words. The note at the line 88 carries the mark `[aki-main reading, pending owner check]`, because the Q-A file says that the reading waits for the owner.

- Line 88 [aki-main reading, pending owner check]: Answer 20: a web year book (kendojidai_2019 to kendojidai_2025) holds every web article of its year, like every other book holds all its pages; the train-retrieval, train-feedback and test split does not remove articles from a year book (2019 book: 14 articles) [reading pending owner check].
- Line 89 [aki-main note]: Answer 21: no rule keeps the retriever from returning the human EN of the article in work; the owner accepts this.
- Line 90 [aki-main note]: Answer 23: no fixed run order; the owner presses Run per book on the Monitor dashboard.
- Line 91 [aki-main note]: Answer 15: the page check date on the Reader book screen reads "(2026-10-27 PST)"; a later Viewer unit adds the zone word.
- Line 92 [aki-main note]: Answer 32: TV82 covers etiqu1_full, kodass200_full, sumiss10_c1_full; sumiss_train_full and tani_ss_full wait.
- Line 93 [aki-main note]: Answer 34: briefs keep their rules; aki-main keeps the after-return checks.

##### 15.35.3 Results of the round 81 units

aki-main checked these results after the units returned and after the commits. Each fact carries its check tag. DZ81 did not repeat the checks and read no code.

- Open: the fold "Kendo Jidai 2019" on the Reader dashboard `/read` shows "9 web articles" (24 pages). The data has 14 web articles of 2019 `[check: DZ80 2026-11-02 07:19 python3 -B count of articles.jsonl in <T2>]`. The cause was Not verified when DZ81 wrote this line. Unit SV82 found it in round 82 (answer 24, section 15.36.3) `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.
- Unit TJ81 joined the tanden pages. The folder `data/` is ignored by git, so TJ81 made no commit. The four places `<PG>/Tanden Full`, `<BP>/Tanden Full/pages`, `<V2>/data/page-images/tanden_full`, and `<V2>/data/v1-md/tanden_full` hold 295 files each, without the `._` files `[check: aki-main 2026-11-02 07:51 ls counts]`.
- Chapters 12, 13, and 14 start at p111, p118, and p121. The old pages p111 to p276 are now p130 to p295. The printed pages 120, 124, and 134 are not in the scan (white page possible). They have no page ID `[aki-main report in the brief of DZ81]`.
- aki-main made a PocketBase backup in `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r81/aki/pb-backup/`. It holds `data.db` (45 MB), `auxiliary.db` (18 MB), and `SHA256SUMS`. The `integrity_check` result is ok `[check: aki-main 2026-11-02 07:52 sqlite3 .backup]`.
- The `sync-runs.mjs` dry run showed one change: `catalog_items` `tanden_full`. The `--apply` run updated 1 record. The second dry run showed no change. A read-only `sqlite3` query shows 295 pages `[check: aki-main 2026-11-02 07:52 sync-runs.mjs dry run, --apply, second dry run]`.
- The Reader dashboard `/read` reads "342 works, 14,135 pages. English: 1,124 of 14,135 pages translated (8.0 percent)". The book screen `/read/tanden_full` reads "AI translation: 0 of 295 pages." `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.
- On the book screen `/read/tanden_full`, p111 and p129 show 0 text rows. Page p130 shows 35 v1 placeholder rows, and the stray Page 101 block is gone. Page p295 shows 6 rows `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`. A v1 placeholder counts as nothing translated.
- aki-main spot-checked 10 random rows per book that TV81 did not check, 30 rows in all. All 30 rows have the title as heading on their `pdf_page` md file. The offsets are right. aki-main viewed the images for `100_practice_full` p242 (printed 249), `eiga_full` p141 (printed 135), and `men_full` p154 (printed 151) `[check: aki-main 2026-11-02 07:55 spot.py seed 20261102]`.
- aki-main appended 250 TV81 rows (`100_practice_full` 82, `eiga_full` 101, `men_full` 67) to the hand rows. The hand rows grew from 602 to 852 rows. The file was copied to `<T2>/data/item-metadata/book-toc-overrides.jsonl` `[check: aki-main 2026-11-02 12:01 book_toc.py --review-sheet, 47.7 s]`.
- The full rebuild of `book-toc.jsonl` gave 1158 rows: 852 checked by aki-main, 296 needs-image, 8 offset-guess, and 2 placed. The rebuild fixed the stale tanden fields (order 16 match_md_page 130, match_line 4). The summary shows tanden md_files 295 `[check: aki-main 2026-11-02 12:01 book_toc.py --review-sheet, 47.7 s]`.
- Hand-checked books are now 18 of 23. Five books are left: `etiqu1_full`, `kodass200_full`, `sumiss10_c1_full`, `sumiss_train_full`, and `tani_ss_full` `[check: aki-main 2026-11-02 12:01 book_toc.py --review-sheet, 47.7 s]`.
- aki-main made the commits at 11:57 to 11:58 `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:24]`. In <T2>: baf634d (TR77c2 code), 04c9a56 (DZ80 design docs), 593c070 (CE81 cost file). In <V2>: 2163041 (VW77b1 code), 611b3f8 (DZ80 VISION docs). The branch v2/base moved to 611b3f8. The merge is a370c11. The selftest after the merge gave TOTAL 708/708. Nothing was pushed, and main stays 2da3ab2 `[aki-main report in the brief of DZ81]`.
- `git log --oneline -6` in <T2> shows a370c11, 593c070, 611b3f8, 04c9a56, 2163041, and baf634d. `git log --oneline -4` in <V2> shows 611b3f8, 2163041, 0440eb1, and f27a50c `[check: DZ81 2026-11-02 12:17 git log --oneline -6 in <T2> and git log --oneline -4 in <V2>]`.
- aki-main restarted the dev server once (round 81 answer 27). The process is next-server PID 91658, and the log is `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r81/aki/dev-server-20261102.log` `[check: aki-main 2026-11-02 07:53]`.
- The facts about TR77c2, VW77b1, and CE81 as built are in the sections 15.35.5, 15.35.6, and 15.35.7.

##### 15.35.4 The `tanden_full` join (answers 1 to 3)

Owner decisions:

- Answer 1 (`qa-memory-2026-11-02.md:50`): "Accept, keep the copy (Recommended)". The owner accepts the result of TJ81. The archive copy `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode/r81/TJ81/archive/` (about 580 MB) stays until the end of the next session `[aki-main report in the brief of DZ81]`.
- Answer 2 (`qa-memory-2026-11-02.md:51`): "Reading is right (Recommended)". The 19 pages p111 to p129 have one md file each in `<BP>/Tanden Full/pages/` and in `<V2>/data/v1-md/tanden_full/`. Each file holds only the line `Page 111` and so on. That makes 38 files. The file `triplet.json` has no key for these pages.
- Answer 3 (`qa-memory-2026-11-02.md:52`): "Fix by the full rebuild (Recommended)". The question named "16 match fields, md_files 276" as stale. The full rebuild of `book-toc.jsonl` fixed them: order 16 match_md_page 130, match_line 4, and md_files 295 `[check: aki-main 2026-11-02 12:01 book_toc.py --review-sheet, 47.7 s]`.

Example. The book screen `/read/tanden_full` has 295 pages. Page p111 shows 0 text rows. Its md file holds only the header `[agent inference]`. Page p130 is the old p111 and shows 35 v1 placeholder rows. A v1 placeholder counts as nothing translated `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.

Effect on the screens. The Reader dashboard `/read` counts 14,135 pages and 342 works. The 19 new pages count as not translated. The book screen `/read/tanden_full` lists 295 pages `[check: aki-main 2026-11-02 07:53 live GET /read with admin login]`.

The owner hand step 8.10a is the upload of the tanden page images to the server (round 81 answer 10). The plan file holds no record that the step ran `[check: DZ81 2026-11-02 12:13 Read of .opencode/reminders/plan/evolving-plan-2026-11-02.md]`. Its state is Not verified. Round 84 answer 8 (`qa-memory-2026-11-02.md:134`): the step runs with the v2 deploy.

##### 15.35.5 Row of a refused Restart (answers 4 to 7)

Unit TR77c2 as built. DZ81 read no code, so the list below is the report of aki-main `[aki-main report in the brief of DZ81]`:

- The history event `restart-refused` has the keys `reason` and `requested_utc`. The key `requested_utc` is the press time of the refused mark.
- The event is written on every failed Restart check, also for a running book before its `stopped` event.
- An idle book keeps its state. The file `request.json` stays. The run program exits with code 2.
- The Run mark after a Restart holds `requested_utc` = press time. The key `restart_requested_utc` is gone.
- The key order of the Run mark is `schema`, `book`, `action`, `phase`, [`prompts`], [`after`], `requested_utc`, `requested_by`.
- The marks command prints "run (after restart pressed <requested_utc>)".

Owner decisions:

- Answer 4 (`qa-memory-2026-11-02.md:53`): "Accept and commit (Recommended)". The commit is baf634d.
- Answer 5 (`qa-memory-2026-11-02.md:54`): "Keep, write the event (Recommended)". A refused Restart on a Not started book writes the event, so it creates `history.jsonl`. Example (invented): `mental_full` has not started. You press Restart with ED_2 `v4.1.3`, and that label has no file. The book folder gets a new `history.jsonl` with one `restart-refused` line.
- Answer 6 (`qa-memory-2026-11-02.md:55`): "Leave as is (Recommended)". A stale Running book can get repeated events. Example (invented): `status.json` of `mental_full` says Running but no process runs. Each refused Restart adds one more event `[agent inference]`. The Viewer reads the newest event only (section 15.34.5).
- Answer 7 (`qa-memory-2026-11-02.md:56`): the owner accepted all 6 rules:

1. "No event on bad press time". If the press time is unreadable, or `request.json` is not valid JSON, no event is written.
2. "Press time needs Restart". The function `write_mark` refuses `requested_utc` without `after`. DZ81 did not read the function, so the exact case is Not verified.
3. "No read of the old key". The Translator does not read `restart_requested_utc`. Example: an old Run mark that holds `restart_requested_utc` gives no press time.
4. "Archive hint in reason". The `reason` text holds the archive hint sentence. The words of the sentence are Not verified.
5. "Marks line keeps two times". The marks command line keeps two times. The brief does not name them, so this is Not verified.
6. "Event on running book too". A refused Restart on a Running book also writes the event. Example (invented): `mental_full` at p080 is Running. You press Restart with ED_2 `v4.1.3` and no file. The book writes `restart-refused` and then `stopped` with the reason `rule`.

##### 15.35.6 Monitor dashboard buttons and Reader times (answers 8 to 16 and 18)

- Answer 8 (`qa-memory-2026-11-02.md:57`): "Accept and commit (Recommended)". The commit is 2163041.
- Unit VW77b1 as built `[aki-main report in the brief of DZ81]`: the buttons Run, Run phase 4, Pause, and Resume with confirm dialogs (Cancel first) on real-book rows. The routes are `POST /api/monitor/books/<slug>/mark` and `POST /api/monitor/books/<slug>/pause`. Run is grayed on all 37 rows of this Mac with "Run is off until phase 2 prompt files exist". The summary line has no error count. Pilot rows have an empty phase cell. PST shows on the Lists tab `/runs`, the run view, and the page check date, still without the word PST.
- Answer 9 (`qa-memory-2026-11-02.md:58`): "Unit TF82 fixes them (Recommended)". TF82 fixes the 9 old Viewer test lines that expect the tanden totals from before the join. They fail only on the +19 page totals `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:15]`.
- Answer 10 (`qa-memory-2026-11-02.md:59`): "Clear mark button in VW77b2 (Recommended)". The button clears a refused mark. Round 83 answers 12 and 13 (`qa-memory-2026-11-02.md:107,108`) set what it does: it moves `request.json` to `request.done.json` and overwrites an older `request.done.json`. Round 83 answer 11 and round 84 answer 2 add a gray rule (section 15.36.4, item 4): Clear mark is grayed on a Run mark with `after` "restart".
- Answer 11 (`qa-memory-2026-11-02.md:60`): "Keep it grayed (Recommended)". Run stays grayed until the phase 2 prompt files exist. Example: all 37 rows of this Mac show Run grayed.
- Answer 12 (`qa-memory-2026-11-02.md:61`): "Keep Run on pilot rows (Recommended)". Run stays on pilot rows. Example: a pilot row whose list runs now shows Run grayed with the pilot list reason of rule 1 below. Pilot runs do not count toward real runs.
- Answer 13 (`qa-memory-2026-11-02.md:62`): "Show Resume (Recommended)". Resume shows also on Stopped by failure and Stopped unexpectedly. Rule 2 below keeps Resume away from the other stops.
- Answer 14 (`qa-memory-2026-11-02.md:63`): "PST in a later unit (Recommended)". Times on the pages `/translate` and `/admin` get PST in a later unit. Round 83 answer 20 (`qa-memory-2026-11-02.md:115`) names unit TF83 for it, and round 84 answer 6 (`qa-memory-2026-11-02.md:132`) starts that unit.
- Answer 15 (`qa-memory-2026-11-02.md:64`): "Right, add PST" `[accepted option 2]`. The reading of round 81 answer 18 is right. The page check date on the book screen `/read/<slug>` becomes "(2026-10-27 PST)". aki-main put this into unit VW77b2 `[aki-main report in the brief of DZ81]`. No doc line states the old date text, so DZ81 changed no line for it.
- Answer 16 (`qa-memory-2026-11-02.md:65`): the owner kept all 15 other VW77b1 rules. The list is below.

| No | Name | Rule |
|---|---|---|
| 1 | Pilot list reason | A pilot list that runs this book gives Run grayed. The reason reads "Run is off because a pilot list runs this book now. Use Pause on the Lists tab." |
| 2 | No Resume for some stops | A book that stopped with the reason target-reached, restart, or none shows no Resume. |
| 3 | Pause grayed when asked | Pause is grayed with "Pause is already requested". |
| 4 | Waiting row reason | A Waiting row grays Run and Resume with "A mark waits: Run requested 08:40 PST", plus " (refused)" for a refused mark. |
| 5 | Gray button form | A grayed button uses `aria-disabled` with a tooltip and screen-reader text. |
| 6 | Run phase 4 dialog text | The dialog asks "Run <book> in phase agent-phase-4?" The body reads "The button writes a mark. An opencode agent starts the run. Phase 4 starts at the beginning of the book." |
| 7 | Resume phase must match | A Resume press must send the phase of `status.json`. |
| 8 | PAUSE file content | The PAUSE file is one JSON line `{"who":"viewer","when_utc":"..."}` written with the flag `wx`. |
| 9 | Safe mark write | The file `request.json` is written as `.part` and then linked. |
| 10 | Refused line is extra | The refused line is its own third line. |
| 11 | Pause stays on refused | A refused Restart on a Running row keeps Pause. |
| 12 | paired-dataset not a row | The folder `paired-dataset` is no book row. |
| 13 | Pause with Run/Resume mark | A Run or Resume mark on a Running row keeps Pause. |
| 14 | Route names | The pause route is `/api/monitor/books/<slug>/pause`. |
| 15 | Helper file pst-more.ts | The PST helpers sit in `lib/pst-more.ts`. |

Example for rule 4. The row of `mental_full` has a Run mark that waits, and the mark is refused. The row shows Run and Resume grayed with "A mark waits: Run requested 08:40 PST (refused)" (invented values).

Wording of the refused line. Round 81 answer 15 says "second line" (`qa-memory-2026-11-02.md:20`). Rule 10 says "its own third line". Round 83 answer 17 (`qa-memory-2026-11-02.md:112`) decides: "Own line under line 2 (Recommended)". The refused line is the third line of the row (open item 2 in section 15.35.13).

- Answer 18 (`qa-memory-2026-11-02.md:67`): the owner kept all 5 defaults of DZ80:

1. Old option text stays as history, with a note.
2. The Monitor dashboard polls every 3 s in a visible tab, also with no live row.
3. The refused line goes away when `request.json` is gone or holds another `requested_utc`.
4. PST covers every time on the Reader screens.
5. The VISION phase 2 row example uses option A (one row).

- Answer 17 of round 81 and answer 18 of round 82 keep PST on the five screens of section 15.34.6. Which times the Reader screens show stays Not verified, because DZ81 read no Reader code.

##### 15.35.7 Cost file (answers 25 to 27)

- Answer 25 (`qa-memory-2026-11-02.md:74`): "Accept and commit (Recommended)". Unit CE81 changed `<T2>/docs/drafts/translator-cost-estimate.md` to N = 5. The commit is 593c070. N = 5 means one single box has 5 critiques, and then one rewrite reads all queued critiques of that box.
- CE81 as built: phase 2 one pass costs 334.04 USD in variant A (TS calls) and 262.99 USD in variant B (TS pass-through) `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:15]`.
- Answer 26 (`qa-memory-2026-11-02.md:75`): "Variant B in next cost unit (Recommended)". Variant B becomes the base case in the next cost unit.
- Answer 27 (`qa-memory-2026-11-02.md:76`): the owner accepted all 4 items for the next cost unit:

1. "Optimizer reads all groups". The optimizer reads all critique groups. This adds 7.23 USD per pass `[aki-main report in the brief of DZ81]`.
2. "Price the 16 year books". The unit prices the 16 year books. It needs the page counts of unit SV82.
3. "Measure the critique rate". The unit measures the critique rate in the first real phase 2 run on `data/book-store/paired-dataset/`.
4. "Keep one pass as base". One pass stays the base.

Answer 33 names no cost unit, so the next cost unit waits for a later round `[agent inference]`.

##### 15.35.8 Table of contents rows (answers 28 to 32)

- Answer 28 (`qa-memory-2026-11-02.md:77`): "Apply now (Recommended)". aki-main applied the 250 rows of TV81 and rebuilt `book-toc.jsonl` (section 15.35.3).
- Answer 29 (`qa-memory-2026-11-02.md:78`): "No number (Recommended)". The front matter rows of `100_practice_full` keep no page number.
- Answer 30 (`qa-memory-2026-11-02.md:79`): "Page spelling (Recommended)". A misprint in the ToC takes the page spelling. The ToC spelling goes into the evidence text.

Examples of answer 30:

- `eiga_full` order 33: the page reads 国体選手の夢破れ. The ToC prints 団体選手の夢破れ.
- `men_full` order 20: the page reads 心正しからざれば 剣また正しからず. The ToC prints 心正しかざれば.

- Answer 31 (`qa-memory-2026-11-02.md:80`): the owner kept all 6 rules of TV81:

1. "Two levels". The ToC has two levels.
2. "Order by page". Rows follow the order of the pages.
3. "Part with no number". A part with no printed number gets `page_ref` null and the `pdf_page` of the opener page.
4. "Repeated title own row". A repeated title gets its own row.
5. "Drop magazine notes". The magazine issue notes of `men_full` are dropped.
6. "東海大四高校時代 at p36". The entry 東海大四高校時代 starts at p36.

- Answer 32 (`qa-memory-2026-11-02.md:81`): "Next 3 only" `[accepted option 2]`. Unit TV82 covers `etiqu1_full`, `kodass200_full`, and `sumiss10_c1_full`. The books `sumiss_train_full` and `tani_ss_full` wait.
- The review sheet has LOOK rows: `etiqu1_full` 48, `kodass200_full` 178, `sumiss10_c1_full` 78, `sumiss_train_full` 1, and `tani_ss_full` 1 `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:26]`.

##### 15.35.9 Phase 2 and the year books (answers 19 to 24)

- Answer 19 (`qa-memory-2026-11-02.md:68`): "Reading is right (Recommended)". Phase 2 is one run in `data/book-store/paired-dataset/` on the 40 `train-feedback` articles, in the order of `articles.jsonl`. That order forms year blocks of 1, 9, 7, 7, 5, 6, and 5 articles for 2019 to 2025, and 144 A4 pages. The 16 year books run in phases 3 and 4.
- The 9 books `kendojidai_2010` to `kendojidai_2018` are scanned volumes. The 7 books `kendojidai_2019` to `kendojidai_2025` hold the web articles of that year by `year_en`.

| Year | Book ID | Web articles of the year | `train-feedback` articles in phase 2 |
|---|---|---|---|
| 2019 | `kendojidai_2019` | 14 | 1 |
| 2020 | `kendojidai_2020` | 54 | 9 |
| 2021 | `kendojidai_2021` | 55 | 7 |
| 2022 | `kendojidai_2022` | 51 | 7 |
| 2023 | `kendojidai_2023` | 48 | 5 |
| 2024 | `kendojidai_2024` | 45 | 6 |
| 2025 | `kendojidai_2025` | 44 | 5 |
| All | 7 books | 311 | 40 |

The counts come from `translator-design.md`, section 9.32.4, and from the brief `[aki-main report in the brief of DZ81]`.

- Answer 20 (`qa-memory-2026-11-02.md:69`): "Treating them like every other book" `[user]`. Reading of aki-main, confirmed in round 83 answer 5 (`qa-memory-2026-11-02.md:100`): "Reading is right (Recommended)". A web year book holds every web article of its year, and the dataset split removes no article. Example: the book `kendojidai_2019` holds 14 articles, 1 `train-feedback`, 3 `test`, and 10 `train-retrieval` `[agent inference]`.
- Answer 21 (`qa-memory-2026-11-02.md:70`): "No rule" `[accepted option 2]`. No rule keeps the retriever away from units of the same article. The note of aki-main (line 89) says that the retriever can return the human EN of the article in work. This holds only for a `train-retrieval` article, because the pool holds no other article (section 15.36.4, item 3).
- Answer 22 (`qa-memory-2026-11-02.md:71`): "kendojidai_2019 (Recommended)". All 16 year books use the form with an underscore. The spelling `kendojidai-2019` in round 80 answer 22 stays as an owner quote.
- Answer 23 (`qa-memory-2026-11-02.md:72`): "optoin 3. I will click the run button on the Monitor view myself" `[user]`. There is no fixed run order. The owner presses Run per book on the Monitor dashboard `/`. Example: you press Run on the row `mental_full` first and on the row `kendojidai_2010` later. Run stays grayed until the phase 2 prompt files exist (answer 11).
- Answer 24 (`qa-memory-2026-11-02.md:73`): "Read-only survey SV82 (Recommended)". SV82 looks into the fold "Kendo Jidai 2019" on the Reader dashboard `/read`. The fold shows "9 web articles" (24 pages), and the data has 14. SV82 ran in round 82. Its result is in section 15.36.3.

##### 15.35.10 Units of this round and process (answers 17 and 33 to 37)

- Answer 17 (`qa-memory-2026-11-02.md:66`): "Accept and commit (Recommended)". The DZ80 docs are committed as 04c9a56 in <T2> and 611b3f8 in <V2>.
- Answer 33 (`qa-memory-2026-11-02.md:82`): the owner ticked the five units below. TR77d1 is not ticked.

| Unit | Job | Write set | Result |
|---|---|---|---|
| DZ81 | docs for round 82 answers | the two docs and the unit folder | this section |
| TF82 | test numbers | own app copy, patch only, PocketBase test port 8093 | result in section 15.36.3 |
| VW77b2 | Restart dialog with 16 pick lists and quick select, Clear mark, page check date with PST | app copy, PocketBase test port 8092 | result in section 15.36.3 |
| SV82 | read-only survey of the fold "Kendo Jidai 2019", year book pages, and the retriever | unit folder only | result in section 15.36.3 |
| TV82 | ToC rows of three books | unit folder only | result in section 15.36.3 |

aki-main commits VW77b2 first and then applies the TF82 patch `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:28]`.

- Answer 34 (`qa-memory-2026-11-02.md:83`): "Keep briefs as they are" `[accepted option 2]`. The briefs get no new guards. aki-main keeps the after-return checks.
- Answer 35 (`qa-memory-2026-11-02.md:84`): "Keep it in the background (Recommended)". The dev server on port 3000 stays in the background. DZ81 did not touch it.
- Answer 36 (`qa-memory-2026-11-02.md:85`): the owner reminder, in full in section 15.35.2. It holds three rules for aki-main. A dispatch message holds full detail about the task and the writing, coding, and thinking principles. A question message is readable and self-contained. Every message stays grounded in the project vision, context, and references.
- Answer 37 (`qa-memory-2026-11-02.md:86`): "Run the plan (Recommended)".

##### 15.35.11 Lines of this file that round 82 replaced

Each row is one line of this file that the unit changed in place. The line numbers are the same before and after the edit. The unit changed no line count above the end of the file.

| Line | Old text in short | New text in short | Source |
|---|---|---|---|
| 3832 | VW77b1 builds the change (Not verified) | VW77b1 built it, accepted | round 82 answer 8, qa-memory-2026-11-02.md:57 |
| 6752 | VW77b1 builds PST, Not verified | VW77b1 built PST, VW77b2 adds the word | round 82 answers 8 and 15, qa-memory-2026-11-02.md:57,64 |
| 6769 | VW77b1 builds the buttons, Not verified | VW77b1 built them, VW77b2 next | round 82 answers 8 and 10, qa-memory-2026-11-02.md:57,59 |
| 6779 | Translator does not write the event yet | TR77c2 built the event | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6787 | key goes away | TR77c2 removed the key | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6789 | code writes the old key today | TR77c2 removed the key | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6791 | row reads the old key | key removed, Viewer read Not verified | round 82 answers 4 and 7, qa-memory-2026-11-02.md:53,56 |
| 6844 | key goes away after the change | TR77c2 removed the key | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6848 | event not written yet | TR77c2 added the event | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6869 | TJ80 plans the join | TJ81 ran, accepted | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 6871 | count 295 Not verified | count 295 checked | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 6873 | total 14,116 now, 14,135 after the join | total 14,135 checked | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 6874 | 19 pages not translated | p111 and p129 show 0 text rows | round 82 answers 1 and 2, qa-memory-2026-11-02.md:50,51 |
| 6933 | default 4 key order of the future code | built in TR77c2 | round 82 answer 4, qa-memory-2026-11-02.md:53 |
| 6944 | results Not verified | pointer to checked results | round 82 answers 4 and 8, qa-memory-2026-11-02.md:53,57 |
| 6966 | results Not verified | pointer to checked results | round 82 answers 1, 4, 8, 25, and 28, qa-memory-2026-11-02.md:50,53,57,74,77 |
| 7013 | reading pending owner check | reading confirmed | round 82 answer 2, qa-memory-2026-11-02.md:51 |
| 7016 | sync after TJ81 (future) | sync done | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 7023 | total grows (inference) | total checked | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 7025 | line after the join (inference) | line checked | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 7027 | result of TJ81 Not verified | result checked | round 82 answer 1, qa-memory-2026-11-02.md:50 |
| 7039 | reading pending owner check | reading confirmed | round 82 answer 19, qa-memory-2026-11-02.md:68 |
| 7048 | phase 2 row example | example kept | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7050 | web book ID is an open item | ID is kendojidai_2019 to kendojidai_2025 | round 82 answer 22, qa-memory-2026-11-02.md:71 |
| 7081 | both results Not verified | both accepted | round 82 answers 4 and 8, qa-memory-2026-11-02.md:53,57 |
| 7104 | VW77b1 builds the change | VW77b1 built helpers, accepted | round 82 answer 8, qa-memory-2026-11-02.md:57 |
| 7152 | TV81 reads the tables | rows applied | round 82 answer 28, qa-memory-2026-11-02.md:77 |
| 7220 | default 1 open | default 1 accepted | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7221 | default 2 open | default 2 accepted | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7222 | default 3 open | default 3 accepted | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7223 | default 4 open | default 4 accepted | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7224 | default 5 open | default 5 accepted | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7230 | open item 1 | answered by answer 19 | round 82 answer 19, qa-memory-2026-11-02.md:68 |
| 7231 | open item 2 | answered by answer 20, reading pending | round 82 answer 20, qa-memory-2026-11-02.md:69 |
| 7232 | open item 3 | answered by answer 22 | round 82 answer 22, qa-memory-2026-11-02.md:71 |
| 7233 | open item 4 | answered by answer 23 | round 82 answer 23, qa-memory-2026-11-02.md:72 |
| 7234 | open item 5 | answered in part by answers 15 and 18 | round 82 answers 15 and 18, qa-memory-2026-11-02.md:64,67 |
| 7238 | five results Not verified | results checked by aki-main | round 82 answers 1, 4, 8, 25, and 28, qa-memory-2026-11-02.md:50,53,57,74,77 |
| 7239 | join Not verified, plan values | counts 295 and 14,135 checked | round 82 answers 1 and 2, qa-memory-2026-11-02.md:50,51 |
| 7241 | readings wait for the owner | readings at 41 and 43 confirmed | round 82 answers 2 and 19, qa-memory-2026-11-02.md:51,68 |
| 7242 | poll with no live row not stated | settled by round 82 answer 18 | round 82 answer 18, qa-memory-2026-11-02.md:67 |
| 7245 | status: items wait for the owner | status: items answered | round 82 answers 19, 20, 22, and 23, qa-memory-2026-11-02.md:68,69,71,72 |

Lines that stay as history, checked by the unit:

- Line 6420 holds the key `restart_requested_utc` in a history sentence of round 80. It stays.
- The lines with 14,116 pages (4448, 4736, 5305, 5313, 5389, 5427, 5727, 5809, 6055, 6163) are dated checks or plans of earlier rounds. They stay.
- The lines 6873, 7023, and 7025 name 14,116 as the old total. They carry a round 82 check note.
- Line 7036 quotes round 80 answer 22 with the spelling `kendojidai-2019`. Owner words stay as they are.
- Section 15.34.10 is the table of round 81. It stays as it is.
- No line states the page check date "(2026-10-27)". The text is in the Viewer code only.
- No line says "Clear mark" as Not built. DZ81 changed no line for Clear mark.

##### 15.35.12 Unit defaults of DZ81

No owner answer settles these items.

1. `[unit default DZ81]` Rule: a line that says "Not verified" about a round 81 unit gets the checked result and the check tag in its place. Example: VISION line 7027 now points to section 15.35.3. Other option: keep the old line and write the result only in section 15.35.3. Benefit: a reader of section 15.34 sees the current state. Cost: section 15.34 no longer shows what DZ80 knew at write time. The git history keeps the old text.
2. `[unit default DZ81]` Rule: owner quotes, old option texts, and dated check lines keep the spelling `kendojidai-2019` and the total 14,116. Example: VISION line 6163 records the live read of 2026-11-01. Other option: change every hit. Benefit: quotes stay exact and old checks stay true for their date. Cost: a reader sees two spellings and two totals in one file.
3. `[unit default DZ81]` Rule: this section names the refused line with both wordings, "second line" and "its own third line", and chooses neither. Example: the row of `mental_full` after a refused Restart. Other option: choose "second line" now. Benefit: no false claim about the screen. Cost: the wording stays open until a check settles it.
4. `[unit default DZ81]` Rule: facts about TR77c2, VW77b1, and CE81 as built come from the brief of aki-main and carry the tag `[aki-main report in the brief of DZ81]`. Example: the key order of the Run mark. Other option: DZ81 reads the code and the cost file. Benefit: the unit keeps its write set and stays docs-only. Cost: a wrong fact in the brief goes into the docs until aki-main checks it.

##### 15.35.13 Open items for the owner

The first option of each item is the recommended option.

1. Decided in round 83 answer 5 (`qa-memory-2026-11-02.md:100`): "Reading is right (Recommended)". The book `kendojidai_2019` holds 14 articles, 1 `train-feedback`, 3 `test`, and 10 `train-retrieval`. Fix of DZ82: the retrieval pool holds only the 244 `train-retrieval` articles (26,303 units). So a `test` article or a `train-feedback` article cannot get its own human EN from the retriever `[check: SV82 <TMP>/r82/SV82/partC_data.txt:1]`. Answer 21 "No rule" has no effect on them. The 10 `train-retrieval` articles of 2019 can get their own human EN `[agent inference]`. Old sentence, wrong: "Answer 21 lets the retriever return their human EN, so a test score from that book run is not clean." Other option, not chosen: keep the 27 `test` articles out of the year books. The 2019 book then holds 11 articles.
2. Decided in round 83 answer 17 (`qa-memory-2026-11-02.md:112`): "Own line under line 2 (Recommended)". The refused line is its own line under line 2, so it is the third line of the row. The check of aki-main shows that `BookRow.tsx` does this `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:30]`. Example: the row of `mental_full` after a refused Restart. Old question: "second line" or "its own third line".
3. Decided in round 84 answer 8 (`qa-memory-2026-11-02.md:134`): "With the v2 deploy (Recommended)". The owner hand step 8.10a runs on deploy day. It uploads the page images, also the 295 `tanden_full` images, to `/opt/pocketbase-v2/page-images` on the server `[brief fact, aki-main check 2026-11-02]`. Example: the server needs the images of p111 to p295 of `tanden_full`. Old question: run it now or wait until the VW77b2 commit.

##### 15.35.14 Not verified

- The results of TF82, VW77b2, SV82, and TV82 are in section 15.36.3. Round 83 answer 2 accepted VW77b2, and the plan file records the commits.
- The facts about TR77c2, VW77b1, and CE81 as built come from the brief of aki-main. DZ81 read no code and no cost file.
- The count of 38 header-only md files is 19 pages in 2 folders. DZ81 did not count the files.
- The cause of "9 web articles" in the fold "Kendo Jidai 2019" is found by SV82 (section 15.36.3). Round 83 answer 4 changes the rule.
- The state of the owner hand step 8.10a is Not verified. It runs with the v2 deploy (round 84 answer 8).
- The exact case of the `write_mark` refusal, the archive hint sentence, and the two times of the marks command line are Not verified.
- The Viewer code still reads `restart_requested_utc` first and `requested_utc` second `[file: <V2>/app/lib/book-status-rules.ts:361]`.
- The wording for the refused line is decided in round 83 answer 17: its own line under line 2.
- The reading of aki-main at line 88 of the Q-A file is confirmed in round 83 answer 5.
- The full list of times on the Reader screens is Not verified.
- Clear mark moves `request.json` to `request.done.json` and overwrites an older `request.done.json` (round 83 answers 12 and 13). The code of VW77b2 does this `[file: <V2>/app/lib/book-restart-actions.ts:159-163]`.
- The dev server on port 3000 and PocketBase on port 8090 were not read or changed.

Status: round 82 answers applied by unit DZ81. The owner answered the items in section 15.35.13 in rounds 83 and 84 (section 15.36).

#### 15.36 Round 83 and 84 answers: web year fold, grayed Clear mark, notes order, Clear mark file, open items closed (unit DZ82, round 84)

Unit DZ82 wrote this section on 2026-11-02 (round 84). It records the owner answers of round 83 and round 84. The Q-A file is `.opencode/reminders/qa/qa-memory-2026-11-02.md`. The design side is in `<T2>/docs/drafts/translator-design.md`, section 9.34. This section has the Viewer weight. This unit changed docs only. It ran no code, no model call, and no Voyage call.

Pilot runs under `<T2>/data/pilot-run/` are not real runs (round 73e answer 10, `qa-memory-2026-10-31.md:13`): "All these are pilots, which DO NOT COUNT toward real runs". A v1 placeholder translation counts as nothing. Examples use real book IDs and real values, and each value carries a source tag. An example that shows a state with no real run says "example state".

Screen names in this section: the Reader dashboard `/read` and the book screen `/read/<slug>`. The Monitor dashboard `/` runs on this Mac. The Lists tab is `/runs`, and the run view is `/runs/<stamp>`. The Reader dashboard says "translated". The Monitor dashboard says "pages done".

Source tags: owner words carry the Q-A file and the line, or `[owner, round N answer M]`. A unit default carries `[unit default DZ82]`. A fact that only the brief of DZ82 gives carries `[brief fact, aki-main check 2026-11-02]`. An inference of the unit carries `[agent inference]`. A proposal of aki-main carries `[aki-main proposal]`. A tag `[file: ...]` or `[check: ...]` gives the evidence.

In this section `<TMP>` is `/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode`.

##### 15.36.1 Sources and scope

- The Q-A file has 143 lines. The round 83 header sits at line 95. Answer N of round 83 sits at line 95+N, so the answers fill the lines 96 to 120. The notes of aki-main sit at the lines 121 to 124 `[check: DZ82 2026-11-02 20:51 PST Read of qa-memory-2026-11-02.md lines 90 to 143]`.
- The round 84 header sits at line 126. Answer N of round 84 sits at line 126+N, so the answers fill the lines 127 to 139. The notes of aki-main sit at the lines 140 to 143 `[check: DZ82 2026-11-02 20:51 PST Read of qa-memory-2026-11-02.md lines 90 to 143]`.
- The plan file is `.opencode/reminders/plan/evolving-plan-2026-11-02.md` (45 lines). Its line 29 holds the results of the round 82 units. Its lines 30 to 32 hold the checks of aki-main. Its lines 36 and 37 hold the commits and the TV82 apply. Its line 41 sums up the round 84 answers `[check: DZ82 2026-11-02 20:51 PST grep -n on the plan file]`.
- `git log --oneline -1` shows aa427cb in <T2> and 477e440 in <V2>. At the start of the unit, `git status --short` printed nothing in both repos `[check: DZ82 2026-11-02 20:51 PST git status --short and git log --oneline -1 in <T2> and <V2>]`.
- Four other units of round 84 run in parallel with this unit. They are TR77d1 (update step with a stub), TF83 (Viewer fixes), CE82 (cost update), and TV83 (ToC rows of two books) `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:45]`. Their results are Not verified when this unit writes.
- This unit writes two docs: this file and `<T2>/docs/drafts/translator-design.md`.
- Section 15.36.2 holds the owner words. Section 15.36.3 holds the unit results. Section 15.36.4 holds what the answers change. Section 15.36.5 lists the lines that this unit changed in place. Section 15.36.6 holds the unit defaults. Section 15.36.7 holds the open items. Section 15.36.8 holds the Not verified list.

##### 15.36.2 Owner words of rounds 83 and 84

The lists below hold all 25 answers of round 83 and all 13 answers of round 84. A script copied each text after the number from the Q-A file and added the line number. The text of round 83 answer 24 holds the owner reminder in full. The brackets at the end of each text are the source tags of the Q-A file.

- Round 83 answer 1 (line 96): Accept DZ81 docs: "Accept, fix claim next (Recommended)" [accepted recommendation]
- Round 83 answer 2 (line 97): Accept VW77b2 Restart dialog and Clear mark: "Accept and commit (Recommended)" [accepted recommendation]
- Round 83 answer 3 (line 98): TF82 test patch: "Apply after VW77b2 (Recommended)" [accepted recommendation]
- Round 83 answer 4 (line 99): Fold Kendo Jidai 2019 shows 9 of 14 web articles: "Show web year" [accepted option 2]
- Round 83 answer 5 (line 100): Reading of round 82 answer 20 (web year book holds every web article of its year, 2019 book 14 articles): "Reading is right (Recommended)" [accepted recommendation]
- Round 83 answer 6 (line 101): TV82 rows (etiqu1_full 61, kodass200_full 224, sumiss10_c1_full 11): "Apply now (Recommended)" [accepted recommendation]
- Round 83 answer 7 (line 102): etiqu1_full deeper ToC lines: "First tier only (Recommended)" [accepted recommendation]
- Round 83 answer 8 (line 103): DVD list rows of sumiss10_c1_full p003: "No rows (Recommended)" [accepted recommendation]
- Round 83 answer 9 (line 104): ToC wording against page wording (not a misprint): "Keep ToC wording (Recommended)" [accepted recommendation]
- Round 83 answer 10 (line 105): Other TV82 rules: "Drop the ◉ bullet (Recommended), Join wrapped titles (Recommended), Chapter number plus title (Recommended), Columns are level 2 rows (Recommended)" [accepted all 4]
- Round 83 answer 11 (line 106): Clear mark on the Run mark that a Restart leaves: "Gray it out (Recommended)" [accepted recommendation]
- Round 83 answer 12 (line 107): Clear mark file: "Keep the move (Recommended)" [accepted recommendation]
- Round 83 answer 13 (line 108): Older saved mark in request.done.json: "Overwrite (Recommended)" [accepted recommendation]
- Round 83 answer 14 (line 109): Form of update_point: "TR77d writes p060 (Recommended)" [accepted recommendation]
- Round 83 answer 15 (line 110): Restart dialog facts sources: "Accept these sources (Recommended)" [accepted recommendation]
- Round 83 answer 16 (line 111): Notes order in the Restart dialog: "Keep DZ78 order (Recommended)" [accepted recommendation]
- Round 83 answer 17 (line 112): Place of the refused Restart line: "Own line under line 2 (Recommended)" [accepted recommendation]
- Round 83 answer 18 (line 113): Other VW77b2 rules: "Quick select rule (Recommended), Copy source note (Recommended), Reasons on 409 answers (Recommended), Button order and gray rules (Recommended), Dialog waits for options (Recommended), File check only (Recommended)" [accepted all 6]
- Round 83 answer 19 (line 114): DZ81 docs rules: "Replace stale lines (Recommended), Quotes keep old text (Recommended), Tag brief facts (Recommended)" [accepted all 3]
- Round 83 answer 20 (line 115): Viewer small fixes (unit TF83): "Test guards from config (Recommended), Stable monitor-actions (Recommended), Old totals in text (Recommended), Fix stamp comment (Recommended), PST on translate and admin (Recommended)" [accepted all 5]
- Round 83 answer 21 (line 116): Old md flaws of kodass200_full: "Leave them (Recommended)" [accepted recommendation]
- Round 83 answer 22 (line 117): Last two ToC books (sumiss_train_full, tani_ss_full): "Do them now, TV83 (Recommended)" [accepted recommendation]
- Round 83 answer 23 (line 118): Next units: "DZ82 docs (Recommended), TR77d1 update step (Recommended), TF83 Viewer fixes (Recommended), CE82 cost update (Recommended), TV83 ToC rows (Recommended)" [VW77c not ticked]
- Round 83 answer 24 (line 119): Other wishes: "Reminder: Also when you dispatch a subagent, include full detail within your message on not just the main task but also your writing/coding/thinking principle and so on. The initial dispatch message cost is negligible, so try to be as detailed as possible in your dispatch message\n\nThe question message cost is negligible, so try to be as `humanly reabable` as possible in your question message and your answers\n\n( include the information that you provide before these questions in the questions themself, so the questions are self-contained and I can refer to them without checking other place)\n\nTry being grounded to the project vision and context and references. Don't hallucinate as we continue this long session and multiple compression.\n\nThis will be the last question batch for this session. write a detail resume prompt for the next session and conclude the session. MAKE sure the next session follow that exact workflow with user as this session, taken into account all the critics and reminders of this session" [user]
- Round 83 answer 25 (line 120): Session control: "Run the plan (Recommended)" [accepted recommendation]

- Round 84 answer 1 (line 127): Reading of round 83 answer 4 (every web article in the fold of its web year, 2019 fold 9 -> 14 articles, month folds June, July, September, October 2018 go away, STAMPED_PLACE "print" -> "web" in TF83): "Reading is right (Recommended)" [accepted recommendation]
- Round 84 answer 2 (line 128): Reading of round 83 answer 11 (Clear mark grayed on a Run mark with after "restart", text "Clear mark is off because this mark starts the new run after a Restart."): "Reading and text are right (Recommended)" [accepted recommendation]
- Round 84 answer 3 (line 129): TR77d1 scope: "Step only, page hook in TR77d2 (Recommended)" [accepted recommendation]
- Round 84 answer 4 (line 130): Names of the new update step events: "Hyphen names (Recommended)" [accepted recommendation]
- Round 84 answer 5 (line 131): DZ82 docs items: "Record round 83 and 84 answers (Recommended), Record unit results (Recommended), Fix the retriever claim (Recommended), Fix the notes order sketch (Recommended), Add request.done.json (Recommended), Web year fold text (Recommended), Grayed Clear mark text (Recommended), Close answered open items (Recommended)" [accepted all 8]
- Round 84 answer 6 (line 132): TF83 Viewer items: "Test guards from config (Recommended), Stable monitor-actions test (Recommended), Old totals in text (Recommended), Fix stamp comment (Recommended), PST on translate and admin (Recommended), Web year fold (Recommended), Grayed Clear mark (Recommended)" [accepted all 7]
- Round 84 answer 7 (line 133): Units to start: "DZ82 docs (Recommended), TR77d1 update step (Recommended), TF83 Viewer fixes (Recommended), CE82 cost update (Recommended), TV83 ToC rows (Recommended)" [accepted all 5]
- Round 84 answer 8 (line 134): Time of hand step 8.10a (page image upload): "With the v2 deploy (Recommended)" [accepted recommendation]
- Round 84 answer 9 (line 135): DESTRUCTIVE delete of temp folders: "Delete old folders (2,319 MB), Delete r75/RT74 (1,048 MB), Delete r80/VW77a (1,405 MB), Delete r72/RC5 (2,135 MB)" [user chose destructive options 5, 4, 3, 2]
- Round 84 answer 10 (line 136): Commit plan: "Accept batch, then commit (Recommended)" [accepted recommendation]
- Round 84 answer 11 (line 137): Units after round 84 (plan only): "TR77d2 templates and wiring (Recommended), VW77c Details view (Recommended), Phase 2 run command, VW77d Run settings panel" [accepted 2 recommendations plus options 3 and 4]
- Round 84 answer 12 (line 138): Other wishes: (no answer)
- Round 84 answer 13 (line 139): Session control: "Run the plan (Recommended)" [accepted recommendation]

Notes by aki-main (not owner words). They sit at the lines 121 to 124 and 140 to 143 of the Q-A file. The script copied each note in full.

- Line 122 (not owner words): Answer 4: every web article sits in the fold of its web year; the fold Kendo Jidai 2019 shows 14 articles and 39 pages; this replaces round 70 answer 6 "Print month" (qa-memory-2026-10-29.md:121); the 36 stamped articles (135 pages) leave the print months of 2011 to 2018; the change is `STAMPED_PLACE` in `<V2>/app/lib/reader-folds.ts:23` plus tests, in unit TF83 [reading pending owner check].
- Line 123 (not owner words): Answer 11: Clear mark is grayed on a Run mark with `after` "restart", with a reason in words; the change goes into unit TF83 [aki-main proposal].
- Line 124 (not owner words): Answer 24: this is the last batch of the session. aki-main runs the commits and the TV82 apply, does not dispatch the five units, and writes the resume file. The five units are the first dispatch of the next session.
- Line 141 (not owner words): Answer 9: the delete covers exactly <TMP>/r35/g2, r49/V3, r54/H1, r62/PC1, r63/RC1, r75/RT74, r80/VW77a, r72/RC5. The sibling folders r75/aki, r75/DZ74, r80/DZ79, r80/TJ80 stay.
- Line 142 (not owner words): Answer 4: the new event names are update-point-started, prompt-live, prompt-rejected, box-stopped. A box-stopped event comes before the usual stopped event with reason "rule" [aki-main proposal accepted].
- Line 143 (not owner words): Answer 11: "Phase 2 run command" and "VW77d Run settings panel" are planned after TR77d2. Nothing starts before a later owner answer.

Round 84 answer 1 confirms the reading of the note at line 122 (answer 4 of round 83). Round 84 answer 2 confirms the note at line 123 (answer 11 of round 83) and its text. The note at line 124 closed the session of round 83.

##### 15.36.3 Results of the round 82 units

These results come from the plan file and from the result folders of the units. DZ82 read the files and ran no test. Round 83 answers 1 to 3 and 6 accepted them.

- VW77b2 built the Restart dialog, the Clear mark button, and the page check date with PST. The dialog has 16 pick lists and quick select. aki-main checked that 12 VW77b2 files equal the unit copy. `BookRow.tsx` shows the refused Restart on its own third line `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:30]`. The commit is e7b4b5d on v2/viewer `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:36]`.
- TF82 changed the test numbers after the tanden join. Example: the total in `app/scripts/smoke.mjs` goes from 14,116 to 14,135 pages, and the Books fold goes from 4,821 to 4,840 pages `[file: <TMP>/r82/TF82/numbers.tsv]`. The translated percent goes from 8.2 to 8.1, because 1,151 of 14,135 pages is 8.1429 percent `[file: <TMP>/r82/TF82/numbers.tsv]`.
- TF82 tests: the next build, the lint run, and `tsc` end with exit 0 `[file: <TMP>/r82/TF82/test-results.txt:3-5]`. The old modes end with deploy 39/0, tolerance 21/0, read 300/0, web 77/0, folds 0 failures, and run_rt74 0 FAIL `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:36]`. The commit is e060806.
- SV82 found why the fold "Kendo Jidai 2019" shows 9 of 14 web articles. Five stamped articles of 2019 sit in print months by round 70 answer 6 `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:29]`.
- SV82 example: `d7835263` (2019-10-21, 3 pages, stamp "2012.2 KENDOJIDAI") sits today in Kendo Jidai > 2012 > February 2012. The same fold holds `8d5ff367` and `396571c1`. `9b4c87fb` sits in March 2017, and `94380515` sits in October 2013 [file: <TMP>/r82/SV82/table2019.txt:2,4,11,13,15].
- SV82 counts: 36 stamped web articles with 135 pages sit in the print months of 2011 to 2018. By web year, 5 are from 2019, 15 from 2020, 7 from 2021, 5 from 2024, and 4 from 2025 [file: <TMP>/r82/SV82/compare.txt:14-15].
- SV82 pages per year book: 2019 39, 2020 182, 2021 224, 2022 201, 2023 172, 2024 148, and 2025 158 pages. The 311 web articles hold 1,124 pages in all [file: <TMP>/r82/SV82/partB.txt:2-11].
- SV82 retriever pool: 26,303 units of 244 `train-retrieval` articles (24,256 eligible units). The pool holds no unit of the 40 `train-feedback` articles and no unit of the 27 `test` articles [file: <TMP>/r82/SV82/partC_data.txt:1].
- SV82 pool example: the `train-retrieval` article `d7835263` has 79 units in the pool. The `test` article `fc4a7606` has 0, and the `train-feedback` article `94380515` has 0 [file: <TMP>/r82/SV82/partC_examples.txt:1].
- TV82 wrote ToC rows for three books. `etiqu1_full` has 61 rows (the machine rows were 48). `kodass200_full` has 224 rows (178). `sumiss10_c1_full` has 11 rows (78) [file: <TMP>/r82/TV82/diff-summary.txt:1,6,11].
- aki-main spot-checked 10 random rows per book outside the TV82 spot tables. 30 of 30 rows have the title on their `pdf_page`. The offsets are right `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:32]`.
- aki-main applied the TV82 rows (round 83 answer 6). The file `toc-review.jsonl` grew from 852 to 1148 rows. The rebuild of `book-toc.jsonl` gave 1150 rows: 1148 checked by aki-main and 2 needs-image (`sumiss_train_full`, `tani_ss_full`) `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:37]`.
- aki-main committed the round 82 work: e7b4b5d, e060806, 477e440 (VISION), and 0d0d568 (design). The merge is aa427cb, and the selftest gave TOTAL 708/708. Nothing was pushed `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:36]`.
- The results of TR77d1, TF83, CE82, and TV83 of round 84 are Not verified when this unit writes.

##### 15.36.4 What each answer changes

1. Every web article sits in the fold of its web year and month on the Reader dashboard `/read`. Owner words: round 83 answer 4 "Show web year" and round 84 answer 1 "Reading is right (Recommended)". This replaces round 70 answer 6, "Print month (Recommended)" (`qa-memory-2026-10-29.md:121`).
   - Example: `d7835263` (2019-10-21, 3 pages) moves from Kendo Jidai > 2012 > February 2012 to Kendo Jidai > 2019 > October 2019 [file: <TMP>/r82/SV82/table2019.txt:2].
   - Example: record `63654ba0` (Teramoto, part 2, stamp 2011.8 KENDOJIDAI) has 4 pages. It moves from Kendo Jidai > 2011 > August 2011 to Kendo Jidai > 2025 > April 2025 `[brief fact, aki-main check 2026-11-02]` [file: <TMP>/r82/SV82/db_web.json:105]. Its 4 translated pages move with it `[agent inference]`.
   - The unstamped example `18d4ac29` (Kendo Jidai > 2020 > August 2020, "Kendo droplet guard") stays where it is.
   - The change in the code is `STAMPED_PLACE` in `<V2>/app/lib/reader-folds.ts:23`. It reads "print" now and becomes "web" in unit TF83 `[check: DZ82 2026-11-02 20:52 PST grep -n STAMPED_PLACE lib/reader-folds.ts]`.
   - The 36 stamped articles (135 pages) leave the print months of 2011 to 2018. The folds below grow `[brief fact, aki-main check 2026-11-02]` [file: <TMP>/r82/SV82/compare.txt:14-15] [file: <TMP>/r82/SV82/partB.txt:2-10].

| Fold of Kendo Jidai | Articles now | Articles after | Pages now | Pages after |
|---|---|---|---|---|
| 2019 | 9 | 14 | 24 | 39 |
| 2020 | 39 | 54 | 131 | 182 |
| 2021 | 48 | 55 | 189 | 224 |
| 2022 | 51 | 51 | 201 | 201 |
| 2023 | 48 | 48 | 172 | 172 |
| 2024 | 40 | 45 | 130 | 148 |
| 2025 | 40 | 44 | 142 | 158 |

   - The web-only month folds go away: June 2018 (1 article), July 2018 (1), September 2018 (5), and October 2018 (2) [file: <TMP>/r82/SV82/compare.txt:17].
   - The total on `/read` stays "342 works, 14,135 pages". Only the folds change `[brief fact, aki-main check 2026-11-02]`.
   - Effect on the screen. A reader who opens Kendo Jidai > 2019 sees 14 web articles and 39 pages. Before, the fold showed 9 articles and 24 pages `[file: .opencode/reminders/plan/evolving-plan-2026-11-02.md:20]`.
   - Effect on the screen. The print month folds of 2011 to 2018 hold magazine articles only. The fold August 2011 loses `63654ba0` `[agent inference]`.
2. The year book `kendojidai_2019` holds all 14 articles of 2019 (round 83 answer 5 "Reading is right (Recommended)"). The split is 1 `train-feedback`, 3 `test`, and 10 `train-retrieval`, with 39 pages [file: <TMP>/r82/SV82/partB.txt:4].
3. The retriever claim of DZ81 was wrong (round 83 answer 1 "Accept, fix claim next (Recommended)"). The pool holds only the 244 `train-retrieval` articles. A `test` article or a `train-feedback` article cannot get its own human EN from the retriever.
   - Example: the `test` article `fc4a7606` of 2019 has 0 units in the pool [file: <TMP>/r82/SV82/partC_examples.txt:1].
   - Round 82 answer 21 "No rule" has no effect on the 27 `test` articles and the 40 `train-feedback` articles.
   - A `train-retrieval` article in a year book run can get its own human EN. Example: `d7835263` has 79 units in the pool `[agent inference]`.
   - The wrong sentence sat in open item 1 of section 15.35.13. Section 15.36.5 lists the lines that DZ82 fixed.
4. Clear mark is grayed on a Run mark with `after` "restart" (round 83 answer 11 "Gray it out (Recommended)", round 84 answer 2 "Reading and text are right (Recommended)"). A Restart writes this mark, and it starts the new run from page 1 `[brief fact, aki-main check 2026-11-02]`.
   - The reason text is "Clear mark is off because this mark starts the new run after a Restart."
   - Other marks keep the current rules. Unit TF83 builds the gray rule in round 84. Its result is Not verified.
   - Example state (not run data): you press Restart on the row of `mental_full` in phase agent-phase-4. The row shows the Run mark with `after` "restart". The button Clear mark is grayed with the reason text above.
5. Clear mark moves `request.json` to `request.done.json` and overwrites an older `request.done.json` (round 83 answer 12 "Keep the move (Recommended)", answer 13 "Overwrite (Recommended)").
   - The code of VW77b2 writes `request.done.json.part` and renames it over `request.done.json`. Then it removes `request.json` [file: <V2>/app/lib/book-restart-actions.ts:159-163].
   - The moved mark gets two added keys: `cleared_utc` and `cleared_by` "Monitor dashboard" [file: <V2>/app/lib/book-restart-actions.ts:28].
   - The Translator also writes `request.done.json` when it handles a mark. It adds the keys `handled_utc` and `handled_by_pid` [file: <T2>/docs/drafts/translator-design.md:6544].
   - Example state (not run data): `mental_full` holds a `request.done.json` of an earlier Run mark. You press Clear mark on a refused Restart mark. The file now holds the Restart mark with `cleared_utc`, and the earlier mark is gone.
   - The Viewer now writes five kinds of files. Line 4305 of this file lists them.
6. The key `update_point` in a prompt version file holds the page ID as text, for example "p060" (round 83 answer 14 "TR77d writes p060 (Recommended)"). Example: ED_2 `v4.1.3` made by the update point after p060 holds `"update_point": "p060"` `[agent inference]`.
7. Unit TR77d1 builds the update point step only (round 84 answer 3 "Step only, page hook in TR77d2 (Recommended)").
   - TR77d1 builds the step, its checks, the version files `prompts/<BOX>/v<phase>.<run>.<updates>.json` with the `current` pointer, and the event `update-point-ended`.
   - TR77d1 builds the loop over the fired boxes in order. It uses a stub in place of model calls.
   - Unit TR77d2 adds the model templates and the call from the page loop. Nothing starts before a later owner answer.
8. The new events use hyphen names (round 84 answer 4 "Hyphen names (Recommended)").

| Old name | New name |
|---|---|
| `update point started` | `update-point-started` |
| `prompt live` | `prompt-live` |
| `prompt rejected` | `prompt-rejected` |
| `box stopped` | `box-stopped` |

   - A `box-stopped` event names the box. It comes before the usual `stopped` event with the reason "rule" `[owner, round 84 answer 4]`.
   - Example state (not run data): ED_2 of `mental_full` gets its 3rd double REJECT in a row after p080. The history file gets `prompt-rejected`, then `update-point-ended` with the result "rejected twice", then `box-stopped` for ED_2, then `stopped` with the reason "rule".
9. The notes of a version row keep the DZ78 order (round 83 answer 16 "Keep DZ78 order (Recommended)"). Section 15.32.9, item 1, holds the order.
   - Order of the notes in one row: (1) starting version or restart start version.
   - (2) last version of run N. (3) previous restart version. (4) current live version. (5) update after pNNN.
   - The code of VW77b2 pushes the notes in this order [file: <V2>/app/lib/restart-rules.ts:174-177].
   - Example: TL_1 `v4.1.2` is live up to p080 and was made by the update point after p040. Its notes read "current live version, update after p040".
   - DZ82 changed the four sketch rows in section 15.31.2 (lines 6355 to 6358). The values stay invented.
10. The owner hand step 8.10a runs on deploy day (round 84 answer 8 "With the v2 deploy (Recommended)"). It uploads the page images, also the 295 `tanden_full` images, to `/opt/pocketbase-v2/page-images` on the server `[brief fact, aki-main check 2026-11-02]`.
11. The ToC rows of three books are applied (round 83 answers 6 to 10 and 22). The owner kept three rules. "First tier only" covers the deeper lines of `etiqu1_full`. "No rows" covers the DVD list of `sumiss10_c1_full` p003. "Keep ToC wording" covers the ToC against the page.
   - Example of "Keep ToC wording": `sumiss10_c1_full` order 2 reads "第1章 「小手技」の基本" in the ToC. The page `page_009.md` line 4 reads "第1 「小手技」の基本". The row keeps the ToC wording [file: <TMP>/r82/TV82/spot-sumiss10_c1_full.md:6].
   - Example of the page offset: `etiqu1_full` order 2 "第一章 日本人と剣道" has `page_ref` 7 and `pdf_page` 9 [file: <TMP>/r82/TV82/spot-etiqu1_full.md:6].
   - The four other TV82 rules are kept: "Drop the ◉ bullet", "Join wrapped titles", "Chapter number plus title", and "Columns are level 2 rows". The old md flaws of `kodass200_full` stay (answer 21 "Leave them").
   - Unit TV83 does the last two ToC books, `sumiss_train_full` and `tani_ss_full` (answer 22 "Do them now, TV83 (Recommended)"). Its result is Not verified.
12. Process answers. Round 83 answers 2 and 3 accept VW77b2 and the TF82 patch. Answer 18 keeps six VW77b2 rules. Answer 20 lists five Viewer fixes for unit TF83. Round 84 answer 6 adds the web year fold and the gray Clear mark to TF83, so TF83 has seven items.
   - Round 82 answer 14 (PST on `/translate` and `/admin` in a later unit) now sits in TF83 (round 83 answer 20, item "PST on translate and admin (Recommended)").
   - Round 84 answer 5 lists the eight items of this unit. Round 84 answer 7 starts DZ82, TR77d1, TF83, CE82, and TV83. Round 84 answer 10 accepts the batch before the commits.
   - Round 84 answer 9: aki-main deleted eight old temp folders. This is housekeeping and changes no rule.
   - Round 84 answer 11 plans TR77d2, VW77c (Details view), the phase 2 run command, and VW77d (Run settings panel). Nothing starts before a later owner answer.

##### 15.36.5 Lines of this file that DZ82 changed in place

Each row is one line of this file. The unit changed the line in place. The line count above this section is the same before and after the edit. Quoted old answers stay as they were.

| Line | Old text in short | New text in short | Source |
|---|---|---|---|
| 3403 | stamped article sits in print month | web year and month | round 83 answer 4 and round 84 answer 1, qa-memory-2026-11-02.md:99,127 |
| 4305 | Viewer writes four kinds of files | five kinds, request.done.json added | round 83 answers 12 and 13, qa-memory-2026-11-02.md:107,108 |
| 4305 | check accepts PAUSE and request.json | adds request.done.json and the code check | round 83 answers 12 and 13, qa-memory-2026-11-02.md:107,108 |
| 4451 | stamped article in print month, 63654ba0 in August 2011 | web year rule, 63654ba0 moves to April 2025 | round 83 answer 4 and round 84 answer 1, qa-memory-2026-11-02.md:99,127 |
| 4453 | stamped 2018 article makes a web-only month | four web-only month folds go away | round 83 answer 4, qa-memory-2026-11-02.md:99 |
| 6336 | notes pending owner check | notes accepted in round 79 answers 4 and 5 | round 79 answers 4 and 5, qa-memory-2026-11-01.md:96,97 |
| 6338 | sketch shows 4 of 16 rows | adds the DZ78 order and run names | round 83 answer 16, qa-memory-2026-11-02.md:111 |
| 6355 | sketch row in older note order | row in DZ78 order with run name | round 83 answer 16, qa-memory-2026-11-02.md:111 |
| 6356 | sketch row in older note order | row in DZ78 order with run name | round 83 answer 16, qa-memory-2026-11-02.md:111 |
| 6357 | sketch row in older note order | row in DZ78 order with run name | round 83 answer 16, qa-memory-2026-11-02.md:111 |
| 6358 | sketch row in older note order | row in DZ78 order with run name | round 83 answer 16, qa-memory-2026-11-02.md:111 |
| 6769 | Restart dialog and Clear mark come in VW77b2 | VW77b2 built them, e7b4b5d | round 83 answer 2, qa-memory-2026-11-02.md:97 |
| 7231 | option 1 reading pending owner check | reading confirmed | round 83 answer 5, qa-memory-2026-11-02.md:100 |
| 7264 | results of four units Not verified | pointer to section 15.36.3 | plan file lines 29 to 37 |
| 7323 | cause Not verified, SV82 surveys | SV82 found the cause | round 83 answer 4, qa-memory-2026-11-02.md:99 |
| 7351 | step 8.10a state Not verified | step runs with the v2 deploy | round 84 answer 8, qa-memory-2026-11-02.md:134 |
| 7383 | what Clear mark deletes Not verified | moves request.json, gray rule | round 83 answers 11 to 13, qa-memory-2026-11-02.md:106-108 |
| 7387 | no unit is named for PST on /translate and /admin | unit TF83 named | round 83 answer 20, qa-memory-2026-11-02.md:115 |
| 7411 | refused line wording Not verified | own line under line 2 | round 83 answer 17, qa-memory-2026-11-02.md:112 |
| 7478 | reading pending owner check | reading confirmed | round 83 answer 5, qa-memory-2026-11-02.md:100 |
| 7479 | retriever can return the human EN | adds: only for a train-retrieval article | round 83 answer 1, qa-memory-2026-11-02.md:96 |
| 7482 | SV82 result Not verified | pointer to section 15.36.3 | plan file line 29 |
| 7492 | runs in round 82, Not verified (4 rows) | result in section 15.36.3 (4 rows) | plan file lines 29 to 37 |
| 7493 | runs in round 82, Not verified (4 rows) | result in section 15.36.3 (4 rows) | plan file lines 29 to 37 |
| 7494 | runs in round 82, Not verified (4 rows) | result in section 15.36.3 (4 rows) | plan file lines 29 to 37 |
| 7495 | runs in round 82, Not verified (4 rows) | result in section 15.36.3 (4 rows) | plan file lines 29 to 37 |
| 7576 | open item 1: confirm reading, wrong retriever claim | decided, claim fixed | round 83 answers 1 and 5, qa-memory-2026-11-02.md:96,100 |
| 7577 | open item 2: refused line wording | decided: own line under line 2 | round 83 answer 17, qa-memory-2026-11-02.md:112 |
| 7578 | open item 3: hand step 8.10a now or later | decided: with the v2 deploy | round 84 answer 8, qa-memory-2026-11-02.md:134 |
| 7582 | Not verified: four results | pointer to section 15.36.3 | plan file lines 29 to 37 |
| 7585 | Not verified: cause of 9 web articles | found by SV82 | plan file line 29 |
| 7586 | Not verified: step 8.10a | runs with the v2 deploy | round 84 answer 8, qa-memory-2026-11-02.md:134 |
| 7588 | Not verified: Viewer reads restart_requested_utc | Viewer reads it first, then requested_utc | file check, book-status-rules.ts:361 |
| 7589 | Not verified: refused line wording | decided: own line under line 2 | round 83 answer 17, qa-memory-2026-11-02.md:112 |
| 7590 | reading at line 88 waits | reading confirmed | round 83 answer 5, qa-memory-2026-11-02.md:100 |
| 7592 | Not verified: what Clear mark deletes | moves and overwrites request.done.json | round 83 answers 12 and 13, qa-memory-2026-11-02.md:107,108 |
| 7595 | status: items wait | status: items answered in rounds 83 and 84 | rounds 83 and 84 |

Open items that rounds 83 and 84 closed:

- Section 15.35.13, item 1 (reading of round 82 answer 20): closed by round 83 answer 5. The retriever claim in the same item is fixed.
- Section 15.35.13, item 2 (wording of the refused line): closed by round 83 answer 17.
- Section 15.35.13, item 3 (hand step 8.10a): closed by round 84 answer 8.
- Section 15.34.12, item 2 (the line stated the reading as pending): closed by round 83 answer 5.
- Sections 15.33.12 and 15.34.12: DZ82 found no other open item that round 83 or 84 answered.

Lines that stay as history, checked by the unit:

- Line 4535 quotes round 70 answer 6, "Print month (Recommended)". Lines 4566 and 4569 are dated checks of 2026-10-30. They stay.
- Line 3430 sits in a code block and shows the fold "September 2018". The code block stays as it is. The fold goes away when TF83 ships (section 15.36.4, item 1).
- Line 7313 quotes the note at line 89 of an earlier Q-A file state. The correction sits in item 3 of section 15.36.4.
- The tables of rounds 80 to 82 (sections 15.33.10, 15.34.10, 15.35.11) list lines of those rounds. They stay.

##### 15.36.6 Unit defaults of DZ82

No owner answer settles these items.

1. `[unit default DZ82]` Rule: open item 1 keeps the wrong sentence of DZ81 as a quote, marked "Old sentence, wrong". Example: VISION line 7576. Other option: delete the old sentence. Benefit: a reader sees what was wrong. Cost: the line is longer.
2. `[unit default DZ82]` Rule: a line that says "Not verified" or "runs in round 82" about a round 82 unit gets a pointer to section 15.36.3. Example: VISION lines 7492 to 7495. Other option: leave these lines as history. Benefit: a reader sees the current state. Cost: the line no longer shows what DZ81 knew at write time.
3. `[unit default DZ82]` Rule: the four sketch rows in this file, section 15.31.2, name the run ("run 1"). They use the short page count ("(80)"). A start version reads "no critiques used". Example: TS_0 `v4.1.0`. Other option: widen the box in all 23 lines. Benefit: only four lines change. Cost: the rows read less like the pick list table.
4. `[unit default DZ82]` Rule: the rows TL_1 and QA_3 of the sketch get the note "current live version". The book stands at p080 and both versions are live up to p080. Example: TL_1 `v4.1.2` is live on p041 to p080. Other option: keep one note for each row. Benefit: the rows follow the rule and the code. Cost: the row text is longer.
5. `[unit default DZ82]` Rule: each of the four renamed events carries `[owner, round 84 answer 4]` on its own line. The events `update-point-ended` and `prompts-copied` keep the tag of their list. Example: design line 6849. Other option: tag the list once. Benefit: a reader of one line sees the source. Cost: four tags instead of one.
6. `[unit default DZ82]` Rule: DZ82 also changed the spaced event names on three more lines that the brief did not name: design lines 6814, 6890, and 7538. Example: line 6890 reads "writes the event `prompt-live`". Other option: leave these lines with the old names. Benefit: one name for each event in the file. Cost: three more changed lines.
7. `[unit default DZ82]` Rule: the quoted notes of aki-main stay as quotes, also where the note is wrong. The correction sits in section 15.36.4, item 3. Example: VISION line 7313. Other option: edit the quote. Benefit: quotes stay exact. Cost: a wrong note stays visible.
8. `[unit default DZ82]` Rule: an example that shows a book state with no real run uses a real book ID and the words "example state (not run data)". Example: `mental_full` in item 4 of section 15.36.4. Other option: use invented IDs. Benefit: the owner sees real names. Cost: a reader can take the state for a fact, so the label must stay.

##### 15.36.7 Open items for the owner

The first option of each item is the recommended option.

1. Notes order in older sketches and tables `[aki-main proposal]`. Recommended: a later docs unit changes the older rows to the DZ78 order. Example: the pick list of ED_2 in section 15.32.2 (lines 6517, 6520, 6523) reads `v4.1.6`: "update after p075, last version of run 1". The DZ78 order and the code give "last version of run 1, update after p075". Benefit: all docs show the order that the screen shows. Cost: one more docs unit, and the row `v4.2.2` changes too. Other option: keep the older rows as history.
2. Folder name in the Restart dialog sketch `[aki-main proposal]`. Recommended: a later docs unit changes `archive/<time>/` to `archive/<run ID>/` in the code block of section 15.31.2 (line 6344 of `<V2>/docs/VISION-viewer.md`). Round 79 answer 10 chose "Run ID of the ended run (Recommended)". Example: `archive/20261104T001500-0800/` (invented run ID of DZ78). Benefit: the sketch matches the rule. Cost: one more docs edit. Other option: keep `archive/<time>/`.
3. Own human EN in year book runs `[aki-main proposal]`. Recommended: keep round 82 answer 21 "No rule". Example: the book `kendojidai_2019` holds 10 `train-retrieval` articles. The retriever can return the human EN of `d7835263` while that article runs. Benefit: no new rule and no code. Cost: a score on a `train-retrieval` article of a year book run is not clean `[agent inference]`. The 27 `test` articles stay clean. Other option: skip the units of the same article in the retriever. Benefit: every score is clean. Cost: new code in the retriever.

##### 15.36.8 Not verified

- The results of TR77d1, TF83, CE82, and TV83 of round 84 are Not verified. They run while this unit writes.
- The code of `STAMPED_PLACE` reads "print" at the write time. The web year fold on the live Reader dashboard `/read` is Not verified.
- The fold numbers of the table in item 1 come from the files of SV82 and from the brief. DZ82 added no live GET of `/read`.
- The gray Clear mark on a Run mark with `after` "restart" is not built at the write time. Its result is Not verified.
- The reason why the owner wants Clear mark grayed on this mark is Not verified. No Q-A line states it.
- DZ82 read the code of VW77b2 in four files (`book-restart-actions.ts`, `restart-rules.ts`, `book-status-rules.ts`, `book-actions.ts`). It ran no test.
- The state of the owner hand step 8.10a is Not verified. It runs with the v2 deploy.
- The deploy day is Not verified. No file names a date.
- The server path `/opt/pocketbase-v2/page-images` comes from the brief. DZ82 did not check the server.
- The dev server on port 3000 and PocketBase on port 8090 were not read or changed.

Status: round 83 and 84 answers applied by unit DZ82. Items in section 15.36.7 wait for the owner.
