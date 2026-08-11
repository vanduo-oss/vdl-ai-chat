## MODIFIED Requirements

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
