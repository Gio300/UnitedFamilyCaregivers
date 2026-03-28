const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL_FAST =
  process.env.OLLAMA_MODEL_FAST || process.env.OLLAMA_MODEL || "llama3.2";
const MODEL_SMART = process.env.OLLAMA_MODEL_SMART || "llama3.3";

/** Prefer MODEL_FAST; if not installed, pick first tag from Ollama (avoids 404 when name/tag differs). */
let resolvedFastModelCache = null;
async function getResolvedFastModel() {
  if (resolvedFastModelCache) return resolvedFastModelCache;
  const preferred = MODEL_FAST;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) throw new Error("tags");
    const data = await r.json();
    const names = (data.models || []).map((m) => m.name).filter(Boolean);
    if (names.length === 0) {
      resolvedFastModelCache = preferred;
      return preferred;
    }
    if (names.includes(preferred)) {
      resolvedFastModelCache = preferred;
      return preferred;
    }
    const hit =
      names.find((n) => n.startsWith(preferred + ":")) ||
      names.find((n) => n.split(":")[0] === preferred.split(":")[0]) ||
      names[0];
    if (hit && hit !== preferred) {
      console.warn(
        `[ollama] "${preferred}" not in ollama list; using "${hit}". Set OLLAMA_MODEL_FAST or run: ollama pull ${preferred}`
      );
    }
    resolvedFastModelCache = hit || preferred;
    return resolvedFastModelCache;
  } catch {
    resolvedFastModelCache = preferred;
    return preferred;
  }
}

const SYSTEM_PROMPT = `You are Kloudy, the AI assistant for United Family Caregivers (NV Care Solutions Inc.) and Kloudy Kare. When users get emails from Kloudy Kare, they know it's from you. Serve Nevada and Arizona.

You help with:
1. Basic company information (provider types, services, Nevada/Arizona programs)
2. Nevada laws, regulations, and processes (provider types, service codes, payers, EVV/billing)
3. General questions about registration, appointments, and services

Write in plain, everyday language. Be clear and direct. Avoid jargon. Stay professional but conversational.

**Billing readiness (Sandata / EVV):** When guiding setup, prefer the order **client row → employee → visit** where it applies. Ask **one** focused question at a time. Nudge concrete next steps (profiles, EVV checklist, message center, appointments, eligibility next step) instead of long repeated explanations. Do **not** invent statutes, legal workarounds, or quoted denials for Medicaid or payer calls; if someone describes a denial, encourage accurate notes for appeals without presenting legal advice.`;

const MODE_PROMPTS = {
  chat: "General chat mode.",
  notes: "User is in Notes mode. Help with call notes, activity summaries, and documentation. When activeClientId is set, create_note can link to that client. For structured clinical notes, use create_clinical_note after creating an encounter.",
  messenger: "User is in Messenger mode. Help with DMs, calls, emails. Use @ for users, # for actions (dm, email, reminder, appointment, call).",
  profiles: "User is in Profiles mode. Help with viewing and selecting client or caregiver profiles. Use list_clients when relevant.",
  evv: "User is in EVV mode. Help with visit verification and time tracking. Use list_encounters to show visit history for a client. They can type **start checklist** or **evv checklist** for a Sandata-order guided pass (client → employee → visit). EVV billing integration is not yet implemented.",
  customer_service: "User is in Customer Service mode. Help with client management, eligibility, documents, onboarding, encounters, medications, allergies, and notes. Use list_clients, list_encounters, list_medications, list_allergies, create_appointment, add_medication, add_allergy as needed. **start checklist** runs Sandata-shaped intake prompts.",
  appointments: "User is in Appointments mode. Help schedule and manage appointments. Use create_appointment (client_id, title, start_at, duration_minutes, notes) and list_appointments (client_id) to manage the schedule.",
  supervisor: "User is in Supervisor mode. Help with approvals, oversight, and team management.",
  queue:
    "User is in Queue mode (staff). Help manage the support voice queue and allowlisted outbound calls. Prefer the queue panel, accepting waiting callers, and documented eligibility/Medicaid call notes when relevant.",
  eligibility:
    "User is in Eligibility mode. Help check Nevada Medicaid eligibility. For 'Check eligibility for @Name', you need lastName, firstName, dob, and either recipientId or ssn. The system can run automated eligibility checks. **start checklist** connects eligibility to Sandata payer row reminders. For caregiver/client users, keep steps short: portal or guided call, one question at a time; do not invent legal strategies for payer interviews.",
};

