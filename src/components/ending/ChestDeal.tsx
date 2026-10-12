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
 * 流程：寶箱從畫面上方掉下、彈兩下（0–16 幀）→ 落地點狀光環 + 背後放射光 → 開蓋（openAt）金光往上冒
 * → N 張卡背「?」依次飛出（每張間隔 interval 幀），扇形排開懸浮在寶箱上方 → 金色碎屑飄落。全程約 1.5 秒。
 *
 * 寶箱素材：紅金寶箱的關閉版 / 打開版（素材庫同一款，尺寸相同，直接切換）。
 * 卡片扇形位置可用 chestFanPosition() 取得，讓 SkillCard 從那裡飛出來接上。
 */
export const CHEST_ASSETS = {
  closed: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/2-宝箱-钱袋-宝石-25多张合集图【共900多张】/拆分-根据图片名找文件夹/子图_四时芳菲-收集整理 (10)_png/7.png",
  open: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/2-宝箱-钱袋-宝石-25多张合集图【共900多张】/拆分-根据图片名找文件夹/子图_四时芳菲-收集整理 (10)_png/8.png",
};

export type ChestDealProps = {
  x?: number;
  /** 寶箱落地的地面線（世界座標），預設 WORLD.groundY */
  groundY?: number;
  /** 卡片數量，預設 3 */
  cards?: number;
  /** 開蓋幀，預設 20 */
  openAt?: number;
  /** 每張卡飛出的間隔，預設 4 */
  interval?: number;
  /** 寶箱放大倍數（整數），預設 2 */
  scale?: number;
  /** 第 i 張卡在 takeAt[i] 幀之後隱藏（被 SkillCard 接手、從扇形位置飛出去時） */
  takeAt?: number[];
};

const LAND = 10;
const CARD_W = 20;
const CARD_H = 26;

/** 第 i 張卡在扇形中的位置（世界座標，卡片中心） */
export const chestFanPosition = (i: number, n: number, x: number = WORLD.centerX, groundY: number = WORLD.groundY) => {
  const mid = (n - 1) / 2;
  return { x: x + (i - mid) * 26, y: groundY - 92 + Math.abs(i - mid) * 6, rotate: (i - mid) * 12 };
};

export const ChestDeal: React.FC<ChestDealProps> = ({
  x = WORLD.centerX,
  groundY = WORLD.groundY,
  cards = 3,
  openAt = 20,
  interval = 4,
  scale = 2,
  takeAt = [],
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const chestH = 36 * scale;

  // 掉落：加速落下（0–LAND），之後兩次遞減的彈跳
  let y: number;
  if (f < LAND) {
    const t = f / LAND;
    y = -chestH + (groundY + chestH) * t * t;
  } else {
    const b = f - LAND;
    const bounce = b < 4 ? 6 * Math.sin((b / 4) * Math.PI) : b < 7 ? 2 * Math.sin(((b - 4) / 3) * Math.PI) : 0;
    y = groundY - Math.round(bounce);
  }
  const opened = f >= openAt;
  const glow = opened ? Math.min(1, (f - openAt) / 4) : 0;

  return (
    <>
      <Sequence from={LAND} layout="none">
        <SunBurst x={x} y={groundY - chestH / 2} radius={80} />
      </Sequence>
      {/* 開蓋後往上冒的金光 */}
      {opened ? (
        <div
          style={{
            position: "absolute",
            left: x - 22,
            top: groundY - chestH - 70,
            width: 44,
            height: 80,
            background: `linear-gradient(to top, ${color.goldLight}, rgba(0,0,0,0))`,
            clipPath: "polygon(30% 100%, 70% 100%, 100% 0, 0 0)",
            opacity: 0.55 * glow,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <Sprite asset={opened ? CHEST_ASSETS.open : CHEST_ASSETS.closed} x={x} y={y} scale={scale} glow={opened ? color.goldLight : undefined} />
      <Sequence from={LAND} layout="none">
        <RingPulse x={x} y={groundY - 2} radius={40} color={color.goldLight} flash={false} dots={16} />
      </Sequence>
      {/* 卡片依次飛出成扇形 */}
      {Array.from({ length: cards }, (_, i) => {
            const start = openAt + 2 + i * interval;
            if (f < start || (takeAt[i] !== undefined && f >= takeAt[i])) return null;
            const t = easeCamera(Math.min(1, (f - start) / 8));
            const to = chestFanPosition(i, cards, x, groundY);
            const fromY = groundY - chestH * 0.6;
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
      {opened ? (
        <Ambience layers={[{ type: "confetti", x: x - 60, w: 120, y: groundY - 140, h: 140, count: 30 }]} />
      ) : null}
    </>
  );
};
