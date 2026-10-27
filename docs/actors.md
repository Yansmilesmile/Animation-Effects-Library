# 角色與動作庫（給 AI）

分鏡裡 `fx: ACT` 的事件寫成時間軸的 `Act` 事件：scene 先用 `actors` 宣告角色，再讓角色做「動作關鍵詞」（= `assets/actions/` 的檔名）。

角色每幀依骨架算出各部件的位置和角度，在原生解析度（主持人 27×51）逐像素柵格化，再整數倍放大：肢體轉動時一格一格地動，和素材庫的像素圖一致。

## 1. 宣告角色（scene 層級）

```jsonc
"actors": [
  { "id": "host", "talk": true },                                              // id 寫 host = 取代 scene 的主持人，站在主持人的位置
  { "id": "leijun", "anchor": "木箱（無蓋） 2", "view": "side", "facing": "left", "silhouette": true }   // id 是骨架名 → 用雷軍骨架
]
```

| 參數 | 說明 | 預設 |
|---|---|---|
| `id` | 角色 id，`Act` 的 `actor` 用它；也能當 `target` 指名（`host` 同時是「主持人」） | 必填 |
| `rig` | 用哪一套骨架（`assets/actors/<rig>/`）：`host`（超級人機，27×51）、`leijun`（雷軍，西裝，21×64）、`liang_before` / `liang_after` / `ds_mascot`（DeepSeek 片，見第 8 節） | id 是骨架名就用 id，否則 `host` |
| `anchor` | 站位：舞台物件名稱（取底部中心）或 `{ "x": 200, "y": 160 }`（y = 腳底） | host：主持人站位；其他：(240, 160) |
| `view` | `front` 正面 / `side` 側面 | `front` |
| `facing` | `right` / `left`（水平翻轉；側面圖本身朝右） | `right`（host 沿用舞台的 flipX） |
| `costume` | 換裝，見第 4 節 | — |
| `silhouette` | 剪影（全黑） | false |
| `dim` | 壓暗：true = 0.5，或 0..1 | 0 |
| `scale` | 整數倍 | 1（host 沿用主持人的 scale） |
| `visible` | false = 一開始不出現 | true |
| `talk` | 嘴巴一直開合（說話）；表情動作進行中暫停 | false |
| `tagText` | 吊牌上的字（換裝 `tshirt_white` 的領口吊牌換成一張米色小牌，3×5 像素字，支援數字 ¥ $ % . , - +；寬 = 字數×4+1，「¥300」17×7 格）。正面掛在領口、側面從領口往前伸出；牌子一直垂直（不跟身體傾斜）；「看吊牌」翻過去時不顯示 | — |

## 2. 事件

```jsonc
{ "component": "Act", "start": "@布", "props": { "actor": "host", "action": "攤手" } }
{ "component": "Act", "start": "@做了", "props": { "actor": "leijun", "action": "走路", "to": "木箱（無蓋）" } }
{ "component": "Act", "start": "@每次", "props": { "actor": "host", "action": "遞錢" } }
{ "component": "RingPulse", "start": "@每次+mark:release", "target": "host" }             // 對準金幣離手那一幀
{ "component": "ActorState", "start": "@雷軍", "props": { "actor": "leijun", "silhouette": false } }
```

**Act** props：

| 參數 | 說明 |
|---|---|
| `actor`* | 角色 id |
| `action`* | 動作關鍵詞（下表） |
| `view` / `facing` | 不寫就沿用角色目前的；動作只支援某個視角時會自動轉過去（例如「遞錢」轉成側面），之後維持 |
| `loop` | 覆寫動作檔的預設 |
| `from` / `to` | 位移類動作（走路）：舞台物件名稱或 `{x, y}`。走到 `to` 自動停下、轉待機，之後站在 `to`；朝向自動 |
| `speed` | 走路速度（像素/幀），預設 0.75 |
| `prop` | 道具素材 path，換掉動作檔的第一個道具 |

event 的 `duration`：只對 loop 動作有用（循環多久）；不寫 = 循環到這個角色的下一個動作。

**ActorState** props：`costume`、`silhouette`、`dim`、`scale`、`visible`（出場 / 退場，6 幀淡入淡出）、`view`、`facing`、`talk`、`at`（瞬移到站位）、`tagText`（換吊牌上的字，`""` 清掉）。

