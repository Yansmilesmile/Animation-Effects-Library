import React, { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useBloomPass } from "../../components/BloomContext";
import { PIXEL } from "../../theme";
import { Stage3DContext } from "./context";
import { PostFX } from "./PostFX";
import type { Stage3DRuntime } from "./runtime";
import { useFontReady } from "./textures";

/**
 * Stage3DView —— 把 3D 舞台當成時間軸的一部分逐幀渲染。放在 PixelStage 的 children 最底層（不要包在 2D Camera 裡）。
 * 3D 先渲染到 1920÷pixelSize（預設 480×270）、關抗鋸齒，再最近鄰放大到整個像素層。
 * PixelStage 的 bloom 層不重畫 3D（避免兩個 WebGL 畫面），3D 自己的發光由 PostFX 的 bloom 處理。
 */
const CameraRig: React.FC<{ runtime: Stage3DRuntime; frame: number }> = ({ runtime, frame }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const c = runtime.cameraAt(frame);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = c.fov;
    cam.near = 0.1;
    cam.far = 1000;
    cam.position.set(...c.position);
    cam.lookAt(...c.target);
    cam.updateProjectionMatrix();
  }, [frame, camera, runtime]);
  return null;
};

export const Stage3DView: React.FC<{ runtime: Stage3DRuntime }> = ({ runtime }) => {
  const frame = useCurrentFrame();
  const inBloom = useBloomPass();
  // 字體就緒後才掛載畫布：模組裡有字的貼圖第一次畫就是正確的字體
  const fontReady = useFontReady();
  if (inBloom || !fontReady) return null;
  const m = runtime.module;
  const W = Math.round(1920 / (m.pixelSize ?? 4));
  const H = Math.round(1080 / (m.pixelSize ?? 4));
  const Scene = m.Scene;
  const focus = runtime.focusAt(frame);
  const anchor = focus.anchor ? runtime.anchorAt(focus.anchor, frame) : undefined;
  const distance = anchor ? runtime.project(frame, anchor).depth : 10;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        transformOrigin: "0 0",
        transform: `scale(${PIXEL.width / W}, ${PIXEL.height / H})`,
        imageRendering: "pixelated",
      }}
    >
      <ThreeCanvas width={W} height={H} gl={{ antialias: false }} dpr={1} style={{ imageRendering: "pixelated" }}>
        <Stage3DContext.Provider value={{ frame, runtime, obj: (id) => runtime.stateAt(id, frame) }}>
          {m.background ? <color attach="background" args={[m.background]} /> : null}
          <CameraRig runtime={runtime} frame={frame} />
          <Scene />
          <PostFX module={m} width={W} height={H} focus={{ distance, amount: focus.amount, blur: focus.blur }} />
        </Stage3DContext.Provider>
      </ThreeCanvas>
    </div>
  );
};
