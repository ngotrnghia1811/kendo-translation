# LAIT (Literary AI Translation): lossless summary

- Title: AI translation of literary texts is ‘fine’, but readers still prefer human translations. The arXiv abstract page and the `citation_title` metadata write the title with straight double quotes: AI translation of literary texts is "fine", but readers still prefer human translations. The HTML v2 and the PDF v2 title use single curly quotes.
- Authors: Yves Ferstler, Adam Podoxin, Ty Brassington, Gaëlle Laperrière, Roman Grundkiewicz, Marie-Jean Meurs, Maite Taboada, Marzena Karpinska. Affiliations listed: Simon Fraser University, Université du Québec à Montréal, Microsoft. Correspondence: ferstler.yves@courrier.uqam.ca, karpinsk@sfu.ca. The HTML and the PDF text show the affiliation marks as symbols that the text conversion drops, so the mapping of each author to an affiliation is Not verified.
- Identifier and version: arXiv:2606.26040v2 [cs.CL]. DOI 10.48550/arXiv.2606.26040 (arXiv-issued DOI via DataCite). v2 is the newest version on the abstract page fetched at 14:12 on 2026-10-07.
- Date: v1 submitted Wed, 24 Jun 2026 17:15:14 UTC (17,774 KB). v2 revised Wed, 9 Sep 2026 16:43:14 UTC (15,667 KB). Submitter: Yves Ferstler. This summary follows v2.
- Venue: arXiv comment, verbatim: "Accepted for publication in Findings of the Association for Computational Linguistics: EMNLP 2026. Longer version of the camera-ready paper, with material moved into the main text (which extends to page 15). 53 pages total, including references and appendices". Subject: Computation and Language (cs.CL). The PDF v2 has 53 pages (PDFKit page count).
- Licence: arXiv.org perpetual non-exclusive license, http://arxiv.org/licenses/nonexclusive-distrib/1.0/ (abstract page link and HTML header). Repository code and documentation: MIT License (GitHub API `license.spdx_id` = `MIT`, and README "License" section).
- URL fetched: https://arxiv.org/abs/2606.26040, https://arxiv.org/html/2606.26040v2, https://arxiv.org/pdf/2606.26040v2, https://api.github.com/repos/Yves575/lait (plus `/contents`, `/commits`, `/git/trees/main?recursive=1`, and three `/contents/<dir>` listings), and raw files from https://raw.githubusercontent.com/Yves575/lait/main/ (README, START_HERE, three docs files, human_eval README, the paper supplement README, `Interface.md`, `Guidelines.pdf`, three interface screenshots, and two release manifests). The fetch of http://lait.cs.sfu.ca/ (as https) timed out after 30 seconds.
- Date fetched: 2026-10-07, 14:12 to 14:16 local time, by aki-execute with `curl`.
- Word count: this file, 1462 lines and 31454 words, with table pipes counted as words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:28, after this line was written). Source text file `lait-2606.26040v2.txt`: 3347 lines and 26908 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:12). PDF text file `lait-2606.26040v2.pdf.txt`: 5414 lines and 33749 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:14).
- Domain note: published literary fiction (novel openings of about 8,000 words). Main study: French, Polish, and Japanese source books translated into English, 5 books per source language, 15 books, 15 readers, 2 readers per book. Development set: 16 more books (5 French, 5 Japanese, 6 Polish, all into English). Multilingual case study: 2 books (one Japanese source, one Polish source) translated into Spanish, French, Polish, and Japanese, with 5 native-speaker readers. Japanese text is present: 5 Japanese source books in the main study, 5 in the development set, Japanese source text into Spanish, French, and Polish in the case study, and one Polish book into Japanese. Readers in the main study read English only. The paper text does not mention vertical text, OCR, furigana, ruby, page images, or bilingual display (grep of the text file, run 14:17).
- Source of this summary: the full arXiv v2 HTML text in `<V2>/docs/research/sources/lait-2606.26040v2.txt` (converted from `lait-2606.26040v2.html` with `textutil` at 14:12), checked against the PDF text in `<V2>/docs/research/sources/lait-2606.26040v2.pdf.txt` (extracted with macOS PDFKit through `swift`, because `pdftotext` is not installed). Abstract-page facts come from `<V2>/docs/research/sources/lait-2606.26040-abs.html`. Repository facts come from `<V2>/docs/research/sources/lait-repo/`. `<V2>` is `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer`. The earlier excerpt `<V2>/docs/research/sources/lait-2606.26040v2.md` (aki-research, 54 lines) was read and left unchanged.
- Code and data: the paper names `github.com/Yves575/lait` and `http://lait.cs.sfu.ca/`. The GitHub repository exists (HTTP 200): public, created 2026-06-11T13:09:49Z, last push 2026-09-01T02:57:06Z, default branch `main`, head commit `e960dc2` ("Merge pull request #2 from Yves575/camera-ready"), 2,022 tree entries, MIT. The public branch holds MT outputs, aggregate metrics, code, prompts, interface screenshots, and participant guidelines. It withholds source texts, human translations, row-level comments, and annotation exports. It has no source code for the reader study interface (no `.html`, `.js`, `.ts`, `.tsx`, `.jsx`, `.vue`, `.css`, or `.svelte` file in the tree). The gated Hugging Face dataset URL is a placeholder, `<HUGGING_FACE_DATASET_URL>`, in the README. See section 10.
- v1 and v2: this run did not fetch v1. Differences between v1 and v2 are Not verified. The v2 comment says that material moved into the main text.
- Notation in this file: HT = published human translation. MT = machine translation from the agentic pipeline (P3). Citation keys appear as in the HTML text (for example `kocmi-etal-2025-findings`), because the HTML references section converted to an empty block. The PDF reference list (PDF pages 15 to 18) is not reproduced here.

## 1. Abstract

arXiv abstract page (v2), verbatim:

> AI translation of literary works is increasingly common. While the content may be rendered adequately, we do not know enough about how readers experience it in terms of immersiveness and literary effect-aspects poorly captured by automatic metrics or human evaluation targeting fluency and adequacy. We ask 15 avid readers to compare recently published human translations (HT) to machine translations (MT) generated with an agentic language model-based pipeline, for 15 recent novels in French, Polish, and Japanese translated into English. Readers evaluated approximately 8K-word excerpts in two conditions: immersive reading of the whole excerpt (30 comparisons) and close reading of 386 aligned HT-MT chunk pairs (772 comparisons), with two readers per book. Overall, readers find MT "fine", but prefer HT (descriptively at the excerpt level, 19/30, and significantly at the chunk level, 522/772) for its ease, clarity, and immersive nature. Readers' highlights show that MT's quality varies more within one book than HT's does. Crucially, readers cannot reliably tell the two apart (17/30 guess correctly) and tend to prefer the version they believe to be human. Automatic metrics, including LLM-as-a-judge approaches, fail to recover reader preferences and favor MT. We release LAIT (Literary AI Translation), a reader-centered evaluation dataset with 1K reader comments, 2K judgments and preference ratings, and 7.2K span-level annotations, along with our evaluation protocol and supporting interface.

Abstract in the HTML v2 paper, verbatim:

> AI translation of literary works is increasingly common. While the content may be rendered adequately, we do not know enough about how readers experience it in terms of immersiveness and literary effect–aspects poorly captured by automatic metrics or human evaluation targeting fluency and adequacy. We ask 15 avid readers to compare recently published human translations (HT) to machine translations (MT) generated with an agentic language model-based pipeline, for 15 recent novels in French, Polish, and Japanese translated into English. Readers evaluated ~8K-word excerpts in two conditions: immersive reading of the whole excerpt (30 comparisons) and close reading of 386 aligned HT–MT chunk pairs (772 comparisons), with two readers per book. Overall, readers find MT “fine”, but prefer HT (descriptively at the excerpt level, 19/30, and significantly at the chunk level, 522/772) for its ease, clarity, and immersive nature. Readers’ highlights show that MT’s quality varies more within one book than HT’s does. Crucially, readers cannot reliably tell the two apart (17/30 guess correctly) and tend to prefer the version they believe to be human. Automatic metrics, including LLM-as-a-judge approaches, fail to recover reader preferences and favor MT. We release LAIT (Literary AI Translation), a reader-centered evaluation dataset with 1K reader comments, 2K judgments and preference ratings, and 7.2K span-level annotations, along with our evaluation protocol and supporting interface.

The two versions differ only in typography: "approximately" versus "~", "effect-aspects" versus "effect–aspects", and straight versus curly quotes. Under the abstract, the HTML lists two links: `github.com/Yves575/lait` and `http://lait.cs.sfu.ca/`.

## 2. Introduction (paper section 1)

Context.

- "Machine-translated literature is reaching real readership." Examples given: Amazon Kindle Translate for self-publishing authors (`amazon_staff_kindle_translate_2025`), GlobeScribe, which markets AI translation to smaller publishers (`globescribe_website`), Veen Bosch & Keuning, "the largest Dutch trade publisher", which announced AI-assisted translation (`creamer_dutch_2024`), and Japan's Shogakukan, which "released an app offering AI-assisted translations of light novels to US and Canadian readers" (`nishioka2024novelous`).
- Footnote 1, verbatim: "We use AI translation and MT interchangeably for LLM-based translation; questionnaires used AI as it is likely the term readers are more familiar with."
- Readers sometimes prefer fine-tuned AI fiction to expert human writing, "at least on short excerpts" (`chakrabarty2025readers`).
- The question the paper poses, verbatim: "So how does AI translation shape the reading experience and the perception of the author’s work compared to a professional human translation, especially once readers stay with the text for 25–30 pages?"
- Readers respond to "rhythm, emotions, voice, and deliberate word choices". The paper states that current evaluation setups "often concentrate on small units" and "break the immersion with segment-level ratings ... or error annotations". It concludes: "To capture the value of machine literary translation, we need to pose this question directly to the reader".

Study, as the introduction states it.

- 15 avid readers read and compare 8K-word excerpts (about 30 book pages) translated from Japanese, Polish, and French into English by professional literary translators (HT) and by an agentic LLM-based pipeline (MT).
- Footnote 2, verbatim: "We choose new books translated recently (2025–2026) into English to mitigate the training data contamination issue."
- Immersive reading: readers read each version "in full and uninterrupted, as they would a published book".
- Close reading, verbatim: "Then, we ask them to look closer at both texts in 300-word chunks presented side by side and to highlight phrasing they judge as good or poor before indicating which version they prefer (close reading)."
- Readers also give detailed comments and guess which text is MT.

Figure 1 caption, verbatim:

> Figure 1: Evaluation pipeline: Avid readers of published fiction evaluate a human translation (HT) and an AI-generated machine translation (MT) of an 8,000-word book excerpt. Participants (1) read the first translation, (2) complete a questionnaire, (3–4) repeat both steps for the competing translation, (5) compare both versions, (6) take a one-day break, and (7) evaluate 300-word chunks side by side, selecting the preferred version with a justification. Presentation order is counterbalanced, i.e., each book is evaluated in both HT-first and MT-first conditions, and each reader evaluates two books, one in each order.

Figure 1 labels in the PDF text: "Translator: Howard Curtis / Published: March, 2026" and "Translator: Agents / Produced: March, 2026", "Translation v1", "Questionnaire for v1", "Translation v2", "Questionnaire for v2", "Immersive Reading", "Close Reading", "15 readers", "15 recent books", "~8k words/book", "2 books/reader", "2 readers/book", "order counterbalanced", "~30 comp.", "~300 words per chunk", "span highlights", "preference", "justification", "confidence", "Comparative Questionnaire", "Side-by-Side Chunks", "Break (1 day+)".

Summary of findings in the introduction.

- Slight preference for HT, significant under close reading (522/772), descriptive under immersive reading (19/30).
- Readers "do not completely reject MT as they often find it readable and sometimes preferred".
- Chunk-level span annotations show that MT quality varies much more within a single book than HT. MT success "depends more on the book than the source language".
- HT is praised more for immersion, naturalness, and literary rendering, for example "having soul" (HT) versus "translation for dummies" (MT). MT sometimes wins on readability or local word choices.
- Readers' MT identification stays close to chance after reading both excerpts (17/30). Readers "are misled by common AI tells ... such as em-dashes or assumptions about AI not using swear words".
- Automatic metrics, including LLM-as-a-judge, "fail to recover reader preferences and all favor MTs".

Contributions, verbatim:

> - Data: We introduce LAIT, a reader-annotated dataset of 15 FR/PL/JA→EN novel openings (2025–2026), each aligned across source, published HT, and agentic MT at the excerpt, chunk, and paragraph levels. Two readers per book gave 2K ratings and preferences, 1K comments, and 7.2K span-level annotations; an unannotated 16-book development set adds 1.7K paragraph-level alignments across five candidate MT systems.
> - Analysis: We show that modern literary MT into English can be readable and hard to detect, but its quality varies within a book more than HT, and readers still value HT.
> - Methodology: We introduce a reader-centered evaluation protocol combining immersive and close reading, and release our guidelines and annotation software to support reproducibility and future work.

## 3. Data and methods (paper section 2)

### 3.1 Constructing LAIT (section 2.1)

Book selection.

- Recently published, critically acclaimed fiction originally in French, Polish, and Japanese, with professional English translations published in 2025–2026, "to mitigate data contamination".
- 15 books for human evaluation, five per source language (Table 1). 16 books reserved for selecting the MT pipeline. Total 31 books (full list in Appendix A).
- Footnote 3, verbatim: "We limit our human evaluation to 15 books due to the prohibitive cost."
- Footnote 4, verbatim: "All source books and translations were purchased and processed solely for research purposes. To comply with Fair Dealing guidelines for research, we have retained no more than 10% of any individual work."

Table 1, reproduced. Caption, verbatim: "Table 1: Summary statistics for the evaluation dataset. Words are whitespace-delimited counts. Tokens are computed with tiktoken (o200k_base). Sentence counts for HT and MT use spaCy (en_core_web_trf)."

| Unit | Statistic | HT Tokens | HT Words | HT Sents | MT Tokens | MT Words | MT Sents | SRC Tokens |
|---|---|---|---|---|---|---|---|---|
| Excerpts (n=15) | Mean | 9,680 | 7,623 | 547 | 9,582 | 7,676 | 539 | 13,307 |
| Excerpts (n=15) | St. Dev. | 535 | 449 | 74 | 626 | 529 | 73 | 2,316 |
| Excerpts (n=15) | Max | 10,261 | 7,995 | 668 | 10,500 | 8,595 | 683 | 19,116 |
| Excerpts (n=15) | Min | 8,600 | 6,747 | 440 | 8,474 | 6,928 | 447 | 9,882 |
| Chunks (n=386) | Mean | 376 | 296 | 21 | 372 | 298 | 21 | 442 |
| Chunks (n=386) | St. Dev. | 66 | 49 | 8 | 73 | 57 | 8 | 130 |
| Chunks (n=386) | Max | 611 | 486 | 51 | 644 | 530 | 50 | 870 |
| Chunks (n=386) | Min | 118 | 100 | 4 | 121 | 102 | 4 | 79 |

[aki-execute note] The SRC token values in Table 1 (mean 13,307, SD 2,316, max 19,116, min 9,882 for excerpts) differ from the SRC token values in Table 6 (mean 13,026.4, SD 1,527.0, max 15,967, min 11,155). The PDF text shows the same values as the HTML. The paper does not explain the difference.

Source and target languages, verbatim:

> We selected French, Polish, and Japanese as source languages because they span different language families, cultures, and literary traditions. We chose English as the target language to probe the upper bound of translation capability, since modern language models are exceptionally strong in English ahuja-etal-2023-mega; zhu-etal-2024-multilingual. Furthermore, the researchers’ familiarity with all the languages facilitated data collection and analysis.

Excerpt extraction.

- For each book, an opening excerpt from the English HT of about 8K words (μ = 7,623, SD = 449) under whitespace tokenization, with paragraph boundaries kept.
- Footnote 5: excerpts contained on average 543 sentences (SD = 72), "equivalent to ~30 pages of a typical printed novel". This "corresponds to 32,578 sentences or ~1,800 pages read by all participants combined".
- [aki-execute note] Footnote 5 gives 543 sentences (SD 72). Table 1 gives HT 547 (SD 74) and MT 539 (SD 73). The paper does not say which count footnote 5 uses.
- The length "supported immersive reading while keeping the task feasible".
- The authors then manually identified the corresponding source excerpt to get the source-target mapping with HT.

Dataset excerpt preprocessing.

- Before MT, the authors manually inspected excerpts and "removed editorial notes and footnotes while preserving the original paragraph structure".
- Further normalization, for example unifying quotation marks, applied to MTs and HTs before evaluation "to minimize the influence of surface-level features" (see Appendix D, "Display normalization").

MT pipeline selection.

- Five configurations compared on the 16-book development set:
  - P1: full-excerpt translation with post-editing.
  - P2: chunk-level translation with excerpt-level post-editing.
  - P1 and P2 each with GPT-5.4 (`openai2026gpt54`) or Gemini 3.1 Pro (`googledeepmind2026gemini31pro`).
  - P3: "an AutoFiction-inspired agentic pipeline (pham_chang_desai_iyyer_2026) using Claude Code and Codex".
- Footnote 6, verbatim: "We chose GPT and Gemini models because their model families performed strongly in WMT25 (kocmi-etal-2025-findings); we included coding agents because they can operate over long contexts and multiple reference files, and have been shown to produce better long-context literary fiction huot2025agents."
- Blind five-way preference task: six raters, each assessed 2–3 books. Footnote 7, verbatim: "Five of the raters were authors and one was a volunteer colleague." For each book, raters read five anonymized translations in random order, selected the most preferred version "as a literary translation", and gave a short comment.
- Result, verbatim: "The configurations were closely matched, with one exception: P3 was chosen most often, but only by a small margin, while P1 with GPT-5.4 was the clear outlier."
- Footnote 8, verbatim: "First-choice votes were: P3 (5/16), P1 with Gemini 3.1 Pro (4/16), P2 with Gemini 3.1 Pro (3/16), P2 with GPT-5.4 (3/16), and P1 with GPT-5.4 (1/16)."
- Decision, verbatim: "We adopted P3, as it produces good translations, not because of evidence that it is decisively better."
- [aki-execute note] Footnote 7 says five raters were authors and one a volunteer colleague. Appendix B says "six raters (the authors and volunteer colleagues)".

Agentic pipeline.

- Adapted from the AutoFiction long-form fiction generation framework (`pham_chang_desai_iyyer_2026`).
- Two coding agents: Claude Code with Claude Opus 4.6 (`anthropic2026claudeopus46`) and Codex with GPT-5.4.
- Footnote 9, verbatim: "We set the reasoning effort to the maximum value, which is max for Claude Code and xhigh for Codex. Both agents were accessed via a monthly subscription at the cost of $400 USD for the entire experiment."
- Three stages, verbatim:

> 1. Preprocessing: Claude Code analyzed the source excerpt to produce translation guidelines (e.g., register, terminology, translation memories). The source was then divided into 1K-token chunks while preserving paragraphs.
> 2. Chunk-level: Codex translated each chunk, which was then reviewed along two dimensions: (1) translation quality (e.g., faithfulness) using a modified version of LiTransProQA (zhang-etal-2025-litransproqa) (Codex), and (2) literary quality review (e.g., voice, style) adapted from AutoFiction (Claude Code). Based on the output of these reviews, an acceptance gate determined whether the chunk proceeded to the next stage or was sent for revision. We allowed up to three local cycles total due to the high associated cost and small gains.
> 3. Excerpt-level: Revised chunks were merged into a full draft and reviewed for (1) global literary quality and (2) cross-chunk consistency (Codex). The results passed through a final acceptance gate, which triggered revision by Claude Code if minimum quality thresholds were not met.

- Footnote 10, verbatim: "The gate uses the review rubrics described in §C; chunks pass only when the automatic reviewers find no major faithfulness or literary-quality problems."
- Footnote 11, verbatim: "Development runs allowed three local cycles; subsequent evaluation and multilingual runs used two because the third cycle offered limited gains. Make Me Famous retained its earlier three-cycle run. See Appendix C for details."
- Footnote 12, verbatim: "The final gate uses the excerpt-level rubrics described in §C; drafts pass only when the automatic reviewers find no major global-quality or cross-chunk consistency problems. We allowed up to two global cycles."

Figure 2 caption, verbatim: "Figure 2: Agentic literary MT pipeline used in this study. Source excerpts are chunked and paired with style guidance, then translated and revised through chunk-level and full-draft review loops."

Figure 2 box labels in the PDF text:

| Box | Label text |
|---|---|
| Chunker | "Preserves paragraph boundaries; uses ~1000-token chunks" |
| Style Analysis | "Extracts voice, register, terminology, and named entities" |
| Prepared Inputs | "Source chunks and style guidance for downstream agents" |
| Translation Quality Review | "Checks source faithfulness and local adequacy" |
| Literary Quality Review | "Checks voice, prose, dialogue, and style preservation" |
| Chunk Acceptance Gate | "Must pass both reviews", with PASS and FAIL arrows |
| Targeted Chunk Revision | "Revises failed chunks using reviews"; "Model switches after 3 consecutive failed revisions" |
| (full draft) | "Rebuilds a full-draft from current chunks" |
| Whole Excerpt Review | "Checks literary quality visible across the full draft" |
| Cross-Chunk Continuity Check | "Checks transitions and consistency across chunks" |
| Final Acceptance Gate | "Sends affected chunks back if moderate or severe issues remain", with PASS and FAIL arrows |
| Global Revision | "Revises affected chunks using review feedback" |
| Final Translation! | "Saves the best confirmed output" |

The figure also shows "parallel reviews" twice. [aki-execute note] The box order above follows the PDF text order and the main-text description. The exact arrow layout is Not verified, because the figure is an image.

Chunking.

- Each HT excerpt split into about 300-word chunks (μ = 296, SD = 49), with paragraph boundaries kept. Result: 386 chunks across the 15 evaluation books.
- Chunks aligned to the MT and source text "using Gemini 3.1 Pro". "All alignments were verified manually."

### 3.2 Human evaluation protocol (section 2.2)

