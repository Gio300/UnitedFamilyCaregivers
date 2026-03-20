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
      description: "Create a call note with call_reason, disposition, and notes",
      parameters: {
        type: "object",
        properties: {
          call_reason: { type: "string", description: "Brief reason for the call" },
          disposition: { type: "string", description: "Outcome (e.g. Resolved, Pending)" },
          notes: { type: "string", description: "Full details of the call" },
        },
        required: ["notes"],
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
];

async function executeTool(name, args, supabase, userId) {
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
      const { call_reason, disposition, notes } = args || {};
      const { data, error } = await supabase
        .from("call_notes")
        .insert({ user_id: userId, call_reason: call_reason || null, disposition: disposition || null, notes: notes || "" })
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
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
