import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL, LAYOUT } from "../../theme";
import { easeCamera } from "../../lib/util";
import { Host } from "../Host";
import { BITMAP, PixelBitmap } from "../PixelBitmap";
import { RingPulse } from "../emphasis/RingPulse";
import { popScale } from "../emphasis/common";

/**
 * GamePopup —— 片尾的遊戲化行動呼籲（詞典規則 13：片尾沒有一句是普通的請求）。放在 PixelStage 的 hud（畫面座標）。
 *
 * variant：
 * - "follow"（C29）：右側彈出邀請框：頭像 +「超級人機 邀請你組隊」+ 紅色「+ 關注」；
 *    手形游標移過去點擊（clickAt）→ 按鈕變綠「✓ 已關注」→（exitAt）縮小飛到右上角消失。
 *    compact = true 時只有按鈕（新片做法：直接在場景裡彈按鈕）。
 * - "input"（C30 / C46）：可選藍色標題（「✦ 天賦檢測」），問題逐字打出（每 typeEvery 幀一個字），
 *    輸入框閃游標；answer 有值時接著逐字打出答案；右邊紅色「送出」。
 * - "achievement"（B9）：頂部滑下深藍底金邊橫幅，左邊獎盃，右邊「成就解鎖」+ 成就名稱；exitAt 時往上收。
 * - "ending"（B9 小牌）：「解鎖結局｜最好的結局」小牌子，3 幀回彈。
 */
export type GamePopupProps =
  | { variant: "follow"; x?: number; y?: number; clickAt?: number; exitAt?: number; compact?: boolean; channel?: string }
  | { variant: "input"; title?: string; question: string; answer?: string; typeEvery?: number; x?: number; y?: number }
  | { variant: "achievement"; name: string; exitAt?: number; y?: number }
  | { variant: "ending"; text?: string; x?: number; y?: number };

const font = (size: number, c: string = color.white): React.CSSProperties => ({ fontFamily: FONT_PIXEL, fontSize: size, lineHeight: 1, color: c, whiteSpace: "nowrap" });
const box: React.CSSProperties = {
  background: "rgba(13,18,38,0.94)",
  border: `1px solid ${color.gold}`,
  boxShadow: `0 0 0 1px ${color.ink}, 0 3px 0 1px rgba(0,0,0,0.5)`,
};

const Cursor: React.FC<{ x: number; y: number; pressed?: boolean }> = ({ x, y, pressed }) => (
  <div style={{ position: "absolute", left: Math.round(x), top: Math.round(y), transform: `scale(${pressed ? 0.85 : 1})`, transformOrigin: "4px 0", filter: "drop-shadow(1px 1px 0 rgba(0,0,0,0.6))" }}>
    <PixelBitmap rows={[...BITMAP.cursor]} palette={{ k: color.ink, w: color.white }} />
  </div>
);

