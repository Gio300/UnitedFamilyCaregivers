/**
 * MCP-style tools for AI Gateway - Ollama tool calling format.
 * Tools call Supabase with user JWT for RLS.
 */

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_profile",
      description: "Get the current user's profile (full_name, role, etc.)",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_profile",
      description: "Update the current user's profile. Use for changing full_name.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Full name to set" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a call note with call_reason, disposition, and notes. Optionally link to a client when activeClientId is set.",
      parameters: {
        type: "object",
        properties: {
          call_reason: { type: "string", description: "Brief reason for the call" },
          disposition: { type: "string", description: "Outcome (e.g. Resolved, Pending)" },
          notes: { type: "string", description: "Full details of the call" },
          client_id: { type: "string", description: "Client profile UUID (optional)" },
        },
        required: ["notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_encounter",
      description: "Create a care visit (encounter) for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          encounter_date: { type: "string", description: "Date (YYYY-MM-DD)" },
          encounter_time: { type: "string", description: "Time (HH:MM) optional" },
          reason: { type: "string", description: "Reason for visit" },
          notes: { type: "string", description: "Visit notes" },
          status: { type: "string", description: "scheduled, in_progress, completed, cancelled" },
        },
        required: ["client_id", "encounter_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_encounters",
      description: "List encounters (care visits) for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_clinical_note",
      description: "Create a SOAP note (subjective, objective, assessment, plan) for an encounter",
      parameters: {
        type: "object",
        properties: {
          encounter_id: { type: "string", description: "Encounter UUID" },
          subjective: { type: "string", description: "Subjective" },
          objective: { type: "string", description: "Objective" },
          assessment: { type: "string", description: "Assessment" },
          plan: { type: "string", description: "Plan" },
        },
        required: ["encounter_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Schedule an appointment for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          title: { type: "string", description: "Appointment title" },
          start_at: { type: "string", description: "ISO date/time" },
          duration_minutes: { type: "number", description: "Duration in minutes" },
          notes: { type: "string", description: "Appointment notes" },
          caregiver_id: { type: "string", description: "Caregiver user UUID (optional)" },
        },
        required: ["client_id", "title", "start_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_appointments",
      description: "List appointments for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          from_date: { type: "string", description: "From date (YYYY-MM-DD) optional" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_medication",
      description: "Add a medication to a client's list",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          name: { type: "string", description: "Medication name" },
          dosage: { type: "string", description: "Dosage" },
          instructions: { type: "string", description: "Instructions" },
        },
        required: ["client_id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_medications",
      description: "List medications for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_allergy",
      description: "Add an allergy to a client's list",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          allergen: { type: "string", description: "Allergen name" },
          reaction: { type: "string", description: "Reaction" },
          severity: { type: "string", description: "Severity" },
        },
        required: ["client_id", "allergen"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_allergies",
      description: "List allergies for a client",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_vitals",
      description: "Record vitals for a client (weight, BP, pulse)",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "Client profile UUID" },
          weight_lbs: { type: "number", description: "Weight in lbs" },
          bp_systolic: { type: "number", description: "Systolic BP" },
          bp_diastolic: { type: "number", description: "Diastolic BP" },
          pulse: { type: "number", description: "Pulse" },
          notes: { type: "string", description: "Notes" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_reminder",
      description: "Add a reminder for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Reminder title" },
          due_at: { type: "string", description: "ISO date/time when due (optional)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "List clients linked to the current user (for caregivers)",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_eligibility",
      description: "Check Nevada Medicaid eligibility for a client. Requires lastName, firstName, dob, and either recipientId or ssn.",
      parameters: {
        type: "object",
        properties: {
          lastName: { type: "string", description: "Client last name" },
          firstName: { type: "string", description: "Client first name" },
          dob: { type: "string", description: "Date of birth (MM/DD/YYYY)" },
          recipientId: { type: "string", description: "Medicaid recipient ID (optional if ssn provided)" },
          ssn: { type: "string", description: "Social Security Number (optional if recipientId provided)" },
          effectiveFrom: { type: "string", description: "Effective date for check (optional)" },
        },
        required: ["lastName", "firstName", "dob"],
      },
    },
  },
];

async function executeTool(name, args, supabase, userId, userContext = {}) {
  const activeClientId = userContext?.activeClientId;
  switch (name) {
    case "get_profile": {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || {});
    }
    case "update_profile": {
      const { full_name } = args || {};
      if (!full_name) return JSON.stringify({ error: "full_name required" });
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { updated: true });
    }
    case "create_note": {
      const { call_reason, disposition, notes, client_id } = args || {};
      const clientId = client_id || activeClientId || null;
      const { data, error } = await supabase
        .from("call_notes")
        .insert({ user_id: userId, client_id: clientId, call_reason: call_reason || null, disposition: disposition || null, notes: notes || "" })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "add_reminder": {
      const { title, due_at } = args || {};
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          creator_id: userId,
          target_user_id: userId,
          text: title || "Reminder",
          remind_at: due_at || new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "list_clients": {
      const { data, error } = await supabase.from("client_profiles").select("*");
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || []);
    }
    case "check_eligibility": {
      const { lastName, firstName, dob, recipientId, ssn, effectiveFrom } = args || {};
      if (!lastName || !firstName || !dob) {
        return JSON.stringify({ error: "lastName, firstName, and dob are required" });
      }
      if (!recipientId && !ssn) {
        return JSON.stringify({ error: "Either recipientId or ssn is required" });
      }
      try {
        const eligibility = require("./eligibility");
        const result = await eligibility.checkEligibility({
          lastName,
          firstName,
          dob,
          effectiveFrom,
          recipientId,
          ssn,
        });
        return JSON.stringify(result);
      } catch (e) {
        return JSON.stringify({ success: false, error: e.message, humanFallbackRequired: true });
      }
    }
    case "create_encounter": {
      const { client_id, encounter_date, encounter_time, reason, notes, status } = args || {};
      if (!client_id || !encounter_date) return JSON.stringify({ error: "client_id and encounter_date required" });
      const { data, error } = await supabase
        .from("encounters")
        .insert({
          client_id,
          caregiver_id: userId,
          encounter_date,
          encounter_time: encounter_time || null,
          reason: reason || null,
          notes: notes || null,
          status: status || "scheduled",
        })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "list_encounters": {
      const { client_id, limit } = args || {};
      if (!client_id) return JSON.stringify({ error: "client_id required" });
      let q = supabase.from("encounters").select("*").eq("client_id", client_id).order("encounter_date", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || []);
    }
    case "create_clinical_note": {
      const { encounter_id, subjective, objective, assessment, plan } = args || {};
      if (!encounter_id) return JSON.stringify({ error: "encounter_id required" });
      const { data, error } = await supabase
        .from("clinical_notes")
        .insert({ encounter_id, user_id: userId, subjective: subjective || null, objective: objective || null, assessment: assessment || null, plan: plan || null })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "create_appointment": {
      const { client_id, title, start_at, duration_minutes, notes, caregiver_id } = args || {};
      if (!client_id || !title || !start_at) return JSON.stringify({ error: "client_id, title, and start_at required" });
      const start = new Date(start_at);
      const end = duration_minutes ? new Date(start.getTime() + duration_minutes * 60000).toISOString() : null;
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          client_id,
          caregiver_id: caregiver_id || null,
          title,
          start_at: start_at,
          end_at: end,
          duration_minutes: duration_minutes || 60,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "list_appointments": {
      const { client_id, from_date, limit } = args || {};
      if (!client_id) return JSON.stringify({ error: "client_id required" });
      let q = supabase.from("appointments").select("*").eq("client_id", client_id).order("start_at", { ascending: true });
      if (from_date) q = q.gte("start_at", from_date);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || []);
    }
    case "add_medication": {
      const { client_id, name, dosage, instructions } = args || {};
      if (!client_id || !name) return JSON.stringify({ error: "client_id and name required" });
      const { data, error } = await supabase
        .from("client_medications")
        .insert({ client_id, name, dosage: dosage || null, instructions: instructions || null })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "list_medications": {
      const { client_id } = args || {};
      if (!client_id) return JSON.stringify({ error: "client_id required" });
      const { data, error } = await supabase.from("client_medications").select("*").eq("client_id", client_id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || []);
    }
    case "add_allergy": {
      const { client_id, allergen, reaction, severity } = args || {};
      if (!client_id || !allergen) return JSON.stringify({ error: "client_id and allergen required" });
      const { data, error } = await supabase
        .from("client_allergies")
        .insert({ client_id, allergen, reaction: reaction || null, severity: severity || null })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    case "list_allergies": {
      const { client_id } = args || {};
      if (!client_id) return JSON.stringify({ error: "client_id required" });
      const { data, error } = await supabase.from("client_allergies").select("*").eq("client_id", client_id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || []);
    }
    case "record_vitals": {
      const { client_id, weight_lbs, bp_systolic, bp_diastolic, pulse, notes } = args || {};
      if (!client_id) return JSON.stringify({ error: "client_id required" });
      const { data, error } = await supabase
        .from("client_vitals")
        .insert({
          client_id,
          recorded_by: userId,
          weight_lbs: weight_lbs ?? null,
          bp_systolic: bp_systolic ?? null,
          bp_diastolic: bp_diastolic ?? null,
          pulse: pulse ?? null,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data || { created: true });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
