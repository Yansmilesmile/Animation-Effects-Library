import { createContext, useContext } from "react";
import type { Stage3DRuntime } from "./runtime";
import type { ObjState, Stage3DModule } from "./types";

/** 模組註冊表：影片專屬的 3D 舞台在影片的入口檔呼叫 registerStage3D，時間軸 scene 用 "stage3d": "<id>" 選用 */
export const STAGES_3D: Record<string, Stage3DModule> = {};
export const registerStage3D = (...modules: Stage3DModule[]) => {
  for (const m of modules) STAGES_3D[m.id] = m;
};

export type Stage3DFrame = { frame: number; runtime: Stage3DRuntime; obj: (id: string) => ObjState };

// ThreeCanvas 有自己的 React 樹，這個 context 在 canvas 裡面重新提供
export const Stage3DContext = createContext<Stage3DFrame | null>(null);

/** 模組的 Scene 裡用：目前幀數（scene 內）、物件狀態 */
export const useStage3D = () => {
  const c = useContext(Stage3DContext);
  if (!c) throw new Error("useStage3D 只能在 3D 舞台模組的 Scene 裡使用");
  return c;
};

// 2D 疊加層用：scene 的 3D 執行期（錨點投影、跟隨）
export const Stage3DRuntimeContext = createContext<Stage3DRuntime | null>(null);
export const useStage3DRuntime = () => useContext(Stage3DRuntimeContext);
