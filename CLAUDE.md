# 超級人機 · 像素動效組件庫（給 AI 的入口）

這個專案把「時間軸 JSON」渲染成像素風知識短影片（Remotion，1920×1080、30fps）。



## 動手前必讀（依序）

1. `docs/timeline.md`：時間軸 JSON 格式、座標、`"@詞"` 對齊規則。
2. `docs/動效目錄_v3.md`：分鏡 `fx` 編號的意思。**標 ✅ 的條目後面寫著對應的組件名。**
3. `docs/components.md`：所有可用組件、props、預設時長。**只能用這裡列出的組件。**
4. `docs/stage-for-ai.md`：怎麼讀 `stages/*.json`、用 `target` 指名物件、用 `PropFx` 讓物件動。
5. `docs/actors.md`：分鏡 `fx: ACT` → scene 的 `actors` + `Act` / `ActorState` 事件；動作關鍵詞、換裝、mark。
6. 範例：`timelines/demo.json`（正確寫法）、`timelines/errors-demo.json`（會報錯的寫法）、`timelines/act-demo.json`（全部動作）。

組件的參數規格以 `src/timeline/registry.tsx` 為準（文件和程式不一致時看程式）。

## 把分鏡翻成時間軸

分鏡 prompt（v5）只給分鏡 AI 引擎能力的概要。圖層、3D 限制、角色遮擋、UI 擺放，以及 `logo：` / `logo角色：` / `書封：` 素材怎麼做，見 **`docs/分鏡翻譯附錄.md`**。
分鏡寫了品牌，畫面上就要用官方 logo，不要改成文字牌。

### 動效（`fx: 編號`）

1. 在 `docs/動效目錄_v3.md` 找到這個編號：
   - **有 ✅** → 用後面寫的組件。
   - **沒有 ✅** → 先試著用現有組件組合出來（例如 C45「三格並排 + 一章蓋全部」= 三個 `Sprite` 框 + 一個 `Stamp`）。組合得出來就做，效果接近即可。
   - **組合不出來** → 用最接近的已有組件代替，不要卡住整支片。
2. `NEW-編號`（分鏡 AI 提出的新動效）→ 同上：先組合，不行就代替。
3. 不論哪種代替，都記進最後的「對照報告」（見「交付」）。

### 角色動作（`fx: ACT`）

- 分鏡的 action 括號裡是**已有的 20 個動作**之一 → 直接寫成 `Act` 事件。
- 是 `NEW` 動作（例如「（NEW 睡覺）」）：
  - 現有骨頭能做到的 → **可以新增** `assets/actions/<關鍵詞>.json`（格式見 `docs/actors.md` 第 5 節），跑 `npm run assets` 檢查，再用 `node scripts/stills.mjs` 截圖確認動作看起來對。
  - 需要新骨頭、新部位或新 SVG 的 → 不要做，用最接近的已有動作代替，記進對照報告。
- 新增的動作檔做完要列給使用者看（動作名、幀數、截圖）。

### 觸發時間

- 分鏡的 `trigger` 是旁白原字，對應時間軸的 `"start": "@詞"`。`@詞` 找不到時會出紅框，回頭查字幕裡有沒有這個高亮詞，不要改旁白。

## 可以改哪些程式

- **不要改 `src/` 的現有組件**來完成影片。
- **可以新增**：時間軸 JSON、動作檔（見上）、自製素材（見「素材」）、用現有 3D 系統搭的新舞台。
- 組件不夠用、3D 系統缺某個能力時：**不要在做影片的任務裡順手擴充引擎**。用代替方案把片做完，把缺的能力寫進對照報告，由使用者決定要不要另開開發任務。

## 3D 舞台（做影片時）

- 先看 `docs/stage3d.md`。它存在，就照它的方式為分鏡的 `scene3d` 建舞台（只新增舞台模組，不改系統本身）。
- 它不存在，或分鏡要的能力它沒有（例如某種鏡頭運動、某種物件狀態切換）→ 該舞台先用 2D 舞台或最接近的已有 3D 舞台代替，記進對照報告。

## 指令

```powershell
npm run assets                                            # 新增素材、舞台、動作後必跑：複製素材、註冊舞台、建角色骨架與動作庫
node scripts/stills.mjs Timeline 0 45 120 --props-file=timelines/<名稱>.json   # 截指定幀到 out/stills/，自檢用
node scripts/render-timeline.mjs timelines/<名稱>.json    # 渲染成 out/<名稱>.mp4
npm run typecheck
node scripts/host-rig.mjs                                 # 改了 assets/host-svg 或骨架設定後重產主持人說話骨架
python scripts/gen-sprite.py <生圖.png> --name <名稱> --height <N> [--grid 2x2 --anim]   # AI 生圖 → 像素素材（見「自己做素材」第 4 點）
```

## 自檢

- 寫錯時畫面左上角會出現紅框，列出所有錯誤（未知組件、參數、`@詞` 找不到、target 找不到…）。
  **每份時間軸寫完都要截幾張圖看**：每個 scene 的開頭、每個高亮詞那一幀、結尾。有紅框就修到沒有。
- 用 Read 工具打開 `out/stills/*.png` 自己看畫面：物件有沒有被字幕擋住、標籤有沒有出畫、強調有沒有對準物件、3D 物件和疊在上面的精靈有沒有錯位。

## 交付

做完影片後給使用者一份簡短的**對照報告**：

- 代替：哪個 shot 的哪個 `fx` / 動作，用什麼代替，為什麼。
- 新增：新增了哪些動作檔、自製素材（附 manifest 的條目）。
- 缺口：哪些效果或 3D 能力目前做不到，建議另開開發任務。
- 截圖：每個 scene 一張代表幀。

