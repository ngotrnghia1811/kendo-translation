# MAC-RAG Translation: vision (Translator)

## 1. Header

- Status: approved by the owner in round 9: "Approve after this batch (Recommended)" `[accepted recommendation 2026-10-02 12:32]`. The approved file is `docs/VISION.md` on `v2/base`.
- Revised in round 10 with the owner decisions of `[user 2026-10-02 13:40]`.
- Revised in round 11 with the owner decisions of `[user 2026-10-05 23:48]`. Revised in round 24 with the decisions "No gold set" `[accepted option 2026-10-11 05:38]` and agreement between TS levels `[user 2026-10-13 17:00]` (lines 292, 379, 380, 392), approved with "Approve and commit (Recommended)" `[accepted recommendation 2026-10-20 08:27]`. Revised in round 26 with the tier caps "Two named papers, caps plus one (Recommended)" `[accepted recommendation 2026-10-20 08:27]`: tier 1 cap 6 with TextResNet, tier 2 cap 11 with TEP (lines 346, 347, 352, 358, 359, 364), approved with "Fix all, shared route (Recommended)" `[accepted recommendation 2026-10-20 17:38]`. The two new lines move the round 24 lines 379, 380, and 392 to 381, 382, and 394.
- The vision phase for the Translator is complete for now: "option 1, for now. I will review and there may be a revision session later." `[user 2026-10-05 23:48]`. The next phase is design. Section 12 is the design backlog.
- Commit plan: after owner approval, commit VISION.md on `v2/base` only, merge into both v2 branches, and do not push: "VISION.md on v2/base only (Recommended)" `[accepted recommendation 2026-10-02 11:43]`.
- v1 is archived. No v1 decision carries into v2 `[user 2026-10-02 19:20]`.
- Date note: tags `[user 2026-10-02 19:20]` to `[user 2026-10-02 20:55]` carry the date 2026-10-02, but they record answers given on 2026-10-01 local time. The same note covers the tags `[accepted recommendation 2026-10-02 HH:MM]` and `[accepted option 2026-10-02 HH:MM]` with times 19:20 to 20:55. The owner chose "Add a note only (Recommended)" `[accepted recommendation 2026-10-02 01:15]`. Tags `[user 2026-10-05 HH:MM]` carry the real local date.
- Source of truth: the owner's Q-A record, qa-memory-2026-10-02.md, kept by aki-main. Files under `docs/` are support material only.
- Citation key
  - `[user 2026-10-02 HH:MM]`: an owner answer. Quoted text is verbatim, typos included. Unquoted text is the meaning that aki-main relayed.
  - `[accepted recommendation 2026-10-02 HH:MM]`: an agent option label with "(Recommended)" that the owner picked. The quoted label is verbatim. It is not owner words.
  - `[accepted option 2026-10-02 HH:MM]`: an agent option label without "(Recommended)" that the owner picked. The quoted label is verbatim. It is not owner words.
  - `[user, first message]` and `[user, sketch]`: the owner's first message and grid sketch.
  - `[check: ...]`: a fact that an agent checked with a tool, not an owner decision.
  - `[source: ...]`: a fact from a named standard or file.
  - `[constructed example]`: an agent wrote the example. It does not come from the kendo books.
- Rule: every statement traces to the owner record or to a check. Agent ideas live only in section 13: "Doc traced to your quotes (Recommended)" `[accepted recommendation 2026-10-02 19:20]`.

## 2. Goal and deliverable

- The goal is a "Comprehensive Translation Pipeline using Multiple agent" `[user, first message]`.
- The deliverable is a "detailed academic blogpost describing the whole system (possiblely for future ACL conference paper submission)" `[user, first message]`.
- The project is research first: "Research first (Recommended)" `[accepted recommendation 2026-10-02 19:40]`.
  - The paper is the goal. The pipeline is the experiment `[user 2026-10-02 19:40]`.
  - The pipeline must be reproducible. It is not production-grade `[user 2026-10-02 19:40]`.
- The readers are NLP and MT researchers, and the text is paper-like: "NLP/MT researchers, paper-like (Recommended)" `[accepted recommendation 2026-10-02 19:58]`.
- The paper claims the combination of the parts and its empirical test: "Accept framing (Recommended)" `[accepted recommendation 2026-10-02 01:15]`.
- All four stages are research targets: "All stages are targets." `[user 2026-10-02 19:40]`.
- The three parts of the idea `[user, first message]`:
  - **Multi-level agents**: "Leverage agents wil different capacity levels. Stronger models can use weaker model results as signal for bad results." `[user, first message]`
  - **Agent collaboration network**: "instead of a sequential agent pipeline, Agent perform the translation process like a neural network: The input forms multiple layers, the agent form a multi-layer RNN network." `[user, first message]`
  - **RAG-based translation**: "RAG-based Translation: Translation memory." `[user, first message]`

## 3. Scope and exclusions

- Source material: "source materials are the kendo books in universal-agent" `[user 2026-10-02 19:40]`.
- Target languages: "the target languages are EN,ZH,KO,VI" `[user 2026-10-02 19:40]`.
  - English comes first: "most initial research works will be with EN. then expand and customize to other language" `[user 2026-10-02 19:40]`.
- Input modalities now: "Currently. just make support 2 input modal (text and image)" `[user 2026-10-02 20:55]`.
  - The first message names the image input: "Input: Book Page Image in Japanese" `[user, first message]`.
  - Some sources are Japanese text only `[user 2026-10-02 20:55]`.
