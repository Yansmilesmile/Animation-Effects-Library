import React from "react";
import character from "../generated/character.json";
import { ErrorBox } from "./ErrorBox";
import { Sprite, SpriteProps } from "./Sprite";

/**
 * Host —— 主持人「超級人機」（素材庫 Me_我的像素人物/pixel/，33 個姿勢）。
 * pose 用 character.json 的 name，例如 full_front、full_point_happy、half_desk_sleep、bust_front。
 * 其他參數同 Sprite（x / y / anchor / flipX / tint / glow…）。主持人可以兼任「你」。
 */
export type HostProps = Omit<SpriteProps, "asset"> & { pose?: string };

type Pose = { name: string; file: string; width: number; height: number };
const POSES = (character as { poses: Pose[] }).poses;
export const HOST_POSES = POSES.map((p) => p.name);

export const Host: React.FC<HostProps> = ({ pose = "full_front", ...rest }) => {
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
  return <Sprite asset={`Me_我的像素人物/${p.file}`} {...rest} />;
};
