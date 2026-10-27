import React from "react";
import { useCurrentFrame } from "remotion";
import { PIXEL } from "../../theme";
import { pointIn, PreparedScene } from "./scene";

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
  view?: { y: number; zoom: number };
  /** 被 3D 物件擋住：這個點投影位置以下不畫（站在講台後面：點 = 台面前緣）。只適合正面是水平直線的遮擋物 */
  clipBelow?: string;
  children: React.ReactNode;
}> = ({ prep, point, refFrame, from = 0, view = { y: PIXEL.height / 2, zoom: 1 }, clipBelow, children }) => {
  const f = useCurrentFrame() + from;
  const p0 = pointIn(prep, point, refFrame);
  const p = pointIn(prep, point, f);
  if (p0.error || p.error) return <>{children}</>;
  if (!p.visible) return null;
  const dx = Math.round((p.x - p0.x) / view.zoom);
  const dy = Math.round((p.y - p0.y) / view.zoom);
  const inner = <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy}px)` }}>{children}</div>;
  const edge = clipBelow ? pointIn(prep, clipBelow, f) : undefined;
  if (!edge || edge.error || edge.depth <= 0.05) return inner;
  // 遮擋線換成世界座標的高度；外層不平移，直接裁掉這條線以下（上、左、右放寬，不裁到出界的部分）
  const ey = Math.round(view.y + (edge.y - PIXEL.height / 2) / view.zoom);
  return <div style={{ position: "absolute", inset: 0, clipPath: `inset(-2000px -2000px calc(100% - ${ey}px) -2000px)` }}>{inner}</div>;
};
