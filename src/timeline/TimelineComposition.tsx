import React from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, Freeze, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CAMERA_HOME, CAMERA_WIDE, CameraState, worldToScreen } from "../components/Camera";
import { PIXEL } from "../theme";
import { buildRuntime, Follow3D, Stage3DRuntime, Stage3DRuntimeContext, Stage3DView, STAGES_3D } from "../three/stage3d";
import type { S3CameraEvent, S3FocusEvent, S3StateEvent } from "../three/stage3d";
import { Layer3D, pointIn, PreparedScene, prepareScene } from "../three/layer3d";
import type { Animate, CameraMove } from "../three/layer3d";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Subtitles } from "../components/Subtitle";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { FONT_PIXEL, WORLD } from "../theme";
import { REGISTRY, validateEvent } from "./registry";
import { STAGES } from "./stages";
import { FxTarget, PropFxContext, PropFxEntry } from "./propfx";
import type { StageSpec } from "../scenes/LayoutStage";
import character from "../generated/character.json";
import { AssetMeta, useAssets } from "../lib/assets";
import type { ActorDecl, Scene, Timeline, TimelineEvent } from "./types";
import { Actor } from "../actor/Actor";
import { SMOKE_REVEAL } from "../components/props/SmokePop";
import { ACTORS } from "../actor/rig";
import { ActorEv, ActorInit, markFrame, Pt } from "../actor/timeline";

/**
 * TimelineComposition —— 讀時間軸 JSON 渲染整支片。
 * 名稱、參數、"@詞"、舞台寫錯時：該事件不渲染，並在畫面左上角列出紅色錯誤清單（不靜默略過）。
 */

/** 跟著 3D 錨點走：refFrame 時的畫面位置是座標基準 */
type FollowSpec = { anchor: string; refFrame: number; depthScale: boolean; real?: { height: number; basePx: number }; clipBelow?: string };
type Focus = { at: number; dim?: number; blur?: number; frames?: number };
type Resolved = { ev: TimelineEvent; i: number; start: number; errors: string[]; props: Record<string, unknown>; follow?: FollowSpec; focus?: Focus[] };

const S3_EVENTS = new Set(["S3State", "S3Camera", "S3Focus"]);
const is3d = (v: unknown): v is string => typeof v === "string" && v.startsWith("3d:");

/** scene 的 3D 舞台：先解出 S3 事件的時間，建立執行期（狀態、機位、景深、錨點投影） */
const build3d = (scene: Scene, errors: string[]): Stage3DRuntime | undefined => {
  if (!scene.stage3d) return undefined;
  const module = STAGES_3D[scene.stage3d];
  if (!module) {
    errors.push(`[${scene.id}] 3D 舞台「${scene.stage3d}」不存在，可用：${Object.keys(STAGES_3D).join("、") || "（沒有，請在入口檔 registerStage3D）"}`);
    return undefined;
  }
  const states: S3StateEvent[] = [];
  const cameras: S3CameraEvent[] = [];
  const focus: S3FocusEvent[] = [];
  for (const ev of scene.events ?? []) {
    if (!S3_EVENTS.has(ev.component)) continue;
    const s = resolveStart(ev.start, scene);
    if (s.frame === undefined || validateEvent(ev.component, ev.props ?? {}).length) continue; // 錯誤在一般流程裡回報
    const p = (ev.props ?? {}) as Record<string, any>;
    if (ev.component === "S3State") states.push({ start: s.frame, object: p.object, to: p.to, duration: ev.duration, ease: p.ease });
    else if (ev.component === "S3Camera") cameras.push({ start: s.frame, to: p.to, duration: ev.duration, move: p.move, ease: p.ease });
    else focus.push({ start: s.frame, anchor: p.anchor, off: p.off, blur: p.blur, duration: ev.duration });
  }
  const rt = buildRuntime(module, { states, cameras, focus });
  for (const e of rt.errors) errors.push(`[${scene.id}] ${e}`);
  return rt;
};

/** scene.layer3d：鏡頭 / animate 的 "@詞" 換成幀，準備好場景（錯誤、命名點） */
type L3D = { prep: PreparedScene; camera: CameraMove[] | string | undefined; animate: Animate[]; z: number };
const build3dLayer = (scene: Scene, errors: string[]): L3D | undefined => {
  const d = scene.layer3d;
  if (!d) return undefined;
  const at = (v: number | string | undefined, what: string) => {
    if (v === undefined) return 0;
    const r = resolveStart(v, scene);
    if (r.error) errors.push(`[${scene.id}] layer3d ${what}：${r.error}`);
    return r.frame ?? 0;
  };
  const camera = typeof d.camera === "string" || d.camera === undefined ? d.camera : (Array.isArray(d.camera) ? d.camera : [d.camera]).map((m) => ({ ...m, start: at(m.start, "camera") }));
  const animate = (d.animate ?? []).map((a) => ({ ...a, start: at(a.start, "animate") }));
  const prep = prepareScene(d.scene, camera, animate, d.outline);
  for (const e of prep.errors) errors.push(`[${scene.id}] layer3d：${e}`);
  return { prep, camera, animate, z: d.z ?? 0 };
};

