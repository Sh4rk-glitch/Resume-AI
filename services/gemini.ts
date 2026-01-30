
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
2. 'tone': Describe their professional voice (e.g., 'Visionary and Analytical', 'Empathetic and Strategic').
3. 'identifier': A unique URL-safe slug (e.g., 'jane-doe-ux').
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
  // Using gemini-3-flash-preview for maximum stability and speed
  const model = 'gemini-3-flash-preview';

  // Map history roles to Google's expected types ('assistant' -> 'model')
  const mappedHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  const chat = ai.chats.create({
    model,
    history: mappedHistory,
    config: {
      systemInstruction: `You are ${persona.name}, a digital professional persona.
      Your tone profile: ${persona.tone}.
      Your core narrative: ${persona.description}.
      Strengths: ${persona.strengths.join(', ')}.
      Expertise: ${persona.expertise.join(', ')}.
      
      CONTEXT:
      Summary: ${resumeData.summary}
      History: ${JSON.stringify(resumeData.experience)}
      Technical Stack: ${resumeData.skills.join(', ')}
      
      INTERACTION PROTOCOL:
      - Strictly adhere to provided resume facts.
      - If asked about skills or roles not listed, clarify that you represent the professional history of the user.
      - Maintain the defined persona tone at all times.
      - Keep responses professional yet conversational.`,
    }
  });

  const result = await chat.sendMessageStream({ message });
  for await (const chunk of result) {
    const response = chunk as GenerateContentResponse;
    if (response.text) {
      yield response.text;
    }
  }
}
