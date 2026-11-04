import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameStage, SafeArea } from '@/components/GameStage';
import { Gradient } from '@/components/Gradient';
import { HeroView } from '@/components/HeroView';
import { Bar, Txt, nibButtonStyle, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { IMG, type ImageName } from '@/data/images';
import { FLOORS, LOST_ITEMS, NAMES, TEACHER_NAMES } from '@/data/map';
import { ITEMS, ITEM_IMAGES, WEAPONS } from '@/data/shop';
import { T, TA } from '@/data/texts';
import { fmt } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { pauseBgmSoon, resumeBgm, se } from '@/lib/sound';
import { ACH, ACH_COUNT, CLERK_TALK_COUNT, useAchievements } from '@/state/achievements';
import { useLook } from '@/state/character';
import { useGame } from '@/state/game';

const WALK_MS = 700; // 見本が向きを変える速さ

/**
 * メニュー画面（マップの「メニュー」ボタンで開く。Java版の StatusActivity）。
 *   ステータス：主人公の見た目・HP・攻撃力・装備・所持金
 *   持ち物　　：道具を使う／備品（武器）を付けかえる
 *   記録　　　：先生に勝ったかどうか
 *   実績・遊び方・タイトルへ
 */
export default function StatusScreen() {
  return (
    <GameStage background={COLORS.black}>
      <Status />
    </GameStage>
  );
}

const TAB_NAMES = [T.menu_status, T.menu_items, T.menu_record, T.menu_ach, T.menu_howto_tab, T.menu_title_tab];

function Status() {
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  // マップの曲をそのまま続ける
  useFocusEffect(
    useCallback(() => {
      resumeBgm();
      return () => pauseBgmSoon();
    }, []),
  );

  const selectTab = (p: number) => {
    setTab(p);
    setMessage(null);
  };

  return (
    <SafeArea style={styles.root}>
      {/* 左：タブ */}
      <View style={[windowStyle, styles.tabs]}>
        {TAB_NAMES.map((name, i) => (
          <Pressable key={name} style={styles.tab} onPress={() => selectTab(i)}>
            <Txt style={[styles.tabText, { color: i === tab ? COLORS.rpgYellow : COLORS.white }]}>
              {(i === tab ? '▶ ' : '　') + name}
            </Txt>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable
          style={({ pressed }) => [nibButtonStyle, styles.back, pressed && { opacity: 0.7 }]}
          onPress={() => goBack()}>
          <Txt style={styles.backText}>{T.menu_back}</Txt>
        </Pressable>
      </View>

      {/* 右：中身 */}
      <View style={styles.right}>
        <View style={[windowStyle, styles.page]}>
          {tab === 0 && <StatusPage />}
          {tab === 1 && <ItemsPage onMessage={setMessage} />}
          {tab === 2 && <RecordPage />}
          {tab === 3 && <AchievementPage />}
          {tab === 4 && (
            <ScrollView>
              <Txt style={styles.howTo}>{TA.tutorial_pages.join('\n\n')}</Txt>
            </ScrollView>
          )}
          {tab === 5 && <TitlePage />}
        </View>
        {/* 「〇〇を使った」などのメッセージ */}
        {message && (
          <View style={[windowStyle, styles.message]}>
            <Txt style={styles.messageText}>{message}</Txt>
          </View>
        )}
      </View>
    </SafeArea>
  );
}

// ===================== ステータス =====================

function StatusPage() {
  const g = useGame();
  const look = useLook();
  const [step, setStep] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 主人公の見本を、くるっと回して見せる（正面 → 右 → 後ろ → 左）
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), WALK_MS);
    return () => clearInterval(t);
  }, []);

  const weaponPower = g.weapon >= 0 ? WEAPONS[g.weapon].power : 0;
  const defeated = g.defeated.slice(1).filter(Boolean).length;
  return (
    <View style={styles.statusRow}>
      <Gradient colors={['#EEF1F5', '#C9D1DC']} dir="down" radius={8} style={styles.heroStage}>
        <View
          style={styles.heroInner}
          onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {size.w > 0 && <HeroView look={look} width={size.w} height={size.h} direction={step} margin={0} />}
        </View>
      </Gradient>
      <View style={styles.statusText}>
        <Txt style={styles.place}>{fmt(T.menu_name_place, look.name, NAMES[g.floor])}</Txt>
        {/* HP（バーと数字） */}
        <View style={styles.hpRow}>
          <Txt style={styles.line32}>{T.menu_hp_label}</Txt>
          <Bar value={g.hp} max={g.maxHp} style={styles.hpBar} />
          <Txt style={styles.line32}>{fmt(T.menu_hp, g.hp, g.maxHp)}</Txt>
        </View>
        <Txt style={styles.menuLine}>{fmt(T.menu_attack, g.attack(), g.attack() - weaponPower, weaponPower)}</Txt>
        <Txt style={styles.menuLine}>{fmt(T.menu_weapon, g.weaponName() ?? T.status_bare)}</Txt>
        <Txt style={styles.menuLine}>{fmt(T.menu_money, g.money)}</Txt>
        <Txt style={styles.menuLine}>{fmt(T.menu_defeated, defeated, g.defeated.length - 1)}</Txt>
      </View>
    </View>
  );
}

