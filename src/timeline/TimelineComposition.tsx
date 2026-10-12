import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CAMERA_HOME, CameraState } from "../components/Camera";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Subtitles } from "../components/Subtitle";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { FONT_PIXEL, WORLD } from "../theme";
import { REGISTRY, validateEvent } from "./registry";
import { STAGES } from "./stages";
import type { Scene, Timeline, TimelineEvent } from "./types";

/**
 * TimelineComposition —— 讀時間軸 JSON 渲染整支片。
 * 名稱、參數、"@詞"、舞台寫錯時：該事件不渲染，並在畫面左上角列出紅色錯誤清單（不靜默略過）。
 */

type Resolved = { ev: TimelineEvent; i: number; start: number; errors: string[] };

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
  const raw = r.ev.props ?? {};
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

  const resolved: Resolved[] = (scene.events ?? []).map((ev, i) => {
    const errs = validateEvent(ev.component, ev.props);
    const s = resolveStart(ev.start, scene);
    if (s.error) errs.push(s.error);
    return { ev, i, start: s.frame ?? 0, errors: errs };
  });
  for (const r of resolved) for (const e of r.errors) errors.push(`[${scene.id}] 事件 #${r.i + 1} ${r.ev.component}：${e}`);
  const ok = resolved.filter((r) => r.errors.length === 0);
  const layerOf = (r: Resolved) => r.ev.layer ?? REGISTRY[r.ev.component].layer;
  const world = ok.filter((r) => layerOf(r) === "world");
  const hud = ok.filter((r) => layerOf(r) === "hud");

  const StageC = stage?.component;
  // scene 沒寫 host（undefined）時用舞台存的預設站位；寫 null 表示不出現
  const h = scene.host !== undefined ? scene.host : stage?.defaultHost ?? null;
  const host = h ? <Host pose={h.pose} x={h.x ?? 160} y={h.y ?? WORLD.groundY} flipX={h.flipX} scale={h.scale ?? 1} /> : null;
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
