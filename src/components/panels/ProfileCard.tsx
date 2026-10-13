import React from "react";
import { useCurrentFrame } from "remotion";
import assetMeta from "../../generated/asset-meta.json";
import { color, FONT_PIXEL, LAYOUT } from "../../theme";
import { easeCamera } from "../../lib/util";
import { DLG, PixelFrame } from "../dialog/PixelFrame";
import { popScale } from "../emphasis/common";
import { Sprite } from "../Sprite";

/**
 * ProfileCard —— C36 人物資料卡。介紹標竿人物或作者：像素大頭像 + 名字 + 紅色頭銜條 + 金色標籤 + 大數字。
 * hud 圖層（畫面座標 480×270），(x, y) 是卡片頂邊中點。
 *
 * - layout：row = 頭像在左、文字在右（預設）；column = 直式卡，頭像在上。
 * - 卡片從 from 那一側滑入（8 幀），裡面的欄位依序彈出（頭像 → 名字 → 頭銜 → 標籤 → 數字，每項隔 4 幀）。
 * - avatar 是素材 path；頭像框只露出素材的上半部（大頭）：avatarScale 放大，avatarDy 把素材往上推、露出臉。
 * - 背後的放射光用 SunBurst 另外加。
 */
export type ProfileCardProps = {
  name: string;
  title?: string;
  badge?: string;
  stat?: string;
  avatar?: string;
  avatarScale?: number;
  /** 素材頂端往上推幾像素（放大後的像素），預設 0 = 從頭頂開始露 */
  avatarDy?: number;
  avatarDx?: number;
  /** 頭像框邊長，預設 40 */
  avatarBox?: number;
  layout?: "row" | "column";
  from?: "left" | "right" | "bottom" | "none";
  x?: number;
  y?: number;
  /** 卡片寬度，預設 row 170 / column 110 */
  w?: number;
};

const META = assetMeta as Record<string, { w: number; h: number; frameW?: number; frameH?: number }>;
const SLIDE = 8;
const STEP = 4;

const Pop: React.FC<{ g: number; origin?: string; children: React.ReactNode }> = ({ g, origin = "0 50%", children }) =>
  g < 0 ? null : <div style={{ transform: `scale(${popScale(g)})`, transformOrigin: origin }}>{children}</div>;

const Avatar: React.FC<{ asset?: string; box: number; scale: number; dx: number; dy: number }> = ({ asset, box, scale, dx, dy }) => {
  const m = asset ? META[asset] : undefined;
  const h = m ? (m.frameH ?? m.h) * scale : 0;
  return (
    <div
      style={{
        position: "relative",
        width: box,
        height: box,
        flex: "none",
        overflow: "hidden",
        background: `linear-gradient(${color.navyLight}, ${color.navy})`,
        border: `1px solid ${DLG.navy}`,
        boxShadow: `inset 0 0 0 1px ${color.gold}`,
        boxSizing: "border-box",
      }}
    >
      {/* anchor bottom：x 置中；底部 = 頂端 2px + 素材高 - dy */}
      {asset ? <Sprite asset={asset} x={box / 2 + dx} y={2 + h - dy} scale={scale} /> : null}
    </div>
  );
};

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  title,
  badge,
  stat,
  avatar,
  avatarScale = 2,
  avatarDy = 0,
  avatarDx = 0,
  avatarBox = 40,
  layout = "row",
  from = "left",
  x = LAYOUT.centerX,
  y = 60,
  w,
}) => {
  const f = useCurrentFrame();
  if (f < 0) return null;
  const col = layout === "column";
  const width = w ?? (col ? 110 : 170);
  const t = from === "none" ? 1 : easeCamera(Math.min(1, f / SLIDE));
  const off = (1 - t) * 300;
  const dx = from === "left" ? -off : from === "right" ? off : 0;
  const dy = from === "bottom" ? off * 0.6 : 0;
  // 欄位從卡片快滑到位時開始依序彈出
  const g = (k: number) => f - SLIDE + 2 - k * STEP;
  const align = col ? "center" : "flex-start";

  return (
    <div style={{ position: "absolute", left: Math.round(x - width / 2 + dx), top: Math.round(y + dy) }}>
      <div style={{ position: "relative", width }}>
        <PixelFrame x={0} y={0} w={width} style={{ padding: 6, position: "relative" }}>
          <div style={{ display: "flex", flexDirection: col ? "column" : "row", alignItems: align, gap: 6, minHeight: avatarBox }}>
            <Pop g={g(0)} origin="50% 50%">
              <Avatar asset={avatar} box={avatarBox} scale={avatarScale} dx={avatarDx} dy={avatarDy} />
            </Pop>
            <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: 3, fontFamily: FONT_PIXEL, lineHeight: 1 }}>
              <Pop g={g(1)}>
                <div style={{ fontSize: 24, color: DLG.navy, whiteSpace: "nowrap" }}>{name}</div>
              </Pop>
              {title ? (
                <Pop g={g(2)}>
                  <div style={{ fontSize: 12, padding: "2px 4px", background: color.red, color: color.white, border: `1px solid ${color.redDark}`, whiteSpace: "nowrap" }}>{title}</div>
                </Pop>
              ) : null}
              {badge ? (
                <Pop g={g(3)}>
                  <div style={{ fontSize: 12, padding: "2px 4px", background: color.gold, color: color.ink, border: `1px solid ${color.goldDark}`, whiteSpace: "nowrap" }}>{badge}</div>
                </Pop>
              ) : null}
              {stat ? (
                <Pop g={g(4)}>
                  <div style={{ fontSize: 24, color: color.goldDark, textShadow: `1px 1px 0 ${DLG.optBorder}`, whiteSpace: "nowrap" }}>{stat}</div>
                </Pop>
              ) : null}
            </div>
          </div>
        </PixelFrame>
      </div>
    </div>
  );
};
