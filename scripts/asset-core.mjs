// 素材處理的共用邏輯：引擎的 scripts/copy-assets.mjs 和影片專案用的 bin/superbot-assets.mjs 都用這裡。
// 素材庫只讀，不寫入。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LIB_ROOT = "D:/桌面/素材庫/PixelSRPG-Forge-main";
// 過渡用：舊的範例、舞台、pixel_Apply 還引用舊素材庫的檔案。新庫找不到時才回舊庫找，並列出警告；新影片只用新庫。
export const OLD_LIB_ROOT = "D:/桌面/PixelSRPG-Forge-main";

// Node 22.9 在 Windows 上對含「【】」等字元的路徑呼叫 mkdirSync({recursive:true}) 會直接崩潰，改成逐層建立
export function mkdirp(dir) {
  let cur = "";
  for (const part of path.resolve(dir).split(path.sep)) {
    cur = cur ? cur + path.sep + part : part + path.sep;
    if (!fs.existsSync(cur)) fs.mkdirSync(cur);
  }
}

export function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`不是 PNG：${file}`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// SVG 的尺寸取 viewBox（svg_host 的 viewBox 就是原圖像素座標）
export function svgSize(file) {
  const m = /viewBox="\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(fs.readFileSync(file, "utf8"));
  if (!m) throw new Error(`SVG 沒有 viewBox：${file}`);
  return [Math.round(+m[1]), Math.round(+m[2])];
}

export const imageSize = (file) => (/\.svg$/i.test(file) ? svgSize(file) : pngSize(file));

// ── 動畫素材的預設播放（素材清單的參數表）；時間軸可用 animFps / play 覆蓋。依路徑前綴比對，先符合先用 ──
const ANIM_DEFAULTS = [
  ["Sprite Sheet/獎杯/", { fps: 12, play: "once" }],
  ["Sprite Sheet/飄動的旗子/", { fps: 10 }],
  ["Sprite Sheet/木頭石塊障礙物/", { fps: 5 }],
  ["Sprite Sheet/石塊障礙物/", { fps: 5 }],
  ["Sprite Sheet/粒子特效/", { fps: 12 }],
  ["Seamless Loop/flag", { fps: 10 }],
  ["Seamless Loop/Flag_Blue", { fps: 10 }],
  ["Seamless Loop/Flag_Red", { fps: 10 }],
  ["Seamless Loop/rotationalCoin", { fps: 8 }],
  ["Seamless Loop/轉動金幣", { fps: 6 }],
  ["Seamless Loop/向日葵", { fps: 2 }],
  ["Seamless Loop/果樹", { fps: 1 }],
  ["Seamless Loop/棕色書翻頁", { fps: 12 }],
  ["Seamless Loop/灰色書翻頁", { fps: 12 }],
  ["Seamless Loop/紅寶石", { fps: 6 }],
  ["Seamless Loop/黃寶石", { fps: 6 }],
  ["Seamless Loop/紫寶石", { fps: 6 }],
  ["Seamless Loop/透明寶石", { fps: 6 }],
  ["Seamless Loop/紅色寶箱", { fps: 8, play: "once" }],
  ["Seamless Loop/胡蘿蔔", { fps: 4 }],
  ["Seamless Loop/進度條", { fps: 8 }],
  ["氣泡_心情表示_數字/氣泡/", { fps: 8 }],
];
export const animDefaults = (rel) => ANIM_DEFAULTS.find(([p]) => rel.startsWith(p))?.[1] ?? {};

