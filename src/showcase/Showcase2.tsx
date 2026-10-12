import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera } from "../components/Camera";
import { BeamDrop, GlowText, MissPop, RingPulse, Stamp, SunBurst, Tag } from "../components/emphasis";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { SubtitleLine, Subtitles } from "../components/Subtitle";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { A, HOST_CENTER, HOST_FEET, LAMP_GLOW, StudyRoom } from "../scenes/StudyRoom";
import { color, FONT_PIXEL, LAYOUT, PIXEL } from "../theme";
import { Label } from "./Label";

/** 組件展示（第二批：強調類）。場景用 Camera 預設取景（1.5 倍），人物站在畫面 80% 的地面線。 */

export const At: React.FC<{ f: number; dur?: number; children: React.ReactNode }> = ({ f, dur, children }) => (
  <Sequence from={f} durationInFrames={dur} layout="none">
    {children}
  </Sequence>
);

const G = HOST_FEET; // 世界地面線
const lamp = { type: "lamp" as const, ...LAMP_GLOW, radius: 50, cone: 40 };

// 畫面 80% 的地面參考線（只在展示片裡畫，方便檢查構圖）
export const Guide: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: LAYOUT.groundY, width: PIXEL.width, height: 0, borderTop: "1px dashed rgba(120,200,255,0.35)" }} />
);

const Room: React.FC<{ children?: React.ReactNode; pose?: string; hostX?: number }> = ({ children, pose = "full_front", hostX = 200 }) => (
  <Camera>
    <StudyRoom host={<Host pose={pose} x={hostX} y={G} />}>
      <Ambience layers={["dust", lamp]} />
      {children}
    </StudyRoom>
  </Camera>
);

// ── B1 RingPulse ───────────────────────────────────
const RingDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="RingPulse" code="B1" note="15 幀；中心白光 + 細線圓環 + 點狀粒子" />}>
    <Room pose="full_point_happy">
      <Sprite asset={A.chest} x={262} y={G} />
      <Sprite asset={A.coin} x={300} y={G} />
      <At f={10}><RingPulse x={262} y={G - 15} /></At>
      <At f={40}><RingPulse x={300} y={G - 16} color={color.goldLight} /></At>
      <At f={70}><RingPulse x={200} y={HOST_CENTER} radius={44} /></At>
    </Room>
  </PixelStage>
);

// ── B2 / B13 / B11 Tag ─────────────────────────────
const TagDemo: React.FC = () => {
  const f = useCurrentFrame();
  const note = f < 45 ? "red 紅底金邊（pop 回彈）" : f < 80 ? "dark 深底金邊（instant 瞬間）" : f < 118 ? "hang 吊牌價籤 B13" : "locked 未解鎖卡 B11";
  return (
    <PixelStage hud={<Guide />} ui={<Label name="Tag" code="B2 / B13 / B11" note={note} />}>
      <Room pose="full_surprised_explain">
        <Sprite asset={A.chest} x={280} y={G} />
        <At f={10} dur={35}><Tag text="能力圈" x={200} y={HOST_FEET - 54} variant="red" /></At>
        <At f={45} dur={35}><Tag text="一生一張卡" x={280} y={G - 34} variant="dark" appear="instant" /></At>
        <At f={80} dur={38}><Tag text="替代價 ¥9.9" x={200} y={HOST_CENTER + 18} variant="hang" /></At>
        <At f={118}><Tag text="×2 未解鎖" x={262} y={HOST_CENTER} variant="locked" /></At>
      </Room>
    </PixelStage>
  );
};

// ── B6 / B3 Stamp ──────────────────────────────────
const PayCard: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div
    style={{
      position: "absolute",
      left: x - 50,
      top: y - 28,
      width: 100,
      height: 56,
      background: "#F4E6C4",
      border: `1px solid ${color.goldDark}`,
      boxShadow: `0 0 0 1px ${color.ink}, 0 3px 0 1px rgba(0,0,0,0.5)`,
      fontFamily: FONT_PIXEL,
      fontSize: 12,
      color: "#5a3a1a",
      textAlign: "center",
      lineHeight: 1,
    }}
  >
    <div style={{ background: color.gold, color: color.ink, padding: "3px 0" }}>工資條・年薪</div>
    <div style={{ marginTop: 14, fontSize: 12 }}>¥ ????</div>
  </div>
);
const StampDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelStage
      background="linear-gradient(#2a1414, #120808)"
      hud={<Guide />}
      ui={<Label name="Stamp" code="B6 / B3 + A9" note={f < 75 ? "stamp：斜拍、3 幀落定" : "x：✕ 拍上 + 畫面泛紅 12 幀"} />}
    >
      <Camera>
        <PayCard x={236} y={G - 40} />
        <Sprite asset={A.chest} x={340} y={G} scale={2} />
        <Host pose="full_nervous_teary" x={130} y={G} />
        <Ambience layers={["dust"]} />
        <At f={20}><Stamp x={246} y={G - 34} text="0" size={3} /></At>
        <At f={75}><Stamp x={340} y={G - 24} variant="x" size={3} /></At>
      </Camera>
    </PixelStage>
  );
};

