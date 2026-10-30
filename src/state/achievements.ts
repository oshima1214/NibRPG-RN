import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { LOST_ITEMS } from '@/data/map';
import { TA } from '@/data/texts';

import { useGame } from './game';
import { fit, storage } from './storage';

/**
 * 実績（トロフィー）の係（Java版の Achievements）。
 *   ・解除した実績は保存する（アプリを閉じても残る）
 *   ・タイトルの「はじめる／はじめから」で全部リセット
 *   ・解除したら、画面の右上にポップアップを出す（popups に名前がたまる。出す係はあとで作る）
 * 実績の名前と条件の文は texts.ts の ach_titles / ach_descs（この番号の順）
 */

// 実績の番号（ach_titles・ach_descs と同じ順番）
export const ACH = {
  CLEAR_BARE: 0, // アイテム・装備不使用、ノーダメージでクリア
  NO_ITEM: 1, // アイテム不使用でクリア
  NO_WEAPON: 2, // 装備不使用でクリア
  BIG_SPENDER: 3, // お金をたくさん使ってクリア
  SAVER: 4, // お金を節約してクリア
  COLLECTOR: 5, // 落とし物を全部集めてクリア
  CLERK_REGULAR: 6, // 事務員さんの話を10回聞く
  LOW_HP_WIN: 7, // HPが残り1桁で先生に勝つ
  VENDING_ALL: 8, // 自販機の商品を全種類買う
  BOSS_CLEAR: 9, // 理事長に勝つ
} as const;
export const ACH_COUNT = 10;

// 条件の数字
export const BIG_SPENDER_MONEY = 2000; // これ以上使ってクリア
export const SAVER_MONEY = 500; // これ以下しか使わずにクリア
export const CLERK_TALK_COUNT = 10; // 事務員さんの話を聞く回数
export const LOW_HP = 9; // このHP以下で勝つ

type AchStore = {
  unlocked: boolean[]; // 番号ごとに、解除したか
  popups: string[]; // これから出すポップアップ（実績の名前）。保存しない
  /** 実績を解除する。はじめて解除したときだけ、ポップアップを出す */
  unlock: (id: number) => void;
  /** 出しおわったポップアップを消す */
  popDone: () => void;
  /** 解除した数 */
  unlockedCount: () => number;
  /** 全部リセット（タイトルの「はじめる／はじめから」で呼ぶ） */
  resetAll: () => void;
};

const none = () => Array<boolean>(ACH_COUNT).fill(false);

export const useAchievements = create<AchStore>()(
  persist(
    (set, get) => ({
      unlocked: none(),
      popups: [],

      unlock: (id) => {
        if (get().unlocked[id]) return;
        const unlocked = [...get().unlocked];
        unlocked[id] = true;
        set({ unlocked, popups: [...get().popups, TA.ach_titles[id]] });
        // TODO: 音の係を作ったら se_achievement を鳴らす
      },

      popDone: () => set({ popups: get().popups.slice(1) }),

      unlockedCount: () => get().unlocked.filter(Boolean).length,

      resetAll: () => set({ unlocked: none() }),
    }),
    {
      name: 'achievements',
      storage,
      version: 1,
      partialize: (s) => ({ unlocked: s.unlocked }),
      merge: (persisted, current) => ({
        ...current,
        unlocked: fit((persisted as { unlocked?: unknown } | undefined)?.unlocked, none()),
      }),
    },
  ),
);

/** ゲームクリアしたときに呼ぶ：クリアが条件の実績をまとめて調べる */
export function checkClear() {
  const g = useGame.getState();
  const { unlock } = useAchievements.getState();
  if (!g.usedItem && !g.usedWeapon && !g.tookDamage) unlock(ACH.CLEAR_BARE);
  if (!g.usedItem) unlock(ACH.NO_ITEM);
  if (!g.usedWeapon) unlock(ACH.NO_WEAPON);
  if (g.moneySpent >= BIG_SPENDER_MONEY) unlock(ACH.BIG_SPENDER);
  if (g.moneySpent <= SAVER_MONEY) unlock(ACH.SAVER);
  if (g.foundCount() === LOST_ITEMS.length) unlock(ACH.COLLECTOR);
}

/** 先生に勝ったときに呼ぶ：HPが残り1桁なら解除 */
export function checkWin() {
  const hp = useGame.getState().hp;
  if (hp > 0 && hp <= LOW_HP) useAchievements.getState().unlock(ACH.LOW_HP_WIN);
}
