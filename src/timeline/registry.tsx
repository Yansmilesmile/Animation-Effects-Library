import React from "react";
import { Ambience } from "../components/Ambience";
import { CameraState, worldToScreen } from "../components/Camera";
import { ChoiceDialog, ChoiceMenu, DialogBox } from "../components/dialog";
import { BeamDrop, GlowText, MissPop, RingPulse, Stamp, SunBurst, Tag } from "../components/emphasis";
import { ChestDeal, chestFanPosition, GamePopup, NextTeaser, SkillCard, SkillSummary, SKILL_DEMOS } from "../components/ending";
import { Host } from "../components/Host";
import { Sprite } from "../components/Sprite";
import { Counter, CrowdGrid, LevelTitleCard, LevelTransition, Spotlight } from "../components/structure";
import { LAYOUT, WORLD } from "../theme";
import { PROP_FX_EFFECTS } from "./propfx";

/**
 * 組件註冊表：時間軸 JSON 的 component 名稱 → React 組件 + 參數規格。
 * 參數規格用來在預覽中明顯報錯：未知組件、未知參數、缺必填、型別不對，都會顯示紅框，不會靜默略過。
 */
export type PropType = "number" | "string" | "boolean" | "object" | "array" | "number|string";

export type PrepareContext = { camera: CameraState };

export type RegistryEntry = {
  component: React.FC<any>;
  /** 預設圖層 */
  layer: "world" | "hud";
  /** 詞典編號 */
  code: string;
  props: Record<string, PropType>;
  required?: string[];
  /** 額外檢查，回傳錯誤訊息陣列 */
  check?: (p: Record<string, any>) => string[];
  /** 把 JSON 參數轉成組件參數（預設值、名稱 → 函式） */
  prepare?: (p: Record<string, any>, ctx: PrepareContext) => Record<string, any>;
};

const POS = { x: "number", y: "number" } as const;
const SPRITE_LOOK = { anchor: "string", scale: "number", flipX: "boolean", rotate: "number", tint: "string", tintAmount: "number", glow: "string", opacity: "number", bloom: "boolean" } as const;

const demoCheck = (name: unknown) => (name !== undefined && !(String(name) in SKILL_DEMOS) ? [`demo「${name}」不存在，可用：${Object.keys(SKILL_DEMOS).join("、")}`] : []);

