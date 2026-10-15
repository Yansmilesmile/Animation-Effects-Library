# 像素圖 → SVG 批次結果（說明文件）

這份文件是整批轉檔的入口。每一張圖另有自己的說明：`docs/<檔名>.md`。

- 來源資料夾：`D:\桌面\me\output\pixel`
- 張數：27
- 轉檔工具：`C:\Users\颜笑笑\Documents\Codex\tools\pixel-svg-parts\pixel_to_svg.py`（說明：同目錄 `README.md` 或 `SKILL.md`）

## 檔案結構

| 路徑 | 內容 |
| --- | --- |
| `svg/<檔名>.svg` | 像素忠實 SVG。`viewBox` 就是原圖像素座標，`width`/`height` 只是顯示倍率；`<desc>` 內含部位說明 |
| `svg/<檔名>_parts.svg` | 同一張圖拆成具名圖層，`<g id="部位id" data-name-zh="中文名">`，可直接匯入 Figma／Illustrator／Inkscape |
| `annotated/<檔名>_annotated.svg` / `.png` | 部位標註圖（引線＋中文標籤） |
| `zones/<檔名>_zones.png` | 分區色塊圖（一色一部位，附圖例） |
| `parts_json/<檔名>.json` | 機器可讀：尺寸、分帶、每個部位的 bbox／像素數／重心／用色 |
| `docs/<檔名>.md` | 單張圖的說明文件 |
| `sheet/<檔名>_parts_sheet.png` | 該張圖的部位拆解總表（含像素數） |
| `parts/<檔名>/<部位id>.svg` | **單一部位．原位版**：viewBox 沿用全圖座標，各部位疊起來可還原原圖 |
| `parts_cropped/<檔名>/<部位id>.svg` | **單一部位．裁切版**：viewBox 為 `0 0 w h`（原點在部位左上角，原圖位置記在 `<desc>` 與 JSON），可直接當獨立素材用 |
| `contact_sheet.png` / `contact_sheet_zones.png` / `contact_sheet_annotated.png` | 全部圖的縮圖總表 |
| `summary.json` | 全部圖的統計與驗證結果（機器可讀索引） |
| `index.html` | 瀏覽用索引，四欄對照（原圖／SVG／標註／分區） |

## 圖片清單

| 檔案 | 動作 | 尺寸 | 部位數 | 驗證 | 說明文件 |
| --- | --- | --- | --- | --- | --- |
| `svg/bust_back.svg` | — | 31×52 | 10 | PASS | [docs/bust_back.md](docs/bust_back.md) |
| `svg/bust_back_left.svg` | — | 31×52 | 8 | PASS | [docs/bust_back_left.md](docs/bust_back_left.md) |
| `svg/bust_back_right.svg` | — | 33×52 | 10 | PASS | [docs/bust_back_right.md](docs/bust_back_right.md) |
| `svg/bust_front.svg` | — | 31×51 | 8 | PASS | [docs/bust_front.md](docs/bust_front.md) |
| `svg/bust_front_right.svg` | — | 32×51 | 9 | PASS | [docs/bust_front_right.md](docs/bust_front_right.md) |
| `svg/bust_side_right.svg` | — | 32×51 | 8 | PASS | [docs/bust_side_right.md](docs/bust_side_right.md) |
| `svg/full_back.svg` | — | 28×51 | 13 | PASS | [docs/full_back.md](docs/full_back.md) |
| `svg/full_back_left.svg` | — | 28×51 | 13 | PASS | [docs/full_back_left.md](docs/full_back_left.md) |
| `svg/full_back_right.svg` | — | 28×51 | 12 | PASS | [docs/full_back_right.md](docs/full_back_right.md) |
| `svg/full_crouch_cry.svg` | — | 28×51 | 15 | PASS | [docs/full_crouch_cry.md](docs/full_crouch_cry.md) |
| `svg/full_front.svg` | — | 27×51 | 14 | PASS | [docs/full_front.md](docs/full_front.md) |
| `svg/full_front_right.svg` | — | 28×51 | 14 | PASS | [docs/full_front_right.md](docs/full_front_right.md) |
| `svg/full_laugh_clasp.svg` | — | 28×51 | 15 | PASS | [docs/full_laugh_clasp.md](docs/full_laugh_clasp.md) |
| `svg/full_mic_hold.svg` | — | 28×51 | 14 | PASS | [docs/full_mic_hold.md](docs/full_mic_hold.md) |
| `svg/full_mic_sing.svg` | — | 28×51 | 15 | PASS | [docs/full_mic_sing.md](docs/full_mic_sing.md) |
| `svg/full_mic_talk.svg` | — | 28×51 | 15 | PASS | [docs/full_mic_talk.md](docs/full_mic_talk.md) |
| `svg/full_nervous_teary.svg` | — | 28×51 | 15 | PASS | [docs/full_nervous_teary.md](docs/full_nervous_teary.md) |
| `svg/full_phone_smile.svg` | — | 28×51 | 14 | PASS | [docs/full_phone_smile.md](docs/full_phone_smile.md) |
| `svg/full_side_right.svg` | — | 28×51 | 13 | PASS | [docs/full_side_right.md](docs/full_side_right.md) |
| `svg/full_sit_cheer.svg` | — | 33×50 | 15 | PASS | [docs/full_sit_cheer.md](docs/full_sit_cheer.md) |
| `svg/full_wave_talk.svg` | — | 31×51 | 15 | PASS | [docs/full_wave_talk.md](docs/full_wave_talk.md) |
| `svg/half_coffee_document.svg` | — | 26×32 | 10 | PASS | [docs/half_coffee_document.md](docs/half_coffee_document.md) |
| `svg/half_desk_sleep.svg` | — | 34×26 | 10 | PASS | [docs/half_desk_sleep.md](docs/half_desk_sleep.md) |
| `svg/half_laptop.svg` | — | 34×40 | 11 | PASS | [docs/half_laptop.md](docs/half_laptop.md) |
| `svg/half_panic.svg` | — | 29×30 | 8 | PASS | [docs/half_panic.md](docs/half_panic.md) |
| `svg/half_phone_call_alt.svg` | — | 27×40 | 10 | PASS | [docs/half_phone_call_alt.md](docs/half_phone_call_alt.md) |
| `svg/half_present_coffee.svg` | — | 33×32 | 11 | PASS | [docs/half_present_coffee.md](docs/half_present_coffee.md) |

