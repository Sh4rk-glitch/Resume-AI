
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

    if (error) {
      console.error("Supabase Function Error:", error);
      // If it's a CORS or Network error, it might not have a clean message
      throw new Error(error.message || "Network link to neural engine failed. Check project secrets.");
    }
    
    if (!data || !data.resume || !data.persona) {
      throw new Error("The neural engine returned an incomplete synthesis. Please try again.");
    }

    return data;
  } catch (err: any) {
    console.error("Synthesis Execution Context:", err);
    // Be more descriptive about the 'Failed to fetch' error
    if (err.message?.includes("fetch")) {
      throw new Error("Failed to reach the Edge Function. Ensure 'gemini' function is deployed and CORS is active.");
    }
    throw new Error(err.message || "The synthesis engine encountered a fatal sequencing error.");
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
    console.error("Chat Stream Response Error:", errText);
    throw new Error("Neural communication interrupted. Check Edge Function logs.");
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
