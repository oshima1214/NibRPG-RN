import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/constants/game';

/**
 * ゲームでよく使う部品。Java版の drawable（rpg_window・nib_button など）と同じ見た目。
 * 大きさは Java版の dp の「× 2」（GameStage の基準の単位）
 */

/** ふつうの文字（Java版と同じ、スマホの標準の文字。色は白） */
export function Txt({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[ui.txt, style]} />;
}

/** RPGのウィンドウ：半とうめいの黒に白いわく（rpg_window） */
export const windowStyle: ViewStyle = {
  backgroundColor: 'rgba(0,0,0,0.8)',
  borderWidth: 6,
  borderColor: COLORS.white,
  borderRadius: 8,
};

/** 学校の色のボタン：紺に水色のわく（nib_button） */
export const nibButtonStyle: ViewStyle = {
  backgroundColor: COLORS.nibNavy,
  borderWidth: 6,
  borderColor: COLORS.nibCyan,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  /** 見た目：nib（紺のボタン）・window（黒いウィンドウ） */
  look?: 'nib' | 'window';
};

/** ボタン（文字1つ）。押している間は少し暗くなる */
export function GameButton({ label, onPress, style, textStyle, disabled, look = 'nib' }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        look === 'nib' ? nibButtonStyle : [windowStyle, ui.center],
        ui.button,
        style,
        pressed && ui.pressed,
      ]}>
      <Txt style={[ui.buttonText, textStyle]}>{label}</Txt>
    </Pressable>
  );
}

/** HPなどのバー（ProgressBar） */
export function Bar({
  value,
  max,
  color = COLORS.battleHpGreen,
  back = 'rgba(255,255,255,0.33)',
  style,
}: {
  value: number;
  max: number;
  color?: string;
  back?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const rate = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[ui.bar, { backgroundColor: back }, style]}>
      <View style={{ width: `${rate * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** 中身を点めつさせる（from → to → from …） */
export function Blink({
  children,
  ms = 600,
  to = 0.2,
  style,
  active = true,
}: {
  children: ReactNode;
  ms?: number;
  to?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      v.setValue(1);
      return;
    }
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to, duration: ms, useNativeDriver: native }),
        Animated.timing(v, { toValue: 1, duration: ms, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms, to, active]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

export const ui = StyleSheet.create({
  txt: {
    color: COLORS.white,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
  bar: {
    height: 24,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
  },
});
