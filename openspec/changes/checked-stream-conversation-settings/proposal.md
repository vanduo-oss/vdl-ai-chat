# Why
Complete-answer buffering removed live text, and Conversation Mode forces one model/voice.

# What Changes
Add checked previews with a final-only persistence/speech boundary. Use selected models and shared local voice preferences, editable while paused. Pin 28 English Kokoro presets. NVIDIA check-before-release is an architectural reference; no NVIDIA runtime or remote moderation is added.

# Capabilities
## New Capabilities
- `checked-text-delivery`: bounded checked previews and final acceptance.
- `conversation-settings`: selected models and pinned/local voice configuration.

# Impact
Coordinated headless package and Labs host. Public callbacks remain final-only. New opt-in preview callback. No deployment or dependency/runtime upgrades.
