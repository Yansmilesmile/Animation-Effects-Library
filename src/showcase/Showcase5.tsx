import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera } from "../components/Camera";
import { QuestionBubble, SunBurst } from "../components/emphasis";
import { Host, hostAsset } from "../components/Host";
import { Inventory, ProfileCard } from "../components/panels";
import { PixelStage } from "../components/PixelStage";
import { DropStack, KeyDrop, PropSwap, SmokePop } from "../components/props";
import { Sprite } from "../components/Sprite";
import { A, HOST_FEET, LAMP_GLOW, StudyRoom } from "../scenes/StudyRoom";
import { LAYOUT } from "../theme";
import { Label } from "./Label";
import { At, Guide } from "./Showcase2";

/** 組件展示（第五批：C1、C2、C38、C43 道具類，B14 頭上問號，C36 人物資料卡，F7 道具欄）。 */

const G = HOST_FEET;
const lamp = { type: "lamp" as const, ...LAMP_GLOW, radius: 50, cone: 40 };

const Room: React.FC<{ children?: React.ReactNode; pose?: string; hostX?: number }> = ({ children, pose, hostX = 150 }) => (
  <Camera>
    <StudyRoom host={pose ? <Host pose={pose} x={hostX} y={G} /> : null}>
      <Ambience layers={["dust", lamp]} />
      {children}
    </StudyRoom>
  </Camera>
);

// ── C1 DropStack ──────────────────────────────────
const DropDemo: React.FC = () => {
  const f = useCurrentFrame();
  const note = f < 60 ? "紅色硬幣一個個掉下、堆高（icon coin、tone red）" : f < 95 ? "layout row：金幣往右排" : "count 1：單一道具帶彈跳落下（收銀機那種用法）";
  return (
    <PixelStage hud={<Guide />} ui={<Label name="DropStack" code="C1" note={note} />}>
      <Room pose="full_surprised_explain">
        <At f={6}><DropStack x={210} y={G} icon="coin" tone="red" count={7} scale={2} /></At>
        <At f={60}><DropStack x={250} y={G} icon="coin" count={5} every={4} layout="row" scale={2} /></At>
        <At f={95}><DropStack x={320} y={G - 20} asset={A.chest} count={1} fall={90} fallFrames={10} /></At>
      </Room>
    </PixelStage>
  );
};

// ── C2 PropSwap ───────────────────────────────────
const SwapDemo: React.FC = () => {
  const f = useCurrentFrame();
  const note = f < 45 ? "from → to：寶箱瞬間換成書，冒一小團灰" : f < 90 ? "shrinkTo：金幣縮小、壓暗、移到角落（放到一邊）" : "只寫 dust：書落桌揚起灰塵";
  return (
    <PixelStage hud={<Guide />} ui={<Label name="PropSwap" code="C2" note={note} />}>
      <Room pose="full_front" hostX={150}>
        <PropSwap x={230} y={G} from={A.chest} to={A.book} at={20} />
        <At f={45} dur={45}><PropSwap x={300} y={G} from={A.coin} at={12} shrinkTo={{ x: 360, y: G - 2, scale: 0.5, dim: 0.5 }} /></At>
        <At f={90}><Sprite asset={A.book} x={300} y={G} /></At>
        <At f={100}><PropSwap x={300} y={G} /></At>
      </Room>
    </PixelStage>
  );
};

// ── C38 SmokePop ──────────────────────────────────
const SmokeDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="SmokePop" code="C38" note="煙霧中依次登場，頭上名牌，之後頭頂彈出小標籤；左右對稱" />}>
    <Room>
      <At f={6}><SmokePop x={240} y={G} asset={hostAsset("full_front")} label="主角" tag="$1/年" tagVariant="red" /></At>
      <At f={22}><SmokePop x={180} y={G} asset={hostAsset("full_point_happy")} label="同事 A" tag="$1/年" tagAt={18} /></At>
      <At f={30}><SmokePop x={300} y={G} asset={hostAsset("full_wave_talk")} flipX label="同事 B" tag="$1/年" tagAt={18} /></At>
    </Room>
  </PixelStage>
);

