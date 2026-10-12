import React from "react";
import { color, FONT_PIXEL } from "../../theme";
import { Sprite } from "../Sprite";

/**
 * 技能卡的示範小動畫（SkillCard 的 renderDemo）。座標是示範框 126×84 的區域座標，t = 翻面後經過的幀數。
 * 時間軸 JSON 用名稱指定：SkillCard 的 "demo": "years" | "daily" | "future"。
 */
const PLANT = "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_ssff-收集整理 (14)_png/232.png";
const MOON = "other_其他素材3万多张/xs004-像素小图标整理【31000多张】/3-小道具-等其他【5600多张】/子图拆分-对应图片名找文件夹/子图_小道具整合_png/210.png";
const A = { plant: PLANT, moon: MOON };
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

export const SKILL_DEMOS: Record<string, React.FC<{ t: number }>> = {
  years: DemoTenYears,
  daily: DemoDaily,
  future: DemoFuture,
};