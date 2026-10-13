# 組件清單（給分鏡 AI）

`層`：world = 跟鏡頭走（世界座標，地面線 y=160）；hud = 固定在畫面（480×270）。`*` = 必填。時長：預設顯示到 scene 結束，可用 event 的 `duration` 截斷。

| 組件 | 詞典 | 層 | 用途 | 主要 props | 自身節奏 |
|---|---|---|---|---|---|
| Sprite | 素材 | world | 顯示素材 / 動畫條 | asset*, x, y, anchor(bottom/center/top-left), scale(整數), flipX, tint(red/gray/gold/#hex), glow, animFps | 動畫 10fps |
| Host | 主持人 | world | 額外的主持人（scene.host 之外） | pose*, x, y, flipX, tint, talk | — |
| Ambience | G | world | 氛圍層 | layers*: dust / snow / lamp{x,y} / stars / beam{x} / confetti / zzz{x,y} | 持續 |
| RingPulse | B1 | world | 光環脈衝，對準高亮詞 | x*, y*, radius(34), color | 15 幀 |
| Tag | B2/B13/B11 | world | 標籤彈出 | text*, x*, y*(標籤底部), variant: red / dark / hang / locked, appear: pop / instant | 3 幀回彈 |
| Stamp | B6/B3 | world | 蓋章 / ✕ + 畫面泛紅 | x*, y*, variant: stamp / x, text, size(2), holdTint | 3 幀拍下，泛紅 12 幀 |
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
| SkillCard | C25/C11/C59 | hud | 技能卡飛入、翻面、示範、收納 | index*, title*, desc, demo: years / daily / future, fromChest{index,of}, flipAt(14), collectAt | 依參數 |
| SkillSummary | C59 | hud | 已習得 N/N | cards*: [{title, desc, demo}] | 12 幀 |
| GamePopup | C29/C30/B9 | hud | 片尾行動呼籲 | variant*: follow{clickAt,exitAt} / input{question*,answer,title} / achievement{name*,exitAt} / ending{text,exitAt} | follow 約 56 幀 |
| NextTeaser | C32 | hud | ??? 下集預告框 | x(418), y(58), label | 持續 |
| QuestionBubble | B14 | world | 頭頂白底「?」泡泡，可帶一句反問 | x*, y*(泡泡尾巴尖，放頭頂上方), text("?"), question, size(2), ink | 3 幀回彈後輕浮動 |
| DropStack | C1 | world | 物件一個個掉下、彈跳、揚塵、堆高；count 1 = 單一道具帶彈跳落下 | x*, y*(第一個落地的底部), asset 或 icon: coin / key, tone: gold / red / silver, count(5), every(6), fall(70), fallFrames(9), step, jitter, layout: stack / row, scale, dust | 每個 9 幀落地 + 4 幀彈跳 |
| PropSwap | C2 | world | 道具替換：舊的瞬間消失、新的出現 + 一小團灰；也可只冒灰、或把道具縮小壓暗放到一邊 | x*, y*(底部), from, to, at(0), scale, toScale, dust, dustMode: dust / smoke, shrinkTo{x,y,scale,dim}, shrinkFrames(10) | 灰塵 14 幀 |
| SmokePop | C38 | world | 人物在煙霧中登場 + 頭上名牌，之後頭頂彈小標籤；多人寫多個事件錯開 | x*, y*(腳底), asset*, scale, flipX, label, tag, tagAt(14), tagVariant, smoke | 第 4 幀現身，煙 20 幀 |
| KeyDrop | C43 | world | 金鑰匙閃現 → 弧線飛到落點 → 光環 + 地面光圈常亮；可冒標籤、變成象徵物 | x*, y*(落點地面), fromX, fromY, flyFrames(12), asset, scale, hover(6), ring, ringColor, label, labelAt, labelVariant, morphTo, morphAt | 第 16 幀落地 |
| ProfileCard | C36 | hud | 人物資料卡：頭像 + 名字 + 紅頭銜 + 金標籤 + 大數字，滑入後欄位依序彈出；放射光用 SunBurst 另加 | name*, title, badge, stat, avatar, avatarScale(2), avatarDx, avatarDy, avatarBox(40), layout: row / column, from: left / right / bottom / none, x(240), y(60)(卡片頂邊中點), w | 滑入 8 幀，欄位每 4 幀 |
| Inventory | F7 | hud | 左上角道具欄：空格依次彈出，道具在 at 幀放進格子 + 光環 + 下方小標籤 | slots*, items[{at*, slot, icon / asset, tone, label}], x(8), y(8), size(20), gap(3), enter(true；從上個 scene 接過來寫 false) | 空格每 3 幀；標籤 45 幀 |
| PropFx | 道具動畫 | （舞台物件） | 讓舞台上已擺好的物件本身動：必須有 event 的 target | effect*: shake / bounce / pulse / glow / tint / hide / show / move；amount, height, times, period, color, dx, dy | 依 effect |
| Act | ACT | （角色） | 讓 scene.actors 宣告的角色做動作（分鏡 `fx: ACT`） | actor*, action*(動作關鍵詞，見 docs/actors.md), view, facing, loop, from, to, prop, speed | 依動作 |
| ActorState | ACT | （角色） | 角色狀態：換裝、剪影、壓暗、出場 / 退場、說話 | actor*, costume, silhouette, dim, scale(整數), visible, view, facing, talk, at | 出退場 6 幀 |
| DialogBox | 對話框 | hud | 像素對話框，逐字打出 | speaker(超級人機), text 或 lines[{at,text}], x, y, w, h, typeEvery(1.65) | 依字數 |
| ChoiceMenu | C6/C16 | hud | 選項框 | options*: [{label}], picks[{at,index}], confirmAt, x, y, w | 選中 5 幀 |
| ChoiceDialog | C6/C16 | hud | 對話框 + 選項框連動 | text*, options*: [{label, reply}], picks, confirmAt, dialog{x,y,w,h}, menu{x,y,w} | 確認後打出 reply |

任何需要 x / y 的組件都可以改寫 event 的 `target`（舞台物件名稱或「主持人」）＋ `anchor`（center / top / bottom）＋ `offset`，座標自動帶入。詳見 `docs/stage-for-ai.md`。

scene 層級（不是 event）：`stage`、`host`、`actors`、`camera`、`ambience`、`subtitles`、`navIndex`、`watermark`。
角色與動作庫（20 個動作）詳見 `docs/actors.md`。
俯仰推入（A6）用 scene 的 `camera: [{ "type": "tilt-push", ... }]`。
