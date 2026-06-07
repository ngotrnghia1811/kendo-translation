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
import { buildArticleL2Context } from '@/lib/context/article-context';
import type { ArticleL2Context } from '@/lib/context/article-context';
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
  const { segment_id, phase, target_lang } = (body ?? {}) as {
    segment_id?: unknown;
    phase?: unknown;
    target_lang?: unknown;
  };

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

  const targetLang: 'en' | 'zh' =
    target_lang === 'zh' ? 'zh' : 'en';

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
    .select('id, source_text, target_text, status, article_id, source_lang, target_lang, position')
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
  const segArticleId: string = segment.article_id as string;
  const segPosition: number = segment.position as number;

  // ── Parallel retrieval + L2 context ───────────────────────────────
  const retrievalT0 = Date.now();
  const [tmResult, termResult, l2] = await Promise.all([
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
    buildArticleL2Context(supabase, segment_id, segArticleId, segPosition).catch((err) => {
      console.warn('L2 context build failed, using empty context:', err);
      return {
        articleId: segArticleId,
        documentTitle: null,
        neighbours: { prev: null, next: null },
        termsAlreadyAnnotated: [],
      } as ArticleL2Context;
    }),
  ]);
  const retrievalMs = Date.now() - retrievalT0;

  // ── Build phase-specific prompt (no LLM) ──────────────────────────
  const composeT0 = Date.now();

  let built: { system: string; user: string };
  switch (phase) {
    case 'translate':
      built = translatePrompt(sourceText, targetLang);
      break;
    case 'edit':
      built = editPrompt(sourceText, targetText ?? '', targetLang);
      break;
    case 'proofread':
      built = proofreadPrompt(sourceText, targetText ?? '', targetLang);
      break;
    case 'qa':
      built = qaPrompt(sourceText, targetText ?? '', targetLang);
      break;
  }

  // ── Augment user message with retrieval context ──────────────────
  const contextLines: string[] = [];

  // L2 (article-local) context blocks — added before TM / terminology
  if (l2.documentTitle) {
    contextLines.push('## Document Context');
    contextLines.push(`- Title: ${l2.documentTitle}`);
    contextLines.push('');
  }

  const usableNeighbours: { label: string; seg: import('@/lib/context/article-context').NeighbourSegment }[] = [];
  if (l2.neighbours.prev?.usable) {
    usableNeighbours.push({ label: 'Previous', seg: l2.neighbours.prev });
  }
  if (l2.neighbours.next?.usable) {
    usableNeighbours.push({ label: 'Next', seg: l2.neighbours.next });
  }
  if (usableNeighbours.length > 0) {
    contextLines.push('## Neighbouring Segments');
    for (const { label, seg } of usableNeighbours) {
      contextLines.push(`- **${label}** [${seg.status}]: ${seg.source_text}`);
      if (seg.target_text) {
        contextLines.push(`  Translation: ${seg.target_text}`);
      }
    }
    contextLines.push('');
  }

  if (l2.termsAlreadyAnnotated.length > 0) {
    contextLines.push('## Terms Already Annotated in This Article');
    contextLines.push('(Do not re-annotate these terms — they have already been handled in other accepted segments.)');
    for (const t of l2.termsAlreadyAnnotated) {
      contextLines.push(`- ${t}`);
    }
    contextLines.push('');
  }

  if (tmResult.matches.length > 0) {
    // Split by retrieval_layer: L3 (in-project) and L4 (external/global).
    const l3Matches = tmResult.matches.filter(m => m.retrievalLayer !== 'external');
    const l4Matches = tmResult.matches.filter(m => m.retrievalLayer === 'external');

    const top3L3 = l3Matches.slice(0, 3);
    const top3L4 = l4Matches.slice(0, 3);

    if (top3L3.length > 0) {
      contextLines.push('## Translation Memory — In-Project (L3)');
      for (const m of top3L3) {
        contextLines.push(`- [${m.matchPercentage}%] Source: ${m.sourceText}`);
        contextLines.push(`  Target: ${m.targetText}`);
      }
      contextLines.push('');
    }
    if (top3L4.length > 0) {
      contextLines.push('## Translation Memory — External (L4)');
      for (const m of top3L4) {
        contextLines.push(`- [${m.matchPercentage}%] Source: ${m.sourceText}`);
        contextLines.push(`  Target: ${m.targetText}`);
      }
      contextLines.push('');
    }
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
    target_lang: segment.target_lang,
    prompt: built,
    l2_context: {
      document_title: l2.documentTitle,
      neighbours: l2.neighbours,
      terms_already_annotated: l2.termsAlreadyAnnotated,
    },
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
