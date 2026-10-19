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
 * - "ending"（B9 小牌）：「解鎖結局｜最好的結局」小牌子，3 幀回彈；exitAt 時往上淡出。
 */
export type GamePopupProps =
  | { variant: "follow"; x?: number; y?: number; clickAt?: number; exitAt?: number; compact?: boolean; channel?: string }
  | { variant: "input"; title?: string; question: string; answer?: string; typeEvery?: number; x?: number; y?: number; scale?: number }
  | { variant: "achievement"; name: string; exitAt?: number; y?: number }
  | { variant: "ending"; text?: string; x?: number; y?: number; exitAt?: number };

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
// 版面（框內座標）：頭像 52×52、名字 24px、副標 12px、按鈕 84×22（左右留白，「✓ 已關注」不會擠到邊框）
const F = { W: 180, H: 84, avatar: 56, textX: 70, btn: { x: 70, y: 54, w: 92, h: 22 } } as const;

const Follow: React.FC<Extract<GamePopupProps, { variant: "follow" }>> = ({
  x = 360,
  y = 100,
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
  const b = compact ? { x: 0, y: 0, w: F.btn.w, h: F.btn.h } : F.btn;
  const W = compact ? b.w : F.W;
  const H = compact ? b.h : F.H;
  // 游標：從右下角移到按鈕中央，clickAt 時按下
  const ct = easeCamera(Math.min(1, Math.max(0, (f - 8) / (clickAt - 10))));
  const tx = b.x + b.w / 2;
  const ty = b.y + b.h / 2;
  const cursorX = W + 24 + (tx - W - 24) * ct;
  const cursorY = H + 30 + (ty - H - 30) * ct;

  const button = (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        boxSizing: "border-box",
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
        left: Math.round(x + (1 - enter) * 200 + exit * 60),
        top: Math.round(y - exit * 80),
        transform: `translate(-50%, -50%) scale(${1 - exit * 0.8})`,
        opacity: 1 - exit,
      }}
    >
      <div style={{ position: "relative", width: W, height: H, boxSizing: "border-box", ...(compact ? {} : box) }}>
        {compact ? null : (
          <>
            {/* 頭像：主持人半身像 */}
            <div style={{ position: "absolute", left: 10, top: 12, width: F.avatar - 4, height: F.avatar, overflow: "hidden", background: color.navy, boxShadow: `inset 0 0 0 1px ${color.goldDark}` }}>
              <Host pose="bust_front" x={(F.avatar - 4) / 2} y={F.avatar + 2} />
            </div>
            <div style={{ position: "absolute", left: F.textX, top: 12, ...font(24, color.goldLight) }}>{channel}</div>
            <div style={{ position: "absolute", left: F.textX, top: 38, ...font(12, color.gray) }}>邀請你組隊</div>
          </>
        )}
        {button}
        {f >= clickAt && f < clickAt + 15 ? (
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <RingPulse x={tx} y={ty} radius={36} color="#9df0b8" flash={false} />
          </div>
        ) : null}
        {f >= 6 && f < (exitAt ?? 999) ? <Cursor x={cursorX} y={cursorY} pressed={f >= clickAt && f < clickAt + 3} /> : null}
      </div>
    </div>
  );
};

// ── input ────────────────────────────────────────
const Input: React.FC<Extract<GamePopupProps, { variant: "input" }>> = ({ title, question, answer, typeEvery = 2.5, x = LAYOUT.centerX, y = LAYOUT.focusY, scale = 1 }) => {
  const f = useCurrentFrame();
  const q = Array.from(question);
  const a = Array.from(answer ?? "");
  const startQ = 4;
  const qn = Math.min(q.length, Math.max(0, Math.floor((f - startQ) / typeEvery) + 1));
  const startA = startQ + q.length * typeEvery + 10;
  const an = Math.min(a.length, Math.max(0, Math.floor((f - startA) / typeEvery) + 1));
  const blink = Math.floor(f / 8) % 2 === 0;
  const pop = popScale(f);
  const W = 340;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop * scale})` }}>
      <div style={{ ...box, width: W, padding: "12px 14px", boxSizing: "border-box" }}>
        {title ? (
          <div style={{ ...font(12, "#8fd0ff"), marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${color.navyLight}` }}>{title}</div>
        ) : null}
        <div style={{ ...font(24), whiteSpace: "normal", lineHeight: 1.25, minHeight: 30 }}>
          {q.slice(0, qn).join("")}
          {qn < q.length && blink ? <span style={{ color: color.goldLight }}>▌</span> : null}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, height: 32, background: "#f2ecd9", boxShadow: `inset 0 0 0 1px ${color.ink}`, display: "flex", alignItems: "center", padding: "0 8px", ...font(24, color.ink) }}>
            {a.slice(0, an).join("")}
            {qn >= q.length && blink ? <span style={{ color: color.ink }}>_</span> : null}
          </div>
          <div style={{ padding: "0 12px", height: 32, background: color.red, border: `1px solid ${color.goldLight}`, boxShadow: `0 0 0 1px ${color.ink}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", ...font(12) }}>
            送出
          </div>
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
  const top = -50 + (y + 50) * enter - exit * (y + 50);
  return (
    <div style={{ position: "absolute", left: LAYOUT.centerX, top: Math.round(top), transform: "translate(-50%, -50%)" }}>
      <div style={{ ...box, background: color.navyDark, border: `2px solid ${color.gold}`, display: "flex", alignItems: "center", gap: 14, padding: "8px 22px 8px 14px" }}>
        <div style={{ position: "relative", width: 33, height: 30, filter: `drop-shadow(0 0 3px ${color.gold})` }}>
          <PixelBitmap rows={[...BITMAP.trophy]} palette={{ g: color.gold, w: "#FFF2B8", d: color.goldDark }} size={3} />
        </div>
        <div>
          <div style={{ ...font(12, color.gold), marginBottom: 5 }}>成就解鎖</div>
          <div style={font(24, color.white)}>{name}</div>
        </div>
      </div>
      {f < 15 ? (
        <div style={{ position: "absolute", left: 30, top: 25 }}>
          <RingPulse x={0} y={0} radius={30} color={color.goldLight} />
        </div>
      ) : null}
    </div>
  );
};

// ── ending plaque ────────────────────────────────
const Ending: React.FC<Extract<GamePopupProps, { variant: "ending" }>> = ({ text = "解鎖結局｜最好的結局", x = LAYOUT.centerX, y = 60, exitAt }) => {
  const f = useCurrentFrame();
  const exit = exitAt !== undefined && f >= exitAt ? easeCamera(Math.min(1, (f - exitAt) / 6)) : 0;
  if (exit >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y - exit * 20, opacity: 1 - exit, transform: `translate(-50%, -50%) scale(${popScale(f) * (1 - exit * 0.3)})` }}>
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px" }}>
        <div style={{ position: "relative", width: 14, height: 14 }}>
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: color.goldLight }} size={2} />
        </div>
        <div style={font(24, color.goldLight)}>{text}</div>
        <div style={{ position: "relative", width: 14, height: 14 }}>
          <PixelBitmap rows={[...BITMAP.star]} palette={{ w: color.goldLight }} size={2} />
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
