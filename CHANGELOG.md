# Changelog

## 0.1.1 — LiteRT load resilience

- Rewrite network/stream LiteRT load failures into actionable errors (headless/E4B + Cache Storage guidance).
- Retry transient model fetches in `loadLiteRTModelBytes` (optional `fetchRetries`; defaults preserve prior success path).
- Pass buffered `Blob` to `Engine.create` for app-fetched LiteRT weights (avoids a second ReadableStream that can fail mid-load under headless Chrome). `asStream: true` remains available for explicit stream consumers.
- `describeLoadProgress` surfaces `message` on the `error` stage for host UIs.
- README notes headless E4B cold-load limits; E2B remains the recommended default/automation path.

## 0.1.0 — public release

First public npm release of `@vanduo-oss/vdl-ai-chat`.

- Headless on-device `AiChat` (LiteRT Gemma / WebLLM) with injectable loaders and CSP-safe `liteRtWasmPath`
- Recommended default model: Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web`)
- FOSS LLM + tool guardrails and CSP-safe markdown helpers
- Dual QA gates: CI unit/coverage suite (no inference) and local Playwright WebGPU load+generate
- Publish-ready package metadata (`publishConfig.access: public`)
