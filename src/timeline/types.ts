import type { AmbienceInput } from "../components/Ambience";
import type { CameraMove, CameraState } from "../components/Camera";
import type { Highlight } from "../components/Subtitle";
import type { Animate, CameraMove as CameraMove3D, OutlineSpec, Scene3D } from "../three/layer3d/types";

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
  /** 配音 / 音樂：src 是 public 下的路徑；startFrom = 從音檔第幾秒開始播（對應時間軸第 0 幀） */
  audio?: { src: string; startFrom?: number; volume?: number };
  /** 音效（事件的 "sfx"）預設音量，預設 0.5（配音是 1） */
  sfxVolume?: number;
  scenes: Scene[];
};

export type Scene = {
  id: string;
  duration: number;
  /** 舞台預設："study-room" | "night-snow" | "void"（只有底色），預設 "void" */
  stage?: string;
  /**
   * 3D 舞台模組 id（registerStage3D 註冊的）。有寫時 3D 場景逐幀渲染在最底層，
   * 用 S3State / S3Camera / S3Focus 事件控制，target / 角色站位可寫 "3d:<錨點>"。見 docs/stage3d.md
   */
  stage3d?: string;
  /**
   * 3D 層（<Layer3D>）：背景或單一主體，畫在數字 layer 的 2D 事件之間（見 docs/layer3d.md）。
   * scene = registerScene3D 註冊的名稱或場景 JSON；camera / animate 的 start 可寫 "@詞"。
   * target / 角色站位可寫 "3d:<點>"（場景的命名點，換成那一幀的畫面位置；預設不跟隨，layer3d.follow / follow 開啟後跟著 3D 鏡頭平移）。
   */
  layer3d?: Layer3DSceneDecl;
  /** 像素層底色（CSS background） */
  background?: string;
  /** 主持人：pose 與站位（世界座標，y 預設地面線）。省略 = 用舞台存的預設站位（舞台編輯器擺的）；null = 不出現 */
  host?: { pose: string; x?: number; y?: number; flipX?: boolean; scale?: number; talk?: boolean } | null;
  /** 這個 scene 導航高亮第幾段；省略 = 不顯示導航 */
  navIndex?: number;
  /** 導航從第幾幀滑入（數字或 "@詞"）；省略 = scene 開頭（前一個 scene 已顯示導航時不再滑入） */
  navAt?: number | string;
  /**
   * 換到下一個 scene 的 2D 轉場：這個 scene 的最後一幀凍住，蓋在下一個 scene 開頭的 duration 幀上往一側擦出。
   * type："wipe"（A16 直線擦除，整張卡滑出）| "blur"（A7 橫向動態模糊擦除，拖影 + 變暗）；direction 預設 wipe 往左、blur 往右；duration 預設 12。
   */
  transitionOut?: { type: "wipe" | "blur"; direction?: "left" | "right"; duration?: number };
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

type At = number | string;
export type Layer3DSceneDecl = {
  scene: string | Scene3D;
  /** 機位 id，或鏡頭運動（一段或多段）：{ start, duration, from, to, move: push|pull|pan|hold|cut, ease } */
  camera?: string | (Omit<CameraMove3D, "start"> & { start?: At }) | (Omit<CameraMove3D, "start"> & { start?: At })[];
  /** 參數補間：{ target: 組件 id | "environment", start, duration, ease, to: { 參數: 值 } } */
  animate?: (Omit<Animate, "start"> & { start?: At })[];
  pixelSize?: number;
  background?: string;
  /** 覆寫場景的像素描邊 { color, width, ids, inner, fog }；false = 不描（見 docs/layer3d.md） */
  outline?: OutlineSpec | false;
  /** 3D 層的排序位置（和事件的數字 layer 比），預設 0 */
  z?: number;
  /**
   * true = 掛在 "3d:<點>" 上的 2D（角色、world / 數字 layer 事件）跟著 3D 鏡頭平移（不縮放）；預設 false（只取擺位那一幀的位置）。
   * 單個角色 / 事件可用自己的 follow 覆寫。hud 不跟。見 docs/layer3d.md 第 7 節
   */
  follow?: boolean;
};

/** 跟隨 Layer3D 鏡頭：true / false 覆寫 scene 的 layer3d.follow；"3d:<點>" = 跟著這個點走（位置用 x / y 或 anchor 照寫） */
export type FollowDecl = boolean | string;

/** scene.actors 的一個角色。id 寫 "host" = 取代 scene 的主持人（預設站在主持人的位置） */
export type ActorDecl = {
  id: string;
  /** 用哪一套骨架（assets/actors/<rig>/），預設 = id，id 不是骨架名時用 "host" */
  rig?: string;
  /** 站位：舞台物件名稱（底部中心）、"3d:<錨點>"（跟著 3D 鏡頭走）或 {x, y}（世界座標，y 是腳底） */
  anchor?: string | { x: number; y: number };
  /** 站在 3D 錨點上時依深度縮放（鏡頭推近就變大），預設 true */
  depthScale?: boolean;
  /** 站在 3D 錨點上時角色的真實身高（3D 單位），預設 1.8；畫面大小 = 這個身高在該距離投影出來的大小 */
  height3d?: number;
  /** 被 3D 物件擋住："3d:<錨點>" 投影位置以下不畫（坐在書桌後：錨點寫桌面前緣）；Layer3D scene 要搭配 follow */
  clipBelow?: string;
  /** Layer3D scene：跟著 3D 鏡頭平移（見 FollowDecl）；anchor 是 "3d:<點>" 時跟那個點 */
  follow?: FollowDecl;
  /** 跟隨的參考幀（數字或 "@詞"，預設 0）：anchor、Act 的 from / to 寫的位置是這一幀的畫面位置 */
  followAt?: number | string;
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
  /** 吊牌上的字（換裝有吊牌 tag 時顯示，例如 "¥300"） */
  tagText?: string;
};

export type TimelineEvent = {
  /** 組件名稱，必須是註冊表裡的名字；省略 = 只播音效的事件（要有 sfx） */
  component: string;
  /** 在事件開始那一幀播放的 8-bit 音效：中文名（"金幣"）或檔名（"coin"），清單見 docs/timeline.md「音效」 */
  sfx?: string;
  /** 音效音量 0..1，預設 timeline.sfxVolume（0.5） */
  volume?: number;
  /** 觸發幀（相對 scene），或 "@高亮詞"、"@高亮詞+N" */
  start: number | string;
  /** 顯示多久（幀）；省略 = 到 scene 結束 */
  duration?: number;
  /**
   * 覆寫預設圖層："world"（跟鏡頭走）| "hud"（固定在畫面）| "back"（主持人 / 角色後面）；
   * 數字 = 和 3D 層（scene.layer3d，z 預設 0）排順序：比 3D 的 z 小畫在 3D 後面，大於等於畫在 3D 前面（但在 back / 角色 / world 之下）。
   * 數字層用世界座標，同數字依事件順序。
   */
  layer?: "world" | "hud" | "back" | number;
  /** 指名舞台上的物件（舞台編輯器裡的名稱、「主持人」、角色 id，或 "3d:<錨點>"）：自動帶入 x / y；PropFx 必填 */
  target?: string;
  /** target 的定位點：物件的 center（預設）/ top（頭頂）/ bottom（底部） */
  anchor?: "center" | "top" | "bottom";
  /** 在定位點上再偏移（像素） */
  offset?: { x?: number; y?: number };
  /** target 是 "3d:<錨點>" 時，依錨點深度縮放（道具類用；標籤、文字不要開） */
  depthScale?: boolean;
  /**
   * Layer3D scene：跟著 3D 鏡頭平移（覆寫 scene 的 layer3d.follow）。target 是 "3d:<點>" 或跟隨中的角色時跟它走；
   * 沒有 target（例如用 x / y 擺的前景遮罩）寫 "3d:<點>" 指定跟哪個點。參考幀 = 事件開始那一幀。hud 不能跟
   */
  follow?: FollowDecl;
  /** 跟隨時被 3D 物件擋住："3d:<點>" 投影位置以下不畫 */
  clipBelow?: string;
  /** 這個事件的名字：組件有可指名的部分（例如 PriceTower 的各層）時，其他事件可以用 target "<id>.<部分>" 指名；要寫在指名它的事件之前 */
  id?: string;
  /** 壓暗 / 模糊（A20 前景虛焦）：[{ at, dim: 0..1, blur: 像素, frames }]，at 是觸發後的相對幀或 "@詞"，frames 幀內漸變 */
  focus?: { at: number | string; dim?: number; blur?: number; frames?: number }[];
  props?: Record<string, unknown>;
};
