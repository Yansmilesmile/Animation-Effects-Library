// 8-bit 晶片風音效（程式合成，不用外部素材）：node scripts/make-sfx.mjs → assets/sfx/*.wav、sfx_preview.wav
// 44.1kHz 16-bit 單聲道。加新音效：在 SFX 表加一組（音符清單），在 NAMES 給它中文名，其他不用改。
// 另外產生 assets/sfx/index.json（名稱對照）和 src/generated/sfx.ts（時間軸 "sfx" 用，import 打包進組件庫）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "sfx");
const RATE = 44100;
/** 每個音效統一的響度（RMS）與峰值上限，頭尾淡入淡出（秒） */
const TARGET_RMS = 0.14;
const PEAK = 0.7;
const FADE = 0.004;
const GAP = 0.5;
/** 最短長度（秒），太短的後面補靜音 */
const MIN_LEN = 0.1;

const note = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI 音高 → Hz
const C5 = 72, E5 = 76, G5 = 79, A5 = 81, B5 = 83, C6 = 84, Cs6 = 85, D6 = 86, E6 = 88, G6 = 91, A6 = 93, B6 = 95;

/**
 * 一個音符：
 * at 開始（秒）、dur 長度（含 release）、wave square | triangle | noise、duty 方波佔空比、
 * freq 起始 Hz、to 結束 Hz（指數滑音，省略 = 不滑）、vol 相對音量、
 * adsr [attack, decay, sustain 0..1, release]（秒）、vibrato [Hz, 半音深度]
 */
