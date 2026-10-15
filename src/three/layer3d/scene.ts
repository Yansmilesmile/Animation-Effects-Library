import { buildCameraTrack, CameraTrack, EASES, projectPoint } from "./camera";
import { timeValue } from "./environment";
import { LAYER3D_TYPES } from "./types/index";
import type { Animate, Layer3DType, Scene3D, Vec3 } from "./types";

/**
 * 場景 JSON → 檢查過、可逐幀取值的場景：組件（類型模組＋參數）、environment、參數補間、命名點。
 * 純資料（不碰 three 的渲染），3D 畫面和 point() 共用。
 */

/** 影片專案註冊的場景 JSON（時間軸 scene 的 layer3d.scene 寫名稱時從這裡找） */
export const SCENES_3D: Record<string, Scene3D> = {};
/** 直接傳 import 進來的 JSON（不必轉型），格式錯誤會在畫面上報紅框 */
export const registerScene3D = (name: string, scene: Scene3D | object) => {
  SCENES_3D[name] = scene as Scene3D;
};

type Value = number | number[];
type Params = Record<string, unknown>;

const lerpValue = (a: unknown, b: Value, t: number): Value => {
  if (Array.isArray(b) || Array.isArray(a)) {
    const aa = Array.isArray(a) ? (a as number[]) : null;
    const bb = Array.isArray(b) ? b : null;
    const n = Math.max(aa?.length ?? 0, bb?.length ?? 0);
    return Array.from({ length: n }, (_, i) => {
      const x = aa ? aa[i] ?? aa[aa.length - 1] : (a as number);
      const y = bb ? bb[i] ?? bb[bb.length - 1] : (b as number);
      return (typeof x === "number" ? x : y) + (y - (typeof x === "number" ? x : y)) * t;
    });
  }
  const x = typeof a === "number" ? a : b;
  return x + (b - x) * t;
};

export type PreparedComponent = { id: string; type: string; def: Layer3DType; params: Params };

export type PreparedScene = {
  scene: Scene3D;
  errors: string[];
  components: PreparedComponent[];
  env: { time: number };
  /** 某個 target（組件 id 或 "environment"）在第 f 幀的參數 */
  paramsAt: (target: string, base: Params, f: number) => Params;
  camera: ReturnType<typeof buildCameraTrack>;
  /** 命名點：scene.points 和組件提供的 "<組件 id>.<點>" */
  points: Record<string, Vec3>;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const prepareScene = (input: Scene3D | string | undefined, cameraTrack?: CameraTrack, animate: Animate[] = []): PreparedScene => {
  const errors: string[] = [];
  let scene: Scene3D;
  if (typeof input === "string") {
    const s = SCENES_3D[input];
    if (!s) errors.push(`3D 場景「${input}」沒有註冊，可用：${Object.keys(SCENES_3D).join("、") || "（沒有，請在入口檔 registerScene3D）"}`);
    scene = s ?? { cameras: {} };
  } else scene = input ?? { cameras: {} };
  if (!isObj(scene.cameras) || !Object.keys(scene.cameras).length) errors.push("場景沒有 cameras（至少一個機位）");

  const components: PreparedComponent[] = [];
  (scene.components ?? []).forEach((c, i) => {
    const def = LAYER3D_TYPES[c.type];
    const id = c.id ?? `${c.type}${i}`;
    if (!def) {
      errors.push(`組件類型「${c.type}」不存在，可用：${Object.keys(LAYER3D_TYPES).join("、")}`);
      return;
    }
    if (components.some((x) => x.id === id)) errors.push(`組件 id「${id}」重複`);
    const params: Params = { ...def.defaults };
    for (const [k, v] of Object.entries(c)) {
      if (k === "type" || k === "id") continue;
      if (!(k in def.defaults)) errors.push(`${c.type}「${id}」：不認得的參數「${k}」，可用：${Object.keys(def.defaults).join("、")}`);
      params[k] = v;
    }
    for (const e of def.check?.(params as never) ?? []) errors.push(`${c.type}「${id}」：${e}`);
    components.push({ id, type: c.type, def, params });
  });

  const LIGHT_TYPES = ["ambient", "hemisphere", "directional", "point", "spot"];
  for (const L of scene.lights ?? []) if (!LIGHT_TYPES.includes(L.type)) errors.push(`燈的 type「${L.type}」不存在，可用：${LIGHT_TYPES.join("、")}`);
  const w = scene.environment?.weather;
  if (w && w.type !== "snow" && w.type !== "rain") errors.push(`weather.type「${w.type}」不存在，可用：snow、rain`);
  const env = { time: timeValue(scene.environment?.time) };
  const byTarget = new Map<string, Animate[]>();
  for (const a of animate) {
    const comp = components.find((c) => c.id === a.target);
    if (a.target !== "environment" && !comp) {
      errors.push(`animate：target「${a.target}」不存在，可用：${["environment", ...components.map((c) => c.id)].join("、")}`);
      continue;
    }
    const allowed = a.target === "environment" ? ["time"] : comp!.def.animatable ?? [];
    for (const k of Object.keys(a.to ?? {})) if (!allowed.includes(k)) errors.push(`animate「${a.target}」：參數「${k}」不能補間，可用：${allowed.join("、") || "（沒有）"}`);
    if (a.ease && !EASES[a.ease]) errors.push(`animate：ease「${a.ease}」不存在，可用：${Object.keys(EASES).join("、")}`);
    if (!byTarget.has(a.target)) byTarget.set(a.target, []);
    byTarget.get(a.target)!.push(a);
  }
  for (const list of byTarget.values()) list.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

  const paramsAt = (target: string, base: Params, f: number) => {
    const list = byTarget.get(target);
    if (!list) return base;
    const out: Params = { ...base };
    for (const a of list) {
      const s = a.start ?? 0;
      if (s > f) break;
      const t = (EASES[a.ease ?? "inout"] ?? EASES.inout)(Math.max(0, Math.min(1, (f - s) / Math.max(1, a.duration ?? 30))));
      for (const [k, v] of Object.entries(a.to)) out[k] = lerpValue(out[k], v, t);
    }
    return out;
  };

  const camera = buildCameraTrack(scene, cameraTrack);
  errors.push(...camera.errors);

  const points: Record<string, Vec3> = { ...(scene.points ?? {}) };
  for (const c of components) for (const [k, v] of Object.entries(c.def.points?.(c.params as never) ?? {})) points[`${c.id}.${k}`] = v;

  return { scene, errors, components, env, paramsAt, camera, points };
};

/**
 * point(id)：場景裡命名的點 → 第 frame 幀的像素層畫面座標（480×270，和 PixelStage 裡的 2D 組件同一套）。
 * 只給 2D 擺位參考（例如角色站在桌邊），不做跟隨；鏡頭在動時取你要的那一幀。
 */
export const pointIn = (prepared: PreparedScene, id: string, frame = 0): { x: number; y: number; depth: number; visible: boolean; error?: string } => {
  const p = prepared.points[id];
  if (!p) return { x: 0, y: 0, depth: 0, visible: false, error: `3D 點「${id}」不存在，可用：${Object.keys(prepared.points).join("、") || "（沒有）"}` };
  return projectPoint(prepared.camera.at(frame), p);
};

/** 公開版：layer3dPoint(場景, "desk", { camera, frame }) → { x, y, visible }（像素層座標） */
export const layer3dPoint = (scene: Scene3D | string, id: string, opts: { camera?: CameraTrack; frame?: number } = {}) => pointIn(prepareScene(scene, opts.camera), id, opts.frame ?? 0);
