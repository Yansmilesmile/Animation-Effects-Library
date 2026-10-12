import React from "react";

/**
 * PixelBitmap —— 用字串畫小型像素圖（✕、王冠、星星、鎖、汗滴…），素材庫裡沒有或需要精確控制形狀時用。
 * rows 每個字元是一個像素，"." 或空白 = 透明，其他字元對應 palette 的顏色。
 * 在像素層裡 1 格 = 1 像素（可用 size 放大成整數倍）。
 */
export const PixelBitmap: React.FC<{
  rows: string[];
  palette: Record<string, string>;
  x?: number;
  y?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ rows, palette, x = 0, y = 0, size = 1, style }) => {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, j) =>
    row.split("").forEach((ch, i) => {
      const c = palette[ch];
      if (c) rects.push(<rect key={`${i}-${j}`} x={i} y={j} width={1.02} height={1.02} fill={c} />);
    }),
  );
  return (
    <svg
      width={w * size}
      height={h * size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ position: "absolute", left: Math.round(x), top: Math.round(y), overflow: "visible", ...style }}
    >
      {rects}
    </svg>
  );
};

// ── 共用點陣 ──────────────────────────────────────────
export const BITMAP = {
  // ✕：r = 紅、d = 暗紅描邊、w = 高光
  cross: [
    "dd.......dd",
    "drd.....drd",
    "dwrd...drrd",
    ".drrd.drrd.",
    "..drrdrrd..",
    "...drrrd...",
    "..drrdrrd..",
    ".drrd.drrd.",
    "drrd...drrd",
    "drd.....drd",
    "dd.......dd",
  ],
  crown: [
    "g....g....g",
    "gg..ggg..gg",
    "ggg.grg.ggg",
    "ggggggggggg",
    "gwgwgrgwgwg",
    "ggggggggggg",
    "ddddddddddd",
  ],
  star: [
    "...w...",
    "...w...",
    "..www..",
    "wwwwwww",
    "..www..",
    "...w...",
    "...w...",
  ],
  lock: [
    "..ddd..",
    ".d...d.",
    ".d...d.",
    "ggggggg",
    "ggg.ggg",
    "ggg.ggg",
    "ggggggg",
  ],
  // 手形游標：k = 黑描邊、w = 白
  cursor: [
    "...kk......",
    "..kwwk.....",
    "..kwwk.....",
    "..kwwkkk...",
    "..kwwkwwkk.",
    "kkkwwkwwkwk",
    "kwwkwwwwwwk",
    "kwwwwwwwwwk",
    ".kwwwwwwwwk",
    "..kwwwwwwk.",
    "...kwwwwk..",
    "...kkkkkk..",
  ],
  // 獎盃：g = 金、w = 高光、d = 暗金
  trophy: [
    "ggggggggggg",
    "g.gwggggd.g",
    "g.gwggggd.g",
    ".ggwggggdg.",
    "...gggggd..",
    "....gggd...",
    ".....gd....",
    ".....gd....",
    "....gggd...",
    "...ddddddd.",
  ],
  sweat: [
    "..b.",
    ".bb.",
    "bbwb",
    "bbbb",
    ".bb.",
  ],
} as const;
