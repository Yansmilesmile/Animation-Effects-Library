import React from "react";
import { Ambience } from "../components/Ambience";
import { CameraState, worldToScreen } from "../components/Camera";
import { ChoiceDialog, ChoiceMenu, DialogBox } from "../components/dialog";
import { BeamDrop, GlowText, MissPop, QuestionBubble, RingPulse, Stamp, SunBurst, Tag } from "../components/emphasis";
import { Inventory, ProfileCard, QuestionCard } from "../components/panels";
import { BigTag, BookUnfold, CoinFlight, PriceTower, towerTargets } from "../components/data";
import { DropStack, KeyDrop, PropSwap, SmokePop } from "../components/props";
import { ICONS, TONES } from "../components/props/bitmaps";
import { EASE_NAMES, MOVE_NAMES } from "../three/stage3d/runtime";
import { ChestDeal, chestFanPosition, GamePopup, NextTeaser, SkillCard, SkillSummary, SKILL_DEMOS } from "../components/ending";
import { Host } from "../components/Host";
import { PLAY_MODES, Sprite } from "../components/Sprite";
import { Counter, CrowdGrid, LevelTitleCard, LevelTransition, Spotlight } from "../components/structure";
import { LAYOUT, WORLD } from "../theme";
import { PROP_FX_EFFECTS } from "./propfx";
import { ACTION_NAMES, ACTIONS } from "../actor/actions";

/**
 * 組件註冊表：時間軸 JSON 的 component 名稱 → React 組件 + 參數規格。
 * 參數規格用來在預覽中明顯報錯：未知組件、未知參數、缺必填、型別不對，都會顯示紅框，不會靜默略過。
 */
export type PropType = "number" | "string" | "boolean" | "object" | "array" | "number|string" | "string|object" | "number|boolean" | "number|array";

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
  /** 事件寫了 id 時，組件的各部分可以被 target 指名為 "<id>.<部分>"（"" = 整個）；世界座標，bottom = 底部 y */
  targets?: (p: Record<string, any>) => Record<string, { x: number; bottom: number; h: number }>;
};

const POS = { x: "number", y: "number" } as const;
const SPRITE_LOOK = { anchor: "string", scale: "number", flipX: "boolean", rotate: "number", tint: "string", tintAmount: "number", glow: "string", opacity: "number", bloom: "boolean" } as const;

const oneOf = (key: string, v: unknown, allowed: string[]) => (v === undefined || allowed.includes(String(v)) ? [] : [`${key}「${v}」不存在，可用：${allowed.join("、")}`]);
const iconCheck = (icon: unknown, tone: unknown) => [...oneOf("icon", icon, Object.keys(ICONS)), ...oneOf("tone", tone, Object.keys(TONES))];

const demoCheck = (name: unknown) => (name !== undefined && !(String(name) in SKILL_DEMOS) ? [`demo「${name}」不存在，可用：${Object.keys(SKILL_DEMOS).join("、")}`] : []);

