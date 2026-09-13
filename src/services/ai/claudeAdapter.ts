import { AIAdapter, AIResponse, LeadData } from './types';

function parseJSONSafely(text: string): LeadData[] {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = match ? match[1].trim() : text.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

export const claudeAdapter: AIAdapter = {
  id: 'claude',
  name: 'Anthropic Claude',

  async extractLeadData(prompt: string, apiKey: string, modelId: string): Promise<AIResponse> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude API error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.content?.map((c: any) => c.text).join('\n') || '';
    const leads = parseJSONSafely(text);
    return { text, leads };
  },

  async testKey(apiKey: string, modelId = 'claude-3-5-haiku-20241022'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
      });

      if (res.ok) return { success: true, message: 'Anthropic Claude Key is valid!' };
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error?.message || 'Invalid Claude Key' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network connection error' };
    }
  }
};