const SFX = {
  // 點擊：極短的高音方波往下撥一下，墊一點雜訊當「喀」
  click: [
    { at: 0, dur: 0.035, wave: "square", duty: 0.5, freq: 1800, to: 900, vol: 1, adsr: [0.001, 0.03, 0, 0.004] },
    { at: 0, dur: 0.012, wave: "noise", freq: 8000, vol: 0.5, adsr: [0.001, 0.01, 0, 0.002] },
  ],
  // 彈出：窄方波快速上滑，像泡泡「啵」
  pop: [{ at: 0, dur: 0.13, wave: "square", duty: 0.25, freq: 260, to: 1100, vol: 1, adsr: [0.002, 0.1, 0.2, 0.03] }],
  // 金幣：經典兩音 B5 → E6，第二音拉長衰減
  coin: [
    { at: 0, dur: 0.075, wave: "square", duty: 0.5, freq: note(B5), vol: 1, adsr: [0.002, 0.02, 0.8, 0.005] },
    { at: 0.075, dur: 0.38, wave: "square", duty: 0.5, freq: note(E6), vol: 1, adsr: [0.002, 0.3, 0.15, 0.07] },
  ],
  // 錯誤：兩聲低沉方波，第二聲往下沉，加一點顫音和雜訊顆粒
  error: [
    { at: 0, dur: 0.12, wave: "square", duty: 0.5, freq: 196, vol: 1, adsr: [0.003, 0.02, 0.9, 0.02] },
    { at: 0.15, dur: 0.33, wave: "square", duty: 0.5, freq: 165, to: 82, vol: 1, adsr: [0.003, 0.05, 0.85, 0.08], vibrato: [14, 0.35] },
    { at: 0.15, dur: 0.33, wave: "noise", freq: 1200, vol: 0.18, adsr: [0.003, 0.05, 0.8, 0.08] },
  ],
  // 升級 / 獲得道具：C 大三和弦往上琶音兩個八度，最後一音停留；三角波墊低八度增加厚度
  levelup: [
    ...[C5, E5, G5, C6, E6].map((n, i) => ({ at: i * 0.06, dur: 0.07, wave: "square", duty: 0.25, freq: note(n), vol: 0.9, adsr: [0.002, 0.02, 0.7, 0.01] })),
    { at: 0.3, dur: 0.42, wave: "square", duty: 0.25, freq: note(G6), vol: 0.9, adsr: [0.002, 0.08, 0.5, 0.2], vibrato: [6, 0.15] },
    ...[C5, E5, G5, C6, E6, G6].map((n, i) => ({ at: i * 0.06, dur: i === 5 ? 0.42 : 0.07, wave: "triangle", freq: note(n - 12), vol: 0.6, adsr: [0.002, 0.03, 0.7, i === 5 ? 0.2 : 0.01] })),
  ],
  // 獲得道具：A 大三和弦快速四音上行，最後在 E6 / A6 之間顫動（和升級的長琶音區分）
  item: [
    ...[A5, Cs6, E6].map((n, i) => ({ at: i * 0.05, dur: 0.055, wave: "square", duty: 0.5, freq: note(n), vol: 0.9, adsr: [0.002, 0.02, 0.7, 0.008] })),
    ...Array.from({ length: 8 }, (_, i) => ({ at: 0.15 + i * 0.04, dur: 0.042, wave: "square", duty: 0.25, freq: note(i % 2 ? E6 : A6), vol: 0.85 * (1 - i * 0.07), adsr: [0.002, 0.01, 0.8, 0.006] })),
    { at: 0, dur: 0.47, wave: "triangle", freq: note(A5 - 24), vol: 0.5, adsr: [0.002, 0.1, 0.6, 0.12] },
  ],
  // 點亮：短促往上一撥接明亮的高叮（窄方波 + 高八度三角波泛音），快速衰減
  light: [
    { at: 0, dur: 0.03, wave: "square", duty: 0.25, freq: 900, to: 1800, vol: 0.6, adsr: [0.001, 0.025, 0.2, 0.004] },
    { at: 0.025, dur: 0.3, wave: "square", duty: 0.125, freq: note(A6), vol: 1, adsr: [0.001, 0.22, 0.05, 0.06] },
    { at: 0.025, dur: 0.3, wave: "triangle", freq: note(A6 + 12), vol: 0.5, adsr: [0.001, 0.15, 0.02, 0.06] },
  ],
  // 翻頁：雜訊往上刷再往下落兩段，像紙「唰—啪」
  page: [
    { at: 0, dur: 0.11, wave: "noise", freq: 1500, to: 7000, vol: 0.8, adsr: [0.03, 0.05, 0.4, 0.02] },
    { at: 0.1, dur: 0.06, wave: "noise", freq: 5000, to: 1800, vol: 1, adsr: [0.002, 0.04, 0.2, 0.01] },
  ],
  // 煙霧：短促的「噗」，雜訊從中頻往下沉，墊一點低音方波
  smoke: [
    { at: 0, dur: 0.2, wave: "noise", freq: 3500, to: 300, vol: 1, adsr: [0.004, 0.14, 0.1, 0.04] },
    { at: 0, dur: 0.12, wave: "square", duty: 0.5, freq: 140, to: 60, vol: 0.35, adsr: [0.003, 0.08, 0.1, 0.03] },
  ],
  // 計數：單個數字 tick（固定高音，極短），時間軸可重複觸發
  count: [{ at: 0, dur: 0.035, wave: "square", duty: 0.25, freq: note(C6 + 12), vol: 1, adsr: [0.001, 0.025, 0.3, 0.006] }],
  // 打字：單字 tick（雜訊顆粒 + 低一點的方波，比計數更乾更短）
  type: [
    { at: 0, dur: 0.018, wave: "noise", freq: 6000, vol: 0.9, adsr: [0.001, 0.014, 0, 0.003] },
    { at: 0, dur: 0.022, wave: "square", duty: 0.5, freq: 700, to: 500, vol: 0.5, adsr: [0.001, 0.018, 0, 0.003] },
  ],
  // 摔倒：顫抖著往下滑，落地兩下悶響（第二下彈起變小）
  fall: [
    { at: 0, dur: 0.3, wave: "square", duty: 0.5, freq: 900, to: 160, vol: 0.8, adsr: [0.003, 0.05, 0.85, 0.02], vibrato: [18, 0.6] },
    { at: 0.3, dur: 0.18, wave: "noise", freq: 900, to: 120, vol: 1, adsr: [0.001, 0.12, 0.1, 0.04] },
    { at: 0.3, dur: 0.2, wave: "triangle", freq: 110, to: 45, vol: 1, adsr: [0.001, 0.14, 0.1, 0.05] },
    { at: 0.46, dur: 0.1, wave: "noise", freq: 700, to: 150, vol: 0.45, adsr: [0.001, 0.07, 0.05, 0.02] },
    { at: 0.46, dur: 0.12, wave: "triangle", freq: 90, to: 45, vol: 0.5, adsr: [0.001, 0.08, 0.05, 0.03] },
  ],
  // 掉落：三角波從高處一路下墜（呼—），落地一聲短「咚」
  drop: [
    { at: 0, dur: 0.42, wave: "triangle", freq: 1600, to: 260, vol: 0.9, adsr: [0.01, 0.05, 0.9, 0.02] },
    { at: 0, dur: 0.42, wave: "square", duty: 0.125, freq: 1600, to: 260, vol: 0.25, adsr: [0.01, 0.05, 0.9, 0.02] },
    { at: 0.42, dur: 0.16, wave: "square", duty: 0.5, freq: 120, to: 50, vol: 0.8, adsr: [0.001, 0.1, 0.1, 0.04] },
    { at: 0.42, dur: 0.08, wave: "noise", freq: 1200, to: 200, vol: 0.7, adsr: [0.001, 0.05, 0.1, 0.02] },
  ],
  // 蓋章：先一聲小「喀」，接沉重的「碰」（低頻三角波 + 雜訊衝擊）
  stamp: [
    { at: 0, dur: 0.015, wave: "noise", freq: 7000, vol: 0.5, adsr: [0.001, 0.012, 0, 0.002] },
    { at: 0.02, dur: 0.1, wave: "noise", freq: 2000, to: 250, vol: 1, adsr: [0.001, 0.07, 0.1, 0.02] },
    { at: 0.02, dur: 0.24, wave: "triangle", freq: 160, to: 50, vol: 1, adsr: [0.001, 0.16, 0.1, 0.06] },
    { at: 0.02, dur: 0.08, wave: "square", duty: 0.5, freq: 110, to: 60, vol: 0.4, adsr: [0.001, 0.06, 0.1, 0.015] },
  ],
  // 翻牌：一下短刷（雜訊往上）接清脆的上滑小叮
  flip: [
    { at: 0, dur: 0.07, wave: "noise", freq: 2000, to: 9000, vol: 0.7, adsr: [0.015, 0.04, 0.3, 0.01] },
    { at: 0.07, dur: 0.12, wave: "square", duty: 0.25, freq: note(E6), to: note(B6), vol: 0.9, adsr: [0.001, 0.08, 0.2, 0.03] },
  ],
  // 解鎖：機械兩下「喀、喀」，再一聲上行兩音 G5 → D6
  unlock: [
    ...[0, 0.07].map((at) => ({ at, dur: 0.03, wave: "square", duty: 0.5, freq: 1300, to: 600, vol: 0.7, adsr: [0.001, 0.025, 0, 0.004] })),
    ...[0, 0.07].map((at) => ({ at, dur: 0.015, wave: "noise", freq: 6000, vol: 0.4, adsr: [0.001, 0.012, 0, 0.002] })),
    { at: 0.15, dur: 0.07, wave: "square", duty: 0.5, freq: note(G5), vol: 0.9, adsr: [0.002, 0.02, 0.8, 0.008] },
    { at: 0.22, dur: 0.3, wave: "square", duty: 0.5, freq: note(D6), vol: 0.9, adsr: [0.002, 0.2, 0.25, 0.08] },
  ],
  // 轉場：短刷「咻」，雜訊由低往高掃過，前段漸強
  swoosh: [
    { at: 0, dur: 0.26, wave: "noise", freq: 600, to: 9000, vol: 1, adsr: [0.12, 0.1, 0.3, 0.04] },
    { at: 0, dur: 0.26, wave: "triangle", freq: 200, to: 900, vol: 0.25, adsr: [0.12, 0.1, 0.3, 0.04] },
  ],
  // MISS：三聲往下掉的「哇、哇、哇——」，每聲自己也往下滑，最後一聲拉長抖動
  miss: [
    { at: 0, dur: 0.12, wave: "square", duty: 0.5, freq: note(E5), to: note(E5 - 1), vol: 1, adsr: [0.003, 0.03, 0.85, 0.02] },
    { at: 0.14, dur: 0.12, wave: "square", duty: 0.5, freq: note(E5 - 2), to: note(E5 - 3), vol: 1, adsr: [0.003, 0.03, 0.85, 0.02] },
    { at: 0.28, dur: 0.38, wave: "square", duty: 0.5, freq: note(E5 - 4), to: note(E5 - 9), vol: 1, adsr: [0.003, 0.05, 0.85, 0.12], vibrato: [7, 0.3] },
  ],
};

