/**
 * Developer-only routes (DEVELOPER_ALLOW_EMAILS and/or developer_allowlist table + SUPABASE_SERVICE_ROLE_KEY).
 */
function parseDevEmails() {
  const raw = (process.env.DEVELOPER_ALLOW_EMAILS || "").toLowerCase();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function registerDeveloperRoutes(app, { requireAuth, supabaseUrl }) {
  const { createClient } = require("@supabase/supabase-js");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  async function requireDeveloperAsync(req, res, next) {
    const email = (req.user?.email || "").toLowerCase();
    if (!email) {
      return res.status(403).json({ error: "Developer access only" });
    }
    if (parseDevEmails().has(email)) {
      return next();
    }
    if (!serviceKey || !supabaseUrl) {
      return res.status(403).json({ error: "Developer access only" });
    }
    try {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data, error } = await admin.from("developer_allowlist").select("email").eq("email", email).maybeSingle();
      if (error) {
        console.warn("developer_allowlist:", error.message);
        return res.status(403).json({ error: "Developer access only" });
      }
      if (!data) {
        return res.status(403).json({ error: "Developer access only" });
      }
      return next();
    } catch (err) {
      console.warn("requireDeveloperAsync:", err);
      return res.status(403).json({ error: "Developer access only" });
    }
  }

  app.get("/api/dev/status", requireAuth, requireDeveloperAsync, (req, res) => {
    res.json({
      ok: true,
      telephonyTrunk: !!(process.env.LIVEKIT_SIP_OUTBOUND_TRUNK_ID || "").trim(),
      serviceRole: !!serviceKey,
      developerEmailsConfigured: parseDevEmails().size,
    });
  });

  app.get("/api/dev/profiles", requireAuth, requireDeveloperAsync, async (req, res) => {
    try {
      if (!serviceKey || !supabaseUrl) {
        return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY required for this endpoint" });
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "80"), 10) || 80));
      const { data, error } = await admin
        .from("profiles")
        .select("id, full_name, role, approved_at, account_disabled, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ profiles: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dev/profile-approve", requireAuth, requireDeveloperAsync, async (req, res) => {
    try {
      if (!serviceKey || !supabaseUrl) {
        return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY required" });
      }
      const userId = req.body?.userId;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId required" });
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const { error } = await admin
        .from("profiles")
        .update({ approved_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dev/profile-disabled", requireAuth, requireDeveloperAsync, async (req, res) => {
    try {
      if (!serviceKey || !supabaseUrl) {
        return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY required" });
      }
      const userId = req.body?.userId;
      const disabled = !!req.body?.disabled;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId required" });
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const { error } = await admin.from("profiles").update({ account_disabled: disabled }).eq("id", userId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true, disabled });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dev/allow-email", requireAuth, requireDeveloperAsync, async (req, res) => {
    try {
      if (!serviceKey || !supabaseUrl) {
        return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY required" });
      }
      const email = (req.body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "valid email required" });
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const { error } = await admin.from("developer_allowlist").upsert(
        { email, created_by: req.user.id },
        { onConflict: "email" }
      );
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true, email });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerDeveloperRoutes, parseDevEmails };
