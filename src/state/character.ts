import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clamp, storage } from './storage';

/**
 * 主人公の見た目（Java版の CharacterSprite の保存部分）。
 * キャラクリ画面で決めて、タイトルの「はじめる」をしても変わらない。
 * 色は '#RRGGBB'。絵をかく係（CharacterSprite）は、マップを作るときに移す
 */
export type Look = {
  name: string;
  hair: string;
  eyes: string;
  skin: string;
  shirt: string;
  pants: string;
  shoes: string;

  hairStyle: number; // 髪型：0 ショート、1 ボブ、2 ロング、3 センター分け、4 ポニーテール
  shirtStyle: number; // 上着：0 Tシャツ、1 パーカー、2 ジャケット
  pantsStyle: number; // ボトムス：0 ズボン、1 スカート

  // アクセサリー：0は装着なし
  glassesStyle: number; // 眼鏡：1=眼鏡、2=サングラス
  earringsStyle: number; // ピアス：1=スタッド、2=リング
  ribbonStyle: number; // リボン：1=左、2=右、3=中央
  capStyle: number; // キャップ：1=前向き、2=後ろ向き
  necklaceStyle: number; // ネックレス：1=ペンダント、2=チェーン

  // アクセサリーの色
  glassesColor: string;
  earringsColor: string;
  ribbonColor: string;
  capColor: string;
  necklaceColor: string;
};

export const DEFAULT_LOOK: Look = {
  name: 'プレイヤー',
  hair: '#462C23',
  eyes: '#305070',
  skin: '#EDBF91',
  shirt: '#3270B9',
  pants: '#313E54',
  shoes: '#2A2B33',
  hairStyle: 0,
  shirtStyle: 0,
  pantsStyle: 0,
  glassesStyle: 0,
  earringsStyle: 0,
  ribbonStyle: 0,
  capStyle: 0,
  necklaceStyle: 0,
  glassesColor: '#31343C',
  earringsColor: '#E4C36A',
  ribbonColor: '#E26786',
  capColor: '#557BA8',
  necklaceColor: '#E4C36A',
};

// 種類の数（いちばん大きい番号）
const STYLE_MAX: Partial<Record<keyof Look, number>> = {
  hairStyle: 4,
  shirtStyle: 2,
  pantsStyle: 1,
  glassesStyle: 2,
  earringsStyle: 2,
  ribbonStyle: 3,
  capStyle: 2,
  necklaceStyle: 2,
};

const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

/**
 * 使い方：
 *   const look = useLook();                       見た目を全部読む
 *   useLook.setState({ hairStyle: 2 });           書きかえる
 */
export const useLook = create<Look>()(
  persist(() => ({ ...DEFAULT_LOOK }), {
    name: 'character',
    storage,
    version: 1,
    // 読みこむとき：おかしな値は、はじめの値にもどす
    merge: (persisted, current) => {
      const p = (persisted ?? {}) as Partial<Record<keyof Look, unknown>>;
      const out: Look = { ...current };
      for (const k of Object.keys(DEFAULT_LOOK) as (keyof Look)[]) {
        const v = p[k];
        const max = STYLE_MAX[k];
        if (max !== undefined) (out as Record<string, unknown>)[k] = clamp(v, 0, max, 0);
        else if (k === 'name') out.name = typeof v === 'string' && v ? v : DEFAULT_LOOK.name;
        else if (isColor(v)) (out as Record<string, unknown>)[k] = v;
      }
      return out;
    },
  }),
);
