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
  `"@每次+mark:release"`：對準 start 同樣是 `"@每次"` 的 `Act` 動作裡的時間點（例如遞錢的金幣離手），後面還能再加 `+N`。
- **角色動作**：scene 寫 `actors` 宣告角色，`Act` / `ActorState` 事件讓角色做動作、換裝、變剪影。詳見 `docs/actors.md`。
- **`duration`**：event 顯示多久；省略 = 到 scene 結束。
- **`target`**：用名稱指名舞台編輯器裡的物件（或「主持人」），自動帶入座標；`anchor` 選 center / top / bottom，`offset` 再微調。
  `PropFx` 讓物件本身晃動、彈跳、發光、染色、消失、移動。詳見 `docs/stage-for-ai.md`。
- **`id`**：給事件取名，之後的事件可以用 target 指名它（例如 `"target": "tower.倉庫"` 指 PriceTower 的某一層）。被指名的事件要寫在前面。
  組件貼在 3D 錨點上時，指名它各部分的事件也會跟著同一個錨點走。
- **props 裡的 `"@詞"`**：欄位名是 `at` 或以 `At` 結尾（`splitAt`、`highlight[].at`…）時，可以寫 `"@詞"` / `"@詞+5"`，自動換成相對這個事件開始的幀。
- **props 裡的 target**：任何 props 物件寫 `{ "target": "名稱", "anchor": "top", "offset": {...} }` 會換成 `{ x, y }`（CoinFlight 的 `to` 用）。
- **`focus`**：`[{ "at": "@盯著", "dim": 0.5, "blur": 2, "frames": 12 }]`，任何事件都能在 frames 幀內漸變壓暗（0..1）/ 模糊（像素）。
- **座標**：
  - `world` 圖層（跟鏡頭走）用世界座標：地面線 `y = 160`（預設取景下在畫面 80%），可見範圍 x 80–400、y 16–196。
  - `hud` 圖層（固定在畫面）用畫面座標 480×270，敘事重心 `y ≈ 108`，`y > 216` 是字幕區。
  - 每個組件預設在哪一層見 `docs/components.md`；需要時用 event 的 `"layer": "world" | "hud" | "back"` 覆寫。
    `back` = 世界座標、畫在主持人 / 角色**後面**（整張背景圖、角色腳下的坑；例如書頁特寫的書頁圖）。
    **數字**（`"layer": -1`、`2`…）= 和 3D 層（scene 的 `layer3d`，z 預設 0）排順序：比 z 小畫在 3D **後面**，大於等於畫在 3D 前面（仍在 back / 角色 / world 之下）。見 `docs/layer3d.md`。
- **3D 層**：scene 寫 `"layer3d": { "scene": "<場景名>", "camera": …, "animate": … }`，target 可寫 `"3d:<點>"`。詳見 `docs/layer3d.md`。
  - **跟著 3D 鏡頭走（follow，預設關）**：`layer3d.follow: true` = 整個 scene 掛在 `3d:<點>` 上的 2D 跟著 3D 鏡頭平移（不縮放）。
    事件 / 角色可以自己寫 `"follow": true | false | "3d:<點>"` 覆寫；`"3d:<點>"` 給用 x / y 擺的東西（前景遮罩）指定跟哪個點。
    角色另有 `"followAt"`（數字或 `"@詞"`，預設 0）：站位、Act 的 from / to 寫的是這一幀的畫面位置。
    `"clipBelow": "3d:<點>"`（角色或事件）：這個點以下不畫（站在桌子 / 講台後面），要搭配 follow。hud 不跟。詳見 `docs/layer3d.md` 第 7 節。
    `"followScale": "shrink"`（`layer3d`、角色或事件；`false` = 關）：跟隨時依深度只縮不放，最近的那一幀 = 1 倍（`"followScaleAt"` 可手動指定基準幀）；角色軸心在腳底。推拉有角色在遮擋物後面時開。
