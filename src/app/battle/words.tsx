import { useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { BattleFrame, ItemRow, PlayerHp, TimeBar, battleStyles as bs } from '@/components/battle/BattleFrame';
import { useBattle, useShake } from '@/components/battle/useBattle';
import { Txt, windowStyle } from '@/components/ui';
import {
  BASE_TIME_MS,
  BOSS_BASE_TIME_MS,
  BOSS_DUMMY_COUNT,
  BOSS_PER_LETTER_MS,
  BOSS_WORDS,
  DUMMY_COUNT,
  DUMMY_LETTERS,
  PER_LETTER_MS,
  WORDS,
  type Word,
} from '@/data/battle';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { lookAlikes, rand, shuffle } from '@/lib/random';
import { se } from '@/lib/sound';
import { useGame } from '@/state/game';

/**
 * 2Fの戦闘：ことば並べバトル（Java版の BattleActivity）。
 * バラバラの文字の札をタップして並べ、制限時間内に単語を完成させる。
 *   正解    → 先生にダメージ（速く答えるとクリティカル）
 *   時間切れ → 先生から精神的ダメージ
 */
const TICK_MS = 50; // 残り時間を更新する間かく
const INTRO_MS = 1500; // 「あらわれた！」を見せる時間
const AFTER_HIT_MS = 1000; // 正解のあと、次の問題までの時間
const AFTER_MISS_MS = 1600; // 時間切れのあと、次の問題までの時間

export default function WordsBattle() {
  const [word, setWord] = useState<Word | null>(null);
  const [tiles, setTiles] = useState<string[]>([]); // 札の文字（バラバラの順）
  const [picked, setPicked] = useState<number[]>([]); // タップした札の番号（順番どおり）
  const [timeRate, setTimeRate] = useState(1);
  const [boxSize, setBoxSize] = useState(100); // 札の大きさ
  const deck = useRef<Word[]>([]); // これから出す問題
  const st = useRef({ word: null as Word | null, tiles: [] as string[], picked: [] as number[], start: 0, limit: 1, busy: true });
  const answerShake = useShake();

  const b = useBattle({
    loseLine: T.battle_teacher_lose,
    introMs: INTRO_MS,
    onStart: () => nextWord(),
  });

  /** 次の問題を出す */
  const nextWord = () => {
    if (b.finished.current) return;
    // 問題の山がなくなったら、全部の単語を混ぜて作り直す
    if (deck.current.length === 0) deck.current = shuffle([...(b.boss ? BOSS_WORDS : WORDS)]);
    const w = deck.current.shift()!;
    // 札：答えの文字 ＋ ハズレの文字 を混ぜる
    const t = [...w.answer];
    const dummies = b.boss ? BOSS_DUMMY_COUNT : DUMMY_COUNT;
    for (let i = 0; i < dummies; i++) {
      let d: string | null = null;
      if (b.boss) {
        // 理事長戦：答えの文字に見た目が似ている文字をハズレにする
        const c = w.answer[rand(w.answer.length)];
        const group = lookAlikes(c);
        if (group.length > 1) {
          let g2: string;
          do g2 = group[rand(group.length)];
          while (g2 === c);
          d = g2;
        }
      }
      if (d === null) d = DUMMY_LETTERS[rand(DUMMY_LETTERS.length)];
      t.push(d);
    }
    setBoxSize(t.length > 8 ? 88 : 100); // 札が多いときは、少し小さくして1列に入れる
    shuffle(t);
    const limit = b.boss ? BOSS_BASE_TIME_MS + BOSS_PER_LETTER_MS * w.answer.length : BASE_TIME_MS + PER_LETTER_MS * w.answer.length;
    st.current = { word: w, tiles: t, picked: [], start: b.timer.now(), limit, busy: false };
    setWord(w);
    setTiles(t);
    setPicked([]);
    b.setMessage('');
    setTimeRate(1);
    b.timer.after(0, tick);
  };

  /** 残り時間を減らしていく処理（くり返し呼ばれる） */
  const tick = () => {
    const s = st.current;
    if (s.busy || b.finished.current) return;
    const elapsed = b.timer.now() - s.start;
    setTimeRate(Math.max(0, 1 - elapsed / s.limit));
    if (elapsed >= s.limit) onTimeout();
    else b.timer.after(TICK_MS, tick);
  };

  const setP = (p: number[]) => {
    st.current.picked = p;
    setPicked(p);
  };

  /** 札がタップされたとき */
  const onTile = (i: number) => {
    const s = st.current;
    if (s.busy || s.picked.includes(i) || !s.word) return;
    const p = [...s.picked, i];
    setP(p);
    se('se_tile_place');
    if (p.length === s.word.answer.length) check(p);
  };

  /** 最後に入れた1文字を消す */
  const removeLast = () => {
    const s = st.current;
    if (s.busy || s.picked.length === 0) return;
    setP(s.picked.slice(0, -1));
    se('se_tile_remove');
  };

  /** 入れた文字を全部消す */
  const resetPicked = () => {
    const s = st.current;
    if (s.busy) return;
    if (s.picked.length > 0) se('se_tile_remove');
    setP([]);
  };

  /** 文字が全部うまったら、答え合わせ */
  const check = (p: number[]) => {
    const s = st.current;
    if (p.map((i) => s.tiles[i]).join('') === s.word!.answer) {
      onCorrect();
    } else {
      b.setMessage(T.battle_wrong);
      answerShake.shake();
      setP([]); // ちがったら、入れ直し（時間は止まらない）
    }
  };

  /** 正解：先生にダメージ */
  const onCorrect = () => {
    const s = st.current;
    s.busy = true;
    const elapsed = b.timer.now() - s.start;
    const critical = elapsed <= s.limit / 2; // 半分の時間で答えたらクリティカル
    let damage = useGame.getState().rollAttack(); // 少しばらつく
    if (critical) damage = Math.trunc((damage * 3) / 2);
    const r = b.hitTeacher(
      damage,
      fmt(critical ? T.battle_critical : T.battle_correct, b.teacherName, damage),
      critical,
    );
    if (r === 'continue') b.timer.after(AFTER_HIT_MS, nextWord);
  };

  /** 時間切れ：先生から精神的ダメージ */
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
      {/* ヒント */}
      <Txt style={bs.hint}>{word ? fmt(T.battle_hint, word.hint) : ''}</Txt>
      {/* 答えの枠 */}
      <Animated.View style={[bs.row, answerShake.style]}>
        {word &&
          [...word.answer].map((_, k) => {
            const filled = k < picked.length;
            return (
              <View
                key={k}
                style={[filled ? bs.tile : bs.slot, { width: boxSize, height: boxSize, marginHorizontal: 6 }]}>
                <Txt style={[bs.tileText, { fontSize: 48 }]}>{filled ? tiles[picked[k]] : ''}</Txt>
              </View>
            );
          })}
      </Animated.View>
      {/* 結果のメッセージ */}
      <Txt style={bs.message}>{b.message}</Txt>
      {/* 文字の札 */}
      <View style={bs.row}>
        {tiles.map((t, i) => (
          <Pressable
            key={`${word?.answer}-${i}`}
            onPress={() => onTile(i)}
            style={[bs.tile, { width: boxSize, height: boxSize, marginHorizontal: 6, opacity: picked.includes(i) ? 0.25 : 1 }]}>
            <Txt style={[bs.tileText, { fontSize: 48 }]}>{t}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      {/* 下：消すボタンと道具 */}
      <View style={bs.bottom}>
        <Pressable style={({ pressed }) => [windowStyle, bs.smallButton, pressed && { opacity: 0.7 }]} onPress={removeLast}>
          <Txt style={bs.smallButtonText}>{T.battle_backspace}</Txt>
        </Pressable>
        <Pressable style={({ pressed }) => [windowStyle, bs.smallButton, pressed && { opacity: 0.7 }]} onPress={resetPicked}>
          <Txt style={bs.smallButtonText}>{T.battle_reset}</Txt>
        </Pressable>
        <ItemRow b={b} />
      </View>
    </BattleFrame>
  );
}
