## ADDED Requirements

### Requirement: package-metadata

The package MUST declare `@vanduo-oss/vdl-ai-chat` with `type: "module"`, `packageManager: "pnpm@10.28.2"`, engines `node >=20.19.0` and `pnpm >=10`, MIT license, and exports for `.`, `./guardrails/llm`, `./guardrails/tools`, `./markdown`. While unpublished it MAY set `"private": true` but MUST retain publish-ready `publishConfig`.

#### Scenario: version constant syncs
- **GIVEN** `package.json` version `0.1.0`
- **WHEN** smoke tests run
- **THEN** `VDL_AI_CHAT_VERSION` equals that version

### Requirement: build-and-types

`pnpm build` MUST emit ESM+CJS under `dist/` plus declaration files for each export entry.

#### Scenario: build succeeds
- **GIVEN** dependencies installed
- **WHEN** `pnpm build` runs
- **THEN** it exits 0 and `dist/index.d.ts` exists

### Requirement: no-ci-while-private

The repository MUST NOT include GitHub Actions CI workflows while the package remains private/unpublished.

#### Scenario: no workflow files
- **GIVEN** a fresh clone
- **WHEN** `.github/workflows` is inspected
- **THEN** no workflow files are present
