import React, { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";
import { color } from "../theme";
import { easeCamera } from "../lib/util";

/**
 * PropFx —— 讓舞台上「已經擺好的物件」本身動起來（AI 在你擺好的場景上加動畫用）。
 * 時間軸：{ "component": "PropFx", "target": "書架", "start": 30, "duration": 20, "props": { "effect": "shake" } }
 *
 * effect：
 * - shake   左右抖動（amount 像素，預設 2）
 * - bounce  原地跳一下（height 像素，預設 6；times 次數，預設 1）
 * - pulse   放大縮小呼吸（amount 比例，預設 0.08；period 幀，預設 20）
 * - glow    發光外框（color，預設金色）
 * - tint    染色（color：red / gray / gold / #hex，預設 red）；不給 duration = 一直保持
 * - hide    淡出消失，之後保持隱藏
 * - show    scene 開始時隱藏，start 時淡入出現（帶一點回彈）
 * - move    移動到 (dx, dy) 偏移，之後停在那裡
 */
export type PropFxEffect = "shake" | "bounce" | "pulse" | "glow" | "tint" | "hide" | "show" | "move";
export const PROP_FX_EFFECTS: PropFxEffect[] = ["shake", "bounce", "pulse", "glow", "tint", "hide", "show", "move"];

export type PropFxEntry = {
  target: string;
  effect: PropFxEffect;
  start: number;
  duration?: number;
  amount?: number;
  height?: number;
  times?: number;
  period?: number;
  color?: string;
  dx?: number;
  dy?: number;
};

const DEFAULT_DURATION: Record<PropFxEffect, number> = { shake: 20, bounce: 18, pulse: 60, glow: 45, tint: 99999, hide: 8, show: 8, move: 30 };

export type FxState = { dx: number; dy: number; scale: number; opacity: number; glow?: string; tint?: string };

export const computeFx = (entries: PropFxEntry[], f: number): FxState => {
  const s: FxState = { dx: 0, dy: 0, scale: 1, opacity: 1 };
  for (const e of entries) {
    const d = e.duration ?? DEFAULT_DURATION[e.effect];
    const t = f - e.start;
    const active = t >= 0 && t < d;
    const p = Math.min(1, Math.max(0, t / d));
    switch (e.effect) {
      case "shake":
        if (active) s.dx += Math.round((e.amount ?? 2) * Math.sin(t * 2.2) * (1 - p));
        break;
      case "bounce":
        if (active) s.dy -= Math.round(Math.abs(Math.sin(Math.PI * (e.times ?? 1) * p)) * (e.height ?? 6) * (1 - p * 0.5));
        break;
      case "pulse":
        if (active) s.scale *= 1 + (e.amount ?? 0.08) * Math.sin((2 * Math.PI * t) / (e.period ?? 20));
        break;
      case "glow":
        if (active) s.glow = e.color ?? color.goldLight;
        break;
      case "tint":
        if (active) s.tint = e.color ?? "red";
        break;
      case "hide":
        if (t >= 0) s.opacity *= 1 - easeCamera(p);
        break;
      case "show":
        if (t < 0) s.opacity = 0;
        else {
          s.opacity *= easeCamera(p);
          if (t < 3) s.scale *= [1.25, 1.1, 1][t];
        }
        break;
      case "move":
        if (t >= 0) {
          const k = easeCamera(p);
          s.dx += Math.round((e.dx ?? 0) * k);
          s.dy += Math.round((e.dy ?? 0) * k);
        }
        break;
    }
  }
  return s;
};

export const PropFxContext = createContext<PropFxEntry[]>([]);

/**
 * FxTarget —— 包住一個有名字的物件：套用 PropFx 的位移、縮放（以物件底部中心為軸）、透明度，
 * glow / tint 交給 render 自己處理（Sprite / Host 的 glow、tint 參數）。
 */
export const FxTarget: React.FC<{ name?: string; x: number; y: number; render: (fx: FxState) => React.ReactNode }> = ({ name, x, y, render }) => {
  const list = useContext(PropFxContext);
  const f = useCurrentFrame();
  const fx = computeFx(name ? list.filter((e) => e.target === name) : [], f);
  if (fx.dx === 0 && fx.dy === 0 && fx.scale === 1 && fx.opacity === 1) return <>{render(fx)}</>;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fx.opacity,
        transformOrigin: `${x}px ${y}px`,
        transform: `translate(${fx.dx}px, ${fx.dy}px) scale(${fx.scale})`,
      }}
    >
      {render(fx)}
    </div>
  );
};
