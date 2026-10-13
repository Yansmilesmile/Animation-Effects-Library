import { mouthAt } from "../components/Talk";
import { ACTIONS, ActionDef, actionTime, addPose, evalFlags, evalKeys, keysFor, layerBones, mixPose, PropSpec, SETTLE } from "./actions";
import type { Pose } from "./rig";

/**
 * 角色在某一幀的狀態：位置、視角、朝向、換裝、姿勢、表情、道具…
 * 由 scene 的 actors 宣告 + 這個角色的 Act / ActorState 事件（已解析成幀與座標）算出來，純函式、每幀重算。
 */
export type Pt = { x: number; y: number };
export type ActorInit = {
  id: string;
  rig: string;
  x: number;
  y: number;
  view: string;
  facing: "left" | "right";
  costume?: string;
  silhouette: boolean;
  dim: number;
  scale: number;
  visible: boolean;
  talk: boolean;
};
export type ActEv = {
  kind: "act";
  start: number;
  action: string;
  duration?: number;
  view?: string;
  facing?: "left" | "right";
  loop?: boolean;
  from?: Pt;
  to?: Pt;
  prop?: string;
  speed?: number;
};
export type StateEv = {
  kind: "state";
  start: number;
  costume?: string | null;
  silhouette?: boolean;
  dim?: number | boolean;
  scale?: number;
  visible?: boolean;
  view?: string;
  facing?: "left" | "right";
  talk?: boolean;
  at?: Pt;
};
export type ActorEv = ActEv | StateEv;

export type PropDraw = { asset: string; slot: string; dx: number; dy: number; scale: number } & (
  | { kind: "held" }
  | { kind: "dropped"; atFrame: number; toGround: boolean }
);
export type ActorFrame = {
  x: number;
  y: number;
  view: string;
  facing: "left" | "right";
  costume?: string;
  silhouette: boolean;
  dim: number;
  scale: number;
  opacity: number;
  pose: Pose;
  face?: string;
  mouth: number;
  show: Set<string>;
  hide: Set<string>;
  props: PropDraw[];
  dust: { age: number; x: number; y: number }[];
};

const FADE = 6;
const isLayer = (a: ActionDef) => !!layerBones(a);

/** 走路類（有 to）：要走幾幀 */
const travelFrames = (ev: ActEv, from: Pt, a: ActionDef) => {
  const d = Math.hypot(ev.to!.x - from.x, ev.to!.y - from.y);
  return Math.max(1, Math.ceil(d / (ev.speed ?? a.speed ?? 0.75)));
};

type Span = { ev: ActEv; a: ActionDef; view: string; end: number; from?: Pt; travel?: number };

/** 先掃一遍：每個 Act 的有效長度（loop 到下一個動作 / 走到目的地）、當時的視角與起點 */
const plan = (init: ActorInit, evs: ActorEv[]) => {
  const sorted = [...evs].sort((a, b) => a.start - b.start);
  const spans: Span[] = [];
  let view = init.view;
  let pos: Pt = { x: init.x, y: init.y };
  const baseActs = sorted.filter((e): e is ActEv => e.kind === "act" && !!ACTIONS[e.action] && !isLayer(ACTIONS[e.action]));
  for (const ev of sorted) {
    if (ev.kind === "state") {
      if (ev.view) view = ev.view;
      if (ev.at) pos = ev.at;
      continue;
    }
    const a = ACTIONS[ev.action];
    if (!a) continue;
    if (ev.view) view = ev.view;
    else if (a.views?.length && !a.views.includes(view)) view = a.views[0];
    let end: number;
    let from: Pt | undefined;
    let travel: number | undefined;
    if (ev.to) {
      from = ev.from ?? pos;
      travel = travelFrames(ev, from, a);
      end = ev.start + travel;
      pos = ev.to;
    } else if (ev.loop ?? a.loop) {
      const next = isLayer(a) ? undefined : baseActs.find((b) => b.start > ev.start);
      end = ev.duration !== undefined ? ev.start + ev.duration : next ? next.start : Infinity;
    } else end = ev.start + a.duration;
    spans.push({ ev, a, view, end, from, travel });
  }
  return { sorted, spans };
};

