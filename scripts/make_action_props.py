# 動作庫內建道具（像素圖）→ assets/generated/：python scripts/make_action_props.py
# 掏剪刀 / 剪斷：scissors_open.png、scissors_closed.png（側面、刀尖朝右）
# 比二：hand_v.png（正面舉起的 V 手勢）
# 扯衣：tshirt_torn.png（素材庫「愛心T恤」少一袖、褪色、破洞）
# 掛牌：tag_blank.png（空白小吊牌；時間軸用 prop 換成寫了字的牌）
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "generated")
LIB = "D:/桌面/素材庫/PixelSRPG-Forge-main"


def draw(rows, pal):
    h = len(rows)
    w = max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in pal:
                im.putpixel((x, y), pal[c])
    return im


def hexc(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


PAL = {
    "k": hexc("#1a1418"),  # 描邊
    "s": hexc("#dfe6ee"),  # 刀面亮
    "m": hexc("#9aa6b4"),  # 刀面暗
    "r": hexc("#d8443a"),  # 握把紅
    "d": hexc("#8a2a26"),  # 握把暗
    "y": hexc("#e0a82e"),  # 鉚釘金
}

# 打開的剪刀：左邊兩個紅握圈，鉚釘在中間，兩片刀張開成 V（刀尖朝右）
SCISSORS_OPEN = [
    "..........................................kk",
    "......................................kkkksk",
    "..................................kkkksssmk.",
    ".kkkkk........................kkkksssmmkk...",
    "krrrrrk...................kkkksssmmkk.......",
    "krkkkrrk..............kkkksssmmkk...........",
    "krk..krrkkk.......kkkksssmmkk...............",
    "krk...krrrrkkkkkkksssmmkk...................",
    "krkkkkrrddrrryyykkmmkk......................",
    ".krrrrrddkkkkyyykk..........................",
    "..kkkkkk....kkyyykk.........................",
    ".kkkkk.......kkddrrkkkkkkk..................",
    "krrrrrk.......krrddkmmssssskkkk.............",
    "krkkkrrk.....krrkkdkkmmmsssssssskkkk........",
    "krk..krrkkkkkrrk...kkkkmmmsssssssssskkkk....",
    "krkkkkrrrrrrrrk........kkkkmmmmssssssssskkk.",
    ".krrrrrddddddk.............kkkkmmmmmmssssk..",
    "..kkkkkkkkkkk..................kkkkkkkkkk...",
]
# 合起來的剪刀：兩片刀疊成一條
SCISSORS_CLOSED = [
    ".kkkkk......................................",
    "krrrrrk.....................................",
    "krkkkrrk....................................",
    "krk..krrkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....",
    "krkkkkrrrrddyyykkssssssssssssssssssssssskk..",
    ".krrrrrddkkkyyykmmmmmmmmmmmssssssssssssssskk",
    ".krrrrrddkkkyyykmmmmmmmmmmmmmmmmmmmmmmmkkk..",
    "krkkkkrrrrddkkkkkkkkkkkkkkkkkkkkkkkkkkk.....",
    "krk..krrkkk.................................",
    "krkkkrrk....................................",
    "krrrrrk.....................................",
    ".kkkkk......................................",
]

HAND = {"k": hexc("#2a1c18"), "h": hexc("#f2c9a0"), "j": hexc("#d9a57c")}
# V 手勢（食指、中指張開，其餘握起），手腕在下
HAND_V = [
    "k...k.",
    "kh.khk",
    "kh.khk",
    "khkhhk",
    "kkhhkk",
    "khhhhk",
    "khjjhk",
    "khhhhk",
    ".kkkk.",
]

TAG = {"k": hexc("#3b3a33"), "c": hexc("#f6eccf"), "r": hexc("#d0453a")}
TAG_BLANK = [
    "...rr...",
    "..r..r..",
    "..r..r..",
    "kkkkkkkk",
    "kcccccck",
    "kcckkcck",
    "kcccccck",
    "kcccccck",
    "kcccccck",
    "kcccccck",
    "kkkkkkkk",
]


def torn_tshirt():
    src = Image.open(f"{LIB}/服裝裝飾/衣服服裝時裝/愛心T恤.png").convert("RGBA")
    w, h = src.size
    im = src.copy()
    # 左袖整片扯掉（x < 9、y 9–19），留下鋸齒斷口
    for y in range(9, 20):
        cut = 8 + (y % 2)
        for x in range(0, cut + 1):
            im.putpixel((x, y), (0, 0, 0, 0))
        im.putpixel((cut + 1, y), (0, 0, 0, 255))
    # 褪色：飽和度降、整體偏灰黃
    for y in range(h):
        for x in range(w):
            r, g, b, a = im.getpixel((x, y))
            if a < 128 or (r, g, b) == (0, 0, 0):
                continue
            gray = (r + g + b) // 3
            im.putpixel((x, y), (int(gray * 0.82 + 30), int(gray * 0.78 + 22), int(gray * 0.62 + 12), 255))
    # 破洞（黑邊 + 透明）
    for cx, cy in [(13, 21), (20, 25), (23, 13)]:
        for dx in (-1, 0, 1, 2):
            for dy in (-1, 0, 1, 2):
                inner = dx in (0, 1) and dy in (0, 1)
                im.putpixel((cx + dx, cy + dy), (0, 0, 0, 0) if inner else (40, 30, 26, 255))
    return im


os.makedirs(OUT, exist_ok=True)
draw(SCISSORS_OPEN, PAL).save(os.path.join(OUT, "scissors_open.png"))
draw(SCISSORS_CLOSED, PAL).save(os.path.join(OUT, "scissors_closed.png"))
draw(HAND_V, HAND).save(os.path.join(OUT, "hand_v.png"))
draw(TAG_BLANK, TAG).save(os.path.join(OUT, "tag_blank.png"))
torn_tshirt().save(os.path.join(OUT, "tshirt_torn.png"))
print("scissors_open / scissors_closed / hand_v / tag_blank / tshirt_torn")
