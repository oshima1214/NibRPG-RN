import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { GameText } from '@/components/GameText';
import { Gradient } from '@/components/Gradient';
import { Txt, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { IMG } from '@/data/images';
import { ITEMS, ITEM_IMAGES, MAX_ITEMS } from '@/data/shop';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { se } from '@/lib/sound';
import { useBgm } from '@/lib/useBgm';
import { ACH, useAchievements } from '@/state/achievements';
import { useGame } from '@/state/game';

const POPUP_MS = 1600; // ポップアップを出しておく時間
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * 自販機の画面（1Fの道具屋。Java版の VendingActivity）。
 * 売っている物は ITEMS、商品の絵は ITEM_IMAGES。
 */
export default function VendingScreen() {
  return (
    <GameStage background={COLORS.vendingRoom}>
      <Vending />
    </GameStage>
  );
}

function Vending() {
  useBgm('bgm_shop');
  const g = useGame();
  const [slot, setSlot] = useState<string>(T.vending_slot);
  const [pop, setPop] = useState<{ i: number; key: number } | null>(null);
  const dropTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dropTimer.current) clearTimeout(dropTimer.current);
  }, []);

  /** 商品のボタンを押したとき */
  const onPush = (i: number) => {
    const s = useGame.getState();
    const item = ITEMS[i];
    if (s.itemCounts[i] >= MAX_ITEMS) {
      setSlot(T.vending_full);
      se('se_no_money');
    } else if (s.money < item.price) {
      setSlot(T.vending_no_money);
      se('se_no_money');
    } else {
      const counts = [...s.itemCounts];
      counts[i]++;
      const bought = [...s.boughtItems];
      bought[i] = true;
      useGame.setState({
        money: s.money - item.price,
        moneySpent: s.moneySpent + item.price, // 実績のため
        itemCounts: counts,
        boughtItems: bought,
      });
      if (bought.every(Boolean)) useAchievements.getState().unlock(ACH.VENDING_ALL); // 全種類買ったら実績
      setSlot(fmt(T.vending_get, item.name));
      se('se_buy');
      setPop({ i, key: Date.now() });
      if (dropTimer.current) clearTimeout(dropTimer.current);
      dropTimer.current = setTimeout(() => se('se_vending_drop'), 250); // ガコン
    }
  };

  return (
    <SafeArea>
      {/* 自販機の本体 */}
      <View style={styles.body}>
        {/* 左：ショーケースと取り出し口 */}
        <View style={styles.leftCol}>
          <View style={styles.window}>
            <View style={styles.slotRow}>
              {ITEMS.map((item, i) => {
                const full = g.itemCounts[i] >= MAX_ITEMS;
                const can = !full && g.money >= item.price;
                return (
                  <View key={item.name} style={styles.item}>
                    {/* 光る板と商品 */}
                    <Gradient colors={['#F6FAFF', '#D8E6F8']} dir="down" radius={16} style={styles.backlit}>
                      <Image source={IMG[ITEM_IMAGES[i]]} style={styles.itemImage} resizeMode="contain" />
                    </Gradient>
                    {/* 棚 */}
                    <View style={styles.shelf}>
                      <View style={styles.shelfTop} />
                    </View>
                    <Txt style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Txt>
                    <Txt style={styles.itemDesc} numberOfLines={1}>
                      {item.desc}
                    </Txt>
                    {/* 値段の表示 */}
                    <View style={styles.lcd}>
                      <Txt style={styles.lcdText}>{fmt(T.price, item.price)}</Txt>
                    </View>
                    {/* 丸いボタン */}
                    <Pressable onPress={() => onPush(i)} style={styles.roundWrap}>
                      {can && <View style={styles.roundGlow} />}
                      <View style={[styles.round, can ? styles.roundOn : styles.roundOff]} />
                    </Pressable>
                    <Pressable onPress={() => onPush(i)}>
                      <Txt
                        style={[
                          styles.pushLabel,
                          { color: full ? COLORS.rpgRed : can ? '#DCE6F5' : '#5A6270' },
                        ]}>
                        {full ? T.vending_soldout : T.vending_push}
                      </Txt>
                    </Pressable>
                    <Txt style={styles.have}>{fmt(T.vending_have, g.itemCounts[i])}</Txt>
                  </View>
                );
              })}
            </View>
            {/* ガラスに映る光（ななめの帯） */}
            <View pointerEvents="none" style={styles.glare} />
          </View>
          {/* 取り出し口 */}
          <View style={styles.slot}>
            <Txt style={styles.slotText}>{slot}</Txt>
          </View>
        </View>

        {/* 右：お金の表示ともどるボタン */}
        <View style={styles.rightCol}>
          <View style={styles.led}>
            <Txt style={styles.ledText}>{fmt(T.vending_led, g.money, g.hp, g.maxHp)}</Txt>
          </View>
          {/* お金を入れる所（かざり） */}
          <View style={[styles.slot, styles.coin]}>
            <Txt style={styles.coinText}>{T.vending_coin}</Txt>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            style={({ pressed }) => [windowStyle, styles.exit, pressed && { opacity: 0.7 }]}
            onPress={() => {
              se('se_cancel');
              goBack(); // マップの画面は開いたままなので、続きから
            }}>
            <Txt style={styles.exitText}>{T.vending_exit}</Txt>
          </Pressable>
        </View>
      </View>

      {pop && <Popup key={pop.key} i={pop.i} onClose={() => setPop(null)} />}
    </SafeArea>
  );
}

