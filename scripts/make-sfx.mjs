// 8-bit 晶片風音效（程式合成，不用外部素材）：node scripts/make-sfx.mjs → assets/sfx/*.wav、sfx_preview.wav、環境音 amb_*.wav、ambient_preview.wav
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
/** 決定性亂數（表裡要「隨機」的音效用，每次產生都一樣） */
const seeded = (seed) => {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * 一個音符：
 * at 開始（秒）、dur 長度（含 release）、wave square | triangle | noise、duty 方波佔空比、
 * freq 起始 Hz、to 結束 Hz（指數滑音，省略 = 不滑）、vol 相對音量、
 * adsr [attack, decay, sustain 0..1, release]（秒）、vibrato [Hz, 半音深度]、
 * tremolo [Hz, 深度 0..1]（音量顫動，磨擦 / 引擎 / 沙）、lp 低通截止 Hz（悶一點的雜訊：浪、重物）
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
  // ── 鏡頭 / 轉場 ──
  // 大推近：雜訊由低往高慢慢漸強「呼——」，底下一條低音一起往上推
  whoosh_big: [
    { at: 0, dur: 0.9, wave: "noise", freq: 300, to: 6000, vol: 1, adsr: [0.6, 0.15, 0.6, 0.15], lp: 5000 },
    { at: 0, dur: 0.9, wave: "triangle", freq: 70, to: 260, vol: 0.5, adsr: [0.6, 0.15, 0.6, 0.15] },
  ],
  // 穿雲：兩段柔和的氣流（進雲、出雲），中間微微顫動
  cloud_pass: [
    { at: 0, dur: 0.7, wave: "noise", freq: 900, to: 3200, vol: 0.9, adsr: [0.35, 0.2, 0.6, 0.15], tremolo: [11, 0.35], lp: 2500 },
    { at: 0.55, dur: 0.75, wave: "noise", freq: 3200, to: 700, vol: 0.8, adsr: [0.15, 0.3, 0.5, 0.3], tremolo: [9, 0.35], lp: 2200 },
    { at: 0, dur: 1.3, wave: "triangle", freq: 330, to: 440, vol: 0.12, adsr: [0.5, 0.3, 0.6, 0.4], vibrato: [5, 0.4] },
  ],
  // 拉遠：大推近倒過來，雜訊由高往低退去
  zoom_out: [
    { at: 0, dur: 0.8, wave: "noise", freq: 7000, to: 350, vol: 1, adsr: [0.08, 0.4, 0.4, 0.3], lp: 6000 },
    { at: 0, dur: 0.8, wave: "triangle", freq: 420, to: 70, vol: 0.45, adsr: [0.08, 0.4, 0.4, 0.3] },
  ],
  // ── 撞擊 / 重量 ──
  // 重物落下：低沉的「咚」，悶雜訊 + 往下掉的低音
  thud: [
    { at: 0, dur: 0.4, wave: "triangle", freq: 95, to: 32, vol: 1, adsr: [0.001, 0.3, 0.1, 0.08] },
    { at: 0, dur: 0.25, wave: "noise", freq: 1400, to: 120, vol: 0.9, adsr: [0.001, 0.18, 0.05, 0.05], lp: 900 },
    { at: 0, dur: 0.1, wave: "square", duty: 0.5, freq: 80, to: 40, vol: 0.35, adsr: [0.001, 0.07, 0.1, 0.02] },
  ],
  // 石頭摩擦 / 機關轉動：顫動的低頻雜訊，墊一條窄方波「嘎嘎嘎」
  stone_grind: [
    { at: 0, dur: 1.0, wave: "noise", freq: 500, to: 380, vol: 1, adsr: [0.06, 0.1, 0.85, 0.15], tremolo: [17, 0.75], lp: 1200 },
    { at: 0, dur: 1.0, wave: "square", duty: 0.125, freq: 58, to: 52, vol: 0.35, adsr: [0.06, 0.1, 0.8, 0.15], tremolo: [17, 0.6] },
  ],
  // 吱嘎：窄方波高速顫音滑上再滑下（木頭 / 天平傾斜）
  creak: [
    { at: 0, dur: 0.38, wave: "square", duty: 0.125, freq: 290, to: 430, vol: 1, adsr: [0.03, 0.05, 0.8, 0.06], vibrato: [26, 1.4] },
    { at: 0.42, dur: 0.3, wave: "square", duty: 0.125, freq: 400, to: 270, vol: 0.8, adsr: [0.02, 0.05, 0.8, 0.06], vibrato: [22, 1.4] },
  ],
  // 鎖上：解鎖倒過來 — 下行兩音 D6 → G5，接機械兩下「喀、喀」
  lock: [
    { at: 0, dur: 0.07, wave: "square", duty: 0.5, freq: note(D6), vol: 0.9, adsr: [0.002, 0.02, 0.8, 0.008] },
    { at: 0.07, dur: 0.16, wave: "square", duty: 0.5, freq: note(G5), vol: 0.9, adsr: [0.002, 0.1, 0.3, 0.04] },
    ...[0.26, 0.33].map((at) => ({ at, dur: 0.03, wave: "square", duty: 0.5, freq: 600, to: 1300, vol: 0.7, adsr: [0.001, 0.025, 0, 0.004] })),
    ...[0.26, 0.33].map((at) => ({ at, dur: 0.015, wave: "noise", freq: 6000, vol: 0.4, adsr: [0.001, 0.012, 0, 0.002] })),
  ],
  // 門關上：一下風聲，接悶響和門閂「喀」
  door_close: [
    { at: 0, dur: 0.14, wave: "noise", freq: 800, to: 2500, vol: 0.5, adsr: [0.08, 0.04, 0.3, 0.02], lp: 2000 },
    { at: 0.14, dur: 0.3, wave: "triangle", freq: 120, to: 45, vol: 1, adsr: [0.001, 0.2, 0.1, 0.06] },
    { at: 0.14, dur: 0.12, wave: "noise", freq: 1600, to: 200, vol: 0.9, adsr: [0.001, 0.08, 0.05, 0.03], lp: 1500 },
    { at: 0.3, dur: 0.03, wave: "square", duty: 0.5, freq: 1500, to: 700, vol: 0.5, adsr: [0.001, 0.025, 0, 0.004] },
  ],
  // ── 能量 / 光 ──
  // 光柱衝天：窄方波一路往上衝、帶顫音，高頻雜訊跟著亮起來
  beam_up: [
    { at: 0, dur: 0.85, wave: "square", duty: 0.25, freq: 180, to: 1700, vol: 0.9, adsr: [0.02, 0.1, 0.8, 0.25], vibrato: [12, 0.3] },
    { at: 0, dur: 0.85, wave: "triangle", freq: 360, to: 3400, vol: 0.45, adsr: [0.02, 0.1, 0.8, 0.25] },
    { at: 0.1, dur: 0.75, wave: "noise", freq: 2000, to: 9000, vol: 0.45, adsr: [0.3, 0.1, 0.6, 0.3] },
  ],
  // 蓄力：音高慢慢往上爬，顫動越來越快（四段），最後停在高音
  charge: [
    ...[0, 1, 2, 3].map((i) => ({ at: i * 0.28, dur: 0.3, wave: "square", duty: 0.25, freq: 160 * 1.5 ** i, to: 160 * 1.5 ** (i + 1), vol: 0.8, adsr: [0.01, 0.05, 0.85, 0.02], vibrato: [10 + i * 8, 0.5] })),
    { at: 0, dur: 1.15, wave: "triangle", freq: 80, to: 320, vol: 0.5, adsr: [0.3, 0.2, 0.7, 0.1] },
  ],
  // 光殼碎裂：亮的雜訊爆開，接一串往下掉的高音碎片
  shatter: (() => {
    const r = seeded(7);
    return [
      { at: 0, dur: 0.12, wave: "noise", freq: 9000, vol: 1, adsr: [0.001, 0.09, 0.1, 0.02] },
      { at: 0, dur: 0.25, wave: "noise", freq: 3000, to: 900, vol: 0.5, adsr: [0.001, 0.18, 0.05, 0.05] },
      ...Array.from({ length: 12 }, (_, i) => ({ at: 0.03 + i * 0.045 + r() * 0.02, dur: 0.06, wave: "square", duty: 0.125, freq: 5200 - i * 300 + r() * 600, vol: 0.55 * (1 - i * 0.06), adsr: [0.001, 0.04, 0.1, 0.01] })),
    ];
  })(),
  // 閃光：極短的亮光「欻」，高音往上一撥
  flash: [
    { at: 0, dur: 0.06, wave: "noise", freq: 9500, vol: 0.8, adsr: [0.001, 0.05, 0.1, 0.008] },
    { at: 0, dur: 0.18, wave: "square", duty: 0.125, freq: note(A6), to: note(A6 + 12), vol: 0.9, adsr: [0.001, 0.12, 0.2, 0.04] },
  ],
  // ── 情緒 ──
  // 心跳：「咚、咚」兩下低音，可重複觸發
  heartbeat: [
    { at: 0, dur: 0.16, wave: "triangle", freq: 75, to: 42, vol: 1, adsr: [0.002, 0.12, 0.1, 0.03] },
    { at: 0.2, dur: 0.2, wave: "triangle", freq: 68, to: 38, vol: 0.8, adsr: [0.002, 0.15, 0.1, 0.04] },
    { at: 0, dur: 0.05, wave: "noise", freq: 400, vol: 0.25, adsr: [0.001, 0.04, 0, 0.008], lp: 300 },
  ],
  // 警報：兩個音高來回四次
  alarm: [...Array.from({ length: 8 }, (_, i) => ({ at: i * 0.18, dur: 0.18, wave: "square", duty: 0.5, freq: i % 2 ? 660 : 880, vol: 0.9, adsr: [0.003, 0.02, 0.9, 0.01] }))],
  // 緊張持續音：兩個差一點點的低音方波互相拍頻，慢慢漸強（約 2 秒）
  tension: [
    { at: 0, dur: 2.0, wave: "square", duty: 0.5, freq: 55, vol: 0.6, adsr: [0.8, 0.2, 0.9, 0.5] },
    { at: 0, dur: 2.0, wave: "square", duty: 0.5, freq: 57.5, vol: 0.6, adsr: [0.8, 0.2, 0.9, 0.5] },
    { at: 0, dur: 2.0, wave: "triangle", freq: note(C5 - 12 + 1), vol: 0.35, adsr: [1.0, 0.2, 0.8, 0.5], tremolo: [6, 0.5] },
  ],
  // 驚嚇：刺耳的不和諧和弦一刺，雜訊衝一下
  startle: [
    ...[E6, E6 + 1, B5 + 1].map((n) => ({ at: 0, dur: 0.28, wave: "square", duty: 0.25, freq: note(n), vol: 0.6, adsr: [0.001, 0.08, 0.5, 0.1] })),
    { at: 0, dur: 0.08, wave: "noise", freq: 6000, vol: 0.8, adsr: [0.001, 0.06, 0.1, 0.01] },
  ],
  // 群眾譁然：一片氣聲漲起，墊幾條往上滑的「喔——」
  crowd_gasp: (() => {
    const r = seeded(11);
    return [
      { at: 0, dur: 1.0, wave: "noise", freq: 700, to: 2600, vol: 0.9, adsr: [0.25, 0.3, 0.6, 0.3], lp: 2500 },
      ...Array.from({ length: 5 }, (_, i) => ({ at: r() * 0.12, dur: 0.85, wave: "square", duty: 0.25, freq: 230 + i * 37 + r() * 20, to: 330 + i * 45, vol: 0.18, adsr: [0.15, 0.3, 0.6, 0.3], vibrato: [5 + r() * 3, 0.5] })),
    ];
  })(),
  // ── 機械 / 電子 ──
  // 電腦開機：兩下嗶接上行琶音，最後一個長音
  boot: [
    ...[0, 0.1].map((at) => ({ at, dur: 0.05, wave: "square", duty: 0.5, freq: 1000, vol: 0.6, adsr: [0.001, 0.02, 0.8, 0.008] })),
    ...[C5, G5, C6, E6].map((n, i) => ({ at: 0.25 + i * 0.07, dur: 0.075, wave: "square", duty: 0.25, freq: note(n), vol: 0.8, adsr: [0.002, 0.02, 0.7, 0.01] })),
    { at: 0.53, dur: 0.45, wave: "square", duty: 0.25, freq: note(G6), vol: 0.8, adsr: [0.002, 0.1, 0.5, 0.2] },
    { at: 0.53, dur: 0.45, wave: "triangle", freq: note(C5 - 12), vol: 0.5, adsr: [0.002, 0.1, 0.6, 0.2] },
  ],
  // 伺服器嗡鳴啟動：低頻嗡聲和風扇雜訊一起轉速上升
  power_up: [
    { at: 0, dur: 1.5, wave: "triangle", freq: 35, to: 120, vol: 1, adsr: [0.2, 0.2, 0.85, 0.3] },
    { at: 0, dur: 1.5, wave: "square", duty: 0.25, freq: 55, to: 180, vol: 0.3, adsr: [0.3, 0.2, 0.8, 0.3] },
    { at: 0.1, dur: 1.4, wave: "noise", freq: 300, to: 3000, vol: 0.45, adsr: [0.6, 0.2, 0.7, 0.3], lp: 2500 },
  ],
  // 故障雜訊：一串亂跳的短音和雜訊（決定性亂數，每次一樣）
  glitch: (() => {
    const r = seeded(3);
    return Array.from({ length: 14 }, (_, i) => {
      const noise = r() < 0.4;
      return { at: i * 0.035 + r() * 0.01, dur: 0.02 + r() * 0.04, wave: noise ? "noise" : "square", duty: 0.125 + 0.375 * Math.round(r()), freq: noise ? 2000 + r() * 8000 : 150 + r() * 2500, vol: 0.5 + r() * 0.5, adsr: [0.001, 0.01, 0.8, 0.004] };
    });
  })(),
  // 引擎發動：啟動馬達三下「嗚嗚嗚」，接低音方波顫動（怠速）
  engine_start: [
    ...[0, 0.16, 0.32].map((at) => ({ at, dur: 0.13, wave: "square", duty: 0.5, freq: 90, to: 120, vol: 0.6, adsr: [0.01, 0.05, 0.6, 0.03], tremolo: [28, 0.6] })),
    { at: 0.5, dur: 1.0, wave: "square", duty: 0.5, freq: 48, to: 62, vol: 1, adsr: [0.03, 0.15, 0.8, 0.2], tremolo: [24, 0.7] },
    { at: 0.5, dur: 1.0, wave: "noise", freq: 600, vol: 0.35, adsr: [0.03, 0.15, 0.8, 0.2], tremolo: [24, 0.7], lp: 800 },
  ],
  // 引擎熄火：怠速越來越慢、越來越低，最後一聲「咚」
  engine_stall: [
    { at: 0, dur: 0.9, wave: "square", duty: 0.5, freq: 60, to: 28, vol: 1, adsr: [0.01, 0.1, 0.9, 0.2], tremolo: [16, 0.8] },
    { at: 0, dur: 0.9, wave: "noise", freq: 500, to: 150, vol: 0.35, adsr: [0.01, 0.1, 0.9, 0.2], tremolo: [16, 0.8], lp: 700 },
    { at: 0.9, dur: 0.2, wave: "triangle", freq: 70, to: 35, vol: 0.7, adsr: [0.001, 0.15, 0.1, 0.04] },
  ],
  // ── 自然 ──
  // 浪打：悶雜訊一下拍上來再散開，墊低音
  wave_hit: [
    { at: 0, dur: 0.8, wave: "noise", freq: 2500, to: 600, vol: 1, adsr: [0.02, 0.35, 0.3, 0.3], lp: 2200 },
    { at: 0, dur: 0.3, wave: "triangle", freq: 80, to: 40, vol: 0.6, adsr: [0.005, 0.2, 0.1, 0.06] },
  ],
  // 巨浪湧起：低沉的轟聲慢慢漲高（約 1.6 秒）
  wave_rise: [
    { at: 0, dur: 1.6, wave: "noise", freq: 200, to: 3000, vol: 1, adsr: [1.2, 0.1, 0.8, 0.3], lp: 1800 },
    { at: 0, dur: 1.6, wave: "triangle", freq: 38, to: 90, vol: 0.7, adsr: [1.0, 0.2, 0.8, 0.3] },
  ],
  // 風吹一陣：雜訊漲上去再退，慢慢晃
  gust: [{ at: 0, dur: 1.2, wave: "noise", freq: 500, to: 1600, vol: 1, adsr: [0.45, 0.2, 0.6, 0.45], tremolo: [3, 0.35], lp: 1400 }],
  // 沙子流動：細碎的高頻雜訊快速顫動
  sand: [{ at: 0, dur: 0.9, wave: "noise", freq: 7000, vol: 1, adsr: [0.15, 0.2, 0.7, 0.25], tremolo: [31, 0.7] }],
  // 腳步一步：短促的「噠」，可重複觸發
  step: [
    { at: 0, dur: 0.05, wave: "noise", freq: 1600, to: 300, vol: 0.8, adsr: [0.001, 0.04, 0.05, 0.008], lp: 1500 },
    { at: 0, dur: 0.07, wave: "triangle", freq: 130, to: 70, vol: 0.8, adsr: [0.001, 0.05, 0.1, 0.015] },
  ],
};

