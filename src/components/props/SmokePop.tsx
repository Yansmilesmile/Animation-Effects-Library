import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { useAssets } from "../../lib/assets";
import { color, FONT_PIXEL } from "../../theme";
import { popScale } from "../emphasis/common";
import { Tag } from "../emphasis/Tag";
import { Sprite } from "../Sprite";
import { Puff } from "./Puff";

/**
 * SmokePop —— C38 煙霧登場 + 名牌。人物（或頭像）伴隨一團煙霧出現，頭上一塊小名牌；之後頭頂可再彈出一個小標籤。
 * 多個人物依次登場時，寫多個事件、錯開 start，左右對稱擺放。
 * 像素層座標，(x, y) 是人物底部中心（腳底）。
 */
export type SmokePopProps = {
  x: number;
  y: number;
  /** 人物圖；寫 actor 時可省略（只冒煙＋名牌，人由角色系統畫） */
  asset?: string;
  /** 時間軸用：骨架角色 id，煙最濃時出場並站到 (x, y)（角色要先宣告 visible:false） */
  actor?: string;
  /** 時間軸用：同一團煙裡退場的角色 id */
  hide?: string[];
  /** 沒有 asset 時人物的高度（名牌、煙的位置）；寫 actor 時自動帶入角色身高 */
  h?: number;
  scale?: number;
  flipX?: boolean;
  /** 頭上的名牌（深底金字） */
  label?: string;
  /** 名牌上方再彈出的小標籤（例如「$1/年」） */
  tag?: string;
  tagAt?: number;
  tagVariant?: "red" | "dark" | "hang" | "locked";
  /** 煙霧顏色，預設米白 */
  smoke?: string;
};

// 人物在煙霧最濃的那一幀出現
export const SMOKE_REVEAL = 4;
const REVEAL = SMOKE_REVEAL;

export const SmokePop: React.FC<SmokePopProps> = ({ x, y, asset, h: hIn, scale = 1, flipX, label, tag, tagAt = 14, tagVariant = "dark", smoke = "#E6DFCF" }) => {
  const f = useCurrentFrame();
  const META = useAssets().meta;
  if (f < 0) return null;
  const m = asset ? META[asset] : undefined;
  const h = m ? (m.frameH ?? m.h) * scale : hIn ?? 32 * scale;
  const w = m ? (m.frameW ?? m.w) * scale : asset ? 16 * scale : Math.round(h * 0.5);
  const headY = y - h;
  const labelG = f - REVEAL - 2;
  return (
    <>
      {asset && f >= REVEAL ? <Sprite asset={asset} x={x} y={y} scale={scale} flipX={flipX} /> : null}
      {label && labelG >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: Math.round(x),
            top: Math.round(headY - 3),
            transform: `translate(-50%, -100%) scale(${popScale(labelG)})`,
            transformOrigin: "50% 100%",
            padding: "1px 3px",
            background: color.navyDark,
            border: `1px solid ${color.gold}`,
            boxShadow: `0 0 0 1px ${color.ink}`,
            color: color.goldLight,
            fontFamily: FONT_PIXEL,
            fontSize: 12,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}
      {tag ? (
        <Sequence from={tagAt} layout="none">
          <Tag text={tag} x={x} y={headY - (label ? 21 : 4)} variant={tagVariant} />
        </Sequence>
      ) : null}
      <Puff x={x} y={y - h / 2} mode="smoke" spread={Math.max(12, w * 0.8)} size={Math.max(3, Math.round(Math.min(w, h) / 6))} count={11} color={smoke} seed={Math.round(x)} />
    </>
  );
};
