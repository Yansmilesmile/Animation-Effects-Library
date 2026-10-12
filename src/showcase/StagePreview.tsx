import React from "react";
import { SceneView } from "../timeline/TimelineComposition";
import type { Scene } from "../timeline/types";

/**
 * StagePreview —— 預覽舞台編輯器存的舞台在影片裡的樣子（標準取景 1.5 倍、主持人站在地面線、字幕位置）。
 * 在 Studio 右側改 stage / pose / hostX 即可切換。
 */
export type StagePreviewProps = { stage: string; pose: string; hostX: number };

export const StagePreview: React.FC<StagePreviewProps> = ({ stage, pose, hostX }) => {
  const scene: Scene = {
    id: `preview-${stage}`,
    duration: 90,
    stage,
    host: { pose, x: hostX },
    ambience: ["dust"],
    subtitles: [{ start: 0, end: 90, text: `舞台預覽：${stage}（字幕位置示意）`, highlight: [stage] }],
  };
  return <SceneView scene={scene} timeline={{ scenes: [scene] }} navEnterAt={0} />;
};
