import React from "react";
import { useCurrentFrame } from "remotion";
import rigs from "../generated/host-rigs.json";

/**
 * 說話動畫：
 * - HostRigSvg：主持人的 SVG 骨架（assets/host-svg → scripts/host-rig.mjs → host-rigs.json），
 *   嘴巴開合、握麥克風的手上下輕微動。Host 遇到有骨架的姿勢會自動改用它。
 * - ChatDots / chatBob：對話泡泡（expression_chat）的三個點輪流跳、泡泡上下浮動；舞台物件寫 "anim": "chat" 套用。
 */
type Path = { fill: string; d: string };
type Rig = { w: number; h: number; body: Path[]; hand: Path[]; backfill: Path[]; mouth: Path[][] };
const RIGS = rigs as Record<string, Rig>;
export const hasRig = (pose: string) => pose in RIGS;

// 嘴型序列（0 閉、1 半開、2 張開），每 3 幀換一格（10 格/秒），夾幾個停頓比較像在講話
const MOUTH = [1, 2, 1, 0, 2, 1, 2, 0, 1, 1, 2, 0, 0, 1, 2, 1, 2, 0, 1, 0, 0, 2, 1, 0];
export const mouthAt = (f: number) => MOUTH[Math.floor(f / 3) % MOUTH.length];
// 手（麥克風）：約每 0.8 秒抬起 1 像素一次
export const handUpAt = (f: number) => Math.sin((f / 24) * Math.PI * 2) > 0.35;

const Paths: React.FC<{ paths: Path[] }> = ({ paths }) => (
  <>
    {paths.map((p, i) => (
      <path key={i} fill={p.fill} d={p.d} />
    ))}
  </>
);

export const HostRigSvg: React.FC<{ pose: string; talk?: boolean }> = ({ pose, talk = true }) => {
  const f = useCurrentFrame();
  const r = RIGS[pose];
  const up = talk && handUpAt(f);
  const mouth = talk ? r.mouth[mouthAt(f)] : [];
  return (
    <svg viewBox={`0 0 ${r.w} ${r.h}`} width="100%" height="100%" shapeRendering="crispEdges" style={{ display: "block" }}>
      <Paths paths={r.body} />
      <Paths paths={mouth} />
      {up ? <Paths paths={r.backfill} /> : null}
      <g transform={up ? "translate(0 -1)" : undefined}>
        <Paths paths={r.hand} />
      </g>
    </svg>
  );
};

/** 對話泡泡上下浮動：回傳世界像素位移（0 或 -1） */
export const chatBobAt = (f: number) => (Math.sin((f / 40) * Math.PI * 2) > 0 ? -1 : 0);

/** expression_chat（9×9）的三個點輪流往上跳一格，像「正在輸入…」 */
export const ChatDots: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 5) % 4; // 0、1、2 = 第幾個點跳起，3 = 都不跳
  if (k === 3) return null;
  const x = 2 + k * 2;
  return (
    <svg viewBox="0 0 9 9" width="100%" height="100%" shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect x={x} y={3} width={1} height={1} fill="#ffffff" />
      <rect x={x} y={2} width={1} height={1} fill="#262b44" />
    </svg>
  );
};
