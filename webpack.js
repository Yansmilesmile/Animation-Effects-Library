// 影片專案的 remotion.config.ts / 打包腳本用：
//   const { withSuperbot } = require("superbot-motion/webpack");
//   Config.overrideWebpackConfig((c) => withSuperbot(c));
// "file:../superbot-motion" 是連結，組件庫的原始碼實際在引擎資料夾裡，裡面的 import "react" / "remotion"
// 會找到引擎自己的 node_modules，變成兩份 React / Remotion（context 對不上、畫面空白）。
// 這裡把這些共用套件固定指到影片專案自己的 node_modules。
const path = require("node:path");

const SHARED = ["react", "react-dom", "remotion", "three", "@react-three/fiber", "@remotion/three"];

/** @param {import("webpack").Configuration} config @param {string} [root] 影片專案根目錄，預設 process.cwd() */
exports.withSuperbot = (config, root = process.cwd()) => {
  const alias = { ...(config.resolve && config.resolve.alias) };
  for (const name of SHARED) alias[name] = path.join(root, "node_modules", name);
  return { ...config, resolve: { ...config.resolve, alias } };
};
