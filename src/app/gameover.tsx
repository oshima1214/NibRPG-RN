import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { Txt, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { BOSS_GAME_OVER } from '@/data/battle';
import { IMG, type ImageName } from '@/data/images';
import { T } from '@/data/texts';
import { jingle, se } from '@/lib/sound';
import { useGame } from '@/state/game';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** 攻略失敗画面（負けた先生によって中身が変わる。Java版の GameOverActivity） */
const OVERS: Record<number, { image: ImageName; name: string; message: string; bg: string }> = {
  1: { image: 's_m_sensei', name: T.over1_name, message: T.over1_msg, bg: COLORS.over1Bg },
  2: { image: 'e_sensei', name: T.over2_name, message: T.over2_msg, bg: COLORS.over2Bg },
  3: { image: 's_s_sensei', name: T.over3_name, message: T.over3_msg, bg: COLORS.over3Bg },
  4: { image: 'koutyou_sensei', name: T.over4_name, message: T.over4_msg, bg: COLORS.over4Bg },
  [BOSS_GAME_OVER]: { image: 'boss_rijicho', name: T.over5_name, message: T.over5_msg, bg: COLORS.over5Bg },
};

export default function GameOverScreen() {
  // 何人目の先生に負けたかを受け取る（1〜4。わからないときは4＝校長）
  const { teacher } = useLocalSearchParams<{ teacher?: string }>();
  const o = OVERS[Number(teacher)] ?? OVERS[4];

  useEffect(() => {
    jingle('jg_lose');
  }, []);

  /** HPを全部回復してから、次の画面へ */
  const go = (to: '/map' | '/title') => {
    se('se_ok');
    useGame.setState((s) => ({ hp: s.maxHp }));
    router.replace(to);
  };

  return (
    <GameStage background={o.bg}>
      <SafeArea style={styles.root}>
        {/* 左：負けた先生の絵 */}
        <Image source={IMG[o.image]} style={styles.teacher} resizeMode="contain" />
        {/* 右：GAME OVER・セリフ・ボタン */}
        <View style={styles.right}>
          <Text style={styles.logo}>{T.over_logo}</Text>
          <Txt style={styles.name}>{o.name}</Txt>
          <View style={[windowStyle, styles.window]}>
            <Txt style={styles.message}>{o.message}</Txt>
          </View>
          <View style={styles.buttons}>
            <Pressable style={({ pressed }) => [windowStyle, styles.button, pressed && { opacity: 0.7 }]} onPress={() => go('/map')}>
              <Txt style={styles.buttonText}>{T.retry}</Txt>
            </Pressable>
            {/* 続きは、タイトルの「つづきから」で遊べる（負けた場所から、HPは全部回復） */}
            <Pressable style={({ pressed }) => [windowStyle, styles.button, pressed && { opacity: 0.7 }]} onPress={() => go('/title')}>
              <Txt style={styles.buttonText}>{T.to_title}</Txt>
            </Pressable>
          </View>
        </View>
      </SafeArea>
    </GameStage>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacher: {
    height: 520,
    width: 360,
    marginRight: 80,
  },
  right: {
    alignItems: 'center',
    maxWidth: 760,
  },
  logo: {
    color: COLORS.rpgRed,
    fontSize: 128,
    fontWeight: 'bold',
    fontFamily: MONO,
    textShadowColor: '#550000',
    textShadowOffset: { width: 10, height: 10 },
    textShadowRadius: 2,
  },
  name: {
    marginTop: 8,
    color: COLORS.rpgGray,
    fontSize: 36,
    fontWeight: 'bold',
  },
  window: {
    marginTop: 24,
    padding: 40,
  },
  message: {
    fontSize: 36,
    lineHeight: 56,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 56,
    gap: 48,
  },
  button: {
    paddingHorizontal: 64,
    paddingVertical: 24,
  },
  buttonText: {
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
});
