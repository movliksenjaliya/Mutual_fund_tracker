import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";

export type PieSlice = {
  value: number;
  color: string;
  label?: string;
};

type Props = {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  backgroundColor?: string;
};

/**
 * Donut chart rendered with react-native-svg. Works on iOS, Android & Web.
 * If only one slice has value, renders a full ring (no path arcs).
 */
export default function PieChart({
  data,
  size = 160,
  thickness = 22,
  backgroundColor = "transparent",
}: Props) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - thickness / 2;
  const innerR = radius - thickness / 2;

  if (total <= 0) {
    return <View style={{ width: size, height: size }} />;
  }

  // Single non-zero slice → render full ring with that color (avoid SVG arc edge case).
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length === 1) {
    return (
      <View style={{ width: size, height: size, backgroundColor }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={nonZero[0].color}
            strokeWidth={thickness}
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  let startAngle = -Math.PI / 2; // start at 12 o'clock
  const paths = nonZero.map((slice, idx) => {
    const sliceAngle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    startAngle = endAngle;
    return (
      <Path
        key={idx}
        d={d}
        stroke={slice.color}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="butt"
      />
    );
  });

  return (
    <View style={{ width: size, height: size, backgroundColor }}>
      <Svg width={size} height={size}>
        <G>{paths}</G>
        {/* Hole — purely visual (already cut by stroke radius) */}
        <Circle cx={cx} cy={cy} r={innerR} fill="transparent" />
      </Svg>
    </View>
  );
}
