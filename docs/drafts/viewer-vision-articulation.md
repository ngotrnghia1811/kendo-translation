# Vision articulation: the Viewer

- Status: DRAFT for owner validation, revision 2.
- Date: 2026-10-07, after question round 16 at 23:47. Timing set by `[accepted recommendation 2026-10-07 23:47]` "After this round (Recommended)".
- Author: aki-execute for aki-main.
- Purpose: one place that holds what the owner said and validated about the Viewer, as the base for `docs/VISION-viewer.md`.
- Out of scope: design (no data schema, API, component code, color, or font name), proposals, and literature claims.
  - Proposals appear only if the owner asks `[accepted recommendation 2026-10-07 20:05]` "Accept this process (Recommended)".
  - Proposals P1 to P11 of revision 1 are not approved `[user 2026-10-07 14:58]` "Did not read. check my previous answers and redo this process".
- Revision 1 note: the owner rejected revision 1 `[user 2026-10-07 14:58]` "You are suppose to go through the same writing process with me as Translator Vision, not just hallucinate it all on your own. Review how the previous session work. THEN DO IT PROPERLY".
  - The file moved to `docs/drafts/rejected/` `[accepted option 2026-10-07 20:05]` "Move to drafts/rejected/".
  - Revision 1 is not a source for this draft. aki-execute did not read it.

## One-page summary

Part A. Confirmed

- A-01. Process: owner statements, then one articulation per point, then owner validation, then revision 2 from validated points only, then `docs/VISION-viewer.md` `[accepted recommendation 2026-10-07 20:05]` "Accept this process (Recommended)".
- A-02. Two objectives, owner first message, primary source `[user 2026-10-07 20:05]` "Viewer focus on two objection:\n+ Best user reading experience and efficiency\n+ user Flexible and customizable UI for reading components".
- A-03. Objective 1, reading experience `[validated reading 2026-10-07 23:47]`:
  - The text sits at the center, and controls stay hidden until the reader needs them `[validated reading 2026-10-07 23:47]`.
  - The path goes dashboard, then work, then page, with no dead ends `[validated reading 2026-10-07 23:47]`.
  - Kendo terms are highlighted, and one click shows the definition from the kendo dictionary `[validated reading 2026-10-07 23:47]`.
  - The quality bar is `[user 2026-10-07 14:05]` "Make it like a professional book reading website."
- A-04. Objective 1, efficiency means four things `[accepted recommendation 2026-10-07 23:47]` "Fast loading (Recommended), Fast lookup (Recommended), Fast comparison (Recommended), Few steps (Recommended)".
  - Fast work for translator and admin was not picked `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:123]`.
- A-05. Objective 2, customizable UI `[validated reading 2026-10-07 23:47]`:
  - The reader checks components in a list, and moves, resizes, hides, and shows panels `[validated reading 2026-10-07 23:47]` (owner words in section 3.1).
  - A panel is one screen area that holds one component `[validated reading 2026-10-07 23:47]` `[agent inference]`.
  - The reader picks components first, before reading `[accepted option 2026-10-07 14:58]` "Reader picks first".
  - The layout is saved per account, across all devices `[accepted option 2026-10-07 14:58]` "Per account, all devices".
  - Phones are in scope, with a simpler layout `[accepted recommendation 2026-10-07 14:58]` "In scope, simpler layout (Recommended)".
- A-06. Place in v2 `[validated reading 2026-10-07 20:05]`:
  - The Viewer is a new app that starts empty `[accepted recommendation 2026-10-02 19:20]` "New app, live stays v1 (Recommended)".
  - No v1 code or v1 decision carries over, except the three roles `[validated reading 2026-10-07 20:05]`.
  - The live site stays v1 until the owner names a switch date `[validated reading 2026-10-07 20:05]`.
  - Order: `[user 2026-10-07 14:05]` "Work on viewer vision -> desgin of both -> then code".
  - Design order: `[accepted option 2026-10-07 14:58]` "Translator design first".
- A-07. Readers and roles `[validated reading 2026-10-07 20:05]`:
  - Audience: `[accepted recommendation 2026-10-02 19:40]` "Public readers (Recommended)" and `[user 2026-10-07 14:05]` "Reader across ALL languages".
  - Roles: `[user 2026-10-07 14:58]` "all users need sign in - 3 roles (reader - translator - admin) like in v1".
  - Sign-up: `[user 2026-10-07 20:05]` "option 1. Also admin have to validate reader signup before they can actually view the contents".
  - Before approval, the person sees the dashboard index but no text `[accepted option 2026-10-07 23:47]` "Dashboard index, no text".
- A-08. Content scope in the owner words `[user 2026-10-07 14:05]` "Refer to previous question about reading components. Reader can have diffent component options for the same languagues (i.e., EN-original, EN-translated)".
  - The Viewer shows Translator output `[accepted recommendation 2026-10-02 19:40]` "Viewer shows Translator output (Recommended)".
  - Names: `[user 2026-10-07 20:05]` "Need to specif `EN-translated` to `EN-trans-human` (human translation), and `EN-trans-machine` (machine translation)".
  - Third kind: `[user 2026-10-07 23:47]` "option 1. but EN-original mean the item is originally written in English".
  - Human EN with changed facts: `[accepted recommendation 2026-10-07 23:47]` "As published, facts marked (Recommended)".
