import React, { useMemo } from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { seeded } from "../../lib/util";
import { RingPulse } from "../emphasis/RingPulse";

/**
 * Counter —— D1 數字跳動計數器 / C41 翻牌計數機（標籤可換）/ C20 歸零破碎 / C62 計數器復活。
 * 像素層座標，(x, y) 是計數器中心。
 *
 * 數值時間軸（幀都是觸發後的相對幀）：
 * 1. countStart 起 countDuration 幀內從 from 數到 to（先快後慢）；之後若有 tickEvery，每 tickEvery 幀 +1（持續跳動）。
 * 2. labels 依 at 換標籤（同一台機器換標籤做對照，詞典規則 18）。
 * 3. zeroAt：數字像被打碎一樣抖動、碎成像素方塊掉落，變成紅色 0（C20 / C41 歸零）。
 * 4. reviveAt：紅色 0 變回白字，從 1 開始每 reviveEvery 幀 +1（C62）。
 *
 * variant："flip" 翻牌機（預設，換數字時有 3 幀翻牌）/ "plain" 只有數字（HUD 上的「已丟棄 N」）。
 */
export type CounterProps = {
  x: number;
  y: number;
  from?: number;
  to?: number;
  countStart?: number;
  countDuration?: number;
  tickEvery?: number;
  /** 位數（補零），預設 4 */
  digits?: number;
  label?: string;
  labels?: { at: number; text: string }[];
  zeroAt?: number;
  reviveAt?: number;
  reviveEvery?: number;
  variant?: "flip" | "plain";
  /** 數字前綴，例如「$」；plain 樣式常用來寫「已丟棄」 */
  prefix?: string;
  /** 千分位逗號（plain 樣式），預設 false */
  comma?: boolean;
};

type State = { v: number; red: boolean };

