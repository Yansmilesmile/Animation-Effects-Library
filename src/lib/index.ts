/**
 * superbot-motion 組件庫入口：影片專案 `import { … } from "superbot-motion"`。
 * （src/index.ts 是引擎自己的 Remotion 展示入口，和這裡無關。）
 *
 * 素材：影片專案用 `npx superbot-assets` 把用到的素材複製到自己的 public/lib/、產生 asset-meta.json，
 * 再用 <AssetProvider meta={…}> 包住畫面（TimelinePlayer 給 assetMeta 即可）。
 * 組件庫自帶的東西（主持人 / 角色骨架、動作庫、字型、@engine/… 圖）打包在庫裡，不必複製。
 * 打包設定：remotion.config.ts 用 `superbot-motion/webpack` 的 withSuperbot，讓 react / remotion 只有一份。
 */

// 素材、字型、主題
export { AssetProvider, useAssets } from "./assets";
export type { AssetMeta, AssetProviderProps, AssetSource } from "./assets";
export { ensureFonts } from "../fonts";
export * from "../theme";
export { seeded } from "./util";

// 時間軸播放器
export { TimelinePlayer, timelinePlayerMetadata } from "./TimelinePlayer";
export type { TimelinePlayerProps } from "./TimelinePlayer";
export { TimelineComposition, calculateTimelineMetadata, timelineDuration } from "../timeline/TimelineComposition";
export type { Timeline, Scene, TimelineEvent, ActorDecl } from "../timeline/types";
export { REGISTRY, registerComponents, validateEvent } from "../timeline/registry";
export { STAGES } from "../timeline/stages";

// 基礎：舞台、鏡頭、素材圖、字幕
export { PixelStage, Layer } from "../components/PixelStage";
export type { PixelStageProps } from "../components/PixelStage";
export { Camera, CAMERA_HOME, CAMERA_WIDE, shot } from "../components/Camera";
export type { CameraState, CameraMove } from "../components/Camera";
export { Sprite, PLAY_MODES } from "../components/Sprite";
export type { SpriteProps } from "../components/Sprite";
export { PixelBitmap } from "../components/PixelBitmap";
export { Subtitle, Subtitles } from "../components/Subtitle";
export type { SubtitleLine, Highlight } from "../components/Subtitle";
export { Ambience, AMBIENCE_TYPES } from "../components/Ambience";
export { TopNav } from "../components/TopNav";
export { Watermark } from "../components/Watermark";
export { ErrorBox } from "../components/ErrorBox";

// 角色：主持人（靜態姿勢）、骨架角色（host / colleague / leijun …，做動作庫的動作）
export { Host, HOST_POSES, hostAsset } from "../components/Host";
export type { HostProps } from "../components/Host";
export { Actor } from "../actor/Actor";
export { ACTORS } from "../actor/rig";
export { ACTIONS, ACTION_NAMES } from "../actor/actions";
export type { ActorInit, ActorEv } from "../actor/timeline";

// 2D 組件（分類同 docs/components.md）
export * from "../components/emphasis";
export * from "../components/data";
export * from "../components/dialog";
export * from "../components/panels";
export * from "../components/props";
export * from "../components/structure";
export * from "../components/ending";
