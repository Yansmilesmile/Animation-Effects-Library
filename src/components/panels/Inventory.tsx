import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { popScale } from "../emphasis/common";
import { RingPulse } from "../emphasis/RingPulse";
import { PixelBitmap } from "../PixelBitmap";
import { Sprite } from "../Sprite";
import { ICONS, TONES } from "../props/bitmaps";

/**
 * Inventory —— F7 道具欄。畫面左上角一排小格子，顯示已經拿到的道具；拿到的東西一直留在身上。
 * hud 圖層（畫面座標 480×270），(x, y) 是第一格的左上角。
 *
 * - 出現時空格一格一格彈出（每格隔 3 幀）。
 * - items：[{ at, slot?, icon? | asset?, tone?, label? }]，at 那一幀道具彈進格子 + 光環；label 在格子下方停 45 幀。
 *   跨 scene 常駐時，後面的 scene 把已經拿到的道具寫 at: 0、enter: false 即可。
 */
export type InventoryItem = { at: number; slot?: number; icon?: string; asset?: string; tone?: string; label?: string };

export type InventoryProps = {
  slots: number;
  items?: InventoryItem[];
  x?: number;
  y?: number;
  /** 格子邊長（像素），預設 20 */
  size?: number;
  gap?: number;
  /** false = 不播空格彈出（從上一個 scene 接過來時用） */
  enter?: boolean;
};

const ItemIcon: React.FC<{ it: InventoryItem; size: number }> = ({ it, size }) => {
  if (it.asset) return <Sprite asset={it.asset} x={size / 2} y={size / 2} anchor="center" />;
  const rows = ICONS[it.icon ?? "key"] ?? ICONS.key;
  const w = rows[0].length;
  const h = rows.length;
  return <PixelBitmap rows={rows} palette={TONES[it.tone ?? "gold"] ?? TONES.gold} x={Math.round((size - w) / 2)} y={Math.round((size - h) / 2)} />;
};

export const Inventory: React.FC<InventoryProps> = ({ slots, items = [], x = 8, y = 8, size = 20, gap = 3, enter = true }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  return (
    <>
      {Array.from({ length: slots }, (_, i) => {
        const g = enter ? f - i * 3 : 99;
        if (g < 0) return null;
        const left = x + i * (size + gap);
        const it = items.find((q, k) => (q.slot ?? k) === i);
        const ig = it ? f - it.at : -1;
        return (
          <div key={i} style={{ position: "absolute", left, top: y, width: size, height: size, transform: `scale(${popScale(g)})` }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(10,14,28,0.82)",
                border: `1px solid ${ig >= 0 ? color.gold : color.goldDark}`,
                boxShadow: `0 0 0 1px ${color.ink}, inset 0 0 0 1px rgba(0,0,0,0.6)`,
                boxSizing: "border-box",
              }}
            />
            {it && ig >= 0 ? (
              <>
                <div style={{ position: "absolute", inset: 0, transform: `scale(${popScale(ig)})`, filter: `drop-shadow(0 0 2px ${color.goldLight})` }}>
                  <ItemIcon it={it} size={size} />
                </div>
                {it.label && ig < 45 ? (
                  <div
                    style={{
                      position: "absolute",
                      // 靠格子左緣對齊：道具欄貼著畫面左邊，置中會出畫
                      left: 0,
                      top: size + 3,
                      padding: "1px 3px",
                      background: color.navyDark,
                      border: `1px solid ${color.gold}`,
                      color: color.goldLight,
                      fontFamily: FONT_PIXEL,
                      fontSize: 12,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      opacity: ig < 37 ? 1 : (45 - ig) / 8,
                    }}
                  >
                    {it.label}
                  </div>
                ) : null}
              </>
            ) : null}
            {it ? (
              <Sequence from={it.at} layout="none">
                <RingPulse x={size / 2} y={size / 2} radius={16} color={color.goldLight} dots={6} />
              </Sequence>
            ) : null}
          </div>
        );
      })}
    </>
  );
};
