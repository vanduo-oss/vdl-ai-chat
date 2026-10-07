# Design

## Context and goals
Use the approved plan: six models, eight precision configurations and three injected runtimes. Gemma E2B stays default; LFM remains candidate. Preserve generic tools and browser-local privacy.

## Decisions
- Catalog owns primary/variant and documented tool metadata; integrated capabilities.tools stays true only for Gemma.
- Retain Tiny Q4F32 and LFM 2.6B Q4; primary selectors use a separate precision control.
- Normalize bounded variants using pinned Unicode 18 data. Adapt selected MIT PyRIT regex families with local false-positive fixtures. Dependency is pinned obscenity 0.4.6 with a reviewed subset.
- Scan sources/history before ingestion. Reject all-rejected evidence rather than answer without it. Scan serialized tool strings after schema validation and scan bounded results including error results.
- Buffer generation internally; only checked visible output enters callbacks/history/speech. Reset backend state after rejection.
- Allow HTTP(S), relative links and fragments; unsafe destinations render as inert labels.

## Risks and compatibility
Deterministic rules cannot provide full semantic moderation. Candidate model quality and cancellation must be measured separately. Preserve compatibility exports and onUpdate signature, document its changed cadence. Do not rewrite stored chats or historical artifacts.

## Validation
Targeted attacks and benign controls, meaningful source/history/tool/output boundary tests, package coverage/lint/types/build, affected Labs browser tests, real Chrome smoke for retained models and compatibility variants. Record bundle footprint, scan latency and any hardware limitations.
