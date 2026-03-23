require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
const ollama = require("./ollama");
const { TOOL_DEFINITIONS, executeTool } = require("./tools");
const { handleMCPIntent } = require("./mcp-rules");

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ufc-ai-gateway" });
});

app.post("/api/mcp", requireAuth, async (req, res) => {
  try {
    const { message, userContext } = req.body;
    if (!message || typeof message !== "string") {
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

    const result = await handleMCPIntent(message, userContext || {}, executeToolFn, req.user.id);
    if (!result.matched) {
      return res.status(200).json({
        response: result.capabilities || "AI is in limited mode. Try: 'who am i', 'list clients', 'company info', 'what can you do'.",
        source: "mcp",
        matched: false,
      });
    }
    res.json({ response: result.response, source: result.source || "mcp" });
  } catch (err) {
    console.error("MCP error:", err);
    res.status(500).json({ error: err.message });
  }
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
        result = { response: "I'm in limited mode (AI unavailable). Please reply manually or try again later.", needs_human: true };
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

app.listen(PORT, HOST, () => {
  console.log(`AI Gateway running at http://${HOST}:${PORT}`);
});
