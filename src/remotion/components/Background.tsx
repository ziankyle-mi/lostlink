import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { TRAILER_CONFIG } from "../config";

interface BackgroundProps {
  glowIntensity?: number;
}

export const Background: React.FC<BackgroundProps> = ({
  glowIntensity = 1,
}) => {
  const frame = useCurrentFrame();

  // Gentle, calm ambient pulse
  const pulse = Math.sin(frame / 35) * 0.08 + 0.92;
  const orbY = interpolate(frame, [0, 900], [28, 45], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#06180f",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Matte, deep evergreen background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% ${orbY}%, #113626 0%, #082417 50%, #04140c 100%)`,
          opacity: 0.98,
        }}
      />

      {/* Subtle soft ambient glow in the center */}
      <div
        style={{
          position: "absolute",
          top: `${orbY}%`,
          left: "50%",
          width: 800,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${TRAILER_CONFIG.colors.lime} 0%, rgba(216, 239, 140, 0) 70%)`,
          filter: "blur(160px)",
          opacity: 0.1 * pulse * glowIntensity,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Understated vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 140px rgba(0, 0, 0, 0.75)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
