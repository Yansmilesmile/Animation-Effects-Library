import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { useBloomPass } from "../../components/BloomContext";
import { ErrorBox } from "../../components/ErrorBox";
import { useAssets } from "../../lib/assets";
import { PIXEL, VIDEO } from "../../theme";
import { applyCamera, CameraTrack } from "./camera";
import { buildEnvironment, EnvParams } from "./environment";
import { buildLights } from "./lights";
import { buildPost, OUTLINE_LAYER } from "./post";
import { PreparedScene, prepareScene } from "./scene";
import type { Animate, Built, OutlineSpec, Scene3D } from "./types";

/**
 * <Layer3D> —— 一層即時渲染的 3D（背景或單一主體），可以夾在任意兩個 2D 層之間。
 *
 *   <PixelStage>
 *     <Sprite asset="…天空" />            ← 2D（後）
 *     <Layer3D scene={handScene} camera={{ to: "wide" }} animate={[…]} />
 *     <Sprite asset="…前景雲" />          ← 2D（前）
 *   </PixelStage>
 *
 * - 先渲染到 1920÷pixelSize × 1080÷pixelSize、關抗鋸齒，再最近鄰放大；背景預設透明（scene.background 可設底色）。
 * - 決定性：畫面只由 useCurrentFrame() 和場景的 seed 決定；貼圖同步畫好，圖片用 delayRender 等載完才掛載 3D 畫布。
 * - space："pixel"（預設）放在 PixelStage 的像素層裡；"screen" 放在 1920×1080 的畫面上。
 */
export type Layer3DProps = {
  /** 場景 JSON，或 registerScene3D 註冊的名稱 */
  scene: Scene3D | string;
  /** 鏡頭：機位 id、一段運動 { from, to, move, ease, start, duration }，或多段 */
  camera?: CameraTrack;
  /** 參數補間（hand 的 reach / curl、room 的 lightLevel、environment 的 time…） */
  animate?: Animate[];
  /** 覆寫場景的 pixelSize（3D 一格 = 幾個螢幕像素） */
  pixelSize?: number;
  /** 覆寫場景的 background："transparent" 或顏色 */
  background?: string;
  /** 覆寫場景的像素描邊：{ color, width, ids, inner, fog }；false = 不描 */
  outline?: OutlineSpec | false;
  space?: "pixel" | "screen";
  /** 錯誤紅框（預設顯示；時間軸自己收集錯誤時關掉） */
  showErrors?: boolean;
};

type BuiltAll = { root: THREE.Group; env: Built<EnvParams> & { fog?: THREE.Fog | THREE.FogExp2 }; comps: { id: string; params: Record<string, unknown>; b: Built<never> }[] };

const Inner: React.FC<{ prep: PreparedScene; cfg: Scene3D; frame: number; fps: number; W: number; H: number; images: Map<string, HTMLImageElement>; url: (p: string) => string }> = ({
  prep,
  cfg,
  frame,
  fps,
  W,
  H,
  images,
  url,
}) => {
  const { gl, scene, camera } = useThree();
  const built = useMemo<BuiltAll>(() => {
    const ctx = { seed: cfg.seed ?? 1, width: W, height: H, image: (s: string) => images.get(s), url };
    const root = new THREE.Group();
    const env = buildEnvironment(cfg.environment ?? {}, ctx);
    root.add(env.object);
    root.add(buildLights(cfg.lights ?? []).object);
    const outlined = cfg.outline ? cfg.outline.ids ?? prep.components.map((c) => c.id) : [];
    const comps = prep.components.map((c) => {
      const b = c.def.build(c.params as never, ctx) as Built<never>;
      root.add(b.object);
      // 要描邊的組件：整棵開 OUTLINE_LAYER（同時留在預設層，正常照畫）
      if (outlined.includes(c.id)) b.object.traverse((o) => o.layers.enable(OUTLINE_LAYER));
      return { id: c.id, params: c.params, b };
    });
    return { root, env, comps };
    // prep.components 跟著 cfg 變；鏡頭 / animate 改變不重建場景
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, W, H, images, url]);
  useEffect(() => () => built.comps.forEach((c) => c.b.dispose?.()), [built]);

  useLayoutEffect(() => {
    scene.fog = built.env.fog ?? null;
    scene.background = null;
    return () => {
      scene.fog = null;
    };
  }, [scene, built]);

  const post = useMemo(() => buildPost(gl, scene, camera, W, H, cfg), [gl, scene, camera, W, H, cfg]);
  useEffect(() => () => post.dispose(), [post]);

  // 這一幀：鏡頭、所有組件與 environment 的參數（只由 frame 決定）→ 後製輸出
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    applyCamera(cam, prep.camera.at(frame), W, H);
    const f = { frame, fps, t: frame / fps, camera: cam };
    built.env.update?.(prep.paramsAt("environment", prep.env, frame) as EnvParams, f);
    for (const c of built.comps) c.b.update?.(prep.paramsAt(c.id, c.params, frame) as never, f);
    post.render();
  }, 1);

  return <primitive object={built.root} />;
};

