# svgList_describe — svg_host 的 SVG 清單與識別指南

> 這份文件是寫給「要讀這個資料夾的 AI／程式」看的說明書：
> 先告訴你這裡有哪些 SVG、每一個 SVG 是什麼，再教你怎麼從檔案內容判斷
> 手上的 SVG 屬於哪一種、怎麼把它還原成像素圖或拿去當素材。

---

## 0. 30 秒理解這個資料夾

1. 這裡有 **27 個像素角色**，每個角色同一份圖被輸出成多種 SVG／PNG 形式，全部是**像素忠實向量**（不是描邊、不是重新繪製）。
2. 核心規則：SVG 的 `viewBox` **就是原圖的像素座標**（`0 0 W H`，1 單位 = 1 個原始像素）；`width`/`height` 只是顯示倍率（預設 8 倍），可以直接改。
3. 圖形由**一堆 1×1 等級的矩形**組成（`<path>` 的 `d` 是多個矩形子路徑），所以放大不模糊、不會有格線縫隙（`shape-rendering="crispEdges"`）。
4. 每個角色都被切成 **8～15 個身體部位圖層**，部位用固定 id 命名（`hair`、`face`、`jacket`…），中文名寫在 `data-name-zh`。
5. 除了「整張圖」的 SVG，還有**每個部位一張 SVG**，分成兩種座標系：**原位版**（`parts/`，可疊回原圖）與**裁切版**（`parts_cropped/`，可直接當素材）。
6. 左／右一律**以畫面視角為準**（正面角色的「畫面左」＝角色右側）。

---

## 1. 這個資料夾有什麼（檔案類型 × 數量）

以 27 張圖計算（`<名>` = 例如 `full_front`）：

| 路徑樣式 | 數量 | 內容 | AI 什麼時候讀它 |
| --- | --- | --- | --- |
| `svg/<名>.svg` | 27 | **像素忠實 SVG（乾淨版）**：依顏色分組的矩形路徑，`<desc>` 列出所有部位 | 要「原圖的向量版」時 |
| `svg/<名>_parts.svg` | 27 | **分部位圖層版**：`<g id="部位id" data-name-zh="中文名">` | 要匯入 Figma／Illustrator／Inkscape 當圖層、做逐部位顯示隱藏 |
| `annotated/<名>_annotated.svg` | 27 | 部位標註圖（引線＋中文標籤） | 要在圖上指出哪一區是什麼 |
| `annotated/<名>_annotated.png` | 27 | 同上，點陣版 | 直接看的預覽 |
| `zones/<名>_zones.png` | 27 | **分區色塊圖**：一色一部位＋圖例（顏色只是代表色） | 快速檢查切分是否合理 |
| `parts/<名>/<部位id>.svg` | 325 | **單一部位．原位版**（viewBox = 全圖座標） | 疊圖還原、逐部位比對位置 |
| `parts_cropped/<名>/<部位id>.svg` | 325 | **單一部位．裁切版**（viewBox = `0 0 w h`） | 當獨立素材：按鈕、頭像、UI、貼圖 |
| `parts_json/<名>.json` | 27 | 機器可讀：尺寸、分帶、每個部位的 bbox／像素數／重心／用色 | 接骨骼、碰撞框、自動化流程 |
| `docs/<名>.md` | 27 | 單張圖的說明文件（部位清單表＋檔案清單） | 要單張細節的文字說明 |
| `sheet/<名>_parts_sheet.png` | 27 | 該張圖的部位拆解總表（含像素數） | 一次看該角色所有部位 |
| `sheet/<名>_zones.png` | 27 | `zones/<名>_zones.png` 的複製（放同一處方便對照） | 同上 |
| `contact_sheet.png` | 1 | 全部 27 張的縮圖總表 | 一眼掃過所有圖 |
| `contact_sheet_zones.png` | 1 | 全部 27 張的分區色塊總表 | 一眼檢查全批切分 |
| `contact_sheet_annotated.png` | 1 | 全部 27 張的標註總表 | 一眼檢查標註 |
| `summary.json` | 1 | 全批統計與驗證結果 | 程式化索引（首選入口） |
| `index.html` | 1 | 瀏覽用索引，四欄對照（原圖／SVG／標註／分區） | 人要看時最快 |
| `README.md` | 1 | 批次說明文件 | 人／AI 的總說明 |
| `svgList_describe.md` | 1 | 本文件 | 你要做的事是「理解這批 SVG」時 |

