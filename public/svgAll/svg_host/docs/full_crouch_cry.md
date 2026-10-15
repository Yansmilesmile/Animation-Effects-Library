# full_crouch_cry

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_crouch_cry.png`
- 尺寸：28 × 51 px（1 單位 = 1 原始像素）
- 調色盤：20 色；不透明像素：1079
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 329 | 0, 0, 28, 28 | 14.4, 9.2 |
| 臉部 | `face` | 159 | 4, 12, 20, 16 | 13.4, 20.9 |
| 五官細節 | `face_detail` | 124 | 4, 12, 20, 16 | 14.4, 17.1 |
| 脖子 | `neck` | 1 | 19, 28, 1, 1 | 19.5, 28.5 |
| 白襯衫 | `shirt` | 12 | 10, 28, 7, 6 | 13.6, 30.5 |
| 領帶 | `tie` | 13 | 12, 29, 3, 7 | 13.3, 32.1 |
| 西裝外套 | `jacket` | 173 | 8, 28, 14, 16 | 15.6, 36.6 |
| 左袖 | `sleeve_left` | 38 | 4, 28, 4, 16 | 6.4, 36.2 |
| 右袖 | `sleeve_right` | 73 | 22, 28, 5, 16 | 24.3, 36.2 |
| 左手 | `hand_left` | 33 | 4, 27, 10, 13 | 9.0, 36.6 |
| 右手 | `hand_right` | 13 | 14, 26, 10, 13 | 18.6, 31.6 |
| 左腿 | `leg_left` | 13 | 7, 44, 7, 2 | 10.7, 45.0 |
| 右腿 | `leg_right` | 21 | 14, 44, 11, 2 | 19.3, 45.0 |
| 左鞋 | `shoe_left` | 33 | 7, 46, 7, 5 | 10.7, 48.5 |
| 右鞋 | `shoe_right` | 44 | 14, 46, 9, 5 | 18.6, 48.5 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_crouch_cry.svg` | 像素忠實 SVG，`viewBox="0 0 28 51"`，內容含 `<desc>` 部位說明 |
| `svg/full_crouch_cry_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_crouch_cry_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_crouch_cry_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_crouch_cry.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_crouch_cry_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_crouch_cry/<部位id>.svg` | `0 0 28 51`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_crouch_cry/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_crouch_cry.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
