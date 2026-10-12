import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Ambience } from "../components/Ambience";
import { Camera, CAMERA_HOME, worldToScreen } from "../components/Camera";
import { ChestDeal, chestFanPosition, GamePopup, NextTeaser, SkillCard, SkillSummary } from "../components/ending";
import { Host } from "../components/Host";
import { PixelStage } from "../components/PixelStage";
import { Sprite } from "../components/Sprite";
import { SubtitleLine, Subtitles } from "../components/Subtitle";
import { Spotlight } from "../components/structure";
import { TopNav } from "../components/TopNav";
import { Watermark } from "../components/Watermark";
import { A, HOST_CENTER, HOST_FEET, LAMP_GLOW, StudyRoom } from "../scenes/StudyRoom";
import { color, FONT_PIXEL } from "../theme";
import { At } from "./Showcase2";
import { Label } from "./Label";

/** 組件展示（第四批：片尾模板）——照詞典「片尾模板」的順序演一遍。 */

const G = HOST_FEET;
const lamp = { type: "lamp" as const, ...LAMP_GLOW, radius: 50, cone: 40 };
const CHAPTERS = ["序章", "第一關｜找到專長", "第二關｜用槓桿", "第三關｜複利", "結尾"];
const CHEST_X = 262;

// ── 技能卡裡的示範小動畫（座標是示範框 126×84 的區域座標）────────
const demoText = (t: string, c: string = color.white): React.CSSProperties => ({ fontFamily: FONT_PIXEL, fontSize: 12, lineHeight: 1, color: c, whiteSpace: "nowrap" });

// 技能 1「做十年的事」：樹苗一年年長大（整數倍放大，維持像素一致）
const DemoTenYears: React.FC<{ t: number }> = ({ t }) => {
  const stage = t < 18 ? 0 : t < 36 ? 1 : 2;
  const year = ["第 1 年", "第 5 年", "第 10 年"][stage];
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "#2a3a1c" }} />
      <Sprite asset={A.plant} x={63} y={76} scale={stage + 1} />
      <div style={{ position: "absolute", left: 6, top: 6, ...demoText("", stage === 2 ? color.goldLight : color.white) }}>{year}</div>
    </>
  );
};

// 技能 2「每天一點點」：7 格打卡逐一打勾；念到「斷」時最後一格碎掉變紅
const DemoDaily: React.FC<{ t: number }> = ({ t }) => (
  <>
    {Array.from({ length: 7 }, (_, i) => {
      const ticked = t >= 4 + i * 5 && i < 6;
      const broken = i === 6 && t >= 42;
      const fall = broken ? Math.min(30, (t - 42) * 2) : 0;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 7 + i * 16,
            top: 30 + fall,
            width: 14,
            height: 14,
            background: broken ? color.redDark : ticked ? color.goldDark : "#26315a",
            boxShadow: `inset 0 0 0 1px ${broken ? color.red : ticked ? color.gold : color.navyLight}`,
            transform: broken ? `rotate(${fall * 3}deg)` : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...demoText("", broken ? color.redLight : color.white),
          }}
        >
          {broken ? "✕" : ticked ? "✓" : ""}
        </div>
      );
    })}
    <div style={{ position: "absolute", left: 6, top: 8, ...demoText("") }}>第 {Math.min(6, Math.max(0, Math.floor((t - 4) / 5) + 1))} 天</div>
  </>
);

// 技能 3「看一年後」：望遠鏡裡的「今天」變成金色月亮「一年後」
const DemoFuture: React.FC<{ t: number }> = ({ t }) => {
  const future = t >= 22;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 33,
          top: 8,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: future ? "radial-gradient(circle, #2b2a55, #0b0f20)" : "#141a33",
          boxShadow: `inset 0 0 0 2px ${color.navyLight}, 0 0 0 2px ${color.ink}`,
          overflow: "hidden",
        }}
      >
        {future ? <Sprite asset={A.moon} x={30} y={36} scale={2} glow={color.goldLight} /> : null}
        {!future ? <div style={{ position: "absolute", left: 0, right: 0, top: 24, textAlign: "center", ...demoText("", color.gray) }}>今天</div> : null}
      </div>
      {future ? <div style={{ position: "absolute", left: 0, right: 0, top: 72, textAlign: "center", ...demoText("", color.goldLight) }}>一年後</div> : null}
    </>
  );
};

const SKILLS = [
  { title: "做十年的事", desc: "選一件願意做十年的事", Demo: DemoTenYears },
  { title: "每天一點點", desc: "小到不會斷，斷了重來", Demo: DemoDaily },
  { title: "看一年後", desc: "別看今天，看一年後", Demo: DemoFuture },
];

// 技能段的時間表（相對於這一段）
const CARD_START = [90, 175, 260];
const CARD_LEN = 80;
const SUMMARY_AT = 350;

const LINES_SKILLS: SubtitleLine[] = [
  { start: 0, end: 90, text: "最後，送你三個今天就能用的技能", highlight: [{ word: "三個", at: 36 }] },
  { start: 90, end: 175, text: "第一，選一件願意做十年的事", highlight: ["十年"] },
  { start: 175, end: 260, text: "第二，小到不會斷，斷了就重來", highlight: ["斷"] },
  { start: 260, end: 350, text: "第三，別看今天，看一年後的自己", highlight: ["一年後"] },
  { start: 350, end: 410, text: "三個技能，已經全部交給你了", highlight: ["全部"] },
];

