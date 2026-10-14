// 把用到的素材從素材庫複製到 public/lib/（保留相對路徑），並產生 src/generated/asset-meta.json。
// 素材庫只讀，不寫入。
// 用法：node scripts/copy-assets.mjs [清單或鎖定版 JSON ...]（預設 assets.list.json）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIB_ROOT = "D:/桌面/素材庫/PixelSRPG-Forge-main";
// 過渡用：舊的範例、舞台、pixel_Apply 還引用舊素材庫的檔案。新庫找不到時才回舊庫找，並列出警告；新影片只用新庫。
const OLD_LIB_ROOT = "D:/桌面/PixelSRPG-Forge-main";
const fromOldLib = [];
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_LIB = path.join(PROJECT, "public", "lib");
const GENERATED = path.join(PROJECT, "src", "generated");
// 主持人：姿勢說明在 assets/host/poses.json；圖檔用 svgAll/svg_host 的 SVG，還沒有 SVG 的姿勢暫用 assets/host/legacy/ 的 PNG
const HOST_POSES = path.join(PROJECT, "assets", "host", "poses.json");
const HOST_SVG = "public/svgAll/svg_host/svg";
const HOST_LEGACY = "assets/host/legacy";

// Node 22.9 在 Windows 上對含「【】」等字元的路徑呼叫 mkdirSync({recursive:true}) 會直接崩潰，改成逐層建立
function mkdirp(dir) {
  let cur = "";
  for (const part of path.resolve(dir).split(path.sep)) {
    cur = cur ? cur + path.sep + part : part + path.sep;
    if (!fs.existsSync(cur)) fs.mkdirSync(cur);
  }
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`不是 PNG：${file}`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// SVG 的尺寸取 viewBox（svg_host 的 viewBox 就是原圖像素座標）
function svgSize(file) {
  const m = /viewBox="\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(fs.readFileSync(file, "utf8"));
  if (!m) throw new Error(`SVG 沒有 viewBox：${file}`);
  return [Math.round(+m[1]), Math.round(+m[2])];
}

const imageSize = (file) => (/\.svg$/i.test(file) ? svgSize(file) : pngSize(file));

// 收集要複製的路徑：清單檔的 paths，或鎖定版 JSON 裡所有 "asset" 字串
function collect(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = new Set(j.paths ?? []);
  (function walk(v) {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.asset === "string") out.add(v.asset);
      // 時間軸 Act 事件的 prop（道具素材 path）
      if (typeof v.prop === "string" && /\.png$/i.test(v.prop)) out.add(v.prop);
      Object.values(v).forEach(walk);
    }
  })(j);
  return out;
}

const listJson = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f)) : []);
const STAGE_FILES = listJson(path.join(PROJECT, "stages"));

