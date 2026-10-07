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
  toolCalling?: { modelSupport: 'documented'; integration: 'native' | 'pending'; source: string };
};
export const MODEL_GROUPS = [
  { id: 'gemma4', label: 'Gemma 4' },
  { id: 'qwen3', label: 'Qwen 3 Tiny' },
  { id: 'liquid', label: 'Liquid LFM 2.5' },
];

const models: ModelOption[] = [
  ...(['E2B', 'E4B'] as const).map((size): ModelOption => ({
    id: `gemma-4-${size}-it-web`,
    label: `Gemma 4 ${size}${size === 'E2B' ? ' · Default' : ' · Quality'}`,
    tier: size === 'E2B' ? 'Fast' : 'Quality',
    group: 'gemma4',
    family: 'gemma4',
    backend: 'litert',
    litertKind: 'web-official',
    requires: ['shader-f16'],
    approxBytes: 0,
    maxNumTokens: 8192,
    modelFile: `gemma-4-${size}-it-web.litertlm`,
    catalogRole: 'primary',
    capabilities: { chat: true, docs: true, tools: true },
    toolCalling: {
      modelSupport: 'documented',
      integration: 'native',
      source: 'https://deepmind.google/models/gemma/gemma-4/',
    },
    purpose:
      size === 'E2B'
        ? 'Recommended general chat and documentation assistant.'
        : 'Larger general chat and documentation assistant.',
    runtimeVersion: '0.17.1',
    reasoning: 'none',
  })),
  ...(['q4f16_1', 'q4f32_1'] as const).map((precision): ModelOption => ({
    id: `Qwen3-0.6B-${precision}-MLC`,
    label: 'Qwen3 0.6B · Tiny',
    tier: 'Tiny',
    group: 'qwen3',
    family: 'qwen3',
    backend: 'webllm',
    requires: precision === 'q4f16_1' ? ['shader-f16'] : [],
    approxBytes: 0,
    maxNumTokens: 4096,
    disableThinking: true,
    precision,
    catalogRole: precision === 'q4f16_1' ? 'primary' : 'variant',
    ...(precision === 'q4f16_1'
      ? { fallbackId: 'Qwen3-0.6B-q4f32_1-MLC' }
      : { variantOf: 'Qwen3-0.6B-q4f16_1-MLC' }),
    capabilities: { chat: true, docs: true, tools: false },
    toolCalling: {
      modelSupport: 'documented',
      integration: 'pending',
      source: 'https://huggingface.co/Qwen/Qwen3-0.6B#agentic-use',
    },
    license: 'Apache-2.0',
    purpose: 'Small general assistant; limited reasoning and grounding accuracy.',
    reasoning: 'optional',
    runtimeVersion: '0.2.85',
  })),
  ...(['230M', '350M', '2.6B'] as const).flatMap((size) =>
    (size === '2.6B' ? ['q4f16', 'q4'] : ['q4']).map((precision): ModelOption => ({
      id: `LFM2.5-${size}-${precision}-ONNX`,
      label: `LFM2.5 ${size} · Candidate`,
      tier: size === '2.6B' ? 'Reasoning candidate' : 'Small specialist',
      group: 'liquid',
      family: 'lfm25',
      backend: 'transformers',
      requires: precision === 'q4f16' ? ['shader-f16'] : [],
      approxBytes: 0,
      maxNumTokens: 4096,
      experimental: true,
      precision,
      repo: `LiquidAI/LFM2.5-${size}-ONNX`,
      catalogRole: size === '2.6B' && precision === 'q4' ? 'variant' : 'primary',
      ...(size === '2.6B' && precision === 'q4' ? { variantOf: 'LFM2.5-2.6B-q4f16-ONNX' } : {}),
      license: 'LFM-1.0',
      purpose:
        size === '2.6B'
          ? 'Reasoning and grounded answers; candidate.'
          : 'Extraction and short structured answers; limited general knowledge.',
      reasoning: size === '2.6B' ? 'required' : 'none',
      runtimeVersion: '4.3.0',
      externalDataFiles: size === '2.6B' && precision === 'q4f16' ? 2 : 1,
      capabilities: { chat: true, docs: true, tools: false },
      toolCalling: {
        modelSupport: 'documented',
        integration: 'pending',
        source: `https://huggingface.co/LiquidAI/LFM2.5-${size}#tool-use`,
      },
    })),
  ),
];
export const MODEL_OPTIONS: ModelOption[] = models.map((model) => ({
  ...model,
  ...(manifests as Record<string, Partial<ModelOption>>)[model.id],
}));
export const PRIMARY_MODEL_OPTIONS = MODEL_OPTIONS.filter(
  (model) => model.catalogRole === 'primary',
);
export function getModelVariants(id: string): ModelOption[] {
  const primary = MODEL_OPTIONS.find((model) => model.id === id)?.variantOf || id;
  return MODEL_OPTIONS.filter((model) => model.id === primary || model.variantOf === primary);
}
export function getModelChoiceLabel(model: ModelOption): string {
  const engine = { litert: 'LiteRT', webllm: 'WebLLM', transformers: 'Transformers.js / ONNX' }[
    model.backend
  ];
  const tools = model.capabilities?.tools
    ? 'Tools available'
    : 'Tool-capable · integration pending';
  return `${model.label} · ${engine} · ${Math.round(model.approxBytes / 1e6)} MB · ${tools}`;
}
/** Compatibility export: retained LFM evaluation candidates. */
export const NEW_MODEL_IDS = PRIMARY_MODEL_OPTIONS.filter((model) => model.family === 'lfm25').map(
  (model) => model.id,
);
export const BASELINE_MODEL_IDS = [
  'gemma-4-E2B-it-web',
  'gemma-4-E4B-it-web',
  'Qwen3-0.6B-q4f16_1-MLC',
];
