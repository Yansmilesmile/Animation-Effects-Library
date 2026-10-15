import * as THREE from "three";
import type { BuildContext, Layer3DType, Vec3 } from "../types";
import { boxMesh, paintSurface, pixelTexture, rgb255, rng, SurfaceSpec } from "../paint";

/**
 * terrain —— 戶外地面：一塊地（像素貼圖）、畫在地上的小路、建築方塊、低多邊形山坡、樹、路燈。
 * 天空背板用 environment.sky（任何場景共用）。座標：地面 y = 0，x 左右、z 往鏡頭。
 */
type Building = {
  id?: string;
  x: number;
  z: number;
  w?: number;
  d?: number;
  h?: number;
  rotY?: number;
  color?: string;
  roof?: "flat" | "gable";
  roofColor?: string;
  /** 正面（+z）窗戶 */
  windows?: { rows?: number; cols?: number; color?: string };
  door?: boolean;
};
type Hill = { id?: string; x: number; z: number; r?: number; h?: number; color?: string; depth?: number };
type Tree = { x: number; z: number; h?: number; color?: string };

export type TerrainParams = {
  /** 地面大小 [寬, 深]（以原點為中心） */
  size: [number, number];
  ground: SurfaceSpec;
  /** 地面貼圖密度（貼圖像素 / 公尺） */
  texel: number;
  /** 小路：中心線 [x, z] 點列（平滑曲線），畫進地面貼圖 */
  path: false | { points: [number, number][]; width?: number; color?: string; edgeColor?: string; dash?: string };
  buildings: Building[];
  hills: Hill[];
  /** 樹：清單，或 { count, area: [x0, z0, x1, z1], seed } 隨機撒 */
  trees: Tree[] | { count: number; area: [number, number, number, number]; seed?: number; color?: string; avoidPath?: number };
  /** 沿路的路燈：spacing 公尺一盞，左右交錯 */
  lamps: false | { spacing?: number; offset?: number; color?: string };
  /** 窗戶、路燈亮度 0..1（可補間：天黑亮燈） */
  lit: number;
};

const catmull = (pts: [number, number][], n: number) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return curve.getSpacedPoints(n).map((v) => [v.x, v.z] as [number, number]);
};