合計：**SVG 檔 731 個**（54 + 27 + 325 + 325）、**PNG 檔 111 個**、JSON 28 個、Markdown 29 個。

---

## 2. SVG 清單（27 張圖，逐張）

讀法：`部位（像素數，由多到少）`。像素數 = 該部位在原圖佔幾個不透明像素。
「部位數」= 這張圖真的有的部位數量；沒有的部位不會出現（例如 `bust_`／`half_` 系列沒有 `leg_*`／`shoe_*`）。
像素數的完整資料（含每個部位的 bbox 與用色）在 `parts_json/<名>.json`。

| SVG 名稱 | 尺寸 (px) | 不透明像素 | 調色盤色數 | 部位數 | 部位（id：像素數） |
| --- | --- | --- | --- | --- | --- |
| `bust_back` | 31×52 | 1291 | 17 | 10 | hair(608)、jacket(345)、sleeve_right(113)、sleeve_left(86)、face(77)、face_detail(35)、shirt(13)、tie(11)、hand_left(2)、neck(1) |
| `bust_back_left` | 31×52 | 1275 | 17 | 8 | hair(604)、jacket(348)、sleeve_right(111)、face(72)、sleeve_left(68)、face_detail(51)、shirt(14)、tie(7) |
| `bust_back_right` | 33×52 | 1348 | 18 | 10 | hair(634)、jacket(388)、sleeve_right(103)、sleeve_left(81)、face(66)、face_detail(40)、shirt(23)、tie(10)、hand_right(2)、hand_left(1) |
| `bust_front` | 31×51 | 1281 | 20 | 8 | hair(495)、face(209)、jacket(174)、face_detail(140)、sleeve_right(98)、sleeve_left(84)、tie(51)、shirt(30) |
| `bust_front_right` | 32×51 | 1290 | 20 | 9 | hair(552)、face(192)、jacket(187)、sleeve_right(96)、sleeve_left(89)、face_detail(88)、tie(46)、shirt(39)、hand_right(1) |
| `bust_side_right` | 32×51 | 1114 | 19 | 8 | hair(568)、jacket(199)、face(163)、face_detail(63)、sleeve_right(43)、sleeve_left(42)、shirt(20)、tie(16) |
| `full_back` | 28×51 | 946 | 19 | 13 | hair(472)、jacket(196)、face(56)、sleeve_right(49)、shoe_left(39)、face_detail(32)、sleeve_left(30)、shoe_right(29)、hand_left(13)、leg_left(12)、leg_right(12)、hand_right(5)、shirt(1) |
| `full_back_left` | 28×51 | 972 | 18 | 13 | hair(469)、jacket(206)、face(54)、sleeve_right(46)、shoe_left(43)、sleeve_left(41)、face_detail(40)、shoe_right(33)、leg_left(12)、leg_right(12)、hand_left(11)、hand_right(3)、shirt(2) |
| `full_back_right` | 28×51 | 1023 | 17 | 12 | hair(476)、jacket(239)、sleeve_right(59)、shoe_right(47)、sleeve_left(44)、face(43)、face_detail(37)、shoe_left(34)、leg_right(14)、leg_left(12)、hand_right(11)、hand_left(7) |
| `full_crouch_cry` | 28×51 | 1079 | 20 | 15 | hair(329)、jacket(173)、face(159)、face_detail(124)、sleeve_right(73)、shoe_right(44)、sleeve_left(38)、hand_left(33)、shoe_left(33)、leg_right(21)、hand_right(13)、tie(13)、leg_left(13)、shirt(12)、neck(1) |
| `full_front` | 27×51 | 1045 | 19 | 14 | hair(400)、jacket(189)、face(132)、face_detail(64)、sleeve_right(56)、sleeve_left(43)、shoe_left(38)、shoe_right(34)、shirt(27)、tie(22)、leg_left(14)、leg_right(12)、hand_left(7)、hand_right(7) |
| `full_front_right` | 28×51 | 1022 | 20 | 14 | hair(431)、jacket(157)、face(125)、face_detail(61)、sleeve_right(61)、sleeve_left(41)、shoe_right(38)、shoe_left(34)、tie(18)、hand_left(14)、leg_left(14)、leg_right(14)、shirt(11)、hand_right(3) |
| `full_laugh_clasp` | 28×51 | 1014 | 20 | 15 | hair(331)、face(159)、jacket(149)、face_detail(125)、sleeve_right(67)、shoe_right(44)、shoe_left(33)、sleeve_left(28)、hand_left(22)、leg_right(18)、hand_right(13)、leg_left(10)、tie(6)、neck(6)、shirt(3) |
| `full_mic_hold` | 28×51 | 1001 | 20 | 14 | hair(409)、jacket(152)、face(124)、face_detail(67)、sleeve_right(49)、shoe_left(37)、shoe_right(34)、sleeve_left(32)、hand_left(24)、tie(21)、hand_right(16)、leg_left(14)、leg_right(12)、shirt(10) |
| `full_mic_sing` | 28×51 | 1006 | 19 | 15 | hair(364)、face(154)、jacket(152)、face_detail(83)、sleeve_right(51)、shoe_left(37)、shoe_right(34)、sleeve_left(32)、tie(22)、hand_left(21)、hand_right(16)、leg_left(14)、leg_right(14)、shirt(10)、neck(2) |
| `full_mic_talk` | 28×51 | 1004 | 20 | 15 | hair(413)、jacket(174)、face(120)、face_detail(68)、shoe_right(39)、sleeve_left(38)、sleeve_right(35)、shoe_left(34)、hand_right(31)、leg_right(14)、leg_left(12)、neck(9)、shirt(6)、tie(6)、hand_left(5) |
| `full_nervous_teary` | 28×51 | 1019 | 20 | 15 | hair(404)、jacket(169)、face(117)、face_detail(71)、sleeve_right(55)、sleeve_left(45)、shoe_left(44)、shoe_right(33)、tie(20)、hand_left(16)、leg_left(16)、shirt(12)、leg_right(12)、hand_right(4)、neck(1) |
| `full_phone_smile` | 28×51 | 995 | 20 | 14 | hair(309)、jacket(171)、face(140)、face_detail(114)、sleeve_right(46)、shoe_left(44)、sleeve_left(41)、shoe_right(39)、hand_left(24)、hand_right(22)、tie(14)、leg_left(14)、leg_right(12)、shirt(5) |
| `full_side_right` | 28×51 | 905 | 20 | 13 | hair(424)、jacket(130)、face(108)、face_detail(48)、sleeve_right(37)、sleeve_left(35)、shoe_right(33)、shoe_left(30)、hand_left(15)、tie(14)、leg_left(12)、leg_right(10)、shirt(9) |
| `full_sit_cheer` | 33×50 | 1110 | 19 | 15 | hair(394)、jacket(303)、face(155)、sleeve_right(50)、face_detail(49)、sleeve_left(36)、tie(21)、shoe_left(18)、shoe_right(18)、shirt(16)、neck(13)、leg_left(12)、leg_right(12)、hand_left(8)、hand_right(5) |
| `full_wave_talk` | 31×51 | 1039 | 19 | 15 | hair(417)、jacket(193)、face(127)、face_detail(61)、sleeve_left(52)、shoe_left(43)、shoe_right(32)、neck(20)、tie(20)、hand_left(18)、leg_left(16)、shirt(12)、leg_right(10)、hand_right(9)、sleeve_right(9) |
| `half_coffee_document` | 26×32 | 559 | 19 | 10 | hair(188)、jacket(100)、face(83)、face_detail(67)、shirt(54)、sleeve_left(20)、hand_left(18)、tie(10)、hand_right(10)、sleeve_right(9) |
| `half_desk_sleep` | 34×26 | 625 | 18 | 10 | hair(271)、neck(86)、face(80)、face_detail(74)、hand_left(30)、hand_right(29)、jacket(23)、shirt(14)、sleeve_right(10)、sleeve_left(8) |
| `half_laptop` | 34×40 | 971 | 19 | 11 | hair(352)、jacket(219)、face(116)、hand_right(66)、sleeve_left(56)、face_detail(52)、sleeve_right(47)、hand_left(26)、shirt(19)、tie(16)、neck(2) |
| `half_panic` | 29×30 | 626 | 20 | 8 | hair(302)、face(110)、jacket(74)、face_detail(49)、sleeve_right(38)、sleeve_left(27)、tie(15)、shirt(11) |
| `half_phone_call_alt` | 27×40 | 815 | 19 | 10 | hair(279)、jacket(179)、face_detail(134)、face(120)、sleeve_right(53)、sleeve_left(19)、tie(13)、shirt(10)、hand_right(7)、neck(1) |
| `half_present_coffee` | 33×32 | 775 | 20 | 11 | hair(395)、jacket(119)、face(84)、face_detail(57)、sleeve_right(41)、sleeve_left(25)、shirt(18)、hand_right(16)、tie(10)、neck(8)、hand_left(2) |

