# qa-gates Specification

## Purpose
Defines dual QA gates and release documentation for publishing `@vanduo-oss/vdl-ai-chat` while keeping remote CI free of WebGPU model inference.
## Requirements
### Requirement: dual-test-tiers

The repository MUST provide two test tiers: a CI-safe unit/coverage suite and a local-only inference suite that loads the recommended Gemma 4 E2B LiteRT model and runs real generation on developer hardware (baseline: Apple Silicon M4 with ≥24GB unified memory).

#### Scenario: CI suite excludes inference

- **WHEN** `pnpm test:ci` (or the default CI job) runs in GitHub Actions
- **THEN** tests MUST NOT download Gemma model weights or require WebGPU
- **AND** coverage thresholds of at least 90% lines, branches, and functions on `src/` MUST be enforced for the CI suite

#### Scenario: local suite loads Gemma 4 E2B

- **WHEN** a developer runs `pnpm test:local` on a WebGPU-capable machine
- **THEN** the suite MUST load model id `gemma-4-E2B-it-web` via LiteRT
- **AND** MUST complete a real `generate()` call that returns non-empty sanitized text
- **AND** model cache paths MUST be gitignored

### Requirement: release-docs

The repository MUST ship README guidance for install, CSP/WASM injectors, recommended default model, local-vs-CI QA, plus SECURITY.md and CONTRIBUTING.md suitable for a public MIT package.

#### Scenario: docs describe default model and gates

- **WHEN** a consumer reads README.md
- **THEN** Gemma 4 E2B LiteRT MUST be documented as the recommended default
- **AND** local inference QA vs CI limitations MUST be stated

### Requirement: E4B headless is not a CI gate

Local/CI quality gates MUST continue to treat Gemma 4 E2B LiteRT as the required inference model. E4B cold-load under headless Chrome MUST NOT be required for release. Documentation MUST note that E4B may fail mid-load in headless Chrome and that headed or warm-cache loads are preferred.

#### Scenario: e2e remains E2B
- **WHEN** `pnpm test:e2e` / local inference gate is defined
- **THEN** it targets Gemma 4 E2B LiteRT
- **AND** E4B headless cold load is not mandatory