## 素材

- 素材庫：`D:/桌面/素材庫/PixelSRPG-Forge-main`，**只讀**。
- 素材清單：`D:/桌面/agents/素材使用清單_SpriteSheet與SeamlessLoop.md`。挑素材、播放素材都以它為準。
- 人物：`public/svgAll/`（`svg_host` 主持人、`svg_leijun` 雷軍），只讀取，不修改。
- 不使用向量搜尋（舊的 `asset_index`、`search.py` 已停用）。分鏡裡的 `asset_query` 只是描述想要的樣子，當備註看，不拿去搜尋。
- 時間軸裡一律寫 `asset`（相對素材庫根目錄的 path）。

### 挑素材

1. 先讀素材清單，再到素材庫對應的資料夾裡找：

   | 資料夾 | 內容 |
   |---|---|
   | `Sprite Sheet/` | 一張 PNG 橫排多格的動畫 |
   | `Seamless Loop/` | 一個資料夾一組動畫，一格一張 PNG |
   | `小素材/`、`技能圖標/`、`服裝裝飾/`、`氣泡_心情表示_數字/` | 單張靜態圖 |
   | `本期要用到的/` | 這一期指定的圖（logo、封面等），通常是大圖 |

2. 每個候選都用 Read 打開看一眼，形狀和用途都對才用；有一點不對（例如要收銀機卻是錢箱、要書卻是卷軸），就自己做，不要將就。
3. 動畫素材的切格、格數、速度、循環方式、錨點照清單的參數表；影格一律按檔名數字排序，硬切不補間，整數倍放大並關閉平滑。
4. `本期要用到的/` 的大圖不能直接放：先縮小並量化到舞台的調色盤，讓它的「一格」和其他像素素材一樣大，存到 `assets/generated/`（見下）。

### 自己做素材

依難度選方法，越簡單越好：

1. **簡單的道具、圖示**（價簽、金幣、書、鑰匙、標籤底框）：用程式畫像素圖（canvas、SVG 或 PixiJS），在原生小尺寸（例如 16×16、32×32）上畫，再整數倍放大；顏色取自該舞台的 `palette`。
2. **3D 場景裡的物件**：直接在 three.js 裡建模（分鏡的 `scene3d.layout` 已有尺寸）。
3. **複雜的東西**（特定場景、人物以外的寫實物件）：可以上網找圖，下載後縮小並量化到調色盤，讓它和其他像素素材的「一格」一樣大。
4. **分鏡寫「生圖：」「生圖動畫：」「生圖精靈圖：」**：用 Codex CLI 的 imagegen 生圖，再用 `scripts/gen-sprite.py` 處理成像素素材。
   - **先確認能用**：`codex login status` 要顯示用 ChatGPT 登入（算會員額度）；沒登入或沒有會員就**不要生圖**，改用方法 1–3 或素材庫最接近的圖代替，記進對照報告。
     呼叫 Codex 前在同一個指令裡清掉 API key（`$env:OPENAI_API_KEY = $null; codex exec ...`），否則會改走 API 付費。
   - **給 Codex 的描述**：純綠 `#00FF00` 背景、像素風、物件不要用亮綠色；宮格圖寫明幾欄幾列、每格內容，各格物件大小、位置、視角一致、不碰格線。
   - **處理**：`python scripts/gen-sprite.py <生圖.png> --name <名稱> --height <原生高度>`，加 `--grid 2x2`（宮格）、`--anim`（動畫）或 `--labels a,b,…`（精靈圖每格名稱）、`--for "shot 12 …"`。參數說明在腳本開頭。
     - 動畫輸出資料夾 `<名稱>/1.png…`，時間軸 `asset` 寫資料夾 `@engine/assets/generated/<名稱>`，速度用 `animFps`、播一次用 `play: "once"`。
     - 精靈圖、單張輸出 `<名稱>_<標籤>.png` / `<名稱>.png`。
     - 腳本會自動登記 manifest；照它印出的路徑加進 `assets.list.json` 再跑 `npm run assets`。
   - **檢查**：用 Read 看 `out/gen-preview/<名稱>.png`。物件被切掉、邊緣有雜點或綠邊、動畫各格跳動，就調整描述重生一次。

自製的素材放在 `assets/generated/`，每一張都要登記在 `assets/generated/manifest.json`：

```json
{ "file": "price_tag_300.png", "for": "shot 1 吊牌", "method": "canvas 像素繪製", "source": null, "license": null }
```

上網找的圖，`source` 填網址、`license` 填授權名稱。做完一批後列給使用者看。

新增的素材（庫裡的或自製的）都要加進 `assets.list.json`，再跑 `npm run assets`。

## 固定規則

- 每個字幕高亮詞都要觸發一個強調動效（`"start": "@詞"`）。
- 顏色語義：金 = 好、紅 = 壞 / 否定、金框＋一點點紅 = 高級、深藍 = 普通的你 / 夜晚。只管「表態」的元素，裝飾物顏色不受限。
- 不使用原片創作者「索爾」的任何元素；主持人是「超級人機」，最後一句固定「這裡是超級人機，我們下一期見」。
- 改完程式或文件後，先跑 `npm run typecheck`，通過才 commit 並 push 到 `main`（commit 訊息寫成 UTF-8 檔案，用 `git -c i18n.commitEncoding=utf-8 commit -F <檔>`）。typecheck 不過就修好再提交，不要帶著錯誤推上去。
