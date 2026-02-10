
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Lazy-initializes the Gemini API client.
 * Ensures the API_KEY is present before making calls.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Neural Link Offline: API_KEY is not configured. Please add your Gemini API Key in Vercel or the index.html shim.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Parses raw resume text or file data into structured ResumeData and an AIPersona.
 * Uses gemini-3-flash-preview for high-speed, multimodal PDF extraction.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const ai = getAIClient();
  const prompt = `Act as an expert career strategist and professional identity designer. 
  Step 1: Extract all professional data from the provided material.
  Step 2: Synthesize a high-fidelity AI persona that captures the professional "tone" and unique expertise of this person.
  Step 3: Generate a unique URL identifier based on their name.`;

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
          tone: { type: Type.STRING, description: "Describe the professional speaking style (e.g., Visionary, Pragmatic, Technical Leader)" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          expertise: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING, description: "A first-person manifesto for the persona." },
          identifier: { type: Type.STRING, description: "A lowercase url-safe slug based on their name." },
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
    // PDF or Image input for multimodal scanning
    contents = {
      parts: [
        { 
          inlineData: { 
            data: input.data, 
            mimeType: input.mimeType 
          } 
        },
        { text: prompt }
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Synthesis failed: The neural engine returned an empty sequence. Check your API key or document quality.");

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Neural Decode Failure:", text);
    throw new Error("Neural Decode Error: Could not map the model output to structured data.");
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
  
  const experienceHistory = resumeData.experience.map(e => `${e.role} at ${e.company}`).join(', ');
  const systemInstruction = `You are the digital twin and autonomous assistant of ${resumeData.name}.
  
  Persona Specification:
  - Identity: ${persona.name}
  - Tone: ${persona.tone}
  - Mission: ${persona.description}
  - Expertise Areas: ${persona.expertise.join(', ')}
  - Professional History: ${experienceHistory}
  
  Constraint: Speak only about the professional experience provided. If asked about personal matters, redirect to professional strengths. Always use Markdown. Keep responses punchy and high-value.`;

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
      topP: 0.95,
    },
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
