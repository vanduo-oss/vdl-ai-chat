import { validateLlmOutput } from './guardrails/llm.js';
import type { GuardrailProfile } from './guardrails/moderation.js';
import type { GuardrailResult } from './guardrails/core.js';

/** Never expose thought/tool channels, including unfinished channels. */
export function visibleReply(text: string): string {
  let out = text;
  for (const [open, close] of [
    ['<think>', '</think>'],
    ['<|think|>', '<|/think|>'],
    ['<|channel>thought', '<channel|>'],
    ['<|tool_call_start|>', '<|tool_call_end|>'],
  ]) {
    let start;
    while ((start = out.toLowerCase().indexOf(open)) !== -1) {
      const end = out.toLowerCase().indexOf(close, start + open.length);
      out = out.slice(0, start) + (end < 0 ? '' : out.slice(end + close.length));
    }
  }
  out = out.replace(/<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi, '');
  out = out.replace(/<tool_call\b[\s\S]*$/gi, '');
  // A chunk may end partway through an opening marker. Hold that suffix.
  const marker = out.lastIndexOf('<');
  if (marker >= 0 && !out.slice(marker).includes('>')) out = out.slice(0, marker);
  return out;
}

/** Preview is ephemeral. Final acceptance/persistence remains the caller's responsibility. */
export class CheckedDeliveryGate {
  blocked = false;
  private disabled = false;
  private emitted = '';
  private lastCheck = -Infinity;
  constructor(
    private profile: GuardrailProfile,
    private preview: ((text: string) => void) | undefined,
    private reject: (result: GuardrailResult) => void,
    private now = () => performance.now(),
  ) {}
  clear() {
    if (this.emitted) {
      this.emitted = '';
      this.preview?.('');
    }
  }
  accept(raw: string) {
    if (this.blocked || this.disabled) return;
    const text = visibleReply(raw);
    if (!text.startsWith(this.emitted)) {
      this.clear();
      this.disabled = true;
      return;
    }
    const now = this.now();
    if (now - this.lastCheck < 100) return;
    this.lastCheck = now;
    const guard = validateLlmOutput({ text, profile: this.profile });
    if (!guard.allowed) {
      this.blocked = true;
      this.clear();
      this.reject(guard);
      return;
    }
    const limit = text.length - 64;
    if (limit <= this.emitted.length) return;
    let end = this.emitted.length;
    // Sentence terminator must be followed by whitespace; paragraph/line breaks are complete.
    for (const match of text.matchAll(/[.!?]["'”’)]*\s+|\n+/g)) {
      const boundary = match.index! + match[0].length;
      if (boundary <= limit) end = boundary;
    }
    if (end === this.emitted.length && limit - end >= 512) {
      const whitespace = text.slice(end, limit).match(/\s+\S*$/);
      if (whitespace) end += whitespace.index! + whitespace[0].match(/^\s+/)![0].length;
    }
    // All chosen boundaries follow whitespace, so neither words nor surrogate pairs split.
    if (end > this.emitted.length) {
      this.emitted = text.slice(0, end);
      this.preview?.(this.emitted);
    }
  }
}
