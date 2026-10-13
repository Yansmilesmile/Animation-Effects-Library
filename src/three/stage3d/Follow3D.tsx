import React from "react";
import { useCurrentFrame } from "remotion";
import { useStage3DRuntime } from "./context";

/**
 * Follow3D —— 讓 2D 內容（精靈、標籤、角色）貼在 3D 錨點上、跟著鏡頭移動。
 * children 先以參考幀 refFrame 時錨點的畫面位置畫好；之後每幀平移「錨點現在的位置 − 參考位置」，
 * depthScale 時再依錨點深度縮放（以參考位置為軸），遠近一致。錨點跑到鏡頭後面時隱藏。
 *
 * from：這個元件所在 Sequence 的起點（scene 內幀數），useCurrentFrame() + from = scene 幀數。
 */
export const Follow3D: React.FC<{
  anchor: string;
  refFrame: number;
  from?: number;
  depthScale?: boolean;
  /** 依真實尺寸縮放：內容在 3D 裡有 height 單位高、畫出來是 basePx 像素高（角色用） */
  real?: { height: number; basePx: number };
  /** 被 3D 物件擋住：這個錨點投影位置以下的部分不畫（例如坐在書桌後面，錨點 = 桌面前緣） */
  clipBelow?: string;
  children: React.ReactNode;
}> = ({ anchor, refFrame, from = 0, depthScale = false, real, clipBelow, children }) => {
  const rt = useStage3DRuntime();
  const f = useCurrentFrame() + from;
  if (!rt) return <>{children}</>;
  const a0 = rt.anchorAt(anchor, refFrame);
  const a = rt.anchorAt(anchor, f);
  if (!a0 || !a) return <>{children}</>;
  const p0 = rt.project(refFrame, a0);
  const p = rt.project(f, a);
  if (!p.visible) return null;
  const s = real ? (p.unit * real.height) / real.basePx : depthScale && p0.unit > 0 ? p.unit / p0.unit : 1;
  const inner = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${p0.x}px ${p0.y}px`,
        transform: `translate(${p.x - p0.x}px, ${p.y - p0.y}px) scale(${s})`,
      }}
    >
      {children}
    </div>
  );
  const edge = clipBelow ? rt.anchorAt(clipBelow, f) : undefined;
  if (!edge) return inner;
  // 遮擋線在畫面上的高度（像素層座標）；外層不受縮放，直接裁掉這條線以下
  const ey = rt.project(f, edge).y;
  return <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 calc(100% - ${Math.round(ey)}px) 0)` }}>{inner}</div>;
};
