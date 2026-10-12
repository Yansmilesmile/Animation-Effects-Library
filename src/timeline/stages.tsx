import React from "react";
import { Ambience } from "../components/Ambience";
import editorStages from "../generated/stages.json";
import { LayoutStage, StageHost, StageSpec } from "../scenes/LayoutStage";
import { StudyRoom } from "../scenes/StudyRoom";
import { WORLD } from "../theme";

/**
 * 舞台預設（scene.stage）。世界座標，地面線 WORLD.groundY。
 * 內建三個試驗用舞台；正式舞台用舞台編輯器（python tools/stage_editor/server.py）擺好存成 stages/<name>.json，
 * 執行 npm run assets 後自動註冊，時間軸寫 "stage": "<name>" 即可。
 */
export type StageProps = { children?: React.ReactNode; host?: React.ReactNode };

const NightSnow: React.FC<StageProps> = ({ children, host }) => (
  <>
    <Ambience layers={[{ type: "stars", count: 60, h: 150 }]} />
    <div style={{ position: "absolute", left: 0, top: WORLD.groundY - 6, width: 480, height: 120, background: "#dfe8f5" }} />
    <div style={{ position: "absolute", left: 0, top: WORLD.groundY - 6, width: 480, height: 2, background: "#ffffff" }} />
    {host}
    {children}
    <Ambience layers={[{ type: "snow", count: 80 }]} />
  </>
);

const Void: React.FC<StageProps> = ({ children, host }) => (
  <>
    {host}
    {children}
  </>
);

export type StageEntry = { component: React.FC<StageProps>; background?: string; defaultHost?: StageHost | null };

const BUILTIN: Record<string, StageEntry> = {
  "study-room": { component: StudyRoom },
  "night-snow": { component: NightSnow, background: "linear-gradient(#060a1e, #1b2a5c 70%, #2c3f78)" },
  void: { component: Void, background: "#05060c" },
};

// 舞台編輯器存的舞台（stages/*.json，經 npm run assets 彙整）；同名時覆蓋內建舞台
const FROM_EDITOR = Object.fromEntries(
  Object.entries(editorStages as Record<string, StageSpec>).map(([name, spec]) => [
    name,
    { component: ((p: StageProps) => <LayoutStage spec={spec} {...p} />) as React.FC<StageProps>, defaultHost: spec.host ?? null } as StageEntry,
  ]),
);

export const STAGES: Record<string, StageEntry> = { ...BUILTIN, ...FROM_EDITOR };