- A-09. Types of viewing `[validated reading 2026-10-07 20:05]`:
  - Owner list: `[user 2026-10-07 14:05]` "single language viewing, bilingual viewing, raw data view, translation viewing, etc".
  - Raw data view: `[accepted recommendation 2026-10-07 14:58]` "Original Japanese source (Recommended)".
  - Types named from v1: `[user 2026-10-07 23:47]` "Single language (Recommended), Bilingual pairing (Recommended), Focus mode (Recommended), Themes, fonts, size (Recommended), Aligned table (Recommended), Original page view (Recommended)".
  - Original page view: `[user 2026-10-07 23:47]` "User should be able to view page-by-page efficiently".
- A-10. Kendo terms `[validated reading 2026-10-07 20:05]`:
  - Owner words: `[user 2026-10-07 14:05]` "option 1, also highlight the term. when reading ,user can click the term of pop-up definition of the term".
  - Source: `[user 2026-10-07 14:58]` "From the kendo dictionary. check v1 for all the kendo dictionary sources".
  - Files: `kendo_dict.md` plus the two supplements `[user 2026-10-07 23:47]` "option 1. I think option 1 is also v1".
  - VI and KO gap: `[accepted recommendation 2026-10-07 23:47]` "State the gap, decide later (Recommended)".
- A-11. Reader customization: the component checklist, movable panels, reader picks first, per account, and phone layout of A-05 are a correct reading `[validated reading 2026-10-07 20:05]` (section 9).
- A-12. Dashboard and search `[validated reading 2026-10-07 20:05]`:
  - Owner words: `[user 2026-10-07 14:05]` "option 3. and dashboard homepage should be an index of all current items (in category folds)  and their translation progresses."
  - Folds: `[accepted recommendation 2026-10-07 14:58]` "Kind, then series or source (Recommended)".
  - Progress: `[accepted recommendation 2026-10-07 14:58]` "Finished share per language (Recommended)".
  - Items: `[accepted recommendation 2026-10-07 14:58]` "Every work, also at zero (Recommended)".
  - Search: `[accepted recommendation 2026-10-07 14:58]` "All works, all languages (Recommended)".
- A-13. Languages `[user 2026-10-07 20:05]` "Correct, plus JA interface":
  - Content: `[accepted recommendation 2026-10-07 14:58]` "Audience all, content EN first (Recommended)".
  - Interface: `[accepted recommendation 2026-10-07 14:58]` "English first, then with content (Recommended)".
  - The interface also comes in Japanese `[user 2026-10-07 20:05]` "Correct, plus JA interface".
- A-14. Feedback `[validated reading 2026-10-07 20:05]`:
  - Path: `[accepted recommendation 2026-10-07 14:05]` "One "report a problem" path (Recommended)".
  - Use: `[user 2026-10-07 14:05]` "option 3 for now. We will go through the feedback processing later".
  - Status and log: `[accepted recommendation 2026-10-07 14:05]` "Public status and change log (Recommended)".
- A-15. Research layer, scores, AI label `[user 2026-10-07 20:05]` "Correct, admin only records":
  - Place: `[user 2026-10-07 14:05]` "option 1. also only available to translator and admin roles".
  - Scores: `[user 2026-10-07 14:05]` "only show to translator and admin".
  - AI label: `[accepted recommendation 2026-10-07 14:58]` "AI plus human check status (Recommended)".
- A-16. Later items `[user 2026-10-07 20:05]` "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines."
  - The A4 rule reading is correct `[validated reading 2026-10-07 23:47]`.
  - Licence: `[user 2026-10-05 23:48]` "option 4. you dont have to bother about the license/permission/etc" covers the Viewer `[accepted recommendation 2026-10-07 14:58]` "Same answer covers the Viewer (Recommended)".

Part B. Open

- Readings pending owner check (section 15):
  - B-01. AI label as item metadata, round 16 answer 4.
  - B-02. Original page view, page by page, round 16 answer 5.
  - B-03. EN-original, round 16 answer 8.
- Open items, no reading and no fix:
  - B-04. Meaning of "translation viewing" and of "etc" in round 13 answer 5 (section 7).
  - B-05. VI and KO definitions for the supplement terms (section 8).
  - B-06. Translator editing inside the Viewer is not stated in the record (section 5).
  - B-07. Shared output format, article page line count, and font size are for the design phase (sections 4 and 14).
  - B-08. Switch date of the live site stays with the owner (sections 4 and 14).
  - B-09. Feedback processing is a later topic (section 12).

Part C. Where to read more

- Legend 0, owner first message 1, objective 1 in section 2, objective 2 in section 3.
- Points 1 to 11 in sections 4 to 14: place in v2 4, readers and roles 5, content scope 6, types of viewing 7, kendo terms 8, reader customization 9, dashboard and search 10, languages 11, feedback 12, research layer and AI label 13, later items 14.
- Readings pending owner check 15, register pointer 16, trace table 17, Not verified and change log 18.

## 0. Legend and conventions

### 0.1 Labels

| Label | Meaning |
|---|---|
| `[user YYYY-MM-DD HH:MM] "..."` | Owner words typed by the owner. Verbatim, typos and double spaces included. |
| `[accepted recommendation YYYY-MM-DD HH:MM] "..."` | An agent-written option marked "(Recommended)" that the owner picked. Not owner words. The owner set this rule on 2026-10-07 20:05: "`\"Viewer shows Translator output (Recommended)` is your recommendation that I accept, not `my words`". |
| `[accepted option YYYY-MM-DD HH:MM] "..."` | An agent-written option without "(Recommended)" that the owner picked. Not owner words. |
| `[validated reading YYYY-MM-DD HH:MM]` | An aki-main reading that the owner marked correct at that time. |
| `[agent inference]` | A part of a validated reading that aki-main marked as inference when the owner validated it. Keep the mark. |
| `[reading pending owner check]` | Part B only. A reading that the owner has not validated yet. |
| `[file: path:line]` | A fact from a project file. |
| `[aki-main check]` | A fact that aki-main checked with its own commands. |
| `Not verified` | No checked source supports it. |

