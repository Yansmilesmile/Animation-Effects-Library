import React from "react";
import { useCurrentFrame } from "remotion";
import { color as theme } from "../../theme";
import { easeCamera } from "../../lib/util";

/**
 * SunBurst —— B5 放射光芒。目標背後一圈太陽光般的放射光束，持續緩慢旋轉，比 B1 更隆重。
 * 用於揭曉答案、獲得獎勵、寶箱、人物資料卡背景。請放在目標「之前」渲染（在目標後面）。
 * 像素層座標，(x, y) 是中心。出現時 8 幀放大展開，之後一直旋轉。
 */
export type SunBurstProps = {
  x: number;
  y: number;
  /** 半徑（像素），預設 90 */
  radius?: number;
  color?: string;
  /** 光束數量，預設 14 */
  rays?: number;
  /** 旋轉速度（度/幀），預設 0.4 */
  speed?: number;
  opacity?: number;
};

export const SunBurst: React.FC<SunBurstProps> = ({ x, y, radius = 90, color = theme.goldLight, rays = 14, speed = 0.4, opacity = 0.6 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const grow = easeCamera(Math.min(1, f / 8));
  const step = 360 / rays;
  const w = step * 0.42;
  return (
    <div
      style={{
        position: "absolute",
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        transform: `scale(${0.3 + 0.7 * grow})`,
        opacity: opacity * grow,
        mixBlendMode: "screen",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `repeating-conic-gradient(from ${f * speed}deg, ${color} 0deg ${w}deg, rgba(0,0,0,0) ${w + 2}deg ${step}deg)`,
          WebkitMaskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)",
          maskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: radius * 0.45,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
          opacity: 0.8,
        }}
      />
    </div>
  );
};