/** 中文名 → 檔名（分鏡寫中文名就能用；也接受檔名本身和簡體寫法） */
const NAMES = {
  點擊: "click", 彈出: "pop", 金幣: "coin", 錯誤: "error", 升級: "levelup", 獲得道具: "item",
  點亮: "light", 翻頁: "page", 煙霧: "smoke", 計數: "count", 打字: "type", 摔倒: "fall", 掉落: "drop",
  蓋章: "stamp", 翻牌: "flip", 解鎖: "unlock", 轉場: "swoosh", MISS: "miss",
  大推近: "whoosh_big", 穿雲: "cloud_pass", 拉遠: "zoom_out",
  重物落下: "thud", 石頭摩擦: "stone_grind", 吱嘎: "creak", 鎖上: "lock", 關門: "door_close",
  光柱: "beam_up", 蓄力: "charge", 碎裂: "shatter", 閃光: "flash",
  心跳: "heartbeat", 警報: "alarm", 緊張: "tension", 驚嚇: "startle", 譁然: "crowd_gasp",
  開機: "boot", 機器啟動: "power_up", 故障: "glitch", 引擎發動: "engine_start", 引擎熄火: "engine_stall",
  浪打: "wave_hit", 巨浪: "wave_rise", 風: "gust", 沙: "sand", 腳步: "step",
};
const ALIASES = {
  点击: "點擊", 弹出: "彈出", 金币: "金幣", 错误: "錯誤", 升级: "升級", 获得道具: "獲得道具", 道具: "獲得道具",
  点亮: "點亮", 翻页: "翻頁", 烟雾: "煙霧", 计数: "計數", 盖章: "蓋章", 解锁: "解鎖", 转场: "轉場", miss: "MISS",
  推近: "大推近", 呼: "大推近", 穿過雲: "穿雲", 拉远: "拉遠", 重物: "重物落下", 落地: "重物落下", 咚: "重物落下",
  机关: "石頭摩擦", 機關: "石頭摩擦", 石头摩擦: "石頭摩擦", 天平: "吱嘎", 锁上: "鎖上", 上鎖: "鎖上", 关门: "關門",
  光柱冲天: "光柱", 光柱衝天: "光柱", 碎掉: "碎裂", 光殼碎裂: "碎裂", 闪光: "閃光", 心跳声: "心跳", 警报: "警報",
  紧张: "緊張", 惊吓: "驚嚇", 哗然: "譁然", 群眾譁然: "譁然", 开机: "開機", 電腦開機: "開機", 伺服器啟動: "機器啟動",
  机器启动: "機器啟動", 故障雜訊: "故障", 引擎发动: "引擎發動", 引擎熄火了: "引擎熄火", 引擎熄灭: "引擎熄火",
  浪: "浪打", 海浪拍打: "浪打", 巨浪湧起: "巨浪", 风: "風", 風吹: "風", 沙子: "沙", 脚步: "腳步", 腳步聲: "腳步",
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
    let low = 0;
    const lpA = n.lp ? 1 - Math.exp((-2 * Math.PI * n.lp) / RATE) : 0;
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
      if (n.lp) v = low += lpA * (v - low);
      if (n.tremolo) v *= 1 - n.tremolo[1] * (0.5 + 0.5 * Math.sin(2 * Math.PI * n.tremolo[0] * t));
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

// ── 環境音（循環）：8 秒一圈、頭尾交叉淡化成無縫循環。時間軸事件寫 "ambientSound": "<中文名>" ──
const AMB_LEN = 8;
const AMB_XF = 0.5;
const ambNoise = (rate, seed, n) => {
  const rnd = makeNoise(seed);
  const out = new Float32Array(n);
  let phase = 0, hold = rnd();
  for (let i = 0; i < n; i++) {
    phase += rate / RATE;
    if (phase >= 1) {
      phase -= 1;
      hold = rnd();
    }
    out[i] = hold;
  }
  return out;
};
/** 單極低通；fc 可以是函式（每個樣本的截止頻率） */
const lowpass = (x, fc) => {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof fc === "function" ? fc(i / RATE) : fc;
    y += (1 - Math.exp((-2 * Math.PI * f) / RATE)) * (x[i] - y);
    out[i] = y;
  }
  return out;
};
/** 週期函式（一圈 8 秒的整數倍才會無縫） */
const cyc = (t, k, ph = 0) => Math.sin(2 * Math.PI * (k / AMB_LEN) * t + ph);
const tone = (n, wave, freq, amp) => {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    phase = (phase + (typeof freq === "function" ? freq(t) : freq) / RATE) % 1;
    const v = wave === "square" ? (phase < 0.5 ? 1 : -1) : 4 * Math.abs(phase - 0.5) - 1;
    out[i] = v * (typeof amp === "function" ? amp(t) : amp);
  }
  return out;
};
/** 短促事件（滴答、雨滴、蟲鳴）：在 times（秒，一圈內）各放一次 notes，繞圈的部分接回開頭 */
const events = (n, times, notes) => {
  const out = new Float32Array(n);
  const one = render(notes);
  const loop = Math.round(AMB_LEN * RATE);
  for (const [at, vol] of times) {
    for (const off of [0, loop]) {
      const s0 = Math.round(at * RATE) + off;
      for (let i = 0; i < one.length && s0 + i < n; i++) out[s0 + i] += one[i] * vol;
    }
  }
  return out;
};
const mix = (...layers) => {
  const out = new Float32Array(layers[0].length);
  for (const l of layers) for (let i = 0; i < out.length; i++) out[i] += l[i];
  return out;
};
const scaled = (x, amp) => x.map((v, i) => v * (typeof amp === "function" ? amp(i / RATE) : amp));

