import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { AssetMeta, useAssets } from "../../lib/assets";
import { PixelBitmap } from "../PixelBitmap";
import { Sprite } from "../Sprite";
import { ICONS, TONES } from "./bitmaps";
import { Puff } from "./Puff";

/**
 * DropStack —— C1 掉落堆疊。物件一個接一個從上方掉下，落地彈一下並揚起灰塵，逐漸堆起來。
 * 像素層座標，(x, y) 是第一個物件落地時的底部中心。
 *
 * - 物件用 asset（素材 path），或內建 icon（"coin" 一疊硬幣、"key"）配 tone 上色。
 * - count = 1 就是單一道具「帶彈跳落下」（例如收銀機落到面前）。
 * - layout：stack 往上疊（預設）/ row 往右排。
 */
export type DropStackProps = {
  x: number;
  y: number;
  asset?: string;
  icon?: string;
  /** 內建 icon 的顏色：gold / red / silver，預設 gold */
  tone?: string;
  count?: number;
  /** 每個物件間隔幾幀落下，預設 6 */
  every?: number;
  /** 從多高掉下（像素），預設 70 */
  fall?: number;
  /** 掉落花幾幀，預設 9 */
  fallFrames?: number;
  /** stack：每個往上疊多少像素（預設物件高度）；row：每個往右多少（預設物件寬度 + 2） */
  step?: number;
  /** stack 時左右交錯的像素，讓堆疊不要太整齊，預設 1 */
  jitter?: number;
  layout?: "stack" | "row";
  scale?: number;
  dust?: boolean;
};

const sizeOf = (META: Record<string, AssetMeta>, asset: string | undefined, icon: string, scale: number) => {
  if (asset) {
    const m = META[asset];
    return m ? { w: (m.frameW ?? m.w) * scale, h: (m.frameH ?? m.h) * scale } : { w: 16 * scale, h: 16 * scale };
  }
  const rows = ICONS[icon] ?? ICONS.coin;
  return { w: rows[0].length * scale, h: rows.length * scale };
};

export const DropStack: React.FC<DropStackProps> = ({
  x,
  y,
  asset,
  icon = "coin",
  tone = "gold",
  count = 5,
  every = 6,
  fall = 70,
  fallFrames = 9,
  step,
  jitter = 1,
  layout = "stack",
  scale = 1,
  dust = true,
}) => {
  const f = useCurrentFrame();
  const META = useAssets().meta;
  if (f < 0) return null;
  const { w, h } = sizeOf(META, asset, icon, scale);
  const items = [];
  for (let i = 0; i < count; i++) {
    const start = i * every;
    const g = f - start;
    if (g < 0) break;
    const bx = layout === "row" ? x + i * (step ?? w + 2) : x + (i % 2 === 0 ? 0 : jitter) * (i % 4 === 1 ? 1 : -1);
    const by = layout === "row" ? y : y - i * (step ?? h);
    // 重力：t² 加速落下；落地後 4 幀彈一下
    const t = Math.min(1, g / fallFrames);
    const landed = g >= fallFrames;
    const bounce = landed && g < fallFrames + 4 ? -Math.round(2 * Math.sin(((g - fallFrames) / 4) * Math.PI)) : 0;
    const iy = Math.round(by - fall * (1 - t * t) + bounce);
    items.push(
      <React.Fragment key={i}>
        {asset ? (
          <Sprite asset={asset} x={bx} y={iy} scale={scale} />
        ) : (
          <PixelBitmap rows={ICONS[icon] ?? ICONS.coin} palette={TONES[tone] ?? TONES.gold} x={Math.round(bx - w / 2)} y={iy - h} size={scale} />
        )}
        {dust ? (
          <Sequence from={start + fallFrames} layout="none">
            <Puff x={bx} y={by} spread={Math.max(8, w * 0.7)} seed={i + 1} size={count > 1 ? 1 : 2} />
          </Sequence>
        ) : null}
      </React.Fragment>,
    );
  }
  return <>{items}</>;
};