export const Counter: React.FC<CounterProps> = ({
  x,
  y,
  from = 0,
  to = 0,
  countStart = 0,
  countDuration = 30,
  tickEvery,
  digits = 4,
  label,
  labels = [],
  zeroAt,
  reviveAt,
  reviveEvery = 8,
  variant = "flip",
  prefix,
  comma = false,
}) => {
  const f = useCurrentFrame();
  const max = Math.pow(10, digits) - 1;

  const stateAt = (t: number): State => {
    if (reviveAt !== undefined && t >= reviveAt) return { v: Math.min(max, 1 + Math.floor((t - reviveAt) / reviveEvery)), red: false };
    if (zeroAt !== undefined && t >= zeroAt) return { v: 0, red: true };
    let v: number;
    if (t <= countStart) v = from;
    else if (t < countStart + countDuration) {
      const p = (t - countStart) / countDuration;
      v = from + (to - from) * (1 - Math.pow(1 - p, 3));
    } else {
      v = to + (tickEvery ? Math.floor((t - countStart - countDuration) / tickEvery) : 0);
    }
    return { v: Math.min(max, Math.max(0, Math.floor(v))), red: false };
  };

  const shards = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: digits * 10 }, () => ({ dx: (r() - 0.5) * 2.4, dy: -r() * 1.6, ox: r(), oy: r(), s: r() > 0.6 ? 2 : 1 }));
  }, [digits]);

  if (f < 0) return null;
  const st = stateAt(f);
  const str = String(st.v).padStart(digits, "0");
  const prevStr = (t: number) => String(stateAt(t).v).padStart(digits, "0");

  let curLabel = label;
  let labelSince = -99;
  for (const l of [...labels].sort((a, b) => a.at - b.at)) if (f >= l.at) { curLabel = l.text; labelSince = l.at; }
  const labelPop = f - labelSince < 3 ? [1.3, 1.1, 1][f - labelSince] : 1;

  const shatterT = zeroAt !== undefined ? f - zeroAt : -1;
  const shaking = shatterT >= -4 && shatterT < 0; // 碎之前抖 4 幀
  const shake = shaking ? (shatterT % 2 === 0 ? 1 : -1) : 0;
  const hideDigits = shatterT >= 0 && shatterT < 3; // 碎掉的瞬間先空 3 幀
  const digitColor = st.red ? color.redLight : color.white;

  const cardW = 10;
  const cardH = 14;

  const digitsEl =
    variant === "flip" ? (
      <div style={{ display: "flex", gap: 1 }}>
        {str.split("").map((d, i) => {
          // 這一位數剛好在這一幀改變 → 翻牌壓扁 1 幀（跳得再快也看得清數字）
          const flap = prevStr(f)[i] !== prevStr(f - 1)[i] ? 0.45 : 1;
          return (
            <div key={i} style={{ position: "relative", width: cardW, height: cardH, background: "#0b0e18", boxShadow: `inset 0 0 0 1px #2a3150` }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_PIXEL,
                  fontSize: 12,
                  lineHeight: 1,
                  color: digitColor,
                  transform: `scaleY(${flap})`,
                  opacity: hideDigits ? 0 : 1,
                  textShadow: st.red ? `0 0 3px ${color.red}` : undefined,
                }}
              >
                {d}
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: cardH / 2, height: 1, background: "rgba(0,0,0,0.6)" }} />
            </div>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          fontFamily: FONT_PIXEL,
          fontSize: 12,
          lineHeight: 1,
          color: digitColor,
          opacity: hideDigits ? 0 : 1,
          textShadow: `1px 0 0 ${color.ink}, -1px 0 0 ${color.ink}, 0 1px 0 ${color.ink}, 0 -1px 0 ${color.ink}`,
          whiteSpace: "nowrap",
        }}
      >
        {prefix ? <span style={{ color: color.gold, marginRight: 3 }}>{prefix}</span> : null}
        {comma ? st.v.toLocaleString("en-US") : str}
      </div>
    );

  const boxW = variant === "flip" ? digits * (cardW + 1) - 1 + 8 : undefined;

  return (
    <div style={{ position: "absolute", left: Math.round(x) + shake, top: Math.round(y), transform: "translate(-50%, -50%)" }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {variant === "flip" ? (
          <div
            style={{
              padding: 4,
              width: boxW,
              boxSizing: "border-box",
              background: "#161b30",
              border: `1px solid ${st.red ? color.red : color.gold}`,
              boxShadow: `0 0 0 1px ${color.ink}, 0 3px 0 1px rgba(0,0,0,0.5)`,
              display: "flex",
              justifyContent: "center",
            }}
          >
            {prefix ? <span style={{ fontFamily: FONT_PIXEL, fontSize: 12, color: color.gold, marginRight: 2, alignSelf: "center" }}>{prefix}</span> : null}
            {digitsEl}
          </div>
        ) : (
          digitsEl
        )}
        {curLabel ? (
          <div
            style={{
              marginTop: 2,
              padding: "2px 5px",
              background: color.navyDark,
              border: `1px solid ${color.goldDark}`,
              boxShadow: `0 0 0 1px ${color.ink}`,
              fontFamily: FONT_PIXEL,
              fontSize: 12,
              lineHeight: 1,
              color: color.goldLight,
              whiteSpace: "nowrap",
              transform: `scale(${labelPop})`,
            }}
          >
            {curLabel}
          </div>
        ) : null}
        {/* 破碎：數字拆成像素方塊往外噴、往下掉 */}
        {shatterT >= 0 && shatterT < 18
          ? shards.map((s, i) => {
              const t = shatterT;
              const left = 4 + s.ox * (digits * (cardW + 1)) + s.dx * t * 1.4;
              const top = 4 + s.oy * cardH + s.dy * t * 1.4 + 0.08 * t * t;
              return (
                <div
                  key={i}
                  style={{ position: "absolute", left: Math.round(left), top: Math.round(top), width: s.s, height: s.s, background: i % 3 ? color.white : color.redLight, opacity: 1 - t / 18 }}
                />
              );
            })
          : null}
        {zeroAt !== undefined ? (
          <Sequence from={zeroAt} layout="none">
            <RingPulse x={(boxW ?? 30) / 2} y={11} radius={30} color={color.redLight} flash={false} />
          </Sequence>
        ) : null}
        {reviveAt !== undefined ? (
          <Sequence from={reviveAt} layout="none">
            <RingPulse x={(boxW ?? 30) / 2} y={11} radius={30} color={color.goldLight} />
          </Sequence>
        ) : null}
      </div>
    </div>
  );
};
