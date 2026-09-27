import manifests from './model-artifacts.json';
export type ModelArtifact = { path: string; bytes: number; sha256?: string; gitSha1?: string };
export type ModelOption = {
  id: string;
  label: string;
  tier: string;
  group: string;
  family: string;
  backend: 'litert' | 'webllm' | 'transformers';
  requires: string[];
  approxBytes: number;
  maxNumTokens?: number;
  experimental?: boolean;
  litertKind?: string;
  litertRuntime?: string;
  disableThinking?: boolean;
  fallbackId?: string;
  modelFile?: string;
  modelUrl?: string;
  modelLibUrl?: string;
  overrides?: Record<string, number>;
  repo?: string;
  revision?: string;
  artifacts?: ModelArtifact[];
  precision?: string;
  license?: string;
  purpose?: string;
  estimatedWorkingBytes?: number;
  reasoning?: 'none' | 'optional' | 'required';
  variantOf?: string;
  catalogRole?: 'primary' | 'variant';
  capabilities?: { chat: boolean; docs: boolean; tools: boolean };
  runtimeVersion?: string;
  externalDataFiles?: number;
};
export const MODEL_GROUPS = [
  { id: 'gemma4', label: 'Gemma 4' },
  { id: 'qwen3', label: 'Qwen 3' },
  { id: 'qwen35', label: 'Qwen 3.5' },
  { id: 'liquid', label: 'Liquid LFM 2.5' },
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
const LEGACY_MODELS: ModelOption[] = [
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
    label: 'Gemma 4 E4B (~3.0GB) - Quality',
    tier: 'Quality',
    group: 'gemma4',
    family: 'gemma4',
    backend: 'litert',
    litertKind: 'web-official',
    requires: ['shader-f16'],
    approxBytes: 2969059328,
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

const additions: ModelOption[] = [
  ...(['0.8B', '2B'] as const).flatMap((size) =>
    (['q4f16_1', 'q4f32_1'] as const).map((precision): ModelOption => ({
      id: `Qwen3.5-${size}-${precision}-MLC`,
      label: `Qwen3.5 ${size} · ${precision === 'q4f16_1' ? 'Q4F16' : 'Q4F32 compatibility'} · Candidate`,
      tier: size === '2B' ? 'Balanced candidate' : 'Lightweight candidate',
      group: 'qwen35',
      family: 'qwen35',
      backend: 'webllm',
      requires: precision === 'q4f16_1' ? ['shader-f16'] : [],
      approxBytes: size === '2B' ? 1.08e9 : 447e6,
      estimatedWorkingBytes:
        (size === '2B'
          ? precision === 'q4f16_1'
            ? 2245.44
            : 2591.55
          : precision === 'q4f16_1'
            ? 1629.49
            : 1894.19) * 1e6,
      maxNumTokens: 4096,
      experimental: true,
      disableThinking: true,
      repo: `mlc-ai/Qwen3.5-${size}-${precision}-MLC`,
      precision,
      catalogRole: precision === 'q4f16_1' ? 'primary' : 'variant',
      ...(precision === 'q4f32_1' ? { variantOf: `Qwen3.5-${size}-q4f16_1-MLC` } : {}),
      license: 'Apache-2.0',
      purpose: 'General chat and grounded documentation answers; evaluation candidate.',
      reasoning: 'optional',
      runtimeVersion: '0.2.85',
      overrides: { context_window_size: 4096, max_history_size: 1 },
      capabilities: { chat: true, docs: true, tools: false },
    })),
  ),
  ...(['230M', '350M', '2.6B'] as const).flatMap((size) =>
    (size === '2.6B' ? ['q4f16', 'q4'] : ['q4']).map((precision): ModelOption => ({
      id: `LFM2.5-${size}-${precision}-ONNX`,
      label: `LFM2.5 ${size} · ${precision.toUpperCase()} · Candidate`,
      tier:
        size === '230M'
          ? 'Small specialist'
          : size === '350M'
            ? 'Small assistant candidate'
            : 'Docs/reasoning candidate',
      group: 'liquid',
      family: 'lfm25',
      backend: 'transformers',
      requires: precision === 'q4f16' ? ['shader-f16'] : [],
      approxBytes:
        size === '230M' ? 200e6 : size === '350M' ? 276e6 : precision === 'q4f16' ? 1.53e9 : 1.85e9,
      maxNumTokens: 4096,
      experimental: true,
      precision,
      repo: `LiquidAI/LFM2.5-${size}-ONNX`,
      catalogRole: precision === (size === '2.6B' ? 'q4f16' : 'q4') ? 'primary' : 'variant',
      ...(precision === (size === '2.6B' ? 'q4f16' : 'q4')
        ? {}
        : { variantOf: `LFM2.5-${size}-${size === '2.6B' ? 'q4f16' : 'q4'}-ONNX` }),
      license: 'LFM-1.0',
      purpose:
        size === '230M'
          ? 'Extraction and short structured answers; limited general knowledge.'
          : 'Short grounded answers and summaries; evaluate against the larger models.',
      reasoning: size === '2.6B' ? 'required' : 'none',
      runtimeVersion: '4.2.0',
      externalDataFiles: size === '2.6B' && precision === 'q4f16' ? 2 : 1,
      capabilities: { chat: true, docs: true, tools: false },
    })),
  ),
];
export const MODEL_OPTIONS: ModelOption[] = [...LEGACY_MODELS, ...additions].map((model) => ({
  capabilities: {
    chat: true,
    docs: true,
    tools: model.backend === 'litert' && model.litertKind === 'web-official',
  },
  reasoning: model.disableThinking ? 'optional' : 'none',
  runtimeVersion: model.backend === 'litert' ? '0.17.1' : '0.2.85',
  ...model,
  ...(manifests as Record<string, Partial<ModelOption>>)[model.id],
}));
export const NEW_MODEL_IDS = additions.filter((m) => m.catalogRole === 'primary').map((m) => m.id);
export const BASELINE_MODEL_IDS = [
  'gemma-4-E2B-it-web',
  'gemma-4-E4B-it-web',
  'Qwen3-0.6B-q4f16_1-MLC',
];
