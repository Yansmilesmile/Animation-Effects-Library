import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, PIXEL } from "../../theme";
import { easeCamera, seeded } from "../../lib/util";
import { HOST_POSES, Host } from "../Host";
import { Sprite } from "../Sprite";

/**
 * CrowdGrid —— 群像網格：A1 無限網格縮放 / A18 反向網格拉出 / A2 鎖定並推進。
 * 用群像放大「大多數人」：主角是唯一的金框格子，其他是暗格。
 * 自帶鏡頭（不要再包 Camera），畫面座標，蓋滿整個畫面。
 *
 * mode：
 * - "pull-out"（A18，預設）：從主角格子拉遠到整面網格；flashAt 時整面網格閃一下紅。
 * - "push-in"（A2）：先看整面網格，其他格變暗、主角格出現金框，再推進到主角格。
 * - "zoom-out"（A1）：一直拉遠到網格變成紋理，終點剛好蓋滿畫面（用大網格，例如 40×26）。
 *
 * 格子內容：assets（素材 path，循環使用）；不給就用主持人的各種姿勢（暗色剪影 = 普通人）。主角格用 heroPose。
 */
export type CrowdGridProps = {
  cols?: number;
  rows?: number;
  /** 主角格位置，預設正中間 */
  hero?: { col: number; row: number };
  heroPose?: string;
  assets?: string[];
  mode?: "pull-out" | "push-in" | "zoom-out";
  /** 鏡頭移動的開始幀與長度 */
  start?: number;
  duration?: number;
  /** 整面閃紅的幀（A18） */
  flashAt?: number;
  /** 頂部紅標籤，例如「其他人：按小時」 */
  label?: string;
  labelAt?: number;
  seed?: number;
};

const CELL_W = 40;
const CELL_H = 30;
const GAP = 2;
const CELL_BG = ["#141a33", "#1a1530", "#10202a", "#1f1a14", "#151d2e"];

export const CrowdGrid: React.FC<CrowdGridProps> = ({
  cols = 9,
  rows = 7,
  hero,
  heroPose = "full_point_happy",
  assets,
  mode = "pull-out",
  start = 0,
  duration = 45,
  flashAt,
  label,
  labelAt = 0,
  seed = 3,
}) => {
  const f = useCurrentFrame();
  const h = hero ?? { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };

  const cells = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: cols * rows }, (_, i) => ({
      bg: CELL_BG[Math.floor(r() * CELL_BG.length)],
      pose: HOST_POSES.filter((p) => p.startsWith("full_"))[Math.floor(r() * 18)],
      asset: assets && assets.length ? assets[i % assets.length] : undefined,
      flip: r() > 0.5,
      dx: Math.floor((r() - 0.5) * 10),
    }));
  }, [cols, rows, seed, assets]);

  if (f < 0) return null;

  const gridW = cols * CELL_W + (cols - 1) * GAP;
  const gridH = rows * CELL_H + (rows - 1) * GAP;
  const heroCx = h.col * (CELL_W + GAP) + CELL_W / 2;
  const heroCy = h.row * (CELL_H + GAP) + CELL_H / 2;
  const sHero = Math.min(PIXEL.width / CELL_W, PIXEL.height / CELL_H) * 0.6;
  const sFull = Math.min(PIXEL.width / gridW, PIXEL.height / gridH) * 0.95;
  // zoom-out 的終點：網格剛好蓋滿畫面（不露黑邊），格子越多越像紋理
  const sCover = Math.max(PIXEL.width / gridW, PIXEL.height / gridH);

  const t = easeCamera(Math.min(1, Math.max(0, (f - start) / duration)));
  const logLerp = (a: number, b: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
  let s: number;
  let fx: number;
  let fy: number;
  if (mode === "push-in") {
    s = logLerp(sFull, sHero);
    fx = gridW / 2 + (heroCx - gridW / 2) * t;
    fy = gridH / 2 + (heroCy - gridH / 2) * t;
  } else if (mode === "zoom-out") {
    s = logLerp(sHero * 0.5, sCover);
    fx = gridW / 2;
    fy = gridH / 2;
  } else {
    s = logLerp(sHero, sFull);
    fx = heroCx + (gridW / 2 - heroCx) * t;
    fy = heroCy + (gridH / 2 - heroCy) * t;
  }

  // push-in：開始前 10 幀其他格子逐漸變暗、主角金框出現
  const dimOthers = mode === "push-in" ? Math.min(1, f / 10) : 1;
  const flash = flashAt !== undefined && f >= flashAt && f < flashAt + 10 ? 1 - (f - flashAt) / 10 : 0;

  return (
    <div style={{ position: "absolute", inset: 0, background: "#05060c", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: gridW,
          height: gridH,
          transformOrigin: "0 0",
          transform: `translate(${PIXEL.width / 2 - fx * s}px, ${PIXEL.height / 2 - fy * s}px) scale(${s})`,
        }}
      >
        {cells.map((c, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const isHero = col === h.col && row === h.row;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: col * (CELL_W + GAP),
                top: row * (CELL_H + GAP),
                width: CELL_W,
                height: CELL_H,
                overflow: "hidden",
                background: isHero ? "#3a2a10" : c.bg,
                boxShadow: isHero ? `inset 0 0 0 1px ${color.gold}, 0 0 4px ${color.gold}` : "inset 0 0 0 1px #0a0c16",
                filter: isHero ? undefined : `brightness(${1 - 0.55 * dimOthers}) saturate(${1 - 0.6 * dimOthers})`,
                zIndex: isHero ? 1 : 0,
              }}
            >
              {/* 地板 */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: isHero ? "#6a4a1a" : "#0c0e18" }} />
              {isHero ? (
                <Host pose={heroPose} x={CELL_W / 2} y={CELL_H + 18} />
              ) : c.asset ? (
                <Sprite asset={c.asset} x={CELL_W / 2 + c.dx} y={CELL_H - 3} flipX={c.flip} tint="navy" tintAmount={0.6} />
              ) : (
                <Host pose={c.pose} x={CELL_W / 2 + c.dx} y={CELL_H + 18} flipX={c.flip} tint="navy" tintAmount={0.7} />
              )}
            </div>
          );
        })}
        {flash > 0 ? <div style={{ position: "absolute", inset: -4, background: color.red, mixBlendMode: "color", opacity: 0.8 * flash, zIndex: 2 }} /> : null}
        {flash > 0 ? <div style={{ position: "absolute", inset: -4, background: color.red, opacity: 0.25 * flash, zIndex: 2 }} /> : null}
      </div>
      {label && f >= labelAt ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 30,
            transform: `translate(-50%, 0) scale(${f - labelAt < 3 ? [1.28, 1.1, 1][f - labelAt] : 1})`,
            background: color.red,
            border: `1px solid ${color.goldLight}`,
            boxShadow: `0 0 0 1px ${color.ink}`,
            padding: "3px 6px",
            fontFamily: FONT_PIXEL,
            fontSize: 12,
            lineHeight: 1,
            color: color.white,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
