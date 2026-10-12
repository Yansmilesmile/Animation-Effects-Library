import React from "react";
import { FONT_PIXEL, fontSize } from "../theme";

/**
 * Watermark —— F6 右上角浮水印：「超級人機・<書名或主題>」。放在 PixelStage 的 ui。
 * 頂部導航在正上方，所以浮水印放在導航下方的右上角。
 */
export const Watermark: React.FC<{ topic?: string; channel?: string }> = ({ topic, channel = "超級人機" }) => (
  <div
    style={{
      position: "absolute",
      top: 112,
      right: 48,
      fontFamily: FONT_PIXEL,
      fontSize: fontSize.s,
      color: "rgba(255,255,255,0.42)",
      textShadow: "4px 4px 0 rgba(0,0,0,0.5)",
      letterSpacing: 2,
    }}
  >
    {channel}
    {topic ? `・${topic}` : ""}
  </div>
);
