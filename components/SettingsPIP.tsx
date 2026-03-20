"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIPWindow } from "./PIPWindow";

interface SettingsPIPProps {
  onClose: () => void;
}

export function SettingsPIP({ onClose }: SettingsPIPProps) {
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

  return (
    <PIPWindow title="Settings" onClose={onClose} defaultWidth={360} defaultHeight={320}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Device layout</label>
          <div className="flex gap-2">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeviceType(d)}
                className={`px-3 py-2 rounded-lg text-sm capitalize ${
                  deviceType === d ? "bg-emerald-100 text-emerald-700 border-emerald-500" : "border border-slate-300 text-slate-600"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Text size</label>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTextSize(t)}
                className={`px-3 py-2 rounded-lg text-sm capitalize ${
                  textSize === t ? "bg-emerald-100 text-emerald-700 border-emerald-500" : "border border-slate-300 text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleApply} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
            Apply
          </button>
        </div>
      </div>
    </PIPWindow>
  );
}
