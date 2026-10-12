// 主持人說話骨架：把 assets/host-svg/<pose>_parts.svg（像素轉 SVG 工具的分部位輸出）
// 拆成「身體 / 會動的部位 / 部位移開後露出的底色 / 嘴型」，寫入 src/generated/host-rigs.json，給 src/components/HostRig.tsx 用。
// 新增或修改 RIGS 後執行：node scripts/host-rig.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(PROJECT, "assets", "host-svg");
const OUT = path.join(PROJECT, "src", "generated", "host-rigs.json");

const rect = (x0, y0, x1, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
};

/**
 * 每個姿勢的骨架設定（座標 = SVG 原生像素，左上角為原點）。
 * - hand：握麥克風的手＋麥克風，說話時一起上下輕微動（往上 1 像素）
 * - mouth：嘴型，[closed 不畫, 半開, 張開]，每格是 { "x,y": 顏色 }
 */
const RIGS = {
  full_mic_hold: {
    hand: [
      ...rect(9, 25, 11, 25), // 麥克風頭頂
      ...rect(8, 26, 12, 28), // 麥克風頭（含左右黑邊）
      ...rect(8, 29, 11, 30), // 麥克風握柄
      ...rect(6, 31, 11, 35), // 左手（畫面左）
    ],
    mouth: [
      {},
      { "10,23": "#5a2b26", "11,23": "#5a2b26", "12,23": "#a66950" },
      { "10,23": "#3b1a17", "11,23": "#3b1a17", "12,23": "#5a2b26", "10,24": "#a66950", "11,24": "#c96f63", "12,24": "#cd8a66" },
    ],
  },
};

// 解析 SVG：只吃工具輸出的矩形路徑（M x y H x2 V y2 H x Z）
function readPixels(file) {
  const s = fs.readFileSync(file, "utf8");
  const [, vw, vh] = /viewBox="0 0 (\d+) (\d+)"/.exec(s);
  const px = new Map();
  for (const m of s.matchAll(/<path fill="(#[0-9a-fA-F]{6})" d="([^"]+)"/g)) {
    for (const r of m[2].matchAll(/M(\d+) (\d+)H(\d+)V(\d+)H\d+Z/g)) {
      const [x0, y0, x1, y1] = r.slice(1).map(Number);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set(`${x},${y}`, m[1]);
    }
  }
  return { w: +vw, h: +vh, px };
}

// { "x,y": 顏色 } → [{ fill, d }]（同色合併成一條路徑）
function toPaths(map) {
  const byFill = new Map();
  for (const [k, fill] of map) {
    const [x, y] = k.split(",");
    byFill.set(fill, (byFill.get(fill) ?? "") + `M${x} ${y}h1v1h-1Z`);
  }
  return [...byFill].map(([fill, d]) => ({ fill, d }));
}

const out = {};
for (const [pose, rig] of Object.entries(RIGS)) {
  const file = path.join(SRC_DIR, `${pose}_parts.svg`);
  if (!fs.existsSync(file)) throw new Error(`找不到 ${path.relative(PROJECT, file)}`);
  const { w, h, px } = readPixels(file);
  const handKeys = new Set(rig.hand.map(([x, y]) => `${x},${y}`).filter((k) => px.has(k)));
  const hand = new Map([...handKeys].map((k) => [k, px.get(k)]));
  // 手往上移 1 像素時，最下面一排會露出來：用它正下方的顏色補（外套、領帶…）
  const backfill = new Map();
  for (const k of handKeys) {
    const [x, y] = k.split(",").map(Number);
    const below = `${x},${y + 1}`;
    if (!handKeys.has(below)) backfill.set(k, px.get(below) ?? px.get(k));
  }
  out[pose] = {
    w,
    h,
    body: toPaths(px),
    hand: toPaths(hand),
    backfill: toPaths(backfill),
    mouth: rig.mouth.map((m) => toPaths(new Map(Object.entries(m)))),
  };
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`主持人說話骨架：${Object.keys(out).join("、")} → src/generated/host-rigs.json`);
