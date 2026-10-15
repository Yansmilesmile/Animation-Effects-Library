import * as THREE from "three";

/**
 * 組件類型共用的像素貼圖工具：canvas 在原生小尺寸上畫，最近鄰取樣、不做 mipmap。全部同步、只用 seed。
 */
export const rgb255 = (hex: string): [number, number, number] => {
  let h = String(hex || "#000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
/** 顏色乘上亮度 k，回傳 css rgb() */
export const shade = (c: string, k = 1) => {
  const [r, g, b] = rgb255(c);
  return `rgb(${clamp255(r * k) | 0},${clamp255(g * k) | 0},${clamp255(b * k) | 0})`;
};

/** xorshift 亂數（固定 seed） */
export const rng = (seed: number) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};

export const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return c;
};

export const pixelTexture = (c: HTMLCanvasElement | HTMLImageElement) => {
  const t = c instanceof HTMLCanvasElement ? new THREE.CanvasTexture(c) : new THREE.Texture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};

export const valueNoise = (w: number, h: number, cell: number, rand: () => number) => {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g: number[] = [];
  for (let i = 0; i < gw * gh; i++) g.push(rand());
  return (x: number, y: number) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = fx | 0;
    const y0 = fy | 0;
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = g[y0 * gw + x0];
    const b = g[y0 * gw + x0 + 1];
    const c = g[(y0 + 1) * gw + x0];
    const d = g[(y0 + 1) * gw + x0 + 1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
};

export type SurfaceSpec = {
  /** flat | concrete（水泥：斑駁、模板縫、繫桿孔、水痕）| tiles（磁磚）| metal | grass | dirt | wood */
  style?: string;
  color?: string;
  noise?: number;
  blotches?: number;
  seed?: number;
  tileSize?: number;
  tileVariance?: number;
  groutColor?: string;
  panelWidth?: number;
  formTies?: [number, number];
  drips?: number;
};

/** 程序貼圖：wU × hU 公尺，density = 貼圖像素 / 公尺 */
export const paintSurface = (wU: number, hU: number, spec: SurfaceSpec, density: number) => {
  const w = Math.max(2, Math.min(2048, Math.round(wU * density)));
  const h = Math.max(2, Math.min(2048, Math.round(hU * density)));
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const rand = rng(spec.seed ?? 1);
  const base = rgb255(spec.color || "#777");
  const noise = spec.noise ?? 0.05;
  const blot = spec.blotches ?? 0;
  const vn = valueNoise(w, h, Math.max(4, density * 0.6), rand);
  const vn2 = valueNoise(w, h, Math.max(2, density * 0.12), rand);
  const style = spec.style || "flat";
  const tile = Math.max(2, (spec.tileSize || 0.6) * density);
  const tileShade: Record<string, number> = {};
  const grout = rgb255(spec.groutColor || "#111");
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let k = 1 + (rand() - 0.5) * 2 * noise;
      let col = base;
      if (style === "concrete" || style === "dirt") k += (vn(x, y) - 0.5) * 2 * blot + (vn2(x, y) - 0.5) * blot * 0.6;
      else if (style === "grass") k += (vn(x, y) - 0.5) * 2 * (blot || 0.15) + (rand() < 0.06 ? 0.18 : 0);
      else if (style === "wood") k += Math.sin(y * 0.9 + vn(x, y) * 6) * 0.06 + (vn2(x, y) - 0.5) * 0.1;
      else if (style === "tiles") {
        const tx = Math.floor(x / tile);
        const ty = Math.floor(y / tile);
        const key = tx + "," + ty;
        if (!(key in tileShade)) tileShade[key] = 1 + (rand() - 0.5) * 2 * (spec.tileVariance ?? 0.05);
        k *= tileShade[key];
        const gx = x - tx * tile;
        const gy = y - ty * tile;
        if (gx < 1 || gy < 1) col = grout;
        else if (gx < 2 || gy < 2) k *= 1.06;
        k += (vn(x, y) - 0.5) * 0.08;
      } else if (style === "metal") k += (vn2(x, y) - 0.5) * 0.08;
      const i = (y * w + x) * 4;
      d[i] = clamp255(col[0] * k);
      d[i + 1] = clamp255(col[1] * k);
      d[i + 2] = clamp255(col[2] * k);
      d[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  if (style === "concrete") {
    if (spec.panelWidth) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let x = spec.panelWidth * density; x < w; x += spec.panelWidth * density) ctx.fillRect(Math.round(x), 0, 1, h);
    }
    if (spec.formTies) {
      const [sx, sy] = spec.formTies.map((v) => v * density);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      for (let y = sy / 2; y < h; y += sy) for (let x = sx / 2; x < w; x += sx) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    for (let i = 0; i < (spec.drips || 0); i++) {
      const x = Math.floor(rand() * w);
      const len = Math.floor(h * (0.1 + rand() * 0.35));
      const y0 = Math.floor(rand() * h * 0.3);
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.07})`;
      ctx.fillRect(x, y0, 1, len);
    }
  }
  return c;
};

/** 字串像素圖（rows + palette，"." = 透明）→ canvas；only = 只畫這些字元（發光層） */
export type PixelArt = { rows: string[]; palette: Record<string, string>; glow?: string[] };
export const pixelsToCanvas = (a: PixelArt, only?: string[]) => {
  const rows = a.rows || [];
  const w = Math.max(...rows.map((r) => r.length), 1);
  const c = makeCanvas(w, rows.length);
  const ctx = c.getContext("2d")!;
  let any = false;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "." || ch === " " || !a.palette[ch]) return;
      if (only && !only.includes(ch)) return;
      ctx.fillStyle = a.palette[ch];
      ctx.fillRect(x, y, 1, 1);
      any = true;
    }),
  );
  return any ? c : null;
};

/** 地上的橢圓像素陰影 */
export const blobShadowMesh = (w: number) => {
  const c = makeCanvas(16, 6);
  const ctx = c.getContext("2d")!;
  for (let yy = 0; yy < 6; yy++)
    for (let xx = 0; xx < 16; xx++) {
      const d = Math.hypot((xx - 7.5) / 8, (yy - 2.5) / 3);
      if (d < 1) {
        ctx.fillStyle = `rgba(0,0,0,${d < 0.6 ? 0.45 : 0.25})`;
        ctx.fillRect(xx, yy, 1, 1);
      }
    }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, w * 0.45), new THREE.MeshBasicMaterial({ map: pixelTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
};

/** 光柱：加法混色的開口圓錐（尖端在原點、往 -Y 延伸 len） */
export const beamMesh = (col: THREE.Color, alpha: number, rad: number, len: number) => {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // 純加法（顏色、alpha 都加）：透明背景時光柱的 alpha = 亮度，不會變成一塊不透明的暗色
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    uniforms: { uColor: { value: col }, uAlpha: { value: alpha } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float f=pow(abs(dot(vN,vV)),1.5); float a=uAlpha*f*mix(0.15,1.0,vUv.y); vec3 c=uColor*a; gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))); }`,
  });
  const geo = new THREE.ConeGeometry(rad, len, 24, 1, true);
  geo.translate(0, -len / 2, 0);
  return new THREE.Mesh(geo, mat);
};

/** 盒子（位置是中心） */
export const boxMesh = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, cast = true) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
};
