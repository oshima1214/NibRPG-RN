import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameDialog } from '@/components/GameDialog';
import { GameStage, SafeArea } from '@/components/GameStage';
import { GameText } from '@/components/GameText';
import { Blink, nibButtonStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { FLOORS } from '@/data/map';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { bgm, jingle, pauseBgmSoon, resumeJingle, se } from '@/lib/sound';
import { useAchievements } from '@/state/achievements';
import { DEBUG, useGame } from '@/state/game';

const LOGO_RATIO = 339 / 169; // 学校ロゴの絵の、横 ÷ 縦
const TYPE_MS = 45; // お知らせの文字を1文字ずつ出す速さ

/**
 * タイトル画面（Java版の TitleActivity）。
 *   つづきから     ：遊んでいる途中なら出る。さっきいた場所から
 *   はじめる／はじめから：最初から遊ぶ
 *   見た目を変える ：キャラクリエイト画面へ（決定・やめるで、ここにもどる）
 */
export default function TitleScreen() {
  return (
    <GameStage background={COLORS.white}>
      <Title />
    </GameStage>
  );
}

type Dialog = 'restart' | 'debug' | null;

function Title() {
  const playing = useGame((s) => s.playing);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState(false); // 鍵のお知らせを出しているか
  const noticeRef = useRef(false);

  // クリア後（エンドロールのあと）：理事長室の鍵を手に入れたことを知らせる（1回だけ）
  useEffect(() => {
    if (useGame.getState().keyNotice) {
      useGame.setState({ keyNotice: false });
      noticeRef.current = true;
      setNotice(true);
      jingle('jg_key'); // ふしぎな音
    }
  }, []);

  // 画面を開いている間はタイトルの曲（お知らせ中はジングル）
  useFocusEffect(
    useCallback(() => {
      if (noticeRef.current) resumeJingle();
      else bgm('bgm_title');
      return () => pauseBgmSoon();
    }, []),
  );

  /** 最初から遊ぶ（見た目はそのまま） */
  const startNewGame = () => {
    useGame.getState().reset();
    useGame.setState({ playing: true });
    router.replace('/map');
  };

  return (
    <SafeArea>
      <View style={styles.container}>
        {/* 学校のロゴ */}
        <Image source={require('../../assets/images/nib_logo.png')} style={styles.logo} resizeMode="contain" />

        {/* 「RPG」の文字（ロゴと同じ紺色・ななめ・水色の影） */}
        <Text style={styles.logoText}>{T.title_logo}</Text>

        {/* ロゴの3色を使った線（赤・水色・紺） */}
        <View style={styles.line}>
          <View style={[styles.lineSmall, { backgroundColor: COLORS.nibRed }]} />
          <View style={[styles.lineSmall, { backgroundColor: COLORS.nibCyan }]} />
          <View style={[styles.lineLong, { backgroundColor: COLORS.nibNavy }]} />
        </View>

        <Text style={styles.sub}>{T.title_sub}</Text>

        {/* ボタン（遊んでいる途中なら「つづきから」を点滅させる） */}
        <View style={styles.buttons}>
          {playing && (
            <Blink style={styles.continueWrap}>
              <Pressable
                style={({ pressed }) => [nibButtonStyle, styles.startButton, pressed && styles.pressed]}
                onPress={() => {
                  se('se_ok');
                  router.replace('/map');
                }}>
                <Text style={styles.startText}>{T.title_continue}</Text>
              </Pressable>
            </Blink>
          )}
          <Blink active={!playing}>
            <Pressable
              style={({ pressed }) => [nibButtonStyle, styles.startButton, pressed && styles.pressed]}
              onPress={() => {
                se('se_ok');
                if (!useGame.getState().playing) startNewGame();
                else setDialog('restart'); // 途中なら「本当にいい？」と聞く
              }}>
              <Text style={styles.startText}>{playing ? T.title_restart : T.title_start}</Text>
            </Pressable>
          </Blink>
          <Pressable
            style={({ pressed }) => [styles.charaButton, pressed && styles.pressed]}
            onPress={() => {
              se('se_ok');
              router.push('/chara');
            }}>
            <Text style={styles.charaText}>{T.title_chara}</Text>
          </Pressable>
        </View>

        {/* デバッグ用：階をえらんで始める（DEBUG が true のときだけ出す） */}
        {DEBUG && (
          <Pressable style={styles.debug} onPress={() => setDialog('debug')}>
            <Text style={styles.debugText}>{T.debug_button}</Text>
          </Pressable>
        )}
      </View>

      {/* はじめから：確認 */}
      <GameDialog
        visible={dialog === 'restart'}
        message={T.title_restart_ask}
        onCancel={() => setDialog(null)}
        buttons={[
          { label: T.btn_no, onPress: () => setDialog(null) },
          {
            label: T.btn_yes,
            onPress: () => {
              setDialog(null);
              useAchievements.getState().resetAll(); // 「はじめから」は実績もリセット
              startNewGame();
            },
          },
        ]}
      />

      {/* デバッグ：何階から始めるかを選ぶ（1F〜5F ＋ 理事長戦） */}
      <GameDialog
        visible={dialog === 'debug'}
        title={T.debug_title}
        onCancel={() => setDialog(null)}
        items={[
          ...FLOORS.map((_, i) => ({
            label: fmt(T.debug_floor, i + 1),
            onPress: () => {
              setDialog(null);
              useAchievements.getState().resetAll(); // 実績もリセット
              useGame.getState().debugStart(i);
              router.replace('/map');
            },
          })),
          {
            label: T.debug_boss,
            onPress: () => {
              setDialog(null);
              useAchievements.getState().resetAll();
              useGame.getState().debugStartBoss(); // 理事長室の中から（鍵あり）
              router.replace('/map');
            },
          },
        ]}
        buttons={[{ label: T.btn_cancel, onPress: () => setDialog(null) }]}
      />

      {notice && (
        <KeyNotice
          onClose={() => {
            noticeRef.current = false;
            setNotice(false);
            bgm('bgm_title');
          }}
        />
      )}
    </SafeArea>
  );
}

/**
 * 「理事長室の鍵を手に入れた！」のお知らせ（RPGのメッセージウィンドウ風）。
 *   本文は1文字ずつ出る。画面をタップ：途中なら全部出す。出きっていたら閉じる
 */
function KeyNotice({ onClose }: { onClose: () => void }) {
  const body = T.boss_key_msg;
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = setTimeout(() => {
      timer.current = setInterval(() => {
        setShown((n) => {
          if (n + 1 >= body.length && timer.current) clearInterval(timer.current);
          return n + 1;
        });
      }, TYPE_MS);
    }, 300);
    return () => {
      clearTimeout(start);
      if (timer.current) clearInterval(timer.current);
    };
  }, [body]);

  const done = shown >= body.length;
  return (
    <Pressable
      style={styles.overlay}
      onPress={() => {
        if (!done) {
          if (timer.current) clearInterval(timer.current);
          setShown(body.length);
        } else {
          onClose();
        }
      }}>
      <View style={styles.noticeBox}>
        <GameText style={styles.noticeTitle}>{T.boss_key_title}</GameText>
        <GameText style={styles.noticeText}>
          {body.slice(0, shown)}
          <Text style={{ color: 'transparent' }}>{body.slice(shown)}</Text>
        </GameText>
        <Blink ms={500} to={0} active={done} style={{ opacity: done ? 1 : 0 }}>
          <GameText style={[styles.next, !done && { opacity: 0 }]}>▼</GameText>
        </Blink>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  continueWrap: {},
  startButton: {
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
  pressed: {
    opacity: 0.7,
  },
  debug: {
    marginTop: 16,
    padding: 12,
  },
  debugText: {
    color: COLORS.rpgGray,
    fontSize: 24,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 96,
    zIndex: 100,
  },
  noticeBox: {
    backgroundColor: COLORS.black,
    borderWidth: 6,
    borderColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 44,
    paddingTop: 32,
    paddingBottom: 20,
  },
  noticeTitle: {
    fontSize: 40,
  },
  noticeText: {
    fontSize: 32,
    lineHeight: 52,
    paddingTop: 24,
  },
  next: {
    fontSize: 28,
    textAlign: 'right',
  },
});
