import type { Layer3DType } from "../types";
import { hand } from "./hand";
import { room } from "./room";
import { terrain } from "./terrain";

/**
 * 組件類型註冊表：場景 JSON 的 { "type": "<名稱>" } → 模組。
 * 新增一種類型：寫 types/<名稱>.ts（export 一個 Layer3DType），在這裡加一行；
 * 影片專案自己的類型用 registerLayer3DType("名稱", 模組)。見 docs/layer3d.md「新增類型」。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LAYER3D_TYPES: Record<string, Layer3DType<any>> = { room, terrain, hand };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerLayer3DType = (name: string, type: Layer3DType<any>) => {
  LAYER3D_TYPES[name] = type;
};