const ROLE_PROMPTS = {
  client: "User is a client. Help with general questions, appointments, services, and their own care information.",
  caregiver: "User is a caregiver. Help with call notes, activity summaries, DMs, calls, emails, EVV visit verification, and client care. Use @ for users, # for actions (dm, email, reminder, appointment, call).",
  csr_admin:
    "User is CSR/admin. Help with client management, eligibility, documents, onboarding, encounters, medications, allergies, notes, and appointments. Use list_clients, list_encounters, list_medications, list_allergies, create_appointment, add_medication, add_allergy as needed. For eligibility, use the eligibility tools. Prefer funneling toward billing readiness: EVV checklist, active client row, message center follow-ups, appointments — short and sequential.",
  management_admin:
    "User is management/supervisor. Help with approvals, oversight, team management, plus all CSR capabilities. Use list_clients, create_appointment, eligibility tools, and supervisor functions. Same billing-readiness funnel as CSR when coaching staff.",
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

  const model = await getResolvedFastModel();
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

async function generateStream(prompt, history = [], userContext = null, onToken) {
  const systemPrompt = buildSystemPrompt(userContext || {});
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const model = await getResolvedFastModel();
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
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

  const fastModel = await getResolvedFastModel();
  for (let i = 0; i < maxIterations; i++) {
    const body = { model: fastModel, messages, stream: false };
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

const FLOW_ASSIST_INSTRUCTION = `You are Kloudy for United Family Caregivers (NV Care Solutions Inc.). Tone: urban, professional, concise — no slang overload.

Sandata EVV (Nevada): Client row must load before visits; employee before visits; first visit submission needs Call In and Out. PayerID + PayerProgram + ProcedureCode combinations must match the state spec; HCPCS and modifiers are UPPERCASE.

You are helping with ONE checklist step. Do not invent payer-specific facts not in the user message or prior answers.

Return ONLY valid JSON (no markdown):
{"assistant_message":"string","extracted":{},"next_step_id":null}

- assistant_message: short reply acknowledging what they said; if unclear, ask one clarifying question.
- extracted: optional flat object; only keys relevant to sandataKeys or obvious from text (e.g. ClientMedicaidID, PayerID, notes).
- next_step_id: usually null unless the user clearly finished the step and you know the exact id; prefer null and let them use buttons.`;

async function flowAssist({
  userMessage,
  flowId,
  resumeStepId,
  sandataKeys,
  answers,
  userContext,
}) {
  const prompt = `${FLOW_ASSIST_INSTRUCTION}

flowId: ${flowId}
current_step_id: ${resumeStepId}
sandataKeys: ${JSON.stringify(sandataKeys || [])}
answers_so_far: ${JSON.stringify(answers || {})}
user_context: ${JSON.stringify(userContext || {})}

User message:
---
${(userMessage || "").slice(0, 4000)}
---

JSON only:`;

  const response = await generateWithModel(await getResolvedFastModel(), prompt, []);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      assistant_message: "I hear you — use a quick-reply button if you can, or say it shorter.",
      extracted: {},
      next_step_id: null,
    };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      assistant_message: String(parsed.assistant_message || "").slice(0, 2000),
      extracted:
        parsed.extracted && typeof parsed.extracted === "object" && !Array.isArray(parsed.extracted)
          ? parsed.extracted
          : {},
      next_step_id: parsed.next_step_id || null,
    };
  } catch {
    return {
      assistant_message: "Say that again in one sentence — or pick a button.",
      extracted: {},
      next_step_id: null,
    };
  }
}

const COMPANION_GUIDANCE_SYSTEM = `You write short on-screen hints for someone waiting on hold for United Family Caregivers customer service (voice + Companion sidebar).
Rules: Output plain sentences only. No markdown, no bullet lists, no JSON, no emojis. At most 4 short sentences.
Always be honest that they are waiting for a live agent unless context explicitly says a rep joined.
Remind them that sharing details with you helps the representative and does not remove them from the queue.
You may mention they can use the main text chat to see updates, and they can use Schedule a call if they prefer a call-back.`;

async function generateCompanionGuidance(contextPayload) {
  const userContent = `Session context (JSON):\n${JSON.stringify(contextPayload)}\n\nWrite the next Companion guidance message for the user.`;
  const model = await getResolvedFastModel();
  const messages = [
    { role: "system", content: COMPANION_GUIDANCE_SYSTEM },
    { role: "user", content: userContent },
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
  const raw = (data.message?.content || "").trim();
  return raw.slice(0, 1200);
}

const COMPANION_ORCHESTRATE_SYSTEM = `You plan Companion sidebar hints for United Family Caregivers (caregiving app). Main chat runs tools; Companion only suggests next steps — do not duplicate long answers from chat.

Funnel toward **billing readiness** when relevant: EVV checklist (Sandata order: client → employee → visit), profiles/client row, message center or DMs, appointments, eligibility next step. Keep guidance short and non-repetitive with the last chat turn.

Return ONLY valid JSON (no markdown):
{"guidance":"string","actions":[{"id":"snake_id","label":"short button label","chatPayload":"optional","channel":null}],"needsMcp":false,"mcpMessage":null}

- guidance: plain text, max 4 short sentences, no bullets/markdown.
- actions: 0 to 5 items. Use chatPayload to prefill main chat (e.g. **start checklist**). channel must be one of: "dm","email","reminder","appointment","call" or omit/null.
- needsMcp: true if a short MCP message could fetch checklist/tool context.
- mcpMessage: short user-style line for MCP (e.g. **start checklist** or a concrete tool ask).`;

function normalizeOrchestrateActions(raw) {
  const channels = new Set(["dm", "email", "reminder", "appointment", "call"]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a, i) => {
      if (!a || typeof a !== "object") return null;
      const id = typeof a.id === "string" && a.id.trim() ? a.id.trim().slice(0, 64) : `action_${i}`;
      const label = typeof a.label === "string" && a.label.trim() ? a.label.trim().slice(0, 80) : "Next step";
      const chatPayload = typeof a.chatPayload === "string" ? a.chatPayload.slice(0, 2000) : undefined;
      let channel = a.channel;
      if (channel != null && typeof channel === "string" && channels.has(channel)) {
        channel = channel;
      } else {
        channel = undefined;
      }
      const out = { id, label, ...(chatPayload ? { chatPayload } : {}), ...(channel ? { channel } : {}) };
      return out;
    })
    .filter(Boolean);
}

