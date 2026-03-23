const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL_FAST = process.env.OLLAMA_MODEL_FAST || process.env.OLLAMA_MODEL || "llama3.2:3b";
const MODEL_SMART = process.env.OLLAMA_MODEL_SMART || "llama3.3";

const SYSTEM_PROMPT = `You are Kloudy, the AI assistant for United Family Caregivers (NV Care Solutions Inc.) and Kloudy Kare. When users get emails from Kloudy Kare, they know it's from you. Serve Nevada and Arizona.

You help with:
1. Basic company information (provider types, services, Nevada/Arizona programs)
2. Nevada laws, regulations, and processes (provider types, service codes, payers, EVV/billing)
3. General questions about registration, appointments, and services

Write in plain, everyday language. Be clear and direct. Avoid jargon. Stay professional but conversational.`;

const MODE_PROMPTS = {
  chat: "General chat mode.",
  notes: "User is in Notes mode. Help with call notes, activity summaries, and documentation. When activeClientId is set, create_note can link to that client. For structured clinical notes, use create_clinical_note after creating an encounter.",
  messenger: "User is in Messenger mode. Help with DMs, calls, emails. Use @ for users, # for actions (dm, email, reminder, appointment, call).",
  evv: "User is in EVV mode. Help with visit verification and time tracking. Use list_encounters to show visit history for a client. EVV billing integration is not yet implemented.",
  customer_service: "User is in Customer Service mode. Help with client management, eligibility, documents, onboarding, encounters, medications, allergies, and notes. Use list_clients, list_encounters, list_medications, list_allergies, create_appointment, add_medication, add_allergy as needed.",
  appointments: "User is in Appointments mode. Help schedule and manage appointments. Use create_appointment (client_id, title, start_at, duration_minutes, notes) and list_appointments (client_id) to manage the schedule.",
  supervisor: "User is in Supervisor mode. Help with approvals, oversight, and team management.",
  eligibility: "User is in Eligibility mode. Help check Nevada Medicaid eligibility. For 'Check eligibility for @Name', you need lastName, firstName, dob, and either recipientId or ssn. The system can run automated eligibility checks.",
};

const ROLE_PROMPTS = {
  client: "User is a client. Help with general questions, appointments, services, and their own care information.",
  caregiver: "User is a caregiver. Help with call notes, activity summaries, DMs, calls, emails, EVV visit verification, and client care. Use @ for users, # for actions (dm, email, reminder, appointment, call).",
  csr_admin: "User is CSR/admin. Help with client management, eligibility, documents, onboarding, encounters, medications, allergies, notes, and appointments. Use list_clients, list_encounters, list_medications, list_allergies, create_appointment, add_medication, add_allergy as needed. For eligibility, use the eligibility tools.",
  management_admin: "User is management/supervisor. Help with approvals, oversight, team management, plus all CSR capabilities. Use list_clients, create_appointment, eligibility tools, and supervisor functions.",
};

function buildSystemPrompt(userContext) {
  let extra = "";
  const role = userContext?.role;
  const mode = userContext?.mode;
  if (role && ROLE_PROMPTS[role]) {
    extra += `\n\nUser role: ${role}. ${ROLE_PROMPTS[role]}`;
  }
  if (mode && MODE_PROMPTS[mode]) {
    extra += `\n\nCurrent mode: ${mode}. ${MODE_PROMPTS[mode]}`;
  }
  if (userContext?.activeClientId) {
    extra += `\n\nActive client ID: ${userContext.activeClientId}`;
  }
  if (userContext?.activeClientName) {
    extra += `\n\nActive client name: ${userContext.activeClientName}. When replying, you may mention you're helping with ${userContext.activeClientName}'s profile when relevant.`;
  }
  if (userContext && Object.keys(userContext).length > 0) {
    extra += `\n\nUser context: ${JSON.stringify(userContext)}`;
  }
  return extra ? `${SYSTEM_PROMPT}${extra}` : SYSTEM_PROMPT;
}

async function generate(prompt, history = [], userContext = null) {
  const systemPrompt = buildSystemPrompt(userContext || {});
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_FAST, messages, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.message?.content || "";
}

