# half_desk_sleep

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`half_desk_sleep.png`
- 尺寸：34 × 26 px（1 單位 = 1 原始像素）
- 調色盤：18 色；不透明像素：625
- 體型判定：半身（不含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 271 | 2, 0, 30, 20 | 16.4, 9.9 |
| 臉部 | `face` | 80 | 8, 9, 15, 11 | 16.8, 15.8 |
| 五官細節 | `face_detail` | 74 | 8, 9, 15, 11 | 13.8, 13.0 |
| 脖子 | `neck` | 86 | 0, 20, 34, 3 | 17.4, 21.7 |
| 白襯衫 | `shirt` | 14 | 8, 20, 14, 1 | 15.0, 20.5 |
| 西裝外套 | `jacket` | 23 | 6, 20, 21, 5 | 16.4, 24.1 |
| 左袖 | `sleeve_left` | 8 | 0, 24, 6, 2 | 2.8, 24.8 |
| 右袖 | `sleeve_right` | 10 | 27, 24, 7, 2 | 30.8, 24.8 |
| 左手 | `hand_left` | 30 | 0, 14, 17, 10 | 6.5, 21.4 |
| 右手 | `hand_right` | 29 | 17, 17, 17, 7 | 28.0, 21.6 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/half_desk_sleep.svg` | 像素忠實 SVG，`viewBox="0 0 34 26"`，內容含 `<desc>` 部位說明 |
| `svg/half_desk_sleep_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/half_desk_sleep_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/half_desk_sleep_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/half_desk_sleep.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/half_desk_sleep_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/half_desk_sleep/<部位id>.svg` | `0 0 34 26`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/half_desk_sleep/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/half_desk_sleep.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 判定為半身圖（檔名前綴 bust_/half_），因此不含腿部與鞋子；下半部的像素歸入外套／袖子。
- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
