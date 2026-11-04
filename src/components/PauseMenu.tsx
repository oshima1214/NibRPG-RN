import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/game';
import { T } from '@/data/texts';
import { se } from '@/lib/sound';

import { GameText } from './GameText';
import { nibButtonStyle, windowStyle } from './ui';

/**
 * 戦闘画面の「一時停止」ボタンと、止めている間のメニュー（つづける・リタイア）。Java版の PauseMenu。
 *   const pause = usePauseMenu({ canPause, onPause, onResume, onRetire });
 *   ボタン：{pause.button}（先生の名前の上に置く）
 *   メニュー：{pause.overlay}（画面のいちばん最後に置く）
 */
type Options = {
  canPause: boolean; // 一時停止できるか（勝ち負けが決まったら false）
  onPause: () => void; // 止めるときにすること（時間を止める）
  onResume: () => void; // 再開するときにすること（時間を進める）
  onRetire: () => void; // リタイアするときにすること（マップに戻る）
};

export function usePauseMenu({ canPause, onPause, onResume, onRetire }: Options) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false); // リタイアを1回押して、確認中か

  const doOpen = () => {
    if (open || !canPause) return;
    setConfirm(false);
    setOpen(true);
    se('se_pause');
    onPause();
  };

  const doClose = () => {
    if (!open) return;
    setOpen(false);
    onResume();
  };

  const button = canPause ? (
    <Pressable
      onPress={doOpen}
      style={({ pressed }) => [windowStyle, styles.button, pressed && styles.pressed]}>
      <GameText style={styles.buttonText}>{T.pause_button}</GameText>
    </Pressable>
  ) : null;

  const overlay = open ? (
    <Pressable style={styles.overlay} onPress={() => {}}>
      <View style={[windowStyle, styles.box]}>
        <GameText style={styles.title}>{T.pause_title}</GameText>
        <Pressable
          style={({ pressed }) => [nibButtonStyle, styles.menuButton, pressed && styles.pressed]}
          onPress={() => {
            se('se_ok');
            doClose();
          }}>
          <GameText style={styles.menuText}>{T.pause_continue}</GameText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [nibButtonStyle, styles.menuButton, pressed && styles.pressed]}
          onPress={() => {
            if (!confirm) {
              setConfirm(true); // 1回目：確認する
              se('se_cancel');
              return;
            }
            setOpen(false);
            se('se_retire');
            onRetire();
          }}>
          <GameText style={styles.menuText}>{confirm ? T.pause_retire_confirm : T.pause_retire}</GameText>
        </Pressable>
        <GameText style={styles.note}>{T.pause_retire_note}</GameText>
      </View>
    </Pressable>
  ) : null;

  return { button, overlay, isOpen: open, open: doOpen, close: doClose };
}

const styles = StyleSheet.create({
  button: {
    minWidth: 128,
    minHeight: 88,
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 32,
  },
  pressed: {
    opacity: 0.7,
  },
  overlay: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.69)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  box: {
    alignItems: 'stretch',
    paddingHorizontal: 64,
    paddingVertical: 40,
  },
  title: {
    color: COLORS.rpgYellow,
    fontSize: 48,
    textAlign: 'center',
  },
  menuButton: {
    marginTop: 28,
    paddingHorizontal: 64,
    paddingVertical: 20,
  },
  menuText: {
    fontSize: 36,
  },
  note: {
    marginTop: 20,
    fontSize: 24,
    color: '#B0BEC5',
    textAlign: 'center',
  },
});
