# Context
User approved the complete plan in chat. Package default remains complete; Labs text defaults checked-stream. Speech is complete-only.

# Decisions
A shared gate checks cumulative visible text at 100 ms checkpoints, retains 64 trailing characters, releases sentence/paragraph boundaries or words after 512 pending characters. Protocol/thought fragments remain private. Preview text is ephemeral plain text; final callbacks/history/exports/speech receive only final checked answers. Cancellation clears preview. Policy rejection interrupts generation and returns the fixed safe answer, distinct from user abort.
Conversation snapshots selected model/precision and one shared remembered voice on Start/Resume; paused edits await settled work. English Kokoro voices use pinned immutable assets and accent-specific phonemization. Core weights are shared, style files lazy. Local system voices require localService=true. No fallback or selection-triggered downloads.

# Risks
Earlier checked previews cannot be withdrawn from the reader if later context is rejected. Rules provide limited semantic moderation. Explain this beside delivery choices. Reasoning models use 1024 spoken output tokens, other models 192. Physical hardware constraints are reported in validation.
