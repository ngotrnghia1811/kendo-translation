# Kendo Translation Platform

A collaborative Japanese–English translation platform for kendo instructional content, featuring a **MAC-RAG** (Multi-Agent Collaborative Retrieval-Augmented Generation) AI pipeline, segment-based editing, real-time collaboration, and a comprehensive kendo terminology database.

## Overview

Kendo texts present unique translation challenges: domain-specific terminology (竹刀 → shinai), honorific register detection (keigo), SOV→SVO structural reordering, and the need for consistent romanization. This platform addresses these with a three-phase AI pipeline coordinated through a collaborative web editor backed by Supabase.

## Architecture

### MAC-RAG Translation Pipeline

```
Source Text (JA)
      │
      ▼
┌─────────────────────────────────┐
│  Phase 1: Context Building       │
│  - Domain classification         │
│  - Style & keigo analysis        │
│  - Entity extraction             │
│  - TM fuzzy search               │
│  - Terminology matching          │
│  - Coverage gap detection        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Phase 2: Multi-Candidate Gen   │
│  - Literal translation           │
│  - Natural translation           │
│  - Formal translation            │
│  (parallel LLM calls)            │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Phase 3: Quality Scoring       │
│  - Fluency (30%)                 │
│  - Adequacy (35%)                │
│  - Terminology (20%)             │
│  - Style (15%)                   │
│  - Routing decision              │
└─────────────────────────────────┘
```

**Routing decisions:** `auto_accept` (≥0.90) · `light_pe` (0.85–0.89) · `standard_pe` (0.70–0.84) · `full_revision` (<0.70)

### Japanese-English Agent

The `lib/agents/ja-en-agent.ts` module provides pre-translation linguistic analysis:

- **Subject inference** — Japanese frequently drops subjects; the agent infers likely subjects from verb forms and discourse context
- **Keigo detection** — identifies sonkeigo, teineigo, kenjogo, or casual register and maps to English formality
- **SOV→SVO reordering** — detects sentence-final verb patterns and flags restructuring needs
- **Onomatopoeia** — identifies Japanese sound symbolism requiring creative equivalents

### Project Structure

```
kendo-translation/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── layout.tsx                      # Root layout
│   ├── login/page.tsx                  # Authentication
│   ├── documents/
│   │   ├── page.tsx                    # Document list
│   │   └── [id]/
│   │       ├── edit/page.tsx           # Segment editor with MAC-RAG
│   │       └── read/page.tsx           # Bilingual reader view
│   └── api/
│       ├── translate/mac-rag/route.ts  # MAC-RAG API (phases: context/translate/score/full)
│       ├── segments/[id]/route.ts      # Segment CRUD
│       ├── segments/[id]/lock/route.ts # Soft locking for collaboration
│       ├── segments/cleanup-locks/     # Cron: release stale locks
│       └── documents/
│           ├── route.ts                # List/create documents
│           └── [id]/
│               ├── segments/route.ts   # List segments
│               └── segmentize/route.ts # Split document into segments
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase + admin clients
│   │   └── middleware.ts               # Session refresh + route protection
│   ├── llm/
│   │   ├── provider.ts                 # OpenAI / OpenRouter abstraction
│   │   └── agent-logger.ts             # In-memory + DB agent call logging
│   ├── agents/
│   │   ├── prompts.ts                  # Prompt templates (DB + cache + defaults)
│   │   └── ja-en-agent.ts             # Japanese linguistic analysis agent
│   ├── context/
│   │   ├── context-builder.ts          # Phase 1 orchestrator
│   │   ├── analyzers.ts                # Domain, style, entity analyzers
│   │   ├── context-pairer.ts           # Weight and synthesize context
│   │   └── gap-detector.ts             # Coverage gap detection
│   ├── retrieval/
│   │   ├── tm-search.ts                # Fuzzy TM matching (Levenshtein + Jaccard + n-gram)
│   │   └── terminology.ts              # Kendo glossary + DB terminology
│   ├── translation/
│   │   └── multi-gen.ts                # Phase 2: parallel candidate generation
│   ├── quality/
│   │   ├── scorer.ts                   # Phase 3: LLM-assisted quality scoring
│   │   └── routing.ts                  # Post-editing effort routing
│   └── hooks/
│       └── useMacRag.ts                # React hook for MAC-RAG pipeline state
├── types/
│   └── database.ts                     # TypeScript interfaces for Supabase tables
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql              # Core tables + indexes + triggers
│       └── 002_rls_policies.sql        # Row Level Security policies
├── middleware.ts                       # Next.js middleware (session + RBAC)
├── vercel.json                         # Deployment config + cron schedule
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .env.example
```

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key (or OpenAI)

### Installation

```bash
git clone https://github.com/your-org/kendo-translation
cd kendo-translation
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key
```

### Database Setup

Apply migrations in the Supabase SQL editor or via CLI:

```bash
supabase db push
```

Or manually run in order:
1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## LLM Configuration

The platform uses OpenRouter by default, configured via `lib/llm/provider.ts`:

| Agent | Default Model |
|-------|--------------|
| `translation` | `anthropic/claude-3.5-haiku` |
| `reflection` | `anthropic/claude-3.5-sonnet` |
| `ja_en` | `anthropic/claude-3.5-haiku` |

Override per-agent models by modifying `AGENT_MODEL_CONFIG` in `lib/llm/provider.ts`.

## Kendo Terminology

The built-in glossary covers 45+ kendo terms including:

| Japanese | Romanization | Type |
|----------|-------------|------|
| 竹刀 | shinai | required |
| 防具 | bogu | required |
| 稽古 | keiko | required |
| 残心 | zanshin | required |
| 剣道 | kendo | do_not_translate |
| 先生 | sensei | do_not_translate |

Custom terminology can be added via the `terminology` Supabase table.

## Collaboration Features

- **Soft segment locking** — users acquire a 5-minute lock on segments they open; cron releases stale locks
- **Real-time updates** — Supabase Realtime broadcasts segment changes across clients
- **Revision history** — every save creates a revision record for audit trails
- **Role-based access** — `admin` / `translator` / `reviewer` / `viewer` roles enforced at API and RLS level

## API Reference

### `POST /api/translate/mac-rag`

Run the MAC-RAG pipeline. `phase` controls which stages execute:

| Phase | Description |
|-------|-------------|
| `context` | Phase 1 only: returns context, TM matches, terminology, gaps |
| `translate` | Phase 2 only: returns candidates |
| `score` | Phase 3 only: returns quality assessment and routing |
| `full` | All three phases in sequence |

**Request body:**
```json
{
  "sourceText": "竹刀を正しく持つことが基本です。",
  "sourceLang": "ja",
  "targetLang": "en",
  "phase": "full",
  "approaches": ["literal", "natural", "formal"]
}
```

### `PATCH /api/segments/:id`

Update a segment's translation or status. Respects soft locks.

### `POST /api/segments/:id/lock`

Acquire a soft lock. Returns 409 if locked by another user within 5 minutes.

### `DELETE /api/segments/:id/lock`

Release a lock. Only the lock holder can release.

### `POST /api/documents/:id/segmentize`

Split an article's source text into aligned segments.
