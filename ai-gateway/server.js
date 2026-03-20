require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const ollama = require("./ollama");
const { TOOL_DEFINITIONS, executeTool } = require("./tools");

const PORT = process.env.PORT || 7501;
const HOST = process.env.HOST || "0.0.0.0";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const app = express();
app.use(cors({ origin: true, credentials: true }));
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ufc-ai-gateway" });
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
        return executeTool(name, args, supabaseWithAuth, userId);
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

app.post("/api/livekit/token", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName || typeof roomName !== "string") {
      return res.status(400).json({ error: "roomName required" });
    }
    const { AccessToken } = require("livekit-server-sdk");
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return res.status(503).json({ error: "LiveKit not configured" });
    }
    const token = new AccessToken(apiKey, apiSecret, {
      identity: req.user.email || req.user.id,
      name: req.user.email || req.user.id,
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    res.json({ token: token.toJwt() });
  } catch (err) {
    console.error("LiveKit token error:", err);
    res.status(500).json({ error: err.message });
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

app.listen(PORT, HOST, () => {
  console.log(`AI Gateway running at http://${HOST}:${PORT}`);
});
