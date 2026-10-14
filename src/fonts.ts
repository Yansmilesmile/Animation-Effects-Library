/// <reference path="./lib/modules.d.ts" />
import { continueRender, delayRender } from "remotion";
import { FONT_PIXEL } from "./theme";
// 像素中文字體：Fusion Pixel Font 12px proportional（繁中台灣字形），OFL-1.1，可商用。
// 用 import 打包進組件庫，別的專案引用時不必有 public/fonts/。換字體：把檔案放進 public/fonts/，改下面兩處檔名。
import fontUrl from "../public/fonts/fusion-pixel-12px-zh_tw.woff2";

const FONT_FILE = "fusion-pixel-12px-zh_tw.woff2";

let loaded = false;

export const ensureFonts = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender(`載入字體 ${FONT_FILE}`);
  const face = new FontFace(FONT_PIXEL, `url(${fontUrl}) format("woff2")`);
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
