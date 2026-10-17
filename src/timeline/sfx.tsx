import React from "react";
import { Audio, Sequence } from "remotion";
import { SFX_LIST, SFX_NAMES, SFX_URLS } from "../generated/sfx";

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
