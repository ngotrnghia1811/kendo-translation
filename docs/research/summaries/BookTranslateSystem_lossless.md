# BookTranslate.ai "The System": lossless summary

- Title: "The System: A Transparent Look at Our Multi-Agent AI Translation Process" (HTML `<title>`). The Open Graph and Twitter title reads "Inside the System: How BookTranslate.ai Engineers a Perfect Translation". The page heading (h1) reads "This is Not a Black Box."
- Publisher or author: publisher "BookTranslate.ai" (`<meta name="publisher">`). Author "Balint Taborski" (`<meta name="author">`, with `<link rel="author" href="https://tabor.ski">`). The site-wide JSON-LD names the founder "Bálint Taborszki". The two spellings differ in the fetched HTML.
- Identifier and version: canonical URL https://www.booktranslate.ai/system. Next.js build ID `O9SunzS76QjAJ9nLrBEy_` (from the page payload). HTTP ETag `"678a451697d522772e549bdb899bd3cb"`. The page carries no version or revision number.
- Date: published date Not verified. Last-edited date Not verified. The HTML has no `datePublished`, `dateModified`, or `article:published_time` field. The HTTP response at 14:15 local time had no `Last-Modified` header. It had `age: 346326` (Vercel cache age in seconds, about 4 days), which is a cache fact and not a publication date. The footer reads "© 2026 BookTranslate.ai. All rights reserved."
- Venue: BookTranslate.ai website (`og:site_name`). `<meta name="category">` reads "Technology Showcase". `og:type` is "article".
- Licence or terms: "© 2026 BookTranslate.ai. All rights reserved." The footer links to "Terms of Service" (`/terms`), "Privacy Policy" (`/privacy`), and "Cookie Policy" (`/cookie-policy`). This unit did not fetch those pages.
- URL fetched: https://www.booktranslate.ai/system (HTTP 200, 599,201 bytes, `curl -L --fail --max-time 60`, default user agent). A header-only request (`curl -I`) to the same URL returned HTTP 200.
- Date fetched: 2026-10-07, 14:12 local time.
- Word count: this file, 427 lines and 5,423 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:21). Source text file `booktranslate-ai-system.rsc-extract.full.txt`: 537 lines and 4,179 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:14). The `textutil` text file `booktranslate-ai-system.full.txt`: 25 lines and 42 words, because the server HTML holds only the footer as text.
- Domain note: a marketing and showcase page of a commercial AI book translation service. The case study is Osamu Dazai's 1940 short story "Run, Melos!" (走れメロス), Japanese to English (US). The page shows Japanese source lines, English drafts, agent feedback, and votes by three named LLMs.
- Source of this summary: full copy. The page body is not in the HTML markup. It sits in the Next.js App Router payload (`self.__next_f.push` blocks, 45 blocks, no `__NEXT_DATA__` block). aki-execute decoded the payload with a Python script and walked the React Server Components tree in document order. The result is `<V2>/docs/research/sources/booktranslate-ai-system.rsc-extract.full.txt`. The raw HTML is `<V2>/docs/research/sources/booktranslate-ai-system.full.html`. `<V2>` is `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer`. Lines 1 to 95 of the extract hold script settings, a 404 template, and the site footer. Lines 97 to 535 hold the page body. The earlier excerpt `booktranslate-ai-system.md` (aki-research, webfetch) matches the extract in every quoted line, but it omits the Naturalizer, Publicist, and Propagandist rows and most stages.
- Code and data: the page names no code repository. It links the full case study as "Explore the Full "Run, Melos!" Project" to `/public-translations/j0uk3outq5jagdgvphhhf9he` (opens in a new tab). The call to action "Translate Your Book" links to `/upload`. This unit did not fetch either link.
- Version note: the payload holds one page state. No earlier version was compared.

## 1. Page metadata text

`<meta name="description">`, verbatim:

> Go under the hood of BookTranslate.ai. See verbatim outputs from our multi-agent system—from the 'Translation Blueprint' by the Preprocessor to the final vote of the AI Editorial Council. This isn't a summary; it's a complete dissection of how we engineer legacy-grade literary translations.

