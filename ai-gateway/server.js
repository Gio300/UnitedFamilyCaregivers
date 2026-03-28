const path = require("path");
const shellPort = process.env.PORT;
const shellHost = process.env.HOST;
// Load ai-gateway/.env from this package (not process.cwd()) so keys are found when cwd differs.
// override: true so placeholder LIVEKIT_* from the parent shell cannot mask real values in .env.
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});
if (shellPort !== undefined) process.env.PORT = shellPort;
if (shellHost !== undefined) process.env.HOST = shellHost;
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
const ollama = require("./ollama");
const { TOOL_DEFINITIONS, executeTool } = require("./tools");
const { handleMCPIntent } = require("./mcp-rules");
const { handleMcpFlow, emptyContext, parseControlMessage } = require("./mcp-flow");

const PORT = process.env.PORT || 7501;
const HOST = process.env.HOST || "0.0.0.0";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const app = express();
const allowedOrigins = [
  "https://gio300.github.io",
  "http://localhost:7500",
  "http://127.0.0.1:7500",
  "http://localhost:7503",
  "http://127.0.0.1:7503",
  "http://localhost:7512",
  "http://127.0.0.1:7512",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/[^.]+\.github\.io$/.test(origin)) {
      cb(null, origin || true);
    } else {
      cb(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
}));
app.options("*", (req, res) => res.sendStatus(204));
app.use(express.json());

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization required" });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

const { registerSupportQueueRoutes, isCsrUser } = require("./support-queue");
const { registerTelephonyRoutes } = require("./telephony");
if (supabaseUrl && supabaseAnonKey) {
  registerSupportQueueRoutes(app, { requireAuth, supabaseUrl, supabaseAnonKey });
  registerTelephonyRoutes(app, { requireAuth, supabaseUrl, supabaseAnonKey });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ufc-ai-gateway",
    routes: {
      livekitRoomStatus: true,
      companionGuidance: true,
      companionOrchestrate: true,
      supportQueue: !!(supabaseUrl && supabaseAnonKey),
      telephonyOutbound: !!(process.env.LIVEKIT_SIP_OUTBOUND_TRUNK_ID || "").trim(),
    },
  });
});

