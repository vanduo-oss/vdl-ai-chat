## Why

The package is structurally extracted but still `"private": true`, with no CI, failing lint/format, thin docs, and no dual local-vs-CI test story. We need a first public npm release so ts-school and other hosts can depend on `@vanduo-oss/vdl-ai-chat` from the registry.

## What Changes

- Remove `"private": true` and prepare publish metadata for `@vanduo-oss/vdl-ai-chat@0.1.0`
- Add GitHub Actions CI (format, lint, typecheck, coverage unit suite, build, pack dry-run, audit) — **no** WebGPU/model inference on CI
- Add local Mac M4 QA gate: Playwright WebGPU loads Gemma 4 E2B LiteRT and runs real `generate()`
- Enforce Prettier/ESLint clean; Vitest coverage thresholds ≥90% on `src/` for CI suites
- Document Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web`) as the recommended default; expand README; add SECURITY.md / CONTRIBUTING.md
- Update OpenSpec Purpose sections and replace `no-ci-while-private` with CI + dual-gate requirements
- Tag `v0.1.0` + GitHub Release after local gates pass; human runs `npm publish`

## Capabilities

### New Capabilities

- `qa-gates`: Dual test tiers — CI unit/coverage vs local WebGPU Gemma 4 E2B inference; release hygiene docs

### Modified Capabilities

- `repo-scaffold`: Allow CI; publishable package metadata; remove no-ci-while-private
- `vdl-ai-chat`: Normative recommended default model (Gemma 4 E2B LiteRT)

## Impact

- Semver: first public `0.1.0` — API compatible with existing ts-school `file:` dogfood
- After publish, ts-school switches from `file:` to npm `^0.1.0` and drops sibling-clone CI steps
- No new runtime npm dependencies

## Non-goals

- Agent does not run `npm publish` (human login required)
- No Vue UI, labs rewire, or shared guardrails package
- No npm provenance automation in this change
- CI will not download or run Gemma models
