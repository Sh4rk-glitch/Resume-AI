
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // @ts-ignore: Deno is global in Supabase environment
    const apiKey = Deno.env.get("API_KEY");
    
    if (!apiKey) {
      console.error("API_KEY missing from environment");
      return new Response(
        JSON.stringify({ error: "API_KEY not found in Supabase Secrets. Please run: supabase secrets set API_KEY=your_key" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, payload } = await req.json();
    const PROXY_ENDPOINT = "https://ai.hackclub.com/proxy/v1/chat/completions";

    if (action === 'parse') {
      const systemMsg = "You are a professional resume parser. Output ONLY valid JSON. No conversational filler.";
      const userContent: any[] = [
        { 
          type: "text", 
          text: `Act as an expert career strategist. Extract structured career data and synthesize a professional AI persona. 
          Output MUST be strict JSON matching this structure:
          {
            "resume": { "name": "", "title": "", "summary": "", "skills": [], "experience": [], "education": [], "certifications": [] },
            "persona": { "name": "", "tone": "", "strengths": [], "expertise": [], "description": "", "identifier": "", "exampleResponses": [] }
          }`
        }
      ];

      if (typeof payload === 'string') {
        userContent.push({ type: "text", text: `RESUME DATA:\n${payload}` });
      } else {
        userContent.push({
          type: "file",
          file: {
            filename: "resume.pdf",
            file_data: `data:${payload.mimeType};base64,${payload.data}`
          }
        });
      }

      const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: userContent }
          ],
          response_format: { type: "json_object" }
        })
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Proxy Parse Error:", result);
        throw new Error(result.error?.message || "Hack Club Proxy Error during parsing");
      }

      return new Response(result.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'chat') {
      const { message, history, resumeData, persona } = payload;
      
      const systemInstruction = `You are ${persona.name}. Tone: ${persona.tone}. 
      Background: ${persona.description}. 
      Resume Context: ${JSON.stringify(resumeData)}. 
      Speak as this person's autonomous digital twin. Use markdown for bolding and structure.`;

      const messages = [
        { role: "system", content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })),
        { role: "user", content: message }
      ];

      const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Proxy Chat Error:", errorData);
        throw new Error(errorData.error?.message || "Chat session link failed");
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) return;
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const cleanedLine = line.trim();
                if (!cleanedLine || cleanedLine === "data: [DONE]") continue;
                if (cleanedLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(cleanedLine.slice(6));
                    const content = data.choices[0]?.delta?.content || "";
                    if (content) {
                      controller.enqueue(new TextEncoder().encode(content));
                    }
                  } catch (e) {
                    // Ignore partial JSON chunks
                  }
                }
              }
            }
          } catch (err) {
            console.error("Stream reader error:", err);
            controller.error(err);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Edge Function Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
