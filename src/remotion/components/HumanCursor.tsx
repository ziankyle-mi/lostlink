import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
  type?: "default" | "pointer" | "text";
  isClick?: boolean;
}

interface HumanCursorProps {
  x: number;
  y: number;
  type?: "default" | "pointer" | "text";
  isClicking?: boolean;
  clickFrame?: number;
  opacity?: number;
  scale?: number;
  label?: string;
}

export const HumanCursor: React.FC<HumanCursorProps> = ({
  x,
  y,
  type = "default",
  isClicking = false,
  clickFrame,
  opacity = 1,
  scale = 1,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle human idle breathing micro-motion
  const microX = Math.sin(frame / 7) * 0.8;
  const microY = Math.cos(frame / 9) * 0.8;

  // Click bounce animation if clickFrame is provided
  let clickScale = 1;
  let rippleScale = 0;
  let rippleOpacity = 0;

  if (clickFrame !== undefined && frame >= clickFrame) {
    const elapsed = frame - clickFrame;
    if (elapsed >= 0 && elapsed <= 20) {
      // Scale down briefly on click, then spring back
      clickScale = interpolate(elapsed, [0, 3, 10], [1, 0.84, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

      // Expanding tactile ripple
      rippleScale = interpolate(elapsed, [0, 16], [0.3, 2.4], {
        extrapolateRight: "clamp",
      });
      rippleOpacity = interpolate(elapsed, [0, 4, 16], [0.9, 0.7, 0], {
        extrapolateRight: "clamp",
      });
    }
  } else if (isClicking) {
    clickScale = 0.85;
  }

  const finalScale = scale * clickScale;

  return (
    <div
      style={{
        position: "absolute",
        left: x + microX,
        top: y + microY,
        zIndex: 100,
        pointerEvents: "none",
        opacity,
        transform: `translate(-2px, -2px) scale(${finalScale})`,
        transformOrigin: "top left",
        transition: "filter 0.15s ease",
        filter: "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))",
      }}
    >
      {/* Click Tactile Ripple Wave */}
      {rippleOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            width: 32,
            height: 32,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${rippleScale})`,
            border: "2px solid #d8ef8c",
            backgroundColor: "rgba(216, 239, 140, 0.25)",
            opacity: rippleOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Realistic Modern Pointer / Arrow Cursor */}
      {type === "pointer" ? (
        // Hand pointer
        <svg
          width="26"
          height="28"
          viewBox="0 0 24 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.5 2C7.67 2 7 2.67 7 3.5V13.8L5.7 12.5C5.12 11.92 4.18 11.92 3.6 12.5C3.02 13.08 3.02 14.02 3.6 14.6L9.6 20.6C10.73 21.73 12.26 22.36 13.85 22.36H16.5C19.54 22.36 22 19.9 22 16.86V10.5C22 9.67 21.33 9 20.5 9C20.25 9 20.02 9.06 19.82 9.17C19.5 8.47 18.8 8 18 8C17.65 8 17.32 8.12 17.06 8.32C16.71 7.72 16.06 7.33 15.33 7.33C15.02 7.33 14.73 7.42 14.47 7.57C14.15 6.94 13.5 6.5 12.75 6.5C12.5 6.5 12.26 6.56 12.04 6.67V3.5C12.04 2.67 11.37 2 10.54 2C9.71 2 8.5 2 8.5 2Z"
            fill="#ffffff"
            stroke="#164f38"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : type === "text" ? (
        // I-Beam cursor
        <svg
          width="16"
          height="24"
          viewBox="0 0 16 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 2H12M8 2V22M4 22H12M6 8H10M6 16H10"
            stroke="#164f38"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M4 2H12M8 2V22M4 22H12"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Standard Precision Pointer Arrow
        <svg
          width="24"
          height="26"
          viewBox="0 0 24 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 2L10.5 22L13.8 14.2L21.6 11.8L3 2Z"
            fill="#ffffff"
            stroke="#113b28"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Floating Action Pill Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 14,
            backgroundColor: "#0d2b1c",
            color: "#d8ef8c",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            padding: "3px 10px",
            borderRadius: 12,
            border: "1px solid rgba(216, 239, 140, 0.4)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
