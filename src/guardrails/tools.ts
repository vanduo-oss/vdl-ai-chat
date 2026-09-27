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
  const definitions = Array.from(rawAllow as Iterable<string | ToolDefinition>);
  const allowlist = new Set(
    definitions
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

  const definition = definitions.find((d) => typeof d !== 'string' && d.name === name);
  const schema = typeof definition === 'object' ? definition.parameters : undefined;
  const issue = validateSchema(args, schema || { type: 'object' });
  if (issue) return block({ code: 'tool.args.schema', message: issue, meta: { name } });
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
  const safeName = (normalizeText(name) || 'unknown').replace(/[&<>"']/g, '');
  let body: string;
  try {
    body = JSON.stringify(result ?? null);
  } catch {
    body = JSON.stringify({ error: 'unserializable_result' });
  }
  body = body.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<tool_result name="${safeName}">${body}</tool_result>`;
}

/** Supported JSON Schema subset: types, properties/required, items, enum, bounds. */
export function validateSchema(
  value: unknown,
  schema: Record<string, any>,
  depth = 0,
): string | null {
  if (depth > 12) return 'Tool arguments are nested too deeply.';
  const supported = new Set([
    'type',
    'properties',
    'required',
    'additionalProperties',
    'items',
    'enum',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
    'description',
    'title',
    'default',
    '$schema',
  ]);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return 'Invalid tool schema.';
  for (const key of Object.keys(schema))
    if (!supported.has(key)) return `Unsupported tool schema keyword: ${key}.`;
  if (value && typeof value === 'object') {
    if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
      return 'Tool arguments must be plain JSON objects.';
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor', '_parseError'].includes(key))
        return 'Unsafe or malformed tool arguments.';
      const problem = validateSchema(child, {}, depth + 1);
      if (problem) return problem;
    }
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return 'Numbers must be finite.';
  if (value !== null && !['object', 'number', 'string', 'boolean'].includes(typeof value))
    return 'Arguments must be JSON values.';
  const type = schema.type;
  if (
    type &&
    !(type === 'integer'
      ? Number.isInteger(value)
      : type === 'array'
        ? Array.isArray(value)
        : type === 'null'
          ? value === null
          : type === 'object'
            ? value !== null && typeof value === 'object' && !Array.isArray(value)
            : typeof value === type)
  )
    return `Expected ${type}.`;
  if (
    schema.enum &&
    !schema.enum.some((entry: unknown) => JSON.stringify(entry) === JSON.stringify(value))
  )
    return 'Value is outside the allowed enum.';
  if (
    typeof value === 'number' &&
    ((schema.minimum != null && value < schema.minimum) ||
      (schema.maximum != null && value > schema.maximum))
  )
    return 'Number is outside the allowed range.';
  if (
    typeof value === 'string' &&
    ((schema.minLength != null && value.length < schema.minLength) ||
      (schema.maxLength != null && value.length > schema.maxLength))
  )
    return 'String is outside the allowed length.';
  if (Array.isArray(value)) {
    if (
      (schema.minItems != null && value.length < schema.minItems) ||
      (schema.maxItems != null && value.length > schema.maxItems)
    )
      return 'Array is outside the allowed length.';
    for (const item of value) {
      const problem = validateSchema(item, schema.items || {}, depth + 1);
      if (problem) return problem;
    }
  } else if (value !== null && typeof value === 'object') {
    for (const key of schema.required || [])
      if (!Object.hasOwn(value, key)) return `Missing required argument: ${key}.`;
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties?.[key];
      if (!childSchema && schema.additionalProperties === false)
        return `Unexpected argument: ${key}.`;
      const problem = validateSchema(
        child,
        childSchema ||
          (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {}),
        depth + 1,
      );
      if (problem) return `${key}: ${problem}`;
    }
  }
  return null;
}