## 部位對照表

| 中文 | id | English | 分區代表色 |
| --- | --- | --- | --- |
| 頭髮 | `hair` | hair | `#8c5fd4` |
| 臉部 | `face` | face | `#fdd9a8` |
| 五官細節 | `face_detail` | face detail | `#22d3ee` |
| 左眼 | `eye_left` | left eye | `#2b6cb0` |
| 右眼 | `eye_right` | right eye | `#2c9c9c` |
| 鼻子 | `nose` | nose | `#e07a5f` |
| 嘴巴 | `mouth` | mouth | `#c94f7c` |
| 左臉頰 | `cheek_left` | left cheek | `#ff9db2` |
| 右臉頰 | `cheek_right` | right cheek | `#e75480` |
| 脖子 | `neck` | neck | `#d9a06b` |
| 白襯衫 | `shirt` | shirt | `#f2f2f0` |
| 領帶 | `tie` | tie | `#4a5580` |
| 西裝外套 | `jacket` | jacket body | `#9aa3ad` |
| 左袖 | `sleeve_left` | left sleeve | `#6f7c8f` |
| 右袖 | `sleeve_right` | right sleeve | `#55637a` |
| 左手 | `hand_left` | left hand | `#f2c39b` |
| 右手 | `hand_right` | right hand | `#dba97f` |
| 左腿 | `leg_left` | left leg | `#3f3f46` |
| 右腿 | `leg_right` | right leg | `#5a5a63` |
| 左鞋 | `shoe_left` | left shoe | `#1f1f24` |
| 右鞋 | `shoe_right` | right shoe | `#2e2e35` |

該張圖沒有的部位不會出現。左／右一律以**畫面視角**為準（正面角色：畫面左＝角色右側）。

## 驗證方式（可信度依據）

每一張都會把產出的 SVG 反解析回點陣圖，與原圖逐像素比對：色彩誤差 0、
部位圖層 0 重疊 0 遺漏。`summary.json` 的 `verify` 欄位就是原始數據。

## 已知限制（重要）

- **道具沒有獨立部位**：麥克風、手機、筆電、咖啡杯、桌面、白板等，會被歸進
  最接近的身體部位（通常變成外套／袖子／臉部）。
- **非站立姿勢的分帶是近似值**：坐姿、趴姿、躺姿的頭/身/腿分界由剪影推估。
- **五官細節**為單一圖層；眼／鼻／嘴／臉頰的細分需要 `--face-parts`，
  且這套畫風在 28 px 寬時五官僅 2×2 px，自動判讀不保證準確。
- 半身圖（`bust_`／`half_` 開頭）不含腿部；若檔名不符請用 `--body` 指定。

## 重新產生

```
python "C:\Users\颜笑笑\Documents\Codex\tools\pixel-svg-parts\pixel_to_svg.py" "<來源資料夾>" --out "<這個資料夾>" --scale 6 --cols 6
```

要加上動作名稱：`--names names.json`，內容為 `{"檔名(不含副檔名)": "動作描述"}`，
會寫進標註圖標題、`docs/<檔名>.md` 與 `index.html`。
