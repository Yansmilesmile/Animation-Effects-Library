# full_front_right

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_front_right.png`
- 尺寸：28 × 51 px（1 單位 = 1 原始像素）
- 調色盤：20 色；不透明像素：1022
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 431 | 0, 0, 28, 29 | 13.7, 11.0 |
| 臉部 | `face` | 125 | 6, 17, 18, 12 | 15.3, 22.1 |
| 五官細節 | `face_detail` | 61 | 6, 17, 18, 12 | 15.0, 22.8 |
| 白襯衫 | `shirt` | 11 | 11, 29, 8, 5 | 15.1, 31.6 |
| 領帶 | `tie` | 18 | 14, 30, 3, 9 | 15.9, 34.1 |
| 西裝外套 | `jacket` | 157 | 6, 29, 13, 15 | 12.2, 36.8 |
| 左袖 | `sleeve_left` | 41 | 2, 29, 4, 15 | 4.2, 35.8 |
| 右袖 | `sleeve_right` | 61 | 19, 29, 5, 15 | 21.2, 36.3 |
| 左手 | `hand_left` | 14 | 4, 40, 5, 3 | 6.6, 41.4 |
| 右手 | `hand_right` | 3 | 21, 41, 2, 2 | 21.8, 41.8 |
| 左腿 | `leg_left` | 14 | 7, 44, 7, 2 | 10.5, 45.0 |
| 右腿 | `leg_right` | 14 | 14, 44, 7, 2 | 17.5, 45.0 |
| 左鞋 | `shoe_left` | 34 | 7, 46, 7, 5 | 10.6, 48.4 |
| 右鞋 | `shoe_right` | 38 | 14, 46, 8, 5 | 18.0, 48.5 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_front_right.svg` | 像素忠實 SVG，`viewBox="0 0 28 51"`，內容含 `<desc>` 部位說明 |
| `svg/full_front_right_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_front_right_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_front_right_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_front_right.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_front_right_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_front_right/<部位id>.svg` | `0 0 28 51`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_front_right/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_front_right.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
