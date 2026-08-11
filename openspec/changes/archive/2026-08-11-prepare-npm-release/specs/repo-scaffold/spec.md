## MODIFIED Requirements

### Requirement: package-metadata

The package MUST declare `@vanduo-oss/vdl-ai-chat` with `type: "module"`, `packageManager: "pnpm@10.28.2"`, engines `node >=20.19.0` and `pnpm >=10`, MIT license, and exports for `.`, `./guardrails/llm`, `./guardrails/tools`, `./markdown`. It MUST be publishable (MUST NOT set `"private": true`) with `publishConfig.access` of `public`.

#### Scenario: version constant syncs
- **GIVEN** `package.json` version `0.1.0`
- **WHEN** smoke tests run
- **THEN** `VDL_AI_CHAT_VERSION` equals that version

#### Scenario: package is not private
- **WHEN** `package.json` is inspected for a release candidate
- **THEN** `"private"` MUST be absent or false
- **AND** `publishConfig.access` MUST be `public`

### Requirement: build-and-types

The package MUST build library artifacts via `pnpm build` and emit TypeScript declarations for all exported entry points. `pnpm build` MUST emit ESM+CJS under `dist/` plus declaration files for each export entry.

#### Scenario: build succeeds
- **GIVEN** dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/index.d.ts` exists
- **AND** `dist/` MUST contain ESM, CJS, and `.d.ts` outputs for the main and subpath exports

## REMOVED Requirements

### Requirement: no-ci-while-private

**Reason:** The package is being prepared for public npm release; CI is required as a remote quality gate.

**Migration:** Replace with GitHub Actions CI that runs format, lint, typecheck, unit coverage, build, pack dry-run, and audit — without WebGPU inference.

## ADDED Requirements

### Requirement: github-actions-ci

The repository MUST include a GitHub Actions workflow on push/PR to `main` that runs format check, lint, typecheck, `test:ci`, build, `pnpm pack --dry-run`, and dependency audit.

#### Scenario: CI does not run model inference
- **WHEN** the CI workflow executes
- **THEN** it MUST NOT run Playwright WebGPU Gemma load/generate tests
