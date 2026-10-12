import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, fontSize } from "../theme";

/**
 * Subtitle —— F3 底部字幕。白字粗描邊像素字體，每句 1–2 個關鍵詞用金橙色。
 * 放在 PixelStage 的 ui（螢幕座標）。
 *
 * - Subtitle：顯示一句。
 * - Subtitles：字幕軌，依 start / end（幀）切換句子，換句時 2 幀快速淡入淡出。
 *
 * highlight 的 at（高亮詞念出的幀）給時間軸用：其他組件可以對準這個時間觸發強調動效（詞典規則 2）。
 */
export type Highlight = string | { word: string; at?: number };

export type SubtitleLine = { start: number; end: number; text: string; highlight?: Highlight[] };

const words = (h: Highlight[] = []) => h.map((w) => (typeof w === "string" ? w : w.word)).filter(Boolean);

// 像素描邊：上下左右 + 斜角兩圈硬邊陰影（4px = 像素字體的一個點）
const OUTLINE = (() => {
  const s: string[] = [];
  for (const d of [4, 8]) {
    for (const [x, y] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]]) {
      s.push(`${x}px ${y}px 0 ${color.ink}`);
    }
  }
  s.push(`0 12px 0 rgba(0,0,0,0.55)`);
  return s.join(", ");
})();

const split = (text: string, hl: string[]) => {
  const out: { t: string; h: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    let best = -1;
    let bestWord = "";
    for (const w of hl) {
      const j = text.indexOf(w, i);
      if (j !== -1 && (best === -1 || j < best || (j === best && w.length > bestWord.length))) {
        best = j;
        bestWord = w;
      }
    }
    if (best === -1) {
      out.push({ t: text.slice(i), h: false });
      break;
    }
    if (best > i) out.push({ t: text.slice(i, best), h: false });
    out.push({ t: bestWord, h: true });
    i = best + bestWord.length;
  }
  return out;
};

export const Subtitle: React.FC<{
  text: string;
  highlight?: Highlight[];
  opacity?: number;
  /** 距離畫面底部（螢幕 px），預設 84 */
  bottom?: number;
  size?: number;
}> = ({ text, highlight, opacity = 1, bottom = 84, size = fontSize.xl }) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      right: 120,
      bottom,
      textAlign: "center",
      fontFamily: FONT_PIXEL,
      fontSize: size,
      lineHeight: 1.35,
      color: color.white,
      textShadow: OUTLINE,
      opacity,
      letterSpacing: 2,
    }}
  >
    {split(text, words(highlight)).map((s, i) => (
      <span key={i} style={s.h ? { color: color.highlight } : undefined}>
        {s.t}
      </span>
    ))}
  </div>
);

export const Subtitles: React.FC<{ lines: SubtitleLine[]; bottom?: number }> = ({ lines, bottom }) => {
  const f = useCurrentFrame();
  const line = lines.find((l) => f >= l.start && f < l.end);
  if (!line) return null;
  const FADE = 2;
  const o = Math.min(1, (f - line.start + 1) / FADE, (line.end - f) / FADE);
  return <Subtitle text={line.text} highlight={line.highlight} opacity={o} bottom={bottom} />;
};
