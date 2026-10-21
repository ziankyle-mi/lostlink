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
        {/* Large, authoritative headline — no AI slop pills, no single colored words */}
        <h1
          style={{
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 32}px)`,
            color: "#ffffff",
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 104,
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
