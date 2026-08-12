/**
 * @vanduo-oss/vdl-ai-chat — headless on-device AiChat engine.
 * Source promoted from labs/ai-chat.js (UI omitted; hosts supply their own shell).
 */

import {
  buildChatSystemPrompt,
  DEFAULT_LLM_GUARD_PATTERNS,
  validateLlmInput,
  validateLlmOutput,
  LLM_OUTPUT_BLOCK_MESSAGE,
  validateToolCall,
  parseXmlToolCalls,
  formatXmlToolResult,
} from './guardrails/llm.js';
import { toGuardrailError } from './guardrails/core.js';

/**
 * Headless AiChat — Gemma via LiteRT-LM / WebLLM in the browser (WebGPU).
 *
 * @example
 * import { AiChat } from '@vanduo-oss/vdl-ai-chat';
 * const chat = new AiChat({ modelId: 'gemma-4-E2B-it-web' });
 * await chat.load();
 */

// ═══════════════════════════════════════════════════════════════════════
// CDN Configuration
// ═══════════════════════════════════════════════════════════════════════

const CDN = {
  webllm: 'https://esm.run/@mlc-ai/web-llm',
  litert: 'https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm',
};

export const VDL_AI_CHAT_VERSION = '0.1.1';

export const TOOLS_UNSUPPORTED_ERROR =
  'Tool calling is only supported on LiteRT Gemma (E2B/E4B) models.';

/** @typedef {{ name: string, description?: string, parameters?: Record<string, unknown> }} AiToolDefinition */

let _webllmModule: any = null;
let _litertModule: any = null;

export const MODEL_GROUPS = [
  { id: 'gemma4', label: 'Gemma 4' },
  { id: 'qwen3', label: 'Qwen 3' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'optional', label: 'Optional (WebLLM)' },
];

/** ~GiB helper for model size metadata (weights on disk / download). */
const GiB = 1024 ** 3;

/**
 * LiteRT support kinds (honest Labs labels — do not claim Google web support for non-official):
 * - web-official: listed in LiteRT-LM JS docs
 * - portable: community-verified general .litertlm in browser
 * - spike: Labs experimental probe; may fail to load
 */
export const MODEL_OPTIONS = [
  {
    id: 'gemma-4-E2B-it-web',
    label: 'Gemma 4 E2B (~2.0GB) - Fast (Default)',
    tier: 'Fast',
    group: 'gemma4',
    family: 'gemma4',
    backend: 'litert',
    litertKind: 'web-official',
    requires: ['shader-f16'],
    approxBytes: 2.0 * GiB,
    maxNumTokens: 8192,
    modelFile: 'gemma-4-E2B-it-web.litertlm',
    modelUrl:
      'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm',
  },
  {
    id: 'gemma-4-E4B-it-web',
    label: 'Gemma 4 E4B (~2.5GB) - Quality',
    tier: 'Quality',
    group: 'gemma4',
    family: 'gemma4',
    backend: 'litert',
    litertKind: 'web-official',
    requires: ['shader-f16'],
    experimental: true,
    approxBytes: 2.5 * GiB,
    maxNumTokens: 8192,
    modelFile: 'gemma-4-E4B-it-web.litertlm',
    modelUrl:
      'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.litertlm',
  },
  {
    // PrefillDecode spike: kept in the catalog for honesty / eval probing, but load is
    // blocked — see LITERT_PREFILLDECODE_UNSUPPORTED_REASON.
    id: 'qwen3-0.6B-litert',
    label: 'Qwen3 0.6B LiteRT (~0.6GB) - Spike',
    tier: 'Explorer',
    group: 'experimental',
    family: 'qwen3',
    backend: 'litert',
    litertKind: 'spike',
    litertRuntime: 'prefilldecode-unsupported',
    requires: [],
    experimental: true,
    approxBytes: 0.6 * GiB,
    maxNumTokens: 4096,
    disableThinking: true,
    modelFile: 'Qwen3-0.6B.litertlm',
    modelUrl: 'https://huggingface.co/litert-community/Qwen3-0.6B/resolve/main/Qwen3-0.6B.litertlm',
  },
  {
    id: 'ministral-3-3B-litert',
    label: 'Ministral 3 3B LiteRT (~2.2GB) - Spike',
    tier: 'Explorer',
    group: 'experimental',
    family: 'ministral',
    backend: 'litert',
    litertKind: 'spike',
    litertRuntime: 'prefilldecode-unsupported',
    requires: ['shader-f16'],
    experimental: true,
    approxBytes: 2.2 * GiB,
    maxNumTokens: 4096,
    modelFile: 'model.litertlm',
    modelUrl:
      'https://huggingface.co/litert-community/Ministral-3-3B-Reasoning-2512/resolve/main/model.litertlm',
  },
  {
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    label: 'Qwen3 0.6B MLC (~0.5GB) - Tiny',
    tier: 'Tiny',
    group: 'qwen3',
    family: 'qwen3',
    backend: 'webllm',
    requires: ['shader-f16'],
    approxBytes: 0.5 * GiB,
    disableThinking: true,
    fallbackId: 'Qwen3-0.6B-q4f32_1-MLC',
  },
  {
    id: 'gemma-4-E2B-it-q4f16_1-MLC',
    label: 'Gemma 4 E2B MLC (~2.7GB) - Experimental',
    tier: 'Experimental',
    group: 'experimental',
    family: 'gemma4',
    backend: 'webllm',
    requires: ['shader-f16'],
    experimental: true,
    approxBytes: 2.7 * GiB,
    // WebLLM allows only one of context_window_size / sliding_window_size > 0.
    // mlc-chat-config ships both (4096 + 512); prefer fixed context for this build.
    // Native multi-turn context is unreliable on this community MLC package.
    overrides: {
      context_window_size: 4096,
      sliding_window_size: -1,
    },
    modelUrl: 'https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC',
    modelLibUrl:
      'https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC/resolve/main/libs/gemma-4-E2B-it-q4f16_1-MLC-webgpu.wasm',
  },
  {
    id: 'gemma-4-E4B-it-q4f16_1-MLC',
    label: 'Gemma 4 E4B MLC (~4.0GB) - Experimental',
    tier: 'Experimental',
    group: 'experimental',
    family: 'gemma4',
    backend: 'webllm',
    requires: ['shader-f16'],
    experimental: true,
    approxBytes: 4.0 * GiB,
    overrides: {
      context_window_size: 4096,
      sliding_window_size: -1,
    },
    modelUrl: 'https://huggingface.co/welcoma/gemma-4-E4B-it-q4f16_1-MLC',
    modelLibUrl:
      'https://huggingface.co/welcoma/gemma-4-E4B-it-q4f16_1-MLC/resolve/main/libs/gemma-4-E4B-it-q4f16_1-MLC-webgpu.wasm',
  },
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    label: 'Qwen3 1.7B (~1.1GB) - Balanced',
    tier: 'Balanced',
    group: 'optional',
    family: 'qwen3',
    backend: 'webllm',
    requires: ['shader-f16'],
    approxBytes: 1.1 * GiB,
    disableThinking: true,
    fallbackId: 'Qwen3-1.7B-q4f32_1-MLC',
  },
  {
    id: 'Phi-4-mini-instruct-q4f16_1-MLC',
    label: 'Phi-4 mini (~2.5GB) - Alt Quality',
    tier: 'Alt Quality',
    group: 'optional',
    family: 'phi4',
    backend: 'webllm',
    requires: ['shader-f16'],
    approxBytes: 2.5 * GiB,
    fallbackId: 'Phi-4-mini-instruct-q4f32_1-MLC',
  },
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 Coder 1.5B (~1.6GB) - Coder',
    tier: 'Coder',
    group: 'optional',
    family: 'qwen2.5',
    backend: 'webllm',
    requires: [],
    approxBytes: 1.6 * GiB,
    fallbackId: 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC',
  },
];

/** Suggested Tiny model when load-capacity heuristics say the device is weak. */
export const TINY_MODEL_ID = 'Qwen3-0.6B-q4f16_1-MLC';

/**
 * Soft copy for the freeze window during WASM/WebGPU init (unavoidable in-browser).
 * Shown while weights upload / shaders compile after download.
 */
export const LOAD_FREEZE_HINT =
  'Uploading weights to the GPU and compiling shaders — the tab may freeze for several seconds. This is normal for in-browser WebGPU.';

/**
 * Infer whether a progress `text` / URL looks like cache, local `/models`, or network.
 * Prefer an explicit `source` field on progress events when AiChat provides one.
 *
 * @param {unknown} progressText
 * @returns {'cache' | 'local' | 'network' | 'unknown'}
 */
