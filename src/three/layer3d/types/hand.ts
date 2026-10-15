import * as THREE from "three";
import type { Layer3DType, Vec3 } from "../types";

/**
 * hand —— 用基本形體拼的低多邊形手：前臂＋手掌＋五指（每指 3 節，關節可轉）。
 * 適合當單一主體層（例如雲中伸出的大手），背景透明、夾在 2D 雲層之間。
 *
 * 手的本地座標：手腕在原點，手指朝 +Y，掌心朝 +Z，前臂往 -Y 延伸。
 * position / rotation 擺好「手伸出前」的位置與朝向，reach 沿手指方向推出去。
 */
export type HandParams = {
  /** 手腕（reach = 0 時）的位置 */
  position: Vec3;
  /** 整隻手臂的朝向（度，Euler XYZ）；[0,0,0] = 手指朝上、掌心朝鏡頭（+Z） */
  rotation: Vec3;
  /** 沿手指方向伸出的距離（公尺） */
  reach: number;
  /** 手掌繞前臂旋轉（度，翻掌） */
  roll: number;
  /** 手腕彎曲 [往掌心(+)/手背(-), 往拇指側(+)/小指側(-)]（度） */
  wrist: [number, number];
  /** 手指彎曲 0..1：一個數字 = 五指一起；陣列 = [拇指, 食指, 中指, 無名指, 小指] */
  curl: number | number[];
  /** 手指張開 0..1 */
  spread: number;
  /** 前臂長度（公尺），伸出時藏在雲後 */
  arm: number;
  scale: number;
  color: string;
  /** 袖口顏色（前臂靠手腕那一段）；省略 = 不畫袖子 */
  sleeve?: string;
  side: "right" | "left";
  /** 平面著色（低多邊形的面），預設 true */
  flat: boolean;
};

// 四指：x 位置、三節長度、半徑
const FINGERS = [
  { x: -0.15, len: [0.2, 0.13, 0.1], r: 0.05 },
  { x: -0.05, len: [0.22, 0.145, 0.105], r: 0.052 },
  { x: 0.05, len: [0.205, 0.135, 0.1], r: 0.049 },
  { x: 0.15, len: [0.16, 0.105, 0.085], r: 0.043 },
];
const THUMB = { len: [0.17, 0.13, 0.1], r: 0.06 };
const PALM = { w: 0.44, h: 0.46, d: 0.15 };
const deg = THREE.MathUtils.degToRad;

const curlOf = (c: HandParams["curl"], i: number) => Math.max(-0.2, Math.min(1.2, Array.isArray(c) ? c[i] ?? c[c.length - 1] ?? 0 : c));