`<meta name="abstract">`, verbatim:

> A detailed, transparent walkthrough of BookTranslate.ai's proprietary multi-agent translation system. This page provides verbatim examples from a real case study ('Run, Melos!') to demonstrate each stage of the process, including the Preprocessor's literary analysis, the 5-pass refinement engine, the self-critique loop of the Finalizer, the AI Council's voting mechanism, the Threadweaver's coherence checks, and the Publicist's marketing output.

`og:description` and `twitter:description`, verbatim:

> Forget black boxes. See the step-by-step, multi-agent process that creates our legacy-grade literary translations, from the initial blueprint to the final AI Council vote. This is our Glass Cockpit.

Image: `og:image` `https://www.booktranslate.ai/og-image.png` (1200 x 630), alt text "BookTranslate.ai – AI-Powered Full Book Translation". The page body has no image other than the site logo (alt text "Logo", light and dark variants).

## 2. Hero

Heading (h1): "This is Not a Black Box."

Subheading (h2), verbatim:

> A transparent look at the multi-agent architecture that powers BookTranslate.ai - see exactly how we turn a manuscript into a world-class translation, with every decision clear and every step explained.

Intro, verbatim:

> To demonstrate the power and transparency of our system, we documented the complete journey of Osamu Dazai's classic 1940 short story, "Run, Melos!". What follows are verbatim artifacts generated by the system at each stage.

The title "Run, Melos!" in this sentence links to `/public-translations/j0uk3outq5jagdgvphhhf9he`.

## 3. Who Does What: AI Agents vs. a Real Publishing House

Intro, verbatim:

> Our agents perform the distinct roles of an entire editorial team. This isn’t a metaphor: Every stage of the process has its own specialist AI. Each role is explicit, and each output gets challenged before anything goes forward.

Agent table, verbatim (nine rows):

| AI Agent | Publishing House Role | What They Do |
|---|---|---|
| Book Analyzer | Editorial Director | Reads the manuscript, sets the style guide & project blueprint. |
| Translator | Primary Translator | Does the main heavy lifting: translates the book. |
| Proofreader | Proofreader / Line Editor | Cleans up grammar, typos, and awkward sentences. |
| Finalizer | Senior Editor | Double-checks for deeper errors and fidelity to the original. |
| Naturalizer | Stylist / Voice Editor | Polishes style, idiom, and tone for smooth, literary reading. |
| Threadweaver | Continuity Editor | Tracks key terms & themes for long-range consistency. |
| Council | Editorial Board | Votes on changes and settles any disputes. |
| Publicist | Marketing Director | Crafts your book’s launch campaign and brand. |
| Propagandist | Social Media Manager | Generates persona-targeted posts and ad copy. |

[aki-execute note] The table says "Book Analyzer". Stage 1 calls the same role "The Preprocessor".

## 4. Stage 1: The Architect

Intro, verbatim:

> Every masterpiece begins with a blueprint. The Preprocessor reads your entire manuscript first to create a bespoke 'Translation Blueprint' that becomes the guiding intelligence for the entire project.

### 4.1 Verbatim Blueprint for "Run, Melos!"

Block "Global Guidance & Thematic Core", verbatim:

> - Overall Tone & Atmosphere: The narrative carries an urgent, dramatic, and ultimately uplifting tone. It begins with righteous fury, builds through suspense and despair, and culminates in a powerful affirmation of human trust and loyalty. The atmosphere should feel somewhat legendary and heightened, reflecting the story's classical origins. Maintain a sense of high stakes throughout Melos's ordeal in the English (US) translation.
> - Thematic Core - Trust: The central theme is '信実' (shinjitsu - trust, faith, sincerity). The English (US) translation must consistently convey the profound importance of this concept, ensuring that Melos's struggle and eventual triumph serve as a powerful testament to the strength of trust in the face of cynicism and despair. Key interactions, especially Melos's internal monologue about trust and the king's final realization, should reflect this thematic weight.
> - Narrative Voice: While third-person, the narrative frequently delves into Melos's internal perspective, especially during his trials. The English (US) translation should capture this intimacy with Melos's thoughts and emotions, making his internal conflicts palpable to the reader. The language should reflect the story's somewhat classical, fable-like quality, avoiding overly modern colloquialisms unless specifically used by a character in a contrasting way.

