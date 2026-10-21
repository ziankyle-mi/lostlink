import React from "react";
import { Composition } from "remotion";
import { Trailer } from "./Trailer";
import { TRAILER_CONFIG } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Trailer"
        component={Trailer}
        durationInFrames={TRAILER_CONFIG.totalFrames}
        fps={TRAILER_CONFIG.fps}
        width={TRAILER_CONFIG.width}
        height={TRAILER_CONFIG.height}
      />
    </>
  );
};