每張圖可用的檔案組合（`<名>` 換成上表名稱）：

```
svg/<名>.svg              svg/<名>_parts.svg
annotated/<名>_annotated.svg / .png     zones/<名>_zones.png
parts_json/<名>.json      docs/<名>.md      sheet/<名>_parts_sheet.png      sheet/<名>_zones.png
parts/<名>/<部位id>.svg        parts_cropped/<名>/<部位id>.svg
```

---

## 3. 部位 id 字典（全批通用）

`出現張數` 是這批 27 張圖中有幾張含該部位；`總像素` 是全批加總，可以用來判斷哪個部位「通常是主體」。

| id | 中文 | English | 分區代表色 | 出現張數 | 總像素 | 說明 |
| --- | --- | --- | --- | --- | --- | --- |
| `hair` | 頭髮 | hair | `#8c5fd4` | 27 | 11290 | 含瀏海；與頭髮相連的深色像素仍算頭髮 |
| `face` | 臉部 | face | `#fdd9a8` | 27 | 3145 | 頭部膚色外框內的膚色像素 |
| `face_detail` | 五官細節 | face detail | `#22d3ee` | 27 | 1894 | 眼、眉、鼻、嘴合併一層（未細分） |
| `jacket` | 西裝外套 | jacket body | `#9aa3ad` | 27 | 5108 | 軀幹主體；道具常被併進這裡 |
| `sleeve_left` | 左袖 | left sleeve | `#6f7c8f` | 27 | 1181 | 畫面左側袖子 |
| `sleeve_right` | 右袖 | right sleeve | `#55637a` | 27 | 1505 | 畫面右側袖子 |
| `shirt` | 白襯衫 | shirt | `#f2f2f0` | 26 | 401 | 只在 `tie` 出現的圖上明顯 |
| `tie` | 領帶 | tie | `#4a5580` | 23 | 402 | |
| `hand_left` | 左手 | left hand | `#f2c39b` | 21 | 317 | |
| `hand_right` | 右手 | right hand | `#dba97f` | 21 | 289 | |
| `leg_left` | 左腿 | left leg | `#3f3f46` | 15 | 197 | 只有 `full_` 系列有；非站姿為近似值 |
| `leg_right` | 右腿 | right leg | `#5a5a63` | 15 | 199 | 同上 |
| `shoe_left` | 左鞋 | left shoe | `#1f1f24` | 15 | 541 | 同上 |
| `shoe_right` | 右鞋 | right shoe | `#2e2e35` | 15 | 531 | 同上 |
| `neck` | 脖子 | neck | `#d9a06b` | 12 | 150 | 脖子被遮住時不會出現 |

