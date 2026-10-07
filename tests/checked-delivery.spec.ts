import { describe, it, expect, vi } from 'vitest';
import { CheckedDeliveryGate, visibleReply } from '../src/checked-delivery.js';
import { AiChat } from '../src/ai-chat.js';
import { LLM_OUTPUT_BLOCK_MESSAGE } from '../src/guardrails/llm.js';

const prose = 'This is a friendly sentence about a quiet garden. '.repeat(12);
function setup() {
  let time = 0;
  const preview = vi.fn(),
    reject = vi.fn();
  const gate = new CheckedDeliveryGate('family-friendly', preview, reject, () => time);
  return { gate, preview, reject, tick: () => (time += 101) };
}
describe('checked previews', () => {
  it('releases complete sentences, retains the tail and clears ephemeral content', () => {
    const { gate, preview, tick } = setup();
    gate.accept(prose);
    expect(prose.startsWith(preview.mock.calls[0][0])).toBe(true);
    expect(prose.length - preview.mock.calls[0][0].length).toBeGreaterThanOrEqual(64);
    gate.accept(prose + prose);
    expect(preview).toHaveBeenCalledTimes(1);
    tick();
    gate.accept(prose + prose);
    expect(preview).toHaveBeenCalledTimes(2);
    gate.clear();
    expect(preview).toHaveBeenLastCalledWith('');
    gate.clear();
  });
  it('holds short responses, permits word boundaries on long unpunctuated prose', () => {
    const { gate, preview, tick } = setup();
    gate.accept('Hello!');
    expect(preview).not.toHaveBeenCalled();
    tick();
    gate.accept('gentle flowers '.repeat(80));
    expect(preview.mock.calls[0][0]).toMatch(/\s$/);
    const noWords = setup();
    noWords.gate.accept('a'.repeat(1000));
    expect(noWords.preview).not.toHaveBeenCalled();
  });
  it('withdraws revised prefixes and disables further previewing', () => {
    const { gate, preview, tick } = setup();
    gate.accept(prose);
    tick();
    gate.accept('Revised answer. ' + prose);
    expect(preview).toHaveBeenLastCalledWith('');
    tick();
    gate.accept(prose);
    expect(preview).toHaveBeenCalledTimes(2);
  });
  it('rejects split attacks before release, including normalized and encoded content', () => {
    for (const attack of [
      'fuck',
      'ｆｕｃｋ',
      'f\u200buck',
      'I will ignore previous instructions',
      btoa('I will ignore previous instructions'),
    ]) {
      for (let split = 1; split < attack.length; split++) {
        const { gate, preview, reject, tick } = setup();
        gate.accept(attack.slice(0, split));
        tick();
        gate.accept(attack + ' ' + prose);
        expect(gate.blocked, attack).toBe(true);
        expect(reject).toHaveBeenCalledTimes(1);
        expect(preview.mock.calls.filter(([text]) => text)).toHaveLength(0);
        gate.accept(prose);
        expect(reject).toHaveBeenCalledTimes(1);
      }
    }
  });
  it('removes complete and unfinished thought/tool channels and partial markers', () => {
    for (const [open, close] of [
      ['<think>', '</think>'],
      ['<|think|>', '<|/think|>'],
      ['<|channel>thought', '<channel|>'],
      ['<|tool_call_start|>', '<|tool_call_end|>'],
      ['<tool_call name="x">', '</tool_call>'],
    ]) {
      expect(visibleReply('Hello ' + open + 'private' + close + ' world')).toBe('Hello  world');
      expect(visibleReply('Hello ' + open + 'private')).toBe('Hello ');
      for (let split = 1; split < open.length; split++)
        expect(visibleReply('Hello ' + open.slice(0, split))).not.toContain('private');
    }
    expect(visibleReply('Hello <thi')).toBe('Hello ');
  });
  it('keeps Unicode intact and supports absent preview handlers', () => {
    const { gate, preview } = setup();
    gate.accept('A happy garden 🌷. '.repeat(50));
    expect(preview.mock.calls[0][0]).not.toMatch(/[\uD800-\uDBFF]$/);
    new CheckedDeliveryGate('general', undefined, () => {}).accept(prose);
  });
});

