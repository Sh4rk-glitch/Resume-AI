
import { ResumeData, AIPersona } from "../types";

// HACK CLUB PROXY CONFIGURATION
const PROXY_ENDPOINT = "https://ai.hackclub.com/proxy/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-exp"; // High-speed multimodal model available via proxy
const HARDCODED_KEY = "sk-hc-v1-f1367f169e0144f1b5116b599e284228d844ff19490e4e6e9b449991c497554a";

/**
 * Resolves the API Key with a focus on stability for Vercel/HackClub.
 */
const getApiKey = () => {
  return (
    HARDCODED_KEY ||
    (window as any).process?.env?.API_KEY || 
    (process.env as any)?.API_KEY || 
    (process.env as any)?.NEXT_PUBLIC_API_KEY
  );
};

/**
 * Parses raw resume text or file data into structured ResumeData and an AIPersona.
 * Uses a direct fetch to the Hack Club Proxy for multimodal extraction.
 */
export const parseResume = async (input: string | { data: string; mimeType: string }): Promise<{ resume: ResumeData; persona: AIPersona }> => {
  const apiKey = getApiKey();
  const systemPrompt = `Act as an expert career strategist and professional identity designer. 
  Extract all professional data from the provided material and synthesize a high-fidelity AI persona.
  
  IMPORTANT: You must respond ONLY with a valid JSON object.
  Format:
  {
    "resume": { "name": "string", "title": "string", "summary": "string", "skills": [], "experience": [{"role": "string", "company": "string", "duration": "string", "description": []}], "education": [], "certifications": [] },
    "persona": { "name": "string", "tone": "string", "strengths": [], "expertise": [], "description": "string", "identifier": "string", "exampleResponses": [] }
  }`;

  let userContent: any;
  if (typeof input === 'string') {
    userContent = [{ type: "text", text: input }];
  } else {
    // Multimodal input for the proxy
    userContent = [
      { type: "text", text: "Extract data from this resume document." },
      {
        type: "image_url",
        image_url: {
          url: `data:${input.mimeType};base64,${input.data}`
        }
      }
    ];
  }

  const response = await fetch(PROXY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Neural Link Error: ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Neural Decode Failure:", content);
    throw new Error("Neural Decode Error: The AI returned an invalid response format.");
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
  const apiKey = getApiKey();
  
  const experienceHistory = resumeData.experience.map(e => `${e.role} at ${e.company}`).join(', ');
  const systemInstruction = `You are the digital twin of ${resumeData.name}.
  Identity: ${persona.name}. Tone: ${persona.tone}.
  Mission: ${persona.description}. Expertise: ${persona.expertise.join(', ')}.
  History: ${experienceHistory}.
  Constraint: Speak only as this persona. Use Markdown. Keep it professional yet authentic.`;

  const messages = history.map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content
  }));
  
  messages.push({ role: 'user', content: message });

  const response = await fetch(PROXY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        ...messages
      ],
      stream: true,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Neural Stream Error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

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
          if (delta) yield delta;
        } catch (e) {
          // Skip invalid JSON chunks
        }
      }
    }
  }
}
