import React from "react";
import { useCurrentFrame } from "remotion";
import { LAYOUT, PIXEL, STAGE_ZOOM, WORLD } from "../theme";
import { easeCamera, lerp, progress } from "../lib/util";
import { ErrorBox } from "./ErrorBox";

/**
 * Camera —— A 類鏡頭（A4 推軌、A5 先局部再全貌、A6 俯仰推入）。放在 PixelStage 的 children 裡包住場景。
 *
 * 鏡頭狀態 = { x, y, zoom, tilt }：
 * - x, y：畫面中心對準的世界座標
 * - zoom：1 = 廣角看整個 480×270；預設取景 shot() 是 1.5（人物站在畫面 80% 的地面線）
 *   建議用 1、1.25、1.5、2、2.5 這類倍率（×4 後是整數），像素寬度才會均勻
 * - tilt：向下俯的角度（度），只有 tilt-push 會用到
 *
 * moves 依序套用，每一段從上一段的結束狀態緩動到 to（可用 from 覆蓋起點）。
 * 類型只是語意標籤，方便分鏡 AI 書寫：push = 推近、pull = 拉遠、pan = 平移、
 * tilt-push = 俯仰推入（A6：由平視向下俯並推近，約 30 幀）。緩動預設 cubic-bezier(.65,0,.35,1)。
 */
export type CameraState = { x: number; y: number; zoom: number; tilt: number };

export type CameraMove = {
  type: "push" | "pull" | "pan" | "tilt-push" | "cut";
  start: number;
  duration?: number;
  from?: Partial<CameraState>;
  to: Partial<CameraState>;
  /** "camera"（預設）| "linear" */
  easing?: "camera" | "linear";
};

// 廣角：整個 480×270 世界
export const CAMERA_WIDE: CameraState = { x: PIXEL.width / 2, y: PIXEL.height / 2, zoom: 1, tilt: 0 };

/**
 * 標準取景：放大 STAGE_ZOOM（1.5），讓世界的地面線 groundY 落在畫面 80%（LAYOUT.groundY）。
 * Camera 沒給 initial 時就用這個。
 */
export const shot = ({ x = WORLD.centerX, groundY = WORLD.groundY, zoom = STAGE_ZOOM } = {}): CameraState => ({
  x,
  y: groundY - (LAYOUT.groundY - PIXEL.height / 2) / zoom,
  zoom,
  tilt: 0,
});

export const CAMERA_HOME = shot();

/** 世界座標 → 畫面座標（像素層 480×270），給「場景裡的東西飛到 hud」這類銜接用 */
export const worldToScreen = (cam: CameraState, wx: number, wy: number) => ({
  x: PIXEL.width / 2 + (wx - cam.x) * cam.zoom,
  y: PIXEL.height / 2 + (wy - cam.y) * cam.zoom,
});

const DEFAULT_DURATION: Record<CameraMove["type"], number> = {
  push: 45,
  pull: 45,
  pan: 45,
  "tilt-push": 30,
  cut: 1,
};

export const cameraAt = (frame: number, moves: CameraMove[], initial: CameraState = CAMERA_HOME) => {
  let state = { ...initial };
  const sorted = [...moves].sort((a, b) => a.start - b.start);
  for (const m of sorted) {
    if (frame < m.start) break;
    const from = { ...state, ...m.from };
    const to = { ...from, ...m.to };
    if (m.type === "tilt-push" && m.to.tilt === undefined) to.tilt = 35;
    const d = m.type === "cut" ? 1 : m.duration ?? DEFAULT_DURATION[m.type];
    const t = m.type === "cut" ? 1 : progress(frame, m.start, d, m.easing === "linear" ? (v) => v : easeCamera);
    state = {
      x: lerp(from.x, to.x, t),
      y: lerp(from.y, to.y, t),
      zoom: lerp(from.zoom, to.zoom, t),
      tilt: lerp(from.tilt, to.tilt, t),
    };
  }
  return state;
};

export const Camera: React.FC<{
  moves?: CameraMove[];
  initial?: Partial<CameraState>;
  children?: React.ReactNode;
}> = ({ moves = [], initial, children }) => {
  const frame = useCurrentFrame();
  const bad = moves.find((m) => !DEFAULT_DURATION[m.type as CameraMove["type"]]);
  if (bad) return <ErrorBox pixel message={`Camera：不支援的鏡頭類型「${bad.type}」`} />;

  const s = cameraAt(frame, moves, { ...CAMERA_HOME, ...initial });
  const cx = PIXEL.width / 2;
  const cy = PIXEL.height / 2;
  // 讓 (s.x, s.y) 落在畫面中心，再縮放
  const transform = `translate(${cx - s.x * s.zoom}px, ${cy - s.y * s.zoom}px) scale(${s.zoom})`;

  const inner = <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform }}>{children}</div>;
  // 沒有俯仰時不要建立 3D 容器：3D 會讓 Chrome 把整層當貼圖做平滑縮放，推近後像素變糊
  if (!s.tilt) return inner;
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 300, perspectiveOrigin: "50% 0%" }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transform: `rotateX(${s.tilt}deg)` }}>
        {inner}
      </div>
    </div>
  );
};
