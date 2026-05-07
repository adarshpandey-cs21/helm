# Claude History Viewer

A local-only SvelteKit app to browse and replay every conversation you've had with [Claude Code](https://claude.com/claude-code), across every project on your machine.

It reads the JSONL session logs Claude Code writes to `~/.claude/projects/` and gives you:

- A grid of all your projects with session counts, total events, prompts, and disk usage
- Per-project session list with first-prompt previews, branch, duration, and token totals
- Full session transcripts: chat replay with markdown, expandable tool calls (Bash/Read/Edit/…), files-touched list, raw JSONL toggle
- Pin projects and individual sessions to the top (persisted to `localStorage`)
- Light + dark themes with a one-click switcher
- Smart breadcrumbs and per-page metric cards

All data stays on your machine — there's no server call out to anything.

---

## Prerequisites

- **Node.js** 20+ (tested on 24)
- **pnpm** 10+ — install with `corepack enable` or `npm i -g pnpm`
- A populated `~/.claude/projects/` directory (Claude Code writes here automatically)

## Setup

```bash
git clone https://github.com/adarshpandey-cs21/claude-history-viewer.git
cd claude-history-viewer
pnpm install
```

## Run

```bash
pnpm dev               # start the dev server
pnpm dev --open        # also open it in the browser
```

The dev server runs at `http://localhost:5173` by default.

## Build

```bash
pnpm build             # production build
pnpm preview           # preview the production build locally
pnpm check             # typecheck + svelte-check
```

## Environment variables

All env vars are optional. Copy `.env.example` to `.env` to override defaults:

```bash
cp .env.example .env
```

| Variable              | Default               | Notes                                                                                      |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `CLAUDE_PROJECTS_DIR` | `~/.claude/projects/` | Absolute path to Claude Code's projects directory. `~` is **not** expanded — use absolute. |

Restart the dev server after editing `.env`.

## How it works

- `src/lib/server/history.ts` — reads `CLAUDE_PROJECTS_DIR`, walks each project folder, and parses each `*.jsonl` line by line. JSONL events get normalized into a typed schema (`user-text`, `assistant-text`, `assistant-tool-use`, `user-tool-result`, `system`, `meta`, …).
- `src/routes/+page.svelte` — projects grid (homepage)
- `src/routes/projects/[projectId]/+page.svelte` — sessions list for a project
- `src/routes/projects/[projectId]/sessions/[sessionId]/+page.svelte` — full transcript view
- `src/lib/pinned.svelte.ts` — reactive store for pinned projects + sessions, persisted to `localStorage`

## Tech stack

- [SvelteKit 2](https://svelte.dev/) (Svelte 5 with runes)
- [Tailwind CSS v4](https://tailwindcss.com/) with a custom ink/accent palette
- [marked](https://marked.js.org/) + [isomorphic-dompurify](https://github.com/kkomelin/isomorphic-dompurify) for sanitized markdown rendering
- TypeScript end-to-end, type-checked with `svelte-check`

## License

MIT — do whatever you want with it.
