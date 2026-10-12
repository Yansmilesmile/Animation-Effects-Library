import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, LAYOUT } from "../../theme";

/**
 * LevelTitleCard —— C8 關卡標題卡。上方白底小字「第 N 關」，下方深藍底大字寫這關的規則。
 * 瞬間出現（2 幀回彈），停 hold 幀；離開時帶殘影錯位：複製兩層、上下錯開幾個像素、降低透明度，持續 3 幀後一起消失。
 * 放在 PixelStage 的 hud（畫面座標），預設在畫面中央偏上（LAYOUT.focusY）。
 * 總長 = hold + 3 幀。
 */
export type LevelTitleCardProps = {
  /** 上方小字，例如「第一關」；傳數字會轉成「第 N 關」 */
  level: string | number;
  /** 下方大字：這關的規則 */
  title: string;
  /** 停留幀數，預設 60（2 秒） */
  hold?: number;
  x?: number;
  y?: number;
};

const NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

const Card: React.FC<{ level: string; title: string }> = ({ level, title }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT_PIXEL, lineHeight: 1 }}>
    <div
      style={{
        background: color.white,
        color: color.ink,
        fontSize: 12,
        padding: "2px 6px",
        boxShadow: `0 0 0 1px ${color.ink}`,
        position: "relative",
        zIndex: 1,
        marginBottom: -1,
      }}
    >
      {level}
    </div>
    <div
      style={{
        background: color.navy,
        color: color.white,
        fontSize: 24,
        padding: "5px 10px",
        border: `1px solid ${color.gold}`,
        boxShadow: `0 0 0 1px ${color.ink}, 0 3px 0 1px rgba(0,0,0,0.5)`,
        whiteSpace: "nowrap",
        textShadow: `0 2px 0 ${color.navyDark}`,
      }}
    >
      {title}
    </div>
  </div>
);

export const LevelTitleCard: React.FC<LevelTitleCardProps> = ({ level, title, hold = 60, x = LAYOUT.centerX, y = LAYOUT.focusY }) => {
  const f = useCurrentFrame();
  if (f < 0 || f >= hold + 3) return null;
  const lv = typeof level === "number" ? `第${NUM[level] ?? level}關` : level;
  const s = f === 0 ? 1.15 : f === 1 ? 1.05 : 1;
  const leaving = f >= hold;
  const k = f - hold; // 0..2
  const base: React.CSSProperties = { position: "absolute", left: Math.round(x), top: Math.round(y) };

  if (leaving) {
    // 殘影錯位：上下兩層錯開，越來越淡
    const off = [3, 6, 9][k];
    const o = [0.75, 0.5, 0.25][k];
    return (
      <>
        <div style={{ ...base, transform: `translate(calc(-50% - ${off}px), calc(-50% - ${off / 3}px))`, opacity: o, filter: "hue-rotate(-20deg)" }}>
          <Card level={lv} title={title} />
        </div>
        <div style={{ ...base, transform: `translate(calc(-50% + ${off}px), calc(-50% + ${off / 3}px))`, opacity: o * 0.8 }}>
          <Card level={lv} title={title} />
        </div>
      </>
    );
  }
  return (
    <div style={{ ...base, transform: `translate(-50%, -50%) scale(${s})` }}>
      <Card level={lv} title={title} />
    </div>
  );
};
