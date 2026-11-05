import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { create } from 'zustand';

import { COLORS } from '@/constants/game';
import { se } from '@/lib/sound';
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen, isStandalone, onFullscreenChange } from '@/lib/web';

import { GameDialog } from './GameDialog';
import { Txt, windowStyle } from './ui';

/**
 * Web で遊んでいるときの「全画面」ボタン（スマホのアプリ・ホーム画面から開いたときは出さない）。
 *   ・全画面にできるブラウザ（Android の Chrome・パソコンなど）：押すと全画面にする／やめる
 *   ・できないブラウザ（iPhone の Safari）：「ホーム画面に追加」のやり方を出す
 */
const useGuide = create<{ open: boolean }>(() => ({ open: false }));

export function FullscreenButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const [full, setFull] = useState(isFullscreen);
  useEffect(() => onFullscreenChange(() => setFull(isFullscreen())), []);
  if (Platform.OS !== 'web' || isStandalone()) return null;

  return (
    <Pressable
      style={({ pressed }) => [windowStyle, styles.button, style, pressed && { opacity: 0.7 }]}
      onPress={() => {
        se('se_ok');
        if (!canFullscreen()) useGuide.setState({ open: true });
        else if (isFullscreen()) exitFullscreen();
        else enterFullscreen();
      }}>
      <Txt style={styles.text}>{full ? '全画面をやめる' : '全画面'}</Txt>
    </Pressable>
  );
}

/** iPhone の Safari 向けの説明（GameStage の中に置く） */
export function FullscreenGuide() {
  const open = useGuide((s) => s.open);
  const close = () => useGuide.setState({ open: false });
  return (
    <GameDialog
      visible={open}
      title="全画面で遊ぶには"
      message={
        'iPhone の Safari では、この画面から全画面にできません。\n' +
        '画面の下の共有ボタン（□に↑のマーク）を押して、\n' +
        '「ホーム画面に追加」を選んでください。\n' +
        'ホーム画面にできたアイコンから開くと、全画面で遊べます。'
      }
      onCancel={close}
      buttons={[{ label: 'とじる', onPress: close }]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  text: {
    fontSize: 26,
    color: COLORS.white,
  },
});