- Future modality, not in current scope: "In the future, we also want to support video transcript translation, where agent also analyze the frames of the current timestamp to improve translation acc." `[user 2026-10-02 20:55]`.
- Timeline: no deadline is in scope. Owner words: "you dont need to bother about this" `[user 2026-10-02 19:58]`.
- Other work is for reference and adoption only `[user 2026-10-02 07:50]`.
  - "WE DO NOT CARE ABOUT RESULTS FROM OTHER PAPERS." `[user 2026-10-02 07:50]`
  - "Our main goal is to make OUR PROPOSAL work" `[user 2026-10-02 07:50]`
  - This document reports no scores of other systems `[user 2026-10-02 07:50]`.
- The stages follow the professional translation process only: "this is professional translation process" `[user 2026-10-02 01:00]`.
- The Viewer is in the backlog, after this document: "After Translator VISION.md (Recommended)" `[accepted recommendation 2026-10-02 11:43]`.
  - The v2 Viewer is a new app and starts empty: "New app, live stays v1 (Recommended)" `[accepted recommendation 2026-10-02 19:20]`.
  - Its audience is public readers: "Public readers (Recommended)" `[accepted recommendation 2026-10-02 19:40]`.
  - It shows the Translator output: "Viewer shows Translator output (Recommended)" `[accepted recommendation 2026-10-02 19:40]`.

## 4. The three assumptions

The owner stated three assumptions `[user, first message]`. This document keeps them verbatim `[user 2026-10-02 19:40]`.

- **The worst-case stance.** Verbatim: "Weaker model (lower level) are much more likely to made errors" `[user, first message]`.
  - The owner rejected an earlier agent reading of this assumption: "Wrong reading" `[accepted option 2026-10-02 20:55]`.
  - The owner's own reading: "When a higher level review results from lower level, it will always assume worst case - that the results from lower level need to be fixed" `[user 2026-10-02 20:55]`.
  - The owner accepted this stance `[user 2026-10-02 01:00]`.
  - The stance covers the blue input only: "Blue input only (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
  - The higher box always writes its own version of everything: "Always rewrite" `[accepted option 2026-10-02 01:15]`.
  - The lower output is a warning list only `[user 2026-10-02 01:15]`.
  - The stance starts at level 1, because level 0 has no lower LLM level: "Fix stance from level 1 (Recommended)" `[accepted recommendation 2026-10-02 12:32]`.
  - `TS_0` takes the same stance toward the level -1 classic OCR result. `TS_0` writes its own transcription from the page image, and the classic OCR text is a warning list only: "Yes, same stance (Recommended)" `[accepted recommendation 2026-10-02 13:40]`.
- **The chain-error assumption.** Verbatim: "The sequential process further create more errors" `[user, first message]`.
  - The owner accepted the second assumption `[user 2026-10-02 20:55]`.
- **The lesson assumption.** Verbatim: "There errors are good insight for better model (high level) what not to do" `[user, first message]`.
  - The owner accepted the third assumption `[user 2026-10-02 20:55]`.

## 5. The grid

The grid is a 4x4 array of agents. Rows are levels 0 to 3, with level 0 at the bottom. Columns are the stages TS, TL, ED, and QA `[user, sketch]`. A *box* is one cell of the grid, that is, one agent that does one stage on one level `[user, sketch]`.

### 5.1 Stages

- The four stages are TS, TL, ED, and QA: "Option 1. but Not enough. provide your detail understanding, customize for this project context, for each stage, with concrete example. do additional research/survey if needed" `[user 2026-10-02 19:58]`. The first message names them "Transcription. Translation. Editor. Quality." `[user, first message]`.
- The first message names "Transcription: Problem" and "Translation: Problem" `[user, first message]`. All four stages are research problems: "Research problem, all four (Recommended)" `[accepted recommendation 2026-10-02 12:32]`.
- Transcription (TS) is *page transcription*: "Page transcription (Recommended)" `[accepted recommendation 2026-10-02 11:43]`.
  - Definition: "A *page transcription* is the Japanese text of one page image, in reading order, produced by OCR or a vision-language model and checked against the page." The owner approved it: "Transcription definition (Recommended)" `[accepted recommendation 2026-10-02 12:32]`. Source: `docs/drafts/transcription-research.md`, section 1.
  - The output of TS is a transcription `[user 2026-10-02 11:43]`.
  - The Japanese term is テキスト化 `[user 2026-10-02 11:43]`.
  - The paper abstract names OCR once `[user 2026-10-02 11:43]`.
- The stages map to the professional translation process `[user 2026-10-02 07:50]`. The owner accepted this mapping: "Accept (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
  - TS = source transcription: OCR or keyed input, then a second person proofreads against the page `[user 2026-10-02 07:50]`.
  - TL = translation plus the translator's check (ISO 17100) `[user 2026-10-02 07:50]`.
  - ED = bilingual revision `[user 2026-10-02 07:50]`.
  - QA = parts of review, proofreading, and final verification `[user 2026-10-02 07:50]`.
- TS matches a professional step. The owner rejected the agent claim that no professional step matches TS `[user 2026-10-02 01:15]`.

### 5.2 Levels