/** 3D 錨點在某一幀的位置，換成 2D 世界座標（scene 的 2D 鏡頭固定） */
const anchorWorld = (rt: Stage3DRuntime, id: string, f: number, cam: CameraState) => {
  const a = rt.anchorAt(id, f);
  if (!a) return undefined;
  const p = rt.project(f, a);
  return { x: cam.x + (p.x - PIXEL.width / 2) / cam.zoom, y: cam.y + (p.y - PIXEL.height / 2) / cam.zoom, visible: p.visible };
};

/** 第一個看得到這個錨點的幀（角色站位的基準幀） */
const firstVisible = (rt: Stage3DRuntime, id: string, duration: number) => {
  for (let f = 0; f < duration; f += 3) {
    const a = rt.anchorAt(id, f);
    if (a && rt.project(f, a).visible) return f;
  }
  return 0;
};

// ── target：用名稱指名舞台上的物件 ─────────────────
type TargetBox = { x: number; bottom: number; h: number };
const POSES = (character as { poses: { name: string; width: number; height: number }[] }).poses;

/** 舞台上有名字的物件（素材、燈光）+ 主持人 → 世界座標的位置與高度 */
const buildTargets = (META: Record<string, AssetMeta>, spec: StageSpec | undefined, host: { pose: string; x?: number; y?: number; scale?: number } | null) => {
  const map = new Map<string, TargetBox>();
  for (const it of spec?.items ?? []) {
    if (!it.name) continue;
    const m = META[it.asset];
    const h = (m ? m.frameH ?? m.h : 0) * (it.scale ?? 1);
    map.set(it.name, { x: it.x, bottom: it.y, h });
  }
  for (const l of spec?.lights ?? []) if (l.name) map.set(l.name, { x: l.x, bottom: l.y, h: 0 });
  if (host) {
    const p = POSES.find((q) => q.name === host.pose);
    map.set("主持人", { x: host.x ?? 160, bottom: host.y ?? WORLD.groundY, h: (p?.height ?? 51) * (host.scale ?? 1) });
  }
  return map;
};

/** "@詞" / "@詞+5" / "@詞-3" / "@詞+mark:release"（同一個 @詞 的 Act 動作裡的時間點）→ 幀 */
const resolveStart = (start: number | string, scene: Scene): { frame?: number; error?: string } => {
  if (typeof start === "number") return { frame: start };
  const m = /^@(.+?)(?:\+mark:([^+-]+))?([+-]\d+)?$/.exec(start);
  if (!m) return { error: `start「${start}」格式不對，應該是數字或 "@高亮詞"` };
  const word = m[1];
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  let markOffset = 0;
  if (m[2]) {
    const acts = (scene.events ?? []).filter((e) => e.component === "Act" && e.start === `@${word}`);
    const hit = acts.map((e) => markFrame(String(e.props?.action), m[2])).find((f) => f !== undefined);
    if (hit === undefined) {
      const names = acts.map((e) => String(e.props?.action));
      return { error: names.length ? `「@${word}」的動作（${names.join("、")}）沒有 mark「${m[2]}」` : `找不到 start 為「@${word}」的 Act 事件（mark 要跟著同一個 @詞 的動作）` };
    }
    markOffset = hit;
  }
  for (const line of scene.subtitles ?? []) {
    for (const h of line.highlight ?? []) {
      if (typeof h === "string") {
        if (h === word) return { error: `高亮詞「${word}」沒有 at（寫成 {"word":"${word}","at":幀}）` };
      } else if (h.word === word) {
        if (h.at === undefined) return { error: `高亮詞「${word}」沒有 at` };
        return { frame: h.at + markOffset + offset };
      }
    }
  }
  return { error: `這個 scene 的字幕裡找不到高亮詞「${word}」` };
};

// ── 角色（scene.actors）──
const ACTOR_EVENTS = new Set(["Act", "ActorState"]);
type PtIn = string | { x?: number; y?: number } | undefined;

/** 站位：舞台物件名稱（底部中心）或 {x, y} */
const resolvePt = (v: PtIn, targets: Map<string, TargetBox>): { pt?: Pt; error?: string } => {
  if (v === undefined) return {};
  if (typeof v === "string") {
    const t = targets.get(v);
    return t ? { pt: { x: t.x, y: t.bottom } } : { error: `找不到站位「${v}」。可用的舞台物件：${[...targets.keys()].join("、") || "（沒有）"}` };
  }
  if (typeof v.x !== "number" || typeof v.y !== "number") return { error: `座標要寫成 {"x": 數字, "y": 數字}，收到 ${JSON.stringify(v)}` };
  return { pt: { x: v.x, y: v.y } };
};

