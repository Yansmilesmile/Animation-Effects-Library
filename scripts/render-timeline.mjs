// 把一份時間軸 JSON 渲染成 mp4。
// 用法：node scripts/render-timeline.mjs timelines/<名稱>.json [out/<名稱>.mp4]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [file, outArg] = process.argv.slice(2);
if (!file) {
  console.error("用法：node scripts/render-timeline.mjs timelines/<名稱>.json [out/<名稱>.mp4]");
  process.exit(1);
}
const timeline = JSON.parse(fs.readFileSync(file, "utf8"));
const output = path.resolve(outArg ?? path.join(PROJECT, "out", path.basename(file, ".json") + ".mp4"));
const inputProps = { timeline };

const serveUrl = await bundle({ entryPoint: path.join(PROJECT, "src", "index.ts"), publicDir: path.join(PROJECT, "public") });
// Three.js（WebGL）需要 GPU 後端，和 remotion.config.ts 一致
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id: "Timeline", chromiumOptions, inputProps });
let last = -1;
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  outputLocation: output,
  chromiumOptions,
  inputProps,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      console.log(`${p * 10}%`);
    }
  },
});
console.log(output);
