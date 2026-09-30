## MODIFIED Requirements

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
