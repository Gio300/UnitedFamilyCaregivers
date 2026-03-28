"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiBase } from "@/lib/api";
import {
  DEVICE_VIEWPORT_PRESETS,
  clampViewportHeight,
  clampViewportWidth,
  inferDeviceLayoutFromViewportWidth,
  type DeviceLayoutType,
} from "@/lib/deviceViewportPresets";

export type AppMode =
  | "chat"
  | "notes"
  | "messenger"
  | "profiles"
  | "evv"
  | "customer_service"
  | "appointments"
  | "supervisor"
  | "eligibility"
  | "contact_us"
  | "queue";

/** Must match `ComposerChannel` in NewMessageComposer (avoid circular import). */
export type ComposerRequestChannel = "dm" | "email" | "reminder" | "appointment" | "call";

/** Optional fields to prefill when opening the message composer from context shortcuts. */
export type ComposerPrefill = {
  dmBody?: string;
  emailSubject?: string;
  emailBody?: string;
  reminderText?: string;
  aptTitle?: string;
  aptNotes?: string;
};

export type CompanionSuggestedAction = {
  id: string;
  label: string;
  chatPayload?: string;
  channel?: ComposerRequestChannel;
  prefill?: ComposerPrefill;
};

/** Companion scheduling flows (fed into chat userContext). */
export type CompanionFlow = "appointment_intent" | "callback_requested";

export type PIPType = "settings" | "eligibility" | "document" | "expand" | "activity" | "supervisor_approval" | "message_center" | null;

export type Theme = "light" | "dark";

export type AccentColor = "emerald" | "blue" | "violet" | "amber";

export interface ExpandPIPContent {
  title: string;
  content: ReactNode;
}

/** Optional chips for Sandata / MCP checklist (last assistant message only in UI). */
export type ChatQuickReply = { id: string; label: string; payload: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; url: string }[];
  quickReplies?: ChatQuickReply[];
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  preview: string;
  createdAt: number;
  title?: string;
}

