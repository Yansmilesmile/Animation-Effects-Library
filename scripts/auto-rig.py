# 自動接骨架：符合 docs/新角色規格.md 的 SVG → assets/actors/<id>/（front.svg、side.svg、rig.json）
# ＋ 靜態姿勢圖 → assets/generated/<id>_<姿勢>.png（登記 manifest、assets.list.json）＋ 示範影片 out/<id>-demo.mp4
#
# 用法：
#   python scripts/auto-rig.py <角色資料夾> --id <角色id> [--name 中文名] [--no-video] [--force]
# 角色資料夾：
#   front.svg            正面站立（必交）
#   side.svg             側面站立、朝右（必交）
#   poses/<姿勢>.svg     靜態姿勢圖（選交，和 front.svg 同畫布、同地面線、同站位）
# 輸出：
#   assets/actors/<id>/front.svg、side.svg、rig.json（已存在要加 --force 才覆蓋）
#   out/auto-rig/<id>_<view>.png（部位上色預覽）、out/auto-rig/<id>-demo.json → out/<id>-demo.mp4
# 規格不符時列出所有錯誤後結束（不寫任何檔）；只是可疑的地方印「注意」，照樣產出。
import argparse
import json
import os
import re
import subprocess
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ACTORS = os.path.join(ROOT, "assets", "actors")
GEN = os.path.join(ROOT, "assets", "generated")
OUT = os.path.join(ROOT, "out", "auto-rig")

ARMS = ["arm_l_upper", "arm_l_lower", "hand_l", "arm_r_upper", "arm_r_lower", "hand_r"]
LEGS = ["leg_l", "foot_l", "leg_r", "foot_r"]
REQUIRED = {
    "front": ["head", "torso"] + ARMS + LEGS,
    "side": ["head", "torso", "arm_r_upper", "arm_r_lower", "hand_r"] + LEGS,
}
OPTIONAL = {"front": [], "side": ["arm_l_upper", "arm_l_lower", "hand_l"]}
FACES = ["face_blink", "face_smile", "face_surprise", "face_lookdown", "face_lookup"]
MOUTHS = ["mouth_1", "mouth_2"]
PARENT = {
    "torso": "root", "head": "torso",
    "arm_L_upper": "torso", "arm_L_lower": "arm_L_upper", "hand_L": "arm_L_lower",
    "arm_R_upper": "torso", "arm_R_lower": "arm_R_upper", "hand_R": "arm_R_lower",
    "leg_L": "root", "foot_L": "leg_L", "leg_R": "root", "foot_R": "leg_R",
}
Z = {
    "front": ["leg_L", "foot_L", "leg_R", "foot_R", "torso", "head", "arm_L_upper", "arm_L_lower", "hand_L", "arm_R_upper", "arm_R_lower", "hand_R"],
    "side": ["arm_L_upper", "arm_L_lower", "hand_L", "leg_L", "foot_L", "leg_R", "foot_R", "torso", "head", "arm_R_upper", "arm_R_lower", "hand_R", "finger_R"],
}


def bone_name(part):
    """規格的部位 id（小寫）→ 引擎骨頭名（arm_l_upper → arm_L_upper）"""
    return re.sub(r"_([lr])(?=_|$)", lambda m: "_" + m.group(1).upper(), part)


# ── 讀 SVG ──
def color(c, where, errors):
    c = c.strip().lower()
    if re.fullmatch(r"#[0-9a-f]{6}", c):
        return c
    if re.fullmatch(r"#[0-9a-f]{3}", c):
        return "#" + "".join(ch * 2 for ch in c[1:])
    errors.append(f"{where}：顏色「{c}」看不懂（要寫 #rrggbb）")
    return None


def attr(tag, name):
    m = re.search(rf'\b{name}\s*=\s*"([^"]*)"', tag)
    if m:
        return m.group(1)
    m = re.search(r'style\s*=\s*"([^"]*)"', tag)
    if m and name == "fill":
        m2 = re.search(r"fill\s*:\s*([^;]+)", m.group(1))
        if m2:
            return m2.group(1)
    return None


