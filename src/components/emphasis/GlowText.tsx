import React from "react";
import { useCurrentFrame } from "remotion";
import { color as theme, FONT_PIXEL } from "../../theme";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { popScale } from "./common";

/**
 * GlowText —— B7 發光像素大字。點陣紋理 + 掃描線 + bloom，金色或紅色，可在上方加王冠。
 * 用於強烈的二元對比（「最差」→「最好」放在同一個位置，詞典規則 8）和倍數（「×10,000」「×37.8」）。
 * 像素層座標，(x, y) 是文字中心。建議放在 PixelStage 的 hud。
 *
 * appear：flicker（霓虹燈點亮式閃 6 幀，預設）/ pop（3 幀回彈）/ instant。
 */
export type GlowTextProps = {
  text: string;
  x: number;
  y: number;
  /** "gold" | "red" | "#hex" */
  color?: string;
  /** 字級倍數：字高 = 12 × size 像素，預設 4（螢幕 192px） */
  size?: number;
  crown?: boolean;
  appear?: "flicker" | "pop" | "instant";
  /** 掃描線，預設 true */
  scanlines?: boolean;
};

const PALETTE: Record<string, { main: string; light: string; dark: string }> = {
  gold: { main: theme.gold, light: "#FFF2B8", dark: theme.goldDark },
  red: { main: theme.redLight, light: "#FFC2B8", dark: theme.redDark },
};

const FLICKER = [1, 0.15, 0.9, 0.3, 1, 0.7];

export const GlowText: React.FC<GlowTextProps> = ({
  text,
  x,
  y,
  color = "gold",
  size = 4,
  crown = false,
  appear = "flicker",
  scanlines = true,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const p = PALETTE[color] ?? { main: color, light: "#FFFFFF", dark: color };
  const fs = 12 * size;
  const o = appear === "flicker" && f < FLICKER.length ? FLICKER[f] : 1;
  const s = appear === "pop" ? popScale(f) : 1;

  const fill = [
    scanlines ? `repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 0.75px, rgba(0,0,0,0.38) 0.75px 1.5px)` : null,
    `linear-gradient(to bottom, ${p.light} 0%, ${p.main} 45%, ${p.dark} 100%)`,
  ]
    .filter(Boolean)
    .join(", ");

  const textStyle: React.CSSProperties = {
    fontFamily: FONT_PIXEL,
    fontSize: fs,
    lineHeight: 1,
    whiteSpace: "nowrap",
    letterSpacing: size,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top: Math.round(y),
        transform: `translate(-50%, -50%) scale(${s})`,
        opacity: o,
      }}
    >
      {crown ? (
        <div style={{ position: "absolute", left: "50%", top: -9 * Math.max(1, size / 2) - 2, transform: "translateX(-50%)", width: 11 * Math.max(1, size / 2), height: 7 * Math.max(1, size / 2), filter: `drop-shadow(0 0 3px ${theme.gold})` }}>
          <PixelBitmap rows={[...BITMAP.crown]} palette={{ g: theme.gold, w: "#FFF2B8", r: theme.red, d: theme.goldDark }} size={Math.max(1, size / 2)} />
        </div>
      ) : null}
      {/* 外發光：模糊的同色字 */}
      <div style={{ ...textStyle, position: "absolute", left: 0, top: 0, color: p.main, filter: `blur(${size * 1.6}px)`, opacity: 0.85 }}>{text}</div>
      {/* 暗色描邊（1 像素） */}
      <div
        style={{
          ...textStyle,
          position: "relative",
          color: "transparent",
          textShadow: `1px 0 0 ${theme.ink}, -1px 0 0 ${theme.ink}, 0 1px 0 ${theme.ink}, 0 -1px 0 ${theme.ink}, 0 2px 0 ${theme.ink}`,
        }}
      >
        {text}
      </div>
      {/* 本體：漸層 + 掃描線填色，點陣遮罩 */}
      <div
        style={{
          ...textStyle,
          position: "absolute",
          left: 0,
          top: 0,
          color: "transparent",
          backgroundImage: fill,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitMaskImage: "radial-gradient(circle, #000 55%, rgba(0,0,0,0.35) 75%)",
          WebkitMaskSize: `${size / 2}px ${size / 2}px`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
