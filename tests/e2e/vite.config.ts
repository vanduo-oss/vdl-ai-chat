import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  server: {
    host: '127.0.0.1',
    port: 4177,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  resolve: {
    alias: {
      '@vanduo-oss/vdl-ai-chat': path.resolve(root, '../../src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@litert-lm/core'],
  },
  publicDir: false,
});