export const REGISTRY: Record<string, RegistryEntry> = {
  // ── 素材 ──
  Sprite: {
    component: Sprite,
    layer: "world",
    code: "素材",
    props: { asset: "string", assetQuery: "string", ...POS, ...SPRITE_LOOK, animFps: "number", row: "number", frameIndex: "number" },
    check: (p) => (p.asset ? [] : p.assetQuery ? [`assetQuery「${p.assetQuery}」尚未解析成 asset，請先執行解析並使用鎖定版 JSON`] : ["缺少 asset"]),
  },
  Host: { component: Host, layer: "world", code: "主持人", props: { pose: "string", talk: "boolean", ...POS, ...SPRITE_LOOK }, required: ["pose"] },
  Ambience: { component: Ambience, layer: "world", code: "G", props: { layers: "array" }, required: ["layers"] },

  // ── 強調 ──
  RingPulse: { component: RingPulse, layer: "world", code: "B1", props: { ...POS, radius: "number", color: "string", duration: "number", dots: "number", flash: "boolean", seed: "number" }, required: ["x", "y"] },
  Tag: { component: Tag, layer: "world", code: "B2/B13/B11", props: { text: "string", ...POS, variant: "string", appear: "string", size: "number" }, required: ["text", "x", "y"] },
  Stamp: { component: Stamp, layer: "world", code: "B6/B3", props: { ...POS, variant: "string", text: "string", rotate: "number", size: "number", flash: "boolean", holdTint: "number" }, required: ["x", "y"] },
  SunBurst: { component: SunBurst, layer: "world", code: "B5", props: { ...POS, radius: "number", color: "string", rays: "number", speed: "number", opacity: "number" }, required: ["x", "y"] },
  GlowText: {
    component: GlowText,
    layer: "hud",
    code: "B7",
    props: { text: "string", ...POS, color: "string", size: "number", crown: "boolean", appear: "string", scanlines: "boolean" },
    required: ["text"],
    prepare: (p) => ({ x: LAYOUT.centerX, y: LAYOUT.focusY, ...p }),
  },
  BeamDrop: { component: BeamDrop, layer: "world", code: "B12+B4", props: { asset: "string", x: "number", groundY: "number", scale: "number", landAt: "number", beamWidth: "number", darken: "boolean", glow: "string" }, required: ["asset"] },
  MissPop: { component: MissPop, layer: "world", code: "B10", props: { ...POS, text: "string", floatText: "string", floatX: "number", floatY: "number", sweat: "boolean", floatAt: "number" }, required: ["x", "y"] },

  // ── 結構 ──
  LevelTitleCard: { component: LevelTitleCard, layer: "hud", code: "C8", props: { level: "number|string", title: "string", hold: "number", ...POS }, required: ["level", "title"] },
  LevelTransition: {
    component: LevelTransition,
    layer: "hud",
    code: "A21",
    props: { type: "string", mode: "string", duration: "number", hold: "number", ...POS },
    required: ["type"],
    check: (p) => (p.type === "iris" ? [] : [`type「${p.type}」：時間軸裡只支援 "iris"；俯仰推入請用 scene 的 camera {"type":"tilt-push"}`]),
  },
  Counter: {
    component: Counter,
    layer: "world",
    code: "D1/C41/C20/C62",
    props: { ...POS, from: "number", to: "number", countStart: "number", countDuration: "number", tickEvery: "number", digits: "number", label: "string", labels: "array", zeroAt: "number", reviveAt: "number", reviveEvery: "number", variant: "string", prefix: "string", comma: "boolean" },
    required: ["x", "y"],
  },
  CrowdGrid: { component: CrowdGrid, layer: "hud", code: "A1/A18/A2", props: { cols: "number", rows: "number", hero: "object", heroPose: "string", assets: "array", mode: "string", start: "number", duration: "number", flashAt: "number", label: "string", labelAt: "number", seed: "number" } },
  Spotlight: { component: Spotlight, layer: "world", code: "A13", props: { ...POS, from: "number", to: "number", duration: "number", darkness: "number", soft: "number", stretch: "number" }, required: ["x", "y"] },

  // ── 片尾 ──
  ChestDeal: { component: ChestDeal, layer: "world", code: "C24", props: { x: "number", groundY: "number", cards: "number", pace: "number", scale: "number", takeAt: "array" } },
  SkillCard: {
    component: SkillCard,
    layer: "hud",
    code: "C25/C11/C59",
    props: { index: "number", title: "string", desc: "string", demo: "string", fromChest: "object", from: "object", enterDuration: "number", flipAt: "number", collectAt: "number", slot: "number", ...POS },
    required: ["index", "title"],
    check: (p) => demoCheck(p.demo),
    prepare: (p, ctx) => {
      const { demo, fromChest, ...rest } = p;
      const out: Record<string, any> = { ...rest };
      if (demo) {
        const Demo = SKILL_DEMOS[demo];
        out.renderDemo = (t: number) => (t >= 0 ? <Demo t={t} /> : null);
      }
      // fromChest: { index, of, x? }：從寶箱上方的扇形位置飛出來（自動換算成畫面座標）
      if (fromChest && !rest.from) {
        const fan = chestFanPosition(fromChest.index ?? 0, fromChest.of ?? 3, fromChest.x ?? WORLD.centerX, fromChest.groundY ?? WORLD.groundY);
        const s = worldToScreen(ctx.camera, fan.x, fan.y);
        out.from = { x: s.x, y: s.y, scale: 0.2, rotate: fan.rotate };
      }
      return out;
    },
  },
  SkillSummary: {
    component: SkillSummary,
    layer: "hud",
    code: "C59",
    props: { cards: "array", ...POS, scale: "number" },
    required: ["cards"],
    check: (p) => (Array.isArray(p.cards) ? p.cards.flatMap((c: any) => demoCheck(c?.demo)) : []),
    prepare: (p) => ({
      ...p,
      cards: (p.cards as any[]).map((c) => {
        const Demo = c.demo ? SKILL_DEMOS[c.demo] : undefined;
        return { title: c.title, desc: c.desc, renderDemo: Demo ? (t: number) => <Demo t={t} /> : undefined };
      }),
    }),
  },
  GamePopup: {
    component: GamePopup,
    layer: "hud",
    code: "C29/C30/B9",
    props: { variant: "string", ...POS, clickAt: "number", exitAt: "number", compact: "boolean", channel: "string", title: "string", question: "string", answer: "string", typeEvery: "number", name: "string", text: "string" },
    required: ["variant"],
    check: (p) => {
      const v = ["follow", "input", "achievement", "ending"];
      if (!v.includes(p.variant)) return [`variant「${p.variant}」不存在，可用：${v.join("、")}`];
      if (p.variant === "input" && !p.question) return ["variant input 需要 question"];
      if (p.variant === "achievement" && !p.name) return ["variant achievement 需要 name"];
      return [];
    },
  },
  NextTeaser: { component: NextTeaser, layer: "hud", code: "C32", props: { ...POS, label: "string" } },

  // ── 讓舞台物件本身動起來（不畫東西，交給舞台套用；必須有 event 的 target）──
  PropFx: {
    component: () => null,
    layer: "world",
    code: "道具動畫",
    props: { effect: "string", amount: "number", height: "number", times: "number", period: "number", color: "string", dx: "number", dy: "number" },
    required: ["effect"],
    check: (p) => (PROP_FX_EFFECTS.includes(p.effect) ? [] : [`effect「${p.effect}」不存在，可用：${PROP_FX_EFFECTS.join("、")}`]),
  },

  // ── 對話 ──
  DialogBox: { component: DialogBox, layer: "hud", code: "對話框", props: { speaker: "string", lines: "array", text: "string", typeStart: "number", typeEvery: "number", ...POS, w: "number", h: "number" } },
  ChoiceMenu: { component: ChoiceMenu, layer: "hud", code: "C6/C16", props: { options: "array", picks: "array", confirmAt: "number", ...POS, w: "number" }, required: ["options"] },
  ChoiceDialog: { component: ChoiceDialog, layer: "hud", code: "C6/C16", props: { speaker: "string", text: "string", options: "array", picks: "array", confirmAt: "number", typeEvery: "number", dialog: "object", menu: "object" }, required: ["text", "options"] },
};

