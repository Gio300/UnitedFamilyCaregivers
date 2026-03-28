"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIPWindow } from "./PIPWindow";
import { useApp, type AccentColor } from "@/context/AppContext";
import {
  VIEWPORT_HEIGHT_MAX,
  VIEWPORT_HEIGHT_MIN,
  VIEWPORT_WIDTH_MAX,
  VIEWPORT_WIDTH_MIN,
} from "@/lib/deviceViewportPresets";

interface SettingsPIPProps {
  onClose: () => void;
}

export function SettingsPIP({ onClose }: SettingsPIPProps) {
  const {
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
  } = useApp();
  const supabase = createClient();
  const [browserSize, setBrowserSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const sync = () => setBrowserSize({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("device_type, text_size").eq("id", user.id).single().then(({ data }) => {
        if (data?.device_type) setDeviceTypeTypographyOnly(data.device_type as "desktop" | "tablet" | "mobile");
        if (data?.text_size) setTextSize(data.text_size as "small" | "medium" | "large");
      });
    });
  }, [supabase, setDeviceTypeTypographyOnly, setTextSize]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // #region agent log
    fetch("http://127.0.0.1:7314/ingest/b5f81f18-5968-433e-8c24-6d97348af981", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9b773e" },
      body: JSON.stringify({
        sessionId: "9b773e",
        location: "SettingsPIP.tsx:mount",
        message: "settings opened",
        data: {
          theme,
          htmlHasDark: document.documentElement.classList.contains("dark"),
        },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debug: log once per settings mount (theme = value at open)
  }, []);

  const handleApply = () => {
    localStorage.setItem(
      "ufci_settings",
      JSON.stringify({
        deviceType,
        textSize,
        textScalePx,
        pageScale,
        viewportWidth,
        viewportHeight,
        fitViewportToWindow,
        useSimulatedDeviceFrame,
        deviceLayoutAuto,
      })
    );
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
    <PIPWindow title="Settings" onClose={onClose} defaultWidth={400} defaultHeight={720}>
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
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Screen mode</label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseSimulatedDeviceFrame(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  !useSimulatedDeviceFrame
                    ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                    : "border-slate-300 text-slate-600 dark:border-zinc-600 dark:text-slate-400"
                }`}
              >
                Match my screen
              </button>
              <button
                type="button"
                onClick={() => setUseSimulatedDeviceFrame(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  useSimulatedDeviceFrame
                    ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                    : "border-slate-300 text-slate-600 dark:border-zinc-600 dark:text-slate-400"
                }`}
              >
                Fixed-size frame
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Default uses your browser&apos;s viewport and standard breakpoints (no extra install). Fixed-size is for QA only.
            </p>
          </div>
        </div>
        {!useSimulatedDeviceFrame && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
            <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Browser: {browserSize.w}×{browserSize.h} CSS px · layout: <span className="capitalize">{deviceType}</span>
            </p>
            <div className="flex items-start gap-3">
              <input
                id="ufci-device-auto"
                type="checkbox"
                checked={deviceLayoutAuto}
                onChange={(e) => setDeviceLayoutAuto(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="ufci-device-auto" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Update layout class when I resize</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  Maps width to mobile / tablet / desktop (768px and 1024px breakpoints).
                </span>
              </label>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Device layout</label>
          <div className="flex gap-2">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDeviceLayoutAuto(false);
                  if (useSimulatedDeviceFrame) setDeviceType(d);
                  else setDeviceTypeTypographyOnly(d);
                }}
                className={`px-3 py-2 rounded-lg text-sm capitalize ${
                  deviceType === d ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500" : "border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {useSimulatedDeviceFrame ? "Also sets the fixed frame to a standard size." : "Density and typography only; screen still fills the browser."}
          </p>
        </div>
        {useSimulatedDeviceFrame && (
          <>
            <div>
              <p className="mb-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                Simulated screen: {viewportWidth} × {viewportHeight} px
              </p>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Screen width (px)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={VIEWPORT_WIDTH_MIN}
                  max={VIEWPORT_WIDTH_MAX}
                  step={10}
                  value={viewportWidth}
                  onChange={(e) => setViewportWidth(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 dark:bg-zinc-600 accent-emerald-600"
                />
                <span className="w-12 font-mono text-sm tabular-nums">{viewportWidth}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Screen height (px)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={VIEWPORT_HEIGHT_MIN}
                  max={VIEWPORT_HEIGHT_MAX}
                  step={10}
                  value={viewportHeight}
                  onChange={(e) => setViewportHeight(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 dark:bg-zinc-600 accent-emerald-600"
                />
                <span className="w-12 font-mono text-sm tabular-nums">{viewportHeight}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag to resize the device frame; device buttons set standard sizes.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-zinc-600">
              <input
                id="ufci-fit-viewport"
                type="checkbox"
                checked={fitViewportToWindow}
                onChange={(e) => setFitViewportToWindow(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="ufci-fit-viewport" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Fit to screen</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  Scales the fixed frame down so it fits in the window without changing logical width or height.
                </span>
              </label>
            </div>
          </>
        )}
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