### 0.2 Conventions

- Source of owner words and owner choices: the project-local Q-A memory only.
  - `.opencode/reminders/qa/qa-memory-2026-10-07.md`, rounds 12 to 16.
  - `.opencode/reminders/qa/qa-memory-2026-10-02.md`, rounds 1 to 11 (round 11 is tagged 2026-10-05 23:48).
- Quotes keep the Q-A memory text character for character.
  - A literal `\n` or `\"` in a quote is how the Q-A memory stores the answer.
  - Text after "->" in the Q-A memory is an aki-main relay. This draft never quotes it as owner words.
- Mixed answers: when an owner answer mixes a picked option and typed words, the draft quotes the whole answer under `[user ...]` and names the picked option.
- Typed or picked: the Q-A memory does not always show whether a short answer without "(Recommended)" was typed or picked.
  - The draft tags such a short label as `[accepted option ...]`, for example "Reader picks first", "Per account, all devices", "Translator design first".
  - The draft tags an answer with typos, lowercase free text, or added content as `[user ...]`, for example "Reader across ALL languages", "Correct, plus JA interface".
  - Section 18 lists these tag choices as Not verified.
- Reading texts and option texts: the Q-A memory holds short forms only.
  - The full texts in this draft are the texts that aki-main showed the owner, as aki-main gave them in the U8 work unit.
  - A reading text carries `[validated reading ...]`. An option text appears as "option text shown to the owner".
- Examples: an example appears only where the owner saw it during validation.
- Style: `[user 2026-10-02 07:50]` "Lil'Log wins in drafts". Where the Lil'Log guide is silent, the draft uses plain English and multi-level bullets.
- v1: aki-execute did not read any v1 worktree. v1 facts come from aki-main and carry `[aki-main check]` or `[file: ...]`.

## 1. The owner first message

- Owner words, verbatim `[user 2026-10-07 20:05]`:
  - "Viewer focus on two objection:\n+ Best user reading experience and efficiency\n+ user Flexible and customizable UI for reading components"
- How the draft uses it:
  - The message is the primary source. It wins over any reading `[accepted recommendation 2026-10-07 20:05]` "Accept this process (Recommended)".
  - Objective 1, "Best user reading experience and efficiency", is section 2.
  - Objective 2, "user Flexible and customizable UI for reading components", is section 3.
  - Points 1 to 11 (sections 4 to 14) hold the decisions that serve the two objectives.

## 2. Objective 1: "Best user reading experience and efficiency"

### 2.1 Owner words

- `[user 2026-10-07 20:05]` "+ Best user reading experience and efficiency"
- Quality bar `[user 2026-10-07 14:05]`: "Make it like a professional book reading website."

### 2.2 Validated reading, part 1: reading experience

- Owner answer: `[accepted recommendation 2026-10-07 23:47]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 23:47]`:
  - The text sits at the center. Controls stay hidden until the reader needs them.
  - The path goes dashboard, then work, then page, with no dead ends.
  - Kendo terms are highlighted, and one click shows the definition from the kendo dictionary.
  - The quality bar is the owner phrase "Make it like a professional book reading website." `[user 2026-10-07 14:05]`.
- Example shown to the owner:
  - Work: article p1, snapshot record `d7835263-fe16-4f05-8c51-98b2a8aa0a3e`, 「王者は面をどう打つか：北条将臣」 `[aki-main check]`.
  - The term 出ばな面 (Debana-men) gets a pop-up.
  - The definition comes from supplement 1, `/Users/nghiango-mbp/Downloads/kendo_dictionary_update.md`.
    - JA line `[file: /Users/nghiango-mbp/Downloads/kendo_dictionary_update.md:668]`: "出ばな面 (でばなめん / Debana-men): 相手が動き出した瞬間（出ばな）を捉えて放つ面打ち。..."
    - EN line `[file: /Users/nghiango-mbp/Downloads/kendo_dictionary_update.md:669]`: "*Debana* head strike: A *men* (面 — head target) strike executed by capturing the moment the opponent begins to move (*debana*); ..."
  - The term is not in v1 `kendo_dict.md` `[aki-main check]`.

### 2.3 Validated choice, part 2: efficiency

- Owner answer: `[accepted recommendation 2026-10-07 23:47]` "Fast loading (Recommended), Fast lookup (Recommended), Fast comparison (Recommended), Few steps (Recommended)".
- Option texts shown to the owner:
  - Few steps: two clicks from the dashboard to the text, and the reader resumes the last page on any device.
  - Fast comparison: a tap on a sentence marks its pair in the other panels, and the panels scroll together.
  - Fast loading: pages open fast, also on a phone or a slow network.
  - Fast lookup: a one-click term pop-up, and search across all works and all languages.
- Not picked: fast work for translator and admin.

## 3. Objective 2: "user Flexible and customizable UI for reading components"

### 3.1 Owner words

