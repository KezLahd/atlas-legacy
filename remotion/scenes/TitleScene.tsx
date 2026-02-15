import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { AtlasIconLogo } from "../shared/AtlasLogo";
import { colors } from "../shared/colors";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();

  // At the end, the logo scales up massively so the brown fills the screen
  const exitZoom = interpolate(frame, [55, 85], [1, 25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => t * t,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f1e8",
      }}
    >
      <div
        style={{
          transform: `scale(${exitZoom})`,
          display: "flex",
          alignItems: "center",
          gap: 25,
          transformOrigin: "60px center",
        }}
      >
        <AtlasIconLogo size={120} />
        <div style={{ fontSize: 120, fontWeight: "bold", display: "flex" }}>
          <span style={{ color: colors.blue }}>at</span>
          <span style={{ color: colors.primary }}>las</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