def read_svg(path, errors):
    """→ (w, h, {部位: {(x, y): 顏色}}, 沒有放在部位裡的像素數)。支援 <rect> 和 M x y H x V y H x Z 的 <path>"""
    s = open(path, encoding="utf-8-sig").read()
    name = os.path.basename(path)
    m = re.search(r'viewBox\s*=\s*"\s*0\s+0\s+(\d+)\s+(\d+)\s*"', s)
    if not m:
        errors.append(f"{name}：要有 viewBox=\"0 0 寬 高\"（1 單位 = 1 像素）")
        return 0, 0, {}, 0
    w, h = int(m.group(1)), int(m.group(2))
    parts, loose = {}, 0
    stack = []  # 目前所在的 <g id> 堆疊
    for t in re.finditer(r"<(/?)(g|rect|path|circle|ellipse|polygon|polyline|line|image|text)\b([^>]*?)(/?)>", s):
        close, tagname, body, selfclose = t.groups()
        if tagname == "g":
            if close:
                if stack:
                    stack.pop()
            else:
                gid = attr(body, "id")
                stack.append(gid.lower() if gid else None)
            continue
        if close:
            continue
        part = next((g for g in reversed(stack) if g), None)
        where = f"{name} <{tagname}>" + (f"（在 {part}）" if part else "")
        fill = attr(body, "fill")
        if fill in (None, "none", "transparent"):
            continue
        if tagname not in ("rect", "path"):
            errors.append(f"{where}：不支援 <{tagname}>，像素只能用 <rect> 或 <path d=\"M x y H x V y H x Z\">")
            continue
        c = color(fill, where, errors)
        if not c:
            continue
        cells = []
        if tagname == "rect":
            try:
                x, y = float(attr(body, "x") or 0), float(attr(body, "y") or 0)
                rw, rh = float(attr(body, "width")), float(attr(body, "height"))
            except (TypeError, ValueError):
                errors.append(f"{where}：<rect> 缺 width / height")
                continue
            if any(v != int(v) for v in (x, y, rw, rh)):
                errors.append(f"{where}：座標要是整數（x={x} y={y}），像素圖不能有半格")
                continue
            cells = [(xx, yy) for yy in range(int(y), int(y + rh)) for xx in range(int(x), int(x + rw))]
        else:
            d = attr(body, "d") or ""
            runs = re.findall(r"M\s*(-?\d+)[\s,]+(-?\d+)\s*H\s*(-?\d+)\s*V\s*(-?\d+)\s*H\s*-?\d+\s*Z", d)
            rest = re.sub(r"M\s*(-?\d+)[\s,]+(-?\d+)\s*H\s*(-?\d+)\s*V\s*(-?\d+)\s*H\s*-?\d+\s*Z", "", d).strip()
            if rest:
                errors.append(f"{where}：path 只能是矩形格式 M x y H x V y H x Z（看不懂：{rest[:30]}）")
                continue
            for x0, y0, x1, y1 in runs:
                x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
                cells += [(xx, yy) for yy in range(y0, y1) for xx in range(x0, x1)]
        if part is None:
            loose += len(cells)
            continue
        px = parts.setdefault(part, {})
        for k in cells:
            px[k] = c
    return w, h, parts, loose


# ── 幾何 ──
def bbox(px):
    xs = [x for x, _ in px]
    ys = [y for _, y in px]
    return min(xs), min(ys), max(xs), max(ys)


def cx(px):
    x0, _, x1, _ = bbox(px)
    return (x0 + x1 + 1) / 2


def touches(a, b):
    return any((x + dx, y + dy) in b for (x, y) in a for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))


def runs_of(px):
    """{(x,y): c} → 同列同色連續合併的 [x0, y, x1, y, c]（rig.json 的 fill 格式）"""
    out = []
    rows = {}
    for (x, y), c in px.items():
        rows.setdefault(y, []).append((x, c))
    for y in sorted(rows):
        r = sorted(rows[y])
        i = 0
        while i < len(r):
            j = i
            while j + 1 < len(r) and r[j + 1][0] == r[j][0] + 1 and r[j + 1][1] == r[i][1]:
                j += 1
            out.append([r[i][0], y, r[j][0], y, r[i][1]])
            i = j + 1
    return out


def lum(c):
    return 0.3 * int(c[1:3], 16) + 0.59 * int(c[3:5], 16) + 0.11 * int(c[5:7], 16)


