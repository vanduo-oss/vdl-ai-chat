# @vanduo-oss/vdl-ai-chat

Headless on-device AiChat (LiteRT Gemma / WebLLM) with FOSS guardrails and CSP-safe markdown.

**Source of truth:** [`openspec/`](./openspec/). This README is a short usage guide.

## Install

```bash
pnpm add @vanduo-oss/vdl-ai-chat
```

Recommended default model: **Gemma 4 E2B LiteRT** (`gemma-4-E2B-it-web`). Requires a WebGPU-capable browser (Chrome/Edge; Apple Silicon M-series is the local QA baseline).

## Quick start

```ts
import { AiChat, MODEL_OPTIONS } from '@vanduo-oss/vdl-ai-chat';
import { validateLlmInput } from '@vanduo-oss/vdl-ai-chat/guardrails/llm';
import { labsMarkdownToHtml } from '@vanduo-oss/vdl-ai-chat/markdown';

const chat = new AiChat({
  // omit modelId to use gemma-4-E2B-it-web
  loadLiteRT: async () => import('@litert-lm/core'),
  liteRtWasmPath: '/litert-wasm/', // same-origin WASM for CSP
  systemPromptOptions: { product: 'My App' },
});

await chat.load();
const reply = await chat.generate('Hello');
const html = labsMarkdownToHtml(reply);
```

## API highlights

| Export | Purpose |
| --- | --- |
| `AiChat` | Headless engine: `load()`, `generate()`, `generateWithTools()`, `registerTools()`, `dispose()` |
| `MODEL_OPTIONS` / `MODEL_GROUPS` | Catalog; default entry is Gemma 4 E2B LiteRT |
| `validateLlmInput` / `validateLlmOutput` | Deterministic FOSS jailbreak scanners |
| `validateToolCall` / `parseXmlToolCalls` | Tool allowlist + XML tool protocol |
| `labsMarkdownToHtml` | CSP-safe GFM subset (escape HTML; headings, lists, tables, fences, links) |

Constructor options of note:

- `modelId` — defaults to `gemma-4-E2B-it-web`
- `loadLiteRT` / `loadWebLLM` — inject bundled runtimes (required under strict CSP; avoids CDN)
- `liteRtWasmPath` — same-origin directory or `.js` URL for LiteRT WASM glue
- `systemPromptOptions` — `{ product, extra }` folded into the FOSS role-lock sandwich
- `toolProtocol` — `'auto' | 'native' | 'xml'`

## CSP / WASM

Under `script-src 'self'`, do **not** rely on the package CDN defaults. Bundle `@litert-lm/core` (or WebLLM) in your host and pass:

```ts
new AiChat({
  loadLiteRT: () => import('@litert-lm/core'),
  liteRtWasmPath: '/litert-wasm/',
});
```

Serve the LiteRT WASM assets from that same-origin path.

## WebGPU

LiteRT Gemma web builds need WebGPU. Local Chromium Playwright may need:

```bash
# example flags — adjust for your Chromium build
pnpm exec playwright test -c tests/e2e/playwright.config.ts
```

See `tests/e2e/playwright.config.ts` for `args` that enable WebGPU on Apple Silicon.

## LiteRT model sizes (E2B vs E4B)

- **E2B** (`gemma-4-E2B-it-web`, ~2 GB) — recommended default; reliable for CI/automation and headless Chrome.
- **E4B** (`gemma-4-E4B-it-web`, ~2.5 GB) — higher quality; **cold load in headless Chrome** may fail mid-download/stream. Prefer headed browser or a warm Cache Storage entry. Not required for package e2e (E2B only).

App-fetched weights are buffered to a `Blob` and passed to `Engine.create` (not re-streamed). Transient network failures retry a few times. Use `describeLoadProgress()` on `onProgress` events — `stage: 'error'` includes a human-readable `progressText` / `statusText`.

## Quality gates (local vs CI)

| Script | What it runs | Inference? |
| --- | --- | --- |
| `pnpm test` / `pnpm test:ci` | Vitest unit suite + ≥90% coverage on `src/` | No (mocked loaders) |
| `pnpm test:e2e` | Playwright: real LiteRT Gemma 4 E2B load + `generate()` | Yes (~2GB first download) |
| `pnpm test:local` | `test:ci` then `test:e2e` | Yes |
| `pnpm prepublishOnly` | `build` + `test:ci` | No |

CI (GitHub Actions) runs format, lint, typecheck, `test:ci`, build, pack dry-run, and audit — **never** downloads models or requires WebGPU.

Model weights for e2e cache under `tests/e2e/.model-cache/` (gitignored). First run can take 10+ minutes.

## Scripts

- `pnpm build` — vite lib + `.d.ts`
- `pnpm test:ci` — coverage unit suite
- `pnpm test:local` — CI suite + Playwright inference
- `pnpm typecheck` / `pnpm lint` / `pnpm format:check`

## Contributing / security

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

MIT
