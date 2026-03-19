const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const SYSTEM_PROMPT = `You are a helpful assistant for United Family Caregivers (NV Care Solutions Inc.), an agency serving Nevada and Arizona.

You help with:
1. Basic company information (provider types, services, Nevada/Arizona programs)
2. Nevada laws, regulations, and processes (provider types, service codes, payers, EVV/billing)
3. General questions about registration, appointments, and services

Write in plain, everyday language. Be clear and direct. Avoid jargon. Stay professional but conversational.`;

async function generate(prompt, history = [], userContext = null) {
  const systemPrompt = userContext
    ? `${SYSTEM_PROMPT}\n\nUser context: ${JSON.stringify(userContext)}`
    : SYSTEM_PROMPT;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.message?.content || "";
}

async function generateStream(prompt, history = [], userContext = null, onToken) {
  const systemPrompt = userContext
    ? `${SYSTEM_PROMPT}\n\nUser context: ${JSON.stringify(userContext)}`
    : SYSTEM_PROMPT;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${response.status} ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const content = obj.message?.content;
        if (content) {
          fullContent += content;
          if (onToken) onToken(content);
        }
      } catch (_) {}
    }
  }
  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer);
      const content = obj.message?.content;
      if (content) {
        fullContent += content;
        if (onToken) onToken(content);
      }
    } catch (_) {}
  }
  return fullContent;
}

const EXTRACT_CALL_NOTE_PROMPT = `Extract call note fields from the following text. Return ONLY valid JSON with these exact keys: call_reason, disposition, notes.
- call_reason: brief reason for the call (e.g. "Inquiry about payment schedule")
- disposition: outcome (e.g. "Resolved", "Pending", "Follow-up needed")
- notes: full details of what was discussed and any actions taken

Text to extract from:`;

async function extractCallNoteFromText(text) {
  const fullPrompt = `${EXTRACT_CALL_NOTE_PROMPT}\n\n${text}`;
  const response = await generate(fullPrompt, []);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { call_reason: null, disposition: null, notes: text.slice(0, 2000) };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      call_reason: parsed.call_reason || null,
      disposition: parsed.disposition || null,
      notes: parsed.notes || text.slice(0, 2000),
    };
  } catch (e) {
    return { call_reason: null, disposition: null, notes: text.slice(0, 2000) };
  }
}

module.exports = { generate, generateStream, extractCallNoteFromText };
