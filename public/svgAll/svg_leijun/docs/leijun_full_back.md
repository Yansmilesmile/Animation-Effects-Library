# leijun_full_back

- 動作／用途：全身背面
- 來源檔：`leijun_full_back.png`
- 尺寸：22 × 62 px（1 單位 = 1 原始像素）
- 調色盤：8 色；不透明像素：1076
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 427 | 0, 0, 22, 24 | 11.0, 11.7 |
| 臉部 | `face` | 20 | 1, 14, 20, 10 | 11.0, 20.4 |
| 西裝外套 | `jacket` | 384 | 4, 24, 13, 30 | 10.6, 39.1 |
| 左袖 | `sleeve_left` | 57 | 0, 26, 4, 19 | 2.3, 35.8 |
| 右袖 | `sleeve_right` | 81 | 17, 26, 5, 25 | 19.0, 36.5 |
| 左手 | `hand_left` | 2 | 2, 42, 2, 2 | 3.0, 43.0 |
| 右手 | `hand_right` | 3 | 18, 42, 2, 2 | 18.8, 42.8 |
| 左腿 | `leg_left` | 12 | 5, 54, 6, 2 | 8.0, 55.0 |
| 右腿 | `leg_right` | 12 | 11, 54, 6, 2 | 14.0, 55.0 |
| 左鞋 | `shoe_left` | 39 | 4, 56, 7, 6 | 7.7, 59.1 |
| 右鞋 | `shoe_right` | 39 | 11, 56, 7, 6 | 14.3, 59.1 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/leijun_full_back.svg` | 像素忠實 SVG，`viewBox="0 0 22 62"`，內容含 `<desc>` 部位說明 |
| `svg/leijun_full_back_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/leijun_full_back_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/leijun_full_back_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/leijun_full_back.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/leijun_full_back_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/leijun_full_back/<部位id>.svg` | `0 0 22 62`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/leijun_full_back/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/leijun_full_back.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
