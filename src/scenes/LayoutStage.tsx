import React from "react";
import { Ambience, AmbienceLayer } from "../components/Ambience";
import { Layer } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { Img, staticFile } from "remotion";
import { PIXEL } from "../theme";
import { FxTarget } from "../timeline/propfx";

/**
 * LayoutStage —— 渲染舞台編輯器（tools/stage_editor）存下來的舞台 stages/<name>.json。
 * 世界座標，和編輯器畫布一模一樣：
 * - wall / floor：牆面（顏色或 CSS 漸層）與地板（高度、顏色、木紋）。
 * - items：素材，(x, y) 是底部中心；depth = back（模糊壓暗的背景）/ main（人物後面）/ front（人物前面）。
 * - lights：檯燈光（明暗呼吸，可帶光錐）。
 * - host：預設主持人站位；scene 有寫 host 時以 scene 為準。
 * - bg3d：3D 場景背景圖（舞台編輯器截圖），畫在最底層；預設不畫牆面地板。
 * - 物件的 name 讓時間軸能指名它：target 定位、PropFx 讓它晃動 / 發光 / 消失…
 */
export type StageItem = {
  /** 物件名稱（編輯器自動帶入、可修改）；時間軸用 target 指名它 */
  name?: string;
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
export type StageLight = { name?: string; type: "lamp"; x: number; y: number; radius?: number; cone?: number; color?: string };
/** 3D 場景背景：scenes3d/*.html 截圖成 public/bg3d/*.png；影片裡用圖片，不跑 3D */
export type StageBg3d = { html: string; image: string; w: number; h: number; keepWallFloor?: boolean };
export type StageSpec = {
  name: string;
  wall: { color: string; css?: string };
  floor: { y: number; color: string; planks?: boolean };
  items: StageItem[];
  lights?: StageLight[];
  /** 舞台的預設主持人站位（時間軸 scene 沒寫 host 時使用）；null = 預設不出現 */
  host?: StageHost | null;
  bg3d?: StageBg3d;
};
export type StageHost = { pose: string; x: number; y: number; scale?: number; flipX?: boolean };

// 有名字的物件會套用時間軸的 PropFx（晃動、彈跳、發光、消失…）
const ItemSprite: React.FC<{ it: StageItem }> = ({ it }) => (
  <FxTarget
    name={it.name}
    x={it.x}
    y={it.y}
    render={(fx) => (
      <Sprite asset={it.asset} x={it.x} y={it.y} scale={it.scale ?? 1} flipX={it.flipX} rotate={it.rotate ?? 0} bloom={!it.noBloom} glow={fx.glow} tint={fx.tint} />
    )}
  />
);

export const LayoutStage: React.FC<{ spec: StageSpec; host?: React.ReactNode; children?: React.ReactNode }> = ({ spec, host, children }) => {
  const by = (d: StageItem["depth"]) => spec.items.filter((it) => (it.depth ?? "main") === d);
  const showWallFloor = !spec.bg3d || spec.bg3d.keepWallFloor;
  const planks = [];
  if (showWallFloor && spec.floor.planks) for (let y = spec.floor.y + 8; y < PIXEL.height; y += 16) planks.push(y);
  const lights: AmbienceLayer[] = (spec.lights ?? []).map((l) => ({ type: "lamp", x: l.x, y: l.y, radius: l.radius, cone: l.cone, color: l.color }));
  return (
    <>
      {spec.bg3d ? (
        <Img src={staticFile(spec.bg3d.image)} style={{ position: "absolute", left: 0, top: 0, width: PIXEL.width, height: PIXEL.height, imageRendering: "pixelated" }} />
      ) : null}
      <Layer blur={0.35} dim={0.4}>
        {showWallFloor ? <div style={{ position: "absolute", left: 0, top: 0, width: PIXEL.width, height: spec.floor.y, background: spec.wall.css || spec.wall.color }} /> : null}
        {by("back").map((it, i) => (
          <ItemSprite key={i} it={it} />
        ))}
      </Layer>
      {showWallFloor ? <div style={{ position: "absolute", left: 0, top: spec.floor.y, width: PIXEL.width, height: PIXEL.height - spec.floor.y, background: spec.floor.color }} /> : null}
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