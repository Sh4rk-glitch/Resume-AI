
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: API_KEY is missing from process.env. Ensure it is set in Vercel Environment Variables.");
    throw new Error("AI Configuration Missing. Please check the server environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';

  const parts = [];
  if (typeof input === 'string') {
    parts.push({ text: `DATA SOURCE: Raw Text\nCONTENT:\n${input}` });
  } else {
    parts.push({
      inlineData: {
        data: input.data,
        mimeType: input.mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        ...parts,
        { text: `TASK: Extract structured career data and synthesize a professional AI persona.
        
OUTPUT FORMAT: Strict JSON only. No markdown formatting.
        
PERSONA GENERATION RULES:
1. 'name': Use the user's full name if found.
2. 'tone': Describe their professional voice.
3. 'identifier': A unique URL-safe slug.
4. 'exampleResponses': 3 short recruiter questions.

RESUME EXTRACTION RULES:
- Include 'summary', 'skills', 'experience', 'education'.` }
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
            }
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
            }
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
    throw new Error("The AI provided a non-standard response structure.");
  }
};

export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  const ai = getAI();
  // Using 2.5 Flash Lite for maximum regional stability on Edge/Cloud deployments
  const modelName = 'gemini-2.5-flash-lite-latest';

  /**
   * GEMINI SDK HISTORY RULES:
   * 1. First message MUST be 'user'.
   * 2. Roles MUST alternate 'user' -> 'model' -> 'user'.
   */
  const mappedHistory = [];
  let lastRoleAdded = null;

  // Filter out any messages that aren't alternating correctly
  for (const h of history) {
    const apiRole = h.role === 'assistant' ? 'model' : 'user';
    
    // Rule: First message in history must be user. 
    // If our history starts with a model (e.g. welcome message), we skip it to satisfy SDK.
    if (mappedHistory.length === 0 && apiRole === 'model') continue;
    
    // Rule: Strict alternation.
    if (apiRole === lastRoleAdded) continue;
    if (!h.content || h.content.trim() === '') continue;

    mappedHistory.push({
      role: apiRole,
      parts: [{ text: h.content }]
    });
    lastRoleAdded = apiRole;
  }

  // Ensure history ends with 'model' so that the new 'user' message alternates correctly.
  if (mappedHistory.length > 0 && mappedHistory[mappedHistory.length - 1].role === 'user') {
    mappedHistory.pop();
  }

  const chat = ai.chats.create({
    model: modelName,
    history: mappedHistory,
    config: {
      systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}.
      Narrative Context: ${persona.description}.
      
      CAREER DATA:
      - Title: ${resumeData.title}
      - Summary: ${resumeData.summary}
      - Skills: ${resumeData.skills.join(', ')}
      - History: ${JSON.stringify(resumeData.experience)}
      
      STRICT OPERATING PARAMETERS:
      - Answer ONLY based on the resume data provided.
      - If a question is outside your professional scope, clarify that as ${persona.name}.
      - Maintain persona tone consistently.
      - Be succinct and professional.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      const text = response.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Stream Protocol Error:", error);
    // Log the specific error message to help the developer diagnose Vercel issues
    const errorMessage = error?.message || "Unknown API Error";
    throw new Error(`Neural Link Error: ${errorMessage}`);
  }
}
