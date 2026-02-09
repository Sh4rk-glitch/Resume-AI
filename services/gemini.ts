
import { ResumeData, AIPersona } from "../types";
import { supabase } from "./supabase";

export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { 
        action: 'parse',
        payload: input 
      }
    });

    if (error) throw new Error(error.message || "Synthesis engine unreachable.");
    return data;
  } catch (err: any) {
    console.error("Synthesis Error:", err);
    throw new Error(err.message || "The neural engine is currently unavailable.");
  }
};

export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  const { data: { session } } = await supabase.auth.getSession();
  
  // We use fetch directly for better streaming support in browsers
  const response = await fetch(`${(supabase as any).supabaseUrl}/functions/v1/gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(supabase as any).supabaseAnonKey}`,
      ...(session?.access_token && { 'X-User-Token': session.access_token })
    },
    body: JSON.stringify({
      action: 'chat',
      payload: { message, history, resumeData, persona }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Neural link failed.");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("Stream reader not available.");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
