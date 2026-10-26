# AI 生圖（綠幕宮格圖）→ 像素素材：去綠幕、切格、縮成原生像素、量化顏色，存到 assets/generated/ 並登記 manifest。
# 分鏡的「生圖 / 生圖動畫 / 生圖精靈圖」都用這支處理（生圖本身用 Codex 的 imagegen，背景要求純綠 #00FF00）。
#
# 用法：
#   python scripts/gen-sprite.py <生圖.png> --name cash_drawer --grid 2x2 --anim --height 40 --for "shot 12 收銀機彈抽屜"
#   python scripts/gen-sprite.py <生圖.png> --name study_props --grid 2x2 --labels 木椅,書桌,檯燈,書架 --height 36
#   python scripts/gen-sprite.py <生圖.png> --name register --height 48            （單張）
# 參數：
#   --grid CxR     宮格欄 x 列（2x2、3x2…），影格順序：左到右、上到下；省略 = 單張
#   --anim         動畫：每格同一個畫布（各格聯集範圍），位置關係不變 → 輸出資料夾 <name>/1.png…（時間軸 asset 寫資料夾）
#                  沒寫 = 精靈圖：每格各自裁到物件範圍 → <name>_<標籤或序號>.png
#   --labels a,b   精靈圖每格的檔名（照順序）
#   --height N     必填（或 --width）：物件在原生像素裡的高度（世界座標，主持人約 51、畫面高 270）。
#                  動畫是全部格子聯集的高度；精靈圖是最高那格的高度。
#   --palette      調色盤：#hex 逗號清單，或有 "palette" 欄位的 JSON 檔；省略 = 自動挑 --colors 色（預設 16）
#   --no-key       原圖已經是透明背景（例如官方 logo）：不去綠幕，只用原本的透明度（綠色 logo 一定要加）
#   --out DIR      輸出資料夾，預設 assets/generated（影片專案用自己的 assets/generated）
#   --for / --source  登記到 manifest 的用途、來源（預設 "Codex imagegen（gpt-image-2）"）
# 另外輸出 out/gen-preview/<name>.png（放大 6 倍、棋盤格底）給人或 Read 工具檢查。
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("--name", required=True)
ap.add_argument("--grid", default="1x1")
ap.add_argument("--anim", action="store_true")
ap.add_argument("--labels", default="")
ap.add_argument("--height", type=int)
ap.add_argument("--width", type=int)
ap.add_argument("--palette", default="")
ap.add_argument("--colors", type=int, default=16)
ap.add_argument("--no-key", action="store_true")
ap.add_argument("--out", default=os.path.join(ROOT, "assets", "generated"))
ap.add_argument("--for", dest="purpose", default="")
ap.add_argument("--source", default="Codex imagegen（gpt-image-2）")
args = ap.parse_args()
cols, rows = (int(v) for v in args.grid.lower().split("x"))
if not (args.height or args.width):
    sys.exit("要指定 --height 或 --width（物件在原生像素裡的大小，主持人約高 51）")
labels = [s.strip() for s in args.labels.split(",") if s.strip()]
if labels and len(labels) != cols * rows:
    sys.exit(f"--labels 有 {len(labels)} 個，宮格是 {cols * rows} 格")

# ── 1. 去綠幕：綠色明顯壓過紅藍的像素 → 透明；物件邊緣（離透明 2 像素內）去綠邊 ──
im = np.asarray(Image.open(args.src).convert("RGBA")).astype(np.int16)
r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
key = np.zeros_like(a, bool) if args.no_key else (g > 90) & (g - np.maximum(r, b) > 60)
alpha = np.where(key | (a < 128), 0, 255).astype(np.uint8)
inner = np.asarray(Image.fromarray(alpha).filter(ImageFilter.MinFilter(5)))
edge = (alpha > 0) & (inner == 0) & (not args.no_key)
cap = np.maximum(r, b)
im[..., 1] = np.where(edge & (g > cap), cap, g)
im[..., 3] = alpha
rgba = im.astype(np.uint8)

# ── 2. 切格（等分），找每格的物件範圍 ──
H, W = alpha.shape
cells = []
for j in range(rows):
    for i in range(cols):
        x0, x1 = W * i // cols, W * (i + 1) // cols
        y0, y1 = H * j // rows, H * (j + 1) // rows
        m = alpha[y0:y1, x0:x1] > 0
        if not m.any():
            sys.exit(f"第 {len(cells) + 1} 格是空的（去綠幕後沒有東西），檢查 --grid 或背景是不是純綠")
        ys, xs = np.nonzero(m)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        touch = box[0] == 0 or box[1] == 0 or box[2] == x1 - x0 or box[3] == y1 - y0
        if touch:
            print(f"注意：第 {len(cells) + 1} 格的物件碰到格線，可能被切掉或混進鄰格")
        cells.append({"img": rgba[y0:y1, x0:x1], "box": box})

# 動畫：所有格用同一個裁切框（聯集），保留格與格之間的位置變化
if args.anim:
    u = (min(c["box"][0] for c in cells), min(c["box"][1] for c in cells), max(c["box"][2] for c in cells), max(c["box"][3] for c in cells))
    for c in cells:
        c["box"] = u

# ── 3. 縮成原生像素：以物件高度（或寬度）定比例，BOX 取平均，alpha 二值化 ──
# 動畫以聯集框對準指定大小；精靈圖每格用同一個比例（同一視角、同一比例的物件縮完大小關係不變），以最大的那格對準
if args.anim:
    ref = cells[0]["box"]
else:
    ref = max(cells, key=lambda c: (c["box"][2] - c["box"][0]) if args.width else (c["box"][3] - c["box"][1]))["box"]
scale = args.width / (ref[2] - ref[0]) if args.width else args.height / (ref[3] - ref[1])


