
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AIPersona } from "../types";

/**
 * Initializes the Gemini AI client.
 * Note: process.env.API_KEY is injected by the environment.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from the environment. Please ensure it is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Parses raw resume text or file data into structured ResumeData and an AIPersona.
 * Uses Gemini 3 Pro for advanced reasoning and high-fidelity extraction.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const ai = getAIClient();
  
  try {
    const model = "gemini-3-pro-preview"; // High-reasoning model for extraction
    
    const prompt = `Act as an expert career strategist. Extract structured career data from the provided resume material and synthesize a high-fidelity professional AI persona. 
    The persona should have a unique tone based on the user's experience and should be able to answer questions about their background autonomously.
    Generate a unique 'identifier' for the URL (e.g., 'john-doe-dev').`;

    const parts: any[] = [{ text: prompt }];

    if (typeof input === 'string') {
      parts.push({ text: `RESUME MATERIAL:\n${input}` });
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
      contents: [{ role: "user", parts }],
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
                    },
                    required: ["degree", "institution", "year"]
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
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("The AI model returned an empty response.");
    
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Synthesis Fatal Error:", err);
    throw new Error(err.message || "Synthesis interrupted. Please check your internet connection.");
  }
};

/**
 * Conducts a stateful, streaming conversation with the synthesized persona.
 * Uses Gemini 3 Flash for low-latency chat.
 */
export async function* chatWithPersonaStream(
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[], 
  resumeData: ResumeData, 
  persona: AIPersona
) {
  const ai = getAIClient();

  try {
    const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. 
    Background: ${persona.description}. 
    Professional History: ${JSON.stringify(resumeData)}. 
    Expertise: ${persona.expertise.join(', ')}.
    Speak as this person's autonomous digital twin. Be professional but stay true to the tone provided. 
    Always use markdown for emphasis (bolding key terms) and clear structure.`;

    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    // Start a stream
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [...contents, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: 0.8,
        topP: 0.95,
        topK: 40
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error("Neural Stream Interrupted:", err);
    throw new Error(err.message || "Communication with the neural engine was interrupted.");
  }
}
