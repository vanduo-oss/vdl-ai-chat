## Why

Dogfood (ts-school) showed E4B cold load in headless Chrome failing mid-stream with
`JS Stream Error [TypeError]: network error` after ~71%, while headed Chrome succeeds.
Consumers need clearer errors, fetch retry, Blob (not re-stream) Engine.create input,
and documented E4B/headless limits — without breaking existing E2B defaults.

## What Changes

- Extend `rewriteLiteRTLoadError` for network/stream failures
- Retry transient fetch + body-read failures in `loadLiteRTModelBytes`
- Pass buffered `Blob` (not `blob.stream()`) to `Engine.create` for app-fetched models
- `describeLoadProgress` surfaces error message on `stage: 'error'`
- README + OpenSpec guidance for E2B vs E4B / headless
- Unit tests only (no mandatory E4B e2e)

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `vdl-ai-chat`: LiteRT load resilience + error progress surfacing
- `qa-gates`: clarify E2B-only e2e remains sufficient; E4B headless not required
- `repo-scaffold`: version `0.1.1`

## Impact

- Semver patch `0.1.1` — additive resilience; public API unchanged
- ts-school keeps E2B default; E4B automation guidance improves

## Non-goals

- Mandatory E4B Playwright e2e
- Changing default model id (stays E2B)
- New runtime npm dependencies
- Agent does not run `npm publish`
