import type { AmbienceInput } from "../components/Ambience";
import type { CameraMove, CameraState } from "../components/Camera";
import type { Highlight } from "../components/Subtitle";

/**
 * 時間軸 JSON 格式（分鏡 AI 產生、TimelineComposition 渲染）。
 *
 * - 所有時間都是「幀」（30fps）。scene 依序接在一起，scene 內的 start 都相對於 scene 開頭。
 * - 座標一律是像素層座標：world 圖層用世界座標（預設取景下地面線 y = 160，可見 x 80–400），
 *   hud 圖層用畫面座標（480×270）。每個組件預設放哪一層見組件清單（docs/components.md）。
 * - event 的 start 可以寫 "@詞" 或 "@詞+5"，對準這個 scene 字幕裡高亮詞的 at。
 */
export type Timeline = {
  fps?: number;
  /** 頂部章節導航 */
  nav?: { chapters: string[] };
  /** 右上角浮水印：「超級人機・<watermark>」 */
  watermark?: string;
  scenes: Scene[];
};

export type Scene = {
  id: string;
  duration: number;
  /** 舞台預設："study-room" | "night-snow" | "void"（只有底色），預設 "void" */
  stage?: string;
  /** 像素層底色（CSS background） */
  background?: string;
  /** 主持人：pose 與站位（世界座標，y 預設地面線）。省略 = 用舞台存的預設站位（舞台編輯器擺的）；null = 不出現 */
  host?: { pose: string; x?: number; y?: number; flipX?: boolean; scale?: number; talk?: boolean } | null;
  /** 這個 scene 導航高亮第幾段；省略 = 不顯示導航 */
  navIndex?: number;
  /** false = 這個 scene 不顯示浮水印 */
  watermark?: boolean;
  /** 起始鏡頭，預設標準取景 shot()（1.5 倍、地面線在畫面 80%） */
  cameraInitial?: Partial<CameraState>;
  camera?: CameraMove[];
  ambience?: AmbienceInput[];
  subtitles?: { start: number; end: number; text: string; highlight?: Highlight[] }[];
  events?: TimelineEvent[];
  /** 會做動作的角色（骨架 + 動作庫），用 Act / ActorState 事件驅動；見 docs/actors.md */
  actors?: ActorDecl[];
  /** bloom / 暗角強度覆寫 */
  bloom?: number;
  vignette?: number;
};

/** scene.actors 的一個角色。id 寫 "host" = 取代 scene 的主持人（預設站在主持人的位置） */
export type ActorDecl = {
  id: string;
  /** 用哪一套骨架（assets/actors/<rig>/），預設 = id，id 不是骨架名時用 "host" */
  rig?: string;
  /** 站位：舞台物件名稱（底部中心）或 {x, y}（世界座標，y 是腳底） */
  anchor?: string | { x: number; y: number };
  view?: "front" | "side";
  facing?: "left" | "right";
  costume?: string;
  silhouette?: boolean;
  /** 壓暗：true = 0.5，或 0..1 */
  dim?: number | boolean;
  /** 整數倍 */
  scale?: number;
  /** false = 一開始不出現（之後用 ActorState visible:true 出場） */
  visible?: boolean;
  /** true = 嘴巴一直開合（說話） */
  talk?: boolean;
};

export type TimelineEvent = {
  /** 組件名稱，必須是註冊表裡的名字 */
  component: string;
  /** 觸發幀（相對 scene），或 "@高亮詞"、"@高亮詞+N" */
  start: number | string;
  /** 顯示多久（幀）；省略 = 到 scene 結束 */
  duration?: number;
  /** 覆寫預設圖層："world"（跟鏡頭走）| "hud"（固定在畫面） */
  layer?: "world" | "hud";
  /** 指名舞台上的物件（舞台編輯器裡的名稱，或「主持人」）：自動帶入 x / y；PropFx 必填 */
  target?: string;
  /** target 的定位點：物件的 center（預設）/ top（頭頂）/ bottom（底部） */
  anchor?: "center" | "top" | "bottom";
  /** 在定位點上再偏移（像素） */
  offset?: { x?: number; y?: number };
  props?: Record<string, unknown>;
};
