import * as THREE from "three";
import type { BuildContext, Layer3DType, Vec3 } from "../types";
import { beamMesh, blobShadowMesh, boxMesh, makeCanvas, paintSurface, PixelArt, pixelsToCanvas, pixelTexture, rgb255, rng, shade, SurfaceSpec } from "../paint";

/**
 * room —— 室內房間（一點透視的「盒子」）：後牆、側牆、地板、天花板、踢腳板，
 * 後牆開口（window 窗：夜景＋城市剪影＋雪＋窗光；oneWayGlass 深色玻璃），家具（table / chair / pendant 吊燈 / mirror），
 * 字串像素圖道具（props，可帶 light = 檯燈）。底子是使用者的 pixel_room_study.html（深夜書房）。
 *
 * 座標：後牆在 z = 0，房間往 +z 延伸到 depth；地板 y = 0；x 置中。
 * 貼圖密度：在 ref（鏡頭距離 distance、視角 fov）上 1 個貼圖像素 ≈ 1 個 3D 畫面像素 × texelScale。
 */
type Opening = {
  type: "window" | "oneWayGlass";
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  frameColor?: string;
  frameWidth?: number;
  brightness?: number;
  // oneWayGlass
  glassTop?: string;
  glassBottom?: string;
  streaks?: number;
  // window
  mullions?: [number, number];
  sill?: boolean;
  night?: {
    skyTop?: string;
    skyBottom?: string;
    skyBands?: number;
    stars?: number;
    moon?: { x: number; y: number; r?: number; color?: string };
    far?: { color: string; minH: number; maxH: number; litWindows: number; litColor: string };
    near?: { color: string; minH: number; maxH: number; litWindows: number; litColor: string };
    blinkLight?: string;
    snow?: boolean;
    snowCount?: number;
    snowSpeed?: number;
    snowColor?: string;
    seed?: number;
  };
  /** 窗光：從窗外打進來的聚光燈（pattern = 窗格影子、beam = 光柱） */
  light?: { color?: string; intensity?: number; behind?: number; penumbra?: number; angle?: number; target?: Vec3; pattern?: boolean; beam?: number; castShadow?: boolean };
  seed?: number;
};

type Furniture = { type: string; id?: string; x?: number; z?: number; [k: string]: any };

type Prop = {
  id?: string;
  /** arts 裡的名稱 */
  art: string;
  x?: number;
  y?: number;
  z?: number;
  anchor?: "bottom" | "center";
  /** 1 個貼圖像素 = 幾個 3D 畫面像素（在 ref 距離），預設 2（粗像素道具） */
  pixelScale?: number;
  tint?: string;
  flip?: boolean;
  shadow?: boolean;
  glowBoost?: number;
  /** 道具自帶的點光源（檯燈）：offset = 相對道具底部中心 [x, y] */
  light?: { color?: string; intensity?: number; distance?: number; offset?: [number, number] };
};

export type RoomParams = {
  width: number;
  depth: number;
  height: number;
  ref: { fov: number; distance: number };
  texelScale: number;
  wall: SurfaceSpec & { sideShade?: number };
  floor: SurfaceSpec;
  ceiling: SurfaceSpec | false;
  baseboard?: { height: number; color?: string };
  openings: Opening[];
  furniture: Furniture[];
  props: Prop[];
  /** 道具圖：字串像素圖（rows + palette，可有 glow 字元）或 { "asset": 素材 path }（圖片，npx superbot-assets 會複製） */
  arts: Record<string, PixelArt | { asset: string }>;
  /** 房間所有燈（窗光、吊燈、道具燈）的亮度倍數，可補間（關燈 / 開燈） */
  lightLevel: number;
};

const FACING: Record<string, number> = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 };

