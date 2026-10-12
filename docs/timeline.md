# 時間軸 JSON 格式

分鏡 AI 產生這份 JSON，`Timeline` Composition 直接渲染。範例：`timelines/demo.json`；故意寫錯的範例：`timelines/errors-demo.json`。
型別定義：`src/timeline/types.ts`。

```jsonc
{
  "fps": 30,
  "nav": { "chapters": ["序章", "第一關｜…", "結尾"] },   // 頂部導航（選填）
  "watermark": "書名或主題",                               // 右上角「超級人機・…」（選填）
  "scenes": [
    {
      "id": "lesson",                 // 名稱，報錯時會標出來
      "duration": 190,                // 幀；scene 依序接在一起
      "stage": "study-room",          // 舞台：study-room | night-snow | void
      "background": "#05060c",        // 底色（選填，覆寫舞台預設）
      "host": { "pose": "full_point_happy", "x": 150 },  // 主持人（選填），y 預設地面線
      "navIndex": 1,                  // 導航高亮第幾段；省略 = 不顯示導航
      "watermark": false,             // 這個 scene 不顯示浮水印（選填）
      "cameraInitial": { "x": 240, "y": 106, "zoom": 1.5 },   // 選填，預設標準取景
      "camera": [ { "type": "push", "start": 24, "duration": 40, "to": { "x": 215, "y": 128, "zoom": 2 } } ],
      "ambience": ["dust", { "type": "lamp", "x": 348, "y": 132, "radius": 50, "cone": 40 }],
      "subtitles": [
        { "start": 0, "end": 70, "text": "每打一個孔，就是一次重大決定", "highlight": [{ "word": "重大決定", "at": 50 }] }
      ],
      "events": [
        { "component": "RingPulse", "start": "@重大決定", "props": { "x": 270, "y": 147 } },
        { "component": "Tag", "start": "@重大決定+2", "duration": 50, "props": { "text": "一生一張卡", "x": 270, "y": 128 } }
      ]
    }
  ]
}
```

## 規則

- **時間**：全部以幀為單位（30fps）。scene 內的 `start` 相對於 scene 開頭。
- **`"@詞"`**：event 的 `start` 寫 `"@重大決定"` 或 `"@重大決定+5"`，對準這個 scene 字幕裡高亮詞的 `at`。
  高亮詞要寫成 `{ "word": "...", "at": 幀 }` 才能被對準（詞典規則 2：高亮詞 = 動效觸發點）。
- **`duration`**：event 顯示多久；省略 = 到 scene 結束。
- **座標**：
  - `world` 圖層（跟鏡頭走）用世界座標：地面線 `y = 160`（預設取景下在畫面 80%），可見範圍 x 80–400、y 16–196。
  - `hud` 圖層（固定在畫面）用畫面座標 480×270，敘事重心 `y ≈ 108`，`y > 216` 是字幕區。
  - 每個組件預設在哪一層見 `docs/components.md`；需要時用 event 的 `"layer": "world" | "hud"` 覆寫。
- **構圖**：人物和物品站在地面線上（腳底 / 底部 `y = 160`），字幕不擋人物。
- **鏡頭**：`camera` 的 `type` 是 `push | pull | pan | tilt-push | cut`；zoom 建議 1、1.25、1.5、2、2.5（像素寬度才均勻）。
- **素材**：`Sprite` / `BeamDrop` 的 `asset` 是相對素材庫根目錄的 path，必須先列進 `assets.list.json` 並執行 `npm run assets`。
  `assetQuery` 還沒有自動解析，寫了會報錯提醒。

## 報錯

寫錯的地方不會靜默略過：該 event 不渲染，畫面左上角出現紅框列出所有錯誤，例如：

- 未知組件（會列出所有可用名稱）
- 未知參數（會列出這個組件可用的參數）、缺必填參數、型別不對
- `"@詞"` 找不到、高亮詞沒有 `at`
- 舞台不存在、SkillCard 的 `demo` 不存在、GamePopup 的 `variant` 不存在
- `assetQuery` 尚未解析
