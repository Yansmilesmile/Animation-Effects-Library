import * as THREE from "three";
import { PIXEL } from "../../theme";
import { easeCamera } from "../../lib/util";
import type {
  CameraFrame,
  CameraMoveKind,
  CameraRef,
  CameraSpec,
  Ease,
  FocusFrame,
  ObjState,
  S3CameraEvent,
  S3FocusEvent,
  S3StateEvent,
  Stage3DModule,
  StageState,
  Vec3,
} from "./types";

/**
 * 3D 舞台的時間軸執行期：把 S3State / S3Camera / S3Focus 事件變成「任一幀的物件狀態、機位、景深」。
 * 純函式（只用幀數和事件），3D 畫面和 2D 疊加層（錨點投影）共用同一份，所以貼在 3D 物件上的精靈不會錯位。
 */

export const EASES: Record<Ease, (t: number) => number> = {
  inout: easeCamera,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  linear: (t) => t,
  // 超過一點再回來（升起後回彈）
  back: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};
export const EASE_NAMES = Object.keys(EASES);
export const MOVE_NAMES: CameraMoveKind[] = ["cut", "push", "pull", "pan", "tilt", "orbit", "crane", "dolly"];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const v3 = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);
const arr = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** 機位引用 → 具體機位 */
export const resolveCamera = (module: Stage3DModule, ref: CameraRef): { spec?: CameraSpec; error?: string } => {
  const id = typeof ref === "string" ? ref : ref.from;
  const base = module.cameras[id];
  if (!base) return { error: `機位「${id}」不存在，可用：${Object.keys(module.cameras).join("、")}` };
  if (typeof ref === "string") return { spec: base };
  const pos = v3(base.position);
  const tgt = v3(base.target);
  if (ref.offset) {
    pos.add(v3(ref.offset));
    tgt.add(v3(ref.offset));
  }
  if (ref.positionOffset) pos.add(v3(ref.positionOffset));
  if (ref.lookOffset) tgt.add(v3(ref.lookOffset));
  if (ref.dolly) pos.add(tgt.clone().sub(pos).normalize().multiplyScalar(ref.dolly));
  if (ref.orbit) {
    const rel = pos.clone().sub(tgt).applyAxisAngle(new THREE.Vector3(0, 1, 0), (ref.orbit * Math.PI) / 180);
    pos.copy(tgt).add(rel);
  }
  if (ref.yaw) {
    const rel = tgt.clone().sub(pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), (ref.yaw * Math.PI) / 180);
    tgt.copy(pos).add(rel);
  }
  return { spec: { position: arr(pos), target: arr(tgt), fov: ref.fov ?? base.fov } };
};

const frameOf = (s: CameraSpec): CameraFrame => ({ position: s.position, target: s.target, fov: s.fov ?? 40 });

// 依運動方式在兩個機位之間補間
const blend = (a: CameraFrame, b: CameraFrame, t: number, move: CameraMoveKind): CameraFrame => {
  const fov = a.fov + (b.fov - a.fov) * t;
  if (move === "orbit") {
    // 以 target 為圓心：方位角走最短路徑、仰角和半徑線性
    const tgt = lerp3(a.target, b.target, t);
    const ra = v3(a.position).sub(v3(a.target));
    const rb = v3(b.position).sub(v3(b.target));
    const sa = new THREE.Spherical().setFromVector3(ra);
    const sb = new THREE.Spherical().setFromVector3(rb);
    let dth = sb.theta - sa.theta;
    while (dth > Math.PI) dth -= Math.PI * 2;
    while (dth < -Math.PI) dth += Math.PI * 2;
    const s = new THREE.Spherical(sa.radius + (sb.radius - sa.radius) * t, sa.phi + (sb.phi - sa.phi) * t, sa.theta + dth * t);
    return { position: arr(v3(tgt).add(new THREE.Vector3().setFromSpherical(s))), target: tgt, fov };
  }
  if (move === "pan" || move === "tilt") {
    // 機身位置線性移動，視線方向球面補間（搖、俯仰）
    const pos = lerp3(a.position, b.position, t);
    const da = v3(a.target).sub(v3(a.position));
    const db = v3(b.target).sub(v3(b.position));
    const la = da.length();
    const lb = db.length();
    const q = new THREE.Quaternion().setFromUnitVectors(da.clone().normalize(), db.clone().normalize());
    const dir = da.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(q, t));
    return { position: pos, target: arr(v3(pos).add(dir.multiplyScalar(la + (lb - la) * t))), fov };
  }
  return { position: lerp3(a.position, b.position, t), target: lerp3(a.target, b.target, t), fov };
};

export type Stage3DRuntime = {
  module: Stage3DModule;
  errors: string[];
  stateAt: (id: string, f: number) => ObjState;
  stageState: (f: number) => StageState;
  cameraAt: (f: number) => CameraFrame;
  focusAt: (f: number) => FocusFrame;
  anchorAt: (id: string, f: number) => Vec3 | undefined;
  /** 3D 點 → 像素層畫面座標（480×270）；unit = 該深度 1 單位長度是幾像素 */
  project: (f: number, p: Vec3) => { x: number; y: number; visible: boolean; depth: number; unit: number };
  hasAnchor: (id: string) => boolean;
};

