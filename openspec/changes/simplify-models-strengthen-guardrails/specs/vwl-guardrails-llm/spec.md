## ADDED Requirements

### Requirement: All untrusted model boundaries are screened
Chat MUST screen input, admitted references, imported history and tool arguments/results using bounded local checks. Rejected arguments MUST NOT execute. Rejected results MUST NOT reach callbacks or the model. Rejected context MUST be reported; all-rejected supplied evidence MUST stop generation.

#### Scenario: Injected tool result
- **GIVEN** an allowlisted tool returning an instruction override
- **WHEN** the result is processed
- **THEN** a fixed safe error replaces it before callbacks and model ingestion

### Requirement: Family-friendly local policy
English-first family-friendly moderation MUST keep assistant replies clean while permitting user profanity alone, health questions, identity discussion and help-seeking. Unicode and encoded known injection directives MUST be checked with bounded processing. Rules MUST document semantic limits and provenance.

#### Scenario: Benign role request
- **GIVEN** a request to act as a friendly maths tutor
- **WHEN** validated
- **THEN** it is allowed