app.post("/api/mcp", requireAuth, async (req, res) => {
  try {
    let { message, userContext, flowContext } = req.body;
    if (typeof message !== "string") message = "";
    const flowCtxIn = flowContext && typeof flowContext === "object" ? flowContext : null;
    const hasFlowControl = parseControlMessage(message);
    const flowActive =
      flowCtxIn &&
      flowCtxIn.flowId &&
      !flowCtxIn.completed &&
      (flowCtxIn.stepId || flowCtxIn.awaitingTypedReply);
    if (!message.trim() && !hasFlowControl && !flowActive) {
      return res.status(400).json({ error: "message required" });
    }

    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    });
    const executeToolFn = async (name, args, userId) => {
      return executeTool(name, args, supabaseWithAuth, userId, userContext || {});
    };

    const flowResult = await handleMcpFlow({
      message,
      flowContext: flowCtxIn,
      userContext: userContext || {},
      flowAssist: ollama.flowAssist,
    });
    if (flowResult.handled) {
      return res.json({
        response: flowResult.response,
        source: flowResult.source || "mcp-flow",
        matched: flowResult.matched !== false,
        quickReplies: flowResult.quickReplies || [],
        flowContext: flowResult.flowContext || emptyContext(),
      });
    }

    const result = await handleMCPIntent(message, userContext || {}, executeToolFn, req.user.id);
    if (!result.matched) {
      // No user-facing response: client should call /api/chat (Ollama) for open-ended messages.
      return res.status(200).json({ matched: false, source: "mcp" });
    }
    res.json({
      matched: true,
      response: result.response,
      source: result.source || "mcp",
    });
  } catch (err) {
    console.error("MCP error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/companion-guidance", requireAuth, async (req, res) => {
  try {
    const {
      voiceSnippet = "",
      companionDecisions = "",
      companionSummary = "",
      queueAgentAvailable = null,
      mode = "chat",
      userOnHold = false,
    } = req.body || {};
    const text = await ollama.generateCompanionGuidance({
      voiceSnippet: typeof voiceSnippet === "string" ? voiceSnippet.slice(-2500) : "",
      companionDecisions: typeof companionDecisions === "string" ? companionDecisions.slice(-1200) : "",
      companionSummary: typeof companionSummary === "string" ? companionSummary.slice(-2000) : "",
      queueAgentAvailable,
      mode: typeof mode === "string" ? mode : "chat",
      userOnHold: !!userOnHold,
    });
    res.json({ guidance: text || "You are still on hold. A representative will join as soon as one is available." });
  } catch (err) {
    console.error("companion-guidance error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/companion-orchestrate", requireAuth, async (req, res) => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    const body = req.body || {};
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    });
    const userContext = {
      role: body.role,
      mode: typeof body.mode === "string" ? body.mode : "chat",
      activeClientId: body.activeClientId || undefined,
    };
    const executeToolFn = async (name, args, userId) =>
      executeTool(name, args, supabaseWithAuth, userId, userContext);

    const stepA = await ollama.generateCompanionOrchestrate({
      chatSnippet: typeof body.chatSnippet === "string" ? body.chatSnippet.slice(-2000) : "",
      mode: userContext.mode,
      role: body.role,
      activeClientId: body.activeClientId,
      voiceSnippet: typeof body.voiceSnippet === "string" ? body.voiceSnippet.slice(-2500) : "",
      companionDecisions: typeof body.companionDecisions === "string" ? body.companionDecisions.slice(-1200) : "",
      companionSummary: typeof body.companionSummary === "string" ? body.companionSummary.slice(-2000) : "",
      queueAgentAvailable: body.queueAgentAvailable ?? null,
    });

    let { guidance, actions } = stepA;

    if (stepA.needsMcp && stepA.mcpMessage) {
      const flowResult = await handleMcpFlow({
        message: stepA.mcpMessage,
        flowContext: null,
        userContext,
        flowAssist: ollama.flowAssist,
      });
      let mcpText = "";
      if (flowResult.handled && flowResult.response) {
        mcpText = flowResult.response;
      } else {
        const intent = await handleMCPIntent(stepA.mcpMessage, userContext, executeToolFn, req.user.id);
        if (intent.matched && intent.response) mcpText = intent.response;
      }
      if (mcpText) {
        const refined = await ollama.refineCompanionAfterMcp({
          priorGuidance: guidance,
          priorActions: actions,
          mcpResponseText: mcpText,
        });
        guidance = refined.guidance;
        actions = refined.actions;
      }
    }

    res.json({ guidance, actions, source: "companion-orchestrate" });
  } catch (err) {
    console.error("companion-orchestrate error:", err);
    res.status(500).json({ error: err.message });
  }
});

/** Thin stubs for LiveKit HTTP tools — extend with Supabase writes as needed. */
app.get("/api/voice/onboarding-status", requireAuth, (req, res) => {
  res.json({
    ok: true,
    nextField: "full_name",
    message: "Return profile fields in order; wire to client_profiles when ready.",
  });
});

app.post("/api/voice/onboarding-draft", requireAuth, (req, res) => {
  const fields = req.body && typeof req.body === "object" ? req.body : {};
  res.json({ ok: true, received: Object.keys(fields), stub: true });
});

