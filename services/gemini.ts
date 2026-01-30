
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: API_KEY environment variable is missing.");
    throw new Error("API_KEY_MISSING");
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
  // Using gemini-3-flash-preview as the most reliable general-purpose model
  const modelName = 'gemini-3-flash-preview';

  /**
   * STRICT CHAT PROTOCOL RULES:
   * 1. History must start with a 'user' message.
   * 2. Roles must alternate strictly (user -> model -> user).
   * 3. History must end with a 'model' message because the new 'message' param is 'user'.
   */
  const filteredHistory = [];
  let lastRoleAdded = null;

  for (const h of history) {
    const apiRole = h.role === 'assistant' ? 'model' : 'user';
    
    // Rule 1: History must start with a user message. Skip if the first is 'model'.
    if (filteredHistory.length === 0 && apiRole === 'model') continue;
    
    // Rule 2: Strict alternation. Skip if same role as last.
    if (apiRole === lastRoleAdded) continue;
    
    // Rule 3: No empty content.
    if (!h.content || h.content.trim() === '') continue;

    filteredHistory.push({
      role: apiRole,
      parts: [{ text: h.content }]
    });
    lastRoleAdded = apiRole;
  }

  // Final validation: Ensure history ends with 'model' so that the new 'user' message alternates correctly.
  if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user') {
    filteredHistory.pop();
  }

  const chat = ai.chats.create({
    model: modelName,
    history: filteredHistory,
    config: {
      systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}.
      Your synthesized context: ${persona.description}.
      
      CORE KNOWLEDGE (Resume Data):
      - Current Title: ${resumeData.title}
      - Career Summary: ${resumeData.summary}
      - Tech/Skill Stack: ${resumeData.skills.join(', ')}
      - Full History: ${JSON.stringify(resumeData.experience)}
      
      OPERATIONAL DIRECTIVES:
      - Answer recruiter and peer questions based ONLY on the provided resume.
      - If details are missing, bridge using the defined Persona Tone but do not invent jobs.
      - Maintain persona identity at all times.
      - Be succinct, professional, and high-impact.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      if (response.text) {
        yield response.text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Protocol Failure:", error);
    // Extract a more meaningful error if possible
    const detailedError = error?.message || "Internal Service Error";
    throw new Error(detailedError);
  }
}
