import React, { useMemo } from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { seeded } from "../../lib/util";
import { Sprite } from "../Sprite";
import { Puff } from "../props/Puff";
import { clamp01 } from "../emphasis/common";

/**
 * PriceTower —— D2 分段柱（價格塔）：底下一段金色（東西本身），上面 N 層紅樓（各種加價）。
 * 像素層座標，(x, y) 是塔的底部中心。所有「…At / at」都是觸發後的相對幀，也可以寫 "@詞"（時間軸會換算）。
 *
 * 時間軸：
 * - 0 起從地面升起（riseFrames 幀，回彈 + 震動 + 揚塵）；rise: false = 一開始就在。
 * - splitAt：紅段從一整塊裂成 N 層（層間留 gap、每層出現屋簷和門面素材）；mergeAt：合回一塊。
 * - highlight：[{ at, part, frames }] 單段高亮（變亮 + 金色外框）；part = "base" | "red" | "top" | 層號（1 = 最下面）| 層的 label。
 * - redGlow：[{ at, level, frames }] 紅段後面的紅光（level 0..1，frames 幀內漸變）。
 * - crackAt：數字或陣列，紅段出現裂縫 + 抖動（每次多一道）。
 * - collapse：[{ at, floor }] 某層崩塌：碎塊落下、揚塵，上面的層掉下來補位。
 *
 * 時間軸的 event 寫 "id" 之後，其他事件可以用 target 指名塔的各部分：
 * "<id>"（整座）、"<id>.base"、"<id>.red"、"<id>.top"、"<id>.1" … "<id>.N"、"<id>.<label>"（裂開後的位置）。
 */
export type TowerFloor = { label?: string; asset?: string; scale?: number; height?: number };
export type PriceTowerProps = {
  x: number;
  y: number;
  width?: number;
  base?: { height?: number; label?: string };
  floors?: TowerFloor[];
  floorHeight?: number;
  gap?: number;
  rise?: boolean;
  riseFrames?: number;
  splitAt?: number;
  mergeAt?: number;
  splitFrames?: number;
  highlight?: { at: number; part: string | number; frames?: number }[];
  redGlow?: { at: number; level: number; frames?: number }[];
  crackAt?: number | number[];
  collapse?: { at: number; floor: number | string }[];
  dust?: boolean;
};

const BASE_H = 14;
const FLOOR_H = 18;
const GAP = 4;
const W = 36;

const C = {
  ink: color.ink,
  red: color.red,
  redL: color.redLight,
  redD: color.redDark,
  redDD: "#5A1410",
  gold: color.gold,
  goldL: color.goldLight,
  goldD: color.goldDark,
};

type R = [number, number, number, number, string]; // x, y, w, h, color

/** 金色底座：一疊金幣的側面 */
const baseRects = (w: number, h: number): R[] => {
  const r: R[] = [[-1, -1, w + 2, h + 2, C.ink], [0, 0, w, h, C.gold]];
  for (let y = 2; y < h; y += 3) r.push([0, y, w, 1, C.goldD]);
  r.push([0, 0, w, 1, C.goldL], [0, 0, 1, h, C.goldL], [w - 2, 0, 2, h, C.goldD]);
  return r;
};

/** 紅樓一層：牆、窗（沒有門面時）、右側陰影；eave = 屋簷 */
const floorRects = (w: number, h: number, eave: boolean, windows: boolean): R[] => {
  const r: R[] = [[-1, -1, w + 2, h + 2, C.ink], [0, 0, w, h, C.red], [0, 0, 1, h, C.redL], [w - 2, 0, 2, h, C.redD]];
  if (windows)
    for (let wx = 4; wx + 3 <= w - 3; wx += 6) {
      r.push([wx, h - 11, 3, 4, C.redDD], [wx + 1, h - 10, 1, 1, C.goldL]);
    }
  if (eave) r.push([-3, -1, w + 6, 1, C.ink], [-3, 0, w + 6, 2, C.redD], [-3, 2, w + 6, 1, C.ink]);
  return r;
};

