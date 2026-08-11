## Context

See proposal.md — Why. Package is headless, zero runtime deps, injectable LiteRT/WebLLM. Existing vitest excludes `tests/e2e/**`. LiteRT Gemma web requires WebGPU (Chromium/Playwright on Mac M4). Model weights ~2GB — cache under gitignored `tests/e2e/.model-cache/`.

## Goals / Non-Goals

**Goals:**
- Publish-ready gates with lean CI and full local inference QA
- Keep API compatible with ts-school dogfood
- Document recommended Gemma 4 E2B default

**Non-Goals:**
- Changing inference backends or adding runtime npm deps
- Automating npm publish credentials

## Decisions

1. **Playwright + Chromium WebGPU for local e2e** — LiteRT web needs a browser; Node cannot exercise WebGPU. Alternative: manual demo — rejected (not a gate).
2. **Coverage ≥90% on CI suite only** — Real engine paths stay in e2e; unit tests mock loaders. Alternative: 100% including e2e LOC — rejected (CDN/WebGPU branches not CI-stable).
3. **Separate scripts `test:ci` vs `test:local`** — CI never installs/runs inference. Alternative: single suite with env skip — still risk of accidental CI timeouts; explicit scripts preferred.
4. **First public version stays 0.1.0** — Already the package version; no bump needed for publish readiness.

## Risks / Trade-offs

- [Long first-download of E2B] → Cache gitignored model files; document timeout budget
- [WebGPU flaky in headless] → Prefer headed/local Chromium flags that enable WebGPU; document M4 baseline
- [Lint dead code in progress helpers] → Remove or wire unused helpers during format/lint pass

## Migration Plan

1. Land gates + docs on `main` with CI green
2. Run `pnpm test:local` on M4
3. Tag `v0.1.0`, GitHub Release
4. Human `npm publish`
5. ts-school → `^0.1.0` and simplify CI

## Open Questions

None — publish is human-gated by design.
