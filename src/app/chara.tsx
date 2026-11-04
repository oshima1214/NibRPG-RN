import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { GameDialog, type DialogButton } from '@/components/GameDialog';
import { GameStage, SafeArea, useStage } from '@/components/GameStage';
import { Gradient } from '@/components/Gradient';
import { HeroView } from '@/components/HeroView';
import { Txt } from '@/components/ui';
import { T } from '@/data/texts';
import { argb, hexToHsv, hexToRgb, hsvToHex } from '@/lib/color';
import { stagePoint } from '@/lib/touch';
import { useBgm } from '@/lib/useBgm';
import { useLook, type Look } from '@/state/character';

/**
 * キャラクリエイト画面（重田さん作の CharacterCreate を移したもの）。
 *   左：主人公の見本（◀ ▶ で向きを変える）
 *   右：選んだタブの設定（基本・髪・目・肌・服・ズボン・靴、基本から「アクセサリー」）
 *   下：タイトルへ・ランダム・決定（決定すると保存）
 */

const TABS = ['基本', '髪', '目', '肌', '服', 'ズボン', '靴'];
const TITLES = ['基本設定', '髪型・髪色', '目の色', '肌の色', '上着の設定', 'ボトムスの設定', '靴の色'];
const HAIR = ['ショート', 'ボブ', 'ロング', 'センター分け', 'ポニーテール'];
const SHIRT = ['Tシャツ', 'パーカー', 'ジャケット'];
const PANTS = ['ズボン', 'スカート'];
const DIRECTIONS = ['正面', '右', '後ろ', '左'];
const ACCESSORIES = ['眼鏡', 'ピアス', 'リボン', 'キャップ', 'ネックレス'];
const ACCESSORY_STYLES = [
  ['なし', '眼鏡', 'サングラス'],
  ['なし', 'スタッド', 'リング'],
  ['なし', '左側', '右側', '中央'],
  ['なし', '前向き', '後ろ向き'],
  ['なし', 'ペンダント', 'チェーン'],
];

// アクセサリー専用カラー：30色のHEX値は重複なし
const PALETTES = [
  [0xff222222, 0xff4b3328, 0xff645042, 0xff555d66, 0xffb5b6b8, 0xff847b73],
  [0xffc9cfd1, 0xffc7a45d, 0xffb88576, 0xffe4e6e8, 0xff9a7148, 0xff34363b],
  [0xffa45e71, 0xffc58b9e, 0xffcfb89a, 0xff5b8180, 0xff485b7b, 0xff56515a],
  [0xff2e3a43, 0xff556648, 0xffa68e73, 0xff9a4545, 0xff374a61, 0xffc0b7a6],
  [0xffd0c9be, 0xffb89a59, 0xff9fa7af, 0xffa97a6e, 0xff6a7775, 0xff5e5149],
].map((row) => row.map(argb));

const ACCESSORY_INFO = [
  '眼鏡とサングラス。黒・茶・グレーなど自然な色です。',
  'スタッド・リング。金属系の色を中心にしています。',
  '左・右・中央から選択。キャップとの同時装着はできません。',
  '前向き・後ろ向きから選択。リボンとの同時装着はできません。',
  'ペンダントとチェーンを選べます。',
];

// 類似色の判定基準。小さくすると警告が減る
const COLOR_THRESHOLD = 85.0;
const RANDOM_COLOR_THRESHOLD = 140.0;

const STYLE_KEYS = ['glassesStyle', 'earringsStyle', 'ribbonStyle', 'capStyle', 'necklaceStyle'] as const;
const ACC_COLOR_KEYS = ['glassesColor', 'earringsColor', 'ribbonColor', 'capColor', 'necklaceColor'] as const;
// タブの番号 → 色（1 髪・2 目・3 肌・4 服・5 ズボン・6 靴）
const PART_KEYS = ['hair', 'hair', 'eyes', 'skin', 'shirt', 'pants', 'shoes'] as const;

const rand = (n: number) => Math.floor(Math.random() * n);

