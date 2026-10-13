import React from "react";
import { useCurrentFrame } from "remotion";
import { color, FONT_PIXEL } from "../../theme";
import { clamp01 } from "../emphasis/common";

/**
 * BookUnfold —— NEW-1 書本掰開成時間軸：一本攤開的書從中間裂成兩半往左右推開，
 * 中間拉出一條橫向時間軸，年份刻度從左到右依次亮起（金色）。像素層座標，(x, y) 是書的中心。
 *
 * 和 ACT「掰書」同步：start 寫 "@詞+mark:open"（書打開那一幀），x / y 用 target 指名角色（anchor / offset 調到胸前）。
 * 刻度 from → to（每 step 一格），每 tickEvery 幀亮一格；labelEvery 格標一次年份（首尾一定標）；或用 labels 自訂每格文字。
 */
export type BookUnfoldProps = {
  x: number;
  y: number;
  width?: number;
  from?: number;
  to?: number;
  step?: number;
  labelEvery?: number;
  /** 自訂每格的文字（長度 = 格數），寫了就不用 from / to 算年份；空字串 = 這格不標 */
  labels?: string[];
  /** 書推開花幾幀，預設 10 */
  openFrames?: number;
  /** 每格亮起間隔，預設 3 */
  tickEvery?: number;
  /** 書頁高度（像素），預設 22 */
  pageH?: number;
  cover?: string;
};

const PAGE = "#F4E6C4";
const LINE = "#CDBA8E";

/** 半本書（從書脊看出去）：書頁 + 外側書皮；side -1 = 左半 */
const Half: React.FC<{ x: number; y: number; h: number; side: -1 | 1; cover: string }> = ({ x, y, h, side, cover }) => {
  const w = 16;
  const left = side < 0 ? x - w : x;
  return (
    <>
      <div style={{ position: "absolute", left: left - 1, top: y - h / 2 - 1, width: w + 2, height: h + 2, background: color.ink }} />
      <div style={{ position: "absolute", left: side < 0 ? left - 3 : left + w - 1, top: y - h / 2, width: 4, height: h + 2, background: cover, boxShadow: `0 0 0 1px ${color.ink}` }} />
      <div style={{ position: "absolute", left, top: y - h / 2, width: w, height: h, background: PAGE }} />
      {Array.from({ length: Math.floor((h - 6) / 3) }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: left + 3, top: y - h / 2 + 4 + i * 3, width: w - 6, height: 1, background: LINE }} />
      ))}
      <div style={{ position: "absolute", left: side < 0 ? x - 1 : x, top: y - h / 2, width: 1, height: h, background: LINE }} />
    </>
  );
};

export const BookUnfold: React.FC<BookUnfoldProps> = ({
  x,
  y,
  width = 220,
  from = 2010,
  to = 2020,
  step = 1,
  labelEvery = 5,
  labels,
  openFrames = 10,
  tickEvery = 3,
  pageH = 22,
  cover = color.redDark,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const o = 1 - Math.pow(1 - clamp01(f / openFrames), 3);
  const half = Math.round((width / 2) * o);
  const lx = x - half;
  const rx = x + half;
  const years: (number | string)[] = [];
  if (labels?.length) years.push(...labels);
  else for (let v = from; v <= to; v += Math.max(1, step)) years.push(v);
  const inner = width - 28; // 刻度分布在線上（兩端各留 14，年份字不被書頁蓋住）
  const tickX = (i: number) => Math.round(x - inner / 2 + (years.length > 1 ? (inner * i) / (years.length - 1) : inner / 2));

  return (
    <>
      {/* 時間軸線：從中間往兩邊長 */}
      {half > 2 ? (
        <>
          <div style={{ position: "absolute", left: lx, top: y - 2, width: rx - lx, height: 4, background: color.ink }} />
          <div style={{ position: "absolute", left: lx, top: y - 1, width: rx - lx, height: 2, background: color.goldDark }} />
        </>
      ) : null}
      {years.map((yr, i) => {
        const tx = tickX(i);
        if (tx < lx + 2 || tx > rx - 2) return null;
        const litAt = openFrames + i * tickEvery;
        const lit = f >= litAt;
        const t = f - litAt;
        const label = labels?.length ? yr !== "" : i === 0 || i === years.length - 1 || i % labelEvery === 0;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: tx - 1, top: y - (lit ? 5 : 3), width: 2, height: lit ? 10 : 6, background: lit ? color.goldLight : color.grayDark, boxShadow: `0 0 0 1px ${color.ink}` }} />
            {lit && t < 4 ? <div style={{ position: "absolute", left: tx - 3, top: y - 3, width: 6, height: 6, background: color.white, opacity: 1 - t / 4 }} /> : null}
            {label && lit ? (
              <div
                style={{
                  position: "absolute",
                  left: tx,
                  top: y + 8,
                  transform: `translateX(-50%) scale(${t < 3 ? [1.3, 1.1, 1][t] : 1})`,
                  fontFamily: FONT_PIXEL,
                  fontSize: 12,
                  lineHeight: 1,
                  color: color.goldLight,
                  textShadow: `1px 1px 0 ${color.ink}`,
                  whiteSpace: "nowrap",
                }}
              >
                {yr}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <Half x={lx} y={y} h={pageH} side={-1} cover={cover} />
      <Half x={rx} y={y} h={pageH} side={1} cover={cover} />
    </>
  );
};
