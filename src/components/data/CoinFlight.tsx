import React from "react";
import { useCurrentFrame } from "remotion";
import { color } from "../../theme";
import { seeded } from "../../lib/util";
import { PixelBitmap } from "../PixelBitmap";
import { Sprite } from "../Sprite";
import { TONES } from "../props/bitmaps";

/**
 * CoinFlight —— C39 物件飛行 / 匯聚：一把金幣（或任何素材）從 (x, y) 一個接一個沿弧線飛向目標，
 * 可分流到多個目標（share 比例），到達時閃一下消失（被吸進去）。像素層座標。
 *
 * to：[{ x, y, share }] 或 [{ target: "tower.red", share: 0.8 }]（時間軸會把 target 換成座標）。
 * 起點對準動作：start 寫 "@每次+mark:release"，x / y 用 target 指名角色（anchor / offset 調到手的位置）。
 */
export type CoinFlightProps = {
  x: number;
  y: number;
  to: { x: number; y: number; share?: number }[];
  count?: number;
  /** 每隔幾幀飛出一個，預設 1.5 */
  every?: number;
  /** 每個飛多久，預設 14 */
  flyFrames?: number;
  /** 弧線最高點比直線高多少像素，預設 30 */
  arc?: number;
  /** 起點散開的像素，預設 4 */
  spread?: number;
  asset?: string;
  scale?: number;
  tone?: string;
  trail?: boolean;
  seed?: number;
};

// 正面金幣 5×5
const COIN_FRONT = [".ggg.", "gwggd", "gwggd", "gggdd", ".ddd."];
const SPARK = [".w.", "www", ".w."];

/** 依比例輪流分配：每個物件給「目前最欠」的目標 */
const assign = (count: number, shares: number[]) => {
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  const got = shares.map(() => 0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let best = 0;
    let bestD = -Infinity;
    shares.forEach((s, k) => {
      const d = (s / sum) * (i + 1) - got[k];
      if (d > bestD) {
        bestD = d;
        best = k;
      }
    });
    got[best]++;
    out.push(best);
  }
  return out;
};

export const CoinFlight: React.FC<CoinFlightProps> = ({ x, y, to, count = 12, every = 1.5, flyFrames = 14, arc = 30, spread = 4, asset, scale = 1, tone = "gold", trail = true, seed = 1 }) => {
  const f = useCurrentFrame();
  if (f < 0 || !to.length) return null;
  const which = assign(count, to.map((t) => t.share ?? 1));
  const rnd = seeded(seed * 7919);
  const pal = TONES[tone] ?? TONES.gold;
  const items: React.ReactNode[] = [];

  const pos = (i: number, t: number, sx: number, sy: number, tx: number, ty: number, lift: number) => {
    const e = t; // 等速水平、拋物線高度
    return { px: sx + (tx - sx) * e, py: sy + (ty - sy) * e - lift * 4 * e * (1 - e) };
  };

  for (let i = 0; i < count; i++) {
    const jx = (rnd() - 0.5) * 2 * spread;
    const jy = (rnd() - 0.5) * spread;
    const lift = arc * (0.75 + rnd() * 0.5);
    const tgt = to[which[i]];
    const tx = tgt.x + (rnd() - 0.5) * 6;
    const ty = tgt.y + (rnd() - 0.5) * 4;
    const t0 = Math.round(i * every);
    const g = f - t0;
    if (g < 0) continue;
    const t = g / flyFrames;
    if (t < 1) {
      const draw = (tt: number, op: number, k: string) => {
        const { px, py } = pos(i, tt, x + jx, y + jy, tx, ty, lift);
        return asset ? (
          <div key={k} style={{ opacity: op }}>
            <Sprite asset={asset} x={Math.round(px)} y={Math.round(py)} anchor="center" scale={scale} />
          </div>
        ) : (
          <div key={k} style={{ opacity: op }}>
            <PixelBitmap rows={COIN_FRONT} palette={pal} x={Math.round(px - 2.5 * scale)} y={Math.round(py - 2.5 * scale)} size={scale} />
          </div>
        );
      };
      if (trail) {
        if (t > 0.12) items.push(draw(t - 0.12, 0.25, `t2-${i}`));
        if (t > 0.06) items.push(draw(t - 0.06, 0.5, `t1-${i}`));
      }
      items.push(draw(t, 1, `c-${i}`));
    } else if (g < flyFrames + 4) {
      // 到達：閃一下
      items.push(<PixelBitmap key={`s-${i}`} rows={SPARK} palette={{ w: g - flyFrames < 2 ? color.white : color.goldLight }} x={Math.round(tx - 1.5)} y={Math.round(ty - 1.5)} size={g - flyFrames < 2 ? 2 : 1} />);
    }
  }
  return <>{items}</>;
};