# ── 檢查 ──
def check_view(view, w, h, parts, loose, errors, notes):
    where = f"{view}.svg"
    if loose:
        errors.append(f"{where}：有 {loose} 個像素沒有放在任何部位的 <g id> 裡")
    known = set(REQUIRED[view]) | set(OPTIONAL[view]) | set(FACES) | set(MOUTHS) | {f"{p}_under" for p in REQUIRED[view] + OPTIONAL[view]}
    for p in parts:
        if p not in known:
            errors.append(f"{where}：不認得的部位 id「{p}」（可用：{'、'.join(REQUIRED[view] + OPTIONAL[view])}，以及 face_*、mouth_1/2、<部位>_under）")
    for p in REQUIRED[view]:
        if not parts.get(p):
            errors.append(f"{where}：缺 {p}")
    if view == "side":
        have = [p for p in OPTIONAL["side"] if parts.get(p)]
        if have and len(have) != 3:
            errors.append(f"{where}：後面那隻手要嘛三塊都交（arm_l_upper、arm_l_lower、hand_l），要嘛都不交（不交 = 用前手壓暗複製）")
    # 身體部位不能重疊；表情、嘴型、_under 是另外疊的，不算
    body = [p for p in parts if p in REQUIRED[view] + OPTIONAL[view]]
    owner = {}
    for p in body:
        for k in parts[p]:
            if k in owner:
                errors.append(f"{where}：部位重疊：{owner[k]} 和 {p} 都有像素 {k}（同一格只能屬於一個部位）")
                break
            owner[k] = p
    for p in body:
        for (x, y) in parts[p]:
            if not (0 <= x < w and 0 <= y < h):
                errors.append(f"{where}：{p} 有像素超出畫布（{x},{y}）")
                break
    if any(e.startswith(where) for e in errors) or not parts.get("head") or not parts.get("torso"):
        return  # 結構有錯時後面的幾何檢查沒意義
    # 表情、嘴型只能改頭的像素位置附近
    hx0, hy0, hx1, hy1 = bbox(parts["head"])
    for p in FACES + MOUTHS:
        for (x, y) in parts.get(p, {}):
            if not (hx0 <= x <= hx1 and hy0 <= y <= hy1):
                errors.append(f"{where}：{p} 的像素 ({x},{y}) 不在頭的範圍裡")
                break
    for p in parts:
        if p.endswith("_under") and parts[p]:
            base = p[:-6]
            dup = [k for k in parts[p] if k in parts.get(base, {})]
            if dup:
                notes.append(f"{where}：{p} 有 {len(dup)} 格和 {base} 本身重疊（那幾格用不到，可以刪）")
    # 可疑：袖子只有外框線、手臂沒接到身體、左右反了
    for p in ("arm_l_upper", "arm_l_lower", "arm_r_upper", "arm_r_lower"):
        if parts.get(p):
            x0, y0, x1, y1 = bbox(parts[p])
            fillr = len(parts[p]) / ((x1 - x0 + 1) * (y1 - y0 + 1))
            if fillr < 0.35:
                notes.append(f"{where}：{p} 只填滿外框的 {fillr:.0%}，像是只有外框線？袖子要是實心的一整塊")
    chain = [("arm_l_upper", "torso"), ("arm_l_lower", "arm_l_upper"), ("hand_l", "arm_l_lower"),
             ("arm_r_upper", "torso"), ("arm_r_lower", "arm_r_upper"), ("hand_r", "arm_r_lower"),
             ("head", "torso"), ("foot_l", "leg_l"), ("foot_r", "leg_r")]
    for a, b in chain:
        if parts.get(a) and parts.get(b) and not touches(parts[a], parts[b]):
            notes.append(f"{where}：{a} 沒有碰到 {b}（轉動時會和身體分開）")
    if view == "front":
        tc = cx(parts["torso"])
        if cx(parts["arm_l_upper"]) > tc or cx(parts["arm_r_upper"]) < tc:
            errors.append(f"{where}：左右反了：arm_l_* / leg_l 是畫面左邊那隻（角色自己的右手）")
        if cx(parts["leg_l"]) > cx(parts["leg_r"]):
            errors.append(f"{where}：左右反了：leg_l 要在畫面左邊")
    else:
        if cx(parts["leg_r"]) < cx(parts["leg_l"]) - 0.5:
            notes.append(f"{where}：leg_r（前腳）在 leg_l（後腳）左邊；側面要朝右，前腳通常比較右邊")
        # 朝向：頭最右邊那一欄通常是臉；腳尖比腳跟右邊
        fx0, _, fx1, _ = bbox(parts["foot_r"])
        lx0, _, lx1, _ = bbox(parts["leg_r"])
        if (fx1 - lx1) < (lx0 - fx0):
            notes.append(f"{where}：前腳鞋尖好像朝左？側面一律畫朝右")


