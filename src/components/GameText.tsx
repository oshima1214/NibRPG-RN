import { StyleSheet, Text, type TextProps } from 'react-native';

import { COLORS, FONT } from '@/constants/game';

/** ドットの文字で書く Text（色は白。style で上書きできる） */
export function GameText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT.dot,
    color: COLORS.white,
  },
});