只有在加 `--face-parts` 重跑時才會出現（**本批沒有**，故清單中查不到）：
`eye_left` 左眼 `#2b6cb0`、`eye_right` 右眼 `#2c9c9c`、`nose` 鼻子 `#e07a5f`、
`mouth` 嘴巴 `#c94f7c`、`cheek_left` 左臉頰 `#ff9db2`、`cheek_right` 右臉頰 `#e75480`。

---

## 4. SVG 識別教程

### 4.1 先問三個問題（30 秒分類）

1. **它在哪個資料夾？**（`svg/`、`annotated/`、`parts/`、`parts_cropped/`…）→ 決定它的角色。
2. **`<desc>` 裡寫了什麼？** → 最可靠的判別依據；關鍵字「原位版」「裁切版」「部位:」直接告訴你種類。
3. **`viewBox` 多大、和 `width`/`height` 什麼關係？** → 判斷它是全圖還是單一部位、顯示倍率幾倍。

### 4.2 六種 SVG 的辨識特徵（附真實片段）

**(1) 乾淨版 `svg/<名>.svg` — 整張圖、依顏色分組**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 51" width="224" height="408"
     shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">
  <title>full_back</title>
  <desc>full_back ｜ 28×51 px ｜ 部位: 頭髮(hair)、臉部(face)、… ｜ 左/右以畫面視角為準，1 單位 = 1 原始像素</desc>
  <path fill="#23241e" d="M14 2H15V9H14ZM11 3H14V8H11Z…"/>
