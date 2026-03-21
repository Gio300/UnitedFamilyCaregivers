"use client";

import { useState, useEffect, useRef } from "react";
import { PIPWindow } from "./PIPWindow";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

const SECTIONS = ["Medicaid", "ID", "Care Plan", "Other"];
const UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "upload" | "attach";

interface DocumentsPIPProps {
  onClose: () => void;
}

export function DocumentsPIP({ onClose }: DocumentsPIPProps) {
  const { setPendingAttachments } = useApp();
  const [tab, setTab] = useState<Tab>("upload");
  const [section, setSection] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      if (!isStaff) {
        const month = currentMonth();
        const { data: usage } = await supabase.from("user_upload_usage").select("bytes_used").eq("user_id", user.id).eq("month", month).single();
        const used = usage?.bytes_used ?? 0;
        if (used + file.size > UPLOAD_LIMIT_BYTES) {
          throw new Error("50 MB monthly upload limit reached. Try again next month or contact support.");
        }
      }

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

      if (!isStaff) {
        const month = currentMonth();
        const { data: row } = await supabase.from("user_upload_usage").select("bytes_used").eq("user_id", user.id).eq("month", month).single();
        const prevUsed = row?.bytes_used ?? 0;
        const newTotal = prevUsed + file.size;
        await supabase.from("user_upload_usage").upsert(
          { user_id: user.id, month, bytes_used: newTotal, updated_at: new Date().toISOString() },
          { onConflict: "user_id,month" }
        );
      }

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

  async function handleAttach() {
    const input = fileInputRef.current;
    if (!input?.files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const staff = profile?.role === "csr_admin" || profile?.role === "management_admin";

    const files = Array.from(input.files);
    if (!staff) {
      const month = currentMonth();
      const { data: row } = await supabase.from("user_upload_usage").select("bytes_used").eq("user_id", user.id).eq("month", month).single();
      const used = row?.bytes_used ?? 0;
      const totalNew = files.reduce((s, f) => s + f.size, 0);
      if (used + totalNew > UPLOAD_LIMIT_BYTES) {
        alert("50 MB monthly upload limit reached. Try again next month or contact support.");
        return;
      }
    }

    const attached: { name: string; url: string }[] = [];
    let totalUploaded = 0;
    for (const f of files) {
      const path = `chat/${user.id}/${Date.now()}_${f.name}`;
      const { data, error } = await supabase.storage.from("documents").upload(path, f);
      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
        attached.push({ name: f.name, url: urlData.publicUrl });
        totalUploaded += f.size;
      }
    }
    if (attached.length) {
      if (!staff && totalUploaded > 0) {
        const month = currentMonth();
        const { data: row } = await supabase.from("user_upload_usage").select("bytes_used").eq("user_id", user.id).eq("month", month).single();
        const prevUsed = row?.bytes_used ?? 0;
        await supabase.from("user_upload_usage").upsert(
          { user_id: user.id, month, bytes_used: prevUsed + totalUploaded, updated_at: new Date().toISOString() },
          { onConflict: "user_id,month" }
        );
      }
      setPendingAttachments(attached);
      input.value = "";
      onClose();
    }
  }

  return (
    <PIPWindow title="Documents & Attachments" onClose={onClose} defaultWidth={400} defaultHeight={460}>
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-600 pb-2">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "upload" ? "bg-emerald-600 text-white ring-2 ring-black/10 dark:ring-white/10" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"}`}
          >
            Upload to profile
          </button>
          <button
            type="button"
            onClick={() => setTab("attach")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "attach" ? "bg-emerald-600 text-white ring-2 ring-black/10 dark:ring-white/10" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"}`}
          >
            Attach to message
          </button>
        </div>

        {tab === "upload" && (
          <>
            {(isStaff || clients.length > 1) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                <option value="">Select section…</option>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100" placeholder="Optional notes…" />
            </div>
            <button type="button" onClick={handleUpload} disabled={!file || !section || uploading} className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        )}

        {tab === "attach" && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">Select files to attach to your next message.</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400 hover:border-emerald-500 text-sm">
              Choose files
            </button>
            <button type="button" onClick={handleAttach} className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium ring-2 ring-black/10 dark:ring-white/10">
              Attach & send
            </button>
          </>
        )}
      </div>
    </PIPWindow>
  );
}
