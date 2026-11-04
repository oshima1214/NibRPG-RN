import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Platform } from 'react-native';

import { usePauseMenu } from '@/components/PauseMenu';
import { useTypeWriter } from '@/components/TypeWriter';
import {
  BOSS_ATTACK,
  BOSS_GAME_OVER,
  BOSS_HP,
  BOSS_STAGES,
  FLOOR_BGM,
  TAUNTS,
  TEACHER_ATTACK,
  TEACHER_HP,
  type BattleKind,
} from '@/data/battle';
import type { ImageName } from '@/data/images';
import { LAST, REWARDS, TEACHER_IMAGES, TEACHER_NAMES } from '@/data/map';
import { ITEMS } from '@/data/shop';
import { T, TA } from '@/data/texts';
import { fmt } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { PauseTimer } from '@/lib/pauseTimer';
import { bgm, jingle, pauseBgm, resumeBgm, se } from '@/lib/sound';
import type { BgmName } from '@/data/sounds';
import { checkWin } from '@/state/achievements';
import { useGame } from '@/state/game';

/**
 * 戦闘画面に共通の動き（Java版の各 BattleActivity に同じように書いてあった部分）。
 *   ・先生の準備（理事長戦なら理事長。HPは前の問題から引きつぐ）
 *   ・一時停止できるタイマー・一時停止メニュー・リタイア
 *   ・先生のひとこと（1文字ずつ）・結果のメッセージ
 *   ・ダメージ（先生へ・自分へ）・勝ち・負け・理事長戦の次の問題へ
 *   ・道具を使う
 */
export const ROUTES: Record<BattleKind, '/battle/words' | '/battle/fill' | '/battle/memory' | '/battle/dodge'> = {
  words: '/battle/words',
  fill: '/battle/fill',
  memory: '/battle/memory',
  dodge: '/battle/dodge',
};

type Options = {
  /** 勝ったときの先生のひとこと */
  loseLine: string;
  /** 「あらわれた！」を見せる時間（これより短くはしない） */
  introMs: number;
  /** はじめのメッセージ（ルール） */
  rule?: string;
  /** 準備ができたら呼ばれる（最初の問題を出す） */
  onStart: () => void;
  /** BGM（なければ、階ごとの曲。理事長戦はボスの曲） */
  bgm?: BgmName;
  /** 一時停止・再開・リタイアのときに、ほかにすること（よけゲームの四角を止めるなど） */
  onPause?: () => void;
  onResume?: () => void;
  onRetire?: () => void;
  /** 赤くする幕の濃さと時間 */
  flashAlpha?: number;
  flashMs?: number;
};

const rand = (n: number) => Math.floor(Math.random() * n);

/** 左右にぶるぶるゆらす（Java版の shake） */
export function useShake() {
  const x = useRef(new Animated.Value(0)).current;
  const shake = () => {
    const native = Platform.OS !== 'web';
    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < 8; i++) {
      steps.push(Animated.timing(x, { toValue: i % 2 === 0 ? 16 : -16, duration: 50, useNativeDriver: native }));
    }
    steps.push(Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: native }));
    Animated.sequence(steps).start();
  };
  return { style: { transform: [{ translateX: x }] }, shake };
}

