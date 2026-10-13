import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CAMERA_HOME, CameraState, worldToScreen } from "../components/Camera";
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
import assetMeta from "../generated/asset-meta.json";
import character from "../generated/character.json";
import type { ActorDecl, Scene, Timeline, TimelineEvent } from "./types";
import { Actor } from "../actor/Actor";
import { ACTORS } from "../actor/rig";
import { ActorEv, ActorInit, markFrame, Pt } from "../actor/timeline";

/**
 * TimelineComposition —— 讀時間軸 JSON 渲染整支片。
 * 名稱、參數、"@詞"、舞台寫錯時：該事件不渲染，並在畫面左上角列出紅色錯誤清單（不靜默略過）。
 */

type Resolved = { ev: TimelineEvent; i: number; start: number; errors: string[]; props: Record<string, unknown> };

// ── target：用名稱指名舞台上的物件 ─────────────────
type TargetBox = { x: number; bottom: number; h: number };
const META = assetMeta as Record<string, { w: number; h: number; frameW?: number; frameH?: number }>;
const POSES = (character as { poses: { name: string; width: number; height: number }[] }).poses;

/** 舞台上有名字的物件（素材、燈光）+ 主持人 → 世界座標的位置與高度 */
const buildTargets = (spec: StageSpec | undefined, host: { pose: string; x?: number; y?: number; scale?: number } | null) => {
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

const buildActors = (decls: ActorDecl[], targets: Map<string, TargetBox>, host: { pose: string; x?: number; y?: number; scale?: number; flipX?: boolean } | null) => {
  const errors: string[] = [];
  const inits: ActorInit[] = [];
  for (const d of decls) {
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
    });
  }
  return { inits, errors };
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
  return (
    <Sequence from={r.start} durationInFrames={dur} layout="none">
      <C {...props} />
    </Sequence>
  );
};

