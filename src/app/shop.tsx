import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { Txt, nibButtonStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { IMG } from '@/data/images';
import { WEAPONS } from '@/data/shop';
import { T } from '@/data/texts';
import { fmt } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { se } from '@/lib/sound';
import { useBgm } from '@/lib/useBgm';
import { useGame } from '@/state/game';

/**
 * 事務室の窓口（1Fの受付。Java版の ShopActivity）。
 * 事務員さんに「備品申込書」を出して、備品（＝武器）を買う。
 * 買うとすぐ使う（装備する）。一度買った備品は、あとから持ちかえられる。
 */
export default function ShopScreen() {
  return (
    <GameStage background={COLORS.officeWall}>
      <Shop />
    </GameStage>
  );
}

function Shop() {
  useBgm('bgm_shop');
  const g = useGame();
  const [talk, setTalk] = useState<string>(T.reception_hello);
  const [stampAt, setStampAt] = useState<{ i: number; key: number } | null>(null);

  /** 申込書のボタンを押したとき */
  const onApply = (i: number) => {
    const s = useGame.getState();
    const w = WEAPONS[i];
    if (s.weapon === i) {
      useGame.setState({ weapon: -1 }); // 使用中をもう一度押すと、しまって素手にする
      se('se_cancel');
      setTalk(fmt(T.reception_unequip, w.name));
    } else if (s.ownedWeapons[i]) {
      useGame.setState({ weapon: i }); // 持ちかえる（お金はかからない）
      se('se_equip');
      setTalk(fmt(T.reception_equip, w.name));
    } else if (s.money < w.price) {
      setTalk(T.reception_no_money);
      se('se_no_money');
    } else {
      const owned = [...s.ownedWeapons];
      owned[i] = true;
      useGame.setState({
        money: s.money - w.price,
        moneySpent: s.moneySpent + w.price, // 実績のため
        ownedWeapons: owned,
        weapon: i, // 買ったらすぐ使う
      });
      se('se_buy');
      setTalk(fmt(T.reception_bought, w.name));
      setStampAt({ i, key: Date.now() });
    }
  };

  const weaponName = g.weaponName();
  return (
    <SafeArea>
      {/* 上の紺の帯（受付の看板） */}
      <View style={styles.sign}>
        <Txt style={styles.signText}>{T.reception_title}</Txt>
      </View>

      <View style={styles.body}>
        {/* 左：事務員さん */}
        <View style={styles.left}>
          {/* ふきだし */}
          <View style={styles.bubble}>
            <Txt style={styles.talk}>{talk}</Txt>
          </View>
          <Image source={IMG.obj_clerk} style={styles.clerk} resizeMode="contain" />
          {/* カウンターの台 */}
          <View style={styles.counterTop} />
          <View style={styles.counterFront} />
          {/* 所持金のメモ */}
          <View style={styles.memo}>
            <Txt style={styles.memoText}>
              {fmt(T.reception_status, g.money, g.attack(), weaponName ?? T.status_bare)}
            </Txt>
          </View>
          <Pressable
            style={({ pressed }) => [nibButtonStyle, styles.exit, pressed && styles.pressed]}
            onPress={() => {
              se('se_cancel');
              goBack(); // マップの画面は開いたままなので、続きから
            }}>
            <Txt style={styles.exitText}>{T.reception_exit}</Txt>
          </Pressable>
        </View>

        {/* 右：備品申込書 */}
        <View style={styles.paperWrap}>
          <View style={styles.paperShadow} />
          <View style={styles.paper}>
            <Txt style={styles.formTitle}>{T.reception_form}</Txt>
            <View style={styles.rule} />
            {/* 見出しの行 */}
            <View style={styles.headRow}>
              <Txt style={[styles.head, { flex: 3 }]}>{T.form_col_name}</Txt>
              <Txt style={[styles.head, { flex: 4 }]}>{T.form_col_desc}</Txt>
              <Txt style={[styles.head, styles.priceCol]}>{T.form_col_price}</Txt>
              <View style={{ width: 200 }} />
            </View>
            <ScrollView style={{ flex: 1 }}>
              {WEAPONS.map((w, i) => {
                const using = g.weapon === i;
                const owned = g.ownedWeapons[i];
                const poor = !owned && g.money < w.price;
                return (
                  <View key={w.name} style={styles.row}>
                    <Txt style={[styles.name, { flex: 3 }]}>{w.name}</Txt>
                    <Txt style={[styles.desc, { flex: 4 }]}>{w.desc}</Txt>
                    <Txt style={[styles.price, styles.priceCol]}>{fmt(T.price, w.price)}</Txt>
                    <Pressable
                      onPress={() => onApply(i)}
                      style={({ pressed }) => [
                        styles.buy,
                        using ? styles.buyUsing : owned ? styles.buyOwned : styles.buyApply,
                        poor && { opacity: 0.4 },
                        pressed && styles.pressed,
                      ]}>
                      <Txt
                        style={[
                          styles.buyText,
                          { color: using ? COLORS.white : owned ? COLORS.nibNavy : COLORS.formRed },
                        ]}>
                        {using ? T.btn_using : owned ? T.btn_switch : T.btn_apply}
                      </Txt>
                    </Pressable>
                    {stampAt?.i === i && <Stamp key={stampAt.key} />}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeArea>
  );
}

/** 「受付済」のハンコを、ポンと押す動き。少ししたら消える */
function Stamp() {
  const native = Platform.OS !== 'web';
  const a = useRef(new Animated.Value(0)).current;
  const s = useRef(new Animated.Value(2.5)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: native }),
      Animated.timing(s, { toValue: 1, duration: 250, easing: Easing.out(Easing.back(2)), useNativeDriver: native }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: 400, useNativeDriver: native }).start();
    }, 1200);
    return () => clearTimeout(t);
  }, [a, s, native]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.stamp, { opacity: a, transform: [{ rotate: '-12deg' }, { scale: s }] }]}>
      <Txt style={styles.stampText}>{T.stamp_done}</Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sign: {
    height: 80,
    backgroundColor: COLORS.nibNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signText: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    width: 500,
    padding: 24,
    alignItems: 'center',
  },
  bubble: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderColor: COLORS.nibNavy,
    borderWidth: 4,
    borderRadius: 24,
    padding: 20,
    minHeight: 150,
  },
  talk: {
    color: '#222222',
    fontSize: 26,
    lineHeight: 38,
  },
  clerk: {
    flex: 1,
    width: '100%',
    marginTop: 12,
  },
  counterTop: {
    alignSelf: 'stretch',
    height: 28,
    backgroundColor: COLORS.counterTop,
  },
  counterFront: {
    alignSelf: 'stretch',
    height: 20,
    backgroundColor: COLORS.counterFront,
  },
  memo: {
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: '#FFF7C2',
    borderColor: '#E0D27A',
    borderWidth: 2,
    borderRadius: 4,
    padding: 16,
  },
  memoText: {
    color: '#333333',
    fontSize: 24,
    lineHeight: 34,
  },
  exit: {
    alignSelf: 'stretch',
    marginTop: 16,
    paddingVertical: 16,
  },
  exitText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
  paperWrap: {
    flex: 1,
    margin: 24,
  },
  paperShadow: {
    position: 'absolute',
    left: 8,
    top: 8,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  paper: {
    flex: 1,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderColor: '#C9D3E3',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 28,
  },
  formTitle: {
    color: COLORS.nibNavy,
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
  },
  rule: {
    height: 4,
    marginTop: 12,
    backgroundColor: COLORS.nibNavy,
  },
  headRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  head: {
    color: COLORS.rpgGray,
    fontSize: 22,
  },
  priceCol: {
    width: 140,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#C9D3E3',
  },
  name: {
    color: COLORS.nibNavy,
    fontSize: 30,
    fontWeight: 'bold',
  },
  desc: {
    color: '#5A6270',
    fontSize: 24,
  },
  price: {
    color: '#333333',
    fontSize: 30,
    fontWeight: 'bold',
  },
  buy: {
    width: 184,
    marginLeft: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 4,
    alignItems: 'center',
  },
  buyApply: {
    borderColor: COLORS.formRed,
  },
  buyOwned: {
    borderColor: COLORS.nibNavy,
  },
  buyUsing: {
    borderColor: COLORS.nibNavy,
    backgroundColor: COLORS.nibNavy,
  },
  buyText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  stamp: {
    position: 'absolute',
    right: 20,
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 6,
    borderColor: COLORS.formRed,
    backgroundColor: 'rgba(211,47,47,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    color: COLORS.formRed,
    fontSize: 30,
    fontWeight: 'bold',
  },
});