- `[user 2026-10-07 20:05]` "+ user Flexible and customizable UI for reading components"
- Round 13 answer 7 `[user 2026-10-07 14:05]`: "Reader should be able to customize their reading experience, including able to customize their UI: add/remove components (raw images, text in different languages, ruby, bilingual pairing, etc) - these components should be a list that reader checks to selects. User should also able to move, resize, hide, show, etc customize their panels"

### 3.2 Validated reading

- Owner answer: `[accepted recommendation 2026-10-07 23:47]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 23:47]`:
  - Component list:
    - Page image of the original (books only).
    - JA source text.
    - Ruby.
    - EN-trans-human and EN-trans-machine.
    - ZH, KO, and VI text, when each arrives.
    - Bilingual pairing.
    - Kendo term highlights.
  - A panel is one screen area that holds one component `[agent inference]`.
  - The reader checks components in a list, and moves, resizes, hides, and shows panels.
  - The reader picks components first, before reading.
  - The layout is saved per account, across all devices.
  - Phones are in scope, with a simpler layout.
- Example shown to the owner:
  - Work: article p252, record `b5106cae-44f6-4a27-a91f-8c75312fcce9`, in three panels: JA, EN-trans-human, EN-trans-machine.
  - The JA says 世界選手権大会団体優勝4回 `[aki-main check]`.
  - The kendojidai EN says "winning the World Kendo Championships team title 3 times" `[aki-main check]`.

## 4. Point 1: place in v2

### 4.1 Owner words and choices

- `[user 2026-10-07 14:05]` "Work on viewer vision -> desgin of both -> then code"
- `[accepted option 2026-10-07 14:58]` "Translator design first"
- `[user 2026-10-07 14:58]` "all users need sign in - 3 roles (reader - translator - admin) like in v1"
- `[accepted recommendation 2026-10-02 19:20]` "New app, live stays v1 (Recommended)"
- `[accepted recommendation 2026-10-02 11:43]` "After Translator VISION.md (Recommended)"
- Translator vision cross-reference: `docs/VISION.md` section 3 records the Viewer decisions `[file: docs/VISION.md:53]` to `[file: docs/VISION.md:56]`.

### 4.2 Validated reading

- Owner answer: `[accepted recommendation 2026-10-07 20:05]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 20:05]`:
  - The Viewer is a new app that starts empty.
  - No v1 code or v1 decision carries over, except the three roles.
  - The live site stays v1 until the owner names a switch date.
  - The order is Viewer vision, then design (Translator first, then Viewer), then code.
  - The shared output format is decided in the design phase.
    - Translator vision cross-reference: `[file: docs/VISION.md:382]` and `[file: docs/VISION.md:383]`.
- Example: none shown to the owner.

### 4.3 Open in this point

- Shared output format: design phase (B-07).
- Switch date of the live site: owner (B-08).

## 5. Point 2: readers and roles

### 5.1 Owner words and choices

- `[accepted recommendation 2026-10-02 19:40]` "Public readers (Recommended)"
- `[user 2026-10-07 14:05]` "Reader across ALL languages"
- `[user 2026-10-07 14:58]` "all users need sign in - 3 roles (reader - translator - admin) like in v1"
- `[user 2026-10-07 20:05]` "option 1. Also admin have to validate reader signup before they can actually view the contents"
  - The answer picks option 1 and adds the approval rule.
  - Option 1 text shown to the owner: any member of the public signs up and gets a reader account. An admin gives translator and admin roles.
- `[accepted option 2026-10-07 23:47]` "Dashboard index, no text"

### 5.2 Validated reading

- Reading `[validated reading 2026-10-07 20:05]`:
  - Readers are the public, in all languages.
  - Every person signs in.
  - Three roles: reader, translator, admin.
    - A reader reads, picks components, and reports problems.
    - Translator and admin also see the research layer and the scores.
  - Translator editing inside the Viewer is not stated in the record.
- Owner addition (quoted in section 5.1): an admin approves each reader sign-up before the reader can view content.
- Before approval `[accepted option 2026-10-07 23:47]`: the person sees work titles and translation progress on the dashboard, but cannot open any text.
- Example: none shown to the owner.

### 5.3 Open in this point

- Translator editing inside the Viewer: not stated (B-06).

## 6. Point 3: content scope

### 6.1 Owner words and choices

- Scope in the owner words, round 13 answer 10 `[user 2026-10-07 14:05]`:
  - "Refer to previous question about reading components. Reader can have diffent component options for the same languagues (i.e., EN-original, EN-translated)"
- Owner rule on wording `[user 2026-10-07 14:58]`: "EXACTLY AS I SAID. YOU DONT UNDERSTAND BECAUSE YOU JUST HALLUCINATE THE WHOLE VISION docs"
- Point 3 answer `[user 2026-10-07 20:05]`:
  - "option 1. but a few notes:\n+ `\"Viewer shows Translator output (Recommended)` is your recommendation that I accept, not `my words`\n+ Need to specif `EN-translated` to `EN-trans-human` (human translation), and `EN-trans-machine` (machine translation)"
- `[accepted recommendation 2026-10-02 19:40]` "Viewer shows Translator output (Recommended)"
- Names, round 16 answer 8 `[user 2026-10-07 23:47]`: "option 1. but EN-original mean the item is originally written in English"
- Human EN with changed facts, round 16 answer 9 `[accepted recommendation 2026-10-07 23:47]`: "As published, facts marked (Recommended)"
- Earlier source decision `[user 2026-10-02 19:40]`: "source materials are the kendo books in universal-agent. the target languages are EN,ZH,KO,VI most initial research works will be with EN. then expand and customize to other language"

