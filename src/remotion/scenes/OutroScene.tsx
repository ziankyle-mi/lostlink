import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const logoSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const titleSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const taglineSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  const creditSpring = spring({
    frame: frame - 42,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  // End fade to dark at the conclusion of 180 frames (holding for 2+ seconds after speech)
  const fadeOut = interpolate(frame, [155, 178], [1, 0.0], {
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
        opacity: fadeOut,
        overflow: "hidden",
      }}
    >
      <Background glowIntensity={1.2} />

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
        {/* Large, Dignified Dual Seal & Badge Lockup */}
        <div
          style={{
            opacity: logoSpring,
            transform: `scale(${logoSpring})`,
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 28,
          }}
        >
          {/* DLSAU Official Seal */}
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
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
              height: 52,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />

          {/* LostLink Logo Mark */}
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              backgroundColor: "#0d2b1c",
              border: "1.5px solid rgba(255, 255, 255, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.55)",
            }}
          >
            <Img
              src={staticFile(TRAILER_CONFIG.assets.logoBadge)}
              style={{ width: 58, height: 58, objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Big System Name (Solid, majestic white, no split color word) */}
        <h1
          style={{
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 26}px)`,
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 124,
            fontWeight: 800,
            letterSpacing: "0.04em",
            margin: "0 0 16px 0",
            color: "#ffffff",
            textShadow: "0 14px 45px rgba(0, 0, 0, 0.75)",
          }}
        >
          LOSTLINK
        </h1>

        {/* Tagline */}
        <p
          style={{
            opacity: taglineSpring,
            transform: `translateY(${(1 - taglineSpring) * 18}px)`,
            color: TRAILER_CONFIG.colors.canvas,
            fontFamily: TRAILER_CONFIG.fonts.sans,
            fontSize: 32,
            fontWeight: 400,
            margin: "0 0 44px 0",
            letterSpacing: "-0.01em",
          }}
        >
          {TRAILER_CONFIG.system.tagline}
        </p>

        {/* Clean, Dignified Human Credit Lockup — NO pill box, NO neon tags */}
        <div
          style={{
            opacity: creditSpring,
            transform: `translateY(${(1 - creditSpring) * 18}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontFamily: TRAILER_CONFIG.fonts.sans,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Made by Group 3
          </span>
          <span
            style={{
              color: "rgba(245, 241, 230, 0.7)",
              fontFamily: TRAILER_CONFIG.fonts.sans,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            De La Salle Araneta University
          </span>
        </div>
      </div>
    </div>
  );
};
