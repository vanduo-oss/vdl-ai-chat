# repo-scaffold Specification

## Purpose
Package scaffold, Labs-sibling metadata, build/types, and GitHub Actions CI for @vanduo-oss/vwl-ai-chat.
## Requirements
### Requirement: package-metadata

The package MUST declare `@vanduo-oss/vwl-ai-chat` with `type: "module"`, `packageManager: "pnpm@10.28.2"`, engines `node >=20.19.0` and `pnpm >=10`, MIT license, and exports for `.`, `./guardrails/llm`, `./guardrails/tools`, `./markdown`. It MUST be a Labs sibling repo (`"private": true`) and MUST NOT declare `publishConfig` for public npm.

#### Scenario: version constant syncs
- **GIVEN** `package.json` version `0.1.1`
- **WHEN** smoke tests run
- **THEN** `VWL_AI_CHAT_VERSION` equals that version

#### Scenario: package is private Labs sibling
- **WHEN** `package.json` is inspected
- **THEN** `"private"` MUST be `true`
- **AND** `publishConfig` MUST be absent

### Requirement: build-and-types

The package MUST build library artifacts via `pnpm build` and emit TypeScript declarations for all exported entry points. `pnpm build` MUST emit ESM+CJS under `dist/` plus declaration files for each export entry.

#### Scenario: build succeeds
- **GIVEN** dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/index.d.ts` exists
- **AND** `dist/` MUST contain ESM, CJS, and `.d.ts` outputs for the main and subpath exports

### Requirement: github-actions-ci

The repository MUST include a GitHub Actions workflow on push/PR to `main` that runs format check, lint, typecheck, `test:ci`, build, and dependency audit. It MUST NOT run npm publish or treat the package as a registry release.

#### Scenario: CI does not run model inference
- **WHEN** the CI workflow executes
- **THEN** it MUST NOT run Playwright WebGPU Gemma load/generate tests