### 6.2 Validated reading and names

- The scope keeps the owner words of section 6.1. The draft adds no rewording, per the owner rule "EXACTLY AS I SAID" `[user 2026-10-07 14:58]`.
- Names, option 1 text shown to the owner and picked in round 16 answer 8 (quoted in section 6.1):
  - EN-trans-human: a human translation into English that exists outside the project, for example the kendojidai EN of the 313 article pairs.
  - EN-trans-machine: Translator output (the final `ED_3` text).
  - The same naming pattern applies later to ZH, KO, and VI `[agent inference]`.
- EN-original: an item first written in English, a third kind (owner words, quoted in section 6.1).
  - Its reading is pending (section 15, B-03).
- Human EN with changed facts `[accepted recommendation 2026-10-07 23:47]`:
  - The reader sees the EN-trans-human text as kendojidai published it.
  - A mark on each changed fact shows the JA fact.
- Example: the p252 case of section 3.2 shows one changed fact. The JA says 4 team titles, and the kendojidai EN says 3 `[aki-main check]`.

## 7. Point 4: types of viewing

### 7.1 Owner words and choices

- Round 13 answer 5 `[user 2026-10-07 14:05]`:
  - "Viewer focus on the VIEWING  experience first. Be VIEWING  I mean ALL TYPES of VIEWING - single language viewing, bilingual viewing, raw data view, translation viewing, etc Make it like a professional book reading website."
- Raw data view, round 14 answer 8 `[accepted recommendation 2026-10-07 14:58]`: "Original Japanese source (Recommended)"
- Point 4 answer `[user 2026-10-07 20:05]`: "option 1. also check v1 for different mode of viewing contents"
- Types to keep, round 16 answer 5 `[user 2026-10-07 23:47]`:
  - "Single language (Recommended), Bilingual pairing (Recommended), Focus mode (Recommended), Themes, fonts, size (Recommended), Aligned table (Recommended), Original page view (Recommended), for option 4, need a better solution. v1 basically load the whole book from ggdrive, so user have to wait. User should be able to view page-by-page efficiently"
  - The answer picks six options and adds a note on option 4.
  - Not picked: tap to reveal, two-column width.

### 7.2 Validated reading

- Reading `[validated reading 2026-10-07 20:05]`:
  - Types of viewing: single language viewing, bilingual viewing, raw data view, translation viewing, and "etc".
  - Raw data view: the original JA source. For a book, a page image plus JA text with ruby. For an article, the JA text.
  - "Professional" sets the quality level.
- v1 facts (facts only, no v1 decision carries over):
  - v1 has four reader modes: `export type ReaderMode = 'single' | 'bilingual' | 'aligned' | 'pdf'` `[file: kendo-translation-viewer-v1/hooks/useReaderView.ts:7]` `[aki-main check]`.
  - The aligned mode is limited to translator and admin `[aki-main check]`.
  - The pdf mode shows a paired bilingual PDF in a frame `[aki-main check]`.
- The note on the original page view has no validated reading yet (section 15, B-02).
- Example: none shown to the owner.

### 7.3 Open in this point

- Meaning of "translation viewing", and what "etc" covers (B-04).

## 8. Point 5: kendo terms

### 8.1 Owner words and choices

- Round 13 answer 6 `[user 2026-10-07 14:05]`: "option 1, also highlight the term. when reading ,user can click the term of pop-up definition of the term"
- Round 14 answer 13 `[user 2026-10-07 14:58]`: "From the kendo dictionary. check v1 for all the kendo dictionary sources"
- Point 5 answer `[user 2026-10-07 20:05]`: "option 1. Also there is and extended dictionary here: /Users/nghiango-mbp/Downloads/kendo_dictionary_update_2.md and /Users/nghiango-mbp/Downloads/kendo_dictionary_update.md"
- Which sources count, round 15 answer 9 `[user 2026-10-07 20:05]`: "check previous answer"
- Dictionary files, round 16 answer 6 `[user 2026-10-07 23:47]`: "option 1. I think option 1 is also v1"
- VI and KO gap, round 16 answer 7 `[accepted recommendation 2026-10-07 23:47]`: "State the gap, decide later (Recommended)"
- Translator RAG source `[accepted recommendation 2026-10-02 07:50]`: "Kendo dictionary (Recommended)"

### 8.2 Validated reading

- Reading `[validated reading 2026-10-07 20:05]`:
  - The romanized term stays in the text and is highlighted.
  - A click opens a pop-up definition from the kendo dictionary, in the language of the text.
  - One dictionary serves both apps `[agent inference]`.
- The kendo dictionary is three files (option 1 of round 16 answer 6, quoted in section 8.1):
  - v1 `kendo_dict.md`, "剣道三語辞典 / Kendo Trilingual Dictionary" `[aki-main check]`.
    - About 382 entries, JA-EN-ZH copies and a JA-VI-KO copy `[aki-main check]`.
    - Last line: `*Compiled from "Glossary of Terms in Kendo" by Stephen Quinlan (2025)*` `[aki-main check]`.
  - Supplement 1, `/Users/nghiango-mbp/Downloads/kendo_dictionary_update.md`: 3,880 lines, about 640 headwords (estimate), JA-EN-ZH `[aki-main check]`.
  - Supplement 2, `/Users/nghiango-mbp/Downloads/kendo_dictionary_update_2.md`: 772 lines, about 130 headwords (estimate), JA-EN-ZH `[aki-main check]`.
  - Not included: the v1 PocketBase `terminology` collection and the v1 code term lists.
  - The owner notes that the supplements are also v1 sources `[user 2026-10-07 23:47]` "I think option 1 is also v1".