export const buildRuntime = (module: Stage3DModule, ev: { states: S3StateEvent[]; cameras: S3CameraEvent[]; focus: S3FocusEvent[] }): Stage3DRuntime => {
  const errors: string[] = [];
  const byObj = new Map<string, S3StateEvent[]>();
  for (const e of ev.states) {
    const o = module.objects[e.object];
    if (!o) {
      errors.push(`S3State：物件「${e.object}」不存在，可用：${Object.keys(module.objects).join("、")}`);
      continue;
    }
    if (!o.states.includes(e.to)) {
      errors.push(`S3State：${e.object} 沒有狀態「${e.to}」，可用：${o.states.join("、")}`);
      continue;
    }
    if (!byObj.has(e.object)) byObj.set(e.object, []);
    byObj.get(e.object)!.push(e);
  }
  for (const list of byObj.values()) list.sort((a, b) => a.start - b.start);

  const stateAt = (id: string, f: number): ObjState => {
    const o = module.objects[id];
    const init = o?.initial ?? "";
    let s: ObjState = { from: init, to: init, t: 1, raw: 1, age: f, start: 0 };
    for (const e of byObj.get(id) ?? []) {
      if (e.start > f) break;
      const d = Math.max(1, e.duration ?? 20);
      const raw = clamp01((f - e.start) / d);
      s = { from: s.to, to: e.to, raw, t: EASES[e.ease ?? "inout"](raw), age: f - e.start, start: e.start };
    }
    return s;
  };
  const stageState = (f: number): StageState => ({ frame: f, seed: module.seed, obj: (id) => stateAt(id, f) });

  const initCam = module.cameras[module.initialCamera];
  if (!initCam) errors.push(`initialCamera「${module.initialCamera}」不存在`);
  const cams = ev.cameras
    .map((e) => {
      const r = resolveCamera(module, e.to);
      if (r.error) errors.push(`S3Camera：${r.error}`);
      if (e.move && !MOVE_NAMES.includes(e.move)) errors.push(`S3Camera：move「${e.move}」不存在，可用：${MOVE_NAMES.join("、")}`);
      return r.spec ? { ...e, spec: frameOf(r.spec) } : null;
    })
    .filter((e): e is S3CameraEvent & { spec: CameraFrame } => !!e)
    .sort((a, b) => a.start - b.start);
  const cameraAt = (f: number): CameraFrame => {
    let state = frameOf(initCam ?? { position: [0, 2, 10], target: [0, 1, 0] });
    for (const e of cams) {
      if (e.start > f) break;
      const move = e.move ?? "push";
      const d = move === "cut" ? 1 : Math.max(1, e.duration ?? 45);
      const t = move === "cut" ? 1 : EASES[e.ease ?? "inout"](clamp01((f - e.start) / d));
      state = blend(state, e.spec, t, move);
    }
    return state;
  };

  for (const e of ev.focus) if (e.anchor && !module.anchors[e.anchor]) errors.push(`S3Focus：錨點「${e.anchor}」不存在，可用：${Object.keys(module.anchors).join("、")}`);
  const focus = [...ev.focus].sort((a, b) => a.start - b.start);
  const focusAt = (f: number): FocusFrame => {
    let cur: FocusFrame = { amount: 0, blur: 0 };
    for (const e of focus) {
      if (e.start > f) break;
      const t = easeCamera(clamp01((f - e.start) / Math.max(1, e.duration ?? 20)));
      cur = e.off || !e.anchor ? { anchor: cur.anchor, amount: cur.amount * (1 - t), blur: cur.blur } : { anchor: e.anchor, amount: t, blur: e.blur ?? 1 };
    }
    return cur;
  };

  const anchorAt = (id: string, f: number): Vec3 | undefined => {
    const a = module.anchors[id];
    if (!a) return undefined;
    return typeof a === "function" ? a(stageState(f)) : a;
  };

  const W = Math.round(1920 / (module.pixelSize ?? 4));
  const H = Math.round(1080 / (module.pixelSize ?? 4));
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
  const project = (f: number, p: Vec3) => {
    const c = cameraAt(f);
    cam.fov = c.fov;
    cam.position.set(...c.position);
    cam.lookAt(...c.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const v = v3(p);
    const depth = v.clone().applyMatrix4(cam.matrixWorldInverse).z * -1;
    const n = v.project(cam);
    return {
      x: ((n.x + 1) / 2) * PIXEL.width,
      y: ((1 - n.y) / 2) * PIXEL.height,
      visible: depth > 0.1 && n.z < 1,
      depth,
      unit: depth > 0.1 ? PIXEL.height / (2 * depth * Math.tan((c.fov * Math.PI) / 360)) : 0,
    };
  };

  return { module, errors, stateAt, stageState, cameraAt, focusAt, anchorAt, project, hasAnchor: (id) => !!module.anchors[id] };
};

/** 依物件狀態在數值表之間補間：table = { 狀態名: { 參數: 值 } }，沒寫的參數沿用 base */
export const mixState = <K extends string>(s: ObjState, table: Record<string, Partial<Record<K, number>>>, base: Record<K, number>): Record<K, number> => {
  const a = { ...base, ...table[s.from] };
  const b = { ...base, ...table[s.to] };
  const out = {} as Record<K, number>;
  for (const k of Object.keys(base) as K[]) out[k] = a[k] + (b[k] - a[k]) * s.t;
  return out;
};