Figure 3 caption, verbatim: "Figure 3: Study design and evaluation counts. Two readers evaluated each of the 15 book excerpts (30 book-reader evaluations)."

Figure 3 labels in the PDF text: "setup: 15 source book excerpts", "2 readers per book", "15 unique readers", "15 source excerpts x 2 readers = 30 setups", "immersive reading: excerpt-level single reading: 15 HT 15 AI ... 30 excerpts x 2 readers x 2 version = 60 evaluations", "excerpt-level comparison: 15 excerpt pairs x 2 readers = 30 comparisons", "close reading: chunk-level comparison: 386 HT 386 AI ... 386 chunk pairs x 2 readers = 772 comparisons".

Overview.

- 15 excerpts (about 8K words), HT (published) and MT (the pipeline).
- Each excerpt evaluated by two readers. Each reader evaluated both versions of two books (within-subjects). Footnote 13, verbatim: "Evaluations were consecutive, i.e., readers finished one book before starting the next."
- 60 evaluations and 30 comparisons at the excerpt level (immersive reading).
- "After a one-day break, readers re-evaluated the same excerpts chunk by chunk, yielding 772 chunk-pair comparisons (close reading)."

Participants.

- 15 avid readers recruited through Upwork (footnote 14: `upwork.com`), self-reported 12–120 books per year.
- Readers "primarily read in English and were very comfortable with long literary texts, i.e., the target readers of the published translations".
- "Where possible, we matched readers to their preferred genres/story types."
- Pay: $110 per book (about 4 hours, $27.50 per hour) plus a $5–10 completion bonus. Total cost including bonuses and Upwork fees: $4K USD.
- "The protocol was approved by the Institutional Review Board."

Table 2, reproduced. Caption, verbatim: "Table 2: Questionnaire items for human evaluation. Scales: 5-point Likert (5L); categorical with 2/3/4 options (2C/3C/4C); good/poor span labels (Span); free text (Open). See §D for the full wording."

| Block | Question | Type |
|---|---|---|
| Immersive reading — single-reading | Q1: Acceptability as a published translation | 5L |
| | Q2: Reading smoothness (fluency) | 5L |
| | Q3: Wording/style support for immersion | 5L |
| | Q4: Willingness to keep reading this version | 5L |
| | Q5: Positive aspects of wording/style | Open |
| | Q6: Negative aspects of wording/style | Open |
| | Q7: Human- vs. machine-translated guess | 2C |
| | Q8: Confidence in guess | 5L |
| Immersive reading — comparison | Q1: Better dialogue handling | 3C |
| | Q2: More varied / expressive word choice | 3C |
| | Q3: Version to continue reading | 4C |
| | Q4: Justification for preferences | Open |
| | Q5: More likely AI-translated | 2C |
| | Q6: Confidence in choice | 5L |
| | Q7: Justification for the judgment | Open |
| Close reading — per chunk pair | Q1: Highlight good / poor phrases | Span |
| | Q2: Preferred translation | 2C |
| | Q3: Justify choice | Open |
| | Q4: Difficulty of the choice | 3C |
| Post-study — after both assigned books | Q1: Prior expectations for AI translation quality | Open |
| | Q2: Surprise at MT-identification accuracy | Open |
| | Q3: Opinion of AI translation after the study | Open |
| | Q4: Other comments | Open |

Procedure, verbatim:

> Each participant provided informed consent and completed a demographic survey on AI use and reading habits. Upon submission of a passphrase embedded in the guidelines the participants received access to the study interface designed to mimic e-book readers. They then completed the immersive reading task, the close reading task (unlocked after 24h), and a post-study questionnaire (see Table 2 for questions overview).

Immersive reading, verbatim:

> Participants read one translation of the entire excerpt and answered eight single-reading questions, seeing only that version; they then repeated this for the second translation. Only after both readings did they compare the two versions directly (seven comparative questions). Reading order was counterbalanced for each book, i.e., one reader started with HT and the other with MT, and each reader started with HT for one of their books and MT for the other. Participants were not told which version was MT.

Close reading, verbatim:

> Participants then assessed aligned ~300-word HT and MT chunks side by side: for each pair, they highlighted especially good or poor wording, chose the preferred translation, justified the choice, and rated its difficulty.

Questionnaires, verbatim:

> We used four questionnaires. The immersive reading task included two: (1) a single-reading questionnaire presented immediately after each reading, and (2) a comparative questionnaire presented after both readings. Together, these captured global reading experience. The close reading task used (3) a questionnaire for each chunk pair, capturing local preference. Finally, after participants completed both books, we administered (4) a post-study questionnaire with four open-ended questions about their thoughts on translations. See Table 2 for questions.

Quality control.

- Participants submitted a passphrase embedded in the guidelines before they received credentials, "confirming they had read the instructions".
- "We also recorded screen-reading time and detected anomalies such as fast scrolling."
- Footnote 15, verbatim: "Two readers were excluded for insufficient comment detail and fast reading, and replaced by two others to keep the sample size at 15."
- The Pangram AI detector (`emi2024technicalreportpangramaigenerated`) ran over participant comments to flag possibly AI-generated text. Footnote 16, verbatim: "No comments were flagged as AI-generated or AI-assisted."

## 4. Results and analysis (paper section 3)

Figure 4 caption, verbatim: "Figure 4: The distribution of readers’ preferences between the human translation (HT) and the machine translation (MT) after excerpt-level immersive reading and chunk-level close reading. The readers were judging which version they preferred and how strong the preference was."

Figure 5 caption, verbatim: "Figure 5: The distribution of readers’ ratings after immersive reading of each excerpt in isolation. The readers were judging acceptability (whether it is acceptable as a published translation), smoothness, immersiveness (whether it supported immersion), and continue (whether they would continue reading)."

### 4.1 Readers' ratings and preferences (section 3.1)

Readers prefer HT, especially in close reading.

- Excerpt level (co-Q3, which version to continue reading): 19 of 30 judgments favored HT, 11 favored MT (exact 95% CI for the HT share [44%, 80%]). 16 clear preferences for HT, 7 clear preferences for MT (Figure 4).
- Not significant: order-adjusted HT probability = 63.4%, OR = 1.73, 95% CI [0.82, 3.65], p = .148.
- Footnote 17, verbatim: "Unless otherwise stated, statistical tests in this section use mixed-effects regression models with random intercepts for reader and book, and, where supported by a likelihood-ratio test, their interaction, with a model family appropriate for the response variable type. When a mixed-effects model is singular, we report the corresponding simpler model. See §H for details."
- Chunk level (ch-Q2): 522 of 772 favored HT, including 205 strong preferences. 250 favored MT, including 54 strong preferences.
- Chunk-level HT preference significant: OR = 3.28, 95% CI [1.41, 7.59], p = .0056. Preference strength modeled directly: signed mean = 0.91, 95% CI [0.24, 1.58], p = .010.
- Footnote 18, verbatim: "Reading order (HT-first vs. MT-first) was included as a predictor in the preference models and was not significant (excerpt-level: p=.705, chunk-level: p=.327)."

HT is rated higher for quality, especially for smoothness and as a publishable translation.

- 5-point ratings after each reading: acceptability as a published translation, smoothness, support for immersion, willingness to continue reading (Figure 5).
- HT got a large share of top ratings (4 or 5) and no rating of 1.
- Compared with MT, HT had 4.0 times the odds of a higher acceptability rating (p = .0069; at most .043 across all six random-effects specifications, Table 39) and 4.3 times the odds of a higher smoothness rating (p = .0029; at most .018).
- Immersion and willingness to continue favored HT but were not significant (p = .0815 and .1150).
- Footnote 19, verbatim: "Models with random slopes for type (on reader or book) yield comparable results; see Table 39."

HT is preferred on dialogue and word choice.

- Excerpt level: HT favored on dialogue (17 vs. 9, 4 ties) and word choice (18 vs. 10, 2 ties). Neither significant (signed means = 0.27; p = .109 and .131; Table 36).
- Figure 6 caption, verbatim: "Figure 6: The distribution of readers’ excerpt-level preferences for dialogue handling and word choice after reading both the human translation (HT) and the machine translation (MT). The readers were judging which version handled dialogue better overall and which version had more varied or expressive word choice."

HT preference does not imply MT failure.

- Of the 11 excerpt-level judgments for MT, 7 expressed a clear preference.
- After immersive reading, 54% of MT responses showed moderate to strong willingness to continue (rating 4 or 5), against 66% for HT.
- In close reading, about one-third (32%) of chunk-level choices favored MT.

MT preference varies by book but not by language.

- MT share in close reading: French 32%, Japanese 34%, Polish 31%.
- Footnote 20, verbatim: "There was no evidence that language predicted MT preference after accounting for reading order and repeated judgments by reader and book (p=.928)."
- Preference toward MT varied across books from 4% to 88%. Book identity was strongly associated with chunk-level preference (p < .001).
- Verbatim: "The clearest case is Hooked: A Novel of Obsession, preferred in MT 88% of the time and consistently by both readers, suggesting that sometimes HT may fall short."

Figure 7 caption, verbatim: "Figure 7: Distribution of good and poor span highlights by source language and translation type."

Readers highlight more positive evidence in HT and more negative evidence in MT.

- Positive evidence: HT 107.8 versus MT 68.5 highlighted words per 1K words.
- Negative evidence: MT 100.7 versus HT 42.9.
- The gap holds across all three source languages (Figure 7).
- HT had significantly more positive spans (rate ratio = 1.69) and fewer negative spans (rate ratio = 0.43), both p < .001 (Figure 9).
- 41.7% of MT chunks had at least 100 negative-highlighted words per 1K, versus 11.9% of HT chunks (Figure 8).
- Figure 10 (upper row) shows an example where both readers preferred HT.

Figure 8 caption, verbatim: "Figure 8: Share of close-reading chunks with dense poor-span evidence. For each threshold, the curve shows the percentage of HT and MT chunks with at least that many poor-highlighted words per 1K words. MT has substantially more high-density poor-span chunks."

Span annotations closely track explicit preferences.

- Net span score per version = good minus poor highlighted words.
- In cases with no ties, the higher-score version matched the stated preference in 691 of 755 judgments (91.5%). With span counts instead of word counts: 692 of 722 (95.8%). Both exact binomial p < .001.
- Verbatim: "Thus, span annotations directly capture the local textual evidence driving preferences."

Both MT and HT vary in quality, but MT has more variable weak spots.

- Per book, aggregated by chunk: poor-wording evidence was more variable for MT than HT in 13 of 15 books (p = .0074, paired sign test). Net quality (good minus poor per 1K words) more variable in 12 of 15 (p = .0352).
- Footnote 21, verbatim: "Chunks containing both good and poor spans were uncommon, but slightly more common for MT (6.7%) than HT (3.9%)."
- Excerpt level: MT ratings span the full 5-point scale. HT is never rated 1. Within-participant variability was directionally higher for MT, not significant (p = .285, Appendix E).
- Verbatim: "While readers sometimes find MT smooth or readable, they also encounter chunks (or entire excerpts) with markedly more visible issues."

Literary preference has shared and subjective components.

- Excerpt preference: paired readers chose the same version in 6 of 15 books (40.0%; AC1 = −0.120).
- Chunk choices: 63.7% (AC1 = 0.355). Excluding chunks marked as similar quality: 72.2% (AC1 = 0.546). Both readers marked one version significantly better: 79.5% (AC1 = 0.667).
- Verbatim: "Perhaps unsurprisingly, this suggests that disagreement is concentrated in global preferences and when the choice between the two translations is less apparent, while clearer local preferences are shared more often between the readers."
- Single-reading ratings: overall agreement moderate (AC2 = 0.426), stronger for HT than MT (0.616 versus 0.216). Clearest for HT craft ratings (acceptability 0.765, smoothness 0.725). Weakest for MT experiential ratings (immersion 0.057, continue_reading 0.089).
- Verbatim conclusion:

> Together, these results suggest readers agree on textual quality, especially locally, but diverge on how much an uneven text still functions for them as literature. Because each reader compared HT and MT directly (within-subjects), this disagreement is unlikely to reflect differences in scale use; we therefore view it as an integral part of literary judgment, combining a shared sensitivity to textual quality with reader-specific priorities (plank2022problem; guerberof2024or; marco-etal-2025-reader).

Figure 9 caption, verbatim: "Figure 9: Distribution of span-level highlights in the close-reading task."

Figure 10 caption, verbatim: "Figure 10: Examples of span-level preference evidence from the side-by-side chunks evaluation. Participants compared aligned HT and MT chunks, labeled spans as good or poor, and chose the preferred translation. Green highlights indicate good spans and red highlights indicate poor spans. The examples show cases where both readers chose the same translation, one favoring HT and one favoring MT, while marking different local evidence for their choices."

Figure 10 text content, from the PDF text (the highlight colors are not in the text):

- Upper row: "Both annotators prefer HT", "Symphony of Monsters" by Marc Levy; trans. Tina Kover (2026). HT begins "Head cocked to one side, Valentyn eyed the man." MT begins "His head tilted to one side, Valentyn studies the man." Reader comment 1, verbatim: "Inconsistent use of verb tenses in MT. HT uses colloquial language in contrast to the sometimes weird choices in MT ("able to say with certainty" vs "had been categorical"). Some sentences in MT sound as if they belong in an academic paper, not a piece of fiction ("Selective mutism ..."; "intuition, an exceptional ability ..."). Mismatches in the register used in MT: from overly formal to "the guy"." Reader comment 2, verbatim: "I prefer HT mainly because of the better, clearer use of tense. MT uses mostly the present tense but gets muddled in places. [...] HT uses more interesting words than MT, like "cocked" instead of "tilted" and "lagged behind" instead of "seriously behind." MT uses very informal language in some places, which seems a little out of place; words such as "seriously" and "guy.""
- Lower row: "Both annotators prefer MT", "Hooked: A Novel of Obsession" by Asako Yuzuki; trans. Polly Barton (2026). HT begins "[...] Today, with everybody rushing around so frenetically". MT begins "[...] Because everyone rushed through their days". Reader comment 1, verbatim: "MT is the passage that has more of a traditional cadence. HT is a wall of text with oddly-constructed sentences. The same information is conveyed, it's just that MT manages the delicacy that the last part of the passage deserves and HT feels like it drops the information like a rock." Reader comment 2, verbatim: "HT really mangled the final sentence such that I had to read it thrice to understand the relationship between the parts. MT's version of the final sentences felt like an internal observation that the narrator had made both to herself and to others many times before, whereas HT made it feel like a rushed revelation."

### 4.2 What readers' comments show (section 3.2)

Figure 11 caption, verbatim: "Figure 11: The most frequent labels in readers’ comments about the human translation (HT) and the machine translation (MT). Rows separate single-reading praise, single-reading criticism, excerpt-level preference reasons, and chunk-level preference reasons. Comments could receive multiple labels."

Coding comments.

- 180 comments in immersive reading and 772 in close reading.
- Footnote 22, verbatim: "For immersive reading, 120 comments concern the good and bad qualities of each translation, 30 explain a preference choice, and 30 explain why a translation was selected as MT. For close reading, all comments explain readers’ preferences."
- Inductive coding gave two schemas: translation quality (29 categories) and why a translation was judged AI-generated (10 categories).
- Footnote 23, verbatim: "The quality schema groups its 29 categories into four families: (A) language-level, (B) narrative-level, (C) reader experience, and (D) meta-translation."
- All comments first ran through GPT-5.4 and Claude Opus 4.7 to get candidate categories. Researchers then refined the schema by inductive coding.
- Two researchers manually coded all immersive-reading comments and resolved disagreements.
- Close reading: GPT-5.4 validated against a manually double-coded 10% sample (following `ziems-etal-2024-large`), then coded the rest automatically.
- Footnote 24, verbatim: "We measure agreement as the average Jaccard overlap between the human- and model-annotated label sets (multiple labels), which was 0.727 (high overlap). See §F for details."
- [aki-execute note] The HTML text reads "See §24 for labels and details." The reference target "§24" does not match a section number.

Both HT and MT are praised for readability, but HT receives more literary praise.

- Single-reading praise: smoothness most frequent for both, HT 19/30 versus MT 11/30. Comprehension HT 12/30 versus MT 9/30.
- HT got more praise for engagement/immersion (12/30 versus 5/30). Description/vividness among HT top labels (9/30).
- MT praised for dialogue naturalness (7/30).
- Verbatim: "Thus the comments do not suggest MT was unreadable; rather, HT was more often credited with qualities that made a translation feel engaging, vivid, and literary."

Table 3, reproduced. Caption, verbatim: "Table 3: Top labels behind reader preferences for HT or MT in excerpt- and chunk-level comparisons. Percentages are computed separately within each system and task from positive labels assigned to the chosen translation. Participant comments are shown in full with translation labels normalized to HT/MT, and colored highlights correspond to the code chips in the top-label list."

| Row | Top labels | Definitions | Representative participant comment |
|---|---|---|---|
| Top 3 reasons HT was chosen, excerpt comparison | 1. 78.9% Smoothness 2. 42.1% Comprehension 3. 31.6% Word choice: naturalness | Smoothness: "The prose flowed without friction, without consideration to understandability or clarity." Comprehension: "The reader could understand what was happening: local sentence-level understanding and global scene/plot-level comprehension." Word choice: naturalness: "Natural English words use and phrasings." | "From the start of the story, HT was a lot clearer to me and I think a lot of that has to do with punctuation and word choice. MT doesn’t necessarily use obscure or uncommon words, but the translation doesn’t feel quite right at times. For example, near the end of the first paragraph, MT states “his legs refuse obedience and his eyes no longer come together in seeing.” I understand what this is supposed to mean, but HT’s translation (when your legs won’t do what they’re told to and your eyes can’t make out the world) is so much easier and natural to read." —Wiesław Myśliwski, Needle’s Eye (Bill Johnson, Trans.) |
| Top 3 reasons MT was chosen, excerpt comparison | 1. 45.5% Enjoyment 2. 45.5% Smoothness 3. 45.5% Engagement | Smoothness: same definition as row 1. Engagement: "The reader was pulled into the story: losing reading awareness, attention focused on the scene." Enjoyment: "General reader satisfaction with clear statement: “I liked it”, “pleasant to read”, “a pleasure”, “I enjoyed both”." | "The language in MT is much more natural than HT and is clearer to understand. MT pulls the reader in with more vivid descriptions and is generally well-written. HT was boring to read and I felt my mind wandering." —Haruo Yuki, The Ark (Jim Rion, Trans.) |
| Top 3 reasons HT was chosen, chunk comparison | 1. 17.6% Smoothness 2. 16.7% Word choice: clarity 3. 15.3% Word choice: naturalness | Word choice: clarity: "Clear descriptions, actions and intents due to words and phrasings choices. The reader is not trying to guess what is happening." Others as row 1. | "Despite one of two better-worded sections in MT, like “but Cosima will have to be patient…” instead of the repetitive “Until Cosima grew up…”, HT is clearer and better worded overall. The part about Cosima refusing help is clearer in HT. The part about the cook being impressive in MT isn’t clear, as it doesn’t explain WHAT about her is impressive. HT makes it clear that it’s her physique. The Latin phrase “manu militari” seems out of place in MT. “Roughly shoved by a man in uniform” is clearer. The last sentence is also rendered more clearly and flows more smoothly in HT." —Marc Levy, Symphony Of Monsters (Tina Kover, Trans.) |
| Top 3 reasons MT was chosen, chunk comparison | 1. 14.0% Word choice: naturalness 2. 11.6% Word choice: register 3. 10.4% Smoothness | Word choice: register: "Word choices match the context in terms of formality, period, dialect/local speech, genre, speaker, situation, or emotional context." Others as row 1. | "MT sounds slightly more natural, but it also has phrases that stuck out to me as strange. Both have formatting issues. In MT, I would not have known that first line was a quote if it weren’t next to HT. The address on the stationery in MT flows much better in all caps than in HT. I did not know what “a flowery balcony” meant in HT. The final sentence in both is a little long and hard to follow, but MT translates the word as “violin” which makes more sense in context than HT’s “fiddle”." —Mikołaj Łoziński, My Name Is Stramer (Antonia Lloyd-Jones, Trans.) |

[aki-execute note] In the HTML, the comments carry inline code chips (for example "Comp.", "WC-natur.", "Smooth.", "Engag.", "Enjoy.", "WC-clar.", "WC-regis."). This table drops the chips. Table 3 credits "Bill Johnson" as translator of Needle's Eye. Table 5 credits "Bill Johnston".

Readers choose HT because its fluency keeps them inside the story.

- Immersive reading, readers who preferred HT: smoothness/reading effort (15/19), comprehension (8/19), natural wording (6/19), sentence structure (6/19).
- Quotes: HT was "far easier to follow in terms of flow and word choice," especially when MT made it "difficult to determine who was speaking."
- Close reading: HT chosen for smooth, clear, natural wording (92/522 smoothness/reading effort, 87/522 word-choice clarity, 80/522 natural wording).
- Where HT won, readers often also named MT issues (84%, 439/522), concentrated on word choice, sentence structure, comprehension, and smoothness.

Readers choose MT for engagement and effective local wording.

- Immersive reading, readers who preferred MT: 5/11 enjoyment, 5/11 smoothness/reading effort, 5/11 engagement/immersion, 4/11 word-choice richness. One reader praised MT's "more intricate and varied" wording and its "clearer picture of personalities and relationships".
- Close reading: 35/250 natural wording, 29/250 register or contextual fit, 26/250 smoothness, 23/250 word-choice richness. Example: readers preferred "bento containers" over "plastic containers".
- Verbatim: "MT can win when readers experience it as the more engaging excerpt overall, or when a local wording choice creates a better literary effect than the corresponding HT."

Negative comments highlight different issues in HT and MT.

- HT complaints were diffuse: naturalness, idiomaticity, and blandness each 5/30. Grammar, register, smoothness, and AI tells 4/30 each.
- MT complaints concentrated on reading friction: sentence structure (15/30), smoothness/reading effort (11/30), comprehension/ease of following (11/30). Grammar and word naturalness 8/30 each.
- Quotes about MT: "abrupt and choppy," "longwinded run-on sentences," forcing readers to "stop and reread parts."
- Six HT readings had nothing negative to report, against two MT readings.

