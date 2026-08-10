# @vanduo-oss/vdl-ai-chat

Headless on-device AiChat (LiteRT Gemma / WebLLM) with FOSS guardrails and CSP-safe markdown.

**Source of truth:** [`openspec/`](./openspec/). This README is a short usage guide.

## Install

```bash
pnpm add @vanduo-oss/vdl-ai-chat
# or local dogfood:
# "file:../0_vanduo/vdl-ai-chat"
```

Private for now (`"private": true`); not published to npm yet.

## Usage

```ts
import { AiChat, MODEL_OPTIONS } from '@vanduo-oss/vdl-ai-chat';
import { validateLlmInput } from '@vanduo-oss/vdl-ai-chat/guardrails/llm';
import { labsMarkdownToHtml } from '@vanduo-oss/vdl-ai-chat/markdown';

const chat = new AiChat({
  modelId: MODEL_OPTIONS.find((m) => m.backend === 'litert')?.id,
  loadLiteRT: async () => import('@litert-lm/core'),
  liteRtWasmPath: '/litert-wasm/',
  systemPromptOptions: { product: 'My App' },
});

await chat.load();
const reply = await chat.generate('Hello');
```

## Scripts

- `pnpm build` — vite lib + `.d.ts`
- `pnpm test` — vitest
- `pnpm typecheck` / `pnpm lint`

## License

MIT
