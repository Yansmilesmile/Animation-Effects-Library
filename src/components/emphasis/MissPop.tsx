import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { popScale } from "./common";

/**
 * MissPop —— B10 MISS 彈字。角色打向障礙卻沒用：彈出紅色「MISS」，接著頭上飄字（「+1 小時」）和一滴汗。
 * 像素層座標，(x, y) 是 MISS 出現的位置（通常在障礙物或角色頭上方）。
 */
export type MissPopProps = {
  x: number;
  y: number;
  text?: string;
  /** 頭上飄字，例如「+1 小時」；不填就不出現 */
  floatText?: string;
  /** 飄字位置（角色頭頂），預設在 MISS 左邊 40 */
  floatX?: number;
  floatY?: number;
  /** 汗滴，預設 true（出現在飄字位置旁） */
  sweat?: boolean;
  /** 飄字出現的幀，預設 8 */
  floatAt?: number;
};

const outline = (c: string) => `1px 0 0 ${c}, -1px 0 0 ${c}, 0 1px 0 ${c}, 0 -1px 0 ${c}, 1px 1px 0 ${c}, 0 2px 0 ${c}`;

export const MissPop: React.FC<MissPopProps> = ({ x, y, text = "MISS", floatText, floatX, floatY, sweat = true, floatAt = 8 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const missO = f < 22 ? 1 : Math.max(0, 1 - (f - 22) / 8);
  const fx = floatX ?? x - 40;
  const fy = floatY ?? y;
  const g = f - floatAt;

  return (
    <>
      {missO > 0 ? (
        <div
          style={{
            position: "absolute",
            left: Math.round(x),
            top: Math.round(y - Math.min(f, 20) * 0.4),
            transform: `translate(-50%, -100%) scale(${popScale(f)})`,
            fontFamily: FONT_PIXEL,
            fontSize: 12,
            lineHeight: 1,
            color: color.redLight,
            textShadow: outline(color.ink),
            opacity: missO,
            letterSpacing: 1,
          }}
        >
          {text}
        </div>
      ) : null}
      {floatText && g >= 0 && g < 40 ? (
        <div
          style={{
            position: "absolute",
            left: Math.round(fx),
            top: Math.round(fy - g * 0.35),
            transform: "translate(-50%, -100%)",
            fontFamily: FONT_PIXEL,
            fontSize: 12,
            lineHeight: 1,
            color: color.white,
            textShadow: outline(color.ink),
            opacity: g < 30 ? 1 : 1 - (g - 30) / 10,
            whiteSpace: "nowrap",
          }}
        >
          {floatText}
        </div>
      ) : null}
      {sweat && g >= 4 && g < 40 ? (
        <PixelBitmap rows={[...BITMAP.sweat]} palette={{ b: "#7FC8FF", w: "#FFFFFF" }} x={fx + 16} y={fy + 4 + Math.min(g - 4, 12) * 0.25} size={2} />
      ) : null}
    </>
  );
};
