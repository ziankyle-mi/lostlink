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

  // Cinematic zoom directly into the live FilterBar and Cards (BIGGER display)
  const scale = interpolate(frame, [0, 40, 160, 265], [1.20, 1.35, 1.38, 1.40], {
    extrapolateRight: "clamp",
  });
  const contentPanY = interpolate(
    frame,
    [0, 45, 140, 265],
    [-120, -560, -580, -600],
    { extrapolateRight: "clamp" },
  );

  // Smooth exit crossfade
  const exitOpacity = interpolate(frame, [242, 264], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 100% HUMAN MOUSE INTERACTION TRAJECTORY ---
  // Step 1 (Frames 20-80): Mouse glides naturally to Category pill on FilterBar (x: 620, y: 275)
  // Step 2 (Frame 86): Human clicks Category Filter pill ("Electronics")
  // Step 3 (Frames 105-165): Mouse moves down across cards to inspect "Claim this item"
  // Step 4 (Frame 185): Human clicks "Claim this item"
  // Step 5 (Frames 188-250): Claim dossier popup appears with DLSAU verification badge

  let cursorX = 1400;
  let cursorY = 160;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;
  let clickFrame: number | undefined = undefined;

  if (frame >= 20 && frame < 86) {
    cursorOpacity = interpolate(frame, [20, 30], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [28, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1400 + (620 - 1400) * ease;
    cursorY = 160 + (275 - 160) * ease;
    if (frame >= 72) cursorType = "pointer";
  } else if (frame >= 86 && frame < 110) {
    cursorOpacity = 1;
    cursorX = 620;
    cursorY = 275;
    cursorType = "pointer";
    clickFrame = 86;
  } else if (frame >= 110 && frame < 185) {
    cursorOpacity = 1;
    const t = interpolate(frame, [110, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    // Glides down to the action button on the featured item card
    cursorX = 620 + (580 - 620) * ease;
    cursorY = 275 + (680 - 275) * ease;
    if (frame >= 165) cursorType = "pointer";
  } else if (frame >= 185) {
    cursorOpacity = interpolate(frame, [240, 255], [1, 0], { extrapolateRight: "clamp" });
    cursorX = 580;
    cursorY = 680;
    cursorType = "pointer";
    clickFrame = 185;
  }

  // Interactive Filter Pill Active state (triggers at frame 86 on human click)
  const isFilterActive = frame >= 86;
  const filterPillSpring = spring({
    frame: frame - 86,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  // Interactive Card Hover & Claim confirmation
  const isCardHovered = frame >= 160;
  const isClaimSubmitted = frame >= 186;
  const claimModalSpring = spring({
    frame: frame - 186,
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

      {/* Sleek Top Scene Header (Compact, elegant, leaving full room for the BIG window) */}
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

      {/* Much Bigger Browser Window (1840px x 940px) */}
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
        >
          {/* INTERACTIVE LAYER 1: Dynamic FilterBar Pill Activation */}
          {isFilterActive && (
            <div
              style={{
                position: "absolute",
                top: 290,
                left: 420,
                backgroundColor: "#164f38",
                color: "#ffffff",
                border: "1.5px solid #d8ef8c",
                borderRadius: 20,
                padding: "6px 18px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: TRAILER_CONFIG.fonts.sans,
                boxShadow: "0 4px 16px rgba(22, 79, 56, 0.4)",
                transform: `scale(${filterPillSpring})`,
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              <span>⚡ Category: Electronics</span>
              <span
                style={{
                  backgroundColor: "#d8ef8c",
                  color: "#082e1a",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                ✓
              </span>
            </div>
          )}

          {/* INTERACTIVE LAYER 2: Live Filter Tag Floating Chip */}
          {isFilterActive && frame < 180 && (
            <div
              style={{
                position: "absolute",
                top: 292,
                left: 640,
                backgroundColor: "rgba(8, 46, 26, 0.92)",
                color: "#d8ef8c",
                border: "1px solid rgba(216, 239, 140, 0.3)",
                borderRadius: 14,
                padding: "4px 12px",
                fontSize: 12,
                fontFamily: TRAILER_CONFIG.fonts.sans,
                fontWeight: 600,
                opacity: filterPillSpring,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              }}
            >
              Filtering 4 verified campus items in real-time
            </div>
          )}

          {/* INTERACTIVE LAYER 3: Hover Ring on Card */}
          {isCardHovered && !isClaimSubmitted && (
            <div
              style={{
                position: "absolute",
                top: 450,
                left: 380,
                width: 320,
                height: 240,
                border: "2px solid #164f38",
                borderRadius: 16,
                boxShadow: "0 12px 30px rgba(22, 79, 56, 0.22)",
                pointerEvents: "none",
                transition: "all 0.2s ease",
              }}
            />
          )}

          {/* INTERACTIVE LAYER 4: Claim Confirmation Overlay Toast */}
          {isClaimSubmitted && (
            <div
              style={{
                position: "absolute",
                top: 470,
                left: 360,
                backgroundColor: "#ffffff",
                border: "1.5px solid #164f38",
                borderRadius: 18,
                padding: "16px 22px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                transform: `scale(${claimModalSpring})`,
                zIndex: 40,
                maxWidth: 360,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    backgroundColor: "#164f38",
                    color: "#d8ef8c",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    color: "#082e1a",
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                  }}
                >
                  Claim Verification Dossier
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#413e39",
                  fontFamily: TRAILER_CONFIG.fonts.sans,
                  lineHeight: 1.4,
                }}
              >
                Forwarded to Disciplinary Office. Status visible under student profile.
              </p>
            </div>
          )}

          {/* Real Human Cursor with natural movement & click ripple */}
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
