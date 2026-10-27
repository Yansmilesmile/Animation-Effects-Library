// 自動產生（node scripts/make-sfx.mjs），不要手改。8-bit 音效：用 import 打包進組件庫，任何專案都能播。
/// <reference path="../lib/modules.d.ts" />
import s0 from "../../assets/sfx/click.wav";
import s1 from "../../assets/sfx/pop.wav";
import s2 from "../../assets/sfx/coin.wav";
import s3 from "../../assets/sfx/error.wav";
import s4 from "../../assets/sfx/levelup.wav";
import s5 from "../../assets/sfx/item.wav";
import s6 from "../../assets/sfx/light.wav";
import s7 from "../../assets/sfx/page.wav";
import s8 from "../../assets/sfx/smoke.wav";
import s9 from "../../assets/sfx/count.wav";
import s10 from "../../assets/sfx/type.wav";
import s11 from "../../assets/sfx/fall.wav";
import s12 from "../../assets/sfx/drop.wav";
import s13 from "../../assets/sfx/stamp.wav";
import s14 from "../../assets/sfx/flip.wav";
import s15 from "../../assets/sfx/unlock.wav";
import s16 from "../../assets/sfx/swoosh.wav";
import s17 from "../../assets/sfx/miss.wav";
import s18 from "../../assets/sfx/whoosh_big.wav";
import s19 from "../../assets/sfx/cloud_pass.wav";
import s20 from "../../assets/sfx/zoom_out.wav";
import s21 from "../../assets/sfx/thud.wav";
import s22 from "../../assets/sfx/stone_grind.wav";
import s23 from "../../assets/sfx/creak.wav";
import s24 from "../../assets/sfx/lock.wav";
import s25 from "../../assets/sfx/door_close.wav";
import s26 from "../../assets/sfx/beam_up.wav";
import s27 from "../../assets/sfx/charge.wav";
import s28 from "../../assets/sfx/shatter.wav";
import s29 from "../../assets/sfx/flash.wav";
import s30 from "../../assets/sfx/heartbeat.wav";
import s31 from "../../assets/sfx/alarm.wav";
import s32 from "../../assets/sfx/tension.wav";
import s33 from "../../assets/sfx/startle.wav";
import s34 from "../../assets/sfx/crowd_gasp.wav";
import s35 from "../../assets/sfx/boot.wav";
import s36 from "../../assets/sfx/power_up.wav";
import s37 from "../../assets/sfx/glitch.wav";
import s38 from "../../assets/sfx/engine_start.wav";
import s39 from "../../assets/sfx/engine_stall.wav";
import s40 from "../../assets/sfx/wave_hit.wav";
import s41 from "../../assets/sfx/wave_rise.wav";
import s42 from "../../assets/sfx/gust.wav";
import s43 from "../../assets/sfx/sand.wav";
import s44 from "../../assets/sfx/step.wav";

/** 檔名（不含 .wav）→ 網址 */
export const SFX_URLS: Record<string, string> = {
  "click": s0,
  "pop": s1,
  "coin": s2,
  "error": s3,
  "levelup": s4,
  "item": s5,
  "light": s6,
  "page": s7,
  "smoke": s8,
  "count": s9,
  "type": s10,
  "fall": s11,
  "drop": s12,
  "stamp": s13,
  "flip": s14,
  "unlock": s15,
  "swoosh": s16,
  "miss": s17,
  "whoosh_big": s18,
  "cloud_pass": s19,
  "zoom_out": s20,
  "thud": s21,
  "stone_grind": s22,
  "creak": s23,
  "lock": s24,
  "door_close": s25,
  "beam_up": s26,
  "charge": s27,
  "shatter": s28,
  "flash": s29,
  "heartbeat": s30,
  "alarm": s31,
  "tension": s32,
  "startle": s33,
  "crowd_gasp": s34,
  "boot": s35,
  "power_up": s36,
  "glitch": s37,
  "engine_start": s38,
  "engine_stall": s39,
  "wave_hit": s40,
  "wave_rise": s41,
  "gust": s42,
  "sand": s43,
  "step": s44,
};

/** 正式名稱（錯誤訊息、文件列出用） */
export const SFX_LIST: string[] = ["點擊","彈出","金幣","錯誤","升級","獲得道具","點亮","翻頁","煙霧","計數","打字","摔倒","掉落","蓋章","翻牌","解鎖","轉場","MISS","大推近","穿雲","拉遠","重物落下","石頭摩擦","吱嘎","鎖上","關門","光柱","蓄力","碎裂","閃光","心跳","警報","緊張","驚嚇","譁然","開機","機器啟動","故障","引擎發動","引擎熄火","浪打","巨浪","風","沙","腳步"];

