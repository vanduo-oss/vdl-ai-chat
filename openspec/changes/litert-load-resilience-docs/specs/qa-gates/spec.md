## ADDED Requirements

### Requirement: E4B headless is not a CI gate

Local/CI quality gates MUST continue to treat Gemma 4 E2B LiteRT as the required inference model. E4B cold-load under headless Chrome MUST NOT be required for release. Documentation MUST note that E4B may fail mid-load in headless Chrome and that headed or warm-cache loads are preferred.

#### Scenario: e2e remains E2B
- **WHEN** `pnpm test:e2e` / local inference gate is defined
- **THEN** it targets Gemma 4 E2B LiteRT
- **AND** E4B headless cold load is not mandatory
