## MODIFIED Requirements

### Requirement: package-metadata

The package MUST declare `@vanduo-oss/vdl-ai-chat` with `type: "module"`, `packageManager: "pnpm@10.28.2"`, engines `node >=20.19.0` and `pnpm >=10`, MIT license, and exports for `.`, `./guardrails/llm`, `./guardrails/tools`, `./markdown`. It MUST be publishable (MUST NOT set `"private": true`) with `publishConfig.access` of `public`.

#### Scenario: version constant syncs
- **GIVEN** `package.json` version `0.1.1`
- **WHEN** smoke tests run
- **THEN** `VDL_AI_CHAT_VERSION` equals that version

#### Scenario: package is not private
- **WHEN** `package.json` is inspected for a release candidate
- **THEN** `"private"` MUST be absent or false
- **AND** `publishConfig.access` MUST be `public`
