/** Verify reviewed source snapshots and derived data; no runtime/network work. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { URL } from 'node:url';
const root = new URL('../src/guardrails/data/', import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL('provenance.json', root), 'utf8'));
const hash = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(new URL(file, root)))
    .digest('hex');
for (const [file, checksum] of [
  ['unicode-confusables-18.0.0.txt', manifest.unicode.sha256],
  ['unicode-ascii.json', manifest.unicode.derivedSha256],
  ['unicode-normalization-18.0.0.txt', manifest.normalization.sha256],
  ['unicode-normalization-ascii.json', manifest.normalization.derivedSha256],
  ['pyrit-source.py.txt', manifest.pyrit.sha256],
])
  assert.equal(await hash(file), checksum, `Guardrail data changed: ${file}`);
const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.deepEqual(pkg.dependencies, { obscenity: manifest.obscenity.version });
console.log(
  'Five pinned guardrail source/derived checksums and the dependency exception verified.',
);
