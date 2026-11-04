import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStage, SafeArea, useStage } from '@/components/GameStage';
import { Txt, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { T } from '@/data/texts';
import { useBgm } from '@/lib/useBgm';
import { useGame } from '@/state/game';

const SPEED = 2.4; // 1回に上へ動かす量（Java版の 1.2dp）
const FAST = 4; // 押している間は何倍速か
const FRAME_MS = 16; // 動かす間かく（約60回／秒）
const WAIT_MS = 3000; // 止まってからタイトルへ戻るまで
const LOGO_RATIO = 339 / 169;

/** エンドロール（クリア画面のあとに流れる。Java版の EndrollActivity） */
export default function EndrollScreen() {
  return (
    <GameStage background={COLORS.nibNavy}>
      <Endroll />
    </GameStage>
  );
}

function Endroll() {
  useBgm('bgm_ending');
  const { height } = useStage();
  const [y, setY] = useState(height); // 画面のすぐ下からスタート
  const fast = useRef(false); // 押している間 true
  const finished = useRef(false); // タイトルへ戻ったら true
  const finalCenter = useRef<number | null>(null); // 最後のかたまりのまん中（文字のかたまりの中での位置）

  /** タイトル画面へ戻る（2回呼ばれても1回だけ動く） */
  const goTitle = () => {
    if (finished.current) return;
    finished.current = true;
    if (useGame.getState().playing) {
      // 校長に勝ったあと：理事長室の鍵をもらう。
      // 続きは1Fのはじめの場所から（5Fから下りてくるのは大変なので）
      useGame.setState({ bossKey: true, floor: 0, px: -1, py: -1, dir: 0, keyNotice: true });
    }
    router.replace('/title');
  };

  useEffect(() => {
    let cur = height;
    let wait: ReturnType<typeof setTimeout> | null = null;
    const t = setInterval(() => {
      if (finalCenter.current === null) return;
      // 最後のかたまりが、画面のまん中に来る位置で止める
      const endY = height / 2 - finalCenter.current;
      cur -= SPEED * (fast.current ? FAST : 1);
      if (cur <= endY) {
        cur = endY;
        clearInterval(t);
        wait = setTimeout(goTitle, WAIT_MS); // 少し待ってタイトルへ
      }
      setY(cur);
    }, FRAME_MS);
    return () => {
      clearInterval(t);
      if (wait) clearTimeout(wait);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  return (
    <SafeArea>
      {/* 文字が流れる場所（ここを押している間は早送り） */}
      <View
        style={styles.stage}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => (fast.current = true)}
        onResponderRelease={() => (fast.current = false)}
        onResponderTerminate={() => (fast.current = false)}>
        <View style={[styles.credits, { transform: [{ translateY: y }] }]}>
          <Text style={styles.gameTitle}>{T.end_game_title}</Text>
          <View style={styles.space} />
          <Head>{T.end_head_staff}</Head>
          <Label>{T.end_label_staff}</Label>
          <Name>{T.end_staff1}</Name>
          <Name>{T.end_staff2}</Name>
          <View style={styles.space} />
          <Head>{T.end_head_tools}</Head>
          <Label>{T.end_label_dev}</Label>
          <Name>{T.end_tool_dev}</Name>
          <Label>{T.end_label_ai}</Label>
          <Name>{T.end_tool_ai1}</Name>
          <Note>{T.end_tool_ai1_role}</Note>
          <Name>{T.end_tool_ai2}</Name>
          <Note>{T.end_tool_ai2_role}</Note>
          <Name>{T.end_tool_ai3}</Name>
          <Note>{T.end_tool_ai3_role}</Note>
          <View style={styles.space} />
          {/* サウンド：使わせてもらった音のサイト */}
          <Head>{T.end_head_sound}</Head>
          <Label>{T.end_label_bgm}</Label>
          <Name>{T.end_sound_bgm}</Name>
          <Note>{T.end_sound_bgm_url}</Note>
          <Label>{T.end_label_se}</Label>
          <Name>{T.end_sound_se}</Name>
          <Note>{T.end_sound_se_url}</Note>
          <View style={styles.space} />
          <Head>{T.end_head_thanks}</Head>
          <Name>{T.end_thanks1}</Name>
          <Name>{T.end_thanks2}</Name>
          <Name>{T.end_thanks3}</Name>
          <View style={styles.space} />
          <View style={styles.space} />
          {/* 最後：ここが画面のまん中に来たら止まる */}
          <View
            style={styles.finalBlock}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              finalCenter.current = l.y + l.height / 2;
            }}>
            <View style={styles.certInner} />
            <Image source={require('../../assets/images/nib_logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.last}>{T.end_last}</Text>
          </View>
        </View>
      </View>

      {/* 右上：スキップボタン */}
      <Pressable style={({ pressed }) => [windowStyle, styles.skip, pressed && { opacity: 0.7 }]} onPress={goTitle}>
        <Txt style={styles.skipText}>{T.end_skip}</Txt>
      </Pressable>
      {/* 左下：操作の説明 */}
      <Txt style={styles.hint}>{T.end_hint}</Txt>
    </SafeArea>
  );
}

const Head = ({ children }: { children: string }) => <Txt style={styles.head}>{children}</Txt>;
const Label = ({ children }: { children: string }) => <Txt style={styles.label}>{children}</Txt>;
const Name = ({ children }: { children: string }) => <Txt style={styles.name}>{children}</Txt>;
const Note = ({ children }: { children: string }) => <Txt style={styles.note}>{children}</Txt>;

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  credits: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  gameTitle: {
    color: COLORS.white,
    fontSize: 96,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: COLORS.nibCyan,
    textShadowOffset: { width: 10, height: 10 },
    textShadowRadius: 2,
  },
  space: {
    height: 160,
  },
  head: {
    marginBottom: 32,
    color: COLORS.nibCyan,
    fontSize: 48,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 24,
    color: COLORS.rpgGray,
    fontSize: 28,
  },
  name: {
    marginTop: 8,
    fontSize: 44,
  },
  note: {
    marginTop: 4,
    color: COLORS.nibCyan,
    fontSize: 28,
  },
  finalBlock: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.nibNavy,
    borderWidth: 8,
    paddingHorizontal: 80,
    paddingVertical: 48,
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
  logo: {
    height: 160,
    width: 160 * LOGO_RATIO,
  },
  last: {
    marginTop: 24,
    color: COLORS.nibNavy,
    fontSize: 56,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  skip: {
    position: 'absolute',
    top: 32,
    right: 32,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  hint: {
    position: 'absolute',
    left: 32,
    bottom: 32,
    color: COLORS.nibCyan,
    fontSize: 24,
  },
});