- A *level* is one row of the grid. It holds agents of one capacity `[user, first message]` `[user, sketch]`.
- Level 0 holds the weakest agents: "Level 0 weakest (Recommended)" `[accepted recommendation 2026-10-02 20:55]`.
- Each level uses one model tier for all four stages: "One model tier per level (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- Levels 0 to 3 are LLM agents `[user 2026-10-02 11:43]`.
- Level -1 is a classic OCR engine, for example `NDLOCR-Lite`. The owner chose "Add as level below 0" `[accepted option 2026-10-02 11:43]`.
  - Level -1 serves TS only `[user 2026-10-02 11:43]`.
  - Its output is a warning list for the TS boxes `[user 2026-10-02 11:43]`.
  - Level -1 has no TL, ED, or QA box `[user 2026-10-02 11:43]`.
  - The page image and the level -1 classic OCR result form one paired input to the TS box on every level 0 to 3: "option 2. the input image and the classic OCR result are a pair, feeding to each TS level" `[user 2026-10-02 12:32]`.
  - `TS_0` treats the classic OCR result with the worst-case stance, see section 4 `[user 2026-10-02 13:40]`.

### 5.3 Arrows and the three recurrence types

- Red arrows go from stage to stage on one level `[user, sketch]`.
- Blue arrows go from level l-1 to level l at the same stage `[user, sketch]`.
- The page image feeds TS at every level `[user, sketch]`.
  - On every level 0 to 3, the page image and the level -1 classic OCR result arrive as one pair, see section 5.2 `[user 2026-10-02 12:32]`.
- Pages are a recurrence axis too. Levels are layers, and stages are steps: "option 1, but also 2" `[user 2026-10-02 19:58]`.
- The owner names three recurrence types: "so there are 3 type of recurrent: page - stage - level" `[user 2026-10-02 20:55]`.
  - The page type, in the owner's words: "in the same level, agent(current page| prev page)" `[user 2026-10-02 20:55]`.
  - The owner accepted the index `X(l, s, p)` for one run of a box, with level `l`, stage `s`, and page `p` `[user 2026-10-02 01:00]`.
- A box on page p sees page p-1 only, in all four stages: "Page p-1 only, all stages (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.

#### Notation

- The three recurrence types are written as one formula: `X(l, s, p) = agent(l, s)( X(l, s-1, p), X(l-1, s, p), X(l, s, p-1) )`. The owner approved it as notation: "Approve as notation (Recommended)" `[accepted recommendation 2026-10-02 13:40]`.
- where:
  - `l` is the level, 0 to 3 (level -1 is the classic OCR step for TS only).
  - `s` is the stage: TS, TL, ED, or QA.
  - `p` is the page index.
  - `X(l, s, p)` is the (result, reasoning process) pair of one box.
  - `agent(l, s)` is the agent of one (level, stage) cell. It has one prompt, so the grid has 16 prompts.
- The formula records decisions that the owner already made. It is notation, not a design `[user 2026-10-02 13:40]`.
- Edge cases, each from an earlier decision:
  - For `s` = TS, the stage input is the (page image, classic OCR result) pair in place of `X(l, s-1, p)` `[user 2026-10-02 12:32]`.
  - For `l` = 0, there is no lower LLM level, so `X(l-1, s, p)` is absent `[user 2026-10-02 12:32]`.
  - For the first page, there is no previous page, so `X(l, s, p-1)` is absent `[user 2026-10-02 01:00]`.
- The run order of the boxes and the content that crosses from page p-1 stay open, see section 12.

### 5.4 The (result, reasoning process) pair

- Every agent outputs a result and its reasoning process `[user 2026-10-02 01:00]`.
  - Owner words: "NOTE: agent is require to output both the output is its reasoning process. higher level agent take both (results, reasoning process) from lower level as input" `[user 2026-10-02 01:00]`.
- The blue arrow carries the pair (result, reasoning process) `[user 2026-10-02 01:00]`.
- Both arrows carry the pair: "Yes, both arrows (Recommended)" `[accepted recommendation 2026-10-02 01:15]`.
  - Owner words: "basically the output of each agent is a pair (output, reasoning) forward and upward in the network" `[user 2026-10-02 12:32]`.
  - Forward is the red arrow to the next stage on the same level. Upward is the blue arrow to the same stage on the next level `[user 2026-10-02 12:32]`.
- The bar "|" means ""Given" (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- The sketch formula is `ED_1(TL_1 | ED_0) -> QA_1` and `-> Reasoning -> ED_2` `[user, sketch]`.
  - With the bar read as given, `ED_1` works on `TL_1`, given `ED_0`. Its output then goes to `QA_1` `[user, sketch]` `[user 2026-10-02 01:00]`.
  - The reasoning of `ED_1` goes up to `ED_2` `[user, sketch]` `[user 2026-10-02 12:32]`.

### 5.5 Source access

