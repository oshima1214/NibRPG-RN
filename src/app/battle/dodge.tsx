import { Canvas, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { BattleFrame, ItemRow, PlayerHp, TimeBar, battleStyles as bs } from '@/components/battle/BattleFrame';
import { useBattle } from '@/components/battle/useBattle';
import { useStageScale } from '@/components/GameStage';
import { Txt } from '@/components/ui';
import {
  BOSS_DODGE_SPEED,
  BOSS_DODGE_SPEED_SHRUNK,
  BOSS_DODGE_WAVE_MS,
  BOSS_SHRINK_HP,
  BOSS_SHRINK_RATE,
  DODGE_HIT_DAMAGE,
  DODGE_SPEED2,
  DODGE_WAVE2_MS,
  DODGE_WAVE_MS,
} from '@/data/battle';
import { T, TA } from '@/data/texts';
import {
  DodgeEngine,
  PATTERN_COUNT,
  P_CHIME,
  P_CHIME_SPIN,
  P_CLOCK,
  P_CLOCK_STAMP,
  P_MOUSE_HOMING,
  P_PAPERS,
  P_STAMP,
  type DodgeEvent,
} from '@/lib/dodge';
import { fmt } from '@/lib/format';
import { bgm, jingle, se } from '@/lib/sound';
import { ACH, useAchievements } from '@/state/achievements';
import { useGame } from '@/state/game';

/**
 * 5Fの戦闘：よけゲーム（校長先生。Java版の DodgeBattleActivity）。理事長戦の最終問題にも使う。
 * 四角の中のハートを指でなぞって動かし、飛んでくる物をよける。
 *   こうげきを最後までよけきる → 先生にダメージ（1回も当たらなければ1.5倍）
 *   物に当たる → HPが減る
 * 先生のHPが半分を切ると「第2形態」：こうげきが変わって、速くなる。
 */
const TICK_MS = 50;
const INTRO_MS = 3500; // 「あらわれた！」とルールを見せる時間
const BETWEEN_MS = 1800; // こうげきとこうげきの間の時間
// 校長：第1形態 → 第2形態で出す順番
const PRINCIPAL_PHASE1 = [P_STAMP, P_CHIME, P_CLOCK];
const PRINCIPAL_PHASE2 = [P_CLOCK_STAMP, P_PAPERS, P_CHIME_SPIN];

export default function DodgeBattle() {
  // この画面は GameStage の外なので、useStage() ではなく画面の大きさから求める
  //（useStage() だと、いつも 1 になってしまい、ハートが指より少ししか動かなかった）
  const scale = useStageScale();
  const isBoss = useLocalSearchParams<{ boss?: string }>().boss === '1';
  const engine = useRef<DodgeEngine | null>(null);
  if (!engine.current) engine.current = new DodgeEngine();
  const eng = engine.current;
  const [timeRate, setTimeRate] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const st = useRef({
    phase2: false, // 第2形態になったか
    shrunk: false, // 理事長戦：四角をせまくしたか
    wave: 0, // 何回目のこうげきか
    waveStart: 0,
    waveLength: 1,
    inWave: false,
    keptWeapon: -1, // 理事長に没収された装備（負けたら返す）
    keptItems: null as number[] | null, // 理事長に没収されたアイテムの数（負けたら返す）
  });

  /** 理事長戦で没収した装備とアイテムを返す */
  const returnItems = () => {
    const s = st.current;
    if (s.keptItems) {
      useGame.setState({ weapon: s.keptWeapon, itemCounts: s.keptItems });
      s.keptItems = null;
    }
  };

  const b = useBattle({
    loseLine: T.dodge_teacher_lose,
    introMs: INTRO_MS,
    rule: T.dodge_rule,
    bgm: isBoss ? 'bgm_boss2' : 'bgm_principal', // 理事長戦は、よけゲームから第2形態の曲に変わる
    flashAlpha: 0.4,
    flashMs: 400,
    onStart: () => (b.boss ? confiscate() : nextWave()),
    onPause: () => eng.pause(),
    onResume: () => eng.resume(),
    onRetire: () => {
      eng.stop();
      returnItems();
    },
  });

  const init = useRef(false);
  if (!init.current) {
    init.current = true;
    if (b.boss) {
      st.current.phase2 = true; // 理事長戦は、はじめから本気
      eng.setBossFrame(true);
      // デバッグで、HPが少ない所から始めたときは、はじめからわくをせまくする
      if (b.teacherHp <= BOSS_SHRINK_HP) {
        st.current.shrunk = true;
        eng.shrinkArena(BOSS_SHRINK_RATE);
      }
    }
  }
  /** 画面全体をガタガタゆらす（strength：ゆれの大きさ（Java版の dp）、ms：ゆれる時間） */
  const screenShake = (strength: number, ms: number) => {
    const amp = strength * 2;
    const start = b.timer.now();
    const step = () => {
      const t = b.timer.now() - start;
      if (t >= ms) {
        setOffset({ x: 0, y: 0 });
        return;
      }
      const k = 1 - t / ms; // だんだん小さく
      setOffset({ x: (Math.random() * 2 - 1) * amp * k, y: (Math.random() * 2 - 1) * amp * k });
      b.timer.after(30, step);
    };
    step();
  };

  /** 理事長戦：装備とアイテムを没収する（負けたら返す） */
  const confiscate = () => {
    if (b.finished.current) return;
    se('se_confiscate');
    const g = useGame.getState();
    st.current.keptWeapon = g.weapon;
    st.current.keptItems = [...g.itemCounts];
    useGame.setState({ weapon: -1, itemCounts: g.itemCounts.map(() => 0) }); // 素手
    b.flashRed();
    screenShake(8, 400);
    const lineMs = b.tw.show(T.boss_confiscate_line);
    b.setMessage(T.boss_confiscate);
    b.timer.after(Math.max(BETWEEN_MS, lineMs), nextWave);
  };

  /** 先生のこうげきを始める */
  const nextWave = () => {
    if (b.finished.current) return;
    const s = st.current;
    let pat: number;
    let sp: number;
    let line: string;
    if (b.boss) {
      // 理事長戦：決まった攻撃パターンを、順番に1つずつ（わくがせまくなったら速くなる）
      pat = s.wave % PATTERN_COUNT;
      sp = s.shrunk ? BOSS_DODGE_SPEED_SHRUNK : BOSS_DODGE_SPEED;
      // マウスの追いかけは、わくがせまくなっても速くしない（せまいと逃げにくいため）
      if (pat === P_MOUSE_HOMING) sp = BOSS_DODGE_SPEED;
      s.waveLength = BOSS_DODGE_WAVE_MS;
      line = TA.boss_pattern_lines[pat];
    } else {
      // 校長戦：第1形態：ハンコ連打 → チャイムの輪 → 時計の針
      //   第2形態（HP半分から・速い）：時計の針＋ハンコ → 書類の山 → チャイムの輪（すき間が回る）
      const set = s.phase2 ? PRINCIPAL_PHASE2 : PRINCIPAL_PHASE1;
      pat = set[s.wave % set.length];
      sp = s.phase2 ? DODGE_SPEED2 : 1;
      s.waveLength = s.phase2 ? DODGE_WAVE2_MS : DODGE_WAVE_MS;
      line = TA.principal_pattern_lines[pat - P_STAMP];
    }
    s.wave++;
    const lineMs = b.tw.show(line);
    b.setMessage(fmt(T.dodge_wave, b.teacherName));
    // セリフを全部出してから、こうげき開始
    b.timer.after(lineMs, () => {
      if (b.finished.current) return;
      eng.startPatternWave(pat, sp, s.waveLength);
      s.waveStart = b.timer.now();
      s.inWave = true;
      b.timer.after(0, tick);
    });
  };

  /** こうげきの残り時間を表示する（くり返し呼ばれる） */
  const tick = () => {
    const s = st.current;
    if (!s.inWave || b.finished.current) return;
    const elapsed = b.timer.now() - s.waveStart;
    setTimeRate(Math.max(0, 1 - elapsed / s.waveLength));
    b.timer.after(TICK_MS, tick);
  };

  /** 物に当たった */
  const onDamaged = () => {
    if (b.finished.current) return;
    const damage = DODGE_HIT_DAMAGE;
    const g = useGame.getState();
    const hp = Math.max(0, g.hp - damage);
    useGame.setState({ hp, tookDamage: true }); // tookDamage は実績のため
    b.flashRed();
    se('se_damage');
    if (b.boss) screenShake(10, 350); // 当たった衝撃
    b.setMessage(fmt(T.dodge_hit, damage));
    if (hp <= 0) {
      b.finish();
      st.current.inWave = false;
      eng.stop();
      const lineMs = b.tw.show(b.taunt());
      b.timer.after(Math.max(1600, lineMs), () => {
        returnItems();
        b.lose();
      });
    }
  };

  /** こうげきを最後までよけきった：先生にダメージ */
  const onSurvived = (noHit: boolean) => {
    if (b.finished.current) return;
    const s = st.current;
    s.inWave = false;
    setTimeRate(0);
    let damage = useGame.getState().rollAttack(); // 少しばらつく
    if (noHit) damage = Math.trunc((damage * 3) / 2);
    const hp = Math.max(0, b.teacherHpRef.current - damage);
    b.setTeacherHp(hp);
    b.teacherShake.shake();
    se(noHit ? 'se_critical' : 'se_hit_teacher');
    b.setMessage(fmt(noHit ? T.dodge_perfect : T.dodge_survived, b.teacherName, damage));
    if (hp <= 0) {
      win();
      return;
    }
    // 理事長戦：HPが残りわずかになったら、四角をせまくする
    if (b.boss && !s.shrunk && hp <= BOSS_SHRINK_HP) {
      s.shrunk = true;
      eng.shrinkArena(BOSS_SHRINK_RATE);
      screenShake(14, 700);
      se('se_shrink');
      b.flashRed();
      const lineMs = b.tw.show(T.boss_shrink_line);
      b.setMessage(T.boss_shrink);
      b.timer.after(Math.max(BETWEEN_MS * 2, lineMs), nextWave);
      return;
    }
    // HPが半分を切ったら、第2形態へ
    if (!s.phase2 && hp * 2 <= b.teacherMaxHp) {
      s.phase2 = true;
      se('se_phase2');
      bgm('bgm_principal2'); // 第2形態の曲へ
      const lineMs = b.tw.show(T.dodge_phase2_line);
      b.setMessage(fmt(T.dodge_phase2, b.teacherName));
      screenShake(4, 400);
      b.timer.after(Math.max(BETWEEN_MS * 2, lineMs), nextWave);
      return;
    }
    b.timer.after(BETWEEN_MS, nextWave);
  };

  const win = () => {
    eng.stop();
    if (!b.boss) {
      b.win();
      return;
    }
    // 理事長に勝った：実績を解除して、実績以外のデータをリセットしてタイトルへ
    b.finish();
    jingle('jg_clear');
    useAchievements.getState().unlock(ACH.BOSS_CLEAR);
    b.tw.show(T.boss_lose_line);
    b.setResult(T.boss_win);
    b.setResultButton({
      label: T.boss_to_title,
      onPress: () => {
        useGame.getState().reset(); // 実績以外は、全部リセット
        useGame.setState({ playing: false });
        if (router.canDismiss()) router.dismissAll();
        router.replace('/title');
      },
    });
  };

  // ===================== 画面全体でハートを動かす =====================
  // 画面のどこをなぞっても、ハートが動く（ボタンの上で押したときは、ふつうにボタンを押す）
  const last = useRef({ x: 0, y: 0 });
  const touch = {
    onStartShouldSetResponder: () => !b.finished.current && !b.pause.isOpen,
    onMoveShouldSetResponder: () => !b.finished.current && !b.pause.isOpen,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      last.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { pageX, pageY } = e.nativeEvent;
      if (!b.pause.isOpen && !b.finished.current) {
        eng.dragBy((pageX - last.current.x) / scale, (pageY - last.current.y) / scale);
        dirty.current = true;
      }
      last.current = { x: pageX, y: pageY };
    },
  };

  // ===================== 毎コマ動かして、かく =====================
  const [pic, setPic] = useState<SkPicture | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dirty = useRef(true);
  const handlers = useRef({ onDamaged, onSurvived, screenShake });
  handlers.current = { onDamaged, onSurvived, screenShake };
  const k = Math.max(1, Math.min(3, scale)); // 画面に拡大されるぶん、細かくかく

  useEffect(() => {
    if (size.w <= 0) return;
    eng.setSize(size.w, size.h);
    dirty.current = true;
    let raf = 0;
    const loop = () => {
      eng.frame();
      // 当たった・よけきった・ドスン！（かき終わってから知らせる）
      const evs: DodgeEvent[] = eng.events.splice(0);
      if (eng.isAnimating() || dirty.current) {
        dirty.current = false;
        setPic(
          createPicture((c) => {
            c.scale(k, k);
            eng.draw(c);
          }, Skia.XYWHRect(0, 0, size.w * k, size.h * k)),
        );
      }
      for (const e of evs) {
        if (e.type === 'hit') handlers.current.onDamaged();
        else if (e.type === 'end') handlers.current.onSurvived(e.noHit);
        else if (e.type === 'impact' && b.boss && !b.finished.current) handlers.current.screenShake(5, 200); // ドスン！の衝撃
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h, eng, k, b.boss, b.finished]);

  return (
    <BattleFrame b={b} touch={touch} offset={offset}>
      <PlayerHp />
      <TimeBar rate={timeRate} />
      {/* よける四角（画面のどこをなぞっても、ハートが動く） */}
      <View style={{ flex: 1, marginTop: 16 }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {size.w > 0 && pic && (
          <View style={{ width: size.w, height: size.h, overflow: 'hidden' }} pointerEvents="none">
            {/* 縮めるのは外がわの View で（Canvas に直接つけると、Web では縮まない） */}
            <View style={{ width: size.w * k, height: size.h * k, transformOrigin: 'left top', transform: [{ scale: 1 / k }] }}>
              <Canvas style={{ width: size.w * k, height: size.h * k }}>
                <Picture picture={pic} />
              </Canvas>
            </View>
          </View>
        )}
      </View>
      <Txt style={[bs.message, { marginTop: 8 }]}>{b.message}</Txt>
      <View style={{ marginTop: 8 }}>
        <ItemRow b={b} />
      </View>
    </BattleFrame>
  );
}

