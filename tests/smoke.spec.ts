import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  VDL_AI_CHAT_VERSION,
  MODEL_OPTIONS,
  TOOLS_UNSUPPORTED_ERROR,
  AiChat,
} from '../src/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('smoke', () => {
  it('version matches package.json', () => {
    expect(VDL_AI_CHAT_VERSION).toBe(pkg.version);
  });

  it('exposes LiteRT catalog options', () => {
    const litert = MODEL_OPTIONS.filter(
      (m: { backend?: string; litertKind?: string }) =>
        m.backend === 'litert' && m.litertKind === 'web-official',
    );
    expect(litert.length).toBeGreaterThan(0);
  });

  it('rejects tools on non-LiteRT models', async () => {
    const chat = new AiChat({ modelId: 'Qwen3-0.6B-q4f16_1-MLC' });
    chat.registerTools([{ name: 'ping', description: 'ping', parameters: { type: 'object' } }]);
    (chat as { _isLoaded: boolean; engine: object })._isLoaded = true;
    (chat as { engine: object }).engine = {};
    await expect(chat.generateWithTools('hi', { execute: async () => ({}) })).rejects.toThrow(
      TOOLS_UNSUPPORTED_ERROR,
    );
  });
});
