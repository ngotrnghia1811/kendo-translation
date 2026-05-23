# Agent Coordination

This repo is worked on concurrently by multiple opencode agents (e.g. a frontend
agent and a backend / MAC-RAG agent). This document defines the lightweight
discipline that keeps them out of each other's way **without** requiring
separate clones or worktrees.

> Status: working agreement. Edit freely as the team's practice evolves.

---

## 1. One branch per agent

Each agent works on a dedicated branch off `main`. Never two agents on `main`
simultaneously, and never two agents on the same branch.

Suggested names:

- `agent/frontend-reader` — frontend / UI agent (pages, components, hooks).
- `agent/backend-mac-rag` — backend / RAG agent (API routes, lib, migrations).

The canonical checkout (this directory) may sit on `main` between sessions, but
during active work each agent checks out its own branch.

When you finish a unit of work, merge or open a PR back to `main` rather than
committing to `main` directly.

---

## 2. Territory map (working assumption)

This is a **working assumption**, not a fixed boundary. If you find yourself
needing to touch something outside your column, stop and coordinate first.

| Path                         | Frontend agent | Backend agent | Notes                                    |
| ---------------------------- | :------------: | :-----------: | ---------------------------------------- |
| `app/documents/**` (pages)   |       ✓        |               | Page-level UI for documents.             |
| `app/(public)/**`            |       ✓        |               | Public-facing pages, if present.         |
| `components/**`              |       ✓        |               | All React components.                    |
| `hooks/**`                   |       ✓        |               | Client hooks.                            |
| `app/api/**`                 |                |       ✓       | Route handlers.                          |
| `lib/agents/**`              |                |       ✓       | Agent orchestration.                     |
| `lib/translation/**`         |                |       ✓       | Translation pipeline.                    |
| `lib/quality/**`             |                |       ✓       | Quality / scoring.                       |
| `lib/retrieval/**`           |                |       ✓       | Retrieval.                               |
| `lib/llm/**`                 |                |       ✓       | LLM adapters.                            |
| `lib/mac-rag/**`             |                |       ✓       | MAC-RAG implementation.                  |
| `supabase/migrations/**`     |                |       ✓       | DB migrations (filename timestamp races!) |
| `types/database.ts`          |       coord    |     coord     | Shared types; coordinate before editing. |
| `middleware.ts`              |       coord    |     coord     | Auth/routing; coordinate.                |
| `package.json` / lockfile    |       coord    |     coord     | Dependency changes; coordinate.          |
| `app/layout.tsx` and layouts |       coord    |     coord     | Coordinate.                              |
| `docs/**`                    |       coord    |     coord     | Whoever edits a docs file announces it.  |

"coord" = either agent may edit, but must announce in chat / commit message
before doing so. The default for an unmarked path is **don't touch — ask**.

---

## 3. Pre/post `git status` discipline

Every work unit, before any file edit:

```sh
git status
git log --oneline -3
```

If `git status` shows files modified that you did not edit (and that you do not
recognize from your own previous work in the session), **stop and report**.
Do not stage, revert, or otherwise interact with those files — they may be the
other agent's uncommitted work.

After finishing the unit:

```sh
git status
git diff --stat
```

Confirm the only files changed are the ones you declared in your scope. If
extra files appear, name them in your report.

---

## 4. Staging discipline: always use explicit pathspecs

When committing, never use `git add .` or `git commit -a`. They sweep up
whatever happens to be in the working tree, which on a shared checkout means
sweeping up the other agent's uncommitted edits.

Always:

```sh
git add path/to/file1 path/to/file2
git commit -m "..."
```

Before pushing, run `git diff origin/<branch>...HEAD --stat` to confirm the
commit contents match your intent.

---

## 5. Scope declaration (per work unit)

Before touching any file, the executing agent should state out loud:

1. **What** will be done.
2. **Which files** will be touched (full paths).
3. **What done looks like.**

Then get explicit confirmation to proceed. After execution, report the diff,
the verification results (typecheck, tests), and any surprises.

Uncertainty about scope = not in scope. Ask.

---

## 6. Escalation: `git worktree` when filesystem cross-talk hurts

The rules above rely on agents not stepping on each other within a single
working directory. If you observe that the other agent's writes are appearing
in your `git status` (because you share `.git/index` and the filesystem), and
that's causing real friction, escalate to **`git worktree`**:

```sh
# From the canonical checkout:
git worktree add ../kendo-translation-frontend agent/frontend-reader
git worktree add ../kendo-translation-backend  agent/backend-mac-rag
```

Each worktree is a **separate directory** with its own working files, index,
and `HEAD`, but shares the underlying object database. A branch can only be
checked out in one worktree at a time (git enforces this), which is the
isolation property you want.

Costs:

- Each worktree has its own `node_modules/` and `.next/` (consider a shared
  cache via pnpm / bun if disk is tight).
- Each agent's opencode session must be launched against its own worktree
  directory.

Until the friction justifies the cost, the discipline in §§1–5 is the default.

---

## 7. Branch hygiene

- Rebase your agent branch onto `main` regularly to stay close to head.
- Open small PRs scoped to a single work unit where possible.
- Delete agent branches after merge: `git branch -d agent/<name>` and
  `git push origin --delete agent/<name>`.
- Do not force-push shared branches.

---

## 8. When in doubt

Stop and ask the human. The cost of a clarifying question is always lower
than the cost of overwriting another agent's uncommitted work.
