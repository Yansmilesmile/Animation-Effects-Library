import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera } from "../components/Camera";
import { Tag } from "../components/emphasis";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { Counter, CrowdGrid, LevelTitleCard, LevelTransition, Spotlight } from "../components/structure";
import { TopNav } from "../components/TopNav";
import { A, HOST_CENTER, HOST_FEET, LAMP_GLOW, StudyRoom } from "../scenes/StudyRoom";
import { LAYOUT } from "../theme";
import { At, Guide } from "./Showcase2";
import { Label } from "./Label";

/** 組件展示（第三批：結構類）。 */

const G = HOST_FEET;
const lamp = { type: "lamp" as const, ...LAMP_GLOW, radius: 50, cone: 40 };
const CHAPTERS = ["序章", "第一關｜找到專長", "第二關｜用槓桿", "第三關｜複利", "結尾"];

// ── C8 標題卡 → A6 俯仰推入 ───────────────────────
const TitleTiltDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelStage
      hud={<At f={8}><LevelTitleCard level={2} title="用槓桿放大自己" hold={50} /></At>}
      ui={
        <>
          <TopNav chapters={CHAPTERS} current={[{ at: 0, index: 1 }, { at: 8, index: 2 }]} />
          <Label name="LevelTitleCard → LevelTransition tilt" code="C8 → A6" note={f < 58 ? "標題卡：瞬間出現，停 2 秒" : "殘影錯位離場 → 俯仰推入書桌"} />
        </>
      }
    >
      <LevelTransition type="tilt" start={62} duration={30} to={{ x: 332, y: 150, zoom: 3 }}>
        <StudyRoom host={<Host pose="full_point_happy" x={200} y={G} />}>
          <Ambience layers={["dust", lamp]} />
        </StudyRoom>
      </LevelTransition>
    </PixelStage>
  );
};

// ── A21 圓形遮罩：收 → 黑 → 開到下一場 ──────────────
const IrisDemo: React.FC = () => {
  const f = useCurrentFrame();
  const switched = f >= 10 + 14 + 3; // 全黑期間切換場景
  return (
    <PixelStage
      background={switched ? "linear-gradient(#060a1e, #1b2a5c 70%, #2c3f78)" : undefined}
      hud={<At f={10}><LevelTransition type="iris" x={LAYOUT.centerX - 60} y={LAYOUT.groundY - 40} /></At>}
      ui={<Label name="LevelTransition iris" code="A21" note="圓形遮罩收到主角 → 全黑 6 幀（切場景）→ 打開" />}
    >
      <Camera>
        {switched ? (
          <>
            <Ambience layers={[{ type: "stars", count: 50, h: 150 }]} />
            <div style={{ position: "absolute", left: 0, top: G - 6, width: 480, height: 120, background: "#dfe8f5" }} />
            <Host pose="full_front" x={200} y={G} />
            <Ambience layers={[{ type: "snow", count: 70 }]} />
          </>
        ) : (
          <StudyRoom host={<Host pose="full_wave_talk" x={200} y={G} />}>
            <Ambience layers={["dust", lamp]} />
          </StudyRoom>
        )}
      </Camera>
    </PixelStage>
  );
};

// ── D1 / C41 / C20 / C62 計數器 ─────────────────────
const CounterDemo: React.FC = () => {
  const f = useCurrentFrame();
  const note =
    f < 45 ? "睡後收入：數字跳動" : f < 75 ? "同一台機器換標籤「工資」" : f < 120 ? "收入停 → 抖動、碎掉、紅色 0000（C20）" : "從今天開始：0001 復活跳動（C62）";
  const sleeping = f >= 60 && f < 120;
  return (
    <PixelStage ui={<Label name="Counter" code="D1 / C41 / C20 / C62" note={note} />}>
      <Camera>
        <StudyRoom host={<Host pose={sleeping ? "half_desk_sleep" : "full_front"} x={190} y={G} />}>
          <Ambience layers={["dust", lamp, ...(sleeping ? [{ type: "zzz" as const, x: 200, y: G - 34 }] : [])]} />
          <Counter
            x={272}
            y={G - 46}
            from={0}
            to={1280}
            countDuration={40}
            tickEvery={3}
            labels={[{ at: 0, text: "睡後收入" }, { at: 48, text: "工資" }, { at: 125, text: "睡後收入" }]}
            zeroAt={92}
            reviveAt={125}
            reviveEvery={6}
          />
          <At f={62} dur={30}><Tag text="收入：停" x={272} y={G - 68} variant="red" /></At>
          <Counter x={272} y={G - 2} variant="plain" prefix="已丟棄" from={0} to={98765} countDuration={150} comma digits={6} />
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

// ── A18 反向網格拉出 ───────────────────────────────
const PullOutDemo: React.FC = () => (
  <PixelStage ui={<Label name="CrowdGrid pull-out" code="A18" note="從主角拉遠成網格裡唯一的金框格 → 紅標籤 → 整面閃紅" />}>
    <CrowdGrid mode="pull-out" start={10} duration={50} label="其他人：按小時" labelAt={62} flashAt={66} />
  </PixelStage>
);

// ── A2 鎖定並推進 ──────────────────────────────────
const PushInDemo: React.FC = () => (
  <PixelStage ui={<Label name="CrowdGrid push-in" code="A2" note="其他格變暗、主角金框 → 推進到那一格" />}>
    <CrowdGrid mode="push-in" hero={{ col: 2, row: 1 }} heroPose="full_surprised_explain" start={20} duration={40} seed={8} />
  </PixelStage>
);

// ── A1 無限網格縮放 ────────────────────────────────
const ZoomOutDemo: React.FC = () => (
  <PixelStage
    hud={<Counter x={LAYOUT.centerX} y={20} variant="plain" prefix="已丟棄" from={1} to={1000000} countDuration={80} digits={7} comma />}
    ui={<Label name="CrowdGrid zoom-out" code="A1" note="持續拉遠到變成紋理，頂部計數器同步暴漲" />}
  >
    <CrowdGrid mode="zoom-out" cols={40} rows={26} start={0} duration={80} seed={5} />
  </PixelStage>
);

// ── A13 聚光燈收窄 ─────────────────────────────────
const SpotDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="Spotlight" code="A13" note="暗角越收越緊，只照亮人物和手裡的書" />}>
    <Camera>
      <StudyRoom host={<Host pose="half_read_paper" x={200} y={G} />}>
        <Ambience layers={["dust", lamp]} />
        <At f={10}><Spotlight x={200} y={HOST_CENTER + 10} to={34} /></At>
      </StudyRoom>
    </Camera>
  </PixelStage>
);

export const SHOWCASE3_SECTIONS: [React.FC, number][] = [
  [TitleTiltDemo, 110],
  [IrisDemo, 70],
  [CounterDemo, 175],
  [PullOutDemo, 100],
  [PushInDemo, 75],
  [ZoomOutDemo, 95],
  [SpotDemo, 80],
];
export const SHOWCASE3_DURATION = SHOWCASE3_SECTIONS.reduce((s, [, d]) => s + d, 0);

export const Showcase3: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOWCASE3_SECTIONS.map(([C, d], i) => {
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
