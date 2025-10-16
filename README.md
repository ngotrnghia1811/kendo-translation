# Kendo Translation Platform

A collaborative Japanese–English translation platform for kendo instructional content. It features a **MAC-RAG** (Multi-Agent Collaborative Retrieval-Augmented Generation) AI pipeline, segment-based editing, real-time collaboration, and a built-in kendo terminology database.

## Overview

Translating kendo texts is genuinely tricky — domain-specific terms like 竹刀 (shinai) need consistent romanization, keigo (honorific register) has to map to the right English formality level, and the SOV→SVO structural shift requires careful reordering. This platform handles all of that through a three-phase AI pipeline wrapped in a collaborative web editor backed by Supabase.

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

The `ja-en-agent` module handles pre-translation linguistic analysis before any LLM call:

- **Subject inference** — Japanese frequently drops subjects; the agent infers likely subjects from verb forms and discourse context
- **Keigo detection** — identifies sonkeigo, teineigo, kenjogo, or casual register and maps to English formality
- **SOV→SVO reordering** — detects sentence-final verb patterns and flags restructuring needs
- **Onomatopoeia** — identifies Japanese sound symbolism requiring creative equivalents

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key (or OpenAI)

### Installation

```bash
git clone https://github.com/ngotrnghia1811/kendo-translation
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

Apply migrations via the Supabase CLI:

```bash
supabase db push
```

Or run manually in the Supabase SQL editor in order:
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

The platform uses OpenRouter by default:

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

- **Soft segment locking** — users acquire a 5-minute lock on segments they open; a cron job releases stale locks automatically
- **Real-time updates** — Supabase Realtime broadcasts segment changes across all connected clients
- **Revision history** — every save creates a revision record for full audit trails
- **Role-based access** — `admin` / `translator` / `reviewer` / `viewer` roles enforced at both the API and RLS level
