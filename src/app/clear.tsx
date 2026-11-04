import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { Txt, nibButtonStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { IMG, type ImageName } from '@/data/images';
import { T } from '@/data/texts';
import { jingle, se } from '@/lib/sound';
import { checkClear } from '@/state/achievements';

const LOGO_RATIO = 339 / 169;
const TEACHERS: ImageName[] = ['s_m_sensei', 'e_sensei', 's_s_sensei', 'koutyou_sensei'];

/**
 * ゲームクリア画面（Java版の ClearActivity）。学校ロゴの色（紺・水色・赤）を使った「卒業証書」風。
 * クリアしても、理事長を倒すまではゲームが続く（エンドロールのあと、理事長室の鍵をもらう）
 */
export default function ClearScreen() {
  const native = Platform.OS !== 'web';
  const pop = useRef(new Animated.Value(0.3)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    jingle('jg_clear');
    checkClear(); // クリアが条件の実績を調べる
    // 「GAME CLEAR」を小さい状態からポンと大きくする。卒業証書は少しおくれて、ふわっと出す
    Animated.timing(pop, { toValue: 1, duration: 500, useNativeDriver: native }).start();
    Animated.timing(fade, { toValue: 1, delay: 400, duration: 700, useNativeDriver: native }).start();
  }, [pop, fade, native]);

  return (
    <GameStage background={COLORS.white}>
      {/* 上の帯 */}
      <View style={styles.band}>
        <View style={{ width: 120, backgroundColor: COLORS.nibRed }} />
        <View style={{ width: 60, backgroundColor: COLORS.nibCyan }} />
        <View style={{ flex: 1, backgroundColor: COLORS.nibNavy }} />
      </View>
      <SafeArea style={styles.middle}>
        {/* 左：ロゴと「GAME CLEAR」 */}
        <View style={styles.col}>
          <Image source={require('../../assets/images/nib_logo.png')} style={styles.logo} resizeMode="contain" />
          <Animated.Text style={[styles.clear, { transform: [{ scale: pop }] }]}>{T.clear_logo}</Animated.Text>
          <View style={styles.line}>
            <View style={{ width: 60, backgroundColor: COLORS.nibRed }} />
            <View style={{ width: 60, backgroundColor: COLORS.nibCyan }} />
            <View style={{ width: 360, backgroundColor: COLORS.nibNavy }} />
          </View>
          {/* 先生4人（クリアをお祝いしている） */}
          <View style={styles.teachers}>
            {TEACHERS.map((t) => (
              <Image key={t} source={IMG[t]} style={styles.teacher} resizeMode="contain" />
            ))}
          </View>
        </View>
        {/* 右：卒業証書とボタン */}
        <View style={styles.col}>
          <Animated.View style={[styles.cert, { opacity: fade }]}>
            <View style={styles.certInner} />
            <Txt style={styles.certTitle}>{T.clear_cert_title}</Txt>
            <View style={styles.certRule} />
            <Text style={styles.certMsg}>{T.clear_msg}</Text>
            <Txt style={styles.certSign}>{T.clear_sign}</Txt>
          </Animated.View>
          <Pressable
            style={({ pressed }) => [nibButtonStyle, styles.next, pressed && { opacity: 0.7 }]}
            onPress={() => {
              se('se_ok');
              router.replace('/endroll');
            }}>
            <Txt style={styles.nextText}>{T.to_endroll}</Txt>
          </Pressable>
        </View>
      </SafeArea>
      {/* 下の帯（上の帯と左右を逆にした並び） */}
      <View style={styles.band}>
        <View style={{ flex: 1, backgroundColor: COLORS.nibNavy }} />
        <View style={{ width: 120, backgroundColor: COLORS.nibCyan }} />
        <View style={{ width: 60, backgroundColor: COLORS.nibRed }} />
      </View>
    </GameStage>
  );
}

const styles = StyleSheet.create({
  band: {
    height: 20,
    flexDirection: 'row',
  },
  middle: {
    flexDirection: 'row',
    paddingHorizontal: 48,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 128,
    width: 128 * LOGO_RATIO,
  },
  clear: {
    marginTop: 16,
    color: COLORS.nibNavy,
    fontSize: 80,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: COLORS.nibCyan,
    textShadowOffset: { width: 10, height: 10 },
    textShadowRadius: 2,
  },
  line: {
    flexDirection: 'row',
    height: 12,
    marginTop: 8,
  },
  teachers: {
    flexDirection: 'row',
    height: 220,
    marginTop: 24,
    gap: 20,
  },
  teacher: {
    height: 220,
    width: 130,
  },
  cert: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderColor: COLORS.nibNavy,
    borderWidth: 8,
    paddingHorizontal: 56,
    paddingVertical: 44,
  },
  certInner: {
    position: 'absolute',
    left: 8,
    top: 8,
    right: 8,
    bottom: 8,
    borderColor: COLORS.nibCyan,
    borderWidth: 4,
  },
  certTitle: {
    color: COLORS.nibNavy,
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  certRule: {
    height: 4,
    marginVertical: 16,
    backgroundColor: COLORS.nibRed,
  },
  certMsg: {
    color: COLORS.black,
    fontSize: 30,
    lineHeight: 48,
    textAlign: 'center',
  },
  certSign: {
    marginTop: 16,
    color: COLORS.nibNavy,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  next: {
    marginTop: 32,
    paddingHorizontal: 80,
    paddingVertical: 20,
  },
  nextText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
});
