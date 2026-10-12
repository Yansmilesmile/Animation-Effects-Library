# 超級人機 · 像素動效組件（Remotion）

目前進度：第零批（素材複製、Sprite、Host）+ 第一批（PixelStage、Camera、Ambience、Subtitle、TopNav、Watermark）
+ 第二批強調類（RingPulse、Tag、Stamp、SunBurst、GlowText、BeamDrop、MissPop，在 `src/components/emphasis/`）。

+ 第三批結構類（LevelTitleCard、LevelTransition iris/tilt、Counter、CrowdGrid、Spotlight，在 `src/components/structure/`）。

+ 第四批片尾模板（ChestDeal、SkillCard、SkillSummary、GamePopup follow/input/achievement/ending、NextTeaser，在 `src/components/ending/`）。

展示：`Showcase1`（第零、一批）、`Showcase2`（第二批）、`Showcase3`（第三批）、`Showcase4`（第四批：照詞典片尾模板順序演一遍）、`Test3D`（3D 試驗）。

強調組件的 `useCurrentFrame()` 是「觸發後經過的幀數」，時間軸用 `<Sequence from={觸發幀}>` 包住。
跟物件走的（光環、標籤）放在 PixelStage 的 children；不跟鏡頭動的（印章泛紅、發光大字）放在 `hud`。

構圖：人物和物品站在畫面 80% 高度的地面線（底部往上 20%，剛好在字幕上方）。
`Camera` 預設取景 `shot()` 放大 1.5 倍（每像素 6 螢幕 px），世界座標的地面線 `WORLD.groundY = 160` 會落在畫面 80%；
預設取景下看得到世界 x 80–400、y 16–196。要廣角就 `pull` 到 zoom 1。

## 指令

```powershell
npm install
npm run assets                              # 從素材庫複製用到的素材到 public/lib/，產生 src/generated/asset-meta.json
npx remotion studio                         # 預覽（或 npm run studio，會先跑 assets）
npx remotion render Showcase1 out/showcase1.mp4
node scripts/stills.mjs Showcase1 60 230    # 輸出指定幀的截圖到 out/stills/
```

## 素材

- 素材庫 `D:/桌面/PixelSRPG-Forge-main`、索引 `D:/桌面/asset_index` 都只讀。
- 要用的素材列在 `assets.list.json`（之後改成由 assetQuery 解析出的 `*.lock.json`），執行 `npm run assets` 後才能在組件裡用。
- 主持人 `Me_我的像素人物/pixel/*` 和 `character.json` 會自動複製。
- 動畫格子資訊來自 `inventory.csv`；檔名帶 `(寬x高)` 時以檔名為準（索引偶爾判錯，例如 Slime）。
- 沒登記的素材、不存在的姿勢、錯誤的參數，會在畫面上顯示紅框錯誤。

## 字體

`public/fonts/fusion-pixel-12px-zh_tw.woff2`（Fusion Pixel Font，OFL-1.1，可商用，授權檔在同一資料夾）。
只用 12 的整數倍字號（24 / 36 / 48 / 60 / 96）。換字體改 `src/fonts.ts`。

## 座標

- 像素層 480×270，整層放大 4 倍。PixelStage 的 children、Sprite、Host、Ambience、Camera 都用像素層座標。
- PixelStage 的 `ui`（Subtitle、TopNav、Watermark）用螢幕座標 1920×1080。

## 3D（試驗）

`Test3D`：Three.js 場景當背景，2D 組件疊在上面（`src/three/MuseumHall.tsx`、`src/showcase/Test3D.tsx`）。
- 3D 以 320×180、無抗鋸齒渲染，放大成像素層 480×270 → 每個 3D 像素 6px，和 1.5 倍取景下的 2D 素材一樣大。
- 鏡頭路徑寫成純函式，`project(frame, [x,y,z])` 把 3D 座標換成畫面座標，2D 的光環、標籤就能跟著 3D 物件走。
- bloom 層不重畫 3D（避免兩個 WebGL 畫面）。
- 渲染需要 `remotion.config.ts` 的 `setChromiumOpenGlRenderer("angle")`。

## 已知限制

- Node 22.9 在 Windows 上對含「【】」的路徑呼叫 `mkdirSync({recursive:true})` 會崩潰，copy-assets 已改成逐層建立。
- Camera 縮放倍率不是整數時，像素寬度會略有不均（平滑鏡頭的必然代價）；tilt-push 期間畫面會稍微柔化。