- Only TS sees the page image. TL, ED, and QA get the Japanese text: "Image to TS, JP text to all (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- For a text-only source, TS passes the text through unchanged: "Pass through unchanged (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.

### 5.6 The TS blue arrow as a proofing check

- The TS blue arrow is the grid's form of the professional second-person proofing check `[user 2026-10-02 11:43]`.
  - Examples of that check: Netflix Dialogue List "Proofing", NDL 校正済 text, and Aozora Bunko 校正 `[user 2026-10-02 11:43]`.
- The grid has no extra check box. Four stages stay `[user 2026-10-02 11:43]`.

### 5.7 TS output fields

The owner chose three properties of the TS output `[user 2026-10-02 11:43]`:

- "Ruby bound to base text" `[accepted option 2026-10-02 11:43]`.
- "Captions + labels as fields" `[accepted option 2026-10-02 11:43]`.
- "Heads + page numbers as fields" `[accepted option 2026-10-02 11:43]`.
- The fields use the `NDLOCR-Lite` layout class names: "Use as field names (Recommended)" `[accepted recommendation 2026-10-02 13:40]`.
  - `line_caption` (キャプション): captions and figure labels.
  - `block_pillar` (柱): running heads.
  - `block_folio` (ノンブル): page numbers.
  - `block_rubi` (ルビ): ruby, bound to its base text.
- The TS agent writes the text of every field `[user 2026-10-02 13:40]`.
- In `NDLOCR-Lite`, every `block_*` class except `block_table` becomes an empty box with a position and a confidence, and no text. `line_caption` is a text line. The tool does not output ruby text and does not bind ruby to its base `[source: docs/research/summaries/NDLOCRLite_lossless.md]`.
- So the level -1 boxes are position hints only `[user 2026-10-02 13:40]`.

### 5.8 Final output and QA direction

- The final output of a page is the `ED_3` text with the `QA_3` verdict: "ED_3 text, QA_3 verdict (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- `QA_3` gives a verdict and does not edit `[user 2026-10-02 01:00]`.
- QA sends up only. It sends no redo request on its own level `[user 2026-10-02 01:00]`.
  - Owner words: "option 1. In case of update, the textual gradient update will improve the process" `[user 2026-10-02 01:00]`.

### 5.9 One example per stage

The owner asked for a concrete example per stage: "provide your detail understanding, customize for this project context, for each stage, with concrete example" `[user 2026-10-02 19:58]`. The examples below come from `docs/drafts/vision-articulation.md`. They show level 1 under the worst-case stance.

- TS example `[constructed example]`, from section 3.3.1 of the draft. The page has two vertical columns, and the sentence starts in the right column.

  | Field | Text |
  |---|---|
  | `TS_0` text | 気剣体一致の打突を心がける。打突の後も残心を示し、 |
  | `TS_1` text | 打突の後も残心を示し、気剣体一致の打突を心がける。 |
  | Romaji | Datotsu no ato mo zanshin o shimeshi, ki-ken-tai-icchi no datotsu o kokorogakeru. |
  | English | "Keep zanshin even after the strike, and aim for strikes with ki-ken-tai-icchi." |
  | Point | Every character in the `TS_0` text is correct. `TS_1` checks the column order against the image. Columns run from right to left, so `TS_0` read them in the wrong order. |

- TL example `[constructed example]`, from section 3.3.2 of the draft.

  | Field | Text |
  |---|---|
  | `TS_1` text | 打太刀の打ちを仕太刀が返して胴を打つ。 |
  | Romaji | Uchidachi no uchi o shidachi ga kaeshite dō o utsu. |
  | Gloss | uchidachi / of / strike / (object) / shidachi / (subject) / turn-back-and / dō / (object) / strike. |
  | `TL_0` draft | "The striking sword's hit is turned back by the doing sword, which hits the trunk." |
  | `TL_1` draft | "Shidachi turns back uchidachi's strike and strikes dō." |
  | Point | 打太刀 and 仕太刀 are role names, not "striking sword" and "doing sword". 胴 is the target dō, not "the trunk". |

- ED example `[constructed example]`, from section 3.3.3 of the draft.

  | Field | Text |
  |---|---|
  | Japanese source | 有効打突だけが一本になる。 |
  | Romaji | Yūkō-datotsu dake ga ippon ni naru. |
  | Gloss | valid strike / only / (subject) / ippon / become. |
  | `TL_1` draft | "Only a yūkō-datotsu, a valid strike, scores ippon." |
  | `ED_0` edit | "Only an effective hit earns a point." |
  | `ED_1` edit | "Only a valid strike (yūkō-datotsu) scores ippon." |
  | Point | "effective hit" replaces a defined term. "a point" replaces ippon, a kendo term. |

- QA example `[constructed example]`, from section 3.3.4 of the draft.

  | Field | Text |
  |---|---|
  | Japanese source | 相手の出ばなに小手を打つ。 |
  | Romaji | Aite no debana ni kote o utsu. |
  | Gloss | opponent / of / debana / at / kote / (object) / strike. |
  | `ED_0` text | "Strike kote as the opponent finishes the strike." |
  | `QA_0` verdict | "PASS. One issue: 'kote' is untranslated." |
  | `ED_1` text | "Strike kote at debana, the moment the opponent starts to move." |
  | Point | The flag is a false alarm, because the book keeps "kote" in romaji. The PASS is a miss, because 出ばな is the moment the opponent starts to move to strike. |

## 6. Optimization

- A *textual gradient* is written feedback that tells how to change a prompt. Owner words: "All agents are currently optimizied through prompt textual gradient" `[user 2026-10-02 20:55]`.
- "Currently" means the v2 plan: "The v2 plan (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- The owner accepted this reading: a critic writes text feedback, and an optimizer edits the prompt `[user 2026-10-02 01:00]`.
  - Prompts act as the parameters of the grid. Model weights do not change `[user 2026-10-02 01:00]`.
- The feedback comes from QA verdicts and from the 313 human reference pairs: "QA verdicts and references (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.
- The prompt update rule follows SMART: "Prompt update rule (Recommended)" `[accepted recommendation 2026-10-02 13:40]`. Source: `docs/research/summaries/SMART_lossless.md`, "What MAC-RAG can adopt from SMART", items 7 and 14 (SMART sections 3.5, B.7, B.8, C.5).
  - Each (level, stage) cell has one prompt, 16 in total.
  - If the mean score of a cell is low, an optimizer rewrites its prompt from critiques of its worst cases.
  - The critiques name failure modes. They do not hold corrected outputs.
  - The rewrite keeps the role statement of the prompt.
  - The prompts freeze after the training part. Memory keeps growing after that.
  - The 313 reference pairs are corrected outputs, so a step turns each reference difference into a failure-mode critique.
  - The score threshold, the number of worst cases, and the size of the training part are design-phase choices.
- A rescue rerun is a later idea, to test after the base grid works. It is not part of the vision `[user 2026-10-02 11:43]`. Owner words: "option 1 and 2".

## 7. Data

- Human reference pairs `[user 2026-10-02 19:40]`
  - Owner words: "There are human paired japanese-english. We will use them as reference" `[user 2026-10-02 19:40]`.
  - The pairs are the 313 kendojidai articles, EN on kendojidai.com and JA on kendojidai.net: "Yes, these are the pairs (Recommended)" `[accepted recommendation 2026-10-02 20:55]`.
  - The unit is the sentence pair: "Sentence pairs, aligned in v2" `[accepted option 2026-10-02 11:43]`.
    - v2 aligns the sentences fresh and checks them against the source `[user 2026-10-02 11:43]`.
    - v2 does not reuse the v1 database segments as is `[user 2026-10-02 11:43]`.
    - Earlier rule: the v2 alignment flags JA sentences with no EN counterpart and EN sentences that change a fact, and excludes them from scoring: "Flag and exclude from scoring (Recommended)" `[accepted recommendation 2026-10-02 12:32]`.
    - The JA side is the source of correct facts, and the EN is fixed from the JA: "The articles are originally JP, so use JP as the source of correct infor. If there is discrepancy, use JP to fix EN" `[user 2026-10-05 23:48]`.
      - The same rule covers a fact that the EN drops inside an otherwise matched sentence: "Like prev answer, use JP as origin information, and fix EN based on JP" `[user 2026-10-05 23:48]`.
      - Example: 「くりた・わいちろう／昭和31年神奈川県生まれ、64歳。」 became "Born in 1956 in Kanagawa prefecture." The fix adds the age 64 `[check: docs/drafts/paired-dataset-process.md, worked example W.1]`.
      - The original EN stays in the dataset next to the fixed EN, with labels `[accepted recommendation 2026-10-05 23:48]` ("Keep, labeled, filtered views (Recommended)").
  - The pairs have a held-out split: "313 pairs with held-out split (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
  - Held-out test pairs must never be retrievable `[user 2026-10-02 11:43]`.
  - The split is by article group, balanced by EN post year: 75% retrieval, 15% feedback, 10% test: "75 / 15 / 10" `[accepted option 2026-10-05 23:48]`. Feedback and test text are never retrievable `[source: docs/drafts/paired-dataset-process.md, step 10]`.
- Provenance check of 40 of the 313 pairs `[check: aki-submain 2026-10-02, 40 of 313 pairs]`. The owner chose "Check by sampling (Recommended)" `[accepted recommendation 2026-10-02 11:43]` and "Check more of the 313 pairs" `[accepted option 2026-10-02 12:32]`.
  - Result: 20 full translations, 19 partial, 0 rewrites, 1 different article `[check: aki-submain 2026-10-02, 40 of 313 pairs]`.
  - Record 308 pairs a Japanese report on the 2025 All Japan Police Kendo Championship with an English results list of the 73rd All Japan Kendo Championship. aki-main confirmed this with a GET request `[check: aki-main curl 2026-10-02]`.
  - The English side often changes facts, mostly in author profile and credit blocks. Example: 「平成29年に定年退職」 becomes "In 2009, he retired" `[check: aki-main curl 2026-10-02]`.
  - Details: `docs/drafts/pairs-provenance-sample.md`.
  - Not verified: the other 273 pairs.
- The agents build a clean paired dataset from the 313 pairs by hand: "From the 313 pairs, you can create a paired dataset yourself manually. design the best process to do this" `[user 2026-10-02 13:40]`.
  - The process also handles the profile and credit blocks: "refer to previous answer" `[user 2026-10-02 13:40]`.
  - The process is `docs/drafts/paired-dataset-process.md`. The owner accepted its 11-step shape: "Option 1. Use opencode anthropic claude sonnet 5.5 model (high + xhigh) for step 7 and opus 5.5 (high) for step 9" `[user 2026-10-05 23:48]`.
    - The 11 steps: snapshot, article triage, grouping and split, typed blocks, sentence split, aligner proposal, double alignment by two agents, item-by-item fact pass, adjudication by a third agent, leakage check and random re-check, output files `[source: docs/drafts/paired-dataset-process.md]`.
    - Step 7 (double alignment) uses Claude Sonnet 5.5 at reasoning effort high and xhigh. Step 9 (adjudication) uses Claude Opus 5.5 at high `[user 2026-10-05 23:48]`.
    - Agents decide every link. The automatic aligner only proposes. The work runs in batches: "option 1. but do so in batch" `[user 2026-10-05 23:48]`.
    - Record 308 leaves all uses. Its snapshot stays, and the kendojidai.com article "Report on the 2025 All Japan Police Kendo Championship" (11/03/2025) is logged as a lead: "Exclude and log the lead (Recommended)" `[accepted recommendation 2026-10-05 23:48]`.
    - Flagged units stay in the dataset file with labels, and each use reads a filtered view: "Keep, labeled, filtered views (Recommended)" `[accepted recommendation 2026-10-05 23:48]`.
    - EN translator credit lines go to the article metadata and leave all three uses: "Metadata only (Recommended)" `[accepted recommendation 2026-10-05 23:48]`.
    - Licence: "option 4. you dont have to bother about the license/permission/etc" `[user 2026-10-05 23:48]`.
    - Data files live in the git-ignored folder `data/` of the translator worktree: "keep all data in a git ignore folder for easier manage" `[user 2026-10-05 23:48]`.
    - A pilot on all 40 sampled pairs comes before the full build: "Pilot on all 40 sampled pairs" `[accepted option 2026-10-05 23:48]`.
    - The build starts in the next design session: "Next design session (Recommended)" `[accepted recommendation 2026-10-05 23:48]`.
- Level-0 baseline data `[user 2026-10-02 20:55]`
  - The `book-postprocessing` `triplet.json` files are Gemini level-0 machine output with no human edit: "Gemini output, no human edit (Recommended)" `[accepted recommendation 2026-10-02 20:55]`.
  - They are a baseline only, never a reference `[user 2026-10-02 20:55]`.
- Page images `[user 2026-10-02 20:55]`
  - Owner words: "1. in gemini-agent folders" `[user 2026-10-02 20:55]`.
  - Path: `/Volumes/NghiaHDD2T/universal-agent_v2/compiled_agents/gemini_kendo_book_translator/pages/<book>/page_NNN.pdf`, in 36 book directories `[check: aki-submain ls 2026-10-02]`.
- Image evaluation `[user 2026-10-02 01:00]`
  - No human TS gold set exists: "No gold set" `[accepted option 2026-10-11 05:38]`. This replaces "Small human TS gold set (Recommended)" `[accepted recommendation 2026-10-02 01:00]`. Agreement between TS levels measures TS quality, under the worst-case stance of section 4 `[user 2026-10-13 17:00]`.
  - The text chain is measured on the 313 pairs: "Text chain on 313 pairs (Recommended)" `[accepted recommendation 2026-10-02 01:00]`.

## 8. RAG and translation memory

- The owner chose three RAG sources `[user 2026-10-02 07:50]`:
  - "Kendo dictionary (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
  - "313 pairs with held-out split (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
  - "Book memory of accepted outputs (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
- The owner asked: "Do you know what `translation memory` official description is?" `[user 2026-10-02 07:50]`.
- A *translation memory* (TM), per JIS Y 5001:2020, 3.5.6 `[source: JIS Y 5001:2020 3.5.6]`:
  - Definition: "原文言語のテキストと訳文言語のテキストとを一対として蓄積するデータベース。" `[source: JIS Y 5001:2020 3.5.6]`
  - Note: "翻訳メモリーの目的は，過去に翻訳されたコンテンツを容易に検索・利用できるようにすることである。" `[source: JIS Y 5001:2020 3.5.6]`
- Standard names for the three RAG sources: "Standard names for RAG (Recommended)" `[accepted recommendation 2026-10-02 12:32]`.
  - Kendo dictionary = termbase `[user 2026-10-02 12:32]`.
  - 313 pairs = aligned translation memory `[user 2026-10-02 12:32]`.
  - Book memory = project translation memory `[user 2026-10-02 12:32]`.
  - Source: `docs/drafts/translation-memory-definition.md`, section 4, and `docs/drafts/vision-articulation.md`, section 12.2.
- Book memory entries are page-level translation units (TMX `segtype="block"`): "Page units in book memory" `[accepted option 2026-10-02 12:32]`.
  - Analogy only: the page recurrence is the analog of a context match (101%) `[user 2026-10-02 12:32]`. Source: `docs/drafts/vision-articulation.md`, section 12.2.
- Book memory includes a terminology pool, as in SMART: "Terminology pool (Recommended)" `[accepted recommendation 2026-10-02 13:40]`. Source: `docs/research/summaries/SMART_lossless.md`, adoption item 1 (SMART sections 3.3, B.2, B.4).
  - Only accepted page outputs write entries: the `ED_3` text with the `QA_3` verdict `[user 2026-10-02 13:40]`.
  - TL, ED, and QA boxes on all levels read it `[user 2026-10-02 13:40]`.
  - It overlaps the kendo dictionary termbase. The RAG design decides how the two relate.
- DelTA is a design reference for book memory only: "Book memory anchor only (Recommended)" `[accepted recommendation 2026-10-02 13:40]`. The page recurrence stays page p-1 only `[user 2026-10-02 01:00]`. Source: `docs/research/summaries/DelTA_lossless.md`.
- The RAG design comes later: "We will design later" `[user 2026-10-02 19:20]`.

## 9. Baselines

A *baseline* is a fixed system that the full grid is measured against. The owner chose two `[user 2026-10-02 07:50]`:

- "Gemini level-0 output (Recommended)" `[accepted recommendation 2026-10-02 07:50]`. This is the `triplet.json` data of section 7 `[user 2026-10-02 20:55]`.
- "Grid without prompt updates (Recommended)" `[accepted recommendation 2026-10-02 07:50]`. This is the grid without the textual gradient of section 6.
  - Definition, from SMART F.5: "The routing policy and agent prompts remain at their initial configurations throughout evaluation" `[source: docs/research/summaries/SMART_lossless.md]`. The owner chose it: "Baseline definition (Recommended)" `[accepted recommendation 2026-10-02 13:40]`.
  - In this project: all 16 prompts stay at their first version. Memory, RAG, and the three recurrence types stay on `[user 2026-10-02 13:40]`.

## 10. Evaluation

The owner chose five measures `[user 2026-10-02 07:50]`:

- "Character error rate (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
- "Reference-based MT metrics (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
- "Error flow across the grid (Recommended)" `[accepted recommendation 2026-10-02 07:50]`.
- "LLM judge" `[accepted option 2026-10-02 07:50]`. Its model family: "Decide with the model choice" `[accepted option 2026-10-02 07:50]`.
- "Term consistency across pages" `[accepted option 2026-10-02 07:50]`.

The owner did not choose human error spans `[user 2026-10-02 07:50]`.

## 11. References policy

- Owner words on tiers: "we have 3 tiers of referecnce papers/projects/tools." `[user 2026-10-02 07:50]`
  - "These are simply for references/adoptation to make MAC-RAG works. We dont care about comparison with others" `[user 2026-10-02 07:50]`
  - "We simple want to refer, and if relevant, adopt from their work." `[user 2026-10-02 07:50]`
- Tier rules `[user 2026-10-02 07:50]` `[user 2026-10-02 11:43]`
  - Tier 1 is the closest prior work, with a cap of 6: "Tier 1 = closest prior work (Recommended)" `[accepted recommendation 2026-10-02 07:50]`. The cap was 5 `[user 2026-10-02 07:50]` and became 6 `[accepted recommendation 2026-10-20 08:27]`.
  - Tier 2 holds items with an idea that the project plans to adopt `[user 2026-10-02 11:43]`, with a cap of 11. The cap was 10 `[user 2026-10-02 11:43]` and became 11 `[accepted recommendation 2026-10-20 08:27]`.
  - Tier 3 holds items that give context only, with a cap of 20 `[user 2026-10-02 11:43]`. The owner picked "Adopt vs background" `[accepted option 2026-10-02 11:43]`.
  - Tiers cover papers, projects, and tools `[user 2026-10-02 07:50]`.
  - Every placed item needs a lossless summary on disk `[user 2026-10-02 07:50]`.
  - The v1 tier definitions are not used `[user 2026-10-02 11:43]`.
- Tier 1 is full: SMART plus "Wu 2025 book MT, DelTA memory, Sasagawa vertical JA, NDLOCR-Lite" `[accepted option 2026-10-02 11:43]`. SMART went to tier 1 at `[user 2026-10-02 01:15]`: "That paper is tier 1 paper". TextResNet went to tier 1 at `[accepted recommendation 2026-10-20 08:27]`: "Two named papers, caps plus one (Recommended)".
  - **SMART**, "Breaking Babel: A Self-Evolving Multi-Agent System for Long-Form Subtitle Translation", arXiv:2609.38660v2, bib key `jin2026smart`, summary `docs/research/summaries/SMART_lossless.md` `[source: docs/research/surveys.md]`.
  - **Wu et al. 2025**, "(Perhaps) Beyond Human Translation: Harnessing Multi-Agent Collaboration for Translating Ultra-Long Literary Texts", Transactions of the Association for Computational Linguistics, 13:901–922 `[source: docs/research/surveys.md]`.
  - **DelTA** (Wang et al. 2025), "DelTA: An Online Document-Level Translation Agent Based on Multi-Level Memory", arXiv:2410.08143 `[source: docs/research/surveys.md]`.
  - Sasagawa, Kurita, Kawahara, "Evaluating Multimodal Large Language Models on Vertically Written Japanese Text", LREC 2026, arXiv 2511.15059 `[source: docs/research/surveys.md]`.
  - `NDLOCR-Lite` (NDL Lab), a tool, CC BY 4.0, https://github.com/ndl-lab/ndlocr-lite `[source: docs/research/surveys.md]`.
  - **TextResNet** (Huang et al. 2026), "TextResNet: Decoupling and Routing Optimization Signals in Compound AI Systems via Deep Residual Tuning", arXiv:2602.08306, bib key `huang2026textresnet`, summary `docs/research/summaries/TextResNet_lossless.md` `[source: docs/research/surveys.md]`. Reason: owner pointer "Check this work: https://arxiv.org/pdf/2602.08306" `[user 2026-10-13 17:00]`, and placement "Two named papers, caps plus one (Recommended)" `[accepted recommendation 2026-10-20 08:27]`.
- All six tier 1 items have lossless summaries in `docs/research/summaries/`: `SMART_lossless.md`, `WuBeyondHuman_lossless.md`, `DelTA_lossless.md`, `SasagawaVerticalJA_lossless.md`, `NDLOCRLite_lossless.md`, `TextResNet_lossless.md` `[check: aki-main wc 2026-10-02 13:18]` `[check: aki-execute wc 2026-10-20 17:49]`.
- The Wu et al. 2025 author list uses the arXiv form "Longyue Wang". The ACL Anthology lists "Longyue Wan": "Use 'Longyue Wang' (Recommended)" `[accepted recommendation 2026-10-02 13:40]`.
- The 25 candidates are placed, 10 in tier 2 and 15 in tier 3: "Place 25 candidates" `[accepted option 2026-10-02 12:32]`.
  - Each placed item needs a lossless summary before use `[user 2026-10-02 12:32]`.
  - The list is in `docs/research/surveys.md`.
  - Round 25 placed TEP (arXiv 2601.21064, bib key `chen2026tep`, summary `TEP_lossless.md`) in tier 2: "Two named papers, caps plus one (Recommended)" `[accepted recommendation 2026-10-20 08:27]`. Tier 2 holds 11 of 11.

## 12. Open, decided later

General rule: "We are not doing the design yet" `[user 2026-10-02 19:20]`.

This section is the backlog for the design phase `[user 2026-10-05 23:48]`.

- Design of the three recurrence types: "Need a careful design for this" `[user 2026-10-02 20:55]`.
  - What crosses from page p-1: the full pair, the result only, or a summary. The owner record gives no answer.
  - The order of box runs. The owner record gives no answer.
  - The route of the textual gradient along the three recurrence types. The owner record gives no answer.
- RAG design: "We will design later" `[user 2026-10-02 19:20]`.
  - The content of the kendo dictionary. The owner record gives no answer.
- Model choice per level. The owner chose one model tier per level `[user 2026-10-02 01:00]`. The owner record gives no answer on the models.
- Judge model family for the "LLM judge": "Decide with the model choice" `[accepted option 2026-10-02 07:50]`.
- TS output format. The owner chose the three field properties of section 5.7 `[user 2026-10-02 11:43]`. The owner record gives no answer on the format.
- Size of the TS gold set: decided, no gold set: "No gold set" `[accepted option 2026-10-11 05:38]`. The earlier answer was "Decide in design phase (Recommended)" `[accepted recommendation 2026-10-02 12:32]`.
- TS scoring protocol: decided, agreement between TS levels under the worst-case stance: "option 1. follow the similar assumption of higher level ALWAYS assume errors in lower level and try to improve" `[user 2026-10-13 17:00]`. The earlier answer was "Defer to design phase" `[accepted option 2026-10-02 13:40]`. The earlier candidate was the Sasagawa et al. protocol: greedy decoding, NFKC normalization and whitespace removal on both sides, CER, and character BLEU. The paper does not state per-page CER or a separate reading-order check `[source: docs/research/summaries/SasagawaVerticalJA_lossless.md]`.
- Paired-dataset details (section 7). Do fixed units score against the fixed EN? Do whole JA sentences with no EN get an agent-written EN? Which labels and thresholds hold after the 40-pair pilot? The owner record gives no answer.
- Shared output format with the Viewer: "Viewer shows Translator output (Recommended)" `[accepted recommendation 2026-10-02 19:40]`. The format is decided in the design phase `[user 2026-10-02 19:40]`.
- Viewer switch date: production stays on v1 until the owner names a date `[user 2026-10-02 19:20]`.
- Rescue rerun: a later idea, to test after the base grid works: "option 1 and 2" `[user 2026-10-02 11:43]`.

## 13. PROPOSALS (agent ideas, not decisions)

No open proposals. Round 10 decided all five earlier items `[user 2026-10-02 13:40]`.

## 14. Where to read more

The Translator files in `docs/drafts/` and `docs/research/` are committed on branch `v2/translator` only: "Commit, ignore sources/ (Recommended)" `[accepted recommendation 2026-10-05 23:48]`. On `v2/base` and `v2/viewer`, the links below do not resolve `[check: aki-execute git ls-tree 2026-10-13]`. The Viewer research files are on all v2 branches: "Move Viewer register (Recommended)" `[accepted recommendation 2026-10-11 05:38]`, then "Merge now with union .gitignore (Recommended)" `[accepted recommendation 2026-10-13 17:00]`. They are the register and references in `docs/research/viewer/`, five summaries in `docs/research/summaries/`, and two Viewer drafts in `docs/drafts/` `[check: aki-execute git ls-tree 2026-10-13]`. The third-party copies in `docs/research/sources/` are git-ignored.

- `docs/drafts/vision-articulation.md`: the full vision reading, with kendo examples (revision 7).
- `docs/drafts/translation-memory-definition.md`: TM definitions and the RAG source mapping.
- `docs/drafts/transcription-research.md`: the term and the research area of page transcription.
- `docs/drafts/professional-workflow-research.md`: transcription in professional workflows.
- `docs/drafts/novelty-search.md`: closest prior work on five claims.
- `docs/drafts/survey-2026-05-to-09.md`: literature and tools, May to September 2026.
- `docs/research/surveys.md`: the tier register.
- `docs/research/summaries/SMART_lossless.md`: the SMART summary.
- `docs/research/summaries/WuBeyondHuman_lossless.md`: the Wu et al. 2025 summary.
- `docs/research/summaries/DelTA_lossless.md`: the DelTA summary.
- `docs/research/summaries/SasagawaVerticalJA_lossless.md`: the Sasagawa et al. summary.
- `docs/research/summaries/NDLOCRLite_lossless.md`: the `NDLOCR-Lite` summary.
- `docs/drafts/pairs-provenance-sample.md`: the provenance check of 40 of the 313 pairs.
- `docs/drafts/paired-dataset-process.md`: the paired-dataset process. Section 0 holds the owner decisions of round 11.
- `docs/drafts/VISION.md`: frozen snapshot of the round 9 state (commit `098b8d0`).
