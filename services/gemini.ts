
import { ResumeData, AIPersona } from "../types";

const SUPABASE_URL = 'https://tvgsntlornobnhskgiao.supabase.co';

/**
 * Parses raw resume text into structured ResumeData and an AIPersona.
 * Calls the Supabase edge function (backend) to avoid exposing API keys.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  let payload: any;

  if (typeof input === 'string') {
    payload = input;
  } else {
    payload = input.data;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'parse',
        payload
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: Failed to parse resume`);
    }

    const data = await response.json();
    return data as { resume: ResumeData; persona: AIPersona };
  } catch (error: any) {
    throw new Error(`Resume parsing failed: ${error.message}`);
  }
};

/**
 * Conducts a stateful, streaming conversation via the edge function.
 */
export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'chat',
        payload: {
          message,
          history,
          persona,
          resumeData
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: Failed to get response from AI`);
    }

    const text = await response.text();
    console.log('Edge function response received, length:', text.length);
    console.log('First 300 chars:', text.substring(0, 300));
    
    if (!text || text.trim().length === 0) {
      throw new Error("Edge function returned empty response");
    }

    const lines = text.split('\n').filter(line => line.trim());
    console.log('Total lines received:', lines.length);
    
    let hasYieldedData = false;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            hasYieldedData = true;
            console.log('Yielding content:', content.substring(0, 50));
            yield content;
          }
        } catch (e) {
          console.error('Parse error on line:', line, 'Error:', e);
        }
      }
    }

    if (!hasYieldedData) {
      throw new Error("No streaming data was received from AI");
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);
    throw new Error(`Chat failed: ${error.message}`);
  }
}
