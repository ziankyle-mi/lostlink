import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";
import { WindowFrame } from "../components/WindowFrame";
import { HumanCursor } from "../components/HumanCursor";

export const FeatureReportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = TRAILER_CONFIG.features.feature2;

  // Window entrance
  const windowSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  // Header caption entrance
  const textSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  // Smooth camera zoom focusing on the modal (BIGGER, highly legible UI)
  const scale = interpolate(frame, [0, 40, 180, 265], [1.18, 1.34, 1.36, 1.38], {
    extrapolateRight: "clamp",
  });
  const contentPanY = interpolate(
    frame,
    [0, 45, 160, 265],
    [-40, -110, -130, -145],
    { extrapolateRight: "clamp" },
  );

  // Smooth exit transition
  const exitOpacity = interpolate(frame, [242, 264], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 100% HUMAN INTERACTION TRAJECTORY ---
  // Coordinates in local transformed image space:
  // - Item Name: x: 740, y: 395
  // - Category:  x: 740, y: 485
  // - Location:  x: 1040, y: 485
  // - Photo:     x: 920, y: 660
  // - Submit:    x: 920, y: 770

  let cursorX = 1400;
  let cursorY = 220;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;
  let clickFrame: number | undefined = undefined;

  if (frame >= 10 && frame < 34) {
    cursorOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [14, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1400 + (740 - 1400) * ease;
    cursorY = 220 + (395 - 220) * ease;
    if (frame >= 26) cursorType = "text";
  } else if (frame >= 34 && frame < 95) {
    cursorOpacity = 1;
    cursorX = 740;
    cursorY = 395;
    cursorType = "text";
    if (frame <= 42) clickFrame = 34;
  } else if (frame >= 95 && frame < 132) {
    cursorOpacity = 1;
    const t = interpolate(frame, [95, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 740;
    cursorY = 395 + (485 - 395) * ease;
    if (frame >= 115) cursorType = "pointer";
    if (frame >= 128) clickFrame = 128;
  } else if (frame >= 132 && frame < 172) {
    cursorOpacity = 1;
    const t = interpolate(frame, [132, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 740 + (1040 - 740) * ease;
    cursorY = 485;
    if (frame >= 155) cursorType = "pointer";
    if (frame >= 165) clickFrame = 165;
  } else if (frame >= 172 && frame < 210) {
    cursorOpacity = 1;
    const t = interpolate(frame, [172, 202], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1040 + (920 - 1040) * ease;
    cursorY = 485 + (705 - 485) * ease;
    if (frame >= 195) cursorType = "pointer";
    if (frame >= 202) clickFrame = 202;
  } else if (frame >= 210) {
    cursorOpacity = interpolate(frame, [240, 255], [1, 0], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [210, 228], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 920;
    cursorY = 705 + (820 - 705) * ease;
    if (frame >= 222) cursorType = "pointer";
    if (frame >= 228) clickFrame = 228;
  }

  // Realistic human typing simulation
  const fullText = "Hydro Flask 32oz Cobalt Blue";
  const typingStart = 38;
  const charsTyped = Math.max(0, Math.min(fullText.length, Math.floor((frame - typingStart) / 1.8)));
  const typedText = fullText.substring(0, charsTyped);
  const showCaret = frame >= 34 && frame < 100 && Math.floor(frame / 6) % 2 === 0;

  // Selected values triggered by human clicks
  const categorySelected = frame >= 128;
  const locationSelected = frame >= 165;
  const photoUploaded = frame >= 202;
  const photoSpring = spring({
    frame: frame - 202,
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  const formSubmitted = frame >= 228;
  const successSpring = spring({
    frame: frame - 228,
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
          urlPath="lostlink.dlsau.edu.ph/report"
          width={1840}
          height={940}
          scale={scale}
          contentPanY={contentPanY}
        >
          {/* INTERACTIVE LAYER 1: Realistic Human Typing into Item Name Field */}
          {frame >= 34 && (
            <div
              style={{
                position: "absolute",
                top: 363,
                left: 665,
                width: 510,
                height: 44,
                backgroundColor: "#ffffff",
                border: "2px solid #164f38",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                fontSize: 15,
                fontFamily: TRAILER_CONFIG.fonts.sans,
                color: "#082e1a",
                fontWeight: 600,
                boxShadow: "0 0 0 3px rgba(22, 79, 56, 0.15)",
                zIndex: 35,
              }}
            >
              <span>{typedText}</span>
              {showCaret && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 18,
                    backgroundColor: "#164f38",
                    marginLeft: 2,
                  }}
                />
              )}
            </div>
          )}

          {/* INTERACTIVE LAYER 2: Live Category Selection */}
          {categorySelected && (
            <div
              style={{
                position: "absolute",
                top: 472,
                left: 660,
                width: 256,
                height: 54,
                backgroundColor: "#ffffff",
                border: "2px solid #164f38",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                fontSize: 14,
                fontFamily: TRAILER_CONFIG.fonts.sans,
                color: "#164f38",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(22, 79, 56, 0.12)",
                zIndex: 35,
              }}
            >
              <span>Bottles & Tumblers</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>✓</span>
            </div>
          )}

          {/* INTERACTIVE LAYER 3: Live Campus Location Selection */}
          {locationSelected && (
            <div
              style={{
                position: "absolute",
                top: 472,
                left: 924,
                width: 256,
                height: 54,
                backgroundColor: "#ffffff",
                border: "2px solid #164f38",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                fontSize: 14,
                fontFamily: TRAILER_CONFIG.fonts.sans,
                color: "#164f38",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(22, 79, 56, 0.12)",
                zIndex: 35,
              }}
            >
              <span>Agro-Forestry Bldg</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>✓</span>
            </div>
          )}

          {/* INTERACTIVE LAYER 4: Photo Drop-In & Proof Verification */}
          {photoUploaded && (
            <div
              style={{
                position: "absolute",
                top: 654,
                left: 660,
                width: 520,
                height: 110,
                backgroundColor: "#ffffff",
                border: "2px dashed #164f38",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                gap: 16,
                transform: `scale(${photoSpring})`,
                boxShadow: "0 10px 30px rgba(22, 79, 56, 0.15)",
                zIndex: 35,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  backgroundColor: "#0d2b1c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d8ef8c",
                  fontSize: 30,
                  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
                  flexShrink: 0,
                }}
              >
                🧴
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    color: "#082e1a",
                  }}
                >
                  hydro_flask_32oz_blue.jpg
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#818181",
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                  }}
                >
                  2.4 MB • High-Resolution Photo Proof
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#164f38",
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                  }}
                >
                  ✓ Ready for Campus Intake Verification
                </span>
              </div>
            </div>
          )}

          {/* INTERACTIVE LAYER 5: Form Submission Success Alert */}
          {formSubmitted && (
            <div
              style={{
                position: "absolute",
                top: 310,
                left: 660,
                width: 520,
                backgroundColor: "#164f38",
                color: "#ffffff",
                border: "2px solid #d8ef8c",
                borderRadius: 18,
                padding: "18px 24px",
                boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transform: `scale(${successSpring})`,
                zIndex: 50,
              }}
            >
              <span
                style={{
                  backgroundColor: "#d8ef8c",
                  color: "#082e1a",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <div>
                <div
                  style={{
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#ffffff",
                    marginBottom: 2,
                  }}
                >
                  Report Published Successfully
                </div>
                <div
                  style={{
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    fontSize: 13,
                    color: "rgba(245, 241, 230, 0.88)",
                  }}
                >
                  Ref #DLSAU-2026-0849 • Live on Campus Discovery Feed
                </div>
              </div>
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
        </WindowFrame>
      </div>
    </div>
  );
};
