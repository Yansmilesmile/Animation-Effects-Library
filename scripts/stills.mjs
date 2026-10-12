// 一次打包，輸出多張關鍵幀截圖，方便檢查。
// 用法：node scripts/stills.mjs <compositionId> <frame> [frame...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 用法加上 --props-file=時間軸.json，或 --props='{"stage":"home"}' 可覆寫 props
const args = process.argv.slice(2);
const propsArg = args.find((a) => a.startsWith("--props="));
const propsFile = args.find((a) => a.startsWith("--props-file="));
// --props-file=<json 檔>：props 從檔案讀（時間軸這種長 JSON 用）；檔案內容是時間軸時自動包成 { timeline }
const fileProps = propsFile ? JSON.parse(fs.readFileSync(propsFile.slice("--props-file=".length), "utf8")) : null;
const inputProps = fileProps ? (fileProps.scenes ? { timeline: fileProps } : fileProps) : propsArg ? JSON.parse(propsArg.slice("--props=".length)) : {};
const [id, ...frames] = args.filter((a) => !a.startsWith("--"));
if (!id || !frames.length) {
  console.error("用法：node scripts/stills.mjs <compositionId> <frame> [frame...]");
  process.exit(1);
}

const serveUrl = await bundle({ entryPoint: path.join(PROJECT, "src", "index.ts"), publicDir: path.join(PROJECT, "public") });
// Three.js（WebGL）需要 GPU 後端，和 remotion.config.ts 一致
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id, chromiumOptions, inputProps });
for (const f of frames) {
  const output = path.join(PROJECT, "out", "stills", `${id}-${String(f).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: Number(f), output, chromiumOptions, inputProps });
  console.log(output);
}
