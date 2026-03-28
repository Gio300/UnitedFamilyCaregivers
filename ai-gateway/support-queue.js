/**
 * Support call queue API handlers (Supabase RLS + user JWT).
 */
const { createClient } = require("@supabase/supabase-js");

function userSupabase(req, supabaseUrl, supabaseAnonKey) {
  const auth = req.headers.authorization;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: auth ? { Authorization: auth } : {} },
  });
}

async function isCsrUser(sb, userId) {
  const { data: p, error } = await sb.from("profiles").select("role").eq("id", userId).single();
  if (error || !p) return false;
  return p.role === "csr_admin" || p.role === "management_admin";
}

function registerSupportQueueRoutes(app, { requireAuth, supabaseUrl, supabaseAnonKey }) {
  app.post("/api/support-queue/enqueue", requireAuth, async (req, res) => {
    try {
      const roomName =
        typeof req.body?.roomName === "string" ? req.body.roomName.trim() : "";
      if (!roomName) {
        return res.status(400).json({ error: "roomName required" });
      }
      const prefix = `cs-voice-${req.user.id}-`;
      if (!roomName.startsWith(prefix)) {
        return res.status(403).json({ error: "roomName must be your cs-voice session" });
      }
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      const { data, error } = await sb
        .from("support_call_queue")
        .insert({
          room_name: roomName,
          caller_user_id: req.user.id,
          status: "waiting",
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: existing } = await sb
            .from("support_call_queue")
            .select("*")
            .eq("room_name", roomName)
            .in("status", ["waiting", "claimed"])
            .maybeSingle();
          if (existing) return res.json({ row: existing, duplicate: true });
        }
        console.error("support-queue enqueue:", error);
        return res.status(400).json({ error: error.message });
      }
      res.json({ row: data });
    } catch (err) {
      console.error("support-queue enqueue:", err);
      res.status(500).json({ error: err.message || "enqueue failed" });
    }
  });

  app.get("/api/support-queue/waiting", requireAuth, async (req, res) => {
    try {
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      if (!(await isCsrUser(sb, req.user.id))) {
        return res.status(403).json({ error: "CSR or supervisor role required" });
      }
      const nowIso = new Date().toISOString();
      const { data, error } = await sb
        .from("support_call_queue")
        .select("id, room_name, caller_user_id, status, created_at, expires_at")
        .eq("status", "waiting")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("support-queue waiting:", error);
        return res.status(400).json({ error: error.message });
      }
      res.json({ rows: data || [] });
    } catch (err) {
      console.error("support-queue waiting:", err);
      res.status(500).json({ error: err.message || "waiting failed" });
    }
  });

  app.post("/api/support-queue/claim", requireAuth, async (req, res) => {
    try {
      const id = req.body?.id;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "id required" });
      }
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      if (!(await isCsrUser(sb, req.user.id))) {
        return res.status(403).json({ error: "CSR or supervisor role required" });
      }
      const nowIso = new Date().toISOString();
      const { data, error } = await sb
        .from("support_call_queue")
        .update({
          status: "claimed",
          claimed_by: req.user.id,
          claimed_at: nowIso,
        })
        .eq("id", id)
        .eq("status", "waiting")
        .gt("expires_at", nowIso)
        .select()
        .maybeSingle();
      if (error) {
        console.error("support-queue claim:", error);
        return res.status(400).json({ error: error.message });
      }
      if (!data) {
        return res.status(409).json({ error: "Queue entry not available" });
      }
      res.json({ row: data });
    } catch (err) {
      console.error("support-queue claim:", err);
      res.status(500).json({ error: err.message || "claim failed" });
    }
  });

  app.post("/api/support-queue/complete", requireAuth, async (req, res) => {
    try {
      const id = req.body?.id;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "id required" });
      }
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      const { data, error } = await sb
        .from("support_call_queue")
        .update({ status: "completed" })
        .eq("id", id)
        .eq("claimed_by", req.user.id)
        .eq("status", "claimed")
        .select()
        .single();
      if (error) {
        console.error("support-queue complete:", error);
        return res.status(400).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: "Not found or not yours" });
      }
      res.json({ row: data });
    } catch (err) {
      console.error("support-queue complete:", err);
      res.status(500).json({ error: err.message || "complete failed" });
    }
  });

  app.post("/api/support-queue/abandon", requireAuth, async (req, res) => {
    try {
      const roomName =
        typeof req.body?.roomName === "string" ? req.body.roomName.trim() : "";
      if (!roomName) {
        return res.status(400).json({ error: "roomName required" });
      }
      const prefix = `cs-voice-${req.user.id}-`;
      if (!roomName.startsWith(prefix)) {
        return res.status(403).json({ error: "not your room" });
      }
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      const { data, error } = await sb
        .from("support_call_queue")
        .update({ status: "abandoned" })
        .eq("room_name", roomName)
        .eq("caller_user_id", req.user.id)
        .in("status", ["waiting", "claimed"])
        .select()
        .single();
      if (error) {
        console.error("support-queue abandon:", error);
        return res.status(400).json({ error: error.message });
      }
      res.json({ row: data || null });
    } catch (err) {
      console.error("support-queue abandon:", err);
      res.status(500).json({ error: err.message || "abandon failed" });
    }
  });

  app.get("/api/support-queue/caller-status", requireAuth, async (req, res) => {
    try {
      const roomName =
        typeof req.query.roomName === "string" ? req.query.roomName.trim() : "";
      if (!roomName) {
        return res.status(400).json({ error: "roomName query required" });
      }
      const prefix = `cs-voice-${req.user.id}-`;
      if (!roomName.startsWith(prefix)) {
        return res.status(403).json({ error: "not your room" });
      }
      const sb = userSupabase(req, supabaseUrl, supabaseAnonKey);
      const { data, error } = await sb
        .from("support_call_queue")
        .select("id, room_name, status, claimed_by, claimed_at, expires_at")
        .eq("room_name", roomName)
        .eq("caller_user_id", req.user.id)
        .in("status", ["waiting", "claimed"])
        .maybeSingle();
      if (error) {
        console.error("support-queue caller-status:", error);
        return res.status(400).json({ error: error.message });
      }
      res.json({ row: data || null });
    } catch (err) {
      console.error("support-queue caller-status:", err);
      res.status(500).json({ error: err.message || "caller-status failed" });
    }
  });
}

module.exports = { registerSupportQueueRoutes, userSupabase, isCsrUser };
