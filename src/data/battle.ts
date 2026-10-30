import { TA } from './texts';

/**
 * 戦闘のデータ（階ごとにちがうミニゲーム）。Java版の BattleData と同じ数字。
 *   2F：ことば並べ（words）
 *   3F：穴うめ（fill）
 *   4F：板書うつし（memory）
 *   5F：よけゲーム（dodge）
 * 単語・先生の強さ・ひとことを変えるときは、ここと texts.ts を書きかえるだけでOK
 */

/** 問題1つぶん：答え（ひらがな）とヒント */
export type Word = { answer: string; hint: string };

/** ミニゲームの種類 */
export type BattleKind = 'words' | 'fill' | 'memory' | 'dodge';

// ===================== 共通 =====================

// 階ごとのミニゲーム（0番目は1F＝先生なし）
export const FLOOR_BATTLE: readonly (BattleKind | null)[] = [null, 'words', 'fill', 'memory', 'dodge'];

// 戦闘中のBGM（階ごと。名前は音の係で使う）
export const FLOOR_BGM: readonly (string | null)[] = [null, 'bgm_floor2', 'bgm_floor3', 'bgm_floor4', 'bgm_principal'];

// 階ごとの先生の強さ（0番目は1F＝先生なし）
export const TEACHER_HP = [0, 30, 40, 50, 75] as const;
export const TEACHER_ATTACK = [0, 12, 15, 14, 22] as const; // 失敗したときの精神的ダメージ

// 正解したときのダメージ ＝ 攻撃力（残り時間が半分以上なら1.5倍。4Fは覚えた数で変わる）

// 失敗したときの先生のひとこと
export const TAUNTS: readonly (readonly string[])[] = [[], TA.taunts_2f, TA.taunts_3f, TA.taunts_4f, TA.taunts_5f];

// ===================== 2F：ことば並べ =====================

// 出す単語（ランダムな順番で出る。全部出たら、また最初から）
export const WORDS: readonly Word[] = [
  { answer: 'がっこう', hint: '毎日かよう場所' },
  { answer: 'せんせい', hint: '教室の前に立つ人' },
  { answer: 'こくばん', hint: 'チョークで書く' },
  { answer: 'けしごむ', hint: 'まちがいを消す' },
  { answer: 'えんぴつ', hint: '書くための道具' },
  { answer: 'しゅくだい', hint: '家でやる勉強' },
  { answer: 'ほうかご', hint: '授業が終わったあと' },
  { answer: 'じかんわり', hint: '1週間の授業の予定' },
  { answer: 'そつぎょう', hint: '学校を出ていく日' },
  { answer: 'しけん', hint: '実力をためされる' },
  { answer: 'ともだち', hint: 'いっしょに笑う仲間' },
  { answer: 'としょしつ', hint: '本がたくさんある部屋' },
  { answer: 'たいいく', hint: '体を動かす授業' },
  { answer: 'ちこく', hint: '始まりに間に合わない' },
  { answer: 'ぶかつ', hint: '放課後の活動' },
  { answer: 'ろうか', hint: '走ってはいけない' },
  { answer: 'きゅうしょく', hint: 'みんなで食べるお昼ごはん' },
  { answer: 'ぱそこん', hint: '情報の授業で使う' },
];

// ハズレの札に使う文字（ここからランダムに選ぶ）
export const DUMMY_LETTERS =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん';
export const DUMMY_COUNT = 2; // ハズレの札の数

// 制限時間：BASE_TIME_MS ＋ 1文字ごとに PER_LETTER_MS
export const BASE_TIME_MS = 4000;
export const PER_LETTER_MS = 1500;

// ===================== 3F：穴うめ =====================

