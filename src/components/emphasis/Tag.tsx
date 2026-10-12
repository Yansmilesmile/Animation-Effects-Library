import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { Appear, popScale } from "./common";

/**
 * Tag —— B2 標籤彈出，另含 B13 吊牌價籤、B11 未解鎖卡。像素層座標，(x, y) 是標籤底部中心。
 *
 * variant：
 * - red：紅底金邊（負面、警告、數字）
 * - dark：深底金邊（中性說明、名稱）
 * - hang：B13 米色吊牌、紅字，從上方掉下來晃幾下（「替代價 ¥9.9」）
 * - locked：B11 灰色未解鎖卡，左邊一把鎖（「×2 未解鎖」）
 * appear：pop（3 幀回彈，預設）/ instant（瞬間）。hang 固定用晃動。
 */
export type TagProps = {
  text: string;
  x: number;
  y: number;
  variant?: "red" | "dark" | "hang" | "locked";
  appear?: Appear;
  /** 字級倍數：1 = 12px（螢幕 48px），2 = 24px */
  size?: 1 | 2;
};

const BOX: Record<string, React.CSSProperties> = {
  red: { background: color.red, border: `1px solid ${color.goldLight}`, color: color.white },
  dark: { background: color.navyDark, border: `1px solid ${color.gold}`, color: color.goldLight },
  hang: { background: "#F4E6C4", border: `1px solid ${color.redDark}`, color: color.red },
  locked: { background: "#2E3140", border: `1px solid #5D6274`, color: "#9A9FB2" },
};

export const Tag: React.FC<TagProps> = ({ text, x, y, variant = "red", appear = "pop", size = 1 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const fs = 12 * size;

  let transform = `translate(-50%, -100%) scale(${popScale(f, appear)})`;
  let origin = "50% 100%";
  let dy = 0;
  if (variant === "hang") {
    // 從上方掉下（4 幀）後，以釘子為支點衰減擺動
    dy = f < 4 ? -10 * (1 - f / 4) : 0;
    const angle = 16 * Math.exp(-f / 14) * Math.cos(f / 3);
    transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    origin = "50% -8px";
  }

  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top: Math.round(y + dy),
        transform,
        transformOrigin: origin,
        whiteSpace: "nowrap",
      }}
    >
      {variant === "hang" ? (
        // 吊繩：兩條線到上方釘子
        <svg width="100%" height="8" style={{ position: "absolute", left: 0, top: -8, overflow: "visible" }} viewBox="0 0 10 8" preserveAspectRatio="none">
          <line x1="2" y1="8" x2="5" y2="0" stroke="#d8c9a0" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <line x1="8" y1="8" x2="5" y2="0" stroke="#d8c9a0" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      <div
        style={{
          ...BOX[variant],
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: `${2 * size}px ${4 * size}px`,
          fontFamily: FONT_PIXEL,
          fontSize: fs,
          lineHeight: 1,
          boxShadow: `0 0 0 1px ${color.ink}, 0 2px 0 1px rgba(0,0,0,0.45)`,
          position: "relative",
        }}
      >
        {variant === "locked" ? (
          <div style={{ position: "relative", width: 7 * size, height: 7 * size }}>
            <PixelBitmap rows={[...BITMAP.lock]} palette={{ d: "#9A9FB2", g: "#6B7085" }} size={size} />
          </div>
        ) : null}
        {variant === "hang" ? <div style={{ width: 2, height: 2, borderRadius: 1, background: color.redDark, marginRight: 1 }} /> : null}
        {text}
      </div>
    </div>
  );
};
