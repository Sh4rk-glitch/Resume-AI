import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "https://esm.sh/@google/genai"

// CORS headers for cross-origin requests from the frontend
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
    // Initialize using the mandatory named parameter and process.env.API_KEY.
    // As per coding guidelines, assume process.env.API_KEY is pre-configured and accessible.
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

      // Using gemini-3-pro-preview for complex extraction and synthesis tasks.
      // Call generateContent directly with the model name and contents.
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
        }
      })

      // Use the .text property (not a method) to extract string output from GenerateContentResponse.
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

      // Using gemini-3-flash-preview for high-performance streaming chat responses.
      const responseStream = await ai.models.generateContentStream({ 
        model: "gemini-3-flash-preview",
        contents: contents,
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
            // chunk.text is a property that returns the string segment for streaming.
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
    console.error("Neural Execution Failure:", error);
    // Ensure CORS headers are included even in error responses.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})