function colorGap(a: string, b: string) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(3.0 * dr * dr + 4.0 * dg * dg + 2.0 * db * db);
}

type Dialog = {
  title?: string;
  message?: string;
  items?: { label: string; onPress: () => void }[];
  selected?: number;
  buttons?: DialogButton[];
  input?: boolean;
};

export default function CharaScreen() {
  return (
    <GameStage background="#192735">
      <CharaCreate />
    </GameStage>
  );
}

function CharaCreate() {
  useBgm('bgm_title'); // タイトルの曲を、そのまま続ける
  const { scale } = useStage();
  const [c, setC] = useState<Look>(() => ({ ...useLook.getState() }));
  const cRef = useRef(c);
  cRef.current = c;
  const update = (p: Partial<Look>) => setC((old) => ({ ...old, ...p }));

  const [tab, setTab] = useState(0);
  const [accessoryPage, setAccessoryPage] = useState(false);
  const [accessory, setAccessory] = useState(0);
  const [direction, setDirection] = useState(0);
  const [draftName, setDraftName] = useState(c.name || 'プレイヤー');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [hexText, setHexText] = useState('');
  const [preview, setPreview] = useState({ w: 0, h: 0 });
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const showTab = (i: number) => {
    setTab(i);
    setAccessoryPage(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const showAccessories = (kind = accessory) => {
    setTab(0);
    setAccessory(kind);
    if (!accessoryPage) scrollRef.current?.scrollTo({ y: 0, animated: false });
    setAccessoryPage(true);
  };

  // ---- アクセサリー ----
  const getAccStyle = (i: number, look = cRef.current) => look[STYLE_KEYS[i]];
  const setAccStyle = (i: number, value: number) => {
    const p: Partial<Look> = { [STYLE_KEYS[i]]: value };
    if (i === 2 && value !== 0) p.capStyle = 0; // リボンとキャップは同時に付けない
    if (i === 3 && value !== 0) p.ribbonStyle = 0;
    update(p);
  };
  const changeAccessory = (i: number, delta: number) => {
    const count = ACCESSORY_STYLES[i].length;
    setAccStyle(i, (getAccStyle(i) + delta + count) % count);
  };

  // ---- 色が似ていないか ----
  // target：0〜4=アクセサリー、-1=髪、-3=肌、-4=服
  const colorConflict = (target: number, color: string): string | null => {
    const ch = cRef.current;
    if (target >= 0) {
      if (getAccStyle(target) === 0) return null; // 装着していないものは判定しない
      if (target <= 3 && colorGap(color, ch.hair) < COLOR_THRESHOLD) return '髪色';
      if ((target === 0 || target === 1 || target === 4) && colorGap(color, ch.skin) < COLOR_THRESHOLD) return '肌色';
      if (target === 4 && colorGap(color, ch.shirt) < COLOR_THRESHOLD) return '服の色';
      return null;
    }
    const part = -target;
    for (let i = 0; i < ACCESSORIES.length; i++) {
      if (getAccStyle(i) === 0) continue;
      const compare = (part === 1 && i <= 3) || (part === 3 && (i === 0 || i === 1 || i === 4)) || (part === 4 && i === 4);
      if (compare && colorGap(color, ch[ACC_COLOR_KEYS[i]]) < COLOR_THRESHOLD) return ACCESSORIES[i] + 'の色';
    }
    return null;
  };

  /** 色を決めたときに、似た色がないか調べる（HSVを動かしている間は調べない） */
  const verifyColor = (set: (c: string) => void, before: string, after: string, target: number, applied: boolean) => {
    if (before === after) return;
    const conflict = colorConflict(target, after);
    if (conflict === null) {
      if (!applied) set(after);
      return;
    }
    setDialog({
      title: '色が似ています',
      message: `選択した色は「${conflict}」に近いため、アクセサリーが見えにくくなる可能性があります。\nこの色を使いますか？`,
      buttons: [
        {
          label: '色を選び直す',
          onPress: () => {
            if (applied) set(before);
            setDialog(null);
          },
        },
        {
          label: 'そのまま使用',
          onPress: () => {
            set(after);
            setDialog(null);
          },
        },
      ],
    });
  };

  // ---- ランダム ----
  const randomPalette = (kind: number, look: Look) => {
    const colors = PALETTES[kind];
    const safe: string[] = [];
    let best = colors[0];
    let bestGap = -1;
    for (const col of colors) {
      let gap = Number.MAX_VALUE;
      if (kind <= 3) gap = Math.min(gap, colorGap(col, look.hair)); // 眼鏡・ピアス・リボン・キャップは髪色と比較
      if (kind === 0 || kind === 1 || kind === 4) gap = Math.min(gap, colorGap(col, look.skin)); // 肌色とも比較
      if (kind === 4) gap = Math.min(gap, colorGap(col, look.shirt)); // ネックレスは服色とも比較
      if (gap >= RANDOM_COLOR_THRESHOLD) safe.push(col); // 十分に違う色だけ候補にする
      if (gap > bestGap) {
        bestGap = gap;
        best = col;
      }
    }
    return safe.length > 0 ? safe[rand(safe.length)] : best;
  };

  const randomize = () => {
    const hair = [0xff503227, 0xff22232b, 0xffb78136, 0xffc9a66b, 0xff943f42].map(argb);
    const skin = [0xfff0c9a1, 0xffe2ad81, 0xffc98d61, 0xffa96f49].map(argb);
    const clothes = [0xff326eab, 0xff5e936a, 0xffbd665d, 0xff755da8, 0xff586274].map(argb);
    const shirt = rand(clothes.length);
    let pants: number;
    do pants = rand(clothes.length);
    while (pants === shirt);
    const ribbonStyle = rand(4);
    const n: Look = {
      ...cRef.current,
      hairStyle: rand(HAIR.length),
      shirtStyle: rand(SHIRT.length),
      pantsStyle: rand(PANTS.length),
      hair: hair[rand(hair.length)],
      skin: skin[rand(skin.length)],
      shirt: clothes[shirt],
      pants: clothes[pants],
      eyes: Math.random() < 0.5 ? argb(0xff426a96) : argb(0xff66492d),
      shoes: Math.random() < 0.5 ? argb(0xff30343c) : argb(0xff9c9d9d),
      glassesStyle: rand(3),
      earringsStyle: rand(3),
      ribbonStyle,
      capStyle: ribbonStyle === 0 ? rand(3) : 0,
      necklaceStyle: rand(3),
    };
    for (let k = 0; k < 5; k++) n[ACC_COLOR_KEYS[k]] = randomPalette(k, n);
    setC(n);
  };

  // ---- 決定 ----
  const confirm = () => {
    const name = draftName.trim() || 'プレイヤー';
    setDialog({
      title: 'キャラクター作成',
      message: `名前：${name}\nこの見た目で決定しますか？`,
      buttons: [
        { label: 'キャンセル', onPress: () => setDialog(null) },
        {
          label: 'OK',
          onPress: () => {
            useLook.setState({ ...cRef.current, name });
            setDialog(null);
            goBack();
          },
        },
      ],
    });
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/title');
  };

  // ---- 横スワイプで、基本 ⇔ アクセサリー ----
  const swipe = useRef({ x: 0, y: 0, ready: false });
  const touchInBlock = useRef(false); // 名前の入力欄・スライダーをさわったか
  const onPanelTouchStart = (e: GestureResponderEvent) => {
    const p = stagePoint(e, scale);
    swipe.current = { x: p.x, y: p.y, ready: tab === 0 && !touchInBlock.current };
    touchInBlock.current = false;
  };
  const onPanelTouchEnd = (e: GestureResponderEvent) => {
    const p = stagePoint(e, scale);
    const dx = p.x - swipe.current.x;
    const dy = p.y - swipe.current.y;
    if (
      swipe.current.ready &&
      Math.abs(dx) > 140 &&
      Math.abs(dx) > Math.abs(dy) * 1.5 &&
      ((dx > 0 && !accessoryPage) || (dx < 0 && accessoryPage))
    ) {
      if (dx > 0) showAccessories();
      else showTab(0);
    }
    swipe.current.ready = false;
  };
  const blockSwipe = () => {
    touchInBlock.current = true;
  };

  // ---- 色をえらぶ部品（HSV・HEX・プリセット） ----
  const colorPicker = (color: string, set: (c: string) => void, presetKind: number, target: number) => (
    <ColorPicker
      key={`${tab}-${accessoryPage}-${accessory}`}
      color={color}
      set={set}
      presets={presetKind >= 0 ? PALETTES[presetKind] : null}
      onBlock={blockSwipe}
      onRelease={(before, after) => verifyColor(set, before, after, target, true)}
      onPreset={(col) => verifyColor(set, color, col, target, false)}
      onHex={() => {
        setHexText(color);
        setDialog({ title: 'カラーコードを入力', input: true, buttons: [] });
        hexTarget.current = { set, color, target };
      }}
    />
  );
  const hexTarget = useRef<{ set: (c: string) => void; color: string; target: number } | null>(null);
  const applyHex = () => {
    let s = hexText.trim();
    if (!s.startsWith('#')) s = '#' + s;
    if (!/^#[0-9a-fA-F]{6}$/.test(s)) {
      setDialog({ message: 'HEXは6桁で入力してね', buttons: [{ label: 'OK', onPress: () => setDialog(null) }] });
      return;
    }
    setDialog(null);
    const t = hexTarget.current;
    if (t) verifyColor(t.set, t.color, s.toUpperCase(), t.target, false);
  };

  // ---- 種類をえらぶ部品（◀ 名前 ▶。名前を押すと一覧） ----
  const chooser = (heading: string, choices: string[], selected: number, onDelta: (d: number) => void, onPick: (i: number) => void) => (
    <>
      <Label>{heading}</Label>
      <View style={styles.chooser}>
        <Btn label="◀" style={styles.chooserButton} onPress={() => onDelta(-1)} />
        <Pressable
          style={styles.chooserMiddle}
          onPress={() =>
            setDialog({
              title: heading + 'を選択',
              selected,
              items: choices.map((name, i) => ({
                label: name,
                onPress: () => {
                  onPick(i);
                  setDialog(null);
                },
              })),
              buttons: [{ label: 'キャンセル', onPress: () => setDialog(null) }],
            })
          }>
          <Txt style={styles.label}>{choices[Math.max(0, Math.min(selected, choices.length - 1))]}</Txt>
        </Pressable>
        <Btn label="▶" style={styles.chooserButton} onPress={() => onDelta(1)} />
      </View>
    </>
  );

  // ---- 右のパネルの中身 ----
  let panelTitle = TITLES[tab];
  let content: ReactNode;
  if (accessoryPage) {
    panelTitle = 'アクセサリー設定';
    const kind = accessory;
    const current = getAccStyle(kind);
    content = (
      <>
        <Btn label="◀ 基本設定へ戻る" style={styles.wide} onPress={() => showTab(0)} />
        {[0, 3].map((start) => (
          <View key={start} style={styles.accRow}>
            {ACCESSORIES.slice(start, start + 3).map((name, j) => (
              <Btn
                key={name}
                label={name}
                textStyle={styles.accText}
                border={start + j === accessory ? 6 : 2}
                style={styles.accButton}
                onPress={() => showAccessories(start + j)}
              />
            ))}
          </View>
        ))}
        {chooser(
          ACCESSORIES[kind] + 'の種類',
          ACCESSORY_STYLES[kind],
          current,
          (d) => changeAccessory(kind, d),
          (i) => setAccStyle(kind, i),
        )}
        <Label>{ACCESSORY_INFO[kind]}</Label>
        {current === 0 ? (
          <Label>未装着です。種類を選ぶと色を変更できます。</Label>
        ) : (
          <>
            <Label>↓ 下へスクロールすると色を調整できます</Label>
            <Label>アクセサリーの色（HSV）</Label>
            {colorPicker(c[ACC_COLOR_KEYS[kind]], (col) => update({ [ACC_COLOR_KEYS[kind]]: col }), kind, kind)}
          </>
        )}
        <Label>※ 上下にスクロールできます。</Label>
      </>
    );
  } else if (tab === 0) {
    content = (
      <>
        <Btn label="アクセサリー  ▶" style={styles.wide} onPress={() => showAccessories()} />
        <Label>キャラクター名</Label>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="名前を入力してください"
          placeholderTextColor="#B8C8D9"
          selectTextOnFocus
          maxLength={16}
          onTouchStart={blockSwipe}
          style={styles.nameInput}
        />
        <Label>{T.character_create_info}</Label>
      </>
    );
  } else {
    const part = tab;
    const key = PART_KEYS[part];
    content = (
      <>
        {part === 1 &&
          chooser('髪型', HAIR, c.hairStyle, (d) => update({ hairStyle: (c.hairStyle + d + HAIR.length) % HAIR.length }), (i) =>
            update({ hairStyle: i }),
          )}
        {part === 4 &&
          chooser('上着', SHIRT, c.shirtStyle, (d) => update({ shirtStyle: (c.shirtStyle + d + SHIRT.length) % SHIRT.length }), (i) =>
            update({ shirtStyle: i }),
          )}
        {part === 5 &&
          chooser('ボトムス', PANTS, c.pantsStyle, (d) => update({ pantsStyle: (c.pantsStyle + d + PANTS.length) % PANTS.length }), (i) =>
            update({ pantsStyle: i }),
          )}
        {colorPicker(c[key], (col) => update({ [key]: col }), -1, -part)}
      </>
    );
  }

  return (
    <SafeArea style={styles.root}>
      {/* タイトル */}
      <View style={styles.titleBar}>
        <Txt style={styles.titleText}>{T.character}</Txt>
      </View>

      {/* タブ */}
      <View style={styles.tabBar}>
        {TABS.map((name, i) => (
          <Btn
            key={name}
            label={name}
            border={i === tab && !accessoryPage ? 6 : 2}
            style={styles.tab}
            textStyle={styles.tabText}
            onPress={() => showTab(i)}
          />
        ))}
      </View>

      <View style={styles.middle}>
        {/* 左：キャラクター */}
        <View style={styles.left}>
          <View
            style={styles.previewArea}
            onLayout={(e: LayoutChangeEvent) =>
              setPreview({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
            }>
            {preview.w > 0 && <HeroView look={c} width={preview.w} height={preview.h} direction={direction} />}
          </View>
          <View style={styles.dirRow}>
            <Btn label={T.leftLabel} style={styles.dirButton} onPress={() => setDirection((direction + 3) % 4)} />
            <Txt style={styles.dirText}>{DIRECTIONS[direction]}</Txt>
            <Btn label={T.rightLabel} style={styles.dirButton} onPress={() => setDirection((direction + 1) % 4)} />
          </View>
        </View>

        {/* 右：選択中の設定だけ表示 */}
        <View style={styles.right} onTouchStart={onPanelTouchStart} onTouchEnd={onPanelTouchEnd}>
          <Txt style={styles.panelTitle}>{panelTitle}</Txt>
          <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        </View>
      </View>

      {/* 下：共通操作 */}
      <View style={styles.bottom}>
        <Btn label={T.backTotitle} style={styles.bottomButton} onPress={goBack} />
        <Btn label={T.random} style={styles.bottomButton} onPress={randomize} />
        <Btn label={T.decition} style={styles.bottomButton} onPress={confirm} />
      </View>

      <GameDialog
        visible={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        items={dialog?.items}
        selected={dialog?.selected}
        buttons={
          dialog?.input
            ? [
                { label: 'キャンセル', onPress: () => setDialog(null) },
                { label: '反映', onPress: applyHex },
              ]
            : dialog?.buttons
        }
        onCancel={() => setDialog(null)}>
        {dialog?.input ? (
          <TextInput
            value={hexText}
            onChangeText={setHexText}
            autoFocus
            autoCapitalize="characters"
            maxLength={7}
            style={styles.hexInput}
          />
        ) : null}
      </GameDialog>
    </SafeArea>
  );
}

// ===================== 部品 =====================

/** 黒背景・白枠・白文字のボタン */
function Btn({
  label,
  onPress,
  style,
  textStyle,
  border = 4,
}: {
  label: string;
  onPress: () => void;
  style?: object;
  textStyle?: object;
  border?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { borderWidth: border }, pressed && styles.btnPressed, style]}>
      <Txt style={[styles.btnText, textStyle]}>{label}</Txt>
    </Pressable>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <Txt style={[styles.label, styles.labelPad]}>{children}</Txt>;
}

/** HSVのスライダー・HEX・プリセットの色 */
function ColorPicker({
  color,
  set,
  presets,
  onBlock,
  onRelease,
  onPreset,
  onHex,
}: {
  color: string;
  set: (c: string) => void;
  presets: string[] | null;
  onBlock: () => void;
  onRelease: (before: string, after: string) => void;
  onPreset: (c: string) => void;
  onHex: () => void;
}) {
  const [hsv, setHsv] = useState(() => {
    const [h, s, v] = hexToHsv(color);
    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
  });
  // 外から色が変わったとき（ランダム・プリセット・HEX）は、スライダーも合わせる
  const [last, setLast] = useState(color);
  if (last !== color) {
    setLast(color);
    const [h, s, v] = hexToHsv(color);
    const n = { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
    if (hsvToHex(n.h, n.s / 100, n.v / 100) !== hsvToHex(hsv.h, hsv.s / 100, hsv.v / 100)) setHsv(n);
  }
  const before = useRef(color);

  const change = (p: Partial<typeof hsv>) => {
    const n = { ...hsv, ...p };
    setHsv(n);
    const col = hsvToHex(n.h, n.s / 100, n.v / 100);
    setLast(col);
    set(col);
  };
  const shown = hsvToHex(hsv.h, hsv.s / 100, hsv.v / 100);

  const hueColors = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];
  return (
    <View>
      <View style={styles.sampleRow}>
        <View style={[styles.sample, { backgroundColor: color }]} />
        <Pressable onPress={onHex}>
          <Txt style={[styles.label, styles.labelPad]}>{`${color.toUpperCase()}  ✎`}</Txt>
        </Pressable>
      </View>
      <Slider
        name="色相"
        max={360}
        value={hsv.h}
        gradient={hueColors}
        onStart={() => {
          onBlock();
          before.current = shown;
        }}
        onChange={(h) => change({ h })}
        onEnd={() => onRelease(before.current, hsvToHex(hsv.h, hsv.s / 100, hsv.v / 100))}
      />
      <Slider
        name="彩度"
        max={100}
        value={hsv.s}
        gradient={[hsvToHex(hsv.h, 0, hsv.v / 100), hsvToHex(hsv.h, 1, hsv.v / 100)]}
        onStart={() => {
          onBlock();
          before.current = shown;
        }}
        onChange={(s) => change({ s })}
        onEnd={() => onRelease(before.current, hsvToHex(hsv.h, hsv.s / 100, hsv.v / 100))}
      />
      <Slider
        name="明るさ"
        max={100}
        value={hsv.v}
        gradient={['#000000', hsvToHex(hsv.h, hsv.s / 100, 1)]}
        onStart={() => {
          onBlock();
          before.current = shown;
        }}
        onChange={(v) => change({ v })}
        onEnd={() => onRelease(before.current, hsvToHex(hsv.h, hsv.s / 100, hsv.v / 100))}
      />
      {presets ? (
        <>
          <Txt style={[styles.label, styles.labelPad]}>このアクセサリーに合う色</Txt>
          <View style={styles.palette}>
            {presets.map((p) => (
              <Pressable key={p} style={[styles.chip, { backgroundColor: p }]} onPress={() => onPreset(p)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** つまみを左右に動かす部品（SeekBar のかわり） */
function Slider({
  name,
  max,
  value,
  gradient,
  onStart,
  onChange,
  onEnd,
}: {
  name: string;
  max: number;
  value: number;
  gradient: string[];
  onStart: () => void;
  onChange: (v: number) => void;
  onEnd: () => void;
}) {
  const { scale } = useStage();
  const track = useRef<ComponentRef<typeof View>>(null);
  const box = useRef({ left: 0, width: 1 });
  const [width, setWidth] = useState(1);

  const valueAt = (e: GestureResponderEvent) => {
    const x = stagePoint(e, scale).x - box.current.left;
    return Math.round(Math.max(0, Math.min(1, x / box.current.width)) * max);
  };

  return (
    <View style={styles.sliderRow}>
      <Txt style={[styles.label, styles.sliderName]}>{name}</Txt>
      <View
        ref={track}
        style={styles.sliderArea}
        onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width - 64))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onStart();
          const pageX = e.nativeEvent.pageX;
          // つまみが動く範囲（左右 32 ずつあける）の左はしを、舞台の座標で調べる
          track.current?.measureInWindow((x: number, _y: number, w: number) => {
            box.current = { left: x / scale + 32, width: Math.max(1, w / scale - 64) };
            const v = Math.round(Math.max(0, Math.min(1, (pageX / scale - box.current.left) / box.current.width)) * max);
            onChange(v);
          });
        }}
        onResponderMove={(e) => onChange(valueAt(e))}
        onResponderRelease={onEnd}
        onResponderTerminate={onEnd}>
        <Gradient colors={gradient} style={styles.sliderBar} radius={10} />
        <View style={[styles.thumb, { left: 32 + (value / max) * width - 16 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 12,
  },
  titleBar: {
    height: 64,
    backgroundColor: '#465E9A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  tabBar: {
    height: 88,
    flexDirection: 'row',
    backgroundColor: '#273A61',
  },
  tab: {
    flex: 1,
    margin: 2,
  },
  tabText: {
    fontSize: 30,
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 12,
  },
  left: {
    flex: 4,
    padding: 12,
    backgroundColor: '#304363',
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#91ADB1',
  },
  dirRow: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dirButton: {
    width: 100,
    height: 80,
  },
  dirText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 28,
  },
  right: {
    flex: 6,
    marginLeft: 12,
    padding: 16,
    backgroundColor: '#304363',
  },
  panelTitle: {
    height: 56,
    fontSize: 34,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  bottom: {
    height: 96,
    marginTop: 12,
    flexDirection: 'row',
  },
  bottomButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  btn: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  btnPressed: {
    backgroundColor: '#252525',
  },
  btnText: {
    fontSize: 28,
  },
  wide: {
    height: 84,
  },
  accRow: {
    flexDirection: 'row',
  },
  accButton: {
    flex: 1,
    height: 80,
    margin: 4,
  },
  accText: {
    fontSize: 26,
  },
  label: {
    fontSize: 30,
  },
  labelPad: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  chooser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chooserButton: {
    width: 88,
    height: 80,
  },
  chooserMiddle: {
    flex: 1,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    height: 108,
    fontSize: 40,
    color: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#4AA8ED',
    paddingHorizontal: 8,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sample: {
    width: 80,
    height: 48,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 84,
  },
  sliderName: {
    width: 116,
    paddingHorizontal: 8,
  },
  sliderArea: {
    flex: 1,
    height: 84,
    justifyContent: 'center',
  },
  sliderBar: {
    marginHorizontal: 32,
    height: 20,
    borderRadius: 10,
  },
  thumb: {
    position: 'absolute',
    top: 26,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  palette: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    height: 64,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  hexInput: {
    marginTop: 16,
    fontSize: 36,
    color: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#4AA8ED',
    minWidth: 400,
    paddingVertical: 8,
  },
});
