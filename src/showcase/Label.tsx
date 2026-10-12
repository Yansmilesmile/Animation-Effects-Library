import React from "react";
import { color, FONT_PIXEL, fontSize } from "../theme";

// 組件展示用：左下角標註組件名稱和詞典編號
export const Label: React.FC<{ name: string; code: string; note?: string }> = ({ name, code, note }) => (
  <div
    style={{
      position: "absolute",
      left: 32,
      bottom: 16,
      display: "flex",
      gap: 16,
      alignItems: "center",
      padding: "8px 16px",
      background: "rgba(0,0,0,0.75)",
      border: `4px solid ${color.gold}`,
      fontFamily: FONT_PIXEL,
      fontSize: fontSize.s,
      color: color.white,
    }}
  >
    <span style={{ color: color.gold }}>{name}</span>
    <span style={{ color: color.gray }}>{code}</span>
    {note ? <span>{note}</span> : null}
  </div>
);

// 像素層座標的說明小字（放在 ui 層，用像素座標 ×4 換算）
export const Caption: React.FC<{ x: number; y: number; text: string; c?: string }> = ({ x, y, text, c }) => (
  <div
    style={{
      position: "absolute",
      left: x * 4 - 150,
      top: y * 4,
      width: 300,
      textAlign: "center",
      fontFamily: FONT_PIXEL,
      fontSize: fontSize.s,
      color: c ?? color.gray,
      textShadow: `4px 4px 0 ${color.ink}`,
    }}
  >
    {text}
  </div>
);
