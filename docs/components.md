# 組件清單（給分鏡 AI）

`層`：world = 跟鏡頭走（世界座標，地面線 y=160）；hud = 固定在畫面（480×270）。`*` = 必填。時長：預設顯示到 scene 結束，可用 event 的 `duration` 截斷。

| 組件 | 詞典 | 層 | 用途 | 主要 props | 自身節奏 |
|---|---|---|---|---|---|
| Sprite | 素材 | world | 顯示素材 / 動畫條 | asset*, x, y, anchor(bottom/center/top-left), scale(整數), flipX, tint(red/gray/gold/#hex), glow, animFps | 動畫 10fps |
| Host | 主持人 | world | 額外的主持人（scene.host 之外） | pose*, x, y, flipX, tint | — |
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
| PropFx | 道具動畫 | （舞台物件） | 讓舞台上已擺好的物件本身動：必須有 event 的 target | effect*: shake / bounce / pulse / glow / tint / hide / show / move；amount, height, times, period, color, dx, dy | 依 effect |
| DialogBox | 對話框 | hud | 像素對話框，逐字打出 | speaker(超級人機), text 或 lines[{at,text}], x, y, w, h, typeEvery(1.65) | 依字數 |
| ChoiceMenu | C6/C16 | hud | 選項框 | options*: [{label}], picks[{at,index}], confirmAt, x, y, w | 選中 5 幀 |
| ChoiceDialog | C6/C16 | hud | 對話框 + 選項框連動 | text*, options*: [{label, reply}], picks, confirmAt, dialog{x,y,w,h}, menu{x,y,w} | 確認後打出 reply |

任何需要 x / y 的組件都可以改寫 event 的 `target`（舞台物件名稱或「主持人」）＋ `anchor`（center / top / bottom）＋ `offset`，座標自動帶入。詳見 `docs/stage-for-ai.md`。

scene 層級（不是 event）：`stage`、`host`、`camera`、`ambience`、`subtitles`、`navIndex`、`watermark`。
俯仰推入（A6）用 scene 的 `camera: [{ "type": "tilt-push", ... }]`。