const build = (P: TerrainParams, ctx: BuildContext) => {
  const root = new THREE.Group();
  const lights: ((k: number) => void)[] = [];
  const [GW, GD] = P.size;
  const pathPts = P.path && P.path.points.length >= 2 ? catmull(P.path.points, Math.max(40, P.path.points.length * 24)) : [];

  // 地面貼圖（小路直接畫進去：像素硬邊）
  {
    const c = paintSurface(GW, GD, { style: "grass", color: "#4f6b3a", noise: 0.08, ...P.ground }, P.texel);
    const g = c.getContext("2d")!;
    if (P.path && pathPts.length) {
      // 沿中心線蓋整數像素的圓章（fillRect 不抗鋸齒，邊緣是硬的像素）
      const k = c.width / GW;
      const rand = rng((P.ground.seed ?? 1) + 31);
      const stamp = (wU: number, color: string, every = 1) => {
        const r = (wU * k) / 2;
        const ri = Math.ceil(r);
        let n = 0;
        g.fillStyle = color;
        for (let i = 1; i < pathPts.length; i++) {
          const [ax, az] = pathPts[i - 1];
          const [bx, bz] = pathPts[i];
          const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * k * 2));
          for (let s = 0; s < steps; s++, n++) {
            if (every > 1 && Math.floor(n / (k * 2 * 0.5)) % every) continue;
            const cx = Math.round((ax + ((bx - ax) * s) / steps + GW / 2) * k);
            const cy = Math.round((az + ((bz - az) * s) / steps + GD / 2) * k);
            for (let dy = -ri; dy <= ri; dy++)
              for (let dx = -ri; dx <= ri; dx++)
                if (dx * dx + dy * dy <= r * r) g.fillRect(cx + dx, cy + dy, 1, 1);
          }
        }
      };
      const w = P.path.width ?? 1.2;
      stamp(w + 0.3, P.path.edgeColor ?? "#5a4a36");
      stamp(w, P.path.color ?? "#a8977a");
      if (P.path.dash) stamp(0.1, P.path.dash, 2);
      // 路面撒一點雜點（像素質感）
      const pc = rgb255(P.path.color ?? "#a8977a");
      const img = g.getImageData(0, 0, c.width, c.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] !== pc[0] || d[i + 1] !== pc[1] || d[i + 2] !== pc[2]) continue;
        const r = rand();
        if (r > 0.08) continue;
        const k = r < 0.04 ? 0.88 : 1.1;
        d[i] = Math.min(255, d[i] * k);
        d[i + 1] = Math.min(255, d[i + 1] * k);
        d[i + 2] = Math.min(255, d[i + 2] * k);
      }
      g.putImageData(img, 0, 0);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), new THREE.MeshLambertMaterial({ map: pixelTexture(c) }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // 山坡：低多邊形半球（壓扁），頂點顏色帶一點明暗
  for (const h of P.hills) {
    const r = h.r ?? 4;
    const geo = new THREE.SphereGeometry(r, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
    const pos = geo.getAttribute("position");
    const cols = new Float32Array(pos.count * 3);
    const base = new THREE.Color(h.color ?? "#5d7a3e");
    const rand = rng(Math.round(h.x * 13 + h.z * 7) + 3);
    for (let i = 0; i < pos.count; i += 3) {
      const c = base.clone().multiplyScalar(0.9 + rand() * 0.2);
      for (let j = 0; j < 3; j++) cols.set([c.r, c.g, c.b], (i + j) * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.scale.set(1, (h.h ?? 2.5) / r, (h.depth ?? r) / r);
    m.position.set(h.x, 0, h.z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }

  // 建築方塊
  for (const b of P.buildings) {
    const w = b.w ?? 2;
    const d = b.d ?? 2;
    const h = b.h ?? 2;
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.rotY ?? 0;
    root.add(g);
    const wall = new THREE.MeshLambertMaterial({ color: b.color ?? "#7a5a44" });
    g.add(boxMesh(w, h, d, wall, 0, h / 2, 0));
    const roofMat = new THREE.MeshLambertMaterial({ color: b.roofColor ?? "#513b31", flatShading: true });
    if (b.roof === "gable") {
      const rh = Math.min(w, d) * 0.45;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 1, 1, 4, 1), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(((w + 0.2) / Math.SQRT2) * 1, rh, ((d + 0.2) / Math.SQRT2) * 1);
      roof.position.y = h + rh / 2;
      roof.castShadow = true;
      g.add(roof);
    } else g.add(boxMesh(w + 0.1, 0.1, d + 0.1, roofMat, 0, h + 0.05, 0));
    if (b.door !== false) g.add(boxMesh(Math.min(0.7, w * 0.3), Math.min(1, h * 0.45), 0.02, new THREE.MeshLambertMaterial({ color: "#161b2b" }), 0, Math.min(1, h * 0.45) / 2, d / 2 + 0.01, false));
    const win = b.windows ?? { rows: Math.max(1, Math.floor(h / 1.1)), cols: Math.max(1, Math.floor(w / 0.8)) };
    const rows = win.rows ?? 1;
    const cols = win.cols ?? 2;
    const wc = new THREE.Color(win.color ?? "#ffd27a");
    const dark = new THREE.Color("#161b2b");
    const mat = new THREE.MeshBasicMaterial({ color: dark });
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * (w / cols);
        const y = h * 0.62 + (r - (rows - 1) / 2) * Math.min(0.9, (h * 0.6) / rows);
        if (b.door !== false && rows === 1 && Math.abs(x) < 0.4) continue;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), mat);
        m.position.set(x, y, d / 2 + 0.012);
        g.add(m);
      }
    lights.push((k) => mat.color.copy(dark).lerp(wc.clone().multiplyScalar(1.4), k));
  }

  // 樹：低多邊形圓錐＋樹幹
  const trees: Tree[] = Array.isArray(P.trees)
    ? P.trees
    : (() => {
        const t = P.trees;
        const r = rng(t.seed ?? ctx.seed + 11);
        const out: Tree[] = [];
        const [x0, z0, x1, z1] = t.area;
        const avoid = t.avoidPath ?? ((P.path && P.path.width) || 1.2) + 0.6;
        for (let i = 0; i < t.count * 4 && out.length < t.count; i++) {
          const x = x0 + r() * (x1 - x0);
          const z = z0 + r() * (z1 - z0);
          if (pathPts.some(([px, pz]) => Math.hypot(px - x, pz - z) < avoid)) continue;
          if (P.buildings.some((b) => Math.abs(b.x - x) < (b.w ?? 2) / 2 + 0.6 && Math.abs(b.z - z) < (b.d ?? 2) / 2 + 0.6)) continue;
          out.push({ x, z, h: 0.9 + r() * 0.9, color: t.color });
        }
        return out;
      })();
  const trunkMat = new THREE.MeshLambertMaterial({ color: "#4a3426" });
  const leafMats = new Map<string, THREE.Material>();
  for (const t of trees) {
    const h = t.h ?? 1.4;
    const col = t.color ?? "#3f5e34";
    if (!leafMats.has(col)) leafMats.set(col, new THREE.MeshLambertMaterial({ color: col, flatShading: true }));
    root.add(boxMesh(0.12, h * 0.35, 0.12, trunkMat, t.x, (h * 0.35) / 2, t.z));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h * 0.75, 6), leafMats.get(col)!);
    cone.position.set(t.x, h * 0.35 + (h * 0.75) / 2 - 0.05, t.z);
    cone.castShadow = true;
    root.add(cone);
  }

  // 路燈
  if (P.lamps && pathPts.length) {
    const L = P.lamps;
    const spacing = L.spacing ?? 3;
    const off = L.offset ?? ((P.path && P.path.width) || 1.2) / 2 + 0.35;
    const col = new THREE.Color(L.color ?? "#ffd27a");
    const pole = new THREE.MeshLambertMaterial({ color: "#2a2422" });
    const headMat = new THREE.MeshBasicMaterial({ color: "#6a5a3a" });
    let acc = 0;
    let side = 1;
    for (let i = 1; i < pathPts.length; i++) {
      const [ax, az] = pathPts[i - 1];
      const [bx, bz] = pathPts[i];
      acc += Math.hypot(bx - ax, bz - az);
      if (acc < spacing) continue;
      acc = 0;
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = -(bz - az) / len;
      const nz = (bx - ax) / len;
      const x = bx + nx * off * side;
      const z = bz + nz * off * side;
      side = -side;
      root.add(boxMesh(0.06, 0.9, 0.06, pole, x, 0.45, z));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), headMat);
      head.position.set(x, 0.95, z);
      root.add(head);
      const pl = new THREE.PointLight(col, 0, 3.5, 1.6);
      pl.position.set(x, 0.85, z);
      root.add(pl);
      lights.push((k) => (pl.intensity = 2.5 * k));
    }
    lights.push((k) => headMat.color.set("#6a5a3a").lerp(col.clone().multiplyScalar(2.2), k));
  }

  return { object: root, update: (p: TerrainParams) => lights.forEach((l) => l(p.lit)) };
};

export const terrain: Layer3DType<TerrainParams> = {
  describe: "戶外地面：地、小路、建築方塊、山坡、樹、路燈（天空用 environment.sky）",
  defaults: {
    size: [40, 30],
    ground: { style: "grass", color: "#4f6b3a", noise: 0.08, blotches: 0.12, seed: 1 },
    texel: 8,
    path: false,
    buildings: [],
    hills: [],
    trees: [],
    lamps: false,
    lit: 0,
  },
  animatable: ["lit"],
  build,
  points: (p) => {
    const out: Record<string, Vec3> = {};
    for (const b of p.buildings) if (b.id) out[b.id] = [b.x, b.h ?? 2, b.z];
    for (const h of p.hills) if (h.id) out[h.id] = [h.x, h.h ?? 2.5, h.z];
    if (p.path && p.path.points.length) {
      const pts = p.path.points;
      out.path_start = [pts[0][0], 0, pts[0][1]];
      out.path_end = [pts[pts.length - 1][0], 0, pts[pts.length - 1][1]];
    }
    return out;
  },
};
