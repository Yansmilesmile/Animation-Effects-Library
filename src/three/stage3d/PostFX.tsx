import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { hexToRgb } from "../../lib/util";
import type { Stage3DModule } from "./types";

/**
 * 3D 後製：景深（BokehPass，S3Focus 控制）→ bloom（發光物件）→ 輸出到 sRGB → 調色盤量化 + 有序抖動。
 * 量化在最後一步做，所以光暈、景深模糊也會變成一階一階的像素色塊。
 */
const MAX_COLORS = 64;

// 調色盤擴充成明暗階：每個顏色 ×0.3 / ×0.55 / ×0.8 / 原色 / 往白混 35%，再加純黑
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

const QuantizeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uColors: { value: Array.from({ length: MAX_COLORS }, () => new THREE.Vector3()) },
    uCount: { value: 1 },
    uDither: { value: 0.35 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uColors[${MAX_COLORS}];
    uniform int uCount;
    uniform float uDither;
    varying vec2 vUv;
    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int i = x + y * 4;
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      return m[i] / 16.0 - 0.5;
    }
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb + bayer(gl_FragCoord.xy) * uDither * 0.12;
      float best = 1e9;
      vec3 pick = c;
      for (int i = 0; i < ${MAX_COLORS}; i++) {
        if (i >= uCount) break;
        vec3 d = (c - uColors[i]) * vec3(0.30, 0.59, 0.11);
        float e = dot(d, d) + 0.25 * dot(c - uColors[i], c - uColors[i]);
        if (e < best) { best = e; pick = uColors[i]; }
      }
      gl_FragColor = vec4(pick, 1.0);
    }`,
};

export const PostFX: React.FC<{ module: Stage3DModule; width: number; height: number; focus: { distance: number; amount: number; blur: number } }> = ({ module, width, height, focus }) => {
  const { gl, scene, camera } = useThree();
  const passes = useMemo(() => {
    const composer = new EffectComposer(gl, new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType }));
    composer.setPixelRatio(1);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    const bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.004, maxblur: 0.012 });
    bokeh.enabled = false;
    composer.addPass(bokeh);
    const b = module.bloom === false ? null : { strength: 0.9, radius: 0.4, threshold: 0.6, ...module.bloom };
    if (b) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), b.strength, b.radius, b.threshold));
    composer.addPass(new OutputPass());
    const mode = module.quantize ?? "ramp";
    if (mode !== "off") {
      const q = new ShaderPass(QuantizeShader);
      const cols = paletteRamp(module.palette, mode);
      cols.forEach((c, i) => (q.uniforms.uColors.value[i] as THREE.Vector3).set(c[0], c[1], c[2]));
      q.uniforms.uCount.value = cols.length;
      q.uniforms.uDither.value = module.dither ?? 0.35;
      composer.addPass(q);
    }
    return { composer, bokeh };
  }, [gl, scene, camera, width, height, module]);

  useEffect(() => () => passes.composer.dispose(), [passes]);

  useFrame(() => {
    const on = focus.amount > 0.01;
    passes.bokeh.enabled = on;
    if (on) {
      const u = passes.bokeh.uniforms as Record<string, { value: number }>;
      u.focus.value = focus.distance;
      u.aperture.value = 0.006 * focus.amount * focus.blur;
      u.maxblur.value = 0.015 * focus.amount * focus.blur;
    }
    passes.composer.render();
  }, 1);
  return null;
};
