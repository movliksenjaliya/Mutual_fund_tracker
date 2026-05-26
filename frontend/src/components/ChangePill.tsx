import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/src/theme";

interface Props {
  changePct: number | null | undefined;
  size?: "sm" | "md";
}

export default function ChangePill({ changePct, size = "sm" }: Props) {
  const isUp = (changePct ?? 0) >= 0;
  const bg = isUp ? colors.positiveBg : colors.negativeBg;
  const fg = isUp ? colors.positive : colors.negative;
  const sign = isUp ? "▲" : "▼";
  const text = changePct == null ? "—" : `${sign} ${Math.abs(changePct).toFixed(2)}%`;
  return (
    <View style={[styles.pill, { backgroundColor: bg, paddingHorizontal: size === "md" ? spacing.p3 : spacing.p2 }]}>
      <Text style={[typography.bodySmall, { color: fg, fontWeight: "700" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
