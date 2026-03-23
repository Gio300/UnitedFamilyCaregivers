/**
 * MCP rule-based intent detection and FAQ responses.
 * Used when AI is unavailable or for simple automatable queries.
 */

const FAQ = {
  company: `United Family Caregivers (NV Care Solutions Inc.) serves Nevada and Arizona. Provider types: 30 (Personal Care, Habilitation, Attendant Care, Respite), 38/211 (IDD waiver). Services include Personal Care, Habilitation, Attendant Care, Respite, and Home Health.`,
  evv: `EVV: Procedure codes and modifiers must be UPPERCASE. PayerProgram format is two-part (e.g. "NVFFS PCS", "NVANT HH"). Sandata EVV: evv-registration.sandata.com, NV-DHCFP.`,
  provider30: `Provider Type 30 (Personal Care): ADLs and IADLs. PCS programs: NVFFS PCS, NVANT PCS, NVMOL PCS, NVHPN PCS, NVSIL PCS, NVCAR PCS. Procedure code T1019. Modifier TF = Self Directed Personal Care.`,
  provider38: `Provider Type 38, Specialty 211 (IDD Waiver): T2016 (Daily Rate residential support), T2017 (Intermittent residential support).`,
  nevada: `Nevada: Provider types 30, 38. Waiver services: S5120 Chore, S5125 Attendant Care, S5130 Homemaker, S5135 Companion, S5150 Respite. Home Health: T1002 RN, T1003 LPN, G0151 PT, G0156 HH Aide, S9122-S9124. Payers: NVFFS, NVMOL, NVHPN, NVANT, NVSIL, NVCAR.`,
  arizona: `Arizona: Provider Type 30 for Habilitation, Attendant Care (S5125), Respite (S5150).`,
  eligibility: `Eligibility checks require: lastName, firstName, DOB, and either recipientId or SSN. Use the Eligibility tab (above EVV) for Nevada Medicaid or ask with client details.`,
  appointments: `To list or schedule appointments, select a client from Profiles first. Use the Appointments mode (above EVV) or ask "list appointments for [client name]" with a client selected.`,
};

/** Intent: { pattern: RegExp, handler: 'tool'|'faq', tool?: string, args?: fn(msg)->object, faqKey?: string } */
const INTENTS = [
  // Tool-backed
  { pattern: /\b(who am i|my profile|get my profile)\b/i, handler: "tool", tool: "get_profile" },
  { pattern: /\b(list|show)\s*(my\s+)?(clients?|profiles?)\b/i, handler: "tool", tool: "list_clients" },
  { pattern: /\b(list|show)\s*(appointments?|schedules?)\b/i, handler: "tool", tool: "list_appointments", needsClient: true },
  { pattern: /\b(list|show)\s*(encounters?|visits?|care\s+visits?)\b/i, handler: "tool", tool: "list_encounters", needsClient: true },
  { pattern: /\b(create|add|log)\s*(a\s+)?(note|call\s+note)\b/i, handler: "tool", tool: "create_note", extractNote: true },
  { pattern: /\b(add|create)\s*(a\s+)?reminder\b/i, handler: "tool", tool: "add_reminder", extractReminder: true },
  // FAQ
  { pattern: /\b(company|about|who\s+are\s+you)\b/i, handler: "faq", faqKey: "company" },
  { pattern: /\b(evv|electronic\s+visit\s+verification)\b/i, handler: "faq", faqKey: "evv" },
  { pattern: /\b(provider\s*30|type\s*30|pt30)\b/i, handler: "faq", faqKey: "provider30" },
  { pattern: /\b(provider\s*38|type\s*38|idd|waiver)\b/i, handler: "faq", faqKey: "provider38" },
  { pattern: /\b(nevada|nv)\b/i, handler: "faq", faqKey: "nevada" },
  { pattern: /\b(arizona|az)\b/i, handler: "faq", faqKey: "arizona" },
  { pattern: /\b(eligibility|medicaid|recipient)\b/i, handler: "faq", faqKey: "eligibility" },
  { pattern: /\b(appointment|schedule)\b/i, handler: "faq", faqKey: "appointments" },
];