const Rects: React.FC<{ rects: R[]; x: number; y: number }> = ({ rects, x, y }) => (
  <>
    {rects.map(([rx, ry, rw, rh, c], i) => (
      <div key={i} style={{ position: "absolute", left: x + rx, top: y + ry, width: rw, height: rh, background: c }} />
    ))}
  </>
);

/** 兩個關鍵幀之間的漸變值（list 依 at 排序） */
const ramp = (f: number, list: { at: number; level: number; frames?: number }[]) => {
  let v = 0;
  for (const k of [...list].sort((a, b) => a.at - b.at)) {
    if (f < k.at) break;
    const p = clamp01((f - k.at) / Math.max(1, k.frames ?? 12));
    v = v + (k.level - v) * p;
  }
  return v;
};

/** 部位名稱 → 層號（1 起）；"base" / "red" / "top" 原樣 */
export const towerPart = (part: string | number, floors: TowerFloor[]): number | "base" | "red" | "top" | undefined => {
  if (part === "base" || part === "red" || part === "top") return part;
  const n = typeof part === "number" ? part : /^\d+$/.test(part) ? parseInt(part, 10) : floors.findIndex((fl) => fl.label === part) + 1;
  return n >= 1 && n <= floors.length ? n : undefined;
};

/** 裂開後的版面（世界座標）：各部分的底部中心與高度，給 target 用 */
export const towerTargets = (p: PriceTowerProps) => {
  const floors = p.floors ?? [];
  const bh = p.base?.height ?? BASE_H;
  const gap = p.gap ?? GAP;
  const out: Record<string, { x: number; bottom: number; h: number }> = {};
  let y = p.y - bh;
  out.base = { x: p.x, bottom: p.y, h: bh };
  const mergedH = floors.reduce((s, fl) => s + (fl.height ?? p.floorHeight ?? FLOOR_H), 0);
  out.red = { x: p.x, bottom: y, h: mergedH };
  floors.forEach((fl, i) => {
    const h = fl.height ?? p.floorHeight ?? FLOOR_H;
    y -= gap;
    const box = { x: p.x, bottom: y, h };
    out[String(i + 1)] = box;
    if (fl.label) out[fl.label] = box;
    y -= h;
  });
  out.top = { x: p.x, bottom: y, h: 0 };
  const total = p.y - y;
  out[""] = { x: p.x, bottom: p.y, h: total };
  return out;
};

