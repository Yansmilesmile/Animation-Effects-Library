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
};

/** 正式名稱（錯誤訊息、文件列出用） */
export const SFX_LIST: string[] = ["點擊","彈出","金幣","錯誤","升級","獲得道具","點亮","翻頁","煙霧","計數","打字","摔倒","掉落","蓋章","翻牌","解鎖","轉場","MISS"];

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
};
