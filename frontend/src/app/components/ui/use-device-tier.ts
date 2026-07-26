import * as React from "react";

export type DeviceTier = "mobile" | "tablet" | "desktop";

function computeTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (width < 768) return "mobile";
  if (isTouch || width < 1024) return "tablet";
  return "desktop";
}

/**
 * Classifies the current viewport as "mobile", "tablet" or "desktop" using both
 * width and pointer type — a touch device stays in the tablet tier even in
 * landscape (width >= 1024), so it never gets the mouse-driven desktop window chrome.
 */
export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = React.useState<DeviceTier>(computeTier);

  React.useEffect(() => {
    const handleChange = () => setTier(computeTier());
    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);
    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, []);

  return tier;
}
