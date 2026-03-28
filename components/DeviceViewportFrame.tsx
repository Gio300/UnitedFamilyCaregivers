"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/context/AppContext";

const PAD = 24;

export type SimulatedViewportSize = {
  innerWidth: number;
  innerHeight: number;
};

const SimulatedViewportContext = createContext<SimulatedViewportSize | null>(null);

export function useSimulatedViewport(): SimulatedViewportSize {
  const ctx = useContext(SimulatedViewportContext);
  if (ctx) return ctx;
  if (typeof window !== "undefined") {
    return { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  }
  return { innerWidth: 0, innerHeight: 0 };
}

export function DeviceViewportFrame({ children }: { children: ReactNode }) {
  const { viewportWidth, viewportHeight, fitViewportToWindow, useSimulatedDeviceFrame } = useApp();
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<SimulatedViewportSize>({
    innerWidth: viewportWidth,
    innerHeight: viewportHeight,
  });
  const [fitScale, setFitScale] = useState(1);
  const displayScale = fitViewportToWindow ? fitScale : 1;

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      const { width, height } = e.contentRect;
      setSize({ innerWidth: width, innerHeight: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    if (!fitViewportToWindow) return;
    const outer = outerRef.current;
    if (!outer) return;
    const update = () => {
      const rect = outer.getBoundingClientRect();
      const availW = Math.max(1, rect.width - PAD * 2);
      const availH = Math.max(1, rect.height - PAD * 2);
      const sx = availW / viewportWidth;
      const sy = availH / viewportHeight;
      setFitScale(Math.min(1, sx, sy));
    };
    const ro = new ResizeObserver(() => update());
    ro.observe(outer);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [fitViewportToWindow, viewportWidth, viewportHeight]);

  if (!useSimulatedDeviceFrame) {
    return (
      <div
        ref={outerRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black"
      >
        <SimulatedViewportContext.Provider value={size}>
          <div ref={innerRef} className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
            {children}
          </div>
        </SimulatedViewportContext.Provider>
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="flex flex-1 flex-col min-h-0 min-w-0 items-center justify-start overflow-auto bg-zinc-100 px-3 py-4 dark:bg-zinc-900"
    >
      <div
        className="flex shrink-0 flex-col items-center"
        style={{
          transform: displayScale < 1 ? `scale(${displayScale})` : undefined,
          transformOrigin: "top center",
        }}
      >
        <SimulatedViewportContext.Provider value={size}>
          <div
            ref={innerRef}
            className="flex flex-col min-h-0 min-w-0 overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-600 dark:bg-black dark:ring-white/10"
            style={{
              width: viewportWidth,
              height: viewportHeight,
            }}
          >
            {children}
          </div>
        </SimulatedViewportContext.Provider>
      </div>
    </div>
  );
}
