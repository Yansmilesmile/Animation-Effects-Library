import React from "react";
import character from "../generated/character.json";
import { ErrorBox } from "./ErrorBox";
import { Sprite, SpriteProps } from "./Sprite";
import { hasRig, HostRigSvg } from "./Talk";

/**
 * Host —— 主持人「超級人機」（public/svgAll/svg_host/svg/ 的像素 SVG；還沒有 SVG 的姿勢暫用 assets/host/legacy/ 的 PNG）。
 * pose 用 assets/host/poses.json 的 name，例如 full_front、full_point_happy、half_desk_sleep、bust_front。
 * 其他參數同 Sprite（x / y / anchor / flipX / tint / glow…）。主持人可以兼任「你」。
 */
export type HostProps = Omit<SpriteProps, "asset"> & {
  pose?: string;
  /** 有 SVG 說話骨架的姿勢（目前 full_mic_hold）：true = 嘴巴開合、握麥克風的手輕微上下動（預設）；false = 靜止 */
  talk?: boolean;
};

type Pose = { name: string; file: string; width: number; height: number };
const POSES = (character as { poses: Pose[] }).poses;
export const HOST_POSES = POSES.map((p) => p.name);
/** 姿勢的素材 path（給 SmokePop、ProfileCard 等直接吃 asset 的組件用） */
export const hostAsset = (pose: string) => POSES.find((q) => q.name === pose)?.file ?? "";

export const Host: React.FC<HostProps> = ({ pose = "full_front", talk = true, ...rest }) => {
  const p = POSES.find((q) => q.name === pose);
  if (!p) {
    return (
      <ErrorBox
        pixel
        x={rest.x}
        y={rest.y}
        message={`Host：沒有這個姿勢「${pose}」\n可用：${HOST_POSES.join("、")}`}
      />
    );
  }
  // 有 SVG 骨架的姿勢改畫 SVG（同尺寸，位置 / 倍數 / 翻轉 / 發光 / 染色照舊由 Sprite 處理）
  if (hasRig(pose)) return <Sprite asset={p.file} {...rest} hideImage overlay={<HostRigSvg pose={pose} talk={talk} />} />;
  return <Sprite asset={p.file} {...rest} />;
};
