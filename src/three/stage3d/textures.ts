import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { FONT_PIXEL } from "../../theme";
import { seeded } from "../../lib/util";

/**
 * 3D 舞台的貼圖工具：用 canvas 在原生小尺寸上畫像素圖（門面、數字、招牌），最近鄰取樣、不做 mipmap。
 * 要寫中文時先等像素字體載好（useFontReady），否則會烤進後備字體。
 */
export const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** 像素字（Fusion Pixel 12px）：size 必須是 12 的倍數；畫完把半透明像素二值化，保持硬邊 */
export const pixelText = (g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = "center") => {
  g.save();
  g.font = `${size}px ${FONT_PIXEL}`;
  g.textAlign = align;
  g.textBaseline = "top";
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
};

/** 把 canvas 的 alpha 二值化（字體邊緣的抗鋸齒去掉） */
export const hardenAlpha = (g: CanvasRenderingContext2D, w: number, h: number) => {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
};

/** 撒點雜訊（地面、牆面的像素質感），固定 seed */
export const speckle = (g: CanvasRenderingContext2D, w: number, h: number, colors: string[], density: number, seed: number) => {
  const r = seeded(seed);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  }
};

let fontReady = false;
/**
 * 等 Fusion Pixel 字體載好再畫有字的貼圖（delayRender 擋住截圖）。
 * Stage3DView 在字體就緒前不掛載 3D 畫布，所以模組裡呼叫時通常已經就緒；
 * continueRender 放在 ready 之後的 effect：等用到字體的元件重新渲染完才放行截圖。
 */
export const useFontReady = () => {
  const [ready, setReady] = useState(fontReady);
  const [handle] = useState(() => (fontReady ? null : delayRender("3D 貼圖等待像素字體")));
  useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  useEffect(() => {
    if (ready) return;
    // 字體由 ensureFonts 非同步加進 document.fonts；在那之前 load() 會立刻回傳空陣列，所以輪詢 check() 直到真的可用
    const started = Date.now();
    const poll = () => {
      if ([...document.fonts].some((f) => f.family.replace(/"/g, "") === FONT_PIXEL && f.status === "loaded")) {
        fontReady = true;
        setReady(true);
      } else if (Date.now() - started > 15000) {
        console.error("3D 貼圖：等不到像素字體，改用後備字體");
        setReady(true);
      } else setTimeout(poll, 30);
    };
    poll();
  }, [ready]);
  return ready;
};

/** useMemo 版的 canvasTexture；deps 變了才重畫 */
export const useCanvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => canvasTexture(w, h, draw), deps);
