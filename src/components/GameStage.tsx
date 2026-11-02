import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BASE_HEIGHT, BASE_WIDTH, COLORS } from '@/constants/game';

import { GameText } from './GameText';

type Props = {
  children: ReactNode;
  /** ゲーム画面の背景の色 */
  background?: string;
};

/** 今の舞台の大きさ（基準の単位）と、よけるべき場所（切り欠きなど） */
export type Stage = {
  width: number; // 舞台の横幅（1280 以上）
  height: number; // 舞台の高さ（720 以上）
  safe: { top: number; right: number; bottom: number; left: number };
};

const StageContext = createContext<Stage>({
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  safe: { top: 0, right: 0, bottom: 0, left: 0 },
});

/**
 * 舞台の大きさを知りたいときに使う。
 *   const { width, height, safe } = useStage();
 * ボタンなどを画面のはしに置くときは、safe のぶんだけ内がわにずらす
 */
export const useStage = () => useContext(StageContext);

/**
 * ゲームの画面の「舞台」。どの端末でも、画面いっぱいに表示する。
 *   ・横長の画面（iPhone など）：高さを 720 にして、横幅を画面に合わせて伸ばす（1280〜）
 *   ・太い画面（iPad・タブレットなど）：横幅を 1280 にして、高さを画面に合わせて伸ばす（720〜）
 *   → どの端末でも「真ん中の 1280×720」は必ず見える。大事なものはそこに置く
 *   ・背景は画面のはしまでぬる。ボタンは useStage() の safe でカメラの切り欠きなどをよける
 *   ・縦向きのときは「横にしてね」と出す（ブラウザでは横画面に固定できないため）
 */
export function GameStage({ children, background = COLORS.black }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (width < height) {
    return (
      <View style={[styles.root, styles.center]}>
        <GameText style={styles.rotateText}>スマホを横にしてね</GameText>
      </View>
    );
  }

  // ここで端末ごとの大きさを計算する
  const wide = width / height >= BASE_WIDTH / BASE_HEIGHT; // 16:9 より横長か
  const scale = wide ? height / BASE_HEIGHT : width / BASE_WIDTH; // 実際の画面 ÷ 基準
  const stage: Stage = {
    width: width / scale,
    height: height / scale,
    safe: {
      top: insets.top / scale,
      right: insets.right / scale,
      bottom: insets.bottom / scale,
      left: insets.left / scale,
    },
  };

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {/* 中身は基準の大きさで置いて、左上を中心に拡大・縮小する */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: stage.width,
          height: stage.height,
          transformOrigin: 'left top',
          transform: [{ scale }],
        }}>
        <StageContext.Provider value={stage}>{children}</StageContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
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
