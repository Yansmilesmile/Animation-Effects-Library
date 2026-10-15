import * as THREE from "three";
import type { LightSpec } from "./types";
import { beamMesh } from "./paint";

/** 場景 JSON 的 lights → three 的燈（固定，不隨幀變） */
export const buildLights = (list: LightSpec[]) => {
  const root = new THREE.Group();
  const errors: string[] = [];
  for (const L of list) {
    if (L.type === "ambient") root.add(new THREE.AmbientLight(L.color ?? "#ffffff", L.intensity ?? 0.5));
    else if (L.type === "hemisphere") root.add(new THREE.HemisphereLight(L.sky ?? "#9a8566", L.ground ?? "#1e1914", L.intensity ?? 0.5));
    else if (L.type === "directional") {
      const d = new THREE.DirectionalLight(L.color ?? "#ffffff", L.intensity ?? 1);
      d.position.set(...(L.position ?? [-5, 8, 6]));
      d.target.position.set(...(L.target ?? [0, 0, 0]));
      d.castShadow = !!L.castShadow;
      root.add(d, d.target);
    } else if (L.type === "point") {
      const p = new THREE.PointLight(L.color ?? "#ffffff", L.intensity ?? 1, L.distance ?? 0, L.decay ?? 2);
      p.position.set(...(L.position ?? [0, 2, 2]));
      root.add(p);
    } else if (L.type === "spot") {
      const s = new THREE.SpotLight(L.color ?? "#ffffff", L.intensity ?? 10, 0, THREE.MathUtils.degToRad(L.angle ?? 30), L.penumbra ?? 0.5, 2);
      s.position.set(...(L.position ?? [0, 2.5, 2]));
      const tg = L.target ?? [s.position.x, 0, s.position.z];
      s.target.position.set(tg[0], tg[1], tg[2]);
      s.castShadow = !!L.castShadow;
      if (s.castShadow) {
        s.shadow.mapSize.set(1024, 1024);
        s.shadow.bias = -0.0008;
      }
      root.add(s, s.target);
      if (L.beam) {
        const target = s.target.position.clone();
        const len = s.position.distanceTo(target);
        const cone = beamMesh(new THREE.Color(L.color ?? "#ffffff"), L.beam, Math.tan(s.angle) * len * 0.85, len);
        cone.position.copy(s.position);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.sub(s.position).normalize());
        root.add(cone);
      }
    } else errors.push(`燈的 type「${(L as { type: string }).type}」不存在，可用：ambient、hemisphere、directional、point、spot`);
  }
  return { object: root, errors };
};
