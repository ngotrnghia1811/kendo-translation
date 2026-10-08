---
title: Surveys, grounding register for the kendo-translation v2 Viewer
component: docs/research
status: active
version: 2
updated: 2026-10-07
sources:
  - docs/research/summaries/LAIT_lossless.md
  - docs/research/summaries/BookTranslateSystem_lossless.md
  - docs/research/summaries/SefariaHelp_lossless.md
  - docs/research/summaries/SuttaCentralInterface_lossless.md
  - docs/research/summaries/WikisourcePageStatus_lossless.md
---

# Surveys

This file is the grounding register for the v2 Viewer of kendo-translation. It lists the papers, projects, and tools that ground the Viewer research. The bibliography is `docs/research/references.bib`. The survey draft that produced the candidates is `docs/drafts/viewer-survey-2026-05-to-09.md`.

This register is new for the Viewer. It copies the file format of the Translator register (`kendo-translation-translator/docs/research/surveys.md`, version 5). It copies no Translator entry. No v1 entry carries over: "No v1 read" `[user 2026-10-07 10:55]`.

Tier membership rules: see "Tier rules (Viewer, v2)" below. The owner placed five items in tier 1 on 2026-10-07 (14:05). Tier 2 and tier 3 hold no item. The owner places items first, and lossless summaries follow.

**Lossless rule.** Every item placed in a tier of the Viewer list (paper, project, or tool) gets a lossless summary on disk at `docs/research/summaries/<Name>_lossless.md`. This follows the Translator flow. The frontmatter `sources` list holds the five tier 1 summary paths.

**Marks.** "Verified" means that a run fetched the source and quotes it in the survey draft. "Partial" means that the run fetched the source, but one detail or the date comes from a search-tool extract or is unknown. "Not verified" marks a claim that no fetched page supports.

## Refresh log

- 2026-10-07, aki-research (version 1): created the register. Added "Decisions that bind this register", "Tier rules (Viewer, v2)", and 26 rows under "Candidates, not placed", with proposed tiers 5 / 10 / 11. Frontmatter `sources` is empty, because no lossless summary exists.
- 2026-10-07, aki-execute (version 2): the owner placed five tier-1 items `[user 2026-10-07 14:05]`: LAIT, BookTranslate.ai "The System", Sefaria help pages, SuttaCentral interface wiki, and Wikisource Help:Page status. Lossless summaries written, one per item. Moved the five rows from "Candidates, not placed" to "Tier 1". Frontmatter `sources` now holds 5 entries.

## Decisions that bind this register

- 2026-10-02, 07:50, tier rules and stance on other work. Owner, verbatim: "WE DO NOT CARE ABOUT RESULTS FROM OTHER PAPERS. We simple want to refer, and if relevant, adopt from their work. Our main goal is to make OUR PROPOSAL work". Tiers cover papers, projects, and tools. Caps 5 / 10 / 20.
- 2026-10-02, 19:40, audience and content. Owner, verbatim: "Public readers (Recommended)" and "Viewer shows Translator output (Recommended)".
- 2026-10-02, 19:20, app. Owner, verbatim: "New app, live stays v1 (Recommended)".
- 2026-10-07, 10:55, method. Owner, verbatim: "Survey of reader apps first" and "No v1 read". First topics: "Reader goals", "Content scope", "Reader feedback", "Research layer".
- 2026-10-07, 14:05, tier 1 placement `[user 2026-10-07 14:05]`. The owner placed five items in tier 1: LAIT (Ferstler et al. 2026), the BookTranslate.ai The System page, Sefaria help pages, SuttaCentral interface wiki, and Wikisource Help:Page status. Tier 1 is full (5 of 5). Relayed by aki-main.

## Tier rules (Viewer, v2)

A *tier* is a rank of reference work by closeness to the Viewer. Tiers exist for reference and adoption only, not for comparison `[user 2026-10-02 07:50]`.

- Tier 1 = closest prior work, cap 5.
- Tier 2 = items with an idea we plan to adopt, cap 10.
- Tier 3 = items that give context only, cap 20.
- Tiers cover papers, projects, and tools `[user 2026-10-02 07:50]`.
- Every placed item needs a lossless summary in `docs/research/summaries/`.
- The v1 tier definitions are not used.

## Viewer list

### Tier 1

Tier 1 is full (5 of 5). The owner placed these five items `[user 2026-10-07 14:05]`. Reference and adoption only, not comparison `[user 2026-10-02 07:50]`. Row facts come from the "Candidates, not placed" table of version 1. The URL column comes from the local source copies in `docs/research/sources/`. The LAIT row carries two fixes from the 2026-10-07 full-text fetch.

