
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Import GoogleGenAI and Type from @google/genai via esm.sh for Deno compatibility
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

// Fix: Use @ts-ignore to suppress "Cannot find name 'Deno'" as it is a global available at runtime in Supabase Edge Functions
// @ts-ignore
const API_KEY = Deno.env.get("API_KEY");

// Guidelines: Always use process.env.API_KEY. We shim it for the Deno environment.
// @ts-ignore
globalThis.process = {
  env: {
    API_KEY: API_KEY
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Guidelines: Always use the process.env.API_KEY environment variable.
    // @ts-ignore
    const key = process.env.API_KEY;
    if (!key) {
      throw new Error("API_KEY not found in environment. Please configure it in Supabase secrets.");
    }

    const { action, payload } = await req.json();
    // Initialize the Gemini client using the mandatory initialization pattern
    const ai = new GoogleGenAI({ apiKey: key });

    if (action === 'parse') {
      const prompt = "Act as an expert career strategist. Extract structured career data from the following material and synthesize a professional AI persona. Return only valid JSON.";
      
      const contents: any[] = [];
      if (typeof payload === 'string') {
        contents.push({ role: 'user', parts: [{ text: `${prompt}\n\nResume Material:\n${payload}` }] });
      } else {
        contents.push({
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: payload.mimeType,
                data: payload.data
              }
            }
          ]
        });
      }

      // Use gemini-3-flash-preview for efficient text extraction and JSON generation
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
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

      return new Response(response.text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'chat') {
      const { message, history, resumeData, persona } = payload;
      
      const systemInstruction = `You are ${persona.name}. 
      Tone: ${persona.tone}. 
      Expertise: ${persona.expertise.join(', ')}.
      Background: ${persona.description}.
      Resume Data: ${JSON.stringify(resumeData)}.
      You are the digital twin of this professional. Speak directly to recruiters as an autonomous agent. Use Markdown.`;

      // Convert conversation history to Gemini-compatible format
      const geminiContents = [
        ...history.map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      // Use gemini-3-flash-preview for low-latency conversational streaming
      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: geminiContents,
        config: {
          systemInstruction
        }
      });

      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of streamResponse) {
            // Extract generated text from the chunk using the response.text property
            const text = chunk.text;
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Supabase Edge Function Neural Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
