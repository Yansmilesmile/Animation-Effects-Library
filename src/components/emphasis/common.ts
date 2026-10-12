import type React from "react";

// 強調類組件共用：
// - 所有強調組件的 useCurrentFrame() 都是「觸發後經過的幀數」，由時間軸用 <Sequence from={start}> 包住。
// - 出現方式只有兩種（詞典規則 10）：瞬間出現，或 2–3 幀的放大回彈。

export type Appear = "instant" | "pop";

// 3 幀放大回彈
export const popScale = (f: number, appear: Appear = "pop") =>
  appear === "pop" && f < 3 ? [1.28, 1.1, 1][f] : 1;

// 蓋滿整個畫面的疊加層（放在鏡頭裡被縮放、平移也一樣蓋滿）
export const COVER: React.CSSProperties = { position: "absolute", left: -2000, top: -2000, width: 5000, height: 5000 };

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
