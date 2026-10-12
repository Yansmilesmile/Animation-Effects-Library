import React from "react";
import { Composition } from "remotion";
import { ensureFonts } from "./fonts";
import { Showcase1, SHOWCASE1_DURATION } from "./showcase/Showcase1";
import { Showcase2, SHOWCASE2_DURATION } from "./showcase/Showcase2";
import { Showcase3, SHOWCASE3_DURATION } from "./showcase/Showcase3";
import { Test3D, TEST3D_DURATION } from "./showcase/Test3D";
import { VIDEO } from "./theme";

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
      id="Test3D"
      component={Test3D}
      durationInFrames={TEST3D_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
