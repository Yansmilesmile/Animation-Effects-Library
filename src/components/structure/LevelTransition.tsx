import React from "react";
import { useCurrentFrame } from "remotion";
import { LAYOUT, PIXEL } from "../../theme";
import { easeCamera } from "../../lib/util";
import { Camera, CameraMove, CameraState } from "../Camera";

/**
 * LevelTransition —— 進關轉場。一支片固定用一種（詞典「節奏」：進關固定用同一種轉場，全片不換）。
 *
 * type "iris"（A21 圓形遮罩收縮）：畫面收成一個圓圈 → 全黑停 hold 幀 → 從圓圈打開（mode = "both"）。
 *   是覆蓋層，放在 PixelStage 的 hud；時間軸在全黑那幾幀切換場景。(x, y) 是圓心（畫面座標），預設對準主角。
 * type "tilt"（A6 俯仰推入）：鏡頭由平視向下俯並推近目標，約 30 幀。是包住場景的鏡頭，children 放場景內容。
 */
export type IrisProps = {
  type: "iris";
  /** close = 只收、open = 只開、both = 收 → 黑 → 開（預設） */
  mode?: "close" | "open" | "both";
  /** 收或開各自的幀數，預設 14 */
  duration?: number;
  /** 全黑停留幀數，預設 6 */
  hold?: number;
  x?: number;
  y?: number;
};

export type TiltProps = {
  type: "tilt";
  /** 推入目標（世界座標） */
  to: Partial<CameraState>;
  start?: number;
  duration?: number;
  initial?: Partial<CameraState>;
  /** 推入前後其他鏡頭移動 */
  moves?: CameraMove[];
  children?: React.ReactNode;
};

export type LevelTransitionProps = IrisProps | TiltProps;

// 收完全黑、開完全透明所需的最大半徑
const MAX_R = Math.hypot(PIXEL.width, PIXEL.height);

/** 總長度（幀），給時間軸排程用 */
export const irisLength = (p: IrisProps) => {
  const d = p.duration ?? 14;
  const h = p.hold ?? 6;
  return p.mode === "close" || p.mode === "open" ? d + h : d * 2 + h;
};
/** 「both」模式下，全黑開始的幀（在這之後切換場景） */
export const irisBlackAt = (p: IrisProps) => p.duration ?? 14;

const Iris: React.FC<IrisProps> = ({ mode = "both", duration = 14, hold = 6, x = LAYOUT.centerX, y = LAYOUT.groundY - 40 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  let r: number;
  if (mode === "close") {
    r = f < duration ? MAX_R * (1 - easeCamera(f / duration)) : 0;
    if (f >= duration + hold) r = 0;
  } else if (mode === "open") {
    r = f < hold ? 0 : MAX_R * easeCamera(Math.min(1, (f - hold) / duration));
    if (f >= hold + duration) return null;
  } else {
    if (f < duration) r = MAX_R * (1 - easeCamera(f / duration));
    else if (f < duration + hold) r = 0;
    else if (f < duration * 2 + hold) r = MAX_R * easeCamera((f - duration - hold) / duration);
    else return null;
  }
  // 圓圈邊緣用 0.6 像素過渡，保持清楚的圓形
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PIXEL.width,
        height: PIXEL.height,
        background: `radial-gradient(circle at ${x}px ${y}px, rgba(0,0,0,0) ${r}px, #000 ${r + 0.6}px)`,
      }}
    />
  );
};

const Tilt: React.FC<TiltProps> = ({ to, start = 0, duration = 30, initial, moves = [], children }) => (
  <Camera initial={initial} moves={[...moves, { type: "tilt-push", start, duration, to: { tilt: 30, ...to } }]}>
    {children}
  </Camera>
);

export const LevelTransition: React.FC<LevelTransitionProps> = (p) => (p.type === "iris" ? <Iris {...p} /> : <Tilt {...p} />);
