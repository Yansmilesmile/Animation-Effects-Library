import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { PixelBitmap } from "../PixelBitmap";
import { popScale } from "./common";

/**
 * QuestionBubble —— B14 頭上問號。角色頭頂冒出白底「?」對話泡泡，可在旁邊帶一句反問。
 * 像素層座標，(x, y) 是泡泡尾巴尖端（放在角色頭頂上方 2–4 像素）。
 * 出現 3 幀回彈，之後每 24 幀上下浮動 1 像素。
 */
export type QuestionBubbleProps = {
  x: number;
  y: number;
  /** 泡泡裡的字，預設「?」 */
  text?: string;
  /** 泡泡右邊的反問（深底白字） */
  question?: string;
  /** 字級倍數 1 或 2，預設 2 */
  size?: 1 | 2;
  /** 字的顏色，預設深藍 */
  ink?: string;
};

// 泡泡尾巴：k = 描邊、w = 白
const TAIL = ["kwwwk", ".kwk.", "..k.."];

// 4 個角各切掉 2 像素，做出像素圓角
const chamfer = (c: number) => `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`;

export const QuestionBubble: React.FC<QuestionBubbleProps> = ({ x, y, text = "?", question, size = 2, ink = color.navy }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const bob = Math.sin(f / 12) > 0 ? -1 : 0;
  const fs = 12 * size;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top: Math.round(y + bob),
        transform: `translate(-50%, -100%) scale(${popScale(f)})`,
        transformOrigin: "50% 100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
        {/* 外層深色 = 描邊，內層白底 */}
        <div style={{ padding: 1, background: color.ink, clipPath: chamfer(2) }}>
          <div
            style={{
              background: "#FFFFFF",
              clipPath: chamfer(2),
              padding: `${2 + size}px ${4 + size}px`,
              minWidth: fs,
              textAlign: "center",
              fontFamily: FONT_PIXEL,
              fontSize: fs,
              lineHeight: 1,
              color: ink,
              boxShadow: "inset 0 -1px 0 #C9CFDB",
            }}
          >
            {text}
          </div>
        </div>
        {question ? (
          <div
            style={{
              position: "absolute",
              left: "100%",
              marginLeft: 4,
              top: "50%",
              transform: "translateY(-50%)",
              padding: "2px 4px",
              background: color.navyDark,
              border: `1px solid ${color.gray}`,
              boxShadow: `0 0 0 1px ${color.ink}`,
              color: color.white,
              fontFamily: FONT_PIXEL,
              fontSize: 12,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {question}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width: 5, height: 3, marginTop: -1 }}>
        <PixelBitmap rows={TAIL} palette={{ k: color.ink, w: "#FFFFFF" }} />
      </div>
    </div>
  );
};