Readers were surprised by the MT quality.

- Post-study: most readers expected MT to be worse or easier to detect (12/15). Some found MT surprisingly strong (8/15).
- Readers named remaining MT limits in literary and contextual qualities (8/15). Example, verbatim: "missing emotional import, poetic sense and failed to take into consideration that some things should be changed in translation based on the cultural and language differences in the output language".

### 4.3 Can readers detect machine translation? (section 3.3)

Figure 12 caption, verbatim: "Figure 12: Machine-translation (MT) identification accuracy and confidence in the single-reading questionnaire (n=60) and comparative questionnaire (n=30). Colors represent confidence levels, from not at all to extremely confident."

Readers cannot reliably tell MT from HT.

- Single reading: MT correctly labeled machine-translated in 16 of 30 cases. HT correctly labeled human-translated in 18 of 30 cases. Overall 34/60, p = .413 (no evidence above chance). No difference between MT and HT accuracy (p = .557).
- After both translations: actual MT chosen as more likely AI-translated in 17 of 30 pairs (p = .585).
- Correct guesses were more confident after both translations, not significant (p = .129).
- 8 of the 20 "very" or "extremely" confident guesses were wrong (40%), including 1 of 8 "extremely" confident guesses (12.5%).

Readers prefer the translation they perceive as human.

- In 28 of 30 comparisons, readers judged their preferred translation to be the human one. All 11 readers who preferred MT believed it was human, as did 17 of 19 who preferred HT.
- Two cases preferred HT while judging it MT. One reader "was misled by em-dashes (i.e., a strong belief that AI uses more em-dashes)". Another noticed French structure in the HT of a book originally in French, "which convinced them that this translation, despite being better, is MT."

What cues do readers use to identify MT?

- Word choice was the most cited cue, for correct (8/17) and incorrect (9/13) guesses, so it is "non-discriminative". Correct guesses called wording "awkward"; incorrect ones "generic" or "weird" ("people just don’t speak like that").
- The strongest separator was formatting (M4), "such as scene dividers or paragraph breaks, which made it hard to follow".
- Literal rendering (M1; 6/17 versus 3/13, for example MT "like a literal dictionary translation") and poor sentence flow or grammar (M3; 7/17 versus 4/13) had stronger discriminative power.
- "Folk theories" were the most deceptive, accuracy no better than chance (M10; 5/17 versus 5/13). Examples: em-dashes as "a classic sign of AI", or a belief that AI "prefers to avoid" swearing (`russell-etal-2025-people`).
- Least reliable: voice and emotional tone (M7), cited mostly by wrong guessers (2/17 versus 5/13), who called the HT "flat" and "mechanical".

Figure 13 caption, verbatim: "Figure 13: The cues readers mentioned when explaining which translation they believed was machine-translated (MT). Correct judgments identify the actual MT version; incorrect judgments identify the human translation (HT) as MT. Comments could receive multiple cue labels."

### 4.4 Can automatic metrics capture readers' preferences? (section 3.4)

- Metrics: MetricX-QE (`juraska-etal-2024-metricx`), COMETKiwi (`rei-etal-2022-cometkiwi`), and the LLM-as-a-judge framework LiTransProQA (`zhang-etal-2025-litransproqa`) with Gemini 3.1 Pro as judge.
- Setup: the par3 aligner (`thai-etal-2022-exploring`) gives paragraph-level source–HT–MT alignments. Paragraph scores map to chunks. Chunk score = average of paragraph scores in the chunk.
- COMETKiwi and MetricX-QE also scored by paragraph, then averaged per chunk.
- Footnote 25, verbatim: "We compute MetricX-QE over both chunk and paragraph as it is likely better adapted to shorter lengths. For LiTransProQA we report only chunk-level evaluation due to the cost and since the model can handle 300-word texts."
- All metric variants prefer MT over HT:
  - LiTransProQA ↑: MT 0.996, HT 0.920.
  - MetricX-QE ↓: MT 8.347, HT 8.657.
  - COMETKiwi paragraph mean ↑: MT 0.760, HT 0.722.
  - MetricX-QE paragraph mean ↓: MT 5.184, HT 5.671.
- Kendall τ (`kendall1938rank`) with human chunk judgments: LiTransProQA τ = −0.124, MetricX-QE τ = −0.075, COMETKiwi paragraph mean τ = −0.318, MetricX-QE paragraph mean τ = −0.216. The correlation is "identical whether computed over all judgments or only those where readers agree, since clear human agreement usually favors HT while metrics favor MT."
- "This result is consistent with results reported in thai-etal-2022-exploring; zhang-etal-2025-litransproqa; zhang-etal-2025-good."

Table 4, reproduced. Caption, verbatim: "Table 4: Automatic evaluation of the aligned 300-word human-evaluation chunks: professional HT vs. agentic (P3) MT. Positive oriented deltas favor HT; negative deltas favor agentic/P3 MT. Paragraph-mean rows use mapped par3 paragraph scores."

| Metric | Chunks | HT mean | MT mean | Oriented HT–MT delta | 95% CI |
|---|---|---|---|---|---|
| LiTransProQA | 386 | 0.920 | 0.996 | -0.076 | ± 0.017 |
| MetricX-QE | 385 | 8.657 | 8.347 | -0.309 | ± 0.128 |
| COMETKiwi (paragraph mean) | 377 | 0.722 | 0.760 | -0.038 | ± 0.004 |
| MetricX-QE (paragraph mean) | 385 | 5.671 | 5.184 | -0.486 | ± 0.103 |

### 4.5 Case study: translations into other target languages (section 3.5)

Setup.

- Two books: My Grandfather, the Master Detective (Japanese source) into Spanish, French, and Polish. The Witcher: Crossroads of Ravens (Polish source) into Japanese. Chosen "because both have recently been professionally translated and published in the respective target languages".
- Five native-speaker readers, following the main-study protocol.
- Footnote 26, verbatim: "For Spanish, French, and Polish the readers were researchers and volunteers who are native speakers of the given language; we used two readers for the Polish book. For Japanese we followed the English procedure and hired one reader via Upwork, paid $110 USD."

HT is strongly preferred for translations into languages other than English.

- Chunk level: every reader preferred HT overall. HT favored in 103 of 111 chunk judgments (92.8%).
- Excerpt level: only the French reader chose MT, but still rated HT highly in single reading, a one-point difference (5 versus 4 for acceptability, smoothness, and so on). The other four readers preferred HT. The French reader changed toward HT in close reading (Figures 17, 30, 14).
- Gap largest for Japanese and Polish targets: HT rated 1.75–2 points higher than MT on every single-reading scale. For Spanish and French targets the gap was small or absent. French target had the lowest HT chunk share (17/22).

Figure 14 caption, verbatim: "Figure 14: Close-reading preferences in the multilingual case study. Stacked bars show chunk-level preferred translation choices for HT and MT across the four evaluated translation directions, with color intensity indicating preference strength."

Readers identified MT through concrete translationese.

- 4 of 5 readers identified MT correctly, with strong average confidence (mean 4.4/5).
- A Polish reader was 100% sure that the MT "cannot possibly be human-translated (…) [at] around 10% of reading."
- Flags: sentences "hanging there as if directly translated from the source, with no predicate," and source calques, including "the third person for Kaede when she speaks about herself."
- Footnote 27, verbatim: "It is common in Japanese to refer to yourself in the third person but in other languages it often seems either childish or weird."
- Vocabulary: MT failed to use a standard term and gave a description "like a student who has not mastered the vocabulary fully yet". Polish: HT nekrolog ("obituary"), MT prasowe artykuły pośmiertne ("posthumous press articles"). Spanish: MT librerías de viejo, HT librerías de segunda mano ("second-hand bookshops"), judged "not idiomatic in any variety of Spanish."
- Verbatim: "These preliminary results suggest MT’s strong English-target performance may not extend to other target languages (see §G)."

## 5. Related work (paper section 4)

Automatic evaluation.

- Automatic evaluation is "practical but surface-level" (`papineni-etal-2002-bleu`; `popovic-2015-chrf`) and captures "only partial signals in literary MT" (`griebel2026fluency`).
- Trained neural metrics (`rei2020comet`; `rei-etal-2022-cometkiwi`; `guerreiro-etal-2024-xcomet`; `juraska-etal-2023-metricx`; `juraska-etal-2024-metricx`) "were shown to work poorly on literary machine translation" (`thai-etal-2022-exploring`; `zhang-etal-2025-litransproqa`) and "offer weak signal for what humans perceive as literary quality" (`gerrits2026creativity`).
- LLM-as-a-judge approaches based on question answering or creative tasks "were developed but tested only on short passages" (`zhang-etal-2025-litransproqa`; `shafayat20242`; `zhang2026beyond`). "it is unclear how they handle longer dependencies."
- Document-level and long-document MT work often combines metrics with LLM-as-a-judge (`laubli2018has`; `laubli2020set`; `wang2026loong`), "but such evaluations still do not directly measure reader experience."

Human evaluation.

- Human evaluation often relies on error annotations (`burchardt-2013-multidimensional`; `freitag-etal-2021-experts`; `kocmi-etal-2024-error`) or crowdsourced ratings (`graham-etal-2013-continuous`; `freitag-etal-2021-experts`), "which do not capture reading experience" (`zhang-etal-2025-good`).
- Most literary MT evaluation uses short passages or local judgments (`wu-etal-2025-perhaps`; `karpinska-iyyer-2023-large`; `wang-etal-2023-findings`; `kocmi-etal-2025-findings`), "missing the purpose of literary translation as sustained reading."
- Prior literary MT and reception work cited: `guerberof2020impact`; `guerberof2022creativity`; `guerberof2024or`; `gerrits2025mt`; `moorkens2018translators`; `castaldo-etal-2025-extending`; `matusov2019challenges`; `taivalkoski2019free`; `webster2020gutenberg`; `kosters2023riddle`.
- Related framing: narrative transportation, AI-perception, literary translator voice, and ethics in machine-assisted literary translation (`green2000role`; `porter2024ai`; `zhu2025human`; `kenny2020machine`; `taivalkoski2019ethical`).
- Verbatim: "In contrast, we target readers’ experience of long literary MT versus HT in immersive reading, and what issues they notice in close reading."

## 6. Discussion and conclusion (paper section 5)

Verbatim:

> We evaluated literary MT in immersive and close reading by comparing professional human translations (HT) with a strong agentic LLM pipeline (MT) across 15 recent French, Polish, and Japanese novels translated into English. Our analysis reveals that readers found MT reasonable and were not able to detect it reliably, but HT was favored descriptively at the excerpt level and significantly in the close reading. Preferences varied mostly by book, not source language, and readers often preferred the version they believed to be human, while automatic metrics favored MT. We release LAIT and our evaluation pipeline to support future research on literary MT.

## 7. Limitations, ethics statement, AI use, acknowledgements

Limitations, verbatim:

> Excerpt scope. Due to copyrights restrictions and annotation costs we evaluate translations of novel openings, not full books. Literary quality, pacing, and narrative voice may evolve over longer reading, and book-spanning context and background may be lost by LLM translations of full books. These factors may impact judgments over longer translations, however we note that 8K words is already at the length of short stories.

> Corpus selection. We selected recently published (2025–2026), critically acclaimed fiction with professional English translations available to mitigate training-data contamination. However, this limits the diversity of our books and does not represent the whole set of literature out there.

> Languages and directions. The main evaluation is French, Polish, and Japanese into English only (n=5 books per source language). Our multilingual case study covers two additional books and four target languages with a much smaller reader sample and mixed recruitment (Upwork vs. researchers/volunteers); those results are exploratory and should not be generalized. A much larger-scale study is required to determine whether the effects observed in the current work apply to other source-target language pairs.

> Sample size and agreement. Each book is read by only two readers recruited via Upwork with a total of 15 readers. This scale was necessary for immersive, long-form evaluation to be financially feasible, but could limit statical power. To partially mitigate this, we employ a within-subject design, where each reader judges both MT and HT for the same excerpts, reducing individual variability and requiring fewer annotators than a between-subjects design for statistical analysis (Allen2017-withinsubject).

Ethics statement, verbatim:

