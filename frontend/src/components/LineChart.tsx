import React from "react";
import { View } from "react-native";
import Svg, { Path, Line, Defs, LinearGradient, Stop } from "react-native-svg";

import { useColors } from "@/src/theme";

interface Props {
  data: number[];
  width: number;
  height: number;
  stroke?: string;
  fillGradient?: boolean;
}

export default function LineChart({ data, width, height, stroke, fillGradient = true }: Props) {
  const colors = useColors();
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return { x, y };
  });
  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const fillPath = `${path} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;
  const strokeColor = stroke || colors.brand;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strokeColor} stopOpacity="0.18" />
          <Stop offset="1" stopColor={strokeColor} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.borderLight} strokeWidth={1} />
      {fillGradient && <Path d={fillPath} fill="url(#grad)" />}
      <Path d={path} stroke={strokeColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
