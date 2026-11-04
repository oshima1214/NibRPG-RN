import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';

import { GameStage } from '@/components/GameStage';
import { GameText } from '@/components/GameText';
import { COLORS } from '@/constants/game';
import { unlockSound } from '@/lib/sound';
import { enterFullscreen } from '@/lib/web';

/**
 * 「タップしてスタート」の画面（Web だけ）。
 * ブラウザは、画面を1回タップするまで音を出せず、全画面にもできない。
 * そのため最初に1回タップしてもらい、そこで音と全画面をオンにしてからタイトルへ進む。
 * スマホのアプリでは必要ないので、すぐタイトルへ進む
 */
export default function StartScreen() {
  if (Platform.OS !== 'web') return <Redirect href="/title" />;
  return <TapToStart />;
}

function TapToStart() {
  // 文字をゆっくり点めつさせる
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 800, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  const start = () => {
    unlockSound();
    enterFullscreen();
    router.replace('/title');
  };

  return (
    <GameStage background={COLORS.black}>
      <Pressable style={styles.fill} onPress={start}>
        <Animated.View style={{ opacity: blink }}>
          <GameText style={styles.text}>画面をタップしてスタート</GameText>
        </Animated.View>
        <GameText style={styles.note}>音が出ます</GameText>
      </Pressable>
    </GameStage>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 48,
  },
  note: {
    marginTop: 24,
    fontSize: 24,
    color: COLORS.rpgGray,
  },
});