| Item | Kind | Topic | URL | Reason, in adoption terms | Mark | Bib key | Source unit | Lossless summary |
|---|---|---|---|---|---|---|---|---|
| LAIT, "AI translation of literary texts is 'fine', but readers still prefer human translations" (Ferstler et al. 2026, arXiv:2606.26040v2, Findings of EMNLP 2026, accepted) | paper | Reader goals, Research layer | https://arxiv.org/abs/2606.26040 | Adopt the immersive-then-close reading protocol and the e-book-like interface as a reference for reading agentic MT of Japanese books. The repository releases interface screenshots and participant guidelines, not interface code | Verified (abstract page, full HTML v2 and PDF v2 with Appendices A to I, repository README and paper supplement) | `ferstler2026lait` | V1 | `docs/research/summaries/LAIT_lossless.md` |
| BookTranslate.ai, "The System" page | project | Research layer | https://www.booktranslate.ai/system | Adopt the public display of stage artifacts, editor notes, and votes for a Japanese text | Partial (date Not verified) | `booktranslateai_system` | V1 | `docs/research/summaries/BookTranslateSystem_lossless.md` |
| Sefaria Help Center (bilingual views, translation selection) | tool | Reader goals, Content scope | https://help.sefaria.org/hc/en-us/articles/18613903906716-How-to-Choose-Between-Bilingual-or-Monolingual-Views and https://help.sefaria.org/hc/en-us/articles/18613593620636-How-to-Select-a-Translation-Other-Than-Your-Default-Translation | Adopt source / translation / both views, several translations per text, and a plain notice when a translation is missing | Verified (Help Center API copies of the three articles) | `sefaria2026help` | V1 | `docs/research/summaries/SefariaHelp_lossless.md` |
| SuttaCentral, "Interface Translation Wiki" (2023) | tool | Reader goals, Content scope | https://discourse.suttacentral.net/t/interface-translation-wiki/31199 | Adopt plain / side-by-side / line-by-line views, Aligned-Legacy-Annotated badges, and references to original page numbers | Verified | `suttacentral2023interface` | V1 | `docs/research/summaries/SuttaCentralInterface_lossless.md` |
| Wikisource, "Help:Page status" (ProofreadPage, 2025) | tool | Reader feedback, Research layer | https://en.wikisource.org/wiki/Help:Page_status | Adopt a page status visible to all readers, checked against the scan by one and then two people | Verified | `wikisource2025pagestatus` | V1 | `docs/research/summaries/WikisourcePageStatus_lossless.md` |

- LAIT fix 1: the Mark changed from "Verified (abstract, HTML v2; Appendix D not read)" to the scope above, because aki-execute read Appendix D on 2026-10-07.
- LAIT fix 2: the Reason changed from "the released e-book-like interface" to "the e-book-like interface", plus one sentence on the release scope. The public repository at commit `e960dc2` holds no interface source code (see `LAIT_lossless.md`, section 8 D.1).
- The four other rows keep their version 1 facts. Their summaries come from a parallel aki-execute unit. Their marks are not re-checked in this version.
- Sefaria fix `[user 2026-10-07 14:58]`: the Mark changed from "Partial (layout article from search extract)" to "Verified", and the second URL uses the canonical slug. Evidence: `SefariaHelp_lossless.md`, Article C and the version note.

### Tier 2

No item placed (0 of 10).

### Tier 3

No item placed (0 of 20).

## Candidates, not placed

Every row below is a proposal by aki-research, 2026-10-07. None is placed. Source unit: V1 = `docs/drafts/viewer-survey-2026-05-to-09.md`, revision 1, section 5. Local source copies (verbatim excerpts) are in `docs/research/sources/`.

