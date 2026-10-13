// 角色骨架 + 動作庫：assets/actors/<id>/（rig.json、costumes.json、各視角 SVG）與 assets/actions/<動作>.json
// → src/generated/actors.json、src/generated/actions.json，給 src/actor/ 用。
// npm run assets 會自動執行；單獨跑：node scripts/actors.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTORS_DIR = path.join(PROJECT, "assets", "actors");
const ACTIONS_DIR = path.join(PROJECT, "assets", "actions");
const GENERATED = path.join(PROJECT, "src", "generated");
const errors = [];
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// 分部位 SVG（像素轉 SVG 工具的 *_parts.svg）→ { w, h, parts: { id: Map("x,y" → 顏色) } }
function readPartsSvg(file) {
  const s = fs.readFileSync(file, "utf8");
  const [, vw, vh] = /viewBox="0 0 (\d+) (\d+)"/.exec(s);
  const parts = {};
  for (const g of s.matchAll(/<g id="([a-z_]+)"[^>]*>([\s\S]*?)<\/g>/g)) {
    const px = (parts[g[1]] = new Map());
    for (const m of g[2].matchAll(/<path fill="(#[0-9a-fA-F]{6})" d="([^"]+)"/g)) {
      for (const r of m[2].matchAll(/M(\d+) (\d+)H(\d+)V(\d+)H\d+Z/g)) {
        const [x0, y0, x1, y1] = r.slice(1).map(Number);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set(`${x},${y}`, m[1].toLowerCase());
      }
    }
  }
  return { w: +vw, h: +vh, parts };
}

const shade = (hex, k) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");

