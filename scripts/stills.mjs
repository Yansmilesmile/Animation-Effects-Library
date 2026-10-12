// 一次打包，輸出多張關鍵幀截圖，方便檢查。
// 用法：node scripts/stills.mjs <compositionId> <frame> [frame...]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [id, ...frames] = process.argv.slice(2);
if (!id || !frames.length) {
  console.error("用法：node scripts/stills.mjs <compositionId> <frame> [frame...]");
  process.exit(1);
}

const serveUrl = await bundle({ entryPoint: path.join(PROJECT, "src", "index.ts"), publicDir: path.join(PROJECT, "public") });
// Three.js（WebGL）需要 GPU 後端，和 remotion.config.ts 一致
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
for (const f of frames) {
  const output = path.join(PROJECT, "out", "stills", `${id}-${String(f).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: Number(f), output, chromiumOptions });
  console.log(output);
}
