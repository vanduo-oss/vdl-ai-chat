# Changelog

## 0.1.0 — public release

First public npm release of `@vanduo-oss/vdl-ai-chat`.

- Headless on-device `AiChat` (LiteRT Gemma / WebLLM) with injectable loaders and CSP-safe `liteRtWasmPath`
- Recommended default model: Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web`)
- FOSS LLM + tool guardrails and CSP-safe markdown helpers
- Dual QA gates: CI unit/coverage suite (no inference) and local Playwright WebGPU load+generate
- Publish-ready package metadata (`publishConfig.access: public`)
