import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SavePass } from "three/examples/jsm/postprocessing/SavePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { hexToRgb } from "../../lib/util";
import type { Scene3D } from "./types";

/**
 * Layer3D 後製（在低解析度上做，之後最近鄰放大）：
 * RenderPass（透明或底色）→ bloom → 輸出 sRGB → Finish：調色、暗角、色階抖動、調色盤量化、透明度。
 * 透明時：物體像素 alpha 一律 1（硬邊）；光暈、光柱這類加上去的光 alpha = 亮度，疊在 2D 層上是發光的樣子。
 */
const MAX_COLORS = 64;

export const paletteRamp = (palette: string[], mode: "ramp" | "strict") => {
  const out: [number, number, number][] = [[0, 0, 0]];
  for (const hex of palette) {
    const c = hexToRgb(hex);
    if (mode === "strict") {
      out.push(c);
      continue;
    }
    for (const k of [0.3, 0.55, 0.8, 1]) out.push([c[0] * k, c[1] * k, c[2] * k]);
    out.push([c[0] + (1 - c[0]) * 0.35, c[1] + (1 - c[1]) * 0.35, c[2] + (1 - c[2]) * 0.35]);
  }
  return out.slice(0, MAX_COLORS);
};

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    /** bloom 之前的畫面（只取 alpha：UnrealBloomPass 的模糊會把 alpha 寫成 1） */
    tCoverage: { value: null as THREE.Texture | null },
    uTransparent: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uContrast: { value: 1 },
    uSat: { value: 1 },
    uVig: { value: 0 },
    uAspect: { value: 16 / 9 },
    uLevels: { value: 0 },
    uColors: { value: Array.from({ length: MAX_COLORS }, () => new THREE.Vector3()) },
    uCount: { value: 0 },
    uDither: { value: 0.35 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tCoverage;
    uniform float uTransparent, uContrast, uSat, uVig, uAspect, uLevels, uDither;
    uniform vec3 uTint;
    uniform vec3 uColors[${MAX_COLORS}];
    uniform int uCount;
    varying vec2 vUv;
    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int i = x + y * 4;
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      return m[i] / 16.0;
    }
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb * uTint;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      if (uVig > 0.0) { vec2 p = vUv - 0.5; p.x *= uAspect; c *= 1.0 - uVig * smoothstep(0.42, 1.04, length(p)); }
      c = clamp(c, 0.0, 1.0);
      if (uLevels > 0.0) c = floor(c * uLevels + bayer(gl_FragCoord.xy)) / uLevels;
      if (uCount > 0) {
        vec3 q = c + (bayer(gl_FragCoord.xy) - 0.5) * uDither * 0.12;
        float best = 1e9;
        vec3 pick = q;
        for (int i = 0; i < ${MAX_COLORS}; i++) {
          if (i >= uCount) break;
          vec3 d = (q - uColors[i]) * vec3(0.30, 0.59, 0.11);
          float e = dot(d, d) + 0.25 * dot(q - uColors[i], q - uColors[i]);
          if (e < best) { best = e; pick = uColors[i]; }
        }
        c = pick;
      }
      float a = 1.0;
      if (uTransparent > 0.5) {
        // 物體：硬邊不透明；背景上的光暈：alpha = 亮度（顏色已是 premultiplied）
        float cov = texture2D(tCoverage, vUv).a;
        float glow = max(src.r, max(src.g, src.b));
        a = cov >= 0.5 ? 1.0 : clamp(max(cov, glow), 0.0, 1.0);
        if (a < 0.02) { a = 0.0; c = vec3(0.0); }
        else if (cov < 0.5) c = min(c, vec3(a));
      }
      gl_FragColor = vec4(c, a);
    }`,
};

export type PostChain = { composer: EffectComposer; render: () => void; dispose: () => void };

export const buildPost = (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number, cfg: Scene3D): PostChain => {
  const transparent = !cfg.background || cfg.background === "transparent";
  const post = cfg.post ?? {};
  gl.toneMapping = post.toneMapping === "none" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = post.exposure ?? 1;
  gl.setClearColor(transparent ? 0x000000 : cfg.background!, transparent ? 0 : 1);

  const composer = new EffectComposer(gl, new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat }));
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  const rp = new RenderPass(scene, camera, undefined, transparent ? new THREE.Color(0x000000) : new THREE.Color(cfg.background!), transparent ? 0 : 1);
  composer.addPass(rp);
  // 透明：先存一份 bloom 之前的畫面，Finish 用它的 alpha 決定哪裡是物體
  const save = transparent ? new SavePass(new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat })) : null;
  if (save) composer.addPass(save);
  const b = post.bloom === false || post.bloom === undefined ? null : { strength: 0.6, radius: 0.4, threshold: 0.8, ...post.bloom };
  if (b && b.strength > 0) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), b.strength, b.radius, b.threshold));
  composer.addPass(new OutputPass());
  const fin = new ShaderPass(FinishShader);
  const u = fin.uniforms;
  u.uTransparent.value = transparent ? 1 : 0;
  u.tCoverage.value = save ? save.renderTarget.texture : null;
  const g = post.grade ?? {};
  const tint = hexToRgb(g.tint ?? "#ffffff");
  (u.uTint.value as THREE.Vector3).set(tint[0], tint[1], tint[2]);
  u.uContrast.value = g.contrast ?? 1;
  u.uSat.value = g.saturation ?? 1;
  u.uVig.value = post.vignette ?? 0;
  u.uAspect.value = width / height;
  u.uLevels.value = post.colorLevels ?? 0;
  const mode = cfg.quantize ?? "off";
  if (mode !== "off" && cfg.palette?.length) {
    const cols = paletteRamp(cfg.palette, mode);
    cols.forEach((c, i) => (u.uColors.value[i] as THREE.Vector3).set(c[0], c[1], c[2]));
    u.uCount.value = cols.length;
    u.uDither.value = cfg.dither ?? 0.35;
  }
  composer.addPass(fin);
  return {
    composer,
    render: () => composer.render(),
    dispose: () => {
      composer.dispose();
      save?.renderTarget.dispose();
    },
  };
};
