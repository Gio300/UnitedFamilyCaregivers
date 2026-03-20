"use client";

import { useState, useEffect } from "react";
import { PIPWindow } from "./PIPWindow";
import { createClient } from "@/lib/supabase/client";

const SECTIONS = ["Medicaid", "ID", "Care Plan", "Other"];

interface DocumentPIPProps {
  onClose: () => void;
}

export function DocumentPIP({ onClose }: DocumentPIPProps) {
  const [section, setSection] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: profile }) => {
        const role = profile?.role;
        const staff = role === "csr_admin" || role === "management_admin";
        setIsStaff(staff);
        if (staff) {
          supabase.from("client_profiles").select("id, full_name").then(({ data }) => setClients(data || []));
        } else {
          supabase.from("client_profiles").select("id, full_name").or(`user_id.eq.${user.id},caregiver_id.eq.${user.id}`).then(({ data }) => {
            setClients(data || []);
          });
        }
      });
    });
  }, [supabase]);

  useEffect(() => {
    if (!isStaff && clients.length === 1 && !clientId) setClientId(clients[0].id);
  }, [clients, isStaff, clientId]);

  async function handleUpload() {
    if (!file || !section) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      let targetClientId = clientId;
      if (!targetClientId) {
        const { data: cp } = await supabase.from("client_profiles").select("id").eq("user_id", user.id).limit(1).single();
        targetClientId = cp?.id;
      }
      if (!targetClientId) throw new Error("No client profile. Create one first.");
      const path = `documents/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("documents").insert({
        client_id: targetClientId,
        filename: file.name,
        file_path: path,
        mime_type: file.type,
        section,
        notes: notes || null,
      });
      if (insertError) throw insertError;
      setFile(null);
      setNotes("");
      setSection("");
      onClose();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <PIPWindow title="Upload Document" onClose={onClose} defaultWidth={400} defaultHeight={420}>
      <div className="space-y-4">
        {(isStaff || clients.length > 1) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select section…</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional notes…"
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || !section || uploading}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </PIPWindow>
  );
}
