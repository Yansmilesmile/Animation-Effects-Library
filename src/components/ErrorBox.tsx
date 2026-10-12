import React from "react";

// 名稱、參數、素材錯誤時在預覽中明顯報錯，不要靜默略過。
// 放在像素層裡時，用 pixel 座標；放在 1920 畫面裡時，用螢幕座標。
export const ErrorBox: React.FC<{ message: string; x?: number; y?: number; pixel?: boolean }> = ({
  message,
  x = 0,
  y = 0,
  pixel = false,
}) => {
  const k = pixel ? 0.25 : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        maxWidth: 900 * k,
        padding: 12 * k,
        border: `${4 * k}px solid #ff2a2a`,
        background: "rgba(60,0,0,0.85)",
        color: "#ffdede",
        fontFamily: "monospace",
        fontSize: 24 * k,
        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
        zIndex: 9999,
      }}
    >
      ⚠ {message}
    </div>
  );
};