function detectIntent(message) {
  const m = (message || "").trim();
  for (const intent of INTENTS) {
    if (intent.pattern.test(m)) {
      return intent;
    }
  }
  return null;
}

function extractNoteFromMessage(message) {
  const m = (message || "").trim();
  const colonIdx = m.search(/\s*:\s*/);
  if (colonIdx > 0) {
    const after = m.slice(colonIdx + 1).trim();
    if (after.length > 0) return { notes: after, call_reason: "User request", disposition: "Pending" };
  }
  if (m.length > 10) return { notes: m, call_reason: "User request", disposition: "Pending" };
  return null;
}

function extractReminderFromMessage(message) {
  const m = (message || "").trim();
  const colonIdx = m.search(/\s*:\s*/);
  if (colonIdx > 0) {
    const after = m.slice(colonIdx + 1).trim();
    if (after.length > 0) return { title: after, due_at: new Date().toISOString() };
  }
  const match = m.match(/(?:add|create)\s+reminder\s+(.+)/i);
  if (match) return { title: match[1].trim(), due_at: new Date().toISOString() };
  return null;
}

async function handleMCPIntent(message, userContext, executeToolFn, userId) {
  const intent = detectIntent(message);
  if (!intent) return { matched: false };

  if (intent.handler === "faq") {
    const text = FAQ[intent.faqKey] || FAQ.company;
    return { matched: true, response: text, source: "mcp" };
  }

  if (intent.handler === "tool") {
    const activeClientId = userContext?.activeClientId;
    if (intent.needsClient && !activeClientId) {
      return { matched: true, response: "Please select a client from Profiles first, then I can list appointments or encounters for them.", source: "mcp" };
    }

    let args = {};
    if (intent.tool === "list_appointments" && activeClientId) args = { client_id: activeClientId, limit: 20 };
    else if (intent.tool === "list_encounters" && activeClientId) args = { client_id: activeClientId, limit: 20 };
    else if (intent.tool === "create_note" && intent.extractNote) {
      const extracted = extractNoteFromMessage(message);
      if (!extracted) return { matched: true, response: "To create a note, include the note text after a colon, e.g. 'Create note: Client called about appointment change.'", source: "mcp" };
      args = { ...extracted, client_id: activeClientId || undefined };
    } else if (intent.tool === "add_reminder" && intent.extractReminder) {
      const extracted = extractReminderFromMessage(message);
      if (!extracted) return { matched: true, response: "To add a reminder, include the reminder text, e.g. 'Add reminder: Call client tomorrow.'", source: "mcp" };
      args = extracted;
    }

    try {
      const raw = await executeToolFn(intent.tool, args, userId);
      let parsed;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        parsed = { result: raw };
      }
      if (parsed.error) {
        return { matched: true, response: `Error: ${parsed.error}`, source: "mcp" };
      }
      const formatted = formatToolResult(intent.tool, parsed);
      return { matched: true, response: formatted, source: "mcp" };
    } catch (err) {
      return { matched: true, response: `Error: ${err.message}`, source: "mcp" };
    }
  }

  return { matched: false };
}

function formatToolResult(tool, data) {
  switch (tool) {
    case "get_profile":
      return `You are ${data.full_name || "Unknown"} (role: ${data.role || "client"}).${data.approved_at ? " Account approved." : ""}`;
    case "list_clients":
      if (!Array.isArray(data) || data.length === 0) return "No clients found. Add clients in Profiles.";
      return data.slice(0, 15).map((c) => `- ${c.full_name} (${c.id})`).join("\n");
    case "list_appointments":
      if (!Array.isArray(data) || data.length === 0) return "No appointments found for this client.";
      return data.slice(0, 10).map((a) => `- ${a.title}: ${a.start_at}`).join("\n");
    case "list_encounters":
      if (!Array.isArray(data) || data.length === 0) return "No encounters found for this client.";
      return data.slice(0, 10).map((e) => `- ${e.encounter_date}: ${e.reason || "Visit"}`).join("\n");
    case "create_note":
      return "Note created successfully.";
    case "add_reminder":
      return "Reminder added successfully.";
    default:
      return typeof data === "object" ? JSON.stringify(data) : String(data);
  }
}

module.exports = { detectIntent, handleMCPIntent, FAQ };
