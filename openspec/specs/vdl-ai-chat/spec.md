# vdl-ai-chat Specification

## Purpose
Headless on-device AiChat engine with LiteRT Gemma / WebLLM backends, streaming generate, and tool loop.
## Requirements
### Requirement: LiteRT Gemma is default catalog path

The package MUST expose `MODEL_OPTIONS` with official LiteRT Gemma (E2B) as the recommended default path for hosts. Community MLC Gemma entries MUST be labeled experimental where present. The AiChat constructor MUST default to `gemma-4-E2B-it-web` when `modelId` is omitted. Documentation and catalog labels MUST recommend Gemma 4 E2B LiteRT as the default on-device path (LiteRT-LM Web early preview; WebGPU required).

#### Scenario: catalog includes LiteRT web-official
- **GIVEN** `MODEL_OPTIONS`
- **WHEN** a host filters `backend === 'litert' && litertKind === 'web-official'`
- **THEN** at least one Gemma E2B option is available

#### Scenario: default model id
- **WHEN** a host constructs `new AiChat({})` without `modelId`
- **THEN** the effective model id MUST be `gemma-4-E2B-it-web`

#### Scenario: catalog marks recommended default
- **WHEN** a host inspects `MODEL_OPTIONS` for the recommended entry
- **THEN** the Gemma 4 E2B LiteRT option MUST be present and labeled as the default recommendation

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

### Requirement: LiteRT load resilience

`AiChat` MUST buffer app-fetched LiteRT model weights and pass a `Blob` to `Engine.create` (not a re-created `ReadableStream` from `blob.stream()`). `loadLiteRTModelBytes` MUST retry transient network/fetch failures a bounded number of times and MUST NOT retry hard HTTP failures such as 404. `rewriteLiteRTLoadError` MUST rewrite recognizable network/stream load failures into actionable guidance mentioning retry, headless E4B limits, and Cache Storage. `describeLoadProgress` MUST surface the error message when `stage` is `error`.

#### Scenario: Engine.create receives Blob for app-fetched models
- **GIVEN** a LiteRT web-official model loaded via `AiChat.load()`
- **WHEN** `Engine.create` is invoked
- **THEN** `model` is a `Blob`

#### Scenario: network stream errors are rewritten
- **GIVEN** an error message containing `JS Stream Error` / `network error`
- **WHEN** `rewriteLiteRTLoadError` runs
- **THEN** the returned message mentions retry and headless/E4B or Cache Storage guidance

#### Scenario: error progress includes message
- **GIVEN** progress data `{ stage: 'error', message: 'Failed to fetch model weights' }`
- **WHEN** `describeLoadProgress` runs
- **THEN** `progressText` includes that message

#### Scenario: transient fetch is retried
- **GIVEN** the first `fetch` throws a network error and the second succeeds
- **WHEN** `loadLiteRTModelBytes` runs
- **THEN** the load completes with a `Blob` model source

