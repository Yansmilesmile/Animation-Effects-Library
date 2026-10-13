import React from "react";
import { useCurrentFrame } from "remotion";
import { ErrorBox } from "../components/ErrorBox";
import { Sprite } from "../components/Sprite";
import { apply, buildRig, boneMatrices, rasterize, toPaths } from "./rig";
import { ActorEv, actorFrame, ActorFrame, ActorInit } from "./timeline";

/**
 * Actor —— 會做動作的角色（骨架 + 動作庫），由時間軸的 scene.actors 與 Act / ActorState 事件驅動。
 * 世界座標：(x, y) 是腳底中心。每幀在原生解析度柵格化成像素，再整數倍放大（scale）。
 */
const SILHOUETTE = "#0a0b16";

type Placed = { fr: ActorFrame; toWorld: (nx: number, ny: number) => { x: number; y: number }; slotPos: (slot: string) => { x: number; y: number } | null; flip: boolean };

const place = (init: ActorInit, fr: ActorFrame): Placed | null => {
  const rig = buildRig(init.rig, fr.view, fr.costume);
  if (!rig) return null;
  const mats = boneMatrices(rig, fr.pose);
  const [rx, ry] = rig.view.root;
  const flip = fr.facing === "left";
  const toWorld = (nx: number, ny: number) => ({ x: fr.x + ((flip ? 2 * rx - nx : nx) - rx) * fr.scale, y: fr.y + (ny - ry) * fr.scale });
  const slotPos = (slot: string) => {
    const s = rig.view.slots[slot];
    if (!s) return null;
    const m = mats.get(s.bone);
    if (!m) return null;
    const [nx, ny] = apply(m, s.at[0], s.at[1]);
    return toWorld(nx, ny);
  };
  return { fr, toWorld, slotPos, flip };
};

export const Actor: React.FC<{ init: ActorInit; events: ActorEv[] }> = ({ init, events }) => {
  const f = useCurrentFrame();
  const fr = actorFrame(init, events, f);
  const rig = buildRig(init.rig, fr.view, fr.costume);
  if (!rig) return <ErrorBox pixel x={fr.x} y={fr.y} message={`Actor ${init.id}：角色「${init.rig}」沒有視角「${fr.view}」`} />;
  const p = place(init, fr)!;
  const mats = boneMatrices(rig, fr.pose);

  // 表情、嘴型：頭部來源座標的像素替換
  const overrides = new Map<string, string>();
  for (const [x, y, c] of (fr.face && rig.view.faces[fr.face]) || []) overrides.set(`${x},${y}`, c);
  for (const [x, y, c] of rig.view.mouths[fr.mouth] ?? []) overrides.set(`${x},${y}`, c);

  const raw = rasterize(rig, mats, { show: fr.show, hide: fr.hide, overrides });
  const [rx, ry] = rig.view.root;
  const flipped = new Map<string, string>();
  for (const [k, c] of raw) {
    const [x, y] = k.split(",").map(Number);
    flipped.set(`${p.flip ? 2 * rx - 1 - x : x},${y}`, fr.silhouette ? SILHOUETTE : c);
  }
  const { paths, box } = toPaths(flipped);
  const s = fr.scale;

  const props = fr.props.map((pr, i) => {
    let pos: { x: number; y: number } | null;
    let anchor: "center" | "bottom" = "center";
    if (pr.kind === "dropped") {
      const then = place(init, actorFrame(init, events, pr.atFrame));
      pos = then?.slotPos(pr.slot) ?? null;
      if (pos && pr.toGround) {
        pos = { x: pos.x, y: then!.fr.y };
        anchor = "bottom";
      }
    } else pos = p.slotPos(pr.slot);
    if (!pos) return null;
    return (
      <Sprite
        key={i}
        asset={pr.asset}
        x={Math.round(pos.x + (p.flip ? -pr.dx : pr.dx) * s)}
        y={Math.round(pos.y + pr.dy * s)}
        anchor={anchor}
        scale={pr.scale * s}
        flipX={p.flip}
        tint={fr.silhouette ? SILHOUETTE : undefined}
        tintAmount={fr.silhouette ? 1 : undefined}
      />
    );
  });

  const root = fr.pose.root;
  const dust = fr.dust.map((d, i) => {
    const bx = d.x + (root ? (p.flip ? -root.dx : root.dx) * s : 0);
    const by = d.y + (root ? Math.round(root.dy) * s : 0);
    const spread = 3 + Math.floor(d.age / 3);
    const rise = Math.floor(d.age / 5);
    const size = d.age < 10 ? 2 : 1;
    const op = 1 - d.age / 18;
    return [-1, 1].flatMap((dir) =>
      [0, 1, 2].map((j) => (
        <div
          key={`${i}-${dir}-${j}`}
          style={{
            position: "absolute",
            left: Math.round(bx + dir * (spread + j * 3) * s) - size,
            top: Math.round(by - (rise + (j % 2)) * s) - size,
            width: size * s,
            height: size * s,
            background: j === 1 ? "#e8e0d2" : "#b9ae9c",
            opacity: op,
          }}
        />
      )),
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fr.opacity, filter: fr.dim ? `brightness(${1 - fr.dim})` : undefined }}>
      {box ? (
        <svg
          viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX + 1} ${box.maxY - box.minY + 1}`}
          width={(box.maxX - box.minX + 1) * s}
          height={(box.maxY - box.minY + 1) * s}
          shapeRendering="crispEdges"
          style={{ position: "absolute", left: Math.round(fr.x - rx * s) + box.minX * s, top: Math.round(fr.y - ry * s) + box.minY * s, display: "block", overflow: "visible" }}
        >
          {paths.map((q, i) => (
            <path key={i} fill={q.fill} d={q.d} />
          ))}
        </svg>
      ) : null}
      {props}
      {dust}
    </div>
  );
};
