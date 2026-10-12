import React from "react";
import { color, FONT_PIXEL } from "../../theme";
import { BITMAP, PixelBitmap } from "../PixelBitmap";

// 技能卡的正反面（SkillCard、SkillSummary、ChestDeal 共用）。尺寸是 hud 的像素單位。
export const CARD = { w: 150, h: 190 } as const;

const NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
export const numeral = (n: number) => NUMERALS[n] ?? String(n);

const frame: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  border: `2px solid ${color.gold}`,
  boxShadow: `0 0 0 1px ${color.ink}, inset 0 0 0 1px ${color.goldDark}, 0 4px 0 1px rgba(0,0,0,0.5)`,
  boxSizing: "border-box",
};

/** 卡背：深藍格紋 + 大數字 + 三顆星；mark 預設是數字，也可以傳「?」 */
export const CardBack: React.FC<{ mark: string; w?: number; h?: number; stars?: boolean }> = ({ mark, w = CARD.w, h = CARD.h, stars = true }) => {
  const k = w / CARD.w;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div
        style={{
          ...frame,
          borderWidth: Math.max(1, Math.round(2 * k)),
          background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, rgba(0,0,0,0) 1px 6px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, rgba(0,0,0,0) 1px 6px), ${color.navy}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h * 0.26,
          textAlign: "center",
          fontFamily: FONT_PIXEL,
          fontSize: Math.max(12, Math.round((48 * k) / 12) * 12),
          lineHeight: 1,
          color: color.gold,
          textShadow: `0 ${Math.max(1, 2 * k)}px 0 ${color.goldDark}`,
        }}
      >
        {mark}
      </div>
      {stars ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.68, display: "flex", justifyContent: "center", gap: 4 * k }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: "relative", width: 7 * Math.max(1, Math.round(2 * k)), height: 7 * Math.max(1, Math.round(2 * k)) }}>
              <PixelBitmap rows={[...BITMAP.star]} palette={{ w: color.goldLight }} size={Math.max(1, Math.round(2 * k))} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/** 卡面：頂部紅標「技能 N」、標題、示範動畫框（children）、一句話 */
export const CardFront: React.FC<{ index: number; title: string; desc?: string; children?: React.ReactNode }> = ({ index, title, desc, children }) => (
  <div style={{ position: "relative", width: CARD.w, height: CARD.h, fontFamily: FONT_PIXEL, lineHeight: 1 }}>
    <div style={{ ...frame, background: `linear-gradient(${color.navyDark}, #0b1022)` }} />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: -7,
        transform: "translateX(-50%)",
        background: color.red,
        color: color.white,
        fontSize: 12,
        padding: "2px 6px",
        border: `1px solid ${color.goldLight}`,
        boxShadow: `0 0 0 1px ${color.ink}`,
        whiteSpace: "nowrap",
      }}
    >
      技能 {index}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 14, textAlign: "center", fontSize: 24, color: color.goldLight, textShadow: `0 2px 0 ${color.goldDark}`, whiteSpace: "nowrap" }}>
      {title}
    </div>
    {/* 示範動畫框：126 × 84，children 用這個框的區域座標 */}
    <div
      style={{
        position: "absolute",
        left: 12,
        top: 46,
        width: 126,
        height: 84,
        background: "#1a2448",
        boxShadow: `inset 0 0 0 1px ${color.navyLight}`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
    {desc ? (
      <div style={{ position: "absolute", left: 10, right: 10, top: 140, textAlign: "center", fontSize: 12, lineHeight: 1.3, color: color.white }}>{desc}</div>
    ) : null}
  </div>
);
