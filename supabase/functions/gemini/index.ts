
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MISTRAL_API_KEY = (Deno as any).env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) throw new Error("Neural Link Offline: MISTRAL_API_KEY missing from Edge Secrets.");

    console.log('API_KEY exists');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    // Test endpoint to verify API key works
    if (req.url.includes('/test')) {
      console.log('Testing API key...');
      const testResponse = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        }
      });
      const testData = await testResponse.text();
      return new Response(JSON.stringify({
        status: testResponse.status,
        data: testData.substring(0, 200)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, payload } = await req.json();

    console.log('Action:', action);
    console.log('Payload type:', typeof payload);

    if (action === 'parse') {
      const resumeContent = typeof payload === 'string' ? payload : "Material provided via multi-modal part.";
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-small',
          messages: [{
            role: 'user',
            content: `Analyze this resume and extract the following JSON structure:
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
    "identifier": "string",
    "exampleResponses": ["string"]
  }
}

Resume Content:
${resumeContent}`
          }],
          temperature: 0.7
        })
      });

      // Read and parse the response
      const responseText = await response.text();
      console.log('Parse response status:', response.status);
      console.log('Parse response length:', responseText.length);

      if (!response.ok) {
        console.error('Parse error response:', responseText);
        throw new Error(`Mistral API Error: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Mistral API");

      // Extract JSON from the response (might be in markdown code blocks)
      let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      // Try to find JSON object in the content if no code block
      if (!jsonMatch) {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonStr = content.substring(jsonStart, jsonEnd + 1);
        }
      }

      const parsedData = JSON.parse(jsonStr);
      
      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'chat') {
      const { message, history, persona, resumeData } = payload;
      
      if (!message) {
        throw new Error("Message is required");
      }

      const systemPrompt = `You are ${persona.name}. Tone: ${persona.tone}. 
Persona Bio: ${persona.description}. 
Key Expertise: ${persona.expertise.join(', ')}.
Background Details: ${JSON.stringify(resumeData)}.
Speak as this person's AI representative. Use markdown for better readability.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((h: any) => ({
          role: h.role,
          content: h.content
        })),
        { role: 'user', content: message }
      ];

      console.log('Sending request to Mistral');
      console.log('API_KEY exists:', !!MISTRAL_API_KEY);

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-small',
          messages,
          temperature: 0.7
        })
      });

      console.log('Response status:', response.status);

      // Read the response ONCE
      const text = await response.text();
      console.log('Received response text length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));

      if (!response.ok) {
        console.error('HTTP Error:', response.status, text);
        throw new Error(`Groq API Error - HTTP ${response.status}: ${text}`);
      }

      console.log('Response OK, processing response');
      
      try {
        // Parse the response
        const data = JSON.parse(text);
        console.log('Parsed data:', JSON.stringify(data).substring(0, 200));
        
        const aiMessage = data.choices?.[0]?.message?.content || '';
        if (!aiMessage) {
          console.error('No content found in choices:', data.choices);
          throw new Error("No content in AI response");
        }

        console.log('AI Message length:', aiMessage.length);

        // Convert to SSE format for streaming
        const sseResponse = `data: ${JSON.stringify({
          choices: [{
            delta: { content: aiMessage }
          }]
        })}\ndata: [DONE]\n`;
        
        return new Response(sseResponse, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      } catch (parseError: any) {
        console.error('Parse error:', parseError.message);
        throw parseError;
      }
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in function:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
