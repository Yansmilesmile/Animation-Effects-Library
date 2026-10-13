import actorsJson from "../generated/actors.json";

/**
 * 角色骨架（scripts/actors.mjs 從 assets/actors/<id>/ 產生）＋ 像素柵格化。
 * 每幀依骨架算出各骨頭的矩陣，在「原生解析度」逐像素反查來源像素（最近鄰）：
 * 肢體轉動時一格一格地動，不會出現斜邊、半像素，和素材庫的像素圖一致。
 */
type Px = [number, number, string];
export type BoneDef = { id: string; parent: string; pivot: [number, number]; sign: number; hidden: boolean; px: Px[]; fill: Px[] };
export type AddBone = { id: string; parent: string; pivot: [number, number]; pixels: Px[]; after?: string };
export type ViewDef = {
  w: number;
  h: number;
  root: [number, number];
  bones: BoneDef[];
  z: string[];
  slots: Record<string, { bone: string; at: [number, number] }>;
  faces: Record<string, Px[]>;
  mouths: Px[][];
};
export type Costume = {
  name?: string;
  /** views：只換這個範圍 [x0,y0,x1,y1] 內的像素（依視角）；寫了 views 但沒有這個視角 = 這個視角不換 */
  recolor?: { bones: string[]; map: Record<string, string>; views?: Record<string, [number, number, number, number]> }[];
  add?: Record<string, AddBone[]>;
};
export type ActorDef = { name: string; views: Record<string, ViewDef>; costumes: Record<string, Costume> };

export const ACTORS = actorsJson as unknown as Record<string, ActorDef>;

/** 骨頭的姿勢：r = 角度（度，乘上骨頭的 sign）、dx / dy = 位移（原生像素，在父骨頭座標系） */
export type BonePose = { r: number; dx: number; dy: number };
export type Pose = Record<string, BonePose>;

// 2D 仿射矩陣 [a, b, c, d, e, f]（和 SVG 一樣：x' = a x + c y + e、y' = b x + d y + f）
export type Mat = [number, number, number, number, number, number];
const I: Mat = [1, 0, 0, 1, 0, 0];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const inv = (m: Mat): Mat => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
};
export const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** 繞樞紐 (px, py) 旋轉 deg 度，再平移 (dx, dy) */
const local = (px: number, py: number, deg: number, dx: number, dy: number): Mat => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // T(p + d) · R · T(-p)
  return [c, s, -s, c, px + dx - c * px + s * py, py + dy - s * px - c * py];
};

type Grid = { x0: number; y0: number; w: number; h: number; c: (string | undefined)[] };
const toGrid = (px: Px[]): Grid | null => {
  if (!px.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of px) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const c: (string | undefined)[] = new Array(w * h);
  for (const [x, y, col] of px) c[(y - y0) * w + (x - x0)] = col;
  return { x0, y0, w, h, c };
};

type Bone = { id: string; parent: string; pivot: [number, number]; sign: number; hidden: boolean; grid: Grid | null; fill: Grid | null };
type Built = { view: ViewDef; bones: Map<string, Bone>; order: string[] };
const cache = new Map<string, Built>();