const buildActors = (
  decls: ActorDecl[],
  targets: Map<string, TargetBox>,
  host: { pose: string; x?: number; y?: number; scale?: number; flipX?: boolean } | null,
  three?: { rt: Stage3DRuntime; cam: CameraState; duration: number },
) => {
  const errors: string[] = [];
  const inits: ActorInit[] = [];
  const follow = new Map<string, FollowSpec>();
  for (let d of decls) {
    // 站在 3D 錨點上：在第一個看得到錨點的幀算出畫面位置，之後由 Follow3D 跟著鏡頭走
    // （layer3d 的命名點已經在 targets 裡，當一般站位用）
    if (is3d(d.anchor) && (three || !targets.has(d.anchor))) {
      const id = d.anchor.slice(3);
      if (!three) errors.push(`角色 ${d.id}：站位「${d.anchor}」需要 scene 有 stage3d`);
      else if (!three.rt.hasAnchor(id)) errors.push(`角色 ${d.id}：3D 錨點「${id}」不存在，可用：${Object.keys(three.rt.module.anchors).join("、")}`);
      else {
        const ref = firstVisible(three.rt, id, three.duration);
        const w = anchorWorld(three.rt, id, ref, three.cam)!;
        targets.set(`__actor3d_${d.id}`, { x: w.x, bottom: w.y, h: 0 });
        // 畫面大小 = 真實身高在該距離的投影（角色骨架原生高度 × 整數倍 當作基準像素）
        const rigDef = ACTORS[d.rig ?? (d.id in ACTORS ? d.id : "host")];
        const basePx = (rigDef?.views[d.view ?? "front"]?.h ?? 51) * (d.scale ?? 1);
        const clip = is3d(d.clipBelow) ? d.clipBelow.slice(3) : undefined;
        if (clip && !three.rt.hasAnchor(clip)) errors.push(`角色 ${d.id}：clipBelow 的 3D 錨點「${clip}」不存在`);
        follow.set(d.id, { anchor: id, refFrame: ref, depthScale: d.depthScale ?? true, real: d.depthScale === false ? undefined : { height: d.height3d ?? 1.8, basePx }, clipBelow: clip });
        d = { ...d, anchor: `__actor3d_${d.id}` };
      }
    }
    const rig = d.rig ?? (d.id in ACTORS ? d.id : "host");
    const def = ACTORS[rig];
    if (!def) {
      errors.push(`角色 ${d.id}：骨架「${rig}」不存在，可用：${Object.keys(ACTORS).join("、")}`);
      continue;
    }
    if (inits.some((a) => a.id === d.id)) errors.push(`角色 id「${d.id}」重複`);
    const view = d.view ?? "front";
    if (!def.views[view]) errors.push(`角色 ${d.id}：沒有視角「${view}」，可用：${Object.keys(def.views).join("、")}`);
    if (d.costume && !def.costumes[d.costume]) errors.push(`角色 ${d.id}：沒有換裝「${d.costume}」，可用：${Object.keys(def.costumes).join("、") || "（沒有）"}`);
    if (d.scale !== undefined && !(Number.isInteger(d.scale) && d.scale > 0)) errors.push(`角色 ${d.id}：scale 必須是正整數`);
    const p = resolvePt(d.anchor, targets);
    if (p.error) errors.push(`角色 ${d.id}：${p.error}`);
    const isHost = d.id === "host";
    const pt = p.pt ?? (isHost && host ? { x: host.x ?? 160, y: host.y ?? WORLD.groundY } : { x: WORLD.centerX, y: WORLD.groundY });
    inits.push({
      id: d.id,
      rig,
      x: pt.x,
      y: pt.y,
      view: def.views[view] ? view : Object.keys(def.views)[0],
      facing: d.facing ?? (isHost && host?.flipX ? "left" : "right"),
      costume: d.costume && def.costumes[d.costume] ? d.costume : undefined,
      silhouette: d.silhouette ?? false,
      dim: d.dim === true ? 0.5 : typeof d.dim === "number" ? d.dim : 0,
      scale: d.scale ?? (isHost ? host?.scale : undefined) ?? 1,
      visible: d.visible ?? true,
      talk: d.talk ?? false,
      tagText: d.tagText,
    });
  }
  return { inits, errors, follow };
};

const ErrorPanel: React.FC<{ errors: string[] }> = ({ errors }) =>
  errors.length ? (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 110,
        maxWidth: 1200,
        padding: "16px 20px",
        background: "rgba(60,0,0,0.92)",
        border: "4px solid #ff2a2a",
        color: "#ffdede",
        fontFamily: FONT_PIXEL,
        fontSize: 24,
        lineHeight: 1.5,
        zIndex: 9999,
      }}
    >
      <div style={{ color: "#ff8a8a", marginBottom: 6 }}>⚠ 時間軸錯誤 {errors.length} 項</div>
      {errors.map((e, i) => (
        <div key={i}>• {e}</div>
      ))}
    </div>
  ) : null;

