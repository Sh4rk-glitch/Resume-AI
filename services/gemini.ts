
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Diagnostic helper to find the API key in various deployment environments.
 */
const getApiKey = () => {
  // Priority 1: process.env (Standard)
  // Priority 2: window.process.env (Vercel/Shim)
  // Priority 3: Global window variables (Custom bridges)
  const key = process.env.API_KEY || 
              (window as any).process?.env?.API_KEY || 
              (window as any).ENV?.API_KEY ||
              (window as any)._AI_STUDIO_API_KEY_;
  
  if (!key || key === 'undefined' || key === 'null' || key.length < 5) {
    console.warn("Gemini Engine: No valid API key detected in process.env or window. Found:", key);
    return null;
  }
  
  // Log masked key for debugging in the browser console
  console.log(`Gemini Engine: Key detected (${key.substring(0, 4)}...${key.substring(key.length - 4)})`);
  return key;
};

export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  // Using the exact required model name
  const model = 'gemini-3-flash-preview';

  const parts = [];
  if (typeof input === 'string') {
    parts.push({ text: `DATA SOURCE: Raw Text\nCONTENT:\n${input}` });
  } else {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
    const mimeType = allowedTypes.includes(input.mimeType) ? input.mimeType : 'application/pdf';
    
    parts.push({
      inlineData: {
        data: input.data,
        mimeType: mimeType
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...parts,
          { text: `TASK: Act as an expert career strategist. Extract structured career data and synthesize a professional AI persona.
          
OUTPUT FORMAT: Strict JSON only. 
          
PERSONA GENERATION RULES:
1. 'name': Full name from header.
2. 'tone': Professional voice description.
3. 'identifier': A URL-safe unique slug.
4. 'exampleResponses': 3 short answers.

RESUME EXTRACTION RULES:
- Capture 'summary', 'skills' (array), 'experience' (array), 'education' (array).` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resume: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                experience: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      role: { type: Type.STRING },
                      company: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      description: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                },
                education: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      degree: { type: Type.STRING },
                      institution: { type: Type.STRING },
                      year: { type: Type.STRING }
                    }
                  }
                }
              },
              required: ["name", "title", "experience"]
            },
            persona: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                tone: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                expertise: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                identifier: { type: Type.STRING },
                exampleResponses: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "tone", "description", "identifier"]
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine.");
    
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("AI returned malformed JSON content.");
    }
  } catch (err: any) {
    console.error("Gemini API Error Object:", err);
    
    // Categorize common errors but preserve the message
    const msg = err.message || "Unknown synthesis failure";
    if (msg.includes("API key")) throw new Error(`API_KEY_INVALID: ${msg}`);
    if (msg.includes("429")) throw new Error(`RATE_LIMIT: ${msg}`);
    if (msg.includes("Safety")) throw new Error(`SAFETY_BLOCK: ${msg}`);
    
    // Default to a technical error that ResumeUpload will display raw
    throw new Error(`TECHNICAL_ERROR: ${msg}`);
  }
};

export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';

  const filteredHistory = [];
  let lastRoleAdded = null;

  for (const h of history) {
    const apiRole = h.role === 'assistant' ? 'model' : 'user';
    if (filteredHistory.length === 0 && apiRole === 'model') continue;
    if (apiRole === lastRoleAdded) continue;
    if (!h.content || h.content.trim() === '') continue;

    filteredHistory.push({
      role: apiRole,
      parts: [{ text: h.content }]
    });
    lastRoleAdded = apiRole;
  }

  if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user') {
    filteredHistory.pop();
  }

  const chat = ai.chats.create({
    model: modelName,
    history: filteredHistory,
    config: {
      systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}.
      Context: ${persona.description}.
      Only use this resume: ${JSON.stringify(resumeData)}. Be concise and professional.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      if (response.text) yield response.text;
    }
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw new Error(`TECHNICAL_ERROR: ${error.message}`);
  }
}
