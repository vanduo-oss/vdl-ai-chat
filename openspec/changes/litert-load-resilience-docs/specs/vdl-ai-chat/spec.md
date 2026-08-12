## ADDED Requirements

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
