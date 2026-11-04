import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { FLOORS, LOST_ITEMS, BOSS_FLOOR } from '@/data/map';
import { ITEMS, WEAPONS } from '@/data/shop';

import { clamp, fit, storage } from './storage';

/**
 * 画面が変わっても残しておきたいゲームの状態（Java版の GameState）。
 * 変わるたびに自動で保存され、アプリを開き直すと自動で読みこまれる（オートセーブ）
 *
 * 使い方：
 *   画面の中で読む  const money = useGame((s) => s.money);
 *   書きかえる      useGame.setState({ money: 100 });
 *   画面の外で読む  useGame.getState().money
 */

// ---- はじめの値 ----
const START_MONEY = 500;
const START_HP = 50;
const BASE_ATTACK = 5; // 武器なし（素手）の攻撃力

// ---- デバッグ ----
// true の間は、タイトルに「デバッグ：階をえらんで始める」が出る。完成したら false にする
export const DEBUG = true;
const DEBUG_MONEY = 9999; // デバッグで始めたときの所持金

// 攻撃のたびに、ダメージを少しばらつかせる（0.2 なら攻撃力の ±20%）
const ATTACK_SPREAD = 0.2;

/** 主人公の向き */
export const DIR = { FRONT: 0, RIGHT: 1, BACK: 2, LEFT: 3 } as const;
export type Dir = (typeof DIR)[keyof typeof DIR];

/** 保存するデータ */
export type GameData = {
  // ---- マップ ----
  floor: number; // 今いる階（0＝1F）
  px: number; // 主人公の位置（横）。-1は「まだ決まっていない」
  py: number; // 主人公の位置（縦）
  defeated: boolean[]; // 階ごとに、先生に勝ったか
  visited: boolean[]; // 行ったことのある階（階段で選べる階）
  tutorialDone: boolean; // はじめの説明を見たか
  bossKey: boolean; // 理事長室の鍵を持っているか（校長に勝って、エンドロールのあとにもらう）
  doorUnlocked: boolean; // 理事長室の扉を、鍵で開けたか（開けるときに演出を出す）
  bossHp: number; // 理事長戦の、今の理事長のHP（ミニゲームが変わっても引きつぐ）
  keyNotice: boolean; // タイトルで「理事長室の鍵を手に入れた」を出すか（エンドロールのあと1回だけ）
  playing: boolean; // 遊んでいる途中か（タイトルの「つづきから」を出すか）
  dir: Dir; // 主人公の向き
  step: number; // 歩きのコマ（0〜3）

  // ---- 主人公 ----
  money: number;
  hp: number;
  maxHp: number;
  weapon: number; // 装備している武器（WEAPONS の番号）。-1は素手
  ownedWeapons: boolean[]; // 買った武器
  itemCounts: number[]; // 道具の数

  // ---- 実績のための記録（「はじめる／はじめから」でリセット） ----
  usedItem: boolean; // 道具を使ったか
  usedWeapon: boolean; // 備品（武器）で攻撃したか
  tookDamage: boolean; // ダメージを受けたか
  moneySpent: number; // 使ったお金の合計
  clerkTalks: number; // 事務員さんの話を聞いた回数
  boughtItems: boolean[]; // 自販機で買ったことがある商品
  foundLost: boolean[]; // 拾った落とし物
};

type GameActions = {
  /** 最初からやり直すとき（タイトルの「はじめる」）に呼ぶ */
  reset: () => void;
  /** デバッグ用：好きな階から始める（f は 0＝1F 〜 4＝5F） */
  debugStart: (f: number) => void;
  /** デバッグ用：理事長室の中から始める（全部の先生に勝って、鍵を持っている状態） */
  debugStartBoss: () => void;
  /** 今の攻撃力（素手の攻撃力＋武器のぶん） */
  attack: () => number;
  /** 戦闘で使う攻撃力：今の攻撃力を、ランダムに少し上下させる（最低1） */
  rollAttack: () => number;
  /** 装備している武器の名前（素手なら null） */
  weaponName: () => string | null;
  /** 拾った落とし物の数 */
  foundCount: () => number;
};

export type GameStore = GameData & GameActions;

const falses = (n: number) => Array<boolean>(n).fill(false);
const firstVisited = () => FLOORS.map((_, i) => i === 0);

