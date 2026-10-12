import React, { useId } from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import assetMeta from "../generated/asset-meta.json";
import { color as themeColor } from "../theme";
import { hexToRgb, px } from "../lib/util";
import { useBloomPass } from "./BloomContext";
import { ErrorBox } from "./ErrorBox";

/**
 * Sprite —— 顯示素材庫的單張圖或動畫條。
 *
 * - 放在 PixelStage 的像素層（480×270）裡，x / y 是像素層座標，會取整數。
 * - 以原生尺寸繪製，整個像素層一起放大 4 倍，所以所有素材的「一個像素」一樣大。
 *   scale 建議整數（主角級物件可用 2、3）；也接受 0.5 的倍數（仍是整數螢幕像素，但像素粗細和其他素材不同）。
 * - 動畫條：整張圖保留、用位移切格（不先切成單幀），8–12fps 逐格播放、不補間。
 *   rows > 1 時用 row 選列。格子資訊來自 inventory.csv（copy-assets 產生的 asset-meta.json）。
 * - tint：把素材染色（"red" = 壞掉、"gray" = 未解鎖，或任意 #hex）；glow：發光外框。
 */
export type SpriteProps = {
  /** 相對素材庫根目錄的路徑（和 search.py 回傳的 path 相同） */
  asset: string;
  x?: number;
  y?: number;
  /** 定位點：bottom = x 置中、y 是底部（適合放在地上）；center；top-left */
  anchor?: "bottom" | "center" | "top-left";
  /** 放大倍數，預設 1；整數最一致，也接受 0.5 的倍數 */
  scale?: number;
  flipX?: boolean;
  /** 旋轉角度（度），以素材中心為軸；90 的倍數最清晰，其他角度像素邊緣會有鋸齒 */
  rotate?: number;
  /** "red" | "gray" | "gold" | "#rrggbb" */
  tint?: string;
  /** 0..1，染色強度，預設 0.85 */
  tintAmount?: number;
  /** 發光外框顏色，例如 theme 的 gold */
  glow?: string;
  /** 動畫播放速度（幀/秒），預設 10 */
  animFps?: number;
  /** 動畫表選哪一列，預設 0 */
  row?: number;
  /** 固定顯示某一格（覆蓋自動播放） */
  frameIndex?: number;
  opacity?: number;
  /** false = 不參與 PixelStage 的 bloom（淺色但不該發光的東西，例如地毯），預設 true */
  bloom?: boolean;
  style?: React.CSSProperties;
};

type Meta = {
  w: number;
  h: number;
  kind: string;
  cols?: number;
  rows?: number;
  frameW?: number;
  frameH?: number;
  frames?: number;
};

const META = assetMeta as Record<string, Meta>;

const TINTS: Record<string, string> = {
  red: themeColor.red,
  gray: "#7d8194",
  gold: themeColor.gold,
  navy: themeColor.navyLight,
};

// 依亮度重新上色：結果 = (1-a)·原色 + a·(亮度 × 染色 × k)
const tintMatrix = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  const k = 1.5;
  const L = [0.2126, 0.7152, 0.0722];
  const row = (c: number, i: number) =>
    L.map((l, j) => (j === i ? 1 - a : 0) + a * l * c * k).join(" ") + " 0 0";
  return `${row(r, 0)} ${row(g, 1)} ${row(b, 2)} 0 0 0 1 0`;
};

export const Sprite: React.FC<SpriteProps> = ({
  asset,
  x = 0,
  y = 0,
  anchor = "bottom",
  scale = 1,
  flipX = false,
  rotate = 0,
  tint,
  tintAmount = 0.85,
  glow,
  animFps = 10,
  row = 0,
  frameIndex,
  opacity = 1,
  bloom = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const inBloomPass = useBloomPass();
  const { fps } = useVideoConfig();
  const filterId = "tint" + useId().replace(/:/g, "");
  const meta = META[asset];

  if (!meta) {
    return (
      <ErrorBox
        pixel
        x={px(x)}
        y={px(y)}
        message={`Sprite：素材沒有登記在 asset-meta.json\n${asset}\n請把它加進清單後執行 npm run assets`}
      />
    );
  }
  // 倍數必須是 0.5 的倍數：像素層 ×4、預設取景 ×6 時，每個來源像素仍落在整數螢幕像素上
  if (!Number.isInteger(scale * 2) || scale <= 0) {
    return <ErrorBox pixel x={px(x)} y={px(y)} message={`Sprite：scale 必須是 0.5 的倍數（建議整數），收到 ${scale}`} />;
  }

  const isAnim = meta.kind === "anim" && meta.cols && meta.frameW && meta.frameH;
  const fw = isAnim ? meta.frameW! : meta.w;
  const fh = isAnim ? meta.frameH! : meta.h;
  const w = fw * scale;
  const h = fh * scale;

  let col = 0;
  if (isAnim) {
    const perRow = meta.rows === 1 ? Math.min(meta.cols!, meta.frames || meta.cols!) : meta.cols!;
    col = frameIndex ?? Math.floor((frame / fps) * animFps) % perRow;
  }

  const left = px(anchor === "top-left" ? x : x - w / 2);
  const top = px(anchor === "top-left" ? y : anchor === "center" ? y - h / 2 : y - h);

  const tintHex = tint ? TINTS[tint] ?? tint : undefined;
  const filters: string[] = [];
  if (tintHex) filters.push(`url(#${filterId})`);
  if (inBloomPass && !bloom) filters.push("brightness(0)");
  if (glow) {
    filters.push(
      `drop-shadow(1px 0 0 ${glow}) drop-shadow(-1px 0 0 ${glow}) drop-shadow(0 1px 0 ${glow}) drop-shadow(0 -1px 0 ${glow}) drop-shadow(0 0 3px ${glow})`,
    );
  }

  const src = staticFile(`lib/${asset}`);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        height: h,
        overflow: "hidden",
        opacity,
        transform: rotate || flipX ? `${rotate ? `rotate(${rotate}deg) ` : ""}${flipX ? "scaleX(-1)" : ""}` : undefined,
        filter: filters.length ? filters.join(" ") : undefined,
        // 發光外框會被 overflow 裁掉，所以發光時讓外層溢出、裁切交給內層
        ...(glow ? { overflow: "visible" } : null),
        ...style,
      }}
    >
      {tintHex ? (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={tintMatrix(tintHex, tintAmount)} />
          </filter>
        </svg>
      ) : null}
      <div style={{ width: w, height: h, overflow: "hidden", position: "relative" }}>
        <Img
          src={src}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: meta.w * scale,
            height: meta.h * scale,
            imageRendering: "pixelated",
            transform: isAnim ? `translate(${-col * w}px, ${-row * h}px)` : undefined,
          }}
        />
      </div>
    </div>
  );
};
