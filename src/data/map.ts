import type { ImageName } from './images';
import { T, TA } from './texts';

/**
 * 各階のマップ。1文字＝1マス。Java版の MapData と同じ。
 *   (空白) = 何もない場所（建物の外）。通れない
 *   # = 壁            . = 床
 *   ! = 扉。扉のかたまり2つが、たがいにつながっている
 *       （上から数えて1つ目と2つ目、3つ目と4つ目…がペア）
 *   / = 階段。上り・下りを選べる（1Fは上りだけ、5Fは下りだけ）。
 *       上りは、その階の先生に勝つまで使えない
 *   % = 武器屋        $ = 道具屋
 *   K = 置き物（通れない。見た目は下の OBJECTS の絵）
 *   T = その階の先生
 *   R = 理事長（かくしボス。2Fの理事長室）
 *   L = 鍵のかかった扉（理事長室）。理事長室の鍵があれば、! と同じように通れる
 *   P = ゲーム開始時の主人公の位置
 * 形を変えたいときは、ここの文字を書きかえるだけでOK（1つの階の中では、1行を全部同じ長さにすること）
 */
export const FLOORS: readonly (readonly string[])[] = [
  [ // 1F：受付（上の壁）の真ん中が武器屋（%）、自販機が道具屋（$）。敵はいない。下のへこみは玄関
    " #              # ",
    " #              # ",
    " #              # ",
    " #              # ",
    " #              # ",
    " #              # ",
    " #              # ",
    " #######%%####### ",
    " #K............K# ",
    " #..............# ",
    " #..............# ",
    " #..............# ",
    " /..........KKK.# ",
    " /..........KKK.# ",
    " #..............# ",
    " #......P.......# ",
    " #.....####.....# ",
    " #.....#  #...$$# ",
    " #.KKKK#  #...$$# ",
    "  #####    #####  ",
    "                  ",
  ],
  [ // 2F：S先生（ショートヘア）。教室はデスクトップPCの机。左の奥は理事長室（L＝鍵のかかった扉）
    "                                    ",
    "                             ####   ",
    "                            #...#   ",
    "  #######                   #K../#  ",
    " #KK..KK#                   #..##   ",
    " #......#                   #..#    ",
    " #.......L                  L..#    ",
    " #.R.....L                  L..#    ",
    " #.KKK...L                  L..#    ",
    " #......#                   #K.#    ",
    " #K....K#                   #..#    ",
    "  #######                   #..#    ",
    "                            #..#    ",
    "                            #..#    ",
    "                            #.K#    ",
    "                            #..#    ",
    "                            #..#    ",
    "                           #...#    ",
    "                          #K...#    ",
    "                          #....#    ",
    "                           #!!!#    ",
    "                                    ",
    "                                    ",
    "                           #!!!#    ",
    "                          #.....#   ",
    "                         #.......#  ",
    "                        #....T....# ",
    "                        #.........# ",
    "                        #.KK...KK.# ",
    "                        #.........# ",
    "                        #.KK...KK.# ",
    "                        #K.......K# ",
    "                         #.......#  ",
    "                          #######   ",
    "                                    ",
  ],
  [ // 3F：E先生。教室はノートパソコンの机
    "             ",
    "      ####   ",
    "     #...#   ",
    "     #K../#  ",
    "     #..##   ",
    "     #..#    ",
    "     #..#    ",
    "     #..#    ",
    "     #..#    ",
    "     #K.#    ",
    "     #..#    ",
    "     #..#    ",
    "     #..#    ",
    "     #..#    ",
    "     #.K#    ",
    "     #..#    ",
    "  !!!#..#    ",
    " #......#    ",
    " #......#    ",
    " #.KKK.K#    ",
    "  #######    ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "    #####    ",
    "   #.....#   ",
    "  #.......#  ",
    " #....T....# ",
    " #.........# ",
    " #.KK...KK.# ",
    " #.........# ",
    " #.KK...KK.# ",
    " #K.......K# ",
    "  #.......#  ",
    "   ##!!!##   ",
    "             ",
  ],
  [ // 4F：S先生（大きめ・短髪）。教室はノートパソコンの机
    "             ",
    "       ####  ",
    "      #...#  ",
    "      #K../# ",
    "      #..##  ",
    "      #..#   ",
    "      !..#   ",
    "      !..#   ",
    "      !..#   ",
    "      #..#   ",
    "      #..#   ",
    "      #.K#   ",
    "      #..#   ",
    "      #K.#   ",
    "      #..#   ",
    "      ####   ",
    "             ",
    "             ",
    "             ",
    "  #######    ",
    " #.......!   ",
    " #.......!   ",
    " #...T...!   ",
    " #.......#   ",
    " #.......#   ",
    " #.KK.KK.#   ",
    " #.......#   ",
    " #.KK.KK.#   ",
    " #.......#   ",
    " #.KK.KK.#   ",
    " #.......#   ",
    " #.KK.KK.#   ",
    " #.......#   ",
    " #K.....K#   ",
    "  #######    ",
    "             ",
  ],
  [ // 5F：校長室（今は4Fと同じ形）
    "             ",
    "       ####  ",
    "      #...#  ",
    "      #K../# ",
    "      #..##  ",
    "      #..#   ",
    "      !..#   ",
    "      !..#   ",
    "      !..#   ",
    "      #..#   ",
    "      #..#   ",
    "      #.K#   ",
    "      #..#   ",
    "      #K.#   ",
    "      #..#   ",
    "      ####   ",
    "             ",
    "             ",
    "             ",
    "  #######    ",
    " #KK..KK.!   ",
    " #.......!   ",
    " #...T...!   ",
    " #..KKK..#   ",
    " #.......#   ",
    " #.......#   ",
    " #.......#   ",
    " #.KKK...#   ",
    " #.......#   ",
    " #.KKK...#   ",
    " #.......#   ",
    " #.......#   ",
    " #.......#   ",
    " #K.....K#   ",
    "  #######    ",
    "             ",
  ],
];

