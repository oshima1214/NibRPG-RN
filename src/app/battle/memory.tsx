import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BattleFrame, ItemRow, PlayerHp, TimeBar, battleStyles as bs } from '@/components/battle/BattleFrame';
import { useBattle, useShake } from '@/components/battle/useBattle';
import { GameText } from '@/components/GameText';
import { Txt } from '@/components/ui';
import {
  BOSS_HP,
  BOSS_MEMORY_CLEAR,
  BOSS_MEMORY_MAX,
  BOSS_MEMORY_SHOW_MS,
  BOSS_MEMORY_START,
  BOSS_STAGES,
  MEMORY_BASE_TIME_MS,
  MEMORY_MAX,
  MEMORY_PER_LETTER_MS,
  MEMORY_SHOW_MS,
  MEMORY_START,
  MEMORY_WRITE_MS,
  SUBJECTS,
} from '@/data/battle';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { rand } from '@/lib/random';
import { se } from '@/lib/sound';
import { useGame } from '@/state/game';

/**
 * 4Fの戦闘：板書うつしバトル（S先生。Java版の MemoryBattleActivity）。
 * 先生が黒板に教科の文字（国・数・英…）を書いて、すぐに消す。
 * 書かれた順番どおりに、下のボタンを押す。
 *   全部正しい → 先生にダメージ（覚えた数が多いほど大きい）。次は1文字ふえる
 *   まちがい・時間切れ → 先生から精神的ダメージ
 */
const TICK_MS = 50;
const INTRO_MS = 3000; // 「あらわれた！」とルールを見せる時間
const AFTER_HIT_MS = 1200;
const AFTER_MISS_MS = 1800;

