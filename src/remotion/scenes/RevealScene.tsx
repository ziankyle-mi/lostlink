import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";

export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const logoSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const institutionSpring = spring({
    frame: frame - 16,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const nameSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const pitchSpring = spring({
    frame: frame - 38,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  // Smooth subtle continuous scale across the full 240 frames
  const zoom = interpolate(frame, [0, 240], [0.97, 1.03], {
    extrapolateRight: "clamp",
  });

  // Cinematic 22-frame exit fade at the end of 240 frames
  const exitOpacity = interpolate(frame, [231, 253], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Smooth 15-frame entry crossfade from previous scene
  const entryOpacity = interpolate(frame, [0, 15], [0, 1], {
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
        opacity: entryOpacity * exitOpacity,
        transform: `scale(${zoom})`,
      }}
    >
      <Background glowIntensity={1.1} />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1500,
          padding: "0 60px",
        }}
      >
        {/* Dignified Dual Crest Lockup (No pill border) */}
        <div
          style={{
            opacity: logoSpring,
            transform: `scale(${logoSpring})`,
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginBottom: 28,
          }}
        >
          {/* DLSAU Official Seal */}
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
              padding: 8,
            }}
          >
            <Img
              src={staticFile(TRAILER_CONFIG.assets.dlsauLogo)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              width: 2,
              height: 48,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />

          {/* LostLink Logo Mark */}
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: 22,
              backgroundColor: "#0d2b1c",
              border: "1.5px solid rgba(255, 255, 255, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Img
              src={staticFile(TRAILER_CONFIG.assets.logoBadge)}
              style={{ width: 52, height: 52, objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Institution Name */}
        <div
          style={{
            opacity: institutionSpring,
            transform: `translateY(${(1 - institutionSpring) * 16}px)`,
            color: "rgba(245, 241, 230, 0.75)",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: TRAILER_CONFIG.fonts.sans,
            marginBottom: 16,
          }}
        >
          {TRAILER_CONFIG.system.institution}
        </div>

        {/* Big Brand Title — commanding, solid, no weird split word highlight */}
        <h1
          style={{
            opacity: nameSpring,
            transform: `translateY(${(1 - nameSpring) * 28}px)`,
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 124,
            fontWeight: 800,
            letterSpacing: "0.04em",
            margin: "0 0 24px 0",
            color: "#ffffff",
            textShadow: "0 14px 45px rgba(0, 0, 0, 0.75)",
          }}
        >
          LOSTLINK
        </h1>

        {/* Pitch Statement */}
        <p
          style={{
            opacity: pitchSpring,
            transform: `translateY(${(1 - pitchSpring) * 20}px)`,
            color: TRAILER_CONFIG.colors.canvas,
            fontFamily: TRAILER_CONFIG.fonts.sans,
            fontSize: 34,
            fontWeight: 400,
            maxWidth: 1100,
            margin: 0,
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
          }}
        >
          {TRAILER_CONFIG.system.oneLinePitch}
        </p>
      </div>
    </div>
  );
};
