"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type AppMode = "chat" | "notes" | "messenger" | "evv" | "customer_service" | "appointments" | "supervisor" | "eligibility";

export type PIPType = "settings" | "eligibility" | "document" | "expand" | "activity" | "supervisor_approval" | "message_center" | null;

export type Theme = "light" | "dark";

export type AccentColor = "emerald" | "blue" | "violet" | "amber";

export interface ExpandPIPContent {
  title: string;
  content: ReactNode;
}

export interface ChatSession {
  id: string;
  messages: { role: "user" | "assistant"; content: string; attachments?: { name: string; url: string }[] }[];
  preview: string;
  createdAt: number;
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
  textSize: "small" | "medium" | "large";
  setTextSize: (t: "small" | "medium" | "large") => void;
  textScalePx: number;
  setTextScalePx: (v: number) => void;
  pageScale: number;
  setPageScale: (v: number) => void;
  resetSettings: () => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  resetChat: () => void;
  chatResetKey: number;
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (v: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (v: boolean) => void;
  chatSessions: ChatSession[];
  addChatSession: (session: ChatSession) => void;
  loadChatSession: (id: string) => ChatSession | null;
  openChatSession: (id: string) => void;
  currentSessionId: string | null;
  pendingAttachments: { name: string; url: string }[];
  setPendingAttachments: (files: { name: string; url: string }[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

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
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const chatSessionsRef = useRef<ChatSession[]>([]);
  chatSessionsRef.current = chatSessions;
  const scaleRef = useRef({ textScalePx: 16, pageScale: 1 });
  scaleRef.current = { textScalePx, pageScale };
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ name: string; url: string }[]>([]);

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

  const setDeviceType = useCallback((d: "desktop" | "tablet" | "mobile") => {
    setDeviceTypeState(d);
    document.documentElement.setAttribute("data-device", d);
    localStorage.setItem("ufci_device", d);
  }, []);

  const setTextSize = useCallback((t: "small" | "medium" | "large") => {
    setTextSizeState(t);
    document.documentElement.setAttribute("data-text-size", t);
    const px = t === "small" ? 14 : t === "large" ? 18 : 16;
    document.documentElement.style.setProperty("--ufci-text-base", `${px}px`);
    document.documentElement.style.fontSize = `${px}px`;
    localStorage.setItem("ufci_text_size", t);
  }, []);

  const applyFontScale = useCallback((tpx: number, ps: number) => {
    document.documentElement.style.setProperty("--ufci-text-base", `${tpx}px`);
    document.documentElement.style.setProperty("--ufci-scale", String(ps));
    document.documentElement.style.fontSize = `${tpx * ps}px`;
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

  const resetSettings = useCallback(() => {
    setThemeState("light");
    setAccentColorState("emerald");
    setDeviceTypeState("desktop");
    setTextSizeState("medium");
    setTextScalePxState(16);
    setPageScaleState(1);
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-accent", "emerald");
    document.documentElement.setAttribute("data-device", "desktop");
    document.documentElement.setAttribute("data-text-size", "medium");
    document.documentElement.style.setProperty("--ufci-text-base", "16px");
    document.documentElement.style.fontSize = "16px";
    document.documentElement.style.setProperty("--ufci-scale", "1");
    localStorage.setItem("ufci_theme", "light");
    localStorage.setItem("ufci_accent", "emerald");
    localStorage.setItem("ufci_device", "desktop");
    localStorage.setItem("ufci_text_size", "medium");
    localStorage.setItem("ufci_text_scale_px", "16");
    localStorage.setItem("ufci_page_scale", "1");
    localStorage.setItem("ufci_settings", JSON.stringify({ deviceType: "desktop", textSize: "medium", textScalePx: 16, pageScale: 1 }));
  }, []);

  const resetChat = useCallback(() => {
    setCurrentSessionIdState(null);
    setChatResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const t = (localStorage.getItem("ufci_theme") as Theme) || "light";
    const c = (localStorage.getItem("ufci_accent") as AccentColor) || "emerald";
    let d: "desktop" | "tablet" | "mobile" = "desktop";
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
    setTheme(t);
    setAccentColor(c);
    setDeviceType(d);
    setTextSize(ts);
    setTextScalePxState(Math.min(24, Math.max(12, tpx)));
    setPageScaleState(Math.min(1.5, Math.max(0.75, ps)));
  }, [setTheme, setAccentColor, setDeviceType, setTextSize]);

  useEffect(() => {
    const tpx = Math.min(24, Math.max(12, parseInt(localStorage.getItem("ufci_text_scale_px") || "16", 10) || 16));
    const ps = Math.min(1.5, Math.max(0.75, parseFloat(localStorage.getItem("ufci_page_scale") || "1") || 1));
    document.documentElement.style.setProperty("--ufci-text-base", `${tpx}px`);
    document.documentElement.style.setProperty("--ufci-scale", String(ps));
    document.documentElement.style.fontSize = `${tpx * ps}px`;
  }, []);

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
        textSize,
        setTextSize,
        textScalePx,
        setTextScalePx,
        pageScale,
        setPageScale,
        resetSettings,
        activeClientId,
        setActiveClientId,
        resetChat,
        chatResetKey,
        leftSidebarOpen,
        setLeftSidebarOpen,
        rightSidebarOpen,
        setRightSidebarOpen,
        chatSessions,
        addChatSession,
        loadChatSession,
        openChatSession,
        currentSessionId,
        pendingAttachments,
        setPendingAttachments,
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