/** 中文名 / 簡體寫法 → 檔名 */
export const SFX_NAMES: Record<string, string> = {
  "點擊": "click",
  "彈出": "pop",
  "金幣": "coin",
  "錯誤": "error",
  "升級": "levelup",
  "獲得道具": "item",
  "點亮": "light",
  "翻頁": "page",
  "煙霧": "smoke",
  "計數": "count",
  "打字": "type",
  "摔倒": "fall",
  "掉落": "drop",
  "蓋章": "stamp",
  "翻牌": "flip",
  "解鎖": "unlock",
  "轉場": "swoosh",
  "MISS": "miss",
  "大推近": "whoosh_big",
  "穿雲": "cloud_pass",
  "拉遠": "zoom_out",
  "重物落下": "thud",
  "石頭摩擦": "stone_grind",
  "吱嘎": "creak",
  "鎖上": "lock",
  "關門": "door_close",
  "光柱": "beam_up",
  "蓄力": "charge",
  "碎裂": "shatter",
  "閃光": "flash",
  "心跳": "heartbeat",
  "警報": "alarm",
  "緊張": "tension",
  "驚嚇": "startle",
  "譁然": "crowd_gasp",
  "開機": "boot",
  "機器啟動": "power_up",
  "故障": "glitch",
  "引擎發動": "engine_start",
  "引擎熄火": "engine_stall",
  "浪打": "wave_hit",
  "巨浪": "wave_rise",
  "風": "gust",
  "沙": "sand",
  "腳步": "step",
  "点击": "click",
  "弹出": "pop",
  "金币": "coin",
  "错误": "error",
  "升级": "levelup",
  "获得道具": "item",
  "道具": "item",
  "点亮": "light",
  "翻页": "page",
  "烟雾": "smoke",
  "计数": "count",
  "盖章": "stamp",
  "解锁": "unlock",
  "转场": "swoosh",
  "miss": "miss",
  "推近": "whoosh_big",
  "呼": "whoosh_big",
  "穿過雲": "cloud_pass",
  "拉远": "zoom_out",
  "重物": "thud",
  "落地": "thud",
  "咚": "thud",
  "机关": "stone_grind",
  "機關": "stone_grind",
  "石头摩擦": "stone_grind",
  "天平": "creak",
  "锁上": "lock",
  "上鎖": "lock",
  "关门": "door_close",
  "光柱冲天": "beam_up",
  "光柱衝天": "beam_up",
  "碎掉": "shatter",
  "光殼碎裂": "shatter",
  "闪光": "flash",
  "心跳声": "heartbeat",
  "警报": "alarm",
  "紧张": "tension",
  "惊吓": "startle",
  "哗然": "crowd_gasp",
  "群眾譁然": "crowd_gasp",
  "开机": "boot",
  "電腦開機": "boot",
  "伺服器啟動": "power_up",
  "机器启动": "power_up",
  "故障雜訊": "glitch",
  "引擎发动": "engine_start",
  "引擎熄火了": "engine_stall",
  "引擎熄灭": "engine_stall",
  "浪": "wave_hit",
  "海浪拍打": "wave_hit",
  "巨浪湧起": "wave_rise",
  "风": "gust",
  "風吹": "gust",
  "沙子": "sand",
  "脚步": "step",
  "腳步聲": "step",
};

// ── 環境音（循環，事件的 "ambientSound"）──
import a0 from "../../assets/sfx/amb_clouds_wind.wav";
import a1 from "../../assets/sfx/amb_sea_night.wav";
import a2 from "../../assets/sfx/amb_wasteland_night.wav";
import a3 from "../../assets/sfx/amb_server_room.wav";
import a4 from "../../assets/sfx/amb_room_tone.wav";
import a5 from "../../assets/sfx/amb_rain.wav";

/** 環境音檔名（不含 amb_ 和 .wav）→ 網址 */
export const AMBIENT_URLS: Record<string, string> = {
  "clouds_wind": a0,
  "sea_night": a1,
  "wasteland_night": a2,
  "server_room": a3,
  "room_tone": a4,
  "rain": a5,
};

export const AMBIENT_LIST: string[] = ["雲海風聲","夜晚海浪","荒原夜風","機房嗡鳴","室內安靜","雨聲"];

/** 中文名 / 別名 → 檔名 */
export const AMBIENT_NAMES: Record<string, string> = {
  "雲海風聲": "clouds_wind",
  "夜晚海浪": "sea_night",
  "荒原夜風": "wasteland_night",
  "機房嗡鳴": "server_room",
  "室內安靜": "room_tone",
  "雨聲": "rain",
  "雲海": "clouds_wind",
  "云海风声": "clouds_wind",
  "高空風": "clouds_wind",
  "海浪": "sea_night",
  "海": "sea_night",
  "大海": "sea_night",
  "夜晚海浪聲": "sea_night",
  "荒原": "wasteland_night",
  "夜風": "wasteland_night",
  "荒原夜风": "wasteland_night",
  "機房": "server_room",
  "伺服器": "server_room",
  "机房嗡鸣": "server_room",
  "嗡鳴": "server_room",
  "室內": "room_tone",
  "底噪": "room_tone",
  "安靜": "room_tone",
  "室内安静": "room_tone",
  "圖書館": "room_tone",
  "雨": "rain",
  "下雨": "rain",
  "雨声": "rain",
};