/** 骨架 + 換裝（換色、加骨頭）組合好的結果，依 actor / view / costume 快取 */
export const buildRig = (actorId: string, viewId: string, costumeId?: string): Built | null => {
  const key = `${actorId}|${viewId}|${costumeId ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const actor = ACTORS[actorId];
  const view = actor?.views[viewId];
  if (!view) return null;
  const costume = costumeId ? actor.costumes[costumeId] : undefined;
  const recolorFor = (bone: string) => {
    const rules = (costume?.recolor ?? []).filter((r) => r.bones.includes(bone) && (!r.views || r.views[viewId]));
    const inRect = (r: (typeof rules)[number], x: number, y: number) => {
      const b = r.views?.[viewId];
      return !b || (x >= b[0] && y >= b[1] && x <= b[2] && y <= b[3]);
    };
    return (px: Px[]): Px[] => (rules.length ? px.map(([x, y, c]) => [x, y, rules.reduce((cc, r) => (inRect(r, x, y) ? r.map[cc] ?? cc : cc), c)]) : px);
  };
  const bones = new Map<string, Bone>();
  for (const b of view.bones) {
    const rc = recolorFor(b.id);
    bones.set(b.id, { id: b.id, parent: b.parent, pivot: b.pivot, sign: b.sign, hidden: b.hidden, grid: toGrid(rc(b.px)), fill: toGrid(rc(b.fill)) });
  }
  const order = [...view.z];
  for (const a of costume?.add?.[viewId] ?? []) {
    bones.set(a.id, { id: a.id, parent: a.parent, pivot: a.pivot, sign: 1, hidden: false, grid: toGrid(a.pixels), fill: null });
    const i = a.after ? order.indexOf(a.after) : -1;
    if (i >= 0) order.splice(i + 1, 0, a.id);
    else order.push(a.id);
  }
  const built = { view, bones, order };
  cache.set(key, built);
  return built;
};

/** 每根骨頭的世界矩陣（原生像素座標） */
export const boneMatrices = (rig: Built, pose: Pose): Map<string, Mat> => {
  const out = new Map<string, Mat>();
  const [rx, ry] = rig.view.root;
  const rp = pose.root;
  out.set("root", rp ? local(rx, ry, rp.r, Math.round(rp.dx), Math.round(rp.dy)) : I);
  const get = (id: string): Mat => {
    const m = out.get(id);
    if (m) return m;
    const b = rig.bones.get(id);
    if (!b) return I;
    const p = pose[id];
    const parent = get(b.parent);
    const l = p ? local(b.pivot[0], b.pivot[1], p.r * b.sign, Math.round(p.dx), Math.round(p.dy)) : I;
    const w = mul(parent, l);
    out.set(id, w);
    return w;
  };
  for (const id of rig.bones.keys()) get(id);
  return out;
};

const isIdentityTranslate = (m: Mat) => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;

/**
 * 柵格化：回傳 Map("x,y" → 顏色)，座標是原生像素（相對來源 SVG 原點，可能是負的）。
 * overrides：頭部表情 / 嘴型（來源座標的像素替換，跟著頭一起轉）。
 */
export const rasterize = (
  rig: Built,
  mats: Map<string, Mat>,
  opts: { show?: Set<string>; hide?: Set<string>; overrides?: Map<string, string> } = {},
): Map<string, string> => {
  const out = new Map<string, string>();
  const paint = (g: Grid, m: Mat, over?: Map<string, string>, onlyEmpty?: Grid | null) => {
    if (isIdentityTranslate(m) && Number.isInteger(m[4]) && Number.isInteger(m[5])) {
      // 沒有旋轉：直接平移，最快也最準
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) {
          const sx = g.x0 + x;
          const sy = g.y0 + y;
          if (onlyEmpty && gridAt(onlyEmpty, sx, sy)) continue;
          const c = over?.get(`${sx},${sy}`) ?? g.c[y * g.w + x];
          if (c) out.set(`${sx + m[4]},${sy + m[5]}`, c);
        }
      return;
    }
    const im = inv(m);
    const corners = [apply(m, g.x0, g.y0), apply(m, g.x0 + g.w, g.y0), apply(m, g.x0, g.y0 + g.h), apply(m, g.x0 + g.w, g.y0 + g.h)];
    const X0 = Math.floor(Math.min(...corners.map((p) => p[0])));
    const X1 = Math.ceil(Math.max(...corners.map((p) => p[0])));
    const Y0 = Math.floor(Math.min(...corners.map((p) => p[1])));
    const Y1 = Math.ceil(Math.max(...corners.map((p) => p[1])));
    for (let Y = Y0; Y < Y1; Y++)
      for (let X = X0; X < X1; X++) {
        const [fx, fy] = apply(im, X + 0.5, Y + 0.5);
        const sx = Math.floor(fx);
        const sy = Math.floor(fy);
        const base = gridAt(g, sx, sy);
        if (!base) continue;
        if (onlyEmpty && gridAt(onlyEmpty, sx, sy)) continue;
        out.set(`${X},${Y}`, over?.get(`${sx},${sy}`) ?? base);
      }
  };
  for (const id of rig.order) {
    const b = rig.bones.get(id);
    if (!b) continue;
    const visible = b.hidden ? opts.show?.has(id) : !opts.hide?.has(id);
    if (!visible) continue;
    const m = mats.get(id) ?? I;
    if (b.fill) paint(b.fill, m, undefined, b.grid);
    if (b.grid) paint(b.grid, m, id === "head" ? opts.overrides : undefined);
  }
  return out;
};

const gridAt = (g: Grid, x: number, y: number) => {
  const gx = x - g.x0;
  const gy = y - g.y0;
  if (gx < 0 || gy < 0 || gx >= g.w || gy >= g.h) return undefined;
  return g.c[gy * g.w + gx];
};

/** 像素 Map → SVG 路徑（同色、同一列連續的像素合併成一個矩形） */
export const toPaths = (px: Map<string, string>) => {
  const rows = new Map<number, [number, string][]>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [k, c] of px) {
    const [x, y] = k.split(",").map(Number);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    let r = rows.get(y);
    if (!r) rows.set(y, (r = []));
    r.push([x, c]);
  }
  const byFill = new Map<string, string>();
  for (const [y, r] of rows) {
    r.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < r.length; ) {
      let j = i;
      while (j + 1 < r.length && r[j + 1][0] === r[j][0] + 1 && r[j + 1][1] === r[i][1]) j++;
      const n = j - i + 1;
      byFill.set(r[i][1], (byFill.get(r[i][1]) ?? "") + `M${r[i][0]} ${y}h${n}v1h-${n}Z`);
      i = j + 1;
    }
  }
  return { paths: [...byFill].map(([fill, d]) => ({ fill, d })), box: px.size ? { minX, minY, maxX, maxY } : null };
};
