import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";

/**
 * BossBar —— F5 BOSS 血條＋NEW-2 名牌碎裂改寫。hud 圖層（畫面座標 480×270），(x, y) 是左上角；預設放在道具欄下面。
 *
 * - 第 0 幀從左邊滑進來（8 幀），血條滿格。
 * - breakAt：名稱裂成碎片往下掉（每個字錯開、旋轉、淡出＋紅色像素屑），之後名牌空白、紅框閃爍，直到下一次 rename。
 * - renames：[{ at, text }] 新名稱逐字打出（每字 3 幀），打完血條一格一格重新填滿。
 * - hits：[{ at, hp? }] 扣血（不寫 hp = 扣 1 格）：掉的那格先閃白、再掉下去，整條抖一下。
 * - exitAt：往左滑出。
 */
export type BossBarProps = {
  name: string;
  /** 名稱前的固定字，預設「BOSS・」 */
  prefix?: string;
  max?: number;
  hp?: number;
  breakAt?: number[];
  renames?: { at: number; text: string }[];
  hits?: { at: number; hp?: number }[];
  exitAt?: number;
  x?: number;
  y?: number;
  w?: number;
};

const SLIDE = 8;
const SHATTER = 14;
const TYPE_EVERY = 3;
const FILL_EVERY = 3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// 決定性的小亂數（字的散開方向、碎屑位置）
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const BossBar: React.FC<BossBarProps> = ({ name, prefix = "BOSS・", max = 3, hp = max, breakAt = [], renames = [], hits = [], exitAt, x = 8, y = 34, w = 150 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;

  // ── 依時間排出名牌狀態：最後一次 break / rename 決定現在顯示什麼 ──
  type Ev = { at: number; kind: "break" | "rename"; text?: string };
  const evs: Ev[] = [...breakAt.map((at) => ({ at, kind: "break" as const })), ...renames.map((r) => ({ at: r.at, kind: "rename" as const, text: r.text }))].sort((a, b) => a.at - b.at);
  let current = name;
  let broken: { text: string; at: number } | null = null;
  let typing: { text: string; at: number } | null = null;
  for (const e of evs) {
    if (e.at > f) break;
    if (e.kind === "break") {
      broken = { text: current, at: e.at };
      typing = null;
      current = "";
    } else {
      typing = { text: e.text ?? "", at: e.at };
      broken = null;
      current = e.text ?? "";
    }
  }

  // ── 血量：rename 打完字後重新填滿；hits 依序扣 ──
  let hpNow = hp;
  let fillFrom = -1; // 重新填滿開始的幀
  let lastHit: { at: number; lost: number[] } | null = null;
  const timeline = [
    ...renames.map((r) => ({ at: r.at + [...r.text].length * TYPE_EVERY + 2, kind: "fill" as const })),
    ...hits.map((h) => ({ at: h.at, kind: "hit" as const, hp: h.hp })),
  ].sort((a, b) => a.at - b.at);
  for (const e of timeline) {
    if (e.at > f) break;
    if (e.kind === "fill") {
      hpNow = max;
      fillFrom = e.at;
      lastHit = null;
    } else {
      const next = Math.max(0, e.hp ?? hpNow - 1);
      lastHit = { at: e.at, lost: Array.from({ length: Math.max(0, hpNow - next) }, (_, k) => next + k) };
      hpNow = next;
    }
  }
  const sinceHit = lastHit ? f - lastHit.at : 99;
  const shake = sinceHit < 8 ? Math.round(Math.sin(sinceHit * 2.6) * 2) : 0;

  // ── 進出場 ──
  const enter = clamp01(f / SLIDE);
  const exit = exitAt !== undefined ? clamp01((f - exitAt) / SLIDE) : 0;
  if (exit >= 1) return null;
  const dx = Math.round(-(w + x + 4) * ((1 - enter) * (1 - enter) + exit * exit));

  const blank = broken !== null;
  const blankBlink = blank && f - broken!.at >= SHATTER && Math.floor((f - broken!.at) / 3) % 2 === 0;
  const shown = typing ? [...typing.text].slice(0, Math.floor((f - typing.at) / TYPE_EVERY) + 1).join("") : blank ? "" : current;
  const pad = 3;
  const segGap = 2;
  const barW = w - pad * 2;
  const segW = (barW - segGap * (max - 1)) / max;

  return (
    <div style={{ position: "absolute", left: x + dx + shake, top: y, width: w, fontFamily: FONT_PIXEL, lineHeight: 1 }}>
      <div
        style={{
          position: "relative",
          height: 12 + 2 + 6 + pad * 2,
          background: "rgba(10,14,28,0.86)",
          border: `1px solid ${blankBlink ? color.redLight : color.red}`,
          boxShadow: `0 0 0 1px ${color.ink}${blankBlink ? `, 0 0 6px ${color.red}` : ""}`,
          boxSizing: "border-box",
        }}
      >
        {/* 名牌：BOSS・＋名稱＋右邊 N/N */}
        <div style={{ position: "absolute", left: pad, top: pad - 1, fontSize: 12, color: color.redLight, whiteSpace: "nowrap" }}>
          {prefix}
          <span style={{ color: color.white }}>{shown}</span>
          {typing && f - typing.at < [...typing.text].length * TYPE_EVERY && Math.floor(f / 4) % 2 === 0 ? <span style={{ color: color.goldLight }}>▌</span> : null}
        </div>
        <div style={{ position: "absolute", right: pad, top: pad - 1, fontSize: 12, color: hpNow === 0 ? color.redLight : color.goldLight }}>
          {hpNow}/{max}
        </div>
        {/* 碎裂中的舊名稱：每個字往下掉、旋轉、淡出 */}
        {broken && f - broken.at < SHATTER + 10
          ? [...broken.text].map((ch, i) => {
              const t = Math.max(0, f - broken!.at - i * 1.2);
              const k = t / (SHATTER + 6);
              const r = hash(i + broken!.at);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: pad + 36 + i * 12 + Math.round((r - 0.5) * 16 * k),
                    top: pad - 1 + Math.round(t * t * 0.18),
                    fontSize: 12,
                    color: t < 2 ? color.redLight : color.white,
                    opacity: clamp01(1 - k),
                    transform: `rotate(${Math.round((r - 0.5) * 120 * k)}deg)`,
                  }}
                >
                  {ch}
                </div>
              );
            })
          : null}
        {broken && f - broken.at < SHATTER + 6
          ? Array.from({ length: 14 }, (_, i) => {
              const t = f - broken!.at;
              const r1 = hash(i * 3.1 + 1);
              const r2 = hash(i * 7.7 + 2);
              return (
                <div
                  key={`p${i}`}
                  style={{
                    position: "absolute",
                    left: pad + 36 + r1 * (w - 60) + (r2 - 0.5) * t * 2,
                    top: pad + 4 + t * t * 0.25 * (0.6 + r2),
                    width: 2,
                    height: 2,
                    background: i % 3 ? color.red : color.goldLight,
                    opacity: clamp01(1 - t / (SHATTER + 6)),
                  }}
                />
              );
            })
          : null}
        {/* 血條：max 格 */}
        {Array.from({ length: max }, (_, i) => {
          const filled = i < hpNow && (fillFrom < 0 || f - fillFrom >= i * FILL_EVERY);
          const lostNow = lastHit?.lost.includes(i) && sinceHit < 16;
          const flash = lostNow && sinceHit < 4;
          const fall = lostNow && sinceHit >= 4 ? (sinceHit - 4) * (sinceHit - 4) * 0.4 : 0;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: pad + i * (segW + segGap), top: pad + 14, width: segW, height: 6, background: "#2a1418", boxShadow: `inset 0 0 0 1px ${color.redDark}` }} />
              {filled || lostNow ? (
                <div
                  style={{
                    position: "absolute",
                    left: pad + i * (segW + segGap),
                    top: pad + 14 + fall,
                    width: segW,
                    height: 6,
                    background: flash ? color.white : color.red,
                    boxShadow: flash ? `0 0 6px ${color.white}` : `inset 0 1px 0 ${color.redLight}, inset 0 -1px 0 ${color.redDark}`,
                    opacity: lostNow ? clamp01(1 - (sinceHit - 4) / 12) : 1,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