// ── C43 KeyDrop ───────────────────────────────────
const KeyDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="KeyDrop" code="C43" note="三把鑰匙閃現 → 飛到落點 → 地面光圈；第三把冒標籤後變成寶箱" />}>
    <Room>
      {/* 落點：地上三個小圓台 */}
      {[170, 240, 310].map((x) => (
        <div key={x} style={{ position: "absolute", left: x - 12, top: G - 2, width: 24, height: 4, background: "#3a2a1e", borderRadius: "50%" }} />
      ))}
      <At f={6}><KeyDrop x={170} y={G} fromX={200} fromY={40} label="路" /></At>
      <At f={12}><KeyDrop x={240} y={G} fromX={240} fromY={34} label="廣告" /></At>
      <At f={18}><KeyDrop x={310} y={G} fromX={280} fromY={40} label="利潤" morphTo={A.chest} morphAt={50} /></At>
    </Room>
  </PixelStage>
);

// ── B14 QuestionBubble ────────────────────────────
const BubbleDemo: React.FC = () => (
  <PixelStage hud={<Guide />} ui={<Label name="QuestionBubble" code="B14" note="頭頂白底「?」泡泡（3 幀回彈、輕浮動）；第二次帶一句反問" />}>
    <Room pose="full_front" hostX={200}>
      <At f={8} dur={50}><QuestionBubble x={200} y={G - 54} /></At>
      <At f={58}><QuestionBubble x={200} y={G - 54} question="你就會更開心嗎？" /></At>
    </Room>
  </PixelStage>
);

// ── C36 ProfileCard（hud）────────────────────────
const CardDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelStage
      background="linear-gradient(#0b0f22, #05060c)"
      hud={
        <>
          {f < 75 ? (
            <>
              <At f={4}><SunBurst x={LAYOUT.centerX} y={92} radius={110} /></At>
              <At f={4}><ProfileCard name="超級人機" title="知識頻道主持人" badge="會寫程式" stat="47 秒" avatar={hostAsset("bust_front")} avatarScale={1} x={LAYOUT.centerX} y={60} /></At>
            </>
          ) : (
            <At f={75}><ProfileCard name="雷軍" title="小米創辦人" avatar={hostAsset("bust_front")} avatarScale={1} layout="column" from="right" x={360} y={40} /></At>
          )}
        </>
      }
      ui={<Label name="ProfileCard" code="C36" note={f < 75 ? "橫式：頭像 + 名字 + 紅頭銜 + 金標籤 + 大數字（背後 SunBurst 另加）" : "直式，從右側滑入"} />}
    >
      <Ambience layers={[{ type: "dust", count: 30 }]} />
    </PixelStage>
  );
};

// ── F7 Inventory（hud）───────────────────────────
const InvDemo: React.FC = () => (
  <PixelStage
    hud={
      <At f={6}>
        <Inventory
          slots={3}
          items={[
            { at: 30, icon: "key", label: "第一把鑰匙" },
            { at: 60, icon: "key", label: "第二把鑰匙" },
            { at: 90, icon: "coin", tone: "red", label: "測試：紅幣" },
          ]}
        />
      </At>
    }
    ui={<Label name="Inventory" code="F7" note="左上角空格依次彈出 → 道具放進格子（光環 + 下方小標籤 45 幀）" />}
  >
    <Room pose="full_point_happy" hostX={200} />
  </PixelStage>
);

export const SHOWCASE5_SECTIONS: [React.FC, number][] = [
  [DropDemo, 130],
  [SwapDemo, 130],
  [SmokeDemo, 75],
  [KeyDemo, 90],
  [BubbleDemo, 110],
  [CardDemo, 130],
  [InvDemo, 140],
];
export const SHOWCASE5_DURATION = SHOWCASE5_SECTIONS.reduce((s, [, d]) => s + d, 0);

export const Showcase5: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOWCASE5_SECTIONS.map(([C, d], i) => {
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
