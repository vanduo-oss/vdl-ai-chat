import { AiChat } from '../../src/index.ts';
import * as litert from '@litert-lm/core';

const logEl = document.getElementById('log')!;
function log(msg: string) {
  logEl.textContent += `\n${msg}`;
  console.log(msg);
}

declare global {
  interface Window {
    __vdlE2E: {
      status: string;
      error: string | null;
      reply: string | null;
      webgpu: boolean;
    };
  }
}

window.__vdlE2E = {
  status: 'idle',
  error: null,
  reply: null,
  webgpu: Boolean(navigator.gpu),
};

async function main() {
  try {
    if (!navigator.gpu) {
      throw new Error('WebGPU not available in this browser');
    }
    window.__vdlE2E.status = 'loading';
    log('WebGPU ok; constructing AiChat…');

    const chat = new AiChat({
      modelId: 'gemma-4-E2B-it-web',
      loadLiteRT: async () => litert,
      liteRtWasmPath: '/litert-wasm/',
      systemPromptOptions: { product: 'vdl-ai-chat e2e' },
    });

    const localModelUrl = '/model-cache/gemma-4-E2B-it-web.litertlm';
    const head = await fetch(localModelUrl, { method: 'HEAD' });
    if (head.ok) {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('gemma-4-E2B-it-web.litertlm')) {
          return origFetch(localModelUrl, init);
        }
        return origFetch(input, init);
      };
      log('Using local model cache');
    } else {
      log('No local cache; will download from Hugging Face (~2GB)');
    }

    chat.onProgress((p) => log(`[progress] ${p.stage || ''} ${p.message || ''}`));
    await chat.load();
    window.__vdlE2E.status = 'loaded';
    log('Model loaded; generating…');

    const reply = await chat.generate('Reply with exactly one short sentence saying hello.');
    window.__vdlE2E.reply = reply;
    window.__vdlE2E.status = 'done';
    log(`REPLY:${reply}`);
    await chat.dispose();
  } catch (err: any) {
    window.__vdlE2E.status = 'error';
    window.__vdlE2E.error = String(err?.message || err);
    log(`ERROR:${window.__vdlE2E.error}`);
    console.error(err);
  }
}

main();
