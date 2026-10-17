#!/usr/bin/env node
// superbot-assets —— 在影片專案裡執行：把本專案用到的素材從素材庫複製到本專案的 public/lib/，產生本專案的 asset-meta.json。
// 用法（影片專案根目錄）：npx superbot-assets [要掃的檔案 ...]
//
// 設定（可省略）：專案根目錄的 superbot.assets.json
//   {
//     "library": "D:/桌面/素材庫/PixelSRPG-Forge-main",   素材庫（只讀）
//     "scan": ["assets.list.json", "src/**/*.json", "src/**/*.tsx"],  要掃哪些檔案找素材 path
//     "out": "public/lib",                                 素材複製到哪（<AssetProvider base> 對應 public/ 底下的部分）
//     "meta": "src/asset-meta.json"                        asset-meta 寫到哪（給 <AssetProvider meta> / TimelinePlayer assetMeta）
//   }
// 找素材 path 的規則：
//   - JSON：清單的 "paths": [...]、任何物件的 "asset"、Act 事件的 "prop"（.png）
//   - .ts / .tsx：asset="…"、asset: "…"
// path 的寫法：
//   - 素材庫相對路徑，例如 "Seamless Loop/rotationalCoin"（資料夾 = 一格一張 PNG 的循環動畫）
//   - "@project/<本專案內的相對路徑>"：本專案自製的圖（例如 assets/generated/tag.png）
//   - "@engine/…"：組件庫自帶的圖（主持人姿勢等），已打包在庫裡，不複製
import fs from "node:fs";
import path from "node:path";
import { collect, ENGINE_ROOT, LIB_ROOT, mkdirp, OLD_LIB_ROOT, processAsset, REJECTED, REPLACED } from "../scripts/asset-core.mjs";

const argv = process.argv.slice(2);
const rootArg = argv.find((a) => a.startsWith("--root="));
const ROOT = path.resolve(rootArg ? rootArg.slice(7) : process.cwd());
const files = argv.filter((a) => !a.startsWith("--"));

const cfgFile = path.join(ROOT, "superbot.assets.json");
const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
const LIBRARY = cfg.library ?? LIB_ROOT;
const OUT = path.join(ROOT, cfg.out ?? "public/lib");
const META_FILE = path.join(ROOT, cfg.meta ?? "src/asset-meta.json");
const SCAN = cfg.scan ?? ["assets.list.json", "src/**/*.json", "src/**/*.ts", "src/**/*.tsx", "timelines/**/*.json"];

// 「*」= 一層裡的任意字元，「**」= 任意層資料夾
function glob(pattern) {
  const parts = pattern.split("/");
  const out = [];
  const walk = (dir, i) => {
    if (i === parts.length) return;
    const part = parts[i];
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    if (part === "**") {
      walk(dir, i + 1);
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".")) walk(path.join(dir, e.name), i);
      }
      return;
    }
    const re = new RegExp("^" + part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!re.test(e.name)) continue;
      const p = path.join(dir, e.name);
      if (i === parts.length - 1) { if (e.isFile()) out.push(p); } else if (e.isDirectory()) walk(p, i + 1);
    }
  };
  walk(ROOT, 0);
  return out;
}

const inputs = files.length ? files.map((f) => path.resolve(ROOT, f)) : [...new Set(SCAN.flatMap(glob))];
const wanted = new Set();
for (const f of inputs) {
  if (path.resolve(f) === META_FILE) continue;
  if (/\.json$/i.test(f)) {
    try { collect(f).forEach((p) => wanted.add(p)); } catch (e) { console.warn(`略過（不是合法 JSON）：${path.relative(ROOT, f)}`); }
  } else if (/\.tsx?$/i.test(f)) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(/\basset\s*[:=]\s*\{?\s*["'`]([^"'`$]+)["'`]/g)) wanted.add(m[1]);
  }
}

// 動作庫內建的道具（掰書的書、遞錢的金幣、放下獎盃的獎盃…）：時間軸只寫動作名，這裡把動作檔裡的道具一起複製
const ACTIONS_DIR = path.join(ENGINE_ROOT, "assets", "actions");
for (const f of fs.existsSync(ACTIONS_DIR) ? fs.readdirSync(ACTIONS_DIR) : []) {
  if (!f.endsWith(".json")) continue;
  const a = JSON.parse(fs.readFileSync(path.join(ACTIONS_DIR, f), "utf8"));
  for (const p of a.props ?? []) {
    if (p.asset) wanted.add(p.asset);
    for (const s of p.swap ?? []) if (s.asset) wanted.add(s.asset);
  }
}

// 組件庫自帶的圖（src/generated/builtin-assets.ts 的 key）
const BUILTIN = new Set([...fs.readFileSync(path.join(ENGINE_ROOT, "src", "generated", "builtin-assets.ts"), "utf8").matchAll(/^\s*"(@engine\/[^"]+)": a\d+,/gm)].map((m) => m[1]));

const meta = {};
const errors = [];
const fromOldLib = [];
let builtin = 0;
for (const raw of wanted) {
  const rel = raw.replace(/\/+$/, "");
  if (BUILTIN.has(rel)) { builtin++; continue; }
  if (REJECTED[rel]) { errors.push(`素材「${rel}」：${REJECTED[rel]}`); continue; }
  let src;
  if (REPLACED[rel]) src = path.join(ENGINE_ROOT, REPLACED[rel]);
  else if (rel.startsWith("@project/")) src = path.join(ROOT, rel.slice("@project/".length));
  else if (rel.startsWith("@engine/")) src = path.join(ENGINE_ROOT, rel.slice("@engine/".length));
  else if (rel.startsWith("@")) { errors.push(`素材「${rel}」：不認得的前綴（只支援 @project/、@engine/）`); continue; }
  else src = path.join(LIBRARY, rel);
  // 新素材庫沒有的（動作庫內建道具等），暫時從舊素材庫複製（和 scripts/copy-assets.mjs 一樣）
  if (!fs.existsSync(src) && !rel.startsWith("@") && fs.existsSync(path.join(OLD_LIB_ROOT, rel))) {
    src = path.join(OLD_LIB_ROOT, rel);
    fromOldLib.push(rel);
  }
  if (!fs.existsSync(src)) { errors.push(`找不到素材：${rel}（${src}）`); continue; }
  const r = processAsset(raw, src, OUT, !!REPLACED[rel]);
  if (r.error) { errors.push(r.error); continue; }
  meta[rel] = r.meta;
  if (raw !== rel && r.meta.kind === "loop") meta[raw] = r.meta;
}

mkdirp(path.dirname(META_FILE));
fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 1));
console.log(`掃了 ${inputs.length} 個檔案；複製 ${Object.keys(meta).length} 個素材到 ${path.relative(ROOT, OUT) || "."}，meta → ${path.relative(ROOT, META_FILE)}${builtin ? `（${builtin} 個是組件庫自帶，不必複製）` : ""}`);
if (fromOldLib.length) console.warn(`注意：${fromOldLib.length} 張素材新素材庫沒有，從舊素材庫（${OLD_LIB_ROOT}）複製（動作庫內建道具）`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