export const hand: Layer3DType<HandParams> = {
  describe: "低多邊形的手：前臂＋手掌＋五指（每指 3 節），reach / roll / wrist / curl / spread 可補間",
  defaults: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    reach: 0,
    roll: 0,
    wrist: [0, 0],
    curl: 0.1,
    spread: 0.3,
    arm: 2.4,
    scale: 1,
    color: "#e8b48c",
    sleeve: undefined,
    side: "right",
    flat: true,
  },
  animatable: ["position", "rotation", "reach", "roll", "wrist", "curl", "spread"],
  build: (P) => {
    const mat = new THREE.MeshPhongMaterial({ color: P.color, flatShading: P.flat, shininess: 6, specular: 0x222222 });
    const dark = mat.clone();
    dark.color.multiplyScalar(0.82);
    const mesh = (geo: THREE.BufferGeometry, m: THREE.Material = mat) => {
      const o = new THREE.Mesh(geo, m);
      o.castShadow = o.receiveShadow = true;
      return o;
    };
    /** 一節：樞紐在底部，往 +Y 長 len */
    const segment = (len: number, r0: number, r1: number) => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(r1, r0, len, 6);
      geo.translate(0, len / 2, 0);
      g.add(mesh(geo));
      g.add(mesh(new THREE.IcosahedronGeometry(r0 * 1.06, 0), dark));
      return g;
    };
    /** 一根手指：三節串起來，回傳三個關節 */
    const finger = (len: number[], r: number) => {
      const joints: THREE.Group[] = [];
      let parent: THREE.Group | null = null;
      let rad = r;
      for (let i = 0; i < 3; i++) {
        const next = rad * (i === 2 ? 0.8 : 0.88);
        const s = segment(len[i], rad, next);
        if (parent) {
          s.position.y = len[i - 1];
          parent.add(s);
        }
        joints.push(s);
        parent = s;
        rad = next;
      }
      // 指尖
      const tip = mesh(new THREE.IcosahedronGeometry(rad * 0.95, 0));
      tip.position.y = len[2];
      joints[2].add(tip);
      return joints;
    };

    const root = new THREE.Group();
    const slide = new THREE.Group();
    const roll = new THREE.Group();
    const wrist = new THREE.Group();
    const mirror = new THREE.Group();
    mirror.scale.x = P.side === "left" ? -1 : 1;
    root.add(slide);
    slide.add(roll);
    roll.add(mirror);

    // 前臂（往 -Y），靠手腕細一點
    const armGeo = new THREE.CylinderGeometry(0.16, 0.2, P.arm, 7);
    armGeo.translate(0, -P.arm / 2 - 0.02, 0);
    armGeo.scale(1, 1, 0.78);
    mirror.add(mesh(armGeo));
    if (P.sleeve) {
      const sl = new THREE.CylinderGeometry(0.235, 0.25, Math.min(P.arm, 0.5), 7);
      sl.translate(0, -0.45 - Math.min(P.arm, 0.5) / 2, 0);
      sl.scale(1, 1, 0.82);
      mirror.add(mesh(sl, new THREE.MeshPhongMaterial({ color: P.sleeve, flatShading: true, shininess: 4 })));
    }
    mirror.add(mesh(new THREE.IcosahedronGeometry(0.17, 0), dark));
    mirror.add(wrist);

    // 手掌：盒子，靠手腕那端窄一點、掌心微凸
    const palmGeo = new THREE.BoxGeometry(PALM.w, PALM.h, PALM.d, 2, 2, 1);
    const pos = palmGeo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) pos.setX(i, pos.getX(i) * 0.8);
      if (pos.getZ(i) > 0 && Math.abs(pos.getX(i)) < 0.01 && Math.abs(y) < 0.01) pos.setZ(i, pos.getZ(i) * 1.25);
    }
    palmGeo.computeVertexNormals();
    palmGeo.translate(0, PALM.h / 2 + 0.03, 0);
    wrist.add(mesh(palmGeo));

    const fingers = FINGERS.map((f) => {
      const j = finger(f.len, f.r);
      j[0].position.set(f.x, PALM.h + 0.03, 0.0);
      wrist.add(j[0]);
      return j;
    });
    // 拇指：從掌根靠食指那側斜伸出去
    const thumbBase = new THREE.Group();
    thumbBase.position.set(-PALM.w / 2 + 0.03, 0.14, 0.03);
    wrist.add(thumbBase);
    const thumb = finger(THUMB.len, THUMB.r);
    thumbBase.add(thumb[0]);

    const update = (p: HandParams) => {
      root.position.set(p.position[0], p.position[1], p.position[2]);
      root.rotation.set(deg(p.rotation[0]), deg(p.rotation[1]), deg(p.rotation[2]));
      root.scale.setScalar(p.scale);
      slide.position.y = p.reach;
      roll.rotation.y = deg(p.roll);
      wrist.rotation.set(deg(p.wrist[0]), 0, deg(-p.wrist[1]));
      const sp = p.spread;
      fingers.forEach((j, i) => {
        const c = curlOf(p.curl, i + 1);
        j[0].rotation.set(deg(82 * c), 0, deg(sp * [13, 4, -5, -14][i]));
        j[1].rotation.x = deg(98 * c);
        j[2].rotation.x = deg(70 * c);
      });
      const ct = curlOf(p.curl, 0);
      // 拇指：往外張（z）＋往掌心前方（x）；彎曲時收到掌心前
      thumb[0].rotation.set(deg(28 + 32 * ct), deg(-35), deg(30 - 22 * ct + sp * 18));
      thumb[1].rotation.set(deg(20 * ct), 0, deg(-25 * ct));
      thumb[2].rotation.set(deg(50 * ct), 0, 0);
    };
    update(P);
    return { object: root, update: (p) => update(p) };
  },
};
