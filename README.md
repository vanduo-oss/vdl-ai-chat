# @vanduo-oss/vdl-ai-chat

Headless on-device AiChat (LiteRT Gemma / WebLLM) with FOSS guardrails and CSP-safe markdown.

This is a **Labs sibling repo**, not a public npm package. Consume it via `link:` /
workspace next to [Vanduo Labs](https://github.com/vanduo-oss/labs).

**Source of truth:** [`openspec/`](./openspec/). This README is a short usage guide.

## Install (sibling link)

```bash
git clone https://github.com/vanduo-oss/vdl-ai-chat.git
cd vdl-ai-chat && pnpm install && pnpm run build
```

In the host `package.json`:

```json
{
  "dependencies": {
    "@vanduo-oss/vdl-ai-chat": "link:../vdl-ai-chat"
  }
}
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
- `toolProtocol` — `'auto' | 'native' | 'xml'`; auto uses native LiteRT calls. XML is an explicit compatibility choice, never a silent fallback.

## Conversation lifecycle

```ts
const abort = new AbortController();
await chat.generate('How does the dock work?', {
  signal: abort.signal,
  maxOutputTokens: 768,
  contextTokenBudget: 8192,
  sources: [{ id: 'dock:props', title: 'Dock props', text: 'A trusted host-selected excerpt' }],
  onUpdate: safeText => render(safeText),
  onContext: ({ omittedTurns }) => showOmissionNotice(omittedTurns),
});
// Stop from the host: abort.abort() or chat.cancel().
```

The original `generate(text, onUpdate, onFinish)` callbacks remain supported. Only one generation runs at a time. Cancellation rejects with `AbortError` and never commits a partial turn. `reset()`, `setHistory()`, `setModelId()` and `dispose()` invalidate active output. Disposal also releases an engine that finishes loading after navigation. Await asynchronous teardown before reusing a model.

`getHistory()` returns a copy. Context budgeting reserves output space and retains recent complete turns while keeping visible history intact. The estimate is conservative; LiteRT's token count also triggers a native-state rebuild when needed. Supplied references are bounded untrusted data, never extra system instructions. Hosts must validate citation IDs before rendering source links.

Tools validate plain JSON, types, required/properties/additionalProperties, arrays, enums and numeric/string/array bounds. Unsupported schema keywords fail closed. Native results use `tool_response` messages; XML values are escaped. Defaults: 4 rounds, 8 calls, 15 seconds per tool, 8 KB result; host options are capped. Executors receive an optional third `{ signal }` argument and should honor it. A timeout stops awaiting a tool; it cannot undo external side effects.

Streamed and final text pass the output guard before callbacks. These deterministic checks reduce protocol misuse; they do not establish factual accuracy. Render text through the safe markdown helper.

## CSP / WASM

Under `script-src 'self'`, do **not** rely on the package CDN defaults. Bundle `@litert-lm/core` (or WebLLM) in your host and pass:

```ts
new AiChat({
  loadLiteRT: () => import('@litert-lm/core'),
  liteRtWasmPath: '/litert-wasm/',
});
```

Pin `@litert-lm/core` to **0.17.1** and `@mlc-ai/web-llm` to **0.2.85** in the host. Serve matching LiteRT WASM assets from that same-origin path. Labs bundles WebLLM in a module worker and serves Tiny compiled model WASM locally. Its production CSP allows WASM compilation without general JavaScript eval.

## WebGPU

LiteRT Gemma web builds need WebGPU. Local Chromium Playwright may need:

```bash
# example flags — adjust for your Chromium build
pnpm exec playwright test -c tests/e2e/playwright.config.ts
```

See `tests/e2e/playwright.config.ts` for `args` that enable WebGPU on Apple Silicon.

## LiteRT model sizes (E2B vs E4B)

- **E2B** (`gemma-4-E2B-it-web`, ~2 GB) — recommended default; reliable for CI/automation and headless Chrome.
- **E4B** (`gemma-4-E4B-it-web`, ~3.0 GB) — quality option; the current artifact is 2,969,059,328 bytes. Cold and warm loads passed the local Chrome evaluation. Available browser memory and storage still matter. Package e2e uses E2B; the Labs evaluation covers all three curated models.

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