def shrink(c):
    x0, y0, x1, y1 = c["box"]
    crop = Image.fromarray(np.ascontiguousarray(c["img"][y0:y1, x0:x1]))
    w, h = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    # 先乘上 alpha 再平均，避免透明處的綠色滲進邊緣
    arr = np.asarray(crop).astype(np.float32)
    arr[..., :3] *= arr[..., 3:4] / 255
    small = np.asarray(Image.fromarray(arr.astype(np.uint8)).resize((w, h), Image.BOX)).astype(np.float32)
    al = small[..., 3]
    rgb = np.where(al[..., None] > 0, small[..., :3] * 255 / np.maximum(al[..., None], 1), 0)
    return np.dstack([np.clip(rgb, 0, 255), np.where(al >= 128, 255, 0)]).astype(np.uint8)


smalls = [shrink(c) for c in cells]

# ── 4. 量化顏色：指定調色盤 → 每個像素換成最近的顏色；沒指定 → 全部格子一起挑 N 色（各格顏色一致） ──
def parse_palette(s):
    if not s:
        return None
    if os.path.isfile(s):
        s = ",".join(json.load(open(s, encoding="utf-8"))["palette"])
    return np.array([[int(h.strip().lstrip("#")[k:k + 2], 16) for k in (0, 2, 4)] for h in s.split(",") if h.strip()], dtype=np.float32)


pal = parse_palette(args.palette)
if pal is None:
    opaque = np.concatenate([s[..., :3][s[..., 3] > 0] for s in smalls])
    q = Image.fromarray(opaque.reshape(1, -1, 3)).quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[: 3 * args.colors], dtype=np.float32).reshape(-1, 3)
for s in smalls:
    rgb = s[..., :3].reshape(-1, 3).astype(np.float32)
    # 加權 RGB 距離（人眼對綠最敏感）
    d = (((rgb[:, None, :] - pal[None]) ** 2) * np.array([0.3, 0.59, 0.11])).sum(-1)
    s[..., :3] = pal[d.argmin(1)].reshape(s.shape[0], s.shape[1], 3).astype(np.uint8)
    s[s[..., 3] == 0] = 0

# ── 5. 輸出 ──
os.makedirs(args.out, exist_ok=True)
files = []
if args.anim:
    d = os.path.join(args.out, args.name)
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith(".png"):
            os.remove(os.path.join(d, f))
    for k, s in enumerate(smalls):
        Image.fromarray(s).save(os.path.join(d, f"{k + 1}.png"))
    files.append(f"{args.name}/1.png … {len(smalls)}.png")
else:
    for k, s in enumerate(smalls):
        fn = f"{args.name}.png" if len(smalls) == 1 else f"{args.name}_{labels[k] if labels else k + 1}.png"
        Image.fromarray(s).save(os.path.join(args.out, fn))
        files.append(fn)

# 預覽：放大 6 倍、棋盤格底，各格橫排
Z = 6
pw = sum(s.shape[1] for s in smalls) * Z + 8 * (len(smalls) + 1)
ph = max(s.shape[0] for s in smalls) * Z + 16
yy, xx = np.mgrid[0:ph, 0:pw]
board = np.where(((yy // 12 + xx // 12) % 2)[..., None] == 0, 200, 160).astype(np.uint8).repeat(3, 2)
prev = Image.fromarray(board).convert("RGBA")
x = 8
for s in smalls:
    big = Image.fromarray(s).resize((s.shape[1] * Z, s.shape[0] * Z), Image.NEAREST)
    prev.alpha_composite(big, (x, 8))
    x += big.width + 8
pdir = os.path.join(ROOT, "out", "gen-preview")
os.makedirs(pdir, exist_ok=True)
prev.save(os.path.join(pdir, f"{args.name}.png"))

# manifest：同名條目覆蓋
mpath = os.path.join(args.out, "manifest.json")
manifest = json.load(open(mpath, encoding="utf-8")) if os.path.exists(mpath) else []
entry_file = files[0] if len(files) == 1 else "、".join(files)
kind = f"動畫 {len(smalls)} 格" if args.anim else ("單張" if len(smalls) == 1 else f"精靈圖 {len(smalls)} 格")
method = f"scripts/gen-sprite.py：去綠幕、{args.grid} 切格（{kind}）、縮到原生 {smalls[0].shape[1]}×{smalls[0].shape[0]}、量化 {len(pal)} 色"
mine = lambda f: f == f"{args.name}.png" or f.startswith((f"{args.name}_", f"{args.name}/"))
manifest = [m for m in manifest if not mine(str(m.get("file", "")))]
manifest.append({"file": entry_file, "for": args.purpose or None, "method": method, "source": args.source, "license": None})
with open(mpath, "w", encoding="utf-8") as f:
    f.write("[\n" + ",\n".join("  " + json.dumps(m, ensure_ascii=False) for m in manifest) + "\n]\n")

try:
    rel_out = os.path.relpath(args.out, ROOT).replace("\\", "/")
except ValueError:  # 不同磁碟
    rel_out = os.path.abspath(args.out).replace("\\", "/")
print(f"{kind}，原生尺寸 {' / '.join(f'{s.shape[1]}×{s.shape[0]}' for s in smalls)}，{len(pal)} 色")
print("輸出：" + "、".join(os.path.join(rel_out, f).replace("\\", "/") for f in files))
print(f"預覽：out/gen-preview/{args.name}.png")
if not rel_out.startswith("..") and not os.path.isabs(rel_out):
    paths = [f"@engine/{rel_out}/{args.name}"] if args.anim else [f"@engine/{rel_out}/{f}" for f in files]
    print("時間軸 asset / 加進 assets.list.json：" + "、".join(paths) + "（再跑 npm run assets）")
