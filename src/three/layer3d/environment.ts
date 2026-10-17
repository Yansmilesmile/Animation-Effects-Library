import * as THREE from "three";
import type { BuildContext, Built, Environment, FrameContext, Vec3 } from "./types";
import { rng } from "./paint";

/**
 * environment —— 任何場景都能用的天空 / 日夜 / 雪雨 / 霧。
 * time：0 = 夜、0.5 = 黃昏、1 = 白天（可用 animate 補間，target "environment"）。
 */
export const TIME_NAMES: Record<string, number> = { night: 0, dusk: 0.5, day: 1 };
export const timeValue = (t: Environment["time"]) => (typeof t === "number" ? t : t ? TIME_NAMES[t] ?? 0 : 0);

const SKY = {
  top: ["#070b18", "#2a2a52", "#3f7fd0"],
  horizon: ["#1c2648", "#e07a3a", "#9fd0f0"],
  bottom: ["#2a3558", "#f2b45a", "#d8ecf4"],
};
const SUN = ["#9fb4e8", "#ff9a4a", "#fff1d6"];
const HEMI = ["#2c3a66", "#c09060", "#bcd8f0"];

/** 三段（夜、黃昏、白天）之間補間 */
const tri = (cols: string[], t: number) => {
  const c = Math.max(0, Math.min(1, t)) * 2;
  const i = Math.min(1, Math.floor(c));
  return new THREE.Color(cols[i]).lerp(new THREE.Color(cols[i + 1]), c - i);
};

export type EnvParams = { time: number; fogNear?: number; fogFar?: number };