// ── follow ───────────────────────────────────────
const Follow: React.FC<Extract<GamePopupProps, { variant: "follow" }>> = ({
  x = 372,
  y = 96,
  clickAt = 26,
  exitAt = 48,
  compact = false,
  channel = "超級人機",
}) => {
  const f = useCurrentFrame();
  const enter = easeCamera(Math.min(1, f / 6));
  const exit = exitAt !== undefined && f >= exitAt ? easeCamera(Math.min(1, (f - exitAt) / 8)) : 0;
  if (exit >= 1) return null;
  const clicked = f >= clickAt;
  const btnW = 52;
  // 按鈕在框內的位置
  const bx = compact ? 0 : 54;
  const by = compact ? 0 : 32;
  // 游標：從右下角移到按鈕上，clickAt 時按下
  const ct = easeCamera(Math.min(1, Math.max(0, (f - 8) / (clickAt - 10))));
  const cursorX = 80 + (bx + btnW / 2 - 80) * ct;
  const cursorY = 70 + (by + 8 - 70) * ct;

  const button = (
    <div
      style={{
        position: "absolute",
        left: bx,
        top: by,
        width: btnW,
        padding: "3px 0",
        textAlign: "center",
        background: clicked ? "#2f9e57" : color.red,
        border: `1px solid ${clicked ? "#9df0b8" : color.goldLight}`,
        boxShadow: `0 0 0 1px ${color.ink}, 0 2px 0 1px rgba(0,0,0,0.5)`,
        transform: `scale(${clicked ? popScale(f - clickAt) : 1})`,
        ...font(12),
      }}
    >
      {clicked ? "✓ 已關注" : "+ 關注"}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x + (1 - enter) * 160 + exit * 60),
        top: Math.round(y - exit * 80),
        transform: `translate(-50%, -50%) scale(${1 - exit * 0.8})`,
        opacity: 1 - exit,
      }}
    >
      <div style={{ position: "relative", width: compact ? btnW : 112, height: compact ? 16 : 54, ...(compact ? {} : box) }}>
        {compact ? null : (
          <>
            {/* 頭像：主持人半身的上半部 */}
            <div style={{ position: "absolute", left: 4, top: 4, width: 44, height: 46, overflow: "hidden", background: color.navy, boxShadow: `inset 0 0 0 1px ${color.goldDark}` }}>
              <Host pose="bust_front" x={22} y={56} />
            </div>
            <div style={{ position: "absolute", left: 54, top: 5, ...font(12, color.goldLight) }}>{channel}</div>
            <div style={{ position: "absolute", left: 54, top: 19, fontFamily: FONT_PIXEL, fontSize: 12, lineHeight: 1, color: color.gray, whiteSpace: "nowrap", transform: "scale(0.75)", transformOrigin: "0 0" }}>
              邀請你組隊
            </div>
          </>
        )}
        {button}
        {f >= clickAt && f < clickAt + 15 ? (
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <RingPulse x={bx + btnW / 2} y={by + 8} radius={30} color="#9df0b8" flash={false} />
          </div>
        ) : null}
        {f >= 6 && f < (exitAt ?? 999) ? <Cursor x={cursorX} y={cursorY} pressed={f >= clickAt && f < clickAt + 3} /> : null}
      </div>
    </div>
  );
};

