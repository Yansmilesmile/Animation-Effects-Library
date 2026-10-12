import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CameraMove } from "../components/Camera";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { Subtitles, SubtitleLine } from "../components/Subtitle";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { A, HOST_CENTER, HOST_FEET, LAMP_GLOW, StudyRoom } from "../scenes/StudyRoom";
import { color } from "../theme";
import { Caption, Label } from "./Label";

/** 組件展示（第零批 Sprite/Host + 第一批畫面基底），每段單獨演示一個組件。 */

// ── 第零批：Sprite + Host ─────────────────────────────
const SpriteDemo: React.FC = () => {
  const row1 = 120;
  const row2 = 220;
  const items1: [React.ReactNode, number, string][] = [
    [<Sprite asset={A.coin} x={40} y={row1} />, 40, "32×32"],
    [<Sprite asset={A.chest} x={95} y={row1} />, 95, "30×30"],
    [<Sprite asset={A.moon} x={145} y={row1} />, 145, "12×14"],
    [<Sprite asset={A.plantMonster} x={200} y={row1} />, 200, "動畫 11 格"],
    [<Sprite asset={A.slime} x={265} y={row1} animFps={12} />, 265, "動畫 12fps"],
    [<Host pose="full_front" x={330} y={row1} />, 330, "主持人"],
    [<Host pose="full_point_happy" x={385} y={row1} />, 385, "point_happy"],
    [<Host pose="half_laptop" x={445} y={row1} />, 445, "half_laptop"],
  ];
  const items2: [React.ReactNode, number, string][] = [
    [<Sprite asset={A.chest} x={50} y={row2} tint="red" />, 50, "tint red"],
    [<Sprite asset={A.chest} x={120} y={row2} tint="gray" />, 120, "tint gray"],
    [<Sprite asset={A.coin} x={190} y={row2} glow={color.gold} />, 190, "glow"],
    [<Host pose="full_point_happy" x={260} y={row2} flipX />, 260, "flipX"],
    [<Sprite asset={A.chest} x={340} y={row2} scale={2} />, 340, "scale 2"],
    [<Sprite asset="不存在/的素材.png" x={410} y={row2 - 40} anchor="top-left" />, 0, ""],
  ];
  return (
    <PixelStage
      background="linear-gradient(#10162e, #0a0e1c)"
      bloom={0.3}
      ui={
        <>
          {[...items1.map((i) => [i[1], row1 + 2, i[2]] as const), ...items2.map((i) => [i[1], row2 + 2, i[2]] as const)]
            .filter((c) => c[2])
            .map(([x, y, t], k) => (
              <Caption key={k} x={x} y={y} text={t} />
            ))}
          <Caption x={440} y={row2 - 50} text="錯誤素材 → 紅框" c={color.redLight} />
          <Label name="Sprite / Host" code="第零批" note="所有素材同一個像素大小；動畫逐格、不補間" />
        </>
      }
    >
      <div style={{ position: "absolute", left: 0, top: row1, width: 480, height: 1, background: "#2a3260" }} />
      <div style={{ position: "absolute", left: 0, top: row2, width: 480, height: 1, background: "#2a3260" }} />
      {items1.map((i, k) => (
        <React.Fragment key={k}>{i[0]}</React.Fragment>
      ))}
      {items2.map((i, k) => (
        <React.Fragment key={`b${k}`}>{i[0]}</React.Fragment>
      ))}
      <Ambience layers={[{ type: "dust", count: 20 }]} />
    </PixelStage>
  );
};

