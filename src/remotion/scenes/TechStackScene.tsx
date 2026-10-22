import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";
import { HumanCursor } from "../components/HumanCursor";

export const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance
  const headerSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Human Cursor Trajectory over Architecture Cards
  // Glides to Supabase (x: 390, y: 650) to inspect database & auth layer
  let cursorX = 1450;
  let cursorY = 880;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;

  if (frame >= 35 && frame < 75) {
    cursorOpacity = interpolate(frame, [35, 48], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [40, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1450 + (390 - 1450) * ease;
    cursorY = 880 + (650 - 880) * ease;
    if (frame >= 65) cursorType = "pointer";
  } else if (frame >= 75 && frame <= 190) {
    cursorOpacity = 1;
    cursorX = 390;
    cursorY = 650;
    cursorType = "pointer";
  } else if (frame > 190 && frame < 240) {
    cursorOpacity = interpolate(frame, [220, 240], [1, 0], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [190, 230], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 390 + (960 - 390) * ease;
    cursorY = 650 + (850 - 650) * ease;
    cursorType = "default";
  }

  // Smooth 22-frame exit crossfade at end of 280 frames
  const exitOpacity = interpolate(frame, [270, 292], [1, 0], {
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
        overflow: "hidden",
      }}
    >
      <Background glowIntensity={1.0} />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1680,
          width: "100%",
          padding: "0 60px",
        }}
      >
        {/* Large, authoritative title (No AI slop pill badge) */}
        <h2
          style={{
            opacity: headerSpring,
            transform: `translateY(${(1 - headerSpring) * 24}px)`,
            color: "#ffffff",
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            margin: "0 0 52px 0",
            textShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
          }}
        >
          Engineered for Speed, Security & Scale
        </h2>

        {/* Big 1680px Expansive 6-Card Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 28,
            width: "100%",
            maxWidth: 1680,
          }}
        >
          {TRAILER_CONFIG.techStack.map((tech, index) => {
            const cardSpring = spring({
              frame: frame - (8 + index * 4),
              fps,
              config: { damping: 14, mass: 0.7, stiffness: 120 },
            });

            // Interactive human inspection on Supabase (index 3)
            const isHovered = index === 3 && frame >= 75 && frame <= 190;

            return (
              <div
                key={tech.name}
                style={{
                  opacity: cardSpring,
                  transform: `scale(${cardSpring * (isHovered ? 1.04 : 1)}) translateY(${(1 - cardSpring) * 16 + (isHovered ? -8 : 0)}px)`,
                  backgroundColor: isHovered ? "rgba(14, 52, 34, 0.95)" : "rgba(10, 38, 24, 0.85)",
                  border: isHovered
                    ? "2px solid #d8ef8c"
                    : "1.5px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: 22,
                  padding: "32px 34px",
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  boxShadow: isHovered
                    ? "0 24px 50px -10px rgba(216, 239, 140, 0.25)"
                    : "0 16px 35px -10px rgba(0, 0, 0, 0.6)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Tech Icon Container */}
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 18,
                    backgroundColor: isHovered
                      ? "rgba(216, 239, 140, 0.15)"
                      : "rgba(255, 255, 255, 0.08)",
                    border: `1.5px solid ${isHovered ? "#d8ef8c" : "rgba(255, 255, 255, 0.14)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    flexShrink: 0,
                  }}
                >
                  {tech.icon}
                </div>

                {/* Tech Details */}
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: 28,
                        fontWeight: 700,
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {tech.name}
                    </span>
                    {isHovered && (
                      <span
                        style={{
                          backgroundColor: "#d8ef8c",
                          color: "#082e1a",
                          fontSize: 12,
                          fontWeight: 800,
                          borderRadius: 12,
                          padding: "3px 10px",
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      color: isHovered ? "#ffffff" : "rgba(245, 241, 230, 0.78)",
                      fontSize: 17,
                      fontWeight: 500,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                    }}
                  >
                    {tech.role}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human Cursor exploring architecture */}
      <HumanCursor
        x={cursorX}
        y={cursorY}
        type={cursorType}
        opacity={cursorOpacity}
        scale={1.15}
      />
    </div>
  );
};
