# 組件清單（給分鏡 AI）

`層`：world = 跟鏡頭走（世界座標，地面線 y=160）；hud = 固定在畫面（480×270）。`*` = 必填。時長：預設顯示到 scene 結束，可用 event 的 `duration` 截斷。

| 組件 | 詞典 | 層 | 用途 | 主要 props | 自身節奏 |
|---|---|---|---|---|---|
| Sprite | 素材 | world | 顯示素材 / 動畫條 / Seamless Loop 資料夾（見文末） | asset*(檔案或資料夾), x, y, anchor(bottom/center/top-left), scale(整數), flipX, tint(red/gray/gold/#hex), glow, animFps, play: loop / once, frameIndex | 照素材清單的速度，沒列的 10fps |
| Host | 主持人 | world | 額外的主持人（scene.host 之外） | pose*, x, y, flipX, tint, talk | — |
| Ambience | G | world | 氛圍層 | layers*: dust / snow / lamp{x,y} / stars / beam{x} / confetti / zzz{x,y} | 持續 |
| RingPulse | B1 | world | 光環脈衝，對準高亮詞 | x*, y*, radius(34), color | 15 幀 |
| Tag | B2/B13/B11 | world | 標籤彈出 | text*, x*, y*(標籤底部), variant: red / dark / hang / locked, appear: pop / instant | 3 幀回彈 |
| Stamp | B6/B3 | world | 蓋章 / ✕ + 畫面泛紅 | x*, y*, variant: stamp / x, text, size(2), holdTint, tone: red / gold（stamp 的顏色） | 3 幀拍下，泛紅 12 幀 |
| SunBurst | B5 | world | 放射光（放在目標之前） | x*, y*, radius(90) | 8 幀展開後旋轉 |
| GlowText | B7 | hud | 發光像素大字、倍數 | text*, x(240), y(108), color: gold / red, size(4), crown, appear: flicker / pop | 6 幀閃亮 |
| BeamDrop | B12+B4 | world | 核心物件從天而降 | asset*, x(240), groundY(160), scale(2), landAt(26), darken | 約 32 幀 |
| MissPop | B10 | world | MISS + 頭上飄字 + 汗 | x*, y*, floatText, floatX, floatY | 30–40 幀 |
| LevelTitleCard | C8 | hud | 關卡標題卡 | level*(數字或字串), title*, hold(60) | hold + 3 幀 |
| LevelTransition | A21 | hud | 圓形遮罩進關 | type*: iris, mode: close / open / both, duration(14), hold(6), x, y(圓心) | close/open 各 14 幀 |
| Counter | D1/C41/C20/C62 | world | 計數器 / 翻牌機 | x*, y*, from, to, countDuration(30), tickEvery, labels[{at,text}], zeroAt, reviveAt, variant: flip / plain, prefix, comma | 依參數 |
| CrowdGrid | A1/A18/A2 | hud | 群像網格（自帶鏡頭，蓋滿畫面） | mode: pull-out / push-in / zoom-out, cols, rows, hero{col,row}, start, duration(45), flashAt, label, labelAt | 依參數 |
| Spotlight | A13 | world | 聚光燈收窄 | x*, y*, to(38), duration(45) | 45 幀 |
| ChestDeal | C24 | world | 寶箱掉落 → 開蓋 → 發牌 | x(240), cards(3), pace(1.5), takeAt[] | pace 1.5 時約 80 幀 |
| SkillCard | C25/C11/C59 | hud | 技能卡飛入、翻面、示範、收納 | index*, title*, desc, demo: years / daily / future，或 demoAsset（示範框中央播一段素材動畫：資料夾 / 動畫條，翻面完成那一幀開始播）＋ demoScale(1)、demoFps、demoPlay(once), fromChest{index,of}, flipAt(14), collectAt | 依參數 |
| SkillSummary | C59 | hud | 已習得 N/N | cards*: [{title, desc, demo}] | 12 幀 |
| GamePopup | C29/C30/B9 | hud | 片尾行動呼籲 | variant*: follow{clickAt,exitAt} / input{question*,answer,title} / achievement{name*,exitAt} / ending{text,exitAt} | follow 約 56 幀 |
| NextTeaser | C32 | hud | ??? 下集預告框 | x(418), y(58), label | 持續 |
| QuestionBubble | B14 | world | 頭頂白底「?」泡泡，可帶一句反問 | x*, y*(泡泡尾巴尖，放頭頂上方), text("?"), question, size(2), ink | 3 幀回彈後輕浮動 |
| DropStack | C1 | world | 物件一個個掉下、彈跳、揚塵、堆高；count 1 = 單一道具帶彈跳落下 | x*, y*(第一個落地的底部), asset 或 icon: coin / key, tone: gold / red / silver, count(5), every(6), fall(70), fallFrames(9), step, jitter, layout: stack / row, scale, dust | 每個 9 幀落地 + 4 幀彈跳 |
| PropSwap | C2 | world | 道具替換：舊的瞬間消失、新的出現 + 一小團灰；也可只冒灰、或把道具縮小壓暗放到一邊 | x*, y*(底部), from, to, at(0), scale, toScale, dust, dustMode: dust / smoke, shrinkTo{x,y,scale,dim}, shrinkFrames(10) | 灰塵 14 幀 |
| SmokePop | C38 | world | 人物在煙霧中登場 + 頭上名牌，之後頭頂彈小標籤；多人寫多個事件錯開。**骨架角色**：寫 `actor`（角色 id，先宣告 `visible:false`）→ 第 4 幀出場並站到 (x, y)；`hide: [id…]` → 同一團煙裡退場 | x*, y*(腳底), asset / actor / hide（至少一個）, h(沒有 asset 時的人物高度，寫 actor 自動帶入), scale, flipX, label, tag, tagAt(14), tagVariant, smoke | 第 4 幀現身，煙 20 幀 |
| KeyDrop | C43 | world | 金鑰匙閃現 → 弧線飛到落點 → 光環 + 地面光圈常亮；可冒標籤、變成象徵物 | x*, y*(落點地面), fromX, fromY, flyFrames(12), asset, scale, hover(6), ring, ringColor, label, labelAt, labelVariant, morphTo, morphAt | 第 16 幀落地 |
| ProfileCard | C36 | hud | 人物資料卡：頭像 + 名字 + 紅頭銜 + 金標籤 + 大數字，滑入後欄位依序彈出；放射光用 SunBurst 另加 | name*, title, badge, stat, avatar, avatarScale(2), avatarDx, avatarDy, avatarBox(40), layout: row / column, from: left / right / bottom / none, x(240), y(60)(卡片頂邊中點), w | 滑入 8 幀，欄位每 4 幀 |
| QuestionCard | B5 卡片 | hud | 金框問題卡（金框＋四角紅寶石）：標題 + 中央圖示，從泡泡位置撐開、兩側掛小物件、縮到角落 | x(240), y(110)(卡片中心), title, asset, assetScale(2), text, typeAt(省略 = 整句出現；寫了 = 從這一幀逐字打出), typeEvery(2 幀一字), w(150), h(100), from{x,y}, openFrames(9), hangers[{asset*, side: left / right, at, scale, dy}], shrinkAt, shrinkTo{x(430),y(34),scale(0.35)}, shrinkFrames(12) | 撐開 9 幀 |
| PriceTower | D2 | world | 價格塔 / 分段柱：金底 + N 層紅樓，從地面升起；紅段合一 ↔ 裂成 N 層（屋簷 + 門面素材）；單段高亮、紅光、裂縫、逐層崩塌。寫 `id` 後各部分可當 target | x*, y*(塔底中心), floors*[{label, asset, scale, height}], base{height(14), label}, width(36), floorHeight(18), gap(4), rise(true), riseFrames(16), splitAt, mergeAt, splitFrames(8), highlight[{at, part: base / red / top / 層號 / label, frames(45)}], redGlow[{at, level 0..1, frames}], crackAt(數字或陣列), collapse[{at, floor}], dust | 升起 16 幀、裂開 8 幀、崩塌 8 幀 |
| BigTag | B13 大 / D4 | world | 巨大吊牌：紅繩從上方垂下、衰減擺動；大字或素材；內建 D4 數字翻牌（tone gold = 金字發光） | x*, y*(繩孔＝吊牌頂端中心), text 或 asset, textSize(3), tone: plain（米白底黑字，預設）/ red / gold, w(96), h(120), ropeTop(y-120), dropFrames(10), swing(5°), flips[{at, text, tone, glow}], swings[{at, amount}] | 落下 10 幀，翻牌 6 幀 |
| CoinFlight | C39 | world | 一把金幣（或素材）從起點一個個沿弧線飛向多個目標，依 share 分流，到達閃一下 | x*, y*(起點), to*[{x, y, share} 或 {target, anchor, offset, share}], count(12), every(1.5), flyFrames(14), arc(30), spread(4), asset, scale, tone: gold / red / silver, trail(true), seed | 每個 14 幀 |
| BookUnfold | NEW-1 | world | 書從中間裂成兩半往左右推開，拉出橫向時間軸，刻度從左到右依次亮（金）並標年份；和 ACT「掰書」同步：start 寫 `"@詞+mark:open"`、target 角色 + anchor bottom + offset y -15（胸前） | x*, y*(書的中心), from(2010), to(2020), step(1), labelEvery(5；首尾一定標), labels[每格文字，"" = 不標；寫了就不用 from/to], width(220), openFrames(10), tickEvery(3), pageH(22), cover | 推開 10 幀，之後每 3 幀亮一格 |
| BossBar | F5/NEW-2 | hud | 左上 BOSS 血條（名牌「BOSS・名稱」＋ N 格血條＋N/N）；名牌碎裂、改寫，扣血 | name*, prefix("BOSS・"), max(3), hp(=max), breakAt[幀…]（名稱碎成像素往下掉，之後名牌空白、紅框閃）, renames[{at, text}]（逐字打出新名稱，打完血條逐格填滿）, hits[{at, hp}]（不寫 hp = 扣 1 格：那格閃白掉落、整條抖）, exitAt（往左滑出）, x(8), y(34), w(150) | 滑入 8 幀；碎裂 14 幀；打字每字 3 幀 |
| Inventory | F7 | hud | 左上角道具欄：空格依次彈出，道具在 at 幀放進格子 + 光環 + 下方小標籤 | slots*, items[{at*, slot, icon / asset, tone, label}], x(8), y(8), size(20), gap(3), enter(true；從上個 scene 接過來寫 false) | 空格每 3 幀；標籤 45 幀 |
| PropFx | 道具動畫 | （舞台物件 / 有 id 的事件） | 讓舞台上已擺好的物件、角色，或**寫了 `id` 的事件組件**本身動（以組件的 x, y 為軸；glow / tint 只對舞台物件有效）：必須有 event 的 target | effect*: shake / bounce / pulse / glow / tint / hide / show / move；amount, height, times, period, color, dx, dy | 依 effect |
| Act | ACT | （角色） | 讓 scene.actors 宣告的角色做動作（分鏡 `fx: ACT`） | actor*, action*(動作關鍵詞，見 docs/actors.md), view, facing, loop, from, to, prop, speed | 依動作 |
| ActorState | ACT | （角色） | 角色狀態：換裝、剪影、壓暗、出場 / 退場、說話、吊牌上的字 | actor*, costume, silhouette, dim, scale(整數), visible, view, facing, talk, at, tagText | 出退場 6 幀 |
| DialogBox | 對話框 | hud | 像素對話框，逐字打出 | speaker(超級人機), text 或 lines[{at,text}], x, y, w, h, typeEvery(1.65) | 依字數 |
| ChoiceMenu | C6/C16 | hud | 選項框 | options*: [{label}], picks[{at,index}], confirmAt, x, y, w | 選中 5 幀 |
| ChoiceDialog | C6/C16 | hud | 對話框 + 選項框連動 | text*, options*: [{label, reply}], picks, confirmAt, dialog{x,y,w,h}, menu{x,y,w} | 確認後打出 reply |

任何需要 x / y 的組件都可以改寫 event 的 `target`（舞台物件名稱或「主持人」）＋ `anchor`（center / top / bottom）＋ `offset`，座標自動帶入。詳見 `docs/stage-for-ai.md`。

所有組件通用（寫在 event 上，見 `docs/timeline.md`）：
- `id`：事件取名後可被 target 指名；PriceTower 另有 `"<id>.base"`、`"<id>.red"`、`"<id>.top"`、`"<id>.1"`…、`"<id>.<label>"`。
- `focus`：`[{ at, dim, blur, frames }]` 壓暗 / 模糊漸變（A20 前景虛焦時讓組件一起虛化）。
- props 裡的 `at`、`…At` 可以寫 `"@詞"`；props 裡的 `{ "target": "名稱" }` 會換成 `{ x, y }`。

F2 頂部導航 / F6 浮水印不是事件：timeline 寫 `"nav": { "chapters": [...] }`、`"watermark": "小米創業思考"`，scene 寫 `"navIndex": 0`（高亮第幾段）；`"navAt": "@三把鑰匙+12"`（或幀數）= 導航在 scene 中途滑入，省略 = scene 開頭。

A16 直線擦除 / A7 橫向動態模糊擦除不是事件：寫在**換出去的** scene 上 `"transitionOut": { "type": "wipe" | "blur", "direction": "left" | "right", "duration": 12 }`。這個 scene 的最後一幀凍住（不含字幕、導航），蓋在下一個 scene 開頭 duration 幀上往一側擦出（wipe 預設往左、整張卡滑出帶陰影；blur 預設往右、水平拖影並變暗）；不改變任何 scene 的長度。

scene 層級（不是 event）：`stage`、`host`、`actors`、`camera`、`ambience`、`subtitles`、`navIndex`、`watermark`。
角色與動作庫（20 個動作）詳見 `docs/actors.md`。
俯仰推入（A6）用 scene 的 `camera: [{ "type": "tilt-push", ... }]`。

## Sprite：動畫素材怎麼寫

```json
{ "component": "Sprite", "start": 0, "props": { "asset": "Seamless Loop/轉動金幣", "x": 120, "y": 160, "scale": 3 } }
{ "component": "Sprite", "start": "@拿到", "props": { "asset": "Sprite Sheet/獎杯/End (Pressed) (64x64).png", "x": 240, "y": 160 } }
{ "component": "Sprite", "start": 0, "props": { "asset": "Seamless Loop/進度條", "x": 240, "y": 120, "scale": 4, "play": "once", "animFps": 4 } }
```

- `asset` 寫資料夾 = Seamless Loop / 氣泡（一格一張 PNG）；寫 PNG = 單張圖或動畫條。完整範例：`timelines/loop-demo.json`。
- 播放一律硬切換格、不補間；`loop` 播完接回第 0 格，`once` 從事件開始播一輪、停在最後一格。
- 預設速度和方式照素材清單：例如棕色 / 灰色書翻頁 12、旗子 10、rotationalCoin 8、轉動金幣 6、寶石 6、胡蘿蔔 4、向日葵 2、果樹 1、氣泡 8 fps。
  **預設 `once`**：`Sprite Sheet/獎杯/`、`Seamless Loop/紅色寶箱`（要一直開關就寫 `"play": "loop"`）。其餘預設 `loop`。
- `animFps` 覆蓋速度；`frameIndex` 固定顯示某一格（0 起算，例如進度條停在滿格寫 6）。
- 影格大小不同的組（向日葵、胡蘿蔔、寶箱、書）自動在框內**底部置中**，`anchor: "bottom"` 的 y 就是地面，不會抖。播放框 = 最大那一格。
- `Sprite Sheet/粒子特效/Flashing particles.png` 會播 8 顆不等大的星（31×29 框、置中），建議 `anchor: "center"`。
