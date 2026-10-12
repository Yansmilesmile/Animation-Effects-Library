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
import type { Scene, Timeline, TimelineEvent } from "./types";

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

/** "@詞" / "@詞+5" / "@詞-3" → 幀 */
const resolveStart = (start: number | string, scene: Scene): { frame?: number; error?: string } => {
  if (typeof start === "number") return { frame: start };
  const m = /^@(.+?)([+-]\d+)?$/.exec(start);
  if (!m) return { error: `start「${start}」格式不對，應該是數字或 "@高亮詞"` };
  const word = m[1];
  const offset = m[2] ? parseInt(m[2], 10) : 0;
  for (const line of scene.subtitles ?? []) {
    for (const h of line.highlight ?? []) {
      if (typeof h === "string") {
        if (h === word) return { error: `高亮詞「${word}」沒有 at（寫成 {"word":"${word}","at":幀}）` };
      } else if (h.word === word) {
        if (h.at === undefined) return { error: `高亮詞「${word}」沒有 at` };
        return { frame: h.at + offset };
      }
    }
  }
  return { error: `這個 scene 的字幕裡找不到高亮詞「${word}」` };
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
    return { ev, i, start: s.frame ?? 0, errors: errs, props };
  });
  for (const r of resolved) for (const e of r.errors) errors.push(`[${scene.id}] 事件 #${r.i + 1} ${r.ev.component}：${e}`);
  const ok = resolved.filter((r) => r.errors.length === 0 && r.ev.component !== "PropFx");
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
  const host = h ? (
    <FxTarget name="主持人" x={hx} y={hy} render={(f) => <Host pose={h.pose} x={hx} y={hy} flipX={h.flipX} scale={h.scale ?? 1} talk={h.talk} glow={f.glow} tint={f.tint} />} />
  ) : null;
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
