// Design tokens — light & dark palettes, with a swap-on-toggle hook.
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const STORAGE_KEY = "mft_theme";

export const lightColors = {
  bg: "#F9F8F6",
  bgSecondary: "#F0EFE9",
  surface: "#FFFFFF",
  brand: "#2C4C3B",
  brandSoft: "#A8C3B3",
  accent: "#B94A3E",
  positive: "#347A5A",
  positiveBg: "#EAF2EE",
  negative: "#B94A3E",
  negativeBg: "#F8EAE9",
  warning: "#D9822B",
  info: "#4A6E8C",
  textPrimary: "#1C1C1A",
  textSecondary: "#6C6A65",
  textTertiary: "#9C9A95",
  textInverse: "#FFFFFF",
  borderLight: "#E5E3DB",
  borderMedium: "#D1CFCE",
};

export const darkColors: typeof lightColors = {
  bg: "#0E1311",
  bgSecondary: "#161C19",
  surface: "#1A211D",
  brand: "#7DB89C",
  brandSoft: "#3A5A4A",
  accent: "#E07568",
  positive: "#7DB89C",
  positiveBg: "#1B2C24",
  negative: "#E07568",
  negativeBg: "#2C1F1D",
  warning: "#E0A368",
  info: "#7AA6C9",
  textPrimary: "#F2EFE6",
  textSecondary: "#A8A59E",
  textTertiary: "#6B6862",
  textInverse: "#0E1311",
  borderLight: "#26302B",
  borderMedium: "#3A4640",
};

export type Scheme = "light" | "dark";

// Module-level mutable state with subscription support
let currentScheme: Scheme = "light";
const listeners = new Set<() => void>();

if (Platform.OS === "web" && typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Scheme | null;
    if (saved === "dark" || saved === "light") {
      currentScheme = saved;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      currentScheme = "dark";
    }
  } catch {}
}

export function getScheme(): Scheme {
  return currentScheme;
}

export function setScheme(s: Scheme) {
  currentScheme = s;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
      document.documentElement.style.backgroundColor = s === "dark" ? darkColors.bg : lightColors.bg;
    } catch {}
  }
  listeners.forEach((l) => l());
}

export function useScheme(): Scheme {
  const [, force] = useState({});
  useEffect(() => {
    const cb = () => force({});
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return currentScheme;
}

export function useColors() {
  const s = useScheme();
  return s === "dark" ? darkColors : lightColors;
}

// Legacy single-export for backwards compat (always returns light at import time).
// Screens should migrate to `const colors = useColors()` to react to toggles.
export const colors = lightColors;

export const spacing = {
  p1: 4, p2: 8, p3: 12, p4: 16, p6: 24, p8: 32, p10: 40, p12: 48,
};

export const radius = { sm: 4, md: 8, lg: 16, xl: 24, pill: 9999 };

export function makeTypography(c: typeof lightColors) {
  return {
    h1: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5, fontWeight: "800" as const, color: c.textPrimary },
    h2: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3, fontWeight: "700" as const, color: c.textPrimary },
    h3: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2, fontWeight: "600" as const, color: c.textPrimary },
    h4: { fontSize: 18, lineHeight: 24, letterSpacing: -0.1, fontWeight: "600" as const, color: c.textPrimary },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const, color: c.textPrimary },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const, color: c.textPrimary },
    bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const, color: c.textSecondary },
    overline: {
      fontSize: 10, lineHeight: 14, letterSpacing: 1.2,
      fontWeight: "700" as const, color: c.textSecondary,
      textTransform: "uppercase" as const,
    },
    financialLarge: { fontSize: 36, lineHeight: 44, letterSpacing: -1, fontWeight: "700" as const, color: c.textPrimary },
  };
}

export const typography = makeTypography(lightColors);

export function useTypography() {
  const c = useColors();
  return makeTypography(c);
}
