import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT_PIXEL } from "../../theme";
import { DLG, PixelFrame } from "./PixelFrame";

/**
 * 像素對話框 + 選項框（移植自 pixel_choice_box.html；詞典 C6 RPG 對話選單、C16 確認對話框）。放在 PixelStage 的 hud。
 *
 * 原稿是滑鼠 / 鍵盤互動，影片裡改成時間表：
 * - DialogBox：lines 依 at 逐字打出（每 typeEvery 幀一個字，約等於原稿 55ms），打完後右下角紅色箭頭上下跳。
 * - ChoiceMenu：picks [{at, index}] 決定游標停在哪一項（index = -1 表示都不選）；
 *   選中的那項 5 幀內偏移 + 陰影 + 文字放大 1.15，左邊金色三角游標閃爍；confirmAt 時選中項閃一下。
 * - ChoiceDialog：兩者連動，confirmAt 時對話框逐字打出選中項的 reply。
 */

const font = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_PIXEL, fontSize: size, lineHeight: 1.5, color, letterSpacing: 0.5 });

const typed = (text: string, f: number, start: number, every: number) => {
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor((f - start) / every) + 1));
  return { shown: chars.slice(0, n).join(""), done: f >= start && n >= chars.length };
};

// ── DialogBox ────────────────────────────────────
export type DialogLine = { at: number; text: string };
export type DialogBoxProps = {
  /** 說話的人，預設「超級人機」 */
  speaker?: string;
  /** 依 at 換句並逐字打出 */
  lines?: DialogLine[];
  /** 只有一句時可直接給 text（從第 typeStart 幀開始打） */
  text?: string;
  typeStart?: number;
  /** 每幾幀打一個字，預設 1.65（≈ 55ms） */
  typeEvery?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export const DialogBox: React.FC<DialogBoxProps> = ({ speaker = "超級人機", lines, text, typeStart = 0, typeEvery = 1.65, x = 22, y = 150, w = 300, h = 60 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const all = lines ?? (text !== undefined ? [{ at: typeStart, text }] : []);
  const cur = [...all].sort((a, b) => a.at - b.at).filter((l) => f >= l.at).pop();
  const t = cur ? typed(cur.text, f, cur.at, typeEvery) : { shown: "", done: false };
  const bob = Math.floor(f / 12) % 2;
  return (
    <PixelFrame x={x} y={y} w={w} h={h} style={{ padding: "6px 8px" }}>
      <div style={{ ...font(12, DLG.goldDark), lineHeight: 1, marginBottom: 3 }}>{speaker}</div>
      <div style={{ ...font(12, DLG.navy), whiteSpace: "pre-wrap" }}>{t.shown}</div>
      {t.done ? (
        <div
          style={{
            position: "absolute",
            right: 7,
            bottom: 5 - bob,
            width: 3,
            height: 2,
            background: DLG.red,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
        />
      ) : null}
    </PixelFrame>
  );
};

// ── ChoiceMenu ───────────────────────────────────
export type ChoiceOption = { label: string; reply?: string };
export type ChoicePick = { at: number; index: number };
export type ChoiceMenuProps = {
  options: ChoiceOption[];
  picks?: ChoicePick[];
  confirmAt?: number;
  x?: number;
  y?: number;
  w?: number;
};

const SEL_FRAMES = 5; // 原稿 transition .18s

/** 第 f 幀時，每個選項的選中程度 0..1（5 幀緩出，取消選中時反向） */
const selection = (f: number, n: number, picks: ChoicePick[]) => {
  const sorted = [...picks].sort((a, b) => a.at - b.at).filter((p) => p.at <= f);
  const p = Array.from({ length: n }, () => 0);
  // 每個選項最後一次「被選中」與「被取消」的時間
  const onAt = Array.from({ length: n }, () => -Infinity);
  const offAt = Array.from({ length: n }, () => -Infinity);
  let cur = -1;
  for (const pk of sorted) {
    if (pk.index === cur) continue;
    if (cur >= 0) offAt[cur] = pk.at;
    if (pk.index >= 0 && pk.index < n) onAt[pk.index] = pk.at;
    cur = pk.index;
  }
  const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  for (let j = 0; j < n; j++) {
    if (j === cur) p[j] = ease((f - onAt[j]) / SEL_FRAMES);
    else if (offAt[j] > -Infinity) p[j] = 1 - ease((f - offAt[j]) / SEL_FRAMES);
  }
  return { p, cur };
};

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
};

export const ChoiceMenu: React.FC<ChoiceMenuProps> = ({ options, picks = [], confirmAt, x = 338, y = 108, w = 118 }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const { p, cur } = selection(f, options.length, picks);
  const flash = confirmAt !== undefined && f >= confirmAt && f < confirmAt + 6 && Math.floor((f - confirmAt) / 2) % 2 === 0;
  const blinkOn = Math.floor(f / 12) % 2 === 0;
  return (
    <PixelFrame x={x} y={y} w={w} style={{ padding: "5px 8px 5px 5px", display: "flex", flexDirection: "column", gap: 3 }}>
      {options.map((o, j) => {
        const s = p[j];
        const isFlash = flash && j === cur;
        return (
          <div
            key={j}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              minHeight: 16,
              padding: "0 4px",
              boxSizing: "border-box",
              border: `1px solid ${mix(DLG.optBorder, DLG.navy, s)}`,
              background: isFlash ? DLG.gold : mix(DLG.optBg, DLG.navy, s),
              color: isFlash ? DLG.navy : mix(DLG.navy, DLG.selText, s),
              transform: `translate(${(2.5 * s).toFixed(2)}px, ${(-1 * s).toFixed(2)}px)`,
              boxShadow: s > 0 ? `inset 0 0 0 ${0.5 * s}px ${DLG.gold}, ${-1.5 * s}px ${1.5 * s}px 0 rgba(27,42,74,${0.35 * s})` : undefined,
              fontFamily: FONT_PIXEL,
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            <div
              style={{
                width: 3,
                height: 4,
                flex: "none",
                background: DLG.gold,
                clipPath: "polygon(0 0, 0 100%, 100% 50%)",
                opacity: j === cur && s > 0.5 && blinkOn ? 1 : 0,
              }}
            />
            <span style={{ display: "inline-block", transformOrigin: "left center", transform: `scale(${1 + 0.15 * s})`, whiteSpace: "nowrap" }}>{o.label}</span>
          </div>
        );
      })}
    </PixelFrame>
  );
};

// ── ChoiceDialog：對話框 + 選項框連動 ───────────────
export type ChoiceDialogProps = {
  speaker?: string;
  /** 一開始的提問 */
  text: string;
  options: ChoiceOption[];
  picks?: ChoicePick[];
  confirmAt?: number;
  typeEvery?: number;
  dialog?: Pick<DialogBoxProps, "x" | "y" | "w" | "h">;
  menu?: Pick<ChoiceMenuProps, "x" | "y" | "w">;
};

export const ChoiceDialog: React.FC<ChoiceDialogProps> = ({ speaker, text, options, picks = [], confirmAt, typeEvery, dialog, menu }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const lines: DialogLine[] = [{ at: 0, text }];
  if (confirmAt !== undefined) {
    const chosen = [...picks].sort((a, b) => a.at - b.at).filter((p) => p.at <= confirmAt).pop();
    const reply = chosen && chosen.index >= 0 ? options[chosen.index]?.reply : undefined;
    if (reply) lines.push({ at: confirmAt + 4, text: reply });
  }
  return (
    <>
      <DialogBox speaker={speaker} lines={lines} typeEvery={typeEvery} {...dialog} />
      <ChoiceMenu options={options} picks={picks} confirmAt={confirmAt} {...menu} />
    </>
  );
};