async function generateCompanionOrchestrate(contextPayload) {
  const role = contextPayload && contextPayload.role;
  const adminStaff =
    role === "csr_admin" || role === "management_admin"
      ? " Staff user (CSR/supervisor): prefer actions using DMs, email, reminder, appointment, or chatPayload that opens workflows — not \"Contact us\". Nudge Message Center (bell) and Queue mode for live callers when relevant."
      : "";
  const userContent = `Context JSON:\n${JSON.stringify(contextPayload)}${adminStaff}\n\nReturn JSON only.`;
  const model = await getResolvedFastModel();
  const messages = [
    { role: "system", content: COMPANION_ORCHESTRATE_SYSTEM },
    { role: "user", content: userContent },
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
  const raw = (data.message?.content || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      guidance: "Use Quick actions or the main chat for the next step.",
      actions: [],
      needsMcp: false,
      mcpMessage: null,
    };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const guidance = String(parsed.guidance || "").trim().slice(0, 1200);
    const actions = normalizeOrchestrateActions(parsed.actions);
    const needsMcp = !!parsed.needsMcp;
    const mcpMessage =
      typeof parsed.mcpMessage === "string" && parsed.mcpMessage.trim() ? parsed.mcpMessage.trim().slice(0, 500) : null;
    return {
      guidance: guidance || "Use the main chat or voice below if you need help.",
      actions,
      needsMcp,
      mcpMessage,
    };
  } catch {
    return {
      guidance: "Use Quick actions (+) or type in main chat.",
      actions: [],
      needsMcp: false,
      mcpMessage: null,
    };
  }
}

async function refineCompanionAfterMcp({ priorGuidance, priorActions, mcpResponseText }) {
  const model = await getResolvedFastModel();
  const system = `You refine Companion JSON after an MCP tool response. Return ONLY valid JSON:
{"guidance":"string","actions":[same shape as before]}
Plain guidance, max 3 sentences. Actions: 0-4 items.`;
  const userContent = `Prior guidance: ${priorGuidance}\nPrior actions JSON: ${JSON.stringify(priorActions)}\nMCP result (truncated):\n${(mcpResponseText || "").slice(0, 2000)}\n\nMerged JSON only:`;
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      stream: false,
    }),
  });
  if (!response.ok) {
    return { guidance: priorGuidance, actions: priorActions };
  }
  const data = await response.json();
  const raw = (data.message?.content || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { guidance: priorGuidance, actions: priorActions };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      guidance: String(parsed.guidance || priorGuidance).trim().slice(0, 1200) || priorGuidance,
      actions: normalizeOrchestrateActions(parsed.actions).length ? normalizeOrchestrateActions(parsed.actions) : priorActions,
    };
  } catch {
    return { guidance: priorGuidance, actions: priorActions };
  }
}

async function summarizeInterviewRawNotes(rawNotes) {
  const clipped = String(rawNotes || "").trim().slice(0, 12000);
  if (!clipped) return "";
  const system = `You write short internal summaries of caregiver or staff phone-call notes for a home care agency.
Rules:
- Use ONLY information in the provided notes. Do not invent quotes, laws, statutes, or denial reasons not stated above.
- If the notes are vague, say so briefly.
- At most 5 sentences. Plain text only — no markdown, no bullet lists.`;
  const userContent = `Notes:\n\n${clipped}\n\nSummary:`;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_SMART, messages, stream: false }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${response.status} ${err}`);
  }
  const data = await response.json();
  return String(data.message?.content || "")
    .trim()
    .slice(0, 4000);
}

module.exports = {
  generate,
  generateStream,
  generateWithTools,
  extractCallNoteFromText,
  generateActivitySummary,
  generateAutoResponse,
  generateCompanionGuidance,
  generateCompanionOrchestrate,
  refineCompanionAfterMcp,
  flowAssist,
  summarizeInterviewRawNotes,
  MODEL_FAST,
  MODEL_SMART,
};