/** 先把場景要的圖片載完（delayRender 擋住截圖），再掛載 3D 畫布 */
const useImages = (srcs: string[], url: (p: string) => string) => {
  const key = srcs.join("|");
  const [state, setState] = useState<{ key: string; map: Map<string, HTMLImageElement>; errors: string[] } | null>(null);
  const [handle] = useState(() => (srcs.length ? delayRender(`Layer3D 載入貼圖（${srcs.length} 張）`) : null));
  useEffect(() => {
    if (!srcs.length) return;
    let alive = true;
    Promise.all(
      srcs.map(
        (s) =>
          new Promise<[string, HTMLImageElement | null]>((res) => {
            const im = new Image();
            im.onload = () => res([s, im]);
            im.onerror = () => res([s, null]);
            im.src = url(s);
          }),
      ),
    ).then((list) => {
      if (!alive) return;
      const map = new Map<string, HTMLImageElement>();
      const errors: string[] = [];
      for (const [s, im] of list) {
        if (im) map.set(s, im);
        else errors.push(`貼圖載入失敗：${s}`);
      }
      setState({ key, map, errors });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (state && handle !== null) continueRender(handle);
  }, [state, handle]);
  const empty = useMemo(() => ({ map: new Map<string, HTMLImageElement>(), errors: [] as string[] }), []);
  if (!srcs.length) return empty;
  return state && state.key === key ? state : null;
};

export const Layer3D: React.FC<Layer3DProps> = ({ scene, camera, animate, pixelSize, background, outline, space = "pixel", showErrors = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inBloom = useBloomPass();
  const { url } = useAssets();
  const camKey = JSON.stringify(camera ?? null);
  const animKey = JSON.stringify(animate ?? null);
  const outlineKey = JSON.stringify(outline ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prep = useMemo(() => prepareScene(scene, camera, animate, outline), [scene, camKey, animKey, outlineKey]);
  const cfg = useMemo<Scene3D>(() => ({ ...prep.scene, ...(background ? { background } : {}) }), [prep.scene, background]);
  const ps = Math.max(1, pixelSize ?? cfg.pixelSize ?? 4);
  const W = Math.round(VIDEO.width / ps);
  const H = Math.round(VIDEO.height / ps);
  const srcs = useMemo(() => [...new Set(prep.components.flatMap((c) => c.def.images?.(c.params as never) ?? []))], [prep]);
  const loaded = useImages(srcs, url);
  if (inBloom) return null;
  const errors = [...prep.errors, ...(loaded?.errors ?? [])];
  const k = space === "screen" ? VIDEO.width / W : PIXEL.width / W;
  return (
    <>
      {loaded && !prep.errors.length ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `scale(${k})`, imageRendering: "pixelated", pointerEvents: "none" }}>
          <ThreeCanvas width={W} height={H} gl={{ antialias: false, alpha: true }} dpr={1} shadows="basic" style={{ imageRendering: "pixelated" }}>
            <Inner prep={prep} cfg={cfg} frame={frame} fps={fps} W={W} H={H} images={loaded.map} url={url} />
          </ThreeCanvas>
        </div>
      ) : null}
      {showErrors && errors.length ? <ErrorBox pixel={space === "pixel"} x={4} y={4} message={`Layer3D：\n${errors.join("\n")}`} /> : null}
    </>
  );
};