const EventView: React.FC<{ r: Resolved; scene: Scene; camera: CameraState }> = ({ r, scene, camera }) => {
  const entry = REGISTRY[r.ev.component];
  const raw = r.props;
  const props = entry.prepare ? entry.prepare(raw as Record<string, any>, { camera }) : raw;
  const C = entry.component;
  const dur = r.ev.duration ?? Math.max(1, scene.duration - r.start);
  const body = r.follow ? (
    <Follow3D anchor={r.follow.anchor} refFrame={r.follow.refFrame} from={r.start} depthScale={r.follow.depthScale}>
      <C {...props} />
    </Follow3D>
  ) : (
    <C {...props} />
  );
  const seq = (
    <Sequence from={r.start} durationInFrames={dur} layout="none">
      {r.focus?.length ? <FocusWrap focus={r.focus}>{body}</FocusWrap> : body}
    </Sequence>
  );
  // 有 id 的事件：PropFx 可以指名它（晃動、移動、消失…），以組件的 (x, y) 為軸；在 Sequence 外面，用 scene 的幀
  return r.ev.id ? <FxTarget name={r.ev.id} x={Number(raw.x ?? 0)} y={Number(raw.y ?? 0)} render={() => seq} /> : seq;
};

/** 事件的 focus：壓暗 / 模糊依關鍵幀漸變（A20 前景虛焦時讓組件一起虛化） */
const FocusWrap: React.FC<{ focus: Focus[]; children: React.ReactNode }> = ({ focus, children }) => {
  const f = useCurrentFrame();
  let dim = 0;
  let blur = 0;
  for (const k of [...focus].sort((a, b) => a.at - b.at)) {
    if (f < k.at) break;
    const p = Math.min(1, (f - k.at) / Math.max(1, k.frames ?? 12));
    if (k.dim !== undefined) dim += (k.dim - dim) * p;
    if (k.blur !== undefined) blur += (k.blur - blur) * p;
  }
  const filter = [dim > 0.001 ? `brightness(${(1 - dim).toFixed(3)})` : "", blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : ""].join(" ").trim();
  return <div style={{ position: "absolute", inset: 0, filter: filter || undefined }}>{children}</div>;
};

