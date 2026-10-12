import { createContext, useContext } from "react";

// PixelStage 的 bloom 層會把像素層再畫一次；這個 context 讓組件知道自己正在 bloom 層裡，
// 例如 Sprite 的 bloom={false} 在 bloom 層裡畫成全黑（不發光，也會擋住後面的光）。
export const BloomPass = createContext(false);
export const useBloomPass = () => useContext(BloomPass);