const SkyShader = {
  uniforms: {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uBands: { value: 8 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSun: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoon: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uTop, uHorizon, uBottom, uSunColor; uniform float uBands, uSun, uMoon; uniform vec3 uSunDir, uMoonDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      // 色帶：仰角分成 uBands 階（像素風的漸層）
      float h = clamp(d.y, -0.2, 1.0);
      vec3 c;
      if (h >= 0.0) { float t = floor(pow(h, 0.6) * uBands) / uBands; c = mix(uHorizon, uTop, t); }
      else { float t = floor(-h / 0.2 * 3.0) / 3.0; c = mix(uHorizon, uBottom, t); }
      float s = dot(d, normalize(uSunDir));
      if (uSun > 0.0 && s > 0.9985) c = mix(c, uSunColor * 1.6, uSun);
      else if (uSun > 0.0 && s > 0.995) c = mix(c, uSunColor, 0.45 * uSun);
      float m = dot(d, normalize(uMoonDir));
      if (uMoon > 0.0 && m > 0.9992) c = mix(c, vec3(0.95, 0.92, 0.82), uMoon);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export const buildEnvironment = (env: Environment, ctx: BuildContext): Built<EnvParams> & { fog?: THREE.Fog | THREE.FogExp2 } => {
  const root = new THREE.Group();
  const updaters: ((p: EnvParams, f: FrameContext) => void)[] = [];
  const rand = rng(ctx.seed + 77);

  // 天空圓頂
  if (env.sky) {
    const s = env.sky;
    const R = s.radius ?? 600;
    const mat = new THREE.ShaderMaterial({ ...SkyShader, uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms), side: THREE.BackSide, depthWrite: false, fog: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16), mat);
    dome.renderOrder = -10;
    root.add(dome);
    const stars = s.stars ?? 80;
    let starMat: THREE.PointsMaterial | null = null;
    let starPts: THREE.Points | null = null;
    if (stars > 0) {
      const pos = new Float32Array(stars * 3);
      for (let i = 0; i < stars; i++) {
        const a = rand() * Math.PI * 2;
        const e = 0.08 + Math.pow(rand(), 0.7) * 1.3;
        pos.set([Math.cos(a) * Math.cos(e) * R * 0.95, Math.sin(e) * R * 0.95, Math.sin(a) * Math.cos(e) * R * 0.95], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      starMat = new THREE.PointsMaterial({ color: "#e8eef8", size: 1, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
      starPts = new THREE.Points(geo, starMat);
      starPts.frustumCulled = false;
      root.add(starPts);
    }
    updaters.push((p, f) => {
      dome.position.copy(f.camera.position);
      const u = mat.uniforms;
      (u.uTop.value as THREE.Color).copy(s.top ? new THREE.Color(s.top) : tri(SKY.top, p.time));
      (u.uHorizon.value as THREE.Color).copy(s.horizon ? new THREE.Color(s.horizon) : tri(SKY.horizon, p.time));
      (u.uBottom.value as THREE.Color).copy(s.bottom ? new THREE.Color(s.bottom) : tri(SKY.bottom, p.time));
      u.uBands.value = s.bands ?? 8;
      // 太陽隨 time 升起（黃昏貼著地平線），月亮在夜晚
      const sunEl = -0.15 + p.time * 0.75;
      (u.uSunDir.value as THREE.Vector3).set(-0.5, sunEl, -1);
      (u.uSunColor.value as THREE.Color).copy(tri(SUN, p.time));
      u.uSun.value = s.sun === false ? 0 : Math.max(0, Math.min(1, (p.time - 0.2) * 3));
      (u.uMoonDir.value as THREE.Vector3).set(0.45, 0.45, -1);
      u.uMoon.value = s.moon === false ? 0 : Math.max(0, Math.min(1, (0.4 - p.time) * 4));
      if (starMat) starMat.opacity = Math.max(0, Math.min(1, (0.45 - p.time) * 3)) * 0.9;
      starPts?.position.copy(f.camera.position);
    });
  }

  // 依 time 打的環境光＋日 / 月光
  if (env.light !== false) {
    const L = env.light ?? {};
    const hemi = new THREE.HemisphereLight("#ffffff", "#20160e", 1);
    const sun = new THREE.DirectionalLight("#ffffff", 1);
    const dir = L.direction ?? [-8, 10, 8];
    sun.position.set(dir[0], dir[1], dir[2]);
    sun.castShadow = !!L.castShadow;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(1024, 1024);
      const cam = sun.shadow.camera as THREE.OrthographicCamera;
      cam.left = cam.bottom = -20;
      cam.right = cam.top = 20;
      cam.far = 80;
      sun.shadow.bias = -0.0008;
    }
    root.add(hemi, sun, sun.target);
    const k = L.intensity ?? 1;
    updaters.push((p) => {
      hemi.color.copy(tri(HEMI, p.time));
      hemi.intensity = (0.9 + 0.8 * p.time) * k;
      sun.color.copy(tri(SUN, p.time));
      sun.intensity = (0.8 + 2 * p.time) * k;
    });
  }

  // 天氣
  if (env.weather) {
    const w = env.weather;
    const r = rng(w.seed ?? ctx.seed + 5);
    const area: Vec3 = w.area ?? [20, 12, 20];
    const center: Vec3 = w.center ?? [0, area[1] / 2, 0];
    const rain = w.type === "rain";
    const n = w.count ?? (rain ? 400 : 600);
    const seeds = Array.from({ length: n }, () => ({ x: r() - 0.5, y: r(), z: r() - 0.5, v: 0.6 + r() * 0.8, ph: r() * 6.28 }));
    const speed = w.speed ?? (rain ? 14 : 1.2);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3 * (rain ? 2 : 1));
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const col = new THREE.Color(w.color ?? (rain ? "#9fb4d0" : "#e8eef8"));
    const obj = rain
      ? new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 }))
      : new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size: 1, sizeAttenuation: false }));
    obj.frustumCulled = false;
    root.add(obj);
    updaters.push((_p, f) => {
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const fall = (((s.y - (f.t * speed * s.v) / area[1]) % 1) + 1) % 1;
        const y = center[1] - area[1] / 2 + fall * area[1];
        const sway = rain ? 0 : Math.sin(f.t * 1.3 + s.ph) * 0.25;
        const x = center[0] + s.x * area[0] + sway;
        const z = center[2] + s.z * area[2];
        if (rain) {
          pos.set([x, y, z, x - 0.04, y + 0.35, z], i * 6);
        } else pos.set([x, y, z], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  const fog = env.fog ? (env.fog.density !== undefined || env.fog.near === undefined ? new THREE.FogExp2(env.fog.color, env.fog.density ?? 0.03) : new THREE.Fog(env.fog.color, env.fog.near, env.fog.far ?? 100)) : undefined;
  // 線性霧可補間 fogNear / fogFar（霧往前推、吃掉遠景）
  if (fog instanceof THREE.Fog)
    updaters.push((p) => {
      if (p.fogNear !== undefined) fog.near = p.fogNear;
      if (p.fogFar !== undefined) fog.far = p.fogFar;
    });

  return { object: root, fog, update: (p, f) => updaters.forEach((u) => u(p, f)) };
};