export const SceneView: React.FC<{ scene: Scene; timeline: Timeline; navEnterAt: number; ghost?: boolean }> = ({ scene, timeline, navEnterAt, ghost }) => {
  const errors: string[] = [];
  if (scene.navAt !== undefined) {
    const r = resolveStart(scene.navAt, scene);
    if (r.error) errors.push(`[${scene.id}] navAt：${r.error}`);
    else navEnterAt = r.frame!;
  }
  if (scene.transitionOut && !["wipe", "blur"].includes(scene.transitionOut.type)) errors.push(`[${scene.id}] transitionOut.type「${scene.transitionOut.type}」不存在，可用：wipe、blur`);
  const assetMeta = useAssets().meta;
  const stage = STAGES[scene.stage ?? "void"];
  if (!stage) errors.push(`[${scene.id}] 舞台「${scene.stage}」不存在，可用：${Object.keys(STAGES).join("、")}`);
  const rt3d = build3d(scene, errors);
  const l3d = build3dLayer(scene, errors);
  // 3D scene 的 2D 鏡頭預設固定在廣角（世界座標 = 畫面座標，2D 像素和 3D 像素一樣大）；鏡頭運動交給 S3Camera / layer3d.camera
  const camera: CameraState = { ...(rt3d || l3d ? CAMERA_WIDE : CAMERA_HOME), ...scene.cameraInitial };
  /** layer3d 的命名點 → 第 f 幀的世界座標（只做擺位參考，不跟隨） */
  const point3d = (id: string, f: number) => {
    const p = pointIn(l3d!.prep, id, f);
    return p.error ? { error: p.error } : { x: camera.x + (p.x - PIXEL.width / 2) / camera.zoom, y: camera.y + (p.y - PIXEL.height / 2) / camera.zoom };
  };

  // scene 沒寫 host（undefined）時用舞台存的預設站位；寫 null 表示不出現（3D scene 預設不出現）
  const h = scene.host !== undefined ? scene.host : rt3d || l3d ? null : stage?.defaultHost ?? null;
  const targets = buildTargets(assetMeta, rt3d || l3d ? undefined : stage?.spec, h);
  // layer3d 的命名點：角色站位用第 0 幀的位置（事件的 target 用事件開始那一幀，見下面）
  if (l3d) {
    for (const id of Object.keys(l3d.prep.points)) {
      const w = point3d(id, 0);
      if (!("error" in w)) targets.set(`3d:${id}`, { x: w.x, bottom: w.y, h: 0 });
    }
  }

  // 角色：站位要用舞台物件，所以在 targets 之後；角色本身也可以被 target 指名（id；host 同時是「主持人」）
  const actors = buildActors(scene.actors ?? [], targets, h, rt3d ? { rt: rt3d, cam: camera, duration: scene.duration } : undefined);
  for (const e of actors.errors) errors.push(`[${scene.id}] ${e}`);
  const replacesHost = actors.inits.some((a) => a.id === "host");
  for (const a of actors.inits) {
    const box = { x: a.x, bottom: a.y, h: (ACTORS[a.rig]?.views[a.view]?.h ?? 51) * a.scale };
    targets.set(a.id, box);
    if (a.id === "host") targets.set("主持人", box);
  }

  const idFollow = new Map<string, FollowSpec>();
  const resolved: Resolved[] = (scene.events ?? []).map((ev, i) => {
    const errs: string[] = [];
    const s = resolveStart(ev.start, scene);
    if (s.error) errs.push(s.error);
    const start = s.frame ?? 0;
    // props 裡的 "@詞"（at / …At 欄位）→ 相對事件開始的幀；{ target: "名稱" } → { x, y }
    const nested: { out: Record<string, unknown>; name: string }[] = [];
    const deep = (v: unknown, key: string): unknown => {
      if (typeof v === "string" && v.startsWith("@") && (key === "at" || /At$/.test(key))) {
        const q = resolveStart(v, scene);
        if (q.error) errs.push(`${key}：${q.error}`);
        return (q.frame ?? start) - start;
      }
      if (Array.isArray(v)) return v.map((x) => deep(x, key));
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const named = typeof o.target === "string";
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(o)) if (!(named && (k === "target" || k === "anchor" || k === "offset"))) out[k] = deep(x, k);
        if (named) {
          const t = targets.get(o.target as string);
          if (!t) errs.push(`找不到物件「${o.target}」（${key}）。可指名：${[...targets.keys()].join("、")}`);
          else {
            const off = (o.offset ?? {}) as { x?: number; y?: number };
            out.x = Math.round(t.x + (off.x ?? 0));
            out.y = Math.round((o.anchor === "top" ? t.bottom - t.h : o.anchor === "bottom" ? t.bottom : t.bottom - t.h / 2) + (off.y ?? 0));
            nested.push({ out, name: o.target as string });
          }
        }
        return out;
      }
      return v;
    };
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ev.props ?? {})) props[k] = deep(v, k);
    const focus = ev.focus?.map((q) => ({ ...q, at: deep(q.at, "at") as number }));
    if (ev.component === "PropFx" && !ev.target) errs.push("PropFx 需要 target（要動的物件名稱）");
    if (ev.layer !== undefined && typeof ev.layer !== "number" && !["world", "hud", "back"].includes(ev.layer)) errs.push(`layer「${ev.layer}」不存在，可用："world"、"hud"、"back" 或數字（和 3D 層排順序）`);
    let follow: FollowSpec | undefined;
    if (ev.target) {
      let t = targets.get(ev.target);
      if (is3d(ev.target) && l3d && !rt3d) {
        // layer3d 的命名點：事件開始那一幀的畫面位置（不跟隨）
        const w = point3d(ev.target.slice(3), start);
        if ("error" in w) errs.push(w.error!);
        t = "error" in w ? { x: 0, bottom: 0, h: 0 } : { x: w.x, bottom: w.y, h: 0 };
      } else if (is3d(ev.target)) {
        // 3D 錨點：以事件開始那一幀的畫面位置帶入座標，之後跟著鏡頭走
        const id = ev.target.slice(3);
        const w = rt3d && s.frame !== undefined ? anchorWorld(rt3d, id, s.frame, camera) : undefined;
        if (!rt3d) errs.push(`target「${ev.target}」需要 scene 有 stage3d`);
        else if (!w) errs.push(`3D 錨點「${id}」不存在，可用：${Object.keys(rt3d.module.anchors).join("、")}`);
        else {
          t = { x: w.x, bottom: w.y, h: 0 };
          follow = { anchor: id, refFrame: s.frame!, depthScale: ev.depthScale ?? false };
        }
        if (!t) t = { x: 0, bottom: 0, h: 0 };
      } else if (idFollow.has(ev.target)) {
        // 指名貼在 3D 錨點上的組件的某部分：跟著那個組件走
        follow = { ...idFollow.get(ev.target)!, depthScale: ev.depthScale ?? false };
      } else if (actors.follow.has(ev.target === "主持人" ? "host" : ev.target)) {
        // 指名站在 3D 錨點上的角色：跟著角色的錨點走
        follow = { ...actors.follow.get(ev.target === "主持人" ? "host" : ev.target)!, depthScale: ev.depthScale ?? false };
      }
      if (!t) {
        errs.push(`找不到物件「${ev.target}」。這個舞台可指名的物件：${[...targets.keys()].join("、") || "（沒有，請在舞台編輯器裡為物件命名）"}`);
      } else if (ev.component !== "PropFx" && REGISTRY[ev.component]) {
        // 自動帶入座標：center = 物件中心、top = 頭頂、bottom = 底部；hud 圖層換算成畫面座標
        const y0 = ev.anchor === "top" ? t.bottom - t.h : ev.anchor === "bottom" ? t.bottom : t.bottom - t.h / 2;
        let x = t.x + (ev.offset?.x ?? 0);
        let y = y0 + (ev.offset?.y ?? 0);
        const spec = REGISTRY[ev.component].props;
        if ((ev.layer ?? REGISTRY[ev.component].layer) === "hud") ({ x, y } = worldToScreen(camera, x, y));
        if (spec.x && props.x === undefined) props.x = Math.round(x);
        if (spec.y && props.y === undefined) props.y = Math.round(y);
        if (spec.groundY && props.groundY === undefined) props.groundY = Math.round(t.bottom);
      }
    }
    // props 裡指名的物件若貼在別的 3D 錨點上：換算到這個事件的座標系（以事件開始那一幀對齊），
    // 例如 CoinFlight 起點跟著角色、終點是跟著另一個錨點的塔
    if (rt3d && nested.length) {
      const shift = (fl: FollowSpec | undefined) => {
        if (!fl) return { x: 0, y: 0 };
        const a = anchorWorld(rt3d, fl.anchor, start, camera);
        const b = anchorWorld(rt3d, fl.anchor, fl.refFrame, camera);
        return a && b ? { x: a.x - b.x, y: a.y - b.y } : { x: 0, y: 0 };
      };
      const own = shift(follow);
      for (const n of nested) {
        const t = shift(idFollow.get(n.name) ?? actors.follow.get(n.name === "主持人" ? "host" : n.name));
        n.out.x = Math.round((n.out.x as number) + t.x - own.x);
        n.out.y = Math.round((n.out.y as number) + t.y - own.y);
      }
    }
    // 先用 target 帶入座標，再檢查參數（否則會被誤判成缺少 x / y）
    errs.unshift(...validateEvent(ev.component, props));
    // 有 id 的事件：組件的各部分登記成 target（"<id>"、"<id>.<部分>"），之後的事件可以指名
    if (ev.id) {
      if (targets.has(ev.id)) errs.push(`id「${ev.id}」和其他物件重名`);
      const entry = REGISTRY[ev.component];
      const parts = entry?.targets && errs.length === 0 ? entry.targets(props) : { "": { x: Number(props.x ?? 0), bottom: Number(props.y ?? 0), h: 0 } };
      for (const [k, box] of Object.entries(parts)) {
        const name = k ? `${ev.id}.${k}` : ev.id;
        targets.set(name, box);
        if (follow) idFollow.set(name, follow);
      }
    }
    const smokeActors = ev.component === "SmokePop" ? [props.actor, ...(Array.isArray(props.hide) ? props.hide : [])].filter((a) => a !== undefined) : [];
    for (const a of ACTOR_EVENTS.has(ev.component) ? [props.actor] : smokeActors) {
      if (typeof a === "string" && !actors.inits.some((x) => x.id === a)) {
        errs.push(`角色「${a}」沒有在這個 scene 的 actors 宣告。已宣告：${actors.inits.map((x) => x.id).join("、") || "（沒有，請在 scene 加 \"actors\"）"}`);
      }
    }
    // SmokePop 帶骨架角色：名牌高度用角色的身高
    if (ev.component === "SmokePop" && typeof props.actor === "string" && props.h === undefined) {
      const a = actors.inits.find((x) => x.id === props.actor);
      if (a) props.h = (ACTORS[a.rig]?.views[a.view]?.h ?? 51) * a.scale;
    }
    return { ev, i, start, errors: errs, props, follow, focus };
  });

  // Act / ActorState → 每個角色的事件（站位名稱換成座標）
  const actorEvents = new Map<string, ActorEv[]>(actors.inits.map((a) => [a.id, []]));
  for (const r of resolved) {
    if (!ACTOR_EVENTS.has(r.ev.component) || r.errors.length) continue;
    const p = r.props as Record<string, any>;
    const pts: Record<string, Pt | undefined> = {};
    for (const k of r.ev.component === "Act" ? ["from", "to"] : ["at"]) {
      if (is3d(p[k]) && !(l3d && !rt3d)) {
        // 3D 錨點：用角色站位的基準幀換算，和角色的 Follow3D 同一個座標系
        const id = p[k].slice(3);
        const ref = actors.follow.get(p.actor)?.refFrame ?? r.start;
        const w = rt3d ? anchorWorld(rt3d, id, ref, camera) : undefined;
        if (!w) r.errors.push(`${k}：3D 錨點「${id}」不存在或 scene 沒有 stage3d`);
        pts[k] = w ? { x: w.x, y: w.y } : undefined;
        continue;
      }
      const q = resolvePt(p[k], targets);
      if (q.error) r.errors.push(`${k}：${q.error}`);
      pts[k] = q.pt;
    }
    if (r.ev.component === "ActorState" && p.costume) {
      const rig = actors.inits.find((a) => a.id === p.actor)!.rig;
      if (!ACTORS[rig].costumes[p.costume]) r.errors.push(`沒有換裝「${p.costume}」，可用：${Object.keys(ACTORS[rig].costumes).join("、")}`);
    }
    if (r.errors.length) continue;
    const list = actorEvents.get(p.actor)!;
    if (r.ev.component === "Act") list.push({ kind: "act", start: r.start, duration: r.ev.duration, action: p.action, view: p.view, facing: p.facing, loop: p.loop, from: pts.from, to: pts.to, prop: p.prop, speed: p.speed });
    else list.push({ kind: "state", start: r.start, costume: p.costume, silhouette: p.silhouette, dim: p.dim, scale: p.scale, visible: p.visible, view: p.view, facing: p.facing, talk: p.talk, at: pts.at, tagText: p.tagText });
  }
  // SmokePop 的 actor / hide：在煙最濃的那一幀讓角色出場（站到 x, y）/ 退場
  for (const r of resolved) {
    if (r.ev.component !== "SmokePop" || r.errors.length) continue;
    const p = r.props as Record<string, any>;
    const at = r.start + SMOKE_REVEAL;
    if (typeof p.actor === "string") actorEvents.get(p.actor)!.push({ kind: "state", start: at, visible: true, at: { x: p.x, y: p.y } });
    for (const id of Array.isArray(p.hide) ? p.hide : []) actorEvents.get(id)!.push({ kind: "state", start: at, visible: false });
  }
  for (const r of resolved) for (const e of r.errors) errors.push(`[${scene.id}] 事件 #${r.i + 1} ${r.ev.component}：${e}`);
  const ok = resolved.filter((r) => r.errors.length === 0 && r.ev.component !== "PropFx" && !ACTOR_EVENTS.has(r.ev.component) && !S3_EVENTS.has(r.ev.component));
  // PropFx：交給舞台物件自己套用（晃動、發光、消失…）
  const fx: PropFxEntry[] = resolved
    .filter((r) => r.errors.length === 0 && r.ev.component === "PropFx")
    .map((r) => ({ ...(r.props as object), target: r.ev.target!, start: r.start, duration: r.ev.duration } as PropFxEntry));
  const layerOf = (r: Resolved) => r.ev.layer ?? REGISTRY[r.ev.component].layer;
  const world = ok.filter((r) => layerOf(r) === "world");
  const hud = ok.filter((r) => layerOf(r) === "hud");
  // layer "back"：世界座標，畫在主持人 / 角色後面（例如整張背景圖、角色腳下的坑）
  const back = ok.filter((r) => layerOf(r) === "back");
  // 數字 layer：和 3D 層排順序（小的在後；同數字照事件順序）
  const numbered = ok.filter((r) => typeof r.ev.layer === "number").sort((a, b) => (a.ev.layer as number) - (b.ev.layer as number) || a.i - b.i);
  const z3d = l3d?.z ?? 0;
  const under3d = numbered.filter((r) => (r.ev.layer as number) < z3d);
  const over3d = numbered.filter((r) => (r.ev.layer as number) >= z3d);
  const numberedLayer = (list: Resolved[]) =>
    list.length ? (
      <Camera initial={camera} moves={scene.camera}>
        {list.map((r) => (
          <EventView key={`n${r.i}`} r={r} scene={scene} camera={camera} />
        ))}
      </Camera>
    ) : null;

  const StageC = stage?.component;
  const hx = h?.x ?? 160;
  const hy = h?.y ?? WORLD.groundY;
  const staticHost =
    h && !replacesHost ? (
      <FxTarget name="主持人" x={hx} y={hy} render={(f) => <Host pose={h.pose} x={hx} y={hy} flipX={h.flipX} scale={h.scale ?? 1} talk={h.talk} glow={f.glow} tint={f.tint} />} />
    ) : null;
  // 角色畫在主持人的位置（舞台的 main 物件之後、front 物件之前）
  const host = (
    <>
      {back.map((r) => (
        <EventView key={`back${r.i}`} r={r} scene={scene} camera={camera} />
      ))}
      {staticHost}
      {actors.inits.map((a) => {
        const el = <FxTarget key={a.id} name={a.id === "host" ? "主持人" : a.id} x={a.x} y={a.y} render={() => <Actor init={a} events={actorEvents.get(a.id) ?? []} />} />;
        const fl = actors.follow.get(a.id);
        return fl ? (
          <Follow3D key={a.id} anchor={fl.anchor} refFrame={fl.refFrame} depthScale={fl.depthScale} real={fl.real} clipBelow={fl.clipBelow}>
            {el}
          </Follow3D>
        ) : (
          el
        );
      })}
    </>
  );
  const worldContent = (
    <>
      {scene.ambience?.length ? <Ambience layers={scene.ambience} /> : null}
      {world.map((r) => (
        <EventView key={r.i} r={r} scene={scene} camera={camera} />
      ))}
    </>
  );

  return (
    <Stage3DRuntimeContext.Provider value={rt3d ?? null}>
    <PropFxContext.Provider value={fx}>
    <PixelStage
      background={scene.background ?? rt3d?.module.background ?? stage?.background}
      bloom={scene.bloom}
      vignette={scene.vignette}
      hud={hud.map((r) => (
        <EventView key={r.i} r={r} scene={scene} camera={camera} />
      ))}
      ui={
        ghost ? null : (
          <>
            {timeline.nav && scene.navIndex !== undefined ? <TopNav chapters={timeline.nav.chapters} current={scene.navIndex} enterAt={navEnterAt} /> : null}
            {timeline.watermark && scene.watermark !== false ? <Watermark topic={timeline.watermark} /> : null}
            {scene.subtitles?.length ? <Subtitles lines={scene.subtitles} /> : null}
            <ErrorPanel errors={errors} />
          </>
        )
      }
    >
      {rt3d ? <Stage3DView runtime={rt3d} /> : null}
      {numberedLayer(under3d)}
      {l3d && !l3d.prep.errors.length ? (
        <Layer3D scene={l3d.prep.scene} camera={l3d.camera} animate={l3d.animate} pixelSize={scene.layer3d!.pixelSize} background={scene.layer3d!.background} showErrors={false} />
      ) : null}
      {numberedLayer(over3d)}
      <Camera initial={camera} moves={scene.camera}>
        {StageC ? (
          <StageC host={host}>{worldContent}</StageC>
        ) : (
          <>
            {host}
            {worldContent}
          </>
        )}
      </Camera>
    </PixelStage>
    </PropFxContext.Provider>
    </Stage3DRuntimeContext.Provider>
  );
};

