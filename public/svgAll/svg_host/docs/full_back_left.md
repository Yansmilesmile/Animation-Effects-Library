# full_back_left

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_back_left.png`
- 尺寸：28 × 51 px（1 單位 = 1 原始像素）
- 調色盤：18 色；不透明像素：972
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 469 | 0, 0, 28, 26 | 14.8, 11.6 |
| 臉部 | `face` | 54 | 3, 16, 10, 10 | 7.2, 21.4 |
| 五官細節 | `face_detail` | 40 | 3, 16, 10, 10 | 9.2, 19.8 |
| 白襯衫 | `shirt` | 2 | 10, 26, 8, 1 | 14.0, 26.5 |
| 西裝外套 | `jacket` | 206 | 8, 26, 12, 18 | 14.2, 34.9 |
| 左袖 | `sleeve_left` | 41 | 4, 28, 4, 15 | 6.3, 35.4 |
| 右袖 | `sleeve_right` | 46 | 20, 27, 4, 16 | 21.7, 35.1 |
| 左手 | `hand_left` | 11 | 6, 40, 5, 3 | 8.4, 41.3 |
| 右手 | `hand_right` | 3 | 14, 24, 8, 18 | 18.8, 35.5 |
| 左腿 | `leg_left` | 12 | 8, 44, 6, 2 | 11.0, 45.0 |
| 右腿 | `leg_right` | 12 | 14, 44, 6, 2 | 17.0, 45.0 |
| 左鞋 | `shoe_left` | 43 | 5, 46, 9, 5 | 9.7, 48.5 |
| 右鞋 | `shoe_right` | 33 | 14, 46, 7, 5 | 17.5, 48.4 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_back_left.svg` | 像素忠實 SVG，`viewBox="0 0 28 51"`，內容含 `<desc>` 部位說明 |
| `svg/full_back_left_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_back_left_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_back_left_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_back_left.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_back_left_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_back_left/<部位id>.svg` | `0 0 28 51`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_back_left/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_back_left.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
