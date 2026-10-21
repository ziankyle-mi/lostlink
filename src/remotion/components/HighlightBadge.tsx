import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TRAILER_CONFIG } from "../config";

interface HighlightBadgeProps {
  label: string;
  coords: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  pillPosition?: "top" | "bottom" | "inside-top" | "inside-bottom";
  delay?: number;
}

export const HighlightBadge: React.FC<HighlightBadgeProps> = ({
  label,
  coords,
  pillPosition = "bottom",
  delay = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      mass: 0.7,
      stiffness: 120,
    },
  });

  if (frame < delay) return null;

  const pulse = Math.sin(frame / 8) * 0.1 + 0.9;

  let pillStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: `translateX(-50%) scale(${progress})`,
  };

  if (pillPosition === "bottom") {
    pillStyle.bottom = "-34px";
  } else if (pillPosition === "top") {
    pillStyle.top = "-34px";
  } else if (pillPosition === "inside-top") {
    pillStyle.top = "12px";
  } else if (pillPosition === "inside-bottom") {
    pillStyle.bottom = "12px";
  }

  return (
    <div
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        height: coords.height,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* Subtle pulsing highlight boundary */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1.5px solid ${TRAILER_CONFIG.colors.lime}`,
          borderRadius: 12,
          boxShadow: `0 0 16px rgba(216, 239, 140, 0.25)`,
          opacity: progress * pulse,
        }}
      />

      {/* Minimalist Callout Pill */}
      <div
        style={{
          ...pillStyle,
          backgroundColor: "#082417",
          color: TRAILER_CONFIG.colors.lime,
          border: "1px solid rgba(216, 239, 140, 0.4)",
          borderRadius: 16,
          padding: "5px 14px",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: TRAILER_CONFIG.fonts.sans,
          letterSpacing: "0.03em",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: TRAILER_CONFIG.colors.lime,
          }}
        />
        {label}
      </div>
    </div>
  );
};
