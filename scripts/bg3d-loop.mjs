// 把 scenes3d/*.html 截成「循環播放的背景」：public/bg3d/<名稱>-<寬>x<高>-loop/000.png…＋loop.json，
// 同時更新靜態截圖 public/bg3d/<名稱>-<寬>x<高>.png（第 0 幀）。
// HTML 需支援 ?t=秒（固定時間）與 ?loop=秒（動畫剛好 loop 秒循環），見 scenes3d/金色頂層辦公室.html。
// 跑完後執行 npm run assets，舞台用到這張背景時影片裡就會播循環版（燈光閃爍）。
// 用法：node scripts/bg3d-loop.mjs scenes3d/<名稱>.html [--seconds=4] [--fps=10] [--size=480x270] [--expo=0.55]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENES3D = path.join(PROJECT, "scenes3d");
const BG3D = path.join(PROJECT, "public", "bg3d");

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const html = args.find((a) => !a.startsWith("--"));
if (!html) {
  console.error("用法：node scripts/bg3d-loop.mjs scenes3d/<名稱>.html [--seconds=4] [--fps=10] [--size=480x270] [--expo=0.55]");
  process.exit(1);
}
const src = path.resolve(PROJECT, html);
if (!src.startsWith(SCENES3D + path.sep) || !fs.existsSync(src)) {
  console.error(`找不到 ${html}（必須在 scenes3d/ 底下）`);
  process.exit(1);
}
const seconds = +opt("seconds", 4);
const fps = +opt("fps", 10);
const [w, h] = opt("size", "480x270").split("x").map(Number);
const expo = opt("expo", "");
const frames = Math.round(seconds * fps);

// chrome-headless-shell：Remotion 安裝時下載的那一份（和舞台編輯器截圖用的一樣）
function findChrome(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const hit = findChrome(p);
      if (hit) return hit;
    } else if (e.name === "chrome-headless-shell.exe" || e.name === "chrome-headless-shell") return p;
  }
  return null;
}
const chrome = findChrome(path.join(PROJECT, "node_modules", ".remotion"));
if (!chrome) {
  console.error("找不到 chrome-headless-shell，請先 npm install 並渲染過一次");
  process.exit(1);
}

// 截圖時只保留 3D 畫布（和 tools/stage_editor/server.py 的 SNAP_STYLE 相同）
const SNAP_STYLE =
  '<style id="__stage_snap">body *{visibility:hidden!important}' +
  "canvas{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;" +
  "width:100vw!important;height:100vh!important;max-width:none!important;z-index:2147483647!important}</style>";

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const f = path.resolve(SCENES3D, decodeURIComponent(u.pathname).replace(/^\/+/, ""));
  if (!f.startsWith(SCENES3D + path.sep) || !fs.existsSync(f)) {
    res.writeHead(404).end();
    return;
  }
  let data = fs.readFileSync(f);
  if (f.endsWith(".html")) data = Buffer.from(data.toString("utf8").replace(/<head[^>]*>/i, (m) => m + SNAP_STYLE));
  res.writeHead(200, { "Content-Type": f.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" }).end(data);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const rel = path.relative(SCENES3D, src).split(path.sep).map(encodeURIComponent).join("/");

const shot = (t, out) =>
  new Promise((resolve, reject) => {
    const q = new URLSearchParams({ t: String(t), loop: String(seconds) });
    if (expo) q.set("expo", expo);
    execFile(
      chrome,
      [
        "--headless", "--hide-scrollbars", "--mute-audio", `--window-size=${w},${h}`, "--virtual-time-budget=3000",
        "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
        `--screenshot=${out}`, `http://127.0.0.1:${port}/${rel}?${q}`,
      ],
      { timeout: 120000 },
      (err) => (fs.existsSync(out) ? resolve() : reject(err ?? new Error(`截圖失敗：${out}`))),
    );
  });

const stem = `${path.basename(src, ".html")}-${w}x${h}`;
const dir = path.join(BG3D, `${stem}-loop`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

let done = 0;
const jobs = Array.from({ length: frames }, (_, i) => i);
const worker = async () => {
  while (jobs.length) {
    const i = jobs.shift();
    await shot(i / fps, path.join(dir, `${String(i).padStart(3, "0")}.png`));
    process.stdout.write(`\r截圖 ${++done}/${frames}`);
  }
};
try {
  await Promise.all(Array.from({ length: 4 }, worker));
  fs.copyFileSync(path.join(dir, "000.png"), path.join(BG3D, `${stem}.png`));
  fs.writeFileSync(path.join(dir, "loop.json"), JSON.stringify({ frames, fps }));
  console.log(`\n完成：public/bg3d/${stem}-loop/（${frames} 幀、${fps}fps、${seconds} 秒循環），靜態圖 public/bg3d/${stem}.png 已更新`);
} finally {
  server.close();
}
