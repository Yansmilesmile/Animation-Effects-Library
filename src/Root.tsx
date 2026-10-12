import React from "react";
import { Composition } from "remotion";
import { ensureFonts } from "./fonts";
import { Showcase1, SHOWCASE1_DURATION } from "./showcase/Showcase1";
import { Showcase2, SHOWCASE2_DURATION } from "./showcase/Showcase2";
import { Showcase3, SHOWCASE3_DURATION } from "./showcase/Showcase3";
import { Showcase4, SHOWCASE4_DURATION } from "./showcase/Showcase4";
import { StagePreview } from "./showcase/StagePreview";
import { Test3D, TEST3D_DURATION } from "./showcase/Test3D";
import { VIDEO } from "./theme";
import { calculateTimelineMetadata, TimelineComposition } from "./timeline/TimelineComposition";
import type { Timeline } from "./timeline/types";
import demoTimeline from "../timelines/demo.json";
import errorsTimeline from "../timelines/errors-demo.json";

ensureFonts();

export const Root: React.FC = () => (
  <>
    <Composition
      id="Showcase1"
      component={Showcase1}
      durationInFrames={SHOWCASE1_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="Showcase2"
      component={Showcase2}
      durationInFrames={SHOWCASE2_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="Showcase3"
      component={Showcase3}
      durationInFrames={SHOWCASE3_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="Showcase4"
      component={Showcase4}
      durationInFrames={SHOWCASE4_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* JSON 驅動的總合成：timelines/demo.json；props 可在 Studio 右側直接改 */}
    <Composition
      id="Timeline"
      component={TimelineComposition}
      defaultProps={{ timeline: demoTimeline as Timeline }}
      calculateMetadata={calculateTimelineMetadata}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="TimelineErrors"
      component={TimelineComposition}
      defaultProps={{ timeline: errorsTimeline as Timeline }}
      calculateMetadata={calculateTimelineMetadata}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* 舞台編輯器存的舞台預覽：改 stage 名稱即可 */}
    <Composition
      id="StagePreview"
      component={StagePreview}
      defaultProps={{ stage: "home", pose: "full_point_happy", hostX: 160 }}
      durationInFrames={90}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="Test3D"
      component={Test3D}
      durationInFrames={TEST3D_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
