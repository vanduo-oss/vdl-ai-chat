## ADDED Requirements

### Requirement: Checked text delivery
Generation SHALL optionally release cumulative locally checked previews while retaining final-only callbacks, returned answers and committed history. The package default SHALL remain complete-answer delivery. Tool loops SHALL remain fully buffered.

#### Scenario: Accepted checked preview
- **WHEN** a caller selects checked-stream and a usable boundary is available
- **THEN** the whole visible accumulated answer is checked before a plain-text preview is released with at least 64 trailing characters retained
- **AND** final completion is independently checked before final callbacks and history receive it

#### Scenario: Unsafe or interrupted generation
- **WHEN** output violates policy, a prefix is revised, or generation is cancelled or fails
- **THEN** the ephemeral preview is cleared
- **AND** policy rejection returns the fixed safe answer and rebuilds contaminated context while cancellation or error commits no partial answer

#### Scenario: Host delivery preference
- **WHEN** Chat or Compare starts an ordinary text turn
- **THEN** it uses the remembered delivery preference, initially checked-stream, with an exposure-tradeoff notice
- **AND** previews cannot activate links, enter exports or be spoken
- **AND** Compare measures firstPreviewMs independently from final firstAnswerMs
