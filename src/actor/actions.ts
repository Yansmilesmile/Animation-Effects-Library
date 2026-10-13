import actionsJson from "../generated/actions.json";
import type { BonePose, Pose } from "./rig";

/**
 * 動作庫（assets/actions/<關鍵詞>.json → scripts/actors.mjs → src/generated/actions.json）。
 * 格式見 docs/actors.md。這裡只負責「動作在第 t 幀的姿勢」。
 */
export type Ease = "linear" | "in" | "out" | "inout" | "step";
export type KeyPoseVal = number | { r?: number; dx?: number; dy?: number };
export type ActionKey = { f: number; pose?: Record<string, KeyPoseVal>; ease?: Ease; face?: string; show?: string[]; hide?: string[] };
export type PropSpec = {
  slot: string;
  asset: string;
  from?: number;
  to?: number;
  swap?: { f: number; asset: string }[];
  shake?: [number, number];
  drop?: number;
  dropTo?: "ground";
  dropDy?: number;
  dx?: number;
  dy?: number;
  scale?: number;
};
export type ActionDef = {
  name: string;
  views?: string[];
  duration: number;
  loop?: boolean;
  loopFrom?: number;
  end?: "idle" | "hold";
  layer?: string[] | string;
  breathe?: boolean;
  speed?: number;
  keys: ActionKey[] | Record<string, ActionKey[]>;
  marks?: { f: number; name: string }[];
  props?: PropSpec[];
  fx?: { f: number; type: "dust" }[];
};

export const ACTIONS = actionsJson as unknown as Record<string, ActionDef>;
export const ACTION_NAMES = Object.keys(ACTIONS);

/** 回到待機姿勢（idle）花的幀數 */
export const SETTLE = 6;

const CH = ["r", "dx", "dy"] as const;
type Ch = (typeof CH)[number];

export const keysFor = (a: ActionDef, view: string): ActionKey[] => {
  if (Array.isArray(a.keys)) return a.keys;
  return a.keys[view] ?? Object.values(a.keys)[0] ?? [];
};

export const layerBones = (a: ActionDef): string[] | null => (a.layer ? (Array.isArray(a.layer) ? a.layer : [a.layer]) : null);

const easeFn = (e: Ease | undefined, p: number) => {
  switch (e ?? "inout") {
    case "linear":
      return p;
    case "in":
      return p * p;
    case "out":
      return 1 - (1 - p) * (1 - p);
    case "step":
      return p >= 1 ? 1 : 0;
    default:
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }
};

const chOf = (v: KeyPoseVal, c: Ch): number | undefined => (typeof v === "number" ? (c === "r" ? v : undefined) : v[c]);

/** 動作時間：loop 時把 t 折回 [loopFrom, duration) */
export const actionTime = (a: ActionDef, t: number) => {
  if (!a.loop || t < a.duration) return Math.min(t, a.duration);
  const from = Math.min(a.loopFrom ?? 0, a.duration - 1);
  return from + ((t - from) % (a.duration - from));
};

/**
 * 動作在動作時間 tt 的姿勢。prev = 動作開始前一幀的姿勢：
 * 動作在第 0 幀沒寫的骨頭從 prev 接過來（不會跳回立正），動作完全沒提到的骨頭 SETTLE 幀內回到 0。
 */
export const evalKeys = (keys: ActionKey[], tt: number, t: number, prev: Pose): Pose => {
  const mentioned = new Set<string>();
  for (const k of keys) for (const b of Object.keys(k.pose ?? {})) mentioned.add(b);
  const out: Pose = {};
  for (const b of mentioned) {
    const bp: BonePose = { r: 0, dx: 0, dy: 0 };
    for (const c of CH) {
      const pts: { f: number; v: number; ease?: Ease }[] = [];
      for (const k of keys) {
        const v = k.pose?.[b];
        const n = v === undefined ? undefined : chOf(v, c);
        if (n !== undefined) pts.push({ f: k.f, v: n, ease: k.ease });
      }
      if (!pts.length || pts[0].f > 0) pts.unshift({ f: 0, v: prev[b]?.[c] ?? 0 });
      let val = pts[pts.length - 1].v;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const z = pts[i + 1];
        if (tt < z.f) {
          val = tt <= a.f ? a.v : a.v + (z.v - a.v) * easeFn(z.ease, (tt - a.f) / (z.f - a.f));
          break;
        }
      }
      bp[c] = val;
    }
    out[b] = bp;
  }
  // 沒提到的骨頭：從 prev 回到 0
  const k = Math.max(0, 1 - t / SETTLE);
  for (const [b, p] of Object.entries(prev)) {
    if (mentioned.has(b)) continue;
    if (k > 0) out[b] = { r: p.r * k, dx: p.dx * k, dy: p.dy * k };
  }
  return out;
};

/** 表情、顯示 / 隱藏的骨頭：動作時間 tt 之前最後一個設定 */
export const evalFlags = (keys: ActionKey[], tt: number) => {
  let face: string | undefined;
  const show = new Set<string>();
  const hide = new Set<string>();
  for (const k of [...keys].sort((a, b) => a.f - b.f)) {
    if (k.f > tt) break;
    if (k.face) face = k.face === "normal" ? undefined : k.face;
    for (const b of k.show ?? []) {
      show.add(b);
      hide.delete(b);
    }
    for (const b of k.hide ?? []) {
      hide.add(b);
      show.delete(b);
    }
  }
  return { face, show, hide };
};

export const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const out: Pose = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = a[id] ?? { r: 0, dx: 0, dy: 0 };
    const q = b[id] ?? { r: 0, dx: 0, dy: 0 };
    out[id] = { r: p.r + (q.r - p.r) * k, dx: p.dx + (q.dx - p.dx) * k, dy: p.dy + (q.dy - p.dy) * k };
  }
  return out;
};

export const addPose = (base: Pose, add: Pose): Pose => {
  const out: Pose = { ...base };
  for (const [id, p] of Object.entries(add)) {
    const q = out[id] ?? { r: 0, dx: 0, dy: 0 };
    out[id] = { r: q.r + p.r, dx: q.dx + p.dx, dy: q.dy + p.dy };
  }
  return out;
};
