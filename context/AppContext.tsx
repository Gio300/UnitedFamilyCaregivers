"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

export type AppMode = "messenger" | "evv" | "customer_service" | "appointments" | "supervisor";

export type PIPType = "settings" | "eligibility" | "document" | "expand" | "activity" | null;

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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("messenger");
  const [pipType, setPipType] = useState<PIPType>(null);
  const [expandContent, setExpandContent] = useState<ExpandPIPContent | null>(null);
  const [theme, setThemeState] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<AccentColor>("emerald");
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const chatSessionsRef = useRef<ChatSession[]>([]);
  chatSessionsRef.current = chatSessions;
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);

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

  const resetChat = useCallback(() => {
    setCurrentSessionIdState(null);
    setChatResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const t = (localStorage.getItem("ufci_theme") as Theme) || "light";
    const c = (localStorage.getItem("ufci_accent") as AccentColor) || "emerald";
    setTheme(t);
    setAccentColor(c);
  }, [setTheme, setAccentColor]);

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
