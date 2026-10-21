import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";

export const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance
  const headerSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Smooth 22-frame exit crossfade at end of 280 frames
  const exitOpacity = interpolate(frame, [255, 277], [1, 0], {
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

        {/* Big 1640px Expansive 6-Card Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            width: "100%",
            maxWidth: 1640,
          }}
        >
          {TRAILER_CONFIG.techStack.map((tech, index) => {
            const cardSpring = spring({
              frame: frame - (10 + index * 4),
              fps,
              config: { damping: 14, mass: 0.7, stiffness: 120 },
            });

            return (
              <div
                key={tech.name}
                style={{
                  opacity: cardSpring,
                  transform: `scale(${cardSpring}) translateY(${(1 - cardSpring) * 16}px)`,
                  backgroundColor: "rgba(10, 38, 24, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 18,
                  padding: "26px 30px",
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  boxShadow: "0 16px 35px -10px rgba(0, 0, 0, 0.6)",
                }}
              >
                {/* Tech Icon Container */}
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    flexShrink: 0,
                  }}
                >
                  {tech.icon}
                </div>

                {/* Tech Details */}
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: 25,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      marginBottom: 4,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {tech.name}
                  </div>
                  <div
                    style={{
                      color: "rgba(245, 241, 230, 0.75)",
                      fontSize: 15,
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
    </div>
  );
};