async function generateStream(prompt, history = [], userContext = null, onToken) {
  const systemPrompt = buildSystemPrompt(userContext || {});
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_FAST, messages, stream: true }),
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

async function generateWithModel(model, prompt, history = []) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${response.status} ${err}`);
  }
  const data = await response.json();
  return data.message?.content || "";
}

const EXTRACT_CALL_NOTE_PROMPT = `Extract call note fields from the following text. Return ONLY valid JSON with these exact keys: call_reason, disposition, notes.
- call_reason: brief reason for the call (e.g. "Inquiry about payment schedule")
- disposition: outcome (e.g. "Resolved", "Pending", "Follow-up needed")
- notes: full details of what was discussed and any actions taken

Text to extract from:`;

async function extractCallNoteFromText(text) {
  const fullPrompt = `${EXTRACT_CALL_NOTE_PROMPT}\n\n${text}`;
  const response = await generateWithModel(MODEL_SMART, fullPrompt, []);
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

async function generateWithTools(prompt, history, userContext, tools, executeToolFn, userId, maxIterations = 5) {
  const basePrompt = buildSystemPrompt(userContext || {});
  const systemPrompt = `${basePrompt}\n\nYou have access to tools - use them when appropriate.`;
  let messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const body = { model: MODEL_FAST, messages, stream: false };
    if (tools && tools.length > 0) body.tools = tools;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama error: ${response.status} ${err}`);
    }
    const data = await response.json();
    const msg = data.message;
    if (!msg) return "";

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      return msg.content || "";
    }

    messages.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
    for (const tc of toolCalls) {
      const fn = tc.function || tc;
      const name = fn.name;
      let args = {};
      try {
        args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments || "{}") : fn.arguments || {};
      } catch (_) {}
      const result = await executeToolFn(name, args, userId);
      messages.push({
        role: "tool",
        content: result,
        ...(tc.id && { tool_call_id: tc.id }),
        ...(name && { tool_name: name }),
      });
    }
  }
  return "(Max tool iterations reached)";
}

const AUTO_NOTE_PROMPT = `Summarize these profile activities into a brief call note (2-4 sentences). Describe what was performed and why, in natural language suitable for a call log. Be concise.`;

const AUTO_RESPONSE_PROMPT = `You are an admin assistant for United Family Caregivers (NV Care Solutions Inc.). A patient or customer sent a message. Generate a professional reply.

RULES:
1. If the message explicitly requests a human, real person, agent, transfer, or to speak to someone (e.g. "I want to talk to a person", "transfer me", "speak to human", "real agent"), return: {"needs_human": true}
2. If the message is sensitive, urgent, or an edge case requiring human judgment, return: {"needs_human": true}
3. Otherwise, return: {"needs_human": false, "response": "your reply text here", "suggested_action": "email"}
4. Keep the response concise and professional.
5. Return ONLY valid JSON, no other text.`;

async function generateAutoResponse(messageContent, messageType, customerName) {
  const prompt = `${AUTO_RESPONSE_PROMPT}

Message type: ${messageType}
${customerName ? `Customer/From: ${customerName}` : ""}

Incoming message:
---
${(messageContent || "").slice(0, 2000)}
---

Return JSON:`;
  const response = await generate(prompt, []);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { needs_human: true, response: "", suggested_action: null };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      needs_human: !!parsed.needs_human,
      response: parsed.response || "",
      suggested_action: parsed.suggested_action || "email",
    };
  } catch (e) {
    return { needs_human: true, response: "", suggested_action: null };
  }
}

async function generateActivitySummary(activities) {
  const text = activities
    .map((a) => `- ${a.action_type}${a.details ? `: ${JSON.stringify(a.details)}` : ""}`)
    .join("\n");
  const fullPrompt = `${AUTO_NOTE_PROMPT}\n\nActivities:\n${text}`;
  const response = await generateWithModel(MODEL_SMART, fullPrompt, []);
  return response.trim();
}

module.exports = { generate, generateStream, generateWithTools, extractCallNoteFromText, generateActivitySummary, generateAutoResponse, MODEL_FAST, MODEL_SMART };
