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
      console.error("Supabase Function Error Object:", error);
      // Attempt to extract the custom message from the function response
      let msg = "Network link to neural engine failed.";
      try {
        const errJson = await error.context?.json();
        if (errJson?.error) msg = errJson.error;
      } catch (e) {
        msg = error.message || msg;
      }
      throw new Error(msg);
    }
    
    if (!data || !data.resume || !data.persona) {
      throw new Error("The neural engine returned an incomplete synthesis. Check if the API key is valid.");
    }

    return data;
  } catch (err: any) {
    console.error("Synthesis Execution Context:", err);
    if (err.message?.includes("fetch")) {
      throw new Error("Failed to reach the Edge Function. Ensure the 'gemini' function is deployed to your Supabase project.");
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
    let errText = "Neural communication interrupted.";
    try {
      const errJson = await response.json();
      if (errJson?.error) errText = errJson.error;
    } catch (e) {
      errText = await response.text();
    }
    throw new Error(errText);
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