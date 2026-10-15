# full_wave_talk

- 動作／用途：（未提供，可用 --names 補充）
- 來源檔：`full_wave_talk.png`
- 尺寸：31 × 51 px（1 單位 = 1 原始像素）
- 調色盤：19 色；不透明像素：1039
- 體型判定：全身（含腿）
- 驗證：PASS（乾淨 SVG 色彩誤差 0、圖層重疊 0、漏切 0）

## 部位清單

| 部位 | id | 像素數 | bbox (x, y, w, h) | 重心 (x, y) |
| --- | --- | --- | --- | --- |
| 頭髮 | `hair` | 417 | 0, 0, 30, 28 | 14.0, 10.7 |
| 臉部 | `face` | 127 | 6, 16, 18, 12 | 15.4, 22.1 |
| 五官細節 | `face_detail` | 61 | 6, 16, 18, 12 | 14.1, 20.9 |
| 脖子 | `neck` | 20 | 12, 28, 18, 3 | 25.1, 29.6 |
| 白襯衫 | `shirt` | 12 | 11, 28, 8, 7 | 15.3, 30.4 |
| 領帶 | `tie` | 20 | 15, 29, 3, 10 | 16.6, 33.9 |
| 西裝外套 | `jacket` | 193 | 8, 28, 17, 16 | 15.9, 36.4 |
| 左袖 | `sleeve_left` | 52 | 3, 28, 5, 14 | 5.9, 34.1 |
| 右袖 | `sleeve_right` | 9 | 25, 29, 6, 6 | 26.9, 32.4 |
| 左手 | `hand_left` | 18 | 11, 31, 5, 5 | 13.7, 33.1 |
| 右手 | `hand_right` | 9 | 24, 26, 5, 6 | 26.9, 28.7 |
| 左腿 | `leg_left` | 16 | 8, 44, 8, 2 | 12.0, 45.0 |
| 右腿 | `leg_right` | 10 | 16, 44, 5, 2 | 18.5, 45.0 |
| 左鞋 | `shoe_left` | 43 | 7, 46, 9, 5 | 11.5, 48.4 |
| 右鞋 | `shoe_right` | 32 | 16, 46, 7, 5 | 19.2, 48.5 |

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `svg/full_wave_talk.svg` | 像素忠實 SVG，`viewBox="0 0 31 51"`，內容含 `<desc>` 部位說明 |
| `svg/full_wave_talk_parts.svg` | 分部位圖層，`<g id="部位id" data-name-zh="中文名">` |
| `annotated/full_wave_talk_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/full_wave_talk_zones.png` | 分區色塊圖（附圖例） |
| `parts_json/full_wave_talk.json` | 機器可讀資料：bbox、像素數、重心、用色 |
| `sheet/full_wave_talk_parts_sheet.png` | 這張圖的部位拆解總表 |

## 單一部位 SVG（`--per-part-files`）

每個部位各出兩個版本，內容完全相同、只有座標系不同：

| 版本 | 路徑 | viewBox | 用途 |
| --- | --- | --- | --- |
| 原位版 | `parts/full_wave_talk/<部位id>.svg` | `0 0 31 51`（全圖座標） | 疊回整張圖、做逐部位顯示／隱藏；各檔座標一致，疊起來就是原圖 |
| 裁切版 | `parts_cropped/full_wave_talk/<部位id>.svg` | `0 0 w h`（該部位自身大小、原點在左上角） | 直接當獨立素材：放進按鈕、頭像、UI、貼圖，不需要再裁 |

兩版都保留原始像素方格（`shape-rendering="crispEdges"`），
`width`/`height` 只是顯示倍率。要換回原圖座標：裁切版座標 + 該部位 bbox 的 `(x, y)`；
bbox 就在下面的部位清單表（`x, y, w, h`）、`parts_json/full_wave_talk.json`，
也寫在裁切版 SVG 的 `<desc>`（「viewBox 已縮到部位範圍 (x,y,w,h)」）。

匯入 Figma／Illustrator／Inkscape：直接開這批 SVG 檔即可，
`<title>`／`<desc>` 會顯示部位名稱與原圖尺寸；要調整顏色就改 `fill`。

## 這張圖的判讀備註

- 五官（眼白／瞳孔／睫毛／嘴）合併為單一圖層 `face_detail`；與頭髮相連的深色瀏海已排除、歸回頭髮。

## 座標與命名約定

- 原點在左上角 `(0,0)`，x 向右、y 向下；bbox 以「像素左上角」為基準，
  所以 `x + w` 與 `y + h` 會等於範圍外的那一格。
- 左／右以**畫面視角**為準；正面角色的「畫面左」＝角色右側。
