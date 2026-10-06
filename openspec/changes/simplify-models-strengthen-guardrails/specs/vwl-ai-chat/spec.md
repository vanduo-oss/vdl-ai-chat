## ADDED Requirements

### Requirement: Curated browser-local catalog
The catalog MUST offer Gemma E2B/E4B, Tiny Qwen3 0.6B and LFM2.5 230M/350M/2.6B with two precision variants. Engine and tool capability MUST distinguish documented model support from integrated execution. Retired models MUST NOT download silently.

#### Scenario: Primary choices and variants
- **GIVEN** the model picker
- **WHEN** a user selects a primary model
- **THEN** only its available precisions appear and Gemma E2B remains the initial default

### Requirement: Complete checked replies
Chat MUST screen complete replies before display, persistence, callbacks or speech and MUST discard cancelled partial output.

#### Scenario: Harmful text crosses chunks
- **GIVEN** a reply whose prohibited text spans multiple generated chunks
- **WHEN** generation completes
- **THEN** only a safe replacement is exposed and rejected text is absent from history

## MODIFIED Requirements

### Requirement: LiteRT Gemma is default catalog path
The package MUST expose six primary models with Gemma E2B as the default and two explicit compatibility precisions. Community MLC Gemma and portable LiteRT spikes MUST NOT remain active catalog paths. Small deprecated compatibility helpers MAY remain without runtime loading paths.

#### Scenario: Default remains selectable
- **WHEN** the host constructs AiChat without a model ID
- **THEN** Gemma E2B is selected and no weights download until load

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

### Requirement: streaming generate and tool loop
AiChat MUST provide `generate` and `generateWithTools`, keeping callback signatures while delivering only complete checked replies. Internal runtime streams MUST remain cancellable. Tool execution MUST be limited to integrations declaring `capabilities.tools` and arguments/results MUST be checked at their boundaries.

#### Scenario: Completed delivery replaces partial callbacks
- **WHEN** a runtime produces multiple chunks
- **THEN** the host receives one complete checked answer or a fixed safe response

#### Scenario: unsupported tools
- **GIVEN** a non-LiteRT model id
- **WHEN** `generateWithTools` is called
- **THEN** it rejects with `TOOLS_UNSUPPORTED_ERROR`