- VI and KO gap `[accepted recommendation 2026-10-07 23:47]`:
  - VI and KO definitions exist only for the base `kendo_dict.md` terms `[aki-main check]`.
  - The two supplements have no VI or KO lines `[aki-main check]`.
  - The draft states this gap. It does not solve it.
- Example: the Debana-men pop-up of section 2.2.

### 8.3 Open in this point

- VI and KO definitions for the supplement terms (B-05).

## 9. Point 6: reader customization

### 9.1 Owner words and choices

- Round 13 answer 7 `[user 2026-10-07 14:05]`: quoted in section 3.1.
- `[accepted option 2026-10-07 14:58]` "Reader picks first"
- `[accepted option 2026-10-07 14:58]` "Per account, all devices"
- `[accepted recommendation 2026-10-07 14:58]` "In scope, simpler layout (Recommended)"

### 9.2 Validated reading

- Owner answer: `[accepted recommendation 2026-10-07 20:05]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 20:05]`:
  - The reader checks components in a list.
  - Panels move, resize, hide, and show.
  - The reader picks first, before reading.
  - The layout is saved per account, across devices.
  - Phones are in scope, with a simpler layout.
- Example: the p252 three-panel case of section 3.2.

## 10. Point 7: dashboard and search

### 10.1 Owner words and choices

