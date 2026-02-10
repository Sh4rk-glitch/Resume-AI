
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

// Hack Club AI Proxy Configuration
const HACK_CLUB_API_KEY = 'sk-hc-v1-f1367f169e0144f1b5116b599e284228d844ff19490e4e6e9b449991c497554a';
const HACK_CLUB_ENDPOINT = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const MODEL_ID = 'qwen/qwen3-32b';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json();

    if (action === 'parse') {
      const systemPrompt = `Act as an expert career strategist. Extract structured career data from the provided resume material and synthesize a professional AI persona.
      
      IMPORTANT: Respond ONLY with valid JSON.
      {
        "resume": { "name": "string", "title": "string", "summary": "string", "skills": [], "experience": [], "education": [], "certifications": [] },
        "persona": { "name": "string", "tone": "string", "strengths": [], "expertise": [], "description": "string", "identifier": "string", "exampleResponses": [] }
      }`;

      let userMessageContent: any;
      if (typeof payload === 'string') {
        userMessageContent = payload;
      } else {
        userMessageContent = [
          { type: "text", text: "Please extract the career data from this resume file." },
          {
            type: "file",
            file: {
              filename: "resume.pdf",
              file_data: `data:${payload.mimeType};base64,${payload.data}`
            }
          }
        ];
      }

      const response = await fetch(HACK_CLUB_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HACK_CLUB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessageContent }
          ],
          plugins: [
            { id: "file-parser", pdf: { engine: "native" } }
          ],
          temperature: 0.1
        })
      });

      const result = await response.json();
      const content = result.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI returned invalid data format");

      return new Response(jsonMatch[0], {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'chat') {
      const { message, history, resumeData, persona } = payload;
      
      const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. 
      Background: ${persona.description}. 
      History: ${JSON.stringify(resumeData.experience.map((e: any) => ({ role: e.role, company: e.company })))}.
      Expertise: ${persona.expertise.join(', ')}.
      Speak as this person's AI twin. Use markdown.`;

      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      const response = await fetch(HACK_CLUB_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HACK_CLUB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages,
          stream: true,
          temperature: 0.7
        })
      });

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";

              for (const line of lines) {
                const cleaned = line.trim();
                if (!cleaned || cleaned === 'data: [DONE]') continue;
                if (cleaned.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(cleaned.substring(6));
                    const delta = json.choices[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch (e) { }
                }
              }
            }
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
