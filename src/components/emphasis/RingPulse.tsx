import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { seeded } from "../../lib/util";

/**
 * RingPulse —— B1 光環脈衝（全片最常用的強調）。時機對準字幕高亮詞。
 * 從目標中心擴散一圈細線圓環，外圍帶點狀粒子，目標同時閃一下白光；預設 15 幀淡出。
 * 像素層座標。
 */
export type RingPulseProps = {
  x: number;
  y: number;
  /** 最大半徑（像素），預設 34 */
  radius?: number;
  color?: string;
  /** 時長（幀），預設 15（0.5 秒） */
  duration?: number;
  /** 外圍點狀粒子數，預設 12 */
  dots?: number;
  /** 中心白光，預設 true */
  flash?: boolean;
  seed?: number;
};

export const RingPulse: React.FC<RingPulseProps> = ({
  x,
  y,
  radius = 34,
  color = "#FFFFFF",
  duration = 15,
  dots = 12,
  flash = true,
  seed = 7,
}) => {
  const f = useCurrentFrame();
  const parts = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: dots }, (_, i) => ({ a: (i / dots) * Math.PI * 2 + r() * 0.4, k: 1.1 + r() * 0.35, s: r() > 0.7 ? 2 : 1 }));
  }, [dots, seed]);
  if (f < 0 || f >= duration) return null;

  const t = f / duration;
  const e = 1 - Math.pow(1 - t, 3); // ease-out
  const r = 3 + (radius - 3) * e;
  const o = 1 - t;
  const stroke = Math.max(0.5, 1.5 * (1 - t));

  return (
    <>
      {flash && f < 7 ? (
        <div
          style={{
            position: "absolute",
            left: x - 16,
            top: y - 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 35%, rgba(255,255,255,0) 70%)",
            opacity: 1 - f / 7,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `${stroke}px solid ${color}`,
          boxShadow: `0 0 3px ${color}, inset 0 0 3px ${color}`,
          opacity: o,
          boxSizing: "border-box",
        }}
      />
      {parts.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: Math.round(x + Math.cos(p.a) * r * p.k),
            top: Math.round(y + Math.sin(p.a) * r * p.k),
            width: p.s,
            height: p.s,
            background: color,
            opacity: o,
          }}
        />
      ))}
    </>
  );
};
