# 在使用者擺好的舞台上加動畫（給 AI）

分工：**使用者**用舞台編輯器把場景擺好（背景、道具、主持人站位），存成 `stages/<名稱>.json`。
**AI** 讀這份舞台檔，寫時間軸 JSON（格式見 `docs/timeline.md`、組件見 `docs/components.md`）在上面加動畫。
**不要修改舞台檔**；所有動畫都寫在時間軸裡。

## 1. 先讀舞台檔

```jsonc
{
  "name": "office",
  "bg3d": { "html": "scenes3d/金色頂層辦公室.html", "image": "bg3d/金色頂層辦公室-480x270.png", "x": -20, "y": 11, "scale": 1.5 }, // 3D 場景背景（只是圖片；x / y 偏移、scale 以畫面中心縮放）
  "items": [
    { "name": "金寶箱", "asset": "…/0160.png", "x": 240, "y": 160, "scale": 2, "rotate": 0, "depth": "main" }
  ],
  "lights": [ { "name": "檯燈光", "x": 300, "y": 120 } ],
  "host": { "pose": "full_front", "x": 190, "y": 160 }
}
```

- 座標是世界座標：`(x, y)` 是物件的**底部中心**；地面線 y = 160，預設取景看得到 x 80–400、y 16–196。
- `name` 是 AI 指名物件的方式；主持人固定叫「主持人」。
- `depth`：back = 背景（模糊壓暗）、main = 人物後面、front = 人物前面。
- 3D 背景只是一張圖：**不能**對 3D 裡的東西做動畫。要強調 3D 裡的某處，用光環、標籤、聚光燈等組件疊在那個位置。

時間軸的 scene 寫 `"stage": "<舞台名稱>"` 就會用這個舞台；`host` 省略 = 用舞台存的主持人站位。

## 2. 用 target 指名物件

任何需要 x / y 的組件都可以改寫 `target`，座標自動抓物件位置：

```jsonc
{ "component": "RingPulse", "target": "金寶箱", "start": "@寶藏" }
{ "component": "Tag", "target": "金寶箱", "anchor": "top", "offset": { "y": -2 }, "start": "@寶藏+4", "duration": 60, "props": { "text": "神級裝備" } }
{ "component": "Stamp", "target": "金寶箱", "start": "@不會", "props": { "variant": "x" } }
```

- `anchor`：center（預設，物件中心）/ top（頭頂，放標籤用）/ bottom（底部）。
- `offset`：在定位點上再偏移像素。
- props 裡自己寫了 x / y 時，以 props 為準。
- hud 圖層的組件（GlowText、SkillCard…）會自動換算成畫面座標。

## 3. PropFx：讓舞台上的物件本身動起來

```jsonc
{ "component": "PropFx", "target": "金寶箱", "start": "@寶藏", "duration": 18, "props": { "effect": "bounce", "height": 10 } }
```

| effect | 效果 | 參數（預設） | 預設時長 |
|---|---|---|---|
| shake | 左右抖動 | amount（2） | 20 |
| bounce | 原地跳 | height（6）、times（1） | 18 |
| pulse | 呼吸縮放 | amount（0.08）、period（20） | 60 |
| glow | 發光外框 | color（金） | 45 |
| tint | 染色（red 壞掉 / gray 未解鎖 / gold） | color（red） | 一直保持 |
| hide | 淡出消失 | — | 8，之後保持隱藏 |
| show | scene 開始時隱藏，start 時淡入出現 | — | 8 |
| move | 移動到偏移位置 | dx、dy | 30，之後停在那裡 |

同一個物件可以同時套多個 PropFx（例如 bounce + glow）。`target: "主持人"` 也可以用。

## 4. 寫錯會報錯

target 找不到時，畫面左上角紅框會列出「這個舞台可指名的物件」。PropFx 沒寫 target、effect 拼錯也會報錯。

## 建議

- 動畫對準字幕高亮詞（`"start": "@詞"`），強調用 B 類組件、物件本身用 PropFx。
- 不要把東西放進字幕區（畫面 80% 以下）。
- 使用者擺好的構圖不要大改；需要新道具時用 Sprite 事件另外加，並說明加了什麼。
