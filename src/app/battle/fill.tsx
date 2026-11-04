import { useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { BattleFrame, ItemRow, PlayerHp, TimeBar, battleStyles as bs } from '@/components/battle/BattleFrame';
import { useBattle, useShake } from '@/components/battle/useBattle';
import { Txt, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import {
  BOSS_FILL_BASE_TIME_MS,
  BOSS_FILL_BLANKS,
  BOSS_FILL_CHOICES,
  BOSS_FILL_PER_BLANK_MS,
  BOSS_FILL_WORDS,
  DUMMY_LETTERS,
  FILL_BASE_TIME_MS,
  FILL_CHOICES,
  FILL_PER_BLANK_MS,
  FILL_WORDS,
  type Word,
} from '@/data/battle';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { lookAlikes, rand, shuffle } from '@/lib/random';
import { se } from '@/lib/sound';
import { useGame } from '@/state/game';

/**
 * 3Fの戦闘：穴うめバトル（E先生。Java版の FillBattleActivity）。
 * 単語のいくつかの文字が □ になっているので、下の札から正しい文字を選んでうめる。
 * ハズレの札は「ぱ／ば」「よ／ょ」のような、見まちがえやすい文字。
 */
const TICK_MS = 50;
const INTRO_MS = 1500;
const AFTER_HIT_MS = 1000;
const AFTER_MISS_MS = 1600;

export default function FillBattle() {
  const [word, setWord] = useState<Word | null>(null);
  const [blanks, setBlanks] = useState<number[]>([]); // □にした文字の場所（左から順）
  const [choices, setChoices] = useState<string[]>([]); // 下の札の文字
  const [filled, setFilled] = useState<string[]>([]); // □に入れた文字（左から順）
  const [timeRate, setTimeRate] = useState(1);
  const deck = useRef<Word[]>([]);
  const st = useRef({ word: null as Word | null, blanks: [] as number[], filled: [] as string[], start: 0, limit: 1, busy: true });
  const answerShake = useShake();

  const b = useBattle({
    loseLine: T.fill_teacher_lose,
    introMs: INTRO_MS * 2, // セリフを全部出して、ルールを読む時間もとる
    rule: T.fill_rule,
    onStart: () => nextWord(),
  });

  /** 次の問題を出す */
  const nextWord = () => {
    if (b.finished.current) return;
    if (deck.current.length === 0) deck.current = shuffle([...(b.boss ? BOSS_FILL_WORDS : FILL_WORDS)]);
    const w = deck.current.shift()!;
    const answer = w.answer;
    // □にする場所を決める（5文字以下なら2つ、それより長ければ3つ）
    // 見まちがえやすい文字がある場所を優先して □ にする
    const count = b.boss ? BOSS_FILL_BLANKS : answer.length <= 5 ? 2 : 3;
    const choiceCount = b.boss ? BOSS_FILL_CHOICES : FILL_CHOICES;
    const tricky: number[] = [];
    const others: number[] = [];
    for (let i = 0; i < answer.length; i++) (lookAlikes(answer[i]).length > 1 ? tricky : others).push(i);
    const order = [...shuffle(tricky), ...shuffle(others)];
    const bl = order.slice(0, count).sort((a, c) => a - c);
    // 札：□に入る文字 ＋ 見まちがえやすい文字 ＋ ふつうのハズレ文字
    const ch: string[] = [];
    const add = (c: string) => {
      if (!ch.includes(c)) ch.push(c);
    };
    for (const k of bl) add(answer[k]);
    for (const k of bl) {
      const group = lookAlikes(answer[k]);
      for (let j = 0; j < group.length && ch.length < choiceCount; j++) add(group[j]);
    }
    while (ch.length < choiceCount) add(DUMMY_LETTERS[rand(DUMMY_LETTERS.length)]);
    shuffle(ch);
    const limit = b.boss ? BOSS_FILL_BASE_TIME_MS + BOSS_FILL_PER_BLANK_MS * count : FILL_BASE_TIME_MS + FILL_PER_BLANK_MS * count;
    st.current = { word: w, blanks: bl, filled: [], start: b.timer.now(), limit, busy: false };
    setWord(w);
    setBlanks(bl);
    setChoices(ch);
    setFilled([]);
    b.setMessage('');
    setTimeRate(1);
    b.timer.after(0, tick);
  };

  const tick = () => {
    const s = st.current;
    if (s.busy || b.finished.current) return;
    const elapsed = b.timer.now() - s.start;
    setTimeRate(Math.max(0, 1 - elapsed / s.limit));
    if (elapsed >= s.limit) onTimeout();
    else b.timer.after(TICK_MS, tick);
  };

  const setF = (f: string[]) => {
    st.current.filled = f;
    setFilled(f);
  };

  /** 札がタップされたとき：左の □ から順にうめる（同じ札を何回使ってもよい） */
  const onChoice = (c: string) => {
    const s = st.current;
    if (s.busy || s.filled.length >= s.blanks.length) return;
    const f = [...s.filled, c];
    setF(f);
    se('se_tile_place');
    if (f.length === s.blanks.length) check(f);
  };

  const removeLast = () => {
    const s = st.current;
    if (s.busy || s.filled.length === 0) return;
    setF(s.filled.slice(0, -1));
    se('se_tile_remove');
  };

  const resetFilled = () => {
    const s = st.current;
    if (s.busy) return;
    if (s.filled.length > 0) se('se_tile_remove');
    setF([]);
  };

  /** □が全部うまったら、答え合わせ */
  const check = (f: string[]) => {
    const s = st.current;
    const ok = s.blanks.every((k, i) => f[i] === s.word!.answer[k]);
    if (ok) {
      onCorrect();
    } else {
      b.setMessage(T.fill_wrong);
      answerShake.shake();
      setF([]); // ちがったら、入れ直し（時間は止まらない）
    }
  };

  const onCorrect = () => {
    const s = st.current;
    s.busy = true;
    const elapsed = b.timer.now() - s.start;
    const critical = elapsed <= s.limit / 2; // 半分の時間で答えたらクリティカル
    let damage = useGame.getState().rollAttack();
    if (critical) damage = Math.trunc((damage * 3) / 2);
    const r = b.hitTeacher(damage, fmt(critical ? T.battle_critical : T.battle_correct, b.teacherName, damage), critical);
    if (r === 'continue') b.timer.after(AFTER_HIT_MS, nextWord);
  };

  const onTimeout = () => {
    const s = st.current;
    s.busy = true;
    const damage = b.teacherAttack();
    b.hurt(damage, fmt(T.battle_timeout, s.word!.answer, damage), AFTER_MISS_MS, nextWord);
  };

  return (
    <BattleFrame b={b}>
      <PlayerHp />
      <TimeBar rate={timeRate} />
      <Txt style={bs.hint}>{word ? fmt(T.battle_hint, word.hint) : ''}</Txt>
      {/* 単語（□の所は空き枠、それ以外は文字だけ） */}
      <Animated.View style={[bs.row, answerShake.style]}>
        {word &&
          [...word.answer].map((c, k) => {
            const bi = blanks.indexOf(k);
            if (bi < 0) {
              return (
                <View key={k} style={{ width: 92, height: 100, marginHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={[bs.tileText, { fontSize: 44, color: COLORS.white }]}>{c}</Txt>
                </View>
              );
            }
            const has = bi < filled.length;
            return (
              <View key={k} style={[has ? bs.tile : bs.slot, { width: 92, height: 100, marginHorizontal: 6 }]}>
                <Txt style={[bs.tileText, { fontSize: 44 }]}>{has ? filled[bi] : ''}</Txt>
              </View>
            );
          })}
      </Animated.View>
      <Txt style={bs.message}>{b.message}</Txt>
      {/* 下の札 */}
      <View style={bs.row}>
        {choices.map((c) => (
          <Pressable key={`${word?.answer}-${c}`} onPress={() => onChoice(c)} style={[bs.tile, { width: 92, height: 100, marginHorizontal: 6 }]}>
            <Txt style={[bs.tileText, { fontSize: 44 }]}>{c}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={bs.bottom}>
        <Pressable style={({ pressed }) => [windowStyle, bs.smallButton, pressed && { opacity: 0.7 }]} onPress={removeLast}>
          <Txt style={bs.smallButtonText}>{T.battle_backspace}</Txt>
        </Pressable>
        <Pressable style={({ pressed }) => [windowStyle, bs.smallButton, pressed && { opacity: 0.7 }]} onPress={resetFilled}>
          <Txt style={bs.smallButtonText}>{T.battle_reset}</Txt>
        </Pressable>
        <ItemRow b={b} />
      </View>
    </BattleFrame>
  );
}
