// 組件庫自帶的圖（主持人姿勢 SVG、assets.list.json 裡的 @engine/… 圖）→ src/generated/builtin-assets.ts。
// 用 import 打包進組件庫，別的影片專案引用 superbot-motion 時不必複製這些圖（見 src/lib/assets.tsx）。
// 在 copy-assets.mjs 之後跑（主持人姿勢清單和尺寸取自它產生的 character.json）。
import fs from "node:fs";
import path from "node:path";
import { ENGINE_ROOT, imageSize } from "./asset-core.mjs";

const GENERATED = path.join(ENGINE_ROOT, "src", "generated");
const entries = new Map(); // "@engine/<rel>" → { w, h }

for (const p of JSON.parse(fs.readFileSync(path.join(GENERATED, "character.json"), "utf8")).poses) {
  entries.set(p.file, { w: p.width, h: p.height });
}
for (const rel of JSON.parse(fs.readFileSync(path.join(ENGINE_ROOT, "assets.list.json"), "utf8")).paths ?? []) {
  if (!rel.startsWith("@engine/") || entries.has(rel)) continue;
  const file = path.join(ENGINE_ROOT, rel.slice("@engine/".length));
  if (!fs.existsSync(file) || !/\.(png|svg)$/i.test(file)) { console.warn(`內建素材不存在或不是圖：${rel}`); continue; }
  const [w, h] = imageSize(file);
  entries.set(rel, { w, h });
}

const keys = [...entries.keys()].sort();
const lines = [
  "// 自動產生（node scripts/builtin-assets.mjs），不要手改。組件庫自帶的圖：用 import 打包，任何專案都能用。",
  '/// <reference path="../lib/modules.d.ts" />',
  ...keys.map((k, i) => `import a${i} from ${JSON.stringify("../../" + k.slice("@engine/".length))};`),
  "",
  "export const BUILTIN_URLS: Record<string, string> = {",
  ...keys.map((k, i) => `  ${JSON.stringify(k)}: a${i},`),
  "};",
  "",
  'export const BUILTIN_META: Record<string, { w: number; h: number; kind: "single" }> = {',
  ...keys.map((k) => `  ${JSON.stringify(k)}: { w: ${entries.get(k).w}, h: ${entries.get(k).h}, kind: "single" },`),
  "};",
  "",
];
fs.writeFileSync(path.join(GENERATED, "builtin-assets.ts"), lines.join("\n"));
console.log(`組件庫內建圖：${keys.length} 張 → src/generated/builtin-assets.ts`);