app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    const { message, history = [], userContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    const wantsStream =
      req.get("Accept") === "text/event-stream" || req.query.stream === "1";
    const useTools = req.query.tools === "1";

    if (wantsStream && !useTools) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      let fullContent = "";
      try {
        fullContent = await ollama.generateStream(
          message,
          history,
          userContext,
          (token) => {
            res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
          }
        );
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      } finally {
        res.end();
      }
      return;
    }

    if (useTools) {
      const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;
      const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      });
      const executeToolFn = async (name, args, userId) => {
        return executeTool(name, args, supabaseWithAuth, userId, req.body.userContext);
      };
      const content = await ollama.generateWithTools(
        message,
        history,
        userContext,
        TOOL_DEFINITIONS,
        executeToolFn,
        req.user.id
      );
      res.json({ content });
      return;
    }

    const content = await ollama.generate(message, history, userContext);
    res.json({ content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function mintLiveKitJwt(req, roomName, { dispatchAgent }) {
  const {
    AccessToken,
    RoomConfiguration,
    RoomAgentDispatch,
  } = require("livekit-server-sdk");
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit not configured");
  }
  const token = new AccessToken(apiKey, apiSecret, {
    identity: req.user.id,
    name: (req.user.email && String(req.user.email).slice(0, 128)) || req.user.id,
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  if (dispatchAgent) {
    const agentName = (process.env.LIVEKIT_AGENT_NAME || "Kloudy").trim();
    if (agentName) {
      token.roomConfig = new RoomConfiguration({
        agents: [
          new RoomAgentDispatch({
            agentName,
            metadata: JSON.stringify({
              source: "customer_support",
              userId: req.user.id,
            }),
          }),
        ],
      });
    }
  }
  return token.toJwt();
}

app.post("/api/livekit/token", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName || typeof roomName !== "string") {
      return res.status(400).json({ error: "roomName required" });
    }
    const name = roomName.trim();
    const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
    const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
    if (!apiKey || !apiSecret) {
      return res.status(503).json({ error: "LiveKit not configured" });
    }

    if (name.startsWith("pstn-out-")) {
      const prefix = `pstn-out-${req.user.id}-`;
      if (!name.startsWith(prefix)) {
        return res.status(403).json({ error: "Invalid outbound room" });
      }
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(503).json({ error: "Supabase not configured" });
      }
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      if (!(await isCsrUser(sb, req.user.id))) {
        return res.status(403).json({ error: "CSR role required for outbound rooms" });
      }
      const jwt = await mintLiveKitJwt(req, name, { dispatchAgent: false });
      return res.json({ token: jwt });
    }

    if (name.startsWith("cs-voice-")) {
      const ownPrefix = `cs-voice-${req.user.id}-`;
      if (!name.startsWith(ownPrefix)) {
        return res.status(403).json({
          error:
            "Not your customer voice room. CSRs must claim the call and use POST /api/livekit/csr-token.",
        });
      }
      const jwt = await mintLiveKitJwt(req, name, { dispatchAgent: true });
      return res.json({ token: jwt });
    }

    const jwt = await mintLiveKitJwt(req, name, { dispatchAgent: false });
    res.json({ token: jwt });
  } catch (err) {
    console.error("LiveKit token error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/livekit/csr-token", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName || typeof roomName !== "string") {
      return res.status(400).json({ error: "roomName required" });
    }
    const name = roomName.trim();
    if (!name.startsWith("cs-voice-")) {
      return res.status(400).json({ error: "Only cs-voice rooms use csr-token" });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.authorization } },
    });
    if (!(await isCsrUser(sb, req.user.id))) {
      return res.status(403).json({ error: "CSR or supervisor role required" });
    }
    const { data: row, error } = await sb
      .from("support_call_queue")
      .select("id")
      .eq("room_name", name)
      .eq("claimed_by", req.user.id)
      .eq("status", "claimed")
      .maybeSingle();
    if (error) {
      console.error("csr-token queue check:", error);
      return res.status(400).json({ error: error.message });
    }
    if (!row) {
      return res.status(403).json({
        error: "Claim this call in the queue first (or it was released).",
      });
    }
    const jwt = await mintLiveKitJwt(req, name, { dispatchAgent: false });
    res.json({ token: jwt });
  } catch (err) {
    console.error("LiveKit csr-token error:", err);
    res.status(500).json({ error: err.message });
  }
});

function livekitRoomServiceHost() {
  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(
      raw.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:")
    );
    return u.origin;
  } catch {
    return "";
  }
}

const LK_KIND = {
  0: "STANDARD",
  1: "INGRESS",
  2: "EGRESS",
  3: "SIP",
  4: "AGENT",
  7: "CONNECTOR",
  8: "BRIDGE",
};
const LK_STATE = {
  0: "JOINING",
  1: "JOINED",
  2: "ACTIVE",
  3: "DISCONNECTED",
};
const LK_TRACK_TYPE = { 0: "AUDIO", 1: "VIDEO", 2: "DATA" };
const LK_TRACK_SOURCE = {
  0: "UNKNOWN",
  1: "CAMERA",
  2: "MICROPHONE",
  3: "SCREEN_SHARE",
  4: "SCREEN_SHARE_AUDIO",
};