/** 中文名 → 檔名（分鏡寫中文名就能用；也接受檔名本身和簡體寫法） */
const NAMES = {
  點擊: "click", 彈出: "pop", 金幣: "coin", 錯誤: "error", 升級: "levelup", 獲得道具: "item",
  點亮: "light", 翻頁: "page", 煙霧: "smoke", 計數: "count", 打字: "type", 摔倒: "fall", 掉落: "drop",
  蓋章: "stamp", 翻牌: "flip", 解鎖: "unlock", 轉場: "swoosh", MISS: "miss",
};
const ALIASES = {
  点击: "點擊", 弹出: "彈出", 金币: "金幣", 错误: "錯誤", 升级: "升級", 获得道具: "獲得道具", 道具: "獲得道具",
  点亮: "點亮", 翻页: "翻頁", 烟雾: "煙霧", 计数: "計數", 盖章: "蓋章", 解锁: "解鎖", 转场: "轉場", miss: "MISS",
};

// ── 合成 ──
const envelope = ([a, d, s, r], t, dur) => {
  let e;
  if (t < a) e = t / a;
  else if (t < a + d) e = 1 - (1 - s) * ((t - a) / d);
  else e = s;
  const relStart = dur - r;
  if (t > relStart) e *= Math.max(0, 1 - (t - relStart) / r);
  return e;
};

