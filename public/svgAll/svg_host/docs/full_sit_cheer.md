# full_sit_cheer

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_sit_cheer.png`
- 尺寸：33 × 50 px（1 單位 = 1 原始像素）
- 調色盤：19 色；不透明像素：1110
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 394 | 3, 0, 28, 28 | 17.1, 10.0 |
| 臉部 | `face` | 155 | 6, 16, 20, 12 | 16.4, 21.3 |
| 五官細節 | `face_detail` | 49 | 6, 16, 20, 12 | 15.9, 21.3 |
| 脖子 | `neck` | 13 | 9, 28, 22, 3 | 27.2, 29.5 |
| 白襯衫 | `shirt` | 16 | 13, 28, 8, 7 | 16.8, 31.0 |
| 領帶 | `tie` | 21 | 15, 29, 4, 10 | 17.0, 33.5 |
| 西裝外套 | `jacket` | 303 | 6, 28, 20, 18 | 15.8, 37.6 |
| 左袖 | `sleeve_left` | 36 | 0, 34, 6, 12 | 3.6, 42.1 |
| 右袖 | `sleeve_right` | 50 | 26, 28, 7, 18 | 29.0, 39.3 |
| 左手 | `hand_left` | 8 | 4, 39, 5, 3 | 6.2, 40.6 |
| 右手 | `hand_right` | 5 | 28, 31, 3, 2 | 29.3, 31.9 |
| 左腿 | `leg_left` | 12 | 1, 46, 12, 1 | 7.0, 46.5 |
| 右腿 | `leg_right` | 12 | 20, 46, 12, 1 | 26.0, 46.5 |
| 左鞋 | `shoe_left` | 18 | 2, 47, 9, 3 | 5.7, 48.2 |
| 右鞋 | `shoe_right` | 18 | 23, 47, 8, 3 | 27.6, 48.3 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_sit_cheer.svg` | 像素忠實 SVG，`viewBox="0 0 33 50"`，內容含 `<desc>` 部位說明 |
| `svg/full_sit_cheer_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_sit_cheer_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_sit_cheer_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_sit_cheer.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_sit_cheer_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_sit_cheer/<部位id>.svg` | `0 0 33 50`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_sit_cheer/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_sit_cheer.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
