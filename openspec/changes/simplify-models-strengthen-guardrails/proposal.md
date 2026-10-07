# Proposal

## Why
The catalog contains unsupported models and redundant runtime workarounds. Guardrails miss Unicode attacks, expose partial replies, and do not cover every untrusted model boundary.

## What Changes
- Keep six primary models and two compatibility variants; show engine and model-level versus integrated tool support.
- Remove AI Draw and retired model assets/workarounds.
- Add pinned obscenity 0.4.6, attributed PyRIT rules and Unicode data; scan references, history, tool boundaries and complete output.
- **BREAKING behavior:** onUpdate emits checked complete replies rather than partial text; retired model IDs cannot load.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `vwl-ai-chat`: curated local chat and safe content boundaries.
- `vwl-guardrails-llm`: curated local chat and safe content boundaries.
- `vwl-markdown`: curated local chat and safe content boundaries.

## Impact
Shared headless package and linked Labs host; no vd3 API changes. Existing signatures remain compatible for ts-school; hosts depending on streaming must adapt. This private pre-1.0 change is recorded in the changelog without publishing or a release version bump. The user explicitly approved the obscenity runtime dependency exception.

## Non-goals
New models, engine migrations, universal tool harness, new Qwen/LFM tool adapters, deployment, and deleting user model caches or historical reports.