# ── 骨架 ──
def build_rig(view, parts):
    req = [p for p in REQUIRED[view] + OPTIONAL[view] if parts.get(p)]
    legs = {**parts["leg_l"], **parts["leg_r"]}
    allpx = {k: c for p in req for k, c in parts[p].items()}
    root = [cx(legs), bbox(allpx)[3] + 1]

    def top(p, down=0):
        x0, y0, x1, y1 = bbox(parts[p])
        return [(x0 + x1 + 1) / 2, y0 + down]

    def shoulder(p):
        """上臂：頂端往下 1/5（肩膀圓弧的中心），不少於 2 格"""
        x0, y0, x1, y1 = bbox(parts[p])
        return [(x0 + x1 + 1) / 2, y0 + max(2, round((y1 - y0 + 1) * 0.2))]

    hip = min(bbox(parts["leg_l"])[1], bbox(parts["leg_r"])[1])  # 後腳上半常被擋住：兩腳都用比較高的那個當髖
    pivots = {
        "torso": [root[0], bbox(parts["torso"])[3] + 0.5],  # 身體繞髖（兩腳中間）彎
        "head": [cx(parts["head"]), bbox(parts["head"])[3] + 0.5],
        "leg_l": [cx(parts["leg_l"]), hip], "foot_l": top("foot_l"), "leg_r": [cx(parts["leg_r"]), hip], "foot_r": top("foot_r"),
    }
    sides = ("l", "r") if view == "front" else ("r",)
    for s in sides:
        pivots[f"arm_{s}_upper"] = shoulder(f"arm_{s}_upper")
        pivots[f"arm_{s}_lower"] = top(f"arm_{s}_lower")
        pivots[f"hand_{s}"] = top(f"hand_{s}")
    if view == "side" and parts.get("arm_l_upper"):
        for p in ("arm_l_upper", "arm_l_lower", "hand_l"):
            pivots[p] = shoulder(p) if p == "arm_l_upper" else top(p)

    bones = []
    order = ["torso", "head", "arm_l_upper", "arm_l_lower", "hand_l", "arm_r_upper", "arm_r_lower", "hand_r", "leg_l", "foot_l", "leg_r", "foot_r"]
    if view == "side":  # clone 要先列被複製的骨頭
        order = ["hand_r", "arm_r_upper", "arm_r_lower", "torso", "head", "arm_l_upper", "arm_l_lower", "hand_l", "leg_l", "foot_l", "leg_r", "foot_r"]
    for p in order:
        b = bone_name(p)
        bone = {"id": b, "parent": PARENT[b]}
        if p in pivots:
            bone["pivot"] = [round(v, 1) for v in pivots[p]]
        if p.startswith(("arm_", "hand_")):
            bone["sign"] = 1 if (view == "front" and re.search(r"_l(_|$)", p)) else -1
        if parts.get(p):
            bone["take"] = [{"parts": [p]}]
        elif view == "side" and p in ("arm_l_upper", "arm_l_lower", "hand_l"):
            src = re.sub(r"_l(?=_|$)", "_r", p)
            bone["pivot"] = [round(v, 1) for v in pivots[src]]
            bone["clone"] = bone_name(src)
            bone["shade"] = 0.62
        under = parts.get(f"{p}_under")
        if under:
            bone["fill"] = runs_of({k: c for k, c in under.items() if k not in parts.get(p, {})})
        bones.append(bone)
    auto_fill = None
    if view == "side" and not parts.get("torso_under"):
        auto_fill = side_fill(parts)
        if auto_fill:
            next(b for b in bones if b["id"] == "torso")["fill"] = runs_of(auto_fill)
    if view == "side":
        hx0, hy0, hx1, hy1 = bbox(parts["hand_r"])
        skin = max(parts["hand_r"].values(), key=lambda c: (list(parts["hand_r"].values()).count(c), lum(c)))
        fx = hx1 - 1
        bones.insert(3, {"id": "finger_R", "parent": "hand_R", "pivot": [round(v, 1) for v in pivots["hand_r"]], "hidden": True,
                         "pixels": [[fx, hy1 + 1, skin], [fx, hy1 + 2, skin]]})

    def center(p):
        x0, y0, x1, y1 = bbox(parts[p])
        return [round((x0 + x1 + 1) / 2, 1), round((y0 + y1 + 1) / 2, 1)]

    tx0, ty0, tx1, ty1 = bbox(parts["torso"])
    slots = {"hand_R": {"bone": "hand_R", "at": center("hand_r")}, "chest": {"bone": "torso", "at": [round((tx0 + tx1 + 1) / 2, 1), round(ty0 + (ty1 - ty0) * 0.4, 1)]},
             "head": {"bone": "head", "at": [cx(parts["head"]), bbox(parts["head"])[1]]}}
    slots["hand_L"] = {"bone": "hand_L", "at": center("hand_l") if parts.get("hand_l") else center("hand_r")}
    faces = {p[5:]: [[x, y, c] for (x, y), c in sorted(parts[p].items(), key=lambda t: (t[0][1], t[0][0]))] for p in FACES if parts.get(p)}
    mouths = [[]] + [[[x, y, c] for (x, y), c in sorted(parts[p].items(), key=lambda t: (t[0][1], t[0][0]))] for p in MOUTHS if parts.get(p)]
    rig = {"svg": f"{view}.svg", "root": [round(v, 1) for v in root], "bones": bones, "z": Z[view], "slots": slots, "faces": faces, "mouths": mouths}
    return rig, auto_fill


