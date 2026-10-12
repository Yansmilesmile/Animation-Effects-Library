import React from "react";
import { Layer } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { seeded } from "../lib/util";
import { WORLD } from "../theme";

// 書房舞台：素材庫沒有整張場景背景，用道具拼出來。牆和地板是程式畫的。
export const A = {
  bookcase: "_自動拆分/Interior_Decoration_室内装饰/Interior_1/Interior_1_007.png",
  wallClock: "_自動拆分/Interior_Decoration_室内装饰/Interior_1/Interior_1_054.png",
  painting: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_小道具整合2_png/280.png",
  lamp: "_自動拆分/Interior_Decoration_室内装饰/Interior_1/Interior_1_029.png",
  window: "_自動拆分/Interior_Decoration_室内装饰/Interior_1/Interior_1_040.png",
  rug: "_自動拆分/Interior_Decoration_室内装饰/Interior_1/Interior_1_079.png",
  laptopDesk: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_小道具整合2_png/454.png",
  plant: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_ssff-收集整理 (14)_png/232.png",
  moon: "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_小道具整合_png/210.png",
  chest: "Weapons_武器装备/武器装备-冒险岛/172.png",
  book: "Weapons_武器装备/武器装备-冒险岛/206.png",
  coin: "Skill_Icons_技能图标/技能图标/0267.png",
  plantMonster: "Characters_角色人物/monster/Plant/Idle (44x42).png",
  slime: "Characters_角色人物/monster/Slime/Idle-Run (44x30).png",
} as const;

export const FLOOR_Y = 146;
// 主持人站位：腳底在標準地面線 WORLD.groundY（預設取景下落在畫面 80%）
export const HOST_FEET = WORLD.groundY;
// 全身站姿（51px）的身體中心
export const HOST_CENTER = HOST_FEET - 26;
// 檯燈燈罩位置（給 Ambience lamp 用）
export const LAMP_GLOW = { x: 348, y: 132 };

// 木地板接縫：每排 4 條，位置用固定 seed 的亂數錯開
const SEAMS: [number, number][] = (() => {
  const r = seeded(11);
  const out: [number, number][] = [];
  for (let row = -1; row < 9; row++) {
    const start = Math.floor(r() * 120);
    for (let k = 0; k < 4; k++) out.push([start + k * 120 + Math.floor(r() * 30), row]);
  }
  return out;
})();

const Planks: React.FC = () => (
  <>
    {Array.from({ length: 9 }, (_, i) => (
      <div
        key={i}
        style={{ position: "absolute", left: 0, top: FLOOR_Y + 8 + i * 16, width: 480, height: 1, background: "#140c08" }}
      />
    ))}
    {SEAMS.map(([x, row], i) => (
      <div
        key={`v${i}`}
        style={{ position: "absolute", left: x, top: FLOOR_Y + 8 + row * 16, width: 1, height: 16, background: "#140c08" }}
      />
    ))}
  </>
);

export const StudyRoom: React.FC<{ children?: React.ReactNode; host?: React.ReactNode }> = ({ children, host }) => (
  <>
    {/* 背景層：牆、窗、書櫃，壓暗並模糊做景深 */}
    <Layer blur={0.35} dim={0.4}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 480, height: FLOOR_Y, background: "linear-gradient(#0c1330, #1a2550)" }} />
      {/* 護牆板 */}
      <div style={{ position: "absolute", left: 0, top: FLOOR_Y - 34, width: 480, height: 34, background: "#2a1d16" }} />
      <div style={{ position: "absolute", left: 0, top: FLOOR_Y - 36, width: 480, height: 2, background: "#4a3222" }} />
      <Sprite asset={A.window} x={112} y={100} />
      <Sprite asset={A.moon} x={106} y={84} />
      <Sprite asset={A.bookcase} x={168} y={FLOOR_Y} />
      <Sprite asset={A.bookcase} x={216} y={FLOOR_Y} />
      <Sprite asset={A.wallClock} x={292} y={84} />
      <Sprite asset={A.painting} x={372} y={104} />
    </Layer>
    {/* 地板 */}
    <div style={{ position: "absolute", left: 0, top: FLOOR_Y, width: 480, height: 270 - FLOOR_Y, background: "#24170f" }} />
    <Planks />
    {/* 前景道具 */}
    <Sprite asset={A.rug} x={200} y={182} bloom={false} />
    <Sprite asset={A.laptopDesk} x={332} y={166} />
    <Sprite asset={A.lamp} x={348} y={140} />
    <Sprite asset={A.plant} x={386} y={166} />
    {host}
    {children}
  </>
);