```

特徵：**沒有** `id`；每個 `<path>` 是「同一句話顏色」的全部矩形；`<desc>` 用「部位: …」列出部位。
`width = viewBox 寬 × 8`（預設顯示倍率）。

**(2) 分部位圖層版 `svg/<名>_parts.svg` — 依身體部位分組**

```xml
  <g id="hair" data-name-zh="頭髮" data-name-en="hair">
    <path fill="#23241e" d="…"/>
  </g>
```

特徵：有 `<g id="…" data-name-zh="…" data-name-en="…">`；圖層順序 = 疊圖順序（後面蓋前面）。
要判斷「這張圖有哪些部位」最快的方法就是抓所有 `data-name-zh`。

**(3) 單一部位．原位版 `parts/<名>/<部位id>.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 51" width="224" height="408" …>
  <title>右手 / right hand</title>
  <desc>右手(hand_right)｜原位版：viewBox 為全圖 28x51，與其他部位對齊可還原原圖｜左/右以畫面視角為準｜1 單位 = 1 原始像素</desc>
```

關鍵字：`原位版：viewBox 為全圖 WxH`；`viewBox` 與該角色其他部位檔完全相同 → 全部疊起來即原圖。

**(4) 單一部位．裁切版 `parts_cropped/<名>/<部位id>.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 4" width="40" height="32" …>
  <title>右手 / right hand</title>
  <desc>右手(hand_right)｜裁切版：viewBox 已縮到部位範圍 (16,38,5,4)｜左/右以畫面視角為準｜1 單位 = 1 原始像素</desc>
  <path fill="#fdddb0" d="M0 0H5V4H0Z"/>
```

關鍵字：`裁切版：viewBox 已縮到部位範圍 (x,y,w,h)`；`viewBox` 原點在該部位左上角，
寬高 = 該部位的像素寬高。`(x,y,w,h)` 同時收錄在 `parts_json` 與 `docs/<名>.md`。

**(5) 標註圖 `annotated/<名>_annotated.svg`／`.png`**
特徵：**畫布比原圖大得多**（例如 `full_front_annotated.svg` 的 `viewBox` 是 `0 0 542 402`，原圖只有 27×51），
角色縮放後置中，四周是黑色引線 + `<text>` 中文標籤，頂端有標題
`27 × 51 px 身體部位標註` 與副標 `左／右以畫面視角為準（正面角色：畫面左＝角色右側）`。
注意：**標註圖的 viewBox 不是像素網格**，不要拿它做像素運算；它裡面也**沒有** `data-name-zh`／`id` 圖層。
用途：人眼確認「哪一區被算成哪個部位」。

**(6) 分區色塊圖 `zones/<名>_zones.png` 與 `sheet/<名>_zones.png`**
特徵：用第 3 節的**代表色**填滿每個部位（例如頭髮一律紫色 `#8c5fd4`），下方附圖例；
顏色**不是**原圖顏色，只是「一色一部位」。它是點陣圖（以 `--scale 6` 放大後繪製），不是 SVG。
用途：一眼檢查切分對不對。

### 4.3 原位版 vs 裁切版：怎麼分辨、怎麼換算

| 問題 | 原位版 `parts/` | 裁切版 `parts_cropped/` |
| --- | --- | --- |
| `viewBox` | `0 0 W H`（全圖，和原圖一樣） | `0 0 w h`（只有該部位大小） |
| `<desc>` 關鍵字 | 「原位版：viewBox 為全圖 WxH」 | 「裁切版：viewBox 已縮到部位範圍 (x,y,w,h)」 |
| 檔案內容 | 完全相同的圖形；只有座標系平移過 | 完全相同的圖形；只有座標系平移過 |
| 什麼時候用 | 疊圖還原原圖、逐部位顯示／隱藏、比對位置 | 直接當素材（按鈕、頭像、UI、貼圖），開檔就貼齊邊界 |

