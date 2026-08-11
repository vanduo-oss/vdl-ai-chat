import { AiChat } from '/dist/index.js';

const logEl = document.getElementById('log');
function log(msg) {
  logEl.textContent += `\n${msg}`;
  console.log(msg);
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
      loadLiteRT: () => import('@litert-lm/core'),
      liteRtWasmPath: '/litert-wasm/',
      systemPromptOptions: { product: 'vdl-ai-chat e2e' },
    });

    // Prefer cached local model file when present (downloaded by ensure script).
    const localModelUrl = '/model-cache/gemma-4-E2B-it-web.litertlm';
    const head = await fetch(localModelUrl, { method: 'HEAD' });
    if (head.ok) {
      // Patch catalog URL via load path: AiChat resolves from MODEL_OPTIONS;
      // override by temporarily rewriting fetch for the HF URL to local cache.
      const option = chat.constructor
        ? null
        : null;
      void option;
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
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
  } catch (err) {
    window.__vdlE2E.status = 'error';
    window.__vdlE2E.error = String(err && err.message ? err.message : err);
    log(`ERROR:${window.__vdlE2E.error}`);
    console.error(err);
  }
}

main();
