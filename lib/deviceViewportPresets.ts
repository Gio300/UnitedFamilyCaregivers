export type DeviceLayoutType = "desktop" | "tablet" | "mobile";

/** Logical CSS pixel frames for device simulation presets. */
export const DEVICE_VIEWPORT_PRESETS: Record<DeviceLayoutType, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

export const VIEWPORT_WIDTH_MIN = 320;
export const VIEWPORT_WIDTH_MAX = 1920;
export const VIEWPORT_HEIGHT_MIN = 568;
export const VIEWPORT_HEIGHT_MAX = 1440;

export function clampViewportWidth(n: number) {
  return Math.min(VIEWPORT_WIDTH_MAX, Math.max(VIEWPORT_WIDTH_MIN, Math.round(n)));
}

export function clampViewportHeight(n: number) {
  return Math.min(VIEWPORT_HEIGHT_MAX, Math.max(VIEWPORT_HEIGHT_MIN, Math.round(n)));
}

/**
 * Infer layout class from CSS viewport width (same breakpoints as the dashboard: under 768 = mobile,
 * under 1024 = tablet, else desktop). Uses plain browser geometry — no external SDK.
 */
export function inferDeviceLayoutFromViewportWidth(cssWidth: number): DeviceLayoutType {
  if (cssWidth < 768) return "mobile";
  if (cssWidth < 1024) return "tablet";
  return "desktop";
}