function serializeParticipant(p) {
  const tracks = Array.isArray(p.tracks) ? p.tracks : [];
  const stateNum = Number(p.state);
  const kindNum = Number(p.kind);
  return {
    identity: p.identity || "",
    name: p.name || "",
    state: LK_STATE[stateNum] ?? String(p.state),
    kind: LK_KIND[kindNum] ?? String(p.kind),
    isPublisher: !!p.isPublisher,
    tracks: tracks.map((t) => {
      const typeNum = Number(t.type);
      const srcNum = Number(t.source);
      return {
        sid: t.sid || "",
        type: LK_TRACK_TYPE[typeNum] ?? String(t.type),
        name: t.name || "",
        muted: !!t.muted,
        source: LK_TRACK_SOURCE[srcNum] ?? String(t.source),
      };
    }),
    audioPublished: tracks.some((t) => Number(t.type) === 0 && !t.muted),
    audioPublishedIncludingMuted: tracks.some((t) => Number(t.type) === 0),
  };
}

/** Room Service snapshot: who is in the room and whether they publish audio (debug hearing issues). */
app.get("/api/livekit/room-status", requireAuth, async (req, res) => {
  try {
    const roomName =
      typeof req.query.roomName === "string" ? req.query.roomName.trim() : "";
    if (!roomName) {
      return res.status(400).json({ error: "roomName query parameter required" });
    }
    const ownCs = `cs-voice-${req.user.id}-`;
    let allowed = false;
    if (roomName.startsWith(ownCs)) {
      allowed = true;
    } else if (roomName.startsWith("cs-voice-") && supabaseUrl && supabaseAnonKey) {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.authorization } },
      });
      const { data: row } = await sb
        .from("support_call_queue")
        .select("id")
        .eq("room_name", roomName)
        .eq("claimed_by", req.user.id)
        .eq("status", "claimed")
        .maybeSingle();
      if (row) allowed = true;
    } else if (roomName.startsWith("pstn-out-")) {
      const prefix = `pstn-out-${req.user.id}-`;
      if (roomName.startsWith(prefix) && supabaseUrl && supabaseAnonKey) {
        const sb = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: req.headers.authorization } },
        });
        if (await isCsrUser(sb, req.user.id)) allowed = true;
      }
    }
    if (!allowed) {
      return res.status(403).json({ error: "room not allowed for this user" });
    }
    const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
    const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
    const host = livekitRoomServiceHost();
    if (!apiKey || !apiSecret || !host) {
      return res.status(503).json({
        error: "LiveKit Room Service not configured",
        hint: "Set LIVEKIT_URL (wss://…), LIVEKIT_API_KEY, LIVEKIT_API_SECRET in ai-gateway/.env",
      });
    }
    const { RoomServiceClient } = require("livekit-server-sdk");
    const client = new RoomServiceClient(host, apiKey, apiSecret);
    let participants;
    try {
      participants = await client.listParticipants(roomName);
    } catch (e) {
      const msg = e && e.message ? String(e.message) : "listParticipants failed";
      if (/not found|404|does not exist/i.test(msg)) {
        return res.json({
          roomName,
          exists: false,
          participantCount: 0,
          participants: [],
          summary:
            "Room not found (empty or ended). Start a voice session first.",
        });
      }
      throw e;
    }
    const list = (participants || []).map(serializeParticipant);
    const agents = list.filter((x) => x.kind === "AGENT");
    const agentAudio = agents.some((a) => a.audioPublished);
    const agentAnyAudioTrack = agents.some((a) => a.audioPublishedIncludingMuted);
    return res.json({
      roomName,
      exists: true,
      participantCount: list.length,
      participants: list,
      summary: {
        agentParticipantCount: agents.length,
        agentHasUnmutedAudioTrack: agentAudio,
        agentHasAudioTrack: agentAnyAudioTrack,
        interpretation: agentAudio
          ? "LiveKit sees an agent publishing unmuted audio; if you hear nothing, check browser output device, tab mute, and RDP audio."
          : agentAnyAudioTrack
            ? "Agent has an audio track but it is muted in the server view."
            : agents.length === 0
              ? "No AGENT-kind participant in this room yet (worker may still be joining)."
              : "Agent is present but no audio track is published yet (pipeline still starting or failed).",
      },
    });
  } catch (err) {
    console.error("LiveKit room-status error:", err);
    res.status(500).json({ error: err.message || "room-status failed" });
  }
});

