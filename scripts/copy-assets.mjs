// 把用到的素材從素材庫複製到 public/lib/（保留相對路徑），並產生 src/generated/asset-meta.json。
// 素材庫和索引只讀，不寫入。
// 用法：node scripts/copy-assets.mjs [清單或鎖定版 JSON ...]（預設 assets.list.json）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIB_ROOT = "D:/桌面/PixelSRPG-Forge-main";
const INVENTORY = "D:/桌面/asset_index/inventory.csv";
const HOST_DIR = "Me_我的像素人物";
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_LIB = path.join(PROJECT, "public", "lib");
const GENERATED = path.join(PROJECT, "src", "generated");

// 簡單的 CSV 解析（支援雙引號欄位）
function parseLine(line) {
  const out = [];
  const re = /("(?:[^"]|"")*"|[^,]*)(,|$)/g;
  let m;
  while ((m = re.exec(line))) {
    const v = m[1];
    out.push(v.startsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v);
    if (!m[2]) break;
  }
  return out;
}

function parseCsv(text) {
  const rows = text.split(/\r?\n/).filter(Boolean).map(parseLine);
  const [head, ...body] = rows;
  head[0] = head[0].replace(/^\uFEFF/, "");
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

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
const inputs = process.argv.slice(2);
if (!inputs.length) {
  // 預設：素材清單 + 舞台編輯器存的舞台 + 時間軸 + 動作庫（道具），用到的素材都複製
  inputs.push(path.join(PROJECT, "assets.list.json"), ...STAGE_FILES, ...listJson(path.join(PROJECT, "timelines")), ...listJson(path.join(PROJECT, "assets", "actions")));
}
const wanted = new Set();
for (const f of inputs) collect(f).forEach((p) => wanted.add(p));

const character = JSON.parse(fs.readFileSync(path.join(LIB_ROOT, HOST_DIR, "character.json"), "utf8"));
for (const pose of character.poses) wanted.add(`${HOST_DIR}/${pose.file}`);

const inv = new Map(parseCsv(fs.readFileSync(INVENTORY, "utf8")).map((r) => [r.path, r]));
const meta = {};
const errors = [];
for (const rel of wanted) {
  const src = path.join(LIB_ROOT, rel);
  if (!fs.existsSync(src)) { errors.push(`找不到素材：${rel}`); continue; }
  const r = inv.get(rel);
  if (r && r.keep === "0") console.warn(`警告：inventory 標記為不保留（keep=0）：${rel}`);
  if (r && r.kind === "sheet") console.warn(`警告：這是合集圖（kind=sheet）：${rel}`);
  const dst = path.join(PUBLIC_LIB, rel);
  mkdirp(path.dirname(dst));
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst);
  const [w, h] = pngSize(src);
  const m = { w, h, kind: r?.kind ?? "single" };
  if (r?.kind === "anim") {
    Object.assign(m, {
      cols: +r.cols, rows: +r.rows, frameW: +r.frame_w, frameH: +r.frame_h,
      frames: +(r.anim_frames || +r.cols * +r.rows),
    });
  }
  // 檔名帶「(寬x高)」時以檔名為準：inventory 的自動偵測偶爾會把兩格併成一格（例如 Slime 44x30 被判成 88x30）
  const fm = path.basename(rel).match(/\((\d+)x(\d+)\)/);
  if (fm) {
    const [fw, fh] = [+fm[1], +fm[2]];
    if (w % fw === 0 && h % fh === 0 && (w > fw || h > fh)) {
      const fixed = { kind: "anim", cols: w / fw, rows: h / fh, frameW: fw, frameH: fh, frames: (w / fw) * (h / fh) };
      if (m.kind === "anim" && (m.frameW !== fw || m.frameH !== fh)) {
        console.warn(`修正動畫格子：${rel}\n  inventory ${m.frameW}x${m.frameH}×${m.cols} → 檔名 ${fw}x${fh}×${fixed.cols}`);
      }
      Object.assign(m, fixed);
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
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
