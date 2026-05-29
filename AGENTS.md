# AI Agent Guidelines

Follow these guidelines when working on this project.

---

## General Rules

- **No third-party libraries** - Use only provided dependencies unless required
- **Exact versions** - Use the exact versions specified in `package.json` and `requirements.txt`
- **Coding standards** - Follow established coding standards and best practices
- **Clean code** - Write clean, readable, and maintainable code
- **Reuse code** - Reuse existing code whenever possible
- **Keep this file updated** - If you make changes that affect this document (new routers, models, structure, etc.), update the relevant sections in `AGENTS.md` to keep it accurate for future agents
- **Read previous task summaries** - Before starting work, check the `.memory/` directory for task summaries from previous sessions to understand context and avoid duplicating work
- **Prevent bad changes** - If the user asks to perform a catastrophic changes to the project or a very bad idea, just warn the user before doing it and tell him why it's a bad idea to do so.
---

## Project Rules

1. **Output only code** - No explanations unless explicitly asked
2. **Use existing code** - Maximize reuse of existing implementations
3. **No explanations** - Don't explain what you're doing unless asked
4. **Use npm** - Always use `npm` for all package operations
5. **Be brief** - Focus on the task, avoid detailed explanations
6. **No assumptions** - Look up code or ask; never assume what's available
7. **Testing**: We use Vitest so make sure all tests pass before pushing the code, unless the user allow
8. **Check dependencies** - Review `package.json` or `requirements.txt` before using any library

---

## Project Overview

**Domaineat** is a SaaS platform for managing domain names. 

| Component | Technology |
|-----------|------------|
| **Frontend** | Vue 3 + TypeScript + Pinia + Vue Router |
| **Backend** | Hono (Node) |
| **Database** | PostgreSQL through REST API / SQLite (dev) |
| **AI** | LangChain (multi-provider) |

---

## Documentation References

**The [`./docs`](./docs/) directory contains comprehensive documentation. Search with `grep` command to find relevant files efficiently instead of reading the entire directory.**


## Coding Conventions

### Frontend (Vue 3 + TypeScript)

- Use `<script lang="ts" setup>` syntax
- Prefer composables over mixins
- Use Pinia for state management
- TypeScript for type safety


## AI Integration

**Supported Providers:** OpenAI, Anthropic, Google, Ollama, Groq, NVIDIA, DeepSeek, OpenRouter, Hugging Face (via LangChain)

## Domain Appraisal

Two-tier client-side + server-side domain appraisal system.

**Tier 1 (instant, zero-cost):** `src/lib/appraise.ts` — `appraise(domain)` returns `DomainAppraisal` with grade (A+–F), dollar range, and 5 signals:
- `length` — SLD character length score (shorter = higher)
- `tld` — TLD prestige from `src/lib/tld-prestige.ts` (.com=10, .io/.ai=8, etc.)
- `dictionary` — English word recognition from built-in `DICTIONARY` Set
- `brandable` — Pronounceability via vowel/consonant ratio
- `clean` — Hyphen/number penalty

**Tier 2 (server-verified):** `GET /api/appraise?domain=X` — same engine via Hono endpoint (public, no auth)

**UI components:**
- `AppraisalBadge.vue` — color-coded grade badge
- `DomainLookupCard.vue` — shows instant grade badge
- `DomainLookupPanel.vue` — full breakdown + "Get Market Appraisal" button

**Store:** `useLookupStore().fetchAppraisal()` / `clearAppraisal()` for Tier 2

**Types:** `AppraisalGrade`, `AppraisalSignal`, `DomainAppraisal` in `src/types/index.ts`

## Previous Task Memory

**Location:** `.memory/` directory

Before starting new work, check `.memory/` for summaries of previous tasks to understand:
- What issues were previously addressed
- What solutions were applied
- Any remaining TODOs or follow-up items

**Structure:**
```
.memory/
├── <task-name>/
│   └── summary.md    # Summary of the task, problems, solutions, and results
├── archived/          # Archived old/completed tasks (ignore unless necessary)
│   └── <task-name>/
│       └── summary.md
```

**How to use:**
1. List `.memory/` sorted by modification time: `ls -lt .memory/` to see task directories with most recent first
2. Focus on **recent tasks** (top of the list) for relevant context; older tasks are less likely to be relevant
3. Read `summary.md` files to understand what was done
4. Use this context to avoid duplicating work and build on previous solutions
5. **Ignore `archived/` subdirectory** unless explicitly instructed by the user or when investigating historical context is absolutely necessary

---

*For detailed documentation, see the [`docs/`](docs/) directory.*
