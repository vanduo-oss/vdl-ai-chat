## 1. Implementation

- [x] 1.1 Extend `rewriteLiteRTLoadError` for network/stream errors
- [x] 1.2 Fetch retry in `loadLiteRTModelBytes` / body read path
- [x] 1.3 Pass Blob (not stream) to `Engine.create` for app-fetched models
- [x] 1.4 `describeLoadProgress` surfaces error message on error stage
- [x] 1.5 README + OpenSpec headless/E4B guidance; bump to `0.1.1`

## 2. Tests

- [x] 2.1 Unit tests for rewrite, describeLoadProgress error, fetch retry, Blob Engine.create
- [x] 2.2 `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm build`

## 3. Validate

- [x] 3.1 `openspec validate litert-load-resilience-docs --strict`
