# Design

The chat package owns typed model metadata and immutable artifact manifests. Labs bundles per-instance WebLLM and Transformers workers. Shared modules/cache bytes never own conversation state. Compare owns at most two engines, loads sequentially, runs independent workers concurrently, and serializes two LiteRT generations. Lower-memory execution unloads between sides. Each side keeps its own complete turns; each shared Docs question retrieves once.

Interactive Chat, Compare, and local Evaluate transfer inference ownership only after teardown. Compare is production-enabled; evaluation UI/report artifacts are excluded except in development or an explicit local QA build. Both evaluation front ends use the same cancellable runner and scoring.

Memory estimates are advisory, runtime features authoritative. No implicit downloads, precision changes, model replacement, or mode fallback. Partial failures preserve the successful side and allow snapshot-based retry. Scoped caches are protected while models are resident. Reports distinguish isolated and shared-GPU timings and unknown memory measurements.
