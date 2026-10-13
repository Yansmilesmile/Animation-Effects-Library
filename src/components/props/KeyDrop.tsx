import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color } from "../../theme";
import { easeCamera } from "../../lib/util";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { RingPulse } from "../emphasis/RingPulse";
import { Tag } from "../emphasis/Tag";
import { Sprite } from "../Sprite";
import { KEY, TONES } from "./bitmaps";
import { Puff } from "./Puff";

/**
 * KeyDrop —— C43 鑰匙落點變形。一把金鑰匙在空中閃現，沿弧線飛到路線上的落點，
 * 落地時光環 + 地面亮起光圈，之後懸浮輕晃；可再冒出標籤、變成該關的象徵物。
 * 像素層座標，(x, y) 是落點地面。N 把鑰匙寫 N 個事件（可同一幀、可錯開）。
 */
export type KeyDropProps = {
  x: number;
  y: number;
  /** 閃現位置，預設落點正上方 90 */
  fromX?: number;
  fromY?: number;
  /** 飛行幀數，預設 12 */
  flyFrames?: number;
  /** 鑰匙素材；不寫用內建像素金鑰匙 */
  asset?: string;
  scale?: number;
  /** 懸浮在落點上方幾像素，預設 6 */
  hover?: number;
  /** 地面光圈，預設 true */
  ring?: boolean;
  ringColor?: string;
  label?: string;
  labelAt?: number;
  labelVariant?: "red" | "dark" | "hang" | "locked";
  /** 變形：在 morphAt 冒一團煙，鑰匙換成這個素材 */
  morphTo?: string;
  morphAt?: number;
};

const FLASH = 4;

export const KeyDrop: React.FC<KeyDropProps> = ({
  x,
  y,
  fromX,
  fromY,
  flyFrames = 12,
  asset,
  scale = 1,
  hover = 6,
  ring = true,
  ringColor = color.goldLight,
  label,
  labelAt,
  labelVariant = "dark",
  morphTo,
  morphAt,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const sx = fromX ?? x;
  const sy = fromY ?? y - 90;
  const land = FLASH + flyFrames;
  const kw = KEY[0].length * scale;
  const kh = KEY.length * scale;

  // 飛行：緩動 + 往上拱的弧線；落地後上下輕晃 1 像素
  const t = easeCamera(Math.min(1, Math.max(0, (f - FLASH) / flyFrames)));
  const restY = y - hover;
  const arc = -Math.sin(t * Math.PI) * 16;
  const bob = f >= land ? Math.round(Math.sin((f - land) / 12) * 1) : 0;
  const cx = sx + (x - sx) * t;
  const cy = sy + (restY - sy) * t + arc + bob;
  // 飛行中轉一圈，落地時擺正
  const rot = f < land ? (1 - t) * -360 : 0;
  // 煙霧最濃時（morphAt 後 3 幀）才換掉，看不到切換的那一下
  const morphed = morphTo !== undefined && morphAt !== undefined && f >= morphAt + 3;

  // 閃現：星芒 4 幀放大後消失
  const starT = f / FLASH;
  const ringG = f - land;
  const ringO = ringG < 0 ? 0 : Math.min(1, ringG / 4) * (0.75 + 0.25 * Math.sin(ringG / 8));

  return (
    <>
      {ring && ringG >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: x - 14,
            top: y - 3,
            width: 28,
            height: 6,
            borderRadius: "50%",
            border: `1px solid ${ringColor}`,
            background: `radial-gradient(ellipse, ${ringColor} 0%, rgba(0,0,0,0) 75%)`,
            boxSizing: "border-box",
            opacity: ringO,
          }}
        />
      ) : null}
      {starT < 1.5 ? (
        <div
          style={{
            position: "absolute",
            left: sx - 3.5,
            top: sy - 3.5,
            width: 7,
            height: 7,
            transform: `scale(${1 + 1.5 * Math.sin(Math.min(1, starT) * Math.PI)})`,
            opacity: starT < 1 ? 1 : 1.5 - starT,
            filter: "drop-shadow(0 0 3px #fff)",
          }}
        >
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: "#FFFFFF" }} />
        </div>
      ) : null}
      {f >= 1 && !morphed ? (
        <div style={{ position: "absolute", left: Math.round(cx), top: Math.round(cy), transform: `rotate(${rot}deg)`, filter: f >= land ? `drop-shadow(0 0 2px ${color.goldLight})` : undefined }}>
          {asset ? (
            <Sprite asset={asset} x={0} y={0} anchor="center" scale={scale} />
          ) : (
            <PixelBitmap rows={KEY} palette={TONES.gold} x={-kw / 2} y={-kh / 2} size={scale} />
          )}
        </div>
      ) : null}
      {morphed ? <Sprite asset={morphTo!} x={x} y={restY + 4} scale={scale} glow={color.goldLight} /> : null}
      <Sequence from={land} layout="none">
        <RingPulse x={x} y={restY} radius={22} color={color.goldLight} dots={8} />
      </Sequence>
      {morphTo && morphAt !== undefined ? (
        <Sequence from={morphAt} layout="none">
          <Puff x={x} y={restY} mode="smoke" spread={12} size={3} />
        </Sequence>
      ) : null}
      {label ? (
        <Sequence from={labelAt ?? land + 4} layout="none">
          <Tag text={label} x={x} y={restY - kh - 6} variant={labelVariant} />
        </Sequence>
      ) : null}
    </>
  );
};
