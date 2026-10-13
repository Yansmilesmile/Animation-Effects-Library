import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { easeCamera } from "../../lib/util";
import { popScale } from "../emphasis/common";
import { Sprite } from "../Sprite";
import { Puff } from "./Puff";

/**
 * PropSwap —— C2 道具替換。舊道具瞬間消失、新道具出現，背景不動；替換那一刻冒一小團灰塵。
 * 像素層座標，(x, y) 是道具底部中心。
 *
 * - from + to：在 at 那一幀把 from 換成 to（to 3 幀回彈）。
 * - 只有 to：at 那一幀出現。只有 from：at 那一幀消失。兩個都不寫：只冒灰塵（例如書落桌揚起一點灰）。
 * - shrinkTo：from 不消失，而是在 at 起花 shrinkFrames 幀縮小、移到 {x, y}、壓暗（「放到一邊」）。
 */
export type PropSwapProps = {
  x: number;
  y: number;
  from?: string;
  to?: string;
  at?: number;
  scale?: number;
  toScale?: number;
  dust?: boolean;
  /** 灰塵樣式：dust 貼地噴開（預設）/ smoke 一團煙 */
  dustMode?: "dust" | "smoke";
  shrinkTo?: { x?: number; y?: number; scale?: number; dim?: number };
  shrinkFrames?: number;
};

export const PropSwap: React.FC<PropSwapProps> = ({ x, y, from, to, at = 0, scale = 1, toScale, dust = true, dustMode = "dust", shrinkTo, shrinkFrames = 10 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const g = f - at;
  const puff = dust ? (
    <Sequence from={at} layout="none">
      <Puff x={x} y={dustMode === "smoke" ? y - 8 : y} mode={dustMode} />
    </Sequence>
  ) : null;

  if (from && shrinkTo) {
    // 放到一邊：位置、大小用 transform 補間，最後停在 shrinkTo
    const t = g < 0 ? 0 : easeCamera(Math.min(1, g / shrinkFrames));
    const tx = ((shrinkTo.x ?? x) - x) * t;
    const ty = ((shrinkTo.y ?? y) - y) * t;
    const s = 1 + ((shrinkTo.scale ?? 0.5) - 1) * t;
    const dim = (shrinkTo.dim ?? 0.5) * t;
    return (
      <>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${tx}px, ${ty}px)`, filter: dim ? `brightness(${1 - dim}) saturate(${1 - dim})` : undefined }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: `${x}px ${y}px` }}>
            <Sprite asset={from} x={x} y={y} scale={scale} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {from && g < 0 ? <Sprite asset={from} x={x} y={y} scale={scale} /> : null}
      {to && g >= 0 ? (
        <div style={{ position: "absolute", inset: 0, transform: `scale(${popScale(g)})`, transformOrigin: `${x}px ${y}px` }}>
          <Sprite asset={to} x={x} y={y} scale={toScale ?? scale} />
        </div>
      ) : null}
      {puff}
    </>
  );
};
