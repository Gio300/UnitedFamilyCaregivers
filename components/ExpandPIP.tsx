"use client";

import { PIPWindow } from "./PIPWindow";

interface ExpandPIPProps {
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export function ExpandPIP({ onClose, title, content }: ExpandPIPProps) {
  return (
    <PIPWindow title={title} onClose={onClose} defaultWidth={500} defaultHeight={480}>
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none">{content}</div>
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 mb-2">Mini chat</p>
          <input
            type="text"
            placeholder="Type a message…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </PIPWindow>
  );
}
