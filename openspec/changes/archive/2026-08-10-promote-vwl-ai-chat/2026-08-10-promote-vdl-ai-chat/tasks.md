## 1. Scaffold

- [x] 1.1 Create package.json, tsconfig, vite, vitest, eslint, prettier, hardened .npmrc (no CI)
- [x] 1.2 Add README/CHANGELOG/LICENSE pointing OpenSpec as SoT

## 2. OpenSpec

- [x] 2.1 Write proposal, design, capability specs, tasks

## 3. Implementation

- [x] 3.1 Port AiChat headless engine to TypeScript
- [x] 3.2 Port LLM/tools/core guardrails
- [x] 3.3 Port markdown helper with `labsMarkdownToHtml` + `markdownToHtml`
- [x] 3.4 Export map: `.`, `./guardrails/llm`, `./guardrails/tools`, `./markdown`

## 4. Tests & gates

- [x] 4.1 Vitest: guardrails, markdown, smoke version, tool helpers
- [x] 4.2 `pnpm build` and `pnpm test` pass

## 5. Archive

- [x] 5.1 `openspec validate --strict` and archive change into `openspec/specs/`
