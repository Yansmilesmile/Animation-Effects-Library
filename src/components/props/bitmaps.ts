import { color } from "../../theme";

// 道具類組件共用的內建像素圖（素材庫沒有、或要精確控制顏色時用）。g = 主色、w = 高光、d = 暗部。

// 金鑰匙（16×7，橫放、鑰匙頭朝左）
export const KEY = [
  "..gggg..........",
  ".gwwwwg.........",
  "gww..wgggggggggg",
  "gw....gwwwwwwwgd",
  "gd...dgddddddgdd",
  ".gdddd......d.d.",
  "..dddd..........",
];

// 錢幣側面（10×3）：亮頂面 + 主色側邊 + 暗底，疊起來一枚一枚分得開
export const COIN = [".wwwwwwww.", "gggdgggdgg", ".dddddddd."];

export const TONES: Record<string, Record<string, string>> = {
  gold: { g: color.gold, w: color.goldLight, d: color.goldDark },
  red: { g: color.red, w: color.redLight, d: color.redDark },
  silver: { g: "#B8BDC9", w: "#EEF1F6", d: "#6E7484" },
};

export const ICONS: Record<string, string[]> = { key: KEY, coin: COIN };