/**
 * マップの上に置く絵（受付・自販機・机など）。
 *   left   = 絵の左はしが何マス目か（0.5 のように半分も使える）
 *   bottom = 絵の下はしをそろえる行（この行のマスの下はしに、絵の足もとを合わせる）
 *   width  = 絵の横はばが何マス分か（高さは絵の形に合わせて自動で決まる）
 *   lift   = （省略できる）下はしを何マス持ち上げるか。掲示板やホワイトボードを壁にかけるときに使う
 * 通れるかどうかは、マップの文字（K・%・$・/ など）で決まる。絵は見た目だけ
 */
export type Obj = { image: ImageName; left: number; bottom: number; width: number; lift?: number };

export const OBJECTS: readonly (readonly Obj[])[] = [
  [ // 1F
    { image: 'obj_info_counter', left: 2, bottom: 7, width: 14 }, // 受付
    { image: 'obj_clerk', left: 8.33, bottom: 7, width: 1.35, lift: 1.38 }, // 事務員さん（受付の真ん中の窓口）
    { image: 'obj_info_counter_front', left: 2, bottom: 7, width: 14 }, // 受付のカウンターの台（事務員さんの手前に重ねて、下半身をかくす）
    { image: 'obj_plant_table', left: 1.9, bottom: 8, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 14.9, bottom: 8, width: 1.2 }, // 観葉植物
    { image: 'obj_stairs_door', left: 0.65, bottom: 13, width: 1.7 }, // 階段の扉
    { image: 'obj_vending_blue_sideways', left: 14.12, bottom: 18, width: 1.98 }, // 自販機（青・横向き）
    { image: 'obj_desk_oc', left: 12, bottom: 13, width: 3 }, // オープンキャンパスの机
    { image: 'obj_bench', left: 3, bottom: 18, width: 3 }, // ベンチ
    { image: 'obj_trash', left: 6.1, bottom: 18, width: 0.8 }, // ゴミ箱
  ],
  [ // 2F
    { image: 'obj_stairs_door', left: 31.65, bottom: 3, width: 1.7 }, // 階段の扉
    { image: 'obj_notice_board', left: 29.2, bottom: 1, width: 1.6, lift: 0.3 }, // 掲示板（壁）
    { image: 'obj_plant_table', left: 28.9, bottom: 3, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 29, bottom: 9, width: 1.2 }, // 観葉植物（理事長室の扉にかからないように、少し右）
    { image: 'obj_trash', left: 30.1, bottom: 14, width: 0.8 }, // ゴミ箱
    { image: 'obj_desk_pc', left: 25.95, bottom: 28, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 26.95, bottom: 28, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 30.95, bottom: 28, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 31.95, bottom: 28, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 25.95, bottom: 30, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 26.95, bottom: 30, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 30.95, bottom: 30, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_desk_pc', left: 31.95, bottom: 30, width: 1.1 }, // 学生の机（PC）
    { image: 'obj_plant_table', left: 26.9, bottom: 18, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 24.9, bottom: 31, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 32.9, bottom: 31, width: 1.2 }, // 観葉植物
    // ---- 理事長室 ----
    { image: 'obj_bookshelf', left: 2, bottom: 4, width: 2 }, // 本棚
    { image: 'obj_bookshelf', left: 6, bottom: 4, width: 2 }, // 本棚
    { image: 'obj_principal_desk', left: 2.8, bottom: 8, width: 3.4 }, // 理事長の机（理事長の手前）
    { image: 'obj_plant_table', left: 1.9, bottom: 10, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 6.9, bottom: 10, width: 1.2 }, // 観葉植物
  ],
  [ // 3F
    { image: 'obj_stairs_door', left: 8.65, bottom: 3, width: 1.7 }, // 階段の扉
    { image: 'obj_notice_board', left: 6.2, bottom: 1, width: 1.6, lift: 0.3 }, // 掲示板（壁）
    { image: 'obj_plant_table', left: 5.9, bottom: 3, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 5.9, bottom: 9, width: 1.2 }, // 観葉植物
    { image: 'obj_trash', left: 7.1, bottom: 14, width: 0.8 }, // ゴミ箱
    { image: 'obj_whiteboard', left: 5.8, bottom: 29, width: 3.2, lift: 0.25 }, // ホワイトボード（壁）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 34, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 34, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 7.95, bottom: 34, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 8.95, bottom: 34, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 36, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 36, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 7.95, bottom: 36, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 8.95, bottom: 36, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_bench', left: 3, bottom: 19, width: 3 }, // ベンチ
    { image: 'obj_plant_table', left: 6.9, bottom: 19, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 1.9, bottom: 37, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 9.9, bottom: 37, width: 1.2 }, // 観葉植物
  ],
  [ // 4F
    { image: 'obj_stairs_door', left: 9.65, bottom: 3, width: 1.7 }, // 階段の扉
    { image: 'obj_notice_board', left: 7.2, bottom: 1, width: 1.6, lift: 0.3 }, // 掲示板（壁）
    { image: 'obj_plant_table', left: 6.9, bottom: 3, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 7.9, bottom: 11, width: 1.2 }, // 観葉植物
    { image: 'obj_trash', left: 7.1, bottom: 13, width: 0.8 }, // ゴミ箱
    { image: 'obj_plant_table', left: 1.9, bottom: 33, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 7.9, bottom: 33, width: 1.2 }, // 観葉植物
    { image: 'obj_whiteboard', left: 3.4, bottom: 19, width: 3.2, lift: 0.25 }, // ホワイトボード（壁）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 25, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 25, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 5.95, bottom: 25, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 6.95, bottom: 25, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 27, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 27, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 5.95, bottom: 27, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 6.95, bottom: 27, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 29, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 29, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 5.95, bottom: 29, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 6.95, bottom: 29, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 2.95, bottom: 31, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 3.95, bottom: 31, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 5.95, bottom: 31, width: 1.1 }, // 学生の机（ノートPC）
    { image: 'obj_desk_laptop', left: 6.95, bottom: 31, width: 1.1 }, // 学生の机（ノートPC）
  ],
  [ // 5F
    { image: 'obj_stairs_door', left: 9.65, bottom: 3, width: 1.7 }, // 階段の扉
    { image: 'obj_notice_board', left: 7.2, bottom: 1, width: 1.6, lift: 0.3 }, // 掲示板（壁）
    { image: 'obj_plant_table', left: 6.9, bottom: 3, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 7.9, bottom: 11, width: 1.2 }, // 観葉植物
    { image: 'obj_trash', left: 7.1, bottom: 13, width: 0.8 }, // ゴミ箱
    { image: 'obj_plant_table', left: 1.9, bottom: 33, width: 1.2 }, // 観葉植物
    { image: 'obj_plant_table', left: 7.9, bottom: 33, width: 1.2 }, // 観葉植物
    { image: 'obj_bookshelf', left: 2, bottom: 20, width: 2 }, // 本棚
    { image: 'obj_bookshelf', left: 6, bottom: 20, width: 2 }, // 本棚
    { image: 'obj_principal_desk', left: 3.8, bottom: 23, width: 3.4 }, // 校長の机
    { image: 'obj_sofa', left: 2.9, bottom: 27, width: 3.2 }, // ソファ
    { image: 'obj_low_table', left: 3, bottom: 29, width: 3 }, // ローテーブル
  ],
];

/** 落とし物1つ：何階の、どのマスに、何が落ちているか */
export type Lost = { floor: number; x: number; y: number; name: string; image: ImageName };

// 落とし物（各階に1つ。全部拾ってクリアすると実績「拾いもの名人」）
export const LOST_ITEMS: readonly Lost[] = [
  { floor: 0, x: 2, y: 18, name: T.lost_card, image: 'lost_card' }, // 1F：ベンチの左のすみ
  { floor: 1, x: 26, y: 32, name: T.lost_eraser, image: 'lost_eraser' }, // 2F：教室のうしろのすみ
  { floor: 2, x: 2, y: 19, name: T.lost_usb, image: 'lost_usb' }, // 3F：かくし部屋（教室の下の扉から）
  { floor: 3, x: 8, y: 14, name: T.lost_pencil, image: 'lost_pencil' }, // 4F：階段の下の行き止まり
  { floor: 4, x: 2, y: 28, name: T.lost_badge, image: 'lost_badge' }, // 5F：ソファとテーブルの間
];

// かくしボス（理事長）がいる階（1＝2F）
export const BOSS_FLOOR = 1;
// 理事長室は、BOSS_FLOOR のこの列より左。部屋の外にいるときは描かない（中にいるときは、部屋だけ描く）
export const BOSS_ROOM_RIGHT = 10;
export const BOSS_ROOM_FLOOR_COLOR = '#3A2632'; // 理事長室の床：暗いワインレッドのじゅうたん

// 階の名前
export const NAMES: readonly string[] = [T.floor1, T.floor2, T.floor3, T.floor4, T.floor5];

// 階ごとの床の色
export const FLOOR_COLORS: readonly string[] = [
  '#E8D9B5', // 1F：ベージュ
  '#CDE8C6', // 2F：うすい緑
  '#C6DCEB', // 3F：うすい青
  '#DCCBE8', // 4F：うすい紫
  '#B23A3A', // 5F：赤いじゅうたん
];
// 階ごとの床の画像（32×32の正方形。null のときは FLOOR_COLORS の色でぬる）
export const FLOOR_IMAGES: readonly (ImageName | null)[] = ['floor_blue', null, null, null, null];
// 階ごとの壁の面の色（奥の壁の、正面に見える部分）
export const WALL_COLORS: readonly string[] = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
// 奥の壁の高さ（マス）。1Fは受付の後ろの壁を、マップの一番上まで高くしている
export const WALL_HEIGHT = [8, 2, 2, 2, 2] as const;
// 壁の上面の色（上から見た壁のてっぺん）
export const WALL_TOP_COLOR = '#3A4150';

// 階ごとの先生の絵と名前（1Fはいないので null）
export const TEACHER_IMAGES: readonly (ImageName | null)[] = [null, 's_m_sensei', 'e_sensei', 's_s_sensei', 'koutyou_sensei'];
// 倒したあとに話しかけたときのセリフ
export const AFTER_TALKS: readonly (readonly string[])[] = [[], TA.after_2f, TA.after_3f, TA.after_4f, TA.after_5f];
export const TEACHER_NAMES: readonly string[] = ['', T.teacher1, T.teacher2, T.teacher3, T.teacher4];

// 先生に勝ったときにもらえるお金（1Fと最上階は使わない）
export const REWARDS = [0, 300, 500, 800, 0] as const;

// 最上階（ここの先生に勝ったらクリア）
export const LAST = FLOORS.length - 1;
