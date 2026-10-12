// 全片共用的 theme tokens（詞典「一、整體風格」色彩語義）
// 金 = 好 / 價值 / 正確；紅 = 壞 / 否定 / 歸零；深藍 = 夜晚 / 普通的你 / 還沒開始

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

// 像素層：480×270，整層放大 4 倍（詞典「五」：素材按 1/4 解析度繪製）
export const PIXEL = { width: 480, height: 270, scale: 4 } as const;

// 構圖：人物和物品站在畫面底部往上 20% 的地面線（畫面高度 80%，螢幕上的像素層座標 y = 216），剛好在字幕上方。
// groundY / focusY 是「畫面上」的位置；hud 裡的東西直接用。
export const LAYOUT = {
  groundY: Math.round(PIXEL.height * 0.8), // 216：地面線
  focusY: Math.round(PIXEL.height * 0.4), // 108：hud 大字、標題的重心
  centerX: PIXEL.width / 2,
} as const;

// 預設鏡頭放大 1.5 倍：每像素 = 4 × 1.5 = 6 螢幕 px（整數），人物在畫面中大一點。
export const STAGE_ZOOM = 1.5;

// 場景（世界座標）的標準地面線：配合 Camera 預設取景 shot()，世界 y=160 會落在畫面 80%。
// 預設取景下可見範圍是世界 x 80–400、y 16–196。
export const WORLD = { groundY: 160, centerX: 240 } as const;

export const color = {
  gold: "#E8B04A",
  goldLight: "#FFD978",
  goldDark: "#A8741F",
  red: "#D9443A",
  redLight: "#FF6B5B",
  redDark: "#8C1F1A",
  navy: "#1E2F5C",
  navyLight: "#3A5598",
  navyDark: "#111A36",
  bgNavyBlack: "#0A0E1C",
  bgBrown: "#1C130E",
  white: "#FFFFFF",
  highlight: "#FFA826", // 字幕關鍵詞金橙色
  gray: "#8A8FA3",
  grayDark: "#4A4E5E",
  ink: "#05070E", // 描邊
} as const;

// 鏡頭和光：平滑緩動 cubic-bezier(.65,0,.35,1)（詞典「五」）
export const EASE_CAMERA = [0.65, 0, 0.35, 1] as const;

// 像素字體 Fusion Pixel 12px：只用 12 的整數倍字號，字才不會糊
export const FONT_PIXEL = "FusionPixel";
export const fontSize = { s: 24, m: 36, l: 48, xl: 60, xxl: 96 } as const;