// ===================== 持ち物 =====================

function ItemsPage({ onMessage }: { onMessage: (m: string) => void }) {
  const g = useGame();

  /** 道具を使う（HPが回復する） */
  const useItem = (i: number) => {
    const s = useGame.getState();
    if (s.itemCounts[i] <= 0) return;
    if (s.hp >= s.maxHp) {
      onMessage(T.menu_hp_full);
      return;
    }
    const hp = Math.min(s.maxHp, s.hp + ITEMS[i].power);
    const counts = [...s.itemCounts];
    counts[i]--;
    useGame.setState({ hp, itemCounts: counts, usedItem: true }); // usedItem は実績のため
    se('se_heal');
    onMessage(fmt(T.menu_used, ITEMS[i].name, hp - s.hp));
  };

  /** 備品（武器）を付けかえる（i が -1 なら素手にする） */
  const equip = (i: number) => {
    if (useGame.getState().weapon === i) return;
    useGame.setState({ weapon: i });
    se('se_equip');
    onMessage(i < 0 ? T.menu_bare_msg : fmt(T.menu_equipped_msg, WEAPONS[i].name));
  };

  const full = g.hp >= g.maxHp;
  const items = ITEMS.map((it, i) => ({ it, i })).filter(({ i }) => g.itemCounts[i] > 0);
  const weapons = WEAPONS.map((w, i) => ({ w, i })).filter(({ i }) => g.ownedWeapons[i]);
  return (
    <ScrollView>
      {/* ---- 道具 ---- */}
      <Header>{T.menu_items_header}</Header>
      {items.length === 0 && <Note>{T.menu_no_items}</Note>}
      {items.map(({ it, i }) => (
        <Row
          key={it.name}
          image={ITEM_IMAGES[i]}
          name={it.name}
          desc={it.desc}
          count={fmt(T.menu_count, g.itemCounts[i])}
          button={T.menu_use}
          enabled={!full}
          onPress={() => useItem(i)}
        />
      ))}

      {/* ---- 備品（武器） ---- */}
      <Header>{T.menu_weapons_header}</Header>
      {weapons.length === 0 && <Note>{T.menu_no_weapons}</Note>}
      {weapons.map(({ w, i }) => (
        <Row
          key={w.name}
          name={w.name}
          desc={w.desc}
          button={g.weapon === i ? T.menu_equipped : T.menu_equip}
          enabled={g.weapon !== i}
          onPress={() => equip(i)}
        />
      ))}
      {weapons.length > 0 && (
        // 素手（備品を持っているときだけ出す。押すと備品をしまう）
        <Row
          name={T.status_bare}
          desc={T.menu_bare_desc}
          button={g.weapon < 0 ? T.menu_equipped : T.menu_equip}
          enabled={g.weapon >= 0}
          onPress={() => equip(-1)}
        />
      )}
    </ScrollView>
  );
}

// ===================== 記録 =====================

