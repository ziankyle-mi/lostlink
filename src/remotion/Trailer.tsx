import React from "react";
import { Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TRAILER_CONFIG } from "./config";
import { HookScene } from "./scenes/HookScene";
import { RevealScene } from "./scenes/RevealScene";
import { FeatureFeedScene } from "./scenes/FeatureFeedScene";
import { FeatureReportScene } from "./scenes/FeatureReportScene";
import { FeatureAdminScene } from "./scenes/FeatureAdminScene";
import { TechStackScene } from "./scenes/TechStackScene";
import { OutroScene } from "./scenes/OutroScene";

export const Trailer: React.FC = () => {
  const { timings, assets } = TRAILER_CONFIG;
  const frame = useCurrentFrame();

  // Dynamic music bed volume with natural breathing dynamics
  // - Hook: soft (0.14) to let the question frame the intro
  // - Reveal: swells smoothly to (0.25) as brand enters
  // - Features & Tech: steady rhythmic pulse (0.20)
  // - Outro: fades out to silence (0.0) so "Made by Group 3" lands with clarity
  const musicVolume = interpolate(
    frame,
    [0, 185, 240, 425, 1195, 1475, 1600, 1655],
    [0.14, 0.16, 0.25, 0.20, 0.20, 0.18, 0.05, 0.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#06180f",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background music track (subtle modern tech ambient bed with dynamic breathing volume) */}
      {assets.musicTrack ? (
        <Audio src={staticFile(assets.musicTrack)} volume={musicVolume} />
      ) : null}

      {/* Scene 1: Hook (0s - 6.17s) + Voiceover */}
      <Sequence
        from={timings.hook.from}
        durationInFrames={timings.hook.duration + 15}
        name="Scene 1: Problem Hook"
      >
        {assets.voiceHook ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceHook)} volume={1.0} />
          </Sequence>
        ) : null}
        <HookScene />
      </Sequence>

      {/* Scene 2: Reveal (6.17s - 14.17s) + Voiceover */}
      <Sequence
        from={timings.reveal.from}
        durationInFrames={timings.reveal.duration + 15}
        name="Scene 2: Brand Reveal & Pitch"
      >
        {assets.voiceReveal ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceReveal)} volume={1.0} />
          </Sequence>
        ) : null}
        <RevealScene />
      </Sequence>

      {/* Scene 3: Feature 1 - Campus Feed (14.17s - 23.00s) + Voiceover */}
      <Sequence
        from={timings.feature1.from}
        durationInFrames={timings.feature1.duration + 15}
        name="Scene 3: Campus Discovery Feed"
      >
        {assets.voiceFeature1 ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceFeature1)} volume={1.0} />
          </Sequence>
        ) : null}
        <FeatureFeedScene />
      </Sequence>

      {/* Scene 4: Feature 2 - Rapid Reporting (23.00s - 31.83s) + Voiceover */}
      <Sequence
        from={timings.feature2.from}
        durationInFrames={timings.feature2.duration + 15}
        name="Scene 4: Rapid Item Reporting"
      >
        {assets.voiceFeature2 ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceFeature2)} volume={1.0} />
          </Sequence>
        ) : null}
        <FeatureReportScene />
      </Sequence>

      {/* Scene 5: Feature 3 - Disciplinary Office (31.83s - 39.83s) + Voiceover */}
      <Sequence
        from={timings.feature3.from}
        durationInFrames={timings.feature3.duration + 15}
        name="Scene 5: Disciplinary Office Console"
      >
        {assets.voiceFeature3 ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceFeature3)} volume={1.0} />
          </Sequence>
        ) : null}
        <FeatureAdminScene />
      </Sequence>

      {/* Scene 6: Modern Tech Stack (39.83s - 49.17s) + Voiceover */}
      <Sequence
        from={timings.techStack.from}
        durationInFrames={timings.techStack.duration + 15}
        name="Scene 6: Modern Tech Stack"
      >
        {assets.voiceTech ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceTech)} volume={1.0} />
          </Sequence>
        ) : null}
        <TechStackScene />
      </Sequence>

      {/* Scene 7: Outro & Made by Group 3 (49.17s - 55.17s) + Voiceover */}
      <Sequence
        from={timings.outro.from}
        durationInFrames={timings.outro.duration}
        name="Scene 7: Outro & Made by Group 3"
      >
        {assets.voiceOutro ? (
          <Sequence from={6}>
            <Audio src={staticFile(assets.voiceOutro)} volume={1.0} />
          </Sequence>
        ) : null}
        <OutroScene />
      </Sequence>
    </div>
  );
};