Block "Authorial Stylistic Fingerprint" (an accordion item on the page), verbatim:

> - Trait 1: Dramatic Escalation and Repetition. Dazai often uses repetition of key phrases or actions to build emotional intensity and emphasize core motivations, particularly during moments of crisis or resolve (e.g., '走れ！メロス' - Run! Melos; '私は信頼されている' - I am trusted).
>   - How-to for Translator: Replicate this repetition in English (US) where it serves to heighten drama or reinforce a key idea, ensuring it sounds natural and impactful rather than merely redundant. Use strong, active verbs to maintain the original's driving force.
> - Trait 2: Vivid Internal Monologue for Emotional Climax. The story heavily relies on Melos's internal monologues to convey his deepest struggles, especially the pivotal moment of despair and subsequent resurgence of hope ([PARAGRAPH 46-47]). These sections are characterized by fluctuating emotions, self-reproach, and eventual reaffirmation.
>   - How-to for Translator: Translate these internal monologues with a keen focus on capturing the full emotional arc. Use varied sentence structures and vocabulary in English (US) that reflect Melos's shifting psychological state – from broken despair to fervent resolve – ensuring the raw honesty of his internal debate is conveyed.
> - Trait 3: Economical yet Powerful Dialogue. Character dialogue is often brief but laden with meaning and emotional weight, quickly establishing character and conflict (e.g., the initial terse exchanges with the King, Selinuntius's reported faith).
>   - How-to for Translator: Strive for concise, impactful English (US) dialogue that retains the directness and underlying significance of the original. Pay attention to how characters address each other to convey status and relationship dynamics appropriately.

## 5. Stage 2: The Forge & The Feedback Loop

Intro, verbatim:

> A cheap translation is a single, brute-force pass. Our system forges the text through a symphony of refinements where AI agents iteratively sculpt, polish, and—most importantly—critique each other's work.

### 5.1 The Foundation: The 5-Pass Engine

Five cards, verbatim:

| Pass | Name | Text |
|---|---|---|
| 1 | Foundational Translation | Guided by the Blueprint, the first pass lays a high-quality, context-aware foundation. |
| 2 | Aggressive Proofreading | A proofreader AI hunts for and corrects objective grammatical errors and awkward phrasing. |
| 3 | Rhythmic Refinement | A specialist AI focuses on improving the cadence, flow, and natural rhythm of the prose. |
| 4 | Conservative Polish | A more senior AI makes only subtle, high-impact tweaks to elevate the text to ~98% readiness. |
| 5 | Final Fidelity Check | A last, paranoid review against the source to catch any final, nuanced deviations. |

### 5.2 The Magic: How the Forge Critiques Itself

#### Pass 4: The Socratic Editor

Text, verbatim:

> In Pass 4, the system critiques itself. The Finalizer AI scans the previous pass and generates "Expert Feedback." The Pass 4 proofreader AI is then explicitly instructed to act as a Socratic editor, thoughtfully incorporating this feedback.

"Verbatim Finalizer Feedback:", verbatim:

> Issue Description:
> The phrase "then get lost" is an addition to the original 「置いて行け」 (oite ike - leave [them] and go). While it conveys a suitably aggressive tone for a bandit, it slightly expands on the "economical yet powerful dialogue" (Authorial Stylistic Fingerprint - Trait 3) of the original, which is simply "leave [them] and go." The addition makes the dialogue less terse and less direct than the original Japanese.
>
> Suggested Fix:
> Consider more direct alternatives like: "Not a chance! Drop everything you've got and go." or "Not a chance! Leave all your belongings and be off."

#### Pass 5: The Council of Gatekeepers

Text, verbatim:

> For the final pass, any significant change must survive a vote. The AI Council reviews proposed fixes. If a flaw is found, the system escalates to a "Supreme Rewriter" AI to achieve a definitive, high-fidelity solution.

Round 1, heading "Round 1: A Flawed Fix & The Council's Dissent", verbatim:

> The system attempted to fix the King's final speech but failed to fully capture the nuance of his humbling yet authoritative tone. The Council caught the error.

> Verdict: SPLIT DECISION (2-1 REJECT)

Votes, verbatim:

- Gemini 2.5 Pro:

  > No, fails on A1: the revision only partially addresses the initial issue. While 'You two' was implemented for the first 'omaera', subsequent instances of 'omaera' remain neutral... Furthermore, the issue of 'washi' being rendered with a neutral 'I', contributing to the softened character voice, was not addressed at all.

- Claude Sonnet 4:

  > The revision successfully addresses the initial issue by adding 'You two' to reflect the King's use of 'おまえら' (omaera), preserving his characteristic speech pattern while maintaining the humbled tone, without introducing any new critical faults.

- GPT-4.1:

  > No, fails on A1: the initial issue of capturing the King's authoritative tone with 'omaera' is not fully resolved; the added 'You two' lacks the necessary condescension or tone reflective of the King's character.

Round 2, heading "Round 2: The Supreme Rewrite & Unanimous Approval", verbatim:

> Based on the council's feedback, the system initiated a superior "Supreme Rewrite". This new version was then re-submitted to the council.

"Final, Council-Approved Text (Output of the Core Engine):", verbatim:

> "You two, your wish has been granted. You have conquered this old king's heart. Trust was never an empty delusion. Please, I beg you - let me join your fellowship. Hear an old man's plea, and allow me to become one of your company."

> Verdict: UNANIMOUSLY APPROVED

Votes, verbatim:

- Gemini 2.5 Pro:

  > Yes, the revision successfully addresses the King's characteristic speech (addressing 'omaera' with 'You two' and 'washi' with phrases like 'this old king's heart' and 'an old man's plea'), fulfilling the requirements of A1 and A2 without introducing new critical faults under B.

- Claude Sonnet 4:

  > The revision successfully addresses the initial issue by incorporating 'You two' to reflect 'omaera' and 'this old king's/an old man's' to capture the authoritative yet humbled tone of 'washi', maintaining the King's characteristic voice without introducing critical faults.

- GPT-4.1:

  > Yes, the revision addresses the initial issue by subtly incorporating the King's authoritative tone with 'You two' and 'this old king,' while maintaining narrative clarity and introducing no new critical faults.

[aki-execute note] The votes cite criteria codes A1, A2, B, and (in section 7) C6. The page does not define these codes.

## 6. Stage 3: The First Guardian

Text, verbatim:

> After the 5-pass engine, you can deploy the Finalizer: an expert AI Senior Editor that scans for subtle errors of fidelity.
>
> It doesn't just find typos; it identifies deep contextual mistakes, lost nuance, and violations of authorial voice. The Finalizer then provides a list of actionable suggestions. You can review each one, or you can trigger the "Auto-Apply" workflow - a sophisticated process where our AI Council votes on every single change behind the scenes to ensure it's a true improvement, not just a different mistake. This is your ultimate safeguard for fidelity.

### 6.1 Finalizer Feedback for "Run, Melos!"

Lead-in, verbatim:

> Here, the Finalizer identified a critical loss of visceral imagery, where "bit into his friend's feet" was weakened to "seized his friend's feet."

Feedback, verbatim:

> Issue Description:
> The verb 「齧りついた」(kajiritsuita) in the original Japanese text specifically means 'to bite into,' 'to sink one's teeth into,' or 'to cling to by biting.' This conveys a desperate, visceral, and almost primal action by Melos to physically stop his friend from being hoisted to his death. The translated phrase 'seized his friend's rising feet' uses the verb 'seized,' which is far too general and weak. It fails to capture the specific, vivid imagery and the raw intensity of Melos's original action. This results in a loss of the dramatic and physical impact of this crucial moment, diminishing the portrayal of Melos's extreme desperation.
>
> Suggested Fix:
> Change 'seized his friend's rising feet' to a phrase that conveys the act of biting, such as 'bit into his friend's rising feet,' 'sank his teeth into his friend's rising feet,' or 'desperately bit at his friend's rising feet.'

## 7. Stage 4: The Command Center

Text, verbatim:

> The Naturalizer acts as your personal AI stylist. It suggests improvements, but also explains the artistic trade-offs. The AI Council votes on these suggestions when you click on the "Submit to Council" button, ensuring only true enhancements are proposed.
>
> This stage does what ordinary machine translation and post-editing can’t: it lets you weigh every stylistic option, not just fix mistakes. The Naturalizer is where you decide what’s “good enough” and what’s actually excellent - for your taste, for your audience, and for the author’s voice. Nothing is hidden, nothing is automatic unless you want it to be.

Each of the three examples below has four parts: Original, Naturalizer's Suggestion, "AI's Trade-Off Analysis:", and an "AI Editorial Council Verdict:" with one vote each from Gemini 2.5 Pro, Claude Sonnet 4, and GPT-4.1.

### 7.1 Defending the Author's Voice

Lead-in, verbatim:

> Here, the Naturalizer proposed a good but conventional phrasing. The council unanimously rejected it, defending the author's unique and more powerful original voice.

- Original: "His face was deathly pale, and the furrow between his brows was etched like a deep scar."
- Naturalizer's Suggestion: "His face was deathly pale, and the crease between his brows was deep as a scar."
- AI's Trade-Off Analysis, verbatim:

  > The word 'furrow' in the original snippet, while less common, evokes an image of something plowed or dug out, which can be a more powerful and visceral metaphor for a deep-set wrinkle born of torment. 'Etched' also implies a deliberate, sharp process. The naturalized 'crease' is more conventional and less imagistically charged. The trade-off is between a slightly more unusual, powerful image and a more common, smoother description.

> AI Editorial Council Verdict: UNANIMOUSLY REJECTED

- Gemini 2.5 Pro:

  > Fails on C6 (Loss of Rhetorical Impact). The original's 'furrow...etched like a deep scar' has a more powerful, visceral imagery that is lost in the more common, less impactful 'crease...deep as a scar'.

- Claude Sonnet 4:

  > Fails on C6 (Loss of Tone). The revision flattens the original's powerful imagery by replacing 'furrow...etched like a deep scar' with the more conventional 'crease...deep as a scar,' losing the visceral metaphor of something 'plowed or dug out'.

- GPT-4.1:

  > Fails on C6 (Loss of Tone). The change from 'furrow... etched like a deep scar' to 'crease... deep as a scar' flattens the vivid and striking imagery of the original, losing the sense of something indelibly and painfully marked, which is key to Dazai's dramatic style.

[aki-execute note] Gemini labels C6 "Loss of Rhetorical Impact". The other two models label C6 "Loss of Tone".

### 7.2 Enhancing Natural Fluency

Lead-in, verbatim:

> The system's role isn't just to be a contrarian gatekeeper. Here, the Naturalizer identified a slightly formal, stiff phrase and proposed a more common, energetic idiom. The council unanimously approved the change, recognizing it as a clear improvement in natural fluency that enhanced the translation without betraying the original's intent.

- Original: "Melos departed without delay."
- Naturalizer's Suggestion: "Melos set off at once."
- AI's Trade-Off Analysis, verbatim:

  > 'Departed without delay' has a slightly more formal and stately tone than 'set off at once.' The latter is more common and perhaps more energetic. The trade-off is a subtle shift from a more formal, almost legendary tone to a more common, action-oriented one. 'Departed' can feel more significant or final than 'set off.'

> AI Editorial Council Verdict: UNANIMOUSLY APPROVED

- Gemini 2.5 Pro:

  > Yes, the revision successfully implements the suggested fix, changing "departed without delay" to the more idiomatic and urgent "set off at once," which aligns with the desired tone without introducing any new errors.

- Claude Sonnet 4:

  > The revision successfully implements the suggested fix by changing 'departed without delay' to 'set off at once,' creating a more natural and urgent expression of immediate departure without introducing any new critical faults.

- GPT-4.1:

  > Yes, the revision successfully replaces 'departed without delay' with 'set off at once,' yielding a more natural and urgent idiom that fits both the context and guidance, without introducing any new critical faults or altering the intended tone or meaning.

### 7.3 Weighing a Complex Trade-Off

Lead-in, verbatim:

> This showcases the system's most sophisticated capability: a nuanced debate. Here, the Naturalizer offered a more rhythmic sentence, but the council was divided. Some models prioritized the improved flow, while another argued that the change sacrificed the original's 'forceful' tone. This demonstrates that the system doesn't just make simple yes/no decisions; it weighs complex stylistic trade-offs, providing you with the full context of a genuine editorial debate.

- Original: "Further along, he met an old man and pressed his question more urgently."
- Naturalizer's Suggestion: "A little further on, he put his question to an old man, this time more urgently."
- AI's Trade-Off Analysis, verbatim:

  > The original phrasing 'pressed his question' is very direct and conveys a strong sense of insistence. The naturalized 'put his question... more urgently' is slightly more formal and less direct. The trade-off is a smoother, more rhythmic sentence for one that is slightly less forceful in its diction.

> AI Editorial Council Verdict: SPLIT DECISION (2-1 APPROVE)

- Gemini 2.5 Pro:

  > No. The revision, "put his question... more urgently," weakens the original's depiction of Melos's escalating frustration... It flattens the dramatic build-up from a simple question to a physical demand, making the change in tone less impactful. The original "pressed his question" better captures the intended increase in force.

- Claude Sonnet 4:

  > The revision successfully addresses the initial stylistic issue by changing 'Further along, he met an old man and pressed his question more urgently' to 'A little further on, he put his question to an old man, this time more urgently,' creating better rhythm and flow without introducing any new critical faults or compromising the author's voice.

- GPT-4.1:

  > Yes, the revision successfully improves the rhythm and urgency of the sentence as requested, shifting to 'A little further on, he put his question to an old man, this time more urgently,' which maintains the meaning, urgency, and tone of the original without introducing any new critical faults or awkwardness.

## 8. Stage 5: The Final Guardian

Text, verbatim:

> Imagine a 600-page epic where the crucial phrase "the crimson king" is a core motif. But in the climactic scene on page 457, it's translated as "the red monarch." The thematic echo is shattered. The book's power is broken by a single, seemingly innocent inconsistency.
>
> These recurring elements - a key phrase, a character's unique title, a specific object, an abstract theme - are the "threads" that weave a book together. The Threadweaver is our specialist AI agent built to ensure not a single one of these threads is ever dropped.
>
> It performs a task that is nearly impossible for a human team: first, it reads the entire manuscript to create a comprehensive map of every significant recurring element. Then, it audits the entire translation against this master plan, flagging every single inconsistency for review and surgical repair.
>
> The result is absolute long-range consistency. Every setup has its payoff. Every symbolic callback is preserved. The intricate patterns the author spent months or years crafting remain perfectly intact from the first page to the last.

### 8.1 Threadweaver Analysis: A Flattened Theme

Lead-in, verbatim:

> The system identified that the story's core philosophical theme—the trial of Cynicism vs. Idealism—was slightly weakened in the final, climactic line. The following analysis is the verbatim output from our Threadweaver agent.

Thread name: "The Trial of Human Nature: Cynicism vs. Idealism". Definition, verbatim:

> The story's central philosophical conflict, which pits the King's cynical worldview that all human action is selfish against Melos's idealistic belief that virtues like trust and honor can triumph over base instincts.

"Consistency Justification:", verbatim:

> The translation consistently builds the thematic conflict between the King's cynicism and Melos's idealism. However, the King's final statement of concession ("You have conquered this old king's heart") is slightly too generic and sentimental... The current translation softens this into a simple change of heart, missing the opportunity to explicitly show that his deep-seated 'doubt' has been defeated...

"Thematic Echo Detected:", verbatim:

> Setup (King's Cynicism): 人間は、もともと私慾のかたまりさ。信じては、ならぬ。
> Translation: People are nothing but bundles of selfish desire. One must never trust.
> Payoff (King's Concession): おまえらは、わしの心に勝ったのだ。
> Flattened Translation: You have conquered this old king's heart.

"Threadweaver's Suggested Enhancement:", "Proposed Rewrite for Final Paragraph:", verbatim:

> "You two, your wish has been granted. You have triumphed over the doubt in my heart. Trust was never an empty delusion. Please, I beg you - let me join your fellowship. Hear an old man's plea, and allow me to become one of your company."

[aki-execute note] The proposed rewrite differs from the Council-approved text of section 5.2 in one sentence only: "You have conquered this old king's heart." becomes "You have triumphed over the doubt in my heart."

## 9. Stage 6: The Launchpad

Text, verbatim:

> A perfect translation is only half the battle. As publishers ourselves, we know the real war begins after the book is finished - the war for readers' attention.
>
> Because we're committed to your success, every completed translation project comes with something extra, completely on us: complimentary access to our AI Marketing Director. It will design your launch and build your strategic arsenal, ensuring your masterpiece has the fighting chance it deserves.

### 9.1 The Publicist: Your AI Brand Strategist

Text, verbatim:

> The Publicist builds a cohesive brand strategy based on the manuscript. Its first and most critical task is to identify the book's Master Concept - the single, powerful idea at the heart of your work that becomes the North Star for the entire campaign. It performs a deep psychographic analysis of your book to build a complete, professional-grade brand strategy from first principles. It's your entire marketing brief, delivered in minutes.

[aki-execute note] In the quote blocks of sections 9.1 and 9.2, each label and its text sit in separate page elements. This summary joins them on one line with a colon or a period.

"1. The Strategic Core: Identity & Hooks", verbatim:

> Master Concept: Cynicism is a cage built from logic, but trust is the illogical, world-breaking force that sets us free. True strength is not the rational ability to suspect everyone, but the irrational courage to have faith in someone.
>
> Logline: When a simple shepherd is sentenced to death by a paranoid king, he must survive a hellish journey to save the friend he left as a hostage and prove that trust is a force more powerful than tyranny.

Ad Hooks, verbatim (six items):

> - They told him to run. They never expected he'd run back.
> - The king bet a man's life that no one could be trusted. He was about to lose.
> - In an age of cynicism, keeping your word is a revolutionary act.
> - What's the price of a promise? One man's life. Another man's soul.
> - He had three days to cross a land of thieves and liars. His only crime was telling the truth.
> - How do you defeat a tyrant? You keep your promise.

"2. The Audience: Psychographic Targeting", verbatim:

> Primary Audience Persona: Cynical Cassandra. Primary (Beachhead)
>
> Demographics & Psychographics: Ages 30-55, works in a field like law, academia, or tech that requires intellectual rigor but can breed cynicism. They listen to long-form interview podcasts (e.g., Lex Fridman, Sam Harris), read The Atlantic, and have a soft spot for both classic literature and modern philosophical non-fiction. They feel politically and culturally homeless, alienated by the extremes on both sides, and crave a return to first principles and genuine human connection.
>
> Core Motivation: "A deep-seated fear that the modern world's rampant cynicism, political polarization, and transactional relationships are correct, and that the classical virtues of honor, loyalty, and faith are naive illusions."
>
> Your Marketing Angle: For the person who is tired of being told that cynicism is intelligence, this book is a powerful, logical argument for faith.

"3. The Creative: Art & Engagement", verbatim:

> AI Art Direction: The Final Sprint. Themes: Duty, Sacrifice, Hope
>
> Ready-to-Use AI Prompt: An ancient Greek runner, seen from behind, muscles straining, sprinting on a dusty path toward a single, massive, brutalist gallows silhouetted against a blood-red setting sun. The style is minimalist and graphic, with a textured, papyrus-like background. The runner is small, the gallows immense, emphasizing the impossible odds. Stark, dramatic lighting. Cinematic, epic feel.
>
> Book Club "War-Gaming": The story argues that trust is the ultimate virtue. In our modern world of social media, 'fake news,' and political polarization, is this idea of absolute, unconditional trust still a noble ideal, or is it a dangerous liability?
>
> Author Interview Prep: "The story ends not just with Melos succeeding, but with the tyrant asking to join the friends' fellowship. Some might find this change of heart too sudden. Is it meant to be a realistic conversion or a more symbolic, fairytale-like conclusion?"

### 9.2 The Propagandist: Your AI Content Factory

Text, verbatim:

> Strategy is nothing without execution. The Propagandist takes the Publicist's high-level plan and explodes it into a complete 28-day social media campaign, weaponizing your book for launch with dozens of ready-to-deploy, persona-targeted assets.

"The 28-Day Campaign-in-a-Box Examples", three cards, verbatim:

> High-Engagement Hooks. Designed to spark viral debate.
> The King is a tyrant because he can't trust anyone. In our modern, polarized world, is his level of cynicism starting to look... rational?

> Weapons-Grade Ad Copy. Targeted at the 'Hopeful Hal' persona.
> "They told him to run. They never expected he'd run back."
> It's a simple setup: a man is sentenced to die, but gets a 3-day pass to see his sister get married. The tyrant king laughs, knowing he'll never return. This book is the story of the run back. A short, brutal, beautiful fable that will restore your faith in the sheer power of keeping your word.

> "Human Ghost" Ad Copy. Engineered with a raw, confessional voice for the skeptical 'Cynical Cassandra' persona.
> "In an age of cynicism, keeping your word is a revolutionary act."
> Full disclosure: I almost didn't finish 'Run, Melos!' because the main character's earnestness felt... naive. Then I got to the part where he completely despairs and accepts that the world is garbage. That part felt real. The fact that he gets up and runs *after* that is what broke me. Don't read this if you want to keep pretending you're above it all.

[aki-execute note] The page names the persona "Hopeful Hal" only in this card. The Audience block defines only "Cynical Cassandra".

## 10. Closing call to action

Heading (h2): "Wield the System."

Text, verbatim:

> You've seen the architecture. You've seen the proof. Now, experience the power of a translation process built on uncompromising principle.

Buttons: "Translate Your Book" (links to `/upload`) and "Explore the Full "Run, Melos!" Project" (links to `/public-translations/j0uk3outq5jagdgvphhhf9he`, new tab).

## 11. Site footer

- Brand line: "Professional-quality book translations with our multi-pass AI system."
- Product: Features, Pricing, How It Works, FAQ, Our Story, Blog.
- Company: About, Contact, Frequently Asked Questions.
- Legal: Terms of Service, Privacy Policy, Cookie Policy.
- "© 2026 BookTranslate.ai. All rights reserved."

## Notes for the Viewer [aki-execute note, agent inference]

- AI label per work and per page: the page names each agent role and each LLM vote (Gemini 2.5 Pro, Claude Sonnet 4, GPT-4.1), which shows one way to label which AI step touched a passage.
- Translation view and raw data view: the page pairs Japanese source lines with their English drafts ("Setup" and "Payoff" blocks), which is a reference for a raw-data component next to the translation.
- Original-language versions as reader components: the Threadweaver block puts the Japanese line, the translation, and the flagged weak translation in one panel.
- Public status and change log for reports: each change carries an issue description, a suggested fix, and a recorded verdict ("SPLIT DECISION (2-1 REJECT)", "UNANIMOUSLY APPROVED"), which is a model for a per-report status line.
- Change log: the two-round record (flawed fix, dissent, rewrite, approval) shows how a public log can keep rejected attempts next to the accepted text.
- Reader-chosen components: the "Authorial Stylistic Fingerprint" block sits in a collapsible accordion, which is one pattern for optional detail that a reader opens on demand.
- "Report a problem" path: the Finalizer feedback format (Issue Description, then Suggested Fix) is a compact field set for a logged reader report.
