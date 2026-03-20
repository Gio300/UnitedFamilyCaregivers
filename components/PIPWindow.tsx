"use client";

import { useEffect, useRef, useState } from "react";

interface PIPWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function PIPWindow({ title, onClose, children, defaultWidth = 400, defaultHeight = 400 }: PIPWindowProps) {
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition((p) => ({ x: p.x + e.clientX - dragStart.x, y: p.y + e.clientY - dragStart.y }));
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragStart]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 cursor-move"
        onMouseDown={handleDragStart}
      >
        <h3 className="font-medium text-slate-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
