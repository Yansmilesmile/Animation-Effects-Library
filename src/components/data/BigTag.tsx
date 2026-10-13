import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { Sprite } from "../Sprite";
import { clamp01 } from "../emphasis/common";

/**
 * BigTag —— B13 放大版：巨大吊牌（價簽）。紅繩從上方垂下，吊牌掉下來後以繩頂為支點衰減擺動。
 * 像素層座標，(x, y) 是吊牌的繩孔（吊牌頂端中心）；繩子從 ropeTop 垂到繩孔。
 * 內容：text（大字）和 / 或 asset（素材）。
 *
 * - flips：[{ at, text, tone, glow }] D4 數字翻牌：吊牌像翻面一樣橫向收窄再展開（6 幀），換字；tone gold = 金字 + 金色發光，red = 紅字。
 * - swings：[{ at, amount }] 再晃一次（被碰到、數字翻回時）。
 * 所有 at 都是觸發後的相對幀，也可以寫 "@詞"。
 */
export type BigTagProps = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  /** 字級倍數（12px 的倍數），預設 3 */
  textSize?: number;
  tone?: "red" | "gold";
  asset?: string;
  assetScale?: number;
  /** 繩子頂端的 y，預設 y - 120（畫面外） */
  ropeTop?: number;
  /** 掉下來花幾幀，預設 10；0 = 一開始就掛好 */
  dropFrames?: number;
  /** 擺動幅度（度），預設 5 */
  swing?: number;
  flips?: { at: number; text?: string; tone?: "red" | "gold"; glow?: boolean }[];
  swings?: { at: number; amount?: number }[];
};

const PAPER = "#F4E6C4";
const PAPER_D = "#D9C69A";

export const BigTag: React.FC<BigTagProps> = ({
  x,
  y,
  w = 96,
  h = 120,
  text,
  textSize = 3,
  tone = "red",
  asset,
  assetScale = 1,
  ropeTop,
  dropFrames = 10,
  swing = 5,
  flips = [],
  swings = [],
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const top = ropeTop ?? y - 120;
  const rope = y - top;

  // 掉下來：從上方 rope 長度處加速落下，落到底彈一下
  const drop = dropFrames > 0 ? clamp01(f / dropFrames) : 1;
  const dy = Math.round(-(rope + h) * (1 - drop * drop));

  // 擺動：以繩頂為支點；每次 swing 事件重新給一個幅度，衰減
  const kicks = [{ at: dropFrames, amount: swing }, ...swings.map((s) => ({ at: s.at, amount: s.amount ?? swing * 0.6 }))].filter((k) => f >= k.at);
  let angle = 0;
  for (const k of kicks) {
    const t = f - k.at;
    angle += k.amount * Math.exp(-t / 22) * Math.sin(t / 4.5);
  }

  // 翻牌：目前的內容 + 收窄程度
  let cur = { text, tone, glow: false };
  let sx = 1;
  for (const fl of [...flips].sort((a, b) => a.at - b.at)) {
    if (f < fl.at) break;
    const t = f - fl.at;
    if (t >= 3) cur = { text: fl.text ?? cur.text, tone: fl.tone ?? cur.tone, glow: fl.glow ?? fl.tone === "gold" };
    if (t < 6) sx = Math.max(0.08, Math.abs(1 - t / 3));
  }
  const gold = cur.tone === "gold";
  const ink = gold ? color.goldLight : color.red;
  const c = Math.round(w * 0.18); // 上方切角

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: dy,
        transformOrigin: `${x}px ${top}px`,
        transform: `rotate(${angle.toFixed(2)}deg)`,
      }}
    >
      {/* 紅繩 */}
      <div style={{ position: "absolute", left: x - 1, top: top, width: 2, height: rope + 4, background: color.red, boxShadow: `1px 0 0 ${color.redDark}` }} />
      <div
        style={{
          position: "absolute",
          left: Math.round(x - w / 2),
          top: y - 4,
          width: w,
          height: h,
          transformOrigin: "50% 0",
          transform: `scaleX(${sx.toFixed(3)})`,
          filter: cur.glow ? `drop-shadow(0 0 2px ${color.goldLight}) drop-shadow(0 0 6px ${color.gold})` : "drop-shadow(0 2px 0 rgba(0,0,0,0.45))",
        }}
      >
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <polygon points={`${c},0 ${w - c},0 ${w},${c} ${w},${h} 0,${h} 0,${c}`} fill={color.ink} transform={`translate(-1,-1) scale(${(w + 2) / w},${(h + 2) / h})`} />
          <polygon points={`${c},0 ${w - c},0 ${w},${c} ${w},${h} 0,${h} 0,${c}`} fill={gold ? "#3A2A10" : PAPER} />
          <polygon points={`${c + 3},3 ${w - c - 3},3 ${w - 3},${c + 3} ${w - 3},${h - 3} 3,${h - 3} 3,${c + 3}`} fill="none" stroke={gold ? color.gold : PAPER_D} strokeWidth={1} />
          {/* 繩孔 */}
          <rect x={w / 2 - 3} y={5} width={6} height={6} fill={color.ink} />
          <rect x={w / 2 - 2} y={6} width={4} height={4} fill={gold ? color.goldDark : PAPER_D} />
          <rect x={w / 2 - 1} y={4} width={2} height={7} fill={color.red} />
        </svg>
        {asset ? <Sprite asset={asset} x={w / 2} y={cur.text ? h * 0.5 : h * 0.6} anchor="center" scale={assetScale} /> : null}
        {cur.text ? (
          <div
            style={{
              position: "absolute",
              left: w / 2,
              top: asset ? h * 0.78 : h * 0.56,
              transform: "translate(-50%, -50%)",
              fontFamily: FONT_PIXEL,
              fontSize: 12 * textSize,
              lineHeight: 1,
              color: ink,
              whiteSpace: "nowrap",
              textShadow: gold ? `0 0 3px ${color.goldLight}, 0 0 8px ${color.gold}` : `1px 1px 0 ${color.redDark}`,
            }}
          >
            {cur.text}
          </div>
        ) : null}
      </div>
    </div>
  );
};