export function useBattle(opts: Options) {
  const { loseLine, introMs, rule, onStart } = opts;
  const params = useLocalSearchParams<{ boss?: string; stage?: string }>();
  const boss = params.boss === '1';
  const stage = Number(params.stage ?? 0) || 0;
  const [floor] = useState(() => useGame.getState().floor);

  const teacherName = boss ? T.boss_name : TEACHER_NAMES[floor];
  const teacherImage: ImageName = boss ? 'boss_rijicho' : (TEACHER_IMAGES[floor] ?? 's_m_sensei');
  const teacherMaxHp = boss ? BOSS_HP : TEACHER_HP[floor];
  const [teacherHp, setTeacherHpState] = useState(() => (boss ? useGame.getState().bossHp : teacherMaxHp));
  const teacherHpRef = useRef(teacherHp);
  const setTeacherHp = (v: number) => {
    teacherHpRef.current = v;
    setTeacherHpState(v);
  };

  const timer = useRef(new PauseTimer()).current;
  const tw = useTypeWriter();
  const [message, setMessage] = useState<string>(rule ?? '');
  const finished = useRef(false); // 勝ち負けが決まったら true
  const [done, setDone] = useState(false); // 一時停止ボタンを出すか（勝ち負けが決まったら出さない）
  const [result, setResult] = useState<string | null>(null); // 勝ったときの結果
  // 結果のボタン（なければ「マップへもどる」）
  const [resultButton, setResultButton] = useState<{ label: string; onPress: () => void } | null>(null);
  const flash = useRef(new Animated.Value(0)).current;
  const teacherShake = useShake();

  const finish = () => {
    finished.current = true;
    setDone(true);
  };

  // ---- 一時停止・リタイア ----
  const pause = usePauseMenu({
    canPause: !done,
    onPause: () => {
      timer.pause();
      pauseBgm();
      opts.onPause?.();
    },
    onResume: () => {
      timer.resume();
      resumeBgm();
      opts.onResume?.();
    },
    onRetire: () => {
      // リタイア：今のHPのままマップに戻る（先生のHPは元に戻る）
      finish();
      timer.clear();
      opts.onRetire?.();
      goBack();
    },
  });
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  // ---- はじめ ----
  useEffect(() => {
    const line = boss ? TA.boss_stage_lines[stage] : fmt(T.battle_appear, teacherName);
    const ms = tw.show(line);
    // 音：BGM（理事長戦はボスの曲。ステージが変わっても続けて流れる）と、バトル開始の音
    bgm(opts.bgm ?? (boss ? 'bgm_boss' : ((FLOOR_BGM[floor] as BgmName | null) ?? 'bgm_floor2')));
    if (!boss || stage === 0) se('se_battle_start');
    timer.after(Math.max(introMs, ms), onStart); // セリフを全部出してから始める

    // 戻るボタン（Android）：そのままマップには戻らず、一時停止メニューを出す
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!finished.current) pauseRef.current.open();
      return true;
    });
    // アプリを離れたら、一時停止する（もどってきたら、メニューの「つづける」で再開）
    const app = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && !finished.current) pauseRef.current.open();
    });
    return () => {
      timer.clear();
      back.remove();
      app.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== ダメージ =====================

  /** 画面を一瞬赤くする */
  const flashRed = () => {
    flash.setValue(opts.flashAlpha ?? 0.5);
    Animated.timing(flash, { toValue: 0, duration: opts.flashMs ?? 500, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  /** 失敗したときのダメージ（理事長戦は BOSS_ATTACK） */
  const teacherAttack = () => (boss ? BOSS_ATTACK : TEACHER_ATTACK[floor]);

  /** 失敗したときのひとこと（理事長戦は taunts_boss） */
  const taunt = () => {
    const list = boss ? TA.taunts_boss : TAUNTS[floor];
    return list[rand(list.length)] ?? '';
  };

  /**
   * 自分がダメージを受ける（時間切れ・まちがい）。先生のひとことを出して、
   * HPが残っていれば afterMs あとに next、なくなったら負け
   */
  const hurt = (damage: number, msg: string, afterMs: number, next: () => void) => {
    const s = useGame.getState();
    const hp = Math.max(0, s.hp - damage);
    useGame.setState({ hp, tookDamage: true }); // tookDamage は実績のため
    flashRed();
    se('se_wrong');
    timer.after(220, () => se('se_damage'));
    const lineMs = tw.show(taunt());
    setMessage(msg);
    if (hp <= 0) {
      finish();
      timer.after(Math.max(afterMs, lineMs), lose);
    } else {
      timer.after(Math.max(afterMs, lineMs), next);
    }
  };

  /**
   * 先生にダメージを与える。理事長戦で次の問題へ進むときは 'stage'、勝ったら 'win'、続くなら 'continue'
   */
  const hitTeacher = (damage: number, msg: string, critical = false): 'stage' | 'win' | 'continue' => {
    setTeacherHp(Math.max(0, teacherHpRef.current - damage));
    teacherShake.shake();
    setMessage(msg);
    se('se_correct');
    timer.after(180, () => se(critical ? 'se_critical' : 'se_hit_teacher'));
    if (bossStageClear()) return 'stage';
    if (teacherHpRef.current <= 0) {
      win();
      return 'win';
    }
    return 'continue';
  };

  // ===================== 勝ち・負け =====================

  const win = () => {
    finish();
    jingle('jg_win');
    checkWin(); // HPが残り1桁なら実績
    const s = useGame.getState();
    const defeated = [...s.defeated];
    defeated[floor] = true;
    const reward = REWARDS[floor];
    useGame.setState({ defeated, money: s.money + reward });
    tw.show(loseLine);
    setResult(fmt(T.battle_win, teacherName, reward));
  };

  /** 勝ったあとの「マップへもどる」 */
  const closeResult = () => {
    if (floor === LAST) {
      // 最上階の先生に勝ったらクリア（マップの画面も閉じる）
      if (router.canDismiss()) router.dismissAll();
      router.replace('/clear');
    } else {
      goBack(); // マップにもどる（マップの画面は開いたままなので、続きから）
    }
  };

  const lose = () => {
    // 攻略失敗画面へ（後ろに残っているマップの画面も閉じる）
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/gameover', params: { teacher: String(boss ? BOSS_GAME_OVER : floor) } });
  };

  /**
   * 理事長戦：この問題（ミニゲーム）のぶんのHPを削りきったら、次の問題へ。
   * 1つの問題で削れるのは、HPの4分の1まで
   */
  const bossStageClear = () => {
    const stages = BOSS_STAGES.length;
    if (!boss || stage >= stages - 1) return false;
    const border = Math.trunc((BOSS_HP * (stages - 1 - stage)) / stages);
    if (teacherHpRef.current > border) return false;
    setTeacherHp(border);
    useGame.setState({ bossHp: border });
    finish();
    const lineMs = tw.show(T.boss_next_line);
    se('se_stage_next');
    setMessage(T.boss_next);
    timer.after(Math.max(1800, lineMs), () => {
      router.replace({ pathname: ROUTES[BOSS_STAGES[stage + 1]], params: { boss: '1', stage: String(stage + 1) } });
    });
    return true;
  };

  // ===================== 道具 =====================

  /** 道具を使う（時間は止まらない） */
  const useItem = (i: number) => {
    const s = useGame.getState();
    if (finished.current || s.itemCounts[i] <= 0) return;
    const hp = Math.min(s.maxHp, s.hp + ITEMS[i].power);
    const counts = [...s.itemCounts];
    counts[i]--;
    useGame.setState({ hp, itemCounts: counts, usedItem: true }); // usedItem は実績のため
    se('se_heal');
    setMessage(fmt(T.battle_item_used, ITEMS[i].name, hp - s.hp));
  };

  return {
    boss,
    stage,
    floor,
    teacherName,
    teacherImage,
    teacherMaxHp,
    teacherHp,
    teacherHpRef,
    setTeacherHp,
    timer,
    tw,
    message,
    setMessage,
    finished,
    finish,
    result,
    setResult,
    resultButton,
    setResultButton,
    closeResult,
    flash,
    flashRed,
    teacherShake,
    pause,
    hurt,
    hitTeacher,
    teacherAttack,
    taunt,
    win,
    lose,
    useItem,
  };
}

export type Battle = ReturnType<typeof useBattle>;