def side_fill(parts):
    """側面沒交 torso_under：前手垂下時蓋住的身體，取同一列最近的身體顏色補上（只補在身體左右範圍內）"""
    torso = parts["torso"]
    arm = {**parts["arm_r_upper"], **parts["arm_r_lower"], **parts["hand_r"]}
    rows = {}
    for (x, y) in torso:
        rows.setdefault(y, []).append(x)
    out = {}
    for (x, y) in arm:
        xs = rows.get(y)
        if not xs or not (min(xs) <= x <= max(xs)) or (x, y) in torso:
            continue
        near = min(xs, key=lambda t: (abs(t - x), t))
        out[(x, y)] = torso[(near, y)]
    return out


# ── 輸出 ──
def write_engine_svg(path, w, h, parts, view, title):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 8}" height="{h * 8}" shape-rendering="crispEdges">',
             f"  <title>{title}</title>"]
    for p in REQUIRED[view] + OPTIONAL[view]:
        if not parts.get(p):
            continue
        lines.append(f'  <g id="{p}">')
        by = {}
        for (x, y), c in parts[p].items():
            by.setdefault(c, {})[(x, y)] = c
        for c, px in sorted(by.items()):
            d = "".join(f"M{x0} {y}H{x1 + 1}V{y + 1}H{x0}Z" for x0, y, x1, _, _ in runs_of(px))
            lines.append(f'    <path fill="{c}" d="{d}"/>')
        lines.append("  </g>")
    lines.append("</svg>")
    open(path, "w", encoding="utf8", newline="\n").write("\n".join(lines) + "\n")


def dump_rig(rig):
    """rig.json：骨頭一行一根、表情一行一個，好讀好改"""
    out = ["{"]
    out.append(f'  "_comment": {json.dumps(rig["_comment"], ensure_ascii=False)},')
    out.append(f'  "name": {json.dumps(rig["name"], ensure_ascii=False)},')
    out.append('  "views": {')
    vs = list(rig["views"].items())
    for vi, (vid, v) in enumerate(vs):
        out.append(f'    "{vid}": {{')
        out.append(f'      "svg": "{v["svg"]}",')
        out.append(f'      "root": {json.dumps(v["root"])},')
        out.append('      "bones": [')
        out.append(",\n".join("        " + json.dumps(b, ensure_ascii=False) for b in v["bones"]))
        out.append("      ],")
        out.append(f'      "z": {json.dumps(v["z"])},')
        out.append('      "slots": {')
        out.append(",\n".join(f'        "{k}": {json.dumps(s)}' for k, s in v["slots"].items()))
        out.append("      },")
        out.append('      "faces": {' + ("" if not v["faces"] else "\n" + ",\n".join(f'        "{k}": {json.dumps(f)}' for k, f in v["faces"].items()) + "\n      ") + "},")
        out.append('      "mouths": [\n' + ",\n".join("        " + json.dumps(m) for m in v["mouths"]) + "\n      ]")
        out.append("    }" + ("," if vi < len(vs) - 1 else ""))
    out.append("  }")
    out.append("}")
    return "\n".join(out) + "\n"


PART_COLORS = {"head": (255, 120, 120), "torso": (120, 200, 255), "arm_l_upper": (255, 220, 0), "arm_l_lower": (255, 160, 0), "hand_l": (255, 90, 0),
               "arm_r_upper": (0, 220, 120), "arm_r_lower": (0, 160, 90), "hand_r": (0, 110, 60), "leg_l": (200, 120, 255), "foot_l": (130, 60, 200),
               "leg_r": (255, 120, 220), "foot_r": (190, 40, 150)}


def preview(path, w, h, parts, rig, s=8):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return
    im = Image.new("RGB", (w * s * 2 + s, h * s), (40, 46, 66))
    d = ImageDraw.Draw(im)
    for p, px in parts.items():
        if p not in PART_COLORS:
            continue
        tint = PART_COLORS[p]
        for (x, y), c in px.items():
            base = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
            d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=base)
            X = x + w + 1
            d.rectangle([X * s, y * s, X * s + s - 1, y * s + s - 1], fill=tuple(int(base[i] * 0.45 + tint[i] * 0.55) for i in range(3)))
    for b in rig["bones"]:  # 樞紐：白點
        if "pivot" in b:
            X, Y = (b["pivot"][0] + w + 1) * s, b["pivot"][1] * s
            d.ellipse([X - 4, Y - 4, X + 4, Y + 4], fill=(255, 255, 255), outline=(0, 0, 0))
    rx, ry = rig["root"]
    d.line([((rx + w + 1) * s - 10, ry * s), ((rx + w + 1) * s + 10, ry * s)], fill=(255, 0, 0), width=3)
    im.save(path)


