/**
 * POST /api/mac-rag/compose
 *
 * Stage 1 of the two-stage MAC-RAG pipeline: retrieval + prompt assembly.
 * No LLM call — returns the assembled prompt for human review/edit.
 *
 * The caller (human or UI) inspects the assembled `prompt` and submits
 * the (optionally edited) version to `POST /api/mac-rag/generate`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchTM } from '@/lib/retrieval/tm-search';
import { searchTerminology } from '@/lib/retrieval/terminology';
import {
  translatePrompt,
  editPrompt,
  proofreadPrompt,
  qaPrompt,
} from '@/lib/agents/phase-prompts';
import type { TMMatch } from '@/lib/retrieval/tm-search';
import type { TermEntry } from '@/lib/retrieval/terminology';

type Phase = 'translate' | 'edit' | 'proofread' | 'qa';
type SourceLang = 'ja' | 'en';

const VALID_PHASES: readonly Phase[] = ['translate', 'edit', 'proofread', 'qa'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPhase(v: unknown): v is Phase {
  return typeof v === 'string' && (VALID_PHASES as readonly string[]).includes(v);
}

function asSourceLang(v: unknown): SourceLang {
  return v === 'ja' || v === 'en' ? v : 'ja';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { segment_id, phase } = (body ?? {}) as { segment_id?: unknown; phase?: unknown };

  if (typeof segment_id !== 'string' || !UUID_RE.test(segment_id)) {
    return NextResponse.json(
      { error: 'segment_id is required and must be a UUID' },
      { status: 400 },
    );
  }

  if (!isPhase(phase)) {
    return NextResponse.json(
      { error: `phase must be one of: ${VALID_PHASES.join(', ')}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Fetch segment ─────────────────────────────────────────────────
  const { data: segment, error: segmentErr } = await supabase
    .from('segments')
    .select('id, source_text, target_text, status, article_id, source_lang, target_lang')
    .eq('id', segment_id)
    .maybeSingle();

  if (segmentErr) {
    return NextResponse.json({ error: segmentErr.message }, { status: 500 });
  }
  if (!segment) {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }

  const sourceText: string = (segment.source_text ?? '').toString();
  const targetText: string | null = segment.target_text
    ? (segment.target_text as string)
    : null;
  const sourceLang: SourceLang = asSourceLang(segment.source_lang);

  // ── Parallel retrieval ────────────────────────────────────────────
  const retrievalT0 = Date.now();
  const [tmResult, termResult] = await Promise.all([
    searchTM(supabase, {
      sourceText,
      sourceLang,
      domain: 'kendo',
      minMatchScore: 50,
      maxResults: 10,
    }),
    searchTerminology(supabase, {
      text: sourceText,
      sourceLang,
      domain: 'kendo',
    }),
  ]);
  const retrievalMs = Date.now() - retrievalT0;

  // ── Build phase-specific prompt (no LLM) ──────────────────────────
  const composeT0 = Date.now();

  let built: { system: string; user: string };
  switch (phase) {
    case 'translate':
      built = translatePrompt(sourceText);
      break;
    case 'edit':
      built = editPrompt(sourceText, targetText ?? '');
      break;
    case 'proofread':
      built = proofreadPrompt(sourceText, targetText ?? '');
      break;
    case 'qa':
      built = qaPrompt(sourceText, targetText ?? '');
      break;
  }

  // ── Augment user message with retrieval context ──────────────────
  const contextLines: string[] = [];

  if (tmResult.matches.length > 0) {
    const top3 = tmResult.matches.slice(0, 3);
    contextLines.push('## Translation Memory (top matches)');
    for (const m of top3) {
      contextLines.push(`- [${m.matchPercentage}%] Source: ${m.sourceText}`);
      contextLines.push(`  Target: ${m.targetText}`);
    }
    contextLines.push('');
  }

  if (termResult.constraints.requiredTerms.length > 0) {
    contextLines.push('## Required Terminology');
    for (const t of termResult.constraints.requiredTerms) {
      const note = t.notes ? ` (${t.notes})` : '';
      contextLines.push(`- ${t.japaneseTerm} → ${t.englishTerm}${note}`);
    }
    contextLines.push('');
  }

  if (termResult.constraints.doNotTranslate.length > 0) {
    contextLines.push('## Do Not Translate');
    for (const t of termResult.constraints.doNotTranslate) {
      contextLines.push(`- ${t.japaneseTerm} → ${t.englishTerm}`);
    }
    contextLines.push('');
  }

  if (termResult.constraints.preferredTerms.length > 0) {
    contextLines.push('## Preferred Terminology');
    for (const t of termResult.constraints.preferredTerms) {
      contextLines.push(`- ${t.japaneseTerm} → ${t.englishTerm}`);
    }
    contextLines.push('');
  }

  if (contextLines.length > 0) {
    built = {
      ...built,
      user: built.user + '\n\n' + contextLines.join('\n'),
    };
  }

  const composeMs = Date.now() - composeT0;

  // ── Response ─────────────────────────────────────────────────────
  return NextResponse.json({
    segment_id,
    phase,
    source_text: sourceText,
    target_text: targetText,
    prompt: built,
    tm_matches: tmResult.matches,
    terminology: {
      requiredTerms: termResult.constraints.requiredTerms,
      preferredTerms: termResult.constraints.preferredTerms,
      doNotTranslate: termResult.constraints.doNotTranslate,
    },
    timings: {
      retrieval_ms: retrievalMs,
      compose_ms: composeMs,
    },
  });
}
