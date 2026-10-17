// 8-bit 晶片風音效（程式合成，不用外部素材）：node scripts/make-sfx.mjs → assets/sfx/*.wav、sfx_preview.wav
// 44.1kHz 16-bit 單聲道。加新音效：在 SFX 表加一組（音符清單），其他不用改。
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
const C5 = 72, E5 = 76, G5 = 79, B5 = 83, C6 = 84, E6 = 88, G6 = 91;

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
