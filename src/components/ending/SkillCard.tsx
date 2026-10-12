import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, LAYOUT } from "../../theme";
import { easeCamera } from "../../lib/util";
import { Ambience } from "../Ambience";
import { RingPulse } from "../emphasis/RingPulse";
import { SunBurst } from "../emphasis/SunBurst";
import { CARD, CardBack, CardFront, numeral } from "./Cards";

/**
 * SkillCard —— C25 技能卡 + C11 卡牌翻面 + C59 講完收到左上角。放在 PixelStage 的 hud（畫面座標）。
 *
 * 時間軸（相對幀）：
 * 1. 0–enterDuration：從 from（例如寶箱上方的扇形位置）飛到畫面中央、放大（像鏡頭推近那張卡）。
 * 2. flipAt：卡背（深藍格紋 + 大數字 + 三顆星）翻面，8 幀；翻完觸發光環 + 放射光。
 * 3. 卡面：頂部紅標「技能 N」、標題、示範動畫框（children，用 renderDemo 拿到「翻面後經過的幀」）、一句話。
 * 4. collectAt：縮小飛到左上角第 slot 格，之後一直留在那裡（讓觀眾知道已經拿到幾個）。
 */
export type SkillCardProps = {
  index: number;
  title: string;
  desc?: string;
  /** 示範動畫：參數是翻面完成後經過的幀數（< 0 表示還沒翻） */
  renderDemo?: (t: number) => React.ReactNode;
  from?: { x: number; y: number; scale?: number; rotate?: number };
  enterDuration?: number;
  flipAt?: number;
  collectAt?: number;
  /** 收到左上角的第幾格，預設 index - 1 */
  slot?: number;
  x?: number;
  y?: number;
};

const FLIP = 8;
const COLLECT = 10;
export const MINI_SCALE = 0.16;

/** 左上角收納格的位置（畫面座標，卡片中心） */
export const slotPosition = (slot: number) => ({ x: 22 + slot * 28, y: 46 });

export const SkillCard: React.FC<SkillCardProps> = ({
  index,
  title,
  desc,
  renderDemo,
  from = { x: LAYOUT.centerX, y: 300, scale: 0.2, rotate: 0 },
  enterDuration = 10,
  flipAt = 14,
  collectAt,
  slot,
  x = LAYOUT.centerX,
  y = LAYOUT.focusY + 22,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const sl = slot ?? index - 1;

  // 位置：飛入 → 停在中央 →（collectAt）飛到左上角
  const e = easeCamera(Math.min(1, f / enterDuration));
  let cx = from.x + (x - from.x) * e;
  let cy = from.y + (y - from.y) * e;
  let s = (from.scale ?? 0.2) + (1 - (from.scale ?? 0.2)) * e;
  let rot = (from.rotate ?? 0) * (1 - e);
  if (collectAt !== undefined && f >= collectAt) {
    const c = easeCamera(Math.min(1, (f - collectAt) / COLLECT));
    const to = slotPosition(sl);
    cx = x + (to.x - x) * c;
    cy = y + (to.y - y) * c - Math.sin(c * Math.PI) * 20;
    s = 1 + (MINI_SCALE - 1) * c;
    rot = 0;
  }

  // 翻面：scaleX 1 → 0（卡背）→ 1（卡面）
  const ft = (f - flipAt) / FLIP;
  const flipping = ft >= 0 && ft < 1;
  const showFront = ft >= 0.5;
  const sx = flipping ? Math.abs(Math.cos(ft * Math.PI)) : 1;
  const demoT = f - (flipAt + FLIP);
  const showFx = demoT >= 0 && (collectAt === undefined || f < collectAt);

  return (
    <>
      {showFx ? (
        <Sequence from={flipAt + FLIP} durationInFrames={collectAt !== undefined ? collectAt - flipAt - FLIP : undefined} layout="none">
          <SunBurst x={x} y={y} radius={130} opacity={0.4} />
          <RingPulse x={x} y={y} radius={90} color={color.goldLight} />
          <Ambience layers={[{ type: "confetti", x: x - 90, w: 180, y: 0, h: 220, count: 24 }]} />
        </Sequence>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: Math.round(cx - CARD.w / 2),
          top: Math.round(cy - CARD.h / 2),
          width: CARD.w,
          height: CARD.h,
          transform: `rotate(${rot}deg) scale(${s * sx}, ${s})`,
        }}
      >
        {showFront ? (
          <CardFront index={index} title={title} desc={desc}>
            {renderDemo ? renderDemo(demoT) : null}
          </CardFront>
        ) : (
          <CardBack mark={numeral(index)} />
        )}
      </div>
    </>
  );
};

/**
 * SkillSummary —— C59 結尾：三張卡從左上角飛回中央扇形展開，標題「已習得 N/N」，金色碎屑飄落。放在 hud。
 * cards 的 renderDemo 會用一個很大的幀數呼叫，顯示示範動畫的最終畫面。
 */
export const SkillSummary: React.FC<{ cards: { title: string; desc?: string; renderDemo?: (t: number) => React.ReactNode }[]; x?: number; y?: number; scale?: number }> = ({
  cards,
  x = LAYOUT.centerX,
  y = LAYOUT.focusY + 30,
  scale = 0.5,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const n = cards.length;
  const mid = (n - 1) / 2;
  const t = easeCamera(Math.min(1, f / 12));
  const headerF = f - 12;
  return (
    <>
      <Sequence from={12} layout="none">
        <SunBurst x={x} y={y} radius={150} opacity={0.35} />
        <Ambience layers={[{ type: "confetti", x: x - 160, w: 320, y: 0, h: 230, count: 50 }]} />
      </Sequence>
      {cards.map((c, i) => {
        const from = slotPosition(i);
        const to = { x: x + (i - mid) * 84, y: y + Math.abs(i - mid) * 8, r: (i - mid) * 10 };
        const cx = from.x + (to.x - from.x) * t;
        const cy = from.y + (to.y - from.y) * t;
        const s = MINI_SCALE + (scale - MINI_SCALE) * t;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: Math.round(cx - CARD.w / 2),
              top: Math.round(cy - CARD.h / 2),
              transform: `rotate(${to.r * t}deg) scale(${s})`,
            }}
          >
            <CardFront index={i + 1} title={c.title} desc={c.desc}>
              {c.renderDemo ? c.renderDemo(999) : null}
            </CardFront>
          </div>
        );
      })}
      {headerF >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y - 70,
            transform: `translate(-50%, -50%) scale(${headerF < 3 ? [1.3, 1.1, 1][headerF] : 1})`,
            fontFamily: FONT_PIXEL,
            fontSize: 24,
            lineHeight: 1,
            color: color.goldLight,
            whiteSpace: "nowrap",
            textShadow: `0 2px 0 ${color.goldDark}, 0 0 8px ${color.gold}`,
            padding: "4px 10px",
            background: "rgba(10,14,28,0.85)",
            border: `1px solid ${color.gold}`,
            boxShadow: `0 0 0 1px ${color.ink}`,
          }}
        >
          已習得 {n}/{n}
        </div>
      ) : null}
    </>
  );
};