// 出す単語（2Fより長め）。□になった所に入る文字を、下の札から選ぶ
export const FILL_WORDS: readonly Word[] = [
  { answer: 'ほけんしつ', hint: '具合が悪いときに行く部屋' },
  { answer: 'しょくいんしつ', hint: '先生たちがいる部屋' },
  { answer: 'うんどうかい', hint: 'つなひきやリレーをする日' },
  { answer: 'ぶんかさい', hint: 'クラスで出し物をする' },
  { answer: 'きょうかしょ', hint: '授業で使う本' },
  { answer: 'にゅうがくしき', hint: '学校生活のはじまりの式' },
  { answer: 'ちょうれい', hint: '朝のあつまり' },
  { answer: 'せいとかい', hint: '学校をまとめる生徒たち' },
  { answer: 'れんらくちょう', hint: '家と学校をつなぐノート' },
  { answer: 'けいじばん', hint: 'お知らせをはる板' },
  { answer: 'はっぴょう', hint: 'みんなの前で話す' },
  { answer: 'ぷりんと', hint: '先生がくばる紙' },
  { answer: 'しんろそうだん', hint: '将来について話し合う' },
  { answer: 'ばすてい', hint: '通学でバスを待つ場所' },
  { answer: 'じしゅうしつ', hint: 'ひとりで勉強する部屋' },
  { answer: 'ゆうびんきょく', hint: '手紙を出しに行く所' },
];

// 見まちがえやすい文字のなかま。ハズレの札は、ここから選ぶ（だから3Fはむずかしい）
export const LOOK_ALIKES: readonly string[] = [
  'はばぱほ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ',
  'かが', 'きぎさ', 'くぐ', 'けげは', 'こごに', 'さざち', 'しじ', 'すず', 'せぜ', 'そぞ',
  'ただ', 'ちぢさ', 'つづっ', 'てで', 'とど',
  'やゃ', 'ゆゅ', 'よょ', 'あおめ', 'ぬめ', 'ねれわ', 'るろ', 'いり', 'うら', 'まも', 'んそ',
];
export const FILL_CHOICES = 6; // 下に並べる札の数
export const FILL_BASE_TIME_MS = 3500; // 制限時間：FILL_BASE_TIME_MS ＋ □1つごとに FILL_PER_BLANK_MS
export const FILL_PER_BLANK_MS = 2000;

// ===================== 4F：板書うつし =====================

// 黒板に書かれる文字（教科の1文字）。下のボタンもこの順に並ぶ
export const SUBJECTS = ['国', '数', '英', '理', '社', '体', '音', '美'] as const;
export const MEMORY_START = 3; // はじめに覚える数
export const MEMORY_MAX = 5; // 一番多いときの数
export const MEMORY_WRITE_MS = 500; // 1文字書く時間
export const MEMORY_SHOW_MS = 2000; // 書き終わってから消すまでの時間
export const MEMORY_BASE_TIME_MS = 4000; // 答える時間：MEMORY_BASE_TIME_MS ＋ 1文字ごとに MEMORY_PER_LETTER_MS
export const MEMORY_PER_LETTER_MS = 900;

// ===================== 5F：よけゲーム =====================

export const DODGE_WAVE_MS = 8000; // 1回のこうげきの長さ
export const DODGE_WAVE2_MS = 8000; // 第2形態のこうげきの長さ
export const DODGE_SPEED2 = 1.2; // 第2形態の速さ（何倍か）
export const DODGE_DENSITY = 4.0; // 物の多さ（1＝少なめ。大きくするほど、たくさん飛んでくる）
export const DODGE_DENSITY2 = 4.0; // 第2形態の物の多さ（今は第1形態と同じ）
export const DODGE_PC_INTERVAL_MS = 1500; // パソコンが降ってくる間かく（速さ・多さに関係なく、いつもこの間かく）
export const DODGE_HIT_DAMAGE = 8; // 物に当たったときのダメージ
export const DODGE_MAX_ASPECT = 1.6; // いちばんせまくしたときの横幅（高さの何倍か）
export const DODGE_NARROW = 0.5; // どれだけせまくするか（0：画面いっぱい 〜 1：DODGE_MAX_ASPECT まで）
// よけきったときのダメージ ＝ 攻撃力（ノーミスなら1.5倍）

// ===================== かくしボス：理事長（2Fの理事長室） =====================
// 4つのミニゲームが順番に出る「最後の試験」。理事長のHPは、ミニゲームが変わっても引きつぐ。
// 1つのミニゲームで削れるのは HP の4分の1まで。削りきったら次のミニゲームへ

