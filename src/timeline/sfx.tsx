import React from "react";
import { Audio, Sequence } from "remotion";
import { AMBIENT_LIST, AMBIENT_NAMES, AMBIENT_URLS, SFX_LIST, SFX_NAMES, SFX_URLS } from "../generated/sfx";

/** 音效預設音量（配音是 1；事件的 volume 或 timeline.sfxVolume 可覆寫） */
export const SFX_VOLUME = 0.5;

/** 音效名（中文名、簡體寫法、檔名，可帶 .wav）→ 網址；找不到回傳 error */
export const resolveSfx = (name: unknown): { url?: string; error?: string } => {
  if (typeof name !== "string") return { error: "sfx 必須是字串（音效名稱）" };
  const file = SFX_NAMES[name] ?? name.replace(/\.wav$/i, "");
  const url = SFX_URLS[file];
  return url ? { url } : { error: `音效「${name}」不存在，可用：${SFX_LIST.join("、")}` };
};

/** 在 scene 的第 at 幀播放一次音效 */
export const SfxAt: React.FC<{ url: string; at: number; volume: number }> = ({ url, at, volume }) => (
  <Sequence from={at} name="sfx" layout="none">
    <Audio src={url} volume={volume} />
  </Sequence>
);

/** 環境音預設音量（比音效小很多；事件的 volume 或 timeline.ambientVolume 可覆寫） */
export const AMBIENT_VOLUME = 0.15;
/** 環境音預設淡入 / 淡出（幀） */
export const AMBIENT_FADE = 15;

/** 環境音名（中文名、別名、檔名，可帶 amb_ / .wav）→ { file, url }；找不到回傳 error */
export const resolveAmbient = (name: unknown): { file?: string; url?: string; error?: string } => {
  if (typeof name !== "string") return { error: "ambientSound 必須是字串（環境音名稱）" };
  const file = AMBIENT_NAMES[name] ?? name.replace(/\.wav$/i, "").replace(/^amb_/, "");
  const url = AMBIENT_URLS[file];
  return url ? { file, url } : { error: `環境音「${name}」不存在，可用：${AMBIENT_LIST.join("、")}` };
};

/** 一段循環環境音（時間軸絕對幀）：頭尾線性淡入淡出 */
export const AmbientLoop: React.FC<{ url: string; from: number; frames: number; volume: number; fadeIn: number; fadeOut: number }> = ({ url, from, frames, volume, fadeIn, fadeOut }) => (
  <Sequence from={from} durationInFrames={frames} name="ambient" layout="none">
    <Audio src={url} loop volume={(f) => volume * Math.max(0, Math.min(1, fadeIn > 0 ? f / fadeIn : 1, fadeOut > 0 ? (frames - f) / fadeOut : 1))} />
  </Sequence>
);