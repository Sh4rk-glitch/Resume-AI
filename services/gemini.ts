
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not configured in environment variables.");
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
1. 'name': Use the user's full name if found, otherwise 'Professional Persona'.
2. 'tone': Describe their professional voice (e.g., 'Visionary and Analytical').
3. 'identifier': A unique URL-safe slug.
4. 'exampleResponses': 3 short professional questions a recruiter might ask.

RESUME EXTRACTION RULES:
- Include 'summary', 'skills', 'experience', 'education'.
- In 'experience', each 'description' item must be a short achievement-oriented bullet point.` }
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
              },
              certifications: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "title", "summary", "skills", "experience"]
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
            required: ["name", "tone", "strengths", "expertise", "description", "identifier", "exampleResponses"]
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
    console.error("JSON Parse Error:", text);
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
  const model = 'gemini-3-flash-preview';

  // GEMINI HISTORY RULES:
  // 1. Roles must strictly alternate: user -> model -> user -> model
  // 2. Cannot have two consecutive messages with the same role.
  // 3. Current message (sent via sendMessageStream) acts as the NEW 'user' turn.
  
  const mappedHistory = [];
  let lastRole = null;

  for (const h of history) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    // Skip if role is same as last to maintain alternation integrity
    if (role === lastRole) continue;
    if (!h.content || h.content.trim() === '') continue;

    mappedHistory.push({
      role,
      parts: [{ text: h.content }]
    });
    lastRole = role;
  }

  // Ensure history ends with 'model' so current 'user' message alternates correctly
  if (mappedHistory.length > 0 && mappedHistory[mappedHistory.length - 1].role === 'user') {
    mappedHistory.pop();
  }

  const chat = ai.chats.create({
    model,
    history: mappedHistory,
    config: {
      systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}. Description: ${persona.description}.
      You strictly represent the career history of the user as described in their resume.
      
      Resume Data:
      - Summary: ${resumeData.summary}
      - Tech Stack: ${resumeData.skills.join(', ')}
      - Experience: ${JSON.stringify(resumeData.experience)}
      
      Rules:
      - Never hallucinate roles not in the resume.
      - Maintain persona at all times.
      - Be concise and professional.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      const part = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (part) {
        yield part;
      }
    }
  } catch (error) {
    console.error("Gemini Stream Internal Error:", error);
    throw error;
  }
}