換算公式：

```
裁切版座標 + 該部位 bbox 的 (x, y) = 原位版座標
原位版座標 - 該部位 bbox 的 (x, y) = 裁切版座標
```

例：`parts_cropped/full_mic_hold/hand_right.svg` 的 `(x,y)=(16,38)`，`viewBox="0 0 5 4"`；
要把它的內容放回原圖，整塊平移 `+16, +38`，落在 `(16,38)-(21,42)`。

### 4.4 程式化識別速查（正則表）

| 想確認什麼 | 正則／關鍵字 | 命中代表 |
| --- | --- | --- |
| 這是哪一類 | `原位版：viewBox 為全圖` | 單一部位．原位版 |
| 這是哪一類 | `裁切版：viewBox 已縮到部位範圍` | 單一部位．裁切版 |
| 這是哪一類 | `data-name-zh="` | 分部位圖層版（`svg/<名>_parts.svg`） |
| 這是哪一類 | `部位:` （在 `<desc>`） | 乾淨版（整張圖、依顏色分組） |
| 座標系尺寸 | `viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"` | 第 1 組 = 寬、第 2 組 = 高（單位：原始像素） |
| 顯示倍率 | `width="(\d+)" height="(\d+)"` | 與 viewBox 相除即倍率（本批 = 8） |
| 具名圖層 | `<g id="([a-z_]+)"[^>]*data-name-zh="([^"]+)"` | 第 1 組 = 部位 id、第 2 組 = 中文名（同一行還有 `data-name-en`） |
| 部位 bbox | `裁切版：viewBox 已縮到部位範圍 \((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)` | x, y, w, h（原圖像素座標） |
| 圖名／部位名 | `<title>([^<]+)</title>` | 例如 `右手 / right hand` |
| 用色 | `fill="#([0-9a-fA-F]{6})"` | 該矩形在**原圖**的顏色 |
| 像素方格 | `shape-rendering="crispEdges"` | 放大不模糊、不產生縫隙 |
| 標註圖 | 出現 `<text …>中文</text>` 且 `viewBox` 遠大於該角色尺寸 | `annotated/<名>_annotated.svg` |

判斷虛擬碼：

```python
def classify(text: str) -> str:
    if "原位版：viewBox 為全圖" in text:      return "single-part-original"   # parts/
    if "裁切版：viewBox 已縮到部位範圍" in text: return "single-part-cropped"    # parts_cropped/
    if 'data-name-zh="' in text:               return "parts-svg"               # 全圖·具名圖層
    if "部位:" in text:                        return "clean-svg"               # 全圖·依顏色分組
    return "annotated-svg"                                                      # 標註圖
```

### 4.5 檔名規則解碼

**前綴 = 體型（決定有沒有腿）**

| 前綴 | 張數 | 意義 |
| --- | --- | --- |
| `bust_` | 6 | 半身胸像，**不含腿部**（`leg_*`／`shoe_*` 不會出現） |
| `full_` | 15 | 全身，含腿與鞋 |
| `half_` | 6 | 半身／桌面場景，**不含腿部**，道具（筆電、咖啡、文件、桌面）會被併進鄰近身體部位 |

**中間 = 視角方位**（描述「相機相對角色」的方向；`left`／`right` 單獨出現時指偏向該側）：
無後綴＝正面或背面正視、`_front_right` 偏右前、`_side_right` 右側面、`_back_left`／`_back_right` 偏左／右後背。

**結尾 = 動作或情境詞**（`mic_hold`、`mic_sing`、`mic_talk`、`phone_smile`、`wave_talk`、`sit_cheer`、`crouch_cry`、`laugh_clasp`、`nervous_teary`、`desk_sleep`、`coffee_document`、`present_coffee`、`laptop`、`panic`…）：
**這些詞只是來源檔名，不是自動判讀結果**，只當線索用，不要當作 SVG 內容的保證。

**檔名後綴 = 檔案種類**

