import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { COVER } from "./common";
import { BITMAP, PixelBitmap } from "../PixelBitmap";

/**
 * Stamp —— B6 蓋章 + B3 否定 ✕（同一個組件兩種樣式）。像素層座標，(x, y) 是章的中心。
 *
 * - variant "stamp"：紅色印章斜著「拍」上去（3 幀從大縮到定位，帶輕微旋轉），用於下定論（「最蠢」「不可複製」「0」）。
 * - variant "x"：紅色像素 ✕ 直接拍上，畫面泛一層紅光（A9 的紅色 color 蒙版，約 12 幀退掉）。
 * flash 預設：x = true、stamp = false。holdTint > 0 時紅色蒙版退到這個強度後保持（例如「崩盤」後整段都偏紅）。
 *
 * 全畫面泛紅會蓋滿整個畫面，放在鏡頭裡或 hud 都可以。
 */
export type StampProps = {
  x: number;
  y: number;
  variant?: "stamp" | "x";
  /** 印章文字（variant = stamp） */
  text?: string;
  /** 旋轉角度，預設 -12 */
  rotate?: number;
  /** 大小倍數，預設 2（stamp 字 24px / ✕ 22px） */
  size?: number;
  flash?: boolean;
  holdTint?: number;
  /** 印章顏色（variant = stamp）：red 預設 / gold（正面結論，例如「幫」） */
  tone?: "red" | "gold";
};

const SLAM = [
  { s: 1.9, o: 0.45 },
  { s: 1.3, o: 0.85 },
  { s: 0.94, o: 1 },
];

export const Stamp: React.FC<StampProps> = ({ x, y, variant = "stamp", text = "", rotate = -12, size = 2, flash, holdTint = 0, tone = "red" }) => {
  const f = useCurrentFrame();
  const ink = tone === "gold" ? color.gold : color.red;
  const inkRgb = tone === "gold" ? "232,176,74" : "217,68,58";
  if (f < 0) return null;
  const doFlash = flash ?? variant === "x";
  const slam = SLAM[f] ?? { s: 1, o: 1 };
  const tint = doFlash ? Math.max(holdTint, f < 12 ? 0.6 * (1 - f / 12) + holdTint * (f / 12) : holdTint) : 0;

  return (
    <>
      {tint > 0 ? (
        <>
          <div style={{ ...COVER, background: color.red, mixBlendMode: "color", opacity: tint }} />
          <div style={{ ...COVER, background: color.redDark, opacity: tint * 0.25 }} />
        </>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: Math.round(x),
          top: Math.round(y),
          transform: `translate(-50%, -50%) rotate(${variant === "x" ? 0 : rotate}deg) scale(${slam.s})`,
          opacity: slam.o,
        }}
      >
        {variant === "x" ? (
          <div style={{ position: "relative", width: 11 * size, height: 11 * size, filter: `drop-shadow(0 0 3px ${color.red})` }}>
            <PixelBitmap rows={[...BITMAP.cross]} palette={{ r: color.redLight, d: color.redDark, w: "#FFD0C8" }} size={size} />
          </div>
        ) : (
          <div
            style={{
              padding: `${size}px ${3 * size}px`,
              border: `${size}px solid ${ink}`,
              outline: `1px solid ${ink}`,
              outlineOffset: 1,
              color: tone === "gold" ? color.goldLight : ink,
              fontFamily: FONT_PIXEL,
              fontSize: 12 * size,
              lineHeight: 1,
              whiteSpace: "nowrap",
              background: `rgba(${inkRgb},0.10)`,
              textShadow: `0 0 2px rgba(${inkRgb},0.6)`,
            }}
          >
            {text}
          </div>
        )}
      </div>
    </>
  );
};
