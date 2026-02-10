
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

// Initialize the Gemini API client using the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses raw resume text or file data into structured ResumeData and an AIPersona.
 * Uses gemini-3-pro-preview for high-fidelity extraction and synthesis.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const prompt = `Act as an expert career strategist. Extract structured career data from the provided resume material and synthesize a high-fidelity professional AI persona.`;

  // Define the expected JSON structure for the response.
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
    // Handle file input (e.g., PDF) using inlineData.
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
  if (!text) {
    throw new Error("Synthesis failed: The model returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Synthesis failed: Invalid data format received from the neural engine.");
  }
};

/**
 * Conducts a stateful, streaming conversation with the synthesized persona.
 * Uses gemini-3-flash-preview for low-latency interactive chat.
 */
export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  // Use system instruction to define the AI's identity and boundaries.
  const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. 
  Background: ${persona.description}. 
  Professional History: ${JSON.stringify(resumeData.experience.map(e => ({ role: e.role, company: e.company })))}.
  Expertise: ${persona.expertise.join(', ')}.
  Speak as this person's autonomous digital twin. Always use markdown for structure.`;

  // Prepare the conversation history for the SDK.
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));
  
  // Append the user's latest message.
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

  // Yield chunks of text as they arrive for a typewriter effect.
  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