規則：
- 新動作從角色**目前的姿勢**接過去（拿著書再掰書，手不會先放下）；新動作沒提到的部位 6 幀內回到立正。
- 動作結束後：`idle` = 6 幀回到待機（呼吸），`hold` = 停在最後一格直到下一個動作。
- 「搖頭」是**疊加**動作（只動頭）：可以疊在抱胸等動作上，不會打斷。
- 待機呼吸（每 2 秒身體下沉 1 像素）和說話嘴型是內建的，不用寫。

## 3. 動作庫（`assets/actions/`，20 個）

| 動作 | 視角 | 長度（幀） | 結束 | 內容 | 道具 / mark |
|---|---|---|---|---|---|
| 走路 | 側 | 16 / 循環 | 走到 to 停 | 四格步伐，身體隨步伐上下 1 像素、手臂擺動 | — |
| 攤手 | 正 | 20 | idle | 雙臂往外攤開、頭左右搖一次 | — |
| 指 | 側 | 10 | hold | 手臂抬到前方、伸出食指、身體前傾 | mark `point`=6 |
| 招手 | 正 | 30 | idle | 右手舉到頭側擺三次，笑臉 | — |
| 介紹 | 正 | 20 | idle | 右手握拳比向自己肩頭，頭微側 | — |
| 抱胸 | 正 / 側 | 12 | hold | 雙臂交叉到胸前，之後只剩呼吸 | — |
| 搖頭 | 正 / 側 | 30 | idle | 頭左右慢擺兩次（疊加，只動頭） | — |
| 愣住 | 正 / 側 | 15 | idle | 身體一頓（上移 1 像素再落回），眨眼兩次 | — |
| 驚嚇 | 正 | 22 | idle | 跳一下、雙手舉到胸前、眼睛變大 | — |
| 思考 | 正 | 70（第 10 幀起循環） | 循環 | 手托下巴，手指輕敲臉頰兩次 | — |
| 抬頭 | 正 / 側 | 10 | hold | 視線往上（側面頭往上抬 15°），手放下 | — |
| 張望 | 側 | 24 | idle | 手搭眉上、身體前傾、頭左右看 | — |
| 看衣服 | 正 | 30 | idle | 低頭看 → 雙手捏衣角往下拉一下 → 抬頭 | — |
| 看吊牌 | 正 | 24 | idle | 低頭，右手到胸前，吊牌掀起翻面（要換裝 `tshirt_white`） | mark `flip`=16 |
| 遞錢 | 側 | 24 | idle | 手往後伸進口袋 → 掏出金幣 → 往前遞 | 金幣（hand_R，8–18），mark `release`=18 |
| 拿書 | 正 | 20 | hold | 伸手 → 拿起書 → 捧在胸前 | 闔上的書（chest，12 起），mark `pick`=12 |
| 掰書 | 正 | 18 | hold | 雙手往外拉，第 10 幀書打開並抖一下 | 書 闔→開，mark `open`=10 |
| 闔書 | 正 | 10 | idle | 書「啪」地合上 → 放下（書留在原地） | 書 開→闔，mark `shut`=3、`put`=7 |
| 放下獎盃 | 側 | 30 | idle | 舉著獎盃 → 彎腰放到地上（獎盃留在地上）→ 直起身擺擺手 | 金獎盃，mark `put`=16 |
| 摔倒 | 側 | 30 | hold | 往前一步 → 踩空 → 整個人往下掉 8 像素、揚起灰塵 | mark `land`=16 |
| 插鑰匙 | 側 | 16 | idle | 拿鑰匙往前伸 → 插進鎖孔、鑰匙離手 → 轉一下手腕（連插三把寫三個事件） | 橙色鑰匙（hand_R，0–8，prop 可換），mark `insert`=8 |
| 備戰 | 側 | 14 | hold | 往後退一步、壓低重心、前傾，雙拳舉在胸前 | — |
| 彈吊牌 | 正 | 22 | idle | 右手伸到身體右側 → 手指往後扣 → 一彈，微笑 | mark `flick`=11 |

## 4. 換裝

`assets/actors/host/costumes.json`：

| costume | 內容 |
|---|---|
| `tshirt_white` | 西裝換成白 T 恤（短袖、去掉翻領和領帶），領口掛吊牌（骨頭 `tag`，「看吊牌」會翻它） |

`assets/actors/user/costumes.json`（用戶的綠色連帽衫換色）：`hoodie_blue`、`hoodie_red`、`hoodie_yellow`、`hoodie_gray`。