export const SceneView: React.FC<{ scene: Scene; timeline: Timeline; navEnterAt: number }> = ({ scene, timeline, navEnterAt }) => {
  const errors: string[] = [];
  const stage = STAGES[scene.stage ?? "void"];
  if (!stage) errors.push(`[${scene.id}] 舞台「${scene.stage}」不存在，可用：${Object.keys(STAGES).join("、")}`);
  const camera: CameraState = { ...CAMERA_HOME, ...scene.cameraInitial };

  // scene 沒寫 host（undefined）時用舞台存的預設站位；寫 null 表示不出現
  const h = scene.host !== undefined ? scene.host : stage?.defaultHost ?? null;
  const targets = buildTargets(stage?.spec, h);

  // 角色：站位要用舞台物件，所以在 targets 之後；角色本身也可以被 target 指名（id；host 同時是「主持人」）
  const actors = buildActors(scene.actors ?? [], targets, h);
  for (const e of actors.errors) errors.push(`[${scene.id}] ${e}`);
  const replacesHost = actors.inits.some((a) => a.id === "host");
  for (const a of actors.inits) {
    const box = { x: a.x, bottom: a.y, h: 51 * a.scale };
    targets.set(a.id, box);
    if (a.id === "host") targets.set("主持人", box);
  }

  const resolved: Resolved[] = (scene.events ?? []).map((ev, i) => {
    const errs: string[] = [];
    const s = resolveStart(ev.start, scene);
    if (s.error) errs.push(s.error);
    const props: Record<string, unknown> = { ...ev.props };
    if (ev.component === "PropFx" && !ev.target) errs.push("PropFx 需要 target（要動的物件名稱）");
    if (ev.target) {
      const t = targets.get(ev.target);
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
    // 先用 target 帶入座標，再檢查參數（否則會被誤判成缺少 x / y）
    errs.unshift(...validateEvent(ev.component, props));
    if (ACTOR_EVENTS.has(ev.component) && typeof props.actor === "string" && !actors.inits.some((a) => a.id === props.actor)) {
      errs.push(`角色「${props.actor}」沒有在這個 scene 的 actors 宣告。已宣告：${actors.inits.map((a) => a.id).join("、") || "（沒有，請在 scene 加 \"actors\"）"}`);
    }
    return { ev, i, start: s.frame ?? 0, errors: errs, props };
  });

  // Act / ActorState → 每個角色的事件（站位名稱換成座標）
  const actorEvents = new Map<string, ActorEv[]>(actors.inits.map((a) => [a.id, []]));
  for (const r of resolved) {
    if (!ACTOR_EVENTS.has(r.ev.component) || r.errors.length) continue;
    const p = r.props as Record<string, any>;
    const pts: Record<string, Pt | undefined> = {};
    for (const k of r.ev.component === "Act" ? ["from", "to"] : ["at"]) {
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
    else list.push({ kind: "state", start: r.start, costume: p.costume, silhouette: p.silhouette, dim: p.dim, scale: p.scale, visible: p.visible, view: p.view, facing: p.facing, talk: p.talk, at: pts.at });
  }

  for (const r of resolved) for (const e of r.errors) errors.push(`[${scene.id}] 事件 #${r.i + 1} ${r.ev.component}：${e}`);
  const ok = resolved.filter((r) => r.errors.length === 0 && r.ev.component !== "PropFx" && !ACTOR_EVENTS.has(r.ev.component));
  // PropFx：交給舞台物件自己套用（晃動、發光、消失…）
  const fx: PropFxEntry[] = resolved
    .filter((r) => r.errors.length === 0 && r.ev.component === "PropFx")
    .map((r) => ({ ...(r.props as object), target: r.ev.target!, start: r.start, duration: r.ev.duration } as PropFxEntry));
  const layerOf = (r: Resolved) => r.ev.layer ?? REGISTRY[r.ev.component].layer;
  const world = ok.filter((r) => layerOf(r) === "world");
  const hud = ok.filter((r) => layerOf(r) === "hud");

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
      {staticHost}
      {actors.inits.map((a) => (
        <FxTarget key={a.id} name={a.id === "host" ? "主持人" : a.id} x={a.x} y={a.y} render={() => <Actor init={a} events={actorEvents.get(a.id) ?? []} />} />
      ))}
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
    <PixelStage
      background={scene.background ?? stage?.background}
      bloom={scene.bloom}
      vignette={scene.vignette}
      hud={hud.map((r) => (
        <EventView key={r.i} r={r} scene={scene} camera={camera} />
      ))}
      ui={
        <>
          {timeline.nav && scene.navIndex !== undefined ? <TopNav chapters={timeline.nav.chapters} current={scene.navIndex} enterAt={navEnterAt} /> : null}
          {timeline.watermark && scene.watermark !== false ? <Watermark topic={timeline.watermark} /> : null}
          {scene.subtitles?.length ? <Subtitles lines={scene.subtitles} /> : null}
          <ErrorPanel errors={errors} />
        </>
      }
    >
      <Camera initial={scene.cameraInitial} moves={scene.camera}>
        <PropFxContext.Provider value={fx}>
          {StageC ? (
            <StageC host={host}>{worldContent}</StageC>
          ) : (
            <>
              {host}
              {worldContent}
            </>
          )}
        </PropFxContext.Provider>
      </Camera>
    </PixelStage>
  );
};

export type TimelineProps = { timeline: Timeline };

export const TimelineComposition: React.FC<TimelineProps> = ({ timeline }) => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {timeline.scenes.map((scene, i) => {
        const from = t;
        t += scene.duration;
        // 導航條：前一個 scene 已經顯示導航時，不再滑入一次
        const prevShown = i > 0 && timeline.scenes[i - 1].navIndex !== undefined;
        return (
          <Sequence key={scene.id + i} from={from} durationInFrames={scene.duration} name={scene.id}>
            <SceneView scene={scene} timeline={timeline} navEnterAt={prevShown ? -10 : 0} />
          </Sequence>
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
