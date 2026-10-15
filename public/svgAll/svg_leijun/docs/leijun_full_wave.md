# leijun_full_wave

- 動作／用途：舉手揮手打招呼、微笑
- 來源檔：`leijun_full_wave.png`
- 尺寸：33 × 64 px（1 單位 = 1 原始像素）
- 調色盤：24 色；不透明像素：1203
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 177 | 0, 0, 31, 28 | 16.8, 10.2 |
| 臉部 | `face` | 258 | 10, 7, 19, 21 | 19.6, 17.3 |
| 五官細節 | `face_detail` | 117 | 10, 7, 19, 21 | 19.1, 16.6 |
| 白襯衫 | `shirt` | 6 | 17, 28, 14, 12 | 24.2, 34.5 |
| 領帶 | `tie` | 22 | 18, 28, 7, 9 | 19.7, 32.6 |
| 西裝外套 | `jacket` | 363 | 8, 28, 18, 27 | 18.6, 41.3 |
| 左袖 | `sleeve_left` | 20 | 2, 28, 6, 5 | 5.8, 30.0 |
| 右袖 | `sleeve_right` | 88 | 26, 28, 7, 20 | 29.0, 36.2 |
| 左手 | `hand_left` | 38 | 1, 18, 6, 8 | 3.8, 21.8 |
| 右手 | `hand_right` | 18 | 23, 31, 9, 13 | 29.4, 41.2 |
| 左腿 | `leg_left` | 9 | 14, 55, 3, 3 | 15.5, 56.5 |
| 右腿 | `leg_right` | 25 | 17, 55, 9, 3 | 21.2, 56.5 |
| 左鞋 | `shoe_left` | 21 | 13, 58, 4, 6 | 15.2, 61.2 |
| 右鞋 | `shoe_right` | 41 | 17, 58, 8, 6 | 20.7, 60.6 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/leijun_full_wave.svg` | 像素忠實 SVG，`viewBox="0 0 33 64"`，內容含 `<desc>` 部位說明 |
| `svg/leijun_full_wave_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/leijun_full_wave_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/leijun_full_wave_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/leijun_full_wave.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/leijun_full_wave_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/leijun_full_wave/<部位id>.svg` | `0 0 33 64`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/leijun_full_wave/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/leijun_full_wave.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