export const PriceTower: React.FC<PriceTowerProps> = ({
  x,
  y,
  width = W,
  base,
  floors = [],
  floorHeight = FLOOR_H,
  gap = GAP,
  rise = true,
  riseFrames = 16,
  splitAt,
  mergeAt,
  splitFrames = 8,
  highlight = [],
  redGlow = [],
  crackAt,
  collapse = [],
  dust = true,
}) => {
  const f = useCurrentFrame();
  const bh = base?.height ?? BASE_H;
  const cracks = crackAt === undefined ? [] : Array.isArray(crackAt) ? crackAt : [crackAt];
  const col = collapse.map((c) => ({ at: c.at, n: towerPart(c.floor, floors) as number })).filter((c) => typeof c.n === "number");
  const left = Math.round(x - width / 2);

  // 碎塊：每次崩塌固定一組（seed = 層號）
  const debris = useMemo(
    () =>
      col.map((c) => {
        const rnd = seeded(c.n * 97 + 13);
        return Array.from({ length: 14 }, () => ({ dx: (rnd() - 0.5) * width, dy: rnd() * (floors[c.n - 1]?.height ?? floorHeight), vx: (rnd() - 0.5) * 2.4, vy: -rnd() * 2, s: 2 + Math.floor(rnd() * 2), c: rnd() < 0.3 ? C.redD : rnd() < 0.15 ? C.ink : C.red }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(col), width, floorHeight],
  );

  if (f < 0) return null;

  // 升起：回彈（ease-out 超過 3 像素再落回）
  const totalH = bh + floors.reduce((s, fl) => s + (fl.height ?? floorHeight), 0) + floors.length * gap + 4;
  let lift = 0;
  if (rise && f < riseFrames) {
    const t = f / riseFrames;
    const e = 1 - Math.pow(1 - t, 3);
    lift = Math.round(totalH * (1 - e) - 3 * Math.sin(t * Math.PI) * (t > 0.6 ? 1 : 0));
  }
  // 抖動：升起、裂縫、崩塌時左右 1 像素
  const shaking = (rise && f < riseFrames) || cracks.some((c) => f >= c && f < c + 8) || col.some((c) => f >= c.at && f < c.at + 8);
  const shake = shaking ? (Math.floor(f / 2) % 2 === 0 ? 1 : -1) : 0;

  // 裂開程度 0..1
  let sp = 0;
  if (splitAt !== undefined && f >= splitAt) sp = clamp01((f - splitAt) / splitFrames);
  if (mergeAt !== undefined && f >= mergeAt) sp = Math.min(sp, 1 - clamp01((f - mergeAt) / splitFrames));
  const spPx = Math.round(sp * gap);

  // 崩塌進度：at+2 起 6 幀內掉下去
  const goneP = (n: number) => {
    const c = col.find((k) => k.n === n);
    if (!c || f < c.at) return 0;
    return clamp01((f - c.at - 2) / 6) ** 2;
  };
  const collapsedAt = (n: number) => col.find((k) => k.n === n && f >= k.at);

  // 高亮
  const hl = new Set<string>();
  for (const h of highlight) if (f >= h.at && f < h.at + (h.frames ?? 45)) hl.add(String(towerPart(h.part, floors)));
  const glowStyle = (on: boolean): React.CSSProperties => (on ? { filter: `brightness(1.3) drop-shadow(0 0 1px ${C.goldL}) drop-shadow(0 0 2px ${C.goldL})` } : {});

  const red = ramp(f, redGlow);
  const crackCount = cracks.filter((c) => f >= c).length;

  // 各層的位置（由下往上）
  const items: React.ReactNode[] = [];
  let cursor = y - bh; // 下一層的底部
  const redTop = { v: cursor };
  floors.forEach((fl, i) => {
    const n = i + 1;
    const h = fl.height ?? floorHeight;
    const g = goneP(n);
    cursor -= spPx;
    const bottom = cursor;
    const top = bottom - h;
    const collapsed = collapsedAt(n);
    if (!collapsed || f < collapsed.at + 2) {
      const isTop = n === floors.length || floors.slice(n).every((_, k) => !!collapsedAt(n + 1 + k));
      const eave = sp > 0.5 || isTop;
      const facade = fl.asset && sp >= 1;
      items.push(
        <div key={`fl${n}`} style={{ position: "absolute", left: 0, top: 0, ...glowStyle(hl.has(String(n)) || hl.has("red")) }}>
          <Rects rects={floorRects(width, h, eave, !facade)} x={left} y={top} />
          {facade ? <Sprite asset={fl.asset!} x={x} y={bottom - 1} scale={fl.scale ?? 1} /> : null}
          {crackCount > 0 ? <Crack x={left} y={top} w={width} h={h} count={crackCount} seed={n} /> : null}
        </div>,
      );
    }
    // 合成一整塊時：把和下一層之間的黑縫塗成牆（看起來是同一棟）
    if (sp < 0.5 && n > 1 && !collapsed) {
      items.push(<Rects key={`seam${n}`} rects={[[0, 0, width, 1, C.red], [0, 0, 1, 1, C.redL], [width - 2, 0, 2, 1, C.redD]]} x={left} y={bottom} />);
    }
    // 崩塌中的層不佔高度：上面的層往下補
    cursor = top + Math.round(h * g) + (g > 0 ? Math.round(spPx * g) : 0);
  });
  redTop.v = cursor;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {red > 0.01 ? (
        <div
          style={{
            position: "absolute",
            left: x - width * 1.4,
            top: redTop.v - 20,
            width: width * 2.8,
            height: y - bh - redTop.v + 34,
            background: `radial-gradient(ellipse, rgba(255,60,40,0.75) 0%, rgba(255,40,30,0) 70%)`,
            opacity: red * (0.85 + 0.15 * Math.sin(f / 5)),
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {/* 從地面升起：地面以下裁掉 */}
      <div style={{ position: "absolute", left: x - 200, top: y - 400, width: 400, height: 400, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 200 - x + shake, top: 400 - y + lift }}>
          {items}
          <div style={{ position: "absolute", left: 0, top: 0, ...glowStyle(hl.has("base")) }}>
            <Rects rects={baseRects(width, bh)} x={left} y={y - bh} />
            {base?.label ? (
              <div style={{ position: "absolute", left: x, top: y - bh / 2, transform: "translate(-50%, -50%)", fontFamily: FONT_PIXEL, fontSize: 12, lineHeight: 1, color: C.redDD, whiteSpace: "nowrap" }}>
                {base.label}
              </div>
            ) : null}
          </div>
          {hl.has("top") ? <div style={{ position: "absolute", left: left - 2, top: redTop.v - 3, width: width + 4, height: 2, background: C.goldL, boxShadow: `0 0 4px ${C.goldL}` }} /> : null}
        </div>
      </div>
      {/* 碎塊 */}
      {col.map((c, k) => {
        const t = f - c.at - 2;
        if (t < 0 || t > 24) return null;
        const h = floors[c.n - 1]?.height ?? floorHeight;
        const lower = floors.slice(0, c.n - 1).reduce((s, fl) => s + (fl.height ?? floorHeight) + spPx, 0);
        const fb = y - bh - lower - spPx; // 這層原本的底部
        return debris[k].map((d, j) => (
          <div
            key={`d${k}-${j}`}
            style={{
              position: "absolute",
              left: Math.round(x + d.dx + d.vx * t),
              top: Math.round(fb - h + d.dy + d.vy * t + 0.18 * t * t),
              width: d.s,
              height: d.s,
              background: d.c,
              opacity: 1 - clamp01((t - 16) / 8),
            }}
          />
        ));
      })}
      {dust && rise ? (
        <Sequence from={0} durationInFrames={20} layout="none">
          <Puff x={x} y={y} spread={width * 0.9} seed={3} size={2} />
        </Sequence>
      ) : null}
      {dust
        ? col.map((c, k) => (
            <Sequence key={`pd${k}`} from={c.at + 4} durationInFrames={20} layout="none">
              <Puff x={x} y={y} spread={width} seed={k + 7} size={2} />
            </Sequence>
          ))
        : null}
    </div>
  );
};

/** 裂縫：每層一道之字形暗線，count 越多越長 */
const Crack: React.FC<{ x: number; y: number; w: number; h: number; count: number; seed: number }> = ({ x, y, w, h, count, seed }) => {
  const rnd = seeded(seed * 31 + 5);
  const px: React.ReactNode[] = [];
  for (let c = 0; c < Math.min(3, count); c++) {
    let cx = Math.floor(4 + rnd() * (w - 8));
    for (let cy = 1; cy < h - 1; cy++) {
      px.push(<div key={`${c}-${cy}`} style={{ position: "absolute", left: x + cx, top: y + cy, width: 1, height: 1, background: C.redDD }} />);
      if (rnd() < 0.5) cx += rnd() < 0.5 ? -1 : 1;
      cx = Math.max(2, Math.min(w - 3, cx));
    }
  }
  return <>{px}</>;
};
