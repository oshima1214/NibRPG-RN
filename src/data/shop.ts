import type { ImageName } from './images';

/**
 * 受付（備品＝武器）と自販機（道具）で売っている品物。
 * 品物を増やす・変えるときは、ここに1行足す（書きかえる）だけでOK
 */

/** 品物1つぶんのデータ */
export type Goods = {
  name: string; // 名前
  price: number; // ねだん（円）
  power: number; // 武器：攻撃力が上がる量／道具：HPが回復する量
  desc: string; // 説明
};

// 受付の備品（武器）：買うとすぐ装備する。一度買った武器は、あとで付けかえられる
export const WEAPONS: readonly Goods[] = [
  { name: 'えんぴつ', price: 50, power: 2, desc: '攻撃力 +2。とがらせておいた' },
  { name: '30cm定規', price: 150, power: 4, desc: '攻撃力 +4。リーチが長い' },
  { name: 'Javaの参考書', price: 400, power: 8, desc: '攻撃力 +8。オブジェクト指向の重み' },
  { name: 'ノートパソコン', price: 900, power: 16, desc: '攻撃力 +16。パソコンの角はよく効く' },
];

// 自販機の道具：HPを回復する。1種類につき MAX_ITEMS 個まで持てる
export const ITEMS: readonly Goods[] = [
  { name: '栄養バー', price: 30, power: 8, desc: 'HPを8回復' },
  { name: '菓子パン', price: 60, power: 16, desc: 'HPを16回復' },
  { name: 'コーヒー', price: 100, power: 32, desc: 'HPを32回復。目がさえる' },
  { name: 'エナジードリンク', price: 150, power: 999, desc: 'HPを全部回復' },
];

// 道具の絵（ITEMS と同じ順番にすること）
export const ITEM_IMAGES: readonly ImageName[] = ['item_bar', 'item_bread', 'item_coffee', 'item_energy'];

export const MAX_ITEMS = 9;
