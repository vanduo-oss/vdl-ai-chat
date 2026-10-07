## ADDED Requirements

### Requirement: Safe link schemes
Markdown links MUST allow HTTP(S), ordinary relative paths and fragments and MUST render unsafe schemes, protocol-relative or obfuscated destinations inertly.

#### Scenario: Executable URL
- **GIVEN** a javascript link in untrusted markdown
- **WHEN** converted
- **THEN** the label is retained without a clickable destination
