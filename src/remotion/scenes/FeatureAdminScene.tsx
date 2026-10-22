import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";
import { Background } from "../components/Background";
import { WindowFrame } from "../components/WindowFrame";
import { HumanCursor } from "../components/HumanCursor";

export const FeatureAdminScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = TRAILER_CONFIG.features.feature3;

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

  // Smooth camera zoom focusing on admin claims queue (BIGGER view)
  const scale = interpolate(frame, [0, 40, 160, 240], [1.12, 1.22, 1.24, 1.25], {
    extrapolateRight: "clamp",
  });
  const contentPanY = interpolate(
    frame,
    [0, 45, 140, 240],
    [-40, -110, -125, -135],
    { extrapolateRight: "clamp" },
  );
  const contentPanX = interpolate(
    frame,
    [0, 45, 140, 240],
    [0, 40, 45, 50],
    { extrapolateRight: "clamp" },
  );

  // Smooth exit crossfade
  const exitOpacity = interpolate(frame, [233, 253], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Smooth 15-frame entry crossfade from previous scene
  const entryOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 100% HUMAN INTERACTION TRAJECTORY (Viewport coordinates) ---
  // - Review button on row 1: x: 1190, y: 445
  // - Approve button in dossier: x: 900, y: 450

  let cursorX = 1450;
  let cursorY = 220;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;
  let clickFrame: number | undefined = undefined;

  if (frame >= 12 && frame < 88) {
    cursorOpacity = interpolate(frame, [12, 22], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [18, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1450 + (1190 - 1450) * ease;
    cursorY = 220 + (445 - 220) * ease;
    if (frame >= 70) cursorType = "pointer";
  } else if (frame >= 88 && frame < 120) {
    cursorOpacity = 1;
    cursorX = 1190;
    cursorY = 445;
    cursorType = "pointer";
    clickFrame = 88;
  } else if (frame >= 120 && frame < 160) {
    cursorOpacity = 1;
    const t = interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1190 + (900 - 1190) * ease;
    cursorY = 445 + (450 - 445) * ease;
    if (frame >= 146) cursorType = "pointer";
    if (frame >= 155) clickFrame = 155;
  } else if (frame >= 160) {
    cursorOpacity = interpolate(frame, [220, 235], [1, 0], { extrapolateRight: "clamp" });
    cursorX = 900;
    cursorY = 450;
    cursorType = "pointer";
  }

  // Interactive Verification modal spring
  const isReviewOpen = frame >= 88;
  const reviewSpring = spring({
    frame: frame - 88,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  // Approved state triggered at frame 155
  const isApproved = frame >= 155;
  const approvedSpring = spring({
    frame: frame - 155,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: entryOpacity * exitOpacity,
        overflow: "hidden",
      }}
    >
      <Background glowIntensity={1.0} />

      {/* Sleek Top Scene Header */}
      <div
        style={{
          position: "absolute",
          top: 24,
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
            fontSize: 34,
            fontWeight: 700,
            margin: "0 0 6px 0",
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
            fontSize: 16,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {cfg.caption}
        </p>
      </div>

      {/* Big Browser Window (1840px x 930px) */}
      <div
        style={{
          position: "absolute",
          top: 104,
          left: "50%",
          transform: `translateX(-50%) scale(${windowSpring})`,
          zIndex: 20,
        }}
      >
        <WindowFrame
          imageSrc={cfg.screenshot}
          fallbackSrc={cfg.fallbackImage}
          urlPath="lostlink.dlsau.edu.ph/admin"
          width={1840}
          height={930}
          scale={scale}
          contentPanY={contentPanY}
          contentPanX={contentPanX}
          overlay={
            <>
              {/* INTERACTIVE LAYER 1: Claims to Verify Row Hover Effect */}
              {frame >= 60 && !isReviewOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 425,
                    left: 210,
                    width: 1040,
                    height: 54,
                    backgroundColor: "rgba(22, 79, 56, 0.08)",
                    border: "1.5px solid #164f38",
                    borderRadius: 12,
                    boxShadow: "0 4px 16px rgba(22, 79, 56, 0.15)",
                    pointerEvents: "none",
                    zIndex: 25,
                  }}
                />
              )}

              {/* INTERACTIVE LAYER 2: Verification Dossier Modal / Action Drawer in viewport */}
              {isReviewOpen && !isApproved && (
                <div
                  style={{
                    position: "absolute",
                    top: 250,
                    left: 650,
                    width: 500,
                    backgroundColor: "#ffffff",
                    border: "2px solid #164f38",
                    borderRadius: 20,
                    padding: "24px 28px",
                    boxShadow: "0 28px 70px rgba(0, 0, 0, 0.35)",
                    transform: `scale(${reviewSpring})`,
                    zIndex: 45,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#164f38",
                        backgroundColor: "#e8f2ec",
                        padding: "4px 12px",
                        borderRadius: 14,
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                      }}
                    >
                      CLAIM DOSSIER #DLSAU-1042
                    </span>
                    <span style={{ fontSize: 13, color: "#818181", fontFamily: TRAILER_CONFIG.fonts.sans }}>
                      DO Custody Verification
                    </span>
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
                      Fonte Gabriel Brian F. (2023-0142)
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#413e39",
                        fontFamily: TRAILER_CONFIG.fonts.sans,
                        marginTop: 4,
                        lineHeight: 1.45,
                      }}
                    >
                      Proof Description: "Dark gray wireless mouse, engraved initial 'FB' on base plate."
                    </div>
                  </div>

                  {/* Action Button that human cursor clicks */}
                  <div
                    style={{
                      marginTop: 8,
                      backgroundColor: frame >= 150 ? "#0e3b29" : "#164f38",
                      color: "#ffffff",
                      borderRadius: 12,
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      boxShadow: "0 6px 18px rgba(22, 79, 56, 0.3)",
                      transform: frame >= 155 && frame <= 165 ? "scale(0.97)" : "scale(1)",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span>✓ Confirm & Release Custody</span>
                  </div>
                </div>
              )}

              {/* INTERACTIVE LAYER 3: Approved Success Banner & Live Audit Log */}
              {isApproved && (
                <>
                  {/* Row approved pill replacement */}
                  <div
                    style={{
                      position: "absolute",
                      top: 432,
                      left: 890,
                      backgroundColor: "#164f38",
                      color: "#d8ef8c",
                      borderRadius: 20,
                      padding: "6px 18px",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      transform: `scale(${approvedSpring})`,
                      boxShadow: "0 4px 14px rgba(22, 79, 56, 0.3)",
                      zIndex: 35,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>✓ Verified & Released</span>
                  </div>

                  {/* Live Audit Log Toast Notification in top right */}
                  <div
                    style={{
                      position: "absolute",
                      top: 40,
                      right: 60,
                      backgroundColor: "#0d2b1c",
                      color: "#ffffff",
                      border: "2px solid #d8ef8c",
                      borderRadius: 16,
                      padding: "14px 22px",
                      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      transform: `scale(${approvedSpring})`,
                      zIndex: 45,
                    }}
                  >
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
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                    >
                      ⚡
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#d8ef8c",
                        }}
                      >
                        Live Audit Trail Entry
                      </div>
                      <div
                        style={{
                          fontFamily: TRAILER_CONFIG.fonts.sans,
                          fontSize: 13,
                          color: "rgba(245, 241, 230, 0.9)",
                        }}
                      >
                        Claim #1042 verified • Custody released to student
                      </div>
                    </div>
                  </div>
                </>
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