const eligibility = require("./eligibility");

app.get("/api/eligibility/totp", requireAuth, (req, res) => {
  try {
    const code = eligibility.getTotpCode();
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "TOTP not configured. Set NEVADA_MEDICAID_TOTP_SECRET in .env and install otplib.",
      });
    }
    res.json({ success: true, code });
  } catch (err) {
    console.error("TOTP error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/eligibility/open-portal", requireAuth, async (req, res) => {
  try {
    const result = await eligibility.openPortal();
    res.json(result);
  } catch (err) {
    console.error("Open portal error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/eligibility/check", requireAuth, async (req, res) => {
  try {
    const { lastName, firstName, dob, effectiveFrom, recipientId, ssn } = req.body;
    if (!lastName || !firstName || !dob) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: lastName, firstName, dob",
      });
    }
    if (!recipientId && !ssn) {
      return res.status(400).json({
        success: false,
        error: "Either recipientId or ssn is required",
      });
    }
    const result = await eligibility.checkEligibility({
      lastName,
      firstName,
      dob,
      effectiveFrom,
      recipientId,
      ssn,
    });
    res.json(result);
  } catch (err) {
    console.error("Eligibility check error:", err);
    res.status(500).json({ success: false, error: err.message, humanFallbackRequired: true });
  }
});

app.post("/api/activity/auto-note", requireAuth, async (req, res) => {
  try {
    const { items, clientId, userId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array required" });
    }

    const summary = await ollama.generateActivitySummary(items);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: req.headers.authorization
          ? { Authorization: req.headers.authorization }
          : {},
      },
    });

    const { data: noteRow, error: noteErr } = await supabase
      .from("call_notes")
      .insert({
        user_id: req.user.id,
        client_id: clientId || null,
        call_reason: "Profile activity auto-note",
        disposition: "Completed",
        notes: summary,
      })
      .select("id")
      .single();

    if (noteErr) {
      return res.status(500).json({ error: noteErr.message });
    }

    const ids = items.map((i) => i.id);
    await supabase
      .from("activity_log")
      .update({ noted_at: new Date().toISOString() })
      .in("id", ids);

    res.json({ noted: ids, callNoteId: noteRow?.id });
  } catch (err) {
    console.error("Auto-note error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/auto-respond", requireAuth, async (req, res) => {
  try {
    const { item_type, item_id } = req.body;
    if (!item_type || !item_id) {
      return res.status(400).json({ error: "item_type and item_id required" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {} },
    });

    const { data: existing } = await supabase
      .from("message_auto_responses")
      .select("needs_human, ai_response, sent_at")
      .eq("item_type", item_type)
      .eq("item_id", item_id)
      .single();

    if (existing) {
      return res.json({
        needs_human: !!existing.needs_human,
        sent: !!existing.sent_at,
        response: existing.ai_response,
      });
    }

    let messageContent = "";
    let customerName = "";

    if (item_type === "incoming_email") {
      const { data: row, error } = await supabase
        .from("incoming_emails")
        .select("body, subject, from_email")
        .eq("id", item_id)
        .single();
      if (!error && row) {
        messageContent = (row.body || row.subject || "").trim();
        customerName = row.from_email || "";
      }
    } else if (item_type === "sent_message") {
      const { data: row, error } = await supabase
        .from("sent_messages")
        .select("body, subject, recipient_email")
        .eq("id", item_id)
        .single();
      if (!error && row) {
        messageContent = (row.body || row.subject || "").trim();
        customerName = row.recipient_email || "";
      }
    } else if (item_type === "call_note") {
      const { data: row, error } = await supabase
        .from("call_notes")
        .select("notes, call_reason")
        .eq("id", item_id)
        .single();
      if (!error && row) {
        messageContent = (row.notes || row.call_reason || "").trim();
      }
    }

    if (!messageContent) {
      return res.status(404).json({ error: "Message not found" });
    }

    let result;
    try {
      result = await ollama.generateAutoResponse(messageContent, item_type, customerName);
    } catch (aiErr) {
      const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {} },
      });
      const executeToolFn = async (name, args, userId) => {
        return executeTool(name, args, supabaseWithAuth, userId, {});
      };
      const mcpResult = await handleMCPIntent(messageContent, {}, executeToolFn, req.user.id);
      if (mcpResult.matched) {
        result = { response: mcpResult.response, needs_human: false };
      } else {
        result = { response: "AI drafting wasn't available. Please reply manually or try again shortly.", needs_human: true };
      }
    }

    await supabase.from("message_auto_responses").upsert(
      {
        item_type,
        item_id,
        ai_response: result.response,
        needs_human: result.needs_human,
        sent_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "item_type,item_id" }
    );

    return res.json({ needs_human: result.needs_human, sent: false, response: result.response });
  } catch (err) {
    console.error("Auto-respond error:", err);
    res.status(500).json({ error: err.message });
  }
});

