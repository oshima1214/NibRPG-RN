import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/game';

import { GameButton, Txt, windowStyle } from './ui';

/**
 * 画面の上に出す、確認や選択のウィンドウ（Java版の AlertDialog のかわり）。
 *   ・message と buttons：「はい／いいえ」のような確認
 *   ・items：いくつかの中から1つ選ぶ（デバッグの階えらびなど）
 * うしろの画面は暗くなって、さわれなくなる
 */
export type DialogButton = { label: string; onPress: () => void };

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  items?: { label: string; onPress: () => void }[];
  buttons?: DialogButton[];
  /** 外側（暗いところ）を押したとき。なければ何もしない */
  onCancel?: () => void;
  /** 文字の入力欄など、ほかに出したいもの */
  children?: ReactNode;
  /** 選んでいる項目（items の番号）。印が付く */
  selected?: number;
};

export function GameDialog({ visible, title, message, items, buttons, onCancel, children, selected }: Props) {
  if (!visible) return null;
  return (
    <Pressable style={styles.overlay} onPress={onCancel}>
      <Pressable style={[windowStyle, styles.box]} onPress={() => {}}>
        {title ? <Txt style={styles.title}>{title}</Txt> : null}
        {message ? <Txt style={styles.message}>{message}</Txt> : null}
        {items ? (
          <ScrollView style={styles.list}>
            {items.map((it, i) => (
              <Pressable
                key={it.label}
                onPress={it.onPress}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
                <Txt style={styles.itemText}>
                  {selected === undefined ? '' : selected === i ? '◉ ' : '○ '}
                  {it.label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {children}
        {buttons && buttons.length > 0 ? (
          <View style={styles.buttons}>
            {buttons.map((b) => (
              <GameButton
                key={b.label}
                label={b.label}
                onPress={b.onPress}
                style={styles.button}
                textStyle={styles.buttonText}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  box: {
    minWidth: 560,
    maxWidth: 1000,
    maxHeight: 640,
    paddingHorizontal: 48,
    paddingVertical: 36,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.rpgYellow,
    marginBottom: 16,
  },
  message: {
    fontSize: 32,
    lineHeight: 48,
  },
  list: {
    marginTop: 8,
  },
  item: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  itemText: {
    fontSize: 32,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 32,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 30,
  },
});
