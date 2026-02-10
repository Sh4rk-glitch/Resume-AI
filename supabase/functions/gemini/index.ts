import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// FIX: Always use import {GoogleGenAI} from "@google/genai";
import { GoogleGenAI, Type } from "@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // FIX: Using process.env.API_KEY as strictly required by guidelines to obtain the API key.
    // This also resolves the "Cannot find name 'Deno'" error in the execution context.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing API_KEY secret in Supabase environment.");
    }

    // FIX: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { action, payload } = await req.json()

    if (action === 'parse') {
      const resumeContent = typeof payload === 'string' 
        ? payload 
        : `Resume Data (Base64 encoded ${payload.mimeType}): ${payload.data}`;

      // FIX: Use gemini-3-flash-preview for text extraction and synthesis tasks.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as an expert career strategist. Extract structured career data and synthesize a professional AI persona from the following resume content: ${resumeContent}`,
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

      // FIX: The response.text property directly returns the string output.
      return new Response(response.text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'chat') {
      const { message, history, resumeData, persona } = payload;
      
      const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. Description: ${persona.description}. 
      You are the digital twin of the person described in this resume: ${JSON.stringify(resumeData)}. 
      Recruiters or employers are talking to you. Be professional, insightful, and stay in character. 
      Use markdown for emphasis (**bold**).`;

      // FIX: Map history to the correct role format for Gemini API.
      const contents = history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      // FIX: Receive a streaming response from the model using generateContentStream.
      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction }
      });

      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of streamResponse) {
            // FIX: Correct extraction of text output from GenerateContentResponse using the .text property.
            const text = chunk.text;
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Gemini Engine Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})