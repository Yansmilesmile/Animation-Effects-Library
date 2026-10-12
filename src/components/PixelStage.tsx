import React, { useId } from "react";
import { AbsoluteFill } from "remotion";
import { BloomPass } from "./BloomContext";
import { color, PIXEL } from "../theme";

/**
 * PixelStage —— 場景容器（詞典「一、整體風格」「五、技術建議」）。
 *
 * 由下到上四層：
 * 1. 像素層：480×270，整層放大 4 倍，image-rendering: pixelated。children 用像素層座標。
 * 2. bloom 層：把像素層再畫一次，只留亮度超過門檻的像素（SVG 濾鏡，保留原色）→ 模糊 → mix-blend-mode: screen。
 *    個別 Sprite 可用 bloom={false} 不發光（例如淺色地毯）。
 * 3. 暗角：徑向漸層，固定在畫面上，不跟鏡頭動。
 *    像素層最上面另有 hud（像素座標、不跟鏡頭動）。
 * 4. ui：螢幕座標（1920×1080）的常駐 UI，例如 Subtitle、TopNav、Watermark；不受鏡頭、bloom 影響。
 *
 * Camera 放在 children 裡包住場景內容，bloom 層會自動跟著同一個鏡頭動。
 */
export type PixelStageProps = {
  children?: React.ReactNode;
  /** 像素層底色或漸層（CSS background），預設深藍黑 */
  background?: string;
  /** 暗角強度 0..1，預設 0.6；0 = 關閉 */
  vignette?: number;
  /** bloom 強度 0..1，預設 0.45；0 = 關閉 */
  bloom?: number;
  /** bloom 模糊半徑（螢幕 px），預設 18 */
  bloomRadius?: number;
  /** 亮度門檻 0..1，超過才發光，預設 0.7 */
  bloomThreshold?: number;
  /** 像素座標的 HUD 層：在像素層最上面、不跟鏡頭動、會參與 bloom（標籤、印章、全畫面泛紅、發光大字） */
  hud?: React.ReactNode;
  /** 螢幕座標的 UI 層 */
  ui?: React.ReactNode;
};

export const PixelStage: React.FC<PixelStageProps> = ({
  children,
  background = color.bgNavyBlack,
  vignette = 0.6,
  bloom = 0.45,
  bloomRadius = 18,
  bloomThreshold = 0.7,
  hud,
  ui,
}) => {
  const filterId = "bloom" + useId().replace(/:/g, "");
  // alpha = (亮度 - 門檻) / 柔邊，再用 alpha 遮住原圖：只留亮部、保留原色
  const knee = 0.18;
  const a = 1 / knee;
  const t = bloomThreshold / knee;
  const lum = [0.2126, 0.7152, 0.0722].map((l) => (l * a).toFixed(4)).join(" ");
  const layer = (content: React.ReactNode) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: PIXEL.width,
        height: PIXEL.height,
        transform: `scale(${PIXEL.scale})`,
        transformOrigin: "0 0",
        imageRendering: "pixelated",
        overflow: "hidden",
        background,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{content}</div>
      {hud ? <div style={{ position: "absolute", inset: 0 }}>{hud}</div> : null}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: color.bgNavyBlack, overflow: "hidden" }}>
      {layer(children)}
      {bloom > 0 ? (
        <>
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${lum} 0 ${-t}`}
                result="mask"
              />
              <feComposite in="SourceGraphic" in2="mask" operator="in" />
            </filter>
          </svg>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: bloom,
              filter: `url(#${filterId}) saturate(1.4) blur(${bloomRadius}px)`,
              pointerEvents: "none",
            }}
          >
            <BloomPass.Provider value={true}>{layer(children)}</BloomPass.Provider>
          </AbsoluteFill>
        </>
      ) : null}
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${0.85 * vignette}) 100%)`,
            pointerEvents: "none",
          }}
        />
      ) : null}
      {ui ? <AbsoluteFill>{ui}</AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

/**
 * Layer —— 像素層裡的一個圖層，用來做景深（背景模糊、壓暗）。
 * blur 以像素層單位計（0.5 ≈ 螢幕 2px）。
 */
export const Layer: React.FC<{
  children?: React.ReactNode;
  blur?: number;
  dim?: number;
  style?: React.CSSProperties;
}> = ({ children, blur = 0, dim = 0, style }) => {
  const f: string[] = [];
  if (blur) f.push(`blur(${blur}px)`);
  if (dim) f.push(`brightness(${1 - dim})`);
  return (
    <div style={{ position: "absolute", inset: 0, filter: f.length ? f.join(" ") : undefined, ...style }}>
      {children}
    </div>
  );
};
