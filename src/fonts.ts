import { continueRender, delayRender, staticFile } from "remotion";
import { FONT_PIXEL } from "./theme";

// 像素中文字體：Fusion Pixel Font 12px proportional（繁中台灣字形），OFL-1.1，可商用。
// 換字體：把檔案放進 public/fonts/，改下面的檔名。
const FONT_FILE = "fonts/fusion-pixel-12px-zh_tw.woff2";

let loaded = false;

export const ensureFonts = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender(`載入字體 ${FONT_FILE}`);
  const face = new FontFace(FONT_PIXEL, `url(${staticFile(FONT_FILE)}) format("woff2")`);
  face
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch((err) => {
      console.error("字體載入失敗", err);
      continueRender(handle);
    });
};
