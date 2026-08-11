import { allow, block, normalizeText, type GuardrailResult } from './core.js';

export type ToolDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export const DEFAULT_MAX_TOOL_ARGS_BYTES = 16_384;

function byteLengthOfJson(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function validateToolCall(options: {
  name: unknown;
  args?: unknown;
  allowlist: Iterable<string> | ToolDefinition[];
  maxArgsBytes?: number;
}): GuardrailResult {
  const name = normalizeText(options?.name || '');
  const maxArgsBytes = options?.maxArgsBytes ?? DEFAULT_MAX_TOOL_ARGS_BYTES;
  const rawAllow = options?.allowlist;
  const allowlist = new Set(
    Array.from(rawAllow as Iterable<string | ToolDefinition>)
      .map((entry) => (typeof entry === 'string' ? entry : normalizeText(entry?.name || '')))
      .filter(Boolean),
  );

  if (!name) {
    return block({
      code: 'tool.name.empty',
      message: 'Tool name cannot be empty.',
    });
  }

  if (!allowlist.has(name)) {
    return block({
      code: 'tool.name.not_allowed',
      message: `Tool "${name}" is not in the allowlist.`,
      meta: { name, allowlist: [...allowlist] },
    });
  }

  const args = options?.args === undefined ? {} : options.args;
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return block({
      code: 'tool.args.invalid',
      message: 'Tool arguments must be a plain object.',
      meta: { name },
    });
  }

  const size = byteLengthOfJson(args);
  if (size > maxArgsBytes) {
    return block({
      code: 'tool.args.too_large',
      message: `Tool arguments exceed max size (${maxArgsBytes} bytes).`,
      meta: { name, maxArgsBytes, actualBytes: size },
    });
  }

  return allow({ name, args, bytes: size });
}

export function parseXmlToolCalls(text: string): {
  calls: Array<{ name: string; args: Record<string, unknown> }>;
  remainder: string;
} {
  const source = String(text || '');
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const re = /<tool_call\s+name="([^"]+)">\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  let remainder = source;
  while ((match = re.exec(source)) !== null) {
    const name = match[1];
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(match[2].trim() || '{}') as Record<string, unknown>;
    } catch {
      args = { _parseError: true, raw: match[2] };
    }
    calls.push({ name, args });
    remainder = remainder.replace(match[0], '').trim();
  }
  return { calls, remainder };
}

export function formatXmlToolResult(name: string, result: unknown): string {
  const safeName = normalizeText(name) || 'unknown';
  let body: string;
  try {
    body = JSON.stringify(result ?? null);
  } catch {
    body = JSON.stringify({ error: 'unserializable_result' });
  }
  return `<tool_result name="${safeName}">${body}</tool_result>`;
}
