# 超級人機 · 像素動效組件庫（給 AI 的入口）

這個專案把「時間軸 JSON」渲染成像素風知識短影片（Remotion，1920×1080、30fps）。
AI 的工作通常是：讀分鏡 + 使用者擺好的舞台 → 寫 `timelines/<名稱>.json` → 截圖自檢 → 渲染 mp4。
**不要改 `src/` 的組件**來完成影片；組件不夠用時，先告訴使用者缺什麼。

## 動手前必讀（依序）

1. `docs/timeline.md`：時間軸 JSON 格式、座標、`"@詞"` 對齊規則。
2. `docs/components.md`：所有可用組件、props、預設時長、對應的動效詞典編號。**只能用這裡列出的組件。**
3. `docs/stage-for-ai.md`：怎麼讀 `stages/*.json`、用 `target` 指名物件、用 `PropFx` 讓物件動。
4. `stages/*.json`：使用者用舞台編輯器擺好的場景。**只讀，不要改。**
5. 範例：`timelines/demo.json`（正確寫法）、`timelines/errors-demo.json`（會報錯的寫法）。

組件的參數規格以 `src/timeline/registry.tsx` 為準（文件和程式不一致時看程式）。

## 指令

```powershell
npm run assets                                            # 新增素材或舞台後必跑：複製素材、註冊舞台
node scripts/stills.mjs Timeline 0 45 120 --props-file=timelines/<名稱>.json   # 截指定幀到 out/stills/，自檢用
node scripts/render-timeline.mjs timelines/<名稱>.json    # 渲染成 out/<名稱>.mp4
npm run typecheck
node scripts/bg3d-loop.mjs scenes3d/<名稱>.html          # 3D 背景截成循環幀（燈光閃爍）；之後跑 npm run assets
node scripts/host-rig.mjs                                 # 改了 assets/host-svg 或骨架設定後重產主持人說話骨架
```

## 自檢

- 寫錯時畫面左上角會出現紅框，列出所有錯誤（未知組件、參數、`@詞` 找不到、target 找不到…）。
  **每份時間軸寫完都要截幾張圖看**：每個 scene 的開頭、每個高亮詞那一幀、結尾。有紅框就修到沒有。
- 用 Read 工具打開 `out/stills/*.png` 自己看畫面：物件有沒有被字幕擋住、標籤有沒有出畫、強調有沒有對準物件。

## 固定規則

- 構圖：人物和物品站在地面線 y = 160（畫面 80%），y > 216（hud）是字幕區，不要放東西。
- 每個字幕高亮詞都要觸發一個強調動效（`"start": "@詞"`）。
- 顏色語義：金 = 好、紅 = 壞 / 否定、深藍 = 普通的你 / 夜晚。只管「表態」的元素，裝飾物顏色不受限。
- 3D 背景只是一張截圖，不能對 3D 裡的東西做動畫。
- 素材庫 `D:/桌面/PixelSRPG-Forge-main`、索引 `D:/桌面/asset_index`、`search.py` 只讀。
  新增素材：用 `python D:/桌面/asset_index/asset_tools/search.py "短詞 短詞" --json` 查，把 path 加進 `assets.list.json`，再跑 `npm run assets`。
  `assetQuery` 尚未支援，一律寫 `asset`（path）。
- 不使用原片創作者「索爾」的任何元素；主持人是「超級人機」，最後一句固定「這裡是超級人機，我們下一期見」。
- 改完程式或文件後 commit 並 push 到 `main`（commit 訊息寫成 UTF-8 檔案，用 `git -c i18n.commitEncoding=utf-8 commit -F <檔>`）。
