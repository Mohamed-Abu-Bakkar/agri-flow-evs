export type HapticImpact = "light" | "medium" | "heavy";

const IMPACT_PATTERNS: Record<HapticImpact, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: [40, 20, 40],
};

export function useHaptic() {
  const impact = (style: HapticImpact = "light") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(IMPACT_PATTERNS[style]);
    }
  };

  return { impact };
}