export const REGISTRY: Record<string, RegistryEntry> = {
  // ── 素材 ──
  Sprite: {
    component: Sprite,
    layer: "world",
    code: "素材",
    props: { asset: "string", assetQuery: "string", ...POS, ...SPRITE_LOOK, animFps: "number", play: "string", row: "number", frameIndex: "number" },
    check: (p) => [
      ...(p.asset ? [] : p.assetQuery ? [`assetQuery「${p.assetQuery}」尚未解析成 asset，請先執行解析並使用鎖定版 JSON`] : ["缺少 asset"]),
      ...oneOf("play", p.play, PLAY_MODES),
    ],
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
  QuestionBubble: { component: QuestionBubble, layer: "world", code: "B14", props: { ...POS, text: "string", question: "string", size: "number", ink: "string" }, required: ["x", "y"] },

  // ── 道具 ──
  DropStack: {
    component: DropStack,
    layer: "world",
    code: "C1",
    props: { ...POS, asset: "string", icon: "string", tone: "string", count: "number", every: "number", fall: "number", fallFrames: "number", step: "number", jitter: "number", layout: "string", scale: "number", dust: "boolean" },
    required: ["x", "y"],
    check: (p) => [...iconCheck(p.icon, p.tone), ...oneOf("layout", p.layout, ["stack", "row"])],
  },
  PropSwap: {
    component: PropSwap,
    layer: "world",
    code: "C2",
    props: { ...POS, from: "string", to: "string", at: "number", scale: "number", toScale: "number", dust: "boolean", dustMode: "string", shrinkTo: "object", shrinkFrames: "number" },
    required: ["x", "y"],
    check: (p) => [...oneOf("dustMode", p.dustMode, ["dust", "smoke"]), ...(p.shrinkTo && !p.from ? ["shrinkTo 需要 from（要放到一邊的道具）"] : [])],
  },
  SmokePop: {
    component: SmokePop,
    layer: "world",
    code: "C38",
    props: { ...POS, asset: "string", scale: "number", flipX: "boolean", label: "string", tag: "string", tagAt: "number", tagVariant: "string", smoke: "string" },
    required: ["x", "y", "asset"],
  },
  KeyDrop: {
    component: KeyDrop,
    layer: "world",
    code: "C43",
    props: { ...POS, fromX: "number", fromY: "number", flyFrames: "number", asset: "string", scale: "number", hover: "number", ring: "boolean", ringColor: "string", label: "string", labelAt: "number", labelVariant: "string", morphTo: "string", morphAt: "number" },
    required: ["x", "y"],
    check: (p) => (p.morphTo !== undefined && p.morphAt === undefined ? ["morphTo 需要 morphAt（第幾幀變形）"] : []),
  },

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
  ProfileCard: {
    component: ProfileCard,
    layer: "hud",
    code: "C36",
    props: { ...POS, name: "string", title: "string", badge: "string", stat: "string", avatar: "string", avatarScale: "number", avatarDx: "number", avatarDy: "number", avatarBox: "number", layout: "string", from: "string", w: "number" },
    required: ["name"],
    check: (p) => [...oneOf("layout", p.layout, ["row", "column"]), ...oneOf("from", p.from, ["left", "right", "bottom", "none"])],
  },

  QuestionCard: {
    component: QuestionCard,
    layer: "hud",
    code: "B5 卡片",
    props: { ...POS, title: "string", asset: "string", assetScale: "number", text: "string", w: "number", h: "number", from: "object", openFrames: "number", hangers: "array", shrinkAt: "number", shrinkTo: "object", shrinkFrames: "number" },
    check: (p) => (Array.isArray(p.hangers) ? p.hangers.flatMap((hg: any, k: number) => (hg?.asset ? [] : [`hangers[${k}] 缺少 asset`])) : []),
  },

  // ── 數據 / 大型道具 ──
  PriceTower: {
    component: PriceTower,
    layer: "world",
    code: "D2",
    props: { ...POS, width: "number", base: "object", floors: "array", floorHeight: "number", gap: "number", rise: "boolean", riseFrames: "number", splitAt: "number", mergeAt: "number", splitFrames: "number", highlight: "array", redGlow: "array", crackAt: "number|array", collapse: "array", dust: "boolean" },
    required: ["x", "y", "floors"],
    targets: (p) => towerTargets(p as any),
  },
  BigTag: {
    component: BigTag,
    layer: "world",
    code: "B13 大 / D4",
    props: { ...POS, w: "number", h: "number", text: "string", textSize: "number", tone: "string", asset: "string", assetScale: "number", ropeTop: "number", dropFrames: "number", swing: "number", flips: "array", swings: "array" },
    required: ["x", "y"],
    check: (p) => [...oneOf("tone", p.tone, ["plain", "red", "gold"]), ...(p.text || p.asset ? [] : ["BigTag 需要 text 或 asset"])],
    targets: (p) => ({ "": { x: p.x, bottom: p.y + (p.h ?? 120) - 4, h: p.h ?? 120 } }),
  },
  CoinFlight: {
    component: CoinFlight,
    layer: "world",
    code: "C39",
    props: { ...POS, to: "array", count: "number", every: "number", flyFrames: "number", arc: "number", spread: "number", asset: "string", scale: "number", tone: "string", trail: "boolean", seed: "number" },
    required: ["x", "y", "to"],
    check: (p) => [
      ...oneOf("tone", p.tone, Object.keys(TONES)),
      ...(Array.isArray(p.to) ? p.to.flatMap((t: any, k: number) => (typeof t?.x === "number" && typeof t?.y === "number" ? [] : [`to[${k}] 要有 x / y 或 target`])) : []),
    ],
  },
  BookUnfold: {
    component: BookUnfold,
    layer: "world",
    code: "NEW-1",
    props: { ...POS, width: "number", from: "number", to: "number", step: "number", labelEvery: "number", labels: "array", openFrames: "number", tickEvery: "number", pageH: "number", cover: "string" },
    required: ["x", "y"],
    check: (p) => (p.labels === undefined && p.from !== undefined && p.to !== undefined && p.to < p.from ? ["to 要大於等於 from"] : []),
  },

  // ── 常駐 UI ──
  Inventory: {
    component: Inventory,
    layer: "hud",
    code: "F7",
    props: { ...POS, slots: "number", items: "array", size: "number", gap: "number", enter: "boolean" },
    required: ["slots"],
    check: (p) =>
      Array.isArray(p.items)
        ? p.items.flatMap((it: any, k: number) => [
            ...(typeof it?.at === "number" ? [] : [`items[${k}] 缺少 at（第幾幀放進格子）`]),
            ...(it?.asset ? [] : iconCheck(it?.icon, it?.tone).map((e) => `items[${k}] ${e}`)),
          ])
        : [],
  },

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

  // ── 角色動作（不畫東西，交給 scene.actors 宣告的角色；見 docs/actors.md）──
  Act: {
    component: () => null,
    layer: "world",
    code: "ACT",
    props: { actor: "string", action: "string", view: "string", facing: "string", loop: "boolean", from: "string|object", to: "string|object", prop: "string", speed: "number" },
    required: ["actor", "action"],
    check: (p) => [
      ...(p.action in ACTIONS ? [] : [`動作「${p.action}」不存在，可用：${ACTION_NAMES.join("、")}`]),
      ...(p.view === undefined || ["front", "side"].includes(p.view) ? [] : [`view「${p.view}」不存在，可用：front、side`]),
      ...(p.facing === undefined || ["left", "right"].includes(p.facing) ? [] : [`facing「${p.facing}」不存在，可用：left、right`]),
    ],
  },
  ActorState: {
    component: () => null,
    layer: "world",
    code: "ACT",
    props: { actor: "string", costume: "string", silhouette: "boolean", dim: "number|boolean", scale: "number", visible: "boolean", view: "string", facing: "string", talk: "boolean", at: "string|object", tagText: "string" },
    required: ["actor"],
    check: (p) => [
      ...(p.scale === undefined || (Number.isInteger(p.scale) && p.scale > 0) ? [] : [`scale 必須是正整數，收到 ${p.scale}`]),
      ...(p.view === undefined || ["front", "side"].includes(p.view) ? [] : [`view「${p.view}」不存在，可用：front、side`]),
      ...(p.facing === undefined || ["left", "right"].includes(p.facing) ? [] : [`facing「${p.facing}」不存在，可用：left、right`]),
    ],
  },

  // ── 3D 舞台（不畫東西，交給 scene.stage3d 的執行期；見 docs/stage3d.md）──
  S3State: {
    component: () => null,
    layer: "world",
    code: "3D 物件狀態",
    props: { object: "string", to: "string", ease: "string" },
    required: ["object", "to"],
    check: (p) => oneOf("ease", p.ease, EASE_NAMES),
  },
  S3Camera: {
    component: () => null,
    layer: "world",
    code: "3D 鏡頭",
    props: { to: "string|object", move: "string", ease: "string" },
    required: ["to"],
    check: (p) => [...oneOf("move", p.move, MOVE_NAMES), ...oneOf("ease", p.ease, EASE_NAMES)],
  },
  S3Focus: {
    component: () => null,
    layer: "world",
    code: "A20 景深",
    props: { anchor: "string", off: "boolean", blur: "number" },
    check: (p) => (p.anchor || p.off ? [] : ["S3Focus 需要 anchor（對焦的錨點）或 off: true"]),
  },

  // ── 對話 ──
  DialogBox: { component: DialogBox, layer: "hud", code: "對話框", props: { speaker: "string", lines: "array", text: "string", typeStart: "number", typeEvery: "number", ...POS, w: "number", h: "number" } },
  ChoiceMenu: { component: ChoiceMenu, layer: "hud", code: "C6/C16", props: { options: "array", picks: "array", confirmAt: "number", ...POS, w: "number" }, required: ["options"] },
  ChoiceDialog: { component: ChoiceDialog, layer: "hud", code: "C6/C16", props: { speaker: "string", text: "string", options: "array", picks: "array", confirmAt: "number", typeEvery: "number", dialog: "object", menu: "object" }, required: ["text", "options"] },
};

/**
 * 外部專案（影片資料夾）註冊只有這支片用的組件，例如特製的過場。
 * 在影片的入口檔呼叫一次；名稱不能和引擎的組件重複。
 */
export const registerComponents = (entries: Record<string, RegistryEntry>) => {
  for (const [name, entry] of Object.entries(entries)) {
    if (REGISTRY[name] && REGISTRY[name] !== entry) throw new Error(`組件名稱「${name}」已經存在，請換一個名字`);
    REGISTRY[name] = entry;
  }
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
    case "string|object":
      return typeof v === "string" || (typeof v === "object" && v !== null && !Array.isArray(v));
    case "number|boolean":
      return typeof v === "number" || typeof v === "boolean";
    case "number|array":
      return typeof v === "number" || Array.isArray(v);
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
