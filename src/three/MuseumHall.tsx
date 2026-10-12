import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useBloomPass } from "../components/BloomContext";
import { color, PIXEL } from "../theme";
import { easeCamera } from "../lib/util";

/**
 * 3D 試驗：博物館長廊（詞典 A4 推軌）。
 *
 * 做法（方案一：3D 當背景，2D 組件疊在上面）：
 * - Three.js 以 320×180 低解析度渲染、關掉抗鋸齒，在像素層裡放大成 480×270 → 螢幕上每個 3D 像素 = 6px，
 *   和 2D 素材在 1.5 倍取景下的像素一樣大。
 * - 鏡頭路徑是純函式 hallCamera(frame)，3D 場景和 2D 疊加層共用同一份，所以能用 project() 把 3D 座標換成畫面座標，
 *   讓光環、標籤這些 2D 組件「跟著」3D 物件走。
 */

export const RENDER = { width: 320, height: 180 } as const;
const FOV = 55;

// ── 鏡頭路徑（純函式，2D 和 3D 共用）──────────────────
export const hallCamera = (frame: number) => {
  const t = easeCamera(Math.min(1, frame / 220));
  const z = 7 - 21 * t;
  const y = 1.7 + 0.6 * t;
  const sway = Math.sin(frame / 60) * 0.15;
  return {
    position: new THREE.Vector3(sway, y, z),
    target: new THREE.Vector3(sway * 0.5, 1.6, z - 10),
  };
};

const makeCamera = (frame: number) => {
  const { position, target } = hallCamera(frame);
  const cam = new THREE.PerspectiveCamera(FOV, RENDER.width / RENDER.height, 0.1, 200);
  cam.position.copy(position);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  return cam;
};

/** 把 3D 世界座標換成像素層的畫面座標（480×270）；在鏡頭後面時 visible = false */
export const project = (frame: number, p: [number, number, number]) => {
  const cam = makeCamera(frame);
  const v = new THREE.Vector3(...p).project(cam);
  return {
    x: ((v.x + 1) / 2) * PIXEL.width,
    y: ((1 - v.y) / 2) * PIXEL.height,
    visible: v.z < 1 && v.z > -1,
  };
};

// 場景裡會被 2D 疊加層引用的位置
export const ANCHORS = {
  gem: [1.7, 1.55, -6] as [number, number, number],
  door: [0, 2.6, -46] as [number, number, number],
};

// ── 3D 場景 ────────────────────────────────────────
const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  useLayoutEffect(() => {
    const { position, target } = hallCamera(frame);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.position.copy(position);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [frame, camera]);
  return null;
};

const flat = (c: string) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

const Gem: React.FC<{ position: [number, number, number]; c: string; spin: number }> = ({ position, c, spin }) => (
  <mesh position={position} rotation={[0, spin, 0]}>
    <octahedronGeometry args={[0.32, 0]} />
    <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} flatShading />
  </mesh>
);

const Hall: React.FC = () => {
  const frame = useCurrentFrame();
  const mats = useMemo(
    () => ({
      floorA: flat("#2a2238"),
      floorB: flat("#1d1829"),
      wall: flat("#1b2547"),
      pillar: flat("#33467f"),
      trim: flat(color.goldDark),
      pedestal: flat("#3a3550"),
    }),
    [],
  );
  const tiles = [];
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 4; j++) {
      tiles.push(
        <mesh key={`${i}-${j}`} position={[-3 + j * 2 + 1, 0, 8 - i * 2 - 1]} rotation={[-Math.PI / 2, 0, 0]} material={(i + j) % 2 ? mats.floorA : mats.floorB}>
          <planeGeometry args={[2, 2]} />
        </mesh>,
      );
    }
  }
  const sections = Array.from({ length: 9 }, (_, k) => 6 - k * 6);
  const gemColors = [color.gold, "#5fd3ff", color.redLight, color.gold, "#9b7bff", color.gold, "#5fd3ff", color.gold];

  return (
    <>
      <color attach="background" args={["#070a16"]} />
      <fog attach="fog" args={["#070a16", 10, 62]} />
      <ambientLight intensity={0.6} color="#8090c0" />
      <directionalLight position={[2, 6, 4]} intensity={0.5} color="#c8d4ff" />
      {tiles}
      {/* 牆 */}
      <mesh position={[-4, 2.5, -20]} material={mats.wall}>
        <boxGeometry args={[0.2, 5, 60]} />
      </mesh>
      <mesh position={[4, 2.5, -20]} material={mats.wall}>
        <boxGeometry args={[0.2, 5, 60]} />
      </mesh>
      {sections.map((z, k) => (
        <group key={k}>
          {/* 柱子 + 金色飾條 */}
          {[-3.6, 3.6].map((x) => (
            <group key={x}>
              <mesh position={[x, 2.5, z]} material={mats.pillar}>
                <boxGeometry args={[0.6, 5, 0.6]} />
              </mesh>
              <mesh position={[x, 4.6, z]} material={mats.trim}>
                <boxGeometry args={[0.8, 0.2, 0.8]} />
              </mesh>
            </group>
          ))}
          {/* 展台 + 寶石（左右交錯） */}
          {k < 8 ? (
            <group position={[k % 2 ? -1.7 : 1.7, 0, z - 0]}>
              <mesh position={[0, 0.5, 0]} material={mats.pedestal}>
                <boxGeometry args={[0.9, 1, 0.9]} />
              </mesh>
              <mesh position={[0, 1.02, 0]} material={mats.trim}>
                <boxGeometry args={[1, 0.06, 1]} />
              </mesh>
              <Gem position={[0, 1.55 + Math.sin(frame / 20 + k) * 0.06, 0]} c={gemColors[k]} spin={frame / 30 + k} />
              <pointLight position={[0, 2.2, 0]} intensity={k < 4 ? 6 : 3} distance={5} color={gemColors[k]} />
            </group>
          ) : null}
          {/* 天花板燈 */}
          <mesh position={[0, 4.95, z]}>
            <boxGeometry args={[1.2, 0.1, 0.3]} />
            <meshBasicMaterial color="#ffe7a8" />
          </mesh>
        </group>
      ))}
      {/* 長廊盡頭的金門 */}
      <group position={[0, 0, -46]}>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[3, 5, 0.3]} />
          <meshStandardMaterial color={color.gold} emissive={color.gold} emissiveIntensity={0.8} flatShading />
        </mesh>
        <pointLight position={[0, 2.5, 2]} intensity={20} distance={14} color={color.goldLight} />
      </group>
    </>
  );
};

/**
 * ThreeLayer —— 放在 PixelStage 的 children 最前面（不要包 Camera）。
 * bloom 層會把 children 再畫一次；3D 不重畫（避免兩個 WebGL 畫面），所以 bloom 層裡回傳空。
 */
export const MuseumHall3D: React.FC = () => {
  const inBloom = useBloomPass();
  if (inBloom) return null;
  // 畫布固定 320×180，用 transform 放大成像素層的 480×270（再乘上像素層的 4 倍 = 每個 3D 像素 6px）
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: RENDER.width,
        height: RENDER.height,
        transformOrigin: "0 0",
        transform: `scale(${PIXEL.width / RENDER.width})`,
        imageRendering: "pixelated",
      }}
    >
      <ThreeCanvas width={RENDER.width} height={RENDER.height} gl={{ antialias: false }} dpr={1} style={{ imageRendering: "pixelated" }}>
        <CameraRig />
        <Hall />
      </ThreeCanvas>
    </div>
  );
};
