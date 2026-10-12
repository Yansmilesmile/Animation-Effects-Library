import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { color, PIXEL } from "../theme";
import { px, seeded } from "../lib/util";
import { ErrorBox } from "./ErrorBox";

/**
 * Ambience —— G 類氛圍層：一直在動、跟文案無關，讓任何畫面都不完全靜止。
 * 放在 PixelStage / Camera 裡，座標是像素層座標。可疊加多層，每層單獨開關。
 * 粒子用固定 seed 的亂數，每次渲染結果一樣；粒子座標取整數，對齊像素格。
 *
 * 寫法：layers={["dust", { type: "lamp", x: 320, y: 170 }, { type: "snow", count: 80 }]}
 */
type Area = { x?: number; y?: number; w?: number; h?: number };

export type AmbienceLayer =
  /** 漂浮灰塵：緩慢飄移、明暗閃爍 */
  | ({ type: "dust"; count?: number; color?: string; seed?: number } & Area)
  /** 飄雪：往下飄、左右搖擺 */
  | ({ type: "snow"; count?: number; speed?: number; seed?: number } & Area)
  /** 燈光明暗呼吸：圓形光暈 + 可選往下的光錐 */
  | { type: "lamp"; x: number; y: number; radius?: number; color?: string; cone?: number; period?: number }
  /** 星星閃爍 */
  | ({ type: "stars"; count?: number; seed?: number } & Area)
  /** 聚光燈光束 + 光束裡的浮塵 */
  | { type: "beam"; x: number; width?: number; top?: number; bottom?: number; color?: string; seed?: number }
  /** 金色碎屑飄落（寶箱、獎勵周圍） */
  | ({ type: "confetti"; count?: number; seed?: number } & Area)
  /** 睡覺時頭上飄 Z 字 */
  | { type: "zzz"; x: number; y: number; period?: number };

export type AmbienceInput = AmbienceLayer | AmbienceLayer["type"];

const area = (a: Area) => ({ x: a.x ?? 0, y: a.y ?? 0, w: a.w ?? PIXEL.width, h: a.h ?? PIXEL.height });

const Dot: React.FC<{ x: number; y: number; s?: number; c: string; o: number }> = ({ x, y, s = 1, c, o }) => (
  <div style={{ position: "absolute", left: px(x), top: px(y), width: s, height: s, background: c, opacity: o }} />
);

const useParticles = (n: number, seed: number) =>
  useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: n }, () => ({ a: r(), b: r(), c: r(), d: r(), e: r() }));
  }, [n, seed]);

const Dust: React.FC<Extract<AmbienceLayer, { type: "dust" }>> = (p) => {
  const f = useCurrentFrame();
  const A = area(p);
  const parts = useParticles(p.count ?? 40, p.seed ?? 1);
  const c = p.color ?? "#F3E3B5";
  return (
    <>
      {parts.map((q, i) => {
        const x = A.x + ((q.a * A.w + f * (q.c - 0.5) * 0.25 + Math.sin(f / 40 + q.d * 6) * 3) % A.w + A.w) % A.w;
        const y = A.y + ((q.b * A.h - f * (0.05 + q.e * 0.12)) % A.h + A.h) % A.h;
        const o = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f / (12 + q.d * 20) + q.a * 10));
        return <Dot key={i} x={x} y={y} s={q.e > 0.85 ? 2 : 1} c={c} o={o} />;
      })}
    </>
  );
};

const Snow: React.FC<Extract<AmbienceLayer, { type: "snow" }>> = (p) => {
  const f = useCurrentFrame();
  const A = area(p);
  const parts = useParticles(p.count ?? 70, p.seed ?? 2);
  const v = p.speed ?? 1;
  return (
    <>
      {parts.map((q, i) => {
        const speed = (0.35 + q.c * 0.6) * v;
        const y = A.y + ((q.b * A.h + f * speed) % A.h);
        const x = A.x + ((q.a * A.w + Math.sin(f / (25 + q.d * 30) + q.e * 6) * 4) % A.w + A.w) % A.w;
        return <Dot key={i} x={x} y={y} s={q.c > 0.7 ? 2 : 1} c="#FFFFFF" o={0.55 + q.e * 0.45} />;
      })}
    </>
  );
};

