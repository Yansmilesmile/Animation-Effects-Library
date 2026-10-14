import React, { createContext, useContext, useMemo } from "react";
import { staticFile } from "remotion";
import legacyMeta from "../generated/asset-meta.json";
import { BUILTIN_META, BUILTIN_URLS } from "../generated/builtin-assets";

/**
 * 素材從哪裡來。
 *
 * - 沒有包 <AssetProvider>（引擎自己、舊的 pixel_Apply / pixel_newApply）：照舊用引擎的
 *   src/generated/asset-meta.json，圖檔在 public/lib/（staticFile）。
 * - 影片專案用組件庫時包 <AssetProvider meta={本專案的 asset-meta}>：素材去本專案的 public/<base>/ 找
 *   （npx superbot-assets 複製進去、產生 meta）；組件庫自帶的圖（主持人姿勢、@engine/…）用打包進庫的網址。
 */
export type AssetMeta = {
  w: number;
  h: number;
  kind: string;
  cols?: number;
  rows?: number;
  frameW?: number;
  frameH?: number;
  frames?: number | { src: string; w: number; h: number }[];
  fps?: number;
  play?: "loop" | "once";
};

export type AssetSource = {
  /** 素材 path → 尺寸、動畫格子（asset-meta.json） */
  meta: Record<string, AssetMeta>;
  /** 素材 path（或資料夾影格的 src）→ 圖檔網址 */
  url: (path: string) => string;
};

const LEGACY: AssetSource = {
  meta: legacyMeta as Record<string, AssetMeta>,
  url: (p) => staticFile(`lib/${p}`),
};

const AssetContext = createContext<AssetSource>(LEGACY);

export type AssetProviderProps = {
  /** 本專案的 asset-meta.json（npx superbot-assets 產生） */
  meta: Record<string, unknown>;
  /** 素材在 public/ 底下的資料夾，預設 "lib"；也可以是完整網址或以 / 開頭的路徑 */
  base?: string;
  children: React.ReactNode;
};

export const AssetProvider: React.FC<AssetProviderProps> = ({ meta, base = "lib", children }) => {
  const value = useMemo<AssetSource>(() => {
    const root = base.replace(/\/+$/, "");
    const external = /^(https?:)?\/\//.test(root) || root.startsWith("/");
    return {
      meta: { ...BUILTIN_META, ...(meta as Record<string, AssetMeta>) },
      url: (p) => BUILTIN_URLS[p] ?? (external ? `${root}/${p.split("/").map(encodeURIComponent).join("/")}` : staticFile(`${root}/${p}`)),
    };
  }, [meta, base]);
  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
};

export const useAssets = () => useContext(AssetContext);
