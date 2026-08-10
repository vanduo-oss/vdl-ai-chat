# vdl-ai-chat Specification

## Purpose
TBD - created by archiving change promote-vdl-ai-chat. Update Purpose after archive.
## Requirements
### Requirement: LiteRT Gemma is default catalog path

The package MUST expose `MODEL_OPTIONS` with official LiteRT Gemma (E2B) as the recommended default path for hosts. Community MLC Gemma entries MUST be labeled experimental where present.

#### Scenario: catalog includes LiteRT web-official
- **GIVEN** `MODEL_OPTIONS`
- **WHEN** a host filters `backend === 'litert' && litertKind === 'web-official'`
- **THEN** at least one Gemma E2B option is available

### Requirement: injectable runtimes

`AiChat` MUST accept optional `loadLiteRT`, `loadWebLLM`, and `liteRtWasmPath` constructor options so CSP hosts can bundle runtimes instead of using CDN defaults.

#### Scenario: custom LiteRT loader
- **GIVEN** a host-provided `loadLiteRT` function
- **WHEN** `AiChat.load()` runs for a LiteRT model
- **THEN** the custom loader is invoked rather than the CDN import alone

### Requirement: streaming generate and tool loop

`AiChat` MUST provide `generate` and `generateWithTools`. Tool calling MUST be limited to supported LiteRT Gemma models and MUST validate tool names via allowlist guardrails before execute.

#### Scenario: unsupported tools
- **GIVEN** a non-LiteRT model id
- **WHEN** `generateWithTools` is called
- **THEN** it rejects with `TOOLS_UNSUPPORTED_ERROR`

### Requirement: system prompt options

Hosts MUST be able to set `systemPromptOptions` (`product`, `extra`) and register tools; composed prompts MUST include FOSS role-lock sandwich text from LLM guardrails.

#### Scenario: product context
- **GIVEN** `systemPromptOptions.product = 'TypeScript School'`
- **WHEN** the engine composes the system prompt
- **THEN** the prompt mentions that product

