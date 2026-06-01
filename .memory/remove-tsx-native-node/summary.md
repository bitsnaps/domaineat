# Remove `tsx` — switch API scripts to native Node + tsc

**Date:** 2026-06-01

## Context
The `tsx` package was removed from the project (per user request, because it caused issues).
Node v22 is available on this machine, so the goal was to refactor the scripts that previously
invoked `tsx api/server.ts` and `tsx api/migrate.ts` to run on plain Node without adding any
new dependencies.

## Problem
- `package.json` had two `tsx` invocations: `dev:api` and `migrate`.
- `tsx` was the dev-time TypeScript runner that also auto-restarted on file change.
- `tsc --watch` would have been an option, but the project already had a one-shot
  `build:api` script (`tsc -p tsconfig.api.json`) producing `dist-api/`.
- The old `tsconfig.api.json` had `rootDir: "api"` and a narrow `include`, but the API
  imports `src/lib/appraise.ts`, `src/lib/tld-prestige.ts`, and `src/types/index.ts`,
  causing TS6059 "File ... is not under 'rootDir'" errors on `build:api`.

## Solution

### 1. `tsconfig.api.json`
- Removed `"rootDir": "api"` so tsc can follow imports outside `api/`.
- Broadened `include` to `["api/**/*.ts", "src/lib/appraise.ts", "src/lib/tld-prestige.ts", "src/types/**/*.ts"]`.
- Compiled output mirrors the source tree under `dist-api/` (i.e. `dist-api/api/server.js`,
  not `dist-api/server.js`).

### 2. `package.json` scripts
Replaced the `tsx` invocations with build-then-run on the compiled JS. `node --watch`
(stable since Node 18.11) gives the same restart-on-change experience `tsx` provided.

```jsonc
"dev:api": "pnpm run build:api && node --watch dist-api/api/server.js",
"build:api": "tsc -p tsconfig.api.json",
"start":    "node dist-api/api/server.js",
"migrate":  "pnpm run build:api && node dist-api/api/migrate.js"
```

## Notes / Follow-ups
- No new dependencies added. Node 22's native TS support (`--experimental-strip-types`)
  was considered but rejected because the codebase uses `.js` import extensions
  (required for the existing `build:api` + `start` ESM flow), which strip-types
  cannot resolve to `.ts` source files.
- `dev:api` rebuilds on every start. For larger APIs you'd add `tsc --watch` in parallel
  with a process supervisor, but for the current codebase the upfront compile is fast
  enough and the chained `&&` keeps it to one command.
- The `serveStatic: root path './dist' is not found` warning at startup is pre-existing
  and unrelated to this refactor (it expects the Vite frontend build output).

## Verification
- `pnpm run build:api` → exits 0, produces `dist-api/api/server.js` and friends.
- `node dist-api/api/server.js` → env validation passes, models load, Hono listens on
  port 3000. (Smoke-tested with `timeout 5`.)
