import { GoogleGenAI } from '@google/genai';
import { AIAdapter, AIResponse, LeadData } from './types';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function parseJSONSafely(text: string): LeadData[] {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = match ? match[1].trim() : text.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Basic fallback extraction
    return [];
  }
}

export const geminiAdapter: AIAdapter = {
  id: 'gemini',
  name: 'Google Gemini',

  async extractLeadData(prompt: string, apiKey: string, modelId: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = [modelId, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    let lastError: any = null;
    for (const m of modelsToTry) {
      let attempt = 0;
      while (attempt < 2) {
        try {
          const config: any = { tools: [{ googleSearch: {} }] };
          const response = await ai.models.generateContent({ model: m, contents: prompt, config });
          const text = response.text || '';
          const leads = parseJSONSafely(text);
          return { text, leads };
        } catch (err: any) {
          attempt++;
          lastError = err;
          const msg = String(err?.message || err);
          const is503 = msg.includes('503') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable');
          const is404 = msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available');
          const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');

          if (is503 || is404) {
            break; // Try next model immediately
          }
          if (is429 && attempt < 2) {
            await sleep(2500);
            continue;
          }
          break;
        }
      }
    }
    throw lastError || new Error('Failed to extract leads with Gemini');
  },

  async testKey(apiKey: string, modelId = 'gemini-2.5-flash'): Promise<{ success: boolean; message: string }> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: modelId,
        contents: 'Ping test. Reply with: OK',
      });
      if (res.text) return { success: true, message: 'Google Gemini Key is valid and active!' };
      return { success: false, message: 'Received empty response from Gemini.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Invalid Gemini API key.' };
    }
  }
};
