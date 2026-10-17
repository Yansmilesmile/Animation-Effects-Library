# Layer3D：3D 背景 / 單一主體層（給做影片的 AI）

**原則**：3D 只做背景或單一主體（房間、小路、雲中的大手）。講故事的東西（道具、標籤、金幣、角色）一律是 2D 像素組件。
不做物件狀態機、不讓 2D 跟著 3D 走、不做遮擋。鏡頭只輕微推、拉、搖。

- 程式：`src/three/layer3d/`（`Layer3D.tsx` 組件、`types/` 組件類型、`environment.ts`、`camera.ts`）。
- 示範：`D:/桌面/pixel_template`：`src/scenes3d/*.json`（場景）、`src/room-demo.json`、`terrain-demo.json`、`hand-demo.json`（時間軸）。
- 舊的 `stage3d` / `S3State` 還在（舊片用），**新片用 Layer3D**。

## 1. 兩種用法

**時間軸**（建議）：scene 寫 `layer3d`。場景 JSON 在入口檔註冊一次：`registerScene3D("study-room", json)`。

```jsonc
{
  "id": "room", "duration": 240,
  "layer3d": {
    "scene": "study-room",                      // 註冊名，或直接寫整份場景 JSON
    "camera": [                                  // 機位 id，或一段 / 多段運動
      { "start": 0, "to": "wide", "move": "cut" },
      { "start": "@書房", "from": "wide", "to": "mid", "move": "push", "duration": 90, "ease": "inout" }
    ],
    "animate": [                                 // 參數補間（見各類型的「可補間」）
      { "target": "study", "start": "@關燈", "duration": 20, "to": { "lightLevel": 0.2 } }
    ],
    "outline": { "ids": ["hand"] },              // 選填：覆寫場景的像素描邊（見 3.1），false = 不描
    "z": 0                                       // 3D 層的排序位置（預設 0）
  },
  "host": { "pose": "full_mic_talk", "x": 96, "y": 262, "scale": 2 },   // 2D 主持人（粗像素），畫在 3D 前面
  "events": [
    { "component": "Tag", "start": "@檯燈", "target": "3d:lamp_head", "offset": { "y": -16 }, "props": { "text": "還亮著" } }
  ]
}
```

**TSX**：`<Layer3D scene={json} camera={…} animate={[…]} />` 放在 `<PixelStage>` 裡，和其他 2D 組件按 JSX 順序疊。

## 2. 分層（3D 夾在 2D 之間）

事件的 `layer` 寫數字，和 3D 層的 `z`（預設 0）比：

| layer | 畫在哪 |
|---|---|
| 比 z 小（-3、-1…） | 3D **後面**（天空、遠雲、後方雲） |
| 大於等於 z（1、2…） | 3D **前面**（前景雲、遮手腕） |
| `"back"` / 角色 / `"world"` | 更前面（照舊） |
| `"hud"` | 最上層 |

同數字照事件順序。數字層用世界座標（3D scene 的 2D 鏡頭固定，世界座標 = 畫面座標 480×270）。
3D 背景透明時（`"background": "transparent"`，預設），後面的 2D 層看得到；房間這類不透明場景寫底色。

## 3. 場景 JSON

```jsonc
{
  "seed": 1,                       // 所有亂數的種子（決定性）
  "pixelSize": 4,                  // 3D 一格 = 幾個螢幕像素；背景細（3–4），角色用 2D scale 2–3 粗
  "background": "transparent",     // 或 "#0a0805"（不透明）
  "post": {
    "bloom": { "strength": 0.6, "radius": 0.4, "threshold": 0.8 },   // 省略 = 不開
    "vignette": 0.3, "exposure": 1, "toneMapping": "aces",           // toneMapping: aces | none
    "grade": { "tint": "#f4e6cc", "contrast": 1.06, "saturation": 0.9 },
    "colorLevels": 48                                                 // 色階＋有序抖動，0 = 關
  },
  "palette": ["#56645b", "…"], "quantize": "off",                    // ramp | strict：量化到調色盤
  "outline": { "color": "#000000", "width": 1, "ids": ["hand"] },     // 像素描邊，見 3.1；省略 = 不描
  "environment": { … },            // 見第 5 節
  "lights": [                      // ambient | hemisphere | directional | point | spot
    { "type": "hemisphere", "sky": "#9a8566", "ground": "#1e1914", "intensity": 0.45 },
    { "type": "spot", "position": [0, 2.7, 5], "target": [0, 1.5, 0], "color": "#ffcf96", "intensity": 48, "angle": 36, "penumbra": 1, "beam": 0 }
  ],
  "components": [ { "type": "room", "id": "study", … } ],
  "cameras": {
    "wide": { "position": [0, 2.4, 5.06], "target": [0, 2.4, 0], "fov": 62, "shiftY": 0.371 }
  },
  "camera": "wide",                // 開始的機位（預設第一個）
  "points": { "lamp_head": [0.75, 1.1, 1.75] }   // 命名點 → target "3d:lamp_head"
}
```

- 單位是公尺；y 朝上。`shiftY`：鏡頭往下看但垂直線不歪（一點透視，0–0.4）。
- 組件提供的點自動加前綴：`"3d:<組件 id>.<點>"`（例如 `3d:town.tower`、`3d:study.desk`）。

### 3.1 outline：像素描邊

在低解析度那一層描（一格寬 = 放大後一個像素粗），和 2D 像素素材的描邊一致。適合單一主體（手），背景（房間、地形）通常不描。

| 參數 | 說明 |
|---|---|
| `color` | 預設 `"#000000"` |
| `width` | 1–3 格，預設 1（上下左右四鄰，不帶角） |
| `ids` | 只描這些組件 id；省略 = 全部組件 |
| `inner` | 內線：同一批物件互相遮擋處（手指疊在手掌上）要不要描，值是深度差門檻（公尺），預設 `0.3`；`false` = 只描外框 |
| `fog` | 物體被霧吃掉四成以上的地方不描（手臂融進後方雲時線也跟著消失），預設 `true` |

- 寫在場景 JSON 的 `outline`；時間軸 `layer3d.outline`、TSX `<Layer3D outline={…}>` 可覆寫（`false` = 關掉）。
- 只看要描的組件：被其他 3D 組件擋住的部分照樣描（Layer3D 不做遮擋）；被前面 2D 層蓋住的就看不到。

## 4. 鏡頭

`{ start, duration, from, to, move, ease }`，start 可寫 `"@詞"`。

- `move`：`push`（推近）、`pull`（拉遠）、`pan`（搖：視線方向球面補間）、`hold`（停在 to）、`cut`（直接切）。
  push / pull 都是位置線性補間，名稱只是表意。`from` 省略 = 從目前位置開始。
- `ease`：`inout`（預設）| `in` | `out` | `linear`。
- 機位可以寫 cameras 的 id，或直接寫 `{ position, target, fov, shiftY }`。
- **輕微**：機位之間差 0.5–1.5 公尺；不要長距離穿越。

## 5. environment（任何場景都能用）

```jsonc
"environment": {
  "time": 0.55,                                   // 0 夜、0.5 黃昏、1 白天（或 "night" | "dusk" | "day"）；可補間 target "environment"
  "sky": { "bands": 9, "stars": 90, "sun": true, "moon": true },   // 天空背板（色帶漸層），false = 不畫；也可給 top / horizon / bottom 顏色
  "light": { "intensity": 1, "direction": [-8, 7, 6], "castShadow": true },  // 依 time 的環境光＋日月光，false = 不打
  "weather": { "type": "snow", "count": 600, "speed": 1.2, "area": [20, 12, 20], "center": [0, 6, 0] },  // snow | rain
  "fog": { "color": "#3b3550", "near": 16, "far": 44 }              // 或 { color, density }（指數霧）
}
```

線性霧（寫了 `near` / `far`）可補間：`{ "target": "environment", "to": { "fogNear": 4, "fogFar": 16 } }`（霧往前推、吃掉遠景，例如「路縮短」）。
霧也能做「伸進雲裡」：把霧色設成雲的顏色，遠的部分（例如手臂）就融進後方的 2D 雲。

## 6. 組件類型

### room（室內）
後牆在 z=0，房間往 +z 延伸；地板 y=0。底子是 `素材庫/pixel_room_study.html`（深夜書房）。

| 參數 | 說明 |
|---|---|
| `width` `depth` `height` | 房間大小 |
| `ref` | `{ fov, distance }`：貼圖密度的參考鏡頭（在這距離上 1 貼圖像素 ≈ 1 畫面像素） |
| `wall` `floor` `ceiling` | 程序貼圖：`style` flat / concrete / tiles / metal / wood，`color`、`noise`、`blotches`、`tileSize`、`panelWidth`、`formTies`、`drips`、`seed`；wall 另有 `sideShade` |
| `baseboard` | `{ height, color }` |
| `openings` | 後牆開口：`window`（`night` 夜景：天空色帶、星、月、遠近城市剪影、閃燈、`snow` 雪；`light` 窗光：`behind`、`pattern` 窗格影子、`beam` 光柱）、`oneWayGlass` |
| `furniture` | `table`、`chair`（facing）、`pendant` 吊燈（y、color、intensity、angle、beam）、`mirror` 穿衣鏡 |
| `props` | 粗像素道具：`{ id, art, x, y, z, pixelScale, tint, shadow, glowBoost, light }`；`light` = 檯燈的點光源 |
| `arts` | 道具圖：字串像素圖 `{ rows, palette, glow }`，或圖片 `{ "asset": "@project/…png" }`（`npx superbot-assets` 會複製） |
| **可補間** | `lightLevel`（房間所有燈的亮度倍數，關燈 / 開燈） |
| 點 | `<id>.floor_center`、`<id>.back_center`、每個有 id 的家具 / 道具 / 開口 |

### terrain（戶外）
地面 y=0，以原點為中心。天空用 environment.sky。

| 參數 | 說明 |
|---|---|
| `size` `[寬, 深]`、`texel`（貼圖像素 / 公尺）、`ground`（style grass / dirt / flat…） | 地面 |
| `path` | `{ points: [[x,z]…], width, color, edgeColor, dash }`：平滑曲線，直接畫進地面貼圖（硬邊像素） |
| `buildings` | `{ id, x, z, w, d, h, rotY, color, roof: flat \| gable, roofColor, windows: {rows, cols, color}, door }` |
| `hills` | `{ id, x, z, r, h, depth, color }`：低多邊形山坡 |
| `trees` | 清單 `[{x, z, h}]`，或 `{ count, area: [x0, z0, x1, z1], seed }` 隨機撒（避開路和建築） |
| `lamps` | `{ spacing, offset, color }`：沿路左右交錯的路燈 |
| **可補間** | `lit`（窗戶、路燈亮度 0..1） |
| 點 | 每個有 id 的建築（頂部）/ 山坡（頂部）、`path_start`、`path_end` |

### hand（低多邊形的手）
手腕在原點、手指朝 +Y、掌心朝 +Z、前臂往 -Y。適合透明背景、夾在 2D 雲之間。

| 參數 | 說明 |
|---|---|
| `position` `rotation`（度） | 伸出前的位置、朝向 |
| `reach` | 沿手指方向伸出的距離（× scale） |
| `roll` | 手掌繞前臂轉（度，翻掌） |
| `wrist` | `[掌屈, 側屈]`（度） |
| `curl` | 0..1；一個數字或 `[拇指, 食指, 中指, 無名指, 小指]` |
| `spread` | 手指張開 0..1 |
| `arm` `scale` `color` `sleeve` `side`（right / left）`flat` | 外觀 |
| **可補間** | `position`、`rotation`、`reach`、`roll`、`wrist`、`curl`、`spread` |

## 7. point()：3D 點 → 2D 擺位

- 時間軸：`"target": "3d:<點>"`，用**事件開始那一幀**的畫面位置（之後不跟著鏡頭走）；角色 `anchor` 用第 0 幀。
- TSX：`layer3dPoint(scene, "lamp_head", { camera, frame })` → `{ x, y, visible }`（像素層座標 480×270）。
- 鏡頭在動時，把 2D 元素放在鏡頭停下之後。

## 8. 決定性與貼圖

- 畫面只由幀數和 `seed` 決定（雪、閃燈、補間都是幀的函式），同一幀渲染兩次結果相同；可平行渲染、可跳幀。
- 程序貼圖同步畫；圖片貼圖（room 的 `arts.*.asset`）用 `delayRender` 先載完才掛 3D 畫布，不會漏畫。

## 9. 新增一種組件類型（最少步驟）

1. 新增 `src/three/layer3d/types/<名稱>.ts`，export 一個 `Layer3DType`：
   ```ts
   export const lantern: Layer3DType<{ x: number; glow: number }> = {
     describe: "一盞燈籠",
     defaults: { x: 0, glow: 1 },          // 所有參數都要有預設（場景 JSON 寫了不認得的參數會報錯）
     animatable: ["glow"],                  // 可補間的數字參數
     build: (p, ctx) => {                   // 同步建好 three 物件；亂數用 rng(ctx.seed)
       const root = new THREE.Group();
       const mat = new THREE.MeshBasicMaterial({ color: "#ffd27a" });
       root.add(boxMesh(0.3, 0.4, 0.3, mat, p.x, 1, 0));
       return { object: root, update: (q, f) => mat.color.setScalar(q.glow) };   // 每幀：只用 q 和 f.frame
     },
     points: (p) => ({ top: [p.x, 1.3, 0] }),   // 選填：給 "3d:<id>.top"
   };
   ```
2. 在 `types/index.ts` 的 `LAYER3D_TYPES` 加一行（影片專案自己的類型用 `registerLayer3DType("lantern", lantern)`）。
3. 場景 JSON：`{ "type": "lantern", "id": "l1", "x": 2 }`。
4. `node node_modules/typescript/bin/tsc --noEmit`，截一張圖看。

要用圖片時在模組加 `images: (p) => [p.src]`，build 裡用 `ctx.image(p.src)`（已載好）。

## 10. 報錯（紅框）

不認得的組件類型 / 參數、機位不存在、move / ease 寫錯、animate 的 target 或參數不能補間、燈或天氣的 type 寫錯、`3d:<點>` 不存在、圖片載入失敗、事件 `layer` 寫錯、`outline` 的參數 / `ids` / `width` 寫錯。