- Round 13 answer 8 `[user 2026-10-07 14:05]`: "option 3. and dashboard homepage should be an index of all current items (in category folds)  and their translation progresses."
- `[accepted recommendation 2026-10-07 14:58]` "Kind, then series or source (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "Finished share per language (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "Every work, also at zero (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "All works, all languages (Recommended)"

### 10.2 Validated reading

- Owner answer: `[accepted recommendation 2026-10-07 20:05]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 20:05]`:
  - The dashboard is an index of every work, also at zero progress.
  - Folds go by kind (books, articles), then by series or source.
  - Progress per language is the finished share.
    - "Finished" means a final `ED_3` text with a `QA_3` verdict.
  - Search covers all works in all languages, including romanized terms.
- Example: none shown to the owner.

## 11. Point 8: languages

### 11.1 Owner words and choices

- `[accepted recommendation 2026-10-07 14:05]` "EN first, coverage per work (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "Audience all, content EN first (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "English first, then with content (Recommended)"
- Point 8 answer `[user 2026-10-07 20:05]`: "Correct, plus JA interface"

### 11.2 Validated reading

- Reading `[validated reading 2026-10-07 20:05]`:
  - Content arrives EN first, then ZH, KO, VI, per work.
  - The interface is English first. Other languages arrive with their content.
  - The interface also comes in Japanese (owner addition, quoted in section 11.1).
  - The JA source is always a component.
- Example: none shown to the owner.

## 12. Point 9: feedback

### 12.1 Owner words and choices

- `[accepted recommendation 2026-10-07 14:05]` "One "report a problem" path (Recommended)"
- Round 13 answer 12 `[user 2026-10-07 14:05]`: "option 3 for now. We will go through the feedback processing later"
- `[accepted recommendation 2026-10-07 14:05]` "Public status and change log (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "\"Received\" now, more later (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "Reason list plus comment (Recommended)"

### 12.2 Validated reading

- Owner answer: `[accepted recommendation 2026-10-07 20:05]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 20:05]`:
  - One "report a problem" path, with a reason list and a comment.
  - Reports are logged only, for now.
  - The status shows "Received" now. An admin adds values later.
  - Each work has a public change log with dates.
  - Every signed-in user sees statuses and the change log.
- Example: none shown to the owner.

### 12.3 Open in this point

- Feedback processing: a later topic (B-09).

## 13. Point 10: research layer, scores, AI label

### 13.1 Owner words and choices

- Round 13 answer 14 `[user 2026-10-07 14:05]`: "option 1. also only available to translator and admin roles"
- `[accepted recommendation 2026-10-07 14:05]` "Verdict and level versions (Recommended)"
- `[accepted recommendation 2026-10-07 14:05]` "Label per work and page (Recommended)"
- Round 13 answer 17 `[user 2026-10-07 14:05]`: "only show to translator and admin"
- `[accepted recommendation 2026-10-07 14:58]` "AI plus human check status (Recommended)"
- `[accepted recommendation 2026-10-07 14:58]` "ED text per level (Recommended)"
- Point 10 answer `[user 2026-10-07 20:05]`: "Correct, admin only records"

### 13.2 Validated reading

- Reading `[validated reading 2026-10-07 20:05]`:
  - Readers never see the research layer or numeric scores.
  - Translator and admin see a closed layer per page or passage. It holds:
    - the `QA_3` verdict,
    - the `ED` text of levels 0 to 3,
    - numeric scores.
  - The layer holds no reasoning text.
  - Every work and page carries an AI label for all users: AI translation plus human check status.
  - Only an admin records that a human checked a page (owner addition, quoted in section 13.1).
  - Human versions carry no AI label.
- The owner statement on the AI label as item metadata has no validated reading yet (section 15, B-01).
- Example: none shown to the owner.

## 14. Point 11: later items

### 14.1 Owner words and choices

- Point 11 answer `[user 2026-10-07 20:05]`: "option 1. But for articles with no page number, pagify the original content based on A4 size number of lines."
  - The answer picks option 1 and adds the A4 rule.
- Option 1 text shown to the owner:
  - No blog link now `[accepted recommendation 2026-10-07 14:58]` "No link now (Recommended)".
  - The article page unit was set for the design phase `[accepted recommendation 2026-10-07 14:58]` "Decide in the design phase (Recommended)".
  - No licence work. The round 11 licence answer covers the Viewer `[accepted recommendation 2026-10-07 14:58]` "Same answer covers the Viewer (Recommended)".
    - Round 11 licence answer `[user 2026-10-05 23:48]`: "option 4. you dont have to bother about the license/permission/etc"
  - The shared output format comes in the design phase.
  - The live switch date stays with the owner.

### 14.2 Validated reading of the A4 rule

- Owner answer: `[accepted recommendation 2026-10-07 23:47]` "Correct reading (Recommended)".
- Reading `[validated reading 2026-10-07 23:47]`:
  - The rule applies to every article without printed page numbers. Today, these are the 313 kendojidai articles.
  - Books keep their printed pages.
  - The JA original is split into pages by the line count of an A4 page.
  - The page is the unit for the AI label, the admin human-check record, and the research layer.
  - Each translation follows the JA page breaks `[agent inference]`.
  - The line count and font size are set in the design phase.
- Example shown to the owner:
  - Article p1 has 3,349 JA characters `[aki-main check]`.
  - With example numbers of 40 characters by 30 lines (1,200 characters per page), it becomes 3 pages.
  - These numbers are an example only.

### 14.3 Open in this point

- Shared output format, article page line count, and font size: design phase (B-07).
- Switch date of the live site: owner (B-08).

## 15. Readings pending owner check

These readings are not validated. They never appear in Part A. aki-main shows them to the owner in the next question round.

### 15.1 B-01. The AI label as item metadata

- Owner words, round 16 answer 4 `[user 2026-10-07 23:47]`: "This should be the item metadata, together with item's title, author, origin language, etc"
- Reading `[reading pending owner check]`:
  - The AI label is one field of the item metadata. It sits next to the title, the author, the origin language, and other fields.
  - The owner gave this answer to the question whether a reader can hide the AI label. The draft reads it as: the label is metadata, not a panel that the reader checks or hides `[agent inference]`.
  - The metadata shows wherever the item shows, for all users `[agent inference]`.
- Project example `[reading pending owner check]`:
  - Article p1 (record `d7835263-fe16-4f05-8c51-98b2a8aa0a3e`) carries its title 「王者は面をどう打つか：北条将臣」, its author, origin language JA, and the AI label with the human check status, as one metadata block `[agent inference]`.

### 15.2 B-02. Original page view, page by page

- Owner words, round 16 answer 5 `[user 2026-10-07 23:47]`: "for option 4, need a better solution. v1 basically load the whole book from ggdrive, so user have to wait. User should be able to view page-by-page efficiently"
- Reading `[reading pending owner check]`:
  - The original page view is kept, but not in the v1 form.
  - In v1, the whole book loads from Google Drive first, so the reader waits.
  - In v2, the reader opens one page and sees it without a wait for the whole book.
  - This view falls under "Fast loading" of objective 1 `[agent inference]`.
  - How pages are stored and served is a design-phase matter `[agent inference]`.
  - aki-main relates "option 4" to the original page view. The Q-A memory does not record which option was number 4 (Not verified).
- Project example `[reading pending owner check]`:
  - A reader opens a page in the middle of the book "Detailed Explanation of Sword Principles, Part 1". The page image and its JA text show at once, with no full-book download first `[agent inference]`.

### 15.3 B-03. EN-original

- Owner words, round 16 answer 8 `[user 2026-10-07 23:47]`: "option 1. but EN-original mean the item is originally written in English"
- Reading `[reading pending owner check]`:
  - An EN-original item is a work whose first text is in English. Its EN text is the original, not a translation.
  - EN-original is a third kind, next to EN-trans-human and EN-trans-machine.
  - A JA text of such an item, if one exists, is a translation, not the source `[agent inference]`.
  - The record does not say whether EN-original items enter the Viewer now, or which app handles their other languages `[agent inference]`.
- Project example `[reading pending owner check]`:
  - The kendojidai EN of the 313 article pairs is not EN-original. The owner states that the articles are first written in Japanese: `[user 2026-10-05 23:48]` "The articles are originally JP, so use JP as the source of correct infor. If there is discrepancy, use JP to fix EN".
  - The two Q-A memory files name no EN-original item yet (aki-execute read of both files).

## 16. Register pointer

- Five tier-1 items were placed in round 13, answer 18 `[file: .opencode/reminders/qa/qa-memory-2026-10-07.md:45]`. The record holds no verbatim answer text for this placement.
- Summary files under `docs/research/summaries/` (each file exists, `ls` on 2026-10-08):
  - LAIT, Ferstler et al. 2026: `docs/research/summaries/LAIT_lossless.md`.
  - BookTranslate.ai "The System": `docs/research/summaries/BookTranslateSystem_lossless.md`.
  - Sefaria help pages: `docs/research/summaries/SefariaHelp_lossless.md`.
  - SuttaCentral interface wiki: `docs/research/summaries/SuttaCentralInterface_lossless.md`.
  - Wikisource Help:Page status: `docs/research/summaries/WikisourcePageStatus_lossless.md`.
- No reading of these items is validated for the Viewer yet.
- This draft makes no claim about their content.

## 17. Trace table

Q-A memory paths: `qa-07` = `.opencode/reminders/qa/qa-memory-2026-10-07.md`, `qa-02` = `.opencode/reminders/qa/qa-memory-2026-10-02.md`.

| Part A bullet | Tag | Owner answer location |
|---|---|---|
| A-01 | `[accepted recommendation 2026-10-07 20:05]` | qa-07:92 |
| A-02 | `[user 2026-10-07 20:05]` | qa-07:93 |
| A-03 | `[validated reading 2026-10-07 23:47]`, `[user 2026-10-07 14:05]` | qa-07:122, qa-07:32 |
| A-04 | `[accepted recommendation 2026-10-07 23:47]` | qa-07:123 |
| A-05 | `[validated reading 2026-10-07 23:47]`, `[user 2026-10-07 14:05]`, `[accepted option 2026-10-07 14:58]`, `[accepted recommendation 2026-10-07 14:58]` | qa-07:124, qa-07:34, qa-07:66, qa-07:67, qa-07:73 |
| A-06 | `[validated reading 2026-10-07 20:05]`, `[accepted recommendation 2026-10-02 19:20]`, `[user 2026-10-07 14:05]`, `[accepted option 2026-10-07 14:58]` | qa-07:95, qa-02:16, qa-07:30, qa-07:84 |
| A-07 | `[validated reading 2026-10-07 20:05]`, `[accepted recommendation 2026-10-02 19:40]`, `[user 2026-10-07 14:05]`, `[user 2026-10-07 14:58]`, `[user 2026-10-07 20:05]`, `[accepted option 2026-10-07 23:47]` | qa-07:96, qa-02:30, qa-07:31, qa-07:61, qa-07:131 |
| A-08 | `[user 2026-10-07 14:05]`, `[accepted recommendation 2026-10-02 19:40]`, `[user 2026-10-07 20:05]`, `[user 2026-10-07 23:47]`, `[accepted recommendation 2026-10-07 23:47]` | qa-07:37, qa-02:31, qa-07:97, qa-07:129, qa-07:130 |
| A-09 | `[validated reading 2026-10-07 20:05]`, `[user 2026-10-07 14:05]`, `[accepted recommendation 2026-10-07 14:58]`, `[user 2026-10-07 23:47]` | qa-07:98, qa-07:32, qa-07:63, qa-07:126 |
| A-10 | `[validated reading 2026-10-07 20:05]`, `[user 2026-10-07 14:05]`, `[user 2026-10-07 14:58]`, `[user 2026-10-07 23:47]`, `[accepted recommendation 2026-10-07 23:47]` | qa-07:99, qa-07:33, qa-07:68, qa-07:127, qa-07:128 |
| A-11 | `[validated reading 2026-10-07 20:05]` | qa-07:101 |
| A-12 | `[validated reading 2026-10-07 20:05]`, `[user 2026-10-07 14:05]`, `[accepted recommendation 2026-10-07 14:58]` | qa-07:102, qa-07:35, qa-07:69, qa-07:70, qa-07:71, qa-07:74 |
| A-13 | `[user 2026-10-07 20:05]`, `[accepted recommendation 2026-10-07 14:58]` | qa-07:103, qa-07:62, qa-07:65 |
| A-14 | `[validated reading 2026-10-07 20:05]`, `[accepted recommendation 2026-10-07 14:05]`, `[user 2026-10-07 14:05]` | qa-07:104, qa-07:38, qa-07:39, qa-07:40 |
| A-15 | `[user 2026-10-07 20:05]`, `[user 2026-10-07 14:05]`, `[accepted recommendation 2026-10-07 14:58]` | qa-07:105, qa-07:41, qa-07:44, qa-07:72 |
| A-16 | `[user 2026-10-07 20:05]`, `[validated reading 2026-10-07 23:47]`, `[user 2026-10-05 23:48]`, `[accepted recommendation 2026-10-07 14:58]` | qa-07:106, qa-07:132, qa-02:222, qa-07:76 |

## 18. Not verified, and change log

### 18.1 Not verified

- The full reading texts and option texts come from aki-main. The Q-A memory holds short forms only. aki-execute did not compare them with the question texts that the owner saw.
- Typed or picked: the Q-A memory does not show whether these answers were typed or picked. The draft tags them as follows:
  - `[accepted option]`: "Reader picks first", "Per account, all devices", "Translator design first", "Dashboard index, no text", "Move to drafts/rejected/".
  - `[user]`: "Reader across ALL languages", "only show to translator and admin", "Correct, plus JA interface", "Correct, admin only records".
- Round 16 answer 5 says "option 4". The Q-A memory does not record which option was number 4.
- All `[aki-main check]` facts: aki-execute did not repeat these checks. aki-execute read only lines 668 and 669 of supplement 1.
- v1 facts: aki-execute did not read any v1 worktree.
- Translator vision cross-reference: `docs/VISION.md:53` to `docs/VISION.md:56` and `docs/VISION.md:382` tagged accepted recommendations as `[user ...]` when this draft was written. A later unit (2026-10-08) retagged them as `[accepted recommendation ...]`, after the owner rule of 2026-10-07 20:05.

### 18.2 Change log

- Revision 1: rejected `[user 2026-10-07 14:58]`. Moved to `docs/drafts/rejected/` `[accepted option 2026-10-07 20:05]`. Not a source.
- Revision 2 (2026-10-08, after round 16 of 2026-10-07 23:47): written by aki-execute for aki-main from validated points only.
  - Part A holds 16 confirmed bullets.
  - Part B holds 3 readings pending owner check and 6 open items.