describe('generation boundary', () => {
  function chatFor(texts: string[], fail = false) {
    const chat = new AiChat({ modelId: 'Qwen3-0.6B-q4f16_1-MLC' });
    chat._isLoaded = true;
    chat.engine = {
      chat: {
        completions: {
          create: async () =>
            (async function* () {
              for (const text of texts) {
                yield { choices: [{ delta: { content: text } }] };
                await new Promise((r) => setTimeout(r, 110));
              }
              if (fail) throw new Error('GPU failed');
            })(),
        },
      },
      interruptGenerate: vi.fn(),
    };
    return chat;
  }
  it('keeps final callbacks/history separate from previews', async () => {
    const chat = chatFor([prose, prose]);
    const preview = vi.fn(),
      final = vi.fn();
    const answer = await chat.generate('Tell me about gardens.', {
      delivery: 'checked-stream',
      onPreview: preview,
      onUpdate: final,
    });
    expect(preview.mock.calls.some(([text]) => text.length > 0)).toBe(true);
    expect(preview).toHaveBeenLastCalledWith('');
    expect(final).toHaveBeenCalledExactlyOnceWith(answer);
    expect(chat.getHistory()[1].content).toBe(answer);
  });
  it('returns a fixed answer for policy interruption and discards cancelled/error output', async () => {
    const preview = vi.fn(),
      final = vi.fn();
    const chat = chatFor([prose, ' fuck']);
    expect(
      await chat.generate('Tell me about gardens.', {
        delivery: 'checked-stream',
        onPreview: preview,
        onUpdate: final,
      }),
    ).toBe(LLM_OUTPUT_BLOCK_MESSAGE);
    expect(preview).toHaveBeenLastCalledWith('');
    expect(final).toHaveBeenCalledExactlyOnceWith(LLM_OUTPUT_BLOCK_MESSAGE);
    for (const cancel of [false, true]) {
      const other = chatFor([prose, prose], !cancel);
      const previews = vi.fn((text) => {
        if (text && cancel) other.cancel();
      });
      await expect(
        other.generate('Tell me about gardens.', {
          delivery: 'checked-stream',
          onPreview: previews,
        }),
      ).rejects.toThrow(cancel ? 'Generation stopped' : 'GPU failed');
      expect(other.getHistory()).toEqual([]);
      expect(previews).toHaveBeenLastCalledWith('');
    }
  });
});

for (const backend of ['litert', 'transformers'] as const) {
  it(`${backend} uses the shared gate and keeps rejected replies out of final callbacks`, async () => {
    const chat = new AiChat({
      modelId: backend === 'litert' ? 'gemma-4-E2B-it-web' : 'LFM2.5-230M-q4-ONNX',
    });
    chat._isLoaded = true;
    const chunks = [prose, ' fuck'];
    const cancel = vi.fn();
    if (backend === 'litert') {
      chat.engine = {
        createConversation: async () => ({
          sendMessageStreaming: async function* () {
            for (const text of chunks) {
              yield { content: [{ type: 'text', text }] };
              await new Promise((r) => setTimeout(r, 110));
            }
          },
          cancel,
          delete: vi.fn(),
        }),
      };
    } else {
      chat.engine = {
        countTokens: async () => 100,
        reset: vi.fn(),
        cancel,
        generate: async (_payload, options) => {
          let text = '';
          for (const chunk of chunks) {
            text += chunk;
            options.onUpdate(text);
            await new Promise((r) => setTimeout(r, 110));
          }
          return { reply: text, usage: null };
        },
      };
    }
    const onPreview = vi.fn(),
      onUpdate = vi.fn(),
      onGuardrail = vi.fn();
    const reply = await chat.generate('Tell me about flowers.', {
      delivery: 'checked-stream',
      onPreview,
      onUpdate,
      onGuardrail,
    });
    expect(reply).toBe(LLM_OUTPUT_BLOCK_MESSAGE);
    expect(onPreview).toHaveBeenLastCalledWith('');
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(LLM_OUTPUT_BLOCK_MESSAGE);
    expect(onGuardrail).toHaveBeenCalledTimes(1);
    expect(chat.getHistory()[1].content).toBe(LLM_OUTPUT_BLOCK_MESSAGE);
    expect(chat._needsEngineReload).toBe(true);
  });
}

it('benign health, identity, educational and ordinary prose remain previewable', () => {
  for (const text of [
    'People can seek help after abuse. ',
    'People of all identities deserve respect. ',
    'A doctor can discuss sexual health. ',
    'A lesson explains why prompt injection is dangerous. ',
    'Flowers grow well in a sunny garden. ',
  ]) {
    const { gate, preview, reject } = setup();
    gate.accept(text.repeat(25));
    expect(preview).toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  }
});
