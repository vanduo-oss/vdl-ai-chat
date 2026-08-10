## Context

Labs shipped AiChat as plain ESM inside `@vanduo-oss/vdl-engines`. This change extracts it into `@vanduo-oss/vdl-ai-chat` with strict TypeScript packaging (vd3-style) while preserving the headless API ts-school already uses.

## Goals / Non-Goals

**Goals:** typed public API, injectable LiteRT/WebLLM loaders, FOSS guardrails + markdown subpath exports, vitest coverage, OpenSpec SoT.

**Non-Goals:** Vue UI, npm publish, CI, labs rewire, third guardrails package.

## Decisions

1. **Headless only** — hosts (ts-school) supply UI shells.
2. **Guardrails duplicated into this package** (`llm` + `tools` + `core`) rather than a shared package.
3. **Markdown ships here** because ts-school chat/notes/prose already consume `labsMarkdownToHtml`.
4. **CDN defaults + injectors** remain for CSP hosts.
5. **No CI** while private; local `pnpm build` / `pnpm test` are the gates.

## Risks / Trade-offs

- Large `ai-chat.ts` port retains pragmatic typing (`noImplicitAny: false`) on the engine body while public exports are typed via declarations — acceptable for first extract; tighten incrementally.
- Duplicated guardrails `core` vs hybrid-search — intentional until a shared package is justified.

## Migration Plan

1. Ship package via `file:` to ts-school.
2. Later: publish to npm and drop `file:`.
3. Labs demos stay on local engines until a follow-up.

## Open Questions

- None for this change.
