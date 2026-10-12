import React from "react";
import { Ambience, AmbienceLayer } from "../components/Ambience";
import { Layer } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { PIXEL } from "../theme";

/**
 * LayoutStage —— 渲染舞台編輯器（tools/stage_editor）存下來的舞台 stages/<name>.json。
 * 世界座標，和編輯器畫布一模一樣：
 * - wall / floor：牆面（顏色或 CSS 漸層）與地板（高度、顏色、木紋）。
 * - items：素材，(x, y) 是底部中心；depth = back（模糊壓暗的背景）/ main（人物後面）/ front（人物前面）。
 * - lights：檯燈光（明暗呼吸，可帶光錐）。
 * - host：預設主持人站位；scene 有寫 host 時以 scene 為準。
 */
export type StageItem = {
  asset: string;
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  /** 旋轉角度（度），以素材中心為軸 */
  rotate?: number;
  depth?: "back" | "main" | "front";
  noBloom?: boolean;
};
export type StageLight = { type: "lamp"; x: number; y: number; radius?: number; cone?: number; color?: string };
export type StageSpec = {
  name: string;
  wall: { color: string; css?: string };
  floor: { y: number; color: string; planks?: boolean };
  items: StageItem[];
  lights?: StageLight[];
  /** 舞台的預設主持人站位（時間軸 scene 沒寫 host 時使用）；null = 預設不出現 */
  host?: StageHost | null;
};
export type StageHost = { pose: string; x: number; y: number; scale?: number; flipX?: boolean };

const ItemSprite: React.FC<{ it: StageItem }> = ({ it }) => (
  <Sprite asset={it.asset} x={it.x} y={it.y} scale={it.scale ?? 1} flipX={it.flipX} rotate={it.rotate ?? 0} bloom={!it.noBloom} />
);

export const LayoutStage: React.FC<{ spec: StageSpec; host?: React.ReactNode; children?: React.ReactNode }> = ({ spec, host, children }) => {
  const by = (d: StageItem["depth"]) => spec.items.filter((it) => (it.depth ?? "main") === d);
  const planks = [];
  if (spec.floor.planks) for (let y = spec.floor.y + 8; y < PIXEL.height; y += 16) planks.push(y);
  const lights: AmbienceLayer[] = (spec.lights ?? []).map((l) => ({ type: "lamp", x: l.x, y: l.y, radius: l.radius, cone: l.cone, color: l.color }));
  return (
    <>
      <Layer blur={0.35} dim={0.4}>
        <div style={{ position: "absolute", left: 0, top: 0, width: PIXEL.width, height: spec.floor.y, background: spec.wall.css || spec.wall.color }} />
        {by("back").map((it, i) => (
          <ItemSprite key={i} it={it} />
        ))}
      </Layer>
      <div style={{ position: "absolute", left: 0, top: spec.floor.y, width: PIXEL.width, height: PIXEL.height - spec.floor.y, background: spec.floor.color }} />
      {planks.map((y) => (
        <div key={y} style={{ position: "absolute", left: 0, top: y, width: PIXEL.width, height: 1, background: "rgba(0,0,0,0.45)" }} />
      ))}
      {by("main").map((it, i) => (
        <ItemSprite key={i} it={it} />
      ))}
      {host}
      {by("front").map((it, i) => (
        <ItemSprite key={i} it={it} />
      ))}
      {lights.length ? <Ambience layers={lights} /> : null}
      {children}
    </>
  );
};