function RecordPage() {
  const g = useGame();
  return (
    <ScrollView>
      <Txt style={[styles.header, { paddingTop: 0 }]}>{T.menu_record_header}</Txt>
      <View style={{ paddingLeft: 16 }}>
        {FLOORS.slice(1).map((_, k) => {
          const f = k + 1;
          const floor = fmt(T.floor_short, f + 1);
          let text: string;
          let color: string;
          if (!g.visited[f]) {
            text = fmt(T.menu_record_unknown, floor); // まだ行ったことがない
            color = '#888888';
          } else if (g.defeated[f]) {
            text = fmt(T.menu_record_win, floor, TEACHER_NAMES[f]);
            color = COLORS.rpgYellow;
          } else {
            text = fmt(T.menu_record_not_yet, floor, TEACHER_NAMES[f]);
            color = COLORS.white;
          }
          return (
            <Txt key={f} style={[styles.recordLine, { color }]}>
              {text}
            </Txt>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ===================== 実績 =====================

/** 実績の一覧：1つずつ「名前・条件・今の進み具合」を出す。その下に落とし物 */
function AchievementPage() {
  const g = useGame();
  const unlocked = useAchievements((s) => s.unlocked);

  /** 実績の今の進み具合（今回のプレイの記録から） */
  const progress = (id: number): string => {
    const used = (b: boolean) => (b ? T.ach_used : T.ach_not_used);
    switch (id) {
      case ACH.CLEAR_BARE:
        return fmt(T.ach_prog_bare, used(g.usedItem), used(g.usedWeapon), g.tookDamage ? T.ach_damaged : T.ach_not_damaged);
      case ACH.NO_ITEM:
        return fmt(T.ach_prog_item, used(g.usedItem));
      case ACH.NO_WEAPON:
        return fmt(T.ach_prog_weapon, used(g.usedWeapon));
      case ACH.BIG_SPENDER:
      case ACH.SAVER:
        return fmt(T.ach_prog_money, g.moneySpent);
      case ACH.COLLECTOR:
        return fmt(T.ach_prog_count, g.foundCount(), LOST_ITEMS.length);
      case ACH.CLERK_REGULAR:
        return fmt(T.ach_prog_count, Math.min(g.clerkTalks, CLERK_TALK_COUNT), CLERK_TALK_COUNT);
      case ACH.VENDING_ALL:
        return fmt(T.ach_prog_count, g.boughtItems.filter(Boolean).length, g.boughtItems.length);
      default:
        return ''; // 進み具合がないもの
    }
  };

  return (
    <ScrollView>
      <Header>{fmt(T.menu_ach_header, unlocked.filter(Boolean).length, ACH_COUNT)}</Header>
      {Array.from({ length: ACH_COUNT }, (_, i) => {
        const got = unlocked[i];
        const p = got ? T.ach_done : progress(i);
        return (
          <View key={i} style={styles.achRow}>
            <Text style={[styles.achIcon, { opacity: got ? 1 : 0.5 }]}>{got ? '🏆' : '🔒'}</Text>
            <View style={{ flex: 1, paddingLeft: 20 }}>
              {/* まだなら名前はかくす */}
              <Txt style={[styles.achTitle, { color: got ? COLORS.rpgYellow : '#BBBBBB' }]}>
                {got ? TA.ach_titles[i] : T.menu_ach_locked}
              </Txt>
              <Txt style={styles.achCond}>{fmt(T.ach_condition, TA.ach_descs[i])}</Txt>
              {p !== '' && <Txt style={[styles.achProg, { color: got ? COLORS.rpgYellow : '#8FD3FF' }]}>{p}</Txt>}
            </View>
          </View>
        );
      })}

      {/* ---- 落とし物 ---- */}
      <Header>{fmt(T.menu_lost_header, g.foundCount(), LOST_ITEMS.length)}</Header>
      <Note>{LOST_ITEMS.map((l, i) => (g.foundLost[i] ? l.name : '？？？')).join('　')}</Note>
    </ScrollView>
  );
}

// ===================== タイトルへ =====================

function TitlePage() {
  return (
    <View style={styles.titlePage}>
      <Txt style={styles.titleNote}>{T.menu_title_note_ok}</Txt>
      <Pressable
        style={({ pressed }) => [nibButtonStyle, styles.titleButton, pressed && { opacity: 0.7 }]}
        onPress={() => {
          // 今の階・場所は自動で保存されている。マップなど、開いている画面を全部閉じてからタイトルへ
          if (router.canDismiss()) router.dismissAll();
          router.replace('/title');
        }}>
        <Txt style={styles.titleButtonText}>{T.menu_to_title}</Txt>
      </Pressable>
    </View>
  );
}

// ===================== 部品 =====================

/** 見出し（「道具」「備品」） */
function Header({ children }: { children: ReactNode }) {
  return <Txt style={styles.header}>{children}</Txt>;
}

/** 「何も持っていない」などの説明 */
function Note({ children }: { children: ReactNode }) {
  return <Txt style={styles.note}>{children}</Txt>;
}

/** 持ち物1行（絵・名前・説明・個数・ボタン） */
function Row({
  image,
  name,
  desc,
  count,
  button,
  enabled,
  onPress,
}: {
  image?: ImageName;
  name: string;
  desc: string;
  count?: string;
  button: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      {image && <Image source={IMG[image]} style={styles.rowImage} resizeMode="contain" />}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Txt style={styles.rowName}>{name}</Txt>
        <Txt style={styles.rowDesc}>{desc}</Txt>
      </View>
      {count ? <Txt style={styles.rowCount}>{count}</Txt> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          enabled ? nibButtonStyle : windowStyle,
          styles.rowButton,
          !enabled && { opacity: 0.5 },
          pressed && { opacity: 0.7 },
        ]}>
        <Txt style={styles.rowButtonText}>{button}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    padding: 24,
  },
  tabs: {
    width: 320,
    padding: 16,
  },
  tab: {
    height: 80,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  tabText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  back: {
    height: 80,
  },
  backText: {
    fontSize: 30,
  },
  right: {
    flex: 1,
    marginLeft: 24,
  },
  page: {
    flex: 1,
    padding: 28,
  },
  message: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  messageText: {
    fontSize: 30,
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
  },
  heroStage: {
    width: 220,
    borderWidth: 6,
    borderColor: COLORS.white,
  },
  heroInner: {
    position: 'absolute',
    left: 20,
    top: 20,
    right: 20,
    bottom: 20,
  },
  statusText: {
    flex: 1,
    marginLeft: 32,
    justifyContent: 'center',
  },
  place: {
    color: COLORS.rpgYellow,
    fontSize: 32,
    fontWeight: 'bold',
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  line32: {
    fontSize: 32,
  },
  hpBar: {
    flex: 1,
    marginHorizontal: 20,
  },
  menuLine: {
    marginTop: 12,
    fontSize: 30,
  },
  howTo: {
    fontSize: 28,
    lineHeight: 46,
  },
  header: {
    color: COLORS.rpgYellow,
    fontSize: 28,
    paddingTop: 16,
    paddingBottom: 8,
  },
  note: {
    color: COLORS.rpgGray,
    fontSize: 26,
    paddingLeft: 16,
    paddingBottom: 8,
  },
  recordLine: {
    fontSize: 30,
    paddingVertical: 6,
  },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  achIcon: {
    fontSize: 44,
  },
  achTitle: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  achCond: {
    fontSize: 26,
  },
  achProg: {
    fontSize: 24,
  },
  titlePage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleNote: {
    fontSize: 30,
    lineHeight: 46,
    textAlign: 'center',
  },
  titleButton: {
    height: 88,
    marginTop: 32,
    paddingHorizontal: 48,
  },
  titleButtonText: {
    fontSize: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  rowImage: {
    width: 72,
    height: 72,
  },
  rowName: {
    fontSize: 30,
  },
  rowDesc: {
    color: COLORS.rpgGray,
    fontSize: 24,
  },
  rowCount: {
    fontSize: 30,
    paddingRight: 20,
  },
  rowButton: {
    width: 192,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rowButtonText: {
    fontSize: 28,
  },
});
