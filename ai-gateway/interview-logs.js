/**
 * Persist eligibility / interview call notes (RLS on table).
 */
const ollama = require("./ollama");

function registerInterviewLogRoutes(app, { requireAuth, supabaseUrl, supabaseAnonKey }) {
  const { createClient } = require("@supabase/supabase-js");

  app.post("/api/interview-logs", requireAuth, async (req, res) => {
    try {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      const body = req.body || {};
      const row = {
        user_id: req.user.id,
        role: typeof body.role === "string" ? body.role.slice(0, 64) : null,
        client_id: body.client_id || null,
        call_type: typeof body.call_type === "string" ? body.call_type.slice(0, 120) : "eligibility_medicaid",
        room_name: typeof body.room_name === "string" ? body.room_name.slice(0, 200) : null,
        raw_notes: typeof body.raw_notes === "string" ? body.raw_notes.slice(0, 12000) : "",
        outcome: ["approved", "denied", "unknown"].includes(body.outcome) ? body.outcome : null,
        structured: body.structured && typeof body.structured === "object" ? body.structured : {},
      };
      if (!row.raw_notes.trim()) {
        return res.status(400).json({ error: "raw_notes required" });
      }
      const { data, error } = await sb.from("interview_call_logs").insert(row).select("id").single();
      if (error) return res.status(400).json({ error: error.message });
      res.json({ id: data.id });
    } catch (err) {
      console.error("interview-logs POST:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/interview-logs", requireAuth, async (req, res) => {
    try {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "30"), 10) || 30));
      const { data, error } = await sb
        .from("interview_call_logs")
        .select("id, user_id, role, client_id, call_type, room_name, raw_notes, ai_summary, outcome, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ logs: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/interview-logs/summarize", requireAuth, async (req, res) => {
    try {
      const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";
      if (!id) {
        return res.status(400).json({ error: "id required" });
      }
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      const { data: row, error: fetchErr } = await sb
        .from("interview_call_logs")
        .select("id, user_id, raw_notes")
        .eq("id", id)
        .single();
      if (fetchErr || !row) {
        return res.status(fetchErr?.code === "PGRST116" ? 404 : 400).json({ error: fetchErr?.message || "not found" });
      }
      if (row.user_id !== req.user.id) {
        return res.status(403).json({ error: "Only the author can request AI summary for this log" });
      }
      const raw = typeof row.raw_notes === "string" ? row.raw_notes : "";
      if (!raw.trim()) {
        return res.status(400).json({ error: "raw_notes empty" });
      }
      const summary = await ollama.summarizeInterviewRawNotes(raw);
      const { error: upErr } = await sb.from("interview_call_logs").update({ ai_summary: summary }).eq("id", id);
      if (upErr) return res.status(400).json({ error: upErr.message });
      res.json({ ok: true, ai_summary: summary });
    } catch (err) {
      console.error("interview-logs summarize:", err);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerInterviewLogRoutes };
