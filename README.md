# 超級人機 · 像素動效組件庫（Remotion）

知識類短影片頻道「超級人機」的像素風動效組件。依《動效詞典 v2》第六節「必須遵守」的風格常量實作，
用 Remotion（React + TypeScript）逐幀渲染，1920×1080、30fps，可直接匯出 mp4。

風格：**像素素材 + 現代光影**。角色、道具、UI 是硬邊像素；bloom、暗角、景深、光束是平滑的光影層。
色彩語義固定：金 = 好 / 價值、紅 = 壞 / 否定 / 歸零、深藍 = 夜晚 / 普通的你。

---

## 快速開始

```powershell
npm install
npm run assets          # 從素材庫複製用到的素材到 public/lib/（需要本機素材庫，見「素材」）
npx remotion studio     # 預覽（或 npm run studio，會先跑 assets）
```

匯出與截圖：

```powershell
npx remotion render Showcase4 out/showcase4.mp4
node scripts/stills.mjs Showcase4 50 440 700   # 一次打包，輸出指定幀的截圖到 out/stills/
```

## 展示 Composition

| ID | 內容 |
|---|---|
| `Showcase1` | 第零、一批：Sprite / Host、PixelStage、Camera、Ambience、Subtitle、TopNav、Watermark |
| `Showcase2` | 第二批強調類，最後一段示範「字幕高亮詞那一幀觸發光環 + 標籤」 |
| `Showcase3` | 第三批結構類：標題卡、進關轉場、計數器、群像網格、聚光燈 |
| `Showcase4` | 第四批片尾模板，照詞典「片尾模板」的順序演一遍 |
| `Test3D` | 3D 試驗：Three.js 長廊當背景，2D 組件疊在上面 |
| `Timeline` | **JSON 驅動的總合成**：讀 `timelines/demo.json`（約 33 秒示範片段） |
| `StagePreview` | 預覽舞台編輯器存的舞台（props：stage、pose、hostX） |
| `TimelineErrors` | 故意寫錯的時間軸（`timelines/errors-demo.json`），示範紅框報錯 |

---

## 組件一覽

括號是《動效詞典 v2》的編號。

### 第零批：素材（`src/components/`）

| 組件 | 用途 |
|---|---|
| `Sprite` | 顯示素材庫的單張圖或動畫條。原生尺寸繪製、整數倍放大；動畫 8–12fps 逐格播放、不補間；支援 `flipX`、`tint`（red / gray / gold / #hex）、`glow`、`bloom={false}` |
| `Host` | 主持人「超級人機」（`Me_我的像素人物/pixel/`，33 個姿勢），`pose` 用 character.json 的 name |
| `PixelBitmap` | 用字串畫小型像素圖（✕、王冠、星星、鎖、汗滴、游標、獎盃） |
| `ErrorBox` | 素材、姿勢、參數錯誤時在畫面上顯示紅框 |

### 第一批：畫面基底（`src/components/`）

| 組件 | 用途 |
|---|---|
| `PixelStage` | 場景容器：480×270 像素層 ×4、bloom（亮度門檻）、暗角；`hud`（像素座標、不跟鏡頭）、`ui`（螢幕座標） |
| `Layer` | 像素層裡的圖層，做背景景深（模糊、壓暗） |
| `Camera`（A4 / A5 / A6） | push / pull / pan / tilt-push / cut；預設取景 `shot()` 放大 1.5 倍 |
| `Ambience`（G） | dust、snow、lamp、stars、beam、confetti、zzz，可疊加，固定 seed |
| `Subtitle` / `Subtitles`（F3） | 底部字幕，白字粗描邊，高亮詞金橙色，換句 2 幀 |
| `TopNav`（F2） | 頂部章節導航，目前章節高亮、已完成打勾 |
| `Watermark`（F6） | 右上角「超級人機・主題」 |

### 第二批：強調類（`src/components/emphasis/`）

| 組件 | 用途 |
|---|---|
| `RingPulse`（B1） | 光環脈衝：中心白光 + 細線圓環 + 點狀粒子，15 幀 |
| `Tag`（B2 / B13 / B11） | 標籤：red、dark、hang（吊牌價籤）、locked（未解鎖卡） |
| `Stamp`（B6 / B3 + A9） | 蓋章；`variant="x"` 是 ✕ + 全畫面泛紅 |
| `SunBurst`（B5） | 放射光，持續旋轉 |
| `GlowText`（B7） | 點陣發光大字（最好 / 最差 / ×10,000），可加王冠 |
| `BeamDrop`（B12 + B4） | 光柱降臨：核心物件從天而降 |
| `MissPop`（B10） | MISS 彈字 + 頭上飄字 + 汗滴 |

### 第三批：結構類（`src/components/structure/`）

| 組件 | 用途 |
|---|---|
| `LevelTitleCard`（C8） | 關卡標題卡「第 N 關｜規則」，殘影錯位離場 |
| `LevelTransition`（A21 / A6） | `type="iris"` 圓形遮罩；`type="tilt"` 俯仰推入 |
| `Counter`（D1 / C41 / C20 / C62） | 翻牌計數機：數字跳動、換標籤、歸零碎裂變紅、復活 |
| `CrowdGrid`（A1 / A18 / A2） | 群像網格：zoom-out、pull-out、push-in |
| `Spotlight`（A13） | 聚光燈收窄 |

### 第四批：片尾模板（`src/components/ending/`）

| 組件 | 用途 |
|---|---|
| `ChestDeal`（C24） | 正面寶箱掉落 → 搖晃透光 → 半開 → 全開 → N 張「?」卡扇形飛出；`pace` 調節奏（預設 1.5） |
| `SkillCard`（C25 + C11 + C59） | 技能卡：從扇形位置飛到中央 → 翻面 → 示範動畫（`renderDemo`）→ 收到左上角 |
| `SkillSummary`（C59） | 三張卡飛回扇形展開「已習得 N/N」 |
| `GamePopup`（C29 / C30 / B9） | `follow` 關注邀請、`input` 留言框、`achievement` 成就解鎖、`ending` 解鎖結局小牌 |
| `NextTeaser`（C32） | 右上角 ??? 下集預告框 |

### 對話（`src/components/dialog/`，移植自 `docs/pixel_choice_box.html`）

| 組件 | 用途 |
|---|---|
| `DialogBox` | 像素對話框：深藍框 + 米色底 + 金線 + 四角紅寶石，說話人 + 逐字打出，打完右下角紅箭頭跳動 |
| `ChoiceMenu`（C6 / C16） | 選項框：`picks [{at, index}]` 決定游標停在哪一項，選中項偏移 + 陰影 + 放大 + 閃爍游標；`confirmAt` 閃一下 |
| `ChoiceDialog` | 兩者連動：確認後對話框逐字打出選中項的 `reply` |

原稿是滑鼠 / 鍵盤互動，影片版改成時間表；字體改用專案的 Fusion Pixel（原稿的 DotGothic16 是日文字體，缺部分繁中字）。

---

## JSON 驅動的總合成

分鏡 AI 輸出時間軸 JSON → `Timeline` Composition 渲染。

- 格式說明：[`docs/timeline.md`](docs/timeline.md)；給分鏡 AI 的組件清單：[`docs/components.md`](docs/components.md)
- 型別：`src/timeline/types.ts`；組件註冊表與參數檢查：`src/timeline/registry.tsx`；舞台預設：`src/timeline/stages.tsx`
- event 的 `start` 可寫 `"@高亮詞"` / `"@高亮詞+5"`，對準字幕高亮詞的 `at`
- 寫錯（未知組件、未知參數、缺必填、型別錯、`@詞` 找不到、舞台不存在…）時，該 event 不渲染，畫面左上角紅框列出錯誤
- 換一份時間軸：改 `src/Root.tsx` 的 import，或在 Studio 右側直接編輯 `timeline` props

```powershell
npx remotion render Timeline out/timeline.mp4                 # 渲染 Root.tsx 裡預設的 demo.json
node scripts/render-timeline.mjs timelines/<名稱>.json        # 渲染任一份時間軸 → out/<名稱>.mp4
```

給 AI 的入口是根目錄的 `CLAUDE.md`（Claude Code 在這個資料夾開啟時會自動讀取）。

---

## 使用規則

### 座標與構圖

- **像素層 480×270，整層放大 4 倍。** PixelStage 的 children、Sprite、Host、Ambience 用像素層（世界）座標，座標取整數。
- **構圖**：人物和物品站在畫面 80% 高度的地面線（底部往上 20%），剛好在字幕上方，字幕不擋人。
- **預設取景**：`Camera` 沒給 `initial` 時用 `shot()`，放大 1.5 倍（每像素 6 螢幕 px，仍是整數倍）。
  世界座標的地面線 `WORLD.groundY = 160` 會落在畫面 80%；可見範圍是世界 x 80–400、y 16–196。要廣角就 `pull` 到 zoom 1。
- **三個圖層**：
  - `children`：跟鏡頭走的場景內容（人物、道具、跟著物件的光環和標籤）。
  - `hud`：像素座標、不跟鏡頭動、會參與 bloom（標題卡、發光大字、技能卡、彈窗）。
  - `ui`：螢幕座標 1920×1080（字幕、導航、浮水印）。
- 世界座標換成畫面座標用 `worldToScreen(cam, x, y)`（例如寶箱上的卡片飛進 hud 的技能卡）。

### 時間

- 所有動畫只由 `useCurrentFrame()` 計算，不用 CSS transition / setTimeout，每次渲染結果一致。
- 強調和片尾組件的 `useCurrentFrame()` 是「觸發後經過的幀數」，時間軸用 `<Sequence from={觸發幀}>` 包住。
- 字幕高亮詞可以帶 `at`（念出的幀），強調動效對準這一幀觸發（詞典規則 2）。

### 節奏（詞典規則 10）

- 強調元素（標籤、印章、標題卡）：瞬間出現或 2–3 幀回彈。
- 鏡頭和光：平滑緩動 `cubic-bezier(.65,0,.35,1)`。
- 掉落、彈出的道具：帶彈跳。

---

## 舞台編輯器（選素材、擺場景）

```powershell
npm run stage-editor          # = python tools/stage_editor/server.py，然後用瀏覽器打開 http://localhost:8765
```

- 左邊有兩種找素材的方式：
  - **關鍵詞搜尋**：關鍵詞命中的全部列出，再加上 CLIP 畫面相似的前 N 名（50–1000 可選；相似度越後面越不準）。
  - **瀏覽資料夾**：選一個資料夾（例如室內裝飾、FarmLife），列出裡面全部素材。挑同一套風格時很好用。
  - 結果捲到底自動載入下一批，縮圖延遲載入，幾千筆也不會卡。可依來源、分類、尺寸、靜態 / 動畫篩選。
- 把素材拖到中間的畫布（或點一下加到中央）。畫布就是影片的世界座標：
  勾「影片取景」看到的就是影片畫面（1.5 倍）；金線 = 地面線（人物腳底）、紅區 = 字幕區；可以預覽主持人站位。
- 選中素材後：拖曳 / 方向鍵移動、1–8 改倍數、F 翻轉、[ ] 調前後、深度（背景模糊 / 主體 / 前景）、Ctrl+Z 復原。
- **旋轉**：拖素材上方的藍色把手（每 15° 吸附，按住 Shift 自由旋轉），或按 R / Shift+R 轉 ±90°，也能在右側輸入角度。
  90° 的倍數像素完全清晰（例如把豎著的床轉成橫放）；其他角度像素邊緣會有鋸齒。
  倍數選項：0.5、1、1.5、2、2.5、3、4、5、6、8。整數倍像素最一致；0.5 的倍數在影片裡仍是整數螢幕像素，但像素粗細和其他素材不同。
- 主持人也是畫布上的物件：可以拖曳、翻轉、改倍數、刪除（「主持人」分頁點姿勢換造型或加回來）。
  位置會存進舞台，成為預設站位；時間軸 scene 沒寫 `host` 時用舞台的，寫了以時間軸為準，寫 `null` 則不出現。
- 搜尋結果只列 PNG（影片端只支援 PNG）。重複開啟伺服器時會提示埠已被佔用。
- 牆面、地板、木紋、檯燈光在右側設定。按「存檔」寫進 `stages/<名稱>.json`。
- **物件名稱**：加入時自動帶入素材名稱，可在右側改（例如「主角的床」）。AI 加動畫時用名稱指名物件。
- **3D 場景背景**：把 3D 場景的 HTML 放進 `scenes3d/`，在「3D 場景」分頁按「截圖」，再拖到畫布或按「設為背景」。
  截圖存在 `public/bg3d/`（預設 480×270、只截 3D 畫布、等 4 秒讓模型載入）；影片裡用這張圖，不跑 3D。
  背景可以調整：點背景選取後拖曳移動、方向鍵微調、滾輪或 + / - 縮放；右側可輸入 X、Y、倍數，也能「鎖定背景」避免擺道具時誤拖。
  放大超過 1 倍時，建議用 960×540 重新截圖，細節較清楚。
- **給 AI**：AI 讀 `stages/*.json`，用時間軸的 `target` 和 `PropFx` 在場景上加動畫，說明在 `docs/stage-for-ai.md`。
- 存檔後執行 `npm run assets`（會複製舞台用到的素材，並把舞台註冊進 Remotion），
  在 Studio 的 `StagePreview` 填舞台名稱預覽，時間軸寫 `"stage": "<名稱>"` 就能用。
- 伺服器只在本機（127.0.0.1）監聽；素材庫只讀，不會被修改。8765 被佔用時可用 `python tools/stage_editor/server.py --port 8766`。
## 素材

- 素材庫 `D:/桌面/PixelSRPG-Forge-main`、索引 `D:/桌面/asset_index` **只讀**，不修改。
- 要用的素材列在 `assets.list.json`，執行 `npm run assets` 複製到 `public/lib/`，並產生 `src/generated/asset-meta.json`（尺寸與動畫格子）。
- 主持人 `Me_我的像素人物/pixel/*` 和 `character.json` 會自動複製。
- 動畫格子資訊來自 `inventory.csv`；檔名帶 `(寬x高)` 時以檔名為準（索引偶爾判錯，例如 Slime 被判成 88×30）。
- `public/lib/` 不進 git（素材包與個人形象不公開散布）。clone 下來後，在有素材庫的電腦上執行 `npm run assets` 即可。

## 字體

`public/fonts/fusion-pixel-12px-zh_tw.woff2`（Fusion Pixel Font，OFL-1.1，可商用，授權檔在同一資料夾）。
只用 12 的整數倍字號（12 / 24 / 36 / 48 / 60 / 96），字才不會糊。換字體改 `src/fonts.ts`。

## 3D（試驗，方案一：3D 當背景、2D 疊在上面）

`Test3D`（`src/three/MuseumHall.tsx`、`src/showcase/Test3D.tsx`）：

- Three.js 以 320×180、無抗鋸齒渲染，放大成 480×270 → 每個 3D 像素 6px，和 1.5 倍取景下的 2D 素材一樣大。
- 鏡頭路徑寫成純函式，`project(frame, [x, y, z])` 把 3D 座標換成畫面座標，2D 的光環、標籤就能跟著 3D 物件走。
- bloom 層不重畫 3D（避免兩個 WebGL 畫面）；3D 物件要發光之後可加 Three.js 後製 bloom。
- 渲染需要 `remotion.config.ts` 的 `setChromiumOpenGlRenderer("angle")`。

---

## 專案結構

```
src/
  components/          第零、一批 + 共用（Sprite、Host、PixelStage、Camera、Ambience…）
    emphasis/          第二批強調類
    structure/         第三批結構類
    ending/            第四批片尾模板（含技能卡示範動畫 demos.tsx）
    dialog/            對話框、選項框
  timeline/            JSON 驅動的總合成（型別、註冊表、舞台、Composition）
  scenes/StudyRoom.tsx 試驗用的書房場景（用素材拼的臨時場景，不是正式舞台組件）
  showcase/            展示 Composition
  three/               3D 試驗場景
  generated/           npm run assets 產生的素材資訊
  theme.ts             色彩 tokens、像素層、構圖常數
timelines/             時間軸 JSON（demo.json、errors-demo.json）
docs/                  時間軸格式、組件清單、對話框原稿 HTML
scripts/
  copy-assets.mjs      素材複製
  stills.mjs           批次截圖
```

## 待辦

- `assetQuery` 自動解析（呼叫 search.py 的邏輯）與鎖定版 `*.lock.json`（目前寫了會報錯提醒）。
- 用舞台編輯器擺出正式的「家」舞台，取代試驗用書房；之後加燈光預設切換（亮 / 暗 / 檯燈）。

## 已知限制

- Node 22.9 在 Windows 上對含「【】」的路徑呼叫 `mkdirSync({ recursive: true })` 會崩潰，copy-assets 已改成逐層建立。
- Camera 縮放倍率不是 0.25 的倍數時，像素寬度會略有不均；tilt-push 期間畫面會稍微柔化。
- 字號小於 12 的文字（例如縮小後的技能卡）不再是像素清晰。
