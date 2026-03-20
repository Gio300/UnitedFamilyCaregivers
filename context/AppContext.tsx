"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

export type AppMode = "chat" | "notes" | "messenger" | "evv" | "customer_service" | "appointments" | "supervisor" | "eligibility";

export type PIPType = "settings" | "eligibility" | "document" | "expand" | "activity" | "supervisor_approval" | null;

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
  const [mode, setMode] = useState<AppMode>("chat");
  const [pipType, setPipType] = useState<PIPType>(null);
  const [expandContent, setExpandContent] = useState<ExpandPIPContent | null>(null);
  const [theme, setThemeState] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<AccentColor>("emerald");
  const [deviceType, setDeviceTypeState] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [textSize, setTextSizeState] = useState<"small" | "medium" | "large">("medium");
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const chatSessionsRef = useRef<ChatSession[]>([]);
  chatSessionsRef.current = chatSessions;
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
    document.documentElement.style.fontSize = t === "small" ? "14px" : t === "large" ? "18px" : "16px";
    localStorage.setItem("ufci_text_size", t);
  }, []);

  const resetSettings = useCallback(() => {
    setThemeState("light");
    setAccentColorState("emerald");
    setDeviceTypeState("desktop");
    setTextSizeState("medium");
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-accent", "emerald");
    document.documentElement.setAttribute("data-device", "desktop");
    document.documentElement.setAttribute("data-text-size", "medium");
    document.documentElement.style.fontSize = "16px";
    localStorage.setItem("ufci_theme", "light");
    localStorage.setItem("ufci_accent", "emerald");
    localStorage.setItem("ufci_device", "desktop");
    localStorage.setItem("ufci_text_size", "medium");
    localStorage.setItem("ufci_settings", JSON.stringify({ deviceType: "desktop", textSize: "medium" }));
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
    setTheme(t);
    setAccentColor(c);
    setDeviceType(d);
    setTextSize(ts);
  }, [setTheme, setAccentColor, setDeviceType, setTextSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("ufci_chat_sessions");
    if (stored) {
      try {
        setChatSessions(JSON.parse(stored));
      } catch {}
    }
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