function buildView(actorId, viewId, v, dir) {
  const where = `${actorId}/${viewId}`;
  const svg = readPartsSvg(path.join(dir, v.svg));
  const claimed = new Set();
  const out = new Map();
  for (const b of v.bones) {
    const px = [];
    if (b.clone) {
      const src = out.get(b.clone);
      if (!src) errors.push(`[${where}] ${b.id}：clone 的「${b.clone}」要先列`);
      else for (const [x, y, c] of src.px) px.push([x, y, b.shade ? shade(c, b.shade) : c]);
    }
    for (const t of b.take ?? []) {
      const [x0, y0, x1, y1] = t.rect ?? [-1e9, -1e9, 1e9, 1e9];
      for (const part of t.parts) {
        const m = svg.parts[part];
        if (!m) continue; // 這個視角沒有這個部位（例如側面沒有 hand_right）
        for (const [k, c] of m) {
          if (claimed.has(k)) continue;
          const [x, y] = k.split(",").map(Number);
          if (x < x0 || x > x1 || y < y0 || y > y1) continue;
          claimed.add(k);
          px.push([x, y, c]);
        }
      }
    }
    for (const p of b.pixels ?? []) px.push([p[0], p[1], p[2].toLowerCase()]);
    // fill：骨頭底下的補色（例如側面手臂抬起後露出的身體），只畫在骨頭本身沒有像素的地方
    const fill = [];
    for (const [x0, y0, x1, y1, c] of b.fill ?? []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fill.push([x, y, c.toLowerCase()]);
    if (!px.length && !b.hidden) errors.push(`[${where}] 骨頭 ${b.id} 沒有任何像素`);
    out.set(b.id, { id: b.id, parent: b.parent ?? "root", pivot: b.pivot, sign: b.sign ?? 1, hidden: !!b.hidden, px, fill });
  }
  // 沒被任何骨頭認領的像素 = 骨架設定漏了
  for (const [part, m] of Object.entries(svg.parts)) {
    const left = [...m.keys()].filter((k) => !claimed.has(k));
    if (left.length) errors.push(`[${where}] 部位 ${part} 有 ${left.length} 個像素沒有骨頭認領（例如 ${left.slice(0, 3).join(" ")}）`);
  }
  const ids = new Set(["root", ...out.keys()]);
  for (const b of out.values()) if (!ids.has(b.parent)) errors.push(`[${where}] ${b.id} 的 parent「${b.parent}」不存在`);
  for (const z of v.z) if (!out.has(z)) errors.push(`[${where}] z 裡的「${z}」不是骨頭`);
  for (const b of out.keys()) if (!v.z.includes(b)) errors.push(`[${where}] 骨頭 ${b} 沒有列在 z（不會被畫出來）`);
  for (const [name, s] of Object.entries(v.slots ?? {})) if (!out.has(s.bone)) errors.push(`[${where}] slot ${name} 的骨頭「${s.bone}」不存在`);
  return { w: svg.w, h: svg.h, root: v.root, bones: [...out.values()], z: v.z, slots: v.slots ?? {}, faces: v.faces ?? {}, mouths: v.mouths ?? [[]] };
}

const actors = {};
if (fs.existsSync(ACTORS_DIR)) {
  for (const id of fs.readdirSync(ACTORS_DIR)) {
    const dir = path.join(ACTORS_DIR, id);
    const rigFile = path.join(dir, "rig.json");
    if (!fs.existsSync(rigFile)) continue;
    const rig = readJson(rigFile);
    const views = {};
    for (const [vid, v] of Object.entries(rig.views)) views[vid] = buildView(id, vid, v, dir);
    const costumes = fs.existsSync(path.join(dir, "costumes.json")) ? readJson(path.join(dir, "costumes.json")) : {};
    delete costumes._comment;
    for (const c of Object.values(costumes))
      for (const list of Object.values(c.add ?? {})) for (const b of list) b.pixels = b.pixels.map(([x, y, col]) => [x, y, col.toLowerCase()]);
    actors[id] = { name: rig.name ?? id, views, costumes };
  }
}

// ── 動作庫 ──
const allBones = new Set(["root", "tag"]);
const allFaces = new Set(["normal"]);
for (const a of Object.values(actors))
  for (const v of Object.values(a.views)) {
    v.bones.forEach((b) => allBones.add(b.id));
    Object.keys(v.faces).forEach((f) => allFaces.add(f));
  }
const actions = {};
if (fs.existsSync(ACTIONS_DIR)) {
  for (const f of fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".json"))) {
    const name = path.basename(f, ".json");
    let a;
    try {
      a = readJson(path.join(ACTIONS_DIR, f));
    } catch (e) {
      errors.push(`動作 ${f}：JSON 格式錯誤 ${e.message}`);
      continue;
    }
    delete a._comment;
    if (a.name && a.name !== name) errors.push(`動作 ${f}：name「${a.name}」和檔名不同（時間軸用檔名）`);
    if (!(a.duration > 0)) errors.push(`動作 ${name}：缺少 duration`);
    const keySets = Array.isArray(a.keys) ? { all: a.keys } : a.keys ?? {};
    for (const [vk, keys] of Object.entries(keySets)) {
      for (const k of keys) {
        for (const b of Object.keys(k.pose ?? {})) if (!allBones.has(b)) errors.push(`動作 ${name}（${vk}）第 ${k.f} 幀：沒有骨頭「${b}」`);
        for (const b of [...(k.show ?? []), ...(k.hide ?? [])]) if (!allBones.has(b)) errors.push(`動作 ${name}：show/hide 的「${b}」不是骨頭`);
        if (k.face && !allFaces.has(k.face)) errors.push(`動作 ${name}：沒有表情「${k.face}」，可用：${[...allFaces].join("、")}`);
        if (k.f > a.duration) errors.push(`動作 ${name}：關鍵幀 ${k.f} 超過 duration ${a.duration}`);
      }
    }
    actions[name] = { ...a, name };
  }
}

fs.mkdirSync(GENERATED, { recursive: true });
fs.writeFileSync(path.join(GENERATED, "actors.json"), JSON.stringify(actors));
fs.writeFileSync(path.join(GENERATED, "actions.json"), JSON.stringify(actions, null, 1));
console.log(`角色：${Object.keys(actors).join("、") || "（無）"}；動作 ${Object.keys(actions).length} 個 → src/generated/actors.json、actions.json`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
