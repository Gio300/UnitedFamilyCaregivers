"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIPWindow } from "./PIPWindow";
import { useApp, type Theme, type AccentColor } from "@/context/AppContext";

interface SettingsPIPProps {
  onClose: () => void;
}

export function SettingsPIP({ onClose }: SettingsPIPProps) {
  const { theme, setTheme, accentColor, setAccentColor } = useApp();
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">("medium");
  const supabase = createClient();

  useEffect(() => {
    const stored = localStorage.getItem("ufci_settings");
    if (stored) {
      try {
        const { deviceType: d, textSize: t } = JSON.parse(stored);
        if (d) setDeviceType(d);
        if (t) setTextSize(t);
      } catch {}
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("device_type, text_size").eq("id", user.id).single().then(({ data }) => {
          if (data?.device_type) setDeviceType(data.device_type as "desktop" | "tablet" | "mobile");
          if (data?.text_size) setTextSize(data.text_size as "small" | "medium" | "large");
        });
      }
    });
  }, [supabase]);

  const applySettings = () => {
    localStorage.setItem("ufci_settings", JSON.stringify({ deviceType, textSize }));
    document.documentElement.setAttribute("data-device", deviceType);
    document.documentElement.setAttribute("data-text-size", textSize);
    document.documentElement.style.fontSize = textSize === "small" ? "14px" : textSize === "large" ? "18px" : "16px";
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").update({ device_type: deviceType, text_size: textSize }).eq("id", user.id);
      }
    });
  };

  const handleApply = () => {
    applySettings();
    onClose();
  };

  const ACCENT_OPTIONS: { id: AccentColor; label: string; bg: string }[] = [
    { id: "emerald", label: "Emerald", bg: "bg-emerald-500" },
    { id: "blue", label: "Blue", bg: "bg-blue-500" },
    { id: "violet", label: "Violet", bg: "bg-violet-500" },
    { id: "amber", label: "Amber", bg: "bg-amber-500" },
  ];

  return (
    <PIPWindow title="Settings" onClose={onClose} defaultWidth={360} defaultHeight={420}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`px-3 py-2 rounded-lg text-sm ${
                theme === "light" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`px-3 py-2 rounded-lg text-sm ${
                theme === "dark" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
              }`}
            >
              Dark
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Button & logo color</label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAccentColor(o.id)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  accentColor === o.id ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500" : ""
                }`}
              >
                <span className={`w-4 h-4 rounded ${o.bg}`} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Device layout</label>
          <div className="flex gap-2">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeviceType(d)}
                className={`px-3 py-2 rounded-lg text-sm capitalize ${
                  deviceType === d ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Text size</label>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTextSize(t)}
                className={`px-3 py-2 rounded-lg text-sm capitalize ${
                  textSize === t ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleApply} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">
            Save
          </button>
        </div>
      </div>
    </PIPWindow>
  );
}
