"""舞台編輯器的本機伺服器。

    python tools/stage_editor/server.py          # 開啟 http://localhost:8765
    python tools/stage_editor/server.py --port 8766   # 換一個埠

- 只在本機（127.0.0.1）監聽，不連外網。
- 搜尋直接用素材庫 asset_tools/search.py 的 text_search；CLIP 模型在背景載入一次，之後每次搜尋都很快。
- /lib/<path> 從素材庫讀圖（只讀，不修改素材庫）。
- 舞台存成專案的 stages/<name>.json，Remotion 透過 npm run assets 讀取。
"""
import csv
import json
import mimetypes
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
STAGES_DIR = PROJECT / "stages"
ASSET_TOOLS = Path("D:/桌面/PixelSRPG-Forge-main/asset_tools")
PORT = 8765
# 可用 --port 指定其他埠，例如 python server.py --port 8766
if "--port" in sys.argv:
    PORT = int(sys.argv[sys.argv.index("--port") + 1])

sys.path.insert(0, str(ASSET_TOOLS))
import search as S  # noqa: E402  素材庫的查詢模組（不修改）

ROOT: Path = S.ROOT
OUT: Path = S.OUT
IMG_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

# ── inventory：尺寸、動畫格子、是否保留 ──────────────────
INV = {}
with open(OUT / "inventory.csv", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        INV[r["path"]] = r


def meta(path):
    """回傳 w, h, anim（檔名帶 (寬x高) 時以檔名為準，和 copy-assets.mjs 一致）"""
    r = INV.get(path, {})
    try:
        w, h = int(r.get("w") or 0), int(r.get("h") or 0)
    except ValueError:
        w, h = 0, 0
    anim = None
    if r.get("kind") == "anim":
        try:
            anim = {"cols": int(r["cols"]), "rows": int(r["rows"]), "frameW": int(r["frame_w"]), "frameH": int(r["frame_h"])}
        except (KeyError, ValueError):
            anim = None
    m = re.search(r"\((\d+)x(\d+)\)", Path(path).name)
    if m and w and h:
        fw, fh = int(m.group(1)), int(m.group(2))
        if w % fw == 0 and h % fh == 0 and (w > fw or h > fh):
            anim = {"cols": w // fw, "rows": h // fh, "frameW": fw, "frameH": fh}
    return {"w": w, "h": h, "anim": anim}


def usable(path):
    # 影片端（copy-assets / Sprite）只支援 PNG，其他格式（例如 .BMP）不列出
    if not path.lower().endswith(".png"):
        return False
    r = INV.get(path)
    return r is None or (r.get("keep") != "0" and r.get("kind") != "sheet")


# ── CLIP：背景載入一次 ─────────────────────────────────
CLIP = {"status": "loading", "model": None, "proc": None, "vecs": None, "paths": None}


def load_clip():
    try:
        import numpy as np
        import torch  # noqa: F401
        from transformers import ChineseCLIPModel, ChineseCLIPProcessor

        name = S.cfg.get("clip_model", "OFA-Sys/chinese-clip-vit-base-patch16")
        CLIP["model"] = ChineseCLIPModel.from_pretrained(name).eval()
        CLIP["proc"] = ChineseCLIPProcessor.from_pretrained(name)
        CLIP["vecs"] = np.load(OUT / "clip_vecs.npy").astype(np.float32)
        CLIP["paths"] = json.load(open(OUT / "clip_paths.json", encoding="utf-8"))
        CLIP["status"] = "ready"
        print("CLIP 已載入，以文搜圖可用")
    except Exception as e:  # 沒有 CLIP 環境時退回只用文字比對
        CLIP["status"] = f"unavailable: {e}"
        print("CLIP 無法載入，只用文字比對：", e)


# 素材的名稱與分類（assets.json 的文字描述；只有部分素材有）
INFO = {}
for it in json.load(open(OUT / "assets.json", encoding="utf-8")):
    INFO[it["path"]] = {"name": it.get("name", ""), "category": it.get("category", "")}


def clip_rank(q, folder, limit):
    """CLIP：全部素材依相似度排序，取前 limit 名（相似度分布很窄，用名次比用門檻穩定）"""
    if CLIP["status"] != "ready":
        return []
    import numpy as np
    import torch

    with torch.no_grad():
        t = S.as_tensor(CLIP["model"].get_text_features(**CLIP["proc"](text=[q], return_tensors="pt", padding=True)))
        t = torch.nn.functional.normalize(t, dim=-1).numpy()[0]
    sims = CLIP["vecs"] @ t
    paths = CLIP["paths"]
    if folder:
        sims[[not p.startswith(folder) for p in paths]] = -9
    idx = np.argsort(-sims)
    out = []
    for i in idx:
        s = float(sims[i])
        if s < -1 or len(out) >= limit:
            break
        out.append({"path": paths[i], "score": round(s, 4), "via": "clip"})
    return out


def enrich(r):
    r.update(meta(r["path"]))
    info = INFO.get(r["path"], {})
    r.setdefault("name", info.get("name", ""))
    if not r.get("name"):
        r["name"] = info.get("name", "")
    r["category"] = r.get("category") or info.get("category", "")
    return r


def do_search(q, folder, use_clip, clip_n=100):
    """關鍵詞命中全部列出（命中數高的在前），接著是 CLIP 畫面相似的前 clip_n 名"""
    res = [r for r in S.text_search(q, 100000, folder) if usable(r["path"])]
    seen = {r["path"] for r in res}
    if use_clip:
        added = 0
        for r in clip_rank(q, folder, clip_n * 2):
            if added >= clip_n:
                break
            if r["path"] not in seen and usable(r["path"]):
                res.append(r)
                seen.add(r["path"])
                added += 1
    return [enrich(r) for r in res]


def folder_list(max_depth=3, min_count=8):
    """資料夾清單（前三層、至少 min_count 張可用 PNG），給「限定資料夾 / 瀏覽資料夾」用"""
    counts = {}
    for p in INV:
        if not usable(p):
            continue
        parts = p.split("/")[:-1]
        for d in range(1, min(max_depth, len(parts)) + 1):
            k = "/".join(parts[:d])
            counts[k] = counts.get(k, 0) + 1
    return [{"path": k, "count": n, "depth": k.count("/") + 1} for k, n in sorted(counts.items()) if n >= min_count]


FOLDERS = folder_list()


def browse(folder, limit=5000):
    """瀏覽資料夾：列出這個路徑底下全部可用的 PNG"""
    paths = sorted(p for p in INV if p.startswith(folder) and usable(p))[:limit]
    return [enrich({"path": p, "via": "browse", "score": 0}) for p in paths]

# ── HTTP ────────────────────────────────────────────
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,40}$")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8", cache=False):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        # 素材圖可以快取（大量縮圖捲動時不重複下載）；API 不快取
        self.send_header("Cache-Control", "max-age=3600" if cache else "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        qs = parse_qs(u.query)
        p = unquote(u.path)
        if p == "/favicon.ico":
            return self.send(204, b"", "image/x-icon")
        if p in ("/", "/index.html"):
            return self.send(200, (HERE / "editor.html").read_bytes(), "text/html; charset=utf-8")
        if p == "/api/search":
            q = (qs.get("q") or [""])[0].strip()
            if not q:
                return self.send(200, {"results": []})
            folder = (qs.get("folder") or [""])[0]
            use_clip = (qs.get("clip") or ["1"])[0] == "1"
            clip_n = min(2000, int((qs.get("n") or ["100"])[0]))
            t0 = time.time()
            res = do_search(q, folder, use_clip, clip_n)
            return self.send(200, {"query": q, "results": res, "ms": int((time.time() - t0) * 1000), "clip": CLIP["status"]})
        if p == "/api/folders":
            return self.send(200, FOLDERS)
        if p == "/api/browse":
            folder = (qs.get("folder") or [""])[0]
            if not folder:
                return self.send(400, {"error": "請指定資料夾"})
            t0 = time.time()
            res = browse(folder)
            return self.send(200, {"query": folder, "results": res, "ms": int((time.time() - t0) * 1000), "clip": CLIP["status"]})
        if p == "/api/status":
            return self.send(200, {"clip": CLIP["status"]})
        if p == "/api/meta":
            path = (qs.get("path") or [""])[0]
            return self.send(200, {"path": path, **meta(path)})
        if p == "/api/host-poses":
            ch = json.load(open(ROOT / "Me_我的像素人物" / "character.json", encoding="utf-8"))
            return self.send(200, [{"name": x["name"], "path": f"Me_我的像素人物/{x['file']}", "w": x["width"], "h": x["height"]} for x in ch["poses"]])
        if p == "/api/stages":
            STAGES_DIR.mkdir(exist_ok=True)
            return self.send(200, sorted(f.stem for f in STAGES_DIR.glob("*.json")))
        if p == "/api/stage":
            name = (qs.get("name") or [""])[0]
            f = STAGES_DIR / f"{name}.json"
            if not NAME_RE.match(name) or not f.exists():
                return self.send(404, {"error": f"找不到舞台 {name}"})
            return self.send(200, f.read_bytes())
        if p.startswith("/lib/"):
            rel = p[len("/lib/"):]
            f = (ROOT / rel).resolve()
            # 只允許素材庫底下的圖片
            if ROOT.resolve() not in f.parents or f.suffix.lower() not in IMG_EXT or not f.exists():
                return self.send(404, {"error": "not found"})
            return self.send(200, f.read_bytes(), mimetypes.guess_type(str(f))[0] or "application/octet-stream", cache=True)
        return self.send(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        qs = parse_qs(u.query)
        if unquote(u.path) == "/api/stage":
            name = (qs.get("name") or [""])[0]
            if not NAME_RE.match(name):
                return self.send(400, {"error": "舞台名稱只能用小寫英文、數字、- 和 _"})
            body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
            try:
                spec = json.loads(body.decode("utf-8"))
            except ValueError as e:
                return self.send(400, {"error": f"JSON 格式錯誤：{e}"})
            STAGES_DIR.mkdir(exist_ok=True)
            spec["name"] = name
            (STAGES_DIR / f"{name}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
            return self.send(200, {"ok": True, "file": f"stages/{name}.json"})
        return self.send(404, {"error": "not found"})


class Server(ThreadingHTTPServer):
    # Windows 上 SO_REUSEADDR 會讓兩個程序同時綁同一個埠（舊的那個繼續回應）；關掉它，重複開啟時直接報錯
    allow_reuse_address = False


if __name__ == "__main__":
    try:
        srv = Server(("127.0.0.1", PORT), Handler)
    except OSError:
        sys.exit(f"埠 {PORT} 已被佔用：舞台編輯器可能已經開著（直接打開 http://localhost:{PORT}），或先關掉舊的再重開。")
    threading.Thread(target=load_clip, daemon=True).start()
    print(f"舞台編輯器：http://localhost:{PORT}  （Ctrl+C 結束）")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
