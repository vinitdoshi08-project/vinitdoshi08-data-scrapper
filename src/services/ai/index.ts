import { AIAdapter } from './types';
import { geminiAdapter } from './geminiAdapter';
import { claudeAdapter } from './claudeAdapter';
import { groqAdapter } from './groqAdapter';
import { openrouterAdapter } from './openrouterAdapter';
import { openaiAdapter } from './openaiAdapter';

export * from './types';

export const ADAPTERS: Record<string, AIAdapter> = {
  gemini: geminiAdapter,
  claude: claudeAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
  openai: openaiAdapter,
};

export function getAIAdapter(providerId: string): AIAdapter | undefined {
  return ADAPTERS[providerId];
}
