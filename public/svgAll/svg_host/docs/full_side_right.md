# full_side_right

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_side_right.png`
- 尺寸：28 × 51 px（1 單位 = 1 原始像素）
- 調色盤：20 色；不透明像素：905
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 424 | 0, 0, 28, 27 | 13.4, 10.8 |
| 臉部 | `face` | 108 | 9, 16, 15, 11 | 16.4, 21.9 |
| 五官細節 | `face_detail` | 48 | 9, 16, 15, 11 | 16.5, 20.1 |
| 白襯衫 | `shirt` | 9 | 13, 27, 5, 3 | 15.5, 28.2 |
| 領帶 | `tie` | 14 | 17, 29, 3, 10 | 18.8, 33.7 |
| 西裝外套 | `jacket` | 130 | 8, 27, 9, 17 | 12.6, 35.2 |
| 左袖 | `sleeve_left` | 35 | 5, 27, 3, 16 | 6.8, 35.5 |
| 右袖 | `sleeve_right` | 37 | 17, 27, 4, 17 | 18.6, 37.2 |
| 左手 | `hand_left` | 15 | 8, 40, 5, 4 | 10.6, 42.1 |
| 左腿 | `leg_left` | 12 | 8, 44, 6, 2 | 11.0, 45.0 |
| 右腿 | `leg_right` | 10 | 14, 44, 5, 2 | 16.5, 45.0 |
| 左鞋 | `shoe_left` | 30 | 8, 46, 6, 5 | 11.0, 48.5 |
| 右鞋 | `shoe_right` | 33 | 14, 46, 7, 5 | 17.3, 48.5 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_side_right.svg` | 像素忠實 SVG，`viewBox="0 0 28 51"`，內容含 `<desc>` 部位說明 |
| `svg/full_side_right_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_side_right_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_side_right_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_side_right.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_side_right_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_side_right/<部位id>.svg` | `0 0 28 51`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_side_right/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_side_right.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
