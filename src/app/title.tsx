import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, useStage } from '@/components/GameStage';
import { GameText } from '@/components/GameText';
import { COLORS } from '@/constants/game';
import { se } from '@/lib/sound';
import { useBgm } from '@/lib/useBgm';

const LOGO_RATIO = 339 / 169; // 学校ロゴの絵の、横 ÷ 縦

/**
 * タイトル画面（仮）。見た目は Java 版のタイトルと同じ。
 * ボタンを押したときの動きは、これから作る。
 */
export default function TitleScreen() {
  const [note, setNote] = useState('');
  useBgm('bgm_title');

  // 「はじめる」をゆっくり点めつさせる（Java版と同じ 0.6 秒）
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 600, useNativeDriver: native }),
        Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  return (
    <GameStage background={COLORS.white}>
      <View style={styles.container}>
        {/* 学校のロゴ */}
        <Image
          source={require('../../assets/images/nib_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* 「RPG」の文字（ロゴと同じ紺色・ななめ・水色の影） */}
        <Text style={styles.logoText}>RPG</Text>

        {/* ロゴの3色を使った線（赤・水色・紺） */}
        <View style={styles.line}>
          <View style={[styles.lineSmall, { backgroundColor: COLORS.nibRed }]} />
          <View style={[styles.lineSmall, { backgroundColor: COLORS.nibCyan }]} />
          <View style={[styles.lineLong, { backgroundColor: COLORS.nibNavy }]} />
        </View>

        <Text style={styles.sub}>― 立ちはだかる先生たちを突破せよ！ ―</Text>

        {/* ボタン */}
        <View style={styles.buttons}>
          <Animated.View style={{ opacity: blink }}>
            <Pressable
              style={styles.startButton}
              onPress={() => {
                se('se_ok');
                setNote('ゲームの本編は、これから作ります');
              }}>
              <Text style={styles.startText}>▶ はじめる</Text>
            </Pressable>
          </Animated.View>
          <Pressable
            style={styles.charaButton}
            onPress={() => {
              se('se_ok');
              setNote('キャラクリエイトは、これから作ります');
            }}>
            <Text style={styles.charaText}>見た目を変える</Text>
          </Pressable>
        </View>

        <GameText style={styles.note}>{note}</GameText>
      </View>

      <VersionLabel />
    </GameStage>
  );
}

/** 右下の「作成中」の文字。切り欠きなどにかからないように、safe のぶん内がわに置く */
function VersionLabel() {
  const { safe } = useStage();
  return (
    <GameText style={[styles.version, { right: 24 + safe.right, bottom: 16 + safe.bottom }]}>
      React Native 版（作成中）
    </GameText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  logo: {
    height: 220,
    width: 220 * LOGO_RATIO,
  },
  logoText: {
    color: COLORS.nibNavy,
    fontSize: 120,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 18,
    textShadowColor: COLORS.nibCyan,
    textShadowOffset: { width: 10, height: 10 },
    textShadowRadius: 2,
  },
  line: {
    flexDirection: 'row',
    height: 12,
    marginTop: 4,
  },
  lineSmall: {
    width: 60,
  },
  lineLong: {
    width: 360,
  },
  sub: {
    marginTop: 20,
    color: COLORS.nibNavy,
    fontSize: 32,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 44,
    gap: 28,
  },
  startButton: {
    backgroundColor: COLORS.nibNavy,
    borderColor: COLORS.nibCyan,
    borderWidth: 6,
    borderRadius: 8,
    paddingHorizontal: 56,
    paddingVertical: 24,
  },
  startText: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  charaButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.nibNavy,
    borderWidth: 6,
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  charaText: {
    color: COLORS.nibNavy,
    fontSize: 32,
    fontWeight: 'bold',
  },
  note: {
    marginTop: 20,
    height: 36,
    fontSize: 24,
    color: COLORS.rpgGray,
  },
  version: {
    position: 'absolute',
    fontSize: 22,
    color: COLORS.rpgGray,
  },
});