// ── 1. PixelStage：光影層開關對比 ─────────────────────
const StageDemo: React.FC = () => {
  const f = useCurrentFrame();
  const on = f >= 60;
  return (
    <PixelStage
      bloom={on ? 0.45 : 0}
      vignette={on ? 0.6 : 0}
      ui={<Label name="PixelStage" code="一、整體風格" note={on ? "光影層 開：bloom + 暗角 + 背景景深" : "光影層 關：只有像素層"} />}
    >
      <Camera>
        <StudyRoom host={<Host pose="full_wave_talk" x={200} y={HOST_FEET} />}>
          {on ? <Ambience layers={[{ type: "lamp", ...LAMP_GLOW, radius: 50, cone: 40 }]} /> : null}
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

// ── 2. Camera：push → pan → pull → tilt-push ─────────
const CAMERA_MOVES: CameraMove[] = [
  { type: "push", start: 15, duration: 40, to: { x: 200, y: HOST_CENTER, zoom: 2.5 } },
  { type: "pan", start: 80, duration: 40, to: { x: 332, y: 140 } },
  { type: "pull", start: 145, duration: 40, to: { x: 240, y: 135, zoom: 1 } },
  { type: "tilt-push", start: 210, duration: 30, to: { x: 332, y: 150, zoom: 2.5, tilt: 30 } },
];
const CameraDemo: React.FC = () => {
  const f = useCurrentFrame();
  const cur = [...CAMERA_MOVES].reverse().find((m) => f >= m.start);
  return (
    <PixelStage ui={<Label name="Camera" code="A4 / A5 / A6" note={cur ? `${cur.type}  ${JSON.stringify(cur.to)}` : "靜止"} />}>
      <Camera moves={CAMERA_MOVES}>
        <StudyRoom host={<Host pose="full_point_happy" x={200} y={HOST_FEET} />}>
          <Ambience layers={["dust", { type: "lamp", ...LAMP_GLOW, radius: 50, cone: 40 }]} />
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

// ── 3. Ambience：三種組合 ──────────────────────────────
const AmbienceDemo: React.FC = () => {
  const f = useCurrentFrame();
  const part = Math.min(2, Math.floor(f / 90));
  if (part === 0) {
    return (
      <PixelStage ui={<Label name="Ambience" code="G" note="dust 灰塵 + lamp 燈光呼吸" />}>
        <Camera>
          <StudyRoom host={<Host pose="half_laptop" x={200} y={HOST_FEET} />}>
            <Ambience layers={[{ type: "dust", count: 60 }, { type: "lamp", ...LAMP_GLOW, radius: 70, cone: 50, period: 60 }]} />
          </StudyRoom>
        </Camera>
      </PixelStage>
    );
  }
  if (part === 1) {
    return (
      <PixelStage
        background="linear-gradient(#060a1e, #1b2a5c 70%, #2c3f78)"
        ui={<Label name="Ambience" code="G" note="stars 星星閃爍 + snow 飄雪" />}
      >
        <Camera>
          <Ambience layers={[{ type: "stars", count: 60, h: 150 }]} />
          <Sprite asset={A.moon} x={350} y={60} scale={2} />
          <div style={{ position: "absolute", left: 0, top: HOST_FEET - 6, width: 480, height: 120, background: "#dfe8f5" }} />
          <div style={{ position: "absolute", left: 0, top: HOST_FEET - 6, width: 480, height: 2, background: "#ffffff" }} />
          <Host pose="full_back" x={240} y={HOST_FEET} />
          <Ambience layers={[{ type: "snow", count: 90 }]} />
        </Camera>
      </PixelStage>
    );
  }
  return (
    <PixelStage background="#05060c" ui={<Label name="Ambience" code="G" note="beam 聚光燈浮塵 + confetti 金色碎屑 + zzz 睡覺" />}>
      <Camera>
        <Ambience layers={[{ type: "beam", x: 180, width: 60, top: 0, bottom: HOST_FEET + 4 }]} />
        <Sprite asset={A.chest} x={180} y={HOST_FEET} scale={2} glow={color.gold} />
        <Ambience layers={[{ type: "confetti", x: 130, w: 100, y: 0, h: HOST_FEET }]} />
        <Host pose="half_desk_sleep" x={310} y={HOST_FEET} />
        <Ambience layers={[{ type: "zzz", x: 320, y: HOST_FEET - 34 }, { type: "lamp", x: 310, y: HOST_FEET - 14, radius: 40, color: "#6f8fff" }]} />
      </Camera>
    </PixelStage>
  );
};

// ── 4. Subtitle ─────────────────────────────────────
const LINES: SubtitleLine[] = [
  { start: 0, end: 60, text: "每打一個孔，就是一次重大決定", highlight: [{ word: "重大決定", at: 30 }] },
  { start: 60, end: 120, text: "前十年像木棍，後十年是神劍", highlight: ["木棍", "神劍"] },
  { start: 120, end: 180, text: "這裡是超級人機，我們下一期見", highlight: ["超級人機"] },
];
const SubtitleDemo: React.FC = () => (
  <PixelStage
    ui={
      <>
        <Subtitles lines={LINES} />
        <Label name="Subtitle" code="F3" note="白字粗描邊，關鍵詞金橙色；換句 2 幀" />
      </>
    }
  >
    <Camera>
      <StudyRoom host={<Host pose="full_mic_talk" x={200} y={HOST_FEET} />}>
        <Ambience layers={["dust", { type: "lamp", ...LAMP_GLOW, radius: 50, cone: 40 }]} />
      </StudyRoom>
    </Camera>
  </PixelStage>
);

// ── 5. TopNav + Watermark ───────────────────────────
const CHAPTERS = ["序章", "第一關｜找到專長", "第二關｜用槓桿", "第三關｜複利", "結尾"];
const NavDemo: React.FC = () => (
  <PixelStage
    ui={
      <>
        <TopNav chapters={CHAPTERS} enterAt={10} current={[{ at: 10, index: 0 }, { at: 50, index: 1 }, { at: 90, index: 2 }, { at: 130, index: 3 }]} />
        <Watermark topic="納瓦爾寶典" />
        <Label name="TopNav / Watermark" code="F2 / F6" note="高亮切換：瞬間 + 3 幀回彈" />
      </>
    }
  >
    <Camera>
      <StudyRoom host={<Host pose="full_front" x={200} y={HOST_FEET} />}>
        <Ambience layers={["dust", { type: "lamp", ...LAMP_GLOW, radius: 50, cone: 40 }]} />
      </StudyRoom>
    </Camera>
  </PixelStage>
);

// ── 6. 全部一起 ──────────────────────────────────────
const AllDemo: React.FC = () => (
  <PixelStage
    ui={
      <>
        <TopNav chapters={CHAPTERS} current={1} />
        <Watermark topic="納瓦爾寶典" />
        <Subtitles
          lines={[
            { start: 0, end: 90, text: "你的時間，只能賣一次", highlight: ["賣一次"] },
            { start: 90, end: 180, text: "但你的作品，可以賣一萬次", highlight: ["一萬次"] },
          ]}
        />
        <Label name="第一批合成" code="PixelStage + Camera + Ambience + Subtitle + TopNav + Watermark" />
      </>
    }
  >
    <Camera moves={[{ type: "push", start: 0, duration: 90, to: { x: 250, y: HOST_CENTER, zoom: 2 } }]}>
      <StudyRoom host={<Host pose="full_surprised_explain" x={220} y={HOST_FEET} />}>
        <Ambience layers={[{ type: "dust", count: 50 }, { type: "lamp", ...LAMP_GLOW, radius: 60, cone: 45 }]} />
      </StudyRoom>
    </Camera>
  </PixelStage>
);

export const SHOWCASE1_SECTIONS: [React.FC, number][] = [
  [SpriteDemo, 150],
  [StageDemo, 120],
  [CameraDemo, 270],
  [AmbienceDemo, 270],
  [SubtitleDemo, 180],
  [NavDemo, 170],
  [AllDemo, 180],
];
export const SHOWCASE1_DURATION = SHOWCASE1_SECTIONS.reduce((s, [, d]) => s + d, 0);

export const Showcase1: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOWCASE1_SECTIONS.map(([C, d], i) => {
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
