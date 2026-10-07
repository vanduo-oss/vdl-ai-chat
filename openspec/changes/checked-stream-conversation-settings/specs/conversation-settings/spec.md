## ADDED Requirements

### Requirement: Conversation configuration
Conversation Mode SHALL snapshot the selected model, precision and shared remembered voice for each run. Speech and transcript delivery SHALL use complete-answer checking. Settings SHALL unlock only after paused work settles.

#### Scenario: Paused customization
- **WHEN** the user pauses, changes model or voice, and resumes
- **THEN** generation, capture and playback are settled before edits are allowed
- **AND** Resume uses the new selections while preserving completed history and the separate typed draft
- **AND** required-reasoning models receive 1024 output tokens and other models receive 192 within context limits

### Requirement: Pinned English speech voices
Speech SHALL offer the 28 named English Kokoro presets from the existing pinned revision plus installed English system voices reporting localService true. It SHALL validate voice identity, style size and checksum, reuse the shared neural model on successful style switches, and use matching accent phonemization.

#### Scenario: Selection without download
- **WHEN** a voice preference is changed or restored
- **THEN** no download or microphone capture begins
- **AND** Start, Resume, Load or Test may explicitly fetch required assets

#### Scenario: Unavailable selection
- **WHEN** the selected system voice, model or offline uncached neural style is unavailable
- **THEN** Conversation Mode pauses with an actionable explanation without silently substituting a model, voice or remote service
- **AND** system-voice conversations load Whisper and VAD without requiring Kokoro