/**
 * 2D 轉場的凍結畫面：wipe（A16）整張滑出、邊緣帶陰影；blur（A7）滑出時水平拖影（只橫向模糊）並變暗。
 * 畫面座標是 1920×1080（在 PixelStage 外面）。
 */
const TransitionGhost: React.FC<{ type: "wipe" | "blur"; direction?: "left" | "right"; frames: number; id: number; children: React.ReactNode }> = ({ type, direction, frames, id, children }) => {
  const f = useCurrentFrame();
  const p = Math.min(1, Math.max(0, (f + 1) / frames));
  const e = p * p; // 先慢後快
  const dir = (direction ?? (type === "wipe" ? "left" : "right")) === "left" ? -1 : 1;
  const dx = dir * e * 100;
  if (type === "wipe") {
    return (
      <AbsoluteFill style={{ transform: `translateX(${dx.toFixed(2)}%)`, boxShadow: "0 0 48px 16px rgba(0,0,0,0.7)" }}>
        <AbsoluteFill style={{ overflow: "hidden" }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const fid = `sb-hblur-${id}`;
  const blur = 4 + 90 * e;
  return (
    <AbsoluteFill style={{ transform: `translateX(${dx.toFixed(2)}%)` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={fid} x="-50%" y="0" width="200%" height="100%">
          <feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ overflow: "hidden", filter: `url(#${fid}) brightness(${(1 - 0.55 * p).toFixed(3)})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export type TimelineProps = { timeline: Timeline };

export const TimelineComposition: React.FC<TimelineProps> = ({ timeline }) => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {timeline.audio ? (
        <Audio src={staticFile(timeline.audio.src)} startFrom={Math.round((timeline.audio.startFrom ?? 0) * (timeline.fps ?? 30))} volume={timeline.audio.volume ?? 1} />
      ) : null}
      {timeline.scenes.map((scene, i) => {
        const from = t;
        t += scene.duration;
        // 導航條：前一個 scene 已經顯示導航時，不再滑入一次
        const prev = i > 0 ? timeline.scenes[i - 1] : undefined;
        const prevShown = prev?.navIndex !== undefined;
        const tr = prev?.transitionOut;
        const trFrames = tr ? Math.max(1, Math.min(tr.duration ?? 12, scene.duration)) : 0;
        return (
          <React.Fragment key={scene.id + i}>
            <Sequence from={from} durationInFrames={scene.duration} name={scene.id}>
              <SceneView scene={scene} timeline={timeline} navEnterAt={prevShown ? -10 : 0} />
            </Sequence>
            {prev && tr ? (
              // 轉場：上一個 scene 的最後一幀凍住，蓋在這個 scene 開頭往一側擦出
              <Sequence from={from} durationInFrames={trFrames} name={`${prev.id}→${scene.id}`}>
                <TransitionGhost type={tr.type} direction={tr.direction} frames={trFrames} id={i}>
                  <Freeze frame={prev.duration - 1}>
                    <SceneView scene={prev} timeline={timeline} navEnterAt={-10} ghost />
                  </Freeze>
                </TransitionGhost>
              </Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const timelineDuration = (timeline: Timeline) => Math.max(1, timeline.scenes.reduce((s, sc) => s + sc.duration, 0));

export const calculateTimelineMetadata: CalculateMetadataFunction<TimelineProps> = ({ props }) => ({
  durationInFrames: timelineDuration(props.timeline),
  fps: props.timeline.fps ?? 30,
});
