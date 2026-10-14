import React from "react";
import { CalculateMetadataFunction } from "remotion";
import { ensureFonts } from "../fonts";
import { calculateTimelineMetadata, TimelineComposition } from "../timeline/TimelineComposition";
import type { Timeline } from "../timeline/types";
import { AssetProvider } from "./assets";

export type TimelinePlayerProps = {
  timeline: Timeline;
  /** 本專案的 asset-meta.json（npx superbot-assets 產生）。不給 = 用引擎自己的素材（舊機制） */
  assetMeta?: Record<string, unknown>;
  /** 素材在本專案 public/ 底下的資料夾，預設 "lib" */
  assetBase?: string;
};

/**
 * TimelinePlayer —— 播一份時間軸 JSON（docs/timeline.md 的格式）。別的專案拿來當 Composition 的 component：
 *
 *   <Composition id="demo" component={TimelinePlayer} defaultProps={{ timeline, assetMeta }}
 *     calculateMetadata={timelinePlayerMetadata} durationInFrames={1} fps={30} width={1920} height={1080} />
 */
export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ timeline, assetMeta, assetBase }) => {
  ensureFonts();
  const body = <TimelineComposition timeline={timeline} />;
  return assetMeta ? (
    <AssetProvider meta={assetMeta} base={assetBase}>
      {body}
    </AssetProvider>
  ) : (
    body
  );
};

export const timelinePlayerMetadata: CalculateMetadataFunction<TimelinePlayerProps> = (opts) =>
  calculateTimelineMetadata({ ...opts, props: { timeline: opts.props.timeline } } as Parameters<typeof calculateTimelineMetadata>[0]);