export default function MemoryBattle() {
  const [board, setBoard] = useState('');
  const [label, setLabel] = useState('');
  const [answering, setAnswering] = useState(false);
  const [timeRate, setTimeRate] = useState(1);
  const boardAlpha = useRef(new Animated.Value(1)).current;
  const boardShake = useShake();
  const st = useRef({ length: MEMORY_START, sequence: [] as number[], input: 0, start: 0, limit: 1, answering: false });

  const b = useBattle({
    loseLine: T.memory_teacher_lose,
    introMs: INTRO_MS,
    rule: T.memory_rule,
    onStart: () => nextRound(),
  });
  // 理事長戦は、はじめから多め
  const init = useRef(false);
  if (!init.current) {
    init.current = true;
    if (b.boss) st.current.length = BOSS_MEMORY_START;
  }

  /** 黒板に書く文字（はじめの n 文字） */
  const boardText = (n: number) => st.current.sequence.slice(0, n).map((s) => SUBJECTS[s]).join(' ');

  /** 答えているときの黒板：押した教科と、のこりの「？」 */
  const answerText = () => {
    const s = st.current;
    return s.sequence.map((v, i) => (i < s.input ? SUBJECTS[v] : '？')).join(' ');
  };

  const setAns = (on: boolean) => {
    st.current.answering = on;
    setAnswering(on);
  };

  /** 次の板書を始める：先生が1文字ずつ黒板に書く */
  const nextRound = () => {
    if (b.finished.current) return;
    const s = st.current;
    setAns(false);
    setTimeRate(1);
    // 書く教科を決める（同じ教科が2回続かないようにする）
    const seq: number[] = [];
    for (let i = 0; i < s.length; i++) {
      let v: number;
      do v = rand(SUBJECTS.length);
      while (seq.length > 0 && seq[seq.length - 1] === v);
      seq.push(v);
    }
    s.sequence = seq;
    setBoard('');
    boardAlpha.setValue(1);
    setLabel(fmt(T.memory_label_watch, s.length));
    b.setMessage('');
    // 1文字ずつ書いていく
    for (let i = 0; i < s.length; i++) {
      const n = i + 1;
      b.timer.after(MEMORY_WRITE_MS * (i + 1), () => {
        setBoard(boardText(n));
        se('se_chalk_write'); // カッ
      });
    }
    // 書き終わって少ししたら、黒板消しで消す
    const erase = MEMORY_WRITE_MS * s.length + (b.boss ? BOSS_MEMORY_SHOW_MS : MEMORY_SHOW_MS);
    b.timer.after(erase, () => {
      se('se_board_erase'); // 黒板消し
      Animated.timing(boardAlpha, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start(() =>
        startAnswer(),
      );
    });
  };

  /** 消し終わったら、答える番 */
  const startAnswer = () => {
    if (b.finished.current) return;
    const s = st.current;
    s.input = 0;
    setBoard(answerText());
    boardAlpha.setValue(1);
    setLabel(T.memory_label_answer);
    s.limit = MEMORY_BASE_TIME_MS + MEMORY_PER_LETTER_MS * s.length;
    s.start = b.timer.now();
    setAns(true);
    b.timer.after(0, tick);
  };

  const tick = () => {
    const s = st.current;
    if (!s.answering || b.finished.current) return;
    const elapsed = b.timer.now() - s.start;
    setTimeRate(Math.max(0, 1 - elapsed / s.limit));
    if (elapsed >= s.limit) onMiss(true);
    else b.timer.after(TICK_MS, tick);
  };

  /** 教科のボタンが押されたとき */
  const onButton = (v: number) => {
    const s = st.current;
    if (!s.answering) return;
    if (s.sequence[s.input] !== v) {
      onMiss(false); // 順番がちがう
      return;
    }
    s.input++;
    se('se_chalk_write');
    setBoard(answerText());
    if (s.input === s.length) onCorrect();
  };

  /** 全部正しく写せた：先生にダメージ（覚えた数が多いほど大きい） */
  const onCorrect = () => {
    const s = st.current;
    setAns(false);
    let damage = Math.trunc((useGame.getState().rollAttack() * s.length) / MEMORY_START); // 3文字で攻撃力そのまま
    if (b.boss) {
      // 理事長戦：素手でも BOSS_MEMORY_CLEAR 回正解すれば、この問題が終わるダメージを保証する
      const stageHp = Math.trunc(BOSS_HP / BOSS_STAGES.length);
      const least = Math.trunc((stageHp + BOSS_MEMORY_CLEAR - 1) / BOSS_MEMORY_CLEAR); // 切り上げ
      damage = Math.max(damage, least);
    }
    const r = b.hitTeacher(damage, fmt(T.memory_correct, s.length, b.teacherName, damage));
    if (r === 'continue') {
      if (s.length < (b.boss ? BOSS_MEMORY_MAX : MEMORY_MAX)) s.length++; // 次は1文字ふやす
      b.timer.after(AFTER_HIT_MS, nextRound);
    }
  };

  /** まちがい・時間切れ：先生から精神的ダメージ */
  const onMiss = (timeout: boolean) => {
    const s = st.current;
    setAns(false);
    boardShake.shake();
    setBoard(boardText(s.length)); // 正しい板書を見せる
    const damage = b.teacherAttack();
    b.hurt(damage, fmt(timeout ? T.memory_timeout : T.memory_wrong, damage), AFTER_MISS_MS, nextRound);
  };

  const half = Math.ceil(SUBJECTS.length / 2);
  const button = (i: number) => (
    <Pressable
      key={i}
      onPress={() => onButton(i)}
      style={[bs.tile, styles.subject, { opacity: answering ? 1 : 0.4 }]}>
      <Txt style={[bs.tileText, { fontSize: 40 }]}>{SUBJECTS[i]}</Txt>
    </Pressable>
  );

  return (
    <BattleFrame b={b}>
      <PlayerHp />
      <TimeBar rate={timeRate} />
      {/* 黒板（ここに教科の文字が書かれて、消える） */}
      {/* 理事長戦は黒板が低いので、説明を左に置いて、文字を小さくする（枠からはみ出さないように） */}
      <Animated.View style={[styles.board, b.boss && styles.bossBoard, boardShake.style]}>
        {b.boss && <Txt style={styles.bossLabel}>{label}</Txt>}
        <Animated.View style={[styles.boardInner, { opacity: boardAlpha }]}>
          <GameText style={[styles.boardText, b.boss && styles.bossText]}>{board}</GameText>
        </Animated.View>
        {!b.boss && <Txt style={styles.boardLabel}>{label}</Txt>}
      </Animated.View>
      <Txt style={[bs.message, { marginTop: 8 }]}>{b.message}</Txt>
      {/* 教科のボタン（2段） */}
      <View style={styles.buttonRow}>{SUBJECTS.slice(0, half).map((_, i) => button(i))}</View>
      <View style={[styles.buttonRow, { marginTop: 8 }]}>{SUBJECTS.slice(half).map((_, i) => button(half + i))}</View>
      <View style={{ marginTop: 8 }}>
        <ItemRow b={b} />
      </View>
    </BattleFrame>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    marginTop: 16,
    padding: 20,
    backgroundColor: '#1F4A35',
    borderColor: '#8A5A2B',
    borderWidth: 12,
    borderRadius: 8,
  },
  boardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardText: {
    fontSize: 68,
    letterSpacing: 14,
  },
  bossBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bossText: {
    fontSize: 44,
    letterSpacing: 10,
  },
  bossLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 24,
    marginRight: 16,
  },
  boardLabel: {
    position: 'absolute',
    left: 16,
    top: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 24,
  },
  buttonRow: {
    height: 92,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  subject: {
    width: 128,
    marginHorizontal: 8,
  },
});