/** はじめの状態 */
function initialData(): GameData {
  return {
    floor: 0,
    px: -1,
    py: -1,
    defeated: falses(FLOORS.length),
    visited: firstVisited(),
    tutorialDone: false,
    bossKey: false,
    doorUnlocked: false,
    bossHp: 0,
    keyNotice: false,
    playing: false,
    dir: DIR.FRONT,
    step: 0,
    money: START_MONEY,
    hp: START_HP,
    maxHp: START_HP,
    weapon: -1,
    ownedWeapons: falses(WEAPONS.length),
    itemCounts: Array<number>(ITEMS.length).fill(0),
    usedItem: false,
    usedWeapon: false,
    tookDamage: false,
    moneySpent: 0,
    clerkTalks: 0,
    boughtItems: falses(ITEMS.length),
    foundLost: falses(LOST_ITEMS.length),
  };
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialData(),

      reset: () => set(initialData()),

      debugStart: (f) => {
        const d = initialData();
        set({
          ...d,
          playing: true,
          tutorialDone: true, // はじめの説明はとばす
          money: DEBUG_MONEY, // 備品や道具をすぐ試せるように
          floor: f,
          visited: d.visited.map((_, i) => i <= f),
          defeated: d.defeated.map((_, i) => i >= 1 && i < f),
          // 位置は -1 のまま（マップの画面で階段のとなりに決める）
        });
      },

      debugStartBoss: () => {
        get().debugStart(BOSS_FLOOR);
        set({
          visited: FLOORS.map(() => true),
          defeated: FLOORS.map((_, i) => i >= 1),
          bossKey: true,
          doorUnlocked: true,
          px: 8, // 理事長室の扉の、内がわ
          py: 7,
        });
      },

      attack: () => {
        const w = get().weapon;
        return BASE_ATTACK + (w >= 0 ? WEAPONS[w].power : 0);
      },

      rollAttack: () => {
        if (get().weapon >= 0) set({ usedWeapon: true }); // 備品で攻撃した（実績のため）
        const rate = 1 + (Math.random() * 2 - 1) * ATTACK_SPREAD; // 0.8〜1.2倍
        return Math.max(1, Math.round(get().attack() * rate));
      },

      weaponName: () => {
        const w = get().weapon;
        return w >= 0 ? WEAPONS[w].name : null;
      },

      foundCount: () => get().foundLost.filter(Boolean).length,
    }),
    {
      name: 'save',
      storage,
      version: 1,
      // 保存するのはデータだけ（関数は保存しない）
      partialize: (s): GameData => {
        const data = initialData();
        for (const k of Object.keys(data) as (keyof GameData)[]) (data as Record<string, unknown>)[k] = s[k];
        return data;
      },
      // 読みこむとき：おかしな値や、長さのちがう配列を直す
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameData>;
        if (!p.playing) return current; // 遊んでいる途中のデータがない
        const d = initialData();
        const maxHp = clamp(p.maxHp, 1, 9999, START_HP);
        const weapon = clamp(p.weapon, -1, WEAPONS.length - 1, -1);
        const visited = fit(p.visited, d.visited);
        visited[0] = true;
        return {
          ...current,
          ...d,
          playing: true,
          bossKey: p.bossKey === true,
          doorUnlocked: p.doorUnlocked === true,
          bossHp: clamp(p.bossHp, 0, 9999, 0),
          keyNotice: p.keyNotice === true,
          floor: clamp(p.floor, 0, FLOORS.length - 1, 0),
          px: clamp(p.px, -1, 999, -1),
          py: clamp(p.py, -1, 999, -1),
          dir: clamp(p.dir, 0, 3, DIR.FRONT) as Dir,
          defeated: fit(p.defeated, d.defeated),
          visited,
          tutorialDone: p.tutorialDone !== false,
          money: clamp(p.money, 0, 999999, START_MONEY),
          maxHp,
          hp: clamp(p.hp, 1, maxHp, maxHp),
          weapon,
          ownedWeapons: fit(p.ownedWeapons, d.ownedWeapons),
          itemCounts: fit(p.itemCounts, d.itemCounts),
          usedItem: p.usedItem === true,
          usedWeapon: p.usedWeapon === true,
          tookDamage: p.tookDamage === true,
          moneySpent: clamp(p.moneySpent, 0, 9999999, 0),
          clerkTalks: clamp(p.clerkTalks, 0, 99999, 0),
          boughtItems: fit(p.boughtItems, d.boughtItems),
          foundLost: fit(p.foundLost, d.foundLost),
        };
      },
    },
  ),
);
