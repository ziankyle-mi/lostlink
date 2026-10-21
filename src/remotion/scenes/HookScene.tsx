import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline entrance
  const titleSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Subtext entrance
  const subSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  // Smooth cinematic exit transition at end of 185-frame scene
  const exitOpacity = interpolate(frame, [160, 182], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [160, 182], [1, 0.97], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Floating campus item pills micro-animations
  const float1 = Math.sin(frame / 20) * 12;
  const float2 = Math.cos(frame / 22) * 14;
  const float3 = Math.sin(frame / 24 + 1) * 10;
  const float4 = Math.cos(frame / 18 + 2) * 12;

  const itemSpring1 = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const itemSpring2 = spring({ frame: frame - 42, fps, config: { damping: 14, mass: 0.7 } });
  const itemSpring3 = spring({ frame: frame - 54, fps, config: { damping: 14, mass: 0.7 } });
  const itemSpring4 = spring({ frame: frame - 66, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      <Background glowIntensity={1.0} />

      {/* Floating Campus Item Context Badges */}
      <div
        style={{
          position: "absolute",
          top: 180 + float1,
          left: 180,
          opacity: itemSpring1 * 0.75,
          transform: `scale(${itemSpring1})`,
          backgroundColor: "rgba(10, 38, 24, 0.7)",
          border: "1px solid rgba(216, 239, 140, 0.25)",
          borderRadius: 24,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "rgba(245, 241, 230, 0.9)",
          fontFamily: TRAILER_CONFIG.fonts.sans,
          fontSize: 16,
          fontWeight: 600,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span>🎧</span>
        <span>AirPods Pro • St. Benilde</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 220 + float2,
          right: 200,
          opacity: itemSpring2 * 0.75,
          transform: `scale(${itemSpring2})`,
          backgroundColor: "rgba(10, 38, 24, 0.7)",
          border: "1px solid rgba(216, 239, 140, 0.25)",
          borderRadius: 24,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "rgba(245, 241, 230, 0.9)",
          fontFamily: TRAILER_CONFIG.fonts.sans,
          fontSize: 16,
          fontWeight: 600,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span>🧴</span>
        <span>Hydro Flask 32oz • Gym Bldg</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 200 + float3,
          left: 220,
          opacity: itemSpring3 * 0.75,
          transform: `scale(${itemSpring3})`,
          backgroundColor: "rgba(10, 38, 24, 0.7)",
          border: "1px solid rgba(216, 239, 140, 0.25)",
          borderRadius: 24,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "rgba(245, 241, 230, 0.9)",
          fontFamily: TRAILER_CONFIG.fonts.sans,
          fontSize: 16,
          fontWeight: 600,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span>💳</span>
        <span>DLSAU Student ID • Admin Hall</span>
      </div>

      <div
        style={{
          position: "absolute",
          top: 200 + float4,
          right: 220,
          opacity: itemSpring4 * 0.75,
          transform: `scale(${itemSpring4})`,
          backgroundColor: "rgba(10, 38, 24, 0.7)",
          border: "1px solid rgba(216, 239, 140, 0.25)",
          borderRadius: 24,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "rgba(245, 241, 230, 0.9)",
          fontFamily: TRAILER_CONFIG.fonts.sans,
          fontSize: 16,
          fontWeight: 600,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span>📟</span>
        <span>TI-84 Calculator • Library</span>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1550,
          textAlign: "center",
          padding: "0 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Large, authoritative headline */}
        <h1
          style={{
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 32}px)`,
            color: "#ffffff",
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 108,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            margin: "0 0 28px 0",
            textShadow: "0 12px 40px rgba(0, 0, 0, 0.7)",
          }}
        >
          Lost something on campus?
        </h1>

        {/* Clean, spacious subtext */}
        <p
          style={{
            opacity: subSpring,
            transform: `translateY(${(1 - subSpring) * 20}px)`,
            color: "rgba(245, 241, 230, 0.88)",
            fontFamily: TRAILER_CONFIG.fonts.sans,
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.45,
            maxWidth: 960,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Tracking it down shouldn't feel impossible.
        </p>
      </div>
    </div>
  );
};
