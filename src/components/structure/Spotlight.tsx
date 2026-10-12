import React from "react";
import { useCurrentFrame } from "remotion";
import { easeCamera } from "../../lib/util";
import { COVER } from "../emphasis/common";

/**
 * Spotlight —— A13 聚光燈收窄。人物周圍的暗角越收越緊，最後像舞台聚光燈一樣只照亮人物和他手裡的東西。
 * 片尾讀書段必用（「解鎖結局｜最好的結局」→ 低頭讀書 → 成就解鎖）。
 * 放在場景裡（跟鏡頭走）時 (x, y) 是世界座標；放在 hud 時是畫面座標。暗部會蓋滿整個畫面。
 */
export type SpotlightProps = {
  x: number;
  y: number;
  /** 起始半徑（像素），預設 260（幾乎沒有暗角） */
  from?: number;
  /** 收窄後的半徑，預設 38 */
  to?: number;
  /** 收窄幀數，預設 45 */
  duration?: number;
  /** 暗部濃度 0..1，預設 0.93 */
  darkness?: number;
  /** 邊緣柔和度（像素），預設 18 */
  soft?: number;
  /** 光圈的垂直拉長比例（人物是直的），預設 1.25 */
  stretch?: number;
};

export const Spotlight: React.FC<SpotlightProps> = ({ x, y, from = 260, to = 38, duration = 45, darkness = 0.93, soft = 18, stretch = 1.25 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const r = from + (to - from) * easeCamera(Math.min(1, f / duration));
  const cx = x - (COVER.left as number);
  const cy = y - (COVER.top as number);
  return (
    <div
      style={{
        ...COVER,
        background: `radial-gradient(ellipse ${r}px ${r * stretch}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${Math.max(0, 100 - (soft / r) * 100)}%, rgba(0,0,0,${darkness}) 100%)`,
      }}
    />
  );
};
