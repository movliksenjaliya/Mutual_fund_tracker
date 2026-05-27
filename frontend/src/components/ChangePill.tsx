import React from "react";
import { View, Text } from "react-native";

import { useColors, radius, spacing, useTypography } from "@/src/theme";

interface Props {
  changePct: number | null | undefined;
  size?: "sm" | "md";
}

export default function ChangePill({ changePct, size = "sm" }: Props) {
  const colors = useColors();
  const typography = useTypography();
  const isUp = (changePct ?? 0) >= 0;
  const bg = isUp ? colors.positiveBg : colors.negativeBg;
  const fg = isUp ? colors.positive : colors.negative;
  const sign = isUp ? "▲" : "▼";
  const text = changePct == null ? "—" : `${sign} ${Math.abs(changePct).toFixed(2)}%`;
  return (
    <View
      style={{
        borderRadius: radius.pill,
        paddingVertical: 4,
        alignSelf: "flex-start",
        backgroundColor: bg,
        paddingHorizontal: size === "md" ? spacing.p3 : spacing.p2,
      }}
    >
      <Text style={[typography.bodySmall, { color: fg, fontWeight: "700" }]}>{text}</Text>
    </View>
  );
}
