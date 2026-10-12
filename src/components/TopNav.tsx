import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, fontSize } from "../theme";

/**
 * TopNav —— F2 頂部章節導航。列出所有段落，目前段落高亮（金底），已完成的金字打勾，未到的灰字。
 * 放在 PixelStage 的 ui（螢幕座標）。開場鉤子期間用 visible=false 隱藏。
 *
 * current 可以是固定的索引，也可以是時間表 [{ at: 幀, index }]（例如進入下一關時切換）。
 * 切換高亮是強調類動作：瞬間切換 + 3 幀放大回彈。
 */
export type TopNavProps = {
  chapters: string[];
  current: number | { at: number; index: number }[];
  visible?: boolean;
  /** 出現的幀（從上方滑入 6 幀），預設 0 = 一開始就在 */
  enterAt?: number;
};

const resolve = (f: number, cur: TopNavProps["current"]) => {
  if (typeof cur === "number") return { index: cur, since: -Infinity };
  let index = -1;
  let since = -Infinity;
  for (const c of [...cur].sort((a, b) => a.at - b.at)) {
    if (f >= c.at) {
      index = c.index;
      since = c.at;
    }
  }
  return { index, since };
};

export const TopNav: React.FC<TopNavProps> = ({ chapters, current, visible = true, enterAt = 0 }) => {
  const f = useCurrentFrame();
  if (!visible || f < enterAt) return null;
  const { index, since } = resolve(f, current);
  const enter = Math.min(1, (f - enterAt) / 6);
  const pop = f - since < 3 ? [1.18, 1.08, 1.0][f - since] : 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${(1 - enter) * -80}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "rgba(10,14,28,0.82)",
          border: `4px solid ${color.navyLight}`,
          boxShadow: `0 0 0 4px ${color.ink}`,
          fontFamily: FONT_PIXEL,
          fontSize: fontSize.s,
          lineHeight: 1,
        }}
      >
        {chapters.map((name, i) => {
          const isCur = i === index;
          const done = i < index;
          return (
            <React.Fragment key={i}>
              {i > 0 ? <div style={{ width: 8, height: 8, background: done || isCur ? color.goldDark : color.grayDark }} /> : null}
              <div
                style={{
                  padding: "8px 16px",
                  color: isCur ? color.ink : done ? color.gold : color.gray,
                  background: isCur ? color.gold : "transparent",
                  boxShadow: isCur ? `0 0 24px ${color.gold}` : undefined,
                  transform: isCur ? `scale(${pop})` : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {done ? "✓ " : ""}
                {name}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