| 後綴 | 意義 |
| --- | --- |
| `_parts.svg` | 同一張圖的具名圖層版 |
| `_annotated.svg` / `_annotated.png` | 部位標註圖 |
| `_zones.png` | 分區色塊圖（代表色＋圖例） |
| `_parts_sheet.png` | 該張圖的部位拆解總表 |
| 無後綴 | 乾淨版（整張圖） |

**部位檔名 = 部位 id**（見第 3 節），例如 `parts/full_front/hair.svg`。
注意：檔名裡的 `left`／`right` 是**畫面視角**，不是角色的左右手；正面圖的「畫面左」＝角色右側。

### 4.6 怎麼從 SVG 反推像素圖（技術細節）

- 每個 `<path>` 的 `d` 是由多個**軸對齊矩形**串起來的，格式為 `M x1 y1 H x2 V y2 H x1 Z`：
  起點 `(x1,y1)` → 水平到 `x2` → 垂直到 `y2` → 回到 `x1` → 閉合。也就是矩形 `(x1,y1)`–`(x2,y2)`。
- 因為 `viewBox` 就是像素網格、`shape-rendering="crispEdges"`，**把座標四捨五入到整數再填色，
  就能 1:1 還原原圖**（工具的 `verify` 就是做這件事：反解析回點陣圖與原圖逐像素比對）。
- 想換顏色：直接改 `fill`；想改顯示大小：改 `width`/`height` 或交給 CSS，`viewBox` 不要動。
- 想在其他程式裡定位部位：優先用 `parts_json/<名>.json` 的 `bbox_px`（`[x, y, w, h]`，原點左上、y 向下）。

### 4.7 驗證欄位怎麼讀（判斷這批資料可不可信）

`summary.json` 的每一筆都有：

```json
"verify": { "pixels": 1045, "clean_bad": 0, "clean_extra": 0,
            "parts_bad": 0, "overlap": 0, "missing": 0, "ok": true }
```

| 欄位 | 意義 |
| --- | --- |
| `pixels` | 原圖不透明像素數（基準） |
| `clean_bad` / `clean_extra` | 乾淨版 SVG 反解析後「顏色錯的像素」／「多的像素」 |
| `parts_bad` | 分部位版反解析後顏色錯的像素 |
| `overlap` / `missing` | 部位圖層互相重疊的像素數／沒被任何部位覆蓋的像素數 |
| `ok` | 上述全部為 0 才是 `true`（= 文件中的 PASS） |

本批 27 張全部 `ok: true`。

### 4.8 已知限制（重要，不要過度解讀）

1. **道具沒有獨立部位**：麥克風、手機、筆電、咖啡杯、桌面、白板等會被歸進最接近的身體部位
   （通常是 `jacket`／`sleeve_*`／`face`／`hand_*`）。具體例子：`full_mic_hold`、`full_mic_sing`、
   `full_mic_talk`、`full_phone_smile`、`half_laptop`、`half_coffee_document`、`half_desk_sleep`、
   `half_present_coffee`、`full_sit_cheer`（椅子）、`half_phone_call_alt`（手機）、`half_panic`（白板）。
2. **非站立姿勢的分帶是近似值**：坐、趴、躺、蹲（`full_sit_cheer`、`half_desk_sleep`、`full_crouch_cry`）
   的頭／身／腿分界由剪影推估，`leg_*`／`shoe_*` 位置可能與直覺不同。
3. **五官只有一層** `face_detail`：眼／鼻／嘴／臉頰沒有細分；28 px 寬的角色五官只有約 2×2 px，
   自動細分本來就不保證準確（需要 `--face-parts`，本批未使用）。
4. **`bust_`／`half_` 不含腿**：不要預期這兩類會找到 `leg_*`／`shoe_*`。
5. **顏色語意**：SVG 裡的 `fill` 是原圖真實顏色；`zones_*.png` 的顏色是**代表色**，兩者不可互推。
6. **`left`／`right` 是畫面視角**：正面角色的「畫面左」＝角色右側。
7. **`docs/<名>.md` 的「動作／用途」欄位目前是空的**（未提供 `--names` 對照表），顯示「（未提供…）」。

---

## 5. 「我要做什麼 → 讀哪個檔」對照表