const build = (P: RoomParams, ctx: BuildContext) => {
  const root = new THREE.Group();
  const updaters: ((t: number, p: RoomParams) => void)[] = [];
  /** 會跟著 lightLevel 變亮變暗的燈 */
  const dimmers: ((k: number) => void)[] = [];
  const TAN = Math.tan(THREE.MathUtils.degToRad(P.ref.fov / 2));
  const pxPerUnit = (depth: number) => ctx.height / (2 * Math.max(depth, 0.05) * TAN);
  const TPU = pxPerUnit(P.ref.distance) / (P.texelScale || 1);
  const { width: RW, depth: RD, height: RH } = P;
  const add = (o: THREE.Object3D, parent: THREE.Object3D = root) => (parent.add(o), o);

  const frame = (o: Opening, parent: THREE.Object3D = root) => {
    const f = o.frameWidth ?? 0.06;
    const mat = new THREE.MeshLambertMaterial({ color: o.frameColor || "#222" });
    const cy = o.y + o.h / 2;
    const dz = 0.04;
    add(boxMesh(o.w + 2 * f, f, dz, mat, o.x, o.y + o.h + f / 2, dz / 2, false), parent);
    add(boxMesh(o.w + 2 * f, f, dz, mat, o.x, o.y - f / 2, dz / 2, false), parent);
    add(boxMesh(f, o.h, dz, mat, o.x - o.w / 2 - f / 2, cy, dz / 2, false), parent);
    add(boxMesh(f, o.h, dz, mat, o.x + o.w / 2 + f / 2, cy, dz / 2, false), parent);
    return mat;
  };

  // ── 房間盒子 ──
  {
    const side = P.wall.sideShade ?? 0.75;
    const surf = (spec: SurfaceSpec, wU: number, hU: number, k = 1) => {
      const m = new THREE.MeshLambertMaterial({ map: pixelTexture(paintSurface(wU, hU, spec, TPU)) });
      m.color.setScalar(k);
      return m;
    };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), surf(P.wall, RW, RH));
    back.position.set(0, RH / 2, 0);
    back.receiveShadow = true;
    add(back);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), surf(P.floor, RW, RD));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set(0, 0, RD / 2);
    fl.receiveShadow = true;
    add(fl);
    if (P.ceiling) {
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), surf(P.ceiling, RW, RD));
      ce.rotation.x = Math.PI / 2;
      ce.position.set(0, RH, RD / 2);
      add(ce);
    }
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), surf({ ...P.wall, seed: (P.wall.seed || 1) + (s > 0 ? 7 : 13), drips: 0 }, RD, RH, side));
      m.rotation.y = (-s * Math.PI) / 2;
      m.position.set((s * RW) / 2, RH / 2, RD / 2);
      m.receiveShadow = true;
      add(m);
    }
    const bb = P.baseboard;
    if (bb && bb.height) {
      const mat = new THREE.MeshLambertMaterial({ color: bb.color || "#222" });
      add(boxMesh(RW, bb.height, 0.03, mat, 0, bb.height / 2, 0.015, false));
      for (const s of [-1, 1]) {
        const m2 = mat.clone();
        m2.color.multiplyScalar(side);
        add(boxMesh(0.03, bb.height, RD, m2, s * (RW / 2 - 0.015), bb.height / 2, RD / 2, false));
      }
    }
  }

  // ── 後牆開口 ──
  const oneWayGlass = (o: Opening) => {
    const w = Math.max(2, Math.round(o.w * TPU));
    const h = Math.max(2, Math.round(o.h * TPU));
    const c = makeCanvas(w, h);
    const g = c.getContext("2d")!;
    const rand = rng(o.seed || 2);
    const top = rgb255(o.glassTop || "#1a2733");
    const bot = rgb255(o.glassBottom || "#0b1218");
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      g.fillStyle = `rgb(${(top[0] + (bot[0] - top[0]) * t) | 0},${(top[1] + (bot[1] - top[1]) * t) | 0},${(top[2] + (bot[2] - top[2]) * t) | 0})`;
      g.fillRect(0, y, w, 1);
    }
    const st = o.streaks ?? 0.1;
    for (let i = 0; i < 3; i++) {
      const x0 = (0.15 + i * 0.28 + rand() * 0.08) * w;
      const bw = 1 + Math.floor(rand() * 3);
      g.fillStyle = `rgba(200,220,240,${st * (1 - i * 0.25)})`;
      for (let y = 0; y < h; y++) g.fillRect(Math.round(x0 + y * 0.6 - h * 0.3), y, bw, 1);
    }
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, 0, 1, h);
    const mat = new THREE.MeshBasicMaterial({ map: pixelTexture(c) });
    mat.color.setScalar(o.brightness ?? 1);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
    pane.position.set(o.x, o.y + o.h / 2, 0.006);
    add(pane);
    frame(o);
    add(boxMesh(o.w + 0.2, 0.03, 0.12, new THREE.MeshLambertMaterial({ color: o.frameColor || "#222" }), o.x, o.y - (o.frameWidth ?? 0.06) - 0.015, 0.06, true));
  };

  const windowOpening = (o: Opening) => {
    const n = o.night ?? {};
    const rand = rng(n.seed || 7);
    const w = Math.max(8, Math.round(o.w * TPU));
    const h = Math.max(8, Math.round(o.h * TPU));
    const bg = makeCanvas(w, h);
    const b = bg.getContext("2d")!;
    const t0 = rgb255(n.skyTop || "#070b16");
    const t1 = rgb255(n.skyBottom || "#3a2a2c");
    const bands = n.skyBands || 6;
    for (let y = 0; y < h; y++) {
      const t = Math.min(bands - 1, Math.floor((y / h) * bands)) / (bands - 1);
      b.fillStyle = `rgb(${(t0[0] + (t1[0] - t0[0]) * t) | 0},${(t0[1] + (t1[1] - t0[1]) * t) | 0},${(t0[2] + (t1[2] - t0[2]) * t) | 0})`;
      b.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < (n.stars || 0); i++) {
      b.fillStyle = `rgba(220,230,255,${0.3 + rand() * 0.5})`;
      b.fillRect((rand() * w) | 0, (rand() * h * 0.45) | 0, 1, 1);
    }
    if (n.moon) {
      const m = n.moon;
      const r = Math.max(1, Math.round(((m.r || 3) * ctx.width) / 640));
      b.fillStyle = shade(m.color || "#f3ead2");
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) b.fillRect(Math.round(m.x * w + x), Math.round(m.y * h + y), 1, 1);
    }
    const blinkers: [number, number][] = [];
    const skyline = (L: NonNullable<typeof n.far> | undefined, isNear: boolean) => {
      if (!L) return;
      let x = -2;
      while (x < w) {
        const bw = 2 + Math.floor(rand() * (isNear ? 5 : 4));
        const bh = Math.round(h * (L.minH + rand() * (L.maxH - L.minH)));
        const y0 = h - bh;
        b.fillStyle = shade(L.color);
        b.fillRect(x, y0, bw, bh);
        if (isNear && rand() < 0.35) blinkers.push([x + (bw >> 1), y0 - 1]);
        for (let yy = y0 + 2; yy < h - 1; yy += 2)
          for (let xx = x + 1; xx < x + bw - 1; xx += 2)
            if (rand() < L.litWindows) {
              b.fillStyle = shade(L.litColor, 0.7 + rand() * 0.4);
              b.fillRect(xx, yy, 1, 1);
            }
        x += bw + (rand() < 0.3 ? 1 : 0);
      }
    };
    skyline(n.far, false);
    skyline(n.near, true);

    // 雪、閃燈：位置只由時間決定
    const live = makeCanvas(w, h);
    const lc = live.getContext("2d")!;
    const lt = pixelTexture(live);
    const flakes: { x: number; y: number; v: number; ph: number }[] = [];
    if (n.snow) for (let i = 0; i < Math.round(((n.snowCount || 60) * (w * h)) / 2000); i++) flakes.push({ x: rand() * w, y: rand() * h, v: (0.5 + rand()) * (n.snowSpeed || 8) * (h / 50), ph: rand() * 6.28 });
    const snowCol = shade(n.snowColor || "#e8eef8");
    updaters.push((t) => {
      lc.drawImage(bg, 0, 0);
      if (n.blinkLight) {
        lc.fillStyle = shade(n.blinkLight);
        blinkers.forEach(([bx, by], i) => {
          if (Math.sin(t * 2 + i * 1.7) > 0.6) lc.fillRect(bx, by, 1, 1);
        });
      }
      lc.fillStyle = snowCol;
      for (const f of flakes) {
        const y = ((((f.y + f.v * t) % (h + 1)) + h + 1) % (h + 1)) - 1;
        let x = f.x + ((Math.cos(f.ph) - Math.cos(t * 1.3 + f.ph)) * 3) / 1.3;
        x = ((x % w) + w) % w;
        lc.fillRect(x | 0, y | 0, 1, 1);
      }
      lt.needsUpdate = true;
    });

    const mat = new THREE.MeshBasicMaterial({ map: lt, fog: false });
    mat.color.setScalar(o.brightness ?? 1.3);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
    pane.position.set(o.x, o.y + o.h / 2, 0.006);
    add(pane);
    const fmat = frame(o);
    const [mc, mr] = o.mullions || [0, 0];
    const mw = (o.frameWidth ?? 0.06) * 0.6;
    for (let i = 1; i <= mc; i++) add(boxMesh(mw, o.h, 0.03, fmat, o.x - o.w / 2 + (o.w * i) / (mc + 1), o.y + o.h / 2, 0.02, false));
    for (let i = 1; i <= mr; i++) add(boxMesh(o.w, mw, 0.03, fmat, o.x, o.y + (o.h * i) / (mr + 1), 0.02, false));
    if (o.sill !== false) add(boxMesh(o.w + 0.24, 0.04, 0.14, fmat, o.x, o.y - (o.frameWidth ?? 0.06) - 0.02, 0.07, true));

    if (o.light) {
      const L = o.light;
      const tg = L.target || [o.x * 0.5, 0, 2];
      const center = new THREE.Vector3(o.x, o.y + o.h / 2, 0);
      const target = new THREE.Vector3(tg[0], tg[1], tg[2]);
      const sp = new THREE.SpotLight(L.color || "#ffb878", L.intensity ?? 20, 0, THREE.MathUtils.degToRad(L.angle ?? 30), L.penumbra ?? 0.6, 2);
      let half = 0;
      if (L.behind) {
        const dir = target.clone().sub(center).normalize();
        sp.position.copy(center).addScaledVector(dir, -L.behind);
        half = (Math.hypot(o.w, o.h) / 2) * 1.1;
        sp.angle = Math.atan(half / L.behind);
      } else sp.position.set(o.x, o.y + o.h * 0.55, 0.2);
      sp.target.position.copy(target);
      sp.castShadow = !!L.castShadow || !!L.pattern;
      sp.shadow.mapSize.set(1024, 1024);
      sp.shadow.bias = -0.0008;
      if (L.pattern && half) {
        // 窗格影子：聚光燈的 map
        const N = 128;
        const pc = makeCanvas(N, N);
        const px = pc.getContext("2d")!;
        const pw = Math.round((N * o.w) / 2 / half);
        const ph = Math.round((N * o.h) / 2 / half);
        const x0 = (N - pw) >> 1;
        const y0 = (N - ph) >> 1;
        px.fillStyle = "#000";
        px.fillRect(0, 0, N, N);
        px.fillStyle = "#fff";
        px.fillRect(x0, y0, pw, ph);
        px.fillStyle = "#000";
        for (let i = 1; i <= mc; i++) px.fillRect(Math.round(x0 + (pw * i) / (mc + 1)) - 2, y0, 4, ph);
        for (let i = 1; i <= mr; i++) px.fillRect(x0, Math.round(y0 + (ph * i) / (mr + 1)) - 2, pw, 4);
        sp.map = pixelTexture(pc);
      }
      add(sp);
      add(sp.target);
      const base = sp.intensity;
      dimmers.push((k) => (sp.intensity = base * k));
      if (L.beam) {
        const len = sp.position.distanceTo(target);
        const cone = beamMesh(new THREE.Color(L.color || "#ffb878"), L.beam, Math.tan(sp.angle) * len * 0.85, len);
        cone.position.copy(sp.position);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(sp.position).normalize());
        add(cone);
        const u = (cone.material as THREE.ShaderMaterial).uniforms.uAlpha;
        dimmers.push((k) => (u.value = L.beam! * k));
      }
    }
  };
  for (const o of P.openings) {
    if (o.type === "oneWayGlass") oneWayGlass(o);
    else if (o.type === "window") windowOpening(o);
  }

  // ── 家具 ──
  const metalMat = (color: string, shininess = 30) => new THREE.MeshPhongMaterial({ color, shininess, specular: 0x3a3f44, flatShading: true });
  for (const f of P.furniture) {
    const g = new THREE.Group();
    g.position.set(f.x || 0, 0, f.z ?? 2);
    g.rotation.y = typeof f.facing === "string" ? FACING[f.facing] ?? 0 : f.rotY ?? 0;
    add(g);
    if (f.type === "table") {
      const w = f.w ?? 1.5;
      const d = f.d ?? 0.75;
      const h = f.h ?? 0.76;
      const th = 0.04;
      const leg = 0.05;
      const side = metalMat(f.color || "#7d858b", f.shininess);
      const top = new THREE.MeshPhongMaterial({
        map: pixelTexture(paintSurface(w, d, { style: f.topStyle ?? "metal", color: f.topColor || f.color || "#8d959b", noise: 0.04, seed: 21 }, TPU * 1.4)),
        shininess: f.shininess ?? 40,
        specular: 0x50565c,
      });
      const tm = new THREE.Mesh(new THREE.BoxGeometry(w, th, d), [side, side, top, side, side, side]);
      tm.position.y = h - th / 2;
      tm.castShadow = tm.receiveShadow = true;
      g.add(tm);
      g.add(boxMesh(w - 0.08, 0.08, 0.02, side, 0, h - th - 0.04, d / 2 - 0.05));
      g.add(boxMesh(w - 0.08, 0.08, 0.02, side, 0, h - th - 0.04, -d / 2 + 0.05));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(boxMesh(leg, h - th, leg, side, sx * (w / 2 - leg), (h - th) / 2, sz * (d / 2 - leg)));
      for (const sx of [-1, 1]) g.add(boxMesh(leg * 0.6, leg * 0.6, d - 2 * leg, side, sx * (w / 2 - leg), 0.12, 0));
    } else if (f.type === "chair") {
      const m = metalMat(f.color || "#69727a", 25);
      const sw = 0.44;
      const sd = 0.42;
      const sh = f.seatHeight ?? 0.46;
      const bh = f.backHeight ?? 0.92;
      const leg = 0.03;
      g.add(boxMesh(sw, 0.035, sd, m, 0, sh, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(boxMesh(leg, sh, leg, m, sx * (sw / 2 - leg), sh / 2, sz * (sd / 2 - leg)));
      for (const sx of [-1, 1]) g.add(boxMesh(leg, bh - sh, leg, m, sx * (sw / 2 - leg), sh + (bh - sh) / 2, -sd / 2 + leg / 2));
      g.add(boxMesh(sw, 0.16, 0.025, m, 0, bh - 0.1, -sd / 2 + leg / 2));
      g.add(boxMesh(sw - 2 * leg, 0.02, leg * 0.8, m, 0, 0.14, sd / 2 - leg));
    } else if (f.type === "pendant") {
      // 吊燈：燈罩＋電線＋燈泡＋往下的聚光燈（可加光柱 beam）
      const y = f.y ?? 2.3;
      const col = new THREE.Color(f.color || "#ffd99a");
      const shadeMat = new THREE.MeshPhongMaterial({ color: f.shadeColor || "#2c3236", side: THREE.DoubleSide, shininess: 20, flatShading: true });
      const shadeH = 0.2;
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.26, shadeH, 12, 1, true), shadeMat);
      lamp.position.set(0, y + shadeH / 2, 0);
      g.add(lamp);
      g.add(boxMesh(0.012, Math.max(0.01, RH - y - shadeH), 0.012, new THREE.MeshBasicMaterial({ color: 0x0b0c0d }), 0, (RH + y + shadeH) / 2, 0, false));
      const bulbMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(6), fog: false });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 5), bulbMat);
      bulb.position.set(0, y + 0.02, 0);
      g.add(bulb);
      const ang = THREE.MathUtils.degToRad(f.angle ?? 32);
      const sp = new THREE.SpotLight(col, f.intensity ?? 20, 0, ang, f.penumbra ?? 0.45, 2);
      sp.position.set(0, y - 0.01, 0);
      sp.target.position.set(0, 0, 0);
      sp.castShadow = f.castShadow !== false;
      sp.shadow.mapSize.set(1024, 1024);
      sp.shadow.bias = -0.0006;
      g.add(sp, sp.target);
      const base = sp.intensity;
      dimmers.push((k) => {
        sp.intensity = base * k;
        bulbMat.color.copy(col).multiplyScalar(1 + 5 * k);
      });
      if (f.beam) {
        const cone = beamMesh(col, f.beam, Math.tan(ang) * y * 0.85, y);
        cone.position.set(0, y, 0);
        g.add(cone);
        const u = (cone.material as THREE.ShaderMaterial).uniforms.uAlpha;
        dimmers.push((k) => (u.value = f.beam * k));
      }
    } else if (f.type === "mirror") {
      // 穿衣鏡：木框＋支腳，鏡面是帶噪點的淺藍像素貼圖
      const wood = new THREE.MeshLambertMaterial({ color: f.frameColor || "#6b4a2f" });
      const fw = f.frameWidth ?? 0.08;
      const mw = f.w ?? 1;
      const mh = f.h ?? 2.2;
      const lift = 0.12;
      g.add(boxMesh(mw + 2 * fw, fw, 0.06, wood, 0, lift + mh + fw / 2, 0));
      g.add(boxMesh(mw + 2 * fw, fw, 0.06, wood, 0, lift - fw / 2, 0));
      for (const sx of [-1, 1]) g.add(boxMesh(fw, mh, 0.06, wood, sx * (mw / 2 + fw / 2), lift + mh / 2, 0));
      for (const sx of [-1, 1]) g.add(boxMesh(0.08, 0.05, 0.5, wood, sx * (mw / 2 + fw / 2), 0.025, -0.05));
      const gw = Math.max(4, Math.round(mw * TPU));
      const gh = Math.max(4, Math.round(mh * TPU));
      const c = makeCanvas(gw, gh);
      const cx = c.getContext("2d")!;
      const rand = rng(f.seed ?? 17);
      const top = rgb255(f.glassTop || "#6f90a3");
      const bot = rgb255(f.glassBottom || "#2c4352");
      for (let y = 0; y < gh; y++)
        for (let x = 0; x < gw; x++) {
          const t = y / (gh - 1);
          const k = 1 + (rand() - 0.5) * 2 * (f.noise ?? 0.1);
          cx.fillStyle = `rgb(${((top[0] + (bot[0] - top[0]) * t) * k) | 0},${((top[1] + (bot[1] - top[1]) * t) * k) | 0},${((top[2] + (bot[2] - top[2]) * t) * k) | 0})`;
          cx.fillRect(x, y, 1, 1);
        }
      cx.fillStyle = "rgba(220,240,255,0.45)";
      for (const [x0, bw] of [[0.2, 2], [0.55, 1]]) for (let y = 0; y < gh; y++) cx.fillRect(Math.round(x0 * gw + y * 0.35 - gh * 0.15), y, bw, 1);
      const gm = new THREE.MeshBasicMaterial({ map: pixelTexture(c) });
      gm.color.setScalar(0.85);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), gm);
      glass.position.set(0, lift + mh / 2, 0.031);
      g.add(glass);
      g.add(boxMesh(mw, mh, 0.02, wood, 0, lift + mh / 2, 0.01));
    }
  }

  // ── 粗像素道具（字串像素圖 / 圖片），可帶點光源 ──
  for (const s of P.props) {
    const a = P.arts[s.art];
    if (!a) continue;
    let main: HTMLCanvasElement | HTMLImageElement | null = null;
    let glowC: HTMLCanvasElement | null = null;
    if ("asset" in a) main = ctx.image(a.asset) ?? null;
    else {
      main = pixelsToCanvas(a);
      glowC = a.glow ? pixelsToCanvas(a, a.glow) : null;
    }
    if (!main) continue;
    const depth = P.ref.distance - (s.z ?? 0);
    const texel = (s.pixelScale ?? 2) / pxPerUnit(depth);
    const w = main.width * texel;
    const h = main.height * texel;
    const yBottom = s.anchor === "center" ? (s.y || 0) - h / 2 : s.y || 0;
    const geo = new THREE.PlaneGeometry(w, h);
    if (s.flip) geo.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: pixelTexture(main), alphaTest: 0.5, side: THREE.DoubleSide });
    mat.color.set(s.tint || "#ffffff");
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.x || 0, yBottom + h / 2, (s.z ?? 0) + 0.004);
    add(mesh);
    let gm: THREE.MeshBasicMaterial | null = null;
    if (glowC) {
      gm = new THREE.MeshBasicMaterial({ map: pixelTexture(glowC), alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
      gm.color.setScalar(s.glowBoost ?? 3);
      const gmesh = new THREE.Mesh(geo, gm);
      gmesh.position.copy(mesh.position);
      gmesh.position.z += 0.002;
      add(gmesh);
    }
    if (s.shadow && s.anchor !== "center") {
      const sh = blobShadowMesh(w);
      sh.position.set(s.x || 0, (s.y || 0) + 0.003, (s.z ?? 0) + 0.05);
      add(sh);
    }
    if (s.light) {
      const L = s.light;
      const off = L.offset || [0, h * 0.8];
      const p = new THREE.PointLight(L.color || "#ffcf8a", L.intensity ?? 1, L.distance ?? 2.5, 2);
      p.position.set((s.x || 0) + off[0], (s.y || 0) + off[1], (s.z ?? 0) + 0.08);
      add(p);
      const base = p.intensity;
      const glow = s.glowBoost ?? 3;
      dimmers.push((k) => {
        p.intensity = base * k;
        if (gm) gm.color.setScalar(1 + (glow - 1) * k);
      });
    }
  }

  return {
    object: root,
    update: (p: RoomParams, f: { t: number }) => {
      updaters.forEach((u) => u(f.t, p));
      dimmers.forEach((d) => d(p.lightLevel));
    },
  };
};

