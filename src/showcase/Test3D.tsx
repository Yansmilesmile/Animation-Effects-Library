import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CameraState } from "../components/Camera";
import { RingPulse, SunBurst, Tag } from "../components/emphasis";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { SubtitleLine, Subtitles } from "../components/Subtitle";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { ANCHORS, MuseumHall3D, project } from "../three/MuseumHall";
import { color, LAYOUT, PIXEL, STAGE_ZOOM } from "../theme";
import { Label } from "./Label";

/**
 * 3D 試驗片段（方案一）：Three.js 長廊當背景，現有 2D 組件疊在上面。
 * 2D 疊加層用固定的 1.5 倍鏡頭（和 3D 的 320×180 → 6px 一樣大的像素）。
 */

// 2D 疊加層的固定鏡頭：畫面中心 = 世界中心，放大 1.5 倍
const OVERLAY_CAM: CameraState = { x: PIXEL.width / 2, y: PIXEL.height / 2, zoom: STAGE_ZOOM, tilt: 0 };
// 畫面座標 → 疊加層的世界座標
const toWorld = (sx: number, sy: number) => ({
  x: OVERLAY_CAM.x + (sx - PIXEL.width / 2) / STAGE_ZOOM,
  y: OVERLAY_CAM.y + (sy - PIXEL.height / 2) / STAGE_ZOOM,
});

const LINES: SubtitleLine[] = [
  { start: 0, end: 115, text: "走進這條長廊，每一格都是一個複利故事", highlight: [{ word: "複利", at: 58 }] },
  { start: 115, end: 240, text: "而真正的寶藏，在最遠的那一端", highlight: [{ word: "寶藏", at: 150 }] },
];
const HL_GEM = 58;
const HL_DOOR = 150;

// Sequence 裡 useCurrentFrame 會從 0 開始，所以投影要用整段的幀：offset 補回來
const FollowAt: React.FC<{ from: number; anchor: [number, number, number]; children: (p: { x: number; y: number }) => React.ReactNode }> = ({
  from,
  anchor,
  children,
}) => (
  <Sequence from={from} layout="none">
    <Offset by={from} anchor={anchor}>
      {children}
    </Offset>
  </Sequence>
);
const Offset: React.FC<{ by: number; anchor: [number, number, number]; children: (p: { x: number; y: number }) => React.ReactNode }> = ({ by, anchor, children }) => {
  const local = useCurrentFrame();
  const s = project(local + by, anchor);
  if (!s.visible) return null;
  return <>{children(toWorld(s.x, s.y))}</>;
};

export const TEST3D_DURATION = 240;

export const Test3D: React.FC = () => {
  const host = toWorld(84, LAYOUT.groundY);
  return (
    <PixelStage
      background="#070a16"
      ui={
        <>
          <TopNav chapters={["序章", "第一關｜複利長廊", "第二關｜…", "結尾"]} current={1} />
          <Watermark topic="3D 試驗" />
          <Subtitles lines={LINES} />
          <Label name="3D 試驗" code="Three.js 背景 + 2D 組件疊加" note="3D 以 320×180 渲染放大 6 倍；標籤和光環跟著 3D 寶石走" />
        </>
      }
    >
      <MuseumHall3D />
      <Camera initial={OVERLAY_CAM}>
        {/* 3D 物件上的 2D 強調：念到「複利」時，光環 + 標籤跟著寶石移動 */}
        <FollowAt from={HL_GEM} anchor={ANCHORS.gem}>
          {(p) => (
            <>
              <RingPulse x={p.x} y={p.y} radius={26} color={color.goldLight} />
              <Tag text="複利・神級裝備" x={p.x} y={p.y - 10} variant="red" />
            </>
          )}
        </FollowAt>
        {/* 念到「寶藏」時，放射光打在長廊盡頭的金門 */}
        <FollowAt from={HL_DOOR} anchor={ANCHORS.door}>
          {(p) => (
            <>
              <SunBurst x={p.x} y={p.y} radius={60} />
              <Tag text="終點" x={p.x} y={p.y - 16} variant="dark" />
            </>
          )}
        </FollowAt>
        {/* 2D 主持人站在畫面 80% 的地面線 */}
        <Host pose="full_point_happy" x={host.x} y={host.y} flipX />
        <Ambience layers={[{ type: "dust", count: 40 }]} />
      </Camera>
    </PixelStage>
  );
};
