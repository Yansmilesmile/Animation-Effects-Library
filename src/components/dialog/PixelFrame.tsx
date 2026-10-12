import React from "react";
import { PixelBitmap } from "../PixelBitmap";

// 對話框 / 選項框共用的色票與外框（移植自 pixel_choice_box.html，原稿以 4px 為一格，這裡除以 4 換成像素層單位）
export const DLG = {
  navy: "#1B2A4A",
  paper: "#F8F4E3",
  gold: "#E8B830",
  goldDark: "#8A6A10",
  optBorder: "#CFC5A4",
  optBg: "#FFFDF4",
  selText: "#FFE9A8",
  red: "#C8382E",
} as const;

// 7×7 紅寶石：G 金框暗部、g 金框亮部、d 深紅、r 紅、l 亮紅、h 高光
const GEM = ["...G...", "..GgG..", ".Glhrg.", "GglrrdG", ".grrdG.", "..GdG..", "...G..."];
const GEM_PALETTE = { g: DLG.gold, G: DLG.goldDark, d: "#6E1016", r: "#C8282E", l: "#F05A5A", h: "#FFE0E0" };

/**
 * PixelFrame —— 深藍外框 + 米色間隔 + 金色內線，四角各一顆紅寶石。像素層單位（hud）。
 */
export const PixelFrame: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: Math.round(x), top: Math.round(y), width: w, height: h }}>
    <div
      style={{
        position: "relative",
        width: "100%",
        height: h === undefined ? undefined : "100%",
        boxSizing: "border-box",
        background: DLG.paper,
        color: DLG.navy,
        border: `1px solid ${DLG.navy}`,
        boxShadow: `inset 0 0 0 1px ${DLG.paper}, inset 0 0 0 2px ${DLG.gold}, 0 2px 0 1px rgba(0,0,0,0.35)`,
        ...style,
      }}
    >
      {children}
    </div>
    {[
      [-3, -3],
      [w - 4, -3],
      [-3, null],
      [w - 4, null],
    ].map(([gx, gy], i) => (
      <div key={i} style={{ position: "absolute", left: gx as number, top: gy === null ? undefined : gy, bottom: gy === null ? -3 : undefined, width: 7, height: 7 }}>
        <PixelBitmap rows={GEM} palette={GEM_PALETTE} />
      </div>
    ))}
  </div>
);
