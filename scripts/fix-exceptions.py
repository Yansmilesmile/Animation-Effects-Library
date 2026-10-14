# 素材清單裡的例外檔案（不能直接用的）處理成可疊圖的版本，輸出到 assets/generated/。
# copy-assets.mjs 遇到原路徑時會改用這裡的輸出（見 copy-assets.mjs 的 REPLACED）。
# 用法：python scripts/fix-exceptions.py（需要 Pillow；素材庫只讀）
import os
from PIL import Image

LIB = "D:/桌面/素材庫/PixelSRPG-Forge-main"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "generated")


def flood_clear(im, is_bg):
    """從四邊往內 4 連通填色，is_bg 的像素改成透明（內部同色的像素不受影響）。"""
    w, h = im.size
    px = im.load()
    seen = set()
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        if not is_bg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


# 1. 小素材/食物/103.png：白底 → 從邊緣去掉白色
apple = Image.open(f"{LIB}/小素材/食物/103.png").convert("RGBA")
flood_clear(apple, lambda c: min(c[:3]) >= 235).save(f"{OUT}/food_103.png")

# 2. 技能圖標/加速_提升_跑步.png：RGB 方框圖示，黑色圓角外框以外的四角改透明
skill = Image.open(f"{LIB}/技能圖標/加速_提升_跑步.png").convert("RGBA")
flood_clear(skill, lambda c: max(c[:3]) > 40).save(f"{OUT}/skill_speed_up.png")

# 3. Sprite Sheet/粒子特效/Flashing particles.png：
#    2048×416 是原生 177×36 的像素圖放大約 11.57 倍、帶壓縮雜訊，底色 #181818，8 顆星不等距。
#    → 每格取中心 3×3 的中位數縮回原生尺寸；用「反 screen」去掉深底（亮度變透明度，疊在任何底上都像 screen 混合）；
#      照清單實測的 X 範圍切成 8 格，每格以星的中心置中、統一畫布大小（播放時不會跳位）。
sheet = Image.open(f"{LIB}/Sprite Sheet/粒子特效/Flashing particles.png").convert("RGB")
NW, NH = 177, 36
cx, cy = sheet.width / NW, sheet.height / NH
sp = sheet.load()


def sample(i, j):
    x0, y0 = int((i + 0.5) * cx), int((j + 0.5) * cy)
    cs = [sp[min(max(x0 + dx, 0), sheet.width - 1), min(max(y0 + dy, 0), sheet.height - 1)] for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
    return tuple(sorted(c[k] for c in cs)[4] for k in range(3))


BG = 24
native = Image.new("RGBA", (NW, NH))
for j in range(NH):
    for i in range(NW):
        v = [max(0, c - BG) / (255 - BG) for c in sample(i, j)]
        a = max(v)
        if a < 0.12 or j == 0:  # 第 0 列是原圖上緣殘留的碎點
            continue
        a = min(1.0, round(a * 4) / 4)  # 透明度只留 4 階，保持像素感
        native.putpixel((i, j), tuple(min(255, round(c / max(v) * 255)) for c in v) + (round(a * 255),))

RANGES = [(130, 252), (296, 634), (743, 950), (1041, 1161), (1221, 1449), (1524, 1671), (1704, 1840), (1908, 1942)]
stars = []
for x0, x1 in RANGES:
    crop = native.crop((int(x0 / cx), 0, int(x1 / cx) + 1, NH))
    stars.append(crop.crop(crop.getbbox()))
W = max(s.width for s in stars) | 1
H = max(s.height for s in stars) | 1
d = os.path.join(OUT, "flashing_particles")
os.makedirs(d, exist_ok=True)
for n, s in enumerate(stars, 1):
    f = Image.new("RGBA", (W, H))
    f.paste(s, ((W - s.width) // 2, (H - s.height) // 2))
    f.save(os.path.join(d, f"{n}.png"))
print(f"flashing_particles：8 格 {W}×{H}；food_103.png、skill_speed_up.png 完成")
