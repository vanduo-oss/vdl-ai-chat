## Context

Large E4B `.litertlm` loads buffer to Cache Storage then previously re-streamed via
`blob.stream()` into `Engine.create`. Headless Chrome can fail that second stream pass
with a generic network/stream TypeError.

## Goals / Non-Goals

**Goals:** Actionable error rewriting; transient fetch retry; Blob to Engine.create for
app-fetched weights; error stage UI text; document E4B headless limits.

**Non-Goals:** E4B e2e mandate; changing default model; API breaks.

## Decisions

1. AiChat always calls `loadLiteRTModelBytes(..., { asStream: false })` so Engine gets Blob.
2. `asStream` remains on `loadLiteRTModelBytes` for external callers (BC).
3. Retry: up to 3 attempts (configurable via `fetchRetries`); transient HTTP 429/502/503/504
   or thrown network/stream errors; never retry 404/403.
4. `describeLoadProgress` error stage uses `message`/`text` for `progressText`; long messages
   keep `statusText: 'Error'`.

## Risks / Trade-offs

Blob path uses more peak memory than true streaming URL loads, but app-fetch path already
buffered for Cache Storage.

## Migration Plan

No consumer code changes required. Optional: surface `describeLoadProgress` error text in UI.

## Open Questions

- None.