/** 決定性雜訊（LFSR 風格的 sample-and-hold，freq = 換值頻率） */
const makeNoise = (seed) => {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
};

const render = (notes) => {
  const len = Math.ceil(Math.max(MIN_LEN, ...notes.map((n) => n.at + n.dur)) * RATE) + 1;
  const buf = new Float32Array(len);
  notes.forEach((n, k) => {
    const start = Math.round(n.at * RATE);
    const count = Math.round(n.dur * RATE);
    const rnd = makeNoise(1234 + k * 977);
    let phase = 0;
    let hold = 0;
    for (let i = 0; i < count && start + i < len; i++) {
      const t = i / RATE;
      const u = t / n.dur;
      let f = n.to ? n.freq * (n.to / n.freq) ** u : n.freq;
      if (n.vibrato) f *= 2 ** ((n.vibrato[1] * Math.sin(2 * Math.PI * n.vibrato[0] * t)) / 12);
      const prev = phase;
      phase = (phase + f / RATE) % 1;
      let v;
      if (n.wave === "square") v = phase < (n.duty ?? 0.5) ? 1 : -1;
      else if (n.wave === "triangle") v = 4 * Math.abs(phase - 0.5) - 1;
      else {
        if (phase < prev || i === 0) hold = rnd();
        v = hold;
      }
      buf[start + i] += v * (n.vol ?? 1) * envelope(n.adsr, t, n.dur);
    }
  });
  // 響度一致：RMS 對齊（只算有聲的部分），再壓峰值；頭尾淡入淡出避免爆點
  let sum = 0, cnt = 0, peak = 0;
  for (const v of buf) {
    if (Math.abs(v) > 1e-4) {
      sum += v * v;
      cnt++;
    }
    peak = Math.max(peak, Math.abs(v));
  }
  const gain = Math.min(TARGET_RMS / Math.sqrt(sum / Math.max(1, cnt)), PEAK / peak);
  const fade = Math.round(FADE * RATE);
  // 淡出放在最後一個有聲樣本（補的靜音不用淡）
  let last = len - 1;
  while (last > 0 && Math.abs(buf[last]) <= 1e-4) last--;
  for (let i = 0; i < len; i++) {
    const w = Math.max(0, Math.min(1, i / fade, (last - i) / fade));
    buf[i] *= gain * w;
  }
  return buf;
};

