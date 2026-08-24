export type ModelProvider = 'anthropic' | 'openai' | 'openrouter' | 'deepseek';

export interface ModelOption {
  value: string;
  label: string;
  provider: ModelProvider;
  free: boolean;
}

export interface ModelGroup {
  provider: ModelProvider;
  label: string;
  models: ModelOption[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: 'openrouter',
    label: 'OpenRouter — Free',
    models: [
      { value: 'openrouter/deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/deepseek/deepseek-r1-distill-llama-3-70b:free', label: 'DeepSeek R1 Distill Llama 3 70B (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/deepseek/deepseek-chat:free', label: 'DeepSeek Chat (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/meta-llama/llama-3.2-1b-instruct:free', label: 'Llama 3.2 1B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder 32B (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/qwen/qwen-2.5-7b-instruct:free', label: 'Qwen 2.5 7B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/google/gemma-2-9b-it:free', label: 'Gemma 2 9B (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Experimental (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini 128K (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/mistralai/mistral-7b-instruct:free', label: 'Mistral 7B Instruct (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/mistralai/mistral-nemo:free', label: 'Mistral Nemo (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/nvidia/nemotron-nano-9b-v2:free', label: 'Nemotron Nano 9B v2 (free)', provider: 'openrouter', free: true },
      { value: 'openrouter/featherless/qwerky-72b:free', label: 'Qwerky 72B (free)', provider: 'openrouter', free: true },
    ],
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter — Paid',
    models: [
      { value: 'openrouter/anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/anthropic/claude-3-opus', label: 'Claude 3 Opus (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/openai/gpt-4o', label: 'GPT-4o (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/openai/gpt-4o-mini', label: 'GPT-4o mini (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/openai/o1', label: 'OpenAI o1 (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/openai/o1-mini', label: 'OpenAI o1-mini (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/openai/o3-mini', label: 'OpenAI o3-mini (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/google/gemini-flash-1.5', label: 'Gemini 1.5 Flash (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/google/gemini-pro-1.5', label: 'Gemini 1.5 Pro (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/x-ai/grok-2', label: 'Grok 2 (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/x-ai/grok-beta', label: 'Grok Beta (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/qwen/qwen-2.5-max', label: 'Qwen 2.5 Max (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/deepseek/deepseek-chat', label: 'DeepSeek Chat (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/deepseek/deepseek-r1', label: 'DeepSeek R1 (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/mistralai/mistral-large', label: 'Mistral Large (OpenRouter)', provider: 'openrouter', free: false },
      { value: 'openrouter/cohere/command-r-plus', label: 'Command R+ (OpenRouter)', provider: 'openrouter', free: false },
    ],
  },
  {
    provider: 'anthropic',
    label: 'Anthropic — Direct',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic', free: false },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic', free: false },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'anthropic', free: false },
    ],
  },
  {
    provider: 'openai',
    label: 'OpenAI — Direct',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai', free: false },
      { value: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai', free: false },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai', free: false },
      { value: 'o1', label: 'OpenAI o1', provider: 'openai', free: false },
      { value: 'o1-mini', label: 'OpenAI o1-mini', provider: 'openai', free: false },
      { value: 'o3-mini', label: 'OpenAI o3-mini', provider: 'openai', free: false },
    ],
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek — Direct',
    models: [
      { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek', free: false },
      { value: 'deepseek/deepseek-coder', label: 'DeepSeek Coder', provider: 'deepseek', free: false },
      { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek Reasoner (R1)', provider: 'deepseek', free: false },
    ],
  },
];

export const ALL_MODELS: ModelOption[] = MODEL_GROUPS.flatMap((g) => g.models);

export const DEFAULT_MODEL = MODEL_GROUPS[0].models[0].value;

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
};

export const PROVIDER_KEY_PLACEHOLDERS: Record<ModelProvider, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  openrouter: 'sk-or-v1-...',
  deepseek: 'sk-...',
};

export function getProviderForModel(modelValue: string): ModelProvider | undefined {
  const model = ALL_MODELS.find((m) => m.value === modelValue);
  return model?.provider;
}

export function isFreeModel(modelValue: string): boolean {
  const model = ALL_MODELS.find((m) => m.value === modelValue);
  return model?.free ?? false;
}
