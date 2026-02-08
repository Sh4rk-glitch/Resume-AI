
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Robust API key retrieval for production environments.
 */
const getApiKey = () => {
  // Check common global injection points
  const key = process.env.API_KEY || 
              (window as any).process?.env?.API_KEY || 
              (window as any).ENV?.API_KEY ||
              (window as any)._AI_STUDIO_API_KEY_;
  
  // Specifically detect if we are in a browser where process.env might be a string literal or undefined
  if (!key || key === 'undefined' || key === 'null' || key.length < 5 || key === 'process.env.API_KEY') {
    return null;
  }
  
  return key;
};

export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Determine the exact environment for better error reporting
    const isVercel = window.location.hostname.includes('vercel.app');
    const envName = isVercel ? "Vercel Production" : "Local/Preview";
    throw new Error(`MISSING_KEY_ENV:${envName}`);
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
    return JSON.parse(text);
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("API key")) throw new Error(`API_KEY_INVALID: ${msg}`);
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

  const filteredHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: h.content }]
  }));

  const chat = ai.chats.create({
    model: modelName,
    history: filteredHistory,
    config: {
      systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}. Context: ${persona.description}. Use this resume: ${JSON.stringify(resumeData)}.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      if (response.text) yield response.text;
    }
  } catch (error: any) {
    throw new Error(`TECHNICAL_ERROR: ${error.message}`);
  }
}
