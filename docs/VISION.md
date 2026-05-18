# Vision

## What this platform is

A **cooperation-first co-translation platform** for Japanese kendo literature.

It exists so that a small community of translators, editors, proofreaders, and
QA reviewers can work together — alongside LLM agents — to bring Japanese kendo
texts into careful, faithful English. The platform is built around the people
doing the work, not around the machine doing the translating.

The defining choice is in the word "cooperation." Machine translation tools
exist in abundance. A platform that organises *human collaboration* around
translation, with machines as participants rather than authors, does not. That
is the gap this project fills.

## Why kendo literature

Kendo writing carries technical vocabulary, formal register, and cultural
context that off-the-shelf machine translation handles badly. Terms like *men*,
*kote*, *dō*, *tsuki*, *kiai*, *kamae*, *seme*, and *zanshin* must be preserved,
not translated. Quotations from classical texts demand a literary voice. The
right reading often depends on knowing what a *sensei* would actually mean.

These are exactly the judgements that a community of practitioners can make
collectively, and that no single translator (human or otherwise) gets right on
the first pass. The platform is shaped around making those judgements visible,
discussable, and reversible.

## The shape of cooperation

Every translation passes through four phases:

1. **Translate** — a first English rendering of the Japanese source.
2. **Edit** — a careful revision for fluency, tone, and accuracy.
3. **Proofread** — a final polish for consistency and surface quality.
4. **QA** — an approval step where issues are raised, resolved, and the segment
   is signed off.

A document moves through these phases one *segment* at a time. Each segment
keeps its own history: who advanced it, when, with what note, and what the text
looked like at each step. Nothing is lost; everything is auditable.

Within any phase, two cooperation primitives operate:

- **Suggestions.** A translator, editor, proofreader, or LLM agent can propose
  a new version of a segment's text. The person who owns the segment at that
  phase reviews the suggestion, accepts it, rejects it, or supersedes it. The
  active text only changes when a human chooses to apply a suggestion.
- **Comments.** Anyone with access can leave a comment on a segment, reply to
  another comment, or mention a specific user. Comments can be marked
  resolved. They form the running record of the conversation around a passage.

LLM agents participate as suggesters, never as decision-makers. An agent's
proposal sits in the same queue as a human proposal and is reviewed the same
way. The platform supports per-phase agents (a translate agent, an edit agent,
a proofread agent), each with its own prompt and tone. The human reviewer is
always in the loop.

## Roles

The platform uses a small set of global roles:

- **Admin** — manages users, documents, and per-document assignments.
- **Translator** — the default working role. Can read everything, suggest on
  any document, and act on segments where they have been assigned a phase.
- **Reader** — read-only access. Sees translated text, comments, and history,
  but cannot suggest or advance segments.

What a translator can *do* on a given document depends on **per-document phase
assignments**, granted by an admin. A user might be authorised to edit
chapter 3 but only to proofread chapter 7. This keeps responsibility clear and
lets the platform grow with a community without inflating the role list.

This is the same idea behind cooperation itself: the right person, at the right
phase, on the right passage.

## What success looks like

A working translation surfaces three things to anyone visiting it:

- The current English rendering, segment by segment, with its phase clearly
  marked.
- The cooperation around each segment — who suggested what, who commented,
  what's still pending.
- The history of how it got here.

When a community can see all three at once, translation stops being a private
act of authority and becomes a shared act of stewardship. That is the goal.
