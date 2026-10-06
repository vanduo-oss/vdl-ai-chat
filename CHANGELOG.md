# Changelog

## Unreleased — October 2026

- Pin LiteRT 0.17.1; add typed cancellation, response/context budgets and bounded reference sources.
- Enforce one active generation and safe teardown across reset, model switches and pending loads.
- Validate tool schemas, bound execution and use native tool-response messages.
- Buffer complete checked output before callbacks, persistence and speech; discard canceled replies and reset contaminated context.
- Keep the base role useful for general conversation, writing and extraction while preserving prompt-injection and harmful-content boundaries.
- Preserve benign prompts and existing callback signatures; retain full visible history when context is trimmed.
- Curate six primary models and two compatibility precisions; retain three host-injected engines and separate documented model tools from executable integration.
- Remove retired catalog/workaround paths, preserving small deprecated exports and existing caches/history.
- Add bounded Unicode/confusable/encoding scans, selected PyRIT rules, pinned obscenity 0.4.6, contextual moderation and structured rejection events.
- Screen sources, imported history and tool data; render unsafe link destinations inertly.


## 0.1.1 — LiteRT load resilience

- Rewrite network/stream LiteRT load failures into actionable errors (headless/E4B + Cache Storage guidance).
- Retry transient model fetches in `loadLiteRTModelBytes` (optional `fetchRetries`; defaults preserve prior success path).
- Pass buffered `Blob` to `Engine.create` for app-fetched LiteRT weights (avoids a second ReadableStream that can fail mid-load under headless Chrome). `asStream: true` remains available for explicit stream consumers.
- `describeLoadProgress` surfaces `message` on the `error` stage for host UIs.
- README notes headless E4B cold-load limits; E2B remains the recommended default/automation path.

## 0.1.0 — public release

First public npm release of `@vanduo-oss/vwl-ai-chat`.

- Headless on-device `AiChat` (LiteRT Gemma / WebLLM) with injectable loaders and CSP-safe `liteRtWasmPath`
- Recommended default model: Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web`)
- FOSS LLM + tool guardrails and CSP-safe markdown helpers
- Dual QA gates: CI unit/coverage suite (no inference) and local Playwright WebGPU load+generate
- Publish-ready package metadata (`publishConfig.access: public`)
