import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'guardrails/llm': resolve(__dirname, 'src/guardrails/llm.ts'),
        'guardrails/tools': resolve(__dirname, 'src/guardrails/tools.ts'),
        markdown: resolve(__dirname, 'src/markdown.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    emptyOutDir: false,
  },
});