// ── B5 SunBurst ────────────────────────────────────
const SunDemo: React.FC = () => (
  <PixelStage background="#07080f" hud={<Guide />} ui={<Label name="SunBurst" code="B5" note="放射光：8 幀展開，之後持續旋轉" />}>
    <Camera>
      <At f={8}><SunBurst x={240} y={G - 40} radius={90} /></At>
      <Sprite asset={A.chest} x={240} y={G} scale={3} glow={color.goldLight} />
      <At f={8}><RingPulse x={240} y={G - 40} radius={50} color={color.goldLight} /></At>
      <Ambience layers={[{ type: "confetti", x: 170, w: 140, y: 16, h: G - 16 }]} />
    </Camera>
  </PixelStage>
);

// ── B7 GlowText（hud：畫面座標）──────────────────────
const GlowDemo: React.FC = () => {
  const f = useCurrentFrame();
  const Y = LAYOUT.focusY;
  return (
    <PixelStage
      background="linear-gradient(#0b0f22, #05060c)"
      hud={
        <>
          {f < 45 ? <GlowText text="最差" x={240} y={Y} color="red" /> : null}
          {f >= 45 && f < 90 ? <At f={45}><GlowText text="最好" x={240} y={Y} color="gold" crown /></At> : null}
          {f >= 90 ? <At f={90}><GlowText text="×10,000" x={240} y={Y} color="gold" size={4} appear="pop" /></At> : null}
        </>
      }
      ui={<Label name="GlowText" code="B7" note="同一位置：最差（紅）→ 最好（金＋王冠）→ ×10,000" />}
    >
      <Ambience layers={[{ type: "dust", count: 30 }]} />
    </PixelStage>
  );
};

// ── B12 BeamDrop ───────────────────────────────────
const BeamDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="BeamDrop" code="B12 + B4" note="全黑 → 光柱 → 星 → 物件降下 → 落地光環 + 發光" />}>
    <Camera>
      <At f={6}><BeamDrop asset={A.book} scale={2} /></At>
    </Camera>
  </PixelStage>
);

// ── B10 MissPop ────────────────────────────────────
const MissDemo: React.FC = () => {
  const f = useCurrentFrame();
  const punch = f >= 12 && f < 18;
  return (
    <PixelStage hud={<Guide />} ui={<Label name="MissPop" code="B10" note="打向工時柱 → MISS → 頭上「+1 小時」+ 汗滴" />}>
      <Room pose={punch ? "full_point_nervous" : "full_front"} hostX={210}>
        {/* 工時柱（佔位：紅色條紋柱） */}
        <div
          style={{
            position: "absolute",
            left: 252,
            top: G - 74,
            width: 24,
            height: 74,
            background: `repeating-linear-gradient(to bottom, ${color.red} 0 6px, ${color.redDark} 6px 8px)`,
            boxShadow: `0 0 0 1px ${color.ink}`,
          }}
        />
        <At f={14}><MissPop x={264} y={G - 78} floatText="+1 小時" floatX={210} floatY={G - 54} /></At>
      </Room>
    </PixelStage>
  );
};

// ── 合成：字幕高亮詞 = 觸發點 ─────────────────────
const LINES: SubtitleLine[] = [
  { start: 0, end: 75, text: "每打一個孔，就是一次重大決定", highlight: [{ word: "重大決定", at: 32 }] },
  { start: 75, end: 165, text: "但你的作品，可以賣一萬次", highlight: [{ word: "一萬次", at: 108 }] },
];
const at = (word: string) => {
  for (const l of LINES) for (const h of l.highlight ?? []) if (typeof h !== "string" && h.word === word && h.at !== undefined) return h.at;
  throw new Error(`找不到高亮詞：${word}`);
};
const ComboDemo: React.FC = () => (
  <PixelStage
    hud={<At f={at("一萬次")}><GlowText text="×10,000" x={330} y={64} size={3} appear="pop" /></At>}
    ui={
      <>
        <TopNav chapters={["序章", "第一關｜找到專長", "第二關｜用槓桿", "結尾"]} current={2} />
        <Watermark topic="納瓦爾寶典" />
        <Subtitles lines={LINES} />
        <Label name="合成" code="高亮詞觸發" note="「重大決定」→ RingPulse + Tag；「一萬次」→ SunBurst + GlowText" />
      </>
    }
  >
    <Camera moves={[{ type: "push", start: 0, duration: 60, to: { x: 245, y: HOST_CENTER - 4, zoom: 2 } }]}>
      <StudyRoom host={<Host pose="full_point_happy" x={200} y={G} />}>
        <Ambience layers={["dust", lamp]} />
        <At f={at("一萬次")}><SunBurst x={272} y={G - 14} radius={56} /></At>
        <Sprite asset={A.chest} x={272} y={G} />
        <At f={at("重大決定")}><RingPulse x={272} y={G - 15} /></At>
        <At f={at("重大決定")}><Tag text="一生一張卡" x={272} y={G - 32} variant="red" /></At>
      </StudyRoom>
    </Camera>
  </PixelStage>
);

export const SHOWCASE2_SECTIONS: [React.FC, number][] = [
  [RingDemo, 100],
  [TagDemo, 160],
  [StampDemo, 120],
  [SunDemo, 90],
  [GlowDemo, 135],
  [BeamDemo, 75],
  [MissDemo, 75],
  [ComboDemo, 165],
];
export const SHOWCASE2_DURATION = SHOWCASE2_SECTIONS.reduce((s, [, d]) => s + d, 0);

export const Showcase2: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOWCASE2_SECTIONS.map(([C, d], i) => {
        const from = t;
        t += d;
        return (
          <Sequence key={i} from={from} durationInFrames={d}>
            <C />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
