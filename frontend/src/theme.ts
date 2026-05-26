// Design tokens from /app/design_guidelines.json
export const colors = {
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

export const spacing = {
  p1: 4,
  p2: 8,
  p3: 12,
  p4: 16,
  p6: 24,
  p8: 32,
  p10: 40,
  p12: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const typography = {
  h1: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5, fontWeight: "800" as const, color: colors.textPrimary },
  h2: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3, fontWeight: "700" as const, color: colors.textPrimary },
  h3: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2, fontWeight: "600" as const, color: colors.textPrimary },
  h4: { fontSize: 18, lineHeight: 24, letterSpacing: -0.1, fontWeight: "600" as const, color: colors.textPrimary },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const, color: colors.textPrimary },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const, color: colors.textPrimary },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const, color: colors.textSecondary },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
  },
  financialLarge: { fontSize: 36, lineHeight: 44, letterSpacing: -1, fontWeight: "700" as const, color: colors.textPrimary },
};