const wav = (samples) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // 單聲道
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
};

fs.mkdirSync(OUT, { recursive: true });
const parts = [];
for (const [name, notes] of Object.entries(SFX)) {
  const s = render(notes);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav(s));
  console.log(`${path.join(OUT, `${name}.wav`)}  ${(s.length / RATE).toFixed(2)}s`);
  parts.push(s, new Float32Array(Math.round(GAP * RATE)));
}
parts.pop();
const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
let o = 0;
for (const p of parts) {
  all.set(p, o);
  o += p.length;
}
fs.writeFileSync(path.join(OUT, "sfx_preview.wav"), wav(all));
console.log(path.join(OUT, "sfx_preview.wav"));

// 對照表：assets/sfx/index.json（給人 / 分鏡 AI 看）＋ src/generated/sfx.ts（import 打包進組件庫）
const missing = Object.values(NAMES).filter((f) => !SFX[f]);
if (missing.length) throw new Error(`NAMES 指到不存在的音效：${missing.join("、")}`);
const durations = Object.fromEntries(Object.entries(SFX).map(([f, notes]) => [f, +Math.max(MIN_LEN, ...notes.map((n) => n.at + n.dur)).toFixed(3)]));
fs.writeFileSync(
  path.join(OUT, "index.json"),
  JSON.stringify({ _comment: "node scripts/make-sfx.mjs 產生。時間軸事件寫 \"sfx\": \"<中文名或檔名>\"", sounds: Object.entries(NAMES).map(([name, file]) => ({ name, file: `${file}.wav`, seconds: durations[file] })), aliases: ALIASES }, null, 1),
);
const files = Object.keys(SFX);
const ts = [
  "// 自動產生（node scripts/make-sfx.mjs），不要手改。8-bit 音效：用 import 打包進組件庫，任何專案都能播。",
  '/// <reference path="../lib/modules.d.ts" />',
  ...files.map((f, i) => `import s${i} from "../../assets/sfx/${f}.wav";`),
  "",
  "/** 檔名（不含 .wav）→ 網址 */",
  "export const SFX_URLS: Record<string, string> = {",
  ...files.map((f, i) => `  ${JSON.stringify(f)}: s${i},`),
  "};",
  "",
  "/** 正式名稱（錯誤訊息、文件列出用） */",
  `export const SFX_LIST: string[] = ${JSON.stringify(Object.keys(NAMES))};`,
  "",
  "/** 中文名 / 簡體寫法 → 檔名 */",
  "export const SFX_NAMES: Record<string, string> = {",
  ...Object.entries(NAMES).map(([n, f]) => `  ${JSON.stringify(n)}: ${JSON.stringify(f)},`),
  ...Object.entries(ALIASES).map(([a, n]) => `  ${JSON.stringify(a)}: ${JSON.stringify(NAMES[n])},`),
  "};",
  "",
];
fs.writeFileSync(path.join(ROOT, "src", "generated", "sfx.ts"), ts.join("\n"));
console.log(`${Object.keys(NAMES).length} 個音效 → assets/sfx/index.json、src/generated/sfx.ts`);
