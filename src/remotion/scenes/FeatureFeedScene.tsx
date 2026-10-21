import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";
import { WindowFrame } from "../components/WindowFrame";
import { HumanCursor } from "../components/HumanCursor";

export const FeatureFeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = TRAILER_CONFIG.features.feature1;

  // Window entrance
  const windowSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  // Header entrance
  const textSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  // Smooth camera zoom directly into the live FilterBar and Cards (BIGGER display)
  const scale = interpolate(frame, [0, 40, 160, 265], [1.18, 1.25, 1.25, 1.27], {
    extrapolateRight: "clamp",
  });
  const contentPanY = interpolate(
    frame,
    [0, 35, 140, 265],
    [-400, -825, -835, -845],
    { extrapolateRight: "clamp" },
  );

  // Smooth exit crossfade
  const exitOpacity = interpolate(frame, [242, 264], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 100% HUMAN MOUSE INTERACTION TRAJECTORY (Viewport coordinates) ---
  // - Category Filter Pill in screenshot: x: 580, y: 205
  // - Item 1 "Claim this item" button: x: 320, y: 445

  let cursorX = 1350;
  let cursorY = 140;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;
  let clickFrame: number | undefined = undefined;

  if (frame >= 15 && frame < 86) {
    cursorOpacity = interpolate(frame, [15, 25], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [22, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1350 + (580 - 1350) * ease;
    cursorY = 140 + (205 - 140) * ease;
    if (frame >= 68) cursorType = "pointer";
  } else if (frame >= 86 && frame < 115) {
    cursorOpacity = 1;
    cursorX = 580;
    cursorY = 205;
    cursorType = "pointer";
    clickFrame = 86;
  } else if (frame >= 115 && frame < 185) {
    cursorOpacity = 1;
    const t = interpolate(frame, [115, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 580 + (320 - 580) * ease;
    cursorY = 205 + (445 - 205) * ease;
    if (frame >= 165) cursorType = "pointer";
  } else if (frame >= 185) {
    cursorOpacity = interpolate(frame, [240, 255], [1, 0], { extrapolateRight: "clamp" });
    cursorX = 320;
    cursorY = 445;
    cursorType = "pointer";
    clickFrame = 185;
  }

  // Interactive Filter Pill Active state
  const isFilterActive = frame >= 86;
  const filterPillSpring = spring({
    frame: frame - 86,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  // Interactive Card Hover & Claim confirmation
  const isCardHovered = frame >= 165;
  const isClaimSubmitted = frame >= 185;
  const claimModalSpring = spring({
    frame: frame - 185,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: exitOpacity,
        overflow: "hidden",
      }}
    >
      <Background glowIntensity={1.0} />

      {/* Sleek Top Scene Header */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 0,
          right: 0,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          opacity: textSpring,
          transform: `translateY(${(1 - textSpring) * 12}px)`,
        }}
      >
        <h2
          style={{
            color: "#ffffff",
            fontFamily: TRAILER_CONFIG.fonts.serif,
            fontSize: 38,
            fontWeight: 700,
            margin: "0 0 4px 0",
            letterSpacing: "-0.015em",
            textShadow: "0 4px 20px rgba(0,0,0,0.7)",
          }}
        >
          {cfg.title}
        </h2>

        <p
          style={{
            color: "rgba(245, 241, 230, 0.88)",
            fontFamily: TRAILER_CONFIG.fonts.sans,
            fontSize: 18,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {cfg.caption}
        </p>
      </div>

      {/* Big Browser Window (1840px x 940px) */}
      <div
        style={{
          position: "absolute",
          top: 86,
          left: "50%",
          transform: `translateX(-50%) scale(${windowSpring})`,
          zIndex: 20,
        }}
      >
        <WindowFrame
          imageSrc={cfg.screenshot}
          fallbackSrc={cfg.fallbackImage}
          urlPath="lostlink.dlsau.edu.ph"
          width={1840}
          height={940}
          scale={scale}
          contentPanY={contentPanY}
          overlay={
            <>
              {/* INTERACTIVE LAYER 1: Category Filter Pill Pop-in right over FilterBar */}
              {isFilterActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 188,
                    left: 520,
                    backgroundColor: "#164f38",
                    color: "#ffffff",
                    border: "2px solid #d8ef8c",
                    borderRadius: 24,
                    padding: "6px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    boxShadow: "0 8px 25px rgba(22, 79, 56, 0.4)",
                    transform: `scale(${filterPillSpring})`,
                    zIndex: 35,
                  }}
                >
                  <span>⚡ Category: Electronics</span>
                  <span
                    style={{
                      backgroundColor: "#d8ef8c",
                      color: "#082e1a",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                </div>
              )}

              {/* INTERACTIVE LAYER 2: Live Verified Item Cards Grid filling the window */}
              <div
                style={{
                  position: "absolute",
                  top: 265,
                  left: 120,
                  right: 120,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 28,
                  zIndex: 30,
                }}
              >
                {/* Card 1: Apple AirPods Pro */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 18,
                    border: isCardHovered ? "2px solid #164f38" : "1.5px solid rgba(0,0,0,0.08)",
                    boxShadow: isCardHovered
                      ? "0 20px 40px rgba(22, 79, 56, 0.22)"
                      : "0 10px 25px rgba(0, 0, 0, 0.08)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    transform: isCardHovered ? "translateY(-6px) scale(1.02)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        backgroundColor: "#e8f2ec",
                        color: "#164f38",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 12,
                        padding: "4px 12px",
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                      }}
                    >
                      FOUND ITEM
                    </span>
                    <span style={{ fontSize: 13, color: "#818181", fontFamily: TRAILER_CONFIG.fonts.sans }}>
                      Oct 9 • St. Benilde Hall
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 14,
                        backgroundColor: "#eef4ec",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                      }}
                    >
                      🎧
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#082e1a",
                        }}
                      >
                        Apple AirPods Pro (2nd Gen)
                      </div>
                      <div style={{ fontSize: 13, color: "#413e39", fontFamily: TRAILER_CONFIG.fonts.sans, marginTop: 2 }}>
                        White MagSafe case with lanyard loop
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      backgroundColor: isCardHovered ? "#164f38" : "#f2f7f0",
                      color: isCardHovered ? "#ffffff" : "#164f38",
                      borderRadius: 12,
                      padding: "12px",
                      textAlign: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      boxShadow: isCardHovered ? "0 4px 14px rgba(22, 79, 56, 0.3)" : "none",
                      transform: frame >= 185 && frame <= 195 ? "scale(0.96)" : "scale(1)",
                      transition: "all 0.1s ease",
                    }}
                  >
                    Claim this item →
                  </div>
                </div>

                {/* Card 2: Hydro Flask */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 18,
                    border: "1.5px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    opacity: isFilterActive ? 0.45 : 1,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        backgroundColor: "#e8f2ec",
                        color: "#164f38",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 12,
                        padding: "4px 12px",
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                      }}
                    >
                      FOUND ITEM
                    </span>
                    <span style={{ fontSize: 13, color: "#818181", fontFamily: TRAILER_CONFIG.fonts.sans }}>
                      Oct 8 • Agro-Forestry
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 14,
                        backgroundColor: "#f4f1e6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                      }}
                    >
                      🧴
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#082e1a",
                        }}
                      >
                        Hydro Flask 32oz Cobalt Blue
                      </div>
                      <div style={{ fontSize: 13, color: "#413e39", fontFamily: TRAILER_CONFIG.fonts.sans, marginTop: 2 }}>
                        Stainless tumbler with flex straw cap
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      backgroundColor: "#f2f7f0",
                      color: "#164f38",
                      borderRadius: 12,
                      padding: "12px",
                      textAlign: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                    }}
                  >
                    Claim this item →
                  </div>
                </div>

                {/* Card 3: Calculator */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 18,
                    border: "1.5px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    transform: isFilterActive ? "scale(1.02)" : "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        backgroundColor: "#fef3c7",
                        color: "#92400e",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 12,
                        padding: "4px 12px",
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                      }}
                    >
                      LOST ITEM
                    </span>
                    <span style={{ fontSize: 13, color: "#818181", fontFamily: TRAILER_CONFIG.fonts.sans }}>
                      Oct 7 • Library 3F
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 14,
                        backgroundColor: "#eef4ec",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                      }}
                    >
                      📟
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#082e1a",
                        }}
                      >
                        TI-84 Plus CE Calculator
                      </div>
                      <div style={{ fontSize: 13, color: "#413e39", fontFamily: TRAILER_CONFIG.fonts.sans, marginTop: 2 }}>
                        Black color with protective slide cover
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      backgroundColor: "#f2f7f0",
                      color: "#164f38",
                      borderRadius: 12,
                      padding: "12px",
                      textAlign: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                    }}
                  >
                    I found this →
                  </div>
                </div>
              </div>

              {/* INTERACTIVE LAYER 3: Claim Confirmation Toast */}
              {isClaimSubmitted && (
                <div
                  style={{
                    position: "absolute",
                    top: 330,
                    left: 140,
                    width: 440,
                    backgroundColor: "#164f38",
                    color: "#ffffff",
                    border: "2px solid #d8ef8c",
                    borderRadius: 20,
                    padding: "20px 24px",
                    boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transform: `scale(${claimModalSpring})`,
                    zIndex: 50,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        backgroundColor: "#d8ef8c",
                        color: "#082e1a",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                        fontWeight: 700,
                        fontSize: 17,
                        color: "#ffffff",
                      }}
                    >
                      Claim Verification Dossier #4821
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "rgba(245, 241, 230, 0.9)",
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      lineHeight: 1.4,
                    }}
                  >
                    Submitted with student credentials. Disciplinary Office notified for physical custody verification.
                  </p>
                </div>
              )}

              {/* Human Cursor */}
              <HumanCursor
                x={cursorX}
                y={cursorY}
                type={cursorType}
                clickFrame={clickFrame}
                opacity={cursorOpacity}
                scale={1.15}
              />
            </>
          }
        />
      </div>
    </div>
  );
};