function getEmailTransporter() {
  const host = process.env.MESSAGING_SMTP_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.MESSAGING_SMTP_PORT || process.env.SMTP_PORT || "587", 10);
  const user = process.env.MESSAGING_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.MESSAGING_SMTP_PASS || process.env.SMTP_PASS;
  const secure = (process.env.MESSAGING_SMTP_SECURE || "tls").toLowerCase() === "ssl";
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

app.post("/api/email/send", requireAuth, async (req, res) => {
  try {
    const { client_id, recipient_email, subject, body, sender_name } = req.body;
    if (!recipient_email || !body) {
      return res.status(400).json({ error: "recipient_email and body required" });
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      return res.status(503).json({
        error: "Email not configured. Set MESSAGING_SMTP_HOST, MESSAGING_SMTP_USER, MESSAGING_SMTP_PASS in ai-gateway/.env",
      });
    }

    const fromAddr = process.env.MESSAGING_FROM_EMAIL || process.env.MESSAGING_SMTP_USER || "noreply@ufc.local";
    const fromName = sender_name || process.env.MESSAGING_FROM_NAME || "United Family Caregivers";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: recipient_email,
      subject: subject || "(No subject)",
      text: body,
      html: (body || "").replace(/\n/g, "<br>"),
    });

    if (supabaseUrl && supabaseAnonKey && client_id) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {} },
      });
      const { error } = await supabase.from("sent_messages").insert({
        client_id,
        sender_user_id: req.user?.id || null,
        sender_name: sender_name || null,
        recipient_email,
        subject: subject || null,
        body,
      });
      if (error) console.warn("Sent message insert failed:", error.message);
    }

    res.json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
});

app.post("/api/notes/extract", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text required" });
    }

    const result = await ollama.extractCallNoteFromText(text);
    res.json(result);
  } catch (err) {
    console.error("Notes extract error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    // #region agent log
    try {
      const fs = require("fs");
      fs.appendFileSync(
        path.join(__dirname, "..", "..", "debug-ad0a97.log"),
        JSON.stringify({
          sessionId: "ad0a97",
          location: "server.js:api404",
          message: "unmatched_api_route",
          data: {
            hypothesisId: "H1",
            method: req.method,
            path: req.path,
          },
          timestamp: Date.now(),
          runId: "pre",
        }) + "\n"
      );
    } catch (_) {}
    // #endregion
    return res.status(404).json({ error: "Not found", path: req.path });
  }
  res.status(404).type("text").send("Not found");
});

app.listen(PORT, HOST, () => {
  console.log(`AI Gateway running at http://${HOST}:${PORT}`);
  // #region agent log
  try {
    const fs = require("fs");
    fs.appendFileSync(
      path.join(__dirname, "..", "..", "debug-ad0a97.log"),
      JSON.stringify({
        sessionId: "ad0a97",
        location: "server.js:listen",
        message: "gateway_boot",
        data: {
          hypothesisId: "H1",
          port: PORT,
          host: HOST,
          hasLivekitRoomStatusRoute: true,
        },
        timestamp: Date.now(),
        runId: "pre",
      }) + "\n"
    );
  } catch (_) {}
  // #endregion
});