export const room: Layer3DType<RoomParams> = {
  describe: "室內房間：牆、地板、天花板、窗（夜景、雪、窗光）、家具（table / chair / pendant / mirror）、像素道具（可帶檯燈光）",
  defaults: {
    width: 6,
    depth: 4.5,
    height: 3,
    ref: { fov: 62, distance: 6 },
    texelScale: 1,
    wall: { style: "concrete", color: "#56645b", noise: 0.07, blotches: 0.12, seed: 3, sideShade: 0.85 },
    floor: { style: "tiles", color: "#34383b", groutColor: "#1c1f21", tileSize: 0.6, seed: 5 },
    ceiling: { style: "concrete", color: "#262b29", noise: 0.05, blotches: 0.1, seed: 9 },
    baseboard: undefined,
    openings: [],
    furniture: [],
    props: [],
    arts: {},
    lightLevel: 1,
  },
  animatable: ["lightLevel"],
  build,
  points: (p) => {
    const out: Record<string, Vec3> = { floor_center: [0, 0, p.depth / 2], back_center: [0, p.height / 2, 0] };
    for (const f of p.furniture) if (f.id) out[f.id] = [f.x || 0, f.type === "table" ? f.h ?? 0.76 : 0, f.z ?? 2];
    for (const s of p.props) if (s.id) out[s.id] = [s.x || 0, s.y || 0, s.z ?? 0];
    for (const o of p.openings) if (o.id) out[o.id] = [o.x, o.y + o.h / 2, 0];
    return out;
  },
  images: (p) => Object.values(p.arts).flatMap((a) => ("asset" in a ? [a.asset] : [])),
  check: (p) => [
    ...p.props.filter((s) => !p.arts[s.art]).map((s) => `props「${s.id ?? s.art}」的 art「${s.art}」不在 arts 裡`),
    ...p.openings.filter((o) => o.type !== "window" && o.type !== "oneWayGlass").map((o) => `openings 的 type「${o.type}」不存在，可用：window、oneWayGlass`),
    ...p.furniture.filter((f) => !["table", "chair", "pendant", "mirror"].includes(f.type)).map((f) => `furniture 的 type「${f.type}」不存在，可用：table、chair、pendant、mirror`),
  ],
};
