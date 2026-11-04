import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/game';
import { T } from '@/data/texts';
import { useAchievements } from '@/state/achievements';

import { GameText } from './GameText';
import { useStage } from './stageContext';

/**
 * 実績を解除したときに、画面の右上にすべりこんでくるポップアップ（Java版の Achievements.showPopup）。
 * いくつも解除したときは、順番に1つずつ出す。各画面の GameStage の中に置く
 */
const POPUP_MS = 3000; // ポップアップを出しておく時間
const SLIDE_MS = 300; // すべりこむ・出ていく時間

export function AchievementPopup() {
  const popups = useAchievements((s) => s.popups);
  const { safe } = useStage();
  const [title, setTitle] = useState<string | null>(null);
  const x = useRef(new Animated.Value(800)).current;

  const head = popups[0] ?? null;
  useEffect(() => {
    if (!head) return;
    const native = Platform.OS !== 'web';
    setTitle(head);
    x.setValue(800);
    const anim = Animated.sequence([
      Animated.timing(x, { toValue: 0, duration: SLIDE_MS, useNativeDriver: native }),
      Animated.delay(POPUP_MS),
      Animated.timing(x, { toValue: 800, duration: SLIDE_MS, useNativeDriver: native }),
    ]);
    anim.start(({ finished }) => {
      if (finished) {
        setTitle(null);
        useAchievements.getState().popDone();
      }
    });
    return () => anim.stop();
    // 同じ名前が続いても、1つずつ出すように popups の長さも見る
  }, [head, popups.length, x]);

  if (!title) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, { top: 32 + safe.top, right: 32 + safe.right, transform: [{ translateX: x }] }]}>
      <Text style={styles.icon}>🏆</Text>
      <View style={styles.texts}>
        <GameText style={styles.head}>{T.ach_unlocked}</GameText>
        <GameText style={styles.name}>{title}</GameText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(27,16,48,0.93)',
    borderWidth: 4,
    borderColor: COLORS.rpgYellow,
    borderRadius: 16,
    zIndex: 500,
    elevation: 24,
  },
  icon: {
    fontSize: 48,
  },
  texts: {
    paddingLeft: 20,
  },
  head: {
    color: COLORS.rpgYellow,
    fontSize: 24,
  },
  name: {
    fontSize: 32,
  },
});
