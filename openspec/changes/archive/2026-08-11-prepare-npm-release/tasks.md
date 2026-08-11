## 1. Package & OpenSpec config

- [x] 1.1 Remove `"private": true` from package.json; keep publishConfig public; add scripts `test:ci`, `test:coverage`, `test:local`, `prepublishOnly`
- [x] 1.2 Update `openspec/config.yaml` context (publishable, CI allowed, dual QA gates, Gemma4 default)
- [x] 1.3 Fill Purpose sections in all `openspec/specs/*/spec.md`

## 2. Quality gates

- [x] 2.1 Run Prettier; fix ESLint errors in `src/ai-chat.ts` and guardrails
- [x] 2.2 Add `@vitest/coverage-v8` and coverage thresholds ≥90% on `src/`
- [x] 2.3 Expand unit tests (mocked loaders) until `pnpm test:ci` passes thresholds
- [x] 2.4 Add `.github/workflows/ci.yml` (format, lint, typecheck, test:ci, build, pack dry-run, audit — no inference)

## 3. Docs & security

- [x] 3.1 Expand README (API, CSP/WASM, Gemma4 default, local vs CI)
- [x] 3.2 Add SECURITY.md and CONTRIBUTING.md; refresh CHANGELOG for 0.1.0 public

## 4. Local inference QA

- [x] 4.1 Add Playwright e2e harness under `tests/e2e/` for WebGPU Gemma 4 E2B load + generate
- [x] 4.2 Gitignore `tests/e2e/.model-cache/`; wire `pnpm test:local`
- [x] 4.3 Run `pnpm test:local` on this machine and fix until green

## 5. Validate & archive

- [x] 5.1 `pnpm build` and `pnpm test:ci`
- [x] 5.2 `openspec validate --change prepare-npm-release --strict` and archive change
- [x] 5.3 Push, tag `v0.1.0`, GitHub Release; ping human for `npm publish`
