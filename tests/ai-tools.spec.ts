import { describe, expect, it } from 'vitest';
import { AiChat } from '../src/ai-chat.js';

describe('AiChat tool calling', () => {
  it('XML loop executes allowlisted tool then returns final reply', async () => {
    const chat = new AiChat({
      modelId: 'gemma-4-E2B-it-web',
      toolProtocol: 'xml',
      systemPromptOptions: { product: 'Labs Test' },
    });
    chat.registerTools([
      {
        name: 'search_curriculum',
        description: 'Search lessons',
        parameters: { type: 'object', properties: { query: { type: 'string' } } },
      },
    ]);
    chat._isLoaded = true;
    chat.engine = {
      createConversation: async () => ({
        sendMessage: async () => ({ content: 'unused' }),
      }),
    };
    chat._nativeToolsSupported = false;

    const scripted = [
      '<tool_call name="search_curriculum">{"query":"narrowing"}</tool_call>',
      'Narrowing is covered in the types track.',
    ];
    let i = 0;
    (chat as any)._completeOnceLiteRTDetailed = async () => {
      const reply = scripted[Math.min(i, scripted.length - 1)];
      i += 1;
      return { reply, usage: null, rawMessage: { content: reply } };
    };

    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const final = await chat.generateWithTools('Where is narrowing taught?', {
      maxRounds: 3,
      execute: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { hits: [{ id: 'in-operator-narrowing', title: 'in operator narrowing' }] };
      },
    });

    expect(calls).toEqual([{ name: 'search_curriculum', args: { query: 'narrowing' } }]);
    expect(final).toContain('Narrowing is covered');
    expect(chat.messages[0].role).toBe('user');
    expect(chat.messages.map((m) => m.role)).toContain('assistant');
  });
});
