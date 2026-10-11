# Viewer survey: how public reading apps show translated and bilingual text (May to September 2026)

| Field | Value |
|---|---|
| Title | Viewer survey: how public reading apps show translated and bilingual text |
| Status | DRAFT for owner validation, revision 1 |
| Date | 2026-10-07 |
| Author | aki-research |
| Scope | Public apps, tools, projects, research, and rules that show translated or bilingual text to public readers. Focus on work from May to September 2026. Older items appear only as closest prior work, with their dates. Organized by the four owner topics. |
| Register | `docs/research/viewer/surveys.md` (Viewer register, version 1) and `docs/research/viewer/references.bib` |
| Local source copies | `docs/research/sources/` (verbatim excerpts, see "Limits of this unit") |

**Owner decisions this draft rests on** (verbatim, with dates):

- "New app, live stays v1 (Recommended)" `[user 2026-10-02 19:20]`. The v2 Viewer is a new app.
- "Public readers (Recommended)" `[user 2026-10-02 19:40]`.
- "Viewer shows Translator output (Recommended)" `[user 2026-10-02 19:40]`. The shared output format is a design-phase decision.
- "Research first" `[user 2026-10-02 19:40]`.
- "the target languages are EN,ZH,KO,VI most initial research works will be with EN. then expand and customize to other language" `[user 2026-10-02 19:40]`.
- "WE DO NOT CARE ABOUT RESULTS FROM OTHER PAPERS. We simple want to refer, and if relevant, adopt from their work. Our main goal is to make OUR PROPOSAL work" `[user 2026-10-02 07:50]`.
- "Survey of reader apps first" `[user 2026-10-07 10:55]`.
- First topics: "Reader goals", "Content scope", "Reader feedback", "Research layer" `[user 2026-10-07 10:55]`.
- "No v1 read" `[user 2026-10-07 10:55]`.

Everything else about the Viewer is open. No sentence in this draft is an owner decision unless it quotes one of the lines above.

## Contents