interface AppContextValue {
  userRole: string | null;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  pipType: PIPType;
  openPIP: (type: PIPType, expandContent?: ExpandPIPContent) => void;
  closePIP: () => void;
  expandContent: ExpandPIPContent | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  deviceType: "desktop" | "tablet" | "mobile";
  setDeviceType: (d: "desktop" | "tablet" | "mobile") => void;
  /** Updates device class / typography only (does not change simulated viewport size). For profile sync. */
  setDeviceTypeTypographyOnly: (d: DeviceLayoutType) => void;
  textSize: "small" | "medium" | "large";
  setTextSize: (t: "small" | "medium" | "large") => void;
  textScalePx: number;
  setTextScalePx: (v: number) => void;
  pageScale: number;
  setPageScale: (v: number) => void;
  /** Simulated device frame width/height (CSS px). Presets set these when changing device type. */
  viewportWidth: number;
  viewportHeight: number;
  setViewportWidth: (v: number) => void;
  setViewportHeight: (v: number) => void;
  /** Scale frame down so it fits in the browser window without changing logical size. */
  fitViewportToWindow: boolean;
  setFitViewportToWindow: (v: boolean) => void;
  /**
   * When false (default), the dashboard fills the browser and layout width follows the real viewport.
   * When true, a fixed pixel frame is used for QA (sliders / presets).
   */
  useSimulatedDeviceFrame: boolean;
  setUseSimulatedDeviceFrame: (v: boolean) => void;
  /** When true with simulated frame off, window resize updates device class via viewport width. */
  deviceLayoutAuto: boolean;
  setDeviceLayoutAuto: (v: boolean) => void;
  resetSettings: () => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  resetChat: () => void;
  chatResetKey: number;
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (v: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (v: boolean) => void;
  companionFlow: CompanionFlow | null;
  setCompanionFlow: (f: CompanionFlow | null) => void;
  companionSummary: string;
  voiceCaptionTail: string;
  companionDecisions: string;
  appendCompanionNote: (line: string) => void;
  appendVoiceCaption: (line: string) => void;
  appendCompanionDecision: (line: string) => void;
  clearCompanionContext: () => void;
  /** Bumps when activity_log may have new rows (refetch AutoNotesBar). */
  activityLogRefreshKey: number;
  /** LiveKit voice session connected (Companion guidance visible). */
  companionVoiceSessionActive: boolean;
  setCompanionVoiceSessionActive: (v: boolean) => void;
  companionGuidance: { history: string[]; index: number };
  pushCompanionGuidance: (text: string) => void;
  companionGuidanceGoBack: () => void;
  companionGuidanceGoForward: () => void;
  resetCompanionGuidance: () => void;
  openCompanion: () => void;
  /** Pending composer open from shortcuts (Companion, Quick Actions). Cleared when ChatPanel opens the composer. */
  composerRequest: { channel: ComposerRequestChannel; prefill?: ComposerPrefill } | null;
  requestComposerChannel: (c: ComposerRequestChannel, prefill?: ComposerPrefill) => void;
  clearComposerRequest: () => void;
  /** Fills the main chat input once (user message), then cleared. */
  pendingUserComposerText: string | null;
  setPendingUserComposerText: (t: string | null) => void;
  companionSuggestedActions: CompanionSuggestedAction[];
  setCompanionSuggestedActions: (a: CompanionSuggestedAction[]) => void;
  applyCompanionAction: (action: CompanionSuggestedAction) => void;
  /** Last user chat text (tail) for Companion orchestration — updated when the user sends from main chat. */
  lastChatSnippetForCompanion: string;
  setLastChatSnippetForCompanion: (s: string) => void;
  /**
   * True when a CSR is available to take the live queue call for this session.
   * false = none available (stub default on localhost until gateway wires this).
   * null = unknown — treat like "may have agents" and do not offer callback-only escalation.
   */
  queueAgentAvailable: boolean | null;
  setQueueAgentAvailable: (v: boolean | null) => void;
  /** User indicated voice IVR did not resolve their issue (e.g. button in voice panel). */
  ivrSessionUnresolved: boolean;
  markIvrSessionUnresolved: () => void;
  resetIvrSessionUnresolved: () => void;
  chatSessions: ChatSession[];
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (id: string, updates: Partial<Pick<ChatSession, "title" | "messages" | "preview">>) => void;
  deleteChatSession: (id: string) => void;
  loadChatSession: (id: string) => ChatSession | null;
  openChatSession: (id: string) => void;
  currentSessionId: string | null;
  pendingAttachments: { name: string; url: string }[];
  setPendingAttachments: (files: { name: string; url: string }[]) => void;
  autoNotesScope: "this_chat" | "all";
  setAutoNotesScope: (scope: "this_chat" | "all") => void;
  pendingAssistantMessage: string | null;
  setPendingAssistantMessage: (msg: string | null) => void;
  /** LiveKit cs-voice room name while in queue (for Realtime + polling). */
  activeSupportRoomName: string | null;
  setActiveSupportRoomName: (name: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function isValidUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>("chat");
  const [pipType, setPipType] = useState<PIPType>(null);
  const [expandContent, setExpandContent] = useState<ExpandPIPContent | null>(null);
  const [theme, setThemeState] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<AccentColor>("emerald");
  const [deviceType, setDeviceTypeState] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [textSize, setTextSizeState] = useState<"small" | "medium" | "large">("medium");
  const [textScalePx, setTextScalePxState] = useState(16);
  const [pageScale, setPageScaleState] = useState(1);
  const desktopPreset = DEVICE_VIEWPORT_PRESETS.desktop;
  const [viewportWidth, setViewportWidthState] = useState(desktopPreset.width);
  const [viewportHeight, setViewportHeightState] = useState(desktopPreset.height);
  const [fitViewportToWindow, setFitViewportToWindowState] = useState(false);
  const [useSimulatedDeviceFrame, setUseSimulatedDeviceFrameState] = useState(false);
  const [deviceLayoutAuto, setDeviceLayoutAutoState] = useState(true);
  const useSimFrameRef = useRef(false);
  const deviceLayoutAutoRef = useRef(true);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [companionFlow, setCompanionFlow] = useState<CompanionFlow | null>(null);
  const [companionSummary, setCompanionSummary] = useState("");
  const [voiceCaptionTail, setVoiceCaptionTail] = useState("");
  const [companionDecisions, setCompanionDecisions] = useState("");
  const [composerRequest, setComposerRequest] = useState<{
    channel: ComposerRequestChannel;
    prefill?: ComposerPrefill;
  } | null>(null);
  const [pendingUserComposerText, setPendingUserComposerText] = useState<string | null>(null);
  const [companionSuggestedActions, setCompanionSuggestedActions] = useState<CompanionSuggestedAction[]>([]);
  const [lastChatSnippetForCompanion, setLastChatSnippetForCompanion] = useState("");
  /** null = unknown; true when a rep claimed this session’s queue row; false when known none. */
  const [queueAgentAvailable, setQueueAgentAvailable] = useState<boolean | null>(null);
  const [activeSupportRoomName, setActiveSupportRoomName] = useState<string | null>(null);
  const [ivrSessionUnresolved, setIvrSessionUnresolved] = useState(false);
  const [activityLogRefreshKey, setActivityLogRefreshKey] = useState(0);
  const [companionVoiceSessionActive, setCompanionVoiceSessionActiveState] = useState(false);
  const [companionGuidance, setCompanionGuidance] = useState<{ history: string[]; index: number }>({
    history: [],
    index: -1,
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const chatSessionsRef = useRef<ChatSession[]>([]);
  chatSessionsRef.current = chatSessions;
  const scaleRef = useRef({ textScalePx: 16, pageScale: 1 });
  scaleRef.current = { textScalePx, pageScale };
  const deviceTypeRef = useRef(deviceType);
  deviceTypeRef.current = deviceType;
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ name: string; url: string }[]>([]);
  const [autoNotesScope, setAutoNotesScopeState] = useState<"this_chat" | "all">("all");
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<string | null>(null);
  const activeClientIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  activeClientIdRef.current = activeClientId;
  currentSessionIdRef.current = currentSessionId;

  const openChatSession = useCallback((id: string) => {
    setCurrentSessionIdState(id);
  }, []);

  const addChatSession = useCallback((session: ChatSession) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== session.id);
      const next = [session, ...filtered].slice(0, 50);
      if (typeof window !== "undefined") localStorage.setItem("ufci_chat_sessions", JSON.stringify(next));
      return next;
    });
    if (typeof window === "undefined") return;
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user || !isValidUuid(session.id)) return;
      const supabase = createClient();
      supabase.from("chat_sessions").upsert({
        id: session.id,
        user_id: user.id,
        title: session.preview?.slice(0, 200) || "Chat",
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).then(() => {
        supabase.from("chat_messages").delete().eq("session_id", session.id).then(() => {
          const inserts = session.messages.map((m, i) => ({
              session_id: session.id,
              user_id: user.id,
              role: m.role,
              content: m.content,
              attachments: (m.attachments || []).length ? (m.attachments || []) : [],
              created_at: new Date(session.createdAt + i * 1000).toISOString(),
            }));
          if (inserts.length) supabase.from("chat_messages").insert(inserts).then(() => {});
        });
      });
    });
  }, []);

  const updateChatSession = useCallback((id: string, updates: Partial<Pick<ChatSession, "title" | "messages" | "preview">>) => {
    setChatSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const s = next[idx];
      next[idx] = {
        ...s,
        ...(updates.title !== undefined && { preview: updates.title, title: updates.title }),
        ...(updates.preview !== undefined && { preview: updates.preview }),
        ...(updates.messages !== undefined && { messages: updates.messages }),
      };
      if (typeof window !== "undefined") localStorage.setItem("ufci_chat_sessions", JSON.stringify(next));
      return next;
    });
    if (typeof window === "undefined") return;
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user || !isValidUuid(id)) return;
      const supabase = createClient();
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.preview !== undefined) payload.title = updates.preview;
      supabase.from("chat_sessions").update(payload).eq("id", id).eq("user_id", user.id).then();
      if (updates.messages !== undefined) {
        supabase.from("chat_messages").delete().eq("session_id", id).then(() => {
          const inserts = updates.messages!.map((m, i) => ({
              session_id: id,
              user_id: user.id,
              role: m.role,
              content: m.content,
              attachments: (m.attachments || []).length ? (m.attachments || []) : [],
              created_at: new Date(Date.now() - (updates.messages!.length - i) * 1000).toISOString(),
            }));
          if (inserts.length) supabase.from("chat_messages").insert(inserts).then(() => {});
        });
      }
    });
  }, []);

  const deleteChatSession = useCallback((id: string) => {
    setChatSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (typeof window !== "undefined") localStorage.setItem("ufci_chat_sessions", JSON.stringify(next));
      return next;
    });
    if (typeof window === "undefined") return;
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user || !isValidUuid(id)) return;
      createClient().from("chat_sessions").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).then();
    });
  }, []);

  const loadChatSession = useCallback((id: string): ChatSession | null => {
    const fromState = chatSessionsRef.current.find((s) => s.id === id);
    if (fromState) return fromState;
    const stored = typeof window !== "undefined" ? localStorage.getItem("ufci_chat_sessions") : null;
    const sessions: ChatSession[] = stored ? JSON.parse(stored) : [];
    return sessions.find((s) => s.id === id) || null;
  }, []);

  const setActiveClientId = useCallback((id: string | null) => {
    setActiveClientIdState((prev) => {
      if (prev !== id) setChatResetKey((k) => k + 1);
      return id;
    });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("ufci_theme", t);
  }, []);

  const setAccentColor = useCallback((c: AccentColor) => {
    setAccentColorState(c);
    document.documentElement.setAttribute("data-accent", c);
    localStorage.setItem("ufci_accent", c);
  }, []);

  const setDeviceType = useCallback((d: DeviceLayoutType) => {
    const { width, height } = DEVICE_VIEWPORT_PRESETS[d];
    deviceTypeRef.current = d;
    setDeviceTypeState(d);
    setViewportWidthState(width);
    setViewportHeightState(height);
    document.documentElement.setAttribute("data-device", d);
    localStorage.setItem("ufci_device", d);
    localStorage.setItem("ufci_viewport_w", String(width));
    localStorage.setItem("ufci_viewport_h", String(height));
  }, []);

  const setViewportWidth = useCallback((v: number) => {
    const c = clampViewportWidth(v);
    setViewportWidthState(c);
    localStorage.setItem("ufci_viewport_w", String(c));
  }, []);

  const setViewportHeight = useCallback((v: number) => {
    const c = clampViewportHeight(v);
    setViewportHeightState(c);
    localStorage.setItem("ufci_viewport_h", String(c));
  }, []);

  const setFitViewportToWindow = useCallback((v: boolean) => {
    setFitViewportToWindowState(v);
    localStorage.setItem("ufci_fit_viewport", v ? "1" : "0");
  }, []);

  const setTextSize = useCallback((t: "small" | "medium" | "large") => {
    setTextSizeState(t);
    document.documentElement.setAttribute("data-text-size", t);
    const px = t === "small" ? 14 : t === "large" ? 18 : 16;
    const ps = scaleRef.current.pageScale;
    document.documentElement.style.setProperty("--ufci-text-base", `${px}px`);
    const dm =
      deviceTypeRef.current === "mobile" ? 1.125 : deviceTypeRef.current === "tablet" ? 1.0625 : 1;
    document.documentElement.style.setProperty("--ufci-device-mult", String(dm));
    document.documentElement.style.fontSize = `${px * ps * dm}px`;
    localStorage.setItem("ufci_text_size", t);
  }, []);

  const applyFontScale = useCallback((tpx: number, ps: number) => {
    const dm =
      deviceTypeRef.current === "mobile" ? 1.125 : deviceTypeRef.current === "tablet" ? 1.0625 : 1;
    document.documentElement.style.setProperty("--ufci-text-base", `${tpx}px`);
    document.documentElement.style.setProperty("--ufci-scale", String(ps));
    document.documentElement.style.setProperty("--ufci-device-mult", String(dm));
    document.documentElement.style.fontSize = `${tpx * ps * dm}px`;
  }, []);

  const setTextScalePx = useCallback((v: number) => {
    setTextScalePxState(v);
    const ps = scaleRef.current.pageScale;
    applyFontScale(v, ps);
    localStorage.setItem("ufci_text_scale_px", String(v));
  }, [applyFontScale]);

  const setPageScale = useCallback((v: number) => {
    setPageScaleState(v);
    const tpx = scaleRef.current.textScalePx;
    applyFontScale(tpx, v);
    localStorage.setItem("ufci_page_scale", String(v));
  }, [applyFontScale]);

  const setDeviceTypeTypographyOnly = useCallback(
    (d: DeviceLayoutType) => {
      deviceTypeRef.current = d;
      setDeviceTypeState(d);
      document.documentElement.setAttribute("data-device", d);
      localStorage.setItem("ufci_device", d);
      const tpx = scaleRef.current.textScalePx;
      const ps = scaleRef.current.pageScale;
      applyFontScale(tpx, ps);
    },
    [applyFontScale]
  );

  const setUseSimulatedDeviceFrame = useCallback(
    (v: boolean) => {
      setUseSimulatedDeviceFrameState(v);
      localStorage.setItem("ufci_sim_frame", v ? "1" : "0");
      if (v) {
        const d = deviceTypeRef.current;
        const { width, height } = DEVICE_VIEWPORT_PRESETS[d];
        setViewportWidthState(width);
        setViewportHeightState(height);
        localStorage.setItem("ufci_viewport_w", String(width));
        localStorage.setItem("ufci_viewport_h", String(height));
      } else if (typeof window !== "undefined" && deviceLayoutAutoRef.current) {
        const inferred = inferDeviceLayoutFromViewportWidth(window.innerWidth);
        setDeviceTypeTypographyOnly(inferred);
      }
    },
    [setDeviceTypeTypographyOnly]
  );

  const setDeviceLayoutAuto = useCallback(
    (v: boolean) => {
      setDeviceLayoutAutoState(v);
      localStorage.setItem("ufci_device_auto", v ? "1" : "0");
      if (v && typeof window !== "undefined" && !useSimFrameRef.current) {
        const inferred = inferDeviceLayoutFromViewportWidth(window.innerWidth);
        setDeviceTypeTypographyOnly(inferred);
      }
    },
    [setDeviceTypeTypographyOnly]
  );

  const resetSettings = useCallback(() => {
    const { width, height } = DEVICE_VIEWPORT_PRESETS.desktop;
    const inferredDevice =
      typeof window !== "undefined" ? inferDeviceLayoutFromViewportWidth(window.innerWidth) : "desktop";
    setUseSimulatedDeviceFrameState(false);
    setDeviceLayoutAutoState(true);
    setThemeState("light");
    setAccentColorState("emerald");
    deviceTypeRef.current = inferredDevice;
    setDeviceTypeState(inferredDevice);
    setTextSizeState("medium");
    setTextScalePxState(16);
    setPageScaleState(1);
    setViewportWidthState(width);
    setViewportHeightState(height);
    setFitViewportToWindowState(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-accent", "emerald");
    document.documentElement.setAttribute("data-device", inferredDevice);
    document.documentElement.setAttribute("data-text-size", "medium");
    document.documentElement.style.setProperty("--ufci-text-base", "16px");
    document.documentElement.style.setProperty("--ufci-scale", "1");
    document.documentElement.style.setProperty("--ufci-device-mult", "1");
    document.documentElement.style.fontSize = "16px";
    localStorage.setItem("ufci_theme", "light");
    localStorage.setItem("ufci_accent", "emerald");
    localStorage.setItem("ufci_device", inferredDevice);
    localStorage.setItem("ufci_sim_frame", "0");
    localStorage.setItem("ufci_device_auto", "1");
    localStorage.setItem("ufci_text_size", "medium");
    localStorage.setItem("ufci_text_scale_px", "16");
    localStorage.setItem("ufci_page_scale", "1");
    localStorage.setItem("ufci_viewport_w", String(width));
    localStorage.setItem("ufci_viewport_h", String(height));
    localStorage.setItem("ufci_fit_viewport", "0");
    localStorage.setItem(
      "ufci_settings",
      JSON.stringify({
        deviceType: inferredDevice,
        textSize: "medium",
        textScalePx: 16,
        pageScale: 1,
        viewportWidth: width,
        viewportHeight: height,
        fitViewportToWindow: false,
        useSimulatedDeviceFrame: false,
        deviceLayoutAuto: true,
      })
    );
  }, []);

  const resetChat = useCallback(() => {
    setCurrentSessionIdState(null);
    setChatResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const t = (localStorage.getItem("ufci_theme") as Theme) || "light";
    const c = (localStorage.getItem("ufci_accent") as AccentColor) || "emerald";
    let d: DeviceLayoutType = "desktop";
    const stored = localStorage.getItem("ufci_device") || localStorage.getItem("ufci_settings");
    if (stored) {
      try {
        const parsed = stored.startsWith("{") ? JSON.parse(stored) : null;
        d = parsed?.deviceType || (["tablet", "mobile"].includes(stored) ? stored : "desktop");
      } catch {
        d = stored === "tablet" || stored === "mobile" ? stored : "desktop";
      }
    }
    const ts = (localStorage.getItem("ufci_text_size") || "medium") as "small" | "medium" | "large";
    const tpx = parseInt(localStorage.getItem("ufci_text_scale_px") || "16", 10) || 16;
    const ps = parseFloat(localStorage.getItem("ufci_page_scale") || "1") || 1;
    let vw = parseInt(localStorage.getItem("ufci_viewport_w") || "", 10);
    let vh = parseInt(localStorage.getItem("ufci_viewport_h") || "", 10);
    const fitRaw = localStorage.getItem("ufci_fit_viewport");
    let fit = fitRaw === "1";
    let simFrame = localStorage.getItem("ufci_sim_frame") === "1";
    let devAuto = localStorage.getItem("ufci_device_auto") !== "0";
    try {
      const bag = localStorage.getItem("ufci_settings");
      if (bag?.startsWith("{")) {
        const parsed = JSON.parse(bag) as {
          viewportWidth?: number;
          viewportHeight?: number;
          fitViewportToWindow?: boolean;
          useSimulatedDeviceFrame?: boolean;
          deviceLayoutAuto?: boolean;
        };
        if (parsed.viewportWidth != null && Number.isFinite(parsed.viewportWidth)) vw = parsed.viewportWidth;
        if (parsed.viewportHeight != null && Number.isFinite(parsed.viewportHeight)) vh = parsed.viewportHeight;
        if (typeof parsed.fitViewportToWindow === "boolean") fit = parsed.fitViewportToWindow;
        if (typeof parsed.useSimulatedDeviceFrame === "boolean") simFrame = parsed.useSimulatedDeviceFrame;
        if (typeof parsed.deviceLayoutAuto === "boolean") devAuto = parsed.deviceLayoutAuto;
      }
    } catch {
      /* keep parsed from dedicated keys */
    }
    if (typeof window !== "undefined" && !simFrame && devAuto) {
      d = inferDeviceLayoutFromViewportWidth(window.innerWidth);
    }
    if (!Number.isFinite(vw) || vw <= 0) {
      vw = DEVICE_VIEWPORT_PRESETS[d].width;
    }
    if (!Number.isFinite(vh) || vh <= 0) {
      vh = DEVICE_VIEWPORT_PRESETS[d].height;
    }
    deviceTypeRef.current = d;
    setTheme(t);
    setAccentColor(c);
    setDeviceTypeState(d);
    document.documentElement.setAttribute("data-device", d);
    setTextSize(ts);
    setTextScalePxState(Math.min(24, Math.max(12, tpx)));
    setPageScaleState(Math.min(1.5, Math.max(0.75, ps)));
    setViewportWidthState(clampViewportWidth(vw));
    setViewportHeightState(clampViewportHeight(vh));
    setFitViewportToWindowState(fit);
    setUseSimulatedDeviceFrameState(simFrame);
    setDeviceLayoutAutoState(devAuto);
  }, [setTheme, setAccentColor, setTextSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const syncNarrow = () => {
      const w = useSimulatedDeviceFrame ? viewportWidth : window.innerWidth;
      document.body.classList.toggle("ufci-narrow-viewport", mq.matches || w < 768);
    };
    syncNarrow();
    mq.addEventListener("change", syncNarrow);
    window.addEventListener("resize", syncNarrow);
    return () => {
      mq.removeEventListener("change", syncNarrow);
      window.removeEventListener("resize", syncNarrow);
      document.body.classList.remove("ufci-narrow-viewport");
    };
  }, [viewportWidth, useSimulatedDeviceFrame]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (useSimulatedDeviceFrame || !deviceLayoutAuto) return;
    let tid: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        const inferred = inferDeviceLayoutFromViewportWidth(window.innerWidth);
        if (inferred !== deviceTypeRef.current) {
          setDeviceTypeTypographyOnly(inferred);
        }
      }, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(tid);
    };
  }, [useSimulatedDeviceFrame, deviceLayoutAuto, setDeviceTypeTypographyOnly]);

  useEffect(() => {
    useSimFrameRef.current = useSimulatedDeviceFrame;
    deviceLayoutAutoRef.current = deviceLayoutAuto;
  }, [useSimulatedDeviceFrame, deviceLayoutAuto]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    deviceTypeRef.current = deviceType;
    applyFontScale(textScalePx, pageScale);
  }, [deviceType, textScalePx, pageScale, applyFontScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("ufci_chat_sessions");
    if (stored) {
      try {
        setChatSessions(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("chat_sessions")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50)
        .then(({ data: sessions, error: se }) => {
          // #region agent log
          fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'AppContext.tsx:chat_sessions',message:'chat_sessions query result',data:{error:se?.message,code:se?.code,details:se?.details,sessionCount:sessions?.length??0},hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          if (se || !sessions?.length) return;
          supabase
            .from("chat_messages")
            .select("session_id, role, content, attachments, created_at")
            .in("session_id", sessions.map((s) => s.id))
            .order("created_at", { ascending: true })
            .then(({ data: msgs, error: me }) => {
              // #region agent log
              fetch('http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9b773e'},body:JSON.stringify({sessionId:'9b773e',location:'AppContext.tsx:chat_messages',message:'chat_messages query result',data:{error:me?.message,code:me?.code,details:me?.details,hint:me?.hint,msgCount:msgs?.length??0,sessionIds:sessions?.slice(0,3).map(s=>s.id)},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              if (me) return;
              const bySession = new Map<string, { role: "user" | "assistant"; content: string; attachments?: { name: string; url: string }[] }[]>();
              (msgs || []).forEach((m) => {
                const list = bySession.get(m.session_id) || [];
                list.push({
                  role: m.role as "user" | "assistant",
                  content: m.content,
                  attachments: Array.isArray(m.attachments) ? m.attachments : (m.attachments ? JSON.parse(String(m.attachments || "[]")) : []),
                });
                bySession.set(m.session_id, list);
              });
              const loaded: ChatSession[] = sessions.map((s) => {
                const messages = bySession.get(s.id) || [];
                const preview = messages[0]?.content?.slice(0, 60) || s.title || "Chat";
                return {
                  id: s.id,
                  messages,
                  preview,
                  createdAt: new Date(s.created_at).getTime(),
                  title: s.title,
                };
              });
              setChatSessions((prev) => {
                const byId = new Map(prev.map((p) => [p.id, p]));
                loaded.forEach((l) => byId.set(l.id, l));
                const merged = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
                localStorage.setItem("ufci_chat_sessions", JSON.stringify(merged));
                return merged;
              });
            });
        });
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
        setUserRole(data?.role ?? null);
      });
    });
  }, []);


  const openPIP = useCallback((type: PIPType, content?: ExpandPIPContent) => {
    setPipType(type);
    setExpandContent(content || null);
  }, []);

  const closePIP = useCallback(() => {
    setPipType(null);
    setExpandContent(null);
  }, []);

  const MAX_COMPANION_SUMMARY = 4000;
  const MAX_VOICE_TAIL = 2500;
  const MAX_COMPANION_DECISIONS = 1500;
  const MAX_COMPANION_GUIDANCE = 20;

  const bumpActivityLog = useCallback(() => {
    setActivityLogRefreshKey((k) => k + 1);
  }, []);

  const resetCompanionGuidance = useCallback(() => {
    setCompanionGuidance({ history: [], index: -1 });
  }, []);

  const setCompanionVoiceSessionActive = useCallback(
    (v: boolean) => {
      setCompanionVoiceSessionActiveState(v);
      if (!v) {
        resetCompanionGuidance();
        setActiveSupportRoomName(null);
        setQueueAgentAvailable(false);
      }
    },
    [resetCompanionGuidance]
  );

  const pushCompanionGuidance = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setCompanionGuidance(({ history, index }) => {
      const base = index >= 0 && index < history.length ? history.slice(0, index + 1) : [...history];
      base.push(t);
      const nh =
        base.length > MAX_COMPANION_GUIDANCE ? base.slice(-MAX_COMPANION_GUIDANCE) : base;
      return { history: nh, index: nh.length - 1 };
    });
  }, []);

  useEffect(() => {
    if (!activeSupportRoomName || !companionVoiceSessionActive) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support_queue_${activeSupportRoomName.replace(/[^a-zA-Z0-9_-]/g, "_")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_call_queue",
          filter: `room_name=eq.${activeSupportRoomName}`,
        },
        (payload) => {
          const row = payload.new as { status?: string } | null;
          if (row?.status === "claimed") {
            setQueueAgentAvailable(true);
            pushCompanionGuidance(
              "A representative has claimed your place in line and should join your voice room shortly."
            );
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSupportRoomName, companionVoiceSessionActive, pushCompanionGuidance]);

  useEffect(() => {
    if (!activeSupportRoomName || !companionVoiceSessionActive) return;
    const apiBase = getApiBase();
    if (!apiBase) return;
    let cancelled = false;
    const tick = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt || cancelled) return;
      const u = `${apiBase.replace(/\/+$/, "")}/api/support-queue/caller-status?roomName=${encodeURIComponent(activeSupportRoomName)}`;
      try {
        const res = await fetch(u, { headers: { Authorization: `Bearer ${jwt}` } });
        const body = (await res.json().catch(() => ({}))) as { row?: { status?: string } };
        if (cancelled) return;
        if (body.row?.status === "claimed") {
          setQueueAgentAvailable(true);
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeSupportRoomName, companionVoiceSessionActive]);

  const companionGuidanceGoBack = useCallback(() => {
    setCompanionGuidance(({ history, index }) => ({
      history,
      index: index > 0 ? index - 1 : index,
    }));
  }, []);

  const companionGuidanceGoForward = useCallback(() => {
    setCompanionGuidance(({ history, index }) => ({
      history,
      index: index < history.length - 1 ? index + 1 : index,
    }));
  }, []);

  const appendCompanionNote = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      setCompanionSummary((prev) => {
        const next = prev ? `${prev}\n${trimmed}` : trimmed;
        return next.length > MAX_COMPANION_SUMMARY ? next.slice(-MAX_COMPANION_SUMMARY) : next;
      });
      void (async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const payload: Record<string, unknown> = {
          user_id: user.id,
          action_type: "companion_note",
          details: { message: trimmed },
          client_id: activeClientIdRef.current ?? null,
        };
        const sid = currentSessionIdRef.current;
        if (sid && isValidUuid(sid)) payload.session_id = sid;
        const { error } = await supabase.from("activity_log").insert(payload);
        if (!error) bumpActivityLog();
      })();
    },
    [bumpActivityLog]
  );

  const appendVoiceCaption = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    setVoiceCaptionTail((prev) => {
      const next = prev ? `${prev}\n${trimmed}` : trimmed;
      return next.length > MAX_VOICE_TAIL ? next.slice(-MAX_VOICE_TAIL) : next;
    });
  }, []);

  const appendCompanionDecision = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    setCompanionDecisions((prev) => {
      const next = prev ? `${prev}\n${trimmed}` : trimmed;
      return next.length > MAX_COMPANION_DECISIONS ? next.slice(-MAX_COMPANION_DECISIONS) : next;
    });
  }, []);

  const markIvrSessionUnresolved = useCallback(() => {
    setIvrSessionUnresolved(true);
  }, []);

  const resetIvrSessionUnresolved = useCallback(() => {
    setIvrSessionUnresolved(false);
  }, []);

  const clearCompanionContext = useCallback(() => {
    setCompanionFlow(null);
    setCompanionSummary("");
    setVoiceCaptionTail("");
    setCompanionDecisions("");
    setIvrSessionUnresolved(false);
  }, []);

  const openCompanion = useCallback(() => {
    setRightSidebarOpen(true);
  }, []);

  const requestComposerChannel = useCallback((c: ComposerRequestChannel, prefill?: ComposerPrefill) => {
    setComposerRequest({ channel: c, ...(prefill && Object.keys(prefill).length ? { prefill } : {}) });
  }, []);

  const clearComposerRequest = useCallback(() => {
    setComposerRequest(null);
  }, []);

  const applyCompanionAction = useCallback(
    (action: CompanionSuggestedAction) => {
      if (action.channel) {
        requestComposerChannel(action.channel, action.prefill);
        return;
      }
      if (action.chatPayload?.trim()) {
        setPendingUserComposerText(action.chatPayload.trim());
      }
    },
    [requestComposerChannel]
  );

  return (
    <AppContext.Provider
      value={{
        userRole,
        mode,
        setMode,
        pipType,
        openPIP,
        closePIP,
        expandContent,
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        deviceType,
        setDeviceType,
        setDeviceTypeTypographyOnly,
        textSize,
        setTextSize,
        textScalePx,
        setTextScalePx,
        pageScale,
        setPageScale,
        viewportWidth,
        viewportHeight,
        setViewportWidth,
        setViewportHeight,
        fitViewportToWindow,
        setFitViewportToWindow,
        useSimulatedDeviceFrame,
        setUseSimulatedDeviceFrame,
        deviceLayoutAuto,
        setDeviceLayoutAuto,
        resetSettings,
        activeClientId,
        setActiveClientId,
        resetChat,
        chatResetKey,
        leftSidebarOpen,
        setLeftSidebarOpen,
        rightSidebarOpen,
        setRightSidebarOpen,
        companionFlow,
        setCompanionFlow,
        companionSummary,
        voiceCaptionTail,
        companionDecisions,
        appendCompanionNote,
        appendVoiceCaption,
        appendCompanionDecision,
        clearCompanionContext,
        activityLogRefreshKey,
        companionVoiceSessionActive,
        setCompanionVoiceSessionActive,
        companionGuidance,
        pushCompanionGuidance,
        companionGuidanceGoBack,
        companionGuidanceGoForward,
        resetCompanionGuidance,
        openCompanion,
        composerRequest,
        requestComposerChannel,
        clearComposerRequest,
        pendingUserComposerText,
        setPendingUserComposerText,
        companionSuggestedActions,
        setCompanionSuggestedActions,
        applyCompanionAction,
        lastChatSnippetForCompanion,
        setLastChatSnippetForCompanion,
        queueAgentAvailable,
        setQueueAgentAvailable,
        ivrSessionUnresolved,
        markIvrSessionUnresolved,
        resetIvrSessionUnresolved,
        chatSessions,
        addChatSession,
        updateChatSession,
        deleteChatSession,
        loadChatSession,
        openChatSession,
        currentSessionId,
        pendingAttachments,
        setPendingAttachments,
        autoNotesScope,
        setAutoNotesScope: setAutoNotesScopeState,
        pendingAssistantMessage,
        setPendingAssistantMessage,
        activeSupportRoomName,
        setActiveSupportRoomName,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
