/**
 * Allowlisted outbound SIP dial via LiveKit (requires LIVEKIT_SIP_OUTBOUND_TRUNK_ID).
 */
const { SipClient, RoomServiceClient } = require("livekit-server-sdk");

function buildPresets() {
  const p = {
    ufc833: { e164: "+18334326588", dtmf: "1w4" },
    ufc800: { e164: "+18005252395", dtmf: "1w4" },
  };
  const nv = (process.env.NEVADA_MEDICAID_OUTBOUND_E164 || "").trim();
  if (nv) {
    p.nv_medicaid = {
      e164: nv,
      dtmf: (process.env.NEVADA_MEDICAID_SIP_DTMF || "1w4").trim() || undefined,
    };
  }
  return p;
}

function parseAllowlist(presets = buildPresets()) {
  const raw = (process.env.OUTBOUND_DIAL_ALLOWLIST || "").trim();
  const defaults = new Set(["+18334326588", "+18005252395"]);
  Object.values(presets).forEach((pr) => {
    if (pr && pr.e164) defaults.add(pr.e164);
  });
  if (!raw) {
    return defaults;
  }
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function livekitHttpHost() {
  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:"));
    return u.origin;
  } catch {
    return "";
  }
}

function registerTelephonyRoutes(app, { requireAuth, supabaseUrl, supabaseAnonKey }) {
  const { createClient } = require("@supabase/supabase-js");
  const { isCsrUser } = require("./support-queue");

  app.get("/api/telephony/lines", requireAuth, async (req, res) => {
    try {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      if (!(await isCsrUser(sb, req.user.id))) {
        return res.status(403).json({ error: "CSR or supervisor role required" });
      }
      const presets = buildPresets();
      res.json({
        lines: Object.keys(presets),
        configured: !!(process.env.LIVEKIT_SIP_OUTBOUND_TRUNK_ID || "").trim(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/telephony/outbound", requireAuth, async (req, res) => {
    try {
      const line = typeof req.body?.line === "string" ? req.body.line.trim() : "";
      const preset = PRESETS[line];
      if (!preset) {
        return res.status(400).json({
          error: "Invalid line",
          allowed: Object.keys(PRESETS),
        });
      }
      const allow = parseAllowlist();
      if (!allow.has(preset.e164)) {
        return res.status(403).json({ error: "Number not on allowlist (OUTBOUND_DIAL_ALLOWLIST)" });
      }
      const trunkId = (process.env.LIVEKIT_SIP_OUTBOUND_TRUNK_ID || "").trim();
      if (!trunkId) {
        return res.status(503).json({
          error: "LIVEKIT_SIP_OUTBOUND_TRUNK_ID not configured",
          hint: "Create an outbound SIP trunk in LiveKit Cloud Telephony and paste its ID.",
        });
      }
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      if (!(await isCsrUser(sb, req.user.id))) {
        return res.status(403).json({ error: "CSR or supervisor role required" });
      }
      const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
      const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
      const host = livekitHttpHost();
      if (!apiKey || !apiSecret || !host) {
        return res.status(503).json({ error: "LiveKit not configured" });
      }
      const roomName = `pstn-out-${req.user.id}-${Date.now()}`;
      const roomService = new RoomServiceClient(host, apiKey, apiSecret);
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 5 * 60,
        maxParticipants: 10,
      });
      const sip = new SipClient(host, apiKey, apiSecret);
      const sipOpts = {
        participantIdentity: `sip-${line}`,
        participantName: `Outbound ${line}`,
        waitUntilAnswered: false,
      };
      if (preset.dtmf) sipOpts.dtmf = preset.dtmf;
      await sip.createSipParticipant(trunkId, preset.e164, roomName, sipOpts);
      res.json({
        roomName,
        line,
        dialed: preset.e164,
      });
    } catch (err) {
      console.error("telephony outbound:", err);
      res.status(500).json({ error: err.message || "outbound failed" });
    }
  });
}

module.exports = { registerTelephonyRoutes, buildPresets };
