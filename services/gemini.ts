
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Lazy-initializes the Gemini API client.
 * Ensures the API_KEY is present before making calls.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Neural Link Offline: API_KEY is missing in environment variables. Please configure the project environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Parses raw resume text or file data into structured ResumeData and an AIPersona.
 * Uses gemini-3-pro-preview for deep analysis and persona synthesis.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const ai = getAIClient();
  const prompt = `Act as an expert career strategist. Extract structured career data from the provided resume material and synthesize a high-fidelity professional AI persona.`;

  const responseSchema = {
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
              },
              required: ["role", "company", "duration", "description"]
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
        required: ["name", "title", "summary", "skills", "experience", "education", "certifications"]
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
    },
    required: ["resume", "persona"]
  };

  let contents;
  if (typeof input === 'string') {
    contents = { parts: [{ text: input }, { text: prompt }] };
  } else {
    contents = {
      parts: [
        { inlineData: { data: input.data, mimeType: input.mimeType } },
        { text: prompt }
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Synthesis failed: The neural engine returned an empty sequence.");

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Parse failure:", text);
    throw new Error("Neural Decode Error: The model output could not be parsed as structured data.");
  }
};

/**
 * Conducts a stateful, streaming conversation with the synthesized persona.
 */
export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  const ai = getAIClient();
  
  // Cleaned up system instruction with no syntax errors
  const experienceHistory = resumeData.experience.map(e => `${e.role} at ${e.company}`).join(', ');
  const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. 
  Background: ${persona.description}. 
  History: ${experienceHistory}.
  Expertise: ${persona.expertise.join(', ')}.
  Speak as this person's autonomous digital twin. Always use markdown for better readability.`;

  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));
  
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