// 影格順序：檔名裡最後一段數字由小到大（不能用字串排序：Flag_blue10 會排到 Flag_blue2 前面）。檔名沒有數字的組別寫固定順序
const FIXED_ORDER = { "Seamless Loop/果樹": ["枯樹.png", "結滿果實.png"] };
const frameNumber = (name) => { const m = name.match(/(\d+)(?!.*\d)/); return m ? +m[1] : NaN; };
export function sortFrames(rel, files) {
  const fixed = FIXED_ORDER[rel.replace(/\/$/, "")];
  if (fixed) return [...fixed.filter((f) => files.includes(f)), ...files.filter((f) => !fixed.includes(f)).sort()];
  return [...files].sort((a, b) => {
    const [na, nb] = [frameNumber(a), frameNumber(b)];
    if (Number.isNaN(na) || Number.isNaN(nb)) return Number.isNaN(na) - Number.isNaN(nb) || a.localeCompare(b);
    return na - nb || a.localeCompare(b);
  });
}
// 資料夾素材：裡面的 PNG；資料夾裡沒有 PNG、只有一個子資料夾時往下找（Flag_Blue/Frames/）
export function loopDir(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  const pngs = ents.filter((e) => e.isFile() && /\.png$/i.test(e.name)).map((e) => e.name);
  if (pngs.length) return { dir, files: pngs, sub: "" };
  const subs = ents.filter((e) => e.isDirectory());
  if (subs.length === 1) { const r = loopDir(path.join(dir, subs[0].name)); return { ...r, sub: subs[0].name + "/" + r.sub }; }
  return null;
}

// ── 不能直接用的檔案（素材清單第 2、6 節）：改用 scripts/fix-exceptions.py 處理過的版本（引擎的 assets/generated/）──
export const REPLACED = {
  "Sprite Sheet/粒子特效/Flashing particles.png": "assets/generated/flashing_particles", // 不等距 → 切成 8 格、去深底
  "小素材/食物/103.png": "assets/generated/food_103.png", // 白底 → 去背
  "技能圖標/加速_提升_跑步.png": "assets/generated/skill_speed_up.png", // 無透明 → 外框四角去背
};
export const REJECTED = { "小素材/金幣.jfif": "這是照片不是像素素材，不要用在畫面裡（金幣請用 Seamless Loop/rotationalCoin 或 轉動金幣）" };

// 收集要複製的路徑：清單檔的 paths，或 JSON 裡所有 "asset" 字串
export function collect(file) {
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

const copyIfChanged = (src, dst) => {
  mkdirp(path.dirname(dst));
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst);
};

/**
 * 處理一個素材：複製到 outRoot/<rel>（資料夾素材逐格複製），回傳 asset-meta 條目。
 * raw = 原始寫法（可能帶結尾 /）；src = 來源檔或資料夾（已解析好、確定存在）；replaced = 是否為處理版。
 * 回傳 { meta } 或 { error }。
 */
export function processAsset(raw, src, outRoot, replaced = false) {
  const rel = raw.replace(/\/+$/, "");
  // 資料夾 = 一格一張 PNG 的循環動畫（Seamless Loop、氣泡）。影格複製到 <out>/<rel>/…；處理版另放 <rel>.frames/
  if (fs.statSync(src).isDirectory()) {
    const found = loopDir(src);
    if (!found) return { error: `素材資料夾「${rel}」裡沒有 PNG` };
    const outDir = replaced ? `${rel}.frames` : rel;
    const frames = sortFrames(rel, found.files).map((f) => {
      const [w, h] = pngSize(path.join(found.dir, f));
      copyIfChanged(path.join(found.dir, f), path.join(outRoot, outDir, found.sub, f));
      return { src: `${outDir}/${found.sub}${f}`, w, h };
    });
    // w / h = 所有影格的最大寬高（播放框）；每格在框內底部置中
    return { meta: { w: Math.max(...frames.map((f) => f.w)), h: Math.max(...frames.map((f) => f.h)), kind: "loop", frames, ...animDefaults(rel) } };
  }
  if (!/\.(png|svg)$/i.test(src)) return { error: `素材「${rel}」不是 PNG / SVG，引擎不支援` };
  copyIfChanged(src, path.join(outRoot, rel));
  const [w, h] = imageSize(src);
  const m = { w, h, kind: "single", ...animDefaults(rel) };
  // 動畫條：檔名帶「(寬x高)」就照它切格（例如 Checkpoint (Flag Idle)(64x64).png = 640×64 → 10 格）
  const fm = path.basename(rel).match(/\((\d+)x(\d+)\)/);
  if (fm) {
    const [fw, fh] = [+fm[1], +fm[2]];
    if (w % fw === 0 && h % fh === 0 && (w > fw || h > fh)) {
      Object.assign(m, { kind: "anim", cols: w / fw, rows: h / fh, frameW: fw, frameH: fh, frames: (w / fw) * (h / fh) });
    }
  }
  return { meta: m };
}