## 5. 新增動作（動作檔格式）

`assets/actions/<關鍵詞>.json`，檔名就是時間軸的 `action`。改完跑 `npm run assets`（會檢查骨頭名稱、表情、關鍵幀）。

```jsonc
{
  "name": "攤手",
  "views": ["front"],              // 支援的視角；角色不是這個視角時自動轉成第一個
  "duration": 20,
  "loop": false, "loopFrom": 0,    // loop：重複 [loopFrom, duration)
  "end": "idle",                   // idle | hold
  "layer": ["head"],               // 疊加動作：只控制這些骨頭，加在主動作上
  "breathe": true,                 // false = 這個動作進行中不呼吸（走路、摔倒）
  "keys": [                        // 或 { "front": [...], "side": [...] } 依視角分開寫
    { "f": 0, "pose": {} },
    { "f": 6, "ease": "out", "pose": { "arm_L_upper": 10, "arm_L_lower": 60, "head": { "r": -6, "dx": 0, "dy": 0 } } },
    { "f": 10, "face": "smile", "show": ["finger_R"] }
  ],
  "props": [{ "slot": "hand_R", "asset": "<素材 path>", "from": 8, "to": 18, "swap": [{ "f": 10, "asset": "…" }], "shake": [10, 14], "drop": 16, "dropTo": "ground", "dx": 0, "dy": 0 }],
  "marks": [{ "f": 18, "name": "release" }],
  "fx": [{ "f": 16, "type": "dust" }]
}
```

- `pose` 的值：數字 = 角度（度）；物件 = `{ r, dx, dy }`（dx / dy 是原生像素，在父骨頭的座標系裡）。關鍵幀之間依 `ease`（inout 預設 / in / out / linear / step）補間，一拍二（每 2 幀換一格）。
- 某骨頭某通道在第 0 幀沒寫 = 從動作開始前的姿勢接過來；後面的關鍵幀沒寫 = 維持上一個關鍵幀。
- **角度方向**：手臂（`arm_*`、`hand_*`）正 = 往外抬（正面）/ 往前抬（側面），負 = 往身體內收；其他骨頭正 = 畫面順時針（側面朝右時 `torso` 正 = 前傾、`head` 正 = 低頭）。
- 骨頭：`root`（整個人，繞腳底）、`torso`、`head`、`arm_L_upper`、`arm_L_lower`、`hand_L`、`arm_R_upper`、`arm_R_lower`、`hand_R`、`leg_L`、`foot_L`、`leg_R`、`foot_R`；側面另有 `finger_R`（平常隱藏，用 `show` 顯示）；換裝 `tshirt_white` 有 `tag`。
  正面 L / R = 畫面左 / 右；側面 `arm_R` = 靠鏡頭那隻手，`arm_L` = 後面那隻（較暗）。
- 表情 `face`：`blink`、`smile`、`surprise`、`lookup`、`lookdown`、`normal`。
- 道具 slot：`hand_L`、`hand_R`、`chest`、`head`。`to` 不寫 = 動作 hold 期間一直拿著；`drop` = 那一幀放手，道具留在原地到 scene 結束（`dropTo: "ground"` 落到腳底那條線）。

## 6. 角色檔（`assets/actors/<id>/`）

| 檔案 | 內容 |
|---|---|
| `front.svg`、`side.svg` | 分部位 SVG。host：`public/svgAll/svg_host/svg/full_front_parts.svg`、`full_side_right_parts.svg`；leijun：`public/svgAll/svg_leijun/svg/leijun_full_front_parts.svg`、`leijun_full_side_right_parts.svg` |
| `rig.json` | 骨頭：認領哪些部位的像素（可限範圍）、父子關係、樞紐、圖層順序、道具 slot、表情與嘴型的像素替換 |
| `costumes.json` | 換裝：換色（可限範圍）、加骨頭 |

`npm run assets` 會跑 `scripts/actors.mjs` 產生 `src/generated/actors.json`、`actions.json`；有部位像素沒被骨頭認領、骨頭名稱寫錯都會報錯。

## 7. 雷軍（`leijun`）

- 西裝版，正面 21×64、側面 23×62，比主持人高、手腳比例正常；動作檔共用（角度一樣，手臂比較長）。
- 分鏡要的 8 個動作都驗過：抱胸、搖頭、走路、指、招手、介紹、放下獎盃、摔倒（`timelines/leijun-demo.json`）。其他動作也能跑，但沒逐一調過。
- 剪影 / 壓暗：`silhouette`、`dim`（同 host）。沒有換裝。
- 資料卡頭像：`@engine/assets/generated/leijun_avatar.png`（21×36，同一套 SVG 柵格化），ProfileCard 寫 `avatar` + `avatarScale: 1`。

