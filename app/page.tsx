import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Kendo Translation</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/documents" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Documents</Link>
            <Link href="/login" className="text-sm bg-[var(--color-text)] text-[var(--color-surface)] px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">Sign In</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded-full mb-8">
          <span>✨</span>
          <span>MAC-RAG AI-Powered Translation</span>
        </div>
        <h2 className="text-5xl font-bold text-[var(--color-text)] mb-6 leading-tight">
          Collaborative Japanese–English<br />Translation for Kendo
        </h2>
        <p className="text-xl text-[var(--color-text)] mb-10 max-w-2xl mx-auto">
          A segment-based collaborative editor with AI assistance. Translate kendo texts with
          terminology enforcement, translation memory, and real-time multi-user editing.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/documents" className="bg-[var(--color-text)] text-[var(--color-surface)] px-8 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity">
            View Documents
          </Link>
          <Link href="/login" className="border border-[var(--color-border)] text-[var(--color-text)] px-8 py-3 rounded-lg font-medium hover:bg-[var(--color-bg)] transition-colors">
            Start Translating
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-[var(--color-text)] text-center mb-12">Platform Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: '🤖', title: 'MAC-RAG Pipeline', desc: 'Multi-Agent Collaborative RAG generates literal, natural, and formal translation candidates with quality scoring.' },
            { icon: '📝', title: 'Segment-Based Editing', desc: 'Documents split into aligned sentence pairs. Track progress per segment with status badges and revision history.' },
            { icon: '🔤', title: 'Terminology Database', desc: 'Built-in kendo glossary with required, preferred, and do-not-translate constraints enforced during translation.' },
            { icon: '👥', title: 'Real-Time Collaboration', desc: 'Presence indicators, soft segment locking, and live cursor tracking for multi-translator workflows.' },
            { icon: '📚', title: 'Translation Memory', desc: 'Fuzzy search across previous translations with Levenshtein, Jaccard, and n-gram similarity scoring.' },
            { icon: '📖', title: 'Multiple Reader Views', desc: 'Single language, bilingual paragraph, and sentence-aligned views for different reading needs.' },
          ].map(f => (
            <div key={f.title} className="rounded-xl p-6 bg-[var(--color-surface)]">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h4 className="font-semibold text-[var(--color-text)] mb-2">{f.title}</h4>
              <p className="text-sm text-[var(--color-text-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline diagram */}
      <section className="py-16 bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-[var(--color-text)] mb-4">MAC-RAG Translation Pipeline</h3>
          <p className="text-[var(--color-text-muted)] mb-10">Three-phase pipeline: context retrieval, multi-candidate generation, and quality scoring.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { phase: '1', label: 'Context', detail: 'Domain, style, entities, TM, terminology' },
              { phase: '2', label: 'Generate', detail: 'Literal + Natural + Formal candidates' },
              { phase: '3', label: 'Score', detail: 'Fluency, adequacy, terminology, style' },
            ].map((p, i) => (
              <div key={p.phase} className="flex items-center gap-4">
                <div className="rounded-xl p-5 shadow-sm text-center w-40 bg-[var(--color-surface)]">
                  <div className="text-blue-600 font-bold text-lg mb-1">Phase {p.phase}</div>
                  <div className="font-semibold text-[var(--color-text)] mb-1">{p.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{p.detail}</div>
                </div>
                {i < 2 && <span className="text-[var(--color-text-muted)] text-2xl">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--color-text-muted)]">
          <p>Kendo Translation Platform — Collaborative Japanese-English translation with MAC-RAG AI assistance</p>
        </div>
      </footer>
    </div>
  );
}