/**
 * 買った商品を、画面のまん中にポップアップする。
 *   取り出し口のあたり（下）から、小さい状態で飛び出して、
 *   まん中で少し大きくはずんでから、ちょうどいい大きさに止まる
 */
function Popup({ i, onClose }: { i: number; onClose: () => void }) {
  const native = Platform.OS !== 'web';
  const fade = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current; // 0 → 1：下から飛び出す
  const text = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: native }).start(() => onClose());
  };

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: native }).start();
    Animated.timing(jump, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(2.5)), useNativeDriver: native }).start();
    Animated.timing(text, { toValue: 1, delay: 350, duration: 250, useNativeDriver: native }).start();
    Animated.timing(glow, { toValue: 1, duration: POPUP_MS, easing: Easing.linear, useNativeDriver: native }).start();
    const t = setTimeout(close, POPUP_MS); // しばらくしたら、自動でとじる
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.popup, { opacity: fade }]}>
      <Pressable style={styles.popupPress} onPress={close}>
        {/* 後ろの光：大きくなりながら、ゆっくり回る */}
        <Animated.View
          style={[
            styles.glowWrap,
            {
              transform: [
                { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { rotate: glow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
              ],
            },
          ]}>
          <Gradient
            dir="radial"
            colors={['rgba(255,253,231,1)', 'rgba(255,245,157,0.53)', 'rgba(255,245,157,0)']}
            stops={[0, 0.5, 1]}
            style={styles.glow}
          />
        </Animated.View>
        <View style={styles.popCenter}>
          <Animated.Image
            source={IMG[ITEM_IMAGES[i]]}
            resizeMode="contain"
            style={[
              styles.popImage,
              {
                transform: [
                  { translateY: jump.interpolate({ inputRange: [0, 1], outputRange: [440, 0] }) },
                  { scale: jump.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                  { rotate: jump.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] }) },
                ],
              },
            ]}
          />
          <Animated.View
            style={{
              alignItems: 'center',
              opacity: text,
              transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}>
            <GameText style={styles.popName}>{ITEMS[i].name}</GameText>
            <GameText style={styles.popSub}>{T.vending_pop_sub}</GameText>
          </Animated.View>
          <GameText style={styles.popTap}>{T.vending_pop_tap}</GameText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    margin: 24,
    padding: 28,
    backgroundColor: '#1E4FA8',
    borderColor: '#0D2C66',
    borderWidth: 10,
    borderRadius: 32,
  },
  leftCol: {
    flex: 3,
  },
  window: {
    flex: 1,
    backgroundColor: '#141C2E',
    borderColor: '#8FA3C2',
    borderWidth: 8,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },
  slotRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  glare: {
    position: 'absolute',
    left: 140,
    top: -60,
    bottom: -60,
    width: 112,
    backgroundColor: 'rgba(255,255,255,0.086)',
    transform: [{ rotate: '18deg' }],
  },
  item: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  backlit: {
    flex: 1,
    alignSelf: 'stretch',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  shelf: {
    alignSelf: 'stretch',
    height: 18,
    backgroundColor: '#96A0AF',
  },
  shelfTop: {
    height: 6,
    backgroundColor: '#DCE1EB',
  },
  itemName: {
    marginTop: 8,
    color: '#E6EDF8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#8FA3C2',
    fontSize: 18,
  },
  lcd: {
    width: 128,
    marginTop: 8,
    paddingVertical: 4,
    backgroundColor: '#0A1428',
    borderColor: '#3C5A8C',
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  lcdText: {
    color: '#78DCFF',
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  roundWrap: {
    width: 76,
    height: 76,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(52,200,240,0.33)',
  },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
  },
  roundOn: {
    backgroundColor: '#3CC8F0',
    borderColor: '#C8F5FF',
  },
  roundOff: {
    backgroundColor: '#3A4150',
    borderColor: '#5A6270',
  },
  pushLabel: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  have: {
    color: '#8FA3C2',
    fontSize: 18,
  },
  slot: {
    height: 104,
    marginTop: 20,
    backgroundColor: '#10141C',
    borderColor: '#3A4150',
    borderWidth: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    color: COLORS.rpgGray,
    fontSize: 30,
    fontWeight: 'bold',
  },
  rightCol: {
    flex: 1,
    marginLeft: 28,
    alignItems: 'center',
  },
  led: {
    alignSelf: 'stretch',
    marginTop: 44,
    padding: 20,
    backgroundColor: '#050805',
    borderColor: '#2A3A2A',
    borderWidth: 6,
    borderRadius: 12,
  },
  ledText: {
    color: COLORS.vendingLedGreen,
    fontSize: 32,
    lineHeight: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: MONO,
  },
  coin: {
    width: 128,
    height: undefined,
    marginTop: 28,
    paddingVertical: 12,
    borderWidth: 6,
  },
  coinText: {
    color: COLORS.rpgGray,
    fontSize: 22,
  },
  exit: {
    alignSelf: 'stretch',
    paddingVertical: 20,
    alignItems: 'center',
  },
  exitText: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  popup: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.67)',
    zIndex: 100,
  },
  popupPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    position: 'absolute',
    width: 520,
    height: 520,
    marginBottom: 40,
  },
  glow: {
    width: 520,
    height: 520,
  },
  popCenter: {
    alignItems: 'center',
  },
  popImage: {
    height: 340,
    width: 340,
  },
  popName: {
    marginTop: 24,
    fontSize: 56,
    textShadowColor: '#000000',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 1,
  },
  popSub: {
    color: '#DCE6F5',
    fontSize: 32,
  },
  popTap: {
    marginTop: 28,
    color: COLORS.rpgGray,
    fontSize: 24,
  },
});
