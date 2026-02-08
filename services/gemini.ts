
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Robust API key retrieval.
 */
const getApiKey = () => {
  // Check common global injection points
  const key = process.env.API_KEY || (window as any).process?.env?.API_KEY || (window as any).ENV?.API_KEY;
  
  if (!key || key === 'undefined' || key === 'null' || key.length < 5) {
    console.warn("Gemini API Key detection failed. Found:", key);
    return null;
  }
  return key;
};

export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
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
2. 'tone': Describe their specific professional voice.
3. 'identifier': A URL-safe unique slug.
4. 'exampleResponses': 3 short, punchy answers.

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
    if (!text) throw new Error("The AI returned an empty response.");
    
    try {
      // Direct parse
      return JSON.parse(text);
    } catch (e) {
      // Regex fallback if model includes conversational text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Invalid JSON format received from AI: ${text.substring(0, 50)}...`);
    }
  } catch (err: any) {
    console.error("Gemini Parse Failure:", err);
    
    const errMsg = err.message || "";
    if (errMsg.includes("API key")) throw new Error("API_KEY_INVALID");
    if (errMsg.includes("429")) throw new Error("RATE_LIMIT");
    if (errMsg.includes("Safety")) throw new Error("SAFETY_BLOCK");
    if (errMsg.includes("quota")) throw new Error("QUOTA_EXCEEDED");
    
    // Pass the raw error through for debugging in the UI
    throw new Error(`TECHNICAL_ERROR: ${err.message || "Unknown synthesis failure"}`);
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
    console.error("Chat Stream Failure:", error);
    if (error.message?.includes("API key")) throw new Error("API_KEY_INVALID");
    throw new Error(`TECHNICAL_ERROR: ${error.message}`);
  }
}
