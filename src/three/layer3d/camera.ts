import * as THREE from "three";
import { easeCamera } from "../../lib/util";
import type { CameraMove, CameraMoveKind, CameraRef, CameraSpec, Ease, Scene3D, Vec3 } from "./types";

/**
 * 鏡頭：在場景的幾個機位之間輕微推、拉、搖。純函式（只用幀數），3D 畫面和 point() 共用同一份。
 */
export const EASES: Record<Ease, (t: number) => number> = {
  inout: easeCamera,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  linear: (t) => t,
};
export const MOVES: CameraMoveKind[] = ["push", "pull", "pan", "hold", "cut"];

type Frame = Required<CameraSpec>;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const v3 = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const full = (s: CameraSpec): Frame => ({ position: s.position, target: s.target, fov: s.fov ?? 40, shiftY: s.shiftY ?? 0 });

export const resolveCameraRef = (scene: Scene3D, ref: CameraRef): { spec?: Frame; error?: string } => {
  if (typeof ref !== "string") return Array.isArray(ref.position) && Array.isArray(ref.target) ? { spec: full(ref) } : { error: `機位要有 position、target：${JSON.stringify(ref)}` };
  const c = scene.cameras?.[ref];
  return c ? { spec: full(c) } : { error: `機位「${ref}」不存在，可用：${Object.keys(scene.cameras ?? {}).join("、")}` };
};

const blend = (a: Frame, b: Frame, t: number, move: CameraMoveKind): Frame => {
  const fov = a.fov + (b.fov - a.fov) * t;
  const shiftY = a.shiftY + (b.shiftY - a.shiftY) * t;
  if (move === "pan") {
    // 機身線性移動、視線方向球面補間（搖）
    const pos = lerp3(a.position, b.position, t);
    const da = v3(a.target).sub(v3(a.position));
    const db = v3(b.target).sub(v3(b.position));
    const la = da.length();
    const lb = db.length();
    const q = new THREE.Quaternion().setFromUnitVectors(da.clone().normalize(), db.clone().normalize());
    const dir = da.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(q, t));
    const tg = v3(pos).add(dir.multiplyScalar(la + (lb - la) * t));
    return { position: pos, target: [tg.x, tg.y, tg.z], fov, shiftY };
  }
  return { position: lerp3(a.position, b.position, t), target: lerp3(a.target, b.target, t), fov, shiftY };
};

export type CameraTrack = CameraMove | CameraMove[] | string | undefined;

/** 鏡頭軌：檢查一次，之後 at(frame) 取任一幀的機位 */
export const buildCameraTrack = (scene: Scene3D, track: CameraTrack) => {
  const errors: string[] = [];
  const initId = scene.camera ?? Object.keys(scene.cameras ?? {})[0];
  const init = initId ? resolveCameraRef(scene, initId) : { error: "場景沒有任何機位（cameras）" };
  if (init.error) errors.push(init.error);
  const list: CameraMove[] = track === undefined ? [] : typeof track === "string" ? [{ to: track, move: "cut" }] : Array.isArray(track) ? track : [track];
  const moves = list
    .map((m) => {
      const move = m.move ?? (m.from !== undefined && m.to !== undefined ? "push" : "cut");
      if (!MOVES.includes(move)) errors.push(`鏡頭 move「${m.move}」不存在，可用：${MOVES.join("、")}`);
      if (m.ease && !EASES[m.ease]) errors.push(`鏡頭 ease「${m.ease}」不存在，可用：${Object.keys(EASES).join("、")}`);
      const from = m.from !== undefined ? resolveCameraRef(scene, m.from) : undefined;
      const to = m.to !== undefined ? resolveCameraRef(scene, m.to) : undefined;
      if (from?.error) errors.push(from.error);
      if (to?.error) errors.push(to.error);
      if (m.to === undefined && move !== "hold") errors.push(`鏡頭運動（${move}）缺少 to`);
      return { start: m.start ?? 0, duration: Math.max(1, m.duration ?? 60), move, ease: EASES[m.ease ?? "inout"] ?? easeCamera, from: from?.spec, to: to?.spec };
    })
    .sort((a, b) => a.start - b.start);
  const base: Frame = init.spec ?? { position: [0, 2, 10], target: [0, 1, 0], fov: 40, shiftY: 0 };
  const at = (f: number): Frame => {
    let cur = base;
    for (const m of moves) {
      if (m.start > f) break;
      if (m.from) cur = m.from;
      if (!m.to) continue;
      if (m.move === "cut") cur = m.to;
      else if (m.move === "hold") cur = m.to;
      else cur = blend(cur, m.to, m.ease(clamp01((f - m.start) / m.duration)), m.move);
    }
    return cur;
  };
  return { errors, at };
};

/** 把機位套到 three 的相機（aspect = 寬 / 高；shiftY 用 setViewOffset，垂直線不歪） */
export const applyCamera = (cam: THREE.PerspectiveCamera, c: Frame, width: number, height: number) => {
  cam.fov = c.fov;
  cam.aspect = width / height;
  cam.near = 0.05;
  cam.far = 2000;
  cam.position.set(...c.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(...c.target);
  if (c.shiftY) cam.setViewOffset(width, height, 0, c.shiftY * height, width, height);
  else cam.clearViewOffset();
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
};

const scratch = new THREE.PerspectiveCamera();
/**
 * 3D 點 → 像素層畫面座標（480×270，和 PixelStage 裡的 2D 組件同一套座標）。
 * visible = 在鏡頭前方、畫面內。只給 2D 擺位參考，不做跟隨。
 */
export const projectPoint = (c: Frame, p: Vec3, out = { width: 480, height: 270 }) => {
  applyCamera(scratch, c, out.width, out.height);
  const v = v3(p);
  const depth = -v.clone().applyMatrix4(scratch.matrixWorldInverse).z;
  const n = v.project(scratch);
  const x = ((n.x + 1) / 2) * out.width;
  const y = ((1 - n.y) / 2) * out.height;
  return { x, y, depth, visible: depth > 0.05 && x >= 0 && x <= out.width && y >= 0 && y <= out.height };
};
