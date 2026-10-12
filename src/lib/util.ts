import { Easing, interpolate } from "remotion";
import { EASE_CAMERA } from "../theme";

// 固定 seed 的亂數（mulberry32），每次渲染結果相同
export const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const easeCamera = Easing.bezier(...EASE_CAMERA);

// 0→1 的進度，套用鏡頭緩動
export const progress = (frame: number, start: number, duration: number, easing = easeCamera) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 像素座標取整數，對齊像素格
export const px = (v: number) => Math.round(v);

// hex → [r,g,b] 0..1
export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
