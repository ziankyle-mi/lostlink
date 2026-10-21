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
  const scale = interpolate(frame, [0, 40, 160, 240], [1.18, 1.30, 1.33, 1.35], {
    extrapolateRight: "clamp",
  });
  const contentPanY = interpolate(
    frame,
    [0, 45, 140, 240],
    [-60, -180, -200, -215],
    { extrapolateRight: "clamp" },
  );
  const contentPanX = interpolate(
    frame,
    [0, 45, 140, 240],
    [0, 60, 70, 75],
    { extrapolateRight: "clamp" },
  );

  // Smooth exit crossfade
  const exitOpacity = interpolate(frame, [218, 238], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- 100% HUMAN INTERACTION TRAJECTORY ---
  // Frames 15-70: Cursor moves from right over to the Claims to Verify table row
  // Frame 88: Click "Review →" on the pending claim
  // Frames 92-150: Verification panel opens; cursor glides to "Approve Claim & Release"
  // Frame 155: Click "Approve Claim & Release"
  // Frames 158-230: Row badge turns green, audit log toast appears

  let cursorX = 1350;
  let cursorY = 220;
  let cursorType: "default" | "pointer" | "text" = "default";
  let cursorOpacity = 0;
  let clickFrame: number | undefined = undefined;

  if (frame >= 12 && frame < 88) {
    cursorOpacity = interpolate(frame, [12, 22], [0, 1], { extrapolateRight: "clamp" });
    const t = interpolate(frame, [18, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1350 + (1080 - 1350) * ease;
    cursorY = 220 + (515 - 220) * ease;
    if (frame >= 72) cursorType = "pointer";
  } else if (frame >= 88 && frame < 120) {
    cursorOpacity = 1;
    cursorX = 1080;
    cursorY = 515;
    cursorType = "pointer";
    clickFrame = 88;
  } else if (frame >= 120 && frame < 160) {
    cursorOpacity = 1;
    const t = interpolate(frame, [120, 152], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    cursorX = 1080 + (980 - 1080) * ease;
    cursorY = 515 + (440 - 515) * ease;
    if (frame >= 148) cursorType = "pointer";
    if (frame >= 155) clickFrame = 155;
  } else if (frame >= 160) {
    cursorOpacity = interpolate(frame, [220, 235], [1, 0], { extrapolateRight: "clamp" });
    cursorX = 980;
    cursorY = 440;
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
          urlPath="lostlink.dlsau.edu.ph/admin"
          width={1840}
          height={940}
          scale={scale}
          contentPanY={contentPanY}
          contentPanX={contentPanX}
        >
          {/* INTERACTIVE LAYER 1: Claims to Verify Row Hover Effect */}
          {frame >= 60 && !isReviewOpen && (
            <div
              style={{
                position: "absolute",
                top: 495,
                left: 320,
                width: 820,
                height: 52,
                backgroundColor: "rgba(22, 79, 56, 0.08)",
                border: "1.5px solid #164f38",
                borderRadius: 10,
                boxShadow: "0 4px 14px rgba(22, 79, 56, 0.15)",
                pointerEvents: "none",
                zIndex: 25,
              }}
            />
          )}

          {/* INTERACTIVE LAYER 2: Verification Dossier Modal / Action Drawer */}
          {isReviewOpen && !isApproved && (
            <div
              style={{
                position: "absolute",
                top: 310,
                left: 640,
                width: 440,
                backgroundColor: "#ffffff",
                border: "2px solid #164f38",
                borderRadius: 18,
                padding: "20px 24px",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
                transform: `scale(${reviewSpring})`,
                zIndex: 45,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#164f38",
                    backgroundColor: "#e8f2ec",
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                  }}
                >
                  CLAIM DOSSIER #DLSAU-1042
                </span>
                <span style={{ fontSize: 12, color: "#818181", fontFamily: TRAILER_CONFIG.fonts.sans }}>
                  DO Admin Intake
                </span>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#082e1a",
                  }}
                >
                  Fonte Gabriel Brian F. (2023-0142)
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#413e39",
                    fontFamily: TRAILER_CONFIG.fonts.sans,
                    marginTop: 4,
                  }}
                >
                  Proof: "Dark gray wireless mouse, engraved initial 'FB' on base."
                </div>
              </div>

              {/* Action Button that human cursor clicks */}
              <div
                style={{
                  marginTop: 6,
                  backgroundColor: frame >= 150 ? "#0e3b29" : "#164f38",
                  color: "#ffffff",
                  borderRadius: 10,
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: TRAILER_CONFIG.fonts.sans,
                  boxShadow: "0 4px 14px rgba(22, 79, 56, 0.3)",
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
                  top: 504,
                  left: 880,
                  backgroundColor: "#164f38",
                  color: "#d8ef8c",
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: TRAILER_CONFIG.fonts.sans,
                  transform: `scale(${approvedSpring})`,
                  boxShadow: "0 4px 12px rgba(22, 79, 56, 0.3)",
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
                  top: 140,
                  right: 80,
                  backgroundColor: "#0d2b1c",
                  color: "#ffffff",
                  border: "1.5px solid #d8ef8c",
                  borderRadius: 14,
                  padding: "12px 18px",
                  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transform: `scale(${approvedSpring})`,
                  zIndex: 45,
                }}
              >
                <span
                  style={{
                    backgroundColor: "#d8ef8c",
                    color: "#082e1a",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  ⚡
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#d8ef8c",
                    }}
                  >
                    Audit Event Recorded
                  </div>
                  <div
                    style={{
                      fontFamily: TRAILER_CONFIG.fonts.sans,
                      fontSize: 12,
                      color: "rgba(245, 241, 230, 0.85)",
                    }}
                  >
                    Custody released by Disciplinary Office
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
        </WindowFrame>
      </div>
    </div>
  );
};