// ── 外部專案（例如影片專案 pixel_Apply）──
// projects.local.json（本機設定，不進 git）：{ "projects": ["D:/桌面/pixel_Apply"] }
// 每個專案根目錄放 superbot.project.json：{ "name": "pixel_Apply", "lists": ["videos/*/*/timeline.json", "videos/*/assets.list.json"] }
// 素材 path 寫 "@<name>/<專案內相對路徑>" 指向專案裡自製的素材（例如 assets/generated/ 的圖），會複製到 public/lib/@<name>/…
// "@engine/<相對路徑>" 指向 superbot-motion 自己的素材（引擎內建角色的頭像等）。
const PROJECTS = {};
const projectsFile = path.join(PROJECT, "projects.local.json");
const globFiles = (root, pattern) => {
  // 只支援「*」代表一層資料夾或檔名的一部分
  const parts = pattern.split("/");
  let cur = [root];
  for (const [i, part] of parts.entries()) {
    const re = new RegExp("^" + part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    const next = [];
    for (const dir of cur) {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      for (const name of fs.readdirSync(dir)) if (re.test(name)) next.push(path.join(dir, name));
    }
    cur = i === parts.length - 1 ? next.filter((f) => fs.statSync(f).isFile()) : next;
  }
  return cur;
};
const externalInputs = [];
if (fs.existsSync(projectsFile)) {
  for (const root of JSON.parse(fs.readFileSync(projectsFile, "utf8")).projects ?? []) {
    const cfgFile = path.join(root, "superbot.project.json");
    if (!fs.existsSync(cfgFile)) { console.warn(`外部專案沒有 superbot.project.json：${root}`); continue; }
    const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
    PROJECTS[cfg.name] = root;
    for (const pat of cfg.lists ?? []) externalInputs.push(...globFiles(root, pat));
  }
  if (Object.keys(PROJECTS).length) console.log(`外部專案：${Object.entries(PROJECTS).map(([n, r]) => `${n}（${r}）`).join("、")}，清單 ${externalInputs.length} 份`);
}
const sourceOf = (rel) => {
  const m = /^@([^/]+)\/(.+)$/.exec(rel);
  if (!m) {
    const src = path.join(LIB_ROOT, rel);
    const old = path.join(OLD_LIB_ROOT, rel);
    if (!fs.existsSync(src) && fs.existsSync(old)) { fromOldLib.push(rel); return old; }
    return src;
  }
  // "@engine/…" = 這個專案自己的素材（例如 assets/generated/leijun_avatar.png）
  if (m[1] === "engine") return path.join(PROJECT, m[2]);
  return PROJECTS[m[1]] ? path.join(PROJECTS[m[1]], m[2]) : null;
};

const inputs = process.argv.slice(2);
if (!inputs.length) {
  // 預設：素材清單 + 舞台編輯器存的舞台 + 時間軸 + 動作庫（道具）+ 外部專案的清單，用到的素材都複製
  inputs.push(path.join(PROJECT, "assets.list.json"), ...STAGE_FILES, ...listJson(path.join(PROJECT, "timelines")), ...listJson(path.join(PROJECT, "assets", "actions")), ...externalInputs);
}
const wanted = new Set();
for (const f of inputs) collect(f).forEach((p) => wanted.add(p));

const character = JSON.parse(fs.readFileSync(HOST_POSES, "utf8"));
delete character._comment;
const legacyPoses = [];
for (const pose of character.poses) {
  const svg = `${HOST_SVG}/${pose.name}.svg`;
  const png = `${HOST_LEGACY}/${pose.name}.png`;
  const rel = fs.existsSync(path.join(PROJECT, svg)) ? svg : fs.existsSync(path.join(PROJECT, png)) ? png : null;
  if (!rel) { console.warn(`警告：主持人姿勢「${pose.name}」沒有圖檔（${svg} 或 ${png}），略過`); continue; }
  if (rel === png) legacyPoses.push(pose.name);
  [pose.width, pose.height] = imageSize(path.join(PROJECT, rel));
  pose.file = `@engine/${rel}`;
  wanted.add(pose.file);
}
character.poses = character.poses.filter((p) => p.file);
if (legacyPoses.length) console.log(`主持人：${character.poses.length} 個姿勢，其中 ${legacyPoses.length} 個還沒有 SVG、暫用 PNG：${legacyPoses.join("、")}`);

const meta = {};
const errors = [];
for (const rel of wanted) {
  const src = sourceOf(rel);
  if (!src) { errors.push(`素材「${rel}」指向未登記的外部專案（projects.local.json）`); continue; }
  if (!fs.existsSync(src)) { errors.push(`找不到素材：${rel}`); continue; }
  const dst = path.join(PUBLIC_LIB, rel);
  mkdirp(path.dirname(dst));
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst);
  const [w, h] = imageSize(src);
  const m = { w, h, kind: "single" };
  // 動畫條：檔名帶「(寬x高)」就照它切格（例如 Checkpoint (Flag Idle)(64x64).png = 640×64 → 10 格）
  const fm = path.basename(rel).match(/\((\d+)x(\d+)\)/);
  if (fm) {
    const [fw, fh] = [+fm[1], +fm[2]];
    if (w % fw === 0 && h % fh === 0 && (w > fw || h > fh)) {
      Object.assign(m, { kind: "anim", cols: w / fw, rows: h / fh, frameW: fw, frameH: fh, frames: (w / fw) * (h / fh) });
    }
  }
  meta[rel] = m;
}

mkdirp(GENERATED);
fs.writeFileSync(path.join(GENERATED, "asset-meta.json"), JSON.stringify(meta, null, 1));
fs.writeFileSync(path.join(GENERATED, "character.json"), JSON.stringify(character, null, 1));
// 舞台編輯器存的舞台彙整成一份，讓 Remotion 直接 import
const stages = {};
for (const f of STAGE_FILES) {
  const spec = JSON.parse(fs.readFileSync(f, "utf8"));
  // 3D 背景有循環版（scripts/bg3d-loop.mjs 產生）時，影片裡改播循環版（燈光閃爍）
  if (spec.bg3d?.image) {
    const loopDir = spec.bg3d.image.replace(/\.png$/i, "-loop");
    const lj = path.join(PROJECT, "public", loopDir, "loop.json");
    if (fs.existsSync(lj)) spec.bg3d.loop = { dir: loopDir, ...JSON.parse(fs.readFileSync(lj, "utf8")) };
  }
  stages[spec.name || path.basename(f, ".json")] = spec;
}
fs.writeFileSync(path.join(GENERATED, "stages.json"), JSON.stringify(stages, null, 1));
if (STAGE_FILES.length) console.log(`舞台：${Object.keys(stages).join("、")}`);
console.log(`已複製 ${Object.keys(meta).length} 張素材到 public/lib/，meta 寫入 src/generated/asset-meta.json`);
if (fromOldLib.length) console.warn(`警告：${fromOldLib.length} 張素材新素材庫沒有，暫時從舊素材庫（${OLD_LIB_ROOT}）複製。新影片不要用這些：\n  ${fromOldLib.join("\n  ")}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
