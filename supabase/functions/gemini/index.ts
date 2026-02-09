import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "@google/genai"

// Note: The API key is assumed to be available via process.env.API_KEY as per the @google/genai guidelines.
// The manual 'process' definition has been removed to fix the "Cannot find name 'Deno'" error and adhere to the rule of not defining process.env.

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
    // Initializing GoogleGenAI using the mandatory named parameter and process.env.API_KEY.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { action, payload } = await req.json()

    if (action === 'parse') {
      const prompt = `Act as an expert career strategist. Extract structured career data and synthesize a professional AI persona. 
      Output MUST be strict JSON matching this schema:
      {
        "resume": {
          "name": "string",
          "title": "string",
          "summary": "string",
          "skills": ["string"],
          "experience": [{"role": "string", "company": "string", "duration": "string", "description": ["string"]}],
          "education": [{"degree": "string", "institution": "string", "year": "string"}],
          "certifications": ["string"]
        },
        "persona": {
          "name": "string",
          "tone": "string",
          "strengths": ["string"],
          "expertise": ["string"],
          "description": "string",
          "identifier": "string (lowercase-slug)",
          "exampleResponses": ["string"]
        }
      }`;

      let parts = []
      if (typeof payload === 'string') {
        parts.push({ text: `DATA SOURCE: Raw Text\nCONTENT:\n${payload}` })
      } else {
        parts.push({
          inlineData: {
            data: payload.data,
            mimeType: payload.mimeType || 'application/pdf'
          }
        })
      }
      parts.push({ text: prompt })

      // Using gemini-3-pro-preview for structured extraction and advanced reasoning task.
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
        }
      })

      // The 'text' property is used directly to extract the generated response.
      return new Response(response.text, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'chat') {
      const { message, history, resumeData, persona } = payload
      
      const contents = [
        ...history.map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: message }] }
      ]

      // Using gemini-3-flash-preview for general Q&A and chat interactions.
      const responseStream = await ai.models.generateContentStream({ 
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: `You are ${persona.name}. Tone: ${persona.tone}. Description: ${persona.description}. 
          You are the digital twin of the person described in this resume: ${JSON.stringify(resumeData)}. 
          Recruiters or employers are talking to you. Be professional, insightful, and stay in character. 
          Use markdown for emphasis (**bold**).`,
        }
      })
      
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of responseStream) {
            // Accessing the .text property on the response chunk for streaming output.
            const text = chunk.text
            if (text) {
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
          controller.close()
        },
      })

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    // Ensuring CORS headers are always returned even on API error.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})