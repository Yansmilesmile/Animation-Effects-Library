import React from "react";
import { Ambience } from "../components/Ambience";
import { StudyRoom } from "../scenes/StudyRoom";
import { WORLD } from "../theme";

/**
 * 舞台預設（scene.stage）。世界座標，地面線 WORLD.groundY。
 * 目前只有試驗用的舞台；之後正式的「家」舞台（可切換燈光、道具）也註冊在這裡。
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

export const STAGES: Record<string, { component: React.FC<StageProps>; background?: string }> = {
  "study-room": { component: StudyRoom },
  "night-snow": { component: NightSnow, background: "linear-gradient(#060a1e, #1b2a5c 70%, #2c3f78)" },
  void: { component: Void, background: "#05060c" },
};