> Human participants. This study was approved by the Simon Fraser University Research Ethics Board (#30003790). Participants gave informed consent before the evaluation (§D), could withdraw with prorated compensation, and were paid fairly for the amount and difficulty of work ($110 USD per book, ∼$27.50/hour for ∼4 hours of work), plus completion bonuses. Participant identities are anonymized by participant codes.

> Copyright and data sharing. Source books were purchased for research use. Following fair-dealing / fair-use principles for scholarly research, we retain no more than 10% of any individual work. The dataset will be released for research purposes only.

> Corpus and societal impact. Our corpus over-represents internationally published, commercially successful fiction. We study AI-assisted literary translation to inform evaluation practice and publishing transparency: not to advocate replacing human translators or deceiving readers; in fact, we demonstrate that readers often prefer human-authored translations. As LLM-translated fiction enters trade and self-publishing channels, we hope that better reader-centered evaluation and full disclosure can support fair labor practices and help readers make informed choices.

> Risks of literary machine translation. Literary MT can look acceptable while still changing the reading experience. As our reader comments show, problems with phrasing, context, and voice can affect the reader’s impression of a book and its author, especially when AI-translated fiction reaches readers with little human review. Like other LLM output, MT may also carry biased or harmful wording into the translation.

AI use disclosure, verbatim:

> We utilize coding agents to produce plots and edit table layout. We further use language models as writing assistants but no part of this paper was generated from scratch.

Acknowledgements.

- Thanks to the Upwork participants and to the volunteer and researcher readers of the multilingual case study.
- Funding, verbatim: "Simon Fraser University’s Rajan Recruitment Award for Women in Computing Science [M Karpinska], Natural Sciences and Engineering Research Council of Canada (NSERC) [MJ Meurs, Discovery Grant RGPIN-2025-07163], [M Taboada, Discovery Grant RGPIN-2022-04481], [M Karpinska, Discovery Grant RGPIN 2026-04987], and the Fonds de recherche du Québec (FRQ) Chaire de recherche du Québec sur la découvrabilité des contenus scientifiques en français [MJ Meurs, Chaire de recherche du Québec sur la découvrabilité des contenus scientifiques en français, DOI 10.69777/358425]."

## 8. Appendices A to I

### A. Dataset

- "A total of 35 long excerpts have been used for this study. 15 for the evaluation, 16 for the development and 4 for the case-study."
- Table 6 gives corpus size for excerpts and chunks and statistics for participants' comments in the two reading phases.

Table 5, reproduced. Caption, verbatim: "Table 5: Books used in the human evaluation, multilingual target-language case study, and MT-pipeline development experiments. The table lists the source-target language pair, original title and author, translated publication title and translator, and publication dates for the original and translated editions."

| Group | Pair | Original Title | Author | Translation Title | Translator | Original Date | Translation Date |
|---|---|---|---|---|---|---|---|
| Main human evaluation | FR→EN | Le Roman de Marceau Miller | Marceau Miller | The Story of Marceau Miller | Howard Curtis | Jan. 2025 | Mar. 2026 |
| Main human evaluation | FR→EN | La Symphonie des monstres | Marc Levy | Symphony of Monsters | Tina Kover | Oct. 2023 | Jan. 2026 |
| Main human evaluation | FR→EN | Veiller sur elle | Jean-Baptiste Andrea | Watching Over Her | Frank Wynne | Aug. 2023 | Aug. 2025 |
| Main human evaluation | FR→EN | Les Yeux de Mona | Thomas Schlesser | Mona’s Eyes | Hildegarde Serle | Jan. 2024 | Sept. 2025 |
| Main human evaluation | FR→EN | Célèbre | Maud Ventura | Make Me Famous | Gretchen Schmid | Aug. 2024 | May 2025 |
| Main human evaluation | JA→EN | Hakobune | Haruo Yuki | The Ark | Jim Rion | Sept. 2022 | Feb. 2026 |
| Main human evaluation | JA→EN | Meitantei no Mama de Ite | Masateru Konishi | My Grandfather, the Master Detective | Louise Heal Kawai | Jan. 2023 | Mar. 2026 |
| Main human evaluation | JA→EN | Kokun, Vol. 1: Nishi kara Kita Shojo | Nahoko Uehashi | Kokun: The Girl from the West | Cathy Hirano | Mar. 2022 | Feb. 2026 |
| Main human evaluation | JA→EN | Nairu Pachi no Joshikai | Asako Yuzuki | Hooked: A Novel of Obsession | Polly Barton | Mar. 2015 | Mar. 2026 |
| Main human evaluation | JA→EN | Kiiroi Ie | Mieko Kawakami | Sisters in Yellow | Laurel Taylor and Hitomi Yoshio | Feb. 2023 | Mar. 2026 |
| Main human evaluation | PL→EN | Rozdroże kruków | Andrzej Sapkowski | The Witcher: Crossroads of Ravens | David French | Oct. 2024 | Sept. 2025 |
| Main human evaluation | PL→EN | Stacja | Jakub Szamałek | Inner Space | Kasia Beresford | May 2023 | July 2025 |
| Main human evaluation | PL→EN | Stramer | Mikołaj Łoziński | My Name is Stramer | Antonia Lloyd-Jones | Oct. 2019 | Aug. 2025 |
| Main human evaluation | PL→EN | Ucho Igielne | Wiesław Myśliwski | Needle’s Eye | Bill Johnston | Oct. 2018 | Oct. 2025 |
| Main human evaluation | PL→EN | Empuzjon. Horror przyrodoleczniczy | Olga Tokarczuk | The Empusium: A Health Resort Horror Story | Antonia Lloyd-Jones | June 2022 | Sept. 2024 |
| Multilingual case study | JA→FR | Meitantei no Mama de Ite | Masateru Konishi | Les Histoires de Kaede | Mathilde Tamae-Bouhon | Jan. 2023 | May 2024 |
| Multilingual case study | JA→PL | Meitantei no Mama de Ite | Masateru Konishi | Mój dziadek – genialny detektyw | Dariusz Latoś | Jan. 2023 | Sept. 2025 |
| Multilingual case study | JA→ES | Meitantei no Mama de Ite | Masateru Konishi | La pequeña habitación de los misterios | Juan Francisco González Sánchez | Jan. 2023 | Sept. 2025 |
| Multilingual case study | PL→JA | Rozdroże kruków | Andrzej Sapkowski | Witcher: Karasu no Jujiro | Yasuko Kawano and Aya Sugiura | Oct. 2024 | Sept. 2025 |
| Development | FR→EN | Les guerres précieuses | Perrine Tripier | Our Precious Wars | Alison Anderson | Jan. 2023 | Nov. 2025 |
| Development | FR→EN | Naufrage | Vincent Delecroix | Small Boat | Helen Stevenson | Aug. 2023 | Mar. 2025 |
| Development | FR→EN | Déserter | Mathias Énard | The Deserters | Charlotte Mandell | Aug. 2023 | May 2025 |
| Development | FR→EN | Ilaria ou la conquête de la désobéissance | Gabriella Zalapi | Ilaria, or The Conquest of Disobedience | Adriana Hunter | Aug. 2024 | Nov. 2025 |
| Development | FR→EN | Le vieil incendie | Elisa Shua Dusapin | The Old Fire | Aneesa Abbas Higgins | Aug. 2023 | Jan. 2026 |
| Development | JA→EN | Jakuson Hitori | Jose Ando | Jackson Alone | Kalau Almony | Nov. 2022 | Jan. 2026 |
| Development | JA→EN | Machi to Sono Futashika na Kabe | Haruki Murakami | The City and Its Uncertain Walls | Philip Gabriel | Apr. 2023 | Nov. 2024 |
| Development | JA→EN | Baba Yaga no Yoru | Akira Otani | The Night of Baba Yaga | Sam Bett | Oct. 2020 | July 2024 |
| Development | JA→EN | Kai ni Tsuzuku Bashonite | Mai Ishizawa | The Place of Shells | Polly Barton | July 2021 | Mar. 2025 |
| Development | JA→EN | Kyūkanbi no kanojotachi | Emi Yagi | When the Museum Is Closed | Yuki Tejima | Mar. 2023 | Jan. 2026 |
| Development | PL→EN | Powrót z gwiazd | Stanisław Lem | Return from the Stars | Barbara Marszal | Jan. 1961 | June 1989 |
| Development | PL→EN | Księgi Jakubowe | Olga Tokarczuk | The Books of Jacob | Jennifer Croft | Oct. 2014 | Nov. 2021 |
| Development | PL→EN | Lód | Jacek Dukaj | Ice | Ursula Phillips | Jan. 2007 | Nov. 2025 |
| Development | PL→EN | Mgła | Kaja Malanowska | Fog | Bill Johnston | Jan. 2015 | Mar. 2021 |
| Development | PL→EN | Łakome | Małgorzata Lebda | Voracious | Antonia Lloyd-Jones | Aug. 2023 | Jan. 2025 |
| Development | PL→EN | Poufne | Mikołaj Grynberg | Confidential | Sean Gasper Bye | June 2020 | Jan. 2025 |

[aki-execute note] Table 5 lists 5 French, 5 Japanese, and 6 Polish development books (16). Several development translations date from before 2025 (for example Return from the Stars, June 1989). Section 2.1 states the 2025–2026 window for the evaluation books.

Table 6, reproduced. Caption, verbatim: "Table 6: Summary statistics for evaluation excerpts, chunks, and participant free-text comments, split into a Words sub-table (whitespace-delimited word counts; we do not report SRC word counts because Japanese cannot be split on whitespaces) and a Tokens sub-table (tiktoken o200k_base token counts). Excerpts and chunks are reported separately for human-translated (HT) and machine-translated (MT) versions in the Words sub-table; the Tokens sub-table also includes source-language (SRC) versions. The #/Ex (chunks per excerpt) column does not depend on the metric and is identical across both sub-tables (and across HT / MT / SRC, since chunks are aligned across versions). Participant Comments include: Single Q5/Q6 are free-text responses from the single-reading questionnaires; Compar. Q4/Q7 are free-text responses from the comparison questionnaire; Chunk Justif. are per-chunk preference justifications."

Words sub-table, excerpts (n=15) and chunks (n=386):

| Statistic | Version | Excerpts | Chunks |
|---|---|---|---|
| Mean | HT | 7,623.3 | 296.2 |
| Mean | MT | 7,676.5 | 298.3 |
| Mean | SRC | 4,784.1 | 186.4 |
| Median | HT | 7,877 | 307 |
| Median | MT | 7,623 | 308 |
| Median | SRC | 6,273 | 240 |
| St. Dev. | HT | 449.3 | 49.2 |
| St. Dev. | MT | 529.2 | 57.4 |
| St. Dev. | SRC | 3,334.1 | 128.4 |
| Max | HT | 7,995 | 486 |
| Max | MT | 8,595 | 530 |
| Max | SRC | 8,244 | 417 |
| Min | HT | 6,747 | 100 |
| Min | MT | 6,928 | 102 |
| Min | SRC | 141 | 1 |
| Total | HT | 114,350 | 114,350 |
| Total | MT | 115,147 | 115,147 |
| Total | SRC | 71,762 | 71,762 |

Words sub-table, chunks per excerpt and participant comments:

| Statistic | #/Ex | Single Q5 (n=60) | Single Q6 (n=60) | Compar. Q4 (n=30) | Compar. Q7 (n=30) | Chunk Justif. (n=772) |
|---|---|---|---|---|---|---|
| Mean | 25.7 | 35.6 | 49.2 | 76.9 | 69.2 | 47.9 |
| Median | 26 | 29 | 41.5 | 72.5 | 57 | 38 |
| St. Dev. | 2.2 | 23.3 | 32.8 | 35.9 | 65.1 | 29.6 |
| Max | 29 | 93 | 176 | 184 | 380 | 215 |
| Min | 22 | 9 | 7 | 24 | 21 | 16 |
| Total | 386 | 2,136 | 2,955 | 2,306 | 2,077 | 36,964 |

Tokens sub-table, excerpts and chunks:

| Statistic | Version | Excerpts | Chunks |
|---|---|---|---|
| Mean | HT | 9,680.3 | 376.2 |
| Mean | MT | 9,582.1 | 372.4 |
| Mean | SRC | 13,026.4 | 507.5 |
| Median | HT | 9,832 | 390 |
| Median | MT | 9,648 | 384 |
| Median | SRC | 13,023 | 514 |
| St. Dev. | HT | 535.0 | 65.7 |
| St. Dev. | MT | 625.7 | 73.5 |
| St. Dev. | SRC | 1,527.0 | 121.7 |
| Max | HT | 10,261 | 611 |
| Max | MT | 10,500 | 644 |
| Max | SRC | 15,967 | 1,139 |
| Min | HT | 8,600 | 118 |
| Min | MT | 8,474 | 121 |
| Min | SRC | 11,155 | 141 |
| Total | HT | 145,204 | 145,204 |
| Total | MT | 143,732 | 143,732 |
| Total | SRC | 195,396 | 195,396 |

Tokens sub-table, chunks per excerpt and participant comments:

| Statistic | #/Ex | Single Q5 | Single Q6 | Compar. Q4 | Compar. Q7 | Chunk Justif. |
|---|---|---|---|---|---|---|
| Mean | 25.7 | 41.3 | 60.5 | 95.2 | 86.2 | 61.3 |
| Median | 26 | 34 | 52 | 86.5 | 68.5 | 48 |
| St. Dev. | 2.2 | 27.8 | 43.9 | 46.3 | 82.5 | 38.6 |
| Max | 29 | 113 | 254 | 231 | 482 | 272 |
| Min | 22 | 11 | 8 | 33 | 23 | 18 |
| Total | 386 | 2,480 | 3,633 | 2,855 | 2,586 | 47,326 |

[aki-execute note] The caption says SRC word counts are not reported, but the Words sub-table holds SRC rows in both the HTML and the PDF text. The comment columns appear once per statistic row in the PDF text, so this file shows them in separate tables.

### B. Machine translation

Machine translation pipelines. Three pipelines in five setups, verbatim:

> 1. P1 Full-excerpt translation with post-editing by (a) GPT-5.4 or (b) Gemini 3.1 Pro.
> 2. P2 Chunk-level translation with excerpt-level post-editing by (a) GPT-5.4 or (b) Gemini 3.1 Pro.
> 3. P3 An agentic pipeline with Claude Code (Opus 4.6) and Codex (GPT-5.4), inspired by AutoFiction pham_chang_desai_iyyer_2026, an agent-based novel-generation pipeline.

- GPT-5.4 and Gemini 3.1 Pro chosen because "these model families were strong performers in the WMT 2025 General Translation Shared Task". Coding agents explored "because they are optimized for long-context tasks and for handling multiple reference documents."

Prompts. The prompts are long, so the appendix does not include them. They are in the repository (`github.com/Yves575/lait`).

Details on prompting pipelines, verbatim:

> P1 and P2 used the same two-stage prompting procedure. In the first stage, the model was prompted as an expert literary translator and asked to translate the source excerpt into English while preserving meaning, tone, voice, register, rhythm, stylistic effect, ambiguity, characterization, and differences between narrator and character voices. The prompt also instructed the model to avoid unjustified omissions or additions and to output only the translation. In the second stage, the model received the original source excerpt together with its own first-pass English translation and was tasked with revision.

[P1] Full-excerpt translation. Each complete source excerpt was translated in a single first-pass call, with "all available discourse context, recurring names, register shifts, and dialogue patterns". The complete English draft and the complete source went to post-editing, also at excerpt level. Both P1 stages had access to the full source span.

[P2] Chunk-level translation with excerpt-level post-editing, verbatim:

> For P2, the first-pass translation was performed over smaller source chunks. We counted tokens with the tiktoken o200k_base encoding and targeted a maximum of 1K source tokens per chunk. Chunking preserved paragraph boundaries: we split the source excerpt on blank-line paragraph breaks, added whole paragraphs to the current chunk until adding the next paragraph would exceed the token limit, and then started a new chunk. If a single paragraph exceeded the limit, it was kept intact as an oversized chunk rather than split mid-paragraph. Each chunk was translated independently with the same literary-translation prompt used in P1. The chunk translations were then concatenated in source order with paragraph breaks preserved, producing a complete first-pass English draft. Finally, as in P1, the post-editing stage received the complete source excerpt and the complete concatenated English draft, allowing the model to revise across chunk boundaries for consistency of voice, terminology, register, narrative perspective, and local fluency.

[P3] Agentic pipeline. Core parts: (1) data preparation including style analysis, (2) chunk-level translation, (3) excerpt-level review. Steps (2) and (3) have metrics and guard gates that send translations for edits if issues are found.

Table 7, reproduced. Caption, verbatim: "Table 7: Model configuration for the agentic machine-translation pipeline. The table shows which agent backend and checkpoint were used for each translation, review, and revision step, along with the number of runs using that configuration."

| Pipeline step | Agent backend | Checkpoint | Runs |
|---|---|---|---|
| Style Analysis | Claude | claude-opus-4-6 | 35 |
| Initial Chunk Translation | GPT | gpt-5.4 | 31 |
| Translation Quality Review | GPT | gpt-5.4 | 35 |
| Literary Quality Review | Claude | claude-opus-4-6 | 35 |
| Targeted Chunk Revision | GPT | gpt-5.4 | 31 |
| Targeted Chunk Revision (after 3 failed revisions) | Claude | claude-opus-4-6 | 4 |
| Whole Excerpt Review | GPT | gpt-5.4 | 35 |
| Cross-Chunk Continuity Check | GPT | gpt-5.4 | 35 |
| Global Revision | Claude | claude-opus-4-6 | 35 |

[P3] Agent review rubrics and acceptance gates.

- Chunk-level gate, first review, verbatim: "the modified LiTransProQA review asked 25 yes/no/maybe questions about translation quality, such as faithfulness, cultural transfer, voice and more. A chunk passed this quality-estimation component only if it received no No judgments and at most five Maybe judgments."
- Second review, verbatim: "a literary review checked whether the chunk preserved the source’s accuracy, voice, dialogue, and prose, and recorded findings with Low, Medium, High, or Critical severity. A chunk passed the literary component only if every lens passed and there were no Medium+ findings."
- Footnote 28, verbatim: "Following pham_chang_desai_iyyer_2026 we denote Medium+ as any issue of severity medium or higher that would usually require revision. This excludes small issues marked as Low."
- The local gate failed any chunk that failed either component and sent only those chunks to the next revision cycle.
- Excerpt-level final gate, verbatim: "combined a full-draft book review with a cross-chunk audit. The book review targeted global translation defects such as repeated translationese, flattening, loss of ambiguity, etc., visible only when reading the excerpt as a whole. The cross-chunk audit targeted boundary and consistency problems, such as inconsistent terms, narrator or register drift, seam issues, etc. Both reviews used the same four-level severity scale, and the final gate passed only when neither review found any Medium+ issue; otherwise, affected chunks were sent to final revision."

Pipeline selection.

- 8K-word excerpts from 16 development books under all five setups (Table 8).
- Footnote 29, verbatim: "The book length limit should not exceed 10% of the original word count, with a maximum limit of 8k-words, and it can be lower."
- Footnote 30, verbatim: "Because agents make many model calls, running them via API is prohibitively expensive; instead we used subscription services, which cap our translation count."
- Blind five-way preference task: six raters ("the authors and volunteer colleagues"), each 2–3 books, together ranked outputs across all 16 development excerpts.
- "The raters were asked to read at least 2K words to assure everyone reads past the chunk boundary. The raters can choose to read more." Each rater chose the best of five and shared observations on the others.
- "Overall, most outputs were comparable, except GPT-5.4 (P1) which noticeably underperformed". Footnote 31 repeats the vote counts: P3 (5/16), P1 Gemini 3.1 Pro (4/16), P2 Gemini 3.1 Pro (3/16), P2 GPT-5.4 (3/16), P1 GPT-5.4 (1/16).
- P3 adopted, "preferred by a small margin owing to its more idiomatic vocabulary".

Table 8, reproduced. Caption, verbatim: "Table 8: Per-book word and token count statistics for each pipeline/model system, split into a Words sub-table (whitespace-delimited word counts) and a Tokens sub-table (tiktoken o200k_base token counts). Total is the corpus sum across all 16 books; Mean, Median, St. Dev., Min, and Max summarize the per-book distribution. Within each sub-table, rows are grouped by pipeline (Pipeline 1, Pipeline 2, Pipeline 3)."

| Unit | Pipeline | Model | Total | Mean | Median | St. Dev. | Min | Max |
|---|---|---|---|---|---|---|---|---|
| Words | Pipeline 1 | Gemini | 79,232 | 4,952.0 | 4,019 | 2,397.4 | 2,508 | 9,272 |
| Words | Pipeline 1 | GPT-5.4 | 78,920 | 4,932.5 | 3,970 | 2,383.9 | 2,498 | 9,218 |
| Words | Pipeline 2 | Gemini | 80,614 | 5,038.4 | 4,142 | 2,442.1 | 2,534 | 9,379 |
| Words | Pipeline 2 | GPT-5.4 | 79,872 | 4,992.0 | 4,058 | 2,448.5 | 2,518 | 9,378 |
| Words | Pipeline 3 | Agents | 79,851 | 4,990.7 | 4,057 | 2,467.6 | 2,476 | 9,012 |
| Tokens | Pipeline 1 | Gemini | 100,622 | 6,288.9 | 5,042 | 3,109.0 | 3,150 | 11,974 |
| Tokens | Pipeline 1 | GPT-5.4 | 99,219 | 6,201.2 | 4,885 | 3,034.6 | 3,223 | 11,830 |
| Tokens | Pipeline 2 | Gemini | 102,331 | 6,395.7 | 5,185 | 3,180.4 | 3,204 | 12,171 |
| Tokens | Pipeline 2 | GPT-5.4 | 100,270 | 6,266.9 | 5,012 | 3,102.4 | 3,206 | 11,938 |
| Tokens | Pipeline 3 | Agents | 99,640 | 6,227.5 | 5,012 | 3,124.3 | 3,145 | 11,670 |

### C. Agentic pipeline runs

- "All artifacts from agentic runs are shared at github.com/Yves575/lait."
- Local-cycle limits: all 16 development-book runs used up to three local cycles. The third cycle cleared 8 of 130 chunks still failing after cycle 2 (6.2%). 12 of the 17 three-cycle runs had an unchanged failing-chunk set. Later evaluation and case-study runs were capped at two local cycles.
- Exception, verbatim: "Make Me Famous, which was generated during the earlier development batch and was later used in the evaluation set after replacing an evaluation book with sensitive content."
- Runs summary, verbatim: "We note that even when the final translation failed to pass within the enforced limits we observe that increasing the limits did not show justifiable improvements, while the “failed” translation was often acceptable."

Table 9, reproduced. Caption, verbatim: "Table 9: Corpus and run overview for the completed agentic pipeline runs."

| Group | Value | Runs |
|---|---|---|
| Run group | Evaluation books | 15 |
| Run group | Development books | 16 |
| Run group | Case study evaluation books | 4 |
| Source language | French | 10 |
| Source language | Japanese | 13 |
| Source language | Polish | 12 |
| Target language | English | 31 |
| Target language | French | 1 |
| Target language | Japanese | 1 |
| Target language | Polish | 1 |
| Target language | Spanish | 1 |
| Final Acceptance Gate | FAIL | 22 |
| Final Acceptance Gate | PASS | 13 |
| Max chunk cycles | 2 | 18 |
| Max chunk cycles | 3 | 17 |

Table 10, reproduced. Caption, verbatim: "Table 10: Artifact counts generated by the selected agentic pipeline runs."

| Artifact / log unit | Count | Scope |
|---|---|---|
| Completed pipeline runs | 35 | Evaluation, development, and multilingual target-language runs used in this paper. |
| Source-language chunks processed | 441 | All selected chunks entering the agentic pipeline. |
| Chunk-cycle translation/revision artifacts | 1,059 | Source chunks × completed chunk cycles. |
| Runs with job-metric logs | 31 | Excludes four development-book runs with unavailable metrics. |
| Logged agent jobs | 2,930 | All recorded style, translation, review, revision, and continuity jobs. |
| Failed agent jobs | 19 | Logged failed jobs across runs with metrics. |
| Final-gate flagged chunks | 74 | Chunks flagged by the final acceptance gate. |

Artifact footprint, verbatim: "The selected agentic translation pipeline outputs comprise 35 completed runs: 15 evaluation-book runs, 16 development-book runs, and 4 multilingual target-language runs. Across these runs, the pipeline processed 441 source-language chunks and produced 1,059 chunk-cycle translation or revision artifacts, counting each completed translation or revision cycle for a chunk once. Job-level logs were available for 31 runs and record 2,930 agent jobs, including 19 failed jobs; four development-book runs were completed but untracked in the job-metric logs. At the automatic final acceptance gate, 13 runs passed and 22 retained flagged issues, with 74 chunks flagged in total (Table 10)."

[aki-execute note] Table 9 lists 10 French source runs. Table 5 lists 5 French evaluation books and 5 French development books, which gives 10.

### D. Human evaluation (reader study protocol and reading interface)

The appendix covers participant recruitment, participant profiles, guidelines, and interface screenshots.

Participant recruitment.

- Recruited on Upwork. Search limited to "avid readers, who read at least one book in English per month and have native-level command of the language".
- Entry questionnaire: Table 15. Demographics: Table 11. AI use frequency: Table 12.

Table 11, reproduced. Caption, verbatim: "Table 11: Participant demographics and reading profile. All participants reported that they primarily read in English and were very comfortable reading long literary texts in English. Nationality entries are shortened for display."

| ID | Age | Gender | Education | Nationality | Native language | Additional languages | English literary fiction | Translated fiction in English | Books per year |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 25–34 | Woman | Undergraduate | American | English | None | Weekly or more | Almost never | 100 |
| 2 | 25–34 | Woman | Undergraduate | American | English | None | Weekly or more | A few times a year | 40 |
| 3 | 18–24 | Man | Undergraduate | South African | English | None | A few times a month | Not sure | 12 |
| 4 | 45+ | Woman | Undergraduate | South African | English | None | About once a month | A few times a year | 12 |
| 5 | 45+ | Woman | High school | American | English | None | Weekly or more | Almost never | 12 |
| 6 | 45+ | Woman | Master’s | South African | English | None | Weekly or more | A few times a year | 50 |
| 7 | 35–44 | Woman | Doctoral | Canadian | English | French | About once a month | Almost never | 24 |
| 8 | 45+ | Woman | Undergraduate | American | English | None | Weekly or more | A few times a month | 75 |
| 9 | 25–34 | Woman | Undergraduate | South African | English | None | Weekly or more | A few times a year | 120 |
| 10 | 25–34 | Woman | Undergraduate | American | Spanish | None | Weekly or more | A few times a year | 35 |
| 11 | 25–34 | Woman | Undergraduate | American | English | None | Weekly or more | A few times a year | 100 |
| 12 | 45+ | Woman | High school | American | English | None | Weekly or more | Almost never | 103 |
| 13 | 45+ | Woman | Undergraduate | British | English | French | A few times a month | About once a month | 20 |
| 14 | 35–44 | Woman | Master’s | Polish | Polish | Polish; French | Weekly or more | Weekly or more | 80 |
| 15 | 45+ | Woman | Doctoral | American | English | None | Weekly or more | About once a month | 100 |

Table 12, reproduced. Caption, verbatim: "Table 12: Self-reported AI use."

| ID | AI-use frequency | Models used most often | Reported uses |
|---|---|---|---|
| 1 | Sometimes | ChatGPT | Deep research and summarization |
| 2 | Rarely | Google | Does not use AI |
| 3 | Often | ChatGPT; Grok Imagine; Nano Banana | Deep research and summarization; job search and career support; image generation |
| 4 | Often | ChatGPT | Writing and editing |
| 5 | Often | ChatGPT | Web search; personal advice; job search and career support |
| 6 | Often | ChatGPT; Grok | Web search; image generation |
| 7 | Often | Claude Opus; Claude Sonnet | Deep research and summarization; writing and editing |
| 8 | Often | Claude; ChatGPT; Grok | Deep research and summarization; writing and editing; translation |
| 9 | Always | ChatGPT; Claude; Kiro | Deep research and summarization; writing and editing |
| 10 | Sometimes | Gemini | Deep research and summarization; writing and editing |
| 11 | Never | None | Does not use AI |
| 12 | Always | Claude Sonnet 4.6; ChatGPT 5.3 | Deep research and summarization; writing and editing |
| 13 | Never | None | Does not use AI |
| 14 | Rarely | ChatGPT | Web search |
| 15 | Always | ChatGPT; Claude; DeepSeek | Deep research and summarization; writing and editing |

Procedure.

- All participants signed the consent form (Tables 13 and 14) and filled in a demographic survey (Table 15). "All surveys were administered through Microsoft Forms." Reading habits were also collected at recruitment.

Questions.

- Three questionnaire types are "embedded in the interface": single-reading (Table 16) about each text, comparison (Table 17) about both texts, and a short per-chunk questionnaire in close reading (Table 18).

Table 13, consent form presented to participants, verbatim:

> Consent Form - Evaluating machine translation of literary texts (Study #[REDACTED])
>
> Thank you for your interest in our study!
>
> Who is conducting the study? The co-principal investigators (co-PIs) are [REDACTED] and [REDACTED]. Another researcher involved in data collection is [REDACTED], a student at [REDACTED].
>
> Contact: [REDACTED] or [REDACTED]. You can also reach out to us via the Upwork messaging tool.
>
> Who is funding this study? [REDACTED] awarded to [REDACTED].
>
> Why are we doing this study? We want to investigate the quality of literary machine translation (i.e., Can AI translate literary texts as well as humans)
>
> Who can participate in this study? Participants are adults who are comfortable reading long literary texts in English (up to 8,000 words) and who read fiction in English regularly.
>
> Your participation is voluntary. You have the right to refuse to participate in this study. Refusal to participate or withdrawal/dropout after agreeing to participate and signing this consent form will not have any adverse effects or consequences.
>
> How is the study done? This study takes place online and will last about 4 to 4.5 hours, divided into 2 sessions over a period of a few days. If you agree to take part: (1) You will first read this consent form and indicate whether you agree to participate. (2) You will use your own device to complete the study online. A personal computer is recommended. (3) You will complete a short questionnaire about your demographic, language background, and reading habits (~5min). In Part 1 (about 1.5 hours), you will read a long excerpt from a novel in translation (~8,000 words in English), answer a small number of questions about it, provide a written comment, and indicate whether you think it was translated by a person or produced using artificial intelligence. You will then read a second translation of the same excerpt and complete the same set of questions. At the end of Part 1, you will choose which version you preferred overall and explain why. You are encouraged to take a break between the readings. In Part 2 (about 2.5 hours), which will take place a few days later, you will compare the two translations side by side in shorter chunks. For each chunk, you will highlight good and bad phrasing, choose the version you prefer, briefly explain why, and indicate whether the choice felt easy or difficult. You may take breaks during the study whenever needed. We may ask you for additional clarification if your comments are unclear.
>
> Risks, benefits, and your privacy
>
> What are the risks of participating? This study poses a minimal risk: none of the tasks involved in the experiment will have any direct or lasting impacts on participants. Possible inconveniences include fatigue or boredom, and we encourage taking breaks to prevent these.
>
> What are the benefits of participating? We do not think that taking part in this study will have direct benefits for you. However, in the future, others may benefit from what we learn from this study. Specifically, we think that this study might help us understand more about the quality of translation and how automatic machine translation works.
>
> Will you be paid for taking part in this research study? You will receive payment of $110 USD for the entire task (part 1 and part 2). You will receive the money within one week of submitting your answers via the Upwork payment system. If you withdraw before completing the study, compensation will be prorated based on the amount of the study completed.
>
> How will your privacy be maintained? Your confidentiality will be respected. Information that discloses your identity will not be released without your consent. • All participants will be identified only by a unique code number. • Participants will not be identified by name in any reports of the completed study. Name will be collected and stored by the PIs in a separate spreadsheet, and only for the purposes of matching name and code in case you decide to withdraw. • The study involves a questionnaire. The initial demographic questionnaire will be collected via Microsoft Forms, which stores data on Canadian servers. This data will be stored in a secure [REDACTED]-hosted server to ensure your information remains within our local, protected environment. Consent forms and study responses will initially be collected through secure online tools used for this study. After collection, the data will be downloaded and stored on a password-protected [REDACTED] researcher’s computer. • Access to study data (identifiable only through participant codes) will be limited to the PI and research assistants, all of whom have completed the required ethics training.
>
> What if you decide to withdraw your consent to participate? You may withdraw from this study at any time without giving any reasons, up to two weeks from the date next to your signature in the consent form. If you choose to enter the study and withdraw later, all data collected about you will be destroyed. Please contact us through email ([REDACTED] or [REDACTED]) and state that you wish to withdraw your data from this study. Please include the date of your participation. After two weeks have passed from the date of collection, we will not be able to accommodate a withdrawal request, as study data will already have been used in presentations and publications.
>
> Results, contact information, and future data usage
>
> Study results. The main findings will be reported in academic presentations and publications.
>
> Contact for Complaints. If you have any concerns about your rights as a research participant and/or your experiences while participating in this study, please contact the Director, Research Ethics at [REDACTED] or [REDACTED].
>
> Future use of participant data. The data will be coded and stored on [REDACTED] servers. No identifying information will be shared outside of our research group. All data that we collect will be used for research purposes only. De-identified study data will be made available to other researchers for future, unspecified use in academic publications and open-access servers. While limited study data will be accessible to others once published (e.g., age, gender, language background), we will never share identifying or confidential information.

Table 14, consent-form response fields, verbatim:

> Participant consent and signature. Taking part in this study is entirely up to you: You have the right to refuse to participate. If you decide to take part, you may pull out of the study at any time without giving a reason and without any negative impact by sending an email to [REDACTED] or [REDACTED]. Your continuation on the online experiment platform indicates that you received a copy of this consent form for your own records and that you consent to participate in the study. By consenting, you acknowledge that you have not waived any rights to legal recourse in the event of research-related harm.

| Field | Response options |
|---|---|
| Primary Study Participation (Required) | YES – I have read and understood this Consent Form and agree to participate in the study. NO – I do not wish to participate in the study. |
| Study Results (Optional) | YES – I would like to be notified of the results or findings of this study (e.g., via a summary report or infographic). I understand that the researchers will contact me through the secure Upwork messaging app. NO – I do not wish to be contacted with the study results. |
| Please type your full name (Required) | Open-ended response |
| Date (Required) | Date input field |

[aki-execute note] The consent form gives $110 USD "for the entire task (part 1 and part 2)" and Part 2 "a few days later". Section 2.2 and the ethics statement give $110 USD per book. Section 2.2 gives "unlocked after 24h". The repository guidelines give 20 hours (see below).

Table 15, entry questionnaire. Introduction, verbatim: "Thank you for your interest in participating in our study! This short questionnaire helps us understand your background, language experience, and reading habits. It should take only ~5 minutes to complete. Your responses will be used solely for research purposes and to help us ensure that you meet the requirements of this study. Thank you for your time and we appreciate your help!"

| # | Question | Response options |
|---|---|---|
| 1 | Your ID | Open-ended response |
| 2 | What is your age range? | 18-24; 25-34; 35-44; 45+; Prefer not to say |
| 3 | What is your gender? | Woman; Man; Non-binary; Prefer not to say; Other (open-ended response) |
| 4 | What is the highest level of education you are currently in, or have completed? | High school or equivalent; College / university undergraduate; Master’s degree; Doctoral degree; Prefer not to say; Other (open-ended response) |
| 5 | What is your nationality? | Open-ended response |
| 6 | How often do you use AI models (such as ChatGPT or Gemini)? | Never; Rarely; Sometimes; Often; Always |
| 7 | What AI models do you use most often? (if any) | Open-ended response |
| 8 | How do you use AI models? (if at all) | Open-ended response |
| 9 | What is your native language? | English; Other (open-ended response) |
| 10 | Do you primarily read in English? | Yes; No |
| 11 | How comfortable are you reading long literary texts in English? | Very uncomfortable; Somewhat uncomfortable; Neither comfortable nor uncomfortable; Somewhat comfortable; Very comfortable |
| 12 | Do you know any of these languages (pre-intermediate level or above)? Select all that apply. | Japanese; Polish; French; None of these |
| 13 | How often do you read literary fiction in English? | Almost never; A few times a year; About once a month; A few times a month; Weekly or more |
| 14 | How often do you read translated fiction in English? | Almost never; A few times a year; About once a month; A few times a month; Weekly or more; Not sure |

Table 16, single-reading questionnaire. Caption, verbatim: "Table 16: Single-reading questionnaire shown after reading each excerpt in isolation. Questions Q1–Q4 collect ordinal ratings of acceptability, smoothness, immersion, and willingness to continue reading; Q5–Q8 collect free-text explanations, origin guesses, and confidence."

| # | Question (with help text) | Response options |
|---|---|---|
| 1 | How acceptable did this translation feel overall as a published version of the book? Please think about your overall impression of this version as a published translation. | completely unacceptable; somewhat unacceptable; acceptable with some issues; mostly acceptable; fully acceptable |
| 2 | How smooth was this text to read? Please think about how naturally and clearly the sentences flowed while you were reading. | very unsmooth; somewhat unsmooth; neutral; somewhat smooth; very smooth |
| 3 | To what extent did the wording and style help you stay immersed in the story? Please think about whether the wording and style helped you stay absorbed in the story, or pulled you out of it. | interfered a lot with immersion; interfered somewhat; made little difference; supported immersion somewhat; supported immersion a lot |
| 4 | Would you want to continue reading the book in this version? If you were to continue reading, would you be willing to continue this version given its wording and style? | definitely not; probably not; not sure; probably yes; definitely yes |
| 5 | What, if anything, stood out positively in the wording or style of this version? | Open-ended response |
| 6 | What, if anything, stood out negatively in the wording or style of this version? | Open-ended response |
| 7 | Do you think this version was… | human-translated; machine-translated |
| 8 | How confident are you in that guess? (Regarding Question 7) | not at all confident; slightly confident; moderately confident; very confident; extremely confident |

Table 17, comparison questionnaire. Caption, verbatim: "Table 17: Comparison questionnaire shown after participants read the paired HT and MT excerpts for the same book. The questions collect translation preference, preference strength, reasoning, perceived machine-translation origin, and confidence."

| # | Question (with help text) | Response options |
|---|---|---|
| 1 | Which translation handled dialogue better overall? [Dialogue] | Translation 1; Translation 2; No meaningful difference |
| 2 | Which translation’s word choice felt more varied and/or expressive? [Word choice] | Translation 1; Translation 2; No meaningful difference |
| 3 | Which translation would you prefer to continue reading more? | Translation 1 (clearly better); Translation 1 (slightly better); Translation 2 (slightly better); Translation 2 (clearly better) |
| 4 | Why? Please motivate your choice in 3–5 sentences. Tell us why you would prefer the translation you selected. How was it better than the other one? Use T1 to refer to Translation 1 and T2 to refer to Translation 2. | Open-ended response |
| 5 | Which version is more likely to be AI-translated? | Translation 1; Translation 2 |
| 6 | How confident are you in that choice? (Regarding Question 5) | not at all confident; slightly confident; moderately confident; very confident; extremely confident |
| 7 | Why do you think it is more likely to be AI-translated? What are the indicators that make you think so? | Open-ended response |

Table 18, close-reading per-chunk questionnaire. Caption, verbatim: "Table 18: Close-reading per-chunk questionnaire. Participants choose the preferred translation for each aligned chunk, report preference strength, optionally highlight supporting spans, and explain the judgment."

| # | Question | Response options |
|---|---|---|
| 1 | Step 1. Highlight wording quality. Read both translations and mark phrases that sound especially good or poor. Select text, then choose a label in the popover. Click an existing highlight to remove it. | Open-ended reading and highlighting |
| 2 | Step 2. Which translation do you prefer? | T1; T2 |
| 3 | Step 3. Explain your choice (refer to translations as T1 and T2). | Open-ended response |
| 4 | Step 4. Was this choice difficult? | No, because the translation I chose was significantly better. No, because the translation I chose was better. Yes, because both translations were of similar quality. |

Interface, verbatim: "Participant-facing guidelines and interface screenshots are provided in the supplementary materials section of the GitHub repository (github.com/Yves575/lait)."

Display normalization, verbatim:

> We applied lightweight display normalization to reduce typographic inconsistencies across texts, including normalizing quotation marks, guillemets, apostrophes, and ellipses. This normalization was used for presentation and annotation consistency and was applied directly in the evaluation interface without affecting the source files. The same displayed text representation was used when recording span highlights, so participant offsets refer to the normalized interface text.

#### D.1 Interface supplement in the repository (fetched 2026-10-07)

The paper defers the interface description to the repository. This subsection records what the repository holds. Source: `docs/paper_supplement/` at commit `e960dc2`, local copies in `<V2>/docs/research/sources/lait-repo/`.

`docs/paper_supplement/README.md`, verbatim: "Supplementary materials that did not fit in the main paper's appendix are available here." It lists "Guidelines for Annotators" ("[Guidelines.pdf](Guidelines.pdf) shows the full, anonymized guidelines document that the participants read before beginning the reading and evaluation tasks."), "Interface Screenshots" ("[Interface.md](Interface.md) shows and describes screenshots from the reading/evaluation interface for the main reading/evaluation flow."), and "Prompts".

`docs/paper_supplement/Interface.md`, verbatim:

> The following screenshots demonstrate the main flow of the reading interface the participants used to evaluate excerpts and chunks.
>
> The excerpt-level questionnaires recorded whole-excerpt long-context preferences while the chunk-level questionnaire recorded local judgements.
>
> Single-reading questionnaire shown after an immersive reading session (full excerpt). Participants rated fluency, literary quality, immersion, willingness to continue reading, and whether the passage seemed AI-generated.
>
> Paired reading questionnaire shown after a comparative reading session (full excerpt). Participants chose which excerpt was translated better, was more expressive, which one they would more likely continue reading, which one they felt was the AI-translated version (MT), as well as rated confidence and explained their answers in prose.
>
> Paired reading questionnaire shown after a chunk reading session. The participants were asked to identify their preferred chunk and justify the decision, as well as highlight "good" and "bad" phrases.

`Guidelines.pdf` (12 pages, text extracted to `Guidelines.pdf.txt`, 115 lines and 930 words). The text, in order, with the screenshots of the PDF omitted:

- Purpose, verbatim: "We are trying to understand how well current AI systems can translate novels into English and whether these remain enjoyable for you (the reader)." Contact through the Upwork messaging tool or email. "Please read these guidelines to avoid redoing the task."
- TASK 1: participants get a link to two competing translations of the same book over Upwork, with a username and a password. Steps: log in and read the entire first excerpt, fill out the questionnaire, "Take a break as you require!", read the entire second excerpt, fill out its questionnaire, then fill in the questionnaire about both excerpts.
- Time, verbatim: "We estimate that all these steps will take you about 1.5h. On average, reading one translation alone would likely take you about 30-40 minutes. You can also take breaks as needed." "Please complete this task on a laptop or large screen."
- Guideline steps 1 and 2, verbatim: "Go to the website shared with you via UpWork and log in with your credentials." "You will see the entire experiment flow from your panel."
- Step 3, verbatim: "Start reading the first excerpt (first translation) You can adjust the reading screen by changing font size, etc., on the left upper side of the panel: IMPORTANT: If you need a break during reading, please press the PAUSE button located on the upper-left part of the screen:"
- Steps 4 and 5, verbatim: "You will be asked the following 8 questions, and you will also have access to the entire translation on the right side of the screen." "After you complete this questionnaire, you will be able to access the second translation. Please take a break before reading the second translation." "Just as with the first translation, you can adjust the screen and take breaks by clicking the PAUSE button."
- Steps 6 and 7, verbatim: "You will see the same 8 questions as in the first questionnaire." "In this questionnaire, you will be asked to answer 7 questions that compare both translations. You will have access to both translations at the bottom of the page. Please refer to translation 1 as T1, and to translation 2 as T2."
- TASK 2, verbatim: "In task 2, we will ask you to compare smaller chunks of both translations (about 300-400 words each). The goal of this task is to look closer at the translation quality of both versions." Steps: "Read both fragments.", "Highlight good and poor phrasing.", "Choose the translation you like better and tell us why.", "Depending on the chunk length, you will see about 25-30 pairs."
- Unlock, verbatim: "This part will become available after 20h from finishing the first task. Please reach out via UpWork if you have any questions or need us to unlock it earlier." Start with the "Start annotation" button.
- STEP 1, verbatim: "[important]: Please highlight good wording and poor wording/potentially problematic wording by dragging your cursor over the text and choosing the correct label: We mostly want to know what you like and what you don’t like. What phrasing seems like a good translation, and what does not? You don’t have to highlight everything. But we want you to use this functionality. Highlight words, phrases, or longer chunks of text that appear to be well or poorly written."
- Label definitions, verbatim: "Poor wording: This may include phrases that sound weird, out of place, flat, mechanistic, etc. Or other wording that you don’t like or just reads poorly." "Good wording: This may include phrases that are really good, well-written, natural, vivid, memorable, stylistically strong, emotionally effective (not flat), etc. Or other wording that captures the atmosphere, humor, tension, or helps to imagine the scene better."
- Highlight list, verbatim: "You will see it added on the side of the text (left for the text on the left and right for the text on the right):"
- STEPS 2 to 4, verbatim: "STEP 2: Choose the translation you prefer. STEP 3: Explain your choice. Please refer to translation 1 (left side) as T1 and to translation 2 (right side) as T2. STEP 4: Choose how difficult this choice was (i.e., easy choice if the difference is clear or hard choice if both are similar). Press “Save & Next” to go to the next chunk."
- End, verbatim: "Thank you for reading! Please send us this code to get your credentials and access to the interface: [REDACTED]"

Interface screenshots `[aki-execute note, observation of the three PNG files]`:

- `01_Single_Questionnaire_FULL_SCREEN.png` (191,813 bytes): top buttons "Home" and "Questionnaire", and "A−", "A+", "Dark" on the right. Left pane "Post-reading questionnaire" with the line "Thank you for reading! The text you read is displayed on the right for reference." Eight numbered questions. The 5-point scales are rows of colored option boxes (red to green). Q5 and Q6 text boxes show "0 / 50 characters minimum". Button "Submit answers". Right pane "TEXT YOU READ" shows the translation with its own scroll bar. The on-screen Q1 reads "If you bought this book in this version, how acceptable would the translation feel to you as a reader?", which differs from the Table 16 Q1 wording.
- `02_Comparison_Questionnaire_FULL_SCREEN.png` (293,000 bytes): header "Final questions" with a "Hide questions" button. Line: "Please answer all questions. Scroll the two translations below for reference." Seven numbered questions. Q1 ends "[DIALOGUE]" and Q2 ends "[WORD CHOICE]". The Q3 four-option scale uses blue for Translation 1 and orange for Translation 2. Q4 and Q7 text boxes show "0 / 100 characters minimum". Below a drag handle, two panes "TRANSLATION 1" and "TRANSLATION 2" scroll on their own.
- `03_Chunks_Questionnaire_FULL_SCREEN.png` (391,253 bytes): top bar "Home", a progress bar with "1 / 26", "Pause", "Settings". Toolbar: "Font size A− A+", "Screen width Narrower Wider", "Theme Dark". Instruction box "Step 1. Highlight wording quality". Two text columns "TRANSLATION 1" and "TRANSLATION 2". Side panels "T1 0" (left) and "T2 0" (right), each "No highlights yet." Below: Step 2 (T1 or T2), Step 3 text box with "0 / 100 characters minimum", Step 4 (three options), and "← Prev", "1 / 26", "Save & Next →". The screen shows only the two English translations, not the source text.

Source code for the interface: the public tree at `e960dc2` has no web front-end file. The withheld-file manifest (`docs/release/withheld-files.tsv`, 8,067 lines) lists a `tools/ht-chunk-reviewer/` application under the reason `out_of_preprint_scope_internal_chunk_review_tool` (41 files by `WITHHELD_FILES.md`). Whether that tool is the reader study interface is Not verified.

### E. Human evaluation results

Table 19, reproduced. Caption, verbatim: "Table 19: MT-identification accuracy by AI-use frequency. Participant-level association between AI-use frequency and MT-identification accuracy was close to zero: Pearson r=0.013; Spearman ρ=0.121."

| AI-use frequency | Correct / total | Accuracy |
|---|---|---|
| Never | 2 / 4 | 50% |
| Rarely | 4 / 4 | 100% |
| Sometimes | 2 / 4 | 50% |
| Often | 3 / 12 | 25% |
| Always | 6 / 6 | 100% |

Overall results.

- Excerpt level: readers preferred HT more often for dialogue and word choice (Figure 6).
- Close reading favored HT overall. MT took about one-third of preferences in each source language. Choices varied across books and chunks (Figures 29 and 22).
- Case study: HT preferred in 103 of 111 chunk judgments. Book-level results show the only excerpt-level MT preference. Span annotations show mostly positive evidence for HT and negative evidence for MT across target languages (Figures 17, 16, 15).

Figure captions, verbatim:

- "Figure 15: Median span highlight length in the multilingual case study. Bars show the median length of good and poor spans marked for HT and MT by target language."
- "Figure 16: Span-level annotations by target language in the multilingual target-language case study. Bars show the proportion of good and poor spans marked in HT and MT for each target language."
- "Figure 17: Book-level preferences in the multilingual case study. Each row is one book–participant pair; left/right bars indicate MT/HT preference, with darker shades marking stronger choices."
- "Figure 18: MT identification by book. Orange bars show HT identified as MT, green bars show MT identified as MT, and darker shades indicate higher confidence."

Agreement.

- Three levels: single-reading ratings, binary preference and origin judgments, span highlights.
- Single-reading 5-point ratings: Gwet's AC2 (`Gwet2021-ud`), "as it is more fit for skewed distribution data than Krippendorff’s alpha and handles ordinal variables".
- Binary judgments: Gwet's AC1 (nominal) for excerpt-level MT identification, excerpt-level preference, and chunk-level preference. Chunk-level agreement reported for all chunks, excluding similar-quality judgments, and where both readers judged one version significantly better. Also by book (Table 22).

Table 20, reproduced. Caption, verbatim: "Table 20: Inter-annotator agreement for single-reading ratings. Exact and ≤1 are agreement percentages; M|d| is mean absolute score difference; AC2 is Gwet’s ordinal agreement coefficient." Footnote 33, verbatim: "HT = human-translated; MT = machine-translated; n = paired ratings. AC2 colors follow Landis and Koch heuristic bands: red = slight, yellow = fair, green = moderate, blue = substantial, purple = almost perfect."

| Subset | n | Exact | ≤1 | M\|d\| | AC2 |
|---|---|---|---|---|---|
| Q1–Q4 overall | 120 | 35.0 | 64.2 | 1.16 | 0.426 |
| HT only | 60 | 38.3 | 70.0 | 0.98 | 0.616 |
| MT only | 60 | 31.7 | 58.3 | 1.33 | 0.216 |
| Q1 acceptability | 30 | 36.7 | 73.3 | 0.93 | 0.632 |
| HT only | 15 | 40.0 | 80.0 | 0.80 | 0.765 |
| MT only | 15 | 33.3 | 66.7 | 1.07 | 0.468 |
| Q2 smoothness | 30 | 36.7 | 70.0 | 1.03 | 0.529 |
| HT only | 15 | 40.0 | 73.3 | 0.87 | 0.725 |
| MT only | 15 | 33.3 | 66.7 | 1.20 | 0.290 |
| Q3 immersion | 30 | 30.0 | 53.3 | 1.40 | 0.229 |
| HT only | 15 | 33.3 | 53.3 | 1.27 | 0.405 |
| MT only | 15 | 26.7 | 53.3 | 1.53 | 0.057 |
| Q4 continue | 30 | 36.7 | 60.0 | 1.27 | 0.317 |
| HT only | 15 | 40.0 | 73.3 | 1.00 | 0.545 |
| MT only | 15 | 33.3 | 46.7 | 1.53 | 0.089 |

Table 21, reproduced. Caption, verbatim: "Table 21: Inter-annotator agreement for excerpt- and chunk-level binary judgments." Footnote 35, verbatim: "n is paired judgments. Both HT, Both MT, and Diff. count paired annotator outcomes. For excerpt AI/MT identification, HT and MT refer to which version readers guessed was MT. AC1 colors follow the same heuristic bands as footnote 33."

| Measure | n | Exact | Both HT | Both MT | Diff. | AC1 |
|---|---|---|---|---|---|---|
| Excerpt: guessed MT | 15 | 40.0 | 2 | 4 | 9 | −0.179 |
| Excerpt: preferred | 15 | 40.0 | 5 | 1 | 9 | −0.120 |
| Chunk: preferred | 386 | 63.7 | 191 | 55 | 140 | 0.355 |
| excluding similar chunks | 194 | 72.2 | 116 | 24 | 54 | 0.546 |
| both significantly better | 44 | 79.5 | 28 | 7 | 9 | 0.667 |

Table 22, reproduced. Caption, verbatim: "Table 22: Chunk-level preference agreement by book."

| Book | Lang | Pairs | Agr. | AC1 | Pairs excl. unsure (#p1/#p2) | Agr. excl. unsure | AC1 excl. unsure |
|---|---|---|---|---|---|---|---|
| Make Me Famous | FR | 27 | 44.4% | 0.023 | 13(5/11) | 46.2% | 0.112 |
| Mona’s Eyes | FR | 29 | 48.3% | -0.015 | 8(21/5) | 50.0% | 0.059 |
| Symphony Of Monsters | FR | 26 | 92.3% | 0.917 | 22(4/0) | 95.5% | 0.952 |
| The Story Of Marceau Miller | FR | 24 | 45.8% | 0.050 | 9(10/8) | 55.6% | 0.200 |
| Watching Over Her | FR | 28 | 50.0% | 0.113 | 11(2/15) | 54.5% | 0.197 |
| Hooked: A Novel Of Obsession | JA | 29 | 75.9% | 0.694 | 19(9/4) | 73.7% | 0.659 |
| Kokun: The Girl From The West | JA | 24 | 91.7% | 0.909 | 21(3/0) | 90.5% | 0.895 |
| My Grandfather, The Master Detective | JA | 22 | 95.5% | 0.948 | 15(6/2) | 93.3% | 0.929 |
| Sisters In Yellow | JA | 26 | 76.9% | 0.710 | 14(9/5) | 71.4% | 0.622 |
| The Ark | JA | 23 | 69.6% | 0.391 | 11(11/2) | 63.6% | 0.323 |
| Inner Space | PL | 26 | 42.3% | -0.076 | 8(13/14) | 75.0% | 0.600 |
| My Name Is Stramer | PL | 26 | 65.4% | 0.354 | 5(19/12) | 60.0% | 0.412 |
| Needle’s Eye | PL | 25 | 88.0% | 0.865 | 17(7/2) | 88.2% | 0.868 |
| The Empusium: A Health Resort Horror Story | PL | 28 | 50.0% | 0.200 | 17(11/0) | 41.2% | -0.006 |
| The Witcher: Crossroads Of Ravens | PL | 23 | 26.1% | -0.467 | 4(16/12) | 75.0% | 0.529 |

Span highlight overlap.

- A span overlaps when it intersects a span from the other reader on the same translation version. "Label-aware" overlap also needs the same good/poor label.
- Overall span overlap 0.307. Label-aware overlap 0.217.
- Readers who agreed on the preferred translation: 0.322 span overlap, 0.263 label-aware. Readers who disagreed: 0.280 and 0.137.

Table 23, annotation scheme for participant comments. Caption, verbatim: "Table 23: Annotation scheme for participant comments on Single Q5, Q6, Compar. Q4, and Chunk Justif. Only positive codes are applied to comments for Single Q5, and only negative codes are applied for Single Q6. For Compar. Q4 and Chunk Justif., positive codes are applied to match the comments’ positive aspects for the preferred translation, and negative codes applied to match the negative aspects of the non-preferred translation."

| Category | Code | Aspect | Definition (verbatim) | Pol. |
|---|---|---|---|---|
| A. Language-level features | A1 | Grammar & spelling | Issues related to grammar such as verb-subject agreement, article use, or misspellings. | +/− |
| | A2 | Word choice: clarity | Whether individual word and phrase choices are clear or keep the reader guessing when it was not inteded. | +/− |
| | A3 | Word choice: naturalness | Whether the choice of specific words or phrases is natural in English at the local level. Covers words/phrases that are grammatically correct and even understandable, but sound off (e.g., awkward) in English. | +/− |
| | A4 | Word choice: idiomaticity | Correct use of English idioms, set phrases, conventional collocations, and figure-of-speech precision; the negative side covers both misused/garbled idioms and over-reliance on clichéd or trite expressions. | +/− |
| | A5 | Word choice: register & contextual fit | Whether word choices match the context in aspects such as formality, period (e.g., historical vs contemporary), dialect/local speech, genre (e.g., sci-fi), speaker/situation (e.g., emotional context). | +/− |
| | A6 | Word choice: richness vs. blandness | Lexical interest of the vocabulary used, such as unusual, varied, atmospheric words and turns of phrase vs. generic, common, sterile, “dumbed-down” choices. Independent of B8 (a passage can be rich-and-concise or rich-and-wordy). | +/− |
| | A7 | Cultural adaptation | Translator’s localization decisions in both directions: localizing/explicating foreign concepts for the target reader (e.g., glossing terms, Americanizing place names) vs. preserving foreignness (leaving names/terms in source language, retaining cultural markers). | +/− |
| | A8 | Sentence structure | Sentence length, complexity, word order, run-ons, fragments, choppiness, and variety vs. monotony across sentences. | +/− |
| | A9 | Consistency | Whether the translation remains the same choices across the text in terms of vocabulary, voice, register, etc. (e.g., whether character names are translated consistently). | +/− |
| | A10 | Formatting & typography | The text’s visual and typographic conventions, such as the typesetter-and-stylistic-choice layer that sits between grammar and content. It includes paragraph structure (breaks, dividers), dialogue formatting (quotation vs em-dashes). | +/− |
| | A11 | Repetition or redundancy | Overuse of the same words, phrases, structures whether variation or compression would be better. This includes unnecessary lexical repetition, redundant content, etc. | − |
| | A12 | Untranslated content | Source material (words or phrases) that appear untranslated in the target text and are perceived by the reader as translation failures not deliberate choices to retain the source word for culture preservation. | − |
| B. Narrative-level features | B1 | Dialogue: naturalness | Whether the dialogue sounds like how people actually speak in the specific situation, context, emotional moment. It covers cases such as word plausability in speech (of this character), belivable phrasing etc. | +/− |
| | B2 | Character voice & potrayal | Whether characters come through as distinct, identifiable, and well-matched to who they are. B2 evaluates the voice of characters and narrators: both in dialogue and in prose attributed to a character’s perspective. character distinctness, attribution & character fit | +/− |
| | B3 | Description / vividness / visualizability | Whether the reader can picture the scene and whether word choices conjure clear mental images even when both options are technically correct; includes the craft distinction of showing vs. telling (scene-rendering that creates imagery vs. bare informational delivery). | +/− |
| | B4 | Figurative language | Use and effectiveness of metaphors, similes, imagery, and atmospheric or evocative phrasings; fires positively for evocative figures and negatively for misfiring ones that don’t match the referent. | +/− |
| | B5 | Emotional conveyance | Effectiveness of conveying the character’s or scene’s emotions to the reader (distinct from C4: B5 is about how well the reader can feel the story’s emotional elements, while C4 is about whether the text itself feels alive or soulful). | +/− |
| | B6 | Narrative organization | Story structure: scene transitions, paragraph / section flow, balance of exposition vs. action, story cohesion / motif recall (themes and descriptions that call back to previous text in the story). | +/− |
| | B7 | Narration & POV effects | Narrator stance: interior monologue, free indirect discourse (blending character’s thoughts into narration), narrator’s distance from the action, narrator addressing the reader directly; point-of-view handling like POV shifts. | +/− |
| | B8 | Pacing / information delivery / wordiness | Narrative-level pacing: info-dumps, lengthy descriptions that interrupt action; phrase-level wordiness (e.g. one word vs. whole phrase to describe the same thing). Independent of A6. | +/− |
| C. Reader experience | C1 | Comprehension / ease of following | Whether the reader could understand what was happening: local sentence-level understanding and global scene/plot-level comprehension (these can fire independently). | +/− |
| | C2 | Smoothness / reading effort | Whether the prose flowed or the reader kept getting stuck; i.e. how much friction was in the reading experience, separate from whether they understood it. | +/− |
| | C3 | Engagement / immersion | Whether the reader was pulled into the story: being in the world, losing awareness of reading, focused attention on the scene. | +/− |
| | C4 | Humanness / soul | Holistic judgement on whether the prose feels alive and human vs. robotic or mechanical (distinct from A3: individual word choices or sentences can feel natural, while the whole story can overall feel soulless). | +/− |
| | C5 | Enjoyment / overall positive affect | General reader satisfaction with the text: “I liked it”, “pleasant to read”, “a pleasure”, “I enjoyed both”; broader affective stance not related to a specific dimension, can be used as a catch-all for positive sentiment when no specific details given. | +/− |
| D. Meta-translation | D1 | Doesn’t read as translated | Holistic judgment on whether the prose reads as if originally written in English vs. feels like it’s been translated. | +/− |
| | D2 | Adaptation vs. literalness | Whether the translator adapted to English idioms and general audience expectations (positive) vs. translated word-for-word from the source language (negative); can fire with D4 when literalness is interpreted as a cue for MT. | +/− |
| | D3 | Faithfulness to original | How well the text preserves the source meaning, voice, emotion, structure, subtle implications, connotations, and specific facts; usually perceived at the chunk-level, and often inferred by comparing small detail inconsistencies between two presented translations. | +/− |
| | D4 | MT/AI tell named | Reader explicitly articulates a specific cue that triggers the MT/AI impression: e.g., em-dash overuse, bullet-point styling, “would” overuse, US English defaults, anthropomorphizing concepts, and other details that are perceived as tells for AI-generated text. | +/− |

[aki-execute note] Table 23 lists 29 codes (A1 to A12, B1 to B8, C1 to C5, D1 to D4). Spelling errors ("inteded", "plausability", "belivable", "potrayal") are kept as in the source.

Table 24, annotation scheme for Compar. Q7 (why a translation is perceived as MT). Caption, verbatim: "Table 24: Annotation scheme for participant comments on Compar. Q7 (justifying decision for which translation is perceived as machine translation)."

| Code | Aspect | Definition (AI-pointing), verbatim | Human-pointing examples, verbatim |
|---|---|---|---|
| M1 | Literalism / source-bleed | Translation feels word-for-word or dictionary-like; source-language structure, idiom, or convention bleeds through; the method feels direct and unedited rather than adapted for English. | translated in a way that was corrected to make sense for English |
| M2 | Word choice | A specific word or short phrase reads as off; wrong, stilted, archaic, jargon, bland, generic, or conversely vivid and colloquial. The reader points at the word itself. | in a frenzy’ more accurate than ’with a fever’ |
| M3 | Sentence flow, structure & grammar | How sentences are shaped and how they connect: choppy, truncated, run-on, abrupt, copy-paste structure, sentences that do not link, and grammatical mechanics such as tense inconsistency, verb agreement errors, modal misuse, or overuse of grammatical forms. | some things flow more smoothly in T1; more variation in sentence lengths |
| M4 | Formatting & surface artifacts | Visible page-level mechanics not folk-theory framed: punctuation, scene dividers, quotation marks, dialogue formatting, and encoding glitches. Em-dashes as an “AI sign” are coded as M10. | slightly better formatting with proper nouns |
| M5 | Wrong tone or mixed register | Whole passage is in a wrong tone for a novel, such as manual, textbook, technical, or Wikipedia-mode prose, or register switches and mixes inside the passage, such as US/UK slang together, source-culture and target-culture mixing, or formal-informal swings. | older style consistent with fantasy |
| M6 | Wordiness / over-explaining | Text uses more words than needed: padding, extra words, info-dumping, or lack of economy. Different from M5; wordiness can occur in any mode. | economical; tight prose |
| M7 | Voice & emotional life | Whether prose is alive, e.g., engages, immerses, evokes mood, conveys emotion, gives characters distinct voices. Fires on flatness, mechanical feel, characters sounding alike, failure to evoke scene, inability to picture/feel. Immersion lives here. | more natural and conveys more emotion; made me feel like a sassy idol |
| M8 | Meaning errors | Text gets meaning, logic, embodied physics, or factual content wrong, e.g., impossible images, lost nuance, dumbed-down content. Error is in the text, not the reader’s parsing. | T2 “breathed through his mouth” more logical; T2 treats speaking underwater as hypothetical rather than given |
| M9 | Comprehension difficulty | Reader could not follow, had to reread, needed the other version, or was confused by a specific passage. About reader experience, not text defect. | T2 much easier to understand; version of the sentence clearer in T2 |
| M10 | Folk theory invoked | Reader explicitly references what AI does, such as a named stereotype, prior experience, or capability claim. Triggers on language like “classic sign of AI,” “AI tends to,” “I’d expect from AI,” or “beyond what AI is capable of.” | Human translators manage fluidity AI does not match; would not think AI capable of that leap |

[aki-execute note] The HTML holds Table 24 as one run of text. The split between the definition and the example columns follows that text and is not checked cell by cell against the PDF.

- "The coded comments are released in the repository." Comment examples: Table 34.
- [aki-execute note] The repository README states that "Row-level participant comments and annotation exports are withheld." The coded-comment release claim and the public repository disagree. Which coded files are public is Not verified.

Comment analysis. Tables 25 to 28 give the top positive labels for each preferred system and task. Table 3 summarizes them.

Table 25. Caption, verbatim: "Table 25: Top Q5 POSITIVE labels assigned to MT in the chunk-level comparison task. Counts are response-level label presences."

| Rank | POSITIVE label assigned to MT | Count | Example (verbatim) |
|---|---|---|---|
| 1 | A3. Word choice: naturalness | 35 | “Overall I preferred the wording used in MT. HT felt slightly simple at times, e.g., ‘being beaten with sticks’ felt like over-explaining.” |
| 2 | A5. Word choice: register & contextual fit | 29 | “I slightly preferred the more formal/older English style of MT but both translations seemed to sufficiently convey the message.” |
| 3 | C2. Smoothness / reading effort | 26 | “MT was a better translation as it was generally easier to read with a better natural flow.” |
| 4 | A6. Word choice: richness vs. blandness | 23 | “MT uses more interesting, unusual words like ‘pellet of paper’ instead of ‘ball of paper’ and ‘loathsome’ instead of ‘hideous.”’ |
| 5 | B3. Description / vividness / visualizability | 22 | “I only picked MT as my preference because the descriptions, like of their home, gave me a fuller picture of the scene.” |
| 6 | C1. Comprehension / ease of following | 17 | “HT is all mixed up in the narrative and it is not as logically rolled out as in MT. There is a significantly better flow in MT and it makes it more understandable and easier to follow.” |
| 7 | B8. Pacing / information delivery / wordiness | 17 | “MT has a tighter feel that comes across as more of a conversation than HT does.” |
| 8 | B2. Character voice & portrayal | 16 | “I overall liked the wording of MT better because it sounded to me more like how the character of Sarah, who is the wife of an author, might speak.” |
| 9 | A2. Word choice: clarity | 16 | “I thought HT was referring to a literal ‘band’ of boys because of the instrument talk, so I prefer MT because the word ‘gang’ was much clearer.” |
| 10 | D3. Faithfulness to original | 13 | “MT has a marginally better flow and leans more faithfully on the Japanese, which results in a slightly awkward English reading experience, but it is not by any means bad.” |

Table 26. Caption, verbatim: "Table 26: Top Q5 POSITIVE labels assigned to HT in the chunk-level comparison task. Counts are response-level label presences."

| Rank | POSITIVE label assigned to HT | Count | Example (verbatim) |
|---|---|---|---|
| 1 | C2. Smoothness / reading effort | 92 | “HT simplified a lot of overcomplicated sentences we see in MT, which makes text in HT flow much better. Sentences in MT are too long and overly complicated.” |
| 2 | A2. Word choice: clarity | 87 | “HT is more succinct, more precise, and more idiomatic. MT is unnecessarily wordy, e.g., ‘frightened her terribly’ instead of ‘terrified her.”’ |
| 3 | A3. Word choice: naturalness | 80 | “HT has more natural phrasing while MT sounds more like a literal translation. Better word choice makes HT easier to read and makes the text flow better when reading.” |
| 4 | C1. Comprehension / ease of following | 64 | “I found myself having to reread sentences in MT to follow what it was saying. It was just far easier to understand in HT.” |
| 5 | A8. Sentence structure | 39 | “HT had a better choice of splitting it up into smaller sentences which make it easier to read.” |
| 6 | B3. Description / vividness / visualizability | 39 | “HT has a much clearer narrative picture and reads beautifully. The descriptive passages hit very well and it is just very enjoyable to read.” |
| 7 | B8. Pacing / information delivery / wordiness | 31 | “HT has a better narrative and conversational flow, as well as tighter descriptions and a better arrangement of the action.” |
| 8 | A5. Word choice: register & contextual fit | 26 | “Some sentences in MT, while technically correct, are not how a person would say it in English. ‘We’ll be happy to comply,’ from HT is more fitting.” |
| 9 | A6. Word choice: richness vs. blandness | 24 | “HT has more unusual and interesting word choice, such as ‘omnipresent water’ instead of just ‘all that water’ and ‘a sorrowful note appeared in his voice’ rather than ‘sadness entered his voice.”’ |
| 10 | A1. Grammar & spelling | 22 | “HT has a much more natural use of grammar and punctuation. I struggled to understand how these two sentences are connected when I initially read them in MT.” |

Table 27. Caption, verbatim: "Table 27: Top Q3 POSITIVE labels assigned to MT in the Part 1 comparison questionnaire. Counts are response-level label presences."

| Rank | POSITIVE label assigned to MT | Count | Example (verbatim) |
|---|---|---|---|
| 1 | C2. Smoothness / reading effort | 5 | “MT has a better flow and word choice overall compared to HT, which had me rereading sentences to grasp their meaning more than once.” |
| 2 | C3. Engagement / immersion | 5 | “The language in MT is much more natural than HT and is clearer to understand. MT pulls the reader in with more vivid descriptions and is generally well-written. HT was boring to read and I felt my mind wandering.” |
| 3 | C5. Enjoyment / overall positive affect | 5 | “I enjoyed both translations immensely and found them easy to read. I prefer MT’s word choices because they come off as more intricate and varied to me. It is more formal than HT’s phrasing in some parts, without feeling unnatural.” |
| 4 | A6. Word choice: richness vs. blandness | 4 | “MT uses richer language with more unusual turns of phrase and wording. This creates a better atmosphere and more interest. HT uses regular language that seems somehow sterile and more common.” |
| 5 | C1. Comprehension / ease of following | 4 | “MT made more of an effort to explain foreign words than HT, like ‘the Pentateuch’ in HT is translated as ‘the Five Books of Moses’ in MT. I have no idea if that is an accurate translation, but it was easier for me to understand.” |
| 6 | B2. Character voice & portrayal | 3 | “I felt like I was able to pick up the essence of the characters more in MT, for instance, the difference between Sarah thinking ‘He melts me, the idiot’ and ‘I’m touched.’ MT just gave a clearer picture of personalities and relationships with its words.” |
| 7 | A5. Word choice: register & contextual fit | 3 | “MT also made language choices, particularly the use of an older style of English, that are generally more consistent with this style of fantasy, e.g. [MT] ‘Do not take offence’ vs. [HT] ‘Don’t be cross’.” |
| 8 | A3. Word choice: naturalness | 3 | “The language in MT is much more natural than HT and is clearer to understand. MT pulls the reader in with more vivid descriptions and is generally well-written.” |
| 9 | A2. Word choice: clarity | 3 | “When reading HT the last sentence confused me initially, ‘But what if he didn’t when he could see it,’ while in MT it seemed much clearer: ‘But what did it matter that he did not know, when he saw.”’ |
| 10 | A7. Cultural adaptation | 2 | “MT made more of an effort to explain foreign words than HT, like ‘the Pentateuch’ in HT is translated as ‘the Five Books of Moses’ in MT. I have no idea if that is an accurate translation, but it was easier for me to understand as someone with very little knowledge of Jewish teachings.” |

Table 28. Caption, verbatim: "Table 28: Top Q3 POSITIVE labels assigned to HT in the Part 1 comparison questionnaire. Counts are response-level label presences."

| Rank | POSITIVE label assigned to HT | Count | Example (verbatim) |
|---|---|---|---|
| 1 | C2. Smoothness / reading effort | 15 | “HT was much easier for me to read than MT. The wording flowed better and made it a seamless reading experience, whereas in MT I felt like I had to reread sentences now and then to make sure I was understanding right.” |
| 2 | C1. Comprehension / ease of following | 8 | “HT was far easier to follow in terms of flow and word choice. MT had at times, bizarre punctuation choices and was very choppy. MT made it difficult to determine who was speaking.” |
| 3 | A3. Word choice: naturalness | 6 | “The HT translation is simply more human. MT translation is overall proper with small errors, but there is no emotional impact on the reader. HT flows better, the sentences are more real for lack of a better word.” |
| 4 | A8. Sentence structure | 6 | “The wording in both translations was good, but where HT surpassed MT was in sentence structure, avoiding too many long sentences, and formatting, dividers between scenes.” |
| 5 | A2. Word choice: clarity | 5 | “From the start of the story, HT was a lot clearer to me and I think a lot of that has to do with punctuation and word choice. MT does not necessarily use obscure or uncommon words, but the translation does not feel quite right at times.” |
| 6 | B6. Narrative organization | 5 | “HT flowed better. Text was broken up and summarized. The dialogue tags were more natural. I like the shorter sentences in the first translation.” |
| 7 | C3. Engagement / immersion | 4 | “HT had no formatting issues that I noticed, for one, and also had a richness/uniqueness to it that pulled me in. The dialogue flowed well and, while complicated at times, is not unusual for an epic fantasy book of this nature.” |
| 8 | A6. Word choice: richness vs. blandness | 3 | “The descriptions were more 3 dimensional in HT. They interacted with one another and recalled past phrasing. They drew pictures more vividly and expressed thought in a more cohesive manner. The flow had a more nuanced cadence and was less flat than MT.” |
| 9 | C4. Humanness / soul | 2 | “HT stands out to me as clearly more human translated. Translations, but also literary fiction in particular, can get away with a bit of a weird/removed style of writing that made MT not seem strange to me, but HT was more natural.” |
| 10 | D1. Doesn’t read as translated | 2 | “HT also felt more like reading a story in English rather than a translated story. MT definitely read like someone or something translating word by word; it did not feel natural while reading.” |

Further figures, captions verbatim:

- "Figure 19: Positive and negative aspects mentioned by participants when comparing machine translation (MT) and human translation (HT)." Panels: (a) Positive aspects, (b) Negative aspects.
- "Figure 20: Positive reasons readers reported for preferring one translation over the other, separated by preferred system. Counts and percentages are calculated within each preferred-system group." Panels: (a) Excerpt-level preferences, (b) Chunk-level preferences.
- "Figure 21: Preference mechanisms explaining why the chosen translation was preferred. Diverging bars contrast attraction to the winning translation with rejection of the losing translation, separately for HT-preferred and MT-preferred cases." Panels: (a) Excerpt-level, (b) Chunk-level. The paper motivates it: "readers often mention not only positive things about their chosen translation but also negative things about the other candidate".
- "Figure 22: Close-reading chunk-level preferred translation. Each cell shows one chunk comparison for an excerpt and reader. Green indicates HT preference, purple indicates MT preference, and darker shades indicate stronger preference."
- "Figure 23: Preferred translation by excerpt and reader. Bars show the share of chunk-level choices favoring MT on the left and HT on the right; darker shades indicate greater preference strength."
- "Figure 24: Per-book immersive-reading ratings for HT and MT. The figure breaks down participant ratings by book, making cross-book variation visible alongside the aggregate trends reported in the main paper." The PDF text title: "Isolated-reading: by book ratings contrasted with comparative preferences".
- "Figure 25: Immersive-reading ratings by presentation order. The figure compares ratings assigned after the first and second single readings, grouped by whether the human translation (HT) or machine translation (MT) was shown first."
- "Figure 26: Translation-origin guess flows after the comparison task. The first panel summarizes whether guesses were correct for HT and MT; the second panel shows reported confidence across those identification decisions." Panels: (a) Guess correctness, (b) Guess confidence.

Single-reading ratings: Figure 25 splits ratings by presentation order. Figure 24 reports them by individual preference, with order and final excerpt-level preference.

AI-detection guesses: the paper compares single-reading guesses with final comparison guesses. Figure 13 shows cues by correct and incorrect guesses.

Readers who often use AI were NOT better at detecting AI translation, verbatim: "Overall, we do not see any apparent trends or correlation between the AI experience and detection accuracy (Table 19)."

Good and poor span-level highlights: 41.7% of MT chunks had at least 100 poor-highlighted words per 1K words, versus 11.9% of HT chunks (Figure 8).

Post-study interviews, verbatim:

> Participants were initially skeptical about the quality of LLM translation: some, who have previously edited AI translations, recall them being of poor quality, and thus adjust their expectations accordingly, while other non-experts did not trust LLMs to produce a good narrative from anecdotal experience. However, most participants, even those who correctly discriminated HT from MT, were pleasantly surprised by MT’s quality, despite their general preference towards HT, one participant even preferred MT over HT despite correctly identifying them! Furthermore, several participants noted that the LLM translations did not contain the usual cues that they typically associate with LLM translations and writing: one participant states that they would “have no inkling of it being translated by AI” if it was surrounded by human-written books in their personal book collection. This view is not universal among participants, however. Some state that despite MT texts being semantically accurate, which is the goal of a general-purpose translation system, they write too literally, frequently miss subtle context cues in the story, mistranslate idioms or other culturally-sensitive phrases, and lack the stylistic and narrative requirements of fiction, “[MT] tends to flatten the author’s voice.” Conversely, many participants were disappointed in the quality of HT excerpts of some of the books, either due to mistakes that should have been caught during editing or overall poor quality. The participants’ general consensus was that agentic LLM translation systems are not ready for standalone publication, but may be integrated to generate first drafts to be further edited by expert human translators.

Table 29, post-study questionnaire. Caption, verbatim: "Table 29: Post-study questionnaire. All responses are free text."

| # | Question |
|---|---|
| 1 | What were your expectations for the quality of AI translation before starting this experiment? |
| 2 | You {correctly/incorrectly} identified the AI-translated version of Book 1, and {correctly/incorrectly} identified the AI-translated version of Book 2. Are you surprised by your accuracy? |
| 3 | What do you think about the quality of AI translation now, after reading the translation? |
| 4 | Any other comments? |

Tables 30 to 33, post-study responses. Caption of Table 30, verbatim: "Table 30: Post-study responses grouped by participant (part 1 of 4; participants P1–P4). Q1 asks about expectations for AI translation quality before the study; Q2 asks whether participants were surprised by their AI-identification accuracy; Q3 asks for their post-study view of AI translation quality; Q4 collects other comments." Tables 31, 32, and 33 cover P5–P7, P8–P11, and P12–P15 ("Questions are as in Table 30"). All responses below are verbatim.

| P | Identified Book 1 | Identified Book 2 | Expected worse | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|---|---|---|
| P1 | yes | no | yes | I expected the AI translations to be more obviously written by AI. I was impressed even with the translations I didn’t prefer. | I’m not that surprised actually, book 2 was by far harder to pick a favorite of. I had a really hard time even finding flaws, and when I did I’d find them more on a preference level and then both translations had some. | I think it’s so good, hence my mistaking it as human. I think it read really smoothly and if it was one of my books, I would have no inkling of it being translated by AI | no other comments come to mind! Thanks for having it, it was so fun! |
| P2 | yes | yes | yes | My expectations for the quality of AI translation before starting this experiment were that they would be a little confusing to read because they would be directly translated, which sometimes does not mean translated correctly. It was my impression that usually with different languages, the English translations were not exactly correct. So I figured there would be some awkward or incorrect wording. | I am not surprised by my accuracy in correctly identifying the AI translations of both Book 1 and Book 2. | My opinion of AI and its quality is the same as it was before, which is that it can be helpful but at the end of the day only a real human can get something to the way it needs to be. I don’t think AI has the ability to understand when something doesn’t sound right or use context to correct something. A real person, on the other hand, can take something translated poorly and rework it in order for it to make sense. | N/A |
| P3 | no | no | yes | I expected the writing quality to be a lot worse. I thought that the resulting text would be more in line with that of AI-written text (not translated, entirely AI-generated from prompts). | Not particularly. I leaned towards one being AI over the other mainly because of quality differences. I do still believe that with a few copies of each, humans could learn to pick up the patterns and correctly detect which is AI-generated. | It’s substantially better than I expected. I definitely feel that it’s one of the best applications of LLMs that I’ve seen. | The quality of the human translations were quite a bit worse than I expected. It’s almost like they didn’t use an editor to review it afterwards. There were pretty clear issues that shouldn’t have slipped through. I think that a version that’s objectively higher quality than both could be made by combining the better parts of each translation. |
| P4 | no | no | yes | My expectations of the AI translations were low, based on the poor quality of many of the AI-generated books I edit and humanize. | I am somewhat surprised because I was fairly sure. However, the quality was much better than what I’m used to, and the books didn’t have many of the usual “tells” I often see. | I think it has improved remarkably in a very short time. | N/A |
| P5 | no | no | no | I expected them to be good. I use ChatGPT multiple times a day, for many reasons. A lot of times it’s to get answers for random things that pop in my head that I’m curious about, (that happens quite a bit, maybe more than most people, my brain is funny like that). But I also have been using it a ton the past few months, daily, with my resume as I’m job hunting. I’ve seen AI give amazing responses, but I’ve also seen it be incorrect and inconsistent. So while my expectations were high, I had a constant hesitation wondering how much faith I wanted to put into the machine. If that makes sense. | I’m not surprised now that I’ve completed them. For both books, when it came to Part 2 and I was annotating them and comparing them, I knew I’d made the wrong choices. Reading them one at a time and a day apart made a huge, huge difference and that surprised me. | I think it’s inconsistent, for starters. I don’t think it’s safe to hand projects over to and be confident that you’ll get a flawless result. I’ve often wondered about how a machine can replace a human in instances like this, when tone and even the smallest nuances, make the biggest differences. They’re also so literal with the words, they can’t grasp the context. I think AI translations make for a great rough draft. Maybe that’s the best way to put it. | I’d be curious to know if my annotations, the translations that I critiqued and disliked the most, were AI. When I got to that point is where I feel I realized what was what. Or maybe I just didn’t care for how a person translated them, and was critiquing them! Oh gosh.. haha! |
| P6 | yes | yes | no | I expected AI to produce a competent literal translation but to slip up with idiomatic language and polysemous words, and its translation of scenes that are supposed to evoke emotion. | Not really surprised (but certainly gratified) because translating fiction is tricky even for humans. I think it was with Henning Mankell that I first started paying attention to the names of translators when one of the books in his Wallander series sounded “off”. And he used top-notch human translators! | On the whole, I assume that AI accurately reproduced the text from the original to English but it tends to flatten the author’s voice. That is not a problem when all the reader wants is a functional translation of information. But that is not why we read fiction. | An AI translation is still a lot like CliffsNotes: function without form. I doubt “War and Peace” will get an AI makeover any time soon! But I shouldn’t be too cock-a-hoop. AI learns 24/7 and I will probably have to buy another hat to eat in the not too distant future. |
| P7 | no | no | yes | My expectations were pretty low. I was paid to “clean up” a machine translation of a non-fiction book about the outbreak of war in Ukraine in 2022 for Ibidem press, and it was pretty clunky. The idioms were very off. This was much better. | I am only a little surprised by my accuracy, now that both tasks are finished. | I think that rather than demonstrating the quality of AI translation, this project demonstrated to me how challenging it is to judge the quality of any translation of a piece of literature from the opening pages. The Japanese novel really seemed “off” to me in how it was depicting the protagonist – she seemed much too squirrely to be a successful businesswoman. I attributed this to an AI-translator, but having looked up the book, I now know she was supposed to seem squirrelly because she is a stalker on the verge of giving in to obsession. After reading those texts, I can definitely see the appeal of working with an AI-translator rather than a human-translator for an author looking to truly preserve their voice in a piece of fiction. The two tasks have not impacted how i feel about AI writing at all. | This project inspired me to dust off the now 15-year-old translation of a Renaissance Latin text in the style of Sallust that was a core component of my doctoral project and which, because the text seems just so unappealing to English readers, I had not ever planned on returning to… and the LLMs’ analysis and discussion with me of the text confirmed that the text just isn’t translateable today … when no one wants to read Gibbons-esque prose. Thank you for this opportunity. It was a fun task, and I am enjoying reading Hooked so much that I have sent copies to friends. |
| P8 | no | yes | yes | I had a realistic expectation of accurate translations in terms of word choice, but I wasn’t sure about the sentence construction on a grammar level. I wasn’t expecting a 1v1 direct translation, because that doesn’t work from Japanese to English, but I thought there would be more… mechanical issues. | I am and I’m not. I think it comes down to the nature of the translation. Book 2 was much easier to detect AI on because the human-led translation was so tightly done on a narrative level. It flowed very well, with some variance in terms of paragraph structures that I attributed to the nature of the original language. Book One was hard to figure out, but I chose the version I did because of the work I currently do. Most of my authors use AI to wholly or in part generate a manuscript which they submit to me for humanizing. These manuscripts have certain linguistic conventions (truncated sentences, over-reliance on mechanical or stage direction language, certain buzzwords to describe human emotions: the architecture of a face, etc.) that made me view the translations through that lens. I’m trained to spot short, choppy sentences and odd word choices as being AI-generated. | I’m pleasantly surprised at the quality. It’s not perfect, but it’s definitely not going to stop me from reading. | I think the style of the human translation played a large part in how I viewed the AI version. The translator who chose a more Western style felt more natural to me, and that made it easier to pick out an AI version. Book One’s translator felt more faithful to the tone and style of the Japanese original, which read oddly to my English eyes. This was an honestly fascinating look at a side of my industry that I didn’t have before. I greatly appreciated this chance to be part of the project, and it’s solidified my desire to write down my observations on how AI handles fiction. |
| P9 | yes | yes | yes | I expected the translation to be a lot worse than it actually was (almost like how Google Translate translates a sentence - usually in a way no English speaker would say it). | I’m not surprised by the accuracy - I wasn’t completely confident, of course, but I didn’t expect a human to miss the obvious issues in the AI translations (dialogue issues and scene break/double hyphen issues). | The issues in the AI translations were more to do with style than actual major wording problems, which I think is amazing. | I think the books were translated very well in all versions, a few easily-fixable issues aside. If AI could do the brunt work in translations, then a human can just review it and fix those small issues (or train the model to fix it itself in the future!) |
| P10 | no | yes | yes | My expectations for AI translation were pretty low coming into this experiment. I have seen some pretty bad translations in the past. | I’m surprised! But I do think Book 1’s translation was a lot better than Book 2’s. It was easier in Book 2 to differentiate between the two because of the amount of dialogue, in my opinion, and the way things were phrased. | I think there is some merit to exploring AI-assisted translations, but I think they need human revisions to streamline the overall translation. | Thanks for giving me the opportunity to participate in the study! |
| P11 | yes | no | yes | I expected the AI translation to be obvious. I read a lot of AI generated work and it has very specific tells and often devolves into nonsense. | I am not surprised. Book 1 felt very obvious when comparing the two translations. Book 2 was much harder. I’m not even sure which one I chose because the translations were of similar quality in my opinion (both felt kind of off). | I was surprised by the quality of the translation in Book 1, it was much better than expected, but the human-generated translation was even better and provided context I don’t think an LLM is capable of. I can see a good use case for it. I struggled a little with both translations of Book2 so it’s hard to draw any conclusions there. | As a lover of books and languages I really enjoyed doing this! Thank you for the experience. Oh! And I’ll also add that if I had only read T1 from book 1, I would not have guessed it was AI translated. It was only obvious by comparison. I was very suspicious of there being a double blind on the second book [face with tears of joy emoji] |
| P12 | yes | yes | yes | I think I was expecting less than what I read. As in, I thought it would be easier to detect the AI. | No, I’m not surprised. I do a LOT of work with AI and there are some tells that give it away. There is also the conversational tone that AI hasn’t quite nailed down. | I think the first book, the one about the spaceship, was much better. I don’t know if it’s the original author writing the book in a more conversational tone, or if the AI chose better words. The Michealangelo book was extremely difficult to read. Both version were challenging, which tells me that’s the way the author wrote it. | N/A |
| P13 | yes | no | yes | I expected the quality of AI translation to be stilted and mechanical with the words not always in the right order. | Yes, I’m surprised by incorrectly identifying the AI-translation version of Book 2. | I still feel that the AI translation lacks a human aspect, with less vivid descriptions. | The human translation can vary depending on the experience/quality of the translator. A human translator who is familiar with a particular place or culture can bring their own human experience to the translation. |
| P14 | yes | yes | yes | I was expecting the quality to be somewhat worse than what I read in the provided texts. More missing context due to language/cultural differences, more literal translations without replacing idioms, etc. | I thought it would be easier to identify the AI translation than it was in reality. When I had two texts side by side it was quite easy, but when I read them separately, it was quite similar to poorly done translation by a human amateur. | Both AI translations in the text were more or less acceptable from the point of view of literal translation. However, they were missing emotional import, poetic sense and failed to take into consideration that some things should be changed in translation based on the cultural and language differences in the output language. | I think AI can be a useful tool if we are stuck and are trying to see how something can be said or written, but it should only be treated as a tool or a guide, there is no way that AI can properly convey everything - emotion, language style, etc, and take into consideration many, many things around the language that we do not think of but notice the difference when reading the text. |
| P15 | yes | yes | no | I expected a grammatically correct translation of AI. It has become much better in the past few months and I anticipated a robust and accurate interpretation of the narrative. In the first book, one translation was significantly better than the other. In the second book, I was disappointed by the grammar and use of words. There was lack of depth and engagement. | I am not surprised by my accuracy. I read a lot of AI and work with it every day. So I can tell by grammar, use of colons and em dashes, and choice of words pretty clearly. | I think the translations need work. The first book was superior to the second book. The translations were poorly organized and lacked compelling narrative. | It would be fairly easy to fix the translations so they don’t sound so AI driven. HUmanizing does not take that much time. Please feel free to reach out if you need help with anything else. |

Table 34. Caption, verbatim: "Table 34: Examples of contextual reader judgments in excerpt-level and chunk-level preference explanations. These examples include the full comments behind selected snippets quoted in the main text and illustrate how participants evaluated translation choices against perceived story context, including genre, period, cultural setting, character voice, and reading effort. Participants saw anonymized T1/T2 labels during evaluation; we replace those labels with HT and MT here for readability."

| Level | Book | Preferred | Participant comment (verbatim) |
|---|---|---|---|
| Excerpt | Needle’s Eye | HT | HT was far easier to follow in terms of flow and word choice. MT had at times, bizarre punctuation choices and was very choppy. MT made it difficult to determine who was speaking, and while HT also lacked some context, it was just due to the story being short and its style. With MT, it was difficult to follow because it switched around, sometimes using quotation marks and sometimes using dashes. It did not have a flow to it. |
| Excerpt | The Story of Marceau Miller | HT | HT was much easier for me to read than MT. The wording flowed better and made it a seamless reading experience, whereas in MT I felt like I had to reread sentences now and then to make sure I was understanding right. HT also felt more like reading a story in English rather than a translated story. MT definitely read like someone or something translating word by word; it didn’t feel natural while reading. |
| Excerpt | The Story of Marceau Miller | MT | I enjoyed both translations immensely and found them easy to read. I prefer MT’s word choices because they come off as more intricate and varied to me. It is more formal than HT’s phrasing in some parts, without feeling unnatural. I felt like I was able to pick up the essence of the characters more in MT, for instance, the difference between Sarah thinking “He melts me, the idiot” and “I’m touched.” MT just gave a clearer picture of personalities and relationships with its words, in my opinion. |
| Excerpt | The Witcher: Crossroads of Ravens | MT | MT also made language choices (particularly the use of an older style of English) that are generally more consistent with this style of fantasy e.g. [MT] “Do not take offence” vs. [HT] “Don’t be cross”. |
| Excerpt | Kokun: The Girl from the West | HT | HT had no formatting issues that I noticed, for one, and also had a richness/uniqueness to it that pulled me in. The dialogue flowed well and, while complicated at times, is not unusual for an epic fantasy book of this nature. |
| Chunk | Sisters in Yellow, chunk 4 | MT | I much preferred “bento containers” over “plastic containers” as it not only falls in line with the Japanese culture, it also doesn’t sound cheap. |
| Chunk | The Empusium, chunk 18 | MT | The older-style language of MT better matches the period the story is set in. HT is a little too modern, using words like “glasses” instead of “spectacles” and “frames” instead of “rims.” |
| Chunk | The Witcher: Crossroads of Ravens, chunk 14 | MT | I preferred the chief digger’s dialogue in MT, it seemed to fit his character better. It also contrasted with the style of Preston Holt better, while in HT both characters had more similar dialogue patterns. |
| Chunk | My Name Is Stramer, chunk 10 | MT | I could imagine the stories better in MT with more vivid language and I liked the phrase “windmill his arms” which made the wording come alive. |
| Chunk | Mona’s Eyes, chunk 21 | MT | The dialogue in both feels clumsy in parts, especially the way Mona speaks, but I’m guessing that might just be how the original book was written. |
| Chunk | Kokun: The Girl from the West, chunk 20 | HT | A lot of the sentences were far too long, and this, combined with word choice, made the paragraphs difficult to follow (this could’ve just been a poorly written original scene, though, and not necessarily poorly translated). |

### F. Topic modeling support

"This section describes the label-blind topic-model analysis used to validate the human inductive coding."

Model-assisted inductive coding.

- GPT-5.4 used as a topic model.
- Pool: 922 comments from open questions about translation quality (i-Q5, i-Q6, co-Q4, ch-Q3). 7 excluded because they do not express an opinion about translation quality. 915 remain.
- 30 AI-detection explanations from co-Q7 analyzed separately.
- The model gets comments and the question, "but no manual annotations or codebooks". It assigns each comment to "one, none or more topics, and a short description".
- "The exact prompts and run settings are available in our GitHub repository (analysis/human_eval)."

Topic inventory selection.

- Label discovery repeated ten times per inventory. Topics matched across runs by best-match Jaccard similarity, "Without consulting the manual labels".
- The run most similar on average to the other nine was selected: 24 translation-quality topics and 15 AI-detection-rationale topics (mean Jaccard 0.568 and 0.687).
- GPT-5.4 then assigned topics to every comment three times. Topic membership similarity: mean Jaccard 0.653 (translation quality) and 0.827 (AI detection). Per-comment topic sets: 0.746 and 0.814. Final assignments keep topics found in at least two runs.
- Comparison with the human schemas (29 translation-quality labels, 10 AI-detection labels) "provides schema-level validation, not annotator agreement."

Table 35. Caption, verbatim: "Table 35: GPT-5.4-generated candidate topics for translation-quality comments (i-Q5, i-Q6, co-Q4, and ch-Q3) and AI-detection explanations (co-Q7). N is the number of comments assigned to the topic by majority vote across three runs. Stab. is the mean pairwise Jaccard similarity of the topic’s comment membership across those runs. Complete topic definitions and evidence phrases are available in the GitHub repository."

Translation quality:

| Count | N | Stab. | GPT-5.4-generated topic |
|---|---|---|---|
| 1 | 361 | 0.78 | Word choice and diction fit |
| 2 | 226 | 0.67 | Clarity and ease of understanding |
| 3 | 210 | 0.75 | Flow and readability |
| 4 | 172 | 0.69 | Sentence structure and rhythm |
| 5 | 170 | 0.66 | Naturalness and idiomatic English |
| 6 | 114 | 0.60 | Meaning accuracy |
| 7 | 98 | 0.59 | Dialogue authenticity |
| 8 | 97 | 0.73 | Verbosity and concision |
| 9 | 92 | 0.67 | Grammar and surface mechanics |
| 10 | 76 | 0.68 | Imagery and descriptive vividness |
| 11 | 65 | 0.51 | Literary richness and atmosphere |
| 12 | 57 | 0.66 | Formatting and presentation |
| 13 | 53 | 0.73 | Cultural and contextual mediation |
| 14 | 53 | 0.81 | Engagement and immersion |
| 15 | 51 | 0.79 | Machine-like or translationese feel |
| 16 | 47 | 0.74 | Character voice and viewpoint fit |
| 17 | 44 | 0.56 | Coherence, transitions, and organization |
| 18 | 42 | 0.57 | Emotional resonance and nuance |
| 19 | 40 | 0.72 | Literalness versus adaptation |
| 20 | 37 | 0.73 | Genre, setting, and period appropriateness |
| 21 | 35 | 0.47 | Tense and grammatical perspective consistency |
| 22 | 29 | 0.61 | Referent and pronoun clarity |
| 23 | 28 | 0.64 | Consistency of recurring terms and details |
| 24 | 25 | 0.34 | Register, tone, and stylistic fit |

AI detection:

| Count | N | Stab. | GPT-5.4-generated topic |
|---|---|---|---|
| 1 | 10 | 0.65 | Lexical fit |
| 2 | 9 | 0.74 | Source-text literalness |
| 3 | 9 | 0.93 | Sentence and paragraph flow |
| 4 | 9 | 0.86 | Punctuation and dialogue formatting |
| 5 | 9 | 0.70 | Semantic and contextual resolution |
| 6 | 6 | 1.00 | Register and diction level |
| 7 | 5 | 0.64 | Sentence-level correctness |
| 8 | 5 | 0.77 | Emotional and tonal conveyance |
| 9 | 4 | 0.72 | Adaptive rephrasing and localization |
| 10 | 4 | 1.00 | Lexical richness and specificity |
| 11 | 3 | 1.00 | Information density and verbal economy |
| 12 | 3 | 0.78 | Variety and register consistency |
| 13 | 3 | 0.83 | Formatting artifact handling |
| 14 | 3 | 0.78 | Voice differentiation |
| 15 | 2 | 1.00 | Terminology and naming consistency |

### G. Exploratory multilingual case study

MT identification.

- Readers reliably identified MT for Polish (two raters), Spanish, and Japanese in the final excerpt-level comparison. The French reader was incorrect (Figure 28).
- The Spanish reader was first incorrect in single reading (identified MT as HT, Figure 27) but distinguished both in comparison. Verbatim: "suggesting that perhaps the quality of translation into French and Spanish was higher than into Polish and Japanese."

Figure captions, verbatim:

- "Figure 27: Multilingual case-study identification outcomes. Single-reading results for HT/MT identification in the multilingual case study; darker shades indicate higher confidence."
- "Figure 28: More likely AI-translated choices in the comparative questionnaire. After both readings, readers chose which version seemed more likely AI-translated. Orange bars show incorrect HT choices; green bars show correct MT choices, with darker shades indicating higher confidence."
- "Figure 29: Close-reading chunk-level preferred translation by source language. Each pair of bars shows HT and MT preference shares within a source language; stacked segments show preference strength, and labels report counts and percentages."
- "Figure 30: Chunk-level preferred translation in the multilingual target-language case study. Each row shows one excerpt-reader pair; green indicates HT preference, purple indicates MT preference, and darker shades indicate stronger preference."

Span annotations: across target languages, readers marked mostly positive evidence in HT and mostly negative evidence in MT (Figure 16). Median span lengths show "how localized these judgments were" (Figure 15).

### H. Statistical analysis

- All analyses in R: lme4 (mixed-effects models), lmerTest (inference in linear mixed models), emmeans (order-adjusted marginal means and contrasts), ordinal (cumulative-link models).
- Binary preferences: logistic GLMMs, HT = 1, MT = 0, random intercepts for reader and book when estimable.
- Dialogue and word choice: three levels coded HT = +1, no difference = 0, MT = −1. Crossed mixed models were singular, so order-adjusted fixed-effect linear models are reported.
- Preference strength: signed numeric scores, HT positive, MT negative, larger absolute value = stronger. Linear mixed models when estimable.
- Single-reading ratings: cumulative-link mixed models with random intercepts for reader and book when estimable. By-book and by-reader random slopes for type also tested. Worst-case p across six specifications: .043 acceptability, .018 smoothness, .199 immersion, .307 willingness to continue. Acceptability and smoothness stay significant. Immersion and continue stay non-significant.
- AI detection: binary correctness. Single reading: MT correct when labeled machine-translated, HT correct when labeled human-translated. Logistic GLMMs with random intercepts when estimable. Direct comparison: crossed model singular, so intercept-only logistic model and exact binomial test against chance. Confidence: linear mixed models, restricted to correct guesses when testing the confidence increase.
- Highlight counts: negative-binomial mixed-effects count models, "appropriate for count data when the variance is larger than expected under a simple Poisson model".
- Random effects, verbatim: "Across mixed-effects analyses, we include random intercepts for reader and book whenever estimable (i.e., does not result in a singular fit). If a mixed-effects model is singular, meaning that one or more random-effect variances are estimated as zero or near-zero, we report the corresponding simpler model."

Table 36. Caption, verbatim: "Table 36: Statistical analyses for HT-vs-MT preferences and excerpt-level attribute preferences. Counts are HT/MT for binary and strength analyses, and HT/MT/no-difference for dialogue and word_choice. Binary models code HT as 1 and MT as 0. Strength and attribute models use signed scores, with HT coded positive and MT coded negative. Excerpt-level mixed-effects models were singular, so simpler order-adjusted fixed-effect models are reported for excerpt outcomes; chunk-level models include random intercepts for reader and book. Effects are order-adjusted; brackets give 95% confidence intervals."

| Analysis and model | Counts | Outcome coding | Effect size [95% CI] | p | Order p |
|---|---|---|---|---|---|
| excerpt_preference `glm(prefer_HT ~ order, family = binomial, data = excerpt)` | 19/11 | prefer_HT: HT=1, MT=0 | HT probability = 63.4%; OR = 1.73 [0.82, 3.65] | .148 | .705 |
| chunk_preference `glmer(prefer_HT ~ order + (1\|reader) + (1\|book), family = binomial, data = chunks)` | 522/250 | prefer_HT: HT=1, MT=0 | HT probability = 76.2%; OR = 3.20 [1.31, 7.82] | .011 | .536 |
| chunk_preference (primary) `glmer(prefer_HT ~ order + (1\|reader) + (1\|book) + (1\|reader:book), family = binomial, data = chunks)` | 522/250 | prefer_HT: HT=1, MT=0 | OR = 3.28 [1.41, 7.59] | .0056 | .327 |
| excerpt_strength `lm(signed_strength ~ order, data = excerpt)` | 19/11 | signed score: HT positive, MT negative; max \|·\|=2 | signed mean = 0.57 [-0.10, 1.23] | .092 | .612 |
| chunk_strength `lmer(signed_strength ~ order + (1\|reader) + (1\|book), data = chunks)` | 522/250 | signed score: HT positive, MT negative; max \|·\|=3 | signed mean = 0.91 [0.24, 1.58] | .010 | .176 |
| dialogue `lm(signed_attribute ~ order, data = excerpt)` | 17/9/4 | signed score: HT=1, no difference=0, MT=-1 | signed mean = 0.27 | .109 | .109 |
| word_choice `lm(signed_attribute ~ order, data = excerpt)` | 18/10/2 | signed score: HT=1, no difference=0, MT=-1 | signed mean = 0.27 | .131 | .253 |

Table 37. Caption, verbatim: "Table 37: Chunk-level highlight count statistical analysis. Positive and negative evidence spans were modeled separately with negative-binomial mixed-effects count models with random intercepts for reader and book. Rate ratios compare HT to MT; values above 1 indicate more spans on HT, and values below 1 indicate fewer spans on HT."

| Analysis and model | HT count | MT count | Effect size [95% CI] | p | Order p |
|---|---|---|---|---|---|
| positive_spans `glmer.nb(count ~ version + order + (1\|reader) + (1\|book), data = highlights)` | 2099 | 1260 | HT/MT rate ratio = 1.69 [1.55, 1.85] | <.001 | .596 |
| negative_spans `glmer.nb(count ~ version + order + (1\|reader) + (1\|book), data = highlights)` | 1147 | 2728 | HT/MT rate ratio = 0.43 [0.39, 0.48] | <.001 | .052 |

[aki-execute note] Table 37 counts 2099 + 1260 + 1147 + 2728 = 7,234 spans. The abstract states 7.2K span-level annotations.

Table 38. Caption, verbatim: "Table 38: Cumulative-link model results for single-reading 5-point ratings (n=60 per response, 30 HT and 30 MT). HT is the reference for type; odds ratios below 1 for typeMT indicate lower odds of a higher rating for MT than HT. HT advantage reports the inverse odds ratio for translation effects only."

| Response and model | Predictor | Estimate | SE | z | p | OR [95% CI] | HT advantage |
|---|---|---|---|---|---|---|---|
| acceptability `clmm(q1 ~ type + order + (1\|reader) + (1\|book), data = model_data, link = "logit")` | typeMT | -1.38 | 0.51 | -2.70 | .0069 | 0.25 [0.09, 0.68] | 4.0× odds |
| | orderMT-first | 0.41 | 0.49 | 0.85 | .3978 | 1.51 [0.58, 3.90] | – |
| smoothness `clm(q2 ~ type + order, data = model_data, link = "logit")` | typeMT | -1.49 | 0.50 | -2.98 | .0029 | 0.23 [0.08, 0.59] | 4.3× odds |
| | orderMT-first | 0.30 | 0.48 | 0.63 | .5279 | 1.36 [0.53, 3.51] | – |
| immersion `clm(q3 ~ type + order, data = model_data, link = "logit")` | typeMT | -0.83 | 0.48 | -1.74 | .0815 | 0.44 [0.17, 1.10] | 2.3× odds |
| | orderMT-first | 0.27 | 0.47 | 0.56 | .5724 | 1.30 [0.52, 3.30] | – |
| continue_reading `clmm(q4 ~ type + order + (1\|reader) + (1\|book), data = model_data, link = "logit")` | typeMT | -0.79 | 0.50 | -1.58 | .1150 | 0.45 [0.17, 1.21] | 2.2× odds |
| | orderMT-first | 0.07 | 0.49 | 0.14 | .8860 | 1.07 [0.41, 2.79] | – |

Table 39. Caption, verbatim: "Table 39: Sensitivity of the translation-type effect to random-effects structure (cumulative-link models; slopes on book (b) or reader (r), with 0 marking zero-correlation variants). All slope-bearing fits are at the boundary (intercept-slope correlation =−1); fixed effects are reported at face value following the reduction protocol of barr2013random. For smoothness, the reader-slope fit reduces to the fallback model. †Saturated maximal model (60 random effects for 60 observations)."

p for typeMT by random-effects specification:

| Response | primary | +b slope | +r slope | +b slope0 | +r slope0 | maximal† |
|---|---|---|---|---|---|---|
| Acceptability | .0069 | .0382 | .0139 | .0154 | .0121 | .0428 |
| Smoothness | .0029 | .0180 | .0029 | .0044 | .0029 | .0180 |
| Immersion | .0815 | .1196 | .1461 | .1076 | .1279 | .1988 |
| Continue reading | .1150 | .1883 | .2764 | .1732 | .2726 | .3072 |

Table 40. Caption, verbatim: "Table 40: Statistical analysis for AI detection. In single reading, a correct response means labeling an MT excerpt as machine-translated or an HT excerpt as human-translated. In direct comparison, a correct response means selecting the actual MT version as more likely AI-translated. The requested direct-comparison crossed mixed-effects model was singular, so the intercept-only logistic model is reported; the exact binomial test is included because the comparison is against chance."

| Analysis | Model | Data | Effect | Model p | Exact p |
|---|---|---|---|---|---|
| Single-reading origin accuracy | `glmer(correct ~ 1 + (1\|person_id) + (1\|book_id), family = binomial)` | 34/60 correct | accuracy = 58.3% | .413 | .366 |
| Single-reading HT vs. MT accuracy | `glmer(correct ~ version + (1\|person_id) + (1\|book_id), family = binomial)` | MT: 16/30; HT: 18/30 | no version difference | .557 | – |
| Direct-comparison origin accuracy | `glm(correct ~ 1, family = binomial)` | 17/30 correct | accuracy = 56.7% | .467 | .585 |
| Correct-guess confidence | `lmer(confidence ~ stage + (1\|person_id) + (1\|book_id))` | 51 correct guesses | comparison–single = 0.40 | .129 | – |

### I. Automatic metrics preferences

Paragraph-level alignment, verbatim:

> Because several automatic metrics are constrained by context-window size, we evaluate the translations on shorter aligned paragraph units rather than complete 8K-word excerpts or even 300-word chunks. We follow the par3 alignment procedure thai-etal-2022-exploring. For each excerpt, source paragraphs are paired with paragraph-level Microsoft Translate output, which serves as an English pivot. Each candidate English version, including professional HT and each MT system output, is sentence-aligned to this pivot. The candidate sentences aligned to each pivot paragraph are then grouped under the original source paragraph boundaries. After alignment, we compute diagnostics for each recovered paragraph pair and manually inspect flagged cases. We flag a length issue when the larger paragraph is more than three times longer than the smaller paragraph, ignoring pairs where both sides are shorter than 10 characters. We also flag lexical-overlap issues when a candidate paragraph has a pairwise BLEU score below 1.5, against a majority of the other MT outputs aligned to the same source paragraph. We employ these heuristics to filter misaligned paragraphs.

Paragraph-level metrics.

- Two families: COMET and MetricX. Reference-based: COMET-22 and MetricX, with professional HT as reference. Reference-free: COMETKiwi and MetricX-QE (source and candidate only).
- COMET higher is better. MetricX lower is better.
- Input limits: 512 tokens for COMET, 1,536 tokens for MetricX. Reference-based budget includes source, candidate, and reference. Reference-free budget includes source and candidate.
- Paragraph pairs over the limit are skipped for that metric. Reference-based metrics are not reported for the HT row. Per book and system: mean of remaining paragraph scores.

Chunk-level comparison with human judgments.

- Same approximately 300-word aligned chunks as close reading. HT and P3 MT chunks scored directly with MetricX-QE and with LiTransProQA (Gemini 3.1 Pro as judge).
- Paragraph-level COMETKiwi and MetricX-QE mapped onto chunks: paragraph source text matched to chunk source text in order, paragraph scores averaged per chunk. When both HT and MT have paragraph scores, averages use the shared paragraph indices "so that the two systems are compared on the same source material".
- Oriented HT–MT delta: positive favors HT, negative favors P3 MT. Results: Table 4.

Table 41. Caption, verbatim: "Table 41: Paragraph-level automatic evaluation results on the full par3 development and evaluation corpus. Rows are sorted by MetricX-QE, ascending. Row colors distinguish P1, P2, P3, and HT systems. Scores are unweighted means over book-level system scores across both splits. Higher is better for COMET-22 and COMETKiwi; lower is better for MetricX and MetricX-QE. Bold indicates the best MetricX-QE score. The Human eval. column marks systems used in the human evaluation. Missing HT reference-based scores are shown as “–”."

| Model | Pipeline | Human eval. | COMET-22 ↑ | COMETKiwi ↑ | MetricX ↓ | MetricX-QE ↓ |
|---|---|---|---|---|---|---|
| Gemini | P2 | | 0.805 | 0.773 | 5.182 | 4.758 |
| Gemini | P1 | | 0.804 | 0.772 | 5.243 | 4.813 |
| GPT-5.4 | P2 | | 0.800 | 0.768 | 5.482 | 5.020 |
| GPT-5.4 | P1 | | 0.798 | 0.766 | 5.542 | 5.073 |
| Agents | P3 | | 0.793 | 0.766 | 5.656 | 5.109 |
| HT | – | | – | 0.726 | – | 5.726 |

[aki-execute note] The "Human eval." column marks are symbols that the text conversion drops. Which rows carry a mark is Not verified from text. The main text states that P3 and HT were used in the human evaluation.

## 9. Repository and released data (fetched 2026-10-07)

This section records the repository state at fetch time. It is not part of the paper.

- Repository: https://github.com/Yves575/lait. Description: "Reader-centered evaluation dataset and tools for comparing human and AI literary translation." Language: Python. Stars: 4. Homepage field: empty. Size field: 30069.
- Last five commits on `main`: `e960dc2` 2026-09-01 (merge of PR #2 "camera-ready"), `2c295c8` 2026-08-28 ("Move supplementary_materials to paper_supplement to fit previous structure"), `6ad91a4` 2026-08-27 ("Ignore agent skills"), `9415c71` 2026-08-27 ("Convert latex prompts from paper into markdown in supplementary materials"), `3ec51a3` 2026-08-25 ("Move guidelines and interface screenshots from paper appendix to repo").
- Top level: `.env.example`, `.gitignore`, `LICENSE`, `LiTransProQA/`, `README.md`, `START_HERE.md`, `agents_pipeline/`, `analysis/`, `api_model.py`, `apply_evaluation.py`, `book.py`, `book_stats/`, `books/`, `convert_latex_prompt_to_markdown.py`, `docs/`, `eval_pipeline.py`, `human_eval/`, `lait.png`, `lait_white.png`, `metricx/`, `mt_eval.py`, `mt_pipeline.py`, `par3/`, `prompt.py`, `prompts/`, `pytest.ini`, `requirements.txt`, `results_all_metrics/`, `results_chunk_review_eval/`, `results_mapped_metrics/`, `run.sh`, `scripts/`, `statistical/`, `tests/`.
- README, public outputs: P1 (`books/MT/pipeline1/`), P2 (`books/MT/pipeline2/`), P3 (`books/MT/pipeline3/`, "including the appendix multilingual target-language examples under `extern/`").
- README, data policy, verbatim list. Included on GitHub: "P1/P2/P3 MT outputs under `books/MT/`.", "Aggregate metrics, tables, and derived analysis outputs.", "Code, prompts, configs, tests, and documentation." Withheld from GitHub: "Source-language texts.", "Human translations.", "Raw source/HT chunk-review inputs.", "Run workspaces that contain source chunks.", "Raw human-evaluation exports and internal study dumps.", "Row-level participant comments, annotation exports, and disagreement viewers."
- Controlled access: source texts and HT come through "a gated Hugging Face dataset, `<HUGGING_FACE_DATASET_URL>`, that requires users to agree to access terms". Files: `hf_dataset/lait_books_data.jsonl` and `hf_dataset/lait_restoration_data.jsonl`. Restore with `python3 scripts/restore_controlled_access_data.py --apply`. `docs/DATA_ACCESS.md`: "Researchers who need source texts or human translations should email the authors with a short description of the intended research use."
- `docs/release/WITHHELD_FILES.md`: "Total withheld files: 8,066". It lists 28 reasons with counts.
- `human_eval/README.md`: includes `figures/`, `analysis_outputs/`, `comments_word_token_stats/`, and three R scripts. "Not included: Raw study exports. Participant-level annotation exports. Row-level comments and text snippets."
- Licence, README verbatim: "Repository code and documentation are released under the MIT License unless a file or subdirectory states a different license. Third-party components retain their own licenses, including `par3/`, `metricx/`, and `LiTransProQA/`."
- http://lait.cs.sfu.ca/: the fetch timed out. Its content is Not verified.

## 10. Discrepancies and Not verified

- Author-to-affiliation mapping: Not verified (marks lost in text conversion).
- v1 content and the v1 to v2 diff: Not verified.
- The PDF reference list (pages 15 to 18): not reproduced.
- Figure content beyond captions and PDF text labels (Figures 4 to 9, 11 to 30): Not verified, because the figures are images.
- Payment: $110 per book (section 2.2, ethics) against $110 "for the entire task (part 1 and part 2)" (consent form, Table 13).
- Close-reading unlock: "unlocked after 24h" (section 2.2), "a few days later" (consent form), "after 20h" (repository guidelines).
- Single-reading Q1 wording: Table 16 against the screenshot `01_Single_Questionnaire_FULL_SCREEN.png`.
- Translator name: "Bill Johnson" (Table 3) against "Bill Johnston" (Table 5).
- SRC token statistics: Table 1 against Table 6.
- Sentences per excerpt: footnote 5 (543, SD 72) against Table 1 (HT 547, SD 74).
- Pipeline-selection raters: footnote 7 against Appendix B.
- Release scope: the paper says "release our guidelines and annotation software" and "The coded comments are released in the repository". The public repository holds guidelines and screenshots, but no interface source code, and it withholds row-level comments and annotation exports.
- Dataset location: the README gives a placeholder Hugging Face URL. A public dataset URL is Not verified.

## Notes for the Viewer [aki-execute note, agent inference]

These notes are reference and adoption ideas only. They do not compare LAIT with the Viewer.

- All types of viewing: LAIT uses two reading modes, single-version full reading ("seeing only that version") and side-by-side chunk reading (section 2.2, Table 18). This maps to the Viewer single-language and bilingual views. LAIT never shows the source text to readers, so it gives no pattern for a raw-data or source view.
- Reader-chosen components: the LAIT reading screen exposes font size, screen width ("Narrower", "Wider"), a dark theme, and a pause button (screenshot 03, Guidelines steps 3 and 5). These controls are a small, concrete set to adopt as reader settings.
- Movable panels: the comparison screen splits questions and the two translations with a drag handle and a "Hide questions" button, and each translation pane scrolls on its own (screenshot 02). This is a reference for movable and hideable panels.
- Aligned chunks for bilingual view: LAIT aligns about 300-word chunks on paragraph boundaries across source, HT, and MT, with manual checks of every alignment (section 2.1 "Chunking", Appendix B P2). The Viewer can adopt paragraph-bounded alignment units for side-by-side pages.
- Report a problem: the LAIT span highlight works as "Select text, then choose a label in the popover. Click an existing highlight to remove it.", with a per-side highlight list (Table 18, Guidelines page 11). This is a reference for a select-text report path that logs the span.
- Span offsets: LAIT records highlight offsets on the normalized display text, not the source files (Appendix D "Display normalization"). If the Viewer logs reported spans, the Viewer must decide which text representation the offsets refer to.
- Kendo term pop-ups: LAIT has no glossary pop-up. Its comment schema has A7 "Cultural adaptation" (glossing terms versus keeping foreign terms) and A12 "Untranslated content" (Table 23). These codes can label reader reports about kendo terms.
- Research layer for translator and admin roles: the 29-code quality schema (Table 23), the 10-code MT-cue schema (Table 24), and the per-chunk preference with difficulty (Table 18) are ready-made label sets for a research view next to the `QA_3` verdict and level versions.
- AI label per work and per page: LAIT readers could not reliably tell MT from HT (17/30) and preferred the version they believed human in 28 of 30 comparisons (section 3.3). The ethics statement names "full disclosure" to "help readers make informed choices". This supports a visible AI label at work and page level.
- Free-text quality gates: the LAIT forms enforce minimum lengths ("0 / 50 characters minimum", "0 / 100 characters minimum") and a passphrase check of the guidelines (screenshots 01 to 03, section 2.2 "Quality control"). The Viewer report path can adopt a minimum description length if reports need detail.
