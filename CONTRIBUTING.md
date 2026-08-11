# Contributing

Thanks for helping with `@vanduo-oss/vdl-ai-chat`.

## Prerequisites

- Node `>=20.19`
- `pnpm` `>=10` (see `packageManager` in `package.json`)
- For local inference QA: WebGPU browser / Playwright Chromium on Apple Silicon (M4 baseline)

## Workflow

1. OpenSpec is the source of truth under `openspec/`. Prefer an OpenSpec change for behavior work.
2. Install: `pnpm install`
3. Develop with:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm format`
   - `pnpm test:ci` (unit + coverage ≥90% on `src/`, mocked loaders — no WebGPU)
4. Before a release candidate, run `pnpm test:local` on a WebGPU machine (CI suite + Playwright Gemma 4 E2B).

## Tests

- **CI / unit:** mock `loadLiteRT` / `loadWebLLM`; never download model weights in Vitest.
- **E2E:** `tests/e2e/` loads real `@litert-lm/core` and `gemma-4-E2B-it-web`. Cache is `tests/e2e/.model-cache/` (gitignored).

## Pull requests

- Keep the public API compatible with existing hosts (e.g. ts-school).
- Do not add runtime npm dependencies without an OpenSpec design decision.
- Ensure `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, and `pnpm build` pass.