| Item | Kind | Proposed tier | Topic | Reason, in adoption terms | Mark | Bib key | Source unit | Lossless summary on disk |
|---|---|---|---|---|---|---|---|---|
| Kindle Translate, KDP help | tool | 2 | Research layer, Content scope | Adopt a language label and a sample preview for AI-translated editions | Partial (2026-06-30 expansion Not verified) | `amazon_kdp_kindletranslate` | V1 | no |
| EU Code of Practice on Transparency of AI-generated Content and EU icons (2026) | project | 2 | Research layer | Adopt free icons with a text label, placement at first exposure, and a second interactive layer | Verified | `eu2026codeofpractice`, `eu2026icons` | V1 | no |
| Ki, Duh, Carpuat, "Should I Share this Translation?" (EMNLP 2025) | paper | 2 | Research layer | Adopt implicit aids (comparisons, backtranslation, question–answer tables) over error highlights for lay readers | Verified (abstract) | `ki2025share` | V1 | no |
| Distributed Proofreaders | project | 2 | Reader feedback | Adopt several check rounds per page and "smooth reading" of a pre-release by volunteers | Partial (wiki behind login) | `dp_home` | V1 | no |
| Aozora Bunko FAQ, reader error reports | project | 2 | Reader feedback | Adopt reader typo reports with a capture of the source page, fixed by a human | Partial (wording from search extract) | `aozora_faq` | V1 | no |
| Weblate, "Translation workflows" | tool | 2 | Reader feedback | Adopt suggestions kept apart from text, vote thresholds, and a "Needs editing" state for machine drafts | Verified | `weblate2026workflows` | V1 | no |
| Satori Reader, "Features" | tool | 2 | Reader goals | Adopt sentence notes, word definitions in context, and furigana display by reader knowledge | Partial (date Not verified) | `satori_features` | V1 | no |
| nippon.com translation policy | project | 2 | Content scope | Adopt per-piece links to existing language versions, a stated partial-coverage policy, and a romanization rule | Partial (date Not verified) | `nippon_policy` | V1 | no |
| Don-Yehiya, Choshen, Abend, "User Feedback Provides a Unique Signal that LLMs Can not Detect" (arXiv:2609.02859, 2026) | paper | 2 | Reader feedback | Adopt feedback-informed revision with a human gate, because LLM judges miss feedback-driven fixes | Verified (abstract) | `donyehiya2026feedback` | V1 | no |
| DeepTrans Studio (Lian et al. 2026, arXiv:2606.29727, CSCW 2026 Demo) | paper, tool | 2 | Research layer | Adopt node-level inspection and a traceable decision record for an agentic workflow | Verified (abstract) | `lian2026deeptrans` | V1 | no |
| AI Act Article 50 and the Commission guidelines page | standard | 3 | Research layer | Context: AI text label duties from 2 August 2026 and the human-review exception | Verified (Article text, guidelines page) | `eu2024aiact_art50`, `eu2026guidelines_art50` | V1 | no |
| Google Translate, "Submit Translate feedback" | tool | 3 | Reader feedback | Context: good/poor rating with a reason list and "Suggest an edit" | Partial (date Not verified) | `google_translate_feedback` | V1 | no |
| Booklern bilingual reader (2026) | tool | 3 | Reader goals | Context: under-sentence, side-column, and hidden views, word-to-phrase highlight | Verified (date from search metadata) | `booklern2026reader` | V1 | no |
| Immersive Translate, "How to use?" | tool | 3 | Reader goals | Context: bilingual default with a translation-only mode | Partial (date Not verified) | `immersive_usage` | V1 | no |
| OyaziViewer (窓の杜 entry, v2.6.18.0, 2026-08-19) | tool | 3 | Reader goals | Context: Aozora Bunko viewer with tategaki, ruby, 傍点, and 柱 display | Verified | `oyaziviewer2026` | V1 | no |
| CHORUS (Wang et al. 2026, arXiv:2602.19016v3, ACM ICMI 2026) | paper | 3 | Research layer | Context: multi-agent issues made inspectable for professional translators | Verified (abstract) | `wang2026chorus` | V1 | no |
| AMD Agentic Translation Solution Blueprint | project | 3 | Research layer | Context: demo UI with "Visible agent dialogue" | Partial (date Not verified) | `amd_agentic_translation` | V1 | no |
| Marashian, Palmer, von der Wense, "Speaking in Self-Assessing Tongues" (arXiv:2606.17234, 2026) | paper | 3 | Research layer | Context: verbalized and internal confidence for MT errors | Verified (abstract) | `marashian2026verbalized` | V1 | no |
| Gladkoff et al., "Looking under the Wrong Lamppost" (arXiv:2608.03577, ICNLSP 2026) | paper | 3 | Research layer | Context: limits of segment-level QE scores | Verified (abstract) | `gladkoff2026lamppost` | V1 | no |
| Berger et al., "Prompting Large Language Models with Human Error Markings for Self-Correcting Machine Translation" (EAMT 2024) | paper | 3 | Reader feedback | Context: error markings guide LLM corrections | Partial (end-user scenario from search extract) | `berger2024errormarkings` | V1 | no |
| heise online report on the Bitkom survey (2026-10-07) | project | 3 | Research layer | Context: reader attitudes to AI book translation and a live label "translated with technical assistance and editorially reviewed" | Verified (secondary report) | `heise2026bitkom` | V1 | no |

- Count: 21 rows. Proposed tier 2: 10 rows (cap 10). Proposed tier 3: 11 rows (cap 20). The five proposed tier 1 rows moved to "Tier 1" in version 2 `[user 2026-10-07 14:05]`.
- The Aozora Bunko row covers reader error reports. It differs from the Translator register entry, which covers the input and proofreading manuals.
- Every row needs owner placement before any lossless summary is written.
