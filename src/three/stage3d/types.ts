import type React from "react";

/**
 * 3D 舞台模組的介面。每個 3D 舞台一個模組（影片專屬的放在影片資料夾，用 registerStage3D 註冊）。
 * 分鏡 scene3d 的 hero_objects[].states / anchors / cameras 對應到這裡的 objects / anchors / cameras，
 * 時間軸用 S3State / S3Camera / S3Focus 事件呼叫這些名稱。
 */
export type Vec3 = [number, number, number];

export type CameraSpec = {
  position: Vec3;
  target: Vec3;
  /** 垂直視角（度），預設 40 */
  fov?: number;
};

/** 物件在某一幀的狀態：從 from 往 to 過渡，t = 0..1（已套緩動），age = 進入這次過渡後經過的幀數 */
export type ObjState = { from: string; to: string; t: number; raw: number; age: number; start: number };

/** 模組計算錨點、畫場景時能拿到的純資料（只由幀數與時間軸事件決定） */
export type StageState = {
  frame: number;
  seed: number;
  obj: (id: string) => ObjState;
};

export type Stage3DModule = {
  id: string;
  /** 分鏡 scene3d.palette：最後畫面量化到這組顏色（含明暗階） */
  palette: string[];
  seed: number;
  /** 3D 先渲染到 1920÷pixelSize 的解析度再最近鄰放大，預設 4（480×270） */
  pixelSize?: number;
  background?: string;
  objects: Record<string, { states: string[]; initial: string; desc?: string }>;
  cameras: Record<string, CameraSpec>;
  /** scene 開始時的機位 */
  initialCamera: string;
  /** 錨點：固定座標，或依物件狀態計算（例如跟著升起的樓） */
  anchors: Record<string, Vec3 | ((s: StageState) => Vec3)>;
  /** three.js 場景內容（在 ThreeCanvas 裡渲染），用 useStage3D() 讀幀數、物件狀態 */
  Scene: React.FC;
  /** 後製 bloom，預設 { strength: 0.9, radius: 0.4, threshold: 0.6 } */
  bloom?: { strength: number; radius: number; threshold: number } | false;
  /** 調色盤量化：ramp = 每個顏色 5 階明暗 + 有序抖動（預設）；strict = 只用調色盤原色；off = 不量化 */
  quantize?: "ramp" | "strict" | "off";
  /** 抖動強度 0..1，預設 0.35 */
  dither?: number;
};

export type Ease = "inout" | "in" | "out" | "linear" | "back" | "bounce";
export type CameraMoveKind = "cut" | "push" | "pull" | "pan" | "tilt" | "orbit" | "crane" | "dolly";

/** 機位引用：直接寫 cameras 的 id，或以某個機位為基礎再偏移 */
export type CameraRef =
  | string
  | {
      from: string;
      /** 機位整體平移（position 和 target 一起） */
      offset?: Vec3;
      /** 只移動 position */
      positionOffset?: Vec3;
      /** 只移動 target */
      lookOffset?: Vec3;
      /** 沿視線往前推（正）/ 往後拉（負）幾單位 */
      dolly?: number;
      /** 以 target 為中心水平繞行（度，正 = 逆時針俯視） */
      orbit?: number;
      /** 原地向左（正）/ 向右轉頭（度），position 不動 */
      yaw?: number;
      fov?: number;
    };

export type S3StateEvent = { start: number; object: string; to: string; duration?: number; ease?: Ease };
export type S3CameraEvent = { start: number; to: CameraRef; duration?: number; move?: CameraMoveKind; ease?: Ease };
export type S3FocusEvent = { start: number; anchor?: string; off?: boolean; blur?: number; duration?: number };

export type CameraFrame = { position: Vec3; target: Vec3; fov: number };
export type FocusFrame = { anchor?: string; amount: number; blur: number };
