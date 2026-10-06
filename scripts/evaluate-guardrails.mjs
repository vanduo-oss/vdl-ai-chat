/** Local fixture comparison and scan latency; never downloads or sends prompts. */
import fs from 'node:fs/promises';
import { pathToFileURL, URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { validateLlmInput } from '../dist/guardrails/llm.js';
const cases = JSON.parse(
  await fs.readFile(new URL('../tests/fixtures/guardrail-cases.json', import.meta.url)),
);
function measure(validate, fixtures = cases) {
  const results = [
    ...fixtures.attacks.map((text) => ({ type: 'attack', allowed: validate(text).allowed })),
    ...fixtures.benign.map((text) => ({ type: 'benign', allowed: validate(text).allowed })),
  ];
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    for (const text of [...fixtures.attacks, ...fixtures.benign]) validate(text);
    samples.push((performance.now() - start) / results.length);
  }
  samples.sort((a, b) => a - b);
  return {
    attackCount: fixtures.attacks.length,
    attacksBlocked: results.filter((r) => r.type === 'attack' && !r.allowed).length,
    benignCount: fixtures.benign.length,
    benignBlocked: results.filter((r) => r.type === 'benign' && !r.allowed).length,
    meanScanP50Ms: samples[50],
    meanScanP95Ms: samples[95],
  };
}
const report = {
  fixture: 'targeted local regressions; not general semantic recall',
  current: measure(validateLlmInput),
  exploratory: measure(validateLlmInput, {
    attacks: cases.exploratoryAttacks,
    benign: cases.exploratoryBenign,
  }),
};
if (process.argv[2]) {
  const baseline = await import(pathToFileURL(process.argv[2]));
  report.baseline = measure(baseline.validateLlmInput);
  report.exploratoryBaseline = measure(baseline.validateLlmInput, {
    attacks: cases.exploratoryAttacks,
    benign: cases.exploratoryBenign,
  });
}
const longInput = 'Ｆｕｌｌｗｉｄｔｈ text and ordinary context. '.repeat(1000).slice(0, 32768);
const boundedSamples = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  validateLlmInput({ text: longInput, maxLength: 32768 });
  boundedSamples.push(performance.now() - start);
}
boundedSamples.sort((a, b) => a - b);
report.bounded32768CharacterP95Ms = boundedSamples[95];
console.log(JSON.stringify(report, null, 2));
if (report.current.attacksBlocked !== cases.attacks.length || report.current.benignBlocked)
  process.exitCode = 1;