const Lamp: React.FC<Extract<AmbienceLayer, { type: "lamp" }>> = (p) => {
  const f = useCurrentFrame();
  const c = p.color ?? color.goldLight;
  const r = p.radius ?? 60;
  const period = p.period ?? 90;
  const breath = 0.5 + 0.5 * Math.sin((f / period) * Math.PI * 2);
  const o = 0.35 + 0.2 * breath;
  const cone = p.cone ?? 0;
  return (
    <>
      {cone > 0 ? (
        <div
          style={{
            position: "absolute",
            left: p.x - cone,
            top: p.y,
            width: cone * 2,
            height: cone * 1.6,
            clipPath: `polygon(${50 - 8}% 0, ${50 + 8}% 0, 100% 100%, 0 100%)`,
            background: `linear-gradient(to bottom, ${c}, rgba(0,0,0,0))`,
            opacity: o * 0.55,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: p.x - r,
          top: p.y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c} 0%, rgba(0,0,0,0) 70%)`,
          opacity: o,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
};

const Stars: React.FC<Extract<AmbienceLayer, { type: "stars" }>> = (p) => {
  const f = useCurrentFrame();
  const A = area(p);
  const parts = useParticles(p.count ?? 30, p.seed ?? 3);
  return (
    <>
      {parts.map((q, i) => {
        const x = px(A.x + q.a * A.w);
        const y = px(A.y + q.b * A.h);
        const tw = 0.5 + 0.5 * Math.sin(f / (8 + q.c * 18) + q.d * 20);
        const o = 0.2 + 0.8 * tw;
        if (q.e > 0.85) {
          // 十字亮星
          return (
            <React.Fragment key={i}>
              <Dot x={x} y={y} c="#FFFFFF" o={o} />
              <Dot x={x - 1} y={y} c="#CFE0FF" o={o * 0.6} />
              <Dot x={x + 1} y={y} c="#CFE0FF" o={o * 0.6} />
              <Dot x={x} y={y - 1} c="#CFE0FF" o={o * 0.6} />
              <Dot x={x} y={y + 1} c="#CFE0FF" o={o * 0.6} />
            </React.Fragment>
          );
        }
        return <Dot key={i} x={x} y={y} c="#DCE6FF" o={o} />;
      })}
    </>
  );
};

const Beam: React.FC<Extract<AmbienceLayer, { type: "beam" }>> = (p) => {
  const f = useCurrentFrame();
  const w = p.width ?? 70;
  const top = p.top ?? 0;
  const bottom = p.bottom ?? PIXEL.height;
  const c = p.color ?? "#FFF1C9";
  const o = 0.32 + 0.06 * Math.sin(f / 20);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: p.x - w,
          top,
          width: w * 2,
          height: bottom - top,
          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
          background: `linear-gradient(to bottom, ${c}, rgba(255,255,255,0.15))`,
          opacity: o,
          mixBlendMode: "screen",
        }}
      />
      <Dust type="dust" x={p.x - w * 0.6} y={top} w={w * 1.2} h={bottom - top} count={26} color="#FFFFFF" seed={p.seed ?? 4} />
    </>
  );
};

const Confetti: React.FC<Extract<AmbienceLayer, { type: "confetti" }>> = (p) => {
  const f = useCurrentFrame();
  const A = area(p);
  const parts = useParticles(p.count ?? 36, p.seed ?? 5);
  const palette = [color.gold, color.goldLight, "#FFF4C2", color.goldDark];
  return (
    <>
      {parts.map((q, i) => {
        const y = A.y + ((q.b * A.h + f * (0.4 + q.c * 0.5)) % A.h);
        const x = A.x + q.a * A.w + Math.sin(f / (15 + q.d * 15) + q.e * 6) * 5;
        // 翻轉閃爍：寬高交替
        const flip = Math.floor(f / (4 + Math.floor(q.d * 4)) + q.e * 10) % 3;
        const w = flip === 0 ? 2 : 1;
        const h = flip === 1 ? 2 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px(x),
              top: px(y),
              width: w,
              height: h,
              background: palette[i % palette.length],
              opacity: flip === 2 ? 0.5 : 1,
            }}
          />
        );
      })}
    </>
  );
};

// 5×5 像素 Z
const Z_BITMAP = ["11111", "00010", "00100", "01000", "11111"];
const ZGlyph: React.FC<{ x: number; y: number; s: number; o: number }> = ({ x, y, s, o }) => (
  <div style={{ position: "absolute", left: px(x), top: px(y), opacity: o }}>
    {Z_BITMAP.flatMap((row, j) =>
      row.split("").map((b, i) =>
        b === "1" ? (
          <div
            key={`${i}-${j}`}
            style={{ position: "absolute", left: i * s, top: j * s, width: s, height: s, background: "#FFFFFF" }}
          />
        ) : null,
      ),
    )}
  </div>
);

const Zzz: React.FC<Extract<AmbienceLayer, { type: "zzz" }>> = (p) => {
  const f = useCurrentFrame();
  const period = p.period ?? 60;
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = ((f + (k * period) / 3) % period) / period;
        const s = k === 0 ? 1 : k === 1 ? 1 : 2;
        const o = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
        return <ZGlyph key={k} x={p.x + t * 14 + Math.sin(t * 6) * 2} y={p.y - t * 22} s={s} o={o} />;
      })}
    </>
  );
};

const RENDER: Record<AmbienceLayer["type"], React.FC<any>> = {
  dust: Dust,
  snow: Snow,
  lamp: Lamp,
  stars: Stars,
  beam: Beam,
  confetti: Confetti,
  zzz: Zzz,
};

export const AMBIENCE_TYPES = Object.keys(RENDER);

export const Ambience: React.FC<{ layers: AmbienceInput[] }> = ({ layers }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {layers.map((l, i) => {
      const layer = (typeof l === "string" ? { type: l } : l) as AmbienceLayer;
      const C = RENDER[layer.type];
      if (!C) return <ErrorBox key={i} pixel message={`Ambience：不支援的類型「${layer.type}」\n可用：${AMBIENCE_TYPES.join("、")}`} />;
      if ((layer.type === "lamp" || layer.type === "zzz" || layer.type === "beam") && (layer as any).x === undefined) {
        return <ErrorBox key={i} pixel message={`Ambience：「${layer.type}」需要 x${layer.type === "beam" ? "" : "、y"} 參數`} />;
      }
      return <C key={i} {...layer} />;
    })}
  </div>
);
