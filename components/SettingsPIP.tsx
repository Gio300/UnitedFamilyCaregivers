"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIPWindow } from "./PIPWindow";
import { useApp, type Theme, type AccentColor } from "@/context/AppContext";

interface SettingsPIPProps {
  onClose: () => void;
}

export function SettingsPIP({ onClose }: SettingsPIPProps) {
  const { theme, setTheme, accentColor, setAccentColor, deviceType, setDeviceType, textSize, setTextSize, textScalePx, setTextScalePx, pageScale, setPageScale, resetSettings } = useApp();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("device_type, text_size, theme, accent_color").eq("id", user.id).single().then(({ data }) => {
        if (data?.device_type) setDeviceType(data.device_type as "desktop" | "tablet" | "mobile");
        if (data?.text_size) setTextSize(data.text_size as "small" | "medium" | "large");
        if (data?.theme) setTheme((data.theme as Theme) || "light");
        if (data?.accent_color) setAccentColor((data.accent_color as AccentColor) || "emerald");
      });
    });
  }, [supabase]);

  const handleApply = () => {
    localStorage.setItem("ufci_settings", JSON.stringify({ deviceType, textSize, textScalePx, pageScale }));
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").update({
          device_type: deviceType,
          text_size: textSize,
          theme: theme,
          accent_color: accentColor,
        }).eq("id", user.id);
      }
    });
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").update({
          device_type: "desktop",
          text_size: "medium",
          theme: "light",
          accent_color: "emerald",
        }).eq("id", user.id);
      }
    });
    onClose();
  };

  const ACCENT_OPTIONS: { id: AccentColor; label: string; bg: string }[] = [
    { id: "emerald", label: "Emerald", bg: "bg-emerald-500" },
    { id: "blue", label: "Blue", bg: "bg-blue-500" },
    { id: "violet", label: "Violet", bg: "bg-violet-500" },
    { id: "amber", label: "Amber", bg: "bg-amber-500" },
  ];

  return (
    <PIPWindow title="Settings" onClose={onClose} defaultWidth={360} defaultHeight={480}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`px-3 py-2 rounded-lg text-sm ${
                theme === "light" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`px-3 py-2 rounded-lg text-sm ${
                theme === "dark" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400"
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
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-slate-200 dark:border-zinc-600 ${
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
                  deviceType === d ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Text size (px)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="12"
              max="24"
              value={textScalePx}
              onChange={(e) => setTextScalePx(parseInt(e.target.value, 10))}
              className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 dark:bg-zinc-600 accent-emerald-600"
            />
            <span className="text-sm font-mono w-8">{textScalePx}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Adjust for comfortable reading.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Page zoom</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={pageScale}
              onChange={(e) => setPageScale(parseFloat(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 dark:bg-zinc-600 accent-emerald-600"
            />
            <span className="text-sm font-mono w-10">{Math.round(pageScale * 100)}%</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Scales the entire interface.</p>
        </div>
        <div className="flex justify-between gap-2 pt-4">
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
            Reset to default
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-slate-300 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleApply} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 ring-2 ring-black/10 dark:ring-white/10">
              Save
            </button>
          </div>
        </div>
      </div>
    </PIPWindow>
  );
}
