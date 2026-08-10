## Why

Promote the labs headless AiChat engine into a standalone TypeScript package so ts-school (and other hosts) can dogfood `@vanduo-oss/vdl-ai-chat` without depending on the labs monolith.

## What Changes

- Standalone `@vanduo-oss/vdl-ai-chat` package (private for now) with vite lib build and `.d.ts`
- Port `ai-chat.js`, LLM/tools guardrails, and CSP-safe markdown to TypeScript
- Vitest coverage for guardrails, markdown, smoke/version, and tool-calling helpers
- OpenSpec becomes the source of truth for behavior

## Capabilities

### New Capabilities

- `repo-scaffold`: package metadata, hardened install, build, quality gates (no CI while private)
- `vdl-ai-chat`: headless AiChat API (LiteRT default, tool calling, injectors, progress)
- `vdl-guardrails-llm`: deterministic LLM input/output and tool-call validation
- `vdl-markdown`: CSP-safe markdown → HTML for assistant/notes content

### Modified Capabilities

- (none — greenfield package)

## Impact

- ts-school will switch from `@vanduo-oss/vdl-engines/ai-chat.js` to this package
- Labs keeps its local copy for demos (not rewired this change)

## Non-goals

- npm publish / public registry
- CI workflows
- Vue / DOM UI (`AiChatUI`)
- Shared guardrails package
- Rewiring labs demos
