import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { se } from '@/lib/sound';

import { GameText as DotTxt } from './GameText';
import { Txt } from './ui';

/**
 * 先生のセリフを、1文字ずつ表示する係（Java版の TypeWriter）。
 *   ・まだ出ていない文字は「透明」にしておく（文字が増えても行がガタガタ動かない）
 *   ・新しいセリフを出すと、前のセリフの表示は止まる
 *   ・show() は「全部表示し終わるまでの時間（ミリ秒）」を返す
 *     → その時間がたってからゲームを始めれば、セリフを読んでからスタートになる
 *
 * 使い方：
 *   const tw = useTypeWriter();
 *   const ms = tw.show('こんにちは');
 *   <TypeText tw={tw} style={...} />
 */
export const CHAR_MS = 45; // 1文字を出す間隔
export const AFTER_MS = 500; // 全部出たあと、ゲームが始まるまでの間

export type TypeWriterState = {
  text: string;
  shown: number;
  /** セリフを1文字ずつ出す。全部出し終わる（＋少し間をあける）までの時間を返す */
  show: (text: string) => number;
  /** すぐに全部出す */
  finish: () => void;
  /** 全部出たか */
  done: boolean;
};

export function useTypeWriter(options?: { sound?: boolean; charMs?: number }): TypeWriterState {
  const sound = options?.sound ?? true;
  const charMs = options?.charMs ?? CHAR_MS;
  const [text, setText] = useState('');
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stop, []);

  const show = useCallback(
    (s: string) => {
      stop();
      const n = s.length;
      setText(s);
      let i = 0;
      const step = () => {
        if (i < n) {
          // 2文字に1回、ポッと鳴らす（空白や記号の「」は鳴らさない）
          const ch = s[i];
          if (sound && i % 2 === 0 && ch !== ' ' && ch !== '　' && ch !== '「' && ch !== '」') {
            se('se_text', 0.5);
          }
          i++;
          setShown(i);
        }
        if (i >= n) stop();
      };
      setShown(0);
      if (n > 0) {
        // Java版と同じく、1文字目はすぐ出す
        step();
        if (i < n) timer.current = setInterval(step, charMs);
      }
      return n * charMs + AFTER_MS;
    },
    [sound, charMs],
  );

  const finish = useCallback(() => {
    stop();
    setShown(Number.MAX_SAFE_INTEGER);
  }, []);

  return { text, shown, show, finish, done: shown >= text.length };
}

/** useTypeWriter のセリフを表示する文字 */
export function TypeText({
  tw,
  style,
  dot,
}: {
  tw: TypeWriterState;
  style?: StyleProp<TextStyle>;
  dot?: boolean;
}) {
  const n = Math.min(tw.shown, tw.text.length);
  const Comp = dot ? DotTxt : Txt;
  return (
    <Comp style={style}>
      {tw.text.slice(0, n)}
      {n < tw.text.length ? <Text style={{ color: 'transparent' }}>{tw.text.slice(n)}</Text> : null}
    </Comp>
  );
}
