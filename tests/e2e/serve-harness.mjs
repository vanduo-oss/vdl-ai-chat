#!/usr/bin/env node
/**
 * Vite-dev server for Playwright Gemma e2e, plus static routes for WASM + model cache.
 */
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function resolvePackageFile(...parts) {
  // Prefer direct path, then pnpm nested path.
  const candidates = [
    path.join(root, 'node_modules', ...parts),
    ...fs
      .readdirSync(path.join(root, 'node_modules/.pnpm'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('@litert-lm+core@'))
      .map((d) =>
        path.join(root, 'node_modules/.pnpm', d.name, 'node_modules', ...parts),
      ),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const wasmRoot = path.dirname(resolvePackageFile('@litert-lm', 'core', 'wasm', 'litertlm_wasm_internal.js'));
const modelCacheRoot = path.join(__dirname, '.model-cache');

console.log('[e2e-harness] wasmRoot=', wasmRoot);
console.log('[e2e-harness] modelCacheRoot=', modelCacheRoot);

const staticPlugin = {
  name: 'vdl-e2e-static',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] || '';
      let file = null;
      if (url.startsWith('/litert-wasm/')) {
        file = path.join(wasmRoot, url.slice('/litert-wasm/'.length));
      } else if (url.startsWith('/model-cache/')) {
        file = path.join(modelCacheRoot, url.slice('/model-cache/'.length));
      }
      if (!file) return next();
      fs.readFile(file, (err, data) => {
        if (err) {
          console.warn('[e2e-harness] missing', file);
          res.statusCode = 404;
          res.end('missing');
          return;
        }
        const isWasm = file.endsWith('.wasm');
        const isJs = file.endsWith('.js');
        res.setHeader(
          'Content-Type',
          isWasm ? 'application/wasm' : isJs ? 'text/javascript' : 'application/octet-stream',
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.end(data);
      });
    });
  },
};

const server = await createServer({
  configFile: path.join(__dirname, 'vite.config.ts'),
  plugins: [staticPlugin],
});

await server.listen();
const addr = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4177/';
console.log(`[e2e-harness] ${addr}harness.html`);