export function inferLoadSource(progressText: unknown): 'cache' | 'local' | 'network' | 'unknown' {
  const text = String(progressText || '').toLowerCase();
  if (!text) return 'unknown';
  if (/\/models\//.test(text) || /\blocal\b/.test(text)) return 'local';
  if (/(cache|cached|indexeddb)/.test(text)) return 'cache';
  if (/(download|fetch|http|https|network|transfer|bytes|\bkb\b|\bmb\b|\bgb\b)/.test(text)) {
    return 'network';
  }
  return 'unknown';
}

/**
 * Map an AiChat `onProgress` payload into UI-ready load status fields.
 * Shared by Labs VdlAiChatUI / AiChatUI and host apps (e.g. ts-school).
 *
 * @param {Record<string, unknown> | null | undefined} data
 * @param {{ likelyCached?: boolean, freezeHint?: string }} [options]
 * @returns {{
 *   stage: string,
 *   progressPct: number,
 *   progressText: string,
 *   statusText: string,
 *   statusTone: 'muted' | 'warn' | 'ok' | 'danger',
 *   freezeHint: string,
 *   source: 'cache' | 'local' | 'network' | 'unknown',
 * }}
 */
export function describeLoadProgress(
  data: any,
  options: Record<string, any> = {},
): {
  stage: string;
  progressPct: number;
  progressText: any;
  statusText: string;
  statusTone: 'muted' | 'warn' | 'ok' | 'danger';
  freezeHint: any;
  source: 'cache' | 'local' | 'network' | 'unknown';
} {
  const stage = String(data?.stage || '');
  const loaded = typeof data?.loaded === 'number' ? data.loaded : 0;
  const pct = Math.max(0, Math.min(100, Math.round(loaded * 100)));
  const message = String(data?.message || '');
  const text = String(data?.text || '');
  const freezeDefault = options.freezeHint || LOAD_FREEZE_HINT;
  const likelyCached = options.likelyCached === true;
  const explicitSource = data?.source;
  type LoadSource = 'cache' | 'local' | 'network' | 'unknown';
  let inferred: LoadSource;
  if (
    explicitSource === 'cache' ||
    explicitSource === 'local' ||
    explicitSource === 'network' ||
    explicitSource === 'unknown'
  ) {
    inferred = explicitSource;
  } else {
    inferred = inferLoadSource(text);
    if (inferred === 'unknown') inferred = inferLoadSource(message);
  }

  if (stage === 'init') {
    return {
      stage,
      progressPct: 0,
      progressText: message || 'Initializing…',
      statusText: 'Loading…',
      statusTone: 'warn',
      freezeHint: '',
      source: 'unknown',
    };
  }

  if (stage === 'downloading') {
    let source: LoadSource = inferred;
    if (source === 'unknown' && likelyCached) source = 'cache';

    let prefix = message || 'Preparing model…';
    if (source === 'local') {
      prefix = message || 'Using local LiteRT model…';
    } else if (source === 'network') {
      prefix = message || 'Downloading model from web (first load may take a while).';
    } else if (source === 'cache') {
      prefix = message || 'Loading model from browser cache (no full re-download).';
    } else if (likelyCached) {
      prefix = message || 'Loading model from browser cache…';
    }

    return {
      stage,
      progressPct: pct,
      progressText: text ? `${prefix} ${text}` : prefix,
      statusText: `Loading ${pct}%`,
      statusTone: 'warn',
      freezeHint: '',
      source,
    };
  }

  if (stage === 'compiling') {
    const hint = message || freezeDefault;
    return {
      stage,
      progressPct: 100,
      progressText: hint,
      statusText: 'Compiling…',
      statusTone: 'warn',
      freezeHint: hint,
      source: inferred === 'unknown' ? 'unknown' : inferred,
    };
  }

  if (stage === 'ready') {
    return {
      stage,
      progressPct: 100,
      progressText: message || 'Ready',
      statusText: 'Ready',
      statusTone: 'ok',
      freezeHint: '',
      source: 'unknown',
    };
  }

  if (stage === 'error') {
    const errText = message || text || 'Failed to load model.';
    return {
      stage,
      progressPct: 0,
      progressText: errText,
      statusText: errText.length > 80 ? 'Error' : errText,
      statusTone: 'danger',
      freezeHint: '',
      source: 'unknown',
    };
  }

  return {
    stage: stage || 'unknown',
    progressPct: pct,
    progressText: message || text || '',
    statusText: message || 'Loading…',
    statusTone: 'warn',
    freezeHint: '',
    source: inferred,
  };
}

/**
 * PrefillDecode `.litertlm` spikes (Qwen3 / Ministral) cannot load in current
 * `@litert-lm/core` web runtime:
 * - default `Backend.GPU_ARTISAN` always uses streaming ModelAssets →
 *   "Streaming kTfLitePrefillDecode models is not supported yet."
 * - `Backend.GPU` uses non-streaming `createEngine`, but web wasm fails with
 *   "null function" on these artifacts (probed 2026-08-08).
 * Google’s JS docs still list only Gemma `*-it-web` builds.
 */
export const LITERT_PREFILLDECODE_UNSUPPORTED_REASON =
  'Unsupported in the current LiteRT-LM.js runtime: PrefillDecode .litertlm models cannot load (GPU_ARTISAN streaming rejected; Backend.GPU non-stream create fails). Use Gemma 4 LiteRT (web-official) or Qwen3 0.6B WebLLM (Tiny).';

/**
 * @param {string | { backend?: string, litertKind?: string, litertRuntime?: string } | null | undefined} modelOrId
 */
export function isLiteRTPrefillDecodeUnsupported(modelOrId) {
  const option =
    typeof modelOrId === 'string' || modelOrId == null ? getModelOption(modelOrId) : modelOrId;
  if (!option || option.backend !== 'litert') return false;
  if (option.litertKind === 'web-official') return false;
  return option.litertRuntime === 'prefilldecode-unsupported';
}

/**
 * @param {string | object | null | undefined} modelOrId
 * @returns {string} empty when load is not blocked for LiteRT runtime reasons
 */
export function getLiteRTRuntimeBlockReason(modelOrId) {
  return isLiteRTPrefillDecodeUnsupported(modelOrId) ? LITERT_PREFILLDECODE_UNSUPPORTED_REASON : '';
}

/**
 * Rewrite raw LiteRT PrefillDecode / streaming errors into the Labs catalog message.
 * @param {unknown} err
 */
export function rewriteLiteRTLoadError(err) {
  // CSP / <script> load failures often surface as Event, not Error.
  if (err && typeof err === 'object' && !(err instanceof Error) && 'type' in err) {
    const target = /** @type {{ target?: { src?: string, href?: string } }} */ err.target;
    const src = target?.src || target?.href || '';
    if (/jsdelivr|unpkg|esm\.run/i.test(src)) {
      return new Error(
        'LiteRT WASM was blocked by Content-Security-Policy (CDN script). Pass AiChat({ liteRtWasmPath }) to a same-origin /wasm/ directory.',
      );
    }
    return new Error(
      src
        ? `Failed to load LiteRT runtime script (${src}).`
        : 'Failed to load LiteRT runtime (script or network error).',
    );
  }
  const msg = String(err?.message || err || '');
  if (/PrefillDecode|Streaming kTfLite/i.test(msg)) {
    return new Error(LITERT_PREFILLDECODE_UNSUPPORTED_REASON);
  }
  if (/Content Security Policy|violates.*script-src/i.test(msg)) {
    return new Error(
      'LiteRT WASM was blocked by Content-Security-Policy. Pass AiChat({ liteRtWasmPath }) to a same-origin /wasm/ directory.',
    );
  }
  // Keep definitive HTTP status errors from loadLiteRTModelBytes as-is.
  if (/Failed to fetch model \(\d+/.test(msg)) {
    return err instanceof Error ? err : new Error(msg);
  }
  if (
    /network error|failed to fetch|load failed|js stream error|err_network|aborted|readableStream|stream error/i.test(
      msg,
    )
  ) {
    return new Error(
      'LiteRT model download or stream failed (network error). Retry load; on headless Chrome prefer E2B or use a headed browser for E4B cold loads. Warm Cache Storage avoids re-download.',
    );
  }
  return err instanceof Error ? err : new Error(msg || 'Failed to load model.');
}

/**
 * Confirm-dialog copy when heuristics flag a constrained device.
 * @param {{ approxGb: number, recommendedLabel?: string }} opts
 */
export function buildWeakDeviceConfirmCopy({
  approxGb,
  recommendedLabel,
}: { approxGb?: number; recommendedLabel?: string } = {}) {
  const size =
    approxGb != null && Number.isFinite(approxGb) ? `~${approxGb.toFixed(1)} GB` : 'a large';
  const prefer = recommendedLabel
    ? `Prefer “${recommendedLabel}” on older or low-RAM machines, close other heavy tabs, then continue.`
    : 'Prefer a Tiny / smaller model on older or low-RAM machines, close other heavy tabs, then continue.';
  return [
    `This device looks constrained for ${size} local model.`,
    '',
    '• The tab may freeze while WebGPU loads weights into GPU memory',
    '• Low-RAM systems can crash (Aw Snap) if the GPU runs out of memory',
    `• ${prefer}`,
    '',
    'Load anyway?',
  ].join('\n');
}

/**
 * Whether the chat composer should receive keyboard focus.
 * Prefer the composer after send/stream/load; avoid stealing from selects, modals, etc.
 *
 * @param {{
 *   force?: boolean,
 *   modalOpen?: boolean,
 *   chatReady?: boolean,
 *   activeIsComposer?: boolean,
 *   activeIsOtherControl?: boolean,
 * }} [opts]
 */
export function shouldFocusChatComposer(opts: Record<string, any> = {}) {
  if (opts.modalOpen) return false;
  if (!opts.chatReady) return false;
  if (opts.force) return true;
  if (opts.activeIsComposer) return true;
  if (opts.activeIsOtherControl) return false;
  return true;
}

/** localStorage flag prefix — set after a successful model load (weights may be in Cache Storage). */
export const MODEL_CACHE_FLAG_PREFIX = 'vdl-ai-chat-model-cached:';

/** Cache Storage bucket for LiteRT `.litertlm` weights (app-owned; not the opaque HTTP disk cache). */
export const LITERT_MODEL_CACHE_NAME = 'vdl-litert-models';

const DEFAULT_GENERATION_CONFIG = {
  max_tokens: 512,
  temperature: 0.7,
  top_p: 0.9,
};

/** Gemma 4 may emit `<|channel>thought…<channel|>` when thinking is on; that burns tokens and yields tiny visible replies. */
const GEMMA4_GENERATION_CONFIG = {
  ...DEFAULT_GENERATION_CONFIG,
  max_tokens: 768,
  enable_thinking: false,
};

function generationConfigForModel(modelId) {
  const option = getModelOption(modelId);
  const wantsGemmaBudget = option?.family === 'gemma4' || option?.group === 'gemma4';
  const cfg: Record<string, any> = wantsGemmaBudget
    ? { ...GEMMA4_GENERATION_CONFIG }
    : { ...DEFAULT_GENERATION_CONFIG };
  if (
    option?.disableThinking ||
    option?.family === 'qwen3' ||
    option?.family === 'gemma4' ||
    option?.group === 'gemma4'
  ) {
    cfg.enable_thinking = false;
  }
  return cfg;
}

function modelBackend(modelId) {
  return getModelOption(modelId)?.backend || 'webllm';
}

function isLiteRTModel(modelId) {
  return modelBackend(modelId) === 'litert';
}

function isWebLLMGemmaMlC(modelId) {
  const option = getModelOption(modelId);
  return option?.family === 'gemma4' && modelBackend(modelId) === 'webllm';
}

function extractLiteRTText(response) {
  const parts = response?.content;
  if (typeof response === 'string') return response;
  if (typeof parts === 'string') return parts;
  if (!Array.isArray(parts)) {
    return normalizeCompletionText(response?.text ?? response?.message?.content ?? '');
  }
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text' || typeof part?.text === 'string') return part.text || '';
      return normalizeCompletionText(part);
    })
    .join('');
}