const AMBIENT = {
  // 雲海風聲：高空的寬廣氣流，慢慢起伏，偶爾一縷細細的哨音
  clouds_wind: (n) =>
    mix(
      scaled(lowpass(ambNoise(3000, 101, n), 600), (t) => 0.7 + 0.25 * cyc(t, 2) + 0.1 * cyc(t, 3, 1)),
      scaled(lowpass(ambNoise(6000, 102, n), 1800), (t) => 0.25 + 0.12 * cyc(t, 2, 2)),
      tone(n, "triangle", (t) => 880 * (1 + 0.012 * cyc(t, 4)), (t) => 0.035 * Math.max(0, cyc(t, 1, 2))),
    ),
  // 夜晚海浪：一圈兩道浪（第二道小一點），湧上來時聲音變亮，退去時變悶；底下一層遠方的低沉海聲
  sea_night: (n) => {
    const swell = (t) => {
      const one = (p) => (p < 0.35 ? (p / 0.35) ** 2 : Math.exp(-(p - 0.35) * 4.5));
      const u = t % AMB_LEN;
      return u < 4 ? one(u / 4) : 0.75 * one((u - 4) / 4);
    };
    return mix(
      scaled(lowpass(ambNoise(9000, 201, n), (t) => 300 + 1800 * swell(t)), (t) => 0.25 + 0.9 * swell(t)),
      scaled(lowpass(ambNoise(2000, 202, n), 180), 0.5),
    );
  },
  // 荒原夜風：低沉的風、偶爾一聲往下滑的哨音，遠處一點蟲鳴
  wasteland_night: (n) =>
    mix(
      scaled(lowpass(ambNoise(2500, 301, n), 350), (t) => 0.75 + 0.35 * cyc(t, 1) + 0.1 * cyc(t, 3, 2)),
      tone(n, "triangle", (t) => 520 + 90 * cyc(t, 2, 1), (t) => 0.05 * Math.max(0, cyc(t, 2, 0.5)) ** 2),
      events(n, [[0.4, 1], [2.0, 0.8], [3.7, 1], [5.3, 0.7], [6.8, 0.9]], [0, 0.07, 0.14].map((at) => ({ at, dur: 0.035, wave: "square", duty: 0.5, freq: 4300, vol: 0.12, adsr: [0.002, 0.01, 0.7, 0.01] }))),
    ),
  // 機房嗡鳴：60Hz 電源嗡聲＋風扇的平穩風聲，偶爾一聲硬碟 / 指示燈的嗶
  server_room: (n) =>
    mix(
      tone(n, "triangle", 60, 0.55),
      tone(n, "square", 120, 0.06),
      tone(n, "triangle", 180, (t) => 0.12 + 0.03 * cyc(t, 4)),
      scaled(lowpass(ambNoise(8000, 401, n), 2500), 0.4),
      events(n, [[0.7, 1], [2.1, 0.7], [3.3, 1], [5.2, 0.8], [6.6, 0.6]], [{ at: 0, dur: 0.045, wave: "square", duty: 0.25, freq: 1800, vol: 0.1, adsr: [0.002, 0.02, 0.6, 0.01] }]),
    ),
  // 室內安靜底噪：很淡的空氣聲和低頻，遠處每秒一下時鐘滴答（圖書館、書房）
  room_tone: (n) =>
    mix(
      scaled(lowpass(ambNoise(2000, 501, n), 250), 1),
      scaled(lowpass(ambNoise(6000, 502, n), 1200), 0.12),
      tone(n, "triangle", 50, 0.06),
      events(n, Array.from({ length: 8 }, (_, i) => [i + 0.5, i % 2 ? 0.8 : 1]), [
        { at: 0, dur: 0.012, wave: "noise", freq: 6000, vol: 0.18, adsr: [0.001, 0.01, 0, 0.002] },
        { at: 0, dur: 0.015, wave: "square", duty: 0.25, freq: 2200, vol: 0.08, adsr: [0.001, 0.012, 0, 0.002] },
      ]),
    ),
  // 雨聲：細密的高頻沙沙聲，加一顆顆打在東西上的雨滴
  rain: (n) => {
    const r = seeded(601);
    const hiss = ambNoise(14000, 602, n);
    const low = lowpass(hiss, 1500);
    return mix(
      hiss.map((v, i) => (v - low[i]) * 0.55),
      scaled(lowpass(ambNoise(5000, 603, n), 3000), 0.3),
      events(n, Array.from({ length: 70 }, () => [r() * AMB_LEN, 0.3 + r() * 0.7]), [
        { at: 0, dur: 0.02, wave: "noise", freq: 5000, to: 1500, vol: 0.3, adsr: [0.001, 0.015, 0, 0.004] },
      ]),
    );
  },
};
const AMBIENT_NAMES = { 雲海風聲: "clouds_wind", 夜晚海浪: "sea_night", 荒原夜風: "wasteland_night", 機房嗡鳴: "server_room", 室內安靜: "room_tone", 雨聲: "rain" };
const AMBIENT_ALIASES = {
  雲海: "雲海風聲", 云海风声: "雲海風聲", 高空風: "雲海風聲", 海浪: "夜晚海浪", 海: "夜晚海浪", 大海: "夜晚海浪", 夜晚海浪聲: "夜晚海浪",
  荒原: "荒原夜風", 夜風: "荒原夜風", 荒原夜风: "荒原夜風", 機房: "機房嗡鳴", 伺服器: "機房嗡鳴", 机房嗡鸣: "機房嗡鳴", 嗡鳴: "機房嗡鳴",
  室內: "室內安靜", 底噪: "室內安靜", 安靜: "室內安靜", 室内安静: "室內安靜", 圖書館: "室內安靜", 雨: "雨聲", 下雨: "雨聲", 雨声: "雨聲",
};
const renderAmbient = (gen) => {
  const loop = Math.round(AMB_LEN * RATE);
  const xf = Math.round(AMB_XF * RATE);
  const raw = gen(loop + xf);
  // 頭尾交叉淡化（等功率）：最後 xf 個樣本淡出疊到開頭淡入上 → 第 loop 個樣本接回第 0 個
  const out = new Float32Array(loop);
  for (let i = 0; i < loop; i++) {
    if (i < xf) {
      const k = i / xf;
      out[i] = raw[i] * Math.sin((k * Math.PI) / 2) + raw[loop + i] * Math.cos((k * Math.PI) / 2);
    } else out[i] = raw[i];
  }
  let sum = 0, peak = 0;
  for (const v of out) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const gain = Math.min(TARGET_RMS / Math.sqrt(sum / out.length), PEAK / peak);
  return out.map((v) => v * gain);
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
// 環境音：amb_<名>.wav；ambient_preview.wav = 每種 5 秒（頭尾 0.3 秒淡入淡出），間隔 0.5 秒
const ambParts = [];
for (const [name, gen] of Object.entries(AMBIENT)) {
  const s = renderAmbient(gen);
  fs.writeFileSync(path.join(OUT, `amb_${name}.wav`), wav(s));
  console.log(`${path.join(OUT, `amb_${name}.wav`)}  ${(s.length / RATE).toFixed(2)}s（循環）`);
  const five = Math.round(5 * RATE), f = Math.round(0.3 * RATE);
  ambParts.push(Float32Array.from({ length: five }, (_, i) => s[i % s.length] * Math.min(1, i / f, (five - 1 - i) / f)), new Float32Array(Math.round(GAP * RATE)));
}
const ambAll = new Float32Array(ambParts.reduce((n, p) => n + p.length, 0));
o = 0;
for (const p of ambParts) {
  ambAll.set(p, o);
  o += p.length;
}
fs.writeFileSync(path.join(OUT, "ambient_preview.wav"), wav(ambAll));
console.log(path.join(OUT, "ambient_preview.wav"));

// 對照表：assets/sfx/index.json（給人 / 分鏡 AI 看）＋ src/generated/sfx.ts（import 打包進組件庫）
const missing = [...Object.values(NAMES).filter((f) => !SFX[f]), ...Object.values(AMBIENT_NAMES).filter((f) => !AMBIENT[f])];
if (missing.length) throw new Error(`NAMES / AMBIENT_NAMES 指到不存在的音效：${missing.join("、")}`);
const badAlias = [...Object.values(ALIASES).filter((n) => !NAMES[n]), ...Object.values(AMBIENT_ALIASES).filter((n) => !AMBIENT_NAMES[n])];
if (badAlias.length) throw new Error(`別名指到不存在的名稱：${badAlias.join("、")}`);
const durations = Object.fromEntries(Object.entries(SFX).map(([f, notes]) => [f, +Math.max(MIN_LEN, ...notes.map((n) => n.at + n.dur)).toFixed(3)]));
fs.writeFileSync(
  path.join(OUT, "index.json"),
  JSON.stringify(
    {
      _comment: "node scripts/make-sfx.mjs 產生。時間軸事件寫 \"sfx\": \"<中文名或檔名>\"（短音效，播一次）、\"ambientSound\": \"<中文名或檔名>\"（環境音，循環）",
      sounds: Object.entries(NAMES).map(([name, file]) => ({ name, file: `${file}.wav`, seconds: durations[file] })),
      aliases: ALIASES,
      ambient: Object.entries(AMBIENT_NAMES).map(([name, file]) => ({ name, file: `amb_${file}.wav`, seconds: AMB_LEN, loop: true })),
      ambientAliases: AMBIENT_ALIASES,
    },
    null,
    1,
  ),
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
  "// ── 環境音（循環，事件的 \"ambientSound\"）──",
  ...Object.values(AMBIENT_NAMES).map((f, i) => `import a${i} from "../../assets/sfx/amb_${f}.wav";`),
  "",
  "/** 環境音檔名（不含 amb_ 和 .wav）→ 網址 */",
  "export const AMBIENT_URLS: Record<string, string> = {",
  ...Object.values(AMBIENT_NAMES).map((f, i) => `  ${JSON.stringify(f)}: a${i},`),
  "};",
  "",
  `export const AMBIENT_LIST: string[] = ${JSON.stringify(Object.keys(AMBIENT_NAMES))};`,
  "",
  "/** 中文名 / 別名 → 檔名 */",
  "export const AMBIENT_NAMES: Record<string, string> = {",
  ...Object.entries(AMBIENT_NAMES).map(([n, f]) => `  ${JSON.stringify(n)}: ${JSON.stringify(f)},`),
  ...Object.entries(AMBIENT_ALIASES).map(([a, n]) => `  ${JSON.stringify(a)}: ${JSON.stringify(AMBIENT_NAMES[n])},`),
  "};",
  "",
];
fs.writeFileSync(path.join(ROOT, "src", "generated", "sfx.ts"), ts.join("\n"));
console.log(`${Object.keys(NAMES).length} 個音效、${Object.keys(AMBIENT_NAMES).length} 個環境音 → assets/sfx/index.json、src/generated/sfx.ts`);