// ── input ────────────────────────────────────────
const Input: React.FC<Extract<GamePopupProps, { variant: "input" }>> = ({ title, question, answer, typeEvery = 2.5, x = LAYOUT.centerX, y = LAYOUT.focusY }) => {
  const f = useCurrentFrame();
  const q = Array.from(question);
  const a = Array.from(answer ?? "");
  const startQ = 4;
  const qn = Math.min(q.length, Math.max(0, Math.floor((f - startQ) / typeEvery) + 1));
  const startA = startQ + q.length * typeEvery + 10;
  const an = Math.min(a.length, Math.max(0, Math.floor((f - startA) / typeEvery) + 1));
  const blink = Math.floor(f / 8) % 2 === 0;
  const pop = popScale(f);
  const W = 260;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})` }}>
      <div style={{ ...box, width: W, padding: 8, boxSizing: "border-box" }}>
        {title ? (
          <div style={{ ...font(12, "#8fd0ff"), marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${color.navyLight}` }}>{title}</div>
        ) : null}
        <div style={{ ...font(12), whiteSpace: "normal", lineHeight: 1.3, minHeight: 16 }}>
          {q.slice(0, qn).join("")}
          {qn < q.length && blink ? <span style={{ color: color.goldLight }}>▌</span> : null}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <div style={{ flex: 1, height: 18, background: "#f2ecd9", boxShadow: `inset 0 0 0 1px ${color.ink}`, display: "flex", alignItems: "center", padding: "0 4px", ...font(12, color.ink) }}>
            {a.slice(0, an).join("")}
            {qn >= q.length && blink ? <span style={{ color: color.ink }}>_</span> : null}
          </div>
          <div style={{ width: 40, height: 18, background: color.red, border: `1px solid ${color.goldLight}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", ...font(12) }}>送出</div>
        </div>
      </div>
    </div>
  );
};

// ── achievement ──────────────────────────────────
const Achievement: React.FC<Extract<GamePopupProps, { variant: "achievement" }>> = ({ name, exitAt, y = 44 }) => {
  const f = useCurrentFrame();
  const enter = easeCamera(Math.min(1, f / 6));
  const exit = exitAt !== undefined && f >= exitAt ? easeCamera(Math.min(1, (f - exitAt) / 6)) : 0;
  if (exit >= 1) return null;
  const top = -40 + (y + 40) * enter - exit * (y + 40);
  return (
    <div style={{ position: "absolute", left: LAYOUT.centerX, top: Math.round(top), transform: "translate(-50%, -50%)" }}>
      <div style={{ ...box, background: color.navyDark, border: `2px solid ${color.gold}`, display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 8px" }}>
        <div style={{ position: "relative", width: 22, height: 20, filter: `drop-shadow(0 0 3px ${color.gold})` }}>
          <PixelBitmap rows={[...BITMAP.trophy]} palette={{ g: color.gold, w: "#FFF2B8", d: color.goldDark }} size={2} />
        </div>
        <div>
          <div style={{ ...font(12, color.gold), marginBottom: 3 }}>成就解鎖</div>
          <div style={font(24, color.white)}>{name}</div>
        </div>
      </div>
      {f < 15 ? (
        <div style={{ position: "absolute", left: 15, top: 20 }}>
          <RingPulse x={0} y={0} radius={24} color={color.goldLight} />
        </div>
      ) : null}
    </div>
  );
};

// ── ending plaque ────────────────────────────────
const Ending: React.FC<Extract<GamePopupProps, { variant: "ending" }>> = ({ text = "解鎖結局｜最好的結局", x = LAYOUT.centerX, y = 60 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${popScale(f)})` }}>
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 5, padding: "4px 8px" }}>
        <div style={{ position: "relative", width: 7, height: 7 }}>
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: color.goldLight }} />
        </div>
        <div style={font(12, color.goldLight)}>{text}</div>
        <div style={{ position: "relative", width: 7, height: 7 }}>
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: color.goldLight }} />
        </div>
      </div>
    </div>
  );
};

export const GamePopup: React.FC<GamePopupProps> = (p) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  switch (p.variant) {
    case "follow":
      return <Follow {...p} />;
    case "input":
      return <Input {...p} />;
    case "achievement":
      return <Achievement {...p} />;
    case "ending":
      return <Ending {...p} />;
  }
};

/**
 * NextTeaser —— C32 片尾預告框：右上角金色畫框，裡面只有「? ? ?」，每 40 幀掃過一道光。放在 hud。
 */
export const NextTeaser: React.FC<{ x?: number; y?: number; label?: string }> = ({ x = 418, y = 58, label = "下一期" }) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const sweep = (f % 40) / 40;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${popScale(f)})` }}>
      <div
        style={{
          position: "relative",
          width: 64,
          height: 44,
          background: "#0b0f20",
          border: `2px solid ${color.gold}`,
          outline: `1px solid ${color.goldDark}`,
          outlineOffset: 1,
          boxShadow: `0 0 0 3px ${color.ink}, 0 0 10px rgba(232,176,74,0.5)`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...font(12, color.goldLight),
          letterSpacing: 2,
        }}
      >
        ? ? ?
        <div
          style={{
            position: "absolute",
            top: -10,
            bottom: -10,
            width: 10,
            left: -20 + sweep * 110,
            background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))",
            transform: "skewX(-20deg)",
          }}
        />
      </div>
      {label ? <div style={{ ...font(12, color.gray), textAlign: "center", marginTop: 4, transform: "scale(0.75)" }}>{label}</div> : null}
    </div>
  );
};