## 8. DeepSeek 片：梁文鋒 before / after、DeepSeek 吉祥物

使用者畫的像素圖，原生大小直接用（沒有縮），比主持人、雷軍大：寬鏡頭（`cameraInitial` zoom 1）下 after 約佔畫面高 1/3。和主持人同框時差 1.5–1.9 倍，是刻意的，不要用 `scale` 硬拉（scale 只能整數倍）。
SVG 由 `D:/桌面/pixel_deepseek/scripts/make_actors.py` 從原圖產生（`<g id>` 就是骨頭名）；改骨頭切法、重產靜態圖都改那支再跑 `npm run assets`。

| 角色 id | 誰 | 正面 / 側面（像素） | 畫布、root |
|---|---|---|---|
| `liang_before` | 梁文鋒（創業前），西裝、眼鏡 | 27×76 / 23×76 | 45×80，root (22.5, 78) |
| `liang_after` | 梁文鋒（做出 DeepSeek 後），壯碩深藍西裝 | 48×85 / 約 36×85 | 67×88，root (32.5, 87) |
| `ds_mascot` | DeepSeek 吉祥物（藍髮女僕、魚鰭、鯨魚尾巴） | 91×97（含尾巴）/ 約 74×96 | 98×101，root (42.5, 100) |

- 骨頭沿用標準那套，現有動作檔都能跑；逐一看過：走路、招手、介紹、指、抱胸、搖頭、愣住、驚嚇、放下獎盃、摔倒、比二、生氣（`timelines/liang-before-demo.json`、`liang-after-demo.json`、`ds-mascot-demo.json`）。
- 表情：`blink`、`smile`、`surprise`、說話嘴型三階（`talk`）；梁文鋒另有 `lookdown`。剪影 / 壓暗：`silhouette`、`dim`。沒有換裝。
- 原圖的側面都是走路姿勢，產生時已改成站姿（腿併攏、手垂下）、一律朝右。
- 吉祥物原圖沒有待機：正面用「揮手」把舉起的手改成垂下（左右鏡像）；手臂大半藏在頭髮裡，抬手時身後補的是頭髮紋理。吉祥物的「比耶」用 `比二`（單手）。
- 側面手臂往前伸時，後面那隻手（壓暗的複製）會在腰側露出一點，和雷軍一樣。

**靜態姿勢圖**（骨架做不出來的姿勢）：`@engine/assets/generated/<檔名>`。圖的水平中心對齊角色正面 root、底邊是腳底，所以 Sprite 用預設 `anchor: "bottom"`、`x / y` 寫角色的站位，就和角色同位置同大小。切換寫法（demo 第 3 段）：

```jsonc
{ "component": "ActorState", "start": "@詞", "props": { "actor": "liang_after", "visible": false } },
{ "component": "Sprite", "start": "@詞", "duration": 30, "props": { "asset": "@engine/assets/generated/liang_after_victory.png", "x": 240, "y": 190 } },
{ "component": "ActorState", "start": "@詞+30", "props": { "actor": "liang_after", "visible": true } }
```

| 角色 | 檔名 | 姿勢 |
|---|---|---|
| liang_before | `liang_before_wave.png` | 揮手（骨架用「招手」也可以） |
| | `liang_before_walk_wave_1.png`、`_2.png` | 邊走邊揮手兩格（側面朝右，交替播放 = 邊走邊揮） |
| | `liang_before_sit.png` | 坐下 |
| liang_after | `liang_after_stop.png` | 伸手阻止 |
| | `liang_after_arms_crossed.png` | 抱臂（骨架用「抱胸」也可以，原圖比較好看） |
| | `liang_after_run.png` | 奔跑（側面朝右） |
| | `liang_after_victory.png` | 舉拳勝利 |
| ds_mascot | `ds_mascot_wave.png`、`ds_mascot_hello.png` | 揮手、舉手打招呼（原圖） |
| | `ds_mascot_arms_crossed.png` | 抱臂嘟嘴 |
| | `ds_mascot_shy.png` | 雙手合握害羞 |
| | `ds_mascot_cheer.png` | 歡呼比耶眨眼（雙手） |
