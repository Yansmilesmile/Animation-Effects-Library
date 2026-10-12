import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, WORLD } from "../../theme";
import { easeCamera } from "../../lib/util";
import { Ambience } from "../Ambience";
import { RingPulse } from "../emphasis/RingPulse";
import { SunBurst } from "../emphasis/SunBurst";
import { Sprite } from "../Sprite";
import { CardBack } from "./Cards";

/**
 * ChestDeal —— C24 寶箱掉落 + 發牌（片尾「送你 N 個方法」）。放在場景裡（世界座標，跟鏡頭走）。
 *
 * 流程（基準幀數 × pace）：
 * 1. 寶箱從畫面上方掉下（0–10）、彈兩下 → 落地點狀光環 + 背後放射光。
 * 2. 開蓋前搖晃幾下、縫隙透出金光（openAt 前 8 幀）。
 * 3. 半開（openAt）→ 全開（openAt + 5），金光往上冒。
 * 4. N 張卡背「?」依次飛出（每張間隔 interval），扇形排開懸浮在寶箱上方 → 金色碎屑飄落。
 *
 * pace：整段的節奏倍數，預設 1.5（比基準慢 1/3）。數字越大越慢。
 * 寶箱素材：素材庫同一款正面紅金寶箱的關閉 / 半開 / 全開三張，直接切換。
 * 卡片扇形位置可用 chestFanPosition() 取得；chestDealTiming() 給時間軸排程用。
 */
const DIR = "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/2-宝箱-钱袋-宝石-25多张合集图【共900多张】/拆分-根据图片名找文件夹/子图_四时芳菲-收集整理 (10)_png";
export const CHEST_ASSETS = {
  closed: `${DIR}/2.png`,
  half: `${DIR}/0.png`,
  open: `${DIR}/1.png`,
};

export type ChestDealProps = {
  x?: number;
  /** 寶箱落地的地面線（世界座標），預設 WORLD.groundY */
  groundY?: number;
  /** 卡片數量，預設 3 */
  cards?: number;
  /** 節奏倍數，預設 1.5 */
  pace?: number;
  /** 寶箱放大倍數（整數），預設 2 */
  scale?: number;
  /** 第 i 張卡在 takeAt[i] 幀之後隱藏（被 SkillCard 接手、從扇形位置飛出去時） */
  takeAt?: number[];
};

const CARD_W = 20;
const CARD_H = 26;

/** 各階段的幀（已乘上 pace），給時間軸排程用 */
export const chestDealTiming = (pace = 1.5, cards = 3) => {
  const p = (n: number) => Math.round(n * pace);
  const land = p(10);
  const shake = p(16);
  const half = p(24);
  const open = p(29);
  const cardStart = (i: number) => open + p(3) + i * p(5);
  const cardFly = p(9);
  return { land, shake, half, open, cardStart, cardFly, dealt: cardStart(cards - 1) + cardFly };
};

/** 第 i 張卡在扇形中的位置（世界座標，卡片中心） */
export const chestFanPosition = (i: number, n: number, x: number = WORLD.centerX, groundY: number = WORLD.groundY) => {
  const mid = (n - 1) / 2;
  return { x: x + (i - mid) * 26, y: groundY - 86 + Math.abs(i - mid) * 6, rotate: (i - mid) * 12 };
};

export const ChestDeal: React.FC<ChestDealProps> = ({ x = WORLD.centerX, groundY = WORLD.groundY, cards = 3, pace = 1.5, scale = 2, takeAt = [] }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const T = chestDealTiming(pace, cards);
  const chestH = 27 * scale;

  // 掉落：加速落下，之後兩次遞減的彈跳
  let y: number;
  let dx = 0;
  if (f < T.land) {
    const t = f / T.land;
    y = -chestH + (groundY + chestH) * t * t;
  } else {
    const b = (f - T.land) / pace;
    const bounce = b < 4 ? 6 * Math.sin((b / 4) * Math.PI) : b < 7 ? 2 * Math.sin(((b - 4) / 3) * Math.PI) : 0;
    y = groundY - Math.round(bounce);
  }
  // 開蓋前搖晃：左右 1 像素，越接近開蓋越快
  if (f >= T.shake && f < T.half) {
    const k = Math.floor((f - T.shake) / Math.max(1, Math.round(2 * pace)));
    dx = k % 2 === 0 ? 1 : -1;
  }
  const stage = f >= T.open ? "open" : f >= T.half ? "half" : "closed";
  const leak = f >= T.shake && f < T.half ? (f - T.shake) / (T.half - T.shake) : 0;
  const glow = f >= T.half ? Math.min(1, (f - T.half) / (T.open - T.half + 4)) : 0;

  return (
    <>
      <Sequence from={T.land} layout="none">
        <SunBurst x={x} y={groundY - chestH / 2} radius={80} />
      </Sequence>
      {/* 縫隙透光（搖晃時）→ 開蓋後往上冒的金光 */}
      {leak > 0 || glow > 0 ? (
        <div
          style={{
            position: "absolute",
            left: x - 24,
            top: groundY - chestH - 76,
            width: 48,
            height: 86,
            background: `linear-gradient(to top, ${color.goldLight}, rgba(0,0,0,0))`,
            clipPath: "polygon(25% 100%, 75% 100%, 100% 0, 0 0)",
            opacity: Math.max(leak * 0.2, 0.6 * glow),
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <Sprite asset={CHEST_ASSETS[stage]} x={x + dx} y={y} scale={scale} glow={stage !== "closed" || leak > 0.5 ? color.goldLight : undefined} />
      <Sequence from={T.land} layout="none">
        <RingPulse x={x} y={groundY - 2} radius={40} color={color.goldLight} flash={false} dots={16} />
      </Sequence>
      <Sequence from={T.half} layout="none">
        <RingPulse x={x} y={groundY - chestH} radius={34} color={color.goldLight} />
      </Sequence>
      {/* 卡片依次飛出成扇形 */}
      {Array.from({ length: cards }, (_, i) => {
        const start = T.cardStart(i);
        if (f < start || (takeAt[i] !== undefined && f >= takeAt[i])) return null;
        const t = easeCamera(Math.min(1, (f - start) / T.cardFly));
        const to = chestFanPosition(i, cards, x, groundY);
        const fromY = groundY - chestH * 0.7;
        const cx = x + (to.x - x) * t;
        const cy = fromY + (to.y - fromY) * t - Math.sin(t * Math.PI) * 12;
        const bob = t >= 1 ? Math.sin((f - start) / 10 + i) * 1.5 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: Math.round(cx - CARD_W / 2),
              top: Math.round(cy - CARD_H / 2 + bob),
              transform: `rotate(${to.rotate * t}deg) scale(${0.4 + 0.6 * t})`,
            }}
          >
            <CardBack mark="?" w={CARD_W} h={CARD_H} stars={false} />
          </div>
        );
      })}
      {f >= T.open ? <Ambience layers={[{ type: "confetti", x: x - 60, w: 120, y: groundY - 140, h: 140, count: 30 }]} /> : null}
    </>
  );
};
