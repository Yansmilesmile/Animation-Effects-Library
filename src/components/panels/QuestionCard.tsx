import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { Sprite } from "../Sprite";
import { clamp01 } from "../emphasis/common";

/**
 * QuestionCard —— 金框問題卡（B5 的卡片本體）：金框＋一點點紅（高級感），上方標題、中央圖示，兩側可掛小物件。
 * hud 圖層（畫面座標 480×270），(x, y) 是卡片中心。
 *
 * - from：{ x, y } 從哪裡撐開（例如 B14 問號泡泡的位置），openFrames 幀內放大回彈到 (x, y)。
 * - hangers：[{ asset, side: left | right, at, scale, dy }] 兩側用細繩掛著的小物件（金星、小價簽），at 幀彈出、晃一下。
 * - shrinkAt：縮到角落（shrinkTo，預設右上角）並停在那裡，銜接轉場。
 * 所有 at 都是觸發後的相對幀，也可以寫 "@詞"。
 */
export type QuestionCardProps = {
  x?: number;
  y?: number;
  title?: string;
  asset?: string;
  assetScale?: number;
  text?: string;
  w?: number;
  h?: number;
  from?: { x: number; y: number };
  openFrames?: number;
  hangers?: { asset: string; side?: "left" | "right"; at?: number; scale?: number; dy?: number }[];
  shrinkAt?: number;
  shrinkTo?: { x: number; y: number; scale?: number };
  shrinkFrames?: number;
};

const easeOutBack = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const QuestionCard: React.FC<QuestionCardProps> = ({
  x = 240,
  y = 110,
  title,
  asset,
  assetScale = 2,
  text,
  w = 150,
  h = 100,
  from,
  openFrames = 9,
  hangers = [],
  shrinkAt,
  shrinkTo,
  shrinkFrames = 12,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const o = clamp01(f / openFrames);
  const k = easeOutBack(o);
  const start = from ?? { x, y };
  let cx = start.x + (x - start.x) * Math.min(1, k);
  let cy = start.y + (y - start.y) * Math.min(1, k);
  let s = 0.12 + 0.88 * k;
  if (shrinkAt !== undefined && f >= shrinkAt) {
    const to = { x: shrinkTo?.x ?? 430, y: shrinkTo?.y ?? 34, scale: shrinkTo?.scale ?? 0.35 };
    const p = easeInOut(clamp01((f - shrinkAt) / shrinkFrames));
    cx = x + (to.x - x) * p;
    cy = y + (to.y - y) * p;
    s = 1 + (to.scale - 1) * p;
  }

  return (
    <div style={{ position: "absolute", left: Math.round(cx), top: Math.round(cy), transform: `translate(-50%, -50%) scale(${s.toFixed(3)})`, width: w, height: h }}>
      {/* 掛件：細繩 + 物件，掛在卡片左右上角外側 */}
      {hangers.map((hg, i) => {
        const at = hg.at ?? openFrames;
        const t = f - at;
        if (t < 0) return null;
        const side = hg.side ?? (i % 2 ? "right" : "left");
        const ax = side === "left" ? -6 : w + 6;
        const len = 14 + (hg.dy ?? 0);
        const ang = 18 * Math.exp(-t / 10) * Math.cos(t / 2.5) * (side === "left" ? 1 : -1);
        const pop = t < 3 ? [0.5, 1.2, 1][t] : 1;
        return (
          <div key={i} style={{ position: "absolute", left: ax, top: 6, transformOrigin: "0 0", transform: `rotate(${ang.toFixed(1)}deg)` }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 1, height: len, background: color.goldLight }} />
            <div style={{ position: "absolute", left: 0, top: len, transform: `scale(${pop})`, transformOrigin: "50% 0" }}>
              <Sprite asset={hg.asset} x={0} y={0} anchor="center" scale={hg.scale ?? 1} />
            </div>
          </div>
        );
      })}
      {/* 卡片：金框（外暗金、中亮金、內暗）+ 四角紅寶石 */}
      <div style={{ position: "absolute", inset: -1, background: color.ink }} />
      <div style={{ position: "absolute", inset: 0, background: color.goldDark }} />
      <div style={{ position: "absolute", inset: 1, background: color.gold }} />
      <div style={{ position: "absolute", left: 1, top: 1, right: 1, height: 1, background: color.goldLight }} />
      <div style={{ position: "absolute", inset: 3, background: color.goldDark }} />
      <div style={{ position: "absolute", inset: 4, background: "#141B33" }} />
      {[
        [1, 1],
        [w - 4, 1],
        [1, h - 4],
        [w - 4, h - 4],
      ].map(([gx, gy], i) => (
        <div key={i} style={{ position: "absolute", left: gx, top: gy, width: 3, height: 3, background: color.red, boxShadow: `inset -1px -1px 0 ${color.redDark}, inset 1px 1px 0 ${color.redLight}` }} />
      ))}
      {title ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 9, textAlign: "center", fontFamily: FONT_PIXEL, fontSize: 12, lineHeight: 1, color: color.goldLight, whiteSpace: "nowrap" }}>{title}</div>
      ) : null}
      {asset ? <Sprite asset={asset} x={w / 2} y={title ? h / 2 + 6 : h / 2} anchor="center" scale={assetScale} /> : null}
      {text ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, textAlign: "center", fontFamily: FONT_PIXEL, fontSize: 12, lineHeight: 1, color: color.white, whiteSpace: "nowrap" }}>{text}</div>
      ) : null}
    </div>
  );
};
