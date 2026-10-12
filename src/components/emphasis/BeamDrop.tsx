import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, WORLD } from "../../theme";
import { COVER } from "./common";
import { easeCamera } from "../../lib/util";
import { Ambience } from "../Ambience";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { Sprite } from "../Sprite";
import { RingPulse } from "./RingPulse";

/**
 * BeamDrop —— B12 光柱降臨 + B4 發光放大。讓核心物件神聖地登場（開場「從天而降」必用）。
 * 流程：全黑 → 光柱從上方打下（0–6 幀）→ 光柱中段閃一顆星（6–12）→ 物件從畫面上方降入光中
 * → 落地（landAt）輕彈一下 + RingPulse + 發光外框 + 地面光暈。像素層座標。
 *
 * darken=true 時先畫一層蓋滿畫面的全黑背景（請放在場景最底）。
 */
export type BeamDropProps = {
  asset: string;
  x?: number;
  /** 物件落地時底部的 y（世界座標），預設標準地面線 WORLD.groundY */
  groundY?: number;
  scale?: number;
  /** 落地幀，預設 26 */
  landAt?: number;
  beamWidth?: number;
  darken?: boolean;
  glow?: string;
};

export const BeamDrop: React.FC<BeamDropProps> = ({
  asset,
  x = WORLD.centerX,
  groundY = WORLD.groundY,
  scale = 2,
  landAt = 26,
  beamWidth = 44,
  darken = true,
  glow = color.goldLight,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const beamIn = Math.min(1, f / 6);
  const dropStart = 8;
  const p = easeCamera(Math.min(1, Math.max(0, (f - dropStart) / (landAt - dropStart))));
  const landed = f >= landAt;
  const bounce = landed && f < landAt + 6 ? -Math.round(2 * Math.sin(((f - landAt) / 6) * Math.PI)) : 0;
  const y = f < dropStart ? -9999 : -10 + (groundY + 10) * p + bounce;
  const starT = (f - 6) / 6;

  return (
    <>
      {darken ? <div style={{ ...COVER, background: "#020308" }} /> : null}
      <div style={{ position: "absolute", inset: 0, opacity: beamIn }}>
        <Ambience layers={[{ type: "beam", x, width: beamWidth, top: 0, bottom: groundY + 6 }]} />
      </div>
      {starT >= 0 && starT < 1 ? (
        <div
          style={{
            position: "absolute",
            left: x - 3.5,
            top: groundY * 0.45 - 3.5,
            width: 7,
            height: 7,
            transform: `scale(${1 + 1.5 * Math.sin(starT * Math.PI)})`,
            opacity: 1 - starT * 0.6,
            filter: "drop-shadow(0 0 3px #fff)",
          }}
        >
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: "#FFFFFF" }} />
        </div>
      ) : null}
      {landed ? (
        <div
          style={{
            position: "absolute",
            left: x - 40,
            top: groundY - 6,
            width: 80,
            height: 12,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${glow} 0%, rgba(0,0,0,0) 70%)`,
            opacity: 0.7,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {f >= dropStart ? <Sprite asset={asset} x={x} y={y} scale={scale} glow={landed ? glow : undefined} /> : null}
      <Sequence from={landAt} layout="none">
        <RingPulse x={x} y={groundY - 4} radius={42} color={color.goldLight} />
      </Sequence>
    </>
  );
};