- **構圖**：人物和物品站在地面線上（腳底 / 底部 `y = 160`），字幕不擋人物。
- **鏡頭**：`camera` 的 `type` 是 `push | pull | pan | tilt-push | cut`；zoom 建議 1、1.25、1.5、2、2.5（像素寬度才均勻）。
- **素材**：`Sprite` / `BeamDrop` 的 `asset` 是相對素材庫根目錄（`D:/桌面/素材庫/PixelSRPG-Forge-main`）的 path，必須先列進 `assets.list.json` 並執行 `npm run assets`。
  `assetQuery` 還沒有自動解析，寫了會報錯提醒。
  - 單張圖 / 動畫條（`Sprite Sheet/…png`，檔名帶「(寬x高)」自動切格）：寫檔案路徑。
  - **Seamless Loop、氣泡**（一格一張 PNG）：寫**資料夾**路徑，例如 `"Seamless Loop/轉動金幣"`、`"氣泡_心情表示_數字/氣泡/問號氣泡"`。影格自動按檔名數字排序；`Flag_Blue` / `Flag_Red` 寫到資料夾即可（會自己找 `Frames/`）。
  - 動畫速度、循環 / 播一次的預設值照素材清單，不用自己寫；要改才寫 `animFps`、`play`（見 `docs/components.md` 的 Sprite）。
  - 清單裡的例外照寫原路徑，引擎會換成處理過的版本：`Sprite Sheet/粒子特效/Flashing particles.png`（8 顆星、已去深底）、`小素材/食物/103.png`、`技能圖標/加速_提升_跑步.png`（已去背）。`小素材/金幣.jfif` 是照片，會報錯，不要用。

## 音效

8-bit 晶片風音效（`scripts/make-sfx.mjs` 程式合成，檔案在 `assets/sfx/`，已打包進組件庫，影片專案不必複製）。

```jsonc
{ "component": "RingPulse", "start": "@金幣", "sfx": "金幣", "props": { … } },   // 任何事件加 sfx：在事件開始那一幀播放
{ "start": "@數一數+6", "sfx": "計數" },                                         // 只有 start + sfx = 只播音效（可重複寫）
{ "start": 54, "sfx": "計數", "volume": 0.8 }                                     // volume 0..1，預設 0.5
```

- `sfx` 寫中文名或檔名（`"金幣"` = `"coin"`），簡體寫法也行（`"金币"`）。寫錯會出紅框並列出全部名稱。
- 和配音（`timeline.audio`）一起混音；音效預設音量 0.5（配音是 1），整支片要調就在最外層寫 `"sfxVolume": 0.4`，單一事件用 `volume`。
- 轉場（`transitionOut`）的凍結畫面不會重播音效。
- 全部聽一次：`assets/sfx/sfx_preview.wav`（依下表順序，間隔 0.5 秒）。對照表：`assets/sfx/index.json`。

| 名稱 | 檔名 | 秒 | 聲音 / 用途 |
|---|---|---|---|
| 點擊 | click | 0.10 | 高音短「喀」，按鈕、點選 |
| 彈出 | pop | 0.13 | 上滑「啵」，物件、氣泡出現 |
| 金幣 | coin | 0.46 | 經典兩音，得到錢、好事 |
| 錯誤 | error | 0.48 | 兩聲低沉往下沉，錯、否定 |
| 升級 | levelup | 0.72 | 兩個八度往上琶音，升級、成功 |
| 獲得道具 | item | 0.47 | 快速上行接顫音，拿到東西（和升級區分） |
| 點亮 | light | 0.33 | 明亮短叮，燈亮、靈光一閃 |
| 翻頁 | page | 0.16 | 紙「唰—啪」 |
| 煙霧 | smoke | 0.20 | 短促「噗」，SmokePop |
| 計數 | count | 0.10 | 單個數字 tick，數字跳動時重複觸發 |
| 打字 | type | 0.10 | 單字 tick，逐字打出時重複觸發 |
| 摔倒 | fall | 0.58 | 顫抖下滑＋兩下落地悶響 |
| 掉落 | drop | 0.58 | 下墜「呼—」＋落地「咚」 |
| 蓋章 | stamp | 0.26 | 小「喀」接沉重「碰」，Stamp |
| 翻牌 | flip | 0.19 | 短刷接上滑小叮，卡牌翻面 |
| 解鎖 | unlock | 0.52 | 機械「喀、喀」接上行兩音 |
| 轉場 | swoosh | 0.26 | 短刷「咻」，換場 |
| MISS | miss | 0.66 | 三聲往下掉的「哇哇哇——」，失敗、落空 |

## 報錯

寫錯的地方不會靜默略過：該 event 不渲染，畫面左上角出現紅框列出所有錯誤，例如：

- 未知組件（會列出所有可用名稱）
- 未知參數（會列出這個組件可用的參數）、缺必填參數、型別不對
- `"@詞"` 找不到、高亮詞沒有 `at`
- 舞台不存在、SkillCard 的 `demo` 不存在、GamePopup 的 `variant` 不存在
- `assetQuery` 尚未解析
- 音效名稱不存在、事件既沒有 `component` 也沒有 `sfx`
