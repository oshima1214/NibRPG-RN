import type { ReactNode } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { TypeText } from '@/components/TypeWriter';
import { Bar, Txt, nibButtonStyle, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { IMG } from '@/data/images';
import { ITEMS } from '@/data/shop';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { useGame } from '@/state/game';

import type { Battle } from './useBattle';

/**
 * 戦闘画面の共通のわく（Java版の activity_battle.xml など）。
 *   左：一時停止ボタン・先生の名前・HP・絵
 *   右：中身（ミニゲームごとにちがう）
 *   下：先生のひとこと（横いっぱいのウィンドウ）
 *   上に重ねる：赤くなる幕・勝ったときの結果・一時停止メニュー
 */
export function BattleFrame({
  b,
  children,
  touch,
  offset,
}: {
  b: Battle;
  children: ReactNode;
  /** 画面全体でのタッチ（よけゲームのハートを動かす） */
  touch?: ViewProps;
  /** 画面全体をゆらすときのずれ */
  offset?: { x: number; y: number };
}) {
  return (
    <GameStage background={COLORS.battleBg}>
      <View style={[{ flex: 1 }, offset && { transform: [{ translateX: offset.x }, { translateY: offset.y }] }]} {...touch}>
      <SafeArea style={styles.root}>
        <View style={styles.top}>
          {/* 左：先生 */}
          <View style={styles.left}>
            {b.pause.button}
            <Txt style={styles.teacherName}>{b.teacherName}</Txt>
            <Bar value={b.teacherHp} max={b.teacherMaxHp} color={COLORS.rpgRed} style={styles.teacherBar} />
            <Txt style={styles.teacherHp}>{fmt(T.battle_hp, b.teacherHp, b.teacherMaxHp)}</Txt>
            <Animated.View style={[styles.teacherImageWrap, b.teacherShake.style]}>
              <Image source={IMG[b.teacherImage]} style={styles.teacherImage} resizeMode="contain" />
            </Animated.View>
          </View>
          {/* 右：ゲーム */}
          <View style={styles.right}>{children}</View>
        </View>
        {/* 先生のひとこと（画面の下に、横いっぱいの大きなウィンドウで） */}
        <View style={[windowStyle, styles.line]}>
          <TypeText tw={b.tw} style={styles.lineText} />
        </View>
      </SafeArea>
      </View>

      {/* ダメージを受けたとき、一瞬赤くするための幕 */}
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: b.flash }]} />

      {/* 勝ったときの結果 */}
      {b.result && (
        <View style={styles.resultWrap}>
          <View style={[windowStyle, styles.resultBox]}>
            <Txt style={styles.resultText}>{b.result}</Txt>
            <Pressable
              style={({ pressed }) => [nibButtonStyle, styles.resultButton, pressed && { opacity: 0.7 }]}
              onPress={b.resultButton?.onPress ?? b.closeResult}>
              <Txt style={styles.resultButtonText}>{b.resultButton?.label ?? T.battle_to_map}</Txt>
            </Pressable>
          </View>
        </View>
      )}

      {b.pause.overlay}
    </GameStage>
  );
}

/** 自分のHP（バーと数字） */
export function PlayerHp() {
  const hp = useGame((s) => s.hp);
  const maxHp = useGame((s) => s.maxHp);
  return (
    <View style={styles.playerRow}>
      <Txt style={styles.you}>{T.battle_you}</Txt>
      <Bar value={hp} max={maxHp} style={styles.playerBar} />
      <Txt style={styles.playerHp}>{fmt(T.battle_hp, hp, maxHp)}</Txt>
    </View>
  );
}

/** 残り時間のバー（rate：1 → 0） */
export function TimeBar({ rate }: { rate: number }) {
  return <Bar value={rate} max={1} color={COLORS.rpgYellow} style={styles.timeBar} />;
}

/** 持っている道具のボタン（持っていない道具は出さない） */
export function ItemRow({ b }: { b: Battle }) {
  const counts = useGame((s) => s.itemCounts);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.items}>
      {ITEMS.map((it, i) =>
        counts[i] > 0 ? (
          <Pressable
            key={it.name}
            onPress={() => b.useItem(i)}
            style={({ pressed }) => [windowStyle, styles.item, pressed && { opacity: 0.7 }]}>
            <Txt style={styles.itemText}>{fmt(T.battle_item, it.name, counts[i])}</Txt>
          </Pressable>
        ) : null,
      )}
    </ScrollView>
  );
}

export const battleStyles = StyleSheet.create({
  hint: {
    marginTop: 16,
    color: COLORS.nibCyan,
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    minHeight: 76,
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
  row: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    marginRight: 16,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  smallButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  // 文字の札：白地に紺のふち（tile_letter）
  tile: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.nibNavy,
    borderWidth: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 答えの空き枠：うすい地に白い点線（tile_slot）
  slot: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: COLORS.white,
    borderWidth: 4,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    color: COLORS.nibNavy,
    fontWeight: 'bold',
  },
});

const styles = StyleSheet.create({
  root: {
    padding: 24,
  },
  top: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    width: 380,
    alignItems: 'center',
  },
  teacherName: {
    color: COLORS.rpgYellow,
    fontSize: 36,
    fontWeight: 'bold',
  },
  teacherBar: {
    alignSelf: 'stretch',
    height: 20,
    marginTop: 8,
  },
  teacherHp: {
    color: COLORS.rpgGray,
    fontSize: 24,
  },
  teacherImageWrap: {
    flex: 1,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  teacherImage: {
    width: '100%',
    height: '100%',
  },
  right: {
    flex: 1,
    paddingLeft: 32,
  },
  line: {
    marginTop: 16,
    minHeight: 96,
    paddingHorizontal: 32,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  lineText: {
    fontSize: 36,
    lineHeight: 48,
    fontWeight: 'bold',
  },
  flash: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.rpgRed,
  },
  resultWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  resultBox: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  resultText: {
    fontSize: 44,
    lineHeight: 64,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultButton: {
    marginTop: 32,
    paddingHorizontal: 64,
    paddingVertical: 20,
  },
  resultButtonText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  you: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  playerBar: {
    flex: 1,
    height: 20,
    marginHorizontal: 16,
  },
  playerHp: {
    fontSize: 28,
  },
  timeBar: {
    height: 16,
    marginTop: 20,
  },
  items: {
    flexGrow: 0,
  },
  item: {
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  itemText: {
    fontSize: 26,
  },
});