const typeOk = (v: unknown, t: PropType) => {
  switch (t) {
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "string":
      return typeof v === "string";
    case "boolean":
      return typeof v === "boolean";
    case "array":
      return Array.isArray(v);
    case "object":
      return typeof v === "object" && v !== null && !Array.isArray(v);
    case "number|string":
      return typeof v === "number" || typeof v === "string";
  }
};

/** 檢查一個 event 的 component 與 props，回傳錯誤訊息（空陣列 = 沒問題） */
export const validateEvent = (component: string, props: Record<string, unknown> = {}): string[] => {
  const entry = REGISTRY[component];
  if (!entry) {
    return [`未知組件「${component}」。可用：${Object.keys(REGISTRY).join("、")}`];
  }
  const errors: string[] = [];
  for (const [k, v] of Object.entries(props)) {
    const t = entry.props[k];
    if (!t) errors.push(`未知參數「${k}」（${component} 可用：${Object.keys(entry.props).join("、")}）`);
    else if (!typeOk(v, t)) errors.push(`參數「${k}」應該是 ${t}，收到 ${JSON.stringify(v)}`);
  }
  for (const r of entry.required ?? []) if (props[r] === undefined) errors.push(`缺少必填參數「${r}」`);
  if (entry.check && errors.length === 0) errors.push(...entry.check(props as Record<string, any>));
  return errors;
};
