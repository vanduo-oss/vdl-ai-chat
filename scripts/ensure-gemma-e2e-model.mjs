#!/usr/bin/env node
/**
 * Ensure Gemma 4 E2B LiteRT web model is cached for local Playwright e2e.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, '../tests/e2e/.model-cache');
const outFile = path.join(cacheDir, 'gemma-4-E2B-it-web.litertlm');
const MODEL_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm';

fs.mkdirSync(cacheDir, { recursive: true });

if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100_000_000) {
  console.log(`[ensure-gemma] cache hit ${outFile} (${fs.statSync(outFile).size} bytes)`);
  process.exit(0);
}

console.log(`[ensure-gemma] downloading ${MODEL_URL}`);
const res = await fetch(MODEL_URL);
if (!res.ok || !res.body) {
  console.error(`[ensure-gemma] download failed: ${res.status}`);
  process.exit(1);
}

const tmp = `${outFile}.partial`;
await pipeline(res.body, createWriteStream(tmp));
fs.renameSync(tmp, outFile);
console.log(`[ensure-gemma] saved ${outFile} (${fs.statSync(outFile).size} bytes)`);