export const BOSS_STAGES: readonly BattleKind[] = ['words', 'fill', 'memory', 'dodge'];
export const BOSS_HP = 200; // 理事長のHP
export const BOSS_ATTACK = 20; // 失敗したときのダメージ（よけゲームは DODGE_HIT_DAMAGE）
export const BOSS_MEMORY_SHOW_MS = 1400; // 理事長戦の、書き終わってから消すまでの時間
export const BOSS_MEMORY_MAX = 5; // 理事長戦の、一番多いときの数（はじめと同じ＝ずっと5文字）
export const BOSS_MEMORY_CLEAR = 4; // 板書うつしは、素手でもこの回数正解すれば次の問題へ
export const BOSS_MEMORY_START = 5; // 板書うつしの、はじめに覚える数
export const BOSS_GAME_OVER = 5; // 攻略失敗画面に渡す番号（理事長）

// ---- 第1問：ことば並べ（理事長戦だけの単語。2Fより長く、ハズレの札は見まちがえやすい文字） ----
export const BOSS_WORDS: readonly Word[] = [
  { answer: 'しゅっせきぼ', hint: '先生が出欠をつける帳面' },
  { answer: 'しんろしどう', hint: '卒業後の道を相談する' },
  { answer: 'ぶんぼうぐ', hint: 'ペンやノートのなかま' },
  { answer: 'だいがくいん', hint: '大学のあと、さらに研究する所' },
  { answer: 'ひっきしけん', hint: '紙に答えを書くテスト' },
  { answer: 'めんせつかん', hint: '面接で質問をする人' },
  { answer: 'しゅうしょく', hint: '会社で働きはじめること' },
  { answer: 'ないていしき', hint: '入社が決まった人が集まる式' },
  { answer: 'ぷろぐらむ', hint: 'コンピュータへの命令書' },
  { answer: 'きーぼーど', hint: '文字を打つ道具' },
  { answer: 'りじちょう', hint: '学校法人のいちばん上の人' },
  { answer: 'しんがっき', hint: '春から始まる、新しい学年' },
  { answer: 'こくごじてん', hint: 'ことばの意味を調べる本' },
  { answer: 'げこうじかん', hint: '学校から帰る時刻' },
];
export const BOSS_DUMMY_COUNT = 3; // ハズレの札の数
export const BOSS_BASE_TIME_MS = 3000; // 制限時間：BOSS_BASE_TIME_MS ＋ 1文字ごとに BOSS_PER_LETTER_MS
export const BOSS_PER_LETTER_MS = 1200;

// ---- 第2問：穴うめ（理事長戦だけの単語。□は3つ、札は7枚） ----
export const BOSS_FILL_WORDS: readonly Word[] = [
  { answer: 'しょうがくきん', hint: '学ぶためのお金の支え' },
  { answer: 'そつぎょうしき', hint: '学校生活のしめくくりの式' },
  { answer: 'ちょうしょく', hint: '朝ごはん' },
  { answer: 'けっせきとどけ', hint: '休むときに出す紙' },
  { answer: 'しょくどう', hint: 'お昼ごはんを食べる所' },
  { answer: 'ぎゃくてん', hint: '負けていたのに勝つこと' },
  { answer: 'ちょきんばこ', hint: '小銭をためる入れ物' },
  { answer: 'ぴっちゃー', hint: '野球で球を投げる人' },
  { answer: 'じょうほうか', hint: 'コンピュータを学ぶ学科' },
  { answer: 'ゆうしょう', hint: '大会で一番になること' },
];
export const BOSS_FILL_BLANKS = 3;
export const BOSS_FILL_CHOICES = 7;
export const BOSS_FILL_BASE_TIME_MS = 3000;
export const BOSS_FILL_PER_BLANK_MS = 1600;

// ---- 最終問題：よけゲーム（決まった攻撃パターンが順番に来る） ----
export const BOSS_DODGE_SPEED = 1.0; // パターンの速さ
export const BOSS_DODGE_SPEED_SHRUNK = 1.25; // わくがせまくなったあとの速さ
export const BOSS_DODGE_WAVE_MS = 8000;
export const BOSS_SHRINK_HP = 25; // 理事長のHPがこれ以下になると、わくがせまくなる
export const BOSS_SHRINK_RATE = 0.7; // せまくしたときの、たて・よこの長さ（0.7倍 → 広さは約半分）
