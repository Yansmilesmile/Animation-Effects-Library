import type * as THREE from "three";

/**
 * Layer3D 的資料格式。場景是一份 JSON（Scene3D），程式不動；一種組件類型 = 一個模組（types/*.ts）。
 * 只做背景或單一主體：沒有物件狀態機、沒有讓 2D 跟著 3D 走、沒有遮擋。見 docs/layer3d.md。
 */
export type Vec3 = [number, number, number];

export type CameraSpec = {
  position: Vec3;
  target: Vec3;
  /** 垂直視角（度），預設 40 */
  fov?: number;
  /** 鏡頭位移（畫面高度的比例，正 = 畫面往下看）：不俯仰、垂直線保持平行（一點透視） */
  shiftY?: number;
};

/** 機位：cameras 的 id，或直接寫一個機位 */
export type CameraRef = string | CameraSpec;

export type Ease = "inout" | "in" | "out" | "linear";
export type CameraMoveKind = "push" | "pull" | "pan" | "hold" | "cut";

/** 一段鏡頭運動。start / duration 是幀（相對這個 Layer3D 開始）；from 省略 = 從目前的位置開始 */
export type CameraMove = {
  start?: number;
  duration?: number;
  from?: CameraRef;
  to?: CameraRef;
  move?: CameraMoveKind;
  ease?: Ease;
};

/** 參數補間：把組件（id）或 environment 的數字參數，在 start..start+duration 補間到 to */
export type Animate = {
  target: string;
  start?: number;
  duration?: number;
  ease?: Ease;
  to: Record<string, number | number[]>;
};

export type LightSpec =
  | { type: "ambient"; color?: string; intensity?: number }
  | { type: "hemisphere"; sky?: string; ground?: string; intensity?: number }
  | { type: "directional"; color?: string; intensity?: number; position?: Vec3; target?: Vec3; castShadow?: boolean }
  | { type: "point"; color?: string; intensity?: number; position?: Vec3; distance?: number; decay?: number }
  | {
      type: "spot";
      color?: string;
      intensity?: number;
      position?: Vec3;
      target?: Vec3;
      angle?: number;
      penumbra?: number;
      castShadow?: boolean;
      /** 光柱（加法混色的錐體）亮度，0 = 不畫 */
      beam?: number;
    };

export type Environment = {
  /** 0 = 夜、0.5 = 黃昏、1 = 白天；也可寫 "night" | "dusk" | "day"。可用 animate 補間（target "environment"） */
  time?: number | "night" | "dusk" | "day";
  /** 天空背板（大圓頂、色帶漸層、太陽 / 月亮 / 星星）；false = 不畫（透明層用） */
  sky?: false | { top?: string; horizon?: string; bottom?: string; bands?: number; stars?: number; sun?: boolean; moon?: boolean; radius?: number };
  /** 依 time 自動打的環境光＋日 / 月光；false = 不打（燈全寫在 lights 裡） */
  light?: false | { intensity?: number; direction?: Vec3; castShadow?: boolean };
  /** 天氣：位置只由幀數決定 */
  weather?: { type: "snow" | "rain"; count?: number; speed?: number; color?: string; area?: Vec3; center?: Vec3; seed?: number };
  /** 霧：density（指數霧）或 near / far（線性霧） */
  fog?: { color: string; density?: number; near?: number; far?: number };
};

export type ComponentSpec = { type: string; id?: string; [k: string]: unknown };

export type Scene3D = {
  name?: string;
  seed?: number;
  /** 3D 先渲染到 1920÷pixelSize 再最近鄰放大，預設 4（480×270） */
  pixelSize?: number;
  /** 背景色；"transparent"（預設）= 透明，可夾在 2D 層之間 */
  background?: string;
  /** 量化用的調色盤（quantize 不是 off 時） */
  palette?: string[];
  /** off（預設）| ramp = 調色盤每色 5 階明暗 | strict = 只用調色盤原色 */
  quantize?: "off" | "ramp" | "strict";
  dither?: number;
  post?: {
    bloom?: false | { strength?: number; radius?: number; threshold?: number };
    /** 暗角 0..1 */
    vignette?: number;
    exposure?: number;
    toneMapping?: "aces" | "none";
    /** 調色：tint 偏色、contrast 對比、saturation 飽和度 */
    grade?: { tint?: string; contrast?: number; saturation?: number };
    /** 色階數（有序抖動），0 = 關 */
    colorLevels?: number;
  };
  environment?: Environment;
  lights?: LightSpec[];
  components?: ComponentSpec[];
  cameras: Record<string, CameraSpec>;
  /** 開始的機位，預設 cameras 的第一個 */
  camera?: string;
  /** 命名點（給 point() 換成畫面座標，只做 2D 擺位參考） */
  points?: Record<string, Vec3>;
};

// ── 組件類型模組 ──

export type BuildContext = {
  seed: number;
  /** 3D 畫面的解析度（1920÷pixelSize × 1080÷pixelSize） */
  width: number;
  height: number;
  /** 已載入的圖片（images() 列出的 src → 圖） */
  image: (src: string) => HTMLImageElement | undefined;
  /** 素材 path → 網址（AssetProvider） */
  url: (path: string) => string;
};

export type FrameContext = { frame: number; fps: number; /** 秒 */ t: number; camera: THREE.PerspectiveCamera };

export type Built<P> = {
  object: THREE.Object3D;
  /** 每幀呼叫：p 是補間後的參數；只能由 p 和幀數決定畫面（可跳幀、可平行渲染） */
  update?: (p: P, f: FrameContext) => void;
  dispose?: () => void;
};

export type Layer3DType<P extends object = Record<string, any>> = {
  /** 一句話說明（錯誤訊息、文件用） */
  describe: string;
  defaults: P;
  /** 可用 animate 補間的參數（數字或數字陣列） */
  animatable?: string[];
  /** 建一次場景（同步）。貼圖用 canvas 畫或用 ctx.image() 取已載好的圖 */
  build: (p: P, ctx: BuildContext) => Built<P>;
  /** 這個組件提供的命名點（point() 用；id 會加在前面："<組件 id>.<點>"） */
  points?: (p: P) => Record<string, Vec3>;
  /** 渲染前要先載好的圖片 src（素材 path） */
  images?: (p: P) => string[];
  /** 參數檢查，回傳錯誤訊息 */
  check?: (p: P) => string[];
};