export const actorFrame = (init: ActorInit, evs: ActorEv[], f: number): ActorFrame => {
  const { sorted, spans } = plan(init, evs);
  const st = { x: init.x, y: init.y, view: init.view, facing: init.facing, costume: init.costume, silhouette: init.silhouette, dim: init.dim, scale: init.scale, talk: init.talk };
  let visible = init.visible;
  let visibleSince = -Infinity;
  for (const ev of sorted) {
    if (ev.start > f) break;
    if (ev.kind === "state") {
      if (ev.costume !== undefined) st.costume = ev.costume ?? undefined;
      if (ev.silhouette !== undefined) st.silhouette = ev.silhouette;
      if (ev.dim !== undefined) st.dim = ev.dim === true ? 0.5 : ev.dim === false ? 0 : ev.dim;
      if (ev.scale !== undefined) st.scale = ev.scale;
      if (ev.view) st.view = ev.view;
      if (ev.facing) st.facing = ev.facing;
      if (ev.talk !== undefined) st.talk = ev.talk;
      if (ev.at) ({ x: st.x, y: st.y } = ev.at);
      if (ev.visible !== undefined && ev.visible !== visible) {
        visible = ev.visible;
        visibleSince = ev.start;
      }
      continue;
    }
    const sp = spans.find((s) => s.ev === ev);
    if (!sp) continue;
    st.view = sp.view;
    if (ev.facing) st.facing = ev.facing;
    if (sp.from && ev.to) {
      if (!ev.facing && ev.to.x !== sp.from.x) st.facing = ev.to.x > sp.from.x ? "right" : "left";
      const k = Math.min(1, (f - ev.start) / sp.travel!);
      st.x = Math.round(sp.from.x + (ev.to.x - sp.from.x) * k);
      st.y = Math.round(sp.from.y + (ev.to.y - sp.from.y) * k);
    }
  }
  const fadeK = Math.min(1, (f - visibleSince) / FADE);
  const opacity = visible ? fadeK : 1 - fadeK;

  // ── 姿勢 ──
  const base = spans.filter((s) => !isLayer(s.a));
  const layers = spans.filter((s) => isLayer(s.a));
  const baseAt = (frame: number, depth = 0): { pose: Pose; flags: ReturnType<typeof evalFlags> | null; span?: Span; ended: boolean } => {
    let idx = -1;
    for (let i = 0; i < base.length; i++) if (base[i].ev.start <= frame) idx = i;
    if (idx < 0) return { pose: {}, flags: null, ended: true };
    const sp = base[idx];
    const prev = idx > 0 && depth < 40 ? baseAt(sp.ev.start - 1, depth + 1).pose : {};
    const keys = keysFor(sp.a, sp.view);
    const t = frame - sp.ev.start;
    const tq = Math.floor(t / 2) * 2; // 一拍二：像素動畫的節奏
    const active = frame < sp.end;
    if (active) {
      const tt = actionTime(sp.a, tq);
      return { pose: evalKeys(keys, tt, tq, prev), flags: evalFlags(keys, tt), span: sp, ended: false };
    }
    // 動作結束：hold 停在最後一格；idle 在 SETTLE 幀內回到待機
    const tEnd = sp.end - sp.ev.start;
    const ttEnd = actionTime(sp.a, tEnd);
    const last = evalKeys(keys, ttEnd, tEnd, prev);
    if ((sp.a.end ?? "idle") === "hold" && !sp.ev.to && !(sp.ev.loop ?? sp.a.loop)) return { pose: last, flags: evalFlags(keys, ttEnd), span: sp, ended: true };
    const k = Math.min(1, Math.floor((frame - sp.end) / 2) * 2 / SETTLE);
    return { pose: mixPose(last, {}, k), flags: null, span: sp, ended: true };
  };

  const b = baseAt(f);
  let pose = b.pose;
  let face = b.flags?.face;
  const show = new Set(b.flags?.show ?? []);
  const hide = new Set(b.flags?.hide ?? []);
  for (const l of layers) {
    if (l.ev.start > f) continue;
    const t = f - l.ev.start;
    const tq = Math.floor(t / 2) * 2;
    const keys = keysFor(l.a, l.view);
    const dur = l.end - l.ev.start;
    if (t < dur) {
      const tt = actionTime(l.a, tq);
      pose = addPose(pose, evalKeys(keys, tt, tq, {}));
      const fl = evalFlags(keys, tt);
      if (fl.face) face = fl.face;
    } else if ((l.a.end ?? "idle") === "hold" && Number.isFinite(dur)) {
      pose = addPose(pose, evalKeys(keys, actionTime(l.a, dur), dur, {}));
    } else if (Number.isFinite(dur) && t < dur + SETTLE) {
      pose = addPose(pose, mixPose(evalKeys(keys, actionTime(l.a, dur), dur, {}), {}, (t - dur) / SETTLE));
    }
  }
  // 呼吸：待機、停住、或可呼吸的循環動作時，身體每 2 秒下沉 1 像素半秒
  const breathe = !b.span || b.ended || (b.span.a.breathe !== false && (b.span.ev.loop ?? b.span.a.loop) && !b.span.ev.to);
  if (breathe && f % 60 >= 45) pose = addPose(pose, { torso: { r: 0, dx: 0, dy: 1 } });

  // ── 道具 ──
  const props: PropDraw[] = [];
  const dust: ActorFrame["dust"] = [];
  for (const sp of spans) {
    if (sp.ev.start > f) continue;
    const t = f - sp.ev.start;
    const isCurrent = b.span === sp || (isLayer(sp.a) && t < sp.end - sp.ev.start);
    const holding = isCurrent && (!b.ended || (sp.a.end ?? "idle") === "hold");
    (sp.a.props ?? []).forEach((p: PropSpec, i) => {
      const asset = (i === 0 && sp.ev.prop) || p.asset;
      const swapAt = (tt: number) => [...(p.swap ?? [])].filter((s) => s.f <= tt).sort((a, z) => a.f - z.f).pop()?.asset ?? asset;
      if (p.drop !== undefined && t >= p.drop) {
        const toGround = p.dropTo === "ground";
        props.push({ kind: "dropped", atFrame: sp.ev.start + p.drop, toGround, asset: swapAt(p.drop), slot: p.slot, dx: p.dx ?? 0, dy: toGround ? 0 : (p.dy ?? 0) + (p.dropDy ?? 0), scale: p.scale ?? 1 });
        return;
      }
      if (!holding || t < (p.from ?? 0) || t >= (p.to ?? Infinity)) return;
      const shake = p.shake && t >= p.shake[0] && t < p.shake[1] ? (Math.floor(t / 2) % 2 ? 1 : -1) : 0;
      props.push({ kind: "held", asset: swapAt(t), slot: p.slot, dx: (p.dx ?? 0) + shake, dy: p.dy ?? 0, scale: p.scale ?? 1 });
    });
    for (const fx of sp.a.fx ?? []) {
      const age = t - fx.f;
      if (fx.type === "dust" && age >= 0 && age < 18) dust.push({ age, x: st.x, y: st.y });
    }
  }

  return {
    x: st.x,
    y: st.y,
    view: st.view,
    facing: st.facing,
    costume: st.costume,
    silhouette: st.silhouette,
    dim: st.dim,
    scale: st.scale,
    opacity,
    pose,
    face,
    mouth: st.talk && !face ? mouthAt(f) : 0,
    show,
    hide,
    props,
    dust,
  };
};

/** 動作裡的 mark（例如遞錢的 release）相對動作開始的幀 */
export const markFrame = (action: string, mark: string) => ACTIONS[action]?.marks?.find((m) => m.name === mark)?.f;
