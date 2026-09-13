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

export const groqAdapter: AIAdapter = {
  id: 'groq',
  name: 'Groq (Free & Fast)',

  async extractLeadData(prompt: string, apiKey: string, modelId: string): Promise<AIResponse> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: 'You are an expert B2B business researcher and lead extractor. Output verified data in valid JSON format.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq API error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const leads = parseJSONSafely(text);
    return { text, leads };
  },

  async testKey(apiKey: string, modelId = 'llama-3.3-70b-versatile'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });
      if (res.ok) return { success: true, message: 'Groq API Key is valid and ultra-fast!' };
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error?.message || 'Invalid Groq Key' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error connecting to Groq' };
    }
  }
};
