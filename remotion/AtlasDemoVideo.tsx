import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { TitleScene } from "./scenes/TitleScene";
import { ResearchScene } from "./scenes/ResearchScene";
import { BrainstormScene } from "./scenes/BrainstormScene";
import { ContentScene } from "./scenes/ContentScene";
import { CalendarScene } from "./scenes/CalendarScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";

export const AtlasDemoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene durations (in seconds * fps)
  const titleDuration = 3 * fps; // 3 seconds
  const researchDuration = 4.5 * fps; // 4.5 seconds
  const brainstormDuration = 5 * fps; // 5 seconds (longer for cloud animation)
  const contentDuration = 7 * fps; // 7 seconds (extra time for rip animation)
  const calendarDuration = 8 * fps; // 8 seconds (page flip + day flick-through + future events)
  const analyticsDuration = 8 * fps; // 8 seconds (cursor + close + logo zoom)

  // Transition duration
  const transitionDuration = 20; // frames

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: "sans-serif",
      }}
    >
      <TransitionSeries>
        {/* Title Scene */}
        <TransitionSeries.Sequence durationInFrames={titleDuration}>
          <TitleScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Research Scene - First step in workflow */}
        <TransitionSeries.Sequence durationInFrames={researchDuration}>
          <ResearchScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Brainstorm Scene - Second step */}
        <TransitionSeries.Sequence durationInFrames={brainstormDuration}>
          <BrainstormScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Content Scene - Third step */}
        <TransitionSeries.Sequence durationInFrames={contentDuration}>
          <ContentScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Calendar Scene - Fourth step */}
        <TransitionSeries.Sequence durationInFrames={calendarDuration}>
          <CalendarScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Analytics Scene - Final step */}
        <TransitionSeries.Sequence durationInFrames={analyticsDuration}>
          <AnalyticsScene />
        </TransitionSeries.Sequence>

      </TransitionSeries>
    </AbsoluteFill>
  );
};
