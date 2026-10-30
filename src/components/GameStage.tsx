import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BASE_HEIGHT, BASE_WIDTH, COLORS } from '@/constants/game';

import { GameText } from './GameText';

type Props = {
  children: ReactNode;
  /** ゲーム画面の背景の色（まわりのすき間は黒） */
  background?: string;
};

/**
 * ゲームの画面の「舞台」。
 *   ・中身は、いつも「横1280・縦720」の大きさで作ればよい
 *   ・実際の画面（スマホ・タブレット・パソコンのブラウザ）に合わせて、たて横の比をたもったまま拡大・縮小する
 *   ・カメラの切り欠きやステータスバーの部分はよける。あまったすき間は黒くぬる
 *   ・縦向きのときは「横にしてね」と出す（ブラウザでは横画面に固定できないため）
 */
export function GameStage({ children, background = COLORS.black }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 使える場所（切り欠きなどをのぞいた広さ）
  const areaW = width - insets.left - insets.right;
  const areaH = height - insets.top - insets.bottom;

  if (areaW < areaH) {
    return (
      <View style={[styles.root, styles.center]}>
        <GameText style={styles.rotateText}>スマホを横にしてね</GameText>
      </View>
    );
  }

  // 基準の大きさを、使える場所にちょうど入る倍率
  const scale = Math.min(areaW / BASE_WIDTH, areaH / BASE_HEIGHT);
  const stageW = BASE_WIDTH * scale;
  const stageH = BASE_HEIGHT * scale;

  return (
    <View style={styles.root}>
      {/* 実際の大きさの枠（まん中に置く） */}
      <View
        style={{
          position: 'absolute',
          left: insets.left + (areaW - stageW) / 2,
          top: insets.top + (areaH - stageH) / 2,
          width: stageW,
          height: stageH,
          overflow: 'hidden',
          backgroundColor: background,
        }}>
        {/* 中身は 1280×720 で置いて、まん中を中心に縮める */}
        <View
          style={{
            position: 'absolute',
            left: (stageW - BASE_WIDTH) / 2,
            top: (stageH - BASE_HEIGHT) / 2,
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: [{ scale }],
          }}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateText: {
    fontSize: 20,
  },
});
