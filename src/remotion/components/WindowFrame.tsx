import React from "react";
import { Img, staticFile } from "remotion";
import { TRAILER_CONFIG } from "../config";

interface WindowFrameProps {
  imageSrc: string;
  fallbackSrc?: string;
  urlPath?: string;
  width?: number;
  height?: number;
  scale?: number;
  contentPanY?: number;
  contentPanX?: number;
  windowScale?: number;
  objectFit?: "contain" | "cover" | "fill";
  overlay?: React.ReactNode;
  children?: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  imageSrc,
  fallbackSrc,
  urlPath = "lostlink.dlsau.edu.ph",
  width = 1840,
  height = 930,
  scale = 1,
  contentPanY = 0,
  contentPanX = 0,
  windowScale = 1,
  objectFit = "cover",
  overlay,
  children,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 16,
        backgroundColor: "#0d2117",
        border: "1.5px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 35px 100px -20px rgba(0, 0, 0, 0.9)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transform: `scale(${windowScale})`,
        transformOrigin: "center center",
      }}
    >
      {/* Minimal Realistic Chrome Header Bar */}
      <div
        style={{
          height: 44,
          backgroundColor: "#091c12",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
          position: "relative",
          zIndex: 25,
        }}
      >
        {/* Window controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 95, 86, 0.8)",
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 189, 46, 0.8)",
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: "rgba(39, 201, 63, 0.8)",
            }}
          />
        </div>

        {/* Browser URL bar */}
        <div
          style={{
            flex: 1,
            maxWidth: 560,
            margin: "0 auto",
            height: 26,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.6 }}>🔒</span>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: 13,
              fontFamily: TRAILER_CONFIG.fonts.sans,
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            {urlPath}
          </span>
        </div>

        {/* Institution marker */}
        <span
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            fontSize: 12,
            fontFamily: TRAILER_CONFIG.fonts.sans,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          DLSAU
        </span>
      </div>

      {/* Webpage Content Viewport */}
      <div
        style={{
          position: "relative",
          flex: 1,
          backgroundColor: "#f5f1e6",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: `scale(${scale}) translate(${contentPanX}px, ${contentPanY}px)`,
            transformOrigin: "top center",
          }}
        >
          <Img
            src={staticFile(imageSrc)}
            style={{
              width: "100%",
              height: "auto",
              minHeight: "100%",
              objectFit,
              display: "block",
            }}
            onError={(e) => {
              if (fallbackSrc) {
                (e.target as HTMLImageElement).src = staticFile(fallbackSrc);
              }
            }}
          />

          {children}
        </div>

        {/* Viewport fixed overlay for human cursor and interactive modals */}
        {overlay}
      </div>
    </div>
  );
};