const SkillsScene: React.FC = () => {
  const f = useCurrentFrame();
  const note =
    f < 90 ? "ChestDeal C24：掉落彈跳 → 搖晃透光 → 半開 → 全開 → 三張「?」卡扇形飛出" : f < SUMMARY_AT ? "SkillCard C25 + C11：飛到中央 → 翻面 → 示範動畫 → 收到左上角（C59）" : "SkillSummary C59：飛回扇形展開「已習得 3/3」";
  return (
    <PixelStage
      hud={
        <>
          {SKILLS.map((s, i) => {
            const fan = chestFanPosition(i, 3, CHEST_X);
            const from = worldToScreen(CAMERA_HOME, fan.x, fan.y);
            return (
              <Sequence key={i} from={CARD_START[i]} durationInFrames={SUMMARY_AT - CARD_START[i]} layout="none">
                <SkillCard
                  index={i + 1}
                  title={s.title}
                  desc={s.desc}
                  from={{ x: from.x, y: from.y, scale: 0.2, rotate: fan.rotate }}
                  collectAt={CARD_LEN}
                  renderDemo={(t) => (t >= 0 ? <s.Demo t={t} /> : null)}
                />
              </Sequence>
            );
          })}
          <At f={SUMMARY_AT}>
            <SkillSummary cards={SKILLS.map((s) => ({ ...s, renderDemo: (t: number) => <s.Demo t={t} /> }))} />
          </At>
        </>
      }
      ui={
        <>
          <TopNav chapters={CHAPTERS} current={4} />
          <Watermark topic="片尾模板" />
          <Subtitles lines={LINES_SKILLS} />
          <Label name="第四批" code="C24 / C25 / C11 / C59" note={note} />
        </>
      }
    >
      <Camera>
        <StudyRoom host={<Host pose="full_point_happy" x={176} y={G} />}>
          <Ambience layers={["dust", lamp]} />
          <ChestDeal x={CHEST_X} takeAt={CARD_START} />
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

// ── 關注 + 留言 ─────────────────────────────────
const LINES_CTA: SubtitleLine[] = [
  { start: 0, end: 60, text: "如果有幫到你，點個關注，一起闖下一關", highlight: ["關注"] },
  { start: 60, end: 165, text: "評論區告訴我，你最久堅持過幾天？", highlight: ["評論區"] },
];
const CtaScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelStage
      hud={
        <>
          <Sequence durationInFrames={60} layout="none">
            <GamePopup variant="follow" clickAt={26} exitAt={48} />
          </Sequence>
          <Sequence from={60} layout="none">
            <GamePopup variant="input" title="✦ 留言挑戰" question="你最久堅持過一件事幾天？" answer="我最久堅持 365 天" />
          </Sequence>
        </>
      }
      ui={
        <>
          <TopNav chapters={CHAPTERS} current={4} />
          <Watermark topic="片尾模板" />
          <Subtitles lines={LINES_CTA} />
          <Label name="GamePopup" code={f < 60 ? "C29 follow" : "C30 input"} note={f < 60 ? "邀請框 → 游標點擊 → 綠色已關注 → 飛走" : "問題逐字打出 → 答案逐字打出 → 閃游標"} />
        </>
      }
    >
      <Camera>
        <StudyRoom host={<Host pose={f < 60 ? "full_wave_talk" : "full_surprised_explain"} x={176} y={G} />}>
          <Ambience layers={["dust", lamp]} />
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

// ── 讀原書 → 成就解鎖 → 片尾 ─────────────────────
const LINES_END: SubtitleLine[] = [
  { start: 0, end: 50, text: "影片只有幾分鐘，裝不下一整本書", highlight: ["一整本書"] },
  { start: 50, end: 100, text: "去讀原書，才是最好的結局", highlight: ["最好的結局"] },
  { start: 100, end: 160, text: "這裡是超級人機，我們下一期見", highlight: ["超級人機"] },
];
const EndScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PixelStage
      hud={
        <>
          <At f={50}>
            <GamePopup variant="ending" y={52} />
          </At>
          <At f={78}>
            <GamePopup variant="achievement" name="自救" exitAt={60} y={92} />
          </At>
          <At f={112}>
            <NextTeaser />
          </At>
        </>
      }
      ui={
        <>
          <Subtitles lines={LINES_END} />
          <Label name="片尾" code="B9 / A13 / C32" note="解鎖結局 → 聚光燈收窄、低頭讀書 → 成就解鎖｜自救 → ??? 下集預告" />
        </>
      }
    >
      <Camera moves={[{ type: "push", start: 40, duration: 50, to: { x: 200, y: HOST_CENTER - 6, zoom: 2 } }]}>
        <StudyRoom host={<Host pose={f < 50 ? "full_front" : "half_read_paper"} x={200} y={G} />}>
          <Ambience layers={["dust", lamp]} />
          {f < 50 ? (
            <>
              {/* 書從上方降到手中（C31） */}
              <Sprite asset={A.book} x={232} y={Math.min(G - 30, -20 + f * 4)} glow={color.goldLight} />
            </>
          ) : null}
          <At f={50}>
            <Spotlight x={200} y={HOST_CENTER + 8} to={30} duration={40} />
          </At>
        </StudyRoom>
      </Camera>
    </PixelStage>
  );
};

export const SHOWCASE4_SECTIONS: [React.FC, number][] = [
  [SkillsScene, 410],
  [CtaScene, 165],
  [EndScene, 160],
];
export const SHOWCASE4_DURATION = SHOWCASE4_SECTIONS.reduce((s, [, d]) => s + d, 0);

export const Showcase4: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOWCASE4_SECTIONS.map(([C, d], i) => {
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