| 你的目的 | 該讀的檔 |
| --- | --- |
| 原圖的向量版（整張、可直接顯示） | `svg/<名>.svg` |
| 匯入設計工具變成圖層、逐部位顯示隱藏 | `svg/<名>_parts.svg` |
| 疊圖還原整張圖、比對部位位置 | `parts/<名>/<部位id>.svg`（原位版） |
| 要單一部位當素材（開檔即貼齊邊界） | `parts_cropped/<名>/<部位id>.svg`（裁切版） |
| 接骨骼、碰撞框、自動化 | `parts_json/<名>.json`（`bbox_px`／`center_px`／`colors`） |
| 一次看某角色所有部位 | `sheet/<名>_parts_sheet.png` |
| 檢查切分合理性 | `sheet/<名>_zones.png`、`contact_sheet_zones.png` |
| 在圖上指出部位對應 | `annotated/<名>_annotated.png`、`contact_sheet_annotated.png` |
| 掃過全部 27 張 | `contact_sheet.png` |
| 程式化索引全批 | `summary.json` |
| 瀏覽器對照四種呈現 | `index.html` |
| 人讀的總說明 | `README.md`；單張細節 `docs/<名>.md` |
| 理解「這批 SVG 到底是什麼」 | 本文件 `svgList_describe.md` |

---

## 6. JSON 欄位速查

`summary.json`（陣列，27 筆）

| 欄位 | 內容 |
| --- | --- |
| `name` | 圖名（不含副檔名） |
| `size` | `[寬, 高]`（px） |
| `palette` | 調色盤色數 |
| `pixels` | 不透明像素數 |
| `parts` | `{部位id: 像素數}` |
| `verify` | 見 4.7 |
| `action` | 動作名稱，未提供時為 `null` |
| `source` | 來源檔名，如 `full_front.png` |
| `per_part` | 是否有單一部位檔（本批 `true`） |
| `files` | 該張圖所有輸出檔的相對路徑 |

`parts_json/<名>.json`

| 欄位 | 內容 |
| --- | --- |
| `source` / `size_px` / `palette_size` / `opaque_pixels` | 基本資料 |
| `coordinate_system` / `left_right_convention` | 座標與左右慣例的文字說明 |
| `bands_px` | 分帶（頭／身／腿等在 y 軸上的範圍） |
| `parts[]` | 每部位：`id`、`name_zh`、`name_en`、`bbox_px`、`center_px`、`pixel_count`、`zone_color`、`colors`（該部位用色與像素數） |

---

## 7. 資料一致性注意

- `parts/` 與 `parts_cropped/` 目錄目前各多出 **9 個未被索引的部位檔**（共 18 個），
  它們不在 `parts_json`／`docs`／總表內，是本批更早一次轉檔留下的殘檔，現行工具的切分不會產生它們：

  ```
  parts/bust_front/{neck,hand_left,hand_right}.svg
  parts/bust_front_right/{neck,hand_left}.svg
  parts/bust_side_right/neck.svg
  parts/full_front_right/neck.svg
  parts/full_mic_hold/neck.svg
  parts/half_coffee_document/neck.svg
  （parts_cropped/ 下同名各一）
  ```

  判讀原則：**以 `parts_json` 為準**；若要「該圖有哪些部位」，讀 `parts_json` 或 `svg/<名>_parts.svg` 的 `g id`，
  不要用 `parts/` 目錄的檔案清單推斷。
- 本文件提到的數量為 2026-10-13 當時狀態；之後若新增／重跑圖片，請以 `summary.json` 重新核對。

---

## 8. 重新產生（同一支工具）

單張：

```
python "C:\Users\颜笑笑\Documents\Codex\tools\pixel-svg-parts\pixel_to_svg.py" "D:\桌面\me\output\pixel\full_front.png" --out "<輸出資料夾>" --per-part-files
```

整批：

```
python "C:\Users\颜笑笑\Documents\Codex\tools\pixel-svg-parts\pixel_to_svg.py" "D:\桌面\me\output\pixel" --out "D:\桌面\asset\svgAll\svg_host" --per-part-files --scale 6 --cols 6
```

要加上動作名稱：`--names names.json`，內容為 `{"full_front": "動作描述"}`，
會寫進標註圖標題、`docs/<名>.md` 與 `index.html`。
