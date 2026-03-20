"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AppMode = "messenger" | "evv" | "customer_service" | "appointments" | "supervisor";

export type PIPType = "settings" | "eligibility" | "document" | "expand" | null;

export interface ExpandPIPContent {
  title: string;
  content: ReactNode;
}

interface AppContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  pipType: PIPType;
  openPIP: (type: PIPType, expandContent?: ExpandPIPContent) => void;
  closePIP: () => void;
  expandContent: ExpandPIPContent | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("messenger");
  const [pipType, setPipType] = useState<PIPType>(null);
  const [expandContent, setExpandContent] = useState<ExpandPIPContent | null>(null);

  const openPIP = useCallback((type: PIPType, content?: ExpandPIPContent) => {
    setPipType(type);
    setExpandContent(content || null);
  }, []);

  const closePIP = useCallback(() => {
    setPipType(null);
    setExpandContent(null);
  }, []);

  return (
    <AppContext.Provider value={{ mode, setMode, pipType, openPIP, closePIP, expandContent }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
