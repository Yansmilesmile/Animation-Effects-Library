import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { seeded } from "../../lib/util";
import { PixelBitmap } from "../PixelBitmap";
import { clamp01 } from "../emphasis/common";

/**
 * Puff —— 像素灰塵 / 煙霧（C1 落地揚塵、C2 道具替換、C38 煙霧登場共用）。
 * 一團實心像素圓往外擴散、縮小、淡出。像素層座標，(x, y) 是中心（dust 時是地面接觸點）。
 *
 * mode：
 * - dust：貼著地面往左右兩側噴開，微微上揚（掉落、摔、放下）
 * - smoke：往四周擴散並往上飄，粒子較大（人物或物件憑空出現 / 消失）
 */
export type PuffProps = {
  x: number;
  y: number;
  mode?: "dust" | "smoke";
  /** 粒子數，預設 dust 8 / smoke 9 */
  count?: number;
  /** 擴散距離（像素），預設 dust 14 / smoke 16 */
  spread?: number;
  /** 時長（幀），預設 dust 14 / smoke 20 */
  duration?: number;
  /** 粒子最大半徑，預設 dust 3 / smoke 4 */
  size?: number;
  color?: string;
  shade?: string;
  seed?: number;
};

// 半徑 r 的實心像素圓（右下一圈暗邊），結果快取
const DISC = new Map<number, string[]>();
const disc = (r: number) => {
  const hit = DISC.get(r);
  if (hit) return hit;
  const n = r * 2 + 1;
  const rows: string[] = [];
  for (let j = 0; j < n; j++) {
    let row = "";
    for (let i = 0; i < n; i++) {
      const dx = i - r;
      const dy = j - r;
      const d = dx * dx + dy * dy;
      const inside = d <= r * r + r * 0.6;
      // 右下外緣一格畫暗色，做出立體感
      const rim = inside && (dx + 1) * (dx + 1) + (dy + 1) * (dy + 1) > r * r + r * 0.6;
      row += inside ? (rim && r > 1 ? "o" : "c") : ".";
    }
    rows.push(row);
  }
  DISC.set(r, rows);
  return rows;
};

export const Puff: React.FC<PuffProps> = ({ x, y, mode = "dust", count, spread, duration, size, color = "#E6DFCF", shade = "#A79F90", seed = 3 }) => {
  const f = useCurrentFrame();
  const smoke = mode === "smoke";
  const n = count ?? (smoke ? 9 : 8);
  const dist = spread ?? (smoke ? 16 : 14);
  const dur = duration ?? (smoke ? 20 : 14);
  const big = size ?? (smoke ? 4 : 3);
  const parts = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: n }, (_, i) => {
      // dust：一半往左、一半往右，角度貼近地面；smoke：均勻一圈
      const right = i % 2 === 0;
      const a = smoke ? (i / n) * Math.PI * 2 + r() * 0.6 : right ? -0.1 - r() * 0.45 : Math.PI + 0.1 + r() * 0.45;
      return { a, d: 0.45 + r() * 0.55, s: Math.max(1, Math.round(big * (0.6 + r() * 0.4))), delay: Math.floor(r() * 3) };
    });
  }, [n, seed, smoke, big]);
  if (f < 0 || f >= dur) return null;

  return (
    <>
      {parts.map((p, i) => {
        const t = clamp01((f - p.delay) / Math.max(1, dur - p.delay));
        if (f < p.delay) return null;
        const e = 1 - (1 - t) * (1 - t);
        // 第一幀就有 30% 的距離，一開始是一團雲而不是一顆球
        const d = dist * p.d * (0.3 + 0.7 * e);
        const cx = x + Math.cos(p.a) * d;
        const cy = y + Math.sin(p.a) * d * (smoke ? 0.75 : 0.5) - (smoke ? 8 : 3) * e;
        // smoke 先膨脹再縮小；dust 一路縮小
        const grow = smoke ? 1 + 0.5 * Math.sin(Math.min(1, t * 2) * Math.PI * 0.5) - 0.9 * t * t : 1 - 0.7 * t;
        const r = Math.max(0, Math.round(p.s * grow));
        if (r <= 0) return null;
        return (
          <PixelBitmap
            key={i}
            rows={disc(r)}
            palette={{ c: color, o: shade }}
            x={Math.round(cx - r)}
            y={Math.round(cy - r)}
            style={{ opacity: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 }}
          />
        );
      })}
    </>
  );
};