/**
 * Consume LiteRT `sendMessageStreaming` output across browsers.
 * Official API returns a `ReadableStream`. Chromium often supports
 * `for await...of` on streams; Safari/WebKit frequently does not
 * (`ReadableStream.prototype[Symbol.asyncIterator]` missing), which throws:
 * `undefined is not a function (near '...s of a...')`.
 * Prefer async iteration when present; otherwise use `getReader()`.
 * @param {AsyncIterable|ReadableStream|Promise<AsyncIterable|ReadableStream>|null|undefined} streamLike
 */
export async function* iterateMessageStream(streamLike) {
  let stream = streamLike;
  if (stream != null && typeof stream.then === 'function') {
    stream = await stream;
  }
  if (stream == null) return;

  if (typeof stream[Symbol.asyncIterator] === 'function') {
    yield* stream;
    return;
  }

  if (typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore — lock may already be released after close/error
      }
    }
    return;
  }

  if (typeof stream[Symbol.iterator] === 'function') {
    yield* stream;
    return;
  }

  throw new TypeError('LiteRT streaming response is not an async iterable or ReadableStream');
}

/** Strip accidental thinking / turn markers from streamed text (defense in depth). */
export function sanitizeModelReply(text) {
  if (!text) return '';
  let out = String(text);
  // Drop full thought channels if the runtime leaked them into content.
  // Only strip closed blocks — never `$`-to-EOF, or streaming suffixes after an
  // unclosed open tag are wiped (callers use `sanitize(...) || reply` for empties).
  out = out.replace(/<\|channel>thought[\s\S]*?<channel\|>/gi, '');
  out = out.replace(/<\|think\|>[\s\S]*?<\|\/think\|>/gi, '');
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Orphan open/close markers left mid-stream (no closed pair yet).
  out = out.replace(/<\|think\|>/g, '');
  out = out.replace(/<\/?think>/gi, '');
  out = out.replace(/<\/?turn\|>/g, '');
  out = out.replace(/<\|turn>(?:user|model|system)?/g, '');
  return out.trim();
}

/**
 * Replace jailbreak-compliance phrasing with a fixed safe reply.
 * @param {string} text
 * @returns {string}
 */
export function applyOutputGuardrails(text) {
  const cleaned = sanitizeModelReply(text) || String(text || '').trim();
  const check = validateLlmOutput({ text: cleaned });
  if (!check.allowed) {
    return check.message || LLM_OUTPUT_BLOCK_MESSAGE;
  }
  return cleaned;
}

export function getModelOption(modelId) {
  return MODEL_OPTIONS.find((m) => m.id === modelId) || null;
}

export function getModelDisplayName(modelId) {
  const option = getModelOption(modelId);
  if (!option) return modelId;
  return option.label
    .split('(~')[0]
    .replace(/\s+-\s+\w+$/, '')
    .trim();
}

/**
 * Yield to the browser so paint/input can run before a long sync stretch.
 * Engine.create still does heavy WASM/WebGPU work we cannot slice ourselves.
 */