def pose_pixels(path, errors):
    """靜態圖不用分部位：拿掉所有 <g>，整張當一塊讀"""
    s = open(path, encoding="utf-8-sig").read()
    s = re.sub(r"<g\b[^>]*>|</g>", "", s)
    s = re.sub(r"(<svg\b[^>]*>)", r'\1<g id="all">', s, count=1).replace("</svg>", "</g></svg>")
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "_pose.svg")
    open(tmp, "w", encoding="utf8").write(s)
    _, _, parts, _ = read_svg(tmp, errors)
    os.remove(tmp)
    return parts.get("all", {})


def export_poses(actor, folder, root, errors, notes):
    """poses/*.svg → 尺寸與檢查（寫檔在 write_poses）：水平中心對齊正面 root x，底邊 = 正面 root y（同畫布、同地面線）"""
    pdir = os.path.join(folder, "poses")
    if not os.path.isdir(pdir):
        return []
    made = []
    rx, ry = root
    for f in sorted(os.listdir(pdir)):
        if not f.lower().endswith(".svg"):
            continue
        key = os.path.splitext(f)[0]
        if not re.fullmatch(r"[a-z0-9_]+", key):
            errors.append(f"poses/{f}：檔名只能用小寫英文、數字、底線（會變成 {actor}_<檔名>.png）")
            continue
        e = []
        px = pose_pixels(os.path.join(pdir, f), e)
        errors += [f"poses/{x}" for x in e]
        if e:
            continue
        if not px:
            errors.append(f"poses/{f}：沒有像素")
            continue
        xs = [x for x, _ in px]
        if max(y for _, y in px) >= ry:
            notes.append(f"poses/{f}：有像素在地面線（y={ry}）以下，會被裁掉；姿勢圖要和 front.svg 同畫布、腳踩同一條線")
        hw = max(rx - min(xs), max(xs) + 1 - rx)
        W = int(-(-2 * hw // 1))
        if (rx - W / 2) != int(rx - W / 2):
            W += 1
        H = int(ry) - min(y for _, y in px)
        made.append((key, f"{actor}_{key}.png", W, H))
    return made


def write_poses(actor, folder, root, poses):
    from PIL import Image
    rx, ry = root
    for key, name, W, H in poses:
        px = pose_pixels(os.path.join(folder, "poses", key + ".svg"), [])
        L = int(rx - W / 2)
        top = int(ry) - H
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for (x, y), c in px.items():
            if 0 <= x - L < W and 0 <= y - top < H:
                im.putpixel((x - L, y - top), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
        im.save(os.path.join(GEN, name))

def register(actor, made, folder):
    # manifest：照原檔格式（一行一筆、保留 BOM）接在最後
    p = os.path.join(GEN, "manifest.json")
    raw = open(p, encoding="utf-8-sig").read()
    have = {e["file"] for e in json.loads(raw)}
    lines = []
    for key, name, W, H in made:
        if name in have:
            continue
        e = {"file": name, "for": f"角色 {actor} 的靜態姿勢 {key}（素材 path：@engine/assets/generated/{name}）",
             "method": f"scripts/auto-rig.py：{folder}/poses/{key}.svg 原生像素柵格化（{W}×{H}），水平中心對齊角色正面 root、底邊 = 地面線",
             "source": None, "license": None}
        lines.append("  " + json.dumps(e, ensure_ascii=False).replace("{", "{ ", 1)[:-1] + " }")
    if lines:
        body = raw.rstrip()
        body = body[:-1].rstrip() + ",\n" + ",\n".join(lines) + "\n]\n"
        open(p, "w", encoding="utf-8-sig", newline="\n").write(body)
    # assets.list.json：接在 paths 最後
    p = os.path.join(ROOT, "assets.list.json")
    raw = open(p, encoding="utf8").read()
    data = json.loads(raw)
    new = [f"@engine/assets/generated/{name}" for _, name, _, _ in made if f"@engine/assets/generated/{name}" not in data["paths"]]
    if new:
        i = raw.rstrip().rfind("]")
        head = raw[:i].rstrip()
        raw = head + ",\n" + ",\n".join(f'    "{n}"' for n in new) + "\n  " + raw[i:]
        open(p, "w", encoding="utf8", newline="\n").write(raw)


def demo_timeline(actor, front, side, poses):
    """示範：正面動作 / 側面動作 / 切換靜態圖。寬鏡頭（世界 480×270 = 畫面）"""
    fw = int(front["w"]) + 14
    sw = int(side["w"]) + 30
    y = min(250, int(135 + front["h"] / 2 + 10))
    cam = {"x": 240, "y": 135, "zoom": 1}
    front_acts = [("愣住", None), ("招手", None), ("介紹", None), ("抱胸", "搖頭"), ("驚嚇", None)]
    n = max(1, min(len(front_acts) + 1, 470 // fw))
    xs = [round(240 + (i - (n - 1) / 2) * fw) for i in range(n)]
    actors, events = [], []
    for i, x in enumerate(xs):
        a = {"id": actor if i == 0 else f"{actor}_{i}", "rig": actor, "anchor": {"x": x, "y": y}}
        if i == n - 1:
            a["silhouette"] = True
            events.append({"component": "ActorState", "start": 45, "props": {"actor": a["id"], "silhouette": False}})
        if i == 0:
            a["talk"] = True
        actors.append(a)
        if i < len(front_acts) and i < n - 1:
            act, then = front_acts[i]
            events.append({"component": "Act", "start": 10, "props": {"actor": a["id"], "action": act}})
            if then:
                events.append({"component": "Act", "start": 30, "props": {"actor": a["id"], "action": then}})
    scenes = [{"id": f"{actor}-front", "duration": 80, "stage": "void", "background": "#3a4a6a", "cameraInitial": cam, "actors": actors, "events": events}]
    m = max(2, min(4, 470 // sw))
    sx = [round(240 + (i - (m - 1) / 2) * sw) for i in range(m)]
    sa = [{"id": f"{actor}_w", "rig": actor, "view": "side", "anchor": {"x": sx[0] - sw // 2, "y": y}},
          {"id": f"{actor}_p", "rig": actor, "view": "side", "anchor": {"x": sx[1], "y": y}}]
    se = [{"component": "Act", "start": 5, "props": {"actor": f"{actor}_w", "action": "走路", "to": {"x": sx[0] + sw // 3, "y": y}}},
          {"component": "Act", "start": 10, "props": {"actor": f"{actor}_p", "action": "指"}}]
    if m >= 3:
        sa.append({"id": f"{actor}_c", "rig": actor, "view": "side", "facing": "left", "anchor": {"x": sx[2], "y": y}})
        se.append({"component": "Act", "start": 10, "props": {"actor": f"{actor}_c", "action": "抱胸"}})
    if m >= 4:
        sa.append({"id": f"{actor}_f", "rig": actor, "view": "side", "anchor": {"x": sx[3], "y": y}})
        se.append({"component": "Act", "start": 40, "props": {"actor": f"{actor}_f", "action": "摔倒"}})
    scenes.append({"id": f"{actor}-side", "duration": 80, "stage": "void", "background": "#3a4a6a", "cameraInitial": cam, "actors": sa, "events": se})
    if poses:
        ev, t = [], 10
        for key, name, _, _ in poses:
            ev += [{"component": "ActorState", "start": t, "props": {"actor": actor, "visible": False}},
                   {"component": "Sprite", "start": t, "duration": 30, "props": {"asset": f"@engine/assets/generated/{name}", "x": 240, "y": y}},
                   {"component": "ActorState", "start": t + 30, "props": {"actor": actor, "visible": True}}]
            t += 40
        scenes.append({"id": f"{actor}-poses", "duration": t + 10, "stage": "void", "background": "#3a4a6a", "cameraInitial": cam,
                       "actors": [{"id": actor, "anchor": {"x": 240, "y": y}}], "events": ev})
    return {"fps": 30, "scenes": scenes}


def run(cmd):
    print("> " + " ".join(cmd))
    r = subprocess.run(cmd, cwd=ROOT, shell=(os.name == "nt"))
    if r.returncode:
        sys.exit(f"失敗：{' '.join(cmd)}")


def main():
    ap = argparse.ArgumentParser(description="符合 docs/新角色規格.md 的 SVG → 引擎角色骨架")
    ap.add_argument("folder", help="角色資料夾（front.svg、side.svg、poses/*.svg）")
    ap.add_argument("--id", required=True, help="角色 id（小寫英文、數字、底線），時間軸 actors 的 id / rig")
    ap.add_argument("--name", help="中文名（rig.json 的 name）")
    ap.add_argument("--force", action="store_true", help="assets/actors/<id>/ 已存在時覆蓋")
    ap.add_argument("--no-video", action="store_true", help="不渲染示範影片（只產骨架和預覽圖）")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z][a-z0-9_]*", a.id):
        sys.exit("--id 只能用小寫英文、數字、底線，英文開頭")
    dst = os.path.join(ACTORS, a.id)
    if os.path.exists(dst) and not a.force:
        sys.exit(f"assets/actors/{a.id}/ 已經存在；要覆蓋加 --force")
    errors, notes = [], []
    views = {}
    for view in ("front", "side"):
        f = os.path.join(a.folder, f"{view}.svg")
        if not os.path.exists(f):
            errors.append(f"缺 {view}.svg")
            continue
        e = []
        w, h, parts, loose = read_svg(f, e)
        if w:
            check_view(view, w, h, parts, loose, e, notes)
        errors += e
        views[view] = (w, h, parts)
    if errors:
        print("規格不符（沒有產生任何檔案）：\n  - " + "\n  - ".join(errors))
        if notes:
            print("另外注意：\n  - " + "\n  - ".join(notes))
        sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    rig = {"_comment": f"由 scripts/auto-rig.py 從 {os.path.abspath(a.folder)} 自動產生（docs/新角色規格.md）。樞紐由部位範圍估計，可以直接改這個檔再跑 npm run assets；重跑 auto-rig 會覆蓋。",
           "name": a.name or a.id, "views": {}}
    sizes = {}
    for view, (w, h, parts) in views.items():
        r, auto = build_rig(view, parts)
        if auto:
            notes.append(f"{view}.svg：沒交 torso_under，前手後面的身體用旁邊的顏色自動補了 {len(auto)} 格（手往前伸時看得到；不滿意就照規格交 torso_under）")
        rig["views"][view] = r
        body = {k: c for p in REQUIRED[view] + OPTIONAL[view] for k, c in parts.get(p, {}).items()}
        x0, y0, x1, y1 = bbox(body)
        sizes[view] = {"w": x1 - x0 + 1, "h": y1 - y0 + 1}
        for need in ("blink",):
            if need not in r["faces"]:
                notes.append(f"{view}.svg：沒交 face_{need}（眨眼不會動）")
        if len(r["mouths"]) < 3:
            notes.append(f"{view}.svg：沒交 mouth_1 / mouth_2（talk 說話時嘴巴不會動）")
    poses = export_poses(a.id, a.folder, rig["views"]["front"]["root"], errors, notes)
    if errors:
        print("規格不符（沒有產生任何檔案）：\n  - " + "\n  - ".join(errors))
        sys.exit(1)
    # ── 寫檔 ──
    os.makedirs(dst, exist_ok=True)
    for view, (w, h, parts) in views.items():
        write_engine_svg(os.path.join(dst, f"{view}.svg"), w, h, parts, view, f"{a.name or a.id} {view}（auto-rig）")
        preview(os.path.join(OUT, f"{a.id}_{view}.png"), w, h, parts, rig["views"][view])
    open(os.path.join(dst, "rig.json"), "w", encoding="utf8", newline="\n").write(dump_rig(rig))
    if poses:
        write_poses(a.id, a.folder, rig["views"]["front"]["root"], poses)
        register(a.id, poses, os.path.abspath(a.folder).replace("\\", "/"))
    print(f"角色 {a.id}：正面 {sizes['front']['w']}×{sizes['front']['h']}、側面 {sizes['side']['w']}×{sizes['side']['h']}（主持人 27×51；寬鏡頭畫面高 270）")
    print(f"  → assets/actors/{a.id}/front.svg、side.svg、rig.json；預覽 out/auto-rig/{a.id}_front.png、_side.png（白點 = 樞紐、紅線 = 腳底）")
    for key, name, W, H in poses:
        print(f"  → 靜態圖 @engine/assets/generated/{name}（{W}×{H}）")
    if notes:
        print("注意：\n  - " + "\n  - ".join(notes))
    if poses:
        run(["node", "scripts/copy-assets.mjs"])
    run(["node", "scripts/actors.mjs"])
    if poses:
        run(["node", "scripts/builtin-assets.mjs"])
    tl = demo_timeline(a.id, sizes["front"], sizes["side"], poses)
    tpath = os.path.join(OUT, f"{a.id}-demo.json")
    open(tpath, "w", encoding="utf8", newline="\n").write(json.dumps(tl, ensure_ascii=False, indent=1))
    if a.no_video:
        print(f"示範時間軸：out/auto-rig/{a.id}-demo.json（--no-video，沒渲染）")
        return
    run(["node", "scripts/render-timeline.mjs", tpath, os.path.join(ROOT, "out", f"{a.id}-demo.mp4")])
    print(f"示範影片：out/{a.id}-demo.mp4")



if __name__ == "__main__":
    main()