- [Summary](#summary)
- [Scope and terms](#scope-and-terms)
- [1. Reader goals](#1-reader-goals)
- [2. Content scope](#2-content-scope)
- [3. Reader feedback](#3-reader-feedback)
- [4. Research layer](#4-research-layer)
- [5. Candidate table](#5-candidate-table)
- [6. Vision questions for the owner](#6-vision-questions-for-the-owner)
- [7. PROPOSALS (agent ideas, not decisions)](#7-proposals-agent-ideas-not-decisions)
- [8. Self-check and limits of this unit](#8-self-check-and-limits-of-this-unit)
- [9. Search log](#9-search-log)
- [10. Not verified](#10-not-verified)
- [11. References](#11-references)

## Summary

Public reading apps that show translated text share a small set of patterns. This survey fetched 26 candidates and proposes tiers for them (5 / 10 / 11). It asks 14 vision questions.

- **Reader goals.** Reading apps converge on three views: source only, translation only, and source with translation (Sefaria [2]; SuttaCentral [4]; Booklern [5]; Immersive Translate [6]). The reader switches between them.
  - Term help comes as sentence notes and word definitions in context (Satori Reader [7]).
  - Japanese display needs ruby, vertical text, and running heads (柱). Aozora Bunko viewers already render these (OyaziViewer [8]).
  - One 2026 study let readers read agentic machine translation of Japanese and other novels in an interface "designed to mimic e-book readers" (Ferstler et al. 2026 [1]).
- **Content scope.** Multilingual sites say openly that not every work exists in every language. They link each work to the versions that exist (nippon.com [12]; Sefaria [2]).
  - SuttaCentral tags each translation as "Aligned", "Legacy", or "Annotated" [4].
  - Alignment units differ: sentence (Booklern [5]), line (SuttaCentral [4]), about 300-word chunks (Ferstler et al. 2026 [1]), and page (Wikisource [9]; Distributed Proofreaders [10]).
- **Reader feedback.** Public text projects welcome reader error reports but route each one through a human check before the text changes (Aozora Bunko [13]; Distributed Proofreaders [10]; Wikisource [9]; Weblate [14]).
  - A September 2026 paper reports that feedback-informed revisions fix targeted issues more often, and that LLM judges often miss those fixes (Don-Yehiya et al. 2026 [17]).
- **Research layer.** A few public pages show the inner side of multi-agent translation: stage outputs, editor notes, and votes (BookTranslate.ai [21]; AMD blueprint [22]). Professional tools make AI decisions inspectable and traceable (DeepTrans Studio [23]; CHORUS [24]).
  - For lay users, implicit aids (backtranslation, question–answer tables) helped more than error highlights (Ki et al. 2025 [18]).
  - EU AI Act Article 50 applies from 2 August 2026 [26][27]. Its text duty covers AI text on "matters of public interest", with an exception for human review and editorial responsibility [25]. The EU offers free label icons [28].
- **Proposed tier 1** (closest prior work): Ferstler et al. 2026 (LAIT), BookTranslate.ai "The System" page, Sefaria, SuttaCentral, Wikisource ProofreadPage.

## Scope and terms

This draft covers how public readers meet translated or bilingual text, and what the Viewer can adopt. It is vision research for the next owner batch.

- *Covered*: public reading sites and apps, bilingual readers, text archives with reader feedback, research on readers of machine translation, demos that show translation steps, and 2026 rules on AI labels.
- *Not covered*: the Viewer design, the shared output format, the data model, the interface, and any code. Professional translation tools appear only as patterns for the research layer.
- *Excluded by owner rule*: v1 (all trees and the live site), and comic-style content.

Terms used below:

- A **parallel view** is a layout that shows source and translation together.
- A **segment** is the unit that an app aligns between source and translation: page, paragraph, line, or sentence.
- **QE** (quality estimation) is a translation quality score computed without a reference translation.
- The **research layer** is the inner side of the Translator shown to readers: stage outputs, levels, verdicts, and reasoning.
- **Ruby** (furigana) is small reading text set beside kanji. **Tategaki** is vertical Japanese writing.
- `[agent inference]` marks a sentence that no fetched source states. It is an idea, not a fact and not a decision.

## 1. Reader goals

Public reading apps let the reader choose how much of the source to see, and they keep that choice one tap away.

### 1.1 What public apps and research do (observed)

**Three reading views are the common core.**

- *Sefaria* (help pages updated 16 Feb 2026 and 1 Oct 2026) offers "Source", "Translation", and "Source with Translation" from one menu [2].
  - Texts can have several translations. A reader can open "two translations in adjacent panels" [3].
- *SuttaCentral* (interface wiki, 10 Nov 2023) offers "Plain", "Side by side", and "Line by line" views [4].
  - "Line by line" shows "one line in English, one line in Pali, one line in English, one line in Pali, etc." [4].
  - "References" are "the paragraph or page numbers that are in original Pali manuscripts" [4].
- *Booklern* (2026) shows a translation "under each English sentence", "in a second column", or hidden [5].
  - "Hovering a word highlights the matching phrase in the translation" [5].
- *Immersive Translate* "defaults to bilingual display mode" and has a "Translation Only Mode" [6].

**Continuous reading in the target language is a separate goal.**

- *Kindle Translate* publishes a translated eBook as its own store edition. "Readers will see language labels for Kindle Translate titles, along with samples to preview the translation" [11].
  - The KDP help page states: "Japanese books are not eligible at this time" [11].
- **LAIT** (Ferstler et al. 2026 [1]; arXiv v1 24 Jun 2026, v2 9 Sep 2026, accepted to Findings of EMNLP 2026) tested both goals with 15 avid readers.
  - Readers first read an ~8K-word excerpt in full ("immersive reading") in "the study interface designed to mimic e-book readers".
  - Then they compared ~300-word chunks "side by side" and highlighted good or poor wording ("close reading").
  - The machine translations came from an agentic pipeline, for novels in French, Polish, and Japanese into English.
  - Readers "cannot reliably tell the two apart (17/30 guess correctly)". "MT's quality varies more within one book than HT's does".

**Term help comes in two forms: notes on a sentence and definitions on a word.**

- *Satori Reader* annotates each sentence "with translations and other notes" [7].
  - It gives "the proper dictionary definition that makes sense in context" when a reader taps a word [7].
- SuttaCentral labels a translation "Annotated" when it has "footnotes/end notes" [4].

**Japanese display needs ruby, vertical text, and page furniture.**

- Satori Reader lets readers "see kanji, kana only, or kanji with furigana on top", or display words "According to your knowledge" [7].
- *OyaziViewer* (v2.6.18.0, 19 Aug 2026) renders Aozora Bunko text "縦書き・横書き" with "ルビ、傍線・傍点、字下げ" and can show "ページの上に表示される"柱"" [8].
- Original page images appear next to text in transcription projects, not in reading apps.
  - Wikisource marks a page "Proofread" when "the text matches the scan" [9].
  - Distributed Proofreaders shows volunteers "a scanned page image and the corresponding OCR text on a single web page" [10].
  - SuttaCentral keeps a "View page image" label for legacy texts [4].

**Search inside and across works exists, but few pages describe it.**

- SuttaCentral has a search mode "in all languages" [4]. OyaziViewer has "カラム指定検索" [8].

### 1.2 What the Viewer can adopt

- [agent inference] The three-view core (source, translation, both) fits the Translator output, because ED_3 is the translation and TS keeps the Japanese text.
- [agent inference] LAIT's two reading modes (immersive, then close side-by-side) map to two reader goals: reading a kendo text through, and checking a passage.
- [agent inference] The LAIT interface is released with the dataset. It can serve as a reference for an e-book-like reading view of agentic MT output.
- [agent inference] Kendo terms such as dojo terms and technique names can use Satori-style word notes, because kendo readers often keep Japanese terms.
- [agent inference] The TS output already keeps ruby, captions, running heads, and page numbers as fields. Aozora viewers show that readers expect these to render, not to vanish.
- [agent inference] SuttaCentral "References" to original page numbers suggest a cheap way to cite the source book page from any translated passage.

## 2. Content scope

Multilingual sites state partial coverage in plain words and let each work point to the language versions that exist.

### 2.1 What public sites do (observed)

**Partial language coverage is normal and stated.**

- *nippon.com* publishes "in Japanese, along with the six official languages of the United Nations" [12].
  - Its translation policy says: "unfortunately we cannot produce translations of everything in all languages. You can use the links at the top of each piece to jump to the versions available in other tongues" [12].
  - It also says translations "are not exact, one-for-one translations" and editors may add or shorten passages for readers outside Japan [12].
  - It fixes a romanization rule: "slightly modified Hepburn", macrons for long vowels, and surname-first names [12].
- Sefaria: "A translation is only visible if a translation exists in the Library" [2].
- Kindle Translate creates "a new language edition series" for translated series [11].

**Provenance of each version is visible.**

- SuttaCentral badges: "Aligned" (viewable side by side with the root text), "Legacy" (cannot be viewed with the root text), and "Annotated" [4].
- Booklern tags some books "human translation". Other books "are translated sentence by sentence as they are read" [5].

**Alignment granularity differs by purpose.**

- Sentence: Booklern aligns "at the level of the sentence" [5].
- Line: SuttaCentral "Line by line" [4].
- Chunk: LAIT used ~300-word chunks "preserving the paragraph boundaries" [1].
- Page: Wikisource and Distributed Proofreaders work page by page [9][10].

**Books and short articles side by side.** No fetched source states a policy for mixing books and short articles in one reader. nippon.com is an article site [12], and Sefaria and SuttaCentral are text libraries [2][4]. This is a named gap (see section 8).

### 2.2 What the Viewer can adopt

- [agent inference] The nippon.com pattern fits the owner's language plan: EN first, then ZH, KO, VI, with per-work links to the versions that exist.
- [agent inference] A SuttaCentral-style badge per version can tell readers which Translator level and which checks a text passed.
- [agent inference] The source material has two kinds of works: books with page images, and 313 kendojidai articles. Page-level units suit books, and paragraph units suit articles.
- [agent inference] The nippon.com romanization rule is a ready model for kendo names and terms in English.

## 3. Reader feedback

Public text projects welcome reader reports, but a human checks each report before the shown text changes.

### 3.1 What public projects and products do (observed)

**Error reports by email, with evidence from the source.**

- *Aozora Bunko* FAQ: "青空文庫は、通りすがりの読者からの誤植の指摘を歓迎しています" [13].
  - Readers are asked to check the 底本 first and report "底本の該当箇所のキャプチャ画像とともに" [13].
  - The FAQ warns that a fix can take "半年～１年ほど" [13].
  - Input and proofreading are done by different people "原則として" [13].

**Several reading rounds before release.**

- *Distributed Proofreaders* sends each page through three proofreading rounds and two formatting rounds, then a post-processor builds the e-book [10].
  - Volunteers can "smooth read" pre-released e-books "to check for errors" [10].
- *Wikisource* shows a page status that "is visible to all users" [9].
  - "Proofread means proofread by one contributor"; "Validated means proofread by two contributors"; "you cannot both proofread and validate the same page" [9].

**Suggestions, votes, and states in a localization platform.**

- *Weblate* (docs list release 2026.10.1) keeps suggestions apart from accepted text: "Suggestions are stored in Weblate only and not in the translation file" [14].
  - In peer review, "Suggestions become translations when given a predetermined number of votes" [14].
  - Machine drafts can stay "visibly unfinished" with the state "Needing edit" [14].
  - Its AI quality add-on "records quality checks without editing translations or approving them" [14].

**One-tap rating in an MT product.**

- *Google Translate* asks "Good translation or Poor translation", then offers reasons such as "Unintended meaning", "Awkward or incoherent", and "Too formal or casual", and a "Suggest an edit" box [15].
- Kindle Translate gives authors no direct edit: "Direct editing of the translated text is not available at this time" [11].

### 3.2 What research says about using reader feedback (observed)

- Don-Yehiya, Choshen, and Abend (arXiv, 2 Sep 2026) report that "feedback-informed revisions resolve targeted issues at significantly higher rates than baseline revisions" [17].
  - They also report that "LLM judges frequently fail to identify the genuinely corrected response" [17].
- Berger et al. (EAMT 2024) show that "human error markings guides the LLM to focus on a correction of the marked errors" [16]. This is older closest prior work.
- In LAIT, readers' span highlights matched their stated preference in 691 of 755 chunk judgments (91.5%) [1].

### 3.3 What the Viewer can adopt

- [agent inference] The Translator already improves agents by textual-gradient prompt updates. Checked reader reports can become one more input to those updates.
- [agent inference] Don-Yehiya et al. suggest that a QA judge alone can miss fixes that come from feedback. A human check of feedback-driven fixes keeps that risk visible.
- [agent inference] Aozora's request for a source capture fits the Viewer: a report can point to the source page image and the ruby-bearing TS text.
- [agent inference] Wikisource-style public status per page gives readers a cheap signal of how far a page was checked.
- [agent inference] Google-style reason lists give structured reports without a free-text burden on the reader.

## 4. Research layer

A few public pages already show the inner side of multi-agent translation, and research suggests that implicit aids help lay readers more than raw scores.

### 4.1 Showing intermediate outputs (observed)

- *BookTranslate.ai, "The System"* (date Not verified) documents "the complete journey of Osamu Dazai's classic 1940 short story" with "verbatim artifacts generated by the system at each stage" [21].
  - It names agent roles such as "Translator", "Proofreader", "Finalizer", "Threadweaver", and "Council" [21].
  - It shows editor feedback with an issue and a suggested fix, council votes such as "SPLIT DECISION (2-1 REJECT)", and per-model verdict text [21].
  - It shows a Japanese setup line and its payoff line next to the translation, to explain a consistency edit [21].
- *AMD Agentic Translation blueprint* (date Not verified) lists "Visible agent dialogue: The conversation between the agents is made visible to the user" [22].
- *DeepTrans Studio* (Lian et al., arXiv 29 Jun 2026, CSCW 2026 Demo) lets professionals "intercept selected nodes in an agentic translation workflow, review evidence, revise AI outputs" [23].
  - It aims to make "human interventions in AI-mediated work" become "shared, traceable knowledge" [23].
- *CHORUS* (Wang et al., v3 18 Sep 2026, ACM ICMI 2026) reports that its multi-agent design "made translation issues easier to inspect" for 30 licensed translators [24].

### 4.2 Showing quality or uncertainty to readers (observed)

- Ki, Duh, and Carpuat (EMNLP 2025) tested four aids for monolingual users who decide whether to share an MT output [18].
  - "all feedback types, except error highlights, significantly improve both decision accuracy and appropriate reliance" [18].
  - "implicit feedback, especially QA tables, yields significantly greater gains than explicit feedback" [18].
- Gladkoff et al. (arXiv 4 Aug 2026, ICNLSP 2026) argue that segment-level QE "tends to miss out on cohesion, coherence, and stylistic and rhetorical text features" [20].
- Marashian et al. (arXiv 15 Jun 2026) find that verbalized and internal confidence "perform similarly" for error detection and calibration, with "little to no correlation" between them [19].
- LAIT reports that "Automatic metrics, including LLM-as-a-judge approaches, fail to recover reader preferences and favor MT" [1].

### 4.3 Labels for AI-translated text (observed)

- The EU Code of Practice states that Article 50 obligations are "applicable from 2 August 2026" [26]. The final code was published on 10 June 2026 [26].
- AI Act Article 50(4), second subparagraph, requires deployers to disclose AI-generated text "published with the purpose of informing the public on matters of public interest" [25].
  - The duty does not apply "where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility" [25].
  - Article 50(5) requires the information "in a clear and distinguishable manner at the latest at the time of the first interaction or exposure" [25].
- The EU icons have three forms: a basic icon, "Fully AI-Generated", and "Partially AI-Modified" [28].
  - "performance improved across all measures when the basic icon was accompanied by a text label" [28].
  - A "second interactive layer" can carry more information [28].
  - "The use of these EU icons is optional, but the labelling requirements under Article 50 AI Act are not" [28].
- A public article label in practice: heise online ends a translated article with "It was translated with technical assistance and editorially reviewed before publication" [29].
  - The same article reports a Bitkom survey in which "72 percent of respondents demand a labeling obligation if AI was used in the creation of a book" [29].
- LAIT readers "tend to prefer the version they believe to be human" [1].

### 4.4 What the Viewer can adopt

- [agent inference] BookTranslate.ai shows that a public page can carry stage artifacts, editor notes, and votes on a Japanese text. The Translator grid produces the same kinds of artifacts: (result, reasoning) pairs per stage and level.
- [agent inference] A closed-by-default layer per page or paragraph matches the EU "second interactive layer" idea and keeps continuous reading clean.
- [agent inference] Ki et al. suggest that readers gain more from comparisons than from error highlights. Level-by-level versions of one passage are a comparison that the grid already produces.
- [agent inference] Gladkoff et al. and LAIT suggest that a single numeric score can mislead readers of long texts. A verdict in words with its reasons fits better.
- [agent inference] The heise footer is a short, plain model for a label: what was done by AI, and what a human checked.
- [agent inference] Whether kendo texts count as "matters of public interest" under Article 50(4) is a legal question. This survey does not answer it.

## 5. Candidate table

Proposed tiers follow the owner rules: tier 1 = closest prior work (cap 5), tier 2 = an idea we plan to adopt (cap 10), tier 3 = context only (cap 20). No item is placed. The owner places items, and lossless summaries follow.

Verification marks: "Verified" = this unit fetched the source page and quotes it. "Partial" = fetched, but a cited detail comes from a search-tool extract or the date is unknown. Dates are the source date shown on the fetched page.

| # | Name | Type | Date | URL | Topic | Proposed tier | One-line reason | Mark |
|---|---|---|---|---|---|---|---|---|
| 1 | LAIT, "AI translation of literary texts is 'fine', but readers still prefer human translations" (Ferstler et al.) | paper | v1 2026-06-24, v2 2026-09-09 | https://arxiv.org/abs/2606.26040 | Reader goals, Research layer | 1 | Agentic MT of novels incl. Japanese into English, read by public readers in an e-book-like interface that the authors release | Verified (abstract page, full HTML v2 and PDF v2 with Appendices A to I, repository README and paper supplement) |
| 2 | BookTranslate.ai, "The System" | project | Not verified | https://www.booktranslate.ai/system | Research layer | 1 | Public page shows verbatim multi-agent stage outputs, notes, and votes on a Japanese text | Partial (date unknown) |
| 3 | Sefaria (help pages) | tool | 2026-02-16; 2026-10-01 | https://help.sefaria.org/hc/en-us/articles/18613903906716-How-to-Choose-Between-Bilingual-or-Monolingual-Views | Reader goals, Content scope | 1 | Source / translation / both views, several translations per text, stated missing translations | Verified (Help Center API copies of the three articles) |
| 4 | SuttaCentral (interface wiki) | tool | 2023-11-10 | https://discourse.suttacentral.net/t/interface-translation-wiki/31199 | Reader goals, Content scope | 1 | Plain / side by side / line by line, Aligned-Legacy-Annotated badges, references to original pages | Verified |
| 5 | Wikisource ProofreadPage, "Help:Page status" | tool | 2025-04-14 | https://en.wikisource.org/wiki/Help:Page_status | Reader feedback, Research layer | 1 | Page status visible to all readers, text checked against the scan by one then two people | Verified |
| 6 | Kindle Translate (KDP help) | tool | page date Not verified | https://kdp.amazon.com/help/topic/GRSNH76FDTJHRX49 | Research layer, Content scope | 2 | Language label and sample preview for AI-translated editions | Partial (2026-06-30 expansion Not verified) |
| 7 | EU Code of Practice and EU icons for AI-generated content | project | code 2026-06-10; icons page 2026-09-24 | https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content | Research layer | 2 | Free icons, text label, first-exposure placement, second interactive layer | Verified |
| 8 | Ki, Duh, Carpuat, "Should I Share this Translation?" | paper | 2025-11 | https://aclanthology.org/2025.emnlp-main.606/ | Research layer | 2 | Implicit aids (backtranslation, QA tables) help lay readers more than error highlights | Verified (abstract) |
| 9 | Distributed Proofreaders | project | page built 2026-10-07 | https://www.pgdp.net/c/ | Reader feedback | 2 | Several rounds per page, then "smooth reading" of a pre-release by volunteers | Partial (wiki pages behind login) |
| 10 | Aozora Bunko FAQ, reader error reports | project | Not verified | https://www.aozora.gr.jp/guide/aozora_bunko_faq.html | Reader feedback | 2 | Readers report typos with a capture of the source page, and a human fixes the file | Partial (Shift_JIS mojibake, wording from search extract) |
| 11 | Weblate, "Translation workflows" | tool | docs at release 2026.10.1 | https://docs.weblate.org/en/latest/workflows.html | Reader feedback | 2 | Suggestions kept apart from text, vote threshold, "Needs editing" state for machine drafts | Verified |
| 12 | Satori Reader, "Features" | tool | Not verified | https://www.satorireader.com/features | Reader goals | 2 | Sentence notes, word definitions in context, furigana display by reader knowledge | Partial (date unknown) |
| 13 | nippon.com translation policy | project | Not verified (page ©2023) | https://foundation.nippon.com/en/what-we-do/nippon-com/ | Content scope | 2 | Japanese originals, per-piece links to existing language versions, romanization rule | Partial (date unknown) |
| 14 | Don-Yehiya, Choshen, Abend, "User Feedback Provides a Unique Signal that LLMs Can not Detect" | paper | 2026-09-02 | https://arxiv.org/abs/2609.02859 | Reader feedback | 2 | Feedback-informed revisions fix more issues, and LLM judges miss those fixes | Verified (abstract) |
| 15 | DeepTrans Studio (Lian et al.) | paper, tool | 2026-06-29 | https://arxiv.org/abs/2606.29727 | Research layer | 2 | Intercept nodes of an agentic workflow and keep traceable decisions | Verified (abstract) |
| 16 | AI Act Article 50 and Commission guidelines page | standard | consolidated text 2026-07-27; guidelines page 2026-08-06 | https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50 | Research layer | 3 | Legal context for AI text labels from 2 August 2026 | Verified (Article text and guidelines page; guidelines PDF not read) |
| 17 | Google Translate, "Submit Translate feedback" | tool | Not verified | https://support.google.com/translate/answer/12111375?hl=en | Reader feedback | 3 | Good/poor rating with reason list and "Suggest an edit" | Partial (date unknown) |
| 18 | Booklern bilingual reader | tool | 2026 (search metadata 2026-09-22) | https://booklern.com/bilingual-reader | Reader goals | 3 | Under-sentence, side-column, and hidden views, word-to-phrase highlight | Verified (page); date from search metadata |
| 19 | Immersive Translate, "How to use?" | tool | Not verified | https://immersivetranslate.com/en/docs/usage/ | Reader goals | 3 | Bilingual default with a translation-only mode | Partial (date unknown) |
| 20 | OyaziViewer (窓の杜 entry) | tool | v2.6.18.0, 2026-08-19 | https://forest.watch.impress.co.jp/library/software/oyaziviewer/ | Reader goals | 3 | Aozora Bunko viewer with tategaki, ruby, 傍点, and 柱 display | Verified |
| 21 | CHORUS (Wang et al.) | paper | v3 2026-09-18 | https://arxiv.org/abs/2602.19016 | Research layer | 3 | Multi-agent issues made inspectable for professionals | Verified (abstract) |
| 22 | AMD Agentic Translation blueprint | project | Not verified | https://enterprise-ai.docs.amd.com/en/v2.2.1/solution-blueprints/agentic-translation/README.html | Research layer | 3 | Demo UI with "Visible agent dialogue" | Partial (date unknown) |
| 23 | Marashian et al., "Speaking in Self-Assessing Tongues" | paper | 2026-06-15 | https://arxiv.org/abs/2606.17234 | Research layer | 3 | Verbalized vs internal confidence for MT errors | Verified (abstract) |
| 24 | Gladkoff et al., "Looking under the Wrong Lamppost" | paper | 2026-08-04 | https://arxiv.org/abs/2608.03577 | Research layer | 3 | Limits of segment-level QE scores | Verified (abstract) |
| 25 | Berger et al., "Prompting LLMs with Human Error Markings" | paper | 2024-06-04 | https://arxiv.org/abs/2406.02267 | Reader feedback | 3 | Error markings guide LLM corrections | Partial (end-user scenario only in search extract) |
| 26 | heise online report on the Bitkom survey | project | 2026-10-07 | https://www.heise.de/en/news/Survey-Germans-do-not-want-AI-generated-books-AI-translations-are-okay-11479496.html | Research layer | 3 | Reader attitudes to AI book translation and a live AI-assisted translation label | Verified (secondary report; Bitkom release not read) |

Counts: tier 1 = 5 (cap 5), tier 2 = 10 (cap 10), tier 3 = 11 (cap 20).

The Aozora row differs from the Translator register entry on Aozora Bunko. That entry covers the input and proofreading manuals. This row covers reader error reports.

## 6. Vision questions for the owner

Each question is vision level. Each option has one line of benefit and cost. "(default)" marks the honest default.

### 6.1 Reader goals

**RG-1. Who is the first reader that the Viewer serves?** The owner chose "Public readers" (2026-10-02). Public reading apps aim at different readers. Booklern and Satori Reader address learners. Kindle Translate sells whole translated books.

- a. Kendo practitioners who read English but not Japanese (default). Benefit: matches the EN-first research. Cost: Japanese-reading users get less.
- b. Bilingual readers and learners of Japanese. Benefit: parallel reading has the most value. Cost: more Japanese display work, such as ruby.
- c. NLP and MT researchers who arrive from the blog post. Benefit: ties to the research goal. Cost: public readers come second.
- d. All three equally. Benefit: no group is left out. Cost: no clear priority, larger scope.

**RG-2. What is the main way to read a work?** Sefaria, SuttaCentral, Booklern, and Immersive Translate all let readers switch among source, translation, and both.

- a. Translation first, original on request (default). Benefit: continuous reading, like a translated e-book. Cost: the source is less visible.
- b. Source and translation together by default. Benefit: every sentence can be checked. Cost: longer pages, harder on phones.
- c. The reader chooses at the start, with no default. Benefit: flexible. Cost: one more choice for every reader.

**RG-3. How do kendo terms reach the reader?** Satori Reader adds notes per sentence and definitions per word. nippon.com fixes a romanization rule for Japanese terms.

- a. Keep the romanized Japanese term, with a short note or glossary entry (default). Benefit: practitioners use these terms. Cost: notes add reading load.
- b. Translate terms into plain English words. Benefit: smooth for newcomers. Cost: loses the terms that practitioners use.
- c. English in the text, Japanese term in a note. Benefit: serves both groups. Cost: more notes to write and check.

**RG-4. How much of the original Japanese page does a reader see?** Transcription projects show the scan next to the text (Wikisource, Distributed Proofreaders). Reading apps seldom do.

- a. The original page image and Japanese text on request, where rights allow (default). Benefit: readers can check ruby, captions, and figures. Cost: image rights must be checked per book.
- b. Japanese text with ruby, but no page images. Benefit: lighter, fewer rights questions. Cost: figures and page layout are lost.
- c. Translation only, no Japanese. Benefit: simplest. Cost: readers cannot check the source.

### 6.2 Content scope

**CS-1. Which works come first?** The sources are Japanese kendo books (page images) and 313 kendojidai articles with a human English version.

- a. The 313 kendojidai articles first (default). Benefit: a human English version exists for research comparison. Cost: books, the main TS use, come later. Publication rights are not checked.
- b. Kendo books first. Benefit: shows the full TS → TL → ED → QA path on page images. Cost: no human reference translation. Publication rights are not checked.
- c. Both from the start. Benefit: full picture early. Cost: double the content work.

**CS-2. How does the Viewer handle languages that are not ready?** The owner plan is EN first, then ZH, KO, VI. nippon.com and Sefaria say openly when a version does not exist.

- a. Publish EN first, add other languages per work when ready, and show which versions exist (default). Benefit: matches the owner plan. Cost: uneven coverage across languages.
- b. Wait until a work exists in all four languages. Benefit: even coverage. Cost: long delay.
- c. Publish any language as soon as any work is ready, without a per-work list. Benefit: fastest. Cost: readers cannot see coverage.

**CS-3. Where a human translation exists (kendojidai English), does the reader see it?** The owner chose "Viewer shows Translator output" (2026-10-02). LAIT compared human and machine versions side by side in a study, not in a public reader.

- a. No, the public view shows Translator output only (default). Benefit: follows the 2026-10-02 decision and avoids rights questions. Cost: readers cannot compare.
- b. Yes, but only in the research layer, after a rights check. Benefit: supports the research story. Cost: needs permission from the rights holder.
- c. Yes, in the main view next to the Translator output. Benefit: full transparency. Cost: rights risk, and it changes the 2026-10-02 decision.

### 6.3 Reader feedback

**RF-1. Do public readers send feedback in v2?** Aozora Bunko, Distributed Proofreaders, and Google Translate all collect reader reports. Kindle Translate does not let authors edit translated text.

- a. Yes, one simple "report a problem" path, with an optional reason list and comment (default). Benefit: low effort for readers. Cost: reports need triage.
- b. Yes, a full "suggest a better translation" box. Benefit: richer input. Cost: more noise and more review work.
- c. No reader feedback in v2. Benefit: smallest scope. Cost: loses a research signal.

**RF-2. What does reader feedback do in the research?** Don-Yehiya et al. (2026) report that feedback helps revisions and that LLM judges often miss the fixed version.

- a. A human checks each report, and checked reports feed the QA stage and the textual-gradient prompt updates (default). Benefit: feedback becomes research data with a human gate. Cost: owner time per report.
- b. Reports fix the shown text only and do not touch the Translator. Benefit: simple. Cost: no learning signal.
- c. Reports are logged as data only, with no change to text or Translator. Benefit: no review load. Cost: readers see no effect.

**RF-3. Do readers see what happened to their report?** Wikisource shows page status to all users. Aozora Bunko warns that a fix can take half a year to a year.

- a. Yes, a public status per page or passage, plus a public change log (default). Benefit: trust and traceability. Cost: upkeep of the log.
- b. Yes, status only, no change log. Benefit: less upkeep. Cost: readers cannot see what changed.
- c. No public status. Benefit: no upkeep. Cost: readers do not know if a report mattered.

### 6.4 Research layer

**RL-1. Where does the inner side of the Translator live?** BookTranslate.ai shows stage artifacts on a public page. The EU icon guidance allows a "second interactive layer".

- a. An optional layer inside the Viewer, closed by default, per page or passage (default). Benefit: research is one tap away, reading stays clean. Cost: more content per page.
- b. A separate research view or the blog post only. Benefit: the reading view stays simple. Cost: readers rarely find it.
- c. Always visible next to the text. Benefit: maximum transparency. Cost: crowds the reading view.

**RL-2. Which inner outputs does the research layer show?** The grid writes (result, reasoning) pairs at each stage and level. Ki et al. (2025) found comparisons more helpful than error highlights.

- a. The QA_3 verdict and the versions of one passage across levels, without agent reasoning text (default). Benefit: readable comparisons. Cost: hides the reasoning, which is part of the method.
- b. Everything, including each agent's reasoning text. Benefit: full transparency for researchers. Cost: long and hard for public readers.
- c. The QA_3 verdict only. Benefit: short. Cost: little research value.

**RL-3. How does the Viewer tell readers that a text is AI-translated?** EU Article 50 applies from 2 August 2026. The EU offers free icons with a text label. heise ends its translated articles with a one-line label.

- a. A clear label on each work and each page that names AI translation and the human review status (default). Benefit: clear at first exposure. Cost: label text needs care.
- b. One site-wide notice. Benefit: simple. Cost: readers who land on a single page can miss it.
- c. No label. Benefit: none for readers. Cost: possible legal risk, and lower trust.

**RL-4. Do readers see numeric quality scores?** Gladkoff et al. (2026) argue that segment-level QE misses cohesion and style. LAIT found that automatic metrics did not recover reader preferences.

- a. No numbers in the public view; verdicts in words with reasons (default). Benefit: avoids false precision. Cost: less compact.
- b. Scores with a caution note. Benefit: compact. Cost: readers can over-trust them.
- c. Scores only in the research layer. Benefit: researchers get the numbers. Cost: two kinds of quality display to maintain.

## 7. PROPOSALS (agent ideas, not decisions)

Each line is an aki-research idea. None is an owner decision.

1. Place LAIT in tier 1 and write its lossless summary first. It is the only fetched 2026 study where public-style readers read agentic MT of Japanese books in an e-book-like interface.
2. Before any design, read the LAIT Appendix D section ("Interface", "Display normalization") in `docs/research/summaries/LAIT_lossless.md`. The repository `github.com/Yves575/lait` holds three interface screenshots and the participant guidelines, but no interface source code (summary lines 14 and 960).
3. Ask a lawyer or a reliable legal source whether Article 50(4) covers kendo texts on a public site, and whether the owner as editor meets the "human review or editorial control" exception.
4. Use the Wikisource status words (Not Proofread, Proofread, Validated, Without text, Problematic) as a model for a per-page check status that the QA stage can set.
5. Treat checked reader reports as a fifth input to the textual-gradient loop, beside the stage outputs. Keep a human gate, because LLM judges can miss feedback-driven fixes [17].
6. For the research layer, show level-by-level versions of one passage as the main comparison, following the Ki et al. finding on implicit aids [18].
7. Ask the owner whether the kendojidai English versions may appear publicly at all, before CS-3 is answered.
8. Run one more short search on reading tools for Chinese, Korean, and Vietnamese readers before ZH, KO, VI enter scope. This survey checked none.

## 8. Self-check and limits of this unit

**Quality targets from the brief.**

- *Every claim grounded in a fetched source*: met for all statements marked as observed. One cited detail, the Aozora Bunko FAQ wording, comes from a search-tool extract of a fetched URL. Other search-extract details appear only in section 10.
- *Focus May to September 2026*: 10 of 26 candidates carry a date in that window. Five carry an earlier date (Sefaria help, SuttaCentral, Wikisource, Ki et al., Berger et al.). Three carry an October 2026 date. Eight have no verifiable date.
- *Observations, inferences, and proposals kept apart*: inferences carry `[agent inference]`; proposals sit only in section 7.
- *Reference and adoption framing*: each item states what it does and what the Viewer can adopt. No item is framed as a comparison.
- *No v1, no comic-style sources*: met. No v1 path or the live site was opened.

**Named gaps.**

- No fetched source states a policy for mixing books and short articles in one reader.
- No reader app for Chinese, Korean, or Vietnamese was checked.
- Resolved after this unit: the Sefaria bilingual layouts "Original language on the right / on the left / Stacked" are now read in full from the Help Center API. See `docs/research/summaries/SefariaHelp_lossless.md` (owner 2026-10-07 20:05: "Fix both lines (Recommended)").
- Leads LingQ, Readlang, Du Chinese, Crowdin in-context editing, and sacred-text apps other than Sefaria were not fetched. No claim is made about them.
- Two 2026 reader-perception papers and one FAccT 2026 paper were blocked (HTTP 403). They are listed in section 10 and not used.

**Limits of the copies.** This unit had no Bash tool, so it could not run `curl`. The files in `docs/research/sources/` are verbatim excerpts saved with the Write tool, with URL and fetch date in each header. They are not full page copies.

## 9. Search log

All searches ran on 2026-10-07 with the websearch tool. Fetches ran on the same day with the webfetch tool.

| # | Query | Used for |
|---|---|---|
| 1 | `Kindle Translate Amazon AI translation books readers label 2026` | Kindle Translate |
| 2 | `EU AI Act Article 50 transparency obligations apply 2 August 2026 AI-generated text labelling code of practice` | Article 50, code, guidelines |
| 3 | `machine translation quality estimation shown to end users study 2026 arXiv` | Ki et al., Marashian et al., Gladkoff et al. |
| 4 | `bilingual parallel reading interface side by side translation reader study 2026` | Booklern, rosetta.koplugin (dropped), older TransRead lead (not used) |
| 5 | `Sefaria bilingual layout Hebrew English side by side text options translation versions` | Sefaria |
| 6 | `SuttaCentral parallel view root text translation side by side line by line settings` | SuttaCentral |
| 7 | `Wikisource proofread page status not proofread proofread validated colors Help:Page status` | Wikisource |
| 8 | `青空文庫 誤り 報告 正誤 入力 校正 作品 修正 依頼 方法` | Aozora Bunko FAQ |
| 9 | `Distributed Proofreaders rounds P1 P2 P3 F1 F2 post-processing smooth reading` | Distributed Proofreaders |
| 10 | `learning from end-user feedback machine translation LLM 2026 arXiv implicit feedback readers corrections` | Don-Yehiya et al., Berger et al. |
| 11 | `Weblate suggestions voting reviewers translation workflow documentation` | Weblate |
| 12 | `Google Translate "suggest an edit" OR "rate this translation" feedback help` | Google Translate |
| 13 | `readers perception AI-translated book disclosure label study 2026` | LAIT, heise, blocked papers |
| 14 | `interface showing intermediate drafts multi-agent translation pipeline demo reasoning visible to users 2026` | BookTranslate.ai, AMD, DeepTrans, CHORUS |
| 15 | `Immersive Translate bilingual display mode paragraph translation below original features` | Immersive Translate |
| 16 | `Satori Reader furigana settings sentence translation explanatory notes features` | Satori Reader |
| 17 | `nippon.com multilingual articles available languages Japanese English Chinese Korean translation` | nippon.com |
| 18 | `Global Voices Lingua translations available in languages article page` | Lead only, not fetched |
| 19 | `青空文庫 縦書き ルビ 表示 ビューア アプリ 2026` | OyaziViewer |

Fetch failures: aboutamazon.com Kindle Translate news page (transport error, two tries), two Distributed Proofreaders wiki pages (login wall), one Taylor & Francis article (HTTP 403), one ACM Digital Library page (HTTP 403).

## 10. Not verified

- Kindle Translate expansion on 30 June 2026 to French, Italian, and Portuguese. Source: search extract of the Amazon news page only. The KDP help page lists six eligible source languages, which is consistent but carries no date.
- Kindle Translate "7-step quality assurance threshold": the help page names it, but the detail page returned navigation text only.
- Commission guidelines on Article 50 dated 20 July 2026, and an Article 50(2) transition to 2 December 2026 under the Digital Omnibus. Sources: search extracts of law-firm and blog pages only. The fetched Article 50 page confirms only that its text includes Digital Omnibus amendments as at 27 July 2026.
- Al-Batineh et al., "Reader perceptions and willingness to pay for AI-translated literary fiction" (Taylor & Francis, 2026): HTTP 403.
- Zhang, "Reading without knowing: how authorship disclosure ..." (Taylor & Francis, 2026): not fetched.
- Fang, "What Influences Readers' and Writers' Perceived Necessity of AI Disclosure?" (FAccT 2026): HTTP 403.
- Distributed Proofreaders round names (P1, P2, P3, F1, F2) and Smooth Reading pool rules: wiki behind login.
- Exact wording of the Aozora Bunko FAQ: the fetch returned mojibake. The quotes come from the search extract of the same URL.
- SuttaCentral GitHub issues #1482 (2019) and #3446 (2025): search extracts only.
- Immersive Translate "Paragraphs are considered the smallest unit": search extract only.
- Global Voices Lingua per-language publishing: search extracts only.
- 天空神楽 and 読書尚友 Android viewers: search extracts only.
- Berger et al. end-user error-marking scenario: ar5iv search extract only.
- Publication dates of BookTranslate.ai "The System", Satori Reader "Features", Google Translate feedback help, AMD blueprint, Immersive Translate docs, Aozora Bunko FAQ, and nippon.com policy page.
- LingQ, Readlang, Du Chinese, Crowdin in-context editing, YouVersion: not fetched, no claim made.
- Whether kendo texts on the Viewer count as "matters of public interest" under Article 50(4): no source.

## 11. References

Fetch date for every entry: 2026-10-07.

[1] Ferstler, Podoxin, Brassington, Laperrière, Grundkiewicz, Meurs, Taboada, Karpinska. "AI translation of literary texts is 'fine', but readers still prefer human translations." Findings of EMNLP 2026 (accepted), arXiv:2606.26040, 2026. https://arxiv.org/abs/2606.26040 and https://arxiv.org/html/2606.26040v2

[2] Sefaria. "How to Choose Between Bilingual or Monolingual Views." Sefaria Help Center, updated 2026-02-16. https://help.sefaria.org/hc/en-us/articles/18613903906716-How-to-Choose-Between-Bilingual-or-Monolingual-Views

[3] Sefaria. "How to Select a Translation Other Than Your Default Translation." Sefaria Help Center, updated 2026-10-01. https://help.sefaria.org/hc/en-us/articles/18613593620636-How-to-Select-a-Translation-Other-Than-Your-Default-Translation

[4] SuttaCentral (Snowbird et al.). "Interface Translation Wiki." SuttaCentral Discuss & Discover, 2023-11-10. https://discourse.suttacentral.net/t/interface-translation-wiki/31199

[5] Booklern. "Bilingual reader for English books." 2026. https://booklern.com/bilingual-reader

[6] Immersive Translate. "How to use?" Documentation, date Not verified. https://immersivetranslate.com/en/docs/usage/

[7] Satori Reader. "Intelligent Features To Supercharge Your Japanese." Date Not verified. https://www.satorireader.com/features

[8] 窓の杜 (Impress). 「OyaziViewer」 library entry, v2.6.18.0 (2026-08-19). https://forest.watch.impress.co.jp/library/software/oyaziviewer/

[9] Wikisource. "Help:Page status." Last edited 2025-04-14. https://en.wikisource.org/wiki/Help:Page_status

[10] Distributed Proofreaders. "DP: Welcome" (home page), built 2026-10-07. https://www.pgdp.net/c/

[11] Amazon KDP. "Beta: Kindle Translate." KDP Help, date Not verified. https://kdp.amazon.com/help/topic/GRSNH76FDTJHRX49

[12] Nippon Communications Foundation. "What We Do: Nippon.com" (Editorial Policy, Translation Policy). Date Not verified. https://foundation.nippon.com/en/what-we-do/nippon-com/

[13] 青空文庫. 「青空文庫FAQ」. Date Not verified. https://www.aozora.gr.jp/guide/aozora_bunko_faq.html

[14] Weblate. "Translation workflows." Weblate documentation (latest, release 2026.10.1 listed). https://docs.weblate.org/en/latest/workflows.html

[15] Google. "Submit Translate feedback." Google Translate Help, date Not verified. https://support.google.com/translate/answer/12111375?hl=en

[16] Berger, Riezler, Exel, Huck. "Prompting Large Language Models with Human Error Markings for Self-Correcting Machine Translation." EAMT 2024, arXiv:2406.02267, 2024. https://arxiv.org/abs/2406.02267

[17] Don-Yehiya, Choshen, Abend. "User Feedback Provides a Unique Signal that LLMs Can not Detect." arXiv preprint arXiv:2609.02859, 2026. https://arxiv.org/abs/2609.02859

[18] Ki, Duh, Carpuat. "Should I Share this Translation? Evaluating Quality Feedback for User Reliance on Machine Translation." EMNLP 2025, pages 12069–12092. https://aclanthology.org/2025.emnlp-main.606/

[19] Marashian, Palmer, von der Wense. "Speaking in Self-Assessing Tongues: On the Verbalized Confidence of LLMs in Machine Translation." arXiv preprint arXiv:2606.17234, 2026. https://arxiv.org/abs/2606.17234

[20] Gladkoff, Vaasa, Wright, Strandvik, Han. "Looking under the Wrong Lamppost: On the Limitations of Automated Translation Quality Estimation." ICNLSP 2026 (to appear), arXiv:2608.03577, 2026. https://arxiv.org/abs/2608.03577

[21] BookTranslate.ai. "The System: A Transparent Look at Our Multi-Agent AI Translation Process." Date Not verified. https://www.booktranslate.ai/system

[22] AMD. "Agentic Translation" Solution Blueprint, AMD Enterprise AI docs v2.2.1. Date Not verified. https://enterprise-ai.docs.amd.com/en/v2.2.1/solution-blueprints/agentic-translation/README.html

[23] Lian, Zhang, Wang, Xiong, Yang, Meng, Gu, Wang. "DeepTrans Studio: Turning Expert Interventions into Shared Team Knowledge in Agentic Translation Workflows." CSCW 2026 Demo, arXiv:2606.29727, 2026. https://arxiv.org/abs/2606.29727

[24] Wang, Hu, Wu, Qian. "CHORUS: Designing Human-AI Multi-Agent Collaboration for Professional Translators." ACM ICMI 2026, arXiv:2602.19016v3, 2026. https://arxiv.org/abs/2602.19016

[25] European Union. Regulation (EU) 2024/1689 (AI Act), Article 50, consolidated text as at 27 July 2026. AI Act Service Desk. https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50

[26] European Commission. "Code of Practice on Transparency of AI-generated Content." Last update 2026-07-31. https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content

[27] European Commission. "Guidelines on transparency obligations for providers and deployers of certain AI systems." Last update 2026-08-06. https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations

[28] European Commission. "EU Icons for labelling AI-generated content." Last update 2026-09-24. https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content

[29] Friehe, A. "Survey: Germans do not want AI-generated books, AI translations are okay." heise online, 2026-10-07. https://www.heise.de/en/news/Survey-Germans-do-not-want-AI-generated-books-AI-translations-are-okay-11479496.html
