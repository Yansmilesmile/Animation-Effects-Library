import React from "react";
import { useCurrentFrame } from "remotion";
import { PIXEL } from "../../theme";
import { pointIn, PreparedScene } from "./scene";

/** 點在第 f 幀的投影比例：1 公尺在像素層是幾像素（點在鏡頭後面時 0） */
export const pointUnit = (prep: PreparedScene, id: string, f: number) => {
  const p = pointIn(prep, id, f);
  if (p.error || p.depth <= 0.05) return 0;
  const fov = prep.camera.at(f).fov;
  return PIXEL.height / 2 / (Math.tan((fov * Math.PI) / 360) * p.depth);
};

/** 點最近（投影比例最大）的那一幀：縮放的 1 倍基準。優先取點在畫面內的幀 */
export const nearestFrame = (prep: PreparedScene, id: string, duration: number) => {
  let best = { f: 0, u: -1, vis: false };
  for (let f = 0; f < duration; f++) {
    const u = pointUnit(prep, id, f);
    const vis = pointIn(prep, id, f).visible;
    if ((vis && !best.vis) || (vis === best.vis && u > best.u)) best = { f, u, vis };
  }
  return best.f;
};

/**
 * 只縮不放：base = 1 倍基準幀；px = 內容的像素高（比例取到最近的像素格）；
 * positionOnly = 只讓位置跟著縮（例如角色頭上的 Tag：跟著頭走，字不縮），pos 是內容的錨點（世界座標）
 */
export type FollowShrink = { base: number; px: number; positionOnly?: { x: number; y: number } };

/**
 * FollowLayer3D —— 讓 2D 內容（角色、標籤、前景遮罩）貼在 Layer3D 的命名點上、跟著 3D 鏡頭推拉平移。
 * 原理同舊 stage3d 的 Follow3D：children 先以參考幀 refFrame 時點的畫面位置畫好，
 * 之後每幀平移「點現在的位置 − 參考位置」（取整數像素，不縮放：像素格大小不變）。點跑到鏡頭後面或出畫時隱藏。
 *
 * from：這個元件所在 Sequence 的起點（scene 內幀數），useCurrentFrame() + from = scene 幀數。
 * view：外層 2D 鏡頭（Layer3D 的 scene 預設廣角，世界座標 = 畫面座標）。
 */
export const FollowLayer3D: React.FC<{
  prep: PreparedScene;
  point: string;
  refFrame: number;
  from?: number;
  view?: { x: number; y: number; zoom: number };
  /** 被 3D 物件擋住：這個點投影位置以下不畫（站在講台後面：點 = 台面前緣）。只適合正面是水平直線的遮擋物 */
  clipBelow?: string;
  /** 依深度只縮不放（軸心 = 點在參考幀的位置，角色就是腳底）；省略 = 只平移 */
  shrink?: FollowShrink;
  children: React.ReactNode;
}> = ({ prep, point, refFrame, from = 0, view = { x: PIXEL.width / 2, y: PIXEL.height / 2, zoom: 1 }, clipBelow, shrink, children }) => {
  const f = useCurrentFrame() + from;
  const p0 = pointIn(prep, point, refFrame);
  const p = pointIn(prep, point, f);
  if (p0.error || p.error) return <>{children}</>;
  if (!p.visible) return null;
  let dx = Math.round((p.x - p0.x) / view.zoom);
  let dy = Math.round((p.y - p0.y) / view.zoom);
  let transform = `translate(${dx}px, ${dy}px)`;
  let origin: string | undefined;
  if (shrink) {
    const ub = pointUnit(prep, point, shrink.base);
    const raw = ub > 0 ? Math.min(1, pointUnit(prep, point, f) / ub) : 1;
    // 取到最近的像素格：內容高 px 像素 → 比例以 1/px 為一格
    const s = Math.max(1, Math.round(raw * shrink.px)) / shrink.px;
    const ox = view.x + (p0.x - PIXEL.width / 2) / view.zoom;
    const oy = view.y + (p0.y - PIXEL.height / 2) / view.zoom;
    if (shrink.positionOnly) {
      // 內容不縮，只把它的錨點跟著縮放後的位置走（頭上的 Tag 貼著縮小後的頭）
      dx += Math.round((shrink.positionOnly.x - ox) * (s - 1));
      dy += Math.round((shrink.positionOnly.y - oy) * (s - 1));
      transform = `translate(${dx}px, ${dy}px)`;
    } else if (s < 1) {
      origin = `${ox}px ${oy}px`;
      transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    }
  }
  const inner = <div style={{ position: "absolute", inset: 0, transformOrigin: origin, transform }}>{children}</div>;
  const edge = clipBelow ? pointIn(prep, clipBelow, f) : undefined;
  if (!edge || edge.error || edge.depth <= 0.05) return inner;
  // 遮擋線換成世界座標的高度；外層不平移，直接裁掉這條線以下（上、左、右放寬，不裁到出界的部分）
  const ey = Math.round(view.y + (edge.y - PIXEL.height / 2) / view.zoom);
  return <div style={{ position: "absolute", inset: 0, clipPath: `inset(-2000px -2000px calc(100% - ${ey}px) -2000px)` }}>{inner}</div>;
};