export async function yieldToMain() {
  if (typeof globalThis.scheduler?.yield === 'function') {
    await globalThis.scheduler.yield();
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Collect coarse device signals for load guardrails.
 * Browsers do not expose free VRAM; deviceMemory is fingerprint-capped (often ≤8).
 * @param {GPUAdapter | null} [adapter]
 */
export function collectDeviceSignals(adapter: any = null) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const limits = adapter?.limits;
  return {
    deviceMemory: typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    maxStorageBufferBindingSize:
      typeof limits?.maxStorageBufferBindingSize === 'number'
        ? limits.maxStorageBufferBindingSize
        : null,
    maxBufferSize: typeof limits?.maxBufferSize === 'number' ? limits.maxBufferSize : null,
  };
}

/**
 * LM Studio–style pre-load heuristic (browser-limited).
 * Returns level: 'ok' | 'caution' | 'high' plus human reasons and a Tiny recommendation.
 *
 * @param {{ modelId?: string, systemInfo?: Record<string, unknown> }} [opts]
 */
export function assessLoadCapacity(opts: Record<string, any> = {}) {
  const modelId = opts.modelId || MODEL_OPTIONS[0]?.id;
  const option = getModelOption(modelId);
  const systemInfo = opts.systemInfo || {};
  const approxBytes = option?.approxBytes || 2 * GiB;
  const approxGb = approxBytes / GiB;

  const deviceMemory =
    typeof systemInfo.deviceMemory === 'number'
      ? systemInfo.deviceMemory
      : collectDeviceSignals().deviceMemory;
  const cores =
    typeof systemInfo.hardwareConcurrency === 'number'
      ? systemInfo.hardwareConcurrency
      : collectDeviceSignals().hardwareConcurrency;
  const maxStorage =
    typeof systemInfo.maxStorageBufferBindingSize === 'number'
      ? systemInfo.maxStorageBufferBindingSize
      : null;

  /** @type {'ok' | 'caution' | 'high'} */
  let level: 'ok' | 'caution' | 'high' = 'ok';
  const reasons: string[] = [];

  // WebLLM / Android pattern: ≤128 MiB storage binding ≈ very constrained GPU.
  const LOW_STORAGE_CAP = 128 * 1024 * 1024;
  if (maxStorage != null && maxStorage <= LOW_STORAGE_CAP && approxBytes > 0.5 * GiB) {
    level = 'high';
    reasons.push(
      'GPU maxStorageBufferBindingSize is very low (typical of constrained mobile GPUs). Large models often crash the tab.',
    );
  }

  // deviceMemory is intentionally coarse and capped; ≤4 is a strong weak-device signal.
  if (deviceMemory != null && deviceMemory <= 4 && approxBytes >= 1 * GiB) {
    level = 'high';
    reasons.push(
      `Browser reports ~${deviceMemory} GB RAM (approximate / capped). A ~${approxGb.toFixed(1)} GB model may freeze or OOM.`,
    );
  } else if (deviceMemory != null && deviceMemory <= 4) {
    if (level === 'ok') level = 'caution';
    reasons.push(
      `Browser reports ~${deviceMemory} GB RAM — expect longer freezes during WebGPU init.`,
    );
  }

  // Largest catalog models on ambiguous 8 GB deviceMemory bucket.
  if (deviceMemory != null && deviceMemory <= 8 && approxBytes >= 3.5 * GiB && level === 'ok') {
    level = 'caution';
    reasons.push(
      `~${approxGb.toFixed(1)} GB model on a device reporting ≤8 GB RAM — close other tabs before loading.`,
    );
  }

  if (cores != null && cores <= 2 && approxBytes >= 1 * GiB) {
    if (level === 'ok') level = 'caution';
    reasons.push(
      `Only ${cores} logical CPU cores reported — download/compile may stall the UI longer.`,
    );
  } else if (cores != null && cores <= 4 && approxBytes >= 2.5 * GiB && level === 'ok') {
    level = 'caution';
    reasons.push(`Modest CPU (${cores} cores) with a ~${approxGb.toFixed(1)} GB model.`);
  }

  const recommended =
    level === 'ok'
      ? null
      : getModelOption(TINY_MODEL_ID) || MODEL_OPTIONS.find((m) => m.tier === 'Tiny') || null;

  return {
    level,
    reasons,
    approxBytes,
    approxGb,
    deviceMemory,
    hardwareConcurrency: cores,
    maxStorageBufferBindingSize: maxStorage,
    recommendedModelId: recommended?.id || null,
    recommendedLabel: recommended ? getModelDisplayName(recommended.id) : null,
    freezeHint: LOAD_FREEZE_HINT,
  };
}

/**
 * @param {string} modelId
 * @returns {string}
 */
export function modelCacheFlagKey(modelId) {
  return `${MODEL_CACHE_FLAG_PREFIX}${modelId}`;
}

/**
 * Whether localStorage records a prior successful load for this model id.
 * @param {string} modelId
 * @returns {boolean}
 */
export function isModelMarkedCached(modelId) {
  if (!modelId) return false;
  try {
    return localStorage.getItem(modelCacheFlagKey(modelId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Record that weights for this model id were loaded successfully (Cache Storage and/or HTTP).
 * @param {string} modelId
 */
export function markModelCached(modelId) {
  if (!modelId) return;
  try {
    localStorage.setItem(modelCacheFlagKey(modelId), '1');
  } catch {
    // private mode / disabled storage
  }
}

/**
 * @returns {Promise<Cache | null>}
 */
export async function openLiteRTModelCache() {
  if (typeof caches === 'undefined' || typeof caches.open !== 'function') return null;
  try {
    return await caches.open(LITERT_MODEL_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * @param {string} url
 * @returns {Promise<Response | null>}
 */
export async function matchCachedModel(url) {
  const cache = await openLiteRTModelCache();
  if (!cache || !url) return null;
  try {
    const hit = await cache.match(url);
    return hit || null;
  } catch {
    return null;
  }
}

/**
 * Persist model bytes under the LiteRT Cache Storage bucket.
 * @param {string} url
 * @param {Blob} blob
 * @returns {Promise<boolean>}
 */
export async function putCachedModel(url, blob) {
  const cache = await openLiteRTModelCache();
  if (!cache || !url || !blob) return false;
  try {
    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(blob.size),
    });
    await cache.put(url, new Response(blob, { status: 200, headers }));
    return true;
  } catch {
    // QuotaExceededError or Cache API unavailable for this origin size
    return false;
  }
}

/**
 * Delete the LiteRT model Cache Storage bucket (best-effort).
 * @returns {Promise<boolean>}
 */
export async function deleteLiteRTModelCache() {
  if (typeof caches === 'undefined' || typeof caches.delete !== 'function') return false;
  try {
    return await caches.delete(LITERT_MODEL_CACHE_NAME);
  } catch {
    return false;
  }
}

/**
 * Report progress while reading a Response/Blob body into a Blob.
 * @param {Response | Blob} source
 * @param {(p: { loaded: number, received: number, totalBytes: number }) => void} [onProgress]
 * @param {number} [knownTotal]
 * @returns {Promise<Blob>}
 */
async function readBodyToBlobWithProgress(source, onProgress, knownTotal = 0) {
  if (source instanceof Blob) {
    onProgress?.({
      loaded: 1,
      received: source.size,
      totalBytes: source.size,
    });
    return source;
  }

  const totalBytes = knownTotal || Number(source.headers?.get?.('content-length')) || 0;
  let received = 0;

  if (!source.body || typeof source.body.getReader !== 'function') {
    const blob = await source.blob();
    onProgress?.({
      loaded: 1,
      received: blob.size,
      totalBytes: totalBytes || blob.size,
    });
    return blob;
  }

  const reader = source.body.getReader();
  const chunks: BlobPart[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      const loaded = totalBytes > 0 ? Math.min(1, received / totalBytes) : 0;
      onProgress?.({ loaded, received, totalBytes });
    }
  } catch (err) {
    try {
      reader.cancel?.();
    } catch {
      // ignore cancel after read failure
    }
    throw err;
  }
  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  onProgress?.({
    loaded: 1,
    received: blob.size,
    totalBytes: totalBytes || blob.size,
  });
  return blob;
}

const FETCH_RETRY_STATUS = new Set([429, 502, 503, 504]);
const FETCH_RETRY_ATTEMPTS = 3;
const FETCH_RETRY_BASE_MS = 400;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientFetchFailure(err: unknown, status?: number): boolean {
  if (typeof status === 'number') {
    return FETCH_RETRY_STATUS.has(status);
  }
  const msg = String((err as Error)?.message || err || '');
  // Definitive HTTP status failures from this helper are not transient.
  if (/Failed to fetch model \(\d+/.test(msg)) return false;
  return /network error|failed to fetch|load failed|js stream error|err_network|aborted|stream error/i.test(
    msg,
  );
}

/**
 * Load LiteRT model bytes from Cache Storage or network, then optionally stream.
 * Always buffers once so we can persist a durable Cache Storage entry.
 * Network fetch + body read retries transient failures (BC: same return shape).
 *
 * @param {string} url
 * @param {{
 *   asStream?: boolean,
 *   urlIsLocal?: boolean,
 *   onProgress?: (p: { loaded: number, received: number, totalBytes: number }) => void,
 *   fetchRetries?: number,
 * }} [options]
 * @returns {Promise<{ modelSource: Blob | ReadableStream, source: 'cache' | 'local' | 'network' }>}
 */
export async function loadLiteRTModelBytes(url: string, options: Record<string, any> = {}) {
  const asStream = options.asStream === true;
  const urlIsLocal = options.urlIsLocal === true;
  const onProgress = options.onProgress;
  const maxAttempts =
    typeof options.fetchRetries === 'number' && options.fetchRetries >= 0
      ? Math.floor(options.fetchRetries) + 1
      : FETCH_RETRY_ATTEMPTS;

  const cached = await matchCachedModel(url);
  if (cached) {
    const blob = await readBodyToBlobWithProgress(cached, onProgress);
    const modelSource = asStream && typeof blob.stream === 'function' ? blob.stream() : blob;
    return { modelSource, source: 'cache' };
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const statusErr = new Error(
          `Failed to fetch model (${res.status} ${res.statusText || ''}).`.trim(),
        );
        if (attempt < maxAttempts && isTransientFetchFailure(statusErr, res.status)) {
          lastErr = statusErr;
          await sleepMs(FETCH_RETRY_BASE_MS * attempt);
          continue;
        }
        throw statusErr;
      }
      const totalBytes = Number(res.headers.get('content-length')) || 0;
      const blob = await readBodyToBlobWithProgress(res, onProgress, totalBytes);
      await putCachedModel(url, blob);

      const networkSource = urlIsLocal ? 'local' : 'network';
      const modelSource = asStream && typeof blob.stream === 'function' ? blob.stream() : blob;
      return { modelSource, source: networkSource };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts && isTransientFetchFailure(err)) {
        await sleepMs(FETCH_RETRY_BASE_MS * attempt);
        continue;
      }
      break;
    }
  }

  const finalMsg = String((lastErr as Error)?.message || lastErr || 'Failed to fetch model.');
  if (/Failed to fetch model \(\d+/i.test(finalMsg)) {
    throw lastErr instanceof Error ? lastErr : new Error(finalMsg);
  }
  throw rewriteLiteRTLoadError(lastErr instanceof Error ? lastErr : new Error(finalMsg));
}

const localModelProbeCache = new Map();

function absoluteUrl(pathname) {
  if (typeof location === 'undefined' || !location?.origin) return pathname;
  return new URL(pathname, location.origin).href;
}

/**
 * Prefer a local Vite mirror at `/models/<id>/` (from `pnpm models:fetch`) when present.
 * Falls back to the Hugging Face URLs on MODEL_OPTIONS.
 *
 * WebLLM treats model URLs like HF repos and requests `{model}/resolve/main/<file>`,
 * so the local model URL includes that suffix and Vite strips it when serving.
 */
async function resolveModelSource(option) {
  if (!option?.modelUrl || !option?.modelLibUrl) {
    return { modelUrl: option?.modelUrl, modelLibUrl: option?.modelLibUrl, local: false };
  }

  const localRoot = `/models/${option.id}`;
  const localModelUrl = absoluteUrl(`${localRoot}/resolve/main/`);
  const localLibUrl = absoluteUrl(`${localRoot}/libs/${option.id}-webgpu.wasm`);

  if (localModelProbeCache.has(option.id)) {
    const hit = localModelProbeCache.get(option.id);
    return hit
      ? { modelUrl: localModelUrl, modelLibUrl: localLibUrl, local: true }
      : { modelUrl: option.modelUrl, modelLibUrl: option.modelLibUrl, local: false };
  }

  try {
    const probe = await fetch(`${localRoot}/mlc-chat-config.json`, {
      method: 'GET',
      cache: 'no-store',
    });
    const ok = probe.ok;
    localModelProbeCache.set(option.id, ok);
    if (ok) {
      return { modelUrl: localModelUrl, modelLibUrl: localLibUrl, local: true };
    }
  } catch {
    localModelProbeCache.set(option.id, false);
  }

  return { modelUrl: option.modelUrl, modelLibUrl: option.modelLibUrl, local: false };
}

async function resolveLiteRTModelUrl(option) {
  if (!option?.modelUrl) return option?.modelUrl;
  const fileName = option.modelFile || pathBasename(option.modelUrl);
  const localPath = `/models/${option.id}/${fileName}`;

  if (localModelProbeCache.has(option.id)) {
    return localModelProbeCache.get(option.id) ? absoluteUrl(localPath) : option.modelUrl;
  }

  try {
    const probe = await fetch(localPath, { method: 'HEAD', cache: 'no-store' });
    const ok = probe.ok;
    localModelProbeCache.set(option.id, ok);
    if (ok) {
      console.warn(`[AiChat] Using local LiteRT model for ${option.id}: ${localPath}`);
      return absoluteUrl(localPath);
    }
  } catch {
    localModelProbeCache.set(option.id, false);
  }

  return option.modelUrl;
}

function pathBasename(urlOrPath) {
  const cleaned = String(urlOrPath || '').split('?')[0];
  const parts = cleaned.split('/').filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function modelSupportsSystemRole(modelId) {
  // LiteRT conversations accept a system preface (full Vanduo Labs / FOSS prompt).
  // Community Gemma 4 MLC (`gemma_instruction`) only defines user/model roles —
  // injecting system (or folding it into the user turn) truncates / breaks replies.
  // For those models we omit system and rely on deterministic LLM guardrails only.
  if (isLiteRTModel(modelId)) return true;
  if (isWebLLMGemmaMlC(modelId)) return false;
  return true;
}

function buildChatPayload(modelId, historyMessages) {
  // Always copy — WebLLM/request holders must not share our mutable history array.
  const history = historyMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  if (!modelSupportsSystemRole(modelId)) {
    return history;
  }
  return [{ role: 'system', content: buildChatSystemPrompt() }, ...history];
}

async function buildModelAppConfig(modelId) {
  const option = getModelOption(modelId);
  if (!option?.modelUrl || !option?.modelLibUrl) return null;
  const source = await resolveModelSource(option);
  if (source.local) {
    console.warn(`[AiChat] Using local model mirror for ${option.id}: ${source.modelUrl}`);
  }
  return {
    model_list: [
      {
        model: source.modelUrl,
        model_id: option.id,
        model_lib: source.modelLibUrl,
        required_features: option.requires || [],
        overrides: option.overrides || undefined,
      },
    ],
  };
}

function normalizeCompletionText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => normalizeCompletionText(part)).join('');
  }
  if (value && typeof value === 'object') {
    return normalizeCompletionText(value.text ?? value.content ?? value.value ?? '');
  }
  return '';
}

function extractCompletionChoiceText(choice) {
  if (!choice) return '';
  return (
    normalizeCompletionText(choice.delta?.content) ||
    normalizeCompletionText(choice.delta?.text) ||
    normalizeCompletionText(choice.message?.content) ||
    normalizeCompletionText(choice.text)
  );
}

function extractCompletionResponseText(response) {
  const choice = response?.choices?.[0];
  return extractCompletionChoiceText(choice);
}

async function loadWebLLM(customLoader: any = null) {
  if (_webllmModule) return _webllmModule;
  if (typeof window !== 'undefined' && window.__vdlWebLLMModule) {
    _webllmModule = window.__vdlWebLLMModule;
    return _webllmModule;
  }
  try {
    if (typeof customLoader === 'function') {
      _webllmModule = await customLoader();
    } else {
      _webllmModule = await import(/* @vite-ignore */ /* webpackIgnore: true */ CDN.webllm as any);
    }
    if (typeof window !== 'undefined') {
      if (window.__vdlWebLLMModule && window.__vdlWebLLMModule !== _webllmModule) {
        console.warn(
          '[AiChat] Multiple WebLLM module instances detected; Tokenizer bindings may fail. Hard-refresh the tab.',
        );
      }
      window.__vdlWebLLMModule = _webllmModule;
    }
    return _webllmModule;
  } catch (err) {
    console.error('[AiChat] Failed to load WebLLM:', err);
    throw err;
  }
}

async function loadLiteRT(customLoader: any = null) {
  if (_litertModule) return _litertModule;
  if (typeof window !== 'undefined' && window.__vdlLiteRTModule) {
    _litertModule = window.__vdlLiteRTModule;
    return _litertModule;
  }
  try {
    if (typeof customLoader === 'function') {
      _litertModule = await customLoader();
    } else {
      _litertModule = await import(/* @vite-ignore */ /* webpackIgnore: true */ CDN.litert as any);
    }
    if (typeof window !== 'undefined') {
      window.__vdlLiteRTModule = _litertModule;
    }
    return _litertModule;
  } catch (err) {
    console.error('[AiChat] Failed to load LiteRT-LM:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FOSS Guardrails (Deterministic Scanner & System Prompt)
// ═══════════════════════════════════════════════════════════════════════

export const InputGuardrail = {
  patterns: DEFAULT_LLM_GUARD_PATTERNS.map((pattern) => pattern.regex),

  validate(text) {
    const result = validateLlmInput({ text });
    if (!result.allowed) {
      return {
        isValid: false,
        reason: result.message,
      };
    }
    return { isValid: true };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// AiChat — Headless API
// ═══════════════════════════════════════════════════════════════════════

export class AiChat {
  static VERSION = VDL_AI_CHAT_VERSION;

  modelId: string;
  engine: any;
  _conversation: any;
  messages: Array<{ role: string; content: string; [key: string]: unknown }>;
  _progressSubscribers: Array<(data: any) => void>;
  _isLoaded: boolean;
  _isLoading: boolean;
  _needsEngineReload: boolean;
  _tools: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
  _systemPromptOptions: Record<string, unknown>;
  _toolProtocol: 'auto' | 'native' | 'xml';
  _nativeToolsSupported: boolean | null;
  _customLoadLiteRT: ((...args: any[]) => any) | null;
  _customLoadWebLLM: ((...args: any[]) => any) | null;
  _liteRtWasmPath: string | null;

  constructor(options: Record<string, any> = {}) {
    this.modelId = options.modelId || MODEL_OPTIONS[0].id;
    this.engine = null;
    this._conversation = null;
    this.messages = [];
    this._progressSubscribers = [];
    this._isLoaded = false;
    this._isLoading = false;
    // WebLLM Gemma MLC: resetChat() does not reliably clear KV — next cold turn must reload.
    this._needsEngineReload = false;
    /** @type {AiToolDefinition[]} */
    this._tools = [];
    this._systemPromptOptions = options.systemPromptOptions || {};
    /** @type {'auto' | 'native' | 'xml'} */
    this._toolProtocol = options.toolProtocol || 'auto';
    this._nativeToolsSupported = null;
    /** Optional host-provided loaders (bundle LiteRT/WebLLM for strict CSP).
     * Named distinctly from `_loadLiteRT()` / `_loadWebLLM()` methods — an own
     * property with the same name would shadow the prototype method and make
     * `load()` import the package without ever calling Engine.create. */
    this._customLoadLiteRT = typeof options.loadLiteRT === 'function' ? options.loadLiteRT : null;
    this._customLoadWebLLM = typeof options.loadWebLLM === 'function' ? options.loadWebLLM : null;
    /**
     * Same-origin directory (or .js URL) for LiteRT WASM glue.
     * Required under CSP `script-src 'self'` — the package default is jsDelivr.
     * @type {string | null}
     */
    this._liteRtWasmPath =
      typeof options.liteRtWasmPath === 'string' && options.liteRtWasmPath.trim()
        ? options.liteRtWasmPath.trim()
        : null;
  }

  /**
   * @param {AiToolDefinition[]} defs
   */
  registerTools(defs) {
    const list = Array.isArray(defs) ? defs : [];
    this._tools = list
      .map((d) => ({
        name: String(d?.name || '').trim(),
        description: String(d?.description || ''),
        parameters:
          d?.parameters && typeof d.parameters === 'object'
            ? d.parameters
            : { type: 'object', properties: {} },
      }))
      .filter((d) => d.name);
    // Conversation preface may include tools — force refresh on next turn.
    this._needsEngineReload = true;
    this._nativeToolsSupported = null;
  }

  /**
   * @param {Record<string, unknown>} options
   */
  setSystemPromptOptions(options = {}) {
    this._systemPromptOptions = options && typeof options === 'object' ? { ...options } : {};
    this._needsEngineReload = true;
  }

  _composeSystemPrompt() {
    return buildChatSystemPrompt({
      ...this._systemPromptOptions,
      toolsEnabled: this._tools.length > 0,
      toolNames: this._tools.map((t) => t.name),
    });
  }

  _toolsSupportedForModel() {
    return isLiteRTModel(this.modelId) && !getLiteRTRuntimeBlockReason(this.modelId);
  }

  async setModelId(modelId: string, options: Record<string, any> = {}) {
    const { resetMessages = false, force = false } = options;
    if (this._isLoading) {
      throw new Error('Cannot change model ID while loading.');
    }

    const modelChanged = this.modelId !== modelId;
    // Always await teardown before pointing at a new backend — LiteRT/WebLLM
    // share the WebGPU adapter and racing dispose breaks subsequent loads.
    // `force` also tears down when reloading the same catalog id (host Reload).
    if ((modelChanged || force) && (this._isLoaded || this.engine || this._conversation)) {
      await this._disposeEngine();
      this.engine = null;
      this._conversation = null;
      this._isLoaded = false;
      this._needsEngineReload = false;
    }

    this.modelId = modelId;
    if (resetMessages) {
      this.reset();
    }
  }

  onProgress(callback) {
    this._progressSubscribers.push(callback);
    return () => {
      this._progressSubscribers = this._progressSubscribers.filter((cb) => cb !== callback);
    };
  }

  _emitProgress(data) {
    for (const cb of this._progressSubscribers) cb(data);
  }

  async _disposeEngine() {
    try {
      if (this._conversation && typeof this._conversation.delete === 'function') {
        await this._conversation.delete();
      }
    } catch {
      // ignore conversation teardown
    }
    this._conversation = null;
    try {
      if (this.engine && typeof this.engine.delete === 'function') {
        await this.engine.delete();
        return;
      }
      const maybePromise = this.engine?.unload?.();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        await maybePromise.catch(() => {});
      }
    } catch {
      // Ignore teardown errors.
    }
  }

  async _ensureLiteRTConversation(forceNew = false) {
    if (!forceNew && this._conversation) return this._conversation;
    if (this._conversation && typeof this._conversation.delete === 'function') {
      try {
        await this._conversation.delete();
      } catch {
        /* ignore */
      }
    }
    const systemContent = this._composeSystemPrompt();
    const preface: any = modelSupportsSystemRole(this.modelId)
      ? { messages: [{ role: 'system', content: systemContent }] }
      : undefined;

    // Prefer native tools when protocol allows and tools are registered.
    if (
      preface &&
      this._tools.length > 0 &&
      this._toolProtocol !== 'xml' &&
      this._toolsSupportedForModel()
    ) {
      try {
        preface.tools = this._tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
        this._conversation = await this.engine.createConversation({ preface });
        this._nativeToolsSupported = true;
        return this._conversation;
      } catch (err) {
        console.warn('[AiChat] Native Preface.tools rejected; falling back to XML protocol.', err);
        this._nativeToolsSupported = false;
        delete preface.tools;
      }
    }

    this._conversation = await this.engine.createConversation(preface ? { preface } : undefined);
    if (this._tools.length > 0 && this._nativeToolsSupported !== true) {
      this._nativeToolsSupported = false;
    }
    return this._conversation;
  }

  /**
   * Extract structured tool calls from a LiteRT message if present.
   * @param {unknown} message
   * @returns {Array<{ name: string, args: Record<string, unknown> }>}
   */
  _extractNativeToolCalls(message) {
    const raw = message?.tool_calls || message?.toolCalls || [];
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw
      .map((call) => {
        const name = call?.function?.name || call?.name || '';
        let args = call?.function?.arguments ?? call?.arguments ?? {};
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch {
            args = { raw: args };
          }
        }
        if (!args || typeof args !== 'object' || Array.isArray(args)) args = {};
        return { name: String(name), args };
      })
      .filter((c) => c.name);
  }

  /**
   * @param {string} userText
   * @param {{
   *   execute: (name: string, args: Record<string, unknown>) => unknown | Promise<unknown>,
   *   maxRounds?: number,
   *   onUpdate?: (text: string) => void,
   *   onFinish?: (usage: unknown) => void,
   *   onTool?: (info: { name: string, args: Record<string, unknown>, result: unknown }) => void,
   * }} options
   */
  async generateWithTools(userText: string, options: Record<string, any> = {}) {
    const execute = options.execute;
    const maxRounds = Math.max(1, Number(options.maxRounds) || 4);
    const onUpdate = options.onUpdate;
    const onFinish = options.onFinish;
    const onTool = options.onTool;

    if (typeof execute !== 'function') {
      throw new Error('generateWithTools requires an execute(name, args) callback.');
    }
    if (!this._toolsSupportedForModel()) {
      throw new Error(TOOLS_UNSUPPORTED_ERROR);
    }
    if (!this._tools.length) {
      throw new Error('No tools registered. Call registerTools() first.');
    }

    const guardrailCheck = validateLlmInput({ text: userText });
    if (!guardrailCheck.allowed) {
      throw toGuardrailError(guardrailCheck);
    }
    if (!this._isLoaded || !this.engine) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const startingFreshConversation = this.messages.length === 0;
    this.messages.push({ role: 'user', content: userText });

    try {
      if (startingFreshConversation && this._needsEngineReload) {
        await this._reloadEngine('reset');
      }

      let pendingUserPayload = userText;
      let finalReply = '';

      for (let round = 0; round < maxRounds; round += 1) {
        const { reply, rawMessage } = await this._completeOnceLiteRTDetailed(
          pendingUserPayload,
          onUpdate,
        );
        const nativeCalls = this._extractNativeToolCalls(rawMessage);
        const xmlParsed = parseXmlToolCalls(reply);
        const calls = nativeCalls.length > 0 ? nativeCalls : xmlParsed.calls;

        if (!calls.length) {
          finalReply = applyOutputGuardrails(reply.trim());
          if (!finalReply) {
            this.messages.pop();
            throw new Error(`Model ${this.modelId} returned an empty response during tool loop.`);
          }
          this.messages.push({ role: 'assistant', content: finalReply });
          if (onFinish) onFinish(null);
          if (onUpdate) onUpdate(finalReply);
          return finalReply;
        }

        this.messages.push({ role: 'assistant', content: reply });
        const results: Array<{ name: string; result: unknown }> = [];
        for (const call of calls) {
          const validation = validateToolCall({
            name: call.name,
            args: call.args,
            allowlist: this._tools,
          });
          if (!validation.allowed) {
            const errPayload = {
              error: validation.code,
              message: validation.message,
            };
            results.push({ name: call.name, result: errPayload });
            if (onTool) onTool({ name: call.name, args: call.args, result: errPayload });
            continue;
          }
          let result: unknown;
          try {
            result = await execute(call.name, call.args || {});
          } catch (err: any) {
            result = {
              error: 'tool.execute_failed',
              message: err?.message || String(err),
            };
          }
          results.push({ name: call.name, result });
          if (onTool) onTool({ name: call.name, args: call.args, result });
        }

        // Feed tool results back as the next user turn (XML protocol is portable).
        pendingUserPayload = results.map((r) => formatXmlToolResult(r.name, r.result)).join('\n');
        this.messages.push({ role: 'user', content: pendingUserPayload });
      }

      throw new Error(
        `Tool loop exceeded maxRounds (${maxRounds}) without a final assistant reply.`,
      );
    } catch (err) {
      if (
        this.messages.length &&
        this.messages[this.messages.length - 1]?.role === 'user' &&
        this.messages[this.messages.length - 1]?.content === userText
      ) {
        this.messages.pop();
      }
      console.error('[AiChat] generateWithTools error:', err);
      throw err;
    }
  }

  /**
   * Like _completeOnceLiteRT but also returns the last raw message for tool_calls.
   */
  async _completeOnceLiteRTDetailed(userText, onUpdate) {
    const conversation = await this._ensureLiteRTConversation(false);
    let reply = '';
    let rawMessage = null;

    if (typeof conversation.sendMessageStreaming === 'function') {
      for await (const chunk of iterateMessageStream(conversation.sendMessageStreaming(userText))) {
        rawMessage = chunk;
        const delta = extractLiteRTText(chunk);
        if (!delta) continue;
        if (Array.isArray(chunk?.content)) {
          reply += delta;
        } else if (delta.startsWith(reply)) {
          reply = delta;
        } else {
          reply += delta;
        }
        const cleanedPartial = sanitizeModelReply(reply) || reply;
        if (onUpdate) onUpdate(cleanedPartial);
      }
    } else {
      const response = await conversation.sendMessage(userText);
      rawMessage = response;
      reply = extractLiteRTText(response);
      if (reply && onUpdate) onUpdate(sanitizeModelReply(reply) || reply);
    }

    reply = sanitizeModelReply(reply) || reply.trim();
    return { reply, usage: null, rawMessage };
  }

  async load() {
    // Heal inconsistent state: disposed engine with stale loaded flag would
    // no-op forever and leave hosts showing Ready without a usable runtime.
    if (this._isLoaded && this.engine) return;
    if (this._isLoaded && !this.engine) {
      this._isLoaded = false;
    }
    if (this._isLoading) throw new Error('Model is already loading.');

    const runtimeBlock = getLiteRTRuntimeBlockReason(this.modelId);
    if (runtimeBlock) {
      const err = new Error(runtimeBlock);
      this._emitProgress({ stage: 'error', message: err.message });
      throw err;
    }

    this._isLoading = true;
    try {
      // Clear any partial engine left by a previous failed load attempt.
      if (this.engine || this._conversation) {
        await this._disposeEngine();
        this.engine = null;
        this._conversation = null;
      }
      if (isLiteRTModel(this.modelId)) {
        await this._loadLiteRT();
      } else {
        await this._loadWebLLM();
      }
      if (!this.engine) {
        throw new Error('Model engine failed to initialize.');
      }
      this._isLoaded = true;
      this._needsEngineReload = false;
      markModelCached(this.modelId);
      this._emitProgress({ stage: 'ready', message: 'Model loaded and ready!' });
    } catch (err: any) {
      const normalized: any = isLiteRTModel(this.modelId) ? rewriteLiteRTLoadError(err) : err;
      try {
        await this._disposeEngine();
      } catch {
        // ignore teardown after failed load
      }
      this.engine = null;
      this._conversation = null;
      this._isLoaded = false;
      this._emitProgress({
        stage: 'error',
        message: normalized?.message || 'Failed to load model.',
      });
      throw normalized;
    } finally {
      this._isLoading = false;
    }
  }

  async _loadLiteRT() {
    const option = getModelOption(this.modelId);
    const runtimeBlock = getLiteRTRuntimeBlockReason(option);
    if (runtimeBlock) {
      throw new Error(runtimeBlock);
    }

    const litert = await loadLiteRT(this._customLoadLiteRT);
    const { Engine, loadLiteRtLm, hasGlobalLiteRtLm, hasGlobalLiteRtLmPromise } = litert;
    if (typeof Engine?.create !== 'function') {
      throw new Error('LiteRT module loaded without Engine.create — check loadLiteRT().');
    }

    // Default package path is jsDelivr; CSP hosts must pass liteRtWasmPath (same-origin).
    if (
      this._liteRtWasmPath &&
      typeof loadLiteRtLm === 'function' &&
      !hasGlobalLiteRtLmPromise?.() &&
      !hasGlobalLiteRtLm?.()
    ) {
      this._emitProgress({
        stage: 'init',
        message: 'Loading LiteRT WASM runtime (same-origin)…',
      });
      await yieldToMain();
      try {
        await loadLiteRtLm(this._liteRtWasmPath);
      } catch (err) {
        throw rewriteLiteRTLoadError(err);
      }
    }

    this._emitProgress({ stage: 'init', message: 'Initializing LiteRT WebGPU engine…' });
    await yieldToMain();

    const modelUrl = await resolveLiteRTModelUrl(option);
    const displayName = getModelDisplayName(this.modelId);
    const isLocal = /\/models\//.test(String(modelUrl || ''));
    const alreadyCached = Boolean(await matchCachedModel(modelUrl));
    let loadSource = alreadyCached ? 'cache' : isLocal ? 'local' : 'network';
    this._emitProgress({
      stage: 'downloading',
      message: alreadyCached
        ? `Loading ${displayName} from browser cache…`
        : isLocal
          ? `Using local LiteRT model for ${displayName}…`
          : `Downloading / reading ${displayName} (LiteRT)…`,
      text: modelUrl,
      loaded: 0,
      source: loadSource,
    });

    // Engine accepts URL | ReadableStream | Blob.
    // App-fetched weights are always fully buffered (Cache Storage). Passing
    // Blob (not blob.stream()) avoids a second ReadableStream pass that can
    // fail mid-load in headless Chrome for large E4B models.
    if (option?.litertKind !== 'web-official') {
      console.warn(`[AiChat] Buffering portable LiteRT model as Blob: ${option?.id}`);
    }
    const onFetchProgress = ({ loaded, received, totalBytes }) => {
      const pct =
        totalBytes > 0
          ? `${Math.round(loaded * 100)}%`
          : `${(received / (1024 * 1024)).toFixed(1)} MB`;
      this._emitProgress({
        stage: 'downloading',
        text:
          totalBytes > 0
            ? `${pct} · ${(received / (1024 * 1024)).toFixed(0)} / ${(totalBytes / (1024 * 1024)).toFixed(0)} MB`
            : pct,
        loaded: totalBytes > 0 ? loaded : Math.min(0.95, received / (2 * GiB)),
        message:
          loadSource === 'cache'
            ? 'Reading cached model weights…'
            : isLocal
              ? 'Reading local model weights…'
              : 'Fetching model weights…',
        source: loadSource,
      });
    };
    const loadedBytes = await loadLiteRTModelBytes(modelUrl, {
      asStream: false,
      urlIsLocal: isLocal,
      onProgress: onFetchProgress,
    });
    loadSource = loadedBytes.source;
    const modelSource = loadedBytes.modelSource;

    this._emitProgress({
      stage: 'compiling',
      message: LOAD_FREEZE_HINT,
      text: 'GPU upload / shader compile',
      loaded: 1,
    });
    await yieldToMain();

    try {
      this.engine = await Engine.create({
        model: modelSource,
        mainExecutorSettings: {
          maxNumTokens: option?.maxNumTokens || 4096,
        },
      });
    } catch (err) {
      throw rewriteLiteRTLoadError(err);
    }
    if (!this.engine || typeof this.engine.createConversation !== 'function') {
      throw new Error('LiteRT Engine.create failed to initialize an engine.');
    }
    await this._ensureLiteRTConversation(true);
  }

  async _loadWebLLM() {
    const { CreateMLCEngine } = await loadWebLLM(this._customLoadWebLLM);
    this._emitProgress({ stage: 'init', message: 'Initializing WebGPU engine...' });
    await yieldToMain();

    const appConfig = await buildModelAppConfig(this.modelId);
    const engineConfig: Record<string, any> = {
      initProgressCallback: (progress: any) => {
        const loaded = typeof progress.progress === 'number' ? progress.progress : 0;
        const text = String(progress.text || '');
        const compiling =
          loaded >= 0.98 || /compil|shader|finish loading|loading model to gpu/i.test(text);
        this._emitProgress({
          stage: compiling ? 'compiling' : 'downloading',
          text: progress.text,
          loaded: progress.progress,
          message: compiling ? LOAD_FREEZE_HINT : undefined,
        });
      },
    };
    if (appConfig) {
      engineConfig.appConfig = appConfig;
    }

    this.engine = await CreateMLCEngine(this.modelId, engineConfig);
  }

  isLoaded() {
    return this._isLoaded;
  }

  isLoading() {
    return this._isLoading;
  }

  _chatOptionsForReload() {
    const option = getModelOption(this.modelId);
    return option?.overrides ? { ...option.overrides } : undefined;
  }

  async _reloadEngine(reason = 'reset') {
    if (isLiteRTModel(this.modelId)) {
      await this._ensureLiteRTConversation(true);
      this._needsEngineReload = false;
      return;
    }
    if (!this.engine || typeof this.engine.reload !== 'function') {
      if (typeof this.engine?.resetChat === 'function') {
        await this.engine.resetChat();
      }
      this._needsEngineReload = false;
      return;
    }
    this._emitProgress({
      stage: 'init',
      message: reason === 'reset' ? 'Resetting model state…' : 'Refreshing model state…',
    });
    const chatOpts = this._chatOptionsForReload();
    if (chatOpts) {
      await this.engine.reload(this.modelId, chatOpts);
    } else {
      await this.engine.reload(this.modelId);
    }
    this._needsEngineReload = false;
    this._emitProgress({ stage: 'ready', message: 'Model ready.' });
  }

  async _completeOnceLiteRT(userText, onUpdate) {
    const conversation = await this._ensureLiteRTConversation(false);
    let reply = '';

    if (typeof conversation.sendMessageStreaming === 'function') {
      // Do not `for await` the raw return value — it is a ReadableStream, and
      // Safari cannot async-iterate ReadableStream (see iterateMessageStream).
      for await (const chunk of iterateMessageStream(conversation.sendMessageStreaming(userText))) {
        const delta = extractLiteRTText(chunk);
        if (!delta) continue;
        // Streaming chunks may be cumulative or incremental — prefer append of delta text pieces.
        if (Array.isArray(chunk?.content)) {
          reply += delta;
        } else if (delta.startsWith(reply)) {
          reply = delta;
        } else {
          reply += delta;
        }
        const cleanedPartial = sanitizeModelReply(reply) || reply;
        if (onUpdate) onUpdate(cleanedPartial);
      }
    } else {
      const response = await conversation.sendMessage(userText);
      reply = extractLiteRTText(response);
      if (reply && onUpdate) onUpdate(sanitizeModelReply(reply) || reply);
    }

    reply = sanitizeModelReply(reply) || reply.trim();
    return { reply, usage: null };
  }

  async _completeOnce(payload, genConfig, onUpdate) {
    const chunks = await this.engine.chat.completions.create({
      messages: payload,
      ...genConfig,
      stream: true,
      stream_options: { include_usage: true },
    });

    let reply = '';
    let usage = null;

    for await (const chunk of chunks) {
      if (chunk.usage) usage = chunk.usage;
      const delta = extractCompletionResponseText(chunk);
      if (!delta) continue;
      reply += delta;
      const cleanedPartial = sanitizeModelReply(reply) || reply;
      if (onUpdate) onUpdate(cleanedPartial);
    }

    reply = sanitizeModelReply(reply) || reply.trim();

    if (!reply.trim()) {
      await this._reloadEngine('empty');
      const completion = await this.engine.chat.completions.create({
        messages: payload,
        ...genConfig,
        stream: false,
      });
      reply = sanitizeModelReply(extractCompletionResponseText(completion));
      usage = completion?.usage || usage;
      if (reply && onUpdate) onUpdate(reply);
    }

    return { reply, usage };
  }

  async generate(
    userText: string,
    onUpdate?: ((partial: string) => void) | null,
    onFinish?: ((usage: unknown) => void) | null,
  ) {
    const guardrailCheck = validateLlmInput({ text: userText });
    if (!guardrailCheck.allowed) {
      throw toGuardrailError(guardrailCheck);
    }

    if (!this._isLoaded || !this.engine) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const startingFreshConversation = this.messages.length === 0;
    this.messages.push({ role: 'user', content: userText });
    const useLiteRT = isLiteRTModel(this.modelId);
    const useBrokenMlCWorkaround = isWebLLMGemmaMlC(this.modelId);
    const genConfig = generationConfigForModel(this.modelId);

    try {
      if (useLiteRT) {
        if (startingFreshConversation && this._needsEngineReload) {
          await this._reloadEngine('reset');
        }
        const { reply, usage } = await this._completeOnceLiteRT(userText, onUpdate);
        if (!reply.trim()) {
          this.messages.pop();
          throw new Error(
            `Model ${this.modelId} returned an empty response. Hard-refresh and reload the model.`,
          );
        }
        const safeReply = applyOutputGuardrails(reply);
        this.messages.push({ role: 'assistant', content: safeReply });
        if (onUpdate && safeReply !== reply) onUpdate(safeReply);
        if (onFinish && usage) onFinish(usage);
        return safeReply;
      }

      // Community Gemma 4 MLC: native multi-turn history is unreliable — latest turn only.
      const payload = useBrokenMlCWorkaround
        ? buildChatPayload(this.modelId, [{ role: 'user', content: userText }])
        : buildChatPayload(this.modelId, this.messages);

      if (useBrokenMlCWorkaround) {
        if (startingFreshConversation) {
          if (this._needsEngineReload) await this._reloadEngine('reset');
        } else {
          await this._reloadEngine('gemma-turn');
        }
      } else if (startingFreshConversation && this._needsEngineReload) {
        await this._reloadEngine('reset');
      }

      const { reply, usage } = await this._completeOnce(payload, genConfig, onUpdate);

      if (!reply.trim()) {
        this.messages.pop();
        throw new Error(
          `Model ${this.modelId} returned an empty response. Hard-refresh and reload the model (Gemma 4 MLC builds are experimental).`,
        );
      }
      const safeReply = applyOutputGuardrails(reply);
      this.messages.push({ role: 'assistant', content: safeReply });
      if (onUpdate && safeReply !== reply) onUpdate(safeReply);
      if (onFinish && usage) onFinish(usage);
      return safeReply;
    } catch (err) {
      if (
        this.messages.length &&
        this.messages[this.messages.length - 1]?.role === 'user' &&
        this.messages[this.messages.length - 1]?.content === userText
      ) {
        this.messages.pop();
      }
      console.error('[AiChat] Generation error:', err);
      throw err;
    }
  }

  reset() {
    this.messages = [];
    // LiteRT + WebLLM Gemma MLC: next generate() opens a fresh conversation / reloads.
    this._needsEngineReload = true;
  }

  /** Release WebGPU/WASM engine resources (eval harness / model switch). */
  async dispose() {
    await this._disposeEngine();
    this._isLoaded = false;
    this._isLoading = false;
    this.messages = [];
    this._needsEngineReload = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// AiChatUI — legacy imperative DOM component (compat / tests)
// Labs site uses Vue `VdlAiChatUI` instead.
// ═══════════════════════════════════════════════════════════════════════
